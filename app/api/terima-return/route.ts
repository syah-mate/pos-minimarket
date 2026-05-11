import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import TerimaReturn from '@/models/TerimaReturn';
import Barang from '@/models/Barang';

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
  const data = await TerimaReturn.find(filter).sort({ tanggal: -1, createdAt: -1 }).lean();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const body = await req.json();
    const { barangId, qttyTerima, satuanType, isi = 1, tanggal, ...rest } = body;

    const tanggalDate = tanggal ? new Date(tanggal) : new Date();
    const refNo: string = body.refNo || (await generateRefNo(tanggalDate));

    const existing = await TerimaReturn.findOne({ refNo });
    if (existing) {
      return NextResponse.json({ error: `No. Ref ${refNo} sudah ada.` }, { status: 400 });
    }

    const doc = await TerimaReturn.create({
      ...rest, refNo, tanggal: tanggalDate, barangId, qttyTerima, satuanType, isi,
    });

    // Tambah stok: jika satuan beli, tambah qttyTerima * isi; jika jual, tambah qttyTerima
    if (barangId && qttyTerima > 0) {
      const inc = satuanType === 'beli' ? qttyTerima * (isi || 1) : qttyTerima;
      await Barang.findByIdAndUpdate(barangId, { $inc: { stok: inc } });
    }

    return NextResponse.json(doc, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
