import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import TransaksiBeli from '@/models/TransaksiBeli';
import Barang from '@/models/Barang';
import Supplier from '@/models/Supplier';
import { requireRole } from '@/lib/authz';

const MAX_RETRY_REFNO = 3;

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
  const auth = await requireRole(['admin', 'kasir']);
  if (!auth.ok) return auth.response;

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
  const tglDari = searchParams.get('tglDari') ?? '';
  const tglSampai = searchParams.get('tglSampai') ?? '';
  const tipe = searchParams.get('tipe') ?? ''; // 'langsung' | 'po'
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
  // Date range filter
  if (tglDari || tglSampai) {
    filter.tanggal = {} as Record<string, Date>;
    if (tglDari) (filter.tanggal as Record<string, Date>).$gte = new Date(tglDari);
    if (tglSampai) (filter.tanggal as Record<string, Date>).$lte = new Date(tglSampai + 'T23:59:59.999Z');
  }
  // Tipe filter: langsung = Cash, po = Tempo
  if (tipe === 'langsung') {
    filter.pembayaran = 'Cash';
  } else if (tipe === 'po') {
    filter.pembayaran = 'Tempo';
  }
  const data = await TransaksiBeli.find(filter).sort({ tanggal: -1, createdAt: -1 }).lean();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin']);
  if (!auth.ok) return auth.response;

  await connectDB();
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

  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_RETRY_REFNO; attempt++) {
    const mongoSession = await mongoose.startSession();
    try {
      const result = await mongoSession.withTransaction(async (session) => {
        const refNo: string = body.refNo || (await generateRefNo(tanggalDate));

        const existing = await TransaksiBeli.findOne({ refNo }).session(session);
        if (existing) {
          throw { code: 11000, keyPattern: { refNo: 1 } };
        }

        const lunas = pembayaran === 'Cash' ? grandTotal : 0;
        const hutang = pembayaran !== 'Cash' ? grandTotal : 0;

        const [transaksi] = await TransaksiBeli.create([{
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
        }], { session });

        // Update stok barang
        for (const item of items) {
          if (!item.barangId) continue;
          const stokTambah =
            item.satuanType === 'beli'
              ? item.qty * (item.isi || 1)
              : item.qty;
          const updateOps: Record<string, unknown> = { $inc: { stok: stokTambah } };
          const hargaSet: Record<string, number> = {};
          // Update harga beli per-pcs ke master barang, dirata-rata sederhana
          // antara harga beli lama dan harga beli pembelian ini (tidak tergantung stok)
          const hrgBeliPcs = item.satuanType === 'beli' && item.isi > 1
            ? Math.round(item.hrgBeli / item.isi)
            : item.hrgBeli;
          if (hrgBeliPcs > 0) {
            const barangLama = await Barang.findById(item.barangId).session(session);
            const hargaBeliLama = barangLama?.hargaBeli || 0;
            hargaSet.hargaBeli = hargaBeliLama > 0
              ? Math.round((hargaBeliLama + hrgBeliPcs) / 2)
              : hrgBeliPcs;
          }
          if (updateHargaJual) {
            if (item.hgaToko > 0)   hargaSet.hargaJualToko   = item.hgaToko;
            if (item.hrgPartai > 0) hargaSet.hargaJualPartai = item.hrgPartai;
            if (item.hrgCabang > 0) hargaSet.hargaJualCabang = item.hrgCabang;
          }
          if (Object.keys(hargaSet).length > 0) updateOps.$set = hargaSet;
          await Barang.findByIdAndUpdate(item.barangId, updateOps, { session });
        }

        // Update saldo hutang supplier jika Tempo
        if (pembayaran === 'Tempo' && supplierId && grandTotal > 0) {
          await Supplier.findByIdAndUpdate(
            supplierId,
            { $inc: { saldoHutang: grandTotal } },
            { session }
          );
        }

        return transaksi;
      });

      return NextResponse.json(result, { status: 201 });
    } catch (err: unknown) {
      lastError = err;
      const isMongoErr = (err as { code?: number; keyPattern?: Record<string, unknown> });
      if (
        isMongoErr?.code === 11000 &&
        isMongoErr?.keyPattern &&
        'refNo' in (isMongoErr.keyPattern || {})
      ) {
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
