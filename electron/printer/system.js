// SystemPrinterTransport — USB / OS-installed thermal printer via @node-escpos.
// Preserves the proven USB write path; only the layout is now shared (renders
// the same ops as the BLE transport). Windows/macOS/Linux USB all covered by
// the usb-adapter as before.
const { CODES, PrinterError, wrap } = require("./errors");

let _escpos = null;
function loadEscpos() {
  if (_escpos) return _escpos;
  const core = require("@node-escpos/core");
  const usb = require("@node-escpos/usb-adapter");
  _escpos = { Printer: core.Printer, USB: usb.default || usb.USB || usb };
  return _escpos;
}

function selectedDevice(USB) {
  const vid = process.env.PRINTER_VID;
  const pid = process.env.PRINTER_PID;
  if (vid && pid) return new USB(Number(vid), Number(pid));
  return new USB();
}

// Apply shared ops to a @node-escpos Printer instance.
function applyOps(printer, ops) {
  for (const o of ops) {
    switch (o.op) {
      case "align": printer.align(o.v); break;
      case "style": printer.style(o.bold ? "b" : "normal"); break;
      case "size": printer.size(o.w ? 1 : 0, o.h ? 1 : 0); break;
      case "text": printer.text(o.s); break;
      case "feed": for (let i = 0; i < Math.max(1, o.n || 1); i++) printer.text(""); break;
      case "cashdraw": printer.cashdraw(o.pin === 5 ? 5 : 2); break;
      case "cut": printer.cut(); break;
      default: break;
    }
  }
}

// Print pre-built ops. Kept callback/Promise shape identical to the original
// implementation so behavior on real USB hardware is unchanged.
async function printOps(ops) {
  const { Printer, USB } = loadEscpos();
  let device;
  try {
    device = selectedDevice(USB);
  } catch (e) {
    // usb-adapter throws "Can not find printer" when no USB printer is present.
    throw new PrinterError(CODES.USB_NOT_FOUND, e.message, e);
  }

  return new Promise((resolve, reject) => {
    device.open(async (err) => {
      if (err) return reject(new PrinterError(CODES.USB_OPEN_FAILED, "Gagal membuka printer USB: " + err.message, err));
      try {
        const printer = new Printer(device, { encoding: "cp850" });
        applyOps(printer, ops);
        await printer.close();
        resolve({ ok: true, transport: "system" });
      } catch (e) {
        try { device.close(); } catch (_) {}
        reject(wrap(CODES.PRINT_FAILED, e));
      }
    });
  });
}

function listPrinters() {
  const { USB } = loadEscpos();
  try {
    const devices = USB.findPrinter ? USB.findPrinter() : [];
    return devices.map((d) => {
      const desc = d.deviceDescriptor || {};
      return { vendorId: desc.idVendor, productId: desc.idProduct };
    });
  } catch (e) {
    return { error: e.message };
  }
}

module.exports = { printOps, listPrinters };
