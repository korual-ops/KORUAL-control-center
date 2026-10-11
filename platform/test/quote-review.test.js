import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAmount, summarizeQuote, normalizeReview} from '../quote-review-model.js';
test('missing and malformed costs never masquerade as zero',()=>{
  for(const value of ['',null,undefined,' ',true,-1,1.2,'1e3',100000001]) assert.equal(parseAmount(value),null);
  assert.equal(parseAmount('0'),0);
  assert.equal(parseAmount('100000000'),100000000);
});
test('unknown extras prevent a false within-budget conclusion',()=>{
  const result=summarizeQuote({base:'80000',extras:'',tax:'0'},'100000');
  assert.equal(result.known,80000);assert.equal(result.total,null);assert.equal(result.budgetState,'unknown');
  assert.equal(summarizeQuote({base:'110000'},'100000').budgetState,'over');
});
test('complete total adds all costs and checks conditions independently',()=>{
  const row={base:'80000',extras:'25000',tax:'5000',scope:true,cancellation:true};
  assert.deepEqual(summarizeQuote(row,'100000'),{known:110000,unknown:0,total:110000,comparable:true,budgetState:'over',gap:-10000});
  assert.equal(summarizeQuote({...row,scope:false},'110000').comparable,false);
  assert.equal(summarizeQuote(row,'110000').budgetState,'within');
});
test('restoration keeps zero, drops arbitrary text and limits to three fixed rows',()=>{
  const clean=normalizeReview({budget:'100000',rows:[{id:'<script>',base:'0',extras:'oops',scope:'true',phone:'secret'}]});
  assert.equal(clean.rows.length,3);assert.equal(clean.rows[0].id,'A');assert.equal(clean.rows[0].base,'0');
  assert.equal(clean.rows[0].extras,'');assert.equal(clean.rows[0].scope,false);assert.equal('phone' in clean.rows[0],false);
  assert.deepEqual(normalizeReview(clean),clean);
});
