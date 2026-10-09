import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source=readFileSync(new URL('../quote-trust.js', import.meta.url), 'utf8');
const sandbox=vm.createContext({});
vm.runInContext(source,sandbox,{filename:'quote-trust.js'});
const {evaluate,validateUnique}=sandbox.KorualQuoteTrust;
const NOW=1791534000000;
const baseline={
  provider_key:'provider_1',
  provider_name:'Test provider',
  amount:150000,
  line_items:[{service:'청소',amount:150000}],
  verified:true,quote_token:'signed-server-token',
  availability:{status:'available'}
};
const context={now:NOW,receivedAt:NOW,ttlSeconds:600,desiredDate:'2026-10-20',pricingBasis:'database_benchmark_profiles'};

test('real backend quote token allows request but not pretending price is provider-confirmed',()=>{
  const data=evaluate(baseline,context);
  assert.equal(data.amount,150000);
  assert.equal(data.kind,'estimate');
  assert.equal(data.requestable,true);
  assert.equal(data.paymentReady,false);
  assert.equal(data.label,'서버 계산 예상가');
});
test('demo, invalid amount and missing token are never requestable',()=>{
  for (const quote of [{...baseline,demo:true},{...baseline,amount:null},
    {...baseline,quote_token:''},{...baseline,verified:false}]) {
    assert.equal(evaluate(quote,context).requestable,false);
  }
});
test('line items must match quoted amount and fees must be internally consistent',()=>{
  assert.equal(evaluate({...baseline,line_items:[{amount:140000}]},context).requestable,false);
  assert.equal(evaluate({...baseline,base_amount:140000,mandatory_fees:10000},context).requestable,true);
  assert.equal(evaluate({...baseline,base_amount:140000,mandatory_fees:20000},context).requestable,false);
  assert.equal(evaluate({...baseline,mandatory_fees:-1000},context).requestable,false);
});
test('quote expiration is based on original reception, not each rerender',()=>{
  assert.equal(evaluate(baseline,{...context,now:NOW+599000}).requestable,true);
  const expired=evaluate(baseline,{...context,now:NOW+601000});
  assert.equal(expired.requestable,false);
  assert.ok(expired.flags.includes('EXPIRED'));
  assert.equal(evaluate({...baseline,valid_until:new Date(NOW+1000).toISOString()},{...context,now:NOW+2000}).requestable,false);
});
test('desired-date availability must be confirmed; without desired date unknown is allowed for inquiry',()=>{
  assert.equal(evaluate({...baseline,availability:{status:'unknown'}},context).requestable,false);
  assert.equal(evaluate({...baseline,availability:{status:'unknown'}},{...context,desiredDate:null}).requestable,true);
});
test('unique filtering never presents bad totals or expired provider quote as a new candidate',()=>{
  const quotes=[
    baseline, {...baseline,amount:120000,provider_key:'provider_1'},
    {...baseline,provider_key:'mismatch',line_items:[{amount:130000}]},
    {...baseline,provider_key:'expired',valid_until:new Date(NOW-1000).toISOString()},
    {...baseline,provider_key:'clean',amount:110000,line_items:[{amount:110000}]}
  ];
  assert.deepEqual(Array.from(validateUnique(quotes,context),q=>q.provider_key),['provider_1','clean']);
});
test('provider confirmation alone does not permit payment without price components and cancellation terms',()=>{
  const confirmed={...baseline,source_type:'provider_confirmed',
    provider_confirmed_at:new Date(NOW-60_000).toISOString()};
  assert.equal(evaluate(confirmed,context).kind,'confirmed');
  assert.equal(evaluate(confirmed,context).paymentReady,false);
  assert.equal(evaluate({...confirmed,cancellation_policy:'Refund terms displayed',
    mandatory_fees:0,base_amount:150000},context).paymentReady,true);
});
