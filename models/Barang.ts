import mongoose, { Document, Model, Schema } from "mongoose";

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
  },
  { timestamps: true }
);

const Barang: Model<IBarang> =
  mongoose.models.Barang ?? mongoose.model<IBarang>("Barang", BarangSchema);

export default Barang;
