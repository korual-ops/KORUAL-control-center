// app.js (dashboard.html 전용)
(function () {
  "use strict";

  const META = window.KORUAL_META_APP || {};
  const API_BASE = META.api?.baseUrl || "";
  const API_SECRET = META.api?.secret || "";
  const STORAGE_KEY = META.auth?.storageKey || "korual_user";

  const $ = (s) => document.querySelector(s);

  // ---- Auth guard ----
  function getUser() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }
  function requireAuth() {
    const u = getUser();
    if (!u || !u.username) location.replace("index.html");
    return u;
  }
  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    location.replace("index.html");
  }

  // ---- API helpers ----
  async function apiGet(target, params = {}) {
    const url = new URL(API_BASE, location.origin);
    url.searchParams.set("target", target);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
    const res = await fetch(url.toString(), { method: "GET" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data?.message || "API GET failed");
    return data;
  }

  async function apiPost(payload) {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, secret: API_SECRET }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data?.message || "API POST failed");
    return data;
  }

  // ---- Minimal modal (built-in) ----
  function ensureModal() {
    let root = $("#korualModalRoot");
    if (root) return root;

    root = document.createElement("div");
    root.id = "korualModalRoot";
    root.className = "fixed inset-0 z-50 hidden items-center justify-center bg-slate-950/60 backdrop-blur-sm px-4";
    root.innerHTML = `
      <div class="w-full max-w-2xl rounded-2xl border border-slate-700/80 bg-slate-950/95 shadow-[0_24px_70px_rgba(15,23,42,0.98)] p-5 relative">
        <button id="korualModalClose" class="absolute right-3 top-3 text-slate-400 hover:text-slate-100" type="button">✕</button>
        <h3 id="korualModalTitle" class="text-sm font-semibold mb-3 text-slate-100">Edit</h3>
        <div id="korualModalBody" class="space-y-3"></div>
        <div class="mt-4 flex items-center justify-end gap-2">
          <button id="korualModalDelete" class="px-3 py-2 rounded-xl border border-rose-500/50 text-rose-300 hover:bg-rose-500/10" type="button">삭제</button>
          <button id="korualModalSave" class="px-3 py-2 rounded-xl bg-sky-500/90 text-slate-950 font-semibold hover:bg-sky-400" type="button">저장</button>
        </div>
        <p id="korualModalMsg" class="mt-2 text-xs text-rose-300 min-h-[1rem]"></p>
      </div>
    `;
    document.body.appendChild(root);

    $("#korualModalClose").addEventListener("click", closeModal);
    root.addEventListener("click", (e) => { if (e.target === root) closeModal(); });

    return root;
  }

  let modalState = null;

  function openModal({ title, sheetKey, rowIndex, rowObject }) {
    const root = ensureModal();
    $("#korualModalTitle").textContent = title || "Edit row";
    $("#korualModalMsg").textContent = "";
    const body = $("#korualModalBody");
    body.innerHTML = "";

    const keys = Object.keys(rowObject || {}).filter(k => k !== "_row");
    const fields = {};

    keys.forEach((k) => {
      const wrap = document.createElement("div");
      wrap.className = "grid grid-cols-1 sm:grid-cols-[180px,1fr] gap-2 items-center";
      wrap.innerHTML = `
        <div class="text-xs text-slate-300 break-all">${escapeHtml(k)}</div>
        <input class="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/70 text-slate-100 text-sm outline-none focus:border-sky-400"
               value="${escapeHtml(String(rowObject[k] ?? ""))}" />
      `;
      const input = wrap.querySelector("input");
      fields[k] = input;
      body.appendChild(wrap);
    });

    modalState = { sheetKey, rowIndex, fields };

    $("#korualModalSave").onclick = async () => {
      $("#korualModalMsg").textContent = "";
      try {
        const rowObject = {};
        Object.keys(fields).forEach((k) => (rowObject[k] = fields[k].value));
        await apiPost({ target: "updateRow", key: sheetKey, row: rowIndex, rowObject });
        closeModal();
        await reloadCurrentTable();
      } catch (e) {
        $("#korualModalMsg").textContent = e.message || "저장 실패";
      }
    };

    $("#korualModalDelete").onclick = async () => {
      $("#korualModalMsg").textContent = "";
      try {
        await apiPost({ target: "deleteRow", key: sheetKey, row: rowIndex });
        closeModal();
        await reloadCurrentTable();
      } catch (e) {
        $("#korualModalMsg").textContent = e.message || "삭제 실패";
      }
    };

    root.classList.remove("hidden");
    root.classList.add("flex");
  }

  function closeModal() {
    const root = $("#korualModalRoot");
    if (!root) return;
    root.classList.add("hidden");
    root.classList.remove("flex");
    modalState = null;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ---- Dashboard ----
  async function loadDashboard() {
    const data = await apiGet("dashboard");
    const d = data.data || {};

    // 네가 쓰는 dashboard.html에 맞춰 id를 연결하면 됨
    setText("#kpiProducts", d.totals?.products ?? "-");
    setText("#kpiOrders", d.totals?.orders ?? "-");
    setText("#kpiMembers", d.totals?.members ?? "-");
    setText("#kpiRevenue", formatNumber(d.totals?.revenue ?? 0));

    setText("#todayOrders", d.today?.orders ?? "-");
    setText("#todayRevenue", formatNumber(d.today?.revenue ?? 0));
    setText("#todayPending", d.today?.pending ?? "-");

    renderRecentOrders(d.recentOrders || []);
  }

  function setText(sel, v) {
    const el = $(sel);
    if (el) el.textContent = String(v);
  }

  function formatNumber(n) {
    const x = Number(n || 0);
    return isNaN(x) ? "0" : x.toLocaleString("ko-KR");
  }

  function renderRecentOrders(rows) {
    const root = $("#recentOrders");
    if (!root) return;
    root.innerHTML = "";

    rows.forEach((r) => {
      const item = document.createElement("div");
      item.className = "flex items-center justify-between gap-3 rounded-xl border border-slate-800/70 bg-slate-950/60 px-3 py-2";
      item.innerHTML = `
        <div class="min-w-0">
          <div class="text-xs text-slate-300">${escapeHtml(r.orderDate || "")} · ${escapeHtml(r.orderNo || "")}</div>
          <div class="text-sm text-slate-100 truncate">${escapeHtml(r.productName || "")}</div>
        </div>
        <div class="text-right">
          <div class="text-xs text-slate-400">${escapeHtml(r.channel || "")} · ${escapeHtml(r.status || "")}</div>
          <div class="text-sm font-semibold text-sky-200">${formatNumber(r.amount || 0)}</div>
        </div>
      `;
      root.appendChild(item);
    });

    if (!rows.length) {
      root.innerHTML = `<div class="text-xs text-slate-500 px-2 py-6">최근 주문이 없습니다.</div>`;
    }
  }

  // ---- Entity table ----
  let current = { key: "PRODUCTS", target: "products", page: 1, size: 50, q: "" };

  async function loadEntityTable({ target, key, page = 1, size = 50, q = "" }) {
    current = { target, key, page, size, q };

    const data = await apiGet(target, { page, size, q });
    const payload = data.data || {};
    const rows = payload.rows || payload.data?.rows || payload.rows || payload.data || payload; // 방어적
    const list = payload.rows || rows || [];

    renderTable(key, list);
    renderPager(payload);
  }

  function renderTable(sheetKey, rows) {
    const tableRoot = $("#entityTable");
    if (!tableRoot) return;

    const cols = rows.length ? Object.keys(rows[0]).filter(k => k !== "_row") : [];
    const head = `
      <thead>
        <tr class="text-left text-xs text-slate-400">
          <th class="py-2 px-2">Actions</th>
          ${cols.map(c => `<th class="py-2 px-2">${escapeHtml(c)}</th>`).join("")}
        </tr>
      </thead>
    `;

    const body = `
      <tbody>
        ${rows.map(r => {
          const rowIndex = r._row;
          const cells = cols.map(c => `<td class="py-2 px-2 text-xs text-slate-200 max-w-[280px] truncate">${escapeHtml(r[c])}</td>`).join("");
          return `
            <tr class="border-t border-slate-800/70 hover:bg-slate-900/40">
              <td class="py-2 px-2">
                <button class="korualEdit px-2 py-1 rounded-lg border border-slate-700 text-xs text-slate-200 hover:border-sky-400"
                        data-key="${escapeHtml(sheetKey)}"
                        data-row="${rowIndex}">
                  Edit
                </button>
              </td>
              ${cells}
            </tr>
          `;
        }).join("")}
      </tbody>
    `;

    tableRoot.innerHTML = `
      <div class="overflow-auto rounded-2xl border border-slate-800/70 bg-slate-950/40">
        <table class="min-w-full">${head}${body}</table>
      </div>
    `;

    tableRoot.querySelectorAll(".korualEdit").forEach(btn => {
      btn.addEventListener("click", () => {
        const rowIndex = Number(btn.getAttribute("data-row"));
        const rowObj = rows.find(x => Number(x._row) === rowIndex) || {};
        openModal({
          title: `${sheetKey} · row ${rowIndex}`,
          sheetKey,
          rowIndex,
          rowObject: rowObj
        });
      });
    });

    if (!rows.length) {
      tableRoot.innerHTML = `<div class="text-xs text-slate-500 px-2 py-10">데이터가 없습니다.</div>`;
    }
  }

  function renderPager(payload) {
    const pager = $("#entityPager");
    if (!pager) return;

    const page = payload.page || current.page;
    const pageCount = payload.pageCount || 1;

    pager.innerHTML = `
      <div class="flex items-center justify-between gap-2 text-xs text-slate-400">
        <div>Page ${page} / ${pageCount}</div>
        <div class="flex gap-2">
          <button id="pgPrev" class="px-3 py-2 rounded-xl border border-slate-700 hover:border-sky-400">Prev</button>
          <button id="pgNext" class="px-3 py-2 rounded-xl border border-slate-700 hover:border-sky-400">Next</button>
        </div>
      </div>
    `;

    $("#pgPrev").onclick = () => {
      if (page <= 1) return;
      loadEntityTable({ ...current, page: page - 1 });
    };
    $("#pgNext").onclick = () => {
      if (page >= pageCount) return;
      loadEntityTable({ ...current, page: page + 1 });
    };
  }

  async function reloadCurrentTable() {
    return loadEntityTable(current);
  }

  // ---- Wire UI ----
  function wireNav() {
    // 너 dashboard.html에서 버튼 id를 아래처럼 맞추면 바로 작동
    bind("#navDashboard", async () => { await loadDashboard(); });
    bind("#navProducts", () => loadEntityTable({ target: "products", key: "PRODUCTS" }));
    bind("#navOrders",   () => loadEntityTable({ target: "orders",   key: "ORDERS" }));
    bind("#navMembers",  () => loadEntityTable({ target: "members",  key: "MEMBERS" }));
    bind("#navStock",    () => loadEntityTable({ target: "stock",    key: "STOCK" }));
    bind("#navLogs",     () => loadEntityTable({ target: "logs",     key: "LOGS" }));

    bind("#btnLogout", logout);

    function bind(sel, fn) {
      const el = $(sel);
      if (!el) return;
      el.addEventListener("click", fn);
    }
  }

  async function boot() {
    const user = requireAuth();
    setText("#currentUser", user.displayName || user.username || "KORUAL");

    wireNav();

    // 최초 로딩: 대시보드 + 기본 테이블(제품)
    try { await loadDashboard(); } catch (e) { console.error(e); }
    try { await loadEntityTable({ target: "products", key: "PRODUCTS" }); } catch (e) { console.error(e); }
  }

  boot();
})();
window.KORUAL_MODAL.open({
  title: `${sheetKey} · row ${rowIndex}`,
  sub: "Table edit",
  sheetKey,
  rowIndex,
  rowObject: rowObj,
  onSave: async ({ sheetKey, rowIndex, rowObject }) => {
    await apiPost({ target: "updateRow", key: sheetKey, row: rowIndex, rowObject });
    await reloadCurrentTable();
  },
  onDelete: async ({ sheetKey, rowIndex }) => {
    await apiPost({ target: "deleteRow", key: sheetKey, row: rowIndex });
    await reloadCurrentTable();
    window.KORUAL_BOARD?.reload?.();

  },
});


