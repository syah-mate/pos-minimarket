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

const rp = (n) => "Rp" + Number(n || 0).toLocaleString("id-ID");

async function printReceipt(data = {}) {
  const { Printer, USB } = await loadEscpos();
  const device = selectedDevice(USB);

  return new Promise((resolve, reject) => {
    device.open(async (err) => {
      if (err) return reject(new Error("Gagal membuka printer USB: " + err.message));
      try {
        const printer = new Printer(device, { encoding: "cp850" });
        const store = data.store || {};
        const line = "-".repeat(32);

        printer.align("ct");
        if (store.name) printer.style("b").size(1, 1).text(store.name).size(0, 0).style("normal");
        if (store.address) printer.text(store.address);
        if (store.phone) printer.text(store.phone);
        printer.text(line).align("lt");

        if (data.invoiceNo) printer.text("No   : " + data.invoiceNo);
        if (data.date) printer.text("Tgl  : " + data.date);
        if (data.cashier) printer.text("Kasir: " + data.cashier);
        printer.text(line);

        for (const it of data.items || []) {
          printer.text(it.name);
          const left = `  ${it.qty} x ${rp(it.price)}`;
          const right = rp(it.total);
          const pad = Math.max(1, 32 - left.length - right.length);
          printer.text(left + " ".repeat(pad) + right);
        }
        printer.text(line);

        const row = (label, val) => {
          const right = rp(val);
          const pad = Math.max(1, 32 - label.length - right.length);
          printer.text(label + " ".repeat(pad) + right);
        };
        if (data.subtotal != null) row("Subtotal", data.subtotal);
        if (data.discount) row("Diskon", -Math.abs(data.discount));
        printer.style("b");
        row("TOTAL", data.total);
        printer.style("normal");
        if (data.paid != null) row("Bayar", data.paid);
        if (data.change != null) row("Kembali", data.change);

        printer.text(line).align("ct");
        printer.text(data.footer || "Terima kasih").text("");

        if (data.openDrawer) printer.cashdraw(2);
        printer.cut();
        await printer.close();
        resolve({ ok: true });
      } catch (e) {
        try { device.close(); } catch (_) {}
        reject(e);
      }
    });
  });
}

async function listPrinters() {
  const { USB } = await loadEscpos();
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

module.exports = { printReceipt, listPrinters };
