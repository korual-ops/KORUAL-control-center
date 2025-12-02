/*************************************************
 * KORUAL CONTROL CENTER – High-End Frontend app.js
 * - 로그인 / 회원가입
 * - ID 찾기 / PW 재설정
 * - 5회 실패 잠금 (백엔드 code.gs 기준)
 * - 클라이언트 IP + UserAgent 로그
 * - 다크/라이트 테마 + 다국어(i18n) + 토스트
 *************************************************/

/******** i18n ********/
const I18N = {
  ko: {
    sign_to_korual: "SIGN IN TO KORUAL",
    headline: "KORUAL 계정으로 접속",
    tab_login: "로그인",
    tab_signup: "회원가입",
    login: "로그인",
    login_btn: "로그인",
    login_badge: "Control Center 입장",
    login_hint: "엔터키로도 로그인 가능",
    signup: "회원가입",
    signup_btn: "회원가입",
    signup_badge: "Google Sheets 계정 저장",
    username: "아이디",
    password: "비밀번호",
    full_name: "이름",
    email: "이메일",
    remember_id: "아이디 기억하기",
    login_failed: "로그인 실패: 아이디/비밀번호를 확인하세요.",
    signup_done: "회원가입 완료. 이제 로그인해 주세요.",
    user_exists: "이미 존재하는 아이디입니다.",
    need_id_pw: "아이디와 비밀번호를 입력해주세요.",
    // ID/PW 찾기
    find_id: "아이디 찾기",
    reset_pw: "비밀번호 재설정",
    find_id_desc: "회원가입할 때 사용한 이메일을 입력하면, 해당 이메일로 등록된 아이디 목록을 보여줍니다.",
    reset_pw_desc: "아이디와 이메일을 확인한 뒤, 새 비밀번호를 설정합니다.",
    find_id_success_prefix: "다음 아이디가 등록되어 있습니다:",
    find_id_empty: "해당 이메일로 등록된 계정이 없습니다.",
    reset_pw_success: "비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해 주세요.",
    reset_pw_failed: "비밀번호 재설정에 실패했습니다. 정보를 다시 확인해 주세요.",
    need_email: "이메일을 입력해주세요.",
    need_reset_fields: "아이디, 이메일, 새 비밀번호를 모두 입력해주세요.",
    pw_too_short: "새 비밀번호는 최소 6자리 이상이어야 합니다.",
    server_error: "서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
    loading_login: "로그인 중...",
    loading_signup: "가입 처리 중...",
    loading_search: "조회 중..."
  },
  en: {
    sign_to_korual: "SIGN IN TO KORUAL",
    headline: "Sign in to KORUAL Control Center",
    tab_login: "Login",
    tab_signup: "Sign Up",
    login: "Login",
    login_btn: "Login",
    login_badge: "Enter Control Center",
    login_hint: "Press Enter to login",
    signup: "Sign Up",
    signup_btn: "Sign Up",
    signup_badge: "Store accounts in Google Sheets",
    username: "Username",
    password: "Password",
    full_name: "Full Name",
    email: "Email",
    remember_id: "Remember ID",
    login_failed: "Login failed: check username/password.",
    signup_done: "Sign-up completed. Please login.",
    user_exists: "This username already exists.",
    need_id_pw: "Please enter username & password.",
    // ID/PW
    find_id: "Find ID",
    reset_pw: "Reset Password",
    find_id_desc: "Enter the email you used when signing up. All IDs registered with this email will be shown.",
    reset_pw_desc: "Enter your ID, email, and new password to reset.",
    find_id_success_prefix: "The following IDs are registered:",
    find_id_empty: "No accounts found for that email.",
    reset_pw_success: "Password has been reset. Please login with your new password.",
    reset_pw_failed: "Failed to reset password. Please check your info.",
    need_email: "Please enter an email.",
    need_reset_fields: "Please fill ID, email, and new password.",
    pw_too_short: "New password must be at least 6 characters.",
    server_error: "Unable to reach the server. Please try again.",
    loading_login: "Signing in...",
    loading_signup: "Signing up...",
    loading_search: "Searching..."
  }
};

let LANG = localStorage.getItem("korual_lang") || "ko";

/******** Helper ********/
const $ = id => document.getElementById(id);

function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    const v = I18N[LANG][key];
    if (typeof v === "string") el.textContent = v;
  });
  const langTop  = $("langTop");
  const langAuth = $("langAuth");
  if (langTop)  langTop.value  = LANG;
  if (langAuth) langAuth.value = LANG;
}

/******** Theme ********/
function applyTheme(mode) {
  const root  = document.documentElement;
  const body  = document.body;
  const final = mode === "light" ? "light" : "dark";

  root.classList.toggle("dark", final === "dark");
  localStorage.setItem("korual_theme", final);

  if (final === "dark") {
    body.classList.remove("auth-bg-light");
    body.classList.add("auth-bg-dark");
  } else {
    body.classList.remove("auth-bg-dark");
    body.classList.add("auth-bg-light");
  }

  const themeBtn = $("toggleTheme");
  if (themeBtn) {
    themeBtn.textContent = final === "dark" ? "🌓" : "🌞";
    themeBtn.title = final === "dark"
      ? "라이트 모드로 전환"
      : "다크 모드로 전환";
  }
}

/******** Toast (하이엔드) ********/
function ensureToastRoot() {
  let root = $("toastRoot");
  if (!root) {
    root = document.createElement("div");
    root.id = "toastRoot";
    root.className = "toast-container";
    document.body.appendChild(root);
  }
  return root;
}

function showToast(message, type = "info") {
  const root = ensureToastRoot();
  if (!root) return;

  const el = document.createElement("div");
  let cls = "toast ";
  if (type === "success") cls += "toast-success";
  else if (type === "error") cls += "toast-error";
  else cls += "toast-info";

  el.className = cls;
  el.textContent = message;

  root.appendChild(el);

  // 자동 사라짐
  setTimeout(() => {
    el.classList.add("hide");
    setTimeout(() => {
      if (el.parentNode === root) root.removeChild(el);
    }, 260);
  }, 2600);
}

/******** 공통 유틸 ********/
function isValidEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function clearInputErrors() {
  [
    "loginUsername",
    "loginPassword",
    "suUser",
    "suPass",
    "suEmail",
    "fiEmail",
    "rpUser",
    "rpEmail",
    "rpNewPw"
  ].forEach(id => {
    const el = $(id);
    if (el) el.classList.remove("input-error");
  });
}

/******** Modal Helper ********/
function openModal(el) {
  if (!el) return;
  el.classList.remove("hidden");
  el.classList.add("flex");
}

function closeModal(el) {
  if (!el) return;
  el.classList.add("hidden");
  el.classList.remove("flex");
}

/******** Loading Overlay ********/
function setOverlayVisible(isVisible) {
  const overlay = $("loadingOverlay");
  if (!overlay) return;
  overlay.classList.toggle("hidden", !isVisible);
}

/******** Google Sheets Auth API ********/
const GS_API        = "https://script.google.com/macros/s/AKfycbyYWVWNZ8hjn2FFuPhy4OAltjRx70vEHJk5DPgOtf1Lf4rHy8KqrRR5XXmqIz9WHxIEQw/exec";
const DASHBOARD_URL = "dashboard.html";

/******** 클라이언트 IP ********/
window.__korualClientIp = "";
try {
  fetch("https://api.ipify.org?format=json")
    .then(res => res.json())
    .then(d => { window.__korualClientIp = d.ip; })
    .catch(() => {});
} catch (_) {}

/******** API Wrappers ********/
async function apiSignup(payload) {
  const res = await fetch(GS_API, {
    method: "POST",
    body: JSON.stringify({
      mode: "signup",
      ...payload,
      client_ip:  window.__korualClientIp || "",
      user_agent: navigator.userAgent || ""
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(data.message || "Signup error");
  return data;
}

async function apiLogin(username, password) {
  const res = await fetch(GS_API, {
    method: "POST",
    body: JSON.stringify({
      mode: "login",
      username,
      password,
      client_ip:  window.__korualClientIp || "",
      user_agent: navigator.userAgent || ""
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) throw new Error(data.message || "Login error");
  return data;
}

// 아이디 찾기
async function apiFindId(email) {
  const res = await fetch(GS_API, {
    method: "POST",
    body: JSON.stringify({ mode: "findId", email })
  });
  return res.json().catch(() => ({ ok: false }));
}

// 비밀번호 재설정
async function apiResetPw({ username, email, new_password }) {
  const res = await fetch(GS_API, {
    method: "POST",
    body: JSON.stringify({ mode: "resetPw", username, email, new_password })
  });
  return res.json().catch(() => ({ ok: false }));
}

/******** API 상태 체크 ********/
async function pingApi() {
  const dot = $("apiStatusDot");
  const txt = $("apiStatusText");
  if (!dot || !txt) return;

  try {
    const res = await fetch(GS_API);
    const ok  = res.ok;
    dot.className = "api-status-dot " + (ok ? "" : "api-status-dot-error");
    txt.textContent = ok ? "Auth API Online" : "Auth API Error";
  } catch {
    dot.className = "api-status-dot api-status-dot-error";
    txt.textContent = "Auth API Error";
  }
}

/******** Bootstrap ********/
(function bootstrap() {
  const y = $("year");
  if (y) y.textContent = new Date().getFullYear();

  // Theme 초기값
  const savedTheme = localStorage.getItem("korual_theme") || "dark";
  applyTheme(savedTheme);
  const themeBtn = $("toggleTheme");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      const current = localStorage.getItem("korual_theme") || "dark";
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next);
    });
  }

  // API 상태 체크
  pingApi();

  // Language
  applyI18n();
  ["langTop", "langAuth"].forEach(id => {
    const sel = $(id);
    if (!sel) return;
    sel.addEventListener("change", e => {
      LANG = e.target.value;
      localStorage.setItem("korual_lang", LANG);
      applyI18n();
    });
  });

  // Remember ID
  const savedId = localStorage.getItem("korual_login_id") || "";
  if (savedId && $("loginUsername")) {
    $("loginUsername").value = savedId;
    const rememberCheckbox = $("rememberId");
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }

  // Demo fill buttons
  const fillDemo = () => {
    if ($("loginUsername")) $("loginUsername").value = "KORUAL";
    if ($("loginPassword")) $("loginPassword").value = "GUEST";
    showToast("테스트 계정이 자동으로 입력되었습니다.", "info");
  };
  ["btnFillDemo", "btnFillDemoMobile"].forEach(id => {
    const btn = $(id);
    if (btn) btn.addEventListener("click", fillDemo);
  });

  // Tabs
  const loginPanel   = $("loginPanel");
  const signupPanel  = $("signupPanel");
  const tabLoginBtn  = $("tabLoginBtn");
  const tabSignupBtn = $("tabSignupBtn");

  const lastTab = localStorage.getItem("korual_auth_tab") || "login";

  function setTab(active) {
    if (!loginPanel || !signupPanel || !tabLoginBtn || !tabSignupBtn) return;

    if (active === "signup") {
      signupPanel.classList.remove("hidden");
      loginPanel.classList.add("hidden");
      tabSignupBtn.classList.add("tab-active");
      tabSignupBtn.classList.remove("tab-inactive");
      tabLoginBtn.classList.remove("tab-active");
      tabLoginBtn.classList.add("tab-inactive");
    } else {
      loginPanel.classList.remove("hidden");
      signupPanel.classList.add("hidden");
      tabLoginBtn.classList.add("tab-active");
      tabLoginBtn.classList.remove("tab-inactive");
      tabSignupBtn.classList.remove("tab-active");
      tabSignupBtn.classList.add("tab-inactive");
    }
    localStorage.setItem("korual_auth_tab", active);
  }

  if (tabLoginBtn && tabSignupBtn) {
    tabLoginBtn.addEventListener("click", () => setTab("login"));
    tabSignupBtn.addEventListener("click", () => setTab("signup"));
    setTab(lastTab);
  }

  // 비밀번호 보기 / Caps Lock
  const togglePwd      = $("togglePwd");
  const loginPassword  = $("loginPassword");
  const capsIndicator  = $("capsIndicator");

  if (togglePwd && loginPassword) {
    togglePwd.addEventListener("click", () => {
      if (loginPassword.type === "password") {
        loginPassword.type = "text";
        togglePwd.textContent = "🙈 숨기기";
      } else {
        loginPassword.type = "password";
        togglePwd.textContent = "👁 비밀번호 보기";
      }
    });
  }

  if (loginPassword && capsIndicator) {
    loginPassword.addEventListener("keyup", e => {
      const caps = e.getModifierState && e.getModifierState("CapsLock");
      capsIndicator.classList.toggle("hidden", !caps);
    });
  }

  /******** Signup ********/
  const btnSignup = $("btnSignup");
  let signingUp = false;

  if (btnSignup) {
    btnSignup.addEventListener("click", async () => {
      if (signingUp) return;
      signingUp = true;

      clearInputErrors();
      const payload = {
        full_name: $("suName")  ? $("suName").value.trim()  : "",
        email:     $("suEmail") ? $("suEmail").value.trim() : "",
        username:  $("suUser")  ? $("suUser").value.trim()  : "",
        password:  $("suPass")  ? $("suPass").value         : "",
        role:      "staff",
        created_by: "SELF"
      };

      let hasErr = false;
      if (!payload.username) {
        $("suUser")?.classList.add("input-error");
        hasErr = true;
      }
      if (!payload.password || payload.password.length < 6) {
        $("suPass")?.classList.add("input-error");
        hasErr = true;
      }
      if (!isValidEmail(payload.email)) {
        $("suEmail")?.classList.add("input-error");
        hasErr = true;
      }
      if (hasErr) {
        if ($("signupMsg")) $("signupMsg").textContent = I18N[LANG].need_id_pw;
        showToast(I18N[LANG].need_id_pw, "error");
        signingUp = false;
        return;
      }

      if ($("signupMsg")) $("signupMsg").textContent = I18N[LANG].loading_signup;
      setOverlayVisible(true);
      btnSignup.disabled = true;

      try {
        await apiSignup(payload);
        if ($("signupMsg")) $("signupMsg").textContent = I18N[LANG].signup_done;
        showToast(I18N[LANG].signup_done, "success");
        setTab("login");
        if ($("loginUsername")) $("loginUsername").value = payload.username;
      } catch (e) {
        const msg = e.message || I18N[LANG].user_exists || I18N[LANG].server_error;
        if ($("signupMsg")) $("signupMsg").textContent = msg;
        showToast(msg, "error");
      } finally {
        signingUp = false;
        setOverlayVisible(false);
        btnSignup.disabled = false;
      }
    });
  }

  /******** Login ********/
  const btnLogin = $("btnLogin");
  let loggingIn = false;

  async function handleLogin() {
    if (loggingIn) return;
    loggingIn = true;

    clearInputErrors();
    const username = $("loginUsername") ? $("loginUsername").value.trim() : "";
    const password = $("loginPassword") ? $("loginPassword").value : "";

    if (!username || !password) {
      if ($("loginMsg")) $("loginMsg").textContent = I18N[LANG].need_id_pw;
      if (!username) $("loginUsername")?.classList.add("input-error");
      if (!password) $("loginPassword")?.classList.add("input-error");
      showToast(I18N[LANG].need_id_pw, "error");
      loggingIn = false;
      return;
    }

    if ($("loginMsg")) $("loginMsg").textContent = "";
    if (btnLogin) {
      btnLogin.disabled = true;
      btnLogin.textContent = I18N[LANG].loading_login;
    }
    setOverlayVisible(true);

    // remember ID
    const remember = $("rememberId")?.checked;
    if (remember) localStorage.setItem("korual_login_id", username);
    else localStorage.removeItem("korual_login_id");

    try {
      const data = await apiLogin(username, password);
      const u = data.user || {};
      const fullName =
        u.full_name ||
        data.full_name ||
        username;

      // localStorage 세션 저장
      localStorage.setItem(
        "korual_user",
        JSON.stringify({
          username:   u.username || username,
          full_name:  fullName,
          email:      u.email || "",
          role:       u.role || "staff",
          last_login: u.last_login || "",
          logged_at:  new Date().toISOString()
        })
      );

      showToast(`어서오세요, ${fullName}님. Control Center로 이동합니다.`, "success");
      setTimeout(() => { window.location.href = DASHBOARD_URL; }, 600);
    } catch (e) {
      const msg = e.message || I18N[LANG].login_failed || I18N[LANG].server_error;
      if ($("loginMsg")) $("loginMsg").textContent = msg;
      showToast(msg, "error");
    } finally {
      loggingIn = false;
      if (btnLogin) {
        btnLogin.disabled = false;
        btnLogin.textContent = I18N[LANG].login_btn;
      }
      setOverlayVisible(false);
    }
  }

  if (btnLogin) btnLogin.addEventListener("click", handleLogin);
  ["loginUsername", "loginPassword"].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("keydown", e => {
      if (e.key === "Enter") handleLogin();
    });
  });

  /******** ID / PW 찾기 모달 ********/
  const modalFind   = $("modalFindId");
  const modalReset  = $("modalResetPw");
  const linkFind    = $("linkFindId");
  const linkReset   = $("linkResetPw");
  const closeFind   = $("closeFind");
  const closeReset  = $("closeReset");
  const fiEmail     = $("fiEmail");
  const fiResult    = $("fiResult");
  const fiSubmit    = $("btnFindIdSubmit");
  const rpUser      = $("rpUser");
  const rpEmail     = $("rpEmail");
  const rpNewPw     = $("rpNewPw");
  const rpMsg       = $("rpMsg");
  const rpSubmit    = $("btnResetPwSubmit");

  if (linkFind && modalFind) {
    linkFind.addEventListener("click", () => {
      if (fiEmail) fiEmail.value = "";
      if (fiResult) fiResult.textContent = "";
      openModal(modalFind);
    });
  }

  if (linkReset && modalReset) {
    linkReset.addEventListener("click", () => {
      if (rpUser)  rpUser.value = "";
      if (rpEmail) rpEmail.value = "";
      if (rpNewPw) rpNewPw.value = "";
      if (rpMsg)   rpMsg.textContent = "";
      openModal(modalReset);
    });
  }

  if (closeFind && modalFind) {
    closeFind.addEventListener("click", () => closeModal(modalFind));
  }
  if (closeReset && modalReset) {
    closeReset.addEventListener("click", () => closeModal(modalReset));
  }

  // ESC로 모달 닫기
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (modalFind)  closeModal(modalFind);
      if (modalReset) closeModal(modalReset);
    }
  });

  // 아이디 찾기 제출
  if (fiSubmit && fiEmail && fiResult) {
    fiSubmit.addEventListener("click", async () => {
      clearInputErrors();
      const email = fiEmail.value.trim();
      if (!email || !isValidEmail(email)) {
        fiEmail.classList.add("input-error");
        fiResult.textContent = I18N[LANG].need_email;
        showToast(I18N[LANG].need_email, "error");
        return;
      }
      fiResult.textContent = I18N[LANG].loading_search;
      try {
        const res = await apiFindId(email);
        if (!res.ok) {
          fiResult.textContent = res.message || I18N[LANG].find_id_empty;
          showToast(res.message || I18N[LANG].find_id_empty, "error");
          return;
        }
        const ids = res.ids || [];
        if (!ids.length) {
          fiResult.textContent = I18N[LANG].find_id_empty;
          showToast(I18N[LANG].find_id_empty, "info");
        } else {
          fiResult.textContent = `${I18N[LANG].find_id_success_prefix} ${ids.join(", ")}`;
          showToast(I18N[LANG].find_id_success_prefix, "success");
        }
      } catch (err) {
        fiResult.textContent = I18N[LANG].find_id_empty;
        showToast(I18N[LANG].server_error, "error");
      }
    });
  }

  // 비밀번호 재설정 제출
  if (rpSubmit && rpUser && rpEmail && rpNewPw && rpMsg) {
    rpSubmit.addEventListener("click", async () => {
      clearInputErrors();
      const username    = rpUser.value.trim();
      const email       = rpEmail.value.trim();
      const newPassword = rpNewPw.value;

      if (!username || !email || !newPassword) {
        if (!username) rpUser.classList.add("input-error");
        if (!email)    rpEmail.classList.add("input-error");
        if (!newPassword) rpNewPw.classList.add("input-error");
        rpMsg.textContent = I18N[LANG].need_reset_fields;
        showToast(I18N[LANG].need_reset_fields, "error");
        return;
      }

      if (newPassword.length < 6) {
        rpNewPw.classList.add("input-error");
        rpMsg.textContent = I18N[LANG].pw_too_short;
        showToast(I18N[LANG].pw_too_short, "error");
        return;
      }

      rpMsg.textContent = "Updating...";
      try {
        const res = await apiResetPw({ username, email, new_password: newPassword });
        if (!res.ok) {
          const msg = res.message || I18N[LANG].reset_pw_failed;
          rpMsg.textContent = msg;
          showToast(msg, "error");
          return;
        }
        rpMsg.textContent = I18N[LANG].reset_pw_success;
        showToast(I18N[LANG].reset_pw_success, "success");
        setTimeout(() => {
          if (modalReset) closeModal(modalReset);
        }, 800);
      } catch (err) {
        const msg = I18N[LANG].reset_pw_failed;
        rpMsg.textContent = msg;
        showToast(I18N[LANG].server_error, "error");
      }
    });
  }
})();
