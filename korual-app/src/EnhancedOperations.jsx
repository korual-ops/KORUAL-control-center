import { useMemo, useState } from "react";
import { App } from "./App.jsx";
import "./enhanced-operations.css";

const incidents = [
  { id: "INC-0241", severity: "P1", title: "결제 승인 지연", service: "payments-api", region: "서울", owner: "SRE", status: "조사 중", facts: ["p95 지연 2.8초", "오류율 7.4%", "배포 18분 후 시작"], timeline: ["07:42 임계치 초과 감지", "07:44 관련 알림 12건을 단일 인시던트로 묶음", "07:48 온콜 담당자 확인", "07:53 롤백 영향 분석 시작"] },
  { id: "INC-0239", severity: "P2", title: "검색 인덱싱 지연", service: "search-worker", region: "부산", owner: "플랫폼", status: "완화됨", facts: ["대기열 14,280건", "신규 문서 반영 11분 지연", "고객 오류는 없음"], timeline: ["06:58 처리량 저하 감지", "07:03 워커 4대 자동 증설", "07:16 대기열 감소 확인"] },
];

const groups = [
  { id: "INC-0241", level: "긴급", title: "결제 지연 관련 알림", count: 12, sources: ["API latency", "DB pool saturation", "Checkout timeout"], state: "조사 중" },
  { id: "INC-0239", level: "높음", title: "검색 파이프라인 지연", count: 7, sources: ["Queue depth", "Worker throughput"], state: "완화됨" },
  { id: "OBS-104", level: "주의", title: "서울 리전 CPU 상승", count: 4, sources: ["Node CPU", "Container throttling"], state: "관찰 중" },
];

const actions = [
  { id: 1, risk: "높음", title: "payments-api 이전 버전으로 롤백", reason: "배포 직후 지연과 오류율이 동시에 상승했습니다.", target: "payments-api / production", effects: "약 90초 동안 일부 요청이 재시도될 수 있습니다.", sources: ["배포 로그", "APM 지연 추이", "오류 샘플 42건"] },
  { id: 2, risk: "낮음", title: "search-worker 2대 추가 증설", reason: "현재 유입량에서 대기열 해소 시간이 25분으로 예상됩니다.", target: "search-worker / busan", effects: "월간 인프라 비용이 약 0.7% 증가합니다.", sources: ["큐 깊이", "최근 30분 처리량", "용량 정책"] },
];

export function EnhancedOperations() {
  const [mode, setMode] = useState("app");
  const [tab, setTab] = useState("incidents");
  const [selected, setSelected] = useState(incidents[0]);
  const [pending, setPending] = useState(null);
  const [done, setDone] = useState([]);
  const reduced = useMemo(() => groups.reduce((sum, item) => sum + item.count, 0) - groups.length, []);

  if (mode === "app") {
    return <><App /><button className="ops-launcher" onClick={() => setMode("center")}>운영 실행 센터</button></>;
  }

  return <main className="ops-shell">
    <header className="ops-header">
      <div><span className="ops-kicker">KORUAL CONTROL</span><h1>운영 실행 센터</h1><p>신호를 묶고, 사실을 확인하고, 승인 가능한 실행으로 전환합니다.</p></div>
      <button className="ops-ghost" onClick={() => setMode("app")}>기존 앱으로</button>
    </header>
    <nav className="ops-tabs">
      <button className={tab === "incidents" ? "active" : ""} onClick={() => setTab("incidents")}>인시던트</button>
      <button className={tab === "alerts" ? "active" : ""} onClick={() => setTab("alerts")}>알림 그룹</button>
      <button className={tab === "ai" ? "active" : ""} onClick={() => setTab("ai")}>AI 승인</button>
    </nav>

    {tab === "incidents" && <section className="ops-grid">
      <div className="ops-stack">{incidents.map((item) => <button key={item.id} className={`ops-card incident ${selected.id === item.id ? "selected" : ""}`} onClick={() => setSelected(item)}><span className={`severity ${item.severity.toLowerCase()}`}>{item.severity}</span><strong>{item.title}</strong><small>{item.id} · {item.service} · {item.status}</small></button>)}</div>
      <article className="ops-detail"><div className="ops-detail-head"><div><span className="ops-kicker">{selected.id}</span><h2>{selected.title}</h2></div><span className="status">{selected.status}</span></div><div className="fact-grid">{selected.facts.map((fact) => <div key={fact}>{fact}</div>)}</div><h3>자동 타임라인</h3><ol className="timeline">{selected.timeline.map((event) => <li key={event}>{event}</li>)}</ol><div className="meta">담당 {selected.owner} · {selected.region} · {selected.service}</div></article>
    </section>}

    {tab === "alerts" && <section><div className="ops-metrics"><div><strong>{groups.reduce((s, g) => s + g.count, 0)}</strong><span>원본 알림</span></div><div><strong>{groups.length}</strong><span>조사 단위</span></div><div><strong>{reduced}</strong><span>중복 제거</span></div></div><div className="group-grid">{groups.map((group) => <article className="ops-card" key={group.id}><div className="card-top"><span className={`level ${group.level}`}>{group.level}</span><span>{group.state}</span></div><h2>{group.title}</h2><p>{group.count}개 신호가 하나의 원인 후보로 묶였습니다.</p><div className="chips">{group.sources.map((source) => <span key={source}>{source}</span>)}</div><button className="ops-primary" onClick={() => { const incident = incidents.find((i) => i.id === group.id); if (incident) { setSelected(incident); setTab("incidents"); } }}>인시던트 확인</button></article>)}</div></section>}

    {tab === "ai" && <section><div className="approval-note"><strong>AI는 제안하고, 사람은 승인합니다.</strong><span>모든 실행은 근거·대상·예상 영향을 확인한 뒤 진행됩니다.</span></div><div className="group-grid">{actions.map((action) => <article className="ops-card" key={action.id}><div className="card-top"><span className={`risk risk-${action.risk}`}>위험 {action.risk}</span><span>{done.includes(action.id) ? "승인 완료" : "검토 필요"}</span></div><h2>{action.title}</h2><p>{action.reason}</p><dl><dt>대상</dt><dd>{action.target}</dd><dt>예상 영향</dt><dd>{action.effects}</dd></dl><button className="ops-primary" disabled={done.includes(action.id)} onClick={() => setPending(action)}>{done.includes(action.id) ? "실행 승인됨" : "근거 검토 후 실행"}</button></article>)}</div></section>}

    {pending && <div className="ops-modal-backdrop" onClick={() => setPending(null)}><section className="ops-modal" onClick={(event) => event.stopPropagation()}><span className={`risk risk-${pending.risk}`}>위험 {pending.risk}</span><h2>{pending.title}</h2><p>{pending.reason}</p><dl><dt>실행 대상</dt><dd>{pending.target}</dd><dt>예상 영향</dt><dd>{pending.effects}</dd></dl><h3>판단 근거</h3><ul>{pending.sources.map((source) => <li key={source}>{source}</li>)}</ul><div className="modal-actions"><button className="ops-ghost" onClick={() => setPending(null)}>취소</button><button className="ops-primary" onClick={() => { setDone((items) => [...items, pending.id]); setPending(null); }}>확인하고 승인</button></div></section></div>}
  </main>;
}
