export function scoreChannel({sessions=0,orders=0,revenue=0,cost=0,refunds=0,repeatOrders=0}){
  const netRevenue=Math.max(0,revenue-refunds),profit=netRevenue-cost;
  const conversion=sessions?orders/sessions:0,repeatRate=orders?repeatOrders/orders:0,roas=cost?netRevenue/cost:netRevenue>0?10:0;
  const score=Math.round(Math.max(0,Math.min(100,conversion*1000+repeatRate*20+Math.min(roas,10)*4+(profit>0?20:0))));
  return{score,profit,conversion,repeatRate,roas};
}
export function recommendAction(metrics){const r=scoreChannel(metrics);if(r.profit<0)return{...r,action:'중단 또는 소재·타깃 재검토'};if(r.score>=70)return{...r,action:'예산 20% 확대 및 후속 콘텐츠 제작'};if(r.score>=40)return{...r,action:'현 수준 유지하며 A/B 테스트'};return{...r,action:'유입보다 전환페이지 개선 우선'};}
