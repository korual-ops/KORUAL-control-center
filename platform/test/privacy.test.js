import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context=vm.createContext({});
vm.runInContext(await readFile(new URL('../privacy.js',import.meta.url),'utf8'),context);
const privacy=context.KorualPrivacy;
test('rejects common contact identifiers and detailed address in request text',()=>{
  for(const text of ['010-0000-0000 청소','test@example.com','공동현관: 1234','101동 202호','테스트로 12'])assert.equal(privacy.containsPrivateData(text),true,text);
  for(const text of ['인천 영종도','20평 집 청소 10만원','2026-10-03 에어컨 세척'])assert.equal(privacy.containsPrivateData(text),false,text);
});
test('persisted state removes free text and nested customer information',()=>{
  const clean=privacy.sanitizeState({currentRequest:{service:'청소',raw:'test@example.com 청소',bundle:['청소'],region:'인천 영종도'},history:[{raw:'secret'}],booking:{backend_id:'test-id',customer:{name:'test',phone:'01000000000'},phone:'01000000000'},bundlePlan:{request:{raw:'secret',customer:{name:'test'}}}});
  const json=JSON.stringify(clean);
  assert.equal(json.includes('test@example.com'),false);
  assert.equal(json.includes('01000000000'),false);
  assert.equal(json.includes('secret'),false);
  assert.equal(clean.booking.backend_id,'test-id');
  assert.equal(clean.currentRequest.region,'인천 영종도');
});
