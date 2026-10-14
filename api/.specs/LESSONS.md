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

### L-005 - Assert result.isLeft() unconditionally before inspecting the error; never put expects inside an if on the Either
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `domain-tests` · harmful: 0
- features: catalogo-instituicoes
- evidence: validation-dominio.md mutantes #18 #19 (causa.spec.ts:46,83) (domain-tests)
- last seen: 2026-10-14T00:26:50Z

### L-006 - Test optimistic concurrency by interleaving real calls against the in-memory double, not only by stubbing the CAS to return false
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `domain-tests` · harmful: 0
- features: catalogo-instituicoes
- evidence: validation-dominio.md mutante #3, P1-Aprovação AC10 (domain-tests)
- last seen: 2026-10-14T00:26:50Z

### L-007 - Audit assertions must check author and timestamp, not just event type and states
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `audit` · harmful: 0
- features: catalogo-instituicoes
- evidence: validation-dominio.md mutantes #16 #26, P1-Aprovação AC9, P1-Causas AC7 (audit)
- last seen: 2026-10-14T00:26:51Z

### L-008 - When a port promises normalized matching, cover it with an accented and mixed-case input in a use-case test
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `repo-doubles` · harmful: 0
- features: catalogo-instituicoes
- evidence: validation-dominio.md P1-Causas AC2 (in-memory-causa-repository.ts findByNome) (repo-doubles)
- last seen: 2026-10-14T00:26:51Z

### L-009 - Boundary tests must hit the exact limit value on both sides
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `domain-tests` · harmful: 0
- features: catalogo-instituicoes
- evidence: validation-dominio.md mutante #9 (listar-beneficiadas.ts < 2) (domain-tests)
- last seen: 2026-10-14T00:26:51Z

### L-010 - When a domain error changes status or message, update the exception-filter e2e table in the same commit
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `error-mapping` · harmful: 0
- features: catalogo-instituicoes
- evidence: test/http/domain-exception-filter.e2e-spec.ts:65 (422 vs 409 after T1) (error-mapping)
- last seen: 2026-10-14T00:26:51Z

### L-011 - Every validation AC in a spec must state the exact user-facing error text, or tests fall back to toContain fragments
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs` · harmful: 0
- features: catalogo-instituicoes
- evidence: validation-dominio.md P1-Autocadastro AC8 (arquivo.spec.ts:247 toContain) (specs)
- last seen: 2026-10-14T00:27:01Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
