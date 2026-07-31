import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import KoreksiStok from "@/models/KoreksiStok";
import Barang from "@/models/Barang";
import { requireRole } from "@/lib/authz";

export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin']);
  if (!auth.ok) return auth.response;

  await connectDB();
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const query = q
    ? {
        $or: [
          { refNo: { $regex: q, $options: "i" } },
          { userName: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const data = await KoreksiStok.find(query).sort({ createdAt: -1 }).lean();
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(['admin']);
  if (!auth.ok) return auth.response;

  const body = await request.json();

  const mongoSession = await mongoose.startSession();
  try {
    await connectDB();

    const result = await mongoSession.withTransaction(async (session) => {
      // Auto-generate refNo: KS-YYMMDDXXX
      const now = new Date();
      const yymmdd =
        String(now.getFullYear()).slice(2) +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0");
      const prefix = `KS-${yymmdd}`;
      const last = await KoreksiStok.findOne({ refNo: { $regex: `^${prefix}` } })
        .sort({ refNo: -1 })
        .session(session)
        .lean();
      let seq = 1;
      if (last?.refNo) {
        const lastSeq = parseInt(last.refNo.slice(-3), 10);
        if (!isNaN(lastSeq)) seq = lastSeq + 1;
      }
      const refNo = `${prefix}${String(seq).padStart(3, "0")}`;

      const [doc] = await KoreksiStok.create([{
        ...body,
        refNo,
        userId: auth.session.userId,
        userName: auth.session.name,
      }], { session });

      // Update stok master barang untuk setiap item
      if (body.items && Array.isArray(body.items)) {
        for (const item of body.items) {
          if (item.barangId && item.stokKini !== undefined) {
            await Barang.findByIdAndUpdate(
              item.barangId,
              { stok: item.stokKini },
              { session }
            );
          }
        }
      }

      return doc;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Gagal menyimpan data";
    return NextResponse.json({ message: msg }, { status: 400 });
  } finally {
    await mongoSession.endSession();
  }
}
