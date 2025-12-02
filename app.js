/******************************************************
 * KORUAL CONTROL CENTER – app.js (하이엔드 업그레이드)
 * - 로그인 세션 확인
 * - API 실시간 모니터링 + 로딩 스피너
 * - 토스트 알림
 * - 대시보드 카드 + 최근주문 + 매출 차트(Chart.js)
 * - 회원/주문: 검색 + 정렬 + 페이징
 * - 상품/재고/로그: 검색
 * - CRUD: deleteRow(행 삭제) 연동
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

const API_SECRET = "KORUAL-ONLY"; // code.gs 의 API_SECRET 과 동일해야 함

let activeRequests = 0;

function showSpinner() {
  const layer = $("globalSpinner");
  if (!layer) return;
  activeRequests++;
  layer.classList.remove("hidden");
}
function hideSpinner() {
  const layer = $("globalSpinner");
  if (!layer) return;
  activeRequests = Math.max(0, activeRequests - 1);
  if (activeRequests === 0) {
    layer.classList.add("hidden");
  }
}

function showToast(msg, type = "info") {
  const box = $("toastContainer");
  if (!box) return;
  const div = document.createElement("div");
  div.className = "toast toast-" + type;
  div.textContent = msg;
  box.appendChild(div);

  setTimeout(() => {
    div.classList.add("hide");
  }, 2500);
  setTimeout(() => {
    div.remove();
  }, 3100);
}

/* GET */
async function apiGet(target) {
  const url = `${API_BASE}?target=${encodeURIComponent(target)}`;
  showSpinner();
  const t0 = performance.now();
  try {
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok || json.ok === false) {
      throw new Error(json.error || "API 오류");
    }
    updatePing(performance.now() - t0);
    return json;
  } finally {
    hideSpinner();
  }
}

/* POST (CRUD) */
async function apiPost(action, sheet, extra = {}) {
  const body = {
    secret: API_SECRET,
    target: action, // updateCell / addRow / deleteRow / bulkReplace
    sheet,
    ...extra
  };

  showSpinner();
  try {
    const res  = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok || json.ok === false) {
      throw new Error(json.error || "API POST 실패");
    }
    return json;
  } finally {
    hideSpinner();
  }
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

/* ===================================================
   2) 로그인 세션 확인 + 사용자 표시
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
   3) 사이드바 / 모바일 메뉴 / 테마
=================================================== */
function initSidebar() {
  const links = $$(".nav-link");
  const sections = $$(".section");

  function activate(key) {
    links.forEach(btn =>
      btn.classList.toggle("active", btn.dataset.section === key)
    );
    sections.forEach(sec =>
      sec.classList.toggle("active", sec.id === "section-" + key)
    );
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

  // 대시보드 먼저
  activate("dashboard");
}

function initMobileMenu() {
  const sidebar  = document.querySelector(".sidebar");
  const backdrop = $("sidebarBackdrop");
  const toggle   = $("menuToggle");

  if (!sidebar || !backdrop || !toggle) return;

  toggle.onclick = () => sidebar.classList.add("open");
  backdrop.onclick = () => sidebar.classList.remove("open");

  $$(".nav-link").forEach(btn => {
    btn.addEventListener("click", () => sidebar.classList.remove("open"));
  });
}

function applyTheme(mode) {
  document.body.classList.toggle("theme-dark", mode === "dark");
  localStorage.setItem("korual-theme", mode);
}

function initTheme() {
  const initial = localStorage.getItem("korual-theme") || "light";
  applyTheme(initial);

  const btn = $("themeToggle");
  if (!btn) return;
  btn.onclick = () => {
    const cur = localStorage.getItem("korual-theme") || "light";
    applyTheme(cur === "light" ? "dark" : "light");
  };
}

/* ===================================================
   4) API 상태 / Ping
=================================================== */
function setApiStatus(ok, msg) {
  const el = document.querySelector(".api-status");
  if (!el) return;
  el.classList.toggle("ok", ok);
  el.classList.toggle("error", !ok);
  el.textContent = msg;
}
function updatePing(ms) {
  const el = $("apiPing");
  if (!el) return;
  el.textContent = `${Math.round(ms)} ms`;
}
async function pingApi() {
  try {
    await apiGet("ping");
    setApiStatus(true, "● API 연결 정상");
  } catch (e) {
    setApiStatus(false, "● API 오류");
    showToast("API 연결 실패: " + e.message, "error");
  }
}

/* ===================================================
   5) 대시보드 + Chart.js
=================================================== */
let ordersChartInstance = null;

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
      r.order_date,
      r.order_no,
      r.item_name,
      r.qty,
      fmtCurrency(r.amount),
      r.channel,
      r.status
    ].forEach(v => {
      const td = document.createElement("td");
      td.textContent = v ?? "-";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function renderOrdersChart(recentOrders) {
  const canvas = $("ordersChart");
  if (!canvas || typeof Chart === "undefined") return;

  // 날짜별 매출 합산
  const byDate = {};
  (recentOrders || []).forEach(r => {
    const d = r.order_date || "";
    const amt = Number(r.amount || 0);
    if (!d) return;
    byDate[d] = (byDate[d] || 0) + amt;
  });

  const labels = Object.keys(byDate).sort();
  const data   = labels.map(d => byDate[d]);

  const ctx = canvas.getContext("2d");
  if (ordersChartInstance) {
    ordersChartInstance.destroy();
  }

  ordersChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "일별 매출",
          data,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: { maxTicksLimit: 7 }
        },
        y: {
          ticks: {
            callback: (v) => v.toLocaleString("ko-KR") + "원"
          }
        }
      }
    }
  });
}

async function loadDashboard() {
  $("recentOrdersBody").innerHTML =
    `<tr><td colspan="7" class="empty-state">로딩중…</td></tr>`;

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
    renderOrdersChart(d.recentOrders || []);
  } catch (e) {
    console.error(e);
    showToast("대시보드 로드 실패: " + e.message, "error");
  }
}

/* ===================================================
   6) 로그아웃
=================================================== */
function initLogout() {
  const btn = $("btnLogout");
  if (!btn) return;
  btn.onclick = () => {
    localStorage.removeItem("korual_user");
    location.replace("index.html");
  };
}

/* ===================================================
   7) 공통 테이블 렌더 함수
=================================================== */
function makeTable(id, rows, cols, emptyText) {
  const tbody = $(id);
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!rows?.length) {
    tbody.innerHTML =
      `<tr><td colspan="${cols}" class="empty-state">${emptyText}</td></tr>`;
    return;
  }

  rows.forEach(row => {
    const tr = document.createElement("tr");
    row.forEach(val => {
      const td = document.createElement("td");
      td.textContent = val ?? "-";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

/* ===================================================
   8) 회원관리 (검색 + 정렬 + 페이징)
=================================================== */
let membersCache     = [];
let membersFiltered  = [];
let membersPage      = 1;
const MEMBERS_PER_PAGE = 20;
let membersSortKey   = null;
let membersSortDir   = "asc";

function mapMemberRow(r) {
  return [
    r["회원번호"], r["이름"], r["전화번호"], r["이메일"],
    r["가입일"], r["채널"], r["등급"], fmtCurrency(r["누적매출"]),
    fmtNumber(r["포인트"]), r["최근주문일"], r["메모"]
  ];
}

function renderMembers() {
  const total = membersFiltered.length;
  const totalPages = Math.max(1, Math.ceil(total / MEMBERS_PER_PAGE));
  if (membersPage > totalPages) membersPage = totalPages;

  const start = (membersPage - 1) * MEMBERS_PER_PAGE;
  const end   = start + MEMBERS_PER_PAGE;
  const slice = membersFiltered.slice(start, end);

  makeTable("membersBody", slice.map(mapMemberRow), 11, "회원 없음");

  const pager = $("membersPager");
  if (!pager) return;
  pager.innerHTML = "";

  const prev = document.createElement("button");
  prev.textContent = "이전";
  prev.disabled = membersPage <= 1;
  prev.onclick = () => {
    membersPage--;
    renderMembers();
  };

  const info = document.createElement("span");
  info.textContent = `${membersPage} / ${totalPages}`;

  const next = document.createElement("button");
  next.textContent = "다음";
  next.disabled = membersPage >= totalPages;
  next.onclick = () => {
    membersPage++;
    renderMembers();
  };

  pager.appendChild(prev);
  pager.appendChild(info);
  pager.appendChild(next);
}

function sortMembers() {
  if (!membersSortKey) return renderMembers();
  const dir = membersSortDir === "asc" ? 1 : -1;
  membersFiltered.sort((a, b) => {
    const av = a[membersSortKey] ?? "";
    const bv = b[membersSortKey] ?? "";
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
  renderMembers();
}

function filterMembers() {
  const kw = $("searchMembers")?.value?.toLowerCase() || "";
  if (!kw) {
    membersFiltered = [...membersCache];
  } else {
    membersFiltered = membersCache.filter(obj =>
      Object.values(obj).some(v => String(v ?? "").toLowerCase().includes(kw))
    );
  }
  membersPage = 1;
  sortMembers();
}

function initMemberSort() {
  const header = document.querySelector("#section-members thead");
  if (!header) return;
  header.querySelectorAll("th").forEach(th => {
    const label = th.textContent.trim();
    th.style.cursor = "pointer";
    th.addEventListener("click", () => {
      const keyMap = {
        "회원번호": "회원번호",
        "이름": "이름",
        "누적매출": "누적매출",
        "포인트": "포인트",
        "등급": "등급"
      };
      const key = keyMap[label];
      if (!key) return;

      if (membersSortKey === key) {
        membersSortDir = membersSortDir === "asc" ? "desc" : "asc";
      } else {
        membersSortKey = key;
        membersSortDir = "asc";
      }
      sortMembers();
    });
  });
}

async function loadMembers() {
  $("membersBody").innerHTML = `<tr><td colspan="11">로딩중…</td></tr>`;
  try {
    const d = await apiGet("members");
    membersCache = d.rows || [];
    membersFiltered = [...membersCache];
    membersPage = 1;
    sortMembers();
  } catch (e) {
    console.error(e);
    showToast("회원 데이터 로드 실패: " + e.message, "error");
  }
}

/* ===================================================
   9) 주문관리 (검색 + 정렬 + 페이징)
=================================================== */
let ordersCache     = [];
let ordersFiltered  = [];
let ordersPage      = 1;
const ORDERS_PER_PAGE = 20;
let ordersSortKey   = null;
let ordersSortDir   = "desc"; // 기본: 최신일자 우선

function mapOrderRow(r) {
  return [
    r["회원번호"],
    r["날짜"] ?? r["주문일자"],
    r["주문번호"],
    r["고객명"],
    r["상품명"],
    r["수량"],
    fmtCurrency(r["금액"]),
    r["상태"]
  ];
}

function renderOrdersTablePaged() {
  const total = ordersFiltered.length;
  const totalPages = Math.max(1, Math.ceil(total / ORDERS_PER_PAGE));
  if (ordersPage > totalPages) ordersPage = totalPages;

  const start = (ordersPage - 1) * ORDERS_PER_PAGE;
  const end   = start + ORDERS_PER_PAGE;
  const slice = ordersFiltered.slice(start, end);

  makeTable("ordersBody", slice.map(mapOrderRow), 8, "주문 없음");

  const pager = $("ordersPager");
  if (!pager) return;
  pager.innerHTML = "";

  const prev = document.createElement("button");
  prev.textContent = "이전";
  prev.disabled = ordersPage <= 1;
  prev.onclick = () => {
    ordersPage--;
    renderOrdersTablePaged();
  };

  const info = document.createElement("span");
  info.textContent = `${ordersPage} / ${totalPages}`;

  const next = document.createElement("button");
  next.textContent = "다음";
  next.disabled = ordersPage >= totalPages;
  next.onclick = () => {
    ordersPage++;
    renderOrdersTablePaged();
  };

  pager.appendChild(prev);
  pager.appendChild(info);
  pager.appendChild(next);
}

function sortOrders() {
  if (!ordersSortKey) return renderOrdersTablePaged();
  const dir = ordersSortDir === "asc" ? 1 : -1;
  ordersFiltered.sort((a, b) => {
    const av = a[ordersSortKey] ?? "";
    const bv = b[ordersSortKey] ?? "";
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
  renderOrdersTablePaged();
}

function filterOrders() {
  const kw = $("searchOrders")?.value?.toLowerCase() || "";
  if (!kw) {
    ordersFiltered = [...ordersCache];
  } else {
    ordersFiltered = ordersCache.filter(obj =>
      Object.values(obj).some(v => String(v ?? "").toLowerCase().includes(kw))
    );
  }
  ordersPage = 1;
  sortOrders();
}

function initOrdersSort() {
  const header = document.querySelector("#section-orders thead");
  if (!header) return;
  header.querySelectorAll("th").forEach(th => {
    const label = th.textContent.trim();
    th.style.cursor = "pointer";
    th.addEventListener("click", () => {
      const keyMap = {
        "날짜": "날짜",
        "주문번호": "주문번호",
        "고객명": "고객명",
        "금액": "금액",
        "상태": "상태"
      };
      const key = keyMap[label];
      if (!key) return;

      if (ordersSortKey === key) {
        ordersSortDir = ordersSortDir === "asc" ? "desc" : "asc";
      } else {
        ordersSortKey = key;
        ordersSortDir = "desc";
      }
      sortOrders();
    });
  });
}

async function loadOrders() {
  $("ordersBody").innerHTML = `<tr><td colspan="8">로딩중…</td></tr>`;
  try {
    const d = await apiGet("orders");
    ordersCache = d.rows || [];
    ordersFiltered = [...ordersCache];
    ordersPage = 1;
    // 기본 정렬 키: 날짜 또는 주문일자
    ordersSortKey = "날짜" in (ordersCache[0] || {}) ? "날짜" : "주문일자";
    ordersSortDir = "desc";
    sortOrders();
  } catch (e) {
    console.error(e);
    showToast("주문 데이터 로드 실패: " + e.message, "error");
  }
}

/* ===================================================
   10) 상품관리 (검색)
=================================================== */
let productsCache = [];

function mapProductRow(r) {
  return [
    r["상품코드"],
    r["상품명"],
    r["옵션"],
    fmtCurrency(r["판매가"]),
    fmtNumber(r["재고"])
  ];
}

function filterProducts() {
  const kw = $("searchProducts")?.value?.toLowerCase() || "";
  let list = productsCache;
  if (kw) {
    list = productsCache.filter(obj =>
      Object.values(obj).some(v => String(v ?? "").toLowerCase().includes(kw))
    );
  }
  makeTable("productsBody", list.map(mapProductRow), 5, "상품 없음");
}

async function loadProducts() {
  $("productsBody").innerHTML = `<tr><td colspan="5">로딩중…</td></tr>`;
  try {
    const d = await apiGet("products");
    productsCache = d.rows || [];
    filterProducts();
  } catch (e) {
    console.error(e);
    showToast("상품 데이터 로드 실패: " + e.message, "error");
  }
}

/* ===================================================
   11) 재고관리 (검색)
=================================================== */
let stockCache = [];

function mapStockRow(r) {
  return [
    r["상품코드"],
    r["상품명"],
    fmtNumber(r["현재 재고"]),
    fmtNumber(r["안전 재고"]),
    r["상태"],
    r["창고"],
    r["채널"]
  ];
}

function filterStock() {
  const kw = $("searchStock")?.value?.toLowerCase() || "";
  let list = stockCache;
  if (kw) {
    list = stockCache.filter(obj =>
      Object.values(obj).some(v => String(v ?? "").toLowerCase().includes(kw))
    );
  }
  makeTable("stockBody", list.map(mapStockRow), 7, "재고 없음");
}

async function loadStock() {
  $("stockBody").innerHTML = `<tr><td colspan="7">로딩중…</td></tr>`;
  try {
    const d = await apiGet("stock");
    stockCache = d.rows || [];
    filterStock();
  } catch (e) {
    console.error(e);
    showToast("재고 데이터 로드 실패: " + e.message, "error");
  }
}

/* ===================================================
   12) 로그 모니터링 (검색)
=================================================== */
let logsCache = [];

function mapLogRow(r) {
  return [ r["시간"], r["타입"], r["메시지"] ];
}

function filterLogs() {
  const kw = $("searchLogs")?.value?.toLowerCase() || "";
  let list = logsCache;
  if (kw) {
    list = logsCache.filter(obj =>
      Object.values(obj).some(v => String(v ?? "").toLowerCase().includes(kw))
    );
  }
  makeTable("logsBody", list.map(mapLogRow), 3, "로그 없음");
}

async function loadLogs() {
  $("logsBody").innerHTML = `<tr><td colspan="3">로딩중…</td></tr>`;
  try {
    const d = await apiGet("logs");
    logsCache = d.rows || [];
    filterLogs();
  } catch (e) {
    console.error(e);
    showToast("로그 데이터 로드 실패: " + e.message, "error");
  }
}

/* ===================================================
   13) CRUD – deleteRow 예시 (모달 연동)
=================================================== */

function initDeleteHandler() {
  const btn = $("rowDeleteConfirm");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const sheet    = btn.dataset.sheet;
    const rowIndex = Number(btn.dataset.rowIndex || 0);

    if (!sheet || !rowIndex) {
      showToast("삭제 정보가 부족합니다.", "error");
      return;
    }

    try {
      await apiPost("deleteRow", sheet, { row: rowIndex });
      showToast("행이 삭제되었습니다.", "success");
      if (window.KORUAL_MODAL?.closeAll) {
        window.KORUAL_MODAL.closeAll();
      }
      refreshAll();
    } catch (e) {
      console.error(e);
      showToast("삭제 실패: " + e.message, "error");
    }
  });
}

/* ===================================================
   14) 자동 새로고침
=================================================== */
function refreshAll() {
  loadDashboard();
  loadMembers();
  loadOrders();
  loadProducts();
  loadStock();
  loadLogs();

  const el = $("last-sync");
  if (el) {
    el.textContent = "마지막 동기화: " +
      new Date().toLocaleString("ko-KR");
  }
}

function initAutoRefresh() {
  const btn = $("btnRefreshAll");
  if (btn) btn.onclick = refreshAll;
  setInterval(refreshAll, 60000); // 1분마다 전체 리프레시
}

/* ===================================================
   15) 초기화
=================================================== */
document.addEventListener("DOMContentLoaded", () => {
  ensureLoggedIn();
  loadUser();
  initSidebar();
  initMobileMenu();
  initTheme();
  initLogout();
  pingApi();

  // 검색 이벤트
  $("searchMembers")?.addEventListener("input", filterMembers);
  $("searchOrders")?.addEventListener("input", filterOrders);
  $("searchProducts")?.addEventListener("input", filterProducts);
  $("searchStock")?.addEventListener("input", filterStock);
  $("searchLogs")?.addEventListener("input", filterLogs);

  // 정렬 이벤트
  initMemberSort();
  initOrdersSort();

  // CRUD deleteRow 모달 버튼
  initDeleteHandler();

  // 최초 로드 + 자동 새로고침
  refreshAll();
  initAutoRefresh();
});
