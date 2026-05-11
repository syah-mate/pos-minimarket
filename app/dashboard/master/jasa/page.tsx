'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IJasa {
  _id: string;
  kode: string;
  nama: string;
  hargaJual: number;
}

interface JasaInput {
  kode: string;
  nama: string;
  hargaJual: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM: JasaInput = { kode: '', nama: '', hargaJual: 0 };

const TABLE_COLS = [
  { key: 'nama',      label: 'NAMA JASA',  cls: 'min-w-64' },
  { key: 'kode',      label: 'KODE JASA',  cls: 'min-w-36' },
  { key: 'hargaJual', label: 'HARGA JUAL', cls: 'min-w-32 text-right' },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (!n && n !== 0) return '';
  return n.toLocaleString('id-ID');
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  mode: 'add' | 'edit';
  initialData: JasaInput;
  onClose: () => void;
  onSave: (data: JasaInput) => Promise<void>;
  saving: boolean;
}

function JasaModal({ mode, initialData, onClose, onSave, saving }: ModalProps) {
  const [form, setForm] = useState<JasaInput>(initialData);

  function set<K extends keyof JasaInput>(field: K, value: JasaInput[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const inp = 'border border-gray-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white';
  const lbl = 'block text-xs text-gray-600 mb-0.5';

  const title =
    mode === 'edit'
      ? `Edit Jasa  Kode : ${initialData.kode}, Nama : ${initialData.nama}`
      : 'Tambah Jasa Baru';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded shadow-2xl w-96 flex flex-col border border-gray-300">
        {/* Title */}
        <div className="bg-blue-100 border-b border-blue-300 px-4 py-2 rounded-t">
          <span className="font-semibold text-sm text-gray-700">{title}</span>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1">
          <div className="p-4">
            <fieldset className="border border-gray-300 rounded px-3 pb-3 pt-1">
              <legend className="text-xs font-semibold text-gray-600 px-1">-Identitas Jasa-</legend>
              <div className="space-y-2">
                <div>
                  <label className={lbl}>Kode Jasa</label>
                  <input
                    className={inp}
                    value={form.kode}
                    onChange={(e) => set('kode', e.target.value)}
                    required
                    placeholder="Contoh: JSA001"
                  />
                </div>
                <div>
                  <label className={lbl}>Nama Jasa</label>
                  <input
                    className={inp}
                    value={form.nama}
                    onChange={(e) => set('nama', e.target.value)}
                    required
                    placeholder="Masukkan nama jasa"
                  />
                </div>
                <div>
                  <label className={lbl}>Harga Jual</label>
                  <input
                    type="number"
                    min="0"
                    className={inp}
                    value={form.hargaJual}
                    onChange={(e) => set('hargaJual', +e.target.value)}
                  />
                </div>
              </div>
            </fieldset>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
            <button
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

export default function JasaPage() {
  const [list, setList] = useState<IJasa[]>([]);
  const [filtered, setFiltered] = useState<IJasa[]>([]);
  const [selected, setSelected] = useState<IJasa | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/jasa');
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
        (j) =>
          j.nama.toLowerCase().includes(q) ||
          j.kode.toLowerCase().includes(q)
      )
    );
  }, [search, list]);

  async function handleSave(formData: JasaInput) {
    setSaving(true);
    setError('');
    try {
      const url = modalMode === 'edit' && selected ? `/api/jasa/${selected._id}` : '/api/jasa';
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
    if (!confirm(`Hapus jasa "${selected.nama}"?\n\nTindakan ini tidak dapat dibatalkan.`)) return;
    setError('');
    try {
      const res = await fetch(`/api/jasa/${selected._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus');
      setSelected(null);
      await fetchData();
    } catch {
      setError('Gagal menghapus data');
    }
  }

  const initialFormData: JasaInput =
    modalMode === 'edit' && selected
      ? { kode: selected.kode, nama: selected.nama, hargaJual: selected.hargaJual }
      : EMPTY_FORM;

  return (
    <div
      className="flex flex-col rounded-lg overflow-hidden shadow-md border border-green-200 bg-white"
      style={{ height: 'calc(100vh - 185px)' }}
    >
      {/* Title bar */}
      <div className="bg-green-700 text-white px-4 py-2 font-bold text-sm shrink-0">
        MASTER DATA JASA
      </div>

      {/* Search bar */}
      <div className="px-3 py-2 border-b border-gray-200 flex items-center gap-3 shrink-0 bg-gray-50">
        <span className="text-xs text-gray-500 font-medium">Cari:</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nama atau kode jasa..."
          className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-400 w-72"
        />
        <span className="text-xs text-gray-400">{filtered.length} jasa</span>
        {error && (
          <span className="text-red-500 text-xs ml-auto bg-red-50 border border-red-200 px-2 py-1 rounded">
            {error}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse" style={{ minWidth: '400px' }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-green-600 text-white">
              <th className="w-5 border-r border-green-500 px-1" />
              {TABLE_COLS.map((c) => (
                <th
                  key={c.key}
                  className={`${c.cls} px-2 py-2 font-semibold border-r border-green-500 whitespace-nowrap text-left last:border-r-0`}
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
                    <svg className="animate-spin w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24">
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
                  {search ? 'Tidak ada jasa yang sesuai pencarian.' : 'Belum ada data jasa. Klik Tambah untuk menambahkan.'}
                </td>
              </tr>
            ) : (
              filtered.map((j, i) => {
                const isSelected = selected?._id === j._id;
                return (
                  <tr
                    key={j._id}
                    onClick={() => setSelected(isSelected ? null : j)}
                    onDoubleClick={() => { setSelected(j); setModalMode('edit'); }}
                    className={`cursor-pointer border-b border-gray-100 transition-colors ${
                      isSelected
                        ? 'bg-green-200 text-green-900'
                        : i % 2 === 0
                        ? 'bg-white hover:bg-green-50'
                        : 'bg-gray-50 hover:bg-green-50'
                    }`}
                  >
                    <td className="border-r border-gray-100 text-center text-gray-300 select-none w-5">≡</td>
                    <td className="px-2 py-1 border-r border-gray-100 font-medium whitespace-nowrap">{j.nama}</td>
                    <td className="px-2 py-1 border-r border-gray-100 whitespace-nowrap">{j.kode}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{fmt(j.hargaJual)}</td>
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
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>
        <button
          onClick={handleDelete}
          disabled={!selected}
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-medium px-4 py-1.5 rounded shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Hapus
        </button>

        {selected && (
          <span className="ml-2 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-1 rounded">
            Dipilih: <strong>{selected.nama}</strong>
          </span>
        )}

        <div className="ml-auto">
          <button
            onClick={fetchData}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Modal */}
      {modalMode && (
        <JasaModal
          mode={modalMode}
          initialData={initialFormData}
          onClose={() => setModalMode(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}


