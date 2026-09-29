(()=>{
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn()}
  ready(()=>{
    const home=document.querySelector('.screen[data-screen="home"]');
    const hero=document.querySelector('.new-home-hero');
    const discover=document.querySelector('.new-discover');
    if(!home||!hero||document.querySelector('.korual-command')) return;

    const command=document.createElement('section');
    command.className='korual-command';
    command.setAttribute('aria-label','KORUAL 빠른 시작');
    command.innerHTML=`
      <div class="korual-command-head"><div><i></i><strong>KORUAL ONE FLOW</strong></div><span>검색에서 재구매까지 하나의 흐름</span></div>
      <div class="korual-command-grid">
        <button class="korual-command-action primary" type="button" data-korual-action="ai"><small>01 · AI MATCH</small><strong>AI에게 바로 요청</strong><em>필요한 조건을 말하면 서비스와 비교 기준을 구조화합니다.</em><b>✦</b></button>
        <button class="korual-command-action" type="button" data-korual-action="services"><small>02 · DISCOVER</small><strong>서비스 탐색</strong><em>전국 서비스 카테고리에서 직접 선택</em><b>↗</b></button>
        <button class="korual-command-action" type="button" data-korual-action="quotes"><small>03 · COMPARE</small><strong>견적 비교</strong><em>가격·신뢰·응답 조건을 한 화면에서 비교</em><b>↗</b></button>
      </div>`;
    hero.insertAdjacentElement('afterend',command);

    const loop=document.createElement('section');
    loop.className='korual-loop';
    loop.innerHTML=`
      <div class="korual-loop-head">
        <div><small>KORUAL SERVICE ENGINE</small><h2>한 번의 요청이<br>다음 거래로 이어지게.</h2></div>
        <p>단발성 중개가 아니라 거래 데이터를 축적해 재구매와 연관 서비스 추천이 반복되는 구조를 만듭니다.</p>
      </div>
      <div class="korual-loop-track">
        <div class="korual-loop-step"><span>01</span><strong>AI 매칭</strong><small>의도·예산·지역·우선순위 구조화</small></div>
        <div class="korual-loop-step"><span>02</span><strong>견적 비교</strong><small>가격과 Trust 데이터를 함께 비교</small></div>
        <div class="korual-loop-step"><span>03</span><strong>예약</strong><small>선택 조건을 요청 정보로 저장</small></div>
        <div class="korual-loop-step"><span>04</span><strong>후기·신뢰</strong><small>거래 데이터를 검증 자산으로 축적</small></div>
        <div class="korual-loop-step"><span>05</span><strong>재구매</strong><small>주기와 연관성 기반 다음 수요 연결</small></div>
      </div>`;
    if(discover) discover.insertAdjacentElement('afterend',loop);

    const proof=document.createElement('section');
    proof.className='korual-proof';
    proof.setAttribute('aria-label','KORUAL 플랫폼 원칙');
    proof.innerHTML=`
      <article><small>CONTROL</small><strong>사용자 최종 승인</strong><p>AI는 후보와 조건을 정리하고 예약 선택은 사용자가 결정합니다.</p></article>
      <article><small>TRUST</small><strong>검증 중심 비교</strong><p>가격뿐 아니라 검증·후기·응답 데이터를 비교 기준으로 사용합니다.</p></article>
      <article><small>COMPOUND</small><strong>거래 데이터 자산화</strong><p>요청·예약·후기 데이터를 다음 추천과 재구매 흐름으로 연결합니다.</p></article>`;
    loop.insertAdjacentElement('afterend',proof);

    const openTab=(name)=>{
      const tab=document.querySelector('.tab[data-tab="'+name+'"]');
      if(tab){tab.click();return true}
      const btn=document.querySelector('[data-open-screen="'+name+'"]');
      if(btn){btn.click();return true}
      return false;
    };
    command.addEventListener('click',(e)=>{
      const btn=e.target.closest('[data-korual-action]');
      if(!btn)return;
      const action=btn.dataset.korualAction;
      if(action==='ai') openTab('match');
      if(action==='services') openTab('services');
      if(action==='quotes') openTab('quotes');
    });

    // Make the hero search feel immediate on mobile/desktop.
    const heroSearch=document.querySelector('.new-hero-search');
    if(heroSearch) heroSearch.setAttribute('aria-label','AI 매칭 시작');

    // Surface local product usage without exposing personal data.
    try{
      const state=JSON.parse(localStorage.getItem('korual-mobile-state-v3')||'{}');
      const count=Number(state.requests||0);
      if(count>0){
        const label=command.querySelector('.korual-command-head span');
        if(label) label.textContent='누적 요청 '+count+'건 · 검색에서 재구매까지 하나의 흐름';
      }
    }catch(_){}
  });
})();