import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ReturnPenjualan from '@/models/ReturnPenjualan';
import Barang from '@/models/Barang';
import Pelanggan from '@/models/Pelanggan';
import { requireRole } from '@/lib/authz';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['admin', 'kasir']);
  if (!auth.ok) return auth.response;

  await connectDB();
  const { id } = await params;
  const doc = await ReturnPenjualan.findById(id).lean();
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
  const old = await ReturnPenjualan.findById(id);
  if (!old) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { items = [], pelangganId, totalPotongPiutang = 0 } = body;

  // Revert stok lama
  for (const item of old.items) {
    if (!item.barangId || !item.qty) continue;
    await Barang.findByIdAndUpdate(item.barangId, { $inc: { stok: -item.qty } });
  }
  // Revert piutang lama
  if (old.pelangganId && old.totalPotongPiutang > 0) {
    await Pelanggan.findByIdAndUpdate(old.pelangganId, { $inc: { saldoPiutang: old.totalPotongPiutang } });
  }

  const updated = await ReturnPenjualan.findByIdAndUpdate(id, body, { new: true, runValidators: true });

  // Apply stok baru
  for (const item of items) {
    if (!item.barangId || !item.qty) continue;
    await Barang.findByIdAndUpdate(item.barangId, { $inc: { stok: item.qty } });
  }
  // Apply piutang baru
  if (pelangganId && totalPotongPiutang > 0) {
    await Pelanggan.findByIdAndUpdate(pelangganId, { $inc: { saldoPiutang: -totalPotongPiutang } });
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
  const doc = await ReturnPenjualan.findById(id);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Revert stok
  for (const item of doc.items) {
    if (!item.barangId || !item.qty) continue;
    await Barang.findByIdAndUpdate(item.barangId, { $inc: { stok: -item.qty } });
  }
  // Revert piutang
  if (doc.pelangganId && doc.totalPotongPiutang > 0) {
    await Pelanggan.findByIdAndUpdate(doc.pelangganId, { $inc: { saldoPiutang: doc.totalPotongPiutang } });
  }

  await ReturnPenjualan.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
