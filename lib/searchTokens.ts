/**
 * Token pencarian untuk koleksi Barang.
 *
 * Sebelum ini pencarian barang memakai `$regex` tanpa anchor + opsi `i`, yang
 * tidak bisa memakai index apa pun — setiap ketikan kasir jadi full collection
 * scan. Solusinya: simpan token lowercase hasil pemecahan nama/kode/kategori di
 * field array `searchTokens` yang diberi index multikey, lalu cari dengan regex
 * ber-anchor (`/^milo/`) sehingga MongoDB bisa melakukan index range scan.
 *
 * Mengetik "milo" tetap menemukan "SUSU MILO 200ML" karena "milo" adalah token
 * tersendiri; yang tidak tertangkap hanya substring di tengah kata (mis. "domie"
 * untuk "INDOMIE") — itu ditangani jalur fallback di GET /api/barang.
 */

/** Pecah teks jadi token lowercase alfanumerik yang unik. */
function tokenize(raw: string): string[] {
  return Array.from(new Set(raw.toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean)));
}

/**
 * Token yang disimpan di dokumen. Sumbernya nama/kode/kategori — sama persis
 * dengan kriteria `$or` pencarian lama, supaya cakupan pencarian tidak berubah.
 */
export function buildSearchTokens(src: {
  nama?: string | null;
  kode?: string | null;
  kategori?: string | null;
}): string[] {
  return tokenize([src.nama, src.kode, src.kategori].filter(Boolean).join(" "));
}

/** Token dari kata kunci yang diketik pengguna. */
export function parseTerms(q: string): string[] {
  return tokenize(q);
}

/** Lolos-kan karakter regex supaya ketikan seperti "(" tidak bikin query error. */
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Field yang perubahannya membuat `searchTokens` harus dihitung ulang. */
export const TOKEN_SOURCE_FIELDS = ["nama", "kode", "kategori"] as const;
