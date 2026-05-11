import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Supplier from '@/models/Supplier';

interface Params { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  await connectDB();
  const { id } = await params;
  const body = await req.json();
  try {
    const updated = await Supplier.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!updated) return NextResponse.json({ message: 'Data tidak ditemukan' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memperbarui';
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  await connectDB();
  const { id } = await params;
  const deleted = await Supplier.findByIdAndDelete(id);
  if (!deleted) return NextResponse.json({ message: 'Data tidak ditemukan' }, { status: 404 });
  return NextResponse.json({ message: 'Berhasil dihapus' });
}
