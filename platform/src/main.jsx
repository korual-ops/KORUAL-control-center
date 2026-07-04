import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Bot, BriefcaseBusiness, Plane, Store, BarChart3, ShieldCheck, Zap, Globe2, Database, Users, CreditCard, PackageSearch } from 'lucide-react';
import './styles.css';

const modules = [
  { key: 'ai', title: 'KORUAL AI', icon: Bot, desc: '상품명, 상세페이지, 여행일정, CS, 리포트를 자동 생성합니다.', revenue: 'AI 사용량 과금' },
  { key: 'commerce', title: 'Commerce', icon: Store, desc: '1688/Temu/알리 상품 수집, 마진 계산, 업로드, 자동주문.', revenue: '상품마진 · PB' },
  { key: 'travel', title: 'Travel', icon: Plane, desc: '도시 입력 → 항공·호텔·동선·맛집·공항정보 자동 설계.', revenue: '제휴 수수료' },
  { key: 'cloud', title: 'Cloud SaaS', icon: Database, desc: '리셀러, 주문, 정산, 고객, API를 통합 관리합니다.', revenue: '월 구독료' },
  { key: 'partner', title: 'Partner Network', icon: Users, desc: '공급사, 리셀러, 여행 제휴사를 연결하는 네트워크.', revenue: 'B2B 수수료' },
  { key: 'finance', title: 'KORUAL Pay', icon: CreditCard, desc: '포인트, 정기결제, 멤버십, 리워드 구조의 결제 레이어.', revenue: '결제·멤버십' },
];

const products = [
  { name: 'KORUAL 크림엠보 자수 수건', type: 'PB', cost: 17000, price: 35000, margin: '51%' },
  { name: '럭셔리 디퓨저 세트', type: 'Dropshipping', cost: 8900, price: 24900, margin: '64%' },
  { name: '호텔 어메니티 키트', type: 'Bundle', cost: 13200, price: 39000, margin: '66%' },
];

const automations = [
  '상품 수집 → 마진 계산 → 상세페이지 생성 → 업로드',
  '주문 발생 → 공급처 주문 → 송장 업데이트 → 고객 알림',
  '고객 문의 → 의도 분류 → 답변 초안 → 환불/교환 규칙 적용',
  '여행 도시 입력 → 일정 생성 → 제휴 링크 → 수익 리포트',
];

function generateCommand(mode, text) {
  const prompt = text || 'KORUAL 플랫폼 성장 전략';
  const base = {
    commerce: `KORUAL Commerce 실행안\n\n입력: ${prompt}\n\n1. 판매 포지션\n- 호텔 감성·럭셔리 생활용품·선물형 PB로 시작\n- 수건/디퓨저/어메니티처럼 반복구매와 세트판매가 가능한 SKU 우선\n\n2. 현금흐름 구조\n- PB 고마진 상품 + 드롭쉬핑 무재고 상품 + B2B 답례품\n- 광고비를 쓰기 전 릴스/TikTok/검색 SEO로 검증\n\n3. 자동화\n- 소싱 데이터 → 원가/배송비/수수료 계산 → 판매가 추천\n- AI 상세페이지, 리뷰 요약, CS 답변 자동 생성\n\n4. 리스크 차단\n- 상표권·KC·통관·환불정책 체크리스트를 상품 등록 전 필수화`,
    travel: `KORUAL Travel 실행안\n\n입력: ${prompt}\n\n1. 핵심 기능\n- 도시/일정/예산 입력 → 항공·호텔·동선·맛집·카페 자동 생성\n- 공항 근처 코스, 야간 코스, 안 힘든 코스 필터 제공\n\n2. 수익화\n- 항공권/호텔/투어/이심/보험 제휴 수수료\n- 프리미엄 AI 일정 PDF 또는 이미지 일정표 과금\n\n3. 데이터 자산\n- 도시별 추천 DB, 사용자 취향, 실제 이동 동선, 리뷰 데이터를 축적\n\n4. 확장\n- FlightRadar 스타일 편명 검색, 터미널/게이트/ETA 연동`,
    ops: `KORUAL 운영 자동화\n\n입력: ${prompt}\n\n1. 운영 대시보드\n- 매출, 마진, 주문, CS, 광고비, 재고, 환불률을 한 화면에서 추적\n\n2. 반복업무 제거\n- 상품등록/주문처리/송장안내/CS/정산 리포트 자동화\n\n3. 사람을 쓰는 지점\n- 촬영, 협상, 고난도 클레임, 공급처 개발만 외주·인력 활용\n\n4. KPI\n- 월 순익, SKU당 마진, 고객획득비용, 재구매율, 자동처리율`,
    wealth: `초부자 알고리즘\n\n입력: ${prompt}\n\n현금흐름 → 레버리지 → 시스템화 → 자동화 → 자산화 → 네트워크 효과 → 장기복리 → 리스크 차단\n\nKORUAL 적용:\n1. 현금흐름: PB/드롭쉬핑/SaaS/제휴 수수료\n2. 레버리지: AI·외주·공급망·리셀러\n3. 시스템화: 반복 가능한 판매/여행/CS 프로세스\n4. 자산화: 브랜드, 고객DB, 상세페이지, 리뷰, 공급처, 코드\n5. 리스크 차단: 법률·통관·환불·재고·광고비 통제`,
  };
  return base[mode];
}

function App() {
  const [mode, setMode] = useState('commerce');
  const [prompt, setPrompt] = useState('호텔급 수건 PB를 월 순익 4,000만원 구조로 키워줘');
  const output = useMemo(() => generateCommand(mode, prompt), [mode, prompt]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><span>K</span>KORUAL</div>
        <nav>
          <a href="#modules">Modules</a>
          <a href="#ai">AI</a>
          <a href="#commerce">Commerce</a>
          <a href="#admin">Admin</a>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div>
            <div className="badge"><Globe2 size={16} /> AI Super Platform</div>
            <h1>KORUAL Control Center</h1>
            <p className="lead">커머스, 여행, 리셀러 SaaS, AI Agent, 결제/포인트를 한 화면에서 운영하는 플랫폼 MVP입니다.</p>
            <div className="cta-row">
              <a className="primary" href="#ai">AI 콘솔 실행</a>
              <a className="ghost" href="#admin">운영 대시보드</a>
            </div>
          </div>
          <div className="glass kpi-card">
            <div className="kpi"><strong>₩40M</strong><span>월 순익 목표</span></div>
            <div className="kpi"><strong>8</strong><span>자동화 파이프라인</span></div>
            <div className="kpi"><strong>4</strong><span>수익 엔진</span></div>
            <div className="kpi"><strong>24/7</strong><span>AI 운영</span></div>
          </div>
        </section>

        <section id="modules" className="section">
          <div className="section-head"><h2>Platform Modules</h2><p>작게 시작해서 데이터와 브랜드를 자산화하는 구조</p></div>
          <div className="module-grid">
            {modules.map((m) => {
              const Icon = m.icon;
              return <article className="module-card" key={m.key}><Icon /><h3>{m.title}</h3><p>{m.desc}</p><b>{m.revenue}</b></article>;
            })}
          </div>
        </section>

        <section id="ai" className="section two-col">
          <div className="glass command">
            <div className="section-head small"><h2>AI Command</h2><p>전략·운영·상품·여행을 즉시 생성</p></div>
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="commerce">Commerce 전략</option>
              <option value="travel">Travel 전략</option>
              <option value="ops">운영 자동화</option>
              <option value="wealth">초부자 알고리즘</option>
            </select>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </div>
          <pre className="glass output">{output}</pre>
        </section>

        <section id="commerce" className="section">
          <div className="section-head"><h2>Commerce Engine</h2><p>PB + 드롭쉬핑 + 번들 + 리셀러 구조</p></div>
          <div className="product-grid">
            {products.map((p) => <article className="product" key={p.name}><span>{p.type}</span><h3>{p.name}</h3><p>원가 ₩{p.cost.toLocaleString()} → 판매가 ₩{p.price.toLocaleString()}</p><strong>예상 마진 {p.margin}</strong></article>)}
          </div>
        </section>

        <section id="admin" className="section two-col">
          <div className="glass">
            <div className="section-head small"><h2>Automation Map</h2><p>반복 업무를 시스템으로 전환</p></div>
            <div className="steps">{automations.map((a, i) => <div className="step" key={a}><span>{i + 1}</span>{a}</div>)}</div>
          </div>
          <div className="glass">
            <div className="section-head small"><h2>Risk Control</h2><p>성장보다 먼저 막아야 하는 구멍</p></div>
            <div className="risk-grid">
              <div><ShieldCheck />상표권·저작권</div><div><PackageSearch />통관·KC</div><div><BarChart3 />광고비 손실</div><div><Zap />DDoS·장애</div><div><BriefcaseBusiness />환불·약관</div><div><Database />고객DB 보안</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
