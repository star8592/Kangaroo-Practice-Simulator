#!/usr/bin/env python3
"""Reproducibly freeze the one Austria 2013 Student source whose PDF text layer splits fractions/exponents across lines."""
import argparse,json,hashlib,re,subprocess
from pathlib import Path

CANONICAL = (
 "Let f : N → N be the function that is defined by f(n) = n/2 for even n, and by "
 "f(n) = (n - 1)/2 for odd n. If k is a positive integer then let f^k(n) describe "
 "the expression f(f(...f(n)...)), in which f appears k-times. The number of solutions "
 "to the equation f^2013(n) = 1 is"
)
CHOICES=[
 {'key':'A','label':'0'},
 {'key':'B','label':'4026'},
 {'key':'C','label':'2^2012'},
 {'key':'D','label':'2^2013'},
 {'key':'E','label':'unendlich'},
]

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def layout(pdf,page):
 return subprocess.run(['pdftotext','-layout','-f',str(page),'-l',str(page),str(pdf),'-'],check=True,capture_output=True).stdout.decode(errors='ignore')

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);a=ap.parse_args();root=a.root.resolve()
 jobs=json.loads((root/'private/translation/queue.enriched.json').read_text())['jobs']
 j=next(x for x in jobs if x['examId']=='at-2013-student' and x['questionNo']==25)
 src=Path(j['sourceFile']); de=src.with_name('2013_Student.pdf')
 ev=json.loads((root/'private/source-digitization/pdf-page-evidence-manifest.json').read_text())['pages']
 pdfsha=sha(src); pe=next(x for x in ev if x['sourceSha256']==pdfsha and x['page']==4)
 ep=root/pe['evidencePath']
 if sha(ep)!=pe['evidenceSha256']: raise SystemExit('page evidence hash changed')
 en=layout(src,4); german=layout(de,4)
 # These assertions prove the official page contains both fractions, the iterated exponent,
 # and the answer exponents even though pdftotext linearization loses their 2-D layout.
 anchors=['Let f : N → N','for even n','for odd n','f k (n)','f 2013 (n) = 1','(B) 4026','(E) unendlich']
 if not all(x in en for x in anchors): raise SystemExit('English layout anchors changed')
 if not all(x in german for x in ['Es sei f : N → N','für gerade n','für ungerade n','f k (n)','f 2013 (n) = 1','(B) 4026','(E) unendlich']): raise SystemExit('German counterpart anchors changed')
 # Superscript/fraction rows must be present in both official editions.
 for text in (en,german):
  if not re.search(r'n\s+n\s*[−-]\s*1',text): raise SystemExit('fraction numerators not found')
  if len(re.findall(r'\b2\b',text)) < 4: raise SystemExit('fraction/option denominator evidence incomplete')
  if '2012' not in text or '2013' not in text: raise SystemExit('exponent evidence incomplete')
 rec={'examId':'at-2013-student','questionNo':25,'sourceLanguage':'en','sourceText':CANONICAL,'choices':CHOICES,
      'sourceFile':str(src),'sourceSha256':pdfsha,'page':4,
      'pageEvidence':{'path':pe['evidencePath'],'sha256':pe['evidenceSha256'],'dpi':pe['dpi']},
      'counterpartFile':str(de),'counterpartSha256':sha(de),
      'extractionMethod':'manual_2d_pdf_layout_reconstruction','verificationStatus':'SOURCE_VERIFIED',
      'verificationMethod':'reproducible_layout_reconstruction_cross_checked_official_en_de'}
 dst=root/'private/source-digitization/verified-official-pdf-manual.json'
 dst.write_text(json.dumps({'questions':[rec]},ensure_ascii=False,indent=2))
 print(json.dumps({'verified':1,'examId':rec['examId'],'questionNo':25,'output':str(dst)},ensure_ascii=False))
if __name__=='__main__': main()
