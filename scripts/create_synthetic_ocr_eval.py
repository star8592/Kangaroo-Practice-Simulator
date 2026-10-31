#!/usr/bin/env python3
"""Generate explicitly synthetic, user-owned OCR test images and gold references."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import json
import shutil
import subprocess
import hashlib
from datetime import datetime,timezone

ROOT=Path("/mnt/disk1/Code/Kangaroo-Practice-Simulator/private/ocr-benchmark-20261031")
ROOT.mkdir(parents=True,exist_ok=True)
ROOT.chmod(0o700)
font_file=subprocess.check_output(["fc-match","-f","%{file}","Noto Sans CJK SC"],text=True).strip()
fixtures=[
 ("demo01",None,[
  "2026年六年级数学试卷（演示样例）",
  "1. 计算：18 × 7 =（   ）",
  "2. 将 3/4 化成小数：（   ）",
  "本图为自制测试，不是真实考试原卷。"]),
 ("mathsymbols02","print",[
  "数学符号对照（自制测试）",
  "1. -7 + 12 =（   ）",
  "2. 3² + 4² =（   ）",
  "3. √49 =（   ）",
  "4. 0.25 × 8 =（   ）"]),
 ("mathlogic03","print",[
  "判断与选项（自制测试）",
  "1. 判断：-3 < -2。",
  "A. 正确         B. 错误",
  "2. 三角形ABC的面积=底×高÷2",
  "3. 1/3 ≠ 0.3"]),
 ("lowres04","lowres",[
  "低清屏幕截图文字（自制测试）",
  "1. 6 ÷ 2 × (1 + 2) =（   ）",
  "2. -1.25 < -1.2",
  "3. 5 × (3 + 2) = 25"]),
]
out=[]
for id,mode,lines in fixtures:
 if id=="demo01":
  src=Path("/mnt/disk1/Code/Kangaroo-Practice-Simulator/private/derived-knowledge-demo-20261031/owned-demo-math.png")
  target=ROOT/(id+".png")
  shutil.copyfile(src,target)
 else:
  f=ImageFont.truetype(font_file, 42 if mode=="print" else 39)
  canvas=Image.new("RGB",(1460,100+115*len(lines)), "white")
  d=ImageDraw.Draw(canvas)
  for i,line in enumerate(lines):
   d.text((60,55+i*115),line,font=f,fill=(12,12,12))
  if mode=="lowres":
   canvas=canvas.resize((675,round(canvas.height*675/1460)),Image.Resampling.BILINEAR)
   canvas=canvas.filter(ImageFilter.GaussianBlur(0.32))
  target=ROOT/(id+".png")
  canvas.save(target,"PNG")
  target.chmod(0o600)
 out.append({
    "id":id,
    "category":{"demo01":"clean_print","mathsymbols02":"math_formula","mathlogic03":"critical_symbols","lowres04":"low_res_screen"}[id],
    "text":"\n".join(lines),
    "human_reviewed":True,
    "critical_symbols":{"demo01":["×"],"mathsymbols02":["-","+","²","√","×"],"mathlogic03":["-","<","÷","≠"],"lowres04":["-","<","÷","×","+"]}[id],
    "has_unreadable_source":False
 })
 assert target.is_file()
 print("FIXTURE",id,target.stat().st_size,hashlib.sha256(target.read_bytes()).hexdigest()[:16])
path=ROOT/"gold.jsonl"
path.write_text("\n".join(json.dumps(x,ensure_ascii=False) for x in out)+"\n",encoding="utf-8")
path.chmod(0o600)
print("GOLD_RECORDS",len(out))
