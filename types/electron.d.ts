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
  total?: number;
  paid?: number;
  change?: number;
  footer?: string;
  openDrawer?: boolean;
}

export interface ElectronAPI {
  isElectron: true;
  printReceipt: (data: ReceiptData) => Promise<{ ok: true } | { error: string }>;
  listPrinters: () => Promise<Array<{ vendorId: number; productId: number }> | { error: string }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
