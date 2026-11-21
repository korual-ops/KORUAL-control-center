// KORUAL Platform API
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(express.static('public'));
app.use('/travel', express.static('korual-travel-mvp'));

const PORT = process.env.PORT || 8080;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';
const MAX_FAIL = Number.parseInt(process.env.MAX_FAIL || '5', 10);
const LOCK_MINUTES = Number.parseInt(process.env.LOCK_MINUTES || '15', 10);
const REQUIRE_IP_ALLOWLIST = process.env.REQUIRE_IP_ALLOWLIST === 'true';
const IP_ALLOWLIST = (process.env.IP_ALLOWLIST || '').split(',').map(s => s.trim()).filter(Boolean);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

const missingRuntimeConfig = [
  ...(!SUPABASE_URL || !SUPABASE_SECRET_KEY ? ['SUPABASE'] : []),
  ...(!JWT_SECRET || JWT_SECRET === 'CHANGE_ME' ? ['JWT_SECRET'] : [])
];

const supabaseAdmin = missingRuntimeConfig.includes('SUPABASE')
  ? null
  : createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

function requireRuntimeConfig(_req, res, next) {
  if (missingRuntimeConfig.length === 0) return next();
  return res.status(503).json({
    ok: false,
    error: 'SERVICE_NOT_CONFIGURED',
    missing: missingRuntimeConfig
  });
}

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.length === 0) return cb(new Error('CORS_NOT_CONFIGURED'));
    return cb(null, ALLOWED_ORIGINS.includes(origin));
  },
  credentials: true
}));

function getClientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim();
  return req.socket?.remoteAddress || null;
}

function signToken(payload) { return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }); }
function verifyToken(token) { return jwt.verify(token, JWT_SECRET); }

function setAuthCookie(res, token) {
  res.cookie('korual_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 1000 * 60 * 60 * 2
  });
}

function clearAuthCookie(res) {
  res.clearCookie('korual_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
}

async function getProfileByIdentifier(identifier) {
  const value = String(identifier || '').trim();
  if (!value) return null;
  const query = value.includes('@')
    ? supabaseAdmin.from('profiles').select('*').eq('email', value).maybeSingle()
    : supabaseAdmin.from('profiles').select('*').eq('display_name', value).maybeSingle();
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function getProfileById(id) {
  const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function auditLogin({ email, userId, success, ip, userAgent, reason }) {
  const { error } = await supabaseAdmin.from('login_audit_logs').insert({
    email: email || null,
    user_id: userId || null,
    success: !!success,
    ip: ip || null,
    user_agent: userAgent || null,
    reason: reason || null
  });
  if (error) console.error('login_audit_logs insert failed:', error.message);
}

function requireAuth(req, res, next) {
  try {
    const token = req.cookies.korual_token;
    if (!token) return res.status(401).json({ ok: false, error: 'UNAUTHENTICATED' });
    req.user = verifyToken(token);
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: 'INVALID_TOKEN' });
  }
}

async function requireAdmin(req, res, next) {
  try {
    const profile = await getProfileById(req.user.sub);
    if (!profile?.active) return res.status(403).json({ ok: false, error: 'INACTIVE_USER' });
    if (profile.role !== 'ADMIN') return res.status(403).json({ ok: false, error: 'ADMIN_ONLY' });
    if (REQUIRE_IP_ALLOWLIST) {
      const ip = getClientIp(req);
      if (!ip || !IP_ALLOWLIST.includes(ip)) return res.status(403).json({ ok: false, error: 'IP_NOT_ALLOWED' });
    }
    req.profile = profile;
    return next();
  } catch (error) {
    console.error('admin auth failed:', error.message);
    return res.status(500).json({ ok: false, error: 'AUTH_CHECK_FAILED' });
  }
}

const SERVICE_NAMES = new Set(['입주청소', '이사', '인터넷', '정수기', '인테리어', '수리·시공']);
const quoteRate = new Map();
function quoteRateLimited(ip) {
  const now = Date.now();
  const current = quoteRate.get(ip) || { started: now, count: 0 };
  if (now - current.started > 60_000) {
    quoteRate.set(ip, { started: now, count: 1 });
    return false;
  }
  current.count += 1;
  quoteRate.set(ip, current);
  return current.count > 20;
}

function validateQuoteRequest(body) {
  const services = Array.isArray(body?.services)
    ? [...new Set(body.services.map(v => String(v).trim()).filter(Boolean))]
    : [];
  const region = String(body?.region || '').trim();
  const desiredDate = String(body?.date || '').trim();
  const customerName = String(body?.name || '').trim();
  const phone = String(body?.phone || '').trim();
  const cleanOptional = (value, max = 120) => {
    const text = String(value || '').trim();
    return text ? text.slice(0, max) : null;
  };
  const sessionId = cleanOptional(body?.session_id, 128);
  const utmSource = cleanOptional(body?.utm_source, 120);
  const utmMedium = cleanOptional(body?.utm_medium, 120);
  const utmCampaign = cleanOptional(body?.utm_campaign, 160);
  const referrerHost = cleanOptional(body?.referrer_host, 255);
  const landingPath = cleanOptional(body?.landing_path, 300);

  if (!services.length || services.some(name => !SERVICE_NAMES.has(name))) return { error: 'INVALID_SERVICES' };
  if (region.length < 2 || region.length > 100) return { error: 'INVALID_REGION' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desiredDate)) return { error: 'INVALID_DATE' };
  const parsedDate = new Date(`${desiredDate}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime())) return { error: 'INVALID_DATE' };
  if (customerName.length < 2 || customerName.length > 50) return { error: 'INVALID_NAME' };
  if (!/^[0-9+()\-\s]{7,20}$/.test(phone)) return { error: 'INVALID_PHONE' };

  return { value: { services, region, desiredDate, customerName, phone, sessionId, utmSource, utmMedium, utmCampaign, referrerHost, landingPath } };
}

app.get('/', (_req, res) => {
  res.send(`<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#090a0c">
  <title>KORUAL Control Center</title>
  <style>
    :root{color-scheme:dark;--bg:#08090b;--surface:#0e1113;--surface2:#13171a;--line:#262b2f;--text:#f5f3ed;--muted:#92999f;--gold:#c9a45e;--gold2:#e5c784;--green:#49c876;--amber:#dea943;--red:#ef6d6d;--radius:18px}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;min-width:320px;min-height:100vh;font-family:Inter,Pretendard,"Noto Sans KR",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--text);background:radial-gradient(circle at 80% -5%,rgba(201,164,94,.10),transparent 28%),radial-gradient(circle at 12% 26%,rgba(255,255,255,.025),transparent 24%),var(--bg)}
    a{color:inherit;text-decoration:none}button{font:inherit}.app{display:grid;grid-template-columns:220px minmax(0,1fr);min-height:100vh}.rail{position:sticky;top:0;height:100vh;padding:24px 14px;border-right:1px solid var(--line);background:rgba(8,10,12,.94);backdrop-filter:blur(18px);display:flex;flex-direction:column;gap:24px}.brand{display:flex;align-items:center;gap:11px;padding:0 10px}.mark{display:grid;place-items:center;width:38px;height:38px;border:1px solid rgba(201,164,94,.4);border-radius:12px;color:var(--gold2);font-weight:900;background:rgba(201,164,94,.08)}.brand b{font-size:15px;letter-spacing:.08em}.brand small{display:block;margin-top:2px;color:var(--muted);font-size:10px;letter-spacing:.06em}.nav{display:grid;gap:6px}.nav a{display:flex;align-items:center;gap:10px;min-height:44px;padding:0 12px;border-radius:10px;color:#a7adb0;font-size:13px}.nav a:hover,.nav a.active{color:var(--gold2);background:rgba(201,164,94,.10)}.rail-foot{margin-top:auto;padding:14px 10px 0;border-top:1px solid var(--line)}.live{display:flex;align-items:center;gap:8px;font-size:12px}.dot{width:8px;height:8px;border-radius:99px;background:var(--amber);box-shadow:0 0 0 4px rgba(222,169,67,.08)}.dot.good{background:var(--green);box-shadow:0 0 0 4px rgba(73,200,118,.08)}.dot.bad{background:var(--red)}.rail-foot small{display:block;margin-top:7px;color:var(--muted);font-size:10px}.workspace{padding:0 clamp(20px,3vw,46px) 48px;max-width:1580px}.topbar{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:18px;min-height:78px;border-bottom:1px solid rgba(255,255,255,.07);background:rgba(8,9,11,.88);backdrop-filter:blur(18px)}.eyebrow{color:var(--gold2);font-size:10px;font-weight:800;letter-spacing:.18em}.topbar h1{margin:5px 0 0;font-size:23px;letter-spacing:-.03em}.status-pill{display:flex;align-items:center;gap:8px;min-height:38px;padding:0 13px;border:1px solid var(--line);border-radius:10px;background:var(--surface);font-size:12px}.hero{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);gap:14px;margin-top:20px}.hero-main,.health-card,.module,.model{border:1px solid var(--line);border-radius:var(--radius);background:linear-gradient(180deg,rgba(16,19,21,.96),rgba(10,12,14,.98));box-shadow:0 22px 60px rgba(0,0,0,.14)}.hero-main{padding:28px;min-height:270px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden;position:relative}.hero-main:after{content:"";position:absolute;width:260px;height:260px;border-radius:50%;right:-80px;top:-90px;background:radial-gradient(circle,rgba(201,164,94,.13),transparent 68%);pointer-events:none}.hero-main h2{position:relative;z-index:1;margin:13px 0 10px;max-width:780px;font-size:clamp(30px,5vw,58px);line-height:1.02;letter-spacing:-.055em}.hero-main p{position:relative;z-index:1;margin:0;max-width:720px;color:var(--muted);font-size:14px;line-height:1.7}.actions{position:relative;z-index:1;display:flex;flex-wrap:wrap;gap:9px;margin-top:24px}.action{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 15px;border:1px solid var(--line);border-radius:10px;font-size:12px}.action.primary{border-color:rgba(201,164,94,.65);background:var(--gold);color:#111;font-weight:800}.action:hover{transform:translateY(-1px)}.health-card{padding:20px}.health-card h3{margin:0 0 16px;font-size:14px}.health-grid{display:grid;gap:2px}.health-row{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:12px}.health-row:last-child{border-bottom:0}.health-row span:first-child{color:var(--muted)}.health-row strong{font-weight:700}.section-head{display:flex;align-items:end;justify-content:space-between;gap:16px;margin:28px 0 12px}.section-head h3{margin:0;font-size:16px}.section-head p{margin:4px 0 0;color:var(--muted);font-size:11px}.section-head span{color:var(--gold2);font-size:11px}.modules{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.module{padding:18px;min-height:150px;transition:.16s ease}.module:hover{transform:translateY(-2px);border-color:rgba(201,164,94,.34);background:var(--surface2)}.module .icon{display:grid;place-items:center;width:36px;height:36px;border:1px solid rgba(201,164,94,.32);border-radius:10px;color:var(--gold2);background:rgba(201,164,94,.06);font-size:13px;font-weight:800}.module h4{margin:18px 0 6px;font-size:13px}.module p{margin:0;color:var(--muted);font-size:11px;line-height:1.55}.module small{display:block;margin-top:15px;color:#737b80;font-size:9px;text-transform:uppercase;letter-spacing:.1em}.model{margin-top:12px;padding:20px}.flow{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:7px;margin-top:13px}.flow span{display:grid;place-items:center;min-height:58px;padding:8px;border:1px solid rgba(255,255,255,.07);border-radius:10px;background:rgba(255,255,255,.018);color:#bbc0c2;font-size:10px;text-align:center}.flow span:not(:last-child):after{content:"→";position:absolute}.mobile-dock{display:none}
    @media(max-width:1100px){.modules{grid-template-columns:repeat(2,minmax(0,1fr))}.flow{grid-template-columns:repeat(4,minmax(0,1fr))}}
    @media(max-width:760px){.app{display:block}.rail{display:none}.workspace{padding:0 14px 88px}.topbar{min-height:72px}.topbar h1{font-size:19px}.status-pill{min-height:34px;padding:0 10px}.hero{grid-template-columns:1fr}.hero-main{min-height:240px;padding:22px}.health-card{padding:17px}.modules{grid-template-columns:1fr 1fr;gap:8px}.module{min-height:138px;padding:15px}.flow{grid-template-columns:repeat(2,minmax(0,1fr))}.mobile-dock{position:fixed;inset:auto 0 0;z-index:50;display:grid;grid-template-columns:repeat(4,1fr);padding:7px 8px calc(7px + env(safe-area-inset-bottom));border-top:1px solid var(--line);background:rgba(8,10,12,.96);backdrop-filter:blur(18px)}.mobile-dock a{display:grid;place-items:center;min-height:46px;border-radius:9px;color:#90979a;font-size:10px}.mobile-dock a.active{color:var(--gold2);background:rgba(201,164,94,.08)}}
    @media(max-width:420px){.modules{grid-template-columns:1fr}.hero-main h2{font-size:34px}}

    /* KORUAL 2026: polished operational overview, intentionally lightweight */
    :root{--gold:#c6a36c;--gold2:#edce94;--line:#30302e;--radius:20px}
    body{background:radial-gradient(ellipse at 78% -12%,rgba(198,163,108,.12),transparent 35%),#0b0b0d}
    .rail{background:linear-gradient(180deg,#131313,#0d0d0f);border-right-color:rgba(236,210,164,.12)}
    .brand .mark{font-family:Georgia,serif;font-size:22px;border-radius:11px;background:linear-gradient(145deg,#363027,#181615)}
    .brand b{font-family:Georgia,serif;letter-spacing:.13em}
    .topbar{border-bottom-color:rgba(236,210,164,.13)}
    .hero-main{background:radial-gradient(circle at 95% 0%,rgba(228,190,120,.16),transparent 33%),linear-gradient(120deg,#29231e,#151517 68%);border-color:rgba(219,185,129,.21)}
    .hero-main:before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(125deg,transparent 40%,rgba(255,255,255,.028) 52%,transparent 65%)}
    .hero-main h2{font-family:Georgia,"Noto Serif KR",serif;font-weight:600;line-height:1.13;letter-spacing:-.035em}
    .hero-main p{color:#c9c0b4}
    .health-card,.module,.model{background:linear-gradient(160deg,#1e1d1c,#141416);border-color:rgba(237,207,154,.12)}
    .module{position:relative;overflow:hidden}
    .module:before{content:"";pointer-events:none;position:absolute;left:16px;right:16px;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(235,202,147,.28),transparent)}
    .module[hidden]{display:none !important}
    .module-search{display:flex;align-items:center;gap:9px;min-height:46px;padding:0 14px;border:1px solid rgba(235,202,147,.24);border-radius:12px;background:#1b1a19;color:#d5cabc;max-width:315px}
    .module-search:focus-within{border-color:var(--gold2);box-shadow:0 0 0 3px rgba(198,163,108,.12)}
    .module-search input{min-width:0;width:100%;height:44px;border:0;outline:0;background:transparent;color:#f5f1e9;font:inherit;font-size:13px}
    .module-search input::placeholder{color:#b6ab9b}
    .module-result{font-size:12px;color:#bbb0a0;margin:8px 0 0}
    .module-empty{border:1px dashed rgba(235,202,147,.24);border-radius:14px;padding:22px;color:#cfc5b6;margin-top:12px}
    .module-empty[hidden]{display:none}
    .action,.nav a,.mobile-dock a{outline-offset:3px}
    :where(a,input):focus-visible{outline:2px solid var(--gold2)}
    @media(hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference){
      .module,.health-card{transition:transform .22s ease,border-color .22s ease,box-shadow .22s ease}
      .module:hover,.health-card:hover{transform:translateY(-3px);border-color:rgba(235,202,147,.33);box-shadow:0 18px 35px rgba(0,0,0,.19)}
      .action{transition:transform .2s ease,background-color .2s ease}
      .action:hover{transform:translateY(-2px)}
    }
    @media(prefers-reduced-motion:no-preference){
      @keyframes korual-appear{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}
      .hero,.modules{animation:korual-appear .48s ease-out both}
      .modules{animation-delay:.08s}
    }
    @media(max-width:760px){.module-search{max-width:none;width:100%}.hero-main h2{line-height:1.17}}
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.hero,.modules{animation:none!important}}

  </style>
</head>
<body>
  <div class="app">
    <aside class="rail">
      <div class="brand"><span class="mark">K</span><div><b>KORUAL</b><small>CONTROL CENTER</small></div></div>
      <nav class="nav" aria-label="주요 메뉴">
        <a class="active" href="#overview">Overview</a>
        <a href="#modules">Modules</a>
        <a href="/platform/summary">Platform API</a>
        <a href="/travel">Travel</a>
        <a href="/admin/service-requests/view">신청 업무함 (관리자)</a>
      </nav>
      <div class="rail-foot"><div class="live"><span id="rail-dot" class="dot"></span><span id="rail-status">상태 확인 중</span></div><small>Live platform health</small></div>
    </aside>
    <main class="workspace">
      <header class="topbar">
        <div><span class="eyebrow">KORUAL · OPERATIONS OS</span><h1>Control Center</h1></div>
        <div class="status-pill"><span id="top-dot" class="dot"></span><span id="top-status">Checking</span></div>
      </header>
      <section id="overview" class="hero">
        <article class="hero-main">
          <div><span class="eyebrow">SUPER PLATFORM · 2026</span><h2>거래·데이터·자동화를 하나의 운영 자산으로.</h2><p>KORUAL의 커머스, 여행, AI, 운영 데이터와 자동화를 한 화면에서 연결하는 운영 허브입니다. 각 모듈은 현금흐름과 운영 효율을 중심으로 확장됩니다.</p></div>
          <div class="actions"><a class="action primary" href="/platform/summary">Platform Summary</a><a class="action" href="/health">System Health</a><a class="action" href="/travel">Travel Module</a></div>
        </article>
        <aside class="health-card" aria-label="시스템 상태">
          <h3>Live system</h3>
          <div class="health-grid">
            <div class="health-row"><span>Runtime</span><strong id="runtime-state">확인 중</strong></div>
            <div class="health-row"><span>Database config</span><strong id="database-state">확인 중</strong></div>
            <div class="health-row"><span>Platform</span><strong id="platform-version">확인 중</strong></div>
            <div class="health-row"><span>Modules</span><strong id="module-count">확인 중</strong></div>
          </div>
        </aside>
      </section>
      <div id="modules" class="section-head"><div><h3>Core modules</h3><p>운영 우선순위에 맞춘 핵심 플랫폼 영역</p><div id="module-result" class="module-result" aria-live="polite">8개 영역</div></div><label class="module-search"><span aria-hidden="true">⌕</span><input id="module-filter" type="search" placeholder="모듈 검색 · Commerce, Travel..." aria-label="운영 모듈 검색" autocomplete="off"></label></div>
      <section class="modules">
        <article class="module"><span class="icon">01</span><h4>Commerce</h4><p>상품·주문·공급처·마진 의사결정과 판매 자동화.</p><small>Cashflow</small></article>
        <article class="module"><span class="icon">02</span><h4>Travel</h4><p>AI 일정, 항공·호텔·동선·파트너 예약 연결.</p><small>Network</small></article>
        <article class="module"><span class="icon">03</span><h4>AI Agent</h4><p>운영 리포트, 데이터 분석, 반복 작업 자동 실행.</p><small>Automation</small></article>
        <article class="module"><span class="icon">04</span><h4>Business</h4><p>파트너·서비스·견적·운영 프로세스 통합.</p><small>System</small></article>
        <article class="module"><span class="icon">05</span><h4>Finance</h4><p>매출·비용·현금흐름·수익성 모니터링 구조.</p><small>Control</small></article>
        <article class="module"><span class="icon">06</span><h4>Developer API</h4><p>외부 서비스와 KORUAL 기능을 연결하는 API 레이어.</p><small>Leverage</small></article>
        <article class="module"><span class="icon">07</span><h4>Life Services</h4><p>입주청소·이사·렌탈·수리 등 비교 견적 네트워크.</p><small>Marketplace</small></article>
        <article class="module"><span class="icon">08</span><h4>Data Layer</h4><p>운영 로그와 고객·상품·거래 데이터를 장기 자산화.</p><small>Asset</small></article>
      </section>
      <div class="module-empty" id="module-empty" role="status" hidden>검색 결과가 없습니다. 다른 모듈 이름이나 키워드를 입력하세요.</div>
      <section class="model">
        <div class="section-head" style="margin:0"><div><h3>Operating model</h3><p>KORUAL 성장 프레임</p></div></div>
        <div class="flow"><span>현금흐름</span><span>레버리지</span><span>시스템화</span><span>자동화</span><span>자산화</span><span>네트워크 효과</span><span>장기 복리</span><span>리스크 차단</span></div>
      </section>
    </main>
  </div>
  <nav class="mobile-dock" aria-label="모바일 메뉴"><a class="active" href="#overview">홈</a><a href="#modules">모듈</a><a href="/platform/summary">API</a><a href="/travel">여행</a></nav>
  <script>
    (function(){

      var moduleInput=document.getElementById('module-filter');
      var moduleCards=Array.from(document.querySelectorAll('.modules .module'));
      var moduleResult=document.getElementById('module-result');
      var moduleEmpty=document.getElementById('module-empty');
      function filterModules(){
        var q=(moduleInput.value||'').trim().toLocaleLowerCase('ko-KR');
        var count=0;
        moduleCards.forEach(function(card){
          var hit=card.textContent.toLocaleLowerCase('ko-KR').includes(q);
          card.hidden=!hit;
          if(hit)count+=1;
        });
        moduleResult.textContent='표시 중 '+count+'개 / 전체 '+moduleCards.length+'개';
        moduleEmpty.hidden=count>0;
      }
      moduleInput.addEventListener('input',filterModules);
      filterModules();

      var dots=[document.getElementById('rail-dot'),document.getElementById('top-dot')];
      var statuses=[document.getElementById('rail-status'),document.getElementById('top-status')];
      function setState(ok,label){dots.forEach(function(el){if(!el)return;el.className='dot '+(ok?'good':'bad')});statuses.forEach(function(el){if(el)el.textContent=label})}
      Promise.all([
        fetch('/health',{headers:{accept:'application/json'}}).then(function(r){return r.json().then(function(j){return {ok:r.ok,data:j}})}),
        fetch('/platform/summary',{headers:{accept:'application/json'}}).then(function(r){return r.json()})
      ]).then(function(result){
        var health=result[0],summary=result[1]||{};
        setState(Boolean(health.ok && health.data && health.data.ok),health.ok?'System online':'Config check');
        document.getElementById('runtime-state').textContent=health.ok?'Online':'Check';
        document.getElementById('database-state').textContent=(health.data&&health.data.database)==='supabase'?'Configured · 미검증':'미설정';
        document.getElementById('platform-version').textContent=summary.version?'v'+summary.version:'Unknown';
        document.getElementById('module-count').textContent=Array.isArray(summary.modules)?String(summary.modules.length):'Unknown';
      }).catch(function(){setState(false,'Connection check');document.getElementById('runtime-state').textContent='Unavailable'});
    })();
  </script>
</body>
</html>`);
});

app.get('/health', (_req, res) => {
  const configured = missingRuntimeConfig.length === 0;
  return res.status(configured ? 200 : 503).json({
    ok: configured,
    database: configured ? 'supabase' : 'not_configured',
    missing: missingRuntimeConfig
  });
});

app.get('/platform/summary', (_req, res) => {
  res.json({ ok: true, platform: 'KORUAL Super Platform', version: '1.2.0', database: 'Supabase', modules: ['commerce', 'travel', 'ai-agent', 'business', 'finance', 'developer-api', 'life-services'], operating_model: 'cashflow -> leverage -> system -> automation -> asset -> network effect' });
});

app.use(['/service-requests', '/marketplace', '/auth', '/admin'], requireRuntimeConfig);

app.get('/marketplace/summary', async (req, res) => {
  try {
    const service = String(req.query.service || '').trim();
    const region = String(req.query.region || '').trim();
    if (service && !SERVICE_NAMES.has(service)) return res.status(400).json({ ok: false, error: 'INVALID_SERVICE' });
    if (region.length > 100) return res.status(400).json({ ok: false, error: 'INVALID_REGION' });

    let providersQuery = supabaseAdmin
      .from('providers')
      .select('id,name,rating,review_count,verified,korual_score,avg_response_minutes,completed_jobs,service_categories,regions')
      .eq('active', true)
      .eq('verified', true)
      .order('korual_score', { ascending: false })
      .order('rating', { ascending: false })
      .limit(3);
    if (service) providersQuery = providersQuery.contains('service_categories', [service]);
    if (region) providersQuery = providersQuery.contains('regions', [region]);

    let benchmarkQuery = supabaseAdmin
      .from('price_benchmarks')
      .select('service_category,region,min_amount,median_amount,max_amount,sample_count,confidence_score,source,updated_at')
      .order('confidence_score', { ascending: false })
      .limit(1);
    if (service) benchmarkQuery = benchmarkQuery.eq('service_category', service);
    if (region) benchmarkQuery = benchmarkQuery.eq('region', region);

    const [providersResult, benchmarkResult, providerCountResult, benchmarkCountResult] = await Promise.all([
      providersQuery,
      benchmarkQuery.maybeSingle(),
      supabaseAdmin.from('providers').select('id', { count: 'exact', head: true }).eq('active', true).eq('verified', true),
      supabaseAdmin.from('price_benchmarks').select('id', { count: 'exact', head: true })
    ]);

    if (providersResult.error) throw providersResult.error;
    if (benchmarkResult.error) throw benchmarkResult.error;
    if (providerCountResult.error) throw providerCountResult.error;
    if (benchmarkCountResult.error) throw benchmarkCountResult.error;

    res.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.json({
      ok: true,
      network: {
        verified_providers: providerCountResult.count || 0,
        price_benchmarks: benchmarkCountResult.count || 0
      },
      benchmark: benchmarkResult.data || null,
      providers: providersResult.data || []
    });
  } catch (error) {
    console.error('marketplace summary error:', error.message);
    return res.status(500).json({ ok: false, error: 'MARKETPLACE_SUMMARY_FAILED' });
  }
});

app.post('/service-requests', async (req, res) => {
  try {
    const ip = getClientIp(req) || 'unknown';
    if (quoteRateLimited(ip)) return res.status(429).json({ ok: false, error: 'RATE_LIMITED' });
    const { error: validationError, value } = validateQuoteRequest(req.body);
    if (validationError) return res.status(400).json({ ok: false, error: validationError });

    const { data, error } = await supabaseAdmin.from('service_requests').insert({
      services: value.services,
      region: value.region,
      desired_date: value.desiredDate,
      customer_name: value.customerName,
      phone: value.phone,
      source: 'platform',
      session_id: value.sessionId,
      utm_source: value.utmSource,
      utm_medium: value.utmMedium,
      utm_campaign: value.utmCampaign,
      referrer_host: value.referrerHost,
      landing_path: value.landingPath
    }).select('id,request_code,status,created_at').single();
    if (error) throw error;
    return res.status(201).json({ ok: true, request: data });
  } catch (error) {
    console.error('service request error:', error.message);
    return res.status(500).json({ ok: false, error: 'SERVICE_REQUEST_FAILED' });
  }
});


/**
 * Read-only operational queue. PII is excluded by design.
 * Access: authenticated, active ADMIN only. Bounded pagination prevents full-table scans.
 */
const SERVICE_REQUEST_STATUSES = new Set(['OPEN','QUOTING','QUOTED','BOOKED','COMPLETED','CANCELLED']);

/**
 * Server-authorized, read-only request desk.
 * Unlike dashboard.html, this page never treats localStorage as an access token.
 */
app.get('/admin/service-requests/view', requireAuth, requireAdmin, (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  return res.type('html').send(`<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<title>KORUAL · 서비스 신청 업무함</title>
<style>
:root{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color-scheme:dark;--bg:#101012;--panel:#1b1b1e;--border:#39342d;--gold:#e1c18a;--text:#f5f1e9;--muted:#c5beb3}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 80% 0,rgba(211,173,106,.07),transparent 35%),var(--bg);color:var(--text)}
a{color:var(--gold)}main{max-width:1130px;margin:0 auto;padding:32px 20px 90px}
header{display:flex;justify-content:space-between;align-items:center;gap:15px;flex-wrap:wrap;border-bottom:1px solid var(--border);padding-bottom:23px}
.brand{font-family:Georgia,serif;letter-spacing:.16em;color:var(--gold);font-size:20px}
.eyebrow{font-size:11px;color:var(--gold);letter-spacing:.17em}
h1{font-size:clamp(26px,4vw,40px);margin:7px 0 8px;font-weight:600;letter-spacing:-.04em}
p{color:var(--muted);line-height:1.6}.panel{border:1px solid var(--border);border-radius:18px;background:var(--panel);padding:22px;margin-top:24px}
.controls{display:flex;align-items:end;flex-wrap:wrap;gap:10px;margin-bottom:18px}
label{display:grid;gap:7px;font-size:12px;color:var(--muted)}
select,button{font:inherit;border:1px solid #5b4a35;border-radius:10px;min-height:44px;padding:0 14px;background:#27231e;color:var(--text)}
button{cursor:pointer}button:hover:not(:disabled){border-color:var(--gold);background:#30291f}
button:disabled{opacity:.48;cursor:not-allowed}
:where(button,select,a):focus-visible{outline:2px solid var(--gold);outline-offset:3px}
.table-scroll{overflow-x:auto}
table{width:100%;min-width:680px;border-collapse:collapse}th,td{padding:14px 12px;border-bottom:1px solid var(--border);text-align:left;font-size:13px;vertical-align:top}
th{color:var(--gold);font-weight:600}td{color:var(--muted)}
td:first-child{color:var(--text);font-weight:600}
.status{display:inline-flex;padding:4px 9px;border-radius:20px;background:rgba(225,193,138,.09);color:var(--gold);font-size:12px}
.footer{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:18px}
#feedback{min-height:24px;color:var(--muted);font-size:13px}
.empty{padding:25px 12px;text-align:center;color:var(--muted)}
.note{font-size:12px;color:var(--muted)}
@media(max-width:600px){main{padding:20px 13px 60px}.panel{padding:14px}h1{font-size:27px}.controls>*{flex:1 1 100%}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
</style>
</head>
<body><main>
<header><span class="brand">KORUAL</span><a href="/">운영 홈으로</a></header>
<section aria-labelledby="page-title"><p class="eyebrow">CONTROL CENTER / SERVICE REQUESTS</p>
<h1 id="page-title">서비스 신청 업무함</h1>
<p>실제 DB 조회 결과만 표시하며 고객 이름과 연락처는 제공하지 않습니다. 상태 변경은 이 화면에서 실행할 수 없습니다.</p></section>
<section class="panel" aria-label="서비스 신청 조회">
<div class="controls">
<label for="status">신청 상태<select id="status"><option value="">전체</option><option value="OPEN">접수 OPEN</option><option value="QUOTING">견적 진행 QUOTING</option><option value="QUOTED">견적 완료 QUOTED</option><option value="BOOKED">예약 BOOKED</option><option value="COMPLETED">완료 COMPLETED</option><option value="CANCELLED">취소 CANCELLED</option></select></label>
<button id="reload" type="button">새로고침</button>
</div>
<div id="feedback" role="status" aria-live="polite">조회 준비 중</div>
<div class="table-scroll"><table><caption class="note" style="text-align:left;padding-bottom:10px">서비스 신청 내역 · 서버 인증 필요</caption>
<thead><tr><th>신청 코드</th><th>서비스</th><th>지역</th><th>희망일</th><th>상태</th><th>접수 시각</th></tr></thead><tbody id="rows"></tbody></table></div>
<div class="empty" id="empty" hidden>조회된 신청이 없습니다.</div>
<div class="footer"><span id="pagination" class="note">—</span><div><button id="prev" type="button" disabled>이전</button> <button id="next" type="button" disabled>다음</button></div></div>
</section></main>
<script>
(function(){
  'use strict';
  var status = document.getElementById('status');
  var feedback = document.getElementById('feedback');
  var rows = document.getElementById('rows');
  var empty = document.getElementById('empty');
  var pagination = document.getElementById('pagination');
  var prev = document.getElementById('prev');
  var next = document.getElementById('next');
  var reload = document.getElementById('reload');
  var page = 1, pageSize = 20, controller = null;
  function cell(row, value) {
    var td = document.createElement('td');
    td.textContent = value == null ? '—' : String(value);
    row.appendChild(td);
    return td;
  }
  async function load(){
    if (controller) controller.abort();
    controller = new AbortController();
    var current = controller;
    feedback.textContent = '서버에서 신청 정보를 조회하는 중…';
    reload.disabled = true; status.disabled = true; prev.disabled = true; next.disabled = true;
    rows.replaceChildren(); empty.hidden = true;
    var query = new URLSearchParams({page:String(page),limit:String(pageSize)});
    if (status.value) query.set('status',status.value);
    try{
      var response = await fetch('/admin/service-requests?' + query.toString(), {credentials:'same-origin',cache:'no-store',signal:current.signal,headers:{accept:'application/json'}});
      if(!response.ok){
        feedback.textContent = response.status === 401 || response.status === 403
          ? '인증 또는 접근 권한을 확인해 주세요.' : '조회 실패 (' + response.status + '). 다시 시도해 주세요.';
        pagination.textContent = '조회할 수 없음';
        return;
      }
      var data = await response.json();
      if(!data.ok || !Array.isArray(data.requests)) throw new Error('INVALID_RESPONSE');
      data.requests.forEach(function(item){
        var tr = document.createElement('tr');
        cell(tr,item.request_code || item.id);
        cell(tr,Array.isArray(item.services) ? item.services.join(', ') : item.services);
        cell(tr,item.region);
        cell(tr,item.desired_date);
        var statusCell = cell(tr,item.status);
        statusCell.className = 'status';
        cell(tr,item.created_at ? new Date(item.created_at).toLocaleString('ko-KR') : null);
        rows.appendChild(tr);
      });
      empty.hidden = data.requests.length !== 0;
      pagination.textContent = page + '페이지 · 전체 ' + data.pagination.total + '건';
      feedback.textContent = '서버 조회 완료 · 현재 페이지 ' + data.requests.length + '건';
      prev.disabled = page <= 1;
      next.disabled = !data.pagination.has_more;
    }catch(error){
      if(error.name !== 'AbortError'){feedback.textContent='연결에 실패했습니다. 새로고침을 눌러 다시 시도해 주세요.';pagination.textContent='조회할 수 없음';}
    }finally{
      if(current === controller){reload.disabled=false;status.disabled=false;}
    }
  }
  status.addEventListener('change',function(){page=1;load()});
  reload.addEventListener('click',load);
  prev.addEventListener('click',function(){if(page>1){page-=1;load()}});
  next.addEventListener('click',function(){page+=1;load()});
  load();
})();
</script></body></html>`);
});

app.get('/admin/service-requests', requireAuth, requireAdmin, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const status = String(req.query.status || '').trim().toUpperCase();
  const limitRaw = String(req.query.limit ?? '25');
  const pageRaw = String(req.query.page ?? '1');
  if (status && !SERVICE_REQUEST_STATUSES.has(status)) {
    return res.status(400).json({ ok: false, error: 'INVALID_STATUS' });
  }
  if (!/^\d{1,3}$/.test(limitRaw) || !/^\d{1,5}$/.test(pageRaw)) {
    return res.status(400).json({ ok: false, error: 'INVALID_PAGINATION' });
  }
  const limit = Number(limitRaw);
  const page = Number(pageRaw);
  if (limit < 1 || limit > 50 || page < 1 || page > 10000) {
    return res.status(400).json({ ok: false, error: 'INVALID_PAGINATION' });
  }
  try {
    const from = (page - 1) * limit;
    let query = supabaseAdmin.from('service_requests')
      .select('id,request_code,status,services,region,desired_date,created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);
    if (status) query = query.eq('status', status);
    const { data, count, error } = await query;
    if (error) throw error;
    return res.json({
      ok: true,
      source: 'database',
      status: status || null,
      pagination: { page, limit, total: count ?? 0, has_more: from + (data?.length || 0) < (count ?? 0) },
      requests: data || []
    });
  } catch (error) {
    console.error('admin service request list failed:', error.message);
    return res.status(500).json({ ok: false, error: 'SERVICE_REQUEST_LIST_FAILED' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ ok: false, error: 'MISSING_CREDENTIALS' });
    const ip = getClientIp(req);
    const ua = req.headers['user-agent'] || null;
    const profile = await getProfileByIdentifier(username);
    if (!profile) {
      await auditLogin({ email: username, userId: null, success: false, ip, userAgent: ua, reason: 'NO_USER' });
      return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' });
    }
    if (!profile.active) {
      await auditLogin({ email: profile.email, userId: profile.id, success: false, ip, userAgent: ua, reason: 'INACTIVE' });
      return res.status(403).json({ ok: false, error: 'INACTIVE_USER' });
    }
    if (profile.locked_until && new Date(profile.locked_until).getTime() > Date.now()) {
      await auditLogin({ email: profile.email, userId: profile.id, success: false, ip, userAgent: ua, reason: 'LOCKED' });
      return res.status(423).json({ ok: false, error: 'LOCKED', locked_until: profile.locked_until });
    }
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({ email: profile.email, password });
    if (authError || !authData.user) {
      const newFail = (profile.fail_count || 0) + 1;
      const lockedUntil = newFail >= MAX_FAIL ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString() : null;
      await supabaseAdmin.from('profiles').update({ fail_count: newFail, ...(lockedUntil ? { locked_until: lockedUntil } : {}) }).eq('id', profile.id);
      await auditLogin({ email: profile.email, userId: profile.id, success: false, ip, userAgent: ua, reason: 'WRONG_PW' });
      return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS', fail_count: newFail, locked_until: lockedUntil });
    }
    const { data: updated, error: updateError } = await supabaseAdmin.from('profiles').update({ last_login_at: new Date().toISOString(), last_ip: ip, fail_count: 0, locked_until: null }).eq('id', profile.id).select('*').single();
    if (updateError) throw updateError;
    await auditLogin({ email: updated.email, userId: updated.id, success: true, ip, userAgent: ua, reason: 'OK' });
    setAuthCookie(res, signToken({ sub: updated.id, email: updated.email, role: updated.role, display_name: updated.display_name || updated.email }));
    return res.json({ ok: true, user: { id: updated.id, username: updated.display_name || updated.email, role: updated.role, display_name: updated.display_name || updated.email } });
  } catch (error) {
    console.error('login error:', error.message);
    return res.status(500).json({ ok: false, error: 'LOGIN_FAILED' });
  }
});

app.get('/auth/whoami', requireAuth, async (req, res) => {
  try {
    const profile = await getProfileById(req.user.sub);
    if (!profile) return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' });
    if (!profile.active) return res.status(403).json({ ok: false, error: 'INACTIVE_USER' });
    return res.json({ ok: true, user: { id: profile.id, username: profile.display_name || profile.email, role: profile.role, display_name: profile.display_name || profile.email, mfa_enabled: profile.mfa_enabled, active: profile.active, last_login_at: profile.last_login_at, last_ip: profile.last_ip } });
  } catch (error) {
    console.error('whoami error:', error.message);
    return res.status(500).json({ ok: false, error: 'WHOAMI_FAILED' });
  }
});

app.post('/auth/logout', (_req, res) => { clearAuthCookie(res); res.json({ ok: true }); });

app.get('/admin/users', requireAuth, requireAdmin, async (_req, res) => {
  const { data, error } = await supabaseAdmin.from('profiles').select('id,email,display_name,role,active,fail_count,locked_until,last_login_at,last_ip,created_at,updated_at').order('created_at', { ascending: false }).limit(200);
  if (error) return res.status(500).json({ ok: false, error: 'USERS_QUERY_FAILED' });
  return res.json({ ok: true, users: (data || []).map(u => ({ ...u, username: u.display_name || u.email })) });
});

async function recordAdminAction({ actorUserId, action, targetUserId, meta, ip }) {
  const { error } = await supabaseAdmin.from('admin_actions').insert({ actor_user_id: actorUserId, action, target_user_id: targetUserId || null, meta: meta || {}, ip: ip || null });
  if (error) throw error;
}

app.post('/admin/users/unlock', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username } = req.body || {};
    if (!username) return res.status(400).json({ ok: false, error: 'MISSING_USERNAME' });
    const target = await getProfileByIdentifier(username);
    if (!target) return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' });
    const { error } = await supabaseAdmin.from('profiles').update({ fail_count: 0, locked_until: null }).eq('id', target.id);
    if (error) throw error;
    await recordAdminAction({ actorUserId: req.user.sub, action: 'UNLOCK_USER', targetUserId: target.id, meta: {}, ip: getClientIp(req) });
    return res.json({ ok: true });
  } catch (error) {
    console.error('unlock error:', error.message);
    return res.status(500).json({ ok: false, error: 'UNLOCK_FAILED' });
  }
});

app.post('/admin/users/set-role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, role } = req.body || {};
    if (!username || !['ADMIN', 'MANAGER', 'GUEST'].includes(role)) return res.status(400).json({ ok: false, error: 'INVALID_PARAMS' });
    const target = await getProfileByIdentifier(username);
    if (!target) return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' });
    const { error } = await supabaseAdmin.from('profiles').update({ role }).eq('id', target.id);
    if (error) throw error;
    await recordAdminAction({ actorUserId: req.user.sub, action: 'SET_ROLE', targetUserId: target.id, meta: { role }, ip: getClientIp(req) });
    return res.json({ ok: true });
  } catch (error) {
    console.error('set-role error:', error.message);
    return res.status(500).json({ ok: false, error: 'SET_ROLE_FAILED' });
  }
});

app.post('/admin/users/set-active', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, active } = req.body || {};
    if (!username || typeof active !== 'boolean') return res.status(400).json({ ok: false, error: 'INVALID_PARAMS' });
    const target = await getProfileByIdentifier(username);
    if (!target) return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' });
    const { error } = await supabaseAdmin.from('profiles').update({ active }).eq('id', target.id);
    if (error) throw error;
    await recordAdminAction({ actorUserId: req.user.sub, action: 'SET_ACTIVE', targetUserId: target.id, meta: { active }, ip: getClientIp(req) });
    return res.json({ ok: true });
  } catch (error) {
    console.error('set-active error:', error.message);
    return res.status(500).json({ ok: false, error: 'SET_ACTIVE_FAILED' });
  }
});

if (!process.env.VERCEL) app.listen(PORT, () => console.log(`KORUAL Control Center running on :${PORT}`));

export default app;
