/*************************************************
 * KORUAL CONTROL CENTER – Frontend (app.js, High-End)
 * - 대시보드 / 상품 / 주문 / 회원 / 재고 / 로그
 * - Google Apps Script Backend(code.gs)와 연동
 * - 테마 토글 / 모바일 사이드바 / 검색 / 리프레시
 * - 행 더블클릭: 수정 모달 / 우클릭: 삭제 모달
 *************************************************/

/* ==============================
   0) 기본 설정
============================== */

// TODO: 실제 배포된 Web App URL로 교체해서 사용
const API_BASE   = "https://script.google.com/macros/s/AKfycbx3s5j7YgqcWLGGGuzdtQy0Ayl3QHtHP7xwhEAv3N-BClUVFN/exec";
const API_SECRET = "KORUAL-ONLY";

const state = {
  dashboard: null,
  products: [],
  orders: [],
  members: [],
  stock: [],
  logs: []
};

const TABLE_CONFIG = {
  products: {
    sheet: "PRODUCTS",
    columns: ["상품코드", "상품명", "옵션", "판매가", "재고"]
  },
  orders: {
    sheet: "ORDERS",
    columns: ["회원번호", "날짜", "주문번호", "고객명", "상품명", "수량", "금액", "상태"]
  },
  members: {
    sheet: "MEMBERS",
    columns: ["회원번호", "이름", "전화번호", "이메일", "가입일", "채널", "등급", "누적매출", "포인트", "최근주문일", "메모"]
  },
  stock: {
    sheet: "STOCK",
    columns: ["상품코드", "상품명", "현재 재고", "안전 재고", "상태", "창고", "채널"]
  },
  logs: {
    sheet: "LOGS",
    columns: ["시간", "타입", "메시지"]
  }
};

const $ = (id) => document.getElementById(id);


/* ==============================
   1) Toast 유틸
============================== */

function showToast(message, type = "info") {
  let root = document.querySelector(".toast-container");
  if (!root) {
    root = document.createElement("div");
    root.className = "toast-container";
    document.body.appendChild(root);
  }

  const el = document.createElement("div");
  el.className = "toast";

  if (type === "success") el.classList.add("toast-success");
  else if (type === "error") el.classList.add("toast-error");
  else el.classList.add("toast-info");

  el.textContent = message;
  root.appendChild(el);

  setTimeout(() => {
    el.classList.add("hide");
    setTimeout(() => {
      root.removeChild(el);
    }, 280);
  }, 2400);
}


/* ==============================
   2) API 래퍼
============================== */

async function apiGet(target) {
  const url = `${API_BASE}?target=${encodeURIComponent(target)}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`GET ${target} 실패 (${res.status})`);
  }
  const json = await res.json();
  if (json.ok === false) {
    throw new Error(json.error || `GET ${target} 응답 오류`);
  }
  return json;
}

async function apiPost(target, payload) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      secret: API_SECRET,
      target,
      ...payload
    })
  });

  if (!res.ok) {
    throw new Error(`POST ${target} 실패 (${res.status})`);
  }
  const json = await res.json();
  if (json.ok === false) {
    throw new Error(json.error || `POST ${target} 응답 오류`);
  }
  return json;
}


/* ==============================
   3) 테마 / 사이드바 / 탭
============================== */

function applyTheme(mode) {
  const body = document.body;
  const final = mode === "light" ? "light" : "dark";

  body.classList.toggle("theme-dark", final === "dark");
  localStorage.setItem("korual_theme", final);

  const toggle = $("themeToggle");
  const label = toggle?.querySelector(".theme-toggle-label");
  if (toggle && label) {
    const lightText = label.dataset.light || "Light";
    const darkText = label.dataset.dark || "Dark";
    label.textContent = final === "dark" ? darkText : lightText;
  }
}

function initThemeToggle() {
  const toggle = $("themeToggle");
  const saved = localStorage.getItem("korual_theme") || "dark";
  applyTheme(saved);

  if (!toggle) return;
  toggle.addEventListener("click", () => {
    const current = localStorage.getItem("korual_theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
  });
}

function initSidebar() {
  const menuToggle = $("menuToggle");
  const sidebar = document.querySelector(".sidebar");
  const backdrop = $("sidebarBackdrop");

  if (!menuToggle || !sidebar || !backdrop) return;

  const open = () => {
    sidebar.classList.add("open");
  };
  const close = () => {
    sidebar.classList.remove("open");
  };

  menuToggle.addEventListener("click", () => {
    if (sidebar.classList.contains("open")) close();
    else open();
  });

  backdrop.addEventListener("click", close);
}

function setActiveSection(sectionId) {
  document.querySelectorAll(".section").forEach((sec) => {
    sec.classList.toggle("active", sec.id === `section-${sectionId}`);
  });

  document.querySelectorAll(".nav-link").forEach((btn) => {
    const s = btn.dataset.section;
    btn.classList.toggle("active", s === sectionId);
  });
}

function initNavTabs() {
  document.querySelectorAll(".nav-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      const section = btn.dataset.section;
      if (!section) return;
      setActiveSection(section);
    });
  });

  const goOrders = $("goOrders");
  if (goOrders) {
    goOrders.addEventListener("click", () => {
      setActiveSection("orders");
    });
  }
}


/* ==============================
   4) API 상태 / 유저 정보
============================== */

async function initApiStatus() {
  const apiPingSpan = $("apiPing");
  const apiStatusEl = document.querySelector(".api-status");

  if (!apiPingSpan || !apiStatusEl) return;

  try {
    const start = Date.now();
    const res = await apiGet("ping");
    const elapsed = Date.now() - start;

    apiPingSpan.textContent = `${elapsed} ms`;
    apiStatusEl.classList.remove("error");
    apiStatusEl.classList.add("ok");
    apiStatusEl.textContent = "API 연결 양호";
  } catch (err) {
    apiPingSpan.textContent = "- ms";
    apiStatusEl.classList.remove("ok");
    apiStatusEl.classList.add("error");
    apiStatusEl.textContent = "API 오류";
    console.error(err);
  }
}

function initUserMeta() {
  const span = $("welcomeUser");
  try {
    const raw = localStorage.getItem("korual_user");
    if (!raw) return;
    const u = JSON.parse(raw);
    const name = u.full_name || u.username || "KORUAL";
    if (span) span.textContent = name;
  } catch (e) {
    // 무시
  }
}

function initLogout() {
  const btn = $("btnLogout");
  if (!btn) return;
  btn.addEventListener("click", () => {
    localStorage.removeItem("korual_user");
    showToast("로그아웃 되었습니다.", "info");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 400);
  });
}


/* ==============================
   5) 렌더러
============================== */

function formatNumber(value) {
  if (value == null || value === "") return "-";
  const n = Number(value);
  if (isNaN(n)) return String(value);
  return n.toLocaleString("ko-KR");
}

function formatCurrency(value) {
  const n = Number(value);
  if (isNaN(n)) return "-";
  return n.toLocaleString("ko-KR") + "원";
}

function updateLastSync() {
  const el = $("last-sync");
  if (!el) return;
  const now = new Date();
  const formatted =
    now.getFullYear() +
    "-" +
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0") +
    " " +
    String(now.getHours()).padStart(2, "0") +
    ":" +
    String(now.getMinutes()).padStart(2, "0");
  el.textContent = "마지막 동기화: " + formatted;
}

function renderDashboard() {
  const data = state.dashboard;
  if (!data) return;

  const cardTotalProducts = $("cardTotalProducts");
  const cardTotalOrders = $("cardTotalOrders");
  const cardTotalRevenue = $("cardTotalRevenue");
  const cardTotalMembers = $("cardTotalMembers");

  const todayOrders = $("todayOrders");
  const todayRevenue = $("todayRevenue");
  const todayPending = $("todayPending");

  if (cardTotalProducts) cardTotalProducts.textContent = formatNumber(data.totalProducts);
  if (cardTotalOrders) cardTotalOrders.textContent = formatNumber(data.totalOrders);
  if (cardTotalRevenue) cardTotalRevenue.textContent = formatCurrency(data.totalRevenue);
  if (cardTotalMembers) cardTotalMembers.textContent = formatNumber(data.totalMembers);

  if (todayOrders) todayOrders.textContent = formatNumber(data.todayOrders);
  if (todayRevenue) todayRevenue.textContent = formatCurrency(data.todayRevenue);
  if (todayPending) todayPending.textContent = formatNumber(data.todayPending);

  const tbody = $("recentOrdersBody");
  if (!tbody) return;

  const list = Array.isArray(data.recentOrders) ? data.recentOrders : [];

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">최근 주문이 없습니다.</td></tr>`;
    return;
  }

  tbody.innerHTML = list
    .map((o) => {
      return `
        <tr>
          <td>${o.order_date || ""}</td>
          <td>${o.order_no || ""}</td>
          <td>${o.item_name || ""}</td>
          <td>${formatNumber(o.qty)}</td>
          <td>${formatCurrency(o.amount)}</td>
          <td>${o.channel || ""}</td>
          <td>${o.status || ""}</td>
        </tr>
      `;
    })
    .join("");
}

/**
 * 공통 테이블 렌더러
 * entity: "products" | "orders" | "members" | "stock" | "logs"
 */
function renderEntityTable(entity, rows) {
  const cfg = TABLE_CONFIG[entity];
  if (!cfg) return;

  const tbody = document.querySelector(`tbody[data-entity="${entity}"]`);
  if (!tbody) return;

  const cols = cfg.columns;
  if (!rows || !rows.length) {
    tbody.innerHTML = `<tr><td colspan="${cols.length}" class="empty-state">데이터 없음</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map((row) => {
      const rowIndex = row._rowIndex || "";
      const cells = cols
        .map((key) => {
          const v = row[key];
          if (key.indexOf("금액") !== -1 || key.indexOf("매출") !== -1 || key.indexOf("재고") !== -1 || key.indexOf("포인트") !== -1) {
            return `<td>${formatNumber(v)}</td>`;
          }
          return `<td>${v == null ? "" : v}</td>`;
        })
        .join("");

      return `<tr data-row-index="${rowIndex}">${cells}</tr>`;
    })
    .join("");

  attachRowInteractions(entity, cfg.sheet, rows);
}

/** 행 더블클릭/우클릭 상호작용 (수정/삭제 모달) */
function attachRowInteractions(entity, sheet, rows) {
  const tbody = document.querySelector(`tbody[data-entity="${entity}"]`);
  if (!tbody || !rows || !rows.length) return;

  const trs = tbody.querySelectorAll("tr[data-row-index]");
  trs.forEach((tr, idx) => {
    const rowIndex = Number(tr.dataset.rowIndex || "0");
    const rowData = rows[idx] || {};

    tr.addEventListener("dblclick", () => {
      if (!window.KORUAL_MODAL || typeof window.KORUAL_MODAL.openEdit !== "function") return;
      const safeData = { ...rowData };
      delete safeData._rowIndex;

      window.KORUAL_MODAL.openEdit({
        entity,
        sheet,
        rowIndex,
        data: safeData
      });
    });

    tr.addEventListener("contextmenu", (evt) => {
      evt.preventDefault();
      if (!window.KORUAL_MODAL || typeof window.KORUAL_MODAL.openDelete !== "function") return;

      const title =
        rowData["상품명"] ||
        rowData["이름"] ||
        rowData["주문번호"] ||
        rowData["회원번호"] ||
        "";

      window.KORUAL_MODAL.openDelete({
        entity,
        sheet,
        rowIndex,
        title
      });
    });
  });
}


/* ==============================
   6) 데이터 로딩
============================== */

async function loadDashboard() {
  const data = await apiGet("dashboard");
  state.dashboard = data;
  renderDashboard();
}

function decorateRowsWithIndex(rawRows) {
  if (!Array.isArray(rawRows)) return [];
  // 주의: 중간에 완전히 빈 행이 많으면 인덱스가 다를 수 있음
  return rawRows.map((row, idx) => ({
    _rowIndex: idx + 2, // 1행 헤더 기준, 데이터는 2행부터
    ...row
  }));
}

async function loadList(entity) {
  const cfg = TABLE_CONFIG[entity];
  if (!cfg) return;
  const data = await apiGet(entity); // target 이름: products / orders / members / stock / logs
  const rows = decorateRowsWithIndex(data.rows || []);
  state[entity] = rows;
  renderEntityTable(entity, rows);
}

async function loadAllData() {
  const refreshBtn = $("btnRefreshAll");
  try {
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.textContent = "Loading...";
    }

    await Promise.all([
      loadDashboard(),
      loadList("products"),
      loadList("orders"),
      loadList("members"),
      loadList("stock"),
      loadList("logs"),
      initApiStatus()
    ]);

    updateLastSync();
    showToast("데이터를 새로고침했습니다.", "success");
  } catch (err) {
    console.error(err);
    showToast("데이터 로딩 중 오류가 발생했습니다.", "error");
  } finally {
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.textContent = "새로고침";
    }
  }
}


/* ==============================
   7) 검색 필터
============================== */

function makeSearchHandler(entity, inputId) {
  const input = $(inputId);
  if (!input) return;

  input.addEventListener("input", () => {
    const keyword = input.value.trim().toLowerCase();
    const allRows = state[entity] || [];

    if (!keyword) {
      renderEntityTable(entity, allRows);
      return;
    }

    const filtered = allRows.filter((row) => {
      return Object.keys(row).some((k) => {
        if (k === "_rowIndex") return false;
        const v = row[k];
        if (v == null) return false;
        return String(v).toLowerCase().includes(keyword);
      });
    });

    renderEntityTable(entity, filtered);
  });
}

function initSearchFilters() {
  makeSearchHandler("products", "searchProducts");
  makeSearchHandler("orders", "searchOrders");
  makeSearchHandler("members", "searchMembers");
  makeSearchHandler("stock", "searchStock");
  makeSearchHandler("logs", "searchLogs");
}


/* ==============================
   8) 모달 버튼 동작 (삭제만 우선 구현)
============================== */

function initModalActions() {
  const deleteBtn = $("rowDeleteConfirm");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      const entity = deleteBtn.dataset.entity;
      const sheet = deleteBtn.dataset.sheet;
      const rowIndex = Number(deleteBtn.dataset.rowIndex || "0");
      if (!entity || !sheet || !rowIndex) {
        showToast("삭제 정보가 올바르지 않습니다.", "error");
        return;
      }

      try {
        await apiPost("deleteRow", {
          sheet,
          row: rowIndex
        });
        showToast("행이 삭제되었습니다.", "success");

        // 해당 엔티티 다시 로드
        await loadList(entity);

        if (window.KORUAL_MODAL && typeof window.KORUAL_MODAL.closeAll === "function") {
          window.KORUAL_MODAL.closeAll();
        }
      } catch (err) {
        console.error(err);
        showToast("행 삭제 중 오류가 발생했습니다.", "error");
      }
    });
  }

  // 수정 저장은 backend에 updateRow API가 없어서,
  // 차후 updateCell 여러 번 호출 방식으로 구현하는 것이 안전.
  // 지금은 토스트만 안내하도록 남겨둠.
  const editSaveBtn = $("rowEditSave");
  if (editSaveBtn) {
    editSaveBtn.addEventListener("click", () => {
      showToast("행 수정 기능은 이후 단계에서 연결 예정입니다.", "info");
    });
  }
}


/* ==============================
   9) 부트스트랩
============================== */

(function bootstrap() {
  initThemeToggle();
  initSidebar();
  initNavTabs();
  initUserMeta();
  initLogout();
  initSearchFilters();
  initModalActions();

  const refreshBtn = $("btnRefreshAll");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      loadAllData();
    });
  }

  // 첫 진입 시 데이터 로드
  loadAllData().catch((err) => {
    console.error(err);
  });
})();
