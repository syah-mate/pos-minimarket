// Single source of truth for receipt layout/business formatting.
// Produces an ordered list of transport-agnostic "ops". Each transport
// (USB via @node-escpos, BLE via raw ESC/POS bytes) renders the SAME ops,
// so formatting is defined once and never duplicated per transport.
//
// Op shapes:
//   { op: "align",    v: "lt" | "ct" | "rt" }
//   { op: "style",    bold: boolean }
//   { op: "size",     w: 0|1, h: 0|1 }
//   { op: "text",     s: string }          // one line, printer appends LF
//   { op: "feed",     n: number }          // n blank lines
//   { op: "cut" }
//   { op: "cashdraw", pin: number }

const WIDTH = 32; // characters per line for 58mm thermal
const rp = (n) => "Rp" + Number(n || 0).toLocaleString("id-ID");

// left/right justified within WIDTH
function lr(left, right) {
  const pad = Math.max(1, WIDTH - left.length - right.length);
  return left + " ".repeat(pad) + right;
}

function buildReceiptOps(data = {}) {
  const ops = [];
  const line = "-".repeat(WIDTH);
  const store = {
    name: process.env.STORE_NAME,
    address: process.env.STORE_ADDRESS,
    phone: process.env.STORE_PHONE,
    ...(data.store || {}),
  };

  ops.push({ op: "align", v: "ct" });
  if (store.name) {
    ops.push({ op: "style", bold: true }, { op: "size", w: 1, h: 1 });
    ops.push({ op: "text", s: store.name });
    ops.push({ op: "size", w: 0, h: 0 }, { op: "style", bold: false });
  }
  if (store.address) ops.push({ op: "text", s: store.address });
  if (store.phone) ops.push({ op: "text", s: store.phone });
  ops.push({ op: "text", s: line });

  ops.push({ op: "align", v: "lt" });
  if (data.invoiceNo) ops.push({ op: "text", s: "No   : " + data.invoiceNo });
  if (data.date) ops.push({ op: "text", s: "Tgl  : " + data.date });
  if (data.cashier) ops.push({ op: "text", s: "Kasir: " + data.cashier });
  ops.push({ op: "text", s: line });

  for (const it of data.items || []) {
    ops.push({ op: "text", s: it.name });
    ops.push({ op: "text", s: lr(`  ${it.qty} x ${rp(it.price)}`, rp(it.total)) });
  }
  ops.push({ op: "text", s: line });

  const row = (label, val) => ops.push({ op: "text", s: lr(label, rp(val)) });
  if (data.subtotal != null) row("Subtotal", data.subtotal);
  if (data.discount) row("Diskon", -Math.abs(data.discount));
  if (data.tax) row("PPN", data.tax);
  ops.push({ op: "style", bold: true });
  row("TOTAL", data.total);
  ops.push({ op: "style", bold: false });
  if (data.paid != null) row("Bayar", data.paid);
  if (data.change != null) row("Kembali", data.change);

  ops.push({ op: "text", s: line });
  ops.push({ op: "align", v: "ct" });
  ops.push({ op: "text", s: data.footer || "Terima kasih" });
  ops.push({ op: "feed", n: 1 });

  if (data.openDrawer) ops.push({ op: "cashdraw", pin: 2 });
  ops.push({ op: "cut" });
  return ops;
}

// Standalone diagnostic receipt (Task 17). No transaction/customer data.
function buildTestOps() {
  const line = "-".repeat(WIDTH);
  return [
    { op: "align", v: "ct" },
    { op: "style", bold: true }, { op: "size", w: 1, h: 1 },
    { op: "text", s: "RPP02N" },
    { op: "size", w: 0, h: 0 }, { op: "style", bold: false },
    { op: "text", s: "EPPOS EP58 PLUS" },
    { op: "text", s: line },
    { op: "text", s: "Bluetooth BLE OK" },
    { op: "text", s: "ESC/POS OK" },
    { op: "text", s: line },
    { op: "text", s: "TEST PRINT" },
    { op: "text", s: line },
    { op: "feed", n: 1 },
    { op: "cut" },
  ];
}

module.exports = { buildReceiptOps, buildTestOps, WIDTH };
