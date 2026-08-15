import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, Boxes, CircleAlert, CloudCog, FileChartColumn, PackageCheck, RefreshCw, ShieldCheck, Truck } from 'lucide-react';
import { getPlatformHealth, runKorualAction } from './lib/korualApi.js';
import './styles.css';

const actions = [
  { id: 'syncProducts', title: '상품 동기화', description: '상품 마스터와 판매 상태를 갱신', icon: Boxes },
  { id: 'syncOrders', title: '주문 동기화', description: '신규 주문과 결제 상태를 수집', icon: PackageCheck },
  { id: 'syncShipping', title: '배송 점검', description: '송장·배송지연 주문을 확인', icon: Truck },
  { id: 'dailyReport', title: '일일 리포트', description: '매출·마진·위험 알림을 집계', icon: FileChartColumn },
];
const sheetsUrl = 'https://docs.google.com/spreadsheets/d/1-XYUbU6Os5q7P_9qFnTFmkva3o0KhrgPHd-AyA6-bts/edit';

function App() {
  const [health, setHealth] = useState({ state: 'loading' });
  const [running, setRunning] = useState(null);
  const [events, setEvents] = useState([]);

  async function refreshHealth() {
    setHealth({ state: 'loading' });
    try { setHealth({ state: 'ready', ...await getPlatformHealth() }); }
    catch (error) { setHealth({ state: 'error', message: error.message }); }
  }
  useEffect(() => { refreshHealth(); }, []);

  async function execute(action) {
    setRunning(action.id);
    try {
      const result = await runKorualAction(action.id);
      setEvents((items) => [{ id: crypto.randomUUID(), title: action.title, ok: result.ok !== false, at: new Date() }, ...items].slice(0, 6));
    } catch (error) {
      setEvents((items) => [{ id: crypto.randomUUID(), title: action.title, ok: false, detail: error.message, at: new Date() }, ...items].slice(0, 6));
    } finally { setRunning(null); refreshHealth(); }
  }

  const status = useMemo(() => {
    if (health.state === 'loading') return { label: '연결 확인 중', tone: 'pending' };
    if (health.state === 'ready' && health.ok) return { label: '자동화 연결됨', tone: 'good' };
    return { label: '환경변수 설정 필요', tone: 'bad' };
  }, [health]);

  return <div className="app">
    <header className="topbar"><div className="brand"><span>K</span>KORUAL</div><nav><a href="#control">자동화</a><a href="#activity">활동</a><a href={sheetsUrl} target="_blank" rel="noreferrer">운영 시트</a></nav></header>
    <main>
      <section className="ops-hero">
        <div><p className="overline">KORUAL OPERATIONS</p><h1>핵심 자동화<br />컨트롤 센터</h1><p className="lead">상품, 주문, 배송, 일일 리포트만 한곳에서 실행합니다. 비밀키는 Vercel 서버에만 저장됩니다.</p></div>
        <div className="glass connection-panel">
          <div className={`status ${status.tone}`}><Activity size={18} />{status.label}</div>
          <dl><div><dt>Google Sheets</dt><dd>{health.spreadsheetId ? '연결됨' : '확인 필요'}</dd></div><div><dt>Apps Script</dt><dd>{health.upstream === 'configured' ? '연결됨' : '미설정'}</dd></div><div><dt>보안 경계</dt><dd>Server only</dd></div></dl>
          <button className="ghost button" onClick={refreshHealth}><RefreshCw size={16} /> 상태 새로고침</button>
        </div>
      </section>
      <section id="control" className="section">
        <div className="section-head"><div><h2>자동화 실행</h2><p>외부 주문·환불은 자동 승인하지 않고 운영자가 결과를 확인합니다.</p></div><ShieldCheck color="#f4ca79" /></div>
        <div className="action-grid">{actions.map((action) => { const Icon = action.icon; const active = running === action.id; return <article className="action-row" key={action.id}><div className="action-icon"><Icon /></div><div><h3>{action.title}</h3><p>{action.description}</p></div><button disabled={Boolean(running)} onClick={() => execute(action)}>{active ? '실행 중…' : '실행'}</button></article>; })}</div>
      </section>
      <section id="activity" className="section activity-layout">
        <div className="glass activity-panel"><div className="section-head small"><h2>최근 활동</h2><p>이번 브라우저에서 실행한 자동화 결과</p></div>{events.length === 0 ? <div className="empty"><CloudCog /><p>아직 실행 기록이 없습니다.</p></div> : <ul className="event-list">{events.map((event) => <li key={event.id}><span className={event.ok ? 'dot good' : 'dot bad'} /><div><strong>{event.title}</strong><small>{event.detail || (event.ok ? '완료' : '실패')} · {event.at.toLocaleTimeString('ko-KR')}</small></div></li>)}</ul>}</div>
        <aside className="glass guardrail"><CircleAlert /><h2>운영 원칙</h2><p>상품·주문·배송 데이터는 자동 동기화하고, 발주·환불·결제·고객 메시지는 승인 후 실행합니다.</p><a className="primary" href={sheetsUrl} target="_blank" rel="noreferrer">KORUAL Operations 열기</a></aside>
      </section>
    </main>
  </div>;
}
createRoot(document.getElementById('root')).render(<App />);
