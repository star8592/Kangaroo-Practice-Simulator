/** Original SOCTHINK software-engineering work-sample exercises, 2026-11-02.
 * Free learning tasks, not a standardized hiring instrument or certificate.
 * Cases are client-shipped and are NOT tamper-proof private test vectors.
 */
export type CodeCase={input:unknown;expected:unknown;label:string};
export type CodeChallenge={
 id:string;title:string;domain:string;description:string;
 functionName:string;signature:string;starter:string;hint:string;
 cases:readonly CodeCase[];
};
export const CODE_LAB_VERSION="code-lab-original-20261102-v1";
export const CODE_CHALLENGES:readonly CodeChallenge[]=[
 {id:"paid-orders",title:"01 · 修正有效订单筛选",domain:"数据处理",functionName:"normalizePaidOrderIds",
  signature:"normalizePaidOrderIds(orders) → number[]",
  description:"将订单列表转换为去重、升序排列的有效已付款订单ID。仅保留status严格等于paid、id为正整数的订单；忽略其他记录。",
  starter:"function normalizePaidOrderIds(orders) {\n  // 返回去重、升序的订单ID数组\n  return [];\n}",hint:"先过滤条件，再用Set去重，最后使用(a,b)=>a-b做数值升序排序。",
  cases:[
   {label:"基础样例",input:[{id:8,status:"paid"},{id:2,status:"pending"},{id:3,status:"paid"},{id:8,status:"paid"}],expected:[3,8]},
   {label:"边界：空列表",input:[],expected:[]},
   {label:"边界：无效ID",input:[{id:-1,status:"paid"},{id:0,status:"paid"},{id:2.5,status:"paid"},{id:12,status:"paid"},{id:"15",status:"paid"}],expected:[12]},
   {label:"边界：数值排序",input:[{id:10,status:"paid"},{id:2,status:"paid"},{id:20,status:"refunded"},{id:2,status:"paid"}],expected:[2,10]},
  ]},
 {id:"payment-rollup",title:"02 · 付款与退款金额统计",domain:"数据计算",functionName:"aggregatePayments",
  signature:"aggregatePayments(orders) → {paidCount,paidTotal,refundedTotal}",
  description:"根据状态统计真实已付款笔数、付款金额和退款金额。金额字段amount为非负整数；paid计入笔数与付款总额，refunded仅计退款额，pending不计入。",
  starter:"function aggregatePayments(orders) {\n  return { paidCount: 0, paidTotal: 0, refundedTotal: 0 };\n}",hint:"先初始化三个统计值；0元paid订单仍是一笔有效付款；不要把退款总额与付款总额直接相减。",
  cases:[
   {label:"基础样例",input:[{status:"paid",amount:120},{status:"refunded",amount:30},{status:"paid",amount:50},{status:"pending",amount:500}],expected:{paidCount:2,paidTotal:170,refundedTotal:30}},
   {label:"边界：无订单",input:[],expected:{paidCount:0,paidTotal:0,refundedTotal:0}},
   {label:"边界：零元支付",input:[{status:"paid",amount:0},{status:"refunded",amount:100},{status:"pending",amount:100}],expected:{paidCount:1,paidTotal:0,refundedTotal:100}},
   {label:"边界：多笔交易",input:[{status:"paid",amount:1000},{status:"paid",amount:12},{status:"refunded",amount:8},{status:"refunded",amount:2},{status:"cancelled",amount:200}],expected:{paidCount:2,paidTotal:1012,refundedTotal:10}},
  ]},
 {id:"retry-backoff",title:"03 · 实现指数重试退避",domain:"服务可靠性",functionName:"retryBackoff",
  signature:"retryBackoff(retryCount) → number[]",
  description:"输出retryCount次重试等待毫秒数：首次100ms，随后每次翻倍，上限800ms。输入为0至6的整数，返回的数组长度必须等于retryCount。",
  starter:"function retryBackoff(retryCount) {\n  return [];\n}",hint:"第i次等待时间用Math.min(100 * 2**i, 800)。注意0次重试的情况。",
  cases:[
   {label:"基础样例",input:4,expected:[100,200,400,800]},
   {label:"边界：不重试",input:0,expected:[]},
   {label:"边界：最大重试次数",input:6,expected:[100,200,400,800,800,800]},
   {label:"边界：一次",input:1,expected:[100]},
  ]},
 {id:"flaky-tests",title:"04 · 识别不稳定自动测试",domain:"测试工程",functionName:"findFlakyTests",
  signature:"findFlakyTests(tests) → string[]",
  description:"给每个测试提供name和历史执行布尔数组runs。若同一测试既出现true也出现false，则判为flaky。按测试名的Unicode字典序返回不稳定测试名称。全成功或全失败并非flaky。",
  starter:"function findFlakyTests(tests) {\n  return [];\n}",hint:"使用runs.includes(true)&&runs.includes(false)；结果使用.sort()。",
  cases:[
   {label:"基础样例",input:[{name:"login",runs:[true,false,true]},{name:"pay",runs:[false,false]},{name:"search",runs:[true,true]}],expected:["login"]},
   {label:"边界：没有历史",input:[{name:"a",runs:[]},{name:"b",runs:[true]}],expected:[]},
   {label:"边界：多项排序",input:[{name:"z-test",runs:[false,true]},{name:"a-test",runs:[true,false]},{name:"stable",runs:[false,false]}],expected:["a-test","z-test"]},
   {label:"边界：只有单次失败",input:[{name:"unit",runs:[false]},{name:"e2e",runs:[true,false,false]},{name:"api",runs:[false,false,true]}],expected:["api","e2e"]},
  ]},
 {id:"error-logs",title:"05 · 从生产日志汇总故障",domain:"故障诊断",functionName:"summarizeErrorLogs",
  signature:"summarizeErrorLogs(records) → {service,count}[]",
  description:"只统计level严格为ERROR的日志条数，按service归组，输出[{service,count}]数组，按service升序排列。INFO和WARN不应计入，零错误的服务不出现。",
  starter:"function summarizeErrorLogs(records) {\n  return [];\n}",hint:"用Map统计service对应的ERROR条数，最后把键值对转对象数组并.sort((a,b)=>a.service<b.service?-1:...)。",
  cases:[
   {label:"基础样例",input:[{service:"api",level:"ERROR"},{service:"web",level:"INFO"},{service:"api",level:"WARN"},{service:"db",level:"ERROR"}],expected:[{service:"api",count:1},{service:"db",count:1}]},
   {label:"边界：无错误",input:[{service:"web",level:"WARN"},{service:"api",level:"INFO"}],expected:[]},
   {label:"边界：重复计数",input:[{service:"z",level:"ERROR"},{service:"a",level:"ERROR"},{service:"z",level:"ERROR"},{service:"z",level:"WARN"}],expected:[{service:"a",count:1},{service:"z",count:2}]},
   {label:"边界：大小写严格",input:[{service:"api",level:"error"},{service:"api",level:"ERROR"},{service:"cache",level:"ERROR"}],expected:[{service:"api",count:1},{service:"cache",count:1}]},
  ]},
 {id:"inventory-deltas",title:"06 · 处理库存变更事件",domain:"事件处理",functionName:"applyInventoryDeltas",
  signature:"applyInventoryDeltas(events) → {sku,total}[]",
  description:"按SKU对事件中的delta整数累加（可以是负数）；输出每种出现过的sku及最终净变化total，按sku的Unicode字典序升序排列。净变化为0的SKU也必须保留。",
  starter:"function applyInventoryDeltas(events) {\n  return [];\n}",hint:"创建Map记录SKU的累计变化，注意不能因为总变化为0就删除该SKU。",
  cases:[
   {label:"基础样例",input:[{sku:"B",delta:3},{sku:"A",delta:5},{sku:"B",delta:-1}],expected:[{sku:"A",total:5},{sku:"B",total:2}]},
   {label:"边界：空输入",input:[],expected:[]},
   {label:"边界：净变化为零",input:[{sku:"x",delta:7},{sku:"x",delta:-7},{sku:"y",delta:0}],expected:[{sku:"x",total:0},{sku:"y",total:0}]},
   {label:"边界：负值与排序",input:[{sku:"z",delta:-2},{sku:"a",delta:8},{sku:"z",delta:-5},{sku:"a",delta:-3}],expected:[{sku:"a",total:5},{sku:"z",total:-7}]},
  ]},
];
export function validateCodeLab():string[]{
 const errs:string[]=[];const seen=new Set<string>();
 if(CODE_CHALLENGES.length!==6)errs.push("EXPECTED_6_CHALLENGES");
 for(const task of CODE_CHALLENGES){
  if(seen.has(task.id))errs.push("DUPLICATE_ID:"+task.id);seen.add(task.id);
  if(task.cases.length<4)errs.push("INSUFFICIENT_CASES:"+task.id);
  if(!task.starter.includes("function "+task.functionName+"(")||!task.description||!task.hint)errs.push("INVALID_TASK:"+task.id);
 }
 return errs;
}
