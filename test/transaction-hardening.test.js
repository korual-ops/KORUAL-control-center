import test from 'node:test';
import assert from 'node:assert/strict';
import { originFailure } from '../shared/request-origin.js';
import { quoteEligibility, quoteExpiresAt, identicalRequest } from '../shared/transaction-rules.js';

test('state-changing endpoints deny missing or attacker origins', () => {
 const host='korual.example';
 assert.equal(originFailure({origin:'https://korual.example',host}),null);
 assert.equal(originFailure({origin:'http://localhost:8080',host:'localhost:8080'}),null);
 for (const origin of [null,'','null','https://evil.test','https://korual.example.evil.test','https://korual.example/path','file://korual.example','https://korual.example:444']){
   assert.notEqual(originFailure({origin,host}),null,origin);
 }
});

test('a quote requires a real verified supplier and allocated, open request',()=>{
 const provider={active:true,verified:true,is_demo:false};
 assert.equal(quoteEligibility({requestStatus:'NEW',assignmentStatus:'pending',provider}),null);
 assert.equal(quoteEligibility({requestStatus:'QUOTED',assignmentStatus:'quoted',provider}),null);
 assert.equal(quoteEligibility({requestStatus:'COMPLETED',assignmentStatus:'pending',provider}),'REQUEST_CLOSED');
 assert.equal(quoteEligibility({requestStatus:'NEW',assignmentStatus:'declined',provider}),'LEAD_NOT_ASSIGNED');
 assert.equal(quoteEligibility({requestStatus:'NEW',assignmentStatus:'pending',provider:{...provider,is_demo:true}}),'PROVIDER_NOT_VERIFIED');
});

test('quote has deterministic explicit expiration and cannot be retroactively extended',()=>{
 assert.equal(quoteExpiresAt(new Date('2026-10-13T00:00:00.000Z')),'2026-10-15T00:00:00.000Z');
 assert.throws(()=>quoteExpiresAt(new Date('invalid')),TypeError);
});

test('idempotency key cannot silently return a different customer request',()=>{
 const v={services:['입주청소'],region:'인천',desired_date:'2026-11-01',customer_name:'홍길동',phone:'01012345678'};
 assert.equal(identicalRequest(v,{...v,services:['입주청소']}),true);
 assert.equal(identicalRequest(v,{...v,phone:'01000000000'}),false);
 assert.equal(identicalRequest(v,{...v,services:['이사']}),false);
 assert.equal(identicalRequest(v,{...v,desired_date:'2026-11-02'}),false);
});
