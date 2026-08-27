import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import TerimaPiutang from '@/models/TerimaPiutang';
import TransaksiJual from '@/models/TransaksiJual';
import Pelanggan from '@/models/Pelanggan';
import Kas from '@/models/Kas';
import { requireRole } from '@/lib/authz';
import { parsePaging, pagedJson } from '@/lib/paging';

const MAX_RETRY_REFNO = 3;

async function generateRefNo(tanggal: Date): Promise<string> {
  const dd = String(tanggal.getDate()).padStart(2, '0');
  const mm = String(tanggal.getMonth() + 1).padStart(2, '0');
  const yy = String(tanggal.getFullYear()).slice(-2);
  const prefix = `R33-${dd}${mm}${yy}`;
  const count = await TerimaPiutang.countDocuments({ refNo: { $regex: `^${prefix}` } });
  const seq = String(count + 1).padStart(3, '0');
  return `${prefix}${seq}`;
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin', 'kasir']);
  if (!auth.ok) return auth.response;

  await connectDB();
  const { searchParams } = new URL(req.url);

  if (searchParams.get('action') === 'next-ref') {
    const dateStr = searchParams.get('date');
    const date = dateStr ? new Date(dateStr) : new Date();
    const refNo = await generateRefNo(date);
    return NextResponse.json({ refNo });
  }

  const q = searchParams.get('q') ?? '';
  const filter: Record<string, unknown> = {};
  if (q) {
    filter.$or = [
      { refNo:          { $regex: q, $options: 'i' } },
      { pelangganNama:  { $regex: q, $options: 'i' } },
      { pelangganKode:  { $regex: q, $options: 'i' } },
      { keterangan:     { $regex: q, $options: 'i' } },
    ];
  }
  return pagedJson(TerimaPiutang, filter, parsePaging(searchParams), {
    sort: { tanggal: -1, createdAt: -1 },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin', 'kasir']);
  if (!auth.ok) return auth.response;

  await connectDB();
  const body = await req.json();
  const { tanggal, pelangganId, kasId, items = [], totalTerima, operator, ...rest } = body;
  const tanggalDate = tanggal ? new Date(tanggal) : new Date();

  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_RETRY_REFNO; attempt++) {
    const mongoSession = await mongoose.startSession();
    try {
      const result = await mongoSession.withTransaction(async (session) => {
        const refNo: string = body.refNo || (await generateRefNo(tanggalDate));

        const existing = await TerimaPiutang.findOne({ refNo }).session(session);
        if (existing) throw { code: 11000, keyPattern: { refNo: 1 } };

        const [doc] = await TerimaPiutang.create([{
          ...rest, refNo, tanggal: tanggalDate, pelangganId, kasId, items, totalTerima, operator,
        }], { session });

        // Update each TransaksiJual item
        for (const item of items) {
          if (!item.angsuran || item.angsuran <= 0) continue;
          const jual = await TransaksiJual.findById(item.transaksiJualId).session(session);
          if (!jual) continue;
          jual.lunasPiutang = (jual.lunasPiutang || 0) + item.angsuran;
          jual.piutang = Math.max(0, (jual.piutang || 0) - item.angsuran);
          if (jual.piutang <= 0) {
            jual.piutangLunasTanggal = tanggalDate;
            jual.piutangLunasOperator = operator || '';
          }
          await jual.save({ session });
        }

        // Decrease pelanggan saldoPiutang
        if (pelangganId && totalTerima > 0) {
          await Pelanggan.findByIdAndUpdate(
            pelangganId,
            { $inc: { saldoPiutang: -totalTerima } },
            { session }
          );
        }

        // Increase kas saldo (money comes in)
        if (kasId && totalTerima > 0) {
          await Kas.findByIdAndUpdate(
            kasId,
            { $inc: { saldo: totalTerima } },
            { session }
          );
        }

        return doc;
      });

      return NextResponse.json(result, { status: 201 });
    } catch (err: unknown) {
      lastError = err;
      const isMongoErr = (err as { code?: number; keyPattern?: Record<string, unknown> });
      if (isMongoErr?.code === 11000 && isMongoErr?.keyPattern && 'refNo' in (isMongoErr.keyPattern || {})) {
        if (attempt < MAX_RETRY_REFNO - 1) continue;
      }
      const msg = err instanceof Error ? err.message : 'Server error';
      return NextResponse.json({ error: msg }, { status: 500 });
    } finally {
      await mongoSession.endSession();
    }
  }

  const msg = lastError instanceof Error ? lastError.message : 'Server error';
  return NextResponse.json({ error: msg }, { status: 500 });
}
