/**
 * KORUAL CONTROL CENTER
 * meta.app
 * Single Source of Truth (SSOT)
 */

window.KORUAL_META_APP = {
  // ===============================
  // APP INFO
  // ===============================
  app: {
    name: "KORUAL Control Center",
    code: "KORUAL_CC",
    version: "1.0.0",
    environment: "production", // development | staging | production
    build: "2025-01",
  },

  // ===============================
  // API CONFIG
  // ===============================
  api: {
    /**
     * 중요
     * - 브라우저 → GAS 직접 호출 ❌
     * - 반드시 Vercel API Route 프록시 경유 ⭕
     */
    baseUrl: "/api/korual",

    /**
     * 내부 시크릿 (프론트 → 프록시 → GAS)
     * 실제 보안은 서버단에서 처리
     */
    secret: "KORUAL-ONLY",

    timeout: 15000,
  },

  // ===============================
  // AUTH / SECURITY
  // ===============================
  auth: {
    storageKey: "korual_user",
    sessionTTL: 1000 * 60 * 60 * 8, // 8시간

    roles: {
      SUPER_ADMIN: "SUPER_ADMIN",
      ADMIN: "ADMIN",
      STAFF: "STAFF",
      VIEWER: "VIEWER",
    },

    /**
     * PW 정책 (프론트 기준)
     * 실제 검증은 hash.gs + code.gs
     */
    password: {
      type: "SHA256",
      minLength: 8,
    },
  },

  // ===============================
  // UI / UX
  // ===============================
  ui: {
    defaultTheme: "dark",
    supportedThemes: ["dark", "light"],

    language: "ko",

    toast: {
      duration: 3000,
    },

    table: {
      pageSize: 20,
      maxPageSize: 100,
    },

    modal: {
      animation: true,
      backdropClose: true,
    },
  },

  // ===============================
  // ENTITY DEFINITIONS
  // (board.js / app.js 공통 사용)
  // ===============================
  entities: {
    products: {
      key: "PRODUCTS",
      label: "상품",
      editable: true,
      deletable: true,
    },
    orders: {
      key: "ORDERS",
      label: "주문",
      editable: true,
      deletable: false,
    },
    members: {
      key: "MEMBERS",
      label: "회원",
      editable: true,
      deletable: false,
    },
    stock: {
      key: "STOCK",
      label: "재고",
      editable: true,
      deletable: false,
    },
    logs: {
      key: "LOGS",
      label: "로그",
      editable: false,
      deletable: false,
    },
    staff: {
      key: "STAFF",
      label: "직원",
      editable: true,
      deletable: true,
    },
  },

  // ===============================
  // DASHBOARD CONFIG
  // ===============================
  dashboard: {
    refreshInterval: 60_000, // 1분
    widgets: {
      totals: true,
      today: true,
      recentOrders: true,
    },
  },

  // ===============================
  // FEATURE FLAGS
  // ===============================
  features: {
    enableCRUD: true,
    enableCSVExport: true,
    enableDragAndDrop: true,
    enableRealtimePing: true,
    enableAuditLog: true,
  },

  // ===============================
  // DEV / DEBUG
  // ===============================
  debug: {
    logApi: true,
    logAuth: true,
    logPerformance: false,
  },
};
