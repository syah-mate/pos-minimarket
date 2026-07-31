import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Pelanggan from '@/models/Pelanggan';
import { requireRole } from '@/lib/authz';

interface Params { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireRole(['admin', 'kasir']);
  if (!auth.ok) return auth.response;

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  try {
    const updated = await Pelanggan.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!updated) return NextResponse.json({ message: 'Data tidak ditemukan' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gagal memperbarui';
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireRole(['admin']);
  if (!auth.ok) return auth.response;

  await connectDB();
  const { id } = await params;
  const deleted = await Pelanggan.findByIdAndDelete(id);
  if (!deleted) return NextResponse.json({ message: 'Data tidak ditemukan' }, { status: 404 });
  return NextResponse.json({ message: 'Berhasil dihapus' });
}
