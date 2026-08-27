'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { pickList } from '@/lib/apiList';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PelangganOption {
  _id: string; kode: string; nama: string; alamat: string; telp: string;
  saldoPiutang: number;
}
interface KasOption { _id: string; kode: string; nama: string; saldo: number; }

interface JualItem {
  barangId: string; namaBarang: string; satuan: string;
  qty: number; harga: number; discRp: number; subtotal: number;
}
interface JualDoc {
  _id: string; refNo: string; tanggal: string;
  pelangganNama: string; items: JualItem[];
}

interface ItemRow {
  _key: string;
  fakturId: string;
  noFakturInput: string;
  noFaktur: string;
  tglJual: string;
  barangId: string;
  kodeBarang: string;
  namaBarang: string;
  satuan: string;
  qty: number;
  harga: number;
  diskon: number;
  subtotal: number;
  tipe: 'kembali_uang' | 'potong_piutang';
  alasan: string;
}

interface ReturnDoc {
  _id: string; refNo: string; tanggal: string;
  pelangganKode: string; pelangganNama: string;
  items: Omit<ItemRow, '_key' | 'noFakturInput'>[];
  totalRtr: number;
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

function emptyRow(): ItemRow {
  return {
    _key: Math.random().toString(36).slice(2),
    fakturId: '', noFakturInput: '', noFaktur: '', tglJual: '',
    barangId: '', kodeBarang: '', namaBarang: '', satuan: '',
    qty: 0, harga: 0, diskon: 0, subtotal: 0,
    tipe: 'kembali_uang', alasan: '',
  };
}

function ensureEmptyLast(rows: ItemRow[]) {
  if (rows.length === 0 || rows[rows.length - 1].barangId !== '') return [...rows, emptyRow()];
  return rows;
}

// ─── Pelanggan Picker ──────────────────────────────────────────────────────────

function PelangganPicker({ onSelect, onClose }: {
  onSelect: (p: PelangganOption) => void; onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<PelangganOption[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); fetch('/api/pelanggan').then(r => r.json()).then(setList); }, []);

  const filtered = list.filter(p =>
    p.nama.toLowerCase().includes(q.toLowerCase()) || p.kode.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded shadow-xl w-175 max-h-[75vh] flex flex-col">
        <div className="bg-red-700 text-white px-4 py-2 font-bold text-sm flex justify-between">
          <span>PILIH PELANGGAN</span>
          <button onClick={onClose} className="hover:text-red-300">✕</button>
        </div>
        <div className="p-2 border-b">
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Cari kode / nama..." className="border rounded px-2 py-1 text-xs w-full" />
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-red-600 text-white sticky top-0">
              <tr>{['KODE','NAMA','ALAMAT','TELP','PIUTANG'].map(h =>
                <th key={h} className="px-2 py-1 text-left border border-red-500">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p._id} onClick={() => onSelect(p)}
                  className={`cursor-pointer hover:bg-red-100 ${i % 2 === 0 ? 'bg-white' : 'bg-red-50'}`}>
                  <td className="px-2 py-1 border border-gray-200">{p.kode}</td>
                  <td className="px-2 py-1 border border-gray-200">{p.nama}</td>
                  <td className="px-2 py-1 border border-gray-200">{p.alamat}</td>
                  <td className="px-2 py-1 border border-gray-200">{p.telp}</td>
                  <td className="px-2 py-1 border border-gray-200 text-right">{fmt(p.saldoPiutang)}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={5} className="text-center py-4 text-gray-400 italic">Tidak ada data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Kas Picker ────────────────────────────────────────────────────────────────

function KasPicker({ onSelect, onClose }: {
  onSelect: (k: KasOption) => void; onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<KasOption[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); fetch('/api/kas').then(r => r.json()).then(setList); }, []);

  const filtered = list.filter(k =>
    k.nama.toLowerCase().includes(q.toLowerCase()) || k.kode.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded shadow-xl w-100 max-h-[60vh] flex flex-col">
        <div className="bg-red-700 text-white px-4 py-2 font-bold text-sm flex justify-between">
          <span>PILIH KAS</span>
          <button onClick={onClose} className="hover:text-red-300">✕</button>
        </div>
        <div className="p-2 border-b">
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Cari kode / nama..." className="border rounded px-2 py-1 text-xs w-full" />
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-red-600 text-white sticky top-0">
              <tr>{['KODE','NAMA','SALDO'].map(h =>
                <th key={h} className="px-2 py-1 text-left border border-red-500">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((k, i) => (
                <tr key={k._id} onClick={() => onSelect(k)}
                  className={`cursor-pointer hover:bg-red-100 ${i % 2 === 0 ? 'bg-white' : 'bg-red-50'}`}>
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

// ─── Faktur Jual Picker (two-panel) ───────────────────────────────────────────

function FakturJualPicker({ initialQ = '', onSelect, onClose }: {
  initialQ?: string;
  onSelect: (item: JualItem, faktur: JualDoc) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState(initialQ);
  const [jualList, setJualList] = useState<JualDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); fetchJual(initialQ); }, [initialQ]);

  async function fetchJual(search: string) {
    setLoading(true);
    // includeItems=1 — picker ini menampilkan baris item, bukan header faktur saja.
    const res = await fetch(
      `/api/transaksi-jual?q=${encodeURIComponent(search)}&includeItems=1&limit=50`
    );
    setJualList(pickList<JualDoc>(await res.json()));
    setLoading(false);
  }

  // Flatten all items from all faktur into one list
  const flatRows = jualList.flatMap(j =>
    j.items.map(item => ({ item, faktur: j }))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded shadow-xl flex flex-col" style={{ width: '92vw', maxHeight: '82vh' }}>
        <div className="bg-red-700 text-white px-4 py-2 font-bold text-sm flex justify-between shrink-0">
          <span>PILIH ITEM FAKTUR PENJUALAN</span>
          <button onClick={onClose} className="hover:text-red-300">✕</button>
        </div>
        <div className="p-2 border-b shrink-0">
          <input ref={inputRef} value={q}
            onChange={e => { setQ(e.target.value); fetchJual(e.target.value); }}
            placeholder="Ketik no. faktur / nama pelanggan..."
            className="border rounded px-2 py-1 text-xs w-full" />
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs border-collapse min-w-max">
            <thead className="sticky top-0 bg-red-600 text-white">
              <tr>
                {['NO. FAKTUR','TANGGAL','PELANGGAN','NAMA BARANG','SATUAN','QTY','HARGA','SUBTOTAL'].map(h =>
                  <th key={h} className="px-2 py-1 text-left border border-red-500 whitespace-nowrap">{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="text-center py-4 text-gray-400 text-xs">Memuat...</td></tr>
              )}
              {!loading && flatRows.map(({ item, faktur }, i) => (
                <tr key={`${faktur._id}-${i}`} onClick={() => onSelect(item, faktur)}
                  className={`cursor-pointer border-b border-gray-100 hover:bg-green-100 ${i % 2 === 0 ? 'bg-white' : 'bg-red-50/30'}`}>
                  <td className="px-2 py-0.5 border-r border-gray-200 whitespace-nowrap font-medium text-blue-700">{faktur.refNo}</td>
                  <td className="px-2 py-0.5 border-r border-gray-200 whitespace-nowrap">
                    {faktur.tanggal ? new Date(faktur.tanggal).toLocaleDateString('id-ID') : ''}
                  </td>
                  <td className="px-2 py-0.5 border-r border-gray-200">{faktur.pelangganNama}</td>
                  <td className="px-2 py-0.5 border-r border-gray-200">{item.namaBarang}</td>
                  <td className="px-2 py-0.5 border-r border-gray-200">{item.satuan}</td>
                  <td className="px-2 py-0.5 border-r border-gray-200 text-right">{item.qty}</td>
                  <td className="px-2 py-0.5 border-r border-gray-200 text-right">{fmt(item.harga)}</td>
                  <td className="px-2 py-0.5 text-right">{fmt(item.subtotal)}</td>
                </tr>
              ))}
              {!loading && flatRows.length === 0 && (
                <tr><td colSpan={8} className="text-center py-6 text-gray-400 italic text-xs">Tidak ada data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ReturnPenjualanPage() {
  // List
  const [list, setList] = useState<ReturnDoc[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form header
  const [refNo, setRefNo] = useState('');
  const [tanggal, setTanggal] = useState(todayStr());
  const [jenisPelanggan, setJenisPelanggan] = useState<'Pelanggan' | 'Umum'>('Pelanggan');
  const [pelangganId, setPelangganId] = useState('');
  const [pelangganKode, setPelangganKode] = useState('');
  const [pelangganKodeInput, setPelangganKodeInput] = useState('');
  const [pelangganNama, setPelangganNama] = useState('');
  const [pelangganAlamat, setPelangganAlamat] = useState('');
  const [kasId, setKasId] = useState('');
  const [kasKode, setKasKode] = useState('');
  const [kasNama, setKasNama] = useState('');
  const [operator] = useState('admin');

  // Items
  const [items, setItems] = useState<ItemRow[]>([emptyRow()]);
  const [activeRow, setActiveRow] = useState(0);

  // Pickers
  const [showPelangganPicker, setShowPelangganPicker] = useState(false);
  const [showKasPicker, setShowKasPicker] = useState(false);
  const [showFakturPicker, setShowFakturPicker] = useState(false);
  const [fakturPickerQ, setFakturPickerQ] = useState('');
  const [targetRow, setTargetRow] = useState(0);

  // ── Selected return details ────────────────────────────────────────────────

  const selectedReturn = list.find(r => r._id === selectedId);

  // ── Totals ─────────────────────────────────────────────────────────────────

  const totalKembaliUang = items.filter(r => r.tipe === 'kembali_uang').reduce((s, r) => s + r.subtotal, 0);
  const totalPotongPiutang = items.filter(r => r.tipe === 'potong_piutang').reduce((s, r) => s + r.subtotal, 0);
  const totalRtr = totalKembaliUang + totalPotongPiutang;
  const totalQty = items.filter(r => r.barangId).reduce((s, r) => s + r.qty, 0);

  // ── Fetch list ─────────────────────────────────────────────────────────────

  const fetchList = useCallback(async (q = '') => {
    setLoadingList(true);
    const res = await fetch(`/api/return-penjualan?q=${encodeURIComponent(q)}`);
    setList(await res.json());
    setLoadingList(false);
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  // ── Reset form ─────────────────────────────────────────────────────────────

  function resetForm() {
    setEditId(null); setRefNo(''); setTanggal(todayStr());
    setJenisPelanggan('Pelanggan');
    setPelangganId(''); setPelangganKode(''); setPelangganKodeInput('');
    setPelangganNama(''); setPelangganAlamat('');
    setKasId(''); setKasKode(''); setKasNama('');
    setItems([emptyRow()]); setActiveRow(0); setError('');
  }

  // ── Tambah ─────────────────────────────────────────────────────────────────

  async function handleTambah() {
    resetForm();
    const today = todayStr();
    const res = await fetch(`/api/return-penjualan?action=next-ref&date=${today}`);
    const { refNo: nr } = await res.json();
    setRefNo(nr); setTanggal(today);
    setShowForm(true);
  }

  // ── Edit ───────────────────────────────────────────────────────────────────

  async function handleEdit() {
    if (!selectedId) return;
    const res = await fetch(`/api/return-penjualan/${selectedId}`);
    const doc = await res.json();
    setEditId(doc._id); setRefNo(doc.refNo); setTanggal(toDateInput(doc.tanggal));
    setJenisPelanggan(doc.jenisPelanggan || 'Pelanggan');
    setPelangganId(doc.pelangganId || ''); setPelangganKode(doc.pelangganKode || '');
    setPelangganKodeInput(doc.pelangganKode || ''); setPelangganNama(doc.pelangganNama || '');
    setPelangganAlamat(doc.pelangganAlamat || '');
    setKasId(doc.kasId || ''); setKasKode(doc.kasKode || ''); setKasNama(doc.kasNama || '');
    const loadedItems: ItemRow[] = (doc.items || []).map((it: Omit<ItemRow, '_key' | 'noFakturInput'>) => ({
      ...it, _key: Math.random().toString(36).slice(2), noFakturInput: it.noFaktur,
    }));
    setItems(ensureEmptyLast(loadedItems));
    setActiveRow(0); setError(''); setShowForm(true);
  }

  // ── Hapus ──────────────────────────────────────────────────────────────────

  async function handleHapus() {
    if (!selectedId) return;
    if (!confirm('Hapus transaksi return ini? Stok barang akan dikembalikan.')) return;
    await fetch(`/api/return-penjualan/${selectedId}`, { method: 'DELETE' });
    setSelectedId(null); fetchList();
  }

  // ── Picker callbacks ───────────────────────────────────────────────────────

  function handleSelectPelanggan(p: PelangganOption) {
    setPelangganId(p._id); setPelangganKode(p.kode); setPelangganKodeInput(p.kode);
    setPelangganNama(p.nama); setPelangganAlamat(p.alamat);
    setShowPelangganPicker(false);
  }

  function handleSelectKas(k: KasOption) {
    setKasId(k._id); setKasKode(k.kode); setKasNama(k.nama);
    setShowKasPicker(false);
  }

  async function handleSelectFakturItem(jualItem: JualItem, faktur: JualDoc) {
    // Fetch barang kode
    let kodeBarang = '';
    if (jualItem.barangId) {
      try {
        const res = await fetch(`/api/barang/${jualItem.barangId}`);
        if (res.ok) { const b = await res.json(); kodeBarang = b.kode || ''; }
      } catch { /* ignore */ }
    }
    const patch: Partial<ItemRow> = {
      fakturId: faktur._id, noFaktur: faktur.refNo, noFakturInput: faktur.refNo,
      tglJual: toDateInput(faktur.tanggal),
      barangId: jualItem.barangId, kodeBarang, namaBarang: jualItem.namaBarang,
      satuan: jualItem.satuan, qty: jualItem.qty, harga: jualItem.harga,
      diskon: jualItem.discRp || 0,
      subtotal: jualItem.subtotal,
    };
    setItems(prev => {
      const updated = prev.map((r, i) => i === targetRow ? { ...r, ...patch } : r);
      return ensureEmptyLast(updated);
    });
    setShowFakturPicker(false);
  }

  // ── Item update ────────────────────────────────────────────────────────────

  function updateItemQty(idx: number, qty: number) {
    setItems(prev => prev.map((r, i) => {
      if (i !== idx) return r;
      const subtotal = Math.max(0, qty * r.harga - r.diskon);
      return { ...r, qty, subtotal };
    }));
  }

  function updateItemTipe(idx: number, tipe: 'kembali_uang' | 'potong_piutang') {
    setItems(prev => prev.map((r, i) => i !== idx ? r : { ...r, tipe }));
  }

  function updateItemAlasan(idx: number, alasan: string) {
    setItems(prev => prev.map((r, i) => i !== idx ? r : { ...r, alasan }));
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    setError('');
    const validItems = items.filter(r => r.barangId && r.qty > 0);
    if (validItems.length === 0) { setError('Minimal 1 item harus diisi.'); return; }
    setSaving(true);
    try {
      const body = {
        refNo, tanggal, jenisPelanggan, pelangganId, pelangganKode, pelangganNama, pelangganAlamat,
        kasId, kasKode, kasNama, operator,
        totalKembaliUang, totalPotongPiutang, totalRtr,
        items: validItems.map(({ _key, noFakturInput, ...r }) => r),
      };
      const isEdit = !!editId;
      const url = isEdit ? `/api/return-penjualan/${editId}` : '/api/return-penjualan';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Gagal menyimpan.'); return; }
      setShowForm(false); setEditId(null); setSelectedId(null); fetchList();
    } finally {
      setSaving(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── LIST + DETAIL VIEW ──────────────────────────────────────────── */}
      {!showForm && (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 185px)' }}>
          {/* Search */}
          <div className="bg-red-50 border-b border-red-200 px-3 py-1 flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-600">Cari:</span>
            <input value={searchQ} onChange={e => { setSearchQ(e.target.value); fetchList(e.target.value); }}
              placeholder="No. ref / pelanggan..."
              className="border rounded px-2 py-0.5 text-xs flex-1 max-w-xs" />
          </div>

          {/* Split layout */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left: master list */}
            <div className="flex flex-col border-r border-gray-300" style={{ width: 380 }}>
              <div className="bg-blue-700 text-white text-xs font-semibold text-center py-1 shrink-0">
                Master Transaksi Return
              </div>
              <div className="grid bg-blue-600 text-white text-xs font-semibold shrink-0" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                <div className="px-2 py-1 border-r border-blue-500">Tanggal</div>
                <div className="px-2 py-1 border-r border-blue-500">Kode</div>
                <div className="px-2 py-1">Pelanggan</div>
              </div>
              <div className="overflow-auto flex-1">
                {loadingList && <p className="text-center text-xs text-gray-400 py-4">Memuat...</p>}
                {!loadingList && list.map((r, i) => (
                  <div key={r._id}
                    onClick={() => setSelectedId(r._id === selectedId ? null : r._id)}
                    onDoubleClick={() => { setSelectedId(r._id); setTimeout(() => handleEdit(), 0); }}
                    className={`grid text-xs cursor-pointer border-b border-gray-100 ${selectedId === r._id ? 'bg-blue-600 text-white' : i % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-blue-50/40 hover:bg-blue-100'}`}
                    style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                    <div className="px-2 py-0.5 border-r border-gray-200 whitespace-nowrap">
                      {new Date(r.tanggal).toLocaleDateString('id-ID')}
                    </div>
                    <div className="px-2 py-0.5 border-r border-gray-200 whitespace-nowrap">{r.refNo}</div>
                    <div className="px-2 py-0.5 truncate">{r.pelangganNama}</div>
                  </div>
                ))}
                {!loadingList && list.length === 0 && <p className="text-center text-xs text-gray-400 italic py-6">Tidak ada data</p>}
              </div>
            </div>

            {/* Right: detail items */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="bg-blue-700 text-white text-xs font-semibold text-center py-1 shrink-0">
                Item Barang Detail Return Penjualan
              </div>
              <div className="overflow-auto flex-1">
                <table className="w-full text-xs border-collapse min-w-max">
                  <thead className="sticky top-0 bg-blue-600 text-white">
                    <tr>
                      {['Kode Barang','Nama Barang','No. Faktur','Tgl Jual','Satuan','Qty','Harga','Diskon','Jumlah','Alasan'].map(h =>
                        <th key={h} className="px-2 py-1 text-left border border-blue-500 whitespace-nowrap">{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReturn?.items.map((it, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}>
                        <td className="px-2 py-0.5 border border-gray-200">{it.kodeBarang}</td>
                        <td className="px-2 py-0.5 border border-gray-200">{it.namaBarang}</td>
                        <td className="px-2 py-0.5 border border-gray-200 whitespace-nowrap">{it.noFaktur}</td>
                        <td className="px-2 py-0.5 border border-gray-200 whitespace-nowrap">
                          {it.tglJual ? new Date(it.tglJual).toLocaleDateString('id-ID') : ''}
                        </td>
                        <td className="px-2 py-0.5 border border-gray-200">{it.satuan}</td>
                        <td className="px-2 py-0.5 border border-gray-200 text-right">{it.qty}</td>
                        <td className="px-2 py-0.5 border border-gray-200 text-right">{fmt(it.harga)}</td>
                        <td className="px-2 py-0.5 border border-gray-200 text-right">{fmt(it.diskon)}</td>
                        <td className="px-2 py-0.5 border border-gray-200 text-right">{fmt(it.subtotal)}</td>
                        <td className="px-2 py-0.5 border border-gray-200">{it.alasan}</td>
                      </tr>
                    ))}
                    {!selectedReturn && (
                      <tr><td colSpan={10} className="text-center py-12 text-gray-400 italic">← Pilih transaksi di kiri</td></tr>
                    )}
                    {selectedReturn && selectedReturn.items.length === 0 && (
                      <tr><td colSpan={10} className="text-center py-8 text-gray-400 italic">Tidak ada item</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bottom buttons */}
          <div className="bg-red-100 border-t border-red-300 px-3 py-1.5 flex items-center shrink-0">
            <div className="flex gap-1">
              <button onClick={handleTambah}
                className="px-4 py-1 rounded-full bg-gray-200 hover:bg-gray-300 text-xs font-semibold border border-gray-400">
                Tambah
              </button>
              <button onClick={handleEdit} disabled={!selectedId}
                className="px-4 py-1 rounded-full bg-gray-200 hover:bg-gray-300 text-xs font-semibold border border-gray-400 disabled:opacity-40">
                Edit
              </button>
              <button onClick={handleHapus} disabled={!selectedId}
                className="px-4 py-1 rounded-full bg-gray-200 hover:bg-gray-300 text-xs font-semibold border border-gray-400 disabled:opacity-40">
                Hapus
              </button>
            </div>
            <div className="ml-auto">
              <button className="px-4 py-1 rounded-full bg-gray-200 hover:bg-gray-300 text-xs font-semibold border border-gray-400">
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FORM MODAL ──────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-40 bg-gray-100 flex flex-col" style={{ top: 120 }}>

          {/* Form header */}
          <div className="bg-gray-200 border-b border-gray-400 px-4 py-2 shrink-0 flex gap-6 items-start">
            {/* Left: pelanggan fields */}
            <div className="flex flex-col gap-1" style={{ minWidth: 420 }}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold w-28 shrink-0">Jenis Pelanggan</span>
                <select value={jenisPelanggan} onChange={e => setJenisPelanggan(e.target.value as 'Pelanggan' | 'Umum')}
                  className="border bg-white px-1 py-0.5 text-xs w-32">
                  <option value="Pelanggan">Pelanggan</option>
                  <option value="Umum">Umum</option>
                </select>
                <button onClick={() => {
                  setPelangganId(''); setPelangganKode(''); setPelangganKodeInput('');
                  setPelangganNama(''); setPelangganAlamat('');
                }} className="border bg-white hover:bg-gray-100 px-2 py-0.5 text-xs rounded ml-2">
                  RESET
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold w-28 shrink-0">Kode Pelanggan</span>
                <input value={pelangganKodeInput}
                  onChange={e => setPelangganKodeInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') setShowPelangganPicker(true); }}
                  className="border bg-white px-1 py-0.5 text-xs w-20" />
                <button onClick={() => setShowPelangganPicker(true)}
                  className="border bg-white hover:bg-gray-100 px-1.5 py-0.5 text-xs rounded">
                  ...
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold w-28 shrink-0">Nama Pelanggan</span>
                <input readOnly value={pelangganNama}
                  className="border bg-gray-50 px-1 py-0.5 text-xs w-52" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold w-28 shrink-0">Alamat Pelanggan</span>
                <input readOnly value={pelangganAlamat}
                  className="border bg-gray-50 px-1 py-0.5 text-xs w-52" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold w-28 shrink-0">Kode Kas</span>
                <select value={kasKode} onChange={() => {}} onClick={() => setShowKasPicker(true)}
                  className="border bg-white px-1 py-0.5 text-xs w-36 cursor-pointer">
                  <option value={kasKode}>{kasNama || kasKode || '-- Pilih --'}</option>
                </select>
              </div>
            </div>

            {/* Center: faktur + tanggal + operator */}
            <div className="flex flex-col gap-1 mt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold w-20 shrink-0">No. Faktur</span>
                <input readOnly value={refNo} className="border bg-gray-50 px-1 py-0.5 text-xs w-36 font-semibold" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold w-20 shrink-0">Tanggal</span>
                <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)}
                  className="border bg-white px-1 py-0.5 text-xs w-36" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold w-20 shrink-0">Operator</span>
                <input readOnly value={operator} className="border bg-gray-50 px-1 py-0.5 text-xs w-36" />
              </div>
            </div>

            {/* Right: KAS DAN PIUTANG summary */}
            <div className="ml-auto border border-blue-300 bg-blue-50 p-2 min-w-64">
              <div className="text-xs font-bold text-blue-800 mb-1">KAS DAN PIUTANG YG DIPOTONG</div>
              <div className="flex justify-between text-xs py-0.5 border-b border-blue-200">
                <span>Tipe Return Kembali Uang</span>
                <span className="font-semibold">{fmt(totalKembaliUang)}</span>
              </div>
              <div className="flex justify-between text-xs py-0.5 border-b border-blue-200">
                <span>Tipe Return Potong Piutang</span>
                <span className="font-semibold">{fmt(totalPotongPiutang)}</span>
              </div>
              <div className="flex justify-between text-xs py-1 font-bold">
                <span>TOTAL RTR</span>
                <span>{fmt(totalRtr)}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border-b border-red-400 text-red-700 text-xs px-4 py-1 shrink-0">⚠ {error}</div>
          )}

          {/* Items table */}
          <div className="flex-1 overflow-auto bg-white">
            <table className="border-collapse text-xs min-w-max w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-blue-700 text-white">
                  <th className="px-2 py-1 border border-blue-600 w-8 text-center">#</th>
                  <th className="px-2 py-1 border border-blue-600 text-left whitespace-nowrap" style={{ minWidth: 140 }}>NO. FAKTUR</th>
                  <th className="px-2 py-1 border border-blue-600 text-left whitespace-nowrap w-24">TANGGAL</th>
                  <th className="px-2 py-1 border border-blue-600 text-left whitespace-nowrap w-24">KODE BARANG</th>
                  <th className="px-2 py-1 border border-blue-600 text-left" style={{ minWidth: 220 }}>NAMA BARANG</th>
                  <th className="px-2 py-1 border border-blue-600 text-left w-16">SATUAN</th>
                  <th className="px-2 py-1 border border-blue-600 text-right w-16">QTY</th>
                  <th className="px-2 py-1 border border-blue-600 text-right w-24">HARGA</th>
                  <th className="px-2 py-1 border border-blue-600 text-right w-20">DISKON</th>
                  <th className="px-2 py-1 border border-blue-600 text-right w-24">SUBTOTAL</th>
                  <th className="px-2 py-1 border border-blue-600 text-left w-28">TIPE</th>
                  <th className="px-2 py-1 border border-blue-600 text-left" style={{ minWidth: 160 }}>ALASAN</th>
                  <th className="px-2 py-1 border border-blue-600 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => {
                  const isActive = idx === activeRow;
                  const isEmpty = !row.barangId;
                  return (
                    <tr key={row._key} onClick={() => setActiveRow(idx)}
                      className={`border-b border-gray-200 ${isActive ? 'bg-blue-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                      <td className="px-1 py-0.5 border-r border-gray-200 text-center text-gray-400 text-xs">
                        {isEmpty ? '' : idx + 1}
                      </td>

                      {/* NO. FAKTUR */}
                      <td className="border-r border-gray-200 p-0">
                        <input value={row.noFakturInput} readOnly
                          placeholder={isActive ? 'Enter untuk cari faktur...' : ''}
                          onClick={() => { setActiveRow(idx); setTargetRow(idx); setFakturPickerQ(row.noFakturInput); setShowFakturPicker(true); }}
                          onKeyDown={e => { if (e.key === 'Enter') { setTargetRow(idx); setFakturPickerQ(row.noFakturInput); setShowFakturPicker(true); } }}
                          className="w-full px-2 py-0.5 bg-transparent text-xs cursor-pointer outline-none" />
                      </td>

                      {/* TANGGAL */}
                      <td className="px-2 py-0.5 border-r border-gray-200 text-xs whitespace-nowrap">
                        {row.tglJual ? new Date(row.tglJual).toLocaleDateString('id-ID') : ''}
                      </td>

                      {/* KODE BARANG */}
                      <td className="px-2 py-0.5 border-r border-gray-200 text-xs">{row.kodeBarang}</td>

                      {/* NAMA BARANG */}
                      <td className="px-2 py-0.5 border-r border-gray-200 text-xs">{row.namaBarang}</td>

                      {/* SATUAN */}
                      <td className="px-2 py-0.5 border-r border-gray-200 text-xs">{row.satuan}</td>

                      {/* QTY (editable) */}
                      <td className="border-r border-gray-200 p-0">
                        {row.barangId ? (
                          <input type="number" value={row.qty || ''}
                            onChange={e => updateItemQty(idx, parseFloat(e.target.value) || 0)}
                            className="w-full text-right px-1 py-0.5 text-xs bg-transparent outline-none border-0" />
                        ) : <span className="block px-1 py-0.5 text-right text-xs"></span>}
                      </td>

                      {/* HARGA */}
                      <td className="px-2 py-0.5 border-r border-gray-200 text-right text-xs">
                        {row.harga ? fmt(row.harga) : ''}
                      </td>

                      {/* DISKON */}
                      <td className="px-2 py-0.5 border-r border-gray-200 text-right text-xs">
                        {row.diskon ? fmt(row.diskon) : (row.barangId ? '0' : '')}
                      </td>

                      {/* SUBTOTAL */}
                      <td className="px-2 py-0.5 border-r border-gray-200 text-right text-xs font-semibold">
                        {row.subtotal ? fmt(row.subtotal) : ''}
                      </td>

                      {/* TIPE */}
                      <td className="border-r border-gray-200 p-0">
                        {row.barangId ? (
                          <select value={row.tipe}
                            onChange={e => updateItemTipe(idx, e.target.value as 'kembali_uang' | 'potong_piutang')}
                            className="w-full px-1 py-0.5 text-xs bg-transparent border-0 outline-none">
                            <option value="kembali_uang">BAYAR TUNAI</option>
                            <option value="potong_piutang">POTONG PIUTANG</option>
                          </select>
                        ) : null}
                      </td>

                      {/* ALASAN */}
                      <td className="border-r border-gray-200 p-0">
                        {row.barangId ? (
                          <input value={row.alasan}
                            onChange={e => updateItemAlasan(idx, e.target.value)}
                            className="w-full px-2 py-0.5 text-xs bg-transparent border-0 outline-none" />
                        ) : null}
                      </td>

                      {/* Delete */}
                      <td className="px-1 text-center">
                        {row.barangId && (
                          <button onClick={e => {
                            e.stopPropagation();
                            const next = ensureEmptyLast(items.filter((_, i) => i !== idx));
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

          {/* Bottom bar */}
          <div className="bg-gray-200 border-t border-gray-400 px-4 py-1.5 flex items-center shrink-0">
            <div className="flex gap-1">
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-1 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded">
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button onClick={() => { setShowForm(false); setEditId(null); }}
                className="px-6 py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold rounded">
                Batal
              </button>
            </div>
            <div className="ml-auto text-xs font-semibold text-blue-800">
              TOTAL QTY BARANG RETURN : {totalQty}
            </div>
          </div>
        </div>
      )}

      {/* ── PICKERS ──────────────────────────────────────────────────────── */}
      {showPelangganPicker && <PelangganPicker onSelect={handleSelectPelanggan} onClose={() => setShowPelangganPicker(false)} />}
      {showKasPicker && <KasPicker onSelect={handleSelectKas} onClose={() => setShowKasPicker(false)} />}
      {showFakturPicker && (
        <FakturJualPicker initialQ={fakturPickerQ}
          onSelect={handleSelectFakturItem} onClose={() => setShowFakturPicker(false)} />
      )}
    </>
  );
}
