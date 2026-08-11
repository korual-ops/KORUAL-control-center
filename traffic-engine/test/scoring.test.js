import test from'node:test';import assert from'node:assert/strict';
import{createUtmUrl}from'../src/utm.js';import{scoreChannel,decideGrowth}from'../src/scoring.js';
test('UTM 링크를 만든다',()=>assert.match(createUtmUrl('https://korual.cafe24.com',{source:'Instagram',medium:'Social',campaign:'Hotel Towel'}),/utm_campaign=hotel-towel/));
test('손실 채널의 이익을 계산한다',()=>assert.equal(scoreChannel({revenue:100,cost:150}).profit,-50));
test('재고 부족이면 광고 확대를 막는다',()=>assert.equal(decideGrowth({sessions:1000,orders:50,revenue:2000000,cost:200000,stock:10,dailyUnits:2,cashBalance:1000000,next30DayCommitments:100000}).action,'광고 확대 전 재고 확보'));
test('작은 표본은 과대평가하지 않는다',()=>assert.ok(decideGrowth({sessions:20,orders:2,revenue:100000,cost:1000,stock:100,dailyUnits:1,cashBalance:1000000,next30DayCommitments:1000}).sampleConfidence<0.2));
