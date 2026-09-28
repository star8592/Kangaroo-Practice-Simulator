# Production Question Data Release

## Goal

Production question data is released independently from application code. The source archive, verified canonical source layer, and student-facing question bank are distinct release stages.

## Data stages

```text
raw PDF / HTML / image
  -> extraction / OCR
  -> SOURCE_VERIFIED
  -> translation + visual review
       ├─> TRAINING_READY -> authenticated private-training surface
       └─> STUDENT_READY  -> student-facing production surface
```

### SOURCE_VERIFIED

A record may be promoted into the production private corpus only when its canonical source has been checked against authoritative source material.

Use:

```bash
DRY_RUN=1 bash ops/data/promote_verified_sources.sh
DRY_RUN=0 bash ops/data/promote_verified_sources.sh
```

This promotion is intentionally not allowed to change the student-ready exam surface. It updates canonical source text and provenance only.

### TRAINING_READY

`TRAINING_READY` is the broader authenticated training surface. It may include technically complete material that is appropriate for signed-in practice but has not yet passed every public/student-facing localization gate.

Build the manifest (optionally filter one competition with `COMPETITION_ID`):

```bash
npm run data:training-manifest
COMPETITION_ID=maa-amc npm run data:training-manifest
```

Preview or publish only changed training bundles and referenced assets:

```bash
DRY_RUN=1 npm run data:publish-training
DRY_RUN=0 npm run data:publish-training
```

This channel is private training data only; it must not be treated as evidence that a bundle is `STUDENT_READY`.

### STUDENT_READY

A bundle may be promoted to the student-facing production surface only when every question in the bundle passes `isStudentReady()`.

The gate requires, as applicable:

- Chinese delivery;
- English delivery;
- stable answer/choice mapping;
- reviewed translation;
- verified visuals;
- no `needsReview` failure;
- all referenced local assets present.

Build an auditable manifest:

```bash
npm run data:manifest
```

Preview a production promotion:

```bash
DRY_RUN=1 bash ops/data/promote_student_ready.sh
```

Publish:

```bash
DRY_RUN=0 bash ops/data/promote_student_ready.sh
```

## Hard safety rules

1. Application code deployed on production must match local `origin/main` before any data promotion.
2. Never rsync the entire `private/exams` directory.
3. SOURCE_VERIFIED promotion must not change the student-ready profile surface.
4. TRAINING_READY promotion is restricted to authenticated private-training data and must not widen the student-ready surface.
5. STUDENT_READY promotion copies only changed ready bundles and their referenced assets.
6. Every touched production file is backed up before mutation.
7. File hashes are checked after transfer.
8. STUDENT_READY releases rebuild the Next.js production bundle because some exam surfaces may be statically rendered.
9. Failed STUDENT_READY builds restore the previous data snapshot and rebuild the previous production state.
10. Public smoke tests must pass after promotion.
11. Runtime and ingestion corpora remain outside Git; Git stores the release machinery, not the private question corpus.

## Current baseline

The release tools should always report counts from the live corpus rather than relying on this document as a source of truth. Historical counts are intentionally not frozen here because the corpus grows continuously.
