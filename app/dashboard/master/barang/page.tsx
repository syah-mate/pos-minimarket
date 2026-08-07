'use client';

import { useState, useEffect, useCallback } from 'react';
import BarangModal, { BarangInput, EMPTY_FORM } from '@/components/BarangModal';
import ImportModal from '@/components/ImportModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface IBarang {
  _id: string;
  kode: string;
  barcode: string;
  nama: string;
  kategori: string;
  subKategori: string;
  hasExpired: boolean;
  expired?: string;
  satuanBeli: string;
  satuanJual: string;
  isi: number;
  hargaBeli: number;
  hargaJual: number;
  hargaJualToko: number;
  hargaJualPartai: number;
  hargaJualCabang: number;
  stok: number;
  stokMinimum: number;
  stokMaksimum: number;
  lokasi: string;
  diskon: number;
  pointMember: number;
  pointKaryawan: number;
  tglBeli?: string;
  supplier: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABLE_COLS = [
  { key: 'nama',        label: 'NAMA',         cls: 'min-w-52' },
  { key: 'kode',        label: 'KODE',         cls: 'min-w-36' },
  { key: 'kategori',    label: 'KATEGORI',     cls: 'min-w-28' },
  { key: 'subKategori', label: 'SUB KATEGORI', cls: 'min-w-28' },
  { key: 'hargaBeli',      label: 'HRG BELI',         cls: 'min-w-24 text-right' },
  { key: 'hargaJualToko',   label: 'HRG JUAL TOKO',    cls: 'min-w-28 text-right' },
  { key: 'hargaJualPartai', label: 'HRG JUAL PARTAI',  cls: 'min-w-28 text-right' },
  { key: 'hargaJualCabang', label: 'HRG JUAL CABANG',  cls: 'min-w-28 text-right' },
  { key: 'stok',        label: 'STOK',         cls: 'min-w-28' },
  { key: 'satuanBeli',  label: 'SAT BELI',     cls: 'min-w-20' },
  { key: 'isi',         label: 'ISI',          cls: 'min-w-12 text-right' },
  { key: 'lokasi',      label: 'LOKASI',       cls: 'min-w-20' },
  { key: 'supplier',    label: 'SUPPLIER',     cls: 'min-w-36' },
  { key: 'tglBeli',     label: 'TGL BELI',     cls: 'min-w-32' },
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (!n && n !== 0) return '';
  return n.toLocaleString('id-ID');
}

function fmtDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${String(d.getDate()).padStart(2,'0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

function toDateInput(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

function stokStatus(stok: number, min: number, max: number): 'normal' | 'kurang' | 'lebih' {
  if (min > 0 && stok < min) return 'kurang';
  if (max > 0 && stok > max) return 'lebih';
  return 'normal';
}

function barangToForm(b: IBarang): BarangInput {
  return {
    kode: b.kode, barcode: b.barcode, nama: b.nama,
    kategori: b.kategori, subKategori: b.subKategori,
    hasExpired: b.hasExpired, expired: toDateInput(b.expired),
    satuanBeli: b.satuanBeli, satuanJual: b.satuanJual, isi: b.isi,
    hargaBeli: b.hargaBeli ?? 0,
    hargaJualToko: b.hargaJualToko ?? b.hargaJual ?? 0, hargaJualPartai: b.hargaJualPartai ?? 0, hargaJualCabang: b.hargaJualCabang ?? 0,
    stok: b.stok ?? 0,
    stokMinimum: b.stokMinimum, stokMaksimum: b.stokMaksimum,
    lokasi: b.lokasi, diskon: b.diskon, pointMember: b.pointMember,
    pointKaryawan: b.pointKaryawan, tglBeli: toDateInput(b.tglBeli),
    supplier: b.supplier,
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BarangPage() {
  const [list, setList] = useState<IBarang[]>([]);
  const [filtered, setFiltered] = useState<IBarang[]>([]);
  const [selected, setSelected] = useState<IBarang | null>(null);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [showImport, setShowImport] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/barang');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}: Gagal memuat data`);
      }
      const data = await res.json();
      setList(data);
      setFiltered(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data. Pastikan koneksi database aktif.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      list.filter(
        (b) =>
          b.nama.toLowerCase().includes(q) ||
          b.kode.toLowerCase().includes(q) ||
          b.kategori.toLowerCase().includes(q) ||
          b.supplier.toLowerCase().includes(q)
      )
    );
  }, [search, list]);

  async function handleSave(formData: BarangInput) {
    setSaving(true);
    setError('');
    try {
      const url = modalMode === 'edit' && selected ? `/api/barang/${selected._id}` : '/api/barang';
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
    if (!confirm(`Hapus barang "${selected.nama}"?\n\nTindakan ini tidak dapat dibatalkan.`)) return;
    setError('');
    try {
      const res = await fetch(`/api/barang/${selected._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus');
      setSelected(null);
      await fetchData();
    } catch {
      setError('Gagal menghapus data');
    }
  }

  const initialFormData: BarangInput =
    modalMode === 'edit' && selected ? barangToForm(selected) : EMPTY_FORM;

  return (
    <div
      className="flex flex-col rounded-lg overflow-hidden shadow-md border border-blue-200 bg-white"
      style={{ height: 'calc(100vh - 185px)' }}
    >
      {/* Title bar */}
      <div className="bg-blue-700 text-white px-4 py-2 font-bold text-sm shrink-0">
        MASTER DATA BARANG (INVENTORY)
      </div>

      {/* Search bar */}
      <div className="px-3 py-2 border-b border-gray-200 flex items-center gap-3 shrink-0 bg-gray-50">
        <span className="text-xs text-gray-500 font-medium">Cari:</span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nama, kode, kategori, supplier..."
          className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 w-72"
        />
        <span className="text-xs text-gray-400">{filtered.length} barang</span>
        {error && (
          <span className="text-red-500 text-xs ml-auto bg-red-50 border border-red-200 px-2 py-1 rounded">
            {error}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse" style={{ minWidth: '1100px' }}>
          <thead className="sticky top-0 z-10">
            <tr className="bg-blue-500 text-white">
              <th className="w-5 border-r border-blue-400 px-1" />
              {TABLE_COLS.map((c) => (
                <th
                  key={c.key}
                  className={`${c.cls} px-2 py-2 font-semibold border-r border-blue-400 whitespace-nowrap text-left last:border-r-0`}
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
                    <svg className="animate-spin w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24">
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
                  {search ? 'Tidak ada barang yang sesuai pencarian.' : 'Belum ada data barang. Klik Tambah untuk menambahkan.'}
                </td>
              </tr>
            ) : (
              filtered.map((b, i) => {
                const isSelected = selected?._id === b._id;
                const status = stokStatus(b.stok, b.stokMinimum, b.stokMaksimum);
                return (
                  <tr
                    key={b._id}
                    onClick={() => setSelected(isSelected ? null : b)}
                    onDoubleClick={() => { setSelected(b); setModalMode('edit'); }}
                    className={`cursor-pointer border-b border-gray-100 transition-colors ${
                      isSelected
                        ? 'bg-blue-200 text-blue-900'
                        : i % 2 === 0
                        ? 'bg-white hover:bg-blue-50'
                        : 'bg-gray-50 hover:bg-blue-50'
                    }`}
                  >
                    <td className="border-r border-gray-100 text-center text-gray-300 select-none w-5">≡</td>
                    <td className="px-2 py-1 border-r border-gray-100 font-medium whitespace-nowrap">{b.nama}</td>
                    <td className="px-2 py-1 border-r border-gray-100 whitespace-nowrap">{b.kode}</td>
                    <td className="px-2 py-1 border-r border-gray-100">{b.kategori}</td>
                    <td className="px-2 py-1 border-r border-gray-100 text-gray-500">{b.subKategori}</td>
                    <td className="px-2 py-1 border-r border-gray-100 text-right tabular-nums">{fmt(b.hargaBeli)}</td>
                    <td className="px-2 py-1 border-r border-gray-100 text-right tabular-nums">{fmt(b.hargaJualToko ?? b.hargaJual)}</td>
                    <td className="px-2 py-1 border-r border-gray-100 text-right tabular-nums">{fmt(b.hargaJualPartai)}</td>
                    <td className="px-2 py-1 border-r border-gray-100 text-right tabular-nums">{fmt(b.hargaJualCabang)}</td>
                    <td className="px-2 py-1 border-r border-gray-100 font-medium whitespace-nowrap">
                      {status === 'kurang' && (
                        <span className="text-red-600">↓ {b.stok > 0 ? `${b.stok} ${b.satuanBeli}` : b.satuanBeli}</span>
                      )}
                      {status === 'lebih' && (
                        <span className="text-orange-500">↑ {b.stok} {b.satuanBeli}</span>
                      )}
                      {status === 'normal' && (
                        <span className="text-green-600">→ {b.stok > 0 ? `${b.stok} ${b.satuanBeli}` : ''}</span>
                      )}
                    </td>
                    <td className="px-2 py-1 border-r border-gray-100">{b.satuanBeli}</td>
                    <td className="px-2 py-1 border-r border-gray-100 text-right tabular-nums">{b.isi}</td>
                    <td className="px-2 py-1 border-r border-gray-100 text-gray-500">{b.lokasi}</td>
                    <td className="px-2 py-1 border-r border-gray-100 text-gray-600 whitespace-nowrap">{b.supplier}</td>
                    <td className="px-2 py-1 text-gray-500 whitespace-nowrap">{fmtDate(b.tglBeli)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex gap-5 px-3 py-1.5 border-t border-gray-200 bg-gray-50 text-xs shrink-0">
        <span className="text-green-600 font-medium">→ Stok Barang Normal</span>
        <span className="text-red-600 font-medium">↓ Kekurangan Stok</span>
        <span className="text-orange-500 font-medium">↑ Kelebihan Stok</span>
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
          onClick={() => setShowImport(true)}
          className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium px-4 py-1.5 rounded shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Import
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
          <span className="ml-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded">
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
        <BarangModal
          initialData={initialFormData}
          onClose={() => setModalMode(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {showImport && (
        <ImportModal
          title="IMPORT DATA BARANG"
          onClose={() => setShowImport(false)}
          onImportSuccess={() => { setShowImport(false); fetchData(); }}
        />
      )}
    </div>
  );
}
