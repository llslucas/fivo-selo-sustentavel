# Cadastro e Autenticação de Empresa Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

> **Restrição de autoria (2026-09-07 → suspensa em 2026-09-14, ver AD-018):** a exigência de "código só por mãos humanas" desta feature foi suspensa. O assistente passa a implementar as tasks abertas (T4 em diante) normalmente — código + testes + gate + commit atômico por task, seguindo o Execution Protocol acima.

---

**Design**: `.specs/features/cadastro-empresa/design.md`
**Status**: Draft

> **Escopo desta rodada de tasks: apenas `api` (NestJS).** As telas do `web` (NextJS) são uma rodada separada. Arquitetura de **AD-017** (hexagonal completa, contexto único `src/domain/fivo/`), com **rich domain model**: as regras de negócio vivem nas entidades (`Empresa.aprovar()`, `User.registrarFalhaDeLogin()`) e em value objects que validam na construção (`Cnpj.create`, `Senha.criar`, `Arquivo.criar`). Nenhuma regra pura solta em `application/`; o use-case só orquestra (carrega → chama método/factory → persiste).
>
> **Ordem de valor (AD-017):** as Fases 1 e 2 fecham **toda a regra de negócio**, verificável só com repositórios em memória e fakes — não dependem de Docker, Prisma nem HTTP. As Fases 3–6 são a camada de infra e podem começar quando o grupo quiser.

---

## Test Coverage Matrix

> Gerada do codebase, guidelines do projeto e spec — confirmar antes do Execute.
> **Guidelines encontradas:** nenhuma (`AGENTS.md`, `CONTRIBUTING.md`, thresholds de coverage no `jest` — ausentes) → **strong defaults aplicados**.
> **Amostras existentes:** `api/src/core/either.spec.ts` e `api/src/domain/fivo/application/use-cases/*.spec.ts` (unit, co-locado `*.spec.ts`, `ts-jest`, com `InMemory*Repository` + `FakeHasher`/`FakeEncrypter` + `*Factory` em `api/test/`). `api/test/jest-e2e.json` está configurado (`*.e2e-spec.ts`) mas **não há nenhum teste e2e nem camada HTTP ainda**.
> **Estratégia:** regra de negócio (métodos de entidade + VOs + casos de uso) coberta 1:1 com os ACs em unit, com os test doubles das portas; a partir da Fase 3, e2e HTTP contra Postgres descartável em Docker (sem Testcontainers).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Regra de negócio em entidades e value objects — `Cnpj.create`, `Senha.criar`, `Empresa.aprovar/rejeitar/suspender/reativar`, `User.registrarFalhaDeLogin`/`estaBloqueado`/`registrarLoginOk`, `Arquivo.criar` | unit | Todas as ramificações; 1:1 com os ACs; todo edge case listado tem teste | `src/domain/fivo/entities/*.spec.ts` | `cd api && npx jest` |
| Casos de uso — `src/domain/fivo/application/use-cases/**` | unit | Todas as ramificações; happy + cada erro + cada edge case; com `InMemory*Repository` + fakes | `src/domain/fivo/application/use-cases/*.spec.ts` | `cd api && npx jest` |
| Entidades sem regra (só dados/getters), portas (`application/ports/**`), erros (`application/errors/**`) | none | build gate (`tsc --noEmit` + `eslint`) apenas | — | build gate |
| Adaptadores de infra sem I/O de rede/DB — `Argon2Hasher`, gerador de token, `LogMailer`, `LocalDiskStorage` | unit | Roundtrip + ramo de falha; diretório temporário no `afterEach` | `src/infra/**/*.spec.ts` | `cd api && npx jest` |
| Adaptadores Prisma dos repositórios + mappers domínio↔row | e2e | Roundtrip contra Postgres de teste: `create` → `findBy*` devolve entidade equivalente; ramo de erro (violação de unicidade) | `test/**/*.e2e-spec.ts` | `cd api && npx jest --config ./test/jest-e2e.json` |
| Controllers, guards, filter, pipe — `src/infra/http/**`, `src/infra/auth/**` | e2e | Toda rota em escopo: happy + cada edge case listado + caminhos de erro (401/403/409/422/429/503) | `test/**/*.e2e-spec.ts` | `cd api && npx jest --config ./test/jest-e2e.json` |
| Schema Prisma, migrations, módulos Nest, `PrismaService`, `main.ts` | none | build gate apenas | — | build gate |

## Gate Check Commands

> Gerada do codebase — confirmar antes do Execute.
> **Pré-requisito dos gates `full` e `build` a partir da Fase 3:** Postgres de teste no ar e migrado —
> `cd api && docker compose -f docker-compose.test.yml up -d && npx prisma migrate deploy`

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Após tasks só com unit (Fases 1, 2 e adaptadores unit da Fase 4) | `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest` |
| Full | Após tasks com e2e | `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json` |
| Build | Após conclusão de fase, ou tasks só de config/schema/entidade | `cd api && npm run build && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json` |

> **Avisos de processo:** (1) nunca `cmd | tail` nos gates — mascara o exit code. (2) `npx jest` sozinho não faz type-check — o `tsc --noEmit` e o `eslint` fazem parte de todo gate, inclusive o `quick`.

---

## Execution Plan

Fases são ordenadas e rodam em sequência — cada fase completa antes da próxima, e as tasks dentro de uma fase executam em ordem. Cada bloco lista as arestas de dependência cujo alvo está naquela fase (`origem → alvo`).

### Phase 1: Regras de negócio no domínio (entidades + VOs)

Ordem: T1 … T7. Só T4 depende de outra task da fase (T2). O resto é isolado; cada um precisa só do kernel `src/core/` (já existe).

```
T2 → T4
```

### Phase 2: Casos de uso

Ordem: T8 … T13.

```
T3 → T8
T4 → T8
T5 → T8
T6 → T8
T7 → T8
T4 → T9
T6 → T9
T7 → T9
T3 → T10
T6 → T10
T7 → T10
T3 → T11
T6 → T11
T7 → T11
T3 → T12
T5 → T12
T7 → T12
T8 → T12
T2 → T13
T4 → T13
T7 → T13
T9 → T13
```

### Phase 3: Persistência (Prisma / PostgreSQL)

Ordem: T14 … T18, T33.

```
T3 → T14
T4 → T14
T5 → T14
T14 → T15
T15 → T16
T15 → T17
T16 → T17
T8 → T17
T9 → T17
T15 → T18
T16 → T18
T7 → T18
T8 → T33
T17 → T33
```

### Phase 4: Adaptadores de criptografia, e-mail e storage

Ordem: T19 … T22.

```
T15 → T19
T15 → T20
T15 → T21
T5 → T22
T21 → T22
T17 → T22
```

### Phase 5: HTTP, autenticação e sessão

Ordem: T23 … T29.

```
T6 → T23
T16 → T23
T18 → T24
T19 → T24
T23 → T24
T8 → T25
T20 → T25
T22 → T25
T24 → T25
T33 → T25
T9 → T26
T24 → T26
T10 → T27
T11 → T27
T24 → T27
T22 → T28
T24 → T28
T12 → T29
T13 → T29
T25 → T29
T26 → T29
```

### Phase 6: Edge cases e robustez

Ordem: T30 … T32.

```
T25 → T30
T27 → T30
T28 → T30
T25 → T31
T27 → T31
T28 → T32
```

---

## Task Breakdown

### T1: Testes unit do value object `Cnpj`

**What**: Adicionar `cnpj.spec.ts` co-locado cobrindo cada ramo de `Cnpj.create` 1:1 com EMP-02 AC2. O VO já existe e está correto; falta a rede de segurança.
**Where**: `api/src/domain/fivo/entities/cnpj.spec.ts`
**Depends on**: None
**Reuses**: `Cnpj` (`entities/cnpj.ts`), `Either`
**Requirement**: EMP-02

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `create` aceita CNPJ válido com máscara (`12.345.678/0001-95`) e sem máscara e normaliza para 14 dígitos
- [x] Rejeita com `InvalidCnpjError` (`status` 422, mensagem "CNPJ inválido"): < 14 dígitos, > 14 dígitos, DV incorreto, string vazia, string não-numérica
- [x] Um caso confirma que `Left` não expõe um `Cnpj`
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest`
- [x] Test count: ≥ 7 testes passam

**Tests**: unit
**Gate**: quick

**Commit**: `test(domain): cobre o value object Cnpj 1:1 com EMP-02`

---

### T2: Value object `Senha`

**What**: `Senha.create(raw: string): Either<SenhaFracaError, Senha>` — regra: mínimo 10 caracteres (a spec não pede mais). `get valor(): string`. `SenhaFracaError` (`status` 422, mensagem "A senha deve ter no mínimo 10 caracteres"). Mesmo padrão do `Cnpj`. **A senha em texto claro nunca sai do VO** — o hash é responsabilidade do `Hasher` na fase de infra; o VO carrega o texto validado só até o caso de uso passar ao `Hasher`.

> **Drift (2026-09-14, pós-commit):** o plano acima ("hash na fase de infra") foi superado — `Senha` ganhou `hash(hasher: Hasher): Promise<Senha>`, imutável, construído via o construtor privado (não `create()`, para não reavaliar `MIN_LENGTH` contra o hash). Ver nota completa em `design.md` §Entities → `Senha`.
**Where**: `api/src/domain/fivo/entities/senha.ts`
**Depends on**: None
**Reuses**: `ValueObject`, `Either`, contrato de erro
**Requirement**: EMP-02

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `< 10` caracteres → `Left(SenhaFracaError)`; `>= 10` → `Right(Senha)`
- [x] `SenhaFracaError` em `application/errors/senha-fraca.error.ts`
- [x] Testes unit co-locados: 9, 10, 11 caracteres e string vazia
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest`
- [x] Test count: ≥ 4 testes passam

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): value object Senha com política mínima`

---

### T3: Entidade `Empresa` — modelo e máquina de estados

**What**: Ajustar `EmpresaProps` — `numero: string` (era `number`); adicionar `usuarioId: UniqueEntityId`, `logoArquivoId?: UniqueEntityId | null`, `emailPendente?: string | null`, `tokenTrocaEmailHash?: string | null`; **remover** `email` (o e-mail de login mora no `User`). **Remover os setters públicos** (`set status`, `set decidido_por`, etc.) e adicionar os métodos de transição: `aprovar(adminId): Either<TransicaoInvalidaError, void>`, `rejeitar(adminId, motivo): Either<...>` (exige `motivo.length >= 20` → `MotivoInsuficienteError` 422), `suspender(adminId): Either<...>`, `reativar(adminId): Either<...>`. Conjunto permitido: `PENDENTE_APROVACAO`→`APROVADA`, `PENDENTE_APROVACAO`→`REJEITADA`, `APROVADA`→`SUSPENSA`, `SUSPENSA`→`APROVADA`; qualquer outra → `Left(TransicaoInvalidaError)` (`status` 409). Cada método aplica `status` + `decididoPor` + `decididoEm` (+ `motivoDecisao` no rejeitar). Método de consulta `estaAprovada(): boolean`. Ajustar `EmpresaFactory`.
**Where**: `api/src/domain/fivo/entities/empresa.ts`
**Depends on**: None
**Reuses**: `Entity`, `Optional`, `Cnpj`, `Either`, `EmpresaFactory` (`test/factories/empresa-factory.ts`)
**Requirement**: EMP-01, EMP-05, EMP-08, EMP-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `EmpresaProps` reflete a lista acima; `numero: string`; sem `email`; sem setter público de campo governado por transição
- [x] `aprovar` só de `PENDENTE_APROVACAO`; `rejeitar` só de `PENDENTE_APROVACAO` e com `motivo >= 20` (senão 422); `suspender` só de `APROVADA`; `reativar` só de `SUSPENSA`
- [x] Toda transição fora do conjunto (incl. auto-transição, `REJEITADA`→qualquer) → `Left(TransicaoInvalidaError)` 409
- [x] Transição válida seta `status` + `decididoPor` + `decididoEm` (+ `motivoDecisao`)
- [x] `estaAprovada()` → `true` só em `APROVADA`
- [x] `empresa.spec.ts` cobre 1:1 EMP-05 AC5 (todas as transições) + o caso do motivo curto
- [x] `EmpresaFactory` atualizada (inclui `usuarioId`; permite `status` inicial)
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest`
- [x] Test count: ≥ 12 testes passam

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): máquina de estados e modelo da entidade Empresa`

---

### T4: Entidade `User` — `Senha`, contadores e bloqueio de login

**What**: `UserProps.senha` passa a ser `Senha` (VO, T2), não `string`; `User.create` recebe `Senha`. Adicionar `falhasLogin: number`, `primeiraFalhaEm: Date | null`, `bloqueadoAte: Date | null` (default 0/null). Adicionar os métodos de bloqueio: `registrarFalhaDeLogin(agora: Date): void` (reinicia a janela se a 1ª falha tem > 15 min; na 5ª dentro da janela seta `bloqueadoAte = agora + 15min`), `estaBloqueado(agora: Date): boolean`, `registrarLoginOk(): void` (zera os três). O "agora" **entra como parâmetro** — o método continua puro. Ajustar `UserFactory`.
**Where**: `api/src/domain/fivo/entities/user.ts`
**Depends on**: T2
**Reuses**: `Senha` (T2), `Entity`, `Optional`, `UserFactory` (`test/factories/user-factory.ts`)
**Requirement**: EMP-02, EMP-07

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `User.create` aceita `Senha` e assume `falhasLogin: 0`, timestamps `null` — `src/domain/fivo/entities/user.ts:32-50`
- [x] 4 falhas não bloqueiam; a 5ª dentro de 15 min bloqueia; `estaBloqueado` → `true` enquanto `agora < bloqueadoAte`, `false` depois — fixado (validation-fase1.md Fix 3): `estaBloqueado` (`user.ts:115-121`) agora compara `agora.getTime() < bloqueadoAte.getTime()`; teste de fronteira em `user.spec.ts` ("should return false the instant bloqueadoAte has just passed" / "should return true the instant before bloqueadoAte")
- [x] `registrarFalhaDeLogin` reinicia a janela quando a 1ª falha tem > 15 min — `src/domain/fivo/entities/user.ts:98-106`, testado em `user.spec.ts:52-64`
- [x] `registrarLoginOk` zera os três campos — fixado (validation-fase1.md Fix 5): renomeado `registrarLoginSucesso` → `registrarLoginOk` (`user.ts:123-127`), alinhado a `design.md:269` e ao futuro T9; testado em `user.spec.ts`
- [x] `user.spec.ts` cobre 1:1 EMP-07 AC3 — `src/domain/fivo/entities/user.spec.ts`
- [x] `UserFactory` atualizada (aceita `Senha` ou string convertida) — fixado (validation-fase1.md Fix 4): `test/factories/user-factory.ts` aceita `senha?: Senha | string`
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest` — confirmado (80/80 testes, tsc e eslint limpos)
- [x] Test count: ≥ 6 testes passam — 10 testes em `user.spec.ts`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): Senha, contadores e bloqueio de login na entidade User`

---

### T5: Entidade `Arquivo` — factory validante

**What**: Entidade `Arquivo` com `static criar(input): Either<ArquivoInvalidoError, Arquivo>`. `input`: `{ tipo: TipoArquivo; nomeOriginal: string; mime: string; bytes: number; largura?: number; altura?: number; chaveStorage: string; svgConteudo?: string }`. Regras dentro do factory: formatos aceitos **por `tipo`** (`LOGO_EMPRESA` → `image/png`, `image/jpeg`, `image/svg+xml`); ≤ 5 MB; para raster, ≥ 512×512; se `mime === 'image/svg+xml'`, `svgConteudo` obrigatório e rejeitado se contiver `<script>`, `<foreignObject>` ou atributo `on*`. Mensagem do `Left` cita o limite violado. Enum `TipoArquivo` (`LOGO_EMPRESA` e placeholders comentados para as outras features). Getters para os campos.
**Where**: `api/src/domain/fivo/entities/arquivo.ts`
**Depends on**: None
**Reuses**: `Entity`, `Either`, contrato de erro
**Requirement**: EMP-03

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `LOGO_EMPRESA` com PNG/JPG/SVG válido, ≤ 5 MB, raster ≥ 512×512 → `Right(Arquivo)` — `src/domain/fivo/entities/arquivo.ts:35-104`, `arquivo.spec.ts:4-54`
- [x] MIME fora da lista do `tipo` → `Left` citando "formato"; `> 5 MB` → `Left` citando "tamanho"; raster `< 512` → `Left` citando "dimensão" — `arquivo.spec.ts:56-108` (`toContain('formato'|'tamanho'|'dimensão')`)
- [x] SVG sem `svgConteudo` → `Left`; SVG com `<script>`/`<foreignObject>`/`onload=` → `Left`; SVG limpo → `Right` — `arquivo.spec.ts:110-190`
- [x] `ArquivoInvalidoError` (`status` 422) em `application/errors/` — `application/errors/arquivo-invalido-error.ts:3-4`
- [x] `arquivo.spec.ts` cobre 1:1 EMP-03 AC5/AC6 + os vetores de SVG — 11 casos cobrindo formato/tamanho/dimensão/svg
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest` — confirmado
- [x] Test count: ≥ 10 testes passam — 11 testes em `arquivo.spec.ts`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): entidade Arquivo com factory validante por tipo`

---

### T6: Contrato uniforme de erro de aplicação

**What**: Padronizar todas as classes em `application/errors/` para carregar `readonly status: number` **de instância** e mensagem em pt-BR. Corrigir `CredenciaisInvalidasError` (hoje `static readonly status`) → renomear para `CredenciaisInvalidasError`, `status` 401, mensagem "Credenciais inválidas". Manter `core/errors/NotAllowedError` e `ResourceNotFoundError` genéricos (a mensagem pt-BR final é montada no caso de uso ou no filtro). Documentar o contrato num comentário no barrel de erros.
**Where**: `api/src/domain/fivo/application/errors/`
**Depends on**: None
**Reuses**: `UseCaseError` (`core/types/use-case-error.ts`)
**Requirement**: EMP-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Toda classe de erro de `application/errors/` tem `readonly status: number` de instância (nenhuma `static`) — confirmado nas 11 classes de `application/errors/*.ts`
- [x] `CredenciaisInvalidasError` substitui `CredenciaisInvalidasError`; nenhum import órfão — `application/errors/wrong-credentials.error.ts:3` (status 401, instância); `grep` não encontra nome antigo órfão. Nota de qualidade: o arquivo continua se chamando `wrong-credentials.error.ts` (não renomeado para bater com a classe)
- [x] `InvalidCnpjError`, `EmpresaAlreadyExistsError`, `UserAlreadyExistsError` com mensagens pt-BR revisadas — mensagens em pt-BR confirmadas
- [x] `npx tsc -p tsconfig.json --noEmit` e `npx eslint` limpos; nenhum `*.spec.ts` existente quebra — confirmado (78/78 passam)
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest` — confirmado

> **Gap corrigido (validation-fase1.md Fix 2):** `EmpresaAlreadyExistsError` e `UserAlreadyExistsError` estavam com `status = 422`; corrigido para `409` (EMP-01 AC3), com teste dedicado em `already-exists.errors.spec.ts`. `TransicaoInvalidaError` (de T3) também estava com `status = 422`; corrigido para `409` (EMP-05 AC5), com teste dedicado em `empresa.spec.ts`.

**Tests**: none
**Gate**: quick

**Commit**: `refactor(domain): contrato uniforme de erro de aplicação (status de instância, pt-BR)`

---

### T7: Novas portas de domínio e seus test doubles

**What**: Declarar as `abstract class` que faltam em `application/ports/` — `SessaoRepository`, `RegistroAuditoriaRepository` (append-only: só `registrar`), `TokenSenhaRepository`, `Mailer` (+ enum `TemplateEmail`), `Storage` (+ `StorageIndisponivelError`) — e os test doubles correspondentes em `api/test/` (`InMemorySessaoRepository`, `InMemoryRegistroAuditoriaRepository`, `InMemoryTokenSenhaRepository`, `FakeMailer` que registra as mensagens, `FakeStorage` com modo de falha sob demanda). Adicionar `EmpresaRepository.listarPorEstado(estado, ordem)`; `UserRepository` já tem `findByEmail`.
**Where**: `api/src/domain/fivo/application/ports/`
**Depends on**: None
**Reuses**: padrão de `InMemoryEmpresaRepository`, `FakeHasher`, `FakeEncrypter`
**Requirement**: EMP-01, EMP-04, EMP-05, EMP-07, EMP-09

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] As 5 portas novas existem como `abstract class` sem dependência de infra (ESLint de `src/domain/**` passa) — fixado (validation-fase1.md Fix 1): `SessaoRepository`, `TokenSenhaRepository`, `Mailer` (+ `TemplateEmail`) e `Storage` renomeados para bater com `design.md:239-243/365-367` (`criar/buscarPorTokenHash/deslizar/revogar/revogarTodasDoUsuario`; `criar/buscarPorHash/marcarUsado`; `Mailer.enviar`; `Storage.salvar/ler/remover`; `TemplateEmail` com os 5 valores de T20). `registro-auditoria-repository.ts` já batia, sem alteração.
- [x] `EmpresaRepository.listarPorEstado` declarada — `application/ports/database/empresa-repository.ts:8-11`
- [x] Cada porta tem um test double em `api/test/` seguindo o padrão dos existentes — `InMemorySessaoRepository`, `InMemoryRegistroAuditoriaRepository`, `InMemoryTokenSenhaRepository`, `FakeMailer`, `FakeStorage` (atualizados junto com as portas)
- [x] `FakeStorage` permite forçar `StorageIndisponivelError`; `FakeMailer` permite inspecionar e forçar falha — `test/cryptography/fake-storage.ts`, `test/cryptography/fake-mailer.ts`
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest` — confirmado

**Tests**: none
**Gate**: quick

**Commit**: `feat(domain): portas de sessão, auditoria, token de senha, mail e storage`

---

### T8: Retrabalho de `CriarEmpresaUseCase`

**What**: Reescrever o caso de uso para atender EMP-01/EMP-02 na ordem: (1) `Senha.criar(senha)` → `Left` 422; (2) `Cnpj.create` **antes de qualquer consulta**; (3) se veio logo, o `ArquivoService` (fase de infra) já entrega um `Arquivo` válido — aqui o caso de uso só recebe o `arquivoId` opcional; (4) unicidade — `UserRepository.findByEmail` e `EmpresaRepository.findByCnpj`; se o único registro com o CNPJ está `REJEITADA`, reaproveitar voltando a `PENDENTE_APROVACAO`, senão `EmpresaAlreadyExistsError`/`UserAlreadyExistsError` (409); (5) criar `User` (papel `EMPRESA`, `Senha` VO) **e** `Empresa` (`PENDENTE_APROVACAO`, `usuarioId`, `logoArquivoId?`) juntos; (6) `Mailer.enviar(CADASTRO_RECEBIDO)` em `try/catch` — falha vira log, resposta segue (EMP-01 AC9); (7) `right({ empresaId })`.
**Where**: `api/src/domain/fivo/application/use-cases/criar-empresa.ts`
**Depends on**: T3, T4, T5, T6, T7
**Reuses**: `Cnpj`, `Senha` (T2), `Empresa` (T3), `User` (T4), `Arquivo` (T5), `Hasher`, `UserRepository`, `EmpresaRepository`, `Mailer` (T7)
**Requirement**: EMP-01, EMP-02, EMP-03

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Dados válidos → `right({ empresaId })`, `User` (EMPRESA) + `Empresa` (`PENDENTE_APROVACAO`) no repositório, senha só como hash do `FakeHasher` — `criar-empresa.ts:73-152`, `criar-empresa.spec.ts:60-81`
- [x] Senha < 10 → `Left` 422; CNPJ inválido → `Left` 422 e **nada** persistido nem consultado antes — `criar-empresa.ts:73-83`, `criar-empresa.spec.ts:83-117`
- [x] E-mail ou CNPJ já usados → `Left` 409; CNPJ cujo único registro é `REJEITADA` → reaproveita → `PENDENTE_APROVACAO` — `criar-empresa.ts:85-121`, `criar-empresa.spec.ts:119-187`
- [x] `FakeMailer` em falha → ainda `right` + mensagem registrada como pendente/log (EMP-01 AC9) — `criar-empresa.ts:154-164`, `criar-empresa.spec.ts:191-213`
- [x] `criar-empresa.spec.ts` cobre cada linha acima 1:1 com os ACs — 9 testes, ver Test Adequacy Review do chat
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest` — confirmado (91/91)
- [x] Test count: ≥ 9 testes passam — 9 testes em `criar-empresa.spec.ts`

**Nota de qualidade — resolvida (2026-09-18, pós-validação da Fase 2)**: a divergência de mensagem apontada acima foi corrigida. `UserAlreadyExistsError`/`EmpresaAlreadyExistsError` agora usam o texto exato "CNPJ ou e-mail já cadastrado" (perderam o parâmetro de construtor, que só servia para interpolar a mensagem antiga); `criar-empresa.spec.ts` passou a asserir `.message` nos dois testes 409. Ver `validation-fase2.md` (Fix 1).

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): autocadastro de empresa completo (usuário + perfil + logo + e-mail)`

---

### T9: Retrabalho de `AutenticarUsuarioUseCase`

**What**: Renomear `AuthenticateUserUseCase` → `AutenticarUsuarioUseCase` e reescrever: (1) `UserRepository.findByEmail(email.toLowerCase())` — inexistente → `Left(CredenciaisInvalidasError)` 401 sem revelar o campo; (2) `user.estaBloqueado(agora)` → `Left(ContaBloqueadaError)` 429; (3) `Hasher.compare` falha → `user.registrarFalhaDeLogin(agora)` + `UserRepository.save` + `Left` 401; (4) sucesso → `user.registrarLoginOk()` + `save` + `SessaoRepository.criar` (token opaco, guarda só o `sha256`) → `right({ token, papel })`. **Remover a porta `Encrypter` deste fluxo** (AD-012 — sessão opaca, não JWT). `agora: Date` vem por parâmetro/injeção de clock.
**Where**: `api/src/domain/fivo/application/use-cases/autenticar-usuario.ts`
**Depends on**: T4, T6, T7
**Reuses**: `User` (T4), `CredenciaisInvalidasError` (T6), `SessaoRepository` (T7), `Hasher`, `UserRepository`
**Requirement**: EMP-06, EMP-07

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] E-mail inexistente e senha errada → ambos `Left` 401 "Credenciais inválidas" (indistinguíveis) — `autenticar-usuario.ts:36-53`, `autenticar-usuario.spec.ts:46-76`
- [x] 5 falhas na mesma conta → `Left` 429 nas seguintes; sucesso zera os contadores — `autenticar-usuario.ts:44-58`, `autenticar-usuario.spec.ts:78-132`
- [x] Sucesso → `right({ token, papel })`, uma linha em `InMemorySessaoRepository` com o `sha256` do token (nunca o token cru) — `autenticar-usuario.ts:57-68`, `autenticar-usuario.spec.ts:134-171`
- [x] `Encrypter` não é mais importado por este arquivo — confirmado via grep, sem ocorrências
- [x] `autenticar-usuario.spec.ts` cobre EMP-06 AC1/AC2 e EMP-07 AC3 — ver Test Adequacy Review do chat
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest` — confirmado (96/96)
- [x] Test count: ≥ 6 testes passam — 6 testes em `autenticar-usuario.spec.ts`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): autenticação com sessão opaca e bloqueio por tentativas`

---

### T10: Aprovação e rejeição pelo administrador + fila

**What**: Reescrever `AprovarEmpresaUseCase` e `RejeitarEmpresaUseCase` para **retornar `Either`** (não `throw`) e delegar a regra à entidade: (1) `user.role !== ADMIN` → `Left(NotAllowedError)` 403; (2) `findById` ausente → `Left(ResourceNotFoundError)` 404; (3) `empresa.aprovar(user.id)` / `empresa.rejeitar(user.id, motivo)` → propaga o `Left` (409 transição, 422 motivo curto); (4) `EmpresaRepository.save` + `RegistroAuditoriaRepository.registrar` na mesma unidade; (5) `Mailer.enviar` em `try/catch`. Adicionar `ListarFilaAprovacaoUseCase` — `EmpresaRepository.listarPorEstado(PENDENTE_APROVACAO, asc)` projetando `{ id, razaoSocial, cnpj, email, createdAt }` (EMP-04 AC1).
**Where**: `api/src/domain/fivo/application/use-cases/`
**Depends on**: T3, T6, T7
**Reuses**: métodos `empresa.aprovar/rejeitar` (T3), `RegistroAuditoriaRepository`/`Mailer` (T7), `NotAllowedError`/`ResourceNotFoundError` (core)
**Requirement**: EMP-04, EMP-05

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Não-admin → `Left` 403, nenhum estado alterado, nenhuma linha de auditoria — `aprovar-empresa.ts:30-32`, `rejeitar-empresa.ts:36-38`; `aprovar-empresa.spec.ts:47-64`, `rejeitar-empresa.spec.ts:54-74`
- [x] Aprovar `PENDENTE_APROVACAO` → `APROVADA` + `decididoPor`/`decididoEm` + 1 linha de auditoria + `Mailer(CADASTRO_APROVADO)` — `aprovar-empresa.ts:40-73`, `aprovar-empresa.spec.ts:83-118`
- [x] Rejeitar com motivo < 20 → `Left` 422; com motivo ok → `REJEITADA` + `motivoDecisao` + auditoria + `Mailer(CADASTRO_REJEITADO)` com o motivo — `rejeitar-empresa.ts:46-83`, `rejeitar-empresa.spec.ts:87-147`
- [x] Transição fora do conjunto (ex.: aprovar uma já `APROVADA`) → `Left` 409 — `aprovar-empresa.spec.ts:120-135`, `rejeitar-empresa.spec.ts:149-170`
- [x] `Mailer` em falha → operação ainda conclui (`right`) — `aprovar-empresa.spec.ts:137-151`, `rejeitar-empresa.spec.ts` ("should still return right and reject the empresa when the Mailer fails", adicionado na validação da Fase 2)
- [x] `ListarFilaAprovacaoUseCase` devolve só `PENDENTE_APROVACAO` ordenadas asc com a projeção — `listar-fila-aprovacao.ts`, `listar-fila-aprovacao.spec.ts:66-83`
- [x] Specs co-locadas cobrem EMP-04 AC1/AC2/AC3, EMP-05 AC6/AC7 e o Independent Test da história — ver Test Adequacy Review do chat
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest` — confirmado (101/101; 128/128 após os fixes pós-validação da Fase 2)
- [x] Test count: ≥ 11 testes passam — 11 testes (5 `aprovar-empresa.spec.ts` + 5 `rejeitar-empresa.spec.ts` + 1 `listar-fila-aprovacao.spec.ts`); 12 após o fix pós-validação (`rejeitar-empresa.spec.ts` ganhou 1 teste)

**Nota de qualidade**: `InMemoryEmpresaRepository.listarPorEstado` (T7) tinha um bug pré-existente — filtrava por `item.uf` em vez de `item.status`, e ordenava por `nomeFantasia` em vez de `createdAt` (confusão entre os dois sentidos de "estado" em português: UF vs. status da máquina de estados; confirmado contra `paginas-publicas/spec.md` PUB-03 AC1, que também usa `listarPorEstado` com o sentido de status). Corrigido em `test/repositories/in-memory-empresa-repository.ts:20-33` como parte deste task, pois bloqueava `ListarFilaAprovacaoUseCase`; fora do "Where" literal do task mas necessário para a funcionalidade.

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): fila, aprovação e rejeição de empresa com auditoria`

---

### T11: Suspensão e reativação pelo administrador

**What**: Reescrever `SuspenderEmpresaUseCase` (→ `Either`, via `empresa.suspender(user.id)`) e adicionar `ReativarEmpresaUseCase` (`empresa.reativar(user.id)`). Ambos: guard de `ADMIN` (403), `findById` (404), propagar o `Left` da entidade (409), `save` + auditoria, e-mail opcional. Adicionar `AssegurarEmpresaAprovadaUseCase` (ou função de aplicação) que carrega a empresa e devolve `Either<NotAllowedError, void>` via `empresa.estaAprovada()` — 403 "Cadastro ainda não aprovado", a ser reusado por `campanhas`/`selo-e-qrcode` (EMP-05 AC4).
**Where**: `api/src/domain/fivo/application/use-cases/`
**Depends on**: T3, T6, T7
**Reuses**: métodos `empresa.suspender/reativar/estaAprovada` (T3), `RegistroAuditoriaRepository` (T7), `NotAllowedError`
**Requirement**: EMP-10, EMP-05

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Suspender `APROVADA` → `SUSPENSA` + auditoria; reativar `SUSPENSA` → `APROVADA` + auditoria — `suspender-empresa.ts`, `reativar-empresa.ts`; specs `:15-36`
- [x] Suspender uma `PENDENTE_APROVACAO`/`REJEITADA` → `Left` 409; reativar uma não-`SUSPENSA` → `Left` 409 — `suspender-empresa.spec.ts:38-53`, `reativar-empresa.spec.ts:38-53`
- [x] Não-admin → `Left` 403 — `suspender-empresa.spec.ts:55-64`, `reativar-empresa.spec.ts:55-64`
- [x] `AssegurarEmpresaAprovada` → `Right` só para `APROVADA`; `Left` 403 "Cadastro ainda não aprovado" para `PENDENTE_APROVACAO`, `REJEITADA` e `SUSPENSA` — `assegurar-empresa-aprovada.ts`, `assegurar-empresa-aprovada.spec.ts:15-40` (`it.each`)
- [x] Specs co-locadas cobrem EMP-10 AC1–AC3 (parte de dados), EMP-05 AC4 e o Independent Test — ver Test Adequacy Review do chat
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest` — confirmado (111/111)
- [x] Test count: ≥ 8 testes passam — 13 testes (4 `suspender-empresa.spec.ts` + 4 `reativar-empresa.spec.ts` + 5 `assegurar-empresa-aprovada.spec.ts`)

**Nota de qualidade**: `NotAllowedError` (core, `src/core/errors/not-allowed-error.ts`) ganhou um parâmetro `message` opcional (default `'Not allowed'`), para permitir a mensagem exata "Cadastro ainda não aprovado" sem criar uma classe nova — mudança aditiva, retrocompatível com todos os chamadores existentes (confirmado: nenhum teste depende do texto fixo anterior). Nenhum template de e-mail existe para suspensão/reativação (`TemplateEmail` não tem esse valor); `Mailer` não foi acionado nesses dois casos de uso, conforme "e-mail opcional" do enunciado.

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): suspensão, reativação e gate de empresa aprovada`

---

### T12: `EditarDadosEmpresaUseCase` (P2)

**What**: Novo caso de uso para EMP-08: altera nome fantasia, telefone, endereço e logo (`logoArquivoId`) de uma empresa autenticada; bloqueia `cnpj` → `Left` 422 "CNPJ não pode ser alterado; solicite ao suporte"; troca de e-mail grava `emailPendente` + `tokenTrocaEmailHash` na entidade e mantém o atual até confirmação (endpoint em T29); logo novo é um `Arquivo` já validado pelo `ArquivoService` — o caso de uso só troca o `logoArquivoId` e não toca arquivos antigos (selos gerados ficam intactos).
**Where**: `api/src/domain/fivo/application/use-cases/editar-dados-empresa.ts`
**Depends on**: T3, T5, T7, T8
**Reuses**: `Empresa` (T3), `Arquivo` (T5), `Storage`/`Mailer` (T7), `EmpresaRepository`
**Requirement**: EMP-08

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Alterar nome fantasia/telefone/endereço/`logoArquivoId` → persistido no repositório — `editar-dados-empresa.ts:82-114`, `editar-dados-empresa.spec.ts:21-51`
- [x] Tentar alterar `cnpj` → `Left` 422 com a mensagem exata — `editar-dados-empresa.ts:65-71`, `editar-dados-empresa.spec.ts:74-96`
- [x] Trocar e-mail → `emailPendente` setado, e-mail de login inalterado, `Mailer(EMAIL_CONFIRMACAO)` chamado — `editar-dados-empresa.ts:73-81,118-131`, `editar-dados-empresa.spec.ts:112-135` (e-mail de login inalterado é estrutural: este caso de uso não depende de `UserRepository`)
- [x] `editar-dados-empresa.spec.ts` cobre EMP-08 AC1–AC5 e o Independent Test — ver Test Adequacy Review do chat
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest` — confirmado (118/118)
- [x] Test count: ≥ 6 testes passam — 7 testes em `editar-dados-empresa.spec.ts`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): edição de dados cadastrais da empresa`

---

### T13: `SolicitarRecuperacaoSenhaUseCase` + `RedefinirSenhaUseCase` (P2)

**What**: Dois casos de uso para EMP-09. `SolicitarRecuperacaoSenhaUseCase`: sempre `Right` (resposta neutra); se a conta existe, cria `TokenSenha` (guarda `sha256`, expira em 60 min) e `Mailer.enviar(SENHA_REDEFINICAO)`. `RedefinirSenhaUseCase`: valida `TokenSenhaRepository.buscarPorHash` (não usado, não expirado) → senão `Left` 400 "Link de redefinição inválido ou expirado"; `Senha.criar(novaSenha)` → `Left` 422; atualiza `User.senha` (hash via `Hasher`); `SessaoRepository.revogarTodasDoUsuario`; `TokenSenhaRepository.marcarUsado`.
**Where**: `api/src/domain/fivo/application/use-cases/`
**Depends on**: T2, T4, T7, T9
**Reuses**: `Senha` (T2), `User` (T4), `TokenSenhaRepository`/`SessaoRepository`/`Mailer` (T7), `Hasher`, `UserRepository`
**Requirement**: EMP-09

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `Solicitar` responde `Right` neutro exista ou não a conta; conta existente → 1 `TokenSenha` + `Mailer(SENHA_REDEFINICAO)` — `solicitar-recuperacao-senha.ts`, `solicitar-recuperacao-senha.spec.ts:26-61`
- [x] `Redefinir` com token válido → hash novo, token marcado usado, todas as sessões da conta revogadas — `redefinir-senha.ts:38-83`, `redefinir-senha.spec.ts:57-102`
- [x] Token expirado / já usado / inexistente → `Left` 400 com a mensagem exata — `redefinir-senha.ts:43-50,60-62`, `redefinir-senha.spec.ts:104-156`
- [x] Nova senha < 10 → `Left` 422 — `redefinir-senha.ts:52-56`, `redefinir-senha.spec.ts:158-171`
- [x] Specs co-locadas cobrem EMP-09 AC1–AC4 e o Independent Test (senha antiga para de funcionar; sessões anteriores caem) — ver Test Adequacy Review do chat
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest` — confirmado (127/127)
- [x] Test count: ≥ 7 testes passam — 9 testes (2 `solicitar-recuperacao-senha.spec.ts` + 7 `redefinir-senha.spec.ts`)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): recuperação e redefinição de senha`

---

### T14: Setup de Prisma + PostgreSQL

**What**: Adicionar `prisma` (dev) + `@prisma/client`, `docker-compose.test.yml` (Postgres de teste), `.env.example` (`DATABASE_URL`, `STORAGE_DIR`), `schema.prisma` **derivado das entidades** (`usuario`, `empresa`, `sessao`, `registro_auditoria`, `token_senha`, `arquivo` — `@@map` snake_case, `usuario.email` único global, `empresa.cnpj` único, índice `(estado, criadoEm)` para a fila, enum `TipoArquivo`), migration inicial, `prisma generate` no `postinstall`/`build`.
**Where**: `api/prisma/schema.prisma`
**Depends on**: T3, T4, T5
**Reuses**: nada (introdução de dependência); enums e formas das entidades (T3/T4/T5)
**Requirement**: EMP-01 (infra base)

**Tools**:
- MCP: `WebSearch` / `WebFetch` (setup atual do Prisma com Nest 11 e `module: nodenext`)
- Skill: NONE

**Done when**:
- [x] `npx prisma migrate dev --name init` gera `api/prisma/migrations/**` e aplica sem erro contra o Postgres do compose — `prisma/migrations/20260918144713_init/migration.sql`
- [x] `schema.prisma` cobre as 6 tabelas com os mapeamentos e índices acima — `prisma/schema.prisma`: `usuario`, `empresa`, `sessao`, `registro_auditoria`, `token_senha`, `arquivo` (todas com `@@map` snake_case); `usuario.email` `@unique`, `empresa.cnpj` `@unique`, `@@index([status, criadoEm])` para a fila, enums `TipoArquivo`/`UserRole`/`EmpresaStatus`
- [x] `.gitignore` cobre `.env` mas versiona `prisma/migrations` — `git check-ignore .env` → `.gitignore:45`; `prisma/migrations` não é ignorado
- [x] Gate check passa: `cd api && npm run build && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest` — exit 0, 128/128 testes

**Nota de qualidade (decisões não especificadas)**:
- **Versão do Prisma**: pinada em `6.19.3` (exata). O dist-tag `latest` do npm hoje aponta para `8.0.0-rc.15` (release candidate) e o `7.x` muda os defaults do generator; a 6.x é a linha estável compatível com o setup atual (CommonJS + `module: nodenext` + Nest 11).
- **Postgres de teste**: `postgres:16-alpine` exposto em **5433** (evita colidir com um Postgres local em 5432), com `tmpfs` em `/var/lib/postgresql/data` — o banco é descartável de fato (some no `down`/restart do container). Consequência: após cada restart do container é preciso `npx prisma migrate deploy` antes dos e2e, como já previsto no cabeçalho de Gate Check Commands.
- **Colunas**: nomes em snake_case pt-BR via `@map` (`criado_em`, `atualizado_em`, `razao_social`, `senha_hash`, …). `id` é `String @id` **sem `@default`** — quem gera o identificador é o domínio (`UniqueEntityId`), não o banco, para o mapper poder persistir a identidade já criada na entidade.
- **Value objects**: `Cnpj` → `empresa.cnpj String @unique` (14 dígitos normalizados); `Senha` → `usuario.senha_hash String` (guarda o hash, nunca o texto claro).
- **Tipos**: `numero` do endereço é `String` (representa "s/n", "123-A", zeros à esquerda); `falhas_login` é `Int @default(0)`; `uf` é `Char(2)`; `registro_auditoria.dados` é `Json?`; `atualizado_em` é nullable e **sem `@updatedAt`** — o valor é o da entidade, o banco não inventa timestamp.
- **Relacionamentos**: `empresa.usuario_id` é nullable + `@unique` (1–1, espelha `usuarioId?` em `EmpresaProps`); `sessao`/`token_senha` têm FK para `usuario` com `onDelete: Cascade`; `registro_auditoria` fica **sem FK** (log desacoplado, design.md §Relationships); `empresa.logo_arquivo_id` → `arquivo` (0..1–1).
- **`prisma generate`** entrou no `postinstall` **e** no início do `build`, para o `nest build` nunca rodar contra um client desatualizado.

**Tests**: none
**Gate**: build

**Commit**: `chore(api): adiciona Prisma, Postgres de teste e schema inicial`

---

### T15: `PrismaService` + `DatabaseModule` global

**What**: Implementar `PrismaService` (`extends PrismaClient`, `$connect` no `onModuleInit`, shutdown hook) no arquivo hoje vazio, e tornar `DatabaseModule` `@Global()` provendo/exportando `PrismaService`.
**Where**: `api/src/infra/database/prisma/prisma.service.ts`
**Depends on**: T14
**Reuses**: stub `api/src/infra/database/database.module.ts`
**Requirement**: EMP-01 (infra)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `PrismaService` conecta no boot e desconecta no shutdown — `src/infra/database/prisma/prisma.service.ts:15-21` (`onModuleInit` → `$connect()`, `onModuleDestroy` → `$disconnect()`)
- [x] `DatabaseModule` é `@Global()`, provê e exporta `PrismaService` — `src/infra/database/database.module.ts:5-11`
- [x] `AppModule` continua subindo (`npm run start` → 404 em `/`) — `node dist/infra/main.js` com `DATABASE_URL` do compose: log "DatabaseModule dependencies initialized" + "Nest application successfully started"; `curl -o /dev/null -w "%{http_code}" /` → `404`
- [x] Gate check passa: `cd api && npm run build && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest` — exit 0, 128/128 testes

**Nota de qualidade**: `PrismaService` usa `log: ['warn', 'error']` (sem `query`) para não poluir a saída dos e2e. O shutdown é feito por `onModuleDestroy` em vez de `$on('beforeExit')` — o hook `beforeExit` foi removido da API de eventos do Prisma Client 5+/6 e o ciclo de vida do Nest já cobre o encerramento (`app.close()` nos testes e2e).

**Tests**: none
**Gate**: build

**Commit**: `feat(api): adiciona PrismaService e DatabaseModule global`

> **Nota de qualidade (desvio da mensagem de commit)**: a mensagem planejada era `feat(api): PrismaService e DatabaseModule global`, mas `scripts/check_commit.py` a rejeita ("description should start lowercase"). Prefixada com o verbo imperativo `adiciona` para passar o gate determinístico sem perder o conteúdo.

---

### T16: Harness de teste e2e com Postgres descartável

**What**: Criar `api/test/helpers/e2e-app.ts` (`criarAppDeTeste()` → app Nest inicializada apontando para a `DATABASE_URL` de teste), `limparBanco()` (trunca todas as tabelas em ordem de FK, chamável em `beforeEach`), helpers de sessão/cookie, e um smoke `test/smoke.e2e-spec.ts` (app sobe, `GET /` → 404).
**Where**: `api/test/helpers/e2e-app.ts`
**Depends on**: T15
**Reuses**: `api/test/jest-e2e.json`, `supertest` (já instalado)
**Requirement**: EMP-01 (infra de verificação)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `criarAppDeTeste()` retorna app inicializada; `limparBanco()` trunca sem erro de FK — `test/helpers/e2e-app.ts:21-38` (`criarAppDeTeste`) e `:52-60` (`limparBanco`, `TRUNCATE ... RESTART IDENTITY CASCADE` na ordem `sessao → token_senha → registro_auditoria → empresa → usuario → arquivo`); provado em `test/smoke.e2e-spec.ts:34-70` (insere `usuario` + `sessao` com FK, trunca, `count()` → `0` nas duas)
- [x] `smoke.e2e-spec.ts` passa — 3/3: conexão (`SELECT 1`), `GET /` → 404, truncamento com FK
- [x] `jest-e2e.json` roda com `maxWorkers: 1` (suites compartilham um Postgres) — `test/jest-e2e.json:6`
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json` — exit 0, 128 unit + 3 e2e

**Nota de qualidade**:
- `test/jest-e2e.json` passou a usar `rootDir: ".."` + `moduleNameMapper` (os aliases `@core/@infra/@domain/@test` não resolviam na config e2e original) e `setupFiles: ["<rootDir>/test/helpers/load-env.ts"]`.
- `test/helpers/load-env.ts` (novo, fora do "Where" literal da task): o Prisma Client — diferente do CLI — não lê `.env` sozinho, e o `PrismaService` é instanciado no boot da app de teste. O loader lê o `.env` do `api/` sem dependência nova (nada de `dotenv`) e cai no padrão `postgresql://fivo:fivo@localhost:5433/fivo_test` do compose quando o arquivo não existe.
- `package.json` ganhou `testPathIgnorePatterns: ["/node_modules/", "\\.e2e-spec\\.ts$"]`: o `testRegex` do jest unit (`.*\.spec\.ts$`) também casava com `*.e2e-spec.ts`, o que faria `npx jest` rodar os e2e sem Postgres garantido.
- Helper de sessão mínimo (`comCookieDeSessao` + `NOME_COOKIE_SESSAO`), como previsto: a camada HTTP de sessão só chega em T24.

**Tests**: e2e
**Gate**: full

**Commit**: `test(api): harness de e2e com Postgres descartável`

---

### T17: Adaptadores Prisma — `EmpresaRepository` e `UserRepository`

**What**: `PrismaEmpresaRepository` e `PrismaUserRepository` implementando as portas, com mappers `domínio ↔ row` (um por entidade — inclui converter `Senha` VO ↔ coluna hash, `Cnpj` ↔ string). Registrar em `DatabaseModule` (`provide: EmpresaRepository, useClass: PrismaEmpresaRepository`, idem User).
**Where**: `api/src/infra/database/prisma/`
**Depends on**: T15, T16, T8, T9
**Reuses**: `PrismaService` (T15), portas + entidades, harness (T16)
**Requirement**: EMP-01, EMP-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `create` → `findById`/`findByCnpj`/`findByEmail` devolve entidade equivalente (`equals` + campos de valor) — `test/database/prisma-empresa-repository.e2e-spec.ts:49-73` (`expect(encontrada!.equals(empresa)).toBe(true)` + razão social, `cnpj.valor`, `numero: 's/n'`, `uf`, `status`, `createdAt`), `:75-85` (`findByCnpj`), `test/database/prisma-user-repository.e2e-spec.ts:41-62` (`equals` + `senha.valor` = hash persistido, `role`, `falhasLogin`), `:64-78` (`findByEmail`)
- [x] `listarPorEstado` respeita filtro e ordem — `prisma-empresa-repository.e2e-spec.ts:113-144` (asc: só as `PENDENTE_APROVACAO`, a `APROVADA` fica de fora, ordem por `criado_em`) e `:146-170` (desc inverte)
- [x] Violação de unicidade (e-mail/cnpj) propaga um erro identificável (para o caso de uso mapear em 409) — `prisma-user-repository.e2e-spec.ts:112-133` e `prisma-empresa-repository.e2e-spec.ts:192-206`: `rejects.toBeInstanceOf(UserAlreadyExistsError|EmpresaAlreadyExistsError)` + `rejects.toMatchObject({ status: 409, message: 'CNPJ ou e-mail já cadastrado' })`
- [x] Mapper roundtrip coberto por e2e-spec dedicado contra o Postgres de teste — `src/infra/database/prisma/mappers/prisma-{user,empresa}-mapper.ts`, exercitados nos dois specs acima (inclui `Senha` VO ↔ `senha_hash`, `Cnpj` ↔ `cnpj`, `UniqueEntityId` ↔ FKs e a transição de estado em `:172-190`)
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json` — exit 0, 128 unit + 16 e2e
- [x] Test count: ≥ 6 testes e2e passam — 13 novos (8 de Empresa + 5 de User), 16 e2e no total com o smoke

**Nota de qualidade**:
- **Reidratação dos VOs**: `Senha.create(hash)` e `Cnpj.create(digitos)` são usados na volta do banco. Nenhum dos dois re-hasheia (o hash em `Senha` é explícito via `senha.hash(hasher)`), então a reidratação é fiel; a validação que roda de novo é só de formato, sobre um valor que já passou por ela na ida. O mapper lança um `Error` explícito se o banco devolver um valor inválido — isso é corrupção de dado, não erro de usuário. Optou-se por **não** adicionar um `Senha.reidratar()` ao domínio para não alterar arquivos fora do escopo da task.
- **Erro de unicidade**: o adaptador traduz o `P2002` do Prisma para os erros de domínio que já existem (`UserAlreadyExistsError` / `EmpresaAlreadyExistsError`, ambos `status = 409`), em vez de vazar `PrismaClientKnownRequestError` para a aplicação. Helper isolado em `src/infra/database/prisma/erros-prisma.ts`. Isso cobre a corrida entre o `findByEmail`/`findByCnpj` do caso de uso e o `INSERT`.
- **`statusParaPrisma`** converte o `estado: string` da porta (a porta usa `string`, não o enum) para o enum do Prisma e falha alto em valor desconhecido.

**Tests**: e2e
**Gate**: full

**Commit**: `feat(api): adaptadores Prisma de Empresa e User`

---

### T18: Adaptadores Prisma — `Sessao`, `RegistroAuditoria`, `TokenSenha`

**What**: `PrismaSessaoRepository` (`criar`/`buscarPorTokenHash`/`deslizar`/`revogar`/`revogarTodasDoUsuario`), `PrismaRegistroAuditoriaRepository` (só `registrar` — nenhum método muta/apaga), `PrismaTokenSenhaRepository` (`criar`/`buscarPorHash`/`marcarUsado`), com mappers. Registrar em `DatabaseModule`.
**Where**: `api/src/infra/database/prisma/`
**Depends on**: T15, T16, T7
**Reuses**: `PrismaService` (T15), portas (T7), harness (T16)
**Requirement**: EMP-05, EMP-07, EMP-09

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Roundtrip de cada repositório contra o Postgres de teste — `test/database/prisma-sessao-repository.e2e-spec.ts:52-70` (todos os campos, incl. `ip`/`userAgent`/`revogadaEm: null`), `test/database/prisma-token-senha-repository.e2e-spec.ts:53-66` (`criar` → `buscarPorHash`, `expiraEm`, `usadoEm: null`), `test/database/prisma-registro-auditoria-repository.e2e-spec.ts:28-54` (`registrar` → linha com `tipo`, `descricao`, `usuarioId`, `entidadeId`, `dados` Json e `criadoEm`) e `:56-73` (opcionais ausentes → `null`)
- [x] `SessaoRepository.deslizar` atualiza `ultimoAcessoEm`; `revogarTodasDoUsuario` marca todas as linhas do usuário — `prisma-sessao-repository.e2e-spec.ts:78-89` (`ultimoAcessoEm` = `agora`, `criadaEm` intacta), `:102-131` (duas sessões do usuário ficam com `revogadaEm` preenchido e a de **outro** usuário permanece `null`), `:91-100` (`revogar` de uma única sessão); `marcarUsado` em `prisma-token-senha-repository.e2e-spec.ts:74-83`
- [x] `RegistroAuditoriaRepository` não expõe `update`/`delete` — `src/infra/database/prisma/prisma-registro-auditoria-repository.ts` implementa só `registrar`; checagem estrutural em `prisma-registro-auditoria-repository.e2e-spec.ts:75-82` (`Object.getOwnPropertyNames(prototype)` sem `constructor` → `['registrar']`)
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json` — exit 0, 128 unit + 27 e2e
- [x] Test count: ≥ 6 testes e2e passam — 11 novos (5 Sessao + 3 RegistroAuditoria + 3 TokenSenha); 27 e2e no total

**Nota de qualidade**:
- As três portas trabalham com **interfaces de dado** (`Sessao`, `RegistroAuditoria`, `TokenSenha`), não com entidades ricas — os mappers são row↔interface, sem `UniqueEntityId` nem VOs.
- `revogar(id)` e `marcarUsado(id)` não recebem o "agora" na assinatura da porta, então o adaptador usa `new Date()` (relógio do processo). Quando a Fase 5 introduzir o clock injetável do `SessionService`, vale reavaliar a assinatura da porta.
- `revogarTodasDoUsuario` filtra `revogadaEm: null` para não reescrever a data de sessões já revogadas antes.
- `registro_auditoria.dados` usa `Prisma.DbNull` (SQL NULL) quando ausente — distinto de um `JsonNull` literal armazenado.

**Tests**: e2e
**Gate**: full

**Commit**: `feat(api): adaptadores Prisma de sessão, auditoria e token de senha`

---

### T33: Transação atômica em `CriarEmpresaUseCase` — `User` + `Empresa`

**What**: `criar-empresa.ts` grava `User` e `Empresa` em duas chamadas Prisma separadas e não-transacionais (`UserRepository.create` seguido de `EmpresaRepository.create`). O Verifier independente da Fase 3 (`validation-fase3.md`, GAP 2) confirmou que, contra Postgres real, uma corrida de CNPJ pode deixar um `usuario` órfão com e-mail permanentemente ocupado — o branch de reaproveitamento em `criar-empresa.ts` exige uma `Empresa` `REJEITADA` existente para recuperar, o que não existe nesse cenário. Introduzir um boundary de transação cobrindo as duas escritas como unidade atômica: se a escrita de `Empresa` falhar, a de `User` reverte junto. Mecanismo: porta `UnitOfWork` (`abstract class UnitOfWork { executar<T>(job: () => Promise<T>): Promise<T> }`) em `application/ports/`, implementada via `PrismaService.$transaction`; os adaptadores `PrismaUserRepository`/`PrismaEmpresaRepository` (T17) passam a participar da transação corrente ao gravar dentro de um `executar(...)` (mecanismo de propagação — `AsyncLocalStorage` ou parâmetro explícito de cliente — é decisão de implementação); `InMemoryUnitOfWork` roda o `job` direto (os repositórios em memória já são atômicos por processo, então `criar-empresa.spec.ts` não muda de comportamento). `CriarEmpresaUseCase` passa a envolver as duas escritas num único `unitOfWork.executar(...)`.
**Where**: `api/src/domain/fivo/application/ports/unit-of-work.ts` (porta nova), `api/src/infra/database/prisma/prisma-unit-of-work.ts` (adaptador), `api/test/repositories/in-memory-unit-of-work.ts` (double), `api/src/domain/fivo/application/use-cases/criar-empresa.ts` (orquestração)
**Depends on**: T8, T17
**Reuses**: `PrismaService` (T15), `PrismaUserRepository`/`PrismaEmpresaRepository` (T17), `CriarEmpresaUseCase` (T8)
**Requirement**: EMP-01, EMP-02 (edge case de concorrência de CNPJ/e-mail)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `UnitOfWork` declarada como `abstract class` sem dependência de infra (ESLint de `src/domain/**` passa) — `ports/unit-of-work.ts`
- [x] `PrismaUnitOfWork` usa `PrismaService.$transaction`; a transação só comita se as duas escritas (`User` + `Empresa`) tiverem sucesso — propagação via `AsyncLocalStorage` (`PrismaTransactionContext`); sensor: com o boundary desligado os 2 e2e falham
- [x] `CriarEmpresaUseCase` usa `unitOfWork.executar` para as duas escritas; `criar-empresa.spec.ts` continua verde (só a construção do SUT ganhou o `InMemoryUnitOfWork`; nenhuma asserção alterada)
- [x] e2e novo contra Postgres real força a escrita de `Empresa` a falhar depois da de `User` → nenhuma linha `usuario` sobrevive; o e-mail volta a ficar disponível — `criar-empresa-transacao.e2e-spec.ts` (1º teste: `expect(await contexto.prisma.usuario.count()).toBe(0)`, novo cadastro `isRight()`)
- [x] e2e de corrida: duas chamadas com o mesmo CNPJ em paralelo → exatamente um sucesso, nenhum `usuario` órfão — 2º teste: `expect([...classificados].sort()).toEqual(['conflito','sucesso'])`, `usuario.count()` → `1`
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json` — exit 0, 144 unit + 39 e2e
- [x] Test count: ≥ 3 testes novos (unit de `criar-empresa.spec.ts` confirmado inalterado + 2 e2e) passam — 144 unit inalterados + 2 e2e novos

**Tests**: e2e
**Gate**: full

**Commit**: `fix(api): transação atômica para criação de usuário e empresa`

---

### T19: `CryptographyModule` — hash e gerador de token opaco

**What**: `Argon2Hasher implements Hasher` (`hash`/`compare`, argon2id; fallback `bcrypt` é aceito por EMP-01 AC7) e `GeradorTokenOpaco` (`gerar(): string` base64url ≥ 256 bits, `sha256(token): string`). `CryptographyModule` provê `Hasher` e `GeradorTokenOpaco`.
**Where**: `api/src/infra/cryptography/`
**Depends on**: T15
**Reuses**: stub `cryptography.module.ts`, porta `Hasher` (`src/domain/fivo/application/ports/cryptography/hasher.ts`)
**Requirement**: EMP-01 (AC7), EMP-06

**Tools**:
- MCP: `WebSearch` / `WebFetch` (`argon2` — build nativo no ambiente alvo; fallback `bcrypt`)
- Skill: NONE

**Done when**:
- [x] `Argon2Hasher.hash` produz string ≠ texto claro; `compare` → `true`/`false` corretos — `argon2-hasher.spec.ts:9-10` (hash ≠ plain, prefixo `$argon2id$`), `:16` (compare true), `:22` (compare false)
- [x] `GeradorTokenOpaco.gerar()` tem entropia ≥ 256 bits; `sha256` é determinístico — `gerador-token-opaco.spec.ts:6-11` (≥ 43 chars base64url = 256 bits), `:20-24` (sha256 determinístico)
- [x] Testes unit para os dois providers (co-locados) — `argon2-hasher.spec.ts`, `gerador-token-opaco.spec.ts`
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest` — exit 0, 137/137 testes
- [x] Test count: ≥ 5 testes passam — 9 novos (4 `Argon2Hasher` + 5 `GeradorTokenOpaco`)

**Tests**: unit
**Gate**: quick

**Commit**: `feat(api): módulo de criptografia (argon2 + token opaco)`

---

### T20: `MailModule` — adaptador de log

**What**: `LogMailer implements Mailer` (registra `para` + `template` em log estruturado e resolve sempre) + o enum/objeto `TemplateEmail` (`CADASTRO_RECEBIDO`, `CADASTRO_APROVADO`, `CADASTRO_REJEITADO`, `EMAIL_CONFIRMACAO`, `SENHA_REDEFINICAO`). `MailModule` provê e exporta `Mailer`.
**Where**: `api/src/infra/mail/`
**Depends on**: T15
**Reuses**: porta `Mailer` (T7)
**Requirement**: EMP-01 (AC8), EMP-04, EMP-09

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `LogMailer.enviar` resolve sempre e registra `para` + `template` — `log-mailer.spec.ts:6-24` (`resolves.toBeUndefined()` + `logSpy` chamado com `para` e `template`)
- [x] Os 5 templates declarados — já existiam em `application/ports/mailer.ts` (`TemplateEmail`); confirmado cobrindo os 5 em `log-mailer.spec.ts:27-41`
- [x] Teste unit do `LogMailer` — `log-mailer.spec.ts`
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest` — exit 0, 139/139 testes
- [x] Test count: ≥ 2 testes passam — 2 novos

**Tests**: unit
**Gate**: quick

**Commit**: `feat(api): MailModule com adaptador de log`

---

### T21: `StorageModule` — disco local

**What**: `LocalDiskStorage implements Storage` (`salvar`/`ler`/`remover` sob `STORAGE_DIR`, chave `<uuid>/<slug>`) lançando `StorageIndisponivelError` em falha de I/O. `StorageModule` provê e exporta `Storage`.
**Where**: `api/src/infra/storage/`
**Depends on**: T15
**Reuses**: porta `Storage` (T7), `node:crypto` `randomUUID`
**Requirement**: EMP-03, Edge Case (storage indisponível)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Roundtrip `salvar` → `ler` devolve os mesmos bytes; `remover` apaga — `local-disk-storage.spec.ts:21-29` (roundtrip, `Buffer.equals`), `:31-40` (`remover` + `ler` subsequente rejeita)
- [x] Falha de escrita simulada (dir sem permissão) → `StorageIndisponivelError` — sem permissão real testável como root; simulado forçando `ENOTDIR` (arquivo no lugar de diretório) em `local-disk-storage.spec.ts:42-49` (`salvar`) e `:59-66` (`remover`), mais `ler` de chave inexistente em `:51-57`
- [x] Testes unit com diretório temporário (`os.tmpdir()`), limpo no `afterEach` — `local-disk-storage.spec.ts:12-19` (`mkdtemp`/`rm` recursivo)
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest` — exit 0, 144/144 testes
- [x] Test count: ≥ 5 testes passam — 5 novos

**Tests**: unit
**Gate**: quick

**Commit**: `feat(api): StorageModule com adaptador de disco local`

---

### T22: `ArquivoService` — sniff, construção da entidade e persistência

**What**: `ArquivoService.uploadImagem(input)` — sniff de MIME por **magic bytes** (nunca o `Content-Type` do multipart), probe de dimensão para raster, monta `Arquivo.criar({ tipo, mime, bytes, largura, altura, chaveStorage, svgConteudo? })` (T5) → no `Left`, propaga o erro 422; no `Right`, grava a linha `arquivo` (via `PrismaService`) + `Storage.salvar` na mesma unidade (falha de storage → 503); e `lerBytes(id)` → `{ buffer, mime, nomeOriginal }`.
**Where**: `api/src/infra/arquivo/arquivo.service.ts`
**Depends on**: T5, T21, T17
**Reuses**: `Arquivo` (T5, domínio — a regra vive lá), `Storage` (T21), `PrismaService` (T15)
**Requirement**: EMP-03

**Tools**:
- MCP: `WebSearch` / `WebFetch` (lib de sniff/dimensão CJS-compatível — o `api` compila CommonJS)
- Skill: NONE

**Done when**:
- [x] Aceita PNG/JPG/SVG válidos → linha `arquivo` + objeto no storage — `arquivo-service.e2e-spec.ts:72-93` (PNG), `:95-113` (JPG), `:115-132` (SVG)
- [x] `Arquivo.criar` devolvendo `Left` → 422 com o limite (MIME divergente dos magic bytes, > 5 MB, raster < 512×512, SVG com script) — `:134-152` (magic bytes divergentes), `:154-169` (> 5 MB), `:171-183` (< 512×512), `:185-197` (SVG com `<script>`)
- [x] Falha do storage → erro 503, nenhuma linha `arquivo` órfã — `:199-217` (`rejects.toBeInstanceOf(StorageIndisponivelError)` + `prisma.arquivo.count()` → `0`)
- [x] `lerBytes` devolve os bytes e o mime do registro — `:219-233`
- [x] e2e via rota-probe (ou teste do service contra o Postgres de teste) cobre cada ramo — teste do service direto (`new ArquivoService(prisma, storage)`) contra o Postgres de teste, sem módulo Nest (não há `ArquivoModule` — a task só pediu o service; wiring em rota fica para T25/T28)
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json` — exit 0, 144 unit + 37 e2e; `npm run build` também passa
- [x] Test count: ≥ 8 testes e2e passam — 9 novos

**Tests**: e2e
**Gate**: full

**Commit**: `feat(api): ArquivoService com sniff de magic bytes`

---

### T23: `DomainExceptionFilter` + `ZodValidationPipe`

**What**: `DomainExceptionFilter` (`APP_FILTER`) — mapeia qualquer erro com `readonly status: number` (os erros de `application/errors/` desembrulhados no controller) para a resposta HTTP correspondente; exceções nativas do Nest passam direto. `ZodValidationPipe` — valida body/query com schema `zod`, erro → 422 com campo + mensagem.
**Where**: `api/src/infra/http/`
**Depends on**: T6, T16
**Reuses**: contrato de erro (T6), harness (T16), `zod` (já instalado)
**Requirement**: EMP-02, EMP-05, EMP-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Cada classe de erro de `application/errors/` mapeia para o `status` esperado (tabela Error Handling do design), verificado por rota-probe que lança cada uma — `domain-exception-filter.e2e-spec.ts:117` (`expect(resposta.status).toBe(STATUS_ESPERADO[nome])`, 14 classes via `it.each`) e `:119` (body `{ statusCode, message }`)
- [x] `ZodValidationPipe` devolve 422 com o campo inválido — `:131` (`toMatchObject({ statusCode: 422, message: 'Nome é obrigatório', errors: [{ campo: 'nome', ... }] })`)
- [x] Erro não-domínio (ex.: `NotFoundException` do Nest) mantém o comportamento padrão — `:155` (`error: 'Not Found'`, 404); erro sem `status` → 500 genérico sem vazar mensagem (`:170`)
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json` — exit 0, 144 unit + 57 e2e
- [x] Test count: ≥ 6 testes e2e passam — 18 novos

**Tests**: e2e
**Gate**: full

**Commit**: `feat(api): filtro de exceção de domínio e pipe de validação zod`

---

### T24: `AuthModule` — sessão, guards e decorators

**What**: Backbone de autenticação: `SessionService` (`criar(usuarioId, ctx)` → token cru + `sha256` em `sessao`; `validar(tokenCru)` → checa `revogadaEm` e `ultimoAcessoEm + 8h` (expira → revoga), senão desliza; `revogar`; `revogarTodasDoUsuario`), `AuthGuard` + `RolesGuard` como `APP_GUARD`, decorators `@CurrentUser`/`@Roles`/`@Public`, integração de `cookie-parser`, e um seed idempotente de usuário `ADMIN` a partir de env.
**Where**: `api/src/infra/auth/`
**Depends on**: T18, T19, T23
**Reuses**: `SessaoRepository` (T18 via DI), `GeradorTokenOpaco` (T19), harness (T16 via T23)
**Requirement**: EMP-06, EMP-07

**Tools**:
- MCP: `WebSearch` / `WebFetch` (cookie httpOnly + `cookie-parser` com Nest 11; `APP_GUARD` global + opt-out `@Public`)
- Skill: NONE

**Done when**:
- [x] `SessionService.criar` grava só o `sha256`; cookie httpOnly/SameSite=Lax (`secure` condicionado a `COOKIE_SECURE`) — `auth.e2e-spec.ts:102` (`tokenHash` `toBe(sha256(token))`), `:116` (`HttpOnly`), `:118` (`not.toContain('Secure')`), `:129` (`toContain('Secure')` com env). Nome do cookie: `fivo_sessao` (já definido no harness T16)
- [x] `validar` rejeita token inexistente, revogado e expirado (> 8h → revoga); em sucesso desliza — `:146` (inexistente → 401), `:206` (revogada → 401), `:221`/`:223` (−9h → 401 + `revogadaEm` `not.toBeNull()`), `:241` (`ultimoAcessoEm` `toBeGreaterThan(...)`)
- [x] `AuthGuard` global: 401 sem cookie válido; `@Public` isenta; `RolesGuard`: 403 quando o papel não bate — `:137` (sem cookie → 401), teste `@Public` (200), `:189` (`negada.status` `toBe(403)`, body `Acesso negado`)
- [x] Seed cria um `ADMIN` idempotente — `:258` (`admins` `toHaveLength(1)` após duas execuções; e-mail em minúsculas; senha só como hash verificável por `Hasher.compare`). `AdminSeeder` lê `ADMIN_EMAIL`/`ADMIN_SENHA`/`ADMIN_NOME` (documentados em `.env.example`)
- [x] e2e via rota-probe protegida: sem cookie → 401; sessão válida → 200; papel errado → 403; sessão revogada → 401; `ultimoAcessoEm` forçado a −9h → 401 — `auth.e2e-spec.ts` (12 testes); sensor: 3 mutantes de `SessionService` (sem checar revogada, sem deslizar, limite de 8h ×100) mortos
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json` — exit 0, 144 unit + 69 e2e
- [x] Test count: ≥ 7 testes e2e passam — 12 novos

**Tests**: e2e
**Gate**: full

**Commit**: `feat(api): backbone de autenticação (sessão opaca, guards, decorators)`

---

### T25: `CadastroEmpresaController` — autocadastro e dados próprios

**What**: `POST /empresas` (multipart: dados + `logo`, `@Public`) → o controller chama `ArquivoService.uploadImagem` para o logo (se veio) e depois `CriarEmpresaUseCase` com o `arquivoId`; 201 `{ id }`. `GET /empresas/me` (`@Roles(EMPRESA)`) → dados da própria empresa, 403 para recurso de outra. DTOs `zod`. Registrar controller + fiação de DI dos casos de uso → adaptadores no `HttpModule`/`AppModule`.
**Where**: `api/src/infra/http/` (controller, DTO zod, presenter, `desembrulhar`); extras necessários: `EmpresaRepository.findByUsuarioId` (porta + Prisma + in-memory, para `GET /empresas/me`), `ArquivoService.remover` (descarta o logo órfão quando o cadastro falha depois do upload) e `ArquivoModule`
**Depends on**: T8, T20, T22, T24, T33
**Reuses**: `CriarEmpresaUseCase` (T8), `Mailer` (T20), `ArquivoService` (T22), guards (T24), `UnitOfWork` (T33)
**Requirement**: EMP-01, EMP-02, EMP-03, EMP-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `POST /empresas` com dados válidos → 201 `{ id }`, empresa `PENDENTE_APROVACAO`, senha só como hash — `cadastro-empresa.e2e-spec.ts:122` (`toBe(201)`), `:129` (`PENDENTE_APROVACAO`), `:133` (`senhaHash` `toMatch(/^\$argon2id\$/)`); logo válido vinculado (`:144`); e-mail `CADASTRO_RECEBIDO` enviado (`:159`)
- [x] CNPJ inválido → 422 "CNPJ inválido" sem persistir (nem o logo enviado: `:191`); CNPJ/e-mail duplicado → 409 (`:203`, `:215`); senha < 10 → 422 (`:225`); logo inválido → 422 com o limite (formato `:261`, dimensão `:278`, tamanho 5 MB); storage fora → 503 "Não foi possível enviar o logo, tente novamente" (`:294`)
- [x] Falha de e-mail → 201 mesmo assim — `:172` (`toBe(201)` com `FakeMailer.forceFailure()`; empresa persistida)
- [x] `GET /empresas/me` → dados próprios; papel de outra área (ADMIN/INSTITUICAO) → 403 (`:378`); sem sessão → 401 (`:365`); cada empresa vê só a própria. A rota não recebe id, então "recurso de outra empresa" se resolve por construção (identidade vem da sessão)
- [x] e2e cobre todos os ACs de EMP-01/02/03; o Independent Test (empresa pendente na fila do admin) fecha em T27 — aqui a empresa consta `PENDENTE_APROVACAO` no banco e em `GET /empresas/me`
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json` — exit 0, 144 unit + 88 e2e; sensor: 3 mutantes (sem descartar logo órfão, sem `toLowerCase` do e-mail, `/me` aberto a ADMIN) mortos
- [x] Test count: ≥ 12 testes e2e passam — 19 novos

**Tests**: e2e
**Gate**: full

**Commit**: `feat(api): endpoints de autocadastro e dados da empresa`

---

### T26: `AutenticacaoController` — login e logout

**What**: `POST /sessoes` (login: email, senha, `@Public`) → `AutenticarUsuarioUseCase`, `Set-Cookie: sessao`, 200 `{ papel }`; `DELETE /sessoes/atual` (autenticado) → `SessionService.revogar`. DTO `zod`.
**Where**: `api/src/infra/http/`
**Depends on**: T9, T24
**Reuses**: `AutenticarUsuarioUseCase` (T9), `SessionService`/guards (T24)
**Requirement**: EMP-06, EMP-07

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Login correto → 200 `{ papel }` + `Set-Cookie` httpOnly — `autenticacao.e2e-spec.ts:80-81` (`toBe(200)`, `toEqual({ papel: role })`, um teste por papel EMPRESA/INSTITUICAO/ADMIN). Cookie chama-se `fivo_sessao` (T24)
- [x] E-mail inexistente e senha errada → ambos 401 "Credenciais inválidas" — `:94-99` (status 401 nos dois; `senhaErrada.body` `toEqual(emailInexistente.body)`)
- [x] 5 falhas em 15 min → 429 nas seguintes — `:107` (5 × 401) e `:112` (`bloqueada.status` `toBe(429)`, mesmo com a senha certa, sem `Set-Cookie`)
- [x] `DELETE /sessoes/atual` → a requisição autenticada seguinte com o token antigo → 401 — `:145` (204), `:146` (401), `:148` (`revogadaEm` `not.toBeNull()`); sem sessão → 401 (`:156`)
- [x] Sessão inativa > 8h (tempo forçado no teste) → 401 na próxima requisição — `:171` (`ultimoAcessoEm` −9h via banco, `GET /empresas/me` → 401)
- [x] e2e cobre EMP-06/07 e o Independent Test (login por papel, 429, acesso cruzado 403) — `:185` (ADMIN/INSTITUICAO em rota de empresa → 403); fluxo cadastro → login com e-mail em outra caixa (`:220-221`)
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json` — exit 0, 144 unit + 101 e2e; sensor: mutantes "sem Set-Cookie" (8 falhas) e "logout sem revogar" (1 falha) mortos
- [x] Test count: ≥ 8 testes e2e passam — 13 novos

**Tests**: e2e
**Gate**: full

**Commit**: `feat(api): login, logout e expiração de sessão`

---

### T27: `AdminEmpresasController` — fila e decisões

**What**: Todas `@Roles(ADMIN)`: `GET /admin/empresas?estado=PENDENTE_APROVACAO` (`ListarFilaAprovacaoUseCase`), `POST /admin/empresas/:id/aprovacao`, `.../rejeicao` (motivo ≥ 20), `.../suspensao`, `.../reativacao`.
**Where**: `api/src/infra/http/`
**Depends on**: T10, T11, T24
**Reuses**: casos de uso de decisão (T10/T11), `RolesGuard` (T24)
**Requirement**: EMP-04, EMP-05, EMP-10

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `GET /admin/empresas` lista da mais antiga para a mais recente com nome, CNPJ, e-mail, data — `admin-empresas.e2e-spec.ts` (1º teste: `toEqual([antiga, nova])` com `id`, `razaoSocial`, `cnpj`, `email`, `criadoEm`; aprovadas ficam fora); `estado` ≠ `PENDENTE_APROVACAO` → 422 (`:139`)
- [x] `aprovacao` → `APROVADA` + admin + data-hora + e-mail (`:151`, `decididoPor` = admin, `CADASTRO_APROVADO` `:161`); `rejeicao` motivo < 20 → 422 e segue pendente (`:175`); motivo ok → `REJEITADA` + motivo persistido e por e-mail (`:191`, `:200`)
- [x] `suspensao`/`reativacao` respeitam as transições (`:227`, `:233`); fora do conjunto → 409 sem alterar o estado (`:253`, 4 casos); segunda decisão sobre o mesmo pendente → 409 e vale a primeira (`:272`). A corrida paralela real (CAS no banco) é o escopo da T30; aqui a segunda decisão é sequencial
- [x] Não-admin em qualquer endpoint → 403, nenhum estado alterado — `:322` (EMPRESA e INSTITUICAO nas 5 rotas; estado `PENDENTE_APROVACAO` e zero linhas de auditoria); sem sessão → 401 (`:335`)
- [x] Toda mudança gera linha em `registro_auditoria` — teste de auditoria (`toEqual` com `usuarioId` do admin, `entidadeId`, `estadoAnterior`/`estadoNovo` nas 3 transições) e o da rejeição com `motivo`
- [x] e2e cobre EMP-04/05/10 e os Independent Tests (aprovar pendente, 403 para empresa, 409 na segunda aprovação); empresa inexistente → 404 (`:281`); falha do e-mail não desfaz a aprovação (`:292`). O filtro passou a traduzir `NotAllowedError` → 403 "Acesso negado" e `ResourceNotFoundError` → 404 (erros do `core` não têm `status`; 2 casos novos em `domain-exception-filter.e2e-spec.ts`)
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json` — exit 0, 144 unit + 122 e2e; sensor: mutantes "sem `@Roles(ADMIN)`" (2 falhas) e "campo extra na fila" (1 falha) mortos
- [x] Test count: ≥ 12 testes e2e passam — 19 novos (+2 no filtro)

**Tests**: e2e
**Gate**: full

**Commit**: `feat(api): fila e decisões de aprovação/suspensão de empresa`

---

### T28: Entrega de binário — `GET /arquivos/:id`

**What**: `GET /arquivos/:id` — devolve os bytes via `ArquivoService.lerBytes`, `Content-Type` do registro + `X-Content-Type-Options: nosniff`; 403 quando o solicitante não é o dono nem `ADMIN`; 404 quando não existe.
**Where**: `api/src/infra/http/`
**Depends on**: T22, T24
**Reuses**: `ArquivoService` (T22), guards/`@CurrentUser` (T24)
**Requirement**: EMP-03

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] Dono/admin → 200 com o `Content-Type` do registro e `nosniff` — `arquivo.e2e-spec.ts:113-115` (`toBe(200)`, `'image/png'`, `x-content-type-options` `'nosniff'`, bytes idênticos), `:130` (ADMIN em arquivo de outra empresa), `:144-145` (SVG → `image/svg+xml` + `nosniff`)
- [x] Não-dono → 403 (`:158`; arquivo sem empresa vinculada só ao ADMIN: `:179-180`); id inexistente → 404 (`:191`); sem sessão → 401 (`:197`). A dona do arquivo é resolvida por `empresa.logoArquivoId` (`ArquivoService.buscarAcesso`)
- [x] Um SVG com script foi rejeitado no upload (T22), então nunca chega aqui — teste confirma o 422 no upload (`:221`, `POST /empresas` com SVG com `<script>`; `arquivo.count()` → 0)
- [x] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json` — exit 0, 144 unit + 130 e2e; sensor: mutantes "sem nosniff", "sem checar dono" e "ADMIN sem bypass" mortos (2 falhas cada)
- [x] Test count: ≥ 5 testes e2e passam — 8 novos

**Tests**: e2e
**Gate**: full

**Commit**: `feat(api): entrega endurecida de arquivos`

---

### T29: Rotas P2 — edição cadastral e recuperação de senha

**What**: `PATCH /empresas/me` e `PATCH /empresas/me/email` + `POST /empresas/me/email/confirmacao` (`@Public`, identificada pelo token) → `EditarDadosEmpresaUseCase`; `POST /senha/recuperacao` (202 neutro) e `POST /senha/redefinicao` → os casos de uso de T13. DTOs `zod`.
**Where**: `api/src/infra/http/` (rotas em `CadastroEmpresaController`, novo `SenhaController`, DTOs zod); domínio necessário para a confirmação de e-mail: `use-cases/confirmar-troca-email.ts`, `errors/token-confirmacao-email-invalido.error.ts`, `Empresa.limparTrocaDeEmail`, `User.alterarEmail`, `EmpresaRepository.findByTokenTrocaEmailHash`
**Depends on**: T12, T13, T25, T26
**Reuses**: `EditarDadosEmpresaUseCase` (T12), casos de uso de senha (T13), controllers existentes (T25/T26)
**Requirement**: EMP-08, EMP-09

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [x] `PATCH /empresas/me` altera nome fantasia/telefone/endereço/logo; `cnpj` → 422 — `edicao-e-senha.e2e-spec.ts:134` (200 + valores novos, razão social e CNPJ intactos), `:175` (logo novo válido; arquivo anterior permanece: `arquivo.count()` → 2), `:195` (logo < 512×512 → 422, sem trocar nem gravar), `:216` (`cnpj` → 422 "CNPJ não pode ser alterado; solicite ao suporte", nada muda); 401/403 (`:238-239`)
- [x] Troca de e-mail mantém o antigo ativo até `POST .../email/confirmacao` com token válido — `:257-263` (202; `emailPendente` no perfil; login antigo 200, novo 401; `EMAIL_CONFIRMACAO` ao novo endereço), `:289-291` (confirmação 204; login novo 200, antigo 401), `:320` (token inexistente/já usado → 400), `:341` (e-mail tomado nesse meio-tempo → 409). Não havia caso de uso de confirmação: criados `ConfirmarTrocaEmailUseCase` (+ `confirmar-troca-email.spec.ts`, 5 testes), `TokenConfirmacaoEmailInvalidoError` (400), `Empresa.limparTrocaDeEmail`, `User.alterarEmail` e `EmpresaRepository.findByTokenTrocaEmailHash`
- [x] `POST /senha/recuperacao` → 202 neutro exista ou não a conta — `:357-359` (`toBe(202)` nos dois; `inexistente.body` `toEqual(existente.body)`; e-mail só para a conta existente)
- [x] `POST /senha/redefinicao` com token válido → nova senha vale, antiga não, sessões anteriores caem — `:389-393` (204; login novo 200, antigo 401; sessão anterior 401, nova 200); token inválido/expirado/usado → 400 "Link de redefinição inválido ou expirado" (`:430`); senha curta → 422 e o token segue utilizável (`:452-456`)
- [x] e2e cobre EMP-08 e EMP-09 e os Independent Tests (alterar telefone/logo e recusar CNPJ; recuperar → redefinir → senha antiga morta e sessões encerradas)
- [x] Gate check passa (nível Build, última task da fase): `cd api && npm run build && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json` — exit 0, 149 unit + 145 e2e; sensor: 3 mutantes (token de e-mail não limpo, sem checar e-mail ocupado, recuperação não-neutra) mortos
- [x] Test count: ≥ 10 testes e2e passam — 14 novos e2e (+5 unit do caso de uso de confirmação, +1 caso no teste do filtro)

**Tests**: e2e
**Gate**: full

**Commit**: `feat(api): edição cadastral e recuperação de senha (rotas P2)`

---

### T30: Sweep de concorrência e re-cadastro

**What**: Suite e2e dedicada aos edge cases de corrida + ajustes mínimos: `Promise.all` de dois `POST /empresas` com o mesmo CNPJ (índice único → exatamente um 201, um 409); aprovação + rejeição concorrentes do mesmo pendente (`updateMany` condicional / CAS → uma aplica, a outra 409); `Storage` forçado a falhar → `POST /empresas` → 503 sem `empresa`/`usuario` órfãos.
**Where**: `api/test/cadastro-empresa/concorrencia.e2e-spec.ts`
**Depends on**: T25, T27, T28
**Reuses**: helpers de e2e (T16)
**Requirement**: EMP-01, EMP-04, EMP-05, Edge Cases

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Dois cadastros simultâneos mesmo CNPJ → exatamente um 201 e um 409
- [ ] Aprovação + rejeição concorrentes → uma aplica, a outra 409, estado final consistente com a 1ª
- [ ] `Storage` em falha → 503 e nenhuma linha órfã
- [ ] Nenhum ajuste de código enfraquece testes existentes
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json`
- [ ] Test count: ≥ 4 testes e2e passam

**Tests**: e2e
**Gate**: full

**Commit**: `test(api): sweep de concorrência e re-cadastro`

---

### T31: Fila de reenvio de e-mail

**What**: Modelo `email_pendente` (na migration de T14 ou uma nova), `EmailPendenteService.enfileirar` + `EmailPendenteWorker` (`@Interval`, backoff, para após N tentativas); os callers de `CriarEmpresaUseCase` e das decisões passam a enfileirar quando o `Mailer` falha (em vez de só logar).
**Where**: `api/src/infra/mail/email-pendente.service.ts`
**Depends on**: T25, T27
**Reuses**: `Mailer` (T20), `PrismaService` (T15)
**Requirement**: EMP-01 (AC9), EMP-04, Edge Cases (provedor de e-mail indisponível)

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `Mailer` em falha no cadastro/decisão → linha em `email_pendente`, operação segue normal
- [ ] O worker drena pendências, marca `enviadoEm` no sucesso, incrementa `tentativas` + adia na falha, para após o teto
- [ ] e2e com um `Mailer` de teste que falha sob demanda: cadastro → 201 + linha pendente; após o worker → linha marcada enviada
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json`
- [ ] Test count: ≥ 4 testes e2e passam

**Tests**: e2e
**Gate**: full

**Commit**: `feat(api): fila de reenvio de e-mail transacional`

---

### T32: Escape de conteúdo e verificação de sanitização

**What**: Suite e2e confirmando o edge case "nome de empresa com HTML/script": o valor é aceito e persistido cru, mas devolvido pela API sem interpretação (o escape na renderização é do `web`; aqui garante-se que a API não injeta nem executa) e a rota `GET /arquivos/:id` nunca serve um SVG com script (bloqueado no upload). Ajustes mínimos se algum campo precisar de normalização.
**Where**: `api/test/cadastro-empresa/conteudo-hostil.e2e-spec.ts`
**Depends on**: T28
**Reuses**: helpers de e2e (T16)
**Requirement**: Edge Cases

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `POST /empresas` com `<script>` no nome → 201; `GET /empresas/me` devolve o valor como texto, sem tag interpretada no JSON
- [ ] Upload de SVG com `<script>` → 422; nenhum arquivo criado
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json`
- [ ] Test count: ≥ 3 testes e2e passam

**Tests**: e2e
**Gate**: full

**Commit**: `test(api): conteúdo hostil em nome e upload`

---

## Phase Execution Map

Grafo completo de dependências (`origem → alvo`), união das arestas dos blocos por fase:

```
T2 → T4
T3 → T8
T4 → T8
T5 → T8
T6 → T8
T7 → T8
T4 → T9
T6 → T9
T7 → T9
T3 → T10
T6 → T10
T7 → T10
T3 → T11
T6 → T11
T7 → T11
T3 → T12
T5 → T12
T7 → T12
T8 → T12
T2 → T13
T4 → T13
T7 → T13
T9 → T13
T3 → T14
T4 → T14
T5 → T14
T14 → T15
T15 → T16
T15 → T17
T16 → T17
T8 → T17
T9 → T17
T15 → T18
T16 → T18
T7 → T18
T8 → T33
T17 → T33
T15 → T19
T15 → T20
T15 → T21
T5 → T22
T21 → T22
T17 → T22
T6 → T23
T16 → T23
T18 → T24
T19 → T24
T23 → T24
T8 → T25
T20 → T25
T22 → T25
T24 → T25
T33 → T25
T9 → T26
T24 → T26
T10 → T27
T11 → T27
T24 → T27
T22 → T28
T24 → T28
T12 → T29
T13 → T29
T25 → T29
T26 → T29
T25 → T30
T27 → T30
T28 → T30
T25 → T31
T27 → T31
T28 → T32
```

Ordem de execução (prosa): Fase 1 `T1 … T7` (T2 antes de T4; o resto sem ordem forçada) · Fase 2 `T8 → T9 → T10 → T11 → T12 → T13` · Fase 3 `T14 → T15 → T16 → T17 → T18 → T33` · Fase 4 `T19 → T20 → T21 → T22` · Fase 5 `T23 → T24 → T25 → T26 → T27 → T28 → T29` · Fase 6 `T30 → T31 → T32`.

Execução estritamente sequencial — sem paralelismo intra-fase.

**Batches previstos para o Execute** (~7 tasks/worker, fases inteiras): Fase 1 (7) → batch 1; Fase 2 (6) → batch 2; Fases 3+4 (10, incl. T33) → batch 3; Fase 5 (7) → batch 4; Fase 6 (3) → batch 5. Verifier ao final. As Fases 1–2 fecham a regra de negócio e podem ser executadas e verificadas isoladamente antes de qualquer trabalho de infra.

> **T33 adicionada em 2026-09-18** após a validação da Fase 3 (`validation-fase3.md`, GAP 2 escalado) — ver AD-019 em `STATE.md`. Bloqueia T25; T14–T18 e o restante das Fases 4–6 não foram renumeradas.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 1 arquivo de teste | ✅ Granular |
| T2 | 1 VO + erro + teste | ✅ Granular |
| T3 | 1 entidade — modelo + máquina de estados (uma preocupação: a `Empresa`) | ⚠️ OK (coeso) |
| T4 | 1 entidade — `Senha` + contadores + bloqueio (uma preocupação: o `User`) | ⚠️ OK (coeso) |
| T5 | 1 entidade com factory validante | ✅ Granular |
| T6 | contrato de erro — vários arquivos pequenos em `application/errors/`, uma só preocupação | ⚠️ OK (coeso) |
| T7 | 5 portas + test doubles — uma unidade de dependência para a Fase 2 | ⚠️ OK (coeso) |
| T8 | 1 caso de uso (reescrita) | ✅ Granular |
| T9 | 1 caso de uso (reescrita) | ✅ Granular |
| T10 | 2 casos de uso + 1 de leitura — mesma fatia (decisão de aprovação) | ⚠️ OK (coeso) |
| T11 | 2 casos de uso + 1 helper — mesma fatia (suspensão) | ⚠️ OK (coeso) |
| T12 | 1 caso de uso | ✅ Granular |
| T13 | 2 casos de uso — um fluxo (recuperação de senha) | ⚠️ OK (coeso) |
| T14 | setup de infra (multi-arquivo por natureza) | ⚠️ OK (uma entrega: persistência) |
| T15 | 1 service + 1 módulo | ✅ Granular |
| T16 | helpers de teste + 1 smoke | ⚠️ OK (coeso) |
| T17 | 2 adaptadores + mappers — mesma fatia (repos de identidade) | ⚠️ OK (coeso) |
| T18 | 3 adaptadores pequenos e quase idênticos | ⚠️ OK (coeso) |
| T33 | 1 porta nova + 1 adaptador + 1 double + orquestração no caller — uma preocupação (boundary de transação) | ⚠️ OK (coeso) |
| T19 | 1 módulo, 2 providers coesos | ⚠️ OK (coeso) |
| T20 | 1 módulo, 1 adaptador | ✅ Granular |
| T21 | 1 módulo, 1 adaptador | ✅ Granular |
| T22 | 1 service | ✅ Granular |
| T23 | 1 filtro + 1 pipe — mesma preocupação (borda HTTP de erro/validação) | ⚠️ OK (coeso) |
| T24 | módulo transversal inteiro (session + guards + decorators + seed) — cadeia de dependência única | ⚠️ Fat, mantido inteiro (padrão do backbone de auth) |
| T25–T28 | 1 controller / fatia de rota cada | ✅ Granular |
| T29 | rotas P2 sobre controllers existentes — modificação focada | ⚠️ OK (coeso) |
| T30–T32 | 1 arquivo de teste + ajustes mínimos cada | ✅ Granular |

Nenhuma task cria múltiplos componentes não relacionados. T3, T4 e T7 concentram regra numa entidade/camada só (rich domain model — a regra e o dado que ela protege ficam juntos). T24 é a única perto de 1,5× do budget — cadeia única de backbone de auth.

---

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Arestas no diagrama | Status |
| ---- | ------------------ | ------------------- | ------ |
| T1 | None | — | ✅ |
| T2 | None | — | ✅ |
| T3 | None | — | ✅ |
| T4 | T2 | T2→T4 | ✅ |
| T5 | None | — | ✅ |
| T6 | None | — | ✅ |
| T7 | None | — | ✅ |
| T8 | T3, T4, T5, T6, T7 | T3→T8, T4→T8, T5→T8, T6→T8, T7→T8 | ✅ |
| T9 | T4, T6, T7 | T4→T9, T6→T9, T7→T9 | ✅ |
| T10 | T3, T6, T7 | T3→T10, T6→T10, T7→T10 | ✅ |
| T11 | T3, T6, T7 | T3→T11, T6→T11, T7→T11 | ✅ |
| T12 | T3, T5, T7, T8 | T3→T12, T5→T12, T7→T12, T8→T12 | ✅ |
| T13 | T2, T4, T7, T9 | T2→T13, T4→T13, T7→T13, T9→T13 | ✅ |
| T14 | T3, T4, T5 | T3→T14, T4→T14, T5→T14 | ✅ |
| T15 | T14 | T14→T15 | ✅ |
| T16 | T15 | T15→T16 | ✅ |
| T17 | T15, T16, T8, T9 | T15→T17, T16→T17, T8→T17, T9→T17 | ✅ |
| T18 | T15, T16, T7 | T15→T18, T16→T18, T7→T18 | ✅ |
| T33 | T8, T17 | T8→T33, T17→T33 | ✅ |
| T19 | T15 | T15→T19 | ✅ |
| T20 | T15 | T15→T20 | ✅ |
| T21 | T15 | T15→T21 | ✅ |
| T22 | T5, T21, T17 | T5→T22, T21→T22, T17→T22 | ✅ |
| T23 | T6, T16 | T6→T23, T16→T23 | ✅ |
| T24 | T18, T19, T23 | T18→T24, T19→T24, T23→T24 | ✅ |
| T25 | T8, T20, T22, T24, T33 | T8→T25, T20→T25, T22→T25, T24→T25, T33→T25 | ✅ |
| T26 | T9, T24 | T9→T26, T24→T26 | ✅ |
| T27 | T10, T11, T24 | T10→T27, T11→T27, T24→T27 | ✅ |
| T28 | T22, T24 | T22→T28, T24→T28 | ✅ |
| T29 | T12, T13, T25, T26 | T12→T29, T13→T29, T25→T29, T26→T29 | ✅ |
| T30 | T25, T27, T28 | T25→T30, T27→T30, T28→T30 | ✅ |
| T31 | T25, T27 | T25→T31, T27→T31 | ✅ |
| T32 | T28 | T28→T32 | ✅ |

Toda dependência aponta para trás (fase anterior) ou para uma task anterior na mesma fase. Paridade completa.

---

## Test Co-location Validation

| Task | Layer criado/modificado | Matrix exige | Task diz | Status |
| ---- | ----------------------- | ------------ | -------- | ------ |
| T1 | VO de domínio (`Cnpj`) | unit | unit | ✅ |
| T2 | VO de domínio (`Senha`) | unit | unit | ✅ |
| T3 | regra de negócio em entidade (`Empresa` — máquina de estados) | unit | unit | ✅ |
| T4 | regra de negócio em entidade (`User` — bloqueio) | unit | unit | ✅ |
| T5 | regra de negócio em entidade (`Arquivo` — factory) | unit | unit | ✅ |
| T6 | erros de aplicação | none | none | ✅ |
| T7 | portas + test doubles (não-produção) | none | none | ✅ |
| T8–T13 | casos de uso | unit | unit | ✅ |
| T14 | schema/migration/config | none | none | ✅ |
| T15 | `PrismaService` / módulo Nest | none | none | ✅ |
| T16 | harness e2e + smoke | e2e | e2e | ✅ |
| T17 | adaptador Prisma + mapper | e2e | e2e | ✅ |
| T18 | adaptador Prisma + mapper | e2e | e2e | ✅ |
| T33 | boundary de transação c/ Prisma (`UnitOfWork`) | e2e | e2e | ✅ |
| T19 | adaptador sem I/O de rede/DB (hash/token) | unit | unit | ✅ |
| T20 | adaptador de mail (log) | unit | unit | ✅ |
| T21 | adaptador de disco (I/O local) | unit | unit | ✅ |
| T22 | service c/ Prisma + storage | e2e | e2e | ✅ |
| T23 | filtro + pipe (borda HTTP) | e2e | e2e | ✅ |
| T24 | session service c/ Prisma + guards | e2e | e2e | ✅ |
| T25–T28 | controllers | e2e | e2e | ✅ |
| T29 | controllers (mod) | e2e | e2e | ✅ |
| T30–T32 | suites e2e | e2e | e2e | ✅ |

Nenhuma violação. `Tests: none` só nas layers que a matrix marca como `none` (schema, glue de módulo Nest, erros de aplicação, portas). Nenhum teste é adiado para outra task.

---

## Requirement Traceability (rastreio task ↔ requisito)

| Requirement ID | Tasks |
| -------------- | ----- |
| EMP-01 | T3, T5, T7, T8, T14, T16, T20, T25, T31, T33 |
| EMP-02 | T1, T2, T6, T8, T23, T25, T33 |
| EMP-03 | T5, T7, T21, T22, T25, T28 |
| EMP-04 | T10, T20, T27, T31 |
| EMP-05 | T3, T10, T11, T23, T27 |
| EMP-06 | T6, T9, T19, T24, T25, T26 |
| EMP-07 | T4, T9, T24, T26 |
| EMP-08 | T3, T12, T29 |
| EMP-09 | T13, T18, T20, T29 |
| EMP-10 | T11, T27 |
| Edge Cases | T8, T22, T30, T31, T32 |

**Coverage:** 10 requisitos, 10 mapeados para tasks, 0 não mapeados.
