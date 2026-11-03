import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "career_warm", Path(__file__).resolve().parents[1] / "ops/career/prewarm_ollama.py"
)
module = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(module)

# No GPU access required: exercise the resource arbitration policy.
assert module.should_warm(False, 5000, 5)
assert not module.should_warm(False, 3000, 5)
assert module.should_warm(True, 2300, 5)
assert not module.should_warm(True, 1500, 5)
assert not module.should_warm(True, 4000, 75)
assert module.API == "http://127.0.0.1:11434"
assert module.MODEL == "qwen3:4b-instruct-2507-q4_K_M"
print("CAREER_MODEL_WARM_POLICY=PASS gpu_headroom=YES local_only=YES")
