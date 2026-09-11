const VERSION = 1;
const KEY = 'korual_quote_requests_v1';

function safeParse(value) {
  try { return JSON.parse(value); } catch { return []; }
}

export function normalizeQuoteRequest(input = {}) {
  return {
    version: VERSION,
    id: input.id || `qr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    serviceId: String(input.serviceId || '').trim(),
    region: String(input.region || '').trim(),
    desiredDate: input.desiredDate || null,
    propertySize: Number(input.propertySize) || 0,
    conditions: Array.isArray(input.conditions) ? input.conditions.map(String).slice(0, 20) : [],
    createdAt: input.createdAt || new Date().toISOString(),
    status: input.status || 'requested',
  };
}

export function validateQuoteRequest(request = {}) {
  const errors = [];
  if (!request.serviceId) errors.push('SERVICE_REQUIRED');
  if (!request.region) errors.push('REGION_REQUIRED');
  if (request.propertySize < 0) errors.push('INVALID_PROPERTY_SIZE');
  return { valid: errors.length === 0, errors };
}

export function loadQuoteRequests(storage = globalThis.localStorage) {
  if (!storage) return [];
  const parsed = safeParse(storage.getItem(KEY) || '[]');
  return Array.isArray(parsed) ? parsed.filter((item) => item && item.version === VERSION) : [];
}

export function saveQuoteRequest(input, storage = globalThis.localStorage) {
  const request = normalizeQuoteRequest(input);
  const validation = validateQuoteRequest(request);
  if (!validation.valid) throw new Error(validation.errors.join(','));
  const requests = loadQuoteRequests(storage).filter((item) => item.id !== request.id);
  requests.unshift(request);
  storage?.setItem(KEY, JSON.stringify(requests.slice(0, 100)));
  return request;
}

export const quoteRequestStorage = { KEY, VERSION };
