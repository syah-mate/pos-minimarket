const { contextBridge, ipcRenderer } = require("electron");

// Narrow printer surface only. No raw Bluetooth/native APIs are exposed;
// contextIsolation stays on and nodeIntegration off.
contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  printReceipt: (payload) => ipcRenderer.invoke("printer:print-receipt", payload),
  testPrint: () => ipcRenderer.invoke("printer:test"),
  testBluetooth: () => ipcRenderer.invoke("printer:test-bluetooth"),
  scanBluetooth: () => ipcRenderer.invoke("printer:scan-bluetooth"),
  getPrinterConfig: () => ipcRenderer.invoke("printer:get-config"),
  listPrinters: () => ipcRenderer.invoke("printer:list"),
});
