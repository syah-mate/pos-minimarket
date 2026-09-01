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

interface BarangStok {
  _id: string;
  kode: string;
  nama: string;
  kategori: string;
  lokasi: string;
  satuanJual: string;
  stok: number;
  hargaBeli: number;
  hargaJualToko: number;
  hargaJualPartai: number;
  hargaJualCabang: number;
}

type HargaKey = 'beli' | 'toko' | 'partai' | 'cabang' | 'semua';

/** Kolom harga yang bisa dipilih; `semua` mencetak keempatnya sekaligus. */
const HARGA_OPSI: { key: Exclude<HargaKey, 'semua'>; label: string; field: keyof BarangStok }[] = [
  { key: 'beli', label: 'HARGA BELI', field: 'hargaBeli' },
  { key: 'toko', label: 'HRG TOKO', field: 'hargaJualToko' },
  { key: 'partai', label: 'HRG PARTAI', field: 'hargaJualPartai' },
  { key: 'cabang', label: 'HRG CABANG', field: 'hargaJualCabang' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** 1.234.567 atau 1.234.567,89 — mengikuti format angka pada laporan cetak. */
const fmtNum = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n || 0);

function todayStr() {
  const d = new Date();
  const p = (v: number) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
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
const BOTTOM = 285;
const ROW_H = 4.4;

interface Kolom {
  label: string;
  w: number;
  align: 'left' | 'right';
}

/** Potong teks agar tidak melewati lebar kolom. */
function clip(pdf: jsPDF, text: string, maxWidth: number) {
  let s = text ?? '';
  if (pdf.getTextWidth(s) <= maxWidth) return s;
  while (s.length > 1 && pdf.getTextWidth(`${s}..`) > maxWidth) s = s.slice(0, -1);
  return `${s}..`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LaporanStokPage() {
  const [kategori, setKategori] = useState(SEMUA);
  const [ikutKosong, setIkutKosong] = useState('ya');
  const [harga, setHarga] = useState<HargaKey>('beli');
  const [tglCetak, setTglCetak] = useState(todayStr());

  const [barang, setBarang] = useState<BarangStok[]>([]);
  const [memuatOpsi, setMemuatOpsi] = useState(true);
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

  /** Master barang: dipakai untuk isi dropdown sekaligus sumber baris laporan. */
  const muatBarang = useCallback(
    () => fetchAllPages<BarangStok>('/api/barang?fields=stok', undefined, 200, 200),
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
    (rows: BarangStok[]) => {
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.setProperties({
        title: 'Laporan Stok',
        subject: `Per ${fmtInputDate(tglCetak)}`,
        author: PERUSAHAAN.nama,
      });

      const semuaHarga = harga === 'semua';
      const hargaDipakai = semuaHarga
        ? HARGA_OPSI
        : HARGA_OPSI.filter((h) => h.key === harga);
      // Saldo memakai harga beli — nilai persediaan, bukan nilai jual.
      const fieldSaldo: keyof BarangStok = semuaHarga ? 'hargaBeli' : hargaDipakai[0].field;

      // Mode "semua harga" butuh 4 kolom harga, jadi LOKASI & CONVERSI STOK
      // dilepas supaya lebar 190 mm tetap cukup.
      const kolom: Kolom[] = semuaHarga
        ? [
            { label: 'NO.', w: 8, align: 'left' },
            { label: 'KODE BARANG', w: 22, align: 'left' },
            { label: 'NAMA BARANG', w: 48, align: 'left' },
            { label: 'STOK SAT', w: 16, align: 'right' },
            ...hargaDipakai.map((h) => ({ label: h.label, w: 19, align: 'right' as const })),
            { label: 'SALDO', w: 20, align: 'right' },
          ]
        : [
            { label: 'NO.', w: 9, align: 'left' },
            { label: 'KODE BARANG', w: 30, align: 'left' },
            { label: 'NAMA BARANG', w: 53, align: 'left' },
            { label: 'LOKASI', w: 20, align: 'left' },
            { label: 'STOK SAT', w: 18, align: 'right' },
            { label: 'CONVERSI STOK', w: 22, align: 'right' },
            { label: hargaDipakai[0].label, w: 20, align: 'right' },
            { label: 'SALDO', w: 18, align: 'right' },
          ];

      const colX: number[] = [];
      let x = MARGIN_L;
      for (const c of kolom) {
        colX.push(x);
        x += c.w;
      }

      /** Satu baris teks; kolom kanan dirata-kanan pada tepi kolomnya. */
      const drawCells = (y: number, cells: string[], bold: boolean) => {
        pdf.setFont('helvetica', bold ? 'bold' : 'normal');
        pdf.setFontSize(bold ? 6.8 : 6.5);
        pdf.setTextColor(0, 0, 0);
        kolom.forEach((c, i) => {
          const text = cells[i] ?? '';
          if (!text) return;
          if (c.align === 'right') {
            pdf.text(clip(pdf, text, c.w - 2), colX[i] + c.w - 1, y, { align: 'right' });
          } else {
            pdf.text(clip(pdf, text, c.w - 2), colX[i], y);
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

          // Judul digarisbawahi, seperti laporan lama.
          pdf.setTextColor(0, 0, 0);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.text('LAPORAN STOK', MARGIN_L, y + 13);
          pdf.setLineWidth(0.3);
          pdf.line(MARGIN_L, y + 14, MARGIN_L + pdf.getTextWidth('LAPORAN STOK'), y + 14);

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8.5);
          pdf.text('PERIODE', MARGIN_L, y + 17.5);
          pdf.text(`: ${fmtInputDate(tglCetak)}`, MARGIN_L + 22, y + 17.5);
          pdf.text('KATEGORI', MARGIN_L, y + 21.5);
          pdf.text(`: ${kategori === SEMUA ? 'SEMUA' : kategori.toUpperCase()}`, MARGIN_L + 22, y + 21.5);

          y += 28;
        }

        pdf.setLineWidth(0.3);
        pdf.line(MARGIN_L, y - 3.5, MARGIN_R, y - 3.5);
        drawCells(y, kolom.map((c) => c.label), true);
        pdf.line(MARGIN_L, y + 1.5, MARGIN_R, y + 1.5);

        firstPage = false;
        return y + 5.5;
      };

      let y = drawHeader();
      let no = 0;
      let totalQty = 0;
      let totalSaldo = 0;

      for (const b of rows) {
        if (y > BOTTOM) y = drawHeader();
        no += 1;
        const sat = (b.satuanJual || '').toUpperCase();
        const stok = b.stok || 0;
        const saldo = stok * (Number(b[fieldSaldo]) || 0);
        totalQty += stok;
        totalSaldo += saldo;

        const hargaCells = hargaDipakai.map((h) => fmtNum(Number(b[h.field]) || 0));
        const cells = semuaHarga
          ? [
              String(no),
              b.kode || '',
              b.nama || '',
              stok ? `${fmtNum(stok)}${sat}` : sat,
              ...hargaCells,
              saldo ? fmtNum(saldo) : '',
            ]
          : [
              String(no),
              b.kode || '',
              b.nama || '',
              b.lokasi || '',
              stok ? `${fmtNum(stok)}${sat}` : sat,
              `${fmtNum(stok)} ${sat}`,
              hargaCells[0],
              saldo ? fmtNum(saldo) : '',
            ];

        drawCells(y, cells, false);
        y += ROW_H;
      }

      // ── Baris TOTAL: jumlah stok & nilai persediaan ──
      if (y > BOTTOM - 6) y = drawHeader();
      y += 1;
      pdf.setLineWidth(0.3);
      pdf.line(MARGIN_L, y, MARGIN_R, y);
      y += 4.5;
      const idxQty = semuaHarga ? 3 : 5;
      const totalCells = kolom.map((_, i) =>
        i === 0 ? 'TOTAL' : i === idxQty ? fmtNum(totalQty) : i === kolom.length - 1 ? fmtNum(totalSaldo) : ''
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
    [harga, kategori, tglCetak]
  );

  const handleTampilkan = useCallback(async () => {
    setLoading(true);
    setError('');
    setEmpty(false);
    try {
      // Ambil ulang supaya stok yang dicetak adalah kondisi terkini.
      const semua = await muatBarang();
      setBarang(semua);

      const rows = semua
        .filter((b) => kategori === SEMUA || (b.kategori || '').trim() === kategori)
        .filter((b) => ikutKosong === 'ya' || (b.stok || 0) !== 0)
        .sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' }));

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
  }, [muatBarang, kategori, ikutKosong, buildPdf, replacePdfUrl]);

  const inputCls =
    'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none';

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)] gap-4 items-start lg:items-stretch overflow-y-auto lg:overflow-hidden">
      {/* ── Kiri: Filter ── */}
      <div className="bg-white rounded-xl shadow p-5 self-start">
        <h2 className="text-base font-bold text-gray-800 mb-4">Laporan Stok</h2>

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
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Stok kosong ikut ditampilkan?
            </label>
            <select
              value={ikutKosong}
              onChange={(e) => setIkutKosong(e.target.value)}
              className={inputCls}
            >
              <option value="ya">Ya</option>
              <option value="tidak">Tidak</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Harga Ditampilkan</label>
            <select
              value={harga}
              onChange={(e) => setHarga(e.target.value as HargaKey)}
              className={inputCls}
            >
              <option value="beli">Harga Beli</option>
              <option value="toko">Harga Jual Toko</option>
              <option value="partai">Harga Jual Partai</option>
              <option value="cabang">Harga Jual Cabang</option>
              <option value="semua">Semua</option>
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
      </div>

      {/* ── Kanan: PDF Viewer ── */}
      <div className="bg-white rounded-xl shadow overflow-hidden min-w-0 h-full min-h-160">
        {pdfUrl ? (
          // Toolbar bawaan PDF viewer browser sudah menyediakan zoom, download & print.
          <iframe
            key={pdfUrl}
            src={pdfUrl}
            className="w-full h-full border-0 block"
            title="Laporan Stok"
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 px-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-14 h-14 mb-3 text-gray-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            {empty && !loading ? (
              <p className="text-sm text-gray-500">Tidak ada barang untuk filter yang dipilih.</p>
            ) : (
              <p className="text-sm">Atur filter di sebelah kiri, lalu klik <strong>Tampilkan</strong>.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
