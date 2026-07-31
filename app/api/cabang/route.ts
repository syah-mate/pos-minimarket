import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Cabang from '@/models/Cabang';
import { requireRole } from '@/lib/authz';

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin', 'kasir']);
  if (!auth.ok) return auth.response;

  await connectDB();
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const filter = q
    ? {
        $or: [
          { namaCabang:   { $regex: q, $options: 'i' } },
          { kodeCabang:   { $regex: q, $options: 'i' } },
          { alamatCabang: { $regex: q, $options: 'i' } },
        ],
      }
    : {};
  const data = await Cabang.find(filter).sort({ namaCabang: 1 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin']);
  if (!auth.ok) return auth.response;

  await connectDB();
  const body = await req.json();
  try {
    const cabang = await Cabang.create(body);
    return NextResponse.json(cabang, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menyimpan';
    return NextResponse.json({ message }, { status: 400 });
  }
}
