import { timingSafeEqual } from 'node:crypto';

const UPSTREAM_TIMEOUT_MS = 15_000;
const MAX_PAYLOAD_BYTES = 32 * 1024;
const MIN_INTERNAL_TOKEN_BYTES = 32;
const ALLOWED_ACTIONS = new Set([
  'ping', 'summary', 'syncProducts', 'syncOrders', 'syncShipping', 'dailyReport',
  'listRecords', 'createRecord', 'updateRecord', 'deleteRecord',
]);

function getConfig() {
  const url = process.env.KORUAL_GAS_URL;
  const secret = process.env.KORUAL_GAS_SECRET;
  if (!url || !secret) throw new Error('KORUAL_UPSTREAM_NOT_CONFIGURED');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'script.google.com') {
    throw new Error('KORUAL_UPSTREAM_INVALID');
  }
  return { url: parsed, secret };
}

function normalizeAction(value) {
  const action = typeof value === 'string' ? value.trim() : '';
  return ALLOWED_ACTIONS.has(action) ? action : null;
}

function authorizedInternalRequest(req, token = process.env.KORUAL_INTERNAL_API_TOKEN) {
  if (typeof token !== 'string' || Buffer.byteLength(token, 'utf8') < MIN_INTERNAL_TOKEN_BYTES) return false;
  const auth = req.headers?.authorization;
  const bearer = typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!bearer) return false;
  const actual = Buffer.from(bearer, 'utf8');
  const expected = Buffer.from(token, 'utf8');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function readJson(response) {
  const text = await response.text();
  try { return JSON.parse(text); }
  catch { return { ok: false, error: 'BAD_UPSTREAM_RESPONSE' }; }
}

export default async function handler(req, res) {
  res.setHeader?.('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });

  // A public liveness probe must not reveal operational data.
  if (req.method === 'GET') {
    if (req.query?.action !== 'ping') return res.status(405).json({ ok: false, error: 'POST_REQUIRED' });
    return res.status(200).json({ ok: true, service: 'korual-automation-gateway' });
  }

  const action = normalizeAction(req.body?.action);
  if (!action) return res.status(400).json({ ok: false, error: 'UNSUPPORTED_ACTION' });

  // Operational reads and mutations are service-to-service only. Never
  // distribute the internal token to a Vite bundle or unauthenticated browser.
  const configuredToken = process.env.KORUAL_INTERNAL_API_TOKEN;
  if (typeof configuredToken !== 'string' || Buffer.byteLength(configuredToken, 'utf8') < MIN_INTERNAL_TOKEN_BYTES) {
    return res.status(503).json({ ok: false, error: 'INTERNAL_AUTH_NOT_CONFIGURED' });
  }
  if (!authorizedInternalRequest(req, configuredToken)) return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });

  const payload = req.body?.payload ?? {};
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return res.status(400).json({ ok: false, error: 'INVALID_PAYLOAD' });
  }
  if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > MAX_PAYLOAD_BYTES) {
    return res.status(413).json({ ok: false, error: 'PAYLOAD_TOO_LARGE' });
  }

  try {
    const { url, secret } = getConfig();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    url.searchParams.set('action', action);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, secret, payload }),
      redirect: 'follow',
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
    const data = await readJson(response);
    return res.status(response.ok && data?.ok !== false ? 200 : 502).json(data);
  } catch (error) {
    const code = error?.message === 'KORUAL_UPSTREAM_NOT_CONFIGURED' || error?.message === 'KORUAL_UPSTREAM_INVALID'
      ? error.message : 'UPSTREAM_REQUEST_FAILED';
    return res.status(code === 'KORUAL_UPSTREAM_NOT_CONFIGURED' ? 503 : 502).json({ ok: false, error: code });
  }
}

export { ALLOWED_ACTIONS, normalizeAction, authorizedInternalRequest };
