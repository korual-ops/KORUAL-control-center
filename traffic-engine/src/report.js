import{recommendAction}from'./scoring.js';
const demo=[{channel:'instagram',sessions:300,orders:12,revenue:504000,cost:80000,refunds:0,repeatOrders:2},{channel:'naver-blog',sessions:180,orders:9,revenue:378000,cost:30000,refunds:0,repeatOrders:3},{channel:'paid-search',sessions:420,orders:8,revenue:336000,cost:160000,refunds:42000,repeatOrders:0}];
const report=demo.map(row=>({...row,...recommendAction(row)})).sort((a,b)=>b.score-a.score);
process.stdout.write(JSON.stringify({generatedAt:new Date().toISOString(),report},null,2)+'\n');
