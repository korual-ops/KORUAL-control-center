import 'dotenv/config';
import crypto from 'crypto';
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json({ limit: '256kb' }));

const PORT = Number(process.env.PORT || 8080);
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const KORUAL_CLOUD_API_KEY = process.env.KORUAL_CLOUD_API_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !KORUAL_CLOUD_API_KEY) {
  throw new Error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or KORUAL_CLOUD_API_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

function json(res, status, body) {
  res.status(status)
    .set('cache-control', 'no-store')
    .set('x-content-type-options', 'nosniff')
    .json(body);
}

function safeEqual(a, b) {
  const aa = Buffer.from(a || '');
  const bb = Buffer.from(b || '');
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function requireCloudKey(req, res, next) {
  const supplied = req.get('x-korual-cloud-key') || '';
  if (!safeEqual(supplied, KORUAL_CLOUD_API_KEY)) {
    return json(res, 401, { ok: false, error: 'UNAUTHORIZED' });
  }
  next();
}

app.get('/health', (_req, res) => {
  json(res, 200, { ok: true, service: 'KORUAL Cloud Gateway', version: '0.1.0' });
});

app.get('/v1/status', requireCloudKey, async (_req, res) => {
  const [services, queued, failed, automations] = await Promise.all([
    supabase
      .from('cloud_service_health')
      .select('service_key,service_type,status,latency_ms,last_checked_at,last_success_at,last_error')
      .order('service_key'),
    supabase.from('cloud_events').select('id', { count: 'exact', head: true }).eq('status', 'queued'),
    supabase.from('cloud_events').select('id', { count: 'exact', head: true }).in('status', ['failed', 'dead_letter']),
    supabase.from('automation_runs').select('id', { count: 'exact', head: true }).in('status', ['queued', 'running'])
  ]);

  if (services.error) {
    return json(res, 503, { ok: false, error: 'CLOUD_STATUS_UNAVAILABLE' });
  }

  const rows = services.data || [];
  const overall = rows.some((s) => s.status === 'down')
    ? 'down'
    : rows.some((s) => s.status === 'degraded')
      ? 'degraded'
      : 'healthy';

  return json(res, 200, {
    ok: true,
    cloud: 'KORUAL Cloud Core',
    region: 'ap-northeast-1',
    overall,
    queues: {
      cloud_events_queued: queued.count || 0,
      cloud_events_failed: failed.count || 0,
      automations_active: automations.count || 0
    },
    services: rows,
    generated_at: new Date().toISOString()
  });
});

app.post('/v1/events', requireCloudKey, async (req, res) => {
  const {
    event_type,
    source,
    aggregate_type = null,
    aggregate_id = null,
    payload = {},
    correlation_id = null,
    available_at = null
  } = req.body || {};

  if (typeof event_type !== 'string' || !event_type.trim()) {
    return json(res, 400, { ok: false, error: 'EVENT_TYPE_REQUIRED' });
  }
  if (typeof source !== 'string' || !source.trim()) {
    return json(res, 400, { ok: false, error: 'SOURCE_REQUIRED' });
  }
  if (payload === null || Array.isArray(payload) || typeof payload !== 'object') {
    return json(res, 400, { ok: false, error: 'PAYLOAD_MUST_BE_OBJECT' });
  }

  const record = {
    event_type: event_type.trim(),
    source: source.trim(),
    aggregate_type,
    aggregate_id,
    payload,
    correlation_id
  };
  if (available_at) record.available_at = available_at;

  const { data, error } = await supabase
    .from('cloud_events')
    .insert(record)
    .select('event_id,event_type,status,available_at,created_at')
    .single();

  if (error) {
    return json(res, 500, { ok: false, error: 'EVENT_ENQUEUE_FAILED' });
  }

  return json(res, 202, { ok: true, event: data });
});

app.use((_req, res) => json(res, 404, { ok: false, error: 'NOT_FOUND' }));
app.use((err, _req, res, _next) => {
  console.error('KORUAL Cloud Gateway error', err);
  json(res, 500, { ok: false, error: 'INTERNAL_ERROR' });
});

app.listen(PORT, () => {
  console.log(`KORUAL Cloud Gateway running on :${PORT}`);
});
