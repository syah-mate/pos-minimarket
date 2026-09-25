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
  // Dipanggil halaman login online setelah login sukses, supaya user yang sama
  // bisa login di kasir offline saat server tidak terjangkau.
  cacheLogin: (data) => ipcRenderer.invoke("offline:cache-login", data),
});

// Kasir offline (electron/offline/kasir.html). Semua data lewat SQLite di main
// process — halaman ini tidak pernah memegang akses database langsung.
contextBridge.exposeInMainWorld("offlineAPI", {
  login: (username, password) => ipcRenderer.invoke("offline:login", { username, password }),
  logout: () => ipcRenderer.invoke("offline:logout"),
  session: () => ipcRenderer.invoke("offline:session"),
  find: (code) => ipcRenderer.invoke("offline:find", code),
  search: (q) => ipcRenderer.invoke("offline:search", q),
  saveSale: (input) => ipcRenderer.invoke("offline:save-sale", input),
  print: (receipt) => ipcRenderer.invoke("offline:print", receipt),
  recent: () => ipcRenderer.invoke("offline:recent"),
  status: () => ipcRenderer.invoke("offline:status"),
  syncNow: () => ipcRenderer.invoke("offline:sync-now"),
  goOnline: () => ipcRenderer.invoke("offline:go-online"),
  onStatus: (fn) => {
    const listener = (_e, s) => fn(s);
    ipcRenderer.on("offline:status", listener);
    return () => ipcRenderer.removeListener("offline:status", listener);
  },
});
