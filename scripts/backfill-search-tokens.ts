/**
 * Isi field `searchTokens` untuk seluruh dokumen Barang yang sudah ada.
 *
 * Field ini baru ditambahkan, jadi dokumen lama belum punya token dan tidak akan
 * pernah muncul di pencarian picker sampai skrip ini dijalankan.
 *
 * Jalankan: npm run backfill-search-tokens
 * Lalu:     npm run ensure-indexes   (backfill dulu, baru bangun index)
 *
 * Idempotent — aman diulang. Dokumen yang tokennya sudah benar dilewati.
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

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI tidak ditemukan');
  await mongoose.connect(uri);

  const total = await Barang.countDocuments({});
  console.log(`Total barang: ${total}`);

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
    console.log(`  ${scanned}/${total} diperiksa, ${updated} diperbarui`);
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

  await mongoose.disconnect();
  console.log(`\nSelesai — ${scanned} diperiksa, ${updated} diperbarui.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
