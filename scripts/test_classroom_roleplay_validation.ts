import assert from "node:assert/strict";
import {validateSpeakerLabels} from "../src/lib/classroom-roleplay";
assert.deepEqual(validateSpeakerLabels(undefined,3),[null,null,null]);
assert.deepEqual(validateSpeakerLabels(["A","B",null],3),["A","B",null]);
assert.deepEqual(validateSpeakerLabels(["Teacher_1","Student-2"],2),["Teacher_1","Student-2"]);
for(const value of [["A"],["A","B","C"],["<script>","B"],["A:","B"],[123,null],["A".repeat(25),null]]){
 assert.throws(()=>validateSpeakerLabels(value,2));
}
console.log("R56_ROLE_LABEL_VALIDATION_PASS=9");
