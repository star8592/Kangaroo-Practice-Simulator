#!/usr/bin/env python3
"""SOC THINK original read-only ComfyUI workflow and delivered-video audit."""
import argparse
import hashlib
import json
import shutil
import subprocess
import unittest
from pathlib import Path

VIDEO_SAVERS={"SaveVideo","VHS_VideoCombine","SaveAnimatedWEBP"}
MODEL_EXT=(".safetensors",".ckpt",".pt",".gguf")

def audit_workflow(graph, models=None):
    err=[]; warn=[]
    if not isinstance(graph,dict) or not graph or len(graph)>3000:
        return {"status":"FAIL","errors":["API graph must contain 1–3000 nodes"],"warnings":[]}
    if isinstance(graph.get("nodes"),list):
        return {"status":"FAIL","errors":["GUI workflow: use Export (API) format"],"warnings":[]}
    edges={}; names=set(); savers=[]
    for node_id,node in graph.items():
        if not isinstance(node,dict) or not isinstance(node.get("class_type"),str) or not isinstance(node.get("inputs"),dict):
            err.append("Invalid node "+str(node_id)); continue
        edges[node_id]=[]
        if node["class_type"] in VIDEO_SAVERS or "SaveVideo" in node["class_type"]:savers.append(node_id)
        for key,value in node["inputs"].items():
            if isinstance(value,list) and len(value)==2 and isinstance(value[0],str) and type(value[1]) is int:
                edges[node_id].append(value[0])
            elif isinstance(value,str) and value.lower().endswith(MODEL_EXT):
                names.add(Path(value).name)
    for node_id,dependencies in edges.items():
        for source in dependencies:
            if source not in edges:err.append(f"{node_id}: missing upstream node {source}")
    states={}
    def visit(node):
        if states.get(node)==1:err.append(f"Cycle detected at {node}");return
        if states.get(node)==2:return
        states[node]=1
        for upstream in edges.get(node,[]):
            if upstream in edges:visit(upstream)
        states[node]=2
    for node in edges:visit(node)
    if not savers:warn.append("No recognized video output node")
    if not names:warn.append("No explicit model filename; dynamic loaders may hide requirements")
    missing=[]
    if models:
        if not models.is_dir():err.append("Model directory missing")
        else:
            found={p.name for p in models.rglob("*") if p.is_file() and p.name.lower().endswith(MODEL_EXT)}
            missing=sorted(names-found)
            if missing:warn.append("Some named model files are missing")
    return {"status":"FAIL" if err else "WARN" if warn else "PASS","node_count":len(edges),
            "video_output_nodes":savers,"referenced_models":sorted(names),"missing_models":missing,
            "errors":err[:30],"warnings":warn[:15],
            "caveat":"Graph checks do not prove node installation, model license, render quality or execution success"}

def audit_video(path):
    if not path.is_file() or not path.stat().st_size:raise ValueError("Missing or empty video")
    with path.open("rb") as fd:sha=hashlib.file_digest(fd,"sha256").hexdigest()
    out={"name":path.name,"bytes":path.stat().st_size,"sha256":sha}
    if not shutil.which("ffprobe"):
        out["warning"]="ffprobe missing; stream not verified"
        return out
    call=subprocess.run(["ffprobe","-v","error","-show_entries","format=duration:stream=codec_type,codec_name,width,height,nb_frames,r_frame_rate","-of","json",str(path)],
        capture_output=True,text=True,timeout=25)
    if call.returncode:raise ValueError("Video ffprobe failed")
    parsed=json.loads(call.stdout)
    streams=[s for s in parsed.get("streams",[]) if s.get("codec_type")=="video"]
    if not streams:raise ValueError("No video stream")
    dur=float(parsed.get("format",{}).get("duration") or 0)
    if dur<=0:raise ValueError("Nonpositive duration")
    out.update(duration_seconds=dur,video_streams=streams,
               audio_streams=sum(s.get("codec_type")=="audio" for s in parsed.get("streams",[])))
    return out

class Tests(unittest.TestCase):
    graph={"1":{"class_type":"ModelLoader","inputs":{"filename":"demo.safetensors"}},
           "2":{"class_type":"CreateVideo","inputs":{"frames":["1",0]}},
           "3":{"class_type":"SaveVideo","inputs":{"video":["2",0]}}}
    def test_good(self):self.assertEqual(audit_workflow(self.graph)["status"],"PASS")
    def test_empty(self):self.assertEqual(audit_workflow({})["status"],"FAIL")
    def test_gui(self):self.assertEqual(audit_workflow({"nodes":[{"id":1}]})["status"],"FAIL")
    def test_missing_node(self):
        obj=json.loads(json.dumps(self.graph));obj["3"]["inputs"]["video"]=["99",0]
        self.assertEqual(audit_workflow(obj)["status"],"FAIL")
    def test_cycle(self):
        obj=json.loads(json.dumps(self.graph));obj["1"]["inputs"]["back"]=["3",0]
        self.assertEqual(audit_workflow(obj)["status"],"FAIL")
    def test_self_loop(self):
        obj=json.loads(json.dumps(self.graph));obj["2"]["inputs"]["self"]=["2",0]
        self.assertEqual(audit_workflow(obj)["status"],"FAIL")
    def test_no_output(self):self.assertEqual(audit_workflow({"1":self.graph["1"]})["status"],"WARN")
    def test_malformed(self):self.assertEqual(audit_workflow({"1":{"class_type":"X"}})["status"],"FAIL")
    def test_model_present(self):
        from tempfile import TemporaryDirectory
        with TemporaryDirectory() as tmp:
            (Path(tmp)/"demo.safetensors").write_bytes(b"t")
            self.assertEqual(audit_workflow(self.graph,Path(tmp))["missing_models"],[])
    def test_model_missing(self):
        from tempfile import TemporaryDirectory
        with TemporaryDirectory() as tmp:
            self.assertEqual(audit_workflow(self.graph,Path(tmp))["missing_models"],["demo.safetensors"])

if __name__=="__main__":
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--workflow",type=Path,help="Exported ComfyUI API JSON")
    ap.add_argument("--model-root",type=Path,help="Optional ComfyUI models folder (read-only)")
    ap.add_argument("--video",type=Path,help="Optional produced MP4")
    ap.add_argument("--self-test",action="store_true")
    args=ap.parse_args()
    if args.self_test:
        r=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(Tests))
        raise SystemExit(0 if r.wasSuccessful() else 1)
    if not args.workflow and not args.video:ap.error("Supply --workflow and/or --video")
    report={"schema":"socthink_comfy_video_audit_v1"}
    try:
        if args.workflow:
            if args.workflow.stat().st_size>4*1024*1024:raise ValueError("Workflow exceeds 4 MiB")
            report["workflow"]=audit_workflow(json.loads(args.workflow.read_text(encoding="utf-8")),args.model_root)
        if args.video:report["video"]=audit_video(args.video)
        report["status"]="FAIL" if report.get("workflow",{}).get("status")=="FAIL" else "INSPECTED"
        print(json.dumps(report,ensure_ascii=False,indent=2))
        raise SystemExit(2 if report["status"]=="FAIL" else 0)
    except (OSError,ValueError,subprocess.TimeoutExpired) as ex:
        print(json.dumps({"status":"FAIL","error":str(ex)},ensure_ascii=False))
        raise SystemExit(2)
