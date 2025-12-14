// app.js
// KORUAL CONTROL CENTER – Frontend (Dashboard Full Integrated)
// - Session guard (korual_user)
// - API client (GET/POST)
// - Ping / Dashboard cards / Recent orders
// - Navigation / Theme toggle / Topbar actions
// - Entity tables (Products/Orders/Members/Stock/Logs) with search + pager
// - CRUD Modals (Edit/Delete) auto-injected if not present
// - DnD: table-row drag reorder UI (client-side) + optional "status dropzone" for ORDERS
// - Optional automation trigger button (btnRunAutomation)

(function () {
  "use strict";

  const META = window.KORUAL_META_APP || {};
  const API_BASE = META.api?.baseUrl || "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec";
  const API_SECRET = META.api?.secret || "KORUAL-ONLY";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = {
    pingMs: null,
    lastSync: null,
    user: null,
    tables: {}, // key -> { reload, state }
  };

  // =========================
  // Session guard
  // =========================
  function requireAuth_() {
    try {
      const raw = localStorage.getItem("korual_user");
      if (!raw) throw new Error("no-session");
      const user = JSON.parse(raw);
      if (!user || !user.username) throw new Error("bad-session");
      state.user = user;
      return true;
    } catch (_) {
      location.replace("index.html");
      return false;
    }
  }

  if (!requireAuth_()) return;

  // =========================
  // Toast
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
  // Global spinner
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
  // API client
  // =========================
  async function apiGet(target, params = {}) {
    if (!API_BASE) throw new Error("API URL 미설정");

    const url = new URL(API_BASE);
    url.searchParams.set("target", target);
    if (API_SECRET) url.searchParams.set("secret", API_SECRET);

    Object.keys(params).forEach((k) => {
      const v = params[k];
      if (v === undefined || v === null || v === "") return;
      url.searchParams.set(k, String(v));
    });

    const started = performance.now();
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    state.pingMs = Math.round(performance.now() - started);

    if (!res.ok) throw new Error("HTTP " + res.status);

    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error("JSON 파싱 오류", text);
      throw new Error("API 응답이 JSON 형식이 아닙니다.");
    }

    if (json.ok === false) throw new Error(json.message || "API 오류");
    return json;
  }

  async function apiPost(body) {
    if (!API_BASE) throw new Error("API URL 미설정");

    const started = performance.now();
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        secret: API_SECRET || undefined,
        ...body,
      }),
    });
    state.pingMs = Math.round(performance.now() - started);

    if (!res.ok) throw new Error("HTTP " + res.status);

    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error("JSON 파싱 오류", text);
      throw new Error("API 응답이 JSON 형식이 아닙니다.");
    }

    if (json.ok === false) throw new Error(json.message || "API 오류");
    return json;
  }

  // =========================
  // API Status UI
  // =========================
  function updateApiStatus(ok, message) {
    const dot = $("#apiStatusDot");
    const text = $("#apiStatusText");
    const pingEl = $("#apiPing");

    if (dot) {
      dot.className =
        "status-dot inline-block w-2.5 h-2.5 rounded-full " +
        (ok
          ? "bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.35)]"
          : "bg-rose-400 shadow-[0_0_0_4px_rgba(248,113,113,0.35)]");
    }
    if (text) text.textContent = message || (ok ? "정상 연결" : "연결 실패");
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
  // Date / formatting
  // =========================
  function formatDateLabel(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    const day = dayNames[date.getDay()];
    return `${y}-${m}-${d} (${day})`;
  }

  function formatCurrency(value) {
    if (value == null || isNaN(Number(value))) return "-";
    return Number(value).toLocaleString("ko-KR") + "원";
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
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
  // Dashboard loader
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
  // Theme toggle
  // =========================
  function initThemeToggle() {
    const btn = $("#themeToggle");
    const label = btn?.querySelector(".theme-toggle-label");
    const thumb = btn?.querySelector(".theme-toggle-thumb");
    const body = document.body;
    if (!btn || !body) return;

    function apply(theme) {
      if (theme === "light") {
        body.classList.remove("theme-dark");
        body.classList.add("theme-light", "bg-slate-50", "text-slate-900");
        if (label) label.textContent = label.dataset.light || "Light";
        if (thumb) thumb.style.transform = "translateX(1.5rem)";
        localStorage.setItem("korual_theme", "light");
      } else {
        body.classList.remove("theme-light", "bg-slate-50", "text-slate-900");
        body.classList.add("theme-dark");
        if (label) label.textContent = label.dataset.dark || "Dark";
        if (thumb) thumb.style.transform = "translateX(0.25rem)";
        localStorage.setItem("korual_theme", "dark");
      }
    }

    const saved = localStorage.getItem("korual_theme");
    apply(saved === "light" ? "light" : "dark");

    btn.addEventListener("click", () => {
      const isDark = body.classList.contains("theme-dark");
      apply(isDark ? "light" : "dark");
    });
  }

  // =========================
  // Navigation
  // =========================
  function initNavigation() {
    const links = $$(".nav-link");
    const sections = $$(".section");
    if (!links.length || !sections.length) return;

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
  // Topbar
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
          await reloadAllTables();
          showToast("전체 데이터를 새로 불러왔습니다.", "success");
        } catch (_) {
          // pingApi에서 처리
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
      function closeSidebar() {
        sidebar.classList.add("hidden");
        backdrop.classList.add("hidden");
      }
      function openSidebar() {
        sidebar.classList.remove("hidden");
        backdrop.classList.remove("hidden");
      }
      menuToggle.addEventListener("click", () => {
        const isHidden = sidebar.classList.contains("hidden");
        if (isHidden) openSidebar();
        else closeSidebar();
      });
      backdrop.addEventListener("click", closeSidebar);
    }

    const el = $("#welcomeUser");
    if (el && state.user?.username) el.textContent = state.user.username;

    const btnRunAutomation = $("#btnRunAutomation");
    if (btnRunAutomation) {
      btnRunAutomation.addEventListener("click", async () => {
        showSpinner();
        try {
          await apiPost({ target: "runAutomation" }); // 백엔드에 없으면 에러. 필요 시 code.gs에 추가.
          showToast("자동화 실행 완료", "success");
          await loadDashboard();
          await reloadAllTables();
        } catch (e) {
          console.error(e);
          showToast("자동화 실행 실패 (API에 runAutomation 미구현 가능)", "error");
        } finally {
          hideSpinner();
        }
      });
    }
  }

  // =========================
  // CRUD Modal (auto inject)
  // =========================
  function ensureCrudModals() {
    if (!$("#korualModalRoot")) {
      const root = document.createElement("div");
      root.id = "korualModalRoot";
      root.innerHTML = `
        <div id="korualBackdrop" class="hidden fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm"></div>

        <div id="korualEditModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="w-full max-w-2xl rounded-2xl border border-slate-700/80 bg-slate-950/95 shadow-[0_24px_70px_rgba(15,23,42,0.98)] overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 border-b border-slate-800/80">
              <div>
                <div class="text-xs text-slate-400">Edit</div>
                <div id="korualEditTitle" class="text-sm font-semibold text-slate-100">행 수정</div>
              </div>
              <button id="korualCloseAll" class="text-slate-400 hover:text-slate-100 text-sm" type="button">✕</button>
            </div>
            <div class="px-5 py-4">
              <div id="korualEditMeta" class="text-xs text-slate-400 mb-3"></div>
              <div id="korualEditFields" class="grid grid-cols-1 md:grid-cols-2 gap-3"></div>
            </div>
            <div class="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-800/80 bg-slate-950/70">
              <button id="korualEditCancel" class="px-3 py-2 rounded-xl border border-slate-700/80 text-xs text-slate-200 bg-slate-900/70" type="button">취소</button>
              <button id="korualEditSave" class="px-3 py-2 rounded-xl border border-emerald-400/50 text-xs text-emerald-100 bg-emerald-950/60" type="button">저장</button>
            </div>
          </div>
        </div>

        <div id="korualDeleteModal" class="hidden fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="w-full max-w-md rounded-2xl border border-rose-500/40 bg-slate-950/95 shadow-[0_24px_70px_rgba(15,23,42,0.98)] overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 border-b border-slate-800/80">
              <div>
                <div class="text-xs text-rose-300">Delete</div>
                <div class="text-sm font-semibold text-slate-100">행 삭제</div>
              </div>
              <button class="korualCloseAll text-slate-400 hover:text-slate-100 text-sm" type="button">✕</button>
            </div>
            <div class="px-5 py-4">
              <div id="korualDeleteText" class="text-sm text-slate-200"></div>
              <div id="korualDeleteMeta" class="text-xs text-slate-400 mt-2"></div>
            </div>
            <div class="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-800/80 bg-slate-950/70">
              <button class="korualCloseAll px-3 py-2 rounded-xl border border-slate-700/80 text-xs text-slate-200 bg-slate-900/70" type="button">취소</button>
              <button id="korualDeleteConfirm" class="px-3 py-2 rounded-xl border border-rose-500/60 text-xs text-rose-100 bg-rose-950/60" type="button">삭제</button>
            </div>
          </div>
        </div>

        <div id="korualStatusDock" class="hidden fixed left-1/2 -translate-x-1/2 bottom-6 z-50">
          <div class="flex items-center gap-2 rounded-2xl border border-slate-700/70 bg-slate-950/90 px-3 py-2 shadow-[0_18px_50px_rgba(15,23,42,0.95)]">
            <div class="text-[11px] text-slate-300 mr-1">Drop to set status</div>
            <div class="korualStatusZone px-2 py-1 rounded-xl border border-slate-700/70 text-[11px] text-slate-200" data-status="준비중">준비중</div>
            <div class="korualStatusZone px-2 py-1 rounded-xl border border-slate-700/70 text-[11px] text-slate-200" data-status="배송중">배송중</div>
            <div class="korualStatusZone px-2 py-1 rounded-xl border border-slate-700/70 text-[11px] text-slate-200" data-status="완료">완료</div>
            <div class="korualStatusZone px-2 py-1 rounded-xl border border-slate-700/70 text-[11px] text-slate-200" data-status="취소">취소</div>
          </div>
        </div>
      `;
      document.body.appendChild(root);

      const closeAllBtns = [
        $("#korualCloseAll"),
        $("#korualEditCancel"),
        ...$$(".korualCloseAll"),
      ].filter(Boolean);

      closeAllBtns.forEach((b) => b.addEventListener("click", closeAllModals));
      const backdrop = $("#korualBackdrop");
      if (backdrop) backdrop.addEventListener("click", closeAllModals);
    }

    // attach DnD dropzones
    setupStatusDropzones_();
  }

  function openBackdrop_() {
    $("#korualBackdrop")?.classList.remove("hidden");
  }

  function closeBackdrop_() {
    $("#korualBackdrop")?.classList.add("hidden");
  }

  function closeAllModals() {
    $("#korualEditModal")?.classList.add("hidden");
    $("#korualDeleteModal")?.classList.add("hidden");
    $("#korualStatusDock")?.classList.add("hidden");
    closeBackdrop_();
  }

  // Modal state
  const modalState = {
    mode: null, // "edit" | "delete"
    entity: null,
    sheet: null,
    rowIndex: null,
    rowData: null,
    title: "",
  };

  function openEditModal({ entity, sheet, rowIndex, data }) {
    ensureCrudModals();
    modalState.mode = "edit";
    modalState.entity = entity;
    modalState.sheet = sheet;
    modalState.rowIndex = rowIndex;
    modalState.rowData = data || {};

    const title = `${sheet} · Row ${rowIndex}`;
    $("#korualEditTitle").textContent = "행 수정";
    $("#korualEditMeta").textContent = title;

    const wrap = $("#korualEditFields");
    wrap.innerHTML = "";

    const keys = Object.keys(modalState.rowData || {}).filter((k) => k !== "_row");
    if (!keys.length) {
      const empty = document.createElement("div");
      empty.className = "text-xs text-slate-400";
      empty.textContent = "편집 가능한 필드가 없습니다.";
      wrap.appendChild(empty);
    } else {
      keys.forEach((k) => {
        const val = modalState.rowData[k];
        const box = document.createElement("div");
        box.className = "space-y-1";
        const lab = document.createElement("label");
        lab.className = "text-[11px] text-slate-300";
        lab.textContent = k;
        const input = document.createElement("input");
        input.className =
          "w-full rounded-xl border border-slate-700/70 bg-slate-950/90 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-400/80 focus:ring-4 focus:ring-sky-500/10";
        input.value = val == null ? "" : String(val);
        input.dataset.fieldKey = k;
        box.appendChild(lab);
        box.appendChild(input);
        wrap.appendChild(box);
      });
    }

    openBackdrop_();
    $("#korualEditModal").classList.remove("hidden");
  }

  function openDeleteModal({ entity, sheet, rowIndex, title }) {
    ensureCrudModals();
    modalState.mode = "delete";
    modalState.entity = entity;
    modalState.sheet = sheet;
    modalState.rowIndex = rowIndex;
    modalState.title = title || "";

    $("#korualDeleteText").textContent = `정말 삭제할까요? ${modalState.title ? " (" + modalState.title + ")" : ""}`;
    $("#korualDeleteMeta").textContent = `${sheet} · Row ${rowIndex}`;

    openBackdrop_();
    $("#korualDeleteModal").classList.remove("hidden");
  }

  async function saveEditModal() {
    const wrap = $("#korualEditFields");
    if (!wrap || !modalState.sheet || !modalState.rowIndex) return;

    const inputs = $$("input[data-field-key]", wrap);
    const rowObject = {};
    inputs.forEach((inp) => {
      const k = inp.dataset.fieldKey;
      rowObject[k] = inp.value ?? "";
    });

    showSpinner();
    try {
      await apiPost({
        target: "updateRow",
        key: modalState.sheet,
        row: modalState.rowIndex,
        rowObject,
      });
      showToast("수정이 저장되었습니다.", "success");
      closeAllModals();
      await reloadTable(modalState.sheet);
      await loadDashboard();
    } catch (e) {
      console.error(e);
      showToast("저장 중 오류가 발생했습니다.", "error");
    } finally {
      hideSpinner();
    }
  }

  async function confirmDeleteModal() {
    if (!modalState.sheet || !modalState.rowIndex) return;

    showSpinner();
    try {
      await apiPost({
        target: "deleteRow",
        key: modalState.sheet,
        row: modalState.rowIndex,
      });
      showToast("행이 삭제되었습니다.", "success");
      closeAllModals();
      await reloadTable(modalState.sheet);
      await loadDashboard();
    } catch (e) {
      console.error(e);
      showToast("삭제 중 오류가 발생했습니다.", "error");
    } finally {
      hideSpinner();
    }
  }

  function initModalActions() {
    ensureCrudModals();

    $("#korualEditSave")?.addEventListener("click", saveEditModal);
    $("#korualDeleteConfirm")?.addEventListener("click", confirmDeleteModal);
  }

  // expose minimal modal API (optional usage)
  window.KORUAL_MODAL = {
    openEdit: openEditModal,
    openDelete: openDeleteModal,
    closeAll: closeAllModals,
  };

  // =========================
  // DnD (rows) + optional status drop zones
  // =========================
  const dnd = {
    dragging: null, // { sheet, rowIndex, rowData, tr }
  };

  function setupRowDnD_(tbody, ctx) {
    if (!tbody) return;

    tbody.addEventListener("dragstart", (e) => {
      const tr = e.target.closest("tr[data-rowindex]");
      if (!tr) return;

      const rowIndex = Number(tr.dataset.rowindex || "0");
      if (!rowIndex) return;

      dnd.dragging = {
        sheet: ctx.sheet,
        rowIndex,
        rowData: ctx._rowsByRowIndex?.get(rowIndex) || null,
        tr,
      };

      tr.classList.add("opacity-60");
      $("#korualStatusDock")?.classList.remove("hidden"); // show status dock while dragging
      openBackdrop_(); // soft backdrop to focus (reused)
      e.dataTransfer.effectAllowed = "move";
      try {
        e.dataTransfer.setData("text/plain", String(rowIndex));
      } catch (_) {}
    });

    tbody.addEventListener("dragend", () => {
      if (dnd.dragging?.tr) dnd.dragging.tr.classList.remove("opacity-60");
      dnd.dragging = null;
      $("#korualStatusDock")?.classList.add("hidden");
      closeBackdrop_();
    });

    // Simple reorder highlight (client only)
    tbody.addEventListener("dragover", (e) => {
      if (!dnd.dragging) return;
      e.preventDefault();
      const tr = e.target.closest("tr[data-rowindex]");
      if (!tr) return;
      tr.classList.add("outline", "outline-1", "outline-sky-500/40");
    });
    tbody.addEventListener("dragleave", (e) => {
      const tr = e.target.closest("tr[data-rowindex]");
      if (!tr) return;
      tr.classList.remove("outline", "outline-1", "outline-sky-500/40");
    });
    tbody.addEventListener("drop", (e) => {
      if (!dnd.dragging) return;
      e.preventDefault();
      const targetTr = e.target.closest("tr[data-rowindex]");
      if (!targetTr) return;

      targetTr.classList.remove("outline", "outline-1", "outline-sky-500/40");

      const fromTr = dnd.dragging.tr;
      if (!fromTr || fromTr === targetTr) return;

      // client-only reorder for user convenience (no persistence unless you implement backend bulkReplace)
      const rect = targetTr.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      if (before) tbody.insertBefore(fromTr, targetTr);
      else tbody.insertBefore(fromTr, targetTr.nextSibling);

      showToast("행 순서 UI 변경 (저장하려면 서버 bulkReplace가 필요)", "info", 1800);
    });
  }

  function setupStatusDropzones_() {
    const zones = $$(".korualStatusZone");
    if (!zones.length) return;

    zones.forEach((z) => {
      z.addEventListener("dragover", (e) => {
        if (!dnd.dragging) return;
        e.preventDefault();
        z.classList.add("ring-2", "ring-sky-400/60");
      });
      z.addEventListener("dragleave", () => {
        z.classList.remove("ring-2", "ring-sky-400/60");
      });
      z.addEventListener("drop", async (e) => {
        if (!dnd.dragging) return;
        e.preventDefault();
        z.classList.remove("ring-2", "ring-sky-400/60");

        const newStatus = z.dataset.status || "";
        const { sheet, rowIndex, rowData } = dnd.dragging;

        // Only apply status drop to ORDERS by default
        if (String(sheet).toUpperCase() !== "ORDERS") {
          showToast("상태 드롭은 ORDERS 테이블에만 적용됩니다.", "info", 1800);
          return;
        }
        if (!rowIndex) return;

        // Find a best-effort status key in rowData
        const statusKeyCandidates = ["status", "STATUS", "상태"];
        let statusKey = null;
        for (const k of statusKeyCandidates) {
          if (rowData && Object.prototype.hasOwnProperty.call(rowData, k)) {
            statusKey = k;
            break;
          }
        }
        if (!statusKey) {
          // fallback: try "status"
          statusKey = "status";
        }

        showSpinner();
        try {
          const rowObject = {};
          rowObject[statusKey] = newStatus;
          await apiPost({ target: "updateRow", key: sheet, row: rowIndex, rowObject });
          showToast(`주문 상태 변경: ${newStatus}`, "success");
          closeAllModals();
          await reloadTable(sheet);
          await loadDashboard();
        } catch (err) {
          console.error(err);
          showToast("상태 변경 실패", "error");
        } finally {
          hideSpinner();
        }
      });
    });
  }

  // =========================
  // Entity table loader
  // =========================
  async function loadEntityTable(options) {
    const { entity, sheet, tbodyId, pagerId, searchInputId, columns } = options;

    const tbody = document.getElementById(tbodyId);
    const pager = document.getElementById(pagerId);
    const searchInput = searchInputId ? document.getElementById(searchInputId) : null;
    if (!tbody) return null;

    const ctx = {
      entity,
      sheet,
      tbody,
      pager,
      searchInput,
      columns,
      paging: { page: 1, pageSize: 50, q: "" },
      _rowsByRowIndex: new Map(),
    };

    async function fetchAndRender() {
      tbody.innerHTML = `
        <tr>
          <td colspan="${columns.length + (hasManageColumn_(columns) ? 1 : 0)}" class="empty-state px-3 py-6 text-center text-slate-500">
            데이터를 불러오는 중입니다…
          </td>
        </tr>
      `;

      try {
        const res = await apiGet(sheet, {
          page: ctx.paging.page,
          pageSize: ctx.paging.pageSize,
          q: ctx.paging.q,
        });

        const data = res.data || {};
        const rows = data.rows || data.items || [];
        const page = data.page || ctx.paging.page;
        const pageSize = data.pageSize || ctx.paging.pageSize;
        const total = data.total ?? rows.length;

        ctx.paging.page = page;
        ctx.paging.pageSize = pageSize;

        renderTableRows(rows);
        updatePager(page, pageSize, total);

        state.lastSync = new Date();
        updateLastSyncLabel();
      } catch (err) {
        console.error(err);
        tbody.innerHTML = `
          <tr>
            <td colspan="${columns.length + (hasManageColumn_(columns) ? 1 : 0)}" class="empty-state px-3 py-6 text-center text-rose-400">
              데이터를 불러오지 못했습니다.
            </td>
          </tr>
        `;
      }
    }

    function hasManageColumn_(cols) {
      return cols.some((c) => c && c.type === "manage");
    }

    function renderTableRows(rows) {
      tbody.innerHTML = "";
      ctx._rowsByRowIndex.clear();

      if (!rows.length) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = columns.length + (hasManageColumn_(columns) ? 1 : 0);
        td.className = "empty-state px-3 py-6 text-center text-slate-500";
        td.textContent = "데이터가 없습니다.";
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
      }

      rows.forEach((row, idx) => {
        const rowIndex = row._row || row.rowIndex || idx + 2;
        ctx._rowsByRowIndex.set(Number(rowIndex), row);

        const tr = document.createElement("tr");
        tr.className =
          "border-b border-slate-800/70 last:border-b-0 hover:bg-slate-900/70 transition-colors";
        tr.dataset.rowindex = String(rowIndex);
        tr.setAttribute("draggable", "true");

        columns.forEach((col) => {
          if (col.type === "manage") return; // manage is rendered separately
          const td = document.createElement("td");
          td.className = "px-2 py-1.5 " + (col.align === "right" ? "text-right" : "text-left");

          let value = row[col.key];
          if (col.format === "currency") value = formatCurrency(value);
          else if (col.format === "date") value = value || "";
          else if (value == null) value = "";

          td.textContent = value;
          tr.appendChild(td);
        });

        const manageCol = columns.find((c) => c.type === "manage");
        if (manageCol) {
          const td = document.createElement("td");
          td.className = "px-2 py-1.5 text-center whitespace-nowrap";

          const btnEdit = document.createElement("button");
          btnEdit.type = "button";
          btnEdit.className =
            "inline-flex items-center px-2 py-0.5 rounded-full border border-slate-600/80 text-[10px] text-slate-200 bg-slate-900/80 mr-1";
          btnEdit.textContent = "수정";
          btnEdit.addEventListener("click", () => {
            openEditModal({
              entity,
              sheet,
              rowIndex: Number(rowIndex),
              data: row,
            });
          });

          const btnDel = document.createElement("button");
          btnDel.type = "button";
          btnDel.className =
            "inline-flex items-center px-2 py-0.5 rounded-full border border-rose-500/70 text-[10px] text-rose-200 bg-rose-950/70";
          btnDel.textContent = "삭제";
          btnDel.addEventListener("click", () => {
            openDeleteModal({
              entity,
              sheet,
              rowIndex: Number(rowIndex),
              title: manageCol.titleKey ? row[manageCol.titleKey] : "",
            });
          });

          td.appendChild(btnEdit);
          td.appendChild(btnDel);
          tr.appendChild(td);
        }

        tbody.appendChild(tr);
      });

      // enable DnD per table
      setupRowDnD_(tbody, ctx);
    }

    function updatePager(page, pageSize, total) {
      if (!pager) return;
      const label = pager.querySelector("[data-page-label]");
      if (label) {
        const start = (page - 1) * pageSize + 1;
        const end = Math.min(total, page * pageSize);
        label.textContent = total ? `${start}–${end} / ${total}` : `${page} 페이지`;
      }
    }

    if (pager) {
      pager.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-page]");
        if (!btn) return;
        const dir = btn.dataset.page;
        if (dir === "prev") ctx.paging.page = Math.max(1, ctx.paging.page - 1);
        else if (dir === "next") ctx.paging.page = ctx.paging.page + 1;
        fetchAndRender();
      });
    }

    if (searchInput) {
      let timer = null;
      searchInput.addEventListener("input", () => {
        ctx.paging.q = searchInput.value.trim();
        ctx.paging.page = 1;
        clearTimeout(timer);
        timer = setTimeout(() => fetchAndRender(), 250);
      });
    }

    await fetchAndRender();

    return {
      reload: fetchAndRender,
      state: ctx.paging,
      ctx,
    };
  }

  async function initTables() {
    state.tables = {};

    const p = await loadEntityTable({
      entity: "products",
      sheet: "PRODUCTS",
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
    if (p) state.tables["PRODUCTS"] = p;

    const o = await loadEntityTable({
      entity: "orders",
      sheet: "ORDERS",
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
        { type: "manage", titleKey: "orderNo" },
      ],
    });
    if (o) state.tables["ORDERS"] = o;

    const m = await loadEntityTable({
      entity: "members",
      sheet: "MEMBERS",
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
    if (m) state.tables["MEMBERS"] = m;

    const s = await loadEntityTable({
      entity: "stock",
      sheet: "STOCK",
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
    if (s) state.tables["STOCK"] = s;

    const l = await loadEntityTable({
      entity: "logs",
      sheet: "LOGS",
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
    if (l) state.tables["LOGS"] = l;
  }

  async function reloadTable(sheetKey) {
    const key = String(sheetKey || "").toUpperCase();
    const t = state.tables[key];
    if (t && typeof t.reload === "function") return t.reload();
  }

  async function reloadAllTables() {
    const keys = Object.keys(state.tables || {});
    for (const k of keys) {
      try {
        await state.tables[k].reload();
      } catch (_) {}
    }
  }

  // =========================
  // Initial boot
  // =========================
  async function init() {
    showSpinner();
    try {
      ensureCrudModals();
      initModalActions();
      initNavigation();
      initThemeToggle();
      initTopbar();

      await pingApi();
      await loadDashboard();
      await initTables();

      showToast("KORUAL Control Center 준비 완료", "success", 1400);
    } catch (e) {
      console.error(e);
      showToast("초기화 실패", "error");
    } finally {
      hideSpinner();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
