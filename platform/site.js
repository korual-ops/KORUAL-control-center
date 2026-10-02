(()=>{
  const $=(q,root=document)=>root.querySelector(q);
  const $$=(q,root=document)=>[...root.querySelectorAll(q)];
  const root=document.documentElement;
  const uiText=(key,fallback)=>window.KORUAL_I18N?.translate?.(key)||fallback;
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
  let quoteAbortController=null;
  const quoteResponseCache=new Map();
  const trackedRecommendationEvents=new Set();
  let sortMode='recommended';

  let state={
    requests:0,
    completes:0,
    currentRequest:null,
    selectedQuote:null,
    booking:null,
    bundlePlan:null,
    bundleBooking:null,
    recoveryContext:null,
    preferences:{priority:'balanced',verifiedOnly:true,budgetCap:null}
  };

  try{
    const saved=JSON.parse(sessionStorage.getItem(STATE_KEY)||localStorage.getItem(STATE_KEY)||'null');
    if(saved&&typeof saved==='object') state={...state,...saved};
  }catch(_){}

  let sessionId='';
  try{sessionId=sessionStorage.getItem(SESSION_KEY)||localStorage.getItem(SESSION_KEY)||''}catch(_){}
  if(!/^[A-Za-z0-9_-]{32,80}$/.test(sessionId)){
    const bytes=globalThis.crypto.getRandomValues(new Uint8Array(24));
    const raw=Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
    sessionId=('ks_'+raw.replace(/-/g,'_')).slice(0,80);
  }
  try{sessionStorage.setItem(SESSION_KEY,sessionId);localStorage.removeItem(SESSION_KEY);localStorage.removeItem(STATE_KEY)}catch(_){}

  state=KorualPrivacy.sanitizeState(state);

  // Keep customer contact details in server-backed booking records, not long-lived browser storage.
  // Existing v3 local state is sanitized immediately on boot so older cached PII is removed too.
  function stateForLocalStorage(){
    return KorualPrivacy.sanitizeState(state);
  }

  function persistState(){
    try{sessionStorage.setItem(STATE_KEY,JSON.stringify(stateForLocalStorage()))}catch(_){}
  }

  if(state.booking?.customer)delete state.booking.customer;
  if(state.bundleBooking){
    delete state.bundleBooking.customer;
    delete state.bundleBooking.customer_name;
    delete state.bundleBooking.phone;
  }
  persistState();

  function save(){
    persistState();
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
    window.dispatchEvent(new CustomEvent('korual:screen-changed',{detail:{screen:name}}));
    window.scrollTo({top:0,behavior:'auto'});
    if(name==='bookings') queueMicrotask(()=>{
      syncBookingStatus({silent:true});
      syncBundleStatus({silent:true});
    });
  }

  tabs.forEach(tab=>tab.addEventListener('click',()=>showScreen(tab.dataset.tab)));
  $$('[data-open-screen]').forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.openScreen)));
  window.addEventListener('hashchange',()=>showScreen(location.hash.slice(1)||'home',{updateHash:false}));
  window.addEventListener('popstate',()=>showScreen(location.hash.slice(1)||'home',{updateHash:false}));
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

  async function fetchApi(action,payload={},options={}){
    const controller=new AbortController();
    const externalSignal=options?.signal;
    const forwardAbort=()=>controller.abort();
    if(externalSignal?.aborted)controller.abort();
    else externalSignal?.addEventListener?.('abort',forwardAbort,{once:true});
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
        if(data.error==='PRIVATE_DATA_IN_REQUEST')showToast('개인정보를 제외하고 서비스 조건만 입력해주세요.');
        const err=new Error(data.error||'API_ERROR');
        err.code=data.error||'API_ERROR';
        throw err;
      }
      return data;
    }finally{
      clearTimeout(timer);
      externalSignal?.removeEventListener?.('abort',forwardAbort);
    }
  }

  function bestEffortTrack(eventType,quote={},extra={}){
    const runId=quote?.recommendationRunId||extra?.recommendationRunId||null;
    if(!runId)return;
    const providerKey=quote?.provider_key||extra?.provider_key||null;
    const position=Number(quote?.position||extra?.position)||null;
    const dedupeKey=[eventType,runId,providerKey||'',position||''].join('|');
    if((eventType==='impression'||eventType==='select')&&trackedRecommendationEvents.has(dedupeKey))return;
    if(eventType==='impression'||eventType==='select')trackedRecommendationEvents.add(dedupeKey);
    fetchApi('track',{
      event_type:eventType,
      recommendation_run_id:runId,
      provider_key:providerKey,
      position,
      page:'quotes',
      decision_status:quote?.decisionContext?.status||extra?.decision_status||null
    }).catch(()=>{});
  }

  function optionalNumber(value){
    if(value==null||typeof value==='boolean'||(typeof value==='string'&&!value.trim()))return null;
    const number=Number(value);
    return Number.isFinite(number)?number:null;
  }

  function validUniqueQuotes(quotes){
    const seen=new Set();
    return (Array.isArray(quotes)?quotes:[]).filter(quote=>{
      const key=typeof quote?.provider_key==='string'?quote.provider_key.trim():'';
      const amount=optionalNumber(quote?.amount);
      if(!key||amount===null||amount<0||seen.has(key))return false;
      seen.add(key);
      return true;
    });
  }

  function quoteCacheKey(request){
    return JSON.stringify({
      raw:String(request?.raw||'').trim(),
      service:String(request?.service||'').trim(),
      region:String(request?.region||'').trim(),
      bundle:Array.isArray(request?.bundle)?request.bundle.slice(0,8):[],
      priority_mode:String(request?.priority_mode||'balanced'),
      budget_cap:Number(request?.budget_cap)||null,
      desired_date:String(request?.desired_date||request?.desiredDate||'').trim()||null,
      exclude_provider_keys:Array.isArray(request?.exclude_provider_keys)
        ?[...new Set(request.exclude_provider_keys)].sort().slice(0,8)
        :Array.isArray(request?.excludeProviderKeys)
          ?[...new Set(request.excludeProviderKeys)].sort().slice(0,8)
          :[]
    });
  }

  async function fetchQuotesStable(requestForApi,signal){
    const key=quoteCacheKey(requestForApi);
    const cached=quoteResponseCache.get(key);
    if(cached&&Date.now()-cached.at<15000)return cached.data;
    const data=await fetchApi('quotes',{request:requestForApi},{signal});
    if(signal?.aborted)throw new DOMException('Request cancelled','AbortError');
    quoteResponseCache.set(key,{at:Date.now(),data});
    if(quoteResponseCache.size>12){
      const oldest=[...quoteResponseCache.entries()].sort((a,b)=>a[1].at-b[1].at)[0]?.[0];
      if(oldest)quoteResponseCache.delete(oldest);
    }
    return data;
  }

  function addSeoulDays(days){
    const base=localDateString(new Date());
    const d=new Date(base+'T00:00:00Z');
    d.setUTCDate(d.getUTCDate()+days);
    return d.toISOString().slice(0,10);
  }

  function normalizeInferredDate(year,month,day){
    const y=Number(year),m=Number(month),d=Number(day);
    if(!Number.isInteger(y)||!Number.isInteger(m)||!Number.isInteger(d)||m<1||m>12||d<1||d>31)return null;
    const value=String(y).padStart(4,'0')+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const parsed=new Date(value+'T00:00:00Z');
    if(Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==value)return null;
    const today=localDateString(new Date());
    const max=addSeoulDays(366);
    return value>=today&&value<=max?value:null;
  }

  function inferDesiredDate(text){
    const raw=String(text||'').trim();
    if(!raw)return null;

    const full=raw.match(/(20\d{2})\s*(?:년|[-./])\s*(\d{1,2})\s*(?:월|[-./])\s*(\d{1,2})\s*일?/);
    if(full)return normalizeInferredDate(full[1],full[2],full[3]);

    if(/모레/.test(raw))return addSeoulDays(2);
    if(/내일/.test(raw))return addSeoulDays(1);
    if(/오늘/.test(raw))return addSeoulDays(0);

    const md=raw.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
    if(md){
      const today=localDateString(new Date());
      const currentYear=Number(today.slice(0,4));
      return normalizeInferredDate(currentYear,md[1],md[2])||
        normalizeInferredDate(currentYear+1,md[1],md[2]);
    }
    return null;
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
      budgetCap,
      desiredDate:inferDesiredDate(raw)
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
  const quoteEmptyTitle=$('#quoteEmptyTitle');
  const quoteEmptyMessage=$('#quoteEmptyMessage');
  const quoteDesiredDate=$('#quoteDesiredDate');
  const bundlePlanCard=$('#bundlePlanCard');
  const bundlePlanStatus=$('#bundlePlanStatus');
  const bundlePlanMessage=$('#bundlePlanMessage');
  const bundlePlanItems=$('#bundlePlanItems');
  const bundlePlanTotal=$('#bundlePlanTotal');
  const prepareBundleBooking=$('#prepareBundleBooking');
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
    if($('#analysisRegion')) $('#analysisRegion').textContent=request.region||'미입력';
    if($('#analysisDate')) $('#analysisDate').textContent=request.desiredDate||'일정 미지정';
    if($('#analysisBudget')) $('#analysisBudget').textContent=state.preferences.budgetCap?state.preferences.budgetCap.toLocaleString('ko-KR')+'원':'제한 없음';
    if(goQuotes) goQuotes.disabled=false;
    if(quoteDesiredDate){
      quoteDesiredDate.min=localDateString(new Date());
      quoteDesiredDate.value=request.desiredDate||'';
    }
    if(quoteContext) quoteContext.textContent=request.service+' · '+request.priority+(request.desiredDate?' · '+request.desiredDate:'')+' 기준의 베타 견적입니다.';
  }

  async function loadQuotes(request){
    if(!request)return;
    const version=++quoteRequestVersion;
    quoteAbortController?.abort();
    quoteAbortController=new AbortController();
    const requestSignal=quoteAbortController.signal;
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
        budget_cap:state.preferences.budgetCap||null,
        desired_date:request?.desiredDate||request?.desired_date||null,
        exclude_provider_keys:Array.isArray(request?.excludeProviderKeys)
          ?[...new Set(request.excludeProviderKeys)].sort().slice(0,8)
          :Array.isArray(request?.exclude_provider_keys)
            ?[...new Set(request.exclude_provider_keys)].sort().slice(0,8)
            :[]
      };
      const data=await fetchQuotesStable(requestForApi,requestSignal);
      if(version!==quoteRequestVersion||requestSignal.aborted)return;
      if(Array.isArray(data.quotes)&&data.quotes.length){
        const slots=['best','value','premium'];
        validUniqueQuotes(data.quotes).slice(0,slots.length).forEach((serverQuote,index)=>{
          const slot=slots[index];
          const q={
            ...serverQuote,
            key:slot,
            decision_context:data.decision_context||null,
            recommendation_run_id:data.recommendation_run_id||null
          };
          liveQuoteKeys.add(slot);
          quoteCatalog[slot]={
            id:slot,
            name:q.provider_name,
            price:Number(q.amount)||0,
            trust:Number(q.trust)||0,
            label:q.label||'견적',
            provider_key:q.provider_key,
            demo:q.demo===true,
            quoteToken:typeof q.quote_token==='string'?q.quote_token:null,
            verified:Boolean(q.verified),
            rating:Number(q.rating)||0,
            reviews:Number(q.review_count)||0,
            response:optionalNumber(q.response_minutes),
            jobs:Number(q.completed_jobs)||0,
            rankingScore:optionalNumber(q.ranking_score),
            decisionScore:optionalNumber(q.decision_score),
            uncertaintyPenalty:optionalNumber(q.uncertainty_penalty),
            confidence:optionalNumber(q.confidence_score),
            evidence:optionalNumber(q.evidence_score),
            coverage:optionalNumber(q.coverage_score),
            budgetScore:optionalNumber(q.budget_score),
            availability:q.availability&&typeof q.availability==='object'?q.availability:null,
            availabilityAdjustment:Number.isFinite(Number(q.availability_adjustment))?Number(q.availability_adjustment):0,
            reasons:Array.isArray(q.reasons)?q.reasons.slice(0,3):[],
            breakdown:q.score_breakdown&&typeof q.score_breakdown==='object'?q.score_breakdown:null,
            lineItems:Array.isArray(q.line_items)?q.line_items.slice(0,8):[],
            budgetFit:q.budget_fit!==false,
            pareto:q.pareto_efficient===true,
            roles:Array.isArray(q.roles)?q.roles.slice(0,3):[],
            explanation:q.explanation&&typeof q.explanation==='object'?q.explanation:null,
            decisionContext:data?.decision_context||null,
            recommendationRunId:data?.recommendation_run_id||null,
            enginePriority:data?.request?.priority_mode||null,
            engineVersion:data?.engine_version||null,
            pricingBasis:data?.pricing_basis||null,
            quoteExpiresIn:Number(data?.quote_expires_in_seconds)||null,
            position:Number(q.presentation_order)||index+1
          };
          updateQuoteCard(q);
        });
        quoteMode=liveQuoteKeys.size
          ?'live'
          :(requestForApi.exclude_provider_keys.length?'recovery-empty':'no-provider');
        if(quoteMode==='live'){
          if(data.intent_quality)state.currentRequest.intentQuality=data.intent_quality;
          if(data.bundle_strategy)state.currentRequest.bundleStrategy=data.bundle_strategy;
          queueMicrotask(()=>{
            for(const key of liveQuoteKeys){
              const quote=quoteCatalog[key];
              if(quote)bestEffortTrack('impression',quote);
            }
          });
        }
      }else{
        const notice=String(data?.notice||'');
        if(notice==='NEEDS_SERVICE_CLARIFICATION'){
          quoteMode='clarification';
          if(state.currentRequest)state.currentRequest.intentQuality=data.intent_quality||null;
          if(analysisTitle)analysisTitle.textContent='서비스를 더 구체적으로 입력해주세요';
          if(analysisState){analysisState.textContent='NEEDS INFO';analysisState.classList.remove('ready')}
          if(analysisNext)analysisNext.textContent='요청 보완';
          if(goQuotes)goQuotes.disabled=true;
        }else if(notice==='NO_AVAILABLE_PROVIDER_FOR_DATE'){
          quoteMode='date-empty';
        }else if(notice==='BUNDLE_ORCHESTRATION_REQUIRED'){
          quoteMode='bundle-plan';
          activeBundlePlan=null;
          if(state.currentRequest)state.currentRequest.bundleStrategy=data.bundle_strategy||null;
          if(analysisTitle)analysisTitle.textContent='서비스별 최적 조합을 만들었습니다';
          if(analysisState){analysisState.textContent='BUNDLE';analysisState.classList.add('ready')}
          if(analysisNext)analysisNext.textContent='시간 선택 후 전체 확보';
          if(goQuotes)goQuotes.disabled=false;
          queueMicrotask(()=>loadBundlePlan());
        }else if(notice==='NO_ELIGIBLE_PROVIDER'){
          quoteMode=requestForApi.exclude_provider_keys.length?'recovery-empty':'no-provider';
        }else{
          quoteMode=requestForApi.exclude_provider_keys.length?'recovery-empty':'no-provider';
        }
      }
    }catch(err){
      if(version!==quoteRequestVersion||requestSignal.aborted||err?.name==='AbortError')return;
      quoteMode='error';
      showToast('견적 서버 연결을 확인해주세요.');
    }finally{
      if(version===quoteRequestVersion&&quoteAbortController?.signal===requestSignal){
        quoteAbortController=null;
      }
    }
    if(version===quoteRequestVersion)renderQuotesSelection();
  }

  function updateQuoteCard(q){
    const card=$('[data-quote-card="'+q.key+'"]');
    if(!card)return;
    card.dataset.price=String(q.amount||0);
    card.dataset.trust=String(q.trust||0);
    const effectiveScore=optionalNumber(q.decision_score)??optionalNumber(q.ranking_score);
    card.dataset.matchScore=effectiveScore!==null?String(effectiveScore):'';
    card.dataset.rawRankingScore=optionalNumber(q.ranking_score)!==null?String(q.ranking_score):'';
    card.dataset.uncertaintyPenalty=optionalNumber(q.uncertainty_penalty)!==null?String(q.uncertainty_penalty):'';
    card.dataset.confidence=optionalNumber(q.confidence_score)!==null?String(q.confidence_score):'';
    card.dataset.pareto=q.pareto_efficient===true?'true':'false';
    card.dataset.roles=Array.isArray(q.roles)?q.roles.join('|'):'';
    card.dataset.reasons=Array.isArray(q.reasons)?q.reasons.join('|'):'';
    card.dataset.scoreBreakdown=q.score_breakdown?JSON.stringify(q.score_breakdown):'';
    card.dataset.decisionLevel=q.decision_context?.level||'';
    card.dataset.decisionGap=q.decision_context?.score_gap==null?'':String(q.decision_context.score_gap);
    card.dataset.budgetStatus=q.decision_context?.budget?.status||'';
    card.dataset.budgetFitCount=q.decision_context?.budget?.fit_count==null?'':String(q.decision_context.budget.fit_count);
    card.dataset.budgetCap=q.decision_context?.budget?.cap==null?'':String(q.decision_context.budget.cap);
    card.dataset.budgetFit=q.budget_fit===false?'false':'true';
    card.dataset.decisionStatus=q.decision_context?.status||'';
    card.dataset.evidence=q.evidence_score==null?'':String(q.evidence_score);
    card.dataset.coverage=q.coverage_score==null?'':String(q.coverage_score);
    card.dataset.budgetScore=q.budget_score==null?'':String(q.budget_score);
    card.dataset.availability=q.availability?.status||'';
    card.dataset.availabilitySlots=q.availability?.slot_count==null?'':String(q.availability.slot_count);
    card.dataset.availabilityRemaining=q.availability?.total_remaining==null?'':String(q.availability.total_remaining);
    card.dataset.sensitivityLevel=q.decision_context?.sensitivity?.level||'';
    card.dataset.sensitivityStability=q.decision_context?.sensitivity?.stability==null?'':String(q.decision_context.sensitivity.stability);
    card.dataset.sensitivityWinners=q.decision_context?.sensitivity?.winners?JSON.stringify(q.decision_context.sensitivity.winners):'';
    const providerName=$('.provider-row strong',card);
    const providerMeta=$('.provider-row small',card);
    const price=$('.price-row strong',card);
    const priceLabel=$('.price-row > span',card);
    const trust=$('.trust-row strong',card);
    const score=$('.score i',card);
    const rating=$('.fact-grid span:nth-child(1) b',card);
    const response=$('.fact-grid span:nth-child(2) b',card);
    const thirdLabel=$('.fact-grid span:nth-child(3) small',card);
    const thirdValue=$('.fact-grid span:nth-child(3) b',card);
    if(providerName) providerName.textContent=q.provider_name||'KORUAL Demo Partner';
    if(providerMeta) providerMeta.textContent=q.provider_key?'서버 조회 · 베타 데이터':'예시 데이터 · 예약 불가';
    if(price) price.textContent='₩'+Number(q.amount||0).toLocaleString('ko-KR');
    if(priceLabel) priceLabel.textContent=q.label||'견적';
    if(trust) trust.textContent=String(q.trust||0);
    if(score) score.style.width=Math.max(0,Math.min(100,Number(q.trust)||0))+'%';
    if(rating) rating.textContent=Number(q.rating||0).toFixed(1);
    if(response) response.textContent=q.response_minutes==null?'—':(q.response_minutes<=10?'매우 빠름':q.response_minutes<=20?'빠름':q.response_minutes+'분');
    if(thirdLabel&&thirdValue&&q.availability?.status&&q.availability.status!=='not_requested'){
      thirdLabel.textContent='희망일';
      thirdValue.textContent=q.availability.status==='available'
        ?'예약 가능'
        :q.availability.status==='unavailable'
          ?'마감'
          :'일정 확인';
    }
  }

  let lastAnalyzeRaw='';
  let lastAnalyzeAt=0;

  function mergeRequestConditions(request,conditions){
    const merged={...request};
    if(!conditions)return merged;
    for(const key of ['region','desiredDate','budgetCap']){
      if(Object.prototype.hasOwnProperty.call(conditions,key))merged[key]=conditions[key];
    }
    return merged;
  }

  function analyze(text,{count=true,conditions=null}={}){
    const request=mergeRequestConditions(inferRequest(text),conditions);
    if(KorualPrivacy.containsPrivateData(request.raw)||KorualPrivacy.containsPrivateData(request.region)){
      showToast('연락처·상세주소·비밀번호를 제외하고 서비스 조건만 입력해주세요.');
      return false;
    }
    if(!request.raw){showToast('필요한 서비스를 입력해주세요.');matchInput?.focus();return}
    const now=Date.now();
    const requestIdentity=JSON.stringify([request.raw,request.region,request.desiredDate,request.budgetCap,state.preferences.priority]);
    if(count&&requestIdentity===lastAnalyzeRaw&&now-lastAnalyzeAt<700)return false;
    if(count){lastAnalyzeRaw=requestIdentity;lastAnalyzeAt=now}
    normalizePreferences();
    if(conditions&&Object.prototype.hasOwnProperty.call(conditions,'budgetCap'))state.preferences.budgetCap=conditions.budgetCap;
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
    state.recoveryContext=null;
    if(count) state.requests=(Number(state.requests)||0)+1;
    state.history=[{...request,createdAt:Date.now()},...state.history.filter(x=>x.raw!==request.raw)].slice(0,20);
    save();
    renderAnalysis(request);
    syncPreferenceUI();
    renderQuotesSelection();
    loadQuotes(request);
    showToast(request.budgetCap?'요청과 예산을 함께 분석했습니다.':'요청을 분석했습니다.');
    return true;
  }

  matchForm?.addEventListener('submit',event=>{
    event.preventDefault();
    const text=matchInput?.value||'';
    const inferred=inferRequest(text);
    const previous=state.currentRequest;
    analyze(text,{conditions:{
      region:inferred.region||previous?.region||'',
      desiredDate:inferred.desiredDate||previous?.desiredDate||null,
      budgetCap:inferred.budgetCap??state.preferences.budgetCap??null
    }});
  });
  const scopeTemplates={
    cleaning:['주방 청소','욕실 청소','창틀 청소','에어컨 세척'],
    moving:['짐 포장','큰 가구 운반','가전 운반','입주청소 함께 비교'],
    installation:['인터넷 신규 설치','가전 설치','기존 기기 철거']
  };
  let scopeType='';
  function renderRequestScope(resetSelection=false){
    const text=$('#homeRequestInput')?.value||'';
    const next=/이사|\bmoving\b|引越|搬家|chuyển nhà/i.test(text)?'moving':/청소|에어컨|cleaning|air conditioner|清掃|掃除|清洁|清潔|dọn dẹp|vệ sinh/i.test(text)?'cleaning':/인터넷|설치|internet|installation|設置|安装|安裝|lắp đặt/i.test(text)?'installation':'';
    const panel=$('#requestScope');
    if(!panel)return;
    panel.hidden=!next;
    if(next===scopeType&&!resetSelection)return;
    scopeType=next;
    const options=$('#requestScopeOptions');
    options.replaceChildren();
    for(const item of scopeTemplates[next]||[]){
      const label=document.createElement('label');
      const input=document.createElement('input');input.type='checkbox';input.value=item;
      const text=document.createElement('span');text.textContent=item;
      label.append(input,text);options.append(label);
    }
  }
  $('#homeRequestInput')?.addEventListener('input',()=>renderRequestScope());
  $('#homeRequestForm')?.addEventListener('input',()=>{const error=$('#homeRequestError');if(error)error.hidden=true;});
  const homeRequestDate=$('#homeRequestDate');
  if(homeRequestDate){homeRequestDate.min=localDateString(new Date());homeRequestDate.max=addSeoulDays(366);}
  $$('[data-home-example]').forEach(button=>button.addEventListener('click',()=>{
    const input=$('#homeRequestInput');
    if(input){input.value=button.dataset.homeExample;renderRequestScope(true);input.focus();}
  }));
  $('#homeRequestForm')?.addEventListener('submit',event=>{
    event.preventDefault();
    const input=$('#homeRequestInput');
    const region=$('#homeRequestRegion').value.trim();
    const date=homeRequestDate.value;
    const budgetValue=$('#homeRequestBudget').value;
    const budget=budgetValue?Number(budgetValue):inferRequest(input.value).budgetCap;
    const error=$('#homeRequestError');
    if(!input.value.trim()||!region){error.textContent='필요한 서비스와 지역을 입력해주세요.';error.hidden=false;return;}
    if(date&&!normalizeInferredDate(...date.split('-'))){error.textContent='오늘부터 1년 이내의 희망일을 선택해주세요.';error.hidden=false;homeRequestDate.focus();return;}
    if(budgetValue&&(!Number.isFinite(budget)||budget<=0||budget>100000000)){error.textContent='예산을 1원부터 1억원 사이로 입력해주세요.';error.hidden=false;return;}
    error.hidden=true;
    const extras=$$('#requestScopeOptions input:checked').map(input=>input.value);
    const raw=input.value.trim()+(extras.length?' · 요청 범위: '+extras.join(', '):'');
    if(matchInput)matchInput.value=raw;
    if(!analyze(raw,{conditions:{region,desiredDate:date||null,budgetCap:budget||null}})){
      error.textContent='연락처·상세주소·비밀번호를 지우고 다시 입력해주세요.';error.hidden=false;return;
    }
    showScreen('match');
    $('#analysisCard')?.scrollIntoView({behavior:'auto',block:'start'});
  });
  $$('[data-prompt]').forEach(btn=>btn.addEventListener('click',()=>{
    if(matchInput) matchInput.value=btn.dataset.prompt||'';
    analyze(btn.dataset.prompt);
  }));
  $$('[data-service]').forEach(btn=>btn.addEventListener('click',()=>{
    const region=$('#serviceRegion')?.value||'';
    const input=$('#homeRequestInput');
    if(input)input.value=btn.dataset.service||'';
    if(region)$('#homeRequestRegion').value=region;
    renderRequestScope(true);showScreen('home');
    const error=$('#homeRequestError');if(error)error.hidden=true;
    const regionInput=$('#homeRequestRegion');
    (regionInput?.value.trim()?input:regionInput)?.focus();
  }));
  goQuotes?.addEventListener('click',()=>showScreen('quotes'));

  // Filter labels and descriptions, without inserting user input as markup.
  const serviceSearch=$('#serviceSearch');
  const serviceRegion=$('#serviceRegion');
  const serviceSort=$('#serviceSort');
  const serviceRows=$$('.service-list .service-row');
  const serviceOrder=new Map(serviceRows.map((row,index)=>[row,index]));
  let serviceCategory='all';
  function filterServices(){
    const query=(serviceSearch?.value||'').trim().toLocaleLowerCase();
    const rows=[...serviceRows];
    rows.sort((a,b)=>serviceSort?.value==='name'
      ?($('strong',a)?.textContent||'').localeCompare($('strong',b)?.textContent||'',document.documentElement.lang||'ko')
      :serviceOrder.get(a)-serviceOrder.get(b));
    const list=$('.service-list');
    let count=0;
    rows.forEach(row=>{
      row.hidden=!(serviceCategory==='all'||row.dataset.category===serviceCategory)||!(row.textContent+' '+row.dataset.service).toLocaleLowerCase().includes(query);
      list?.appendChild(row);
      if(!row.hidden)count++;
    });
    $$('[data-service-category]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.serviceCategory===serviceCategory)));
    const status=$('#serviceResultCount');
    if(status)status.textContent=count?uiText('serviceCount','{count}개 서비스 분야 · {region}').replace('{count}',count).replace('{region}',serviceRegion?.value||uiText('nationwide','전국')):uiText('noServiceResult','일치하는 서비스가 없습니다. 필터를 초기화하거나 검색어를 바꾸세요.');
  }
  $$('[data-service-category]').forEach(button=>button.addEventListener('click',()=>{
    serviceCategory=button.dataset.serviceCategory;filterServices();
  }));
  $$('[data-open-category]').forEach(button=>button.addEventListener('click',()=>{
    serviceCategory=button.dataset.openCategory;
    if(serviceSearch)serviceSearch.value='';
    filterServices();showScreen('services');
  }));
  $('#resetServiceFilters')?.addEventListener('click',()=>{
    serviceCategory='all';
    if(serviceSearch)serviceSearch.value='';
    if(serviceRegion)serviceRegion.value='';
    if(serviceSort)serviceSort.value='default';
    filterServices();
  });
  serviceSearch?.addEventListener('input',filterServices);
  serviceRegion?.addEventListener('change',filterServices);
  serviceSort?.addEventListener('change',filterServices);
  window.addEventListener('korual:language-changed',()=>{filterServices();renderHome()});
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
    if(quoteMode==='live')return optionalNumber(q.decisionScore)??optionalNumber(q.rankingScore)??-1;
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
    const response=optionalNumber(q.response);
    const responseScore=response===null?55:response<=10?100:response<=20?90:response<=45?78:response<=90?65:response<=180?50:38;
    const jobs=Math.max(0,Number(q.jobs)||0);
    const experience=Math.max(0,Math.min(100,45+55*(1-Math.exp(-jobs/250))));
    const verification=q.verified?100:40;
    const confidence=optionalNumber(q.confidence)!==null?Number(q.confidence):Math.max(0,Math.min(100,
      (q.verified?25:0)+Math.min(25,reviewCount/200*25)+Math.min(20,jobs/300*20)+(response!==null?15:0)+(rating>0?15:0)
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
    if(optionalNumber(q.response)!==null&&Number(q.response)<=10)reasons.push('빠른 평균 응답');
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
    const dateRequested=Boolean(state.currentRequest?.desiredDate);
    const dateEligible=!dateRequested||q?.availability?.status==='available';
    return Boolean(q && !q.demo && quoteMode==='live' && liveQuoteKeys.has(id) &&
      (!state.preferences.verifiedOnly||q.verified) &&
      (!state.preferences.budgetCap||q.price<=state.preferences.budgetCap) &&
      dateEligible);
  }

  function applyDecisionLens(){
    normalizePreferences();
    const list=$('#quoteList');
    if(!list)return;
    const entries=$$('[data-quote-card]',list).map(card=>{
      const q=quoteCatalog[card.dataset.quoteCard];
      const overBudget=state.preferences.budgetCap && q && Number(q.price)>state.preferences.budgetCap;
      const unverified=state.preferences.verifiedOnly && q && !q.verified;
      const unavailable=(quoteMode==='live'&&!liveQuoteKeys.has(card.dataset.quoteCard))||
        ['sample','loading','clarification','bundle-plan','no-provider','date-empty','recovery-empty','error'].includes(quoteMode);
      card.classList.toggle('is-filtered',Boolean(overBudget||unverified||unavailable));
      card.hidden=Boolean(overBudget||unverified||unavailable);
      const select=$('[data-quote]',card);
      if(select) select.disabled=!isEligible(card.dataset.quoteCard);
      const condition=isEligible(card.dataset.quoteCard)?'ready':q?.demo?'demo':'check';
      card.dataset.condition=condition;
      let status=$('.quote-condition',card);
      if(!status){status=document.createElement('p');status.className='quote-condition';card.appendChild(status);}
      status.textContent=condition==='ready'?'예약 조건 충족':condition==='demo'?'데모 업체 · 실제 예약 불가':'예약 전 일정·조건 확인 필요';
      const rank=$('.quote-rank,.ai-pick,.value-pick,.premium-pick',card);
      if(rank)rank.textContent=q?.label||'견적';
      card.classList.toggle('is-sample',quoteMode!=='live'||unavailable||q?.demo===true);
      const badge=$('.verified',card);
      if(badge) badge.textContent=q?.demo?'데모 · 예약 불가':quoteMode==='live'&&!unavailable?(q.verified?'✓ 검증':'미검증'):'예시';
      card.classList.remove('is-top-choice','featured');
      const decisionScore=q?scoreQuote(q):-1;
      const providerMeta=$('.provider-row small',card);
      if(providerMeta&&q){
        if(quoteMode==='live'&&!unavailable){
          const confidence=optionalNumber(q.confidence)!==null?' · Confidence '+Math.round(Number(q.confidence))+'%':'';
          const availability=q.availability?.status==='available'
            ?' · 희망일 가능'
            :q.availability?.status==='unknown'
              ?' · 일정 확인 필요'
              :'';
          providerMeta.textContent=q.demo?'데모 업체 · 예시 견적 · 예약 불가':'서버 베타 · '+(decisionScore>=0?'Match '+Math.round(decisionScore):'점수 정보 없음')+confidence+availability;
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
      const mode=quoteMode==='live'
        ?liveQuoteKeys.size+'개 서버 베타 견적'
        :quoteMode==='loading'
          ?'서버 확인 중'
          :quoteMode==='clarification'
            ?'서비스 정보 보완 필요'
            :quoteMode==='bundle-plan'
              ?'여러 업체 조합 필요'
              :quoteMode==='date-empty'
              ?'희망일 예약 가능 업체 없음'
              :quoteMode==='recovery-empty'
                ?'대체 가능한 다른 업체 없음'
                :quoteMode==='no-provider'
                  ?'현재 지원 업체 없음'
                  :quoteMode==='error'
                    ?'서버 연결 확인 필요'
                    :'견적 없음';
      const date=state.currentRequest.desiredDate?' · '+state.currentRequest.desiredDate:'';
      quoteContext.textContent=state.currentRequest.service+' · '+mode+' · '+preferenceLabel()+' 우선'+cap+date;
    }
    if(quoteInsight){
      const amounts=[...liveQuoteKeys].map(key=>Number(quoteCatalog[key]?.price)).filter(x=>Number.isFinite(x)&&x>=0);
      if(quoteMode==='live'&&amounts.length){
        const low=Math.min(...amounts),high=Math.max(...amounts);
        const liveQuotes=[...liveQuoteKeys].map(key=>quoteCatalog[key]).filter(Boolean);
        const availableCount=liveQuotes.filter(q=>q.availability?.status==='available').length;
        const unknownCount=liveQuotes.filter(q=>q.availability?.status==='unknown').length;
        const availabilityText=state.currentRequest?.desiredDate
          ?' · 희망일 예약 가능 '+availableCount+'개'+(unknownCount?' · 일정 확인 '+unknownCount+'개':'')
          :'';
        quoteInsight.textContent='서버 베타 견적 '+amounts.length+'개'+availabilityText+' · 표시 가격 '+low.toLocaleString('ko-KR')+'~'+high.toLocaleString('ko-KR')+'원. 실제 제공 범위와 추가 비용을 확인하세요.';
      }else{
        quoteInsight.textContent=quoteMode==='loading'
          ?'검증된 파트너와 조건을 확인하고 있습니다.'
          :quoteMode==='clarification'
            ?'서비스 종류를 구체적으로 입력하면 실제 지원 업체만 비교합니다.'
            :quoteMode==='bundle-plan'
              ?'한 업체가 전체 서비스를 제공하지 못하지만 서비스별 검증 업체 조합은 가능합니다. 현재는 조합 플랜을 먼저 보여주고 개별 예약을 분리합니다.'
              :quoteMode==='date-empty'
              ?'선택한 희망일에는 예약 가능한 검증 업체가 없습니다. 다른 날짜를 선택해주세요.'
              :quoteMode==='recovery-empty'
                ?'현재 조건에서 기존 업체를 제외한 대체 후보가 없습니다. 기존 예약 상태를 유지하거나 조건을 수정해주세요.'
                :quoteMode==='no-provider'
                  ?'서비스는 이해했지만 현재 조건을 모두 충족하는 검증 업체가 없습니다.'
                  :quoteMode==='error'
                    ?'서버 응답을 확인하지 못했습니다. 예시 견적 대신 실제 연결 상태를 그대로 표시합니다.'
                    :'현재 표시할 실제 견적이 없습니다.';
      }
    }

    if(quoteEmptyTitle&&quoteEmptyMessage){
      const emptyCopy={
        clarification:['어떤 서비스가 필요한지 더 구체적으로 알려주세요.','예: “10월 5일 서울 이사”, “입주청소 견적”, “에어컨 청소가 필요해”.'],
        'bundle-plan':['한 업체가 모든 서비스를 처리할 수 없습니다.','서비스별로 검증 업체를 나눠 연결할 수 있습니다. 요청 조건은 유지한 채 조합 예약 구조로 처리합니다.'],
        'date-empty':['선택한 날짜에 예약 가능한 업체가 없습니다.','희망일을 바꾸면 실제 가용시간을 기준으로 다시 비교합니다.'],
        'no-provider':['현재 조건을 모두 충족하는 업체가 없습니다.','서비스·지역·예산 조건을 조정해 다시 확인해주세요.'],
        'recovery-empty':['현재 대체 가능한 다른 업체가 없습니다.','기존 예약은 유지됩니다. 조건을 수정하거나 기존 예약 상태를 확인해주세요.'],
        error:['견적 서버 연결을 확인하지 못했습니다.','예시 데이터로 대체하지 않았습니다. 잠시 후 실제 견적을 다시 조회해주세요.'],
        sample:['먼저 필요한 서비스를 알려주세요.','요청을 분석한 뒤 실제 연결 가능한 업체 견적만 표시합니다.']
      }[quoteMode];
      if(emptyCopy){
        quoteEmptyTitle.textContent=emptyCopy[0];
        quoteEmptyMessage.textContent=emptyCopy[1];
      }else{
        quoteEmptyTitle.textContent='현재 조건에 맞는 견적이 없습니다.';
        quoteEmptyMessage.textContent='예산 또는 검증 조건을 변경해 다시 비교해보세요.';
      }
      const action=$('#clearQuoteFilters');
      if(action){
        action.textContent=quoteMode==='clarification'||quoteMode==='no-provider'
          ?'요청 수정'
          :quoteMode==='bundle-plan'
            ?'요청 확인'
            :quoteMode==='date-empty'
            ?'날짜 변경'
            :quoteMode==='recovery-empty'
              ?'예약 상태 보기'
              :quoteMode==='error'
                ?'다시 조회'
                :'필터 해제';
      }
    }
  }

  function syncPreferenceUI(){
    normalizePreferences();
    $$('[data-priority]').forEach(btn=>{const active=btn.dataset.priority===state.preferences.priority;btn.classList.toggle('is-active',active);btn.setAttribute('aria-pressed',String(active))});
    if(verifiedOnly) verifiedOnly.checked=state.preferences.verifiedOnly;
    if(budgetCap) budgetCap.value=state.preferences.budgetCap||'';
    if(quoteDesiredDate){
      quoteDesiredDate.min=localDateString(new Date());
      quoteDesiredDate.value=state.currentRequest?.desiredDate||'';
    }
    applyDecisionLens();
  }

  let quoteRefreshTimer;
  function scheduleQuoteRefresh(delay=350){
    clearTimeout(quoteRefreshTimer);
    if(!state.currentRequest)return;
    quoteRefreshTimer=setTimeout(()=>{
      if(!state.currentRequest)return;
      const request=state.recoveryContext?.oldBookingId===state.booking?.backend_id
        ?{...state.currentRequest,excludeProviderKeys:state.recoveryContext.excludedProviderKeys||[]}
        :state.currentRequest;
      loadQuotes(request);
    },delay);
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
    renderBundlePlan();
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
    bestEffortTrack('select',quote);
    showToast(quote.name+' 견적을 선택했습니다.');
  });


    $$('[data-priority]').forEach(btn=>btn.addEventListener('click',()=>{
    normalizePreferences();
    state.preferences.priority=btn.dataset.priority||'balanced';
    save();
    syncPreferenceUI();
    scheduleQuoteRefresh(80);
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
    scheduleQuoteRefresh(550);
  });

  quoteDesiredDate?.addEventListener('change',()=>{
    if(!state.currentRequest)return;
    state.currentRequest.desiredDate=quoteDesiredDate.value||null;
    state.selectedQuote=null;
    save();
    renderAnalysis(state.currentRequest);
    scheduleQuoteRefresh(40);
    showToast(quoteDesiredDate.value?'희망일 기준으로 예약 가능 업체를 다시 확인합니다.':'희망일 조건을 해제했습니다.');
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
    $$('.filter-strip [data-sort]').forEach(x=>{x.classList.toggle('is-active',x===btn);x.setAttribute('aria-pressed',String(x===btn))});
    sortMode=btn.dataset.sort;
    applyDecisionLens();
  }));

  const bookingSheet=$('#bookingSheet');
  const bookingForm=$('#bookingForm');
  const bundleBookingSheet=$('#bundleBookingSheet');
  const bundleBookingForm=$('#bundleBookingForm');
  const closeBundleBookingSheet=$('#closeBundleBookingSheet');
  const cancelBundleBookingSheet=$('#cancelBundleBookingSheet');
  const bundleCustomerName=$('#bundleCustomerName');
  const bundleCustomerPhone=$('#bundleCustomerPhone');
  const bundleCustomerRegion=$('#bundleCustomerRegion');
  const bundleDesiredDate=$('#bundleDesiredDate');
  const bundleSheetServices=$('#bundleSheetServices');
  const bundleSheetTotal=$('#bundleSheetTotal');
  const bundleSheetSchedule=$('#bundleSheetSchedule');
  const bundleBookingStatus=$('#bundleBookingStatus');
  const submitBundleBooking=$('#submitBundleBooking');
  const closeBookingSheet=$('#closeBookingSheet');
  const cancelBookingSheet=$('#cancelBookingSheet');
  const submitBooking=$('#submitBooking');
  const desiredDate=$('#desiredDate');
  const desiredTime=$('#desiredTime');
  const slotStatus=$('#slotStatus');
  const rescheduleBooking=$('#rescheduleBooking');
  const cancelBooking=$('#cancelBooking');
  const bookingCompareAlternatives=$('#bookingCompareAlternatives');
  const rescheduleSheet=$('#rescheduleSheet');
  const rescheduleForm=$('#rescheduleForm');
  const closeRescheduleSheet=$('#closeRescheduleSheet');
  const cancelRescheduleSheet=$('#cancelRescheduleSheet');
  const rescheduleDate=$('#rescheduleDate');
  const rescheduleTime=$('#rescheduleTime');
  const rescheduleStatus=$('#rescheduleStatus');
  const submitReschedule=$('#submitReschedule');
  let pendingIdempotency='';
  let activeSlotHold=null;
  let availabilityVersion=0;
  let slotHoldVersion=0;
  let slotHoldTicker=null;
  let activeRescheduleHold=null;
  let rescheduleAvailabilityVersion=0;
  let rescheduleHoldVersion=0;
  let rescheduleHoldTicker=null;
  let bundlePlanVersion=0;
  let bundleOperationKey='';
  let activeBundlePlan=null;
  let activeBundleHolds=[];
  let bundleHoldTicker=null;
  let bundleStatusInFlight=false;

  function localDateString(date){
    return new Intl.DateTimeFormat('en-CA',{
      timeZone:'Asia/Seoul',
      year:'numeric',
      month:'2-digit',
      day:'2-digit'
    }).format(date);
  }

  function formatKstTime(value){
    if(!value)return '—';
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return '—';
    return new Intl.DateTimeFormat('ko-KR',{
      timeZone:'Asia/Seoul',
      hour:'2-digit',
      minute:'2-digit',
      hour12:false
    }).format(d);
  }


  function setBundleStep(step){
    $$('.bundle-flow-steps span').forEach((el,index)=>{
      const n=index+1;
      el.classList.toggle('is-done',n<step);
      el.classList.toggle('is-active',n===step);
    });
  }

  function bundleRequestPayload(){
    if(!state.currentRequest)return null;
    return {
      ...state.currentRequest,
      priority_mode:state.preferences?.priority||state.currentRequest.priorityMode||'balanced',
      budget_cap:state.preferences?.budgetCap||null,
      desired_date:state.currentRequest.desiredDate||null
    };
  }

  function stopBundleHoldTicker(){
    if(bundleHoldTicker){
      clearInterval(bundleHoldTicker);
      bundleHoldTicker=null;
    }
  }

  function updateBundleHoldStatus(){
    if(!activeBundleHolds.length)return;
    const times=activeBundleHolds
      .map(x=>new Date(x.expires_at).getTime())
      .filter(Number.isFinite);
    if(!times.length)return;
    const remain=Math.max(0,Math.floor((Math.min(...times)-Date.now())/1000));
    if(remain<=0){
      stopBundleHoldTicker();
      activeBundleHolds=[];
      if(submitBundleBooking)submitBundleBooking.disabled=true;
      if(bundleBookingStatus)bundleBookingStatus.textContent='시간 확보가 만료되었습니다. 조합 플랜에서 시간을 다시 선택해주세요.';
      setBundleStep(2);
      return;
    }
    const min=Math.floor(remain/60);
    const sec=String(remain%60).padStart(2,'0');
    if(bundleBookingStatus)bundleBookingStatus.textContent='모든 시간이 '+min+':'+sec+' 동안 임시 확보됩니다. 확정 전까지 결제는 발생하지 않습니다.';
  }

  async function releaseActiveBundleHolds(){
    const holds=[...activeBundleHolds];
    activeBundleHolds=[];
    stopBundleHoldTicker();
    if(!holds.length)return;
    await Promise.allSettled(holds.map(x=>fetchApi('release_slot',{hold_id:x.hold_id})));
  }

  function updateBundlePrepareButton(){
    if(!prepareBundleBooking)return;
    if(!activeBundlePlan?.ready_for_atomic_booking){
      prepareBundleBooking.disabled=true;
      return;
    }
    const selects=bundlePlanItems?$$('select[data-bundle-slot]',bundlePlanItems):[];
    const ready=selects.length>0&&selects.every(x=>Boolean(x.value));
    prepareBundleBooking.disabled=!ready;
    if(ready)setBundleStep(2);
  }

  function renderBundlePlan(){
    if(!bundlePlanCard)return;
    const active=quoteMode==='bundle-plan';
    bundlePlanCard.hidden=!active;

    const filterStrip=$('.filter-strip');
    const quoteTools=$('.quote-tools');
    const quoteSticky=$('#quoteSticky');
    if(filterStrip)filterStrip.hidden=active;
    if(quoteTools)quoteTools.hidden=active;
    if(quoteList)quoteList.hidden=active;
    if(quoteSticky)quoteSticky.hidden=active;
    const empty=$('#quoteEmpty');
    if(active&&empty)empty.hidden=true;

    if(!active)return;
    if(!bundlePlanItems)return;

    bundlePlanItems.replaceChildren();
    if(!activeBundlePlan){
      bundlePlanCard.setAttribute('aria-busy','true');
      if(bundlePlanStatus)bundlePlanStatus.textContent='PLANNING';
      if(bundlePlanMessage)bundlePlanMessage.textContent=state.currentRequest?.desiredDate
        ?'서비스별 검증 업체와 실제 가능한 시간을 계산하고 있습니다.'
        :'희망일을 먼저 선택하면 서비스별 실제 가능 시간을 계산합니다.';
      if(bundlePlanTotal)bundlePlanTotal.textContent='—';
      if(prepareBundleBooking)prepareBundleBooking.disabled=true;
      setBundleStep(1);
      return;
    }

    bundlePlanCard.setAttribute('aria-busy','false');
    if(bundlePlanStatus)bundlePlanStatus.textContent=activeBundlePlan.ready_for_atomic_booking?'READY':'CHECK';
    if(bundlePlanMessage)bundlePlanMessage.textContent=activeBundlePlan.ready_for_atomic_booking
      ?'서비스별 추천 업체와 시간을 확인하세요. 모든 슬롯이 함께 확보된 경우에만 최종 예약으로 넘어갑니다.'
      :'일부 서비스는 현재 희망일에 실제 예약 가능한 시간이 부족합니다.';
    if(bundlePlanTotal)bundlePlanTotal.textContent='₩'+Number(activeBundlePlan.total_amount||0).toLocaleString('ko-KR');
    setBundleStep(activeBundlePlan.ready_for_atomic_booking?2:1);

    (activeBundlePlan.items||[]).forEach(item=>{
      const row=document.createElement('article');
      row.className='bundle-plan-item';
      row.dataset.service=item.service||'';
      row.dataset.state=item.status||'';
      const suggested=item.suggested;

      const main=document.createElement('div');
      main.className='bundle-plan-item-main';
      const eyebrow=document.createElement('small');
      eyebrow.textContent=item.service||'서비스';
      const title=document.createElement('strong');
      title.textContent=suggested?.provider_name||'예약 가능한 업체 없음';
      const meta=document.createElement('span');
      if(suggested){
        const availability=suggested.availability?.status==='available'?'희망일 예약 가능':'일정 확인 필요';
        meta.textContent='₩'+Number(suggested.amount||0).toLocaleString('ko-KR')+
          ' · Match '+Math.round(Number(suggested.decision_score)||0)+
          ' · Trust '+Math.round(Number(suggested.trust)||0)+
          ' · '+availability;
      }else{
        meta.textContent='현재 희망일에는 이 서비스를 예약할 수 있는 검증 업체가 없습니다.';
      }
      main.append(eyebrow,title,meta);

      const select=document.createElement('select');
      select.dataset.bundleSlot=item.service||'';
      select.setAttribute('aria-label',(item.service||'서비스')+' 시간 선택');
      const first=document.createElement('option');
      first.value='';
      first.textContent=suggested?'시간 선택':'예약 가능 시간 없음';
      select.append(first);

      const slots=Array.isArray(suggested?.available_slots)?suggested.available_slots:[];
      slots.forEach(slot=>{
        const option=document.createElement('option');
        option.value=slot.starts_at;
        option.textContent=formatKstTime(slot.starts_at)+'–'+formatKstTime(slot.ends_at)+
          (Number.isFinite(Number(slot.remaining))?' · '+Number(slot.remaining)+'자리':'');
        select.append(option);
      });
      select.disabled=!suggested||!slots.length;
      select.dataset.quoteToken=suggested?.quote_token||'';
      select.dataset.providerName=suggested?.provider_name||'';
      select.dataset.amount=String(Number(suggested?.amount)||0);
      select.addEventListener('change',()=>{
        row.classList.toggle('is-selected',Boolean(select.value));
        updateBundlePrepareButton();
      });

      row.append(main,select);
      bundlePlanItems.append(row);
    });

    updateBundlePrepareButton();
  }

  async function loadBundlePlan(){
    const request=bundleRequestPayload();
    const version=++bundlePlanVersion;
    activeBundlePlan=null;
    renderBundlePlan();
    if(!request||!Array.isArray(request.bundle)||request.bundle.length<2)return;
    if(!request.desired_date){
      if(bundlePlanStatus)bundlePlanStatus.textContent='DATE';
      if(bundlePlanMessage)bundlePlanMessage.textContent='희망일을 선택하면 서비스별 실제 가능시간을 계산합니다.';
      return;
    }

    try{
      const data=await fetchApi('bundle_plan',{request});
      if(version!==bundlePlanVersion)return;
      activeBundlePlan=data.bundle_plan||null;
      if(state.currentRequest&&data.request){
        state.currentRequest.region=data.request.region||state.currentRequest.region||'';
        state.currentRequest.desiredDate=data.request.desired_date||state.currentRequest.desiredDate||null;
      }
      renderBundlePlan();
    }catch(err){
      if(version!==bundlePlanVersion)return;
      activeBundlePlan=null;
      if(bundlePlanCard)bundlePlanCard.setAttribute('aria-busy','false');
      if(bundlePlanStatus)bundlePlanStatus.textContent='ERROR';
      if(bundlePlanMessage)bundlePlanMessage.textContent=err?.code==='DATE_REQUIRED'
        ?'희망일을 먼저 선택해주세요.'
        :err?.code==='REGION_REQUIRED'
          ?'요청에 서비스 지역을 포함해주세요. 예: “10월 5일 서울 이사 + 입주청소”.'
          :'조합 플랜을 불러오지 못했습니다. 요청 조건을 확인해주세요.';
      if(prepareBundleBooking)prepareBundleBooking.disabled=true;
    }
  }

  async function prepareAtomicBundle(){
    if(!activeBundlePlan?.ready_for_atomic_booking||!state.currentRequest)return;
    const selects=bundlePlanItems?$$('select[data-bundle-slot]',bundlePlanItems):[];
    if(!selects.length||selects.some(x=>!x.value)){
      showToast('각 서비스의 시간을 모두 선택해주세요.');
      return;
    }

    if(prepareBundleBooking){
      prepareBundleBooking.disabled=true;
      prepareBundleBooking.textContent='전체 시간 확보 중…';
    }
    await releaseActiveBundleHolds();
    bundleOperationKey=makeIdempotency();
    const held=[];

    try{
      for(const select of selects){
        const data=await fetchApi('hold_bundle_slot',{
          quote_token:select.dataset.quoteToken,
          starts_at:select.value,
          operation_key:bundleOperationKey
        });
        if(!data?.hold?.hold_id)throw Error('BUNDLE_HOLD_INVALID');
        held.push({
          service:select.dataset.bundleSlot,
          quote_token:select.dataset.quoteToken,
          provider_name:select.dataset.providerName,
          amount:Number(select.dataset.amount)||0,
          starts_at:data.hold.starts_at,
          ends_at:data.hold.ends_at,
          expires_at:data.hold.expires_at,
          hold_id:data.hold.hold_id
        });
        activeBundleHolds=[...held];
      }

      setBundleStep(3);
      if(bundleCustomerRegion)bundleCustomerRegion.value=state.currentRequest.region||'';
      if(bundleDesiredDate)bundleDesiredDate.value=state.currentRequest.desiredDate||'';
      if(bundleSheetServices)bundleSheetServices.textContent=held.map(x=>x.service).join(' · ');
      if(bundleSheetTotal)bundleSheetTotal.textContent='₩'+held.reduce((s,x)=>s+x.amount,0).toLocaleString('ko-KR');
      if(bundleSheetSchedule){
        bundleSheetSchedule.replaceChildren();
        held.forEach(item=>{
          const row=document.createElement('div');
          row.className='bundle-sheet-row';
          row.innerHTML='<div><strong>'+escapeHtml(item.service)+'</strong><small>'+
            escapeHtml(item.provider_name||'Partner')+'</small></div><b>'+
            escapeHtml(formatKstTime(item.starts_at))+'</b>';
          bundleSheetSchedule.append(row);
        });
      }
      if(bundleBookingStatus)bundleBookingStatus.textContent='모든 시간이 10분간 임시 확보되었습니다.';
      if(submitBundleBooking)submitBundleBooking.disabled=false;
      if(bundleBookingSheet){
        bundleBookingSheet.hidden=false;
        document.body.style.overflow='hidden';
      }
      updateBundleHoldStatus();
      stopBundleHoldTicker();
      bundleHoldTicker=setInterval(updateBundleHoldStatus,1000);
    }catch(err){
      activeBundleHolds=[...held];
      await releaseActiveBundleHolds();
      setBundleStep(2);
      showToast('전체 시간을 확보하지 못했습니다. 이미 확보한 시간도 모두 해제했습니다.');
    }finally{
      if(prepareBundleBooking){
        prepareBundleBooking.textContent='선택 시간 임시 확보 →';
        updateBundlePrepareButton();
      }
    }
  }

  async function closeBundleSheet({release=true}={}){
    if(release)await releaseActiveBundleHolds();
    if(bundleBookingSheet)bundleBookingSheet.hidden=true;
    document.body.style.overflow='';
    if(release)setBundleStep(activeBundlePlan?.ready_for_atomic_booking?2:1);
  }

  async function syncBundleStatus({silent=false}={}){
    const groupId=state.bundleBooking?.backend_id||state.bundleBooking?.id||state.bundleBooking?.group_id;
    if(!groupId||bundleStatusInFlight)return;
    bundleStatusInFlight=true;
    try{
      const data=await fetchApi('bundle_status',{group_id:groupId});
      if(data?.bundle){
        state.bundleBooking={
          ...state.bundleBooking,
          ...data.bundle,
          backend_id:data.bundle.id,
          serverUpdatedAt:Date.now()
        };
        persistState();
        renderBundleBooking();
        renderHome();
        renderProfile();
      }
    }catch(err){
      if(!silent){
        const meta=$('#bundleBookingMeta');
        if(meta)meta.textContent='묶음 예약 서버 상태 확인 실패 · 기존 표시 유지';
      }
    }finally{
      bundleStatusInFlight=false;
    }
  }

  function renderBundleBooking(){
    const empty=$('#emptyBooking');
    const card=$('#bundleBookingCard');
    const bundle=state.bundleBooking;
    if(!bundle){
      if(card)card.hidden=true;
      if(empty)empty.hidden=Boolean(state.booking);
      return;
    }
    if(empty)empty.hidden=true;
    if(card)card.hidden=false;

    const id=$('#bundleBookingId');
    const badge=$('#bundleBookingStatusBadge');
    const services=$('#bundleBookingServices');
    const total=$('#bundleBookingTotal');
    const items=$('#bundleBookingItems');
    const meta=$('#bundleBookingMeta');

    if(id)id.textContent=bundle.id||bundle.backend_id||bundle.group_id||'—';
    const status=String(bundle.status||'booked').toLowerCase();
    if(badge){
      badge.textContent=status==='completed'?'전체 완료':status==='cancelled'?'전체 취소':'진행 중';
      badge.dataset.status=status;
    }
    const serviceList=Array.isArray(bundle.services)?bundle.services:[];
    if(services)services.textContent=serviceList.join(' · ')||'복합 서비스';
    if(total)total.textContent='₩'+Number(bundle.total_amount||0).toLocaleString('ko-KR');

    if(items){
      items.replaceChildren();
      (bundle.items||[]).forEach(item=>{
        const row=document.createElement('div');
        row.className='bundle-booking-item';
        const booking=item.booking||{};
        const provider=item.provider||{};
        const confirmation=String(booking.confirmation_status||'awaiting').toLowerCase();
        const stateLabel=booking.status==='completed'
          ?'완료'
          :booking.status==='cancelled'
            ?'취소'
            :confirmation==='confirmed'
              ?'업체 확인'
              :confirmation==='declined'
                ?'업체 거절'
                :confirmation==='expired'
                  ?'확인 지연'
                  :'확인 대기';
        row.innerHTML='<div><strong>'+escapeHtml(item.service||'서비스')+'</strong><small>'+
          escapeHtml(provider.name||provider.provider_key||'Partner')+' · '+escapeHtml(stateLabel)+
          '</small></div><b>'+escapeHtml(formatKstTime(booking.scheduled_at))+'</b>';
        items.append(row);
      });
    }

    if(meta){
      const updated=Number(bundle.serverUpdatedAt);
      const time=Number.isFinite(updated)
        ?new Date(updated).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})
        :'—';
      meta.textContent='서비스별 예약 '+Number(bundle.items?.length||0)+'건 · 마지막 동기화 '+time;
    }
  }

  function stopSlotTicker(){
    if(slotHoldTicker){
      clearInterval(slotHoldTicker);
      slotHoldTicker=null;
    }
  }

  function clearActiveSlotHoldLocal(){
    stopSlotTicker();
    activeSlotHold=null;
  }

  function updateSlotHoldStatus(){
    if(!activeSlotHold)return;
    const remain=Math.max(0,Math.floor((new Date(activeSlotHold.expires_at).getTime()-Date.now())/1000));
    if(remain<=0){
      clearActiveSlotHoldLocal();
      if(submitBooking)submitBooking.disabled=true;
      if(slotStatus)slotStatus.textContent='선택 시간 hold가 만료되었습니다. 시간을 다시 선택해주세요.';
      if(desiredTime){
        desiredTime.value='';
        desiredTime.disabled=false;
      }
      return;
    }
    const min=Math.floor(remain/60);
    const sec=String(remain%60).padStart(2,'0');
    if(slotStatus)slotStatus.textContent='선택 시간이 '+min+':'+sec+' 동안 임시 확보되었습니다. 이 시간 안에 예약을 저장해주세요.';
  }

  async function releaseActiveSlotHold(){
    const hold=activeSlotHold;
    clearActiveSlotHoldLocal();
    if(submitBooking)submitBooking.disabled=true;
    if(!hold?.hold_id)return;
    try{await fetchApi('release_slot',{hold_id:hold.hold_id})}catch(_){}
  }

  async function loadAvailability(){
    const version=++availabilityVersion;
    ++slotHoldVersion;
    await releaseActiveSlotHold();

    if(!desiredDate?.value||!state.selectedQuote?.quoteToken){
      if(desiredTime){
        desiredTime.innerHTML='<option value="">날짜를 먼저 선택</option>';
        desiredTime.disabled=true;
      }
      if(slotStatus)slotStatus.textContent='날짜를 선택하면 실제 가능한 시간을 확인합니다.';
      return;
    }

    if(desiredTime){
      desiredTime.innerHTML='<option value="">가능 시간 확인 중…</option>';
      desiredTime.disabled=true;
    }
    if(slotStatus)slotStatus.textContent='서버에서 업체 가능 시간을 확인하고 있습니다.';
    if(submitBooking)submitBooking.disabled=true;

    try{
      const data=await fetchApi('availability',{
        quote_token:state.selectedQuote.quoteToken,
        desired_date:desiredDate.value
      });
      if(version!==availabilityVersion)return;

      const slots=Array.isArray(data?.slots)?data.slots:[];
      if(!slots.length){
        if(desiredTime){
          desiredTime.innerHTML='<option value="">가능한 시간 없음</option>';
          desiredTime.disabled=true;
        }
        if(slotStatus)slotStatus.textContent='선택한 날짜에는 예약 가능한 시간이 없습니다. 다른 날짜를 선택해주세요.';
        return;
      }

      if(desiredTime){
        desiredTime.innerHTML='<option value="">시간 선택</option>'+slots.map(slot=>{
          const start=formatKstTime(slot.starts_at);
          const end=formatKstTime(slot.ends_at);
          const remaining=Number(slot.remaining);
          return '<option value="'+escapeHtml(slot.starts_at)+'">'+start+'–'+end+(Number.isFinite(remaining)?' · '+remaining+'자리':'')+'</option>';
        }).join('');
        desiredTime.disabled=false;
      }
      if(slotStatus)slotStatus.textContent='실시간 가능한 시간 '+slots.length+'개 · 시간을 선택하면 10분간 임시 확보합니다.';
    }catch(err){
      if(version!==availabilityVersion)return;
      if(desiredTime){
        desiredTime.innerHTML='<option value="">시간 조회 실패</option>';
        desiredTime.disabled=true;
      }
      if(slotStatus)slotStatus.textContent='가능 시간을 불러오지 못했습니다. 날짜를 다시 선택해주세요.';
    }
  }

  async function holdSelectedSlot(){
    const startsAt=desiredTime?.value||'';
    const version=++slotHoldVersion;
    await releaseActiveSlotHold();

    if(!startsAt||!state.selectedQuote?.quoteToken)return;

    if(slotStatus)slotStatus.textContent='선택 시간을 임시 확보하는 중입니다.';
    if(submitBooking)submitBooking.disabled=true;

    try{
      const data=await fetchApi('hold_slot',{
        quote_token:state.selectedQuote.quoteToken,
        starts_at:startsAt
      });
      const hold=data?.hold;
      if(!hold?.hold_id)throw Error('HOLD_INVALID');

      if(version!==slotHoldVersion){
        try{await fetchApi('release_slot',{hold_id:hold.hold_id})}catch(_){}
        return;
      }

      activeSlotHold=hold;
      updateSlotHoldStatus();
      stopSlotTicker();
      slotHoldTicker=setInterval(updateSlotHoldStatus,1000);
      if(submitBooking)submitBooking.disabled=false;
    }catch(err){
      if(version!==slotHoldVersion)return;
      clearActiveSlotHoldLocal();
      if(submitBooking)submitBooking.disabled=true;
      if(desiredTime)desiredTime.value='';
      if(slotStatus)slotStatus.textContent='방금 다른 예약이 먼저 확정했거나 hold에 실패했습니다. 다른 시간을 선택해주세요.';
      loadAvailability();
    }
  }

  function stopRescheduleTicker(){
    if(rescheduleHoldTicker){
      clearInterval(rescheduleHoldTicker);
      rescheduleHoldTicker=null;
    }
  }

  function clearActiveRescheduleHoldLocal(){
    stopRescheduleTicker();
    activeRescheduleHold=null;
  }

  function updateRescheduleHoldStatus(){
    if(!activeRescheduleHold)return;
    const remain=Math.max(0,Math.floor((new Date(activeRescheduleHold.expires_at).getTime()-Date.now())/1000));
    if(remain<=0){
      clearActiveRescheduleHoldLocal();
      if(submitReschedule)submitReschedule.disabled=true;
      if(rescheduleStatus)rescheduleStatus.textContent='선택 시간 hold가 만료되었습니다. 시간을 다시 선택해주세요.';
      if(rescheduleTime){
        rescheduleTime.value='';
        rescheduleTime.disabled=false;
      }
      return;
    }
    const min=Math.floor(remain/60);
    const sec=String(remain%60).padStart(2,'0');
    if(rescheduleStatus)rescheduleStatus.textContent='새 시간이 '+min+':'+sec+' 동안 임시 확보되었습니다. 확정 전까지 기존 예약은 유지됩니다.';
  }

  async function releaseActiveRescheduleHold(){
    const hold=activeRescheduleHold;
    clearActiveRescheduleHoldLocal();
    if(submitReschedule)submitReschedule.disabled=true;
    if(!hold?.hold_id)return;
    try{await fetchApi('release_slot',{hold_id:hold.hold_id})}catch(_){}
  }

  async function loadRescheduleAvailability(){
    const version=++rescheduleAvailabilityVersion;
    ++rescheduleHoldVersion;
    await releaseActiveRescheduleHold();

    if(!rescheduleDate?.value||!state.booking?.backend_id){
      if(rescheduleTime){
        rescheduleTime.innerHTML='<option value="">날짜를 먼저 선택</option>';
        rescheduleTime.disabled=true;
      }
      if(rescheduleStatus)rescheduleStatus.textContent='날짜를 선택하면 실제 가능한 시간을 확인합니다.';
      return;
    }

    if(rescheduleTime){
      rescheduleTime.innerHTML='<option value="">가능 시간 확인 중…</option>';
      rescheduleTime.disabled=true;
    }
    if(rescheduleStatus)rescheduleStatus.textContent='서버에서 변경 가능한 시간을 확인하고 있습니다.';
    if(submitReschedule)submitReschedule.disabled=true;

    try{
      const data=await fetchApi('booking_availability',{
        booking_id:state.booking.backend_id,
        desired_date:rescheduleDate.value
      });
      if(version!==rescheduleAvailabilityVersion)return;
      const slots=Array.isArray(data?.slots)?data.slots:[];
      if(!slots.length){
        if(rescheduleTime){
          rescheduleTime.innerHTML='<option value="">가능한 시간 없음</option>';
          rescheduleTime.disabled=true;
        }
        if(rescheduleStatus)rescheduleStatus.textContent='선택한 날짜에는 변경 가능한 시간이 없습니다.';
        return;
      }
      if(rescheduleTime){
        rescheduleTime.innerHTML='<option value="">시간 선택</option>'+slots.map(slot=>{
          const start=formatKstTime(slot.starts_at);
          const end=formatKstTime(slot.ends_at);
          const remaining=Number(slot.remaining);
          return '<option value="'+escapeHtml(slot.starts_at)+'">'+start+'–'+end+(Number.isFinite(remaining)?' · '+remaining+'자리':'')+'</option>';
        }).join('');
        rescheduleTime.disabled=false;
      }
      if(rescheduleStatus)rescheduleStatus.textContent='변경 가능한 시간 '+slots.length+'개 · 새 시간을 선택하면 10분간 임시 확보합니다.';
    }catch(err){
      if(version!==rescheduleAvailabilityVersion)return;
      if(rescheduleTime){
        rescheduleTime.innerHTML='<option value="">시간 조회 실패</option>';
        rescheduleTime.disabled=true;
      }
      if(rescheduleStatus)rescheduleStatus.textContent='변경 가능 시간을 불러오지 못했습니다.';
    }
  }

  async function holdRescheduleSlot(){
    const startsAt=rescheduleTime?.value||'';
    const version=++rescheduleHoldVersion;
    await releaseActiveRescheduleHold();
    if(!startsAt||!state.booking?.backend_id)return;

    if(rescheduleStatus)rescheduleStatus.textContent='새 시간을 임시 확보하는 중입니다.';
    if(submitReschedule)submitReschedule.disabled=true;

    try{
      const data=await fetchApi('hold_booking_slot',{
        booking_id:state.booking.backend_id,
        starts_at:startsAt
      });
      const hold=data?.hold;
      if(!hold?.hold_id)throw Error('HOLD_INVALID');

      if(version!==rescheduleHoldVersion){
        try{await fetchApi('release_slot',{hold_id:hold.hold_id})}catch(_){}
        return;
      }

      activeRescheduleHold=hold;
      updateRescheduleHoldStatus();
      stopRescheduleTicker();
      rescheduleHoldTicker=setInterval(updateRescheduleHoldStatus,1000);
      if(submitReschedule)submitReschedule.disabled=false;
    }catch(err){
      if(version!==rescheduleHoldVersion)return;
      clearActiveRescheduleHoldLocal();
      if(submitReschedule)submitReschedule.disabled=true;
      if(rescheduleTime)rescheduleTime.value='';
      if(rescheduleStatus)rescheduleStatus.textContent='선택 시간이 방금 마감되었습니다. 다른 시간을 선택해주세요.';
      loadRescheduleAvailability();
    }
  }

  function openReschedule(){
    if(!state.booking?.backend_id){showToast('서버 예약만 일정 변경할 수 있습니다.');return}
    const status=normalizeBookingStatus(state.booking.status);
    if(!['PENDING','CONFIRMED'].includes(status)){showToast('현재 상태에서는 일정을 변경할 수 없습니다.');return}

    const today=new Date();
    if(rescheduleDate){
      rescheduleDate.min=localDateString(today);
      const current=state.booking.scheduledAt?new Date(state.booking.scheduledAt):new Date(today.getTime()+24*60*60*1000);
      rescheduleDate.value=localDateString(current);
    }
    if(rescheduleTime){
      rescheduleTime.innerHTML='<option value="">가능 시간 확인 중…</option>';
      rescheduleTime.disabled=true;
    }
    if(rescheduleStatus)rescheduleStatus.textContent='기존 예약은 새 일정이 확정될 때까지 그대로 유지됩니다.';
    rescheduleSheet.hidden=false;
    document.body.style.overflow='hidden';
    loadRescheduleAvailability();
  }

  function closeReschedule(){
    ++rescheduleAvailabilityVersion;
    ++rescheduleHoldVersion;
    releaseActiveRescheduleHold();
    if(rescheduleTime){
      rescheduleTime.innerHTML='<option value="">날짜를 먼저 선택</option>';
      rescheduleTime.disabled=true;
    }
    rescheduleSheet.hidden=true;
    document.body.style.overflow='';
  }

  function openBookingSheet(){
    if(!isEligible(state.selectedQuote?.id)){showToast('예시 견적은 예약할 수 없습니다. 실제 견적 연결을 확인해주세요.');return}
    if(!state.selectedQuote){showToast('먼저 견적을 선택해주세요.');return}
    if(!state.currentRequest){showToast('먼저 서비스 요청을 분석해주세요.');return}
    $('#sheetService').textContent=state.currentRequest.service;
    $('#sheetQuote').textContent=state.selectedQuote.name+' · ₩'+Number(state.selectedQuote.price).toLocaleString('ko-KR');
    const todayDate=new Date();
    const tomorrow=new Date(todayDate.getTime()+24*60*60*1000);
    if(desiredDate){
      desiredDate.min=localDateString(todayDate);
      const preferredDate=state.currentRequest?.desiredDate||state.selectedQuote?.availability?.desired_date||'';
      desiredDate.value=preferredDate||localDateString(tomorrow);
      desiredDate.disabled=Boolean(preferredDate);
    }
    const recoveryMode=Boolean(
      state.recoveryContext?.oldBookingId===state.booking?.backend_id &&
      (state.booking?.confirmation?.recovery_status==='action_required'||state.booking?.confirmation?.action_required===true)
    );
    for(const id of ['#customerName','#customerPhone','#customerRegion']){
      const field=$(id);
      if(!field)continue;
      field.disabled=recoveryMode;
      field.required=!recoveryMode;
    }
    if(recoveryMode){
      $('#sheetService').textContent='대체 예약 · '+state.currentRequest.service;
    }
    pendingIdempotency=makeIdempotency();
    bookingSheet.hidden=false;
    document.body.style.overflow='hidden';
    loadAvailability();
  }

  function closeSheet(){
    ++availabilityVersion;
    ++slotHoldVersion;
    releaseActiveSlotHold();
    if(desiredTime){
      desiredTime.innerHTML='<option value="">날짜를 먼저 선택</option>';
      desiredTime.disabled=true;
    }
    if(desiredDate)desiredDate.disabled=false;
    bookingSheet.hidden=true;
    document.body.style.overflow='';
  }

  bookSelected?.addEventListener('click',()=>{
    if(state.selectedQuote)bestEffortTrack('booking_intent',state.selectedQuote);
    const intent=new CustomEvent('korual:booking-intent',{cancelable:true,detail:{openBookingSheet}});
    if(bookSelected.dispatchEvent(intent))openBookingSheet();
  });
  closeBookingSheet?.addEventListener('click',closeSheet);
  cancelBookingSheet?.addEventListener('click',closeSheet);
  bookingSheet?.addEventListener('click',e=>{if(e.target===bookingSheet)closeSheet()});
  desiredDate?.addEventListener('change',loadAvailability);
  desiredTime?.addEventListener('change',holdSelectedSlot);
  bookingCompareAlternatives?.addEventListener('click',()=>{
    const recoveryRequired=state.booking?.confirmation?.recovery_status==='action_required'||state.booking?.confirmation?.action_required===true;
    if(!recoveryRequired){
      state.recoveryContext=null;
      save();
      showScreen('quotes');
      if(state.currentRequest)loadQuotes(state.currentRequest);
      return;
    }
    const providerKey=state.booking?.quote?.provider_key;
    state.recoveryContext={
      oldBookingId:state.booking.backend_id,
      excludedProviderKeys:providerKey?[providerKey]:[],
      operationKey:state.recoveryContext?.oldBookingId===state.booking.backend_id
        ?state.recoveryContext.operationKey
        :makeIdempotency().replace(/^kb_/,'kr_'),
      startedAt:Date.now()
    };
    state.selectedQuote=null;
    save();
    showScreen('quotes');
    if(state.currentRequest){
      loadQuotes({...state.currentRequest,excludeProviderKeys:state.recoveryContext.excludedProviderKeys});
    }
    showToast('기존 예약은 유지한 채 다른 업체만 다시 비교합니다.');
  });
  rescheduleBooking?.addEventListener('click',openReschedule);
  closeRescheduleSheet?.addEventListener('click',closeReschedule);
  cancelRescheduleSheet?.addEventListener('click',closeReschedule);
  rescheduleSheet?.addEventListener('click',e=>{if(e.target===rescheduleSheet)closeReschedule()});
  rescheduleDate?.addEventListener('change',loadRescheduleAvailability);
  rescheduleTime?.addEventListener('change',holdRescheduleSlot);

  rescheduleForm?.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!state.booking?.backend_id||!activeRescheduleHold?.hold_id)return;
    if(new Date(activeRescheduleHold.expires_at).getTime()<=Date.now()){
      clearActiveRescheduleHoldLocal();
      if(submitReschedule)submitReschedule.disabled=true;
      showToast('새 시간 hold가 만료되었습니다. 다시 선택해주세요.');
      return;
    }
    if(submitReschedule){submitReschedule.disabled=true;submitReschedule.textContent='변경 중…'}
    try{
      await fetchApi('reschedule_booking',{
        booking_id:state.booking.backend_id,
        slot_hold_id:activeRescheduleHold.hold_id
      });
      clearActiveRescheduleHoldLocal();
      rescheduleSheet.hidden=true;
      document.body.style.overflow='';
      await syncBookingStatus({silent:true});
      renderBooking();
      renderHome();
      showToast('예약 일정이 변경되었습니다.');
    }catch(err){
      const code=err?.code||'API_ERROR';
      const messages={
        BOOKING_NOT_RESCHEDULABLE:'현재 상태에서는 일정을 변경할 수 없습니다.',
        SLOT_HOLD_EXPIRED:'새 시간 hold가 만료되었습니다. 다시 선택해주세요.',
        SLOT_HOLD_INACTIVE:'새 시간이 더 이상 확보되어 있지 않습니다.',
        SLOT_HOLD_MISMATCH:'예약 업체와 선택 시간이 일치하지 않습니다.',
        SLOT_HOLD_REQUIRED:'변경할 시간을 다시 선택해주세요.'
      };
      if(['SLOT_HOLD_EXPIRED','SLOT_HOLD_INACTIVE','SLOT_HOLD_MISMATCH','SLOT_HOLD_REQUIRED'].includes(code)){
        clearActiveRescheduleHoldLocal();
        if(rescheduleTime)rescheduleTime.value='';
        loadRescheduleAvailability();
      }
      showToast(messages[code]||'일정 변경에 실패했습니다.');
    }finally{
      if(submitReschedule){
        submitReschedule.textContent='일정 변경 확정';
        const valid=activeRescheduleHold?.hold_id&&new Date(activeRescheduleHold.expires_at).getTime()>Date.now();
        submitReschedule.disabled=!valid;
      }
    }
  });

  cancelBooking?.addEventListener('click',async()=>{
    if(!state.booking?.backend_id)return;
    const status=normalizeBookingStatus(state.booking.status);
    if(!['PENDING','CONFIRMED'].includes(status)){showToast('현재 상태에서는 예약을 취소할 수 없습니다.');return}
    if(!window.confirm('이 예약을 취소할까요? 취소하면 해당 시간은 다시 예약 가능 상태로 돌아갑니다.'))return;

    cancelBooking.disabled=true;
    const original=cancelBooking.textContent;
    cancelBooking.textContent='취소 중…';
    try{
      await fetchApi('cancel_booking',{
        booking_id:state.booking.backend_id,
        reason:'customer_cancelled'
      });
      await syncBookingStatus({silent:true});
      renderBooking();
      renderHome();
      renderProfile();
      showToast('예약이 취소되었습니다.');
    }catch(err){
      const code=err?.code||'API_ERROR';
      showToast(code==='BOOKING_NOT_CANCELLABLE'?'현재 상태에서는 예약을 취소할 수 없습니다.':'예약 취소에 실패했습니다.');
    }finally{
      cancelBooking.textContent=original||'예약 취소';
      const current=normalizeBookingStatus(state.booking?.status);
      cancelBooking.disabled=!['PENDING','CONFIRMED'].includes(current);
    }
  });

  prepareBundleBooking?.addEventListener('click',prepareAtomicBundle);
  closeBundleBookingSheet?.addEventListener('click',()=>closeBundleSheet({release:true}));
  cancelBundleBookingSheet?.addEventListener('click',()=>closeBundleSheet({release:true}));
  bundleBookingSheet?.addEventListener('click',e=>{if(e.target===bundleBookingSheet)closeBundleSheet({release:true})});

  bundleBookingForm?.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!activeBundleHolds.length||!bundleOperationKey||!state.currentRequest)return;
    const name=String(bundleCustomerName?.value||'').trim();
    const phone=String(bundleCustomerPhone?.value||'').replace(/[^0-9]/g,'');
    const region=String(bundleCustomerRegion?.value||'').trim();
    const date=String(bundleDesiredDate?.value||'').trim();
    if(name.length<2){showToast('예약자 이름을 확인해주세요.');return}
    if(phone.length<10||phone.length>11){showToast('연락처를 확인해주세요.');return}
    if(region.length<2){showToast('서비스 지역을 확인해주세요.');return}

    if(submitBundleBooking){submitBundleBooking.disabled=true;submitBundleBooking.textContent='전체 예약 확정 중…'}
    try{
      const data=await fetchApi('book_bundle',{
        operation_key:bundleOperationKey,
        request:bundleRequestPayload(),
        customer:{name,phone,region,desired_date:date},
        items:activeBundleHolds.map(x=>({quote_token:x.quote_token,slot_hold_id:x.hold_id}))
      });
      stopBundleHoldTicker();
      activeBundleHolds=[];
      const bundle=data.bundle||{};
      state.bundleBooking={
        ...bundle,
        backend_id:bundle.group_id||bundle.id,
        services:Array.isArray(state.currentRequest.bundle)?state.currentRequest.bundle.slice():[],
        region,
        desired_date:date,
        serverUpdatedAt:Date.now()
      };
      bundleOperationKey='';
      if(bundleBookingSheet)bundleBookingSheet.hidden=true;
      document.body.style.overflow='';
      setBundleStep(4);
      save();
      await syncBundleStatus({silent:true});
      showScreen('bookings');
      showToast('모든 서비스가 하나의 묶음 예약으로 확정되었습니다.');
    }catch(err){
      const code=err?.code||'API_ERROR';
      await releaseActiveBundleHolds();
      setBundleStep(2);
      const messages={
        SLOT_HOLD_EXPIRED:'확보 시간이 만료되었습니다. 시간을 다시 선택해주세요.',
        SLOT_HOLD_INACTIVE:'일부 시간이 더 이상 확보되어 있지 않습니다.',
        SLOT_HOLD_MISMATCH:'서비스와 확보 시간이 일치하지 않습니다.',
        BUNDLE_SERVICE_MISMATCH:'서비스 조합이 변경되었습니다. 조합 플랜을 다시 확인해주세요.',
        QUOTE_DATE_MISMATCH:'희망일이 변경되었습니다. 조합 플랜을 다시 계산해주세요.',
        PROVIDER_UNAVAILABLE:'일부 업체 상태가 변경되었습니다. 조합 플랜을 다시 계산해주세요.'
      };
      showToast(messages[code]||'묶음 예약을 완료하지 못했습니다. 부분 예약은 생성되지 않았습니다.');
      if(bundleBookingSheet)bundleBookingSheet.hidden=true;
      document.body.style.overflow='';
      loadBundlePlan();
    }finally{
      if(submitBundleBooking){submitBundleBooking.textContent='전체 예약 확정';submitBundleBooking.disabled=!activeBundleHolds.length}
    }
  });

  bookingForm?.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!state.selectedQuote||!state.currentRequest||!isEligible(state.selectedQuote.id))return;
    if(!activeSlotHold?.hold_id){
      showToast('예약 시간을 먼저 선택해주세요.');
      return;
    }
    if(new Date(activeSlotHold.expires_at).getTime()<=Date.now()){
      clearActiveSlotHoldLocal();
      if(submitBooking)submitBooking.disabled=true;
      showToast('시간 hold가 만료되었습니다. 시간을 다시 선택해주세요.');
      return;
    }
    const customer={
      name:$('#customerName')?.value||'',
      phone:$('#customerPhone')?.value||'',
      region:$('#customerRegion')?.value||'',
      desired_date:desiredDate?.value||''
    };
    if(submitBooking){submitBooking.disabled=true;submitBooking.textContent='저장 중…'}
    try{
      const recoveryMode=Boolean(
        state.recoveryContext?.oldBookingId===state.booking?.backend_id &&
        (state.booking?.confirmation?.recovery_status==='action_required'||state.booking?.confirmation?.action_required===true)
      );
      const data=recoveryMode
        ?await fetchApi('replace_booking',{
            old_booking_id:state.recoveryContext.oldBookingId,
            operation_key:state.recoveryContext.operationKey,
            quote_token:state.selectedQuote.quoteToken||null,
            recommendation_run_id:state.selectedQuote.recommendationRunId||null,
            slot_hold_id:activeSlotHold.hold_id
          })
        :await fetchApi('book',{
            request:state.currentRequest,
            quote_token:state.selectedQuote.quoteToken||null,
            quote_key:state.selectedQuote.id,
            recommendation_run_id:state.selectedQuote.recommendationRunId||null,
            customer,
            slot_hold_id:activeSlotHold.hold_id,
            idempotency_key:pendingIdempotency||makeIdempotency()
          });
      const b=data.booking||{};
      state.booking={
        id:b.request_code||b.booking_id||('KR-'+Date.now().toString(36).toUpperCase()),
        backend_id:b.booking_id||null,
        request_id:b.request_id||null,
        status:String(b.status||'pending').toUpperCase(),
        service:state.currentRequest.service,
        quote:{
          id:state.selectedQuote.id,
          backend_id:b.quote_id||null,
          name:b.provider_name||state.selectedQuote.name,
          price:Number(b.amount??state.selectedQuote.price),
          provider_key:b.provider_key||state.selectedQuote.provider_key||null
        },
        customer:{
          name:customer.name||state.booking?.customer?.name||'',
          phone:customer.phone||state.booking?.customer?.phone||'',
          region:customer.region||state.booking?.customer?.region||''
        },
        requestStatus:'BOOKED',
        scheduledAt:b.scheduled_at||activeSlotHold?.starts_at||null,
        createdAt:Date.now(),
        serverUpdatedAt:Date.now()
      };
      clearActiveSlotHoldLocal();
      state.recoveryContext=null;
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
        RECOVERY_NOT_REQUIRED:'현재 예약은 대체 예약이 필요한 상태가 아닙니다.',
        RECOVERY_SAME_PROVIDER:'복구 예약은 기존 업체가 아닌 다른 업체를 선택해주세요.',
        BOOKING_NOT_RECOVERABLE:'현재 예약 상태에서는 업체 교체를 진행할 수 없습니다.',
        QUOTE_TOKEN_INVALID:'견적 유효시간이 지났거나 견적 정보가 변경되었습니다. 견적을 다시 불러와주세요.',
        QUOTE_SERVICE_MISMATCH:'선택한 견적과 현재 요청 서비스가 일치하지 않습니다. 다시 비교해주세요.',
        QUOTE_REGION_MISMATCH:'견적을 받은 지역과 예약 지역이 다릅니다. 지역 조건으로 다시 비교해주세요.',
        QUOTE_TOKEN_REQUIRED:'최신 견적 확인이 필요합니다. 견적을 다시 불러와주세요.',
        QUOTE_DATE_MISMATCH:'희망일이 변경되었습니다. 견적 화면에서 해당 날짜 기준으로 다시 비교해주세요.',
        SLOT_HOLD_REQUIRED:'예약 시간을 다시 선택해주세요.',
        SLOT_HOLD_EXPIRED:'선택한 시간 hold가 만료되었습니다. 시간을 다시 선택해주세요.',
        SLOT_HOLD_INACTIVE:'선택한 시간이 더 이상 확보되어 있지 않습니다.',
        SLOT_HOLD_MISMATCH:'선택한 시간과 현재 예약 조건이 일치하지 않습니다.',
        SLOT_UNAVAILABLE:'선택한 시간이 방금 마감되었습니다. 다른 시간을 선택해주세요.',
        RATE_LIMITED:'요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        ORIGIN_NOT_ALLOWED:'현재 접속 주소에서는 예약 저장을 사용할 수 없습니다.'
      };
      if(state.selectedQuote)bestEffortTrack('booking_failure',state.selectedQuote);
      if(['SLOT_HOLD_REQUIRED','SLOT_HOLD_EXPIRED','SLOT_HOLD_INACTIVE','SLOT_HOLD_MISMATCH','SLOT_UNAVAILABLE','QUOTE_DATE_MISMATCH'].includes(code)){
        clearActiveSlotHoldLocal();
        if(desiredTime)desiredTime.value='';
        if(code==='QUOTE_DATE_MISMATCH'){
          closeSheet();
          showScreen('quotes');
        }else{
          loadAvailability();
        }
      }
      showToast(messages[code]||'예약 저장에 실패했습니다. 다시 시도해주세요.');
    }finally{
      if(submitBooking){
        submitBooking.textContent='예약 요청 저장';
        const validHold=activeSlotHold?.hold_id&&new Date(activeSlotHold.expires_at).getTime()>Date.now();
        submitBooking.disabled=!validHold;
      }
    }
  });

  function normalizeBookingStatus(value){
    const v=String(value||'').toUpperCase();
    if(v==='REQUESTED')return 'PENDING';
    if(['PENDING','CONFIRMED','COMPLETED','CANCELLED'].includes(v))return v;
    return 'PENDING';
  }

  let bookingStatusVersion=0;
  let bookingStatusInFlight=false;

  async function syncBookingStatus({silent=false}={}){
    const booking=state.booking;
    if(!booking?.backend_id||bookingStatusInFlight)return;
    const version=++bookingStatusVersion;
    bookingStatusInFlight=true;
    const meta=$('#bookingSyncMeta');
    if(meta&&!silent)meta.textContent='서버 상태 확인 중…';

    try{
      const data=await fetchApi('booking_status',{booking_id:booking.backend_id});
      if(version!==bookingStatusVersion)return;
      const server=data?.booking;
      if(!server)return;

      const nextStatus=normalizeBookingStatus(server.status);
      const previousStatus=normalizeBookingStatus(state.booking?.status);
      const quoteAmount=Number(server.quote?.amount);
      const services=Array.isArray(server.request?.services)?server.request.services.filter(Boolean):[];
      if(!state.currentRequest&&services.length){
        const region=String(server.request?.region||'').trim();
        state.currentRequest={
          raw:(region?region+' ':'')+services.join(' '),
          service:services[0],
          bundle:services,
          priority:'가격 + 신뢰',
          priorityMode:'balanced',
          preferenceExplicit:false,
          budgetCap:null
        };
      }

      state.booking={
        ...state.booking,
        status:nextStatus,
        requestStatus:String(server.request?.status||state.booking.requestStatus||'').toUpperCase(),
        scheduledAt:server.scheduled_at||state.booking.scheduledAt||null,
        recommendationRunId:server.recommendation_run_id||state.booking.recommendationRunId||null,
        confirmation:server.confirmation&&typeof server.confirmation==='object'?server.confirmation:state.booking.confirmation||null,
        events:Array.isArray(server.events)?server.events.slice(0,20):[],
        serverUpdatedAt:Date.now(),
        service:services.length?services.join(' · '):state.booking.service,
        quote:{
          ...state.booking.quote,
          backend_id:server.quote?.id||state.booking.quote?.backend_id||null,
          name:server.provider?.name||state.booking.quote?.name||'Partner',
          provider_key:server.provider?.provider_key||state.booking.quote?.provider_key||null,
          price:Number.isFinite(quoteAmount)?quoteAmount:state.booking.quote?.price
        }
      };

      if(previousStatus!=='COMPLETED'&&nextStatus==='COMPLETED'){
        state.completes=(Number(state.completes)||0)+1;
      }
      if(!(state.booking?.confirmation?.recovery_status==='action_required'||state.booking?.confirmation?.action_required===true)){
        state.recoveryContext=null;
      }
      save();
      renderBooking();
      renderHome();
      renderProfile();
    }catch(err){
      if(!silent&&meta)meta.textContent='서버 상태 확인 실패 · 기존 표시 유지';
    }finally{
      bookingStatusInFlight=false;
    }
  }

  let bookingStatusPollTimer=null;
  function ensureBookingStatusPolling(){
    if(bookingStatusPollTimer)return;
    bookingStatusPollTimer=setInterval(()=>{
      if(document.hidden)return;
      const bookingsScreen=document.querySelector('.screen[data-screen="bookings"]');
      const confirmationState=String(state.booking?.confirmation?.status||'').toLowerCase();
      if(bookingsScreen&&!bookingsScreen.hidden&&state.booking?.backend_id&&['','awaiting'].includes(confirmationState)){
        syncBookingStatus({silent:true});
      }
      if(bookingsScreen&&!bookingsScreen.hidden&&state.bundleBooking?.backend_id){
        syncBundleStatus({silent:true});
      }
    },30000);
  }
  ensureBookingStatusPolling();

  function renderBooking(){
    const empty=$('#emptyBooking');
    const card=$('#bookingCard');
    if(!state.booking){
      if(empty) empty.hidden=Boolean(state.bundleBooking);
      if(card) card.hidden=true;
      return;
    }

    if(empty) empty.hidden=true;
    if(card) card.hidden=false;

    const status=normalizeBookingStatus(state.booking.status);
    const labels={
      PENDING:{eyebrow:'REQUESTED',badge:'접수됨'},
      CONFIRMED:{eyebrow:'CONFIRMED',badge:'업체 확인'},
      COMPLETED:{eyebrow:'COMPLETED',badge:'완료'},
      CANCELLED:{eyebrow:'CANCELLED',badge:'취소됨'}
    }[status];

    const bookingId=$('#bookingId');
    const serviceLabel=$('#bookingServiceLabel');
    const providerLabel=$('#bookingProviderLabel');
    const priceLabel=$('#bookingPriceLabel');
    const eyebrow=$('#bookingStatusEyebrow');
    const badge=$('#bookingStatusBadge');
    const syncMeta=$('#bookingSyncMeta');
    const confirmationNotice=$('#bookingConfirmationNotice');
    const compareAlternatives=$('#bookingCompareAlternatives');

    if(bookingId)bookingId.textContent=state.booking.id||'—';
    if(serviceLabel)serviceLabel.textContent=state.booking.service||'서비스';
    if(providerLabel)providerLabel.textContent=state.booking.quote?.name||'Partner';
    if(priceLabel)priceLabel.textContent=state.booking.quote?.price?'₩'+Number(state.booking.quote.price).toLocaleString('ko-KR'):'—';
    if(eyebrow)eyebrow.textContent=labels.eyebrow;
    if(badge){badge.textContent=labels.badge;badge.dataset.status=status.toLowerCase()}

    if(syncMeta){
      const updated=Number(state.booking.serverUpdatedAt);
      const time=Number.isFinite(updated)?new Date(updated).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}):'—';
      const requestStatus=state.booking.requestStatus||'—';
      const scheduled=state.booking.scheduledAt?new Intl.DateTimeFormat('ko-KR',{
        timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false
      }).format(new Date(state.booking.scheduledAt)):'일정 미정';
      syncMeta.textContent='서버 '+requestStatus+' · '+scheduled+' · 마지막 동기화 '+time;
    }

    const confirmation=state.booking.confirmation||{};
    const confirmationState=String(confirmation.status||'awaiting').toLowerCase();
    const recoveryRequired=confirmation.recovery_status==='action_required'||confirmation.action_required===true;
    if(confirmationNotice){
      const copy={
        awaiting:['업체 확인 대기','확인 기한 내 응답을 기다리고 있습니다.'],
        confirmed:['업체 확인 완료','업체가 예약을 확인했습니다.'],
        expired:['업체 확인 지연','확인 기한이 지나 대안 비교가 필요합니다.'],
        declined:['업체 예약 거절','현재 업체가 예약을 진행할 수 없습니다.'],
        not_required:['확인 단계 종료','현재 예약 상태에서는 추가 업체 확인이 필요하지 않습니다.']
      }[confirmationState]||['업체 확인 상태','서버에서 확인 상태를 동기화합니다.'];
      let deadlineText='';
      if(confirmation.deadline&&confirmationState==='awaiting'){
        try{
          deadlineText=' · 확인 기한 '+new Intl.DateTimeFormat('ko-KR',{
            timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false
          }).format(new Date(confirmation.deadline));
        }catch(_){}
      }
      confirmationNotice.dataset.state=confirmationState;
      const small=confirmationNotice.querySelector('small');
      const strong=confirmationNotice.querySelector('strong');
      const span=confirmationNotice.querySelector('span');
      if(small)small.textContent=recoveryRequired?'RECOVERY REQUIRED':'PROVIDER CONFIRMATION';
      if(strong)strong.textContent=copy[0];
      if(span)span.textContent=copy[1]+deadlineText;
    }
    if(compareAlternatives){
      compareAlternatives.textContent=recoveryRequired?'대안 다시 비교':'견적 다시 보기';
    }

    const timeline=Array.from(document.querySelectorAll('.timeline-item'));
    const doneCount=status==='COMPLETED'?3:status==='CONFIRMED'?2:1;
    timeline.forEach((x,i)=>{
      x.classList.toggle('done',i<doneCount);
      x.classList.toggle('cancelled',status==='CANCELLED'&&i>0);
    });

    const repeat=$('#repeatMessage');
    const complete=$('#completeDemo');
    const reschedule=$('#rescheduleBooking');
    const cancel=$('#cancelBooking');
    const manageable=['PENDING','CONFIRMED'].includes(status);
    if(reschedule)reschedule.disabled=!manageable;
    if(cancel)cancel.disabled=!manageable;

    if(status==='COMPLETED'){
      if(repeat)repeat.textContent='완료 데이터가 서버에 기록되었습니다. 후기와 다음 연관 서비스 추천 단계로 연결됩니다.';
      if(complete){complete.textContent='완료됨';complete.disabled=true}
    }else if(status==='CANCELLED'){
      if(repeat)repeat.textContent='취소된 예약입니다. 필요하면 조건을 다시 비교해 새 요청을 시작할 수 있습니다.';
      if(complete){complete.textContent='취소됨';complete.disabled=true}
    }else if(recoveryRequired){
      if(repeat)repeat.textContent=confirmationState==='declined'
        ?'업체가 예약을 거절했습니다. 기존 요청 조건으로 다른 후보를 다시 비교할 수 있습니다.'
        :'업체 확인 기한이 지났습니다. 기존 예약을 유지한 채 대안 견적을 다시 비교할 수 있습니다.';
      if(complete){complete.textContent='확인 대기';complete.disabled=true}
    }else{
      if(repeat)repeat.textContent=confirmationState==='confirmed'||status==='CONFIRMED'
        ?'업체 확인이 완료되었습니다. 서비스 완료 후 다음 추천 흐름으로 연결됩니다.'
        :'예약 요청이 접수되었습니다. 업체 확인 상태는 서버에서 동기화됩니다.';
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
      await syncBookingStatus({silent:true});
      showToast('완료 상태를 Supabase에 기록했습니다.');
    }catch(err){
      showToast('완료 처리에 실패했습니다.');
      if(button){button.disabled=false;button.textContent='완료 시뮬레이션'}
    }
  });

  function renderHome(){
    const card=$('#homeRecommendation');
    if(!card)return;
    if(state.bundleBooking){
      const services=Array.isArray(state.bundleBooking.services)?state.bundleBooking.services.join(' · '):'복합 서비스';
      card.innerHTML='<div class="recommend-badge">B+</div><div><small>ATOMIC BUNDLE</small><strong>묶음 예약 '+Number(state.bundleBooking.items?.length||0)+'건을 확인하세요.</strong><p>'+escapeHtml(services)+'</p></div><button type="button" data-open-screen="bookings">→</button>';
    }else if(state.booking?.status==='COMPLETED'){
      card.innerHTML='<div class="recommend-badge">↻</div><div><small>REPEAT ENGINE</small><strong>다음 연관 서비스를 준비했어요.</strong><p>'+escapeHtml(state.booking.service)+' 완료 이력을 기반으로 후속 서비스를 추천합니다.</p></div><button type="button" data-open-screen="services">→</button>';
    }else if(state.booking){
      const recovery=state.booking.confirmation?.recovery_status==='action_required'||state.booking.confirmation?.action_required===true;
      card.innerHTML=recovery
        ?'<div class="recommend-badge">!</div><div><small>확인 필요</small><strong>'+escapeHtml(state.booking.service)+' 예약의 대안을 확인하세요.</strong><p>업체 확인 지연 또는 거절 상태입니다. 기존 조건으로 다시 비교할 수 있습니다.</p></div><button type="button" data-open-screen="bookings">→</button>'
        :'<div class="recommend-badge">B</div><div><small>예약 진행 중</small><strong>'+escapeHtml(state.booking.service)+' 예약을 확인하세요.</strong><p>'+escapeHtml(state.booking.quote?.name||'Partner')+' · '+escapeHtml(state.booking.id)+'</p></div><button type="button" data-open-screen="bookings">→</button>';
    }else if(state.currentRequest){
      const request=state.currentRequest;
      const summary=[request.region||uiText('areaMissing','지역 미입력'),request.desiredDate||uiText('dateMissing','일정 미지정'),state.preferences.budgetCap?Number(state.preferences.budgetCap).toLocaleString('ko-KR')+' KRW':uiText('budgetMissing','예산 미지정')];
      card.innerHTML='<div class="recommend-badge">↻</div><div><small>이어서 비교</small><strong>'+escapeHtml(uiText('resumeSentence','{service} 조건을 이어서 사용하세요.').replace('{service}',request.service))+'</strong><p>'+summary.map(escapeHtml).join(' · ')+'</p><small>원문은 장기 저장하지 않습니다. 새로고침 후에는 상세 조건을 확인해주세요.</small></div><button type="button" id="resumeRequest">조건 수정</button>';
    }else{
      card.innerHTML='<div class="recommend-badge">AI</div><div><small>아직 요청이 없어요</small><strong>필요한 서비스를 입력해보세요.</strong><p>최근 요청을 기반으로 다음 행동을 여기에 추천합니다.</p></div><button type="button" data-open-screen="match">→</button>';
    }
    $('#resumeRequest',card)?.addEventListener('click',()=>{
      const request=state.currentRequest;
      if(!request)return;
      $('#homeRequestInput').value=request.raw||request.service||'';
      $('#homeRequestRegion').value=request.region||'';
      $('#homeRequestDate').value=request.desiredDate||'';
      $('#homeRequestBudget').value=state.preferences.budgetCap||'';
      renderRequestScope();showScreen('home');
      $('#homeRequestInput').focus();
    });
    $$('[data-open-screen]',card).forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.openScreen)));
  }

  function renderProfile(){
    const r=$('#requestCount'),b=$('#bookingCount'),c=$('#completeCount');
    if(r) r.textContent=String(Number(state.requests)||0);
    const bundleCount=Array.isArray(state.bundleBooking?.items)?state.bundleBooking.items.length:0;
    if(b) b.textContent=String((state.booking?1:0)+bundleCount);
    const bundleCompleted=Array.isArray(state.bundleBooking?.items)
      ?state.bundleBooking.items.filter(x=>x.booking?.status==='completed').length
      :0;
    if(c) c.textContent=String((Number(state.completes)||0)+bundleCompleted);
  }

  function renderState(){
    renderAnalysis(state.currentRequest);
    renderQuotesSelection();
    renderBooking();
    renderBundleBooking();
    renderHome();
    renderProfile();
    renderHistory();
  }
  renderState();
  syncPreferenceUI();
  if(state.booking?.backend_id)queueMicrotask(()=>syncBookingStatus({silent:true}));
  if(state.bundleBooking?.backend_id)queueMicrotask(()=>syncBundleStatus({silent:true}));

  async function fetchHealthWithTimeout(){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),9000);
    try{
      const r=await fetch('/healthz',{signal:controller.signal});
      if(!r.ok)throw Error('WEB_HEALTH_FAILED');
      const data=await r.json().catch(()=>null);
      if(!data?.ok)throw Error('WEB_HEALTH_INVALID');
      return data;
    }finally{
      clearTimeout(timer);
    }
  }

  async function checkPlatform(){
    const panel=$('#platformPanel');
    if(panel)panel.hidden=false;
    const status=$('.status-ok');
    const apiHealth=$('#apiHealth');
    const webHealth=$('#webHealth');
    const checked=$('#healthChecked');
    if(status)status.textContent='확인 중';
    if(apiHealth)apiHealth.textContent='확인 중';
    if(webHealth)webHealth.textContent='확인 중';
    const results=await Promise.allSettled([
      fetchHealthWithTimeout(),
      fetchApi('health')
    ]);
    if(webHealth)webHealth.textContent=results[0].status==='fulfilled'?'정상':'연결 확인 필요';
    if(apiHealth)apiHealth.textContent=results[1].status==='fulfilled'?'정상':'연결 확인 필요';
    if(status)status.textContent=results.every(x=>x.status==='fulfilled')?'정상':'일부 연결 확인 필요';
    if(checked)checked.textContent=new Date().toLocaleTimeString('ko-KR');
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
      button.addEventListener('click',()=>{matchInput.value=request.raw;showScreen('match');analyze(request.raw,{count:false,conditions:{region:request.region||'',desiredDate:request.desiredDate||null,budgetCap:request.budgetCap??null}});});
      list.append(button);
    });
  }
  $('#retryQuotes')?.addEventListener('click',()=>loadQuotes(state.currentRequest));
  $('#clearQuoteFilters')?.addEventListener('click',()=>{
    if(quoteMode==='clarification'||quoteMode==='no-provider'||quoteMode==='bundle-plan'){
      showScreen('match');
      matchInput?.focus();
      return;
    }
    if(quoteMode==='date-empty'){
      quoteDesiredDate?.focus();
      return;
    }
    if(quoteMode==='recovery-empty'){
      showScreen('bookings');
      return;
    }
    if(quoteMode==='error'){
      if(state.currentRequest)loadQuotes(state.currentRequest);
      return;
    }
    state.preferences.budgetCap=null;
    state.preferences.verifiedOnly=false;
    save();syncPreferenceUI();
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      closeTrust();
      closeSheet();
      closeBundleSheet({release:true});
    }
  });

  $('#resetDemo')?.addEventListener('click',()=>{
    if(!confirm('이 기기에 저장된 KORUAL 표시 상태를 초기화할까요? 서버 예약 기록은 삭제되지 않습니다.'))return;
    quoteRequestVersion++;quoteMode='sample';liveQuoteKeys.clear();quoteCatalog={...sampleQuotes};
    state={history:[],requests:0,completes:0,currentRequest:null,selectedQuote:null,booking:null,bundlePlan:null,bundleBooking:null,recoveryContext:null,preferences:{priority:'balanced',verifiedOnly:true,budgetCap:null}};
    try{localStorage.removeItem(STATE_KEY);sessionStorage.removeItem(STATE_KEY)}catch(_){}
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
