# Student Profile Event Schema

## Purpose

Define a common event layer for all learning domains.

Domains:

- competition
- arithmetic
- solution
- review

## Event Shape

```json
{
  "eventId": "uuid",
  "studentId": "id",
  "domain": "arithmetic",
  "eventType": "answer",
  "timestamp": "ISO-8601",
  "payload": {}
}
```

## Domain Examples

### Arithmetic

```json
{
  "domain": "arithmetic",
  "eventType": "answer",
  "payload": {
    "skill": "mental_addition",
    "correct": true,
    "responseTimeMs": 1800
  }
}
```

### Competition

```json
{
  "domain": "competition",
  "eventType": "question_answer",
  "payload": {
    "competition": "AMC8",
    "topic": "geometry",
    "correct": false
  }
}
```

## Migration Rule

Existing APIs remain unchanged. New events are introduced behind adapters before replacing old analytics logic.
