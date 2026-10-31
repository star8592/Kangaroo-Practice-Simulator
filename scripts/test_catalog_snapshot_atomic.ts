import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type {TrainingCatalogSnapshot} from "./lib/catalog-snapshot-atomic";
import {writeCatalogSnapshotAtomic} from "./lib/catalog-snapshot-atomic";

const root=fs.mkdtempSync(path.join(os.tmpdir(),"socthink-catalog-snapshot-test-"));
const filename=path.join(root,"catalog.json");
try{
  const row={
    id:"synthetic-1",titleZh:"测试卷",titleEn:"Synthetic paper",
    competition:"test",competitionZh:"测试",year:2026,gradeBand:"1-2",
    gradeZh:"一年级",gradeEn:"Grade 1",paperType:"sample" as const,
    questionCount:1,durationMinutes:10,examUrl:"/exam/synthetic-1"
  };
  const before:TrainingCatalogSnapshot={
    version:1,generatedAt:"2026-10-31T00:00:00.000Z",rows:[row],
  };
  const r1=writeCatalogSnapshotAtomic(filename,before);
  assert.equal(r1.rows,1);
  assert.equal(fs.statSync(filename).mode&0o777,0o600);
  assert.deepEqual(JSON.parse(fs.readFileSync(filename,"utf8")),before);
  assert.throws(()=>writeCatalogSnapshotAtomic(filename,{...before,rows:[]}),/empty/);
  assert.deepEqual(JSON.parse(fs.readFileSync(filename,"utf8")),before);
  assert.throws(()=>writeCatalogSnapshotAtomic(filename,{...before,rows:[row,row]}),/Duplicate/);
  const after:TrainingCatalogSnapshot={...before,generatedAt:"2026-10-31T01:00:00.000Z",
    rows:[row,{...row,id:"synthetic-2",examUrl:"/exam/synthetic-2"}]};
  const r2=writeCatalogSnapshotAtomic(filename,after);
  assert.equal(r2.rows,2);
  assert.deepEqual(JSON.parse(fs.readFileSync(filename,"utf8")),after);
  assert.equal(fs.readdirSync(root).join(","),"catalog.json");
  console.log("CATALOG_ATOMIC_PUBLISH=PASS rowsBefore=1 rowsAfter=2 mode=0600");
}finally{
  fs.rmSync(root,{recursive:true,force:true});
}
