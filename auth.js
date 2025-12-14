// auth.js – index.html 전용 (로그인 처리 + 기본 UI 제어 + CORS(preflight) 회피)
(function () {
  "use strict";

  const META = window.KORUAL_META_APP || {};
  const API_BASE = (META.api && META.api.baseUrl) ? META.api.baseUrl : "";
  const API_SECRET = (META.api && META.api.secret) ? META.api.secret : "";

  const $ = (sel) => document.querySelector(sel);

  // ===== DOM =====
  const loginBtn = $("#btnLogin");
  const inputUser = $("#loginUsername");
  const inputPass = $("#loginPassword");
  const msgEl = $("#loginMsg");

  const overlay = $("#loadingOverlay");
  const togglePwdBtn = $("#togglePwd");
  const capsIndicator = $("#capsIndicator");

  // 데모 자동 채우기
  const btnFillDemo = $("#btnFillDemo");
  const btnFillDemoMobile = $("#btnFillDemoMobile");

  // 페이지가 로그인 화면이 아니면 종료
  if (!loginBtn || !inputUser || !inputPass || !msgEl) return;

  // ===== UI helpers =====
  function setLoading(isLoading) {
    if (overlay) overlay.classList.toggle("hidden", !isLoading);
    loginBtn.disabled = !!isLoading;
  }

  function setMsg(text, kind) {
    // kind: "error" | "ok" | ""
    msgEl.textContent = text || "";
    msgEl.classList.remove("text-rose-400", "text-emerald-300", "text-slate-300");
    if (kind === "ok") msgEl.classList.add("text-emerald-300");
    else if (kind === "error") msgEl.classList.add("text-rose-400");
    else msgEl.classList.add("text-slate-300");
  }

  function markError(el, on) {
    if (!el) return;
    el.classList.toggle("input-error", !!on);
  }

  // CapsLock 표시
  function updateCapsLock(e) {
    if (!capsIndicator) return;
    const on = e && typeof e.getModifierState === "function" && e.getModifierState("CapsLock");
    capsIndicator.classList.toggle("hidden", !on);
  }

  // 비밀번호 보기/숨기기
  if (togglePwdBtn) {
    togglePwdBtn.addEventListener("click", () => {
      const isPw = inputPass.type === "password";
      inputPass.type = isPw ? "text" : "password";
      togglePwdBtn.textContent = isPw ? "🙈 비밀번호 숨기기" : "👁 비밀번호 보기";
    });
  }

  // 데모 계정 자동 입력
  function fillDemo() {
    inputUser.value = "KORUAL";
    inputPass.value = "GUEST";
    inputUser.focus();
  }
  if (btnFillDemo) btnFillDemo.addEventListener("click", fillDemo);
  if (btnFillDemoMobile) btnFillDemoMobile.addEventListener("click", fillDemo);

  // CapsLock 감지
  inputPass.addEventListener("keydown", updateCapsLock);
  inputPass.addEventListener("keyup", updateCapsLock);

  // ===== Core: Login =====
  async function handleLogin() {
    const username = (inputUser.value || "").trim();
    const password = (inputPass.value || "").trim();

    setMsg("", "");
    markError(inputUser, false);
    markError(inputPass, false);

    if (!username || !password) {
      if (!username) markError(inputUser, true);
      if (!password) markError(inputPass, true);
      setMsg("아이디와 비밀번호를 모두 입력해주세요.", "error");
      return;
    }

    if (!API_BASE) {
      setMsg("API BASE URL이 설정되지 않았습니다. (KORUAL_META_APP.api.baseUrl)", "error");
      return;
    }

    setLoading(true);

    try {
      // 핵심: preflight(OPTIONS) 최소화를 위해 JSON을 text/plain으로 전송
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify({
          target: "login",
          username,
          password,
          secret: API_SECRET
        })
      });

      // Apps Script가 에러 HTML을 줄 때도 있어 안전 파싱
      const rawText = await res.text();
      let data = {};
      try {
        data = JSON.parse(rawText);
      } catch (_) {
        data = {};
      }

      if (!res.ok || !data.ok) {
        const msg =
          (data && data.message) ||
          (rawText && rawText.slice(0, 140)) ||
          "로그인에 실패했습니다. 다시 시도해주세요.";
        setMsg(msg, "error");
        return;
      }

      const user = data.user || { username };
      localStorage.setItem("korual_user", JSON.stringify(user));
      setMsg("로그인 성공. 대시보드로 이동합니다…", "ok");
      location.href = "dashboard.html";
    } catch (err) {
      console.error(err);
      // 여기서 뜨는 "네트워크 오류"는 대개 CORS/preflight/배포권한 문제
      setMsg("네트워크 오류가 발생했습니다. (CORS/배포 설정 확인)", "error");
    } finally {
      setLoading(false);
    }
  }

  // 클릭 로그인
  loginBtn.addEventListener("click", handleLogin);

  // 엔터 로그인
  [inputUser, inputPass].forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLogin();
    });
  });
})();
