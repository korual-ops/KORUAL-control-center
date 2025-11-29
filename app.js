// KORUAL CONTROL CENTER – FRONTEND v3.0

// 1) 여기 URL만 본인 웹앱 /exec 주소로 맞춰주면 됨
const API_BASE =
  "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec";

// 2) code.gs 의 API_SECRET 과 동일하게 맞추기
const API_SECRET = "KORUAL-ONLY";

// 캐시
let productsCache = [];
let ordersCache = [];
let membersCache = [];
let stockCache = [];
let logsCache = [];

// 공통 GET
async function loadSheet(key) {
  const url = `${API_BASE}?target=${encodeURIComponent(key)}`;
  const res = await fetch(url, { method: "GET" });

  if (!res.ok) throw new Error("HTTP " + res.status);

  const data = await res.json();
  if (data && data.ok === false) throw new Error(data.error || "API error");

  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.rows)) return data.rows;
  return [];
}

// 공통 POST (쓰기)
async function postSheet(key, action, extra) {
  const body = Object.assign(
    {
      secret: API_SECRET,
      target: action, // updateCell, addRow, deleteRow, bulkReplace
      key: key, // products, orders, members, stock, logs
    },
    extra
  );

  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error("HTTP " + res.status);

  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "API error");
  return data;
}

// 동적 테이블 렌더링
function renderDynamicTable(container, rows) {
  if (!rows || rows.length === 0) {
    container.classList.add("empty-state");
    container.textContent = "데이터가 없습니다.";
    return;
  }

  container.classList.remove("empty-state");
  container.innerHTML = "";

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");

  const headers = Object.keys(rows[0] || {});

  const headTr = document.createElement("tr");
  headers.forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    headTr.appendChild(th);
  });
  thead.appendChild(headTr);

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    headers.forEach((h) => {
      const td = document.createElement("td");
      let v = row[h];
      if (v === null || v === undefined) v = "";
      td.textContent = v;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  container.appendChild(table);
}

// 테이블 셀 더블클릭 → 시트 updateCell
function attachEditableTable(container, key, reloadFn) {
  const table = container.querySelector("table");
  if (!table) return;

  const bodyRows = table.querySelectorAll("tbody tr");
  bodyRows.forEach((tr, rowIndex) => {
    const cells = tr.querySelectorAll("td");
    cells.forEach((td, colIndex) => {
      td.addEventListener("dblclick", async () => {
        const oldValue = td.textContent;
        const newValue = window.prompt("새 값 입력", oldValue);
        if (newValue === null || newValue === oldValue) return;

        td.classList.add("updating");
        try {
          // 1행 = 헤더, 데이터는 2행부터라서 +2 / +1
          await postSheet(key, "updateCell", {
            row: rowIndex + 2,
            col: colIndex + 1,
            value: newValue,
          });
          await reloadFn(); // 다시 로딩해서 싱크
        } catch (err) {
          console.error(err);
          alert("시트 수정에 실패했습니다.");
        } finally {
          td.classList.remove("updating");
        }
      });
    });
  });
}

// 검색 필터
function filterRows(rows, keyword) {
  if (!keyword) return rows;
  const lower = keyword.toLowerCase();
  return rows.filter((row) =>
    Object.values(row).some((v) =>
      String(v || "").toLowerCase().includes(lower)
    )
  );
}

// 날짜/금액 유틸
function parseDateSafe(value) {
  if (!value) return null;
  if (
    Object.prototype.toString.call(value) === "[object Date]" &&
    !isNaN(value)
  ) {
    return value;
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d;
}

function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function diffDays(d1, d2) {
  const t1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()).getTime();
  const t2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate()).getTime();
  return Math.round((t1 - t2) / (1000 * 60 * 60 * 24));
}

function parseAmount(raw) {
  if (raw === null || raw === undefined) return 0;
  const num = Number(
    String(raw).replace(/,/g, "").replace(/원/g, "").trim()
  );
  if (isNaN(num)) return 0;
  return num;
}

// API 헬스체크
async function checkApiHealth() {
  const el = document.getElementById("api-status");
  if (!el) return;

  el.textContent = "API 체크 중...";
  el.classList.remove("ok", "error");

  try {
    const res = await fetch(`${API_BASE}?target=ping`, { method: "GET" });
    if (!res.ok) {
      el.textContent = `API 오류 (HTTP ${res.status})`;
      el.classList.add("error");
      return;
    }
    const data = await res.json();
    if (data.ok) {
      el.textContent = "API 연결 정상";
      el.classList.add("ok");
    } else {
      el.textContent = "API 오류";
      el.classList.add("error");
    }
  } catch (e) {
    console.error(e);
    el.textContent = "API 연결 실패";
    el.classList.add("error");
  }
}

// 7일 매출 차트 (간단 바차트)
function renderSalesChart(orders) {
  const chartEl = document.getElementById("sales-chart");
  if (!chartEl) return;

  if (!orders || orders.length === 0) {
    chartEl.classList.add("empty-state");
    chartEl.textContent = "데이터가 없습니다.";
    return;
  }

  chartEl.classList.remove("empty-state");
  chartEl.innerHTML = "";

  const today = new Date();
  const days = [];

  // 최근 7일 날짜 생성 (6일 전 ~ 오늘)
  for (let i = 6; i >= 0; i--) {
    const d = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - i
    );
    const key = d.toISOString().slice(0, 10);
    days.push({ date: d, key, amount: 0 });
  }

  orders.forEach((o) => {
    const rawDate =
      o["주문일자"] || o["날짜"] || o["orderDate"] || o["date"] || o["DATE"];
    const d = parseDateSafe(rawDate);
    if (!d) return;
    const key = d.toISOString().slice(0, 10);
    const day = days.find((x) => x.key === key);
    if (!day) return;
    const rawAmount =
      o["금액"] || o["amount"] || o["Total"] || o["total"] || 0;
    day.amount += parseAmount(rawAmount);
  });

  const maxAmount = Math.max(...days.map((d) => d.amount), 0) || 1;

  const wrapper = document.createElement("div");
  wrapper.className = "sales-chart-bars";

  days.forEach((d) => {
    const col = document.createElement("div");
    col.className = "sales-chart-bar";

    const bar = document.createElement("div");
    bar.className = "sales-chart-bar-inner";
    bar.style.height = `${Math.round((d.amount / maxAmount) * 100)}%`;

    const value = document.createElement("div");
    value.className = "sales-chart-value";
    value.textContent = d.amount ? d.amount.toLocaleString("ko-KR") : "";

    const label = document.createElement("div");
    label.className = "sales-chart-label";
    label.textContent = `${d.date.getMonth() + 1}/${d.date.getDate()}`;

    col.appendChild(value);
    col.appendChild(bar);
    col.appendChild(label);
    wrapper.appendChild(col);
  });

  chartEl.appendChild(wrapper);
}

// DASHBOARD 렌더링
async function renderDashboard() {
  const productsCountEl = document.getElementById("stat-products-count");
  const ordersCountEl = document.getElementById("stat-orders-count");
  const ordersAmountEl = document.getElementById("stat-orders-amount");
  const membersCountEl = document.getElementById("stat-members-count");
  const ordersPreviewEl = document.getElementById("dashboard-orders-preview");
  const todayOrdersEl = document.getElementById("stat-today-orders");
  const todayAmountEl = document.getElementById("stat-today-amount");
  const pendingOrdersEl = document.getElementById("stat-pending-orders");

  if (!productsCountEl) return;

  productsCountEl.textContent = "-";
  ordersCountEl.textContent = "-";
  ordersAmountEl.textContent = "-";
  membersCountEl.textContent = "-";
  todayOrdersEl.textContent = "-";
  todayAmountEl.textContent = "-";
  pendingOrdersEl.textContent = "-";
  ordersPreviewEl.textContent = "데이터 로딩 중...";
  ordersPreviewEl.classList.add("empty-state");

  try {
    const [products, orders, members] = await Promise.all([
      loadSheet("products").catch(() => []),
      loadSheet("orders").catch(() => []),
      loadSheet("members").catch(() => []),
    ]);

    productsCache = products;
    ordersCache = orders;
    membersCache = members;

    productsCountEl.textContent = products.length;
    ordersCountEl.textContent = orders.length;
    membersCountEl.textContent = members.length;

    const today = new Date();
    let totalAmount = 0;
    let todayOrders = 0;
    let todayAmount = 0;
    let pendingOrders = 0;

    orders.forEach((o) => {
      const rawAmount =
        o["금액"] || o["amount"] || o["Total"] || o["total"] || 0;
      const amount = parseAmount(rawAmount);
      totalAmount += amount;

      const rawDate =
        o["주문일자"] ||
        o["날짜"] ||
        o["orderDate"] ||
        o["date"] ||
        o["DATE"];
      const d = parseDateSafe(rawDate);
      if (d && isSameDay(d, today)) {
        todayOrders += 1;
        todayAmount += amount;
      }

      const status =
        o["상태"] || o["주문상태"] || o["status"] || o["Status"];
      if (status && String(status).includes("준비")) {
        pendingOrders += 1;
      }
    });

    ordersAmountEl.textContent =
      totalAmount > 0 ? totalAmount.toLocaleString("ko-KR") + "원" : "-";
    todayOrdersEl.textContent = todayOrders;
    todayAmountEl.textContent =
      todayAmount > 0 ? todayAmount.toLocaleString("ko-KR") + "원" : "0원";
    pendingOrdersEl.textContent = pendingOrders;

    // 최근 주문 10건
    const preview = orders.slice(0, 10);
    renderDynamicTable(ordersPreviewEl, preview);

    // 7일 매출 차트
    renderSalesChart(orders);
  } catch (e) {
    console.error(e);
    ordersPreviewEl.textContent = "대시보드 데이터를 불러올 수 없습니다.";
    ordersPreviewEl.classList.add("empty-state");
  }
}

// PRODUCTS
async function renderProducts(initial = false) {
  const container = document.getElementById("products-table");
  const searchInput = document.getElementById("products-search");
  if (!container) return;

  if (initial || productsCache.length === 0) {
    container.textContent = "데이터 로딩 중...";
    container.classList.add("empty-state");
    try {
      productsCache = await loadSheet("products");
    } catch (e) {
      console.error(e);
      container.textContent = "상품 데이터를 불러올 수 없습니다.";
      container.classList.add("empty-state");
      return;
    }
  }

  let rows = [...productsCache];
  const keyword = searchInput ? searchInput.value.trim() : "";
  const filtered = filterRows(rows, keyword);
  renderDynamicTable(container, filtered);
  attachEditableTable(container, "products", () => renderProducts(true));
}

// ORDERS
async function renderOrders(initial = false) {
  const container = document.getElementById("orders-table");
  const searchInput = document.getElementById("orders-search");
  if (!container) return;

  if (initial || ordersCache.length === 0) {
    container.textContent = "데이터 로딩 중...";
    container.classList.add("empty-state");
    try {
      ordersCache = await loadSheet("orders");
    } catch (e) {
      console.error(e);
      container.textContent = "주문 데이터를 불러올 수 없습니다.";
      container.classList.add("empty-state");
      return;
    }
  }

  let rows = [...ordersCache];
  const keyword = searchInput ? searchInput.value.trim() : "";
  const filtered = filterRows(rows, keyword);
  renderDynamicTable(container, filtered);
  attachEditableTable(container, "orders", () => renderOrders(true));
}

// MEMBERS
async function renderMembers(initial = false) {
  const container = document.getElementById("members-table");
  const searchInput = document.getElementById("members-search");
  if (!container) return;

  if (initial || membersCache.length === 0) {
    container.textContent = "데이터 로딩 중...";
    container.classList.add("empty-state");
    try {
      membersCache = await loadSheet("members");
    } catch (e) {
      console.error(e);
      container.textContent =
        "회원 시트가 없거나 데이터를 불러올 수 없습니다.";
      container.classList.add("empty-state");
      return;
    }
  }

  let rows = [...membersCache];
  const keyword = searchInput ? searchInput.value.trim() : "";
  const filtered = filterRows(rows, keyword);
  renderDynamicTable(container, filtered);
  attachEditableTable(container, "members", () => renderMembers(true));
}

// STOCK
async function renderStock(initial = false) {
  const container = document.getElementById("stock-table");
  const searchInput = document.getElementById("stock-search");
  if (!container) return;

  if (initial || stockCache.length === 0) {
    container.textContent = "데이터 로딩 중...";
    container.classList.add("empty-state");
    try {
      stockCache = await loadSheet("stock");
    } catch (e) {
      console.error(e);
      container.textContent = "재고 데이터를 불러올 수 없습니다.";
      container.classList.add("empty-state");
      return;
    }
  }

  let rows = [...stockCache];
  const keyword = searchInput ? searchInput.value.trim() : "";
  const filtered = filterRows(rows, keyword);
  renderDynamicTable(container, filtered);
  attachEditableTable(container, "stock", () => renderStock(true));
}

// LOGS
async function renderLogs(initial = false) {
  const container = document.getElementById("logs-table");
  const searchInput = document.getElementById("logs-search");
  if (!container) return;

  if (initial || logsCache.length === 0) {
    container.textContent = "데이터 로딩 중...";
    container.classList.add("empty-state");
    try {
      logsCache = await loadSheet("logs");
    } catch (e) {
      console.error(e);
      container.textContent = "로그 데이터를 불러올 수 없습니다.";
      container.classList.add("empty-state");
      return;
    }
  }

  let rows = [...logsCache];
  const keyword = searchInput ? searchInput.value.trim() : "";
  const filtered = filterRows(rows, keyword);
  renderDynamicTable(container, filtered);
  attachEditableTable(container, "logs", () => renderLogs(true));
}

// 섹션 전환
function showSection(sectionId) {
  document
    .querySelectorAll(".section")
    .forEach((sec) => sec.classList.remove("active"));
  const sectionEl = document.getElementById("section-" + sectionId);
  if (sectionEl) sectionEl.classList.add("active");

  document
    .querySelectorAll(".nav-link")
    .forEach((btn) => btn.classList.remove("active"));
  const currentBtn = document.querySelector(
    `.nav-link[data-section="${sectionId}"]`
  );
  if (currentBtn) currentBtn.classList.add("active");

  if (sectionId === "dashboard") {
    renderDashboard();
  } else if (sectionId === "products") {
    renderProducts(true);
  } else if (sectionId === "orders") {
    renderOrders(true);
  } else if (sectionId === "members") {
    renderMembers(true);
  } else if (sectionId === "stock") {
    renderStock(true);
  } else if (sectionId === "logs") {
    renderLogs(true);
  }
}

// 마지막 동기화 시간
function updateLastSync() {
  const el = document.getElementById("last-sync");
  if (!el) return;
  const now = new Date();
  const formatted = now.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  el.textContent = "마지막 동기화: " + formatted;
}

// 라이트/다크 테마 토글
function initThemeToggle() {
  const btn = document.getElementById("toggle-theme");
  if (!btn) return;

  function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    btn.textContent = theme === "dark" ? "Light" : "Dark";
    try {
      localStorage.setItem("korual-theme", theme);
    } catch (e) {}
  }

  let theme = "light";
  try {
    const saved = localStorage.getItem("korual-theme");
    if (saved === "dark" || saved === "light") theme = saved;
  } catch (e) {}
  applyTheme(theme);

  btn.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    applyTheme(theme);
  });
}

// 초기화
function initApp() {
  // 네비게이션
  document.querySelectorAll(".nav-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sectionId = btn.getAttribute("data-section");
      showSection(sectionId);
      window.location.hash = sectionId;
      updateLastSync();
    });
  });

  // 대시보드 → 다른 섹션 점프 버튼
  document.querySelectorAll("button[data-jump]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-jump");
      showSection(target);
      window.location.hash = target;
      updateLastSync();
    });
  });

  // 새로고침 버튼들
  const pr = document.getElementById("products-reload");
  if (pr) pr.addEventListener("click", () => renderProducts(true));

  const or = document.getElementById("orders-reload");
  if (or) or.addEventListener("click", () => renderOrders(true));

  const mr = document.getElementById("members-reload");
  if (mr) mr.addEventListener("click", () => renderMembers(true));

  const sr = document.getElementById("stock-reload");
  if (sr) sr.addEventListener("click", () => renderStock(true));

  const lr = document.getElementById("logs-reload");
  if (lr) lr.addEventListener("click", () => renderLogs(true));

  // 전체 새로고침
  const refreshAll = document.getElementById("refresh-all");
  if (refreshAll) {
    refreshAll.addEventListener("click", () => {
      productsCache = [];
      ordersCache = [];
      membersCache = [];
      stockCache = [];
      logsCache = [];
      const active = document.querySelector(".section.active");
      const id = active ? active.id.replace("section-", "") : "dashboard";
      showSection(id);
      updateLastSync();
    });
  }

  // 검색 이벤트
  const ps = document.getElementById("products-search");
  if (ps) ps.addEventListener("input", () => renderProducts(false));

  const os = document.getElementById("orders-search");
  if (os) os.addEventListener("input", () => renderOrders(false));

  const ms = document.getElementById("members-search");
  if (ms) ms.addEventListener("input", () => renderMembers(false));

  const ss = document.getElementById("stock-search");
  if (ss) ss.addEventListener("input", () => renderStock(false));

  const ls = document.getElementById("logs-search");
  if (ls) ls.addEventListener("input", () => renderLogs(false));

  // 초기 라우팅
  let initial = window.location.hash.replace("#", "");
  if (!initial) initial = "dashboard";
  showSection(initial);
  updateLastSync();
  initThemeToggle();
  checkApiHealth();
}

window.addEventListener("DOMContentLoaded", initApp);
