'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Varian `useDebouncedFetch` untuk daftar panjang: hasil dimuat per halaman dan
 * di-*append* saat pengguna men-scroll, bukan sekali tembak 100 baris.
 *
 * Pencarian tetap dikirim ke server, jadi cakupannya seluruh koleksi — bukan
 * memfilter halaman yang kebetulan sudah ter-load.
 *
 * `useDebouncedFetch` sengaja tidak diubah karena dipakai belasan picker lain
 * yang memang cukup dengan satu halaman.
 *
 * `search()`    — ketikan manual (debounce).
 * `searchNow()` — barcode scanner (Enter) dan load awal, tanpa delay.
 * `loadMore()`  — dipanggil sentinel IntersectionObserver di dasar daftar.
 *
 * `generation` naik setiap pencarian BARU (bukan saat append). Picker memakainya
 * untuk mereset baris terpilih; kalau memakai `list` sebagai dependency, setiap
 * halaman tambahan akan melempar highlight balik ke baris pertama.
 */

export interface PagedListResponse<T> {
  data?: T[];
  hasMore?: boolean;
  deep?: boolean;
}

export function useInfiniteSearch<T>(
  buildUrl: (q: string, page: number, deep: boolean) => string,
  delay = 250
) {
  const [list, setList] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [generation, setGeneration] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(false);
  // Query & halaman yang sedang aktif — dipakai loadMore() supaya tidak perlu
  // menunggu render berikutnya.
  const queryRef = useRef('');
  const pageRef = useRef(1);
  const deepRef = useRef(false);
  const hasMoreRef = useRef(false);
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);

  const fetchPage = useCallback(
    async (q: string, page: number) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const append = page > 1;
      if (append) {
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        queryRef.current = q;
        deepRef.current = false;
        hasMoreRef.current = false;
        loadingRef.current = true;
        setLoading(true);
      }

      try {
        const res = await fetch(buildUrl(q, page, deepRef.current), { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as PagedListResponse<T> | T[];
        const rows = Array.isArray(json) ? json : json.data ?? [];
        const more = Array.isArray(json) ? false : Boolean(json.hasMore);
        if (!Array.isArray(json) && json.deep) deepRef.current = true;

        pageRef.current = page;
        hasMoreRef.current = more;
        setHasMore(more);
        setList((prev) => (append ? [...prev, ...rows] : rows));
        if (!append) setGeneration((g) => g + 1);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.error(e);
          if (!append) {
            setList([]);
            setHasMore(false);
            hasMoreRef.current = false;
            setGeneration((g) => g + 1);
          }
        }
      } finally {
        // Request yang dibatalkan tidak boleh mematikan indikator loading milik
        // request penggantinya.
        if (!ctrl.signal.aborted) {
          if (append) setLoadingMore(false);
          else setLoading(false);
        }
        if (append) loadingMoreRef.current = false;
        else loadingRef.current = false;
      }
    },
    [buildUrl]
  );

  /** Langsung tanpa debounce — untuk barcode scanner & load awal. */
  const searchNow = useCallback(
    (q: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      pendingRef.current = false;
      return fetchPage(q, 1);
    },
    [fetchPage]
  );

  /** Debounced — untuk input ketikan manual. */
  const search = useCallback(
    (q: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      pendingRef.current = true;
      timerRef.current = setTimeout(() => {
        pendingRef.current = false;
        fetchPage(q, 1);
      }, delay);
    },
    [fetchPage, delay]
  );

  /**
   * Jalankan query yang masih tertunda, kalau ada. Mengembalikan `true` kalau
   * ada yang dijalankan — dipakai supaya Enter tidak memilih baris hasil ketikan
   * sebelumnya yang sudah basi.
   */
  const flushPending = useCallback(
    (q: string): boolean => {
      if (!pendingRef.current) return false;
      searchNow(q);
      return true;
    },
    [searchNow]
  );

  /** Halaman berikutnya dari query yang sedang aktif. */
  const loadMore = useCallback(() => {
    // Jangan menumpuk request, dan jangan menyerobot pencarian yang sedang jalan
    // (halaman 2 dari query lama akan di-abort dan membuang hasilnya).
    if (!hasMoreRef.current || loadingRef.current || loadingMoreRef.current || pendingRef.current) return;
    fetchPage(queryRef.current, pageRef.current + 1);
  }, [fetchPage]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    },
    []
  );

  return { list, loading, loadingMore, hasMore, generation, search, searchNow, flushPending, loadMore };
}
