import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import TransaksiJual from '@/models/TransaksiJual';
import Barang from '@/models/Barang';
import Pelanggan from '@/models/Pelanggan';
import { requireRole } from '@/lib/authz';

const MAX_RETRY_REFNO = 3;

async function generateRefNo(tanggal: Date): Promise<string> {
  const dd = String(tanggal.getDate()).padStart(2, '0');
  const mm = String(tanggal.getMonth() + 1).padStart(2, '0');
  const yy = String(tanggal.getFullYear()).slice(-2);
  const prefix = `JL-${dd}${mm}${yy}`;
  const count = await TransaksiJual.countDocuments({ refNo: { $regex: `^${prefix}` } });
  const seq = String(count + 1).padStart(3, '0');
  return `${prefix}${seq}`;
}

async function generateRefNoWithRetry(tanggal: Date): Promise<string> {
  const refNo = await generateRefNo(tanggal);
  return refNo;
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
  const piutangOnly = searchParams.get('piutangOnly') === '1';
  const jenis = searchParams.get('jenis') ?? '';
  const filter: Record<string, unknown> = {};
  if (q) {
    filter.$or = [
      { refNo:           { $regex: q, $options: 'i' } },
      { pelangganNama:   { $regex: q, $options: 'i' } },
      { pelangganKode:   { $regex: q, $options: 'i' } },
      { keterangan:      { $regex: q, $options: 'i' } },
    ];
  }
  if (pelangganId) filter.pelangganId = pelangganId;
  if (jenis) filter.jenis = jenis;
  if (piutangOnly) {
    filter.pembayaran = { $ne: 'Cash' };
    filter.piutang = { $gt: 0 };
  }
  const data = await TransaksiJual.find(filter).sort({ tanggal: -1, createdAt: -1 }).lean();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin', 'kasir']);
  if (!auth.ok) return auth.response;

  await connectDB();
  const body = await req.json();
  const { items = [], pembayaran, grandTotal, pelangganId, tanggal, ...rest } = body;
  const tanggalDate = tanggal ? new Date(tanggal) : new Date();

  // Retry loop for refNo collision
  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_RETRY_REFNO; attempt++) {
    const mongoSession = await mongoose.startSession();
    try {
      const result = await mongoSession.withTransaction(async (session) => {
        // Generate unique refNo
        const refNo: string = body.refNo
          ? body.refNo
          : await generateRefNoWithRetry(tanggalDate);

        const existing = await TransaksiJual.findOne({ refNo }).session(session);
        if (existing) {
          throw { code: 11000, keyPattern: { refNo: 1 } }; // simulate duplicate to trigger retry
        }

        const isKredit = pembayaran !== 'Cash';
        const piutang = isKredit ? grandTotal : 0;

        // Validate stock sebelum decrement
        for (const item of items) {
          if (!item.barangId || !item.qty) continue;
          const barang = await Barang.findById(item.barangId).session(session);
          if (!barang) {
            throw new Error(`Barang dengan ID ${item.barangId} tidak ditemukan`);
          }
          if (barang.stok < item.qty) {
            throw new Error(
              `Stok ${barang.nama} tidak cukup (tersisa ${barang.stok}, dibutuhkan ${item.qty})`
            );
          }
        }

        // Create transaksi
        const [transaksi] = await TransaksiJual.create([{
          ...rest, refNo, tanggal: tanggalDate, pembayaran,
          grandTotal: grandTotal || 0, piutang, items,
          pelangganId: pelangganId || '',
        }], { session });

        // Kurangi stok barang
        for (const item of items) {
          if (!item.barangId || !item.qty) continue;
          await Barang.findByIdAndUpdate(
            item.barangId,
            { $inc: { stok: -item.qty } },
            { session }
          );
        }

        // Update saldo piutang pelanggan jika Kredit
        if (isKredit && pelangganId && grandTotal > 0) {
          await Pelanggan.findByIdAndUpdate(
            pelangganId,
            { $inc: { saldoPiutang: grandTotal } },
            { session }
          );
        }

        return transaksi;
      });

      return NextResponse.json(result, { status: 201 });
    } catch (err: unknown) {
      lastError = err;
      // Check if it's a duplicate key error on refNo → retry
      const isMongoErr = (err as { code?: number; keyPattern?: Record<string, unknown> });
      if (
        isMongoErr?.code === 11000 &&
        isMongoErr?.keyPattern &&
        'refNo' in (isMongoErr.keyPattern || {})
      ) {
        if (attempt < MAX_RETRY_REFNO - 1) continue; // retry
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
