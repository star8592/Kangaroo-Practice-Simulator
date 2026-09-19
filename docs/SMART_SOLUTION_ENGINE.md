# Smart Solution Engine · 智能动画解题引擎

## Product decision

Canonical output is an interactive narrated explanation. Video is a deterministic export of the same storyboard.
The system must never invent a diagram or a derivation just to make the page look impressive.

Core flow:

```text
question + official answer + source image
  -> solver A / solver B
  -> answer agreement + deterministic checks
  -> pedagogy planner
  -> verified storyboard DSL
  -> interactive web player
  -> narration/TTS + captions
  -> Remotion/Manim video export
```

The same storyboard must drive browser interaction and offline video rendering so there is only one source of truth.

## Quality levels

- answer-only: only the official answer is known; show source image and safe prompts, never fabricate reasoning.
- heuristic: existing textual solution can be segmented into a basic explanation, but has not received multi-solver verification.
- verified: two independent solves agree with the official answer and a verifier has approved the derivation and visual plan.

## Rendering router

Choose the simplest representation that exposes the mathematical relation.

| Problem pattern | Preferred renderer |
| --- | --- |
| counting / grouping / basic arithmetic | counters, ten-frame, number line, bar model |
| ratios / fractions / percentages | fraction bars, tape diagrams, area models |
| word problems / rates / distance-time | animated bar model, timeline, ST graph |
| plane geometry | SVG first; JSXGraph when dragging or constraints matter |
| functions / coordinate geometry | JSXGraph |
| algebraic derivation | MathLive/MathJSON + equation morphing; Manim for export |
| probability / combinatorics | tree, grid, animated enumeration |
| spatial reasoning / solids | Three.js with orbit controls |
| source-image-only archival questions | original image + spotlight/annotation overlays until a verified model exists |

3D is opt-in, not decorative. A solid is rendered in 3D only when the verified storyboard contains explicit geometry.

## Pedagogy contract

Every explanation should follow a short learning arc:

1. Observe: identify givens and the target.
2. Predict: pause before revealing the key relation.
3. Represent: convert words to a mathematical picture.
4. Reason: animate one causal step at a time.
5. Verify: substitute, count, estimate or use an invariant.
6. Transfer: one tiny “what if” variation when useful.

Humor is allowed as seasoning: short, age-appropriate and tied to the mathematical event. Never place jokes inside a dense inference step.

## Verification gates

A storyboard is eligible for automatic publication only when all required checks pass:

- generated answer equals the official answer;
- independent solvers agree on the answer;
- numeric subexpressions are recomputed;
- all quantities and labels used in visuals are traceable to the problem or derivation;
- no hidden assumptions are introduced by a geometry scene;
- every scene has a narration purpose;
- the final answer is consistent with the selected choice / integer response;
- visual QA finds no clipping or unreadable labels.

If any gate fails, save the job as rejected/review-needed and fall back to the source image + official answer.

## Runtime strategy for ~9k questions

Do not pre-render every question immediately.

Priority order:
1. wrong or blank questions just completed by a student;
2. questions with repeated attempts across students;
3. teacher-pinned or competition-important questions;
4. background backfill of the archive.

The generated storyboard, narration audio and video are cached by question id + source hash + engine version.

## Narration and export

Interactive mode may use browser speech only as a fallback. Production audio should use the local IndexTTS 2.5 service.
Store one audio file per scene plus token/word timing where available.

Video export:
- use the existing OpenMontage Remotion composer for layout, captions, transitions and final MP4;
- use Manim for equation-heavy or high-precision mathematical animation;
- use Three.js capture for genuine 3D scenes;
- use FFmpeg/NVENC only as the final encoding/muxing stage.

## Data captured for adaptive teaching

The player should emit learning events, not just play media:

- explanation_opened
- scene_viewed
- checkpoint_answered
- checkpoint_correct
- replay_scene
- narration_toggle
- speed_change
- 3d_interaction
- explanation_completed
- retry_after_explanation

These events can later answer a much more useful question than “did the student watch the video?”:
which representation actually helped this student solve the next problem?

## Current implementation

Implemented in the live Math Competition Lab:
- `src/lib/solution-storyboard.ts`: fail-closed fallback storyboard compiler.
- `src/components/SmartSolutionPlayer.tsx`: interactive narrated player.
- `src/components/ThreeSolidScene.tsx`: orbitable Three.js cube scene.
- `schemas/solution-storyboard.schema.json`: contract for generated verified storyboards.
- `scripts/test_solution_storyboard.ts`: safety regression tests.
- `/review`: “动画讲懂这道题” entry is integrated after grading.

Next implementation layer is the multimodal batch/on-demand solver worker that writes verified storyboard JSON under `private/solutions/`.

