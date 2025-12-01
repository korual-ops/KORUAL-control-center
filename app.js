/******************************************************
 * KORUAL CONTROL CENTER – app.js
 * - 로그인 유저 이름 표시
 * - 사이드바 네비게이션
 * - 라이트 / 다크 테마 토글
 * - 로그아웃 (index.html로 이동)
 * - API 상태 체크 & 대시보드 데이터 로딩
 ******************************************************/

// ========= 공통 유틸 =========
const $  = (id)  => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

// 실제 구글 Apps Script / Control Center API 주소로 교체해 사용
const API_BASE = "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec";

// GET 호출 공통 함수
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

// 숫자/통화 포맷
function fmtNumber(v) {
  if (v === null || v === undefined || v === "" || isNaN(v)) return "-";
  return Number(v).toLocaleString("ko-KR");
}

function fmtCurrency(v) {
  if (v === null || v === undefined || v === "" || isNaN(v)) return "-";
  return Number(v).toLocaleString("ko-KR") + "원";
}

// ========= 1. 로그인 유저 이름 표시 =========
function loadKorualUser() {
  try {
    const raw = localStorage.getItem("korual_user");
    const el = $("welcomeUser");
    if (!el) return;

    if (!raw) {
      el.textContent = "KORUAL";
      return;
    }

    const user = JSON.parse(raw);
    const name =
      (user.full_name && String(user.full_name).trim()) ||
      (user.username && String(user.username).trim()) ||
      "KORUAL";

    el.textContent = name;
  } catch (e) {
    console.error("korual_user 파싱 오류:", e);
    const el = $("welcomeUser");
    if (el) el.textContent = "KORUAL";
  }
}

// ========= 2. 사이드바 네비게이션 =========
function initSidebarNav() {
  const links = $$(".nav-link");
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
    });
  });

  // "주문 관리로 이동" 버튼 → 주문 관리 탭 활성화
  const goOrders = $("goOrders");
  if (goOrders) {
    goOrders.addEventListener("click", () => {
      const btn = document.querySelector('.nav-link[data-section="orders"]');
      if (btn) btn.click();
    });
  }

  // 첫 로드 기본: 대시보드
  activate("dashboard");
}

// ========= 3. 테마 토글 (Light / Dark) =========
function applyTheme(theme) {
  const body = document.body;
  if (!body) return;

  const isDark = theme === "dark";
  body.classList.toggle("theme-dark", isDark);

  // 상단 작은 텍스트 (Light / Dark)
  const themeText = $("themeLabel");
  if (themeText) {
    themeText.textContent = isDark ? "Dark" : "Light";
  }

  // 토글 버튼 안의 라벨
  const toggleBtn = $("themeToggle");
  if (toggleBtn) {
    const labelEl = toggleBtn.querySelector(".theme-toggle-label");
    if (labelEl) {
      labelEl.textContent = isDark
        ? (labelEl.dataset.dark || "Dark")
        : (labelEl.dataset.light || "Light");
    }

    const track = toggleBtn.querySelector(".theme-toggle-track");
    const thumb = toggleBtn.querySelector(".theme-toggle-thumb");
    if (track && thumb) {
      // body.theme-dark 클래스 기반으로 CSS에서 위치 제어하므로
      // 여기서 별도 계산할 필요는 없음
    }
  }

  localStorage.setItem("korual-theme", isDark ? "dark" : "light");
}

function initThemeToggle() {
  const saved = localStorage.getItem("korual-theme") || "light";
  applyTheme(saved);

  const toggleBtn = $("themeToggle");
  if (!toggleBtn) return;

  toggleBtn.addEventListener("click", () => {
    const current = localStorage.getItem("korual-theme") || "light";
    const next = current === "light" ? "dark" : "light";
    applyTheme(next);
  });
}

// ========= 4. API 상태 표시 =========
function setApiStatus(ok, msg) {
  const el = document.querySelector(".api-status");
  if (!el) return;

  el.classList.toggle("ok", ok);
  el.classList.toggle("error", !ok);
  el.textContent = (ok ? "● " : "● ") + (msg || (ok ? "API 연결 정상" : "API 오류"));
}

async function pingApi() {
  try {
    setApiStatus(true, "API 체크 중…");
    const data = await apiGet("ping");
    if (!data || data.ok === false) {
      setApiStatus(false, "API 응답 이상");
    } else {
      setApiStatus(true, "API 연결 정상");
    }
  } catch (e) {
    console.error("ping 실패:", e);
    setApiStatus(false, "API 연결 실패");
  }
}

// ========= 5. 대시보드 데이터 로딩 =========
function setDashboardLoading(loading) {
  const tbody = $("recentOrdersBody");
  if (!tbody) return;

  if (loading) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="empty-state">데이터 로딩 중…</td></tr>';
  }
}

function updateDashboardCards(payload) {
  if (!payload || typeof payload !== "object") return;

  // API 키 매핑 (이름 바뀌어도 대응 가능)
  const totalProducts = payload.totalProducts ?? payload.total_items;
  const totalOrders   = payload.totalOrders   ?? payload.total_orders;
  const totalRevenue  = payload.totalRevenue  ?? payload.total_amount;
  const totalMembers  = payload.totalMembers  ?? payload.total_members;

  const todayOrders   = payload.todayOrders   ?? payload.today_count;
  const todayRevenue  = payload.todayRevenue  ?? payload.today_amount;
  const todayPending  = payload.todayPending  ?? payload.today_pending;

  const mapping = [
    ["cardTotalProducts", fmtNumber(totalProducts)],
    ["cardTotalOrders",   fmtNumber(totalOrders)],
    ["cardTotalRevenue",  fmtCurrency(totalRevenue)],
    ["cardTotalMembers",  fmtNumber(totalMembers)],
    ["todayOrders",       fmtNumber(todayOrders)],
    ["todayRevenue",      fmtCurrency(todayRevenue)],
    ["todayPending",      fmtNumber(todayPending)],
  ];

  mapping.forEach(([id, value]) => {
    const el = $(id);
    if (el) el.textContent = value;
  });

  // 마지막 동기화 시간 표시
  const lastSync = $("last-sync");
  if (lastSync) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    lastSync.textContent =
      "마지막 동기화: " +
      now.getFullYear() +
      ". " +
      String(now.getMonth() + 1).padStart(2, "0") +
      ". " +
      String(now.getDate()).padStart(2, "0") +
      ". " +
      " " +
      timeStr;
  }
}

function updateRecentOrdersTable(list) {
  const tbody = $("recentOrdersBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="empty-state">최근 주문이 없습니다.</td></tr>';
    return;
  }

  list.forEach((row) => {
    const tr = document.createElement("tr");

    const orderDate = row.order_date || row.date || "-";
    const orderNo   = row.order_no   || row.orderNumber || "-";
    const name      = row.item_name  || row.productName || "-";
    const qty       = row.qty        || row.quantity || "-";
    const amount    = row.amount     || row.price || "-";
    const channel   = row.channel    || "-";
    const status    = row.status     || "-";

    const cells = [
      orderDate,
      orderNo,
      name,
      qty,
      fmtCurrency(amount),
      channel,
      status,
    ];

    cells.forEach((v) => {
      const td = document.createElement("td");
      td.textContent = v === undefined || v === null ? "-" : v;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

async function loadDashboardData() {
  setDashboardLoading(true);
  try {
    // Apps Script 의 doGet(e)에서 target=dashboard 처리
    const data = await apiGet("dashboard");

    updateDashboardCards(data || {});
    updateRecentOrdersTable(data?.recentOrders || data?.latestOrders || []);
    setApiStatus(true, "API 연결 정상");
  } catch (e) {
    console.error("대시보드 데이터 로딩 실패:", e);
    setApiStatus(false, "대시보드 로딩 실패");

    const tbody = $("recentOrdersBody");
    if (tbody) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="empty-state">데이터를 불러오지 못했습니다.</td></tr>';
    }
  }
}

// 외부에서 다시 호출할 수 있게 export 느낌
window.initDashboard = function () {
  loadDashboardData();
};

// ========= 6. 전체 새로고침 버튼 =========
function initRefreshButton() {
  const btn = $("btnRefreshAll");
  if (!btn) return;

  btn.addEventListener("click", () => {
    loadDashboardData();
  });
}

// ========= 7. 로그아웃 =========
function initLogout() {
  const btn = $("btnLogout");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const ok = confirm("KORUAL CONTROL CENTER에서 로그아웃하시겠습니까?");
    if (!ok) return;

    try {
      // 로그인/테마 정보 정리
      localStorage.removeItem("korual_user");
      localStorage.removeItem("korual-theme");
      localStorage.removeItem("korual_theme");
      // 필요하면 다른 키도 추가 삭제 가능
    } catch (e) {
      console.error("로그아웃 정리 중 오류:", e);
    }

    // 로그인 페이지로 이동 (필요에 따라 경로 수정)
    window.location.href = "index.html";
  });
}

// ========= 8. 초기화 =========
document.addEventListener("DOMContentLoaded", () => {
  loadKorualUser();
  initSidebarNav();
  initThemeToggle();
  initRefreshButton();
  initLogout();
  pingApi();
  loadDashboardData();
});
