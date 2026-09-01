'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import { fetchAllPages } from '@/lib/apiList';

// ─── Identitas perusahaan pada kop laporan ────────────────────────────────────
const PERUSAHAAN = {
  nama: 'Aba Bussines Centre',
  alamat: 'Graha Insan Kamil Sidoarjo Jawa Timur',
};

const SEMUA = '__semua__';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BarangRef {
  _id: string;
  kode: string;
  nama: string;
  kategori: string;
  hargaBeli: number;
}

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
  items: ItemJual[];
}

interface ItemKoreksi {
  barangId: string;
  namaBarang: string;
  selisih: number;
}

interface KoreksiStokDoc {
  _id: string;
  refNo: string;
  tanggal: string;
  items: ItemKoreksi[];
}

/** Satu baris laporan — sudah rata, siap dicetak. */
interface Baris {
  tanggal: string;      // yyyy-mm-dd waktu lokal; dipakai untuk filter & sortir
  refNo: string;
  kode: string;
  nama: string;
  keterangan: string;
  diskon: number;
  hJual: number;
  hpp: number;
  laba: number;
  penjualan: boolean;   // baris non-penjualan dicetak merah, seperti laporan lama
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
const MARGIN_R = 200;
const BOTTOM = 283;
const ROW_H = 4.2;

interface Kolom {
  label: string;
  w: number;
  align: 'left' | 'right';
}

/** Lebar total 190 mm — sama dengan area cetak MARGIN_L..MARGIN_R. */
const KOLOM: Kolom[] = [
  { label: 'NO.',         w: 8,  align: 'left'  },
  { label: 'TANGGAL',     w: 16, align: 'left'  },
  { label: 'NO. FAKTUR',  w: 26, align: 'left'  },
  { label: 'KD BARANG',   w: 24, align: 'left'  },
  { label: 'NAMA BARANG', w: 38, align: 'left'  },
  { label: 'Keterangan',  w: 25, align: 'left'  },
  { label: 'H.JUAL',      w: 16, align: 'right' },
  { label: 'HPP',         w: 16, align: 'right' },
  { label: 'DISKON',      w: 10, align: 'right' },
  { label: 'LABA RUGI',   w: 11, align: 'right' },
];

const COL_X: number[] = (() => {
  const xs: number[] = [];
  let x = MARGIN_L;
  for (const c of KOLOM) {
    xs.push(x);
    x += c.w;
  }
  return xs;
})();

/** Potong teks agar tidak melewati lebar kolom. */
function clip(pdf: jsPDF, text: string, maxWidth: number) {
  let s = text ?? '';
  if (pdf.getTextWidth(s) <= maxWidth) return s;
  while (s.length > 1 && pdf.getTextWidth(`${s}..`) > maxWidth) s = s.slice(0, -1);
  return `${s}..`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LaporanLabaRugiPage() {
  const [kategori, setKategori] = useState(SEMUA);
  const [tglCetak, setTglCetak] = useState(todayStr());
  const [tglDari, setTglDari] = useState(awalBulanStr());
  const [tglSampai, setTglSampai] = useState(todayStr());
  const [hanyaPenjualan, setHanyaPenjualan] = useState('ya');

  const [barang, setBarang] = useState<BarangRef[]>([]);
  const [memuatOpsi, setMemuatOpsi] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [empty, setEmpty] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');

  /** Ganti PDF sambil melepas object URL lama supaya blob tidak menumpuk. */
  const replacePdfUrl = useCallback((next: string) => {
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return next;
    });
  }, []);

  /** Master barang: sumber kode, kategori, dan harga beli (dasar HPP). */
  const muatBarang = useCallback(
    () => fetchAllPages<BarangRef>('/api/barang?fields=stok', undefined, 200, 200),
    []
  );

  useEffect(() => {
    let batal = false;
    const jalan = async () => {
      try {
        const rows = await muatBarang();
        if (!batal) setBarang(rows);
      } catch (err: unknown) {
        if (!batal) setError(err instanceof Error ? err.message : 'Gagal memuat data barang');
      } finally {
        if (!batal) setMemuatOpsi(false);
      }
    };
    void jalan();
    return () => { batal = true; };
  }, [muatBarang]);

  // Opsi diambil dari nilai yang benar-benar ada di master barang, supaya setiap
  // pilihan dijamin mengembalikan baris.
  const opsiKategori = useMemo(
    () => Array.from(new Set(barang.map((b) => (b.kategori || '').trim()).filter(Boolean))).sort(),
    [barang]
  );

  const buildPdf = useCallback(
    (rows: Baris[]) => {
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.setProperties({
        title: 'Laporan Laba Rugi',
        subject: `Periode ${fmtInputDate(tglDari) || '...'} s/d ${fmtInputDate(tglSampai) || '...'}`,
        author: PERUSAHAAN.nama,
      });

      /** Satu baris teks; kolom kanan dirata-kanan pada tepi kolomnya. */
      const drawCells = (y: number, cells: string[], bold: boolean, merah = false) => {
        pdf.setFont('helvetica', bold ? 'bold' : 'normal');
        pdf.setFontSize(bold ? 6.4 : 6.2);
        if (merah) pdf.setTextColor(200, 30, 30);
        else pdf.setTextColor(0, 0, 0);
        KOLOM.forEach((c, i) => {
          const text = cells[i] ?? '';
          if (!text) return;
          if (c.align === 'right') {
            pdf.text(clip(pdf, text, c.w - 1.5), COL_X[i] + c.w - 1, y, { align: 'right' });
          } else {
            pdf.text(clip(pdf, text, c.w - 1.5), COL_X[i], y);
          }
        });
      };

      let firstPage = true;

      /** Kop (halaman 1) + judul kolom. Mengembalikan y baris data pertama. */
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
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8.5);
          const periode =
            tglDari || tglSampai
              ? `${fmtInputDate(tglDari) || '...'} S/D ${fmtInputDate(tglSampai) || '...'}`
              : 'SEMUA PERIODE';
          pdf.text('BULAN', MARGIN_L, y + 11);
          pdf.text(`: ${periode}`, MARGIN_L + 26, y + 11);
          pdf.text('TANGGAL CETAK', MARGIN_L, y + 15);
          pdf.text(`: ${fmtInputDate(tglCetak)}`, MARGIN_L + 26, y + 15);
          pdf.text('KATEGORI', MARGIN_L, y + 19);
          pdf.text(`: ${kategori === SEMUA ? 'SEMUA' : kategori.toUpperCase()}`, MARGIN_L + 26, y + 19);

          // Judul digarisbawahi, seperti laporan lama.
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.text('LAPORAN LABA RUGI', MARGIN_L, y + 26);
          pdf.setLineWidth(0.3);
          pdf.line(MARGIN_L, y + 27, MARGIN_L + pdf.getTextWidth('LAPORAN LABA RUGI'), y + 27);

          y += 34;
        }

        pdf.setLineWidth(0.3);
        pdf.line(MARGIN_L, y - 3.5, MARGIN_R, y - 3.5);
        drawCells(y, KOLOM.map((c) => c.label), true);
        pdf.line(MARGIN_L, y + 1.5, MARGIN_R, y + 1.5);

        firstPage = false;
        return y + 5.5;
      };

      let y = drawHeader();
      let no = 0;
      let totalJual = 0;
      let totalHpp = 0;
      let totalDiskon = 0;
      let totalLaba = 0;

      for (const r of rows) {
        if (y > BOTTOM) y = drawHeader();
        no += 1;
        totalJual += r.hJual;
        totalHpp += r.hpp;
        totalDiskon += r.diskon;
        totalLaba += r.laba;

        drawCells(
          y,
          [
            String(no),
            fmtInputDate(r.tanggal),
            r.refNo,
            r.kode,
            r.nama,
            r.keterangan,
            r.hJual ? fmtNum(r.hJual) : '',
            r.hpp ? fmtNum(r.hpp) : '',
            r.diskon ? fmtNum(r.diskon) : '',
            r.laba ? fmtNum(r.laba) : '',
          ],
          false,
          !r.penjualan
        );
        y += ROW_H;
      }

      // ── Baris TOTAL ──
      if (y > BOTTOM - 6) y = drawHeader();
      y += 1;
      pdf.setLineWidth(0.3);
      pdf.line(MARGIN_L, y, MARGIN_R, y);
      y += 4.5;
      const totalCells = KOLOM.map((_, i) =>
        i === 0 ? 'TOTAL'
          : i === 6 ? fmtNum(totalJual)
          : i === 7 ? fmtNum(totalHpp)
          : i === 8 ? (totalDiskon ? fmtNum(totalDiskon) : '')
          : i === 9 ? fmtNum(totalLaba)
          : ''
      );
      drawCells(y, totalCells, true);
      pdf.setLineWidth(0.5);
      pdf.line(MARGIN_L, y + 1.8, MARGIN_R, y + 1.8);

      // ── Nomor halaman ──
      const totalHal = pdf.getNumberOfPages();
      for (let p = 1; p <= totalHal; p++) {
        pdf.setPage(p);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(120, 120, 120);
        pdf.text(`Hal. ${p} / ${totalHal}`, PAGE_W / 2, PAGE_H - 6, { align: 'center' });
      }

      return pdf;
    },
    [kategori, tglCetak, tglDari, tglSampai]
  );

  const handleTampilkan = useCallback(async () => {
    setLoading(true);
    setError('');
    setWarning('');
    setEmpty(false);
    try {
      // Master barang di-refresh supaya HPP memakai harga beli terkini.
      const master = await muatBarang();
      setBarang(master);
      const byId = new Map(master.map((b) => [b._id, b]));

      // Server memotong rentang `tanggal` pada batas midnight; rentang dilebarkan
      // sehari di kedua sisi lalu disaring ulang di sini memakai tanggal lokal.
      const params = new URLSearchParams();
      if (tglDari) params.set('tglDari', addDays(tglDari, -1));
      if (tglSampai) params.set('tglSampai', addDays(tglSampai, 1));
      params.set('includeItems', '1');

      const dalamPeriode = (hari: string) =>
        !!hari && (!tglDari || hari >= tglDari) && (!tglSampai || hari <= tglSampai);

      /** Barang tanpa master (sudah dihapus) hanya ikut saat kategori "semua". */
      const cocokKategori = (b: BarangRef | undefined) =>
        kategori === SEMUA || (b?.kategori || '').trim() === kategori;

      const rows: Baris[] = [];

      // ── Penjualan barang ──
      const jual = await fetchAllPages<TransaksiJualDoc>(
        `/api/transaksi-jual?${params.toString()}`,
        undefined,
        200,
        200
      );

      for (const t of jual) {
        const hari = toLocalDay(t.tanggal);
        if (!dalamPeriode(hari)) continue;
        for (const it of t.items || []) {
          const b = byId.get(it.barangId);
          if (!cocokKategori(b)) continue;
          // subtotal item sudah bersih dari diskon baris.
          const hJual = Number(it.subtotal) || 0;
          const hpp = (Number(it.qty) || 0) * (Number(b?.hargaBeli) || 0);
          rows.push({
            tanggal: hari,
            refNo: t.refNo || '',
            kode: b?.kode || '',
            nama: b?.nama || it.namaBarang || '',
            keterangan: 'PENJUALAN BARANG',
            diskon: Number(it.discRp) || 0,
            hJual,
            hpp,
            laba: hJual - hpp,
            penjualan: true,
          });
        }
      }

      // ── Koreksi stok: menambah/mengurangi nilai persediaan tanpa penjualan ──
      if (hanyaPenjualan !== 'ya') {
        try {
          const koreksi = await fetchAllPages<KoreksiStokDoc>(
            '/api/koreksi-stok',
            undefined,
            100,
            200
          );
          for (const k of koreksi) {
            const hari = toLocalDay(k.tanggal);
            if (!dalamPeriode(hari)) continue;
            for (const it of k.items || []) {
              const b = byId.get(it.barangId);
              if (!cocokKategori(b)) continue;
              // Selisih minus = barang berkurang → rugi sebesar nilai persediaan.
              const nilai = (Number(it.selisih) || 0) * (Number(b?.hargaBeli) || 0);
              if (!nilai) continue;
              rows.push({
                tanggal: hari,
                refNo: k.refNo || '',
                kode: b?.kode || '',
                nama: b?.nama || it.namaBarang || '',
                keterangan: 'KOREKSI BARANG',
                diskon: 0,
                hJual: 0,
                hpp: Math.abs(nilai),
                laba: nilai,
                penjualan: false,
              });
            }
          }
        } catch {
          // Koreksi stok hanya boleh dibaca admin. Laporan penjualan tetap
          // dicetak, tapi user perlu tahu bagian ini tidak ikut.
          setWarning('Data koreksi barang tidak dapat diambil; laporan hanya berisi penjualan.');
        }
      }

      // Urutan cetak: tanggal → faktur → kode barang, seperti laporan lama.
      rows.sort(
        (a, b) =>
          a.tanggal.localeCompare(b.tanggal) ||
          a.refNo.localeCompare(b.refNo) ||
          a.kode.localeCompare(b.kode)
      );

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
  }, [muatBarang, kategori, tglDari, tglSampai, hanyaPenjualan, buildPdf, replacePdfUrl]);

  const inputCls =
    'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none';

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)] gap-4 items-start lg:items-stretch overflow-y-auto lg:overflow-hidden">
      {/* ── Kiri: Filter ── */}
      <div className="bg-white rounded-xl shadow p-5 self-start">
        <h2 className="text-base font-bold text-gray-800 mb-4">Laporan Laba Rugi</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Kategori Barang</label>
            <select
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              disabled={memuatOpsi}
              className={inputCls}
            >
              <option value={SEMUA}>Pilih Semua</option>
              {opsiKategori.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
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

          <div className="grid grid-cols-2 gap-2">
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Sampai</label>
              <input
                type="date"
                value={tglSampai}
                onChange={(e) => setTglSampai(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Tampilkan hanya penjualan saja?
            </label>
            <select
              value={hanyaPenjualan}
              onChange={(e) => setHanyaPenjualan(e.target.value)}
              className={inputCls}
            >
              <option value="ya">Ya</option>
              <option value="tidak">Tidak</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleTampilkan}
          disabled={loading || memuatOpsi}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2 rounded text-sm font-medium transition"
        >
          {loading || memuatOpsi ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {memuatOpsi ? 'Memuat data...' : 'Memuat...'}
            </span>
          ) : (
            'Tampilkan'
          )}
        </button>

        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}
        {warning && !error && (
          <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">{warning}</p>
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
            title="Laporan Laba Rugi"
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 px-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-14 h-14 mb-3 text-gray-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            {empty && !loading ? (
              <p className="text-sm text-gray-500">Tidak ada data untuk filter yang dipilih.</p>
            ) : (
              <p className="text-sm">Atur filter di sebelah kiri, lalu klik <strong>Tampilkan</strong>.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
