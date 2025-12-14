// app.js – dashboard.html 전용 (A+B 중 B)
// - 로그인 체크
// - API 클라이언트 (GET/POST)
// - ping/dashboard/테이블 로딩 (기존 구조 유지 가능)

(function () {
  "use strict";

  const META = window.KORUAL_META_APP || {};
  const API_BASE   = META.api?.baseUrl || "";
  const API_SECRET = META.api?.secret || "";

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // 0) 로그인 상태 체크 (dashboard에서만)
  function requireAuth() {
    try {
      const raw = localStorage.getItem("korual_user");
      if (!raw) {
        location.replace("index.html");
        return null;
      }
      const user = JSON.parse(raw);
      if (!user || !user.username) {
        location.replace("index.html");
        return null;
      }
      return user;
    } catch (e) {
      location.replace("index.html");
      return null;
    }
  }

  const user = requireAuth();
  if (!user) return;

  // 1) 토스트 (있으면 사용)
  function showToast(message, type = "info", timeout = 2500) {
    const root = $("#toastRoot");
    if (!root) return;

    const wrap = document.createElement("div");
    wrap.className =
      "pointer-events-auto inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs shadow-lg mb-2 " +
      (type === "error"
        ? "border-rose-500/70 bg-rose-950/80 text-rose-100"
        : type === "success"
        ? "border-emerald-400/70 bg-emerald-900/80 text-emerald-100"
        : "border-slate-700/80 bg-slate-900/90 text-slate-100");

    const span = document.createElement("span");
    span.textContent = message;
    wrap.appendChild(span);

    root.appendChild(wrap);
    setTimeout(() => {
      wrap.style.opacity = "0";
      wrap.style.transform = "translateY(4px)";
      setTimeout(() => wrap.remove(), 180);
    }, timeout);
  }

  // 2) 글로벌 스피너 (있으면 사용)
  let spinnerCount = 0;
  function showSpinner() {
    const el = $("#globalSpinner");
    if (!el) return;
    spinnerCount += 1;
    el.classList.remove("hidden");
  }
  function hideSpinner() {
    const el = $("#globalSpinner");
    if (!el) return;
    spinnerCount = Math.max(0, spinnerCount - 1);
    if (spinnerCount === 0) el.classList.add("hidden");
  }

  // 3) API 클라이언트
  const state = { pingMs: null, lastSync: null };

  async function apiGet(target, params = {}) {
    if (!API_BASE) throw new Error("API URL이 설정되지 않았습니다.");

    const url = new URL(API_BASE);
    url.searchParams.set("target", target);

    // GET에서도 secret 요구할 수 있으니 옵션으로 포함 (서버 ENFORCE_SECRET true 시 필요)
    if (API_SECRET) url.searchParams.set("secret", API_SECRET);

    Object.keys(params).forEach((k) => {
      const v = params[k];
      if (v === undefined || v === null || v === "") return;
      url.searchParams.set(k, String(v));
    });

    const started = performance.now();
    const res = await fetch(url.toString(), { method: "GET", headers: { Accept: "application/json" } });
    state.pingMs = Math.round(performance.now() - started);

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch (_) { throw new Error("API 응답이 JSON 형식이 아닙니다."); }

    if (!res.ok || json.ok === false) throw new Error(json.message || ("HTTP " + res.status));
    return json;
  }

  async function apiPost(body) {
    if (!API_BASE) throw new Error("API URL이 설정되지 않았습니다.");

    const started = performance.now();
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        secret: API_SECRET || undefined,
        ...body,
      }),
    });
    state.pingMs = Math.round(performance.now() - started);

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch (_) { throw new Error("API 응답이 JSON 형식이 아닙니다."); }

    if (!res.ok || json.ok === false) throw new Error(json.message || ("HTTP " + res.status));
    return json;
  }

  // 4) API 상태 표시 (있으면)
  function updateApiStatus(ok, message) {
    const dot = $("#apiStatusDot");
    const text = $("#apiStatusText");
    const pingEl = $("#apiPing");

    if (dot && text) {
      if (ok) {
        dot.className = "inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.35)]";
        text.textContent = message || "정상 연결";
      } else {
        dot.className = "inline-block w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_0_4px_rgba(248,113,113,0.35)]";
        text.textContent = message || "연결 실패";
      }
    }
    if (pingEl && state.pingMs != null) pingEl.textContent = state.pingMs + " ms";
  }

  async function pingApi() {
    try {
      const res = await apiGet("ping");
      updateApiStatus(true, "LIVE " + (res.version || ""));
      return res;
    } catch (err) {
      console.error(err);
      updateApiStatus(false, "Ping 실패");
      showToast("API 연결에 실패했습니다.", "error");
      throw err;
    }
  }

  // 5) 로그아웃 버튼 (있으면)
  function initTopbar() {
    const btnLogout = $("#btnLogout");
    const welcome = $("#welcomeUser");
    if (welcome) welcome.textContent = user.username;

    if (btnLogout) {
      btnLogout.addEventListener("click", () => {
        localStorage.removeItem("korual_user");
        location.replace("index.html");
      });
    }
  }

  // 6) 대시보드 로딩(백엔드가 data.totals/data.today/data.recentOrders 반환한다고 가정)
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }
  function formatCurrency(v) {
    if (v == null || isNaN(Number(v))) return "-";
    return Number(v).toLocaleString("ko-KR") + "원";
  }

  async function loadDashboard() {
    const todayLabelEl = $("#todayDateLabel");
    if (todayLabelEl) {
      const d = new Date();
      const dayNames = ["일","월","화","수","목","금","토"];
      todayLabelEl.textContent =
        `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} (${dayNames[d.getDay()]})`;
    }

    try {
      const res = await apiGet("dashboard");
      const d = res.data || {};

      const totals = d.totals || {};
      setText("cardTotalProducts", totals.products ?? "-");
      setText("cardTotalOrders", totals.orders ?? "-");
      setText("cardTotalMembers", totals.members ?? "-");
      setText("cardTotalRevenue", totals.revenue != null ? formatCurrency(totals.revenue) : "-");

      const today = d.today || {};
      setText("todayOrders", today.orders ?? "-");
      setText("todayRevenue", today.revenue != null ? formatCurrency(today.revenue) : "-");
      setText("todayPending", today.pending ?? "-");

      renderRecentOrders(d.recentOrders || []);
      state.lastSync = new Date();
      updateLastSyncLabel();
    } catch (err) {
      console.error(err);
      showToast("대시보드 데이터를 불러오지 못했습니다.", "error");
    }
  }

  function renderRecentOrders(rows) {
    const tbody = $("#recentOrdersBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!rows.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 7;
      td.className = "px-3 py-6 text-center text-slate-500";
      td.textContent = "최근 주문 데이터가 없습니다.";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    rows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.className = "border-b border-slate-800/70 last:border-b-0 hover:bg-slate-900/70 transition-colors";

      const cells = [
        row.orderDate || row.order_date || "",
        row.orderNo || row.order_no || "",
        row.productName || row.item_name || "",
        row.qty != null ? String(row.qty) : "",
        row.amount != null ? formatCurrency(row.amount) : "",
        row.channel || "",
        row.status || "",
      ];

      cells.forEach((val, idx) => {
        const td = document.createElement("td");
        td.className = "px-2 py-1.5" + (idx === 3 || idx === 4 ? " text-right" : " text-left");
        td.textContent = val;
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }

  function updateLastSyncLabel() {
    const el = $("#last-sync");
    if (!el) return;
    if (!state.lastSync) {
      el.textContent = "마지막 동기화 대기 중…";
      return;
    }
    const d = state.lastSync;
    el.textContent = `마지막 동기화 ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  }

  // 7) 초기 실행
  async function init() {
    showSpinner();
    try {
      initTopbar();
      await pingApi();
      await loadDashboard();
      // 테이블 로더(orders/products 등)는 기존 코드가 있으면 그대로 붙여서 사용하면 됨
    } catch (_) {
      // pingApi/loadDashboard에서 처리
    } finally {
      hideSpinner();
    }
  }

  document.addEventListener("DOMContentLoaded", init);

  // 외부에서 쓰고 싶으면 export처럼 붙여둘 수도 있음
  window.KORUAL_API = { apiGet, apiPost };
})();
