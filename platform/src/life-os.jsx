import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowRight, CheckCircle2, ChevronRight, Home, Search, ShieldCheck, Sparkles, Star, X } from 'lucide-react';
import './life-os.css';

const services = [
  ['입주청소','새 집 입주 전 필수 서비스','18–25만원'],
  ['이사','지역·거리·짐 기준 비교','35–80만원'],
  ['인터넷','통신사별 월요금·혜택 비교','월 2–4만원'],
  ['정수기','렌탈료·약정·혜택 비교','월 2–5만원'],
  ['인테리어','공사 범위별 견적 비교','상담 필요'],
  ['수리·시공','설비·에어컨·커튼 등','상담 필요'],
];

const quotes = [
  {name:'A 업체', score:94, price:'21만원', delta:'적정', extra:'낮음'},
  {name:'B 업체', score:88, price:'24만원', delta:'+9%', extra:'보통'},
  {name:'C 업체', score:72, price:'31만원', delta:'+41%', extra:'높음'},
];

function App(){
  const [query,setQuery]=useState('');
  const [result,setResult]=useState(null);
  const [selected,setSelected]=useState([]);
  const [detail,setDetail]=useState(null);
  const recommended=useMemo(()=>services.filter(([name])=>selected.includes(name)),[selected]);

  function analyze(){
    const q=query.trim() || '이사 준비';
    setResult({title:q, items:['입주청소','인터넷','이사'], note:'현재 입력 기준으로 우선 비교할 서비스를 선별했습니다.'});
    setSelected(['입주청소','인터넷','이사']);
  }
  function toggle(name){setSelected(v=>v.includes(name)?v.filter(x=>x!==name):[...v,name]);}

  return <div className="app">
    <header className="nav"><div className="logo"><span>✦</span>KORUAL</div><nav><a href="#how">작동 방식</a><a href="#compare">가격 비교</a><a href="#services">생활서비스</a></nav><button className="ghost">로그인</button></header>
    <main>
      <section className="hero">
        <div className="eyebrow"><Sparkles size={15}/> AI LIFE DECISION OS</div>
        <h1>뭘 해야 할지 모르겠다면,<br/><em>KORUAL</em>에 맡기세요.</h1>
        <p>생활 문제를 입력하면 필요한 서비스만 골라주고,<br/>시장가격·견적·업체를 한 번에 비교합니다.</p>
        <div className="search"><Search size={20}/><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&analyze()} placeholder="예: 청라 신축 아파트 입주 준비해줘"/><button onClick={analyze}>AI 분석 <ArrowRight size={17}/></button></div>
        <div className="trust"><span><ShieldCheck size={15}/> 필요한 것만 추천</span><span><CheckCircle2 size={15}/> 가격 투명성</span><span><Star size={15}/> KORUAL Score</span></div>
      </section>

      {result && <section className="analysis card"><div><span className="label">KORUAL AI 분석 완료</span><h2>“{result.title}”</h2><p>{result.note}</p></div><button className="close" onClick={()=>setResult(null)}><X size={17}/></button><div className="chips">{services.map(([name])=><button key={name} className={selected.includes(name)?'chip active':'chip'} onClick={()=>toggle(name)}>{name}{selected.includes(name)&&' ✓'}</button>)}</div></section>}

      <section id="compare" className="section"><div className="section-head"><div><span className="label">PRICE INTELLIGENCE</span><h2>가격을 먼저 판단합니다.</h2><p>싼 업체를 고르는 것이 아니라, <strong>적정가격인지</strong>부터 확인합니다.</p></div><span className="live"><i/> LIVE BETA</span></div>
        <div className="price-card card"><div className="price-main"><span>입주청소 · 30평 기준</span><strong>21만원</strong><small>시장가격 18–25만원 · KORUAL 적정가</small></div><div className="price-meter"><div><span>적정</span><b>21만원</b></div><div className="track"><i/></div><div className="range"><span>18만</span><span>25만</span></div></div><div className="quotes">{quotes.map(q=><article key={q.name}><div className="qtop"><strong>{q.name}</strong><span>★ {q.score}</span></div><b>{q.price}</b><small>{q.delta} · 추가금 위험 {q.extra}</small><button onClick={()=>setDetail(q)}>상세 보기 <ChevronRight size={15}/></button></article>)}</div></div>
      </section>

      <section id="services" className="section"><div className="section-head"><div><span className="label">LIFE SERVICES</span><h2>생활의 다음 단계까지 연결합니다.</h2></div></div><div className="service-grid">{services.map(([name,desc,price])=><button className={selected.includes(name)?'service selected':'service'} key={name} onClick={()=>toggle(name)}><span className="service-icon"><Home size={18}/></span><div><strong>{name}</strong><p>{desc}</p><small>{price}</small></div><ChevronRight size={17}/></button>)}</div></section>

      {recommended.length>0 && <section className="bundle card"><div><span className="label">MY LIFE PLAN</span><h2>선택한 서비스를 한 번에 비교</h2><p>{recommended.map(([n])=>n).join(' · ')}</p></div><button onClick={()=>setDetail({name:'KORUAL Bundle',price:'맞춤 견적',score:96})}>견적 요청 <ArrowRight size={17}/></button></section>}

      <section id="how" className="how section"><div className="section-head"><div><span className="label">HOW KORUAL WORKS</span><h2>검색 → 비교가 아니라<br/>문제 → 해결입니다.</h2></div></div><div className="steps">{[['01','상황 입력','한 문장으로 생활 문제를 설명합니다.'],['02','AI 판단','필요한 서비스와 불필요한 서비스를 구분합니다.'],['03','가격 비교','시장가격과 실제 견적의 차이를 계산합니다.'],['04','거래 연결','검증된 업체와 예약까지 연결합니다.']].map(([n,t,d])=><article key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}</div></section>
    </main>
    <footer><div className="logo">✦ KORUAL</div><span>생활을 KORUAL 하나로.</span><small>Decision first · Transaction second</small></footer>
    {detail && <div className="modal-backdrop" onClick={()=>setDetail(null)}><div className="modal card" onClick={e=>e.stopPropagation()}><button className="close" onClick={()=>setDetail(null)}><X size={18}/></button><span className="label">KORUAL SCORE</span><h2>{detail.name}</h2><div className="modal-score"><strong>{detail.score}</strong><span>/ 100</span></div><p>가격 · 품질 · 응답속도 · 추가금 위험 · 취소율을 종합해 산출한 데모 점수입니다.</p><button className="primary" onClick={()=>setDetail(null)}>비교 목록에 담기 <ArrowRight size={17}/></button></div></div>}
  </div>
}
createRoot(document.getElementById('root')).render(<App/>);
