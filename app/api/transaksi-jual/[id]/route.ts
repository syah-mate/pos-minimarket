import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import TransaksiJual from '@/models/TransaksiJual';
import Barang from '@/models/Barang';
import Pelanggan from '@/models/Pelanggan';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;
  const doc = await TransaksiJual.findById(id).lean();
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(doc);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;
  const old = await TransaksiJual.findById(id);
  if (!old) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { items = [], pembayaran, grandTotal, pelangganId } = body;

  // Revert stok lama
  for (const item of old.items) {
    if (!item.barangId || !item.qty) continue;
    await Barang.findByIdAndUpdate(item.barangId, { $inc: { stok: item.qty } });
  }
  // Revert piutang lama
  if (old.pembayaran === 'Kredit' && old.pelangganId && old.grandTotal > 0) {
    await Pelanggan.findByIdAndUpdate(old.pelangganId, { $inc: { saldoPiutang: -old.grandTotal } });
  }

  const piutang = pembayaran === 'Kredit' ? grandTotal : 0;
  const updated = await TransaksiJual.findByIdAndUpdate(
    id, { ...body, piutang }, { new: true, runValidators: true }
  );

  // Apply stok baru
  for (const item of items) {
    if (!item.barangId || !item.qty) continue;
    await Barang.findByIdAndUpdate(item.barangId, { $inc: { stok: -item.qty } });
  }
  // Apply piutang baru
  if (pembayaran === 'Kredit' && pelangganId && grandTotal > 0) {
    await Pelanggan.findByIdAndUpdate(pelangganId, { $inc: { saldoPiutang: grandTotal } });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;
  const doc = await TransaksiJual.findById(id);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Revert stok
  for (const item of doc.items) {
    if (!item.barangId || !item.qty) continue;
    await Barang.findByIdAndUpdate(item.barangId, { $inc: { stok: item.qty } });
  }
  // Revert piutang
  if (doc.pembayaran === 'Kredit' && doc.pelangganId && doc.grandTotal > 0) {
    await Pelanggan.findByIdAndUpdate(doc.pelangganId, { $inc: { saldoPiutang: -doc.grandTotal } });
  }

  await TransaksiJual.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
