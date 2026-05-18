import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BayarHutang from '@/models/BayarHutang';
import TransaksiBeli from '@/models/TransaksiBeli';
import Supplier from '@/models/Supplier';
import Kas from '@/models/Kas';

async function generateRefNo(tanggal: Date): Promise<string> {
  const dd = String(tanggal.getDate()).padStart(2, '0');
  const mm = String(tanggal.getMonth() + 1).padStart(2, '0');
  const yy = String(tanggal.getFullYear()).slice(-2);
  const prefix = `BH-${dd}${mm}${yy}`;
  const count = await BayarHutang.countDocuments({ refNo: { $regex: `^${prefix}` } });
  const seq = String(count + 1).padStart(3, '0');
  return `${prefix}${seq}`;
}

export async function GET(req: NextRequest) {
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
      { refNo:        { $regex: q, $options: 'i' } },
      { supplierNama: { $regex: q, $options: 'i' } },
      { keterangan:   { $regex: q, $options: 'i' } },
    ];
  }
  const data = await BayarHutang.find(filter).sort({ tanggal: -1, createdAt: -1 }).lean();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const body = await req.json();
    const {
      tanggal,
      supplierId,
      kasId,
      items = [],
      totalBayar,
      operator,
      ...rest
    } = body;

    const tanggalDate = tanggal ? new Date(tanggal) : new Date();
    const refNo: string = body.refNo || (await generateRefNo(tanggalDate));

    const existing = await BayarHutang.findOne({ refNo });
    if (existing) {
      return NextResponse.json({ error: `No. Ref ${refNo} sudah ada.` }, { status: 400 });
    }

    // Create the record
    const doc = await BayarHutang.create({
      ...rest, refNo, tanggal: tanggalDate, supplierId, kasId, items, totalBayar, operator,
    });

    // Update each TransaksiBeli item
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

    // Decrease supplier saldoHutang
    if (supplierId && totalBayar > 0) {
      await Supplier.findByIdAndUpdate(supplierId, { $inc: { saldoHutang: -totalBayar } });
    }

    // Decrease kas saldo
    if (kasId && totalBayar > 0) {
      await Kas.findByIdAndUpdate(kasId, { $inc: { saldo: -totalBayar } });
    }

    return NextResponse.json(doc, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
