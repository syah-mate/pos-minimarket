'use client';

import { useState, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import { fetchAllPages } from '@/lib/apiList';

// ─── Identitas perusahaan pada kop laporan ────────────────────────────────────
const PERUSAHAAN = {
  nama: 'Aba Bussines Centre',
  alamat: 'Graha Insan Kamil Sidoarjo Jawa Timur',
};

/** Kode semu untuk barang yang suppliernya tidak terdaftar di master. */
const KODE_BEBAS = '--';
/** Kunci grup untuk barang tanpa supplier. */
const KEY_BEBAS = '__bebas__';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItemJual {
  barangId: string;
  qty: number;
  subtotal: number;
}

interface TransaksiJualDoc {
  _id: string;
  refNo: string;
  tanggal: string;
  items: ItemJual[];
}

interface BarangRef {
  _id: string;
  kode: string;
  nama: string;
  supplier: string;
}

interface SupplierDoc {
  _id: string;
  kode: string;
  nama: string;
  alamat: string;
}

/** Satu baris laporan: satu supplier beserta total penjualan barangnya. */
interface BarisSupplier {
  kode: string;
  nama: string;
  alamat: string;
  jumlah: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** 1.234.567 atau 1.234.567,89 — mengikuti format angka pada laporan cetak. */
const fmtNum = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n || 0);

function todayStr() {
  const d = new Date();
  const p = (v: number) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Tanggal 1 bulan berjalan — periode default supaya laporan tidak ambigu. */
function awalBulanStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** yyyy-mm-dd → dd/mm/yyyy (tanpa lewat Date, supaya tidak bergeser zona waktu). */
function fmtInputDate(s: string) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

/** ISO date dari server → yyyy-mm-dd waktu lokal. */
function toLocalDay(s: string) {
  const dt = new Date(s);
  if (isNaN(dt.getTime())) return '';
  const p = (v: number) => String(v).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

/** yyyy-mm-dd + n hari. Dipakai melebarkan rentang query ke server. */
function addDays(s: string, n: number) {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + n);
  const p = (v: number) => String(v).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

/** Barang menyimpan supplier sebagai teks nama; disamakan supaya cocok longgar. */
const normSupplier = (s: string) => (s || '').trim().toUpperCase();

// ─── Geometri laporan (mm, A4 portrait) ───────────────────────────────────────

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_L = 10;
const MARGIN_R = 200;
const BOTTOM = 283;
const ROW_H = 5.6;

const COL = {
  no: 11,
  nama: 20,
  namaMax: 44,
  kode: 66,
  kodeMax: 26,
  alamat: 94,
  alamatMax: 80,
  jumlah: 200, // rata kanan
};

/** Potong teks agar tidak menabrak kolom berikutnya. */
function clip(pdf: jsPDF, text: string, maxWidth: number) {
  let s = text ?? '';
  if (pdf.getTextWidth(s) <= maxWidth) return s;
  while (s.length > 1 && pdf.getTextWidth(`${s}..`) > maxWidth) s = s.slice(0, -1);
  return `${s}..`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LaporanPenjualanBySupplierPage() {
  const [tglCetak, setTglCetak] = useState(todayStr());
  const [tglDari, setTglDari] = useState(awalBulanStr());
  const [tglSampai, setTglSampai] = useState(todayStr());

  const [suppliers, setSuppliers] = useState<SupplierDoc[]>([]);
  // Default: seluruh supplier tercentang begitu master selesai dimuat.
  const [pilihan, setPilihan] = useState<Set<string>>(new Set());
  const [cariSupplier, setCariSupplier] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [empty, setEmpty] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');

  // Master supplier untuk daftar centang di filter.
  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        const data = await fetchAllPages<SupplierDoc>('/api/supplier', undefined, 200, 200);
        if (batal) return;
        setSuppliers(data);
        setPilihan(new Set(data.map((s) => String(s._id))));
      } catch {
        /* daftar tetap kosong; laporan masih bisa dijalankan untuk semua supplier */
      }
    })();
    return () => {
      batal = true;
    };
  }, []);

  /** Ganti PDF sambil melepas object URL lama supaya blob tidak menumpuk. */
  const replacePdfUrl = useCallback((next: string) => {
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return next;
    });
  }, []);

  const semuaDipilih = suppliers.length > 0 && pilihan.size === suppliers.length;

  const toggleSemua = () => {
    setPilihan(semuaDipilih ? new Set() : new Set(suppliers.map((s) => String(s._id))));
  };

  const toggleSupplier = (id: string) => {
    setPilihan((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const buildPdf = useCallback(
    (rows: BarisSupplier[]) => {
      const pdf = new jsPDF('p', 'mm', 'a4');
      // Judul dokumen tampil pada toolbar PDF viewer bawaan browser.
      pdf.setProperties({
        title: 'Laporan Penjualan per Supplier',
        subject: `Periode ${fmtInputDate(tglDari) || '...'} s/d ${fmtInputDate(tglSampai) || '...'}`,
        author: PERUSAHAAN.nama,
      });

      let firstPage = true;

      /** Kop + judul + baris header kolom. Mengembalikan y baris data pertama. */
      const drawHeader = (): number => {
        if (!firstPage) pdf.addPage();

        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text(PERUSAHAAN.nama, MARGIN_L, 14);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(90, 90, 90);
        pdf.text(PERUSAHAAN.alamat, MARGIN_L, 18);

        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(15);
        pdf.text('LAPORAN PENJUALAN :: SUPPLIER', MARGIN_L, 28);

        // garis ganda di bawah judul
        pdf.setLineWidth(0.5);
        pdf.line(MARGIN_L, 32, MARGIN_R, 32);
        pdf.setLineWidth(0.2);
        pdf.line(MARGIN_L, 33, MARGIN_R, 33);

        let y = 37.5;

        // Blok periode & tanggal cetak hanya di halaman pertama.
        if (firstPage) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          const periode =
            tglDari || tglSampai
              ? `${fmtInputDate(tglDari) || '...'} S/D ${fmtInputDate(tglSampai) || '...'}`
              : 'SEMUA PERIODE';
          pdf.text('PERIODE', MARGIN_L, y);
          pdf.text(`: ${periode}`, MARGIN_L + 30, y);
          y += 4.5;
          pdf.text('TANGGAL CETAK', MARGIN_L, y);
          pdf.text(`: ${fmtInputDate(tglCetak)}`, MARGIN_L + 30, y);
          y += 7;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.text('NO.', MARGIN_L, y);
        pdf.text('NAMA SUPPLIER', COL.nama, y);
        pdf.text('KODE SUPPLIER', COL.kode, y);
        pdf.text('ALAMAT SUPPLIER', COL.alamat, y);
        pdf.text('JUMLAH', COL.jumlah, y, { align: 'right' });

        pdf.setLineWidth(0.3);
        pdf.line(MARGIN_L, y + 1.8, MARGIN_R, y + 1.8);

        firstPage = false;
        return y + 6.5;
      };

      let y = drawHeader();
      let no = 0;

      for (const r of rows) {
        if (y > BOTTOM) y = drawHeader();
        no += 1;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(0, 0, 0);
        pdf.text(String(no), COL.no, y, { align: 'right' });
        pdf.text(clip(pdf, r.nama, COL.namaMax), COL.nama, y);
        pdf.text(clip(pdf, r.kode, COL.kodeMax), COL.kode, y);
        pdf.text(clip(pdf, r.alamat, COL.alamatMax), COL.alamat, y);
        // Supplier tanpa penjualan pada periode ini dibiarkan kosong, bukan "0".
        if (r.jumlah) pdf.text(fmtNum(r.jumlah), COL.jumlah, y, { align: 'right' });
        y += ROW_H;
      }

      // ── Baris TOTAL ──
      const total = rows.reduce((s, r) => s + (r.jumlah || 0), 0);
      if (y + 8 > BOTTOM) y = drawHeader();
      y += 0.5;
      pdf.setLineWidth(0.3);
      pdf.line(MARGIN_L, y, MARGIN_R, y);
      y += 5;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      pdf.text('TOTAL', MARGIN_L, y);
      pdf.text(fmtNum(total), MARGIN_R, y, { align: 'right' });
      pdf.setLineWidth(0.5);
      pdf.line(MARGIN_L, y + 2, MARGIN_R, y + 2);

      // ── Nomor halaman ──
      const totalHal = pdf.getNumberOfPages();
      for (let p = 1; p <= totalHal; p++) {
        pdf.setPage(p);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`Hal. ${p} / ${totalHal}`, PAGE_W / 2, PAGE_H - 8, { align: 'center' });
      }

      return pdf;
    },
    [tglDari, tglSampai, tglCetak]
  );

  const handleTampilkan = useCallback(async () => {
    if (suppliers.length > 0 && pilihan.size === 0) {
      setError('Pilih minimal satu supplier.');
      return;
    }
    setLoading(true);
    setError('');
    setEmpty(false);
    try {
      // Server memotong rentang `tanggal` pada batas midnight; rentang dilebarkan
      // sehari di kedua sisi lalu disaring ulang di sini memakai tanggal lokal.
      const params = new URLSearchParams();
      if (tglDari) params.set('tglDari', addDays(tglDari, -1));
      if (tglSampai) params.set('tglSampai', addDays(tglSampai, 1));
      params.set('includeItems', '1');

      // Penjualan tidak menyimpan supplier; kaitannya lewat master barang
      // (`Barang.supplier` berisi nama supplier).
      const [transaksi, barang] = await Promise.all([
        fetchAllPages<TransaksiJualDoc>(`/api/transaksi-jual?${params.toString()}`, undefined, 200, 200),
        fetchAllPages<BarangRef>('/api/barang?fields=supplier', undefined, 200, 200),
      ]);

      const supplierBarang = new Map(
        barang.map((b) => [String(b._id), normSupplier(b.supplier)])
      );

      const dalamPeriode = (hari: string) =>
        !!hari && (!tglDari || hari >= tglDari) && (!tglSampai || hari <= tglSampai);

      // Total penjualan per nama supplier; barang tanpa supplier jadi satu grup.
      const totalByNama = new Map<string, number>();
      for (const t of transaksi) {
        if (!dalamPeriode(toLocalDay(t.tanggal))) continue;
        for (const it of t.items ?? []) {
          const nama = supplierBarang.get(String(it.barangId)) ?? '';
          const key = nama || KEY_BEBAS;
          totalByNama.set(key, (totalByNama.get(key) ?? 0) + (Number(it.subtotal) || 0));
        }
      }

      const dipilih = (s: SupplierDoc) => pilihan.has(String(s._id));
      const terpakai = new Set<string>();

      // Semua supplier master (yang dicentang) ikut tercetak walau tanpa
      // penjualan, seperti laporan lama — kolom JUMLAH-nya dibiarkan kosong.
      const rows: BarisSupplier[] = suppliers.filter(dipilih).map((s) => {
        const key = normSupplier(s.nama);
        terpakai.add(key);
        return {
          kode: s.kode || '',
          nama: s.nama || '',
          alamat: s.alamat || '',
          jumlah: totalByNama.get(key) ?? 0,
        };
      });

      // Nama supplier yang tertulis di master barang tapi tidak ada di master
      // supplier tetap dihitung — hanya muncul saat semua supplier dicentang.
      if (semuaDipilih) {
        for (const [key, jumlah] of totalByNama) {
          if (key === KEY_BEBAS || terpakai.has(key)) continue;
          rows.push({ kode: KODE_BEBAS, nama: key, alamat: '', jumlah });
        }
        const bebas = totalByNama.get(KEY_BEBAS) ?? 0;
        if (bebas) rows.push({ kode: KODE_BEBAS, nama: 'Supplier Bebas', alamat: '', jumlah: bebas });
      }

      rows.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));

      if (rows.length === 0) {
        replacePdfUrl('');
        setEmpty(true);
        return;
      }

      const blob = buildPdf(rows).output('blob');
      replacePdfUrl(URL.createObjectURL(blob));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, [tglDari, tglSampai, suppliers, pilihan, semuaDipilih, buildPdf, replacePdfUrl]);

  const inputCls =
    'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none';

  const cari = cariSupplier.trim().toLowerCase();
  const supplierTampil = cari
    ? suppliers.filter(
        (s) =>
          (s.nama || '').toLowerCase().includes(cari) || (s.kode || '').toLowerCase().includes(cari)
      )
    : suppliers;

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)] gap-4 items-start lg:items-stretch overflow-y-auto lg:overflow-hidden">
      {/* ── Kiri: Filter ── */}
      <div className="bg-white rounded-xl shadow p-5 self-start lg:max-h-full lg:overflow-y-auto">
        <h2 className="text-base font-bold text-gray-800 mb-4">Laporan Penjualan by Supplier</h2>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-600">
                Supplier{' '}
                <span className="text-gray-400">
                  ({pilihan.size} / {suppliers.length} dipilih)
                </span>
              </label>
              <button
                type="button"
                onClick={toggleSemua}
                disabled={suppliers.length === 0}
                className="text-xs text-blue-600 hover:underline disabled:text-gray-300 disabled:no-underline"
              >
                {semuaDipilih ? 'Kosongkan' : 'Pilih semua'}
              </button>
            </div>
            <input
              type="text"
              value={cariSupplier}
              onChange={(e) => setCariSupplier(e.target.value)}
              placeholder="Cari nama / kode supplier..."
              className={inputCls}
            />
            <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded divide-y divide-gray-100">
              {suppliers.length > 0 && (
                <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 cursor-pointer sticky top-0">
                  <input
                    type="checkbox"
                    checked={semuaDipilih}
                    onChange={toggleSemua}
                    className="accent-blue-600"
                  />
                  <span>Semua supplier</span>
                </label>
              )}
              {supplierTampil.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-400">Tidak ada supplier.</p>
              ) : (
                supplierTampil.map((s) => (
                  <label
                    key={s._id}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={pilihan.has(String(s._id))}
                      onChange={() => toggleSupplier(String(s._id))}
                      className="accent-blue-600"
                    />
                    <span className="truncate">
                      {s.nama}
                      {s.kode ? <span className="text-gray-400"> · {s.kode}</span> : null}
                    </span>
                  </label>
                ))
              )}
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              Supplier yang dicentang tetap dicetak walau tanpa penjualan.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal Cetak</label>
            <input
              type="date"
              value={tglCetak}
              onChange={(e) => setTglCetak(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Periode Dari</label>
            <input
              type="date"
              value={tglDari}
              onChange={(e) => setTglDari(e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Periode Hingga</label>
            <input
              type="date"
              value={tglSampai}
              onChange={(e) => setTglSampai(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <button
          onClick={handleTampilkan}
          disabled={loading}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2 rounded text-sm font-medium transition"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Memuat...
            </span>
          ) : (
            'Tampilkan'
          )}
        </button>

        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}
      </div>

      {/* ── Kanan: PDF Viewer ── */}
      <div className="bg-white rounded-xl shadow overflow-hidden min-w-0 h-full min-h-160">
        {pdfUrl ? (
          // Toolbar bawaan PDF viewer browser sudah menyediakan zoom, download & print.
          <iframe
            key={pdfUrl}
            src={pdfUrl}
            className="w-full h-full border-0 block"
            title="Laporan Penjualan by Supplier"
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 px-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-14 h-14 mb-3 text-gray-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            {empty && !loading ? (
              <p className="text-sm text-gray-500">Tidak ada data penjualan untuk filter yang dipilih.</p>
            ) : (
              <p className="text-sm">Atur filter di sebelah kiri, lalu klik <strong>Tampilkan</strong>.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
