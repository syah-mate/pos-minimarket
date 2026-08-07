const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { startNextServer } = require("./server");
const { printReceipt, listPrinters } = require("./printer");

const PORT = Number(process.env.ELECTRON_APP_PORT || 4072);
const isDev = !app.isPackaged;

let mainWindow = null;
let stopServer = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    icon: path.join(__dirname, "..", "public", "adaptive-icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

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

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on("before-quit", () => {
  if (stopServer) stopServer();
});

ipcMain.handle("printer:print-receipt", async (_event, payload) => {
  return printReceipt(payload);
});

ipcMain.handle("printer:list", async () => {
  return listPrinters();
});
