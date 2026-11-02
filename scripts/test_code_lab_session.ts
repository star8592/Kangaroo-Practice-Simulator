import assert from "node:assert/strict";
import {CODE_LAB_VERSION,CODE_CHALLENGES} from "../src/lib/code-lab";
import {parseCodeLabSnapshot,indentCodeSource} from "../src/lib/code-lab-session";
const key=CODE_CHALLENGES[0].id;
const valid={version:CODE_LAB_VERSION,stage:"practice",index:0,drafts:{[key]:"function example() {\n  return [];\n}"},solved:{[key]:true},attempts:{[key]:2}};
assert.deepEqual(parseCodeLabSnapshot(JSON.stringify(valid)),valid);
assert.equal(parseCodeLabSnapshot(null),null);
assert.equal(parseCodeLabSnapshot("no-json"),null);
assert.equal(parseCodeLabSnapshot(JSON.stringify({...valid,version:"wrong"})),null);
assert.equal(parseCodeLabSnapshot(JSON.stringify({...valid,index:-1})),null);
assert.equal(parseCodeLabSnapshot(JSON.stringify({...valid,index:6})),null);
assert.equal(parseCodeLabSnapshot(JSON.stringify({...valid,drafts:{bad:"a"}})),null);
assert.equal(parseCodeLabSnapshot(JSON.stringify({...valid,drafts:{[key]:"x".repeat(5001)}})),null);
assert.equal(parseCodeLabSnapshot(JSON.stringify({...valid,attempts:{[key]:-1}})),null);
assert.equal(parseCodeLabSnapshot(JSON.stringify({...valid,solved:{[key]:"yes"}})),null);
assert.equal(parseCodeLabSnapshot(JSON.stringify({...valid,stage:"report"})),null);
assert.deepEqual(parseCodeLabSnapshot(JSON.stringify({...valid,stage:"report",solved:Object.fromEntries(CODE_CHALLENGES.map(q=>[q.id,true]))})),{
 ...valid,stage:"report",solved:Object.fromEntries(CODE_CHALLENGES.map(q=>[q.id,true]))
});
let edit=indentCodeSource("abc",1,1,false);
assert.deepEqual(edit,{source:"a  bc",start:3,end:3});
edit=indentCodeSource("  return [];",4,4,true);
assert.deepEqual(edit,{source:"return [];",start:2,end:2});
edit=indentCodeSource("aa\nbb\ncc",0,5,false);
assert.deepEqual(edit,{source:"  aa\n  bb\ncc",start:2,end:9});
edit=indentCodeSource("  aa\n  bb\ncc",0,9,true);
assert.deepEqual(edit,{source:"aa\nbb\ncc",start:0,end:5});
edit=indentCodeSource("aa\nbb\ncc",0,3,false);
assert.deepEqual(edit,{source:"  aa\nbb\ncc",start:2,end:5}); // newline-end does not indent next line
assert.deepEqual(indentCodeSource("test",-1,3,false),{source:"test",start:-1,end:3});
console.log("CODE_LAB_SESSION=PASS persisted_drafts_validated=YES versioned=YES tab_indent=YES shift_tab=YES multi_line=YES");
