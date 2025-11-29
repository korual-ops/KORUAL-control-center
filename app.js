// KORUAL CONTROL CENTER – FRONTEND v1.0

const API_BASE =
  "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec";

// 공통: JSON 요청
async function loadSheet(key) {
  const url = `${API_BASE}?target=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "GET",
  });
  if (!res.ok) {
    throw new Error("HTTP " + res.status);
  }
  const data = await res.json();
  if (data.ok === false) {
    throw new Error(data.error || "API error");
  }
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.rows)) return data.rows;
  return [];
}

// 공통: 동적 테이블 렌더링
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

// 공통: 검색 필터
function filterRows(rows, keyword) {
  if (!keyword) return rows;
  const lower = keyword.toLowerCase();
  return rows.filter((row) =>
    Object.values(row).some((v) =>
      String(v || "")
        .toLowerCase()
        .includes(lower)
    )
  );
}

// API 헬스체크
async function checkApiHealth() {
  const el = document.getElementById("api-status");
  try {
    const res = await fetch(`${API_BASE}?target=ping`);
    const json = await res.json();
    if (json.ok) {
      el.textContent = "API 연결 정상";
      el.classList.add("ok");
    } else {
      el.textContent = "API 오류";
      el.classList.add("error");
    }
  } catch (e) {
    el.textContent = "API 연결 실패";
    el.classList.add("error");
  }
}

// 대시보드 렌더링
async function renderDashboard() {
  const productsCountEl = document.getElementById("stat-products-count");
  const ordersCountEl = document.getElementById("stat-orders-count");
  const ordersAmountEl = document.getElementById("stat-orders-amount");
  const membersCountEl = document.getElementById("stat-members-count");
  const ordersPreviewEl = document.getElementById(
    "dashboard-orders-preview"
  );

  productsCountEl.textContent = "-";
  ordersCountEl.textContent = "-";
  ordersAmountEl.textContent = "-";
  membersCountEl.textContent = "-";
  ordersPreviewEl.textContent = "데이터 로딩 중...";
  ordersPreviewEl.classList.add("empty-state");

  try {
    const [products, orders, members] = await Promise.all([
      loadSheet("products").catch(() => []),
      loadSheet("orders").catch(() => []),
      loadSheet("members").catch(() => []),
    ]);

    productsCountEl.textContent = products.length;
    ordersCountEl.textContent = orders.length;
    membersCountEl.textContent = members.length;

    let totalAmount = 0;
    orders.forEach((o) => {
      const raw = o["금액"] ?? o["amount"] ?? o["Total"] ?? 0;
      const num = Number(
        String(raw).replace(/,/g, "").replace(/원/g, "")
      );
      if (!isNaN(num)) totalAmount += num;
    });
    if (totalAmount > 0) {
      ordersAmountEl.textContent =
        totalAmount.toLocaleString("ko-KR") + "원";
    } else {
      ordersAmountEl.textContent = "-";
    }

    const preview = orders.slice(0, 10);
    renderDynamicTable(ordersPreviewEl, preview);
  } catch (e) {
    ordersPreviewEl.textContent = "대시보드 데이터를 불러올 수 없습니다.";
    ordersPreviewEl.classList.add("empty-state");
  }
}

// 상품 화면
let productsCache = [];
async function renderProducts(initial = false) {
  const container = document.getElementById("products-table");
  const searchInput = document.getElementById("products-search");

  if (initial || productsCache.length === 0) {
    container.textContent = "데이터 로딩 중...";
    container.classList.add("empty-state");
    try {
      productsCache = await loadSheet("products");
    } catch (e) {
      container.textContent = "상품 데이터를 불러올 수 없습니다.";
      container.classList.add("empty-state");
      return;
    }
  }

  const keyword = searchInput.value.trim();
  const filtered = filterRows(productsCache, keyword);
  renderDynamicTable(container, filtered);
}

// 주문 화면
let ordersCache = [];
async function renderOrders(initial = false) {
  const container = document.getElementById("orders-table");
  const searchInput = document.getElementById("orders-search");

  if (initial || ordersCache.length === 0) {
    container.textContent = "데이터 로딩 중...";
    container.classList.add("empty-state");
    try {
      ordersCache = await loadSheet("orders");
    } catch (e) {
      container.textContent = "주문 데이터를 불러올 수 없습니다.";
      container.classList.add("empty-state");
      return;
    }
  }

  const keyword = searchInput.value.trim();
  const filtered = filterRows(ordersCache, keyword);
  renderDynamicTable(container, filtered);
}

// 회원 화면
let membersCache = [];
async function renderMembers(initial = false) {
  const container = document.getElementById("members-table");
  const searchInput = document.getElementById("members-search");

  if (initial || membersCache.length === 0) {
    container.textContent = "데이터 로딩 중...";
    container.classList.add("empty-state");
    try {
      membersCache = await loadSheet("members");
    } catch (e) {
      container.textContent =
        "회원 시트가 없거나 데이터를 불러올 수 없습니다.";
      container.classList.add("empty-state");
      return;
    }
  }

  const keyword = searchInput.value.trim();
  const filtered = filterRows(membersCache, keyword);
  renderDynamicTable(container, filtered);
}

// 섹션 전환
function showSection(sectionId) {
  document
    .querySelectorAll(".section")
    .forEach((sec) => sec.classList.remove("active"));
  document
    .getElementById("section-" + sectionId)
    .classList.add("active");

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
  }
}

// 마지막 동기화 시간 표시
function updateLastSync() {
  const el = document.getElementById("last-sync");
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

// 초기화
function initApp() {
  document.querySelectorAll(".nav-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sectionId = btn.getAttribute("data-section");
      showSection(sectionId);
      window.location.hash = sectionId;
      updateLastSync();
    });
  });

  document
    .querySelectorAll("button[data-jump]")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-jump");
        showSection(target);
        window.location.hash = target;
        updateLastSync();
      });
    });

  document
    .getElementById("products-reload")
    .addEventListener("click", () => renderProducts(true));
  document
    .getElementById("orders-reload")
    .addEventListener("click", () => renderOrders(true));
  document
    .getElementById("members-reload")
    .addEventListener("click", () => renderMembers(true));

  document
    .getElementById("refresh-all")
    .addEventListener("click", () => {
      productsCache = [];
      ordersCache = [];
      membersCache = [];
      const activeSection = document.querySelector(".section.active").id.replace("section-", "");
      showSection(activeSection);
      updateLastSync();
    });

  document
    .getElementById("products-search")
    .addEventListener("input", () => renderProducts(false));
  document
    .getElementById("orders-search")
    .addEventListener("input", () => renderOrders(false));
  document
    .getElementById("members-search")
    .addEventListener("input", () => renderMembers(false));

  let initial = window.location.hash.replace("#", "");
  if (!initial) initial = "dashboard";
  showSection(initial);
  updateLastSync();
  checkApiHealth();
}

window.addEventListener("DOMContentLoaded", initApp);
