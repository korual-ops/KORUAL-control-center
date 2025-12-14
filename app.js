// app.js – dashboard.html 전용 (세션 체크 + API 클라이언트 + 초기화)
(function () {
  "use strict";

  const META = window.KORUAL_META_APP || {};
  const API_BASE = META.api?.baseUrl || "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec";
  const API_SECRET = META.api?.secret || "KORUAL-ONLY";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // 0) 세션 체크
  function requireAuth() {
    try {
      const raw = localStorage.getItem("korual_user");
      if (!raw) throw new Error("no-session");
      const user = JSON.parse(raw);
      if (!user || !user.username) throw new Error("bad-session");
      return user;
    } catch (_) {
      location.replace("index.html");
      return null;
    }
  }

  const user = requireAuth();
  if (!user) return;

  // 1) 공통 토스트
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

    wrap.textContent = message;
    root.appendChild(wrap);

    setTimeout(() => {
      wrap.style.opacity = "0";
      wrap.style.transform = "translateY(4px)";
      setTimeout(() => wrap.remove(), 180);
    }, timeout);
  }

  // 2) 스피너
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
    const url = new URL(API_BASE);
    url.searchParams.set("target", target);
    if (API_SECRET) url.searchParams.set("secret", API_SECRET);

    Object.keys(params).forEach((k) => {
      const v = params[k];
      if (v === undefined || v === null || v === "") return;
      url.searchParams.set(k, String(v));
    });

    const started = performance.now();
    const res = await fetch(url.toString(), { method: "GET", headers: { "Accept": "application/json" } });
    state.pingMs = Math.round(performance.now() - started);

    if (!res.ok) throw new Error("HTTP " + res.status);

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch (_) { throw new Error("API JSON 파싱 실패"); }
    if (json.ok === false) throw new Error(json.message || "API 오류");
    return json;
  }

  async function apiPost(body) {
    const started = performance.now();
    const res = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ secret: API_SECRET || undefined, ...body }),
    });
    state.pingMs = Math.round(performance.now() - started);

    if (!res.ok) throw new Error("HTTP " + res.status);

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch (_) { throw new Error("API JSON 파싱 실패"); }
    if (json.ok === false) throw new Error(json.message || "API 오류");
    return json;
  }

  // 4) 핑
  async function pingApi() {
    const res = await apiGet("ping");
    return res;
  }

  // 5) 로그아웃
  function initLogout() {
    const btnLogout = $("#btnLogout");
    if (!btnLogout) return;
    btnLogout.addEventListener("click", () => {
      localStorage.removeItem("korual_user");
      location.replace("index.html");
    });
  }

  // 6) 대시보드 로드 (백엔드: data.totals 구조)
  function formatCurrency(v) {
    const n = Number(v);
    if (isNaN(n)) return "-";
    return n.toLocaleString("ko-KR") + "원";
  }
  function setText(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  }

  async function loadDashboard() {
    const res = await apiGet("dashboard");
    const d = res.data || {};
    const totals = d.totals || {};

    setText("cardTotalProducts", totals.products ?? "-");
    setText("cardTotalOrders", totals.orders ?? "-");
    setText("cardTotalMembers", totals.members ?? "-");
    setText("cardTotalRevenue", totals.revenue != null ? formatCurrency(totals.revenue) : "-");

    state.lastSync = new Date();
  }

  // 7) 자동화 수동 실행 버튼 (선택)
  function initAutomationButton() {
    const btn = $("#btnRunAutomation");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      showSpinner();
      try {
        await apiPost({ target: "runAutomation" });
        showToast("자동화 실행 완료", "success");
        await loadDashboard();
      } catch (e) {
        console.error(e);
        showToast("자동화 실행 실패", "error");
      } finally {
        hideSpinner();
      }
    });
  }

  async function init() {
    showSpinner();
    try {
      initLogout();
      initAutomationButton();
      await pingApi();
      await loadDashboard();
      showToast("대시보드 로드 완료", "success", 1200);
    } catch (e) {
      console.error(e);
      showToast("초기화 실패", "error");
    } finally {
      hideSpinner();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
