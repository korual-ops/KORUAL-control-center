/****************************************
 KORUAL CONTROL CENTER Frontend v2.0
 - 구글 Apps Script 웹앱 API와 통신
*****************************************/

// 여기를 네가 배포한 웹앱 URL로 바꿔줘
const API = "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec";

async function apiGet(params) {
  const url = API + "?" + new URLSearchParams(params).toString();
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return await res.json();
}

async function loadMenu() {
  try {
    const data = await apiGet({ target: "routes" });
    if (!data.ok) throw new Error(data.error || "routes 불러오기 실패");

    const routes = (data.routes || [])
      .filter(r => String(r.isActive).trim() === "Y")
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

    const sidebar = document.getElementById("sidebar-menu");
    sidebar.innerHTML = routes.map(r => `
      <button class="nav-btn" onclick="loadSection('${r.key}')">
        <span class="icon">${r.icon || ""}</span>
        <span class="label">${(r.desc || r.key || "").toUpperCase()}</span>
      </button>
    `).join("");

    // 처음엔 대시보드 표시
    await loadSection("dashboard");
  } catch (err) {
    console.error(err);
    const sidebar = document.getElementById("sidebar-menu");
    sidebar.innerHTML = `<div class="error">메뉴 로딩 실패: ${err.message}</div>`;
  }
}

async function loadSection(key) {
  try {
    const data = await apiGet({ target: key });

    if (!data.ok) {
      throw new Error(data.error || "데이터 로딩 실패");
    }

    if (key === "dashboard") {
      renderDashboard(data.dashboard);
    } else {
      renderTable(data);
    }
  } catch (err) {
    console.error(err);
    const main = document.getElementById("main-content");
    main.innerHTML = `<div class="error">섹션 로딩 실패: ${err.message}</div>`;
  }
}

function renderDashboard(d) {
  const main = document.getElementById("main-content");
  if (!d) {
    main.innerHTML = `<div class="error">대시보드 데이터를 불러올 수 없습니다.</div>`;
    return;
  }

  main.innerHTML = `
    <h1>대시보드 요약</h1>
    <div class="dashboard-grid">
      <div class="card">
        <div class="label">오늘 매출</div>
        <div class="value">${Number(d.salesToday || 0).toLocaleString()} 원</div>
      </div>
      <div class="card">
        <div class="label">오늘 주문 건수</div>
        <div class="value">${Number(d.ordersToday || 0).toLocaleString()} 건</div>
      </div>
      <div class="card">
        <div class="label">배송 지연 건수</div>
        <div class="value">${Number(d.delayedShipments || 0).toLocaleString()} 건</div>
      </div>
      <div class="card">
        <div class="label">금일 신규 회원</div>
        <div class="value">${Number(d.newMembersToday || 0).toLocaleString()} 명</div>
      </div>
    </div>
  `;
}

function renderTable(data) {
  const main = document.getElementById("main-content");
  const headers = data.headers || [];
  const rows = data.rows || [];

  if (!headers.length) {
    main.innerHTML = `
      <h1>${data.desc || data.key}</h1>
      <div class="empty">데이터가 없습니다.</div>
    `;
    return;
  }

  const thead = headers.map(h => `<th>${h}</th>`).join("");
  const tbody = rows.map(r => `
    <tr>${headers.map(h => `<td>${r[h] !== undefined ? r[h] : ""}</td>`).join("")}</tr>
  `).join("");

  main.innerHTML = `
    <h1>${data.desc || data.key}</h1>
    <div class="table-wrapper">
      <table>
        <thead><tr>${thead}</tr></thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  loadMenu();
});


document.addEventListener("DOMContentLoaded", () => {
  loadMenu();

  const toggle = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");

  if (toggle && sidebar) {
    toggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }
});
