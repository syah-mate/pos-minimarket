const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  printReceipt: (payload) => ipcRenderer.invoke("printer:print-receipt", payload),
  listPrinters: () => ipcRenderer.invoke("printer:list"),
});
