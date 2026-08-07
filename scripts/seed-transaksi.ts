import "dotenv/config";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) throw new Error("MONGODB_URI tidak ditemukan");

// ── Helper: random ──
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}
function formatDate(d: Date): string {
  const y = d.getFullYear().toString().slice(2);
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}${m}${day}`;
}
function round(n: number): number {
  return Math.round(n);
}

// ── Types minimal (inline) ──
interface BarangDoc {
  _id: string;
  kode: string;
  nama: string;
  satuanBeli: string;
  satuanJual: string;
  isi: number;
  hargaBeli: number;
  hargaJual: number;
  stok: number;
  lokasi: string;
}
interface SupplierDoc {
  _id: string;
  kode: string;
  nama: string;
  alamat: string;
}
interface PelangganDoc {
  _id: string;
  kode: string;
  nama: string;
  alamat: string;
}
interface KasDoc {
  _id: string;
  kode: string;
  nama: string;
}

// ── Generate dates ──
function generateDates(
  count: number,
  startMonth: number, // 1-based
  endMonth: number,
  year: number
): Date[] {
  const dates: Date[] = [];
  // Calculate days in range
  const start = new Date(year, startMonth - 1, 1);
  const end = new Date(year, endMonth, 0); // last day of endMonth
  const totalDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  for (let i = 0; i < count; i++) {
    const dayOffset = Math.floor((i / count) * totalDays);
    const d = new Date(start);
    d.setDate(d.getDate() + dayOffset);
    // Add random hour/minute
    d.setHours(rand(8, 20), rand(0, 59), rand(0, 59));
    dates.push(d);
  }
  // Shuffle to make it feel more natural
  return dates.sort(() => Math.random() - 0.5);
}

// ── Generate refNo ──
function genRefNo(prefix: string, date: Date, counter: number): string {
  return `${prefix}-${formatDate(date)}-${counter.toString().padStart(3, "0")}`;
}

async function seed() {
  console.log("🔌 Menghubungkan ke MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Terhubung");

  const db = mongoose.connection.db!;

  // 1. Ambil data master
  const barangs = (await db.collection("barangs").find({}).toArray()) as unknown as BarangDoc[];
  const suppliers = (await db.collection("suppliers").find({}).toArray()) as unknown as SupplierDoc[];
  const pelanggans = (await db.collection("pelanggans").find({}).toArray()) as unknown as PelangganDoc[];
  const kasList = (await db.collection("kas").find({}).toArray()) as unknown as KasDoc[];

  console.log(`📦 Barang: ${barangs.length} | 🏭 Supplier: ${suppliers.length} | 👤 Pelanggan: ${pelanggans.length} | 💰 Kas: ${kasList.length}`);

  if (barangs.length === 0) throw new Error("Tidak ada barang!");
  if (suppliers.length === 0) throw new Error("Tidak ada supplier!");
  if (pelanggans.length === 0) throw new Error("Tidak ada pelanggan!");
  if (kasList.length === 0) throw new Error("Tidak ada kas!");

  const kasUtama = kasList[0];
  const operator = "admin";

  // 2. Generate 100 Pembelian — spread May, June, July 2026
  console.log("\n📋 Membuat 100 record PEMBELIAN...");
  const beliDates = generateDates(100, 5, 7, 2026);
  const pembelians: any[] = [];

  for (let i = 0; i < 100; i++) {
    const tanggal = beliDates[i];
    const supplier = pick(suppliers);
    const isHutang = Math.random() < 0.3; // 30% hutang
    const itemCount = rand(1, 6);
    const pickedBarangs = pickN(barangs, itemCount);

    const items: any[] = [];
    let subtotal = 0;
    let totalDisc = 0;

    for (const b of pickedBarangs) {
      const qty = rand(1, 20);
      const hrgBeli = b.hargaBeli > 0 ? b.hargaBeli : rand(1000, 50000);
      const disc = Math.random() < 0.2 ? rand(1, 10) : 0; // 20% chance disc
      const rupiah = round(qty * hrgBeli * (1 - disc / 100));
      const isi = b.isi || 1;
      const pct = rand(10, 40);
      const hgaToko = round(hrgBeli * (1 + pct / 100));
      const hrgPartai = round(hgaToko * 0.85);
      const hrgCabang = round(hgaToko * 0.9);

      items.push({
        barangId: b._id.toString(),
        namaBarang: b.nama,
        satuan: Math.random() < 0.5 ? b.satuanBeli : b.satuanJual,
        satuanType: Math.random() < 0.5 ? "beli" : "jual",
        isi,
        qty,
        hrgBeli,
        hgaToko,
        pctToko: pct,
        hrgPartai,
        pctPartai: round((1 - hrgPartai / hgaToko) * 100),
        hrgCabang,
        pctCabang: round((1 - hrgCabang / hgaToko) * 100),
        disc,
        rupiah,
        expired: Math.random() < 0.3 ? new Date(2027, rand(0, 11), rand(1, 28)) : null,
      });
      subtotal += rupiah;
      totalDisc += round(qty * hrgBeli * (disc / 100));
    }

    const ppn = round(subtotal * 0.11);
    const grandTotal = subtotal + ppn;
    const lunas = isHutang ? round(grandTotal * (rand(30, 70) / 100)) : grandTotal;
    const hutang = grandTotal - lunas;
    const tempoHari = isHutang ? [7, 14, 21, 30][rand(0, 3)] : 0;
    const tempo = isHutang ? new Date(tanggal.getTime() + tempoHari * 24 * 60 * 60 * 1000) : null;
    const pembayaran = isHutang
      ? (["1 Minggu", "2 Minggu", "3 Minggu", "4 Minggu"] as const)[rand(0, 3)]
      : "Cash";

    pembelians.push({
      refNo: genRefNo("BL", tanggal, i + 1),
      tanggal,
      supplierId: supplier._id.toString(),
      supplierNama: supplier.nama,
      supplierAlamat: supplier.alamat || "",
      kasId: kasUtama._id.toString(),
      kasKode: kasUtama.kode,
      kasNama: kasUtama.nama,
      keterangan: `Pembelian dari ${supplier.nama}`,
      pembayaran,
      tempoHari,
      tempo,
      items,
      subtotal: round(subtotal),
      disc: totalDisc,
      ppn,
      grandTotal: round(grandTotal),
      lunas,
      hutang,
      lunasTanggal: isHutang ? null : tanggal,
      lunasOperator: isHutang ? "" : operator,
      operator,
      cetakBarcode: false,
      updateHargaJual: false,
      createdAt: tanggal,
      updatedAt: tanggal,
    });
  }

  // 3. Generate 100 Penjualan — spread June & July 2026
  console.log("📋 Membuat 100 record PENJUALAN...");
  const jualDates = generateDates(100, 6, 7, 2026);
  const penjualans: any[] = [];

  for (let i = 0; i < 100; i++) {
    const tanggal = jualDates[i];
    const pelanggan = pick(pelanggans);
    const isPiutang = Math.random() < 0.2; // 20% piutang
    const itemCount = rand(1, 6);
    const pickedBarangs = pickN(barangs, itemCount);
    const jenis = (["toko", "partai", "cabang"] as const)[rand(0, 2)];

    const items: any[] = [];
    let subtotal = 0;
    let totalDiscRp = 0;

    for (const b of pickedBarangs) {
      const qty = rand(1, 10);
      // Karena hargaJual semuanya 0, pakai hargaBeli * markup 1.2-1.5
      const baseHarga = b.hargaJual > 0 ? b.hargaJual : round(b.hargaBeli * (1 + rand(20, 50) / 100));
      const discPct = Math.random() < 0.15 ? rand(1, 15) : 0;
      const discRp = round(baseHarga * qty * (discPct / 100));
      const itemSubtotal = round(qty * baseHarga - discRp);

      items.push({
        barangId: b._id.toString(),
        namaBarang: b.nama,
        satuan: b.satuanJual,
        stok: b.stok,
        lokasi: b.lokasi || "",
        qty,
        harga: baseHarga,
        discPct,
        discRp,
        subtotal: itemSubtotal,
      });
      subtotal += itemSubtotal;
      totalDiscRp += discRp;
    }

    const ppn = round(subtotal * 0.11);
    const grandTotal = subtotal + ppn;
    const lunasPiutang = isPiutang ? round(grandTotal * (rand(30, 70) / 100)) : grandTotal;
    const piutang = grandTotal - lunasPiutang;
    const tempoHari = isPiutang ? [7, 14, 21, 30][rand(0, 3)] : 0;
    const jatuhTempo = isPiutang ? new Date(tanggal.getTime() + tempoHari * 24 * 60 * 60 * 1000) : null;
    const pembayaran = isPiutang
      ? (["1 Minggu", "2 Minggu", "3 Minggu", "4 Minggu"] as const)[rand(0, 3)]
      : "Cash";

    penjualans.push({
      refNo: genRefNo("JL", tanggal, i + 1),
      tanggal,
      jenis,
      pelangganId: pelanggan._id.toString(),
      pelangganKode: pelanggan.kode,
      pelangganNama: pelanggan.nama,
      pelangganAlamat: pelanggan.alamat || "",
      kasId: kasUtama._id.toString(),
      kasKode: kasUtama.kode,
      kasNama: kasUtama.nama,
      spg: "",
      pembayaran,
      tempoHari,
      jatuhTempo,
      keterangan: `Penjualan ke ${pelanggan.nama}`,
      items,
      subtotal: round(subtotal),
      disc: totalDiscRp,
      ppn,
      grandTotal: round(grandTotal),
      piutang,
      lunasPiutang,
      piutangLunasTanggal: isPiutang ? null : tanggal,
      piutangLunasOperator: isPiutang ? "" : operator,
      operator,
      cetakNota: false,
      createdAt: tanggal,
      updatedAt: tanggal,
    });
  }

  // 4. Insert ke database
  console.log("💾 Menyimpan ke database...");
  await db.collection("transaksibelis").insertMany(pembelians);
  console.log(`✅ ${pembelians.length} record PEMBELIAN tersimpan`);

  await db.collection("transaksijuals").insertMany(penjualans);
  console.log(`✅ ${penjualans.length} record PENJUALAN tersimpan`);

  // 5. Summary
  const totalBeli = pembelians.reduce((s, t) => s + t.grandTotal, 0);
  const totalJual = penjualans.reduce((s, t) => s + t.grandTotal, 0);
  console.log("\n📊 RINGKASAN:");
  console.log(`   Total Pembelian: Rp ${totalBeli.toLocaleString("id-ID")}`);
  console.log(`   Total Penjualan: Rp ${totalJual.toLocaleString("id-ID")}`);
  console.log(`   Hutang (belum lunas): Rp ${pembelians.reduce((s, t) => s + t.hutang, 0).toLocaleString("id-ID")}`);
  console.log(`   Piutang (belum lunas): Rp ${penjualans.reduce((s, t) => s + t.piutang, 0).toLocaleString("id-ID")}`);

  await mongoose.disconnect();
  console.log("\n🎉 Seed selesai!");
}

seed().catch((err) => {
  console.error("❌ Seed gagal:", err);
  process.exit(1);
});
