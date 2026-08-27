import mongoose, { Schema, Document } from 'mongoose';

export interface IJasa extends Document {
  kode: string;
  nama: string;
  hargaJual: number;
}

const JasaSchema = new Schema<IJasa>(
  {
    kode:      { type: String, required: true, unique: true, uppercase: true, trim: true },
    nama:      { type: String, required: true, trim: true },
    hargaJual: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true }
);

// ─── Index untuk sort default ──────────────────────────────────────────────
JasaSchema.index({ nama: 1 });

export default mongoose.models.Jasa ?? mongoose.model<IJasa>('Jasa', JasaSchema);
