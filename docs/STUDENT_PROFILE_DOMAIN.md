# Student Profile Domain

## Purpose

Unify learning signals from all first-class domains without mixing their rules.

## Domains

- Competition Domain
  - exam attempts
  - timing behavior
  - score distribution
  - knowledge coverage

- Arithmetic Domain
  - accuracy
  - speed
  - fluency
  - calculation strategy
  - error patterns

- Solution Domain
  - explanation interaction
  - hint usage
  - reasoning feedback

## Unified Profile Layer

```text
Competition Events
        \
         \
Arithmetic Events ----> Student Profile Engine
         /
        /
Solution Feedback
```

## Design Rules

- Competition scores are not treated as general ability scores.
- Arithmetic speed is not treated as competition ranking.
- Single mistakes do not immediately become permanent weaknesses.
- Recommendations require sufficient data confidence.

## Future Extensions

- knowledge graph
- adaptive practice planner
- parent reports
- teacher dashboard analytics
