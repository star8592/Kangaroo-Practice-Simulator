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

console.log("MATH_DSL=PASS move=true morph=true net=true fold=true rotate=true");
