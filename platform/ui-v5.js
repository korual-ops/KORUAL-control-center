(()=>{
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  ready(()=>{
    const quoteList=document.querySelector('#quoteList');
    const quotesScreen=document.querySelector('.screen[data-screen="quotes"]');
    if(!quoteList||!quotesScreen)return;

    const parseJson=value=>{
      try{return JSON.parse(value||'{}')}catch(_){return {}}
    };

    const enhanceCard=card=>{
      if(!card||!card.matches('[data-quote-card]'))return;
      const signature=[
        card.dataset.matchScore||'',card.dataset.confidence||'',card.dataset.pareto||'',
        card.dataset.roles||'',card.dataset.scoreBreakdown||''
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
        ['가격',b.price],['Trust',b.trust],['평점',b.rating],
        ['응답',b.response],['완료이력',b.experience],['검증',b.verification]
      ].filter(([,v])=>Number.isFinite(Number(v)));
      const match=Number(card.dataset.matchScore);
      const confidence=Number(card.dataset.confidence);
      details.innerHTML='<summary>왜 이 점수인가?</summary>'+
        '<div class="uxv5-score-grid">'+metrics.map(([k,v])=>
          '<div><label><span>'+k+'</span><b>'+Math.round(Number(v))+'</b></label><div class="uxv5-bar"><i style="width:'+Math.max(0,Math.min(100,Number(v)))+'%"></i></div></div>'
        ).join('')+'</div>'+
        '<div class="uxv5-score-meta"><span>Match <strong>'+(Number.isFinite(match)?Math.round(match):'—')+'</strong></span><span>Data confidence <strong>'+(Number.isFinite(confidence)?Math.round(confidence)+'%':'—')+'</strong></span></div>'+
        '<p class="uxv5-explain-note">각 수치는 비교용 입력 점수입니다. 한 항목만으로 업체를 결정하지 않으며, 실제 서비스 범위·추가비용·취소 및 보증 조건을 별도로 확인하세요.</p>';
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
      box.dataset.level=level;
      box.innerHTML='<div><small>DECISION CONFIDENCE</small><strong>'+copy[0]+'</strong></div><span>'+copy[1]+(Number.isFinite(gap)?' · 상위 점수 차이 '+gap.toFixed(1):'')+'</span>';
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
        attributeFilter:['data-match-score','data-confidence','data-pareto','data-roles','data-score-breakdown','data-decision-level','data-decision-gap','hidden']
      });
    }
  });
})();