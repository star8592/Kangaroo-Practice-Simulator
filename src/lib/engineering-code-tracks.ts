/**
 * Original engineering role-specific coding work samples, 2026-11-02.
 * Pure one-argument JavaScript functions executed by the existing QuickJS sandbox.
 * Public learning cases, not licensed enterprise exam questions or hidden tests.
 */
import type {CodeChallenge} from "./code-lab";
export const ENGINEERING_TRACK_VERSION="engineering-tracks-20261102-v1";
export type EngineeringTrackId="frontend"|"backend"|"qa";
export type EngineeringTrack={
 id:EngineeringTrackId;name:string;subtitle:string;summary:string;
 focus:string;challenges:readonly CodeChallenge[];
};
export const ENGINEERING_TRACKS:Record<EngineeringTrackId,EngineeringTrack>={
 frontend:{
  id:"frontend",name:"前端工程师 · JavaScript实操",subtitle:"前端数据与交互逻辑",
  summary:"将真实交互需求转成可测试的JavaScript函数，涵盖搜索词处理、表单校验、商品列表和选择状态。只考当前独立函数，不假装已实现浏览器DOM或React项目题。",
  focus:"前端",challenges:[
   {id:"fe-search",title:"01 · 规范化搜索关键词",domain:"前端数据处理",functionName:"normalizeSearchTerms",
    signature:"normalizeSearchTerms(text) → string[]",
    description:"将搜索框输入去除首尾空白、转小写，按一个或多个空白字符分词；去掉重复词但保留首次出现顺序。空输入返回空数组。输入是普通字符串。",
    starter:"function normalizeSearchTerms(text) {\n  return [];\n}",
    hint:"用trim().toLowerCase().split(/\\s+/)得到词，再用Set按首次出现顺序去重。",
    cases:[
     {label:"大小写与重复词",input:"  React   JS react  ",expected:["react","js"]},
     {label:"空白输入",input:"  \n\t  ",expected:[]},
     {label:"换行与制表符",input:"API\tapi\nSQL sql UI",expected:["api","sql","ui"]},
     {label:"中文和混合搜索",input:"  武汉  React 武汉 React  ",expected:["武汉","react"]},
    ]},
   {id:"fe-form",title:"02 · 注册表单即时校验",domain:"表单状态",functionName:"validateSignupForm",
    signature:"validateSignupForm(form) → {valid:boolean,errors:string[]}",
    description:"form含username、phone、consent。用户名去首尾空格后长度须在2~12之间，手机号严格符合中国大陆1开头、第二位3~9、共11位数字；consent必须严格为true。按username、phone、consent顺序输出错误字段名，全部通过时errors为空、valid=true。只做格式检查，不是真实手机归属或身份验证。",
    starter:"function validateSignupForm(form) {\n  return { valid: false, errors: [] };\n}",
    hint:"按顺序push三个字段名，valid等于errors.length===0；手机号用 /^1[3-9]\\d{9}$/。",
    cases:[
     {label:"正常表单",input:{username:" 张小林 ",phone:"13812345678",consent:true},expected:{valid:true,errors:[]}},
     {label:"全部错误",input:{username:"A",phone:"1234",consent:false},expected:{valid:false,errors:["username","phone","consent"]}},
     {label:"只有隐私同意失败",input:{username:"hello",phone:"15912345678",consent:"true"},expected:{valid:false,errors:["consent"]}},
     {label:"边界：长度超标与无效号段",input:{username:"abcdefghijklmn",phone:"12812345678",consent:true},expected:{valid:false,errors:["username","phone"]}},
    ]},
   {id:"fe-products",title:"03 · 库存筛选与价格排序",domain:"列表视图",functionName:"visibleProductIds",
    signature:"visibleProductIds({products,minStock,sort}) → number[]",
    description:"从products中筛选stock>=minStock的商品，按price的数值升序或降序排序（sort为asc/desc），价格相同按数字id升序。只返回商品id数组；不得修改原商品数组。",
    starter:"function visibleProductIds(options) {\n  return [];\n}",
    hint:"先filter，再复制并sort。比较器先比较价格，价格相同时以a.id-b.id打破平局。",
    cases:[
     {label:"升序及库存限制",input:{products:[{id:3,price:50,stock:1},{id:10,price:20,stock:0},{id:2,price:20,stock:5},{id:1,price:50,stock:9}],minStock:1,sort:"asc"},expected:[2,1,3]},
     {label:"降序同价",input:{products:[{id:8,price:30,stock:3},{id:3,price:80,stock:3},{id:2,price:80,stock:3}],minStock:1,sort:"desc"},expected:[2,3,8]},
     {label:"零库存允许",input:{products:[{id:12,price:2,stock:0},{id:6,price:1,stock:1}],minStock:0,sort:"asc"},expected:[6,12]},
     {label:"空筛选",input:{products:[{id:1,price:99,stock:0}],minStock:2,sort:"desc"},expected:[]},
    ]},
   {id:"fe-selection",title:"04 · 多选组件状态更新",domain:"交互状态",functionName:"updateSelectedIds",
    signature:"updateSelectedIds({selected,action,max}) → number[]",
    description:"selected是当前不重复的数字ID数组，max是最大选择数（正整数）。action.type为toggle时，如果id已选则移除，否则在未达到max时追加到末尾；clear时清空。保留其余ID顺序，不修改输入数组。",
    starter:"function updateSelectedIds(input) {\n  return [];\n}",
    hint:"先判断clear；切换已存在项时filter移除；新增时判断长度是否已达max。",
    cases:[
     {label:"追加新ID",input:{selected:[2,5],action:{type:"toggle",id:9},max:4},expected:[2,5,9]},
     {label:"取消选中",input:{selected:[8,1,7],action:{type:"toggle",id:1},max:3},expected:[8,7]},
     {label:"达到上限",input:{selected:[1,4],action:{type:"toggle",id:9},max:2},expected:[1,4]},
     {label:"清空",input:{selected:[2,3,4],action:{type:"clear"},max:5},expected:[]},
    ]},
  ]},
 backend:{
  id:"backend",name:"后端工程师 · API业务实操",subtitle:"后端接口与业务约束",
  summary:"编写可执行的API业务函数：分页结果、资源权限、WebHook幂等处理和滑动时间窗限流。用虚构数据检验业务边界，不依赖或访问真实生产系统。",
  focus:"后端",challenges:[
   {id:"be-pages",title:"01 · 返回分页接口结果",domain:"API设计",functionName:"paginateRecordIds",
    signature:"paginateRecordIds({ids,page,pageSize}) → {items,total,pages}",
    description:"ids为完整数字ID数组，page从1开始，pageSize为正整数。返回当前页的ID items、总条数total和总页数pages（向上取整，空数组总页数为0）。超出页码只返回空items。",
    starter:"function paginateRecordIds(input) {\n  return { items: [], total: 0, pages: 0 };\n}",
    hint:"slice((page-1)*pageSize,page*pageSize)；pages=Math.ceil(ids.length/pageSize)。",
    cases:[
     {label:"常规第二页",input:{ids:[10,20,30,40,50],page:2,pageSize:2},expected:{items:[30,40],total:5,pages:3}},
     {label:"末页",input:{ids:[1,2,3,4,5],page:3,pageSize:2},expected:{items:[5],total:5,pages:3}},
     {label:"越界页码",input:{ids:[7,8],page:6,pageSize:3},expected:{items:[],total:2,pages:1}},
     {label:"空集合",input:{ids:[],page:1,pageSize:4},expected:{items:[],total:0,pages:0}},
    ]},
   {id:"be-access",title:"02 · 资源编辑授权判断",domain:"权限与安全",functionName:"canEditDocument",
    signature:"canEditDocument({user,document}) → boolean",
    description:"只允许active严格为true的用户操作。若document.locked严格为true，一律拒绝。否则user.role严格为admin，或user.id严格等于document.ownerId时才可编辑。不要把字符串ID自动转换为数字。",
    starter:"function canEditDocument(input) {\n  return false;\n}",
    hint:"先检查用户是否active、文档是否locked；通过后才判断admin或同一ownerId。",
    cases:[
     {label:"活跃管理员",input:{user:{id:5,active:true,role:"admin"},document:{ownerId:3,locked:false}},expected:true},
     {label:"本人但账户停用",input:{user:{id:7,active:false,role:"member"},document:{ownerId:7,locked:false}},expected:false},
     {label:"管理员面对锁定文档",input:{user:{id:2,active:true,role:"admin"},document:{ownerId:2,locked:true}},expected:false},
     {label:"严格ID匹配",input:{user:{id:"8",active:true,role:"member"},document:{ownerId:8,locked:false}},expected:false},
    ]},
   {id:"be-webhook",title:"03 · Webhook事件幂等去重",domain:"支付事件",functionName:"acceptedPaymentEventIds",
    signature:"acceptedPaymentEventIds(events) → string[]",
    description:"按收到的先后顺序处理事件，仅保留type严格为payment.succeeded且eventId为非空字符串的事件；对相同eventId只保留第一次，返回被接受的事件ID数组（按首次出现顺序）。",
    starter:"function acceptedPaymentEventIds(events) {\n  return [];\n}",
    hint:"用Set判断已处理事件ID。只在确认type和eventId合法后才加入Set与结果数组。",
    cases:[
     {label:"重复事件及过滤",input:[{eventId:"e2",type:"payment.succeeded"},{eventId:"e1",type:"payment.failed"},{eventId:"e2",type:"payment.succeeded"},{eventId:"e3",type:"payment.succeeded"}],expected:["e2","e3"]},
     {label:"空事件",input:[],expected:[]},
     {label:"同ID不同类型",input:[{eventId:"p",type:"payment.failed"},{eventId:"p",type:"payment.succeeded"},{eventId:"q",type:"payment.succeeded"}],expected:["p","q"]},
     {label:"无效ID",input:[{eventId:"",type:"payment.succeeded"},{eventId:123,type:"payment.succeeded"},{eventId:"x",type:"payment.succeeded"}],expected:["x"]},
    ]},
   {id:"be-limit",title:"04 · 滑动窗口接口限流",domain:"服务稳定性",functionName:"allowRequests",
    signature:"allowRequests({timestamps,windowMs,limit}) → boolean[]",
    description:"timestamps为按时间升序到达的请求毫秒时间戳，windowMs、limit为正整数。对每个请求只统计此前已获准且时间差严格小于windowMs的请求数，未达到limit则允许并计入；拒绝请求不计入窗口。返回每个请求是否允许的布尔数组。",
    starter:"function allowRequests(input) {\n  return [];\n}",
    hint:"维护已允许的时间戳队列，逐个请求删除不在[t-windowMs+1,t]内的旧项；只有允许时才入队。",
    cases:[
     {label:"正常流量窗口",input:{timestamps:[0,50,99,100,150],windowMs:100,limit:2},expected:[true,true,false,true,true]},
     {label:"同一毫秒爆发",input:{timestamps:[10,10,10,11],windowMs:100,limit:2},expected:[true,true,false,false]},
     {label:"边界窗口切换",input:{timestamps:[0,99,100,199,200],windowMs:100,limit:1},expected:[true,false,true,false,true]},
     {label:"空流量",input:{timestamps:[],windowMs:60,limit:2},expected:[]},
    ]},
  ]},
 qa:{
  id:"qa",name:"测试与可靠性工程 · 故障实操",subtitle:"质量保障与故障诊断",
  summary:"围绕可执行的测试逻辑，识别缺失覆盖、汇总错误模式、识别SLO违约和处理事件优先级。不靠主观AI打分，直接核对程序输出。",
  focus:"测试/SRE",challenges:[
   {id:"qa-coverage",title:"01 · 找到未覆盖的接口",domain:"测试覆盖",functionName:"missingApiCoverage",
    signature:"missingApiCoverage({required,covered}) → string[]",
    description:"返回required中没有出现在covered的接口标识。required可能包含重复，输出需去重并按Unicode字典序升序排列，covered的多余接口不影响结果。",
    starter:"function missingApiCoverage(input) {\n  return [];\n}",
    hint:"建立Set(covered)，过滤required中不在Set的项，再用Set去重并.sort()。",
    cases:[
     {label:"部分接口遗漏",input:{required:["GET /a","POST /b","GET /c"],covered:["GET /a","GET /c"]},expected:["POST /b"]},
     {label:"全部已覆盖",input:{required:["x","y"],covered:["y","x","z"]},expected:[]},
     {label:"重复要求去重",input:{required:["z","a","z","b"],covered:["b"]},expected:["a","z"]},
     {label:"空覆盖",input:{required:["p","q"],covered:[]},expected:["p","q"]},
    ]},
   {id:"qa-errors",title:"02 · 错误日志指纹频次",domain:"故障聚类",functionName:"rankErrorMessages",
    signature:"rankErrorMessages(logs) → {message,count}[]",
    description:"只统计level为ERROR或FATAL的日志。将message首尾空白去掉后作为同一错误指纹，空message忽略。按count降序，数量相同按message的Unicode字典序升序输出。",
    starter:"function rankErrorMessages(logs) {\n  return [];\n}",
    hint:"过滤级别，trim消息后用Map累加，再把结果转数组排序；计数相同时比较字符串。",
    cases:[
     {label:"聚合异常",input:[{level:"ERROR",message:" timeout "},{level:"ERROR",message:"db"},{level:"FATAL",message:"timeout"},{level:"WARN",message:"db"}],expected:[{message:"timeout",count:2},{message:"db",count:1}]},
     {label:"无错误",input:[{level:"INFO",message:"all good"}],expected:[]},
     {label:"并列字典序",input:[{level:"ERROR",message:"z"},{level:"FATAL",message:"a"}],expected:[{message:"a",count:1},{message:"z",count:1}]},
     {label:"跳过空消息",input:[{level:"ERROR",message:" "},{level:"ERROR",message:"db"},{level:"ERROR",message:"db"}],expected:[{message:"db",count:2}]},
    ]},
   {id:"qa-slo",title:"03 · 计算服务可用率违约区间",domain:"SLO监控",functionName:"countSloBreaches",
    signature:"countSloBreaches({values,minAvailability}) → number",
    description:"values是按时间排列的服务可用率百分比数字（0至100），minAvailability是达标下限。严格低于下限的区间计为违约，恰好等于下限视为达标；返回总违约区间数量。",
    starter:"function countSloBreaches(input) {\n  return 0;\n}",
    hint:"遍历values，对小于minAvailability的数值累加1，等于不算。",
    cases:[
     {label:"部分低于下限",input:{values:[99.95,99.9,99.7,100],minAvailability:99.9},expected:1},
     {label:"空区间",input:{values:[],minAvailability:99.9},expected:0},
     {label:"刚好达标",input:{values:[99.9,99.9,100],minAvailability:99.9},expected:0},
     {label:"多个违约",input:{values:[98,97.2,99.5,99.99],minAvailability:99.95},expected:3},
    ]},
   {id:"qa-escalation",title:"04 · 故障事件升级队列",domain:"应急响应",functionName:"urgentIncidentIds",
    signature:"urgentIncidentIds(incidents) → string[]",
    description:"从事件列表中找出status严格为open且severity严格为P0/P1的事件。去掉重复id，P0排在P1前，每个优先级内按id的Unicode字典序升序。输出事件id字符串数组。",
    starter:"function urgentIncidentIds(incidents) {\n  return [];\n}",
    hint:"过滤open且P0/P1，按严重等级和id排序；最后用Set对id去重。",
    cases:[
     {label:"不同等级的开放事件",input:[{id:"B",status:"open",severity:"P1"},{id:"A",status:"resolved",severity:"P0"},{id:"C",status:"open",severity:"P0"}],expected:["C","B"]},
     {label:"都不需要升级",input:[{id:"x",status:"closed",severity:"P0"},{id:"y",status:"open",severity:"P2"}],expected:[]},
     {label:"去重与排序",input:[{id:"z",status:"open",severity:"P0"},{id:"a",status:"open",severity:"P1"},{id:"b",status:"open",severity:"P0"},{id:"z",status:"open",severity:"P0"}],expected:["b","z","a"]},
     {label:"大小写严格",input:[{id:"B",status:"OPEN",severity:"P0"},{id:"C",status:"open",severity:"P1"},{id:"A",status:"open",severity:"P2"}],expected:["C"]},
    ]},
  ]},
};
export const ENGINEERING_TRACK_LIST=Object.values(ENGINEERING_TRACKS);
export const ENGINEERING_CODE_CHALLENGES:readonly CodeChallenge[]=ENGINEERING_TRACK_LIST.flatMap(t=>t.challenges);
export function validateEngineeringTracks():string[]{
 const errors:string[]=[];
 const seen=new Set<string>();
 for(const track of ENGINEERING_TRACK_LIST){
  if(track.challenges.length!==4)errors.push("EXPECTED_FOUR:"+track.id);
  for(const t of track.challenges){
   if(seen.has(t.id))errors.push("DUPLICATE:"+t.id);
   seen.add(t.id);
   if(t.cases.length!==4||!t.starter.includes("function "+t.functionName+"(")||!t.hint)errors.push("INVALID:"+t.id);
  }
 }
 return errors;
}
