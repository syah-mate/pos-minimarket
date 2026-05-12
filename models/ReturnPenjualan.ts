import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IItemReturnJual {
  fakturId: string;
  noFaktur: string;
  tglJual: Date | null;
  barangId: string;
  kodeBarang: string;
  namaBarang: string;
  satuan: string;
  qty: number;
  harga: number;
  diskon: number;
  subtotal: number;
  tipe: 'kembali_uang' | 'potong_piutang';
  alasan: string;
}

export interface IReturnPenjualan extends Document {
  refNo: string;
  tanggal: Date;
  jenisPelanggan: 'Pelanggan' | 'Umum';
  pelangganId: string;
  pelangganKode: string;
  pelangganNama: string;
  pelangganAlamat: string;
  kasId: string;
  kasKode: string;
  kasNama: string;
  operator: string;
  items: IItemReturnJual[];
  totalKembaliUang: number;
  totalPotongPiutang: number;
  totalRtr: number;
  createdAt: Date;
  updatedAt: Date;
}

const ItemReturnJualSchema = new Schema<IItemReturnJual>(
  {
    fakturId:    { type: String, default: '' },
    noFaktur:    { type: String, default: '' },
    tglJual:     { type: Date, default: null },
    barangId:    { type: String, default: '' },
    kodeBarang:  { type: String, default: '' },
    namaBarang:  { type: String, default: '' },
    satuan:      { type: String, default: '' },
    qty:         { type: Number, default: 0 },
    harga:       { type: Number, default: 0 },
    diskon:      { type: Number, default: 0 },
    subtotal:    { type: Number, default: 0 },
    tipe:        { type: String, enum: ['kembali_uang', 'potong_piutang'], default: 'kembali_uang' },
    alasan:      { type: String, default: '' },
  },
  { _id: false }
);

const ReturnPenjualanSchema = new Schema<IReturnPenjualan>(
  {
    refNo:            { type: String, required: true, unique: true, trim: true },
    tanggal:          { type: Date, required: true, default: Date.now },
    jenisPelanggan:   { type: String, enum: ['Pelanggan', 'Umum'], default: 'Pelanggan' },
    pelangganId:      { type: String, default: '' },
    pelangganKode:    { type: String, default: '' },
    pelangganNama:    { type: String, default: '', trim: true },
    pelangganAlamat:  { type: String, default: '', trim: true },
    kasId:            { type: String, default: '' },
    kasKode:          { type: String, default: '' },
    kasNama:          { type: String, default: '' },
    operator:         { type: String, default: '', trim: true },
    items:            { type: [ItemReturnJualSchema], default: [] },
    totalKembaliUang: { type: Number, default: 0 },
    totalPotongPiutang:{ type: Number, default: 0 },
    totalRtr:         { type: Number, default: 0 },
  },
  { timestamps: true }
);

const ReturnPenjualan: Model<IReturnPenjualan> =
  mongoose.models.ReturnPenjualan ??
  mongoose.model<IReturnPenjualan>('ReturnPenjualan', ReturnPenjualanSchema);

export default ReturnPenjualan;
