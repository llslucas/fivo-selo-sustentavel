# Cadastro e Autenticação de Empresa — Validation (Fase 3: T14–T18)

**Date**: 2026-09-18
**Spec**: `api/.specs/features/cadastro-empresa/spec.md`
**Scope**: Phase 3 only — camada de persistência (Prisma/Postgres), tasks T14–T18. Fases 1 e 2 (T1–T13) foram validadas em `validation-fase1.md` / `validation-fase2.md` e não são re-verificadas aqui. Fases 4–6 (T19–T32) não começaram.
**Diff range**: `fab262a..HEAD` (5 commits: `d488fa7` T14, `ac2ec18` T15, `35df750` T16, `e3e9e62` T17, `c5b9f17` T18)
**Verifier**: independent sub-agent (author ≠ verifier), evidence-or-zero

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T14 — Setup de Prisma + PostgreSQL | ✅ Done | Todos os 4 bullets reproduzidos. Migration `prisma/migrations/20260918144713_init/migration.sql` aplicada contra o compose (`npx prisma migrate deploy` exit 0, `migrate status` → "Database schema is up to date!"). **Drift check independente**: `npx prisma migrate diff --from-migrations --to-schema-datamodel` → **"No difference detected."** — a migration versionada corresponde exatamente ao `schema.prisma`. As 6 tabelas existem com `@@map` snake_case (`schema.prisma:53,87,103,118,132,149`), `usuario.email @unique` (`:40`), `empresa.cnpj @unique` (`:61`), `@@index([status, criadoEm])` (`:86`), enums `UserRole`/`EmpresaStatus`/`TipoArquivo` (`:14,:22,:31`). `.env` ignorado (`.gitignore:45`), `prisma/migrations` versionado (`git check-ignore` → não-ignorado). |
| T15 — `PrismaService` + `DatabaseModule` global | ✅ Done | `onModuleInit`→`$connect()` em `prisma.service.ts:15-17`, `onModuleDestroy`→`$disconnect()` em `:19-21`. `@Global()` em `database.module.ts:16`, `PrismaService` provido (`:20`) e exportado (`:31`). O bullet "AppModule continua subindo" tem evidência **mais forte** do que o `curl` manual do autor: o harness e2e sobe o `AppModule` inteiro 6× por execução e `test/smoke.e2e-spec.ts:33-37` afirma `GET /` → 404. |
| T16 — Harness de e2e com Postgres descartável | ✅ Done | `criarAppDeTeste()` em `test/helpers/e2e-app.ts:20-37`; `limparBanco()` em `:54-62` (`TRUNCATE ... RESTART IDENTITY CASCADE` na ordem de FK declarada em `:44-51`), provado com FK real em `smoke.e2e-spec.ts:39-66` (insere `usuario`+`sessao`, trunca, `count()` → 0 nos dois). `maxWorkers: 1` em `test/jest-e2e.json:6`. 3/3 smoke passam. |
| T17 — Adaptadores Prisma `Empresa`/`User` | ⚠️ Done com GAP (corrigido) | Os 6 bullets têm evidência, mas o bullet "`create` → `findById` devolve entidade equivalente (`equals` + campos de valor)" **não se sustentava como escrito**: `Entity.equals` (`src/core/types/entities/entity.ts:16-26`) compara **somente o id**, então `expect(encontrada!.equals(empresa)).toBe(true)` não prova fidelidade de campo nenhuma. O peso ficava só nas asserções explícitas, e 8 colunas da `Empresa` podiam ser descartadas/trocadas com a suíte verde. Ver GAP 1 — corrigido nesta validação. Os demais bullets (filtro/ordem de `listarPorEstado`, P2002→409) resistiram ao sensor. |
| T18 — Adaptadores `Sessao`/`RegistroAuditoria`/`TokenSenha` | ✅ Done | Todos os 5 bullets confirmados. Roundtrips: `prisma-sessao-repository.e2e-spec.ts:52-70`, `prisma-token-senha-repository.e2e-spec.ts:53-66`, `prisma-registro-auditoria-repository.e2e-spec.ts:28-54` e `:56-73`. `deslizar`/`revogar`/`revogarTodasDoUsuario` em `:78-89`, `:91-100`, `:102-131`. Append-only confirmado estruturalmente (ver AC "auditoria imutável"). |

As 5 caixas em `tasks.md` estão marcadas `[x]` e batem com o código. Todas as citações `file:line` do autor foram conferidas uma a uma e **estão corretas** (as de T15/T16 referem-se ao estado do arquivo no commit da própria task; `database.module.ts` cresceu depois em T17/T18).

---

## Spec-Anchored Acceptance Criteria (infra/persistência)

Só ACs cuja responsabilidade cai nesta camada. ACs de HTTP (status na fiação, rotas, cookies, guards) são Fases 5–6 e ficam marcados como "infra, ainda fora de escopo".

| Critério | Outcome definido pelo spec/design | `file:line` + expressão da asserção | Resultado |
| -------- | --------------------------------- | ----------------------------------- | --------- |
| **Unicidade → 409** (EMP-01 AC3 / design.md "Error Handling Strategy") | violação de unicidade vira erro de domínio com `status 409` e mensagem "CNPJ ou e-mail já cadastrado"; `PrismaClientKnownRequestError` **não** vaza | Tradução: `erros-prisma.ts:4-9` (`P2002`), aplicada em `prisma-empresa-repository.ts:53-55` e `:68-70`, `prisma-user-repository.ts:35-37` e `:50-52`. Testes: `prisma-empresa-repository.e2e-spec.ts:251-264` e `prisma-user-repository.e2e-spec.ts:114-133` — `rejects.toBeInstanceOf(...)` **e** `rejects.toMatchObject({ status: 409, message: 'CNPJ ou e-mail já cadastrado' })`. Mensagem confere com `empresa-already-exists.error.ts:7` / `users-already-exists.error.ts:7` | ✅ PASS — contrato pronto para a Fase 5; mutação M2 (remoção da tradução) foi morta |
| **Roundtrip de dados — `Empresa`** (EMP-01, EMP-04 AC3, EMP-08 AC1/AC3, EMP-03) | toda coluna mapeada volta idêntica; VO `Cnpj` reidratado; enum de status preservado; datas preservadas | `prisma-empresa-mapper.ts:36-76` (toDomain) / `:78-105` (toPrisma); `prisma-empresa-repository.e2e-spec.ts:51-82` (razão social, fantasia, `cnpj.valor`, `numero: 's/n'`, `uf`, site, contato, status, `createdAt`, telefone, cep, logradouro, bairro, cidade) e `:84-132` (complemento, `logoArquivoId`, status `REJEITADA`, `decididoPor`, `decididoEm`, `motivoDecisao`, `emailPendente`, `tokenTrocaEmailHash`, `updatedAt`) | ✅ PASS **após o fix** — era ❌ GAP: 8 colunas sem nenhuma asserção (ver GAP 1) |
| **Roundtrip de dados — `User`** (EMP-01, EMP-06, EMP-07) | `Senha` VO ↔ `senha_hash` sem re-hash; `role` enum; contadores de bloqueio; datas | `prisma-user-mapper.ts:20-44` / `:46-59`; `prisma-user-repository.e2e-spec.ts:41-62` (`senha.valor` = hash exato persistido, `role`, `falhasLogin`, `bloqueadoAte`, `createdAt`), `:86-112` (`falhasLogin: 5`, `primeiraFalhaEm`, `bloqueadoAte` = +15min, `estaBloqueado(agora)` → true, `updatedAt`) | ✅ PASS **após o fix** (`updatedAt` era o único campo sem asserção) |
| **Fidelidade do VO `Senha` na reidratação** | o hash volta byte a byte; `Senha.create` não re-hasheia | `senha.ts:17-23` só valida comprimento; o hash é explícito em `senha.ts:29-32` (`hash(hasher)`), nunca chamado pelo mapper. Asserção: `prisma-user-repository.e2e-spec.ts:58` — `expect(encontrado!.senha.valor).toBe(HASH_DE_SENHA)` com um hash argon2 realista | ✅ PASS |
| **Fidelidade do VO `Cnpj`** | 14 dígitos normalizados voltam iguais; CNPJ corrompido no banco falha alto | `prisma-empresa-mapper.ts:38-42` (`Cnpj.create` + `throw` explícito em valor inválido — corrupção de dado, não erro de usuário); `prisma-empresa-repository.e2e-spec.ts:66,144` | ✅ PASS |
| **Roundtrip `Sessao`/`TokenSenha`/`RegistroAuditoria`** | interfaces de dado voltam campo a campo, incluindo opcionais ausentes → `null` | `prisma-sessao-repository.ts:15-48` + `prisma-sessao-mapper.ts:6-30`, testado em `prisma-sessao-repository.e2e-spec.ts:52-70` (incl. `ip`, `userAgent`, `revogadaEm: null`); `prisma-token-senha-mapper.ts:6-26` testado em `prisma-token-senha-repository.e2e-spec.ts:53-66`; `prisma-registro-auditoria-mapper.ts:9-35` testado em `prisma-registro-auditoria-repository.e2e-spec.ts:28-54` (incl. `dados` Json) e `:56-73` (opcionais → `null`, via `Prisma.DbNull` em `prisma-registro-auditoria-mapper.ts:30-32`) | ✅ PASS |
| **Fila de aprovação: filtro + ordem** (EMP-04 AC1) | só o estado pedido, ordenado por data de cadastro, asc e desc | `prisma-empresa-repository.ts:33-43` (`where: { status: statusParaPrisma(estado) }`, `orderBy: { criadoEm: ordem }`); `prisma-empresa-repository.e2e-spec.ts:172-203` (asc, com uma `APROVADA` que fica de fora) e `:205-229` (desc) | ✅ PASS — mutação M1 (ordem fixa em `'desc'`) foi morta |
| **Auditoria imutável / append-only** (EMP-04 AC7, EMP-05 AC7) | nenhum caminho de update/delete no repositório de auditoria | `prisma-registro-auditoria-repository.ts:17-24` implementa **só** `registrar`; porta `registro-auditoria-repository.ts:11-13` também só declara `registrar`. Teste estrutural: `prisma-registro-auditoria-repository.e2e-spec.ts:75-82` — `Object.getOwnPropertyNames(prototype)` sem `constructor` → `['registrar']`. Grep independente por `update`/`delete`/`upsert`/`deleteMany` em `src/infra/database/prisma/prisma-registro-auditoria-repository.ts`: 0 ocorrências | ✅ PASS no nível do repositório. Ressalva conhecida: `PrismaService` é global e expõe `prisma.registroAuditoria.delete` a qualquer injeção — o `REVOKE UPDATE, DELETE` continua como follow-up de infra registrado em `design.md` §Risks e §Open follow-ups #3 |
| **Revogação de sessões** (EMP-09 AC3) | `revogarTodasDoUsuario` atinge todas as sessões daquele usuário e **só** dele | `prisma-sessao-repository.ts:43-48` (`where: { usuarioId, revogadaEm: null }`); `prisma-sessao-repository.e2e-spec.ts:102-131` — duas sessões do usuário ficam com `revogadaEm` preenchido e a de **outro** usuário permanece `null` | ✅ PASS — mutação M4 (remoção do filtro `usuarioId`) foi morta |
| **Deslize de sessão** (EMP-07 AC4) | `deslizar` move `ultimoAcessoEm` sem tocar `criadaEm` | `prisma-sessao-repository.ts:29-34`; `prisma-sessao-repository.e2e-spec.ts:78-89` | ✅ PASS |
| **Token de senha de uso único** (EMP-09 AC3/AC4) | `marcarUsado` grava `usadoEm`; `buscarPorHash` devolve `usadoEm: null` enquanto não usado | `prisma-token-senha-repository.ts:29-34`; `prisma-token-senha-repository.e2e-spec.ts:53-66` e `:74-83` | ✅ PASS |
| **Vínculo 1-1 `User`↔`Empresa`** (AD-013) | `empresa.usuario_id` único, FK para `usuario` | `schema.prisma:58` (`@unique`) + `:82` (FK `onDelete: Cascade`); `prisma-empresa-repository.e2e-spec.ts:152-170` | ✅ PASS |
| **Atomicidade do autocadastro** (EMP-01 AC1 + edge case de concorrência) | `User` + `Empresa` como **uma** operação (design.md: "uma operação, um `Either`") | `criar-empresa.ts:150-151`: dois writes independentes, sem transação | ❌ **GAP 2** — ver Fix Plans; escalado, não corrigido aqui |

**Schema vs. entidades — comparação campo a campo** (o pedido explícito da verificação):

| Fonte de domínio | Divergência encontrada |
| ---------------- | ---------------------- |
| `EmpresaProps` (`entities/empresa.ts:16-40`) vs. `model Empresa` | Nenhuma. 20/20 campos mapeados com tipo e nullability corretos; `numero: string` ↔ `numero String` (✓ representa "s/n", testado); `usuarioId?` ↔ `usuario_id String? @unique`; `uf` ↔ `Char(2)` |
| `UserProps` (`entities/user.ts:13-24`) vs. `model Usuario` | Nenhuma. `senha: Senha` ↔ `senha_hash String` (guarda só o hash); `empresa?: Empresa \| null` é relação, não coluna — corresponde a `empresa Empresa?` (`schema.prisma:49`) |
| `ArquivoProps` (`entities/arquivo.ts:23-32`) vs. `model Arquivo` | Só uma adição: `criado_em DateTime @default(now())` (`schema.prisma:145`) não existe em `ArquivoProps`. Coluna de infra, sem contrapartida obrigatória no domínio; o adaptador de `Arquivo` é T22, fora desta fase. **Não é GAP** |
| `Sessao` (`ports/sessao-repository.ts:1-10`) vs. `model Sessao` | Nenhuma. `ip?`/`userAgent?` (`string \| undefined`) ↔ colunas nullable, com `?? undefined` no toDomain e `?? null` no toPrisma (`prisma-sessao-mapper.ts:14-15,27-28`) |
| `RegistroAuditoria` (`ports/registro-auditoria-repository.ts:1-9`) vs. `model RegistroAuditoria` | Nenhuma. `dados?: Record<string,unknown> \| null` ↔ `Json?` |
| `TokenSenha` (`ports/token-senha-repository.ts:1-8`) vs. `model TokenSenha` | Nenhuma |

**Status**: 1 GAP funcional aberto (GAP 2, escalado) + 1 GAP de cobertura corrigido nesta validação (GAP 1). Nenhuma divergência de tipo ou nullability entre schema e domínio.

---

## Discrimination Sensor

Scratch isolado: `git worktree add /tmp/verify-wt-fase3 HEAD` com o `node_modules` real por symlink. **Nenhum `git stash`.** `git status --porcelain` da árvore real capturado antes (0 linhas) e conferido depois de cada ciclo e ao final.

**Rodada 1 — código como commitado (`c5b9f17`)**

| # | File:line | Task | Mutação | Morta? |
| - | --------- | ---- | ------- | ------ |
| M1 | `prisma-empresa-repository.ts:39` | T17 | `orderBy: { criadoEm: ordem }` → `criadoEm: 'desc'` fixo | ✅ Morta (1 falha) |
| M2 | `prisma-empresa-repository.ts:53-55` | T17 | removida a tradução `P2002 → EmpresaAlreadyExistsError` em `create` (rethrow cru) | ✅ Morta (1 falha) |
| M3 | `prisma-user-mapper.ts:53` | T17 | `falhasLogin: user.falhasLogin` → `0` | ✅ Morta (1 falha) |
| M4 | `prisma-sessao-repository.ts:45` | T18 | `where: { usuarioId, revogadaEm: null }` → `{ revogadaEm: null }` (revoga de todo mundo) | ✅ Morta (1 falha) |
| M5 | `prisma-empresa-mapper.ts:100` | T17 | `emailPendente` descartado no toPrisma | ❌ **Sobreviveu** |
| M6 | `prisma-empresa-mapper.ts:101` | T17 | `tokenTrocaEmailHash` descartado | ❌ **Sobreviveu** |
| M7 | `prisma-empresa-mapper.ts:99` | T17 | `motivoDecisao` descartado | ❌ **Sobreviveu** |
| M8 | `prisma-empresa-mapper.ts:95` | T17 | `logoArquivoId` descartado | ❌ **Sobreviveu** |
| M9 | `prisma-empresa-mapper.ts:85` | T17 | `telefone` corrompido para constante | ❌ **Sobreviveu** |
| M10 | `prisma-empresa-mapper.ts:89` | T17 | `complemento` descartado | ❌ **Sobreviveu** |
| M11 | `prisma-empresa-mapper.ts:103` | T17 | `atualizadoEm` descartado | ❌ **Sobreviveu** |
| M12 | `prisma-empresa-mapper.ts:90-91` | T17 | `bairro` e `cidade` **trocados** entre si | ❌ **Sobreviveu** |
| M13 | `prisma-user-mapper.ts:57` | T17 | `atualizadoEm` descartado | ❌ **Sobreviveu** |
| M14 | `prisma-empresa-mapper.ts:64` | T17 | `motivoDecisao` descartado no **toDomain** | ❌ **Sobreviveu** |

**Resultado rodada 1**: 14 mutações, **4 mortas / 10 sobreviventes** — ❌ FAIL. Todas as sobreviventes concentradas nos mappers de `Empresa`/`User`. Ver GAP 1.

**Rodada 2 — após o fix de cobertura (mesmas 10 mutações, scratch novo)**

| Mutação | Morta? |
| ------- | ------ |
| M5, M6, M7, M8, M9, M10, M11, M12, M13, M14 | ✅ **10/10 mortas** (1 falha cada) |

**Resultado final do sensor**: 14/14 mortas — ✅ PASS.

**Sensor depth**: moderada (14 mutações, cobrindo T17 e T18; T14/T15/T16 são setup/config sem lógica comportamental mutável de forma significativa — o harness de T16 é exercitado indiretamente por todas as 28 e2e).

Ambos os worktrees removidos com `git worktree remove --force`; `git worktree list` volta a mostrar só a árvore principal; `git status --porcelain` da árvore real bateu com o baseline antes e depois de cada rodada (limpo na rodada 1; só os 2 arquivos de teste do fix na rodada 2).

---

## Code Quality

| Princípio | Status | Notas |
| --------- | ------ | ----- |
| Sem features além do pedido | ✅ | |
| Sem abstrações para código de uso único | ✅ | `erros-prisma.ts` tem 1 função usada em 4 call sites — justificado, não prematuro |
| Sem "flexibilidade" desnecessária | ✅ | |
| Só tocou arquivos necessários | ✅ | Diff stat confirma: `prisma/`, `src/infra/database/`, `test/helpers/`, `test/database/`, `package.json`, `.env.example`, `docker-compose.test.yml` e as marcações de `tasks.md`. Nenhum arquivo de domínio alterado — a camada hexagonal foi respeitada (AD-017) |
| Não "melhorou" código não relacionado | ✅ | |
| Bate com os padrões existentes | ✅ | Todo repositório segue a mesma forma: `@Injectable()`, `PrismaService` por construtor, delegação a um `Mapper` estático com `toDomain`/`toPrisma`. Os 5 mappers são simétricos entre si. Não havia mapper Prisma prévio no projeto para comparar — este é o primeiro, e estabelece o padrão de forma consistente |
| Hexagonal / AD-017 | ✅ | O domínio não importa nada de `@prisma/client`; a inversão acontece em `database.module.ts:19-37` (`provide: <PortaAbstrata>, useClass: Prisma…`), e os testes e2e resolvem pelas **portas** (`contexto.app.get(EmpresaRepository)`), não pelas classes concretas — isso é o padrão correto e foi seguido em 5/5 specs |
| Testes mapeiam para ACs, não-rasos | ⚠️→✅ | Era o ponto fraco: asserções de `Sessao`/`TokenSenha`/`RegistroAuditoria` são exaustivas, mas as de `Empresa`/`User` deixavam 9 colunas sem cobertura enquanto o bullet do "Done when" dava a impressão contrária por apoiar-se em `equals()`. Corrigido |
| Sem testes não reivindicados | ✅ | Cada um dos 27 testes originais mapeia para um bullet de "Done when" ou um AC |
| Guidelines documentadas | nenhuma — defaults fortes aplicados | |

---

## Edge Cases (escopo da Fase 3)

- [x] Corrida entre `findByCnpj`/`findByEmail` do caso de uso e o `INSERT` → o banco rejeita e o erro vira 409 de domínio — `prisma-empresa-repository.ts:50-58`, `prisma-user-repository.ts:32-40`, testado em ambos os specs
- [x] `TRUNCATE` com FK em ordem arbitrária → `CASCADE` cobre — `smoke.e2e-spec.ts:39-66`
- [x] Campos opcionais ausentes → `NULL` real (não `JsonNull` literal) — `prisma-registro-auditoria-mapper.ts:30-32`, testado em `:56-73` do spec
- [x] Sessão já revogada não tem a data reescrita por `revogarTodasDoUsuario` — `prisma-sessao-repository.ts:45` (`revogadaEm: null` no `where`)
- [x] Estado desconhecido em `listarPorEstado` → falha alto — `prisma-empresa-mapper.ts:25-33` (`statusParaPrisma` lança). **Sem teste dedicado** — thinness menor, não GAP funcional (o caminho só é alcançável por um chamador que invente um estado fora do enum)
- [x] CNPJ/hash corrompido no banco → `throw` explícito em vez de entidade silenciosamente errada — `prisma-empresa-mapper.ts:40-42`, `prisma-user-mapper.ts:24-28`. Sem teste dedicado (exigiria escrita crua no banco); aceitável
- [ ] **Falha parcial no autocadastro** (User gravado, Empresa falha) → **não coberto e não tratado** — ver GAP 2
- [ ] Banco indisponível no meio de uma operação → sem tratamento específico; o erro sobe cru até o futuro `DomainExceptionFilter` (T23). Aceitável nesta fase

---

## Gate Check

Pré-requisito reproduzido por mim: `docker compose -f docker-compose.test.yml up -d` (exit 0, container `fivo-postgres-test` no ar) + `npx prisma migrate deploy` (exit 0).

- **Comando**: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json` (sem `| tail` no run de captura; exit codes coletados um a um)
- **Resultado no código como commitado (`c5b9f17`)**: `TSC_EXIT=0`, `ESLINT_EXIT=0`, **jest unit: 24 suites / 128 testes, todos passando** (`JEST_EXIT=0`), **jest e2e: 6 suites / 27 testes, todos passando** (`E2E_EXIT=0`)
- **Confronto com o alegado pelo autor**: o autor alegou **128 unit + 27 e2e**. Reproduzido **exatamente**: 128 e 27. Sem discrepância.
- **Resultado após o fix desta validação**: 128 unit + **28** e2e (+1 teste novo), `tsc` 0, `eslint` 0, `npm run build` exit 0
- **Testes pulados / removidos / enfraquecidos**: nenhum. `testPathIgnorePatterns` em `package.json:67` exclui `*.e2e-spec.ts` do run unit — correto e necessário (o `testRegex` unit `.*\.spec\.ts$` também casaria com os e2e, que exigem Postgres)
- **Falhas**: nenhuma

---

## Fix Plans

### GAP 1 — Roundtrip dos mappers de `Empresa`/`User` sem cobertura real (Major) — ✅ CORRIGIDO

- **Causa raiz**: o "Done when" de T17 diz "`create` → `findById` devolve entidade equivalente (`equals` + campos de valor)", mas `Entity.equals` (`src/core/types/entities/entity.ts:16-26`) **compara apenas o id**. Como todo roundtrip devolve a entidade com o mesmo id, `equals()` é sempre `true` e não discrimina nada. A garantia real dependia só das asserções de campo escritas à mão, que cobriam 12 das 21 colunas da `Empresa` e 8 das 10 do `Usuario`.
- **Impacto medido**: 10 de 14 mutações comportamentais sobreviveram. Colunas que podiam ser descartadas ou trocadas com a suíte 100% verde: `emailPendente` e `tokenTrocaEmailHash` (EMP-08 AC3 — troca de e-mail), `motivoDecisao` (EMP-04 AC3 — "motivo persistido"), `logoArquivoId` (EMP-03 — logo), `telefone`/`complemento`/`bairro`/`cidade` (EMP-08 AC1 — edição cadastral), `atualizadoEm` em ambas as tabelas. A troca `bairro`↔`cidade` (M12) é o caso mais ilustrativo: corrupção silenciosa de dado do cliente, suíte verde.
- **Por que importa agora**: a Fase 5 (T25/T27/T29) constrói os endpoints de edição cadastral, decisão de admin e troca de e-mail **em cima** destes mappers. Um mapper que perde campo só apareceria como bug de produção, não como falha de teste.
- **Fix aplicado**: ver "Post-validation fixes".

### GAP 2 — Autocadastro grava `User` e `Empresa` sem transação (Major) — ⚠️ ESCALADO, não corrigido

- **Causa raiz**: `criar-empresa.ts:150-151` faz `await this.userRepository.create(user)` e depois `await this.empresaRepository.create(empresa)` como dois writes independentes. Com repositórios in-memory (Fase 2) isso era inofensivo; com Postgres real, cada chamada é sua própria transação implícita e **commita sozinha**.
- **Cenário de falha**: dois cadastros concorrentes com o mesmo CNPJ e e-mails diferentes. Ambos passam pela checagem de unicidade (`criar-empresa.ts:84-87`), ambos gravam o `usuario` com sucesso, e o segundo leva `P2002` no `INSERT` da `empresa` → hoje isso vira um `EmpresaAlreadyExistsError` (409) correto para o cliente, **mas a linha `usuario` do segundo já está commitada e órfã**. Consequências: (a) o e-mail fica permanentemente ocupado por um usuário sem empresa; (b) numa nova tentativa, `findByEmail` devolve esse órfão e o fluxo cai em `UserAlreadyExistsError` (409) para sempre; (c) o branch de reaproveitamento (`criar-empresa.ts:88-95`) não salva a situação, porque exige uma `existingEmpresa` com status `REJEITADA` — que não existe. O usuário fica travado sem caminho de recuperação.
- **Por que isto cai nesta fase**: `design.md` §Risks registra explicitamente que "a garantia de concorrência baseada em CAS é adiada para T17/persistência Prisma", e `design.md` §Tech Decisions afirma "Autocadastro cria `User` + `Empresa` juntos — **uma operação, um `Either`**". A persistência real chegou em T17 sem fechar essa promessa.
- **Fix proposto (não aplicado)**: envolver os dois writes em um `prisma.$transaction`. Isso exige atravessar duas portas (`UserRepository` e `EmpresaRepository`) numa única unidade de trabalho, o que hoje a arquitetura não modela. As opções — (i) uma porta `UnitOfWork`/`Transactional` no domínio, (ii) um `CriarEmpresaTransacionalmente` no adaptador, (iii) um cleanup compensatório no caso de uso — são **decisões de design**, não conserto de código commitado.
- **Recomendação**: registrar como AD (decisão de arquitetura) em `STATE.md` e criar uma task dedicada antes de T25 (`POST /empresas`), que é onde o caminho fica exposto ao público. **Não é bloqueante para o restante da Fase 3**, mas é bloqueante para considerar EMP-01 AC1 realmente fechado.
- **Por que escalei em vez de corrigir**: meu mandato de Verifier cobre consertar o que foi commitado nesta fase, não introduzir uma abstração transacional nova que muda o contrato das portas do domínio.

### Finding 3 — Double in-memory divergiu do adaptador real (Minor)

- `InMemorySessaoRepository.revogarTodasDoUsuario` (`test/repositories/in-memory-sessao-repository.ts:39-49`) **não** filtra `revogadaEm: null`, então sobrescreve a data de sessões já revogadas; o `PrismaSessaoRepository` (`prisma-sessao-repository.ts:45`) filtra. O comportamento do Prisma é o correto. Divergência entre o double e o adaptador real significa que um teste unit poderia passar com uma semântica que a produção não tem.
- **Fix sugerido**: alinhar o in-memory ao Prisma (uma linha). Deixado para a fase que tocar nesse double, por ser test-only e sem AC dependente.

### Finding 4 — `new Date()` não injetado em `revogar`/`marcarUsado` (aceitável, não é GAP)

O autor sinalizou isto como desvio, e a instrução desta verificação pedia atenção especial ao ponto. **A premissa não se confirma**: os doubles in-memory fazem exatamente a mesma coisa — `in-memory-sessao-repository.ts:33` (`sessao.revogadaEm = new Date()`) e `in-memory-token-senha-repository.ts:24` (`tokenSenha.usadoEm = new Date()`). O adaptador Prisma não quebra nenhuma pureza que as portas in-memory mantivessem; a limitação está na **assinatura da porta** (`sessao-repository.ts:16`, `token-senha-repository.ts:13`), que não recebe "agora" — ao contrário de `deslizar(id, agora)`, que recebe e é corretamente repassado (`prisma-sessao-repository.ts:29-33`). Nenhum AC depende do valor exato dessas duas datas: os testes afirmam `toBeInstanceOf(Date)`, que é a asserção certa para um campo de relógio. **Aceitável como documentado**; reavaliar a assinatura da porta quando o clock injetável do `SessionService` chegar (T24), como o próprio autor anotou.

---

## Avaliação das 7 "Notas de qualidade" do autor

| # | Desvio documentado | Veredito |
| - | ------------------ | -------- |
| 1 | Mensagem do commit de T15 prefixada com "adiciona" por causa do `check_commit.py` | ✅ **Aceitável** — reproduzido: `check_commit.py --message "feat(api): PrismaService e DatabaseModule global"` → exit 1 ("description should start lowercase"); com "adiciona" → exit 0. Conteúdo preservado, gate determinístico respeitado |
| 2 | Prisma pinado em `6.19.3` exato | ✅ **Aceitável** — `npx prisma --version` confirma `prisma 6.19.3` / `@prisma/client 6.19.3`, versões casadas (divergir CLI/client é fonte clássica de bug). Evitar um RC (`8.0.0-rc`) em dependência de persistência é a escolha conservadora certa |
| 3 | `load-env.ts` + `testPathIgnorePatterns` fora do "Where" literal da task | ✅ **Aceitável** — ambos são necessários, não escopo extra. Sem `load-env.ts` (`test/helpers/load-env.ts:44-49`) o `PrismaService` sobe sem `DATABASE_URL`; sem `testPathIgnorePatterns` (`package.json:67`) o `npx jest` unit tentaria rodar os e2e sem Postgres. Ambos documentados |
| 4 | Reidratação de VO sem `Senha.reidratar()` | ✅ **Aceitável** — verifiquei que `Senha.create` (`senha.ts:17-23`) só valida comprimento e **não** re-hasheia (o hash é explícito em `senha.ts:29-32`). A reidratação é fiel; asserção com hash argon2 realista em `prisma-user-repository.e2e-spec.ts:58`. Não alterar o domínio por uma necessidade de infra foi a decisão certa sob AD-017 |
| 5 | P2002 → 409 traduzido no adaptador | ✅ **Aceitável e correto** — é exatamente o contrato de que a Fase 5 precisa; testado e resistente a mutação (M2). Ressalva de forma: o adaptador **lança** enquanto o caso de uso devolve `Either`, então o 409 dessa corrida específica chega no `DomainExceptionFilter` (T23) como exceção, não como `Left`. O filtro mapeia por `erro.status`, e ambas as classes carregam `status = 409` de instância (`empresa-already-exists.error.ts:4`), então o contrato fecha — **mas T23 precisa cobrir o caminho de exceção, não só o de `Left`** |
| 6 | Postgres em tmpfs, porta 5433 | ✅ **Aceitável** — descartável de verdade, sem colidir com um 5432 local. Consequência (rodar `migrate deploy` após cada restart) está documentada no cabeçalho de Gate Check Commands |
| 7 | `new Date()` em `revogar`/`marcarUsado` | ✅ **Aceitável** — ver Finding 4. A premissa de que isso quebra uma pureza que os in-memory mantinham **não se sustenta na evidência** |

Nenhum dos 7 desvios é GAP. Os dois GAPs reais desta fase (GAP 1 e GAP 2) **não** estavam entre os desvios auto-declarados pelo autor.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| EMP-01 | ⚠️ Needs Fix (fase 2; texto de mensagem corrigido no fim da fase 2) | ⚠️ **Needs Fix** — persistência e contrato 409 verificados; **AC1 não fecha** enquanto o autocadastro gravar `User`+`Empresa` sem transação (GAP 2) |
| EMP-02 | ✅ Verified | ✅ Verified — `cnpj @unique` + `Cnpj` VO roundtrip confirmados na persistência |
| EMP-03 | ✅ Verified | ✅ Verified na parte de persistência — `logoArquivoId` FK e roundtrip agora cobertos; upload/sniff continua em T22 |
| EMP-04 | ✅ Verified | ✅ Verified — fila (filtro+ordem, resistente a mutação), `motivoDecisao` persistido (agora coberto), auditoria append-only estruturalmente garantida |
| EMP-05 | ✅ Verified | ✅ Verified — transição de estado persiste `status`/`decididoPor`/`decididoEm`; auditoria sem update/delete |
| EMP-06 | ✅ Verified | ✅ Verified — `Sessao` roundtrip completo, `tokenHash @unique`, busca por hash |
| EMP-07 | ✅ Verified | ✅ Verified — contadores `falhasLogin`/`primeiraFalhaEm`/`bloqueadoAte` persistem e reidratam (`estaBloqueado` afirmado após roundtrip); `deslizar` preserva `criadaEm` |
| EMP-08 | ✅ Verified | ✅ Verified — `emailPendente`/`tokenTrocaEmailHash` e todos os campos de endereço agora com roundtrip coberto (eram o buraco de GAP 1) |
| EMP-09 | ✅ Verified | ✅ Verified — `TokenSenha` roundtrip + `marcarUsado`; `revogarTodasDoUsuario` isolado por usuário |
| EMP-10 | ✅ Verified | ✅ Verified — mesma máquina de estados persistida de EMP-05 |

---

## Summary

**Overall**: ⚠️ Issues — as 5 tasks estão implementadas, o schema corresponde campo a campo às entidades de domínio sem uma única divergência de tipo ou nullability, o contrato de unicidade 409 está fechado e testado, e a auditoria é append-only por construção. O gate reproduz exatamente o que o autor alegou. Foram encontrados **dois GAPs reais que o autor não declarou**: um buraco de cobertura nos mappers de `Empresa`/`User` (corrigido aqui) e a ausência de transação no autocadastro (escalado).

**Spec-anchored check**: 12/13 critérios de infra batem com o outcome definido pelo spec; 1 falha (atomicidade do autocadastro, GAP 2)
**Sensor**: rodada 1 — 4/14 mortas (❌ FAIL); rodada 2 pós-fix — **14/14 mortas** (✅ PASS)
**Gate**: 128 unit + 27 e2e no código commitado (idêntico ao alegado); 128 unit + 28 e2e após o fix; `tsc`, `eslint` e `build` limpos

**O que funciona**: schema derivado das entidades com zero drift entre migration e `schema.prisma`; `PrismaService` com ciclo de vida correto do Nest (sem o `beforeExit` removido no Prisma 5+); harness e2e descartável que sobe o `AppModule` inteiro e trunca por FK com `CASCADE`; 5 adaptadores simétricos que invertem a dependência pelas portas abstratas, com o domínio sem nenhum import de `@prisma/client`; tradução `P2002 → 409` cobrindo a corrida check-then-insert; `revogarTodasDoUsuario` isolado por usuário e preservando datas antigas; auditoria com um único método exposto, verificado por teste estrutural.

**Issues encontrados**:
1. **GAP 1 (Major, corrigido)** — `Entity.equals` compara só o id, então o bullet de roundtrip de T17 não discriminava nada; 10 colunas de `Empresa`/`Usuario` podiam ser perdidas ou trocadas com a suíte verde.
2. **GAP 2 (Major, escalado)** — `criar-empresa.ts:150-151` grava `User` e `Empresa` sem transação; uma corrida de CNPJ deixa um `usuario` órfão com o e-mail permanentemente ocupado e sem caminho de recuperação.
3. **Finding 3 (Minor)** — `InMemorySessaoRepository.revogarTodasDoUsuario` divergiu do adaptador Prisma (não filtra `revogadaEm: null`).
4. **Finding 4 (não é GAP)** — o `new Date()` não injetado espelha exatamente o que os doubles in-memory já faziam; limitação de assinatura de porta, não regressão.

**Next steps**: (1) tratar GAP 2 como decisão de arquitetura — registrar AD em `STATE.md` e criar uma task de unidade de trabalho transacional **antes de T25**; (2) garantir que T23 (`DomainExceptionFilter`) cubra o caminho de **exceção** dos erros de unicidade, não só o de `Left`; (3) alinhar o double in-memory de sessão quando a Fase 5 tocar nele; (4) manter o `REVOKE UPDATE, DELETE` em `registro_auditoria` na lista de follow-ups de infra.

---

## Post-validation fixes (2026-09-18, mesma sessão)

**GAP 1 corrigido** — reforço de cobertura de roundtrip, sem tocar em nenhum arquivo de produção:

- `test/database/prisma-empresa-repository.e2e-spec.ts:77-81` — o teste de roundtrip base passou a afirmar também `telefone`, `cep`, `logradouro`, `bairro` e `cidade`, fechando o buraco que permitia perder ou trocar campos de endereço (EMP-08 AC1).
- `test/database/prisma-empresa-repository.e2e-spec.ts:84-132` — **novo teste** `"roundtrip preserva os campos opcionais, de decisão e de troca de e-mail"`: cria uma `Empresa` com todos os campos opcionais preenchidos (inclusive uma linha `arquivo` real para satisfazer a FK do logo) e afirma individualmente `complemento`, `logoArquivoId`, `status: REJEITADA`, `decididoPor`, `decididoEm`, `motivoDecisao`, `emailPendente`, `tokenTrocaEmailHash` e `updatedAt`.
- `test/database/prisma-user-repository.e2e-spec.ts:90,106` — o teste de contadores de bloqueio passou a receber um `updatedAt` explícito e a afirmá-lo no roundtrip (sem o valor explícito a asserção seria vacuosa, já que nenhum método de `User` toca `updatedAt`).

Nenhuma asserção foi removida ou enfraquecida; nenhum código de produção foi alterado — as 10 mutações que sobreviviam eram buracos de **verificação**, não defeitos de implementação, e o código dos mappers já estava correto.

**Re-verificação (executada por mim)**: sensor re-rodado em worktree novo com as 10 mutações antes sobreviventes → **10/10 mortas**. Gate completo re-rodado na árvore real: `tsc` 0, `eslint` 0, `npx jest` **128/128**, `npx jest --config ./test/jest-e2e.json` **28/28**, `npm run build` exit 0. Worktrees descartados; `git worktree list` de volta só com a árvore principal.

**Veredito após o fix**: ⚠️ **PASS com 1 issue escalado** — T14–T18 estão verificadas e cobertas; GAP 2 (atomicidade do autocadastro) permanece aberto por exigir uma decisão de arquitetura fora do mandato do Verifier, e deve ser resolvido antes de T25.
