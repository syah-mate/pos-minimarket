'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BarangOption {
  _id: string;
  kode: string;
  nama: string;
  satuanJual: string;
  satuanBeli: string;
  isi: number;
  hargaBeli: number;
  stok: number;
}

interface FakturBeliOption {
  _id: string;
  refNo: string;
  tanggal: string;
  supplierNama: string;
  supplierId: string;
  grandTotal: number;
}

interface ReturnDoc {
  _id: string;
  refNo: string;
  tanggal: string;
  namaBarang: string;
  satuan: string;
  satuanType: 'jual' | 'beli';
  isi: number;
  refBeli: string;
  tglBeli: string | null;
  supplierId: string;
  supplierNama: string;
  barangId: string;
  qty: number;
  harsat: number;
  rupiah: number;
  alasan: string;
  operator: string;
  sudahKembali: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toDateInput(d: string | Date | null | undefined) {
  if (!d) return '';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}
function todayStr() { return toDateInput(new Date()); }
function fmt(n: number) { return new Intl.NumberFormat('id-ID').format(Math.round(n)); }

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
    const res = await fetch(`/api/barang?q=${encodeURIComponent(search)}`);
    setList(await res.json());
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded shadow-xl w-200 max-h-[80vh] flex flex-col">
        <div className="bg-blue-700 text-white px-4 py-2 font-bold text-sm flex justify-between">
          <span>CARI BARANG</span>
          <button onClick={onClose} className="hover:text-red-300">✕</button>
        </div>
        <div className="p-3 border-b">
          <input ref={inputRef} value={q}
            onChange={e => { setQ(e.target.value); fetchList(e.target.value); }}
            placeholder="Ketik kode / nama barang..."
            className="border rounded px-2 py-1 text-sm w-full" />
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-blue-600 text-white sticky top-0">
              <tr>{['KODE','NAMA BARANG','STN JUAL','STN BELI','ISI','STOK','HRG BELI'].map(h =>
                <th key={h} className="px-2 py-1 text-left border border-blue-500 whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="text-center py-6 text-gray-400">Memuat...</td></tr>}
              {!loading && list.map((b, i) => (
                <tr key={b._id} onClick={() => onSelect(b)}
                  className={`cursor-pointer hover:bg-blue-100 ${i % 2 === 0 ? 'bg-white' : 'bg-blue-50'}`}>
                  <td className="px-2 py-1 border border-gray-200">{b.kode}</td>
                  <td className="px-2 py-1 border border-gray-200">{b.nama}</td>
                  <td className="px-2 py-1 border border-gray-200">{b.satuanJual}</td>
                  <td className="px-2 py-1 border border-gray-200">{b.satuanBeli}</td>
                  <td className="px-2 py-1 border border-gray-200 text-right">{b.isi}</td>
                  <td className="px-2 py-1 border border-gray-200 text-right">{b.stok}</td>
                  <td className="px-2 py-1 border border-gray-200 text-right">{fmt(b.hargaBeli)}</td>
                </tr>
              ))}
              {!loading && list.length === 0 && <tr><td colSpan={7} className="text-center py-6 text-gray-400 italic">Tidak ada data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Faktur Beli Picker ────────────────────────────────────────────────────────

function FakturBeliPicker({ initialQ = '', barangId = '', onSelect, onClose }: {
  initialQ?: string;
  barangId?: string;
  onSelect: (f: FakturBeliOption) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState(initialQ);
  const [list, setList] = useState<FakturBeliOption[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); fetchList(initialQ); }, [initialQ]);

  async function fetchList(search: string) {
    setLoading(true);
    const params = new URLSearchParams({ q: search });
    if (barangId) params.set('barangId', barangId);
    const res = await fetch(`/api/transaksi-beli?${params}`);
    setList(await res.json());
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded shadow-xl w-175 max-h-[80vh] flex flex-col">
        <div className="bg-blue-700 text-white px-4 py-2 font-bold text-sm flex justify-between">
          <span>CARI FAKTUR PEMBELIAN</span>
          <button onClick={onClose} className="hover:text-red-300">✕</button>
        </div>
        <div className="p-3 border-b">
          <input ref={inputRef} value={q}
            onChange={e => { setQ(e.target.value); fetchList(e.target.value); }}
            placeholder="Ketik no. faktur / supplier..."
            className="border rounded px-2 py-1 text-sm w-full" />
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-blue-600 text-white sticky top-0">
              <tr>{['NO. FAKTUR','TANGGAL','SUPPLIER','TOTAL'].map(h =>
                <th key={h} className="px-2 py-1 text-left border border-blue-500 whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={4} className="text-center py-6 text-gray-400">Memuat...</td></tr>}
              {!loading && list.map((f, i) => (
                <tr key={f._id} onClick={() => onSelect(f)}
                  className={`cursor-pointer hover:bg-blue-100 ${i % 2 === 0 ? 'bg-white' : 'bg-blue-50'}`}>
                  <td className="px-2 py-1 border border-gray-200">{f.refNo}</td>
                  <td className="px-2 py-1 border border-gray-200 whitespace-nowrap">
                    {f.tanggal ? new Date(f.tanggal).toLocaleDateString('id-ID') : ''}
                  </td>
                  <td className="px-2 py-1 border border-gray-200">{f.supplierNama}</td>
                  <td className="px-2 py-1 border border-gray-200 text-right">{fmt(f.grandTotal)}</td>
                </tr>
              ))}
              {!loading && list.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-gray-400 italic">Tidak ada data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ReturnPembelianPage() {
  // List
  const [list, setList] = useState<ReturnDoc[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [belumKembali, setBelumKembali] = useState(false);

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
  const [refBeli, setRefBeli] = useState('');
  const [refBeliInput, setRefBeliInput] = useState('');
  const [tglBeli, setTglBeli] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplierNama, setSupplierNama] = useState('');
  const [qty, setQty] = useState(0);
  const [harsat, setHarsat] = useState(0);
  const [rupiah, setRupiah] = useState(0);
  const [alasan, setAlasan] = useState('');
  const [operator] = useState('admin');

  // Pickers
  const [showBarangPicker, setShowBarangPicker] = useState(false);
  const [showFakturPicker, setShowFakturPicker] = useState(false);
  const [barangPickerQ, setBarangPickerQ] = useState('');
  const [fakturPickerQ, setFakturPickerQ] = useState('');

  const isActive = mode !== 'view';

  // ── Fetch list ─────────────────────────────────────────────────────────────

  const fetchList = useCallback(async (q = '', bk = belumKembali) => {
    setLoadingList(true);
    const params = new URLSearchParams({ q });
    if (bk) params.set('belumKembali', '1');
    const res = await fetch(`/api/return-pembelian?${params}`);
    setList(await res.json());
    setLoadingList(false);
  }, [belumKembali]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // ── Sync rupiah ────────────────────────────────────────────────────────────

  useEffect(() => {
    setRupiah(qty * harsat);
  }, [qty, harsat]);

  // ── Reset form ─────────────────────────────────────────────────────────────

  function resetForm() {
    setEditId(null); setRefNo(''); setTanggal(todayStr());
    setBarangId(''); setNamaBarang(''); setNamaBarangInput('');
    setSatuan(''); setSatuanType('jual'); setIsi(1); setSatuanOptions([]);
    setRefBeli(''); setRefBeliInput(''); setTglBeli('');
    setSupplierId(''); setSupplierNama('');
    setQty(0); setHarsat(0); setRupiah(0);
    setAlasan(''); setError('');
  }

  // ── Tambah ─────────────────────────────────────────────────────────────────

  async function handleTambah() {
    resetForm();
    const today = todayStr();
    const res = await fetch(`/api/return-pembelian?action=next-ref&date=${today}`);
    const { refNo: nr } = await res.json();
    setRefNo(nr); setTanggal(today);
    setMode('tambah');
  }

  // ── Edit ───────────────────────────────────────────────────────────────────

  async function handleEdit() {
    if (!selectedId) return;
    const res = await fetch(`/api/return-pembelian/${selectedId}`);
    const doc: ReturnDoc = await res.json();
    setEditId(doc._id);
    setRefNo(doc.refNo); setTanggal(toDateInput(doc.tanggal));
    setBarangId(doc.barangId); setNamaBarang(doc.namaBarang); setNamaBarangInput(doc.namaBarang);
    const opts = buildSatuanOpts(doc);
    setSatuanOptions(opts); setSatuan(doc.satuan); setSatuanType(doc.satuanType); setIsi(doc.isi);
    setRefBeli(doc.refBeli); setRefBeliInput(doc.refBeli); setTglBeli(toDateInput(doc.tglBeli));
    setSupplierId(doc.supplierId); setSupplierNama(doc.supplierNama);
    setQty(doc.qty); setHarsat(doc.harsat); setRupiah(doc.rupiah);
    setAlasan(doc.alasan);
    setError(''); setMode('edit');
  }

  function buildSatuanOpts(doc: { satuan: string; satuanType: 'jual' | 'beli' }) {
    // We keep existing options if available; otherwise just the current satuan
    return [
      { value: doc.satuanType as 'jual' | 'beli', label: doc.satuan },
    ];
  }

  // ── Batal ──────────────────────────────────────────────────────────────────

  function handleBatal() { resetForm(); setMode('view'); }

  // ── Barang selected ────────────────────────────────────────────────────────

  function handleSelectBarang(b: BarangOption) {
    setBarangId(b._id); setNamaBarang(b.nama); setNamaBarangInput(b.nama);
    setHarsat(b.hargaBeli);
    // Build satuan options
    const opts: { value: 'jual' | 'beli'; label: string }[] = [
      { value: 'jual', label: b.satuanJual },
    ];
    if (b.satuanBeli && b.satuanBeli !== b.satuanJual) {
      opts.push({ value: 'beli', label: b.satuanBeli });
    }
    setSatuanOptions(opts);
    setSatuanType('jual'); setSatuan(b.satuanJual); setIsi(b.isi);
    setShowBarangPicker(false);
  }

  function handleSatuanChange(val: 'jual' | 'beli') {
    const opt = satuanOptions.find(o => o.value === val);
    setSatuanType(val);
    if (opt) setSatuan(opt.label);
  }

  // ── Faktur selected ────────────────────────────────────────────────────────

  function handleSelectFaktur(f: FakturBeliOption) {
    setRefBeli(f.refNo); setRefBeliInput(f.refNo);
    setTglBeli(toDateInput(f.tanggal));
    setSupplierId(f.supplierId); setSupplierNama(f.supplierNama);
    setShowFakturPicker(false);
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSimpan() {
    setError('');
    if (!barangId) { setError('Nama barang harus dipilih.'); return; }
    if (qty <= 0) { setError('QTTY harus lebih dari 0.'); return; }
    setSaving(true);
    try {
      const body = {
        refNo, tanggal, barangId, namaBarang, satuan, satuanType, isi,
        refBeli, tglBeli: tglBeli || null, supplierId, supplierNama,
        qty, harsat, rupiah, alasan, operator,
      };
      const isEdit = mode === 'edit';
      const url = isEdit ? `/api/return-pembelian/${editId}` : '/api/return-pembelian';
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
        {/* Checkbox */}
        <div className="px-2 py-1.5 bg-blue-50 border-b border-blue-200">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer font-semibold text-blue-800">
            <input type="checkbox" checked={belumKembali}
              onChange={e => { setBelumKembali(e.target.checked); fetchList(searchQ, e.target.checked); }} />
            Tampilkan Return Yang Belum Kembali Saja
          </label>
        </div>

        {/* List header */}
        <div className="grid grid-cols-2 bg-blue-700 text-white text-xs font-semibold shrink-0">
          <div className="px-2 py-1 border-r border-blue-500">TANGGAL</div>
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
                ${selectedId === r._id ? 'bg-blue-600 text-white' : i % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-blue-50 hover:bg-blue-100'}`}>
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
            onChange={e => { setSearchQ(e.target.value); fetchList(e.target.value, belumKembali); }}
            placeholder="Pencarian"
            className="border rounded px-2 py-0.5 text-xs w-full" />
        </div>
      </div>

      {/* ── RIGHT PANEL ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-blue-50">

        {/* Form area */}
        <div className="flex-1 overflow-auto p-4">
          {/* Top: REF display */}
          <div className="flex justify-end mb-3 gap-4">
            <div className="border bg-gray-100 px-3 py-1 text-sm font-bold text-blue-800 min-w-36 text-center">
              {refNo || (isActive ? '...' : '')}
            </div>
            <div className="text-xs text-gray-500 pt-1">NO. REF</div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 text-xs px-3 py-1 rounded mb-3">⚠ {error}</div>
          )}

          {/* Fields */}
          <div className="grid gap-y-2" style={{ gridTemplateColumns: '110px 1fr' }}>
            {/* TANGGAL */}
            <label className="text-xs font-semibold self-center">TANGGAL</label>
            <div>
              <input type="date" value={tanggal} disabled={!isActive}
                onChange={e => setTanggal(e.target.value)}
                className="border px-2 py-0.5 text-xs disabled:bg-gray-100 bg-white w-36" />
            </div>

            {/* NM BARANG */}
            <label className="text-xs font-semibold self-center">NM BARANG</label>
            <div className="flex gap-2 items-center">
              <input value={namaBarangInput} disabled={!isActive}
                onChange={e => setNamaBarangInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && isActive) {
                    setBarangPickerQ(namaBarangInput); setShowBarangPicker(true);
                  }
                }}
                placeholder="Ketik + Enter untuk cari..."
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

            {/* REF. BELI */}
            <label className="text-xs font-semibold self-center">REF. BELI</label>
            <div className="flex gap-2 items-center">
              <input value={refBeliInput} disabled={!isActive}
                onChange={e => setRefBeliInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && isActive) {
                    setFakturPickerQ(refBeliInput); setShowFakturPicker(true);
                  }
                }}
                placeholder="Ketik + Enter untuk cari faktur..."
                className="border px-2 py-0.5 text-xs disabled:bg-gray-100 bg-white w-40" />
              {isActive && (
                <button onClick={() => { setFakturPickerQ(refBeliInput); setShowFakturPicker(true); }}
                  className="border bg-gray-200 hover:bg-gray-300 px-2 py-0.5 text-xs rounded">
                  Cari
                </button>
              )}
            </div>

            {/* TGL. BELI */}
            <label className="text-xs font-semibold self-center">TGL. BELI</label>
            <div>
              <input type="date" value={tglBeli} readOnly disabled={!isActive}
                className="border px-2 py-0.5 text-xs disabled:bg-gray-100 bg-gray-100 w-36" />
            </div>

            {/* SUPPLIER */}
            <label className="text-xs font-semibold self-center">SUPPLIER</label>
            <div>
              <input value={supplierNama} readOnly disabled={!isActive}
                className="border px-2 py-0.5 text-xs disabled:bg-gray-100 bg-gray-100 w-64" />
            </div>

            {/* QTTY */}
            <label className="text-xs font-semibold self-center">QTTY</label>
            <div>
              <input type="number" value={qty || ''} disabled={!isActive}
                onChange={e => setQty(parseFloat(e.target.value) || 0)}
                className="border px-2 py-0.5 text-xs disabled:bg-gray-100 bg-white w-24 text-right" />
            </div>

            {/* HARSAT */}
            <label className="text-xs font-semibold self-center">HARSAT</label>
            <div>
              <input type="number" value={harsat || ''} disabled={!isActive}
                onChange={e => setHarsat(parseFloat(e.target.value) || 0)}
                className="border px-2 py-0.5 text-xs disabled:bg-gray-100 bg-white w-36 text-right" />
            </div>

            {/* RUPIAH */}
            <label className="text-xs font-semibold self-center">RUPIAH</label>
            <div>
              <input readOnly value={rupiah} disabled={!isActive}
                className="border px-2 py-0.5 text-xs disabled:bg-gray-100 bg-gray-100 w-36 text-right" />
            </div>

            {/* ALASAN */}
            <label className="text-xs font-semibold self-center">ALASAN</label>
            <div>
              <input value={alasan} disabled={!isActive}
                onChange={e => setAlasan(e.target.value)}
                className="border px-2 py-0.5 text-xs disabled:bg-gray-100 bg-white w-80" />
            </div>

            {/* OPERATOR */}
            <label className="text-xs font-semibold self-center">OPERATOR</label>
            <div>
              <input value={operator} readOnly disabled={!isActive}
                className="border px-2 py-0.5 text-xs disabled:bg-gray-100 bg-gray-100 w-36" />
            </div>
          </div>
        </div>

        {/* Bottom buttons */}
        <div className="bg-blue-100 border-t border-blue-300 px-3 py-1.5 flex items-center shrink-0">
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
      {showFakturPicker && (
        <FakturBeliPicker initialQ={fakturPickerQ} barangId={barangId}
          onSelect={handleSelectFaktur} onClose={() => setShowFakturPicker(false)} />
      )}
    </div>
  );
}
