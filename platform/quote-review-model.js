// All amounts are user-entered KRW. Blank means unknown, never zero.
export const COST_FIELDS = ['base', 'extras', 'tax'];
export function parseAmount(value) {
  if (value === '' || value === null || value === undefined) return null;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (!/^\d{1,9}$/.test(String(value))) return null;
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount <= 100000000 ? amount : null;
}
export function summarizeQuote(row, budget) {
  const values = COST_FIELDS.map(key => parseAmount(row[key]));
  const unknown = values.filter(value => value === null).length;
  const known = values.reduce((sum, value) => sum + (value ?? 0), 0);
  const cap = parseAmount(budget);
  return { known, unknown, total: unknown ? null : known,
    comparable: !unknown && row.scope === true && row.cancellation === true,
    budgetState: cap === null ? 'unset' : known > cap ? 'over' : unknown ? 'unknown' : 'within',
    gap: cap === null ? null : cap - known };
}
export function normalizeReview(value) {
  const source = value && typeof value === 'object' ? value : {};
  return { version: 1, budget: parseAmount(source.budget) === null ? '' : String(source.budget),
    rows: ['A', 'B', 'C'].map((id, index) => {
      const row = Array.isArray(source.rows) ? source.rows[index] || {} : {};
      return { id, ...Object.fromEntries(COST_FIELDS.map(key => [key, parseAmount(row[key]) === null ? '' : String(row[key])])),
        scope: row.scope === true, cancellation: row.cancellation === true };
    }) };
}
