/******************************************************
 * KORUAL CONTROL CENTER – app.js (풀 하이엔드 버전)
 * 로그인 보호 / 사용자 표시 / 사이드바 / 다크모드
 * 대시보드 / 회원 / 주문 / 상품 / 재고 / 로그 모니터링
 ******************************************************/

/* ========== 공통 유틸 ========== */

// DOM 헬퍼
const $  = (id)  => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

// 데이터 캐시
let membersCache  = [];
let ordersCache   = [];
let productsCache = [];
let stockCache    = [];
let logsCache     = [];   // ★★ 추가됨 — 로그 기능 정상 작동 위한 필수 선언!!

// API 주소
const API_BASE =
  "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec";

// GET API 헬퍼
async function apiGet(target, extraParams = {}) {
  const url = new URL(API_BASE);
  url.searchParams.set("target", target);
  Object.entries(extraParams).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, v);
    }
  });

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

// 숫자/금액 포맷
function fmtNumber(v) {
  if (v === null || v === undefined || v === "" || isNaN(v)) return "-";
  return Number(v).toLocaleString("ko-KR");
}
function fmtCurrency(v) {
  if (v === null || v === undefined || v === "" || isNaN(v)) return "-";
  return Number(v).toLocaleString("ko-KR") + "원";
}

/* ========== 0. 로그인 보호 ========== */

function ensureLoggedIn() {
  try {
    const raw = localStorage.getItem("korual_user");
    if (!raw) {
      window.location.replace("index.html");
      return false;
    }
    const user = JSON.parse(raw);
    if (!user || !user.username) {
      window.location.replace("index.html");
      return false;
    }
    return true;
  } catch (e) {
    console.error("로그인 상태 확인 오류:", e);
    window.location.replace("index.html");
    return false;
  }
}

/* ========== 1. 로그인 유저 이름 표시 ========== */

function loadKorualUser() {
  try {
    const raw = localStorage.getItem("korual_user");
    if (!raw) return;

    const user = JSON.parse(raw);
    const name =
      user.full_name && String(user.full_name).trim()
        ? String(user.full_name).trim()
        : (user.username || "게스트");

    const span = $("welcomeUser");
    if (span) span.textContent = name;
  } catch (e) {
    console.error("korual_user 파싱 오류:", e);
  }
}

/* ========== 2. 사이드바 네비게이션 ========== */

function initSidebarNav() {
  const links    = $$(".nav-link");
  const sections = $$(".section");

  if (!links.length || !sections.length) return;

  function activate(sectionKey) {
    links.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.section === sectionKey);
    });
    sections.forEach((sec) => {
      sec.classList.toggle("active", sec.id === "section-" + sectionKey);
    });
  }

  links.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.section;
      if (!key) return;

      activate(key);

      switch (key) {
        case "dashboard": loadDashboardData(); break;
        case "members":   loadMembers();       break;
        case "orders":    loadOrders();        break;
        case "products":  loadProducts();      break;
        case "stock":     loadStock();         break;
        case "logs":      loadLogs();          break;
      }
    });
  });

  const goOrders = $("goOrders");
  if (goOrders) {
    goOrders.addEventListener("click", () => {
      const btn = document.querySelector('.nav-link[data-section="orders"]');
      if (btn) btn.click();
    });
  }

  activate("dashboard");
}

/* ========== 3. 테마 토글 ========== */

function applyTheme(theme) {
  const body = document.body;
  const mode = theme === "dark" ? "dark" : "light";
  body.classList.toggle("theme-dark", mode === "dark");

  localStorage.setItem("korual-theme", mode);
}

function initThemeToggle() {
  const saved = localStorage.getItem("korual-theme") || "light";
  applyTheme(saved);

  const toggleBtn = $("themeToggle");
  if (!toggleBtn) return;

  toggleBtn.addEventListener("click", () => {
    const current = localStorage.getItem("korual-theme") || "light";
    const next    = current === "light" ? "dark" : "light";
    applyTheme(next);
  });
}

/* ========== 4. 모바일 메뉴 ========== */

function initMobileMenu() {
  const sidebar  = document.querySelector(".sidebar");
  const backdrop = $("sidebarBackdrop");
  const toggle   = $("menuToggle");
  const navLinks = $$(".nav-link");

  if (!sidebar || !backdrop || !toggle) return;

  const open = () => {
    sidebar.classList.add("open");
    backdrop.classList.add("visible");
  };

  const close = () => {
    sidebar.classList.remove("open");
    backdrop.classList.remove("visible");
  };

  toggle.addEventListener("click", () => {
    sidebar.classList.contains("open") ? close() : open();
  });

  backdrop.addEventListener("click", close);
  navLinks.forEach((btn) => btn.addEventListener("click", close));
}

/* ========== 5. API 상태 표시 / ping ========== */

function setApiStatus(ok, msg) {
  const el = document.querySelector(".api-status");
  if (!el) return;
  el.classList.toggle("ok", ok);
  el.classList.toggle("error", !ok);
  el.textContent = msg || (ok ? "API 연결 정상" : "API 오류");
}

async function pingApi() {
  try {
    setApiStatus(true, "API 체크 중…");
    const data = await apiGet("ping");
    data && data.ok !== false
      ? setApiStatus(true, "API 연결 정상")
      : setApiStatus(false, "API 응답 이상");
  } catch (e) {
    console.error("ping 실패:", e);
    setApiStatus(false, "API 연결 실패");
  }
}

/* ========== 6. 대시보드 ========== */

function setDashboardLoading(loading) {
  const tbody = $("recentOrdersBody");
  if (loading) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="empty-state">데이터 로딩 중…</td></tr>';
  }
}

function updateDashboardCards(payload) {
  if (!payload) return;

  const mapping = [
    ["cardTotalProducts", fmtNumber(payload.totalProducts)],
    ["cardTotalOrders",   fmtNumber(payload.totalOrders)],
    ["cardTotalRevenue",  fmtCurrency(payload.totalRevenue)],
    ["cardTotalMembers",  fmtNumber(payload.totalMembers)],
    ["todayOrders",       fmtNumber(payload.todayOrders)],
    ["todayRevenue",      fmtCurrency(payload.todayRevenue)],
    ["todayPending",      fmtNumber(payload.todayPending)],
  ];

  mapping.forEach(([id, val]) => {
    const el = $(id);
    if (el) el.textContent = val;
  });

  const lastSync = $("last-sync");
  if (lastSync) {
    const now = new Date();
    lastSync.textContent =
      `마지막 동기화: ${now.getFullYear()}.${now.getMonth()+1}.${now.getDate()}  ` +
      now.toLocaleTimeString("ko-KR", {hour:"2-digit", minute:"2-digit"});
  }
}

function updateRecentOrdersTable(list) {
  const tbody = $("recentOrdersBody");
  tbody.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="empty-state">최근 주문이 없습니다.</td></tr>';
    return;
  }

  list.forEach((row) => {
    const tr = document.createElement("tr");
    const cells = [
      row.order_date || "-",
      row.order_no   || "-",
      row.item_name  || "-",
      row.qty        || "-",
      fmtCurrency(row.amount),
      row.channel    || "-",
      row.status     || "-",
    ];

    cells.forEach((v) => {
      const td = document.createElement("td");
      td.textContent = v ?? "-";
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

async function loadDashboardData() {
  setDashboardLoading(true);
  try {
    const data = await apiGet("dashboard");
    updateDashboardCards(data);
    updateRecentOrdersTable(data?.recentOrders || []);
    setApiStatus(true, "API 연결 정상");
  } catch (e) {
    console.error("대시보드 데이터 로딩 실패:", e);
    setApiStatus(false, "대시보드 로딩 실패");
  }
}

/* ========== 7. 새로고침 버튼 ========== */

function initRefreshButton() {
  const btn = $("btnRefreshAll");
  if (!btn) return;
  btn.addEventListener("click", loadDashboardData);
}

/* ========== 8. 로그아웃 ========== */

function initLogoutButton() {
  const btn = $("btnLogout");
  if (!btn) return;

  btn.addEventListener("click", () => {
    localStorage.removeItem("korual_user");
    window.location.replace("index.html");
  });
}

/* ========== 9. 회원 관리 ========== */

function getMemberSearchFields(row) {
  return [
    row["회원번호"], row["이름"], row["전화번호"], row["이메일"],
    row["가입일"], row["채널"], row["등급"],
    row["누적매출"], row["포인트"], row["최근주문일"], row["메모"]
  ];
}

function renderMembersTable(list) {
  const tbody = $("membersBody");
  tbody.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="11" class="empty-state">회원 데이터가 없습니다.</td></tr>';
    return;
  }

  list.forEach((row) => {
    const tr = document.createElement("tr");
    const cells = [
      row["회원번호"], row["이름"], row["전화번호"], row["이메일"],
      row["가입일"], row["채널"], row["등급"],
      fmtCurrency(row["누적매출"]),
      fmtNumber(row["포인트"]),
      row["최근주문일"], row["메모"]
    ];

    cells.forEach((v) => {
      const td = document.createElement("td");
      td.textContent = v ?? "-";
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function initMemberSearch() {
  const input = $("searchMembers");
  if (!input) return;

  input.addEventListener("input", () => {
    const kw = input.value.toLowerCase();
    if (!kw) return renderMembersTable(membersCache);

    const filtered = membersCache.filter((row) =>
      getMemberSearchFields(row).some((v) =>
        String(v ?? "").toLowerCase().includes(kw)
      )
    );

    renderMembersTable(filtered);
  });
}

async function loadMembers() {
  const tbody = $("membersBody");
  tbody.innerHTML =
    '<tr><td colspan="11" class="empty-state">회원 데이터 로딩 중…</td></tr>';

  try {
    const data = await apiGet("members");

    if (!data?.rows) {
      tbody.innerHTML =
        '<tr><td colspan="11" class="empty-state">회원 데이터를 불러오지 못했습니다.</td></tr>';
      return;
    }

    membersCache = data.rows;

    const kw = ($("searchMembers")?.value || "").trim().toLowerCase();
    kw
      ? renderMembersTable(
          membersCache.filter((row) =>
            getMemberSearchFields(row).some((v) =>
              String(v ?? "").toLowerCase().includes(kw)
            )
          )
        )
      : renderMembersTable(membersCache);

  } catch (e) {
    console.error("회원 데이터 로딩 실패:", e);
  }
}

/* ========== 10. 주문 관리 ========== */

function getOrderSearchFields(row) {
  return [
    row["날짜"] || row["주문일자"],
    row["주문번호"],
    row["고객명"],
    row["상품명"],
    row["채널"],
    row["상태"],
    row["금액"],
    row["수량"],
  ];
}

function renderOrdersTable(list) {
  const tbody = $("ordersBody");
  tbody.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="empty-state">주문 데이터가 없습니다.</td></tr>';
    return;
  }

  list.forEach((row) => {
    const tr = document.createElement("tr");
    const cells = [
      row["날짜"] ?? row["주문일자"] ?? "-",
      row["주문번호"],
      row["고객명"],
      row["상품명"],
      row["수량"],
      fmtCurrency(row["금액"]),
      row["상태"],
    ];

    cells.forEach((v) => {
      const td = document.createElement("td");
      td.textContent = v ?? "-";
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function initOrdersSearch() {
  const input = $("searchOrders");
  if (!input) return;

  input.addEventListener("input", () => {
    const kw = input.value.toLowerCase();
    if (!kw) return renderOrdersTable(ordersCache);

    const filtered = ordersCache.filter((row) =>
      getOrderSearchFields(row).some((v) =>
        String(v ?? "").toLowerCase().includes(kw)
      )
    );

    renderOrdersTable(filtered);
  });
}

async function loadOrders() {
  const tbody = $("ordersBody");
  tbody.innerHTML =
    '<tr><td colspan="7" class="empty-state">주문 데이터 로딩 중…</td></tr>';

  try {
    const data = await apiGet("orders");

    if (!data?.rows) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="empty-state">주문 데이터를 불러오지 못했습니다.</td></tr>';
      return;
    }

    ordersCache = data.rows;

    const kw = ($("searchOrders")?.value || "").trim().toLowerCase();
    kw
      ? renderOrdersTable(
          ordersCache.filter((row) =>
            getOrderSearchFields(row).some((v) =>
              String(v ?? "").toLowerCase().includes(kw)
            )
          )
        )
      : renderOrdersTable(ordersCache);

  } catch (e) {
    console.error("주문 데이터 로딩 실패:", e);
  }
}

/* ========== 11. 상품 관리 ========== */

function getProductSearchFields(row) {
  return [
    row["상품코드"], row["상품명"], row["옵션"],
    row["판매가"], row["재고"], row["채널"],
    row["카테고리"], row["브랜드"]
  ];
}

function renderProductsTable(list) {
  const tbody = $("productsBody");
  tbody.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="empty-state">상품 데이터가 없습니다.</td></tr>';
    return;
  }

  list.forEach((row) => {
    const tr = document.createElement("tr");
    const cells = [
      row["상품코드"],
      row["상품명"],
      row["옵션"],
      fmtCurrency(row["판매가"]),
      fmtNumber(row["재고"]),
    ];

    cells.forEach((v) => {
      const td = document.createElement("td");
      td.textContent = v ?? "-";
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function initProductsSearch() {
  const input = $("searchProducts");
  if (!input) return;

  input.addEventListener("input", () => {
    const kw = input.value.toLowerCase();
    if (!kw) return renderProductsTable(productsCache);

    const filtered = productsCache.filter((row) =>
      getProductSearchFields(row).some((v) =>
        String(v ?? "").toLowerCase().includes(kw)
      )
    );

    renderProductsTable(filtered);
  });
}

async function loadProducts() {
  const tbody = $("productsBody");
  tbody.innerHTML =
    '<tr><td colspan="5" class="empty-state">상품 데이터 로딩 중…</td></tr>';

  try {
    const data = await apiGet("products");

    if (!data?.rows) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="empty-state">상품 데이터를 불러오지 못했습니다.</td></tr>';
      return;
    }

    productsCache = data.rows;

    const kw = ($("searchProducts")?.value || "").trim().toLowerCase();
    kw
      ? renderProductsTable(
          productsCache.filter((row) =>
            getProductSearchFields(row).some((v) =>
              String(v ?? "").toLowerCase().includes(kw)
            )
          )
        )
      : renderProductsTable(productsCache);

  } catch (e) {
    console.error("상품 데이터 로딩 실패:", e);
  }
}

/* ========== 12. 재고 관리 ========== */

function getStockSearchFields(row) {
  return [
    row["상품코드"], row["상품명"], row["현재 재고"],
    row["안전 재고"], row["상태"], row["창고"], row["채널"]
  ];
}

function renderStockTable(list) {
  const tbody = $("stockBody");
  tbody.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="empty-state">재고 데이터가 없습니다.</td></tr>';
    return;
  }

  list.forEach((row) => {
    const tr = document.createElement("tr");
    const cells = [
      row["상품코드"],
      row["상품명"],
      fmtNumber(row["현재 재고"]),
      fmtNumber(row["안전 재고"]),
      row["상태"],
    ];

    cells.forEach((v) => {
      const td = document.createElement("td");
      td.textContent = v ?? "-";
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function initStockSearch() {
  const input = $("searchStock");
  if (!input) return;

  input.addEventListener("input", () => {
    const kw = input.value.toLowerCase();
    if (!kw) return renderStockTable(stockCache);

    const filtered = stockCache.filter((row) =>
      getStockSearchFields(row).some((v) =>
        String(v ?? "").toLowerCase().includes(kw)
      )
    );

    renderStockTable(filtered);
  });
}

async function loadStock() {
  const tbody = $("stockBody");
  tbody.innerHTML =
    '<tr><td colspan="5" class="empty-state">재고 데이터 로딩 중…</td></tr>';

  try {
    const data = await apiGet("stock");

    if (!data?.rows) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="empty-state">재고 데이터를 불러오지 못했습니다.</td></tr>';
      return;
    }

    stockCache = data.rows;

    const kw = ($("searchStock")?.value || "").trim().toLowerCase();
    kw
      ? renderStockTable(
          stockCache.filter((row) =>
            getStockSearchFields(row).some((v) =>
              String(v ?? "").toLowerCase().includes(kw)
            )
          )
        )
      : renderStockTable(stockCache);

  } catch (e) {
    console.error("재고 데이터 로딩 실패:", e);
  }
}

/* ========== 14. 로그 모니터링 ========== */

// 검색 필드
function getLogSearchFields(row) {
  return [
    row["시간"],
    row["타입"],
    row["메시지"],
  ];
}

// 로그 렌더링
function renderLogsTable(list) {
  const tbody = $("logsBody");
  tbody.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="3" class="empty-state">로그 데이터가 없습니다.</td></tr>';
    return;
  }

  list.forEach((row) => {
    const tr = document.createElement("tr");
    const cells = [
      row["시간"],
      row["타입"],
      row["메시지"],
    ];

    cells.forEach((v) => {
      const td = document.createElement("td");
      td.textContent = v ?? "-";
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

// 검색 이벤트
function initLogsSearch() {
  const input = $("searchLogs");
  if (!input) return;

  input.addEventListener("input", () => {
    const kw = input.value.toLowerCase();
    if (!kw) return renderLogsTable(logsCache);

    const filtered = logsCache.filter((row) =>
      getLogSearchFields(row).some((v) =>
        String(v ?? "").toLowerCase().includes(kw)
      )
    );

    renderLogsTable(filtered);
  });
}

// 데이터 로딩
async function loadLogs() {
  const tbody = $("logsBody");
  tbody.innerHTML =
    '<tr><td colspan="3" class="empty-state">로그 데이터 로딩 중…</td></tr>';

  try {
    const data = await apiGet("logs");

    if (!data?.rows) {
      tbody.innerHTML =
        '<tr><td colspan="3" class="empty-state">로그 데이터를 불러오지 못했습니다.</td></tr>';
      return;
    }

    logsCache = data.rows;

    const kw = ($("searchLogs")?.value || "").trim().toLowerCase();
    kw
      ? renderLogsTable(
          logsCache.filter((row) =>
            getLogSearchFields(row).some((v) =>
              String(v ?? "").toLowerCase().includes(kw)
            )
          )
        )
      : renderLogsTable(logsCache);

  } catch (e) {
    console.error("로그 데이터 로딩 실패:", e);
  }
}

/* ========== 초기화 ========== */

document.addEventListener("DOMContentLoaded", () => {
  if (!ensureLoggedIn()) return;

  loadKorualUser();
  initSidebarNav();
  initThemeToggle();
  initMobileMenu();
  initRefreshButton();
  initLogoutButton();

  initMemberSearch();
  initOrdersSearch();
  initProductsSearch();
  initStockSearch();
  initLogsSearch();

  pingApi();
  loadDashboardData();
});
