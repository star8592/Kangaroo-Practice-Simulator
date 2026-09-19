# Domain Migration Phases

## Goal

Gradually separate the platform into clear domains without breaking the existing exam system.

## Phase 1: Profile domain foundation

The student profile layer becomes the shared capability model.

Sources:

- Competition attempts
- Arithmetic training sessions
- Solution interaction feedback

Outputs:

- Ability indicators
- Error patterns
- Training recommendations

## Phase 2: Arithmetic domain extraction

Move arithmetic logic from page-level features into an independent training domain.

Responsibilities:

- Calculation sessions
- Speed analysis
- Accuracy analysis
- Strategy diagnosis
- Adaptive exercises

## Phase 3: Competition domain cleanup

Keep each competition independent:

- Math Kangaroo
- Australian AMC
- MAA AMC

Each competition owns:

- Format
- Scoring
- Timing
- Paper generation rules

## Phase 4: Solution engine integration

AI explanations and visual solutions consume the shared student profile but remain independent from exam delivery.

## Compatibility rule

Existing APIs remain available during migration. New domain services are introduced behind adapters before old paths are removed.
