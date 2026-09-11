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

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY');
if (!JWT_SECRET || JWT_SECRET === 'CHANGE_ME') throw new Error('Missing secure JWT_SECRET');

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

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

  if (!services.length || services.some(name => !SERVICE_NAMES.has(name))) return { error: 'INVALID_SERVICES' };
  if (region.length < 2 || region.length > 100) return { error: 'INVALID_REGION' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desiredDate)) return { error: 'INVALID_DATE' };
  const parsedDate = new Date(`${desiredDate}T00:00:00Z`);
  if (Number.isNaN(parsedDate.getTime())) return { error: 'INVALID_DATE' };
  if (customerName.length < 2 || customerName.length > 50) return { error: 'INVALID_NAME' };
  if (!/^[0-9+()\-\s]{7,20}$/.test(phone)) return { error: 'INVALID_PHONE' };

  return { value: { services, region, desiredDate, customerName, phone } };
}

app.get('/', (_req, res) => {
  res.send(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KORUAL Platform</title><style>body{margin:0;background:#080a0d;color:#f6f4ee;font-family:Inter,-apple-system,BlinkMacSystemFont,"Noto Sans KR",sans-serif}main{min-height:100vh;display:grid;place-items:center;padding:24px}.card{width:min(900px,100%);padding:48px;border:1px solid #2b3138;border-radius:24px;background:linear-gradient(145deg,#12171c,#090b0e);box-shadow:0 30px 80px #0008}h1{font-family:Georgia,serif;font-size:clamp(42px,7vw,72px);margin:0 0 12px;color:#f0d58d}p{color:#b8c0c8;line-height:1.7}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:28px}.item{padding:18px;border:1px solid #2b3138;border-radius:14px}.item b{display:block;margin-bottom:7px}.item span{color:#8f98a2;font-size:13px}a{display:inline-block;margin-top:28px;padding:13px 18px;border-radius:12px;background:#f0d58d;color:#101112;text-decoration:none;font-weight:800}@media(max-width:700px){.card{padding:28px}.grid{grid-template-columns:1fr}}</style></head><body><main><section class="card"><h1>KORUAL</h1><p>Life Service Marketplace · Super Platform</p><p>입주청소 · 이사 · 렌탈 · 에어컨 청소 · 인터넷/TV · AI 견적비교</p><div class="grid"><div class="item"><b>Cashflow</b><span>현금흐름 중심 운영</span></div><div class="item"><b>Automation</b><span>시스템 자동화</span></div><div class="item"><b>Network</b><span>업체 경쟁견적 네트워크</span></div></div><a href="/platform/summary">Platform API 확인</a></section></main></body></html>`);
});

app.get('/health', (_req, res) => res.json({ ok: true, database: 'supabase' }));

app.get('/platform/summary', (_req, res) => {
  res.json({ ok: true, platform: 'KORUAL Super Platform', version: '1.2.0', database: 'Supabase', modules: ['commerce', 'travel', 'ai-agent', 'business', 'finance', 'developer-api', 'life-services'], operating_model: 'cashflow -> leverage -> system -> automation -> asset -> network effect' });
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
      source: 'platform'
    }).select('id,status,created_at').single();
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
