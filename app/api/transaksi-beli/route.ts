import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import TransaksiBeli from '@/models/TransaksiBeli';
import Barang from '@/models/Barang';
import Supplier from '@/models/Supplier';

async function generateRefNo(tanggal: Date): Promise<string> {
  const dd = String(tanggal.getDate()).padStart(2, '0');
  const mm = String(tanggal.getMonth() + 1).padStart(2, '0');
  const yy = String(tanggal.getFullYear()).slice(-2);
  const prefix = `BL-${dd}${mm}${yy}`;
  const count = await TransaksiBeli.countDocuments({ refNo: { $regex: `^${prefix}` } });
  const seq = String(count + 1).padStart(3, '0');
  return `${prefix}${seq}`;
}

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);

  // Return next refNo
  if (searchParams.get('action') === 'next-ref') {
    const dateStr = searchParams.get('date');
    const date = dateStr ? new Date(dateStr) : new Date();
    const refNo = await generateRefNo(date);
    return NextResponse.json({ refNo });
  }

  const q = searchParams.get('q') ?? '';
  const barangId = searchParams.get('barangId') ?? '';
  const supplierId = searchParams.get('supplierId') ?? '';
  const hutangOnly = searchParams.get('hutangOnly') === '1';
  const filter: Record<string, unknown> = {};
  if (q) {
    filter.$or = [
      { refNo:        { $regex: q, $options: 'i' } },
      { supplierNama: { $regex: q, $options: 'i' } },
      { keterangan:   { $regex: q, $options: 'i' } },
    ];
  }
  if (barangId) {
    filter['items.barangId'] = barangId;
  }
  if (supplierId) {
    filter.supplierId = supplierId;
  }
  if (hutangOnly) {
    filter.pembayaran = 'Tempo';
    filter.hutang = { $gt: 0 };
  }
  const data = await TransaksiBeli.find(filter).sort({ tanggal: -1, createdAt: -1 }).lean();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const body = await req.json();
    const {
      items = [],
      updateHargaJual,
      tanggal,
      supplierId,
      pembayaran,
      grandTotal,
      disc,
      ppn,
      subtotal,
      ...rest
    } = body;

    const tanggalDate = tanggal ? new Date(tanggal) : new Date();
    const refNo: string = body.refNo || (await generateRefNo(tanggalDate));

    // Validate refNo uniqueness
    const existing = await TransaksiBeli.findOne({ refNo });
    if (existing) {
      return NextResponse.json({ error: `No. Faktur ${refNo} sudah ada.` }, { status: 400 });
    }

    const lunas = pembayaran === 'Cash' ? grandTotal : 0;
    const hutang = pembayaran !== 'Cash' ? grandTotal : 0;

    const transaksi = await TransaksiBeli.create({
      ...rest,
      refNo,
      tanggal: tanggalDate,
      supplierId: supplierId || '',
      pembayaran,
      grandTotal: grandTotal || 0,
      disc: disc || 0,
      ppn: ppn || 0,
      subtotal: subtotal || 0,
      lunas,
      hutang,
      items,
      updateHargaJual: updateHargaJual ?? false,
    });

    // Update stok barang
    for (const item of items) {
      if (!item.barangId) continue;
      const stokTambah =
        item.satuanType === 'beli'
          ? item.qty * (item.isi || 1)
          : item.qty;
      const updateOps: Record<string, unknown> = { $inc: { stok: stokTambah } };
      const hargaSet: Record<string, number> = {};
      // Update harga beli per-pcs ke master barang
      const hrgBeliPcs = item.satuanType === 'beli' && item.isi > 1
        ? Math.round(item.hrgBeli / item.isi)
        : item.hrgBeli;
      if (hrgBeliPcs > 0) hargaSet.hargaBeli = hrgBeliPcs;
      if (item.hgaToko > 0)   hargaSet.hargaJualToko   = item.hgaToko;
      if (item.hrgPartai > 0) hargaSet.hargaJualPartai = item.hrgPartai;
      if (item.hrgCabang > 0) hargaSet.hargaJualCabang = item.hrgCabang;
      if (Object.keys(hargaSet).length > 0) updateOps.$set = hargaSet;
      await Barang.findByIdAndUpdate(item.barangId, updateOps);
    }

    // Update saldo hutang supplier jika Tempo
    if (pembayaran === 'Tempo' && supplierId && grandTotal > 0) {
      await Supplier.findByIdAndUpdate(supplierId, { $inc: { saldoHutang: grandTotal } });
    }

    return NextResponse.json(transaksi, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
