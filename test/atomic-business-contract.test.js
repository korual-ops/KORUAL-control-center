import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('quote persistence uses a single atomic service-role RPC and no open-loop inserts',async()=>{
 const app=await readFile('shared/app-api.js','utf8');
 const sql=await readFile('platform/db/proposals/atomic-partner-quote-v1.sql','utf8');
 assert.match(app,/db\.rpc\('submit_partner_quote_v1'/);
 assert.doesNotMatch(app,/\.from\('provider_quotes'\)\.insert\(/);
 assert.match(sql,/FOR UPDATE/);
 assert.match(sql,/FROM public\.partner_memberships/);
 assert.match(sql,/public\.profiles/);
 assert.match(sql,/provider\.is_demo = false/);
 assert.match(sql,/UPDATE public\.service_request_matches/);
 assert.match(sql,/UPDATE public\.service_requests/);
 assert.match(sql,/SECURITY INVOKER/);
 assert.match(sql,/REVOKE ALL ON FUNCTION/);
 assert.match(sql,/GRANT EXECUTE ON FUNCTION[\s\S]*TO service_role/);
});

test('assignment atomic function uses request lock, verifies actor, counts only new rows',async()=>{
 const app=await readFile('shared/app-api.js','utf8');
 const sql=await readFile('platform/db/proposals/atomic-admin-assignment-v1.sql','utf8');
 assert.match(app,/db\.rpc\('assign_partner_leads_v1'/);
 assert.doesNotMatch(app,/\.upsert\(rows/);
 assert.match(sql,/FOR UPDATE/);
 assert.match(sql,/p\.is_demo=false/);
 assert.match(sql,/role='ADMIN'/);
 assert.match(sql,/m\.role IN \('OWNER','OPERATOR'\)/);
 assert.match(sql,/ON CONFLICT\(request_id,provider_id\) DO NOTHING/);
 assert.match(sql,/v_count-v_inserted/);
 assert.match(sql,/INSERT INTO public\.admin_actions/);
 assert.match(sql,/SECURITY INVOKER/);
 assert.match(sql,/TO service_role/);
});

test('all Partner and Admin mutating operations are same-origin enforced',async()=>{
 const app=await readFile('shared/app-api.js','utf8');
 const origin=await readFile('shared/request-origin.js','utf8');
 assert.match(app,/safeOriginAndJson\(req, res, next\)/);
 assert.ok((app.match(/checkRequestOrigin\(req\)/g)||[]).length>=4);
 assert.match(origin,/if \(url\.host !== host \|\| url\.origin !== origin\)/);
 assert.match(origin,/ORIGIN_REQUIRED/);
});

test('Edge API forbids changing request payload on idempotency retry',async()=>{
 const edge=await readFile('platform/supabase/functions/korual-public-api/index.ts','utf8');
 assert.match(edge,/IDEMPOTENCY_CONFLICT/);
 assert.match(edge,/existing\.customer_name === name/);
 assert.match(edge,/existing\.phone === phone/);
 assert.match(edge,/existing\.desired_date === desiredDate/);
});

test('atomic transitions deny past service dates in Korean local time',async()=>{
 for(const sqlPath of [
  'platform/db/proposals/atomic-partner-quote-v1.sql',
  'platform/db/proposals/atomic-admin-assignment-v1.sql'
 ]){
  const sql=await readFile(sqlPath,'utf8');
  assert.match(sql,/SELECT status,desired_date INTO v_status,v_desired_date/);
  assert.match(sql,/REQUEST_DATE_PASSED/);
  assert.match(sql,/Asia\/Seoul/);
  assert.match(sql,/FOR UPDATE/);
 }
});

test('private Partner and Admin responses cannot be cached and Partner list is batched',async()=>{
 const api=await readFile('shared/app-api.js','utf8');
 assert.ok((api.match(/Cache-Control','private, no-store'/g)||[]).length>=2);
 assert.match(api,/Single provider lookup replaces up to 40 sequential N\+1 reads/);
 assert.match(api,/\.in\('id',ids\)/);
});
