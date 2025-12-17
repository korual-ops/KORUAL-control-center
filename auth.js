// auth.js – index.html 전용 (PW_HASH 로그인 + CORS preflight 회피)
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
  const fillDemoBtn = $("#btnFillDemo");

  if (!loginBtn || !inputUser || !inputPass) return;

  function setLoading(isLoading) {
    loginBtn.disabled = isLoading;
    loginBtn.style.opacity = isLoading ? "0.7" : "1";
  }

  // SHA-256(hex) → PW_HASH 생성
  async function sha256Hex(str) {
    const enc = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    const arr = Array.from(new Uint8Array(buf));
    return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

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
      const pwHash = await sha256Hex(password);

      // 중요: preflight를 피하려고 Content-Type을 text/plain으로 보냄
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          target: "login",
          username,
          pwHash,          // ✅ PW_HASH로 로그인
          secret: API_SECRET
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        msgEl.textContent =
          data && data.message ? data.message : "로그인에 실패했습니다.";
        return;
      }

      const user = data.user || { username };
      localStorage.setItem("korual_user", JSON.stringify(user));
      location.href = "dashboard.html";
    } catch (err) {
      console.error(err);
      // 여기서 뜨던 “네트워크 오류”는 보통 CORS/preflight 문제였음
      msgEl.textContent = "네트워크/CORS 오류가 발생했습니다. (API 배포/요청방식 확인)";
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

  if (fillDemoBtn) {
    fillDemoBtn.addEventListener("click", () => {
      inputUser.value = "KORUAL";
      inputPass.value = "GUEST";
      inputPass.focus();
    });
  }
})();
