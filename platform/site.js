(()=>{
  const root=document.documentElement;
  const themeBtn=document.getElementById('themeToggle');
  const menuBtn=document.getElementById('menuToggle');
  const menuClose=document.getElementById('menuClose');
  const backdrop=document.getElementById('mobileMenuBackdrop');
  const form=document.getElementById('quickMatchForm');
  const input=document.getElementById('matchInput');
  const resultContent=document.getElementById('resultContent');
  const resultStatus=document.getElementById('resultStatus');
  const toast=document.getElementById('toast');
  const bundleTitle=document.getElementById('bundleTitle');
  const bundleChips=document.getElementById('bundleChips');
  const quoteSummary=document.getElementById('quoteSummary');
  const selectedQuoteText=document.getElementById('selectedQuoteText');
  const selectedPrice=document.getElementById('selectedPrice');
  const bookNow=document.getElementById('bookNow');
  const bookingModal=document.getElementById('bookingModal');
  const bookingClose=document.getElementById('bookingClose');
  const bookingCancel=document.getElementById('bookingCancel');
  const bookingConfirm=document.getElementById('bookingConfirm');
  const bookingService=document.getElementById('bookingService');
  const bookingQuote=document.getElementById('bookingQuote');
  const lifecycleNow=document.getElementById('lifecycleNow');
  const lifecycleNext=document.getElementById('lifecycleNext');
  const lifecycleRepeat=document.getElementById('lifecycleRepeat');
  const navLinks=[...document.querySelectorAll('[data-nav]')];
  const services=[...document.querySelectorAll('[data-service]')];

  const storedTheme=localStorage.getItem('korual-theme');
  if(storedTheme==='dark') root.dataset.theme='dark';

  function syncTheme(){
    const dark=root.dataset.theme==='dark';
    localStorage.setItem('korual-theme',dark?'dark':'light');
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content',dark?'#080d16':'#f5f7fb');
    if(themeBtn) themeBtn.setAttribute('aria-pressed',String(dark));
  }
  syncTheme();

  themeBtn?.addEventListener('click',()=>{
    root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';
    syncTheme();
  });

  function openMenu(){
    if(!backdrop||!menuBtn)return;
    backdrop.hidden=false;
    menuBtn.textContent='×';
    menuBtn.setAttribute('aria-expanded','true');
    document.body.style.overflow='hidden';
  }
  function closeMenu(){
    if(!backdrop||!menuBtn)return;
    backdrop.hidden=true;
    menuBtn.textContent='☰';
    menuBtn.setAttribute('aria-expanded','false');
    document.body.style.overflow='';
  }
  menuBtn?.addEventListener('click',()=>backdrop.hidden?openMenu():closeMenu());
  menuClose?.addEventListener('click',closeMenu);
  backdrop?.addEventListener('click',e=>{if(e.target===backdrop)closeMenu()});
  backdrop?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});


  const quoteCatalog={
    value:{name:'Partner A',price:128000,trust:91,label:'가성비'},
    best:{name:'Partner B',price:142000,trust:96,label:'AI 추천'},
    premium:{name:'Partner C',price:169000,trust:94,label:'프리미엄'}
  };
  let currentService='';
  let selectedQuote=null;

  function inferBundle(text){
    const q=String(text||'').toLowerCase();
    const set=[];
    const add=v=>{if(!set.includes(v))set.push(v)};
    if(q.includes('이사')||q.includes('입주')){add('이사');add('입주청소');add('인터넷 설치')}
    if(q.includes('청소')) add('청소');
    if(q.includes('에어컨')){add('에어컨');add('설치/세척')}
    if(q.includes('인터넷')) add('인터넷 설치');
    if(q.includes('여행')||q.includes('항공')||q.includes('호텔')){add('항공/숙박');add('공항 이동');add('여행자 서비스')}
    if(q.includes('생활 서비스')){add('생활 서비스');add('가격 비교');add('예약')}
    if(q.includes('ai')){add('조건 분석');add('추천');add('실행 플랜')}
    if(!set.length)add(String(text||'서비스'));
    return set.slice(0,4);
  }

  function updateBundle(service){
    const bundle=inferBundle(service);
    if(bundleTitle) bundleTitle.textContent=bundle.join(' + ');
    if(bundleChips) bundleChips.innerHTML=bundle.map(x=>'<span class="detected">'+escapeHtml(x)+'</span>').join('');
    if(quoteSummary) quoteSummary.textContent=escapeHtml(service)+' 기준 샘플 견적 3개';
    try{localStorage.setItem('korual-last-request',JSON.stringify({service,bundle,at:Date.now()}))}catch(_){}
  }

  function selectQuote(id){
    const quote=quoteCatalog[id]; if(!quote)return;
    selectedQuote={id,...quote};
    document.querySelectorAll('[data-quote-card]').forEach(card=>card.classList.toggle('selected',card.dataset.quoteCard===id));
    if(selectedQuoteText) selectedQuoteText.textContent=quote.label+' · '+quote.name+' · Trust '+quote.trust;
    if(selectedPrice) selectedPrice.textContent='₩'+quote.price.toLocaleString('ko-KR');
    if(bookNow) bookNow.disabled=false;
    try{localStorage.setItem('korual-selected-quote',JSON.stringify({service:currentService,quote,at:Date.now()}))}catch(_){}
    showToast(quote.name+' 견적을 선택했습니다.');
  }

  function openBooking(){
    if(!selectedQuote){showToast('먼저 견적을 선택해주세요.');return}
    if(bookingService) bookingService.textContent=currentService||'선택 서비스';
    if(bookingQuote) bookingQuote.textContent=selectedQuote.name+' · ₩'+selectedQuote.price.toLocaleString('ko-KR');
    if(bookingModal){bookingModal.hidden=false;document.body.style.overflow='hidden'}
  }
  function closeBooking(){if(bookingModal){bookingModal.hidden=true;document.body.style.overflow=''}}
  function confirmBooking(){
    if(!selectedQuote)return;
    const booking={id:'KR-'+Date.now().toString(36).toUpperCase(),service:currentService,quote:selectedQuote,status:'REQUESTED',createdAt:Date.now()};
    try{localStorage.setItem('korual-demo-booking',JSON.stringify(booking))}catch(_){}
    if(lifecycleNow) lifecycleNow.textContent='예약 요청 저장 · '+booking.id;
    if(lifecycleNext) lifecycleNext.textContent='서비스 완료 후 후기 수집';
    if(lifecycleRepeat) lifecycleRepeat.textContent='연관 서비스 자동 추천 준비';
    closeBooking();
    document.getElementById('repeat')?.scrollIntoView({behavior:'smooth',block:'start'});
    showToast('베타 예약 요청을 저장했습니다.');
  }

  let toastTimer;
  function showToast(message){
    if(!toast)return;
    clearTimeout(toastTimer);
    toast.textContent=message;
    toast.hidden=false;
    toastTimer=setTimeout(()=>toast.hidden=true,2600);
  }

  function renderMatch(service){
    const clean=(service||'').trim();
    currentService=clean;
    if(!clean){showToast('필요한 서비스를 입력해주세요.');input?.focus();return}
    services.forEach(btn=>btn.classList.toggle('selected',btn.dataset.service===clean));
    updateBundle(clean);
    if(resultStatus) resultStatus.textContent='MATCHED';
    if(resultContent) resultContent.innerHTML=
      '<p class="result-kicker">KORUAL AI · '+escapeHtml(clean)+'</p>'+
      '<h3>'+escapeHtml(clean)+' 조건을 정리하고<br>비교 후보를 준비합니다.</h3>'+
      '<p>현재 베타 UI에서는 매칭 흐름을 미리 보여줍니다. 다음 단계에서 실제 업체 데이터·가격·예약 API를 연결할 수 있습니다.</p>';
    document.getElementById('match')?.scrollIntoView({behavior:'smooth',block:'start'});
    showToast(clean+' 매칭 흐름을 준비했습니다.');
    setTimeout(()=>document.getElementById('compare')?.scrollIntoView({behavior:'smooth',block:'start'}),450);
  }

  function escapeHtml(value){
    return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  form?.addEventListener('submit',e=>{e.preventDefault();renderMatch(input?.value)});
  services.forEach(btn=>btn.addEventListener('click',()=>{
    const service=btn.dataset.service;
    if(input&&service&&!['생활 서비스','AI 추천'].includes(service)) input.value=service;
    renderMatch(service);
  }));


  document.querySelectorAll('[data-quote]').forEach(btn=>btn.addEventListener('click',()=>selectQuote(btn.dataset.quote)));
  bookNow?.addEventListener('click',openBooking);
  bookingClose?.addEventListener('click',closeBooking);
  bookingCancel?.addEventListener('click',closeBooking);
  bookingConfirm?.addEventListener('click',confirmBooking);
  bookingModal?.addEventListener('click',e=>{if(e.target===bookingModal)closeBooking()});

  try{
    const saved=JSON.parse(localStorage.getItem('korual-demo-booking')||'null');
    if(saved?.id){
      if(lifecycleNow) lifecycleNow.textContent='예약 요청 저장 · '+saved.id;
      if(lifecycleNext) lifecycleNext.textContent='서비스 완료 후 후기 수집';
      if(lifecycleRepeat) lifecycleRepeat.textContent='연관 서비스 자동 추천 준비';
    }
  }catch(_){}

  document.querySelectorAll('[data-scroll]').forEach(btn=>btn.addEventListener('click',()=>{
    document.getElementById(btn.dataset.scroll)?.scrollIntoView({behavior:'smooth',block:'start'});
  }));

  const sections=navLinks.map(a=>document.getElementById(a.dataset.nav)).filter(Boolean);
  if('IntersectionObserver'in window){
    const io=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(!visible)return;
      navLinks.forEach(a=>a.classList.toggle('active',a.dataset.nav===visible.target.id));
    },{rootMargin:'-20% 0px -62% 0px',threshold:[0,.15,.35,.6]});
    sections.forEach(section=>io.observe(section));
  }
})();