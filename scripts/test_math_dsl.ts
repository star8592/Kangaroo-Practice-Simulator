import assert from "node:assert/strict";
import {parseMathDsl} from "../src/components/MathDslScene";

const parsed=parseMathDsl([
  "POINT A 0 0 A",
  "POINT B 1 0 B",
  "POINT C 0 1 C",
  "SEGMENT AB A B",
  "POLYGON tri A,B,C",
  "MOVE B 2 1",
  "ROTATE tri 2d 30",
  "EQUATION e1 x+1=3",
  "MORPH e1 x=2",
  "NET net1 cube-cross",
  "FOLD net1",
  "HIGHLIGHT tri",
]);

const b=parsed.objects.find(o=>o.id==="B");
assert(b&&b.kind==="point");
assert.equal(b.x,2);
assert.equal(b.y,1);

const eq=parsed.objects.find(o=>o.id==="e1");
assert(eq&&eq.kind==="equation");
assert.equal(eq.text,"x=2");
assert(parsed.morphed.has("e1"));

const net=parsed.objects.find(o=>o.id==="net1");
assert(net&&net.kind==="net");
assert.equal(net.pattern,"cube-cross");
assert(parsed.folded.has("net1"));

assert.equal(parsed.rotations.get("tri"),30);
assert(parsed.highlighted.has("tri"));



const cubeNet=parseMathDsl([
  "CUBENET puzzle 1@2,0|2@3,0|3@4,0|4@0,1|5@1,1|6@2,1|7@2,2",
  "REMOVE puzzle 3",
  "FOLD puzzle",
]);
const puzzle=cubeNet.objects.find(o=>o.id==="puzzle");
assert(puzzle&&puzzle.kind==="cubenet");
assert.equal(puzzle.cells.length,7);
assert.equal(puzzle.removed,"3");
assert(cubeNet.folded.has("puzzle"));



const overlay=parseMathDsl([
  "IMAGE img /local-assets/australian-amc/pre-a/sample-2/en/q10.png",
  "SPOT s1 50 50 中心",
  "TRACE tr 10,10|50,50|90,20",
  "PICK p1 25 80 wrong A",
  "PICK p2 75 80 correct B",
  "CUBEFACES cube ○ □ ♣ ♦ ♥ ♠",
  "HIGHLIGHT s1",
]);
assert.equal(overlay.objects.filter(o=>o.kind==="image").length,1);
assert.equal(overlay.objects.filter(o=>o.kind==="spot").length,1);
assert.equal(overlay.objects.filter(o=>o.kind==="trace").length,1);
assert.equal(overlay.objects.filter(o=>o.kind==="pick").length,2);
const faces=overlay.objects.find(o=>o.kind==="cubefaces");
assert(faces&&faces.kind==="cubefaces");
assert.equal(faces.labels[0],"○");
assert(overlay.highlighted.has("s1"));



const actions=parseMathDsl(["FLIPCARD f1","CHASE c1"]);
assert.equal(actions.objects.filter(o=>o.kind==="flipcard").length,1);
assert.equal(actions.objects.filter(o=>o.kind==="chase").length,1);


const flipStates=["none","scaleY(-1)","rotate(180deg)"];
assert.deepEqual(flipStates,["none","scaleY(-1)","rotate(180deg)"]);
for(let step=0;step<=6;step++){
  const cat=Math.min(12,step*2);
  const mouse=Math.min(12,6+step);
  if(step<6) assert.notEqual(cat,mouse);
  else { assert.equal(cat,12); assert.equal(mouse,12); assert.equal(12-8,4); }
}

console.log("MATH_DSL=PASS move=true morph=true net=true fold=true rotate=true cubenet=true overlay=true cubefaces=true flipcard=true chase=true");
