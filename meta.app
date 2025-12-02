/*************************************************
 * KORUAL META.APP – Global App Meta / Config
 * - 프론트에서 공통으로 쓰는 메타 정보
 * - 백엔드 APP_META와 값 맞춰서 관리
 *************************************************/

/**
 * 백엔드 code.gs 의 APP_META 와 맞춰서 쓸 것
 * const APP_META = {
 *   name: "KORUAL CONTROL CENTER API",
 *   version: "v4.1",
 *   env: "prod"
 * };
 */
const KORUAL_META_APP = {
  app: {
    id: "korual-control-center",
    name: "KORUAL CONTROL CENTER",
    tagline: "All Systems Automated",
    version: "v4.1",
    env: "prod"
  },

  brand: {
    primary: "#f5f5f7",
    accent: "#facc15",
    accentSoft: "rgba(250, 204, 21, 0.14)",
    textMain: "#f9fafb",
    textMuted: "#9ca3af",
    bgElevated: "rgba(15, 23, 42, 0.78)",
    borderSubtle: "rgba(148, 163, 184, 0.45)"
  },

  api: {
    baseUrl: "https://script.google.com/macros/s/AKfycbyYWVWNZ8hjn2FFuPhy4OAltjRx70vEHJk5DPgOtf1Lf4rHy8KqrRR5XXmqIz9WHxIEQw/exec",
    timeoutMs: 12000,
    secret: "KORUAL-ONLY",
    targets: {
      ping: "ping",
      dashboard: "dashboard",
      members: "members",
      orders: "orders",
      products: "products",
      stock: "stock",
      logs: "logs",
      deleteRow: "deleteRow",
      updateCell: "updateCell",
      addRow: "addRow",
      bulkReplace: "bulkReplace"
    }
  },

  routes: {
    auth: "index.html",
    dashboard: "dashboard.html"
  },

  ui: {
    compactRowHeight: 40,
    defaultPageSize: 200,
    maxPageSize: 2000,
    dateFormat: "yyyy-MM-dd",
    currency: "KRW",
    locale: "ko-KR"
  },

  featureFlags: {
    enableLogsView: true,
    enableInlineEdit: true,
    enableDeleteRow: true,
    enablePagination: true,
    enableSearch: true
  }
};

/**
 * 전역으로 노출
 * - window.KORUAL_META_APP 으로 어디서든 접근 가능
 */
(function exposeKorualMetaAppToWindow(meta) {
  try {
    if (typeof window !== "undefined") {
      window.KORUAL_META_APP = meta;
    }
  } catch (_) {
    // 서버 사이드 환경일 경우 조용히 무시
  }
})(KORUAL_META_APP);

