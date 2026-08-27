import mongoose, { Schema, Document } from 'mongoose';

export interface IKas extends Document {
  kode: string;
  nama: string;
  saldo: number;
}

const KasSchema = new Schema<IKas>(
  {
    kode:  { type: String, required: true, unique: true, uppercase: true, trim: true },
    nama:  { type: String, required: true, trim: true },
    saldo: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ─── Index untuk sort default ──────────────────────────────────────────────
KasSchema.index({ nama: 1 });

export default mongoose.models.Kas ?? mongoose.model<IKas>('Kas', KasSchema);
