// meta.app
(function () {
  "use strict";

  window.KORUAL_META_APP = {
    app: {
      id: "korual-ops",
      name: "KORUAL Control Center",
      version: "v2.0-abplusc",
      env: "prod",
    },
    auth: {
      storageKey: "korual_user",
    },
    api: {
      // 브라우저는 GAS를 직접 치지 말고, Vercel/Next 프록시를 치게 만든다 (CORS 제거)
      baseUrl: "/api/korual",
      // 프록시가 넘겨줄 GAS 원본 URL (서버에서만 사용)
      gasUrl:
        "https://script.google.com/macros/s/AKfycby2FlBu4YXEpeGUAvtXWTbYCi4BNGHNl7GCsaQtsCHuvGXYMELveOkoctEAepFg2F_0/exec",
      secret: "KORUAL-ONLY",
      timeoutMs: 15000,
    },
    ui: {
      defaultTheme: "dark",
      defaultLang: "ko",
    },
  };
})();
