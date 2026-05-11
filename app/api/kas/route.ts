import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Kas from '@/models/Kas';

export async function GET(req: NextRequest) {
  await connectDB();
  const q = req.nextUrl.searchParams.get('q') ?? '';
  const filter = q
    ? { $or: [{ nama: { $regex: q, $options: 'i' } }, { kode: { $regex: q, $options: 'i' } }] }
    : {};
  const data = await Kas.find(filter).sort({ nama: 1 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();
  try {
    const kas = await Kas.create(body);
    return NextResponse.json(kas, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal menyimpan';
    return NextResponse.json({ message }, { status: 400 });
  }
}
