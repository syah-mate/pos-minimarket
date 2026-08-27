'use client';

import { useState, useEffect, useCallback } from 'react';
import { pickList, type PagedResponse } from '@/lib/apiList';
import Pagination from '@/components/Pagination';
import { useDebouncedValue } from '@/app/hooks/useDebouncedValue';

const PAGE_SIZE = 50;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ISupplier {
  _id: string;
  kode: string;
  nama: string;
  alamat: string;
  kota: string;
  telp: string;
  fax: string;
  email: string;
  saldoHutang: number;
}

interface SupplierInput {
  kode: string;
  nama: string;
  alamat: string;
  kota: string;
  telp: string;
  fax: string;
  email: string;
  saldoHutang: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM: SupplierInput = {
  kode: '', nama: '', alamat: '', kota: '', telp: '', fax: '', email: '', saldoHutang: 0,
};

const TABLE_COLS = [
  { key: 'nama',        label: 'NAMA SUPPLIER',  cls: 'min-w-48' },
  { key: 'kode',        label: 'KODE',            cls: 'min-w-24' },
  { key: 'alamat',      label: 'ALAMAT SUPPLIER', cls: 'min-w-48' },
  { key: 'kota',        label: 'KOTA',            cls: 'min-w-28' },
  { key: 'telp',        label: 'TELP',            cls: 'min-w-32' },
  { key: 'fax',         label: 'FAX',             cls: 'min-w-28' },
  { key: 'email',       label: 'EMAIL',           cls: 'min-w-40' },
  { key: 'saldoHutang', label: 'SALDO HUTANG',    cls: 'min-w-32 text-right' },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (!n && n !== 0) return '';
  return n.toLocaleString('id-ID');
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  mode: 'add' | 'edit';
  initialData: SupplierInput;
  onClose: () => void;
  onSave: (data: SupplierInput) => Promise<void>;
  saving: boolean;
}

function SupplierModal({ mode, initialData, onClose, onSave, saving }: ModalProps) {
  const [form, setForm] = useState<SupplierInput>(initialData);

  function set<K extends keyof SupplierInput>(field: K, value: SupplierInput[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const inp = 'border border-gray-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-orange-400 bg-white';
  const lbl = 'block text-xs text-gray-600 mb-0.5';

  const title =
    mode === 'edit'
      ? `Edit Supplier  Kode : ${initialData.kode}, Nama : ${initialData.nama}`
      : 'Tambah Supplier Baru';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded shadow-2xl w-140 flex flex-col border border-gray-300">
        {/* Title */}
        <div className="bg-orange-100 border-b border-orange-300 px-4 py-2 rounded-t">
          <span className="font-semibold text-sm text-gray-700">{title}</span>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1">
          <div className="p-4">
            <fieldset className="border border-gray-300 rounded px-3 pb-3 pt-1">
              <legend className="text-xs font-semibold text-gray-600 px-1">-Identitas Supplier-</legend>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-1">
                <div>
                  <label className={lbl}>Kode</label>
                  <input className={inp} value={form.kode} onChange={(e) => set('kode', e.target.value)} required placeholder="Contoh: SUP001" />
                </div>
                <div />
                <div className="col-span-2">
                  <label className={lbl}>Nama Supplier</label>
                  <input className={inp} value={form.nama} onChange={(e) => set('nama', e.target.value)} required />
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Alamat</label>
                  <input className={inp} value={form.alamat} onChange={(e) => set('alamat', e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Kota</label>
                  <input className={inp} value={form.kota} onChange={(e) => set('kota', e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Telp</label>
                  <input className={inp} value={form.telp} onChange={(e) => set('telp', e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Fax</label>
                  <input className={inp} value={form.fax} onChange={(e) => set('fax', e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Email</label>
                  <input type="email" className={inp} value={form.email} onChange={(e) => set('email', e.target.value)} />
                </div>
                <div>
                  <label className={lbl}>Saldo Hutang</label>
                  <input type="number" className={inp} value={form.saldoHutang} onChange={(e) => set('saldoHutang', +e.target.value)} />
                </div>
              </div>
            </fieldset>
          </div>

          {/* Footer */}
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

export default function SupplierPage() {
  const [filtered, setFiltered] = useState<ISupplier[]>([]);
  const [selected, setSelected] = useState<ISupplier | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Debounce: mengetik 7 karakter menghasilkan 1 request, bukan 7.
  const debouncedSearch = useDebouncedValue(search, 250);

  // Pencarian & paginasi dilakukan di server.
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/supplier?q=${encodeURIComponent(debouncedSearch)}&page=${page}&limit=${PAGE_SIZE}`
      );
      if (!res.ok) throw new Error('Gagal memuat data');
      const json = (await res.json()) as PagedResponse<ISupplier>;
      setFiltered(pickList<ISupplier>(json));
      if (json.total >= 0) {
        setTotal(json.total);
        setTotalPages(json.totalPages);
      }
    } catch {
      setError('Gagal memuat data. Pastikan koneksi database aktif.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSave(formData: SupplierInput) {
    setSaving(true);
    setError('');
    try {
      const url = modalMode === 'edit' && selected ? `/api/supplier/${selected._id}` : '/api/supplier';
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
    if (!confirm(`Hapus supplier "${selected.nama}"?\n\nTindakan ini tidak dapat dibatalkan.`)) return;
    setError('');
    try {
      const res = await fetch(`/api/supplier/${selected._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus');
      setSelected(null);
      await fetchData();
    } catch {
      setError('Gagal menghapus data');
    }
  }

  const initialFormData: SupplierInput =
    modalMode === 'edit' && selected
      ? { kode: selected.kode, nama: selected.nama, alamat: selected.alamat, kota: selected.kota, telp: selected.telp, fax: selected.fax, email: selected.email, saldoHutang: selected.saldoHutang }
      : EMPTY_FORM;

  return (
    <div
      className="flex flex-col rounded-lg overflow-hidden shadow-md border border-orange-200 bg-white"
      style={{ height: 'calc(100vh - 185px)' }}
    >
      {/* Title bar */}
      <div className="bg-orange-600 text-white px-4 py-2 font-bold text-sm shrink-0">
        MASTER DATA SUPPLIER
      </div>

      {/* Search bar */}
      <div className="px-3 py-2 border-b border-gray-200 flex items-center gap-3 shrink-0 bg-gray-50">
        <span className="text-xs text-gray-500 font-medium">Cari:</span>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Nama, kode, kota, email..."
          className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400 w-72"
        />
        <span className="text-xs text-gray-400">{total} supplier</span>
        {error && (
          <span className="text-red-500 text-xs ml-auto bg-red-50 border border-red-200 px-2 py-1 rounded">
            {error}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse" style={{ minWidth: '900px' }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-orange-500 text-white">
              <th className="w-5 border-r border-orange-400 px-1" />
              {TABLE_COLS.map((c) => (
                <th
                  key={c.key}
                  className={`${c.cls} px-2 py-2 font-semibold border-r border-orange-400 whitespace-nowrap text-left last:border-r-0`}
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
                    <svg className="animate-spin w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24">
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
                  {search ? 'Tidak ada supplier yang sesuai pencarian.' : 'Belum ada data supplier. Klik Tambah untuk menambahkan.'}
                </td>
              </tr>
            ) : (
              filtered.map((s, i) => {
                const isSelected = selected?._id === s._id;
                return (
                  <tr
                    key={s._id}
                    onClick={() => setSelected(isSelected ? null : s)}
                    onDoubleClick={() => { setSelected(s); setModalMode('edit'); }}
                    className={`cursor-pointer border-b border-gray-100 transition-colors ${
                      isSelected
                        ? 'bg-orange-200 text-orange-900'
                        : i % 2 === 0
                        ? 'bg-white hover:bg-orange-50'
                        : 'bg-gray-50 hover:bg-orange-50'
                    }`}
                  >
                    <td className="border-r border-gray-100 text-center text-gray-300 select-none w-5">≡</td>
                    <td className="px-2 py-1 border-r border-gray-100 font-medium whitespace-nowrap">{s.nama}</td>
                    <td className="px-2 py-1 border-r border-gray-100 whitespace-nowrap">{s.kode}</td>
                    <td className="px-2 py-1 border-r border-gray-100">{s.alamat}</td>
                    <td className="px-2 py-1 border-r border-gray-100 whitespace-nowrap">{s.kota}</td>
                    <td className="px-2 py-1 border-r border-gray-100 whitespace-nowrap">{s.telp}</td>
                    <td className="px-2 py-1 border-r border-gray-100 whitespace-nowrap">{s.fax}</td>
                    <td className="px-2 py-1 border-r border-gray-100 text-gray-500">{s.email}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{s.saldoHutang ? fmt(s.saldoHutang) : ''}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        label="supplier"
        disabled={loading}
        onChange={setPage}
      />

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
          <span className="ml-2 text-xs text-orange-700 bg-orange-50 border border-orange-200 px-2 py-1 rounded">
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
        <SupplierModal
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
