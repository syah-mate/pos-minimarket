import mongoose, { Schema, Document } from 'mongoose';

export interface IKaryawan extends Document {
  kode: string;
  nama: string;
  jabatan: string;
}

const KaryawanSchema = new Schema<IKaryawan>(
  {
    kode:    { type: String, required: true, unique: true, uppercase: true, trim: true },
    nama:    { type: String, required: true, trim: true },
    jabatan: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.Karyawan ?? mongoose.model<IKaryawan>('Karyawan', KaryawanSchema);
