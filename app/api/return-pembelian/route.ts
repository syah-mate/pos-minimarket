import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import ReturnPembelian from '@/models/ReturnPembelian';
import Barang from '@/models/Barang';
import { requireRole } from '@/lib/authz';

const MAX_RETRY_REFNO = 3;

async function generateRefNo(tanggal: Date): Promise<string> {
  const dd = String(tanggal.getDate()).padStart(2, '0');
  const mm = String(tanggal.getMonth() + 1).padStart(2, '0');
  const yy = String(tanggal.getFullYear()).slice(-2);
  const prefix = `R22-${dd}${mm}${yy}`;
  const count = await ReturnPembelian.countDocuments({ refNo: { $regex: `^${prefix}` } });
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
  const belumKembali = searchParams.get('belumKembali') === '1';
  const barangId = searchParams.get('barangId') ?? '';
  const refBeli = searchParams.get('refBeli') ?? '';
  const supplierIdFilter = searchParams.get('supplierId') ?? '';
  const filter: Record<string, unknown> = {};
  if (belumKembali) filter.sudahKembali = false;
  if (barangId) filter.barangId = barangId;
  if (refBeli) filter.refBeli = refBeli;
  if (supplierIdFilter) filter.supplierId = supplierIdFilter;
  if (q) {
    filter.$or = [
      { refNo:      { $regex: q, $options: 'i' } },
      { namaBarang: { $regex: q, $options: 'i' } },
      { refBeli:    { $regex: q, $options: 'i' } },
    ];
  }
  const data = await ReturnPembelian.find(filter).sort({ tanggal: -1, createdAt: -1 }).lean();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin']);
  if (!auth.ok) return auth.response;

  await connectDB();
  const body = await req.json();
  const { barangId, qty, satuanType, isi = 1, tanggal, ...rest } = body;
  const tanggalDate = tanggal ? new Date(tanggal) : new Date();

  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_RETRY_REFNO; attempt++) {
    const mongoSession = await mongoose.startSession();
    try {
      const result = await mongoSession.withTransaction(async (session) => {
        const refNo: string = body.refNo || (await generateRefNo(tanggalDate));

        const existing = await ReturnPembelian.findOne({ refNo }).session(session);
        if (existing) throw { code: 11000, keyPattern: { refNo: 1 } };

        // Validate stock: return pembelian mengurangi stok
        if (barangId && qty > 0) {
          const dec = satuanType === 'beli' ? qty * (isi || 1) : qty;
          const barang = await Barang.findById(barangId).session(session);
          if (!barang) throw new Error(`Barang dengan ID ${barangId} tidak ditemukan`);
          if (barang.stok < dec) {
            throw new Error(
              `Stok ${barang.nama} tidak cukup (tersisa ${barang.stok}, dibutuhkan ${dec})`
            );
          }
        }

        const [doc] = await ReturnPembelian.create([{
          ...rest, refNo, tanggal: tanggalDate, barangId, qty, satuanType, isi,
        }], { session });

        // Kurangi stok
        if (barangId && qty > 0) {
          const dec = satuanType === 'beli' ? qty * (isi || 1) : qty;
          await Barang.findByIdAndUpdate(barangId, { $inc: { stok: -dec } }, { session });
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
