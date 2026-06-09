'use client';

import { useState, useRef, DragEvent } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportResult {
  total: number;
  success: number;
  skipped: number;
  errors: string[];
  message?: string;
}

interface ImportModalProps {
  title?: string;
  importUrl?: string;
  templateUrl?: string;
  onClose: () => void;
  onImportSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ImportModal({ title = 'IMPORT DATA', importUrl = '/api/barang/import', templateUrl = '/api/barang/template', onClose, onImportSuccess }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    setError('');
    setResult(null);
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      setError('Format file tidak didukung. Gunakan .xlsx atau .xls.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('Ukuran file terlalu besar. Maksimal 10MB.');
      return;
    }
    setFile(f);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    setError('');
    setResult(null);
    try {
      const formData = new FormData();
      // Use Blob with correct MIME type so the server can validate
      const blob = new Blob([file], { type: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      formData.append('file', blob, file.name);

      // Read as ArrayBuffer and send raw
      const arrayBuffer = await file.arrayBuffer();
      const res = await fetch(importUrl, {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
        body: arrayBuffer,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Gagal mengimport');
      setResult(data);
      if (data.success > 0) {
        onImportSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengimport data');
    } finally {
      setImporting(false);
    }
  }

  async function handleDownloadTemplate() {
    try {
      const res = await fetch(templateUrl);
      if (!res.ok) throw new Error('Gagal mendownload template');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template-import-barang.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError('Gagal mendownload template');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-blue-700 text-white px-4 py-2.5 rounded-t-lg flex items-center justify-between shrink-0">
          <span className="font-bold text-sm">{title}</span>
          <button onClick={onClose} className="text-white/80 hover:text-white text-lg leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-4 overflow-auto">
          {/* Download template */}
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded px-3 py-2.5">
            <span className="text-xs text-blue-800 font-medium">1. Download template Excel</span>
            <button
              onClick={handleDownloadTemplate}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded"
            >
              <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Template
            </button>
          </div>

          {/* Upload area */}
          <div>
            <span className="text-xs text-gray-600 font-medium block mb-1.5">2. Upload file Excel yang sudah diisi</span>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg px-4 py-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-blue-400 bg-blue-50'
                  : file
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-300 hover:border-blue-300 bg-gray-50'
              }`}
            >
              {file ? (
                <div className="flex flex-col items-center gap-1">
                  <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-green-700">{file.name}</span>
                  <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="text-xs text-red-500 hover:text-red-600 underline mt-1"
                  >
                    Hapus & pilih ulang
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm text-gray-500">Drop file di sini atau klik untuk pilih</span>
                  <span className="text-xs text-gray-400">Format: .xlsx, .xls — Maks. 10MB</span>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded">
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded px-3 py-2.5 text-xs">
              <p className="font-semibold text-green-800 mb-1">Hasil Import:</p>
              <div className="flex gap-4 text-green-700">
                <span>Total: <strong>{result.total}</strong></span>
                <span>Sukses: <strong>{result.success}</strong></span>
                <span>Dilewati: <strong>{result.skipped}</strong></span>
              </div>
              {result.errors.length > 0 && (
                <div className="mt-2 max-h-32 overflow-auto">
                  <p className="text-red-600 font-medium mb-1">Error ({result.errors.length}):</p>
                  <ul className="list-disc list-inside text-red-500 space-y-0.5">
                    {result.errors.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-gray-200 bg-gray-50 rounded-b-lg shrink-0">
          <button
            onClick={onClose}
            className="text-xs text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-100"
          >
            Batal
          </button>
          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-medium px-4 py-1.5 rounded ml-auto flex items-center gap-1.5"
          >
            {importing ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Mengimport...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Import
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
