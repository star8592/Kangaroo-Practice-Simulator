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

# Install the current OCR front-end first, then select the Paddle runtime.
uv pip install --python "$PADDLE_PY" -U 'paddleocr[doc-parser]==3.7.0'

PADDLE_VERSION="${PADDLE_VERSION:-3.4.0}"
if command -v nvidia-smi >/dev/null 2>&1; then
  CAP="$(nvidia-smi --query-gpu=compute_cap --format=csv,noheader 2>/dev/null | head -1 || true)"
else
  CAP=""
fi

if [[ "$CAP" == 12.* ]]; then
  # Consumer Blackwell / RTX 50-series: Paddle 3.4 + CUDA 13 contains sm_120.
  uv pip uninstall --python "$PADDLE_PY" paddlepaddle paddlepaddle-gpu >/dev/null 2>&1 || true
  uv pip install --python "$PADDLE_PY" --reinstall "paddlepaddle-gpu==$PADDLE_VERSION" \
    --index https://www.paddlepaddle.org.cn/packages/stable/cu130/ \
    --index-strategy unsafe-best-match
  PADDLE_DEVICE="gpu:0"
elif [[ -n "$CAP" ]]; then
  uv pip uninstall --python "$PADDLE_PY" paddlepaddle paddlepaddle-gpu >/dev/null 2>&1 || true
  uv pip install --python "$PADDLE_PY" --reinstall "paddlepaddle-gpu==$PADDLE_VERSION" \
    --index https://www.paddlepaddle.org.cn/packages/stable/cu126/ \
    --index-strategy unsafe-best-match
  PADDLE_DEVICE="gpu:0"
else
  uv pip uninstall --python "$PADDLE_PY" paddlepaddle-gpu >/dev/null 2>&1 || true
  uv pip install --python "$PADDLE_PY" "paddlepaddle==$PADDLE_VERSION" \
    -i https://www.paddlepaddle.org.cn/packages/stable/cpu/
  PADDLE_DEVICE="cpu"
fi

mineru version --json
"$PADDLE_PY" - <<'PY'
import paddle, paddleocr
print({"paddle": paddle.__version__, "cuda": paddle.is_compiled_with_cuda(), "device": paddle.device.get_device(), "paddleocr": getattr(paddleocr, "__version__", "unknown")})
if paddle.is_compiled_with_cuda():
    paddle.set_device("gpu:0")
    x=paddle.to_tensor([1.0,2.0])
    print({"gpu_smoke": str(x.place), "values": (x*x).numpy().tolist()})
PY
