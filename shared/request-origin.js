/**
 * Shared CSRF guard for same-origin PWA writes.
 * Browser Origin is required for each state-changing API operation; the
 * x-korual-app header is supplemental, NEVER sufficient authorization.
 * Host is checked against the actual request host (no forwarded-host trust).
 */
export function originFailure({ origin, host }) {
  if (typeof origin !== 'string' || !origin.trim()) return 'ORIGIN_REQUIRED';
  if (typeof host !== 'string' || !host.trim()) return 'ORIGIN_MISMATCH';
  try {
    const url = new URL(origin);
    if (!['http:', 'https:'].includes(url.protocol)) return 'ORIGIN_MISMATCH';
    if (url.host !== host || url.origin !== origin) return 'ORIGIN_MISMATCH';
    return null;
  } catch {
    return 'ORIGIN_MISMATCH';
  }
}

export function checkRequestOrigin(req) {
  return originFailure({ origin: req.get('origin'), host: req.get('host') });
}
