// app.js – KORUAL CONTROL CENTER Frontend (Dashboard + Lists + CRUD Modal + DnD)
// - dashboard.html 전용
// - PW_HASH 로그인 방식: index.html/auth.js에서 로그인 완료 후 localStorage(korual_user)만 사용
// - API: code.gs (ping/dashboard + sheet lists + updateRow/deleteRow)
// - 요구사항: GET은 target=ping/dashboard/products/orders/members/stock/logs
//            POST는 target=updateRow/deleteRow (+secret)
//
// 주의:
// 1) 이 파일은 dashboard.html에서만 로드하세요.
// 2) dashboard.html에는 아래 id들이 존재해야 합니다(없으면 해당 기능은 자동 스킵).
//    - #toastRoot, #globalSpinner, #apiStatusDot, #apiStatusText, #apiPing
//    - #todayDateLabel, #last-sync
//    - 카드: #cardTotalProducts/#cardTotalOrders/#cardTotalMembers/#cardTotalRevenue
//    - 오늘요약: #todayOrders/#todayRevenue/#todayPending
//    - 최근주문 tbody: #recentOrdersBody
//    - 네비: .nav-link[data-section], .section (id="section-xxxx")
//    - 테마: #themeToggle (optional)
//    - 상단: #btnRefreshAll #btnLogout (optional)
//    - 테이블 tbody/pager/search (optional): products/orders/members/stock/logs
// 3) 모달(선택): #modalRowEdit #rowEditFields #rowEditSave #rowEditCancel
//               #modalRowDelete #rowDeleteConfirm #rowDeleteCancel
//               (없으면 CRUD UI는 자동 비활성화)

(function () {
  "use strict";

  // =========================
  // META
  // =========================
  const META = window.KORUAL_META_APP || {};
  const API_BASE = META.api?.baseUrl || "";
  const API_SECRET = META.api?.secret || "";

  // =========================
  // DOM helpers
  // =========================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // =========================
  // Global state
  // =========================
  const state = {
    pingMs: null,
    lastSync: null,
    drag: {
      enabled: true,
      key: "korual_layout_v1",
      cards: [
        // 섹션별로 카드 컨테이너를 따로 저장하면 더 좋지만,
        // 여기서는 단일 "board" 컨테이너 내 draggable만 재정렬하는 범용형
      ],
    },
    user: null,
  };

  // =========================
  // Auth guard
  // =========================
  function requireLogin() {
    try {
      const raw = localStorage.getItem("korual_user");
      if (!raw) throw new Error("no_session");
      const user = JSON.parse(raw);
      if (!user || !user.username) throw new Error("no_user");
      state.user = user;
      return true;
    } catch (e) {
      // 로그인 페이지로
      location.replace("index.html");
      return false;
    }
  }

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
  // Spinner
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
  function buildUrl(target, params = {}) {
    if (!API_BASE) throw new Error("API URL이 설정되지 않았습니다.");
    const url = new URL(API_BASE);
    const sp = url.searchParams;
    sp.set("target", target);

    // GET에서 secret을 굳이 붙이지 않아도 되지만, 기존 코드 호환 위해 유지
    if (API_SECRET) sp.set("secret", API_SECRET);

    Object.keys(params).forEach((k) => {
      const v = params[k];
      if (v === undefined || v === null || v === "") return;
      sp.set(k, String(v));
    });

    return url.toString();
  }

  async function apiGet(target, params = {}) {
    const url = buildUrl(target, params);
    const started = performance.now();

    const res = await fetch(url, {
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
      console.error("JSON 파싱 오류:", text);
      throw new Error("API 응답이 JSON 형식이 아닙니다.");
    }

    if (json.ok === false) throw new Error(json.message || "API 오류");
    return json;
  }

  async function apiPost(body) {
    if (!API_BASE) throw new Error("API URL이 설정되지 않았습니다.");

    const started = performance.now();
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
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
      console.error("JSON 파싱 오류:", text);
      throw new Error("API 응답이 JSON 형식이 아닙니다.");
    }

    if (json.ok === false) throw new Error(json.message || "API 오류");
    return json;
  }

  // =========================
  // API status
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
  // Formatters
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

    const res = await apiGet("dashboard");
    const d = res.data || res || {};
    // code.gs 통합본: res.data.totals / res.data.today / res.data.recentOrders
    const totals = d.totals || d.data?.totals || {};
    const today = d.today || d.data?.today || {};
    const recentOrders = d.recentOrders || d.data?.recentOrders || [];

    setText("cardTotalProducts", totals.products ?? "-");
    setText("cardTotalOrders", totals.orders ?? "-");
    setText("cardTotalMembers", totals.members ?? "-");
    setText("cardTotalRevenue", totals.revenue != null ? formatCurrency(totals.revenue) : "-");

    setText("todayOrders", today.orders ?? "-");
    setText("todayRevenue", today.revenue != null ? formatCurrency(today.revenue) : "-");
    setText("todayPending", today.pending ?? "-");

    renderRecentOrders(recentOrders);

    state.lastSync = new Date();
    updateLastSyncLabel();
  }

  function renderRecentOrders(rows) {
    const tbody = $("#recentOrdersBody");
    if (!tbody) return;

    tbody.innerHTML = "";
    if (!rows || !rows.length) {
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
        row.orderDate || row.order_date || row.date || "",
        row.orderNo || row.order_no || row.orderNumber || "",
        row.productName || row.item_name || row.product_name || "",
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
  // Tables (generic)
  // =========================
  async function loadEntityTable(options) {
    const { entity, sheetTarget, tbodyId, pagerId, searchInputId, columns } = options;

    const tbody = document.getElementById(tbodyId);
    const pager = pagerId ? document.getElementById(pagerId) : null;
    const searchInput = searchInputId ? document.getElementById(searchInputId) : null;
    if (!tbody) return null;

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
        const res = await apiGet(sheetTarget, {
          page: paging.page,
          size: paging.pageSize,      // code.gs는 size로 받는 버전이 많음
          pageSize: paging.pageSize,  // 혼재 대응
          q: paging.q,
        });

        const data = res.data || res || {};
        const rows = data.rows || data.items || [];
        const page = data.page || paging.page;
        const pageSize = data.pageSize || paging.pageSize;
        const total = data.total != null ? data.total : rows.length;

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

      rows.forEach((row, idx) => {
        const tr = document.createElement("tr");
        tr.className =
          "border-b border-slate-800/70 last:border-b-0 hover:bg-slate-900/70 transition-colors";

        columns.forEach((col) => {
          if (col.type === "manage") return; // manage는 뒤에서 별도 처리

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
          td.className = "px-2 py-1.5 text-center";

          const btnEdit = document.createElement("button");
          btnEdit.type = "button";
          btnEdit.className =
            "inline-flex items-center px-2 py-0.5 rounded-full border border-slate-600/80 text-[10px] text-slate-200 bg-slate-900/80 mr-1";
          btnEdit.textContent = "수정";
          btnEdit.addEventListener("click", () => {
            openEditModal({
              entity,
              sheet: sheetTarget,
              rowIndex: row._row || row.rowIndex || idx + 2,
              data: row,
              title: row[manageCol.titleKey || ""] || "",
              onSaved: fetchAndRender,
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
              sheet: sheetTarget,
              rowIndex: row._row || row.rowIndex || idx + 2,
              title: row[manageCol.titleKey || ""] || "",
              onDeleted: fetchAndRender,
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

  // =========================
  // CRUD Modals
  // =========================
  function openEditModal({ sheet, rowIndex, data, title, onSaved }) {
    const modal = $("#modalRowEdit");
    const fieldsWrap = $("#rowEditFields");
    const btnSave = $("#rowEditSave");
    const btnCancel = $("#rowEditCancel");

    if (!modal || !fieldsWrap || !btnSave) {
      showToast("편집 모달이 준비되지 않았습니다.", "error");
      return;
    }

    // build fields from object keys (exclude internal keys)
    fieldsWrap.innerHTML = "";
    const keys = Object.keys(data || {}).filter((k) => k !== "_row");

    keys.forEach((k) => {
      const row = document.createElement("div");
      row.className = "grid grid-cols-12 gap-2 items-center";

      const lab = document.createElement("label");
      lab.className = "col-span-4 text-xs text-slate-300";
      lab.textContent = k;

      const input = document.createElement("input");
      input.className =
        "col-span-8 w-full rounded-xl border border-slate-700/80 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-400/90";
      input.value = data[k] == null ? "" : String(data[k]);
      input.dataset.fieldKey = k;

      row.appendChild(lab);
      row.appendChild(input);
      fieldsWrap.appendChild(row);
    });

    btnSave.dataset.sheet = sheet;
    btnSave.dataset.rowIndex = String(rowIndex);
    btnSave.dataset.title = title || "";

    function close() {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
    }
    function open() {
      modal.classList.remove("hidden");
      modal.setAttribute("aria-hidden", "false");
    }

    // cancel
    if (btnCancel) {
      btnCancel.onclick = close;
    }
    // click outside (optional)
    modal.addEventListener(
      "click",
      (e) => {
        if (e.target === modal) close();
      },
      { once: true }
    );

    btnSave.onclick = async () => {
      const sheetName = btnSave.dataset.sheet;
      const r = Number(btnSave.dataset.rowIndex || "0");
      if (!sheetName || !r) return;

      const inputs = $$("input[data-field-key]", fieldsWrap);
      const rowObject = {};
      inputs.forEach((inp) => {
        const key = inp.dataset.fieldKey;
        rowObject[key] = inp.value ?? "";
      });

      showSpinner();
      try {
        await apiPost({
          target: "updateRow",
          key: sheetName,
          row: r,
          rowObject,
        });
        showToast("수정이 저장되었습니다.", "success");
        close();
        if (typeof onSaved === "function") onSaved();
      } catch (err) {
        console.error(err);
        showToast("저장 중 오류가 발생했습니다.", "error");
      } finally {
        hideSpinner();
      }
    };

    open();
  }

  function openDeleteModal({ sheet, rowIndex, title, onDeleted }) {
    const modal = $("#modalRowDelete");
    const btnConfirm = $("#rowDeleteConfirm");
    const btnCancel = $("#rowDeleteCancel");
    const label = $("#rowDeleteLabel");

    if (!modal || !btnConfirm) {
      showToast("삭제 모달이 준비되지 않았습니다.", "error");
      return;
    }

    if (label) label.textContent = title ? `"${title}" 행을 삭제할까요?` : "이 행을 삭제할까요?";

    btnConfirm.dataset.sheet = sheet;
    btnConfirm.dataset.rowIndex = String(rowIndex);

    function close() {
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
    }
    function open() {
      modal.classList.remove("hidden");
      modal.setAttribute("aria-hidden", "false");
    }

    if (btnCancel) btnCancel.onclick = close;
    modal.addEventListener(
      "click",
      (e) => {
        if (e.target === modal) close();
      },
      { once: true }
    );

    btnConfirm.onclick = async () => {
      const sheetName = btnConfirm.dataset.sheet;
      const r = Number(btnConfirm.dataset.rowIndex || "0");
      if (!sheetName || !r) return;

      showSpinner();
      try {
        await apiPost({
          target: "deleteRow",
          key: sheetName,
          row: r,
        });
        showToast("행이 삭제되었습니다.", "success");
        close();
        if (typeof onDeleted === "function") onDeleted();
      } catch (err) {
        console.error(err);
        showToast("삭제 중 오류가 발생했습니다.", "error");
      } finally {
        hideSpinner();
      }
    };

    open();
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
  // Theme toggle (optional)
  // =========================
  function initThemeToggle() {
    const btn = $("#themeToggle");
    if (!btn) return;

    const body = document.body;
    const saved = localStorage.getItem("korual_theme");

    function apply(theme) {
      if (theme === "light") {
        body.classList.remove("theme-dark");
        body.classList.add("theme-light", "bg-slate-50", "text-slate-900");
      } else {
        body.classList.remove("theme-light", "bg-slate-50", "text-slate-900");
        body.classList.add("theme-dark");
      }
      localStorage.setItem("korual_theme", theme);
    }

    apply(saved === "light" ? "light" : "dark");

    btn.addEventListener("click", () => {
      const isDark = body.classList.contains("theme-dark");
      apply(isDark ? "light" : "dark");
    });
  }

  // =========================
  // Topbar
  // =========================
  function initTopbar(tablesReloader) {
    const btnRefresh = $("#btnRefreshAll");
    const btnLogout = $("#btnLogout");

    if (btnRefresh) {
      btnRefresh.addEventListener("click", async () => {
        showSpinner();
        try {
          await pingApi();
          await loadDashboard();
          if (typeof tablesReloader === "function") await tablesReloader();
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

    // welcome text
    const el = $("#welcomeUser");
    if (el && state.user?.username) el.textContent = state.user.username;
  }

  // =========================
  // Drag & Drop board (optional)
  // =========================
  function initDnD() {
    // draggable 요소에 data-draggable="true", 드래그핸들에 data-drag-handle="true"
    // 컨테이너에 data-board="true" 를 달면 순서 저장/복원
    const board = $('[data-board="true"]');
    if (!board) return;

    function getOrder() {
      return $("[data-board=\"true\"]")
        ? $$('[data-board="true"] [data-card-id]').map((el) => el.getAttribute("data-card-id"))
        : [];
    }

    function saveOrder() {
      try {
        const order = getOrder();
        localStorage.setItem(state.drag.key, JSON.stringify(order));
      } catch (_) {}
    }

    function restoreOrder() {
      try {
        const raw = localStorage.getItem(state.drag.key);
        if (!raw) return;
        const order = JSON.parse(raw);
        if (!Array.isArray(order)) return;

        const map = new Map();
        $$('[data-board="true"] [data-card-id]').forEach((el) => {
          map.set(el.getAttribute("data-card-id"), el);
        });

        order.forEach((id) => {
          const el = map.get(id);
          if (el) board.appendChild(el);
        });
      } catch (_) {}
    }

    restoreOrder();

    let dragging = null;

    board.addEventListener("pointerdown", (e) => {
      const handle = e.target.closest('[data-drag-handle="true"]');
      const card = e.target.closest("[data-card-id]");
      if (!card) return;
      if (handle && !card.contains(handle)) return;

      // 핸들이 지정되어 있으면 핸들에서만 드래그 시작
      if ($$('[data-drag-handle="true"]', card).length && !handle) return;

      dragging = card;
      dragging.classList.add("opacity-80");
      dragging.setPointerCapture(e.pointerId);
    });

    board.addEventListener("pointermove", (e) => {
      if (!dragging) return;

      const over = document.elementFromPoint(e.clientX, e.clientY);
      const overCard = over ? over.closest("[data-card-id]") : null;
      if (!overCard || overCard === dragging) return;
      if (!board.contains(overCard)) return;

      const rect = overCard.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      if (before) board.insertBefore(dragging, overCard);
      else board.insertBefore(dragging, overCard.nextSibling);
    });

    board.addEventListener("pointerup", () => {
      if (!dragging) return;
      dragging.classList.remove("opacity-80");
      dragging = null;
      saveOrder();
      showToast("레이아웃이 저장되었습니다.", "success", 1200);
    });
  }

  // =========================
  // Init tables (you can adjust keys to your sheet headers)
  // =========================
  async function initTables() {
    const loaders = [];

    // PRODUCTS
    loaders.push(
      loadEntityTable({
        entity: "products",
        sheetTarget: "products",
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
      })
    );

    // ORDERS
    loaders.push(
      loadEntityTable({
        entity: "orders",
        sheetTarget: "orders",
        tbodyId: "ordersBody",
        pagerId: "ordersPager",
        searchInputId: "searchOrders",
        columns: [
          { key: "memberNo" },
          { key: "date", format: "date" },
          { key: "orderNo" },
          { key: "customerName" },
          { key: "productName" },
          { key: "qty", align: "right" },
          { key: "amount", align: "right", format: "currency" },
          { key: "status" },
          { key: "channel" },
        ],
      })
    );

    // MEMBERS (manage 포함)
    loaders.push(
      loadEntityTable({
        entity: "members",
        sheetTarget: "members",
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
      })
    );

    // STOCK (manage 포함)
    loaders.push(
      loadEntityTable({
        entity: "stock",
        sheetTarget: "stock",
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
      })
    );

    // LOGS
    loaders.push(
      loadEntityTable({
        entity: "logs",
        sheetTarget: "logs",
        tbodyId: "logsBody",
        pagerId: "logsPager",
        searchInputId: "searchLogs",
        columns: [
          { key: "time" },
          { key: "type" },
          { key: "message" },
          { key: "detail" },
        ],
      })
    );

    await Promise.allSettled(loaders);
  }

  // For refresh-all: re-init tables quickly
  async function reloadAllTables() {
    // 가장 간단하게는 initTables 재호출 (테이블이 크면 최적화 가능)
    await initTables();
  }

  // =========================
  // Main init
  // =========================
  async function init() {
    if (!requireLogin()) return;

    showSpinner();
    try {
      initNavigation();
      initThemeToggle();
      initDnD();

      await pingApi();
      await loadDashboard();
      await initTables();

      initTopbar(reloadAllTables);

      showToast("Control Center 준비 완료", "success", 1400);
    } catch (e) {
      console.error(e);
      showToast("초기화 중 오류가 발생했습니다.", "error");
    } finally {
      hideSpinner();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
