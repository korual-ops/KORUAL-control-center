import assert from 'node:assert/strict';
import test from 'node:test';
import { benchmarkDeviationPct, providerQualityScore, quoteScore, rankQuotes } from '../src/lib/quoteEngine.js';

const benchmark = { minPrice: 180000, medianPrice: 210000, maxPrice: 250000 };

test('benchmark deviation is deterministic', () => {
  assert.equal(benchmarkDeviationPct(231000, 210000), 10);
  assert.equal(benchmarkDeviationPct(210000, 0), 0);
});

test('provider quality rewards verified high-performing providers', () => {
  const strong = providerQualityScore({ rating: 4.8, reviewCount: 250, winRate: 75, cancellationRate: 2, revisitRate: 3, verified: true });
  const weak = providerQualityScore({ rating: 3.2, reviewCount: 2, winRate: 20, cancellationRate: 20, revisitRate: 25, verified: false });
  assert.ok(strong > weak);
  assert.ok(strong <= 100);
});

test('quote score balances price and provider quality', () => {
  const result = quoteScore({ quotedPrice: 210000, warrantyDays: 30, travelFee: 0 }, { rating: 4.8, reviewCount: 250, winRate: 75, cancellationRate: 2, revisitRate: 3, verified: true }, benchmark);
  assert.equal(result.benchmarkDeviationPct, 0);
  assert.ok(result.finalScore > 80);
});

test('rankQuotes returns highest composite score first', () => {
  const ranked = rankQuotes([
    { providerId: 'a', quotedPrice: 210000, warrantyDays: 30 },
    { providerId: 'b', quotedPrice: 310000, warrantyDays: 0 },
  ], {
    a: { rating: 4.8, reviewCount: 250, winRate: 75, cancellationRate: 2, revisitRate: 3, verified: true },
    b: { rating: 3.5, reviewCount: 10, winRate: 30, cancellationRate: 15, revisitRate: 20, verified: false },
  }, benchmark);
  assert.equal(ranked[0].providerId, 'a');
  assert.ok(ranked[0].finalScore > ranked[1].finalScore);
});
