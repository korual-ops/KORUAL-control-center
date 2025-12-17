// auth.js (index.html 전용)
(function () {
  "use strict";

  const META = window.KORUAL_META_APP || {};
  const API_BASE = META.api?.baseUrl || "";
  const API_SECRET = META.api?.secret || "";
  const STORAGE_KEY = META.auth?.storageKey || "korual_user";

  const $ = (sel) => document.querySelector(sel);

  const loginBtn  = $("#btnLogin");
  const inputUser = $("#loginUsername");
  const inputPass = $("#loginPassword");
  const msgEl     = $("#loginMsg");
  const fillDemo  = $("#btnFillDemo");

  if (!loginBtn || !inputUser || !inputPass) return;

  function setMsg(text) {
    if (!msgEl) return;
    msgEl.textContent = text || "";
  }

  function setLoading(on) {
    loginBtn.disabled = !!on;
  }

  async function sha256Hex(text) {
    const enc = new TextEncoder();
    const data = enc.encode(text);
    const digest = await crypto.subtle.digest("SHA-256", data);
    const arr = Array.from(new Uint8Array(digest));
    return arr.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async function handleLogin() {
    const username = (inputUser.value || "").trim();
    const password = (inputPass.value || "").trim();
    setMsg("");

    if (!username || !password) return setMsg("아이디와 비밀번호를 모두 입력해주세요.");
    if (!API_BASE) return setMsg("API BASE URL이 설정되지 않았습니다.");

    setLoading(true);
    try {
      const pw_hash = await sha256Hex(password);

      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "login",
          username,
          pw_hash,
          secret: API_SECRET,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        return setMsg(data?.message || "로그인에 실패했습니다.");
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user || { username }));
      location.href = "dashboard.html";
    } catch (e) {
      console.error(e);
      setMsg("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  loginBtn.addEventListener("click", handleLogin);
  [inputUser, inputPass].forEach((el) => el.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleLogin();
  }));

  if (fillDemo) {
    fillDemo.addEventListener("click", () => {
      inputUser.value = "KORUAL";
      inputPass.value = "GUEST";
      inputUser.focus();
    });
  }
})();
