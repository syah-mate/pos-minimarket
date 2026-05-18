import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IItemBayarHutang {
  transaksiBeliId: string;
  noHutang: string;
  tglHutang: Date;
  jmlHutang: number;
  returnAmount: number;
  angsuran: number;
}

export interface IBayarHutang extends Document {
  refNo: string;
  tanggal: Date;
  supplierId: string;
  supplierKode: string;
  supplierNama: string;
  supplierAlamat: string;
  kasId: string;
  kasKode: string;
  kasNama: string;
  keterangan: string;
  operator: string;
  items: IItemBayarHutang[];
  totalBayar: number;
  createdAt: Date;
  updatedAt: Date;
}

const ItemBayarHutangSchema = new Schema<IItemBayarHutang>(
  {
    transaksiBeliId: { type: String, default: '' },
    noHutang:        { type: String, default: '' },
    tglHutang:       { type: Date, default: null },
    jmlHutang:       { type: Number, default: 0 },
    returnAmount:    { type: Number, default: 0 },
    angsuran:        { type: Number, default: 0 },
  },
  { _id: false }
);

const BayarHutangSchema = new Schema<IBayarHutang>(
  {
    refNo:          { type: String, required: true, unique: true, trim: true },
    tanggal:        { type: Date, required: true, default: Date.now },
    supplierId:     { type: String, default: '' },
    supplierKode:   { type: String, default: '' },
    supplierNama:   { type: String, default: '' },
    supplierAlamat: { type: String, default: '' },
    kasId:          { type: String, default: '' },
    kasKode:        { type: String, default: '' },
    kasNama:        { type: String, default: '' },
    keterangan:     { type: String, default: '' },
    operator:       { type: String, default: '' },
    items:          { type: [ItemBayarHutangSchema], default: [] },
    totalBayar:     { type: Number, default: 0 },
  },
  { timestamps: true }
);

const BayarHutang: Model<IBayarHutang> =
  mongoose.models.BayarHutang ??
  mongoose.model<IBayarHutang>('BayarHutang', BayarHutangSchema);

export default BayarHutang;
