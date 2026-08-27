import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReturnPembelian extends Document {
  refNo: string;
  tanggal: Date;
  barangId: string;
  namaBarang: string;
  satuan: string;
  satuanType: 'jual' | 'beli';
  isi: number;
  refBeli: string;
  tglBeli: Date | null;
  supplierId: string;
  supplierNama: string;
  qty: number;
  harsat: number;
  rupiah: number;
  alasan: string;
  operator: string;
  sudahKembali: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReturnPembelianSchema = new Schema<IReturnPembelian>(
  {
    refNo:       { type: String, required: true, unique: true, trim: true },
    tanggal:     { type: Date, required: true, default: Date.now },
    barangId:    { type: String, default: '' },
    namaBarang:  { type: String, default: '', trim: true },
    satuan:      { type: String, default: '', trim: true },
    satuanType:  { type: String, enum: ['jual', 'beli'], default: 'jual' },
    isi:         { type: Number, default: 1 },
    refBeli:     { type: String, default: '', trim: true },
    tglBeli:     { type: Date, default: null },
    supplierId:  { type: String, default: '' },
    supplierNama:{ type: String, default: '', trim: true },
    qty:         { type: Number, default: 0 },
    harsat:      { type: Number, default: 0 },
    rupiah:      { type: Number, default: 0 },
    alasan:      { type: String, default: '', trim: true },
    operator:    { type: String, default: '', trim: true },
    sudahKembali:{ type: Boolean, default: false },
  },
  { timestamps: true }
);

// ─── Index untuk sort riwayat ──────────────────────────────────────────────
ReturnPembelianSchema.index({ tanggal: -1, createdAt: -1 });

const ReturnPembelian: Model<IReturnPembelian> =
  mongoose.models.ReturnPembelian ??
  mongoose.model<IReturnPembelian>('ReturnPembelian', ReturnPembelianSchema);

export default ReturnPembelian;
