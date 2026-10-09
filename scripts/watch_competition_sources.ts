import {runSourceWatch} from "../src/lib/competition-source-watch";
async function main(){
  const result=await runSourceWatch();
  console.log("SOURCE_WATCH="+JSON.stringify(result));
  if(result.errors>0)process.exitCode=1;
}
main().catch(e=>{console.error("SOURCE_WATCH_ERROR",e instanceof Error?e.message:"unknown");process.exitCode=1;});
