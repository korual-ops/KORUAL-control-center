// api/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pg from 'pg';
import { Connector } from '@google-cloud/cloud-sql-connector';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(express.static('public'));

// CORS: Next.js 도메인만 허용 권장
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: function (origin, cb) {
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.length === 0) return cb(null, true);
    return cb(null, ALLOWED_ORIGINS.includes(origin));
  },
  credentials: true
}));

const { Pool } = pg;

// Env
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';

const INSTANCE_CONNECTION_NAME = process.env.INSTANCE_CONNECTION_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const DB_NAME = process.env.DB_NAME;

const REQUIRE_IP_ALLOWLIST = (process.env.REQUIRE_IP_ALLOWLIST || 'false') === 'true';
const IP_ALLOWLIST = (process.env.IP_ALLOWLIST || '').split(',').map(s => s.trim()).filter(Boolean);

const MAX_FAIL = parseInt(process.env.MAX_FAIL || '5', 10);
const LOCK_MINUTES = parseInt(process.env.LOCK_MINUTES || '15', 10);

let pool;

async function initDb() {
  if (pool) return pool;
  if (!INSTANCE_CONNECTION_NAME) throw new Error('Missing INSTANCE_CONNECTION_NAME');
  const connector = new Connector();
  const clientOpts = await connector.getOptions({ instanceConnectionName: INSTANCE_CONNECTION_NAME, ipType: 'PUBLIC' });
  pool = new Pool({ ...clientOpts, user: DB_USER, password: DB_PASS, database: DB_NAME, max: 5 });
  return pool;
}

function getClientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length > 0) return xf.split(',')[0].trim();
  return req.socket?.remoteAddress || null;
}

function sha256Hex(s) {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('korual_token', token, { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 1000 * 60 * 60 * 2 });
}

function clearAuthCookie(res) {
  res.clearCookie('korual_token', { path: '/' });
}

function requireAuth(req, res, next) {
  try {
    const token = req.cookies.korual_token;
    if (!token) return res.status(401).json({ ok: false, error: 'UNAUTHENTICATED' });
    req.user = verifyToken(token);
    return next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: 'INVALID_TOKEN' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user?.role) return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
  if (req.user.role !== 'ADMIN') return res.status(403).json({ ok: false, error: 'ADMIN_ONLY' });
  if (REQUIRE_IP_ALLOWLIST) {
    const ip = getClientIp(req);
    if (!ip || IP_ALLOWLIST.length === 0 || !IP_ALLOWLIST.includes(ip)) return res.status(403).json({ ok: false, error: 'IP_NOT_ALLOWED', ip });
  }
  return next();
}

async function auditLogin({ username, userId, success, ip, userAgent, reason }) {
  const db = await initDb();
  await db.query(
    `INSERT INTO login_audit_logs (username, user_id, success, ip, user_agent, reason)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [username || null, userId || null, !!success, ip || null, userAgent || null, reason || null]
  );
}

// KORUAL Platform entry point. Vercel's CDN serves /public files directly,
// but this explicit route keeps the root working when Express handles the request.
app.get('/', (req, res) => {
  res.send(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KORUAL Platform</title><style>body{margin:0;background:#080a0d;color:#f6f4ee;font-family:Inter,-apple-system,BlinkMacSystemFont,"Noto Sans KR",sans-serif}main{min-height:100vh;display:grid;place-items:center;padding:24px}.card{width:min(900px,100%);padding:48px;border:1px solid #2b3138;border-radius:24px;background:linear-gradient(145deg,#12171c,#090b0e);box-shadow:0 30px 80px #0008}h1{font-family:Georgia,serif;font-size:clamp(42px,7vw,72px);margin:0 0 12px;color:#f0d58d}p{color:#b8c0c8;line-height:1.7}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:28px}.item{padding:18px;border:1px solid #2b3138;border-radius:14px}.item b{display:block;margin-bottom:7px}.item span{color:#8f98a2;font-size:13px}a{display:inline-block;margin-top:28px;padding:13px 18px;border-radius:12px;background:#f0d58d;color:#101112;text-decoration:none;font-weight:800}@media(max-width:700px){.card{padding:28px}.grid{grid-template-columns:1fr}}</style></head><body><main><section class="card"><h1>KORUAL</h1><p>Life Service Marketplace · Super Platform</p><p>입주청소 · 이사 · 렌탈 · 에어컨 청소 · 인터넷/TV · AI 견적비교</p><div class="grid"><div class="item"><b>Cashflow</b><span>현금흐름 중심 운영</span></div><div class="item"><b>Automation</b><span>시스템 자동화</span></div><div class="item"><b>Network</b><span>업체 경쟁견적 네트워크</span></div></div><a href="/platform/summary">Platform API 확인</a></section></main></body></html>`);
});

app.get('/health', (_, res) => res.json({ ok: true }));

app.get('/platform/summary', (_, res) => {
  res.json({ ok: true, platform: 'KORUAL Super Platform', version: '0.1.0', modules: ['commerce', 'travel', 'ai-agent', 'business', 'finance', 'developer-api'], operating_model: 'cashflow -> leverage -> system -> automation -> asset -> network effect' });
});

app.post('/auth/login', async (req, res) => {
  const { username, password, ipOverride } = req.body || {};
  if (!username || !password) return res.status(400).json({ ok: false, error: 'MISSING_CREDENTIALS' });
  const db = await initDb();
  const ip = ipOverride || getClientIp(req);
  const ua = req.headers['user-agent'] || null;
  const { rows } = await db.query(`SELECT id, username, pw_hash, full_name, email, role, display_name, mfa_enabled, last_login_at, last_ip, fail_count, locked_until, active FROM users WHERE username = $1 LIMIT 1`, [username]);
  if (rows.length === 0) { await auditLogin({ username, userId: null, success: false, ip, userAgent: ua, reason: 'NO_USER' }); return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' }); }
  const u = rows[0];
  if (!u.active) { await auditLogin({ username, userId: u.id, success: false, ip, userAgent: ua, reason: 'INACTIVE' }); return res.status(403).json({ ok: false, error: 'INACTIVE_USER' }); }
  if (u.locked_until && new Date(u.locked_until).getTime() > Date.now()) { await auditLogin({ username, userId: u.id, success: false, ip, userAgent: ua, reason: 'LOCKED' }); return res.status(423).json({ ok: false, error: 'LOCKED', locked_until: u.locked_until }); }
  const ok = sha256Hex(password) === u.pw_hash;
  if (!ok) {
    const newFail = (u.fail_count || 0) + 1;
    const lockedUntil = newFail >= MAX_FAIL ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString() : null;
    await db.query(`UPDATE users SET fail_count = $1, locked_until = COALESCE($2::timestamptz, locked_until) WHERE id = $3`, [newFail, lockedUntil, u.id]);
    await auditLogin({ username, userId: u.id, success: false, ip, userAgent: ua, reason: 'WRONG_PW' });
    return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS', fail_count: newFail, locked_until: lockedUntil });
  }
  await db.query(`UPDATE users SET last_login_at = now(), last_ip = $1::inet, fail_count = 0, locked_until = NULL WHERE id = $2`, [ip, u.id]);
  await auditLogin({ username, userId: u.id, success: true, ip, userAgent: ua, reason: 'OK' });
  const token = signToken({ sub: u.id, username: u.username, role: u.role, display_name: u.display_name || u.full_name || u.username });
  setAuthCookie(res, token);
  return res.json({ ok: true, user: { id: u.id, username: u.username, role: u.role, display_name: u.display_name || u.full_name || u.username } });
});

app.get('/auth/whoami', requireAuth, async (req, res) => {
  const db = await initDb();
  const { rows } = await db.query(`SELECT id, username, full_name, email, role, display_name, mfa_enabled, active, last_login_at, last_ip FROM users WHERE id = $1 LIMIT 1`, [req.user.sub]);
  if (rows.length === 0) return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' });
  const u = rows[0];
  return res.json({ ok: true, user: { id: u.id, username: u.username, role: u.role, display_name: u.display_name || u.full_name || u.username, mfa_enabled: u.mfa_enabled, active: u.active, last_login_at: u.last_login_at, last_ip: u.last_ip } });
});

app.post('/auth/logout', (req, res) => { clearAuthCookie(res); res.json({ ok: true }); });

app.get('/admin/users', requireAuth, requireAdmin, async (req, res) => {
  const db = await initDb();
  const { rows } = await db.query(`SELECT id, username, full_name, email, role, display_name, active, fail_count, locked_until, last_login_at, last_ip, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT 200`);
  res.json({ ok: true, users: rows });
});

app.post('/admin/users/unlock', requireAuth, requireAdmin, async (req, res) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ ok: false, error: 'MISSING_USERNAME' });
  const db = await initDb();
  await db.query(`UPDATE users SET fail_count = 0, locked_until = NULL WHERE username = $1`, [username]);
  const ip = getClientIp(req);
  await db.query(`INSERT INTO admin_actions (actor_username, action, target_username, meta, ip) VALUES ($1, $2, $3, $4::jsonb, $5::inet)`, [req.user.username, 'UNLOCK_USER', username, JSON.stringify({}), ip]);
  res.json({ ok: true });
});

app.post('/admin/users/set-role', requireAuth, requireAdmin, async (req, res) => {
  const { username, role } = req.body || {};
  if (!username || !role) return res.status(400).json({ ok: false, error: 'MISSING_PARAMS' });
  const db = await initDb();
  await db.query(`UPDATE users SET role = $1 WHERE username = $2`, [role, username]);
  const ip = getClientIp(req);
  await db.query(`INSERT INTO admin_actions (actor_username, action, target_username, meta, ip) VALUES ($1, $2, $3, $4::jsonb, $5::inet)`, [req.user.username, 'SET_ROLE', username, JSON.stringify({ role }), ip]);
  res.json({ ok: true });
});

app.post('/admin/users/set-active', requireAuth, requireAdmin, async (req, res) => {
  const { username, active } = req.body || {};
  if (!username || typeof active !== 'boolean') return res.status(400).json({ ok: false, error: 'MISSING_PARAMS' });
  const db = await initDb();
  await db.query(`UPDATE users SET active = $1 WHERE username = $2`, [active, username]);
  const ip = getClientIp(req);
  await db.query(`INSERT INTO admin_actions (actor_username, action, target_username, meta, ip) VALUES ($1, $2, $3, $4::jsonb, $5::inet)`, [req.user.username, 'SET_ACTIVE', username, JSON.stringify({ active }), ip]);
  res.json({ ok: true });
});

// Vercel handles the HTTP lifecycle. Keep app.listen only for local execution.
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`KORUAL Control Center running on :${PORT}`));
}

export default app;
