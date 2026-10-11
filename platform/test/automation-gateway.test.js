import assert from 'node:assert/strict';
import test from 'node:test';
import handler, { authorizedInternalRequest, normalizeAction } from '../api/korual.js';

const TOKEN = 'b63d7e5c597ec2b4da3071b3a580b4ff3e8a4e1e';
function mockResponse() {
  return {
    code: 200, body: null, headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    status(value) { this.code = value; return this; },
    json(value) { this.body = value; return this; },
  };
}
async function invoke(req) {
  const res = mockResponse();
  await handler(req, res);
  return res;
}

test('public endpoint only offers minimal GET ping', async () => {
  const ping = await invoke({ method: 'GET', query: { action: 'ping' } });
  assert.equal(ping.code, 200);
  assert.deepEqual(ping.body, { ok: true, service: 'korual-automation-gateway' });
  const blocked = await invoke({ method: 'GET', query: { action: 'deleteRecord' } });
  assert.equal(blocked.code, 405);
});

test('internal API bearer must be configured, long, and timing-safe', () => {
  assert.equal(authorizedInternalRequest({ headers: { authorization: 'Bearer ' + TOKEN } }, TOKEN), true);
  assert.equal(authorizedInternalRequest({ headers: { authorization: 'Bearer ' + TOKEN.slice(0, -1) + '0' } }, TOKEN), false);
  assert.equal(authorizedInternalRequest({ headers: {} }, TOKEN), false);
  assert.equal(authorizedInternalRequest({ headers: { authorization: 'Bearer short' } }, 'short'), false);
});

test('all sensitive reads and writes deny public callers', async () => {
  const previous = process.env.KORUAL_INTERNAL_API_TOKEN;
  try {
    process.env.KORUAL_INTERNAL_API_TOKEN = TOKEN;
    for (const action of ['summary', 'syncProducts', 'listRecords', 'createRecord', 'updateRecord', 'deleteRecord']) {
      const result = await invoke({ method: 'POST', headers: {}, body: { action, payload: {} } });
      assert.equal(result.code, 401, action);
    }
  } finally {
    if (previous === undefined) delete process.env.KORUAL_INTERNAL_API_TOKEN;
    else process.env.KORUAL_INTERNAL_API_TOKEN = previous;
  }
});

test('unknown action is rejected before forwarding upstream', async () => {
  const res = await invoke({ method: 'POST', headers: {}, body: { action: 'deleteAll' } });
  assert.equal(normalizeAction('deleteAll'), null);
  assert.equal(res.code, 400);
});

test('authorized request forwards only supported action with server-held GAS secret', async () => {
  const old = {
    token: process.env.KORUAL_INTERNAL_API_TOKEN,
    url: process.env.KORUAL_GAS_URL,
    secret: process.env.KORUAL_GAS_SECRET,
    fetch: globalThis.fetch,
  };
  try {
    process.env.KORUAL_INTERNAL_API_TOKEN = TOKEN;
    process.env.KORUAL_GAS_URL = 'https://script.google.com/macros/s/REPLACE/exec';
    process.env.KORUAL_GAS_SECRET = 'backend-only-secret';
    let sent = null;
    globalThis.fetch = async (url, options) => {
      sent = { url: String(url), method: options.method, data: JSON.parse(options.body) };
      return { ok: true, text: async () => JSON.stringify({ ok: true, action: 'syncProducts' }) };
    };
    const req = { method: 'POST', headers: { authorization: 'Bearer ' + TOKEN }, body: { action: 'syncProducts', payload: { entity: 'Products' } } };
    const res = await invoke(req);
    assert.equal(res.code, 200);
    assert.equal(sent.method, 'POST');
    assert.equal(sent.data.secret, 'backend-only-secret');
    assert.equal(sent.data.action, 'syncProducts');
    assert.equal(JSON.stringify(res.body).includes('backend-only-secret'), false);
    const bad = await invoke({ ...req, body: { action: 'syncProducts', payload: 'invalid' } });
    assert.equal(bad.code, 400);
  } finally {
    for (const [key, value] of [['KORUAL_INTERNAL_API_TOKEN', old.token], ['KORUAL_GAS_URL', old.url], ['KORUAL_GAS_SECRET', old.secret]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    globalThis.fetch = old.fetch;
  }
});
