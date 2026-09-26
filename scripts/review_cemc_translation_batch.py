#!/usr/bin/env python3
"""Disabled: CEMC review is GPT-only.

This stub intentionally prevents accidental Ollama/Qwen review from re-entering the
CEMC publication pipeline. Build a GPT review packet and have GPT produce the
reviewed sidecar instead.
"""
raise SystemExit(
    'CEMC_LOCAL_LLM_DISABLED: use scripts/build_cemc_gpt_review_packet.py and GPT-5.6 Sol; '
    'then validate with scripts/validate_cemc_gpt_review.py'
)
