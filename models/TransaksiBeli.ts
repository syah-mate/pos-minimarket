import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IItemBeli {
  barangId: string;
  namaBarang: string;
  satuan: string;
  satuanType: 'jual' | 'beli';
  isi: number;
  qty: number;
  hrgBeli: number;
  hgaToko: number;
  pctToko: number;
  hrgPartai: number;
  pctPartai: number;
  hrgCabang: number;
  pctCabang: number;
  disc: number;
  rupiah: number;
  expired: Date | null;
}

export interface ITransaksiBeli extends Document {
  refNo: string;
  tanggal: Date;
  supplierId: string;
  supplierNama: string;
  supplierAlamat: string;
  kasId: string;
  kasKode: string;
  kasNama: string;
  keterangan: string;
  pembayaran: 'Cash' | '1 Minggu' | '2 Minggu' | '3 Minggu' | '4 Minggu' | 'Custom' | 'Tempo';
  tempoHari: number;
  tempo: Date | null;
  items: IItemBeli[];
  subtotal: number;
  disc: number;
  ppn: number;
  grandTotal: number;
  lunas: number;
  hutang: number;
  lunasTanggal: Date | null;
  lunasOperator: string;
  operator: string;
  cetakBarcode: boolean;
  updateHargaJual: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ItemBeliSchema = new Schema<IItemBeli>(
  {
    barangId:   { type: String, default: '' },
    namaBarang: { type: String, default: '' },
    satuan:     { type: String, default: '' },
    satuanType: { type: String, enum: ['jual', 'beli'], default: 'jual' },
    isi:        { type: Number, default: 1 },
    qty:        { type: Number, default: 0 },
    hrgBeli:    { type: Number, default: 0 },
    hgaToko:    { type: Number, default: 0 },
    pctToko:    { type: Number, default: 0 },
    hrgPartai:  { type: Number, default: 0 },
    pctPartai:  { type: Number, default: 0 },
    hrgCabang:  { type: Number, default: 0 },
    pctCabang:  { type: Number, default: 0 },
    disc:       { type: Number, default: 0 },
    rupiah:     { type: Number, default: 0 },
    expired:    { type: Date, default: null },
  },
  { _id: false }
);

const TransaksBeliSchema = new Schema<ITransaksiBeli>(
  {
    refNo:          { type: String, required: true, unique: true, trim: true },
    tanggal:        { type: Date, required: true, default: Date.now },
    supplierId:     { type: String, default: '' },
    supplierNama:   { type: String, default: '' },
    supplierAlamat: { type: String, default: '' },
    kasId:          { type: String, default: '' },
    kasKode:        { type: String, default: '' },
    kasNama:        { type: String, default: '' },
    keterangan:     { type: String, default: '' },
    pembayaran:     { type: String, default: 'Cash' },
    tempoHari:      { type: Number, default: 0 },
    tempo:          { type: Date, default: null },
    items:          { type: [ItemBeliSchema], default: [] },
    subtotal:       { type: Number, default: 0 },
    disc:           { type: Number, default: 0 },
    ppn:            { type: Number, default: 0 },
    grandTotal:     { type: Number, default: 0 },
    lunas:          { type: Number, default: 0 },
    hutang:         { type: Number, default: 0 },
    lunasTanggal:   { type: Date, default: null },
    lunasOperator:  { type: String, default: '' },
    operator:       { type: String, default: '' },
    cetakBarcode:   { type: Boolean, default: false },
    updateHargaJual:{ type: Boolean, default: false },
  },
  { timestamps: true }
);

const TransaksiBeli: Model<ITransaksiBeli> =
  mongoose.models.TransaksiBeli ??
  mongoose.model<ITransaksiBeli>('TransaksiBeli', TransaksBeliSchema);

export default TransaksiBeli;
