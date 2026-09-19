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

const BUILD_ID='2026.09.19-R3';

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
    localStorage.setItem('korual-theme',theme);

    const themeMeta=document.querySelector('meta[name="theme-color"]');
    if(themeMeta){
      themeMeta.setAttribute('content',theme==='dark' ? '#08090b' : '#f7f8fa');
    }
  },[theme]);

  useEffect(()=>{
    const media=window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemTheme=event=>{
      if(!localStorage.getItem('korual-theme')){
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
        <a href="#overview">Overview</a>
        <a href="#compare">가격 비교</a>
        <a href="#services">생활서비스</a>
        <a href="#how">작동 방식</a>
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
      <span><ShieldCheck size={14}/> BETA NETWORK MODE</span>
      <strong>공유·동적 IP 대응</strong>
      <small>HTTPS · 서버 Rate Limit · 분리형 Edge API 구조로 운영</small>
      <div className="beta-stack">
        <b>Railway UI</b><i/>
        <b>Supabase Edge</b><i/>
        <b>Postgres</b>
      </div>
    </div>

    <main>
      <section id="overview" className="hero">
        <div className="hero-glow" aria-hidden="true"/>
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><Sparkles size={15}/> KORUAL · AI LIFE DECISION OS</div>
            <h1>검색보다 먼저,<br/><em>결정부터.</em></h1>
            <p>생활 문제를 한 문장으로 입력하면 필요한 서비스, 적정가격, 비교할 업체와 다음 행동을 KORUAL이 한 화면에서 정리합니다.</p>

            <div className="search">
              <Search size={20}/>
              <input
                aria-label="생활 문제 검색"
                value={query}
                onChange={e=>setQuery(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&analyze()}
                placeholder="예: 청라 신축 아파트 입주 준비해줘"
              />
              <button onClick={()=>analyze()}>AI 분석 <ArrowRight size={17}/></button>
            </div>

            <div className="quick-prompts" aria-label="빠른 시나리오">
              {quickPrompts.map(prompt=>
                <button key={prompt} onClick={()=>analyze(prompt)}>
                  <WandSparkles size={13}/>{prompt}
                </button>
              )}
            </div>

            <div className="trust">
              <span><ShieldCheck size={15}/> 불필요한 서비스 제외</span>
              <span><CheckCircle2 size={15}/> 적정가격 우선 판단</span>
              <span><Star size={15}/> KORUAL Score</span>
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
                <span className="preview-kicker">DECISION CONSOLE</span>
                <strong>KORUAL AI 판단</strong>
              </div>
              <span className="preview-live"><i/> {marketError?'DEGRADED':'LIVE'}</span>
            </div>

            <div className="preview-situation">
              <span>현재 상황</span>
              <strong>{query || '청라 신축 아파트 입주 준비'}</strong>
              <small>상황을 서비스 목록이 아니라 실행 계획으로 변환합니다.</small>
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
              이 조건으로 분석 <ArrowRight size={16}/>
            </button>
          </aside>
        </div>
      </section>

      <section className="command-strip" aria-label="KORUAL 핵심 상태">
        <article>
          <span><Sparkles size={16}/>Decision AI</span>
          <strong>문제 → 해결</strong>
          <small>검색보다 먼저 판단</small>
        </article>
        <article>
          <span><ShieldCheck size={16}/>Price Guard</span>
          <strong>{hasLiveBenchmark?'Live Price':'Beta Price'}</strong>
          <small>{hasLiveBenchmark?'실제 가격 벤치마크 연결':'데모 가격 · DB 연결 준비'}</small>
        </article>
        <article>
          <span><Layers3 size={16}/>Provider Network</span>
          <strong>{marketLoading?'동기화 중':(marketSummary.network?.verified_providers || 0) + '개 검증'}</strong>
          <small>{marketError?'Edge API 재연결 대기':(marketSummary.network?.price_benchmarks || 0) + '개 가격 데이터'}</small>
        </article>
        <article>
          <span><Activity size={16}/>Beta Runtime</span>
          <strong>{online?'Railway Ready':'Offline'}</strong>
          <small>공유 IP 대응 · Edge API 분리</small>
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
            <span className="label">PRICE INTELLIGENCE</span>
            <h2>가격을 먼저 판단합니다.</h2>
            <p>싼 업체를 고르는 것이 아니라, <strong>적정가격인지</strong>부터 확인합니다.</p>
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
            <span className="label">LIFE SERVICES</span>
            <h2>생활의 다음 단계까지 연결합니다.</h2>
            <p>필요한 서비스만 선택하면 하나의 요청으로 묶어 비교합니다.</p>
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
            <span className="label">HOW KORUAL WORKS</span>
            <h2>검색 → 비교가 아니라<br/>문제 → 해결입니다.</h2>
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
