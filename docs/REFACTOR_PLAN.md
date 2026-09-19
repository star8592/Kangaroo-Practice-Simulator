# Repository Refactor Execution Plan

## Goal
Keep the repository clean, unambiguous, and maintainable.

## Ownership boundaries

- `src/`: web application and exam runtime.
- `competition-agent/`: competition document ingestion, parsing, translation, and dataset preparation.
- `solution-engine/`: future home for AI solution generation, visualization, and explanation modules.
- `scripts/`: reproducible developer and data operations.
- `docs/`: architecture and operational documentation.

## Cleanup rules

- Do not commit generated caches.
- Do not commit private user data or local secrets.
- Keep datasets separated from application code.
- Keep experimental modules isolated from production runtime.

## Migration order

1. Inventory current directories.
2. Move AI solution modules into a dedicated boundary.
3. Separate generated assets from source code.
4. Review private and operational folders.
5. Update documentation.
6. Run build and smoke tests.

## Testing requirement

The local machine remains a validation environment only:

```bash
git pull origin main
npm run build
python3 scripts/smoke_test.py
```
