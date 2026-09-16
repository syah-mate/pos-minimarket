// PrinterService — routes a receipt to the configured transport.
//
//   PrinterService
//      ├── SystemPrinterTransport  (USB / OS printer, @node-escpos)
//      └── BLEPrinterTransport     (RPP02N / EP58 PLUS, @stoprocent/noble)
//
// Layout is built ONCE (shared ops), then rendered by the chosen transport.
const { buildReceiptOps, buildTestOps } = require("./layout");
const { opsToBytes } = require("./escpos");
const system = require("./system");
const ble = require("./ble");

// Built-in profile for the tested RPP02N / EPPOS EP58 PLUS. The end user never
// types the UUID; env vars only override for advanced/debug use.
const RPP02N_PROFILE = {
  name: "RPP02N",
  protocol: "escpos",
  writeCharacteristic: "49535343-aca3-481c-91ec-d85e28a60318",
  writeWithResponse: true,
  chunkSize: 20,
  chunkDelayMs: 50,
  scanTimeoutMs: 12000,
};

function num(v, d) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

// Resolve printer configuration from env (per-installation, no rebuild).
function getConfig() {
  const printerType = (process.env.PRINTER_TYPE || "system").toLowerCase() === "bluetooth"
    ? "bluetooth"
    : "system";
  const ble = {
    ...RPP02N_PROFILE,
    name: process.env.PRINTER_BT_NAME || RPP02N_PROFILE.name,
    writeCharacteristic: process.env.PRINTER_BT_CHAR || RPP02N_PROFILE.writeCharacteristic,
    chunkSize: num(process.env.PRINTER_BT_CHUNK_SIZE, RPP02N_PROFILE.chunkSize),
    chunkDelayMs: num(process.env.PRINTER_BT_CHUNK_DELAY_MS, RPP02N_PROFILE.chunkDelayMs),
    scanTimeoutMs: num(process.env.PRINTER_BT_SCAN_TIMEOUT_MS, RPP02N_PROFILE.scanTimeoutMs),
  };
  return { printerType, ble };
}

async function printOps(ops) {
  const cfg = getConfig();
  if (cfg.printerType === "bluetooth") {
    const bytes = opsToBytes(ops);
    return ble.printBytes(bytes, cfg.ble);
  }
  return system.printOps(ops);
}

async function printReceipt(data = {}) {
  return printOps(buildReceiptOps(data));
}

async function testPrint() {
  return printOps(buildTestOps());
}

// Force a BLE test regardless of configured transport (diagnostics/Task 17).
async function testBluetooth() {
  const cfg = getConfig();
  const bytes = opsToBytes(buildTestOps());
  return ble.printBytes(bytes, cfg.ble);
}

async function scanBluetooth() {
  const cfg = getConfig();
  return ble.scanOnly(cfg.ble);
}

function listPrinters() {
  return system.listPrinters();
}

module.exports = {
  getConfig,
  printReceipt,
  testPrint,
  testBluetooth,
  scanBluetooth,
  listPrinters,
  RPP02N_PROFILE,
};
