import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Barang from '@/models/Barang';
import Kas from '@/models/Kas';
import { requireRole } from '@/lib/authz';

/**
 * Snapshot katalog untuk kasir offline (Electron). Diunduh utuh — bukan
 * inkremental — karena barang dihapus permanen (findByIdAndDelete), sehingga
 * `updatedAt` tidak bisa memberi tahu barang mana yang sudah hilang.
 */
export async function GET() {
  const auth = await requireRole(['admin', 'kasir']);
  if (!auth.ok) return auth.response;

  await connectDB();
  const [barang, kasList] = await Promise.all([
    Barang.find({})
      .select('_id kode barcode nama satuanJual stok lokasi diskon hargaJual hargaJualToko')
      .lean(),
    Kas.find({}).select('_id kode nama').lean(),
  ]);
  const kas = kasList.find((k) => k.nama?.toUpperCase() === 'KAS TOKO') ?? kasList[0] ?? null;

  return NextResponse.json({ barang, kas, generatedAt: new Date().toISOString() });
}
