# Architecture

The project is a local-first exam engine separated from the source archive.

```text
Math_Kangaroo_Library
   ↓ scripts/import_level_a.py
private/question-bank.json       (gitignored)
   ↓ server-only loader
Next.js exam API
   ├─ GET /api/exams/level-a     (no answers/solutions)
   ├─ POST /api/grade            (server-side grading)
   └─ GET /api/admin/questions   (local admin view)
```

The browser stores only the current attempt and latest result in `localStorage` for the MVP. The next persistence step is PostgreSQL/SQLite for students, attempts, events, skill state, and review decisions.
