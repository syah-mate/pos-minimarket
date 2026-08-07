import type { ReceiptData } from "@/types/electron";

export function isElectron(): boolean {
  return typeof window !== "undefined" && !!window.electronAPI?.isElectron;
}

export async function printReceipt(data: ReceiptData) {
  if (!isElectron()) {
    throw new Error("Cetak struk hanya tersedia di aplikasi desktop (Electron).");
  }
  const res = await window.electronAPI!.printReceipt(data);
  if (res && "error" in res) throw new Error(res.error);
  return res;
}
