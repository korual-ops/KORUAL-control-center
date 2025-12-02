/******************************************************
 * KORUAL CONTROL CENTER – app.js (하이엔드 올인원)
 * - 로그인 보호 / 사용자 표시
 * - API 실시간 모니터링 (Ping, Delay Badge)
 * - 라이트/다크 모드
 * - 모바일 사이드바
 * - 대시보드 + 미니 차트
 * - 회원 / 주문 / 상품 / 재고 / 로그
 * - 검색 / 정렬 / 페이징
 * - 수정/삭제 모달 연동 (stub API 포함)
 * - KRC 포인트 / VIP 분석 위젯
 * - 간단 권한(ROLE) 처리
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

/** GET */
async function apiGet(target, extra = {}) {
  const url = new URL(API_BASE);
  url.searchParams.set("target", target);
  Object.entries(extra).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });

  const start = performance.now();
  const res   = await fetch(url.toString());
  const ms    = Math.round(performance.now() - start);
  updatePing(ms);

  if (!res.ok) throw new Error("API 오류: " + res.status);
  return await res.json();
}

/** POST – 백엔드 구현 후 사용 (현재는 실패해도 콘솔만) */
async function apiPost(action, payload) {
  try {
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ target: action, ...payload }),
    });
    if (!res.ok) throw new Error("API POST 오류: " + res.status);
    return await res.json();
  } catch (e) {
    console.warn("[KORUAL] POST 아직 미구현이거나 오류입니다.", action, e);
    throw e;
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
   2) 로그인 보호 + 사용자 표시 + ROLE 적용
=================================================== */

let KORUAL_ROLE = "user";

function ensureLoggedIn() {
  try {
    const raw = localStorage.getItem("korual_user");
    if (!raw) return location.replace("index.html");

    const user = JSON.parse(raw);
    if (!user?.username) return location.replace("index.html");

    // ROLE 기록 (없으면 user)
    KORUAL_ROLE = user.role || user.grade || "user";
  } catch (e) {
    location.replace("index.html");
  }
}

function loadUser() {
  try {
    const raw = localStorage.getItem("korual_user");
    if (!raw) return;
    const user = JSON.parse(raw);
    $("welcomeUser").textContent = user.full_name || user.username || "KORUAL";

    // 권한에 따라 일부 메뉴 숨기기 예시
    if (KORUAL_ROLE !== "admin") {
      const logsLink = document.querySelector('.nav-link[data-section="logs"]');
      logsLink?.classList.add("disabled");
      logsLink?.setAttribute("title", "관리자 전용");
    }
  } catch {}
}

/* ===================================================
   3) 사이드바 네비게이션
=================================================== */

function initSidebar() {
  const links    = $$(".nav-link");
  const sections = $$(".section");

  function activate(k) {
    links.forEach(btn =>
      btn.classList.toggle("active", btn.dataset.section === k)
    );
    sections.forEach(sec =>
      sec.classList.toggle("active", sec.id === "section-" + k)
    );
  }

  links.forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.section;
      if (!key) return;

      // 권한 제한: 로그 섹션은 admin만
      if (key === "logs" && KORUAL_ROLE !== "admin") {
        alert("로그 화면은 관리자만 접근 가능합니다.");
        return;
      }

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
  const sidebar  = document.querySelector(".sidebar");
  const backdrop = $("sidebarBackdrop");
  const toggle   = $("menuToggle");

  if (!sidebar || !backdrop || !toggle) return;

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
  const btn = $("themeToggle");
  if (!btn) return;
  btn.onclick = () => {
    const cur = localStorage.getItem("korual-theme") || "light";
    applyTheme(cur === "light" ? "dark" : "light");
  };
}

/* ===================================================
   6) API 상태 모니터링 (Ping + Status)
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
  if (!el || !ms) return;
  el.textContent = ms + " ms";
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
   7) 대시보드 + 미니 차트 + 지연 주문 배지
=================================================== */

function renderRecentOrders(list) {
  const tbody = $("recentOrdersBody");
  if (!tbody) return;
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

/** 아주 간단한 미니 바차트 (오늘 지표 3개) */
function renderDashboardMiniChart(d) {
  const host = $("dashboardMiniChart");
  if (!host || !d) return;

  const items = [
    { label: "주문",   value: d.todayOrders || 0 },
    { label: "매출",   value: d.todayRevenue || 0 },
    { label: "준비중", value: d.todayPending || 0 }
  ];

  const max = Math.max(...items.map(x => Number(x.value) || 0), 1);
  host.innerHTML = "";

  items.forEach(item => {
    const barWrap = document.createElement("div");
    barWrap.className = "mini-bar";

    const bar = document.createElement("div");
    bar.className = "mini-bar-fill";
    bar.style.height = (40 + (item.value / max) * 60) + "%";

    const lbl = document.createElement("span");
    lbl.className = "mini-bar-label";
    lbl.textContent = `${item.label}: ${fmtNumber(item.value)}`;

    barWrap.appendChild(bar);
    barWrap.appendChild(lbl);
    host.appendChild(barWrap);
  });
}

/** 지연 주문 배지 (상단/사이드 등) */
function updateDelayBadge(delayCount) {
  const badge = $("apiErrorBadge");
  if (!badge) return;

  if (!delayCount) {
    badge.style.display = "none";
    return;
  }
  badge.style.display = "inline-flex";
  badge.textContent   = `배송지연 ${delayCount}건`;
}

async function loadDashboard() {
  const tbody = $("recentOrdersBody");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="7">로딩중…</td></tr>`;
  }

  try {
    const d = await apiGet("dashboard");

    $("cardTotalProducts") && ($("cardTotalProducts").textContent = fmtNumber(d.totalProducts));
    $("cardTotalOrders")   && ($("cardTotalOrders").textContent   = fmtNumber(d.totalOrders));
    $("cardTotalRevenue")  && ($("cardTotalRevenue").textContent  = fmtCurrency(d.totalRevenue));
    $("cardTotalMembers")  && ($("cardTotalMembers").textContent  = fmtNumber(d.totalMembers));

    $("todayOrders")  && ($("todayOrders").textContent  = fmtNumber(d.todayOrders));
    $("todayRevenue") && ($("todayRevenue").textContent = fmtCurrency(d.todayRevenue));
    $("todayPending") && ($("todayPending").textContent = fmtNumber(d.todayPending));

    renderRecentOrders(d.recentOrders);
    renderDashboardMiniChart(d);

    const delayed = (d.recentOrders || []).filter(r =>
      String(r.status || "").includes("지연")
    ).length;
    updateDelayBadge(delayed);
  } catch(e) {
    console.error(e);
  }
}

/* ===================================================
   8) 로그아웃
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
   9) 공통 – 페이징 + 정렬 유틸
=================================================== */

function defaultSorter(a, b, key, dir = 1) {
  const av = a?.[key];
  const bv = b?.[key];

  // 숫자 우선
  const na = Number(av);
  const nb = Number(bv);
  if (!isNaN(na) && !isNaN(nb)) {
    return (na - nb) * dir;
  }
  return String(av ?? "").localeCompare(String(bv ?? ""), "ko-KR") * dir;
}

function createPagination(containerId, state, onChange) {
  const el = $(containerId);
  if (!el) return;

  const totalPages = state.totalPages || 1;
  const page       = state.page || 1;

  if (totalPages <= 1) {
    el.innerHTML = "";
    return;
  }

  el.innerHTML = "";

  const btnPrev = document.createElement("button");
  btnPrev.className = "pager-btn";
  btnPrev.textContent = "〈";
  btnPrev.disabled = page <= 1;
  btnPrev.onclick = () => {
    if (page > 1) {
      state.page = page - 1;
      onChange();
    }
  };
  el.appendChild(btnPrev);

  const info = document.createElement("span");
  info.className = "pager-info";
  info.textContent = `${page} / ${totalPages}`;
  el.appendChild(info);

  const btnNext = document.createElement("button");
  btnNext.className = "pager-btn";
  btnNext.textContent = "〉";
  btnNext.disabled = page >= totalPages;
  btnNext.onclick = () => {
    if (page < totalPages) {
      state.page = page + 1;
      onChange();
    }
  };
  el.appendChild(btnNext);
}

/* 테이블 헤더에 정렬 아이콘 표시 */
function applySortIndicator(thList, state, columns) {
  thList.forEach((th, idx) => {
    const key = columns[idx];
    if (!key) return;
    const active = state.sortKey === key;
    th.dataset.sortKey = key;
    th.dataset.sortDir = active ? (state.sortDir === 1 ? "asc" : "desc") : "";

    th.classList.toggle("sorted", active);
  });
}

/* ===================================================
   10) 회원관리 (검색 + 정렬 + 페이징 + KRC 분석 + 수정/삭제)
=================================================== */

let membersCache = [];
const membersState = {
  page: 1,
  pageSize: 20,
  sortKey: null,
  sortDir: 1,
  totalPages: 1,
};
const MEMBER_COLUMNS = [
  "회원번호","이름","전화번호","이메일",
  "가입일","채널","등급","누적매출",
  "포인트","최근주문일","메모"
];

function calcKrcStats() {
  if (!membersCache.length) {
    $("krcTotalPoints") && ($("krcTotalPoints").textContent = "");
    $("krcAvgPoints")   && ($("krcAvgPoints").textContent   = "");
    $("krcVipCount")    && ($("krcVipCount").textContent    = "");
    return;
  }

  let totalPoints = 0;
  let vipCount    = 0;

  membersCache.forEach(m => {
    const pt = Number(m["포인트"] || 0);
    totalPoints += pt;
    const grade = String(m["등급"] || "");
    if (grade.includes("VIP") || pt >= 100000) vipCount++;
  });

  const avg = totalPoints / membersCache.length;

  $("krcTotalPoints") && ($("krcTotalPoints").textContent = `총 포인트: ${fmtNumber(totalPoints)}`);
  $("krcAvgPoints")   && ($("krcAvgPoints").textContent   = `평균 포인트: ${fmtNumber(avg)}`);
  $("krcVipCount")    && ($("krcVipCount").textContent    = `VIP 회원: ${fmtNumber(vipCount)}명`);
}

function renderMembersTable(rows) {
  const tbody = $("membersBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!rows?.length) {
    tbody.innerHTML = `<tr><td colspan="12" class="empty-state">회원 없음</td></tr>`;
    return;
  }

  // 헤더에 작업 컬럼 추가
  const theadRow = tbody.closest("table")?.querySelector("thead tr");
  if (theadRow && !theadRow.querySelector(".col-actions")) {
    const th = document.createElement("th");
    th.textContent = "작업";
    th.className   = "col-actions";
    theadRow.appendChild(th);
  }

  rows.forEach((r, idx) => {
    const tr = document.createElement("tr");
    MEMBER_COLUMNS.forEach(col => {
      const td = document.createElement("td");
      let val = r[col];
      if (col === "누적매출") val = fmtCurrency(val);
      if (col === "포인트")  val = fmtNumber(val);
      td.textContent = val ?? "-";
      tr.appendChild(td);
    });

    // 작업 버튼
    const actionsTd = document.createElement("td");
    actionsTd.className = "table-actions";
    const rowIndex = r.__rowIndex ?? (idx + 2); // 헤더 1줄 고려한 기본값
    actionsTd.innerHTML = `
      <button class="btn-xxs" data-action="edit" data-entity="members" data-row-index="${rowIndex}">수정</button>
      <button class="btn-xxs btn-danger" data-action="delete" data-entity="members" data-row-index="${rowIndex}">삭제</button>
    `;
    tr.appendChild(actionsTd);
    tbody.appendChild(tr);
  });
}

function applyMemberFilters() {
  const kw   = $("searchMembers")?.value?.toLowerCase() || "";
  let rows   = membersCache.slice();

  if (kw) {
    rows = rows.filter(obj =>
      Object.values(obj).some(v => String(v ?? "").toLowerCase().includes(kw))
    );
  }

  // 정렬
  if (membersState.sortKey) {
    rows.sort((a, b) =>
      defaultSorter(a, b, membersState.sortKey, membersState.sortDir)
    );
  }

  // 페이징 계산
  const { pageSize } = membersState;
  membersState.totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  if (membersState.page > membersState.totalPages) {
    membersState.page = membersState.totalPages;
  }

  const start = (membersState.page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  renderMembersTable(pageRows);
  createPagination("membersPagination", membersState, applyMemberFilters);

  // 헤더 정렬 표시
  const thList = $("membersBody")?.closest("table")?.querySelectorAll("thead th") || [];
  applySortIndicator(Array.from(thList), membersState, MEMBER_COLUMNS);
}

async function loadMembers() {
  const tbody = $("membersBody");
  if (tbody) tbody.innerHTML = `<tr><td colspan="11">로딩중…</td></tr>`;
  try {
    const d = await apiGet("members");
    // __rowIndex 같은게 내려오면 활용, 없으면 그대로 사용
    membersCache = (d.rows || []).map((row, idx) => ({
      ...row,
      __rowIndex: row.__rowIndex ?? (idx + 2),
    }));
    membersState.page = 1;
    applyMemberFilters();
    calcKrcStats();
  } catch (e) {
    console.error(e);
  }
}

/* ===================================================
   11) 주문관리 (검색 + 정렬 + 페이징 + 지연 Badge 연동)
=================================================== */

let ordersCache = [];
const ordersState = {
  page: 1,
  pageSize: 20,
  sortKey: null,
  sortDir: 1,
  totalPages: 1,
};
const ORDER_COLUMNS = [
  "회원번호","날짜","주문번호","고객명",
  "상품명","수량","금액","상태"
];

function renderOrdersTable(rows) {
  const tbody = $("ordersBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!rows?.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state">주문 없음</td></tr>`;
    return;
  }

  const theadRow = tbody.closest("table")?.querySelector("thead tr");
  if (theadRow && !theadRow.querySelector(".col-actions")) {
    const th = document.createElement("th");
    th.textContent = "작업";
    th.className   = "col-actions";
    theadRow.appendChild(th);
  }

  rows.forEach((r, idx) => {
    const tr = document.createElement("tr");
    ORDER_COLUMNS.forEach(col => {
      const td = document.createElement("td");
      let key = col;
      if (col === "날짜") key = r["날짜"] ? "날짜" : "주문일자";
      let val = r[key];
      if (col === "금액") val = fmtCurrency(val);
      td.textContent = val ?? "-";
      tr.appendChild(td);
    });

    const actionsTd = document.createElement("td");
    actionsTd.className = "table-actions";
    const rowIndex = r.__rowIndex ?? (idx + 2);
    actionsTd.innerHTML = `
      <button class="btn-xxs" data-action="edit" data-entity="orders" data-row-index="${rowIndex}">수정</button>
      <button class="btn-xxs btn-danger" data-action="delete" data-entity="orders" data-row-index="${rowIndex}">삭제</button>
    `;
    tr.appendChild(actionsTd);
    tbody.appendChild(tr);
  });
}

function applyOrderFilters() {
  const kw = $("searchOrders")?.value?.toLowerCase() || "";
  let rows = ordersCache.slice();

  if (kw) {
    rows = rows.filter(obj =>
      Object.values(obj).some(v => String(v ?? "").toLowerCase().includes(kw))
    );
  }

  if (ordersState.sortKey) {
    rows.sort((a, b) => defaultSorter(a, b, ordersState.sortKey, ordersState.sortDir));
  }

  const { pageSize } = ordersState;
  ordersState.totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  if (ordersState.page > ordersState.totalPages) {
    ordersState.page = ordersState.totalPages;
  }

  const start    = (ordersState.page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  renderOrdersTable(pageRows);
  createPagination("ordersPagination", ordersState, applyOrderFilters);

  // 정렬 표시
  const thList = $("ordersBody")?.closest("table")?.querySelectorAll("thead th") || [];
  applySortIndicator(Array.from(thList), ordersState, ORDER_COLUMNS);

  // 배송지연 카운트 업데이트
  const delayed = rows.filter(r => String(r["상태"] || "").includes("지연")).length;
  updateDelayBadge(delayed);
}

async function loadOrders() {
  const tbody = $("ordersBody");
  if (tbody) tbody.innerHTML = `<tr><td colspan="8">로딩중…</td></tr>`;
  try {
    const d = await apiGet("orders");
    ordersCache = (d.rows || []).map((row, idx) => ({
      ...row,
      __rowIndex: row.__rowIndex ?? (idx + 2),
    }));
    ordersState.page = 1;
    applyOrderFilters();
  } catch (e) {
    console.error(e);
  }
}

/* ===================================================
   12) 상품관리 (검색 + 정렬 + 페이징 + 수정/삭제)
=================================================== */

let productsCache = [];
const productsState = {
  page: 1,
  pageSize: 20,
  sortKey: null,
  sortDir: 1,
  totalPages: 1,
};
const PRODUCT_COLUMNS = [
  "상품코드","상품명","옵션","판매가","재고"
];

function renderProductsTable(rows) {
  const tbody = $("productsBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!rows?.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">상품 없음</td></tr>`;
    return;
  }

  const theadRow = tbody.closest("table")?.querySelector("thead tr");
  if (theadRow && !theadRow.querySelector(".col-actions")) {
    const th = document.createElement("th");
    th.textContent = "작업";
    th.className   = "col-actions";
    theadRow.appendChild(th);
  }

  rows.forEach((r, idx) => {
    const tr = document.createElement("tr");
    PRODUCT_COLUMNS.forEach(col => {
      const td = document.createElement("td");
      let val = r[col];
      if (col === "판매가") val = fmtCurrency(val);
      if (col === "재고")   val = fmtNumber(val);
      td.textContent = val ?? "-";
      tr.appendChild(td);
    });

    const actionsTd = document.createElement("td");
    actionsTd.className = "table-actions";
    const rowIndex = r.__rowIndex ?? (idx + 2);
    actionsTd.innerHTML = `
      <button class="btn-xxs" data-action="edit" data-entity="products" data-row-index="${rowIndex}">수정</button>
      <button class="btn-xxs btn-danger" data-action="delete" data-entity="products" data-row-index="${rowIndex}">삭제</button>
    `;
    tr.appendChild(actionsTd);
    tbody.appendChild(tr);
  });
}

function applyProductFilters() {
  const kw = $("searchProducts")?.value?.toLowerCase() || "";
  let rows = productsCache.slice();

  if (kw) {
    rows = rows.filter(obj =>
      Object.values(obj).some(v => String(v ?? "").toLowerCase().includes(kw))
    );
  }

  if (productsState.sortKey) {
    rows.sort((a, b) => defaultSorter(a, b, productsState.sortKey, productsState.sortDir));
  }

  const { pageSize } = productsState;
  productsState.totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  if (productsState.page > productsState.totalPages) {
    productsState.page = productsState.totalPages;
  }

  const start    = (productsState.page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  renderProductsTable(pageRows);
  createPagination("productsPagination", productsState, applyProductFilters);

  const thList = $("productsBody")?.closest("table")?.querySelectorAll("thead th") || [];
  applySortIndicator(Array.from(thList), productsState, PRODUCT_COLUMNS);
}

async function loadProducts() {
  const tbody = $("productsBody");
  if (tbody) tbody.innerHTML = `<tr><td colspan="5">로딩중…</td></tr>`;
  try {
    const d = await apiGet("products");
    productsCache = (d.rows || []).map((row, idx) => ({
      ...row,
      __rowIndex: row.__rowIndex ?? (idx + 2),
    }));
    productsState.page = 1;
    applyProductFilters();
  } catch (e) {
    console.error(e);
  }
}

/* ===================================================
   13) 재고관리 (검색 + 정렬 + 페이징 + 수정/삭제)
=================================================== */

let stockCache = [];
const stockState = {
  page: 1,
  pageSize: 20,
  sortKey: null,
  sortDir: 1,
  totalPages: 1,
};
const STOCK_COLUMNS = [
  "상품코드","상품명","현재 재고","안전 재고","상태","창고","채널"
];

function renderStockTable(rows) {
  const tbody = $("stockBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!rows?.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">재고 없음</td></tr>`;
    return;
  }

  const theadRow = tbody.closest("table")?.querySelector("thead tr");
  if (theadRow && !theadRow.querySelector(".col-actions")) {
    const th = document.createElement("th");
    th.textContent = "작업";
    th.className   = "col-actions";
    theadRow.appendChild(th);
  }

  rows.forEach((r, idx) => {
    const tr = document.createElement("tr");
    STOCK_COLUMNS.forEach(col => {
      const td = document.createElement("td");
      let val = r[col];
      if (col === "현재 재고" || col === "안전 재고") val = fmtNumber(val);
      td.textContent = val ?? "-";
      tr.appendChild(td);
    });

    const actionsTd = document.createElement("td");
    actionsTd.className = "table-actions";
    const rowIndex = r.__rowIndex ?? (idx + 2);
    actionsTd.innerHTML = `
      <button class="btn-xxs" data-action="edit" data-entity="stock" data-row-index="${rowIndex}">수정</button>
      <button class="btn-xxs btn-danger" data-action="delete" data-entity="stock" data-row-index="${rowIndex}">삭제</button>
    `;
    tr.appendChild(actionsTd);
    tbody.appendChild(tr);
  });
}

function applyStockFilters() {
  const kw = $("searchStock")?.value?.toLowerCase() || "";
  let rows = stockCache.slice();

  if (kw) {
    rows = rows.filter(obj =>
      Object.values(obj).some(v => String(v ?? "").toLowerCase().includes(kw))
    );
  }

  if (stockState.sortKey) {
    rows.sort((a, b) => defaultSorter(a, b, stockState.sortKey, stockState.sortDir));
  }

  const { pageSize } = stockState;
  stockState.totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  if (stockState.page > stockState.totalPages) {
    stockState.page = stockState.totalPages;
  }

  const start    = (stockState.page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  renderStockTable(pageRows);
  createPagination("stockPagination", stockState, applyStockFilters);

  const thList = $("stockBody")?.closest("table")?.querySelectorAll("thead th") || [];
  applySortIndicator(Array.from(thList), stockState, STOCK_COLUMNS);
}

async function loadStock() {
  const tbody = $("stockBody");
  if (tbody) tbody.innerHTML = `<tr><td colspan="5">로딩중…</td></tr>`;
  try {
    const d = await apiGet("stock");
    stockCache = (d.rows || []).map((row, idx) => ({
      ...row,
      __rowIndex: row.__rowIndex ?? (idx + 2),
    }));
    stockState.page = 1;
    applyStockFilters();
  } catch (e) {
    console.error(e);
  }
}

/* ===================================================
   14) 로그 모니터링 (검색 + 페이징)
=================================================== */

let logsCache = [];
const logsState = {
  page: 1,
  pageSize: 50,
  totalPages: 1,
};

function renderLogsTable(rows) {
  const tbody = $("logsBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!rows?.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty-state">로그 없음</td></tr>`;
    return;
  }

  rows.forEach(r => {
    const tr = document.createElement("tr");
    ["시간","타입","메시지"].forEach(col => {
      const td = document.createElement("td");
      td.textContent = r[col] ?? "-";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function applyLogFilters() {
  const kw = $("searchLogs")?.value?.toLowerCase() || "";
  let rows = logsCache.slice();

  if (kw) {
    rows = rows.filter(obj =>
      Object.values(obj).some(v => String(v ?? "").toLowerCase().includes(kw))
    );
  }

  const { pageSize } = logsState;
  logsState.totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  if (logsState.page > logsState.totalPages) {
    logsState.page = logsState.totalPages;
  }

  const start    = (logsState.page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  renderLogsTable(pageRows);
  createPagination("logsPagination", logsState, applyLogFilters);
}

async function loadLogs() {
  const tbody = $("logsBody");
  if (tbody) tbody.innerHTML = `<tr><td colspan="3">로딩중…</td></tr>`;
  try {
    const d = await apiGet("logs");
    logsCache = d.rows || [];
    logsState.page = 1;
    applyLogFilters();
  } catch (e) {
    console.error(e);
  }
}

/* ===================================================
   15) 수정/삭제 모달 연동
   - window.KORUAL_MODAL(openEdit/openDelete) 전제
   - 백엔드에 updateRow/deleteRow 구현하면 바로 연동
=================================================== */

function initRowActionDelegates() {
  // 테이블 전체에 이벤트 위임
  document.body.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-action]");
    if (!btn) return;

    const action   = btn.dataset.action;
    const entity   = btn.dataset.entity;
    const rowIndex = Number(btn.dataset.rowIndex || "0");
    if (!action || !entity || !rowIndex) return;

    // 수정/삭제는 admin만
    if (KORUAL_ROLE !== "admin") {
      alert("행 수정/삭제는 관리자만 가능합니다.");
      return;
    }

    const cacheMap = {
      members:  membersCache,
      orders:   ordersCache,
      products: productsCache,
      stock:    stockCache,
      logs:     logsCache,
    };
    const cache = cacheMap[entity] || [];
    const row   = cache.find(r => Number(r.__rowIndex || 0) === rowIndex) || cache[rowIndex - 2];

    const sheetMap = {
      members:  "MEMBERS",
      orders:   "ORDERS",
      products: "PRODUCTS",
      stock:    "STOCK",
      logs:     "LOGS",
    };
    const sheet = sheetMap[entity];

    if (!window.KORUAL_MODAL) {
      alert("모달 스크립트(KORUAL_MODAL)가 없습니다.");
      return;
    }

    if (action === "edit") {
      window.KORUAL_MODAL.openEdit({
        entity,
        sheet,
        rowIndex,
        data: row || {},
      });
    } else if (action === "delete") {
      const title =
        row?.["이름"] || row?.["주문번호"] || row?.["상품명"] || JSON.stringify(row || {});
      window.KORUAL_MODAL.openDelete({
        entity,
        sheet,
        rowIndex,
        title,
      });
    }
  });

  // 모달 내 저장/삭제 버튼
  const saveBtn = $("rowEditSave");
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const entity   = saveBtn.dataset.entity;
      const sheet    = saveBtn.dataset.sheet;
      const rowIndex = Number(saveBtn.dataset.rowIndex || "0");
      if (!entity || !sheet || !rowIndex) return;

      const wrap = $("rowEditFields");
      if (!wrap) return;

      const inputs = wrap.querySelectorAll("input[data-field-key]");
      const rowData = {};
      inputs.forEach(inp => {
        rowData[inp.dataset.fieldKey] = inp.value;
      });

      try {
        await apiPost("updateRow", { sheet, rowIndex, rowData });
        alert("저장 요청을 전송했습니다. (백엔드 구현 필요)");

        window.KORUAL_MODAL?.closeAll?.();

        // 수정 후 해당 섹션 데이터 다시 로드
        if (entity === "members")   await loadMembers();
        if (entity === "orders")    await loadOrders();
        if (entity === "products")  await loadProducts();
        if (entity === "stock")     await loadStock();
        if (entity === "logs")      await loadLogs();
      } catch {
        // 이미 apiPost 내부에서 콘솔 경고
      }
    });
  }

  const delBtn = $("rowDeleteConfirm");
  if (delBtn) {
    delBtn.addEventListener("click", async () => {
      const entity   = delBtn.dataset.entity;
      const sheet    = delBtn.dataset.sheet;
      const rowIndex = Number(delBtn.dataset.rowIndex || "0");
      if (!entity || !sheet || !rowIndex) return;

      try {
        await apiPost("deleteRow", { sheet, rowIndex });
        alert("삭제 요청을 전송했습니다. (백엔드 구현 필요)");

        window.KORUAL_MODAL?.closeAll?.();

        if (entity === "members")   await loadMembers();
        if (entity === "orders")    await loadOrders();
        if (entity === "products")  await loadProducts();
        if (entity === "stock")     await loadStock();
        if (entity === "logs")      await loadLogs();
      } catch {}
    });
  }
}

/* ===================================================
   16) 자동 새로고침
=================================================== */

function initAutoRefresh() {
  const btn = $("btnRefreshAll");
  if (btn) btn.onclick = refreshAll;
  setInterval(refreshAll, 60000); // 1분마다 자동
}

function refreshAll() {
  loadDashboard();
  loadMembers();
  loadOrders();
  loadProducts();
  loadStock();
  loadLogs();

  const label = $("last-sync");
  if (label) {
    label.textContent = "마지막 동기화: " +
      new Date().toLocaleString("ko-KR");
  }
}

/* ===================================================
   17) 초기화
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
  $("searchMembers")  ?.addEventListener("input", applyMemberFilters);
  $("searchOrders")   ?.addEventListener("input", applyOrderFilters);
  $("searchProducts") ?.addEventListener("input", applyProductFilters);
  $("searchStock")    ?.addEventListener("input", applyStockFilters);
  $("searchLogs")     ?.addEventListener("input", applyLogFilters);

  // 수정/삭제 모달
  initRowActionDelegates();

  // 최초 로드 + 자동 새로고침
  refreshAll();
  initAutoRefresh();
});
