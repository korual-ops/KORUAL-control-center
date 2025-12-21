// auth.js
// KORUAL Control Center - Auth Client Helper
// - Frontend(브라우저) 전용 유틸
// - CORS 방지: 반드시 동일 오리진 프록시(/api/korual/...)로 호출
//   POST /api/korual/login
//   GET  /api/korual/whoami?token=...
//   GET  /api/korual/ping (선택)

export const AUTH = {
  TOKEN_KEY: "korual_token",
  USER_KEY: "korual_user",

  endpoints: {
    login: "/api/korual/login",
    whoami: "/api/korual/whoami",
    ping: "/api/korual/ping",
  },

  getToken() {
    try {
      return localStorage.getItem(this.TOKEN_KEY) || "";
    } catch {
      return "";
    }
  },

  getUser() {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setSession({ token, user }) {
    try {
      if (token) localStorage.setItem(this.TOKEN_KEY, String(token));
      if (user) localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
  },

  clearSession() {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    } catch {
      // ignore
    }
  },

  isLoggedIn() {
    const t = this.getToken();
    const u = this.getUser();
    return !!(t && u && u.username);
  },

  async ping() {
    const r = await fetch(this.endpoints.ping, { method: "GET" });
    const data = await r.json().catch(() => ({}));
    return { ok: !!data.ok, data, status: r.status };
  },

  async login(username, password) {
    const payload = {
      username: String(username || "").trim(),
      password: String(password || ""),
    };

    if (!payload.username || !payload.password) {
      return { ok: false, error: "MISSING_CREDENTIALS" };
    }

    const r = await fetch(this.endpoints.login, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await r.json().catch(() => ({}));

    if (!data || !data.ok) {
      return {
        ok: false,
        error: data?.error || "LOGIN_FAILED",
        failCount: data?.failCount,
        lockedUntil: data?.lockedUntil,
        status: r.status,
        data,
      };
    }

    this.setSession({ token: data.token, user: data.user });

    return {
      ok: true,
      token: data.token,
      user: data.user,
      status: r.status,
      data,
    };
  },

  async whoami(token) {
    const t = token || this.getToken();
    if (!t) return { ok: false, error: "NO_TOKEN" };

    const url =
      this.endpoints.whoami + "?token=" + encodeURIComponent(String(t));

    const r = await fetch(url, { method: "GET" });
    const data = await r.json().catch(() => ({}));

    if (!data || !data.ok) {
      return {
        ok: false,
        error: data?.error || "WHOAMI_FAILED",
        status: r.status,
        data,
      };
    }

    // 서버 응답으로 user 동기화
    if (data.user) {
      this.setSession({ token: t, user: data.user });
    }

    return { ok: true, user: data.user, status: r.status, data };
  },

  // 라우트 가드(순수 JS)
  // - 유효 토큰 확인까지 수행(권장)
  // - 실패 시 redirect
  async requireAuth({ redirectTo = "/", role } = {}) {
    const token = this.getToken();
    const cached = this.getUser();

    if (!token || !cached) {
      this.clearSession();
      if (redirectTo) location.replace(redirectTo);
      return { ok: false, error: "NO_SESSION" };
    }

    const w = await this.whoami(token);
    if (!w.ok) {
      this.clearSession();
      if (redirectTo) location.replace(redirectTo);
      return { ok: false, error: w.error };
    }

    if (role) {
      const userRole = String(w.user?.role || "").toUpperCase();
      const needRole = String(role).toUpperCase();
      if (userRole !== needRole) {
        if (redirectTo) location.replace(redirectTo);
        return { ok: false, error: "FORBIDDEN", user: w.user };
      }
    }

    return { ok: true, user: w.user };
  },

  logout(redirectTo = "/") {
    this.clearSession();
    if (redirectTo) location.replace(redirectTo);
  },

  // 에러 메시지 표준화 (UI 표시용)
  formatError(result) {
    const err = String(result?.error || "ERROR");
    if (err === "MISSING_CREDENTIALS") return "아이디/비밀번호를 입력하세요.";
    if (err === "INVALID_PASSWORD") return "비밀번호가 올바르지 않습니다.";
    if (err === "INVALID_CREDENTIALS") return "계정 정보가 올바르지 않습니다.";
    if (err === "ACCOUNT_LOCKED") {
      const until = result?.lockedUntil ? ` (해제: ${result.lockedUntil})` : "";
      return "계정이 잠겼습니다." + until;
    }
    if (err === "ACCOUNT_INACTIVE") return "비활성화된 계정입니다.";
    if (err === "TOKEN_EXPIRED") return "세션이 만료되었습니다. 다시 로그인하세요.";
    if (err === "TOKEN_REVOKED") return "세션이 해제되었습니다. 다시 로그인하세요.";
    if (err === "FORBIDDEN") return "권한이 없습니다.";
    return "요청 처리 중 오류가 발생했습니다: " + err;
  },
};

export default AUTH;
