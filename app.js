/******************************************************
 *  KORUAL CONTROL CENTER – app.js (High-End v6.0)
 *  - 로그인 보호
 *  - 대시보드 / 회원 / 주문 / 상품 / 재고 / 로그
 *  - API 헬스체크 + 자동 재시도 + 타임아웃
 *  - 전 구간 캐싱 + 캐시 우선 렌더링
 *  - 고급 검색(디바운스) + 다중 섹션 공용 유틸
 *  - 모바일/다크모드 + 기본 애니메이션 훼손 없이 유지
 *  - 오류 알림 / 로딩 상태 / API 속도 표시
 ******************************************************/

/* ------------------------------
   기본 셋업
------------------------------ */

const $  = (id)  => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

let cache = {
  members: [],
  orders: [],
  products: [],
  stock: [],
  logs: []
};

const API_BASE =
  "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec";

/* 숫자/금액 포맷 */
const fmtNumber = (v) =>
  v == null || v === "" || isNaN(v) ? "-" : Number(v).toLocaleString("ko-KR");

const fmtCurrency = (v) =>
  v == null || v === "" || isNaN(v) ? "-" : Number(v).toLocaleString("ko-KR") + "원";

/* 공용 로딩 애니메이션 */
function showLoading(id, colspan = 20) {
  const el = $(id);
  if (!el) return;
  el.innerHTML = `
    <tr>
      <td colspan="${colspan}" style="padding:20px; text-align:center;">
        <div class="loading-spinner"></div>
      </td>
    </tr>`;
}

/* ------------------------------
   API 상태 / 핑 시간 표시
------------------------------ */

function setApiStatus(ok, msg) {
  const el = $(".api-status");
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle("ok", ok);
  el.classList.toggle("error", !ok);
}

function setApiPingTime(ms) {
  const el = $("apiPing");
  if (!el) return;
  el.textContent = ms + "ms";
}

/* ------------------------------
   API GET (타임아웃 + 자동 재시도)
------------------------------ */

async function apiGet(target, params = {}, options = {}) {
  const {
    retries = 2,           // 총 시도 횟수 = 1 + retries
    timeoutMs = 10000,     // 10초 타임아웃
    showStatus = true      // 상태 메시지 업데이트 여부
  } = options;

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = new URL(API_BASE);
      url.searchParams.set("target", target);
      Object.entries(params).forEach(([k, v]) => {
        if (v !== "" && v != null) url.searchParams.set(k, v);
      });

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const start = performance.now();
      const res = await fetch(url, { signal: controller.signal }).catch((e) => {
        throw e;
      });
      const end = performance.now();

      clearTimeout(timer);
      setApiPingTime(Math.round(end - start));

      if (!res || !res.ok) {
        throw new Error("API 응답 오류");
      }

      const json = await res.json();

      if (showStatus) {
        setApiStatus(true, "API 정상");
      }

      return json;
    } catch (err) {
      lastError = err;

      const isLast = attempt === retries;
      if (showStatus) {
        if (isLast) {
          setApiStatus(false, "API 오류 (재시도 실패)");
        } else {
          setApiStatus(false, `API 오류, 재시도 중... (${attempt + 1}/${retries + 1})`);
        }
      }

      if (isLast) break;

      // 간단한 backoff
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }

  throw lastError || new Error("API 요청 실패");
}

/* ------------------------------
   로그인 보호
------------------------------ */

function ensureLoggedIn() {
  try {
    const raw = localStorage.getItem("korual_user");
    if (!raw) return location.replace("index.html");
    const user = JSON.parse(raw);
    if (!user || !user.username) return location.replace("index.html");
  } catch {
    return location.replace("index.html");
  }
}

/* 로그인 사용자 표시 */
function loadKorualUser() {
  try {
    const raw = localStorage.getItem("korual_user");
    if (!raw) return;
    const user = JSON.parse(raw);
    const nameEl = $("welcomeUser");
    if (!nameEl) return;
    nameEl.textContent = user.full_name || user.username;
  } catch {}
}

/* ------------------------------
   다크모드
------------------------------ */

function applyTheme(mode) {
  document.body.classList.toggle("theme-dark", mode === "dark");
  localStorage.setItem("korual-theme", mode);
}

function initThemeToggle() {
  applyTheme(localStorage.getItem("korual-theme") || "light");

  const btn = $("themeToggle");
  if (!btn) return;

  btn.onclick = () => {
    const now = localStorage.getItem("korual-theme") || "light";
    applyTheme(now === "light" ? "dark" : "light");
  };
}

/* ------------------------------
   모바일 메뉴
------------------------------ */

function initMobileMenu() {
  const sidebar = $(".sidebar");
  const backdrop = $("sidebarBackdrop");
  const toggle = $("menuToggle");

  if (!sidebar || !backdrop || !toggle) return;

  toggle.onclick = () => sidebar.classList.add("open");
  backdrop.onclick = () => sidebar.classList.remove("open");

  $$(".nav-link").forEach((btn) =>
    btn.addEventListener("click", () => sidebar.classList.remove("open"))
  );
}

/* ------------------------------
   로그아웃
------------------------------ */

function initLogoutButton() {
  const btn = $("btnLogout");
  if (!btn) return;

  btn.onclick = () => {
    localStorage.removeItem("korual_user");
    location.replace("index.html");
  };
}

/* ------------------------------
   사이드바 네비게이션
------------------------------ */

function initSidebarNav() {
  const links = $$(".nav-link");
  const sections = $$(".section");

  if (!links.length || !sections.length) return;

  async function showSection(key) {
    links.forEach((l) => l.classList.toggle("active", l.dataset.section === key));
    sections.forEach((s) => s.classList.toggle("active", s.id === "section-" + key));

    if (key === "dashboard") await loadDashboard();
    if (key === "members") await loadMembers();
    if (key === "orders") await loadOrders();
    if (key === "products") await loadProducts();
    if (key === "stock") await loadStock();
    if (key === "logs") await loadLogs();
  }

  links.forEach((btn) =>
    btn.addEventListener("click", () => showSection(btn.dataset.section))
  );

  showSection("dashboard");
}

/* ------------------------------
   검색 필터 유틸 (디바운스)
------------------------------ */

function debounce(fn, delay = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

function createSearch(inputId, tableRenderer, getFields, datasetKey) {
  const input = $(inputId);
  if (!input) return;

  input.oninput = debounce(() => {
    const kw = input.value.toLowerCase().trim();

    if (!kw) {
      return tableRenderer(cache[datasetKey]);
    }

    const filtered = cache[datasetKey].filter((r) =>
      getFields(r).some((v) => String(v ?? "").toLowerCase().includes(kw))
    );

    tableRenderer(filtered);
  }, 200);
}

/* ------------------------------
   API Ping
------------------------------ */

async function pingApi() {
  try {
    await apiGet("ping", {}, { retries: 1, timeoutMs: 5000 });
    setApiStatus(true, "API 정상");
  } catch {
    setApiStatus(false, "API 오류");
  }
}

/******************************************************
 * 1) DASHBOARD
 ******************************************************/

async function loadDashboard() {
  showLoading("recentOrdersBody", 7);

  try {
    const d = await apiGet("dashboard", {}, { retries: 1 });

    $("cardTotalProducts") && ($("cardTotalProducts").textContent = fmtNumber(d.totalProducts));
    $("cardTotalOrders") && ($("cardTotalOrders").textContent = fmtNumber(d.totalOrders));
    $("cardTotalRevenue") && ($("cardTotalRevenue").textContent = fmtCurrency(d.totalRevenue));
    $("cardTotalMembers") && ($("cardTotalMembers").textContent = fmtNumber(d.totalMembers));

    $("todayOrders") && ($("todayOrders").textContent = fmtNumber(d.todayOrders));
    $("todayRevenue") && ($("todayRevenue").textContent = fmtCurrency(d.todayRevenue));
    $("todayPending") && ($("todayPending").textContent = fmtNumber(d.todayPending));

    renderRecentOrders(d.recentOrders || []);
  } catch {
    const body = $("recentOrdersBody");
    if (body) {
      body.innerHTML =
        `<tr><td colspan="7" class="empty-state">불러오기 실패</td></tr>`;
    }
  }
}

function renderRecentOrders(list) {
  const tbody = $("recentOrdersBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML =
      `<tr><td colspan="7" class="empty-state">최근 주문 없음</td></tr>`;
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
      r.status,
    ];
    cells.forEach((v) => {
      const td = document.createElement("td");
      td.textContent = v ?? "-";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

/******************************************************
 * 2) MEMBERS
 ******************************************************/

async function loadMembers(force = false) {
  const bodyId = "membersBody";
  showLoading(bodyId, 11);

  // 캐시가 있으면 먼저 그리기
  if (cache.members.length && !force) {
    renderMembers(cache.members);
  }

  try {
    const data = await apiGet("members");
    cache.members = data.rows || [];
    renderMembers(cache.members);
  } catch {
    const body = $(bodyId);
    if (body && !cache.members.length) {
      body.innerHTML =
        `<tr><td colspan="11" class="empty-state">불러오기 실패</td></tr>`;
    }
  }
}

function getMemberFields(r) {
  return [
    r["회원번호"],
    r["이름"],
    r["전화번호"],
    r["이메일"],
    r["가입일"],
    r["채널"],
    r["등급"],
    r["누적매출"],
    r["포인트"],
    r["최근주문일"],
    r["메모"],
  ];
}

function renderMembers(list) {
  const tbody = $("membersBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML =
      `<tr><td colspan="11" class="empty-state">회원 없음</td></tr>`;
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
      r["메모"],
    ];
    cells.forEach((v) => {
      const td = document.createElement("td");
      td.textContent = v ?? "-";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

createSearch("searchMembers", renderMembers, getMemberFields, "members");

/******************************************************
 * 3) ORDERS
 ******************************************************/

async function loadOrders(force = false) {
  const bodyId = "ordersBody";
  showLoading(bodyId, 8);

  if (cache.orders.length && !force) {
    renderOrders(cache.orders);
  }

  try {
    const data = await apiGet("orders");
    cache.orders = data.rows || [];
    renderOrders(cache.orders);
  } catch {
    const body = $(bodyId);
    if (body && !cache.orders.length) {
      body.innerHTML =
        `<tr><td colspan="8" class="empty-state">불러오기 실패</td></tr>`;
    }
  }
}

function getOrderFields(r) {
  return [
    r["회원번호"],
    r["날짜"] ?? r["주문일자"],
    r["주문번호"],
    r["고객명"],
    r["상품명"],
    r["수량"],
    r["금액"],
    r["상태"],
  ];
}

function renderOrders(list) {
  const tbody = $("ordersBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML =
      `<tr><td colspan="8" class="empty-state">주문 없음</td></tr>`;
    return;
  }

  list.forEach((r) => {
    const tr = document.createElement("tr");
    const cells = [
      r["회원번호"],
      r["날짜"] ?? r["주문일자"],
      r["주문번호"],
      r["고객명"],
      r["상품명"],
      r["수량"],
      fmtCurrency(r["금액"]),
      r["상태"],
    ];
    cells.forEach((v) => {
      const td = document.createElement("td");
      td.textContent = v ?? "-";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

createSearch("searchOrders", renderOrders, getOrderFields, "orders");

/******************************************************
 * 4) PRODUCTS
 ******************************************************/

async function loadProducts(force = false) {
  const bodyId = "productsBody";
  showLoading(bodyId, 5);

  if (cache.products.length && !force) {
    renderProducts(cache.products);
  }

  try {
    const data = await apiGet("products");
    cache.products = data.rows || [];
    renderProducts(cache.products);
  } catch {
    const body = $(bodyId);
    if (body && !cache.products.length) {
      body.innerHTML =
        `<tr><td colspan="5" class="empty-state">불러오기 실패</td></tr>`;
    }
  }
}

function getProductFields(r) {
  return [
    r["상품코드"],
    r["상품명"],
    r["옵션"],
    r["판매가"],
    r["재고"],
    r["채널"],
    r["카테고리"],
    r["브랜드"],
  ];
}

function renderProducts(list) {
  const tbody = $("productsBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML =
      `<tr><td colspan="5" class="empty-state">상품 없음</td></tr>`;
    return;
  }

  list.forEach((r) => {
    const tr = document.createElement("tr");
    const cells = [
      r["상품코드"],
      r["상품명"],
      r["옵션"],
      fmtCurrency(r["판매가"]),
      fmtNumber(r["재고"]),
    ];
    cells.forEach((v) => {
      const td = document.createElement("td");
      td.textContent = v ?? "-";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

createSearch("searchProducts", renderProducts, getProductFields, "products");

/******************************************************
 * 5) STOCK
 ******************************************************/

async function loadStock(force = false) {
  const bodyId = "stockBody";
  showLoading(bodyId, 5);

  if (cache.stock.length && !force) {
    renderStock(cache.stock);
  }

  try {
    const data = await apiGet("stock");
    cache.stock = data.rows || [];
    renderStock(cache.stock);
  } catch {
    const body = $(bodyId);
    if (body && !cache.stock.length) {
      body.innerHTML =
        `<tr><td colspan="5" class="empty-state">불러오기 실패</td></tr>`;
    }
  }
}

function getStockFields(r) {
  return [
    r["상품코드"],
    r["상품명"],
    r["현재 재고"],
    r["안전 재고"],
    r["상태"],
  ];
}

function renderStock(list) {
  const tbody = $("stockBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML =
      `<tr><td colspan="5" class="empty-state">재고 없음</td></tr>`;
    return;
  }

  list.forEach((r) => {
    const tr = document.createElement("tr");
    const cells = [
      r["상품코드"],
      r["상품명"],
      fmtNumber(r["현재 재고"]),
      fmtNumber(r["안전 재고"]),
      r["상태"],
    ];
    cells.forEach((v) => {
      const td = document.createElement("td");
      td.textContent = v ?? "-";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

createSearch("searchStock", renderStock, getStockFields, "stock");

/******************************************************
 * 6) LOGS
 ******************************************************/

async function loadLogs(force = false) {
  const bodyId = "logsBody";
  showLoading(bodyId, 3);

  if (cache.logs.length && !force) {
    renderLogs(cache.logs);
  }

  try {
    const data = await apiGet("logs");
    cache.logs = data.rows || [];
    renderLogs(cache.logs);
  } catch {
    const body = $(bodyId);
    if (body && !cache.logs.length) {
      body.innerHTML =
        `<tr><td colspan="3" class="empty-state">불러오기 실패</td></tr>`;
    }
  }
}

function getLogFields(r) {
  return [r["시간"], r["타입"], r["메시지"]];
}

function renderLogs(list) {
  const tbody = $("logsBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!list.length) {
    tbody.innerHTML =
      `<tr><td colspan="3" class="empty-state">로그 없음</td></tr>`;
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

createSearch("searchLogs", renderLogs, getLogFields, "logs");

/******************************************************
 * 초기화
 ******************************************************/

document.addEventListener("DOMContentLoaded", () => {
  ensureLoggedIn();

  loadKorualUser();
  initThemeToggle();
  initMobileMenu();
  initSidebarNav();
  initLogoutButton();

  pingApi();
  loadDashboard();
});
