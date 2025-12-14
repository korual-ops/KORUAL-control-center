// app.js
// KORUAL CONTROL CENTER – Frontend (Dashboard)
// v1.0 – FULL INTEGRATED
(() => {
  "use strict";

  /* =========================================================
     0) META / BASIC
  ========================================================= */
  const META = window.KORUAL_META_APP || {};
  const API_BASE   = META.api?.baseUrl || "";
  const API_SECRET = META.api?.secret || "";

  if (!API_BASE) {
    console.error("API_BASE not defined");
  }

  const $  = (s, p=document) => p.querySelector(s);
  const $$ = (s, p=document) => Array.from(p.querySelectorAll(s));

  /* =========================================================
     1) SESSION CHECK
  ========================================================= */
  let currentUser = null;
  try {
    const raw = localStorage.getItem("korual_user");
    if (!raw) location.replace("index.html");
    currentUser = JSON.parse(raw);
    if (!currentUser || !currentUser.username) {
      location.replace("index.html");
    }
  } catch (e) {
    location.replace("index.html");
  }

  /* =========================================================
     2) GLOBAL STATE
  ========================================================= */
  const state = {
    pingMs: null,
    lastSync: null,
    dashboard: null,
    tables: {},
  };

  /* =========================================================
     3) UI UTIL
  ========================================================= */
  function showToast(message, type="info", timeout=2600) {
    const root = $("#toastRoot");
    if (!root) return;
    const el = document.createElement("div");
    el.className =
      "pointer-events-auto mb-2 px-4 py-2 rounded-xl text-xs shadow-lg " +
      (type === "error"
        ? "bg-rose-600/90 text-white"
        : type === "success"
        ? "bg-emerald-600/90 text-white"
        : "bg-slate-900/90 text-slate-100");
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(6px)";
      setTimeout(() => el.remove(), 180);
    }, timeout);
  }

  let spinnerCount = 0;
  function showSpinner() {
    const el = $("#globalSpinner");
    if (!el) return;
    spinnerCount++;
    el.classList.remove("hidden");
  }
  function hideSpinner() {
    const el = $("#globalSpinner");
    if (!el) return;
    spinnerCount = Math.max(0, spinnerCount - 1);
    if (spinnerCount === 0) el.classList.add("hidden");
  }

  /* =========================================================
     4) API CLIENT
  ========================================================= */
  async function apiGet(target, params={}) {
    const url = new URL(API_BASE);
    url.searchParams.set("target", target);
    if (API_SECRET) url.searchParams.set("secret", API_SECRET);

    Object.entries(params).forEach(([k,v]) => {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    });

    const t0 = performance.now();
    const res = await fetch(url.toString(), { method: "GET" });
    state.pingMs = Math.round(performance.now() - t0);

    if (!res.ok) throw new Error("HTTP " + res.status);

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); }
    catch { throw new Error("Invalid JSON"); }

    if (json.ok === false) throw new Error(json.message || "API Error");
    return json;
  }

  async function apiPost(body) {
    const t0 = performance.now();
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: API_SECRET || undefined,
        ...body,
      }),
    });
    state.pingMs = Math.round(performance.now() - t0);

    if (!res.ok) throw new Error("HTTP " + res.status);

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); }
    catch { throw new Error("Invalid JSON"); }

    if (json.ok === false) throw new Error(json.message || "API Error");
    return json;
  }

  /* =========================================================
     5) API STATUS (PING)
  ========================================================= */
  async function pingApi() {
    try {
      const res = await apiGet("ping");
      $("#apiStatusText").textContent = "LIVE";
      $("#apiStatusDot").className =
        "inline-block w-2.5 h-2.5 rounded-full bg-emerald-400";
      if ($("#apiPing")) $("#apiPing").textContent = state.pingMs + " ms";
      return res;
    } catch (e) {
      $("#apiStatusText").textContent = "OFFLINE";
      $("#apiStatusDot").className =
        "inline-block w-2.5 h-2.5 rounded-full bg-rose-400";
      showToast("API 연결 실패", "error");
      throw e;
    }
  }

  /* =========================================================
     6) DASHBOARD
  ========================================================= */
  function formatCurrency(v) {
    if (v == null || isNaN(Number(v))) return "-";
    return Number(v).toLocaleString("ko-KR") + "원";
  }

  async function loadDashboard() {
    try {
      const res = await apiGet("dashboard");
      const d = res.data || {};
      state.dashboard = d;

      $("#cardTotalProducts").textContent = d.totals?.products ?? "-";
      $("#cardTotalOrders").textContent   = d.totals?.orders ?? "-";
      $("#cardTotalMembers").textContent  = d.totals?.members ?? "-";
      $("#cardTotalRevenue").textContent  =
        d.totals?.revenue != null ? formatCurrency(d.totals.revenue) : "-";

      $("#todayOrders").textContent  = d.today?.orders ?? "-";
      $("#todayRevenue").textContent =
        d.today?.revenue != null ? formatCurrency(d.today.revenue) : "-";
      $("#todayPending").textContent = d.today?.pending ?? "-";

      renderRecentOrders(d.recentOrders || []);
      state.lastSync = new Date();
      updateLastSync();
    } catch (e) {
      console.error(e);
      showToast("대시보드 로딩 실패", "error");
    }
  }

  function renderRecentOrders(rows) {
    const tbody = $("#recentOrdersBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (!rows.length) {
      tbody.innerHTML =
        `<tr><td colspan="7" class="text-center text-slate-500 py-6">데이터 없음</td></tr>`;
      return;
    }
    rows.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.orderDate || ""}</td>
        <td>${r.orderNo || ""}</td>
        <td>${r.productName || ""}</td>
        <td class="text-right">${r.qty ?? ""}</td>
        <td class="text-right">${formatCurrency(r.amount)}</td>
        <td>${r.channel || ""}</td>
        <td>${r.status || ""}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function updateLastSync() {
    const el = $("#lastSyncLabel");
    if (!el || !state.lastSync) return;
    const d = state.lastSync;
    el.textContent =
      "마지막 동기화 " +
      String(d.getHours()).padStart(2,"0") + ":" +
      String(d.getMinutes()).padStart(2,"0");
  }

  /* =========================================================
     7) TABLE LOADER (CRUD)
  ========================================================= */
  async function loadTable(sheet, tbodyId, pagerId, searchInputId, columns) {
    const tbody = $("#" + tbodyId);
    const pager = $("#" + pagerId);
    const searchInput = searchInputId ? $("#" + searchInputId) : null;

    const paging = { page: 1, pageSize: 50, q: "" };

    async function fetchRender() {
      tbody.innerHTML =
        `<tr><td colspan="${columns.length}" class="text-center py-6 text-slate-500">로딩중…</td></tr>`;
      try {
        const res = await apiGet(sheet.toLowerCase(), {
          page: paging.page,
          pageSize: paging.pageSize,
          q: paging.q,
        });
        const d = res.data || {};
        renderRows(d.rows || []);
        renderPager(d.page, d.pageSize, d.total);
        state.lastSync = new Date();
        updateLastSync();
      } catch (e) {
        console.error(e);
        tbody.innerHTML =
          `<tr><td colspan="${columns.length}" class="text-center py-6 text-rose-400">로드 실패</td></tr>`;
      }
    }

    function renderRows(rows) {
      tbody.innerHTML = "";
      if (!rows.length) {
        tbody.innerHTML =
          `<tr><td colspan="${columns.length}" class="text-center py-6 text-slate-500">데이터 없음</td></tr>`;
        return;
      }
      rows.forEach((row, idx) => {
        const tr = document.createElement("tr");
        columns.forEach(col => {
          const td = document.createElement("td");
          let val = row[col.key];
          if (col.format === "currency") val = formatCurrency(val);
          td.textContent = val ?? "";
          tr.appendChild(td);
        });

        if (columns.some(c => c.type === "manage")) {
          const td = document.createElement("td");
          td.className = "text-center";
          const btn = document.createElement("button");
          btn.className = "px-2 py-1 text-xs rounded bg-slate-800";
          btn.textContent = "관리";
          btn.onclick = () => {
            window.KORUAL_MODAL?.openEdit({
              sheet,
              rowIndex: row._row || idx+2,
              data: row,
            });
          };
          td.appendChild(btn);
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      });
    }

    function renderPager(page, size, total) {
      if (!pager) return;
      pager.textContent =
        total ? `${(page-1)*size+1}–${Math.min(total,page*size)} / ${total}` : "";
    }

    if (searchInput) {
      let t = null;
      searchInput.addEventListener("input", () => {
        paging.q = searchInput.value.trim();
        paging.page = 1;
        clearTimeout(t);
        t = setTimeout(fetchRender, 250);
      });
    }

    fetchRender();
    return { reload: fetchRender };
  }

  /* =========================================================
     8) NAV / TOPBAR
  ========================================================= */
  function initTopbar() {
    $("#btnLogout")?.addEventListener("click", () => {
      localStorage.removeItem("korual_user");
      location.replace("index.html");
    });
    const u = $("#welcomeUser");
    if (u) u.textContent = currentUser.username;
  }

  /* =========================================================
     9) INIT
  ========================================================= */
  async function init() {
    showSpinner();
    try {
      initTopbar();
      await pingApi();
      await loadDashboard();

      // 테이블 초기화 예시
      state.tables.orders = await loadTable(
        "ORDERS",
        "ordersBody",
        "ordersPager",
        "searchOrders",
        [
          { key: "orderNo" },
          { key: "orderDate" },
          { key: "productName" },
          { key: "qty" },
          { key: "amount", format: "currency" },
          { key: "status" },
          { type: "manage" },
        ]
      );

      // board.js 연동
      if (window.KORUAL_BOARD?.init) {
        window.KORUAL_BOARD.init({
          apiGet,
          apiPost,
          toast: showToast,
          spinner: (v)=>v?showSpinner():hideSpinner(),
        });
      }

    } catch (e) {
      console.error(e);
    } finally {
      hideSpinner();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
