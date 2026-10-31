#!/usr/bin/env python3
"""Local-only end-to-end acceptance: atomic SIGHUP reload without downtime."""
import copy
import json
import os
import pathlib
import signal
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

root = pathlib.Path(__file__).resolve().parents[1]
bin_path = root / "backend/socthink-core/target/debug/socthink-catalog-api"
fixture = root / "backend/socthink-core/tests/fixtures/catalog.json"
if not bin_path.is_file():
    raise SystemExit("Build Rust catalog binary first with cargo build --locked")

with tempfile.TemporaryDirectory(prefix="socthink-rust-hot-reload-") as tmp:
    catalog = pathlib.Path(tmp) / "catalog.json"
    initial = json.loads(fixture.read_text(encoding="utf8"))
    catalog.write_text(json.dumps(initial), encoding="utf8")
    catalog.chmod(0o600)
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    url = f"http://127.0.0.1:{port}/v1/catalog/resources"

    def read():
        with urllib.request.urlopen(url, timeout=2) as response:
            assert response.status == 200
            return json.load(response)

    def atomic_update(data):
        pending = pathlib.Path(tmp) / "catalog.pending"
        pending.write_text(json.dumps(data), encoding="utf8")
        pending.chmod(0o600)
        pending.replace(catalog)

    env = {**os.environ, "SOCTHINK_CATALOG_SNAPSHOT": str(catalog),
           "SOCTHINK_RUST_BIND": f"127.0.0.1:{port}"}
    proc = subprocess.Popen([str(bin_path)], cwd=root, env=env,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(80):
            try:
                if read()["total"] == 2:
                    break
            except (OSError, TimeoutError):
                time.sleep(0.1)
        else:
            raise AssertionError("Rust catalog did not start")

        changed = copy.deepcopy(initial)
        changed["generatedAt"] = "2026-10-31T01:00:00Z"
        row = copy.deepcopy(changed["rows"][0])
        row["id"] = "synthetic-refresh"
        row["examUrl"] = "/exam/synthetic-refresh"
        changed["rows"].append(row)
        atomic_update(changed)
        proc.send_signal(signal.SIGHUP)
        for _ in range(80):
            if read()["total"] == 3:
                break
            time.sleep(0.1)
        else:
            raise AssertionError("Valid snapshot did not become active")

        # Invalid JSON and a valid-but-empty snapshot must not destroy index.
        for invalid in ('{truncated', json.dumps({
            "version": 1, "generatedAt": "2026-10-31", "rows": []})):
            pending = pathlib.Path(tmp) / "catalog.pending"
            pending.write_text(invalid, encoding="utf8")
            pending.chmod(0o600)
            pending.replace(catalog)
            proc.send_signal(signal.SIGHUP)
            time.sleep(0.2)
            assert read()["total"] == 3, "invalid update replaced valid index"
            assert proc.poll() is None, "Rust process died on invalid snapshot"

        # The body remains metadata-only even after multiple refreshes.
        body = json.dumps(read(), ensure_ascii=False)
        assert "rightsPolicy" not in body and "sourceFile" not in body
        assert "answer" not in body and "buyer" not in body
        print("RUST_CATALOG_SIGHUP_ATOMIC=PASS initial=2 refreshed=3 "
              "invalidUpdatesRejected=2 noDowntime=true")
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=6)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=5)
