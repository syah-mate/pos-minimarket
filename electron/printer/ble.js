// BLEPrinterTransport — talks directly to the RPP02N / EPPOS EP58 PLUS over
// BLE GATT. No system printer queue, no RFCOMM/SPP, no SDP. Lives entirely in
// the Electron main process (Node), never in the renderer.
//
// Flow: waitPoweredOn -> scan by name -> connect -> discover GATT ->
//       find write characteristic -> write ESC/POS in chunks -> disconnect.
const { CODES, PrinterError, wrap } = require("./errors");

const TAG = "[Printer][BLE]";
const log = (...a) => console.log(TAG, ...a);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const normUuid = (u) => String(u || "").replace(/-/g, "").toLowerCase();

let _noble = null;
function loadNoble() {
  if (_noble) return _noble;
  _noble = require("@stoprocent/noble");
  return _noble;
}

// Ensure the adapter is powered on, mapping adapter state to typed errors.
async function ensurePoweredOn(noble, timeoutMs = 6000) {
  if (noble.state === "poweredOn") return;
  const fail = (state) => {
    if (state === "unauthorized") return new PrinterError(CODES.BLUETOOTH_PERMISSION_DENIED, "Bluetooth unauthorized");
    if (state === "poweredOff") return new PrinterError(CODES.BLUETOOTH_OFF, "Bluetooth is off");
    if (state === "unsupported") return new PrinterError(CODES.BLUETOOTH_UNSUPPORTED, "BLE unsupported on this machine");
    return null;
  };
  const immediate = fail(noble.state);
  if (immediate && noble.state !== "unknown") throw immediate;

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      noble.removeListener("stateChange", onState);
      const e = fail(noble.state);
      reject(e || new PrinterError(CODES.BLUETOOTH_OFF, "Bluetooth not powered on (state=" + noble.state + ")"));
    }, timeoutMs);
    function onState(state) {
      log("adapter state:", state);
      if (state === "poweredOn") {
        clearTimeout(timer);
        noble.removeListener("stateChange", onState);
        resolve();
      } else {
        const e = fail(state);
        if (e) {
          clearTimeout(timer);
          noble.removeListener("stateChange", onState);
          reject(e);
        }
      }
    }
    noble.on("stateChange", onState);
  });
}

function nameMatches(peripheral, target) {
  const adv = (peripheral.advertisement && peripheral.advertisement.localName) || "";
  const a = adv.trim().toLowerCase();
  const t = String(target).trim().toLowerCase();
  return a === t || (a.length > 0 && a.includes(t));
}

// Scan until a peripheral whose advertised name matches `name`, or timeout.
async function scanForDevice(noble, name, timeoutMs) {
  log("scanning for", name, `(timeout ${timeoutMs}ms)`);
  return new Promise((resolve, reject) => {
    let done = false;
    const finish = (fn, arg) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      noble.removeListener("discover", onDiscover);
      noble.stopScanningAsync().catch(() => {});
      fn(arg);
    };
    const timer = setTimeout(
      () => finish(reject, new PrinterError(CODES.RPP02N_NOT_FOUND, `${name} not found within ${timeoutMs}ms`)),
      timeoutMs
    );
    function onDiscover(peripheral) {
      if (nameMatches(peripheral, name)) {
        log("device found:", peripheral.advertisement.localName, peripheral.id);
        finish(resolve, peripheral);
      }
    }
    noble.on("discover", onDiscover);
    noble.startScanningAsync([], false).catch((e) => finish(reject, wrap(CODES.CONNECTION_FAILED, e)));
  });
}

// Serialize all print jobs so BLE chunks from concurrent receipts never
// interleave on the same characteristic (Task 9).
let _queue = Promise.resolve();
function enqueue(job) {
  const run = _queue.then(job, job);
  // keep the chain alive regardless of individual job outcome
  _queue = run.then(() => {}, () => {});
  return run;
}

/**
 * Print raw ESC/POS bytes to a BLE thermal printer.
 * @param {Buffer} bytes
 * @param {object} profile { name, writeCharacteristic, writeWithResponse, chunkSize, chunkDelayMs, scanTimeoutMs }
 */
function printBytes(bytes, profile) {
  return enqueue(() => printBytesInner(bytes, profile));
}

async function printBytesInner(bytes, profile) {
  const noble = loadNoble();
  const name = profile.name || "RPP02N";
  const targetChar = normUuid(profile.writeCharacteristic);
  const chunkSize = profile.chunkSize || 20;
  const chunkDelayMs = profile.chunkDelayMs != null ? profile.chunkDelayMs : 50;
  const withoutResponse = profile.writeWithResponse === false; // default: WITH response
  const scanTimeoutMs = profile.scanTimeoutMs || 12000;

  await ensurePoweredOn(noble);

  const peripheral = await scanForDevice(noble, name, scanTimeoutMs);

  log("connecting");
  try {
    await peripheral.connectAsync();
  } catch (e) {
    throw wrap(CODES.CONNECTION_FAILED, e);
  }
  log("connected");

  try {
    log("discovering services");
    const { characteristics } = await peripheral.discoverAllServicesAndCharacteristicsAsync();
    const characteristic = characteristics.find((c) => normUuid(c.uuid) === targetChar);
    if (!characteristic) {
      throw new PrinterError(CODES.CHARACTERISTIC_NOT_FOUND, `Write characteristic ${profile.writeCharacteristic} not found`);
    }
    const props = characteristic.properties || [];
    if (!props.includes("write") && !props.includes("writeWithoutResponse")) {
      throw new PrinterError(CODES.CHARACTERISTIC_NOT_FOUND, `Characteristic ${profile.writeCharacteristic} is not writable (props: ${props.join(",")})`);
    }
    log("write characteristic found:", characteristic.uuid, `[${props.join(",")}]`);

    const total = Math.ceil(bytes.length / chunkSize);
    log("receipt bytes:", bytes.length, "chunks:", total);
    for (let offset = 0, i = 1; offset < bytes.length; offset += chunkSize, i++) {
      const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
      log(`sending chunk ${i}/${total}`);
      try {
        await characteristic.writeAsync(chunk, withoutResponse);
      } catch (e) {
        throw wrap(CODES.WRITE_FAILED, e);
      }
      if (chunkDelayMs > 0) await sleep(chunkDelayMs);
    }
    log("print completed");
    return { ok: true, transport: "bluetooth" };
  } finally {
    try {
      await peripheral.disconnectAsync();
      log("disconnected");
    } catch (_) {}
  }
}

// Lightweight probe used by diagnostics: is a matching device advertising?
async function scanOnly(profile) {
  const noble = loadNoble();
  await ensurePoweredOn(noble);
  const peripheral = await scanForDevice(noble, profile.name || "RPP02N", profile.scanTimeoutMs || 12000);
  return { id: peripheral.id, name: peripheral.advertisement.localName };
}

module.exports = { printBytes, scanOnly };
