#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),"..");
const arg=(name,fallback="")=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:fallback};
const examId=arg("--exam"), qid=arg("--question"), model=arg("--model",process.env.OPENAI_CORE_MODEL||"gpt-5.6-sol");
const effort=arg("--effort",process.env.OPENAI_CORE_EFFORT||"high");
if(!examId||!qid) throw new Error("用法: node scripts/generate_core_solution.mjs --exam <examId> --question <questionId>");
if(!process.env.OPENAI_API_KEY) throw new Error("缺少 OPENAI_API_KEY；不会回退到低质量本地剧本模型。");

const files=fs.readdirSync(path.join(ROOT,"private/exams")).filter(x=>x.endsWith(".json"));
let bundle=null,q=null;
for(const f of files){const d=JSON.parse(fs.readFileSync(path.join(ROOT,"private/exams",f),"utf8"));if((d.profile?.id||f.replace(/\.json$/,""))===examId){bundle=d;q=d.questions?.find(x=>x.id===qid);break}}
if(!bundle||!q) throw new Error("找不到题目");
const schema=JSON.parse(fs.readFileSync(path.join(ROOT,"schemas/core-solution-brain.schema.json"),"utf8"));
const asset=q.assetUrlZh||q.assetUrl||q.studentAssetUrlZh||q.studentAssetUrl;
const assetPath=asset?.startsWith("/")?path.join(ROOT,"public",asset.slice(1)):null;

const SYSTEM=`你是国际数学竞赛的一线金牌教练、儿童认知设计师和数学动画导演。
你的工作不是“写答案”，而是把一道题拆成孩子能看见、能操作、能预测、能验证的数学体验。
数学正确性优先于可爱；最简表示优先于炫技；只有空间关系真正需要时才用3D。
不要知道官方答案，也不要反推答案。先独立求解。每一步必须能被老师检查。
解说要轻松、聪明、有一点幽默，但笑点不能打断关键推理。不要幼稚化学生。
renderInstruction 是给本地 SVG/JSXGraph/Three.js/Manim 工人的施工图：对象、数量、关系、动画顺序必须具体。
renderScript 只能使用这些确定性命令：SOURCE；TEXT id x y text；EQUATION id latex；COUNTERS id count；TENFRAME id filled；NUMBERLINE id start end step；BAR id value label；POINT id x y label；SEGMENT id a b；POLYGON id p1,p2,...；CIRCLE id center radius；ANGLE id vertex rayPointA rayPointB label；CUBE id；NET id cube-cross|cube-t|cube-zigzag；SHOW id；HIDE id；HIGHLIGHT id；MOVE id x y；ROTATE id 2d degrees；FOLD id；MORPH id expression；PAUSE ms；ASK text。不要发明新命令。 NET/FOLD 只用于立方体展开图：先 NET，再可选 FOLD 同一个 id；MOVE 目前用于 POINT/TEXT，MORPH 用于 EQUATION/TEXT，ROTATE 目前用于二维 POLYGON。
interaction 必须写学生实际能做的动作；若不需要交互就写空字符串。
checkpoint 应该让学生先预测再揭晓；不适合暂停时写空字符串。
最终只输出符合 schema 的 JSON。`;
const questionText=JSON.stringify({competition:bundle.profile?.name,grades:bundle.profile?.grades,questionNo:q.questionNo,stem:q.stem,choices:q.choices,concept:q.concept},null,2);

function dataUrl(p){const ext=path.extname(p).toLowerCase();const mime=ext===".jpg"||ext===".jpeg"?"image/jpeg":"image/png";return `data:${mime};base64,${fs.readFileSync(p).toString("base64")}`}
function input(role){const content=[{type:"input_text",text:`${role}\n\n题目信息：\n${questionText}`}];if(assetPath&&fs.existsSync(assetPath))content.push({type:"input_image",image_url:dataUrl(assetPath),detail:"high"});return [{role:"system",content:[{type:"input_text",text:SYSTEM}]},{role:"user",content}]}
function outputText(r){for(const o of r.output||[])for(const c of o.content||[])if(c.type==="output_text")return c.text;throw new Error("API 未返回 output_text")}
async function call(role){const res=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model,reasoning:{effort},input:input(role),text:{format:{type:"json_schema",name:"math_solution_brain",strict:true,schema}}})});if(!res.ok)throw new Error(`OpenAI ${res.status}: ${await res.text()}`);return JSON.parse(outputText(await res.json()))}

const author=await call("你是作者。独立求解，并设计最有教学价值的完整分镜。");
const official=String(q.answer??"").trim(), a=String(author.solverAnswer??"").trim();
const brainDir=path.join(ROOT,"private/brain-scripts"), rejected=path.join(brainDir,"_rejected");fs.mkdirSync(rejected,{recursive:true});
if(a!==official||Number(author.confidence)<0.72){fs.writeFileSync(path.join(rejected,qid+".author.json"),JSON.stringify({officialAnswer:official,author},null,2));console.error(`REJECT author=${a} official=${official} confidence=${author.confidence}`);process.exit(2)}

const critic=await call("你是独立审稿人。不要照抄任何既有解法；重新独立求解这道题，并重新设计分镜。重点寻找作者可能忽略的条件、图形误读和隐含假设。");
const c=String(critic.solverAnswer??"").trim();
if(c!==official||c!==a||Number(critic.confidence)<0.72){fs.writeFileSync(path.join(rejected,qid+".critic.json"),JSON.stringify({officialAnswer:official,author,critic},null,2));console.error(`REJECT critic=${c} author=${a} official=${official}`);process.exit(3)}

fs.mkdirSync(brainDir,{recursive:true});
fs.writeFileSync(path.join(brainDir,qid+".json"),JSON.stringify({version:1,questionId:qid,model,effort,officialAnswer:official,author,critic},null,2));
function safeVisual(s){if(s.visualType==="solid3d"&&/(正方体|立方体|cube)/i.test(q.stem+" "+s.renderInstruction))return{type:"solid3d",shape:"cube"};if(asset)return{type:"source-image",url:asset};return{type:"none"}}
const storyboard={version:1,questionId:qid,quality:"verified",verification:{officialAnswerMatched:true,solverAgreement:true,confidence:Math.min(Number(author.confidence),Number(critic.confidence)),notes:`author+critic via ${model}; risk=${author.riskLevel}`},scenes:author.scenes.map(s=>({id:s.id,title:s.title,narration:s.narration,caption:s.caption,checkpoint:s.checkpoint||undefined,durationMs:s.durationMs,visual:safeVisual(s),renderSpec:{engine:s.renderEngine,instruction:s.renderInstruction,script:s.renderScript,interaction:s.interaction,voiceDirection:s.voiceDirection}}))};
const outDir=path.join(ROOT,"private/solutions");fs.mkdirSync(outDir,{recursive:true});fs.writeFileSync(path.join(outDir,qid+".json"),JSON.stringify(storyboard,null,2));
console.log(JSON.stringify({status:"PASS",questionId:qid,model,authorConfidence:author.confidence,criticConfidence:critic.confidence,scenes:storyboard.scenes.length,output:path.join(outDir,qid+".json")},null,2));
