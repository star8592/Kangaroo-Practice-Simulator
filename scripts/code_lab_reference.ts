/** Test-only reference solutions. Not imported by the public app. */
export const CODE_LAB_REFERENCE:Readonly<Record<string,string>>={
  "paid-orders": "function normalizePaidOrderIds(orders){return [...new Set(orders.filter(x=>x.status==='paid'&&Number.isInteger(x.id)&&x.id>0).map(x=>x.id))].sort((a,b)=>a-b)}",
  "payment-rollup": "function aggregatePayments(orders){const result={paidCount:0,paidTotal:0,refundedTotal:0};for(const o of orders){if(o.status==='paid'){result.paidCount++;result.paidTotal+=o.amount;}else if(o.status==='refunded')result.refundedTotal+=o.amount;}return result}",
  "retry-backoff": "function retryBackoff(retryCount){return Array.from({length:retryCount},(_,i)=>Math.min(100*2**i,800))}",
  "flaky-tests": "function findFlakyTests(tests){return tests.filter(t=>t.runs.includes(true)&&t.runs.includes(false)).map(t=>t.name).sort()}",
  "error-logs": "function summarizeErrorLogs(records){const m=new Map();for(const r of records)if(r.level==='ERROR')m.set(r.service,(m.get(r.service)||0)+1);return [...m].map(([service,count])=>({service,count})).sort((a,b)=>a.service<b.service?-1:a.service>b.service?1:0)}",
  "inventory-deltas": "function applyInventoryDeltas(events){const m=new Map();for(const e of events)m.set(e.sku,(m.get(e.sku)||0)+e.delta);return [...m].map(([sku,total])=>({sku,total})).sort((a,b)=>a.sku<b.sku?-1:a.sku>b.sku?1:0)}"
};
