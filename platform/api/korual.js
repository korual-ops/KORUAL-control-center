const UPSTREAM_TIMEOUT_MS = 15_000;
const ALLOWED_ACTIONS = new Set(['ping', 'summary', 'syncProducts', 'syncOrders', 'syncShipping', 'dailyReport']);

function getConfig() {
  const url = process.env.KORUAL_GAS_URL;
  const secret = process.env.KORUAL_GAS_SECRET;
  if (!url || !secret) throw new Error('KORUAL_UPSTREAM_NOT_CONFIGURED');
  return { url, secret };
}

function normalizeAction(value) {
  const action = typeof value === 'string' ? value.trim() : '';
  return ALLOWED_ACTIONS.has(action) ? action : null;
}

async function readJson(response) {
  const text = await response.text();
  try { return JSON.parse(text); }
  catch { return { ok: false, error: 'BAD_UPSTREAM_RESPONSE', upstreamStatus: response.status }; }
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  const action = normalizeAction(req.method === 'GET' ? req.query?.action : req.body?.action);
  if (!action) return res.status(400).json({ ok: false, error: 'UNSUPPORTED_ACTION' });

  try {
    const { url, secret } = getConfig();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    const upstreamUrl = new URL(url);
    upstreamUrl.searchParams.set('action', action);
    const response = await fetch(upstreamUrl, {
      method: req.method,
      headers: req.method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: req.method === 'POST' ? JSON.stringify({ action, secret, payload: req.body?.payload ?? {} }) : undefined,
      redirect: 'follow', signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
    const data = await readJson(response);
    return res.status(response.ok ? 200 : 502).json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PROXY_ERROR';
    return res.status(message === 'KORUAL_UPSTREAM_NOT_CONFIGURED' ? 503 : 500).json({ ok: false, error: message });
  }
}

export { ALLOWED_ACTIONS, normalizeAction };
