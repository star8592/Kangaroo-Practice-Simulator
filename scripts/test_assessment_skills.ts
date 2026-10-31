import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import initSqlJs from "sql.js";
import {REASONING_ITEMS,REASONING_DOMAINS,scoreReasoning,validateReasoningBank} from "../src/lib/reasoning-practice";
import {SQL_TASKS,SQL_FIXTURES,normalizeReadOnlySql,validateSqlTaskRegistry,gradeSqlWithEngine} from "../src/lib/sql-practice";

async function main(){
 assert.deepEqual(validateReasoningBank(),[]);
 assert.equal(REASONING_ITEMS.length,20);
 assert.equal(REASONING_DOMAINS.length,4);
 assert.equal(scoreReasoning({}),null);
 const correct=Object.fromEntries(REASONING_ITEMS.map(q=>[q.id,q.answer]));
 const all=scoreReasoning(correct)!;
 assert.equal(all.correct,20);
 assert.equal(all.dimensions.length,4);
 assert(all.dimensions.every(d=>d.correct===5 && d.total===5));
 const wrong={...correct,[REASONING_ITEMS[0].id]:(REASONING_ITEMS[0].answer+1)%4};
 assert.equal(scoreReasoning(wrong)!.correct,19);
 assert.equal(scoreReasoning(wrong)!.items.filter(r=>!r.correct).length,1);
 assert.throws(()=>scoreReasoning({...correct,[REASONING_ITEMS[0].id]:-1}),/INVALID_OBJECTIVE_ANSWER/);
 assert.throws(()=>scoreReasoning({...correct,extra:2}),/INVALID_OBJECTIVE_ANSWER/);
 const incomplete={...correct};delete incomplete[REASONING_ITEMS[0].id];
 assert.equal(scoreReasoning(incomplete),null);
 assert.deepEqual(validateSqlTaskRegistry(),[]);
 assert.equal(SQL_TASKS.length,4);
 assert.equal(SQL_FIXTURES.length,2);
 const wasm=path.resolve("public/assessment-center/sql-wasm.wasm");
 assert(fs.statSync(wasm).size>600_000,"WASM bundled with app");
 const engine=await initSqlJs({locateFile:()=>wasm});
 for(const task of SQL_TASKS){
  const result=gradeSqlWithEngine(engine,task.id,task.referenceSql);
  assert.equal(result.correct,true,task.id+" reference is actually executable");
  assert.equal(result.fixturesChecked,2,task.id+" verified across datasets");
  assert(result.sample&&result.sample.values.length>0);
  assert.deepEqual(result.sample!.columns,[...task.expectedColumns]);
 }
 const wrongFilter=gradeSqlWithEngine(engine,"sql-filter","SELECT order_id, amount FROM orders WHERE amount>=100 ORDER BY amount DESC,order_id ASC");
 assert.equal(wrongFilter.correct,false,"no status filter must fail");
 assert.equal(wrongFilter.fixturesChecked,1);
 const hardcoded=gradeSqlWithEngine(engine,"sql-filter","SELECT order_id, amount FROM orders WHERE order_id IN (101,104,108) ORDER BY amount DESC,order_id ASC");
 assert.equal(hardcoded.correct,false,"hardcoded first dataset not generalizable");
 assert.equal(hardcoded.fixturesChecked,2);
 assert.throws(()=>normalizeReadOnlySql("DELETE FROM orders"),/ONLY_ONE_READ_ONLY_SELECT/);
 assert.throws(()=>normalizeReadOnlySql("SELECT * FROM orders; DROP TABLE orders"),/ONLY_ONE_READ_ONLY_SELECT/);
 assert.throws(()=>normalizeReadOnlySql("SELECT * FROM orders -- bypass"),/ONLY_ONE_READ_ONLY_SELECT/);
 assert.throws(()=>normalizeReadOnlySql("SELECT "+"x".repeat(1501)),/SQL_MAX_LENGTH/);
 assert.throws(()=>gradeSqlWithEngine(engine,"undefined-task","SELECT 1"),/UNKNOWN_TASK/);
 assert.throws(()=>gradeSqlWithEngine(engine,"sql-filter","SELECT * FROM unknown_table"),/no such table/);
 for(const file of ["src/app/assessment-center/reasoning-practice-20/page.tsx","src/app/assessment-center/sql-lab/page.tsx",
 "src/components/ReasoningPracticeClient.tsx","src/components/SqlPracticeClient.tsx","src/workers/sql-practice.worker.ts"]){
  assert(fs.existsSync(file),file);
 }
 const sqlUi=fs.readFileSync("src/components/SqlPracticeClient.tsx","utf8");
 assert(sqlUi.includes("new Worker("),"execute untrusted SQL off the main thread");
 assert(sqlUi.includes("12000"),"worker must have timeout");
 assert(!/fetch\(|XMLHttpRequest|localStorage|sessionStorage/.test(sqlUi),"no answer upload/persistence");
 const worker=fs.readFileSync("src/workers/sql-practice.worker.ts","utf8");
 assert(worker.includes("gradeSqlWithEngine"),"shared deterministic scorer");
 console.log("ASSESSMENT_SKILLS=PASS reasoning=20/4 sql_tasks=4 sqlite_real_execution=PASS fixtures=2 query_only=ON sandbox=WORKER");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
