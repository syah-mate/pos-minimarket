import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import ReturnPenjualan from '@/models/ReturnPenjualan';
import Barang from '@/models/Barang';
import Pelanggan from '@/models/Pelanggan';
import { requireRole } from '@/lib/authz';
import { parsePaging, pagedJson } from '@/lib/paging';

const MAX_RETRY_REFNO = 3;

async function generateRefNo(tanggal: Date): Promise<string> {
  const dd = String(tanggal.getDate()).padStart(2, '0');
  const mm = String(tanggal.getMonth() + 1).padStart(2, '0');
  const yy = String(tanggal.getFullYear()).slice(-2);
  const prefix = `R44-${dd}${mm}${yy}`;
  const count = await ReturnPenjualan.countDocuments({ refNo: { $regex: `^${prefix}` } });
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
  const pelangganId = searchParams.get('pelangganId') ?? '';
  const filter: Record<string, unknown> = {};
  if (pelangganId) filter.pelangganId = pelangganId;
  if (q) {
    filter.$or = [
      { refNo:         { $regex: q, $options: 'i' } },
      { pelangganNama: { $regex: q, $options: 'i' } },
      { pelangganKode: { $regex: q, $options: 'i' } },
    ];
  }
  return pagedJson(ReturnPenjualan, filter, parsePaging(searchParams), {
    sort: { tanggal: -1, createdAt: -1 },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin', 'kasir']);
  if (!auth.ok) return auth.response;

  await connectDB();
  const body = await req.json();
  const { items = [], pelangganId, tanggal, totalKembaliUang = 0, totalPotongPiutang = 0, totalRtr = 0, ...rest } = body;
  const tanggalDate = tanggal ? new Date(tanggal) : new Date();

  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_RETRY_REFNO; attempt++) {
    const mongoSession = await mongoose.startSession();
    try {
      const result = await mongoSession.withTransaction(async (session) => {
        const refNo: string = body.refNo || (await generateRefNo(tanggalDate));

        const existing = await ReturnPenjualan.findOne({ refNo }).session(session);
        if (existing) throw { code: 11000, keyPattern: { refNo: 1 } };

        const [doc] = await ReturnPenjualan.create([{
          ...rest, refNo, tanggal: tanggalDate, items,
          pelangganId: pelangganId || '',
          totalKembaliUang, totalPotongPiutang, totalRtr,
        }], { session });

        // Tambah stok barang (barang dikembalikan)
        for (const item of items) {
          if (!item.barangId || !item.qty) continue;
          await Barang.findByIdAndUpdate(
            item.barangId,
            { $inc: { stok: item.qty } },
            { session }
          );
        }

        // Potong piutang pelanggan jika ada item potong_piutang
        if (pelangganId && totalPotongPiutang > 0) {
          await Pelanggan.findByIdAndUpdate(
            pelangganId,
            { $inc: { saldoPiutang: -totalPotongPiutang } },
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
      const message = err instanceof Error ? err.message : 'Server error';
      return NextResponse.json({ error: message }, { status: 500 });
    } finally {
      await mongoSession.endSession();
    }
  }

  const message = lastError instanceof Error ? lastError.message : 'Server error';
  return NextResponse.json({ error: message }, { status: 500 });
}
