import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ReturnPembelian from '@/models/ReturnPembelian';
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
  const doc = await ReturnPembelian.findById(id).lean();
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
  const old = await ReturnPembelian.findById(id);
  if (!old) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { barangId, qty, satuanType, isi = 1 } = body;

  // Revert stok lama
  if (old.barangId && old.qty > 0) {
    const dec = old.satuanType === 'beli' ? old.qty * (old.isi || 1) : old.qty;
    await Barang.findByIdAndUpdate(old.barangId, { $inc: { stok: dec } });
  }

  const updated = await ReturnPembelian.findByIdAndUpdate(id, body, { new: true, runValidators: true });

  // Apply stok baru
  if (barangId && qty > 0) {
    const dec = satuanType === 'beli' ? qty * (isi || 1) : qty;
    await Barang.findByIdAndUpdate(barangId, { $inc: { stok: -dec } });
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
  const doc = await ReturnPembelian.findById(id);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Revert stok
  if (doc.barangId && doc.qty > 0) {
    const dec = doc.satuanType === 'beli' ? doc.qty * (doc.isi || 1) : doc.qty;
    await Barang.findByIdAndUpdate(doc.barangId, { $inc: { stok: dec } });
  }

  await ReturnPembelian.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
