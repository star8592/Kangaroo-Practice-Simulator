# Adaptive Mental Arithmetic Engine

The arithmetic module is a separate training surface from the Math Kangaroo exam engine.

## Core design

The system does not optimize only for score. Each response records:

- correctness;
- time to first input;
- total response time;
- edit count;
- backspace count;
- skill and intended mental strategy;
- expected response time for the item;
- inferred error / habit category.

Student records are stored under `private/arithmetic/` and must never be committed.

## Grade profiles

Grades 1–6 have independent skill sets, time targets, accuracy targets and shortcut strategies. The profiles are configuration, not hard-coded UI logic, so they can be recalibrated from real student data.

## Error taxonomy

Current first-pass classifier distinguishes: impulsive answering, hesitation, near misses, operation confusion, place-value errors, weak fact recall, slow recall, missed shortcut opportunities and unknown errors.

## Adaptive loop

1. Baseline diagnostic: 20 questions with no coaching.
2. Build per-skill accuracy × speed × editing profile.
3. Rank skills by training priority.
4. Generate the next set with weak skills weighted more heavily.
5. In adaptive mode, wrong or inefficient items trigger a short strategy cue.
6. A limited same-skill variant is reinserted roughly three questions later for spaced repair.
7. Persist the session and update the long-term student model.

The intent is to reduce unnecessary volume: train the smallest set that improves the highest-value weakness, rather than assigning a fixed worksheet to every student.
