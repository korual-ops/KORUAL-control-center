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

  const sampleQuotes={
    best:{id:'best',name:'KORUAL Demo Recommended',price:142000,trust:96,label:'AI 추천',provider_key:'demo_best',verified:true,rating:4.9,reviews:264,response:8,jobs:534},
    value:{id:'value',name:'KORUAL Demo Value',price:128000,trust:91,label:'가성비',provider_key:'demo_value',verified:true,rating:4.8,reviews:128,response:18,jobs:286},
    premium:{id:'premium',name:'KORUAL Demo Premium',price:169000,trust:94,label:'프리미엄',provider_key:'demo_premium',verified:true,rating:5.0,reviews:96,response:12,jobs:178}
  };
  let quoteCatalog={...sampleQuotes};
  let quoteMode='sample';
  let liveQuoteKeys=new Set();
  let quoteRequestVersion=0;
  let sortMode='recommended';

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

  state.history=Array.isArray(state.history)?state.history.filter(x=>x&&typeof x.raw==='string'&&Array.isArray(x.bundle)).slice(0,20):[];

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
    if(updateHash && location.hash!=='#'+name) history.pushState(null,'','#'+name);
    tabs.forEach(tab=>tab.setAttribute('aria-current',tab.dataset.tab===name?'page':'false'));
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
    const add=x=>{if(x&&!bundle.includes(x))bundle.push(x)};

    if(/입주\s*청소/.test(q)) add('입주청소');
    if(/이사/.test(q)) add('이사');
    if(/인터넷|와이파이|wifi/i.test(q)) add('인터넷 설치');
    if(/에어컨/.test(q)) add('에어컨');
    if(/인테리어|리모델링/.test(q)) add('인테리어');
    if(/수리|시공|설비|커튼/.test(q)) add('수리·시공');
    if(/여행|항공|호텔|숙박/.test(q)) add('여행');
    if(/웰니스|운동|마사지|케어/.test(q)) add('웰니스');
    if(/커머스|상품|주문|배송/.test(q)) add('커머스 운영');
    if(/청소/.test(q)&&!bundle.includes('입주청소')) add('청소');
    if(!bundle.length&&/생활\s*서비스/.test(q)) add('생활 서비스');

    let priorityMode='balanced';
    let preferenceExplicit=false;
    if(/가격\s*우선|저렴|싼|가성비|예산\s*우선/.test(q)){priorityMode='price';preferenceExplicit=true}
    if(/신뢰\s*우선|검증\s*우선|후기\s*우선|안전\s*우선/.test(q)){priorityMode='trust';preferenceExplicit=true}
    if(/속도\s*우선|빠른|급해|긴급|오늘|내일/.test(q)){priorityMode='speed';preferenceExplicit=true}
    if(/균형|가격\s*\+\s*신뢰/.test(q)){priorityMode='balanced';preferenceExplicit=true}

    const priorityLabels={balanced:'가격 + 신뢰',price:'가격 우선',trust:'신뢰 우선',speed:'속도 우선'};

    let budgetCap=null;
    const man=q.match(/(?:예산[^0-9]{0,12})?(\d+(?:\.\d+)?)\s*만\s*원?/);
    const won=q.match(/(?:예산[^0-9]{0,12})?(\d{4,})\s*원/);
    if(man){
      const value=Math.round(Number(man[1])*10000);
      if(Number.isFinite(value)&&value>0&&value<=100000000) budgetCap=value;
    }else if(won){
      const value=Math.round(Number(won[1]));
      if(Number.isFinite(value)&&value>0&&value<=100000000) budgetCap=value;
    }

    const service=bundle.length===1?bundle[0]:bundle.length>1?bundle[0]:'일반 서비스';
    if(!bundle.length)add(raw||'서비스');

    return {
      raw,
      service,
      bundle:bundle.slice(0,6),
      priority:priorityLabels[priorityMode],
      priorityMode,
      preferenceExplicit,
      budgetCap
    };
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
  const quoteInsight=$('#quoteInsight');
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
    if(analysisNext) analysisNext.textContent='조건에 맞는 견적 확인';
    if(goQuotes) goQuotes.disabled=false;
    if(quoteContext) quoteContext.textContent=request.service+' · '+request.priority+' 기준의 베타 견적입니다.';
  }

  async function loadQuotes(request){
    if(!request)return;
    const version=++quoteRequestVersion;
    quoteMode='loading';
    liveQuoteKeys.clear();
    quoteCatalog={...sampleQuotes};
    state.selectedQuote=null;
    for(const key of Object.keys(sampleQuotes)) updateQuoteCard({key,provider_name:sampleQuotes[key].name,amount:sampleQuotes[key].price,trust:sampleQuotes[key].trust,label:sampleQuotes[key].label,rating:sampleQuotes[key].rating,response_minutes:sampleQuotes[key].response});
    renderQuotesSelection();
    if(quoteContext) quoteContext.textContent='서버에서 검증된 베타 견적을 불러오는 중…';
    try{
      normalizePreferences();
      const requestForApi={
        ...request,
        priority_mode:state.preferences.priority,
        budget_cap:state.preferences.budgetCap||null
      };
      const data=await fetchApi('quotes',{request:requestForApi});
      if(version!==quoteRequestVersion)return;
      if(Array.isArray(data.quotes)&&data.quotes.length){
        for(const q of data.quotes){
          if(!Object.hasOwn(sampleQuotes,q.key)||!q.provider_key||!Number.isFinite(Number(q.amount))||Number(q.amount)<0)continue;
          q.decision_context=data.decision_context||null;
          q.recommendation_run_id=data.recommendation_run_id||null;
          liveQuoteKeys.add(q.key);
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
            jobs:Number(q.completed_jobs)||0,
            rankingScore:Number.isFinite(Number(q.ranking_score))?Number(q.ranking_score):null,
            confidence:Number.isFinite(Number(q.confidence_score))?Number(q.confidence_score):null,
            reasons:Array.isArray(q.reasons)?q.reasons.slice(0,3):[],
            breakdown:q.score_breakdown&&typeof q.score_breakdown==='object'?q.score_breakdown:null,
            lineItems:Array.isArray(q.line_items)?q.line_items.slice(0,8):[],
            pareto:q.pareto_efficient===true,
            roles:Array.isArray(q.roles)?q.roles.slice(0,3):[],
            explanation:q.explanation&&typeof q.explanation==='object'?q.explanation:null,
            decisionContext:data?.decision_context||null,
            recommendationRunId:data?.recommendation_run_id||null,
            enginePriority:data?.request?.priority_mode||null,
            engineVersion:data?.engine_version||null
          };
          updateQuoteCard(q);
        }
        quoteMode=liveQuoteKeys.size?'live':'sample';
      }else{
        quoteMode='sample';
      }
    }catch(err){
      if(version!==quoteRequestVersion)return;
      quoteMode='sample';
      showToast('견적 서버 연결이 불안정해 샘플 모드로 표시합니다.');
    }
    renderQuotesSelection();
  }

  function updateQuoteCard(q){
    const card=$('[data-quote-card="'+q.key+'"]');
    if(!card)return;
    card.dataset.price=String(q.amount||0);
    card.dataset.trust=String(q.trust||0);
    card.dataset.matchScore=Number.isFinite(Number(q.ranking_score))?String(q.ranking_score):'';
    card.dataset.confidence=Number.isFinite(Number(q.confidence_score))?String(q.confidence_score):'';
    card.dataset.pareto=q.pareto_efficient===true?'true':'false';
    card.dataset.roles=Array.isArray(q.roles)?q.roles.join('|'):'';
    card.dataset.reasons=Array.isArray(q.reasons)?q.reasons.join('|'):'';
    card.dataset.scoreBreakdown=q.score_breakdown?JSON.stringify(q.score_breakdown):'';
    card.dataset.decisionLevel=q.decision_context?.level||'';
    card.dataset.decisionGap=q.decision_context?.score_gap==null?'':String(q.decision_context.score_gap);
    const providerName=$('.provider-row strong',card);
    const providerMeta=$('.provider-row small',card);
    const price=$('.price-row strong',card);
    const priceLabel=$('.price-row > span',card);
    const trust=$('.trust-row strong',card);
    const score=$('.score i',card);
    const rating=$('.fact-grid span:nth-child(1) b',card);
    const response=$('.fact-grid span:nth-child(2) b',card);
    if(providerName) providerName.textContent=q.provider_name||'KORUAL Demo Partner';
    if(providerMeta) providerMeta.textContent=q.provider_key?'서버 조회 · 베타 데이터':'예시 데이터 · 예약 불가';
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
    normalizePreferences();
    if(request.preferenceExplicit&&['balanced','price','trust','speed'].includes(request.priorityMode)){
      state.preferences.priority=request.priorityMode;
    }else{
      request.priorityMode=state.preferences.priority;
      request.priority={balanced:'가격 + 신뢰',price:'가격 우선',trust:'신뢰 우선',speed:'속도 우선'}[state.preferences.priority]||'가격 + 신뢰';
    }
    if(Number.isFinite(Number(request.budgetCap))&&Number(request.budgetCap)>0){
      state.preferences.budgetCap=Number(request.budgetCap);
    }
    state.currentRequest=request;
    state.selectedQuote=null;
    quoteMode='loading';
    if(count) state.requests=(Number(state.requests)||0)+1;
    state.history=[{...request,createdAt:Date.now()},...state.history.filter(x=>x.raw!==request.raw)].slice(0,20);
    save();
    renderAnalysis(request);
    syncPreferenceUI();
    renderQuotesSelection();
    loadQuotes(request);
    showToast(request.budgetCap?'요청과 예산을 함께 분석했습니다.':'요청을 분석했습니다.');
  }

  matchForm?.addEventListener('submit',e=>{e.preventDefault();analyze(matchInput?.value)});
  $$('[data-prompt]').forEach(btn=>btn.addEventListener('click',()=>{
    if(matchInput) matchInput.value=btn.dataset.prompt||'';
    analyze(btn.dataset.prompt);
  }));
  $$('[data-service]').forEach(btn=>btn.addEventListener('click',()=>{
    const region=$('#serviceRegion')?.value||'';
    const value=(region ? region+' 지역에서 ' : '')+(btn.dataset.service||'');
    if(region && $('#customerRegion')) $('#customerRegion').value=region;
    showScreen('match');
    if(matchInput) matchInput.value=value;
    analyze(value);
  }));
  goQuotes?.addEventListener('click',()=>showScreen('quotes'));

  // Filter labels and descriptions, without inserting user input as markup.
  const serviceSearch=$('#serviceSearch');
  const serviceRegion=$('#serviceRegion');
  function filterServices(){
    const query=(serviceSearch?.value||'').trim().toLocaleLowerCase();
    let count=0;
    $$('.service-list .service-row').forEach(row=>{
      row.hidden=!row.textContent.toLocaleLowerCase().includes(query);
      if(!row.hidden) count++;
    });
    const status=$('#serviceResultCount');
    if(status) status.textContent=count ? count+'개 서비스 분야 · '+(serviceRegion?.value||'전국') : '일치하는 서비스가 없습니다. 검색어를 바꾸거나 AI 매칭에서 직접 요청하세요.';
  }
  serviceSearch?.addEventListener('input',filterServices);
  serviceRegion?.addEventListener('change',filterServices);
  filterServices();


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
    if(!q)return -1;
    const prices=Object.entries(quoteCatalog)
      .filter(([key])=>quoteMode!=='live'||liveQuoteKeys.has(key))
      .map(([,x])=>Number(x.price)||0)
      .filter(Boolean);
    const min=prices.length?Math.min(...prices):Number(q.price)||0;
    const max=prices.length?Math.max(...prices):Number(q.price)||0;
    const price=max===min?85:100-(((Number(q.price)||0)-min)/(max-min))*35;
    const trust=Math.max(0,Math.min(100,Number(q.trust)||0));
    const reviewCount=Math.max(0,Number(q.reviews)||0);
    const rating=Math.max(0,Math.min(5,Number(q.rating)||0));
    const adjustedRating=(reviewCount*rating+40*4.5)/(reviewCount+40);
    const ratingScore=Math.max(0,Math.min(100,adjustedRating/5*100));
    const response=Number(q.response);
    const responseScore=!Number.isFinite(response)?55:response<=10?100:response<=20?90:response<=45?78:response<=90?65:response<=180?50:38;
    const jobs=Math.max(0,Number(q.jobs)||0);
    const experience=Math.max(0,Math.min(100,45+55*(1-Math.exp(-jobs/250))));
    const verification=q.verified?100:40;
    const confidence=Number.isFinite(Number(q.confidence))?Number(q.confidence):Math.max(0,Math.min(100,
      (q.verified?25:0)+Math.min(25,reviewCount/200*25)+Math.min(20,jobs/300*20)+(Number.isFinite(response)?15:0)+(rating>0?15:0)
    ));
    const weights={
      balanced:{price:.30,trust:.30,rating:.15,response:.10,experience:.10,verification:.05},
      price:{price:.50,trust:.20,rating:.10,response:.08,experience:.07,verification:.05},
      trust:{price:.15,trust:.40,rating:.20,response:.08,experience:.12,verification:.05},
      speed:{price:.15,trust:.25,rating:.15,response:.30,experience:.10,verification:.05}
    }[state.preferences.priority]||{price:.30,trust:.30,rating:.15,response:.10,experience:.10,verification:.05};
    const weighted=price*weights.price+trust*weights.trust+ratingScore*weights.rating+responseScore*weights.response+experience*weights.experience+verification*weights.verification;
    return Math.max(0,Math.min(100,weighted*(.92+.08*(confidence/100))));
  }

  function decisionReasons(q){
    if(!q)return [];
    const prices=Object.entries(quoteCatalog)
      .filter(([key])=>quoteMode!=='live'||liveQuoteKeys.has(key))
      .map(([,x])=>Number(x.price)||0).filter(Boolean);
    const low=prices.length?Math.min(...prices):Number(q.price)||0;
    const reasons=[];
    if((Number(q.price)||0)<=low*1.03)reasons.push('표시 견적 중 가격 경쟁력');
    if(Number(q.trust)>=94)reasons.push('높은 Trust Score');
    if(Number.isFinite(Number(q.response))&&Number(q.response)<=10)reasons.push('빠른 평균 응답');
    if(Number(q.jobs)>=300)reasons.push('완료 이력 풍부');
    if(Number(q.rating)>=4.9&&Number(q.reviews)>=100)reasons.push('평점·리뷰 표본 강점');
    const confidence=Number(q.confidence);
    if(Number.isFinite(confidence)&&confidence<80)reasons.push('데이터 표본 추가 확인');
    if(!reasons.length)reasons.push('가격·신뢰·응답의 균형 후보');
    return reasons.slice(0,3);
  }

  function preferenceLabel(){
    const map={balanced:'균형',price:'가격',trust:'신뢰',speed:'속도'};
    return map[state.preferences.priority]||'균형';
  }

  function isEligible(id){
    const q=quoteCatalog[id];
    return Boolean(q && quoteMode==='live' && liveQuoteKeys.has(id) &&
      (!state.preferences.verifiedOnly||q.verified) &&
      (!state.preferences.budgetCap||q.price<=state.preferences.budgetCap));
  }

  function applyDecisionLens(){
    normalizePreferences();
    const list=$('#quoteList');
    if(!list)return;
    const entries=$$('[data-quote-card]',list).map(card=>{
      const q=quoteCatalog[card.dataset.quoteCard];
      const overBudget=state.preferences.budgetCap && q && Number(q.price)>state.preferences.budgetCap;
      const unverified=state.preferences.verifiedOnly && q && !q.verified;
      const unavailable=quoteMode==='live'&&!liveQuoteKeys.has(card.dataset.quoteCard);
      card.classList.toggle('is-filtered',Boolean(overBudget||unverified||unavailable));
      card.hidden=Boolean(overBudget||unverified||unavailable);
      const select=$('[data-quote]',card);
      if(select) select.disabled=!isEligible(card.dataset.quoteCard);
      const rank=$('.quote-rank,.ai-pick,.value-pick,.premium-pick',card);
      if(rank)rank.textContent=q?.label||'견적';
      card.classList.toggle('is-sample',quoteMode!=='live'||unavailable);
      const badge=$('.verified',card);
      if(badge) badge.textContent=quoteMode==='live'&&!unavailable?(q.verified?'✓ 검증':'미검증'):'예시';
      card.classList.remove('is-top-choice','featured');
      const decisionScore=q?scoreQuote(q):-1;
      const providerMeta=$('.provider-row small',card);
      if(providerMeta&&q){
        if(quoteMode==='live'&&!unavailable){
          const confidence=Number.isFinite(Number(q.confidence))?' · Confidence '+Math.round(Number(q.confidence))+'%':'';
          providerMeta.textContent='서버 베타 · Match '+Math.round(decisionScore)+confidence;
        }else{
          providerMeta.textContent='예시 데이터 · 예약 불가';
        }
      }
      return {card,q,score:decisionScore,hidden:Boolean(overBudget||unverified||unavailable)};
    });
    entries.sort((a,b)=>sortMode==='price'?a.q.price-b.q.price:sortMode==='trust'?b.q.trust-a.q.trust:b.score-a.score);
    entries.forEach(x=>list.appendChild(x.card));
    const top=entries.find(x=>!x.hidden);
    const empty=$('#quoteEmpty');
    if(empty)empty.hidden=Boolean(top);
    const retry=$('#retryQuotes');
    if(retry){retry.disabled=quoteMode==='loading'||!state.currentRequest;retry.textContent=quoteMode==='loading'?'견적 확인 중…':'견적 다시 조회';}
    if(state.selectedQuote&&!isEligible(state.selectedQuote.id)){
      state.selectedQuote=null;
      if(stickyQuoteName)stickyQuoteName.textContent='조건에 맞는 견적을 선택하세요';
      if(stickyQuotePrice)stickyQuotePrice.textContent='—';
      if(bookSelected)bookSelected.disabled=true;
      $$('[data-quote-card]').forEach(card=>card.classList.remove('selected'));
    }
    if(top){
      top.card.classList.add('is-top-choice','featured');
      const badge=$('.quote-rank,.ai-pick,.value-pick,.premium-pick',top.card);
      if(badge){
        const role=Array.isArray(top.q?.roles)&&top.q.roles.length?top.q.roles[0]:'균형 비교 후보';
        badge.textContent=quoteMode==='live'?role:'비교 예시';
      }
    }
    if(quoteContext&&state.currentRequest){
      const cap=state.preferences.budgetCap?' · '+Number(state.preferences.budgetCap).toLocaleString('ko-KR')+'원 이하':'';
      const mode=quoteMode==='live'?liveQuoteKeys.size+'개 서버 베타 견적':quoteMode==='loading'?'서버 확인 중 · 예시 표시':'예시 견적 · 예약 불가';
      quoteContext.textContent=state.currentRequest.service+' · '+mode+' · '+preferenceLabel()+' 우선'+cap;
    }
    if(quoteInsight){
      const amounts=[...liveQuoteKeys].map(key=>Number(quoteCatalog[key]?.price)).filter(x=>Number.isFinite(x)&&x>=0);
      if(quoteMode==='live'&&amounts.length){
        const low=Math.min(...amounts),high=Math.max(...amounts);
        quoteInsight.textContent='서버 베타 견적 '+amounts.length+'개 · 표시 가격 '+low.toLocaleString('ko-KR')+'~'+high.toLocaleString('ko-KR')+'원. 예약은 베타 요청으로 저장됩니다. 실제 제공 여부·서비스 범위·추가 비용을 확인하세요.';
      }else{
        quoteInsight.textContent=quoteMode==='loading'?'파트너 연결을 확인하는 동안 예시 카드를 보여드립니다.':'예시 금액과 평점은 실제 견적이 아닙니다. 예약 전 서비스 범위와 최종 금액을 확인하세요.';
      }
    }
  }

  function syncPreferenceUI(){
    normalizePreferences();
    $$('[data-priority]').forEach(btn=>btn.classList.toggle('is-active',btn.dataset.priority===state.preferences.priority));
    if(verifiedOnly) verifiedOnly.checked=state.preferences.verifiedOnly;
    if(budgetCap) budgetCap.value=state.preferences.budgetCap||'';
    applyDecisionLens();
  }

  function recommendationReason(q){
    if(!q)return '추천 근거를 확인할 수 없습니다.';
    const reasons=decisionReasons(q);
    const basis={
      balanced:'가격·신뢰·평점·응답·완료이력을 함께 본 균형 기준',
      price:'가격 비중을 높이되 신뢰·응답·이력을 함께 본 기준',
      trust:'Trust·평점·리뷰·완료이력을 더 크게 반영한 기준',
      speed:'응답속도를 우선하되 가격·신뢰가 과도하게 불리하지 않은 기준'
    }[state.preferences.priority]||'다중 기준';
    return basis+'입니다. '+reasons.join(' · ')+'. 데이터 신뢰도를 함께 반영하며 최종 선택은 사용자가 합니다.';
  }

  function openTrust(id){
    const q=quoteCatalog[id];
    if(!q||!trustSheet)return;
    const isSample=quoteMode!=='live'||!liveQuoteKeys.has(id);
    $('.trust-disclosure p').textContent=isSample?'예시 수치입니다. 실제 업체 검증·리뷰·보증을 의미하지 않습니다.':'서버에서 조회한 베타 데이터입니다. 업체의 실제 서비스 범위와 취소·보증 조건을 별도로 확인하세요.';
    $('#trustTitle').textContent=q.name||'파트너 신뢰 정보';
    $('#trustScoreLarge').textContent=String(Math.round(Number(q.trust)||0));
    $('#trustReason').textContent=recommendationReason(q);
    $('#trustVerified').textContent=isSample?'예시 데이터':q.verified?'서버 표시: 검증':'미검증';
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
      if(bookSelected) bookSelected.disabled=quoteMode!=='live'||!liveQuoteKeys.has(state.selectedQuote.id);
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
    if(!isEligible(quote.id)){showToast('현재 조건에 맞는 서버 견적만 선택할 수 있습니다.');return}
    if(!state.currentRequest){
      state.currentRequest=inferRequest('생활 서비스');
      state.requests=(Number(state.requests)||0)+1;
    }
    state.selectedQuote={...quote};
    save();
    showToast(quote.name+' 견적을 선택했습니다.');
  });


    $$('[data-priority]').forEach(btn=>btn.addEventListener('click',()=>{
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

  budgetCap?.addEventListener('input',()=>{
    normalizePreferences();
    const cap=Number(budgetCap.value);
    state.preferences.budgetCap=Number.isFinite(cap)&&cap>0?cap:null;
    save();
    applyDecisionLens();
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

    $$('.filter-strip [data-sort]').forEach(btn=>btn.addEventListener('click',()=>{
    $$('.filter-strip [data-sort]').forEach(x=>x.classList.toggle('is-active',x===btn));
    sortMode=btn.dataset.sort;
    applyDecisionLens();
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
    if(!isEligible(state.selectedQuote?.id)){showToast('예시 견적은 예약할 수 없습니다. 실제 견적 연결을 확인해주세요.');return}
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
    if(!state.selectedQuote||!state.currentRequest||!isEligible(state.selectedQuote.id))return;
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
        PROVIDER_UNAVAILABLE:'선택한 업체가 현재 이용 불가 상태입니다.',
        PROVIDER_NOT_VERIFIED:'검증 상태가 확인되지 않아 예약할 수 없습니다.',
        SERVICE_NOT_SUPPORTED:'선택한 업체의 제공 서비스 범위를 다시 확인해주세요.',
        REGION_NOT_SUPPORTED:'선택한 업체가 해당 지역을 지원하지 않습니다.',
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
    renderHistory();
  }
  renderState();
  syncPreferenceUI();

  async function checkPlatform(){
    const panel=$('#platformPanel');
    if(panel)panel.hidden=false;
    const status=$('.status-ok');
    status.textContent='확인 중';
    $('#apiHealth').textContent='확인 중';
    $('#webHealth').textContent='확인 중';
    const results=await Promise.allSettled([
      fetch('/healthz',{signal:AbortSignal.timeout(9000)}).then(async r=>{if(!r.ok||!(await r.json()).ok)throw Error();}),
      fetchApi('health')
    ]);
    $('#webHealth').textContent=results[0].status==='fulfilled'?'정상':'연결 확인 필요';
    $('#apiHealth').textContent=results[1].status==='fulfilled'?'정상':'연결 확인 필요';
    status.textContent=results.every(x=>x.status==='fulfilled')?'정상':'일부 연결 확인 필요';
    $('#healthChecked').textContent=new Date().toLocaleTimeString('ko-KR');
  }
  statusButton?.addEventListener('click',()=>{showScreen('profile');checkPlatform();});
  $('#showPlatformStatus')?.addEventListener('click',checkPlatform);

  function renderHistory(){
    const list=$('#requestHistory');
    if(!list)return;
    list.replaceChildren();
    if(!state.history.length){list.textContent='아직 저장된 요청이 없습니다.';return;}
    state.history.forEach(request=>{
      const button=document.createElement('button');
      button.type='button';button.className='history-item';
      const title=document.createElement('strong');title.textContent=request.raw;
      const meta=document.createElement('small');meta.textContent=request.service+' · 다시 비교';
      button.append(title,meta);
      button.addEventListener('click',()=>{matchInput.value=request.raw;showScreen('match');analyze(request.raw,{count:false});});
      list.append(button);
    });
  }
  $('#retryQuotes')?.addEventListener('click',()=>loadQuotes(state.currentRequest));
  $('#clearQuoteFilters')?.addEventListener('click',()=>{
    state.preferences.budgetCap=null;
    state.preferences.verifiedOnly=false;
    save();syncPreferenceUI();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){closeTrust();closeSheet();}
  });

  $('#resetDemo')?.addEventListener('click',()=>{
    if(!confirm('이 기기에 저장된 KORUAL 표시 상태를 초기화할까요? 서버 예약 기록은 삭제되지 않습니다.'))return;
    quoteRequestVersion++;quoteMode='sample';liveQuoteKeys.clear();quoteCatalog={...sampleQuotes};
    state={history:[],requests:0,completes:0,currentRequest:null,selectedQuote:null,booking:null,preferences:{priority:'balanced',verifiedOnly:true,budgetCap:null}};
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

