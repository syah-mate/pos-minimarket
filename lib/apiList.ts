/**
 * Helper untuk endpoint list yang sudah dipaginasi.
 *
 * Endpoint list mengembalikan `{ data, total, page, totalPages }`. Sebagian besar
 * pemanggil cukup memakai halaman pertama, tapi ada pemanggil yang butuh data
 * lengkap supaya benar (mis. daftar piutang jatuh tempo milik satu pelanggan —
 * memotongnya di 50 baris akan menyembunyikan hutang yang belum lunas).
 */

export interface PagedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

/** Ambil halaman pertama saja. Aman untuk response lama yang masih berupa array. */
export function pickList<T>(json: unknown): T[] {
  if (Array.isArray(json)) return json as T[];
  const data = (json as PagedResponse<T> | null)?.data;
  return Array.isArray(data) ? data : [];
}

/**
 * Ambil seluruh halaman dari endpoint yang dipaginasi.
 * `url` boleh sudah mengandung query string; `page`/`limit` ditambahkan di sini.
 */
export async function fetchAllPages<T>(
  url: string,
  init?: RequestInit,
  limit = 100,
  maxPages = 50
): Promise<T[]> {
  const sep = url.includes('?') ? '&' : '?';
  const first = await fetch(`${url}${sep}page=1&limit=${limit}`, init);
  if (!first.ok) throw new Error(`HTTP ${first.status}`);
  const json = (await first.json()) as PagedResponse<T> | T[];

  if (Array.isArray(json)) return json;

  const out = [...(json.data ?? [])];
  const totalPages = Math.min(json.totalPages ?? 1, maxPages);

  for (let p = 2; p <= totalPages; p++) {
    const res = await fetch(`${url}${sep}page=${p}&limit=${limit}`, init);
    if (!res.ok) break;
    const next = (await res.json()) as PagedResponse<T>;
    if (!next.data?.length) break;
    out.push(...next.data);
  }

  return out;
}
