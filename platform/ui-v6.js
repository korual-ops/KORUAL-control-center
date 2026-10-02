(()=>{
  'use strict';

  const fmt=new Intl.NumberFormat('ko-KR',{style:'currency',currency:'KRW',maximumFractionDigits:0});
  const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,Number.isFinite(v)?v:min));
  const number=v=>{if(v==null||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)?n:null};
  const median=values=>{
    const xs=values.filter(Number.isFinite).sort((a,b)=>a-b);
    if(!xs.length)return null;
    const mid=Math.floor(xs.length/2);
    return xs.length%2?xs[mid]:(xs[mid-1]+xs[mid])/2;
  };
  const parseJson=value=>{try{return value?JSON.parse(value):{};}catch{return {};}};
  const visibleCards=()=>[...document.querySelectorAll('[data-quote-card]')].filter(card=>!card.hidden&&number(card.dataset.price)>0);

  function ratingScore(card){
    const labels=[...card.querySelectorAll('.fact-grid span')];
    for(const node of labels){
      const label=node.querySelector('small')?.textContent?.trim();
      const raw=node.querySelector('b')?.textContent?.trim();
      if(label==='후기'){
        const value=parseFloat(raw);
        if(Number.isFinite(value))return clamp(value*20);
      }
    }
    return null;
  }

  function priceModel(cards){
    const prices=cards.map(card=>number(card.dataset.price)).filter(v=>v>0);
    const fair=median(prices);
    if(!fair)return null;
    const deviations=prices.map(v=>Math.abs(v-fair));
    const mad=median(deviations)||0;
    const robustSpread=Math.max(fair*0.08,mad*1.4826,5000);
    return {
      fair,
      low:Math.max(0,fair-robustSpread),
      high:fair+robustSpread,
      sampleCount:prices.length
    };
  }

  function scoreCard(card,model){
    const quoted=number(card.dataset.price)||model.fair;
    const trust=number(card.dataset.trust);
    const match=number(card.dataset.matchScore);
    const breakdown=parseJson(card.dataset.scoreBreakdown);
    const rating=ratingScore(card);

    const priceDeviation=Math.abs(quoted-model.fair)/Math.max(model.fair,1);
    const priceScore=clamp(100-priceDeviation*180,55,100);
    const qualityScore=clamp(number(breakdown.quality_score)??number(breakdown.quality)??rating??trust??82);
    const reliabilityScore=clamp(number(breakdown.reliability_score)??number(breakdown.reliability)??trust??82);
    const fitScore=clamp(number(breakdown.fit_score)??number(breakdown.fit)??match??reliabilityScore);
    const overall=clamp(
      priceScore*0.30+
      qualityScore*0.30+
      reliabilityScore*0.25+
      fitScore*0.15
    );
    return {priceScore,qualityScore,reliabilityScore,fitScore,overall,quoted};
  }

  function metric(label,value){
    const rounded=Math.round(value);
    return '<span class="v6-score-metric"><small>'+label+'</small><b>'+rounded+'</b><i><em style="width:'+rounded+'%"></em></i></span>';
  }

  function ensureOverview(list,model){
    let panel=document.querySelector('#korualFairPriceOverview');
    if(!panel){
      panel=document.createElement('section');
      panel.id='korualFairPriceOverview';
      panel.className='v6-fair-price-overview';
      list.parentNode?.insertBefore(panel,list);
    }
    panel.innerHTML=
      '<div class="v6-fair-price-head"><div><small>표시 견적 중앙값</small><strong>'+fmt.format(model.fair)+'</strong></div>'+
      '<span>비교 '+model.sampleCount+'건</span></div>'+
      '<div class="v6-fair-price-range"><span>'+fmt.format(model.low)+'</span><i><em style="width:50%"></em></i><span>'+fmt.format(model.high)+'</span></div>'+
      '<p>현재 표시 견적만으로 계산한 참고값입니다. 시장 시세나 확정 총액이 아니며 작업 범위가 다르면 직접 비교할 수 없습니다.</p>';
  }

  function renderCard(card,model){
    const scoreValue=number(card.dataset.matchScore);
    if(scoreValue===null){card.querySelector('.v6-intelligence')?.remove();delete card.dataset.korualScore;return;}
    const score=scoreCard(card,model);
    const deviation=(score.quoted-model.fair)/Math.max(model.fair,1)*100;
    let panel=card.querySelector('.v6-intelligence');
    if(!panel){
      panel=document.createElement('section');
      panel.className='v6-intelligence';
      const anchor=card.querySelector('.trust-row')||card.querySelector('.price-row');
      anchor?.insertAdjacentElement('afterend',panel);
    }
    const deviationLabel=Math.abs(deviation)<3
      ?'표시 견적 중앙값 근처'
      :(deviation<0?'중앙값보다 '+Math.abs(Math.round(deviation))+'% 낮음':'중앙값보다 '+Math.abs(Math.round(deviation))+'% 높음');

    panel.innerHTML=
      '<div class="v6-score-head"><div><small>서버 비교점수</small><strong>'+Math.round(scoreValue)+'</strong></div>'+
      '<span class="'+(Math.abs(deviation)<=12?'is-fair':'')+'">'+deviationLabel+'</span></div>'+
      '<p class="v6-score-note">서버가 제공한 비교점수입니다. 품질 보증이나 예약 성공 확률을 의미하지 않습니다.</p>';

    card.dataset.korualScore=String(Math.round(scoreValue));
    card.dataset.fairPrice=String(Math.round(model.fair));
  }

  let observer=null;
  let scheduled=false;
  function render(){
    scheduled=false;
    const list=document.querySelector('#quoteList');
    if(!list)return;
    const cards=visibleCards();
    const model=priceModel(cards);
    if(!model){document.querySelector('#korualFairPriceOverview')?.remove();return;}
    observer?.disconnect();
    ensureOverview(list,model);
    cards.forEach(card=>renderCard(card,model));
    observe(list);
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(render);
  }

  function observe(list){
    if(!observer){
      observer=new MutationObserver(schedule);
    }
    observer.observe(list,{
      subtree:true,
      childList:true,
      attributes:true,
      attributeFilter:['data-price','data-trust','data-match-score','data-score-breakdown','hidden']
    });
  }

  function boot(){
    const list=document.querySelector('#quoteList');
    if(!list)return;
    observe(list);
    render();
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
    window.addEventListener('korual:quotes-updated',schedule);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
