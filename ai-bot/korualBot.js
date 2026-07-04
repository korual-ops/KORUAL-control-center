const defaultMetrics = {
  revenue: 24860000,
  orders: 1245,
  visitors: 18540,
  conversionRate: 0.067,
  refundRate: 0.018,
  avgMarginRate: 0.42,
  adSpend: 1800000,
  aiTasks: 8920
};

const sampleProducts = [
  { name: '호텔식 프리미엄 수건 세트', cost: 13200, price: 21800, demand: 86, risk: 18, category: 'PB' },
  { name: '무선 고속 충전 거치대', cost: 10400, price: 18900, demand: 92, risk: 24, category: '전자소품' },
  { name: '프리미엄 디퓨저 200ml', cost: 9600, price: 17900, demand: 78, risk: 21, category: '라이프스타일' },
  { name: '여행용 압축 파우치', cost: 5200, price: 12900, demand: 88, risk: 14, category: '여행' }
];

const confirmRequired = new Set([
  'PAYMENT_ACTION',
  'BUDGET_CHANGE',
  'CUSTOMER_ACCOUNT_ACTION',
  'PUBLIC_SEND_ACTION',
  'LEGAL_REVIEW_ACTION',
  'EXTERNAL_INTEGRATION_ACTION'
]);

function marginRate(product) {
  return Number(((product.price - product.cost) / product.price).toFixed(3));
}

function scoreProduct(product) {
  const margin = marginRate(product) * 100;
  return Math.round(margin * 0.42 + product.demand * 0.43 - product.risk * 0.15);
}

function applyApprovalPolicy(task) {
  const code = task.actionCode || 'INTERNAL_OPERATION';
  const approvalRequired = confirmRequired.has(code);
  return {
    ...task,
    approvalRequired,
    status: approvalRequired ? 'needs_owner_confirm' : 'auto_approved',
    executionMode: approvalRequired ? 'confirm_then_execute' : 'auto_execute',
    policyReason: approvalRequired
      ? '중요 실행 영역이므로 소유자 확인 필요'
      : '내부 분석, 추천, 초안, 리포트, 후보 등록은 자동 승인'
  };
}

export function runKorualBot(input = {}) {
  const metrics = { ...defaultMetrics, ...(input.metrics || {}) };
  const products = input.products || sampleProducts;

  const rankedProducts = products
    .map((product) => ({
      ...product,
      marginRate: marginRate(product),
      aiScore: scoreProduct(product),
      recommendedAction: scoreProduct(product) >= 70 ? 'LAUNCH_OR_SCALE' : 'WATCHLIST'
    }))
    .sort((a, b) => b.aiScore - a.aiScore);

  const roas = metrics.adSpend > 0 ? Number((metrics.revenue / metrics.adSpend).toFixed(2)) : null;
  const operatingSignals = [];

  if (metrics.avgMarginRate >= 0.4) operatingSignals.push('마진 구조 양호: PB/고마진 상품 확대 가능');
  if (metrics.conversionRate < 0.03) operatingSignals.push('전환율 개선 필요: 상세페이지, 리뷰, 가격 앵커링 점검');
  if (metrics.refundRate > 0.04) operatingSignals.push('환불률 경고: 품질, 배송, CS 원인 분석 필요');
  if (roas && roas >= 5) operatingSignals.push('광고 효율 양호: 예산 증액 후보');

  const rawTasks = [
    {
      type: 'commerce',
      actionCode: 'INTERNAL_OPERATION',
      title: '고마진 상품 후보 자동 선별',
      priority: 'high',
      output: rankedProducts.slice(0, 3)
    },
    {
      type: 'commerce',
      actionCode: 'INTERNAL_OPERATION',
      title: '상품 등록 초안 자동 생성',
      priority: 'high',
      output: rankedProducts.slice(0, 3).map((p) => ({
        name: p.name,
        salePrice: p.price,
        marginRate: p.marginRate,
        draftStatus: 'ready_for_internal_catalog'
      }))
    },
    {
      type: 'marketing',
      actionCode: 'INTERNAL_OPERATION',
      title: '광고 카피 자동 생성',
      priority: 'medium',
      output: rankedProducts.slice(0, 2).map((p) => `${p.name}: 호텔급 퀄리티를 합리적인 가격으로. 오늘 KORUAL에서 확인하세요.`)
    },
    {
      type: 'business',
      actionCode: 'INTERNAL_OPERATION',
      title: '일일 운영 리포트 자동 생성',
      priority: 'high',
      output: { revenue: metrics.revenue, orders: metrics.orders, roas, operatingSignals }
    },
    {
      type: 'marketing',
      actionCode: 'BUDGET_CHANGE',
      title: '예산 변경 실행',
      priority: 'critical',
      output: '효율이 좋아도 실제 예산 변경은 소유자 확인 필요'
    },
    {
      type: 'risk',
      actionCode: 'LEGAL_REVIEW_ACTION',
      title: '중요 실행 영역 보호',
      priority: 'critical',
      output: ['금전 실행', '예산 변경', '고객 계정 영향', '공개 발송', '법무 검토', '외부 연동']
    }
  ];

  const tasks = rawTasks.map(applyApprovalPolicy);

  return {
    ok: true,
    bot: 'KORUAL AI Operations Bot',
    mode: 'auto_approve_low_risk_tasks',
    generatedAt: new Date().toISOString(),
    policy: {
      default: 'auto_approve',
      confirmOnly: Array.from(confirmRequired)
    },
    metrics: { ...metrics, roas },
    recommendations: operatingSignals,
    rankedProducts,
    tasks,
    autoApprovedTasks: tasks.filter((task) => !task.approvalRequired),
    confirmationQueue: tasks.filter((task) => task.approvalRequired),
    nextActions: [
      '내부 분석, 상품 후보, 광고 카피, 운영 리포트는 자동 승인',
      '중요 실행 영역만 소유자 확인',
      '다음 단계: autoApprovedTasks를 DB와 관리자 화면에 연결'
    ]
  };
}
