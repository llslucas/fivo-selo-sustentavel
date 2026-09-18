# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - When an AC quotes an exact error message string, assert the literal message text in the test, not just the HTTP status code.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `domain/fivo/application/errors` · harmful: 0
- features: cadastro-empresa
- evidence: EMP-01 AC3 (domain/fivo/application/errors)
- last seen: 2026-09-18T02:53:46Z

### L-002 - Copy spec-quoted error message strings verbatim into the error class constructor, including punctuation, instead of freehand-restating them.
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `domain/fivo/application/errors` · harmful: 0
- features: cadastro-empresa
- evidence: EMP-01 AC2, EMP-01 AC4, EMP-06 AC2 (domain/fivo/application/errors)
- last seen: 2026-09-18T02:53:50Z

### L-003 - Entity.equals compares only the id, so a repository roundtrip test that leans on equals() proves no field fidelity — assert every mapped column explicitly, including the optional ones.
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `infra/database/prisma/mappers` · harmful: 0
- features: cadastro-empresa
- evidence: M5-M14 / src/core/types/entities/entity.ts:16-26 (infra/database/prisma/mappers)
- last seen: 2026-09-18T15:12:11Z

### L-004 - A use case writing two aggregates through separate repository ports is atomic only with in-memory doubles — decide the transaction boundary when the real persistence adapter lands, not after.
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `domain/fivo/application/use-cases` · harmful: 0
- features: cadastro-empresa
- evidence: EMP-01 AC1 / src/domain/fivo/application/use-cases/criar-empresa.ts:150-151 (domain/fivo/application/use-cases)
- last seen: 2026-09-18T15:12:11Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
