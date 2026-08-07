'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import BarangModal, { BarangInput, EMPTY_FORM } from '@/components/BarangModal';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type JenisJual = 'toko' | 'partai' | 'cabang';

interface BarangOption {
  _id: string;
  kode: string;
  nama: string;
  satuanJual: string;
  hargaJual: number;
  hargaJualToko: number;
  hargaJualPartai: number;
  hargaJualCabang: number;
  stok: number;
  lokasi: string;
  diskon: number;
}

interface PelangganOption {
  _id: string;
  kode: string;
  nama: string;
  alamat: string;
  telp: string;
  diskonPenjualan: number;
  saldoPiutang: number;
}

interface KasOption {
  _id: string;
  kode: string;
  nama: string;
  saldo: number;
}

interface KaryawanOption {
  _id: string;
  kode: string;
  nama: string;
}

interface CabangOption {
  _id: string;
  kodeCabang: string;
  namaCabang: string;
  alamatCabang: string;
}

interface ItemRow {
  _key: string;
  barangId: string;
  namaBarang: string;
  satuan: string;
  stok: number;
  lokasi: string;
  qty: number;
  harga: number;
  discPct: number;
  discRp: number;
  subtotal: number;
}

type PembayaranType = 'Cash' | '1 Minggu' | '2 Minggu' | '3 Minggu' | '4 Minggu' | 'Custom';

interface JualDoc {
  _id: string;
  refNo: string;
  tanggal: string;
  jenis: JenisJual;
  pelangganKode: string;
  pelangganNama: string;
  pelangganAlamat: string;
  operator: string;
  grandTotal: number;
  pembayaran: string;
  jatuhTempo: string | null;
  keterangan: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n));

function toDateInput(d: Date | string) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}

function todayStr() { return toDateInput(new Date()); }

function emptyRow(): ItemRow {
  return {
    _key: Math.random().toString(36).slice(2),
    barangId: '', namaBarang: '', satuan: '', stok: 0, lokasi: '',
    qty: 0, harga: 0, discPct: 0, discRp: 0, subtotal: 0,
  };
}

function computeSubtotal(row: ItemRow) {
  return Math.max(0, row.qty * row.harga - row.discRp);
}

function ensureEmptyLastRow(rows: ItemRow[]) {
  if (rows.length === 0 || rows[rows.length - 1].barangId !== '') {
    return [...rows, emptyRow()];
  }
  return rows;
}

// ─── Pelanggan Picker ──────────────────────────────────────────────────────────

function PelangganPicker({ onSelect, onClose }: {
  onSelect: (p: PelangganOption) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<PelangganOption[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); fetchList(''); }, []);

  async function fetchList(search: string) {
    setLoading(true);
    const res = await fetch(`/api/pelanggan?q=${encodeURIComponent(search)}`);
    setList(await res.json());
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded shadow-xl w-175 max-h-[80vh] flex flex-col">
        <div className="bg-green-700 text-white px-4 py-2 font-bold text-sm flex justify-between">
          <span>PILIH PELANGGAN</span>
          <button onClick={onClose} className="hover:text-red-300">✕</button>
        </div>
        <div className="p-3 border-b">
          <input ref={inputRef} value={q}
            onChange={e => { setQ(e.target.value); fetchList(e.target.value); }}
            placeholder="Cari nama / kode / alamat..."
            className="border rounded px-2 py-1 text-sm w-full" />
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-green-600 text-white sticky top-0">
              <tr>{['KODE','NAMA','ALAMAT','TELP','DISKON%','PIUTANG'].map(h =>
                <th key={h} className="px-2 py-1 text-left border border-green-500">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="text-center py-6 text-gray-400">Memuat...</td></tr>}
              {!loading && list.map((p, i) => (
                <tr key={p._id} onClick={() => onSelect(p)}
                  className={`cursor-pointer hover:bg-green-100 ${i % 2 === 0 ? 'bg-white' : 'bg-green-50'}`}>
                  <td className="px-2 py-1 border border-gray-200">{p.kode}</td>
                  <td className="px-2 py-1 border border-gray-200">{p.nama}</td>
                  <td className="px-2 py-1 border border-gray-200">{p.alamat}</td>
                  <td className="px-2 py-1 border border-gray-200">{p.telp}</td>
                  <td className="px-2 py-1 border border-gray-200 text-right">{p.diskonPenjualan}</td>
                  <td className="px-2 py-1 border border-gray-200 text-right">{fmt(p.saldoPiutang)}</td>
                </tr>
              ))}
              {!loading && list.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-gray-400 italic">Tidak ada data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Kas Picker ────────────────────────────────────────────────────────────────

function KasPicker({ onSelect, onClose }: {
  onSelect: (k: KasOption) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<KasOption[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    fetch('/api/kas').then(r => r.json()).then(setList);
  }, []);

  const filtered = list.filter(k =>
    k.nama.toLowerCase().includes(q.toLowerCase()) || k.kode.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded shadow-xl w-112.5 max-h-[60vh] flex flex-col">
        <div className="bg-green-700 text-white px-4 py-2 font-bold text-sm flex justify-between">
          <span>PILIH KAS</span>
          <button onClick={onClose} className="hover:text-red-300">✕</button>
        </div>
        <div className="p-3 border-b">
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Cari kode / nama..." className="border rounded px-2 py-1 text-sm w-full" />
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-green-600 text-white sticky top-0">
              <tr>{['KODE','NAMA','SALDO'].map(h =>
                <th key={h} className="px-2 py-1 text-left border border-green-500">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((k, i) => (
                <tr key={k._id} onClick={() => onSelect(k)}
                  className={`cursor-pointer hover:bg-green-100 ${i % 2 === 0 ? 'bg-white' : 'bg-green-50'}`}>
                  <td className="px-2 py-1 border border-gray-200">{k.kode}</td>
                  <td className="px-2 py-1 border border-gray-200">{k.nama}</td>
                  <td className="px-2 py-1 border border-gray-200 text-right">{fmt(k.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Karyawan Picker ───────────────────────────────────────────────────────────

function KaryawanPicker({ onSelect, onClose }: {
  onSelect: (k: KaryawanOption) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<KaryawanOption[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    fetch('/api/karyawan').then(r => r.json()).then(setList);
  }, []);

  const filtered = list.filter(k =>
    k.nama.toLowerCase().includes(q.toLowerCase()) || k.kode.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded shadow-xl w-100 max-h-[60vh] flex flex-col">
        <div className="bg-green-700 text-white px-4 py-2 font-bold text-sm flex justify-between">
          <span>PILIH SPG / KARYAWAN</span>
          <button onClick={onClose} className="hover:text-red-300">✕</button>
        </div>
        <div className="p-3 border-b">
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Cari kode / nama..." className="border rounded px-2 py-1 text-sm w-full" />
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-green-600 text-white sticky top-0">
              <tr>{['KODE','NAMA'].map(h =>
                <th key={h} className="px-2 py-1 text-left border border-green-500">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((k, i) => (
                <tr key={k._id} onClick={() => onSelect(k)}
                  className={`cursor-pointer hover:bg-green-100 ${i % 2 === 0 ? 'bg-white' : 'bg-green-50'}`}>
                  <td className="px-2 py-1 border border-gray-200">{k.kode}</td>
                  <td className="px-2 py-1 border border-gray-200">{k.nama}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Barang Picker ─────────────────────────────────────────────────────────────

function BarangPicker({ jenis, onSelect, onClose, onAddBarang, refreshKey }: {
  jenis: JenisJual;
  onSelect: (b: BarangOption) => void;
  onClose: () => void;
  onAddBarang: () => void;
  refreshKey: number;
}) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<BarangOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const selectedRowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => { inputRef.current?.focus(); fetchList(''); }, []);

  // Refetch when refreshKey changes
  useEffect(() => {
    if (refreshKey > 0) fetchList(q);
  }, [refreshKey]);

  // Reset selection when list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [list]);

  // Scroll selected row into view
  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  async function fetchList(search: string) {
    setLoading(true);
    const res = await fetch(`/api/barang?q=${encodeURIComponent(search)}&limit=100`);
    const json = await res.json();
    setList(json.data || []);
    setLoading(false);
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, list.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (list.length > 0 && list[selectedIndex]) {
        onSelect(list[selectedIndex]);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded shadow-xl w-200 max-h-[80vh] flex flex-col">
        <div className="bg-green-700 text-white px-4 py-2 font-bold text-sm flex justify-between">
          <span>PILIH BARANG</span>
          <button onClick={onClose} className="hover:text-red-300">✕</button>
        </div>
        <div className="p-3 border-b flex gap-2">
          <input ref={inputRef} value={q}
            onChange={e => { setQ(e.target.value); fetchList(e.target.value); }}
            onKeyDown={handleInputKeyDown}
            placeholder="Scan barcode, atau ketik kode / nama barang..."
            className="border rounded px-2 py-1 text-sm flex-1" />
          <button
            onClick={onAddBarang}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded whitespace-nowrap"
          >
            + Tambah Barang Baru
          </button>
        </div>
        <div ref={listContainerRef} className="overflow-auto flex-1">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-green-600 text-white sticky top-0">
              <tr>{['KODE','NAMA BARANG','SATUAN','STOK','LOKASI',
                jenis === 'toko' ? 'HRG JUAL TOKO' : jenis === 'partai' ? 'HRG JUAL PARTAI' : 'HRG JUAL CABANG',
                'DISKON%'].map(h =>
                <th key={h} className="px-2 py-1 text-left border border-green-500 whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="text-center py-6 text-gray-400">Memuat...</td></tr>}
              {!loading && list.map((b, i) => {
                const harga = jenis === 'toko'
                  ? (b.hargaJualToko || b.hargaJual)
                  : jenis === 'partai'
                  ? (b.hargaJualPartai || b.hargaJual)
                  : (b.hargaJualCabang || b.hargaJual);
                const isSelected = i === selectedIndex;
                return (
                  <tr key={b._id} ref={isSelected ? selectedRowRef : null}
                    onClick={() => onSelect(b)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`cursor-pointer ${isSelected ? 'bg-green-300 font-semibold' : i % 2 === 0 ? 'bg-white hover:bg-green-100' : 'bg-green-50 hover:bg-green-100'} ${b.stok <= 0 ? 'text-orange-500' : ''}`}>
                    <td className="px-2 py-1 border border-gray-200">{b.kode}</td>
                    <td className="px-2 py-1 border border-gray-200">{b.nama}</td>
                    <td className="px-2 py-1 border border-gray-200">{b.satuanJual}</td>
                    <td className="px-2 py-1 border border-gray-200 text-right">{b.stok}</td>
                    <td className="px-2 py-1 border border-gray-200">{b.lokasi}</td>
                    <td className="px-2 py-1 border border-gray-200 text-right">{fmt(harga)}</td>
                    <td className="px-2 py-1 border border-gray-200 text-right">{b.diskon}</td>
                  </tr>
                );
              })}
              {!loading && list.length === 0 && <tr><td colSpan={7} className="text-center py-6 text-gray-400 italic">Tidak ada data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Cabang Picker ─────────────────────────────────────────────────────────────

function CabangPicker({ onSelect, onClose }: {
  onSelect: (c: CabangOption) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<CabangOption[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    fetch('/api/cabang').then(r => r.json()).then(setList);
  }, []);

  const filtered = list.filter(c =>
    c.namaCabang.toLowerCase().includes(q.toLowerCase()) ||
    c.kodeCabang.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded shadow-xl w-112.5 max-h-[60vh] flex flex-col">
        <div className="bg-green-700 text-white px-4 py-2 font-bold text-sm flex justify-between">
          <span>PILIH CABANG</span>
          <button onClick={onClose} className="hover:text-red-300">✕</button>
        </div>
        <div className="p-3 border-b">
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Cari kode / nama cabang..." className="border rounded px-2 py-1 text-sm w-full" />
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-green-600 text-white sticky top-0">
              <tr>{['KODE', 'NAMA CABANG', 'ALAMAT'].map(h =>
                <th key={h} className="px-2 py-1 text-left border border-green-500">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c._id} onClick={() => onSelect(c)}
                  className={`cursor-pointer hover:bg-green-100 ${i % 2 === 0 ? 'bg-white' : 'bg-green-50'}`}>
                  <td className="px-2 py-1 border border-gray-200">{c.kodeCabang}</td>
                  <td className="px-2 py-1 border border-gray-200">{c.namaCabang}</td>
                  <td className="px-2 py-1 border border-gray-200">{c.alamatCabang}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={3} className="text-center py-6 text-gray-400 italic">Tidak ada data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Number Cell ───────────────────────────────────────────────────────────────

function NumberCell({ value, onChange, onNavigate, bufferStr }: {
  value: number;
  onChange: (v: number) => void;
  onNavigate?: (dir: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') => void;
  bufferStr?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (editing) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [editing]);

  function commitAndClose() {
    onChange(parseFloat(raw) || 0);
    setEditing(false);
  }

  const showBuffer = bufferStr && bufferStr.length > 0;

  return editing ? (
    <input ref={inputRef} type="number" value={raw}
      onChange={e => setRaw(e.target.value)}
      onBlur={() => commitAndClose()}
      onKeyDown={e => {
        if (e.key === 'Enter') { commitAndClose(); return; }
        if (e.key === 'Escape') { setEditing(false); return; }
        // Arrow keys: commit value + close + let parent navigate
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
          commitAndClose();
          onNavigate?.(e.key as 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight');
          return;
        }
      }}
      className="w-full text-right bg-yellow-100 border border-orange-400 outline-none text-xs px-1 rounded" />
  ) : (
    <span className={`block text-right cursor-pointer text-xs px-1 select-none rounded ${showBuffer ? 'text-blue-700 font-bold' : ''}`}
      onClick={() => { setRaw(String(value || '')); setEditing(true); }}>
      {showBuffer ? bufferStr : value === 0 ? '' : fmt(value)}
    </span>
  );
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const EDITABLE_COLS = [1, 3, 4, 5, 6]; // namaBarang, qty, harga, discPct, discRp

// ─── Main Component ────────────────────────────────────────────────────────────

interface JualBaseProps {
  jenis: JenisJual;
}

function JualBaseContent({ jenis }: JualBaseProps) {
  const router = useRouter();

  // List
  const [list, setList] = useState<JualDoc[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');

  // View
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form header
  const [refNo, setRefNo] = useState('');
  const [tanggal, setTanggal] = useState(todayStr());
  const [pelangganId, setPelangganId] = useState('');
  const [pelangganKode, setPelangganKode] = useState('');
  const [pelangganNama, setPelangganNama] = useState('');
  const [pelangganAlamat, setPelangganAlamat] = useState('');
  const [kasId, setKasId] = useState('');
  const [kasKode, setKasKode] = useState('');
  const [kasNama, setKasNama] = useState('');
  const [spg, setSpg] = useState('');
  const [pembayaran, setPembayaran] = useState<PembayaranType>('Cash');
  const [tempoHari, setTempoHari] = useState(0);
  const [keterangan, setKeterangan] = useState('');
  const [disc, setDisc] = useState(0);
  const [ppn, setPpn] = useState(0);
  const [cetakNota, setCetakNota] = useState(true);

  // Cabang
  const [cabangId, setCabangId] = useState('');
  const [cabangKode, setCabangKode] = useState('');
  const [cabangNama, setCabangNama] = useState('');

  // Items
  const [items, setItems] = useState<ItemRow[]>([emptyRow()]);
  const [activeRow, setActiveRow] = useState(0);
  const [activeCol, setActiveCol] = useState(1); // 1 = nama barang

  // Ref for latest items (used by keyboard handler)
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Number input buffer for multi-digit typing
  const [numberBuffer, setNumberBuffer] = useState<{ row: number; col: number; str: string } | null>(null);
  const numberBufferRef = useRef(numberBuffer);
  numberBufferRef.current = numberBuffer;

  // Apply a buffer value to the actual item (called on each keystroke for real-time totals)
  const applyBufferValue = useCallback((rowIdx: number, col: number, val: number) => {
    const row = itemsRef.current[rowIdx];
    if (!row?.barangId) return;

    if (col === 3) { // qty
      const discRp = Math.round(val * row.harga * (row.discPct / 100));
      updateItem(rowIdx, { qty: val, discRp });
    } else if (col === 4) { // harga
      const discRp = Math.round(row.qty * val * (row.discPct / 100));
      updateItem(rowIdx, { harga: val, discRp });
    } else if (col === 5) { // discPct
      updateItem(rowIdx, { discPct: val });
    } else if (col === 6) { // discRp
      updateItem(rowIdx, { discRp: val });
    }
  }, []);

  // Commit buffer to actual value
  const commitBuffer = useCallback(() => {
    const buf = numberBufferRef.current;
    if (!buf || buf.str === '') return;
    const val = parseFloat(buf.str);
    if (isNaN(val)) { setNumberBuffer(null); return; }
    applyBufferValue(buf.row, buf.col, val);
    setNumberBuffer(null);
  }, [applyBufferValue]);

  // Clear buffer when active cell changes (row or col)
  useEffect(() => {
    const buf = numberBufferRef.current;
    if (buf && (buf.row !== activeRow || buf.col !== activeCol)) {
      commitBuffer();
    }
  }, [activeRow, activeCol, commitBuffer]);

  // Pickers
  const [showPelangganPicker, setShowPelangganPicker] = useState(false);
  const [showKasPicker, setShowKasPicker] = useState(false);
  const [showBarangPicker, setShowBarangPicker] = useState(false);
  const [showKaryawanPicker, setShowKaryawanPicker] = useState(false);
  const [showCabangPicker, setShowCabangPicker] = useState(false);
  const [targetRow, setTargetRow] = useState(0);

  // Add barang modal
  const [showAddBarangModal, setShowAddBarangModal] = useState(false);
  const [savingBarang, setSavingBarang] = useState(false);
  const [barangRefreshKey, setBarangRefreshKey] = useState(0);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [scanInput, setScanInput] = useState(''); // barcode / kode typing
  const namaInputRef = useRef<HTMLInputElement>(null);

  // Clear scan input when active row changes
  useEffect(() => { setScanInput(''); }, [activeRow]);

  // Auto-focus/blur nama barang input
  useEffect(() => {
    if (showForm && activeCol === 1) {
      setTimeout(() => namaInputRef.current?.focus(), 50);
    } else if (activeCol !== 1) {
      namaInputRef.current?.blur();
    }
  }, [showForm, activeRow, activeCol]);

  // ── Fetch list ─────────────────────────────────────────────────────────────

  const fetchList = useCallback(async (q = '') => {
    setLoadingList(true);
    const res = await fetch(`/api/transaksi-jual?jenis=${jenis}&q=${encodeURIComponent(q)}`);
    setList(await res.json());
    setLoadingList(false);
  }, [jenis]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // ── Totals ─────────────────────────────────────────────────────────────────

  const subtotal = items.reduce((s, r) => s + r.subtotal, 0);
  const discAmount = subtotal * (disc / 100);
  const afterDisc = subtotal - discAmount;
  const ppnAmount = afterDisc * (ppn / 100);
  const grandTotal = afterDisc + ppnAmount;

  // ── Item helpers ───────────────────────────────────────────────────────────

  function updateItem(idx: number, patch: Partial<ItemRow>) {
    setItems(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const updated = { ...r, ...patch };
      if ('discPct' in patch && !('discRp' in patch)) {
        updated.discRp = Math.round(updated.qty * updated.harga * (updated.discPct / 100));
      }
      if ('discRp' in patch && !('discPct' in patch)) {
        const base = updated.qty * updated.harga;
        updated.discPct = base > 0 ? Math.round((updated.discRp / base) * 10000) / 100 : 0;
      }
      updated.subtotal = computeSubtotal(updated);
      return updated;
    }));
  }

  function applyBarangToRow(idx: number, b: BarangOption) {
    const harga = jenis === 'toko'
      ? (b.hargaJualToko || b.hargaJual)
      : jenis === 'partai'
      ? (b.hargaJualPartai || b.hargaJual)
      : (b.hargaJualCabang || b.hargaJual);
    const discPct = b.diskon;
    const qty = 1;
    const discRp = Math.round(qty * harga * (discPct / 100));
    setItems(prev => prev.map((r, i) => i !== idx ? r : {
      ...r,
      barangId: b._id, namaBarang: b.nama,
      satuan: b.satuanJual, stok: b.stok, lokasi: b.lokasi,
      qty, harga, discPct, discRp,
      subtotal: Math.max(0, qty * harga - discRp),
    }));
  }

  // ── Open new form ──────────────────────────────────────────────────────────

  async function openNewForm() {
    const today = todayStr();
    const [refRes, kasRes] = await Promise.all([
      fetch(`/api/transaksi-jual?action=next-ref&date=${today}`),
      fetch('/api/kas?q=KAS+TOKO'),
    ]);
    const { refNo: nr } = await refRes.json();
    const kasList: KasOption[] = await kasRes.json();
    const defaultKas = kasList.find(k => k.nama.toUpperCase() === 'KAS TOKO') ?? kasList[0] ?? null;
    setEditId(null); setRefNo(nr); setTanggal(today);
    setPelangganId(''); setPelangganKode(''); setPelangganNama(''); setPelangganAlamat('');
    setKasId(defaultKas?._id ?? ''); setKasKode(defaultKas?.kode ?? ''); setKasNama(defaultKas?.nama ?? '');
    setCabangId(''); setCabangKode(''); setCabangNama('');
    setSpg(''); setPembayaran('Cash'); setTempoHari(0); setKeterangan('');
    setDisc(0); setPpn(0); setCetakNota(true);
    setItems([emptyRow()]); setActiveRow(0); setActiveCol(1); setNumberBuffer(null); setError('');
    setShowForm(true);
  }

  // ── Open edit form ─────────────────────────────────────────────────────────

  async function openEditForm(id: string) {
    const res = await fetch(`/api/transaksi-jual/${id}`);
    const doc = await res.json();
    setEditId(id); setRefNo(doc.refNo); setTanggal(toDateInput(doc.tanggal));
    setPelangganId(doc.pelangganId || ''); setPelangganKode(doc.pelangganKode || '');
    setPelangganNama(doc.pelangganNama || ''); setPelangganAlamat(doc.pelangganAlamat || '');
    setKasId(doc.kasId || ''); setKasKode(doc.kasKode || ''); setKasNama(doc.kasNama || '');
    setCabangId(doc.cabangId || ''); setCabangKode(doc.cabangKode || ''); setCabangNama(doc.cabangNama || '');
    setSpg(doc.spg || ''); setPembayaran((doc.pembayaran as PembayaranType) || 'Cash');
    setTempoHari(doc.tempoHari || 0);
    setKeterangan(doc.keterangan || '');
    setDisc(doc.disc || 0); setPpn(doc.ppn || 0); setCetakNota(doc.cetakNota ?? true);
    const loadedItems: ItemRow[] = (doc.items || []).map((it: Omit<ItemRow, '_key'>) => ({
      ...it, _key: Math.random().toString(36).slice(2),
    }));
    setItems(ensureEmptyLastRow(loadedItems));
    setActiveRow(0); setActiveCol(1); setNumberBuffer(null); setError(''); setShowForm(true);
  }

  // ── Picker callbacks ───────────────────────────────────────────────────────

  function handleSelectPelanggan(p: PelangganOption) {
    setPelangganId(p._id); setPelangganKode(p.kode);
    setPelangganNama(p.nama); setPelangganAlamat(p.alamat);
    setShowPelangganPicker(false);
  }

  function handleSelectKas(k: KasOption) {
    setKasId(k._id); setKasKode(k.kode); setKasNama(k.nama);
    setShowKasPicker(false);
  }

  function handleSelectKaryawan(k: KaryawanOption) {
    setSpg(k.nama); setShowKaryawanPicker(false);
  }

  function handleSelectCabang(c: CabangOption) {
    setCabangId(c._id); setCabangKode(c.kodeCabang); setCabangNama(c.namaCabang);
    setShowCabangPicker(false);
  }

  function handleSelectBarang(b: BarangOption) {
    applyBarangToRow(targetRow, b);
    setItems(prev => {
      const next = ensureEmptyLastRow(prev);
      // After selecting, move active row to the next row, nama barang column
      setActiveRow(Math.min(targetRow + 1, next.length - 1));
      return next;
    });
    setActiveCol(1);
    setNumberBuffer(null);
    setShowBarangPicker(false);
  }

  // ── Add barang handler ──────────────────────────────────────────────────

  async function handleSaveBarang(data: BarangInput) {
    setSavingBarang(true);
    try {
      const res = await fetch('/api/barang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || 'Gagal menambah barang');
        return;
      }
      setShowAddBarangModal(false);
      setBarangRefreshKey(prev => prev + 1);
    } finally {
      setSavingBarang(false);
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    setError('');
    const validItems = items.filter(r => r.barangId && r.qty > 0);
    if (validItems.length === 0) { setError('Minimal 1 item barang harus diisi.'); return; }
    setSaving(true);
    try {
      const resolvedTempoHari = pembayaran === '1 Minggu' ? 7
        : pembayaran === '2 Minggu' ? 14
        : pembayaran === '3 Minggu' ? 21
        : pembayaran === '4 Minggu' ? 28
        : pembayaran === 'Custom'   ? tempoHari
        : 0;
      const jatuhTempo = pembayaran !== 'Cash' && resolvedTempoHari > 0
        ? (() => { const d = new Date(tanggal); d.setDate(d.getDate() + resolvedTempoHari); return d.toISOString(); })()
        : null;
      const body = {
        refNo, tanggal, jenis, pelangganId, pelangganKode, pelangganNama, pelangganAlamat,
        kasId, kasKode, kasNama, spg, pembayaran, tempoHari: resolvedTempoHari, jatuhTempo, keterangan,
        cabangId, cabangKode, cabangNama,
        disc, ppn, subtotal, grandTotal, cetakNota,
        items: validItems.map(({ _key, ...r }) => r),
        operator: 'admin',
      };
      const isEdit = !!editId;
      const url = isEdit ? `/api/transaksi-jual/${editId}` : '/api/transaksi-jual';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) { setError(data.error || 'Gagal menyimpan.'); return; }
      setShowForm(false); setEditId(null); fetchList();
    } finally {
      setSaving(false);
    }
  }

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleHapus() {
    if (!selectedId) return;
    if (!confirm('Hapus transaksi ini? Stok barang akan dikembalikan.')) return;
    await fetch(`/api/transaksi-jual/${selectedId}`, { method: 'DELETE' });
    setSelectedId(null); fetchList();
  }

  // ── Keyboard navigation ──────────────────────────────────────────────────

  useEffect(() => {
    if (!showForm) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept when typing in an input/select/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      // Arrow keys → commit buffer first, then navigate
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        commitBuffer();
        setActiveRow(prev => Math.max(0, prev - 1));
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        commitBuffer();
        setActiveRow(prev => Math.min(itemsRef.current.length - 1, prev + 1));
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        commitBuffer();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        setActiveCol(prev => {
          const idx = EDITABLE_COLS.indexOf(prev);
          if (idx === -1) return EDITABLE_COLS[0];
          const newIdx = Math.max(0, Math.min(EDITABLE_COLS.length - 1, idx + dir));
          return EDITABLE_COLS[newIdx];
        });
        return;
      }

      // Enter → open picker on nama barang, commit buffer on number cols
      if (e.key === 'Enter') {
        e.preventDefault();
        if (activeCol === 1) {
          commitBuffer();
          setTargetRow(activeRow);
          setShowBarangPicker(true);
        } else {
          // Commit buffer on number column
          commitBuffer();
        }
        return;
      }

      // Backspace → remove last char from buffer + update value
      if (e.key === 'Backspace') {
        const buf = numberBufferRef.current;
        if (buf && buf.row === activeRow && buf.col === activeCol && buf.str.length > 0) {
          e.preventDefault();
          const newStr = buf.str.slice(0, -1);
          if (newStr === '') {
            setNumberBuffer(null);
            // Reset value to 0
            applyBufferValue(buf.row, buf.col, 0);
          } else {
            setNumberBuffer({ ...buf, str: newStr });
            applyBufferValue(buf.row, buf.col, parseFloat(newStr));
          }
        }
        return;
      }

      // Number keys (0-9) or dot on number columns → append to buffer + update value
      if (/^[0-9.]$/.test(e.key) && EDITABLE_COLS.slice(1).includes(activeCol)) {
        e.preventDefault();
        const row = itemsRef.current[activeRow];
        if (!row?.barangId) return; // don't edit empty rows

        setNumberBuffer(prev => {
          let newStr: string;
          if (prev && prev.row === activeRow && prev.col === activeCol) {
            if (e.key === '.' && prev.str.includes('.')) return prev;
            newStr = prev.str + e.key;
          } else {
            newStr = e.key;
          }
          const val = parseFloat(newStr);
          if (!isNaN(val)) {
            applyBufferValue(activeRow, activeCol, val);
          }
          return { row: activeRow, col: activeCol, str: newStr };
        });
        return;
      }

      // F8 → Save
      if (e.key === 'F8') {
        e.preventDefault();
        handleSaveRef.current();
        return;
      }

      // Escape → Close form
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowForm(false);
        setEditId(null);
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showForm, activeRow, activeCol, items.length]);

  // ─── Render ────────────────────────────────────────────────────────────────

  const jenisLabel = jenis === 'toko' ? 'TOKO' : jenis === 'partai' ? 'PARTAI' : 'CABANG';
  const listCols = ['NO. FAKTUR','TANGGAL','KODE PELANGGAN','NAMA PELANGGAN','ALAMAT PELANGGAN','OPERATOR','JUMLAH','PEMBAYARAN','JATUH TEMPO','KETERANGAN'];

  return (
    <>
      {/* ── LIST VIEW ───────────────────────────────────────────────────── */}
      {!showForm && (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 185px)' }}>
          {/* Search */}
          <div className="bg-green-50 border border-green-200 px-3 py-1.5 flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-600">Cari:</span>
            <input value={searchQ}
              onChange={e => { setSearchQ(e.target.value); fetchList(e.target.value); }}
              placeholder="No faktur / pelanggan / keterangan..."
              className="border rounded px-2 py-0.5 text-xs flex-1 max-w-xs" />
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto border border-gray-300">
            <table className="w-full border-collapse text-xs min-w-max">
              <thead className="sticky top-0">
                <tr className="bg-green-600 text-white">
                  {listCols.map(c => (
                    <th key={c} className="px-2 py-1.5 text-left border border-green-500 whitespace-nowrap font-semibold">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingList && <tr><td colSpan={10} className="text-center py-10 text-gray-400">Memuat...</td></tr>}
                {!loadingList && list.map((t, i) => (
                  <tr key={t._id}
                    onClick={() => setSelectedId(t._id === selectedId ? null : t._id)}
                    onDoubleClick={() => openEditForm(t._id)}
                    className={`cursor-pointer border-b border-gray-100 hover:bg-green-50 ${selectedId === t._id ? 'bg-green-200' : i % 2 === 0 ? 'bg-white' : 'bg-green-50/40'}`}>
                    <td className="px-2 py-1 border-r border-gray-200 whitespace-nowrap">{t.refNo}</td>
                    <td className="px-2 py-1 border-r border-gray-200 whitespace-nowrap">
                      {t.tanggal ? new Date(t.tanggal).toLocaleDateString('id-ID') : ''}
                    </td>
                    <td className="px-2 py-1 border-r border-gray-200">{t.pelangganKode}</td>
                    <td className="px-2 py-1 border-r border-gray-200">{t.pelangganNama}</td>
                    <td className="px-2 py-1 border-r border-gray-200">{t.pelangganAlamat}</td>
                    <td className="px-2 py-1 border-r border-gray-200">{t.operator}</td>
                    <td className="px-2 py-1 border-r border-gray-200 text-right">{fmt(t.grandTotal)}</td>
                    <td className="px-2 py-1 border-r border-gray-200 whitespace-nowrap">
                      {t.pembayaran === 'Cash'
                        ? <span className="text-green-700 font-semibold">Cash</span>
                        : <span className="text-orange-600 font-semibold">{t.pembayaran}</span>}
                    </td>
                    <td className="px-2 py-1 border-r border-gray-200 whitespace-nowrap text-red-600">
                      {t.jatuhTempo ? new Date(t.jatuhTempo).toLocaleDateString('id-ID') : ''}
                    </td>
                    <td className="px-2 py-1 border-r border-gray-200">{t.keterangan}</td>
                  </tr>
                ))}
                {!loadingList && list.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-16 text-gray-400 italic">&lt;No data to display&gt;</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom buttons */}
          <div className="bg-green-100 border-t border-green-300 px-3 py-1.5 flex items-center shrink-0">
            <div className="flex gap-1">
              <button onClick={openNewForm}
                className="px-4 py-1 rounded-full bg-gray-200 hover:bg-gray-300 text-xs font-semibold border border-gray-400">
                Tambah
              </button>
              <button onClick={() => selectedId && openEditForm(selectedId)} disabled={!selectedId}
                className="px-4 py-1 rounded-full bg-gray-200 hover:bg-gray-300 text-xs font-semibold border border-gray-400 disabled:opacity-40">
                Edit
              </button>
              <button onClick={handleHapus} disabled={!selectedId}
                className="px-4 py-1 rounded-full bg-gray-200 hover:bg-gray-300 text-xs font-semibold border border-gray-400 disabled:opacity-40">
                Hapus
              </button>
            </div>
            <div className="ml-auto">
              <button onClick={() => router.push('/dashboard/transaksi/jual/toko')}
                className="px-4 py-1 rounded-full bg-gray-200 hover:bg-gray-300 text-xs font-semibold border border-gray-400">
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FORM ────────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-40 bg-green-50 flex flex-col" style={{ top: 120 }}>

          {/* Title tab */}
          <div className="bg-gray-200 flex items-end px-2 pt-1 gap-0.5 shrink-0 border-b border-gray-400">
            <div className="px-4 py-1 text-xs font-semibold border border-b-0 rounded-t bg-white border-gray-400 text-green-800">
              PENJUALAN {jenisLabel}
            </div>
            <div className="ml-auto flex gap-1 pb-1">
              <button className="w-4 h-4 bg-yellow-400 rounded-sm text-[10px] flex items-center justify-center text-black">_</button>
              <button className="w-4 h-4 bg-blue-400 rounded-sm text-[10px] flex items-center justify-center text-white">□</button>
              <button onClick={() => { setShowForm(false); setEditId(null); }}
                className="w-4 h-4 bg-red-500 rounded-sm text-[10px] flex items-center justify-center text-white hover:bg-red-700">✕</button>
            </div>
          </div>

          {/* Header */}
          <div className="bg-green-100 border-b border-green-300 px-4 py-2 shrink-0 flex gap-8">
            <div className="flex flex-col gap-1 min-w-105">
              {/* REF NO */}
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold w-36 shrink-0">REF NO</span>
                <input value={refNo} onChange={e => setRefNo(e.target.value)}
                  className="border bg-white px-1 py-0.5 text-xs w-36" />
                <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)}
                  className="border bg-white px-1 py-0.5 text-xs" />
              </div>
              {/* PELANGGAN */}
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold w-36 shrink-0">KODE | NAMA PELANGGAN</span>
                <input value={pelangganKode} readOnly placeholder="Kode..." onClick={() => setShowPelangganPicker(true)}
                  onKeyDown={e => { if (e.key === 'Enter') setShowPelangganPicker(true); }}
                  className="border bg-white px-1 py-0.5 text-xs w-20 cursor-pointer" />
                <input value={pelangganNama} readOnly onClick={() => setShowPelangganPicker(true)}
                  className="border bg-white px-1 py-0.5 text-xs w-44 cursor-pointer" />
              </div>
              {/* ALAMAT */}
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold w-36 shrink-0">ALAMAT PELANGGAN</span>
                <input value={pelangganAlamat} readOnly
                  className="border bg-gray-100 px-1 py-0.5 text-xs w-64" />
              </div>
              {/* KAS */}
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold w-36 shrink-0">KODE KAS [F12]</span>
                <input value={kasKode} readOnly placeholder="Klik..." onClick={() => setShowKasPicker(true)}
                  onKeyDown={e => { if (e.key === 'Enter') setShowKasPicker(true); }}
                  className="border bg-white px-1 py-0.5 text-xs w-24 cursor-pointer" />
                <span className="text-xs text-gray-600 mx-1">SPG</span>
                <input value={spg} readOnly placeholder="Pilih..." onClick={() => setShowKaryawanPicker(true)}
                  className="border bg-white px-1 py-0.5 text-xs w-32 cursor-pointer" />
              </div>
              {/* PEMBAYARAN */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs font-semibold w-36 shrink-0">PEMBAYARAN</span>
                <select value={pembayaran} onChange={e => { setPembayaran(e.target.value as PembayaranType); setTempoHari(0); }}
                  className="border bg-white px-1 py-0.5 text-xs">
                  <option value="Cash">Cash</option>
                  <option value="1 Minggu">1 Minggu</option>
                  <option value="2 Minggu">2 Minggu</option>
                  <option value="3 Minggu">3 Minggu</option>
                  <option value="4 Minggu">4 Minggu</option>
                  <option value="Custom">Custom</option>
                </select>
                {pembayaran === 'Custom' && (
                  <>
                    <input type="number" min={1} value={tempoHari || ''}
                      onChange={e => setTempoHari(parseInt(e.target.value) || 0)}
                      placeholder="Hari"
                      className="border bg-white px-1 py-0.5 text-xs w-16 text-right" />
                    <span className="text-xs text-gray-500">hari</span>
                  </>
                )}
                {pembayaran !== 'Cash' && (() => {
                  const days = pembayaran === '1 Minggu' ? 7 : pembayaran === '2 Minggu' ? 14
                    : pembayaran === '3 Minggu' ? 21 : pembayaran === '4 Minggu' ? 28 : tempoHari;
                  if (!days || !tanggal) return null;
                  const d = new Date(tanggal); d.setDate(d.getDate() + days);
                  return <span className="text-xs text-red-600 font-semibold ml-1">Jatuh: {d.toLocaleDateString('id-ID')}</span>;
                })()}
              </div>
              {/* CABANG (only for jenis cabang) */}
              {jenis === 'cabang' && (
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold w-36 shrink-0">KODE | NAMA CABANG</span>
                  <input value={cabangKode} readOnly placeholder="Kode..." onClick={() => setShowCabangPicker(true)}
                    onKeyDown={e => { if (e.key === 'Enter') setShowCabangPicker(true); }}
                    className="border bg-white px-1 py-0.5 text-xs w-20 cursor-pointer" />
                  <input value={cabangNama} readOnly onClick={() => setShowCabangPicker(true)}
                    className="border bg-white px-1 py-0.5 text-xs w-44 cursor-pointer" />
                </div>
              )}
            </div>

            {/* Grand total */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <p className="text-8xl font-bold text-red-600 leading-none">{fmt(grandTotal)}</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border-b border-red-400 text-red-700 text-xs px-4 py-1 shrink-0">⚠ {error}</div>
          )}

          {/* Item table */}
          <div className="flex-1 overflow-auto bg-white">
            <table className="border-collapse text-xs min-w-max w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-green-700 text-white">
                  <th className="px-2 py-1 border border-green-600 w-8 text-center">#</th>
                  <th className="px-2 py-1 border border-green-600 text-left" style={{ minWidth: 340 }}>NAMA BARANG</th>
                  <th className="px-2 py-1 border border-green-600 w-20 text-left">SATUAN</th>
                  <th className="px-2 py-1 border border-green-600 w-16 text-right">QTY</th>
                  <th className="px-2 py-1 border border-green-600 w-28 text-right">HARGA</th>
                  <th className="px-2 py-1 border border-green-600 w-16 text-right">DSC.%</th>
                  <th className="px-2 py-1 border border-green-600 w-24 text-right">DSC.Rp</th>
                  <th className="px-2 py-1 border border-green-600 w-28 text-right">SUBTOTAL</th>
                  <th className="px-2 py-1 border border-green-600 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => {
                  const isActiveRow = idx === activeRow;
                  const isEmpty = !row.barangId;

                  return (
                    <tr key={row._key} onClick={() => { setActiveRow(idx); setActiveCol(1); }}
                      className={`border-b border-gray-200 ${isActiveRow && isEmpty ? 'bg-yellow-100' : isActiveRow ? 'bg-green-50' : idx % 2 === 0 ? 'bg-white' : 'bg-green-50/30'}`}>

                      <td className="px-1 py-0.5 border-r border-gray-200 text-center text-gray-400">
                        {isEmpty ? '' : idx + 1}
                      </td>

                      <td className={`border-r border-gray-200 p-0 ${isActiveRow && activeCol === 1 ? 'ring-2 ring-orange-400 bg-yellow-100' : ''}`}>
                        <div className="relative">
                          <input ref={isActiveRow ? namaInputRef : undefined}
                            value={(isActiveRow && activeCol === 1) ? scanInput : row.namaBarang} readOnly={!isActiveRow}
                            placeholder={isActiveRow ? 'Scan Barcode, atau ketik kode atau nama barang...!!!' : ''}
                            onChange={e => setScanInput(e.target.value)}
                            onFocus={() => { setActiveRow(idx); setActiveCol(1); }}
                            onKeyDown={async e => {
                              // Arrow keys → navigate (since input is always focused)
                              if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                commitBuffer();
                                setActiveRow(prev => Math.max(0, prev - 1));
                                return;
                              }
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                commitBuffer();
                                setActiveRow(prev => Math.min(items.length - 1, prev + 1));
                                return;
                              }
                              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                                e.preventDefault();
                                commitBuffer();
                                const dir = e.key === 'ArrowRight' ? 1 : -1;
                                setActiveCol(prev => {
                                  const idx = EDITABLE_COLS.indexOf(prev);
                                  if (idx === -1) return EDITABLE_COLS[0];
                                  const newIdx = Math.max(0, Math.min(EDITABLE_COLS.length - 1, idx + dir));
                                  return EDITABLE_COLS[newIdx];
                                });
                                return;
                              }
                              if (e.key !== 'Enter') return;
                              const code = scanInput.trim();
                              if (!code) { setTargetRow(idx); setShowBarangPicker(true); return; }
                              // Try exact kode match
                              const res = await fetch('/api/barang?q=' + encodeURIComponent(code) + '&limit=5');
                              const json = await res.json();
                              const list: BarangOption[] = json.data || [];
                              const exact = list.find(b => b.kode.toUpperCase() === code.toUpperCase());
                              if (exact) {
                                applyBarangToRow(idx, exact);
                                setItems(prev => {
                                  const next = ensureEmptyLastRow(prev);
                                  setActiveRow(Math.min(idx + 1, next.length - 1));
                                  return next;
                                });
                                setActiveCol(1);
                                setNumberBuffer(null);
                                setScanInput('');
                              } else {
                                setTargetRow(idx);
                                setShowBarangPicker(true);
                              }
                            }}
                            onClick={() => { setActiveRow(idx); setActiveCol(1); if (!isActiveRow) { setTargetRow(idx); setShowBarangPicker(true); } }}
                            className="w-full px-2 py-0.5 bg-transparent text-gray-900 text-xs cursor-pointer outline-none" />
                          {isActiveRow && row.barangId && (
                            <div className="absolute left-0 bottom-full flex gap-0 text-[10px] z-10 pointer-events-none mb-0.5">
                              <span className="bg-orange-500 text-white px-1 py-0.5">Stok: {row.stok}  Rak: {row.lokasi}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="border-r border-gray-200 px-2 py-0.5 text-xs">{row.satuan}</td>

                      <td className={`border-r border-gray-200 ${isActiveRow && activeCol === 3 ? 'ring-2 ring-orange-400 bg-yellow-100' : ''}`}>
                        <NumberCell value={row.qty}
                          bufferStr={isActiveRow && activeCol === 3 && numberBuffer?.row === idx && numberBuffer?.col === 3 ? numberBuffer.str : undefined}
                          onChange={v => {
                            const discRp = Math.round(v * row.harga * (row.discPct / 100));
                            updateItem(idx, { qty: v, discRp });
                          }}
                          onNavigate={(dir) => {
                            // Dispatch arrow key so global handler navigates
                            setTimeout(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: dir })), 0);
                          }}
                        />
                      </td>

                      <td className={`border-r border-gray-200 ${isActiveRow && activeCol === 4 ? 'ring-2 ring-orange-400 bg-yellow-100' : ''}`}>
                        <NumberCell value={row.harga}
                          bufferStr={isActiveRow && activeCol === 4 && numberBuffer?.row === idx && numberBuffer?.col === 4 ? numberBuffer.str : undefined}
                          onChange={v => {
                            const discRp = Math.round(row.qty * v * (row.discPct / 100));
                            updateItem(idx, { harga: v, discRp });
                          }}
                          onNavigate={(dir) => {
                            setTimeout(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: dir })), 0);
                          }}
                        />
                      </td>

                      <td className={`border-r border-gray-200 ${isActiveRow && activeCol === 5 ? 'ring-2 ring-orange-400 bg-yellow-100' : ''}`}>
                        <NumberCell value={row.discPct}
                          bufferStr={isActiveRow && activeCol === 5 && numberBuffer?.row === idx && numberBuffer?.col === 5 ? numberBuffer.str : undefined}
                          onChange={v => updateItem(idx, { discPct: v })}
                          onNavigate={(dir) => {
                            setTimeout(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: dir })), 0);
                          }}
                        />
                      </td>

                      <td className={`border-r border-gray-200 ${isActiveRow && activeCol === 6 ? 'ring-2 ring-orange-400 bg-yellow-100' : ''}`}>
                        <NumberCell value={row.discRp}
                          bufferStr={isActiveRow && activeCol === 6 && numberBuffer?.row === idx && numberBuffer?.col === 6 ? numberBuffer.str : undefined}
                          onChange={v => updateItem(idx, { discRp: v })}
                          onNavigate={(dir) => {
                            setTimeout(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: dir })), 0);
                          }}
                        />
                      </td>

                      <td className="border-r border-gray-200 px-1 text-right font-semibold text-green-900 text-xs">
                        {row.subtotal === 0 ? '' : fmt(row.subtotal)}
                      </td>

                      <td className="px-1 text-center">
                        {row.barangId && (
                          <button onClick={e => {
                            e.stopPropagation();
                            const next = ensureEmptyLastRow(items.filter((_, i) => i !== idx));
                            setItems(next);
                            setActiveRow(Math.min(activeRow, next.length - 1));
                          }} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom section */}
          <div className="bg-green-100 border-t border-green-300 px-4 py-2 shrink-0 flex items-end justify-between">
            <div className="flex flex-col gap-0.5">
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input type="checkbox" checked={cetakNota} onChange={e => setCetakNota(e.target.checked)} />
                Print
              </label>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap max-w-md">
                <span>↑↓←→ Navigasi</span>
                <span>|</span>
                <span>Enter: Pilih Barang / Edit</span>
                <span>|</span>
                <span>F8: SIMPAN</span>
                <span>|</span>
                <span>ESC: Batal</span>
              </div>
              <input value={keterangan} onChange={e => setKeterangan(e.target.value)}
                placeholder="Keterangan..."
                className="border bg-white px-1 py-0.5 text-xs w-48 mt-1" />
            </div>

            <div className="flex flex-col gap-1 min-w-75">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs w-24 text-right">SUBTOTAL</span>
                <input readOnly value={fmt(subtotal)} className="border bg-gray-100 text-right text-xs px-1 py-0.5 w-36 rounded" />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs w-24 text-right">DISC. (%)</span>
                <input type="number" value={disc} min={0} max={100}
                  onChange={e => setDisc(parseFloat(e.target.value) || 0)}
                  className="border bg-white text-right text-xs px-1 py-0.5 w-14 rounded" />
                <input readOnly value={fmt(discAmount)} className="border bg-gray-100 text-right text-xs px-1 py-0.5 w-20 rounded" />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs w-24 text-right">PPN (%)</span>
                <input type="number" value={ppn} min={0}
                  onChange={e => setPpn(parseFloat(e.target.value) || 0)}
                  className="border bg-white text-right text-xs px-1 py-0.5 w-14 rounded" />
                <input readOnly value={fmt(ppnAmount)} className="border bg-gray-100 text-right text-xs px-1 py-0.5 w-20 rounded" />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs w-24 text-right font-bold">GRANDTOTAL</span>
                <input readOnly value={fmt(grandTotal)} className="border bg-green-900 text-white text-right text-xs px-1 py-0.5 w-36 font-bold rounded" />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="bg-green-200 border-t border-green-400 px-3 py-1.5 flex items-center gap-2 shrink-0">
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-1.5 bg-green-700 hover:bg-green-800 text-white text-xs font-bold rounded">
              {saving ? 'Menyimpan...' : 'SIMPAN (F8)'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); }}
              className="px-6 py-1.5 bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold rounded">
              BATAL (ESC)
            </button>
          </div>
        </div>
      )}

      {/* ── PICKERS ──────────────────────────────────────────────────────── */}
      {showPelangganPicker && <PelangganPicker onSelect={handleSelectPelanggan} onClose={() => setShowPelangganPicker(false)} />}
      {showKasPicker && <KasPicker onSelect={handleSelectKas} onClose={() => setShowKasPicker(false)} />}
      {showKaryawanPicker && <KaryawanPicker onSelect={handleSelectKaryawan} onClose={() => setShowKaryawanPicker(false)} />}
      {showBarangPicker && <BarangPicker jenis={jenis} onSelect={handleSelectBarang} onClose={() => setShowBarangPicker(false)} onAddBarang={() => setShowAddBarangModal(true)} refreshKey={barangRefreshKey} />}
      {showCabangPicker && <CabangPicker onSelect={handleSelectCabang} onClose={() => setShowCabangPicker(false)} />}
      {showAddBarangModal && (
        <BarangModal
          initialData={EMPTY_FORM}
          onClose={() => setShowAddBarangModal(false)}
          onSave={handleSaveBarang}
          saving={savingBarang}
        />
      )}
    </>
  );
}

export default function JualBase({ jenis }: JualBaseProps) {
  return (
    <Suspense fallback={null}>
      <JualBaseContent jenis={jenis} />
    </Suspense>
  );
}
