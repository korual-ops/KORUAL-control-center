/****************************************
 KORUAL CONTROL CENTER Frontend v3.0
 - Google Apps Script API 연결
 - 테이블 렌더링 + 셀 수정 기능(updateCell)
*****************************************/

// ▼ 반드시 ★★최신 웹앱 URL★★로 변경해야 함
const API = "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec";

// Google Script Code.gs 와 동일해야 함
const API_SECRET = "KORUAL-ONLY";

/** GET */
async function apiGet(params) {
  const url = `${API}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return await res.json();
}

/** POST */
async function apiPost(payload) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return await res.json();
}

/** 메뉴 로딩 */
async function loadMenu() {
  try {
    const data = await apiGet({ target: "routes" });
    if (!data.ok) throw new Error(data.error);

    const routes = data.routes
      .filter(r => String(r.isActive).trim() === "Y")
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

    const sidebar = document.getElementById("sidebar-menu");
    sidebar.innerHTML = routes.map(r => `
      <button class="nav-btn" onclick="loadSection('${r.key}')">
        <span class="icon">${r.icon || ""}</span>
        <span class="label">${r.desc || r.key}</span>
      </button>
    `).join("");

    await loadSectionInternal("dashboard");
  } catch (e) {
    console.error(e);
  }
}

/** 현재 상태 저장 */
window.currentKey = null;
window.currentParams = {};
window.currentHeaders = [];

/** 섹션 로딩(내부) */
async function loadSectionInternal(key, extraParams = {}) {
  try {
    const params = { target: key, ...extraParams };
    const data = await apiGet(params);

    window.currentKey = key;
    window.currentParams = extraParams;

    if (key === "dashboard") renderDashboard(data.dashboard);
    else renderTable(data);
  } catch (e) {
    console.error(e);
  }
}

/** HTML에서 직접 호출 */
window.loadSection = async (key) => {
  await loadSectionInternal(key);

  // 모바일 자동 닫기
  const sidebar = document.getElementById("sidebar");
  if (window.innerWidth <= 768 && sidebar) sidebar.classList.remove("open");
};

/** 대시보드 */
function renderDashboard(d) {
  const main = document.getElementById("main-content");

  main.innerHTML = `
    <h1>대시보드</h1>
    <div class="dashboard-grid">
      <div class="card"><div class="label">오늘 매출</div><div class="value">${d.salesToday}</div></div>
      <div class="card"><div class="label">오늘 주문</div><div class="value">${d.ordersToday}</div></div>
      <div class="card"><div class="label">배송지연</div><div class="value">${d.delayedShipments}</div></div>
      <div class="card"><div class="label">신규 회원</div><div class="value">${d.newMembersToday}</div></div>
    </div>
  `;
}

/** 테이블 + 수정 버튼 */
function renderTable(data) {
  const main = document.getElementById("main-content");

  const headers = data.headers;
  const rows = data.rows;

  window.currentHeaders = headers;

  const thead = headers.map(h => `<th>${h}</th>`).join("") + `<th>수정</th>`;
  const tbody = rows.map((r, idx) => {
    const tds = headers.map(h => `<td>${r[h] ?? ""}</td>`).join("");
    return `
      <tr>
        ${tds}
        <td>
          <button class="small-btn" onclick="editCell('${data.key}', ${idx})">수정</button>
        </td>
      </tr>
    `;
  }).join("");

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

/** 셀 수정 로직 */
window.editCell = async (key, rowIndex) => {
  const headers = window.currentHeaders;
  const list = headers.join(", ");

  const column = prompt(`수정할 컬럼명을 입력하세요:\n${list}`);
  if (!column || !headers.includes(column)) return alert("컬럼명이 잘못됨");

  const value = prompt(`새 값을 입력하세요:`);
  if (value === null) return;

  try {
    const res = await apiPost({
      target: "updateCell",
      secret: API_SECRET,
      key,
      rowIndex,
      column,
      value,
    });

    if (!res.ok) throw new Error(res.error);

    alert("업데이트 완료!");
    await loadSectionInternal(key, window.currentParams);
  } catch (e) {
    console.error(e);
    alert("에러 발생: " + e.message);
  }
};

/** 모바일 토글 */
document.addEventListener("DOMContentLoaded", () => {
  loadMenu();

  const toggle = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");

  if (toggle) {
    toggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }
});
