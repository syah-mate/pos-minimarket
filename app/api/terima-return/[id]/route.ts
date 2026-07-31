import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import TerimaReturn from '@/models/TerimaReturn';
import Barang from '@/models/Barang';
import { requireRole } from '@/lib/authz';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['admin', 'kasir']);
  if (!auth.ok) return auth.response;

  await connectDB();
  const { id } = await params;
  const doc = await TerimaReturn.findById(id).lean();
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(doc);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['admin']);
  if (!auth.ok) return auth.response;

  await connectDB();
  const { id } = await params;
  const old = await TerimaReturn.findById(id);
  if (!old) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { barangId, qttyTerima, satuanType, isi = 1 } = body;

  // Revert stok lama
  if (old.barangId && old.qttyTerima > 0) {
    const inc = old.satuanType === 'beli' ? old.qttyTerima * (old.isi || 1) : old.qttyTerima;
    await Barang.findByIdAndUpdate(old.barangId, { $inc: { stok: -inc } });
  }

  const updated = await TerimaReturn.findByIdAndUpdate(id, body, { new: true, runValidators: true });

  // Apply stok baru
  if (barangId && qttyTerima > 0) {
    const inc = satuanType === 'beli' ? qttyTerima * (isi || 1) : qttyTerima;
    await Barang.findByIdAndUpdate(barangId, { $inc: { stok: inc } });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['admin']);
  if (!auth.ok) return auth.response;

  await connectDB();
  const { id } = await params;
  const doc = await TerimaReturn.findById(id);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Revert stok
  if (doc.barangId && doc.qttyTerima > 0) {
    const inc = doc.satuanType === 'beli' ? doc.qttyTerima * (doc.isi || 1) : doc.qttyTerima;
    await Barang.findByIdAndUpdate(doc.barangId, { $inc: { stok: -inc } });
  }

  await TerimaReturn.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
