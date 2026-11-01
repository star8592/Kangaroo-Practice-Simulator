import {createHash} from "node:crypto";
import {enterpriseIdForMarketTicker,type CareerMarket} from "./career-enterprise-universe";

/** Market source ingestion creates issuer CANDIDATES only, never live vacancies. */
export type IssuerCandidate=Readonly<{
  exchange:CareerMarket;
  ticker:string;
  issuerName:string;
  verifiedChinaEntityId:string|null;
  evidenceLevel:"listing_candidate";
}>;

function cleanName(value:string):string{
  return Array.from(value,ch=>ch.charCodeAt(0)<32?" ":ch).join("").replace(/\s+/g," ").trim().slice(0,250);
}

/** RFC4180 basic CSV reader, used only for standardized CSV exported from official lists. */
export function parseIssuerCsv(raw:string):string[][]{
  const rows:string[][]=[];
  let cell="",row:string[]=[],quoted=false;
  const s=raw.replace(/^\uFEFF/,"");
  for(let i=0;i<s.length;i++){
    const ch=s[i];
    if(ch==='"'){
      if(quoted&&s[i+1]==='"'){cell+='"';i++;}
      else if(!quoted&&cell==="")quoted=true;
      else if(quoted)quoted=false;
      else cell+=ch;
    }else if(ch===","&&!quoted){row.push(cell);cell="";}
    else if((ch==="\n"||ch==="\r")&&!quoted){
      if(ch==="\r"&&s[i+1]==="\n")i++;
      row.push(cell);if(row.some(c=>c.trim()))rows.push(row);
      row=[];cell="";
    }else{cell+=ch;}
  }
  if(quoted)throw Error("CSV_UNTERMINATED_QUOTE");
  row.push(cell);if(row.some(c=>c.trim()))rows.push(row);
  return rows;
}

export function importOfficialIssuerCsv(content:string,exchange:CareerMarket):IssuerCandidate[]{
  const rows=parseIssuerCsv(content);
  if(!rows.length)throw Error("EMPTY_CSV");
  const hdr=rows.shift()!.map(x=>x.trim().toLowerCase());
  const codeIndex=hdr.indexOf("code");
  const nameIndex=hdr.indexOf("issuer_name");
  const typeIndex=hdr.indexOf("security_type");
  if(codeIndex<0||nameIndex<0||typeIndex<0)
    throw Error("CSV_REQUIRED_COLUMNS:code,issuer_name,security_type");
  const byKey=new Map<string,IssuerCandidate>();
  for(const row of rows){
    const ticker=(row[codeIndex]||"").trim().toUpperCase();
    const issuerName=cleanName(row[nameIndex]||"");
    const type=(row[typeIndex]||"").trim().toUpperCase();
    if(type!=="EQUITY")continue; // No ETFs, warrants, funds, CBBCs.
    if(!/^[0-9A-Z]{1,12}$/.test(ticker)||!issuerName)continue;
    const key=exchange+":"+ticker;
    if(!byKey.has(key))byKey.set(key,{
      exchange,ticker,issuerName,
      verifiedChinaEntityId:enterpriseIdForMarketTicker(exchange,ticker),
      evidenceLevel:"listing_candidate",
    });
  }
  return [...byKey.values()].sort((a,b)=>a.ticker.localeCompare(b.ticker));
}

/** SEC public JSON format: {fields:['cik','name','ticker','exchange'],data:[...]}.
 * Do not label all US issuers as Chinese or infer China activity from the name.
 */
export function importSecTickerExchangeJson(raw:string):IssuerCandidate[]{
  const parsed=JSON.parse(raw) as {fields?:unknown,data?:unknown};
  if(!Array.isArray(parsed.fields)||!Array.isArray(parsed.data))
    throw Error("SEC_FORMAT_INVALID");
  const fields=parsed.fields.map(String);
  const iName=fields.indexOf("name"),iTicker=fields.indexOf("ticker"),
    iExchange=fields.indexOf("exchange");
  if([iName,iTicker,iExchange].some(i=>i<0))throw Error("SEC_REQUIRED_COLUMNS_MISSING");
  const byKey=new Map<string,IssuerCandidate>();
  for(const record of parsed.data){
    if(!Array.isArray(record))continue;
    const market=String(record[iExchange]||"").trim().toUpperCase();
    const exchange=market==="NASDAQ"?"NASDAQ":market==="NYSE"?"NYSE":null;
    if(!exchange)continue;
    const ticker=String(record[iTicker]||"").trim().toUpperCase();
    const issuerName=cleanName(String(record[iName]||""));
    if(!/^[0-9A-Z.-]{1,16}$/.test(ticker)||!issuerName)continue;
    const key=exchange+":"+ticker;
    if(!byKey.has(key))byKey.set(key,{
      exchange,ticker,issuerName,
      verifiedChinaEntityId:enterpriseIdForMarketTicker(exchange,ticker),
      evidenceLevel:"listing_candidate",
    });
  }
  return [...byKey.values()].sort((a,b)=>
    a.exchange.localeCompare(b.exchange)||a.ticker.localeCompare(b.ticker));
}

export function buildIssuerSnapshot(params:{
  input:string;
  sourceUrl:string;
  snapshotAt:string;
  sourceType:"sec-json"|"official-normalized-csv";
  exchange?:CareerMarket;
}){
  if(!/^https:\/\//.test(params.sourceUrl))throw Error("OFFICIAL_SOURCE_URL_REQUIRED");
  if(!/^20\d{2}-\d{2}-\d{2}$/.test(params.snapshotAt))throw Error("SNAPSHOT_DATE_INVALID");
  const records=params.sourceType==="sec-json"?
    importSecTickerExchangeJson(params.input):
    importOfficialIssuerCsv(params.input,params.exchange??(():never=>{throw Error("EXCHANGE_REQUIRED");})());
  return {
    schema:"socthink-listed-issuer-candidates-v1",
    sourceType:params.sourceType,
    sourceUrl:params.sourceUrl,
    snapshotAt:params.snapshotAt,
    sourceSha256:createHash("sha256").update(params.input).digest("hex"),
    statistics:{
      issuerSecurityCandidates:records.length,
      linkedToVerifiedChinaEntities:records.filter(x=>x.verifiedChinaEntityId).length,
      unclassified:records.filter(x=>!x.verifiedChinaEntityId).length,
    },
    records,
    disclaimer:"Unclassified securities are NOT confirmed Chinese enterprises or employers. No JD, job opening or training product inferred from this output.",
  };
}
