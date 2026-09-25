import assert from "node:assert/strict";
import { authEmailStatus } from "../src/lib/auth-email";

const env=process.env as Record<string,string|undefined>;
const keys=["NODE_ENV","AUTH_EMAIL_PROVIDER","SMTP_HOST","SMTP_USER","SMTP_PASS","RESEND_API_KEY"] as const;
const before=Object.fromEntries(keys.map(k=>[k,env[k]]));
function reset(){for(const k of keys)delete env[k]}
function restore(){for(const k of keys){const v=before[k];if(v===undefined)delete env[k];else env[k]=v}}
try{
  reset();env.NODE_ENV="production";
  assert.deepEqual(authEmailStatus(),{provider:"disabled",enabled:false,productionReady:false});
  env.AUTH_EMAIL_PROVIDER="smtp";
  assert.deepEqual(authEmailStatus(),{provider:"smtp",enabled:false,productionReady:false});
  env.SMTP_HOST="smtp.exmail.qq.com";env.SMTP_USER="no-reply@example.com";env.SMTP_PASS="secret";
  assert.deepEqual(authEmailStatus(),{provider:"smtp",enabled:true,productionReady:true});
  reset();env.NODE_ENV="production";env.AUTH_EMAIL_PROVIDER="resend";
  assert.equal(authEmailStatus().productionReady,false);
  env.RESEND_API_KEY="secret";assert.equal(authEmailStatus().productionReady,true);
  reset();env.NODE_ENV="development";
  assert.deepEqual(authEmailStatus(),{provider:"outbox",enabled:true,productionReady:false});
  console.log("AUTH_EMAIL_CONFIG=PASS fail_closed=true smtp_complete=true resend_complete=true");
}finally{restore()}
