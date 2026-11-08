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

### L-035 - A contract test that checks only the object's keys needs a sibling toEqual on the values, or a wrong projection survives
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `domain-tests` · harmful: 0
- features: vitrine-e-selo
- evidence: validation-dominio.md M36-M47 / buscar-empresa-publica.spec.ts (domain-tests)
- last seen: 2026-11-08T13:38:36Z

### L-036 - In a filter-exclusion test, the excluded items must satisfy every other condition so only the condition under test removes them
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `domain-tests` · harmful: 0
- features: vitrine-e-selo
- evidence: validation-dominio.md M41 / buscar-empresa-publica.spec.ts:118-145 (domain-tests)
- last seen: 2026-11-08T13:38:36Z

### L-037 - Every in-memory double that fixes a contract the infra will implement needs its own spec, not only indirect coverage through use cases
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `test-doubles` · harmful: 0
- features: vitrine-e-selo
- evidence: validation-dominio.md M52-M53 / test/doubles/in-memory-empresa-repository.ts (test-doubles)
- last seen: 2026-11-08T13:38:36Z

### L-038 - When a spec value depends on an argument the use case passes to a pure function, test it at the use case, not only in the function
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `domain-tests` · harmful: 0
- features: vitrine-e-selo
- evidence: validation-dominio.md M14, M22 / aprovar-empresa.ts, aprovar-campanha.ts (domain-tests)
- last seen: 2026-11-08T13:38:36Z

### L-039 - A character class or an and-so-on rule in the spec needs a case for each member and for one iteration past the trivial ones
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `domain-tests` · harmful: 0
- features: vitrine-e-selo
- evidence: validation-dominio.md M2, M9 / slug.spec.ts (domain-tests)
- last seen: 2026-11-08T13:38:36Z

### L-040 - A temporary port stub that rejects needs a Done-when line in the infra task restoring the e2e count and a warning that the integrated env is broken
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `infra` · harmful: 0
- features: vitrine-e-selo
- evidence: validation-dominio.md Gate e2e 507/546 / prisma-empresa-repository.ts stubs (infra)
- last seen: 2026-11-08T13:38:36Z

### L-041 - When the spec fixes a per-resource 404 message, check in the design that the generic exception filter does not overwrite the domain text
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `routes` · harmful: 0
- features: vitrine-e-selo
- evidence: validation-dominio.md follow-up 2 / src/infra/http/domain-exception.filter.ts:65-71 (routes)
- last seen: 2026-11-08T13:38:36Z

### L-042 - When testing an effect on an element such as scroll or focus, render at least two candidates and assert which element received it
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web-tests` · harmful: 0
- features: vitrine-e-selo
- evidence: validation-web.md W8b, W13 / web/tests/component/EmpresaCampanhaScroll.test.tsx:60 (web-tests)
- last seen: 2026-11-08T13:38:36Z

### L-043 - For every element shown only in a given state, also test its absence in another state with the same data that would trigger it
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web-tests` · harmful: 0
- features: vitrine-e-selo
- evidence: validation-web.md W9, W25 / PaginaEmpresaPublica.test.tsx:85, DetalheCampanha.test.tsx:195 (web-tests)
- last seen: 2026-11-08T13:38:36Z

### L-044 - When an AC lists the fields of a card, give each listed field its own assertion; asserting the title does not cover the rest
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web-tests` · harmful: 0
- features: vitrine-e-selo
- evidence: validation-web.md W10-W12 / T33 (web-tests)
- last seen: 2026-11-08T13:38:36Z

### L-045 - Every removal a Done-when asks for needs evidence: the file gone from the diff or a structural test, not only swapped links
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: vitrine-e-selo
- evidence: validation-web.md T34, T40 / web/src/app/parceiros/[id]/page.tsx (web)
- last seen: 2026-11-08T13:38:36Z

### L-046 - In Next projects the typecheck gate must generate route types with next typegen before tsc, or the result depends on the local cache
- signal: `gate_fail` · recurrence: 1 feature(s) · scope: `web` · harmful: 0
- features: vitrine-e-selo
- evidence: validation-web.md Gate tsc / web/src/app/layout.tsx:18 (web)
- last seen: 2026-11-08T13:38:36Z

### L-047 - When the spec says period or date without a format, fix the format in the design for every screen
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `design` · harmful: 0
- features: vitrine-e-selo
- evidence: validation-web.md SP1 (design)
- last seen: 2026-11-08T13:38:37Z

### L-048 - When the spec orders by name, state the tiebreak for names that differ only in case or accents
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `design` · harmful: 0
- features: vitrine-e-selo
- evidence: validation-dominio.md SP1 / listar-parceiros.ts collator (design)
- last seen: 2026-11-08T13:38:37Z

### L-049 - Test both ends of every character range in a regex class, not only a value from the middle
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `domain-tests` · harmful: 0
- features: vitrine-e-selo
- evidence: validation-dominio.md r2 N13 / slug.ts:13 (domain-tests)
- last seen: 2026-11-08T14:39:20Z

### L-050 - An exact toEqual with a single value of an enum field does not discriminate it; add one case per enum value
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `domain-tests` · harmful: 0
- features: vitrine-e-selo
- evidence: validation-dominio.md r2 N16 / buscar-empresa-publica.ts:96 (domain-tests)
- last seen: 2026-11-08T14:39:20Z

### L-051 - When the contract marks a field optional, assert the rendered output of both the present and the absent branch
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web-tests` · harmful: 0
- features: vitrine-e-selo
- evidence: validation-web.md r2 X4 / PaginaEmpresaPublica.tsx:40 (web-tests)
- last seen: 2026-11-08T14:39:20Z

### L-052 - A screen that special-cases 404 needs a test with a non-404 error proving it does not fall into the 404 branch
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web-tests` · harmful: 0
- features: vitrine-e-selo
- evidence: validation-web.md r2 X11 / PaginaEmpresaPublica.tsx:61 (web-tests)
- last seen: 2026-11-08T14:39:20Z

### L-053 - A shared async-state component needs the negative retry case too: no retry button on a 4xx, not only a retry on a 5xx
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `web-tests` · harmful: 0
- features: vitrine-e-selo
- evidence: validation-web.md r3 N2 / web/src/components/ui/AsyncState.tsx:52 (web-tests)
- last seen: 2026-11-08T14:56:20Z

### L-054 - When an AC requires a brand or visual asset, name the exact asset file or element, or the test pins an improvised placeholder
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs` · harmful: 0
- features: vitrine-e-selo
- evidence: validation.md SP-I1 (Selo AC2, src/infra/selo/qrcode-renderizador-de-selo.spec.ts:116) (specs)
- last seen: 2026-11-08T16:28:40Z

### L-055 - When a spec orders records by a timestamp field, check whether later transitions overwrite it and name the event the order must follow
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `specs` · harmful: 0
- features: vitrine-e-selo
- evidence: validation.md SP-I2 (backfill em ordem de decididoEm, src/domain/fivo/empresas/entities/empresa.ts:177-232) (specs)
- last seen: 2026-11-08T16:28:40Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
