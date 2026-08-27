/**
 * Migrasi database untuk pencarian barang ber-index.
 *
 * Dua langkah, berurutan:
 *   1. Isi field `searchTokens` untuk seluruh dokumen Barang yang sudah ada.
 *      Field ini baru ditambahkan, jadi dokumen lama belum punya token dan tidak
 *      akan pernah muncul di pencarian picker sampai skrip ini dijalankan.
 *   2. Bangun index yang dideklarasikan di models/Barang.ts.
 *
 * Backfill dulu baru index, supaya index dibangun sekali di atas data final.
 *
 * Memakai `createIndexes()`, BUKAN `syncIndexes()` seperti scripts/ensure-indexes.ts:
 * `createIndexes()` hanya membuat index yang ada di schema dan tidak menghapus apa
 * pun, jadi aman dijalankan di production. `ensure-indexes` menyapu 16 model dan
 * menghapus index yang tidak terdaftar — terlalu luas untuk keperluan ini.
 *
 * Idempotent — aman diulang. Dokumen yang tokennya sudah benar dilewati.
 *
 * ─── Cara menjalankan ──────────────────────────────────────────────────────
 *
 * Database lokal (memakai .env.local):
 *   npm run migrate:search-tokens
 *
 * Database production — dijalankan dari laptop, TIDAK perlu di server aplikasi.
 * Bundle deploy hanya berisi hasil build; yang menentukan adalah database mana
 * yang disentuh, bukan di mana perintahnya dijalankan. Variabel dari shell menang
 * atas isi .env.local, jadi file itu tidak perlu diubah:
 *
 *   $env:MONGODB_URI = "<URI production>"
 *   npm run migrate:search-tokens
 *   Remove-Item Env:\MONGODB_URI
 *
 * ─── URUTAN DEPLOY ─────────────────────────────────────────────────────────
 *
 * Jalankan migrasi ini DULU, baru upload build baru.
 *
 * Kode lama tidak terpengaruh field/index baru (`searchTokens` memakai
 * `select: false`), jadi migrasi duluan aman. Kebalikannya tidak: build baru tanpa
 * migrasi membuat setiap ketikan kasir mencari lewat token (0 hasil, tanpa index)
 * lalu jatuh ke scan regex lama — dua kali kerja, lebih lambat daripada sebelum
 * optimasi.
 *
 * Migrasi ini per database. Ada database baru (staging, instalasi baru)?
 * Jalankan sekali juga di sana.
 */
import mongoose from 'mongoose';
import Barang from '../models/Barang';
import { buildSearchTokens } from '../lib/searchTokens';

const BATCH = 1000;

type Row = {
  _id: mongoose.Types.ObjectId;
  nama?: string;
  kode?: string;
  kategori?: string;
  searchTokens?: string[];
};

function sameTokens(a: string[] = [], b: string[] = []) {
  return a.length === b.length && a.every((t, i) => t === b[i]);
}

async function backfill() {
  const total = await Barang.countDocuments({});
  console.log(`\n[1/2] Backfill searchTokens — ${total} barang`);

  const cursor = Barang.find({})
    .select('nama kode kategori +searchTokens')
    .lean<Row>()
    .cursor();

  let scanned = 0;
  let updated = 0;
  let ops: mongoose.AnyBulkWriteOperation[] = [];

  const flush = async () => {
    if (!ops.length) return;
    await Barang.bulkWrite(ops, { ordered: false });
    updated += ops.length;
    ops = [];
    console.log(`      ${scanned}/${total} diperiksa, ${updated} diperbarui`);
  };

  for await (const doc of cursor) {
    scanned++;
    const tokens = buildSearchTokens(doc);
    if (sameTokens(doc.searchTokens, tokens)) continue;
    ops.push({
      updateOne: { filter: { _id: doc._id }, update: { $set: { searchTokens: tokens } } },
    });
    if (ops.length >= BATCH) await flush();
  }
  await flush();

  console.log(`      selesai — ${scanned} diperiksa, ${updated} diperbarui`);
}

async function buildIndexes() {
  console.log('\n[2/2] Membangun index koleksi barangs');
  const t = Date.now();
  await Barang.createIndexes();
  console.log(`      selesai (${Date.now() - t}ms)`);

  const indexes = await Barang.collection.indexes();
  console.log('      index sekarang:');
  for (const ix of indexes) {
    console.log(`        - ${ix.name}  ${JSON.stringify(ix.key)}`);
  }
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI tidak ditemukan');

  // Tampilkan target tanpa membocorkan kredensial — supaya salah-database ketahuan
  // sebelum ada yang tertulis.
  try {
    const parsed = new URL(uri);
    console.log(`Target: ${parsed.protocol}//${parsed.hostname}${parsed.pathname}`);
  } catch {
    console.log('Target: (URI tidak bisa diparse)');
  }

  await mongoose.connect(uri);
  await backfill();
  await buildIndexes();
  await mongoose.disconnect();

  console.log('\nMigrasi selesai.');
}

main().catch((e) => { console.error(e); process.exit(1); });
