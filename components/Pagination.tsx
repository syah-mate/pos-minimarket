'use client';

/**
 * Kontrol paginasi untuk halaman daftar yang datanya diambil per halaman dari server.
 */
export default function Pagination({
  page,
  totalPages,
  total,
  label,
  onChange,
  disabled = false,
}: {
  page: number;
  totalPages: number;
  total: number;
  /** Satuan data, mis. "pelanggan". */
  label: string;
  onChange: (page: number) => void;
  disabled?: boolean;
}) {
  const canPrev = page > 1 && !disabled;
  const canNext = totalPages > 0 && page < totalPages && !disabled;

  const btn =
    'px-2 py-1 rounded border border-gray-300 bg-white text-xs disabled:opacity-40 ' +
    'disabled:cursor-not-allowed hover:bg-gray-100';

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-t border-gray-200 bg-gray-50 shrink-0 text-xs">
      <span className="text-gray-500">
        {total >= 0 ? `${total} ${label}` : `${label}`}
        {totalPages > 0 && ` — halaman ${page} dari ${totalPages}`}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <button type="button" className={btn} disabled={!canPrev} onClick={() => onChange(1)}>
          « Awal
        </button>
        <button type="button" className={btn} disabled={!canPrev} onClick={() => onChange(page - 1)}>
          ‹ Sebelumnya
        </button>
        <button type="button" className={btn} disabled={!canNext} onClick={() => onChange(page + 1)}>
          Berikutnya ›
        </button>
        <button
          type="button"
          className={btn}
          disabled={!canNext}
          onClick={() => onChange(totalPages)}
        >
          Akhir »
        </button>
      </div>
    </div>
  );
}
