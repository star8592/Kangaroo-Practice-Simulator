import {runSourceWatch} from "../src/lib/competition-source-watch";
async function main(){
  const result=await runSourceWatch();
  console.log("SOURCE_WATCH="+JSON.stringify(result));
  // A 403/503 from one official site is degraded coverage, not a crash of
  // the other successfully checkpointed sources. Keep health.errors visible
  // to the readiness gate and administrative queue; systemic outage still fails.
  if(result.errors>0){
    console.error("SOURCE_WATCH_DEGRADED="+JSON.stringify({
      failed:result.details.filter(x=>x.result.startsWith("error:")),
      successful:result.checked-result.errors,
    }));
    if(result.errors===result.checked)process.exitCode=2;
  }
}
main().catch(e=>{console.error("SOURCE_WATCH_ERROR",e instanceof Error?e.message:"unknown");process.exitCode=1;});
