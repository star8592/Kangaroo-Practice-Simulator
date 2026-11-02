/** Test-only reference implementations; not part of client bundle. */
export const ENGINEERING_TRACK_REFERENCE:Readonly<Record<string,string>>={
  "fe-search": "function normalizeSearchTerms(text){const raw=text.trim().toLowerCase();return raw?[...new Set(raw.split(/\\s+/))]:[]}",
  "fe-form": "function validateSignupForm(f){const errors=[];const name=f.username.trim();if(name.length<2||name.length>12)errors.push('username');if(!/^1[3-9]\\d{9}$/.test(f.phone))errors.push('phone');if(f.consent!==true)errors.push('consent');return {valid:errors.length===0,errors}}",
  "fe-products": "function visibleProductIds(x){return x.products.filter(p=>p.stock>=x.minStock).slice().sort((a,b)=>a.price===b.price?a.id-b.id:(x.sort==='asc'?a.price-b.price:b.price-a.price)).map(p=>p.id)}",
  "fe-selection": "function updateSelectedIds(x){if(x.action.type==='clear')return [];const id=x.action.id;if(x.selected.includes(id))return x.selected.filter(v=>v!==id);return x.selected.length>=x.max?[...x.selected]:[...x.selected,id]}",
  "be-pages": "function paginateRecordIds(x){return {items:x.ids.slice((x.page-1)*x.pageSize,x.page*x.pageSize),total:x.ids.length,pages:Math.ceil(x.ids.length/x.pageSize)}}",
  "be-access": "function canEditDocument(x){return x.user.active===true&&x.document.locked!==true&&(x.user.role==='admin'||x.user.id===x.document.ownerId)}",
  "be-webhook": "function acceptedPaymentEventIds(events){const seen=new Set();const ans=[];for(const e of events){if(e.type==='payment.succeeded'&&typeof e.eventId==='string'&&e.eventId&&!seen.has(e.eventId)){seen.add(e.eventId);ans.push(e.eventId)}}return ans}",
  "be-limit": "function allowRequests(x){const allowed=[];const timestamps=[];for(const t of x.timestamps){while(timestamps.length&&t-timestamps[0]>=x.windowMs)timestamps.shift();const ok=timestamps.length<x.limit;allowed.push(ok);if(ok)timestamps.push(t)}return allowed}",
  "qa-coverage": "function missingApiCoverage(x){const covered=new Set(x.covered);return [...new Set(x.required.filter(k=>!covered.has(k)))].sort()}",
  "qa-errors": "function rankErrorMessages(logs){const counts=new Map();for(const row of logs){if(row.level!=='ERROR'&&row.level!=='FATAL')continue;const message=row.message.trim();if(!message)continue;counts.set(message,(counts.get(message)||0)+1)}return [...counts].map(([message,count])=>({message,count})).sort((a,b)=>b.count-a.count||(a.message<b.message?-1:a.message>b.message?1:0))}",
  "qa-slo": "function countSloBreaches(x){return x.values.filter(v=>v<x.minAvailability).length}",
  "qa-escalation": "function urgentIncidentIds(events){const sorted=events.filter(e=>e.status==='open'&&(e.severity==='P0'||e.severity==='P1')).slice().sort((a,b)=>a.severity===b.severity?(a.id<b.id?-1:a.id>b.id?1:0):(a.severity==='P0'?-1:1));return [...new Set(sorted.map(e=>e.id))]}"
};
