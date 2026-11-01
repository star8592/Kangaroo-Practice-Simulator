import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {APTITUDE_ITEMS,APTITUDE_DOMAINS,APTITUDE_VERSION,APTITUDE_DURATION_MINUTES,scoreAptitude,validateAptitudeBank} from "../src/lib/career-aptitude-bank";
assert.deepEqual(validateAptitudeBank(),[]);
assert.equal(APTITUDE_ITEMS.length,40);
assert.equal(APTITUDE_DOMAINS.length,5);
assert.equal(APTITUDE_DURATION_MINUTES,45);
for(const d of APTITUDE_DOMAINS)assert.equal(APTITUDE_ITEMS.filter(q=>q.domain===d.id).length,8);
assert.deepEqual(APTITUDE_ITEMS.reduce((count,q)=>(count[q.answer]++,count),[0,0,0,0]),[10,10,10,10],
 "balanced keyed responses prevent simple letter bias");
assert(APTITUDE_ITEMS.every(q=>q.options[q.answer]&&q.explanation.length>=20));
const key=Object.fromEntries(APTITUDE_ITEMS.map(q=>[q.id,q.answer]));
const perfect=scoreAptitude(key);
assert.equal(perfect.version,APTITUDE_VERSION);
assert.equal(perfect.correct,40);
assert.equal(perfect.answered,40);
assert.deepEqual(perfect.groups.map(x=>[x.correct,x.total]),[[8,8],[8,8],[8,8],[8,8],[8,8]]);
const wrong=scoreAptitude(Object.fromEntries(APTITUDE_ITEMS.map(q=>[q.id,(q.answer+1)%4])));
assert.equal(wrong.correct,0);assert.equal(wrong.answered,40);
const empty=scoreAptitude({});assert.equal(empty.correct,0);assert.equal(empty.answered,0);assert.equal(empty.total,40);
const one=scoreAptitude({[APTITUDE_ITEMS[0].id]:APTITUDE_ITEMS[0].answer});
assert.equal(one.correct,1);assert.equal(one.answered,1);assert.equal(one.groups[0].correct,1);
assert.throws(()=>scoreAptitude({unexpected:1}),/INVALID_APTITUDE_RESPONSE/);
assert.throws(()=>scoreAptitude({[APTITUDE_ITEMS[0].id]:-1}),/INVALID_APTITUDE_RESPONSE/);
assert.throws(()=>scoreAptitude({[APTITUDE_ITEMS[0].id]:4}),/INVALID_APTITUDE_RESPONSE/);
assert.throws(()=>scoreAptitude({[APTITUDE_ITEMS[0].id]:1.1}),/INVALID_APTITUDE_RESPONSE/);
const independentKey:Record<string,string>={
 "nu-01":"204元","nu-02":"90件","nu-03":"13.8元","nu-04":"25%","nu-05":"24万元","nu-06":"3/8","nu-07":"11:00","nu-08":"100万元",
 "lo-01":"全部甲类任务都是丙类","lo-02":"一定经过安全检查","lo-03":"A、C、B","lo-04":"审批尚未完成",
 "lo-05":"仓库B","lo-06":"甲","lo-07":"优秀员工在培训前就有较高绩效","lo-08":"A和B都已完成",
 "da-01":"4500","da-02":"50%","da-03":"5%","da-04":"135单","da-05":"90万元","da-06":"25%","da-07":"12万元","da-08":"132万元",
 "sp-01":"东南","sp-02":"(-1,5)","sp-03":"左下角","sp-04":"(3,2)","sp-05":"(5,4)","sp-06":"(4,3)","sp-07":"东北方向","sp-08":"东",
 "va-01":"提交申请且材料完整的人满足预约条件","va-02":"至少2家试点门店的等待时间缩短",
 "va-03":"退回法务处理版本差异","va-04":"未经主管签字的报告不算正式发布","va-05":"本周共有126人参加了线上培训",
 "va-06":"未经书面批准，不能调整交期","va-07":"不能仅凭比较证明新工具导致提速",
 "va-08":"外部接口延迟时，订单同步存在失败风险",
};
assert.equal(Object.keys(independentKey).length,40);
for(const q of APTITUDE_ITEMS){
 const expected=independentKey[q.id];
 assert(expected,"missing independently reviewed answer: "+q.id);
 const chosen=q.options[q.answer];
 assert(chosen.includes(expected),"incorrect key "+q.id+": "+chosen+" != "+expected);
}
const registry=readFileSync("src/lib/measurement-center.ts","utf8");
assert(registry.includes('"/assessment-center/career-aptitude-40"'));
const page=readFileSync("src/components/CareerAptitudeRunner.tsx","utf8");
assert(page.includes("非官方、非标准化测验"));
assert(page.includes("未答题按0分"));
assert(page.includes("sessionStorage"));
assert(!page.includes("fetch(")&&!page.includes("XMLHttpRequest")&& !page.includes("sendBeacon"),"local training does not upload private responses");
console.log("CAREER_APTITUDE_40=PASS items=40 categories=5 keys_independently_reviewed=40 response_balance=10x4 blank_zero=YES scoring=DETERMINISTIC client_storage=SESSION_ONLY");
