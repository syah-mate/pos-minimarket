// Layar kasir offline. Hanya Jual Toko tunai; semua data lewat window.offlineAPI
// (SQLite di main process). Harga dihitung ulang di main process saat simpan —
// angka di sini hanya tampilan.
(function () {
  const api = window.offlineAPI;
  const $ = (id) => document.getElementById(id);
  const rp = (n) => "Rp" + Math.round(Number(n) || 0).toLocaleString("id-ID");

  let cart = []; // { barang, qty }
  let results = [];
  let activeResult = -1;
  let saving = false;

  // ── util ──────────────────────────────────────────────────────────────────

  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.add("hidden"), 3000);
  }

  function showError(id, msg) {
    const el = $(id);
    el.textContent = msg || "";
    el.classList.toggle("hidden", !msg);
  }

  function lineOf(b, qty) {
    const discRp = Math.round(qty * b.harga * ((b.diskon || 0) / 100));
    return { discRp, subtotal: Math.max(0, qty * b.harga - discRp) };
  }

  function grandTotal() {
    return cart.reduce((s, r) => s + lineOf(r.barang, r.qty).subtotal, 0);
  }

  function parsePaid() {
    return Number(String($("paid").value).replace(/[^\d]/g, "")) || 0;
  }

  // ── status header ─────────────────────────────────────────────────────────

  function renderStatus(s) {
    const badge = $("modeBadge");
    const canGoOnline = s.online && !s.needLogin;
    badge.textContent = canGoOnline ? "SERVER TERSEDIA" : "MODE OFFLINE";
    badge.classList.toggle("ok", canGoOnline);
    $("btnOnline").disabled = !s.online;

    const parts = [`Terminal ${s.terminalId}`];
    parts.push(s.pending ? `${s.pending} transaksi belum sinkron (${rp(s.pendingTotal)})` : "Semua transaksi tersinkron");
    if (s.needLogin) parts.push("login online diperlukan untuk sinkron");
    else if (s.lastError && s.pending) parts.push(s.lastError);
    $("queueInfo").textContent = parts.join(" · ");

    const warn = $("catalogWarn");
    if (!s.count) {
      warn.textContent = "Katalog barang offline masih kosong. Login online sekali saat internet tersedia supaya katalog terunduh.";
      warn.classList.remove("hidden");
    } else {
      const at = s.catalogAt ? new Date(s.catalogAt).toLocaleString("id-ID") : "-";
      warn.textContent = `Katalog offline: ${s.count} barang, diperbarui ${at}. Harga & stok mengikuti data terakhir ini.`;
      warn.classList.remove("hidden");
    }
  }

  async function renderRecent() {
    const rows = await api.recent();
    const box = $("recent");
    box.textContent = "";
    for (const r of rows) {
      const div = document.createElement("div");
      const left = document.createElement("span");
      left.textContent = `${r.ref_no} · ${rp(r.grand_total)}`;
      const right = document.createElement("span");
      right.className = r.status === "synced" ? "st-synced" : "st-pending";
      right.textContent = r.status === "synced" ? "tersinkron" : "antre";
      if (r.last_error && r.status !== "synced") right.title = r.last_error;
      div.append(left, right);
      box.append(div);
    }
  }

  // ── keranjang ─────────────────────────────────────────────────────────────

  function addToCart(b) {
    const existing = cart.find((r) => r.barang.id === b.id);
    if (existing) existing.qty += 1;
    else cart.push({ barang: b, qty: 1 });
    renderCart();
  }

  function renderCart() {
    const body = $("cartBody");
    body.textContent = "";
    cart.forEach((r, i) => {
      const { discRp, subtotal } = lineOf(r.barang, r.qty);
      const tr = document.createElement("tr");
      const cells = [
        String(i + 1),
        `${r.barang.nama}`,
        null,
        rp(r.barang.harga),
        discRp ? rp(discRp) : "-",
        rp(subtotal),
      ];
      cells.forEach((text, c) => {
        const td = document.createElement("td");
        if (c >= 2) td.className = "num";
        if (c === 1) {
          td.textContent = text;
          const small = document.createElement("div");
          small.style.cssText = "color:#64748b;font-size:12px";
          small.textContent = `${r.barang.kode} · stok ${r.barang.stok} ${r.barang.satuan}`;
          td.append(small);
        } else if (c === 2) {
          const inp = document.createElement("input");
          inp.className = "qty";
          inp.type = "number";
          inp.min = "1";
          inp.value = String(r.qty);
          inp.addEventListener("change", () => {
            const q = Number(inp.value);
            r.qty = Number.isFinite(q) && q > 0 ? q : 1;
            renderCart();
          });
          td.append(inp);
        } else {
          td.textContent = text;
        }
        tr.append(td);
      });
      const tdDel = document.createElement("td");
      const del = document.createElement("button");
      del.className = "btn-danger";
      del.textContent = "Hapus";
      del.style.padding = "4px 8px";
      del.addEventListener("click", () => {
        cart.splice(i, 1);
        renderCart();
      });
      tdDel.append(del);
      tr.append(tdDel);
      body.append(tr);
    });
    $("cartEmpty").classList.toggle("hidden", cart.length > 0);
    $("itemCount").textContent = cart.length ? `${cart.reduce((s, r) => s + r.qty, 0)} item` : "";
    $("total").textContent = rp(grandTotal());
    renderChange();
  }

  function renderChange() {
    const paid = parsePaid();
    const change = paid - grandTotal();
    $("change").textContent = paid ? rp(Math.max(0, change)) : "Rp0";
    $("change").style.color = paid && change < 0 ? "#b91c1c" : "";
  }

  // ── pencarian ─────────────────────────────────────────────────────────────

  function closeResults() {
    results = [];
    activeResult = -1;
    $("results").classList.add("hidden");
  }

  function renderResults() {
    const box = $("results");
    box.textContent = "";
    if (results.length === 0) {
      const d = document.createElement("div");
      d.textContent = "Barang tidak ditemukan di katalog offline";
      box.append(d);
    }
    results.forEach((b, i) => {
      const d = document.createElement("div");
      if (i === activeResult) d.className = "active";
      const left = document.createElement("span");
      left.textContent = b.nama + " ";
      const small = document.createElement("small");
      small.textContent = `${b.kode} · stok ${b.stok}`;
      left.append(small);
      const right = document.createElement("span");
      right.textContent = rp(b.harga);
      d.append(left, right);
      d.addEventListener("mousedown", (e) => {
        e.preventDefault();
        pickResult(i);
      });
      box.append(d);
    });
    box.classList.remove("hidden");
  }

  function pickResult(i) {
    const b = results[i];
    if (!b) return;
    addToCart(b);
    closeResults();
    $("scan").value = "";
    $("scan").focus();
  }

  async function onScanEnter() {
    const q = $("scan").value.trim();
    if (!q) return;
    if (activeResult >= 0 && results[activeResult]) return pickResult(activeResult);
    // Scanner barcode mengetik lalu Enter — coba cocok persis dulu.
    const exact = await api.find(q);
    if (exact) {
      addToCart(exact);
      $("scan").value = "";
      closeResults();
      return;
    }
    results = await api.search(q);
    activeResult = results.length ? 0 : -1;
    if (results.length === 1) return pickResult(0);
    renderResults();
  }

  let searchTimer = null;
  function onScanInput() {
    clearTimeout(searchTimer);
    const q = $("scan").value.trim();
    if (q.length < 2) return closeResults();
    searchTimer = setTimeout(async () => {
      results = await api.search(q);
      activeResult = results.length ? 0 : -1;
      renderResults();
    }, 200);
  }

  // ── simpan ────────────────────────────────────────────────────────────────

  async function save() {
    if (saving) return;
    showError("saleError", "");
    if (cart.length === 0) return showError("saleError", "Minimal 1 item barang harus diisi.");
    const total = grandTotal();
    const paid = parsePaid();
    if (paid < total) {
      $("paid").focus();
      return showError("saleError", "Jumlah bayar kurang dari total.");
    }
    saving = true;
    $("btnSave").disabled = true;
    try {
      const res = await api.saveSale({
        items: cart.map((r) => ({ id: r.barang.id, qty: r.qty })),
        paid,
        print: true,
      });
      if (res.error) return showError("saleError", res.error);

      // Transaksi SUDAH tersimpan di SQLite. Gagal cetak tidak membatalkannya.
      const printed = await api.print(res.receipt);
      if (printed && printed.error) {
        if (confirm(`Transaksi ${res.refNo} tersimpan, tetapi struk gagal dicetak:\n${printed.error}\n\nCoba cetak ulang?`)) {
          await api.print(res.receipt);
        }
      }
      toast(`Tersimpan ${res.refNo} · kembali ${rp(res.change)}`);
      cart = [];
      $("paid").value = "";
      renderCart();
      renderRecent();
      renderStatus(await api.status());
      $("scan").focus();
    } finally {
      saving = false;
      $("btnSave").disabled = false;
    }
  }

  // ── login ─────────────────────────────────────────────────────────────────

  function showKasir(user) {
    $("login").classList.add("hidden");
    $("kasir").classList.remove("hidden");
    $("btnLogout").classList.remove("hidden");
    $("userInfo").textContent = `Kasir: ${user.name}`;
    renderCart();
    renderRecent();
    $("scan").focus();
  }

  function showLogin() {
    $("kasir").classList.add("hidden");
    $("btnLogout").classList.add("hidden");
    $("userInfo").textContent = "";
    $("login").classList.remove("hidden");
    $("username").focus();
  }

  $("login").addEventListener("submit", async (e) => {
    e.preventDefault();
    showError("loginError", "");
    const res = await api.login($("username").value, $("password").value);
    if (res.error) return showError("loginError", res.error);
    $("password").value = "";
    showKasir(res.user);
  });

  // ── event ─────────────────────────────────────────────────────────────────

  $("scan").addEventListener("input", onScanInput);
  $("scan").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onScanEnter();
    } else if (e.key === "ArrowDown" && results.length) {
      e.preventDefault();
      activeResult = Math.min(results.length - 1, activeResult + 1);
      renderResults();
    } else if (e.key === "ArrowUp" && results.length) {
      e.preventDefault();
      activeResult = Math.max(0, activeResult - 1);
      renderResults();
    } else if (e.key === "Escape") {
      closeResults();
    }
  });
  $("scan").addEventListener("blur", () => setTimeout(closeResults, 150));

  $("paid").addEventListener("input", () => {
    const n = parsePaid();
    $("paid").value = n ? n.toLocaleString("id-ID") : "";
    renderChange();
  });
  $("paid").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      save();
    }
  });

  $("btnExact").addEventListener("click", () => {
    const t = grandTotal();
    $("paid").value = t ? t.toLocaleString("id-ID") : "";
    renderChange();
    $("paid").focus();
  });
  $("btnClear").addEventListener("click", () => {
    if (cart.length && !confirm("Kosongkan keranjang?")) return;
    cart = [];
    $("paid").value = "";
    renderCart();
    $("scan").focus();
  });
  $("btnSave").addEventListener("click", save);

  $("btnSync").addEventListener("click", async () => {
    $("btnSync").disabled = true;
    try {
      const s = await api.syncNow();
      renderStatus(s);
      renderRecent();
      toast(s.online ? (s.needLogin ? "Server tersedia, tetapi perlu login online." : "Sinkron selesai.") : "Server belum terjangkau.");
    } finally {
      $("btnSync").disabled = false;
    }
  });
  $("btnOnline").addEventListener("click", () => {
    if (cart.length && !confirm("Keranjang belum disimpan dan akan hilang. Lanjut ke mode online?")) return;
    api.goOnline();
  });
  $("btnLogout").addEventListener("click", async () => {
    if (cart.length && !confirm("Keranjang belum disimpan. Tetap keluar?")) return;
    await api.logout();
    cart = [];
    showLogin();
  });

  document.addEventListener("keydown", (e) => {
    if ($("kasir").classList.contains("hidden")) return;
    if (e.key === "F2") {
      e.preventDefault();
      $("scan").focus();
    } else if (e.key === "F8") {
      e.preventDefault();
      if (document.activeElement === $("paid")) save();
      else $("paid").focus();
    }
  });

  api.onStatus((s) => {
    renderStatus(s);
    renderRecent();
  });

  // ── init ──────────────────────────────────────────────────────────────────

  (async function init() {
    renderStatus(await api.status());
    const { user } = await api.session();
    if (user) showKasir(user);
    else showLogin();
  })();
})();
