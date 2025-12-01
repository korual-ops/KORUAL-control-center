/******************************************************
 *  KORUAL CONTROL CENTER – app.js (Dashboard)
 *  - 사이드바 네비게이션
 *  - 테마 토글
 *  - 로그인 유저 이름 표시
 *  - 대시보드 데이터 로딩 (옵션)
 ******************************************************/

// ─────────────────────────────────────────────
// 1. 공통 유틸
// ─────────────────────────────────────────────
const API_BASE = "https://script.google.com/macros/s/AKfycbx3s5j7YgqcWLGGGuzdtQy0Ayl3QHtHP7xwhEAv3N-BClUVFN/exec"; // 필요하면 본인 URL로 수정

const $  = (id)  => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

function fmtNumber(n) {
  if (n === null || n === undefined || isNaN(n)) return "-";
  return Number(n).toLocaleString("ko-KR");
}

function fmtCurrency(n) {
  if (n === null || n === undefined || isNaN(n)) return "-";
  return Number(n).toLocaleString("ko-KR") + "원";
}

async function getJSON(target, params = {}) {
  const url = new URL(API_BASE);
  url.searchParams.set("target", target);

  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, v);
    }
  });

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

// ─────────────────────────────────────────────
// 2. 로그인한 유저 이름 불러오기
//    (로그인 페이지에서 korual_user 저장해둔 값 사용)
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// 3. 테마 토글 (Light / Dark)
// ─────────────────────────────────────────────
function applyTheme(theme) {
  const body = document.body;
  if (!body) return;

  body.classList.toggle("dark", theme === "dark");

  const themeLabel = $("themeModeLabel"); // Light / Dark 텍스트 표시용 span
  if (themeLabel) {
    themeLabel.textContent = theme === "dark" ? "Dark" : "Light";
  }

  localStorage.setItem("korual_theme_dashboard", theme);
}

function initThemeToggle() {
  const saved = localStorage.getItem("korual_theme_dashboard") || "light";
  applyTheme(saved);

  const btn = $("toggleThemeDashboard"); // 상단 테마 버튼 id
  if (!btn) return;

  btn.addEventListener("click", () => {
    const current = localStorage.getItem("korual_theme_dashboard") || "light";
    const next = current === "light" ? "dark" : "light";
    applyTheme(next);
  });
}

// ─────────────────────────────────────────────
// 4. 사이드바 네비게이션
//    .nav-link[data-section] 과 .section id 연결
// ─────────────────────────────────────────────
function initSidebarNav() {
  const links    = $$(".nav-link[data-section]");
  const sections = $$(".section");

  if (!links.length || !sections.length) return;

  function activate(targetId) {
    links.forEach((btn) => {
      const match = btn.dataset.section === targetId;
      btn.classList.toggle("active", match);
    });

    sections.forEach((sec) => {
      sec.classList.toggle("active", sec.id === targetId);
    });
  }

  links.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.section;
      if (!target) return;
      activate(target);
    });
  });

  // 초기 진입: 첫 번째 링크 기준
  const first = links[0];
  const defaultSection = (first && first.dataset.section) || "dashboard";
  activate(defaultSection);
}

// ─────────────────────────────────────────────
// 5. API 상태 표시 (좌측 하단 "API 연결 정상")
// ─────────────────────────────────────────────
function setApiStatus(ok, message) {
  const el = $("apiStatusText"); // 예: <span id="apiStatusText"></span>
  const dot = $("apiStatusDot"); // 예: 초록 점 등
  if (el) {
    el.textContent = ok ? (message || "API 연결 정상") : (message || "API 오류");
  }
  if (dot) {
    dot.style.color = ok ? "#22c55e" : "#ef4444";
  }
}

async function pingApi() {
  try {
    setApiStatus(true, "API 체크 중…");
    const data = await getJSON("ping"); // Apps Script 에 target=ping 구현된 경우
    if (data && data.ok !== false) {
      setApiStatus(true, "API 연결 정상");
    } else {
      setApiStatus(false, "API 응답 이상");
    }
  } catch (e) {
    console.error("ping 실패:", e);
    setApiStatus(false, "API 연결 실패");
  }
}

// ─────────────────────────────────────────────
// 6. 대시보드 데이터 로딩
//    (target=dashboard 기준 예시, 구조 달라도 에러 안나게)
// ─────────────────────────────────────────────
function setDashboardLoading(loading) {
  const el = $("recentOrdersLoading"); // "데이터 로딩 중…" 텍스트 div
  if (el) el.style.display = loading ? "block" : "none";
}

function updateDashboardCards(payload) {
  if (!payload || typeof payload !== "object") return;

  const totalProducts = payload.totalProducts ?? payload.total_items;
  const totalOrders   = payload.totalOrders ?? payload.total_orders;
  const totalMembers  = payload.totalMembers ?? payload.total_members;
  const todaySales    = payload.todayAmount ?? payload.today_sales;
  const todayOrders   = payload.todayOrders;
  const pendingOrders = payload.pendingOrders;

  const map = [
    ["cardTotalProducts", fmtNumber(totalProducts)],
    ["cardTotalOrders",   fmtNumber(totalOrders)],
    ["cardTotalSales",    fmtCurrency(todaySales)],
    ["cardTotalMembers",  fmtNumber(totalMembers)],

    ["statTodayOrders",   fmtNumber(todayOrders)],
    ["statTodaySales",    fmtCurrency(todaySales)],
    ["statPendingOrders", fmtNumber(pendingOrders)]
  ];

  map.forEach(([id, value]) => {
    const el = $(id);
    if (el) el.textContent = value;
  });

  const lastSync = $("last-sync");
  if (lastSync) {
    const now = new Date();
    lastSync.textContent =
      now.getFullYear() + ". " +
      String(now.getMonth() + 1).padStart(2, "0") + ". " +
      String(now.getDate()).padStart(2, "0") + ". " +
      now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  }
}

function updateRecentOrdersTable(list) {
  const tbody = $("recentOrdersBody");
  const empty = $("recentOrdersEmpty");

  if (!tbody) return;

  tbody.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";

  list.forEach((row, idx) => {
    const tr = document.createElement("tr");

    const orderDate  = row.order_date || row.date || "";
    const orderNo    = row.order_no  || row.orderNumber || "";
    const product    = row.item_name || row.product || "";
    const qty        = row.qty       || row.quantity || "";
    const amount     = row.amount    || row.price || "";
    const channel    = row.channel   || "";
    const status     = row.status    || "";
    const trackingNo = row.tracking  || "";
    const memo       = row.memo      || "";

    const cells = [
      orderDate,
      orderNo,
      product,
      qty,
      fmtCurrency(amount),
      channel,
      status,
      trackingNo,
      memo
    ];

    cells.forEach((val) => {
      const td = document.createElement("td");
      td.textContent = val === undefined || val === null ? "-" : val;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

async function initDashboardData() {
  setDashboardLoading(true);
  try {
    // Apps Script 에서 target=dashboard 로 JSON 내려주는 형태라고 가정
    const data = await getJSON("dashboard");
    updateDashboardCards(data || {});
    updateRecentOrdersTable(data?.recentOrders || data?.latestOrders || []);
    setApiStatus(true, "API 연결 정상");
  } catch (e) {
    console.error("대시보드 로딩 실패:", e);
    setApiStatus(false, "대시보드 로딩 실패");
    const msg = $("recentOrdersError");
    if (msg) msg.textContent = "대시보드 데이터를 불러오지 못했습니다.";
  } finally {
    setDashboardLoading(false);
  }
}

// ─────────────────────────────────────────────
// 7. 전체 새로고침 버튼
// ─────────────────────────────────────────────
function initRefreshButton() {
  const btn = $("btnRefreshAll");
  if (!btn) return;

  btn.addEventListener("click", () => {
    initDashboardData();
  });
}

// ─────────────────────────────────────────────
// 8. 초기화
// ─────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadKorualUser();        // 로그인 유저 이름 표시
  initThemeToggle();       // 라이트/다크 토글
  initSidebarNav();        // 카테고리 탭 전환
  initRefreshButton();     // 전체 새로고침
  pingApi();               // API 헬스 체크
  initDashboardData();     // 대시보드 데이터 로딩
});
