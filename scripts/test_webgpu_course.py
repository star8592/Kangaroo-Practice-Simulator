#!/usr/bin/env python3
"""Course source integrity, public routing and independently runnable ZIP contract."""
from pathlib import Path
import json,zipfile,hashlib,subprocess

root=Path(__file__).resolve().parents[1]
page=(root/'src/app/skill-labs/webgpu-basics/page.tsx').read_text()
client=(root/'src/components/WebGpuOrbitLab.tsx').read_text()
data=(root/'src/lib/webgpu-course.ts').read_text()
hub=(root/'src/app/skill-labs/page.tsx').read_text()
sitemap=(root/'src/app/sitemap.ts').read_text()
asset=root/'public/skill-labs/webgpu-basics/orbit-lab.zip'
assert 'WebGpuOrbitLab' in page and '"@type":"Course"' in page
assert 'href="/skill-labs/webgpu-basics"' in hub
assert '"/skill-labs/webgpu-basics"' in sitemap
assert data.count('title: "0')==8, 'eight real lessons expected'
assert data.count('task: "')==8, 'hands-on task required per lesson'
assert 'WebGPURenderer' in client and 'forceWebGL' in client
assert 'isWebGPUBackend' in client, 'must show actual backend'
assert 'isAccessibleForFree:true' in page
assert asset.exists() and asset.stat().st_size>5000
paths=['index.html','src/main.js','package.json','package-lock.json','README.md','PERFORMANCE_LOG_TEMPLATE.csv']
with zipfile.ZipFile(asset) as z:
 assert z.testzip() is None
 assert sorted(z.namelist())==sorted('orbit-lab/'+p for p in paths)
 pkg=json.loads(z.read('orbit-lab/package.json'))
 assert pkg['dependencies']['three']=='0.186.0'
 assert 'dev' in pkg['scripts'] and 'build' in pkg['scripts']
 src=z.read('orbit-lab/src/main.js')
 assert b'WebGPURenderer' in src and b'forceWebGL' in src and b'isWebGPUBackend' in src
 print('WEBGPU_ZIP_SHA256',hashlib.sha256(asset.read_bytes()).hexdigest())
print('WEBGPU_COURSE_STATIC_CONTRACT_PASS')
