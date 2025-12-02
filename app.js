/******************************************************
 * KORUAL CONTROL CENTER – Frontend (High-End app.js)
 * - 대시보드 / 상품 / 주문 / 회원 / 재고 / 로그
 * - Google Apps Script Web App(code.gs High-End) 연동
 * - 테마 토글, 모바일 사이드바, 검색 + 페이징, 행 수정/삭제 모달
 ******************************************************/

/* ==============================
   0) 기본 설정
============================== */

// ※ 배포된 Web App URL 로 교체해서 사용
const API_BASE   = "https://script.google.com/macros/s/여기에_배포_URL_ID/exec";
const API_SECRET = "KORUAL-ONLY";

const PAGE_SIZE = 20;

/* ==============================
   1) 전역 상태
============================== */

const STATE = {
  lastSync: null,
  entities: {
    products: { sheet: "PRODUCTS", rows: [], filtered: [], page: 1 },
    orders:   { sheet: "ORDERS",   rows: [], filtered: [], page: 1 },
    members:  { sheet: "MEMBERS",  rows: [], filtered: [], page: 1 },
    stock:    { sheet: "STOCK",    rows: [], filtered: [], page: 1 },
    logs:     { sheet: "LOGS",     rows: [], filtered: [], page: 1 },
  },
  currentEdit: null,
};

/**
 * 엔티티별 컬럼/검색/관리 설정
 * - columns: 시트 헤더 순서와 동일하게 맞추는 것이 중요
 * - searchKeys: 검색에 사용할 컬럼들
 * - titleKey: 삭제 모달에 대표 타이틀로 쓸 컬럼
 * - columnCount: 테이블 실제 컬럼 수 (관리 포함)
 * - editable: 수정/삭제 가능 여부
 */
const ENTITY_CONFIG = {
  products: {
    sheet: "PRODUCTS",
    columns: ["상품코드", "상품명", "옵션", "판매가", "재고", "채널"],
    searchKeys: ["상품코드", "상품명", "옵션", "채널"],
    titleKey: "상품명",
    columnCount: 6,
    editable: false,
  },
  orders: {
    sheet: "ORDERS",
    columns: ["회원번호", "날짜", "주문번호", "고객명", "상품명", "수량", "금액", "상태", "채널"],
    searchKeys: ["회원번호", "주문번호", "고객명", "상품명", "상태", "채널"],
    titleKey: "주문번호",
    columnCount: 9,
    editable: false,
  },
  members: {
    sheet: "MEMBERS",
    columns: ["회원번호", "이름", "전화번호", "이메일", "가입일", "채널", "등급", "누적매출", "포인트", "최근주문일", "메모"],
    searchKeys: ["회원번호", "이름", "전화번호", "이메일", "등급", "채널"],
    titleKey: "이름",
    columnCount: 12, // + 관리
    editable: true,
  },
  stock: {
    sheet: "STOCK",
    columns: ["상품코드", "상품명", "현재 재고", "안전 재고", "상태", "창고", "채널"],
    searchKeys: ["상품코드", "상품명", "상태", "창고", "채널"],
    titleKey: "상품명",
    columnCount: 8, // + 관리
    editable: true,
  },
  logs: {
    sheet: "LOGS",
    columns: ["시간", "타입", "메시지", "상세"],
    searchKeys: ["시간", "타입", "메시지", "상세"],
    titleKey: "메시지",
    columnCount: 4,
    editable: false,
  },
};

/* ==============================
   2) 헬퍼 함수들
============================== */

const $ = (id) => document.getElementById(id);

function formatNumber(n) {
  const num = Number(n || 0);
  return num.toLocaleString("ko-KR");
}

function formatCurrency(n) {
  const num = Number(n || 0);
  if (!num) return "-";
  return num.toLocaleString("ko-KR") + "원";
}

function formatDateLabel(dateObj) {
  try {
    const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}

function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

/* ==============================
   3) 토스트 / 스피너
============================== */

function showToast(message, type = "info") {
  const root = $("toastRoot");
  if (!root) return;

  const el = document.createElement("div");
  el.className =
    "toast " +
    (type === "success"
      ? "toast-success"
      : type === "error"
      ? "toast-error"
      : "toast-info");

  el.innerHTML = `
    <span class="mr-1">
      ${type === "success" ? "✅" : type === "error" ? "⚠️" : "🔔"}
    </span>
    <span class="flex-1">${message}</span>
  `;

  root.appendChild(el);

  setTimeout(() => {
    el.classList.add("hide");
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 280);
  }, 2600);
}

function setSpinner(visible) {
  const sp = $("globalSpinner");
  if (!sp) return;
  if (visible) sp.classList.remove("hidden");
  else sp.classList.add("hidden");
}

/* ==============================
   4) API 헬퍼
============================== */

async function getJson(target) {
  const url = `${API_BASE}?target=${encodeURIComponent(target)}`;
  const t0 = performance.now();
  const res = await fetch(url);
  const t1 = performance.now();
  const elapsed = Math.round(t1 - t0);

  if (target === "ping") {
    updateApiStatus(res.ok, elapsed);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.ok === false) {
    const msg = data.error || data.message || `API 오류: ${target}`;
    throw new Error(msg);
  }

  return { data, elapsed };
}

async function postJson(target, payload = {}) {
  const body = {
    ...payload,
    target,
    secret: API_SECRET,
  };

  const res = await fetch(API_BASE, {
    method: "POST",
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    const msg = data.error || data.message || `API 오류: ${target}`;
    throw new Error(msg);
  }
  return data;
}

/* ==============================
   5) API 상태 표시
============================== */

function updateApiStatus(ok, ms) {
  const dot = $("apiStatusDot");
  const txt = $("apiStatusText");
  const ping = $("apiPing");
  if (ping && typeof ms === "number") ping.textContent = ms + " ms";

  if (!dot || !txt) return;

  if (ok) {
    dot.style.background = "#4ade80";
    dot.style.boxShadow = "0 0 0 6px rgba(74,222,128,0.35)";
    txt.textContent = "Auth API Online";
  } else {
    dot.style.background = "#fb7185";
    dot.style.boxShadow = "0 0 0 6px rgba(248,113,113,0.4)";
    txt.textContent = "Auth API Error";
  }
}

async function pingApiOnce() {
  try {
    await getJson("ping");
  } catch {
    updateApiStatus(false, null);
  }
}

/* ==============================
   6) 테마 / 네비 / 사용자
============================== */

function applyTheme(mode) {
  const body = document.body;
  const isDark = mode !== "light";
  body.classList.toggle("theme-dark", isDark);
  localStorage.setItem("korual_theme", isDark ? "dark" : "light");

  const btn = $("themeToggle");
  if (!btn) return;
  const labelEl = btn.querySelector(".theme-toggle-label");
  if (!labelEl) return;

  if (isDark) {
    labelEl.textContent = labelEl.dataset.dark || "Dark";
  } else {
    labelEl.textContent = labelEl.dataset.light || "Light";
  }
}

function initTheme() {
  const saved = localStorage.getItem("korual_theme") || "dark";
  applyTheme(saved);
  const btn = $("themeToggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const current = localStorage.getItem("korual_theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    applyTheme(next);
  });
}

function initUserHeader() {
  try {
    const raw = localStorage.getItem("korual_user");
    if (!raw) return;
    const u = JSON.parse(raw);
    const name = u.full_name || u.username || "KORUAL";
    if ($("welcomeUser")) $("welcomeUser").textContent = name;
  } catch {
    // ignore
  }

  const btnLogout = $("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.removeItem("korual_user");
      showToast("로그아웃 되었습니다.", "info");
      setTimeout(() => {
        location.replace("index.html");
      }, 500);
    });
  }
}

function initNav() {
  const links = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll(".section");

  links.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.section;
      if (!target) return;

      links.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      sections.forEach((sec) => {
        if (sec.id === `section-${target}`) {
          sec.classList.add("active");
        } else {
          sec.classList.remove("active");
        }
      });
    });
  });

  // 대시보드 → 주문관리 바로가기
  const goOrders = $("goOrders");
  if (goOrders) {
    goOrders.addEventListener("click", () => {
      const targetBtn = document.querySelector('.nav-link[data-section="orders"]');
      if (targetBtn) targetBtn.click();
    });
  }
}

function initMobileSidebar() {
  const btn = $("menuToggle");
  const sidebar = document.querySelector(".sidebar");
  const backdrop = $("sidebarBackdrop");
  if (!btn || !sidebar || !backdrop) return;

  const open = () => sidebar.classList.add("open");
  const close = () => sidebar.classList.remove("open");

  btn.addEventListener("click", () => {
    if (sidebar.classList.contains("open")) close();
    else open();
  });
  backdrop.addEventListener("click", close);
}

/* ==============================
   7) 대시보드 로딩
============================== */

async function loadDashboard() {
  const cardTotalProducts = $("cardTotalProducts");
  const cardTotalOrders   = $("cardTotalOrders");
  const cardTotalRevenue  = $("cardTotalRevenue");
  const cardTotalMembers  = $("cardTotalMembers");
  const todayOrders       = $("todayOrders");
  const todayRevenue      = $("todayRevenue");
  const todayPending      = $("todayPending");
  const recentBody        = $("recentOrdersBody");
  const todayLabel        = $("todayDateLabel");

  try {
    const { data } = await getJson("dashboard");

    if (cardTotalProducts) cardTotalProducts.textContent = formatNumber(data.totalProducts);
    if (cardTotalOrders)   cardTotalOrders.textContent   = formatNumber(data.totalOrders);
    if (cardTotalRevenue)  cardTotalRevenue.textContent  = formatCurrency(data.totalRevenue);
    if (cardTotalMembers)  cardTotalMembers.textContent  = formatNumber(data.totalMembers);

    if (todayOrders)  todayOrders.textContent  = formatNumber(data.todayOrders);
    if (todayRevenue) todayRevenue.textContent = formatCurrency(data.todayRevenue);
    if (todayPending) todayPending.textContent = formatNumber(data.todayPending);

    if (todayLabel) {
      const now = new Date();
      todayLabel.textContent = formatDateLabel(now) + " 기준";
    }

    if (recentBody) {
      const list = Array.isArray(data.recentOrders) ? data.recentOrders : [];
      if (!list.length) {
        recentBody.innerHTML = `<tr><td colspan="7" class="empty-state">최근 주문이 없습니다.</td></tr>`;
      } else {
        recentBody.innerHTML = "";
        list.forEach((o) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${o.order_date || ""}</td>
            <td>${o.order_no || ""}</td>
            <td>${o.item_name || ""}</td>
            <td>${formatNumber(o.qty)}</td>
            <td>${formatCurrency(o.amount)}</td>
            <td>${o.channel || ""}</td>
            <td>${o.status || ""}</td>
          `;
          recentBody.appendChild(tr);
        });
      }
    }
  } catch (err) {
    if (recentBody) {
      recentBody.innerHTML = `<tr><td colspan="7" class="empty-state">대시보드 데이터를 불러오는 중 오류가 발생했습니다.</td></tr>`;
    }
    showToast(err.message || "대시보드 로딩 중 오류", "error");
  }
}

/* ==============================
   8) 리스트 로딩 / 렌더링
============================== */

async function loadEntity(entityKey) {
  const entityState = STATE.entities[entityKey];
  if (!entityState) return;

  const cfg = ENTITY_CONFIG[entityKey];
  if (!cfg) return;

  const target = entityKey; // members → target=members
  try {
    const { data } = await getJson(target);
    const rows = Array.isArray(data.rows) ? data.rows : [];

    // 시트 rowIndex (2행부터 데이터)
    const withIndex = rows.map((r, idx) => ({
      ...r,
      __rowIndex: idx + 2,
    }));

    entityState.rows = withIndex;
    entityState.filtered = [...withIndex];
    entityState.page = 1;

    renderEntityTable(entityKey);
  } catch (err) {
    const tbody = document.querySelector(
      `tbody[data-entity="${entityKey}"]`
    );
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="${cfg.columnCount}" class="empty-state">${cfg.sheet} 데이터를 불러오는 중 오류가 발생했습니다.</td></tr>`;
    }
    showToast(err.message || `${entityKey} 로딩 중 오류`, "error");
  }
}

function renderEntityTable(entityKey) {
  const cfg = ENTITY_CONFIG[entityKey];
  const entityState = STATE.entities[entityKey];
  if (!cfg || !entityState) return;

  const tbody = document.querySelector(
    `tbody[data-entity="${entityKey}"]`
  );
  if (!tbody) return;

  const pager = $(`${entityKey}Pager`);
  const rows = entityState.filtered || [];
  const pageSize = PAGE_SIZE;
  const total = rows.length;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(entityState.page || 1, maxPage);

  entityState.page = page;

  if (!total) {
    tbody.innerHTML = `<tr><td colspan="${cfg.columnCount}" class="empty-state">데이터가 없습니다.</td></tr>`;
  } else {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const slice = rows.slice(start, end);

    tbody.innerHTML = "";

    slice.forEach((row) => {
      const tr = document.createElement("tr");

      // 데이터 컬럼
      cfg.columns.forEach((key) => {
        const td = document.createElement("td");
        let val = row[key];

        if (key === "판매가" || key === "금액" || key === "누적매출") {
          td.textContent = formatCurrency(val);
        } else if (
          key === "현재 재고" ||
          key === "안전 재고" ||
          key === "수량" ||
          key === "포인트"
        ) {
          td.textContent = formatNumber(val);
        } else {
          td.textContent = val != null ? String(val) : "";
        }

        tr.appendChild(td);
      });

      // 관리 컬럼 (있는 엔티티만)
      if (cfg.editable) {
        const td = document.createElement("td");
        td.className = "table-actions";

        const btnEdit = document.createElement("button");
        btnEdit.type = "button";
        btnEdit.className = "table-btn";
        btnEdit.textContent = "수정";
        btnEdit.addEventListener("click", (e) => {
          e.stopPropagation();
          openEditRow(entityKey, row);
        });

        const btnDel = document.createElement("button");
        btnDel.type = "button";
        btnDel.className = "table-btn danger";
        btnDel.textContent = "삭제";
        btnDel.addEventListener("click", (e) => {
          e.stopPropagation();
          openDeleteRow(entityKey, row);
        });

        td.appendChild(btnEdit);
        td.appendChild(btnDel);
        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    });
  }

  // 페이저 UI
  if (pager) {
    const prevBtn = pager.querySelector('button[data-page="prev"]');
    const nextBtn = pager.querySelector('button[data-page="next"]');
    const label = pager.querySelector("span[data-page-label]");

    if (prevBtn) {
      prevBtn.disabled = page <= 1;
      prevBtn.onclick = () => {
        if (entityState.page > 1) {
          entityState.page--;
          renderEntityTable(entityKey);
        }
      };
    }
    if (nextBtn) {
      nextBtn.disabled = page >= maxPage;
      nextBtn.onclick = () => {
        if (entityState.page < maxPage) {
          entityState.page++;
          renderEntityTable(entityKey);
        }
      };
    }
    if (label) {
      label.textContent = `${page} / ${maxPage}`;
    }
  }
}

/* ==============================
   9) 검색 필터
============================== */

function initSearch() {
  const bindSearch = (entityKey, inputId) => {
    const input = $(inputId);
    const cfg = ENTITY_CONFIG[entityKey];
    const state = STATE.entities[entityKey];
    if (!input || !cfg || !state) return;

    const runFilter = () => {
      const term = input.value.trim().toLowerCase();
      if (!term) {
        state.filtered = [...state.rows];
        state.page = 1;
        renderEntityTable(entityKey);
        return;
      }

      const keys = cfg.searchKeys || cfg.columns;

      state.filtered = state.rows.filter((row) =>
        keys.some((k) =>
          String(row[k] || "")
            .toLowerCase()
            .includes(term)
        )
      );
      state.page = 1;
      renderEntityTable(entityKey);
    };

    input.addEventListener("input", debounce(runFilter, 220));
  };

  bindSearch("products", "searchProducts");
  bindSearch("orders", "searchOrders");
  bindSearch("members", "searchMembers");
  bindSearch("stock", "searchStock");
  bindSearch("logs", "searchLogs");
}

/* ==============================
   10) 행 수정/삭제 모달
============================== */

function openEditRow(entityKey, row) {
  const cfg = ENTITY_CONFIG[entityKey];
  if (!cfg) return;
  if (!window.KORUAL_MODAL || !window.KORUAL_MODAL.openEdit) return;

  // 컬럼 순서대로 데이터 재구성(모달 필드 순서용)
  const ordered = {};
  cfg.columns.forEach((k) => {
    ordered[k] = row[k] != null ? row[k] : "";
  });

  STATE.currentEdit = {
    entity: entityKey,
    sheet: cfg.sheet,
    rowIndex: row.__rowIndex,
    originalRow: { ...row },
  };

  window.KORUAL_MODAL.openEdit({
    entity: entityKey,
    sheet: cfg.sheet,
    rowIndex: row.__rowIndex,
    data: ordered,
  });
}

function openDeleteRow(entityKey, row) {
  const cfg = ENTITY_CONFIG[entityKey];
  if (!cfg) return;
  if (!window.KORUAL_MODAL || !window.KORUAL_MODAL.openDelete) return;

  const titleKey = cfg.titleKey;
  const titleVal = row[titleKey] || "";

  STATE.currentEdit = {
    entity: entityKey,
    sheet: cfg.sheet,
    rowIndex: row.__rowIndex,
    originalRow: { ...row },
  };

  window.KORUAL_MODAL.openDelete({
    entity: entityKey,
    sheet: cfg.sheet,
    rowIndex: row.__rowIndex,
    title: titleVal,
  });
}

function initModalActions() {
  const btnSave = $("rowEditSave");
  if (btnSave) {
    btnSave.addEventListener("click", async () => {
      if (!STATE.currentEdit) {
        showToast("수정할 행 정보가 없습니다.", "error");
        return;
      }

      const { entity, sheet, rowIndex, originalRow } = STATE.currentEdit;
      const cfg = ENTITY_CONFIG[entity];
      if (!cfg) return;

      const wrap = $("rowEditFields");
      if (!wrap) return;
      const inputs = wrap.querySelectorAll("input[data-fieldKey]");

      const changes = {};
      inputs.forEach((inp) => {
        const key = inp.dataset.fieldKey;
        const newVal = inp.value;
        const oldVal =
          originalRow[key] != null ? String(originalRow[key]) : "";
        if (String(newVal) !== oldVal) {
          changes[key] = newVal;
        }
      });

      if (!Object.keys(changes).length) {
        showToast("변경된 내용이 없습니다.", "info");
        window.KORUAL_MODAL.closeAll();
        return;
      }

      try {
        setSpinner(true);
        // 컬럼마다 updateCell 호출
        for (const key of Object.keys(changes)) {
          const colIndex = cfg.columns.indexOf(key) + 1;
          if (colIndex <= 0) continue;
          await postJson("updateCell", {
            sheet,
            row: rowIndex,
            col: colIndex,
            value: changes[key],
          });
        }

        // 로컬 상태 업데이트 & 재렌더
        const state = STATE.entities[entity];
        if (state) {
          const idx = state.rows.findIndex(
            (r) => r.__rowIndex === rowIndex
          );
          if (idx >= 0) {
            const updated = { ...state.rows[idx], ...changes };
            state.rows[idx] = updated;
          }
          // 다시 필터 적용
          const termInputId =
            entity === "products"
              ? "searchProducts"
              : entity === "orders"
              ? "searchOrders"
              : entity === "members"
              ? "searchMembers"
              : entity === "stock"
              ? "searchStock"
              : "searchLogs";
          const searchEl = $(termInputId);
          if (searchEl && searchEl.value.trim()) {
            // 검색어가 있으면 그대로 필터 다시 실행
            const keys = cfg.searchKeys || cfg.columns;
            const term = searchEl.value.trim().toLowerCase();
            state.filtered = state.rows.filter((row) =>
              keys.some((k) =>
                String(row[k] || "")
                  .toLowerCase()
                  .includes(term)
              )
            );
          } else {
            state.filtered = [...state.rows];
          }
          renderEntityTable(entity);
        }

        showToast("저장되었습니다.", "success");
        window.KORUAL_MODAL.closeAll();
      } catch (err) {
        showToast(err.message || "저장 중 오류가 발생했습니다.", "error");
      } finally {
        setSpinner(false);
      }
    });
  }

  const btnDelete = $("rowDeleteConfirm");
  if (btnDelete) {
    btnDelete.addEventListener("click", async () => {
      if (!STATE.currentEdit) {
        showToast("삭제할 행 정보가 없습니다.", "error");
        return;
      }

      const { entity, sheet, rowIndex } = STATE.currentEdit;
      try {
        setSpinner(true);
        await postJson("deleteRow", {
          sheet,
          row: rowIndex,
        });

        // 삭제 후 목록 다시 로딩 (rowIndex가 전체에 영향을 주기 때문)
        await loadEntity(entity);
        showToast("삭제되었습니다.", "success");
        window.KORUAL_MODAL.closeAll();
      } catch (err) {
        showToast(err.message || "삭제 중 오류가 발생했습니다.", "error");
      } finally {
        setSpinner(false);
      }
    });
  }
}

/* ==============================
   11) 전체 초기화
============================== */

async function bootstrap() {
  // Footer 연도 표기용
  const yearText = document.querySelector(".footer-inner span");
  if (yearText) {
    const nowY = new Date().getFullYear();
    yearText.textContent = `© ${nowY} KORUAL Control Center · All Systems Automated`;
  }

  initTheme();
  initUserHeader();
  initNav();
  initMobileSidebar();
  initSearch();
  initModalActions();

  // API 상태 체크 1회
  pingApiOnce();

  // 전체 데이터 로딩
  setSpinner(true);
  try {
    await Promise.all([
      loadDashboard(),
      loadEntity("products"),
      loadEntity("orders"),
      loadEntity("members"),
      loadEntity("stock"),
      loadEntity("logs"),
    ]);
    STATE.lastSync = new Date();
    if ($("last-sync")) {
      $("last-sync").textContent =
        "마지막 동기화: " + formatDateLabel(STATE.lastSync);
    }
  } finally {
    setSpinner(false);
  }

  // 전체 새로고침 버튼
  const btnRefreshAll = $("btnRefreshAll");
  if (btnRefreshAll) {
    btnRefreshAll.addEventListener("click", async () => {
      setSpinner(true);
      try {
        await Promise.all([
          loadDashboard(),
          loadEntity("products"),
          loadEntity("orders"),
          loadEntity("members"),
          loadEntity("stock"),
          loadEntity("logs"),
        ]);
        STATE.lastSync = new Date();
        if ($("last-sync")) {
          $("last-sync").textContent =
            "마지막 동기화: " + formatDateLabel(STATE.lastSync);
        }
        showToast("모든 데이터가 새로고침되었습니다.", "success");
      } catch (err) {
        showToast(err.message || "새로고침 중 오류가 발생했습니다.", "error");
      } finally {
        setSpinner(false);
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", bootstrap);
