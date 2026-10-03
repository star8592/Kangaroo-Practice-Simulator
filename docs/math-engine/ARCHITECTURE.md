# Global Mathematical Intelligence Engine

## Product thesis
The engine trains learners to move from seeing symbols to seeing mathematical structure. Fast and accurate calculation is an important user-facing outcome; structural recognition, representation switching, transformation choice, reasoning and transfer are the deeper mechanisms.

## Core loop
1. Observe a mathematical object.
2. Notice salient structure before executing.
3. Select or construct a useful representation.
4. Apply an equality-preserving transformation.
5. Choose a low-cost strategy for the current goal.
6. Execute accurately and efficiently.
7. Verify, reflect, and transfer to a changed context.

## Architecture
`MathEntity` is the common object model. `Representation` records alternative views. `Transformation` records legal changes. `StrategyGraph` connects observable triggers to useful transformations. `LearnerSignal` records evidence rather than treating one correct answer as mastery.

Mastery progresses through unknown -> recognized -> assisted -> independent -> automatic -> transfer. A learner can therefore know a method without yet selecting it independently.

## Global adaptation
The mathematical substrate is shared globally. China/US/UK/Australia/Singapore are curriculum tags, not separate engines. Training policies change emphasis: exam prioritizes accuracy and fluency; discovery prioritizes representation and explanation; competition prioritizes structural recognition, strategy and transfer.

## Evidence policy
Do not infer a weakness from one slow or wrong item. Preserve latency, hints, edits, chosen transformations and transfer evidence. Prefer paired probes and repeated evidence. Teaching hypotheses are testable; they are not hard-coded truths.

## Theory policy
Pólya-style planning and reflection, representation research, worked-example fading, retrieval/automaticity and competition heuristics are priors. They guide initial design but do not become immutable rules. Real learner data should be used to validate, revise or retire training policies.

## v1 boundary
Ship the smallest closed loop first: arithmetic entity mapping, structure discovery, scaffolded coaching, learner evidence and reports. Algebra shares the same object model from day one so primary-school shortcuts do not become an architectural dead end.

## Evidence-first learner profile

The learner profile is derived only from observed signals. V1 reports fluency, independence, hint reliance and strategy-use evidence. It intentionally does not infer creativity, deep understanding or transfer unless the training surface has directly collected evidence for those claims.

## Legacy arithmetic bridge

Existing arithmetic attempts are converted into `MathEntity` and `LearnerSignal` records instead of being discarded. This allows the production arithmetic trainer to feed the new engine incrementally while keeping the current student experience stable.

## Frozen three-layer boundary

The engine now enforces three separable concerns:

1. **Mathematical semantics** — mathematical truth, representations, invariants and legal transformations.
2. **Cognitive evidence** — what the learner actually did: perceive, represent, chunk, transform, search, evaluate, execute, verify, reflect and transfer.
3. **Teaching policy** — which intervention to choose next for a specific learning goal.

The operational loop is:

`Task -> Observation stream -> Learner evidence -> Candidate intervention -> Outcome -> Evidence update`

Teaching policies can therefore evolve or be A/B tested without redefining mathematical truth. Cognitive measurements remain contextual evidence rather than permanent learner labels.

## Experiment boundary

Immediate performance is not sufficient evidence of learning. Experiments should separately measure immediate success, delayed retention and transfer. Observational correlations must not be reported as causal effects; causal claims require randomized or otherwise defensible designs.

For child learners, event collection should be minimal and focused on learning interactions, with pseudonymous identifiers where practical.
