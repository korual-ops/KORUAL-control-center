import { useEffect, useMemo, useRef, useState } from "react";

const initialTasks = [
  { id: "WF-12581", title: "결제 시스템 장애 대응", project: "결제 서비스", owner: "박현우", priority: "긴급", status: "접수", due: "오늘 10:30", progress: 20 },
  { id: "WF-12580", title: "API 응답 지연 개선", project: "API 게이트웨이", owner: "최지연", priority: "높음", status: "진행 중", due: "오늘 11:00", progress: 55 },
  { id: "WF-12579", title: "회원 정보 동기화 오류", project: "사용자 서비스", owner: "박인수", priority: "높음", status: "접수", due: "오늘 11:15", progress: 15 },
  { id: "WF-12578", title: "보고서 자동화 스크립트 개선", project: "운영 자동화", owner: "이수정", priority: "보통", status: "진행 중", due: "오늘 14:00", progress: 48 },
  { id: "WF-12577", title: "보안 취약점 패치 검토", project: "보안", owner: "정민석", priority: "높음", status: "검토", due: "오늘 15:30", progress: 82 },
  { id: "JOB-3321", title: "일일 점검 리포트 생성", project: "배치 서비스", owner: "정우성", priority: "낮음", status: "완료", due: "완료", progress: 100 },
  { id: "WF-12576", title: "대시보드 지표 정의", project: "데이터", owner: "김서연", priority: "보통", status: "검토", due: "내일", progress: 70 },
  { id: "WF-12575", title: "모바일 UI 버그 수정", project: "프론트엔드", owner: "안소희", priority: "낮음", status: "완료", due: "완료", progress: 100 },
];

const initialAlerts = [
  { id: 1, level: "장애", title: "A지역 센터 DB 연결 지연", body: "DB 응답 시간이 임계치를 초과했습니다.", time: "09:16", read: false },
  { id: 2, level: "경고", title: "결제 실패율 임계치 초과", body: "결제 실패율이 2.5%를 초과했습니다.", time: "09:12", read: false },
  { id: 3, level: "정보", title: "신규 가입 유입 증가", body: "어제 대비 신규 가입이 15% 증가했습니다.", time: "09:08", read: false },
  { id: 4, level: "정보", title: "보안 패치 적용 완료", body: "주요 보안 패치가 정상 적용되었습니다.", time: "08:55", read: true },
];

const nav = ["관제", "업무 공간", "AI 브리핑", "데이터", "분석", "알림", "관리자"];
const stages = ["접수", "진행 중", "검토", "완료"];
const trend = [11, 9, 8, 12, 18, 34, 52, 65, 72, 68, 79, 76, 70, 62, 57, 48, 52, 47, 42, 45, 40, 35, 24];

function TrendCanvas({ compact = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(148, 163, 184, .16)";
    for (let i = 1; i < 5; i += 1) {
      ctx.beginPath();
      ctx.moveTo(0, (height / 5) * i);
      ctx.lineTo(width, (height / 5) * i);
      ctx.stroke();
    }
    const draw = (values, color, dash = []) => {
      ctx.setLineDash(dash);
      ctx.strokeStyle = color;
      ctx.lineWidth = compact ? 2 : 3;
      ctx.beginPath();
      values.forEach((value, index) => {
        const x = (index / (values.length - 1)) * width;
        const y = height - (value / 100) * (height - 18) - 8;
        index ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    };
    draw(trend.map((v) => v * 0.82), "rgba(148,163,184,.62)", [4, 5]);
    draw(trend, compact ? "#8b5cf6" : "#31c6f4");
  }, [compact]);
  return <canvas className="trend-canvas" ref={ref} aria-label="운영 추이 차트" />;
}

function StatusPill({ children }) {
  const token = children === "완료" ? "ok" : children === "진행 중" ? "info" : children === "검토" ? "warn" : "danger";
  return <span className={`pill ${token}`}>{children}</span>;
}

function Shell({ view, setView, alerts, children, theme = "dark", onSearch }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const unread = alerts.filter((a) => !a.read).length;
  return <div className={`app-shell ${theme}`}>
    <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
      <button className="brand" onClick={() => setView("관제")}>KORUAL</button>
      <nav>{nav.map((item) => <button key={item} className={view === item ? "active" : ""} onClick={() => { setView(item); setMobileOpen(false); }}><span>{item}</span>{item === "알림" && unread > 0 && <b>{unread}</b>}</button>)}</nav>
      <div className="sidebar-footer"><span className="live-dot" /> 모든 시스템 정상<small>버전 3.0.0</small></div>
    </aside>
    <section className="workspace">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)}>메뉴</button><input aria-label="전체 검색" placeholder="명령 또는 데이터를 검색하세요" onChange={(e) => onSearch(e.target.value)} /><button className="ai-chip" onClick={() => setView("AI 브리핑")}>AI</button><button className="notification-button" onClick={() => setView("알림")}>알림 {unread > 0 && <b>{unread}</b>}</button><div className="profile"><span>OP</span><div>운영자<small>관리자</small></div></div></header>
      <main>{children}</main>
    </section>
  </div>;
}

function CommandCenter({ tasks, setView }) {
  const kpis = [["전체 워크플로", tasks.length + 120, "+12%"], ["진행 중", tasks.filter((t) => t.status === "진행 중").length + 66, "+8%"], ["완료", tasks.filter((t) => t.status === "완료").length + 52, "+20%"], ["실패 / 오류", 6, "+50%"], ["SLA 준수율", "98.3%", "+1.2%"], ["평균 처리 시간", "18m 42s", "-5%"]];
  return <div className="page command-page">
    <div className="page-heading"><div><h1>운영 현황</h1><p>시스템과 업무 흐름을 한눈에 모니터링하세요.</p></div><div className="live-label"><span className="live-dot" /> 실시간</div></div>
    <section className="kpi-strip">{kpis.map(([label, value, delta]) => <article key={label}><small>{label}</small><strong>{value}</strong><span>{delta}</span></article>)}</section>
    <div className="dashboard-grid">
      <section className="panel chart-panel"><div className="panel-title"><h2>운영 추이</h2><div><button>24시간</button><button>7일</button></div></div><TrendCanvas /></section>
      <section className="panel live-panel"><div className="panel-title"><h2>실시간 활동</h2><button onClick={() => setView("알림")}>전체 보기</button></div>{initialAlerts.map((a) => <div className="activity" key={a.id}><time>{a.time}</time><div><strong>{a.title}</strong><small>{a.body}</small></div><StatusPill>{a.level === "정보" ? "완료" : a.level === "경고" ? "검토" : "접수"}</StatusPill></div>)}</section>
      <section className="panel priority-panel"><div className="panel-title"><h2>오늘의 우선순위</h2><button onClick={() => setView("업무 공간")}>보드 열기</button></div><div className="table-wrap"><table><thead><tr><th>업무</th><th>시스템</th><th>상태</th><th>담당자</th><th>SLA 마감</th></tr></thead><tbody>{tasks.slice(0, 6).map((task) => <tr key={task.id}><td><small>{task.id}</small><strong>{task.title}</strong></td><td>{task.project}</td><td><StatusPill>{task.status}</StatusPill></td><td>{task.owner}</td><td>{task.due}</td></tr>)}</tbody></table></div></section>
      <section className="panel health-panel"><div className="panel-title"><h2>시스템 상태</h2><span>8개 서비스</span></div>{["API 게이트웨이", "데이터베이스", "메시지 큐", "스토리지", "인증 서비스"].map((name, i) => <div className="health-row" key={name}><span>{name}</span><progress max="100" value={i === 0 ? 98 : 100} /><b>{i === 0 ? "98.1%" : "100%"}</b></div>)}</section>
    </div>
  </div>;
}

function Workflow({ tasks, setTasks }) {
  const [selected, setSelected] = useState(tasks[3]);
  const move = (task, direction) => {
    const index = stages.indexOf(task.status);
    const next = stages[Math.max(0, Math.min(stages.length - 1, index + direction))];
    const updated = tasks.map((t) => t.id === task.id ? { ...t, status: next, progress: Math.max(t.progress, (stages.indexOf(next) + 1) * 25) } : t);
    setTasks(updated);
    setSelected(updated.find((t) => t.id === task.id));
  };
  const addTask = () => { const task = { id: `WF-${12582 + tasks.length}`, title: "새 운영 업무", project: "운영", owner: "운영자", priority: "보통", status: "접수", due: "미정", progress: 0 }; setTasks([task, ...tasks]); setSelected(task); };
  return <div className="page workflow-page">
    <div className="page-heading"><div><h1>업무 공간</h1><p>팀의 모든 업무를 접수부터 완료까지 관리하세요.</p></div><button className="primary" onClick={addTask}>새 업무</button></div>
    <section className="workspace-metrics">{[["전체 업무", tasks.length], ["오늘 마감", 3], ["진행 중", tasks.filter((t) => t.status === "진행 중").length], ["완료", tasks.filter((t) => t.status === "완료").length]].map(([k, v]) => <article key={k}><small>{k}</small><strong>{v}</strong></article>)}</section>
    <div className="board-layout"><section className="board">{stages.map((stage) => <div className="column" key={stage}><div className="column-title"><h2>{stage}</h2><span>{tasks.filter((t) => t.status === stage).length}</span></div>{tasks.filter((t) => t.status === stage).map((task) => <button className={`task-card ${selected?.id === task.id ? "selected" : ""}`} key={task.id} onClick={() => setSelected(task)}><StatusPill>{task.priority === "긴급" ? "접수" : task.status}</StatusPill><strong>{task.title}</strong><small>{task.project}</small><div><span>{task.owner}</span><time>{task.due}</time></div></button>)}</div>)}</section>
      {selected && <aside className="detail-panel"><button className="close-detail" onClick={() => setSelected(null)}>닫기</button><StatusPill>{selected.priority === "긴급" ? "접수" : selected.status}</StatusPill><small>{selected.id}</small><h2>{selected.title}</h2><dl><div><dt>담당자</dt><dd>{selected.owner}</dd></div><div><dt>마감일</dt><dd>{selected.due}</dd></div><div><dt>프로젝트</dt><dd>{selected.project}</dd></div></dl><h3>진행률</h3><progress max="100" value={selected.progress} /><p>{selected.progress}% 완료</p><h3>체크리스트</h3>{["요구사항 분석", "기존 흐름 검토", "설계 및 구현", "테스트 및 검증"].map((label, i) => <label className="check" key={label}><input type="checkbox" defaultChecked={i < Math.ceil(selected.progress / 30)} />{label}</label>)}<div className="detail-actions"><button disabled={selected.status === "접수"} onClick={() => move(selected, -1)}>이전 단계</button><button className="primary" disabled={selected.status === "완료"} onClick={() => move(selected, 1)}>다음 단계</button></div></aside>}
    </div>
  </div>;
}

function Briefing({ tasks, setTasks, alerts, setAlerts, setView }) {
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState("");
  const recommendations = [["A지역 센터 인스턴스 증설", "처리 시간 20~30% 개선", "WF-12580"], ["결제 재시도 정책 조정", "결제 실패율 30% 감소 예상", "WF-12581"], ["가입 전환 플로우 A/B 테스트", "전환율 10% 향상 기대", "WF-12579"]];
  const run = (id) => { setTasks(tasks.map((t) => t.id === id ? { ...t, status: "진행 중", progress: Math.max(t.progress, 35) } : t)); setAlerts(alerts.map((a) => a.id === 1 ? { ...a, read: true } : a)); };
  return <div className="page briefing-page">
    <div className="page-heading"><div><h1>오늘의 브리핑</h1><p>운영 데이터에서 중요한 변화와 실행할 일을 정리했습니다.</p></div><button onClick={() => setAnswer("브리핑을 최신 운영 데이터로 갱신했습니다.")}>브리핑 새로고침</button></div>
    <div className="brief-grid"><div>
      <section className="panel action-top"><h2>지금 확인할 3가지</h2>{[["높음", "A지역 센터 처리 지연 증가", "주문 서비스 평균 처리 시간이 28% 증가했습니다."], ["중간", "결제 실패율 이상 상승", "어제 대비 결제 실패가 1.8배 증가했습니다."], ["중간", "신규 가입 전환율 하락", "유입은 증가했으나 전환이 감소했습니다."]].map(([level, title, body], i) => <article key={title}><b>{i + 1}</b><StatusPill>{level === "높음" ? "접수" : "검토"}</StatusPill><div><strong>{title}</strong><small>{body}</small></div><button onClick={() => setView(i === 2 ? "분석" : "업무 공간")}>자세히 보기</button></article>)}</section>
      <section className="panel anomaly"><div><h2>이상 징후</h2><StatusPill>접수</StatusPill><h3>A지역 센터 처리 지연</h3><p>09:00 이후 평균 처리 시간이 28% 증가했고 95p 지연 시간이 임계치에 근접했습니다.</p><ul><li>주문 처리</li><li>결제 승인</li><li>고객 알림</li></ul></div><div><TrendCanvas compact /></div></section>
      <section className="panel recommendation"><h2>권장 조치</h2>{recommendations.map(([name, effect, id], i) => <div className="recommend-row" key={name}><b>{i + 1}</b><strong>{name}</strong><span>{effect}</span><button onClick={() => run(id)}>실행</button></div>)}</section>
    </div><div className="brief-side">
      <section className="panel schedule"><h2>오늘의 주요 일정</h2>{[["09:30", "주간 운영 회의"], ["11:00", "배포 창"], ["14:00", "리스크 점검 회의"], ["18:00", "야간 배치 시작"]].map(([time, title]) => <div key={time}><time>{time}</time><span>{title}</span><button>상세</button></div>)}</section>
      <section className="panel alerts-mini"><h2>중요 알림</h2>{alerts.slice(0, 4).map((a) => <button key={a.id} onClick={() => setView("알림")}><StatusPill>{a.level === "정보" ? "완료" : a.level === "경고" ? "검토" : "접수"}</StatusPill><span><strong>{a.title}</strong><small>{a.body}</small></span><time>{a.time}</time></button>)}</section>
      <section className="panel assistant"><div className="assistant-title"><h2>AI 운영 어시스턴트</h2><span><i className="live-dot" /> 온라인</span></div><h3>무엇을 도와드릴까요?</h3><div className="quick-prompts">{["상황 요약", "로그 분석", "권장 조치 생성", "이상 탐지"].map((p) => <button key={p} onClick={() => setMessage(p)}>{p}</button>)}</div>{answer && <p className="ai-answer">{answer}</p>}<form onSubmit={(e) => { e.preventDefault(); if (message.trim()) setAnswer(`"${message}" 요청을 분석했습니다. 관련 업무 3건과 알림 2건을 확인하세요.`); }}><input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="요청을 입력하세요" /><button>전송</button></form></section>
    </div></div>
  </div>;
}

function DataView({ tasks, search }) {
  const rows = tasks.filter((t) => `${t.id}${t.title}${t.project}${t.owner}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="page"><div className="page-heading"><div><h1>데이터</h1><p>운영 업무 데이터를 검색하고 점검합니다.</p></div><button>CSV 내보내기</button></div><section className="panel data-panel"><div className="panel-title"><h2>워크플로 데이터</h2><span>{rows.length}개 항목</span></div><div className="table-wrap"><table><thead><tr><th>ID</th><th>업무</th><th>프로젝트</th><th>담당자</th><th>우선순위</th><th>상태</th><th>진행률</th></tr></thead><tbody>{rows.map((t) => <tr key={t.id}><td>{t.id}</td><td><strong>{t.title}</strong></td><td>{t.project}</td><td>{t.owner}</td><td>{t.priority}</td><td><StatusPill>{t.status}</StatusPill></td><td><progress max="100" value={t.progress} /> {t.progress}%</td></tr>)}</tbody></table></div>{rows.length === 0 && <div className="empty">검색 결과가 없습니다.</div>}</section></div>;
}

function Analytics({ tasks }) {
  return <div className="page"><div className="page-heading"><div><h1>분석</h1><p>서비스 흐름과 팀 성과의 변화를 비교합니다.</p></div><select><option>최근 30일</option><option>최근 7일</option></select></div><div className="analytics-grid"><section className="panel chart-panel"><h2>처리량 추이</h2><TrendCanvas /></section><section className="panel"><h2>상태별 업무</h2>{stages.map((s) => <div className="metric-bar" key={s}><span>{s}</span><progress max={tasks.length} value={tasks.filter((t) => t.status === s).length} /><b>{tasks.filter((t) => t.status === s).length}</b></div>)}</section><section className="panel"><h2>팀 성과</h2>{[["운영팀", 92], ["개발팀", 86], ["데이터팀", 78], ["보안팀", 95]].map(([n, v]) => <div className="metric-bar" key={n}><span>{n}</span><progress max="100" value={v} /><b>{v}%</b></div>)}</section><section className="panel insight-panel"><h2>핵심 인사이트</h2><strong>완료율 12% 상승</strong><p>자동화 업무 비중이 늘면서 평균 처리 시간이 5% 단축됐습니다.</p><button>상세 보고서 보기</button></section></div></div>;
}

function Alerts({ alerts, setAlerts }) {
  return <div className="page"><div className="page-heading"><div><h1>알림</h1><p>운영 이벤트와 조치가 필요한 항목을 확인하세요.</p></div><button onClick={() => setAlerts(alerts.map((a) => ({ ...a, read: true })))}>모두 읽음</button></div><section className="panel alert-list">{alerts.map((a) => <button className={a.read ? "read" : ""} key={a.id} onClick={() => setAlerts(alerts.map((x) => x.id === a.id ? { ...x, read: true } : x))}><StatusPill>{a.level === "정보" ? "완료" : a.level === "경고" ? "검토" : "접수"}</StatusPill><div><strong>{a.title}</strong><p>{a.body}</p></div><time>{a.time}</time></button>)}</section></div>;
}

function Admin() {
  const [auto, setAuto] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  return <div className="page"><div className="page-heading"><div><h1>관리자</h1><p>사용자 권한과 운영 환경을 관리합니다.</p></div><button className="primary">변경사항 저장</button></div><div className="admin-grid"><section className="panel"><h2>사용자 및 권한</h2>{[["김준호", "운영 관리자"], ["이수정", "팀 리드"], ["박현우", "운영 담당자"], ["김서연", "데이터 분석가"]].map(([n, r]) => <div className="user-row" key={n}><span>{n.slice(0, 1)}</span><div><strong>{n}</strong><small>{r}</small></div><select defaultValue={r}><option>{r}</option><option>뷰어</option><option>관리자</option></select></div>)}</section><section className="panel settings"><h2>시스템 설정</h2><label><span><strong>자동 새로고침</strong><small>운영 데이터를 30초마다 갱신합니다.</small></span><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /></label><label><span><strong>유지보수 모드</strong><small>일반 사용자의 쓰기 작업을 제한합니다.</small></span><input type="checkbox" checked={maintenance} onChange={(e) => setMaintenance(e.target.checked)} /></label><label><span><strong>기본 알림 채널</strong><small>중요 알림이 전달되는 기본 채널입니다.</small></span><select><option>앱 + 이메일</option><option>앱만</option></select></label></section></div></div>;
}

export function App() {
  const [view, setView] = useState("관제");
  const [tasks, setTasks] = useState(() => JSON.parse(localStorage.getItem("korual.tasks") || "null") || initialTasks);
  const [alerts, setAlerts] = useState(() => JSON.parse(localStorage.getItem("korual.alerts") || "null") || initialAlerts);
  const [search, setSearch] = useState("");
  useEffect(() => localStorage.setItem("korual.tasks", JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem("korual.alerts", JSON.stringify(alerts)), [alerts]);
  const visibleView = useMemo(() => {
    if (view === "관제") return <CommandCenter tasks={tasks} setView={setView} />;
    if (view === "업무 공간") return <Workflow tasks={tasks} setTasks={setTasks} />;
    if (view === "AI 브리핑") return <Briefing tasks={tasks} setTasks={setTasks} alerts={alerts} setAlerts={setAlerts} setView={setView} />;
    if (view === "데이터") return <DataView tasks={tasks} search={search} />;
    if (view === "분석") return <Analytics tasks={tasks} />;
    if (view === "알림") return <Alerts alerts={alerts} setAlerts={setAlerts} />;
    return <Admin />;
  }, [view, tasks, alerts, search]);
  return <Shell view={view} setView={setView} alerts={alerts} theme={view === "업무 공간" ? "light" : "dark"} onSearch={(value) => { setSearch(value); if (value) setView("데이터"); }}>{visibleView}</Shell>;
}
