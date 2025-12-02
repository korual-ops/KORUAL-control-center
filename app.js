<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />

  <!-- 즉시 로그인 세션 검증 -->
  <script>
    (function () {
      const raw = localStorage.getItem("korual_user");

      if (!raw) {
        alert("로그인이 필요합니다. KORUAL 계정으로 다시 접속해 주세요.");
        window.location.href = "index.html";
        return;
      }

      try {
        const user = JSON.parse(raw);
        if (!user || !user.username) {
          localStorage.removeItem("korual_user");
          alert("세션 정보가 유효하지 않습니다. 다시 로그인해 주세요.");
          window.location.href = "index.html";
          return;
        }
        window.__korualUser = user;
      } catch (e) {
        localStorage.removeItem("korual_user");
        alert("세션 정보가 손상되었습니다. 다시 로그인해 주세요.");
        window.location.href = "index.html";
        return;
      }
    })();
  </script>

  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>KORUAL CONTROL CENTER</title>
  <meta name="theme-color" content="#020617" />

  <!-- 기본 스타일 -->
  <link rel="stylesheet" href="style.css" />
  <link rel="stylesheet" href="modal.css" />

  <!-- 하이엔드 오버레이 스타일 -->
  <style>
    :root {
      color-scheme: dark;
      --bg-main: radial-gradient(1200px 800px at 0% 0%, rgba(56,189,248,0.18), transparent 60%),
                 radial-gradient(900px 700px at 100% 100%, rgba(129,140,248,0.28), transparent 60%),
                 linear-gradient(135deg, #020617, #020617 40%, #020617 100%);
      --glass-bg: rgba(15,23,42,0.86);
      --glass-border: rgba(148,163,184,0.35);
      --accent-sky: #38bdf8;
      --accent-violet: #a855f7;
      --accent-emerald: #10b981;
      --accent-amber: #fbbf24;
      --text-soft: #94a3b8;
      --text-strong: #e5e7eb;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background: var(--bg-main);
      color: var(--text-strong);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif;
      background-attachment: fixed;
    }

    .app-shell {
      position: relative;
      max-width: 1440px;
      margin: 0 auto;
      min-height: 100vh;
      display: grid;
      grid-template-columns: 260px minmax(0,1fr);
      gap: 0;
      padding: 18px 18px 22px;
    }

    /* 전체 외곽 네온 프레임 */
    .app-shell::before {
      content: "";
      position: fixed;
      inset: 16px;
      max-width: 1440px;
      margin: 0 auto;
      border-radius: 26px;
      border: 1px solid rgba(148,163,184,0.35);
      pointer-events: none;
      box-shadow:
        0 0 0 1px rgba(15,23,42,0.9),
        0 0 60px rgba(56,189,248,0.25),
        0 0 120px rgba(129,140,248,0.26);
      opacity: 0.75;
    }

    /* 사이드바 */
    .sidebar {
      position: relative;
      z-index: 2;
      border-radius: 22px;
      background:
        radial-gradient(circle at top left, rgba(56,189,248,0.2), transparent 55%),
        radial-gradient(circle at bottom right, rgba(129,140,248,0.18), transparent 55%),
        var(--glass-bg);
      border: 1px solid var(--glass-border);
      box-shadow:
        0 24px 70px rgba(15,23,42,0.92),
        0 0 0 1px rgba(15,23,42,0.95);
      display: flex;
      flex-direction: column;
      padding: 20px 18px 18px;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }

    .brand-title {
      font-size: 1.4rem;
      font-weight: 800;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .brand-title::before {
      content: "◆";
      font-size: 0.8rem;
      color: var(--accent-sky);
      text-shadow: 0 0 14px rgba(56,189,248,0.9);
    }

    .brand-subtitle {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.22em;
      margin-top: 4px;
      color: var(--text-soft);
    }

    .nav {
      margin-top: 22px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .nav-link {
      border-radius: 999px;
      border: 1px solid transparent;
      background: rgba(15,23,42,0.6);
      color: var(--text-soft);
      font-size: 0.82rem;
      padding: 0.55rem 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.45rem;
      cursor: pointer;
      transition: all 0.16s ease-out;
      text-align: left;
      white-space: nowrap;
    }

    .nav-link::before {
      content: "";
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: rgba(148,163,184,0.55);
      box-shadow: 0 0 0 0 rgba(148,163,184,0);
      transition: all 0.16s ease-out;
    }

    .nav-link:hover {
      background: radial-gradient(circle at left, rgba(56,189,248,0.35), transparent 55%);
      border-color: rgba(56,189,248,0.7);
      color: #e5f2ff;
      transform: translateX(1px);
    }

    .nav-link.active {
      background:
        linear-gradient(135deg, rgba(56,189,248,0.18), rgba(129,140,248,0.28));
      border-color: rgba(129,140,248,0.9);
      color: #f9fafb;
      box-shadow:
        0 14px 32px rgba(15,23,42,0.95),
        0 0 25px rgba(79,70,229,0.7);
    }

    .nav-link.active::before {
      background: var(--accent-sky);
      box-shadow: 0 0 12px rgba(56,189,248,0.9);
    }

    .sidebar-footer {
      margin-top: auto;
      padding-top: 14px;
      border-top: 1px dashed rgba(51,65,85,0.9);
      font-size: 0.72rem;
      color: var(--text-soft);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .api-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.73rem;
    }

    .api-status-dot {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: var(--accent-amber);
      box-shadow: 0 0 10px rgba(251,191,36,0.8);
    }

    .api-meta {
      font-size: 0.7rem;
      opacity: 0.8;
    }

    /* 메인 영역 */
    .content {
      position: relative;
      z-index: 1;
      margin-left: 18px;
      border-radius: 22px;
      background:
        radial-gradient(circle at top right, rgba(56,189,248,0.18), transparent 55%),
        radial-gradient(circle at bottom left, rgba(129,140,248,0.18), transparent 55%),
        rgba(15,23,42,0.9);
      border: 1px solid rgba(30,64,175,0.65);
      box-shadow:
        0 26px 80px rgba(15,23,42,0.95),
        0 0 0 1px rgba(15,23,42,1);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .content::before {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: inherit;
      border: 1px solid rgba(56,189,248,0.05);
      pointer-events: none;
      mix-blend-mode: screen;
    }

    /* 상단바 */
    .topbar {
      position: relative;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 22px 14px;
      border-bottom: 1px solid rgba(30,64,175,0.6);
      background:
        linear-gradient(to right, rgba(15,23,42,0.95), rgba(15,23,42,0.88));
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      z-index: 5;
    }

    .topbar::after {
      content: "";
      position: absolute;
      inset-inline: 18px;
      bottom: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(56,189,248,0.9), rgba(129,140,248,0.9), transparent);
      opacity: 0.75;
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .topbar-title {
      font-size: 0.95rem;
      font-weight: 600;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    .topbar-meta {
      font-size: 0.75rem;
      color: var(--text-soft);
      margin-top: 2px;
    }

    .last-sync {
      margin-left: 8px;
      padding-left: 8px;
      border-left: 1px solid rgba(51,65,85,0.9);
      color: #c4d3ff;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .primary-btn,
    .ghost-btn {
      font-size: 0.78rem;
      border-radius: 999px;
      padding: 0.32rem 0.98rem;
      border: 1px solid transparent;
      cursor: pointer;
      transition: all 0.16s ease-out;
      display: inline-flex;
      align-items: center;
      gap: 0.32rem;
      white-space: nowrap;
    }

    .primary-btn {
      background: linear-gradient(135deg, #2563eb, #0ea5e9);
      color: white;
      box-shadow:
        0 12px 28px rgba(37,99,235,0.55),
        0 0 0 1px rgba(191,219,254,0.35);
    }

    .primary-btn:hover {
      filter: saturate(1.05);
      transform: translateY(-1px);
      box-shadow:
        0 16px 36px rgba(37,99,235,0.7),
        0 0 0 1px rgba(191,219,254,0.65);
    }

    .ghost-btn {
      background: rgba(15,23,42,0.7);
      color: var(--text-soft);
      border-color: rgba(71,85,105,0.9);
    }

    .ghost-btn:hover {
      background: rgba(15,23,42,0.98);
      color: #e5e7eb;
      border-color: rgba(148,163,184,0.9);
    }

    .logout-btn {
      color: #fecaca;
      border-color: rgba(248,113,113,0.6);
    }
    .logout-btn:hover {
      background: rgba(185,28,28,0.1);
      border-color: rgba(248,113,113,0.95);
      color: #fee2e2;
    }

    /* 테마 토글 */
    .theme-toggle {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(15,23,42,0.9);
      border-radius: 999px;
      padding: 2px 8px 2px 10px;
      border: 1px solid rgba(51,65,85,0.9);
      cursor: pointer;
      font-size: 0.7rem;
      color: var(--text-soft);
    }

    .theme-toggle-track {
      width: 30px;
      height: 14px;
      border-radius: 999px;
      background: radial-gradient(circle at left, rgba(56,189,248,0.8), transparent 55%);
      position: relative;
      box-shadow: inset 0 0 0 1px rgba(30,64,175,0.9);
    }

    .theme-toggle-thumb {
      position: absolute;
      width: 14px;
      height: 14px;
      border-radius: 999px;
      background: #e5e7eb;
      transform: translateX(0);
      transition: transform 0.16s ease-out;
    }

    /* 섹션 & 패널 */
    .section {
      padding: 18px 22px 20px;
      display: none;
    }
    .section.active {
      display: block;
    }

    .section-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }

    .section-header-row h2 {
      margin: 0 0 3px;
      font-size: 1rem;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .section-header-row h2::after {
      content: "";
      flex: 0 0 46px;
      height: 1px;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(148,163,184,0.0), rgba(148,163,184,0.7));
    }

    .section-desc {
      margin: 0;
      font-size: 0.8rem;
      color: var(--text-soft);
    }

    .section-actions .input {
      min-width: 220px;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(4,minmax(0,1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .card {
      border-radius: 16px;
      background:
        radial-gradient(circle at top left, rgba(56,189,248,0.18), transparent 55%),
        rgba(15,23,42,0.92);
      border: 1px solid rgba(30,64,175,0.7);
      padding: 12px 14px;
      box-shadow:
        0 16px 40px rgba(15,23,42,0.98),
        0 0 0 1px rgba(15,23,42,1);
      position: relative;
      overflow: hidden;
    }

    .card::after {
      content: "";
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at bottom right, rgba(129,140,248,0.32), transparent 60%);
      opacity: 0.35;
      pointer-events: none;
    }

    .card-label {
      font-size: 0.78rem;
      color: var(--text-soft);
      position: relative;
      z-index: 1;
    }

    .card-value {
      margin-top: 6px;
      font-size: 1.3rem;
      font-weight: 600;
      position: relative;
      z-index: 1;
    }

    .panel {
      border-radius: 18px;
      background: rgba(15,23,42,0.96);
      border: 1px solid rgba(30,64,175,0.7);
      margin-top: 14px;
      overflow: hidden;
      box-shadow:
        0 18px 48px rgba(15,23,42,0.96),
        0 0 0 1px rgba(15,23,42,1);
    }

    .panel-header {
      padding: 10px 16px 8px;
      border-bottom: 1px solid rgba(30,64,175,0.6);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.86rem;
    }

    .panel-header h3 {
      margin: 0;
      font-size: 0.9rem;
    }

    .panel-body {
      padding: 10px 16px 14px;
    }

    .today-metrics {
      display: flex;
      gap: 18px;
      flex-wrap: wrap;
      font-size: 0.84rem;
    }

    .today-metric {
      padding: 8px 12px;
      border-radius: 999px;
      border: 1px solid rgba(51,65,85,0.9);
      background:
        linear-gradient(135deg, rgba(15,23,42,0.95), rgba(15,23,42,0.9));
      display: inline-flex;
      align-items: baseline;
      gap: 8px;
    }

    .today-label {
      color: var(--text-soft);
    }
    .today-value {
      font-weight: 600;
      color: #e5f2ff;
    }

    /* 테이블 */
    .table-wrapper {
      margin-top: 10px;
      border-radius: 14px;
      border: 1px solid rgba(30,64,175,0.7);
      overflow: hidden;
      background: rgba(15,23,42,0.98);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.78rem;
    }

    thead {
      background: linear-gradient(90deg, rgba(15,23,42,0.95), rgba(30,64,175,0.95));
    }

    th, td {
      padding: 7px 10px;
      border-bottom: 1px solid rgba(30,64,175,0.7);
    }

    th {
      font-weight: 500;
      text-align: left;
      color: #cbd5f5;
      white-space: nowrap;
    }

    tbody tr:nth-child(even) {
      background: rgba(15,23,42,0.98);
    }

    tbody tr:hover {
      background: rgba(30,64,175,0.35);
    }

    .empty-state {
      text-align: center;
      padding: 16px 10px;
      color: var(--text-soft);
      font-size: 0.8rem;
    }

    .table-footer {
      display: flex;
      justify-content: flex-end;
      padding: 6px 4px 0;
      font-size: 0.72rem;
      color: var(--text-soft);
    }

    .pager {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    /* 푸터 */
    .footer {
      margin-top: auto;
      padding: 10px 18px 14px;
      border-top: 1px solid rgba(30,64,175,0.7);
      font-size: 0.74rem;
      color: var(--text-soft);
      background: linear-gradient(to right, rgba(15,23,42,0.98), rgba(15,23,42,0.9));
    }

    .footer-inner {
      display: flex;
      justify-content: space-between;
      gap: 6px;
      flex-wrap: wrap;
    }

    /* 모바일 대응 */
    @media (max-width: 1024px) {
      .app-shell {
        grid-template-columns: minmax(0,1fr);
        padding: 14px 10px 16px;
      }

      .content {
        margin-left: 0;
        margin-top: 10px;
      }

      .sidebar {
        position: fixed;
        inset: 14px 14px auto 14px;
        max-width: 260px;
        transform: translateX(-120%);
        transition: transform 0.2s ease-out, opacity 0.2s ease-out;
        opacity: 0;
        z-index: 40;
      }

      .sidebar.open {
        transform: translateX(0);
        opacity: 1;
      }

      .sidebar-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15,23,42,0.7);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease-out;
        z-index: 30;
      }

      .sidebar-backdrop.show {
        opacity: 1;
        pointer-events: auto;
      }

      .topbar {
        padding-inline: 14px;
      }

      .cards-grid {
        grid-template-columns: repeat(2,minmax(0,1fr));
      }
    }

    @media (max-width: 640px) {
      .topbar-left .topbar-title {
        font-size: 0.78rem;
        letter-spacing: 0.14em;
      }
      .cards-grid {
        grid-template-columns: minmax(0,1fr);
      }
      .section-header-row {
        flex-direction: column;
        align-items: flex-start;
      }
      .section-actions .input {
        width: 100%;
      }
    }
  </style>
</head>

<body>
<div class="app-shell">

  <!-- ======================================
       ■ 사이드바
  ======================================= -->
  <aside class="sidebar">
    <div class="brand-title">KORUAL</div>
    <div class="brand-subtitle">CONTROL CENTER</div>

    <nav class="nav">
      <button class="nav-link active" data-section="dashboard">📊 대시보드</button>
      <button class="nav-link" data-section="products">📦 상품 관리</button>
      <button class="nav-link" data-section="orders">📮 주문 관리</button>
      <button class="nav-link" data-section="members">🧑‍🤝‍🧑 회원 관리</button>
      <button class="nav-link" data-section="stock">🏬 재고 관리</button>
      <button class="nav-link" data-section="logs">📝 로그</button>
    </nav>

    <div class="sidebar-footer">
      <div class="api-status">
        <span class="api-status-dot" id="apiStatusDot"></span>
        <span>API 연결 상태</span>
      </div>
      <div class="api-meta">
        Ping: <span id="apiPing">- ms</span>
      </div>
    </div>
  </aside>

  <!-- 모바일일 때 사이드바 뒤 어두운 배경 -->
  <div id="sidebarBackdrop" class="sidebar-backdrop"></div>

  <!-- ======================================
       ■ 메인 컨텐츠
  ======================================= -->
  <main class="content">

    <!-- 상단바 -->
    <header class="topbar">
      <div class="topbar-left">

        <!-- 모바일 -->
        <button id="menuToggle" class="mobile-menu-btn" type="button" aria-label="메뉴 열기">
          <span></span><span></span><span></span>
        </button>

        <div class="topbar-text">
          <div class="topbar-title">KORUAL CONTROL CENTER</div>
          <div class="topbar-meta">
            반갑습니다, <span id="welcomeUser">KORUAL</span>님
            <span class="last-sync" id="last-sync">마지막 동기화: -</span>
          </div>
        </div>
      </div>

      <div class="topbar-right">
        <!-- 테마 -->
        <button id="themeToggle" class="theme-toggle" type="button">
          <span class="theme-toggle-label" data-light="Light" data-dark="Dark">Light</span>
          <span class="theme-toggle-track">
            <span class="theme-toggle-thumb"></span>
          </span>
        </button>

        <!-- 새로고침 -->
        <button id="btnRefreshAll" class="primary-btn" type="button">🔄 새로고침</button>

        <!-- 로그아웃 -->
        <button id="btnLogout" class="ghost-btn logout-btn" type="button">로그아웃</button>
      </div>
    </header>

    <!-- ============================================================
         1) 대시보드
    ============================================================ -->
    <section id="section-dashboard" class="section active">

      <div class="section-header-row">
        <div>
          <h2>📊 대시보드</h2>
          <p class="section-desc">전체 운영 데이터를 실시간으로 요약합니다.</p>
        </div>
      </div>

      <!-- 요약 카드 -->
      <div class="cards-grid">
        <div class="card">
          <div class="card-label">총 상품 수</div>
          <div class="card-value" id="cardTotalProducts">-</div>
        </div>
        <div class="card">
          <div class="card-label">총 주문 수</div>
          <div class="card-value" id="cardTotalOrders">-</div>
        </div>
        <div class="card">
          <div class="card-label">추정 매출 합계</div>
          <div class="card-value" id="cardTotalRevenue">-</div>
        </div>
        <div class="card">
          <div class="card-label">회원 수</div>
          <div class="card-value" id="cardTotalMembers">-</div>
        </div>
      </div>

      <!-- 오늘 요약 -->
      <div class="panel">
        <div class="panel-header"><h3>오늘 요약</h3></div>

        <div class="panel-body">
          <div class="today-metrics">

            <div class="today-metric">
              <span class="today-label">오늘 주문</span>
              <span class="today-value" id="todayOrders">-</span>
            </div>

            <div class="today-metric">
              <span class="today-label">오늘 매출</span>
              <span class="today-value" id="todayRevenue">-</span>
            </div>

            <div class="today-metric">
              <span class="today-label">준비중 주문</span>
              <span class="today-value" id="todayPending">-</span>
            </div>

          </div>
        </div>
      </div>

      <div class="table-wrapper">
        <table>
          <!-- 여기에는 실제 대시보드용 표가 들어갈 수 있음 -->
          <tbody>
            <tr><td class="empty-state">대시보드 위젯 영역</td></tr>
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <div class="pager" id="membersPager"></div>
      </div>

      <div class="table-wrapper">
        <table>
          <tbody>
            <tr><td class="empty-state">대시보드 위젯 영역 2</td></tr>
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <div class="pager" id="ordersPager"></div>
      </div>

      <!-- 최근 주문 -->
      <div class="panel">
        <div class="panel-header">
          <h3>최근 주문</h3>
          <button id="goOrders" class="ghost-btn small" type="button">→ 주문 관리</button>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>주문일자</th>
                <th>주문번호</th>
                <th>상품명</th>
                <th>수량</th>
                <th>금액</th>
                <th>채널</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody id="recentOrdersBody">
              <tr><td colspan="7" class="empty-state">로딩중…</td></tr>
            </tbody>
          </table>
        </div>
      </div>

    </section>

    <!-- ============================================================
         2) 상품 관리
    ============================================================ -->
    <section id="section-products" class="section">

      <div class="section-header-row">
        <div>
          <h2>📦 상품 관리</h2>
          <p class="section-desc">상품 정보 및 판매가/재고를 확인합니다.</p>
        </div>

        <div class="section-actions">
          <input id="searchProducts" class="input" placeholder="검색 (상품명 / 코드 / 옵션)" />
        </div>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>상품코드</th>
              <th>상품명</th>
              <th>옵션</th>
              <th>판매가</th>
              <th>재고</th>
            </tr>
          </thead>

          <tbody id="productsBody" data-entity="products" data-sheet="PRODUCTS">
            <tr><td colspan="5" class="empty-state">데이터 없음</td></tr>
          </tbody>
        </table>
      </div>

    </section>

    <!-- ============================================================
         3) 주문 관리
    ============================================================ -->
    <section id="section-orders" class="section">

      <div class="section-header-row">
        <div>
          <h2>📮 주문 관리</h2>
          <p class="section-desc">전체 주문 목록 및 배송 상태 관리</p>
        </div>

        <div class="section-actions">
          <input id="searchOrders" class="input" placeholder="검색 (주문번호 / 고객명 / 상태)" />
        </div>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>회원번호</th>
              <th>날짜</th>
              <th>주문번호</th>
              <th>고객명</th>
              <th>상품명</th>
              <th>수량</th>
              <th>금액</th>
              <th>상태</th>
            </tr>
          </thead>

          <tbody id="ordersBody" data-entity="orders" data-sheet="ORDERS">
            <tr><td colspan="8" class="empty-state">데이터 없음</td></tr>
          </tbody>
        </table>
      </div>

    </section>

    <!-- ============================================================
         4) 회원 관리
    ============================================================ -->
    <section id="section-members" class="section">

      <div class="section-header-row">
        <div>
          <h2>🧍 회원 관리</h2>
          <p class="section-desc">회원 정보, 등급, 누적매출, 최근 주문일을 확인합니다.</p>
        </div>

        <div class="section-actions" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <input id="searchMembers" class="input" placeholder="검색 (회원번호 / 이름 / 이메일 / 전화번호 / 등급)" />
        </div>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>회원번호</th>
              <th>이름</th>
              <th>전화번호</th>
              <th>이메일</th>
              <th>가입일</th>
              <th>채널</th>
              <th>등급</th>
              <th>누적매출</th>
              <th>포인트</th>
              <th>최근주문일</th>
              <th>메모</th>
            </tr>
          </thead>

          <tbody id="membersBody" data-entity="members" data-sheet="MEMBERS">
            <tr><td colspan="11" class="empty-state">데이터 없음</td></tr>
          </tbody>
        </table>
      </div>

    </section>

    <!-- ============================================================
         5) 재고 관리
    ============================================================ -->
    <section id="section-stock" class="section">

      <div class="section-header-row">
        <div>
          <h2>🏷️ 재고 관리</h2>
          <p class="section-desc">입고/출고 없이도 자동 카운팅된 재고를 확인합니다.</p>
        </div>

        <div class="section-actions">
          <input id="searchStock" class="input" placeholder="검색 (상품코드 / 상품명 / 상태 / 창고)" />
        </div>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>상품코드</th>
              <th>상품명</th>
              <th>현재 재고</th>
              <th>안전 재고</th>
              <th>상태</th>
              <th>창고</th>
              <th>채널</th>
            </tr>
          </thead>

          <tbody id="stockBody" data-entity="stock" data-sheet="STOCK">
            <tr><td colspan="7" class="empty-state">데이터 없음</td></tr>
          </tbody>
        </table>
      </div>

    </section>

    <!-- ============================================================
         6) 로그 모니터링
    ============================================================ -->
    <section id="section-logs" class="section">

      <div class="section-header-row">
        <div>
          <h2>📘 로그 모니터링</h2>
          <p class="section-desc">자동화 기록, 알림 로그, API 호출 로그를 확인합니다.</p>
        </div>

        <div class="section-actions">
          <input id="searchLogs" class="input" placeholder="검색 (시간 / 타입 / 메시지)" />
        </div>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>시간</th>
              <th>타입</th>
              <th>메시지</th>
            </tr>
          </thead>

          <tbody id="logsBody" data-entity="logs" data-sheet="LOGS">
            <tr><td colspan="3" class="empty-state">데이터 없음</td></tr>
          </tbody>
        </table>
      </div>

    </section>

    <!-- ============================================================
          FOOTER
    ============================================================ -->
    <footer class="footer">
      <div class="footer-inner">
        <span>© 2025 KORUAL Control Center · All Systems Automated</span>
        <span>24h Autonomous Commerce Radar</span>
      </div>
    </footer>

  </main>
</div>

<!-- ============================================================
     ■ 수정/삭제 공통 모달 레이어
============================================================ -->
<div
  id="korualModalLayer"
  class="modal-layer"
  data-modal-layer
  style="display:none;"
>
  <div id="korualModalBackdrop" class="modal-backdrop"></div>

  <!-- 수정 모달 -->
  <div id="rowEditModal" class="modal-panel" data-type="edit">
    <div class="modal-header">
      <h3 class="modal-title">
        <span>행 수정</span>
      </h3>
      <button type="button" class="modal-close-btn" data-close-modal>✕</button>
    </div>

    <div class="modal-body">
      <div class="modal-meta">
        <span id="rowEditEntityLabel">-</span>
        <span id="rowEditRowLabel" class="row-label">ROW: -</span>
      </div>

      <div id="rowEditFields" class="modal-fields"></div>
    </div>

    <div class="modal-footer">
      <button type="button" id="rowEditSave" class="primary-btn">저장</button>
      <button type="button" class="ghost-btn" data-close-modal>취소</button>
    </div>
  </div>

  <!-- 삭제 모달 -->
  <div
    id="rowDeleteModal"
    class="modal-panel"
    data-type="delete"
    data-modal-delete
    style="display:none;"
  >
    <div class="modal-header">
      <h3 class="modal-title">행 삭제</h3>
      <button type="button" class="modal-close-btn" data-close-modal>✕</button>
    </div>

    <div class="modal-body">
      <p id="rowDeleteMessage">
        선택한 행을 삭제하시겠습니까?
      </p>
      <div class="modal-meta">
        <span id="rowDeleteEntityLabel">-</span>
        <span id="rowDeleteRowLabel" class="row-label">ROW: -</span>
      </div>
    </div>

    <div class="modal-footer">
      <button type="button" id="rowDeleteConfirm" class="primary-btn">삭제</button>
      <button type="button" class="ghost-btn" data-close-modal>취소</button>
    </div>
  </div>
</div>

<!-- JS 연결 -->
<script src="app.js"></script>
<script src="modal.js"></script>

<!-- 모달 전역 헬퍼 -->
<script>
  (function () {
    const layer      = document.getElementById("korualModalLayer");
    const backdrop   = document.getElementById("korualModalBackdrop");
    const editModal  = document.getElementById("rowEditModal");
    const deleteModal= document.getElementById("rowDeleteModal");

    function closeAll() {
      if (!layer) return;
      layer.style.display = "none";
      if (editModal)  editModal.style.display = "none";
      if (deleteModal) deleteModal.style.display = "none";
      document.body.classList.remove("modal-open");
    }

    document.querySelectorAll("[data-close-modal]").forEach(btn => {
      btn.addEventListener("click", closeAll);
    });
    if (backdrop) {
      backdrop.addEventListener("click", closeAll);
    }

    window.KORUAL_MODAL = {
      closeAll,

      openEdit(payload) {
        if (!layer || !editModal) return;

        layer.style.display = "flex";
        document.body.classList.add("modal-open");
        editModal.style.display = "block";
        if (deleteModal) deleteModal.style.display = "none";

        const entityLabelMap = {
          members: "회원",
          orders: "주문",
          products: "상품",
          stock: "재고",
          logs: "로그"
        };
        const entityName = entityLabelMap[payload.entity] || payload.entity || "-";
        document.getElementById("rowEditEntityLabel").textContent = `[${entityName}]`;
        document.getElementById("rowEditRowLabel").textContent    = `ROW: ${payload.rowIndex}`;

        const wrap = document.getElementById("rowEditFields");
        if (!wrap) return;
        wrap.innerHTML = "";

        const data = payload.data || {};
        Object.keys(data).forEach((key) => {
          const field = document.createElement("div");
          field.className = "modal-field-row";

          const label = document.createElement("label");
          label.className = "modal-label";
          label.textContent = key;

          const input = document.createElement("input");
          input.className = "input";
          input.value = data[key] ?? "";
          input.dataset.fieldKey = key;

          field.appendChild(label);
          field.appendChild(input);
          wrap.appendChild(field);
        });

        const saveBtn = document.getElementById("rowEditSave");
        if (saveBtn) {
          saveBtn.dataset.entity   = payload.entity || "";
          saveBtn.dataset.sheet    = payload.sheet  || "";
          saveBtn.dataset.rowIndex = String(payload.rowIndex || "");
        }
      },

      openDelete(payload) {
        if (!layer || !deleteModal) return;

        layer.style.display = "flex";
        document.body.classList.add("modal-open");
        deleteModal.style.display = "block";
        if (editModal) editModal.style.display = "none";

        const entityLabelMap = {
          members: "회원",
          orders: "주문",
          products: "상품",
          stock: "재고",
          logs: "로그"
        };
        const entityName = entityLabelMap[payload.entity] || payload.entity || "-";
        document.getElementById("rowDeleteEntityLabel").textContent = `[${entityName}]`;
        document.getElementById("rowDeleteRowLabel").textContent    = `ROW: ${payload.rowIndex}`;

        const msg = payload.title
          ? `다음 데이터를 삭제할까요?\n${payload.title}`
          : "선택한 행을 삭제하시겠습니까?";
        document.getElementById("rowDeleteMessage").textContent = msg;

        const delBtn = document.getElementById("rowDeleteConfirm");
        if (delBtn) {
          delBtn.dataset.entity   = payload.entity || "";
          delBtn.dataset.sheet    = payload.sheet  || "";
          delBtn.dataset.rowIndex = String(payload.rowIndex || "");
        }
      }
    };
  })();
</script>

</body>
</html>
