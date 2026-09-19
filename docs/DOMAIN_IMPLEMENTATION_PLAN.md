# Domain Implementation Plan

## Goal

Keep Math Competition Lab clear by separating independent learning domains.

## Top-level domains

```
competition/
  Math Kangaroo
  Australian AMC
  MAA AMC

arithmetic/
  calculation fluency
  mental math
  strategy training

solution/
  AI explanation
  visualization
  animation

profile/
  student model
  recommendations
```

## Arithmetic principles

Arithmetic is not an exam format. It is a continuous skill training system.

It tracks:

- accuracy
- speed
- hesitation
- error patterns
- strategy usage
- adaptive difficulty

## Data flow

```
Competition attempts
        \
         \
          Student Profile
         /
Arithmetic sessions
        \
         \
       Solution feedback
```

## Migration rule

Existing features remain working. Refactoring should move responsibilities gradually without breaking tests.
