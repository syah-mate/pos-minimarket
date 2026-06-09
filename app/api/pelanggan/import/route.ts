import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import connectDB from "@/lib/db";
import Pelanggan from "@/models/Pelanggan";
import * as XLSX from "xlsx";

const ALLOWED_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];
const MAX_SIZE = 10 * 1024 * 1024;

function parseRow(row: Record<string, unknown>) {
  const src: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    src[k.trim().toLowerCase()] = v;
  }

  const get = (field: string): unknown => src[field] ?? undefined;

  const kode = String(get("kode") ?? "").trim().toUpperCase();
  const nama = String(get("nama") ?? "").trim();

  if (!kode && !nama) return null;

  const toNum = (v: unknown, fallback = 0): number => {
    if (v === undefined || v === null || v === "") return fallback;
    const n = Number(v);
    return isNaN(n) ? fallback : n;
  };

  const toDate = (v: unknown): Date | undefined => {
    if (!v) return undefined;
    if (typeof v === "number") {
      const d = XLSX.SSF.parse_date_code(v);
      if (d) return new Date(d.y, d.m - 1, d.d);
      return undefined;
    }
    const d = new Date(String(v));
    return isNaN(d.getTime()) ? undefined : d;
  };

  return {
    kode,
    nama,
    alamat: String(get("alamat") ?? "").trim(),
    telp: String(get("telp") ?? "").trim(),
    tglLahir: toDate(get("tgllahir") ?? get("tgl_lahir")),
    pekerjaan: String(get("pekerjaan") ?? "").trim(),
    maxPiutang: toNum(get("maxpiutang") ?? get("max_piutang")),
    saldoPiutang: toNum(get("saldopiutang") ?? get("saldo_piutang")),
    diskonPenjualan: toNum(get("diskonpenjualan") ?? get("diskon_penjualan")),
    noNpwp: String(get("nonpwp") ?? get("no_npwp") ?? "").trim(),
  };
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!ALLOWED_TYPES.some((t) => contentType.includes(t))) {
      return NextResponse.json(
        { message: "Format file tidak didukung. Gunakan .xlsx atau .xls." },
        { status: 400 }
      );
    }

    const arrayBuffer = await request.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SIZE) {
      return NextResponse.json(
        { message: "Ukuran file terlalu besar. Maksimal 10MB." },
        { status: 400 }
      );
    }

    const wb = XLSX.read(Buffer.from(arrayBuffer), { type: "buffer", cellDates: true });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ message: "File Excel kosong." }, { status: 400 });
    }

    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    if (rows.length === 0) {
      return NextResponse.json({ message: "Tidak ada data dalam file Excel." }, { status: 400 });
    }

    await connectDB();

    const results = {
      total: rows.length,
      success: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < rows.length; i++) {
      const parsed = parseRow(rows[i]);
      if (!parsed) {
        results.skipped++;
        continue;
      }

      if (!parsed.kode) {
        results.errors.push(`Baris ${i + 2}: kode wajib diisi`);
        results.skipped++;
        continue;
      }
      if (!parsed.nama) {
        results.errors.push(`Baris ${i + 2}: nama wajib diisi`);
        results.skipped++;
        continue;
      }

      try {
        await Pelanggan.findOneAndUpdate(
          { kode: parsed.kode },
          { $set: parsed },
          { upsert: true, new: true, runValidators: true }
        );
        results.success++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error tidak diketahui";
        results.errors.push(`Baris ${i + 2} (${parsed.kode}): ${msg}`);
        results.skipped++;
      }
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Gagal mengimport data";
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
