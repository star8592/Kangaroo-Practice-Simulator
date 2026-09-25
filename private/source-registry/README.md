# Competition source and rights registry

This directory is the rights gate for competition-question ingestion.

## Core rule

Finding, downloading, owning, or indexing a contest paper does **not** by itself grant permission to republish it on the public website.

Every new source must have a registry entry with:
- source organization and competition IDs;
- collection mode;
- rights class and review state;
- whether full question text/images may be publicly displayed;
- whether commercial use is allowed;
- attribution requirement;
- evidence URL(s) and a written basis.

The current website mode is **noncommercial-free**. A source may be collected internally while `publicQuestionDisplay=false`; in that case derived question assets must remain under `private/` and must not become `studentReady`.

## Conservative defaults

- Publicly accessible PDF != open license.
- "User-owned" != republication permission.
- Unknown or country-specific Kangaroo rights stay internal until reviewed.
- MAA historical material stays internal by default; explicitly published official sample competitions may be shown for educational use with attribution while the site remains noncommercial.
- CEMC-owned resources are registered as CC BY-NC 4.0 and require attribution.
