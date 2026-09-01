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
  satuan: string;
  satuanType: 'jual' | 'beli';
  isi: number;
  qty: number;
  hrgBeli: number;
  rupiah: number;
}

interface TransaksiBeliDoc {
  _id: string;
  refNo: string;
  tanggal: string;
  supplierNama: string;
  pembayaran: string;
  operator: string;
  disc: number;
  ppn: number;
  grandTotal: number;
  items: ItemBeli[];
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

/** ISO date dari server → dd/mm/yyyy waktu lokal. */
function fmtDocDate(s: string) {
  const dt = new Date(s);
  if (isNaN(dt.getTime())) return '';
  const p = (v: number) => String(v).padStart(2, '0');
  return `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()}`;
}

/** Label cara pembayaran seperti pada laporan: Cash → UANG PAS, Tempo → HUTANG. */
function labelPembayaran(p: string) {
  if (!p) return '';
  if (p === 'Cash') return 'UANG PAS';
  if (p === 'Tempo') return 'HUTANG';
  return p.toUpperCase();
}

/** Satuan + jumlah isi, mis. "DOS (12 Item)". */
function labelSatuan(it: ItemBeli) {
  const satuan = (it.satuan || '').toUpperCase();
  const isi = Number(it.isi) || 1;
  return it.satuanType === 'beli' && isi > 1 ? `${satuan} (${isi} Item)` : satuan;
}

// ─── Geometri laporan (mm, A4 portrait) ───────────────────────────────────────

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_L = 10;
const MARGIN_R = 200;
const BOTTOM = 283;

const COL = {
  no: 11,
  tanggal: 20,
  faktur: 41,
  supplier: 72,
  operator: 108,
  pemb: 148,      // rata tengah
  disc: 166,      // rata kanan
  ppn: 182,       // rata kanan
  jumlah: 200,    // rata kanan
  // baris item
  stars: 17,
  nama: 23,
  namaMax: 112,   // lebar maksimum nama barang
  satuan: 137,
  itemJumlah: 195.5,
  itemStars: 196.5,
};

/** Potong teks agar tidak menabrak kolom berikutnya. */
function clip(pdf: jsPDF, text: string, maxWidth: number) {
  let s = text ?? '';
  if (pdf.getTextWidth(s) <= maxWidth) return s;
  while (s.length > 1 && pdf.getTextWidth(`${s}..`) > maxWidth) s = s.slice(0, -1);
  return `${s}..`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LaporanPembelianByPeriodePage() {
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
    (rows: TransaksiBeliDoc[]) => {
      const pdf = new jsPDF('p', 'mm', 'a4');
      // Judul dokumen tampil pada toolbar PDF viewer bawaan browser.
      pdf.setProperties({
        title: 'Laporan Pembelian',
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
        pdf.text('LAPORAN PEMBELIAN', MARGIN_L, 28);

        // garis ganda di bawah judul
        pdf.setLineWidth(0.5);
        pdf.line(MARGIN_L, 32, MARGIN_R, 32);
        pdf.setLineWidth(0.2);
        pdf.line(MARGIN_L, 33, MARGIN_R, 33);

        let y = 37;

        // Blok periode & tanggal cetak hanya di halaman pertama.
        if (firstPage) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          const periode =
            tglDari || tglSampai
              ? `${fmtInputDate(tglDari) || '...'} S/D ${fmtInputDate(tglSampai) || '...'}`
              : 'SEMUA PERIODE';
          pdf.text('PERIODE', MARGIN_L + 2, y);
          pdf.text(':', MARGIN_L + 33, y);
          pdf.text(periode, MARGIN_L + 38, y);
          y += 4.5;
          pdf.text('TANGGAL CETAK', MARGIN_L + 2, y);
          pdf.text(':', MARGIN_L + 33, y);
          pdf.text(fmtInputDate(tglCetak), MARGIN_L + 38, y);
          y += 7;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.text('NO.', COL.no, y);
        pdf.text('TANGGAL', COL.tanggal, y);
        pdf.text('NO. FAKTUR', COL.faktur, y);
        pdf.text('SUPPLIER', COL.supplier, y);
        pdf.text('OPERATOR', COL.operator, y);
        pdf.text('PEMB.', COL.pemb, y, { align: 'center' });
        pdf.text('DISC(%)', COL.disc, y, { align: 'right' });
        pdf.text('PPN (%)', COL.ppn, y, { align: 'right' });
        pdf.text('JUMLAH', COL.jumlah, y, { align: 'right' });

        pdf.setLineWidth(0.3);
        pdf.line(MARGIN_L, y + 1.8, MARGIN_R, y + 1.8);

        firstPage = false;
        return y + 6;
      };

      let y = drawHeader();

      rows.forEach((t, idx) => {
        // ── Baris transaksi ──
        if (y > BOTTOM - 8) y = drawHeader();
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(0, 0, 0);
        pdf.text(String(idx + 1), COL.no, y);
        pdf.text(fmtDocDate(t.tanggal), COL.tanggal, y);
        pdf.text(t.refNo || '', COL.faktur, y);
        pdf.text(clip(pdf, t.supplierNama || 'Supplier Bebas', 34), COL.supplier, y);
        pdf.text(clip(pdf, (t.operator || '').toUpperCase(), 36), COL.operator, y);
        pdf.text(labelPembayaran(t.pembayaran), COL.pemb, y, { align: 'center' });
        pdf.text(fmtNum(t.disc), COL.disc, y, { align: 'right' });
        pdf.text(fmtNum(t.ppn), COL.ppn, y, { align: 'right' });
        pdf.text(fmtNum(t.grandTotal), COL.jumlah, y, { align: 'right' });
        y += 4.6;

        // ── Baris item ──
        for (const it of t.items || []) {
          if (y > BOTTOM) y = drawHeader();

          pdf.setFontSize(5);
          pdf.setTextColor(120, 120, 120);
          pdf.text('***', COL.stars, y);
          pdf.text('***', COL.itemStars, y);

          pdf.setFontSize(7);
          pdf.setTextColor(0, 0, 0);
          pdf.text(clip(pdf, it.namaBarang || '', COL.namaMax), COL.nama, y);
          pdf.text(labelSatuan(it), COL.satuan, y);
          pdf.text(fmtNum(it.qty), COL.disc, y, { align: 'right' });
          pdf.text(fmtNum(it.hrgBeli), COL.ppn, y, { align: 'right' });
          pdf.text(fmtNum(it.rupiah), COL.itemJumlah, y, { align: 'right' });
          y += 3.9;
        }

        y += 1.4; // jeda antar transaksi
      });

      // ── Baris TOTAL ──
      const total = rows.reduce((s, t) => s + (t.grandTotal || 0), 0);
      if (y > BOTTOM - 10) y = drawHeader();
      y += 1;
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
    setLoading(true);
    setError('');
    setEmpty(false);
    try {
      const params = new URLSearchParams();
      if (tipe !== 'semua') params.set('tipe', tipe);
      if (tglDari) params.set('tglDari', tglDari);
      if (tglSampai) params.set('tglSampai', tglSampai);
      params.set('includeItems', '1');

      // Laporan tidak boleh terpotong halaman: ambil seluruh periode.
      const transaksi = await fetchAllPages<TransaksiBeliDoc>(
        `/api/transaksi-beli?${params.toString()}`,
        undefined,
        200,
        200
      );

      // API mengurutkan terbaru dulu; laporan periode dibaca dari tanggal awal.
      const rows = [...transaksi].sort((a, b) => {
        const d = new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime();
        return d !== 0 ? d : (a.refNo || '').localeCompare(b.refNo || '');
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
        <h2 className="text-base font-bold text-gray-800 mb-4">Laporan Pembelian by Periode</h2>

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
            title="Laporan Pembelian by Periode"
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
