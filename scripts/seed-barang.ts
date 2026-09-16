/**
 * Dummy barang untuk keperluan uji coba (stok 99 semua).
 *
 * Insert lewat `Barang.create()` — bukan driver mentah — supaya hook
 * `pre("save")` di models/Barang.ts ikut jalan dan `searchTokens` terisi.
 * Tanpa token, barang tidak akan pernah muncul di picker "PILIH BARANG".
 *
 * Idempoten: kode yang sudah ada dilewati, jadi aman dijalankan berulang.
 */
import "dotenv/config";
import mongoose from "mongoose";
import Barang from "../models/Barang";

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) throw new Error("MONGODB_URI tidak ditemukan di environment variables");

const STOK = 99;

/** [kode, nama, kategori, satuan, hargaBeli, hargaJualToko] */
const RAW: Array<[string, string, string, string, number, number]> = [
  ["BRG001", "INDOMIE GORENG 85GR",        "MIE INSTAN", "PCS", 2800,  3500],
  ["BRG002", "INDOMIE AYAM BAWANG 69GR",   "MIE INSTAN", "PCS", 2700,  3400],
  ["BRG003", "MIE SEDAAP GORENG 90GR",     "MIE INSTAN", "PCS", 2600,  3300],
  ["BRG004", "AQUA BOTOL 600ML",           "MINUMAN",    "PCS", 2500,  4000],
  ["BRG005", "TEH PUCUK HARUM 350ML",      "MINUMAN",    "PCS", 3000,  4500],
  ["BRG006", "SUSU MILO UHT 200ML",        "MINUMAN",    "PCS", 5500,  7500],
  ["BRG007", "KOPI KAPAL API SPECIAL 65GR","MINUMAN",    "PCS", 8000, 11000],
  ["BRG008", "CHITATO SAPI PANGGANG 68GR", "SNACK",      "PCS", 9500, 13000],
  ["BRG009", "OREO ORIGINAL 133GR",        "SNACK",      "PCS", 7500, 10000],
  ["BRG010", "BENG BENG 20GR",             "SNACK",      "PCS", 1500,  2500],
  ["BRG011", "GULA PASIR GULAKU 1KG",      "SEMBAKO",    "KG",  15000, 18500],
  ["BRG012", "BERAS RAMOS 5KG",            "SEMBAKO",    "SAK", 62000, 72000],
  ["BRG013", "MINYAK GORENG SANIA 1L",     "SEMBAKO",    "PCS", 17000, 20000],
  ["BRG014", "SABUN LIFEBUOY 85GR",        "TOILETRIES", "PCS", 3500,  5000],
  ["BRG015", "PEPSODENT 190GR",            "TOILETRIES", "PCS", 14000, 18000],
];

async function seed() {
  console.log("🔌 Menghubungkan ke MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Terhubung");

  let dibuat = 0;
  let dilewati = 0;

  for (const [kode, nama, kategori, satuan, hargaBeli, hargaJualToko] of RAW) {
    if (await Barang.findOne({ kode })) {
      dilewati++;
      continue;
    }

    // Partai/cabang lebih murah dari harga toko — meniru tiering harga asli.
    await Barang.create({
      kode,
      barcode: "899" + kode.slice(3).padStart(10, "0"),
      nama,
      kategori,
      satuanBeli: satuan,
      satuanJual: satuan,
      isi: 1,
      hargaBeli,
      hargaJual: hargaJualToko,
      hargaJualToko,
      hargaJualPartai: Math.round(hargaJualToko * 0.93),
      hargaJualCabang: Math.round(hargaJualToko * 0.96),
      stok: STOK,
      stokMinimum: 10,
      stokMaksimum: 500,
      lokasi: "RAK-" + kategori.slice(0, 3),
      diskon: 0,
      supplier: "DUMMY SUPPLIER",
    });
    dibuat++;
  }

  console.log(`\n📦 ${dibuat} barang dibuat, ${dilewati} dilewati (kode sudah ada).`);
  console.log(`   Semua stok = ${STOK}`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed barang gagal:", err);
  process.exit(1);
});
