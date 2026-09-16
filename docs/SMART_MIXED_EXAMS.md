# Smart mixed exams

The simulator supports deterministic mixed papers assembled from student-ready historical bundles.

## Modes

- `mixed24-<seed>`: 24 questions, 75 minutes, 8×3-point + 8×4-point + 8×5-point, initial score 24, max 120, fixed -1 wrong-answer penalty.
- `mixed15-<seed>`: 15 questions, 75 minutes, 5×3-point + 5×4-point + 5×5-point, initial score 15, max 75, quarter-of-question-value wrong-answer penalty.

The homepage generates a fresh seed on each click. Reusing the same URL/seed recreates exactly the same paper.

## Balancing rules

The generator is deliberately not plain random sampling.

1. Difficulty quotas are exact.
2. A question ID can appear only once.
3. Within each point band, different source years are preferred before a year is reused.
4. Across the whole 24-question paper, a source year is capped at 3 questions.
5. Across the whole 15-question paper, a source year is capped at 2 questions.
6. Original source-question positions are balanced, reducing clusters of similar early/late-paper archetypes.
7. A deterministic seeded PRNG breaks ties, so a paper can be reproduced for teaching or review.

The source pool is discovered from student-ready `mini1` exam bundles. As additional years are promoted through the bilingual/visual gate, they automatically enter the mixed pool.
