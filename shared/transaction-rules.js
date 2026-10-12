/**
 * Domain rules are a second layer behind the database atomic transaction.
 * All money values are KRW integers. Quotes are only valid for allocated open
 * requests; no cross-tenant access and no demo providers.
 */
const OPEN_REQUESTS = new Set(['NEW','MATCHING','QUOTED']);
const OPEN_ASSIGNMENTS = new Set(['pending','contacted','quoted']);
export const QUOTE_TTL_HOURS = 48;

export function quoteEligibility({ requestStatus, assignmentStatus, provider }) {
  if (!provider?.active || !provider?.verified || provider?.is_demo) return 'PROVIDER_NOT_VERIFIED';
  if (!OPEN_REQUESTS.has(requestStatus)) return 'REQUEST_CLOSED';
  if (!OPEN_ASSIGNMENTS.has(assignmentStatus)) return 'LEAD_NOT_ASSIGNED';
  return null;
}

export function quoteExpiresAt(now = new Date()) {
  const timestamp = now instanceof Date ? now.getTime() : NaN;
  if (!Number.isFinite(timestamp)) throw new TypeError('Invalid quote creation time');
  return new Date(timestamp + QUOTE_TTL_HOURS * 60 * 60 * 1000).toISOString();
}

export function identicalRequest(existing, requested) {
  if (!existing || !requested) return false;
  const services = a => (Array.isArray(a) ? a.map(x => String(x).trim()).sort() : []);
  const x = services(existing.services);
  const y = services(requested.services);
  return x.length === y.length
    && x.every((v, i) => v === y[i])
    && existing.region === requested.region
    && existing.desired_date === requested.desired_date
    && existing.customer_name === requested.customer_name
    && existing.phone === requested.phone;
}
