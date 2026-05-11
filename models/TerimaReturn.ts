import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITerimaReturn extends Document {
  refNo: string;
  tanggal: Date;
  barangId: string;
  namaBarang: string;
  satuan: string;
  satuanType: 'jual' | 'beli';
  isi: number;
  refReturn: string;
  tglReturn: Date | null;
  snLama: string;
  qttyTerima: number;
  keterangan: string;
  snBaru: string;
  operator: string;
  createdAt: Date;
  updatedAt: Date;
}

const TerimaReturnSchema = new Schema<ITerimaReturn>(
  {
    refNo:      { type: String, required: true, unique: true, trim: true },
    tanggal:    { type: Date, required: true, default: Date.now },
    barangId:   { type: String, default: '' },
    namaBarang: { type: String, default: '', trim: true },
    satuan:     { type: String, default: '', trim: true },
    satuanType: { type: String, enum: ['jual', 'beli'], default: 'jual' },
    isi:        { type: Number, default: 1 },
    refReturn:  { type: String, default: '', trim: true },
    tglReturn:  { type: Date, default: null },
    snLama:     { type: String, default: '', trim: true },
    qttyTerima: { type: Number, default: 0 },
    keterangan: { type: String, default: '', trim: true },
    snBaru:     { type: String, default: '', trim: true },
    operator:   { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

const TerimaReturn: Model<ITerimaReturn> =
  mongoose.models.TerimaReturn ??
  mongoose.model<ITerimaReturn>('TerimaReturn', TerimaReturnSchema);

export default TerimaReturn;
