/**
 * Sinkronisasi index seluruh model ke MongoDB.
 *
 * Mongoose hanya membangun index otomatis kalau `autoIndex` aktif, dan itu dimatikan
 * secara default di production. Tanpa skrip ini, index yang dideklarasikan di `models/`
 * tidak pernah benar-benar dibuat di server production.
 *
 * Jalankan: npm run ensure-indexes
 *
 * PERINGATAN PRODUCTION: `syncIndexes()` MENGHAPUS index yang tidak terdaftar di schema,
 * dan build index pada koleksi besar bisa mengunci database. Jalankan saat toko tutup.
 */
import mongoose from 'mongoose';
import Barang from '../models/Barang';
import TransaksiJual from '../models/TransaksiJual';
import TransaksiBeli from '../models/TransaksiBeli';
import Pelanggan from '../models/Pelanggan';
import Supplier from '../models/Supplier';
import Karyawan from '../models/Karyawan';
import Kas from '../models/Kas';
import Cabang from '../models/Cabang';
import Jasa from '../models/Jasa';
import User from '../models/User';
import KoreksiStok from '../models/KoreksiStok';
import ReturnPenjualan from '../models/ReturnPenjualan';
import ReturnPembelian from '../models/ReturnPembelian';
import TerimaPiutang from '../models/TerimaPiutang';
import TerimaReturn from '../models/TerimaReturn';
import BayarHutang from '../models/BayarHutang';

const MODELS: mongoose.Model<unknown>[] = [
  Barang, TransaksiJual, TransaksiBeli, Pelanggan, Supplier, Karyawan,
  Kas, Cabang, Jasa, User, KoreksiStok, ReturnPenjualan, ReturnPembelian,
  TerimaPiutang, TerimaReturn, BayarHutang,
] as unknown as mongoose.Model<unknown>[];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI tidak ditemukan');
  await mongoose.connect(uri);

  const failed: string[] = [];

  for (const M of MODELS) {
    process.stdout.write(`  ${M.modelName} ... `);
    const t = Date.now();
    try {
      await M.syncIndexes();
      console.log(`ok (${Date.now() - t}ms)`);
    } catch (err) {
      // Satu model gagal (mis. data lama melanggar constraint unique) tidak boleh
      // menggagalkan sinkronisasi model lain.
      failed.push(M.modelName);
      const msg = err instanceof Error ? err.message.split('\n')[0] : String(err);
      console.log(`GAGAL — ${msg}`);
    }
  }

  await mongoose.disconnect();

  if (failed.length) {
    console.error(`\nSelesai dengan ${failed.length} kegagalan: ${failed.join(', ')}`);
    process.exit(1);
  }
  console.log('\nIndex tersinkron.');
}

main().catch((e) => { console.error(e); process.exit(1); });
