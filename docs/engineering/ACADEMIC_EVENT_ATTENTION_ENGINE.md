# Academic Event & Attention Engine — Product / Engineering Plan v1

Status: implementation baseline
Date: 2026-10-06

## 1. Product promise
The database may be large; the student's screen must stay small.

The system ingests competitions, standardized exams, school notices and official milestones, then answers only:
1. What must I do now?
2. What are the next 2–3 things worth attention?
3. What important deadline am I at risk of missing?

This is not a calendar dump and not a question-bank directory. It is an academic event operating layer that reduces attention cost.

## 2. Core entities
- Program: durable program identity (MAA AMC, Australian AMC, CEMC, UKMT, AP, SAT, ACT).
- Event: a named contest/exam family or subject (AMC 10, Gauss, AP Calculus BC).
- Session: one administration in one season/region/mode (AMC 10 A 2026 China, AP Calculus BC 2027).
- Milestone: actionable date/window (registration deadline, mock, device check, exam, portfolio submission, score release).
- Source: provenance record with authority, URL/document, observedAt, applicable region/season, verification status.
- Enrollment: a student's relationship to a Session (interested, planned, registered, confirmed, completed, result-pending, result-known).
- Task: student-specific action generated from milestones/rules.
- Result/Award: score, award, certificate and follow-on qualification.

Do not overload Session with a single examDate. A session owns many milestones.

## 3. Source precedence and conflict model
Authority order is contextual, not destructive:
- organizer official global source
- organizer/authorized regional operator
- school-specific notice
- trusted imported schedule
- user-entered information

Lower-level sources may legitimately override logistics for a narrower scope (e.g. school check-in time) without overwriting the global official record. Store both and resolve by applicability.

Every actionable fact needs: sourceId, verifiedAt, validForSeason, region/school scope, confidence, supersedes(optional).
Expired-season facts never silently roll forward.

## 4. Student relevance filter
Hard filter before ranking:
- grade/age eligibility
- region availability
- gender/qualification constraints where applicable
- school availability / registration channel
- already expired and unactionable sessions

Unknown eligibility is not false: classify as `needs_confirmation` and do not present it as a recommendation.

## 5. Attention Engine
Generate candidates only after relevance filtering.

Priority classes (lexicographic before numeric score):
P0 — action required now / overdue critical task
P1 — registered session with imminent milestone
P2 — registration closing soon for a high-fit event
P3 — upcoming registered/planned preparation milestone
P4 — discovery recommendation
P5 — archive / informational

Within a class, rank by:
- deadline urgency
- enrollment commitment
- consequence of missing
- source confidence/freshness
- student fit
- prerequisite dependency
- user/school explicit importance

Never let popularity alone outrank a registered student's required action.

## 6. Attention budget (UI invariant)
Default student/parent dashboard:
- exactly 1 `Do now` card when an actionable item exists
- maximum 3 `Next` cards
- maximum 1 deadline warning strip
- everything else behind `Full calendar / All opportunities`

No infinite feed. No badge count for low-value informational items. No red warning for non-actionable discovery.

## 7. Action contract
Every surfaced item must answer:
- Why am I seeing this?
- What exactly should I do?
- By when?
- Where/how?
- What proves completion?
- What happens next?

A card without an action is discovery content, not a task.

## 8. Lifecycle
DISCOVERED -> ELIGIBLE -> INTERESTED -> PLANNED -> REGISTERED -> CONFIRMED -> PREPARING -> READY -> TAKEN -> RESULT_PENDING -> RESULT_KNOWN -> AWARDED/CLOSED

Enrollment state suppresses irrelevant prompts. Example: after REGISTERED, hide registration marketing and promote required pre-exam milestones.

## 9. Product surfaces
1. Home `Today`: one action + next three.
2. My Calendar: all relevant sessions/milestones, filterable but not default overload.
3. Competition/Exam Hub: discovery and comparison; not the daily task surface.
4. Session Companion: authoritative checklist and progress.
5. Results & Honors: score, award, certificate, qualification/follow-on event.
6. Parent view: children switcher + unresolved critical items, not duplicate raw calendars.

## 10. Competition vs standardized exam
Use the same Program/Event/Session/Milestone kernel, separate product taxonomy:
- competitions: AMC, CEMC, UKMT, Kangaroo, HMMT, etc.
- standardized/academic exams: AP, SAT, ACT, etc.

Different registration and logistics adapters plug into the same milestone/task engine.

## 11. Import pipeline
RAW -> NORMALIZED -> SOURCE-LINKED -> CONFLICT-CHECKED -> VERIFIED -> PUBLISHED

School/ASEEDER screenshots can seed raw records, but never become unsourced canonical truth. Preserve the original attachment/source reference. Official web/document verification upgrades fields individually.

## 12. Initial implementation slices
A. Multi-competition showcase (current branch).
B. Event/Session/Milestone schema + source provenance.
C. Import the provided 2026 ASEEDER/BASIS schedule as source-scoped sessions.
D. Attention Engine pure function + deterministic tests.
E. Student enrollment/preferences and `Today` endpoint.
F. Home `Do now / Next` UI.
G. AP/SAT/ACT adapters after competition kernel is stable.

## 13. Acceptance criteria
- Adding 100 sessions does not increase default dashboard beyond 1+3 cards.
- Registered critical task always beats unrelated discovery.
- Wrong grade/region event is suppressed.
- Conflicting source dates remain traceable and are not silently overwritten.
- Every date shown as actionable has provenance and season scope.
- Completing a task deterministically advances the next action.
- Expired sessions leave the action surface automatically.
- Full calendar remains available for users who want detail.

## 14. Non-goals
- Do not recommend every prestigious competition.
- Do not turn the home page into a news feed.
- Do not infer registration from browsing.
- Do not auto-roll last year's dates.
- Do not store exam passwords in plaintext.
- Do not mix training gamification into critical exam logistics.
