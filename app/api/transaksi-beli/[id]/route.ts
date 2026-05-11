import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import TransaksiBeli from '@/models/TransaksiBeli';
import Barang from '@/models/Barang';
import Supplier from '@/models/Supplier';

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;
  const doc = await TransaksiBeli.findById(id).lean();
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(doc);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;
  const old = await TransaksiBeli.findById(id);
  if (!old) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const { items = [], updateHargaJual, supplierId, pembayaran, grandTotal } = body;

  // Revert stok dari items lama
  for (const item of old.items) {
    if (!item.barangId) continue;
    const stokKurang = item.satuanType === 'beli' ? item.qty * (item.isi || 1) : item.qty;
    await Barang.findByIdAndUpdate(item.barangId, { $inc: { stok: -stokKurang } });
  }

  // Revert saldo hutang lama
  if (old.pembayaran === 'Tempo' && old.supplierId && old.grandTotal > 0) {
    await Supplier.findByIdAndUpdate(old.supplierId, { $inc: { saldoHutang: -old.grandTotal } });
  }

  const lunas = pembayaran === 'Cash' ? grandTotal : 0;
  const hutang = pembayaran === 'Tempo' ? grandTotal : 0;

  const updated = await TransaksiBeli.findByIdAndUpdate(
    id,
    { ...body, lunas, hutang },
    { new: true, runValidators: true }
  );

  // Apply stok baru
  for (const item of items) {
    if (!item.barangId) continue;
    const stokTambah = item.satuanType === 'beli' ? item.qty * (item.isi || 1) : item.qty;
    const updateOps: Record<string, unknown> = { $inc: { stok: stokTambah } };
    if (updateHargaJual && item.hgaToko > 0) {
      updateOps.$set = { hargaJual: item.hgaToko };
    }
    await Barang.findByIdAndUpdate(item.barangId, updateOps);
  }

  // Apply saldo hutang baru
  if (pembayaran === 'Tempo' && supplierId && grandTotal > 0) {
    await Supplier.findByIdAndUpdate(supplierId, { $inc: { saldoHutang: grandTotal } });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDB();
  const { id } = await params;
  const doc = await TransaksiBeli.findById(id);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Revert stok barang
  for (const item of doc.items) {
    if (!item.barangId) continue;
    const stokKurang =
      item.satuanType === 'beli'
        ? item.qty * (item.isi || 1)
        : item.qty;
    await Barang.findByIdAndUpdate(item.barangId, { $inc: { stok: -stokKurang } });
  }

  // Revert saldo hutang supplier jika Tempo
  if (doc.pembayaran === 'Tempo' && doc.supplierId && doc.grandTotal > 0) {
    await Supplier.findByIdAndUpdate(doc.supplierId, {
      $inc: { saldoHutang: -doc.grandTotal },
    });
  }

  await TransaksiBeli.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
