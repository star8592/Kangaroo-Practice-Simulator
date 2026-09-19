# Student Event Stream

## Purpose

Define a unified event model for the Student Profile domain.

Training domains should produce events; the profile engine consumes them.

## Event sources

- Competition exams
- Arithmetic training
- AI solution interaction
- Review and remediation

## Event example

```json
{
  "studentId": "student-001",
  "eventType": "arithmetic_answer",
  "domain": "arithmetic",
  "skill": "mental_addition",
  "correct": true,
  "responseTimeMs": 2100,
  "timestamp": "2026-01-01T00:00:00Z"
}
```

## Design rules

- Do not mix scores from different domains directly.
- Preserve raw learning events.
- Derive recommendations from accumulated evidence.
- Keep competition rules isolated from arithmetic rules.
