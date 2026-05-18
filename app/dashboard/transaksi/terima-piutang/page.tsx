'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PelangganOption {
  _id: string; kode: string; nama: string; alamat: string; saldoPiutang: number;
}
interface KasOption { _id: string; kode: string; nama: string; saldo: number; }

interface PiutangOption {
  _id: string; refNo: string; tanggal: string;
  grandTotal: number; piutang: number; lunasPiutang: number;
  returnAmount: number;
}

interface ItemRow {
  _key: string;
  transaksiJualId: string;
  noPiutangInput: string;
  noPiutang: string;
  tglPiutang: string;
  jmlPiutang: number;
  returnAmount: number;
  angsuran: number;
}

interface TerimaPiutangDoc {
  _id: string; refNo: string; tanggal: string;
  pelangganId: string; pelangganKode: string; pelangganNama: string; pelangganAlamat: string;
  kasId: string; kasKode: string; kasNama: string;
  keterangan: string; operator: string;
  items: Omit<ItemRow, '_key' | 'noPiutangInput'>[];
  totalTerima: number;
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
    transaksiJualId: '', noPiutangInput: '', noPiutang: '', tglPiutang: '',
    jmlPiutang: 0, returnAmount: 0, angsuran: 0,
  };
}
function ensureEmptyLast(rows: ItemRow[]) {
  if (rows.length === 0 || rows[rows.length - 1].transaksiJualId !== '') return [...rows, emptyRow()];
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
      <div className="bg-white rounded shadow-xl w-175 max-h-[70vh] flex flex-col">
        <div className="bg-red-700 text-white px-4 py-2 font-bold text-sm flex justify-between">
          <span>PILIH PELANGGAN / MEMBER</span>
          <button onClick={onClose} className="hover:text-red-300">✕</button>
        </div>
        <div className="p-2 border-b">
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Cari kode / nama..." className="border rounded px-2 py-1 text-xs w-full" />
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-red-600 text-white sticky top-0">
              <tr>{['KODE','NAMA','ALAMAT','SALDO PIUTANG'].map(h =>
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
                  <td className="px-2 py-1 border border-gray-200 text-right">{fmt(p.saldoPiutang)}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={4} className="text-center py-4 text-gray-400 italic">Tidak ada data</td></tr>}
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

// ─── Piutang Picker ────────────────────────────────────────────────────────────

function PiutangPicker({ pelangganId, q: initialQ = '', onSelect, onClose }: {
  pelangganId: string;
  q?: string;
  onSelect: (p: PiutangOption) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState(initialQ);
  const [list, setList] = useState<PiutangOption[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (pelangganId) fetchPiutang();
  }, [pelangganId]);

  async function fetchPiutang() {
    if (!pelangganId) return;
    setLoading(true);
    try {
      const [jualRes, returnRes] = await Promise.all([
        fetch(`/api/transaksi-jual?pelangganId=${pelangganId}&piutangOnly=1`),
        fetch(`/api/return-penjualan?pelangganId=${pelangganId}`),
      ]);
      const jualData = await jualRes.json();
      const returnData = await returnRes.json();

      // Sum return amounts by transaksiJualId (fakturId)
      const returnByFaktur: Record<string, number> = {};
      for (const r of returnData) {
        for (const item of (r.items || [])) {
          if (item.fakturId) {
            returnByFaktur[item.fakturId] = (returnByFaktur[item.fakturId] || 0) + (item.subtotal || 0);
          }
        }
      }

      const result: PiutangOption[] = jualData.map((j: {
        _id: string; refNo: string; tanggal: string;
        grandTotal: number; piutang: number; lunasPiutang: number;
      }) => ({
        _id: j._id,
        refNo: j.refNo,
        tanggal: j.tanggal,
        grandTotal: j.grandTotal,
        piutang: j.piutang,
        lunasPiutang: j.lunasPiutang || 0,
        returnAmount: returnByFaktur[j._id] || 0,
      }));
      setList(result);
    } finally {
      setLoading(false);
    }
  }

  const filtered = list.filter(p => p.refNo.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded shadow-xl flex flex-col" style={{ width: '70vw', maxHeight: '70vh' }}>
        <div className="bg-red-700 text-white px-4 py-2 font-bold text-sm flex justify-between shrink-0">
          <span>PILIH PIUTANG PENJUALAN</span>
          <button onClick={onClose} className="hover:text-red-300">✕</button>
        </div>
        <div className="p-2 border-b shrink-0">
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Cari no. piutang..." className="border rounded px-2 py-1 text-xs w-full" />
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 bg-red-600 text-white">
              <tr>
                {['NO. PIUTANG','TGL. PIUTANG','GRAND TOTAL','RETURN','SISA PIUTANG','SUDAH DIBAYAR'].map(h =>
                  <th key={h} className="px-2 py-1 text-left border border-red-500 whitespace-nowrap">{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="text-center py-4 text-gray-400 text-xs">Memuat...</td></tr>}
              {!loading && filtered.map((p, i) => (
                <tr key={p._id} onClick={() => onSelect(p)}
                  className={`cursor-pointer border-b border-gray-100 hover:bg-red-100 ${i % 2 === 0 ? 'bg-white' : 'bg-red-50/30'}`}>
                  <td className="px-2 py-0.5 border-r border-gray-200 font-medium text-blue-700 whitespace-nowrap">{p.refNo}</td>
                  <td className="px-2 py-0.5 border-r border-gray-200 whitespace-nowrap">
                    {p.tanggal ? new Date(p.tanggal).toLocaleDateString('id-ID') : ''}
                  </td>
                  <td className="px-2 py-0.5 border-r border-gray-200 text-right">{fmt(p.grandTotal)}</td>
                  <td className="px-2 py-0.5 border-r border-gray-200 text-right">{p.returnAmount ? fmt(p.returnAmount) : '-'}</td>
                  <td className="px-2 py-0.5 border-r border-gray-200 text-right font-semibold text-red-700">{fmt(p.piutang)}</td>
                  <td className="px-2 py-0.5 text-right">{fmt(p.lunasPiutang)}</td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-6 text-gray-400 italic text-xs">
                  {pelangganId ? 'Tidak ada piutang outstanding' : 'Pilih pelanggan dulu'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function TerimaPiutangPage() {
  // List
  const [list, setList] = useState<TerimaPiutangDoc[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<TerimaPiutangDoc | null>(null);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [refNo, setRefNo] = useState('');
  const [tanggal, setTanggal] = useState(todayStr());
  const [pelangganId, setPelangganId] = useState('');
  const [pelangganKode, setPelangganKode] = useState('');
  const [pelangganKodeInput, setPelangganKodeInput] = useState('');
  const [pelangganNama, setPelangganNama] = useState('');
  const [pelangganAlamat, setPelangganAlamat] = useState('');
  const [kasId, setKasId] = useState('');
  const [kasKode, setKasKode] = useState('');
  const [kasNama, setKasNama] = useState('');
  const [kasSaldo, setKasSaldo] = useState(0);
  const [keterangan, setKeterangan] = useState('');
  const [operator] = useState('admin');

  // Items
  const [items, setItems] = useState<ItemRow[]>([emptyRow()]);
  const [activeRow, setActiveRow] = useState(0);

  // Pickers
  const [showPelangganPicker, setShowPelangganPicker] = useState(false);
  const [showKasPicker, setShowKasPicker] = useState(false);
  const [showPiutangPicker, setShowPiutangPicker] = useState(false);
  const [piutangPickerQ, setPiutangPickerQ] = useState('');
  const [targetRow, setTargetRow] = useState(0);

  // ── Totals ─────────────────────────────────────────────────────────────────

  const totalTerima = items.filter(r => r.transaksiJualId).reduce((s, r) => s + (r.angsuran || 0), 0);

  // ── Fetch list ─────────────────────────────────────────────────────────────

  const fetchList = useCallback(async () => {
    setLoadingList(true);
    const res = await fetch('/api/terima-piutang');
    setList(await res.json());
    setLoadingList(false);
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  useEffect(() => {
    if (!selectedId) { setSelectedDoc(null); return; }
    setSelectedDoc(list.find(d => d._id === selectedId) || null);
  }, [selectedId, list]);

  // ── Reset form ─────────────────────────────────────────────────────────────

  function resetForm() {
    setEditId(null); setRefNo(''); setTanggal(todayStr());
    setPelangganId(''); setPelangganKode(''); setPelangganKodeInput('');
    setPelangganNama(''); setPelangganAlamat('');
    setKasId(''); setKasKode(''); setKasNama(''); setKasSaldo(0);
    setKeterangan('');
    setItems([emptyRow()]); setActiveRow(0); setError('');
  }

  // ── Tambah ─────────────────────────────────────────────────────────────────

  async function handleTambah() {
    resetForm();
    const today = todayStr();
    const res = await fetch(`/api/terima-piutang?action=next-ref&date=${today}`);
    const { refNo: nr } = await res.json();
    setRefNo(nr); setTanggal(today);
    setShowForm(true);
  }

  // ── Edit ───────────────────────────────────────────────────────────────────

  async function handleEdit() {
    if (!selectedId) return;
    const res = await fetch(`/api/terima-piutang/${selectedId}`);
    const doc = await res.json();
    setEditId(doc._id); setRefNo(doc.refNo); setTanggal(toDateInput(doc.tanggal));
    setPelangganId(doc.pelangganId || ''); setPelangganKode(doc.pelangganKode || '');
    setPelangganKodeInput(doc.pelangganKode || ''); setPelangganNama(doc.pelangganNama || '');
    setPelangganAlamat(doc.pelangganAlamat || '');
    setKasId(doc.kasId || ''); setKasKode(doc.kasKode || ''); setKasNama(doc.kasNama || '');
    setKeterangan(doc.keterangan || '');
    const loadedItems: ItemRow[] = (doc.items || []).map((it: Omit<ItemRow, '_key' | 'noPiutangInput'>) => ({
      ...it, _key: Math.random().toString(36).slice(2), noPiutangInput: it.noPiutang,
    }));
    setItems(ensureEmptyLast(loadedItems));
    setActiveRow(0); setError(''); setShowForm(true);
  }

  // ── Hapus ──────────────────────────────────────────────────────────────────

  async function handleHapus() {
    if (!selectedId) return;
    if (!confirm('Hapus transaksi terima piutang ini? Piutang pelanggan akan dikembalikan.')) return;
    await fetch(`/api/terima-piutang/${selectedId}`, { method: 'DELETE' });
    setSelectedId(null); setSelectedDoc(null); fetchList();
  }

  // ── Pelanggan search ───────────────────────────────────────────────────────

  async function searchPelangganByKode(kode: string) {
    if (!kode.trim()) { setShowPelangganPicker(true); return; }
    const res = await fetch('/api/pelanggan');
    const data: PelangganOption[] = await res.json();
    const found = data.find(p => p.kode.toLowerCase() === kode.toLowerCase());
    if (found) handleSelectPelanggan(found);
    else setShowPelangganPicker(true);
  }

  function handleSelectPelanggan(p: PelangganOption) {
    setPelangganId(p._id); setPelangganKode(p.kode); setPelangganKodeInput(p.kode);
    setPelangganNama(p.nama); setPelangganAlamat(p.alamat);
    setShowPelangganPicker(false);
  }

  function handleSelectKas(k: KasOption) {
    setKasId(k._id); setKasKode(k.kode); setKasNama(k.nama); setKasSaldo(k.saldo);
    setShowKasPicker(false);
  }

  function handleSelectPiutang(p: PiutangOption) {
    if (items.some(r => r.transaksiJualId === p._id)) {
      setShowPiutangPicker(false); return;
    }
    const patch: Partial<ItemRow> = {
      transaksiJualId: p._id, noPiutang: p.refNo, noPiutangInput: p.refNo,
      tglPiutang: toDateInput(p.tanggal),
      jmlPiutang: p.piutang,
      returnAmount: p.returnAmount,
      angsuran: p.piutang,
    };
    setItems(prev => {
      const updated = prev.map((r, i) => i === targetRow ? { ...r, ...patch } : r);
      return ensureEmptyLast(updated);
    });
    setShowPiutangPicker(false);
  }

  // ── Load all piutang for pelanggan ─────────────────────────────────────────

  async function handleLoadAllPiutang() {
    if (!pelangganId) { setError('Pilih pelanggan dulu.'); return; }
    setError('');
    const [jualRes, returnRes] = await Promise.all([
      fetch(`/api/transaksi-jual?pelangganId=${pelangganId}&piutangOnly=1`),
      fetch(`/api/return-penjualan?pelangganId=${pelangganId}`),
    ]);
    const jualData = await jualRes.json();
    const returnData = await returnRes.json();

    const returnByFaktur: Record<string, number> = {};
    for (const r of returnData) {
      for (const item of (r.items || [])) {
        if (item.fakturId) {
          returnByFaktur[item.fakturId] = (returnByFaktur[item.fakturId] || 0) + (item.subtotal || 0);
        }
      }
    }

    const newRows: ItemRow[] = jualData
      .filter((j: { _id: string }) => !items.some(r => r.transaksiJualId === j._id))
      .map((j: { _id: string; refNo: string; tanggal: string; piutang: number }) => ({
        _key: Math.random().toString(36).slice(2),
        transaksiJualId: j._id,
        noPiutangInput: j.refNo,
        noPiutang: j.refNo,
        tglPiutang: toDateInput(j.tanggal),
        jmlPiutang: j.piutang,
        returnAmount: returnByFaktur[j._id] || 0,
        angsuran: j.piutang,
      }));

    if (newRows.length === 0) { setError('Tidak ada piutang outstanding untuk pelanggan ini.'); return; }
    setItems(prev => ensureEmptyLast([...prev.filter(r => r.transaksiJualId), ...newRows]));
  }

  // ── Item update ────────────────────────────────────────────────────────────

  function updateAngsuran(idx: number, val: number) {
    setItems(prev => prev.map((r, i) => i !== idx ? r : { ...r, angsuran: Math.max(0, Math.min(val, r.jmlPiutang)) }));
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    setError('');
    const validItems = items.filter(r => r.transaksiJualId && r.angsuran > 0);
    if (validItems.length === 0) { setError('Minimal 1 piutang harus diisi.'); return; }
    if (!kasId) { setError('Pilih kas penerimaan.'); return; }
    setSaving(true);
    try {
      const body = {
        refNo, tanggal, pelangganId, pelangganKode, pelangganNama, pelangganAlamat,
        kasId, kasKode, kasNama, keterangan, operator,
        totalTerima,
        items: validItems.map(({ _key, noPiutangInput, ...r }) => r),
      };
      const isEdit = !!editId;
      const url = isEdit ? `/api/terima-piutang/${editId}` : '/api/terima-piutang';
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
        <div className="flex flex-col bg-blue-50" style={{ height: 'calc(100vh - 185px)' }}>
          <div className="flex flex-1 overflow-hidden">
            {/* Left: list */}
            <div className="flex flex-col border-r-2 border-blue-300 bg-blue-100 shrink-0" style={{ width: 280 }}>
              <div className="grid bg-blue-600 text-white text-xs font-semibold shrink-0" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="px-2 py-1 border-r border-blue-500">NO. REF</div>
                <div className="px-2 py-1">TANGGAL</div>
              </div>
              <div className="overflow-auto flex-1">
                {loadingList && <p className="text-center text-xs text-gray-400 py-4">Memuat...</p>}
                {!loadingList && list.map((r, i) => (
                  <div key={r._id}
                    onClick={() => setSelectedId(r._id === selectedId ? null : r._id)}
                    onDoubleClick={() => { setSelectedId(r._id); setTimeout(() => handleEdit(), 0); }}
                    className={`grid text-xs cursor-pointer border-b border-blue-200 ${selectedId === r._id ? 'bg-blue-600 text-white' : i % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-blue-50 hover:bg-blue-100'}`}
                    style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="px-2 py-0.5 border-r border-blue-200 whitespace-nowrap font-medium">{r.refNo}</div>
                    <div className="px-2 py-0.5 whitespace-nowrap">
                      {new Date(r.tanggal).toLocaleDateString('id-ID')}
                    </div>
                  </div>
                ))}
                {!loadingList && list.length === 0 && <p className="text-center text-xs text-gray-400 italic py-6">Tidak ada data</p>}
              </div>
            </div>

            {/* Right: detail */}
            <div className="flex-1 flex flex-col overflow-hidden bg-blue-50 p-3">
              {selectedDoc ? (
                <>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold w-24 shrink-0">NOMOR REF</span>
                      <span className="border bg-white px-2 py-0.5 rounded flex-1 font-bold">{selectedDoc.refNo}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold w-24 shrink-0">TANGGAL</span>
                      <span className="border bg-white px-2 py-0.5 rounded flex-1">
                        {new Date(selectedDoc.tanggal).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold w-24 shrink-0">PELANGGAN</span>
                      <span className="border bg-white px-2 py-0.5 rounded flex-1">{selectedDoc.pelangganNama}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold w-24 shrink-0">JUMLAH</span>
                      <span className="border bg-white px-2 py-0.5 rounded flex-1 text-right font-bold text-blue-700">{fmt(selectedDoc.totalTerima)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold w-24 shrink-0">KODE KAS</span>
                      <span className="border bg-white px-2 py-0.5 rounded flex-1">{selectedDoc.kasNama}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold w-24 shrink-0">OPERATOR</span>
                      <span className="border bg-white px-2 py-0.5 rounded flex-1">{selectedDoc.operator}</span>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <span className="font-semibold w-24 shrink-0">KETERANGAN</span>
                      <span className="border bg-white px-2 py-0.5 rounded flex-1">{selectedDoc.keterangan}</span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead className="sticky top-0 bg-blue-600 text-white">
                        <tr>
                          {['NO. PIUTANG','TGL. PIUTANG','JML PIUTANG','JML BAYAR'].map(h =>
                            <th key={h} className="px-2 py-1 text-left border border-blue-500 whitespace-nowrap">{h}</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDoc.items.map((it, i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'}>
                            <td className="px-2 py-0.5 border border-gray-200 font-medium">{it.noPiutang}</td>
                            <td className="px-2 py-0.5 border border-gray-200 whitespace-nowrap">
                              {it.tglPiutang ? new Date(it.tglPiutang).toLocaleDateString('id-ID') : ''}
                            </td>
                            <td className="px-2 py-0.5 border border-gray-200 text-right">{fmt(it.jmlPiutang)}</td>
                            <td className="px-2 py-0.5 border border-gray-200 text-right font-bold text-blue-700">{fmt(it.angsuran)}</td>
                          </tr>
                        ))}
                        {selectedDoc.items.length === 0 && (
                          <tr><td colSpan={4} className="text-center py-4 text-gray-400 italic">Tidak ada item</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 italic text-sm">
                  ← Pilih transaksi di kiri
                </div>
              )}
            </div>
          </div>

          {/* Bottom buttons */}
          <div className="bg-blue-200 border-t-2 border-blue-400 px-3 py-1.5 flex items-center shrink-0">
            <div className="flex gap-1">
              <button onClick={handleTambah}
                className="px-5 py-1 bg-gray-300 hover:bg-gray-400 text-xs font-semibold border border-gray-500 rounded">
                TAMBAH
              </button>
              <button onClick={handleEdit} disabled={!selectedId}
                className="px-5 py-1 bg-gray-300 hover:bg-gray-400 text-xs font-semibold border border-gray-500 rounded disabled:opacity-40">
                EDIT
              </button>
              <button onClick={handleHapus} disabled={!selectedId}
                className="px-5 py-1 bg-gray-300 hover:bg-gray-400 text-xs font-semibold border border-gray-500 rounded disabled:opacity-40">
                Hapus
              </button>
            </div>
            <div className="ml-auto">
              <button className="px-5 py-1 bg-gray-300 hover:bg-gray-400 text-xs font-semibold border border-gray-500 rounded">
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FORM MODAL ──────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-40 bg-blue-50 flex flex-col" style={{ top: 120 }}>

          {/* Header */}
          <div className="bg-blue-100 border-b-2 border-blue-300 px-4 py-2 shrink-0">
            <div className="flex gap-6 items-start">
              {/* Left: member + kas + keterangan */}
              <div className="flex flex-col gap-1 min-w-105">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold w-24 shrink-0">TANGGAL</span>
                  <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)}
                    className="border bg-white px-1 py-0.5 text-xs w-32" />
                  <span className="text-xs font-semibold ml-4 shrink-0">NO. REF</span>
                  <span className="text-xs font-bold text-blue-800 ml-1">: {refNo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold w-24 shrink-0">MEMBER</span>
                  <input value={pelangganKodeInput}
                    onChange={e => setPelangganKodeInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') searchPelangganByKode(pelangganKodeInput); }}
                    className="border bg-white px-1 py-0.5 text-xs w-16" />
                  <input readOnly value={pelangganNama}
                    className="border bg-gray-50 px-1 py-0.5 text-xs flex-1" />
                  <button
                    onClick={handleLoadAllPiutang}
                    className="border bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 text-xs rounded shrink-0 whitespace-nowrap">
                    Pilih Dan Daftar Piutang
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold w-24 shrink-0">ALAMAT</span>
                  <input readOnly value={pelangganAlamat}
                    className="border bg-gray-50 px-1 py-0.5 text-xs flex-1" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold w-24 shrink-0">KODE KAS</span>
                  <button onClick={() => setShowKasPicker(true)}
                    className="border bg-white hover:bg-gray-100 px-2 py-0.5 text-xs w-24 text-left">
                    {kasNama || kasKode || '-- Pilih --'}
                  </button>
                  {kasKode && (
                    <span className="text-xs text-gray-600">SALDO : <span className="font-semibold">{fmt(kasSaldo)}</span></span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold w-24 shrink-0">KETERANGAN</span>
                  <input value={keterangan} onChange={e => setKeterangan(e.target.value)}
                    className="border bg-white px-1 py-0.5 text-xs flex-1" />
                </div>
              </div>

              {/* Right: big number */}
              <div className="ml-auto flex flex-col items-end justify-center">
                <div className="text-5xl font-black text-gray-800 tracking-tight leading-none">
                  {fmt(totalTerima)}
                </div>
                <div className="text-xs text-gray-500 mt-1 font-semibold">TOTAL PENERIMAAN</div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border-b border-red-400 text-red-700 text-xs px-4 py-1 shrink-0">⚠ {error}</div>
          )}

          {/* Items table */}
          <div className="flex-1 overflow-auto bg-white">
            <table className="border-collapse text-xs w-full">
              <thead className="sticky top-0 z-10 bg-blue-700 text-white">
                <tr>
                  <th className="px-2 py-1 border border-blue-600 w-8 text-center">#</th>
                  <th className="px-2 py-1 border border-blue-600 text-left" style={{ minWidth: 160 }}>NO. PIUTANG</th>
                  <th className="px-2 py-1 border border-blue-600 text-left w-28">TGL. PIUTANG</th>
                  <th className="px-2 py-1 border border-blue-600 text-right w-36">JML. PIUTANG</th>
                  <th className="px-2 py-1 border border-blue-600 text-right w-32">RETURN</th>
                  <th className="px-2 py-1 border border-blue-600 text-right w-40">ANGSURAN PIUTANG</th>
                  <th className="px-2 py-1 border border-blue-600 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => {
                  const isActive = idx === activeRow;
                  const isEmpty = !row.transaksiJualId;
                  return (
                    <tr key={row._key} onClick={() => setActiveRow(idx)}
                      className={`border-b border-gray-200 ${isActive ? 'bg-blue-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                      <td className="px-1 py-0.5 border-r border-gray-200 text-center text-gray-400">
                        {isEmpty ? '' : idx + 1}
                      </td>

                      {/* NO. PIUTANG */}
                      <td className="border-r border-gray-200 p-0">
                        <input value={row.noPiutangInput} readOnly
                          placeholder={isActive ? 'Enter untuk cari piutang...' : ''}
                          onClick={() => { setActiveRow(idx); setTargetRow(idx); setPiutangPickerQ(row.noPiutangInput); setShowPiutangPicker(true); }}
                          onKeyDown={e => { if (e.key === 'Enter') { setTargetRow(idx); setPiutangPickerQ(row.noPiutangInput); setShowPiutangPicker(true); } }}
                          className="w-full px-2 py-0.5 bg-transparent text-xs cursor-pointer outline-none" />
                      </td>

                      {/* TGL. PIUTANG */}
                      <td className="px-2 py-0.5 border-r border-gray-200 text-xs whitespace-nowrap">
                        {row.tglPiutang ? new Date(row.tglPiutang).toLocaleDateString('id-ID') : ''}
                      </td>

                      {/* JML. PIUTANG */}
                      <td className="px-2 py-0.5 border-r border-gray-200 text-right text-xs">
                        {row.jmlPiutang ? fmt(row.jmlPiutang) : ''}
                      </td>

                      {/* RETURN */}
                      <td className="px-2 py-0.5 border-r border-gray-200 text-right text-xs">
                        {row.returnAmount ? fmt(row.returnAmount) : ''}
                      </td>

                      {/* ANGSURAN (editable) */}
                      <td className="border-r border-gray-200 p-0">
                        {row.transaksiJualId ? (
                          <input type="number" value={row.angsuran || ''}
                            onChange={e => updateAngsuran(idx, parseFloat(e.target.value) || 0)}
                            className="w-full text-right px-2 py-0.5 text-xs bg-transparent outline-none border-0 font-semibold" />
                        ) : null}
                      </td>

                      {/* Delete */}
                      <td className="px-1 text-center">
                        {row.transaksiJualId && (
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
          <div className="bg-blue-200 border-t-2 border-blue-400 px-4 py-1.5 flex items-center shrink-0">
            <div className="flex gap-1 items-center">
              <button onClick={handleSave} disabled={saving}
                className="px-6 py-1 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded">
                {saving ? 'Menyimpan...' : '[F8] : SIMPAN'}
              </button>
              <button onClick={() => { setShowForm(false); setEditId(null); }}
                className="px-6 py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold rounded">
                [ESC] : BATAL
              </button>
              <span className="text-xs ml-2">NOTA</span>
              <select className="border bg-white px-1 py-0.5 text-xs ml-1">
                <option>STANDART</option>
              </select>
            </div>
            <div className="ml-auto text-sm font-bold text-blue-800">
              PEMBAYARAN PIUTANG
            </div>
          </div>
        </div>
      )}

      {/* ── PICKERS ──────────────────────────────────────────────────────── */}
      {showPelangganPicker && (
        <PelangganPicker onSelect={handleSelectPelanggan} onClose={() => setShowPelangganPicker(false)} />
      )}
      {showKasPicker && (
        <KasPicker onSelect={handleSelectKas} onClose={() => setShowKasPicker(false)} />
      )}
      {showPiutangPicker && (
        <PiutangPicker pelangganId={pelangganId} q={piutangPickerQ}
          onSelect={handleSelectPiutang} onClose={() => setShowPiutangPicker(false)} />
      )}
    </>
  );
}
