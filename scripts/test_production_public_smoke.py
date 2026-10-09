#!/usr/bin/env python3
"""Test the production smoke's actual HTTP contract, including negative privacy cases."""
import importlib.util
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

p=Path(__file__).with_name("smoke_production_public.py")
spec=importlib.util.spec_from_file_location("prod_smoke",p)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

SHA="a"*40
state={"leak":False,"status":False,"sha":SHA}
class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def do_GET(self):
        if self.path=="/api/release":
            data={"ok":True,"deployedSha":state["sha"],"gitSha":state["sha"]}
            self.send(200,data)
        elif self.path=="/api/miniapp/world-competitions":
            record={"event":{"id":"ukmt"},"following":None,"progress":None}
            if state["leak"]:record["following"]=True
            self.send(200,{"entries":[record]})
        elif self.path=="/competitions": self.send(200,"ok")
        else:
            status=403 if self.path=="/api/admin/competition-source-watch" else 401
            if state["status"] and self.path=="/api/competition-follow":status=200
            self.send(status,{"error":"unauthorized"})
    def send(self,status,data):
        if isinstance(data,str): payload=data.encode()
        else: payload=json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type","application/json")
        self.send_header("Content-Length",str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

server=ThreadingHTTPServer(("127.0.0.1",0),Handler)
thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
base=f"http://127.0.0.1:{server.server_port}"
try:
    assert len(mod.run(base,SHA))==len(mod.PUBLIC_CHECKS)
    for state_field,value in (("leak",True),("status",True),("sha","b"*40)):
        state[state_field]=value
        try:
            mod.run(base,SHA)
            raise AssertionError(f"unsafe release accepted: {state_field}")
        except RuntimeError:pass
        finally:state[state_field]=False if state_field!="sha" else SHA
    try:
        mod.run("http://not-loopback.example")
        raise AssertionError("insecure HTTP accepted")
    except ValueError:pass
    print("PRODUCTION_PUBLIC_SMOKE_MUTATIONS=PASS positive=1 negative=4")
finally:
    server.shutdown();server.server_close()
