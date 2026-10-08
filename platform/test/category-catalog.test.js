import test from 'node:test';
import assert from 'node:assert/strict';
import { roots, allServices, validateTaxonomy, findService, searchServices, labelFor } from '../category-catalog.js';

test('canonical categories contain eight top-level domains and unique nodes',()=>{
  const result=validateTaxonomy();
  assert.equal(result.ok,true,result.errors.join('\n'));
  assert.equal(result.rootCount,8);
  assert.equal(result.groupCount,31);
  assert.equal(result.serviceCount,118);
});
test('travel retains private charter as a subservice, not a root category',()=>{
  assert.equal(roots.some(root=>root.id==='charter'),false);
  assert.equal(findService('private-charter')?.rootId,'travel');
});
test('NOW discovery is separate from booking availability',()=>{
  const cafes=findService('cafe-seats');
  assert.equal(cafes?.rootId,'now');
  assert.equal(cafes?.status,'planned');
  assert.equal(allServices.filter(s=>s.status==='beta'&&s.rootId==='now').length,0);
});
test('search works in Korean and English, including multiple words and spaces',()=>{
  assert.ok(searchServices('입주청소').some(s=>s.id==='move-in-clean'));
  assert.ok(searchServices('private charter').some(s=>s.id==='private-charter'));
  assert.ok(searchServices('    private    charter  ').some(s=>s.id==='private-charter'));
  assert.ok(searchServices('인터넷','move').some(s=>s.id==='internet-setup'));
  assert.equal(searchServices('internet','commerce').length,0);
});
test('catalog labels have safe fallback for untranslated leaf locales',()=>{
  assert.equal(labelFor(roots[0],'ja'),'住まい・暮らし');
  assert.equal(labelFor(findService('move-in-clean'),'ko'),'입주청소');
  assert.equal(labelFor(findService('move-in-clean'),'vi'),'Move-in cleaning');
});
test('no future category can imply current live booking',()=>{
  assert.ok(allServices.every(s=>['beta','planned'].includes(s.status)));
  assert.equal(allServices.filter(s=>s.status==='live').length,0);
});

import {generateSeed} from '../scripts/generate-category-seed.mjs';
test('database seed is reproducible and contains the full hierarchy',()=>{
 const first=generateSeed();const second=generateSeed();
 assert.equal(first,second);
 assert.equal((first.match(/on conflict \(code\)/g)||[]).length,3);
 assert.ok(first.includes("'private-charter'"));
 assert.ok(first.includes("'service'"));
 assert.ok(first.includes("'planned'"));
});
