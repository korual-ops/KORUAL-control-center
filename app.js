/* app.js
 * KORUAL Control Center – Core App Runtime
 *
 * 전제(이전 UI 기준)
 * - index.html 로그인 성공 시:
 *   localStorage("korual_token") 저장
 *   localStorage("korual_user")  저장(JSON)
 *   dashboard.html로 이동
 *
 * - dashboard.html / 각 페이지에서 app.js를 로드하여
 *   1) 세션 가드(토큰/유저 체크)
 *   2) whoami로 토큰 유효성 검증(옵션)
 *   3) 공통 API 호출 유틸(POST/GET)
 *   4) 공통 토스트/로딩/로그아웃 핸들러
 *
 * 제공하신 GAS WebApp exec URL 고정
 */
(() => {
  "use strict";

  // -----------------------------
  // Config / Storage Keys
  // -----------------------------
  const DEFAULT_API_BASE =
    "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec";

  const API_BASE =
    (window.KORUAL_META_APP &&
      window.KORUAL_META_APP.api &&
      window.KORUAL_META_APP.api.baseUrl) ||
    DEFAULT_API_BASE;

  const TOKEN_KEY = "korual_token";
  const USER_KEY = "korual_user";

  // -----------------------------
  // DOM Helpers
  // -----------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // -----------------------------
  // Toast (이전 UI와 호환: #toastRoot 사용)
  // -----------------------------
  function ensureToastRoot() {
    let root = document.getElementById("toastRoot");
    if (!root) {
      root = document.createElement("div");
      root.id = "toastRoot";
      root.className =
        "fixed inset-x-0 bottom-6 z-40 flex justify-center pointer-events-none";
      document.body.appendChild(root);
    }
    return root;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) => {
      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      };
      return map[m] || m;
    });
  }

  function toast(text, kind = "info", ms = 2600) {
    const root = ensureToastRoot();

    const wrap = document.createElement("div");
    wrap.className =
      "pointer-events-auto max-w-[560px] w-[92%] px-4 py-3 rounded-2xl " +
      "shadow-[0_22px_70px_rgba(0,0,0,.55)] " +
      "border border-slate-600/30 bg-slate-950/70 backdrop-blur-xl";

    const dotClass =
      kind === "ok"
        ? "bg-emerald-400"
        : kind === "warn"
        ? "bg-amber-400"
        : kind === "err"
        ? "bg-rose-400"
        : "bg-sky-400";

    wrap.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="mt-0.5 w-2.5 h-2.5 rounded-full ${dotClass}"></div>
        <div class="text-sm text-slate-100 whitespace-pre-line">${escapeHtml(
          text
        )}</div>
      </div>
    `;

    root.appendChild(wrap);

    setTimeout(() => {
      wrap.style.opacity = "0";
      wrap.style.transform = "translateY(6px)";
      wrap.style.transition = "all .35s ease";
    }, Math.max(400, ms - 350));

    setTimeout(() => wrap.remove(), ms);
  }

  // -----------------------------
  // Storage / Session
  // -----------------------------
  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user || {}));
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token || "");
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function logout(opts = {}) {
    const {
      redirect = "index.html",
      silent = false,
      reason = "로그아웃되었습니다.",
    } = opts;

    clearSession();
    if (!silent) toast(reason, "warn");
    if (redirect) location.replace(redirect);
  }

  // -----------------------------
  // API helpers (GAS WebApp)
  // - GET:  /exec?action=ping or whoami&token=...
  // - POST: /exec?action=login, log ...
  // -----------------------------
  async function apiGet(action, params = {}) {
    const url = new URL(API_BASE);
    url.searchParams.set("action", action);

    Object.keys(params || {}).forEach((k) => {
      if (params[k] !== undefined && params[k] !== null) {
        url.searchParams.set(k, String(params[k]));
      }
    });

    const res = await fetch(url.toString(), { method: "GET" });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  async function apiPost(action, body = {}, token = "") {
    const url = new URL(API_BASE);
    url.searchParams.set("action", action);

    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = "Bearer " + token;

    const res = await fetch(url.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify(body || {}),
    });

    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  async function whoami(token = getToken()) {
    if (!token) return { ok: false, error: "NO_TOKEN" };
    const { data } = await apiGet("whoami", { token });
    return data || { ok: false, error: "NO_RESPONSE" };
  }

  async function ping() {
    const { data } = await apiGet("ping");
    return data || { ok: false, error: "NO_RESPONSE" };
  }

  async function logEvent(type, payload) {
    const token = getToken();
    if (!token) return { ok: false, error: "NO_TOKEN" };
    const { data } = await apiPost(
      "log",
      { type: String(type || "event"), payload: payload || {} },
      token
    );
    return data || { ok: false, error: "NO_RESPONSE" };
  }

  // -----------------------------
  // Guards
  // -----------------------------
  function requireAuth(opts = {}) {
    const {
      redirect = "index.html",
      verify = true,
      toastOnFail = true,
      minRole = "", // 예: "ADMIN"
    } = opts;

    const token = getToken();
    const user = getUser();

    if (!token || !user || !user.username) {
      if (toastOnFail) toast("세션이 없습니다. 다시 로그인하세요.", "warn");
      location.replace(redirect);
      return;
    }

    if (minRole && String(user.role || "").toUpperCase() !== String(minRole).toUpperCase()) {
      toast("권한이 없습니다.", "err");
      location.replace(redirect);
      return;
    }

    if (!verify) return;

    // 토큰 유효성 비동기 검증 (페이지 로딩 후 즉시)
    Promise.resolve()
      .then(async () => {
        const me = await whoami(token);
        if (!me || !me.ok) {
          logout({
            redirect,
            silent: !toastOnFail,
            reason: "세션이 만료되었습니다. 다시 로그인하세요.",
          });
          return;
        }

        // 최신 사용자 정보로 업데이트(옵션)
        if (me.user && me.user.username) setUser(me.user);
      })
      .catch(() => {
        // 네트워크 불안정은 강제 로그아웃하지 않음
      });
  }

  // -----------------------------
  // UI helpers
  // -----------------------------
  function bindLogoutButtons(selector = '[data-action="logout"]', opts = {}) {
    $$(selector).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        logout(opts);
      });
    });
  }

  function bindPingButton(selector = '[data-action="ping"]') {
    $$(selector).forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          const res = await ping();
          if (res && res.ok) toast("PING OK", "ok");
          else toast("PING FAIL", "err");
        } catch (err) {
          toast("PING ERROR\n" + String(err), "err");
        }
      });
    });
  }

  function setHeaderUser(selector = "[data-bind='username']") {
    const user = getUser();
    const name =
      (user && (user.displayName || user.username)) ? (user.displayName || user.username) : "";
    $$(selector).forEach((el) => {
      el.textContent = name;
    });
  }

  // -----------------------------
  // Expose to window (이전 구조 유지)
  // -----------------------------
  window.KORUAL = {
    config: { API_BASE, TOKEN_KEY, USER_KEY },
    storage: {
      getToken,
      getUser,
      setToken,
      setUser,
      clearSession,
    },
    api: {
      apiGet,
      apiPost,
      whoami,
      ping,
      logEvent,
    },
    ui: {
      toast,
      bindLogoutButtons,
      bindPingButton,
      setHeaderUser,
    },
    auth: {
      requireAuth,
      logout,
    },
  };

  // -----------------------------
  // Auto init (선택)
  // - dashboard.html 등에서 data-page="dashboard"를 주면 자동 가드 수행
  // -----------------------------
  const page = document.documentElement.getAttribute("data-page") || "";
  if (page) {
    // 기본: 대시보드/관리 페이지는 인증 필요
    if (page !== "login") {
      requireAuth({ redirect: "index.html", verify: true, toastOnFail: false });
    }
    bindLogoutButtons();
    bindPingButton();
    setHeaderUser();
  }
})();
