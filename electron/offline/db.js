// SQLite lokal untuk kasir offline. Satu file di userData, mode WAL supaya
// transaksi yang sudah disimpan tetap aman walau listrik padam tiba-tiba.
//
//   barang   — snapshot katalog dari server (diganti utuh tiap refresh)
//   sales    — antrean transaksi offline; status pending → synced
//   users    — login cache (hash scrypt), untuk login saat server tak terjangkau
//   meta     — key/value: terminalId, kas default, waktu sinkron terakhir
//   counters — nomor urut refNo offline per hari
const path = require("path");
const crypto = require("crypto");
const { app } = require("electron");
const Database = require("better-sqlite3");

let db = null;

function open() {
  if (db) return db;
  db = new Database(path.join(app.getPath("userData"), "offline.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = FULL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS barang (
      id TEXT PRIMARY KEY,
      kode TEXT NOT NULL,
      barcode TEXT NOT NULL DEFAULT '',
      nama TEXT NOT NULL,
      satuan TEXT NOT NULL DEFAULT '',
      stok REAL NOT NULL DEFAULT 0,
      lokasi TEXT NOT NULL DEFAULT '',
      diskon REAL NOT NULL DEFAULT 0,
      harga REAL NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS barang_kode ON barang(kode);
    CREATE INDEX IF NOT EXISTS barang_barcode ON barang(barcode);

    CREATE TABLE IF NOT EXISTS sales (
      client_id TEXT PRIMARY KEY,
      ref_no TEXT NOT NULL UNIQUE,
      payload TEXT NOT NULL,
      grand_total REAL NOT NULL,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      synced_at TEXT
    );
    CREATE INDEX IF NOT EXISTS sales_status ON sales(status, created_at);

    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      salt TEXT NOT NULL,
      hash TEXT NOT NULL,
      cached_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS counters (day TEXT PRIMARY KEY, seq INTEGER NOT NULL);
  `);
  return db;
}

// ── meta ────────────────────────────────────────────────────────────────────

function getMeta(key) {
  const row = open().prepare("SELECT value FROM meta WHERE key = ?").get(key);
  return row ? row.value : null;
}

function setMeta(key, value) {
  open()
    .prepare("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(key, value == null ? null : String(value));
}

// Kode terminal masuk ke refNo offline supaya dua PC kasir tidak pernah
// menghasilkan nomor yang sama. POS_TERMINAL_ID (mis. "K01") menang; kalau
// kosong dibuat acak sekali dan disimpan.
function terminalId() {
  const fromEnv = (process.env.POS_TERMINAL_ID || "").trim().toUpperCase();
  if (fromEnv) return fromEnv;
  let id = getMeta("terminalId");
  if (!id) {
    id = "T" + crypto.randomBytes(2).toString("hex").toUpperCase();
    setMeta("terminalId", id);
  }
  return id;
}

// ── katalog ─────────────────────────────────────────────────────────────────

function replaceCatalog(barang, kas) {
  const d = open();
  const insert = d.prepare(
    "INSERT INTO barang (id, kode, barcode, nama, satuan, stok, lokasi, diskon, harga) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  d.transaction(() => {
    d.prepare("DELETE FROM barang").run();
    for (const b of barang) {
      insert.run(
        String(b._id),
        String(b.kode || ""),
        String(b.barcode || ""),
        String(b.nama || ""),
        String(b.satuanJual || ""),
        Number(b.stok) || 0,
        String(b.lokasi || ""),
        Number(b.diskon) || 0,
        // Sama dengan JualBase jenis "toko": hargaJualToko, fallback hargaJual.
        Number(b.hargaJualToko || b.hargaJual) || 0
      );
    }
    setMeta("kas", kas ? JSON.stringify(kas) : null);
    setMeta("catalogAt", new Date().toISOString());
  })();

  // Stok dari server belum memuat transaksi offline yang masih antre; kurangi
  // lagi supaya angka di layar kasir tidak "kembali naik" setelah refresh.
  const pending = d.prepare("SELECT payload FROM sales WHERE status = 'pending'").all();
  const dec = d.prepare("UPDATE barang SET stok = stok - ? WHERE id = ?");
  d.transaction(() => {
    for (const row of pending) {
      for (const it of JSON.parse(row.payload).items || []) dec.run(it.qty, it.barangId);
    }
  })();
}

function catalogInfo() {
  const d = open();
  return {
    count: d.prepare("SELECT COUNT(*) AS n FROM barang").get().n,
    catalogAt: getMeta("catalogAt"),
  };
}

function findBarangExact(code) {
  const c = String(code || "").trim();
  if (!c) return null;
  return (
    open().prepare("SELECT * FROM barang WHERE barcode = ? AND barcode <> '' LIMIT 1").get(c) ||
    open().prepare("SELECT * FROM barang WHERE kode = ? COLLATE NOCASE LIMIT 1").get(c) ||
    null
  );
}

function searchBarang(q, limit = 30) {
  const terms = String(q || "").trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  const where = terms.map(() => "(nama LIKE ? OR kode LIKE ? OR barcode LIKE ?)").join(" AND ");
  const args = terms.flatMap((t) => {
    const like = "%" + t.replace(/[%_]/g, "") + "%";
    return [like, like, like];
  });
  return open()
    .prepare(`SELECT * FROM barang WHERE ${where} ORDER BY nama LIMIT ?`)
    .all(...args, limit);
}

// ── antrean transaksi ───────────────────────────────────────────────────────

function nextRefNo(date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  const day = `${dd}${mm}${yy}`;
  const d = open();
  d.prepare("INSERT INTO counters (day, seq) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET seq = seq + 1").run(day);
  const { seq } = d.prepare("SELECT seq FROM counters WHERE day = ?").get(day);
  // Awalan "OF-" tidak pernah bentrok dengan "JL-" milik generator server.
  return `OF-${terminalId()}-${day}${String(seq).padStart(3, "0")}`;
}

// Menyimpan transaksi + mengurangi stok lokal dalam satu transaksi SQLite.
function insertSale(build) {
  const d = open();
  return d.transaction(() => {
    const clientId = crypto.randomUUID();
    const now = new Date();
    const payload = build({ clientId, refNo: nextRefNo(now), now });
    d.prepare(
      "INSERT INTO sales (client_id, ref_no, payload, grand_total, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(clientId, payload.refNo, JSON.stringify(payload), payload.grandTotal, now.toISOString());
    const dec = d.prepare("UPDATE barang SET stok = stok - ? WHERE id = ?");
    for (const it of payload.items) dec.run(it.qty, it.barangId);
    return payload;
  })();
}

function pendingSales(limit = 20) {
  return open()
    .prepare("SELECT client_id, payload FROM sales WHERE status = 'pending' ORDER BY created_at LIMIT ?")
    .all(limit)
    .map((r) => ({ clientId: r.client_id, payload: JSON.parse(r.payload) }));
}

function markSynced(clientId) {
  open()
    .prepare("UPDATE sales SET status = 'synced', synced_at = ?, last_error = NULL WHERE client_id = ?")
    .run(new Date().toISOString(), clientId);
}

function markAttempt(clientId, error) {
  open()
    .prepare("UPDATE sales SET attempts = attempts + 1, last_error = ? WHERE client_id = ?")
    .run(String(error).slice(0, 500), clientId);
}

function queueStats() {
  const d = open();
  const pending = d.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(grand_total), 0) AS total FROM sales WHERE status = 'pending'").get();
  const lastError = d
    .prepare("SELECT last_error FROM sales WHERE status = 'pending' AND last_error IS NOT NULL ORDER BY created_at LIMIT 1")
    .get();
  return { pending: pending.n, pendingTotal: pending.total, lastError: lastError ? lastError.last_error : null };
}

function recentSales(limit = 20) {
  return open()
    .prepare("SELECT ref_no, grand_total, created_at, status, last_error FROM sales ORDER BY created_at DESC LIMIT ?")
    .all(limit);
}

// ── login cache ─────────────────────────────────────────────────────────────

const SCRYPT_LEN = 64;

function cacheUser({ username, password, name, role }) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, SCRYPT_LEN).toString("hex");
  open()
    .prepare(
      `INSERT INTO users (username, name, role, salt, hash, cached_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(username) DO UPDATE SET name = excluded.name, role = excluded.role,
         salt = excluded.salt, hash = excluded.hash, cached_at = excluded.cached_at`
    )
    .run(String(username).toLowerCase().trim(), String(name || username), String(role), salt, hash, new Date().toISOString());
}

// Login offline berlaku maksimal sekian hari sejak login online terakhir,
// supaya user yang sudah dinonaktifkan di server tidak bisa dipakai selamanya.
const CACHE_MAX_DAYS = 30;

function verifyUser(username, password) {
  const row = open()
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(String(username || "").toLowerCase().trim());
  if (!row) return null;
  if (Date.now() - new Date(row.cached_at).getTime() > CACHE_MAX_DAYS * 864e5) return null;
  const hash = crypto.scryptSync(String(password || ""), row.salt, SCRYPT_LEN);
  if (!crypto.timingSafeEqual(hash, Buffer.from(row.hash, "hex"))) return null;
  return { username: row.username, name: row.name, role: row.role };
}

module.exports = {
  open,
  getMeta,
  setMeta,
  terminalId,
  replaceCatalog,
  catalogInfo,
  findBarangExact,
  searchBarang,
  insertSale,
  pendingSales,
  markSynced,
  markAttempt,
  queueStats,
  recentSales,
  cacheUser,
  verifyUser,
};
