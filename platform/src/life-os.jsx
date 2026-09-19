import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Gauge,
  Home,
  Layers3,
  Radar,
  Route,
  MapPin,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  Sparkles,
  Star,
  WandSparkles,
  Wifi,
  X
} from 'lucide-react';
import {
  createServiceRequest,
  demoQuotes,
  fetchMarketplaceSummary,
  inferServices,
  money,
  quickPrompts,
  serviceIcons,
  services
} from './app.js';

const BUILD_ID='2026.09.19-R4.1';

function App(){
  const [query,setQuery]=useState('');
  const [result,setResult]=useState(null);
  const [selected,setSelected]=useState([]);
  const [detail,setDetail]=useState(null);
  const [requestOpen,setRequestOpen]=useState(false);
  const [request,setRequest]=useState({name:'',region:'',date:'',phone:''});
  const [saved,setSaved]=useState(null);
  const [saving,setSaving]=useState(false);
  const [marketSummary,setMarketSummary]=useState({
    network:{verified_providers:0,price_benchmarks:0},
    providers:[],
    benchmark:null
  });
  const [marketLoading,setMarketLoading]=useState(true);
  const [marketError,setMarketError]=useState(false);
  const [requestError,setRequestError]=useState('');
  const [online,setOnline]=useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [theme,setTheme]=useState(
    typeof document === 'undefined'
      ? 'light'
      : document.documentElement.dataset.theme || 'light'
  );

  const recommended=useMemo(
    ()=>services.filter(([name])=>selected.includes(name)),
    [selected]
  );

  const liveBenchmark=marketSummary.benchmark;
  const liveQuotes=(marketSummary.providers || []).map(provider=>({
    name:provider.name,
    score:provider.korual_score || Math.round(Number(provider.rating || 0) * 20),
    price:liveBenchmark?.median_amount ? money(liveBenchmark.median_amount) : '견적 확인',
    delta:'실데이터',
    extra:provider.verified ? '검증' : '확인',
    live:true
  }));
  const quoteCards=liveQuotes.length ? liveQuotes : demoQuotes;
  const hasLiveBenchmark=Boolean(liveBenchmark);
  const benchmarkMin=hasLiveBenchmark ? money(liveBenchmark.min_amount) : '18만원';
  const benchmarkMedian=hasLiveBenchmark ? money(liveBenchmark.median_amount) : '21만원';
  const benchmarkMax=hasLiveBenchmark ? money(liveBenchmark.max_amount) : '25만원';

  useEffect(()=>{
    const root=document.documentElement;
    root.dataset.theme=theme;
    root.style.colorScheme=theme;
    try{
      window.localStorage?.setItem('korual-theme',theme);
    }catch{}

    const themeMeta=document.querySelector('meta[name="theme-color"]');
    if(themeMeta){
      themeMeta.setAttribute('content',theme==='dark' ? '#08090b' : '#f7f8fa');
    }
  },[theme]);

  useEffect(()=>{
    const media=window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemTheme=event=>{
      let saved=null;
      try{ saved=window.localStorage?.getItem('korual-theme') || null; }catch{}
      if(!saved){
        setTheme(event.matches ? 'dark' : 'light');
      }
    };
    media.addEventListener?.('change',syncSystemTheme);
    return()=>media.removeEventListener?.('change',syncSystemTheme);
  },[]);

  useEffect(()=>{
    const on=()=>setOnline(true);
    const off=()=>setOnline(false);
    window.addEventListener('online',on);
    window.addEventListener('offline',off);
    return()=>{
      window.removeEventListener('online',on);
      window.removeEventListener('offline',off);
    };
  },[]);

  useEffect(()=>{
    if(!online){
      setMarketLoading(false);
      return;
    }
    const controller=new AbortController();
    setMarketLoading(true);
    setMarketError(false);

    fetchMarketplaceSummary(controller.signal)
      .then(setMarketSummary)
      .catch(error=>{
        if(error.name!=='AbortError') setMarketError(true);
      })
      .finally(()=>setMarketLoading(false));

    return()=>controller.abort();
  },[online]);

  function analyze(nextQuery){
    const q=(typeof nextQuery==='string' ? nextQuery : query).trim() || '이사 준비';
    const picks=inferServices(q);
    setQuery(q);
    setSelected(picks);
    setResult({
      title:q,
      items:picks,
      note:'입력한 상황에서 우선 비교할 서비스와 다음 행동을 정리했습니다.'
    });
  }

  function toggle(name){
    setSelected(current=>
      current.includes(name)
        ? current.filter(item=>item!==name)
        : [...current,name]
    );
  }

  function openRequest(){
    setSaved(null);
    setSaving(false);
    setRequestError('');
    setRequestOpen(true);
  }

  async function submitRequest(event){
    event.preventDefault();
    if(saving) return;
    setSaving(true);
    setRequestError('');
    try{
      if(!online) throw new Error('OFFLINE');
      const payload=await createServiceRequest({
        services:selected,
        ...request
      });
      setSaved(payload.request || {status:'NEW'});
      setRequest({name:'',region:'',date:'',phone:''});
    }catch(error){
      const message=
        error.message==='OFFLINE'
          ? '인터넷 연결이 없어 접수할 수 없습니다.'
          : error.message==='RATE_LIMITED'
            ? '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
            : '견적 요청 서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.';
      setRequestError(message);
    }finally{
      setSaving(false);
    }
  }

  return <div className="app">
    <header className="nav">
      <div className="logo">
        <span>✦</span>
        <div><b>KORUAL</b><small>AI LIFE OS</small></div>
      </div>
      <span className="version-badge">BETA · {BUILD_ID}</span>
      <nav>
        <a href="#overview">홈</a>
        <a href="#services">서비스</a>
        <a href="#compare">가격 비교</a>
        <a href="#how">이용 방법</a>
      </nav>
      <div className="nav-actions">
        <span className={online?'nav-status online':'nav-status offline'}>
          <i/>{online?'ONLINE':'OFFLINE'}
        </span>
        <button
          className="theme-toggle"
          type="button"
          onClick={()=>setTheme(current=>current==='dark'?'light':'dark')}
          aria-label={theme==='dark'?'라이트 모드로 전환':'다크 모드로 전환'}
          aria-pressed={theme==='dark'}
          title={theme==='dark'?'라이트 모드':'다크 모드'}
        >
          <span className="theme-toggle-track">
            <Sun size={14}/>
            <Moon size={14}/>
            <i className="theme-toggle-knob"/>
          </span>
        </button>
        <button className="ghost" onClick={()=>setDetail({name:'KORUAL Beta',score:100})}>Beta</button>
      </div>
    </header>

    <div className="beta-safety" role="status">
      <span><ShieldCheck size={14}/> 안전한 Beta 운영</span>
      <small>공유·동적 IP 환경 대응 · HTTPS · Edge API</small>
      <div className="beta-stack">
        <b>Railway</b><i/>
        <b>Supabase</b><i/>
        <b>{online?'정상 연결':'오프라인'}</b>
      </div>
    </div>

    <main>
      <section id="overview" className="hero">
        <div className="hero-glow" aria-hidden="true"/>
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={15}/> KORUAL · 생활 의사결정 플랫폼</div>
            <h1>한 번 묻고,<br/><em>좋은 선택까지.</em></h1>
            <p>이사, 입주청소, 인터넷, 정수기처럼 복잡한 생활 서비스를 한 문장으로 시작하세요. 필요한 서비스와 가격 기준을 먼저 정리해드립니다.</p>
            <div className="hero-proof" aria-label="KORUAL 핵심 가치">
              <span><CheckCircle2 size={14}/> 필요한 것만 추천</span>
              <span><Gauge size={14}/> 가격 기준 먼저 확인</span>
              <span><BadgeCheck size={14}/> 검증 데이터 연결</span>
            </div>

            <div className="search">
              <Search size={20}/>
              <input
                aria-label="생활 문제 검색"
                value={query}
                onChange={e=>setQuery(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&analyze()}
                placeholder="예: 다음 달 청라로 이사하는데 무엇부터 준비해야 해?"
              />
              <button onClick={()=>analyze()}>무료로 시작 <ArrowRight size={17}/></button>
            </div>

            <div className="quick-prompts" aria-label="빠른 시나리오">
              {quickPrompts.map(prompt=>
                <button key={prompt} onClick={()=>analyze(prompt)}>
                  <WandSparkles size={13}/>{prompt}
                </button>
              )}
            </div>

            <div className="hero-note">
              <ShieldCheck size={14}/>
              <span>가입 없이 Beta 기능을 먼저 둘러볼 수 있습니다.</span>
            </div>
          </div>

          <aside className="decision-preview" aria-label="KORUAL 결정 예시">
            <div className="visual-orbit" aria-hidden="true">
              <div className="orbit-ring ring-one"/>
              <div className="orbit-ring ring-two"/>
              <div className="orbit-core"><Sparkles size={22}/><span>K</span></div>
              <span className="orbit-node node-a"><Home size={14}/></span>
              <span className="orbit-node node-b"><Wifi size={14}/></span>
              <span className="orbit-node node-c"><CircleDollarSign size={14}/></span>
              <div className="orbit-scan"/>
            </div>
            <div className="preview-head">
              <div>
                <span className="preview-kicker">KORUAL SUMMARY</span>
                <strong>지금 필요한 것만 정리</strong>
              </div>
              <span className="preview-live"><i/> {marketError?'연결 확인':'LIVE'}</span>
            </div>

            <div className="preview-situation">
              <span>입력한 상황</span>
              <strong>{query || '청라 신축 아파트 입주 준비'}</strong>
              <small>필요한 서비스와 우선순위를 한 번에 정리합니다.</small>
            </div>

            <div className="preview-grid">
              <article>
                <BrainCircuit size={18}/>
                <span>추천 서비스</span>
                <strong>{selected.length || 3}개</strong>
                <small>{selected.length ? selected.join(' · ') : '청소 · 인터넷 · 이사'}</small>
              </article>
              <article>
                <Gauge size={18}/>
                <span>가격 기준</span>
                <strong>{benchmarkMedian}</strong>
                <small>{hasLiveBenchmark?'실데이터 벤치마크':'Beta 데모 기준'}</small>
              </article>
            </div>

            <div className="preview-provider">
              <span><BadgeCheck size={17}/> 추천 업체</span>
              <strong>
                {quoteCards[0]?.name || '업체 매칭 대기'}
                <em>{quoteCards[0]?.score ? quoteCards[0].score + '점' : 'BETA'}</em>
              </strong>
              <small>{liveQuotes.length ? '검증된 실데이터 기준 우선 노출' : '실업체 등록 시 자동으로 Live 데이터로 전환'}</small>
            </div>

            <button className="preview-cta" onClick={()=>analyze(query || '청라 신축 아파트 입주 준비')}>
              내 상황으로 정리하기 <ArrowRight size={16}/>
            </button>
          </aside>
        </div>
      </section>

      <section className="command-strip" aria-label="KORUAL 핵심 상태">
        <article>
          <span><Sparkles size={16}/>추천</span>
          <strong>필요한 것만</strong>
          <small>상황에 맞는 서비스 우선순위</small>
        </article>
        <article>
          <span><ShieldCheck size={16}/>가격</span>
          <strong>{hasLiveBenchmark?'실데이터 기준':'Beta 기준가'}</strong>
          <small>{hasLiveBenchmark?'시장 가격 벤치마크 연결':'비교 구조 먼저 체험'}</small>
        </article>
        <article>
          <span><Layers3 size={16}/>업체</span>
          <strong>{marketLoading?'연결 중':(marketSummary.network?.verified_providers || 0) + '개 검증'}</strong>
          <small>{marketError?'데이터 연결 확인 중':(marketSummary.network?.price_benchmarks || 0) + '개 가격 데이터'}</small>
        </article>
        <article>
          <span><Activity size={16}/>플랫폼</span>
          <strong>{online?'정상 운영':'오프라인'}</strong>
          <small>Railway · Supabase 연결</small>
        </article>
      </section>

      <section className="visual-story" aria-label="KORUAL 시각적 서비스 흐름">
        <article className="visual-card visual-home">
          <div className="visual-card-art">
            <span className="visual-building"><i/><i/><i/><i/><i/><i/></span>
            <span className="visual-sun"/>
            <span className="visual-road"/>
          </div>
          <div className="visual-card-copy">
            <span>01 · LIFE SCENE</span>
            <strong>입주 준비를 한 화면으로</strong>
            <small>청소 · 이사 · 인터넷을 하나의 실행 흐름으로 묶습니다.</small>
          </div>
        </article>

        <article className="visual-card visual-route">
          <div className="visual-card-art route-art">
            <Route size={58}/>
            <span className="route-dot dot-one"/>
            <span className="route-dot dot-two"/>
            <span className="route-dot dot-three"/>
          </div>
          <div className="visual-card-copy">
            <span>02 · DECISION FLOW</span>
            <strong>복잡한 선택을 경로로</strong>
            <small>입력한 상황을 서비스·가격·업체 순서로 구조화합니다.</small>
          </div>
        </article>

        <article className="visual-card visual-data">
          <div className="visual-card-art data-art">
            <Radar size={62}/>
            <div className="mini-bars"><i/><i/><i/><i/><i/></div>
            <span className="data-pulse"/>
          </div>
          <div className="visual-card-copy">
            <span>03 · LIVE SIGNAL</span>
            <strong>데이터가 쌓일수록 정교하게</strong>
            <small>가격 벤치마크와 검증업체 데이터가 실시간 의사결정에 반영됩니다.</small>
          </div>
        </article>
      </section>

      {result && <section className="analysis card" aria-live="polite">
        <div>
          <span className="label">KORUAL AI 분석 완료</span>
          <h2>“{result.title}”</h2>
          <p>{result.note}</p>
        </div>
        <button aria-label="분석 닫기" className="close" onClick={()=>setResult(null)}><X size={17}/></button>
        <div className="chips">
          {services.map(([name])=>
            <button
              key={name}
              className={selected.includes(name)?'chip active':'chip'}
              aria-pressed={selected.includes(name)}
              onClick={()=>toggle(name)}
            >
              {name}{selected.includes(name)&&' ✓'}
            </button>
          )}
        </div>
      </section>}

      <section id="compare" className="section">
        <div className="section-head">
          <div>
            <span className="label">PRICE GUIDE</span>
            <h2>견적 받기 전에 가격부터 확인하세요.</h2>
            <p>최저가보다 중요한 건 <strong>적정 범위와 추가 비용 위험</strong>입니다.</p>
          </div>
          <span className={hasLiveBenchmark?'live live-data':'live'}>
            <i/> {hasLiveBenchmark?'LIVE MARKET DATA':'BETA DATA · DB READY'}
          </span>
        </div>

        <div className="price-card card">
          <div className="price-main">
            <div>
              <span>{liveBenchmark?.service_category || '입주청소'} · {liveBenchmark?.region || '30평 기준'}</span>
              <strong>{benchmarkMedian}</strong>
              <small>
                {hasLiveBenchmark
                  ? '표본 ' + (liveBenchmark.sample_count || 0) + '건 · 신뢰도 ' + (liveBenchmark.confidence_score || 0) + '%'
                  : '시장가격 18–25만원 · KORUAL 데모 기준'}
              </small>
            </div>
            <span className="data-mode">{hasLiveBenchmark?'LIVE':'DEMO'}</span>
          </div>

          <div className="price-meter">
            <div><span>적정 범위</span><b>{benchmarkMedian}</b></div>
            <div className="track"><i/></div>
            <div className="range"><span>{benchmarkMin}</span><span>{benchmarkMax}</span></div>
          </div>

          <div className="quotes">
            {quoteCards.map(q=>
              <article key={q.name} className={q.live?'quote-live':''}>
                <div className="qtop"><strong>{q.name}</strong><span>★ {q.score}</span></div>
                <b>{q.price}</b>
                <small>{q.delta} · {q.live?'검증 업체':'추가금 위험 ' + q.extra}</small>
                <button onClick={()=>setDetail(q)}>상세 보기 <ChevronRight size={15}/></button>
              </article>
            )}
          </div>
        </div>
      </section>

      <section id="services" className="section">
        <div className="section-head">
          <div>
            <span className="label">SERVICES</span>
            <h2>필요한 서비스를 골라 한 번에 비교하세요.</h2>
            <p>여러 업체를 따로 찾지 않고 필요한 항목만 묶어서 요청할 수 있습니다.</p>
          </div>
        </div>

        <div className="service-grid">
          {services.map(([name,desc,price])=>{
            const Icon=serviceIcons[name] || Home;
            const active=selected.includes(name);
            return <button
              className={active?'service selected':'service'}
              key={name}
              onClick={()=>toggle(name)}
              aria-pressed={active}
            >
              <span className="service-icon"><Icon size={18}/></span>
              <div>
                <strong>{name}</strong>
                <p>{desc}</p>
                <small>{price}</small>
              </div>
              <span className="service-action">
                {active?<CheckCircle2 size={17}/>:<ChevronRight size={17}/>}
              </span>
            </button>;
          })}
        </div>
      </section>

      {recommended.length>0 && <section className="bundle card">
        <div>
          <span className="label">MY LIFE PLAN</span>
          <h2>{recommended.length}개 서비스 선택</h2>
          <p>{recommended.map(([name])=>name).join(' · ')}</p>
        </div>
        <button onClick={openRequest}>한 번에 견적 요청 <ArrowRight size={17}/></button>
      </section>}

      <section id="how" className="how section">
        <div className="section-head">
          <div>
            <span className="label">HOW IT WORKS</span>
            <h2>입력부터 견적까지<br/>4단계로 끝냅니다.</h2>
          </div>
        </div>
        <div className="steps">
          {[
            ['01','상황 입력','한 문장으로 생활 문제를 설명합니다.'],
            ['02','AI 판단','필요한 서비스와 불필요한 서비스를 구분합니다.'],
            ['03','가격 비교','시장가격과 실제 견적의 차이를 계산합니다.'],
            ['04','거래 연결','검증된 업체와 예약까지 연결합니다.']
          ].map(([number,title,description])=>
            <article key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          )}
        </div>
      </section>

      {online && <aside className="card ad-slot" aria-label="광고 영역">
        <small><Wifi size={13}/> KORUAL AD · 온라인 연결 상태에서만 표시</small>
      </aside>}
    </main>

    <footer>
      <div className="logo"><span>✦</span><div><b>KORUAL</b><small>AI LIFE OS</small></div></div>
      <span>생활을 KORUAL 하나로.</span>
      <small>Decision first · Transaction second · {BUILD_ID}</small>
    </footer>

    {recommended.length>0 && <div className="floating-plan">
      <div>
        <span>선택 {recommended.length}</span>
        <strong>{recommended.map(([name])=>name).join(' · ')}</strong>
      </div>
      <button onClick={openRequest}>견적 요청 <ArrowRight size={16}/></button>
    </div>}

    <nav className="mobile-dock" aria-label="모바일 주요 메뉴">
      <a href="#overview">홈</a>
      <a href="#compare">가격</a>
      <a href="#services">서비스</a>
      <a href="#how">방식</a>
    </nav>

    {detail && <div className="modal-backdrop" onClick={()=>setDetail(null)}>
      <div className="modal card" onClick={e=>e.stopPropagation()}>
        <button aria-label="상세 닫기" className="close" onClick={()=>setDetail(null)}><X size={18}/></button>
        <span className="label">{detail.live?'VERIFIED PROVIDER':'KORUAL SCORE'}</span>
        <h2>{detail.name}</h2>
        <div className="modal-score"><strong>{detail.score}</strong><span>/ 100</span></div>
        <p>{detail.live?'실제 등록된 검증 업체 데이터입니다.':'가격 · 품질 · 응답속도 · 추가금 위험을 설명하기 위한 Beta 데모 점수입니다.'}</p>
        <button className="primary" onClick={()=>{setDetail(null);openRequest()}}>
          비교 목록에 담기 <ArrowRight size={17}/>
        </button>
      </div>
    </div>}

    {requestOpen && <div className="modal-backdrop" onClick={()=>setRequestOpen(false)}>
      <form className="modal card quote-modal" onSubmit={submitRequest} onClick={e=>e.stopPropagation()}>
        <button type="button" aria-label="견적 요청 닫기" className="close" onClick={()=>setRequestOpen(false)}><X size={18}/></button>
        <span className="label">QUOTE REQUEST</span>
        <h2>한 번에 견적 요청</h2>

        {saved ? <>
          <div className="modal-score success-score"><CheckCircle2 size={34}/><strong>접수 완료</strong></div>
          <p>견적 요청이 KORUAL 서버에 접수되었습니다. 제휴업체 매칭과 견적 수집 단계로 연결됩니다.</p>
          {saved.request_code&&<div className="request-code"><span>접수번호</span><strong>{saved.request_code}</strong></div>}
          <button type="button" className="primary" onClick={()=>setRequestOpen(false)}>확인</button>
        </> : <>
          <div className="quote-summary">
            <span>선택 서비스</span>
            <strong>{recommended.map(([name])=>name).join(' · ') || '선택 서비스 없음'}</strong>
          </div>

          <label><MapPin size={15}/> 지역
            <input required value={request.region} onChange={e=>setRequest({...request,region:e.target.value})} placeholder="예: 인천 청라"/>
          </label>
          <label><CalendarDays size={15}/> 희망일
            <input required type="date" value={request.date} onChange={e=>setRequest({...request,date:e.target.value})}/>
          </label>
          <label>이름
            <input required value={request.name} onChange={e=>setRequest({...request,name:e.target.value})} placeholder="성함"/>
          </label>
          <label>연락처
            <input required inputMode="tel" value={request.phone} onChange={e=>setRequest({...request,phone:e.target.value})} placeholder="연락 가능한 번호"/>
          </label>

          {requestError&&<p role="alert" className="request-error">{requestError}</p>}
          <button className="primary" type="submit" disabled={saving}>
            {saving?'접수 중…':'견적 요청 접수'} {!saving&&<ArrowRight size={17}/>}
          </button>
          <small className="privacy-note"><ShieldCheck size={13}/> 연락처는 견적 처리 용도로만 사용됩니다.</small>
        </>}
      </form>
    </div>}
  </div>;
}

export default App;
