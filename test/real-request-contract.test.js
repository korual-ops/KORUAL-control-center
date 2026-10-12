import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';

test('Customer PWA packages dedicated real-quote UI assets',async()=>{
 const [html,build,js]=await Promise.all([
  readFile('platform/index.html','utf8'),
  readFile('platform/build.mjs','utf8'),
  readFile('platform/real-requests.js','utf8')
 ]);
 assert.match(html,/realQuoteRequestForm/);
 assert.match(html,/real-requests\.js/);
 assert.match(html,/real-requests\.css/);
 assert.match(build,/'real-requests\.js'/);
 assert.match(build,/'real-requests\.css'/);
 assert.match(html,/privacy_consent/);
 assert.match(js,/real_market_ready/);
 assert.match(js,/NO_VERIFIED_SUPPLY/);
 assert.match(js,/sessionStorage\.setItem\(REQUEST_KEY/);
 assert.doesNotMatch(js,/localStorage\.setItem/);
 assert.doesNotThrow(()=>new Script(js));
});
test('real request Edge actions fit length cap, use owner-scoped reads and reject demo supply',async()=>{
 const edge=await readFile('platform/supabase/functions/korual-public-api/index.ts','utf8');
 for(const action of ['real_market_ready','submit_real_request','real_quote_status']){
  assert.ok(action.length<=24,action);
  assert.ok(edge.includes('action === "'+action+'"'),action);
 }
 assert.match(edge,/if \(customer\.privacy_consent !== true\)/);
 assert.match(edge,/\.eq\("session_id",sessionId\)/);
 assert.match(edge,/\.eq\("is_demo",false\)/);
 assert.match(edge,/NO_VERIFIED_SUPPLY/);
 assert.match(edge,/WAITING_FOR_REAL_PROVIDER_QUOTES/);
});
test('admin and business intake guardrails are present without permission auto-grant',async()=>{
 const [source,migration]=await Promise.all([
  readFile('shared/app-api.js','utf8'),
  readFile('platform/db/migrations/20261013_partner_applications.sql','utf8')
 ]);
 assert.match(source,/validatePartnerApplication/);
 assert.match(source,/isReviewTransitionAllowed/);
 assert.match(source,/verification_granted:false/);
 assert.match(migration,/ENABLE ROW LEVEL SECURITY/);
 assert.match(migration,/REVOKE ALL ON public\.partner_applications/);
});
