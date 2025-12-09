// auth.js – index.html 전용 (로그인 처리)
(function () {
  "use strict";

  const META = window.KORUAL_META_APP || {};
  const API_BASE   = META.api?.baseUrl || "";
  const API_SECRET = META.api?.secret || "";

  const $ = (sel) => document.querySelector(sel);

  const loginBtn   = $("#btnLogin");
  const inputUser  = $("#loginUsername");
  const inputPass  = $("#loginPassword");
  const msgEl      = $("#loginMsg");

  if (!loginBtn || !inputUser || !inputPass) {
    // 로그인 페이지가 아닐 때는 그냥 종료
    return;
  }

  function setLoading(isLoading) {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) {
      overlay.classList.toggle("hidden", !isLoading);
    }
    loginBtn.disabled = isLoading;
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
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
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
          data && data.message
            ? data.message
            : "로그인에 실패했습니다. 다시 시도해주세요.";
        return;
      }

      // 로그인 성공 → localStorage 저장 후 dashboard로 이동
      const user = data.user || { username };
      localStorage.setItem("korual_user", JSON.stringify(user));
      location.href = "dashboard.html";
    } catch (err) {
      console.error(err);
      msgEl.textContent = "네트워크 오류가 발생했습니다.";
    } finally {
      setLoading(false);
    }
  }

  // 버튼 클릭
  loginBtn.addEventListener("click", handleLogin);

  // 엔터키로도 로그인
  [inputUser, inputPass].forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        handleLogin();
      }
    });
  });
})();
