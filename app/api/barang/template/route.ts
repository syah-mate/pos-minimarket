import { NextResponse } from "next/server";
import { requireRole } from "@/lib/authz";
import * as XLSX from "xlsx";

// Column headers & sample row matching BarangInput fields
const HEADERS = [
  "kode", "barcode", "nama", "kategori", "subKategori",
  "hasExpired", "expired", "satuanBeli", "satuanJual", "isi",
  "hargaBeli", "hargaJualToko", "hargaJualPartai", "hargaJualCabang",
  "stok", "stokMinimum", "stokMaksimum", "lokasi", "diskon",
  "pointMember", "pointKaryawan", "tglBeli", "supplier",
];

const SAMPLE = [
  "BRG001", "", "Indomie Goreng", "MAKANAN", "MIE INSTAN",
  "FALSE", "", "DOS", "PCS", "40",
  "105000", "3500", "3300", "3400",
  "0", "10", "100", "RAK-A1", "0",
  "1", "0", "2026-01-15", "PT Indofood",
];

export async function GET() {
  const auth = await requireRole(['admin', 'kasir']);
  if (!auth.ok) return auth.response;

  // Build workbook
  const wb = XLSX.utils.book_new();

  // Sheet 1: Data (headers + 1 sample row)
  const wsData = XLSX.utils.aoa_to_sheet([HEADERS, SAMPLE]);

  // Set column widths
  wsData["!cols"] = HEADERS.map(() => ({ wch: 16 }));

  XLSX.utils.book_append_sheet(wb, wsData, "Data Barang");

  // Sheet 2: Panduan
  const panduan = [
    ["PANDUAN IMPORT DATA BARANG"],
    [""],
    ["Kolom", "Keterangan", "Contoh / Pilihan"],
    ["kode", "Kode unik barang (wajib, huruf kapital)", "BRG001"],
    ["barcode", "Barcode (opsional)", ""],
    ["nama", "Nama barang (wajib)", "Indomie Goreng"],
    ["kategori", "Kategori barang", "MAKANAN, MINUMAN, SEMBAKO, SNACK, HERBAL, ROKOK, KEBERSIHAN, KESEHATAN, KOSMETIK, ALAT TULIS, LAINNYA"],
    ["subKategori", "Sub kategori", "MIE INSTAN"],
    ["hasExpired", "Punya expired? TRUE/FALSE", "TRUE / FALSE"],
    ["expired", "Tanggal expired (YYYY-MM-DD)", "2026-12-31"],
    ["satuanBeli", "Satuan beli", "DOS, PCS, BTL, KG, LITER, dll"],
    ["satuanJual", "Satuan jual", "PCS, BTL, KG, GR, dll"],
    ["isi", "Isi per satuan beli (angka)", "40"],
    ["hargaBeli", "Harga beli per satuan beli", "105000"],
    ["hargaJualToko", "Harga jual toko / eceran", "3500"],
    ["hargaJualPartai", "Harga jual partai / grosir", "3300"],
    ["hargaJualCabang", "Harga jual cabang", "3400"],
    ["stok", "Stok awal", "0"],
    ["stokMinimum", "Stok minimum (warning)", "10"],
    ["stokMaksimum", "Stok maksimum (warning)", "100"],
    ["lokasi", "Lokasi penyimpanan", "RAK-A1"],
    ["diskon", "Diskon (%)", "0"],
    ["pointMember", "Point untuk member", "1"],
    ["pointKaryawan", "Point untuk karyawan", "0"],
    ["tglBeli", "Tanggal beli (YYYY-MM-DD)", "2026-01-15"],
    ["supplier", "Nama supplier", "PT Indofood"],
  ];

  const wsPanduan = XLSX.utils.aoa_to_sheet(panduan);
  wsPanduan["!cols"] = [
    { wch: 16 }, { wch: 60 }, { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsPanduan, "Panduan");

  // Write buffer
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-import-barang.xlsx"',
    },
  });
}
