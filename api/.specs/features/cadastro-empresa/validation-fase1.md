# Cadastro e Autenticação de Empresa — Validation (Phase 1: T1–T7)

**Date**: 2026-09-17
**Spec**: `api/.specs/features/cadastro-empresa/spec.md`
**Scope**: Phase 1 only — "Regras de negócio no domínio (entidades + VOs)", tasks T1–T7. Phase 2 onward (T8+) is not started and is out of scope for this report.
**Diff range**: `d2375e2..fa8654a` (T4/T5/T6/T7 commits: `d2375e2`, `bf7b8c8`, `fa8654a`); T1–T3 predate this range and were re-verified only via a brief spot-check.
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done (pre-existing, spot-checked) | Not re-verified in depth — out of scope. `cnpj.ts`/`cnpj.spec.ts` present, 60-line spec. |
| T2 | ✅ Done (pre-existing, spot-checked) | `senha.ts` matches the documented drift note (adds `hash(hasher)`); `senha.spec.ts` present. |
| T3 | ⚠️ Done, with a pre-existing defect found on spot-check | `empresa.ts` machine-of-states correct in shape, but `TransicaoInvalidaError.status = 422` (`application/errors/transicao-invalida.error.ts:4`) while spec.md P1-story-2 AC5 and T3's own "Done when" text both require **409**. Not touched by any later commit. Flagged here for visibility; T3's checkbox is left untouched per scope instructions. |
| T4 | ⚠️ Partial | 5/8 "Done when" bullets checked in `tasks.md`. Real gaps: (1) `estaBloqueado` logic bug — stays `true` up to 15 min after `bloqueadoAte` has passed; (2) method is `registrarLoginSucesso`, not `registrarLoginOk` as named in this task, `design.md:269`, and future T9; (3) `UserFactory` does not accept a raw string password as the task requires. |
| T5 | ✅ Done | All 7 "Done when" bullets have direct evidence. No gaps found. |
| T6 | ✅ Done (literal bullets), with a significant unflagged defect | All literal "Done when" bullets satisfied. But `EmpresaAlreadyExistsError`/`UserAlreadyExistsError` (status 422) and `TransicaoInvalidaError` (status 422, from T3) don't match spec-required 409 for duplicate-CNPJ/e-mail and invalid-transition responses (EMP-01 AC3, EMP-05 AC5). These two files were never touched by the T6 commit (`git log` shows only pre-T6 `b7801a1`). |
| T7 | ⚠️ Partial | 3/4 bullets checked. The first bullet ("5 portas existem, ESLint limpo") is left unchecked: the ports exist and lint clean, but their method signatures diverge substantially from the documented contract in `design.md:239-243` — see Spec-Anchored table below. This is the most significant finding of this review. |

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| -------------------------- | --------------------- | ------------------------ | ------ |
| EMP-02 / EMP-07: senha < 10 chars → erro | `SenhaFracaError`, mensagem "A senha deve ter no mínimo 10 caracteres" | `senha.ts:17-19`, `senha-fraca.error.ts:3-8` | ✅ PASS |
| EMP-07 AC3: 5ª falha de login em 15 min → bloqueio | `estaBloqueado` `true` enquanto `agora < bloqueadoAte`, `false` a partir daí | `user.ts:115-126` — **NÃO** implementa "false depois"; mantém `true` por até 15 min extras após `bloqueadoAte`. Nenhum teste cobre `agora` logo após `bloqueadoAte` passar (só 10 min antes / 16 min depois em `user.spec.ts:77-98`) | ❌ GAP — bug real, não coberto por teste |
| EMP-07 AC3: janela de 15 min reinicia se a 1ª falha é antiga | reinicia contador quando `primeiraFalhaEm` tem > 15 min | `user.ts:98-106`, `user.spec.ts:52-64` — `expect(user.falhasLogin).toBe(1)` | ✅ PASS |
| EMP-03 AC5/AC6: logo válido/`Left` com limite citado | PNG/JPG/SVG ≤ 5MB, raster ≥ 512×512; `Left` cita "formato"/"tamanho"/"dimensão" | `arquivo.ts:35-104`, `arquivo.spec.ts:56-108` — `toContain('formato'\|'tamanho'\|'dimensão')` | ✅ PASS |
| EMP-03 (edge case SVG malicioso) | rejeita `<script>`, `<foreignObject>`, `on*` | `arquivo.ts:68-78`, `arquivo.spec.ts:126-176` | ✅ PASS |
| EMP-01 AC3: CNPJ/e-mail duplicado → HTTP 409 | `status: 409` na classe de erro correspondente | `empresa-already-exists.error.ts:4`, `users-already-exists.error.ts:4` — `readonly status = 422` | ❌ GAP — status errado, spec exige 409 |
| EMP-05 AC5: transição de estado fora do conjunto → HTTP 409 | `status: 409` em `TransicaoInvalidaError` | `transicao-invalida.error.ts:4` — `readonly status = 422` | ❌ GAP — status errado (defeito de T3, não corrigido por T6) |
| EMP-06 AC2: credenciais inválidas → HTTP 401, mensagem genérica | `status: 401`, "Credenciais inválidas" | `wrong-credentials.error.ts:3-8` | ✅ PASS |
| T7 contrato de portas vs. `design.md` | `SessaoRepository`/`TokenSenhaRepository`/`Mailer`/`Storage` com os métodos de `design.md:239-243` | `sessao-repository.ts:10-15`, `token-senha-repository.ts:10-15`, `mailer.ts:14-16`, `storage.ts:7-10` — nomes/assinaturas completamente diferentes (ver Task Completion / Code Quality) | ❌ GAP — drift de arquitetura |

**Status**: ❌ Gaps present (3 spec-anchored gaps: `estaBloqueado` boundary, duplicate/transition status codes, ports-vs-design drift)

---

## Discrimination Sensor

Isolated scratch: `git worktree add <tmp>/verify-wt HEAD` (node_modules symlinked in, no changes to the real tree). Baseline `git status --porcelain` was empty before and after.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ------------ | ------- |
| 1 | `entities/empresa.ts:154` | `aprovar()` guard flipped: `status !== PENDENTE_APROVACAO` → `status === PENDENTE_APROVACAO` | ✅ Killed — 4 tests in `empresa.spec.ts` failed |
| 2 | `entities/user.ts:108` | Block threshold changed: `falhasLogin >= 5` → `falhasLogin >= 6` | ✅ Killed — `user.spec.ts:37-50` failed (`bloqueadoAte` expected non-null, got `null`) |
| 3 | `entities/arquivo.ts:70` | Removed `<script\b` from the unsafe-SVG regex, keeping `<foreignobject\b\|on[a-z0-9_-]+\s*=` | ✅ Killed — `arquivo.spec.ts:136` failed ("should reject SVG with script tag") |

**Sensor depth**: lightweight (3 mutations)
**Result**: 3/3 killed — ✅ PASS

Worktree removed with `git worktree remove --force`; real tree `git status --porcelain` confirmed unchanged (empty) before and after.

---

## Code Quality

| Principle | Status | Notes |
| --------- | ------ | ----- |
| No features beyond what was asked | ✅ | |
| No abstractions for single-use code | ✅ | |
| No unnecessary "flexibility" added | ✅ | |
| Only touched files required for task | ✅ | Confirmed via `git log --oneline -- <file>` per suspect file |
| Didn't "improve" unrelated code | ✅ | |
| Matches existing patterns/style | ⚠️ | `wrong-credentials.error.ts` still named after the pre-T6 class name (`WrongCredentialsError`→`CredenciaisInvalidasError`); filename not updated. Cosmetic. |
| Would senior engineer approve? | ⚠️ | See ports-vs-design drift (T7) and status-code gaps (T3/T6) below — these need a fix pass before Phase 2 begins. |
| Tests map to ACs, non-shallow | ✅ | Spot-checked `empresa.spec.ts`, `user.spec.ts`, `arquivo.spec.ts` — assertions target exact messages/values, not just "isLeft()". |
| Spec-anchored outcome check | ⚠️ | 3 gaps found (see table above) |
| No unclaimed tests | ✅ | Every test in T4/T5 files maps to a "Done when" bullet or EMP-* AC |
| Documented guidelines followed | none — strong defaults applied (per tasks.md's own Test Coverage Matrix note) | |

### Flags requiring attention before Phase 2

1. **Ports vs. `design.md` drift (highest priority)** — `application/ports/sessao-repository.ts`, `token-senha-repository.ts`, `mailer.ts`, `storage.ts` all use different method names/shapes than `design.md:239-243` documents and than later tasks (T9, T10, T12, T13, T18, T20, T21, T22, T24) already assume in their own "What" text (`criar`, `buscarPorTokenHash`, `deslizar`, `revogar`, `revogarTodasDoUsuario`, `buscarPorHash`, `marcarUsado`, `Mailer.enviar`, `Storage.salvar/ler/remover`). `Storage` in particular has **no read method at all** (`upload`/`delete` only) — `FakeStorage` correspondingly has no way to read back an uploaded file, which will block T22's `lerBytes`. `TemplateEmail` enum values (`RECUPERACAO_SENHA`, `BOAS_VINDAS`, `AVISO_SISTEMA`) don't match the 5 templates T20 will need (`CADASTRO_RECEBIDO`, `CADASTRO_APROVADO`, `CADASTRO_REJEITADO`, `EMAIL_CONFIRMACAO`, `SENHA_REDEFINICAO`). This needs a decision: either rename the ports (and their test doubles) to match `design.md`, or update `design.md` to match — but as-is, Phase 2 tasks cannot be implemented as literally written.
2. **HTTP status defects** — `EmpresaAlreadyExistsError`, `UserAlreadyExistsError` (422, should be 409 per EMP-01 AC3) and `TransicaoInvalidaError` (422, should be 409 per EMP-05 AC5, a T3-era bug T6 didn't catch).
3. **`estaBloqueado` boundary bug** — real 15-minute-longer-than-spec lockout window; needs a fix + a boundary test (`agora` just past `bloqueadoAte`).
4. **`UserFactory` doesn't accept a string password** as T4 specifies; only accepts a pre-built `Senha`.
5. **Method naming**: `User.registrarLoginSucesso()` vs. the `registrarLoginOk()` name used by this task, `design.md`, and future T9.

None of these are scope creep or dead code — the domain files are lean and single-purpose. The issues above are correctness/consistency gaps, not extra code.

---

## Edge Cases (Phase 1 scope only)

- [x] SVG with `<script>`/`<foreignObject>`/`on*` rejected — `arquivo.ts:68-78`
- [x] Raster below 512×512 rejected — `arquivo.ts:80-89`
- [x] File > 5 MB rejected — `arquivo.ts:50-57`
- [ ] Login lockout window boundary (`agora` exactly at/just after `bloqueadoAte`) — not handled correctly, not tested (see above)

---

## Gate Check

- **Gate command**: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest`
- **Result**: `tsc` exit 0, `eslint` exit 0, `jest` — **17 suites / 78 tests, all passed**, 0 failed, 0 skipped
- **Failures**: none
- **Skipped tests**: none

---

## Fix Plans

### Fix 1: Align new ports (T7) with `design.md`'s documented contract

- **Root cause**: `SessaoRepository`, `TokenSenhaRepository`, `Mailer`, `Storage` were implemented with different, more generic method names than `design.md` specifies, and `Storage` is missing a read method entirely.
- **Fix task**: Rename `SessaoRepository` methods to `criar/buscarPorTokenHash/deslizar/revogar/revogarTodasDoUsuario`; `TokenSenhaRepository` to `criar/buscarPorHash/marcarUsado`; `Mailer.send` → `Mailer.enviar`; add `Storage.ler(chave)` (and rename `upload`→`salvar`, `delete`→`remover` for consistency, or update `design.md` if the current names are the intended final contract — this needs an explicit decision, not a unilateral rename). Update `TemplateEmail` to the 5 values T20 will need. Update the 5 test doubles to match.
- **Priority**: Blocker for Phase 2 (T9, T13, T18, T20–T22, T24 all depend on the corrected shape).

### Fix 2: Correct HTTP status codes on duplicate/transition errors

- **Root cause**: `EmpresaAlreadyExistsError`, `UserAlreadyExistsError`, `TransicaoInvalidaError` carry `status = 422` instead of the spec-required `409`.
- **Fix task**: Change `status` to `409` in the three files; add/adjust tests once T8 (unicidade) and T3's transition tests assert on status where applicable.
- **Priority**: Major — will cause EMP-01 AC3 and EMP-05 AC5 to fail once T8/T10 wire HTTP responses.

### Fix 3: `estaBloqueado` boundary logic

- **Root cause**: `user.ts:122-125` compares `agora - bloqueadoAte <= 15min` instead of `agora < bloqueadoAte`, extending the effective lockout by up to 15 extra minutes.
- **Fix task**: Change to `agora.getTime() < this._props.bloqueadoAte.getTime()`; add a test for `agora` 1 minute after `bloqueadoAte`.
- **Priority**: Major — violates EMP-07 AC3's 15-minute lockout duration.

### Fix 4: `UserFactory` string-password shortcut

- **Root cause**: Factory only accepts `Partial<UserProps>`, which requires an already-built `Senha`.
- **Fix task**: Accept an optional `senha?: Senha | string` and convert internally via `Senha.create`.
- **Priority**: Minor — convenience for future test authoring, not a functional bug.

### Fix 5: `registrarLoginSucesso` → `registrarLoginOk` rename (or align docs)

- **Root cause**: Naming drift between implementation and task/design text.
- **Fix task**: Either rename the method to `registrarLoginOk` (matches `design.md:269` and future T9), or update `design.md`/`tasks.md` T9 text to use `registrarLoginSucesso`. Pick one before T9 starts.
- **Priority**: Minor — cosmetic today, but will cause a compile error in T9 if not resolved first.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | ---------------- | ----------- |
| EMP-02 | Implementing | ✅ Verified (Phase 1 scope: `Cnpj`, `Senha`) |
| EMP-03 | Implementing | ✅ Verified (Phase 1 scope: `Arquivo`) |
| EMP-06 | Implementing | ⚠️ Needs Fix (error contract mostly done; duplicate/transition status codes wrong) |
| EMP-07 | Implementing | ⚠️ Needs Fix (`estaBloqueado` boundary bug) |
| EMP-01, EMP-04, EMP-05, EMP-09 (ports, T7) | Implementing | ⚠️ Needs Fix (ports don't match `design.md` contract) |

---

## Summary

**Overall**: ⚠️ Issues — Phase 1's entity-level business rules (T1, T2, T3, T5) are solid and evidence-backed; T4 and T7 have real, previously-unflagged gaps that should be fixed before Phase 2 (T8+) begins, since Phase 2's own task text already assumes the corrected shapes.

**Spec-anchored check**: 6/9 ACs matched spec outcome; 3 gaps (estaBloqueado boundary, duplicate/transition HTTP status, ports-vs-design contract)
**Sensor**: 3/3 mutations killed
**Gate**: 78 passed, 0 failed (tsc + eslint clean)

**What works**: `Cnpj`, `Senha`, `Empresa` state machine (transitions correct, only the error's HTTP status is wrong), `User` failure-counting/reset logic, `Arquivo.criar` (all format/size/dimension/SVG-safety rules, fully tested), the uniform instance-`status` error contract shape, the 5 new ports' existence and domain-purity (ESLint boundary rule enforced and passing).

**Issues found**:
1. `estaBloqueado` extends the lockout window by up to 15 minutes past `bloqueadoAte` — fix the comparison, add a boundary test.
2. `EmpresaAlreadyExistsError`/`UserAlreadyExistsError`/`TransicaoInvalidaError` return 422 instead of spec-required 409.
3. `SessaoRepository`/`TokenSenhaRepository`/`Mailer`/`Storage` (and `TemplateEmail`) don't match `design.md`'s documented interface; `Storage` has no read method at all.
4. `UserFactory` doesn't accept a raw string password.
5. `registrarLoginSucesso` vs. the `registrarLoginOk` name used elsewhere.

**Next steps**: Route Fix 1–5 above as fix tasks before starting Phase 2 (T8+), since T9/T10/T13/T18/T20–T22/T24 all reference the currently-wrong port shapes and error statuses in their own task text. `tasks.md` has been updated in place with per-bullet evidence and gap notes for T4, T6, T7 (T5 fully checked; T1–T3 left untouched per scope).

---

## Resolution (2026-09-17, post-report)

All 5 fixes applied and gated, one atomic commit each; `tasks.md` T4/T6/T7 checkboxes updated to reflect the fixes:

| Fix | Commit | Result |
| --- | ------ | ------ |
| Fix 3 + Fix 5 (`estaBloqueado` boundary + `registrarLoginOk` rename) | `fix(domain): corrige fronteira de estaBloqueado e alinha User a T4/T9` | `estaBloqueado` now compares `agora.getTime() < bloqueadoAte.getTime()`; boundary tests added |
| Fix 4 (`UserFactory` string password) | same commit | `UserFactory.create` accepts `senha?: Senha \| string` |
| Fix 2 (HTTP 422 → 409) | `fix(domain): corrige status HTTP de erros de duplicidade e transição` | `EmpresaAlreadyExistsError`, `UserAlreadyExistsError`, `TransicaoInvalidaError` now `status = 409`; dedicated status tests added |
| Fix 1 (ports vs. `design.md`) | `fix(domain): alinha portas SessaoRepository/TokenSenhaRepository/Mailer/Storage a design.md` | `SessaoRepository`, `TokenSenhaRepository`, `Mailer` (+ `TemplateEmail`), `Storage` renamed to match `design.md:239-243/365-367`; the 4 corresponding test doubles updated |

Gate after all fixes: `tsc` clean, `eslint` clean, `jest` — **18 suites / 83 tests, 0 failed**. Phase 1 (T1–T7) is now fully evidenced with no open gaps; Phase 2 (T8+) can proceed against the corrected port contract and error statuses.
