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

function marginRate(product) {
  return Number(((product.price - product.cost) / product.price).toFixed(3));
}

function scoreProduct(product) {
  const margin = marginRate(product) * 100;
  return Math.round(margin * 0.42 + product.demand * 0.43 - product.risk * 0.15);
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

  const tasks = [
    {
      type: 'commerce',
      title: '고마진 상품 후보 자동 선별',
      priority: 'high',
      status: 'draft',
      approvalRequired: true,
      output: rankedProducts.slice(0, 3)
    },
    {
      type: 'marketing',
      title: '쇼츠/릴스 광고 카피 생성',
      priority: 'medium',
      status: 'draft',
      approvalRequired: true,
      output: rankedProducts.slice(0, 2).map((p) => `${p.name}: 호텔급 퀄리티를 합리적인 가격으로. 오늘 KORUAL에서 확인하세요.`)
    },
    {
      type: 'business',
      title: '일일 운영 리포트 생성',
      priority: 'high',
      status: 'ready',
      approvalRequired: false,
      output: {
        revenue: metrics.revenue,
        orders: metrics.orders,
        roas,
        operatingSignals
      }
    },
    {
      type: 'risk',
      title: '자동 실행 제한 점검',
      priority: 'critical',
      status: 'guarded',
      approvalRequired: true,
      output: ['결제 집행', '광고비 증액', '고객 환불', '주문 취소', '외부 메시지 발송은 관리자 승인 필요']
    }
  ];

  return {
    ok: true,
    bot: 'KORUAL AI Operations Bot',
    mode: 'autopilot_with_human_approval',
    generatedAt: new Date().toISOString(),
    metrics: { ...metrics, roas },
    recommendations: operatingSignals,
    rankedProducts,
    tasks,
    nextActions: [
      '상위 상품 3개를 상품 등록 후보로 승인 대기',
      '광고 카피 초안 검토',
      '일일 운영 리포트 확인',
      '외부 API 연동 전 승인 정책 설정'
    ]
  };
}
