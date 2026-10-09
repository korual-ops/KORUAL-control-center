/* KORUAL quote provenance and booking-request safety, browser + Node VM compatible. */
(function (global) {
  'use strict';
  const BASIS_ESTIMATE = new Set(['database_benchmark_profiles', 'code_fallback', 'benchmark', 'estimated', 'estimate']);
  const present = x => x !== undefined && x !== null && !(typeof x === 'string' && !x.trim());
  function money(value) {
    if (!present(value) || typeof value === 'boolean') return null;
    const n = Number(value);
    return Number.isSafeInteger(n) && n >= 0 ? n : null;
  }
  function timestamp(value) {
    if (!present(value)) return null;
    const n = typeof value === 'number' ? value : Date.parse(String(value));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  function evaluate(quote, context = {}) {
    const q = quote && typeof quote === 'object' ? quote : {};
    const now = Number.isFinite(context.now) ? context.now : Date.now();
    const receivedAt = Number.isFinite(context.receivedAt) ? context.receivedAt : now;
    const flags = [];
    const add = code => { if (!flags.includes(code)) flags.push(code); };
    const amount = money(q.total_amount ?? q.amount ?? q.quotedPrice);
    if (amount === null || amount <= 0) add('INVALID_AMOUNT');
    const items = Array.isArray(q.line_items) ? q.line_items : [];
    if (items.length) {
      const values = items.map(item => money(item && item.amount));
      if (values.some(x => x === null) || values.reduce((a, b) => a + (b || 0), 0) !== money(q.amount ?? q.total_amount)) {
        add('LINE_ITEMS_MISMATCH');
      }
    }
    const mandatoryFees = money(q.mandatory_fees);
    const base = money(q.base_amount);
    if (present(q.mandatory_fees) && mandatoryFees === null) add('INVALID_FEES');
    if (present(q.base_amount) && base === null) add('INVALID_BASE');
    if (base !== null && mandatoryFees !== null && amount !== base + mandatoryFees) add('FEE_TOTAL_MISMATCH');
    if (q.demo === true || q.is_demo === true) add('DEMO');
    const basis = String(q.pricing_basis ?? context.pricingBasis ?? '').toLowerCase();
    const source = String(q.source_type ?? '').toLowerCase();
    const providerConfirmed = source === 'provider_confirmed' &&
      Boolean(timestamp(q.provider_confirmed_at ?? q.confirmed_at));
    const kind = flags.includes('DEMO') ? 'sample' : providerConfirmed ? 'confirmed' :
      (BASIS_ESTIMATE.has(basis) || source === 'estimate' || !providerConfirmed) ? 'estimate' : 'unknown';
    if (kind === 'estimate') add('ESTIMATED_NOT_FINAL');
    const explicitExpiry = timestamp(q.valid_until ?? q.expires_at);
    const ttl = money(context.ttlSeconds);
    const ttlExpiry = ttl !== null ? receivedAt + ttl * 1000 : null;
    // Trust the shortest available limit, not an unbounded cached price.
    const expiresAt = [explicitExpiry, ttlExpiry].filter(Number.isFinite).reduce((a,b) => Math.min(a,b), Infinity);
    const expiration = Number.isFinite(expiresAt) ? expiresAt : null;
    if (expiration !== null && expiration <= now) add('EXPIRED');
    if (q.verified !== true) add('UNVERIFIED_PROVIDER');
    if (typeof q.quote_token !== 'string' || !q.quote_token.trim()) add('TOKEN_MISSING');
    if (context.desiredDate && q.availability?.status !== 'available') add('DATE_NOT_CONFIRMED');
    if (!items.length && !present(q.mandatory_fees)) add('FEES_NOT_ITEMIZED');
    const block = ['INVALID_AMOUNT', 'LINE_ITEMS_MISMATCH', 'INVALID_FEES', 'INVALID_BASE',
      'FEE_TOTAL_MISMATCH', 'DEMO', 'EXPIRED', 'UNVERIFIED_PROVIDER', 'TOKEN_MISSING', 'DATE_NOT_CONFIRMED'];
    const requestable = !flags.some(f => block.includes(f));
    const paymentReady = requestable && kind === 'confirmed' &&
      !flags.includes('FEES_NOT_ITEMIZED') && Boolean(q.cancellation_policy);
    return {
      amount, kind, flags, requestable, paymentReady, expiresAt: expiration,
      label: kind === 'sample' ? '예시 · 예약 불가' : kind === 'confirmed' ? '업체 확인 견적' : '서버 계산 예상가',
      disclaimer: kind === 'confirmed'
        ? '서비스 범위와 취소 조건을 확인한 후 진행하세요.'
        : '업체가 최종 확정한 가격이 아닙니다. 추가 비용·서비스 범위는 예약 전 확인이 필요합니다.'
    };
  }
  function validateUnique(quotes, context = {}) {
    const seen = new Set();
    return (Array.isArray(quotes) ? quotes : []).filter(q => {
      const key = typeof q?.provider_key === 'string' ? q.provider_key.trim() : '';
      if (!key || seen.has(key)) return false;
      const assessed = evaluate(q, context);
      if (assessed.flags.some(f => ['INVALID_AMOUNT', 'LINE_ITEMS_MISMATCH',
        'INVALID_FEES', 'INVALID_BASE', 'FEE_TOTAL_MISMATCH', 'EXPIRED'].includes(f))) return false;
      seen.add(key);
      return true;
    });
  }
  global.KorualQuoteTrust = Object.freeze({ evaluate, validateUnique });
})(typeof window === 'object' ? window : globalThis);
