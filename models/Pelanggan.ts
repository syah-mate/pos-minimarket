import mongoose, { Schema, Document } from 'mongoose';

export interface IPelanggan extends Document {
  kode: string;
  nama: string;
  alamat: string;
  telp: string;
  tglLahir?: Date;
  pekerjaan: string;
  maxPiutang: number;
  saldoPiutang: number;
  diskonPenjualan: number;
  noNpwp: string;
}

const PelangganSchema = new Schema<IPelanggan>(
  {
    kode:            { type: String, required: true, unique: true, uppercase: true, trim: true },
    nama:            { type: String, required: true, trim: true },
    alamat:          { type: String, default: '', trim: true },
    telp:            { type: String, default: '', trim: true },
    tglLahir:        { type: Date },
    pekerjaan:       { type: String, default: '', trim: true },
    maxPiutang:      { type: Number, default: 0, min: 0 },
    saldoPiutang:    { type: Number, default: 0 },
    diskonPenjualan: { type: Number, default: 0, min: 0, max: 100 },
    noNpwp:          { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.Pelanggan ?? mongoose.model<IPelanggan>('Pelanggan', PelangganSchema);
