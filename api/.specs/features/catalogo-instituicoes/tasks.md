# Catálogo de Instituições e Causas Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

> ## Divisão de autoria (AD-020)
>
> | Metade | Tasks | Autor | Quando |
> | ------ | ----- | ----- | ------ |
> | **Domínio** — entidades, value objects, erros, portas, casos de uso, doubles em memória, factories e os testes unit correspondentes | **T1–T20** (Fases 1–5) | 👤 **humano** (trabalho escolar) | agora |
> | **Infra** — Prisma, adaptadores, `ArquivoService`, HTTP, OpenAPI, e2e | **T21–T34** (Fases 6–9) | 🤖 **agente** | só depois do gate de handoff |
>
> **O agente não escreve nem edita código em `src/domain/**`, `src/core/**`, `test/repositories/**` ou `test/factories/**` nesta feature.** Pode ler, revisar, rodar gates e escrever relatórios de verificação. A exceção é um pedido explícito do usuário (cláusula de deadline, AD-020) — que deve ser registrado no `STATE.md` antes de a primeira linha ser escrita.
>
> **Gate de handoff (entre T20 e T21):** o agente roda uma verificação independente do domínio (spec-anchored check + sensor de discriminação sobre `src/domain/**`) e escreve `validation-dominio.md`. Lacunas viram tasks humanas de correção. A Fase 6 só começa com esse relatório em PASS.

---

**Design**: `.specs/features/catalogo-instituicoes/design.md`
**Status**: Draft

> **Escopo desta rodada: P1 (MVP) do `api`.** P2 (área logada da instituição, notas internas de curadoria) e as telas do `web` são rodadas separadas. Arquitetura de **AD-017** (hexagonal completa, contexto único `src/domain/fivo/`, rich domain model): regra de estado → método na entidade; valor restrito → value object; regra entre registros → caso de uso.
>
> **Ordem de valor:** as Fases 1–5 fecham **toda a regra de negócio** do catálogo, verificável só com repositórios em memória e fakes — sem Docker, Prisma ou HTTP. As Fases 6–9 são a camada de infra.

---

## Test Coverage Matrix

> Gerada do codebase, guidelines do projeto e spec — confirmar antes do Execute.
> **Guidelines encontradas:** nenhuma (`AGENTS.md`, `CONTRIBUTING.md`, thresholds de coverage no Jest — ausentes) → **strong defaults aplicados**, alinhados à matriz já usada e validada em `cadastro-empresa`.
> **Amostras existentes:** `src/domain/fivo/entities/*.spec.ts`, `src/domain/fivo/application/use-cases/*.spec.ts` (unit co-locado, `ts-jest`, `InMemory*Repository` + `Fake*` + `*Factory` em `test/`); `test/**/*.e2e-spec.ts` (Nest + Postgres descartável, `maxWorkers: 1`).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Regra de negócio em entidades e VOs — `Causa`, `Instituicao`, `DocumentoValidacao`, `Arquivo.criar` | unit | Todas as ramificações; 1:1 com os ACs; todo edge case listado tem teste | `src/domain/fivo/entities/*.spec.ts` | `cd api && npx jest` |
| Casos de uso — `src/domain/fivo/application/use-cases/**` | unit | Todas as ramificações; happy + cada erro + cada edge case, com doubles em memória | `src/domain/fivo/application/use-cases/*.spec.ts` | `cd api && npx jest` |
| Portas (`application/ports/**`), erros (`application/errors/**`), doubles (`test/repositories`, `test/factories`) | none | build gate (`tsc --noEmit` + `eslint`); exercitados pelos testes dos casos de uso | — | build gate |
| Adaptadores Prisma + mappers | e2e | Roundtrip contra Postgres de teste; CAS de `salvarTransicao`; violação de unicidade; busca sem acento | `test/database/*.e2e-spec.ts` | `cd api && npx jest --config ./test/jest-e2e.json` |
| `ArquivoService` (sniff, limites por tipo, acesso) | e2e | Cada formato aceito e rejeitado; limite por tipo; dono x não-dono | `test/arquivo/*.e2e-spec.ts` | `cd api && npx jest --config ./test/jest-e2e.json` |
| Controllers, guards, filter, pipe — `src/infra/http/**` | e2e | Toda rota em escopo: happy + cada edge case listado + erros (401/403/409/422/503) | `test/http/*.e2e-spec.ts` | `cd api && npx jest --config ./test/jest-e2e.json` |
| Schema Prisma, migrations, módulos Nest | none | build gate apenas | — | build gate |
| Documento OpenAPI das rotas novas | e2e | Toda rota registrada documentada (o teste de paridade já existente falha caso contrário) | `test/http/openapi*.e2e-spec.ts` | `cd api && npx jest --config ./test/jest-e2e.json` |

## Gate Check Commands

> Gerada do codebase — confirmar antes do Execute.
> **Pré-requisito dos gates `full` e `build` (Fases 6–9):** Postgres de teste no ar e migrado —
> `cd api && docker compose -f docker-compose.test.yml up -d && npx prisma migrate deploy`

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks só com unit (Fases 1–5) | `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest` |
| Full | Tasks com e2e (Fases 6–9) | `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json` |
| Build | Fim de fase, ou tasks só de schema/config | `cd api && npm run build && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json` |

> **Avisos de processo:** (1) nunca `cmd | tail` nos gates — mascara o exit code. (2) `npx jest` sozinho não faz type-check: `tsc --noEmit` e `eslint` fazem parte de todo gate, inclusive o `quick`.

---

## Execution Plan

Fases são ordenadas e rodam em sequência — cada fase completa antes da próxima, e as tasks dentro de uma fase executam em ordem. Cada bloco lista as arestas de dependência cujo alvo está naquela fase (`origem → alvo`).

### Phase 1: Erros, value objects e entidades 👤

Ordem sugerida: T1 primeiro (os demais importam os erros), depois T2, T3, T4 em qualquer ordem, T5 por último.

```
T1 → T2
T1 → T3
T1 → T4
T1 → T5
T3 → T5
```

### Phase 2: Portas e test doubles 👤

```
T2 → T6
T5 → T7
```

### Phase 3: Casos de uso de causa 👤

```
T2 → T9
T6 → T9
T2 → T10
T6 → T10
T2 → T11
T6 → T11
T7 → T11
T6 → T12
```

### Phase 4: Autocadastro, fila e decisões do administrador 👤

```
T3 → T13
T5 → T13
T6 → T13
T7 → T13
T7 → T14
T5 → T15
T7 → T15
T8 → T15
T5 → T16
T7 → T16
T5 → T17
T7 → T17
T5 → T18
T7 → T18
```

### Phase 5: Catálogo de beneficiadas 👤

```
T6 → T19
T7 → T19
T6 → T20
T7 → T20
```

> **⛔ Gate de handoff — domínio → infra.** Depois de T20: gate `build` verde, verificação independente do agente (`validation-dominio.md`) em PASS, e só então a Fase 6 começa.

### Phase 6: Persistência (Prisma / PostgreSQL) 🤖

```
T21 → T22
T6 → T22
T21 → T23
T7 → T23
```

### Phase 7: Arquivos 🤖

```
T4 → T24
T21 → T24
T23 → T25
T24 → T25
T8 → T26
T24 → T26
```

### Phase 8: HTTP, rotas e OpenAPI 🤖

```
T9 → T27
T10 → T27
T11 → T27
T22 → T27
T12 → T28
T22 → T28
T27 → T28
T13 → T29
T23 → T29
T24 → T29
T14 → T30
T15 → T30
T16 → T30
T23 → T30
T26 → T30
T17 → T31
T18 → T31
T30 → T31
T19 → T32
T23 → T32
```

### Phase 9: Fechamento 🤖

```
T29 → T33
T30 → T33
T31 → T33
T27 → T34
T28 → T34
T32 → T34
T33 → T34
```

---

## Task Breakdown

### T1: Erros de aplicação do catálogo

**What**: Criar os erros de aplicação novos com o campo `status` e corrigir `InstituicaoAlreadyExistsError` para 409 com a mensagem da spec.
**Where**: `src/domain/fivo/application/errors/`
**Depends on**: None
**Reuses**: `empresa-already-exists.error.ts`, `transicao-invalida.error.ts` (forma: `extends Error implements UseCaseError` + `readonly status`)
**Requirement**: INST-01, INST-02, INST-03, INST-07, INST-09
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Criados: `DocumentoObrigatorioError` (422), `DescricaoDocumentoInvalidaError` (422), `CausaIndisponivelError` (422), `CausaJaExisteError` (409), `CausaComInstituicoesAprovadasError` (409, expõe `instituicoes: string[]`), `NomeCausaInvalidoError` (422), `BeneficiadaIndisponivelError` (422), `BeneficiadaAmbiguaError` (422), `DocumentoIndisponivelError` (503)
- [ ] Mensagens exatamente como na tabela do design (a spec cita o texto ao usuário)
- [ ] `InstituicaoAlreadyExistsError` passa a `status = 409` e mensagem `CNPJ ou e-mail já cadastrado`
- [ ] Gate `quick` passa

**Tests**: none (camada de erros — build gate, exercitada pelos casos de uso)
**Gate**: quick
**Commit**: `feat(api): erros de aplicação do catálogo de instituições`

---

### T2: Entidade `Causa`

**What**: Criar a entidade `Causa` com criação validada, edição, inativação e `estaAtiva()`.
**Where**: `src/domain/fivo/entities/causa.ts`
**Depends on**: T1
**Reuses**: `empresa.ts` (forma da entidade rica: props privadas, sem setter público, `Either` nas transições)
**Requirement**: INST-07
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (P1-Manutenção de causas): AC1 (estado inicial `ATIVA`), AC3 (inativação sem exclusão), AC5 (base do `estaAtiva()`).

**Done when**:

- [ ] `Causa.criar` valida nome não vazio e ≤ 80 caracteres, devolvendo `Either<NomeCausaInvalidoError, Causa>`
- [ ] Estado inicial `CausaStatus.ATIVA`; `inativar()` só a partir de `ATIVA`, senão `TransicaoInvalidaError`
- [ ] `editar(nome, descricao)` revalida o nome e recusa causa `INATIVA`
- [ ] `causa.spec.ts` cobre cada ramo acima (incluindo nome só de espaços e nome no limite de 80)
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): entidade Causa com ciclo de vida e validação de nome`

---

### T3: Value object `DocumentoValidacao`

**What**: Criar o VO que carrega o arquivo do documento e sua descrição opcional, concentrando a obrigatoriedade e o limite de 200 caracteres.
**Where**: `src/domain/fivo/entities/documento-validacao.ts`
**Depends on**: T1
**Reuses**: `cnpj.ts` e `senha.ts` (forma do VO validante com `Either`)
**Requirement**: INST-02
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (P1-Autocadastro): AC6 (documento ausente → erro com a mensagem da spec), AC7 (descrição livre opcional ≤ 200).

**Done when**:

- [ ] `DocumentoValidacao.criar(arquivoId, descricao?)` devolve `DocumentoObrigatorioError` quando `arquivoId` é ausente, vazio ou só espaços
- [ ] Devolve `DescricaoDocumentoInvalidaError` com descrição > 200 caracteres; aceita exatamente 200; aceita ausente/nula
- [ ] Getters `arquivoId: UniqueEntityId` e `descricao: string | null`
- [ ] `documento-validacao.spec.ts` cobre cada ramo, incluindo o limite exato
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): value object DocumentoValidacao`

---

### T4: `Arquivo` — tipos e limites por tipo

**What**: Acrescentar `LOGO_INSTITUICAO` e `DOCUMENTO_INSTITUICAO` ao `TipoArquivo` e trocar o limite único de 5 MB por uma tabela de limites e regras por tipo.
**Where**: `src/domain/fivo/entities/arquivo.ts`
**Depends on**: T1
**Reuses**: a própria tabela `formatosAceitosPorTipo` já existente no arquivo
**Requirement**: INST-02
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (P1-Autocadastro): AC7 (PDF/JPG/PNG até 10 MB para o documento), AC8 (mensagem diz qual limite foi violado), AC10 (logo PNG/JPG/SVG até 5 MB, mínimo 512×512 para raster).

**Done when**:

- [ ] `DOCUMENTO_INSTITUICAO` aceita `application/pdf`, `image/jpeg`, `image/png`, limite 10 MB, **sem** exigência de dimensão mínima
- [ ] `LOGO_INSTITUICAO` replica as regras de `LOGO_EMPRESA` (PNG/JPG/SVG, 5 MB, 512×512 para raster, sanitização de SVG)
- [ ] O limite citado na mensagem de erro corresponde ao tipo avaliado (não mais "5 MB" fixo)
- [ ] `arquivo.spec.ts` cobre: PDF aceito como documento, PDF rejeitado como logo, 10 MB aceito / 10 MB + 1 byte rejeitado, raster 300×300 aceito como documento e rejeitado como logo
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): tipos e limites de arquivo para logo e documento de instituição`

---

### T5: Entidade `Instituicao` — retrabalho para rich domain model

**What**: Reescrever a entidade do rascunho no padrão de `Empresa`: sem setters públicos, com a máquina de estados completa (incluindo `INATIVA`) e os campos novos (usuário, causa, descrição, logo, documento).
**Where**: `src/domain/fivo/entities/instituicao.ts`
**Depends on**: T1, T3
**Reuses**: `empresa.ts` (cópia estrutural de `aprovar/rejeitar/suspender/reativar`)
**Requirement**: INST-01, INST-03, INST-05
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (P1-Aprovação): AC2 (registra autor e data-hora), AC3 (motivo ≥ 20 caracteres), AC5 (apenas as transições permitidas; qualquer outra → `TransicaoInvalidaError`), AC6 (inativação preserva o registro).

**Done when**:

- [ ] Props alinhadas ao design: `numero: string`, sem `email`, `decididoPor: UniqueEntityId`, camelCase, mais `usuarioId`, `causaId`, `descricao`, `logoArquivoId`, `documento: DocumentoValidacao`
- [ ] Nenhum setter público; todo acesso de escrita passa por método de transição
- [ ] `InstituicaoStatus` ganha `INATIVA`; métodos `aprovar`, `rejeitar`, `suspender`, `reativar`, `inativar`, `reenviarParaAnalise` devolvem `Either`
- [ ] `estaDisponivelParaSelecao()` só é `true` em `APROVADA`
- [ ] `instituicao.spec.ts` cobre cada transição válida e pelo menos uma inválida por método, além de motivo curto na rejeição
- [ ] `test/factories/instituicao-factory.ts`, `campanha-factory.ts` e `criar-campanha.spec.ts` continuam compilando e verdes (ajuste mecânico de props)
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(api): Instituicao vira entidade rica com máquina de estados completa`

---

### T6: Porta `CausaRepository`, double em memória e factory

**What**: Criar o contrato de persistência de causa, o double em memória com busca por nome normalizada e a factory de teste.
**Where**: `src/domain/fivo/application/ports/database/causa-repository.ts`
**Depends on**: T2
**Reuses**: `empresa-repository.ts` (forma da porta), `in-memory-empresa-repository.ts` (forma do double)
**Requirement**: INST-07
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Porta com `findById`, `findByNome`, `listarAtivas`, `create`, `save`
- [ ] `test/repositories/in-memory-causa-repository.ts` implementa a porta; `findByNome` ignora caixa e acento (`normalize('NFD')` + remoção de diacríticos), igual ao que o adaptador Prisma fará
- [ ] `test/factories/causa-factory.ts` cria causa válida com override de props
- [ ] Gate `quick` passa

**Tests**: none (porta + doubles — build gate; exercitados em T9–T12)
**Gate**: quick
**Commit**: `feat(api): porta CausaRepository com double em memória`

---

### T7: Porta `InstituicaoRepository` expandida e double reescrito

**What**: Expandir o contrato de persistência da instituição (listagens, busca, CAS) e reescrever o double em memória para reproduzir esse contrato.
**Where**: `src/domain/fivo/application/ports/database/instituicao-repository.ts`
**Depends on**: T5
**Reuses**: `empresa-repository.ts` (`salvarTransicao`, `listarPorEstado`), `in-memory-empresa-repository.ts` (CAS reproduzido em memória)
**Requirement**: INST-04, INST-05, INST-08
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Porta com `findById`, `findByCnpj`, `findByUsuarioId`, `listarPorEstado(estado, ordem)`, `listarAprovadasPorCausa(causaId)`, `buscarDisponiveis(termo?)`, `create`, `save`, `salvarTransicao(instituicao, estadoEsperado): Promise<boolean>`
- [ ] Documentado no contrato que `save` **não** grava `status`, `decididoPor`, `decididoEm` nem `motivoDecisao` (mesma armadilha resolvida em `EmpresaRepository`)
- [ ] `test/repositories/in-memory-instituicao-repository.ts` reescrito: `salvarTransicao` devolve `false` quando o estado persistido difere do esperado; `buscarDisponiveis` filtra `APROVADA` e compara sem acento/caixa; `listarPorEstado` ordena por `createdAt`
- [ ] Gate `quick` passa

**Tests**: none (porta + double — build gate; exercitados em T13–T20)
**Gate**: quick
**Commit**: `feat(api): contrato de InstituicaoRepository com transição CAS e busca`

---

### T8: Porta `VerificadorDeDocumento` e fake

**What**: Criar a porta que informa se o arquivo do documento continua legível no armazenamento, com o fake de teste.
**Where**: `src/domain/fivo/application/ports/verificador-de-documento.ts`
**Depends on**: None
**Reuses**: `ports/storage.ts` (forma da porta), `test/cryptography/fake-storage.ts` (forma do fake)
**Requirement**: INST-06
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `abstract estaLegivel(arquivoId: string): Promise<boolean>`
- [ ] `test/arquivo/fake-verificador-de-documento.ts` permite marcar um arquivo como ilegível no teste
- [ ] Gate `quick` passa

**Tests**: none (porta + fake — build gate; exercitado em T15)
**Gate**: quick
**Commit**: `feat(api): porta VerificadorDeDocumento`

---

### T9: `CriarCausaUseCase`

**What**: Caso de uso de criação de causa pelo administrador, com unicidade de nome e auditoria.
**Where**: `src/domain/fivo/application/use-cases/criar-causa.ts`
**Depends on**: T2, T6
**Reuses**: `criar-empresa.ts` (ordem validação → unicidade → persistência), `aprovar-empresa.ts` (registro de auditoria)
**Requirement**: INST-07
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (P1-Manutenção de causas): AC1, AC2, AC6 (papel), AC7 (auditoria).

**Done when**:

- [ ] Usuário sem papel `ADMIN` → `NotAllowedError`, sem escrita
- [ ] Nome já existente (ignorando caixa e acento) → `CausaJaExisteError`
- [ ] Sucesso: causa `ATIVA` persistida e registro de auditoria com autor e data-hora
- [ ] `criar-causa.spec.ts` cobre os três ramos + nome inválido vindo da entidade
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): caso de uso de criação de causa`

---

### T10: `EditarCausaUseCase`

**What**: Caso de uso de edição de nome e descrição de causa pelo administrador.
**Where**: `src/domain/fivo/application/use-cases/editar-causa.ts`
**Depends on**: T2, T6
**Reuses**: `editar-dados-empresa.ts`
**Requirement**: INST-07
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (P1-Manutenção de causas): AC2 (colisão de nome), AC6, AC7.

**Done when**:

- [ ] Não-admin → `NotAllowedError`; causa inexistente → `ResourceNotFoundError`
- [ ] Renomear para um nome já usado por outra causa → `CausaJaExisteError`; manter o próprio nome é permitido
- [ ] Causa `INATIVA` → `TransicaoInvalidaError` (vindo da entidade)
- [ ] Sucesso persiste e registra auditoria
- [ ] `editar-causa.spec.ts` cobre cada ramo
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): caso de uso de edição de causa`

---

### T11: `InativarCausaUseCase`

**What**: Caso de uso de inativação de causa, bloqueando quando há instituições aprovadas vinculadas.
**Where**: `src/domain/fivo/application/use-cases/inativar-causa.ts`
**Depends on**: T2, T6, T7
**Reuses**: `suspender-empresa.ts`
**Requirement**: INST-07
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (P1-Manutenção de causas): AC3, AC4 (409 listando as instituições), AC6, AC7.

**Done when**:

- [ ] Não-admin → `NotAllowedError`; causa inexistente → `ResourceNotFoundError`
- [ ] Com instituições `APROVADA` vinculadas → `CausaComInstituicoesAprovadasError` contendo os nomes, sem alterar estado
- [ ] Instituições em outros estados não bloqueiam a inativação
- [ ] Sucesso: `INATIVA` persistida, registro preservado, auditoria gravada
- [ ] `inativar-causa.spec.ts` cobre cada ramo
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): caso de uso de inativação de causa`

---

### T12: `ListarCausasAtivasUseCase`

**What**: Caso de uso de listagem das causas `ATIVA` para o formulário de autocadastro e para a seleção de beneficiada.
**Where**: `src/domain/fivo/application/use-cases/listar-causas-ativas.ts`
**Depends on**: T6
**Reuses**: `listar-fila-aprovacao.ts`
**Requirement**: INST-07, INST-08
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (P1-Manutenção de causas): AC5 (causa `INATIVA` sai das listas).

**Done when**:

- [ ] Devolve apenas causas `ATIVA`, ordenadas alfabeticamente por nome (sem distinção de acento/caixa)
- [ ] Catálogo vazio devolve `[]`, não erro
- [ ] `listar-causas-ativas.spec.ts` cobre ordenação, filtro por estado e lista vazia
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): caso de uso de listagem de causas ativas`

---

### T13: `CriarInstituicaoUseCase` — retrabalho do autocadastro

**What**: Reescrever o caso de uso para criar `Usuario` (papel `INSTITUICAO`) + `Instituicao` na mesma transação, com senha, CNPJ, causa ativa, documento obrigatório e e-mail de recebimento.
**Where**: `src/domain/fivo/application/use-cases/criar-instituicao.ts`
**Depends on**: T3, T5, T6, T7
**Reuses**: `criar-empresa.ts` (estrutura completa, incluindo `UnitOfWork` e e-mail best-effort)
**Requirement**: INST-01, INST-02, INST-03
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (P1-Autocadastro): AC1, AC2 (CNPJ inválido, nada persistido), AC3 (CNPJ **ou** e-mail duplicado → 409), AC4/AC5 (senha mínima e hash), AC6 (documento obrigatório), AC9 (causa inexistente ou inativa), AC11 (e-mail de análise).

**Done when**:

- [ ] Ordem de validação: `Senha` → `Cnpj` → `DocumentoValidacao` → causa ativa → unicidade (CNPJ na instituição, e-mail global em `usuario`)
- [ ] Usuário e instituição criados dentro de `unitOfWork.executar`, com `usuarioId` vinculado e estado `PENDENTE_APROVACAO`
- [ ] Senha persistida apenas como hash (`Hasher`), nunca em texto claro — asserido no teste
- [ ] Falha no envio de e-mail não derruba o cadastro (mesmo tratamento de `criar-empresa`)
- [ ] `criar-instituicao.spec.ts` cobre cada AC acima, um ramo por teste
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): autocadastro de instituição com usuário, causa e documento`

---

### T14: `ListarFilaInstituicoesUseCase`

**What**: Caso de uso da fila de análise do administrador, com os campos que a tela exige e o sinal de CNPJ coincidente com empresa.
**Where**: `src/domain/fivo/application/use-cases/listar-fila-instituicoes.ts`
**Depends on**: T7
**Reuses**: `listar-fila-aprovacao.ts`
**Requirement**: INST-04
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (P1-Aprovação): AC1 (somente `PENDENTE_APROVACAO`, mais antiga primeiro, com nome, CNPJ, causa, cidade, UF, data e referência do documento); Edge case do CNPJ coincidente com empresa sinalizado ao admin.

**Done when**:

- [ ] Devolve apenas `PENDENTE_APROVACAO`, ordem ascendente por `createdAt`
- [ ] Cada item traz nome, CNPJ, nome da causa, cidade, UF, `createdAt`, `documentoArquivoId` e e-mail do usuário
- [ ] Item traz `cnpjCoincideComEmpresa: boolean`
- [ ] Não-admin → `NotAllowedError`
- [ ] `listar-fila-instituicoes.spec.ts` cobre ordenação, filtro, sinal de coincidência e papel
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): fila de análise de instituições`

---

### T15: `AprovarInstituicaoUseCase` — retrabalho

**What**: Reescrever a aprovação no padrão de `AprovarEmpresaUseCase`, com CAS, auditoria, e-mail e o bloqueio 503 quando o documento está ilegível.
**Where**: `src/domain/fivo/application/use-cases/aprovar-instituicao.ts`
**Depends on**: T5, T7, T8
**Reuses**: `aprovar-empresa.ts`
**Requirement**: INST-04, INST-05, INST-06
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (P1-Aprovação): AC2 (estado, autor, data-hora, e-mail), AC8 (não-admin → 403), AC9 (auditoria), AC10 (decisão concorrente → 409); Edge case do documento inacessível → 503 sem mudar estado.

**Done when**:

- [ ] Devolve `Either` (nunca `throw`): `NotAllowedError`, `ResourceNotFoundError`, `TransicaoInvalidaError`, `DocumentoIndisponivelError`
- [ ] `VerificadorDeDocumento.estaLegivel` consultado antes da transição; `false` → `DocumentoIndisponivelError` e estado inalterado
- [ ] `salvarTransicao` com o estado anterior; `false` → `TransicaoInvalidaError`
- [ ] Auditoria com autor, estado anterior, estado novo e data-hora; e-mail de aprovação best-effort
- [ ] `aprovar-instituicao.spec.ts` cobre cada ramo acima
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(api): aprovação de instituição com CAS, auditoria e checagem de documento`

---

### T16: `RejeitarInstituicaoUseCase` — retrabalho

**What**: Reescrever a rejeição com motivo obrigatório, CAS, auditoria e e-mail com o motivo.
**Where**: `src/domain/fivo/application/use-cases/rejeitar-instituicao.ts`
**Depends on**: T5, T7
**Reuses**: `rejeitar-empresa.ts`
**Requirement**: INST-04, INST-05
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (P1-Aprovação): AC3 (motivo ≥ 20 caracteres, persistido e enviado por e-mail), AC8, AC9, AC10.

**Done when**:

- [ ] Motivo com menos de 20 caracteres → `MotivoInsuficienteError`, sem escrita
- [ ] Estado `REJEITADA` com motivo persistido; e-mail leva o motivo em `dados`
- [ ] Decisão concorrente → `TransicaoInvalidaError` via `salvarTransicao`
- [ ] `rejeitar-instituicao.spec.ts` cobre cada ramo
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(api): rejeição de instituição com motivo e auditoria`

---

### T17: Suspensão e reativação de instituição

**What**: Reescrever `SuspenderInstituicaoUseCase` e criar `ReativarInstituicaoUseCase` no padrão das decisões.
**Where**: `src/domain/fivo/application/use-cases/suspender-instituicao.ts`
**Depends on**: T5, T7
**Reuses**: `suspender-empresa.ts`, `reativar-empresa.ts`
**Requirement**: INST-05
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (P1-Aprovação): AC4 (instituição suspensa some das listas de beneficiadas), AC5 (`APROVADA → SUSPENSA`, `SUSPENSA → APROVADA`), AC8, AC9.

**Done when**:

- [ ] Ambos devolvem `Either`, exigem papel `ADMIN` e usam `salvarTransicao`
- [ ] Suspender a partir de estado diferente de `APROVADA` → `TransicaoInvalidaError`; reativar a partir de estado diferente de `SUSPENSA` → idem
- [ ] Auditoria gravada nos dois casos
- [ ] `suspender-instituicao.spec.ts` e `reativar-instituicao.spec.ts` cobrem cada ramo
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(api): suspensão e reativação de instituição`

---

### T18: `InativarInstituicaoUseCase`

**What**: Criar a inativação definitiva, que tira a instituição das listas sem excluir o registro nem tocar campanhas existentes.
**Where**: `src/domain/fivo/application/use-cases/inativar-instituicao.ts`
**Depends on**: T5, T7
**Reuses**: `suspender-empresa.ts`
**Requirement**: INST-05
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (P1-Aprovação): AC6 (inativa sem excluir e sem alterar campanhas aprovadas), AC5 (`APROVADA → INATIVA` e nada mais), AC8, AC9.

**Done when**:

- [ ] Só a partir de `APROVADA`; qualquer outro estado → `TransicaoInvalidaError`
- [ ] Registro continua existindo e legível por `findById` após a inativação — asserido no teste
- [ ] Auditoria gravada; não-admin → `NotAllowedError`
- [ ] `inativar-instituicao.spec.ts` cobre cada ramo
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): inativação de instituição preservando o registro`

---

### T19: `ListarBeneficiadasUseCase`

**What**: Caso de uso que devolve o catálogo de beneficiadas (instituições `APROVADA` + causas `ATIVA`) já no read model público, com busca.
**Where**: `src/domain/fivo/application/use-cases/listar-beneficiadas.ts`
**Depends on**: T6, T7
**Reuses**: `listar-fila-aprovacao.ts` (forma do read model)
**Requirement**: INST-08, INST-10
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (P1-Seleção): AC1 (só aprovadas/ativas, ordem alfabética), AC2 (busca ≥ 2 caracteres, parcial, sem acento/caixa), AC5 (nunca expõe documento, e-mail, telefone ou notas), AC6 (catálogo vazio devolve lista vazia).

**Done when**:

- [ ] Devolve `BeneficiadaDisponivel[]` conforme o design — sem CNPJ, e-mail, telefone, endereço completo, documento ou dados de decisão
- [ ] Instituições em `PENDENTE_APROVACAO`, `REJEITADA`, `SUSPENSA` e `INATIVA` ficam de fora (um teste por estado)
- [ ] Termo com menos de 2 caracteres é ignorado (lista completa); busca casa "Fundacao" com "Fundação" e ignora caixa
- [ ] Ordenação alfabética por nome, misturando instituições e causas
- [ ] `listar-beneficiadas.spec.ts` cobre cada AC acima
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): catálogo de beneficiadas com busca sem acento`

---

### T20: `AssegurarBeneficiadaDisponivelUseCase`

**What**: Guarda que valida o vínculo exclusivo (instituição XOR causa) e a disponibilidade da beneficiada; consumida pela feature `campanhas`.
**Where**: `src/domain/fivo/application/use-cases/assegurar-beneficiada-disponivel.ts`
**Depends on**: T6, T7
**Reuses**: `assegurar-empresa-aprovada.ts`
**Requirement**: INST-09
**Autor**: 👤 humano

**Tools**:

- MCP: NONE
- Skill: NONE

**ACs cobertos** (P1-Seleção): AC3 (exatamente uma referência; duas ou nenhuma → erro), AC4 (inexistente, não aprovada ou inativa → `Instituição ou causa indisponível`).

**Done when**:

- [ ] Instituição e causa juntas, ou nenhuma das duas → `BeneficiadaAmbiguaError`
- [ ] Instituição inexistente ou fora de `APROVADA` → `BeneficiadaIndisponivelError` (um teste por estado)
- [ ] Causa inexistente ou `INATIVA` → `BeneficiadaIndisponivelError`
- [ ] Caso feliz devolve `right` para cada um dos dois tipos de beneficiada
- [ ] `assegurar-beneficiada-disponivel.spec.ts` cobre cada ramo
- [ ] Gate `build` passa (fim da metade de domínio)

**Tests**: unit
**Gate**: build
**Commit**: `feat(api): guarda de disponibilidade da beneficiada`

---

> ### ⛔ Gate de handoff — domínio → infra
>
> Antes de T21: (1) gate `build` verde; (2) o agente roda verificação independente sobre `src/domain/**` (checagem ancorada na spec + sensor de discriminação) e escreve `.specs/features/catalogo-instituicoes/validation-dominio.md`; (3) lacunas viram tasks humanas de correção (T20a, T20b…) e são fechadas antes da Fase 6.

---

### T21: Schema Prisma e migration do catálogo

**What**: Modelar `Causa` e `Instituicao` no schema, com enums novos, coluna de busca normalizada e relações com `Usuario`, `Causa` e `Arquivo`, e gerar a migration.
**Where**: `prisma/schema.prisma`
**Depends on**: None
**Reuses**: modelos `Empresa` e `Arquivo` já existentes no schema
**Requirement**: INST-01, INST-05, INST-07
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `enum InstituicaoStatus` (com `INATIVA`), `enum CausaStatus`, e `TipoArquivo` com `LOGO_INSTITUICAO` e `DOCUMENTO_INSTITUICAO`
- [ ] `instituicao`: `usuario_id` único, `cnpj` único, FKs de causa, logo e documento, colunas de decisão, `nome_busca` indexada
- [ ] `causa`: `nome_busca` com índice único (unicidade sem acento/caixa)
- [ ] Migration criada com `prisma migrate dev` e aplicada; nenhuma migration existente editada
- [ ] Gate `build` passa

**Tests**: none (schema — build gate)
**Gate**: build
**Commit**: `feat(api): schema e migration de causa e instituição`

---

### T22: `PrismaCausaRepository` e mapper

**What**: Implementar o adaptador Prisma da porta de causa, com o mapper domínio↔row e a normalização de nome.
**Where**: `src/infra/database/prisma/prisma-causa-repository.ts`
**Depends on**: T6, T21
**Reuses**: `prisma-empresa-repository.ts` e seu mapper
**Requirement**: INST-07
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Todas as operações da porta implementadas; `nome_busca` gravado pelo mapper
- [ ] `findByNome` encontra "Educação" buscando "educacao"; violação do índice único vira erro tratável
- [ ] Registrado no `DatabaseModule`
- [ ] `test/database/prisma-causa-repository.e2e-spec.ts` cobre roundtrip, busca normalizada, listagem de ativas e unicidade
- [ ] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): adaptador Prisma de CausaRepository`

---

### T23: `PrismaInstituicaoRepository` e mapper

**What**: Implementar o adaptador Prisma da instituição, incluindo o CAS de `salvarTransicao`, a busca sem acento e o `save` que não regrava colunas de decisão.
**Where**: `src/infra/database/prisma/prisma-instituicao-repository.ts`
**Depends on**: T7, T21
**Reuses**: `prisma-empresa-repository.ts` (CAS com `updateMany` + `count`)
**Requirement**: INST-04, INST-05, INST-08
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `salvarTransicao` devolve `false` quando o estado persistido já mudou (asserido com duas decisões concorrentes)
- [ ] `save` não altera `status`, `decididoPor`, `decididoEm`, `motivoDecisao`
- [ ] `buscarDisponiveis` usa `nome_busca`; `listarPorEstado` ordena por `criado_em`
- [ ] Registrado no `DatabaseModule`
- [ ] `test/database/prisma-instituicao-repository.e2e-spec.ts` cobre roundtrip, CAS, unicidade de CNPJ, busca sem acento e o `save` conservador
- [ ] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): adaptador Prisma de InstituicaoRepository`

---

### T24: `ArquivoService` — PDF e limites por tipo

**What**: Reconhecer PDF por magic bytes, aplicar o limite do tipo no upload e expor um caminho de upload para o documento de validação.
**Where**: `src/infra/arquivo/arquivo.service.ts`
**Depends on**: T4, T21
**Reuses**: o próprio `sniffarMime`/`uploadImagem` já existentes
**Requirement**: INST-02
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `%PDF-` reconhecido como `application/pdf`; sniff continua ignorando o `Content-Type` do cliente
- [ ] Upload de documento aceita PDF/JPG/PNG até 10 MB e rejeita acima disso com a mensagem do domínio
- [ ] Falha do storage continua virando `StorageIndisponivelError`
- [ ] `test/arquivo/arquivo-service.e2e-spec.ts` estendido: PDF aceito, PDF rejeitado como logo, limite de 10 MB nas duas bordas
- [ ] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): upload de documento em pdf com limite por tipo`

---

### T25: Acesso restrito ao documento de validação

**What**: Estender o controle de acesso de arquivo para o dono instituição, mantendo 403 para qualquer outro solicitante.
**Where**: `src/infra/http/controllers/arquivo.controller.ts`
**Depends on**: T23, T24
**Reuses**: `ArquivoService.buscarAcesso` e a regra de dono já aplicada à empresa
**Requirement**: INST-06
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `buscarAcesso` considera o `usuarioId` da instituição dona (logo e documento)
- [ ] Admin e dono recebem 200; outra instituição, empresa e anônimo recebem 403/401
- [ ] `test/http/arquivo.e2e-spec.ts` estendido com esses casos
- [ ] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): acesso ao documento de validação restrito a admin e dono`

---

### T26: Adaptador `VerificadorDeDocumentoPrisma`

**What**: Implementar a porta de legibilidade do documento sobre `ArquivoService`/storage e ligá-la no módulo.
**Where**: `src/infra/arquivo/verificador-de-documento-prisma.ts`
**Depends on**: T8, T24
**Reuses**: `ArquivoService.lerBytes`, `ArquivoModule`
**Requirement**: INST-06
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `estaLegivel` devolve `false` quando o registro sumiu ou o storage falha na leitura, e `true` no caminho feliz
- [ ] Provider registrado para a porta `VerificadorDeDocumento`
- [ ] `test/arquivo/verificador-de-documento.e2e-spec.ts` cobre os três casos
- [ ] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): adaptador de verificação do documento de validação`

---

### T27: `AdminCausasController`

**What**: Expor as rotas administrativas de causa (criar, editar, inativar) com DTO Zod, papel ADMIN e documentação OpenAPI.
**Where**: `src/infra/http/controllers/admin-causas.controller.ts`
**Depends on**: T9, T10, T11, T22
**Reuses**: `admin-empresas.controller.ts`, `ZodValidationPipe`, decorators `ApiProtegida`/`ApiErro`
**Requirement**: INST-07
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `POST /admin/causas` (201), `PATCH /admin/causas/:id` (200), `POST /admin/causas/:id/inativacao` (204)
- [ ] Nome duplicado → 409; não-admin → 403; inativação com instituições aprovadas → 409 listando os nomes
- [ ] Rotas documentadas no OpenAPI (o teste de paridade falha se faltar)
- [ ] `test/http/admin-causas.e2e-spec.ts` cobre happy path e cada erro acima
- [ ] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): rotas administrativas de causa`

---

### T28: `GET /causas` público

**What**: Expor a lista de causas ativas para o formulário de autocadastro e a seleção de beneficiada.
**Where**: `src/infra/http/controllers/causas.controller.ts`
**Depends on**: T12, T22, T27
**Reuses**: `@Public()`, presenters existentes
**Requirement**: INST-07, INST-08
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `GET /causas` público devolve apenas causas ativas, ordenadas, com `id`, `nome`, `descricao`
- [ ] Causa inativada some da resposta
- [ ] Rota documentada no OpenAPI
- [ ] `test/http/causas.e2e-spec.ts` cobre os dois casos
- [ ] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): rota pública de causas ativas`

---

### T29: `POST /instituicoes` — autocadastro

**What**: Expor o autocadastro público com multipart (logo opcional + documento obrigatório), traduzindo os erros de domínio em HTTP.
**Where**: `src/infra/http/controllers/cadastro-instituicao.controller.ts`
**Depends on**: T13, T23, T24
**Reuses**: `cadastro-empresa.controller.ts` (multipart, `FileInterceptor`, `desembrulhar`, tratamento de storage)
**Requirement**: INST-01, INST-02, INST-03
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `POST /instituicoes` público, 201 com o id; limite de upload coerente com 10 MB do documento
- [ ] Erros mapeados: 422 (CNPJ, senha, documento ausente, descrição longa, formato/limite, causa inválida), 409 (CNPJ ou e-mail), 503 (storage fora do ar, sem criar instituição)
- [ ] Rota documentada no OpenAPI, incluindo o corpo multipart
- [ ] `test/http/cadastro-instituicao.e2e-spec.ts` cobre happy path e cada erro acima
- [ ] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): rota de autocadastro de instituição`

---

### T30: `AdminInstituicoesController` — fila, aprovação e rejeição

**What**: Expor a fila de análise e as decisões de aprovar e rejeitar.
**Where**: `src/infra/http/controllers/admin-instituicoes.controller.ts`
**Depends on**: T14, T15, T16, T23, T26
**Reuses**: `admin-empresas.controller.ts`
**Requirement**: INST-04, INST-05, INST-06
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `GET /admin/instituicoes` (fila ordenada, com referência do documento e sinal de CNPJ coincidente) e `POST /admin/instituicoes/:id/{aprovacao,rejeicao}`
- [ ] Rejeição sem motivo suficiente → 422; documento ilegível → 503; decisão repetida → 409; não-admin → 403
- [ ] Rotas documentadas no OpenAPI
- [ ] `test/http/admin-instituicoes.e2e-spec.ts` cobre happy path e cada erro acima
- [ ] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): fila e decisões de instituição no painel do admin`

---

### T31: Suspensão, reativação e inativação de instituição (HTTP)

**What**: Acrescentar as três rotas de mudança de estado pós-aprovação ao controller administrativo.
**Where**: `src/infra/http/controllers/admin-instituicoes.controller.ts`
**Depends on**: T17, T18, T30
**Reuses**: as rotas equivalentes de empresa
**Requirement**: INST-05
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `POST /admin/instituicoes/:id/{suspensao,reativacao,inativacao}` respondendo 204
- [ ] Transição inválida → 409; não-admin → 403
- [ ] Instituição suspensa ou inativada some de `GET /beneficiadas` (asserido no e2e)
- [ ] Rotas documentadas no OpenAPI
- [ ] `test/http/admin-instituicoes.e2e-spec.ts` estendido
- [ ] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): suspensão, reativação e inativação de instituição`

---

### T32: `GET /beneficiadas`

**What**: Expor o catálogo de beneficiadas para a empresa aprovada, com busca por termo.
**Where**: `src/infra/http/controllers/beneficiadas.controller.ts`
**Depends on**: T19, T23
**Reuses**: `@Roles(EMPRESA)`, `AssegurarEmpresaAprovadaUseCase`
**Requirement**: INST-08, INST-10
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `GET /beneficiadas?busca=` exige empresa autenticada e aprovada (empresa pendente → 403)
- [ ] Resposta nunca traz documento, e-mail, telefone, CNPJ ou dados de decisão — asserido por inspeção do payload
- [ ] Busca com acento/sem acento devolve o mesmo resultado; catálogo vazio devolve `[]`
- [ ] Rota documentada no OpenAPI
- [ ] `test/http/beneficiadas.e2e-spec.ts` cobre os casos acima
- [ ] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): catálogo de beneficiadas para a empresa`

---

### T33: Sweep de concorrência e autorização

**What**: Testes e2e transversais para as corridas e os bloqueios de papel que a spec exige explicitamente.
**Where**: `test/http/catalogo-concorrencia.e2e-spec.ts`
**Depends on**: T29, T30, T31
**Reuses**: `test/http/concorrencia.e2e-spec.ts`
**Requirement**: INST-04, INST-05
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Dois autocadastros simultâneos com o mesmo CNPJ: um 201, um 409, um único registro no banco
- [ ] Aprovação e rejeição simultâneas do mesmo cadastro: a primeira vence, a segunda recebe 409
- [ ] Empresa e instituição com o mesmo CNPJ coexistem, e a fila do admin sinaliza a coincidência
- [ ] Toda rota administrativa do catálogo responde 403 para empresa e instituição autenticadas
- [ ] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `test(api): concorrência e autorização do catálogo de instituições`

---

### T34: Fechamento — OpenAPI exportado e documentação

**What**: Regenerar o `openapi.json` versionado e atualizar a documentação do `api` com as rotas e o fluxo novos.
**Where**: `api/openapi.json`
**Depends on**: T27, T28, T32, T33
**Reuses**: `npm run openapi:export`, README existente
**Requirement**: INST-01, INST-04, INST-07, INST-08
**Autor**: 🤖 agente

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `npm run openapi:export` rodado e `openapi.json` commitado; teste de paridade verde
- [ ] README do `api` lista as rotas novas e explica que o admin precisa criar causas antes de divulgar o autocadastro
- [ ] Gate `build` passa
- [ ] `validation.md` consolidado da feature escrito pelo Verifier (exigido por `validate_state.py`)

**Tests**: e2e
**Gate**: build
**Commit**: `docs(api): documenta o catálogo de instituições e exporta o openapi`

---

## Phase Execution Map

Grafo completo de dependências (`origem → alvo`), união das arestas dos blocos por fase:

```
T1 → T2
T1 → T3
T1 → T4
T1 → T5
T3 → T5
T2 → T6
T5 → T7
T2 → T9
T6 → T9
T2 → T10
T6 → T10
T2 → T11
T6 → T11
T7 → T11
T6 → T12
T3 → T13
T5 → T13
T6 → T13
T7 → T13
T7 → T14
T5 → T15
T7 → T15
T8 → T15
T5 → T16
T7 → T16
T5 → T17
T7 → T17
T5 → T18
T7 → T18
T6 → T19
T7 → T19
T6 → T20
T7 → T20
T21 → T22
T6 → T22
T21 → T23
T7 → T23
T4 → T24
T21 → T24
T23 → T25
T24 → T25
T8 → T26
T24 → T26
T9 → T27
T10 → T27
T11 → T27
T22 → T27
T12 → T28
T22 → T28
T27 → T28
T13 → T29
T23 → T29
T24 → T29
T14 → T30
T15 → T30
T16 → T30
T23 → T30
T26 → T30
T17 → T31
T18 → T31
T30 → T31
T19 → T32
T23 → T32
T29 → T33
T30 → T33
T31 → T33
T27 → T34
T28 → T34
T32 → T34
T33 → T34
```

Ordem de execução (prosa): Fase 1 `T1 … T5` · Fase 2 `T6 … T8` · Fase 3 `T9 … T12` · Fase 4 `T13 … T18` · Fase 5 `T19 → T20` · **gate de handoff** · Fase 6 `T21 → T22 → T23` · Fase 7 `T24 → T25 → T26` · Fase 8 `T27 … T32` · Fase 9 `T33 → T34`.

Execução estritamente sequencial — sem paralelismo intra-fase.

**Organização do trabalho humano (Fases 1–5, 20 tasks):** uma task = um commit atômico = uma issue. Tasks sem dependência entre si podem ser distribuídas entre pessoas diferentes do grupo (ex.: T2, T3 e T4 em paralelo; T9–T12 em paralelo depois de T6). Integração por Pull Request para `main`, branch `feat/catalogo-instituicoes-<assunto>`.

**Batches previstos para o agente (Fases 6–9, 14 tasks, ~7 tasks/worker, fases inteiras):** Fases 6+7 (6 tasks) → worker 1; Fase 8 (6 tasks) → worker 2; Fase 9 (2 tasks) → worker 3. Verifier independente ao final, escrevendo `validation.md`.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 9 arquivos de erro triviais, 1 conceito | ✅ Granular (coeso) |
| T2, T3 | 1 entidade / 1 VO | ✅ Granular |
| T4, T5 | 1 arquivo modificado | ✅ Granular |
| T6, T7 | 1 porta + seu double | ✅ Granular (coeso) |
| T8 | 1 porta + fake | ✅ Granular |
| T9–T20 | 1 caso de uso cada (T17 = par simétrico suspender/reativar) | ✅ Granular |
| T21 | 1 arquivo de schema + migration gerada | ✅ Granular |
| T22–T26 | 1 adaptador cada | ✅ Granular |
| T27–T32 | 1 controller (ou 1 grupo de rotas do mesmo recurso) cada | ✅ Granular |
| T33 | 1 arquivo de teste | ✅ Granular |
| T34 | 1 artefato gerado + docs | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama | Status |
| ---- | ------------------ | -------- | ------ |
| T1, T8, T21 | None | sem aresta de entrada | ✅ Match |
| T2, T3, T4 | T1 | `T1 → Tn` | ✅ Match |
| T5 | T1, T3 | `T1 → T5`, `T3 → T5` | ✅ Match |
| T6 | T2 | `T2 → T6` | ✅ Match |
| T7 | T5 | `T5 → T7` | ✅ Match |
| T9, T10 | T2, T6 | idem | ✅ Match |
| T11 | T2, T6, T7 | idem | ✅ Match |
| T12 | T6 | `T6 → T12` | ✅ Match |
| T13 | T3, T5, T6, T7 | idem | ✅ Match |
| T14 | T7 | `T7 → T14` | ✅ Match |
| T15 | T5, T7, T8 | idem | ✅ Match |
| T16, T17, T18 | T5, T7 | idem | ✅ Match |
| T19, T20 | T6, T7 | idem | ✅ Match |
| T22 | T6, T21 | idem | ✅ Match |
| T23 | T7, T21 | idem | ✅ Match |
| T24 | T4, T21 | idem | ✅ Match |
| T25 | T23, T24 | idem | ✅ Match |
| T26 | T8, T24 | idem | ✅ Match |
| T27 | T9, T10, T11, T22 | idem | ✅ Match |
| T28 | T12, T22, T27 | idem | ✅ Match |
| T29 | T13, T23, T24 | idem | ✅ Match |
| T30 | T14, T15, T16, T23, T26 | idem | ✅ Match |
| T31 | T17, T18, T30 | idem | ✅ Match |
| T32 | T19, T23 | idem | ✅ Match |
| T33 | T29, T30, T31 | idem | ✅ Match |
| T34 | T27, T28, T32, T33 | idem | ✅ Match |

Nenhuma dependência aponta para uma fase posterior.

---

## Test Co-location Validation

| Task | Camada criada/modificada | Matriz exige | Task declara | Status |
| ---- | ------------------------ | ------------ | ------------ | ------ |
| T1 | erros de aplicação | none | none | ✅ OK |
| T2, T3, T4, T5 | entidades e VOs | unit | unit | ✅ OK |
| T6, T7, T8 | portas + doubles de teste | none | none | ✅ OK |
| T9–T20 | casos de uso | unit | unit | ✅ OK |
| T21 | schema Prisma | none | none | ✅ OK |
| T22, T23 | adaptadores Prisma + mappers | e2e | e2e | ✅ OK |
| T24, T25, T26 | `ArquivoService` e adaptadores | e2e | e2e | ✅ OK |
| T27–T32 | controllers + OpenAPI | e2e | e2e | ✅ OK |
| T33 | teste e2e transversal | e2e | e2e | ✅ OK |
| T34 | artefato OpenAPI + docs | e2e (paridade) | e2e | ✅ OK |

Nenhuma task difere testes para outra: toda task que cria código com tipo de teste exigido escreve esses testes no mesmo commit.

---

## Requirement Traceability (rastreio task ↔ requisito)

| Requirement | Tasks | Status |
| ----------- | ----- | ------ |
| INST-01 | T1, T5, T13, T21, T29, T34 | Pending |
| INST-02 | T1, T3, T4, T13, T24, T29 | Pending |
| INST-03 | T1, T5, T13, T29 | Pending |
| INST-04 | T7, T14, T15, T16, T23, T30, T33, T34 | Pending |
| INST-05 | T5, T7, T15, T16, T17, T18, T21, T23, T30, T31, T33 | Pending |
| INST-06 | T8, T15, T25, T26, T30 | Pending |
| INST-07 | T1, T2, T6, T9, T10, T11, T12, T21, T22, T27, T28, T34 | Pending |
| INST-08 | T7, T12, T19, T23, T28, T32, T34 | Pending |
| INST-09 | T1, T20 | Pending |
| INST-10 | T19, T32 | Pending |
| INST-11, INST-12, INST-13 | — (P2, fora desta rodada) | Deferred |
