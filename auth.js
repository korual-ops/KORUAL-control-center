/* =========================
   KORUAL Auth Controller
   File: auth.js
   - UI는 index.html 유지
   - 로그인/잠금/상태체크/토스트 관리
   ========================= */

(() => {
  const META = window.KORUAL_META_APP || {};
  const API_BASE = (META.api && META.api.baseUrl) ? String(META.api.baseUrl).replace(/\/+$/, "") : "";
  const API_SECRET = (META.api && META.api.secret) ? String(META.api.secret) : "";

  // 저장 키(기존 index.html과 호환)
  const LS = {
    USER: "korual_user",
    LOCK: "korual_auth_lock",       // { until:number(ms), fails:number }
    FAILS: "korual_auth_fails"       // number
  };

  // 정책(요구사항 문구와 일치)
  const POLICY = {
    maxFails: 5,
    lockMinutes: 30,
    pingIntervalMs: 15000
  };

  // DOM
  const el = {
    username: document.getElementById("loginUsername"),
    password: document.getElementById("loginPassword"),
    btnLogin: document.getElementById("btnLogin"),
    btnFillDemo: document.getElementById("btnFillDemo"),
    msg: document.getElementById("loginMsg"),
    overlay: document.getElementById("loadingOverlay"),
    toastRoot: document.getElementById("toastRoot"),
    dot: document.getElementById("apiStatusDot"),
    statusText: document.getElementById("apiStatusText")
  };

  // ============ Helpers ============
  function now() { return Date.now(); }

  function setMsg(text, type = "error") {
    if (!el.msg) return;
    el.msg.textContent = text || "";
    el.msg.className = type === "ok"
      ? "text-xs text-emerald-300 min-h-[1rem]"
      : "text-xs text-rose-400 min-h-[1rem]";
  }

  function setLoading(on) {
    if (!el.overlay) return;
    el.overlay.classList.toggle("hidden", !on);
    if (el.btnLogin) el.btnLogin.disabled = !!on;
  }

  function toast(message, kind = "info") {
    if (!el.toastRoot) return;

    const box = document.createElement("div");
    box.className =
      "pointer-events-none w-full max-w-md rounded-2xl border px-4 py-3 text-sm shadow-2xl " +
      (kind === "ok"
        ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-100"
        : kind === "error"
        ? "bg-rose-500/15 border-rose-400/30 text-rose-100"
        : "bg-slate-500/15 border-slate-300/20 text-slate-100");

    box.textContent = message;

    el.toastRoot.innerHTML = "";
    el.toastRoot.appendChild(box);

    setTimeout(() => {
      if (box && box.parentNode) box.parentNode.removeChild(box);
    }, 2200);
  }

  function safeJsonParse(raw, fallback = null) {
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  function getLock() {
    const raw = localStorage.getItem(LS.LOCK);
    return safeJsonParse(raw, null);
  }

  function setLock(lockObj) {
    localStorage.setItem(LS.LOCK, JSON.stringify(lockObj));
  }

  function clearLock() {
    localStorage.removeItem(LS.LOCK);
    localStorage.removeItem(LS.FAILS);
  }

  function incFail() {
    const n = parseInt(localStorage.getItem(LS.FAILS) || "0", 10) || 0;
    const next = n + 1;
    localStorage.setItem(LS.FAILS, String(next));
    return next;
  }

  function getFailCount() {
    return parseInt(localStorage.getItem(LS.FAILS) || "0", 10) || 0;
  }

  function lockIfNeeded(fails) {
    if (fails < POLICY.maxFails) return null;
    const until = now() + POLICY.lockMinutes * 60 * 1000;
    const lock = { until, fails };
    setLock(lock);
    return lock;
  }

  function lockRemainingMs() {
    const lock = getLock();
    if (!lock || !lock.until) return 0;
    const remain = lock.until - now();
    return remain > 0 ? remain : 0;
  }

  function formatRemain(ms) {
    const m = Math.ceil(ms / 60000);
    return `${m}분`;
  }

  async function fetchJson(url, opts = {}) {
    const res = await fetch(url, opts);
    const text = await res.text();
    const json = safeJsonParse(text, null);
    if (!res.ok) {
      const msg = (json && (json.message || json.error)) ? (json.message || json.error) : `HTTP_${res.status}`;
      throw new Error(msg);
    }
    return json ?? { ok: false, raw: text };
  }

  function authHeaders() {
    const h = { "Content-Type": "application/json", "Accept": "application/json" };
    // secret은 "운영 편의용" 수준으로만 사용(완전한 보안 수단은 아님)
    if (API_SECRET) h["X-KORUAL-SECRET"] = API_SECRET;
    return h;
  }

  // ============ API Status Ping ============
  function setApiStatus(state, text) {
    if (el.dot) {
      el.dot.className =
        "h-2.5 w-2.5 rounded-full " +
        (state === "ok"
          ? "bg-emerald-400 shadow-[0_0_0_5px_rgba(52,211,153,0.25)]"
          : state === "down"
          ? "bg-rose-400 shadow-[0_0_0_5px_rgba(251,113,133,0.25)]"
          : "bg-amber-400 shadow-[0_0_0_5px_rgba(251,191,36,0.35)]");
    }
    if (el.statusText) el.statusText.textContent = text || "";
  }

  async function pingAuthApi() {
    if (!API_BASE) {
      setApiStatus("down", "Auth API 미설정");
      return;
    }

    try {
      setApiStatus("warm", "Auth API 체크 중…");
      // 권장: 서버에 /auth/ping 라우트 구현
      // 없으면 GAS에서 doGet에 ?ping=1 같은 형태로 우회도 가능
      const url = `${API_BASE}?route=auth.ping`;
      const json = await fetchJson(url, { method: "GET", headers: authHeaders() });

      if (json && json.ok) setApiStatus("ok", "Auth API 정상");
      else setApiStatus("down", "Auth API 응답 오류");
    } catch (_) {
      setApiStatus("down", "Auth API 연결 실패");
    }
  }

  // ============ Login ============
  async function login() {
    const remain = lockRemainingMs();
    if (remain > 0) {
      const msg = `보안 잠금 상태입니다. ${formatRemain(remain)} 후 다시 시도하세요.`;
      setMsg(msg, "error");
      toast(msg, "error");
      return;
    }

    const username = (el.username && el.username.value ? el.username.value : "").trim();
    const password = (el.password && el.password.value ? el.password.value : "").trim();

    if (!username || !password) {
      setMsg("아이디와 비밀번호를 입력하세요.", "error");
      return;
    }

    if (!API_BASE) {
      setMsg("Auth API가 설정되지 않았습니다. (baseUrl)", "error");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      // 권장: GAS에서 route=auth.login 처리
      const url = `${API_BASE}`;
      const body = {
        route: "auth.login",
        username,
        password
      };

      const json = await fetchJson(url, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body)
      });

      if (!json || !json.ok) {
        throw new Error((json && (json.message || json.error)) ? (json.message || json.error) : "LOGIN_FAILED");
      }

      // 기대 응답 예시:
      // { ok:true, user:{ username, role, tier }, token:"...", issuedAt:"..." }
      const user = json.user || { username };
      localStorage.setItem(LS.USER, JSON.stringify(user));

      // 토큰 기반 app.js를 같이 쓰는 구조라면, token도 저장(옵션)
      if (json.token) {
        localStorage.setItem("korual_api_token", String(json.token));
      }

      clearLock();
      setMsg("로그인 성공", "ok");
      toast("로그인 성공", "ok");

      setTimeout(() => {
        location.replace("dashboard.html");
      }, 350);

    } catch (err) {
      const fails = incFail();
      const lock = lockIfNeeded(fails);

      if (lock) {
        const msg = `로그인 실패가 누적되어 ${POLICY.lockMinutes}분 잠금 처리되었습니다.`;
        setMsg(msg, "error");
        toast(msg, "error");
      } else {
        const remainTry = POLICY.maxFails - fails;
        const msg = `로그인 실패. 남은 시도: ${remainTry}회`;
        setMsg(msg, "error");
        toast(msg, "error");
      }
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    if (el.username) el.username.value = "KORUAL";
    if (el.password) el.password.value = "GUEST";
    toast("테스트 계정을 입력했습니다.", "info");
    if (el.password) el.password.focus();
  }

  function bind() {
    if (el.btnLogin) el.btnLogin.addEventListener("click", login);
    if (el.btnFillDemo) el.btnFillDemo.addEventListener("click", fillDemo);

    // Enter key submit
    [el.username, el.password].forEach(input => {
      if (!input) return;
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") login();
      });
    });
  }

  // ============ Boot ============
  bind();
  pingAuthApi();
  setInterval(pingAuthApi, POLICY.pingIntervalMs);
})();
