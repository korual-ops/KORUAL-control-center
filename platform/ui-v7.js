(()=>{
  'use strict';

  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:null;};
  const won=new Intl.NumberFormat('ko-KR',{style:'currency',currency:'KRW',maximumFractionDigits:0});

  const state={
    journey:null,
    matrix:null,
    project:null
  };

  function activeScreen(){
    return q('.screen.is-active')?.dataset.screen || qa('.screen').find(x=>!x.hidden)?.dataset.screen || 'home';
  }

  function stageFor(screen){
    if(screen==='home')return 0;
    if(screen==='match'||screen==='services')return 0;
    if(screen==='quotes')return 1;
    if(screen==='bookings')return 3;
    return 3;
  }

  function ensureJourney(){
    if(state.journey?.isConnected)return state.journey;
    const main=q('.mobile-main');
    if(!main)return null;
    const rail=document.createElement('section');
    rail.className='v7-journey';
    rail.setAttribute('aria-label','KORUAL 이용 단계');
    rail.innerHTML='<div class="v7-journey-track">'+
      '<div class="v7-journey-step" data-v7-stage="0"><b>1</b><span>요청 정리</span></div>'+
      '<div class="v7-journey-step" data-v7-stage="1"><b>2</b><span>견적 비교</span></div>'+
      '<div class="v7-journey-step" data-v7-stage="2"><b>3</b><span>직접 승인</span></div>'+
      '<div class="v7-journey-step" data-v7-stage="3"><b>4</b><span>예약 관리</span></div>'+
    '</div>';
    main.parentNode?.insertBefore(rail,main);
    state.journey=rail;
    return rail;
  }

  function updateJourney(){
    const rail=ensureJourney();
    if(!rail)return;
    const screen=activeScreen();
    let stage=stageFor(screen);
    const bookingSheet=q('#bookingSheet');
    const bundleSheet=q('#bundleBookingSheet');
    if((bookingSheet&&!bookingSheet.hidden)||(bundleSheet&&!bundleSheet.hidden))stage=2;
    qa('[data-v7-stage]',rail).forEach((node,index)=>{
      node.classList.toggle('is-active',index===stage);
      node.classList.toggle('is-done',index<stage);
    });
    rail.hidden=screen==='home' && window.scrollY<90;
  }

  function ensureHomeStrip(){
    const hero=q('.new-home-hero .new-hero-copy');
    if(!hero||q('.v7-value-strip',hero))return;
    const strip=document.createElement('div');
    strip.className='v7-value-strip';
    strip.innerHTML=
      '<span><small>01 · INTENT</small><strong>말로 요청하면 조건 구조화</strong></span>'+
      '<span><small>02 · DECISION</small><strong>가격·품질·신뢰 함께 비교</strong></span>'+
      '<span><small>03 · CONTROL</small><strong>예약은 사용자가 최종 승인</strong></span>';
    hero.appendChild(strip);
  }

  function cardInfo(card){
    const provider=q('.provider-row strong',card)?.textContent?.trim()||'업체';
    const price=num(card.dataset.price)||0;
    const trust=num(card.dataset.trust);
    const score=num(card.dataset.korualScore);
    const sample=card.classList.contains('is-sample');
    return {card,provider,price,trust,score,sample};
  }

  function quoteInfos(){
    return qa('[data-quote-card]').filter(card=>!card.hidden).map(cardInfo).filter(x=>x.price>0);
  }

  function ensureDataBadges(){
    quoteInfos().forEach(info=>{
      let badge=q('.v7-data-badge',info.card);
      if(!badge){
        badge=document.createElement('span');
        badge.className='v7-data-badge';
        const target=q('.quote-top',info.card)||info.card.firstElementChild;
        target?.insertAdjacentElement('afterend',badge);
      }
      const text=info.sample?'예시 데이터 · 예약 불가':'서버 조회 · 베타 견적';
      if(badge.textContent!==text)badge.textContent=text;
    });
  }

  function matrixHtml(infos){
    if(!infos.length)return '<p class="v7-decision-note">비교 가능한 견적이 아직 없습니다.</p>';
    return '<div class="v7-matrix-head"><span>업체</span><span>가격</span><span>점수</span><span>신뢰</span></div>'+
      infos.map(x=>'<div class="v7-matrix-row">'+
        '<strong>'+x.provider.replace(/[<>&]/g,'')+'</strong>'+
        '<span>'+won.format(x.price)+'</span>'+
        '<span>'+(x.score??'—')+'</span>'+
        '<span>'+(x.trust??'—')+'</span>'+
      '</div>').join('');
  }

  function ensureDecisionBoard(){
    const list=q('#quoteList');
    if(!list)return null;
    let board=q('#v7DecisionBoard');
    if(!board){
      board=document.createElement('section');
      board.id='v7DecisionBoard';
      board.className='v7-decision-board';
      list.parentNode?.insertBefore(board,list);
    }
    return board;
  }

  function renderDecisionBoard(){
    const board=ensureDecisionBoard();
    if(!board)return;
    const infos=quoteInfos();
    ensureDataBadges();
    if(!infos.length){
      board.innerHTML='<div class="v7-decision-head"><div><small>KORUAL DECISION LAYER</small><strong>견적이 들어오면 비교 근거를 한 곳에 정리합니다.</strong></div></div>'+
        '<p class="v7-decision-note"><i>i</i><span>가격만이 아니라 품질·신뢰·조건 적합도를 함께 확인하고, 마지막 예약은 직접 승인합니다.</span></p>';
      return;
    }
    const prices=infos.map(x=>x.price).sort((a,b)=>a-b);
    const mid=Math.floor(prices.length/2);
    const median=prices.length%2?prices[mid]:Math.round((prices[mid-1]+prices[mid])/2);
    const scores=infos.map(x=>x.score).filter(Number.isFinite);
    const highest=scores.length?Math.max(...scores):null;
    const samples=infos.filter(x=>x.sample).length;
    const expanded=state.matrix===true;
    board.innerHTML=
      '<div class="v7-decision-head"><div><small>KORUAL DECISION LAYER</small><strong>비교 근거를 한 화면에서 확인하세요.</strong></div>'+
      '<button id="v7MatrixToggle" type="button" aria-expanded="'+expanded+'">'+(expanded?'비교표 닫기':'비교표 보기')+'</button></div>'+
      '<div class="v7-decision-stats">'+
        '<span><small>비교 견적</small><b>'+infos.length+'개</b></span>'+
        '<span><small>중앙 가격</small><b>'+won.format(median)+'</b></span>'+
        '<span><small>최고 비교점수</small><b>'+(highest??'근거 없음')+'</b></span>'+
      '</div>'+
      '<p class="v7-decision-note"><i>✓</i><span>AI는 후보를 정리하고 설명합니다. 서비스 범위·취소 조건·최종 금액을 확인한 뒤 예약은 사용자가 직접 승인합니다.'+(samples?' 현재 '+samples+'개 항목은 샘플 데이터입니다.':'')+'</span></p>'+
      '<div id="v7Matrix" class="v7-matrix" '+(expanded?'':'hidden')+'>'+matrixHtml(infos)+'</div>';
    q('#v7MatrixToggle',board)?.addEventListener('click',()=>{
      state.matrix=!state.matrix;
      renderDecisionBoard();
    });
  }

  function approvalGate(form,label){
    if(!form)return;
    let gate=q('.v7-approval-gate',form);
    if(!gate){
      gate=document.createElement('div');
      gate.className='v7-approval-gate';
      gate.innerHTML='<label><input type="checkbox" data-v7-approval /><span><strong>'+label+'</strong><small>예상 금액, 서비스 범위, 일정과 취소 조건을 확인한 뒤 진행합니다.</small></span></label><p class="v7-approval-error" hidden>계속하려면 최종 승인 확인이 필요합니다.</p>';
      const actions=q('.sheet-actions',form);
      actions?.parentNode?.insertBefore(gate,actions);
      form.addEventListener('submit',event=>{
        const box=q('[data-v7-approval]',form);
        const error=q('.v7-approval-error',form);
        if(box&&!box.checked){
          event.preventDefault();
          event.stopImmediatePropagation();
          if(error)error.hidden=false;
          box.focus();
          return;
        }
        if(error)error.hidden=true;
      },true);
      gate.addEventListener('change',()=>{
        const error=q('.v7-approval-error',gate);
        if(error)error.hidden=true;
      });
    }
  }

  function resetApprovalWhenOpened(){
    ['#bookingSheet','#bundleBookingSheet'].forEach(sel=>{
      const sheet=q(sel);
      if(!sheet)return;
      const obs=new MutationObserver(()=>{
        if(!sheet.hidden){
          const box=q('[data-v7-approval]',sheet);
          if(box)box.checked=false;
          const error=q('.v7-approval-error',sheet);
          if(error)error.hidden=true;
          updateJourney();
        }else updateJourney();
      });
      obs.observe(sheet,{attributes:true,attributeFilter:['hidden']});
    });
  }

  function ensureProjectHub(){
    const screen=q('[data-screen="bookings"]');
    const heading=q('.screen-heading',screen);
    if(!screen||!heading)return null;
    let hub=q('#v7ProjectHub',screen);
    if(!hub){
      hub=document.createElement('section');
      hub.id='v7ProjectHub';
      hub.className='v7-project-hub';
      heading.insertAdjacentElement('afterend',hub);
    }
    state.project=hub;
    return hub;
  }

  function renderProjectHub(){
    const hub=ensureProjectHub();
    if(!hub)return;
    const booking=q('#bookingCard');
    const bundle=q('#bundleBookingCard');
    const hasBooking=(booking&&!booking.hidden)||(bundle&&!bundle.hidden);
    let status='READY';
    let next='견적을 선택하면 일정·업체 확인·완료까지 한 흐름으로 관리합니다.';
    let target='quotes';
    let button='견적 보기';
    if(hasBooking){
      const text=((q('#bookingStatusBadge')?.textContent||'')+' '+(q('#bookingConfirmationNotice')?.textContent||'')+' '+(q('#bundleBookingStatusBadge')?.textContent||'')).toLowerCase();
      status='ACTIVE';
      if(/완료|completed/.test(text)){next='완료된 서비스 후기를 남기고 재구매 후보를 확인하세요.';target='profile';button='내 기록 보기';}
      else if(/확정|confirmed/.test(text)){next='예약 일정과 업체 확정 상태를 확인하세요.';target='bookings';button='상태 확인';}
      else if(/취소|cancel/.test(text)){next='취소된 예약 대신 조건이 맞는 대체 견적을 다시 비교하세요.';target='quotes';button='대체 견적';}
      else {next='업체 확인 상태를 기다리는 동안 대체 견적과 일정을 비교할 수 있습니다.';target='quotes';button='대안 비교';}
    }
    hub.innerHTML=
      '<div class="v7-project-hub-head"><div><small>PROJECT HUB</small><strong>지금 해야 할 한 가지</strong></div><span>'+status+'</span></div>'+
      '<div class="v7-project-next"><div><small>NEXT BEST ACTION</small><strong>'+next+'</strong></div><button type="button" data-v7-target="'+target+'">'+button+'</button></div>';
    q('[data-v7-target]',hub)?.addEventListener('click',event=>{
      const target=event.currentTarget.dataset.v7Target;
      const nav=q('[data-tab="'+target+'"]')||q('[data-open-screen="'+target+'"]');
      nav?.click();
    });
  }

  function observeScreens(){
    const main=q('.mobile-main');
    if(!main)return;
    const obs=new MutationObserver(()=>{
      updateJourney();
      if(activeScreen()==='quotes')renderDecisionBoard();
      if(activeScreen()==='bookings')renderProjectHub();
    });
    obs.observe(main,{subtree:true,attributes:true,attributeFilter:['hidden','class','data-price','data-trust','data-korual-score']});
  }

  function boot(){
    document.documentElement.dataset.korualUi='v7';
    ensureHomeStrip();
    ensureJourney();
    approvalGate(q('#bookingForm'),'이 예약 요청을 직접 승인합니다.');
    approvalGate(q('#bundleBookingForm'),'이 묶음 예약 요청을 직접 승인합니다.');
    resetApprovalWhenOpened();
    renderDecisionBoard();
    renderProjectHub();
    updateJourney();
    observeScreens();

    window.addEventListener('scroll',updateJourney,{passive:true});
    window.addEventListener('korual:quotes-updated',renderDecisionBoard);
    document.addEventListener('click',event=>{
      if(event.target.closest('[data-tab],[data-open-screen],.select-quote,#bookSelected,#prepareBundleBooking')){
        requestAnimationFrame(()=>{updateJourney();renderDecisionBoard();renderProjectHub();});
      }
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
