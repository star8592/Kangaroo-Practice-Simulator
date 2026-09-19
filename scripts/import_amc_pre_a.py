#!/usr/bin/env python3
import json, re, subprocess, tempfile, xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image

REPO = Path(__file__).resolve().parents[1]
LIB = Path('/mnt/disk1/master_data/Education/Australian_AMC_Library')
SRC = LIB / '01_AMT_Official/06_Official_Supplied/Pre_A_Samples'
ASSET_ROOT = REPO / 'public/local-assets/australian-amc/pre-a'
EXAM_ROOT = REPO / 'private/exams'
DPI = 180
CHOICES = [{'key': k, 'label': k} for k in 'ABCDE']

SAMPLES = {
    1: {'pdf': SRC/'Sample_1.pdf', 'zh_pages': range(2,13), 'en_pages': range(13,22), 'answer_page':22},
    2: {'pdf': SRC/'Sample_2.pdf', 'zh_pages': range(2,13), 'en_pages': range(13,23), 'answer_page':23},
}

def run(*args):
    return subprocess.check_output(args, text=True, stderr=subprocess.DEVNULL)

def bbox_page(pdf: Path, page: int):
    xml = run('pdftotext','-f',str(page),'-l',str(page),'-bbox-layout',str(pdf),'-')
    root = ET.fromstring(xml)
    ns = {'x':'http://www.w3.org/1999/xhtml'}
    p = root.find('.//x:page',ns)
    width=float(p.attrib['width']); height=float(p.attrib['height'])
    words=[]
    for w in p.findall('.//x:word',ns):
        words.append((w.text or '', float(w.attrib['xMin']), float(w.attrib['yMin']), float(w.attrib['xMax']), float(w.attrib['yMax'])))
    return width,height,words

def question_positions(pdf: Path, pages):
    found={}
    page_meta={}
    for page in pages:
        width,height,words=bbox_page(pdf,page); page_meta[page]=(width,height)
        for text,x0,y0,x1,y1 in words:
            m=re.fullmatch(r'([1-9]|1\d|2[0-5])\.',text.strip())
            if m:
                q=int(m.group(1))
                if q not in found: found[q]=(page,y0)
    missing=[q for q in range(1,26) if q not in found]
    if missing: raise RuntimeError(f'missing question positions {missing} in {pdf.name}')
    return found,page_meta

def render_page(pdf: Path, page: int, out: Path):
    out.parent.mkdir(parents=True,exist_ok=True)
    base=out.with_suffix('')
    subprocess.check_call(['pdftoppm','-png','-r',str(DPI),'-f',str(page),'-l',str(page),'-singlefile',str(pdf),str(base)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return out

def build_crops(pdf: Path, pages, sample: int, lang: str):
    pos,meta=question_positions(pdf,pages)
    cache={}
    out_dir=ASSET_ROOT/f'sample-{sample}'/lang; out_dir.mkdir(parents=True,exist_ok=True)
    for q in range(1,26):
        page,y=pos[q]
        if page not in cache:
            tmp=Path(tempfile.gettempdir())/f'amc-pre-a-{sample}-{lang}-p{page}.png'
            render_page(pdf,page,tmp); cache[page]=Image.open(tmp).convert('RGB')
        im=cache[page]; pw,ph=meta[page]
        same=[(qq,yy) for qq,(pp,yy) in pos.items() if pp==page and qq>q]
        next_y=min((yy for _,yy in same),default=ph-34)
        sx=im.width/pw; sy=im.height/ph
        left=max(0,int(32*sx)); right=min(im.width,int((pw-26)*sx))
        top=max(0,int((y-12)*sy)); bottom=min(im.height,int((next_y-6)*sy))
        if bottom-top < int(70*sy): bottom=min(im.height,int((next_y+20)*sy))
        crop=im.crop((left,top,right,bottom))
        crop.save(out_dir/f'q{q:02d}.png',optimize=True)

def answers(pdf: Path, page: int):
    text=run('pdftotext','-f',str(page),'-l',str(page),'-layout',str(pdf),'-')
    out={}
    for line in text.splitlines():
        m=re.match(r'^\s*(\d{1,2})\s+([A-E]|\d{1,3})\s*$',line)
        if m: out[int(m.group(1))]=m.group(2)
    if len(out)!=25: raise RuntimeError(f'answer count {len(out)} != 25 for {pdf.name}')
    return out

def points(q):
    if q<=10:return 3
    if q<=20:return 4
    if q<=22:return 5
    if q<=24:return 6
    return 8

def build_bundle(sample:int,cfg):
    pdf=cfg['pdf']; ans=answers(pdf,cfg['answer_page'])
    build_crops(pdf,cfg['zh_pages'],sample,'zh'); build_crops(pdf,cfg['en_pages'],sample,'en')
    profile={
      'id':f'au-amc-pre-a-sample-{sample}',
      'name':f'Australian AMC Pre-A · Sample Paper {sample}',
      'nameZh':f'澳洲 AMC Pre-A · 官方样题 {sample}',
      'nameEn':f'Australian AMC Pre-A · Sample Paper {sample}',
      'grades':'Pre-A','gradesZh':'Pre-A（低年级样题）','gradesEn':'Pre-A',
      'gradeBand':'1-2','durationSeconds':0,'timingMode':'untimed',
      'questionCount':25,'initialScore':0,'maxScore':100,
      'wrongPenaltyMode':'fixed','wrongPenaltyValue':0,
      'country':'Australia AMC','competitionId':'australian-amc','formatId':'australian-amc-pre-a','paperType':'sample',
      'formatLabelZh':'AMC Pre-A 样题赛制','formatLabelEn':'AMC Pre-A sample format',
      'rulesSummaryZh':'25题 / 100分；1–20选择题，21–25为0–999整数填答。官方样题未注明正式限时，因此本站按不限时样题模式呈现。',
      'rulesSummaryEn':'25 questions / 100 points; Q1–20 multiple choice, Q21–25 integer answers 0–999. The official sample does not state a formal time limit, so the site presents it as untimed practice.',
      'language':'zh/en','sourceLabel':'AMT official-supplied AMC Pre-A sample',
      'sourceLabelZh':'澳大利亚数学信托 AMT · 官方提供 AMC Pre-A 样题',
      'sourceLabelEn':'Australian Maths Trust · official-supplied AMC Pre-A sample','studentReady':True,
    }
    qs=[]
    for q in range(1,26):
        mode='choice' if q<=20 else 'integer'
        base=f'/local-assets/australian-amc/pre-a/sample-{sample}'
        qs.append({
          'id':f'au-amc-pre-a-s{sample}-q{q:02d}','year':2026,'level':'Pre-A','grades':'Pre-A','language':'zh/en',
          'questionNo':q,'points':points(q),'answerMode':mode,'concept':'official_original',
          'stem':f'请根据官方 AMC Pre-A 样题图完成第 {q} 题。','stemEn':f'Answer Question {q} using the official AMC Pre-A question image.',
          'choices':CHOICES if mode=='choice' else [],'choicesEn':CHOICES if mode=='choice' else [],
          'answer':ans[q],'solution':'','sourceFile':str(pdf),'studentAssetUrlZh':f'{base}/zh/q{q:02d}.png',
          'studentAssetUrlEn':f'{base}/en/q{q:02d}.png','verified':True,'examReady':True,
          'sourceMeta':{'competition':'Australian AMC','collection':'Pre-A','sample':sample,'officialSupplied':True},
        })
    EXAM_ROOT.mkdir(parents=True,exist_ok=True)
    out=EXAM_ROOT/f"{profile['id']}.json"; out.write_text(json.dumps({'profile':profile,'questions':qs},ensure_ascii=False,indent=2),encoding='utf-8')
    print('wrote',out)

if __name__=='__main__':
    for sample,cfg in SAMPLES.items(): build_bundle(sample,cfg)
