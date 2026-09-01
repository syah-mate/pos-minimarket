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

interface ItemJual {
  barangId: string;
  namaBarang: string;
  qty: number;
  harga: number;
  discRp: number;
  subtotal: number;
}

interface TransaksiJualDoc {
  _id: string;
  refNo: string;
  tanggal: string;
  operator: string;
  disc: number;
  items: ItemJual[];
}

interface BarangRef {
  _id: string;
  kode: string;
  nama: string;
}

/** Satu baris item di bawah kasirnya. */
interface BarisItem {
  kode: string;
  nama: string;
  qty: number;
  harga: number;
  diskon: number;
  subtotal: number;
}

/** Satu kasir beserta rekap dan seluruh item yang dilayaninya. */
interface Kasir {
  nama: string;
  kotor: number;
  diskon: number;
  card: number;
  bersih: number;
  items: BarisItem[];
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

// ─── Geometri laporan (mm, A4 portrait) ───────────────────────────────────────

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_L = 10;
const BOTTOM = 287;

const ROW_H = 6.2;
const HEAD_H = 6.6;
const PAD = 1.8;

type Align = 'left' | 'right' | 'center';
interface Kolom {
  label: string;
  w: number;
  align: Align;
}

/**
 * Dua set kolom dengan tepi yang sama: kolom kasir memakai satu sel lebar untuk
 * "Kode - Nama Kasir", sedangkan baris item memecahnya jadi kode + nama.
 * Lebar total keduanya 190 mm, sehingga garis vertikal tetap sejajar.
 */
const COLS_KASIR: Kolom[] = [
  { label: 'No.', w: 9, align: 'left' },
  { label: 'Kode - Nama Kasir', w: 89, align: 'left' },
  { label: 'Penjualan Kotor', w: 25, align: 'right' },
  { label: 'Diskon', w: 22, align: 'right' },
  { label: 'Card', w: 20, align: 'right' },
  { label: 'Penjualan Bersih', w: 25, align: 'right' },
];

const COLS_ITEM: Kolom[] = [
  { label: 'No.', w: 9, align: 'left' },
  { label: 'Kode Barang', w: 28, align: 'left' },
  { label: 'Nama Barang', w: 61, align: 'left' },
  { label: 'QTY', w: 25, align: 'center' },
  { label: 'Harga', w: 22, align: 'right' },
  { label: 'Diskon', w: 20, align: 'right' },
  { label: 'Subtotal', w: 25, align: 'right' },
];

/** Batas kiri tiap kolom, hasil akumulasi lebar. */
function colX(cols: Kolom[]): number[] {
  const xs: number[] = [];
  let x = MARGIN_L;
  for (const c of cols) {
    xs.push(x);
    x += c.w;
  }
  return xs;
}

const X_KASIR = colX(COLS_KASIR);
const X_ITEM = colX(COLS_ITEM);

/** Potong teks agar tidak melewati lebar sel. */
function clip(pdf: jsPDF, text: string, maxWidth: number) {
  let s = text ?? '';
  if (pdf.getTextWidth(s) <= maxWidth) return s;
  while (s.length > 1 && pdf.getTextWidth(`${s}..`) > maxWidth) s = s.slice(0, -1);
  return `${s}..`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LaporanPenjualanByKasirPage() {
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
    (kasirList: Kasir[]) => {
      const pdf = new jsPDF('p', 'mm', 'a4');
      // Judul dokumen tampil pada toolbar PDF viewer bawaan browser.
      pdf.setProperties({
        title: 'Laporan Penjualan by Kasir',
        subject: `Periode ${fmtInputDate(tglDari) || '...'} s/d ${fmtInputDate(tglSampai) || '...'}`,
        author: PERUSAHAAN.nama,
      });

      /** Satu baris sel bergaris; `fill` untuk baris judul kolom. */
      const drawRow = (
        cols: Kolom[],
        xs: number[],
        y: number,
        cells: string[],
        bold: boolean,
        fill: boolean
      ) => {
        const h = bold ? HEAD_H : ROW_H;
        pdf.setFont('helvetica', bold ? 'bold' : 'normal');
        pdf.setFontSize(7.5);
        pdf.setDrawColor(120, 120, 120);
        pdf.setLineWidth(0.15);

        cols.forEach((c, i) => {
          const x = xs[i];
          if (fill) {
            pdf.setFillColor(217, 217, 217);
            pdf.rect(x, y, c.w, h, 'FD');
          } else {
            pdf.rect(x, y, c.w, h, 'S');
          }
          const text = cells[i] ?? '';
          if (!text) return;
          pdf.setTextColor(0, 0, 0);
          const baseline = y + h - 2.2;
          if (c.align === 'right') {
            pdf.text(clip(pdf, text, c.w - PAD * 2), x + c.w - PAD, baseline, { align: 'right' });
          } else if (c.align === 'center') {
            pdf.text(clip(pdf, text, c.w - PAD * 2), x + c.w / 2, baseline, { align: 'center' });
          } else {
            pdf.text(clip(pdf, text, c.w - PAD * 2), x + PAD, baseline);
          }
        });

        return y + h;
      };

      let firstPage = true;

      /** Kop (halaman 1) + judul kolom kasir. Mengembalikan y baris berikutnya. */
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
          pdf.text('BULAN', MARGIN_L + 2, y + 12);
          pdf.text(`: ${periode}`, MARGIN_L + 30, y + 12);
          pdf.text('TANGGAL CETAK', MARGIN_L + 2, y + 16.5);
          pdf.text(`: ${fmtInputDate(tglCetak)}`, MARGIN_L + 30, y + 16.5);

          // Judul digarisbawahi, seperti laporan lama.
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.text('LAPORAN PENJUALAN BY KASIR', MARGIN_L, y + 23);
          pdf.setLineWidth(0.3);
          pdf.line(
            MARGIN_L,
            y + 24,
            MARGIN_L + pdf.getTextWidth('LAPORAN PENJUALAN BY KASIR'),
            y + 24
          );

          y += 27;
        }

        firstPage = false;
        return drawRow(COLS_KASIR, X_KASIR, y, COLS_KASIR.map((c) => c.label), true, false);
      };

      let y = drawHeader();
      let noItem = 0;

      kasirList.forEach((k, idx) => {
        // Baris kasir + judul kolom item selalu satu paket dengan minimal satu
        // baris item, supaya kasir tidak menggantung sendirian di kaki halaman.
        if (y + HEAD_H * 2 + ROW_H > BOTTOM) y = drawHeader();

        y = drawRow(
          COLS_KASIR,
          X_KASIR,
          y,
          [
            String(idx + 1),
            `${k.nama} - ${k.nama}`,
            fmtNum(k.kotor),
            k.diskon ? fmtNum(k.diskon) : '',
            k.card ? fmtNum(k.card) : '',
            fmtNum(k.bersih),
          ],
          false,
          false
        );

        y = drawRow(COLS_ITEM, X_ITEM, y, COLS_ITEM.map((c) => c.label), true, true);

        for (const it of k.items) {
          if (y + ROW_H > BOTTOM) y = drawHeader();
          noItem += 1;
          y = drawRow(
            COLS_ITEM,
            X_ITEM,
            y,
            [
              String(noItem),
              it.kode,
              it.nama,
              fmtNum(it.qty),
              fmtNum(it.harga),
              it.diskon ? fmtNum(it.diskon) : '',
              fmtNum(it.subtotal),
            ],
            false,
            false
          );
        }
      });

      // ── Baris TOTAL: sel kiri menyatu, rekap di empat kolom kanan ──
      const total = kasirList.reduce(
        (s, k) => ({
          kotor: s.kotor + k.kotor,
          diskon: s.diskon + k.diskon,
          card: s.card + k.card,
          bersih: s.bersih + k.bersih,
        }),
        { kotor: 0, diskon: 0, card: 0, bersih: 0 }
      );
      if (y + HEAD_H > BOTTOM) y = drawHeader();
      const kiriW = X_KASIR[2] - MARGIN_L;
      pdf.setDrawColor(120, 120, 120);
      pdf.setLineWidth(0.15);
      pdf.setFillColor(217, 217, 217);
      pdf.rect(MARGIN_L, y, kiriW, HEAD_H, 'FD');
      for (let i = 2; i < COLS_KASIR.length; i++) {
        pdf.rect(X_KASIR[i], y, COLS_KASIR[i].w, HEAD_H, 'FD');
      }
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.5);
      pdf.setTextColor(0, 0, 0);
      const baseline = y + HEAD_H - 2.2;
      pdf.text('TOTAL', MARGIN_L + PAD, baseline);
      const totalCells = [total.kotor, total.diskon, total.card, total.bersih];
      totalCells.forEach((v, i) => {
        const c = COLS_KASIR[i + 2];
        pdf.text(fmtNum(v), X_KASIR[i + 2] + c.w - PAD, baseline, { align: 'right' });
      });

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
      // Server memotong rentang `tanggal` pada batas midnight; rentang dilebarkan
      // sehari di kedua sisi lalu disaring ulang di sini memakai tanggal lokal.
      const params = new URLSearchParams();
      if (tglDari) params.set('tglDari', addDays(tglDari, -1));
      if (tglSampai) params.set('tglSampai', addDays(tglSampai, 1));
      params.set('includeItems', '1');

      // Item hanya menyimpan barangId (_id), sedangkan laporan mencetak kode
      // barang — master barang diambil sekali lalu dipetakan.
      const [transaksi, barang] = await Promise.all([
        fetchAllPages<TransaksiJualDoc>(`/api/transaksi-jual?${params.toString()}`, undefined, 200, 200),
        fetchAllPages<BarangRef>('/api/barang?fields=stok', undefined, 200, 200),
      ]);

      const byId = new Map(barang.map((b) => [String(b._id), b]));

      const dalamPeriode = (hari: string) =>
        !!hari && (!tglDari || hari >= tglDari) && (!tglSampai || hari <= tglSampai);

      // Transaksi lama dibaca lebih dulu supaya urutan item mengikuti waktu jual.
      const urut = [...transaksi]
        .filter((t) => dalamPeriode(toLocalDay(t.tanggal)))
        .sort((a, b) => {
          const d = new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime();
          return d !== 0 ? d : (a.refNo || '').localeCompare(b.refNo || '');
        });

      const grup = new Map<string, Kasir>();
      for (const t of urut) {
        const nama = (t.operator || '').trim().toUpperCase() || 'TANPA KASIR';
        let k = grup.get(nama);
        if (!k) {
          k = { nama, kotor: 0, diskon: 0, card: 0, bersih: 0, items: [] };
          grup.set(nama, k);
        }

        for (const it of t.items ?? []) {
          const b = byId.get(String(it.barangId));
          const qty = Number(it.qty) || 0;
          const harga = Number(it.harga) || 0;
          const diskon = Number(it.discRp) || 0;
          // subtotal item sudah bersih dari diskon baris.
          const subtotal = Number(it.subtotal) || 0;
          k.kotor += qty * harga;
          k.diskon += diskon;
          k.items.push({
            kode: b?.kode ?? it.barangId ?? '',
            nama: b?.nama || it.namaBarang || '',
            qty,
            harga,
            diskon,
            subtotal,
          });
        }
        // Diskon nota (di luar diskon per baris) ikut mengurangi penjualan bersih.
        k.diskon += Number(t.disc) || 0;
      }

      const kasirList = Array.from(grup.values())
        .map((k) => ({ ...k, bersih: k.kotor - k.diskon - k.card }))
        .filter((k) => k.items.length > 0)
        .sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));

      if (kasirList.length === 0) {
        replacePdfUrl('');
        setEmpty(true);
        return;
      }

      const blob = buildPdf(kasirList).output('blob');
      replacePdfUrl(URL.createObjectURL(blob));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, [tglDari, tglSampai, buildPdf, replacePdfUrl]);

  const inputCls =
    'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none';

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)] gap-4 items-start lg:items-stretch overflow-y-auto lg:overflow-hidden">
      {/* ── Kiri: Filter ── */}
      <div className="bg-white rounded-xl shadow p-5 self-start">
        <h2 className="text-base font-bold text-gray-800 mb-4">Laporan Penjualan by Kasir</h2>

        <div className="space-y-3">
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
            title="Laporan Penjualan by Kasir"
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
