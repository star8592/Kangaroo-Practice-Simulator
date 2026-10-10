import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.join(import.meta.dirname,'..');
const dist=path.join(root,'apps','miniapp','dist');
const app=JSON.parse(fs.readFileSync(path.join(dist,'app.json'),'utf8'));
const expected=[
  ['首页','pages/home/index'],
  ['计算','pages/arithmetic/index'],
  ['模考','pages/competitions/index'],
  ['赛事','pages/events/index'],
  ['我的','pages/profile/index']
];
assert.deepEqual(app.tabBar?.list?.map(item=>[item.text,item.pagePath]),expected,
  'Built WeChat package must contain five functional, correctly ordered tabs');
const paths=new Set(app.pages||[]);
for(const [name,page] of expected){
  assert.ok(paths.has(page),`Tab ${name} target was not included in built page registry`);
  for(const ext of ['js','wxml']){
    assert.ok(fs.existsSync(path.join(dist,page+'.'+ext)),`Tab ${name} missing ${ext} artifact`);
  }
}
console.log('MINIAPP_FIVE_TAB_ARTIFACT_PASS pages='+paths.size+' tabs=5 order=PASS artifacts=PASS');
