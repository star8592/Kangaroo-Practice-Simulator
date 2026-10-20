#!/usr/bin/env python3
"""Generate clearly labelled original practice mocks, never official past papers."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'src'/'data'/'seamo-original-mocks'
assert OUT.is_dir()
assert not OUT.is_symlink(), 'Refuse to write into symlinked production exam archive'

def build(grade,count,minutes):
    questions=[]
    for i in range(1,count+1):
        t=(i-1)%5
        a=grade*3+i+4
        if t==0:
            zh=f'小乐有 {a} 张卡片，送给朋友 {grade+2} 张，又得到 {i%4+2} 张。现在有多少张？'
            en=f'Lele has {a} cards, gives away {grade+2}, then receives {i%4+2}. How many cards now?'
            ans=a-(grade+2)+(i%4+2);concept='arithmetic'
            sol=f'{a} − {grade+2} + {i%4+2} = {ans}'
        elif t==1:
            step=grade+2;start=i+1
            zh=f'数列 {start}，{start+step}，{start+step*2}，____。空格里应填几？'
            en=f'Complete the pattern: {start}, {start+step}, {start+step*2}, ____. What comes next?'
            ans=start+step*3;concept='patterns';sol=f'每次增加 {step}；下一项是 {ans}。'
        elif t==2:
            groups=grade+2;each=i%4+2
            zh=f'每个盒子里放 {each} 颗珠子，{groups} 个盒子一共有多少颗？'
            en=f'Each box contains {each} beads. How many beads are in {groups} boxes?'
            ans=groups*each;concept='multiplication';sol=f'{groups} × {each} = {ans}'
        elif t==3:
            n=i+grade+5
            zh=f'队伍中，小乐前面有 {n} 人，后面有 {grade+3} 人。队伍一共有多少人？'
            en=f'There are {n} children ahead of Lele and {grade+3} behind. How many children are in the line?'
            ans=n+grade+4;concept='logic';sol=f'{n} + 1 + {grade+3} = {ans}'
        else:
            width=grade+2;height=i%5+2
            zh=f'一个长方形长 {width} 厘米，宽 {height} 厘米。周长是多少厘米？'
            en=f'A rectangle is {width} cm long and {height} cm wide. What is its perimeter in cm?'
            ans=2*(width+height);concept='geometry';sol=f'2 × ({width} + {height}) = {ans}'
        mode='choice' if grade==1 or i<=20 else 'integer'
        choices=[]
        if mode=='choice':
            candidates=sorted(set([ans,ans+2,ans+4,max(0,ans-2),max(0,ans-4)]))
            while len(candidates)<5: candidates.append(max(candidates)+3)
            candidates=candidates[:5]
            # Rotate options so the correct letter is not always the same.
            shift=i%5;candidates=candidates[shift:]+candidates[:shift]
            choices=[{'key':chr(65+j),'label':str(v)} for j,v in enumerate(candidates)]
            answer=chr(65+candidates.index(ans))
        else:answer=str(ans)
        questions.append({'id':f'seamo-original-g{grade}-q{i:02}', 'year':2026,'level':f'Grade {grade}','grades':f'Grade {grade}','language':'zh/en','questionNo':i,'points':1,'answerMode':mode,'concept':concept,'stem':zh,'stemEn':en,'choices':choices,'choicesEn':choices,'answer':answer,'solution':sol,'sourceFile':'original-generated-seamo-practice','verified':False,'examReady':True})
    profile={'id':f'seamo-original-g{grade}-mock-1','name':f'SEAMO Grade {grade} Foundational Practice 1','nameZh':f'SEAMO {grade}年级 · 原创基础训练 1','nameEn':f'SEAMO Grade {grade} · Foundational Practice 1','grades':f'Grade {grade}','gradeBand':'1-2','durationSeconds':minutes*60,'questionCount':count,'initialScore':0,'maxScore':count,'wrongPenaltyMode':'fixed','wrongPenaltyValue':0,'country':'Singapore SEAMO','year':2026,'language':'zh/en','competitionId':'seamo','formatId':f'seamo-g{grade}-original-mock','paperType':'practice','timingMode':'recommended','studentReady':True,'formatLabelZh':f'SEAMO {"Pre-A" if grade==1 else "A"} · 本站基础训练','formatLabelEn':f'SEAMO {"Pre-A" if grade==1 else "A"} · Foundational practice','sourceLabelZh':'本站原创基础专项训练 · 非官方历年真题','sourceLabelEn':'Independent foundational practice · not an official past paper','rulesSummaryZh':f'{count}题 / 训练计时{minutes}分钟，到时自动交卷；每题1分、不倒扣，非官方计分标准。','rulesSummaryEn':f'{count} questions / {minutes}-minute practice timer with automatic submission; 1 point each, no penalty; not official scoring.'}
    dest=OUT/f'{profile["id"]}.json'
    assert not dest.exists(),f'Refuse overwrite: {dest}'
    dest.write_text(json.dumps({'profile':profile,'questions':questions},ensure_ascii=False,indent=2)+'\n')
    print(dest.name, len(questions),sum(q['answerMode']=='integer' for q in questions))

if __name__=='__main__':
    build(1,15,40);build(2,25,90)
