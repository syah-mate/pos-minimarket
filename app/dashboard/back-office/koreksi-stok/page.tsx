'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BarangOption {
  _id: string;
  kode: string;
  nama: string;
  satuanBeli: string;
  stok: number;
  lokasi: string;
}

interface ItemRow {
  _key: string;
  barangId: string;
  namaBarang: string;
  satuan: string;
  stokLalu: number;
  stokKini: number;
  alasan: string;
  selisih: number;
  stok: number;
  lokasi: string;
}

interface KoreksiDoc {
  _id: string;
  refNo: string;
  tanggal: string;
  jenisTransaksi: string;
  items: ItemRow[];
  userName: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n));

function toDateInput(d: Date | string) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}

function todayStr() { return toDateInput(new Date()); }

function fmtDate(d: string | Date): string {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function emptyRow(): ItemRow {
  return {
    _key: Math.random().toString(36).slice(2),
    barangId: '', namaBarang: '', satuan: 'PCS', stokLalu: 0, stokKini: 0,
    alasan: '', selisih: 0, stok: 0, lokasi: '',
  };
}

function ensureEmptyLastRow(rows: ItemRow[]) {
  if (rows.length === 0 || rows[rows.length - 1].barangId !== '') {
    return [...rows, emptyRow()];
  }
  return rows;
}

function computeSelisih(stokLalu: number, stokKini: number) {
  return stokKini - stokLalu;
}

// ─── Barang Picker ────────────────────────────────────────────────────────────

function BarangPicker({ onSelect, onClose }: {
  onSelect: (b: BarangOption) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<BarangOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedRowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => { inputRef.current?.focus(); fetchList(''); }, []);

  useEffect(() => { setSelectedIndex(0); }, [list]);

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
        <div className="bg-blue-700 text-white px-4 py-2 font-bold text-sm flex justify-between">
          <span>PILIH BARANG</span>
          <button onClick={onClose} className="hover:text-red-300">✕</button>
        </div>
        <div className="p-3 border-b">
          <input ref={inputRef} value={q}
            onChange={e => { setQ(e.target.value); fetchList(e.target.value); }}
            onKeyDown={handleInputKeyDown}
            placeholder="Ketik kode atau nama barang..."
            className="border rounded px-2 py-1 text-sm w-full" />
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-blue-600 text-white sticky top-0">
              <tr>
                {['KODE','NAMA BARANG','SATUAN','STOK','LOKASI'].map(h =>
                  <th key={h} className="px-2 py-1 text-left border border-blue-500 whitespace-nowrap">{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="text-center py-6 text-gray-400">Memuat...</td></tr>}
              {!loading && list.map((b, i) => {
                const isSelected = i === selectedIndex;
                return (
                  <tr key={b._id} ref={isSelected ? selectedRowRef : null}
                    onClick={() => onSelect(b)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`cursor-pointer ${isSelected ? 'bg-blue-300 font-semibold' : i % 2 === 0 ? 'bg-white hover:bg-blue-100' : 'bg-blue-50 hover:bg-blue-100'} ${b.stok <= 0 ? 'text-orange-500' : ''}`}>
                    <td className="px-2 py-1 border border-gray-200">{b.kode}</td>
                    <td className="px-2 py-1 border border-gray-200">{b.nama}</td>
                    <td className="px-2 py-1 border border-gray-200">{b.satuanBeli}</td>
                    <td className="px-2 py-1 border border-gray-200 text-right">{b.stok}</td>
                    <td className="px-2 py-1 border border-gray-200">{b.lokasi}</td>
                  </tr>
                );
              })}
              {!loading && list.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-gray-400 italic">Tidak ada data</td></tr>}
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

// ─── Text Cell ─────────────────────────────────────────────────────────────────

function TextCell({ value, onChange, onNavigate, isActive }: {
  value: string;
  onChange: (v: string) => void;
  onNavigate?: (dir: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') => void;
  isActive: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto start/stop editing based on isActive
  useEffect(() => {
    if (isActive) {
      setEditing(true);
    } else if (!isActive && editing) {
      setEditing(false);
    }
  }, [isActive]);

  useEffect(() => {
    if (editing) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [editing]);

  function commitAndClose() {
    setEditing(false);
  }

  return editing ? (
    <input ref={inputRef} type="text" value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={() => commitAndClose()}
      onKeyDown={e => {
        if (e.key === 'Escape') { commitAndClose(); return; }
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
          commitAndClose();
          onNavigate?.(e.key as 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight');
          return;
        }
      }}
      className="w-full bg-yellow-100 border border-orange-400 outline-none text-xs px-1 rounded" />
  ) : (
    <span className="block cursor-pointer text-xs px-1 select-none"
      onClick={() => setEditing(true)}>
      {value || ''}
    </span>
  );
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const EDITABLE_COLS = [1, 4, 5]; // namaBarang(1), stokKini(4), alasan(5) -- stokLalu read-only

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function KoreksiStokPage() {
  // ── List ──
  const [list, setList] = useState<KoreksiDoc[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');

  // ── View ──
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // ── Form header ──
  const [refNo, setRefNo] = useState('');
  const [tanggal, setTanggal] = useState(todayStr());
  const [jenisTransaksi, setJenisTransaksi] = useState('KOREKSI STOK');

  // ── Items ──
  const [items, setItems] = useState<ItemRow[]>([emptyRow()]);
  const [activeRow, setActiveRow] = useState(0);
  const [activeCol, setActiveCol] = useState(1); // 1 = nama barang

  // Ref for latest items
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Number buffer
  const [numberBuffer, setNumberBuffer] = useState<{ row: number; col: number; str: string } | null>(null);
  const numberBufferRef = useRef(numberBuffer);
  numberBufferRef.current = numberBuffer;

  // Apply buffer value for real-time display
  const applyBufferValue = useCallback((rowIdx: number, col: number, val: number) => {
    const row = itemsRef.current[rowIdx];
    if (!row?.barangId) return;
    if (col === 4) updateItem(rowIdx, { stokKini: val });
  }, []);

  const commitBuffer = useCallback(() => {
    const buf = numberBufferRef.current;
    if (!buf || buf.str === '') return;
    const val = parseFloat(buf.str);
    if (isNaN(val)) { setNumberBuffer(null); return; }
    applyBufferValue(buf.row, buf.col, val);
    setNumberBuffer(null);
  }, [applyBufferValue]);

  useEffect(() => {
    const buf = numberBufferRef.current;
    if (buf && (buf.row !== activeRow || buf.col !== activeCol)) {
      commitBuffer();
    }
  }, [activeRow, activeCol, commitBuffer]);

  // ── Pickers ──
  const [showBarangPicker, setShowBarangPicker] = useState(false);
  const [targetRow, setTargetRow] = useState(0);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [scanInput, setScanInput] = useState('');
  const namaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setScanInput(''); }, [activeRow]);

  // Auto-focus/blur nama barang input
  useEffect(() => {
    if (showForm && activeCol === 1) {
      setTimeout(() => namaInputRef.current?.focus(), 50);
    } else if (activeCol !== 1) {
      namaInputRef.current?.blur();
    }
  }, [showForm, activeRow, activeCol]);

  // ── Fetch list ────────────────────────────────────────────────────────────

  const fetchList = useCallback(async (q = '') => {
    setLoadingList(true);
    const res = await fetch(`/api/koreksi-stok?q=${encodeURIComponent(q)}`);
    setList(await res.json());
    setLoadingList(false);
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  // ── Totals ────────────────────────────────────────────────────────────────

  const totalSelisih = items
    .filter(r => r.barangId)
    .reduce((s, r) => s + r.selisih, 0);

  // ── Item helpers ──────────────────────────────────────────────────────────

  function updateItem(idx: number, patch: Partial<ItemRow>) {
    setItems(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const updated = { ...r, ...patch };
      if ('stokLalu' in patch || 'stokKini' in patch) {
        updated.selisih = computeSelisih(updated.stokLalu, updated.stokKini);
      }
      return updated;
    }));
  }

  function applyBarangToRow(idx: number, b: BarangOption) {
    setItems(prev => prev.map((r, i) => i !== idx ? r : {
      ...r,
      barangId: b._id, namaBarang: b.nama,
      satuan: b.satuanBeli || 'PCS',
      stokLalu: b.stok, stokKini: b.stok,
      stok: b.stok, lokasi: b.lokasi,
      selisih: 0, alasan: '',
    }));
  }

  // ── Open new form ─────────────────────────────────────────────────────────

  async function openNewForm() {
    const today = todayStr();
    setEditId(null); setRefNo(''); setTanggal(today);
    setJenisTransaksi('KOREKSI STOK');
    setItems([emptyRow()]); setActiveRow(0); setActiveCol(1);
    setNumberBuffer(null); setError(''); setShowForm(true);
  }

  // ── Open edit form ────────────────────────────────────────────────────────

  async function openEditForm(id: string) {
    const res = await fetch(`/api/koreksi-stok/${id}`);
    const doc = await res.json();
    setEditId(id); setRefNo(doc.refNo); setTanggal(toDateInput(doc.tanggal));
    setJenisTransaksi(doc.jenisTransaksi || 'KOREKSI STOK');
    const loadedItems: ItemRow[] = (doc.items || []).map((it: ItemRow) => ({
      ...it, _key: Math.random().toString(36).slice(2),
      stok: it.stok ?? 0, lokasi: it.lokasi ?? '',
    }));
    setItems(ensureEmptyLastRow(loadedItems));
    setActiveRow(0); setActiveCol(1); setNumberBuffer(null); setError(''); setShowForm(true);
  }

  // ── Barang picker callback ────────────────────────────────────────────────

  function handleSelectBarang(b: BarangOption) {
    applyBarangToRow(targetRow, b);
    setItems(prev => {
      const next = ensureEmptyLastRow(prev);
      setActiveRow(Math.min(targetRow + 1, next.length - 1));
      return next;
    });
    setActiveCol(1);
    setNumberBuffer(null);
    setShowBarangPicker(false);
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    setError('');
    const validItems = items.filter(r => r.barangId);
    if (validItems.length === 0) { setError('Minimal 1 item barang harus diisi.'); return; }
    setSaving(true);
    try {
      const body = {
        refNo: refNo || undefined,
        tanggal,
        jenisTransaksi,
        items: validItems.map(({ _key, ...r }) => r),
      };
      const isEdit = !!editId;
      const url = isEdit ? `/api/koreksi-stok/${editId}` : '/api/koreksi-stok';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) { setError(data.message || 'Gagal menyimpan.'); return; }
      setShowForm(false); setEditId(null); fetchList();
    } finally {
      setSaving(false);
    }
  }

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleHapus() {
    if (!selectedId) return;
    if (!confirm('Hapus koreksi stok ini?')) return;
    await fetch(`/api/koreksi-stok/${selectedId}`, { method: 'DELETE' });
    setSelectedId(null); fetchList();
  }

  // ── Keyboard navigation ───────────────────────────────────────────────────

  useEffect(() => {
    if (!showForm) return;

    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      // Arrow keys → commit buffer, then navigate
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

      // Enter → open picker on nama barang, commit on number cols
      if (e.key === 'Enter') {
        e.preventDefault();
        if (activeCol === 1) {
          commitBuffer();
          setTargetRow(activeRow);
          setShowBarangPicker(true);
        } else {
          commitBuffer();
        }
        return;
      }

      // Backspace → remove last char from buffer
      if (e.key === 'Backspace') {
        const buf = numberBufferRef.current;
        if (buf && buf.row === activeRow && buf.col === activeCol && buf.str.length > 0) {
          e.preventDefault();
          const newStr = buf.str.slice(0, -1);
          if (newStr === '') {
            setNumberBuffer(null);
            applyBufferValue(buf.row, buf.col, 0);
          } else {
            setNumberBuffer({ ...buf, str: newStr });
            applyBufferValue(buf.row, buf.col, parseFloat(newStr));
          }
        }
        return;
      }

      // Number keys (0-9), minus, dot on stokKini → append to buffer
      if (/^[0-9.\-]$/.test(e.key) && activeCol === 4) {
        e.preventDefault();
        const row = itemsRef.current[activeRow];
        if (!row?.barangId) return;

        setNumberBuffer(prev => {
          let newStr: string;
          if (prev && prev.row === activeRow && prev.col === activeCol) {
            if (e.key === '.' && prev.str.includes('.')) return prev;
            if (e.key === '-' && prev.str.length > 0) return prev;
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

  // ── List columns ──────────────────────────────────────────────────────────

  const listCols = ['TANGGAL','NO KOREKSI STOK','JUMLAH BARANG DIKOREKSI','USER'];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ═══════════════════ LIST VIEW ═══════════════════ */}
      {!showForm && (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 185px)' }}>
          {/* Search */}
          <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-600">Cari:</span>
            <input value={searchQ}
              onChange={e => { setSearchQ(e.target.value); fetchList(e.target.value); }}
              placeholder="No koreksi / user..."
              className="border rounded px-2 py-0.5 text-xs flex-1 max-w-xs" />
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto border border-gray-300">
            <table className="w-full border-collapse text-xs min-w-max">
              <thead className="sticky top-0">
                <tr className="bg-blue-600 text-white">
                  {listCols.map(c => (
                    <th key={c} className="px-2 py-1.5 text-left border border-blue-500 whitespace-nowrap font-semibold">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingList && <tr><td colSpan={4} className="text-center py-10 text-gray-400">Memuat...</td></tr>}
                {!loadingList && list.map((t, i) => {
                  const totalSelisih = (t.items || []).reduce((sum: number, it: ItemRow) => sum + it.selisih, 0);
                  return (
                    <tr key={t._id}
                      onClick={() => setSelectedId(t._id === selectedId ? null : t._id)}
                      onDoubleClick={() => openEditForm(t._id)}
                      className={`cursor-pointer border-b border-gray-100 hover:bg-blue-50 ${selectedId === t._id ? 'bg-blue-200' : i % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'}`}>
                      <td className="px-2 py-1 border-r border-gray-200 whitespace-nowrap">{fmtDate(t.tanggal)}</td>
                      <td className="px-2 py-1 border-r border-gray-200 whitespace-nowrap font-medium text-blue-700">{t.refNo}</td>
                      <td className="px-2 py-1 border-r border-gray-200">
                        <span className={totalSelisih < 0 ? 'text-red-600' : totalSelisih > 0 ? 'text-green-600' : ''}>
                          {(t.items || []).length} item ({totalSelisih > 0 ? '+' : ''}{totalSelisih})
                        </span>
                      </td>
                      <td className="px-2 py-1 border-r border-gray-200">{t.userName}</td>
                    </tr>
                  );
                })}
                {!loadingList && list.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-16 text-gray-400 italic">&lt;Belum ada riwayat koreksi stok&gt;</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom buttons */}
          <div className="bg-blue-100 border-t border-blue-300 px-3 py-1.5 flex items-center shrink-0">
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
          </div>
        </div>
      )}

      {/* ═══════════════════ FORM ═══════════════════ */}
      {showForm && (
        <div className="fixed inset-0 z-40 bg-blue-50 flex flex-col" style={{ top: 120 }}>

          {/* Title tab */}
          <div className="bg-gray-200 flex items-end px-2 pt-1 gap-0.5 shrink-0 border-b border-gray-400">
            <div className="px-4 py-1 text-xs font-semibold border border-b-0 rounded-t bg-white border-gray-400 text-blue-800">
              KOREKSI STOK
            </div>
            <div className="ml-auto flex gap-1 pb-1">
              <button className="w-4 h-4 bg-yellow-400 rounded-sm text-[10px] flex items-center justify-center text-black">_</button>
              <button className="w-4 h-4 bg-blue-400 rounded-sm text-[10px] flex items-center justify-center text-white">□</button>
              <button onClick={() => { setShowForm(false); setEditId(null); }}
                className="w-4 h-4 bg-red-500 rounded-sm text-[10px] flex items-center justify-center text-white hover:bg-red-700">✕</button>
            </div>
          </div>

          {/* Header */}
          <div className="bg-blue-100 border-b border-blue-300 px-4 py-2 shrink-0 flex gap-8">
            <div className="flex flex-col gap-1 min-w-125">
              {/* REF NO */}
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold w-36 shrink-0">REF NO</span>
                <input value={refNo} onChange={e => setRefNo(e.target.value)}
                  placeholder="(otomatis)"
                  className="border bg-white px-1 py-0.5 text-xs w-44" />
                <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)}
                  className="border bg-white px-1 py-0.5 text-xs" />
              </div>
              {/* JENIS TRANSAKSI */}
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold w-36 shrink-0">JENIS TRANSAKSI</span>
                <select value={jenisTransaksi} onChange={e => setJenisTransaksi(e.target.value)}
                  className="border bg-white px-1 py-0.5 text-xs">
                  <option value="KOREKSI STOK">KOREKSI STOK</option>
                  <option value="STOK OPNAME">STOK OPNAME</option>
                  <option value="PENYESUAIAN">PENYESUAIAN</option>
                </select>
              </div>
            </div>

            {/* Total selisih */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <p className="text-sm text-gray-500">TOTAL SELISIH</p>
              <p className={`text-6xl font-bold leading-none ${
                totalSelisih < 0 ? 'text-red-600' : totalSelisih > 0 ? 'text-green-600' : 'text-gray-400'
              }`}>
                {totalSelisih > 0 ? '+' : ''}{fmt(totalSelisih)}
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border-b border-red-400 text-red-700 text-xs px-4 py-1 shrink-0">⚠ {error}</div>
          )}

          {/* Item table */}
          <div className="flex-1 overflow-auto bg-white">
            <table className="border-collapse text-xs min-w-max w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-blue-700 text-white">
                  <th className="px-2 py-1 border border-blue-600 w-8 text-center">#</th>
                  <th className="px-2 py-1 border border-blue-600 text-left" style={{ minWidth: 340 }}>NAMA BARANG</th>
                  <th className="px-2 py-1 border border-blue-600 w-20 text-left">SATUAN</th>
                  <th className="px-2 py-1 border border-blue-600 w-24 text-right">STOK LALU</th>
                  <th className="px-2 py-1 border border-blue-600 w-24 text-right">STOK KINI</th>
                  <th className="px-2 py-1 border border-blue-600 text-left" style={{ minWidth: 200 }}>ALASAN</th>
                  <th className="px-2 py-1 border border-blue-600 w-24 text-right">SELISIH</th>
                  <th className="px-2 py-1 border border-blue-600 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => {
                  const isActiveRow = idx === activeRow;
                  const isEmpty = !row.barangId;

                  return (
                    <tr key={row._key} onClick={() => { setActiveRow(idx); setActiveCol(1); }}
                      className={`border-b border-gray-200 ${isActiveRow && isEmpty ? 'bg-yellow-100' : isActiveRow ? 'bg-blue-50' : idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}`}>

                      <td className="px-1 py-0.5 border-r border-gray-200 text-center text-gray-400">
                        {isEmpty ? '' : idx + 1}
                      </td>

                      {/* NAMA BARANG */}
                      <td className={`border-r border-gray-200 p-0 ${isActiveRow && activeCol === 1 ? 'ring-2 ring-orange-400 bg-yellow-100' : ''}`}>
                        <div className="relative">
                          <input ref={isActiveRow ? namaInputRef : undefined}
                            value={(isActiveRow && activeCol === 1) ? scanInput : row.namaBarang} readOnly={!isActiveRow}
                            placeholder={isActiveRow ? 'Ketik kode / nama barang, Enter untuk cari...' : ''}
                            onChange={e => setScanInput(e.target.value)}
                            onFocus={() => { setActiveRow(idx); setActiveCol(1); }}
                            onKeyDown={async e => {
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
                                  const idxC = EDITABLE_COLS.indexOf(prev);
                                  if (idxC === -1) return EDITABLE_COLS[0];
                                  const newIdx = Math.max(0, Math.min(EDITABLE_COLS.length - 1, idxC + dir));
                                  return EDITABLE_COLS[newIdx];
                                });
                                return;
                              }
                              if (e.key !== 'Enter') return;
                              e.preventDefault();
                              const code = scanInput.trim();
                              if (!code) { setTargetRow(idx); setShowBarangPicker(true); return; }
                              // Try exact kode match first
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
                            onClick={() => {
                              setActiveRow(idx); setActiveCol(1);
                              if (!isActiveRow) { setTargetRow(idx); setShowBarangPicker(true); }
                            }}
                            className="w-full px-2 py-0.5 bg-transparent text-gray-900 text-xs cursor-pointer outline-none" />
                          {isActiveRow && row.barangId && (
                            <div className="absolute left-0 bottom-full flex gap-0 text-[10px] z-10 pointer-events-none mb-0.5">
                              <span className="bg-orange-500 text-white px-1 py-0.5">Stok: {row.stok}  Rak: {row.lokasi}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* SATUAN */}
                      <td className="border-r border-gray-200 px-2 py-0.5 text-xs text-center">{row.satuan}</td>

                      {/* STOK LALU (read-only) */}
                      <td className="border-r border-gray-200 px-2 py-0.5 text-right text-xs text-gray-600">
                        {row.barangId ? fmt(row.stokLalu) : ''}
                      </td>

                      {/* STOK KINI */}
                      <td className={`border-r border-gray-200 ${isActiveRow && activeCol === 4 ? 'ring-2 ring-orange-400 bg-yellow-100' : ''}`}>
                        <NumberCell value={row.stokKini}
                          bufferStr={isActiveRow && activeCol === 4 && numberBuffer?.row === idx && numberBuffer?.col === 4 ? numberBuffer.str : undefined}
                          onChange={v => updateItem(idx, { stokKini: v })}
                          onNavigate={(dir) => {
                            setTimeout(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: dir })), 0);
                          }}
                        />
                      </td>

                      {/* ALASAN */}
                      <td className={`border-r border-gray-200 p-0 ${isActiveRow && activeCol === 5 ? 'ring-2 ring-orange-400 bg-yellow-100' : ''}`}>
                        <TextCell
                          value={row.alasan}
                          onChange={v => updateItem(idx, { alasan: v })}
                          isActive={isActiveRow && activeCol === 5}
                          onNavigate={(dir) => {
                            setTimeout(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: dir })), 0);
                          }}
                        />
                      </td>

                      {/* SELISIH */}
                      <td className={`border-r border-gray-200 px-2 py-0.5 text-right font-bold text-xs ${
                        row.selisih < 0 ? 'text-red-600' : row.selisih > 0 ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {row.barangId ? (row.selisih > 0 ? '+' : '') + fmt(row.selisih) : ''}
                      </td>

                      {/* Delete button */}
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
          <div className="bg-blue-100 border-t border-blue-300 px-4 py-2 shrink-0 flex items-end justify-between">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap max-w-md">
                <span>↑↓←→ Navigasi</span>
                <span>|</span>
                <span>Enter: Cari Barang / Edit</span>
                <span>|</span>
                <span>F8: SIMPAN</span>
                <span>|</span>
                <span>ESC: Batal</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="bg-blue-200 border-t border-blue-400 px-3 py-1.5 flex items-center gap-2 shrink-0">
            <button onClick={handleSave} disabled={saving}
              className="px-6 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded">
              {saving ? 'Menyimpan...' : 'SIMPAN (F8)'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); }}
              className="px-6 py-1.5 bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold rounded">
              BATAL (ESC)
            </button>
            <span className="ml-auto text-xs text-gray-500">
              {items.filter(r => r.barangId).length} barang
            </span>
          </div>
        </div>
      )}

      {/* ── PICKERS ──────────────────────────────────────────────────────── */}
      {showBarangPicker && <BarangPicker onSelect={handleSelectBarang} onClose={() => setShowBarangPicker(false)} />}
    </>
  );
}
