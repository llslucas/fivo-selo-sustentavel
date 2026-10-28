# Campanhas Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

> ## Divisão de autoria (AD-021)
>
> | Metade | Tasks | Autor | Quando |
> | ------ | ----- | ----- | ------ |
> | **Domínio**: erros, value objects, entidades, portas, doubles em memória, factories, casos de uso e os testes unit correspondentes | **T1–T27** (Fases 1–6) | 👤 **humano** (trabalho escolar) | agora |
> | **Infra**: Prisma, adaptadores, `ArquivoService`, e-mail, HTTP, OpenAPI, e2e | **T28–T40** (Fases 7–9) | 🤖 **agente** | só depois do gate de handoff |
>
> **O agente não escreve nem edita código em `src/domain/**`, `src/core/**`, `test/repositories/**` ou `test/factories/**` nesta feature.** Pode ler, revisar, rodar gates e escrever relatórios de verificação. A exceção é um pedido explícito do usuário, registrado no `STATE.md` (AD-021) antes de a primeira linha ser escrita.
>
> **Gate de handoff (entre T27 e T28):** o agente roda uma verificação independente do domínio (spec-anchored check + sensor de discriminação sobre `src/domain/**`) e escreve `validation-dominio.md`. Lacunas viram tasks humanas de correção. A Fase 7 só começa com esse relatório em PASS.

---

**Design**: `.specs/features/campanhas/design.md`
**Status**: Approved (2026-10-15) — issues de domínio #159–#185 (`docs/issues-campanhas.md`)

> **Escopo desta rodada: P1 do `api`** (CAMP-01…08, CAMP-11). Encerramento (CAMP-09), duplicação (CAMP-10) e o `web` ficam para rodadas posteriores. Arquitetura de **AD-017**: valor restrito → value object; regra de estado → método da entidade; regra entre registros → caso de uso.
>
> **Ordem de valor:** as Fases 1–6 fecham toda a regra de negócio de campanhas, verificável só com repositórios em memória e fakes. As Fases 7–9 são a camada de infra.
>
> **Retrabalho:** o rascunho de 2026-09-04 (`entities/campanha.ts`, `use-cases/criar-campanha.ts` + spec, `ports/database/campanha-repository.ts`, `test/repositories/in-memory-campanha-repository.ts`, `test/factories/campanha-factory.ts`) é reescrito no lugar por T13, T16 e T18. Nada nele está ligado à infra.

---

## Test Coverage Matrix

> Gerada do codebase, guidelines do projeto e spec — confirmar antes do Execute.
> **Guidelines encontradas:** nenhuma (`AGENTS.md`, `CONTRIBUTING.md`, thresholds de coverage no Jest — ausentes) → **strong defaults aplicados**, iguais à matriz validada em `cadastro-empresa` e `catalogo-instituicoes`.
> **Amostras existentes:** `src/domain/fivo/entities/*.spec.ts`, `src/domain/fivo/application/use-cases/*.spec.ts` (unit co-locado, `ts-jest`, `InMemory*Repository` + `Fake*` + `*Factory` em `test/`); `src/infra/mail/*.spec.ts` (unit de infra); `test/**/*.e2e-spec.ts` (Nest + Postgres descartável, `maxWorkers: 1`).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Value objects e entidades — `src/domain/fivo/entities/**` | unit | Todas as ramificações; 1:1 com os ACs; limites testados nos dois lados (último valor aceito e primeiro rejeitado) | `src/domain/fivo/entities/*.spec.ts` | `cd api && npx jest` |
| Casos de uso — `src/domain/fivo/application/use-cases/**` | unit | Todas as ramificações; happy + cada erro + cada edge case listado, com doubles em memória; asserção de "nada gravado" em todo caminho de erro | `src/domain/fivo/application/use-cases/*.spec.ts` | `cd api && npx jest` |
| Portas (`application/ports/**`), erros (`application/errors/**`), doubles (`test/repositories`, `test/factories`) | none | build gate; exercitados pelos testes dos casos de uso | — | build gate |
| Infra de e-mail — `src/infra/mail/**` | unit | Cada template novo enfileirado quando o transporte falha | `src/infra/mail/*.spec.ts` | `cd api && npx jest` |
| Adaptador Prisma + mapper | e2e | Ida e volta contra Postgres; datas sem deslocamento; CAS por `versao`; alteração pendente; CHECK e índice parcial | `test/database/*.e2e-spec.ts` | `cd api && npx jest --config ./test/jest-e2e.json` |
| `ArquivoService` (tipo novo, acesso) | e2e | PNG/JPEG aceitos, outros formatos e 5 MB + 1 byte rejeitados; dono x não-dono | `test/arquivo/*.e2e-spec.ts` | `cd api && npx jest --config ./test/jest-e2e.json` |
| Controllers, DTOs, guards — `src/infra/http/**` | e2e | Toda rota em escopo: happy + cada edge case listado + erros (401/403/404/409/422/503) | `test/http/*.e2e-spec.ts` | `cd api && npx jest --config ./test/jest-e2e.json` |
| Schema Prisma, migrations, módulos Nest | none | build gate + verificação de drift na T28 | — | build gate |
| Documento OpenAPI das rotas novas | e2e | Toda rota registrada documentada (o teste de paridade existente falha caso contrário) | `test/http/openapi*.e2e-spec.ts` | `cd api && npx jest --config ./test/jest-e2e.json` |

## Gate Check Commands

> Gerada do codebase — confirmar antes do Execute.
> **Pré-requisito dos gates `full` e `build` (Fases 7–9):** Postgres de teste no ar e migrado —
> `cd api && docker compose -f docker-compose.test.yml up -d && npx prisma migrate deploy`

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com unit (Fases 1–6, T30) | `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest` |
| Full | Tasks com e2e (Fases 7–9) | `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json` |
| Build | Fim de fase, ou tasks só de schema/config | `cd api && npm run build && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json` |

---

## Execution Plan

Fases são ordenadas e rodam em sequência — cada fase completa antes da próxima, e as tasks dentro de uma fase executam em ordem. Cada bloco lista as arestas de dependência cujo alvo está naquela fase (`origem → alvo`).

### Phase 1: Erros e value objects de texto e dinheiro 👤

```
T1 → T2
T1 → T3
T1 → T4
T1 → T5
T4 → T6
T5 → T6
```

### Phase 2: Beneficiada, datas, compromisso e tipo de arquivo 👤

T11 não tem dependência e pode ser feita a qualquer momento da fase.

```
T1 → T7
T1 → T8
T8 → T9
T6 → T10
T7 → T10
T9 → T10
```

### Phase 3: Entidades 👤

```
T10 → T12
T2 → T13
T3 → T13
T4 → T13
T10 → T13
T13 → T14
T12 → T15
T14 → T15
```

### Phase 4: Portas e doubles 👤

T17 não tem dependência.

```
T15 → T16
```

### Phase 5: Casos de uso da empresa 👤

```
T16 → T18
T16 → T19
T16 → T20
T16 → T21
```

### Phase 6: Casos de uso do administrador e consulta pública 👤

Termina com o **gate de handoff** (`validation-dominio.md` em PASS).

```
T16 → T22
T16 → T23
T16 → T24
T17 → T24
T16 → T25
T16 → T26
T17 → T26
T16 → T27
```

### Phase 6b: Hardening do domínio 🤖 (exceção AD-021)

Aberta pela rodada 1 do gate de handoff. T41, T42, T43, T46, T47, T49 e T50 não têm dependência dentro da fase. A rodada 2 do gate deu FAIL e acrescentou T51–T53, sem dependência entre si. A rodada 3 do gate deu **PASS** (2026-10-27).

```
T46 → T44
T48 → T45
```

### Phase 7: Persistência, arquivo e e-mail 🤖

T28 não tem dependência dentro do código de infra; depende do gate de handoff.

```
T28 → T29
T16 → T29
T17 → T30
T28 → T31
T11 → T31
```

### Phase 8: HTTP 🤖

```
T29 → T32
T18 → T32
T21 → T32
T32 → T33
T19 → T33
T32 → T34
T31 → T34
T32 → T35
T20 → T35
T29 → T36
T30 → T36
T22 → T36
T23 → T36
T24 → T36
T36 → T37
T25 → T37
T26 → T37
T29 → T38
T31 → T38
T27 → T38
```

### Phase 9: Fechamento 🤖

```
T35 → T39
T37 → T39
T38 → T39
T39 → T40
```

---

## Task Breakdown

### T1: Erros de aplicação de campanha

**What**: Criar os erros novos do design, cada um com `status` e mensagem exatos.
**Where**: `src/domain/fivo/application/errors/` (um arquivo por erro, no padrão `*.error.ts`)
**Depends on**: None
**Reuses**: `transicao-invalida.error.ts`, `motivo-insuficiente.error.ts` (formato)
**Requirement**: CAMP-01, CAMP-02, CAMP-05, CAMP-06, CAMP-08
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] 422: `NomeCampanhaInvalidoError` ("O nome deve ter entre 3 e 80 caracteres"), `DescricaoCampanhaInvalidaError` ("A descrição deve ter no máximo 2000 caracteres"), `ValorMonetarioInvalidoError`, `PercentualInvalidoError`, `DataInvalidaError`, `VigenciaInvalidaError` ("A data de fim deve ser posterior à data de início"), `VigenciaVencidaError` ("A data de fim deve ser posterior à data atual"), `CamposPendentesError` (com `campos: string[]` público)
- [x] 409: `CampanhaEmAnaliseError` ("Campanha em análise não pode ser editada"), `AlteracaoJaPendenteError` ("Já existe uma alteração em análise"), `BeneficiadaIndisponivelNaDecisaoError` ("A beneficiada não está mais disponível no catálogo")
- [x] Mensagens de `ValorMonetarioInvalidoError` e `PercentualInvalidoError` iguais às do design §Value objects; `DataInvalidaError` = "Data inválida. Use o formato AAAA-MM-DD"; `CamposPendentesError` = "Preencha os campos obrigatórios antes de enviar para análise"
- [x] Gate `quick` passa

**Tests**: none (erros — build gate; as mensagens são asseridas nos testes dos VOs e casos de uso)
**Gate**: quick
**Commit**: `feat(api): erros de aplicação de campanha`

---

### T2: Value object `NomeCampanha`

**What**: VO que faz trim e aceita 3–80 caracteres.
**Where**: `src/domain/fivo/entities/nome-campanha.ts`
**Depends on**: T1
**Reuses**: `cnpj.ts` (fábrica estática devolvendo `Either`)
**Requirement**: CAMP-01
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Criação): AC3.

**Done when**:

- [x] `NomeCampanha.criar(bruto)` devolve `Either<NomeCampanhaInvalidoError, NomeCampanha>`; o valor guardado já vem sem espaços nas pontas
- [x] `nome-campanha.spec.ts` cobre 2 e 81 caracteres (rejeitados), 3 e 80 (aceitos), e `"  ab  "` (rejeitado depois do trim)
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): value object NomeCampanha`

---

### T3: Value object `DescricaoCampanha`

**What**: VO que aceita até 2000 caracteres e guarda o texto como veio, sem escape.
**Where**: `src/domain/fivo/entities/descricao-campanha.ts`
**Depends on**: T1
**Reuses**: padrão de T2
**Requirement**: CAMP-01
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Criação): AC4; Edge case de HTML na descrição.

**Done when**:

- [x] 2000 caracteres aceitos, 2001 rejeitados com a mensagem de T1
- [x] `<script>alert(1)</script>` é aceito e devolvido idêntico
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): value object DescricaoCampanha`

---

### T4: Value object `ValorMonetario`

**What**: VO que faz o parse de string decimal (`"1.50"`) para centavos inteiros, de R$ 0,01 a R$ 999.999,99, com no máximo 2 casas.
**Where**: `src/domain/fivo/entities/valor-monetario.ts`
**Depends on**: T1
**Reuses**: padrão de T2
**Requirement**: CAMP-02
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Criação): AC5, AC8.

**Done when**:

- [x] `ValorMonetario.deDecimal(texto)` aceita `^\d{1,6}(\.\d{1,2})?$`; expõe `centavos: number`; `"1.5"` → 150, `"0.01"` → 1, `"999999.99"` → 99999999
- [x] Rejeita `"0"`, `"0.00"`, `"1000000"`, `"1.234"`, `"-1"`, `"1,50"`, `"abc"` e string vazia
- [x] Nenhuma conta passa por `number` com casas decimais (sem `parseFloat * 100`)
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): value object ValorMonetario em centavos`

---

### T5: Value object `Percentual`

**What**: VO que faz o parse de string decimal para centésimos de ponto (1 = 0,01%), de 0,01 a 100,00, com no máximo 2 casas.
**Where**: `src/domain/fivo/entities/percentual.ts`
**Depends on**: T1
**Reuses**: padrão de T4
**Requirement**: CAMP-02
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Criação): AC6.

**Done when**:

- [x] `"0.01"` → 1, `"100"` → 10000, `"12.5"` → 1250
- [x] Rejeita `"0"`, `"100.01"`, `"1.234"`, `"-5"` e string vazia
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): value object Percentual em centésimos`

---

### T6: Value object `RegraDoacao`

**What**: VO com `tipo` (`POR_UNIDADE` | `PERCENTUAL`) que exige só o valor do próprio tipo.
**Where**: `src/domain/fivo/entities/regra-doacao.ts`
**Depends on**: T4, T5
**Reuses**: `invalid-rule-value.error.ts` (já existente)
**Requirement**: CAMP-02
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Criação): AC5, AC6, AC7.

**Done when**:

- [x] `RegraDoacao.criar({ tipo, valor?, percentual? })` devolve `Either`, propagando os erros de `ValorMonetario`/`Percentual`
- [x] `POR_UNIDADE` com `percentual` presente, ou `PERCENTUAL` com `valor` presente → `InvalidRuleValueError`; tipo sem o próprio valor → `InvalidRuleValueError`
- [x] Getters expõem os VOs internos; nenhum setter
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): value object RegraDoacao`

---

### T7: Value object `Beneficiada`

**What**: VO XOR entre `instituicaoId` e `causaId`.
**Where**: `src/domain/fivo/entities/beneficiada.ts`
**Depends on**: T1
**Reuses**: `beneficiada-ambigua.error.ts` (já existente)
**Requirement**: CAMP-03
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Criação): AC9.

**Done when**:

- [x] Os dois ids ou nenhum → `BeneficiadaAmbiguaError` ("Informe exatamente uma beneficiada: instituição ou causa")
- [x] Expõe `tipo` (`INSTITUICAO` | `CAUSA`) e `id`
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): value object Beneficiada`

---

### T8: Value object `DataCalendario`

**What**: VO de data sem hora (`AAAA-MM-DD`), com "hoje" calculado no fuso America/Sao_Paulo.
**Where**: `src/domain/fivo/entities/data-calendario.ts`
**Depends on**: T1
**Reuses**: nenhum (primeira data sem hora do projeto)
**Requirement**: CAMP-01, CAMP-05, CAMP-11
**Autor**: 👤 humano
**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `criar(texto)` rejeita formato inválido e datas inexistentes (`2026-02-30`, `2026-13-01`) com `DataInvalidaError`
- [x] `hojeEm(agora: Date)` usa `Intl.DateTimeFormat` com `timeZone: 'America/Sao_Paulo'`; teste com `2026-10-16T02:30:00Z` devolve `2026-10-15`
- [x] `ehAnteriorA`, `ehPosteriorA`, `equals` e `toString()` (`AAAA-MM-DD`)
- [x] Gate `quick` passa — `tsc`/`jest` limpos; `eslint` isolado nos 2 arquivos do T8 limpo.

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): value object DataCalendario`

---

### T9: Value object `Vigencia`

**What**: VO com início obrigatório e fim opcional estritamente posterior ao início.
**Where**: `src/domain/fivo/entities/vigencia.ts`
**Depends on**: T8
**Reuses**: T8
**Requirement**: CAMP-01, CAMP-05, CAMP-11
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Criação): AC11, AC12; (Submissão) AC3 via `fimJaPassouEm`; (Consulta pública) AC4 via `naoIniciadaEm`.

**Done when**:

- [x] Fim igual ou anterior ao início → `VigenciaInvalidaError`; fim no dia seguinte ao início aceito
- [x] Início anterior à data atual aceito (sem validação contra "hoje")
- [x] `fimJaPassouEm(hoje)` é `true` quando fim ≤ hoje e `false` sem fim; `naoIniciadaEm(hoje)` é `true` só quando início > hoje
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): value object Vigencia`

---

### T10: Value object `Compromisso`

**What**: VO completo com beneficiada, regra de doação e vigência, usado como retrato da versão aprovada e da alteração proposta.
**Where**: `src/domain/fivo/entities/compromisso.ts`
**Depends on**: T6, T7, T9
**Reuses**: T6, T7, T9
**Requirement**: CAMP-08
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `Compromisso.criar({ beneficiada, regraDoacao, vigencia })` exige os três (tipos obrigatórios, sem `Either`)
- [x] `mesclar(parcial)` devolve um novo `Compromisso` com os campos informados substituídos e o original intacto
- [x] `equals` distingue mudança em cada um dos três campos
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): value object Compromisso`

---

### T11: `Arquivo` — tipo `IMAGEM_CAMPANHA`

**What**: Acrescentar o tipo de capa de campanha às três tabelas por tipo de `Arquivo.criar`.
**Where**: `src/domain/fivo/entities/arquivo.ts`
**Depends on**: None
**Reuses**: entradas de `LOGO_EMPRESA`
**Requirement**: CAMP-01
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Criação): AC13.

**Done when**:

- [x] `IMAGEM_CAMPANHA`: formatos `image/png` e `image/jpeg` (sem SVG), limite 5 MB, sem checagem de 512×512
- [x] `arquivo.spec.ts` cobre PNG e JPEG aceitos, SVG e PDF rejeitados, 5 MB aceito e 5 MB + 1 byte rejeitado
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): tipo de arquivo para capa de campanha`

---

### T12: Entidade `AlteracaoCompromisso`

**What**: Entidade filha com compromisso proposto e anterior, estado próprio e dados da decisão.
**Where**: `src/domain/fivo/entities/alteracao-compromisso.ts`
**Depends on**: T10
**Reuses**: `instituicao.ts` (`aprovar/rejeitar` com `decididoPor`/`decididoEm`/motivo)
**Requirement**: CAMP-08
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Alteração): AC6, AC8 (motivo ≥ 20 caracteres).

**Done when**:

- [x] `AlteracaoStatus`: `EM_ANALISE`, `APROVADA`, `REJEITADA`; nasce `EM_ANALISE`
- [x] `aprovar(adminId)` e `rejeitar(adminId, motivo)` devolvem `Either`; decidir fora de `EM_ANALISE` → `TransicaoInvalidaError`; motivo com trim < 20 → `MotivoInsuficienteError`
- [x] Nenhum setter público
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): entidade AlteracaoCompromisso`

---

### T13: `Campanha` — rascunho, edição e submissão (retrabalho)

**What**: Reescrever a entidade do rascunho de 2026-09-04 no padrão do AD-017: props do design, `criar`, `editarTextos`, `editarCompromisso` fora de `APROVADA`, `submeter`, `camposPendentes`.
**Where**: `src/domain/fivo/entities/campanha.ts`
**Depends on**: T2, T3, T4, T10
**Reuses**: `instituicao.ts` (estrutura), VOs de T2–T10
**Requirement**: CAMP-01, CAMP-02, CAMP-03, CAMP-04, CAMP-05
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Criação): AC2 (nasce `RASCUNHO`), AC12, AC15, AC16 (`idPublico` distinto do `id`); (Submissão) AC1, AC2, AC3, AC5, AC12, AC13 para `RASCUNHO → EM_ANALISE` e `REJEITADA → RASCUNHO`.

**Done when**:

- [x] Props e `CampanhaStatus` exatamente como no design §`Campanha`; camelCase; ids como `UniqueEntityId`; nenhum setter público
- [x] `criar({ empresaId, nome })` gera `idPublico` novo e diferente do `id`, `versao = 0`
- [x] `editarTextos` e `editarCompromisso`: aplicam em `RASCUNHO`; em `REJEITADA` aplicam e voltam para `RASCUNHO` mantendo `motivoUltimaRejeicao`; em `EM_ANALISE` → `CampanhaEmAnaliseError`
- [x] `submeter(hoje)`: só em `RASCUNHO`; lista **todos** os campos pendentes (`descricao`, `beneficiada`, `regraDoacao`, `vigencia.inicio`) num só `CamposPendentesError`; fim ≤ hoje → `VigenciaVencidaError`; sucesso grava `EM_ANALISE` e `submetidaEm`
- [x] `submeter` fora de `RASCUNHO` → `TransicaoInvalidaError`
- [x] `test/factories/campanha-factory.ts`, `test/repositories/in-memory-campanha-repository.ts` e `criar-campanha.ts` + spec continuam compilando e verdes (ajuste mecânico; o caso de uso é reescrito em T18)
- [x] `campanha.spec.ts` cobre cada item acima, um ramo por teste
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(api): Campanha vira entidade rica com rascunho e submissão`

---

### T14: `Campanha` — decisões do administrador

**What**: Acrescentar `aprovar`, `rejeitar`, `estaAptaASelo`, `estaPublicada` e `compromissoVigente`.
**Where**: `src/domain/fivo/entities/campanha.ts` (modificar)
**Depends on**: T13
**Reuses**: `instituicao.ts` (`aprovar/rejeitar`)
**Requirement**: CAMP-05, CAMP-06
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Submissão): AC7, AC8, AC10, AC11 (estado e motivo), AC13 (`EM_ANALISE → APROVADA | REJEITADA`; qualquer outra → 409).

**Done when**:

- [x] `aprovar(adminId)`: `EM_ANALISE → APROVADA`, grava `decididoPor`/`decididoEm`
- [x] `rejeitar(adminId, motivo)`: `EM_ANALISE → REJEITADA`, motivo com trim ≥ 20 (`MotivoInsuficienteError` sem mudar estado), grava `motivoUltimaRejeicao`
- [x] Aprovar ou rejeitar em `RASCUNHO`, `APROVADA` ou `REJEITADA` → `TransicaoInvalidaError`
- [x] `estaAptaASelo()` e `estaPublicada()` são `true` só em `APROVADA` (teste em cada um dos 4 estados)
- [x] `compromissoVigente()` devolve `Compromisso` quando os três campos existem e `null` caso contrário
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): decisões do administrador na Campanha`

---

### T15: `Campanha` — alteração de compromisso aprovada

**What**: Em `APROVADA`, `editarTextos` aplica direto e `editarCompromisso` abre uma `AlteracaoCompromisso`; acrescentar `aprovarAlteracao` e `rejeitarAlteracao`.
**Where**: `src/domain/fivo/entities/campanha.ts` (modificar)
**Depends on**: T12, T14
**Reuses**: T10 (`mesclar`), T12
**Requirement**: CAMP-07, CAMP-08
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Alteração): AC1, AC2, AC3, AC4, AC6, AC8, AC9.

**Done when**:

- [x] Em `APROVADA`, `editarTextos` (nome, descrição, capa, meta) aplica sem mudar o estado e sem abrir alteração
- [x] Em `APROVADA`, `editarCompromisso` cria alteração com `proposto = compromissoVigente().mesclar(parcial)` e `anterior = compromissoVigente()`; a campanha segue `APROVADA` e `compromissoVigente()` continua o anterior
- [x] Segunda `editarCompromisso` com alteração pendente → `AlteracaoJaPendenteError`
- [x] `aprovarAlteracao` copia o proposto para a campanha e limpa a pendência; `rejeitarAlteracao` mantém os valores anteriores, guarda o motivo na alteração e limpa a pendência; os dois sem pendência → `TransicaoInvalidaError`
- [x] `idPublico` igual antes e depois de cada operação (asserido)
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): alteração de compromisso em campanha aprovada`

---

### T16: Porta `CampanhaRepository`, double em memória e factory (retrabalho)

**What**: Reescrever a porta com `findById`, `findByIdPublico`, `create`, `salvar(campanha, versaoEsperada)` e `listarEmAnalise`, e o double e a factory correspondentes.
**Where**: `src/domain/fivo/application/ports/database/campanha-repository.ts`
**Depends on**: T15
**Reuses**: `in-memory-instituicao-repository.ts` (CAS de `salvarTransicao`)
**Requirement**: CAMP-05, CAMP-06, CAMP-08
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `salvar` devolve `false` sem gravar quando a `versao` guardada difere de `versaoEsperada`; em sucesso grava e incrementa `versao`
- [x] `listarEmAnalise` devolve campanhas `EM_ANALISE` e campanhas `APROVADA` com alteração pendente
- [x] `InMemoryCampanhaRepository` reescrito com esse contrato, guardando cópias para que mutação fora do `salvar` não vaze
- [x] `CampanhaFactory` monta campanhas em qualquer estado (rascunho vazio, completa, `EM_ANALISE`, `APROVADA`, `APROVADA` com alteração)
- [x] Gate `quick` passa

**Tests**: none (porta + doubles — build gate; exercitados pelos casos de uso)
**Gate**: quick
**Commit**: `refactor(api): repositório de campanha com bloqueio otimista por versão`

---

### T17: Templates de e-mail de campanha

**What**: Acrescentar `CAMPANHA_REJEITADA` e `ALTERACAO_CAMPANHA_REJEITADA` a `TemplateEmail`.
**Where**: `src/domain/fivo/application/ports/mailer.ts`
**Depends on**: None
**Reuses**: `CADASTRO_REJEITADO`
**Requirement**: CAMP-05, CAMP-08
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Os dois valores existem no enum, com valor igual ao nome
- [x] Gate `quick` passa

**Tests**: none (porta — build gate)
**Gate**: quick
**Commit**: `feat(api): templates de e-mail de rejeição de campanha`

---

### T18: `CriarCampanhaUseCase` (retrabalho)

**What**: Reescrever o caso de uso: empresa aprovada, VOs a partir de primitivos, beneficiada disponível quando informada, `Campanha.criar` + edições, `create`.
**Where**: `src/domain/fivo/application/use-cases/criar-campanha.ts`
**Depends on**: T16
**Reuses**: `AssegurarEmpresaAprovadaUseCase`, `AssegurarBeneficiadaDisponivelUseCase` (compostos por injeção)
**Requirement**: CAMP-01, CAMP-02, CAMP-03, CAMP-04
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Criação): AC1, AC2, AC3–AC11, AC12, AC16.

**Done when**:

- [x] Empresa não aprovada → `NotAllowedError('Cadastro ainda não aprovado')` e nada gravado
- [x] Só nome → `RASCUNHO` com `{ id, idPublico }` devolvidos
- [x] Cada VO inválido devolve o erro do VO e nada é gravado (um teste por VO)
- [x] Beneficiada indisponível → `BeneficiadaIndisponivelError`; beneficiada dupla → `BeneficiadaAmbiguaError`; ausente não chama a guarda
- [x] `@Injectable()`; `criar-campanha.spec.ts` reescrito, um ramo por teste
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): criação de campanha em rascunho`

---

### T19: `EditarCampanhaUseCase`

**What**: Editar campos parciais de uma campanha própria; a entidade decide entre aplicar, reabrir rascunho ou abrir alteração.
**Where**: `src/domain/fivo/application/use-cases/editar-campanha.ts`
**Depends on**: T16
**Reuses**: T18 (montagem de VOs), `RegistroAuditoriaRepository`
**Requirement**: CAMP-01, CAMP-07, CAMP-08
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Criação): AC1, AC15, AC18; (Submissão) AC5, AC12; (Alteração) AC1, AC2, AC4, AC5, AC10 (abertura).

**Done when**:

- [x] Empresa não aprovada → 403; campanha de outra empresa ou inexistente → `ResourceNotFoundError`, nada gravado
- [x] Beneficiada nova indisponível → `BeneficiadaIndisponivelError`
- [x] `salvar` com `false` → `TransicaoInvalidaError`
- [x] Auditoria `CAMPANHA_REABERTA` quando `REJEITADA → RASCUNHO` e `ALTERACAO_CAMPANHA_ABERTA` com compromissos anterior e proposto; edição simples não audita
- [x] Devolve o detalhe da campanha (mesmo read model de T21)
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): edição de campanha com reanálise de compromisso`

---

### T20: `SubmeterCampanhaUseCase`

**What**: Submeter uma campanha própria em rascunho, checando beneficiada disponível e "hoje" em São Paulo.
**Where**: `src/domain/fivo/application/use-cases/submeter-campanha.ts`
**Depends on**: T16
**Reuses**: guardas compostas, `DataCalendario.hojeEm`
**Requirement**: CAMP-05, CAMP-06
**Autor**: 👤 humano

**ACs cobertos** (Submissão): AC1, AC2, AC3, AC4, AC13, AC15; Edge case de submissão duplicada.

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Empresa não aprovada → 403; campanha alheia → 404
- [x] Campos pendentes → `CamposPendentesError` com a lista completa
- [x] Fim ≤ hoje (com `jest.useFakeTimers`) → `VigenciaVencidaError`; beneficiada indisponível → `BeneficiadaIndisponivelError`
- [x] Segunda submissão → `TransicaoInvalidaError`; `salvar` com `false` → `TransicaoInvalidaError`
- [x] Auditoria `CAMPANHA_SUBMETIDA` com autor, estados anterior e novo e data-hora
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): submissão de campanha para análise`

---

### T21: `ConsultarCampanhaDaEmpresaUseCase`

**What**: Detalhe de uma campanha própria, com estado, motivo da última rejeição e alteração pendente.
**Where**: `src/domain/fivo/application/use-cases/consultar-campanha-da-empresa.ts`
**Depends on**: T16
**Reuses**: `CampanhaRepository.findById`
**Requirement**: CAMP-01
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Criação): AC17, AC18.

**Done when**:

- [x] Read model `CampanhaDetalhe` com valores em string decimal e datas `AAAA-MM-DD`
- [x] Campanha alheia ou inexistente → `ResourceNotFoundError`
- [x] Funciona para empresa em qualquer estado (leitura não exige aprovação)
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): detalhe da campanha para a empresa dona`

---

### T22: `ListarFilaCampanhasUseCase`

**What**: Fila do administrador com campanhas em análise e alterações pendentes, da mais antiga para a mais recente.
**Where**: `src/domain/fivo/application/use-cases/listar-fila-campanhas.ts`
**Depends on**: T16
**Reuses**: `listar-fila-instituicoes.ts`
**Requirement**: CAMP-05
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Submissão): AC6, AC14.

**Done when**:

- [x] Não-ADMIN → `NotAllowedError`
- [x] Item: `tipo` (`NOVA` | `ALTERACAO`), empresa (`nomeFantasia`), nome, beneficiada (tipo + nome), regra, vigência e `submetidoEm` (submissão ou abertura da alteração); na alteração, os valores mostrados são os propostos
- [x] Ordenação ascendente por `submetidoEm` misturando os dois tipos (teste com três itens intercalados)
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): fila de análise de campanhas`

---

### T23: `AprovarCampanhaUseCase`

**What**: Aprovar uma campanha em análise, com beneficiada ainda disponível.
**Where**: `src/domain/fivo/application/use-cases/aprovar-campanha.ts`
**Depends on**: T16
**Reuses**: `aprovar-instituicao.ts`
**Requirement**: CAMP-05, CAMP-06
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Submissão): AC7, AC8, AC9, AC13, AC14, AC15; Edge cases de beneficiada indisponível e decisão concorrente.

**Done when**:

- [x] Não-ADMIN → `NotAllowedError`, sem gravar; inexistente → `ResourceNotFoundError`
- [x] Beneficiada indisponível → `BeneficiadaIndisponivelNaDecisaoError` (409), estado inalterado
- [x] `salvar` com `false` → `TransicaoInvalidaError` (decisão concorrente exercitada contra o double)
- [x] Auditoria `CAMPANHA_APROVADA` com autor, estados e data-hora; depois disso `estaAptaASelo()` é `true`
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): aprovação de campanha pelo administrador`

---

### T24: `RejeitarCampanhaUseCase`

**What**: Rejeitar uma campanha em análise com motivo, auditar e notificar a empresa.
**Where**: `src/domain/fivo/application/use-cases/rejeitar-campanha.ts`
**Depends on**: T16, T17
**Reuses**: `rejeitar-instituicao.ts` (e-mail em try/catch)
**Requirement**: CAMP-05, CAMP-06
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Submissão): AC10, AC11, AC13, AC14, AC15.

**Done when**:

- [x] Não-ADMIN → 403 sem gravar; motivo curto → `MotivoInsuficienteError` sem gravar
- [x] Sucesso: `REJEITADA`, motivo persistido, auditoria `CAMPANHA_REJEITADA` com motivo, e-mail `CAMPANHA_REJEITADA` para o e-mail do usuário dono com `{ nomeCampanha, motivo }`
- [x] Falha do `Mailer` não desfaz a rejeição
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): rejeição de campanha com motivo e notificação`

---

### T25: `AprovarAlteracaoCampanhaUseCase`

**What**: Aprovar a alteração pendente de uma campanha aprovada.
**Where**: `src/domain/fivo/application/use-cases/aprovar-alteracao-campanha.ts`
**Depends on**: T16
**Reuses**: T23
**Requirement**: CAMP-08
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Alteração): AC6, AC7, AC9, AC10 (decisão).

**Done when**:

- [x] Não-ADMIN → 403; sem alteração pendente → `TransicaoInvalidaError`
- [x] Nova beneficiada indisponível → `BeneficiadaIndisponivelNaDecisaoError`, nada aplicado
- [x] Sucesso: `compromissoVigente()` passa a ser o proposto; auditoria `ALTERACAO_CAMPANHA_APROVADA` com compromissos anterior e novo
- [x] `salvar` com `false` → `TransicaoInvalidaError`
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): aprovação de alteração de campanha`

---

### T26: `RejeitarAlteracaoCampanhaUseCase`

**What**: Rejeitar a alteração pendente, mantendo a versão aprovada e notificando a empresa.
**Where**: `src/domain/fivo/application/use-cases/rejeitar-alteracao-campanha.ts`
**Depends on**: T16, T17
**Reuses**: T24
**Requirement**: CAMP-08
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Alteração): AC8, AC10 (decisão).

**Done when**:

- [x] Não-ADMIN → 403; motivo curto → 422; sem pendência → 409; nada gravado em nenhum dos três
- [x] Sucesso: campanha `APROVADA` com o compromisso anterior, motivo na alteração, auditoria `ALTERACAO_CAMPANHA_REJEITADA`, e-mail `ALTERACAO_CAMPANHA_REJEITADA`
- [x] Falha do `Mailer` não desfaz a decisão
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): rejeição de alteração de campanha`

---

### T27: `BuscarCampanhaPublicaUseCase`

**What**: Read model público da versão aprovada por `idPublico`, com o mesmo 404 para todo caso não publicado.
**Where**: `src/domain/fivo/application/use-cases/buscar-campanha-publica.ts`
**Depends on**: T16
**Reuses**: `listar-beneficiadas.ts` (read model por construção)
**Requirement**: CAMP-11
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Consulta pública): AC1, AC2, AC3, AC4; (Alteração) AC3; Edge case de empresa suspensa.

**Done when**:

- [x] `CampanhaPublica` tem nome, descrição, `temCapa`, nome da empresa, beneficiada (tipo + nome), regra, meta, vigência e `situacao`; o tipo **não** tem `id`, motivo nem alteração pendente
- [x] `ResourceNotFoundError('Campanha não encontrada')` idêntico para: inexistente, `RASCUNHO`, `EM_ANALISE`, `REJEITADA`, empresa `SUSPENSA` e `idPublico` que não é UUID
- [x] Com alteração pendente, devolve os valores aprovados anteriores
- [x] `situacao` `NAO_INICIADA` com início amanhã e `EM_ANDAMENTO` com início hoje (fake timers)
- [x] Gate `quick` passa — `tsc`/`jest` (11/11) limpos; `eslint` isolado nos 2 arquivos do T27 limpo.

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): consulta pública da campanha aprovada`

---

### Hardening do domínio (Fase 6b)

> Aberta pela rodada 1 do gate de handoff (`validation-dominio.md`, 2026-10-27, FAIL: 13 ACs com lacuna, 12 mutantes sobreviventes). Executada pelo agente por exceção do AD-021. Ordem: T46, T44, T47, T48, T49, T50, T41, T42, T43, T45. Depois dela, rodada 2 do gate; a Fase 7 só começa com PASS.

### T41: `Vigencia` — fim anterior ao início (Minor)

**What**: Cobrir o ramo "fim anterior ao início" da vigência, que hoje só é testado no caso igual.
**Where**: `src/domain/fivo/entities/vigencia.spec.ts`; `src/domain/fivo/application/use-cases/criar-campanha.spec.ts`
**Depends on**: None
**Requirement**: CAMP-01 (Criação AC11)
**Autor**: 🤖 agente (exceção AD-021, 2026-10-27)

**Done when**:

- [x] `vigencia.spec.ts` tem caso com fim um dia **antes** do início → `isLeft()` incondicional + `toBeInstanceOf(VigenciaInvalidaError)` + `status` 422 + mensagem "A data de fim deve ser posterior à data de início"
- [x] `criar-campanha.spec.ts` tem o mesmo caso pelo caso de uso, com "nada gravado"
- [x] Mutante M8 (`E/vigencia.ts:22`, remover `|| fim.ehAnteriorA(inicio)`) morre

**Tests**: unit
**Gate**: quick
**Commit**: `test(api): cobre vigência com fim anterior ao início`

---

### T42: `Campanha.rejeitar` — limite de 20 caracteres nos dois lados (Minor)

**What**: Testar em `Campanha.rejeitar` o motivo de exatamente 20 caracteres (aceito) e de 19 com espaços nas pontas (recusado). Hoje isso só é testado em `AlteracaoCompromisso`.
**Where**: `src/domain/fivo/entities/campanha.spec.ts`
**Depends on**: None
**Requirement**: CAMP-05 (Submissão AC10)
**Autor**: 🤖 agente (exceção AD-021, 2026-10-27)

**Done when**:

- [x] `'a'.repeat(20)` → `REJEITADA` e `motivoUltimaRejeicao` igual ao texto
- [x] `` `   ${'a'.repeat(19)}   ` `` → `MotivoInsuficienteError`, estado `EM_ANALISE`
- [x] Mutante M13 (`E/campanha.ts:266`, `< 20` → `< 21`) morre

**Tests**: unit
**Gate**: quick
**Commit**: `test(api): cobre limite de 20 caracteres em Campanha.rejeitar`

---

### T43: Mensagens literais da spec e de `CamposPendentesError` (Major)

**What**: Conferir o texto exato das mensagens que a spec cita e alinhar `CamposPendentesError` ao design.
**Where**: `src/domain/fivo/application/errors/campos-pendentes.error.ts`; `src/domain/fivo/entities/regra-doacao.spec.ts`; `src/domain/fivo/entities/campanha.spec.ts`; `src/domain/fivo/application/use-cases/editar-campanha.spec.ts`; `src/domain/fivo/application/use-cases/submeter-campanha.spec.ts`
**Depends on**: None
**Requirement**: CAMP-02 (Criação AC7), CAMP-05 (Submissão AC2, AC5), CAMP-08 (Alteração AC4)
**Autor**: 🤖 agente (exceção AD-021, 2026-10-27)

**Done when**:

- [x] `regra-doacao.spec.ts` confere `status` 422 e `message` "O Valor da regra deve corresponder à regra selecionada." (com o ponto final)
- [x] `editar-campanha.spec.ts` confere `message` "Campanha em análise não pode ser editada" e "Já existe uma alteração em análise", com `status` 409
- [x] `CamposPendentesError.message` é exatamente "Preencha os campos obrigatórios antes de enviar para análise", e a lista fica só em `campos`. `campanha.spec.ts:232-240` troca o `toContain(campo)` sobre a mensagem por `message).toBe(...)` + `campos).toEqual([...])`
- [x] Mutantes M37, M38 e M39 morrem

**Tests**: unit
**Gate**: quick
**Commit**: `fix(api): mensagens literais de campanha e CamposPendentesError`

---

### T44: `RejeitarAlteracaoCampanhaUseCase` — e-mail, auditoria completa e concorrência (Major)

**What**: Reescrever o setup do spec com empresa e usuário dono, e conferir o efeito de cada ramo pelo valor.
**Where**: `src/domain/fivo/application/use-cases/rejeitar-alteracao-campanha.spec.ts`
**Depends on**: T46 (a asserção de motivo persistido usa o contrato novo)
**Requirement**: CAMP-08 (Alteração AC8, AC10; edge case de decisão simultânea)
**Autor**: 🤖 agente (exceção AD-021, 2026-10-27)

**Done when**:

- [x] Sucesso: `mailer.mensagens).toEqual([{ para: <e-mail do dono>, template: TemplateEmail.ALTERACAO_CAMPANHA_REJEITADA, dados: { nomeCampanha, motivo } }])`
- [x] Sucesso: auditoria com `tipo`, `usuarioId` do admin, `entidadeId`, `dados` completos (compromisso anterior, compromisso proposto e `motivo`) e `criadoEm` igual ao relógio fixado (`jest.useFakeTimers`)
- [x] Falha do `Mailer` com dono existente: a decisão fica gravada e `console.error` é chamado (a falha precisa ser exercitada de verdade)
- [x] Concorrência contra o double (`RepositorioComGravacaoConcorrente`) → `TransicaoInvalidaError`, pendência `EM_ANALISE`, auditoria vazia, nenhum e-mail
- [x] Não-admin, motivo curto e sem pendência: além do estado e da auditoria, `mailer.mensagens` vazio e `versao` inalterada
- [x] Mutantes M22, M23 e M24 morrem

**Tests**: unit
**Gate**: quick
**Commit**: `test(api): e-mail, auditoria e concorrência na rejeição de alteração`

---

### T45: Auditoria com data-hora e retrato completo (Minor)

**What**: Conferir `criadoEm` e o retrato inteiro dos compromissos nas auditorias que hoje só conferem tipo ou autor.
**Where**: `src/domain/fivo/application/use-cases/rejeitar-campanha.spec.ts`; `editar-campanha.spec.ts`; `aprovar-alteracao-campanha.spec.ts`
**Depends on**: T48 (formato único do retrato)
**Requirement**: CAMP-06 (Submissão AC15), CAMP-08 (Alteração AC6, AC10)
**Autor**: 🤖 agente (exceção AD-021, 2026-10-27)

**Done when**:

- [x] `CAMPANHA_REJEITADA`, `CAMPANHA_REABERTA`, `ALTERACAO_CAMPANHA_ABERTA` e `ALTERACAO_CAMPANHA_APROVADA` conferem `criadoEm` igual ao relógio fixado
- [x] `ALTERACAO_CAMPANHA_ABERTA` e `ALTERACAO_CAMPANHA_APROVADA` conferem o retrato completo (beneficiada, regra e vigência) do anterior e do novo com `toEqual`, sem `objectContaining`
- [x] Mutantes M25, M26, M27 e M42 morrem

**Tests**: unit
**Gate**: quick
**Commit**: `test(api): data-hora e retrato completo nas auditorias de campanha`

---

### T46: Persistir a alteração decidida (Blocker)

**What**: Hoje `aprovarAlteracao` e `rejeitarAlteracao` põem `alteracaoPendente = null` (`E/campanha.ts:298`, `:321`) antes do `salvar`, e a decisão se perde: status, `decididoPor`, `decididoEm` e `motivo`. O agregado precisa entregar ao repositório a alteração decidida junto com a campanha, para que a T29 grave a linha de `campanha_alteracao` (AD-006c) e libere o índice parcial de "uma pendente". Uma saída possível é uma propriedade da `Campanha` com a última alteração decidida e ainda não gravada, lida pelo `salvar`. A forma fica a critério do grupo, desde que a porta documente o contrato.
**Where**: `src/domain/fivo/entities/campanha.ts`; `src/domain/fivo/application/ports/database/campanha-repository.ts` (JSDoc do `salvar`); `test/repositories/in-memory-campanha-repository.ts`; `campanha.spec.ts`; `aprovar-alteracao-campanha.spec.ts`; `rejeitar-alteracao-campanha.spec.ts`
**Depends on**: None
**Requirement**: CAMP-08 (Alteração AC6, AC8), AD-006c
**Autor**: 🤖 agente (exceção AD-021, 2026-10-27), incluindo a emenda de `design.md` (§`Campanha`, §Portas e Data Models) e da Done-when da T29

**Done when**:

- [x] Depois de decidir, a campanha continua sem pendência (`alteracaoPendente` vazio, `compromissoVigente()` correto), e a alteração decidida fica acessível ao `salvar` com status, `decididoPor`, `decididoEm` e, na rejeição, `motivo`
- [x] O double guarda as alterações decididas (histórico), e os specs de aprovar e rejeitar alteração conferem pelo repositório: status `APROVADA`/`REJEITADA`, `decididoPor` = admin, `decididoEm` igual ao relógio fixado e `motivo` literal na rejeição
- [x] Uma nova alteração aberta depois da decisão continua aceita (`E/campanha.spec.ts:563-574` segue verde)
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `fix(api): persiste a alteração de compromisso decidida`

---

### T47: `EditarCampanhaUseCase` — capa (Major)

**What**: Aceitar `capaArquivoId` na edição, para que a T34 (`PUT /campanhas/:id/capa`) troque a capa pelo caso de uso, com o portão de empresa aprovada, a checagem de dona, o 409 em análise e o CAS.
**Where**: `src/domain/fivo/application/use-cases/editar-campanha.ts` + spec
**Depends on**: None
**Requirement**: CAMP-01 (Criação AC15), CAMP-07 (Alteração AC1)
**Autor**: 🤖 agente (exceção AD-021, 2026-10-27)

**Done when**:

- [x] `EditarCampanhaUseCaseRequest.capaArquivoId?: string`, repassado a `editarTextos`
- [x] Rascunho e `APROVADA`: a capa é aplicada e gravada (`findById` mostra o id novo), sem abrir alteração e sem auditoria
- [x] `EM_ANALISE` → `CampanhaEmAnaliseError`, nada gravado
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): edição da capa da campanha pelo caso de uso`

---

### T48: Um só read model de detalhe e um só retrato de compromisso (Major)

**What**: A T19 exige o mesmo read model da T21, mas há dois `CampanhaDetalhe` incompatíveis (`U/campanha-detalhe.ts:31` e `U/consultar-campanha-da-empresa.ts:42`). Unificar num só módulo, usado pela edição e pela consulta, e remover as cópias de `paraDecimal` e `descreverCompromisso`, para que toda auditoria do agregado use o mesmo formato.
**Where**: `src/domain/fivo/application/use-cases/campanha-detalhe.ts`, `consultar-campanha-da-empresa.ts`, `editar-campanha.ts`, `listar-fila-campanhas.ts`, `buscar-campanha-publica.ts`, `aprovar-alteracao-campanha.ts`, `rejeitar-alteracao-campanha.ts` + specs afetados
**Depends on**: None
**Requirement**: CAMP-01 (Criação AC17), CAMP-08 (Alteração AC10); Done-when da T19
**Autor**: 🤖 agente (exceção AD-021, 2026-10-27)

**Done when**:

- [x] Existe uma única interface `CampanhaDetalhe`, devolvida por `EditarCampanhaUseCase` e por `ConsultarCampanhaDaEmpresaUseCase`. Um teste da edição confere o detalhe com `toEqual` idêntico ao da consulta para a mesma campanha
- [x] `paraDecimal` e o retrato do compromisso têm uma única definição. `ALTERACAO_CAMPANHA_ABERTA`, `_APROVADA` e `_REJEITADA` gravam o mesmo formato
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(api): unifica read model de detalhe e retrato de compromisso`

---

### T49: Alteração pendente com data de fim vencida (Major)

**What**: A Alteração AC5 pede que a alteração passe pelas mesmas validações de datas da submissão. Abrir uma alteração cuja vigência proposta tenha fim ≤ hoje (America/Sao_Paulo) precisa devolver `VigenciaVencidaError` (422), sem gravar.
**Where**: `src/domain/fivo/entities/campanha.ts` (`editarCompromisso`/`abrirAlteracao` recebendo `hoje`) ou `src/domain/fivo/application/use-cases/editar-campanha.ts`, a critério do grupo seguindo o AD-017; specs correspondentes
**Depends on**: None
**Requirement**: CAMP-08 (Alteração AC5)
**Autor**: 🤖 agente (exceção AD-021, 2026-10-27)

**Done when**:

- [x] Campanha `APROVADA` + vigência proposta com fim = hoje em SP (fake timers no limite UTC/SP) → `VigenciaVencidaError`, sem pendência, `versao` e auditoria intactas
- [x] Fim = amanhã em SP → alteração aberta
- [x] Um teste de validação de VO (regra inválida) no caminho `APROVADA` → 422 sem gravar
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `fix(api): rejeita alteração com data de fim vencida`

---

### T50: `Arquivo` — testes de `IMAGEM_CAMPANHA` (Major)

**What**: Cumprir a Done-when da T11, que não tem nenhum teste.
**Where**: `src/domain/fivo/entities/arquivo.spec.ts`
**Depends on**: None
**Requirement**: CAMP-01 (Criação AC13)
**Autor**: 🤖 agente (exceção AD-021, 2026-10-27)

**Done when**:

- [x] PNG e JPEG aceitos; SVG e PDF rejeitados com o erro de formato
- [x] 5 MB exatos aceitos; 5 MB + 1 byte rejeitado
- [x] Imagem menor que 512×512 aceita (sem checagem de dimensão)
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `test(api): cobre tipo IMAGEM_CAMPANHA em Arquivo`

---

> **Rodada 2 do gate (2026-10-27): FAIL** só por lacunas de teste (mutantes N8, N14, N23, N24) → T51–T53, também do agente pela exceção do AD-021.

### T51: `paraDecimal` — fração com zero à esquerda (Major)

**What**: Nenhum teste formata um valor cuja fração tem zero à esquerda, e `padStart` → `padEnd` em `paraDecimal` passa despercebido (N8). Com o mutante, R$ 1,05 sai `"1.50"` no detalhe, na fila, na consulta pública e na auditoria. Acrescentar o caso pelo read model.
**Where**: `src/domain/fivo/application/use-cases/consultar-campanha-da-empresa.spec.ts`
**Depends on**: None
**Requirement**: CAMP-01 (Criação AC17), CAMP-02
**Autor**: 🤖 agente (exceção AD-021, ciclo de correção do gate)

**Done when**:

- [x] Campanha com regra `POR_UNIDADE` `'0.05'` e meta `'1.05'` → `regraDoacao).toEqual({ tipo: POR_UNIDADE, valor: '0.05' })` e `meta).toBe('1.05')`
- [x] Campanha com regra `PERCENTUAL` `'0.01'` → `percentual: '0.01'`
- [x] Mutante N8 (`U/campanha-detalhe.ts:65`, `padStart` → `padEnd`) morre
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `test(api): cobre fração com zero à esquerda no detalhe da campanha`

---

### T52: Fim vencido herdado do compromisso aprovado (Major)

**What**: O design (`design.md:158`) manda checar a vigência do compromisso **mesclado** ao abrir a alteração, mas os testes da T49 sempre enviam a vigência. Falta o caso em que a empresa altera só a regra ou a beneficiada de uma campanha `APROVADA` cuja vigência aprovada já venceu (N14).
**Where**: `src/domain/fivo/entities/campanha.spec.ts`; `src/domain/fivo/application/use-cases/editar-campanha.spec.ts`
**Depends on**: None
**Requirement**: CAMP-08 (Alteração AC5)
**Autor**: 🤖 agente (exceção AD-021, ciclo de correção do gate)

**Done when**:

- [x] Entidade: campanha `APROVADA` com vigência aprovada de fim = hoje (ou antes), `editarCompromisso({ regraDoacao }, hoje)` → `VigenciaVencidaError`, sem pendência e com `compromissoVigente()` intacto
- [x] Entidade: a mesma campanha com `editarCompromisso({ vigencia: <fim amanhã> }, hoje)` → alteração aberta (a vigência nova substitui a vencida)
- [x] Caso de uso (fake timers): campanha `APROVADA` com fim aprovado já vencido em SP + edição só da regra → `VigenciaVencidaError`, `expectNadaGravado`
- [x] Mutante N14 (`E/campanha.ts:428`, `proposto.vigencia` → `parcial.vigencia?`) morre
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `test(api): cobre alteração sobre vigência aprovada vencida`

---

### T53: Data-hora da aprovação da campanha (Minor)

**What**: Submissão AC7 pede autor **e data-hora** da decisão, e AC15 pede data-hora em **toda** transição. A aprovação da campanha só confere `toBeInstanceOf(Date)`, e `new Date(0)` sobrevive na entidade (N24) e na auditoria (N23). A T45 copiou a lista de lacunas da rodada 1 e não incluiu `CAMPANHA_APROVADA`.
**Where**: `src/domain/fivo/entities/campanha.spec.ts`; `src/domain/fivo/application/use-cases/aprovar-campanha.spec.ts`
**Depends on**: None
**Requirement**: CAMP-05 (Submissão AC7), CAMP-06 (Submissão AC15)
**Autor**: 🤖 agente (exceção AD-021, ciclo de correção do gate)

**Done when**:

- [x] `campanha.spec.ts` (aprovar): `jest.useFakeTimers({ now })` + `decididoEm).toEqual(now)`
- [x] `aprovar-campanha.spec.ts` (sucesso): `depois.decididoEm).toEqual(agora)` e `registro.criadoEm).toEqual(agora)`, no lugar de `toBeInstanceOf(Date)`
- [x] Varredura: nenhuma asserção de data-hora de decisão ou auditoria em `campanha*.spec.ts`, `*-campanha.spec.ts` e `*-alteracao-campanha.spec.ts` fica em `toBeInstanceOf(Date)`
- [x] Mutantes N23 (`U/aprovar-campanha.ts:83`) e N24 (`E/campanha.ts:270`) morrem
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `test(api): data-hora exata na aprovação de campanha`

---

> **Rodada 3 do gate (2026-10-27): PASS ✅** (`validation-dominio.md`): 46/46 ACs P1 de domínio, sensor acumulado de 83 mutantes distintos, com 80 mortos, 0 sobreviventes e 3 equivalentes (M30, N6, P13). A Fase 7 está liberada.

### T28: Schema Prisma e migration de campanhas

**What**: Modelar `Campanha` e `CampanhaAlteracao`, enums novos e `IMAGEM_CAMPANHA`, com o SQL manual do design.
**Where**: `prisma/schema.prisma`
**Depends on**: None
**Reuses**: modelos `Instituicao` e `Arquivo`
**Requirement**: CAMP-01, CAMP-03, CAMP-04, CAMP-06, CAMP-08
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Modelos, enums e relações iguais ao design §Data Models; `id_publico` e `capa_arquivo_id` únicos; `@db.Date` nas datas
- [x] Migration criada com `prisma migrate dev --create-only`, com o CHECK e o índice parcial acrescentados à mão, e aplicada; nenhuma migration existente editada
- [x] Um segundo `prisma migrate dev` não gera migration nova (sem drift); se gerar por causa do índice parcial, remover o índice, registrar no design e seguir só com o CHECK
- [x] Gate `build` passa

**Tests**: none (schema — build gate)
**Gate**: build
**Commit**: `feat(api): schema e migration de campanha`

---

### T29: `PrismaCampanhaRepository` e mapper

**What**: Adaptador da porta com bloqueio otimista por `versao` e gravação das alterações (decidida e pendente) na mesma transação.
**Where**: `src/infra/database/prisma/repositories/prisma-campanha-repository.ts`
**Depends on**: T28, T16
**Reuses**: `prisma-instituicao-repository.ts`, `PrismaTransactionContext`
**Requirement**: CAMP-04, CAMP-06, CAMP-08
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Mapper reconstrói todos os VOs; dado persistido inválido lança erro
- [x] `salvar` = `updateMany where { id, versao }` com `versao + 1`; na mesma transação, se houver `campanha.alteracaoDecidida`, faz `upsert` da linha dela em `campanha_alteracao` (pelo `id`, como o double) com `status`, `decidido_por`, `decidido_em` e `motivo`, e **depois** faz `upsert` da `alteracaoPendente`; devolve `false` sem gravar nada quando a versão difere (contrato no JSDoc da porta, emenda da T46)
- [x] O mapper carrega como `alteracaoPendente` só a linha `EM_ANALISE`; as decididas ficam como histórico e não voltam ao agregado
- [x] Binding em `database.module.ts`; `limparBanco` inclui as duas tabelas novas
- [x] e2e em `test/database/`: ida e volta completa; `2026-01-01` volta `2026-01-01`; dois `salvar` com a mesma versão → só um grava; segunda alteração `EM_ANALISE` barrada pelo índice (ou pela versão, se T28 removeu o índice); `listarEmAnalise` traz os dois tipos; CHECK barra instituição e causa juntas
- [x] e2e de decisão: aprovar e rejeitar alteração gravam a linha com `status` `APROVADA`/`REJEITADA`, `decidido_por`, `decidido_em` e `motivo` (na rejeição), e a campanha recarregada vem sem pendência; uma nova alteração aberta depois da decisão é gravada sem violar o índice parcial, inclusive quando decisão e abertura vão no mesmo `salvar`
- [x] Idempotência: salvar duas vezes a mesma instância depois da decisão não duplica nem altera a linha decidida (N6 da verificação do domínio); a regra "uma decisão por instância e por `salvar`" (P13) fica no `design.md` §Portas — o JSDoc da porta é código de domínio (AD-021) e fica como follow-up do grupo
- [x] A ida e volta confere cada data-hora e cada campo opcional coluna a coluna, sem `equals` de agregado, inclusive o `criado_em` da alteração que ordena a fila
- [x] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): adaptador Prisma de CampanhaRepository`

---

### T30: Templates de campanha enfileiráveis

**What**: Incluir os dois templates novos em `TEMPLATES_ENFILEIRAVEIS`.
**Where**: `src/infra/mail/mailer-resiliente.ts`
**Depends on**: T17
**Reuses**: teste existente de `MailerResiliente`
**Requirement**: CAMP-05, CAMP-08
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Transporte falhando com `CAMPANHA_REJEITADA` e com `ALTERACAO_CAMPANHA_REJEITADA` → mensagem enfileirada (um teste por template)
- [x] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): e-mails de rejeição de campanha entram na fila de reenvio`

---

### T31: `ArquivoService` — capa de campanha

**What**: Upload de `IMAGEM_CAMPANHA` e acesso da empresa dona da campanha à capa.
**Where**: `src/infra/arquivo/arquivo.service.ts`
**Depends on**: T28, T11
**Reuses**: `uploadImagem`, `buscarAcesso`
**Requirement**: CAMP-01
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `uploadImagem({ tipo: IMAGEM_CAMPANHA, ... })` grava PNG e JPEG; SVG e PDF → `ArquivoInvalidoError`
- [x] `buscarAcesso` devolve o usuário dono da empresa da campanha que referencia a capa
- [x] e2e em `test/arquivo/` cobre os formatos e dono x não-dono
- [x] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): upload e acesso à capa de campanha`

---

### T32: `POST /campanhas` e `GET /campanhas/:id`

**What**: Criar o `CampanhasController` com criação e detalhe, DTOs zod e registro no `HttpModule`.
**Where**: `src/infra/http/controllers/campanhas.controller.ts`
**Depends on**: T29, T18, T21
**Reuses**: `beneficiadas.controller.ts` (empresa do usuário logado), `ZodValidationPipe`, `esquemaOpenApi`
**Requirement**: CAMP-01, CAMP-02, CAMP-03, CAMP-04
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Criação): AC1–AC12, AC16, AC17, AC18.

**Done when**:

- [x] `POST /campanhas` → 201 `{ id, idPublico }`; valores como string decimal e datas `AAAA-MM-DD` no DTO
- [x] e2e: 401 sem sessão; 403 ADMIN e empresa não aprovada (mensagem exata); 422 em cada limite de AC3–AC11 com a mensagem da spec; 201 com início no passado
- [x] e2e: `GET /campanhas/:id` 200 da dona e 404 para outra empresa
- [x] OpenAPI documentado (paridade verde)
- [x] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): rotas de criação e detalhe de campanha`

---

### T33: `PATCH /campanhas/:id`

**What**: Rota de edição parcial (textos e compromisso).
**Where**: `src/infra/http/controllers/campanhas.controller.ts` (modificar)
**Depends on**: T32, T19
**Reuses**: DTOs de T32 (versão parcial)
**Requirement**: CAMP-01, CAMP-07, CAMP-08
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Criação): AC15, AC18; (Submissão) AC5, AC12; (Alteração) AC1, AC2, AC4, AC5.

**Done when**:

- [x] e2e: rascunho editável; 409 em análise com a mensagem exata; `REJEITADA` editada volta a `RASCUNHO` com motivo preservado no detalhe
- [x] e2e: em `APROVADA`, descrição aplicada na hora; regra nova abre alteração (detalhe mostra pendência) e a segunda → 409 "Já existe uma alteração em análise"
- [x] e2e: 404 para campanha alheia; 422 nos limites
- [x] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): rota de edição de campanha`

---

### T34: `PUT /campanhas/:id/capa`

**What**: Upload multipart da capa, com remoção do arquivo antigo depois do `salvar`.
**Where**: `src/infra/http/controllers/campanhas.controller.ts` (modificar)
**Depends on**: T32, T31
**Reuses**: `cadastro-instituicao.controller.ts` (interceptor local e `descartar`)
**Requirement**: CAMP-01
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Criação): AC13, AC14.

**Done when**:

- [x] Limite do multer `5 * 1024 * 1024 + 1`; e2e com 5 MB exatos aceito e 5 MB + 1 byte → 422
- [x] e2e: SVG → 422; storage fora do ar (fake) → 503 "Storage indisponível no momento." e campanha sem capa nova
- [x] Troca de capa remove o arquivo antigo; falha no `salvar` remove o novo
- [x] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): upload da capa de campanha`

---

### T35: `POST /campanhas/:id/submissao`

**What**: Rota de submissão.
**Where**: `src/infra/http/controllers/campanhas.controller.ts` (modificar)
**Depends on**: T32, T20
**Reuses**: padrão `@HttpCode(204)` das decisões
**Requirement**: CAMP-05, CAMP-06
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Submissão): AC1, AC2, AC3, AC4, AC13.

**Done when**:

- [x] e2e: 204 e estado `EM_ANALISE`; 422 com todos os campos pendentes em `errors`; 422 com fim no passado; 422 com beneficiada suspensa depois de salva; 409 na segunda submissão
- [x] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): rota de submissão de campanha`

---

### T36: `AdminCampanhasController` — fila, aprovação e rejeição

**What**: Rotas do admin para a fila e para decidir campanhas novas.
**Where**: `src/infra/http/controllers/admin-campanhas.controller.ts`
**Depends on**: T29, T30, T22, T23, T24
**Reuses**: `admin-instituicoes.controller.ts`
**Requirement**: CAMP-05, CAMP-06
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Submissão): AC6–AC11, AC14, AC15.

**Done when**:

- [x] e2e: fila ordenada com os dois tipos; 403 para EMPRESA
- [x] e2e: aprovação 204 e consulta de auditoria; 409 com beneficiada inativada durante a análise
- [x] e2e: rejeição 204 com e-mail registrado no fake; 422 com motivo de 19 caracteres
- [x] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): fila e decisões de campanha no painel do admin`

---

### T37: Rotas de decisão de alteração

**What**: `POST /admin/campanhas/:id/alteracao/aprovacao` e `/alteracao/rejeicao`.
**Where**: `src/infra/http/controllers/admin-campanhas.controller.ts` (modificar)
**Depends on**: T36, T25, T26
**Reuses**: T36
**Requirement**: CAMP-08
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Alteração): AC6, AC7, AC8.

**Done when**:

- [x] e2e: aprovar aplica a regra nova; rejeitar mantém a anterior e envia e-mail; 409 sem pendência; 409 com nova beneficiada indisponível
- [x] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): decisões de alteração de campanha no painel do admin`

---

### T38: `CampanhasPublicasController`

**What**: Rotas públicas de dados e capa por `idPublico`.
**Where**: `src/infra/http/controllers/campanhas-publicas.controller.ts`
**Depends on**: T29, T31, T27
**Reuses**: `causas.controller.ts` (`@Public`), `ArquivoService.lerBytes`
**Requirement**: CAMP-11
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (Consulta pública): AC1–AC4; (Alteração) AC3; Edge case de empresa suspensa.

**Done when**:

- [x] e2e: 200 sem cookie para campanha aprovada; o JSON não tem `id`, motivo nem pendência
- [x] e2e: 404 com corpo idêntico (comparado byte a byte) para inexistente, rascunho, em análise, rejeitada, empresa suspensa e `idPublico` malformado
- [x] e2e: capa 200 com `Content-Type` correto quando publicada; 404 em rascunho
- [x] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): consulta pública de campanha`

---

### T39: Sweep de concorrência e autorização

**What**: e2e das corridas e da matriz papel × rota de campanhas.
**Where**: `test/http/campanhas-concorrencia.e2e-spec.ts`
**Depends on**: T35, T37, T38
**Reuses**: sweep da T33 do catálogo
**Requirement**: CAMP-05, CAMP-06, CAMP-08
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos**: Edge cases de decisão simultânea, submissão duplicada e edição concorrente com decisão.

**Done when**:

- [x] `Promise.all` de aprovar + rejeitar a mesma campanha → um 204 e um 409; idem para alteração
- [x] `Promise.all` de duas submissões → um 204 e um 409
- [x] `Promise.all` de edição de texto + aprovação de alteração → o compromisso aprovado não é sobrescrito
- [x] Tabela papel × rota: anônimo 401, EMPRESA em rota de admin 403, ADMIN em rota de empresa 403, INSTITUICAO em ambas 403
- [x] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `test(api): concorrência e autorização de campanhas`

---

### T40: Fechamento — OpenAPI exportado e documentação

**What**: Exportar o OpenAPI e documentar as rotas de campanha no README.
**Where**: `README.md`
**Depends on**: T39
**Reuses**: seção do catálogo no README
**Requirement**: CAMP-01, CAMP-05, CAMP-08, CAMP-11
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `npm run openapi:export` atualizado e commitado
- [ ] README descreve o fluxo rascunho → análise → aprovada, a alteração pendente e a consulta pública
- [ ] Gate `build` passa

**Tests**: e2e (paridade OpenAPI já existente)
**Gate**: build
**Commit**: `docs(api): documenta campanhas no README e no OpenAPI`

---

## Phase Execution Map

Grafo completo de dependências (`origem → alvo`), união das arestas dos blocos por fase:

```
T1 → T2
T1 → T3
T1 → T4
T1 → T5
T4 → T6
T5 → T6
T1 → T7
T1 → T8
T8 → T9
T6 → T10
T7 → T10
T9 → T10
T10 → T12
T2 → T13
T3 → T13
T4 → T13
T10 → T13
T13 → T14
T12 → T15
T14 → T15
T15 → T16
T16 → T18
T16 → T19
T16 → T20
T16 → T21
T16 → T22
T16 → T23
T16 → T24
T17 → T24
T16 → T25
T16 → T26
T17 → T26
T16 → T27
T28 → T29
T16 → T29
T17 → T30
T28 → T31
T11 → T31
T29 → T32
T18 → T32
T21 → T32
T32 → T33
T19 → T33
T32 → T34
T31 → T34
T32 → T35
T20 → T35
T29 → T36
T30 → T36
T22 → T36
T23 → T36
T24 → T36
T36 → T37
T25 → T37
T26 → T37
T29 → T38
T31 → T38
T27 → T38
T35 → T39
T37 → T39
T38 → T39
T39 → T40
```

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → [gate de handoff, rodada 1: FAIL] → Fase 6b → [gate de handoff, rodada 2] → Fase 7 → Fase 8 → Fase 9
  👤 T1–T6   T7–T11   T12–T15   T16–T17   T18–T21   T22–T27                 🤖 T28–T31  T32–T38  T39–T40
```

---

## Task Granularity Check

| Task | Escopo | Status |
| ---- | ------ | ------ |
| T1 | erros de aplicação (um arquivo por erro, mesmo conceito) | ⚠️ coeso — mesmo precedente de T1 do catálogo |
| T2–T12 | 1 VO ou entidade por task | ✅ Granular |
| T13, T14, T15 | 1 entidade, fatiada por grupo de comportamento | ✅ Granular |
| T16 | porta + double + factory do mesmo contrato | ⚠️ coeso — o double sem a porta não compila |
| T17 | 1 enum | ✅ Granular |
| T18–T27 | 1 caso de uso por task | ✅ Granular |
| T28 | schema + migration | ✅ Granular |
| T29 | adaptador + mapper + binding | ⚠️ coeso — mesmo precedente de T22/T23 do catálogo |
| T30, T31 | 1 serviço de infra por task | ✅ Granular |
| T32–T38 | 1–2 rotas por task | ✅ Granular |
| T39, T40 | 1 suíte e2e; documentação | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama | Status |
| ---- | ------------------ | -------- | ------ |
| T1, T11, T17, T28 | None | sem aresta de entrada | ✅ Match |
| T2, T3, T4, T5, T7, T8 | T1 | `T1 → Tn` | ✅ Match |
| T6 | T4, T5 | `T4 → T6`, `T5 → T6` | ✅ Match |
| T9 | T8 | `T8 → T9` | ✅ Match |
| T10 | T6, T7, T9 | idem | ✅ Match |
| T12 | T10 | `T10 → T12` | ✅ Match |
| T13 | T2, T3, T4, T10 | idem | ✅ Match |
| T14 | T13 | `T13 → T14` | ✅ Match |
| T15 | T12, T14 | idem | ✅ Match |
| T16 | T15 | `T15 → T16` | ✅ Match |
| T18–T23, T25, T27 | T16 | `T16 → Tn` | ✅ Match |
| T24, T26 | T16, T17 | idem | ✅ Match |
| T29 | T28, T16 | idem | ✅ Match |
| T30 | T17 | `T17 → T30` | ✅ Match |
| T31 | T28, T11 | idem | ✅ Match |
| T32 | T29, T18, T21 | idem | ✅ Match |
| T33 | T32, T19 | idem | ✅ Match |
| T34 | T32, T31 | idem | ✅ Match |
| T35 | T32, T20 | idem | ✅ Match |
| T36 | T29, T30, T22, T23, T24 | idem | ✅ Match |
| T37 | T36, T25, T26 | idem | ✅ Match |
| T38 | T29, T31, T27 | idem | ✅ Match |
| T39 | T35, T37, T38 | idem | ✅ Match |
| T40 | T39 | `T39 → T40` | ✅ Match |

Nenhuma dependência aponta para fase posterior.

---

## Test Co-location Validation

| Task | Camada criada/modificada | Matriz exige | Task declara | Status |
| ---- | ------------------------ | ------------ | ------------ | ------ |
| T1 | erros de aplicação | none | none | ✅ OK |
| T2–T15 | VOs e entidades | unit | unit | ✅ OK |
| T16, T17 | portas + doubles | none | none | ✅ OK |
| T18–T27 | casos de uso | unit | unit | ✅ OK |
| T28 | schema Prisma | none | none | ✅ OK |
| T29 | adaptador Prisma | e2e | e2e | ✅ OK |
| T30 | infra de e-mail | unit | unit | ✅ OK |
| T31 | `ArquivoService` | e2e | e2e | ✅ OK |
| T32–T38 | controllers | e2e | e2e | ✅ OK |
| T39 | suíte e2e | e2e | e2e | ✅ OK |
| T40 | documentação + OpenAPI | e2e (paridade) | e2e | ✅ OK |

---

## Requirement Traceability (rastreio task ↔ requisito)

| Requirement | Tasks | Status |
| ----------- | ----- | ------ |
| CAMP-01 | T1, T2, T3, T8, T9, T11, T13, T18, T19, T21, T28, T31, T32, T33, T34, T40 | In Tasks |
| CAMP-02 | T1, T4, T5, T6, T13, T18, T32 | In Tasks |
| CAMP-03 | T7, T13, T18, T28, T32 | In Tasks |
| CAMP-04 | T13, T18, T28, T29, T32 | In Tasks |
| CAMP-05 | T1, T8, T9, T13, T14, T16, T17, T20, T22, T23, T24, T30, T35, T36, T39, T40 | In Tasks |
| CAMP-06 | T1, T14, T16, T20, T23, T24, T28, T29, T35, T36, T39 | In Tasks |
| CAMP-07 | T15, T19, T33 | In Tasks |
| CAMP-08 | T1, T10, T12, T15, T16, T17, T19, T25, T26, T28, T29, T30, T33, T37, T39, T40 | In Tasks |
| CAMP-11 | T8, T9, T27, T38, T40 | In Tasks |
| CAMP-09, CAMP-10 | — (fora desta rodada) | Deferred |
