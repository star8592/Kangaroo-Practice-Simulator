# Student Profile Engine Implementation

## Purpose

Student Profile is the shared capability layer for all mathematics learning domains.

It does not own exams or training content. Existing exam and arithmetic records are normalized into typed learning events, then consumed directly by the profile engine and recommendation rules.

## Domain boundaries

```
competition domain
        \
         \
          -> Student Profile Engine -> recommendations
         /
        /
arithmetic domain

solution domain
```

## First implementation phase

1. Keep existing APIs stable.
2. Introduce event types.
3. Add adapters from existing analytics modules.
4. Keep validation at the persistence/API boundaries instead of maintaining a second unused event-validation pipeline.

## Event categories

- answer events
- timing events
- error pattern events
- hint usage events (reserved until solution telemetry is persisted)
- review events (reserved until review telemetry is persisted)

## Migration rule

New analytics integrations should reuse the typed learning-event contract and profile engine instead of creating parallel analytics pipelines.
