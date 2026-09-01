import { NextRequest, NextResponse } from "next/server";
import type { QueryFilter } from "mongoose";
import connectDB from "@/lib/db";
import Barang, { IBarang } from "@/models/Barang";
import { requireRole } from "@/lib/authz";
import { parseTerms, escapeRegex } from "@/lib/searchTokens";

/**
 * Field yang dibutuhkan picker barang (union dari semua `BarangOption`:
 * jual, beli, koreksi-stok, return-pembelian, terima-return). Dipakai lewat
 * `?fields=picker` — pemanggil lain (mis. master/barang yang butuh dokumen utuh
 * untuk form edit) tetap dapat seluruh field.
 */
const PICKER_FIELDS =
  "_id kode nama kategori satuanBeli satuanJual isi stok lokasi diskon hasExpired " +
  "hargaBeli hargaJual hargaJualToko hargaJualPartai hargaJualCabang";

/**
 * Field untuk laporan stok (`?fields=stok`). Laporan membaca seluruh koleksi,
 * jadi dokumen utuh terlalu berat — cukup kolom yang dicetak saja.
 */
const STOK_FIELDS =
  "_id kode nama kategori lokasi satuanJual stok " +
  "hargaBeli hargaJualToko hargaJualPartai hargaJualCabang";

/**
 * Field untuk laporan penjualan per supplier (`?fields=supplier`). Laporan hanya
 * memetakan item penjualan ke supplier barangnya, jadi cukup identitas + supplier.
 */
const SUPPLIER_FIELDS = "_id kode nama supplier";

/** Batas halaman untuk mode infinite scroll — `skip` dalam tidak boleh jadi lubang performa baru. */
const MAX_PAGE = 200;

/** Filter cepat: regex ber-anchor di atas index multikey `searchTokens`. */
function tokenFilter(terms: string[]): QueryFilter<IBarang> {
  return { $and: terms.map((t) => ({ searchTokens: { $regex: "^" + escapeRegex(t) } })) };
}

/**
 * Filter lama (substring di tengah kata, mis. "domie" → "INDOMIE"). Ini full
 * collection scan, jadi hanya dipakai sebagai fallback saat pencarian token
 * tidak menemukan apa pun — supaya cakupan pencarian tetap menyeluruh.
 */
function deepFilter(q: string): QueryFilter<IBarang> {
  const rx = { $regex: escapeRegex(q), $options: "i" };
  return { $or: [{ nama: rx }, { kode: rx }, { kategori: rx }] };
}

export async function GET(request: NextRequest) {
  const auth = await requireRole(['admin', 'kasir']);
  if (!auth.ok) return auth.response;

  try {
    await connectDB();
    const url = request.nextUrl;
    const q = (url.searchParams.get("q") ?? "").trim();
    const page = Math.min(MAX_PAGE, Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1));
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50));
    const skip = (page - 1) * limit;
    // Picker tidak memakai `total`, dan countDocuments memindai seluruh koleksi
    // di setiap ketikan — ini beban terbesar endpoint ini.
    const withCount = url.searchParams.get("count") !== "0";
    const fields = url.searchParams.get("fields");
    const select =
      fields === "picker"
        ? PICKER_FIELDS
        : fields === "stok"
        ? STOK_FIELDS
        : fields === "supplier"
        ? SUPPLIER_FIELDS
        : "";
    // Client meneruskan `deep=1` untuk halaman berikutnya dari query yang
    // halaman pertamanya sudah jatuh ke jalur fallback.
    let deep = url.searchParams.get("deep") === "1";

    const terms = parseTerms(q);
    let filter: QueryFilter<IBarang> = !q ? {} : deep ? deepFilter(q) : tokenFilter(terms);

    // Ambil satu baris ekstra untuk tahu masih ada halaman berikutnya tanpa count.
    const run = (f: QueryFilter<IBarang>) =>
      Barang.find(f)
        .select(select)
        .sort({ nama: 1 })
        .skip(skip)
        .limit(limit + 1)
        .allowDiskUse(true)
        .lean();

    let rows = await run(filter);

    // Tidak ketemu lewat token → coba sekali jalur menyeluruh.
    if (!rows.length && q && !deep && page === 1) {
      deep = true;
      filter = deepFilter(q);
      rows = await run(filter);
    }

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;

    const total = withCount ? await Barang.countDocuments(filter) : -1;

    return NextResponse.json({
      data,
      total,
      page,
      totalPages: total >= 0 ? Math.ceil(total / limit) : -1,
      hasMore,
      deep,
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
