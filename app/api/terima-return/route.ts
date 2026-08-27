import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import TerimaReturn from '@/models/TerimaReturn';
import Barang from '@/models/Barang';
import { requireRole } from '@/lib/authz';
import { parsePaging, pagedJson } from '@/lib/paging';

const MAX_RETRY_REFNO = 3;

async function generateRefNo(tanggal: Date): Promise<string> {
  const dd = String(tanggal.getDate()).padStart(2, '0');
  const mm = String(tanggal.getMonth() + 1).padStart(2, '0');
  const yy = String(tanggal.getFullYear()).slice(-2);
  const prefix = `R23-${dd}${mm}${yy}`;
  const count = await TerimaReturn.countDocuments({ refNo: { $regex: `^${prefix}` } });
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
      { refNo:      { $regex: q, $options: 'i' } },
      { namaBarang: { $regex: q, $options: 'i' } },
      { refReturn:  { $regex: q, $options: 'i' } },
    ];
  }
  return pagedJson(TerimaReturn, filter, parsePaging(searchParams), {
    sort: { tanggal: -1, createdAt: -1 },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin', 'kasir']);
  if (!auth.ok) return auth.response;

  await connectDB();
  const body = await req.json();
  const { barangId, qttyTerima, satuanType, isi = 1, tanggal, ...rest } = body;
  const tanggalDate = tanggal ? new Date(tanggal) : new Date();

  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_RETRY_REFNO; attempt++) {
    const mongoSession = await mongoose.startSession();
    try {
      const result = await mongoSession.withTransaction(async (session) => {
        const refNo: string = body.refNo || (await generateRefNo(tanggalDate));

        const existing = await TerimaReturn.findOne({ refNo }).session(session);
        if (existing) throw { code: 11000, keyPattern: { refNo: 1 } };

        const [doc] = await TerimaReturn.create([{
          ...rest, refNo, tanggal: tanggalDate, barangId, qttyTerima, satuanType, isi,
        }], { session });

        // Tambah stok
        if (barangId && qttyTerima > 0) {
          const inc = satuanType === 'beli' ? qttyTerima * (isi || 1) : qttyTerima;
          await Barang.findByIdAndUpdate(barangId, { $inc: { stok: inc } }, { session });
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
