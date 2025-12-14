// auth.js – index.html 전용 (PW_HASH 로그인)
(function () {
  "use strict";

  const META = window.KORUAL_META_APP || {};
  const API_BASE   = META.api?.baseUrl || "";
  const API_SECRET = META.api?.secret || "";

  const $ = (sel) => document.querySelector(sel);

  const loginBtn  = $("#btnLogin");
  const inputUser = $("#loginUsername");
  const inputPass = $("#loginPassword");
  const msgEl     = $("#loginMsg");

  if (!loginBtn || !inputUser || !inputPass) return;

  async function sha256Hex(text) {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest("SHA-256", enc.encode(text));
    const arr = Array.from(new Uint8Array(buf));
    return arr.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function setMsg(msg) {
    if (msgEl) msgEl.textContent = msg || "";
  }

  async function handleLogin() {
    const username = (inputUser.value || "").trim();
    const password = (inputPass.value || "").trim(); // 전송하지 않음(해시만 전송)

    setMsg("");

    if (!username || !password) {
      setMsg("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }
    if (!API_BASE) {
      setMsg("API BASE URL이 설정되지 않았습니다.");
      return;
    }

    loginBtn.disabled = true;
    try {
      const pw_hash = await sha256Hex(password);

      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          target: "login",
          username,
          pw_hash,
          secret: API_SECRET
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setMsg(data.message || "로그인에 실패했습니다.");
        return;
      }

      localStorage.setItem("korual_user", JSON.stringify(data.user || { username }));
      location.href = "dashboard.html";
    } catch (err) {
      console.error(err);
      setMsg("네트워크 오류가 발생했습니다.");
    } finally {
      loginBtn.disabled = false;
    }
  }

  loginBtn.addEventListener("click", handleLogin);
  [inputUser, inputPass].forEach((el) => {
    el.addEventListener("keydown", (e) => { if (e.key === "Enter") handleLogin(); });
  });
})();
