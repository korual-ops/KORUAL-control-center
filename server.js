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
            <div class="health-row"><span>Database</span><strong id="database-state">확인 중</strong></div>
            <div class="health-row"><span>Platform</span><strong id="platform-version">확인 중</strong></div>
            <div class="health-row"><span>Modules</span><strong id="module-count">확인 중</strong></div>
          </div>
        </aside>
      </section>
      <div id="modules" class="section-head"><div><h3>Core modules</h3><p>운영 우선순위에 맞춘 핵심 플랫폼 영역</p></div><span>Connected architecture</span></div>
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
      <section class="model">
        <div class="section-head" style="margin:0"><div><h3>Operating model</h3><p>KORUAL 성장 프레임</p></div></div>
        <div class="flow"><span>현금흐름</span><span>레버리지</span><span>시스템화</span><span>자동화</span><span>자산화</span><span>네트워크 효과</span><span>장기 복리</span><span>리스크 차단</span></div>
      </section>
    </main>
  </div>
  <nav class="mobile-dock" aria-label="모바일 메뉴"><a class="active" href="#overview">홈</a><a href="#modules">모듈</a><a href="/platform/summary">API</a><a href="/travel">여행</a></nav>
  <script>
    (function(){
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
        document.getElementById('database-state').textContent=(health.data&&health.data.database)||'Unknown';
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
