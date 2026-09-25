// IPC kasir offline. Dipakai dua pihak:
//   - halaman login online  → offline:cache-login (simpan login untuk dipakai offline)
//   - electron/offline/kasir.html → cari barang, simpan transaksi, status sinkron
const { ipcMain } = require("electron");
const db = require("./db");
const sync = require("./sync");
const printer = require("../printer");

// User yang sedang memakai kasir offline. Diisi oleh login offline, atau oleh
// login online terakhir di sesi aplikasi ini — sehingga kalau internet putus di
// tengah shift, kasir tidak perlu login ulang.
let currentUser = null;

const ALLOWED_ROLES = ["admin", "kasir"];

function computeItem(barang, qty) {
  const harga = barang.harga;
  const discPct = barang.diskon || 0;
  const discRp = Math.round(qty * harga * (discPct / 100));
  return {
    barangId: barang.id,
    namaBarang: barang.nama,
    satuan: barang.satuan,
    stok: barang.stok,
    lokasi: barang.lokasi,
    qty,
    harga,
    discPct,
    discRp,
    // Sama dengan computeSubtotal di JualBase.
    subtotal: Math.max(0, qty * harga - discRp),
  };
}

function localDateStr(d) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function toReceipt(payload, paid) {
  return {
    invoiceNo: payload.refNo,
    date: new Date(payload.createdAtLocal).toLocaleString("id-ID"),
    cashier: payload.operatorName,
    items: payload.items.map((it) => ({ name: it.namaBarang, qty: it.qty, price: it.harga, total: it.subtotal })),
    subtotal: payload.subtotal,
    total: payload.grandTotal,
    paid,
    change: Math.max(0, paid - payload.grandTotal),
  };
}

function saveSale({ items = [], paid = 0, print = true } = {}) {
  if (!currentUser) throw new Error("Silakan login terlebih dahulu.");

  const lines = [];
  for (const it of items) {
    const qty = Number(it.qty);
    if (!it.id || !Number.isFinite(qty) || qty <= 0) continue;
    const barang = db.open().prepare("SELECT * FROM barang WHERE id = ?").get(String(it.id));
    if (!barang) throw new Error("Barang tidak ada di katalog offline.");
    lines.push(computeItem(barang, qty));
  }
  if (lines.length === 0) throw new Error("Minimal 1 item barang harus diisi.");

  const grandTotal = lines.reduce((s, r) => s + r.subtotal, 0);
  const paidNum = Number(paid) || 0;
  if (paidNum < grandTotal) throw new Error("Jumlah bayar kurang dari total.");

  const kas = JSON.parse(db.getMeta("kas") || "null");
  const payload = db.insertSale(({ clientId, refNo, now }) => ({
    // Bentuk body sama dengan JualBase.handleSave, ditambah clientId/offline.
    clientId,
    offline: true,
    terminalId: db.terminalId(),
    refNo,
    // Server menyimpan tanggal transaksi online sebagai tanggal (YYYY-MM-DD),
    // dan laporan memfilter berdasarkan itu — ikuti format yang sama.
    tanggal: localDateStr(now),
    jenis: "toko",
    pelangganId: "",
    pelangganKode: "",
    pelangganNama: "",
    pelangganAlamat: "",
    kasId: kas ? String(kas._id) : "",
    kasKode: kas ? kas.kode : "",
    kasNama: kas ? kas.nama : "",
    spg: "",
    pembayaran: "Cash",
    tempoHari: 0,
    jatuhTempo: null,
    keterangan: `Offline ${db.terminalId()} ${now.toLocaleTimeString("id-ID")}`,
    disc: 0,
    ppn: 0,
    subtotal: grandTotal,
    grandTotal,
    cetakNota: !!print,
    items: lines,
    operator: currentUser.username,
    // Hanya untuk struk; server mengabaikan field yang tidak ada di schema.
    operatorName: currentUser.name,
    createdAtLocal: now.toISOString(),
  }));

  // Coba kirim segera; kalau masih offline, loop sinkron yang mengulang nanti.
  sync.runOnce();
  return { refNo: payload.refNo, grandTotal, change: paidNum - grandTotal, receipt: toReceipt(payload, paidNum) };
}

function register({ goOnline }) {
  ipcMain.handle("offline:cache-login", async (_e, { username, password, user } = {}) => {
    if (!username || !password || !user || !ALLOWED_ROLES.includes(user.role)) return { ok: false };
    db.cacheUser({ username, password, name: user.name, role: user.role });
    currentUser = { username: String(username).toLowerCase().trim(), name: user.name || username, role: user.role };
    // Login online baru = cookie baru → antrean yang tertahan "needLogin" bisa jalan.
    sync.runOnce({ forceCatalog: true });
    return { ok: true };
  });

  ipcMain.handle("offline:login", async (_e, { username, password } = {}) => {
    const user = db.verifyUser(username, password);
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      return { error: "Username/password salah, atau user ini belum pernah login online di PC ini." };
    }
    currentUser = user;
    return { user };
  });

  ipcMain.handle("offline:logout", async () => {
    currentUser = null;
    return { ok: true };
  });

  ipcMain.handle("offline:session", async () => ({ user: currentUser }));

  ipcMain.handle("offline:find", async (_e, code) => db.findBarangExact(code));

  ipcMain.handle("offline:search", async (_e, q) => db.searchBarang(q));

  ipcMain.handle("offline:save-sale", async (_e, input) => {
    try {
      return saveSale(input);
    } catch (e) {
      return { error: e && e.message ? e.message : String(e) };
    }
  });

  ipcMain.handle("offline:print", async (_e, receipt) => {
    try {
      return await printer.printReceipt(receipt);
    } catch (e) {
      return { error: e && e.message ? e.message : String(e), code: e && e.code };
    }
  });

  ipcMain.handle("offline:recent", async () => db.recentSales());

  ipcMain.handle("offline:status", async () => sync.status());

  ipcMain.handle("offline:sync-now", async () => sync.runOnce({ forceCatalog: true }));

  ipcMain.handle("offline:go-online", async () => {
    goOnline();
    return { ok: true };
  });
}

module.exports = { register };
