/****************************************
 KORUAL CONTROL CENTER Frontend v3.0
 - 구글 Apps Script 웹앱 API와 통신 + 셀 수정
*****************************************/

// 배포한 웹앱 URL
const API = "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec";

// 백엔드 SECRET 과 반드시 동일해야 함
const API_SECRET = "KORUAL-ONLY";

/** GET 헬퍼 */
async function apiGet(params) {
  const url = API + "?" + new URLSearchParams(params).toString();
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return await res.json();
}

/** POST 헬퍼 */
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
    if (!data.ok) throw new Error(data.error || "routes 불러오기 실패");

    const routes = (data.routes || [])
      .filter(r => String(r.isActive).trim() === "Y")
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

    const sidebar = document.getElementById("sidebar-menu");
    sidebar.innerHTML = routes.map(r => `
      <button class="nav-btn" onclick="loadSection('${r.key}')">
        <span class="icon">${r.icon || ""}</span>
        <span class="label">${r.desc || r.key || ""}</span>
      </button>
    `).join("");

    await loadSectionInternal("dashboard");
  } catch (err) {
    console.error(err);
    const sidebar = document.getElementById("sidebar-menu");
    sidebar.innerHTML = `<div class="error">메뉴 로딩 실패: ${err.message}</div>`;
  }
}

// 현재 상태 저장
window.currentKey = null;
window.currentParams = {};
window.currentHeaders = [];

/** 실제 섹션 로딩 */
async function loadSectionInternal(key, extraParams = {}) {
  try {
    const params = Object.assign({ target: key }, extraParams);
    const data = await apiGet(params);

    if (!data.ok) throw new Error(data.error || "데이터 로딩 실패");

    window.currentKey = key;
    window.currentParams = extraParams;
    window.currentHeaders = data.headers || [];

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

/** 대시보드 렌더 */
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

/** 테이블 + 편집 버튼 */
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

  const thead = headers.map(h => `<th>${h}</th>`).join("") + `<th>편집</th>`;

  const tbody = rows.map((r, idx) => {
    const tds = headers
      .map(h => `<td>${r[h] !== undefined ? r[h] : ""}</td>`)
      .join("");
    const editBtn = `<td><button class="small-btn" onclick="editCell('${data.key}', ${idx})">수정</button></td>`;
    return `<tr>${tds}${editBtn}</tr>`;
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

/** 페이지 로드 시 실행 + 모바일 메뉴 토글 */
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

/** 메뉴에서 호출하는 전역 함수 */
window.loadSection = async (key) => {
  await loadSectionInternal(key);
  const sidebar = document.getElementById("sidebar");
  if (window.innerWidth <= 768 && sidebar) {
    sidebar.classList.remove("open");
  }
};

/** 행 수정 */
// 모달 상태 저장용 전역 변수
let editState = {
  key: null,
  rowIndex: null,
};

// 행 수정: 모달 열기
window.editCell = (key, rowIndex) => {
  const headers = window.currentHeaders || [];
  if (!headers.length) {
    alert("수정할 수 있는 컬럼이 없습니다.");
    return;
  }

  editState.key = key;
  editState.rowIndex = rowIndex;

  const modal = document.getElementById("edit-modal");
  const select = document.getElementById("edit-column");
  const textarea = document.getElementById("edit-value");

  // 컬럼 셀렉트박스 채우기
  select.innerHTML = headers
    .map(h => `<option value="${h}">${h}</option>`)
    .join("");

  textarea.value = "";

  modal.classList.remove("hidden");
};

// 모달 닫기 함수
function closeEditModal() {
  const modal = document.getElementById("edit-modal");
  modal.classList.add("hidden");
  editState.key = null;
  editState.rowIndex = null;
}

// 저장 버튼 동작
async function saveEditModal() {
  const key = editState.key;
  const rowIndex = editState.rowIndex;

  if (key == null || rowIndex == null) return;

  const column = document.getElementById("edit-column").value;
  const value = document.getElementById("edit-value").value;

  try {
    const res = await apiPost({
      target: "updateCell",
      secret: API_SECRET,
      key,
      rowIndex,
      column,
      value,
    });

    if (!res.ok) throw new Error(res.error || "업데이트 실패");

    closeEditModal();
    await loadSectionInternal(key, window.currentParams || {});
  } catch (e) {
    console.error(e);
    alert("에러: " + e.message);
  }
}

/** DOMContentLoaded 안에 모달 연결 추가 */
document.addEventListener("DOMContentLoaded", () => {
  loadMenu();

  const toggle = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");

  if (toggle && sidebar) {
    toggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }

  // 모달 버튼 이벤트
  const closeBtn = document.getElementById("edit-close-btn");
  const cancelBtn = document.getElementById("edit-cancel-btn");
  const saveBtn = document.getElementById("edit-save-btn");
  const modal = document.getElementById("edit-modal");

  closeBtn?.addEventListener("click", closeEditModal);
  cancelBtn?.addEventListener("click", closeEditModal);
  saveBtn?.addEventListener("click", saveEditModal);

  // 바깥 클릭 시 닫기
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeEditModal();
    }
  });
});

