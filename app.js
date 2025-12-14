/* app.js – dashboard.html 전용 (KORUAL Control Center)
 * - localStorage korual_user 체크
 * - API: GET ping/dashboard/{products|orders|members|stock|logs}
 * - CRUD: POST updateRow / deleteRow
 */

(function () {
  "use strict";

  const META = window.KORUAL_META_APP || {};
  const API_BASE = META.api?.baseUrl || "";
  const API_SECRET = META.api?.secret || "";

  // ===== utils =====
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function safeJsonParse(raw, fallback) {
    try { return JSON.parse(raw); } catch (_) { return fallback; }
  }

  function fmtNumber(n) {
    const v = Number(n || 0);
    if (Number.isNaN(v)) return "0";
    return v.toLocaleString("ko-KR");
  }

  function fmtDate(v) {
    if (!v) return "";
    try {
      // Apps Script는 Date 객체가 문자열로 들어올 수 있음
      const d = (v instanceof Date) ? v : new Date(v);
      if (!Number.isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      }
    } catch (_) {}
    return String(v);
  }

  function showToast(message, type) {
    // dashboard.html에 toastRoot가 있으면 사용, 없으면 alert fallback
    const root = document.getElementById("toastRoot");
    if (!root) {
      if (message) alert(message);
      return;
    }

    const el = document.createElement("div");
    el.className =
      "pointer-events-auto max-w-md w-full rounded-2xl border border-slate-700/70 bg-slate-950/90 text-slate-100 shadow-[0_18px_50px_rgba(15,23,42,0.95)] px-4 py-3 text-sm";
    if (type === "ok") el.classList.add("ring-1", "ring-emerald-400/20");
    if (type === "err") el.classList.add("ring-1", "ring-rose-400/20");

    el.textContent = message || "";
    root.appendChild(el);

    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(8px) scale(.98)";
      el.style.transition = "all .18s ease-in";
      setTimeout(() => el.remove(), 200);
    }, 2200);
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function setHtml(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function setLoading(flag) {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.toggle("hidden", !flag);
  }

  // ===== auth gate =====
  const user = safeJsonParse(localStorage.getItem("korual_user") || "", null);
  if (!user || !user.username) {
    // 로그인 없으면 index로
    location.replace("index.html");
    return;
  }

  // ===== DOM hooks (있으면 자동 연결) =====
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.removeItem("korual_user");
      location.replace("index.html");
    });
  }

  // user 표시
  setText("userName", user.displayName || user.username || "KORUAL");
  setText("userRole", user.role || "USER");

  // ===== API =====
  async function apiGet(target, params) {
    if (!API_BASE) throw new Error("API_BASE_URL missing");
    const url = new URL(API_BASE);
    url.searchParams.set("target", target);
    if (params) {
      Object.keys(params).forEach((k) => {
        if (params[k] != null && params[k] !== "") url.searchParams.set(k, String(params[k]));
      });
    }

    const res = await fetch(url.toString(), { method: "GET" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.message || "API GET failed");
    }
    return data;
  }

  async function apiPost(payload) {
    if (!API_BASE) throw new Error("API_BASE_URL missing");
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        secret: API_SECRET, // ENFORCE_SECRET=true 일 때 필수
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      throw new Error(data.message || "API POST failed");
    }
    return data;
  }

  // ===== Health / Ping =====
  async function checkPing() {
    const dot = document.getElementById("apiStatusDot");
    const txt = document.getElementById("apiStatusText");

    try {
      if (txt) txt.textContent = "API 체크 중…";
      if (dot) {
        dot.className =
          "h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_0_5px_rgba(251,191,36,0.35)]";
      }

      const data = await apiGet("ping");
      if (txt) txt.textContent = data.message || "API OK";
      if (dot) {
        dot.className =
          "h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_5px_rgba(16,185,129,0.28)]";
      }
    } catch (e) {
      if (txt) txt.textContent = "API 연결 실패";
      if (dot) {
        dot.className =
          "h-2.5 w-2.5 rounded-full bg-rose-400 shadow-[0_0_0_5px_rgba(244,63,94,0.20)]";
      }
    }
  }

  // ===== Dashboard =====
  async function loadDashboard() {
    const data = await apiGet("dashboard");
    const d = data.data || {};

    // totals
    setText("kpiProducts", fmtNumber(d?.totals?.products));
    setText("kpiOrders", fmtNumber(d?.totals?.orders));
    setText("kpiMembers", fmtNumber(d?.totals?.members));
    setText("kpiRevenue", fmtNumber(d?.totals?.revenue));

    // today
    setText("todayOrders", fmtNumber(d?.today?.orders));
    setText("todayRevenue", fmtNumber(d?.today?.revenue));
    setText("todayPending", fmtNumber(d?.today?.pending));

    // recent orders
    renderRecentOrders(d?.recentOrders || []);
  }

  function renderRecentOrders(rows) {
    const root = document.getElementById("recentOrders");
    if (!root) return;

    if (!rows.length) {
      root.innerHTML =
        '<div class="text-xs text-slate-400 py-4">최근 주문 데이터가 없습니다.</div>';
      return;
    }

    const html = rows
      .slice()
      .reverse()
      .map((r) => {
        return `
        <div class="flex items-center justify-between gap-3 py-2 border-b border-slate-800/60">
          <div class="min-w-0">
            <p class="text-sm text-slate-100 truncate">${escapeHtml(r.productName || "")}</p>
            <p class="text-[11px] text-slate-400">
              ${escapeHtml(r.orderNo || "-")} · ${escapeHtml(r.channel || "-")} · ${escapeHtml(r.status || "-")}
            </p>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold text-slate-100">${fmtNumber(r.amount)}</p>
            <p class="text-[11px] text-slate-400">${fmtDate(r.orderDate)}</p>
          </div>
        </div>
      `;
      })
      .join("");

    root.innerHTML = html;
  }

  // ===== Entity Tables (products/orders/members/stock/logs) =====
  const state = {
    entity: "products",
    q: "",
    page: 1,
    size: 50,
    lastRows: [],
  };

  function getEntitySheetKey(entity) {
    // code.gs는 target은 products/orders/...로 받고,
    // updateRow/deleteRow는 key에 "시트명"을 받게 되어 있음.
    // 여기서는 key를 시트명과 동일하게 매핑.
    if (entity === "products") return "PRODUCTS";
    if (entity === "orders") return "ORDERS";
    if (entity === "members") return "MEMBERS";
    if (entity === "stock") return "STOCK";
    if (entity === "logs") return "LOGS";
    return "PRODUCTS";
  }

  async function loadEntityTable(entity) {
    state.entity = entity || state.entity;

    const data = await apiGet(state.entity, {
      q: state.q,
      page: state.page,
      size: state.size,
    });

    const payload = data.data || {};
    const rows = payload.rows || [];
    state.lastRows = rows;

    renderEntityTable(rows);
    renderPager(payload);
    setText("entityTitle", state.entity.toUpperCase());
  }

  function renderPager(payload) {
    setText("pagerTotal", fmtNumber(payload.total || 0));
    setText("pagerPage", `${payload.page || 1} / ${payload.pageCount || 1}`);

    const btnPrev = document.getElementById("btnPrev");
    const btnNext = document.getElementById("btnNext");
    if (btnPrev) btnPrev.disabled = (payload.page || 1) <= 1;
    if (btnNext) btnNext.disabled = (payload.page || 1) >= (payload.pageCount || 1);
  }

  function renderEntityTable(rows) {
    const tableHead = document.getElementById("tableHead");
    const tableBody = document.getElementById("tableBody");
    if (!tableHead || !tableBody) return;

    if (!rows || !rows.length) {
      tableHead.innerHTML = "";
      tableBody.innerHTML =
        '<tr><td class="py-6 text-center text-xs text-slate-400" colspan="99">데이터가 없습니다.</td></tr>';
      return;
    }

    // 헤더는 첫 행의 keys에서 생성 (_row는 숨김)
    const keys = Object.keys(rows[0]).filter((k) => k !== "_row");
    tableHead.innerHTML =
      "<tr>" +
      keys
        .map(
          (k) =>
            `<th class="text-left text-[11px] font-semibold text-slate-300 px-3 py-2 border-b border-slate-800/70">${escapeHtml(
              k
            )}</th>`
        )
        .join("") +
      `<th class="text-right text-[11px] font-semibold text-slate-300 px-3 py-2 border-b border-slate-800/70">ACTIONS</th>` +
      "</tr>";

    tableBody.innerHTML = rows
      .map((r, idx) => {
        const rowNo = r._row; // 실제 시트 행
        return (
          "<tr class='hover:bg-white/5'>" +
          keys
            .map((k) => {
              const v = r[k];
              const cell = (v instanceof Date) ? fmtDate(v) : String(v ?? "");
              return `<td class="px-3 py-2 text-[12px] text-slate-200 border-b border-slate-800/50 max-w-[380px] truncate">${escapeHtml(
                cell
              )}</td>`;
            })
            .join("") +
          `<td class="px-3 py-2 text-right text-[12px] border-b border-slate-800/50">
             <button class="btn-alt text-[11px] px-3 py-2 mr-2" data-action="edit" data-idx="${idx}" data-row="${rowNo}">수정</button>
             <button class="btn-alt text-[11px] px-3 py-2" data-action="delete" data-idx="${idx}" data-row="${rowNo}">삭제</button>
           </td>` +
          "</tr>"
        );
      })
      .join("");

    // action binding
    tableBody.querySelectorAll("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const action = btn.getAttribute("data-action");
        const idx = Number(btn.getAttribute("data-idx") || 0);
        const rowNo = Number(btn.getAttribute("data-row") || 0);
        const rowObj = rows[idx] || {};

        if (action === "edit") openEditModal(rowNo, rowObj);
        if (action === "delete") await deleteRow(rowNo);
      });
    });
  }

  // ===== Modal (Edit) =====
  function openEditModal(rowNo, rowObj) {
    const modal = document.getElementById("editModal");
    const form = document.getElementById("editForm");
    const title = document.getElementById("editTitle");
    const btnSave = document.getElementById("btnSaveRow");
    const btnClose = document.getElementById("btnCloseEdit");

    if (!modal || !form || !btnSave) {
      // 모달이 없으면 간단 편집: prompt fallback
      const keys = Object.keys(rowObj).filter((k) => k !== "_row");
      const patch = {};
      keys.forEach((k) => {
        const next = prompt(`${k} 값 변경(취소=유지)`, String(rowObj[k] ?? ""));
        if (next != null) patch[k] = next;
      });
      updateRow(rowNo, patch);
      return;
    }

    if (title) title.textContent = `${getEntitySheetKey(state.entity)} · row ${rowNo}`;

    // 폼 렌더
    const keys = Object.keys(rowObj).filter((k) => k !== "_row");
    form.innerHTML = keys
      .map((k) => {
        const v = rowObj[k];
        const val = (v instanceof Date) ? fmtDate(v) : String(v ?? "");
        return `
          <div class="grid gap-1">
            <label class="text-[11px] text-slate-400">${escapeHtml(k)}</label>
            <input class="input bg-slate-950/85 border-slate-700/70" data-key="${escapeHtml(
              k
            )}" value="${escapeAttr(val)}" />
          </div>
        `;
      })
      .join("");

    modal.classList.remove("hidden");

    const onClose = () => modal.classList.add("hidden");
    if (btnClose) btnClose.onclick = onClose;

    btnSave.onclick = async () => {
      const patch = {};
      form.querySelectorAll("input[data-key]").forEach((inp) => {
        const key = inp.getAttribute("data-key");
        patch[key] = inp.value;
      });
      await updateRow(rowNo, patch);
      modal.classList.add("hidden");
    };
  }

  async function updateRow(rowNo, patch) {
    setLoading(true);
    try {
      await apiPost({
        target: "updateRow",
        key: getEntitySheetKey(state.entity),
        row: rowNo,
        rowObject: patch,
      });
      showToast("저장 완료", "ok");
      await loadEntityTable(state.entity);
    } catch (e) {
      console.error(e);
      showToast(`저장 실패: ${e.message || e}`, "err");
    } finally {
      setLoading(false);
    }
  }

  async function deleteRow(rowNo) {
    const ok = confirm(`정말 삭제할까요? (row ${rowNo})`);
    if (!ok) return;

    setLoading(true);
    try {
      await apiPost({
        target: "deleteRow",
        key: getEntitySheetKey(state.entity),
        row: rowNo,
      });
      showToast("삭제 완료", "ok");
      await loadEntityTable(state.entity);
    } catch (e) {
      console.error(e);
      showToast(`삭제 실패: ${e.message || e}`, "err");
    } finally {
      setLoading(false);
    }
  }

  // ===== UI Controls (있으면 자동 연결) =====
  const searchInput = document.getElementById("searchInput");
  const btnSearch = document.getElementById("btnSearch");
  if (btnSearch && searchInput) {
    btnSearch.addEventListener("click", () => {
      state.q = (searchInput.value || "").trim();
      state.page = 1;
      loadEntityTable(state.entity);
    });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        state.q = (searchInput.value || "").trim();
        state.page = 1;
        loadEntityTable(state.entity);
      }
    });
  }

  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");
  if (btnPrev) {
    btnPrev.addEventListener("click", () => {
      state.page = Math.max(1, state.page - 1);
      loadEntityTable(state.entity);
    });
  }
  if (btnNext) {
    btnNext.addEventListener("click", () => {
      state.page = state.page + 1;
      loadEntityTable(state.entity);
    });
  }

  // nav buttons (있으면 자동 연결)
  const navMap = [
    ["btnNavDashboard", null],
    ["btnNavProducts", "products"],
    ["btnNavOrders", "orders"],
    ["btnNavMembers", "members"],
    ["btnNavStock", "stock"],
    ["btnNavLogs", "logs"],
  ];
  navMap.forEach(([id, entity]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", async () => {
      try {
        setLoading(true);
        if (!entity) {
          await loadDashboard();
          showToast("대시보드 로드 완료", "ok");
        } else {
          state.page = 1;
          await loadEntityTable(entity);
          showToast(`${entity.toUpperCase()} 로드 완료`, "ok");
        }
      } catch (e) {
        console.error(e);
        showToast(`로드 실패: ${e.message || e}`, "err");
      } finally {
        setLoading(false);
      }
    });
  });

  // ===== HTML escape =====
  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function escapeAttr(str) {
    return String(str ?? "").replace(/"/g, "&quot;");
  }

  // ===== boot =====
  async function boot() {
    setText("year", String(new Date().getFullYear()));
    await checkPing();

    // 기본 진입: 대시보드
    setLoading(true);
    try {
      await loadDashboard();
      // 필요하면 기본으로 PRODUCTS 테이블도 로드
      // state.page = 1; await loadEntityTable("products");
    } catch (e) {
      console.error(e);
      showToast(`초기 로드 실패: ${e.message || e}`, "err");
    } finally {
      setLoading(false);
    }
  }

  boot();
})();
