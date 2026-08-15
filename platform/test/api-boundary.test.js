import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { normalizeAction } from '../api/korual.js';

test('only explicit automation actions are allowed', () => {
  assert.equal(normalizeAction('syncOrders'), 'syncOrders');
  assert.equal(normalizeAction('deleteAll'), null);
  assert.equal(normalizeAction(''), null);
});

test('browser source contains no Apps Script URL or secret lookup', async () => {
  const source = await readFile(new URL('../src/lib/korualApi.js', import.meta.url), 'utf8');
  assert.equal(source.includes('script.google.com'), false);
  assert.equal(source.includes('KORUAL_GAS_SECRET'), false);
});
