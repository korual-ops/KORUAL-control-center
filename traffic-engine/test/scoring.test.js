import test from'node:test';import assert from'node:assert/strict';
import{createUtmUrl}from'../src/utm.js';import{scoreChannel}from'../src/scoring.js';
test('UTM 링크를 만든다',()=>assert.match(createUtmUrl('https://korual.cafe24.com',{source:'Instagram',medium:'Social',campaign:'Hotel Towel'}),/utm_campaign=hotel-towel/));
test('손실 채널의 이익을 계산한다',()=>assert.equal(scoreChannel({revenue:100,cost:150}).profit,-50));
