import test from'node:test';import assert from'node:assert/strict';import{csvCell,getPageSlice,validateItem}from'../src/lib/safety.js';
test('CSV formula injection is neutralized',()=>assert.equal(csvCell('=IMPORTXML("x")'),'"\'=IMPORTXML(""x"")"'));
test('duplicate codes are rejected',()=>assert.match(validateItem({id:2,name:'상품',sku:'kru-1',price:1,stock:1},'products',[{id:1,sku:'KRU-1'}]),/이미/));
test('pagination clamps invalid page',()=>assert.deepEqual(getPageSlice([1,2,3],9,2),{pageCount:2,pageIndex:1,rows:[3]}));
