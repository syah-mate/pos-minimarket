import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import * as XLSX from "xlsx";

const HEADERS = [
  "kode", "nama", "alamat", "telp", "tglLahir",
  "pekerjaan", "maxPiutang", "saldoPiutang", "diskonPenjualan", "noNpwp",
];

const SAMPLE = [
  "PLG001", "Budi Santoso", "Jl. Merdeka No. 123, Jakarta", "081234567890", "1990-05-15",
  "Karyawan Swasta", "5000000", "0", "5", "12.345.678.9-000.000",
];

export async function GET() {
  const auth = await requireRole(['admin', 'kasir']);
  if (!auth.ok) return auth.response;

  const wb = XLSX.utils.book_new();

  // Sheet 1: Data
  const wsData = XLSX.utils.aoa_to_sheet([HEADERS, SAMPLE]);
  wsData["!cols"] = HEADERS.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, wsData, "Data Pelanggan");

  // Sheet 2: Panduan
  const panduan = [
    ["PANDUAN IMPORT DATA PELANGGAN"],
    [""],
    ["Kolom", "Keterangan", "Contoh / Pilihan"],
    ["kode", "Kode unik pelanggan (wajib, huruf kapital)", "PLG001"],
    ["nama", "Nama pelanggan (wajib)", "Budi Santoso"],
    ["alamat", "Alamat lengkap", "Jl. Merdeka No. 123"],
    ["telp", "Nomor telepon", "081234567890"],
    ["tglLahir", "Tanggal lahir (YYYY-MM-DD)", "1990-05-15"],
    ["pekerjaan", "Pekerjaan", "Karyawan Swasta"],
    ["maxPiutang", "Maksimum piutang (angka)", "5000000"],
    ["saldoPiutang", "Saldo piutang saat ini (angka)", "0"],
    ["diskonPenjualan", "Diskon penjualan dalam % (0-100)", "5"],
    ["noNpwp", "Nomor NPWP", "12.345.678.9-000.000"],
  ];

  const wsPanduan = XLSX.utils.aoa_to_sheet(panduan);
  wsPanduan["!cols"] = [
    { wch: 18 }, { wch: 60 }, { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsPanduan, "Panduan");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-import-pelanggan.xlsx"',
    },
  });
}
