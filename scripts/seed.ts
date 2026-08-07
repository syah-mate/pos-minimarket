import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI tidak ditemukan di environment variables");
}

// Inline schema agar tidak perlu compile TypeScript saat seed
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ["admin", "kasir"], default: "kasir" },
    menuPermissions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const User = mongoose.models.User ?? mongoose.model("User", UserSchema);

async function seed() {
  console.log("🔌 Menghubungkan ke MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Terhubung ke MongoDB");

  // Data user awal
  const users = [
    {
      name: "Administrator",
      username: "admin",
      password: "admin123",
      role: "admin",
      menuPermissions: [
        '/dashboard/master/barang',
        '/dashboard/master/jasa',
        '/dashboard/master/pelanggan',
        '/dashboard/master/cabang',
        '/dashboard/master/supplier',
        '/dashboard/master/karyawan',
        '/dashboard/master/kas',
        '/dashboard/transaksi/beli',
        '/dashboard/transaksi/jual',
        '/dashboard/transaksi/return-pembelian',
        '/dashboard/transaksi/terima-return',
        '/dashboard/transaksi/return-penjualan',
        '/dashboard/transaksi/bayar-hutang',
        '/dashboard/transaksi/terima-piutang',
        '/dashboard/back-office/koreksi-stok',
        '/dashboard/laporan/pembelian',
        '/dashboard/laporan/penjualan',
        '/dashboard/laporan/stok',
        '/dashboard/laporan/laba-rugi',
      ],
    },
  ];

  for (const userData of users) {
    const existing = await User.findOne({ username: userData.username });

    if (existing) {
      console.log(`⚠️  User '${userData.username}' sudah ada, dilewati.`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(userData.password, 12);
    await User.create({ ...userData, password: hashedPassword });
    console.log(`✅ User '${userData.username}' (${userData.role}) berhasil dibuat`);
    console.log(`   Password: ${userData.password}`);
  }

  console.log("\n🎉 Seed selesai!");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed gagal:", err);
  process.exit(1);
});
