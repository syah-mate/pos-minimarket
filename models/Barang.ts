import mongoose, { Document, Model, Schema } from "mongoose";
import { buildSearchTokens, TOKEN_SOURCE_FIELDS } from "@/lib/searchTokens";

export interface IBarang extends Document {
  kode: string;
  barcode: string;
  nama: string;
  kategori: string;
  subKategori: string;
  hasExpired: boolean;
  expired?: Date;
  satuanBeli: string;
  satuanJual: string;
  isi: number;
  hargaBeli: number;
  hargaJual: number;
  hargaJualToko: number;
  hargaJualPartai: number;
  hargaJualCabang: number;
  stok: number;
  stokMinimum: number;
  stokMaksimum: number;
  lokasi: string;
  diskon: number;
  pointMember: number;
  pointKaryawan: number;
  tglBeli?: Date;
  supplier: string;
  /** Token pencarian turunan dari nama/kode/kategori — lihat lib/searchTokens.ts. */
  searchTokens: string[];
  createdAt: Date;
  updatedAt: Date;
}

const BarangSchema = new Schema<IBarang>(
  {
    kode: { type: String, required: [true, "Kode wajib diisi"], unique: true, trim: true, uppercase: true },
    barcode: { type: String, trim: true, default: "" },
    nama: { type: String, required: [true, "Nama barang wajib diisi"], trim: true },
    kategori: { type: String, trim: true, default: "" },
    subKategori: { type: String, trim: true, default: "" },
    hasExpired: { type: Boolean, default: false },
    expired: { type: Date },
    satuanBeli: { type: String, default: "PCS" },
    satuanJual: { type: String, default: "PCS" },
    isi: { type: Number, default: 1, min: 1 },
    hargaBeli: { type: Number, default: 0, min: 0 },
    hargaJual: { type: Number, default: 0, min: 0 },
    hargaJualToko: { type: Number, default: 0, min: 0 },
    hargaJualPartai: { type: Number, default: 0, min: 0 },
    hargaJualCabang: { type: Number, default: 0, min: 0 },
    stok: { type: Number, default: 0 },
    stokMinimum: { type: Number, default: 0, min: 0 },
    stokMaksimum: { type: Number, default: 0, min: 0 },
    lokasi: { type: String, trim: true, default: "" },
    diskon: { type: Number, default: 0, min: 0, max: 100 },
    pointMember: { type: Number, default: 0, min: 0 },
    pointKaryawan: { type: Number, default: 0, min: 0 },
    tglBeli: { type: Date },
    supplier: { type: String, trim: true, default: "" },
    // `select: false` supaya token tidak ikut terkirim ke client dan tidak
    // mengubah payload endpoint mana pun.
    searchTokens: { type: [String], default: [], select: false },
  },
  { timestamps: true }
);

// ─── Indexes untuk performa pencarian & pagination ─────────────────────────
BarangSchema.index({ nama: 1 });
// kode: index otomatis dari `unique: true` — jangan dideklarasikan ulang
BarangSchema.index({ kategori: 1 });
BarangSchema.index({ supplier: 1 });
// Multikey — dipakai regex ber-anchor (`/^milo/`) di GET /api/barang.
BarangSchema.index({ searchTokens: 1 });

// ─── Menjaga searchTokens tetap sinkron ────────────────────────────────────
// `Barang.create()` / `doc.save()`
BarangSchema.pre("save", function () {
  if (this.isNew || TOKEN_SOURCE_FIELDS.some((f) => this.isModified(f))) {
    this.searchTokens = buildSearchTokens(this);
  }
});

// `findByIdAndUpdate` / `findOneAndUpdate` / `updateOne` — hook `save` tidak
// jalan di jalur ini. Puluhan pemanggil lain di codebase hanya mengubah `stok`,
// jadi mereka tidak kena biaya read tambahan di bawah.
async function syncTokensOnUpdate(this: mongoose.Query<unknown, IBarang>) {
  const update = (this.getUpdate() ?? {}) as Record<string, unknown> & { $set?: Record<string, unknown> };
  const fields = { ...update, ...(update.$set ?? {}) } as Record<string, unknown>;
  if (!TOKEN_SOURCE_FIELDS.some((f) => f in fields)) return;

  // Update parsial: lengkapi field sumber yang tidak ikut dikirim dari dokumen
  // yang ada. Pada upsert-insert `current` bernilai null — itu wajar.
  const current = await this.model
    .findOne(this.getFilter())
    .select("nama kode kategori")
    .lean<{ nama?: string; kode?: string; kategori?: string } | null>();

  const source = {
    nama: (fields.nama as string) ?? current?.nama,
    kode: (fields.kode as string) ?? current?.kode,
    kategori: (fields.kategori as string) ?? current?.kategori,
  };
  this.set("searchTokens", buildSearchTokens(source));
}

BarangSchema.pre("findOneAndUpdate", syncTokensOnUpdate);
BarangSchema.pre("updateOne", syncTokensOnUpdate);

const Barang: Model<IBarang> =
  mongoose.models.Barang ?? mongoose.model<IBarang>("Barang", BarangSchema);

export default Barang;
