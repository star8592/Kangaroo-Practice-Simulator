#!/usr/bin/env python3
"""Warm the fixed SOC THINK interview model only while the GPU has spare VRAM.

A single local Ollama request; no customer data, public listener or paid orders.
Safe to run from a bounded systemd user timer. Failures are observable and
cannot enable AI billing.
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
import time
from urllib.request import Request, urlopen

MODEL = "qwen3:4b-instruct-2507-q4_K_M"
API = "http://127.0.0.1:11434"
MIN_FREE_COLD_MIB = 4100
MIN_FREE_LOADED_MIB = 1900
MAX_GPU_UTILIZATION = 70


def gpu_snapshot() -> tuple[int, int]:
    out = subprocess.check_output(
        ["nvidia-smi", "--query-gpu=memory.free,utilization.gpu",
         "--format=csv,noheader,nounits"],
        stderr=subprocess.DEVNULL, timeout=6, text=True,
    ).splitlines()[0]
    parts = [int(x.strip()) for x in out.split(",")]
    if len(parts) != 2:
        raise ValueError("GPU_METRICS_INVALID")
    return parts[0], parts[1]


def json_request(path: str, data: dict | None, timeout: int) -> dict:
    payload = json.dumps(data).encode("utf8") if data is not None else None
    request = Request(
        API + path, data=payload,
        headers={"Content-Type": "application/json"} if payload else {},
        method="POST" if payload else "GET",
    )
    with urlopen(request, timeout=timeout) as response:
        if response.status != 200:
            raise RuntimeError("OLLAMA_HTTP_FAILURE")
        result = json.loads(response.read(16000))
        if not isinstance(result, dict):
            raise ValueError("OLLAMA_RESPONSE_INVALID")
        return result


def should_warm(loaded: bool, free_mib: int, utilization: int) -> bool:
    if utilization > MAX_GPU_UTILIZATION:
        return False
    return free_mib >= (
        MIN_FREE_LOADED_MIB if loaded else MIN_FREE_COLD_MIB
    )


def main() -> int:
    try:
        free, utilization = gpu_snapshot()
        loaded = MODEL in {
            item.get("name") for item in
            json_request("/api/ps", None, 5).get("models", [])
            if isinstance(item, dict)
        }
        if not should_warm(loaded, free, utilization):
            print(f"CAREER_MODEL_WARMUP=SKIP loaded={loaded} freeMiB={free} gpuUtil={utilization}")
            return 0
        before = time.monotonic()
        result = json_request(
            "/api/generate", {"model": MODEL, "keep_alive": "20m", "stream": False}, 55
        )
        if result.get("done") is not True:
            raise ValueError("MODEL_PRELOAD_NOT_DONE")
        print("CAREER_MODEL_WARMUP=PASS "
              f"alreadyLoaded={loaded} elapsedMs={int((time.monotonic()-before)*1000)}")
        return 0
    except Exception as exc:
        # No secrets, prompt content or detailed system information in logs.
        print("CAREER_MODEL_WARMUP=UNAVAILABLE type=" + type(exc).__name__)
        return 2


if __name__ == "__main__":
    sys.exit(main())
