# Full-exam access regression: 2026-10-08

Live unauthenticated GET /exam/maa-amc12-practice-geometry redirected to
/api/auth/guest/start. The issued guest identity satisfied checks for session
existence, allowing complete exam question fetch, sessions and grading.
The policy also granted exam_basic to guest.

Fixed: anonymous and guests retain public catalogs, public sample capability
and basic arithmetic, but cannot enter full exams, fetch complete questions,
create/modify sessions or submit grades. Registered students and signed WeChat
student identities retain basic exam access. Guest bootstrap will not issue a
guest token to enter a full exam.

Release verification: run access policy, catalog and exam guard tests,
typechecking and lint. Stage on noncritical server before production rollout.
Run browser and HTTP tests for guest 401 at GET /api/exams/{id},
GET/POST/PATCH /api/exam-sessions, POST /api/grade. Check registered
student end-to-end and confirm public catalog/basic arithmetic remains intact.
Never mark production fixed based only on local tests.
