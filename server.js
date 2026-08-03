import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { PostHog } from 'posthog-node';

const app = express();
const currentDir = path.dirname(fileURLToPath(import.meta.url));
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(express.static('public'));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('ORIGIN_NOT_ALLOWED'));
  },
  credentials: true,
}));

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const posthog = process.env.POSTHOG_API_KEY
  ? new PostHog(process.env.POSTHOG_API_KEY, {
      host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    })
  : null;

if (!supabaseUrl || !publishableKey || !secretKey) {
  console.warn('Supabase environment variables are incomplete.');
}

const authClient = supabaseUrl && publishableKey
  ? createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

const adminClient = supabaseUrl && secretKey
  ? createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  return typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip || null;
}

function setSessionCookies(res, session) {
  const secure = process.env.NODE_ENV === 'production';
  const common = { httpOnly: true, secure, sameSite: 'lax', path: '/' };
  res.cookie('korual_access_token', session.access_token, {
    ...common,
    maxAge: Math.max(60, session.expires_in || 3600) * 1000,
  });
  res.cookie('korual_refresh_token', session.refresh_token, {
    ...common,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

function clearSessionCookies(res) {
  res.clearCookie('korual_access_token', { path: '/' });
  res.clearCookie('korual_refresh_token', { path: '/' });
}

async function auditLogin(req, fields) {
  if (!adminClient) return;
  await adminClient.from('login_audit_logs').insert({
    user_id: fields.userId || null,
    email: fields.email || null,
    success: Boolean(fields.success),
    ip: clientIp(req),
    user_agent: req.headers['user-agent'] || null,
    reason: fields.reason || null,
  });
}

async function captureEvent(distinctId, event, properties = {}) {
  if (!posthog) return;
  posthog.capture({ distinctId, event, properties });
  await posthog.flush();
}

async function syncHubSpotContact(profile) {
  if (!process.env.HUBSPOT_ACCESS_TOKEN || !profile?.email) return { skipped: true };

  const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: [{
        idProperty: 'email',
        id: profile.email,
        properties: {
          email: profile.email,
          firstname: profile.display_name || profile.email,
        },
      }],
    }),
  });

  if (!response.ok) throw new Error(`HUBSPOT_SYNC_FAILED_${response.status}`);
  return { skipped: false };
}

async function requireAuth(req, res, next) {
  if (!authClient || !adminClient) {
    return res.status(503).json({ ok: false, error: 'SUPABASE_NOT_CONFIGURED' });
  }

  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  const token = bearer || req.cookies.korual_access_token;

  if (!token) return res.status(401).json({ ok: false, error: 'UNAUTHENTICATED' });

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ ok: false, error: 'INVALID_TOKEN' });
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id,email,display_name,role,active,last_login_at')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile?.active) {
    return res.status(403).json({ ok: false, error: 'INACTIVE_OR_MISSING_PROFILE' });
  }

  req.user = data.user;
  req.profile = profile;
  return next();
}

function requireAdmin(req, res, next) {
  if (req.profile?.role !== 'ADMIN') {
    return res.status(403).json({ ok: false, error: 'ADMIN_ONLY' });
  }
  return next();
}

app.get('/', (_req, res) => {
  res.sendFile(path.join(currentDir, 'public', 'index.html'));
});

app.get('/health', async (_req, res) => {
  const configured = Boolean(authClient && adminClient);
  res.status(configured ? 200 : 503).json({
    ok: configured,
    service: 'KORUAL Control Center',
    version: '0.2.0',
    integrations: {
      supabase: configured ? 'connected' : 'missing_env',
      posthog: process.env.POSTHOG_API_KEY ? 'configured' : 'optional',
      hubspot: process.env.HUBSPOT_ACCESS_TOKEN ? 'configured' : 'optional',
    },
  });
});

app.get('/platform/summary', (_req, res) => {
  res.json({
    ok: true,
    platform: 'KORUAL Super Platform',
    version: '0.2.0',
    modules: ['commerce', 'travel', 'ai-agent', 'business', 'finance', 'developer-api'],
    operating_model: 'cashflow -> leverage -> system -> automation -> asset -> network effect',
  });
});

app.post('/auth/login', async (req, res) => {
  if (!authClient || !adminClient) {
    return res.status(503).json({ ok: false, error: 'SUPABASE_NOT_CONFIGURED' });
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'MISSING_CREDENTIALS' });
  }

  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    await auditLogin(req, { email, success: false, reason: 'INVALID_CREDENTIALS' });
    return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' });
  }

  const { data: profile } = await adminClient
    .from('profiles')
    .select('id,email,display_name,role,active')
    .eq('id', data.user.id)
    .single();

  if (!profile?.active) {
    await auditLogin(req, { userId: data.user.id, email, success: false, reason: 'INACTIVE' });
    return res.status(403).json({ ok: false, error: 'INACTIVE_USER' });
  }

  await adminClient.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', data.user.id);
  await auditLogin(req, { userId: data.user.id, email, success: true, reason: 'OK' });
  await captureEvent(data.user.id, 'user_logged_in', { role: profile.role });
  setSessionCookies(res, data.session);

  return res.json({ ok: true, user: profile });
});

app.post('/auth/refresh', async (req, res) => {
  if (!authClient) return res.status(503).json({ ok: false, error: 'SUPABASE_NOT_CONFIGURED' });
  const refreshToken = req.cookies.korual_refresh_token;
  if (!refreshToken) return res.status(401).json({ ok: false, error: 'NO_REFRESH_TOKEN' });

  const { data, error } = await authClient.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) {
    clearSessionCookies(res);
    return res.status(401).json({ ok: false, error: 'REFRESH_FAILED' });
  }

  setSessionCookies(res, data.session);
  return res.json({ ok: true });
});

app.get('/auth/whoami', requireAuth, (req, res) => {
  res.json({ ok: true, user: req.profile });
});

app.post('/auth/logout', async (req, res) => {
  const token = req.cookies.korual_access_token;
  if (authClient && token) await authClient.auth.admin?.signOut?.(token).catch(() => {});
  clearSessionCookies(res);
  res.json({ ok: true });
});

app.get('/admin/users', requireAuth, requireAdmin, async (_req, res) => {
  const { data, error } = await adminClient
    .from('profiles')
    .select('id,email,display_name,role,active,last_login_at,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return res.status(500).json({ ok: false, error: 'QUERY_FAILED' });
  return res.json({ ok: true, users: data });
});

app.patch('/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const changes = {};
  if (['ADMIN', 'MANAGER', 'GUEST'].includes(req.body?.role)) changes.role = req.body.role;
  if (typeof req.body?.active === 'boolean') changes.active = req.body.active;
  if (Object.keys(changes).length === 0) {
    return res.status(400).json({ ok: false, error: 'NO_VALID_CHANGES' });
  }

  const { error } = await adminClient.from('profiles').update(changes).eq('id', req.params.id);
  if (error) return res.status(500).json({ ok: false, error: 'UPDATE_FAILED' });

  await adminClient.from('admin_actions').insert({
    actor_user_id: req.user.id,
    action: 'UPDATE_USER',
    target_user_id: req.params.id,
    meta: changes,
    ip: clientIp(req),
  });

  return res.json({ ok: true });
});

app.get('/integrations', requireAuth, requireAdmin, async (_req, res) => {
  const { data, error } = await adminClient
    .from('integration_connections')
    .select('id,provider,status,external_account_ref,capabilities,last_healthcheck_at,metadata,updated_at')
    .order('provider');

  if (error) return res.status(500).json({ ok: false, error: 'QUERY_FAILED' });
  return res.json({ ok: true, integrations: data });
});

app.post('/integrations/hubspot/sync-me', requireAuth, async (req, res) => {
  try {
    const result = await syncHubSpotContact(req.profile);
    await captureEvent(req.user.id, 'hubspot_contact_synced', result);
    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(502).json({ ok: false, error: error.message });
  }
});

export default app;

if (!process.env.VERCEL) {
  const port = Number(process.env.PORT || 8080);
  app.listen(port, () => console.log(`KORUAL Control Center running on :${port}`));
}
