const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { startNextServer, loadAppEnv } = require("./server");
const printer = require("./printer");

const isDev = !app.isPackaged;

let mainWindow = null;
let stopServer = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    icon: path.join(__dirname, process.platform === "win32" ? "icon.ico" : "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Dibaca di sini, bukan saat module load, karena loadAppEnv() jalan lebih dulu.
  const PORT = Number(process.env.ELECTRON_APP_PORT || 4072);
  const url = `http://localhost:${PORT}`;

  if (!isDev) {
    stopServer = await startNextServer(PORT);
  }

  await mainWindow.loadURL(url);
  mainWindow.show();

  if (isDev) mainWindow.webContents.openDevTools({ mode: "detach" });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  loadAppEnv();
  return createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("before-quit", () => {
  if (stopServer) stopServer();
});

// Normalize any thrown printer error into a structured result the renderer can
// map to a friendly Indonesian message. Never leak a raw IPC "Error invoking
// remote method" string to the UI.
function toErrorResult(e) {
  const code = e && e.code ? e.code : "PRINT_FAILED";
  const message = e && e.message ? e.message : String(e);
  console.error("[Printer] error", code, message);
  return { error: message, code };
}

ipcMain.handle("printer:print-receipt", async (_event, payload) => {
  try {
    return await printer.printReceipt(payload);
  } catch (e) {
    return toErrorResult(e);
  }
});

ipcMain.handle("printer:test", async () => {
  try {
    return await printer.testPrint();
  } catch (e) {
    return toErrorResult(e);
  }
});

ipcMain.handle("printer:test-bluetooth", async () => {
  try {
    return await printer.testBluetooth();
  } catch (e) {
    return toErrorResult(e);
  }
});

ipcMain.handle("printer:scan-bluetooth", async () => {
  try {
    return await printer.scanBluetooth();
  } catch (e) {
    return toErrorResult(e);
  }
});

ipcMain.handle("printer:get-config", async () => {
  try {
    return printer.getConfig();
  } catch (e) {
    return toErrorResult(e);
  }
});

ipcMain.handle("printer:list", async () => {
  return printer.listPrinters();
});
