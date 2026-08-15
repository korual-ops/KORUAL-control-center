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
      // 브라우저에는 동일 오리진 프록시 주소만 공개한다.
      // GAS URL과 공유 비밀값은 서버 환경변수에만 저장한다.
      baseUrl: "/api/korual",
      timeoutMs: 15000,
    },
    ui: {
      defaultTheme: "dark",
      defaultLang: "ko",
    },
  };
})();
