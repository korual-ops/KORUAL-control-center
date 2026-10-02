(()=>{
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  ready(()=>{
    const quoteList=document.querySelector('#quoteList');
    const quotesScreen=document.querySelector('.screen[data-screen="quotes"]');
    if(!quoteList||!quotesScreen)return;

    const evidenceNumber=value=>value==null||String(value).trim()===''?NaN:Number(value);
    const parseJson=value=>{
      try{return JSON.parse(value||'{}')}catch(_){return {}}
    };

    const enhanceCard=card=>{
      if(!card||!card.matches('[data-quote-card]'))return;
      const signature=[
        card.dataset.matchScore||'',card.dataset.confidence||'',card.dataset.pareto||'',
        card.dataset.roles||'',card.dataset.scoreBreakdown||'',
        card.dataset.budgetStatus||'',card.dataset.budgetFitCount||'',card.dataset.budgetCap||'',
        card.dataset.decisionStatus||'',card.dataset.evidence||'',card.dataset.coverage||'',card.dataset.budgetScore||'',
        card.dataset.rawRankingScore||'',card.dataset.uncertaintyPenalty||'',
        card.dataset.sensitivityLevel||'',card.dataset.sensitivityStability||'',card.dataset.sensitivityWinners||''
      ].join('::');
      if(card.dataset.v5Signature===signature)return;
      card.dataset.v5Signature=signature;
      let roles=card.querySelector('.uxv5-role-row');
      if(!roles){
        roles=document.createElement('div');
        roles.className='uxv5-role-row';
        const reasons=card.querySelector('.uxv3-reasons');
        if(reasons) reasons.insertAdjacentElement('beforebegin',roles);
        else card.querySelector('.select-quote')?.insertAdjacentElement('beforebegin',roles);
      }
      const roleList=(card.dataset.roles||'').split('|').filter(Boolean);
      const pareto=card.dataset.pareto==='true';
      roles.innerHTML=[
        ...(pareto?['<span class="pareto">PARETO · 비지배 후보</span>']:[]),
        ...roleList.map(x=>'<span>'+escapeHtml(x)+'</span>')
      ].join('');

      let details=card.querySelector('.uxv5-score-details');
      if(!details){
        details=document.createElement('details');
        details.className='uxv5-score-details';
        const pos=card.querySelector('.uxv4-position');
        if(pos) pos.insertAdjacentElement('afterend',details);
        else card.querySelector('.select-quote')?.insertAdjacentElement('beforebegin',details);
      }

      const b=parseJson(card.dataset.scoreBreakdown);
      const metrics=[
        ['가격',b.price],['예산 적합',b.budget],['Trust',b.trust],
        ['평점',b.rating],['응답',b.response],['완료이력',b.experience],
        ['서비스 일치',b.coverage],['가격 근거',b.evidence],
        ['운영 신뢰',b.operational],['검증',b.verification]
      ].filter(([,v])=>Number.isFinite(evidenceNumber(v)));
      const match=evidenceNumber(card.dataset.matchScore);
      const rawRanking=evidenceNumber(card.dataset.rawRankingScore);
      const uncertaintyPenalty=evidenceNumber(card.dataset.uncertaintyPenalty);
      const confidence=evidenceNumber(card.dataset.confidence);
      details.innerHTML='<summary>왜 이 점수인가?</summary>'+
        '<div class="uxv5-score-grid">'+metrics.map(([k,v])=>
          '<div><label><span>'+k+'</span><b>'+Math.round(Number(v))+'</b></label><div class="uxv5-bar"><i style="width:'+Math.max(0,Math.min(100,Number(v)))+'%"></i></div></div>'
        ).join('')+'</div>'+
        '<div class="uxv5-score-meta"><span>Decision <strong>'+(Number.isFinite(match)?match.toFixed(1):'—')+'</strong></span><span>Raw <strong>'+(Number.isFinite(rawRanking)?rawRanking.toFixed(1):'—')+'</strong></span><span>Uncertainty <strong>'+(Number.isFinite(uncertaintyPenalty)?'-'+uncertaintyPenalty.toFixed(1):'—')+'</strong></span><span>Data confidence <strong>'+(Number.isFinite(confidence)?Math.round(confidence)+'%':'—')+'</strong></span></div>'+
        '<p class="uxv5-explain-note">Decision Score는 원점수에서 데이터 불확실성을 보수적으로 차감한 비교값입니다. 통계적 확률이나 품질 보증이 아니며, 실제 서비스 범위·추가비용·취소 및 보증 조건을 별도로 확인하세요.</p>';
    };

    const syncDecisionStatus=()=>{
      const cards=[...quoteList.querySelectorAll('[data-quote-card]')].filter(c=>!c.hidden);
      const first=cards.find(c=>c.dataset.decisionLevel)||cards[0];
      if(!first)return;
      const level=first.dataset.decisionLevel||'';
      const gap=Number(first.dataset.decisionGap);
      let box=quotesScreen.querySelector('.uxv5-decision-status');
      if(!box){
        box=document.createElement('div');
        box.className='uxv5-decision-status';
        const anchor=quotesScreen.querySelector('.uxv4-market')||quotesScreen.querySelector('.filter-strip');
        anchor?.insertAdjacentElement('beforebegin',box);
      }
      if(!box)return;
      const copy={
        close:['후보 간 차이가 매우 작습니다.','1개 후보를 정답처럼 보기보다 가격·신뢰·응답 기준을 바꿔 비교하는 편이 좋습니다.'],
        moderate:['후보 간 차이가 크지 않습니다.','현재 기준에서는 순서가 있지만 우선순위를 바꾸면 결과가 달라질 수 있습니다.'],
        separated:['현재 기준에서 점수 차이가 있습니다.','점수 차이는 참고값입니다. 예약 전 포함 범위·추가비용·취소·보증 조건을 확인하세요.'],
        single_candidate:['비교 가능한 후보가 1개입니다.','선택지가 부족하므로 추천 점수보다 실제 제공 조건 확인이 더 중요합니다.']
      }[level]||['의사결정 보조 모드','가격·신뢰·응답·이력과 데이터 완성도를 함께 비교합니다.'];
      const budgetStatus=first.dataset.budgetStatus||'';
      const decisionStatus=first.dataset.decisionStatus||'';
      const sensitivityLevel=first.dataset.sensitivityLevel||'';
      const sensitivityStability=Number(first.dataset.sensitivityStability);
      let sensitivityWinners={};
      try{sensitivityWinners=JSON.parse(first.dataset.sensitivityWinners||'{}')}catch(_){}
      const fitCount=Number(first.dataset.budgetFitCount);
      const budgetCap=Number(first.dataset.budgetCap);
      let budgetText='';
      if(budgetStatus==='matched'&&Number.isFinite(fitCount)&&Number.isFinite(budgetCap)){
        budgetText=' · 예산 '+budgetCap.toLocaleString('ko-KR')+'원 내 후보 '+fitCount+'개';
      }
      if(budgetStatus==='no_match'&&Number.isFinite(budgetCap)){
        budgetText=' · 입력 예산 '+budgetCap.toLocaleString('ko-KR')+'원 내 후보 없음';
      }
      const statusText={
        review_budget:'예산 조건을 다시 보는 편이 좋습니다.',
        low_evidence:'가격 근거 데이터가 충분하지 않아 추가 확인이 필요합니다.',
        compare_tradeoffs:'상위 후보가 근소해 장점별 비교가 중요합니다.',
        ready:'현재 조건으로 비교 가능한 후보군입니다.'
      }[decisionStatus]||'';
      const sensitivityText={
        robust:'가격·신뢰·속도·균형 기준을 바꿔도 같은 상위 후보입니다.',
        stable:'대부분의 기준에서 같은 상위 후보가 유지됩니다.',
        sensitive:'우선순위에 따라 상위 후보가 바뀔 수 있습니다.',
        highly_sensitive:'우선순위에 매우 민감합니다. 장점별 비교가 더 중요합니다.'
      }[sensitivityLevel]||'';
      const winnerCount=new Set(Object.values(sensitivityWinners||{}).filter(Boolean)).size;
      const stabilityText=Number.isFinite(sensitivityStability)
        ?' · 추천 안정성 '+Math.round(sensitivityStability*100)+'%'+(winnerCount>1?' · 기준별 상위 후보 '+winnerCount+'개':'')
        :'';
      box.dataset.level=level;
      box.innerHTML='<div><small>DECISION CONFIDENCE</small><strong>'+copy[0]+'</strong></div><span>'+copy[1]+(statusText?' · '+statusText:'')+(sensitivityText?' · '+sensitivityText:'')+(Number.isFinite(gap)?' · 상위 점수 차이 '+gap.toFixed(1):'')+stabilityText+budgetText+'</span>';
    };

    const syncAll=()=>{
      quoteList.querySelectorAll('[data-quote-card]').forEach(enhanceCard);
      syncDecisionStatus();
      let note=quotesScreen.querySelector('.uxv5-research-note');
      if(!note){
        note=document.createElement('p');
        note.className='uxv5-research-note';
        note.innerHTML='<strong>KORUAL 결정 원칙</strong> · 추천은 사용자를 설득하기 위한 문구가 아니라, 관찰 가능한 가격·신뢰·응답·이력 데이터와 그 한계를 설명하는 결정 보조 정보로 제공합니다.';
        const sticky=document.querySelector('#quoteSticky');
        if(sticky)sticky.insertAdjacentElement('beforebegin',note);
      }
    };

    function escapeHtml(value){
      return String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
    }

    syncAll();
    if('MutationObserver' in window){
      new MutationObserver(()=>syncAll()).observe(quoteList,{
        childList:true,subtree:true,attributes:true,
        attributeFilter:['data-match-score','data-raw-ranking-score','data-uncertainty-penalty','data-confidence','data-pareto','data-roles','data-score-breakdown','data-decision-level','data-decision-gap','data-budget-status','data-budget-fit-count','data-budget-cap','data-decision-status','data-evidence','data-coverage','data-budget-score','data-sensitivity-level','data-sensitivity-stability','data-sensitivity-winners','hidden']
      });
    }
  });
})();