import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const inventory=JSON.parse(read('docs/architecture/SOCTHINK_UNIFIED_WEB_INVENTORY_20261117.json'));
const pkg=JSON.parse(read('package.json'));
const next=fs.existsSync(path.join(root,'next.config.ts'));
assert.equal(inventory.schemaVersion,1);
assert.equal(inventory.target.webFramework,'Next.js App Router + React + TypeScript');
assert.equal(next,true,'One canonical Next.js host');
assert('next' in pkg.dependencies && 'react' in pkg.dependencies);
for(const forbidden of ['vue','nuxt','vite','pinia','@vitejs/plugin-vue','@vitejs/plugin-react','react-router-dom']){
 assert(!(forbidden in {...pkg.dependencies,...pkg.devDependencies}),
  'The canonical Next.js host may not add '+forbidden);
}
const expected=['portal','accent','vocabulary','reading-history','aelos','kids-reading'];
assert.deepEqual(inventory.modules.map(x=>x.id),expected,'keep an explicit registry for each legacy app');
const states=new Set(['canonical','migration-needed','archive-export-only']);
const urls=new Set();
for(const mod of inventory.modules){
 assert(states.has(mod.frontendState));
 assert(mod.source && mod.currentFramework && mod.apiAuthority);
 assert(mod.currentRoute.startsWith('/') && mod.targetRoute.startsWith('/'));
 assert(!urls.has(mod.currentRoute),'duplicate public path: '+mod.currentRoute);
 urls.add(mod.currentRoute);
 if(mod.frontendState==='migration-needed'){
  if(mod.id!=='kids-reading')assert(mod.currentRoute !== mod.targetRoute,'staged migration must record distinct runtime owners');
  assert(!mod.source.includes('mock'));
 }
 if(mod.firstNativeRoute){
  const page=path.join(root,'src/app',mod.firstNativeRoute.replace(/^\//,''),'page.tsx');
  assert(fs.existsSync(page),'Next trial page missing: '+page);
 }
}
assert.equal(inventory.modules.find(x=>x.id==='reading-history')?.frontendState,'archive-export-only');
assert.equal(inventory.modules.find(x=>x.id==='accent')?.currentFramework,'vue3-vite');
assert.equal(inventory.modules.find(x=>x.id==='aelos')?.currentFramework,'react-vite');
assert.equal(inventory.modules.find(x=>x.id==='portal')?.currentFramework,'next');
const scope=['src/app','src/features'];
const forbiddenName=(f)=>f.endsWith('.vue')||/^(?:nuxt|vite|vue)\.config\.(?:js|ts|mjs|cjs)$/.test(path.basename(f));
function visit(d){
 if(!fs.existsSync(d))return;
 for(const item of fs.readdirSync(d,{withFileTypes:true})){
  const file=path.join(d,item.name);
  if(item.isDirectory()){visit(file);continue}
  if(!item.isFile())continue;
  assert(!forbiddenName(file),'Legacy Vue/Vite file leaked into unified Web: '+file);
  if(!/\.(?:ts|tsx|js|jsx|mjs)$/.test(file))continue;
  const source=fs.readFileSync(file,'utf8');
  assert(!/\b(?:from\s*['"](?:vue|vue-router|pinia|vite|nuxt)|require\(\s*['"](?:vue|vue-router|pinia|vite|nuxt))/.test(source),
   'Next Web imported another application runtime: '+file);
 }
}
for(const folder of scope)visit(path.join(root,folder));
assert(forbiddenName('new.vue') && forbiddenName('vite.config.ts'),'guard negative controls');
assert(read('src/lib/english-products.ts').includes('id:"reading"') &&
 read('src/lib/english-products.ts').includes('EnglishLeap（历史兼容）'),
 'Do not resuscitate obsolete EnglishLeap as a new reading product');
assert(read('scripts/test_next_rust_boundary.mjs').includes('verified_legacy'),
 'Maintain the existing Rust authority freeze for Next business routes');
console.log('SOCTHINK_ONE_WEB_RUNTIME_GUARD=PASS canonical=nextjs legacy_vue=3 legacy_react_vite=1 archive_reading=true rust_authority_guard=active');
