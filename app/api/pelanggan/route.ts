import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Pelanggan from '@/models/Pelanggan';
import { requireRole } from '@/lib/authz';
import { parsePaging, pagedJson } from '@/lib/paging';

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin', 'kasir']);
  if (!auth.ok) return auth.response;

  await connectDB();
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const filter = q
    ? {
        $or: [
          { nama: { $regex: q, $options: 'i' } },
          { kode: { $regex: q, $options: 'i' } },
          { alamat: { $regex: q, $options: 'i' } },
          { telp: { $regex: q, $options: 'i' } },
        ],
      }
    : {};
  return pagedJson(Pelanggan, filter, parsePaging(req.nextUrl.searchParams), {
    sort: { nama: 1 },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin', 'kasir']);
  if (!auth.ok) return auth.response;

  await connectDB();
  const body = await req.json();
  try {
    const pelanggan = await Pelanggan.create(body);
    return NextResponse.json(pelanggan, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menyimpan';
    return NextResponse.json({ message }, { status: 400 });
  }
}
