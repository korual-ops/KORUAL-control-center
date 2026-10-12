import test from 'node:test';
import assert from 'node:assert/strict';
import {eligiblePartners} from '../shared/lead-routing.js';
const p=id=>({id,active:true,verified:true,is_demo:false,korual_score:80,service_categories:['입주청소'],regions:['인천']});
test('only registered real eligible tenant receives matching lead',()=>{
  const result=eligiblePartners({request:{services:['입주청소'],region:'인천 영종도'},providers:[p('a'),{...p('b'),is_demo:true},p('c'),{...p('d'),verified:false}],memberProviderIds:new Set(['a','b','d'])});
  assert.deepEqual(result.map(x=>x.provider_id),['a']);
});
test('unmatched categories/regions fail closed',()=>{
  assert.equal(eligiblePartners({request:{services:['이사'],region:'인천 영종도'},providers:[p('a')],memberProviderIds:new Set(['a'])}).length,0);
  assert.equal(eligiblePartners({request:{services:['입주청소'],region:'부산'},providers:[p('a')],memberProviderIds:new Set(['a'])}).length,0);
  assert.equal(eligiblePartners({request:{services:['입주청소'],region:'인천'},providers:[p('a')],memberProviderIds:new Set()}).length,0);
});
test('at most three providers, ranking has stable ordering',()=>{
  const providers=['d','c','b','a'].map((id,i)=>({...p(id),korual_score:i*20}));
  const out=eligiblePartners({request:{services:['입주청소'],region:'인천 연수구'},providers,memberProviderIds:new Set(providers.map(x=>x.id))});
  assert.deepEqual(out.map(x=>x.provider_id),['a','b','c']);
  assert.equal(out.length,3);
});
