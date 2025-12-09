// app.js
// KORUAL CONTROL CENTER – Frontend v1.0
// index.html (로그인) + dashboard.html 공용 JS

(function () {
  "use strict";

  // ========================
  // 기본 설정
  // ========================
  const META = window.KORUAL_META_APP || {};
  const API_BASE =
    META.api?.baseUrl ||
    "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec";
  const API_SECRET = META.api?.secret || "KORUAL-ONLY";

  const $ = (sel, parent = document) => parent.querySelector(sel);
  const $$ = (sel, parent = document) =>
    Array.from(parent.querySelectorAll(sel));

  const state = {
    pingMs: null,
    lastSync: null,
  };

  // =========================
  // 토스트
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
  // 글로벌 스피너
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
  // API 클라이언트
  // =========================
  async function apiGet(target, params = {}) {
    if (!API_BASE) {
      console.error("API_BASE 미설정");
      throw new Error("API URL이 설정되지 않았습니다.");
    }
    const url = new URL(API_BASE);
    const search = url.searchParams;
    search.set("target", target);
    // doGet에서는 secret을 검사하지 않지만, 필요할 때를 위해 남겨둠
    if (API_SECRET) search.set("secret", API_SECRET);

    Object.keys(params).forEach((k) => {
      const v = params[k];
      if (v === undefined || v === null || v === "") return;
      search.set(k, String(v));
    });

    const started = performance.now();
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    const elapsed = performance.now() - started;
    state.pingMs = Math.round(elapsed);

    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }

    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error("JSON 파싱 오류", text);
      throw new Error("API 응답이 JSON 형식이 아닙니다.");
    }

    if (json.ok === false) {
      throw new Error(json.message || "API 오류");
    }

    return json;
  }

  async function apiPost(body) {
    if (!API_BASE) {
      console.error("API_BASE 미설정");
      throw new Error("API URL이 설정되지 않았습니다.");
    }
    const url = new URL(API_BASE);
    const started = performance.now();
    const res = await fetch(url.toString(), {
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
    const elapsed = performance.now() - started;
    state.pingMs = Math.round(elapsed);

    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }

    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error("JSON 파싱 오류", text);
      throw new Error("API 응답이 JSON 형식이 아닙니다.");
    }

    if (json.ok === false) {
      throw new Error(json.message || "API 오류");
    }

    return json;
  }

  // =========================
  // API 상태 표시
  // =========================
  function updateApiStatus(ok, message) {
    const dot = $("#apiStatusDot");
    const text = $("#apiStatusText");
    const pingEl = $("#apiPing");

    if (!dot || !text) return;

    if (ok) {
      dot.className =
        "status-dot inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.35)]";
      text.textContent = message || "정상 연결";
    } else {
      dot.className =
        "status-dot inline-block w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_0_4px_rgba(248,113,113,0.35)]";
      text.textContent = message || "연결 실패";
    }

    if (pingEl && state.pingMs != null) {
      pingEl.textContent = state.pingMs + " ms";
    }
  }

  async function pingApi() {
    try {
      const res = await apiGet("ping");
      updateApiStatus(true, res.message || "LIVE");
      return res;
    } catch (err) {
      console.error(err);
      updateApiStatus(false, "Ping 실패");
      showToast("API 연결에 실패했습니다.", "error");
      throw err;
    }
  }

  // =========================
  // 날짜/금액 포맷
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

  // =========================
  // 대시보드 데이터 로딩
  // =========================
  async function loadDashboard() {
    const todayLabelEl = $("#todayDateLabel");
    if (todayLabelEl) {
      todayLabelEl.textContent = formatDateLabel();
    }

    try {
      // backend handleDashboard_ 결과 형식에 맞게 사용
      const d = await apiGet("dashboard");

      setText("cardTotalProducts", d.totalProducts ?? "-");
      setText("cardTotalOrders", d.totalOrders ?? "-");
      setText(
        "cardTotalMembers",
        d.totalMembers != null ? d.totalMembers : "-"
      );
      setText(
        "cardTotalRevenue",
        d.totalRevenue != null ? formatCurrency(d.totalRevenue) : "-"
      );

      setText("todayOrders", d.todayOrders ?? "-");
      setText(
        "todayRevenue",
        d.todayRevenue != null ? formatCurrency(d.todayRevenue) : "-"
      );
      setText("todayPending", d.todayPending ?? "-");

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
      td.className =
        "empty-state px-3 py-6 text-center text-slate-500";
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
        row.order_date || row.orderDate || row.date || "",
        row.order_no || row.orderNo || row.orderNumber || "",
        row.item_name || row.productName || "",
        row.qty != null ? String(row.qty) : "",
        row.amount != null ? formatCurrency(row.amount) : "",
        row.channel || "",
        row.status || "",
      ];

      cells.forEach((val, idx) => {
        const td = document.createElement("td");
        td.className =
          "px-2 py-1.5" +
          (idx === 3 || idx === 4 ? " text-right" : " text-left");
        td.textContent = val;
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
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
  // 공통 테이블 로더
  // (products / orders / members / stock / logs)
  // =========================
  async function loadEntityTable(options) {
    const { entity, endpoint, tbodyId, pagerId, searchInputId, columns } =
      options;

    const tbody = document.getElementById(tbodyId);
    const pager = document.getElementById(pagerId);
    const searchInput = searchInputId
      ? document.getElementById(searchInputId)
      : null;
    if (!tbody) return;

    const paging = {
      page: 1,
      pageSize: 50,
      q: "",
    };

    async function fetchAndRender() {
      tbody.innerHTML = `
        <tr>
          <td colspan="${columns.length}" class="empty-state px-3 py-6 text-center text-slate-500">
            데이터를 불러오는 중입니다…
          </td>
        </tr>
      `;

      try {
        const res = await apiGet(endpoint, {
          page: paging.page,
          size: paging.pageSize,
          q: paging.q,
        });

        const rows = res.rows || [];
        const meta = res.meta || {};
        const page = meta.page || paging.page;
        const pageSize = meta.pageSize || paging.pageSize;
        const total = meta.total ?? rows.length;

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
        td.className =
          "empty-state px-3 py-6 text-center text-slate-500";
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
          const td = document.createElement("td");
          td.className =
            "px-2 py-1.5 " +
            (col.align === "right" ? "text-right" : "text-left");
          let value = row[col.key];

          if (col.format === "currency") {
            value = formatCurrency(value);
          } else if (value == null) {
            value = "";
          }

          td.textContent = value;
          tr.appendChild(td);
        });

        // 관리 버튼
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
            if (!window.KORUAL_MODAL || !window.KORUAL_MODAL.openEdit) return;
            window.KORUAL_MODAL.openEdit({
              entity,
              sheet: endpoint,
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
            if (!window.KORUAL_MODAL || !window.KORUAL_MODAL.openDelete) return;
            window.KORUAL_MODAL.openDelete({
              entity,
              sheet: endpoint,
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
      if (label) {
        const start = (page - 1) * pageSize + 1;
        const end = Math.min(total, page * pageSize);
        label.textContent = total
          ? `${start}–${end} / ${total}`
          : `${page} 페이지`;
      }
    }

    if (pager) {
      pager.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-page]");
        if (!btn) return;
        const dir = btn.dataset.page;
        if (dir === "prev") {
          paging.page = Math.max(1, paging.page - 1);
        } else if (dir === "next") {
          paging.page = paging.page + 1;
        }
        fetchAndRender();
      });
    }

    if (searchInput) {
      let timer = null;
      searchInput.addEventListener("input", () => {
        const q = searchInput.value.trim();
        paging.q = q;
        paging.page = 1;
        clearTimeout(timer);
        timer = setTimeout(() => fetchAndRender(), 250);
      });
    }

    // 최초 로딩
    fetchAndRender();

    // 필요하면 외부에서 다시 호출할 수 있게 반환
    return {
      reload: fetchAndRender,
      state: paging,
    };
  }

  function initTables() {
    loadEntityTable({
      entity: "products",
      endpoint: "products",
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
      endpoint: "orders",
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
      endpoint: "members",
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
      endpoint: "stock",
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
      endpoint: "logs",
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
  // 테마 토글
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
  // 네비게이션
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
  // 상단바 버튼
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
        } catch (e) {
          // pingApi 안에서 토스트 처리
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

    // 환영 문구
    try {
      const raw = localStorage.getItem("korual_user");
      if (raw) {
        const user = JSON.parse(raw);
        if (user && user.username) {
          const el = $("#welcomeUser");
          if (el) el.textContent = user.username;
        }
      }
    } catch (e) {
      console.warn("korual_user 파싱 실패");
    }
  }

  // =========================
  // 모달 저장/삭제 (POST 예시 – backend 확장 시 사용)
  // =========================
  function initModalActions() {
    const btnSave = $("#rowEditSave");
    const btnDel = $("#rowDeleteConfirm");

    if (btnSave) {
      btnSave.addEventListener("click", async () => {
        const entity = btnSave.dataset.entity;
        const sheet = btnSave.dataset.sheet;
        const rowIndex = Number(btnSave.dataset.rowIndex || "0");
        const fieldsWrap = $("#rowEditFields");
        if (!entity || !sheet || !rowIndex || !fieldsWrap) return;

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
            key: sheet,
            row: rowIndex,
            rowObject,
          });
          showToast("수정이 저장되었습니다.", "success");
          if (window.KORUAL_MODAL && window.KORUAL_MODAL.closeAll) {
            window.KORUAL_MODAL.closeAll();
          }
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
        const entity = btnDel.dataset.entity;
        const sheet = btnDel.dataset.sheet;
        const rowIndex = Number(btnDel.dataset.rowIndex || "0");
        if (!entity || !sheet || !rowIndex) return;

        showSpinner();
        try {
          await apiPost({
            target: "deleteRow",
            key: sheet,
            row: rowIndex,
          });
          showToast("행이 삭제되었습니다.", "success");
          if (window.KORUAL_MODAL && window.KORUAL_MODAL.closeAll) {
            window.KORUAL_MODAL.closeAll();
          }
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
  // 대시보드 초기 실행
  // =========================
  async function initDashboard() {
    // 로그인 페이지가 아니면 실행
    if (!$("#dashboardRoot") && !$("#todayDateLabel")) {
      return;
    }

    showSpinner();
    try {
      initNavigation();
      initThemeToggle();
      initTopbar();
      initModalActions();

      await pingApi();
      await loadDashboard();
      initTables();
    } catch (e) {
      // pingApi/loadDashboard에서 이미 에러 처리
    } finally {
      hideSpinner();
    }
  }

  // =========================
  // 로그인 전용
  // =========================
  function showLoginMsg(msg, isError = true) {
    const el = $("#loginMsg");
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = isError ? "#fca5a5" : "#4ade80";
  }

  async function handleLogin() {
    const username = $("#loginUsername")?.value.trim();
    const password = $("#loginPassword")?.value.trim();

    if (!username || !password) {
      showLoginMsg("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }

    try {
      showLoginMsg("로그인 중입니다…", false);

      const data = await apiPost({
        target: "login",
        username,
        password,
      });

      const user = data.user || { username };
      localStorage.setItem("korual_user", JSON.stringify(user));
      location.href = "dashboard.html";
    } catch (err) {
      console.error(err);
      showLoginMsg(err.message || "서버 통신 중 오류가 발생했습니다.");
    }
  }

  function initLoginPage() {
    const btnLogin = $("#btnLogin");
    if (!btnLogin) return; // 로그인 페이지가 아닐 때는 스킵

    const pw = $("#loginPassword");
    const idInput = $("#loginUsername");

    btnLogin.addEventListener("click", handleLogin);

    if (pw) {
      pw.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          handleLogin();
        }
      });
    }
    if (idInput) {
      idInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          handleLogin();
        }
      });
    }

    // 테스트 계정 자동 채우기 버튼(있으면)
    const fillDemo = $("#btnFillDemo");
    const fillDemoMobile = $("#btnFillDemoMobile");
    function fill() {
      const u = $("#loginUsername");
      const p = $("#loginPassword");
      if (u) u.value = "KORUAL";
      if (p) p.value = "GUEST";
    }
    if (fillDemo) fillDemo.addEventListener("click", fill);
    if (fillDemoMobile) fillDemoMobile.addEventListener("click", fill);

    // 처음 들어올 때 ping 한 번
    pingApi().catch(() => {});
  }

  // =========================
  // 엔트리
  // =========================
  document.addEventListener("DOMContentLoaded", () => {
    if ($("#btnLogin")) {
      // 로그인 페이지
      initLoginPage();
    } else {
      // 대시보드 페이지
      initDashboard();
    }
  });
})();
