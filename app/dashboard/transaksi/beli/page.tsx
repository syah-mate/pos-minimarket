'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BarangOption {
  _id: string;
  kode: string;
  nama: string;
  satuanBeli: string;
  satuanJual: string;
  isi: number;
  hargaBeli: number;
  hargaJual: number;
  hargaJualToko: number;
  hargaJualPartai: number;
  hargaJualCabang: number;
  stok: number;
  hasExpired: boolean;
}

interface SupplierOption {
  _id: string;
  kode: string;
  nama: string;
  alamat: string;
  kota: string;
  telp: string;
}

interface KasOption {
  _id: string;
  kode: string;
  nama: string;
  saldo: number;
}

interface ItemRow {
  _key: string;
  barangId: string;
  namaBarang: string;
  satuan: string;
  satuanType: 'jual' | 'beli';
  isi: number;
  qty: number;
  hrgBeli: number;
  hgaToko: number;
  pctToko: number;
  hrgPartai: number;
  pctPartai: number;
  hrgCabang: number;
  pctCabang: number;
  disc: number;
  rupiah: number;
  expired: string;
  hasExpired: boolean;
}

type PembayaranBeliType = 'Cash' | '1 Minggu' | '2 Minggu' | '3 Minggu' | '4 Minggu' | 'Custom';

interface TransaksiDoc {
  _id: string;
  refNo: string;
  tanggal: string;
  supplierNama: string;
  supplierAlamat: string;
  kasKode: string;
  keterangan: string;
  lunas: number;
  hutang: number;
  tempo: string | null;
  lunasOperator: string;
  grandTotal: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID').format(Math.round(n));

function toDateInput(d: Date | string) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}

function todayStr() {
  return toDateInput(new Date());
}

function emptyRow(): ItemRow {
  return {
    _key: Math.random().toString(36).slice(2),
    barangId: '', namaBarang: '', satuan: '',
    satuanType: 'jual', isi: 1, qty: 0, hrgBeli: 0,
    hgaToko: 0, pctToko: 0, hrgPartai: 0, pctPartai: 0,
    hrgCabang: 0, pctCabang: 0, disc: 0, rupiah: 0,
    expired: '', hasExpired: false,
  };
}

function computeRupiah(row: ItemRow) {
  return Math.max(0, row.qty * row.hrgBeli - row.disc);
}

function hrgBeliPerPcs(row: ItemRow) {
  if (row.satuanType === 'beli' && row.isi > 1) return row.hrgBeli / row.isi;
  return row.hrgBeli;
}

function pctFrom(jual: number, beli: number) {
  if (beli === 0) return 0;
  return Math.round(((jual / beli) - 1) * 10000) / 100;
}

// ─── Supplier Picker ───────────────────────────────────────────────────────────

function SupplierPicker({
  onSelect,
  onClose,
}: {
  onSelect: (s: SupplierOption) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    fetchList('');
  }, []);

  async function fetchList(search: string) {
    setLoading(true);
    const res = await fetch(`/api/supplier?q=${encodeURIComponent(search)}`);
    setList(await res.json());
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded shadow-xl w-175 max-h-[80vh] flex flex-col">
        <div className="bg-blue-700 text-white px-4 py-2 font-bold text-sm flex justify-between">
          <span>PILIH SUPPLIER</span>
          <button onClick={onClose} className="hover:text-red-300">✕</button>
        </div>
        <div className="p-3 border-b flex gap-2">
          <input
            ref={inputRef}
            value={q}
            onChange={e => { setQ(e.target.value); fetchList(e.target.value); }}
            placeholder="Cari nama / kode / kota..."
            className="border rounded px-2 py-1 text-sm flex-1"
          />
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-blue-600 text-white sticky top-0">
              <tr>
                {['KODE','NAMA','ALAMAT','KOTA','TELP'].map(h => (
                  <th key={h} className="px-2 py-1 text-left border border-blue-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="text-center py-6 text-gray-400">Memuat...</td></tr>
              )}
              {!loading && list.map((s, i) => (
                <tr
                  key={s._id}
                  className={`cursor-pointer hover:bg-blue-100 ${i % 2 === 0 ? 'bg-white' : 'bg-blue-50'}`}
                  onClick={() => onSelect(s)}
                >
                  <td className="px-2 py-1 border border-gray-200">{s.kode}</td>
                  <td className="px-2 py-1 border border-gray-200">{s.nama}</td>
                  <td className="px-2 py-1 border border-gray-200">{s.alamat}</td>
                  <td className="px-2 py-1 border border-gray-200">{s.kota}</td>
                  <td className="px-2 py-1 border border-gray-200">{s.telp}</td>
                </tr>
              ))}
              {!loading && list.length === 0 && (
                <tr><td colSpan={5} className="text-center py-6 text-gray-400 italic">Tidak ada data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Kas Picker ────────────────────────────────────────────────────────────────

function KasPicker({
  onSelect,
  onClose,
}: {
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

  const filtered = list.filter(
    k => k.nama.toLowerCase().includes(q.toLowerCase()) || k.kode.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded shadow-xl w-112.5 max-h-[60vh] flex flex-col">
        <div className="bg-blue-700 text-white px-4 py-2 font-bold text-sm flex justify-between">
          <span>PILIH KAS</span>
          <button onClick={onClose} className="hover:text-red-300">✕</button>
        </div>
        <div className="p-3 border-b">
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Cari kode / nama..."
            className="border rounded px-2 py-1 text-sm w-full"
          />
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-blue-600 text-white sticky top-0">
              <tr>
                {['KODE','NAMA','SALDO'].map(h => (
                  <th key={h} className="px-2 py-1 text-left border border-blue-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((k, i) => (
                <tr
                  key={k._id}
                  className={`cursor-pointer hover:bg-blue-100 ${i % 2 === 0 ? 'bg-white' : 'bg-blue-50'}`}
                  onClick={() => onSelect(k)}
                >
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

// ─── Barang Picker ─────────────────────────────────────────────────────────────

function BarangPicker({
  onSelect,
  onClose,
}: {
  onSelect: (b: BarangOption) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [list, setList] = useState<BarangOption[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    fetchList('');
  }, []);

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
          <span>PILIH BARANG</span>
          <button onClick={onClose} className="hover:text-red-300">✕</button>
        </div>
        <div className="p-3 border-b flex gap-2">
          <input
            ref={inputRef}
            value={q}
            onChange={e => { setQ(e.target.value); fetchList(e.target.value); }}
            placeholder="Cari nama / kode / kategori..."
            className="border rounded px-2 py-1 text-sm flex-1"
          />
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-blue-600 text-white sticky top-0">
              <tr>
                {['KODE','NAMA BARANG','SAT JUAL','SAT BELI','ISI','STOK','HRG BELI','HRG JUAL'].map(h => (
                  <th key={h} className="px-2 py-1 text-left border border-blue-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="text-center py-6 text-gray-400">Memuat...</td></tr>
              )}
              {!loading && list.map((b, i) => (
                <tr
                  key={b._id}
                  className={`cursor-pointer hover:bg-blue-100 ${i % 2 === 0 ? 'bg-white' : 'bg-blue-50'}`}
                  onClick={() => onSelect(b)}
                >
                  <td className="px-2 py-1 border border-gray-200">{b.kode}</td>
                  <td className="px-2 py-1 border border-gray-200">{b.nama}</td>
                  <td className="px-2 py-1 border border-gray-200">{b.satuanJual}</td>
                  <td className="px-2 py-1 border border-gray-200">{b.satuanBeli}</td>
                  <td className="px-2 py-1 border border-gray-200 text-right">{b.isi}</td>
                  <td className="px-2 py-1 border border-gray-200 text-right">{b.stok}</td>
                  <td className="px-2 py-1 border border-gray-200 text-right">{fmt(b.hargaBeli)}</td>
                  <td className="px-2 py-1 border border-gray-200 text-right">{fmt(b.hargaJual)}</td>
                </tr>
              ))}
              {!loading && list.length === 0 && (
                <tr><td colSpan={8} className="text-center py-6 text-gray-400 italic">Tidak ada data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Satuan Picker ─────────────────────────────────────────────────────────────

function SatuanPicker({
  barang,
  onSelect,
  onClose,
}: {
  barang: BarangOption;
  onSelect: (type: 'jual' | 'beli') => void;
  onClose: () => void;
}) {
  const options: { type: 'jual' | 'beli'; label: string; hrgBeli: number; isi: number }[] = [
    { type: 'jual', label: barang.satuanJual, hrgBeli: barang.hargaBeli, isi: 1 },
  ];
  if (barang.satuanBeli !== barang.satuanJual || barang.isi > 1) {
    options.push({ type: 'beli', label: barang.satuanBeli, hrgBeli: barang.hargaBeli * barang.isi, isi: barang.isi });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded shadow-xl w-100">
        <div className="bg-blue-700 text-white px-4 py-2 font-bold text-sm flex justify-between">
          <span>PILIH SATUAN — {barang.nama}</span>
          <button onClick={onClose} className="hover:text-red-300">✕</button>
        </div>
        <div className="p-4">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="px-3 py-2 text-left border border-blue-500">SATUAN</th>
                <th className="px-3 py-2 text-right border border-blue-500">ISI</th>
                <th className="px-3 py-2 text-right border border-blue-500">HRG BELI / SAT</th>
              </tr>
            </thead>
            <tbody>
              {options.map(o => (
                <tr
                  key={o.type}
                  className="cursor-pointer hover:bg-blue-100 border-b"
                  onClick={() => onSelect(o.type)}
                >
                  <td className="px-3 py-2 border border-gray-200 font-semibold">{o.label}</td>
                  <td className="px-3 py-2 border border-gray-200 text-right">{o.isi}</td>
                  <td className="px-3 py-2 border border-gray-200 text-right">{fmt(o.hrgBeli)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Number Cell (inline editable) ────────────────────────────────────────────

function NumberCell({
  value, onChange,
}: { value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState('');
  return editing ? (
    <input
      autoFocus
      type="number"
      value={raw}
      onChange={e => setRaw(e.target.value)}
      onBlur={() => { onChange(parseFloat(raw) || 0); setEditing(false); }}
      onKeyDown={e => { if (e.key === 'Enter') { onChange(parseFloat(raw) || 0); setEditing(false); } }}
      className="w-full text-right bg-white border-0 outline-none text-xs px-1"
    />
  ) : (
    <span
      className="block text-right cursor-pointer text-xs px-1 select-none"
      onDoubleClick={() => { setRaw(String(value || '')); setEditing(true); }}
      onClick={() => { setRaw(String(value || '')); setEditing(true); }}
    >
      {value === 0 ? '' : fmt(value)}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function BeliPage() {
  // List state
  const [list, setList] = useState<TransaksiDoc[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState('');

  // View state
  const [showForm, setShowForm] = useState(false);

  // Form header state
  const [refNo, setRefNo] = useState('');
  const [tanggal, setTanggal] = useState(todayStr());
  const [supplierId, setSupplierId] = useState('');
  const [supplierNama, setSupplierNama] = useState('');
  const [supplierAlamat, setSupplierAlamat] = useState('');
  const [kasId, setKasId] = useState('');
  const [kasKode, setKasKode] = useState('');
  const [kasNama, setKasNama] = useState('');
  const [kasSaldo, setKasSaldo] = useState(0);
  const [keterangan, setKeterangan] = useState('');
  const [pembayaran, setPembayaran] = useState<PembayaranBeliType>('Cash');
  const [tempoHari, setTempoHari] = useState(0);
  const [disc, setDisc] = useState(0);
  const [ppn, setPpn] = useState(0);
  const [cetakBarcode, setCetakBarcode] = useState(false);
  const [updateHargaJual, setUpdateHargaJual] = useState(false);
  const [cetakNota, setCetakNota] = useState(false);

  // Items state
  const [items, setItems] = useState<ItemRow[]>([emptyRow()]);
  const [activeRow, setActiveRow] = useState(0);

  // Picker states
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);
  const [showKasPicker, setShowKasPicker] = useState(false);
  const [showBarangPicker, setShowBarangPicker] = useState(false);
  const [showSatuanPicker, setShowSatuanPicker] = useState(false);
  const [pickerBarang, setPickerBarang] = useState<BarangOption | null>(null);
  const [targetRow, setTargetRow] = useState(0);

  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── Fetch list ─────────────────────────────────────────────────────────────

  const fetchList = useCallback(async (q = '') => {
    setLoadingList(true);
    const res = await fetch(`/api/transaksi-beli?q=${encodeURIComponent(q)}`);
    setList(await res.json());
    setLoadingList(false);
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  // ── Open form ──────────────────────────────────────────────────────────────

  async function openNewForm() {
    const today = todayStr();
    const res = await fetch(`/api/transaksi-beli?action=next-ref&date=${today}`);
    const { refNo: nr } = await res.json();
    setRefNo(nr);
    setTanggal(today);
    setSupplierId(''); setSupplierNama(''); setSupplierAlamat('');
    setKasId(''); setKasKode(''); setKasNama(''); setKasSaldo(0);
    setKeterangan(''); setPembayaran('Cash'); setTempoHari(0);
    setDisc(0); setPpn(0); setCetakBarcode(false);
    setUpdateHargaJual(false); setCetakNota(false);
    setItems([emptyRow()]); setActiveRow(0);
    setError('');
    setShowForm(true);
  }

  // ── Open edit form ──────────────────────────────────────────────────────────

  async function openEditForm(id: string) {
    const res = await fetch(`/api/transaksi-beli/${id}`);
    const doc = await res.json();
    setEditId(id);
    setRefNo(doc.refNo);
    setTanggal(toDateInput(doc.tanggal));
    setSupplierId(doc.supplierId || '');
    setSupplierNama(doc.supplierNama || '');
    setSupplierAlamat(doc.supplierAlamat || '');
    setKasId(doc.kasId || '');
    setKasKode(doc.kasKode || '');
    setKasNama(doc.kasNama || '');
    setKasSaldo(0);
    setKeterangan(doc.keterangan || '');
    const rawPembayaran = doc.pembayaran || 'Cash';
    setPembayaran(rawPembayaran === 'Tempo' ? 'Custom' : rawPembayaran as PembayaranBeliType);
    setTempoHari(doc.tempoHari || 0);
    setDisc(doc.disc || 0);
    setPpn(doc.ppn || 0);
    setCetakBarcode(doc.cetakBarcode || false);
    setUpdateHargaJual(doc.updateHargaJual || false);
    setCetakNota(false);
    const loadedItems: ItemRow[] = (doc.items || []).map((item: Omit<ItemRow, '_key'>) => ({
      ...item,
      _key: Math.random().toString(36).slice(2),
      expired: item.expired ? toDateInput(item.expired as unknown as string) : '',
      hasExpired: !!item.expired,
    }));
    setItems(ensureEmptyLastRow(loadedItems));
    setActiveRow(0);
    setError('');
    setShowForm(true);
  }

  // ── Totals ─────────────────────────────────────────────────────────────────

  const subtotal = items.reduce((s, r) => s + r.rupiah, 0);
  const discAmount = subtotal * (disc / 100);
  const afterDisc = subtotal - discAmount;
  const ppnAmount = afterDisc * (ppn / 100);
  const grandTotal = afterDisc + ppnAmount;

  // ── Item helpers ───────────────────────────────────────────────────────────

  function updateItem(idx: number, patch: Partial<ItemRow>) {
    setItems(prev =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        const updated = { ...r, ...patch };
        updated.rupiah = computeRupiah(updated);
        return updated;
      })
    );
  }

  function applyBarangToRow(idx: number, b: BarangOption, satuanType: 'jual' | 'beli') {
    const hrgBeli = satuanType === 'beli' ? b.hargaBeli * b.isi : b.hargaBeli;
    const satuan = satuanType === 'beli' ? b.satuanBeli : b.satuanJual;
    const hrgBeliPcs = b.hargaBeli;
    const hgaToko = b.hargaJualToko || b.hargaJual;
    const hrgPartai = b.hargaJualPartai || b.hargaJual;
    const hrgCabang = b.hargaJualCabang || b.hargaJual;
    const pctToko = pctFrom(hgaToko, hrgBeliPcs);
    const pctPartai = pctFrom(hrgPartai, hrgBeliPcs);
    const pctCabang = pctFrom(hrgCabang, hrgBeliPcs);
    setItems(prev =>
      prev.map((r, i) =>
        i === idx
          ? {
              ...r,
              barangId: b._id, namaBarang: b.nama, satuan,
              satuanType, isi: b.isi, qty: r.qty || 1,
              hrgBeli, hgaToko, pctToko,
              hrgPartai, pctPartai,
              hrgCabang, pctCabang,
              disc: 0, hasExpired: b.hasExpired,
              rupiah: Math.max(0, (r.qty || 1) * hrgBeli),
            }
          : r
      )
    );
  }

  function ensureEmptyLastRow(rows: ItemRow[]) {
    if (rows.length === 0 || rows[rows.length - 1].barangId !== '') {
      return [...rows, emptyRow()];
    }
    return rows;
  }

  // ── Picker callbacks ───────────────────────────────────────────────────────

  function handleSelectSupplier(s: SupplierOption) {
    setSupplierId(s._id); setSupplierNama(s.nama); setSupplierAlamat(s.alamat);
    setShowSupplierPicker(false);
  }

  function handleSelectKas(k: KasOption) {
    setKasId(k._id); setKasKode(k.kode); setKasNama(k.nama); setKasSaldo(k.saldo);
    setShowKasPicker(false);
  }

  function handleSelectBarang(b: BarangOption) {
    setShowBarangPicker(false);
    if (b.satuanBeli !== b.satuanJual || b.isi > 1) {
      setPickerBarang(b);
      setShowSatuanPicker(true);
    } else {
      applyBarangToRow(targetRow, b, 'jual');
      setItems(prev => ensureEmptyLastRow(prev));
    }
  }

  function handleSelectSatuan(type: 'jual' | 'beli') {
    if (!pickerBarang) return;
    applyBarangToRow(targetRow, pickerBarang, type);
    setItems(prev => ensureEmptyLastRow(prev));
    setShowSatuanPicker(false);
    setPickerBarang(null);
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    setError('');
    const validItems = items.filter(r => r.barangId && r.qty > 0);
    if (validItems.length === 0) {
      setError('Minimal 1 item barang harus diisi.');
      return;
    }
    setSaving(true);
    try {
      const resolvedTempoHari = pembayaran === '1 Minggu' ? 7
        : pembayaran === '2 Minggu' ? 14
        : pembayaran === '3 Minggu' ? 21
        : pembayaran === '4 Minggu' ? 28
        : pembayaran === 'Custom' ? tempoHari
        : 0;
      const jatuhTempo = pembayaran !== 'Cash' && resolvedTempoHari > 0
        ? (() => { const d = new Date(tanggal); d.setDate(d.getDate() + resolvedTempoHari); return d.toISOString(); })()
        : null;
      const body = {
        refNo, tanggal, supplierId, supplierNama, supplierAlamat,
        kasId, kasKode, kasNama, keterangan, pembayaran,
        tempoHari: resolvedTempoHari,
        tempo: jatuhTempo,
        disc, ppn, subtotal, grandTotal,
        items: validItems.map(({ _key, hasExpired, ...r }) => ({
          ...r,
          expired: r.expired ? new Date(r.expired) : null,
        })),
        cetakBarcode, updateHargaJual,
        operator: 'admin',
      };
      const isEdit = !!editId;
      const url = isEdit ? `/api/transaksi-beli/${editId}` : '/api/transaksi-beli';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Gagal menyimpan.'); return; }
      setShowForm(false);
      setEditId(null);
      fetchList();
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleHapus() {
    if (!selectedId) return;
    if (!confirm('Hapus transaksi ini? Stok barang akan dikembalikan.')) return;
    await fetch(`/api/transaksi-beli/${selectedId}`, { method: 'DELETE' });
    setSelectedId(null);
    fetchList();
  }

  // ─── List columns ──────────────────────────────────────────────────────────

  const listCols = [
    'TANGGAL','NO. FAKTUR','SUPPLIER','ALAMAT SUPPLIER',
    'KODE KAS','KETERANGAN','LUNAS','HUTANG','TEMPO','LUNAS OPERATOR',
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── LIST VIEW ─────────────────────────────────────────────────────── */}
      {!showForm && (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 185px)' }}>
          {/* Search bar */}
          <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-600">Cari:</span>
            <input
              value={searchQ}
              onChange={e => { setSearchQ(e.target.value); fetchList(e.target.value); }}
              placeholder="No faktur / supplier / keterangan..."
              className="border rounded px-2 py-0.5 text-xs flex-1 max-w-xs"
            />
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto border border-gray-300">
            <table className="w-full border-collapse text-xs min-w-max">
              <thead className="sticky top-0">
                <tr className="bg-blue-600 text-white">
                  {listCols.map(c => (
                    <th key={c} className="px-2 py-1.5 text-left border border-blue-500 whitespace-nowrap font-semibold">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingList && (
                  <tr><td colSpan={10} className="text-center py-10 text-gray-400">Memuat...</td></tr>
                )}
                {!loadingList && list.map((t, i) => (
                  <tr
                    key={t._id}
                    onClick={() => setSelectedId(t._id === selectedId ? null : t._id)}
                    onDoubleClick={() => openEditForm(t._id)}
                    className={`cursor-pointer border-b border-gray-100 hover:bg-blue-50 ${
                      selectedId === t._id ? 'bg-blue-200' : i % 2 === 0 ? 'bg-white' : 'bg-blue-50/40'
                    }`}
                  >
                    <td className="px-2 py-1 border-r border-gray-200 whitespace-nowrap">
                      {t.tanggal ? new Date(t.tanggal).toLocaleDateString('id-ID') : ''}
                    </td>
                    <td className="px-2 py-1 border-r border-gray-200 whitespace-nowrap">{t.refNo}</td>
                    <td className="px-2 py-1 border-r border-gray-200">{t.supplierNama}</td>
                    <td className="px-2 py-1 border-r border-gray-200">{t.supplierAlamat}</td>
                    <td className="px-2 py-1 border-r border-gray-200">{t.kasKode}</td>
                    <td className="px-2 py-1 border-r border-gray-200">{t.keterangan}</td>
                    <td className="px-2 py-1 border-r border-gray-200 text-right">{fmt(t.lunas)}</td>
                    <td className="px-2 py-1 border-r border-gray-200 text-right">{fmt(t.hutang)}</td>
                    <td className="px-2 py-1 border-r border-gray-200 whitespace-nowrap">
                      {t.tempo ? new Date(t.tempo).toLocaleDateString('id-ID') : ''}
                    </td>
                    <td className="px-2 py-1 border-r border-gray-200">{t.lunasOperator}</td>
                  </tr>
                ))}
                {!loadingList && list.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-16 text-gray-400 italic">
                      Belum ada data transaksi pembelian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Bottom button bar */}
          <div className="bg-blue-100 border-t border-blue-300 px-3 py-1.5 flex items-center shrink-0">
            <div className="flex gap-1">
              <button
                onClick={openNewForm}
                className="px-4 py-1 rounded-full bg-gray-200 hover:bg-gray-300 text-xs font-semibold border border-gray-400"
              >
                Tambah
              </button>
              <button
                onClick={() => selectedId && openEditForm(selectedId)}
                disabled={!selectedId}
                className="px-4 py-1 rounded-full bg-gray-200 hover:bg-gray-300 text-xs font-semibold border border-gray-400 disabled:opacity-40"
              >
                Edit
              </button>
              <button
                onClick={handleHapus}
                disabled={!selectedId}
                className="px-4 py-1 rounded-full bg-gray-200 hover:bg-gray-300 text-xs font-semibold border border-gray-400 disabled:opacity-40"
              >
                Hapus
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── FORM MODAL ────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-40 bg-blue-100 flex flex-col" style={{ top: 120 }}>
          {/* Title bar */}
          <div className="bg-blue-800 text-white flex items-center justify-between px-3 py-1 shrink-0">
            <span className="font-bold text-sm tracking-wide">
              {editId ? 'EDIT PEMBELIAN BARANG' : 'PEMBELIAN BARANG'}
            </span>
            <div className="flex gap-1">
              <button className="w-4 h-4 bg-yellow-400 rounded-sm text-[10px] flex items-center justify-center text-black">_</button>
              <button className="w-4 h-4 bg-blue-400 rounded-sm text-[10px] flex items-center justify-center text-white">□</button>
              <button
                onClick={() => { setShowForm(false); setEditId(null); }}
                className="w-4 h-4 bg-red-500 rounded-sm text-[10px] flex items-center justify-center text-white hover:bg-red-700"
              >✕</button>
            </div>
          </div>

          {/* Header form */}
          <div className="bg-blue-200 border-b border-blue-400 px-4 py-2 shrink-0 flex gap-8">
            {/* Left fields */}
            <div className="flex flex-col gap-1 min-w-105">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold w-24 shrink-0">REF NO</span>
                <span className="text-xs">:</span>
                <input
                  value={refNo}
                  onChange={e => setRefNo(e.target.value)}
                  className="border bg-white px-1 py-0.5 text-xs w-36"
                />
                <input
                  type="date"
                  value={tanggal}
                  onChange={e => setTanggal(e.target.value)}
                  className="border bg-white px-1 py-0.5 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold w-24 shrink-0">SUPPLIER</span>
                <span className="text-xs">:</span>
                <input
                  value={supplierNama}
                  readOnly
                  placeholder="Klik atau tekan Enter..."
                  onKeyDown={e => { if (e.key === 'Enter') setShowSupplierPicker(true); }}
                  onClick={() => setShowSupplierPicker(true)}
                  className="border bg-white px-1 py-0.5 text-xs w-64 cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold w-24 shrink-0">KODE KAS</span>
                <span className="text-xs">:</span>
                <input
                  value={kasKode}
                  readOnly
                  placeholder="Klik atau tekan Enter..."
                  onKeyDown={e => { if (e.key === 'Enter') setShowKasPicker(true); }}
                  onClick={() => setShowKasPicker(true)}
                  className="border bg-white px-1 py-0.5 text-xs w-28 cursor-pointer"
                />
                {kasKode && (
                  <span className="text-xs text-gray-700 ml-1">
                    {kasNama} &nbsp;|&nbsp; SALDO : <strong>{fmt(kasSaldo)}</strong>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold w-24 shrink-0">KET</span>
                <span className="text-xs">:</span>
                <input
                  value={keterangan}
                  onChange={e => setKeterangan(e.target.value)}
                  className="border bg-white px-1 py-0.5 text-xs w-64"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold w-24 shrink-0">Pembayaran</span>
                <span className="text-xs">:</span>
                <select
                  value={pembayaran}
                  onChange={e => setPembayaran(e.target.value as PembayaranBeliType)}
                  className="border bg-white px-1 py-0.5 text-xs"
                >
                  <option value="Cash">Cash</option>
                  <option value="1 Minggu">1 Minggu</option>
                  <option value="2 Minggu">2 Minggu</option>
                  <option value="3 Minggu">3 Minggu</option>
                  <option value="4 Minggu">4 Minggu</option>
                  <option value="Custom">Custom</option>
                </select>
                {pembayaran === 'Custom' && (
                  <>
                    <span className="text-xs ml-2 shrink-0">Hari:</span>
                    <input
                      type="number"
                      min={0}
                      value={tempoHari}
                      onChange={e => setTempoHari(+e.target.value)}
                      className="border bg-white px-1 py-0.5 text-xs w-16"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Grand total center */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <p className="text-xs text-gray-600 font-semibold tracking-widest">GRANDTOTAL</p>
              <p className="text-4xl font-bold text-blue-900 mt-1">{fmt(grandTotal)}</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border-b border-red-400 text-red-700 text-xs px-4 py-1 shrink-0">
              ⚠ {error}
            </div>
          )}

          {/* Items table */}
          <div className="flex-1 overflow-auto bg-blue-50">
            <table className="border-collapse text-xs min-w-max w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-blue-600 text-white">
                  <th className="px-2 py-1 border border-blue-500 w-8 text-center">#</th>
                  <th className="px-2 py-1 border border-blue-500 w-48 text-left">NAMA BARANG</th>
                  <th className="px-2 py-1 border border-blue-500 w-20 text-left">SATUAN</th>
                  <th className="px-2 py-1 border border-blue-500 w-16 text-right">QTY</th>
                  <th className="px-2 py-1 border border-blue-500 w-24 text-right">HRG BELI</th>
                  <th className="px-2 py-1 border border-blue-500 w-24 text-right">HGA TOKO</th>
                  <th className="px-2 py-1 border border-blue-500 w-14 text-right">(%)</th>
                  <th className="px-2 py-1 border border-blue-500 w-24 text-right">HRG PARTAI</th>
                  <th className="px-2 py-1 border border-blue-500 w-14 text-right">(%)</th>
                  <th className="px-2 py-1 border border-blue-500 w-24 text-right">HRG CABANG</th>
                  <th className="px-2 py-1 border border-blue-500 w-14 text-right">(%)</th>
                  <th className="px-2 py-1 border border-blue-500 w-20 text-right">DISC</th>
                  <th className="px-2 py-1 border border-blue-500 w-28 text-right">RUPIAH</th>
                  <th className="px-2 py-1 border border-blue-500 w-24 text-left">EXPIRED</th>
                  <th className="px-2 py-1 border border-blue-500 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => {
                  const isActive = idx === activeRow;
                  const isEmpty = !row.barangId;
                  const hrgPcs = hrgBeliPerPcs(row);

                  return (
                    <tr
                      key={row._key}
                      onClick={() => setActiveRow(idx)}
                      className={`border-b border-gray-200 ${
                        isActive && isEmpty
                          ? 'bg-yellow-200'
                          : isActive
                          ? 'bg-blue-100'
                          : idx % 2 === 0
                          ? 'bg-white'
                          : 'bg-blue-50/50'
                      }`}
                    >
                      {/* # */}
                      <td className="px-1 py-0.5 border-r border-gray-200 text-center text-gray-400">
                        {isEmpty ? '' : idx + 1}
                      </td>

                      {/* NAMA BARANG */}
                      <td className="border-r border-gray-200 p-0">
                        <input
                          value={row.namaBarang}
                          readOnly
                          placeholder={isActive ? 'Klik untuk pilih...' : ''}
                          onFocus={() => setActiveRow(idx)}
                          onKeyDown={e => { if (e.key === 'Enter') { setTargetRow(idx); setShowBarangPicker(true); } }}
                          onClick={() => { setActiveRow(idx); setTargetRow(idx); setShowBarangPicker(true); }}
                          className="w-full px-2 py-0.5 bg-transparent text-xs cursor-pointer outline-none"
                        />
                      </td>

                      {/* SATUAN */}
                      <td className="border-r border-gray-200 p-0">
                        <input
                          value={row.satuan}
                          readOnly
                          onFocus={() => setActiveRow(idx)}
                          onClick={() => {
                            if (!row.barangId) return;
                            setTargetRow(idx); setActiveRow(idx);
                            fetch(`/api/barang/${row.barangId}`)
                              .then(r => r.json())
                              .then(b => { setPickerBarang(b); setShowSatuanPicker(true); });
                          }}
                          className="w-full px-2 py-0.5 bg-transparent text-xs cursor-pointer outline-none"
                        />
                      </td>

                      {/* QTY */}
                      <td className="border-r border-gray-200">
                        <NumberCell
                          value={row.qty}
                          onChange={v => updateItem(idx, { qty: v })}
                        />
                      </td>

                      {/* HRG BELI */}
                      <td className="border-r border-gray-200">
                        <NumberCell
                          value={row.hrgBeli}
                          onChange={v => {
                            const pcs = row.satuanType === 'beli' ? v / row.isi : v;
                            updateItem(idx, {
                              hrgBeli: v,
                              pctToko: pctFrom(row.hgaToko, pcs),
                              pctPartai: pctFrom(row.hrgPartai, pcs),
                              pctCabang: pctFrom(row.hrgCabang, pcs),
                            });
                          }}
                        />
                      </td>

                      {/* HGA TOKO + (%) */}
                      <td className="border-r border-gray-200">
                        <NumberCell value={row.hgaToko} onChange={v => updateItem(idx, { hgaToko: v, pctToko: pctFrom(v, hrgPcs) })} />
                      </td>
                      <td className="border-r border-gray-200">
                        <NumberCell value={row.pctToko} onChange={v => updateItem(idx, { pctToko: v, hgaToko: Math.round(hrgPcs * (1 + v / 100)) })} />
                      </td>

                      {/* HRG PARTAI + (%) */}
                      <td className="border-r border-gray-200">
                        <NumberCell value={row.hrgPartai} onChange={v => updateItem(idx, { hrgPartai: v, pctPartai: pctFrom(v, hrgPcs) })} />
                      </td>
                      <td className="border-r border-gray-200">
                        <NumberCell value={row.pctPartai} onChange={v => updateItem(idx, { pctPartai: v, hrgPartai: Math.round(hrgPcs * (1 + v / 100)) })} />
                      </td>

                      {/* HRG CABANG + (%) */}
                      <td className="border-r border-gray-200">
                        <NumberCell value={row.hrgCabang} onChange={v => updateItem(idx, { hrgCabang: v, pctCabang: pctFrom(v, hrgPcs) })} />
                      </td>
                      <td className="border-r border-gray-200">
                        <NumberCell value={row.pctCabang} onChange={v => updateItem(idx, { pctCabang: v, hrgCabang: Math.round(hrgPcs * (1 + v / 100)) })} />
                      </td>

                      {/* DISC */}
                      <td className="border-r border-gray-200">
                        <NumberCell value={row.disc} onChange={v => updateItem(idx, { disc: v })} />
                      </td>

                      {/* RUPIAH */}
                      <td className="border-r border-gray-200 px-1 text-right font-semibold text-blue-900">
                        {row.rupiah === 0 ? '' : fmt(row.rupiah)}
                      </td>

                      {/* EXPIRED */}
                      <td className="border-r border-gray-200 px-1">
                        {row.hasExpired && (
                          <input
                            type="date"
                            value={row.expired}
                            onChange={e => updateItem(idx, { expired: e.target.value })}
                            className="bg-transparent text-xs outline-none w-full"
                          />
                        )}
                      </td>

                      {/* Delete */}
                      <td className="px-1 text-center">
                        {row.barangId && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              const next = items.filter((_, i) => i !== idx);
                              const safe = ensureEmptyLastRow(next);
                              setItems(safe);
                              setActiveRow(Math.min(activeRow, safe.length - 1));
                            }}
                            className="text-red-400 hover:text-red-600 text-xs leading-none"
                          >✕</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Note */}
          <div className="bg-blue-100 border-t border-blue-300 text-center text-xs text-gray-500 py-0.5 shrink-0">
            Note : Harga jual (toko, partai, cabang) yang diisikan adalah harga per PCS
          </div>

          {/* Bottom section */}
          <div className="bg-blue-200 border-t border-blue-400 px-4 py-2 shrink-0 flex items-end justify-between">
            {/* Left: checkboxes + operator */}
            <div className="flex flex-col gap-0.5">
              <p className="text-xs text-gray-600 mb-1">Operator : admin</p>
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input type="checkbox" checked={cetakBarcode} onChange={e => setCetakBarcode(e.target.checked)} />
                Cetak Barcode Setelah Di Simpan
              </label>
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input type="checkbox" checked={updateHargaJual} onChange={e => setUpdateHargaJual(e.target.checked)} />
                Update Harga Jual Otomatis
              </label>
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input type="checkbox" checked={cetakNota} onChange={e => setCetakNota(e.target.checked)} />
                Cetak Nota
              </label>
            </div>

            {/* Right: totals */}
            <div className="flex flex-col gap-1 min-w-75">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs w-28 text-right">Sub Total</span>
                <input readOnly value={fmt(subtotal)} className="border bg-gray-100 text-right text-xs px-1 py-0.5 w-36 rounded" />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs w-28 text-right">Disc (%)</span>
                <input
                  type="number" value={disc} min={0} max={100}
                  onChange={e => setDisc(parseFloat(e.target.value) || 0)}
                  className="border bg-white text-right text-xs px-1 py-0.5 w-14 rounded"
                />
                <input readOnly value={fmt(discAmount)} className="border bg-gray-100 text-right text-xs px-1 py-0.5 w-20 rounded" />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs w-28 text-right">PPN (%)</span>
                <input
                  type="number" value={ppn} min={0}
                  onChange={e => setPpn(parseFloat(e.target.value) || 0)}
                  className="border bg-white text-right text-xs px-1 py-0.5 w-14 rounded"
                />
                <input readOnly value={fmt(ppnAmount)} className="border bg-gray-100 text-right text-xs px-1 py-0.5 w-20 rounded" />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs w-28 text-right font-bold">Grand Total</span>
                <input readOnly value={fmt(grandTotal)} className="border bg-blue-900 text-white text-right text-xs px-1 py-0.5 w-36 font-bold rounded" />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="bg-blue-300 border-t border-blue-500 px-3 py-1.5 flex items-center gap-2 shrink-0">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded"
            >
              {saving ? 'Menyimpan...' : 'SIMPAN (F8)'}
            </button>
            <button className="px-6 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded">
              EDIT DATA BARANG (F2)
            </button>
            <button
              onClick={() => { setShowForm(false); setEditId(null); }}
              className="px-6 py-1.5 bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold rounded"
            >
              BATAL (ESC)
            </button>
          </div>
        </div>
      )}

      {/* ── PICKERS ───────────────────────────────────────────────────────── */}
      {showSupplierPicker && (
        <SupplierPicker onSelect={handleSelectSupplier} onClose={() => setShowSupplierPicker(false)} />
      )}
      {showKasPicker && (
        <KasPicker onSelect={handleSelectKas} onClose={() => setShowKasPicker(false)} />
      )}
      {showBarangPicker && (
        <BarangPicker onSelect={handleSelectBarang} onClose={() => setShowBarangPicker(false)} />
      )}
      {showSatuanPicker && pickerBarang && (
        <SatuanPicker
          barang={pickerBarang}
          onSelect={handleSelectSatuan}
          onClose={() => { setShowSatuanPicker(false); setPickerBarang(null); }}
        />
      )}
    </>
  );
}
