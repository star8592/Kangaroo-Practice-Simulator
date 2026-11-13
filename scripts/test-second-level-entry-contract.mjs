import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const hubPaths=[
 ['英语', 'src/app/english/page.tsx'],
 ['岗位课程', 'src/app/learn/page.tsx'],
 ['岗位模拟', 'src/app/practice/page.tsx'],
 ['技能实训', 'src/app/skill-labs/page.tsx'],
 ['能力测评', 'src/app/assessment-center/page.tsx'],
 ['数字商城', 'src/app/shop/page.tsx'],
 ['职业岗位', 'src/app/career/page.tsx'],
 ['数学资源', 'src/components/ResourceLibraryClient.tsx'],
 ['数学模拟', 'src/components/HomeClient.tsx'],
]
for(const [name,path] of hubPaths){
 const content=read(path)
 assert.ok(content.includes('direct-entry-card'),name+' has no whole card activation')
 assert.ok(content.includes('data-direct-primary'),name+' has no primary destination')
}
const english=read('src/app/english/page.tsx')
assert.ok(!english.includes('进入目录'),'English hub must not show gateway buttons')
assert.ok(english.includes('href:item.serviceUrl'),'English hubs must point to product service URLs instead of legacy description pages')
for(const direct of [
 '/english/pronunciation/app/practice-library',
 '/english/vocabulary/app/',
 '/english/reading/kids/',
 '/english/reading/app/',
 '/english/reading/app/exams',
 '/english/aelos/app/library',
]){
 assert.ok(read('src/lib/english-products.ts').includes(direct) || english.includes(direct),direct+' missing')
}
assert.ok(english.includes('ENGLISH_PRODUCTS.flatMap'),'Both reading products must be shown in level two')
assert.ok(read('src/components/SocthinkPortal.tsx').includes('发音 · 单词 · 阅读 · 高阶阅读'),'Homepage must show AelOS actual category')
const css=read('src/app/direct-entry.css')
assert.ok(css.includes('>.direct-entry-hit') && css.includes('z-index:2'),'Must use a real full-size anchor with independent secondary actions')
assert.ok(read('src/app/layout.tsx').includes('direct-entry.css'),'Global card rule not loaded')
// The main destination must be one full-card anchor with an accessible CTA
// name; a second same-href anchor breaks strict selectors and keyboard UX.
for(const [path,label] of [
 ['src/app/career/page.tsx','阅读完整教程'],
 ['src/app/career/page.tsx','进入考场 · 确认入场'],
 ['src/app/skill-labs/page.tsx','进入技术书库'],
 ['src/app/skill-labs/page.tsx','进入独立 SQL 实训台'],
 ['src/app/skill-labs/page.tsx','进入编程实训台'],
]){
 const body=read(path)
 assert.ok(body.includes('aria-label="'+label+'"'),path+' must expose accessible primary '+label)
}
for(const path of ['src/app/skill-labs/page.tsx','src/app/practice/page.tsx','src/app/learn/page.tsx']){
 const body=read(path)
 assert.ok(!body.includes('<Link className={styles.tileLink} href='),path+' introduced duplicated primary anchor')
}
console.log('SECOND_LEVEL_DIRECT_ENTRY_CONTRACT=PASS',hubPaths.length,'hub templates',6,'English service entries')
