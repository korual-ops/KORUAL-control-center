import assert from 'node:assert/strict';
import test from 'node:test';

process.env.VERCEL = '1';
process.env.JWT_SECRET = 'test-only-secret';

const { default: app } = await import('./server.js');

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address();
      fetch(`http://127.0.0.1:${address.port}${path}`, options)
        .then(async (res) => resolve({ status: res.status, body: await res.json() }))
        .catch(reject)
        .finally(() => server.close());
    });
    server.on('error', reject);
  });
}

test('health endpoint', async () => {
  const result = await request('/health');
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
});

test('platform summary endpoint', async () => {
  const result = await request('/platform/summary');
  assert.equal(result.status, 200);
  assert.equal(result.body.ok, true);
  assert.equal(result.body.platform, 'KORUAL Super Platform');
  assert.ok(Array.isArray(result.body.modules));
  assert.ok(result.body.modules.includes('life-services'));
});

test('service request validation rejects missing fields before database access', async () => {
  const result = await request('/service-requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ services: ['입주청소'] })
  });
  assert.equal(result.status, 400);
  assert.equal(result.body.ok, false);
  assert.equal(result.body.error, 'INVALID_REGION');
});
