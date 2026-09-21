#!/usr/bin/env python3
import json,glob,re,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
QUEUE=ROOT/'private/translation/queue.enriched.json'
NOISE=[r'\s+(?:rial|erial|material) pode ser reproduzido.*$',r'\s+Este material.*$',r'\s+DEPARTAMENTO DE MATEM[ÁA]TICA.*$',r'\s+Problemas de \d+ pontos.*$',r'\s+do apenas com autoriza.*$',r'\s+as com autorização do Canguru.*$']
def clean(s):
 o=s
 for p in NOISE:s=re.sub(p,'',s,flags=re.I)
 return s.strip(),s!=o
def malformed(s): return bool(re.search(r'\(E(?!\))',s))
def main():
 jobs=json.load(open(QUEUE))['jobs']; ji={(x['examId'],int(x['questionNo'])):x for x in jobs}; repaired=0; routed=0
 for fn in glob.glob(str(ROOT/'private/translations/auto/*.draft.json')):
  d=json.load(open(fn)); exam=Path(fn).name.replace('.draft.json',''); changed=False
  for q in d.get('questions',[]):
   r=q.get('review',{}); warns=set(r.get('qualityWarnings',[])); k=(exam,int(q['questionNo'])); j=ji.get(k,{})
   if r.get('qualityTier')!='D': continue
   src=j.get('sourceText',''); cs,did=clean(src)
   # Safe deterministic repair only: strip archive/footer contamination from source + localized source/stem.
   if did and not malformed(cs):
    lang=j.get('sourceLanguage','source'); loc=q.get('localized',{}).get(lang,{})
    if loc: loc['stem']=clean(loc.get('stem',''))[0]
    zh=q.get('localized',{}).get('zh',{}); zh['stem']=clean(zh.get('stem',''))[0]
    j['sourceText']=cs; r['sourceCleanup']=sorted(set(r.get('sourceCleanup',[])+['auto_footer_noise_strip']))
    warns.discard('source_ocr_noise'); repaired+=1; changed=True
   # Anything still structurally/numerically damaged is explicitly routed, never auto-promoted.
   if warns & {'numeric_mismatch','option_letter_mismatch','choice_labels_unrecovered','source_math_gap'}:
    r['reviewRoute']='repair'; routed+=1
   r['qualityWarnings']=sorted(warns)
  if changed: open(fn,'w').write(json.dumps(d,ensure_ascii=False,indent=2))
 # Persist cleaned source queue privately so reruns are idempotent.
 open(QUEUE,'w').write(json.dumps({'jobs':jobs},ensure_ascii=False,indent=2))
 print(json.dumps({'safeRepaired':repaired,'hardRepairRemaining':routed},ensure_ascii=False))
if __name__=='__main__':main()
