import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, Boxes, CalendarClock, Check, ChevronRight, CircleAlert, Cloud, Code2, ExternalLink, FileChartColumn, Home, Link2, PackageCheck, RefreshCw, Settings, Sheet, ShieldCheck, Sparkles, Truck, Workflow } from 'lucide-react';
import { getPlatformHealth, runKorualAction } from './lib/korualApi.js';
import { automationPipelines } from './lib/automationEngine.js';
import './styles.css';

const sheetsUrl = 'https://docs.google.com/spreadsheets/d/1-XYUbU6Os5q7P_9qFnTFmkva3o0KhrgPHd-AyA6-bts/edit';
const links = { sheets: sheetsUrl, drive: 'https://drive.google.com/drive/u/1/home', github: 'https://github.com/korual-ops/KORUAL-control-center', vercel: 'https://vercel.com/korual-ops-projects/korual-control-center-1xoe', script: 'https://script.google.com/u/1/home/projects/1bsmTlQME7petvQ5dydYU9n-c53qWpMjadwQ8-waOi0T4J8W3QEDpP1GN/edit' };
const actions = [
  { id: 'syncProducts', title: '상품 동기화', description: '상품 마스터와 판매 상태를 갱신합니다.', cadence: '필요 시', icon: Boxes },
  { id: 'syncOrders', title: '주문 동기화', description: '신규 주문과 결제 상태를 수집합니다.', cadence: '필요 시', icon: PackageCheck },
  { id: 'syncShipping', title: '배송 점검', description: '송장과 배송 지연 주문을 확인합니다.', cadence: '필요 시', icon: Truck },
  { id: 'dailyReport', title: '일일 리포트', description: '운영 현황과 위험 알림을 집계합니다.', cadence: '매일', icon: FileChartColumn },
];
const integrations = [
  { name: 'Google Drive', group: '데이터', state: 'connected', icon: Cloud, url: links.drive },
  { name: 'Google Sheets', group: '운영 DB', state: 'connected', icon: Sheet, url: links.sheets },
  { name: 'GitHub', group: '소스', state: 'connected', icon: Workflow, url: links.github },
  { name: 'Vercel', group: '배포', state: 'connected', icon: Sparkles, url: links.vercel },
  { name: 'Apps Script', group: '자동화', state: 'connected', icon: Code2, url: links.script },
  { name: 'Cafe24', group: '커머스', state: 'planned', icon: Boxes },
  { name: 'Kakao 알림', group: '메시지', state: 'planned', icon: Activity },
  { name: '여행 API', group: '파트너', state: 'planned', icon: Link2 },
  ...automationPipelines.map((pipeline) => ({ name: pipeline.name, group: '기존 엔진 도입', state: 'planned', icon: Workflow })),
  { name: 'KORUAL Space', group: '기존 소스 도입', state: 'planned', icon: Home },
];
const navItems = [
  { id: 'overview', label: 'KORUAL 운영', icon: Home }, { id: 'automation', label: '자동화', icon: Workflow },
  { id: 'integrations', label: '연동', icon: Link2 }, { id: 'activity', label: '활동', icon: Activity }, { id: 'settings', label: '설정', icon: Settings },
];
function StatusDot({ tone = 'good' }) { return <span className={`status-dot ${tone}`} aria-hidden="true" />; }

function App() {
  const [health, setHealth] = useState({ state: 'loading' });
  const [running, setRunning] = useState(null);
  const [events, setEvents] = useState([]);
  const [activeNav, setActiveNav] = useState('overview');
  async function refreshHealth() { setHealth({ state: 'loading' }); try { setHealth({ state: 'ready', ...await getPlatformHealth() }); } catch (error) { setHealth({ state: 'error', message: error.message }); } }
  useEffect(() => { refreshHealth(); }, []);
  async function execute(action) {
    setRunning(action.id);
    try { const result = await runKorualAction(action.id); setEvents((items) => [{ id: crypto.randomUUID(), title: action.title, ok: result.ok !== false, detail: '자동화가 정상 완료됐습니다.', at: new Date() }, ...items].slice(0, 8)); }
    catch (error) { setEvents((items) => [{ id: crypto.randomUUID(), title: action.title, ok: false, detail: error.message, at: new Date() }, ...items].slice(0, 8)); }
    finally { setRunning(null); refreshHealth(); }
  }
  const system = useMemo(() => health.state === 'loading' ? { label: '확인 중', tone: 'pending' } : health.state === 'ready' && health.ok ? { label: '시스템 정상', tone: 'good' } : { label: '연결 점검 필요', tone: 'bad' }, [health]);
  function navigate(id) { setActiveNav(id); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  return <div className="shell">
    <aside className="sidebar" aria-label="주요 메뉴"><div className="brand"><span className="brand-mark">K</span><span>KORUAL</span></div><nav className="side-nav">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={activeNav === id ? 'active' : ''} onClick={() => navigate(id)}><Icon size={19} /><span>{label}</span></button>)}</nav><div className="sidebar-bottom"><a className="sheet-link" href={sheetsUrl} target="_blank" rel="noreferrer"><Sheet size={18} />운영 시트 열기<ExternalLink size={14} /></a><div className="sidebar-status"><span><StatusDot tone={system.tone} />{system.label}</span><small>보안 연결 활성화</small></div></div></aside>
    <main className="workspace">
      <header id="overview" className="page-header"><div><h1>KORUAL 운영</h1><p>핵심 자동화와 연결 상태를 한눈에 확인하세요.</p></div><div className="header-actions"><div className="global-status"><StatusDot tone={system.tone} />{system.label}</div><button className="outline-button" onClick={refreshHealth} disabled={health.state === 'loading'}><RefreshCw size={17} className={health.state === 'loading' ? 'spin' : ''} /><span>상태 새로고침</span></button></div></header>
      <div className="primary-grid"><section id="automation" className="panel automation-panel"><div className="panel-heading"><div><h2>운영 자동화 개요</h2><p>중요 작업만 직접 실행하고 결과를 확인합니다.</p></div><ShieldCheck size={20} /></div><div className="automation-list">{actions.map((action) => { const Icon = action.icon; const active = running === action.id; return <article className="automation-row" key={action.id}><div className="square-icon"><Icon size={22} /></div><div className="automation-copy"><h3>{action.title}</h3><p>{action.description}</p></div><div className="cadence"><CalendarClock size={15} />{action.cadence}</div><div className="row-state"><StatusDot tone={active ? 'pending' : 'good'} />{active ? '실행 중' : '대기'}</div><button className="run-button" disabled={Boolean(running)} onClick={() => execute(action)}>{active && <RefreshCw size={16} className="spin" />}<span>{active ? '실행 중' : '지금 실행'}</span>{!active && <ChevronRight size={16} />}</button></article>; })}</div></section>
        <aside className="right-rail"><section className="panel health-panel"><div className="panel-heading compact"><h2>시스템 상태</h2></div><dl><div><dt>자동화 API</dt><dd><StatusDot tone={health.upstream === 'configured' ? 'good' : 'bad'} />{health.upstream === 'configured' ? '정상' : '확인'}</dd></div><div><dt>운영 데이터</dt><dd><StatusDot tone={health.spreadsheetId ? 'good' : 'pending'} />{health.spreadsheetId ? '정상' : '확인'}</dd></div><div><dt>GitHub 배포</dt><dd><StatusDot />정상</dd></div><div><dt>보안 경계</dt><dd><StatusDot />Server only</dd></div></dl></section><section className="panel sheet-panel"><div><h2>운영 시트</h2><p>Google Sheets 데이터베이스에서 세부 내용을 관리합니다.</p></div><a href={sheetsUrl} target="_blank" rel="noreferrer"><Sheet size={17} />운영 시트 열기<ExternalLink size={14} /></a></section></aside></div>
      <div className="secondary-grid"><section id="integrations" className="panel integrations-panel"><div className="panel-heading"><div><h2>연동 허브</h2><p>권한과 역할이 명확한 핵심 연결만 관리합니다.</p></div><span className="count-label">{integrations.filter((item) => item.state === 'connected').length} 연결</span></div><div className="integration-grid">{integrations.map(({ name, group, state, icon: Icon, url }) => { const body = <><div className="integration-icon"><Icon size={21} /></div><div><strong>{name}</strong><small>{group}</small></div><span className={`connection ${state}`}><StatusDot tone={state === 'connected' ? 'good' : 'pending'} />{state === 'connected' ? '연결됨' : '준비'}</span>{url && <ExternalLink className="external" size={14} />}</>; return url ? <a key={name} className="integration-item" href={url} target="_blank" rel="noreferrer">{body}</a> : <div key={name} className="integration-item planned" aria-label={`${name} 연동 준비 중`}>{body}</div>; })}</div></section>
        <section id="activity" className="panel activity-panel"><div className="panel-heading"><div><h2>최근 활동</h2><p>자동화 실행 결과가 현재 브라우저에 표시됩니다.</p></div><Activity size={20} /></div>{events.length === 0 ? <div className="empty-state"><div className="empty-icon"><Workflow size={24} /></div><strong>실행 기록이 없습니다</strong><p>자동화를 실행하면 결과와 시간이 여기에 기록됩니다.</p></div> : <ul className="event-list">{events.map((event) => <li key={event.id}><span className={`event-icon ${event.ok ? 'success' : 'failure'}`}>{event.ok ? <Check size={16} /> : <CircleAlert size={16} />}</span><div><strong>{event.title}</strong><p>{event.detail}</p></div><time>{event.at.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</time></li>)}</ul>}</section></div>
      <section id="settings" className="guardrail"><ShieldCheck size={20} /><div><strong>승인 기반 운영</strong><p>데이터 조회와 동기화는 자동화하고, 발주·결제·환불·고객 메시지는 운영자 승인 후 실행합니다.</p></div></section>
    </main>
    <nav className="mobile-nav" aria-label="모바일 주요 메뉴">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={activeNav === id ? 'active' : ''} onClick={() => navigate(id)}><Icon size={19} /><span>{label.replace('KORUAL ', '')}</span></button>)}</nav>
  </div>;
}
createRoot(document.getElementById('root')).render(<App />);
