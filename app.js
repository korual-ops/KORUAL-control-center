/******************************************************
 * KORUAL CONTROL CENTER – app.js (하이엔드 ALL-IN-ONE)
 * 로그인 보호 / 사용자 표시 / API 모니터링
 * 다크모드 / 모바일 / 대시보드 / 회원 / 주문 / 상품
 * 재고 / 로그 / 검색 / 자동 새로고침
 * + CSV Import/Export / KRC 포인트 / 자동 등급 계산
******************************************************/

/* ===================================================
   0) DOM 헬퍼
=================================================== */
const $  = (id)  => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

/* ===================================================
   1) API 설정 & 에러 모니터링
=================================================== */

const API_BASE =
  "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec";

// 최근 API 에러 스택 (간단한 모니터링용)
const apiErrors = [];
const MAX_API_ERRORS = 20;

function recordApiError(place, error) {
  const item = {
    time: new Date().toISOString(),
    place,
    message: error?.message || String(error)
  };
  apiErrors.unshift(item);
  if (apiErrors.length > MAX_API_ERRORS) apiErrors.pop();

  // 에러 뱃지/상태 표시 (있으면만)
  const badge = $("apiErrorBadge");
  if (badge) {
    badge.textContent = apiErrors.length;
    badge.style.display = apiErrors.length ? "inline-flex" : "none";
  }
  console.warn("[KORUAL API ERROR]", place, error);
}

/* GET */
async function apiGet(target, context = "") {
  try {
    const url = `${API_BASE}?target=${encodeURIComponent(target)}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error("API 오류: " + r.status);
    return await r.json();
  } catch (e) {
    recordApiError(`GET:${target}${context ? ":" + context : ""}`, e);
    throw e;
  }
}

/* POST (공통) */
async function apiPost(body, context = "") {
  try {
    const r = await fetch(API_BASE, {
      method: "POST",
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error("API POST 오류: " + r.status);
    return await r.json();
  } catch (e) {
    recordApiError(`POST:${body?.target || "unknown"}${context ? ":" + context : ""}`, e);
    throw e;
  }
}

/* 쓰기 기능 – code.gs 의 doPost와 연동 */
async function apiUpdateCell(sheet, row, col, value) {
  return apiPost({
    secret: "KORUAL-ONLY",
    target: "updateCell",
    sheet,
    row,
    col,
    value
  }, `updateCell:${sheet}`);
}
async function apiAddRow(sheet, values) {
  return apiPost({
    secret: "KORUAL-ONLY",
    target: "addRow",
    sheet,
    values
  }, `addRow:${sheet}`);
}
async function apiDeleteRow(sheet, row) {
  return apiPost({
    secret: "KORUAL-ONLY",
    target: "deleteRow",
    sheet,
    row
  }, `deleteRow:${sheet}`);
}
async function apiBulkReplace(sheet, values) {
  return apiPost({
    secret: "KORUAL-ONLY",
    target: "bulkReplace",
    sheet,
    values
  }, `bulkReplace:${sheet}`);
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
  const links    = $$(".nav-link");
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

/* ===================================================
   4) 모바일 메뉴
=================================================== */

function initMobileMenu() {
  const sidebar  = document.querySelector(".sidebar");
  const backdrop = $("sidebarBackdrop");
  const toggle   = $("menuToggle");

  if (!sidebar || !backdrop || !toggle) return;

  toggle.onclick   = () => sidebar.classList.add("open");
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
  const toggle = $("themeToggle");
  if (!toggle) return;

  toggle.onclick = () => {
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
   9) 공통 테이블 생성 (단순용)
=================================================== */

function makeTable(id, rows, cols, emptyText) {
  const tbody = $(id);
  if (!tbody) return;

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
   10) 회원관리 + KRC/자동등급 계산
=================================================== */

let membersCache = [];

function calcKorualTier(sales) {
  const v = Number(sales || 0);
  if (v >= 100000000) return "BLK";
  if (v >= 50000000)  return "GLD";
  if (v >= 10000000)  return "SLV";
  return "BRZ";
}

function mapMemberRow(r) {
  const totalSales = r["누적매출"];
  const autoTier   = calcKorualTier(totalSales);
  // 시트의 등급 대신 자동등급을 보여주고 싶으면 autoTier 사용
  const showTier = autoTier;

  return [
    r["회원번호"],
    r["이름"],
    r["전화번호"],
    r["이메일"],
    r["가입일"],
    r["채널"],
    showTier,
    fmtCurrency(totalSales),
    fmtNumber(r["포인트"]),
    r["최근주문일"],
    r["메모"]
  ];
}

function filterMembers() {
  const kw = $("searchMembers")?.value?.toLowerCase() || "";
  const base = membersCache || [];
  if (!kw) return makeTable("membersBody", base.map(mapMemberRow), 11, "회원 없음");

  const f = base.filter(obj =>
    Object.values(obj).some(v => String(v ?? "").toLowerCase().includes(kw))
  );
  makeTable("membersBody", f.map(mapMemberRow), 11, "회원 없음");
  updateKrcSummary();  // 필터 기준으로 다시 계산
}

async function loadMembers() {
  const body = $("membersBody");
  if (body) body.innerHTML = `<tr><td colspan="11">로딩중…</td></tr>`;

  try {
    const d = await apiGet("members");
    membersCache = d.rows || [];
    filterMembers();
    updateKrcSummary();  // 전체 기준 KRC 집계
  } catch {}
}

/* KRC 포인트 / LTV 요약 – KRC 대시보드용 */
function updateKrcSummary() {
  if (!membersCache?.length) return;

  const totalPoints = membersCache.reduce((sum, r) => sum + Number(r["포인트"] || 0), 0);
  const avgPoints   = totalPoints / membersCache.length;

  const vipCount = membersCache.filter(r => calcKorualTier(r["누적매출"]) === "BLK").length;

  $("krcTotalPoints") && ($("krcTotalPoints").textContent = fmtNumber(totalPoints));
  $("krcAvgPoints")   && ($("krcAvgPoints").textContent   = fmtNumber(Math.round(avgPoints)));
  $("krcVipCount")    && ($("krcVipCount").textContent    = fmtNumber(vipCount));
}

/* ===================================================
   11) 주문관리
=================================================== */

let ordersCache = [];

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

function filterOrders() {
  const kw = $("searchOrders")?.value?.toLowerCase() || "";
  const base = ordersCache || [];
  if (!kw) return makeTable("ordersBody", base.map(mapOrderRow), 8, "주문 없음");

  const f = base.filter(obj =>
    Object.values(obj).some(v => String(v ?? "").toLowerCase().includes(kw))
  );
  makeTable("ordersBody", f.map(mapOrderRow), 8, "주문 없음");
}

async function loadOrders() {
  const body = $("ordersBody");
  if (body) body.innerHTML = `<tr><td colspan="8">로딩중…</td></tr>`;

  try {
    const d = await apiGet("orders");
    ordersCache = d.rows || [];
    filterOrders();
  } catch {}
}

/* ===================================================
   12) 상품관리
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
  const base = productsCache || [];
  if (!kw) return makeTable("productsBody", base.map(mapProductRow), 5, "상품 없음");

  const f = base.filter(obj =>
    Object.values(obj).some(v => String(v ?? "").toLowerCase().includes(kw))
  );
  makeTable("productsBody", f.map(mapProductRow), 5, "상품 없음");
}

async function loadProducts() {
  const body = $("productsBody");
  if (body) body.innerHTML = `<tr><td colspan="5">로딩중…</td></tr>`;

  try {
    const d = await apiGet("products");
    productsCache = d.rows || [];
    filterProducts();
  } catch {}
}

/* ===================================================
   13) 재고관리 + 자동발주 체크
=================================================== */

let stockCache = [];

function mapStockRow(r) {
  return [
    r["상품코드"],
    r["상품명"],
    fmtNumber(r["현재 재고"]),
    fmtNumber(r["안전 재고"]),
    r["상태"]
  ];
}

function filterStock() {
  const kw = $("searchStock")?.value?.toLowerCase() || "";
  const base = stockCache || [];
  if (!kw) return makeTable("stockBody", base.map(mapStockRow), 5, "재고 없음");

  const f = base.filter(obj =>
    Object.values(obj).some(v => String(v ?? "").toLowerCase().includes(kw))
  );
  makeTable("stockBody", f.map(mapStockRow), 5, "재고 없음");
}

async function loadStock() {
  const body = $("stockBody");
  if (body) body.innerHTML = `<tr><td colspan="5">로딩중…</td></tr>`;

  try {
    const d = await apiGet("stock");
    stockCache = d.rows || [];
    filterStock();
    checkAutoPurchase();
  } catch {}
}

/* 자동 발주 후보 체크 (콘솔/향후 카톡 연동용) */
function checkAutoPurchase() {
  if (!stockCache?.length) return;
  stockCache.forEach(r => {
    const cur  = Number(r["현재 재고"]  || 0);
    const safe = Number(r["안전 재고"] || 0);
    if (cur < safe) {
      console.warn("[자동발주 필요]", r["상품코드"], r["상품명"], `(${cur} / 안전 ${safe})`);
    }
  });
}

/* ===================================================
   14) 로그 모니터링
=================================================== */

let logsCache = [];

function mapLogRow(r) {
  return [
    r["시간"],
    r["타입"],
    r["메시지"]
  ];
}

function filterLogs() {
  const kw = $("searchLogs")?.value?.toLowerCase() || "";
  const base = logsCache || [];
  if (!kw) return makeTable("logsBody", base.map(mapLogRow), 3, "로그 없음");

  const f = base.filter(obj =>
    Object.values(obj).some(v => String(v ?? "").toLowerCase().includes(kw))
  );
  makeTable("logsBody", f.map(mapLogRow), 3, "로그 없음");
}

async function loadLogs() {
  const body = $("logsBody");
  if (body) body.innerHTML = `<tr><td colspan="3">로딩중…</td></tr>`;

  try {
    const d = await apiGet("logs");
    logsCache = d.rows || [];
    filterLogs();
  } catch {}
}

/* ===================================================
   15) CSV Export / Import (엑셀 연동 준비)
=================================================== */

// object[] → CSV 문자열 (간단 버전)
function buildCsvFromRows(rows) {
  if (!rows?.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = String(v ?? "");
    if (s.includes('"') || s.includes(",") || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const headerLine = headers.map(escape).join(",");
  const lines = rows.map(r => headers.map(h => escape(r[h])).join(","));
  return [headerLine].concat(lines).join("\r\n");
}

// CSV 다운로드
async function exportSheetAsCsv(target, filename) {
  try {
    const data = await apiGet(target, "export");
    const rows = data.rows || [];
    if (!rows.length) {
      alert("내보낼 데이터가 없습니다.");
      return;
    }
    const csv = buildCsvFromRows(rows);

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    alert("CSV 내보내기 중 오류가 발생했습니다.");
  }
}

// 파일 input → CSV 파싱 (아주 단순)
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(",");
  const data = lines.slice(1).map(line => {
    const cols = line.split(",");
    const obj = {};
    headers.forEach((h, i) => obj[h] = cols[i] ?? "");
    return obj;
  });
  return { headers, data };
}

// CSV → 시트 전체 덮어쓰기 (bulkReplace)
async function importCsvToSheet(file, sheetKey) {
  if (!file) return;
  const text = await file.text();
  const parsed = parseCsv(text);
  if (!parsed.data.length) {
    alert("CSV에 데이터가 없습니다.");
    return;
  }

  // 2D array로 변환
  const values = [];
  values.push(parsed.headers);
  parsed.data.forEach(obj => {
    const row = parsed.headers.map(h => obj[h] ?? "");
    values.push(row);
  });

  await apiBulkReplace(sheetKey, values);
  alert("CSV 업로드 및 시트 갱신이 완료되었습니다.");
}

// 페이지에 버튼/파일 input이 있을 경우 자동 연결
function initImportExportBindings() {
  // 예: id="btnExportMembers" 클릭 시 members CSV 다운로드
  $("btnExportMembers")?.addEventListener("click", () =>
    exportSheetAsCsv("members", "korual_members.csv")
  );
  $("btnExportOrders")?.addEventListener("click", () =>
    exportSheetAsCsv("orders", "korual_orders.csv")
  );
  $("btnExportProducts")?.addEventListener("click", () =>
    exportSheetAsCsv("products", "korual_products.csv")
  );
  $("btnExportStock")?.addEventListener("click", () =>
    exportSheetAsCsv("stock", "korual_stock.csv")
  );

  // 파일 input 으로 import – 파일 선택 시 자동 업로드
  $("fileImportMembers")?.addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    await importCsvToSheet(f, "MEMBERS");
    loadMembers();
  });

  $("fileImportOrders")?.addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    await importCsvToSheet(f, "ORDERS");
    loadOrders();
  });

  $("fileImportProducts")?.addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    await importCsvToSheet(f, "PRODUCTS");
    loadProducts();
  });

  $("fileImportStock")?.addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    await importCsvToSheet(f, "STOCK");
    loadStock();
  });
}

/* ===================================================
   16) 자동 새로고침
=================================================== */

function initAutoRefresh() {
  $("btnRefreshAll")?.addEventListener("click", refreshAll);
  setInterval(refreshAll, 60000); // 1분마다
}

function refreshAll() {
  loadDashboard();
  loadMembers();
  loadOrders();
  loadProducts();
  loadStock();
  loadLogs();

  $("last-sync") &&
    ($("last-sync").textContent =
      "마지막 동기화: " + new Date().toLocaleString("ko-KR"));
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
  $("searchMembers")  ?.addEventListener("input", filterMembers);
  $("searchOrders")   ?.addEventListener("input", filterOrders);
  $("searchProducts") ?.addEventListener("input", filterProducts);
  $("searchStock")    ?.addEventListener("input", filterStock);
  $("searchLogs")     ?.addEventListener("input", filterLogs);

  // CSV Import/Export 바인딩 (버튼/파일 input 있으면 자동 연결)
  initImportExportBindings();

  // 최초 로드 + 자동 새로고침
  refreshAll();
  initAutoRefresh();
});
