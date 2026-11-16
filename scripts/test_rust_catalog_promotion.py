#!/usr/bin/env python3
"""Real Rust + atomic producer acceptance. No production host, users or payments."""
import copy
import json
import os
import pathlib
import signal
import socket
import subprocess
import tempfile
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
BIN = ROOT / "backend/socthink-core/target/debug/socthink-catalog-api"
FIXTURE = ROOT / "backend/socthink-core/tests/fixtures/catalog.json"
if not BIN.is_file():
    raise SystemExit("Build Rust first with cargo build --locked --manifest-path backend/socthink-core/Cargo.toml")


def run_publisher(candidate, active, url, pid):
    return subprocess.run(
        [str(ROOT / "node_modules/.bin/tsx"), str(ROOT / "scripts/promote_rust_catalog_snapshot.ts"),
         "--candidate", str(candidate), "--snapshot", str(active), "--rust-url", url, "--pid", str(pid)],
        cwd=ROOT, text=True, capture_output=True, timeout=22,
    )


def live(url):
    with urllib.request.urlopen(url + "/internal/catalog/status", timeout=2) as response:
        assert response.status == 200
        assert response.headers.get("cache-control") == "no-store"
        return json.load(response)


def save(path, obj):
    path.write_text(json.dumps(obj, ensure_ascii=False), encoding="utf8")
    path.chmod(0o600)


with tempfile.TemporaryDirectory(prefix="socthink-rust-promotion-") as d:
    folder = pathlib.Path(d)
    active, candidate = folder / "active.json", folder / "candidate.json"
    original = json.loads(FIXTURE.read_text())
    save(active, original)
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    url = f"http://127.0.0.1:{port}"
    env = {**os.environ, "SOCTHINK_CATALOG_SNAPSHOT": str(active), "SOCTHINK_RUST_BIND": f"127.0.0.1:{port}"}
    rust = subprocess.Popen([str(BIN)], cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for i in range(50):
            try:
                if live(url)["rows"] == len(original["rows"]):
                    break
            except OSError:
                time.sleep(.1)
        else:
            raise AssertionError("Rust active generation did not start")
        assert live(url)["generatedAt"] == original["generatedAt"]
        after = copy.deepcopy(original)
        after["generatedAt"] = "2026-11-17T10:00:00.000Z"
        added = copy.deepcopy(after["rows"][0])
        added["id"] = "synthetic-resource-added"
        added["examUrl"] = "/exam/synthetic-resource-added"
        after["rows"].append(added)
        save(candidate, after)
        ok = run_publisher(candidate, active, url, rust.pid)
        assert ok.returncode == 0, ok.stdout + ok.stderr
        assert "RUST_CATALOG_PROMOTION=PASS" in ok.stdout
        assert live(url)["generatedAt"] == after["generatedAt"]
        assert live(url)["rows"] == 3
        assert os.stat(active).st_mode & 0o777 == 0o600
        print("RUST_CATALOG_PROMOTION_REAL=PASS 2_to_3 new_memory_generation_confirmed=true")

        unsafe = copy.deepcopy(after)
        unsafe["generatedAt"] = "2026-11-17T11:00:00.000Z"
        unsafe["rows"][0]["answer"] = "PRIVATE"
        save(candidate, unsafe)
        deny = run_publisher(candidate, active, url, rust.pid)
        assert deny.returncode != 0 and "Forbidden data field" in deny.stderr
        assert live(url)["rows"] == 3 and json.loads(active.read_text()) == after
        print("RUST_CATALOG_PRIVATE_METADATA_REJECTED=PASS")

        shrink = copy.deepcopy(after)
        shrink["generatedAt"] = "2026-11-17T11:30:00.000Z"
        shrink["rows"].pop()
        save(candidate, shrink)
        reject = run_publisher(candidate, active, url, rust.pid)
        assert reject.returncode != 0 and "shrink" in reject.stderr
        assert live(url)["rows"] == 3 and json.loads(active.read_text()) == after
        print("RUST_CATALOG_INVENTORY_SHRINK_REJECTED=PASS")

        # Simulate a failed HUP to a different long-running process while Rust
        # continues serving. The promoter must restore the old on-disk file and
        # leave the active Rust index unchanged.
        next_release = copy.deepcopy(after)
        next_release["generatedAt"] = "2026-11-17T12:00:00.000Z"
        added2 = copy.deepcopy(next_release["rows"][0])
        added2["id"] = "synthetic-resource-4"
        added2["examUrl"] = "/exam/synthetic-resource-4"
        next_release["rows"].append(added2)
        save(candidate, next_release)
        noop = subprocess.Popen(
            ["python3", "-c", "import signal,time;signal.signal(signal.SIGHUP,lambda *_: None);time.sleep(60)"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        try:
            time.sleep(.3)
            undone = run_publisher(candidate, active, url, noop.pid)
            assert undone.returncode != 0, undone.stdout + undone.stderr
            assert "RUST_CATALOG_PROMOTION=ROLLED_BACK" in undone.stderr, undone.stderr
            assert json.loads(active.read_text()) == after
            assert live(url)["rows"] == 3 and live(url)["generatedAt"] == after["generatedAt"]
            assert sorted(p.name for p in folder.iterdir()) == ["active.json","candidate.json"]
            print("RUST_CATALOG_POST_PUBLISH_FAILURE_ROLLBACK=PASS last_good_preserved=true")
        finally:
            noop.terminate()
            noop.wait(timeout=5)

        print("RUST_CATALOG_PROMOTION_END_TO_END=PASS")
    finally:
        rust.terminate()
        try:
            rust.wait(timeout=5)
        except subprocess.TimeoutExpired:
            rust.kill()
            rust.wait(timeout=5)
