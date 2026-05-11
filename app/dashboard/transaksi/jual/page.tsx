'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────

type JenisJual = 'toko';

interface BarangOption {
  _id: string;
  kode: string;
  nama: string;
  satuanJual: string;
  hargaJual: number;
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

function BarangPicker({ onSelect, onClose }: {
  onSelect: (b: BarangOption) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<BarangOption[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); fetchList(''); }, []);

  async function fetchList(search: string) {
    setLoading(true);
    const res = await fetch(`/api/barang?q=${encodeURIComponent(search)}`);
    setList(await res.json());
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded shadow-xl w-200 max-h-[80vh] flex flex-col">
        <div className="bg-green-700 text-white px-4 py-2 font-bold text-sm flex justify-between">
          <span>PILIH BARANG</span>
          <button onClick={onClose} className="hover:text-red-300">✕</button>
        </div>
        <div className="p-3 border-b">
          <input ref={inputRef} value={q}
            onChange={e => { setQ(e.target.value); fetchList(e.target.value); }}
            placeholder="Scan barcode, atau ketik kode / nama barang..."
            className="border rounded px-2 py-1 text-sm w-full" />
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-green-600 text-white sticky top-0">
              <tr>{['KODE','NAMA BARANG','SATUAN','STOK','LOKASI','HRG JUAL','DISKON%'].map(h =>
                <th key={h} className="px-2 py-1 text-left border border-green-500 whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="text-center py-6 text-gray-400">Memuat...</td></tr>}
              {!loading && list.map((b, i) => (
                <tr key={b._id} onClick={() => onSelect(b)}
                  className={`cursor-pointer hover:bg-green-100 ${i % 2 === 0 ? 'bg-white' : 'bg-green-50'} ${b.stok <= 0 ? 'text-orange-500' : ''}`}>
                  <td className="px-2 py-1 border border-gray-200">{b.kode}</td>
                  <td className="px-2 py-1 border border-gray-200">{b.nama}</td>
                  <td className="px-2 py-1 border border-gray-200">{b.satuanJual}</td>
                  <td className="px-2 py-1 border border-gray-200 text-right">{b.stok}</td>
                  <td className="px-2 py-1 border border-gray-200">{b.lokasi}</td>
                  <td className="px-2 py-1 border border-gray-200 text-right">{fmt(b.hargaJual)}</td>
                  <td className="px-2 py-1 border border-gray-200 text-right">{b.diskon}</td>
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

// ─── Number Cell ───────────────────────────────────────────────────────────────

function NumberCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState('');
  return editing ? (
    <input autoFocus type="number" value={raw}
      onChange={e => setRaw(e.target.value)}
      onBlur={() => { onChange(parseFloat(raw) || 0); setEditing(false); }}
      onKeyDown={e => { if (e.key === 'Enter') { onChange(parseFloat(raw) || 0); setEditing(false); } }}
      className="w-full text-right bg-white border-0 outline-none text-xs px-1" />
  ) : (
    <span className="block text-right cursor-pointer text-xs px-1 select-none"
      onClick={() => { setRaw(String(value || '')); setEditing(true); }}>
      {value === 0 ? '' : fmt(value)}
    </span>
  );
}



// ─── Main Component ────────────────────────────────────────────────────────────

export default function JualPage() {
  // List
  const [list, setList] = useState<JualDoc[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');

  // View
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form header
  const [jenis, setJenis] = useState<JenisJual>('toko');
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
  const [pembayaran, setPembayaran] = useState<'Cash' | 'Kredit'>('Cash');
  const [keterangan, setKeterangan] = useState('');
  const [disc, setDisc] = useState(0);
  const [ppn, setPpn] = useState(0);
  const [cetakNota, setCetakNota] = useState(true);

  // Items
  const [items, setItems] = useState<ItemRow[]>([emptyRow()]);
  const [activeRow, setActiveRow] = useState(0);

  // Pickers
  const [showPelangganPicker, setShowPelangganPicker] = useState(false);
  const [showKasPicker, setShowKasPicker] = useState(false);
  const [showBarangPicker, setShowBarangPicker] = useState(false);
  const [showKaryawanPicker, setShowKaryawanPicker] = useState(false);
  const [targetRow, setTargetRow] = useState(0);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── Fetch list ─────────────────────────────────────────────────────────────

  const fetchList = useCallback(async (q = '') => {
    setLoadingList(true);
    const res = await fetch(`/api/transaksi-jual?q=${encodeURIComponent(q)}`);
    setList(await res.json());
    setLoadingList(false);
  }, []);

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
      // Sync discRp from discPct if discPct changed
      if ('discPct' in patch && !('discRp' in patch)) {
        updated.discRp = Math.round(updated.qty * updated.harga * (updated.discPct / 100));
      }
      // Sync discPct from discRp if discRp changed
      if ('discRp' in patch && !('discPct' in patch)) {
        const base = updated.qty * updated.harga;
        updated.discPct = base > 0 ? Math.round((updated.discRp / base) * 10000) / 100 : 0;
      }
      updated.subtotal = computeSubtotal(updated);
      return updated;
    }));
  }

  function applyBarangToRow(idx: number, b: BarangOption) {
    const harga = b.hargaJual;
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
    const res = await fetch(`/api/transaksi-jual?action=next-ref&date=${today}`);
    const { refNo: nr } = await res.json();
    setEditId(null); setRefNo(nr); setTanggal(today); setJenis('toko');
    setPelangganId(''); setPelangganKode(''); setPelangganNama(''); setPelangganAlamat('');
    setKasId(''); setKasKode(''); setKasNama('');
    setSpg(''); setPembayaran('Cash'); setKeterangan('');
    setDisc(0); setPpn(0); setCetakNota(true);
    setItems([emptyRow()]); setActiveRow(0); setError('');
    setShowForm(true);
  }

  // ── Open edit form ─────────────────────────────────────────────────────────

  async function openEditForm(id: string) {
    const res = await fetch(`/api/transaksi-jual/${id}`);
    const doc = await res.json();
    setEditId(id); setRefNo(doc.refNo); setTanggal(toDateInput(doc.tanggal));
    setJenis(doc.jenis || 'toko');
    setPelangganId(doc.pelangganId || ''); setPelangganKode(doc.pelangganKode || '');
    setPelangganNama(doc.pelangganNama || ''); setPelangganAlamat(doc.pelangganAlamat || '');
    setKasId(doc.kasId || ''); setKasKode(doc.kasKode || ''); setKasNama(doc.kasNama || '');
    setSpg(doc.spg || ''); setPembayaran(doc.pembayaran || 'Cash');
    setKeterangan(doc.keterangan || '');
    setDisc(doc.disc || 0); setPpn(doc.ppn || 0); setCetakNota(doc.cetakNota ?? true);
    const loadedItems: ItemRow[] = (doc.items || []).map((it: Omit<ItemRow, '_key'>) => ({
      ...it, _key: Math.random().toString(36).slice(2),
    }));
    setItems(ensureEmptyLastRow(loadedItems));
    setActiveRow(0); setError(''); setShowForm(true);
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

  function handleSelectBarang(b: BarangOption) {
    applyBarangToRow(targetRow, b);
    setItems(prev => ensureEmptyLastRow(prev));
    setShowBarangPicker(false);
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    setError('');
    const validItems = items.filter(r => r.barangId && r.qty > 0);
    if (validItems.length === 0) { setError('Minimal 1 item barang harus diisi.'); return; }
    setSaving(true);
    try {
      const body = {
        refNo, tanggal, jenis, pelangganId, pelangganKode, pelangganNama, pelangganAlamat,
        kasId, kasKode, kasNama, spg, pembayaran, keterangan,
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
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Gagal menyimpan.'); return; }
      setShowForm(false); setEditId(null); fetchList();
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleHapus() {
    if (!selectedId) return;
    if (!confirm('Hapus transaksi ini? Stok barang akan dikembalikan.')) return;
    await fetch(`/api/transaksi-jual/${selectedId}`, { method: 'DELETE' });
    setSelectedId(null); fetchList();
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const listCols = ['NO. FAKTUR','TANGGAL','KODE PELANGGAN','NAMA PELANGGAN','ALAMAT PELANGGAN','OPERATOR','JUMLAH','KETERANGAN'];

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
                {loadingList && <tr><td colSpan={8} className="text-center py-10 text-gray-400">Memuat...</td></tr>}
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
                    <td className="px-2 py-1 border-r border-gray-200">{t.keterangan}</td>
                  </tr>
                ))}
                {!loadingList && list.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-16 text-gray-400 italic">&lt;No data to display&gt;</td></tr>
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
              <button className="px-4 py-1 rounded-full bg-gray-200 hover:bg-gray-300 text-xs font-semibold border border-gray-400">
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FORM ────────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-40 bg-green-50 flex flex-col" style={{ top: 120 }}>

          {/* Tabs */}
          <div className="bg-gray-200 flex items-end px-2 pt-1 gap-0.5 shrink-0 border-b border-gray-400">
            <div className="px-4 py-1 text-xs font-semibold border border-b-0 rounded-t bg-white border-gray-400 text-green-800">
              PENJUALAN TOKO
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
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold w-36 shrink-0">PEMBAYARAN</span>
                <select value={pembayaran} onChange={e => setPembayaran(e.target.value as 'Cash' | 'Kredit')}
                  className="border bg-white px-1 py-0.5 text-xs">
                  <option value="Cash">Cash</option>
                  <option value="Kredit">Kredit</option>
                </select>
              </div>
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
                  const isActive = idx === activeRow;
                  const isEmpty = !row.barangId;

                  return (
                    <tr key={row._key} onClick={() => setActiveRow(idx)}
                      className={`border-b border-gray-200 ${isActive && isEmpty ? 'bg-yellow-200' : isActive ? 'bg-green-100' : idx % 2 === 0 ? 'bg-white' : 'bg-green-50/30'}`}>

                      {/* # */}
                      <td className="px-1 py-0.5 border-r border-gray-200 text-center text-gray-400">
                        {isEmpty ? '' : idx + 1}
                      </td>

                      {/* NAMA BARANG */}
                      <td className="border-r border-gray-200 p-0">
                        <div className="relative">
                          <input value={row.namaBarang} readOnly
                            placeholder={isActive ? 'Scan Barcode, atau ketik kode atau nama barang...!!!' : ''}
                            onFocus={() => setActiveRow(idx)}
                            onKeyDown={e => { if (e.key === 'Enter') { setTargetRow(idx); setShowBarangPicker(true); } }}
                            onClick={() => { setActiveRow(idx); setTargetRow(idx); setShowBarangPicker(true); }}
                            className="w-full px-2 py-0.5 bg-transparent text-xs cursor-pointer outline-none" />
                          {isActive && row.barangId && (
                            <div className="absolute left-0 bottom-full flex gap-0 text-[10px] z-10 pointer-events-none mb-0.5">
                              <span className="bg-orange-500 text-white px-1 py-0.5">Stok: {row.stok}  Rak: {row.lokasi}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* SATUAN */}
                      <td className="border-r border-gray-200 px-2 py-0.5 text-xs">{row.satuan}</td>

                      {/* QTY */}
                      <td className="border-r border-gray-200">
                        <NumberCell value={row.qty} onChange={v => {
                          const discRp = Math.round(v * row.harga * (row.discPct / 100));
                          updateItem(idx, { qty: v, discRp });
                        }} />
                      </td>

                      {/* HARGA */}
                      <td className="border-r border-gray-200">
                        <NumberCell value={row.harga} onChange={v => {
                          const discRp = Math.round(row.qty * v * (row.discPct / 100));
                          updateItem(idx, { harga: v, discRp });
                        }} />
                      </td>

                      {/* DSC.% */}
                      <td className="border-r border-gray-200">
                        <NumberCell value={row.discPct} onChange={v => updateItem(idx, { discPct: v })} />
                      </td>

                      {/* DSC.Rp */}
                      <td className="border-r border-gray-200">
                        <NumberCell value={row.discRp} onChange={v => updateItem(idx, { discRp: v })} />
                      </td>

                      {/* SUBTOTAL */}
                      <td className="border-r border-gray-200 px-1 text-right font-semibold text-green-900 text-xs">
                        {row.subtotal === 0 ? '' : fmt(row.subtotal)}
                      </td>

                      {/* Delete */}
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
            {/* Left: print options */}
            <div className="flex flex-col gap-0.5">
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input type="checkbox" checked={cetakNota} onChange={e => setCetakNota(e.target.checked)} />
                Print
              </label>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap max-w-xs">
                <span>F1:ISIKAN KETERANGAN</span>
                <span>||</span>
                <span>F8:SIMPAN</span>
              </div>
              <input value={keterangan} onChange={e => setKeterangan(e.target.value)}
                placeholder="Keterangan..."
                className="border bg-white px-1 py-0.5 text-xs w-48 mt-1" />
            </div>

            {/* Right: totals */}
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
      {showBarangPicker && <BarangPicker onSelect={handleSelectBarang} onClose={() => setShowBarangPicker(false)} />}
    </>
  );
}
