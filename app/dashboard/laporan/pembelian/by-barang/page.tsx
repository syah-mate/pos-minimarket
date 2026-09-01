'use client';

import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import { fetchAllPages } from '@/lib/apiList';

// ─── Identitas perusahaan pada kop laporan ────────────────────────────────────
const PERUSAHAAN = {
  nama: 'Aba Bussines Centre',
  alamat: 'Graha Insan Kamil Sidoarjo Jawa Timur',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItemBeli {
  barangId: string;
  namaBarang: string;
  qty: number;
  hrgBeli: number;
  disc: number;
  rupiah: number;
}

interface TransaksiBeliDoc {
  _id: string;
  refNo: string;
  tanggal: string;
  items: ItemBeli[];
}

interface BarangRef {
  _id: string;
  kode: string;
}

/** Satu baris laporan: gabungan item dengan kode, harga, dan qty yang sama. */
interface BarisBarang {
  kode: string;
  nama: string;
  hrgBeli: number;
  disc: number;
  qty: number;
  rupiah: number;
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

// ─── Geometri laporan (mm, A4 portrait) ───────────────────────────────────────

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_L = 10;
const MARGIN_R = 200;
const BOTTOM = 287;

const ROW_H = 6.2;
const HEAD_H = 6.6;
const PAD = 1.8;

/** Kolom tabel: lebar (mm) + perataan, digambar berurutan dari MARGIN_L. */
const COLS = [
  { key: 'no', label: 'No.', w: 10, align: 'left' as const },
  { key: 'kode', label: 'Kode Barang', w: 30, align: 'left' as const },
  { key: 'nama', label: 'Nama Barang', w: 74, align: 'left' as const },
  { key: 'harga', label: 'Harga Beli', w: 22, align: 'right' as const },
  { key: 'diskon', label: 'Diskon', w: 16, align: 'right' as const },
  { key: 'qty', label: 'QTY', w: 12, align: 'right' as const },
  { key: 'jumlah', label: 'JUMLAH', w: 26, align: 'right' as const },
];

/** Batas kiri tiap kolom, hasil akumulasi lebar. */
const COL_X: number[] = (() => {
  const xs: number[] = [];
  let x = MARGIN_L;
  for (const c of COLS) {
    xs.push(x);
    x += c.w;
  }
  return xs;
})();

/** Potong teks agar tidak melewati lebar sel. */
function clip(pdf: jsPDF, text: string, maxWidth: number) {
  let s = text ?? '';
  if (pdf.getTextWidth(s) <= maxWidth) return s;
  while (s.length > 1 && pdf.getTextWidth(`${s}..`) > maxWidth) s = s.slice(0, -1);
  return `${s}..`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LaporanPembelianByBarangPage() {
  const [tipe, setTipe] = useState('semua');
  const [tglCetak, setTglCetak] = useState(todayStr());
  const [tglDari, setTglDari] = useState(awalBulanStr());
  const [tglSampai, setTglSampai] = useState(todayStr());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [empty, setEmpty] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');

  /** Ganti PDF sambil melepas object URL lama supaya blob tidak menumpuk. */
  const replacePdfUrl = useCallback((next: string) => {
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return next;
    });
  }, []);

  const buildPdf = useCallback(
    (rows: BarisBarang[]) => {
      const pdf = new jsPDF('p', 'mm', 'a4');
      // Judul dokumen tampil pada toolbar PDF viewer bawaan browser.
      pdf.setProperties({
        title: 'Laporan Pembelian per Barang',
        subject: `Periode ${fmtInputDate(tglDari) || '...'} s/d ${fmtInputDate(tglSampai) || '...'}`,
        author: PERUSAHAAN.nama,
      });

      /** Satu baris sel bergaris; `fill` untuk baris header & total. */
      const drawRow = (y: number, cells: string[], bold: boolean, fill: boolean) => {
        const h = bold ? HEAD_H : ROW_H;
        pdf.setFont('helvetica', bold ? 'bold' : 'normal');
        pdf.setFontSize(7.5);
        pdf.setDrawColor(120, 120, 120);
        pdf.setLineWidth(0.15);

        COLS.forEach((c, i) => {
          const x = COL_X[i];
          if (fill) {
            pdf.setFillColor(217, 217, 217);
            pdf.rect(x, y, c.w, h, 'FD');
          } else {
            pdf.rect(x, y, c.w, h, 'S');
          }
          const text = cells[i] ?? '';
          if (!text) return;
          pdf.setTextColor(0, 0, 0);
          if (c.align === 'right') {
            pdf.text(clip(pdf, text, c.w - PAD * 2), x + c.w - PAD, y + h - 2.2, { align: 'right' });
          } else {
            pdf.text(clip(pdf, text, c.w - PAD * 2), x + PAD, y + h - 2.2);
          }
        });

        return y + h;
      };

      let firstPage = true;

      /** Kop (halaman 1) + baris judul kolom. Mengembalikan y baris data pertama. */
      const drawHeader = (): number => {
        if (!firstPage) pdf.addPage();
        let y = 14;

        if (firstPage) {
          pdf.setTextColor(0, 0, 0);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(11);
          pdf.text(PERUSAHAAN.nama, MARGIN_L, y);

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.setTextColor(90, 90, 90);
          pdf.text(PERUSAHAAN.alamat, MARGIN_L, y + 4);

          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(9);
          const periode =
            tglDari || tglSampai
              ? `${fmtInputDate(tglDari) || '...'} S/D ${fmtInputDate(tglSampai) || '...'}`
              : 'SEMUA PERIODE';
          pdf.text('PERIODE', MARGIN_L + 2, y + 12);
          pdf.text(`: ${periode}`, MARGIN_L + 30, y + 12);
          pdf.text('TANGGAL CETAK', MARGIN_L + 2, y + 16.5);
          pdf.text(`: ${fmtInputDate(tglCetak)}`, MARGIN_L + 30, y + 16.5);

          y += 22;
        }

        firstPage = false;
        return drawRow(y, COLS.map((c) => c.label), true, true);
      };

      let y = drawHeader();
      let no = 0;

      for (const r of rows) {
        if (y + ROW_H > BOTTOM) y = drawHeader();
        no += 1;
        y = drawRow(
          y,
          [
            String(no),
            r.kode,
            r.nama,
            fmtNum(r.hrgBeli),
            r.disc ? fmtNum(r.disc) : '',
            fmtNum(r.qty),
            fmtNum(r.rupiah),
          ],
          false,
          false
        );
      }

      // ── Baris TOTAL: sel kiri menyatu, nilai di kolom JUMLAH ──
      const total = rows.reduce((s, r) => s + (r.rupiah || 0), 0);
      if (y + HEAD_H > BOTTOM) y = drawHeader();
      const qtyIdx = COLS.findIndex((c) => c.key === 'qty');
      const kiriW = COL_X[qtyIdx] - MARGIN_L;
      pdf.setDrawColor(120, 120, 120);
      pdf.setLineWidth(0.15);
      pdf.setFillColor(217, 217, 217);
      pdf.rect(MARGIN_L, y, kiriW, HEAD_H, 'FD');
      pdf.rect(COL_X[qtyIdx], y, COLS[qtyIdx].w, HEAD_H, 'FD');
      pdf.rect(COL_X[qtyIdx + 1], y, COLS[qtyIdx + 1].w, HEAD_H, 'FD');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(0, 0, 0);
      pdf.text('TOTAL', MARGIN_L + PAD, y + HEAD_H - 2.2);
      pdf.text(fmtNum(total), MARGIN_R - PAD, y + HEAD_H - 2.2, { align: 'right' });

      // ── Nomor halaman ──
      const totalHal = pdf.getNumberOfPages();
      for (let p = 1; p <= totalHal; p++) {
        pdf.setPage(p);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`Hal. ${p} / ${totalHal}`, PAGE_W / 2, PAGE_H - 5, { align: 'center' });
      }

      return pdf;
    },
    [tglDari, tglSampai, tglCetak]
  );

  const handleTampilkan = useCallback(async () => {
    setLoading(true);
    setError('');
    setEmpty(false);
    try {
      const params = new URLSearchParams();
      if (tipe !== 'semua') params.set('tipe', tipe);
      if (tglDari) params.set('tglDari', tglDari);
      if (tglSampai) params.set('tglSampai', tglSampai);
      params.set('includeItems', '1');

      // Item hanya menyimpan barangId (_id), sedangkan laporan mencetak kode
      // barang — master barang diambil sekali lalu dipetakan.
      const [transaksi, barang] = await Promise.all([
        fetchAllPages<TransaksiBeliDoc>(`/api/transaksi-beli?${params.toString()}`, undefined, 200, 200),
        fetchAllPages<BarangRef>('/api/barang?fields=picker', undefined, 200, 200),
      ]);

      const kodeById = new Map(barang.map((b) => [String(b._id), b.kode]));

      // Item digabung per kombinasi kode + harga beli + qty, persis seperti
      // laporan lama: qty, harga, dan jumlah dari baris sejenis dijumlahkan.
      const grup = new Map<string, BarisBarang>();
      for (const t of transaksi) {
        for (const it of t.items ?? []) {
          if (!it.barangId) continue;
          const kode = kodeById.get(String(it.barangId)) ?? it.barangId;
          const key = `${kode}|${it.hrgBeli}|${it.qty}`;
          const ada = grup.get(key);
          if (ada) {
            ada.qty += it.qty;
            ada.hrgBeli += it.hrgBeli;
            ada.disc += it.disc || 0;
            ada.rupiah += it.rupiah;
          } else {
            grup.set(key, {
              kode,
              nama: it.namaBarang,
              hrgBeli: it.hrgBeli,
              disc: it.disc || 0,
              qty: it.qty,
              rupiah: it.rupiah,
            });
          }
        }
      }

      // Urut menurut kode apa adanya (bukan localeCompare) supaya 'BK-3426'
      // tetap mendahului 'BK0025' seperti pada laporan cetak.
      const rows = Array.from(grup.values()).sort((a, b) => {
        if (a.kode !== b.kode) return a.kode < b.kode ? -1 : 1;
        if (a.hrgBeli !== b.hrgBeli) return a.hrgBeli - b.hrgBeli;
        return a.qty - b.qty;
      });

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
  }, [tipe, tglDari, tglSampai, buildPdf, replacePdfUrl]);

  const inputCls =
    'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none';

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)] gap-4 items-start lg:items-stretch overflow-y-auto lg:overflow-hidden">
      {/* ── Kiri: Filter ── */}
      <div className="bg-white rounded-xl shadow p-5 self-start">
        <h2 className="text-base font-bold text-gray-800 mb-4">Laporan Pembelian by Barang</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipe</label>
            <select value={tipe} onChange={(e) => setTipe(e.target.value)} className={inputCls}>
              <option value="semua">Semua</option>
              <option value="langsung">Pembelian Langsung</option>
              <option value="po">PO (Purchase Order)</option>
            </select>
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
            title="Laporan Pembelian by Barang"
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 px-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-14 h-14 mb-3 text-gray-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            {empty && !loading ? (
              <p className="text-sm text-gray-500">Tidak ada data pembelian untuk filter yang dipilih.</p>
            ) : (
              <p className="text-sm">Atur filter di sebelah kiri, lalu klik <strong>Tampilkan</strong>.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
