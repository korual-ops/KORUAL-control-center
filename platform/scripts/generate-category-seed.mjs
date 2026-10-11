import { fileURLToPath } from 'node:url';
import {roots,validateTaxonomy} from '../category-catalog.js';

// Generate SQL from the same taxonomy consumed by the website.
// Review SQL before applying to staging or production. This script makes no DB connections.
const quote=value=>value==null?'NULL':"'"+String(value).replaceAll("'","''")+"'";
const json=value=>quote(JSON.stringify(value))+'::jsonb';
function statement(rows){
 const values=rows.map(n=>'('+[quote(n.code),quote(n.parent),quote(n.kind),json(n.labels),quote(n.icon),quote(n.status),String(n.order)].join(', ')+')').join(',\n  ');
 return 'insert into public.service_catalog_nodes (code,parent_code,kind,labels,icon,status,sort_order) values\n  '+values+'\non conflict (code) do update set parent_code=excluded.parent_code, kind=excluded.kind, labels=excluded.labels, icon=excluded.icon, status=excluded.status, sort_order=excluded.sort_order, updated_at=now();';
}
export function generateSeed(){
 const report=validateTaxonomy();if(!report.ok)throw new Error(report.errors.join(', '));
 const categories=roots.map(r=>({code:r.id,parent:null,kind:'root',labels:r.label,icon:r.icon,status:'catalog',order:r.order}));
 const groups=roots.flatMap(r=>r.groups.map(g=>({code:g.id,parent:r.id,kind:'group',labels:g.label,icon:null,status:'catalog',order:g.order})));
 const services=roots.flatMap(r=>r.groups.flatMap(g=>g.services.map(s=>({code:s.id,parent:g.id,kind:'service',labels:s.label,icon:null,status:s.status,order:s.order}))));
 return '-- Generated catalog seed. Requires 20261009_service_catalog_nodes.sql migration.\nbegin;\n'+[categories,groups,services].map(statement).join('\n')+'\ncommit;\n';
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1])process.stdout.write(generateSeed());
