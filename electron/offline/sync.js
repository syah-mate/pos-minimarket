// Sinkronisasi SQLite lokal ↔ server.
//
//   push    — kirim antrean `sales` ke POST /api/transaksi-jual (idempoten lewat
//             clientId, jadi aman diulang kalau respons pertama hilang)
//   catalog — unduh GET /api/offline/catalog, ganti tabel barang lokal
//
// Request memakai session Electron, jadi cookie login (pos_session) dari
// jendela utama ikut terkirim. Kalau cookie kedaluwarsa, sinkron berhenti
// dengan status "needLogin" sampai kasir login online lagi.
const { session } = require("electron");
const db = require("./db");

const PUSH_INTERVAL_MS = 30 * 1000;
const CATALOG_INTERVAL_MS = 10 * 60 * 1000;

let baseUrl = "";
let timer = null;
let inflight = null;
let lastCatalogTry = 0;
const listeners = new Set();

const state = {
  online: false,
  needLogin: false,
  lastSyncAt: null,
  lastError: null,
};

function status() {
  return { ...state, ...db.queueStats(), ...db.catalogInfo(), terminalId: db.terminalId() };
}

function emit() {
  const s = status();
  for (const fn of listeners) {
    try {
      fn(s);
    } catch (_) {}
  }
}

function onStatus(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

class AuthError extends Error {}

// redirect: "manual" — middleware (proxy.ts) membalas request tanpa sesi dengan
// redirect ke /login; kalau diikuti, hasilnya HTML 200 yang terlihat "sukses".
async function request(pathname, init = {}) {
  let res;
  try {
    res = await session.defaultSession.fetch(baseUrl + pathname, {
      ...init,
      redirect: "manual",
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    });
  } catch (e) {
    // Electron tidak mengembalikan respons 3xx untuk redirect "manual" — ia
    // melempar "Redirect was cancelled". Satu-satunya redirect di API ini adalah
    // proxy.ts yang mengirim ke /login, jadi artinya sesi habis.
    if (e && /redirect/i.test(e.message)) throw new AuthError(e.message);
    throw e;
  }
  if (res.status === 401 || res.status === 403 || (res.status >= 300 && res.status < 400)) {
    throw new AuthError(`HTTP ${res.status}`);
  }
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    throw new Error(`Respons server bukan JSON (HTTP ${res.status})`);
  }
  return { status: res.status, data };
}

async function pushQueue() {
  for (const { clientId, payload } of db.pendingSales()) {
    const { status: code, data } = await request("/api/transaksi-jual", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (code === 200 || code === 201) {
      db.markSynced(clientId);
    } else {
      // Ditolak server (mis. barang sudah dihapus) — catat, tetap pending, lanjut
      // ke transaksi berikutnya supaya satu data bermasalah tidak menahan antrean.
      db.markAttempt(clientId, (data && (data.error || data.message)) || `HTTP ${code}`);
    }
  }
}

async function refreshCatalog() {
  lastCatalogTry = Date.now();
  const { status: code, data } = await request("/api/offline/catalog");
  if (code !== 200 || !data || !Array.isArray(data.barang)) {
    throw new Error((data && (data.error || data.message)) || `Gagal unduh katalog (HTTP ${code})`);
  }
  db.replaceCatalog(data.barang, data.kas);
}

// Satu sinkron dalam satu waktu. Pemanggil berikutnya (mis. tombol "Sinkron
// sekarang" saat loop sedang jalan) menunggu yang sedang berjalan, lalu — kalau
// diminta — menjalankan satu putaran lagi supaya hasilnya benar-benar terbaru.
async function runOnce(opts = {}) {
  if (!baseUrl) return status();
  if (inflight) {
    await inflight;
    if (!opts.forceCatalog && !opts.again) return status();
  }
  inflight = doRun(opts).finally(() => {
    inflight = null;
  });
  return inflight;
}

async function doRun({ forceCatalog = false } = {}) {
  try {
    // Push dulu: katalog yang diunduh sesudahnya sudah memuat stok hasil sinkron.
    await pushQueue();
    if (forceCatalog || Date.now() - lastCatalogTry > CATALOG_INTERVAL_MS) {
      await refreshCatalog();
    }
    state.online = true;
    state.needLogin = false;
    state.lastError = null;
    state.lastSyncAt = new Date().toISOString();
  } catch (e) {
    if (e instanceof AuthError) {
      state.online = true;
      state.needLogin = true;
      state.lastError = "Sesi login habis — login online untuk melanjutkan sinkronisasi.";
    } else {
      state.online = false;
      state.lastError = e && e.message ? e.message : String(e);
    }
  }
  emit();
  return status();
}

function start(url) {
  baseUrl = url;
  db.open();
  if (timer) clearInterval(timer);
  timer = setInterval(() => runOnce(), PUSH_INTERVAL_MS);
  runOnce({ forceCatalog: true });
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { start, stop, runOnce, status, onStatus };
