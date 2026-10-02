import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../site.js',import.meta.url),'utf8');
const start=source.indexOf('  function mergeRequestConditions(');
const end=source.indexOf('  function analyze(',start);
const context=vm.createContext({});
vm.runInContext(source.slice(start,end),context);
test('changing region preserves date and budget when no replacement is supplied',()=>{
 const request={region:'서울',desiredDate:'2026-10-10',budgetCap:100000};
 const merged=context.mergeRequestConditions(request,{region:'인천'});
 assert.equal(merged.region,'인천');assert.equal(merged.desiredDate,'2026-10-10');assert.equal(merged.budgetCap,100000);
 assert.equal(request.region,'서울');
});
test('explicit clear removes a previous inferred date or budget',()=>{
 const merged=context.mergeRequestConditions({desiredDate:'2026-10-10',budgetCap:100000},{desiredDate:null,budgetCap:null});
 assert.equal(merged.desiredDate,null);assert.equal(merged.budgetCap,null);
});
