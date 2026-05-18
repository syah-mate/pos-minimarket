import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ReturnPenjualan from '@/models/ReturnPenjualan';
import Barang from '@/models/Barang';
import Pelanggan from '@/models/Pelanggan';

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
  const data = await ReturnPenjualan.find(filter).sort({ tanggal: -1, createdAt: -1 }).lean();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const body = await req.json();
    const { items = [], pelangganId, tanggal, totalKembaliUang = 0, totalPotongPiutang = 0, totalRtr = 0, ...rest } = body;

    const tanggalDate = tanggal ? new Date(tanggal) : new Date();
    const refNo: string = body.refNo || (await generateRefNo(tanggalDate));

    const existing = await ReturnPenjualan.findOne({ refNo });
    if (existing) {
      return NextResponse.json({ error: `No. Faktur ${refNo} sudah ada.` }, { status: 400 });
    }

    const doc = await ReturnPenjualan.create({
      ...rest, refNo, tanggal: tanggalDate, items,
      pelangganId: pelangganId || '',
      totalKembaliUang, totalPotongPiutang, totalRtr,
    });

    // Tambah stok barang (barang dikembalikan)
    for (const item of items) {
      if (!item.barangId || !item.qty) continue;
      await Barang.findByIdAndUpdate(item.barangId, { $inc: { stok: item.qty } });
    }

    // Potong piutang pelanggan jika ada item potong_piutang
    if (pelangganId && totalPotongPiutang > 0) {
      await Pelanggan.findByIdAndUpdate(pelangganId, { $inc: { saldoPiutang: -totalPotongPiutang } });
    }

    return NextResponse.json(doc, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
