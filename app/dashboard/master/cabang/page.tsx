'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ICabang {
  _id: string;
  kodeCabang: string;
  namaCabang: string;
  alamatCabang: string;
  maxPiutang: number;
  saldoPiutang: number;
}

interface CabangInput {
  kodeCabang: string;
  namaCabang: string;
  alamatCabang: string;
  maxPiutang: number;
  saldoPiutang: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM: CabangInput = {
  kodeCabang: '', namaCabang: '', alamatCabang: '', maxPiutang: 0, saldoPiutang: 0,
};

const TABLE_COLS = [
  { key: 'namaCabang',   label: 'NAMA CABANG',   cls: 'min-w-52' },
  { key: 'kodeCabang',   label: 'KODE CABANG',   cls: 'min-w-28' },
  { key: 'alamatCabang', label: 'ALAMAT',         cls: 'min-w-52' },
  { key: 'maxPiutang',   label: 'MAX PIUTANG',   cls: 'min-w-32 text-right' },
  { key: 'saldoPiutang', label: 'SALDO PIUTANG', cls: 'min-w-32 text-right' },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (!n && n !== 0) return '';
  return n.toLocaleString('id-ID');
}

function cabangToForm(c: ICabang): CabangInput {
  return {
    kodeCabang: c.kodeCabang,
    namaCabang: c.namaCabang,
    alamatCabang: c.alamatCabang,
    maxPiutang: c.maxPiutang,
    saldoPiutang: c.saldoPiutang,
  };
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  mode: 'add' | 'edit';
  initialData: CabangInput;
  onClose: () => void;
  onSave: (data: CabangInput) => Promise<void>;
  saving: boolean;
}

function CabangModal({ mode, initialData, onClose, onSave, saving }: ModalProps) {
  const [form, setForm] = useState<CabangInput>(initialData);

  function set<K extends keyof CabangInput>(field: K, value: CabangInput[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const inp = 'border border-gray-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white';
  const lbl = 'block text-xs text-gray-600 mb-0.5';

  const title =
    mode === 'edit'
      ? `Edit Cabang  Kode : ${initialData.kodeCabang}, Nama : ${initialData.namaCabang}`
      : 'Tambah Cabang Baru';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(form);
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'F8') { e.preventDefault(); document.getElementById('cabang-submit-btn')?.click(); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded shadow-2xl w-120 max-h-[92vh] flex flex-col border border-gray-300">
        {/* Title */}
        <div className="bg-indigo-100 border-b border-indigo-300 px-4 py-2 rounded-t">
          <span className="font-semibold text-sm text-gray-700">{title}</span>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4">
            <fieldset className="border border-gray-300 rounded px-3 pb-3 pt-1">
              <legend className="text-xs font-semibold text-gray-600 px-1">-Identitas Cabang-</legend>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2">
                <div>
                  <label className={lbl}>Kode Cabang</label>
                  <input
                    className={inp}
                    value={form.kodeCabang}
                    onChange={(e) => set('kodeCabang', e.target.value)}
                    required
                    placeholder="Contoh: CBG001"
                  />
                </div>
                <div />
                <div className="col-span-2">
                  <label className={lbl}>Nama Cabang</label>
                  <input
                    className={inp}
                    value={form.namaCabang}
                    onChange={(e) => set('namaCabang', e.target.value)}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Alamat Cabang</label>
                  <input
                    className={inp}
                    value={form.alamatCabang}
                    onChange={(e) => set('alamatCabang', e.target.value)}
                  />
                </div>
                <div>
                  <label className={lbl}>Max Piutang</label>
                  <input
                    type="number"
                    min="0"
                    className={inp}
                    value={form.maxPiutang}
                    onChange={(e) => set('maxPiutang', +e.target.value)}
                  />
                </div>
                <div>
                  <label className={lbl}>Saldo Piutang</label>
                  <input
                    type="number"
                    className={inp}
                    value={form.saldoPiutang}
                    onChange={(e) => set('saldoPiutang', +e.target.value)}
                  />
                </div>
              </div>
            </fieldset>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 sticky bottom-0">
            <button
              id="cabang-submit-btn"
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-medium px-5 py-2 rounded shadow"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2M12 12V4m0 0L8 8m4-4l4 4" />
              </svg>
              {saving ? 'Menyimpan...' : 'Simpan [F8]'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium px-5 py-2 rounded shadow"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Keluar [ESC]
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CabangPage() {
  const [list, setList] = useState<ICabang[]>([]);
  const [filtered, setFiltered] = useState<ICabang[]>([]);
  const [selected, setSelected] = useState<ICabang | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/cabang');
      if (!res.ok) throw new Error('Gagal memuat data');
      const data = await res.json();
      setList(data);
      setFiltered(data);
    } catch {
      setError('Gagal memuat data. Pastikan koneksi database aktif.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      list.filter(
        (c) =>
          c.namaCabang.toLowerCase().includes(q) ||
          c.kodeCabang.toLowerCase().includes(q) ||
          c.alamatCabang.toLowerCase().includes(q)
      )
    );
  }, [search, list]);

  async function handleSave(formData: CabangInput) {
    setSaving(true);
    setError('');
    try {
      const url = modalMode === 'edit' && selected ? `/api/cabang/${selected._id}` : '/api/cabang';
      const method = modalMode === 'edit' ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Gagal menyimpan');
      setModalMode(null);
      setSelected(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!confirm(`Hapus cabang "${selected.namaCabang}"?\n\nTindakan ini tidak dapat dibatalkan.`)) return;
    setError('');
    try {
      const res = await fetch(`/api/cabang/${selected._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus');
      setSelected(null);
      await fetchData();
    } catch {
      setError('Gagal menghapus data');
    }
  }

  const initialFormData: CabangInput =
    modalMode === 'edit' && selected ? cabangToForm(selected) : EMPTY_FORM;

  return (
    <div
      className="flex flex-col rounded-lg overflow-hidden shadow-md border border-indigo-200 bg-white"
      style={{ height: 'calc(100vh - 185px)' }}
    >
      {/* Title bar */}
      <div className="bg-indigo-700 text-white px-4 py-2 font-bold text-sm shrink-0">
        MASTER DATA CABANG
      </div>

      {/* Search bar */}
      <div className="px-3 py-2 border-b border-gray-200 flex items-center gap-3 shrink-0 bg-gray-50">
        <span className="text-xs text-gray-500 font-medium">Cari:</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nama, kode, atau alamat cabang..."
          className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 w-72"
        />
        <span className="text-xs text-gray-400">{filtered.length} cabang</span>
        {error && (
          <span className="text-red-500 text-xs ml-auto bg-red-50 border border-red-200 px-2 py-1 rounded">
            {error}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse" style={{ minWidth: '700px' }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-indigo-600 text-white">
              <th className="w-5 border-r border-indigo-500 px-1" />
              {TABLE_COLS.map((c) => (
                <th
                  key={c.key}
                  className={`${c.cls} px-2 py-2 font-semibold border-r border-indigo-500 whitespace-nowrap text-left last:border-r-0`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={TABLE_COLS.length + 1} className="text-center py-12 text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="animate-spin w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Memuat data...
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={TABLE_COLS.length + 1} className="text-center py-12 text-gray-400 italic">
                  {search ? 'Tidak ada cabang yang sesuai pencarian.' : 'Belum ada data cabang. Klik Tambah untuk menambahkan.'}
                </td>
              </tr>
            ) : (
              filtered.map((c, i) => {
                const isSelected = selected?._id === c._id;
                return (
                  <tr
                    key={c._id}
                    onClick={() => setSelected(isSelected ? null : c)}
                    onDoubleClick={() => { setSelected(c); setModalMode('edit'); }}
                    className={`cursor-pointer border-b border-gray-100 transition-colors ${
                      isSelected
                        ? 'bg-indigo-200 text-indigo-900'
                        : i % 2 === 0
                        ? 'bg-white hover:bg-indigo-50'
                        : 'bg-gray-50 hover:bg-indigo-50'
                    }`}
                  >
                    <td className="border-r border-gray-100 text-center text-gray-300 select-none w-5">≡</td>
                    <td className="px-2 py-1 border-r border-gray-100 font-medium whitespace-nowrap">{c.namaCabang}</td>
                    <td className="px-2 py-1 border-r border-gray-100 whitespace-nowrap">{c.kodeCabang}</td>
                    <td className="px-2 py-1 border-r border-gray-100">{c.alamatCabang}</td>
                    <td className="px-2 py-1 border-r border-gray-100 text-right tabular-nums">{c.maxPiutang ? fmt(c.maxPiutang) : ''}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{c.saldoPiutang ? fmt(c.saldoPiutang) : ''}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-200 bg-gray-50 shrink-0">
        <button
          onClick={() => { setSelected(null); setModalMode('add'); }}
          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-4 py-1.5 rounded shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Tambah
        </button>
        <button
          onClick={() => selected && setModalMode('edit')}
          disabled={!selected}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-medium px-4 py-1.5 rounded shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          </svg>
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={!selected}
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-medium px-4 py-1.5 rounded shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          Hapus
        </button>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 bg-gray-500 hover:bg-gray-600 text-white text-xs font-medium px-4 py-1.5 rounded shadow-sm ml-auto"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          Refresh
        </button>
        {selected && (
          <span className="text-xs text-gray-500 ml-2">
            Dipilih: <span className="font-semibold text-indigo-700">{selected.namaCabang}</span>
          </span>
        )}
      </div>

      {/* Modal */}
      {modalMode && (
        <CabangModal
          mode={modalMode}
          initialData={initialFormData}
          onClose={() => { setModalMode(null); setSelected(null); }}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}
