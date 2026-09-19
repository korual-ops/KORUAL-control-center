(()=>{
  const $=(q,root=document)=>root.querySelector(q);
  const $$=(q,root=document)=>[...root.querySelectorAll(q)];
  const root=document.documentElement;
  const STATE_KEY='korual-mobile-state-v3';
  const SESSION_KEY='korual-session-v1';
  const API_URL='https://dtmmjkikyfgkeimhevso.supabase.co/functions/v1/korual-public-api';

  const screens=$$('.screen[data-screen]');
  const tabs=$$('.tab[data-tab]');
  const headerTitle=$('#headerTitle');
  const headerSubtitle=$('#headerSubtitle');
  const themeToggle=$('#themeToggle');
  const statusButton=$('#statusButton');
  const toast=$('#toast');

  const titles={
    home:['KORUAL','AI Service OS'],
    match:['AI Match','조건을 자연어로 입력'],
    quotes:['Smart Quotes','가격 · 신뢰 · 조건 비교'],
    bookings:['Bookings','예약과 진행 상태'],
    services:['Services','KORUAL 서비스 맵'],
    profile:['My KORUAL','설정과 플랫폼 상태']
  };

  let quoteCatalog={
    best:{id:'best',name:'KORUAL Demo Recommended',price:142000,trust:96,label:'AI 추천',provider_key:'demo_best',verified:true,rating:4.9,reviews:264,response:8,jobs:534},
    value:{id:'value',name:'KORUAL Demo Value',price:128000,trust:91,label:'가성비',provider_key:'demo_value',verified:true,rating:4.8,reviews:128,response:18,jobs:286},
    premium:{id:'premium',name:'KORUAL Demo Premium',price:169000,trust:94,label:'프리미엄',provider_key:'demo_premium',verified:true,rating:5.0,reviews:96,response:12,jobs:178}
  };

  let state={
    requests:0,
    completes:0,
    currentRequest:null,
    selectedQuote:null,
    booking:null,
    preferences:{priority:'balanced',verifiedOnly:true,budgetCap:null}
  };

  try{
    const saved=JSON.parse(localStorage.getItem(STATE_KEY)||'null');
    if(saved&&typeof saved==='object') state={...state,...saved};
  }catch(_){}

  let sessionId='';
  try{sessionId=localStorage.getItem(SESSION_KEY)||''}catch(_){}
  if(!/^[A-Za-z0-9_-]{12,80}$/.test(sessionId)){
    const raw=globalThis.crypto?.randomUUID?.() || (Date.now().toString(36)+Math.random().toString(36).slice(2));
    sessionId=('ks_'+raw.replace(/-/g,'_')).slice(0,80);
    try{localStorage.setItem(SESSION_KEY,sessionId)}catch(_){}
  }

  function save(){
    try{localStorage.setItem(STATE_KEY,JSON.stringify(state))}catch(_){}
    renderState();
  }

  let toastTimer;
  function showToast(message){
    if(!toast)return;
    clearTimeout(toastTimer);
    toast.textContent=message;
    toast.hidden=false;
    toastTimer=setTimeout(()=>toast.hidden=true,2400);
  }

  function syncTheme(){
    let theme='light';
    try{theme=localStorage.getItem('korual-theme')==='dark'?'dark':'light'}catch(_){}
    root.dataset.theme=theme;
    const meta=$('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content',theme==='dark'?'#080d16':'#f6f7fb');
    if(themeToggle) themeToggle.setAttribute('aria-pressed',String(theme==='dark'));
  }
  syncTheme();

  function toggleTheme(){
    const next=root.dataset.theme==='dark'?'light':'dark';
    try{localStorage.setItem('korual-theme',next)}catch(_){}
    syncTheme();
  }
  themeToggle?.addEventListener('click',toggleTheme);
  $('#profileTheme')?.addEventListener('click',toggleTheme);

  function showScreen(name,{updateHash=true}={}){
    if(!titles[name]) name='home';
    screens.forEach(screen=>{
      const active=screen.dataset.screen===name;
      screen.hidden=!active;
      screen.classList.toggle('is-active',active);
    });
    tabs.forEach(tab=>tab.classList.toggle('is-active',tab.dataset.tab===name));
    if(headerTitle) headerTitle.textContent=titles[name][0];
    if(headerSubtitle) headerSubtitle.textContent=titles[name][1];
    if(updateHash && location.hash!=='#'+name) history.replaceState(null,'','#'+name);
    window.scrollTo({top:0,behavior:'instant'});
  }

  tabs.forEach(tab=>tab.addEventListener('click',()=>showScreen(tab.dataset.tab)));
  $$('[data-open-screen]').forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.openScreen)));
  window.addEventListener('hashchange',()=>showScreen(location.hash.slice(1)||'home',{updateHash:false}));
  const initial=location.hash.slice(1);
  if(initial&&titles[initial]) showScreen(initial,{updateHash:false});

  const today=$('#todayLabel');
  if(today){
    try{today.textContent=new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'short'}).format(new Date())}
    catch(_){today.textContent='Today'}
  }

  function escapeHtml(value){
    return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function makeIdempotency(){
    const raw=globalThis.crypto?.randomUUID?.() || (Date.now().toString(36)+Math.random().toString(36).slice(2));
    return ('kb_'+raw.replace(/-/g,'_')).slice(0,80);
  }

  async function fetchApi(action,payload={}){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),9000);
    try{
      const res=await fetch(API_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json','x-korual-session':sessionId},
        body:JSON.stringify({action,...payload}),
        signal:controller.signal
      });
      const data=await res.json().catch(()=>({ok:false,error:'INVALID_RESPONSE'}));
      if(!res.ok||!data.ok){
        const err=new Error(data.error||'API_ERROR');
        err.code=data.error||'API_ERROR';
        throw err;
      }
      return data;
    }finally{
      clearTimeout(timer);
    }
  }

  function inferRequest(text){
    const raw=String(text||'').trim();
    const q=raw.toLowerCase();
    const bundle=[];
    const add=x=>{if(!bundle.includes(x))bundle.push(x)};

    let service='일반 서비스';
    let priority='가격 + 신뢰';

    if(q.includes('이사')||q.includes('입주')){
      service='이사';
      add('이사');add('입주청소');add('인터넷 설치');
      if(q.includes('에어컨')) add('에어컨');
    }
    if(q.includes('청소')&&!bundle.includes('입주청소')){service=service==='일반 서비스'?'청소':service;add('청소')}
    if(q.includes('인터넷')){service=service==='일반 서비스'?'인터넷 설치':service;add('인터넷 설치')}
    if(q.includes('에어컨')){service=service==='일반 서비스'?'에어컨':service;add('에어컨');add('설치/세척')}
    if(q.includes('여행')||q.includes('항공')||q.includes('호텔')){
      service='여행';
      add('항공/숙박');add('공항 이동');add('여행자 서비스');
    }
    if(q.includes('커머스')||q.includes('상품')||q.includes('배송')){
      service='커머스 운영';
      add('상품');add('주문');add('배송/정산');
    }
    if(q.includes('ai')||q.includes('추천')){
      service=service==='일반 서비스'?'AI 추천':service;
      add('조건 분석');add('추천');
    }
    if(q.includes('저렴')||q.includes('싼')||q.includes('가격')) priority='가격 우선';
    if(q.includes('후기')||q.includes('안전')||q.includes('신뢰')) priority='신뢰 우선';
    if(q.includes('빠른')||q.includes('급해')||q.includes('오늘')) priority='속도 우선';
    if(!bundle.length)add(raw||'서비스');

    return {raw,service,bundle:bundle.slice(0,4),priority};
  }

  const matchForm=$('#matchForm');
  const matchInput=$('#matchInput');
  const analysisTitle=$('#analysisTitle');
  const analysisState=$('#analysisState');
  const detectedBundle=$('#detectedBundle');
  const analysisService=$('#analysisService');
  const analysisPriority=$('#analysisPriority');
  const analysisNext=$('#analysisNext');
  const goQuotes=$('#goQuotes');
  const quoteContext=$('#quoteContext');
  const verifiedOnly=$('#verifiedOnly');
  const budgetCap=$('#budgetCap');
  const trustSheet=$('#trustSheet');
  const closeTrustSheet=$('#closeTrustSheet');
  const trustCloseAction=$('#trustCloseAction');
  const aiConcierge=$('#aiConcierge');
  const openAgentControl=$('#openAgentControl');

  function renderAnalysis(request){
    if(!request)return;
    if(analysisTitle) analysisTitle.textContent='조건 분석 완료';
    if(analysisState){analysisState.textContent='READY';analysisState.classList.add('ready')}
    if(detectedBundle) detectedBundle.innerHTML=request.bundle.map(x=>'<span class="detected">'+escapeHtml(x)+'</span>').join('');
    if(analysisService) analysisService.textContent=request.service;
    if(analysisPriority) analysisPriority.textContent=request.priority;
    if(analysisNext) analysisNext.textContent='3개 견적 비교';
    if(goQuotes) goQuotes.disabled=false;
    if(quoteContext) quoteContext.textContent=request.service+' · '+request.priority+' 기준의 베타 견적입니다.';
  }

  async function loadQuotes(request){
    if(!request)return;
    if(quoteContext) quoteContext.textContent='서버에서 검증된 베타 견적을 불러오는 중…';
    try{
      const data=await fetchApi('quotes',{request});
      if(Array.isArray(data.quotes)&&data.quotes.length){
        for(const q of data.quotes){
          quoteCatalog[q.key]={
            id:q.key,
            name:q.provider_name,
            price:Number(q.amount)||0,
            trust:Number(q.trust)||0,
            label:q.label||'견적',
            provider_key:q.provider_key,
            verified:Boolean(q.verified),
            rating:Number(q.rating)||0,
            reviews:Number(q.review_count)||0,
            response:q.response_minutes==null?null:Number(q.response_minutes),
            jobs:Number(q.completed_jobs)||0
          };
          updateQuoteCard(q);
        }
        if(quoteContext) quoteContext.textContent=data.request.service+' · 실제 Supabase 베타 파트너 데이터';
      }
    }catch(err){
      if(quoteContext) quoteContext.textContent=request.service+' · 연결 실패 시 표시되는 로컬 샘플 견적';
      showToast('견적 서버 연결이 불안정해 샘플 모드로 표시합니다.');
    }
    renderQuotesSelection();
  }

  function updateQuoteCard(q){
    const card=$('[data-quote-card="'+q.key+'"]');
    if(!card)return;
    card.dataset.price=String(q.amount||0);
    card.dataset.trust=String(q.trust||0);
    const providerName=$('.provider-row strong',card);
    const providerMeta=$('.provider-row small',card);
    const price=$('.price-row strong',card);
    const priceLabel=$('.price-row > span',card);
    const trust=$('.trust-row strong',card);
    const score=$('.score i',card);
    const rating=$('.fact-grid span:nth-child(1) b',card);
    const response=$('.fact-grid span:nth-child(2) b',card);
    if(providerName) providerName.textContent=q.provider_name||'KORUAL Demo Partner';
    if(providerMeta) providerMeta.textContent='검증 파트너 · 베타';
    if(price) price.textContent='₩'+Number(q.amount||0).toLocaleString('ko-KR');
    if(priceLabel) priceLabel.textContent=q.label||'견적';
    if(trust) trust.textContent=String(q.trust||0);
    if(score) score.style.width=Math.max(0,Math.min(100,Number(q.trust)||0))+'%';
    if(rating) rating.textContent=Number(q.rating||0).toFixed(1);
    if(response) response.textContent=q.response_minutes==null?'—':(q.response_minutes<=10?'매우 빠름':q.response_minutes<=20?'빠름':q.response_minutes+'분');
  }

  function analyze(text,{count=true}={}){
    const request=inferRequest(text);
    if(!request.raw){showToast('필요한 서비스를 입력해주세요.');matchInput?.focus();return}
    state.currentRequest=request;
    state.selectedQuote=null;
    if(count) state.requests=(Number(state.requests)||0)+1;
    save();
    renderAnalysis(request);
    renderQuotesSelection();
    loadQuotes(request);
    showToast('요청을 분석했습니다.');
  }

  matchForm?.addEventListener('submit',e=>{e.preventDefault();analyze(matchInput?.value)});
  $$('[data-prompt]').forEach(btn=>btn.addEventListener('click',()=>{
    if(matchInput) matchInput.value=btn.dataset.prompt||'';
    analyze(btn.dataset.prompt);
  }));
  $$('[data-service]').forEach(btn=>btn.addEventListener('click',()=>{
    const value=btn.dataset.service||'';
    showScreen('match');
    if(matchInput) matchInput.value=value;
    analyze(value);
  }));
  goQuotes?.addEventListener('click',()=>showScreen('quotes'));

  const quoteList=$('#quoteList');
  const stickyQuoteName=$('#stickyQuoteName');
  const stickyQuotePrice=$('#stickyQuotePrice');
  const bookSelected=$('#bookSelected');


  function normalizePreferences(){
    if(!state.preferences||typeof state.preferences!=='object'){
      state.preferences={priority:'balanced',verifiedOnly:true,budgetCap:null};
    }
    if(!['balanced','price','trust','speed'].includes(state.preferences.priority)) state.preferences.priority='balanced';
    state.preferences.verifiedOnly=state.preferences.verifiedOnly!==false;
    const cap=Number(state.preferences.budgetCap);
    state.preferences.budgetCap=Number.isFinite(cap)&&cap>0?cap:null;
  }

  function scoreQuote(q){
    const prices=Object.values(quoteCatalog).map(x=>Number(x.price)||0).filter(Boolean);
    const min=Math.min(...prices),max=Math.max(...prices);
    const priceScore=max===min?100:100-((q.price-min)/(max-min))*35;
    const trustScore=Math.max(0,Math.min(100,Number(q.trust)||0));
    const speed=Number(q.response);
    const speedScore=Number.isFinite(speed)?Math.max(45,100-Math.min(speed,60)*.8):70;
    if(state.preferences.priority==='price') return priceScore*.62+trustScore*.25+speedScore*.13;
    if(state.preferences.priority==='trust') return trustScore*.65+priceScore*.2+speedScore*.15;
    if(state.preferences.priority==='speed') return speedScore*.6+trustScore*.25+priceScore*.15;
    return trustScore*.45+priceScore*.35+speedScore*.2;
  }

  function preferenceLabel(){
    const map={balanced:'균형',price:'가격',trust:'신뢰',speed:'속도'};
    return map[state.preferences.priority]||'균형';
  }

  function applyDecisionLens(){
    normalizePreferences();
    const list=$('#quoteList');
    if(!list)return;
    const entries=$('[data-quote-card]',list).map(card=>{
      const q=quoteCatalog[card.dataset.quoteCard];
      const overBudget=state.preferences.budgetCap && q && Number(q.price)>state.preferences.budgetCap;
      const unverified=state.preferences.verifiedOnly && q && !q.verified;
      card.classList.toggle('is-filtered',Boolean(overBudget||unverified));
      card.classList.remove('is-top-choice','featured');
      return {card,q,score:q?scoreQuote(q):-1,hidden:Boolean(overBudget||unverified)};
    });
    entries.sort((a,b)=>b.score-a.score);
    entries.forEach(x=>list.appendChild(x.card));
    const top=entries.find(x=>!x.hidden);
    if(top){
      top.card.classList.add('is-top-choice','featured');
      const badge=$('.quote-rank,.ai-pick,.value-pick,.premium-pick',top.card);
      if(badge) badge.textContent='AI PICK';
    }
    if(quoteContext&&state.currentRequest){
      const cap=state.preferences.budgetCap?' · '+Number(state.preferences.budgetCap).toLocaleString('ko-KR')+'원 이하':'';
      quoteContext.textContent=state.currentRequest.service+' · '+preferenceLabel()+' 우선'+cap;
    }
  }

  function syncPreferenceUI(){
    normalizePreferences();
    $('[data-priority]').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.priority===state.preferences.priority));
    if(verifiedOnly) verifiedOnly.checked=state.preferences.verifiedOnly;
    if(budgetCap) budgetCap.value=state.preferences.budgetCap||'';
    applyDecisionLens();
  }

  function recommendationReason(q){
    if(!q)return '추천 근거를 확인할 수 없습니다.';
    if(state.preferences.priority==='price') return '현재 설정에서 가격 비중을 가장 높게 반영했습니다. Trust Score와 응답성은 보조 기준으로 사용했습니다.';
    if(state.preferences.priority==='trust') return '검증 상태와 KORUAL Trust Score를 가장 크게 반영했습니다. 평점·리뷰·완료 이력도 함께 확인합니다.';
    if(state.preferences.priority==='speed') return '평균 응답 속도를 우선 반영하고, 신뢰와 가격이 지나치게 불리하지 않은 후보를 함께 비교합니다.';
    return '가격·신뢰·응답성을 함께 본 균형 추천입니다. 한 가지 지표만으로 자동 결정하지 않습니다.';
  }

  function openTrust(id){
    const q=quoteCatalog[id];
    if(!q||!trustSheet)return;
    $('#trustTitle').textContent=q.name||'파트너 신뢰 정보';
    $('#trustScoreLarge').textContent=String(Math.round(Number(q.trust)||0));
    $('#trustReason').textContent=recommendationReason(q);
    $('#trustVerified').textContent=q.verified?'검증 완료':'미검증';
    $('#trustRating').textContent=Number(q.rating||0).toFixed(1)+' / 5';
    $('#trustReviews').textContent=Number(q.reviews||0).toLocaleString('ko-KR')+'건';
    $('#trustResponse').textContent=q.response==null?'데이터 없음':q.response+'분';
    $('#trustJobs').textContent=Number(q.jobs||0).toLocaleString('ko-KR')+'건';
    $('#trustPrice').textContent='₩'+Number(q.price||0).toLocaleString('ko-KR');
    trustSheet.hidden=false;
    document.body.style.overflow='hidden';
  }
  function closeTrust(){
    if(!trustSheet)return;
    trustSheet.hidden=true;
    document.body.style.overflow='';
  }

  function renderQuotesSelection(){
    $$('[data-quote-card]').forEach(card=>card.classList.toggle('selected',state.selectedQuote?.id===card.dataset.quoteCard));
    if(state.selectedQuote){
      if(stickyQuoteName) stickyQuoteName.textContent=state.selectedQuote.label+' · '+state.selectedQuote.name;
      if(stickyQuotePrice) stickyQuotePrice.textContent='₩'+Number(state.selectedQuote.price).toLocaleString('ko-KR');
      if(bookSelected) bookSelected.disabled=false;
    }else{
      if(stickyQuoteName) stickyQuoteName.textContent='견적을 선택하세요';
      if(stickyQuotePrice) stickyQuotePrice.textContent='—';
      if(bookSelected) bookSelected.disabled=true;
    }
    applyDecisionLens();
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('[data-quote]');
    if(!btn)return;
    const quote=quoteCatalog[btn.dataset.quote];
    if(!quote)return;
    if(!state.currentRequest){
      state.currentRequest=inferRequest('생활 서비스');
      state.requests=(Number(state.requests)||0)+1;
    }
    state.selectedQuote={...quote};
    save();
    showToast(quote.name+' 견적을 선택했습니다.');
  });


  $('[data-priority]').forEach(btn=>btn.addEventListener('click',()=>{
    normalizePreferences();
    state.preferences.priority=btn.dataset.priority||'balanced';
    save();
    syncPreferenceUI();
    showToast('추천 기준을 '+preferenceLabel()+' 우선으로 변경했습니다.');
  }));

  verifiedOnly?.addEventListener('change',()=>{
    normalizePreferences();
    state.preferences.verifiedOnly=verifiedOnly.checked;
    save();
    syncPreferenceUI();
  });

  budgetCap?.addEventListener('change',()=>{
    normalizePreferences();
    const cap=Number(budgetCap.value);
    state.preferences.budgetCap=Number.isFinite(cap)&&cap>0?cap:null;
    save();
    syncPreferenceUI();
    if(state.preferences.budgetCap)showToast('예산 상한을 적용했습니다.');
  });

  document.addEventListener('click',e=>{
    const trust=e.target.closest?.('[data-trust]');
    if(trust){openTrust(trust.dataset.trust);return}
  });
  closeTrustSheet?.addEventListener('click',closeTrust);
  trustCloseAction?.addEventListener('click',closeTrust);
  trustSheet?.addEventListener('click',e=>{if(e.target===trustSheet)closeTrust()});

  aiConcierge?.addEventListener('click',()=>showScreen('match'));
  openAgentControl?.addEventListener('click',()=>{
    showScreen('match');
    setTimeout(()=>$('.agent-control')?.scrollIntoView({behavior:'smooth',block:'center'}),80);
  });

  $('.filter-strip [data-sort]').forEach(btn=>btn.addEventListener('click',()=>{
    $$('.filter-strip [data-sort]').forEach(x=>x.classList.toggle('is-active',x===btn));
    if(!quoteList)return;
    const cards=$$('[data-quote-card]',quoteList);
    const mode=btn.dataset.sort;
    cards.sort((a,b)=>{
      if(mode==='price') return Number(a.dataset.price)-Number(b.dataset.price);
      if(mode==='trust') return Number(b.dataset.trust)-Number(a.dataset.trust);
      const rank={best:0,value:1,premium:2};
      return rank[a.dataset.quoteCard]-rank[b.dataset.quoteCard];
    }).forEach(card=>quoteList.appendChild(card));
  }));

  const bookingSheet=$('#bookingSheet');
  const bookingForm=$('#bookingForm');
  const closeBookingSheet=$('#closeBookingSheet');
  const cancelBookingSheet=$('#cancelBookingSheet');
  const submitBooking=$('#submitBooking');
  const desiredDate=$('#desiredDate');
  let pendingIdempotency='';

  function localDateString(date){
    const y=date.getFullYear();
    const m=String(date.getMonth()+1).padStart(2,'0');
    const d=String(date.getDate()).padStart(2,'0');
    return y+'-'+m+'-'+d;
  }

  function openBookingSheet(){
    if(!state.selectedQuote){showToast('먼저 견적을 선택해주세요.');return}
    if(!state.currentRequest){showToast('먼저 서비스 요청을 분석해주세요.');return}
    $('#sheetService').textContent=state.currentRequest.service;
    $('#sheetQuote').textContent=state.selectedQuote.name+' · ₩'+Number(state.selectedQuote.price).toLocaleString('ko-KR');
    const todayDate=new Date();
    const tomorrow=new Date(todayDate.getFullYear(),todayDate.getMonth(),todayDate.getDate()+1);
    if(desiredDate){
      desiredDate.min=localDateString(todayDate);
      if(!desiredDate.value) desiredDate.value=localDateString(tomorrow);
    }
    pendingIdempotency=makeIdempotency();
    bookingSheet.hidden=false;
    document.body.style.overflow='hidden';
  }

  function closeSheet(){
    bookingSheet.hidden=true;
    document.body.style.overflow='';
  }

  bookSelected?.addEventListener('click',openBookingSheet);
  closeBookingSheet?.addEventListener('click',closeSheet);
  cancelBookingSheet?.addEventListener('click',closeSheet);
  bookingSheet?.addEventListener('click',e=>{if(e.target===bookingSheet)closeSheet()});

  bookingForm?.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!state.selectedQuote||!state.currentRequest)return;
    const customer={
      name:$('#customerName')?.value||'',
      phone:$('#customerPhone')?.value||'',
      region:$('#customerRegion')?.value||'',
      desired_date:desiredDate?.value||''
    };
    if(submitBooking){submitBooking.disabled=true;submitBooking.textContent='저장 중…'}
    try{
      const data=await fetchApi('book',{
        request:state.currentRequest,
        quote_key:state.selectedQuote.id,
        customer,
        idempotency_key:pendingIdempotency||makeIdempotency()
      });
      const b=data.booking||{};
      state.booking={
        id:b.request_code||b.booking_id||('KR-'+Date.now().toString(36).toUpperCase()),
        backend_id:b.booking_id||null,
        request_id:b.request_id||null,
        status:'REQUESTED',
        service:state.currentRequest.service,
        quote:{
          id:state.selectedQuote.id,
          name:b.provider_name||state.selectedQuote.name,
          price:Number(b.amount??state.selectedQuote.price)
        },
        createdAt:Date.now()
      };
      save();
      closeSheet();
      showScreen('bookings');
      showToast('Supabase에 예약 요청을 저장했습니다.');
    }catch(err){
      const code=err?.code||'API_ERROR';
      const messages={
        NAME_REQUIRED:'이름을 확인해주세요.',
        PHONE_INVALID:'연락처를 확인해주세요.',
        REGION_REQUIRED:'서비스 지역을 입력해주세요.',
        DATE_INVALID:'희망일을 확인해주세요.',
        RATE_LIMITED:'요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        ORIGIN_NOT_ALLOWED:'현재 접속 주소에서는 예약 저장을 사용할 수 없습니다.'
      };
      showToast(messages[code]||'예약 저장에 실패했습니다. 다시 시도해주세요.');
    }finally{
      if(submitBooking){submitBooking.disabled=false;submitBooking.textContent='예약 요청 저장'}
    }
  });

  function renderBooking(){
    const empty=$('#emptyBooking');
    const card=$('#bookingCard');
    if(!state.booking){
      if(empty) empty.hidden=false;
      if(card) card.hidden=true;
      return;
    }
    if(empty) empty.hidden=true;
    if(card) card.hidden=false;
    $('#bookingId').textContent=state.booking.id||'—';
    $('#bookingServiceLabel').textContent=state.booking.service||'서비스';
    $('#bookingProviderLabel').textContent=state.booking.quote?.name||'Partner';
    $('#bookingPriceLabel').textContent=state.booking.quote?.price?'₩'+Number(state.booking.quote.price).toLocaleString('ko-KR'):'—';

    const timeline=$$('.timeline-item');
    if(state.booking.status==='COMPLETED'){
      timeline.forEach(x=>x.classList.add('done'));
      const repeat=$('#repeatMessage');
      if(repeat) repeat.textContent='완료 데이터가 DB에 기록되었습니다. 후기와 다음 연관 서비스 추천 단계로 연결됩니다.';
      const complete=$('#completeDemo');
      if(complete){complete.textContent='완료됨';complete.disabled=true}
    }else{
      timeline.forEach((x,i)=>x.classList.toggle('done',i===0));
      const complete=$('#completeDemo');
      if(complete){complete.textContent='완료 시뮬레이션';complete.disabled=false}
    }
  }

  $('#completeDemo')?.addEventListener('click',async()=>{
    if(!state.booking)return;
    const button=$('#completeDemo');
    if(!state.booking.backend_id){
      showToast('서버에 저장된 베타 예약만 완료 처리할 수 있습니다.');
      return;
    }
    if(button){button.disabled=true;button.textContent='처리 중…'}
    try{
      await fetchApi('complete_demo',{booking_id:state.booking.backend_id});
      if(state.booking.status!=='COMPLETED'){
        state.booking.status='COMPLETED';
        state.completes=(Number(state.completes)||0)+1;
        save();
      }
      showToast('완료 상태를 Supabase에 기록했습니다.');
    }catch(err){
      showToast('완료 처리에 실패했습니다.');
      if(button){button.disabled=false;button.textContent='완료 시뮬레이션'}
    }
  });

  function renderHome(){
    const card=$('#homeRecommendation');
    if(!card)return;
    if(state.booking?.status==='COMPLETED'){
      card.innerHTML='<div class="recommend-badge">↻</div><div><small>REPEAT ENGINE</small><strong>다음 연관 서비스를 준비했어요.</strong><p>'+escapeHtml(state.booking.service)+' 완료 이력을 기반으로 후속 서비스를 추천합니다.</p></div><button type="button" data-open-screen="services">→</button>';
    }else if(state.booking){
      card.innerHTML='<div class="recommend-badge">B</div><div><small>예약 진행 중</small><strong>'+escapeHtml(state.booking.service)+' 예약을 확인하세요.</strong><p>'+escapeHtml(state.booking.quote?.name||'Partner')+' · '+escapeHtml(state.booking.id)+'</p></div><button type="button" data-open-screen="bookings">→</button>';
    }else if(state.currentRequest){
      card.innerHTML='<div class="recommend-badge">AI</div><div><small>최근 요청</small><strong>'+escapeHtml(state.currentRequest.service)+' 견적을 비교해보세요.</strong><p>'+state.currentRequest.bundle.map(escapeHtml).join(' · ')+'</p></div><button type="button" data-open-screen="quotes">→</button>';
    }else{
      card.innerHTML='<div class="recommend-badge">AI</div><div><small>아직 요청이 없어요</small><strong>필요한 서비스를 입력해보세요.</strong><p>최근 요청을 기반으로 다음 행동을 여기에 추천합니다.</p></div><button type="button" data-open-screen="match">→</button>';
    }
    $$('[data-open-screen]',card).forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.openScreen)));
  }

  function renderProfile(){
    const r=$('#requestCount'),b=$('#bookingCount'),c=$('#completeCount');
    if(r) r.textContent=String(Number(state.requests)||0);
    if(b) b.textContent=state.booking?'1':'0';
    if(c) c.textContent=String(Number(state.completes)||0);
  }

  function renderState(){
    renderAnalysis(state.currentRequest);
    renderQuotesSelection();
    renderBooking();
    renderHome();
    renderProfile();
  }
  renderState();
  syncPreferenceUI();

  statusButton?.addEventListener('click',async()=>{
    showScreen('profile');
    const panel=$('#platformPanel');
    if(panel) panel.hidden=false;
    const status=$('.status-ok');
    if(status){status.textContent='CHECKING';status.style.opacity='.65'}
    try{
      await fetchApi('health');
      if(status){status.textContent='ONLINE';status.style.opacity='1'}
      showToast('KORUAL API가 정상입니다.');
    }catch(_){
      if(status){status.textContent='DEGRADED';status.style.opacity='1'}
      showToast('API 상태를 확인하지 못했습니다.');
    }
  });

  $('#showPlatformStatus')?.addEventListener('click',async()=>{
    const panel=$('#platformPanel');
    if(panel) panel.hidden=!panel.hidden;
    if(panel&&!panel.hidden){
      try{await fetchApi('health');showToast('플랫폼 API 정상')}
      catch(_){showToast('플랫폼 API 확인 실패')}
    }
  });

  $('#resetDemo')?.addEventListener('click',()=>{
    if(!confirm('이 기기에 저장된 KORUAL 표시 상태를 초기화할까요? 서버 예약 기록은 삭제되지 않습니다.'))return;
    state={requests:0,completes:0,currentRequest:null,selectedQuote:null,booking:null,preferences:{priority:'balanced',verifiedOnly:true,budgetCap:null}};
    try{localStorage.removeItem(STATE_KEY)}catch(_){}
    if(matchInput) matchInput.value='';
    if(analysisTitle) analysisTitle.textContent='요청을 기다리는 중';
    if(analysisState){analysisState.textContent='READY';analysisState.classList.remove('ready')}
    if(detectedBundle) detectedBundle.innerHTML='<span>서비스 감지</span><span>조건 구조화</span><span>비교 기준</span>';
    if(analysisService) analysisService.textContent='—';
    if(goQuotes) goQuotes.disabled=true;
    save();
    showScreen('home');
    showToast('이 기기의 표시 상태를 초기화했습니다.');
  });


  function initMeta3D(){
    const stage=$('#metaStage');
    if(!stage)return;
    const reduce=matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const fine=matchMedia?.('(pointer:fine)')?.matches;
    if(reduce||!fine)return;

    let raf=0;
    stage.addEventListener('pointermove',event=>{
      if(raf)cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{
        const rect=stage.getBoundingClientRect();
        const x=(event.clientX-rect.left)/rect.width-.5;
        const y=(event.clientY-rect.top)/rect.height-.5;
        stage.style.setProperty('--ry',(x*7).toFixed(2)+'deg');
        stage.style.setProperty('--rx',(-y*6).toFixed(2)+'deg');
        const core=$('.meta-core',stage);
        if(core)core.style.transform='translateZ(48px) rotateX('+(-y*6).toFixed(2)+'deg) rotateY('+(x*7).toFixed(2)+'deg)';
        const nodes=$$('.meta-node',stage);
        nodes.forEach((node,index)=>{
          const depth=10+(index%3)*4;
          node.style.translate=(x*depth).toFixed(1)+'px '+(y*depth).toFixed(1)+'px';
        });
      });
    });
    stage.addEventListener('pointerleave',()=>{
      const core=$('.meta-core',stage);
      if(core)core.style.transform='';
      $$('.meta-node',stage).forEach(node=>node.style.translate='');
    });
  }
  initMeta3D();

  if(state.currentRequest) loadQuotes(state.currentRequest);
})();