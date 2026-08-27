'use client';

import { useEffect, useState } from 'react';

/**
 * Versi tertunda dari sebuah nilai — dipakai untuk input pencarian di halaman
 * daftar, supaya fetch berjalan sekali setelah user berhenti mengetik, bukan
 * sekali per karakter.
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
