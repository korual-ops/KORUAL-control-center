const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Number(value) || 0));

export function benchmarkDeviationPct(price, medianPrice) {
  if (!(medianPrice > 0)) return 0;
  return Number((((price - medianPrice) / medianPrice) * 100).toFixed(2));
}

export function priceFitScore(price, benchmark = {}) {
  const min = Number(benchmark.minPrice) || 0;
  const median = Number(benchmark.medianPrice) || 0;
  const max = Number(benchmark.maxPrice) || 0;
  if (!(median > 0)) return 50;
  if (min > 0 && price >= min && max >= price) {
    const distance = Math.abs(price - median) / Math.max(median, 1);
    return Number(clamp(100 - distance * 100).toFixed(2));
  }
  const deviation = Math.abs(price - median) / median;
  return Number(clamp(100 - deviation * 120).toFixed(2));
}

export function providerQualityScore(provider = {}) {
  const rating = clamp((Number(provider.rating) || 0) / 5 * 100);
  const reviewConfidence = clamp(Math.log10((Number(provider.reviewCount) || 0) + 1) / 3 * 100);
  const completion = clamp(Number(provider.winRate) || 0);
  const cancellation = clamp(100 - (Number(provider.cancellationRate) || 0) * 2);
  const revisit = clamp(100 - (Number(provider.revisitRate) || 0) * 2);
  const verified = provider.verified ? 100 : 0;
  return Number((rating * 0.30 + reviewConfidence * 0.10 + completion * 0.20 + cancellation * 0.15 + revisit * 0.15 + verified * 0.10).toFixed(2));
}

export function quoteScore(quote = {}, provider = {}, benchmark = {}) {
  const price = Number(quote.quotedPrice) || 0;
  const priceFit = priceFitScore(price, benchmark);
  const quality = providerQualityScore(provider);
  const warranty = clamp((Number(quote.warrantyDays ?? provider.warrantyDays) || 0) / 30 * 100);
  const travel = clamp(100 - (Number(quote.travelFee) || 0) / Math.max(price, 1) * 100);
  const deviation = benchmarkDeviationPct(price, benchmark.medianPrice);
  const finalScore = Number((priceFit * 0.45 + quality * 0.40 + warranty * 0.10 + travel * 0.05).toFixed(2));
  return { finalScore, priceFitScore: priceFit, qualityScore: quality, warrantyScore: Number(warranty.toFixed(2)), travelScore: Number(travel.toFixed(2)), benchmarkDeviationPct: deviation };
}

export function rankQuotes(quotes = [], providersById = {}, benchmark = {}) {
  return quotes.map((quote) => {
    const provider = providersById[quote.providerId] || {};
    const scores = quoteScore(quote, provider, benchmark);
    return { ...quote, ...scores };
  }).sort((a, b) => b.finalScore - a.finalScore);
}
