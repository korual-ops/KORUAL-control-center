// auth.js – LOGIN 전용 (PW_HASH 기반 로그인)
(function () {
  "use strict";

  const META = window.KORUAL_META_APP || {};
  const API_BASE   = META.api?.baseUrl || "";
  const API_SECRET = META.api?.secret || "";

  const $ = (sel) => document.querySelector(sel);

  const inputUser = $("#loginUsername");
  const inputPass = $("#loginPassword");
  const btnLogin  = $("#btnLogin");
  const msgEl     = $("#loginMsg");
  const overlay   = $("#loadingOverlay");
  const btnDemo   = $("#btnFillDemo");

  if (!inputUser || !inputPass || !btnLogin) return;

  /* =========================
     Utils
  ========================= */

  function setLoading(on) {
    if (overlay) overlay.classList.toggle("hidden", !on);
    btnLogin.disabled = on;
  }

  function setMsg(text) {
    if (msgEl) msgEl.textContent = text || "";
  }

  // SHA-256 → hex
  async function sha256Hex(str) {
    const enc = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /* =========================
     Login Handler
  ========================= */

  async function handleLogin() {
    const username = inputUser.value.trim();
    const password = inputPass.value;

    setMsg("");

    if (!username || !password) {
      setMsg("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }

    if (!API_BASE) {
      setMsg("API 주소가 설정되지 않았습니다.");
      return;
    }

    setLoading(true);

    try {
      // 🔐 브라우저에서 PW_HASH 생성
      const pwHash = await sha256Hex(password);

      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "login",
          username,
          pwHash,          // ✅ PW_HASH만 전송
          secret: API_SECRET
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setMsg(data.message || "로그인에 실패했습니다.");
        return;
      }

      // 로그인 성공
      const user = data.user || { username };
      localStorage.setItem("korual_user", JSON.stringify(user));
      location.replace("dashboard.html");

    } catch (err) {
      console.error(err);
      setMsg("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     Event Bind
  ========================= */

  btnLogin.addEventListener("click", handleLogin);

  [inputUser, inputPass].forEach(el => {
    el.addEventListener("keydown", e => {
      if (e.key === "Enter") handleLogin();
    });
  });

  // 데모 계정 자동 입력
  if (btnDemo) {
    btnDemo.addEventListener("click", () => {
      inputUser.value = "KORUAL";
      inputPass.value = "GUEST";
      inputPass.focus();
    });
  }

})();
