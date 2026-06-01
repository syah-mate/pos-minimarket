import mongoose, { Schema, Document } from 'mongoose';

export interface ICabang extends Document {
  kodeCabang: string;
  namaCabang: string;
  alamatCabang: string;
  maxPiutang: number;
  saldoPiutang: number;
}

const CabangSchema = new Schema<ICabang>(
  {
    kodeCabang:   { type: String, required: true, unique: true, uppercase: true, trim: true },
    namaCabang:   { type: String, required: true, trim: true },
    alamatCabang: { type: String, default: '', trim: true },
    maxPiutang:   { type: Number, default: 0, min: 0 },
    saldoPiutang: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Cabang ?? mongoose.model<ICabang>('Cabang', CabangSchema);
