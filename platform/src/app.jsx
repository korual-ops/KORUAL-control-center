import React, {useEffect, useMemo, useState} from 'react';
import { Home, LayoutDashboard, Plane, ShoppingBag, Sparkles, Moon, Sun, Search, Menu, X, ArrowRight, ShieldCheck, Zap, Globe2, CheckCircle2, GitBranch, Server, Smartphone } from 'lucide-react';

const modules=[
  {icon:Plane,eyebrow:'TRAVEL',title:'KORUAL Travel',text:'항공·숙박·일정을 하나의 흐름으로 관리합니다.',meta:'검색 → 비교 → 예약'},
  {icon:ShoppingBag,eyebrow:'COMMERCE',title:'Commerce',text:'상품·주문·파트너 운영을 한 화면에서 연결합니다.',meta:'상품 → 주문 → 정산'},
  {icon:Sparkles,eyebrow:'AI',title:'KORUAL AI',text:'업무와 여행 데이터를 기반으로 다음 행동을 제안합니다.',meta:'분석 → 추천 → 실행'},
  {icon:LayoutDashboard,eyebrow:'OPS',title:'Control Center',text:'운영 상태와 핵심 지표를 모바일에서도 빠르게 확인합니다.',meta:'상태 → 알림 → 조치'}
];

const navItems=[
  {id:'home',label:'홈',icon:Home},
  {id:'platform',label:'플랫폼',icon:LayoutDashboard},
  {id:'services',label:'서비스',icon:Search},
  {id:'about',label:'AI',icon:Sparkles}
];

export default function App(){
 const [dark,setDark]=useState(()=>localStorage.getItem('korual-theme')==='dark');
 const [menu,setMenu]=useState(false);
 const [active,setActive]=useState('home');

 useEffect(()=>{
   document.documentElement.dataset.theme=dark?'dark':'light';
   document.documentElement.style.colorScheme=dark?'dark':'light';
   localStorage.setItem('korual-theme',dark?'dark':'light');
   const themeMeta=document.querySelector('meta[name="theme-color"]');
   if(themeMeta) themeMeta.setAttribute('content',dark?'#090e17':'#f7f9fc');
 },[dark]);

 useEffect(()=>{
   document.body.classList.toggle('menu-open',menu);
   const close=(event)=>{ if(event.key==='Escape') setMenu(false); };
   window.addEventListener('keydown',close);
   return()=>{document.body.classList.remove('menu-open');window.removeEventListener('keydown',close)};
 },[menu]);

 useEffect(()=>{
   const sections=navItems.map(({id})=>document.getElementById(id)).filter(Boolean);
   const observer=new IntersectionObserver((entries)=>{
     const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
     if(visible) setActive(visible.target.id);
   },{rootMargin:'-22% 0px -62% 0px',threshold:[0,.15,.35,.6]});
   sections.forEach(section=>observer.observe(section));
   return()=>observer.disconnect();
 },[]);

 const today=useMemo(()=>new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'short'}).format(new Date()),[]);
 const navTo=(id)=>{setMenu(false);setActive(id);document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})};

 return <div className="app">
  <header className="topbar">
   <a className="brand" href="#home" onClick={()=>setActive('home')} aria-label="KORUAL 홈">
    <span className="brandMark">K</span><span className="brandWord">KORUAL</span><span className="betaBadge">BETA</span>
   </a>
   <nav className="desktopNav" aria-label="데스크톱 주요 메뉴">
    <a href="#platform">Platform</a><a href="#services">Services</a><a href="#about">About</a>
   </nav>
   <div className="headerActions">
    <button className="iconBtn" onClick={()=>setDark(v=>!v)} aria-label={dark?'라이트 모드':'다크 모드'} aria-pressed={dark}>{dark?<Sun/>:<Moon/>}</button>
    <button className="iconBtn menuBtn" onClick={()=>setMenu(v=>!v)} aria-label={menu?'메뉴 닫기':'메뉴 열기'} aria-expanded={menu}>{menu?<X/>:<Menu/>}</button>
   </div>
  </header>

  {menu&&<div className="mobileMenuBackdrop" onClick={()=>setMenu(false)}>
   <nav className="mobileMenu" aria-label="모바일 메뉴" onClick={event=>event.stopPropagation()}>
    <div className="mobileMenuHead"><div><span>KORUAL</span><strong>빠른 이동</strong></div><button onClick={()=>setMenu(false)} aria-label="메뉴 닫기"><X/></button></div>
    {navItems.map(({id,label,icon:Icon})=><a key={id} className={active===id?'active':''} onClick={(event)=>{event.preventDefault();navTo(id)}} href={'#'+id}><span className="menuIcon"><Icon/></span><span>{label}</span><ArrowRight/></a>)}
   </nav>
  </div>}

  <main>
   <section id="home" className="hero">
    <div className="heroCopy">
     <div className="eyebrow"><span className="dot"/>KORUAL BETA · {today}</div>
     <h1>하나의 플랫폼.<br/><span>더 빠른 실행.</span></h1>
     <p className="lead">여행, 커머스, AI, 운영 도구를 하나의 디지털 자산으로 연결하는 KORUAL의 새로운 시작입니다.</p>
     <div className="heroActions"><a className="primary" href="#platform">플랫폼 보기 <ArrowRight/></a><a className="secondary" href="#services">기능 살펴보기</a></div>
     <div className="trust" aria-label="플랫폼 특징"><span><ShieldCheck/>안정적 구조</span><span><Zap/>모바일 우선</span><span><Globe2/>확장 가능한 플랫폼</span></div>
    </div>
    <div className="heroVisual" aria-label="KORUAL 모바일 운영 화면 미리보기">
     <div className="phoneMock">
      <div className="phoneTop"><span>9:41</span><span className="phoneIsland"/></div>
      <div className="phoneBrand"><span className="miniMark">K</span><div><strong>KORUAL</strong><small>Control Center</small></div><span className="onlineDot"/></div>
      <div className="phoneHero"><span>오늘의 운영</span><strong>모든 시스템 정상</strong><small>핵심 상태를 한눈에 확인하세요.</small></div>
      <div className="miniGrid"><article><Server/><span>Railway</span><strong>Online</strong></article><article><GitBranch/><span>GitHub</span><strong>Synced</strong></article></div>
      <div className="phoneAction"><Sparkles/><div><span>KORUAL AI</span><strong>다음 실행 추천</strong></div><ArrowRight/></div>
      <div className="phoneTabs"><Home/><LayoutDashboard/><Search/><Sparkles/></div>
     </div>
    </div>
   </section>

   <section id="platform" className="panel">
    <div className="panelCopy"><p className="kicker">CONTROL CENTER</p><h2>운영을 한눈에.</h2><p>복잡한 기능을 단순한 카드와 명확한 탐색 구조로 정리했습니다.</p></div>
    <div className="statusCard">
     <div className="statusTop"><span className="live"><span/>LIVE</span><Smartphone/></div>
     <strong>Platform Online</strong><small>Responsive · Railway · GitHub</small>
     <div className="statusRows"><span><CheckCircle2/>Railway 배포 정상</span><span><CheckCircle2/>GitHub 소스 연결</span><span><CheckCircle2/>모바일 UX 최적화</span></div>
    </div>
   </section>

   <section id="services" className="section">
    <div className="sectionHead"><p className="kicker">ECOSYSTEM</p><h2>KORUAL 핵심 모듈</h2><p>하나의 계정과 데이터 흐름 위에서 서비스가 연결됩니다.</p></div>
    <div className="grid">{modules.map(({icon:Icon,eyebrow,title,text,meta})=><article className="card" key={title}><div className="cardTop"><div className="cardIcon"><Icon/></div><span>{eyebrow}</span></div><h3>{title}</h3><p>{text}</p><div className="cardMeta">{meta}</div><a href="#about">Explore <ArrowRight/></a></article>)}</div>
   </section>

   <section id="about" className="cta"><div className="ctaGlow"/><p className="kicker">KORUAL OS</p><h2>현금흐름에서 자산화까지,<br/>시스템으로 연결합니다.</h2><p>가볍게 시작하고 데이터와 자동화를 단계적으로 확장하는 구조입니다.</p><a className="ctaButton" href="#home">KORUAL 시작하기 <ArrowRight/></a></section>
  </main>

  <nav className="bottomNav" aria-label="모바일 탐색">{navItems.map(({id,label,icon:Icon})=><a key={id} className={active===id?'active':''} aria-current={active===id?'page':undefined} href={'#'+id} onClick={()=>setActive(id)}><Icon/><span>{label}</span></a>)}</nav>
 </div>
}
