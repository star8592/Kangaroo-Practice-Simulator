'use strict';
// The sole fast boundary guard: existing Next handlers are migration DEBT,
// not permission to add more Node business endpoints. Rust owns new APIs.
// Removal of a legacy handler is always allowed.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const inventory=require('../docs/architecture/SOCTHINK_LEGACY_NEXT_API_INVENTORY_20261116.json');
const legacy=new Map(inventory.entries.map(row=>[row.file,new Set(row.methods)]));
assert.equal(legacy.size,inventory.entries.length,'Duplicate inventory entries');
assert.equal(legacy.size,91,'Audit baseline must remain the verified 2026-11-16 list; do not expand it');
const METHODS=['GET','POST','PUT','PATCH','DELETE','OPTIONS','HEAD'];
function walk(dir){
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>{
  const p=path.join(dir,x.name);
  return x.isDirectory()?walk(p):[p];
 });
}
const present=walk(path.join(root,'src/app/api')).filter(p=>p.endsWith('/route.ts'))
 .map(p=>path.relative(root,p).split(path.sep).join('/')).sort();
let mutations=0;
const unexpected=[];
for(const file of present){
 const old=legacy.get(file);
 if(!old){unexpected.push('NEW_NEXT_HANDLER '+file);continue}
 const source=fs.readFileSync(path.join(root,file),'utf8');
 const declared=new Set();
 for(const m of METHODS)
  if(new RegExp('export\\s+(?:async\\s+)?function\\s+'+m+'\\b|export\\s+const\\s+'+m+'\\b').test(source))
   declared.add(m);
 for(const method of declared){
  if(!old.has(method))unexpected.push('NEW_NEXT_BUSINESS_METHOD '+method+' '+file);
 }
 if([...declared].some(m=>['POST','PATCH','PUT','DELETE'].includes(m)))mutations++;
}
assert.deepEqual(unexpected,[],
 'SOC THINK front/backend boundary: do not add new Next API handlers or methods; implement new domain APIs in Rust');
console.log('SOCTHINK_NEXT_RUST_BOUNDARY=PASS verified_legacy='+inventory.entries.length+
 ' remaining_next='+present.length+' mutating_routes='+mutations+
 ' migrated_or_deleted='+[...legacy.keys()].filter(x=>!present.includes(x)).length+
 ' new_business_handlers=0');
