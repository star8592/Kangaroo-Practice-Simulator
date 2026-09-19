# Student Profile Engine Implementation

## Purpose

Student Profile is the shared capability layer for all mathematics learning domains.

It does not own exams or training content. It collects learning events and produces analysis.

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
3. Add validators.
4. Add adapters from existing analytics modules.

## Event categories

- answer events
- timing events
- error pattern events
- hint usage events
- review events

## Migration rule

New features should write profile events instead of creating isolated analytics tables.
