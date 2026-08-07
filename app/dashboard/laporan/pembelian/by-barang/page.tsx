'use client';

import { useState, useRef, useCallback } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItemBeli {
  barangId: string;
  namaBarang: string;
  satuan: string;
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
  items: ItemBeli[];
  grandTotal: number;
  operator: string;
}

interface BarangAggregate {
  barangId: string;
  namaBarang: string;
  satuan: string;
  totalQty: number;
  totalRupiah: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(Math.round(n));

function toDateInput(d: Date | string) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
}

function todayStr() {
  return toDateInput(new Date());
}

function fmtDate(d: string | Date): string {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtDateShort(d: string | Date): string {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function LaporanPembelianByBarangPage() {
  // Filter state
  const [tipe, setTipe] = useState<string>('semua');
  const [tglCetak, setTglCetak] = useState<string>(todayStr());
  const [tglDari, setTglDari] = useState<string>('');
  const [tglSampai, setTglSampai] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BarangAggregate[]>([]);
  const [shown, setShown] = useState(false);
  const [error, setError] = useState('');

  // Totals
  const [grandQty, setGrandQty] = useState(0);
  const [grandRupiah, setGrandRupiah] = useState(0);

  // PDF state
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>('');
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleTampilkan = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (tipe !== 'semua') params.set('tipe', tipe);
      if (tglDari) params.set('tglDari', tglDari);
      if (tglSampai) params.set('tglSampai', tglSampai);

      const res = await fetch(`/api/transaksi-beli?${params.toString()}`);
      if (!res.ok) throw new Error('Gagal mengambil data');
      const transaksi: TransaksiBeliDoc[] = await res.json();

      // Aggregate by barangId
      const aggMap = new Map<string, BarangAggregate>();
      for (const t of transaksi) {
        for (const item of t.items) {
          if (!item.barangId) continue;
          const existing = aggMap.get(item.barangId);
          if (existing) {
            existing.totalQty += item.qty;
            existing.totalRupiah += item.rupiah;
          } else {
            aggMap.set(item.barangId, {
              barangId: item.barangId,
              namaBarang: item.namaBarang,
              satuan: item.satuan,
              totalQty: item.qty,
              totalRupiah: item.rupiah,
            });
          }
        }
      }

      const aggregated = Array.from(aggMap.values()).sort((a, b) =>
        a.namaBarang.localeCompare(b.namaBarang, 'id')
      );

      setData(aggregated);
      setGrandQty(aggregated.reduce((s, r) => s + r.totalQty, 0));
      setGrandRupiah(aggregated.reduce((s, r) => s + r.totalRupiah, 0));
      setShown(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, [tipe, tglDari, tglSampai]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleGeneratePDF = useCallback(async () => {
    if (!reportRef.current) return;
    setPdfGenerating(true);
    try {
      const origReport = reportRef.current;

      const canvas = await html2canvas(origReport, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone(clonedDoc) {
          // ── Fix: html2canvas can't parse oklch/lab/lch/color() (Tailwind v4) ──
          // 1. Replace unsupported color functions in <style> tags with transparent
          clonedDoc.querySelectorAll('style').forEach((el) => {
            if (el.textContent) {
              el.textContent = el.textContent
                .replace(/(?:oklch|oklab|lab|lch)\([^)]*\)/gi, 'rgba(0,0,0,0)')
                .replace(/color\([^)]*\)/gi, 'rgba(0,0,0,0)');
            }
          });

          // 2. Apply browser-resolved (RGB) colors as !important inline styles
          //    so the cloned elements still look correct despite stripped stylesheets
          const origAll = origReport.querySelectorAll('*');
          const clonedAll = clonedDoc.querySelectorAll('*');
          const len = Math.min(origAll.length, clonedAll.length);
          const colorProps = [
            'color', 'background-color',
            'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
            'outline-color', 'text-decoration-color', 'caret-color', 'column-rule-color',
          ];

          for (let i = 0; i < len; i++) {
            const origEl = origAll[i] as HTMLElement;
            const clonedEl = clonedAll[i] as HTMLElement;
            const cs = window.getComputedStyle(origEl);

            for (const prop of colorProps) {
              const val = cs.getPropertyValue(prop);
              if (val && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent') {
                clonedEl.style.setProperty(prop, val, 'important');
              }
            }

            // Also fix box-shadow which may embed oklch colors
            const shadow = cs.getPropertyValue('box-shadow');
            if (shadow && shadow !== 'none') {
              clonedEl.style.setProperty('box-shadow', shadow, 'important');
            }
          }
        },
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF('p', 'mm', 'a4');
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const blob = pdf.output('blob');
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      setShowPdfViewer(true);
    } catch (err: unknown) {
      console.error('Gagal generate PDF:', err);
    } finally {
      setPdfGenerating(false);
    }
  }, [pdfBlobUrl]);

  const handleDownloadPDF = useCallback(() => {
    if (!pdfBlobUrl) return;
    const a = document.createElement('a');
    a.href = pdfBlobUrl;
    a.download = `Laporan_Pembelian_by_Barang_${tglCetak.replace(/-/g, '')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [pdfBlobUrl, tglCetak]);

  const tipeLabel =
    tipe === 'langsung' ? 'Pembelian Langsung' :
    tipe === 'po' ? 'PO (Purchase Order)' : 'Semua';

  return (
    <div className="space-y-4">
      {/* ── Filter Card ── */}
      <div className="bg-white rounded-xl shadow p-5 print:hidden">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Filter Laporan Pembelian by Barang</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tipe */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipe</label>
            <select
              value={tipe}
              onChange={(e) => setTipe(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              <option value="semua">Semua</option>
              <option value="langsung">Pembelian Langsung</option>
              <option value="po">PO (Purchase Order)</option>
            </select>
          </div>

          {/* Tanggal Cetak */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal Cetak</label>
            <input
              type="date"
              value={tglCetak}
              onChange={(e) => setTglCetak(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
          </div>

          {/* Periode Dari */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Periode Dari</label>
            <input
              type="date"
              value={tglDari}
              onChange={(e) => setTglDari(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
          </div>

          {/* Periode Sampai */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Periode Sampai</label>
            <input
              type="date"
              value={tglSampai}
              onChange={(e) => setTglSampai(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleTampilkan}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2 rounded text-sm font-medium transition"
          >
            {loading ? (
              <span className="flex items-center gap-2">
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
          {shown && data.length > 0 && (
            <>
              <button
                onClick={handlePrint}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded text-sm font-medium transition flex items-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                </svg>
                Cetak
              </button>
              <button
                onClick={handleGeneratePDF}
                disabled={pdfGenerating}
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-6 py-2 rounded text-sm font-medium transition flex items-center gap-1.5"
              >
                {pdfGenerating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generate...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    Lihat PDF
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}
      </div>

      {/* ── PDF Viewer ── */}
      {showPdfViewer && pdfBlobUrl && (
        <div className="bg-white rounded-xl shadow overflow-hidden print:hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-red-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              PDF Preview
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadPDF}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-xs font-medium transition flex items-center gap-1"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download PDF
              </button>
              <button
                onClick={() => setShowPdfViewer(false)}
                className="text-gray-400 hover:text-gray-600 transition p-1"
                title="Tutup"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <iframe
            src={pdfBlobUrl}
            className="w-full border-0"
            style={{ height: '70vh', minHeight: '500px' }}
            title="PDF Preview"
          />
        </div>
      )}

      {/* ── Report (PDF-like printable view) ── */}
      {shown && data.length > 0 && (
        <div ref={reportRef} data-report="pembelian-by-barang" className="bg-white rounded-xl shadow">
          <div className="max-w-[210mm] mx-auto p-6 print:p-0 print:shadow-none print:max-w-none">
            {/* ── Report Header ── */}
            <div className="border-b-2 border-gray-800 pb-3 mb-4 text-center">
              <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide">
                LAPORAN PEMBELIAN BY BARANG
              </h2>
              <div className="text-xs text-gray-600 mt-1 space-x-4">
                <span>Tipe: <strong>{tipeLabel}</strong></span>
                {tglDari && <span>Periode: <strong>{fmtDateShort(tglDari)}</strong></span>}
                {tglSampai && <span>s/d <strong>{fmtDateShort(tglSampai)}</strong></span>}
                {!tglDari && !tglSampai && <span>Periode: <strong>Semua</strong></span>}
              </div>
            </div>

            {/* ── Table ── */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-y-2 border-gray-800">
                    <th className="py-2 px-2 text-left w-8">No</th>
                    <th className="py-2 px-2 text-left">Kode</th>
                    <th className="py-2 px-2 text-left">Nama Barang</th>
                    <th className="py-2 px-2 text-center w-16">Satuan</th>
                    <th className="py-2 px-2 text-right w-20">Qty</th>
                    <th className="py-2 px-2 text-right w-28">Total (Rp)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr key={row.barangId} className="border-b border-gray-300 hover:bg-gray-50 print:hover:bg-transparent">
                      <td className="py-1.5 px-2 text-center">{idx + 1}</td>
                      <td className="py-1.5 px-2 font-mono text-[11px]">{row.barangId}</td>
                      <td className="py-1.5 px-2">{row.namaBarang}</td>
                      <td className="py-1.5 px-2 text-center">{row.satuan}</td>
                      <td className="py-1.5 px-2 text-right">{fmt(row.totalQty)}</td>
                      <td className="py-1.5 px-2 text-right">{fmt(row.totalRupiah)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-800 font-bold bg-gray-100 print:bg-gray-100">
                    <td colSpan={4} className="py-2 px-2 text-right text-sm">TOTAL</td>
                    <td className="py-2 px-2 text-right text-sm">{fmt(grandQty)}</td>
                    <td className="py-2 px-2 text-right text-sm">{fmt(grandRupiah)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* ── Report Footer ── */}
            <div className="border-t-2 border-gray-800 mt-6 pt-3 flex justify-between text-xs text-gray-600">
              <span>Dicetak: {fmtDate(tglCetak)}</span>
              <span>Jumlah Item: {data.length} barang</span>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {shown && data.length === 0 && !loading && (
        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-12 h-12 mx-auto mb-3 text-gray-300">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          <p className="text-sm">Tidak ada data pembelian untuk filter yang dipilih.</p>
        </div>
      )}

      {/* Print-only styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          [data-report="pembelian-by-barang"],
          [data-report="pembelian-by-barang"] * { visibility: visible; }
          [data-report="pembelian-by-barang"] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>
    </div>
  );
}
