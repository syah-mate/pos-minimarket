const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const { startNextServer, loadAppEnv } = require("./server");
const printer = require("./printer");

// Kasir offline memakai better-sqlite3 (modul native). Kalau gagal dimuat
// (mis. build lupa di-rebuild untuk Electron), aplikasi online tetap jalan.
let offline = null;
try {
  offline = { ipc: require("./offline/ipc"), sync: require("./offline/sync") };
} catch (e) {
  console.error("[Offline] nonaktif:", e && e.message);
}

const isDev = !app.isPackaged;
const OFFLINE_PAGE = path.join(__dirname, "offline", "kasir.html");

let mainWindow = null;
let stopServer = null;
let appUrl = null;
let offlineStarted = false;

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
  // POS_APP_URL diisi = mode thin client: jendela memuat web server pusat, jadi
  // koneksi MongoDB (dan kredensialnya) hanya ada di server, bukan di tiap PC kasir.
  // Kosong = jalankan Next server lokal seperti sebelumnya.
  const remoteUrl = (process.env.POS_APP_URL || "").trim().replace(/\/+$/, "");
  const PORT = Number(process.env.ELECTRON_APP_PORT || 4072);
  const url = remoteUrl || `http://localhost:${PORT}`;

  if (!isDev && !remoteUrl) {
    stopServer = await startNextServer(PORT);
  }

  // preload membuka akses printer ke halaman, jadi jendela ini hanya boleh
  // berada di origin aplikasi; link lain dibuka di browser biasa.
  const appOrigin = new URL(url).origin;
  const isAppUrl = (target) => {
    try {
      return new URL(target).origin === appOrigin;
    } catch {
      return false;
    }
  };
  mainWindow.webContents.on("will-navigate", (event, target) => {
    if (!isAppUrl(target)) {
      event.preventDefault();
      shell.openExternal(target);
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url: target }) => {
    if (!isAppUrl(target)) shell.openExternal(target);
    return { action: "deny" };
  });

  appUrl = url;

  mainWindow.webContents.on("did-fail-load", (_event, code, desc, failedUrl, isMainFrame) => {
    if (!isMainFrame || code === -3) return; // -3 = ERR_ABORTED (navigasi dibatalkan)
    if (failedUrl.startsWith("file:")) return;
    if (offline) return openOfflineKasir({ force: true });
    const html = `<body style="font-family:sans-serif;padding:40px;text-align:center">
      <h2>Tidak dapat terhubung ke server</h2>
      <p>Periksa koneksi internet, lalu coba lagi.</p>
      <p style="color:#888;font-size:12px">${desc} (${code})</p>
      <button onclick="location.href='${failedUrl}'" style="padding:8px 20px">Coba lagi</button>
    </body>`;
    mainWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  });

  // Server hidup tapi backend-nya tumbang (502/503/504 dari reverse proxy)
  // diperlakukan sama dengan tidak terjangkau.
  mainWindow.webContents.on("did-navigate", (_event, navUrl, httpCode) => {
    if (offline && isAppUrl(navUrl) && httpCode >= 502 && httpCode <= 504) openOfflineKasir();
  });

  // Ctrl+Shift+O: pindah ke kasir offline kapan saja (mis. internet putus di
  // tengah transaksi dan halaman online sudah terbuka).
  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (offline && input.type === "keyDown" && input.control && input.shift && input.key.toLowerCase() === "o") {
      event.preventDefault();
      openOfflineKasir();
    }
  });

  if (offline && !offlineStarted) {
    offlineStarted = true;
    offline.ipc.register({ goOnline: () => mainWindow && mainWindow.loadURL(appUrl).catch(() => {}) });
    let wasOnline = null;
    offline.sync.onStatus((s) => {
      if (!mainWindow) return;
      mainWindow.webContents.send("offline:status", s);
      // Koneksi baru saja putus saat halaman online terbuka → tawarkan pindah.
      if (wasOnline === true && !s.online && isAppUrl(mainWindow.webContents.getURL())) {
        dialog
          .showMessageBox(mainWindow, {
            type: "warning",
            buttons: ["Buka kasir offline", "Tetap di sini"],
            defaultId: 0,
            message: "Koneksi ke server terputus",
            detail: "Transaksi bisa dilanjutkan di kasir offline dan akan disinkronkan otomatis saat internet kembali.",
          })
          .then(({ response }) => response === 0 && openOfflineKasir());
      }
      wasOnline = s.online;
    });
    offline.sync.start(url);
  }

  await mainWindow.loadURL(url).catch(() => {});
  mainWindow.show();

  if (isDev) mainWindow.webContents.openDevTools({ mode: "detach" });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// force: dipakai saat load halaman online gagal — URL jendela saat itu belum
// tentu URL halaman offline, jadi jangan disimpulkan dari getURL().
function openOfflineKasir({ force = false } = {}) {
  if (!mainWindow) return;
  // Sudah di kasir offline: jangan reload, keranjang yang sedang diisi bisa hilang.
  if (!force && mainWindow.webContents.getURL().startsWith("file:")) return;
  mainWindow.loadFile(OFFLINE_PAGE).catch(() => {});
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
  if (offline) offline.sync.stop();
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
