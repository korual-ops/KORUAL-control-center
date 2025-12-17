// app.js
// KORUAL CONTROL CENTER – Dashboard Frontend (Full)
// - dashboard.html 전용
// - auth.js는 index.html 전용 (로그인 처리)

(function () {
  "use strict";

  // =========================
  // META / CONFIG
  // =========================
  const META = window.KORUAL_META_APP || {};
  const API_BASE = META.api?.baseUrl || "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec";
  const API_SECRET = META.api?.secret || "KORUAL-ONLY";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = {
    pingMs: null,
    lastSync: null,
  };

  // =========================
  // AUTH GUARD (dashboard only)
  // =========================
  function requireAuthOrRedirect() {
    try {
      const raw = localStorage.getItem("korual_user");
      if (!raw) {
        location.replace("index.html");
        return false;
      }
      const user = JSON.parse(raw);
      if (!user || !user.username) {
        localStorage.removeItem("korual_user");
        location.replace("index.html");
        return false;
      }
      return true;
    } catch (e) {
      localStorage.removeItem("korual_user");
      location.replace("index.html");
      return false;
    }
  }

  // =========================
  // TOAST
  // =========================
  function showToast(message, type = "info", timeout = 2500) {
    const root = $("#toastRoot");
    if (!root) return;

    const wrap = document.createElement("div");
    wrap.className =
      "pointer-events-auto inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs shadow-lg mb-2 " +
      (type === "error"
        ? "border-rose-500/70 bg-rose-950/80 text-rose-100"
        : type === "success"
        ? "border-emerald-400/70 bg-emerald-900/80 text-emerald-100"
        : "border-slate-700/80 bg-slate-900/90 text-slate-100");

    const span = document.createElement("span");
    span.textContent = message;
    wrap.appendChild(span);

    root.appendChild(wrap);
    setTimeout(() => {
      wrap.style.opacity = "0";
      wrap.style.transform = "translateY(4px)";
      setTimeout(() => wrap.remove(), 180);
    }, timeout);
  }

  // =========================
  // GLOBAL SPINNER
  // =========================
  let spinnerCount = 0;
  function showSpinner() {
    const el = $("#globalSpinner");
    if (!el) return;
    spinnerCount += 1;
    el.classList.remove("hidden");
  }
  function hideSpinner() {
    const el = $("#globalSpinner");
    if (!el) return;
    spinnerCount = Math.max(0, spinnerCount - 1);
    if (spinnerCount === 0) el.classList.add("hidden");
  }

  // =========================
  // API CLIENT
  // =========================
  async function apiGet(target, params = {}) {
    if (!API_BASE) throw new Error("API URL이 설정되지 않았습니다.");

    const url = new URL(API_BASE);
    url.searchParams.set("target", String(target));
    if (API_SECRET) url.searchParams.set("secret", API_SECRET);

    Object.keys(params).forEach((k) => {
      const v = params[k];
      if (v === undefined || v === null || v === "") return;
      url.searchParams.set(k, String(v));
    });

    const started = performance.now();
    const res = await fetch(url.toString(), { method: "GET", headers: { Accept: "application/json" } });
    state.pingMs = Math.round(performance.now() - started);

    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error("JSON 파싱 오류", text);
      throw new Error("API 응답이 JSON 형식이 아닙니다.");
    }

    if (!res.ok) throw new Error("HTTP " + res.status);
    if (json.ok === false) throw new Error(json.message || "API 오류");

    return json;
  }

  async function apiPost(body) {
    if (!API_BASE) throw new Error("API URL이 설정되지 않았습니다.");

    const started = performance.now();
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ secret: API_SECRET || undefined, ...body }),
    });
    state.pingMs = Math.round(performance.now() - started);

    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error("JSON 파싱 오류", text);
      throw new Error("API 응답이 JSON 형식이 아닙니다.");
    }

    if (!res.ok) throw new Error("HTTP " + res.status);
    if (json.ok === false) throw new Error(json.message || "API 오류");

    return json;
  }

  // =========================
  // API STATUS (top bar)
  // =========================
  function updateApiStatus(ok, message) {
    const dot = $("#apiStatusDot");
    const text = $("#apiStatusText");
    const pingEl = $("#apiPing");

    if (dot && text) {
      if (ok) {
        dot.className =
          "status-dot inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.35)]";
        text.textContent = message || "정상 연결";
      } else {
        dot.className =
          "status-dot inline-block w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_0_4px_rgba(248,113,113,0.35)]";
        text.textContent = message || "연결 실패";
      }
    }

    if (pingEl && state.pingMs != null) pingEl.textContent = state.pingMs + " ms";
  }

  async function pingApi() {
    try {
      const res = await apiGet("ping");
      updateApiStatus(true, "LIVE " + (res.version || ""));
      return res;
    } catch (err) {
      console.error(err);
      updateApiStatus(false, "Ping 실패");
      showToast("API 연결에 실패했습니다.", "error");
      throw err;
    }
  }

  // =========================
  // DATE / FORMAT
  // =========================
  function formatDateLabel(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const day = dayNames[date.getDay()];
    return `${y}-${m}-${d} (${day})`;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function formatCurrency(value) {
    if (value == null || isNaN(Number(value))) return "-";
    return Number(value).toLocaleString("ko-KR") + "원";
  }

  function updateLastSyncLabel() {
    const el = $("#last-sync");
    if (!el) return;
    if (!state.lastSync) {
      el.textContent = "마지막 동기화 대기 중…";
      return;
    }
    const d = state.lastSync;
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    el.textContent = `마지막 동기화 ${hh}:${mm}`;
  }

  // =========================
  // DASHBOARD
  // =========================
  async function loadDashboard() {
    const todayLabelEl = $("#todayDateLabel");
    if (todayLabelEl) todayLabelEl.textContent = formatDateLabel();

    try {
      const res = await apiGet("dashboard");
      const d = res.data || {};

      const totals = d.totals || {};
      setText("cardTotalProducts", totals.products ?? "-");
      setText("cardTotalOrders", totals.orders ?? "-");
      setText("cardTotalMembers", totals.members ?? "-");
      setText("cardTotalRevenue", totals.revenue != null ? formatCurrency(totals.revenue) : "-");

      const today = d.today || {};
      setText("todayOrders", today.orders ?? "-");
      setText("todayRevenue", today.revenue != null ? formatCurrency(today.revenue) : "-");
      setText("todayPending", today.pending ?? "-");

      renderRecentOrders(d.recentOrders || []);

      state.lastSync = new Date();
      updateLastSyncLabel();
    } catch (err) {
      console.error(err);
      showToast("대시보드 데이터를 불러오지 못했습니다.", "error");
    }
  }

  function renderRecentOrders(rows) {
    const tbody = $("#recentOrdersBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!rows.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 7;
      td.className = "empty-state px-3 py-6 text-center text-slate-500";
      td.textContent = "최근 주문 데이터가 없습니다.";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    rows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.className =
        "border-b border-slate-800/70 last:border-b-0 hover:bg-slate-900/70 transition-colors";

      const cells = [
        row.orderDate || row.date || "",
        row.orderNo || row.orderNumber || "",
        row.productName || "",
        row.qty != null ? String(row.qty) : "",
        row.amount != null ? formatCurrency(row.amount) : "",
        row.channel || "",
        row.status || "",
      ];

      cells.forEach((val, idx) => {
        const td = document.createElement("td");
        td.className = "px-2 py-1.5" + (idx === 3 || idx === 4 ? " text-right" : " text-left");
        td.textContent = val;
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }

  // =========================
  // TABLE LOADER (list endpoints)
  // =========================
  async function loadEntityTable(options) {
    const {
      entity,
      target,   // GET target: products/orders/members/stock/logs (lowercase)
      sheetKey, // POST key: PRODUCTS/ORDERS/... (uppercase sheet name)
      tbodyId,
      pagerId,
      searchInputId,
      columns,
    } = options;

    const tbody = document.getElementById(tbodyId);
    const pager = document.getElementById(pagerId);
    const searchInput = searchInputId ? document.getElementById(searchInputId) : null;
    if (!tbody) return;

    const paging = { page: 1, pageSize: 50, q: "" };

    async function fetchAndRender() {
      tbody.innerHTML = `
        <tr>
          <td colspan="${columns.length}" class="empty-state px-3 py-6 text-center text-slate-500">
            데이터를 불러오는 중입니다…
          </td>
        </tr>
      `;

      try {
        const res = await apiGet(target, {
          page: paging.page,
          pageSize: paging.pageSize,
          q: paging.q,
        });

        const data = res.data || {};
        const rows = data.rows || data.items || [];
        const page = data.page || paging.page;
        const pageSize = data.pageSize || paging.pageSize;
        const total = data.total ?? rows.length;

        paging.page = page;
        paging.pageSize = pageSize;

        renderTableRows(rows);
        updatePager(page, pageSize, total);

        state.lastSync = new Date();
        updateLastSyncLabel();
      } catch (err) {
        console.error(err);
        tbody.innerHTML = `
          <tr>
            <td colspan="${columns.length}" class="empty-state px-3 py-6 text-center text-rose-400">
              데이터를 불러오지 못했습니다.
            </td>
          </tr>
        `;
      }
    }

    function renderTableRows(rows) {
      tbody.innerHTML = "";

      if (!rows.length) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = columns.length;
        td.className = "empty-state px-3 py-6 text-center text-slate-500";
        td.textContent = "데이터가 없습니다.";
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }

      const manageCol = columns.find((c) => c.type === "manage");

      rows.forEach((row, idx) => {
        const tr = document.createElement("tr");
        tr.className =
          "border-b border-slate-800/70 last:border-b-0 hover:bg-slate-900/70 transition-colors";

        columns.forEach((col) => {
          if (col.type === "manage") return;

          const td = document.createElement("td");
          td.className = "px-2 py-1.5 " + (col.align === "right" ? "text-right" : "text-left");
          let value = row[col.key];

          if (col.format === "currency") value = formatCurrency(value);
          else if (col.format === "date") value = value || "";
          else if (value == null) value = "";

          td.textContent = value;
          tr.appendChild(td);
        });

        if (manageCol) {
          const td = document.createElement("td");
          td.className = "px-2 py-1.5 text-center";

          const btnEdit = document.createElement("button");
          btnEdit.type = "button";
          btnEdit.className =
            "inline-flex items-center px-2 py-0.5 rounded-full border border-slate-600/80 text-[10px] text-slate-200 bg-slate-900/80 mr-1";
          btnEdit.textContent = "수정";
          btnEdit.addEventListener("click", () => {
            window.KORUAL_MODAL?.openEdit?.({
              entity,
              sheetKey,
              rowIndex: row._row || row.rowIndex || idx + 2,
              data: row,
            });
          });

          const btnDel = document.createElement("button");
          btnDel.type = "button";
          btnDel.className =
            "inline-flex items-center px-2 py-0.5 rounded-full border border-rose-500/70 text-[10px] text-rose-200 bg-rose-950/70";
          btnDel.textContent = "삭제";
          btnDel.addEventListener("click", () => {
            window.KORUAL_MODAL?.openDelete?.({
              entity,
              sheetKey,
              rowIndex: row._row || row.rowIndex || idx + 2,
              title: row[manageCol.titleKey || ""] || "",
            });
          });

          td.appendChild(btnEdit);
          td.appendChild(btnDel);
          tr.appendChild(td);
        }

        tbody.appendChild(tr);
      });
    }

    function updatePager(page, pageSize, total) {
      if (!pager) return;
      const label = pager.querySelector("[data-page-label]");
      if (!label) return;

      const start = (page - 1) * pageSize + 1;
      const end = Math.min(total, page * pageSize);
      label.textContent = total ? `${start}–${end} / ${total}` : `${page} 페이지`;
    }

    if (pager) {
      pager.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-page]");
        if (!btn) return;
        const dir = btn.dataset.page;
        if (dir === "prev") paging.page = Math.max(1, paging.page - 1);
        if (dir === "next") paging.page = paging.page + 1;
        fetchAndRender();
      });
    }

    if (searchInput) {
      let timer = null;
      searchInput.addEventListener("input", () => {
        paging.q = searchInput.value.trim();
        paging.page = 1;
        clearTimeout(timer);
        timer = setTimeout(fetchAndRender, 250);
      });
    }

    await fetchAndRender();

    return { reload: fetchAndRender, state: paging };
  }

  function initTables() {
    loadEntityTable({
      entity: "products",
      target: "products",
      sheetKey: "PRODUCTS",
      tbodyId: "productsBody",
      pagerId: "productsPager",
      searchInputId: "searchProducts",
      columns: [
        { key: "productCode" },
        { key: "productName" },
        { key: "optionName" },
        { key: "price", align: "right", format: "currency" },
        { key: "stock", align: "right" },
        { key: "channel" },
      ],
    });

    loadEntityTable({
      entity: "orders",
      target: "orders",
      sheetKey: "ORDERS",
      tbodyId: "ordersBody",
      pagerId: "ordersPager",
      searchInputId: "searchOrders",
      columns: [
        { key: "memberNo" },
        { key: "date" },
        { key: "orderNo" },
        { key: "customerName" },
        { key: "productName" },
        { key: "qty", align: "right" },
        { key: "amount", align: "right", format: "currency" },
        { key: "status" },
        { key: "channel" },
      ],
    });

    loadEntityTable({
      entity: "members",
      target: "members",
      sheetKey: "MEMBERS",
      tbodyId: "membersBody",
      pagerId: "membersPager",
      searchInputId: "searchMembers",
      columns: [
        { key: "memberNo" },
        { key: "name" },
        { key: "phone" },
        { key: "email" },
        { key: "joinedAt" },
        { key: "channel" },
        { key: "grade" },
        { key: "totalSales", align: "right", format: "currency" },
        { key: "point", align: "right" },
        { key: "lastOrderAt" },
        { key: "memo" },
        { type: "manage", titleKey: "name" },
      ],
    });

    loadEntityTable({
      entity: "stock",
      target: "stock",
      sheetKey: "STOCK",
      tbodyId: "stockBody",
      pagerId: "stockPager",
      searchInputId: "searchStock",
      columns: [
        { key: "productCode" },
        { key: "productName" },
        { key: "currentStock", align: "right" },
        { key: "safetyStock", align: "right" },
        { key: "status" },
        { key: "warehouse" },
        { key: "channel" },
        { type: "manage", titleKey: "productName" },
      ],
    });

    loadEntityTable({
      entity: "logs",
      target: "logs",
      sheetKey: "LOGS",
      tbodyId: "logsBody",
      pagerId: "logsPager",
      searchInputId: "searchLogs",
      columns: [
        { key: "time" },
        { key: "type" },
        { key: "message" },
        { key: "detail" },
      ],
    });
  }

  // =========================
  // THEME TOGGLE
  // =========================
  function initThemeToggle() {
    const btn = $("#themeToggle");
    const label = btn?.querySelector(".theme-toggle-label");
    const thumb = btn?.querySelector(".theme-toggle-thumb");
    const body = document.body;
    if (!btn || !label || !thumb || !body) return;

    const saved = localStorage.getItem("korual_theme");
    if (saved === "light") {
      body.classList.remove("theme-dark");
      body.classList.add("theme-light", "bg-slate-50", "text-slate-900");
      label.textContent = label.dataset.light || "Light";
      thumb.style.transform = "translateX(1.5rem)";
    } else {
      body.classList.add("theme-dark");
      label.textContent = label.dataset.dark || "Dark";
      thumb.style.transform = "translateX(0.25rem)";
    }

    btn.addEventListener("click", () => {
      const isDark = body.classList.contains("theme-dark");
      if (isDark) {
        body.classList.remove("theme-dark");
        body.classList.add("theme-light", "bg-slate-50", "text-slate-900");
        localStorage.setItem("korual_theme", "light");
        label.textContent = label.dataset.light || "Light";
        thumb.style.transform = "translateX(1.5rem)";
      } else {
        body.classList.remove("theme-light", "bg-slate-50", "text-slate-900");
        body.classList.add("theme-dark");
        localStorage.setItem("korual_theme", "dark");
        label.textContent = label.dataset.dark || "Dark";
        thumb.style.transform = "translateX(0.25rem)";
      }
    });
  }

  // =========================
  // NAVIGATION
  // =========================
  function initNavigation() {
    const links = $$(".nav-link");
    const sections = $$(".section");

    links.forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.section;
        links.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        sections.forEach((sec) => {
          if (sec.id === "section-" + target) {
            sec.classList.remove("hidden");
            sec.classList.add("active");
          } else {
            sec.classList.add("hidden");
            sec.classList.remove("active");
          }
        });
      });
    });

    const goOrders = $("#goOrders");
    if (goOrders) {
      goOrders.addEventListener("click", () => {
        const ordersBtn = $('.nav-link[data-section="orders"]');
        if (ordersBtn) ordersBtn.click();
      });
    }
  }

  // =========================
  // TOPBAR
  // =========================
  function initTopbar() {
    const btnRefresh = $("#btnRefreshAll");
    const btnLogout = $("#btnLogout");
    const menuToggle = $("#menuToggle");
    const sidebar = $(".sidebar");
    const backdrop = $("#sidebarBackdrop");

    if (btnRefresh) {
      btnRefresh.addEventListener("click", async () => {
        showSpinner();
        try {
          await pingApi();
          await loadDashboard();
          initTables();
          showToast("전체 데이터를 새로 불러왔습니다.", "success");
        } catch (_) {
        } finally {
          hideSpinner();
        }
      });
    }

    if (btnLogout) {
      btnLogout.addEventListener("click", () => {
        localStorage.removeItem("korual_user");
        location.replace("index.html");
      });
    }

    if (menuToggle && sidebar && backdrop) {
      const closeSidebar = () => {
        sidebar.classList.add("hidden");
        backdrop.classList.add("hidden");
      };
      const openSidebar = () => {
        sidebar.classList.remove("hidden");
        backdrop.classList.remove("hidden");
      };

      menuToggle.addEventListener("click", () => {
        const isHidden = sidebar.classList.contains("hidden");
        if (isHidden) openSidebar();
        else closeSidebar();
      });

      backdrop.addEventListener("click", closeSidebar);
    }

    try {
      const raw = localStorage.getItem("korual_user");
      if (raw) {
        const user = JSON.parse(raw);
        if (user?.username) {
          const el = $("#welcomeUser");
          if (el) el.textContent = user.username;
        }
      }
    } catch (e) {}
  }

  // =========================
  // MODAL ACTIONS (requires modal.js providing window.KORUAL_MODAL)
  // =========================
  function initModalActions() {
    const btnSave = $("#rowEditSave");
    const btnDel = $("#rowDeleteConfirm");

    if (btnSave) {
      btnSave.addEventListener("click", async () => {
        const sheetKey = btnSave.dataset.sheetKey; // ex) "MEMBERS"
        const rowIndex = Number(btnSave.dataset.rowIndex || "0");
        const fieldsWrap = $("#rowEditFields");
        if (!sheetKey || !rowIndex || !fieldsWrap) return;

        const inputs = $$("input[data-field-key]", fieldsWrap);
        const rowObject = {};
        inputs.forEach((input) => {
          const key = input.dataset.fieldKey;
          rowObject[key] = input.value ?? "";
        });

        showSpinner();
        try {
          await apiPost({
            target: "updateRow",
            key: sheetKey,
            row: rowIndex,
            rowObject,
          });
          showToast("수정이 저장되었습니다.", "success");
          window.KORUAL_MODAL?.closeAll?.();
        } catch (err) {
          console.error(err);
          showToast("저장 중 오류가 발생했습니다.", "error");
        } finally {
          hideSpinner();
        }
      });
    }

    if (btnDel) {
      btnDel.addEventListener("click", async () => {
        const sheetKey = btnDel.dataset.sheetKey;
        const rowIndex = Number(btnDel.dataset.rowIndex || "0");
        if (!sheetKey || !rowIndex) return;

        showSpinner();
        try {
          await apiPost({
            target: "deleteRow",
            key: sheetKey,
            row: rowIndex,
          });
          showToast("행이 삭제되었습니다.", "success");
          window.KORUAL_MODAL?.closeAll?.();
        } catch (err) {
          console.error(err);
          showToast("삭제 중 오류가 발생했습니다.", "error");
        } finally {
          hideSpinner();
        }
      });
    }
  }

  // =========================
  // INIT
  // =========================
  async function init() {
    if (!requireAuthOrRedirect()) return;

    showSpinner();
    try {
      initNavigation();
      initThemeToggle();
      initTopbar();
      initModalActions();

      await pingApi();
      await loadDashboard();
      initTables();
    } catch (_) {
    } finally {
      hideSpinner();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
