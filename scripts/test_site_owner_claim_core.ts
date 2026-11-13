import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { PublicParent } from "../src/lib/parent-auth";

const dir = fs.mkdtempSync(path.join(os.tmpdir(),"socthink-site-owner-core-"));
process.env.SOCTHINK_USER_DATA_DIR = dir;

async function run() {
  const mod = await import("../src/lib/site-owner");
  const parent: PublicParent = {
    id:"par_"+"a".repeat(18), name:"Owner",role:"parent",active:true,
    sessionVersion:1,termsAcceptedAt:1,guardianConfirmedAt:1,createdAt:1,
    wechatId:"wx-owner-local",
  };
  const outsider: PublicParent = {
    ...parent,id:"par_"+"b".repeat(18),wechatId:"wx-another",
  };
  assert.equal(mod.hasSiteOwnerBinding(),false);
  assert.equal(mod.isSiteOwner(parent),false);
  const bound=mod.bindSiteOwner({parent,email:"Owner@Example.Org",adminId:"adm_local"});
  assert.equal(bound.contactEmail,"owner@example.org");
  assert.equal(bound.emailVerifiedAt,null);
  assert.equal(mod.hasSiteOwnerBinding(),true);
  assert.equal(mod.isSiteOwner(parent),true);
  assert.equal(mod.isSiteOwner(outsider),false);
  assert.equal(mod.verifySiteOwnerEmail(outsider,"owner@example.org"),false);
  assert.equal(mod.verifySiteOwnerEmail(parent,"another@example.org"),false);
  assert.equal(mod.readSiteOwner()?.emailVerifiedAt,null);
  assert.equal(mod.verifySiteOwnerEmail(parent,"owner@example.org"),true);
  assert.ok(mod.readSiteOwner()?.emailVerifiedAt);
  assert.equal(fs.statSync(path.join(dir,"site-owner-binding.json")).mode & 0o777,0o600);
  assert.throws(()=>mod.bindSiteOwner({parent:outsider,email:"attacker@example.org",adminId:"other"}));
  console.log("SITE_OWNER_PENDING_EMAIL_BINDING_AND_LATER_VERIFICATION_PASS");
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>fs.rmSync(dir,{recursive:true,force:true}));
