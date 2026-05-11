import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import TransaksiJual from '@/models/TransaksiJual';
import Barang from '@/models/Barang';
import Pelanggan from '@/models/Pelanggan';

async function generateRefNo(tanggal: Date): Promise<string> {
  const dd = String(tanggal.getDate()).padStart(2, '0');
  const mm = String(tanggal.getMonth() + 1).padStart(2, '0');
  const yy = String(tanggal.getFullYear()).slice(-2);
  const prefix = `JL-${dd}${mm}${yy}`;
  const count = await TransaksiJual.countDocuments({ refNo: { $regex: `^${prefix}` } });
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
  const filter = q
    ? {
        $or: [
          { refNo:           { $regex: q, $options: 'i' } },
          { pelangganNama:   { $regex: q, $options: 'i' } },
          { pelangganKode:   { $regex: q, $options: 'i' } },
          { keterangan:      { $regex: q, $options: 'i' } },
        ],
      }
    : {};
  const data = await TransaksiJual.find(filter).sort({ tanggal: -1, createdAt: -1 }).lean();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const body = await req.json();
    const { items = [], pembayaran, grandTotal, pelangganId, tanggal, ...rest } = body;

    const tanggalDate = tanggal ? new Date(tanggal) : new Date();
    const refNo: string = body.refNo || (await generateRefNo(tanggalDate));

    const existing = await TransaksiJual.findOne({ refNo });
    if (existing) {
      return NextResponse.json({ error: `No. Faktur ${refNo} sudah ada.` }, { status: 400 });
    }

    const piutang = pembayaran === 'Kredit' ? grandTotal : 0;

    const transaksi = await TransaksiJual.create({
      ...rest, refNo, tanggal: tanggalDate, pembayaran,
      grandTotal: grandTotal || 0, piutang, items,
      pelangganId: pelangganId || '',
    });

    // Kurangi stok barang
    for (const item of items) {
      if (!item.barangId || !item.qty) continue;
      await Barang.findByIdAndUpdate(item.barangId, { $inc: { stok: -item.qty } });
    }

    // Update saldo piutang pelanggan jika Kredit
    if (pembayaran === 'Kredit' && pelangganId && grandTotal > 0) {
      await Pelanggan.findByIdAndUpdate(pelangganId, { $inc: { saldoPiutang: grandTotal } });
    }

    return NextResponse.json(transaksi, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
