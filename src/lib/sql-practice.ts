/**
 * Real, deterministic SQLite skills practice with in-memory fixture databases.
 * NOT a credential or validated employment selection test.
 * The SQL runs in an isolated browser Worker with a timeout and query_only mode.
 */
import type initSqlJs from "sql.js";
type SqlModule=Awaited<ReturnType<typeof initSqlJs>>;
export type SQLValue=number|string|null;
export type SQLTable={columns:string[];values:SQLValue[][]};
export type SqlTask={
 id:string;name:string;concept:string;requirement:string;starter:string;hint:string;
 expectedColumns:readonly string[];referenceSql:string;
};
export const SQL_SCHEMA={
  customers:"CREATE TABLE customers(customer_id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT NULL)",
  orders:"CREATE TABLE orders(order_id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL, amount INTEGER NOT NULL, status TEXT NOT NULL, channel TEXT NOT NULL, ordered_at TEXT NOT NULL)",
} as const;
export const SQL_FIXTURES:readonly {
  customers:readonly (readonly [number,string,string])[];
  orders:readonly (readonly [number,number,number,string,string,string])[];
}[]=[
 {customers:[[1,"阿岚","武汉"],[2,"小宁","上海"],[3,"小树","武汉"],[4,"阿辰","广州"],[5,"小音","成都"]],
 orders:[[101,1,120,"paid","wechat","2026-10-01"],[102,2,80,"paid","wechat","2026-10-01"],
 [103,1,50,"refunded","wechat","2026-10-02"],[104,3,200,"paid","alipay","2026-10-02"],
 [105,4,150,"pending","wechat","2026-10-03"],[106,2,90,"paid","alipay","2026-10-03"],
 [107,5,70,"paid","wechat","2026-10-04"],[108,3,160,"paid","wechat","2026-10-05"]]},
 {customers:[[1,"阿岚","武汉"],[2,"小宁","上海"],[3,"小树","武汉"],[4,"阿辰","广州"],[5,"小音","成都"]],
 orders:[[201,1,30,"paid","wechat","2026-10-10"],[202,2,300,"paid","alipay","2026-10-10"],
 [203,2,45,"paid","wechat","2026-10-11"],[204,3,120,"pending","wechat","2026-10-11"],
 [205,3,220,"paid","alipay","2026-10-12"],[206,3,90,"paid","alipay","2026-10-13"],
 [207,4,60,"refunded","alipay","2026-10-14"],[208,5,180,"paid","wechat","2026-10-14"]]}
];
export const SQL_TASKS:readonly SqlTask[]=[
 {id:"sql-filter",name:"01 · 订单筛选与排序",concept:"SELECT / WHERE / ORDER BY",
 requirement:"从 orders 表筛选状态为 paid 且金额不低于100的订单，只输出 order_id 和 amount 两列，按金额从高到低、订单编号从小到大排列。",
 starter:"SELECT order_id, amount\nFROM orders\nWHERE ...\nORDER BY ...;",
 hint:"先写 WHERE status = 'paid' AND amount >= 100；再把 ORDER BY 写完整。",
 expectedColumns:["order_id","amount"],
 referenceSql:"SELECT order_id, amount FROM orders WHERE status='paid' AND amount>=100 ORDER BY amount DESC, order_id ASC"},
 {id:"sql-group",name:"02 · 支付渠道汇总",concept:"WHERE / GROUP BY / COUNT",
 requirement:"只统计 paid 的订单，按 channel 分组，输出 channel 和 paid_count（订单数量），按 channel 字母顺序升序排列。",
 starter:"SELECT channel, COUNT(*) AS paid_count\nFROM orders\nWHERE ...\nGROUP BY ...\nORDER BY ...;",
 hint:"COUNT(*) 统计组内记录数；先 WHERE 筛选 paid，再按 channel 分组。",
 expectedColumns:["channel","paid_count"],
 referenceSql:"SELECT channel, COUNT(*) AS paid_count FROM orders WHERE status='paid' GROUP BY channel ORDER BY channel ASC"},
 {id:"sql-join",name:"03 · 客户累计支付",concept:"JOIN / SUM / GROUP BY",
 requirement:"连接 customers 和 orders，仅计算 paid 订单。输出客户 name 和 total_paid（累计支付金额），只列出存在已支付订单的客户，按 total_paid 降序，金额相同时按 name 升序。",
 starter:"SELECT c.name, SUM(o.amount) AS total_paid\nFROM customers c\nJOIN orders o ON ...\nWHERE ...\nGROUP BY ...\nORDER BY ...;",
 hint:"使用 c.customer_id = o.customer_id 连接，再对 paid 订单按客户分组求 SUM。",
 expectedColumns:["name","total_paid"],
 referenceSql:"SELECT c.name, SUM(o.amount) AS total_paid FROM customers c JOIN orders o ON c.customer_id=o.customer_id WHERE o.status='paid' GROUP BY c.customer_id,c.name ORDER BY total_paid DESC,c.name ASC"},
 {id:"sql-having",name:"04 · 活跃付费客户",concept:"HAVING / COUNT / SUM",
 requirement:"只考虑 paid 订单，找出已支付订单至少2笔、且已支付金额合计至少150的客户。输出 customer_id、paid_count、total_paid，按总金额降序排列。",
 starter:"SELECT customer_id, COUNT(*) AS paid_count, SUM(amount) AS total_paid\nFROM orders\nWHERE ...\nGROUP BY ...\nHAVING ...\nORDER BY ...;",
 hint:"过滤订单状态用 WHERE；过滤分组汇总结果用 HAVING COUNT(*) >= 2 AND SUM(amount) >= 150。",
 expectedColumns:["customer_id","paid_count","total_paid"],
 referenceSql:"SELECT customer_id, COUNT(*) AS paid_count, SUM(amount) AS total_paid FROM orders WHERE status='paid' GROUP BY customer_id HAVING COUNT(*)>=2 AND SUM(amount)>=150 ORDER BY total_paid DESC"}
];
export type SqlCheck={correct:boolean;taskId:string;message:string;sample:SQLTable|null;fixturesChecked:number};
export function validateSqlTaskRegistry():string[]{
 const errors:string[]=[];const seen=new Set<string>();
 for(const task of SQL_TASKS){
  if(seen.has(task.id))errors.push("DUPLICATE:"+task.id);
  seen.add(task.id);
  if(!task.requirement||!task.referenceSql.toUpperCase().startsWith("SELECT")||!task.expectedColumns.length)errors.push("INVALID:"+task.id);
 }
 if(SQL_FIXTURES.length<2)errors.push("INSUFFICIENT_FIXTURES");
 return errors;
}
export function normalizeReadOnlySql(value:string):string{
 if(typeof value!=="string"||value.length>1500)throw new Error("SQL_MAX_LENGTH");
 const trimmed=value.trim().replace(/;\s*$/,"").trim();
 if(!/^(SELECT|WITH)\b/i.test(trimmed)||trimmed.includes(";")||/--|\/\*/.test(trimmed))
  throw new Error("ONLY_ONE_READ_ONLY_SELECT");
 return trimmed;
}
function loadFixture(SQL:SqlModule,index:number){
 const fixture=SQL_FIXTURES[index];const db=new SQL.Database();
 db.run(SQL_SCHEMA.customers);db.run(SQL_SCHEMA.orders);
 for(const row of fixture.customers)db.run("INSERT INTO customers (customer_id,name,city) VALUES(?,?,?)", [...row]);
 for(const row of fixture.orders)db.run("INSERT INTO orders (order_id,customer_id,amount,status,channel,ordered_at) VALUES(?,?,?,?,?,?)",[...row]);
 db.run("PRAGMA query_only=ON");
 return db;
}
function runSelect(db:InstanceType<SqlModule["Database"]>,sql:string):SQLTable{
 // db.exec() omits result metadata when a SELECT returns zero rows.
 // A prepared SELECT keeps its column names even for an empty result.
 const stmt=db.prepare(sql);
 try{
  const columns=stmt.getColumnNames();
  if(columns.length===0)throw new Error("EXPECTED_SELECT_COLUMNS");
  const values:SQLValue[][]=[];
  while(stmt.step()){
   if(values.length>=150)throw new Error("RESULT_TOO_LARGE");
   values.push(stmt.get().map(v=>v instanceof Uint8Array?new TextDecoder().decode(v):v));
  }
  return {columns,values};
 }finally{stmt.free();}
}
function tablesEqual(left:SQLTable,right:SQLTable):boolean{
 return left.columns.length===right.columns.length &&
 left.columns.every((column,i)=>column.toLowerCase()===right.columns[i].toLowerCase()) &&
 JSON.stringify(left.values)===JSON.stringify(right.values);
}
export function gradeSqlWithEngine(SQL:SqlModule,taskId:string,query:string):SqlCheck{
 const task=SQL_TASKS.find(t=>t.id===taskId);
 if(!task)throw new Error("UNKNOWN_TASK");
 const safeSql=normalizeReadOnlySql(query);
 let sample:SQLTable|null=null;
 for(let i=0;i<SQL_FIXTURES.length;i++){
  const db=loadFixture(SQL,i);
  try{
   const expected=runSelect(db,task.referenceSql);
   const actual=runSelect(db,safeSql);
   if(i===0)sample=actual;
   if(!tablesEqual(actual,expected))
    return {correct:false,taskId,message:i===0?"结果与要求不一致。请核对过滤条件、列名与排序。":"第一组数据通过，但换一组订单后结果不符。请检查 SQL 是否真正表达了业务规则。",sample,fixturesChecked:i+1};
  }finally{db.close();}
 }
 return {correct:true,taskId,message:"通过两组独立数据的真实 SQLite 执行与结果核对。",sample,fixturesChecked:SQL_FIXTURES.length};
}
