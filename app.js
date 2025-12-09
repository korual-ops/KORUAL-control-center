/*************************************************
 * KORUAL CONTROL CENTER – Front App (Ultra High-End v3)
 * - Core API(code.gs) 전용 SPA 프론트엔드 컨트롤러
 *
 *  특징
 *   - Core API /routes /dashboard 자동 연동
 *   - 사이드바 섹션 클릭 시 각 시트(products/orders/members/stock 등) 자동 로딩
 *   - q / from / to / channel 필터 + 페이지네이션
 *   - 공통 로딩 인디케이터 + 토스트 알림
 *
 *  전제 HTML 구조(예시)
 *   - 사이드바 버튼:
 *       <button class="nav-link" data-section="dashboard">대시보드</button>
 *       <button class="nav-link" data-section="products">상품 관리</button>
 *       <button class="nav-link" data-section="orders">주문 관리</button>
 *       ...
 *
 *   - 메인 컨테이너:
 *       <main id="main-content"></main>
 *
 *   - 상단 필터(있으면 자동 인식, 없어도 동작)
 *       <input  id="filter-search"   type="search" />
 *       <input  id="filter-from"     type="date"   />
 *       <input  id="filter-to"       type="date"   />
 *       <select id="filter-channel"></select>
 *
 *   - 토스트 영역:
 *       <div id="korual-toast"></div>
 *************************************************/

"use strict";

/* ================================================
   0) 전역 설정 / 상태
================================================ */

const CORE_API_BASE =
  "https://script.google.com/macros/s/AKfycbyYWVWNZ8hjn2FFuPhy4OAltjRx70vEHJk5DPgOtf1Lf4rHy8KqrRR5XXmqIz9WHxIEQw/exec";

const KorualState = {
  currentSection: "dashboard",
  routes: [],              // /routes 응답
  cache: {},               // key → { data, pagination, route }
  filters: {
    q: "",
    from: "",
    to: "",
    channel: ""
  }
};


/* ================================================
   1) 유틸 – Core API 래퍼
================================================ */

/** GET 호출 */
async function coreGet(params = {}) {
  const url = new URL(CORE_API_BASE);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, v);
    }
  });

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json"
    }
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    throw new Error(json.message || `GET 실패: ${res.status}`);
  }
  return json;
}

/** POST 호출 */
async function corePost(body = {}) {
  const res = await fetch(CORE_API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(body)
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    throw new Error(json.message || `POST 실패: ${res.status}`);
  }
  return json;
}


/* ================================================
   2) UI 유틸 (로딩, 토스트, 메인 렌더)
================================================ */

/** 메인 컨테이너 핸들 */
function getMainEl() {
  let el = document.getElementById("main-content");
  if (!el) {
    el = document.createElement("main");
    el.id = "main-content";
    document.body.appendChild(el);
  }
  return el;
}

/** 로딩 스피너 표시 */
function showLoading(text = "Loading…") {
  const main = getMainEl();
  main.innerHTML = `
    <div class="korual-loading">
      <div class="korual-spinner"></div>
      <div class="korual-loading-text">${text}</div>
    </div>
  `;
}

/** 토스트 표시 */
function showToast(message, type = "info", timeout = 2800) {
  let el = document.getElementById("korual-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "korual-toast";
    document.body.appendChild(el);
  }

  el.textContent = message;
  el.className = "";
  el.classList.add("korual-toast", `korual-toast-${type}`, "visible");

  if (timeout > 0) {
    setTimeout(() => {
      el.classList.remove("visible");
    }, timeout);
  }
}

/** 섹션 헤더 + 설명 렌더 */
function renderSectionHeader(title, desc = "") {
  return `
    <header class="section-header">
      <div>
        <h1 class="section-title">${title}</h1>
        ${desc ? `<p class="section-subtitle">${desc}</p>` : ""}
      </div>
      <div class="section-header-right">
        <span class="section-badge">KORUAL CONTROL CENTER</span>
      </div>
    </header>
  `;
}


/* ================================================
   3) 대시보드 렌더링
================================================ */

function renderDashboard(data) {
  const main = getMainEl();
  const today = data?.today || "";
  const orders = data?.orders || {};
  const members = data?.members || {};

  main.innerHTML = `
    ${renderSectionHeader(
      "대시보드",
      "오늘의 주문, 회원 지표를 한눈에 확인합니다."
    )}

    <section class="dashboard-grid">
      <article class="dash-card">
        <h2>총 주문</h2>
        <p class="big-number">${orders.total ?? 0}</p>
        <span class="caption">누적 주문 건수</span>
      </article>

      <article class="dash-card">
        <h2>오늘 주문</h2>
        <p class="big-number">${orders.today ?? 0}</p>
        <span class="caption">Today (${today})</span>
      </article>

      <article class="dash-card">
        <h2>총 회원</h2>
        <p class="big-number">${members.total ?? 0}</p>
        <span class="caption">누적 가입자</span>
      </article>

      <article class="dash-card">
        <h2>오늘 신규 회원</h2>
        <p class="big-number">${members.newToday ?? 0}</p>
        <span class="caption">Today (${today})</span>
      </article>
    </section>

    <section class="dashboard-secondary">
      <div class="dash-panel">
        <h3>실시간 상태</h3>
        <ul class="status-list">
          <li>
            <span class="status-dot status-ok"></span>
            Core API: 정상 동작
          </li>
          <li>
            <span class="status-dot status-ok"></span>
            Google Sheets 관제탑: 연결됨
          </li>
        </ul>
      </div>
      <div class="dash-panel">
        <h3>빠른 액션</h3>
        <div class="quick-actions">
          <button class="btn-ghost" data-jump="orders">주문 관리 열기</button>
          <button class="btn-ghost" data-jump="members">회원 관리 열기</button>
          <button class="btn-ghost" data-jump="products">상품 관리 열기</button>
        </div>
      </div>
    </section>
  `;

  // 빠른 액션 버튼 → 섹션 전환
  main.querySelectorAll("[data-jump]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const section = btn.getAttribute("data-jump");
      switchSection(section);
    });
  });
}


/* ================================================
   4) 테이블 섹션 렌더링
================================================ */

/** 공통 테이블 렌더링 */
function renderTableSection(key, payload) {
  const main = getMainEl();
  const rows = payload.data || [];
  const pagination = payload.pagination || {};
  const route = payload.route || {};
  const titleMap = {
    products: "상품 관리",
    orders: "주문 관리",
    members: "회원 관리",
    stock: "재고 관리"
  };

  const title = titleMap[key] || route.key || key || "데이터";
  const desc = route.desc || `${route.sheet || ""} 시트의 데이터를 조회합니다.`;

  if (!rows.length) {
    main.innerHTML = `
      ${renderSectionHeader(title, desc)}
      ${renderFilterBar()}
      <section class="table-wrapper empty">
        <p>조회된 데이터가 없습니다. 필터를 조정해 보세요.</p>
      </section>
    `;
    bindFilterEvents(key);
    return;
  }

  // 헤더 추출
  const headers = Object.keys(rows[0] || {});

  main.innerHTML = `
    ${renderSectionHeader(title, desc)}
    ${renderFilterBar()}
    <section class="table-wrapper">
      <div class="table-scroll">
        <table class="korual-table">
          <thead>
            <tr>
              ${headers.map((h) => `<th>${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
              <tr>
                ${headers
                  .map((h) => `<td>${formatCellValue(row[h])}</td>`)
                  .join("")}
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
      ${renderPagination(pagination)}
    </section>
  `;

  bindFilterEvents(key);
  bindPaginationEvents(key, pagination);
}

/** 필터 영역 렌더링 */
function renderFilterBar() {
  return `
    <section class="filter-bar">
      <div class="filter-left">
        <input
          id="filter-search"
          class="filter-input"
          type="search"
          placeholder="검색어(q)로 필터링"
        />
        <input id="filter-from" class="filter-input" type="date" />
        <input id="filter-to"   class="filter-input" type="date" />
        <select id="filter-channel" class="filter-input">
          <option value="">채널 전체</option>
          <option value="smartstore">스마트스토어</option>
          <option value="coupang">쿠팡</option>
          <option value="shopee">Shopee</option>
          <option value="offline">오프라인</option>
        </select>
      </div>
      <div class="filter-right">
        <button id="filter-apply" class="btn-primary">필터 적용</button>
        <button id="filter-reset" class="btn-ghost">초기화</button>
      </div>
    </section>
  `;
}

/** 페이지네이션 영역 렌더링 */
function renderPagination(pagination) {
  const page = pagination.page || 1;
  const totalPages = pagination.totalPages || 1;
  const total = pagination.total || 0;

  return `
    <footer class="pagination-bar">
      <div class="pagination-info">
        총 <strong>${total}</strong>건 · 페이지 ${page} / ${totalPages}
      </div>
      <div class="pagination-controls">
        <button
          class="btn-ghost page-btn"
          data-page="${page - 1}"
          ${page <= 1 ? "disabled" : ""}
        >
          이전
        </button>
        <button
          class="btn-ghost page-btn"
          data-page="${page + 1}"
          ${page >= totalPages ? "disabled" : ""}
        >
          다음
        </button>
      </div>
    </footer>
  `;
}

/** 셀 값 포맷 (브라우저 환경용) */
function formatCellValue(v) {
  if (v == null) return "";
  if (v === true) return "TRUE";
  if (v === false) return "FALSE";

  // Date 객체
  if (v instanceof Date) {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(v);
  }

  // 문자열인데 날짜처럼 생긴 경우
  if (typeof v === "string") {
    const maybe = new Date(v);
    if (!isNaN(maybe.getTime())) {
      return new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(maybe);
    }
  }

  return v.toString();
}


/* ================================================
   5) 필터 / 페이지네이션 이벤트 바인딩
================================================ */

function bindFilterEvents(key) {
  const qEl = document.getElementById("filter-search");
  const fromEl = document.getElementById("filter-from");
  const toEl = document.getElementById("filter-to");
  const channelEl = document.getElementById("filter-channel");
  const applyEl = document.getElementById("filter-apply");
  const resetEl = document.getElementById("filter-reset");

  if (!applyEl || !resetEl) return;

  // 기존 state를 UI에 반영
  if (qEl) qEl.value = KorualState.filters.q || "";
  if (fromEl) fromEl.value = KorualState.filters.from || "";
  if (toEl) toEl.value = KorualState.filters.to || "";
  if (channelEl) channelEl.value = KorualState.filters.channel || "";

  applyEl.onclick = () => {
    KorualState.filters.q = qEl ? qEl.value.trim() : "";
    KorualState.filters.from = fromEl ? fromEl.value : "";
    KorualState.filters.to = toEl ? toEl.value : "";
    KorualState.filters.channel = channelEl ? channelEl.value : "";
    loadSheetSection(key, 1); // 필터 변경 시 1페이지부터
  };

  resetEl.onclick = () => {
    KorualState.filters = { q: "", from: "", to: "", channel: "" };
    if (qEl) qEl.value = "";
    if (fromEl) fromEl.value = "";
    if (toEl) toEl.value = "";
    if (channelEl) channelEl.value = "";
    loadSheetSection(key, 1);
  };
}

function bindPaginationEvents(key, pagination) {
  const main = getMainEl();
  main.querySelectorAll(".page-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = parseInt(btn.getAttribute("data-page"), 10);
      if (
        !isNaN(page) &&
        page >= 1 &&
        page <= (pagination.totalPages || 1)
      ) {
        loadSheetSection(key, page);
      }
    });
  });
}


/* ================================================
   6) 섹션 로딩 로직
================================================ */

/** 섹션 전환 (사이드바 버튼에서 사용) */
function switchSection(section) {
  KorualState.currentSection = section;

  // 사이드바 비주얼 상태
  document.querySelectorAll(".nav-link").forEach((btn) => {
    if (btn.dataset.section === section) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  if (section === "dashboard") {
    refreshDashboard();
  } else {
    loadSheetSection(section, 1);
  }
}

/** 대시보드 갱신 */
async function refreshDashboard() {
  try {
    showLoading("KORUAL 대시보드 로딩 중…");
    const json = await coreGet({ target: "dashboard" });
    renderDashboard(json.data);
  } catch (err) {
    console.error(err);
    showToast(
      err.message || "대시보드 로딩 중 오류가 발생했습니다.",
      "error"
    );
    getMainEl().innerHTML = `
      ${renderSectionHeader("대시보드", "")}
      <div class="error-box">
        <p>대시보드를 불러오지 못했습니다.</p>
        <p class="error-message">${err.message || ""}</p>
        <button class="btn-primary" id="dash-retry">다시 시도</button>
      </div>
    `;
    const retry = document.getElementById("dash-retry");
    if (retry) retry.onclick = refreshDashboard;
  }
}

/** ROUTES 전체 로딩 (초기 1회) */
async function loadRoutesMeta() {
  try {
    const json = await coreGet({ target: "routes" });
    KorualState.routes = json.data || [];
  } catch (err) {
    console.warn("ROUTES 로딩 실패 (선택 기능):", err);
  }
}

/** 특정 key 기준 시트 섹션 로딩 */
async function loadSheetSection(key, page = 1) {
  try {
    showLoading(`${key} 데이터 로딩 중…`);

    const params = {
      target: key,
      page,
      pageSize: 50
    };

    if (KorualState.filters.q) params.q = KorualState.filters.q;
    if (KorualState.filters.from) params.from = KorualState.filters.from;
    if (KorualState.filters.to) params.to = KorualState.filters.to;
    if (KorualState.filters.channel)
      params.channel = KorualState.filters.channel;

    const json = await coreGet(params);

    // 캐시 업데이트
    KorualState.cache[key] = {
      data: json.data || [],
      pagination: json.pagination || {},
      route: json.route || {}
    };

    renderTableSection(key, KorualState.cache[key]);
  } catch (err) {
    console.error(err);
    showToast(
      err.message || `${key} 데이터 로딩 중 오류가 발생했습니다.`,
      "error"
    );
    getMainEl().innerHTML = `
      ${renderSectionHeader(key, "")}
      <div class="error-box">
        <p>데이터를 불러오지 못했습니다.</p>
        <p class="error-message">${err.message || ""}</p>
        <button class="btn-primary" id="section-retry">다시 시도</button>
      </div>
    `;
    const retry = document.getElementById("section-retry");
    if (retry) retry.onclick = () => loadSheetSection(key, 1);
  }
}


/* ================================================
   7) 초기화 – 네비게이션 바인딩
================================================ */

function bindSidebarNav() {
  document.querySelectorAll(".nav-link").forEach((btn) => {
    btn.addEventListener("click", () => {
      const section = btn.dataset.section || "dashboard";
      switchSection(section);
    });
  });
}

/** 앱 초기화 */
async function initKorualApp() {
  try {
    showLoading("KORUAL CONTROL CENTER 준비 중…");

    // 헬스체크
    await coreGet({ target: "ping" });
    showToast("KORUAL Core API 연결 성공", "success", 2000);

    // ROUTES 메타 (선택 기능, 실패해도 앱 동작)
    loadRoutesMeta();

    // 사이드바 바인딩
    bindSidebarNav();

    // 기본 섹션: 대시보드
    switchSection("dashboard");
  } catch (err) {
    console.error(err);
    showToast(
      err.message || "Core API 연결에 실패했습니다.",
      "error"
    );
    const main = getMainEl();
    main.innerHTML = `
      ${renderSectionHeader("KORUAL CONTROL CENTER", "")}
      <div class="error-box">
        <p>Core API에 연결할 수 없습니다.</p>
        <p class="error-message">${err.message || ""}</p>
        <button class="btn-primary" id="app-retry">다시 시도</button>
      </div>
    `;
    const retry = document.getElementById("app-retry");
    if (retry) retry.onclick = initKorualApp;
  }
}

document.addEventListener("DOMContentLoaded", initKorualApp);

