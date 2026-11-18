#!/usr/bin/env python3
"""Generate offline original-image bilingual practice UI on the user's machine.

25 English source crops are local private references. The answer key is
embedded only in an internal review HTML, not a public Next.js application.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUNDLE = ROOT / "private/exams/maa-amc8-2026-us-reference-internal.json"
OUTPUT = ROOT / "private/drafts/maa-amc8-2026-us-bilingual-offline-preview.html"
IMAGE_BASE = "../../public/local-assets/maa-amc/archive-amc8/2026-us-internal"

HTML = r"""<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>2026 AMC 8 美国原卷 · 中英双语校对练习</title>
<style>
:root{font-family:system-ui,"Noto Sans CJK SC","Microsoft YaHei",sans-serif;color:#192a42;background:#f1f3f6}
*{box-sizing:border-box}body{margin:0}button{font:inherit;cursor:pointer}
header{background:white;border-bottom:1px solid #dce1e9;padding:18px max(20px,calc((100vw - 1260px)/2));display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
h1{font-size:21px;margin:0 0 4px}.sub{font-size:12px;color:#697c92}main{max-width:1260px;margin:20px auto;padding:0 20px;display:grid;grid-template-columns:240px minmax(0,1fr);gap:20px}
aside,article{border:1px solid #e0e6ef;background:white;border-radius:14px;padding:20px}
.timer{font-size:26px;font-weight:700;font-variant-numeric:tabular-nums}.timer.expired{color:#b92121}
.tag{display:inline-block;background:#eff3f9;color:#486080;padding:5px 9px;border-radius:8px;font-size:12px}
.nav{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-top:18px}
.nav button{border:1px solid #cfd8e5;background:#fff;height:36px;border-radius:8px}
.nav button.active{background:#244e86;color:white;border-color:#244e86}
.nav button.answered{box-shadow:inset 0 0 0 2px #5b9e85}
.toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px}
.zh{font-size:19px;line-height:1.85;white-space:pre-wrap;margin:18px 0}
.original-label{font-size:13px;font-weight:600;color:#526b84;margin:22px 0 8px}
img{display:block;width:100%;max-width:1050px;height:auto;border:1px solid #edf0f5;border-radius:8px}
.answer{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}
.answer button{min-width:74px;height:48px;border:1px solid #bac8d9;border-radius:10px;background:#fff;font-weight:600}
.answer button.selected{background:#224b82;color:#fff;border-color:#224b82}
.actions{display:flex;justify-content:space-between;gap:10px;margin-top:25px}
.actions button, #submit,#restart,#print{padding:11px 20px;border:1px solid #b9c9df;border-radius:9px;background:white;color:#203955}
#submit{background:#1e4f86;color:white;border-color:#1e4f86}
button:disabled{opacity:.45;cursor:not-allowed}
.progress{height:5px;background:#e4eaf0;border-radius:6px;overflow:hidden;margin-top:18px}
.bar{height:100%;width:0;background:#3979b3;transition:width .2s}
#report{display:none}.summary{font-size:44px;font-weight:750;margin:13px 0}.mistakes{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0}.mistakes button{border:1px solid #bdc9d9;border-radius:8px;padding:7px 12px;background:white}
.warning{color:#856013;background:#fff9e8;border-radius:8px;padding:10px;margin-top:12px;font-size:13px}
footer{font-size:11px;color:#6f7c8c;line-height:1.5;margin:20px auto;max-width:1260px;padding:0 20px}
@media(max-width:760px){main{display:block;padding:0 12px}aside{margin-bottom:12px;padding:14px}article{padding:16px}.nav{grid-template-columns:repeat(10,1fr);margin-top:8px}.nav button{height:30px;font-size:12px}header{padding:15px}.zh{font-size:16px}.answer button{flex:1;min-width:40px}}
@media print{header,aside,.actions,.answer,#submit,#restart,#print,footer,.warning{display:none!important}body{background:white}main{display:block}article{border:0}#report{display:block!important}#exam{display:none!important}}
</style></head><body>
<header><div><h1>2026 AMC 8 · 美国原卷中英对照</h1><div class="sub">本机校对演示 · 中文为参考译文，所有英文题目／公式／选项均以原卷图为准</div></div><div><span class="tag">非正式考试 · 不作销售</span> <span class="timer" id="timer">40:00</span></div></header>
<main><aside><b>题号导航</b><span class="sub" id="progress-text"></span><div class="nav" id="nav"></div><div class="progress"><div class="bar" id="bar"></div></div><div class="warning">这是一份本机草稿；图形和答案来自原卷/独立参考答案表，译文尚未逐题正式审定。</div></aside>
<article id="exam"><div class="toolbar"><strong id="qnumber"></strong><span class="tag">40分钟 · 单选题 · 每题1分</span></div>
<div class="zh" id="stem"></div><div class="original-label">Original English question · 原英文题干、公式、图形及原版选项</div><img id="source" alt="AMC8 English original question image"/>
<div class="original-label">选一个答案 · Select one answer</div><div class="answer" id="answers"></div>
<div class="actions"><button id="prev">上一题</button><button id="next">下一题</button><button id="submit">提交并评分</button></div>
</article>
<article id="report"><h2>校对练习结果</h2><p class="sub">这是本机自测结果，不代表官方考试成绩或商业服务报告。</p><div class="summary" id="score"></div><p id="detail"></p>
<h3>需要复核的题目</h3><div class="mistakes" id="missed"></div><button id="restart">重做整卷</button><button id="print">打印结果</button></article></main>
<footer>2026 AMC8 私有研究材料 · 英文原题由本机 PDF 裁图提供 · 中文译文为初稿 · 未完成逐题核验及商业权利审查。此HTML在本地file://下运行，不收集个人数据，不访问网络。</footer>
<script>
"use strict";
const questions = __DATA__;
const byId = s => document.getElementById(s);
let selected = Array.from({length:25},()=>null);
let active = 0, finished = false, started = Date.now();
const choices=["A","B","C","D","E"];
const stamp=()=>Date.now();
const left=()=>Math.max(0,2400-Math.floor((stamp()-started)/1000));
function remaining(){const n=left();byId("timer").textContent=String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");byId("timer").classList.toggle("expired",n<=0);if(n<=0&&!finished)finish(true)}
function render(){
 byId("qnumber").textContent="Question "+(active+1)+" / 25";
 byId("stem").textContent="中文参考译文："+questions[active].zh;
 byId("source").src=questions[active].image;
 byId("nav").innerHTML="";
 selected.forEach((v,i)=>{const b=document.createElement("button");b.textContent=String(i+1);b.className=(i===active?"active ":"")+(v?"answered":"");b.title="第"+(i+1)+"题";b.onclick=()=>{active=i;render()};byId("nav").appendChild(b)});
 byId("answers").innerHTML="";
 choices.forEach(x=>{const b=document.createElement("button");b.textContent=x;b.className=selected[active]===x?"selected":"";b.setAttribute("aria-label","选择 "+x);b.onclick=()=>{selected[active]=x;render()};byId("answers").appendChild(b)});
 byId("prev").disabled=active===0;byId("next").disabled=active===24;
 const done=selected.filter(Boolean).length;
 byId("progress-text").textContent="　"+done+"/25 已作答";
 byId("bar").style.width=(done/25*100)+"%";
}
function finish(timeout=false){
 if(finished)return;
 if(!timeout){const missing=selected.filter(x=>!x).length;if(missing&&!confirm("还有"+missing+"题未答。确定交卷吗？"))return}
 finished=true;
 const score=questions.reduce((n,q,i)=>n+(selected[i]===q.key?1:0),0);
 byId("exam").style.display="none";byId("report").style.display="block";
 byId("score").textContent=score+" / 25";
 byId("detail").textContent=(timeout?"40分钟已结束，自动交卷。 ":"")+"答对 "+score+" 题，答错或未答 "+(25-score)+" 题。";
 byId("missed").innerHTML="";
 questions.forEach((q,i)=>{if(selected[i]!==q.key){const b=document.createElement("button");b.textContent="Q"+(i+1)+"：" +(selected[i]||"空题")+" → "+q.key;b.onclick=()=>{alert("第 "+(i+1)+" 题参考答案 "+q.key+"。查看上方英文原题；解析尚需校对。")};byId("missed").appendChild(b)}});
}
byId("prev").onclick=()=>{active=Math.max(0,active-1);render()};
byId("next").onclick=()=>{active=Math.min(24,active+1);render()};
byId("submit").onclick=()=>finish(false);
byId("restart").onclick=()=>{selected=Array(25).fill(null);active=0;finished=false;started=Date.now();byId("report").style.display="none";byId("exam").style.display="block";render();remaining()};
byId("print").onclick=()=>window.print();
render();remaining();setInterval(remaining,1000);
</script></body></html>
""";


def main() -> None:
    data = json.loads(BUNDLE.read_text(encoding="utf-8"))
    rows = data["questions"]
    if len(rows) != 25 or data["profile"]["rightsPolicy"]["commercialUse"] is not False:
        raise RuntimeError("INVALID_PRIVATE_REVIEW_BUNDLE")
    items = []
    for i, row in enumerate(rows, 1):
        if row["questionNo"] != i or row["examReady"] is not False:
            raise RuntimeError("UNREVIEWED_QUESTION_NOT_FAIL_CLOSED")
        image = ROOT / "public/local-assets/maa-amc/archive-amc8/2026-us-internal" / f"q{i:02}.png"
        if not image.is_file():
            raise RuntimeError("MISSING_ORIGINAL_IMAGE")
        items.append({
            "zh": row["stem"], "key": row["answer"],
            "image": IMAGE_BASE + f"/q{i:02}.png",
        })
    raw = json.dumps(items, ensure_ascii=False, separators=(",", ":"))
    # Do not embed arbitrary HTML markup or scripts from source content.
    raw = raw.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    out = HTML.replace("__DATA__", raw)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(out, encoding="utf-8")
    assert out.count("2026 AMC 8") >= 1 and len(items) == 25
    print("AMC8_2026_OFFLINE_INTERACTIVE_PREVIEW_READY")
    print("PATH", OUTPUT)
    print("QUESTIONS=25 TIME_LIMIT=2400 SELECT=ABCDE SCORE_REFERENCE=25/25")
    print("PUBLIC_DEPLOYMENT=NO")


if __name__ == "__main__":
    main()
