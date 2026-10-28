# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

### L-001 - When an AC quotes an exact error message string, assert the literal message text in the test, not just the HTTP status code.
- signal: `ac_gap` · recurrence: 2 feature(s) · scope: `domain/fivo/application/errors` · harmful: 0
- features: cadastro-empresa, campanhas
- evidence: EMP-01 AC3 (domain/fivo/application/errors) (+1 more)
- last seen: 2026-10-27T23:36:01Z

### L-007 - Audit assertions must check author and timestamp, not just event type and states
- signal: `ac_gap` · recurrence: 2 feature(s) · scope: `audit` · harmful: 0
- features: catalogo-instituicoes, campanhas
- evidence: validation-dominio.md mutantes #16 #26, P1-Aprovação AC9, P1-Causas AC7 (audit) (+1 more)
- last seen: 2026-10-27T23:36:01Z

### L-009 - Boundary tests must hit the exact limit value on both sides
- signal: `surviving_mutant` · recurrence: 2 feature(s) · scope: `domain-tests` · harmful: 0
- features: catalogo-instituicoes, campanhas
- evidence: validation-dominio.md mutante #9 (listar-beneficiadas.ts < 2) (domain-tests) (+1 more)
- last seen: 2026-10-27T23:36:01Z

### L-011 - Every validation AC in a spec must state the exact user-facing error text, or tests fall back to toContain fragments
- signal: `spec_precision_gap` · recurrence: 2 feature(s) · scope: `specs` · harmful: 0
- features: catalogo-instituicoes, campanhas
- evidence: validation-dominio.md P1-Autocadastro AC8 (arquivo.spec.ts:247 toContain) (specs) (+1 more)
- last seen: 2026-10-27T23:36:01Z

### L-012 - A fix task for a conjunctive AC must list every operation the AC names, not only the ones in the previous gap list
- signal: `surviving_mutant` · recurrence: 2 feature(s) · scope: `domain-tests` · harmful: 0
- features: catalogo-instituicoes, campanhas
- evidence: validation-dominio.md rodada 2, mutantes N28 N29, P1-Causas AC6 (domain-tests) (+1 more)
- last seen: 2026-10-28T00:21:23Z

### L-019 - When an AC lists fields to show or collect, name the exact attribute instead of an umbrella term like nome, link or site ou canal
- signal: `spec_precision_gap` · recurrence: 2 feature(s) · scope: `specs` · harmful: 0
- features: catalogo-instituicoes, campanhas
- evidence: validation.md SP3/SP6, Aprovação AC1 nome/link, Autocadastro AC1 site ou canal (specs) (+1 more)
- last seen: 2026-10-27T23:36:01Z

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

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

### L-008 - When a port promises normalized matching, cover it with an accented and mixed-case input in a use-case test
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `repo-doubles` · harmful: 0
- features: catalogo-instituicoes
- evidence: validation-dominio.md P1-Causas AC2 (in-memory-causa-repository.ts findByNome) (repo-doubles)
- last seen: 2026-10-14T00:26:51Z

### L-010 - When a domain error changes status or message, update the exception-filter e2e table in the same commit
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `error-mapping` · harmful: 0
- features: catalogo-instituicoes
- evidence: test/http/domain-exception-filter.e2e-spec.ts:65 (422 vs 409 after T1) (error-mapping)
- last seen: 2026-10-14T00:26:51Z

### L-013 - When a change is justified by 'otherwise X breaks', add a test that fails under X or label the change as robustness
- signal: `spec_deviation` · recurrence: 1 feature(s) · scope: `specs` · harmful: 0
- features: catalogo-instituicoes
- evidence: tasks.md T37 Done-when, mutante N6 equivalente (specs)
- last seen: 2026-10-14T01:02:45Z

### L-014 - A design amendment must sweep component tables and task What lines, not only Done-when bullets
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `specs` · harmful: 0
- features: catalogo-instituicoes
- evidence: validation-dominio.md rodada 2, T47 residuos design.md:221 e tasks.md:1262 (specs)
- last seen: 2026-10-14T01:02:45Z

### L-015 - Cover each role guard with a wrong-role request whose body is also invalid, so the guard's 403 stays distinguishable from a use-case denial or a validation 422
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `routes` · harmful: 0
- features: catalogo-instituicoes
- evidence: validation.md M26 admin-causas.controller.ts:65, M27 admin-instituicoes.controller.ts:43 (routes)
- last seen: 2026-10-14T02:32:16Z

### L-016 - When a spec edge case requires showing an item state to a user, add an explicit field to the list response or record the UI deferral in the design
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `design` · harmful: 0
- features: catalogo-instituicoes
- evidence: spec.md:196 edge case documento inacessível; design.md:311; tasks.md:1529 (design)
- last seen: 2026-10-14T02:32:16Z

### L-017 - Every quantity limit in a spec, such as exactly one file, must state the status and message returned when it is exceeded
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs` · harmful: 0
- features: catalogo-instituicoes
- evidence: validation.md SP2, Autocadastro AC7 (exatamente um arquivo -> 400 Unexpected field) (specs)
- last seen: 2026-10-14T02:32:16Z

### L-018 - Access-control ACs must state the response for unauthenticated callers separately from authenticated non-owners
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs` · harmful: 0
- features: catalogo-instituicoes
- evidence: validation.md SP5, Aprovação AC7 (anônimo 401 vs 403) (specs)
- last seen: 2026-10-14T02:32:16Z

### L-020 - Give a task the full gate when it changes a use-case response that a route returns, because e2e tests assert route payloads with exact toEqual
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `tasks` · harmful: 0
- features: catalogo-instituicoes
- evidence: c46080b: test/http/admin-instituicoes.e2e-spec.ts:174 red until 2a123fb (validation.md, Rodada 2 Gate Check) (tasks)
- last seen: 2026-10-14T09:02:31Z

### L-021 - When an aggregate clears a child entity after deciding it, keep the decided child reachable by the repository save, or the decision never reaches persistence
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `domain-entities` · harmful: 0
- features: campanhas
- evidence: validation-dominio.md T46, Alteração AC6 AC8; entities/campanha.ts:298,321 (domain-entities)
- last seen: 2026-10-27T23:36:11Z

### L-022 - A notification test must create the recipient in its setup, otherwise the send branch is skipped and the mailer-failure test passes vacuously
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `domain-tests` · harmful: 0
- features: campanhas
- evidence: validation-dominio.md mutantes M23 M24, rejeitar-alteracao-campanha.spec.ts:85-108 (domain-tests)
- last seen: 2026-10-27T23:36:11Z

### L-023 - Every use case that saves through a version CAS needs its own concurrency test; sibling use cases do not cover it
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `domain-tests` · harmful: 0
- features: campanhas
- evidence: validation-dominio.md mutante M22 (rejeitar-alteracao-campanha.ts:72) (domain-tests)
- last seen: 2026-10-27T23:36:11Z

### L-024 - When an AC says an operation applies the same validations as another flow, list each inherited validation explicitly in the design and the task Done-when
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `tasks` · harmful: 0
- features: campanhas
- evidence: validation-dominio.md Alteração AC5 (fim vencido na alteração), T49 (tasks)
- last seen: 2026-10-27T23:36:11Z

### L-025 - Map every field an AC names to the use-case input, not only to the entity method
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `domain/fivo/application/use-cases` · harmful: 0
- features: campanhas
- evidence: validation-dominio.md Criação AC15, Alteração AC1 (capaArquivoId ausente em editar-campanha.ts:52-63), T47 (domain/fivo/application/use-cases)
- last seen: 2026-10-27T23:36:11Z

### L-026 - When a Done-when says two use cases return the same read model, define it once and assert both outputs with the same toEqual
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `domain/fivo/application/use-cases` · harmful: 0
- features: campanhas
- evidence: validation-dominio.md T19 Done-when (campanha-detalhe.ts:31 vs consultar-campanha-da-empresa.ts:42), T48 (domain/fivo/application/use-cases)
- last seen: 2026-10-27T23:36:11Z

### L-027 - A new key in an entity's per-type rule tables needs its own boundary tests; the existing spec does not cover it
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `domain-tests` · harmful: 0
- features: campanhas
- evidence: validation-dominio.md T11 / Criação AC13 (arquivo.ts:51,58,65 sem teste), T50 (domain-tests)
- last seen: 2026-10-27T23:36:11Z

### L-028 - When an AC requires auditing before and after values, fix one payload format for every audit event of the aggregate
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs` · harmful: 0
- features: campanhas
- evidence: validation-dominio.md SP3, Alteração AC10 (string decimal na abertura, centavos na decisão) (specs)
- last seen: 2026-10-27T23:36:11Z

### L-029 - When formatting integer cents as decimal text, test a value whose fraction has a leading zero, such as 105 to 1.05
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `domain/fivo/application/use-cases` · harmful: 0
- features: campanhas
- evidence: validation-dominio.md rodada 2, mutante N8 (use-cases/campanha-detalhe.ts:65 padStart -> padEnd) (domain/fivo/application/use-cases)
- last seen: 2026-10-28T00:21:23Z

### L-030 - When a rule validates the result of merging a partial update, test the case where the violating value comes from the stored state, not from the input
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `domain-entities` · harmful: 0
- features: campanhas
- evidence: validation-dominio.md rodada 2, mutante N14 (entities/campanha.ts:428), Alteração AC5 (domain-entities)
- last seen: 2026-10-28T00:21:23Z

### L-031 - When a new route copies response headers from an existing route, copy that route's header assertions into its e2e too
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `routes` · harmful: 0
- features: campanhas
- evidence: validation.md mutantes S25 S32 (campanhas-publicas.controller.ts:120,139; padrão em test/http/arquivo.e2e-spec.ts:208-211) (routes)
- last seen: 2026-10-28T01:43:52Z

### L-032 - A route that reuses another route's body DTO still needs its own missing-field 422 test
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `routes` · harmful: 0
- features: campanhas
- evidence: validation.md mutante S33 (admin-campanhas.controller.ts:215; só admin-campanhas.e2e-spec.ts:440 testa sem motivo) (routes)
- last seen: 2026-10-28T01:43:52Z

### L-033 - An access-control AC must state whether its 403 takes precedence over shape-validation 422 and dependency 503 on the same route
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs` · harmful: 0
- features: campanhas
- evidence: validation.md SP4, Criação AC1 x PUT /campanhas/:id/capa (campanhas.controller.ts:309-339) (specs)
- last seen: 2026-10-28T01:43:52Z

### L-034 - When a controller spreads the request body into a use-case input next to session-derived ids, add an e2e that sends those ids in the body and asserts they are ignored
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `routes` · harmful: 0
- features: campanhas
- evidence: validation.md rodada 2, mutantes S34 S45 S46 (campanhas.controller.ts:220-222,277-282 spread do corpo após os ids da sessão; campanhas.dto.ts:42,50) (routes)
- last seen: 2026-10-28T01:58:36Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
