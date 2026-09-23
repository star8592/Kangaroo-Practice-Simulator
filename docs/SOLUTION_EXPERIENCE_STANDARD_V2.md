# Solution Experience Standard V2

Status: **mandatory for every newly materialized or republished verified solution**.

This standard replaces the old “static answer/explanation” model. Existing legacy
solutions remain readable, but any solution that is newly generated, rematerialized,
or republished must pass V2 before it is treated as production-ready.

## 1. Mathematical gate

A V2 solution must be `quality=verified` and satisfy all of the following:

- official answer matched;
- independent solver agreement;
- confidence >= 0.65;
- 2–12 teaching scenes;
- every scene has non-empty narration;
- no reasoning is invented from the official answer alone.

If the source only contains an official answer, the student UI must explicitly say
that a verified derivation is still pending.

## 2. Visual reasoning gate

Every scene must be deterministically directable.

Allowed foundations include:

- original/source question image;
- number line;
- fraction bar;
- 3D solid when spatial reasoning genuinely requires it;
- deterministic Math DSL / SVG / JSXGraph / Three.js / Manim script.

A text-only static answer page is not V2.

When the original question image is available, prefer direct annotations on the
original image (`IMAGE`, `SPOT`, `TRACE`, `PICK`, `HIGHLIGHT`, etc.) instead
of redrawing the entire question. Do not use 3D for decoration.

## 3. Narration gate

Production narration uses the project-wide warm teacher profile:

- `voiceProfile = warm-teacher-v1`;
- current engine: IndexTTS2.5;
- warm, calm, encouraging delivery;
- key reasoning transitions may pause slightly for prediction;
- narration must finish before the player advances to the next scene.

Low grades use shorter sentences, concrete language, and more prediction pauses.
Higher grades can use denser symbolic language but must remain natural spoken
explanation rather than reading a written proof aloud.

## 4. Playback contract

The student-facing experience uses:

- `playbackProfile = continuous-auto-v1`;
- opening a solution starts continuous narration automatically;
- next scene begins only after the previous narration finishes;
- pause/resume and speed are secondary controls;
- no primary “turn narration off” button;
- only one solution player may speak at a time.

The teacher/mascot is supportive UI only and may never obscure the question,
choices, diagrams, or reasoning marks.

## 5. Publication metadata

A successfully materialized V2 solution must contain:

```json
{
  "solutionStandardVersion": 2,
  "materialization": {
    "audioReady": true,
    "voiceProfile": "warm-teacher-v1",
    "playbackProfile": "continuous-auto-v1",
    "visualReasoningRequired": true
  }
}
```

The public generated-solution manifest carries the same standard identifiers.

## 6. Enforcement

The following entry points enforce V2:

- `scripts/generate_core_solution.mjs`: GPT author + independent critic;
- `scripts/materialize_verified_solutions.py`: bulk/local materialization;
- `scripts/render_solution_tts.py`: single-question narration path;
- `scripts/run_solution_factory.py`: factory orchestration;
- `scripts/validate_solution_standard_v2.py`: migration and strict validator;
- `ops/automation/quality_gate.sh`: CI/release gate for every tagged V2 solution.

A tagged V2 solution that violates the contract blocks the quality gate.

## 7. Legacy migration

Legacy verified solutions are classified as:

- `LEGACY_EQUIVALENT`: already functionally complete but not tagged V2;
- `NEEDS_MATERIALIZATION`: verified/directable but missing fresh V2 audio;
- `NEEDS_DIRECTOR_UPGRADE`: math/director content must be corrected before audio.

Generate the migration report with:

```bash
python3 scripts/validate_solution_standard_v2.py --write --show 0
```

Snapshot on 2026-09-23 before V2 rollout:

- verified solutions: 182;
- fully directed: 182;
- audio-ready: 87;
- needing audio materialization: 95;
- missing scene-specific `voiceDirection`: 69 (global warm profile still applies).

The migration backlog must shrink over time; no newly materialized solution may be
added to the legacy backlog.
