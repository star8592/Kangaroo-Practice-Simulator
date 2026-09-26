#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
EXAM="${1:?usage: scripts/run_cemc_exam_pipeline.sh <exam-id>}"
REVIEW="private/translations/cemc-reviewed/$EXAM.reviewed.json"

# CEMC is GPT-only. Local Ollama/Qwen models are intentionally excluded because
# PDF math layout errors (fractions, superscripts, diagram labels) require a
# stronger semantic reviewer.
.venv-tools/bin/python scripts/build_cemc_translation_queue.py
python3 scripts/build_cemc_gpt_review_packet.py --exam "$EXAM"

if [[ ! -f "$REVIEW" ]]; then
  echo "CEMC_GPT_REVIEW_REQUIRED exam=$EXAM packet=private/translation/gpt-packets/$EXAM.json preferred_model='GPT-5.6 Sol'"
  exit 0
fi

python3 scripts/validate_cemc_gpt_review.py --exam "$EXAM" --review "$REVIEW"

if [[ "${CEMC_AUTO_PROMOTE:-0}" != "1" ]]; then
  echo "CEMC_GPT_REVIEW_READY exam=$EXAM; rerun with CEMC_AUTO_PROMOTE=1 to promote after inspection"
  exit 0
fi

python3 scripts/promote_cemc_reviewed_exam.py --exam "$EXAM" --review "$REVIEW"
python3 scripts/validate_bilingual_bundle.py "private/exams/$EXAM.json" --assets-root public
python3 scripts/validate_cemc_objective.py
npm run test:cemc-canonical
npm run test:cemc-localization
npm run test:rights-bindings
