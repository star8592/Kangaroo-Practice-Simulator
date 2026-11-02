#!/usr/bin/env python3
"""Zero-network regression: original Agent course, download and index routes."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
lab = ROOT / "public/skill-labs/agent-foundations/agent_tool_contract_lab.py"
page = (ROOT / "src/app/skill-labs/agent-foundations/page.tsx").read_text(encoding="utf-8")
hub = (ROOT / "src/app/skill-labs/page.tsx").read_text(encoding="utf-8")
sitemap = (ROOT / "src/app/sitemap.ts").read_text(encoding="utf-8")
data = (ROOT / "src/lib/frontier-agent-course.ts").read_text(encoding="utf-8")
assert lab.is_file()
assert 'href="/skill-labs/agent-foundations"' in hub
assert '"/skill-labs/agent-foundations"' in sitemap
assert '"/shop"' in sitemap and '"/career"' in sitemap
assert 'CAREER_ORIGINAL_GUIDES' in sitemap
assert '"@type":"Course"' in page and 'isAccessibleForFree:true' in page
assert 'download' in page and 'sourceFile' in page
assert data.count("challenge:") == 6
assert '并非官方认证' in page
assert 'tool_lab.py' not in page
proc = subprocess.run([sys.executable, str(lab), "--self-test"],capture_output=True,text=True)
assert proc.returncode == 0, proc.stdout + proc.stderr
assert "Ran 7 tests" in proc.stderr
print("FRONTIER_SKILL_STATIC_AND_PYTHON_PASS")
