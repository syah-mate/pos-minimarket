'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Bungkus sebuah callback supaya hanya dijalankan setelah user berhenti memicunya
 * selama `delay` ms.
 *
 * Dipakai di input pencarian picker yang memanggil `fetchList` langsung dari
 * `onChange` — tanpa ini, mengetik "INDOMIE" berarti 7 request HTTP.
 *
 * Callback terbaru selalu dipakai (disimpan di ref), jadi fungsi biasa yang
 * didefinisikan ulang setiap render tetap aman diteruskan ke sini.
 */
export function useDebouncedCallback<A extends unknown[]>(
  fn: (...args: A) => void,
  delay = 250
) {
  const fnRef = useRef(fn);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { fnRef.current = fn; });

  useEffect(
    () => () => { if (timerRef.current) clearTimeout(timerRef.current); },
    []
  );

  return useCallback(
    (...args: A) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fnRef.current(...args), delay);
    },
    [delay]
  );
}
