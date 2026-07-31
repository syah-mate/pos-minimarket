import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Supplier from '@/models/Supplier';
import { requireRole } from '@/lib/authz';

export async function GET(req: NextRequest) {
  const auth = await requireRole(['admin', 'kasir']);
  if (!auth.ok) return auth.response;

  await connectDB();
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const filter = q
    ? {
        $or: [
          { nama:  { $regex: q, $options: 'i' } },
          { kode:  { $regex: q, $options: 'i' } },
          { kota:  { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
        ],
      }
    : {};
  const data = await Supplier.find(filter).sort({ nama: 1 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['admin']);
  if (!auth.ok) return auth.response;

  await connectDB();
  const body = await req.json();
  try {
    const supplier = await Supplier.create(body);
    return NextResponse.json(supplier, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menyimpan';
    return NextResponse.json({ message }, { status: 400 });
  }
}
