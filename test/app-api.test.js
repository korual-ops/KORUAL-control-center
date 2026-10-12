import test from 'node:test';
import assert from 'node:assert/strict';
import { validateQuoteInput, sameQuote } from '../shared/app-api.js';
import { authorizePartner } from '../shared/partner-access.js';

const p='11111111-1111-4111-8111-111111111111';
const r='22222222-2222-4222-8222-222222222222';
const valid={provider_id:p,request_id:r,amount:120000,message:'입주청소 기본 25평, 부가 항목 별도 확인',estimated_duration_minutes:180,warranty_days:7};

test('quote price, IDs and scope are explicitly validated',()=>{
  assert.equal(validateQuoteInput(valid).value.amount,120000);
  assert.equal(validateQuoteInput({...valid,amount:-1}).error,'INVALID_AMOUNT');
  assert.equal(validateQuoteInput({...valid,amount:1.2}).error,'INVALID_AMOUNT');
  assert.equal(validateQuoteInput({...valid,provider_id:'bad'}).error,'INVALID_ID');
  assert.equal(validateQuoteInput({...valid,message:'  '}).error,'MESSAGE_REQUIRED');
  assert.equal(validateQuoteInput({...valid,estimated_duration_minutes:0}).error,'INVALID_DURATION');
  assert.equal(validateQuoteInput({...valid,warranty_days:4000}).error,'INVALID_WARRANTY');
});
test('cross-tenant and viewer quote writes must fail',()=>{
  const principal={id:'user1',authenticated:true,memberships:[{providerId:p,userId:'user1',role:'OPERATOR',active:true}]};
  assert.equal(authorizePartner({principal,providerId:p,action:'quote.create'}),true);
  assert.equal(authorizePartner({principal,providerId:r,action:'quote.create'}),false);
  principal.memberships[0].role='VIEWER';
  assert.equal(authorizePartner({principal,providerId:p,action:'quote.create'}),false);
});

test('idempotent quote retry must match all business terms',()=>{
 const existing={status:'submitted',amount:120000,message:valid.message,estimated_duration_minutes:180,warranty_days:7};
 assert.equal(sameQuote(existing,validateQuoteInput(valid).value),true);
 assert.equal(sameQuote({...existing,message:'different scope'},validateQuoteInput(valid).value),false);
 assert.equal(sameQuote({...existing,warranty_days:0},validateQuoteInput(valid).value),false);
 assert.equal(sameQuote({...existing,amount:160000},validateQuoteInput(valid).value),false);
});
