import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import connectDB from "@/lib/db";
import Barang from "@/models/Barang";
import * as XLSX from "xlsx";

// Allowed MIME types
const ALLOWED_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

// Map header names to model field names (lowercased)
const FIELD_MAP: Record<string, string> = {
  kode: "kode",
  barcode: "barcode",
  nama: "nama",
  kategori: "kategori",
  subkategori: "subKategori",
  sub_kategori: "subKategori",
  hasexpired: "hasExpired",
  has_expired: "hasExpired",
  expired: "expired",
  satuanbeli: "satuanBeli",
  satuan_beli: "satuanBeli",
  satuanjual: "satuanJual",
  satuan_jual: "satuanJual",
  isi: "isi",
  hargabeli: "hargaBeli",
  harga_beli: "hargaBeli",
  hargajualtoko: "hargaJualToko",
  harga_jual_toko: "hargaJualToko",
  hargajualpartai: "hargaJualPartai",
  harga_jual_partai: "hargaJualPartai",
  hargajualcabang: "hargaJualCabang",
  harga_jual_cabang: "hargaJualCabang",
  stok: "stok",
  stokminimum: "stokMinimum",
  stok_minimum: "stokMinimum",
  stokmaksimum: "stokMaksimum",
  stok_maksimum: "stokMaksimum",
  lokasi: "lokasi",
  diskon: "diskon",
  pointmember: "pointMember",
  point_member: "pointMember",
  pointkaryawan: "pointKaryawan",
  point_karyawan: "pointKaryawan",
  tglbeli: "tglBeli",
  tgl_beli: "tglBeli",
  supplier: "supplier",
};

function parseRow(row: Record<string, unknown>) {
  // Build a normalized lowercased-key map
  const src: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    src[k.trim().toLowerCase()] = v;
  }

  const get = (field: string): unknown => src[field] ?? undefined;

  const kode = String(get("kode") ?? "").trim().toUpperCase();
  const nama = String(get("nama") ?? "").trim();

  // Skip empty rows
  if (!kode && !nama) return null;

  // Boolean helper
  const toBool = (v: unknown): boolean => {
    if (v === true || v === "TRUE" || v === "true" || v === "1" || v === 1) return true;
    return false;
  };

  const toNum = (v: unknown, fallback = 0): number => {
    if (v === undefined || v === null || v === "") return fallback;
    const n = Number(v);
    return isNaN(n) ? fallback : n;
  };

  const toDate = (v: unknown): Date | undefined => {
    if (!v) return undefined;
    // If it's an Excel serial number
    if (typeof v === "number") {
      // Excel date serial → JS date
      const d = XLSX.SSF.parse_date_code(v);
      if (d) return new Date(d.y, d.m - 1, d.d);
      return undefined;
    }
    const d = new Date(String(v));
    return isNaN(d.getTime()) ? undefined : d;
  };

  return {
    kode,
    barcode: String(get("barcode") ?? "").trim(),
    nama,
    kategori: String(get("kategori") ?? "").trim().toUpperCase(),
    subKategori: String(get("subkategori") ?? get("sub_kategori") ?? "").trim(),
    hasExpired: toBool(get("hasexpired") ?? get("has_expired")),
    expired: toDate(get("expired")),
    satuanBeli: String(get("satuanbeli") ?? get("satuan_beli") ?? "PCS").trim().toUpperCase(),
    satuanJual: String(get("satuanjual") ?? get("satuan_jual") ?? "PCS").trim().toUpperCase(),
    isi: toNum(get("isi"), 1),
    hargaBeli: toNum(get("hargabeli") ?? get("harga_beli")),
    hargaJualToko: toNum(get("hargajualtoko") ?? get("harga_jual_toko")),
    hargaJualPartai: toNum(get("hargajualpartai") ?? get("harga_jual_partai")),
    hargaJualCabang: toNum(get("hargajualcabang") ?? get("harga_jual_cabang")),
    stok: toNum(get("stok")),
    stokMinimum: toNum(get("stokminimum") ?? get("stok_minimum")),
    stokMaksimum: toNum(get("stokmaksimum") ?? get("stok_maksimum")),
    lokasi: String(get("lokasi") ?? "").trim(),
    diskon: toNum(get("diskon")),
    pointMember: toNum(get("pointmember") ?? get("point_member")),
    pointKaryawan: toNum(get("pointkaryawan") ?? get("point_karyawan")),
    tglBeli: toDate(get("tglbeli") ?? get("tgl_beli")),
    supplier: String(get("supplier") ?? "").trim(),
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireRole(['admin']);
  if (!auth.ok) return auth.response;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!ALLOWED_TYPES.some((t) => contentType.includes(t))) {
      return NextResponse.json(
        { message: "Format file tidak didukung. Gunakan .xlsx atau .xls." },
        { status: 400 }
      );
    }

    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_SIZE) {
      return NextResponse.json(
        { message: "Ukuran file terlalu besar. Maksimal 10MB." },
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

    // Parse workbook
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

      // Validate required fields
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
        // Upsert by kode: update existing, insert new
        await Barang.findOneAndUpdate(
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
