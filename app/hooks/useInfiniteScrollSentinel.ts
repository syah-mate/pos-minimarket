'use client';

import { useEffect, useRef } from 'react';

/**
 * Panggil `onReach` saat elemen sentinel di dasar daftar terlihat di dalam
 * container yang bisa di-scroll. Dipakai picker barang untuk memuat halaman
 * berikutnya tanpa tombol "muat lagi".
 *
 * Container ikut jadi `root` observer supaya yang dipantau adalah scroll di
 * dalam modal, bukan scroll halaman.
 */
export function useInfiniteScrollSentinel<C extends HTMLElement, S extends HTMLElement>(
  onReach: () => void,
  enabled: boolean
) {
  const rootRef = useRef<C>(null);
  const sentinelRef = useRef<S>(null);
  // Observer hanya dibuat ulang saat `enabled` berubah; callback disimpan di ref
  // supaya observer tidak ikut dibuat ulang setiap render.
  const cbRef = useRef(onReach);
  useEffect(() => { cbRef.current = onReach; }, [onReach]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!enabled || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) cbRef.current();
      },
      // rootMargin: mulai memuat sedikit sebelum sentinel benar-benar terlihat.
      { root: rootRef.current, rootMargin: '120px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled]);

  return { rootRef, sentinelRef };
}
