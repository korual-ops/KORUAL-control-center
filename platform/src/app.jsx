import React, {useEffect, useMemo, useState} from 'react';
import { Home, LayoutDashboard, Plane, ShoppingBag, Sparkles, Moon, Sun, Search, Menu, X, ArrowRight, ShieldCheck, Zap, Globe2 } from 'lucide-react';

const modules=[
  {icon:Plane,title:'KORUAL Travel',text:'항공·숙박·일정을 하나의 흐름으로 관리합니다.'},
  {icon:ShoppingBag,title:'Commerce',text:'상품·주문·파트너 운영을 한 화면에서 연결합니다.'},
  {icon:Sparkles,title:'KORUAL AI',text:'업무와 여행 데이터를 기반으로 다음 행동을 제안합니다.'},
  {icon:LayoutDashboard,title:'Control Center',text:'운영 상태와 핵심 지표를 모바일에서도 빠르게 확인합니다.'}
];

export default function App(){
 const [dark,setDark]=useState(()=>localStorage.getItem('korual-theme')==='dark');
 const [menu,setMenu]=useState(false);
 useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';localStorage.setItem('korual-theme',dark?'dark':'light')},[dark]);
 const today=useMemo(()=>new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'short'}).format(new Date()),[]);
 return <div className="app">
  <header className="topbar"><a className="brand" href="#home" aria-label="KORUAL 홈"><span className="brandMark">K</span><span>KORUAL</span></a>
   <nav className="desktopNav"><a href="#platform">Platform</a><a href="#services">Services</a><a href="#about">About</a></nav>
   <div className="headerActions"><button className="iconBtn" onClick={()=>setDark(v=>!v)} aria-label="테마 변경">{dark?<Sun/>:<Moon/>}</button><button className="iconBtn menuBtn" onClick={()=>setMenu(v=>!v)} aria-label="메뉴">{menu?<X/>:<Menu/>}</button></div>
  </header>
  {menu&&<nav className="mobileMenu"><a onClick={()=>setMenu(false)} href="#platform">Platform</a><a onClick={()=>setMenu(false)} href="#services">Services</a><a onClick={()=>setMenu(false)} href="#about">About</a></nav>}
  <main id="home">
   <section className="hero"><div className="eyebrow"><span className="dot"/>KORUAL BETA · {today}</div><h1>하나의 플랫폼.<br/><span>더 빠른 실행.</span></h1><p className="lead">여행, 커머스, AI, 운영 도구를 하나의 디지털 자산으로 연결하는 KORUAL의 새로운 시작입니다.</p>
    <div className="heroActions"><a className="primary" href="#platform">플랫폼 보기 <ArrowRight/></a><a className="secondary" href="#services">기능 살펴보기</a></div>
    <div className="trust"><span><ShieldCheck/>안정적 구조</span><span><Zap/>모바일 우선</span><span><Globe2/>확장 가능한 플랫폼</span></div>
   </section>
   <section id="platform" className="panel"><div><p className="kicker">CONTROL CENTER</p><h2>운영을 한눈에.</h2><p>복잡한 기능을 단순한 카드와 명확한 탐색 구조로 정리했습니다.</p></div><div className="statusCard"><span className="live">LIVE</span><strong>Platform Online</strong><small>Responsive · Railway · GitHub</small></div></section>
   <section id="services" className="section"><div className="sectionHead"><p className="kicker">ECOSYSTEM</p><h2>KORUAL 핵심 모듈</h2></div><div className="grid">{modules.map(({icon:Icon,title,text})=><article className="card" key={title}><div className="cardIcon"><Icon/></div><h3>{title}</h3><p>{text}</p><a href="#about">Explore <ArrowRight/></a></article>)}</div></section>
   <section id="about" className="cta"><p className="kicker">KORUAL OS</p><h2>현금흐름에서 자산화까지,<br/>시스템으로 연결합니다.</h2><p>가볍게 시작하고 데이터와 자동화를 단계적으로 확장하는 구조입니다.</p></section>
  </main>
  <nav className="bottomNav" aria-label="모바일 탐색"><a href="#home"><Home/><span>홈</span></a><a href="#platform"><LayoutDashboard/><span>플랫폼</span></a><a href="#services"><Search/><span>서비스</span></a><a href="#about"><Sparkles/><span>AI</span></a></nav>
 </div>
}
