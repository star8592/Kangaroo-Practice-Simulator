#!/usr/bin/env python3
from pathlib import Path


def replace(path: str, pairs: dict[str, str]):
    p = Path(path)
    s = p.read_text(encoding="utf-8")
    for old, new in pairs.items():
        if old not in s:
            raise SystemExit(f"missing token in {path}: {old}")
        s = s.replace(old, new)
    p.write_text(s, encoding="utf-8")

replace("src/components/HomeClient.tsx", {
    '<div className="eyebrow">COMPETITION FORMAT LAB</div>': '<div className="eyebrow">{lang==="zh"?"国际数学竞赛训练":"COMPETITION FORMAT LAB"}</div>',
    '<span className="eyebrow">COMPETITIONS</span>': '<span className="eyebrow">{lang==="zh"?"竞赛分类":"COMPETITIONS"}</span>',
    '<span className="eyebrow">MAA AMC PATHWAY</span>': '<span className="eyebrow">{lang==="zh"?"MAA AMC 晋级路径":"MAA AMC PATHWAY"}</span>',
    '<span className="eyebrow">GRADE BANDS · {label(competition)}</span>': '<span className="eyebrow">{lang==="zh"?`年级分组 · ${label(competition)}`:`GRADE BANDS · ${label(competition)}`}</span>',
    '<span className="eyebrow">SMART BY FORMAT</span>': '<span className="eyebrow">{lang==="zh"?"按赛制智能组卷":"SMART BY FORMAT"}</span>',
    '<span className="eyebrow">OFFICIAL SAMPLES</span>': '<span className="eyebrow">{lang==="zh"?"官方样题":"OFFICIAL SAMPLES"}</span>',
    '<span className="eyebrow">OFFICIAL PRACTICE</span>': '<span className="eyebrow">{lang==="zh"?"官方专项训练":"OFFICIAL PRACTICE"}</span>',
    '<span className="eyebrow">PAST PAPERS</span>': '<span className="eyebrow">{lang==="zh"?"历年试卷":"PAST PAPERS"}</span>',
})
replace("src/components/ArithmeticDashboard.tsx", {
    'ADAPTIVE MENTAL MATH': '智能口算训练',
    'STUDENT PROFILE': '学生画像',
    'GRADE PROFILES': '年级模型',
    'PERSONAL MODEL': '个性化模型',
})
replace("src/components/LoginClient.tsx", {'Math Competition Learning Lab': '国际数学竞赛训练中心'})
replace("src/components/ParentLoginClient.tsx", {'Parent Learning Console': '家长学习中心'})
replace("src/components/ParentRegisterClient.tsx", {'Secure Family Onboarding': '家庭安全注册'})
replace("src/app/admin/students/[id]/page.tsx", {
    'TEACHER VIEW · PERSONAL MODEL': '教师视图 · 学习模型',
    'COACHING PRIORITIES': '教学重点',
    'NEXT ACTION': '下一步训练',
})
replace("src/components/ExamClient.tsx", {
    '<span className="eyebrow">CANDIDATE CHECK-IN</span>': '<span className="eyebrow">{lang==="zh"?"考生确认":"CANDIDATE CHECK-IN"}</span>',
    '<span className="eyebrow">AIME SECTION CONTROL</span>': '<span className="eyebrow">{lang==="zh"?"AIME 分段控制":"AIME SECTION CONTROL"}</span>',
})

p = Path("scripts/audit_chinese_ui.py")
s = p.read_text(encoding="utf-8")
needle = "  'src/components/ArithmeticPrintClient.tsx':{\n"
insert = '''  'src/components/HomeClient.tsx':{
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
'''
if insert not in s:
    if needle not in s:
        raise SystemExit("audit insertion point missing")
    s = s.replace(needle, insert + needle)
p.write_text(s, encoding="utf-8")
print("FINALIZE_CHINESE_UI=PASS")
