/********************************************
 KORUAL CONTROL CENTER — Unified Frontend
 - ROUTES 기반 메뉴 자동 생성
 - target별 페이지 자동 렌더링
 - Dashboard / Tables 자동 처리
********************************************/

// 🔥 관제탑 API URL — 김양수님 Apps Script 웹앱 URL로 변경
const API_BASE = "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec";

/* --------------------------
   초기 실행
--------------------------- */
async function initializeControlCenter() {
  await loadMenu();
  await loadSection("dashboard");
}

/* --------------------------
   ROUTES → 메뉴 자동 생성
--------------------------- */
async function loadMenu() {
  const sidebar = document.getElementById("sidebar-menu");
  sidebar.innerHTML = `<div class='loading'>Loading menu...</div>`;

  try {
    const res = await fetch(`${API_BASE}?target=routes`);
    const data = await res.json();

    if (!data.ok) {
      sidebar.innerHTML = `<div class='error'>ROUTES 불러오기 실패</div>`;
      return;
    }

    let routes = data.routes
      .filter(r => r.isActive === "Y")
      .sort((a, b) => Number(a.order) - Number(b.order));

    sidebar.innerHTML = routes.map(r => `
      <button class="menu-btn" onclick="loadSection('${r.key}')">
        ${r.icon || ""} ${r.desc || r.key.toUpperCase()}
      </button>
    `).join("");

  } catch (err) {
    sidebar.innerHTML = `<div class='error'>연결 오류</div>`;
  }
}

/* --------------------------
   target별 페이지 로딩
--------------------------- */
async function loadSection(key) {
  const main = document.getElementById("main-content");
  main.innerHTML = `<div class='loading'>Loading ${key}...</div>`;

  try {
    const res = await fetch(`${API_BASE}?target=${key}`);
    const data = await res.json();

    if (!data.ok) {
      main.innerHTML = `<div class='error'>${data.error}</div>`;
      return;
    }

    if (key === "dashboard") {
      renderDashboard(data.dashboard);
    } else {
      renderTable(data);
    }

  } catch (err) {
    main.innerHTML = `<div class='error'>네트워크 오류 발생</div>`;
  }
}

/* --------------------------
   대시보드 렌더링
--------------------------- */
function renderDashboard(d) {
  const main = document.getElementById("main-content");

  main.innerHTML = `
    <section class="dashboard">
      <h1>📊 KORUAL Dashboard</h1>

      <div class="card-grid">

        <div class="card">
          <h2>오늘 매출</h2>
          <div class="value">${(d.salesToday || 0).toLocaleString()} 원</div>
        </div>

        <div class="card">
          <h2>오늘 주문수</h2>
          <div class="value">${d.ordersToday || 0} 건</div>
        </div>

        <div class="card warning">
          <h2>배송지연</h2>
          <div class="value">${d.delayedShipments || 0} 건</div>
        </div>

        <div class="card">
          <h2>신규회원</h2>
          <div class="value">${d.newMembersToday || 0} 명</div>
        </div>

      </div>
    </section>
  `;
}

/* --------------------------
   공통 테이블 렌더링
--------------------------- */
function renderTable(data) {
  const main = document.getElementById("main-content");

  const headers = data.headers;
  const rows = data.rows;

  const thead = headers.map(h => `<th>${h}</th>`).join("");
  const tbody = rows.map(row => `
    <tr>
      ${headers.map(h => `<td>${row[h] ?? ""}</td>`).join("")}
    </tr>
  `).join("");

  main.innerHTML = `
    <section>
      <h1>${data.desc || data.key}</h1>
      <div class="table-wrapper">
        <table>
          <thead><tr>${thead}</tr></thead>
          <tbody>${tbody}</tbody>
        </table>
      </div>
    </section>
  `;
}


