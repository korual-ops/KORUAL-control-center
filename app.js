/******************************************************
 * KORUAL CONTROL CENTER – app.js (풀 하이엔드 버전)
 * - 로그인 보호
 * - 사용자 표시
 * - 사이드바 네비 + 모바일 메뉴
 * - 라이트 / 다크 테마
 * - 로그아웃
 * - 대시보드 / 회원 / 주문 / 상품 / 재고 관리 + 실시간 검색
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

// 실제 구글 Apps Script / Control Center API 주소
const API_BASE =
  "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec";

// GET 전용 API 헬퍼
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

// 숫자 포맷
function fmtNumber(v) {
  if (v === null || v === undefined || v === "" || isNaN(v)) return "-";
  return Number(v).toLocaleString("ko-KR");
}

// 금액 포맷
function fmtCurrency(v) {
  if (v === null || v === undefined || v === "" || isNaN(v)) return "-";
  return Number(v).toLocaleString("ko-KR") + "원";
}

/* ========== 0. 로그인 여부 확인 (대시보드 보호) ========== */

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

      // 섹션별 데이터 로딩
      switch (key) {
        case "dashboard":
          loadDashboardData();
          break;
        case "members":
          loadMembers();
          break;
        case "orders":
          loadOrders();
          break;
        case "products":
          loadProducts();
          break;
        case "stock":
          loadStock();
          break;
          case "logs":
          loadLogs();
          break;

        // logs 등은 추후 확장
      }
    });
  });

  // "주문 관리로 이동" 버튼
  const goOrders = $("goOrders");
  if (goOrders) {
    goOrders.addEventListener("click", () => {
      const btn = document.querySelector('.nav-link[data-section="orders"]');
      if (btn) btn.click();
    });
  }

  // 첫 로드 시 기본: 대시보드
  activate("dashboard");
}

/* ========== 3. 테마 토글 (Light / Dark) ========== */

function applyTheme(theme) {
  const body = document.body;
  if (!body) return;

  const mode = theme === "dark" ? "dark" : "light";
  body.classList.toggle("theme-dark", mode === "dark");

  const label = document.querySelector("#themeToggle .theme-toggle-label");
  if (label) {
    label.textContent =
      mode === "dark"
        ? label.dataset.dark || "Dark"
        : label.dataset.light || "Light";
  }

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

/* ========== 4. 모바일 사이드바 토글 ========== */

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
    if (sidebar.classList.contains("open")) close();
    else open();
  });

  backdrop.addEventListener("click", close);
  navLinks.forEach((btn) => {
    btn.addEventListener("click", close);
  });
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

/* ========== 6. 대시보드 데이터 로딩 ========== */

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
    const data = await apiGet("dashboard");

    updateDashboardCards(data || {});
    updateRecentOrdersTable(
      data?.recentOrders || data?.latestOrders || []
    );
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

/* ========== 7. 새로고침 버튼 ========== */

function initRefreshButton() {
  const btn = $("btnRefreshAll");
  if (!btn) return;
  btn.addEventListener("click", () => {
    loadDashboardData();
  });
}

/* ========== 8. 로그아웃 버튼 ========== */

function initLogoutButton() {
  const btn = $("btnLogout");
  if (!btn) return;

  btn.addEventListener("click", () => {
    try {
      localStorage.removeItem("korual_user");
      window.location.replace("index.html");
    } catch (e) {
      console.error("로그아웃 중 오류:", e);
      window.location.replace("index.html");
    }
  });
}

/* ========== 9. 회원 관리 – 렌더링 + 검색 + 로딩 ========== */

function getMemberSearchFields(row) {
  return [
    row["회원번호"],
    row["이름"],
    row["전화번호"],
    row["이메일"],
    row["가입일"],
    row["채널"],
    row["등급"],
    row["누적매출"],
    row["포인트"],
    row["최근주문일"],
    row["메모"],
  ];
}

function renderMembersTable(list) {
  const tbody = $("membersBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="11" class="empty-state">회원 데이터가 없습니다.</td></tr>';
    return;
  }

  list.forEach((row) => {
    const tr = document.createElement("tr");

    const memberNo   = row["회원번호"]   ?? "-";
    const name       = row["이름"]       ?? "-";
    const phone      = row["전화번호"]   ?? "-";
    const email      = row["이메일"]     ?? "-";
    const joinedAt   = row["가입일"]     ?? "-";
    const channel    = row["채널"]       ?? "-";
    const grade      = row["등급"]       ?? "-";
    const totalSales = row["누적매출"]   ?? 0;
    const point      = row["포인트"]     ?? 0;
    const lastOrder  = row["최근주문일"] ?? "-";
    const memo       = row["메모"]       ?? "";

    const cells = [
      memberNo,
      name,
      phone,
      email,
      joinedAt,
      channel,
      grade,
      fmtCurrency(totalSales),
      fmtNumber(point),
      lastOrder,
      memo,
    ];

    cells.forEach((v) => {
      const td = document.createElement("td");
      td.textContent =
        v === undefined || v === null || v === "" ? "-" : v;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function initMemberSearch() {
  const input = $("searchMembers");
  if (!input) return;

  input.addEventListener("input", () => {
    const kw = input.value.trim().toLowerCase();

    if (!kw) {
      renderMembersTable(membersCache);
      return;
    }

    const filtered = membersCache.filter((row) => {
      const fields = getMemberSearchFields(row);
      return fields.some((v) =>
        String(v ?? "").toLowerCase().includes(kw)
      );
    });

    renderMembersTable(filtered);
  });
}

async function loadMembers() {
  const tbody = $("membersBody");
  if (!tbody) return;

  tbody.innerHTML =
    '<tr><td colspan="11" class="empty-state">회원 데이터 로딩 중…</td></tr>';

  try {
    const data = await apiGet("members");

    if (!data || data.ok === false || !Array.isArray(data.rows)) {
      tbody.innerHTML =
        '<tr><td colspan="11" class="empty-state">회원 데이터를 불러오지 못했습니다.</td></tr>';
      return;
    }

    membersCache = data.rows;

    const input   = $("searchMembers");
    const keyword = input ? input.value.trim().toLowerCase() : "";

    if (keyword) {
      const filtered = membersCache.filter((row) => {
        const fields = getMemberSearchFields(row);
        return fields.some((v) =>
          String(v ?? "").toLowerCase().includes(keyword)
        );
      });
      renderMembersTable(filtered);
    } else {
      renderMembersTable(membersCache);
    }
  } catch (e) {
    console.error("회원 데이터 로딩 실패:", e);
    tbody.innerHTML =
      '<tr><td colspan="11" class="empty-state">회원 데이터를 불러오지 못했습니다.</td></tr>';
  }
}

/* ========== 10. 주문 관리 – 렌더링 + 검색 + 로딩 ========== */

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
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="empty-state">주문 데이터가 없습니다.</td></tr>';
    return;
  }

  list.forEach((row) => {
    const tr = document.createElement("tr");

    const date   = row["날짜"]     ?? row["주문일자"] ?? "-";
    const no     = row["주문번호"] ?? "-";
    const name   = row["고객명"]   ?? "-";
    const item   = row["상품명"]   ?? "-";
    const qty    = row["수량"]     ?? "-";
    const amount = row["금액"]     ?? 0;
    const status = row["상태"]     ?? "-";

    const cells = [
      date,
      no,
      name,
      item,
      qty,
      fmtCurrency(amount),
      status,
    ];

    cells.forEach((v) => {
      const td = document.createElement("td");
      td.textContent =
        v === undefined || v === null || v === "" ? "-" : v;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function initOrdersSearch() {
  const input = $("searchOrders");
  if (!input) return;

  input.addEventListener("input", () => {
    const kw = input.value.trim().toLowerCase();

    if (!kw) {
      renderOrdersTable(ordersCache);
      return;
    }

    const filtered = ordersCache.filter((row) => {
      const fields = getOrderSearchFields(row);
      return fields.some((v) =>
        String(v ?? "").toLowerCase().includes(kw)
      );
    });

    renderOrdersTable(filtered);
  });
}

async function loadOrders() {
  const tbody = $("ordersBody");
  if (!tbody) return;

  tbody.innerHTML =
    '<tr><td colspan="7" class="empty-state">주문 데이터 로딩 중…</td></tr>';

  try {
    const data = await apiGet("orders");

    if (!data || data.ok === false || !Array.isArray(data.rows)) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="empty-state">주문 데이터를 불러오지 못했습니다.</td></tr>';
      return;
    }

    ordersCache = data.rows;

    const input   = $("searchOrders");
    const keyword = input ? input.value.trim().toLowerCase() : "";

    if (keyword) {
      const filtered = ordersCache.filter((row) => {
        const fields = getOrderSearchFields(row);
        return fields.some((v) =>
          String(v ?? "").toLowerCase().includes(keyword)
        );
      });
      renderOrdersTable(filtered);
    } else {
      renderOrdersTable(ordersCache);
    }
  } catch (e) {
    console.error("주문 데이터 로딩 실패:", e);
    tbody.innerHTML =
      '<tr><td colspan="7" class="empty-state">주문 데이터를 불러오지 못했습니다.</td></tr>';
  }
}

/* ========== 11. 상품 관리 – 렌더링 + 검색 + 로딩 ========== */

function getProductSearchFields(row) {
  return [
    row["상품코드"],
    row["상품명"],
    row["옵션"],
    row["판매가"],
    row["재고"],
    row["채널"],
    row["카테고리"],
    row["브랜드"],
  ];
}

function renderProductsTable(list) {
  const tbody = $("productsBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="empty-state">상품 데이터가 없습니다.</td></tr>';
    return;
  }

  list.forEach((row) => {
    const tr = document.createElement("tr");

    const code   = row["상품코드"] ?? "-";
    const name   = row["상품명"]   ?? "-";
    const option = row["옵션"]     ?? "-";
    const price  = row["판매가"]   ?? 0;
    const stock  = row["재고"]     ?? "-";

    const cells = [
      code,
      name,
      option,
      fmtCurrency(price),
      fmtNumber(stock),
    ];

    cells.forEach((v) => {
      const td = document.createElement("td");
      td.textContent =
        v === undefined || v === null || v === "" ? "-" : v;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

function initProductsSearch() {
  const input = $("searchProducts");
  if (!input) return;

  input.addEventListener("input", () => {
    const kw = input.value.trim().toLowerCase();

    if (!kw) {
      renderProductsTable(productsCache);
      return;
    }

    const filtered = productsCache.filter((row) => {
      const fields = getProductSearchFields(row);
      return fields.some((v) =>
        String(v ?? "").toLowerCase().includes(kw)
      );
    });

    renderProductsTable(filtered);
  });
}

async function loadProducts() {
  const tbody = $("productsBody");
  if (!tbody) return;

  tbody.innerHTML =
    '<tr><td colspan="5" class="empty-state">상품 데이터 로딩 중…</td></tr>';

  try {
    const data = await apiGet("products");

    if (!data || data.ok === false || !Array.isArray(data.rows)) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="empty-state">상품 데이터를 불러오지 못했습니다.</td></tr>';
      return;
    }

    productsCache = data.rows;

    const input   = $("searchProducts");
    const keyword = input ? input.value.trim().toLowerCase() : "";

    if (keyword) {
      const filtered = productsCache.filter((row) => {
        const fields = getProductSearchFields(row);
        return fields.some((v) =>
          String(v ?? "").toLowerCase().includes(keyword)
        );
      });
      renderProductsTable(filtered);
    } else {
      renderProductsTable(productsCache);
    }
  } catch (e) {
    console.error("상품 데이터 로딩 실패:", e);
    tbody.innerHTML =
      '<tr><td colspan="5" class="empty-state">상품 데이터를 불러오지 못했습니다.</td></tr>';
  }
}

/* ========== 12. 재고 관리 – 렌더링 + 검색 + 로딩 ========== */

// 재고 검색에 사용할 필드
function getStockSearchFields(row) {
  return [
    row["상품코드"],
    row["상품명"],
    row["현재 재고"],
    row["안전 재고"],
    row["상태"],
    row["창고"],
    row["채널"],
  ];
}

// 재고 테이블 렌더링
function renderStockTable(list) {
  const tbody = $("stockBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="empty-state">재고 데이터가 없습니다.</td></tr>';
    return;
  }

  list.forEach((row) => {
    const tr = document.createElement("tr");

    const code      = row["상품코드"]   ?? "-";
    const name      = row["상품명"]     ?? "-";
    const qty       = row["현재 재고"] ?? row["재고"] ?? 0;
    const safeQty   = row["안전 재고"] ?? 0;
    const status    = row["상태"]       ?? "-";

    const cells = [
      code,
      name,
      fmtNumber(qty),
      fmtNumber(safeQty),
      status,
    ];

    cells.forEach((v) => {
      const td = document.createElement("td");
      td.textContent =
        v === undefined || v === null || v === "" ? "-" : v;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

// 재고 검색 인풋 (있으면 사용, 없으면 패스)
function initStockSearch() {
  const input = $("searchStock");
  if (!input) return; // HTML에 없으면 그냥 무시

  input.addEventListener("input", () => {
    const kw = input.value.trim().toLowerCase();

    if (!kw) {
      renderStockTable(stockCache);
      return;
    }

    const filtered = stockCache.filter((row) => {
      const fields = getStockSearchFields(row);
      return fields.some((v) =>
        String(v ?? "").toLowerCase().includes(kw)
      );
    });

    renderStockTable(filtered);
  });
}

// 재고 데이터 로딩
async function loadStock() {
  const tbody = $("stockBody");
  if (!tbody) return;

  tbody.innerHTML =
    '<tr><td colspan="5" class="empty-state">재고 데이터 로딩 중…</td></tr>';

  try {
    const data = await apiGet("stock");

    if (!data || data.ok === false || !Array.isArray(data.rows)) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="empty-state">재고 데이터를 불러오지 못했습니다.</td></tr>';
      return;
    }

    stockCache = data.rows;

    const input   = $("searchStock");
    const keyword = input ? input.value.trim().toLowerCase() : "";

    if (keyword) {
      const filtered = stockCache.filter((row) => {
        const fields = getStockSearchFields(row);
        return fields.some((v) =>
          String(v ?? "").toLowerCase().includes(keyword)
        );
      });
      renderStockTable(filtered);
    } else {
      renderStockTable(stockCache);
    }
  } catch (e) {
    console.error("재고 데이터 로딩 실패:", e);
    tbody.innerHTML =
      '<tr><td colspan="5" class="empty-state">재고 데이터를 불러오지 못했습니다.</td></tr>';
  }
}

/* ========== 13. 초기화 ========== */

document.addEventListener("DOMContentLoaded", () => {
  if (!ensureLoggedIn()) return;

  loadKorualUser();
  initSidebarNav();
  initThemeToggle();
  initMobileMenu();
  initRefreshButton();
  initLogoutButton();

  // 검색 인풋 초기화
  initMemberSearch();
  initOrdersSearch();
  initProductsSearch();
  initStockSearch();
  initLogsSearch();


  pingApi();
  loadDashboardData(); // 첫 화면: 대시보드
});
/* ========== 14. 로그 모니터링 – 렌더링 + 검색 + 로딩 ========== */

// 검색에 사용하는 필드
function getLogSearchFields(row) {
  return [
    row["시간"],
    row["타입"],
    row["메시지"]
  ];
}

// 로그 렌더링
function renderLogsTable(list) {
  const tbody = $("logsBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="3" class="empty-state">로그 데이터가 없습니다.</td></tr>';
    return;
  }

  list.forEach((row) => {
    const tr = document.createElement("tr");

    const time    = row["시간"]   ?? "-";
    const type    = row["타입"]   ?? "-";
    const message = row["메시지"] ?? "-";

    const cells = [time, type, message];

    cells.forEach((v) => {
      const td = document.createElement("td");
      td.textContent = v === undefined || v === null || v === "" ? "-" : v;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

// 로그 검색
function initLogsSearch() {
  const input = $("searchLogs");
  if (!input) return;

  input.addEventListener("input", () => {
    const kw = input.value.trim().toLowerCase();

    if (!kw) {
      renderLogsTable(logsCache);
      return;
    }

    const filtered = logsCache.filter((row) => {
      const fields = getLogSearchFields(row);
      return fields.some((v) => String(v ?? "").toLowerCase().includes(kw));
    });

    renderLogsTable(filtered);
  });
}

// 로그 데이터 로딩
async function loadLogs() {
  const tbody = $("logsBody");
  if (!tbody) return;

  tbody.innerHTML =
    '<tr><td colspan="3" class="empty-state">로그 데이터 로딩 중…</td></tr>';

  try {
    const data = await apiGet("logs");

    if (!data || data.ok === false || !Array.isArray(data.rows)) {
      tbody.innerHTML =
        '<tr><td colspan="3" class="empty-state">로그 데이터를 불러오지 못했습니다.</td></tr>';
      return;
    }

    logsCache = data.rows;

    const input   = $("searchLogs");
    const keyword = input ? input.value.trim().toLowerCase() : "";

    if (keyword) {
      const filtered = logsCache.filter((row) => {
        const fields = getLogSearchFields(row);
        return fields.some((v) => String(v ?? "").toLowerCase().includes(keyword));
      });
      renderLogsTable(filtered);
    } else {
      renderLogsTable(logsCache);
    }
  } catch (e) {
    console.error("로그 데이터 로딩 실패:", e);
    tbody.innerHTML =
      '<tr><td colspan="3" class="empty-state">로그 데이터를 불러오지 못했습니다.</td></tr>';
  }
}
