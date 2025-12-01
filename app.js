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
let logsCache     = [];   // 로그 기능

// API 주소
const API_BASE =
  "YOUR_API_URL_HERE";

/* GET API */
async function apiGet(target, extraParams = {}) {
  const url = new URL(API_BASE);
  url.searchParams.set("target", target);

  Object.entries(extraParams).forEach(([k, v]) => {
    if (v !== "" && v != null) url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

/* 숫자/금액 포맷 */
function fmtNumber(v) {
  if (v == null || v === "" || isNaN(v)) return "-";
  return Number(v).toLocaleString("ko-KR");
}
function fmtCurrency(v) {
  if (v == null || v === "" || isNaN(v)) return "-";
  return Number(v).toLocaleString("ko-KR") + "원";
}

/* ========== 0. 로그인 보호 ========== */

function ensureLoggedIn() {
  try {
    const raw = localStorage.getItem("korual_user");
    if (!raw) return window.location.replace("index.html");

    const user = JSON.parse(raw);
    if (!user?.username) return window.location.replace("index.html");

    return true;
  } catch (e) {
    return window.location.replace("index.html");
  }
}

/* ========== 1. 로그인 유저 표시 ========== */

function loadKorualUser() {
  try {
    const raw = localStorage.getItem("korual_user");
    if (!raw) return;

    const user = JSON.parse(raw);
    $("welcomeUser").textContent = user.full_name || user.username;
  } catch {}
}

/* ========== 2. 사이드바 네비 ========== */

function initSidebarNav() {
  const links = $$(".nav-link");
  const sections = $$(".section");

  function activate(key) {
    links.forEach((btn) => btn.classList.toggle("active", btn.dataset.section === key));
    sections.forEach((sec) => sec.classList.toggle("active", sec.id === "section-" + key));
  }

  links.forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.section;
      activate(key);

      switch (key) {
        case "dashboard": loadDashboardData(); break;
        case "members":   loadMembers(); break;
        case "orders":    loadOrders(); break;
        case "products":  loadProducts(); break;
        case "stock":     loadStock(); break;
        case "logs":      loadLogs(); break;
      }
    });
  });

  activate("dashboard");
}

/* ========== 3. 테마 토글 ========== */

function applyTheme(mode) {
  document.body.classList.toggle("theme-dark", mode === "dark");
  localStorage.setItem("korual-theme", mode);
}

function initThemeToggle() {
  applyTheme(localStorage.getItem("korual-theme") || "light");
  $("themeToggle").onclick = () => {
    const cur = localStorage.getItem("korual-theme") || "light";
    applyTheme(cur === "light" ? "dark" : "light");
  };
}

/* ========== 4. 모바일 메뉴 ========== */

function initMobileMenu() {
  const sidebar = document.querySelector(".sidebar");
  const backdrop = $("sidebarBackdrop");
  const toggle = $("menuToggle");

  toggle.onclick = () => sidebar.classList.add("open");
  backdrop.onclick = () => sidebar.classList.remove("open");

  $$(".nav-link").forEach((btn) => {
    btn.onclick = () => sidebar.classList.remove("open");
  });
}

/* ========== 5. API 상태 표시 ========== */

function setApiStatus(ok, msg) {
  const box = document.querySelector(".api-status");
  box.classList.toggle("ok", ok);
  box.classList.toggle("error", !ok);
  box.textContent = msg;
}

async function pingApi() {
  try {
    const res = await apiGet("ping");
    setApiStatus(true, "API 연결 정상");
  } catch {
    setApiStatus(false, "API 오류");
  }
}

/* ========== 6. 대시보드 ========== */

function updateDashboardCards(d) {
  if (!d) return;
  $("cardTotalProducts").textContent = fmtNumber(d.totalProducts);
  $("cardTotalOrders").textContent   = fmtNumber(d.totalOrders);
  $("cardTotalRevenue").textContent  = fmtCurrency(d.totalRevenue);
  $("cardTotalMembers").textContent  = fmtNumber(d.totalMembers);

  $("todayOrders").textContent       = fmtNumber(d.todayOrders);
  $("todayRevenue").textContent      = fmtCurrency(d.todayRevenue);
  $("todayPending").textContent      = fmtNumber(d.todayPending);
}

function updateRecentOrdersTable(list) {
  const tbody = $("recentOrdersBody");
  tbody.innerHTML = "";

  if (!list?.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">최근 주문 없음</td></tr>`;
    return;
  }

  list.forEach((r) => {
    const tr = document.createElement("tr");
    const cells = [
      r.order_date,
      r.order_no,
      r.item_name,
      r.qty,
      fmtCurrency(r.amount),
      r.channel,
      r.status
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
  const tbody = $("recentOrdersBody");
  tbody.innerHTML = `<tr><td colspan="7">로딩중…</td></tr>`;
  try {
    const data = await apiGet("dashboard");
    updateDashboardCards(data);
    updateRecentOrdersTable(data.recentOrders);
  } catch {}
}

/* ========== 7. 로그아웃 ========== */

function initLogoutButton() {
  $("btnLogout").onclick = () => {
    localStorage.removeItem("korual_user");
    location.replace("index.html");
  };
}

/* ================================================================= */
/* =========================== 9. 회원 관리 ========================= */
/* ================================================================= */

function getMemberSearchFields(r) {
  return [
    r["회원번호"], r["이름"], r["전화번호"], r["이메일"],
    r["가입일"], r["채널"], r["등급"], r["누적매출"],
    r["포인트"], r["최근주문일"], r["메모"]
  ];
}

function renderMembersTable(list) {
  const tbody = $("membersBody");
  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="11" class="empty-state">회원 없음</td></tr>`;
    return;
  }

  list.forEach((r) => {
    const tr = document.createElement("tr");

    const cells = [
      r["회원번호"],
      r["이름"],
      r["전화번호"],
      r["이메일"],
      r["가입일"],
      r["채널"],
      r["등급"],
      fmtCurrency(r["누적매출"]),
      fmtNumber(r["포인트"]),
      r["최근주문일"],
      r["메모"]
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
  $("searchMembers").oninput = () => {
    const kw = $("searchMembers").value.toLowerCase();

    if (!kw) return renderMembersTable(membersCache);

    const filtered = membersCache.filter((r) =>
      getMemberSearchFields(r).some((v) =>
        String(v ?? "").toLowerCase().includes(kw)
      )
    );
    renderMembersTable(filtered);
  };
}

async function loadMembers() {
  $("membersBody").innerHTML = `<tr><td colspan="11">로딩중…</td></tr>`;
  try {
    const data = await apiGet("members");
    membersCache = data.rows;
    renderMembersTable(membersCache);
  } catch {}
}

/* ================================================================= */
/* =========================== 10. 주문 관리 ======================== */
/* ================================================================= */

/* 🔥 회원번호 추가됨 */
function getOrderSearchFields(r) {
  return [
    r["회원번호"],
    r["날짜"] || r["주문일자"],
    r["주문번호"],
    r["고객명"],
    r["상품명"],
    r["수량"],
    r["금액"],
    r["상태"]
  ];
}

/* 🔥 회원번호 컬럼 추가 */
function renderOrdersTable(list) {
  const tbody = $("ordersBody");
  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">주문 없음</td></tr>`;
    return;
  }

  list.forEach((r) => {
    const tr = document.createElement("tr");

    const cells = [
      r["회원번호"],            // ★ 추가됨
      r["날짜"] ?? r["주문일자"],
      r["주문번호"],
      r["고객명"],
      r["상품명"],
      r["수량"],
      fmtCurrency(r["금액"]),
      r["상태"]
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
  $("searchOrders").oninput = () => {
    const kw = $("searchOrders").value.toLowerCase();
    if (!kw) return renderOrdersTable(ordersCache);

    const filtered = ordersCache.filter((r) =>
      getOrderSearchFields(r).some((v) =>
        String(v ?? "").toLowerCase().includes(kw)
      )
    );
    renderOrdersTable(filtered);
  };
}

async function loadOrders() {
  $("ordersBody").innerHTML = `<tr><td colspan="8">로딩중…</td></tr>`;
  try {
    const data = await apiGet("orders");
    ordersCache = data.rows;
    renderOrdersTable(ordersCache);
  } catch {}
}

/* ================================================================= */
/* =========================== 11. 상품 관리 ======================== */
/* ================================================================= */

function getProductSearchFields(r) {
  return [
    r["상품코드"], r["상품명"], r["옵션"], r["판매가"],
    r["재고"], r["채널"], r["카테고리"], r["브랜드"]
  ];
}

function renderProductsTable(list) {
  const tbody = $("productsBody");
  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5">상품 없음</td></tr>`;
    return;
  }

  list.forEach((r) => {
    const tr = document.createElement("tr");

    const cells = [
      r["상품코드"],
      r["상품명"],
      r["옵션"],
      fmtCurrency(r["판매가"]),
      fmtNumber(r["재고"])
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
  $("searchProducts").oninput = () => {
    const kw = $("searchProducts").value.toLowerCase();
    if (!kw) return renderProductsTable(productsCache);

    const filtered = productsCache.filter((r) =>
      getProductSearchFields(r).some((v) =>
        String(v ?? "").toLowerCase().includes(kw)
      )
    );
    renderProductsTable(filtered);
  };
}

async function loadProducts() {
  $("productsBody").innerHTML = `<tr><td colspan="5">로딩중…</td></tr>`;
  try {
    const data = await apiGet("products");
    productsCache = data.rows;
    renderProductsTable(productsCache);
  } catch {}
}

/* ================================================================= */
/* =========================== 12. 재고 관리 ======================== */
/* ================================================================= */

function getStockSearchFields(r) {
  return [
    r["상품코드"], r["상품명"], r["현재 재고"],
    r["안전 재고"], r["상태"], r["창고"], r["채널"]
  ];
}

function renderStockTable(list) {
  const tbody = $("stockBody");
  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5">재고 없음</td></tr>`;
    return;
  }

  list.forEach((r) => {
    const tr = document.createElement("tr");

    const cells = [
      r["상품코드"],
      r["상품명"],
      fmtNumber(r["현재 재고"]),
      fmtNumber(r["안전 재고"]),
      r["상태"]
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
  $("searchStock").oninput = () => {
    const kw = $("searchStock").value.toLowerCase();
    if (!kw) return renderStockTable(stockCache);

    const filtered = stockCache.filter((r) =>
      getStockSearchFields(r).some((v) =>
        String(v ?? "").toLowerCase().includes(kw)
      )
    );
    renderStockTable(filtered);
  };
}

async function loadStock() {
  $("stockBody").innerHTML = `<tr><td colspan="5">로딩중…</td></tr>`;
  try {
    const data = await apiGet("stock");
    stockCache = data.rows;
    renderStockTable(stockCache);
  } catch {}
}

/* ================================================================= */
/* =========================== 14. 로그 모니터링 ==================== */
/* ================================================================= */

function getLogSearchFields(r) {
  return [r["시간"], r["타입"], r["메시지"]];
}

function renderLogsTable(list) {
  const tbody = $("logsBody");
  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="3">로그 없음</td></tr>`;
    return;
  }

  list.forEach((r) => {
    const tr = document.createElement("tr");
    const cells = [r["시간"], r["타입"], r["메시지"]];

    cells.forEach((v) => {
      const td = document.createElement("td");
      td.textContent = v ?? "-";
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function initLogsSearch() {
  $("searchLogs").oninput = () => {
    const kw = $("searchLogs").value.toLowerCase();
    if (!kw) return renderLogsTable(logsCache);

    const filtered = logsCache.filter((r) =>
      getLogSearchFields(r).some((v) =>
        String(v ?? "").toLowerCase().includes(kw)
      )
    );
    renderLogsTable(filtered);
  };
}

async function loadLogs() {
  $("logsBody").innerHTML = `<tr><td colspan="3">로딩중…</td></tr>`;
  try {
    const data = await apiGet("logs");
    logsCache = data.rows;
    renderLogsTable(logsCache);
  } catch {}
}

/* ================================================================= */
/* =========================== 초기화 =============================== */
/* ================================================================= */

document.addEventListener("DOMContentLoaded", () => {
  if (!ensureLoggedIn()) return;

  loadKorualUser();
  initSidebarNav();
  initThemeToggle();
  initMobileMenu();
  initLogoutButton();

  initMemberSearch();
  initOrdersSearch();
  initProductsSearch();
  initStockSearch();
  initLogsSearch();

  pingApi();
  loadDashboardData();
});
