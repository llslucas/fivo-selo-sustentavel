# Cadastro e Autenticação de Empresa Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

> **Restrição desta feature (2026-09-07):** trabalho escolar — **o código é escrito por mãos humanas**. O assistente produz specs/design/tasks/revisões; nenhuma linha de TypeScript em `src/` ou `test/` sai do assistente. A execução destas tasks é feita pelo usuário; o assistente pode revisar diffs e apontar gaps contra os ACs.

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

Ordem: T14 … T18.

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
- [ ] `create` aceita CNPJ válido com máscara (`12.345.678/0001-95`) e sem máscara e normaliza para 14 dígitos
- [ ] Rejeita com `InvalidCnpjError` (`status` 422, mensagem "CNPJ inválido"): < 14 dígitos, > 14 dígitos, DV incorreto, string vazia, string não-numérica
- [ ] Um caso confirma que `Left` não expõe um `Cnpj`
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest`
- [ ] Test count: ≥ 7 testes passam

**Tests**: unit
**Gate**: quick

**Commit**: `test(domain): cobre o value object Cnpj 1:1 com EMP-02`

---

### T2: Value object `Senha`

**What**: `Senha.criar(raw: string): Either<SenhaFracaError, Senha>` — regra: mínimo 10 caracteres (a spec não pede mais). `get valor(): string`. `SenhaFracaError` (`status` 422, mensagem "A senha deve ter no mínimo 10 caracteres"). Mesmo padrão do `Cnpj`. **A senha em texto claro nunca sai do VO** — o hash é responsabilidade do `Hasher` na fase de infra; o VO carrega o texto validado só até o caso de uso passar ao `Hasher`.
**Where**: `api/src/domain/fivo/entities/senha.ts`
**Depends on**: None
**Reuses**: `ValueObject`, `Either`, contrato de erro
**Requirement**: EMP-02

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `< 10` caracteres → `Left(SenhaFracaError)`; `>= 10` → `Right(Senha)`
- [ ] `SenhaFracaError` em `application/errors/senha-fraca.error.ts`
- [ ] Testes unit co-locados: 9, 10, 11 caracteres e string vazia
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest`
- [ ] Test count: ≥ 4 testes passam

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
- [ ] `EmpresaProps` reflete a lista acima; `numero: string`; sem `email`; sem setter público de campo governado por transição
- [ ] `aprovar` só de `PENDENTE_APROVACAO`; `rejeitar` só de `PENDENTE_APROVACAO` e com `motivo >= 20` (senão 422); `suspender` só de `APROVADA`; `reativar` só de `SUSPENSA`
- [ ] Toda transição fora do conjunto (incl. auto-transição, `REJEITADA`→qualquer) → `Left(TransicaoInvalidaError)` 409
- [ ] Transição válida seta `status` + `decididoPor` + `decididoEm` (+ `motivoDecisao`)
- [ ] `estaAprovada()` → `true` só em `APROVADA`
- [ ] `empresa.spec.ts` cobre 1:1 EMP-05 AC5 (todas as transições) + o caso do motivo curto
- [ ] `EmpresaFactory` atualizada (inclui `usuarioId`; permite `status` inicial)
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest`
- [ ] Test count: ≥ 12 testes passam

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
- [ ] `User.create` aceita `Senha` e assume `falhasLogin: 0`, timestamps `null`
- [ ] 4 falhas não bloqueiam; a 5ª dentro de 15 min bloqueia; `estaBloqueado` → `true` enquanto `agora < bloqueadoAte`, `false` depois
- [ ] `registrarFalhaDeLogin` reinicia a janela quando a 1ª falha tem > 15 min
- [ ] `registrarLoginOk` zera os três campos
- [ ] `user.spec.ts` cobre 1:1 EMP-07 AC3
- [ ] `UserFactory` atualizada (aceita `Senha` ou string convertida)
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest`
- [ ] Test count: ≥ 6 testes passam

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
- [ ] `LOGO_EMPRESA` com PNG/JPG/SVG válido, ≤ 5 MB, raster ≥ 512×512 → `Right(Arquivo)`
- [ ] MIME fora da lista do `tipo` → `Left` citando "formato"; `> 5 MB` → `Left` citando "tamanho"; raster `< 512` → `Left` citando "dimensão"
- [ ] SVG sem `svgConteudo` → `Left`; SVG com `<script>`/`<foreignObject>`/`onload=` → `Left`; SVG limpo → `Right`
- [ ] `ArquivoInvalidoError` (`status` 422) em `application/errors/`
- [ ] `arquivo.spec.ts` cobre 1:1 EMP-03 AC5/AC6 + os vetores de SVG
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest`
- [ ] Test count: ≥ 10 testes passam

**Tests**: unit
**Gate**: quick

**Commit**: `feat(domain): entidade Arquivo com factory validante por tipo`

---

### T6: Contrato uniforme de erro de aplicação

**What**: Padronizar todas as classes em `application/errors/` para carregar `readonly status: number` **de instância** e mensagem em pt-BR. Corrigir `WrongCredentialsError` (hoje `static readonly status`) → renomear para `CredenciaisInvalidasError`, `status` 401, mensagem "Credenciais inválidas". Manter `core/errors/NotAllowedError` e `ResourceNotFoundError` genéricos (a mensagem pt-BR final é montada no caso de uso ou no filtro). Documentar o contrato num comentário no barrel de erros.
**Where**: `api/src/domain/fivo/application/errors/`
**Depends on**: None
**Reuses**: `UseCaseError` (`core/types/use-case-error.ts`)
**Requirement**: EMP-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] Toda classe de erro de `application/errors/` tem `readonly status: number` de instância (nenhuma `static`)
- [ ] `CredenciaisInvalidasError` substitui `WrongCredentialsError`; nenhum import órfão
- [ ] `InvalidCnpjError`, `EmpresaAlreadyExistsError`, `UserAlreadyExistsError` com mensagens pt-BR revisadas
- [ ] `npx tsc -p tsconfig.json --noEmit` e `npx eslint` limpos; nenhum `*.spec.ts` existente quebra
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest`

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
- [ ] As 5 portas novas existem como `abstract class` sem dependência de infra (ESLint de `src/domain/**` passa)
- [ ] `EmpresaRepository.listarPorEstado` declarada
- [ ] Cada porta tem um test double em `api/test/` seguindo o padrão dos existentes
- [ ] `FakeStorage` permite forçar `StorageIndisponivelError`; `FakeMailer` permite inspecionar e forçar falha
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest`

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
- [ ] Dados válidos → `right({ empresaId })`, `User` (EMPRESA) + `Empresa` (`PENDENTE_APROVACAO`) no repositório, senha só como hash do `FakeHasher`
- [ ] Senha < 10 → `Left` 422; CNPJ inválido → `Left` 422 e **nada** persistido nem consultado antes
- [ ] E-mail ou CNPJ já usados → `Left` 409; CNPJ cujo único registro é `REJEITADA` → reaproveita → `PENDENTE_APROVACAO`
- [ ] `FakeMailer` em falha → ainda `right` + mensagem registrada como pendente/log (EMP-01 AC9)
- [ ] `criar-empresa.spec.ts` cobre cada linha acima 1:1 com os ACs
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest`
- [ ] Test count: ≥ 9 testes passam

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
- [ ] E-mail inexistente e senha errada → ambos `Left` 401 "Credenciais inválidas" (indistinguíveis)
- [ ] 5 falhas na mesma conta → `Left` 429 nas seguintes; sucesso zera os contadores
- [ ] Sucesso → `right({ token, papel })`, uma linha em `InMemorySessaoRepository` com o `sha256` do token (nunca o token cru)
- [ ] `Encrypter` não é mais importado por este arquivo
- [ ] `autenticar-usuario.spec.ts` cobre EMP-06 AC1/AC2 e EMP-07 AC3
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest`
- [ ] Test count: ≥ 6 testes passam

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
- [ ] Não-admin → `Left` 403, nenhum estado alterado, nenhuma linha de auditoria
- [ ] Aprovar `PENDENTE_APROVACAO` → `APROVADA` + `decididoPor`/`decididoEm` + 1 linha de auditoria + `Mailer(CADASTRO_APROVADO)`
- [ ] Rejeitar com motivo < 20 → `Left` 422; com motivo ok → `REJEITADA` + `motivoDecisao` + auditoria + `Mailer(CADASTRO_REJEITADO)` com o motivo
- [ ] Transição fora do conjunto (ex.: aprovar uma já `APROVADA`) → `Left` 409
- [ ] `Mailer` em falha → operação ainda conclui (`right`)
- [ ] `ListarFilaAprovacaoUseCase` devolve só `PENDENTE_APROVACAO` ordenadas asc com a projeção
- [ ] Specs co-locadas cobrem EMP-04 AC1/AC2/AC3, EMP-05 AC6/AC7 e o Independent Test da história
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest`
- [ ] Test count: ≥ 11 testes passam

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
- [ ] Suspender `APROVADA` → `SUSPENSA` + auditoria; reativar `SUSPENSA` → `APROVADA` + auditoria
- [ ] Suspender uma `PENDENTE_APROVACAO`/`REJEITADA` → `Left` 409; reativar uma não-`SUSPENSA` → `Left` 409
- [ ] Não-admin → `Left` 403
- [ ] `AssegurarEmpresaAprovada` → `Right` só para `APROVADA`; `Left` 403 "Cadastro ainda não aprovado" para `PENDENTE_APROVACAO`, `REJEITADA` e `SUSPENSA`
- [ ] Specs co-locadas cobrem EMP-10 AC1–AC3 (parte de dados), EMP-05 AC4 e o Independent Test
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest`
- [ ] Test count: ≥ 8 testes passam

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
- [ ] Alterar nome fantasia/telefone/endereço/`logoArquivoId` → persistido no repositório
- [ ] Tentar alterar `cnpj` → `Left` 422 com a mensagem exata
- [ ] Trocar e-mail → `emailPendente` setado, e-mail de login inalterado, `Mailer(EMAIL_CONFIRMACAO)` chamado
- [ ] `editar-dados-empresa.spec.ts` cobre EMP-08 AC1–AC5 e o Independent Test
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest`
- [ ] Test count: ≥ 6 testes passam

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
- [ ] `Solicitar` responde `Right` neutro exista ou não a conta; conta existente → 1 `TokenSenha` + `Mailer(SENHA_REDEFINICAO)`
- [ ] `Redefinir` com token válido → hash novo, token marcado usado, todas as sessões da conta revogadas
- [ ] Token expirado / já usado / inexistente → `Left` 400 com a mensagem exata
- [ ] Nova senha < 10 → `Left` 422
- [ ] Specs co-locadas cobrem EMP-09 AC1–AC4 e o Independent Test (senha antiga para de funcionar; sessões anteriores caem)
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest`
- [ ] Test count: ≥ 7 testes passam

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
- [ ] `npx prisma migrate dev --name init` gera `api/prisma/migrations/**` e aplica sem erro contra o Postgres do compose
- [ ] `schema.prisma` cobre as 6 tabelas com os mapeamentos e índices acima
- [ ] `.gitignore` cobre `.env` mas versiona `prisma/migrations`
- [ ] Gate check passa: `cd api && npm run build && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest`

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
- [ ] `PrismaService` conecta no boot e desconecta no shutdown
- [ ] `DatabaseModule` é `@Global()`, provê e exporta `PrismaService`
- [ ] `AppModule` continua subindo (`npm run start` → 404 em `/`)
- [ ] Gate check passa: `cd api && npm run build && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest`

**Tests**: none
**Gate**: build

**Commit**: `feat(api): PrismaService e DatabaseModule global`

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
- [ ] `criarAppDeTeste()` retorna app inicializada; `limparBanco()` trunca sem erro de FK
- [ ] `smoke.e2e-spec.ts` passa
- [ ] `jest-e2e.json` roda com `maxWorkers: 1` (suites compartilham um Postgres)
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json`

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
- [ ] `create` → `findById`/`findByCnpj`/`findByEmail` devolve entidade equivalente (`equals` + campos de valor)
- [ ] `listarPorEstado` respeita filtro e ordem
- [ ] Violação de unicidade (e-mail/cnpj) propaga um erro identificável (para o caso de uso mapear em 409)
- [ ] Mapper roundtrip coberto por e2e-spec dedicado contra o Postgres de teste
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json`
- [ ] Test count: ≥ 6 testes e2e passam

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
- [ ] Roundtrip de cada repositório contra o Postgres de teste
- [ ] `SessaoRepository.deslizar` atualiza `ultimoAcessoEm`; `revogarTodasDoUsuario` marca todas as linhas do usuário
- [ ] `RegistroAuditoriaRepository` não expõe `update`/`delete`
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json`
- [ ] Test count: ≥ 6 testes e2e passam

**Tests**: e2e
**Gate**: full

**Commit**: `feat(api): adaptadores Prisma de sessão, auditoria e token de senha`

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
- [ ] `Argon2Hasher.hash` produz string ≠ texto claro; `compare` → `true`/`false` corretos
- [ ] `GeradorTokenOpaco.gerar()` tem entropia ≥ 256 bits; `sha256` é determinístico
- [ ] Testes unit para os dois providers (co-locados)
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest`
- [ ] Test count: ≥ 5 testes passam

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
- [ ] `LogMailer.enviar` resolve sempre e registra `para` + `template`
- [ ] Os 5 templates declarados
- [ ] Teste unit do `LogMailer`
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest`
- [ ] Test count: ≥ 2 testes passam

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
- [ ] Roundtrip `salvar` → `ler` devolve os mesmos bytes; `remover` apaga
- [ ] Falha de escrita simulada (dir sem permissão) → `StorageIndisponivelError`
- [ ] Testes unit com diretório temporário (`os.tmpdir()`), limpo no `afterEach`
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest`
- [ ] Test count: ≥ 5 testes passam

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
- [ ] Aceita PNG/JPG/SVG válidos → linha `arquivo` + objeto no storage
- [ ] `Arquivo.criar` devolvendo `Left` → 422 com o limite (MIME divergente dos magic bytes, > 5 MB, raster < 512×512, SVG com script)
- [ ] Falha do storage → erro 503, nenhuma linha `arquivo` órfã
- [ ] `lerBytes` devolve os bytes e o mime do registro
- [ ] e2e via rota-probe (ou teste do service contra o Postgres de teste) cobre cada ramo
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json`
- [ ] Test count: ≥ 8 testes e2e passam

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
- [ ] Cada classe de erro de `application/errors/` mapeia para o `status` esperado (tabela Error Handling do design), verificado por rota-probe que lança cada uma
- [ ] `ZodValidationPipe` devolve 422 com o campo inválido
- [ ] Erro não-domínio (ex.: `NotFoundException` do Nest) mantém o comportamento padrão
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json`
- [ ] Test count: ≥ 6 testes e2e passam

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
- [ ] `SessionService.criar` grava só o `sha256`; cookie `sessao` httpOnly/SameSite=Lax (`secure` condicionado a env)
- [ ] `validar` rejeita token inexistente, revogado e expirado (`ultimoAcessoEm` > 8h → revoga); em sucesso desliza
- [ ] `AuthGuard` global: 401 sem cookie válido; `@Public` isenta; `RolesGuard`: 403 quando o papel não bate
- [ ] Seed cria um `ADMIN` idempotente
- [ ] e2e via rota-probe protegida: sem cookie → 401; sessão válida → 200; papel errado → 403; sessão revogada → 401; `ultimoAcessoEm` forçado a −9h → 401
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json`
- [ ] Test count: ≥ 7 testes e2e passam

**Tests**: e2e
**Gate**: full

**Commit**: `feat(api): backbone de autenticação (sessão opaca, guards, decorators)`

---

### T25: `CadastroEmpresaController` — autocadastro e dados próprios

**What**: `POST /empresas` (multipart: dados + `logo`, `@Public`) → o controller chama `ArquivoService.uploadImagem` para o logo (se veio) e depois `CriarEmpresaUseCase` com o `arquivoId`; 201 `{ id }`. `GET /empresas/me` (`@Roles(EMPRESA)`) → dados da própria empresa, 403 para recurso de outra. DTOs `zod`. Registrar controller + fiação de DI dos casos de uso → adaptadores no `HttpModule`/`AppModule`.
**Where**: `api/src/infra/http/`
**Depends on**: T8, T20, T22, T24
**Reuses**: `CriarEmpresaUseCase` (T8), `Mailer` (T20), `ArquivoService` (T22), guards (T24)
**Requirement**: EMP-01, EMP-02, EMP-03, EMP-06

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `POST /empresas` com dados válidos → 201 `{ id }`, empresa `PENDENTE_APROVACAO`, senha só como hash
- [ ] CNPJ inválido → 422 "CNPJ inválido" sem persistir; duplicado → 409; senha < 10 → 422; logo inválido → 422 com o limite; storage fora → 503
- [ ] Falha de e-mail → 201 mesmo assim
- [ ] `GET /empresas/me` → dados próprios; recurso de outra empresa → 403
- [ ] e2e cobre todos os ACs de EMP-01/02/03 e o Independent Test
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json`
- [ ] Test count: ≥ 12 testes e2e passam

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
- [ ] Login correto → 200 `{ papel }` + `Set-Cookie: sessao`
- [ ] E-mail inexistente e senha errada → ambos 401 "Credenciais inválidas"
- [ ] 5 falhas em 15 min → 429 nas seguintes
- [ ] `DELETE /sessoes/atual` → a requisição autenticada seguinte com o token antigo → 401
- [ ] Sessão inativa > 8h (tempo forçado no teste) → 401 na próxima requisição
- [ ] e2e cobre EMP-06/07 e o Independent Test (login por papel, 429, acesso cruzado 403)
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json`
- [ ] Test count: ≥ 8 testes e2e passam

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
- [ ] `GET /admin/empresas` lista da mais antiga para a mais recente com nome, CNPJ, e-mail, data
- [ ] `aprovacao` → `APROVADA` + admin + data-hora + e-mail; `rejeicao` com motivo < 20 → 422; com motivo ok → `REJEITADA` + motivo por e-mail
- [ ] `suspensao`/`reativacao` respeitam as transições; fora do conjunto → 409; segunda decisão concorrente → 409
- [ ] Não-admin em qualquer endpoint → 403, nenhum estado alterado
- [ ] Toda mudança gera linha em `registro_auditoria`
- [ ] e2e cobre EMP-04/05/10 e os Independent Tests
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json`
- [ ] Test count: ≥ 12 testes e2e passam

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
- [ ] Dono/admin → 200 com o `Content-Type` do registro e `nosniff`
- [ ] Não-dono → 403; id inexistente → 404
- [ ] Um SVG com script foi rejeitado no upload (T22), então nunca chega aqui — teste confirma o 422 no upload
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json`
- [ ] Test count: ≥ 5 testes e2e passam

**Tests**: e2e
**Gate**: full

**Commit**: `feat(api): entrega endurecida de arquivos`

---

### T29: Rotas P2 — edição cadastral e recuperação de senha

**What**: `PATCH /empresas/me` e `PATCH /empresas/me/email` + `POST /empresas/me/email/confirmacao` (`@Public`, identificada pelo token) → `EditarDadosEmpresaUseCase`; `POST /senha/recuperacao` (202 neutro) e `POST /senha/redefinicao` → os casos de uso de T13. DTOs `zod`.
**Where**: `api/src/infra/http/`
**Depends on**: T12, T13, T25, T26
**Reuses**: `EditarDadosEmpresaUseCase` (T12), casos de uso de senha (T13), controllers existentes (T25/T26)
**Requirement**: EMP-08, EMP-09

**Tools**:
- MCP: NONE
- Skill: NONE

**Done when**:
- [ ] `PATCH /empresas/me` altera nome fantasia/telefone/endereço/logo; `cnpj` → 422
- [ ] Troca de e-mail mantém o antigo ativo até `POST .../email/confirmacao` com token válido
- [ ] `POST /senha/recuperacao` → 202 neutro exista ou não a conta
- [ ] `POST /senha/redefinicao` com token válido → nova senha vale, antiga não, sessões anteriores caem; token inválido/expirado/usado → 400
- [ ] e2e cobre EMP-08 e EMP-09 e os Independent Tests
- [ ] Gate check passa: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json`
- [ ] Test count: ≥ 10 testes e2e passam

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

Ordem de execução (prosa): Fase 1 `T1 … T7` (T2 antes de T4; o resto sem ordem forçada) · Fase 2 `T8 → T9 → T10 → T11 → T12 → T13` · Fase 3 `T14 → T15 → T16 → T17 → T18` · Fase 4 `T19 → T20 → T21 → T22` · Fase 5 `T23 → T24 → T25 → T26 → T27 → T28 → T29` · Fase 6 `T30 → T31 → T32`.

Execução estritamente sequencial — sem paralelismo intra-fase.

**Batches previstos para o Execute** (~7 tasks/worker, fases inteiras): Fase 1 (7) → batch 1; Fase 2 (6) → batch 2; Fases 3+4 (9) → batch 3; Fase 5 (7) → batch 4; Fase 6 (3) → batch 5. Verifier ao final. As Fases 1–2 fecham a regra de negócio e podem ser executadas e verificadas isoladamente antes de qualquer trabalho de infra.

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
| T19 | T15 | T15→T19 | ✅ |
| T20 | T15 | T15→T20 | ✅ |
| T21 | T15 | T15→T21 | ✅ |
| T22 | T5, T21, T17 | T5→T22, T21→T22, T17→T22 | ✅ |
| T23 | T6, T16 | T6→T23, T16→T23 | ✅ |
| T24 | T18, T19, T23 | T18→T24, T19→T24, T23→T24 | ✅ |
| T25 | T8, T20, T22, T24 | T8→T25, T20→T25, T22→T25, T24→T25 | ✅ |
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
| EMP-01 | T3, T5, T7, T8, T14, T16, T20, T25, T31 |
| EMP-02 | T1, T2, T6, T8, T23, T25 |
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
