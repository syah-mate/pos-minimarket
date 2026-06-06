import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import KoreksiStok from "@/models/KoreksiStok";
import Barang from "@/models/Barang";
import { getSession } from "@/lib/session";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const doc = await KoreksiStok.findById(id).lean();
  if (!doc) return NextResponse.json({ message: "Not found" }, { status: 404 });
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
    const { _id, __v, createdAt, updatedAt, refNo, ...fields } = body;
    const updated = await KoreksiStok.findByIdAndUpdate(id, { $set: fields }, {
      new: true,
      runValidators: true,
    });
    if (!updated) return NextResponse.json({ message: "Data tidak ditemukan" }, { status: 404 });

    // Update stok master barang untuk setiap item
    if (body.items && Array.isArray(body.items)) {
      for (const item of body.items) {
        if (item.barangId && item.stokKini !== undefined) {
          await Barang.findByIdAndUpdate(item.barangId, { stok: item.stokKini });
        }
      }
    }

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
    const deleted = await KoreksiStok.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ message: "Data tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ message: "Berhasil dihapus" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal menghapus data";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
