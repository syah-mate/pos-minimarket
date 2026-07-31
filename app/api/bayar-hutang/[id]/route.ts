import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BayarHutang from '@/models/BayarHutang';
import TransaksiBeli from '@/models/TransaksiBeli';
import Supplier from '@/models/Supplier';
import Kas from '@/models/Kas';
import { requireRole } from '@/lib/authz';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['admin', 'kasir']);
  if (!auth.ok) return auth.response;

  await connectDB();
  const { id } = await params;
  const doc = await BayarHutang.findById(id).lean();
  if (!doc) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });
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
  try {
    const existing = await BayarHutang.findById(id);
    if (!existing) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });

    const body = await req.json();
    const { tanggal, supplierId, kasId, items = [], totalBayar, operator, ...rest } = body;
    const tanggalDate = tanggal ? new Date(tanggal) : new Date();

    // Revert old payments
    for (const item of existing.items) {
      if (!item.angsuran || item.angsuran <= 0) continue;
      const beli = await TransaksiBeli.findById(item.transaksiBeliId);
      if (!beli) continue;
      beli.lunas = Math.max(0, (beli.lunas || 0) - item.angsuran);
      beli.hutang = (beli.hutang || 0) + item.angsuran;
      beli.lunasTanggal = null;
      beli.lunasOperator = '';
      await beli.save();
    }
    if (existing.supplierId && existing.totalBayar > 0) {
      await Supplier.findByIdAndUpdate(existing.supplierId, { $inc: { saldoHutang: existing.totalBayar } });
    }
    if (existing.kasId && existing.totalBayar > 0) {
      await Kas.findByIdAndUpdate(existing.kasId, { $inc: { saldo: existing.totalBayar } });
    }

    // Apply new payments
    for (const item of items) {
      if (!item.angsuran || item.angsuran <= 0) continue;
      const beli = await TransaksiBeli.findById(item.transaksiBeliId);
      if (!beli) continue;
      beli.lunas = (beli.lunas || 0) + item.angsuran;
      beli.hutang = Math.max(0, (beli.hutang || 0) - item.angsuran);
      if (beli.hutang <= 0) {
        beli.lunasTanggal = tanggalDate;
        beli.lunasOperator = operator || '';
      }
      await beli.save();
    }
    if (supplierId && totalBayar > 0) {
      await Supplier.findByIdAndUpdate(supplierId, { $inc: { saldoHutang: -totalBayar } });
    }
    if (kasId && totalBayar > 0) {
      await Kas.findByIdAndUpdate(kasId, { $inc: { saldo: -totalBayar } });
    }

    // Update record
    const updated = await BayarHutang.findByIdAndUpdate(
      id,
      { ...rest, tanggal: tanggalDate, supplierId, kasId, items, totalBayar, operator },
      { new: true }
    );
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['admin']);
  if (!auth.ok) return auth.response;

  await connectDB();
  const { id } = await params;
  try {
    const doc = await BayarHutang.findById(id);
    if (!doc) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });

    // Revert payments
    for (const item of doc.items) {
      if (!item.angsuran || item.angsuran <= 0) continue;
      const beli = await TransaksiBeli.findById(item.transaksiBeliId);
      if (!beli) continue;
      beli.lunas = Math.max(0, (beli.lunas || 0) - item.angsuran);
      beli.hutang = (beli.hutang || 0) + item.angsuran;
      beli.lunasTanggal = null;
      beli.lunasOperator = '';
      await beli.save();
    }
    if (doc.supplierId && doc.totalBayar > 0) {
      await Supplier.findByIdAndUpdate(doc.supplierId, { $inc: { saldoHutang: doc.totalBayar } });
    }
    if (doc.kasId && doc.totalBayar > 0) {
      await Kas.findByIdAndUpdate(doc.kasId, { $inc: { saldo: doc.totalBayar } });
    }

    await BayarHutang.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
