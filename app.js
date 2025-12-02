/******************************************************
 * KORUAL CONTROL CENTER – app.js (CSV 제거 버전)
 * 로그인 보호 / 사용자 표시 / API실시간 모니터링
 * 다크모드 / 모바일 / 대시보드 / 회원 / 주문 / 상품
 * 재고 / 로그 / 검색 / 자동 새로고침
******************************************************/

/* ===================================================
   0) DOM 헬퍼
=================================================== */
const $  = (id)  => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

/* ===================================================
   1) API 설정
=================================================== */

const API_BASE =
  "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec";

async function apiGet(target) {
  const res = await fetch(`${API_BASE}?target=${target}`);
  if (!res.ok) throw new Error("API 오류");
  return await res.json();
}

function fmtNumber(v) {
  if (v == null || isNaN(v)) return "-";
  return Number(v).toLocaleString("ko-KR");
}

function fmtCurrency(v) {
  if (v == null || isNaN(v)) return "-";
  return Number(v).toLocaleString("ko-KR") + "원";
}

/* ===================================================
   2) 로그인 보호 + 사용자 표시
=================================================== */

function ensureLoggedIn() {
  try {
    const raw = localStorage.getItem("korual_user");
    if (!raw) return location.replace("index.html");
    const user = JSON.parse(raw);
    if (!user?.username) return location.replace("index.html");
  } catch {
    location.replace("index.html");
  }
}

function loadUser() {
  try {
    const raw = localStorage.getItem("korual_user");
    if (!raw) return;
    const user = JSON.parse(raw);
    $("welcomeUser").textContent = user.full_name || user.username;
  } catch {}
}

/* ===================================================
   3) 사이드바 네비게이션
=================================================== */

function initSidebar() {
  const links = $$(".nav-link");
  const sections = $$(".section");

  function activate(k) {
    links.forEach(btn => btn.classList.toggle("active", btn.dataset.section === k));
    sections.forEach(sec => sec.classList.toggle("active", sec.id === "section-" + k));
  }

  links.forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.section;
      activate(key);

      switch (key) {
        case "dashboard": loadDashboard(); break;
        case "members":   loadMembers();   break;
        case "orders":    loadOrders();    break;
        case "products":  loadProducts();  break;
        case "stock":     loadStock();     break;
        case "logs":      loadLogs();      break;
      }
    });
  });

  activate("dashboard");
}

/* ===================================================
   4) 모바일 메뉴
=================================================== */

function initMobileMenu() {
  const sidebar = document.querySelector(".sidebar");
  const backdrop = $("sidebarBackdrop");
  const toggle = $("menuToggle");

  toggle.onclick = () => sidebar.classList.add("open");
  backdrop.onclick = () => sidebar.classList.remove("open");

  $$(".nav-link").forEach(btn => {
    btn.onclick = () => sidebar.classList.remove("open");
  });
}

/* ===================================================
   5) 다크모드
=================================================== */

function applyTheme(mode) {
  document.body.classList.toggle("theme-dark", mode === "dark");
  localStorage.setItem("korual-theme", mode);
}

function initTheme() {
  applyTheme(localStorage.getItem("korual-theme") || "light");
  $("themeToggle").onclick = () => {
    const cur = localStorage.getItem("korual-theme") || "light";
    applyTheme(cur === "light" ? "dark" : "light");
  };
}

/* ===================================================
   6) API 상태 모니터링
=================================================== */

function setApiStatus(ok, msg) {
  const el = document.querySelector(".api-status");
  if (!el) return;
  el.classList.toggle("ok", ok);
  el.classList.toggle("error", !ok);
  el.textContent = msg;
}

async function pingApi() {
  try {
    await apiGet("ping");
    setApiStatus(true, "API 연결 정상");
  } catch {
    setApiStatus(false, "API 오류");
  }
}

/* ===================================================
   7) 대시보드
=================================================== */

function renderRecentOrders(list) {
  const tbody = $("recentOrdersBody");
  tbody.innerHTML = "";

  if (!list?.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">최근 주문 없음</td></tr>`;
    return;
  }

  list.forEach(r => {
    const tr = document.createElement("tr");
    [
      r.order_date, r.order_no, r.item_name, r.qty,
      fmtCurrency(r.amount), r.channel, r.status
    ].forEach(v => {
      const td = document.createElement("td");
      td.textContent = v ?? "-";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

async function loadDashboard() {
  $("recentOrdersBody").innerHTML = `<tr><td colspan="7">로딩중…</td></tr>`;

  try {
    const d = await apiGet("dashboard");

    $("cardTotalProducts").textContent = fmtNumber(d.totalProducts);
    $("cardTotalOrders").textContent   = fmtNumber(d.totalOrders);
    $("cardTotalRevenue").textContent  = fmtCurrency(d.totalRevenue);
    $("cardTotalMembers").textContent  = fmtNumber(d.totalMembers);

    $("todayOrders").textContent       = fmtNumber(d.todayOrders);
    $("todayRevenue").textContent      = fmtCurrency(d.todayRevenue);
    $("todayPending").textContent      = fmtNumber(d.todayPending);

    renderRecentOrders(d.recentOrders);
  } catch(e) {
    console.error(e);
  }
}

/* ===================================================
   8) 로그아웃
=================================================== */

function initLogout() {
  $("btnLogout").onclick = () => {
    localStorage.removeItem("korual_user");
    location.replace("index.html");
  };
}

/* ===================================================
   9) 표 렌더링 공통 함수
=================================================== */

function makeTable(id, rows, cols, emptyText) {
  const tbody = $(id);
  tbody.innerHTML = "";

  if (!rows?.length) {
    tbody.innerHTML = `<tr><td colspan="${cols}" class="empty-state">${emptyText}</td></tr>`;
    return;
  }

  rows.forEach(r => {
    const tr = document.createElement("tr");
    r.forEach(v => {
      const td = document.createElement("td");
      td.textContent = v ?? "-";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

/* ===================================================
   10) 회원관리
=================================================== */

let membersCache = [];

function mapMemberRow(r) {
  return [
    r["회원번호"], r["이름"], r["전화번호"], r["이메일"],
    r["가입일"], r["채널"], r["등급"], fmtCurrency(r["누적매출"]),
    fmtNumber(r["포인트"]), r["최근주문일"], r["메모"]
  ];
}

function filterMembers() {
  const kw = $("searchMembers")?.value?.toLowerCase() || "";
  if (!kw) return makeTable("membersBody", membersCache.map(mapMemberRow), 11, "회원 없음");

  const f = membersCache.filter(obj =>
    Object.values(obj).some(v => String(v ?? "").toLowerCase().includes(kw))
  );
  makeTable("membersBody", f.map(mapMemberRow), 11, "회원 없음");
}

async function loadMembers() {
  $("membersBody").innerHTML = `<tr><td colspan="11">로딩중…</td></tr>`;
  try {
    const d = await apiGet("members");
    membersCache = d.rows || [];
    filterMembers();
  } catch(e){}
}

/* ===================================================
   11) 주문관리
=================================================== */

let ordersCache = [];

function mapOrderRow(r) {
  return [
    r["회원번호"], r["날짜"] ?? r["주문일자"], r["주문번호"], r["고객명"],
    r["상품명"], r["수량"], fmtCurrency(r["금액"]), r["상태"]
  ];
}

function filterOrders() {
  const kw = $("searchOrders")?.value?.toLowerCase() || "";
  if (!kw) return makeTable("ordersBody", ordersCache.map(mapOrderRow), 8, "주문 없음");

  const f = ordersCache.filter(obj =>
    Object.values(obj).some(v => String(v ?? "").toLowerCase().includes(kw))
  );
  makeTable("ordersBody", f.map(mapOrderRow), 8, "주문 없음");
}

async function loadOrders() {
  $("ordersBody").innerHTML = `<tr><td colspan="8">로딩중…</td></tr>`;
  try {
    const d = await apiGet("orders");
    ordersCache = d.rows || [];
    filterOrders();
  } catch(e){}
}

/* ===================================================
   12) 상품관리
=================================================== */

let productsCache = [];

function mapProductRow(r) {
  return [
    r["상품코드"], r["상품명"], r["옵션"],
    fmtCurrency(r["판매가"]), fmtNumber(r["재고"])
  ];
}

function filterProducts() {
  const kw = $("searchProducts")?.value?.toLowerCase() || "";
  if (!kw) return makeTable("productsBody", productsCache.map(mapProductRow), 5, "상품 없음");

  const f = productsCache.filter(obj =>
    Object.values(obj).some(v => String(v ?? "").toLowerCase().includes(kw))
  );
  makeTable("productsBody", f.map(mapProductRow), 5, "상품 없음");
}

async function loadProducts() {
  $("productsBody").innerHTML = `<tr><td colspan="5">로딩중…</td></tr>`;
  try {
    const d = await apiGet("products");
    productsCache = d.rows || [];
    filterProducts();
  } catch(e){}
}

/* ===================================================
   13) 재고관리
=================================================== */

let stockCache = [];

function mapStockRow(r) {
  return [
    r["상품코드"], r["상품명"], fmtNumber(r["현재 재고"]),
    fmtNumber(r["안전 재고"]), r["상태"]
  ];
}

function filterStock() {
  const kw = $("searchStock")?.value?.toLowerCase() || "";
  if (!kw) return makeTable("stockBody", stockCache.map(mapStockRow), 5, "재고 없음");

  const f = stockCache.filter(obj =>
    Object.values(obj).some(v => String(v ?? "").toLowerCase().includes(kw))
  );
  makeTable("stockBody", f.map(mapStockRow), 5, "재고 없음");
}

async function loadStock() {
  $("stockBody").innerHTML = `<tr><td colspan="5">로딩중…</td></tr>`;
  try {
    const d = await apiGet("stock");
    stockCache = d.rows || [];
    filterStock();
  } catch(e){}
}

/* ===================================================
   14) 로그 모니터링
=================================================== */

let logsCache = [];

function mapLogRow(r) {
  return [r["시간"], r["타입"], r["메시지"]];
}

function filterLogs() {
  const kw = $("searchLogs")?.value?.toLowerCase() || "";
  if (!kw) return makeTable("logsBody", logsCache.map(mapLogRow), 3, "로그 없음");

  const f = logsCache.filter(obj =>
    Object.values(obj).some(v => String(v ?? "").toLowerCase().includes(kw))
  );
  makeTable("logsBody", f.map(mapLogRow), 3, "로그 없음");
}

async function loadLogs() {
  $("logsBody").innerHTML = `<tr><td colspan="3">로딩중…</td></tr>`;
  try {
    const d = await apiGet("logs");
    logsCache = d.rows || [];
    filterLogs();
  } catch(e){}
}

/* ===================================================
   15) 자동 새로고침
=================================================== */

function initAutoRefresh() {
  $("btnRefreshAll").onclick = refreshAll;
  setInterval(refreshAll, 60000);
}

function refreshAll() {
  loadDashboard();
  loadMembers();
  loadOrders();
  loadProducts();
  loadStock();
  loadLogs();

  $("last-sync").textContent = "마지막 동기화: " +
    new Date().toLocaleString("ko-KR");
}

/* ===================================================
   16) 초기화
=================================================== */

document.addEventListener("DOMContentLoaded", () => {
  ensureLoggedIn();
  loadUser();
  initSidebar();
  initMobileMenu();
  initTheme();
  initLogout();
  pingApi();

  $("searchMembers")?.addEventListener("input", filterMembers);
  $("searchOrders")?.addEventListener("input", filterOrders);
  $("searchProducts")?.addEventListener("input", filterProducts);
  $("searchStock")?.addEventListener("input", filterStock);
  $("searchLogs")?.addEventListener("input", filterLogs);

  refreshAll();
  initAutoRefresh();
});
