// Pure business rules, independent of external providers.
export function validateLivingRequest(body, today = new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'})) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'INVALID_BODY';
  if (body.consent !== true) return 'CONSENT_REQUIRED';
  if (typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) return 'INVALID_DATE';
  const d = new Date(body.date+'T00:00:00Z');
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0,10)!==body.date || body.date<today) return 'INVALID_DATE';
  if (typeof body.name !== 'string' || typeof body.phone !== 'string' || typeof body.region !== 'string' || !Array.isArray(body.services)) return 'INVALID_BODY';
  if (body.services.some(s=>typeof s!=='string')) return 'INVALID_SERVICES';
  return null;
}
export function commissionEstimate(amount, basisPoints, variableCost=0) {
  for (const n of [amount,basisPoints,variableCost]) if (!Number.isSafeInteger(n)||n<0) throw new RangeError('Invalid integer');
  if (basisPoints>10000 || !Number.isSafeInteger(amount*basisPoints)) throw new RangeError('Invalid commission');
  const revenue=Math.floor(amount*basisPoints/10000);
  return {gmv:amount,estimatedRevenue:revenue,estimatedContribution:revenue-variableCost};
}
