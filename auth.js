// auth.js – index.html 전용 (PW_HASH 기반 로그인)
// - password(평문)를 서버로 전송
// - 서버(code.gs)가 SHA-256 → STAFF.PW_HASH와 비교
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
  const fillDemo  = $("#btnFillDemo");

  if (!loginBtn || !inputUser || !inputPass) return;

  function setMsg(text) {
    if (msgEl) msgEl.textContent = text || "";
  }

  function setLoading(isLoading) {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.toggle("hidden", !isLoading);
    loginBtn.disabled = !!isLoading;
  }

  async function handleLogin() {
    const username = (inputUser.value || "").trim();
    const password = (inputPass.value || "").trim();

    setMsg("");

    if (!username || !password) {
      setMsg("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }
    if (!API_BASE) {
      setMsg("API BASE URL이 설정되지 않았습니다.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Vercel/브라우저 환경에서 안정적으로 동작하도록 기본값 유지
        body: JSON.stringify({
          target: "login",
          username,
          password,
          secret: API_SECRET,
        }),
      });

      // Apps Script가 302/HTML을 주는 케이스 대비
      const text = await res.text();
      let data = {};
      try { data = JSON.parse(text); } catch (_) { data = {}; }

      if (!res.ok || !data.ok) {
        setMsg(data?.message || "로그인에 실패했습니다. 다시 시도해주세요.");
        return;
      }

      const user = data.user || { username };
      localStorage.setItem("korual_user", JSON.stringify(user));
      location.href = "dashboard.html";
    } catch (err) {
      console.error(err);
      setMsg("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // 버튼 클릭
  loginBtn.addEventListener("click", handleLogin);

  // 엔터키 로그인
  [inputUser, inputPass].forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLogin();
    });
  });

  // 데모 자동 입력 (index.html에 btnFillDemo가 있을 때만)
  if (fillDemo) {
    fillDemo.addEventListener("click", () => {
      inputUser.value = "KORUAL";
      inputPass.value = "GUEST";
      inputUser.focus();
      setMsg("");
    });
  }
})();
