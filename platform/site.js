(()=>{
  const $=(q,root=document)=>root.querySelector(q);
  const $$=(q,root=document)=>[...root.querySelectorAll(q)];
  const root=document.documentElement;
  const storageKey='korual-mobile-state-v2';

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

  const quoteCatalog={
    best:{id:'best',name:'Partner B',price:142000,trust:96,label:'AI 추천'},
    value:{id:'value',name:'Partner A',price:128000,trust:91,label:'가성비'},
    premium:{id:'premium',name:'Partner C',price:169000,trust:94,label:'프리미엄'}
  };

  let state={
    requests:0,
    completes:0,
    currentRequest:null,
    selectedQuote:null,
    booking:null
  };

  try{
    const saved=JSON.parse(localStorage.getItem(storageKey)||'null');
    if(saved&&typeof saved==='object') state={...state,...saved};
  }catch(_){}

  function save(){
    try{localStorage.setItem(storageKey,JSON.stringify(state))}catch(_){}
    renderState();
  }

  let toastTimer;
  function showToast(message){
    if(!toast)return;
    clearTimeout(toastTimer);
    toast.textContent=message;
    toast.hidden=false;
    toastTimer=setTimeout(()=>toast.hidden=true,2200);
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
    root.dataset.theme=next;
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

  function renderAnalysis(request){
    if(!request)return;
    if(analysisTitle) analysisTitle.textContent='조건 분석 완료';
    if(analysisState){analysisState.textContent='READY';analysisState.classList.add('ready')}
    if(detectedBundle) detectedBundle.innerHTML=request.bundle.map(x=>'<span class="detected">'+escapeHtml(x)+'</span>').join('');
    if(analysisService) analysisService.textContent=request.service;
    if(analysisPriority) analysisPriority.textContent=request.priority;
    if(analysisNext) analysisNext.textContent='3개 견적 비교';
    if(goQuotes) goQuotes.disabled=false;
    if(quoteContext) quoteContext.textContent=request.service+' · '+request.priority+' 기준의 베타 샘플 견적입니다.';
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

  function escapeHtml(value){
    return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  const quoteList=$('#quoteList');
  const stickyQuoteName=$('#stickyQuoteName');
  const stickyQuotePrice=$('#stickyQuotePrice');
  const bookSelected=$('#bookSelected');

  function renderQuotesSelection(){
    $$('[data-quote-card]').forEach(card=>{
      const selected=state.selectedQuote?.id===card.dataset.quoteCard;
      card.classList.toggle('selected',selected);
    });
    if(state.selectedQuote){
      if(stickyQuoteName) stickyQuoteName.textContent=state.selectedQuote.label+' · '+state.selectedQuote.name;
      if(stickyQuotePrice) stickyQuotePrice.textContent='₩'+Number(state.selectedQuote.price).toLocaleString('ko-KR');
      if(bookSelected) bookSelected.disabled=false;
    }else{
      if(stickyQuoteName) stickyQuoteName.textContent='견적을 선택하세요';
      if(stickyQuotePrice) stickyQuotePrice.textContent='—';
      if(bookSelected) bookSelected.disabled=true;
    }
  }

  $$('[data-quote]').forEach(btn=>btn.addEventListener('click',()=>{
    const quote=quoteCatalog[btn.dataset.quote];
    if(!quote)return;
    if(!state.currentRequest){
      state.currentRequest=inferRequest('생활 서비스');
      state.requests=(Number(state.requests)||0)+1;
    }
    state.selectedQuote={...quote};
    save();
    renderQuotesSelection();
    showToast(quote.name+' 견적을 선택했습니다.');
  }));

  $$('.filter-strip [data-sort]').forEach(btn=>btn.addEventListener('click',()=>{
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

  function createBooking(){
    if(!state.selectedQuote){showToast('먼저 견적을 선택해주세요.');return}
    if(!state.currentRequest) state.currentRequest=inferRequest('생활 서비스');
    state.booking={
      id:'KR-'+Date.now().toString(36).toUpperCase(),
      status:'REQUESTED',
      service:state.currentRequest.service,
      quote:{...state.selectedQuote},
      createdAt:Date.now()
    };
    save();
    showScreen('bookings');
    showToast('예약 요청을 저장했습니다.');
  }
  bookSelected?.addEventListener('click',createBooking);

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
      if(repeat) repeat.textContent='서비스 완료 데이터가 저장되었습니다. 후기와 다음 연관 서비스 추천 단계로 연결됩니다.';
      const complete=$('#completeDemo');
      if(complete){complete.textContent='완료됨';complete.disabled=true}
    }else{
      timeline.forEach((x,i)=>x.classList.toggle('done',i===0));
      const complete=$('#completeDemo');
      if(complete){complete.textContent='완료 시뮬레이션';complete.disabled=false}
    }
  }

  $('#completeDemo')?.addEventListener('click',()=>{
    if(!state.booking)return;
    if(state.booking.status!=='COMPLETED'){
      state.booking.status='COMPLETED';
      state.completes=(Number(state.completes)||0)+1;
      save();
      showToast('서비스 완료 상태로 변경했습니다.');
    }
  });

  function renderHome(){
    const card=$('#homeRecommendation');
    if(!card)return;
    if(state.booking?.status==='COMPLETED'){
      card.innerHTML='<div class="recommend-badge">↻</div><div><small>REPEAT ENGINE</small><strong>다음 연관 서비스를 준비했어요.</strong><p>'+escapeHtml(state.booking.service)+' 완료 이력을 기반으로 후속 서비스를 추천할 수 있습니다.</p></div><button type="button" data-open-screen="services">→</button>';
    }else if(state.booking){
      card.innerHTML='<div class="recommend-badge">B</div><div><small>예약 진행 중</small><strong>'+escapeHtml(state.booking.service)+' 예약을 확인하세요.</strong><p>'+escapeHtml(state.booking.quote?.name||'Partner')+' · '+escapeHtml(state.booking.id)+'</p></div><button type="button" data-open-screen="bookings">→</button>';
    }else if(state.currentRequest){
      card.innerHTML='<div class="recommend-badge">AI</div><div><small>최근 요청</small><strong>'+escapeHtml(state.currentRequest.service)+' 견적을 비교해보세요.</strong><p>'+state.currentRequest.bundle.map(escapeHtml).join(' · ')+'</p></div><button type="button" data-open-screen="quotes">→</button>';
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

  statusButton?.addEventListener('click',()=>{
    showScreen('profile');
    const panel=$('#platformPanel');
    if(panel) panel.hidden=false;
  });
  $('#showPlatformStatus')?.addEventListener('click',()=>{
    const panel=$('#platformPanel');
    if(panel) panel.hidden=!panel.hidden;
  });

  $('#resetDemo')?.addEventListener('click',()=>{
    if(!confirm('KORUAL 베타 요청과 예약 데이터를 초기화할까요?'))return;
    state={requests:0,completes:0,currentRequest:null,selectedQuote:null,booking:null};
    try{localStorage.removeItem(storageKey)}catch(_){}
    if(matchInput) matchInput.value='';
    if(analysisTitle) analysisTitle.textContent='요청을 기다리는 중';
    if(analysisState){analysisState.textContent='READY';analysisState.classList.remove('ready')}
    if(detectedBundle) detectedBundle.innerHTML='<span>서비스 감지</span><span>조건 구조화</span><span>비교 기준</span>';
    if(analysisService) analysisService.textContent='—';
    if(goQuotes) goQuotes.disabled=true;
    save();
    showScreen('home');
    showToast('베타 데이터를 초기화했습니다.');
  });
})();