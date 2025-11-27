/****************************************
 KORUAL CONTROL CENTER Frontend v3.1
 - Apps Script 웹앱과 통신
 - 조회 + 셀 수정 + 행 추가/삭제
****************************************/

// 배포한 웹앱 URL (Code.gs 배포 URL 그대로)
const API = "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec";

// Code.gs 의 API_SECRET 과 동일해야 함
const API_SECRET = "KORUAL-ONLY";

/** GET 헬퍼 */
async function apiGet(params) {
  const url = API + "?" + new URLSearchParams(params).toString();
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return await res.json();
}

/** POST 헬퍼 (preflight 피하려고 text/plain 사용) */
async function apiPost(payload) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return await res.json();
}

// 현재 보고 있는 섹션/필터/헤더 전역 저장
window.currentKey = null;
window.currentParams = {};
window.currentHeaders = [];
window.currentRows = [];

// 행 추가/수정 모달 상태
let editState = {
  mode: "edit",  // "edit" | "add"
  key: null,
  rowIndex: null,
};

/** 메뉴 로딩 */
async function loadMenu() {
  try {
    const data = await apiGet({ target: "routes" });
    if (!data.ok) throw new Error(data.error || "routes 불러오기 실패");

    const routes = (data.routes || [])
      .filter(r => String(r.isActive).trim() === "Y")
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

    const sidebarMenu = document.getElementById("sidebar-menu");
    sidebarMenu.innerHTML = routes.map(r => `
      <button class="menu-btn" onclick="loadSection('${r.key}')">
        <span class="icon">${r.icon || ""}</span>
        <span class="label">${(r.desc || r.key || "").toUpperCase()}</span>
      </button>
    `).join("");

    await loadSectionInternal("dashboard");
  } catch (err) {
    console.error(err);
    const sidebarMenu = document.getElementById("sidebar-menu");
    sidebarMenu.innerHTML = `<div class="error">메뉴 로딩 실패: ${err.message}</div>`;
  }
}

/** 섹션 로딩 내부 함수 */
async function loadSectionInternal(key, extraParams = {}) {
  try {
    const params = Object.assign({ target: key }, extraParams);
    const data = await apiGet(params);

    if (!data.ok) {
      throw new Error(data.error || "데이터 로딩 실패");
    }

    window.currentKey = key;
    window.currentParams = extraParams;
    window.currentHeaders = data.headers || [];
    window.currentRows = data.rows || [];

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

/** 외부에서 쓰는 섹션 로더 (모바일 사이드바 닫기 포함) */
window.loadSection = async (key) => {
  await loadSectionInternal(key);
  const sidebar = document.getElementById("sidebar");
  if (window.innerWidth <= 768 && sidebar) {
    sidebar.classList.remove("open");
  }
};

/** 대시보드 렌더 */
function renderDashboard(d) {
  const main = document.getElementById("main-content");
  if (!d) {
    main.innerHTML = `<div class="error">대시보드 데이터를 불러올 수 없습니다.</div>`;
    return;
  }

  main.innerHTML = `
    <h1>대시보드 요약</h1>
    <div class="card-grid">
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
      <div class="card">
        <div class="label">전체 회원 수</div>
        <div class="value">${Number(d.totalMembers || 0).toLocaleString()} 명</div>
      </div>
      <div class="card">
        <div class="label">전체 직원 수</div>
        <div class="value">${Number(d.totalEmployees || 0).toLocaleString()} 명</div>
      </div>
      <div class="card">
        <div class="label">금일 입사자 수</div>
        <div class="value">${Number(d.newEmployeesToday || 0).toLocaleString()} 명</div>
      </div>
    </div>
  `;
}

/** 테이블 렌더 (+ 상단 툴바, 행 수정/삭제 버튼) */
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

  const thead = headers.map(h => `<th>${h}</th>`).join("") + `<th style="width:90px;">액션</th>`;

  const tbody = rows.map((r, idx) => {
    const tds = headers
      .map(h => `<td>${r[h] !== undefined ? r[h] : ""}</td>`)
      .join("");
    const actionTd = `
      <td>
        <button class="small-btn" onclick="openEditModal('edit', '${data.key}', ${idx})">수정</button>
        <button class="small-btn danger" onclick="deleteRowConfirm('${data.key}', ${idx})">삭제</button>
      </td>`;
    return `<tr>${tds}${actionTd}</tr>`;
  }).join("");

  main.innerHTML = `
    <h1>${data.desc || data.key}</h1>
    <div class="toolbar">
      <button class="small-btn primary" onclick="openEditModal('add', '${data.key}', -1)">행 추가</button>
      <span class="toolbar-info">총 ${data.totalRows || rows.length}행</span>
    </div>
    <div class="table-wrapper">
      <table>
        <thead><tr>${thead}</tr></thead>
        <tbody>${tbody}</tbody>
      </table>
    </div>
  `;
}

/** 모달 열기 (mode: edit | add) */
window.openEditModal = (mode, key, rowIndex) => {
  const headers = window.currentHeaders || [];
  if (!headers.length) {
    alert("수정할 수 있는 컬럼이 없습니다.");
    return;
  }

  editState.mode = mode;
  editState.key = key;
  editState.rowIndex = rowIndex;

  const modal = document.getElementById("edit-modal");
  const titleEl = document.getElementById("edit-modal-title");
  const select = document.getElementById("edit-column");
  const textarea = document.getElementById("edit-value");

  titleEl.textContent = (mode === "add") ? "행 추가" : "셀 편집";

  select.innerHTML = headers
    .map(h => `<option value="${h}">${h}</option>`)
    .join("");

  if (mode === "edit" && rowIndex >= 0) {
    const row = window.currentRows[rowIndex] || {};
    const firstCol = headers[0];
    select.value = firstCol;
    textarea.value = row[firstCol] !== undefined ? row[firstCol] : "";
  } else {
    textarea.value = "";
  }

  modal.classList.remove("hidden");
};

/** 모달 닫기 */
function closeEditModal() {
  const modal = document.getElementById("edit-modal");
  modal.classList.add("hidden");
  editState.key = null;
  editState.rowIndex = null;
}

/** 모달 저장 */
async function saveEditModal() {
  const mode = editState.mode;
  const key = editState.key;
  const rowIndex = editState.rowIndex;

  if (!key) return;

  const column = document.getElementById("edit-column").value;
  const value = document.getElementById("edit-value").value;

  try {
    if (mode === "edit") {
      const res = await apiPost({
        target: "updateCell",
        secret: API_SECRET,
        key,
        rowIndex,
        column,
        value,
      });
      if (!res.ok) throw new Error(res.error || "업데이트 실패");
    } else {
      const valuesObj = {};
      window.currentHeaders.forEach(h => { valuesObj[h] = ""; });
      valuesObj[column] = value;

      const res = await apiPost({
        target: "addRow",
        secret: API_SECRET,
        key,
        values: valuesObj,
      });
      if (!res.ok) throw new Error(res.error || "행 추가 실패");
    }

    closeEditModal();
    await loadSectionInternal(key, window.currentParams || {});
  } catch (e) {
    console.error(e);
    alert("에러: " + e.message);
  }
}

/** 행 삭제 */
window.deleteRowConfirm = async (key, rowIndex) => {
  if (!confirm("정말 이 행을 삭제하시겠습니까?")) return;

  try {
    const res = await apiPost({
      target: "deleteRow",
      secret: API_SECRET,
      key,
      rowIndex,
    });
    if (!res.ok) throw new Error(res.error || "삭제 실패");

    await loadSectionInternal(key, window.currentParams || {});
  } catch (e) {
    console.error(e);
    alert("에러: " + e.message);
  }
};

/** DOMContentLoaded: 초기화 + 모바일 메뉴 + 모달 버튼 */
document.addEventListener("DOMContentLoaded", () => {
  loadMenu();

  const toggle = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");

  if (toggle && sidebar) {
    toggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }

  const modal = document.getElementById("edit-modal");
  const closeBtn = document.getElementById("edit-close-btn");
  const cancelBtn = document.getElementById("edit-cancel-btn");
  const saveBtn = document.getElementById("edit-save-btn");

  closeBtn?.addEventListener("click", closeEditModal);
  cancelBtn?.addEventListener("click", closeEditModal);
  saveBtn?.addEventListener("click", saveEditModal);

  modal?.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeEditModal();
    }
  });
});
