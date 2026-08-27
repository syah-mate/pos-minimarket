'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Fetch daftar dengan debounce + pembatalan request lama.
 *
 * Sebelum ini setiap picker memanggil `fetchList()` langsung di `onChange`, jadi
 * mengetik "INDOMIE" berarti 7 request HTTP paralel. Selain berat, respons bisa
 * datang tidak berurutan sehingga hasil ketikan ke-3 menimpa hasil ketikan ke-7 —
 * itulah yang dirasakan kasir sebagai "lemot sekaligus ngaco".
 *
 * `search()`    — dipakai untuk ketikan manual (debounce).
 * `searchNow()` — dipakai untuk barcode scanner (Enter) dan load awal, tanpa delay.
 *
 * Catatan barcode scanner: scanner mengirim karakter <30 ms lalu menekan Enter.
 * Tangani Enter dengan `searchNow(q)` supaya tidak terasa delay 250 ms.
 */
export function useDebouncedFetch<T>(
  buildUrl: (q: string) => string,
  pick: (json: unknown) => T[],
  delay = 250
) {
  const [list, setList] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef(false);

  const run = useCallback(
    async (q: string) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const res = await fetch(buildUrl(q), { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setList(pick(await res.json()));
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.error(e);
          setList([]);
        }
      } finally {
        // Request yang dibatalkan tidak boleh mematikan indikator loading milik
        // request penggantinya.
        if (!ctrl.signal.aborted) setLoading(false);
      }
    },
    [buildUrl, pick]
  );

  /** Debounced — untuk input ketikan manual. */
  const search = useCallback(
    (q: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      pendingRef.current = true;
      timerRef.current = setTimeout(() => {
        pendingRef.current = false;
        run(q);
      }, delay);
    },
    [run, delay]
  );

  /** Langsung tanpa debounce — untuk barcode scanner & load awal. */
  const searchNow = useCallback(
    (q: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      pendingRef.current = false;
      return run(q);
    },
    [run]
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

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    },
    []
  );

  return { list, loading, search, searchNow, flushPending, setList };
}
