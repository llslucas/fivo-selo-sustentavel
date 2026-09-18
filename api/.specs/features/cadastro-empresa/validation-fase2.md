# Cadastro e Autenticação de Empresa — Validation (Fase 2: T8–T13)

**Date**: 2026-09-17
**Spec**: `api/.specs/features/cadastro-empresa/spec.md`
**Scope**: Phase 2 only — "Casos de uso" (the P1/P2 use-case layer), tasks T8–T13. Phase 1 (T1–T7, entities/VOs) was validated separately in `validation-fase1.md` and is not re-validated here. Phase 3+ (Prisma, HTTP, guards, e2e) is not started and is out of scope.
**Diff range**: `be42200..HEAD` (6 commits: `ce0ba9f` T8, `d0cdd2c` T9, `325c990` T10, `2229fa0` T11, `9bf7d6a` T12, `fab262a` T13)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T8 — `CriarEmpresaUseCase` | ✅ Done | Order enforced (Senha → Cnpj → unicidade → criação → e-mail best-effort); "reaproveita empresa rejeitada" branch verified correct including the `usuarioId` cross-check. All 8 "Done when" bullets have direct evidence. |
| T9 — `AutenticarUsuarioUseCase` | ✅ Done | Renamed from `AuthenticateUserUseCase`; `Encrypter` no longer imported (confirmed via grep); opaque token + sha256-only persistence confirmed. All 6 bullets evidenced. |
| T10 — Aprovação/rejeição/fila | ✅ Done | `Either`-based, no `throw`; audit row + best-effort mailer on both aprovar/rejeitar; `ListarFilaAprovacaoUseCase` sorts ascending and projects the 5 required fields. All 8 bullets evidenced. |
| T11 — Suspensão/reativação/gate | ✅ Done | `SuspenderEmpresaUseCase`/`ReativarEmpresaUseCase` mirror T10's shape; `AssegurarEmpresaAprovadaUseCase` correctly rejects `PENDENTE_APROVACAO`, `REJEITADA`, and `SUSPENSA` (not just non-`APROVADA` generically — verified via `it.each`). All 5 bullets evidenced. |
| T12 — `EditarDadosEmpresaUseCase` | ✅ Done | CNPJ-immutability check normalizes the submitted value before comparing (digit-only), correctly allowing a re-masked but identical CNPJ through; e-mail change sets `emailPendente`/`tokenTrocaEmailHash` without touching `User` (login e-mail structurally unaffected, since this use case has no `UserRepository` dependency at all). All 4 bullets evidenced. |
| T13 — Recuperação/redefinição de senha | ✅ Done | `SolicitarRecuperacaoSenhaUseCase` always returns `Right` (no enumeration); `RedefinirSenhaUseCase` validates existence + not-used + not-expired in one guard, revokes all sessions and marks the token used on success. All 5 bullets evidenced. |

All 6 tasks' checkboxes in `tasks.md` are marked `[x]` and match the actual code.

---

## Spec-Anchored Acceptance Criteria

Only EMP-01…EMP-10 ACs that are domain-layer (use-case) responsibility are evaluated. ACs about HTTP status codes actually reaching the wire, routes, cookies, guards, page rendering, or ≤60s propagation are infra-phase (Phases 3–6) and are marked **"infra, not yet in scope"** rather than failed.

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion expression | Result |
| -------------------------- | --------------------- | ------------------------------------ | ------ |
| EMP-01 AC1: cadastro válido → `PENDENTE_APROVACAO` | `Empresa.status === PENDENTE_APROVACAO`, `User` role `EMPRESA`, senha só como hash | `criar-empresa.ts:73-152`, `criar-empresa.spec.ts:62-83` — `expect(empresa?.status).toBe(EmpresaStatus.PENDENTE_APROVACAO)`, `expect(user?.senha.valor).toBe('SenhaForte123-hashed')` | ✅ PASS (HTTP 201 itself is infra, T25) |
| EMP-01 AC2: CNPJ inválido → 422, "CNPJ inválido" | exact status 422 + exact message | `invalid-cnpj.error.ts:3-8` (`'CNPJ inválido.'`, trailing period not in spec text), `criar-empresa.spec.ts:102-119` asserts `status` only, not `.message` | ⚠️ Minor spec-precision gap — status correct; message has an unspec'd trailing period, untested |
| EMP-01 AC3: CNPJ/e-mail duplicado → 409, "CNPJ ou e-mail já cadastrado" | exact status 409 + exact message | `empresa-already-exists.error.ts:3-8` (`'A empresa X já existe.'`), `users-already-exists.error.ts:3-8` (`'O usuário com e-mail X já existe.'`) — `criar-empresa.spec.ts:121-155` asserts `status` only | ❌ GAP — status 409 correct, but message text materially diverges from the spec-mandated string; self-flagged by the T8 author's own "Nota de qualidade" in `tasks.md:388` as a pre-existing (T6) deviation, not fixed here |
| EMP-01 AC4: senha < 10 → 422, "A senha deve ter no mínimo 10 caracteres" | exact status 422 + exact message | `senha-fraca.error.ts:3-8` (trailing period), `criar-empresa.spec.ts:85-100` asserts `status` only | ⚠️ Minor spec-precision gap — same trailing-period pattern, pre-existing from T2 |
| EMP-01 AC8/AC9: e-mail de confirmação enviado; falha do Mailer não derruba o cadastro | `right()` returned, cadastro persisted, error logged | `criar-empresa.ts:154-164`, `criar-empresa.spec.ts:191-215` — `expect(response.isRight()).toBe(true)`, `expect(consoleErrorSpy).toHaveBeenCalled()`, `expect(mailer.mensagens).toHaveLength(0)` | ✅ PASS |
| EMP-01 edge case: empresa rejeitada recadastra com mesmo CNPJ → reaproveita, volta a `PENDENTE_APROVACAO` | same empresa/user ids, new status | `criar-empresa.ts:90-121`, `criar-empresa.spec.ts:157-189` — `expect(response.value.empresaId).toBe(rejectedEmpresa.id.toString())`, `expect(empresa?.status).toBe(EmpresaStatus.PENDENTE_APROVACAO)` | ✅ PASS |
| EMP-04 AC1: fila lista `PENDENTE_APROVACAO` ordenada asc, projeção nome/CNPJ/e-mail/data | exact ordering + exact field set | `listar-fila-aprovacao.ts:21-42`, `listar-fila-aprovacao.spec.ts:72-85` — asserts full object equality including field order-independence via `toEqual`, and id-order via `.map(item => item.id)` | ✅ PASS |
| EMP-04 AC2: aprovar → `APROVADA` + `decididoPor`/`decididoEm` + e-mail `CADASTRO_APROVADO` | exact state fields + exact template | `aprovar-empresa.ts:40-76`, `aprovar-empresa.spec.ts:80-113` — `expect(empresaAprovada?.status).toBe(APROVADA)`, `expect(empresaAprovada?.decididoPor?.equals(admin.id)).toBe(true)`, `expect(mailer.mensagens[0]).toEqual(objectContaining({template: CADASTRO_APROVADO}))` | ✅ PASS |
| EMP-04 AC3: rejeitar exige motivo ≥20 chars, `REJEITADA` + motivo persistido + e-mail com motivo | exact status/state + motivo passed to mailer | `rejeitar-empresa.ts:46-83`, `rejeitar-empresa.spec.ts:87-147` — `expect(empresaRejeitada?.motivoDecisao).toBe(MOTIVO_VALIDO)`, `expect(mailer.mensagens[0]).toEqual(objectContaining({dados: {motivo: MOTIVO_VALIDO}}))`; short-motivo case asserts `MotivoInsuficienteError` + `status(422)` | ✅ PASS |
| EMP-04 AC4: `PENDENTE_APROVACAO`/`REJEITADA` bloqueiam campanhas/selo com 403 "Cadastro ainda não aprovado" | exact message | `assegurar-empresa-aprovada.ts:27-29`, `assegurar-empresa-aprovada.spec.ts:26-44` (`it.each` over `PENDENTE_APROVACAO`, `REJEITADA`, `SUSPENSA`) — `expect(response.value.message).toBe('Cadastro ainda não aprovado')` | ✅ PASS for the domain gate; HTTP 403 wire-up in `campanhas`/`selo-e-qrcode` is out of this feature's scope |
| EMP-04 AC5 / EMP-05 AC5: transições fora do conjunto → 409 | exact status | `aprovar-empresa.spec.ts:115-128`, `rejeitar-empresa.spec.ts:149-170`, `suspender-empresa.spec.ts:48-62`, `reativar-empresa.spec.ts:48-60` — all assert `toBeInstanceOf(TransicaoInvalidaError)`; `TransicaoInvalidaError.status === 409` confirmed in Phase 1 (fixed there) | ✅ PASS |
| EMP-04 AC6: não-admin → 403, nenhum estado alterado | no state change + `NotAllowedError` | `aprovar-empresa.spec.ts:51-67`, `rejeitar-empresa.spec.ts:54-74`, `suspender-empresa.spec.ts:64-75`, `reativar-empresa.spec.ts:62-73` — all assert `toBeInstanceOf(NotAllowedError)` AND re-fetch the empresa to confirm status unchanged / 0 audit rows | ✅ PASS for the domain guard; the literal HTTP 403 number isn't carried on `NotAllowedError` by design (mapped at the future `DomainExceptionFilter`, T23) — infra, not yet in scope |
| EMP-04 AC7: log de auditoria imutável, com autor/estado anterior/estado novo/data-hora | one audit row per decision, correct fields | `aprovar-empresa.spec.ts:95-104`, `rejeitar-empresa.spec.ts:129-137`, `suspender-empresa.spec.ts:39-45`, `reativar-empresa.spec.ts:39-45` — `dados` includes `estadoAnterior`/`estadoNovo`; `RegistroAuditoriaRepository` (port) exposes only `registrar`, no update/delete | ✅ PASS |
| EMP-05 AC4 (repeat, gate reused by other features) | see EMP-04 AC4 row | — | ✅ PASS (same evidence) |
| EMP-06 AC1: credenciais corretas → sessão + papel (`EMPRESA`/`INSTITUICAO`/`ADMIN`) | `right({token, papel})` | `autenticar-usuario.ts:58-72`, `autenticar-usuario.spec.ts:134-148` — `expect(response.value.papel).toBe(UserRole.EMPRESA)`; `UserRole` enum confirmed to include `ADMIN`/`EMPRESA`/`INSTITUICAO` (`user.ts:8-11`) | ✅ PASS for the domain flow; HTTP 200 + cookie is infra (T24) |
| EMP-06 AC2: e-mail inexistente OU senha errada → 401 genérico indistinguível | exact status + exact message, same for both cases | `autenticar-usuario.ts:40-56`, `autenticar-usuario.spec.ts:46-76` — both cases assert `status.toBe(401)` and `message.toBe('Credenciais inválidas.')` (note trailing period vs. spec's `"Credenciais inválidas"`) | ⚠️ Minor spec-precision gap — status and indistinguishability correct; message has an unspec'd trailing period (pre-existing from T6, first exercised against literal spec text here) |
| EMP-07 AC3: 5ª falha em 15min → bloqueio de conta, 429 | exact status | `autenticar-usuario.ts:46-48`, `autenticar-usuario.spec.ts:78-105` — 5 failed attempts then a 6th (even with correct password) asserts `toBeInstanceOf(ContaBloqueadaError)` and `.status.toBe(429)` | ✅ PASS |
| EMP-07 (reset on success) | counters zeroed | `autenticar-usuario.ts:58-59`, `autenticar-usuario.spec.ts:107-132` — `expect(updated?.falhasLogin).toBe(0)`, `expect(updated?.bloqueadoAte).toBeNull()` | ✅ PASS |
| EMP-06 (session storage): token never persisted raw | only sha256 hash stored | `autenticar-usuario.ts:61-70`, `autenticar-usuario.spec.ts:150-171` — `expect(sessao.tokenHash).toBe(hashEsperado)`, `expect(sessao.tokenHash).not.toBe(response.value.token)` | ✅ PASS |
| EMP-08 AC1: editar nome fantasia/telefone/endereço/logo → persistido | field-level equality after edit | `editar-dados-empresa.ts:82-115`, `editar-dados-empresa.spec.ts:21-51` — every changed field asserted individually against the new value | ✅ PASS for persistence; ≤60s propagation to public pages is infra (`paginas-publicas`), not this feature |
| EMP-08 AC2: alterar CNPJ → 422, "CNPJ não pode ser alterado; solicite ao suporte" | exact status + exact message | `editar-dados-empresa.ts:66-72`, `editar-dados-empresa.spec.ts:74-96` — `expect(response.value.message).toBe('CNPJ não pode ser alterado; solicite ao suporte')` (exact match, no trailing-period issue here) | ✅ PASS |
| EMP-08 AC3: trocar e-mail mantém o e-mail atual ativo até confirmação | `emailPendente` set, login e-mail (on `User`) untouched | `editar-dados-empresa.ts:74-84,119-132`, `editar-dados-empresa.spec.ts:112-135` — asserts `emailPendente`/`tokenTrocaEmailHash` set and `Mailer(EMAIL_CONFIRMACAO)` called; login e-mail is structurally guaranteed unchanged since this use case has no `UserRepository` dependency at all | ✅ PASS (the actual confirm-and-swap flow is explicitly T29/HTTP, out of scope here) |
| EMP-08 AC4: logo substituído não afeta selos já gerados | only `logoArquivoId` swapped, no cascading writes | `editar-dados-empresa.ts:108-110`, `editar-dados-empresa.spec.ts:149-163` ("should not touch logoArquivoId when a new one is not sent") | ✅ PASS structurally (selo-generation logic itself is a different feature, not touched) |
| EMP-09 AC1: solicitação de recuperação sempre neutra (202, mesma resposta exista ou não a conta) | `right()` in both cases, no enumeration | `solicitar-recuperacao-senha.ts:31-58`, `solicitar-recuperacao-senha.spec.ts:27-61` — both branches assert `isRight()`; non-existent-account branch additionally asserts 0 tokens created / 0 mails sent | ✅ PASS for the domain flow; literal HTTP 202 is infra |
| EMP-09 AC2: conta existente → token de uso único, expira em 60min | exact expiry math | `solicitar-recuperacao-senha.ts:42-45`, `solicitar-recuperacao-senha.spec.ts:38-41` — `expect(tokenSenha.expiraEm.getTime()).toBe(AGORA.getTime() + 60 * 60_000)` | ✅ PASS |
| EMP-09 AC3: token válido → hash atualizado, token invalidado, todas as sessões revogadas | all 3 side effects | `redefinir-senha.ts:63-82`, `redefinir-senha.spec.ts:57-102` — asserts new hash (`SENHA_NOVA-hashed`), `tokenSenha.usadoEm` set, and (separate test) both pre-existing sessions get `revogadaEm` set | ✅ PASS |
| EMP-09 AC4: token expirado/usado/inexistente → 400, "Link de redefinição inválido ou expirado" | exact status + exact message | `redefinir-senha.ts:42-49`, `token-invalido.error.ts:3-8`, `redefinir-senha.spec.ts:104-156` — `expect(response.value.status).toBe(400)`, `expect(response.value.message).toBe('Link de redefinição inválido ou expirado')` — **exact match, no trailing-period issue** | ✅ PASS |
| EMP-09 (independent test): senha antiga para de funcionar após redefinição | `hasher.compare(oldPassword, newHash)` → `false` | `redefinir-senha.spec.ts:173-189` | ✅ PASS |
| EMP-10 AC1: suspender `APROVADA` → `SUSPENSA` | exact state + audit row | `suspender-empresa.ts:37-54`, `suspender-empresa.spec.ts:26-46` | ✅ PASS for the state transition; 404 on public pages within 60s is infra (`paginas-publicas`) |
| EMP-10 AC2: `SUSPENSA` permite login, bloqueia criação/edição com 403 | login unaffected; block gate available | Login: `autenticar-usuario.ts` never inspects `Empresa.status` (structural — login is per-`User`, not gated on company status). Block gate: `assegurar-empresa-aprovada.spec.ts:26-44` includes `SUSPENSA` in the rejected set | ✅ PASS for both halves at the domain layer; wiring the gate into `campanhas`/`selo-e-qrcode` controllers is those features' own scope |
| EMP-10 AC3: reativar `SUSPENSA` → `APROVADA`, republica campanhas aprovadas | exact state + audit row | `reativar-empresa.ts:37-54`, `reativar-empresa.spec.ts:26-46` | ✅ PASS for the state transition; campaign republishing is `paginas-publicas`/infra |

**Status**: ⚠️ Gaps present — 1 confirmed message-text GAP (EMP-01 AC3) and 3 minor trailing-period spec-precision gaps (EMP-01 AC2/AC4, EMP-06 AC2), all pre-existing from Phase 1 (T1/T2/T6) and first exercised against the literal spec text by this phase's tests. No status-code, state-machine, or side-effect gaps found. 27/31 evaluated criteria PASS outright.

---

## Discrimination Sensor

Isolated scratch: `git worktree add /tmp/verify-wt-fase2 HEAD` (real `node_modules` symlinked in, no changes to the real tree). Baseline `git status --porcelain` on the real tree was empty before and after.

| # | File:line | Task | Description | Killed? |
| - | --------- | ---- | ----------- | ------- |
| 1 | `use-cases/criar-empresa.ts:92` | T8 | Flipped the "reaproveita empresa rejeitada" branch: `existingEmpresa.status === EmpresaStatus.REJEITADA` → `!== EmpresaStatus.REJEITADA` | ✅ Killed — `criar-empresa.spec.ts` "should reuse the rejected empresa..." failed (expected `right`, got `left`) |
| 2 | `use-cases/autenticar-usuario.ts:52-55` | T9 | Removed the `user.registrarFalhaDeLogin(agora)` + `save` side effect on wrong password | ✅ Killed — `autenticar-usuario.spec.ts` "should block the account... after 5 failed attempts" failed (6th attempt with correct password succeeded instead of being blocked) |
| 3 | `use-cases/aprovar-empresa.ts:31` | T10 | Flipped the admin guard: `user.role !== UserRole.ADMIN` → `=== UserRole.ADMIN` | ✅ Killed — 5/5 tests in `aprovar-empresa.spec.ts` failed (admin now blocked, non-admin now allowed) |
| 4 | `use-cases/redefinir-senha.ts:42-45` | T13 | Removed the `!tokenSenha.usadoEm` clause from `tokenValido`, leaving only the expiry check | ✅ Killed — `redefinir-senha.spec.ts` "should reject... when the token was already used" failed (expected `left`, got `right`) |

**Sensor depth**: lightweight (4 mutations, spread across T8/T9/T10/T13 — 4 of the 6 tasks in scope)
**Result**: 4/4 killed — ✅ PASS

Worktree removed with `git worktree remove --force`; real tree `git status --porcelain` confirmed unchanged (empty) before and after each mutation cycle and after final cleanup.

---

## Code Quality

| Principle | Status | Notes |
| --------- | ------ | ----- |
| No features beyond what was asked | ✅ | |
| No abstractions for single-use code | ✅ | |
| No unnecessary "flexibility" added | ✅ | |
| Only touched files required for task | ✅ | Diff stat confirms only use-cases, their specs, 3 new error classes, and one pre-existing test-double bug fix (see below) were touched |
| Didn't "improve" unrelated code | ✅ | |
| Matches existing patterns/style | ✅ | Every use-case follows the same guard→load→mutate-via-entity-method→persist→best-effort-mail shape established in T8 |
| Would senior engineer approve? | ✅ | |
| Tests map to ACs, non-shallow | ✅ | Spot-checked `criar-empresa.spec.ts`, `autenticar-usuario.spec.ts`, `aprovar-empresa.spec.ts`, `redefinir-senha.spec.ts` — assertions target exact field values / exact error subclasses / exact status numbers, not just `isLeft()` |
| Spec-anchored outcome check | ⚠️ | See table above — 1 confirmed message-text gap (EMP-01 AC3), 3 trailing-period precision gaps, all inherited from Phase 1's error classes, not introduced by T8–T13 |
| Per-layer Coverage Expectation met | ✅ | Every use-case has happy path + every documented error branch + the Independent Test scenario from its story |
| No unclaimed tests | ✅ | Every test in every T8–T13 spec file maps to a "Done when" bullet or an EMP-* AC |
| Documented guidelines followed | none — strong defaults applied (per tasks.md's own Test Coverage Matrix note) | |

**In-scope test-double fix** (T10, `test/repositories/in-memory-empresa-repository.ts:20-33`): `listarPorEstado` previously filtered by `item.uf` and sorted by `nomeFantasia` (a pre-existing bug confusing "estado" = UF vs. "estado" = status). Verified the current code filters by `item.status` and sorts by `createdAt`, matching `listar-fila-aprovacao.spec.ts`'s expectations and the port's own documented contract. Correctly scoped as necessary-for-T10, not scope creep.

---

## Edge Cases (Phase 2 scope only)

- [x] Empresa rejeitada recadastrando com o mesmo CNPJ → reaproveita e volta à fila — `criar-empresa.spec.ts:157-189`
- [x] CNPJ/e-mail duplicado com dois administradores decidindo concorrentemente → not applicable at this layer (single in-process call; the CAS-based concurrency guarantee is explicitly deferred to T17/Prisma persistence, per `design.md`/`tasks.md` Phase 3)
- [x] Provedor de e-mail indisponível durante aprovação/rejeição/cadastro/recuperação → conclui a operação, loga o erro — covered in `criar-empresa.spec.ts:191-215`, `aprovar-empresa.spec.ts:130-143`; rejeitar/redefinir/solicitar don't have an explicit "mailer fails" test but share the identical `try/catch` pattern
- [ ] Rejeitar-empresa "Mailer falha ainda assim conclui" — **not independently tested** (only aprovar-empresa and criar-empresa have this exact scenario as its own test case); the code path is structurally identical (same `try/catch` around `mailer.enviar`), so this is a minor test-coverage thinness, not a functional gap

---

## Gate Check

- **Gate command**: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npm run build`
- **Result**: `tsc` exit 0, `eslint` exit 0, `jest` — **24 suites / 127 tests, all passed**, `npm run build` exit 0
- **Test count before this priority group** (measured directly at `be42200`, the diff range start — NOT the "91" figure mentioned in this task's own setup instructions, which does not match the actual repo history): **83 tests / 18 suites**
- **Test count after (T8–T13)**: **127 tests / 24 suites**
- **Delta**: **+44 new tests**, 0 removed, 0 weakened assertions found on spot-check
- **Skipped tests**: `npx jest --config ./test/jest-e2e.json` — **explicitly skipped**. No e2e test files exist yet (Phase 5+ infra); `test/jest-e2e.json` has no `passWithNoTests`, so running it would produce a false failure unrelated to T8–T13's domain-only scope.
- **Failures**: none

---

## Fix Plans

### Fix 1: `EmpresaAlreadyExistsError`/`UserAlreadyExistsError` message text doesn't match EMP-01 AC3

- **Root cause**: `empresa-already-exists.error.ts:7` and `users-already-exists.error.ts:7` use per-entity messages (`"A empresa X já existe."` / `"O usuário com e-mail X já existe."`) instead of the spec-mandated unified string `"CNPJ ou e-mail já cadastrado"`. Introduced in an earlier phase (T6), not touched by T8, but T8's own tests only assert `.status`, not `.message`, so the divergence was never caught by an assertion.
- **Fix task**: Change both error messages to `"CNPJ ou e-mail já cadastrado"` (or confirm with the user that per-entity messages are the intended deviation and update `spec.md` instead); add a `.message` assertion to `criar-empresa.spec.ts`'s two 409 tests once decided.
- **Priority**: Minor — status code (the primary HTTP contract signal) is already correct; this only affects exact wire text, and any client doing exact string matching on it would break.

### Fix 2: Trailing period on 3 error messages vs. literal spec text

- **Root cause**: `invalid-cnpj.error.ts`, `senha-fraca.error.ts`, `wrong-credentials.error.ts` all append a trailing `.` that spec.md's quoted strings don't have (`"CNPJ inválido"`, `"A senha deve ter no mínimo 10 caracteres"`, `"Credenciais inválidas"`).
- **Fix task**: Either strip the trailing period from all three (to match spec literally) or treat this as an accepted house-style convention and note it once in `spec.md`/a lesson so future error classes don't get flagged repeatedly.
- **Priority**: Cosmetic — no functional impact; purely a literal-text divergence.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | ---------------- | ----------- |
| EMP-01 | Implementing | ⚠️ Needs Fix (domain logic fully verified; AC3 message text diverges from spec, AC2/AC4 have unspec'd trailing periods — Minor/Cosmetic, not blocking) |
| EMP-02 | Implementing | ✅ Verified (Phase 1 scope, reconfirmed unchanged here) |
| EMP-03 | Implementing | ✅ Verified (Phase 1 scope; T8's `logoArquivoId` plumbing confirmed, actual upload validation still Phase 4) |
| EMP-04 | Implementing | ✅ Verified (fila, aprovação, rejeição, gate, audit — all domain ACs pass) |
| EMP-05 | Implementing | ✅ Verified (state machine + transition rejection + audit, reconfirmed against T10/T11's call sites) |
| EMP-06 | Implementing | ⚠️ Needs Fix (auth flow, rate-limit, session-hash-only-storage all verified; AC2 message has an unspec'd trailing period — Cosmetic) |
| EMP-07 | Implementing | ✅ Verified (5-attempt/15-min lockout + reset-on-success, boundary bug from Phase 1 confirmed still fixed) |
| EMP-08 | Implementing | ✅ Verified (edit fields, CNPJ-immutable 422 with exact message, email-pending flow, logo swap) |
| EMP-09 | Implementing | ✅ Verified (neutral response, 60-min token, full side-effect set on redefinition, exact 400 message) |
| EMP-10 | Implementing | ✅ Verified (suspend/reactivate state transitions + gate integration, audit rows) |

---

## Summary

**Overall**: ⚠️ Issues — All 6 tasks (T8–T13) are functionally complete and correctly tested: state machines, guards, side effects (audit rows, session revocation, token invalidation, best-effort mailing), and status codes all match the spec. The only findings are **message-text** divergences on 4 pre-existing error classes (1 substantive — EMP-01 AC3 — and 3 cosmetic trailing periods), none of which were introduced by T8–T13 and one of which (EMP-01 AC3) was already self-documented as a known deviation by the T8 author. No functional, state-machine, or side-effect gap was found anywhere in Phase 2.

**Spec-anchored check**: 27/31 evaluated criteria matched the spec-defined outcome exactly; 4 message-text gaps flagged (1 substantive, 3 cosmetic)
**Sensor**: 4/4 mutations killed (T8, T9, T10, T13 covered)
**Gate**: 127 passed, 0 failed (tsc + eslint + build all clean); e2e gate explicitly and justifiably skipped (no e2e files exist yet)

**What works**: `CriarEmpresaUseCase`'s full ordering and reaproveita-CNPJ-rejeitado logic; `AutenticarUsuarioUseCase`'s indistinguishable-401 + 5-attempt lockout + hash-only session storage; `Aprovar`/`Rejeitar`/`Suspender`/`Reativar`/`ListarFilaAprovacao` all correctly delegating to the entity's state machine with audit-row + best-effort-mail side effects; `AssegurarEmpresaAprovadaUseCase`'s 3-state rejection gate; `EditarDadosEmpresaUseCase`'s CNPJ-immutability and e-mail-pending flow; `SolicitarRecuperacaoSenha`/`RedefinirSenha`'s neutral-response, 60-min-expiry, and full-session-revocation behavior.

**Issues found**:
1. `EmpresaAlreadyExistsError`/`UserAlreadyExistsError` message text doesn't match EMP-01 AC3's exact spec string (status 409 is correct) — Minor.
2. `InvalidCnpjError`/`SenhaFracaError`/`CredenciaisInvalidasError` carry an unspec'd trailing period — Cosmetic.
3. `RejeitarEmpresaUseCase`'s "Mailer fails but still completes" path has no dedicated test (structurally identical code to the tested `AprovarEmpresaUseCase` path) — Minor test-coverage thinness, not a functional gap.

**Next steps**: Route Fix 1 and Fix 2 as low-priority cleanup tasks (or accept as documented house style and update `spec.md` to match) before/independently of starting Phase 3; neither blocks Phase 3 (Prisma/persistence), since Phase 3 depends on the domain contracts' shapes and status codes, not on literal message text. Optionally add the missing `RejeitarEmpresaUseCase` mailer-failure test for symmetry with `AprovarEmpresaUseCase`.
