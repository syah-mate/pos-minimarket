import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Barang from "@/models/Barang";
import { getSession } from "@/lib/session";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  await connectDB();
  const { id } = await params;
  const doc = await Barang.findById(id).lean();
  if (!doc) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  return NextResponse.json(doc);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, __v, createdAt, updatedAt, ...fields } = body;
    const updated = await Barang.findByIdAndUpdate(id, { $set: fields }, {
      new: true,
      runValidators: true,
    });
    if (!updated) return NextResponse.json({ message: "Data tidak ditemukan" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal mengupdate data";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const { id } = await params;
    const deleted = await Barang.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ message: "Data tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ message: "Berhasil dihapus" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal menghapus data";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
