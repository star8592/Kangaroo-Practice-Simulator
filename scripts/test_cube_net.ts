import assert from "node:assert/strict";
import {analyzeCubeNet,validCubeNetRemovals,type CubeNetCell} from "../src/lib/cube-net";

const cells:CubeNetCell[]=[
  {label:"1",x:2,y:0},{label:"2",x:3,y:0},{label:"3",x:4,y:0},
  {label:"4",x:0,y:1},{label:"5",x:1,y:1},{label:"6",x:2,y:1},
  {label:"7",x:2,y:2},
];

assert.deepEqual(validCubeNetRemovals(cells),["3","7"]);
const remove3=analyzeCubeNet(cells.filter(c=>c.label!=="3"));
assert.equal(remove3.faceByNormal["0,0,1"],"1");
assert.equal(remove3.faceByNormal["1,0,0"],"2");
assert.equal(new Set(Object.values(remove3.faceByNormal)).size,6);
assert.equal(analyzeCubeNet(cells.filter(c=>c.label!=="1")).reason,"disconnected");
const remove4=analyzeCubeNet(cells.filter(c=>c.label!=="4"));
assert.equal(remove4.reason,"face-overlap");
assert.deepEqual(remove4.overlaps,[["3","7"]]);
console.log("CUBE_NET=PASS valid_removals=3,7 remove4_overlap=3,7");
