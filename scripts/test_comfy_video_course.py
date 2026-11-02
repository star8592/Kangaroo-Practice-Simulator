#!/usr/bin/env python3
"""Zero-network regression for original ComfyUI course and safe deliverable."""
from pathlib import Path
import subprocess
import sys

root=Path(__file__).resolve().parents[1]
page=(root/"src/app/skill-labs/comfy-video/page.tsx").read_text(encoding="utf-8")
course=(root/"src/lib/comfy-video-course.ts").read_text(encoding="utf-8")
hub=(root/"src/app/skill-labs/page.tsx").read_text(encoding="utf-8")
sitemap=(root/"src/app/sitemap.ts").read_text(encoding="utf-8")
tool=root/"public/skill-labs/comfy-video/comfy_video_inspector.py"
assert tool.is_file()
assert '"/skill-labs/comfy-video"' in sitemap
assert 'href="/skill-labs/comfy-video"' in hub
assert 'isAccessibleForFree:true' in page
assert 'application/ld+json' in page
assert 'comfy_video_inspector.py' in page
assert course.count('title:"0')==8
assert course.count('task:"')==8
proc=subprocess.run([sys.executable,str(tool),"--self-test"],capture_output=True,text=True)
assert proc.returncode==0,proc.stderr
assert "Ran 10 tests" in proc.stderr
print("COMFY_VIDEO_COURSE_AND_INSPECTOR_PASS")
