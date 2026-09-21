#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
ROUNDS="${1:-5}"
for ((i=1;i<=ROUNDS;i++)); do
  echo "=== localization repair round $i/$ROUNDS ==="
  python3 scripts/auto_repair_localization.py
  python3 scripts/build_localization_review_queue.py
  python3 - <<'PY'
import json,collections
q=json.load(open('private/translation/review-queue.json'))['questions'];d=[x for x in q if x['qualityTier']=='D']
print(json.dumps({'D':len(d),'warnings':collections.Counter(w for x in d for w in x['qualityWarnings'])},ensure_ascii=False,default=dict))
PY
  # Vision repair is serialized: never compete with text translation/Ollama jobs.
  if pgrep -f 'translate_enriched_batch.py' >/dev/null; then echo 'translation active; defer vision'; continue; fi
  timeout 900 python3 scripts/recover_visual_question.py --model qwen3-vl:8b --limit 25 --skip-existing || true
done
python3 scripts/build_localization_review_queue.py
