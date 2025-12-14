// auth.js – PW_HASH 기반 로그인
(function () {
  "use strict";

  const META = window.KORUAL_META_APP || {};
  const API_BASE   = META.api?.baseUrl || "";
  const API_SECRET = META.api?.secret || "";

  const $ = (s) => document.querySelector(s);

  const btnLogin = $("#btnLogin");
  const inputUser = $("#loginUsername");
  const inputPass = $("#loginPassword");
  const msgEl = $("#loginMsg");

  if (!btnLogin) return;

  // 🔐 SHA-256 해시 함수
  async function sha256(text) {
    const enc = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async function handleLogin() {
    const username = inputUser.value.trim();
    const password = inputPass.value.trim();

    msgEl.textContent = "";

    if (!username || !password) {
      msgEl.textContent = "아이디와 비밀번호를 입력해주세요.";
      return;
    }

    try {
      btnLogin.disabled = true;

      const pw_hash = await sha256(password); // 🔑 핵심

      const res = await fetch(API_BASE, {
        method: "POST",
        body: JSON.stringify({
          target: "login",
          username,
          pw_hash,           // 🔑 PASSWORD ❌ → PW_HASH ✅
          secret: API_SECRET
        })
      });

      const data = await res.json();

      if (!data.ok) {
        msgEl.textContent = data.message || "로그인 실패";
        return;
      }

      localStorage.setItem("korual_user", JSON.stringify(data.user));
      location.href = "dashboard.html";

    } catch (err) {
      console.error(err);
      msgEl.textContent = "네트워크 오류가 발생했습니다.";
    } finally {
      btnLogin.disabled = false;
    }
  }

  btnLogin.addEventListener("click", handleLogin);
  inputPass.addEventListener("keydown", e => {
    if (e.key === "Enter") handleLogin();
  });

})();
