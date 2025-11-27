/****************************************
 * KORUAL CONTROL CENTER – analytics.js v1.0
 * - ROUTES.key = "analytics" 로 들어온 sales 시트 기반 분석 대시보드
 * - 필요 컬럼: 날짜, 금액, 채널
 * - Chart.js 전역 객체(Chart) 사용
 ****************************************/

(function () {
  const chartState = {
    dailyChart: null,
    channelChart: null,
    monthlyChart: null,
  };

  function safeDate(v) {
    if (!v) return null;
    try {
      const d = v instanceof Date ? v : new Date(v);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) {
      return null;
    }
  }

  function ymd(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function ym(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  function destroyChart(c) {
    if (c && typeof c.destroy === "function") c.destroy();
  }

  function renderAnalytics(data) {
    const main = document.getElementById("main-content");
    if (!main) return;

    const headers = data.headers || [];
    const rows = data.rows || [];

    const hasDate = headers.includes("날짜");
    const hasAmt = headers.includes("금액");

    if (!hasDate || !hasAmt) {
      main.innerHTML = `
        <h1>Analytics</h1>
        <div class="empty">
          이 분석 페이지를 사용하려면 시트에 "날짜", "금액" 컬럼이 있어야 합니다.<br/>
          ROUTES에서 analytics 키를 sales 시트에 연결해 주세요.
        </div>
      `;
      return;
    }

    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);

    const dailyMap = {};
    const channelMap = {};
    const monthlyMap = {};

    let totalSalesLast30 = 0;
    let totalOrdersLast30 = 0;

    rows.forEach(r => {
      const d = safeDate(r["날짜"]);
      if (!d) return;

      const amt = Number(r["금액"] || 0) || 0;
      const ch = String(r["채널"] || "기타").trim() || "기타";

      const dKey = ymd(d);
      const mKey = ym(d);

      // 최근 30일 기준
      if (d >= thirtyDaysAgo && d <= today) {
        dailyMap[dKey] = (dailyMap[dKey] || 0) + amt;
        totalSalesLast30 += amt;
        totalOrdersLast30 += 1;
      }

      // 채널별
      channelMap[ch] = (channelMap[ch] || 0) + amt;

      // 월별 (전체 기준)
      monthlyMap[mKey] = (monthlyMap[mKey] || 0) + amt;
    });

    // 최근 30일 x축 만들기
    const dailyLabels = [];
    const dailyValues = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const k = ymd(d);
      dailyLabels.push(k);
      dailyValues.push(dailyMap[k] || 0);
    }

    const channelLabels = Object.keys(channelMap);
    const channelValues = channelLabels.map(k => channelMap[k]);

    const monthlyLabels = Object.keys(monthlyMap).sort();
    const monthlyValues = monthlyLabels.map(k => monthlyMap[k]);

    destroyChart(chartState.dailyChart);
    destroyChart(chartState.channelChart);
    destroyChart(chartState.monthlyChart);

    main.innerHTML = `
      <div class="section-header">
        <div class="section-title">
          <div class="section-title-main">KORUAL Analytics</div>
          <div class="section-title-sub">SALES · MEMBERS · CHANNELS</div>
        </div>
      </div>

      <div class="analytics-kpi-grid">
        <div class="card analytics-card">
          <div class="kpi-label">최근 30일 총 매출</div>
          <div class="kpi-value">${totalSalesLast30.toLocaleString()} 원</div>
        </div>
        <div class="card analytics-card">
          <div class="kpi-label">최근 30일 주문 수</div>
          <div class="kpi-value">${totalOrdersLast30.toLocaleString()} 건</div>
        </div>
        <div class="card analytics-card">
          <div class="kpi-label">평균 일매출</div>
          <div class="kpi-value">${Math.round(totalSalesLast30 / 30).toLocaleString()} 원</div>
        </div>
      </div>

      <div class="analytics-grid">
        <div class="card analytics-card">
          <div class="card-title">최근 30일 일매출 추이</div>
          <canvas id="chart-sales-daily"></canvas>
        </div>
        <div class="card analytics-card">
          <div class="card-title">채널별 매출 비중</div>
          <canvas id="chart-sales-channel"></canvas>
        </div>
        <div class="card analytics-card">
          <div class="card-title">월별 매출 합계</div>
          <canvas id="chart-sales-monthly"></canvas>
        </div>
      </div>
    `;

    buildCharts({
      dailyLabels,
      dailyValues,
      channelLabels,
      channelValues,
      monthlyLabels,
      monthlyValues,
    });
  }

  function buildCharts(payload) {
    const {
      dailyLabels,
      dailyValues,
      channelLabels,
      channelValues,
      monthlyLabels,
      monthlyValues,
    } = payload;

    const dailyCtx = document.getElementById("chart-sales-daily");
    const channelCtx = document.getElementById("chart-sales-channel");
    const monthlyCtx = document.getElementById("chart-sales-monthly");

    if (!window.Chart) {
      console.warn("[KORUAL analytics] Chart.js가 로드되지 않았습니다.");
      return;
    }

    if (dailyCtx) {
      chartState.dailyChart = new Chart(dailyCtx, {
        type: "line",
        data: {
          labels: dailyLabels,
          datasets: [
            {
              label: "일매출",
              data: dailyValues,
              borderWidth: 2,
              tension: 0.25,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              ticks: { maxTicksLimit: 8 },
              grid: { display: false },
            },
            y: {
              grid: { color: "rgba(255,255,255,0.06)" },
            },
          },
          plugins: {
            legend: { display: false },
          },
        },
      });
    }

    if (channelCtx) {
      chartState.channelChart = new Chart(channelCtx, {
        type: "doughnut",
        data: {
          labels: channelLabels,
          datasets: [
            {
              data: channelValues,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                boxWidth: 12,
              },
            },
          },
        },
      });
    }

    if (monthlyCtx) {
      chartState.monthlyChart = new Chart(monthlyCtx, {
        type: "bar",
        data: {
          labels: monthlyLabels,
          datasets: [
            {
              label: "월매출",
              data: monthlyValues,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { display: false },
            },
            y: {
              grid: { color: "rgba(255,255,255,0.06)" },
            },
          },
          plugins: {
            legend: { display: false },
          },
        },
      });
    }
  }

  // 전역에 export
  window.renderAnalytics = renderAnalytics;
})();
