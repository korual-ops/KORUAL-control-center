/****************************************
 KORUAL CONTROL CENTER Frontend v3.0
 - Google Apps Script 웹앱 API 연동
 - 시트 조회 + 웹에서 직접 셀 수정
****************************************/

/** 1. 설정 영역 *****************************************/

// ❗ 여기를 "현재 배포된" 웹앱 URL 로 바꿔줘야 한다.
const API = "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec";

// Apps Script 코드의 SECRET 과 동일해야 한다.
const API_SECRET = "KORUAL-ONLY";


/** 2. 공통 API 헬퍼 *****************************************/

/** GET 호출 */
async function apiGet(params) {
  const url = API + "?" + new URLSearchParams(params).toString();
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return await res.json();
}

/** POST 호출 */
async function apiPost(payload) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return await res.json();
}


/** 3. 전역 상태 *****************************************/

// 현재 보고 있는 섹션 key (예: 'dashboard', 'sales', 'hr' ...)
window.currentKey = null;

// 현재 섹션에 사용된 필터/페이지 파라미터 (지금은 비어있지만 확장용)
window.currentParams = {};

// 현재 테이블 헤더 (컬럼명 리스트) – 셀 수정 시 사용
window.currentHeaders = [];


/** 4. 메뉴 로딩 *****************************************/

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

    // 최초 진입 시 대시보드 표시
    await loadSectionInternal("dashboard");
  } catch (err) {
    console.error(err);
    const sidebar = document.getElementById("sidebar-menu");
    sidebar.innerHTML = `<div class="error">메뉴 로딩 실패: ${err.message}</div>`;
  }
}


/** 5. 섹션 로딩 *****************************************/

/**
 * 실제 섹션 로딩 함수 (내부용)
 * @param {string} key - ROUTES.key 값
 * @param {object} extraParams - 필터/페이지 파라미터 (확장용)
 */
async function loadSectionInternal(key, extraParams = {}) {
  try {
    const params = Object.assign({ target: key }, extraParams);
    const data = await apiGet(params);

    if (!data.ok) {
      throw new Error(data.error || "데이터 로딩 실패");
    }

    // 전역 상태 저장
    window.currentKey = key;
    window.currentParams = extraParams;

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

/**
 * HTML에서 직접 쓰는 wrapper
 * (모바일에서 메뉴 자동 닫기까지 포함)
 */
window.loadSection = async (key) => {
  await loadSectionInternal(key);
  const sidebar = document.getElementById("sidebar");
  if (window.innerWidth <= 768 && sidebar) {
    sidebar.classList.remove("open");
  }
};


/** 6. 렌더링 – 대시보드 *****************************************/

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


/** 7. 렌더링 – 테이블(편집 버튼 포함) *****************************/

function renderTable(data) {
  const main = document.getElementById("main-content");
  const headers = data.headers || [];
  const rows = data.rows || [];

  // 전역에 저장 → editCell 에서 사용
  window.currentHeaders = headers;

  if (!headers.length) {
    main.innerHTML = `
      <h1>${data.desc || data.key}</h1>
      <div class="empty">데이터가 없습니다.</div>
    `;
    return;
  }

  // 헤더 + 마지막에 '편집' 컬럼 하나 추가
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


/** 8. 셀 수정 로직 *****************************************/

/**
 * 행 수정 버튼 클릭 시 실행
 * @param {string} key      - ROUTES.key (예: 'hr', 'sales')
 * @param {number} rowIndex - 현재 페이지에서의 0부터 시작하는 행 인덱스
 */
window.editCell = async (key, rowIndex) => {
  const headers = window.currentHeaders || [];
  if (!headers.length) {
    alert("수정할 수 있는 컬럼이 없습니다.");
    return;
  }

  const list = headers.join(", ");
  const column = prompt(
    "수정할 컬럼명을 정확히 입력하세요.\n\n사용 가능 컬럼:\n" + list
  );
  if (column === null) return; // 취소
  if (!headers.includes(column)) {
    alert("컬럼명이 헤더와 일치해야 합니다.");
    return;
  }

  const value = prompt(`'${column}' 컬럼의 새 값을 입력하세요:`);
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

    if (!res.ok) throw new Error(res.error || "업데이트 실패");

    alert("수정 완료!");

    // 방금 보던 섹션을 다시 로딩해서 최신 데이터 반영
    await loadSectionInternal(key, window.currentParams || {});
  } catch (e) {
    console.error(e);
    alert("에러: " + e.message);
  }
};


/** 9. 초기화 (DOM 로드 시점) ***************************************/

document.addEventListener("DOMContentLoaded", () => {
  // 메뉴 + 기본 대시보드 로딩
  loadMenu();

  // 모바일 사이드바 토글
  const toggle = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");

  if (toggle && sidebar) {
    toggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
  }
});
