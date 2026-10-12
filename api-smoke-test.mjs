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

test('partner and admin APIs reject anonymous access',async()=>{
  for (const path of ['/api/partner/me','/api/partner/leads?provider_id=11111111-1111-4111-8111-111111111111','/api/operations/overview']) {
    const res=await request(path);
    assert.equal(res.status,401,path);
    assert.equal(res.body.error,'UNAUTHENTICATED');
  }
});
test('quote mutations reject anonymous access before touching DB',async()=>{
  const res=await request('/api/partner/quotes',{
    method:'POST',
    headers:{'content-type':'application/json','x-korual-app':'partner'},
    body:JSON.stringify({provider_id:'11111111-1111-4111-8111-111111111111',request_id:'22222222-2222-4222-8222-222222222222',amount:55000,message:'견적 내역'})
  });
  assert.equal(res.status,401);
});

test('public partner application rejects missing same-origin proof before DB access',async()=>{
  const result=await request('/api/partner/applications',{
    method:'POST',headers:{'content-type':'application/json','x-korual-app':'partner'},
    body:JSON.stringify({company_name:'Test Company',contact_email:'test@example.com',service_category:'입주청소',region:'인천',privacy_consent:true,terms_acknowledged:true})
  });
  assert.equal(result.status,403);
  assert.equal(result.body.error,'ORIGIN_REQUIRED');
});
test('public partner application validates consent before database write',async()=>{
  const result=await request('/api/partner/applications',{
    method:'POST',headers:{'content-type':'application/json','x-korual-app':'partner',origin:'http://127.0.0.1'},
    body:JSON.stringify({company_name:'Test Company',contact_email:'test@example.com',service_category:'입주청소',region:'인천',privacy_consent:false,terms_acknowledged:true})
  });
  // Origin host includes the ephemeral port, so this request must be denied.
  assert.equal(result.status,403);
});
test('admin application review and queue refuse unauthenticated access',async()=>{
  const reviewId='11111111-1111-4111-8111-111111111111';
  for(const path of ['/api/operations/applications','/api/operations/applications/'+reviewId+'/review']){
    const result=await request(path);
    assert.equal(result.status,401,path);
  }
});
