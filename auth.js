// auth.js – index.html 전용 (PW_HASH 기반 로그인)
// 요구사항: PASSWORD 평문 비교 금지, STAFF 시트의 PW_HASH(sha256 hex)로만 인증
// 프론트에서는 "입력 비밀번호"를 sha256(hex)로 해시해 전송합니다.
//
// 기대 백엔드(권장):
// POST { target:"login", username, pw_hash, secret }
// (또는 password를 보내지 않고 pw_hash만 보냄)
//
// 주의: Web Crypto는 HTTPS(또는 localhost)에서만 동작합니다.

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
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.toggle("hidden", !isLoading);
    loginBtn.disabled = isLoading;
  }

  function setError(msg) {
    if (msgEl) msgEl.textContent = msg || "";
  }

  function normalizeUsername(u) {
    return (u || "").trim();
  }

  function normalizePassword(p) {
    return (p || "").trim();
  }

  // ---------- SHA-256 (hex) ----------
  async function sha256Hex(str) {
    // Web Crypto
    if (window.crypto && window.crypto.subtle) {
      const enc = new TextEncoder();
      const data = enc.encode(str);
      const hashBuf = await crypto.subtle.digest("SHA-256", data);
      const hashArr = Array.from(new Uint8Array(hashBuf));
      return hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    // 매우 구형 브라우저 대응이 필요하면 외부 라이브러리 사용 권장
    throw new Error("이 브라우저는 SHA-256(Web Crypto)을 지원하지 않습니다.");
  }

  // ---------- Login ----------
  async function handleLogin() {
    const username = normalizeUsername(inputUser.value);
    const password = normalizePassword(inputPass.value);

    setError("");

    if (!username || !password) {
      setError("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }
    if (!API_BASE) {
      setError("API BASE URL이 설정되지 않았습니다.");
      return;
    }

    setLoading(true);
    try {
      // 1) 입력 비밀번호를 해시로 변환
      const pw_hash = await sha256Hex(password);

      // 2) 해시만 서버로 전송
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          target: "login",
          username,
          pw_hash,
          secret: API_SECRET,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setError((data && data.message) || "로그인에 실패했습니다. 다시 시도해주세요.");
        return;
      }

      // 3) 성공 → localStorage 저장 후 dashboard로 이동
      const user = data.user || { username };
      localStorage.setItem("korual_user", JSON.stringify(user));
      location.href = "dashboard.html";
    } catch (err) {
      console.error(err);
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // 버튼 클릭
  loginBtn.addEventListener("click", handleLogin);

  // 엔터키로도 로그인
  [inputUser, inputPass].forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLogin();
    });
  });

  // 데모 자동 입력
  if (fillDemoBtn) {
    fillDemoBtn.addEventListener("click", () => {
      inputUser.value = "KORUAL";
      inputPass.value = "GUEST";
      inputUser.focus();
    });
  }
})();
