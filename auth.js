// auth.js – index.html 전용 (로그인 처리 + 기본 UI 제어)
(function () {
  "use strict";

  // ============================
  // 0) META 설정
  // ============================
  const META = window.KORUAL_META_APP || {};
  const API_BASE   = META.api?.baseUrl || "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec";
  const API_SECRET = META.api?.secret || "KORUAL-ONLY";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ============================
  // 1) 요소 참조
  // ============================
  const loginBtn   = $("#btnLogin");
  const inputUser  = $("#loginUsername");
  const inputPass  = $("#loginPassword");
  const msgEl      = $("#loginMsg");
  const togglePwd  = $("#togglePwd");
  const capsIndicator = $("#capsIndicator");

  if (!loginBtn || !inputUser || !inputPass) return; // 로그인 페이지가 아닐 때

  // ============================
  // 2) 로딩 제어
  // ============================
  function setLoading(isLoading) {
    const overlay = $("#loadingOverlay");
    if (overlay) overlay.classList.toggle("hidden", !isLoading);
    loginBtn.disabled = isLoading;
  }

  // ============================
  // 3) 로그인 처리
  // ============================
  async function handleLogin() {
    const username = (inputUser.value || "").trim();
    const password = (inputPass.value || "").trim();

    msgEl.textContent = "";

    if (!username || !password) {
      msgEl.textContent = "아이디와 비밀번호를 모두 입력해주세요.";
      return;
    }

    if (!API_BASE) {
      msgEl.textContent = "API BASE URL이 설정되지 않았습니다.";
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "login",
          username,
          password,
          secret: API_SECRET
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        msgEl.textContent =
          data?.message || "로그인에 실패했습니다. 다시 시도해주세요.";
        return;
      }

      // 로그인 성공 → localStorage 저장 후 dashboard로 이동
      const user = data.user || { username };
      localStorage.setItem("korual_user", JSON.stringify(user));
      location.href = "dashboard.html";

    } catch (err) {
      console.error("LOGIN ERROR:", err);
      msgEl.textContent = "네트워크 오류가 발생했습니다.";
    } finally {
      setLoading(false);
    }
  }

  // ============================
  // 4) 이벤트 바인딩
  // ============================
  loginBtn.addEventListener("click", handleLogin);

  [inputUser, inputPass].forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLogin();
    });
  });

  // ============================
  // 5) 비밀번호 보기
  // ============================
  if (togglePwd) {
    togglePwd.addEventListener("click", () => {
      const isPw = inputPass.type === "password";
      inputPass.type = isPw ? "text" : "password";
      togglePwd.textContent = isPw ? "🙈 숨기기" : "👁 비밀번호 보기";
    });
  }

  // ============================
  // 6) Caps Lock 감지
  // ============================
  inputPass.addEventListener("keyup", (e) => {
    capsIndicator.classList.toggle("hidden", !e.getModifierState("CapsLock"));
  });

  // ============================
  // 7) 데모 계정 자동 입력
  // ============================
  const fillBtns = ["#btnFillDemo", "#btnFillDemoMobile"];
  fillBtns.forEach((id) => {
    const btn = $(id);
    if (btn) {
      btn.addEventListener("click", () => {
        inputUser.value = "KORUAL";
        inputPass.value = "GUEST";
      });
    }
  });

  // ============================
  // 8) 탭 전환 (로그인 / 회원가입)
  // ============================
  const tabLoginBtn  = $("#tabLoginBtn");
  const tabSignupBtn = $("#tabSignupBtn");
  const loginPanel   = $("#loginPanel");
  const signupPanel  = $("#signupPanel");

  function activateLoginTab() {
    tabLoginBtn.classList.add("tab-active");
    tabSignupBtn.classList.remove("tab-active");
    loginPanel.classList.remove("hidden");
    signupPanel.classList.add("hidden");
  }

  function activateSignupTab() {
    tabSignupBtn.classList.add("tab-active");
    tabLoginBtn.classList.remove("tab-active");
    signupPanel.classList.remove("hidden");
    loginPanel.classList.add("hidden");
  }

  if (tabLoginBtn && tabSignupBtn) {
    tabLoginBtn.addEventListener("click", activateLoginTab);
    tabSignupBtn.addEventListener("click", activateSignupTab);
  }

  // ============================
  // 9) 현재 연도 표시
  // ============================
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

})();



