import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import path from "node:path";
const cli=path.resolve("node_modules/playwright/cli.js");
const cases=[
 {name:"external https default 443",url:"https://socthink.cn",external:"1",success:true},
 {name:"external http default 80",url:"http://example.org",external:"1",success:true},
 {name:"external custom port",url:"https://example.org:8443",external:"1",success:true},
 {name:"local 4318",url:"http://127.0.0.1:4318",external:"",success:true},
 {name:"local forbidden port 80",url:"http://127.0.0.1:80",external:"",success:false,error:"INVALID_E2E_PORT"},
 {name:"local non-loopback",url:"http://example.org:4318",external:"",success:false,error:"LOCAL_E2E_REQUIRES_LOOPBACK_ORIGIN"},
 {name:"local https disallowed",url:"https://127.0.0.1:4318",external:"",success:false,error:"LOCAL_E2E_REQUIRES_LOOPBACK_ORIGIN"},
 {name:"external file protocol",url:"file:///tmp/file",external:"1",success:false,error:"INVALID_E2E_ORIGIN"},
];
for(const item of cases){
 const proc=spawnSync(process.execPath,[cli,"test","--list","tests/e2e/measurement-center.spec.ts"],{
  cwd:process.cwd(),env:{...process.env,E2E_BASE_URL:item.url,E2E_EXTERNAL_SERVER:item.external},
  encoding:"utf8",timeout:20000,maxBuffer:1_000_000,
 });
 if(proc.error)throw proc.error;
 const output=(proc.stdout||"")+"\n"+(proc.stderr||"");
 assert.equal(proc.status===0,item.success,item.name+" exit "+proc.status+" output:"+output.slice(-500));
 if(item.error)assert(output.includes(item.error),item.name+" should return "+item.error);
}
console.log("E2E_ORIGIN=PASS external_https=443 external_http=80 local_high_port=YES invalid_rejected=YES cases="+cases.length);
