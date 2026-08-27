import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IItemTerimaPiutang {
  transaksiJualId: string;
  noPiutang: string;
  tglPiutang: Date;
  jmlPiutang: number;
  returnAmount: number;
  angsuran: number;
}

export interface ITerimaPiutang extends Document {
  refNo: string;
  tanggal: Date;
  pelangganId: string;
  pelangganKode: string;
  pelangganNama: string;
  pelangganAlamat: string;
  kasId: string;
  kasKode: string;
  kasNama: string;
  keterangan: string;
  operator: string;
  items: IItemTerimaPiutang[];
  totalTerima: number;
  createdAt: Date;
  updatedAt: Date;
}

const ItemTerimaPiutangSchema = new Schema<IItemTerimaPiutang>(
  {
    transaksiJualId: { type: String, default: '' },
    noPiutang:       { type: String, default: '' },
    tglPiutang:      { type: Date, default: null },
    jmlPiutang:      { type: Number, default: 0 },
    returnAmount:    { type: Number, default: 0 },
    angsuran:        { type: Number, default: 0 },
  },
  { _id: false }
);

const TerimaPiutangSchema = new Schema<ITerimaPiutang>(
  {
    refNo:           { type: String, required: true, unique: true, trim: true },
    tanggal:         { type: Date, required: true, default: Date.now },
    pelangganId:     { type: String, default: '' },
    pelangganKode:   { type: String, default: '' },
    pelangganNama:   { type: String, default: '' },
    pelangganAlamat: { type: String, default: '' },
    kasId:           { type: String, default: '' },
    kasKode:         { type: String, default: '' },
    kasNama:         { type: String, default: '' },
    keterangan:      { type: String, default: '' },
    operator:        { type: String, default: '' },
    items:           { type: [ItemTerimaPiutangSchema], default: [] },
    totalTerima:     { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ─── Index untuk sort riwayat ──────────────────────────────────────────────
TerimaPiutangSchema.index({ tanggal: -1, createdAt: -1 });

const TerimaPiutang: Model<ITerimaPiutang> =
  mongoose.models.TerimaPiutang ??
  mongoose.model<ITerimaPiutang>('TerimaPiutang', TerimaPiutangSchema);

export default TerimaPiutang;
