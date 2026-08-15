import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, BellRing, Boxes, Calculator, CalendarClock, Check, ChevronRight, CircleAlert, Cloud, Code2, ExternalLink, FileChartColumn, Home, Link2, PackageCheck, Pencil, Plus, RefreshCw, Search, Settings, Sheet, ShieldCheck, Sparkles, Trash2, TrendingUp, Truck, Workflow, X } from 'lucide-react';
import { getPlatformHealth, runKorualAction } from './lib/korualApi.js';
import './styles.css';
import './crud.css';
import './language.css';
import './decision.css';
import './roadmap.css';
import './premium.css';

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
];
const navItems = [
  { id: 'overview', label: 'KORUAL 운영', icon: Home }, { id: 'automation', label: '자동화', icon: Workflow },
  { id: 'data', label: '데이터', icon: Boxes }, { id: 'integrations', label: '연동', icon: Link2 }, { id: 'settings', label: '설정', icon: Settings },
];
const entities = {
  products: { label: '상품', id: 'SKU', fields: ['SKU','상품명','카테고리','공급처','원가','판매가','수수료율','상태'], columns: ['SKU','상품명','판매가','상태'] },
  orders: { label: '주문', id: '주문ID', fields: ['주문ID','주문일','채널','SKU','상품명','수량','결제금액','배송상태','송장번호','고객연락처','메모'], columns: ['주문ID','상품명','결제금액','배송상태'] },
  suppliers: { label: '공급처', id: '공급처ID', fields: ['공급처ID','공급처명','플랫폼','담당자','연락처','결제조건','평점','상태'], columns: ['공급처ID','공급처명','플랫폼','상태'] },
};
const i18n = {
  ko:{title:'KORUAL 운영',subtitle:'핵심 자동화와 연결 상태를 한눈에 확인하세요.',refresh:'상태 새로고침',data:'운영 데이터 관리',dataHelp:'Google Sheets와 연결된 상품·주문·공급처를 관리합니다.',add:'추가',search:'검색',manage:'관리',loading:'불러오는 중…',empty:'등록된 데이터가 없습니다.'},
  en:{title:'KORUAL Operations',subtitle:'Monitor core automations and connections at a glance.',refresh:'Refresh status',data:'Operations Data',dataHelp:'Manage products, orders and suppliers connected to Google Sheets.',add:'Add',search:'Search',manage:'Manage',loading:'Loading…',empty:'No records found.'},
  zh:{title:'KORUAL 运营',subtitle:'集中查看核心自动化与连接状态。',refresh:'刷新状态',data:'运营数据管理',dataHelp:'管理与 Google Sheets 连接的商品、订单和供应商。',add:'添加',search:'搜索',manage:'管理',loading:'加载中…',empty:'暂无数据。'},
  ja:{title:'KORUAL 運営',subtitle:'主要な自動化と接続状態を一目で確認できます。',refresh:'状態を更新',data:'運営データ管理',dataHelp:'Google Sheets連携の商品・注文・仕入先を管理します。',add:'追加',search:'検索',manage:'管理',loading:'読み込み中…',empty:'データがありません。'},
  vi:{title:'Vận hành KORUAL',subtitle:'Theo dõi tự động hóa cốt lõi và trạng thái kết nối.',refresh:'Làm mới trạng thái',data:'Quản lý dữ liệu vận hành',dataHelp:'Quản lý sản phẩm, đơn hàng và nhà cung cấp kết nối với Google Sheets.',add:'Thêm',search:'Tìm kiếm',manage:'Quản lý',loading:'Đang tải…',empty:'Chưa có dữ liệu.'},
};
function StatusDot({ tone = 'good' }) { return <span className={`status-dot ${tone}`} aria-hidden="true" />; }

function DecisionCenter() {
  const [summary, setSummary] = useState({ products: 0, orders: 0, suppliers: 0 });
  const [calc, setCalc] = useState({ cost: 17000, price: 35000, fee: 6, shipping: 3000, ads: 2000 });
  useEffect(() => { runKorualAction('summary').then(setSummary).catch(() => {}); }, []);
  const profit = calc.price - calc.cost - calc.shipping - calc.ads - calc.price * calc.fee / 100;
  const margin = calc.price > 0 ? profit / calc.price * 100 : 0; const risk = margin < 20 ? '위험' : margin < 35 ? '점검' : '양호';
  return <section className="decision-center"><div className="decision-kpis"><article><span><Boxes size={17}/>상품</span><strong>{summary.products || 0}</strong><small>운영 SKU</small></article><article><span><PackageCheck size={17}/>주문</span><strong>{summary.orders || 0}</strong><small>누적 주문</small></article><article><span><BellRing size={17}/>승인 대기</span><strong>0</strong><small>발주·결제·메시지</small></article><article><span><TrendingUp size={17}/>자동화율</span><strong>62%</strong><small>목표 85%</small></article></div><div className="margin-lab panel"><div className="panel-heading"><div><h2>마진 의사결정 센터</h2><p>원가·수수료·물류·광고비를 포함해 판매 전 수익성을 검증합니다.</p></div><Calculator size={20}/></div><div className="margin-body"><div className="margin-fields">{[['cost','원가'],['price','판매가'],['fee','수수료율 %'],['shipping','배송비'],['ads','광고비']].map(([key,label])=><label key={key}><span>{label}</span><input type="number" min="0" value={calc[key]} onChange={(e)=>setCalc({...calc,[key]:Number(e.target.value)})}/></label>)}</div><div className={`margin-result ${risk === '위험' ? 'risk' : risk === '점검' ? 'warn' : ''}`}><span>예상 순이익</span><strong>₩{Math.round(profit).toLocaleString()}</strong><small>순마진 {margin.toFixed(1)}% · {risk}</small><p>{margin < 20 ? '등록 보류: 가격 또는 비용 구조를 먼저 개선하세요.' : '상품 등록 검토가 가능한 수익 구조입니다.'}</p></div></div></div></section>;
}

const roadmap = [
  { phase:'NOW', title:'AI Commerce Decision OS', state:'운영', detail:'상품 입력 · 35% 마진 검증 · AI 상세페이지 · 판매 승인' },
  { phase:'BUILD', title:'Order · 1688 · KORUAL Track', state:'구축', detail:'주문 수집 · MOQ 확인 · 발주 승인 · CJ 배송 · 지연 카카오 알림' },
  { phase:'NEXT', title:'Membership · Points · BLACK', state:'다음', detail:'BRZ/SLV/GLD/BLK 등급 · 쿠폰 · 추천 · 디지털 카드' },
  { phase:'NEXT', title:'Travel Meta Search', state:'다음', detail:'AI 일정 · 항공 · 호텔 · 지도 · 번역 · 파트너 예약 연결' },
  { phase:'LATER', title:'KORUAL Space', state:'후속', detail:'촬영 공간 중개 · 호스트 승인 · 보증금 · 리뷰 · 15% 수수료' },
  { phase:'HOLD', title:'KORUAL Pay', state:'보류', detail:'PG·정산·포인트부터 검증 후 규제 검토를 거쳐 확장' },
];
function Roadmap() { return <section className="panel roadmap-panel"><div className="panel-heading"><div><h2>KORUAL 실행 로드맵</h2><p>현금흐름 → 시스템화 → 자동화 → 자산화 순으로 실행합니다.</p></div><span className="count-label">6 단계</span></div><div className="roadmap-list">{roadmap.map(item=><article key={item.title}><span className={`phase ${item.phase.toLowerCase()}`}>{item.phase}</span><div><strong>{item.title}</strong><p>{item.detail}</p></div><small>{item.state}</small></article>)}</div><div className="scope-guard"><ShieldCheck size={17}/><p><strong>초기 제외:</strong> 자체 코인·송금·투자상품·직접 OTA·직접 공간 운영. 중개·구독·수수료 중심으로 성장합니다.</p></div></section>; }

function DataManager({ addEvent, t }) {
  const [entity, setEntity] = useState('products'); const [records, setRecords] = useState([]); const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(''); const [editing, setEditing] = useState(null); const [form, setForm] = useState({}); const [saving, setSaving] = useState(false);
  const meta = entities[entity];
  async function load(next = entity) { setLoading(true); try { const result = await runKorualAction('listRecords', { entity: next }); setRecords(result.records || result.data || []); } catch (error) { addEvent('데이터 조회', false, error.message); setRecords([]); } finally { setLoading(false); } }
  useEffect(() => { load(entity); }, [entity]);
  const filtered = records.filter((record) => JSON.stringify(record).toLowerCase().includes(query.toLowerCase()));
  function open(record = null) { setEditing(record); setForm(record ? { ...record } : { [meta.id]: `${entity.slice(0,3).toUpperCase()}-${Date.now()}` }); }
  async function save(event) { event.preventDefault(); setSaving(true); const action = editing ? 'updateRecord' : 'createRecord'; try { await runKorualAction(action, { entity, id: editing?.[meta.id], record: form }); const verb = editing ? '수정' : '추가'; setEditing(null); setForm({}); await load(); addEvent(`${meta.label} ${verb}`, true, '운영 시트와 동기화했습니다.'); } catch (error) { addEvent(`${meta.label} 저장`, false, error.message); } finally { setSaving(false); } }
  async function remove(record) { if (!window.confirm(`${record[meta.id]} 항목을 삭제 처리할까요?`)) return; try { await runKorualAction('deleteRecord', { entity, id: record[meta.id] }); await load(); addEvent(`${meta.label} 삭제`, true, '감사 로그를 남기고 삭제 처리했습니다.'); } catch (error) { addEvent(`${meta.label} 삭제`, false, error.message); } }
  return <section id="data" className="panel data-panel"><div className="panel-heading data-heading"><div><h2>{t.data}</h2><p>{t.dataHelp}</p></div><button className="gold-button" onClick={() => open()}><Plus size={16} />{meta.label} {t.add}</button></div>
    <div className="data-toolbar"><div className="entity-tabs">{Object.entries(entities).map(([key, value]) => <button key={key} className={entity === key ? 'active' : ''} onClick={() => { setEntity(key); setQuery(''); }}>{value.label}</button>)}</div><label className="search-box"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} /></label></div>
    <div className="table-wrap"><table><thead><tr>{meta.columns.map((column) => <th key={column}>{column}</th>)}<th>{t.manage}</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="table-empty">{t.loading}</td></tr> : filtered.length ? filtered.map((record) => <tr key={record[meta.id]}>{meta.columns.map((column) => <td key={column} data-label={column}>{record[column] ?? '-'}</td>)}<td className="row-actions"><button aria-label="수정" onClick={() => open(record)}><Pencil size={15} /></button><button className="danger" aria-label="삭제" onClick={() => remove(record)}><Trash2 size={15} /></button></td></tr>) : <tr><td colSpan={5} className="table-empty">{t.empty}</td></tr>}</tbody></table></div>
    {form[meta.id] && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setForm({})}><form className="record-modal" onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="record-modal-title"><div className="modal-title"><div><strong id="record-modal-title">{meta.label} {editing ? '수정' : '추가'}</strong><small>저장 시 운영 시트와 감사 로그에 반영됩니다.</small></div><button type="button" aria-label="닫기" onClick={() => setForm({})}><X size={19} /></button></div><div className="form-grid">{meta.fields.map((field) => <label key={field}><span>{field}</span><input required={field === meta.id} disabled={Boolean(editing) && field === meta.id} value={form[field] ?? ''} onChange={(e) => setForm({ ...form, [field]: e.target.value })} /></label>)}</div><div className="modal-actions"><button type="button" onClick={() => setForm({})}>취소</button><button className="gold-button" disabled={saving}>{saving ? '저장 중…' : '저장'}</button></div></form></div>}
  </section>;
}

function App() {
  const detectedLanguage = localStorage.getItem('korual-language') || ['en','zh','ja','vi'].find((code) => navigator.language.toLowerCase().startsWith(code)) || 'ko';
  const [language, setLanguage] = useState(detectedLanguage); const t = i18n[language];
  const [health, setHealth] = useState({ state: 'loading' });
  const [running, setRunning] = useState(null);
  const [events, setEvents] = useState([]);
  const [activeNav, setActiveNav] = useState('overview');
  async function refreshHealth() { setHealth({ state: 'loading' }); try { setHealth({ state: 'ready', ...await getPlatformHealth() }); } catch (error) { setHealth({ state: 'error', message: error.message }); } }
  useEffect(() => { refreshHealth(); }, []);
  useEffect(() => { document.documentElement.lang = language; localStorage.setItem('korual-language', language); }, [language]);
  async function execute(action) {
    setRunning(action.id);
    try { const result = await runKorualAction(action.id); setEvents((items) => [{ id: crypto.randomUUID(), title: action.title, ok: result.ok !== false, detail: '자동화가 정상 완료됐습니다.', at: new Date() }, ...items].slice(0, 8)); }
    catch (error) { setEvents((items) => [{ id: crypto.randomUUID(), title: action.title, ok: false, detail: error.message, at: new Date() }, ...items].slice(0, 8)); }
    finally { setRunning(null); refreshHealth(); }
  }
  function addEvent(title, ok, detail) { setEvents((items) => [{ id: crypto.randomUUID(), title, ok, detail, at: new Date() }, ...items].slice(0, 8)); }
  const system = useMemo(() => health.state === 'loading' ? { label: '확인 중', tone: 'pending' } : health.state === 'ready' && health.ok ? { label: '시스템 정상', tone: 'good' } : { label: '연결 점검 필요', tone: 'bad' }, [health]);
  function navigate(id) { setActiveNav(id); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  return <div className="shell">
    <a className="skip-link" href="#overview">본문으로 건너뛰기</a>
    <aside className="sidebar" aria-label="주요 메뉴"><div className="brand"><span className="brand-mark">K</span><span>KORUAL</span></div><nav className="side-nav">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={activeNav === id ? 'active' : ''} onClick={() => navigate(id)}><Icon size={19} /><span>{label}</span></button>)}</nav><div className="sidebar-bottom"><a className="sheet-link" href={sheetsUrl} target="_blank" rel="noreferrer"><Sheet size={18} />운영 시트 열기<ExternalLink size={14} /></a><div className="sidebar-status"><span><StatusDot tone={system.tone} />{system.label}</span><small>보안 연결 활성화</small></div></div></aside>
    <main className="workspace">
      <header id="overview" className="page-header"><div><h1>{t.title}</h1><p>{t.subtitle}</p></div><div className="header-actions"><select className="language-select" value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Language"><option value="ko">한국어</option><option value="en">English</option><option value="zh">中文</option><option value="ja">日本語</option><option value="vi">Tiếng Việt</option></select><div className="global-status"><StatusDot tone={system.tone} />{system.label}</div><button className="outline-button" onClick={refreshHealth} disabled={health.state === 'loading'}><RefreshCw size={17} className={health.state === 'loading' ? 'spin' : ''} /><span>{t.refresh}</span></button></div></header>
      <div className="primary-grid"><section id="automation" className="panel automation-panel"><div className="panel-heading"><div><h2>운영 자동화 개요</h2><p>중요 작업만 직접 실행하고 결과를 확인합니다.</p></div><ShieldCheck size={20} /></div><div className="automation-list">{actions.map((action) => { const Icon = action.icon; const active = running === action.id; return <article className="automation-row" key={action.id}><div className="square-icon"><Icon size={22} /></div><div className="automation-copy"><h3>{action.title}</h3><p>{action.description}</p></div><div className="cadence"><CalendarClock size={15} />{action.cadence}</div><div className="row-state"><StatusDot tone={active ? 'pending' : 'good'} />{active ? '실행 중' : '대기'}</div><button className="run-button" disabled={Boolean(running)} onClick={() => execute(action)}>{active && <RefreshCw size={16} className="spin" />}<span>{active ? '실행 중' : '지금 실행'}</span>{!active && <ChevronRight size={16} />}</button></article>; })}</div></section>
        <aside className="right-rail"><section className="panel health-panel"><div className="panel-heading compact"><h2>시스템 상태</h2></div><dl><div><dt>자동화 API</dt><dd><StatusDot tone={health.upstream === 'configured' ? 'good' : 'bad'} />{health.upstream === 'configured' ? '정상' : '확인'}</dd></div><div><dt>운영 데이터</dt><dd><StatusDot tone={health.spreadsheetId ? 'good' : 'pending'} />{health.spreadsheetId ? '정상' : '확인'}</dd></div><div><dt>GitHub 배포</dt><dd><StatusDot />정상</dd></div><div><dt>보안 경계</dt><dd><StatusDot />Server only</dd></div></dl></section><section className="panel sheet-panel"><div><h2>운영 시트</h2><p>Google Sheets 데이터베이스에서 세부 내용을 관리합니다.</p></div><a href={sheetsUrl} target="_blank" rel="noreferrer"><Sheet size={17} />운영 시트 열기<ExternalLink size={14} /></a></section></aside></div>
      <DataManager addEvent={addEvent} t={t} />
      <div className="secondary-grid"><section id="integrations" className="panel integrations-panel"><div className="panel-heading"><div><h2>연동 허브</h2><p>권한과 역할이 명확한 핵심 연결만 관리합니다.</p></div><span className="count-label">{integrations.filter((item) => item.state === 'connected').length} 연결</span></div><div className="integration-grid">{integrations.map(({ name, group, state, icon: Icon, url }) => { const body = <><div className="integration-icon"><Icon size={21} /></div><div><strong>{name}</strong><small>{group}</small></div><span className={`connection ${state}`}><StatusDot tone={state === 'connected' ? 'good' : 'pending'} />{state === 'connected' ? '연결됨' : '준비'}</span>{url && <ExternalLink className="external" size={14} />}</>; return url ? <a key={name} className="integration-item" href={url} target="_blank" rel="noreferrer">{body}</a> : <div key={name} className="integration-item planned" aria-label={`${name} 연동 준비 중`}>{body}</div>; })}</div></section>
        <section id="activity" className="panel activity-panel"><div className="panel-heading"><div><h2>최근 활동</h2><p>자동화 실행 결과가 현재 브라우저에 표시됩니다.</p></div><Activity size={20} /></div>{events.length === 0 ? <div className="empty-state"><div className="empty-icon"><Workflow size={24} /></div><strong>실행 기록이 없습니다</strong><p>자동화를 실행하면 결과와 시간이 여기에 기록됩니다.</p></div> : <ul className="event-list">{events.map((event) => <li key={event.id}><span className={`event-icon ${event.ok ? 'success' : 'failure'}`}>{event.ok ? <Check size={16} /> : <CircleAlert size={16} />}</span><div><strong>{event.title}</strong><p>{event.detail}</p></div><time>{event.at.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</time></li>)}</ul>}</section></div>
      <DecisionCenter />
      <Roadmap />
      <section id="settings" className="guardrail"><ShieldCheck size={20} /><div><strong>승인 기반 운영</strong><p>데이터 조회와 동기화는 자동화하고, 발주·결제·환불·고객 메시지는 운영자 승인 후 실행합니다.</p></div></section>
    </main>
    <nav className="mobile-nav" aria-label="모바일 주요 메뉴">{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={activeNav === id ? 'active' : ''} onClick={() => navigate(id)}><Icon size={19} /><span>{label.replace('KORUAL ', '')}</span></button>)}</nav>
  </div>;
}
createRoot(document.getElementById('root')).render(<App />);
