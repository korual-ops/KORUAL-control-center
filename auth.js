// auth.js – index.html 전용 (PW_HASH 로그인)
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

  function showMsg(text, isError = true) {
    if (!msgEl) return;
    msgEl.textContent = text || "";
    msgEl.style.color = isError ? "#fca5a5" : "#4ade80";
  }

  async function sha256Hex(text) {
    const enc = new TextEncoder();
    const data = enc.encode(text);
    const digest = await crypto.subtle.digest("SHA-256", data);
    const bytes = Array.from(new Uint8Array(digest));
    return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function handleLogin() {
    const username = (inputUser.value || "").trim();
    const password = (inputPass.value || "").trim();

    showMsg("");

    if (!username || !password) {
      showMsg("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }
    if (!API_BASE) {
      showMsg("API BASE URL이 설정되지 않았습니다.");
      return;
    }
    if (!window.crypto?.subtle) {
      showMsg("이 브라우저에서는 해시 로그인이 지원되지 않습니다. (crypto.subtle 없음)");
      return;
    }

    setLoading(true);
    try {
      const pw_hash = await sha256Hex(password);

      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          target: "login",
          username,
          pw_hash,              // 핵심: PASSWORD가 아니라 pw_hash
          secret: API_SECRET
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        showMsg(data?.message || "로그인에 실패했습니다. 다시 시도해주세요.");
        return;
      }

      const user = data.user || { username };
      localStorage.setItem("korual_user", JSON.stringify(user));
      location.href = "dashboard.html";
    } catch (err) {
      console.error(err);
      showMsg("네트워크 오류가 발생했습니다.");
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

  // (선택) 데모 자동 입력
  const demoBtn = document.getElementById("btnFillDemo");
  if (demoBtn) {
    demoBtn.addEventListener("click", () => {
      inputUser.value = "KORUAL";
      inputPass.value = "GUEST";
      inputPass.focus();
    });
  }
})();
