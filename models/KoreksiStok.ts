import mongoose, { Document, Model, Schema } from "mongoose";

export interface IKoreksiStokItem {
  barangId: string;
  namaBarang: string;
  satuan: string;
  stokLalu: number;
  stokKini: number;
  alasan: string;
  selisih: number;
}

export interface IKoreksiStok extends Document {
  refNo: string;
  tanggal: Date;
  jenisTransaksi: string;
  items: IKoreksiStokItem[];
  userId: string;
  userName: string;
  createdAt: Date;
  updatedAt: Date;
}

const KoreksiStokItemSchema = new Schema<IKoreksiStokItem>(
  {
    barangId: { type: String, required: true },
    namaBarang: { type: String, required: true },
    satuan: { type: String, default: "PCS" },
    stokLalu: { type: Number, default: 0 },
    stokKini: { type: Number, default: 0 },
    alasan: { type: String, default: "" },
    selisih: { type: Number, default: 0 },
  },
  { _id: false }
);

const KoreksiStokSchema = new Schema<IKoreksiStok>(
  {
    refNo: { type: String, required: true, unique: true, trim: true, uppercase: true },
    tanggal: { type: Date, required: true, default: Date.now },
    jenisTransaksi: { type: String, default: "KOREKSI STOK", trim: true },
    items: { type: [KoreksiStokItemSchema], default: [] },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

const KoreksiStok: Model<IKoreksiStok> =
  mongoose.models.KoreksiStok || mongoose.model<IKoreksiStok>("KoreksiStok", KoreksiStokSchema);

export default KoreksiStok;
