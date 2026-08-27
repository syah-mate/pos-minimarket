'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { pickList } from '@/lib/apiList';
import { useDebouncedCallback } from '@/app/hooks/useDebouncedCallback';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BarangOption {
  _id: string;
  kode: string;
  nama: string;
  satuanJual: string;
  satuanBeli: string;
  isi: number;
  stok: number;
}

interface ReturnPembelianOption {
  _id: string;
  refNo: string;
  tanggal: string;
  namaBarang: string;
  qty: number;
  satuan: string;
}

interface TerimaDoc {
  _id: string;
  refNo: string;
  tanggal: string;
  barangId: string;
  namaBarang: string;
  satuan: string;
  satuanType: 'jual' | 'beli';
  isi: number;
  refReturn: string;
  tglReturn: string | null;
  snLama: string;
  qttyTerima: number;
  keterangan: string;
  snBaru: string;
  operator: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toDateInput(d: string | Date | null | undefined) {
  if (!d) return '';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}
function todayStr() { return toDateInput(new Date()); }

// ─── Barang Picker ─────────────────────────────────────────────────────────────

function BarangPicker({ initialQ = '', onSelect, onClose }: {
  initialQ?: string;
  onSelect: (b: BarangOption) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState(initialQ);
  const [list, setList] = useState<BarangOption[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); fetchList(initialQ); }, [initialQ]);

  async function fetchList(search: string) {
    setLoading(true);
    const res = await fetch(`/api/barang?q=${encodeURIComponent(search)}&limit=100`);
    const json = await res.json();
    setList(json.data || []);
    setLoading(false);
  }
  // Debounce: mengetik 7 karakter menghasilkan 1 request, bukan 7.
  const debouncedFetchList = useDebouncedCallback(fetchList);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded shadow-xl w-175 max-h-[80vh] flex flex-col">
        <div className="bg-purple-700 text-white px-4 py-2 font-bold text-sm flex justify-between">
          <span>CARI BARANG</span>
          <button onClick={onClose} className="hover:text-red-300">✕</button>
        </div>
        <div className="p-3 border-b">
          <input ref={inputRef} value={q}
            onChange={e => { setQ(e.target.value); debouncedFetchList(e.target.value); }}
            placeholder="Ketik kode / nama barang..."
            className="border rounded px-2 py-1 text-sm w-full" />
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-purple-600 text-white sticky top-0">
              <tr>{['KODE','NAMA BARANG','STN JUAL','STN BELI','ISI','STOK'].map(h =>
                <th key={h} className="px-2 py-1 text-left border border-purple-500 whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="text-center py-6 text-gray-400">Memuat...</td></tr>}
              {!loading && list.map((b, i) => (
                <tr key={b._id} onClick={() => onSelect(b)}
                  className={`cursor-pointer hover:bg-purple-100 ${i % 2 === 0 ? 'bg-white' : 'bg-purple-50'}`}>
                  <td className="px-2 py-1 border border-gray-200">{b.kode}</td>
                  <td className="px-2 py-1 border border-gray-200">{b.nama}</td>
                  <td className="px-2 py-1 border border-gray-200">{b.satuanJual}</td>
                  <td className="px-2 py-1 border border-gray-200">{b.satuanBeli}</td>
                  <td className="px-2 py-1 border border-gray-200 text-right">{b.isi}</td>
                  <td className="px-2 py-1 border border-gray-200 text-right">{b.stok}</td>
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

// ─── Return Pembelian Picker ───────────────────────────────────────────────────

function ReturnPicker({ initialQ = '', barangId = '', onSelect, onClose }: {
  initialQ?: string;
  barangId?: string;
  onSelect: (r: ReturnPembelianOption) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState(initialQ);
  const [list, setList] = useState<ReturnPembelianOption[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); fetchList(initialQ); }, [initialQ]);

  async function fetchList(search: string) {
    setLoading(true);
    const params = new URLSearchParams({ q: search });
    if (barangId) params.set('barangId', barangId);
    const res = await fetch(`/api/return-pembelian?${params}`);
    setList(pickList<ReturnPembelianOption>(await res.json()));
    setLoading(false);
  }
  // Debounce: mengetik 7 karakter menghasilkan 1 request, bukan 7.
  const debouncedFetchList = useDebouncedCallback(fetchList);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded shadow-xl w-175 max-h-[80vh] flex flex-col">
        <div className="bg-purple-700 text-white px-4 py-2 font-bold text-sm flex justify-between">
          <span>CARI RETURN PEMBELIAN</span>
          <button onClick={onClose} className="hover:text-red-300">✕</button>
        </div>
        <div className="p-3 border-b">
          <input ref={inputRef} value={q}
            onChange={e => { setQ(e.target.value); debouncedFetchList(e.target.value); }}
            placeholder="Ketik no. ref / nama barang..."
            className="border rounded px-2 py-1 text-sm w-full" />
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-purple-600 text-white sticky top-0">
              <tr>{['NO. REF','TANGGAL','NAMA BARANG','QTY','SATUAN'].map(h =>
                <th key={h} className="px-2 py-1 text-left border border-purple-500 whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="text-center py-6 text-gray-400">Memuat...</td></tr>}
              {!loading && list.map((r, i) => (
                <tr key={r._id} onClick={() => onSelect(r)}
                  className={`cursor-pointer hover:bg-purple-100 ${i % 2 === 0 ? 'bg-white' : 'bg-purple-50'}`}>
                  <td className="px-2 py-1 border border-gray-200">{r.refNo}</td>
                  <td className="px-2 py-1 border border-gray-200 whitespace-nowrap">
                    {r.tanggal ? new Date(r.tanggal).toLocaleDateString('id-ID') : ''}
                  </td>
                  <td className="px-2 py-1 border border-gray-200">{r.namaBarang}</td>
                  <td className="px-2 py-1 border border-gray-200 text-right">{r.qty}</td>
                  <td className="px-2 py-1 border border-gray-200">{r.satuan}</td>
                </tr>
              ))}
              {!loading && list.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-gray-400 italic">Tidak ada data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function TerimaReturnPage() {
  // List
  const [list, setList] = useState<TerimaDoc[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');

  // Form mode
  const [mode, setMode] = useState<'view' | 'tambah' | 'edit'>('view');
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [refNo, setRefNo] = useState('');
  const [tanggal, setTanggal] = useState(todayStr());
  const [barangId, setBarangId] = useState('');
  const [namaBarang, setNamaBarang] = useState('');
  const [namaBarangInput, setNamaBarangInput] = useState('');
  const [satuan, setSatuan] = useState('');
  const [satuanType, setSatuanType] = useState<'jual' | 'beli'>('jual');
  const [isi, setIsi] = useState(1);
  const [satuanOptions, setSatuanOptions] = useState<{ value: 'jual' | 'beli'; label: string }[]>([]);
  const [refReturn, setRefReturn] = useState('');
  const [refReturnInput, setRefReturnInput] = useState('');
  const [tglReturn, setTglReturn] = useState('');
  const [snLama, setSnLama] = useState('');
  const [qttyTerima, setQttyTerima] = useState(0);
  const [keterangan, setKeterangan] = useState('');
  const [snBaru, setSnBaru] = useState('');
  const [operator] = useState('admin');

  // Pickers
  const [showBarangPicker, setShowBarangPicker] = useState(false);
  const [showReturnPicker, setShowReturnPicker] = useState(false);
  const [barangPickerQ, setBarangPickerQ] = useState('');
  const [returnPickerQ, setReturnPickerQ] = useState('');

  const isActive = mode !== 'view';

  // ── Fetch list ─────────────────────────────────────────────────────────────

  const fetchList = useCallback(async (q = '') => {
    setLoadingList(true);
    const res = await fetch(`/api/terima-return?q=${encodeURIComponent(q)}`);
    setList(pickList<TerimaDoc>(await res.json()));
    setLoadingList(false);
  }, []);
  // Debounce: mengetik 7 karakter menghasilkan 1 request, bukan 7.
  const debouncedFetchList = useDebouncedCallback(fetchList);

  useEffect(() => { fetchList(); }, [fetchList]);

  // ── Reset form ─────────────────────────────────────────────────────────────

  function resetForm() {
    setEditId(null); setRefNo(''); setTanggal(todayStr());
    setBarangId(''); setNamaBarang(''); setNamaBarangInput('');
    setSatuan(''); setSatuanType('jual'); setIsi(1); setSatuanOptions([]);
    setRefReturn(''); setRefReturnInput(''); setTglReturn('');
    setSnLama(''); setQttyTerima(0); setKeterangan(''); setSnBaru('');
    setError('');
  }

  // ── Tambah ─────────────────────────────────────────────────────────────────

  async function handleTambah() {
    resetForm();
    const today = todayStr();
    const res = await fetch(`/api/terima-return?action=next-ref&date=${today}`);
    const { refNo: nr } = await res.json();
    setRefNo(nr); setTanggal(today);
    setMode('tambah');
  }

  // ── Edit ───────────────────────────────────────────────────────────────────

  async function handleEdit() {
    if (!selectedId) return;
    const res = await fetch(`/api/terima-return/${selectedId}`);
    const doc: TerimaDoc = await res.json();
    setEditId(doc._id);
    setRefNo(doc.refNo); setTanggal(toDateInput(doc.tanggal));
    setBarangId(doc.barangId); setNamaBarang(doc.namaBarang); setNamaBarangInput(doc.namaBarang);
    setSatuanOptions([{ value: doc.satuanType, label: doc.satuan }]);
    setSatuan(doc.satuan); setSatuanType(doc.satuanType); setIsi(doc.isi);
    setRefReturn(doc.refReturn); setRefReturnInput(doc.refReturn);
    setTglReturn(toDateInput(doc.tglReturn));
    setSnLama(doc.snLama); setQttyTerima(doc.qttyTerima);
    setKeterangan(doc.keterangan); setSnBaru(doc.snBaru);
    setError(''); setMode('edit');
  }

  // ── Batal ──────────────────────────────────────────────────────────────────

  function handleBatal() { resetForm(); setMode('view'); }

  // ── Barang selected ────────────────────────────────────────────────────────

  function handleSelectBarang(b: BarangOption) {
    setBarangId(b._id); setNamaBarang(b.nama); setNamaBarangInput(b.nama);
    const opts: { value: 'jual' | 'beli'; label: string }[] = [
      { value: 'jual', label: b.satuanJual },
    ];
    if (b.satuanBeli && b.satuanBeli !== b.satuanJual) {
      opts.push({ value: 'beli', label: b.satuanBeli });
    }
    setSatuanOptions(opts);
    setSatuanType('jual'); setSatuan(b.satuanJual); setIsi(b.isi);
    // Clear ref return when barang changes
    setRefReturn(''); setRefReturnInput(''); setTglReturn('');
    setShowBarangPicker(false);
  }

  function handleSatuanChange(val: 'jual' | 'beli') {
    const opt = satuanOptions.find(o => o.value === val);
    setSatuanType(val);
    if (opt) setSatuan(opt.label);
  }

  // ── Return selected ────────────────────────────────────────────────────────

  function handleSelectReturn(r: ReturnPembelianOption) {
    setRefReturn(r.refNo); setRefReturnInput(r.refNo);
    setTglReturn(toDateInput(r.tanggal));
    setShowReturnPicker(false);
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSimpan() {
    setError('');
    if (!barangId) { setError('Nama barang harus dipilih.'); return; }
    if (qttyTerima <= 0) { setError('QTTY Terima harus lebih dari 0.'); return; }
    setSaving(true);
    try {
      const body = {
        refNo, tanggal, barangId, namaBarang, satuan, satuanType, isi,
        refReturn, tglReturn: tglReturn || null,
        snLama, qttyTerima, keterangan, snBaru, operator,
      };
      const isEdit = mode === 'edit';
      const url = isEdit ? `/api/terima-return/${editId}` : '/api/terima-return';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Gagal menyimpan.'); return; }
      resetForm(); setMode('view'); setSelectedId(null); fetchList();
    } finally {
      setSaving(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex" style={{ height: 'calc(100vh - 185px)' }}>

      {/* ── LEFT PANEL ──────────────────────────────────────────────────── */}
      <div className="flex flex-col border-r border-gray-300 bg-gray-50" style={{ width: 240 }}>
        {/* List header */}
        <div className="grid grid-cols-2 bg-purple-700 text-white text-xs font-semibold shrink-0">
          <div className="px-2 py-1 border-r border-purple-500">TANGGAL</div>
          <div className="px-2 py-1">NO. REF</div>
        </div>

        {/* List rows */}
        <div className="flex-1 overflow-auto">
          {loadingList && <p className="text-center text-xs text-gray-400 py-4">Memuat...</p>}
          {!loadingList && list.map((r, i) => (
            <div key={r._id}
              onClick={() => setSelectedId(r._id === selectedId ? null : r._id)}
              onDoubleClick={() => { setSelectedId(r._id); setTimeout(() => handleEdit(), 0); }}
              className={`grid grid-cols-2 text-xs cursor-pointer border-b border-gray-200
                ${selectedId === r._id ? 'bg-purple-600 text-white' : i % 2 === 0 ? 'bg-white hover:bg-purple-50' : 'bg-purple-50 hover:bg-purple-100'}`}>
              <div className="px-2 py-0.5 border-r border-gray-200 whitespace-nowrap">
                {new Date(r.tanggal).toLocaleDateString('id-ID')}
              </div>
              <div className="px-2 py-0.5 whitespace-nowrap">{r.refNo}</div>
            </div>
          ))}
          {!loadingList && list.length === 0 && (
            <p className="text-center text-xs text-gray-400 italic py-6">Tidak ada data</p>
          )}
        </div>

        {/* Search */}
        <div className="p-1.5 border-t border-gray-300">
          <input value={searchQ}
            onChange={e => { setSearchQ(e.target.value); debouncedFetchList(e.target.value); }}
            placeholder="Pencarian"
            className="border rounded px-2 py-0.5 text-xs w-full" />
        </div>
      </div>

      {/* ── RIGHT PANEL ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-blue-50">

        {/* Form area */}
        <div className="flex-1 overflow-auto p-4">
          {/* Top: TANGGAL + NO REF */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold w-20">TANGGAL</span>
              <span className="text-xs">:</span>
              <input type="date" value={tanggal} disabled={!isActive}
                onChange={e => setTanggal(e.target.value)}
                className="border px-2 py-0.5 text-xs disabled:bg-gray-100 bg-white w-36" />
            </div>
            <div className="flex items-center gap-2 ml-4">
              <span className="text-xs font-semibold">NO REF</span>
              <input readOnly value={refNo}
                className="border bg-gray-100 px-2 py-0.5 text-xs w-36 font-semibold" />
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 text-xs px-3 py-1 rounded mb-3">⚠ {error}</div>
          )}

          {/* Fields */}
          <div className="grid gap-y-2" style={{ gridTemplateColumns: '110px 12px 1fr' }}>

            {/* NAMA BARANG */}
            <label className="text-xs font-semibold self-center">NAMA BARANG</label>
            <span className="text-xs self-center">:</span>
            <div className="flex gap-2 items-center">
              <input value={namaBarangInput} disabled={!isActive}
                onChange={e => setNamaBarangInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && isActive) {
                    setBarangPickerQ(namaBarangInput); setShowBarangPicker(true);
                  }
                }}
                placeholder={isActive ? 'Ketik + Enter untuk cari...' : ''}
                className="border px-2 py-0.5 text-xs disabled:bg-gray-100 bg-white w-64" />
              {isActive && (
                <button onClick={() => { setBarangPickerQ(namaBarangInput); setShowBarangPicker(true); }}
                  className="border bg-gray-200 hover:bg-gray-300 px-2 py-0.5 text-xs rounded">
                  Cari
                </button>
              )}
            </div>

            {/* SATUAN */}
            <label className="text-xs font-semibold self-center">SATUAN</label>
            <span className="text-xs self-center">:</span>
            <div>
              {isActive && satuanOptions.length > 1 ? (
                <select value={satuanType} onChange={e => handleSatuanChange(e.target.value as 'jual' | 'beli')}
                  className="border px-2 py-0.5 text-xs bg-white w-36">
                  {satuanOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input value={satuan} readOnly disabled={!isActive}
                  className="border px-2 py-0.5 text-xs disabled:bg-gray-100 bg-gray-100 w-36" />
              )}
            </div>

            {/* REF RETURN */}
            <label className="text-xs font-semibold self-center">REF RETURN</label>
            <span className="text-xs self-center">:</span>
            <div className="flex gap-2 items-center">
              <input value={refReturnInput} disabled={!isActive}
                onChange={e => setRefReturnInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && isActive) {
                    setReturnPickerQ(refReturnInput); setShowReturnPicker(true);
                  }
                }}
                placeholder={isActive ? 'Ketik + Enter untuk cari...' : ''}
                className="border px-2 py-0.5 text-xs disabled:bg-gray-100 bg-white w-40" />
              {isActive && (
                <button onClick={() => { setReturnPickerQ(refReturnInput); setShowReturnPicker(true); }}
                  className="border bg-gray-200 hover:bg-gray-300 px-2 py-0.5 text-xs rounded">
                  Cari
                </button>
              )}
            </div>

            {/* TGL RETURN */}
            <label className="text-xs font-semibold self-center">TGL RETURN</label>
            <span className="text-xs self-center">:</span>
            <div>
              <input type="date" value={tglReturn} readOnly disabled={!isActive}
                className="border px-2 py-0.5 text-xs disabled:bg-gray-100 bg-gray-100 w-36" />
            </div>

            {/* S/N LAMA */}
            <label className="text-xs font-semibold self-center">S/N LAMA</label>
            <span className="text-xs self-center">:</span>
            <div>
              <input value={snLama} disabled={!isActive}
                onChange={e => setSnLama(e.target.value)}
                className="border px-2 py-0.5 text-xs disabled:bg-gray-100 bg-white w-48" />
            </div>

            {/* QTTY TERIMA */}
            <label className="text-xs font-semibold self-center">QTTY TERIMA</label>
            <span className="text-xs self-center">:</span>
            <div>
              <input type="number" value={qttyTerima || ''} disabled={!isActive}
                onChange={e => setQttyTerima(parseFloat(e.target.value) || 0)}
                className="border px-2 py-0.5 text-xs disabled:bg-gray-100 bg-white w-24 text-right" />
            </div>

            {/* KETERANGAN */}
            <label className="text-xs font-semibold self-center">KETERANGAN</label>
            <span className="text-xs self-center">:</span>
            <div>
              <input value={keterangan} disabled={!isActive}
                onChange={e => setKeterangan(e.target.value)}
                className="border px-2 py-0.5 text-xs disabled:bg-gray-100 bg-white w-80" />
            </div>

            {/* S/N BARU */}
            <label className="text-xs font-semibold self-center">S/N BARU</label>
            <span className="text-xs self-center">:</span>
            <div>
              <input value={snBaru} disabled={!isActive}
                onChange={e => setSnBaru(e.target.value)}
                className="border px-2 py-0.5 text-xs disabled:bg-gray-100 bg-white w-48" />
            </div>

            {/* OPERATOR */}
            <label className="text-xs font-semibold self-center">OPERATOR</label>
            <span className="text-xs self-center">:</span>
            <div>
              <input value={operator} readOnly disabled={!isActive}
                className="border px-2 py-0.5 text-xs disabled:bg-gray-100 bg-gray-100 w-36" />
            </div>
          </div>
        </div>

        {/* Bottom buttons */}
        <div className="bg-purple-100 border-t border-purple-300 px-3 py-1.5 flex items-center shrink-0">
          <div className="flex gap-1">
            <button onClick={handleTambah} disabled={isActive}
              className="px-4 py-1 rounded-full bg-gray-200 hover:bg-gray-300 text-xs font-semibold border border-gray-400 disabled:opacity-40">
              TAMBAH
            </button>
            <button onClick={handleEdit} disabled={!selectedId || isActive}
              className="px-4 py-1 rounded-full bg-gray-200 hover:bg-gray-300 text-xs font-semibold border border-gray-400 disabled:opacity-40">
              EDIT
            </button>
            <button onClick={handleBatal} disabled={!isActive}
              className="px-4 py-1 rounded-full bg-gray-200 hover:bg-gray-300 text-xs font-semibold border border-gray-400 disabled:opacity-40">
              BATAL
            </button>
            <button onClick={handleSimpan} disabled={!isActive || saving}
              className="px-4 py-1 rounded-full bg-gray-200 hover:bg-gray-300 text-xs font-semibold border border-gray-400 disabled:opacity-40">
              {saving ? 'Menyimpan...' : 'SIMPAN'}
            </button>
          </div>
          <div className="ml-auto">
            <button className="px-4 py-1 rounded-full bg-gray-200 hover:bg-gray-300 text-xs font-semibold border border-gray-400">
              Keluar
            </button>
          </div>
        </div>
      </div>

      {/* ── PICKERS ──────────────────────────────────────────────────────── */}
      {showBarangPicker && (
        <BarangPicker initialQ={barangPickerQ}
          onSelect={handleSelectBarang} onClose={() => setShowBarangPicker(false)} />
      )}
      {showReturnPicker && (
        <ReturnPicker initialQ={returnPickerQ} barangId={barangId}
          onSelect={handleSelectReturn} onClose={() => setShowReturnPicker(false)} />
      )}
    </div>
  );
}
