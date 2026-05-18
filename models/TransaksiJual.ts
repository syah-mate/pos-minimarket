import mongoose, { Schema, Document, Model } from 'mongoose';

export type JenisJual = 'toko' | 'partai' | 'cabang';

export interface IItemJual {
  barangId: string;
  namaBarang: string;
  satuan: string;
  stok: number;
  lokasi: string;
  qty: number;
  harga: number;
  discPct: number;
  discRp: number;
  subtotal: number;
}

export interface ITransaksiJual extends Document {
  refNo: string;
  tanggal: Date;
  jenis: JenisJual;
  pelangganId: string;
  pelangganKode: string;
  pelangganNama: string;
  pelangganAlamat: string;
  kasId: string;
  kasKode: string;
  kasNama: string;
  spg: string;
  pembayaran: 'Cash' | 'Kredit';
  keterangan: string;
  items: IItemJual[];
  subtotal: number;
  disc: number;
  ppn: number;
  grandTotal: number;
  piutang: number;
  lunasPiutang: number;
  piutangLunasTanggal: Date | null;
  piutangLunasOperator: string;
  operator: string;
  cetakNota: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ItemJualSchema = new Schema<IItemJual>(
  {
    barangId:   { type: String, default: '' },
    namaBarang: { type: String, default: '' },
    satuan:     { type: String, default: '' },
    stok:       { type: Number, default: 0 },
    lokasi:     { type: String, default: '' },
    qty:        { type: Number, default: 0 },
    harga:      { type: Number, default: 0 },
    discPct:    { type: Number, default: 0 },
    discRp:     { type: Number, default: 0 },
    subtotal:   { type: Number, default: 0 },
  },
  { _id: false }
);

const TransaksiJualSchema = new Schema<ITransaksiJual>(
  {
    refNo:          { type: String, required: true, unique: true, trim: true },
    tanggal:        { type: Date, required: true, default: Date.now },
    jenis:          { type: String, enum: ['toko', 'partai', 'cabang'], default: 'toko' },
    pelangganId:    { type: String, default: '' },
    pelangganKode:  { type: String, default: '' },
    pelangganNama:  { type: String, default: '' },
    pelangganAlamat:{ type: String, default: '' },
    kasId:          { type: String, default: '' },
    kasKode:        { type: String, default: '' },
    kasNama:        { type: String, default: '' },
    spg:            { type: String, default: '' },
    pembayaran:     { type: String, enum: ['Cash', 'Kredit'], default: 'Cash' },
    keterangan:     { type: String, default: '' },
    items:          { type: [ItemJualSchema], default: [] },
    subtotal:       { type: Number, default: 0 },
    disc:           { type: Number, default: 0 },
    ppn:            { type: Number, default: 0 },
    grandTotal:     { type: Number, default: 0 },
    piutang:           { type: Number, default: 0 },
    lunasPiutang:      { type: Number, default: 0 },
    piutangLunasTanggal:  { type: Date, default: null },
    piutangLunasOperator: { type: String, default: '' },
    operator:          { type: String, default: '' },
    cetakNota:      { type: Boolean, default: false },
  },
  { timestamps: true }
);

const TransaksiJual: Model<ITransaksiJual> =
  mongoose.models.TransaksiJual ??
  mongoose.model<ITransaksiJual>('TransaksiJual', TransaksiJualSchema);

export default TransaksiJual;
