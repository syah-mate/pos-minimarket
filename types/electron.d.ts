export interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
  total: number;
}

export interface ReceiptData {
  store?: { name?: string; address?: string; phone?: string };
  invoiceNo?: string;
  cashier?: string;
  date?: string;
  items: ReceiptItem[];
  subtotal?: number;
  discount?: number;
  tax?: number;
  total?: number;
  paid?: number;
  change?: number;
  footer?: string;
  openDrawer?: boolean;
}

export type PrinterErrorCode =
  | "RPP02N_NOT_FOUND"
  | "BLUETOOTH_OFF"
  | "BLUETOOTH_UNSUPPORTED"
  | "BLUETOOTH_PERMISSION_DENIED"
  | "CONNECTION_FAILED"
  | "CHARACTERISTIC_NOT_FOUND"
  | "WRITE_FAILED"
  | "USB_NOT_FOUND"
  | "USB_OPEN_FAILED"
  | "PRINT_FAILED";

export interface PrintOk {
  ok: true;
  transport?: "system" | "bluetooth";
}
export interface PrintError {
  error: string;
  code?: PrinterErrorCode;
}
export type PrintResult = PrintOk | PrintError;

export interface PrinterConfig {
  printerType: "system" | "bluetooth";
  ble: {
    name: string;
    protocol: string;
    writeCharacteristic: string;
    writeWithResponse: boolean;
    chunkSize: number;
    chunkDelayMs: number;
    scanTimeoutMs: number;
  };
}

export interface ElectronAPI {
  isElectron: true;
  printReceipt: (data: ReceiptData) => Promise<PrintResult>;
  testPrint: () => Promise<PrintResult>;
  testBluetooth: () => Promise<PrintResult>;
  scanBluetooth: () => Promise<{ id: string; name: string } | PrintError>;
  getPrinterConfig: () => Promise<PrinterConfig | PrintError>;
  listPrinters: () => Promise<Array<{ vendorId: number; productId: number }> | { error: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
