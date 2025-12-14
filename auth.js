// auth.js – index.html 전용 (PW_HASH 로그인 처리)
(function () {
  "use strict";

  const META = window.KORUAL_META_APP || {};
  const API_BASE = META.api?.baseUrl || "";
  const API_SECRET = META.api?.secret || "";

  const $ = (sel) => document.querySelector(sel);

  const loginBtn = $("#btnLogin");
  const inputUser = $("#loginUsername");
  const inputPass = $("#loginPassword");
  const msgEl = $("#loginMsg");

  if (!loginBtn || !inputUser || !inputPass) return;

  function setLoading(isLoading) {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.toggle("hidden", !isLoading);
    loginBtn.disabled = isLoading;
  }

  async function handleLogin() {
    const username = (inputUser.value || "").trim();
    const password = (inputPass.value || "").trim();
    const ua = navigator.userAgent || "";

    if (msgEl) msgEl.textContent = "";

    if (!username || !password) {
      if (msgEl) msgEl.textContent = "아이디와 비밀번호를 모두 입력해주세요.";
      return;
    }

    if (!API_BASE) {
      if (msgEl) msgEl.textContent = "API BASE URL이 설정되지 않았습니다.";
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
          password,        // 평문 전송 (서버에서 SHA-256 처리 -> PW_HASH 비교)
          secret: API_SECRET,
          ua,              // 서버가 LAST_UA / LOGS 기록에 사용
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        if (msgEl) msgEl.textContent = data.message || "로그인에 실패했습니다. 다시 시도해주세요.";
        return;
      }

      const user = data.user || { username };
      localStorage.setItem("korual_user", JSON.stringify(user));
      location.href = "dashboard.html";
    } catch (err) {
      console.error(err);
      if (msgEl) msgEl.textContent = "네트워크 오류가 발생했습니다.";
    } finally {
      setLoading(false);
    }
  }

  loginBtn.addEventListener("click", handleLogin);

  [inputUser, inputPass].forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLogin();
    });
  });
})();
