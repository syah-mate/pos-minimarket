import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Barang from "@/models/Barang";
import { requireRole } from "@/lib/authz";

export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin', 'kasir']);
  if (!auth.ok) return auth.response;

  try {
    await connectDB();
    const q = request.nextUrl.searchParams.get("q") ?? "";
    const query = q
      ? {
          $or: [
            { nama: { $regex: q, $options: "i" } },
            { kode: { $regex: q, $options: "i" } },
            { kategori: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const data = await Barang.find(query).sort({ nama: 1 }).lean();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal memuat data barang";
    console.error("GET /api/barang error:", msg);
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(['admin']);
  if (!auth.ok) return auth.response;

  try {
    await connectDB();
    const body = await request.json();
    const barang = await Barang.create(body);
    return NextResponse.json(barang, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal menyimpan data";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
