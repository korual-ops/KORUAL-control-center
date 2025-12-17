/* =========================
   KORUAL Auth Controller
   File: auth.js
   - index.html UI 유지
   - CORS preflight 최소화 (ping: GET no custom headers)
   ========================= */

(() => {
  const META = window.KORUAL_META_APP || {};
  const API_BASE = (META.api && META.api.baseUrl) ? String(META.api.baseUrl).replace(/\/+$/, "") : "";
  const API_SECRET = (META.api && META.api.secret) ? String(META.api.secret) : "";

  // 커스텀 헤더를 쓰면 브라우저가 OPTIONS(preflight)를 먼저 보냅니다.
  // GAS에서 doOptions/CORS를 완벽히 처리하지 않으면 "연결 실패"가 나기 쉬워서,
  // 기본은 OFF. (서버가 CORS 완비되면 true로 바꾸세요.)
  const USE_CUSTOM_HEADER = false;

  const LS = {
    USER: "korual_user",
    FAILS: "korual_auth_fails",
    LOCK: "korual_auth_lock" // { until:number(ms), fails:number }
  };

  const POLICY = {
    maxFails: 5,
    lockMinutes: 30,
    pingIntervalMs: 15000
  };

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

  // ---------- utils ----------
  function now() { return Date.now(); }

  function safeJsonParse(raw, fallback = null) {
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  function setLoading(on) {
    if (el.overlay) el.overlay.classList.toggle("hidden", !on);
    if (el.btnLogin) el.btnLogin.disabled = !!on;
  }

  function setMsg(text, type = "error") {
    if (!el.msg) return;
    el.msg.textContent = text || "";
    el.msg.className = type === "ok"
      ? "text-xs text-emerald-300 min-h-[1rem]"
      : "text-xs text-rose-400 min-h-[1rem]";
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

  function buildHeaders() {
    const h = { "Accept": "application/json" };
    // GET ping에서는 절대 커스텀 헤더를 안 씁니다.
    // POST에서도 기본은 커스텀 헤더 없이 갑니다(프리플라이트 회피).
    if (USE_CUSTOM_HEADER && API_SECRET) h["X-KORUAL-SECRET"] = API_SECRET;
    return h;
  }

  async function fetchJson(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text();
    const json = safeJsonParse(text, null);

    // GAS가 HTML(에러/로그인)로 돌려도 여기서 감지 가능
    if (!res.ok) {
      const msg = (json && (json.message || json.error)) ? (json.message || json.error) : `HTTP_${res.status}`;
      throw new Error(msg);
    }
    if (json == null) {
      // JSON이 아니면(대부분 권한/리디렉트/HTML 에러)
      throw new Error("NON_JSON_RESPONSE");
    }
    return json;
  }

  // ---------- lock ----------
  function getFailCount() {
    return parseInt(localStorage.getItem(LS.FAILS) || "0", 10) || 0;
  }
  function incFail() {
    const next = getFailCount() + 1;
    localStorage.setItem(LS.FAILS, String(next));
    return next;
  }
  function clearFails() {
    localStorage.removeItem(LS.FAILS);
  }

  function getLock() {
    return safeJsonParse(localStorage.getItem(LS.LOCK) || "", null);
  }
  function setLock(lockObj) {
    localStorage.setItem(LS.LOCK, JSON.stringify(lockObj));
  }
  function clearLock() {
    localStorage.removeItem(LS.LOCK);
  }
  function lockRemainingMs() {
    const lock = getLock();
    if (!lock || !lock.until) return 0;
    const remain = lock.until - now();
    return remain > 0 ? remain : 0;
  }
  function lockIfNeeded(fails) {
    if (fails < POLICY.maxFails) return null;
    const until = now() + POLICY.lockMinutes * 60 * 1000;
    const lock = { until, fails };
    setLock(lock);
    return lock;
  }
  function formatRemain(ms) {
    const m = Math.ceil(ms / 60000);
    return `${m}분`;
  }

  // ---------- API status ----------
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

    // ping은 CORS preflight를 유발하지 않도록 "GET + 기본 헤더"만 사용
    const url = `${API_BASE}?route=auth.ping&_=${Date.now()}`;

    try {
      setApiStatus("warm", "Auth API 체크 중…");
      const json = await fetchJson(url, { method: "GET", headers: { "Accept": "application/json" } });

      if (json && json.ok) setApiStatus("ok", "Auth API 정상");
      else setApiStatus("down", "Auth API 응답 오류");

    } catch (err) {
      // 가장 흔한 케이스: CORS/권한(로그인 필요)/라우트 미구현/HTML 응답
      setApiStatus("down", "Auth API 연결 실패");
    }
  }

  // ---------- login ----------
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
      setMsg("Auth API가 설정되지 않았습니다.(baseUrl)", "error");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      // login은 POST JSON (서버가 CORS 처리되어 있지 않다면 커스텀 헤더는 피하는 게 안전)
      const url = API_BASE;
      const body = { route: "auth.login", username, password };

      const json = await fetchJson(url, {
        method: "POST",
        headers: {
          ...buildHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!json.ok) {
        throw new Error(json.message || json.error || "LOGIN_FAILED");
      }

      // 성공 시 user 저장
      const user = json.user || { username };
      localStorage.setItem(LS.USER, JSON.stringify(user));

      // app.js가 Bearer 토큰을 쓰는 구조면 token도 저장(옵션)
      if (json.token) localStorage.setItem("korual_api_token", String(json.token));

      clearFails();
      clearLock();

      setMsg("로그인 성공", "ok");
      toast("로그인 성공", "ok");

      setTimeout(() => location.replace("dashboard.html"), 350);

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

    [el.username, el.password].forEach(input => {
      if (!input) return;
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") login();
      });
    });
  }

  // ---------- boot ----------
  bind();
  pingAuthApi();
  setInterval(pingAuthApi, POLICY.pingIntervalMs);
})();
