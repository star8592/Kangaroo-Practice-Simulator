import assert from "node:assert/strict";
import {validateSemanticRequest,validateSemanticQuestion,makeSemanticMessages,parseSemanticContent} from "../src/lib/career-semantic-followup";
import {EMPTY_INTERVIEW_JOB_CONTEXT} from "../src/lib/career-interview-context";

const base={profileId:"campus-software",questionId:"cs-project",
 answer:"我负责支付系统的幂等设计，测试了失败重试，但没有记录生产指标。",
 context:{targetRole:"后端研发",jobDescription:"熟悉Java与数据库，重视服务稳定性。",experienceSummary:"我参与后端开发。"}};
assert(validateSemanticRequest(base));
assert(validateSemanticRequest({...base,context:EMPTY_INTERVIEW_JOB_CONTEXT}));
assert(!validateSemanticRequest({...base,profileId:"other"}));
assert(!validateSemanticRequest({...base,questionId:"sp-intro"}));
assert(!validateSemanticRequest({...base,answer:"太短"}));
assert(!validateSemanticRequest({...base,answer:"x".repeat(2501)}));
assert(!validateSemanticRequest({...base,context:{...base.context,jobDescription:"x".repeat(4001)}}));
assert(!validateSemanticRequest({...base,context:undefined}));
const q={question:"你说测试过失败重试，能描述一次失败注入、预期结果及实际验证方式吗？",evidenceQuote:"测试了失败重试",reason:"回答缺少具体复现过程与验收证据"};
assert.deepEqual(validateSemanticQuestion(q,base.answer),q);
assert.deepEqual(parseSemanticContent(JSON.stringify(q),base.answer),q);
assert.equal(validateSemanticQuestion({...q,evidenceQuote:"我独立上线并增加99%收益"},base.answer),null);
assert.equal(validateSemanticQuestion({...q,question:"嗯？"},base.answer),null);
assert.equal(validateSemanticQuestion({...q,question:"<script>attack</script>"},base.answer),null);
assert.equal(parseSemanticContent("invalid json",base.answer),null);
assert.equal(parseSemanticContent(JSON.stringify(q).repeat(200),base.answer),null);
const messages=makeSemanticMessages(base);
assert(messages[0].content.includes("不可信数据"));
assert(messages[1].content.includes("幂等"));
assert(messages[1].content.includes("服务稳定性"));
const procurement={profileId:"social-procurement",questionId:"sp-supplier",answer:"我推动了两家供应商的交期验证，并追踪按时交付率。",context:EMPTY_INTERVIEW_JOB_CONTEXT};
assert(validateSemanticRequest(procurement));
assert(makeSemanticMessages(procurement)[1].content.includes("采购"));
console.log("CAREER_SEMANTIC_FOLLOWUP=PASS validation=YES exact_quote=YES output_bounds=YES cross_role=YES");
