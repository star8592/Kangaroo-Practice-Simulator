#!/usr/bin/env python3
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
checks={
  'src/components/ReviewClient.tsx':{
    'must':['const ui=UI.zh','中文题面','英文原题','<span className="eyebrow">错题复盘</span>'],
    'must_not':['const lang:DisplayLang=a?.lang==="en"?"en":"zh"','<span className="eyebrow">REVIEW</span>'],
  },
  'src/components/ResultClient.tsx':{
    'must':['const lang:DisplayLang="zh"','const ui=UI.zh'],
    'must_not':['const lang:DisplayLang=a?.lang==="en"?"en":"zh"'],
  },
  'src/components/ArithmeticSessionClient.tsx':{
    'must':['个性化诊断'],
    'must_not':['PERSONAL DIAGNOSIS'],
  },
  'src/components/DiagnosticReportView.tsx':{
    'must':['国际数学竞赛训练中心 · 专业诊断报告','学习诊断总览','能力与策略画像','基于证据的诊断结论','个性化训练处方','逐题证据','成长记录与方法说明'],
    'must_not':['Professional Diagnostic Report','Professional Learning Diagnostic','Ability & Strategy Profile','Evidence-based Findings','Personalized Prescription','Question-level Evidence','Growth Record & Methodology'],
  },
  'src/components/HomeClient.tsx':{
    'must':['国际数学竞赛训练','竞赛分类','MAA AMC 晋级路径','年级分组','按赛制智能组卷','官方样题','官方专项训练','历年试卷'],
    'must_not':['<div className="eyebrow">COMPETITION FORMAT LAB</div>','<span className="eyebrow">COMPETITIONS</span>','<span className="eyebrow">MAA AMC PATHWAY</span>','<span className="eyebrow">SMART BY FORMAT</span>','<span className="eyebrow">OFFICIAL SAMPLES</span>','<span className="eyebrow">OFFICIAL PRACTICE</span>','<span className="eyebrow">PAST PAPERS</span>'],
  },
  'src/components/ArithmeticDashboard.tsx':{
    'must':['智能口算训练','学生画像','年级模型','个性化模型'],
    'must_not':['ADAPTIVE MENTAL MATH','STUDENT PROFILE','GRADE PROFILES','PERSONAL MODEL'],
  },
  'src/components/LoginClient.tsx':{
    'must':['国际数学竞赛训练中心'],
    'must_not':['Math Competition Learning Lab'],
  },
  'src/components/ParentLoginClient.tsx':{
    'must':['家长学习中心'],
    'must_not':['Parent Learning Console'],
  },
  'src/components/ParentRegisterClient.tsx':{
    'must':['家庭安全注册'],
    'must_not':['Secure Family Onboarding'],
  },
  'src/app/admin/students/[id]/page.tsx':{
    'must':['教师视图 · 学习模型','教学重点','下一步训练'],
    'must_not':['TEACHER VIEW · PERSONAL MODEL','COACHING PRIORITIES','NEXT ACTION'],
  },
  'src/components/ExamClient.tsx':{
    'must':['lang==="zh"?"考生确认":"CANDIDATE CHECK-IN"','lang==="zh"?"AIME 分段控制":"AIME SECTION CONTROL"'],
    'must_not':['<span className="eyebrow">CANDIDATE CHECK-IN</span>','<span className="eyebrow">AIME SECTION CONTROL</span>'],
  },
  'src/components/ArithmeticPrintClient.tsx':{
    'must':['下载 PDF（推荐）','打印纸张','/api/arithmetic/print/pdf?','纸笔训练','个性化生成'],
    'must_not':['打印 / 另存为 PDF','PAPER PRACTICE','PERSONALIZED FOR'],
  },
}
errors=[]
for rel,rules in checks.items():
    text=(ROOT/rel).read_text(encoding='utf-8')
    for token in rules.get('must',[]):
        if token not in text: errors.append(f'{rel}: missing {token!r}')
    for token in rules.get('must_not',[]):
        if token in text: errors.append(f'{rel}: forbidden {token!r}')
if errors:
    print('CHINESE_UI_AUDIT=FAIL')
    for e in errors: print('-',e)
    raise SystemExit(1)
print(f'CHINESE_UI_AUDIT=PASS files={len(checks)}')
