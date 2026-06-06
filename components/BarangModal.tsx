'use client';

import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BarangInput {
  kode: string;
  barcode: string;
  nama: string;
  kategori: string;
  subKategori: string;
  hasExpired: boolean;
  expired: string;
  satuanBeli: string;
  satuanJual: string;
  isi: number;
  hargaBeli: number;
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
  tglBeli: string;
  supplier: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const KATEGORI_LIST = [
  'MAKANAN', 'MINUMAN', 'SEMBAKO', 'SNACK', 'HERBAL',
  'ROKOK', 'KEBERSIHAN', 'KESEHATAN', 'KOSMETIK', 'ALAT TULIS', 'LAINNYA',
];

export const SATUAN_LIST = [
  'PCS', 'BTL', 'POUCH', 'BJ', 'DOS', 'CRTN',
  'KG', 'GR', 'LITER', 'ML', 'BOX', 'PCK', 'LUSIN', 'SLOP', 'PAK',
];

export const EMPTY_FORM: BarangInput = {
  kode: '', barcode: '', nama: '', kategori: '', subKategori: '',
  hasExpired: false, expired: '', satuanBeli: 'PCS', satuanJual: 'PCS',
  isi: 1, hargaBeli: 0, hargaJualToko: 0, hargaJualPartai: 0, hargaJualCabang: 0, stok: 0,
  stokMinimum: 0, stokMaksimum: 0, lokasi: '', diskon: 0,
  pointMember: 0, pointKaryawan: 0, tglBeli: '', supplier: '',
};

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  initialData: BarangInput;
  onClose: () => void;
  onSave: (data: BarangInput) => Promise<void>;
  saving: boolean;
}

export default function BarangModal({ initialData, onClose, onSave, saving }: ModalProps) {
  const [form, setForm] = useState<BarangInput>(initialData);

  function set<K extends keyof BarangInput>(field: K, value: BarangInput[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const inp = 'border border-gray-300 rounded px-2 py-1 text-xs w-full focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white';
  const lbl = 'block text-xs text-gray-600 mb-0.5';

  const isEdit = initialData.kode !== '';

  const title = isEdit
    ? `Edit Barang  Kode : ${initialData.kode}, Nama : ${initialData.nama}`
    : 'Tambah Barang Baru';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded shadow-2xl w-165 max-h-[92vh] flex flex-col border border-gray-300">
        {/* Title */}
        <div className="bg-blue-100 border-b border-blue-300 px-4 py-2 rounded-t">
          <span className="font-semibold text-sm text-gray-700">{title}</span>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-3">
            {/* Identitas Barang */}
            <fieldset className="border border-gray-300 rounded px-3 pb-3 pt-1">
              <legend className="text-xs font-semibold text-gray-600 px-1">-Identitas Barang-</legend>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <label className={lbl}>Kode Barang</label>
                  <input className={inp} value={form.kode} onChange={(e) => set('kode', e.target.value)} required />
                </div>
                <div>
                  <label className={lbl}>Barcode</label>
                  <input className={inp} value={form.barcode} onChange={(e) => set('barcode', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Nama Barang</label>
                  <input className={inp} value={form.nama} onChange={(e) => set('nama', e.target.value)} required />
                </div>
                <div>
                  <label className={lbl}>Kategori</label>
                  <select className={inp} value={form.kategori} onChange={(e) => set('kategori', e.target.value)}>
                    <option value="">-- Pilih --</option>
                    {KATEGORI_LIST.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Sub Kategori</label>
                  <input className={inp} value={form.subKategori} onChange={(e) => set('subKategori', e.target.value)} />
                </div>
                <div className="col-span-2 flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.hasExpired}
                      onChange={(e) => set('hasExpired', e.target.checked)}
                      className="w-3.5 h-3.5"
                    />
                    Expired
                  </label>
                  {form.hasExpired && (
                    <input
                      type="date"
                      className={`${inp} w-40`}
                      value={form.expired}
                      onChange={(e) => set('expired', e.target.value)}
                    />
                  )}
                </div>
              </div>
            </fieldset>

            {/* Satuan & Harga side by side */}
            <div className="grid grid-cols-2 gap-3">
              <fieldset className="border border-gray-300 rounded px-3 pb-3 pt-1">
                <legend className="text-xs font-semibold text-gray-600 px-1">-Satuan dan Isi-</legend>
                <div className="space-y-2">
                  <div>
                    <label className={lbl}>Satuan Beli</label>
                    <select className={inp} value={form.satuanBeli} onChange={(e) => set('satuanBeli', e.target.value)}>
                      {SATUAN_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Satuan Jual</label>
                    <select className={inp} value={form.satuanJual} onChange={(e) => set('satuanJual', e.target.value)}>
                      {SATUAN_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Isi</label>
                    <input type="number" min="1" className={inp} value={form.isi} onChange={(e) => set('isi', +e.target.value)} />
                  </div>
                </div>
              </fieldset>

              <fieldset className="border border-gray-300 rounded px-3 pb-3 pt-1">
                <legend className="text-xs font-semibold text-gray-600 px-1">-Harga-</legend>
                <div className="space-y-2">
                  <div>
                    <label className={lbl}>Harga Beli</label>
                    <input type="number" min="0" className={inp} value={form.hargaBeli} onChange={(e) => set('hargaBeli', +e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>Harga Jual Toko</label>
                    <input type="number" min="0" className={inp} value={form.hargaJualToko} onChange={(e) => set('hargaJualToko', +e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>Harga Jual Partai</label>
                    <input type="number" min="0" className={inp} value={form.hargaJualPartai} onChange={(e) => set('hargaJualPartai', +e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>Harga Jual Cabang</label>
                    <input type="number" min="0" className={inp} value={form.hargaJualCabang} onChange={(e) => set('hargaJualCabang', +e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>Stok</label>
                    <input type="number" className={inp} value={form.stok} onChange={(e) => set('stok', +e.target.value)} />
                  </div>
                </div>
              </fieldset>
            </div>

            {/* Diskon & Supplier side by side */}
            <div className="grid grid-cols-2 gap-3">
              <fieldset className="border border-gray-300 rounded px-3 pb-3 pt-1">
                <legend className="text-xs font-semibold text-gray-600 px-1">-Diskon dan Point-</legend>
                <div className="space-y-2">
                  <div>
                    <label className={lbl}>Diskon (%)</label>
                    <input type="number" min="0" max="100" className={inp} value={form.diskon} onChange={(e) => set('diskon', +e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>Point Member</label>
                    <input type="number" min="0" className={inp} value={form.pointMember} onChange={(e) => set('pointMember', +e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>Point Karyawan</label>
                    <input type="number" min="0" className={inp} value={form.pointKaryawan} onChange={(e) => set('pointKaryawan', +e.target.value)} />
                  </div>
                </div>
              </fieldset>

              <fieldset className="border border-gray-300 rounded px-3 pb-3 pt-1">
                <legend className="text-xs font-semibold text-gray-600 px-1">-Supplier dan Pajak-</legend>
                <div className="space-y-2">
                  <div>
                    <label className={lbl}>Tgl Beli</label>
                    <input type="date" className={inp} value={form.tglBeli} onChange={(e) => set('tglBeli', e.target.value)} />
                  </div>
                  <div>
                    <label className={lbl}>Supplier</label>
                    <input className={inp} value={form.supplier} onChange={(e) => set('supplier', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={lbl}>Stok Min</label>
                      <input type="number" min="0" className={inp} value={form.stokMinimum} onChange={(e) => set('stokMinimum', +e.target.value)} />
                    </div>
                    <div>
                      <label className={lbl}>Stok Maks</label>
                      <input type="number" min="0" className={inp} value={form.stokMaksimum} onChange={(e) => set('stokMaksimum', +e.target.value)} />
                    </div>
                  </div>
                </div>
              </fieldset>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 sticky bottom-0">
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
