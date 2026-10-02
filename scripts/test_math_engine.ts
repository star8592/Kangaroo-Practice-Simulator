import assert from "node:assert/strict";
import {strategiesFor,type MathEntity} from "../src/lib/math-engine";
const arithmetic:MathEntity={id:"a1",domain:"arithmetic",canonical:"99×37",representations:[{id:"r1",kind:"numeric",form:"(100-1)×37"}],structures:["near_round_number"],transformations:[{id:"t1",kind:"substitute",from:"99",to:"100-1",reason:"friendly number"},{id:"t2",kind:"compensate",from:"100×37",to:"100×37-37",reason:"preserve equality"}],goals:["fluency","structure","strategy","transfer"],curricula:["GLOBAL"]};
const algebra:MathEntity={id:"m1",domain:"algebra",canonical:"x²-25",representations:[{id:"r2",kind:"symbolic",form:"(x-5)(x+5)"}],structures:["difference_of_squares"],transformations:[{id:"t3",kind:"factor",from:"x²-25",to:"(x-5)(x+5)",reason:"difference of squares"}],goals:["structure","representation","transfer"],curricula:["GLOBAL"]};
assert(strategiesFor(arithmetic).some(x=>x.id==="round_compensation"));
assert(strategiesFor(algebra).some(x=>x.id==="difference_squares"));
console.log("math engine core: PASS");
