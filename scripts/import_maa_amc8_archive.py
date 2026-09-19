#!/usr/bin/env python3
"""Import the user's bilingual AMC 8 archive (2000–2020, 2022).

The source PDFs have usable text layers. We use their PDF word coordinates
only to locate Q1–Q25, then render/crop the original page pixels. We never OCR
or reconstruct the problem text. Answer keys stay server-side.
"""
from pathlib import Path
from PIL import Image
import json, math, re, statistics, subprocess, tempfile
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
ARCHIVE=Path('/mnt/disk1/video/AMC8中英真题+中文解析+答案（2000-2025）')
PAPER_DIR=ARCHIVE/'AMC8中英真题（2000-2025）'
KEY_DIR=ARCHIVE/'AMC8key 简版答案（2000-2025）'
OUT_ROOT=ROOT/'public/local-assets/maa-amc/archive-amc8'
BUNDLE_ROOT=ROOT/'private/exams'
YEARS=list(range(2000,2021))+[2022]
DPI=170
NS='{http://www.w3.org/1999/xhtml}'

def run(cmd, capture=False):
    return subprocess.run(cmd,check=True,stdout=subprocess.PIPE if capture else subprocess.DEVNULL,
                          stderr=subprocess.PIPE if capture else subprocess.DEVNULL,
                          text=capture,errors='ignore' if capture else None)

def answer_key_file(year:int)->Path:
    files=sorted(KEY_DIR.glob(f'{year}*'))
    if len(files)!=1: raise RuntimeError(f'{year}: expected one answer-key file, found {[p.name for p in files]}')
    return files[0]

def parse_answers(year:int):
    p=answer_key_file(year)
    txt=run(['pdftotext','-layout',str(p),'-'],capture=True).stdout
    ans={}
    for n,a in re.findall(r'(?m)(?:^|\s)(\d{1,2})\.\s*([A-E])(?:\s|$)',txt):
        n=int(n)
        if 1<=n<=25: ans[n]=a
    if len(ans)<25:
        for a,b,letters in re.findall(r'(\d{1,2})\s*~\s*(\d{1,2})\s*:\s*([A-E]+)',txt):
            a,b=int(a),int(b)
            if b-a+1==len(letters):
                for i,ch in enumerate(letters,a): ans[i]=ch
    if sorted(ans)!=list(range(1,26)) or any(x not in 'ABCDE' for x in ans.values()):
        raise RuntimeError(f'{year}: answer-key parse failed: {ans}')
    return [ans[i] for i in range(1,26)],p

def bbox_doc(pdf:Path):
    tmp=Path(tempfile.mktemp(suffix='.html'))
    try:
        run(['pdftotext','-bbox-layout',str(pdf),str(tmp)])
        return ET.fromstring(tmp.read_text(errors='ignore'))
    finally:
        tmp.unlink(missing_ok=True)

def locate_questions(pdf:Path):
    doc=bbox_doc(pdf); pages=list(doc.iter(NS+'page'))
    candidates={n:[] for n in range(1,26)}; xs=[]; hs=[]
    for pi,page in enumerate(pages,1):
        H=float(page.attrib.get('height','792')); W=float(page.attrib.get('width','612'))
        for w in page.iter(NS+'word'):
            t=''.join(w.itertext()).strip()
            if not re.fullmatch(r'[1-9]|1\d|2[0-5]',t): continue
            n=int(t); x=float(w.attrib['xMin']); y=float(w.attrib['yMin'])
            h=float(w.attrib['yMax'])-y
            # AMC archive's problem-number column. Body numbers outside this
            # narrow strip are rejected before sequence scoring.
            if 85<=x<=112 and y<0.9*H and 9<=h<=13.5:
                c=(pi,y,x,h,W,H)
                candidates[n].append(c); xs.append(x); hs.append(h)
    if not xs: raise RuntimeError(f'{pdf.name}: no question-number candidates')
    medx=statistics.median(xs); medh=statistics.median(hs)

    # Dynamic programming: one Q1..Q25 monotone sequence. Column alignment is
    # the strongest signal; page skipping and unusually late same-page jumps
    # are mildly penalized. Q1 must be on page 1.
    layers=[]; prev={}
    for c in candidates[1]:
        if c[0]!=1: continue
        prev[c]=(abs(c[2]-medx)*5+abs(c[3]-medh)*2,None)
    if not prev: raise RuntimeError(f'{pdf.name}: Q1 not located on page 1')
    layers.append(prev)
    for n in range(2,26):
        cur={}
        for c in candidates[n]:
            pg,y,x,h,_,_=c; best=None
            for pc,(score,_) in prev.items():
                ppg,py,_,_,_,_=pc
                if (pg,y)<=(ppg,py): continue
                pagejump=pg-ppg
                gap=(pagejump-1)*2 if pagejump>=1 else max(0,(y-py)-300)/180
                node=abs(x-medx)*5+abs(h-medh)*2+gap
                v=score+node
                if best is None or v<best[0]: best=(v,pc)
            if best: cur[c]=best
        if not cur: raise RuntimeError(f'{pdf.name}: Q{n} could not continue monotone sequence')
        layers.append(cur); prev=cur
    end=min(prev,key=lambda c:prev[c][0]); seq=[end]
    for idx in range(24,0,-1): seq.append(layers[idx][seq[-1]][1])
    seq=list(reversed(seq))

    if len(seq)!=25: raise RuntimeError(f'{pdf.name}: expected 25 positions, got {len(seq)}')
    if any((seq[i][0],seq[i][1])<=(seq[i-1][0],seq[i-1][1]) for i in range(1,25)):
        raise RuntimeError(f'{pdf.name}: non-monotone sequence')
    # No single problem page in this archive should contain >5 starts.
    counts={}
    for c in seq: counts[c[0]]=counts.get(c[0],0)+1
    if max(counts.values())>5: raise RuntimeError(f'{pdf.name}: suspicious page density {counts}')
    return seq,counts

def render_pages(pdf:Path,last_page:int):
    td=tempfile.TemporaryDirectory(prefix=f'amc8-{pdf.stem}-')
    base=Path(td.name)/'page'
    run(['pdftoppm','-png','-r',str(DPI),'-f','1','-l',str(last_page),str(pdf),str(base)])
    files=sorted(Path(td.name).glob('page-*.png'))
    if len(files)!=last_page: raise RuntimeError(f'{pdf.name}: render count {len(files)} != {last_page}')
    return td,{i+1:p for i,p in enumerate(files)}

def crop_year(year:int,pdf:Path,seq):
    outdir=OUT_ROOT/str(year)
    outdir.mkdir(parents=True,exist_ok=True)
    td,pages=render_pages(pdf,max(c[0] for c in seq))
    try:
        for i,c in enumerate(seq):
            q=i+1; pg,y,_,_,W,H=c
            im=Image.open(pages[pg]).convert('RGB')
            sx=im.width/W; sy=im.height/H
            top=max(0,int((y-14)*sy))
            if i+1<len(seq) and seq[i+1][0]==pg:
                bottom=max(top+80,int((seq[i+1][1]-10)*sy))
            else:
                bottom=min(im.height,int((H-42)*sy))
            left=max(0,int(58*sx)); right=min(im.width,int((W-42)*sx))
            out=outdir/f'q{q:02}.png'
            im.crop((left,top,right,bottom)).save(out,optimize=True)
            if out.stat().st_size<6000:
                raise RuntimeError(f'{year} Q{q}: suspicious crop size {out.stat().st_size}')
    finally:
        td.cleanup()
    assets=sorted(outdir.glob('q*.png'))
    if len(assets)!=25: raise RuntimeError(f'{year}: asset count {len(assets)}')
    return outdir

def make_bundle(year:int,pdf:Path,keyfile:Path,answers,page_counts):
    profile={
      'id':f'maa-amc8-{year}-user-owned',
      'name':f'{year} MAA AMC 8 · Bilingual Past Paper',
      'nameZh':f'{year} 美国 MAA AMC 8 · 中英双语真题',
      'nameEn':f'{year} MAA AMC 8 · Bilingual Past Paper',
      'grades':'Grade 8 and below','gradesZh':'8年级及以下','gradesEn':'Grade 8 and below',
      'durationSeconds':2400,'questionCount':25,'initialScore':0,'maxScore':25,
      'wrongPenaltyMode':'fixed','wrongPenaltyValue':0,'blankScoreValue':0,
      'country':'MAA AMC','year':year,'language':'zh/en',
      'sourceLabel':'User-owned bilingual AMC 8 archive',
      'sourceLabelZh':'用户自有资料 · AMC 8 中英双语历年真题',
      'sourceLabelEn':'User-owned bilingual AMC 8 archive',
      'studentReady':True,'competitionId':'maa-amc','formatId':'maa-amc8','paperType':'past',
      'gradeBand':'7-8','timingMode':'official',
      'formatLabelZh':'美国 MAA AMC 8 正式赛制','formatLabelEn':'MAA AMC 8 official format',
      'rulesSummaryZh':('25道选择题，40分钟；答对1分，空题0分，答错0分，满分25分；按当年规则，允许使用规定范围内的计算器。' if year<=2007 else '25道选择题，40分钟；答对1分，空题0分，答错0分，满分25分；禁止使用计算器。'),
      'rulesSummaryEn':('25 multiple-choice questions in 40 minutes; 1 point correct, 0 blank, 0 wrong; maximum 25; calculators permitted under that year’s rules.' if year<=2007 else '25 multiple-choice questions in 40 minutes; 1 point correct, 0 blank, 0 wrong; maximum 25; calculators are not allowed.')
    }
    choices=[{'key':k,'label':k} for k in 'ABCDE']
    qs=[]
    for q in range(1,26):
        url=f'/local-assets/maa-amc/archive-amc8/{year}/q{q:02}.png'
        qs.append({
          'id':f'maa-amc8-{year}-q{q:02}','year':year,'level':'AMC 8',
          'grades':'Grade 8 and below','language':'zh/en','questionNo':q,'points':1,
          'answerMode':'choice','concept':'official_original',
          'stem':'请查看下方中英双语原题图。','stemEn':'See the bilingual problem image below.',
          'choices':choices,'choicesEn':choices,'answer':answers[q-1],
          'solution':f'Correct answer: {answers[q-1]}',
          'sourceFile':str(pdf),'assetUrl':url,'assetUrlZh':url,'assetUrlEn':url,
          'studentAssetUrl':url,'studentAssetUrlZh':url,'studentAssetUrlEn':url,
          'verified':True,'examReady':True,
          'sourceMeta':{
             'rightsStatus':'user-owned','sourcePdfPage':None,
             'cropMethod':'pdf-bbox-question-column','answerKeyFile':str(keyfile)
          }
        })
    # attach source page to each question without exposing coordinates
    # page numbers are enough for later audit.
    # seq page information is added by caller after bundle creation if desired.
    bundle={'profile':profile,'questions':qs,'archiveAudit':{'pageQuestionCounts':page_counts,'rightsStatus':'user-owned'}}
    out=BUNDLE_ROOT/f'{profile["id"]}.json'
    out.write_text(json.dumps(bundle,ensure_ascii=False,indent=2))
    return out

def main():
    summary=[]
    for year in YEARS:
        pdf=PAPER_DIR/f'{year} AMC8.pdf'
        if not pdf.exists(): raise RuntimeError(f'{year}: missing paper {pdf}')
        answers,key=parse_answers(year)
        seq,counts=locate_questions(pdf)
        crop_year(year,pdf,seq)
        out=make_bundle(year,pdf,key,answers,counts)
        d=json.loads(out.read_text())
        for i,c in enumerate(seq):
            d['questions'][i]['sourceMeta']['sourcePdfPage']=c[0]
        out.write_text(json.dumps(d,ensure_ascii=False,indent=2))
        summary.append({'year':year,'bundle':out.name,'questions':25,'answers':''.join(answers),'pages':counts})
        print(f'IMPORTED {year}: questions=25 answers=25 pages={counts}')
    audit=ROOT/'private'/'maa-amc8-archive-import-audit.json'
    audit.write_text(json.dumps({'source':str(ARCHIVE),'years':summary,'totalYears':len(summary),'totalQuestions':len(summary)*25},ensure_ascii=False,indent=2))
    print(f'AMC8_ARCHIVE_IMPORT=PASS years={len(summary)} questions={len(summary)*25} audit={audit}')

if __name__=='__main__':
    main()
