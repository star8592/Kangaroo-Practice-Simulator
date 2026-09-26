#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
EXAM="${1:?usage: scripts/run_cemc_exam_pipeline.sh <exam-id>}"
MODEL="${CEMC_TRANSLATE_MODEL:-qwen3.8:9b}"
REVIEW_MODEL="${CEMC_REVIEW_MODEL:-qwen3.8:9b}"

.venv-tools/bin/python scripts/build_cemc_translation_queue.py --exam "$EXAM" --out private/translation/cemc.one.enriched.json
python3 scripts/translate_enriched_batch.py --queue private/translation/cemc.one.enriched.json --outdir private/translations/cemc-auto --exam "$EXAM" --limit 25 --model "$MODEL" --skip-existing
python3 scripts/review_cemc_translation_batch.py --queue private/translation/cemc.one.enriched.json --draftdir private/translations/cemc-auto --outdir private/translations/cemc-reviewed --exam "$EXAM" --limit 25 --model "$REVIEW_MODEL"

# Promotion is deliberately opt-in. Source extraction and model review are automated,
# but publishing a whole contest requires the reviewed sidecar to pass the strict gate.
if [[ "${CEMC_AUTO_PROMOTE:-0}" != "1" ]]; then
  echo "CEMC_REVIEW_READY exam=$EXAM; inspect the reviewed sidecar, then rerun with CEMC_AUTO_PROMOTE=1"
  exit 0
fi

python3 scripts/promote_cemc_reviewed_exam.py --exam "$EXAM"
python3 scripts/validate_bilingual_bundle.py "private/exams/$EXAM.json" --assets-root public
python3 scripts/validate_cemc_objective.py
npm run test:rights-bindings
