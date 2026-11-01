import {readFileSync,writeFileSync} from "node:fs";
import {buildIssuerSnapshot} from "../src/lib/career-market-import";
import type {CareerMarket} from "../src/lib/career-enterprise-universe";

/**
 * Deterministic local transformation of a lawfully downloaded official exchange
 * export. Does not crawl exchange websites or evade access controls.
 *
 * Example:
 * npx tsx scripts/import_career_market_snapshot.ts
 *   --file /tmp/official-exchange-export.csv
 *   --kind official-normalized-csv --exchange HKEX
 *   --as-of 2026-11-01
 *   --source-url https://www.hkex.com.hk/Services/Trading/Securities/Securities-Lists
 *   --out /tmp/issuer-candidates.json
 *
 * CSV schema is exact: code,issuer_name,security_type (EQUITY only).
 */
function getArgs(args:string[]){
  const options=new Map<string,string>();
  for(let i=0;i<args.length;i++){
    if(!args[i].startsWith("--")||!args[i+1]||args[i+1].startsWith("--"))
      throw Error("INVALID_ARGUMENTS");
    options.set(args[i].slice(2),args[i+1]);i++;
  }
  for(const k of ["file","kind","as-of","source-url","out"]){
    if(!options.get(k))throw Error("MISSING_"+k.toUpperCase());
  }
  const kind=options.get("kind");
  if(kind!=="sec-json"&&kind!=="official-normalized-csv")
    throw Error("INVALID_SOURCE_KIND");
  const exchange=options.get("exchange")?.toUpperCase();
  const supported=["SSE","SZSE","BSE","HKEX","NYSE","NASDAQ"];
  if(kind==="official-normalized-csv"&&!supported.includes(exchange||""))
    throw Error("INVALID_EXCHANGE");
  return {
    file:options.get("file")!,out:options.get("out")!,
    sourceUrl:options.get("source-url")!,snapshotAt:options.get("as-of")!,
    sourceType:kind as "sec-json"|"official-normalized-csv",
    exchange:exchange as CareerMarket|undefined
  };
}
try{
  const args=getArgs(process.argv.slice(2));
  const snapshot=buildIssuerSnapshot({
    input:readFileSync(args.file,"utf8"),sourceType:args.sourceType,
    sourceUrl:args.sourceUrl,snapshotAt:args.snapshotAt,exchange:args.exchange,
  });
  writeFileSync(args.out,JSON.stringify(snapshot,null,2)+"\n",{flag:"wx"});
  console.log("MARKET_IMPORT_STAGED=YES",JSON.stringify(snapshot.statistics),
    "output="+args.out);
}catch(e){
  console.error("MARKET_IMPORT_FAILED",e instanceof Error?e.message:String(e));
  process.exitCode=1;
}
