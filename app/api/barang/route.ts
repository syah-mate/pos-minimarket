import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Barang from "@/models/Barang";
import { requireRole } from "@/lib/authz";

export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin', 'kasir']);
  if (!auth.ok) return auth.response;

  try {
    await connectDB();
    const url = request.nextUrl;
    const q = url.searchParams.get("q") ?? "";
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50));
    const skip = (page - 1) * limit;

    const query = q
      ? {
          $or: [
            { nama: { $regex: q, $options: "i" } },
            { kode: { $regex: q, $options: "i" } },
            { kategori: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      Barang.find(query).sort({ nama: 1 }).skip(skip).limit(limit).lean(),
      Barang.countDocuments(query),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
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
