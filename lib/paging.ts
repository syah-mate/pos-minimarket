/**
 * Helper paginasi sisi server untuk endpoint list.
 *
 * Sebelumnya hampir semua endpoint list menjalankan `.find(filter)` tanpa `.limit()`,
 * jadi seluruh koleksi ikut terkirim setiap kali halaman dibuka. Selain berat di
 * jaringan, sort tanpa index pada koleksi besar menabrak batas 32 MB MongoDB dan
 * query gagal total.
 */
import { NextResponse } from 'next/server';
import type { Model, QueryFilter } from 'mongoose';

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;

export interface Paging {
  page: number;
  limit: number;
  skip: number;
}

export function parsePaging(
  searchParams: URLSearchParams,
  defaultLimit = DEFAULT_LIMIT,
  maxLimit = MAX_LIMIT
): Paging {
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(searchParams.get('limit') ?? String(defaultLimit), 10) || defaultLimit)
  );
  return { page, limit, skip: (page - 1) * limit };
}

interface PagedQueryOptions {
  sort?: Record<string, 1 | -1>;
  /** Projection Mongoose, mis. '-items' untuk memangkas array yang di-embed. */
  select?: string;
}

/**
 * Jalankan query terpaginasi dan bungkus jadi response standar
 * `{ data, total, page, totalPages }`.
 *
 * `total` hanya dihitung di halaman 1 (countDocuments mahal pada koleksi besar);
 * di halaman berikutnya `total` dan `totalPages` bernilai -1.
 */
export async function pagedJson<T>(
  model: Model<T>,
  filter: QueryFilter<T>,
  paging: Paging,
  { sort = { createdAt: -1 }, select = '' }: PagedQueryOptions = {}
) {
  const [data, total] = await Promise.all([
    model.find(filter).select(select).sort(sort).skip(paging.skip).limit(paging.limit).lean(),
    paging.page === 1 ? model.countDocuments(filter) : Promise.resolve(-1),
  ]);

  return NextResponse.json({
    data,
    total,
    page: paging.page,
    totalPages: total >= 0 ? Math.ceil(total / paging.limit) : -1,
  });
}
