export function scoreChannel({sessions=0,orders=0,revenue=0,cost=0,refunds=0,repeatOrders=0}){
  const netRevenue=Math.max(0,revenue-refunds),profit=netRevenue-cost;
  const conversion=sessions?orders/sessions:0,repeatRate=orders?repeatOrders/orders:0,roas=cost?netRevenue/cost:netRevenue>0?10:0;
  const score=Math.round(Math.max(0,Math.min(100,conversion*1000+repeatRate*20+Math.min(roas,10)*4+(profit>0?20:0))));
  return{score,profit,conversion,repeatRate,roas};
}
export function recommendAction(metrics){const r=scoreChannel(metrics);if(r.profit<0)return{...r,action:'중단 또는 소재·타깃 재검토'};if(r.score>=70)return{...r,action:'예산 20% 확대 및 후속 콘텐츠 제작'};if(r.score>=40)return{...r,action:'현 수준 유지하며 A/B 테스트'};return{...r,action:'유입보다 전환페이지 개선 우선'};}

export function decideGrowth(metrics){
  const base=scoreChannel(metrics);
  const sampleConfidence=Math.min(1,(metrics.sessions||0)/500,(metrics.orders||0)/20);
  const refundRate=metrics.orders?Math.min(1,(metrics.refundOrders||0)/metrics.orders):0;
  const stockDays=metrics.dailyUnits>0?(metrics.stock||0)/metrics.dailyUnits:365;
  const cashRisk=(metrics.cashBalance||0)<(metrics.next30DayCommitments||0)?1:0;
  const riskPenalty=refundRate*35+(stockDays<14?20:0)+cashRisk*25;
  const confidenceAdjusted=Math.round(base.score*sampleConfidence-riskPenalty);
  const decisionScore=Math.max(0,Math.min(100,confidenceAdjusted));
  let action='데이터 추가 수집';
  if(stockDays<14)action='광고 확대 전 재고 확보';
  else if(cashRisk)action='현금유출 차단 및 예산 동결';
  else if(refundRate>=0.1)action='품질·상세페이지 개선';
  else if(sampleConfidence>=0.7&&decisionScore>=65)action='예산 20% 단계 확대';
  else if(sampleConfidence>=0.4&&decisionScore>=40)action='A/B 테스트 유지';
  return{...base,sampleConfidence,refundRate,stockDays,cashRisk:Boolean(cashRisk),riskPenalty,decisionScore,action};
}
