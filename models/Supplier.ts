import mongoose, { Schema, Document } from 'mongoose';

export interface ISupplier extends Document {
  kode: string;
  nama: string;
  alamat: string;
  kota: string;
  telp: string;
  fax: string;
  email: string;
  saldoHutang: number;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    kode:        { type: String, required: true, unique: true, uppercase: true, trim: true },
    nama:        { type: String, required: true, trim: true },
    alamat:      { type: String, default: '', trim: true },
    kota:        { type: String, default: '', trim: true },
    telp:        { type: String, default: '', trim: true },
    fax:         { type: String, default: '', trim: true },
    email:       { type: String, default: '', trim: true, lowercase: true },
    saldoHutang: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Supplier ?? mongoose.model<ISupplier>('Supplier', SupplierSchema);
