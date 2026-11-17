import assert from "node:assert/strict";
import {ClassroomFailure} from "../src/lib/classroom-web-core";
import {selectVerifiedClassroomCandidates as choose} from "../src/lib/classroom-web-teacher";
const p1="par_aaaaaaaaaaaaaaaaaa",p2="par_bbbbbbbbbbbbbbbbbb";
const users=[{id:p1,name:"微信用户",lastLoginAt:100},
 {id:p2,name:"王老师",lastLoginAt:200}];
assert.deepEqual(choose(new URLSearchParams({subject:p1}),users),[users[0]],
 "Unlabeled WeChat users can be resolved from the admin directory without nickname matching");
assert.deepEqual(choose(new URLSearchParams({q:"王老师"}),users),[users[1]]);
assert.deepEqual(choose(new URLSearchParams({q:"王"}),users),[]);
assert.deepEqual(choose(new URLSearchParams({subject:"par_cccccccccccccccccc"}),users),[]);
for(const subject of ["../etc/passwd","par_","par_aaaaaaaaaaaaaaaaaa'","par_aaaaaaaaaaaaaaaaaa|q=王老师"]){
 assert.throws(()=>choose(new URLSearchParams({subject}),users),
 (e:unknown)=>e instanceof ClassroomFailure&&e.status===400);
}
assert.deepEqual(choose(new URLSearchParams({subject:p1,q:"王老师"}),users),[users[0]],
 "Exact account selection wins over ambiguous name query");
console.log("SOCTHINK_CLASSROOM_DIRECT_SUBJECT_SELECTION_PASS=9");
