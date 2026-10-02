import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../site.js',import.meta.url),'utf8');
const start=source.indexOf('  function optionalNumber(');
const end=source.indexOf('  async function fetchQuotesStable(',start);
const context=vm.createContext({});
vm.runInContext(source.slice(start,end),context);
test('missing numeric evidence remains unknown while genuine zero is retained',()=>{
 for(const value of [null,undefined,'',' ',true,false,'invalid'])assert.equal(context.optionalNumber(value),null);
 for(const value of [0,'0'])assert.equal(context.optionalNumber(value),0);
 assert.equal(context.optionalNumber('12500'),12500);
});
test('invalid prices and duplicate providers cannot occupy comparison slots',()=>{
 const quotes=[{provider_key:'a',amount:null},{provider_key:'b',amount:10},{provider_key:'b',amount:20},{provider_key:'c',amount:-1},{provider_key:'d',amount:0},{provider_key:'e',amount:'30'}];
 assert.equal(JSON.stringify(context.validUniqueQuotes(quotes).map(q=>q.provider_key)),JSON.stringify(['b','d','e']));
});
test('cache separates regions and budgets and treats exclusions as a set',()=>{
 const request={service:'청소',region:'인천',budget_cap:100000};
 assert.notEqual(context.quoteCacheKey(request),context.quoteCacheKey({...request,region:'서울'}));
 assert.notEqual(context.quoteCacheKey(request),context.quoteCacheKey({...request,budget_cap:200000}));
 assert.equal(context.quoteCacheKey({...request,exclude_provider_keys:['b','a','b']}),context.quoteCacheKey({...request,exclude_provider_keys:['a','b']}));
});
