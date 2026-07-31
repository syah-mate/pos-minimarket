import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import TerimaPiutang from '@/models/TerimaPiutang';
import TransaksiJual from '@/models/TransaksiJual';
import Pelanggan from '@/models/Pelanggan';
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
  const doc = await TerimaPiutang.findById(id).lean();
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
    const existing = await TerimaPiutang.findById(id);
    if (!existing) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });

    const body = await req.json();
    const { tanggal, pelangganId, kasId, items = [], totalTerima, operator, ...rest } = body;
    const tanggalDate = tanggal ? new Date(tanggal) : new Date();

    // Revert old payments
    for (const item of existing.items) {
      if (!item.angsuran || item.angsuran <= 0) continue;
      const jual = await TransaksiJual.findById(item.transaksiJualId);
      if (!jual) continue;
      jual.lunasPiutang = Math.max(0, (jual.lunasPiutang || 0) - item.angsuran);
      jual.piutang = (jual.piutang || 0) + item.angsuran;
      jual.piutangLunasTanggal = null;
      jual.piutangLunasOperator = '';
      await jual.save();
    }
    if (existing.pelangganId && existing.totalTerima > 0) {
      await Pelanggan.findByIdAndUpdate(existing.pelangganId, { $inc: { saldoPiutang: existing.totalTerima } });
    }
    if (existing.kasId && existing.totalTerima > 0) {
      await Kas.findByIdAndUpdate(existing.kasId, { $inc: { saldo: -existing.totalTerima } });
    }

    // Apply new payments
    for (const item of items) {
      if (!item.angsuran || item.angsuran <= 0) continue;
      const jual = await TransaksiJual.findById(item.transaksiJualId);
      if (!jual) continue;
      jual.lunasPiutang = (jual.lunasPiutang || 0) + item.angsuran;
      jual.piutang = Math.max(0, (jual.piutang || 0) - item.angsuran);
      if (jual.piutang <= 0) {
        jual.piutangLunasTanggal = tanggalDate;
        jual.piutangLunasOperator = operator || '';
      }
      await jual.save();
    }
    if (pelangganId && totalTerima > 0) {
      await Pelanggan.findByIdAndUpdate(pelangganId, { $inc: { saldoPiutang: -totalTerima } });
    }
    if (kasId && totalTerima > 0) {
      await Kas.findByIdAndUpdate(kasId, { $inc: { saldo: totalTerima } });
    }

    const updated = await TerimaPiutang.findByIdAndUpdate(
      id,
      { ...rest, tanggal: tanggalDate, pelangganId, kasId, items, totalTerima, operator },
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
    const doc = await TerimaPiutang.findById(id);
    if (!doc) return NextResponse.json({ error: 'Tidak ditemukan' }, { status: 404 });

    // Revert payments
    for (const item of doc.items) {
      if (!item.angsuran || item.angsuran <= 0) continue;
      const jual = await TransaksiJual.findById(item.transaksiJualId);
      if (!jual) continue;
      jual.lunasPiutang = Math.max(0, (jual.lunasPiutang || 0) - item.angsuran);
      jual.piutang = (jual.piutang || 0) + item.angsuran;
      jual.piutangLunasTanggal = null;
      jual.piutangLunasOperator = '';
      await jual.save();
    }
    if (doc.pelangganId && doc.totalTerima > 0) {
      await Pelanggan.findByIdAndUpdate(doc.pelangganId, { $inc: { saldoPiutang: doc.totalTerima } });
    }
    if (doc.kasId && doc.totalTerima > 0) {
      await Kas.findByIdAndUpdate(doc.kasId, { $inc: { saldo: -doc.totalTerima } });
    }

    await TerimaPiutang.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
