const API_BASE = import.meta.env.VITE_KORUAL_API_BASE_URL || '';

async function request(path, options) {
  const response = await fetch(`${API_BASE}${path}`, options);
  const data = await response.json().catch(() => ({ ok: false, error: 'INVALID_RESPONSE' }));
  if (!response.ok) throw new Error(data.error || `HTTP_${response.status}`);
  return data;
}

export function getPlatformHealth() { return request('/api/health'); }
export function runKorualAction(action, payload = {}) {
  return request('/api/korual', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, payload }) });
}
