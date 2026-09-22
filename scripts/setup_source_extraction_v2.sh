#!/usr/bin/env bash
set -euo pipefail

ROOT="${OCR_TOOL_ROOT:-/mnt/disk1/Tools/ocr}"
export PATH="$HOME/.local/bin:$PATH"

if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required" >&2
  exit 2
fi

if ! uv python find 3.12 >/dev/null 2>&1; then
  uv python install 3.12
fi

if uv tool list 2>/dev/null | grep -q '^mineru '; then
  uv tool upgrade mineru
else
  uv tool install --python 3.12 'mineru>=4.0,<5'
fi

PADDLE_ROOT="$ROOT/paddleocr-vl"
PADDLE_PY="$PADDLE_ROOT/.venv/bin/python"
mkdir -p "$PADDLE_ROOT"
if [[ ! -x "$PADDLE_PY" ]]; then
  uv venv --python 3.12 "$PADDLE_ROOT/.venv"
fi

# Install PaddleOCR first because it pulls the CPU paddlepaddle package.
# After that, select the final backend explicitly so the GPU wheel is not
# accidentally overwritten by PaddleOCR dependency resolution.
uv pip install --python "$PADDLE_PY" -U 'paddleocr[doc-parser]'

PADDLE_USE_GPU=0
if command -v nvidia-smi >/dev/null 2>&1; then
  CAP="$(nvidia-smi --query-gpu=compute_cap --format=csv,noheader 2>/dev/null | head -1 || true)"
  # The stable PaddlePaddle 3.2.1 cu126 wheel is built through sm_90.
  # Blackwell sm_120 (RTX 50-series) aborts at runtime, so keep PaddleOCR on
  # CPU there. MinerU can still use its own VLM backend independently.
  case "$CAP" in
    12.*) PADDLE_USE_GPU=0 ;;
    '')   PADDLE_USE_GPU=0 ;;
    *)    PADDLE_USE_GPU=1 ;;
  esac
fi
if [[ "$PADDLE_USE_GPU" == 1 ]]; then
  uv pip uninstall --python "$PADDLE_PY" paddlepaddle >/dev/null 2>&1 || true
  uv pip install --python "$PADDLE_PY" --no-deps 'paddlepaddle-gpu==3.2.1' -i https://www.paddlepaddle.org.cn/packages/stable/cu126/
else
  uv pip uninstall --python "$PADDLE_PY" paddlepaddle-gpu >/dev/null 2>&1 || true
  uv pip install --python "$PADDLE_PY" --no-deps 'paddlepaddle==3.2.1' -i https://www.paddlepaddle.org.cn/packages/stable/cpu/
fi

mineru version --json
"$PADDLE_PY" - <<'PY'
import paddle, paddleocr
print({"paddle": paddle.__version__, "cuda": paddle.is_compiled_with_cuda(), "device": paddle.device.get_device(), "paddleocr": getattr(paddleocr, "__version__", "unknown")})
PY
