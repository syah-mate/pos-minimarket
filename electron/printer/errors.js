// Typed printer errors. Codes are stable identifiers the renderer maps to
// human-readable Indonesian messages; `message` stays technical for logs.
const CODES = {
  RPP02N_NOT_FOUND: "RPP02N_NOT_FOUND",
  BLUETOOTH_OFF: "BLUETOOTH_OFF",
  BLUETOOTH_UNSUPPORTED: "BLUETOOTH_UNSUPPORTED",
  BLUETOOTH_PERMISSION_DENIED: "BLUETOOTH_PERMISSION_DENIED",
  CONNECTION_FAILED: "CONNECTION_FAILED",
  CHARACTERISTIC_NOT_FOUND: "CHARACTERISTIC_NOT_FOUND",
  WRITE_FAILED: "WRITE_FAILED",
  USB_NOT_FOUND: "USB_NOT_FOUND",
  USB_OPEN_FAILED: "USB_OPEN_FAILED",
  PRINT_FAILED: "PRINT_FAILED",
};

class PrinterError extends Error {
  constructor(code, message, cause) {
    super(message || code);
    this.name = "PrinterError";
    this.code = code;
    if (cause) this.cause = cause;
  }
}

function wrap(code, err) {
  if (err instanceof PrinterError) return err;
  const msg = err && err.message ? err.message : String(err || code);
  return new PrinterError(code, msg, err);
}

module.exports = { CODES, PrinterError, wrap };
