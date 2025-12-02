/*************************************************
 * KORUAL CONTROL CENTER – Auth Frontend (Ultra High-End app.js)
 * - 로그인 / 회원가입
 * - ID 찾기 / PW 재설정
 * - 5회 실패 잠금 (백엔드 AUTH API 기준)
 * - 클라이언트 UserAgent + (옵션) IP 전송
 * - 다크/라이트 테마 + 다국어(i18n) + 토스트
 *************************************************/

(() => {
  const META = window.KORUAL_META_APP || {};
  const API   = META.api || {};
  const BRAND = META.brand || {};

  const CONTROL_CENTER_URL = "index.html"; // 로그인 성공 후 이동할 KORUAL CONTROL CENTER URL (필요시 수정)

  const STORAGE_KEYS = {
    THEME: "korual_theme",
    LANG: "korual_lang",
    REMEMBER_ID: "korual_remember_id",
    AUTH_USER: "korual_auth_user"
  };

  const I18N = {
    ko: {
      sign_to_korual: "SIGN IN TO KORUAL",
      headline: "KORUAL 계정으로 접속",
      tab_login: "로그인",
      tab_signup: "회원가입",
      login: "로그인",
      login_badge: "Control Center 입장",
      login_btn: "로그인",
      login_hint: "엔터키로도 로그인 가능",
      username: "아이디",
      password: "비밀번호",
      remember_id: "아이디 기억하기",
      signup: "회원가입",
      signup_badge: "Google Sheets 계정 저장",
      signup_btn: "회원가입",
      full_name: "이름",
      email: "이메일"
    },
    en: {
      sign_to_korual: "SIGN IN TO KORUAL",
      headline: "Access with your KORUAL account",
      tab_login: "Sign In",
      tab_signup: "Sign Up",
      login: "Sign In",
      login_badge: "Enter Control Center",
      login_btn: "Sign In",
      login_hint: "Press Enter to sign in",
      username: "Username",
      password: "Password",
      remember_id: "Remember ID",
      signup: "Sign Up",
      signup_badge: "Store account in Google Sheets",
      signup_btn: "Create Account",
      full_name: "Full Name",
      email: "Email"
    }
  };

  const qs  = (sel, parent = document) => parent.querySelector(sel);
  const qsa = (sel, parent = document) => Array.from(parent.querySelectorAll(sel));

  const htmlEl     = document.documentElement;
  const bodyEl     = document.body;
  const toastRoot  = document.getElementById("toastRoot");

  const apiStatusDot  = document.getElementById("apiStatusDot");
  const apiStatusText = document.getElementById("apiStatusText");

  const langTop   = document.getElementById("langTop");
  const langAuth  = document.getElementById("langAuth");

  const toggleThemeBtn = document.getElementById("toggleTheme");
  const yearSpan       = document.getElementById("year");

  const tabLoginBtn  = document.getElementById("tabLoginBtn");
  const tabSignupBtn = document.getElementById("tabSignupBtn");
  const loginPanel   = document.getElementById("loginPanel");
  const signupPanel  = document.getElementById("signupPanel");

  const loginUsername = document.getElementById("loginUsername");
  const loginPassword = document.getElementById("loginPassword");
  const rememberIdChk = document.getElementById("rememberId");
  const btnLogin      = document.getElementById("btnLogin");
  const loginMsg      = document.getElementById("loginMsg");
  const capsIndicator = document.getElementById("capsIndicator");
  const togglePwdBtn  = document.getElementById("togglePwd");

  const btnFillDemo       = document.getElementById("btnFillDemo");
  const btnFillDemoMobile = document.getElementById("btnFillDemoMobile");

  const suName  = document.getElementById("suName");
  const suEmail = document.getElementById("suEmail");
  const suUser  = document.getElementById("suUser");
  const suPass  = document.getElementById("suPass");
  const btnSignup  = document.getElementById("btnSignup");
  const signupMsg  = document.getElementById("signupMsg");

  const linkFindId = document.getElementById("linkFindId");
  const linkResetPw = document.getElementById("linkResetPw");

  const modalFindId = document.getElementById("modalFindId");
  const modalResetPw = document.getElementById("modalResetPw");

  const closeFindBtn  = document.getElementById("closeFind");
  const closeResetBtn = document.getElementById("closeReset");

  const fiEmail = document.getElementById("fiEmail");
  const btnFindIdSubmit = document.getElementById("btnFindIdSubmit");
  const fiResult = document.getElementById("fiResult");

  const rpUser  = document.getElementById("rpUser");
  const rpEmail = document.getElementById("rpEmail");
  const rpNewPw = document.getElementById("rpNewPw");
  const btnResetPwSubmit = document.getElementById("btnResetPwSubmit");
  const rpMsg = document.getElementById("rpMsg");

  const loadingOverlay = document.getElementById("loadingOverlay");

  let currentLang = I18N[META.ui?.defaultLang] ? META.ui.defaultLang : "ko";

  function applyTheme(theme) {
    const t = theme === "light" ? "light" : "dark";
    if (t === "dark") {
      htmlEl.classList.add("dark");
      bodyEl.classList.add("auth-bg-dark");
      bodyEl.classList.remove("auth-bg-light");
    } else {
      htmlEl.classList.remove("dark");
      bodyEl.classList.remove("auth-bg-dark");
      bodyEl.classList.add("auth-bg-light");
    }
    localStorage.setItem(STORAGE_KEYS.THEME, t);
  }

  function initTheme() {
    const stored = localStorage.getItem(STORAGE_KEYS.THEME);
    if (stored) {
      applyTheme(stored);
    } else {
      const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
      applyTheme(prefersDark ? "dark" : "dark");
    }
  }

  function syncLangSelects(lang) {
    if (langTop)  langTop.value = lang;
    if (langAuth) langAuth.value = lang;
  }

  function applyI18n(lang) {
    const pack = I18N[lang] || I18N.ko;
    qsa("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      const text = pack[key];
      if (!text) return;
      if (el.placeholder !== undefined && el.tagName === "INPUT") {
        el.placeholder = text;
      } else {
        el.textContent = text;
      }
    });
  }

  function setLang(lang) {
    const target = I18N[lang] ? lang : "ko";
    currentLang = target;
    applyI18n(target);
    syncLangSelects(target);
    localStorage.setItem(STORAGE_KEYS.LANG, target);
  }

  function initLang() {
    const stored = localStorage.getItem(STORAGE_KEYS.LANG);
    const initial = stored && I18N[stored] ? stored : currentLang;
    setLang(initial);
  }

  function showToast(message, variant = "info", timeout = 2600) {
    if (!toastRoot) return;

    const el = document.createElement("div");
    el.className =
      "pointer-events-auto max-w-sm w-full rounded-2xl border px-4 py-3 text-xs shadow-[0_20px_50px_rgba(15,23,42,0.95)] toast-enter " +
      (variant === "error"
        ? "border-rose-500/80 bg-rose-500/10 text-rose-50"
        : variant === "success"
        ? "border-emerald-500/80 bg-emerald-500/10 text-emerald-50"
        : "border-slate-600/80 bg-slate-900/95 text-slate-50");

    el.innerHTML = `
      <div class="flex items-start gap-2">
        <span class="mt-0.5 text-base">
          ${variant === "error" ? "⚠️" : variant === "success" ? "✅" : "🔔"}
        </span>
        <p class="flex-1 leading-relaxed">${message}</p>
      </div>
    `;

    toastRoot.appendChild(el);
    requestAnimationFrame(() => {
      el.classList.remove("toast-enter");
      el.classList.add("toast-enter-active");
    });

    setTimeout(() => {
      el.classList.remove("toast-enter-active");
      el.classList.add("toast-exit");
      requestAnimationFrame(() => {
        el.classList.add("toast-exit-active");
      });
      setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 200);
    }, timeout);
  }

  function setLoading(isLoading) {
    if (!loadingOverlay) return;
    loadingOverlay.classList.toggle("hidden", !isLoading);
  }

  function getClientMeta() {
    return {
      client_ip: "",
      user_agent: navigator.userAgent || ""
    };
  }

  async function callAuthApi(mode, payload = {}) {
    if (!API.baseUrl) {
      throw new Error("Auth API baseUrl 미설정");
    }

    const meta = getClientMeta();

    const body = {
      mode,
      ...payload,
      client_ip: meta.client_ip,
      user_agent: meta.user_agent,
      api_secret: API.secret || undefined
    };

    const res = await fetch(API.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json;charset=utf-8"
      },
      body: JSON.stringify(body)
    });

    let json;
    try {
      json = await res.json();
    } catch (e) {
      throw new Error("서버 응답 파싱 실패");
    }

    if (!res.ok || json.ok === false) {
      const msg = json && json.message ? json.message : "요청 처리 중 오류가 발생했습니다.";
      const err = new Error(msg);
      err.status = res.status;
      err.raw = json;
      throw err;
    }

    return json;
  }

  async function checkAuthApiHealth() {
    if (!apiStatusDot || !apiStatusText || !API.baseUrl) return;

    try {
      apiStatusDot.className =
        "h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_0_5px_rgba(251,191,36,0.35)]";

      apiStatusText.textContent = "Auth API 체크 중…";

      const url = API.baseUrl + "?t=" + Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, {
        method: "GET",
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      let json = null;
      try {
        json = await res.json();
      } catch (e) {}

      if (res.ok && json && json.ok) {
        apiStatusDot.className =
          "h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_5px_rgba(52,211,153,0.35)]";
        apiStatusText.textContent = "Auth API 정상 작동 중";
      } else {
        throw new Error();
      }
    } catch (e) {
      apiStatusDot.className =
        "h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_0_5px_rgba(239,68,68,0.38)]";
      apiStatusText.textContent = "Auth API 응답 없음";
    }
  }

  function setInputsError(elArr, isError) {
    elArr.forEach(el => {
      if (!el) return;
      el.classList.toggle("input-error", isError);
    });
  }

  async function handleLogin() {
    if (!loginUsername || !loginPassword || !btnLogin) return;

    const username = loginUsername.value.trim();
    const password = loginPassword.value;

    loginMsg.textContent = "";
    setInputsError([loginUsername, loginPassword], false);

    if (!username || !password) {
      loginMsg.textContent = "아이디와 비밀번호를 모두 입력해주세요.";
      setInputsError([loginUsername, loginPassword], true);
      showToast("아이디와 비밀번호를 모두 입력해주세요.", "error");
      return;
    }

    btnLogin.disabled = true;
    setLoading(true);

    try {
      const res = await callAuthApi("login", {
        username,
        password
      });

      if (!res || !res.ok || !res.user) {
        throw new Error(res && res.message ? res.message : "로그인 처리 실패");
      }

      if (rememberIdChk && rememberIdChk.checked) {
        localStorage.setItem(STORAGE_KEYS.REMEMBER_ID, username);
      } else {
        localStorage.removeItem(STORAGE_KEYS.REMEMBER_ID);
      }

      try {
        localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(res.user));
      } catch (e) {}

      loginMsg.textContent = "";
      showToast("로그인 성공: KORUAL CONTROL CENTER로 이동합니다.", "success");

      setTimeout(() => {
        window.location.href = CONTROL_CENTER_URL;
      }, 600);
    } catch (err) {
      const msg = err.message || "로그인 중 오류가 발생했습니다.";
      loginMsg.textContent = msg;
      setInputsError([loginUsername, loginPassword], true);
      showToast(msg, "error");
    } finally {
      btnLogin.disabled = false;
      setLoading(false);
    }
  }

  async function handleSignup() {
    if (!btnSignup) return;

    const full_name = suName.value.trim();
    const email     = suEmail.value.trim();
    const username  = suUser.value.trim();
    const password  = suPass.value;

    signupMsg.textContent = "";
    setInputsError([suName, suEmail, suUser, suPass], false);

    if (!full_name || !email || !username || !password) {
      signupMsg.textContent = "필수 항목을 모두 입력해주세요.";
      showToast("필수 항목을 모두 입력해주세요.", "error");
      setInputsError([suName, suEmail, suUser, suPass], true);
      return;
    }

    if (password.length < 6) {
      signupMsg.textContent = "비밀번호는 최소 6자리 이상이어야 합니다.";
      setInputsError([suPass], true);
      showToast("비밀번호는 최소 6자리 이상이어야 합니다.", "error");
      return;
    }

    btnSignup.disabled = true;
    setLoading(true);

    try {
      const res = await callAuthApi("signup", {
        username,
        password,
        full_name,
        email,
        role: "staff",
        created_by: "SELF"
      });

      if (!res || !res.ok) {
        throw new Error(res && res.message ? res.message : "회원가입 처리 실패");
      }

      signupMsg.textContent = "회원가입이 완료되었습니다. 로그인 탭에서 접속해주세요.";
      showToast("회원가입 성공: 로그인 탭으로 이동해서 접속해주세요.", "success");

      if (tabLoginBtn && tabSignupBtn) {
        tabLoginBtn.click();
      }
      if (loginUsername) loginUsername.value = username;
      if (loginPassword) loginPassword.value = "";
      if (rememberIdChk) rememberIdChk.checked = true;
      localStorage.setItem(STORAGE_KEYS.REMEMBER_ID, username);
    } catch (err) {
      const msg = err.message || "회원가입 중 오류가 발생했습니다.";
      signupMsg.textContent = msg;
      showToast(msg, "error");
    } finally {
      btnSignup.disabled = false;
      setLoading(false);
    }
  }

  function openModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove("hidden");
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.add("hidden");
  }

  async function handleFindId() {
    const email = fiEmail.value.trim();
    fiResult.textContent = "";
    fiEmail.classList.remove("input-error");

    if (!email) {
      fiEmail.classList.add("input-error");
      fiResult.textContent = "이메일을 입력해주세요.";
      showToast("이메일을 입력해주세요.", "error");
      return;
    }

    btnFindIdSubmit.disabled = true;
    setLoading(true);

    try {
      const res = await callAuthApi("findId", { email });
      const ids = res.ids || [];

      if (!ids.length) {
        fiResult.textContent = "해당 이메일로 등록된 아이디가 없습니다.";
      } else {
        fiResult.innerHTML = `등록된 아이디: <span class="text-sky-300 font-mono">${ids.join(
          ", "
        )}</span>`;
      }
    } catch (err) {
      const msg = err.message || "아이디 조회 중 오류가 발생했습니다.";
      fiResult.textContent = msg;
      showToast(msg, "error");
    } finally {
      btnFindIdSubmit.disabled = false;
      setLoading(false);
    }
  }

  async function handleResetPw() {
    const username    = rpUser.value.trim();
    const email       = rpEmail.value.trim();
    const newPassword = rpNewPw.value;

    rpMsg.textContent = "";
    setInputsError([rpUser, rpEmail, rpNewPw], false);

    if (!username || !email || !newPassword) {
      rpMsg.textContent = "아이디, 이메일, 새 비밀번호를 모두 입력해주세요.";
      setInputsError([rpUser, rpEmail, rpNewPw], true);
      showToast("아이디, 이메일, 새 비밀번호를 모두 입력해주세요.", "error");
      return;
    }

    if (newPassword.length < 6) {
      rpMsg.textContent = "새 비밀번호는 최소 6자리 이상이어야 합니다.";
      setInputsError([rpNewPw], true);
      showToast("새 비밀번호는 최소 6자리 이상이어야 합니다.", "error");
      return;
    }

    btnResetPwSubmit.disabled = true;
    setLoading(true);

    try {
      const res = await callAuthApi("resetPw", {
        username,
        email,
        new_password: newPassword
      });

      if (!res || !res.ok) {
        throw new Error(res && res.message ? res.message : "비밀번호 재설정 실패");
      }

      rpMsg.textContent = "비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해주세요.";
      showToast("비밀번호가 재설정되었습니다.", "success");
    } catch (err) {
      const msg = err.message || "비밀번호 재설정 중 오류가 발생했습니다.";
      rpMsg.textContent = msg;
      showToast(msg, "error");
    } finally {
      btnResetPwSubmit.disabled = false;
      setLoading(false);
    }
  }

  function switchToLoginTab() {
    if (!tabLoginBtn || !tabSignupBtn || !loginPanel || !signupPanel) return;

    tabLoginBtn.classList.add("tab-active");
    tabLoginBtn.classList.remove("tab-inactive");
    tabSignupBtn.classList.add("tab-inactive");
    tabSignupBtn.classList.remove("tab-active");

    tabLoginBtn.setAttribute("aria-selected", "true");
    tabSignupBtn.setAttribute("aria-selected", "false");

    loginPanel.classList.remove("hidden");
    signupPanel.classList.add("hidden");
  }

  function switchToSignupTab() {
    if (!tabLoginBtn || !tabSignupBtn || !loginPanel || !signupPanel) return;

    tabSignupBtn.classList.add("tab-active");
    tabSignupBtn.classList.remove("tab-inactive");
    tabLoginBtn.classList.add("tab-inactive");
    tabLoginBtn.classList.remove("tab-active");

    tabLoginBtn.setAttribute("aria-selected", "false");
    tabSignupBtn.setAttribute("aria-selected", "true");

    signupPanel.classList.remove("hidden");
    loginPanel.classList.add("hidden");
  }

  function initRememberId() {
    const storedId = localStorage.getItem(STORAGE_KEYS.REMEMBER_ID);
    if (storedId && loginUsername) {
      loginUsername.value = storedId;
      if (rememberIdChk) rememberIdChk.checked = true;
    }
  }

  function initAuthUserInfo() {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    if (!raw) return;
    try {
      const user = JSON.parse(raw);
      if (user && user.username) {
        if (loginUsername && !loginUsername.value) {
          loginUsername.value = user.username;
        }
      }
    } catch (e) {}
  }

  function initCapsLockIndicator() {
    if (!loginPassword || !capsIndicator) return;

    function updateIndicator(ev) {
      if (!ev.getModifierState) return;
      const caps = ev.getModifierState("CapsLock");
      capsIndicator.classList.toggle("hidden", !caps);
    }

    loginPassword.addEventListener("keydown", updateIndicator);
    loginPassword.addEventListener("keyup", updateIndicator);
  }

  function initTogglePassword() {
    if (!togglePwdBtn || !loginPassword) return;

    togglePwdBtn.addEventListener("click", () => {
      const isPw = loginPassword.type === "password";
      loginPassword.type = isPw ? "text" : "password";
      togglePwdBtn.textContent = isPw ? "🙈 비밀번호 숨기기" : "👁 비밀번호 보기";
      loginPassword.focus();
    });
  }

  function initDemoFillButtons() {
    function fillDemo() {
      if (loginUsername) loginUsername.value = "KORUAL";
      if (loginPassword) loginPassword.value = "GUEST";
      if (loginPassword) loginPassword.focus();
    }
    if (btnFillDemo) {
      btnFillDemo.addEventListener("click", fillDemo);
    }
    if (btnFillDemoMobile) {
      btnFillDemoMobile.addEventListener("click", fillDemo);
    }
  }

  function initYear() {
    if (yearSpan) {
      yearSpan.textContent = new Date().getFullYear();
    }
  }

  function initThemeToggle() {
    if (!toggleThemeBtn) return;
    toggleThemeBtn.addEventListener("click", () => {
      const current = localStorage.getItem(STORAGE_KEYS.THEME) || "dark";
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next);
    });
  }

  function initLangSelectEvents() {
    function onChangeLang(e) {
      setLang(e.target.value);
    }
    if (langTop) {
      langTop.addEventListener("change", onChangeLang);
    }
    if (langAuth) {
      langAuth.addEventListener("change", onChangeLang);
    }
  }

  function initAuthEvents() {
    if (btnLogin) {
      btnLogin.addEventListener("click", () => {
        handleLogin();
      });
    }

    if (btnSignup) {
      btnSignup.addEventListener("click", () => {
        handleSignup();
      });
    }

    document.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        const isFindOpen  = modalFindId && !modalFindId.classList.contains("hidden");
        const isResetOpen = modalResetPw && !modalResetPw.classList.contains("hidden");

        if (isFindOpen || isResetOpen) return;

        if (loginPanel && !loginPanel.classList.contains("hidden")) {
          handleLogin();
        }
      }
    });

    if (tabLoginBtn) {
      tabLoginBtn.addEventListener("click", () => {
        switchToLoginTab();
      });
    }
    if (tabSignupBtn) {
      tabSignupBtn.addEventListener("click", () => {
        switchToSignupTab();
      });
    }
  }

  function initModalEvents() {
    if (linkFindId && modalFindId) {
      linkFindId.addEventListener("click", () => {
        fiEmail.value = "";
        fiResult.textContent = "";
        fiEmail.classList.remove("input-error");
        openModal(modalFindId);
        setTimeout(() => fiEmail.focus(), 50);
      });
    }

    if (linkResetPw && modalResetPw) {
      linkResetPw.addEventListener("click", () => {
        rpUser.value = "";
        rpEmail.value = "";
        rpNewPw.value = "";
        rpMsg.textContent = "";
        setInputsError([rpUser, rpEmail, rpNewPw], false);
        openModal(modalResetPw);
        setTimeout(() => rpUser.focus(), 50);
      });
    }

    if (closeFindBtn && modalFindId) {
      closeFindBtn.addEventListener("click", () => closeModal(modalFindId));
    }
    if (closeResetBtn && modalResetPw) {
      closeResetBtn.addEventListener("click", () => closeModal(modalResetPw));
    }

    if (modalFindId) {
      modalFindId.addEventListener("click", e => {
        if (e.target === modalFindId) {
          closeModal(modalFindId);
        }
      });
    }
    if (modalResetPw) {
      modalResetPw.addEventListener("click", e => {
        if (e.target === modalResetPw) {
          closeModal(modalResetPw);
        }
      });
    }

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        if (modalFindId && !modalFindId.classList.contains("hidden")) {
          closeModal(modalFindId);
        }
        if (modalResetPw && !modalResetPw.classList.contains("hidden")) {
          closeModal(modalResetPw);
        }
      }
    });

    if (btnFindIdSubmit) {
      btnFindIdSubmit.addEventListener("click", () => {
        handleFindId();
      });
    }

    if (btnResetPwSubmit) {
      btnResetPwSubmit.addEventListener("click", () => {
        handleResetPw();
      });
    }
  }

  function initPageGuardInfo() {
    const authRaw = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    if (authRaw) {
      try {
        const authUser = JSON.parse(authRaw);
        if (authUser && authUser.username) {
        }
      } catch (e) {}
    }
  }

  function init() {
    initTheme();
    initThemeToggle();

    initLang();
    initLangSelectEvents();

    initYear();
    initRememberId();
    initAuthUserInfo();
    initCapsLockIndicator();
    initTogglePassword();
    initDemoFillButtons();

    initAuthEvents();
    initModalEvents();

    initPageGuardInfo();

    checkAuthApiHealth();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
