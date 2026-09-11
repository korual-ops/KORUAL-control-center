import assert from 'node:assert/strict';
import { rankQuotes } from './quoteEngine.js';

const benchmark = { minPrice: 100000, medianPrice: 150000, maxPrice: 220000 };
const providers = {
  good: { rating: 4.9, reviewCount: 180, winRate: 88, cancellationRate: 2, revisitRate: 3, verified: true },
  cheap: { rating: 4.1, reviewCount: 20, winRate: 55, cancellationRate: 12, revisitRate: 15, verified: false },
};
const quotes = [
  { providerId: 'cheap', quotedPrice: 110000, warrantyDays: 30, travelFee: 0 },
  { providerId: 'good', quotedPrice: 155000, warrantyDays: 90, travelFee: 5000 },
];

const ranked = rankQuotes(quotes, providers, benchmark);
assert.equal(ranked.length, 2);
assert.equal(ranked[0].providerId, 'good');
assert.ok(ranked[0].finalScore > ranked[1].finalScore);
assert.ok(Number.isFinite(ranked[0].benchmarkDeviationPct));
console.log('quote engine tests: ok');
