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

test('service taxonomy aliases resolve to the same actual supplier category',()=>{
 const provider={...p('aircon'),service_categories:['에어컨 청소']};
 const assigned=eligiblePartners({
   request:{services:['에어컨'],region:'인천 영종도'},
   providers:[provider],memberProviderIds:new Set(['aircon'])
 });
 assert.equal(assigned.length,1);
 const internet={...p('internet'),service_categories:['인터넷/TV']};
 const matched=eligiblePartners({
   request:{services:['인터넷 설치'],region:'인천 영종도'},
   providers:[internet],memberProviderIds:new Set(['internet'])
 });
 assert.equal(matched.length,1);
});

test('partial bundle coverage cannot be assigned as a full-service quote',()=>{
 const provider={...p('one'),service_categories:['입주청소']};
 assert.deepEqual(eligiblePartners({
  request:{services:['입주청소','이사'],region:'인천 영종도'},
  providers:[provider],memberProviderIds:new Set(['one'])
 }),[]);
});

test('region prefix does not falsely match unrelated lookalike names',()=>{
 assert.equal(eligiblePartners({
  request:{services:['입주청소'],region:'인천시티 리조트'},
  providers:[p('one')],memberProviderIds:new Set(['one'])
 }).length,0);
 assert.equal(eligiblePartners({
  request:{services:['입주청소'],region:'인천광역시 중구'},
  providers:[p('one')],memberProviderIds:new Set(['one'])
 }).length,1);
});
