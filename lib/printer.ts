import type { PrinterErrorCode, ReceiptData } from "@/types/electron";

export function isElectron(): boolean {
  return typeof window !== "undefined" && !!window.electronAPI?.isElectron;
}

// User-facing Indonesian messages. Raw technical detail stays in main-process
// logs; users never see "Error invoking remote method ...".
const MESSAGES: Record<PrinterErrorCode, string> = {
  RPP02N_NOT_FOUND:
    "Printer RPP02N tidak ditemukan. Pastikan printer menyala dan Bluetooth aktif.",
  BLUETOOTH_OFF: "Bluetooth mati. Aktifkan Bluetooth lalu coba lagi.",
  BLUETOOTH_UNSUPPORTED: "Perangkat ini tidak mendukung Bluetooth BLE.",
  BLUETOOTH_PERMISSION_DENIED:
    "Izin Bluetooth belum diberikan untuk aplikasi.",
  CONNECTION_FAILED: "Gagal terhubung ke printer RPP02N.",
  CHARACTERISTIC_NOT_FOUND:
    "Printer terhubung, tetapi jalur cetak tidak ditemukan.",
  WRITE_FAILED: "Terhubung ke printer, tetapi pengiriman struk gagal.",
  USB_NOT_FOUND:
    "Printer USB tidak ditemukan. Pastikan printer terhubung dan menyala.",
  USB_OPEN_FAILED: "Gagal membuka printer USB.",
  PRINT_FAILED: "Gagal mencetak struk.",
};

export class PrintFailedError extends Error {
  code?: PrinterErrorCode;
  detail?: string;
  constructor(code: PrinterErrorCode | undefined, detail?: string) {
    super((code && MESSAGES[code]) || detail || "Gagal mencetak struk.");
    this.name = "PrintFailedError";
    this.code = code;
    this.detail = detail;
  }
}

function assertOk(res: unknown): void {
  if (res && typeof res === "object" && "error" in res) {
    const { code, error } = res as { code?: PrinterErrorCode; error: string };
    throw new PrintFailedError(code, error);
  }
}

export async function printReceipt(data: ReceiptData) {
  if (!isElectron()) {
    throw new Error("Cetak struk hanya tersedia di aplikasi desktop (Electron).");
  }
  const res = await window.electronAPI!.printReceipt(data);
  assertOk(res);
  return res;
}

export async function testBluetoothPrint() {
  if (!isElectron()) {
    throw new Error("Fitur ini hanya tersedia di aplikasi desktop (Electron).");
  }
  const res = await window.electronAPI!.testBluetooth();
  assertOk(res);
  return res;
}
