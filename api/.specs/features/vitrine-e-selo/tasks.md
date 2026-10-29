# Vitrine e Selo Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/vitrine-e-selo/design.md`
**Status**: Draft

**Autoria (AD-023):**

- 👤 **Grupo**: domínio (T1–T18) e `web` (T29–T44).
- 🤖 **Agente**: infra do `api` (T19–T28), que só começa depois do **gate de handoff**: build verde + verificação independente do agente sobre `src/domain/**` em `validation-dominio.md` com veredito PASS.
- Enquanto o domínio estiver aberto, o agente não escreve nem edita código em `src/domain/**`, `src/core/**`, `test/doubles/**`, `test/factories/**` e `web/**`; pode ler, revisar, rodar gates e escrever relatórios.

**Paralelismo do grupo:** as dependências de cada task são as reais, não a ordem numérica. O `web` (T29–T44) é escrito contra os contratos de `design.md` §Contratos HTTP, com `fetch` mockado nos testes, e não espera a infra.

## Divisão e cronograma

Prazo final: **qua 11/11/2026**.

| Pessoa | Assunto | Domínio | `web` |
| ------ | ------- | ------- | ----- |
| Pessoa 1 | Slug e aprovação (caminho crítico) | T1, T2, T3, T4, T11, T12, T13 | — |
| Pessoa 2 | Área da empresa | T6, T9, T14 | T29, T30, T31 |
| Pessoa 3 | Selo e detalhe da campanha | T7, T10, T15 | T35, T36, T38 |
| Pessoa 4 | Página pública | T16, T17 | T32, T33, T34 |
| Pessoa 5 | Vitrine | T5, T8, T18 | T39, T40 |
| Pessoa 6 | Nova campanha e admin | — | T37, T41, T42, T43, T44 |
| Agente | Infra do `api` | — | T19–T28 |

| Quando | Pessoa 1 | Pessoa 2 | Pessoa 3 | Pessoa 4 | Pessoa 5 | Pessoa 6 |
| ------ | -------- | -------- | -------- | -------- | -------- | -------- |
| **Onda 1** — qui 29/10 – sex 30/10 | T1, T2 | **T29, T30** (primeiro) | T7, T10 | T16, T32 | T5 | T42, T43 |
| **Onda 2** — sáb 31/10 – seg 02/11 | **T3, T4** | T6 | T35 | T33, T34 | T39, T40 | T44, T37 |
| **Onda 3** — ter 03/11 – qua 04/11 | T11 | T9 | T36, T38 | folga / revisão | T8 | T41 |
| **Onda 4** — qui 05/11 – sex 06/11 | T12, T13 | T14, T31 | T15 | T17 | T18 | folga / revisão |

| Quando | O quê | Quem |
| ------ | ----- | ---- |
| sex 06/11, fim do dia | Domínio e `web` com PRs abertas contra `homologacao` | Grupo |
| sáb 07/11 | Gate de handoff: verificação do domínio (`validation-dominio.md`); correções no mesmo dia | Agente verifica, grupo corrige |
| dom 08/11 – seg 09/11 | Infra T19–T28 | Agente |
| ter 10/11 | `web` contra a API real, teste ponta a ponta (criar → aprovar → selo → QR → página) e verificação final | Grupo + agente |
| qua 11/11 | Entrega; folga para correções | Grupo |

**Pontos de coordenação:**

- A Pessoa 2 entrega T29 e T30 na onda 1: T29 cria `web/src/services/campanhas.ts`, onde as Pessoas 3 e 6 acrescentam funções (T35, T37); T30 é a formatação usada pelas Pessoas 3 e 4 (T33, T36).
- A Pessoa 1 entrega T3 e T4 até seg 02/11: sem elas, as Pessoas 2, 5 e a própria 1 param na onda 3 (T8, T9, T11).
- Cada pessoa trabalha numa branch própria a partir de `homologacao` (`vitrine/pessoa-N`) e abre PR ao fim de cada onda, para os arquivos compartilhados (`index.ts` das fatias, `services/campanhas.ts`) entrarem cedo.

**Risco de prazo:** sobram 2 dias entre o gate e a entrega. Nas duas features anteriores o gate levou 3 rodadas. Se a rodada 1 falhar, as correções precisam sair no próprio sáb 07/11; senão a infra atrasa e a integração de ter 10/11 fica comprometida.

---

## Test Coverage Matrix

> Gerada do codebase, guidelines do projeto e spec — confirmar antes do Execute.
> **Guidelines encontradas:** nenhuma (`AGENTS.md`, `CONTRIBUTING.md`, thresholds de coverage — ausentes) → **strong defaults**, iguais à matriz de `campanhas`. No `web`: `vitest.config.ts` (jsdom, `passWithNoTests: false`).
> **Amostras:** `src/domain/fivo/<fatia>/**/*.spec.ts` (unit co-locado, doubles em `test/doubles/`, factories em `test/factories/`); `test/database/*.e2e-spec.ts`; `test/http/<fatia>/*.e2e-spec.ts`; `web/tests/unit/*.test.ts` (serviços com `fetch` mockado); `web/tests/component/*.test.tsx` e `web/tests/integration/*.test.tsx` (Testing Library).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Value objects e entidades — `src/domain/fivo/*/entities/**` | unit | Todas as ramificações; 1:1 com os ACs; limite de 60 caracteres testado nos dois lados | `src/domain/fivo/*/entities/*.spec.ts` | `cd api && npx jest` |
| Casos de uso — `src/domain/fivo/*/use-cases/**` | unit | Happy + cada erro + cada edge case, com doubles; mensagem literal do erro (L-001); "nada gravado" em todo caminho de erro | `src/domain/fivo/*/use-cases/*.spec.ts` | `cd api && npx jest` |
| Portas, erros, doubles, factories, `index.ts` | none | build gate; exercitados pelos testes dos casos de uso | — | build gate |
| Renderizador de selo — `src/infra/selo/**` | unit | QR decodificado igual à URL; nível Q; margem ≥ 4 módulos; sem `<image>`; bytes idênticos em duas chamadas | `src/infra/selo/*.spec.ts` | `cd api && npx jest` |
| Adaptadores Prisma + mappers, backfill | e2e | Ida e volta do slug; unicidade (global e por empresa) → `SlugEmUsoError`; consultas novas; backfill idempotente | `test/database/*.e2e-spec.ts` | `cd api && npx jest --config ./test/jest-e2e.json` |
| Controllers — `src/infra/http/**` | e2e | Toda rota nova: happy + cada edge case + 403/404/409; campos proibidos ausentes; OpenAPI (teste de paridade existente) | `test/http/<fatia>/*.e2e-spec.ts` | `cd api && npx jest --config ./test/jest-e2e.json` |
| Schema Prisma, migration, módulos Nest | none | build gate + `prisma migrate diff` sem drift | — | build gate |
| Serviços do `web` — `web/src/services/**` | unit | Cada função: URL, método e corpo enviados; resposta 2xx mapeada; 4xx/5xx viram `ApiError` | `web/tests/unit/*.test.ts` | `cd web && npm test` |
| Páginas e componentes do `web` | component | Cada AC de tela: textos literais da spec, estados vazio/erro/carregando, botões por status | `web/tests/component/*.test.tsx`, `web/tests/integration/*.test.tsx` | `cd web && npm test` |

## Gate Check Commands

> Gerada do codebase — confirmar antes do Execute.
> **Pré-requisito de `full` e `build` no `api`:** `cd api && docker compose -f docker-compose.test.yml up -d && npx prisma migrate deploy`

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tasks de domínio e T23 | `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest` |
| Full | Tasks de infra com e2e | `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json` |
| Build | Fim de fase no `api`, schema/config | `cd api && npm run build && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json` |
| Web | Toda task do `web` | `cd web && npx tsc --noEmit && npm run lint && npm test` |

---

## Execution Plan

As fases agrupam as tasks por assunto; as dependências abaixo são as reais, e a ordem de trabalho do grupo é a das ondas do cronograma. Cada bloco lista as arestas de dependência cujo alvo está naquela fase (`origem → alvo`).

### Phase 1: Domínio — slug (👤)

T1, T2 não têm dependência.

```
T1 → T3
T2 → T3
T1 → T4
T2 → T4
```

### Phase 2: Domínio — portas, doubles e factories (👤)

T5, T6, T7 não têm dependência.

```
T2 → T8
T3 → T8
T5 → T8
T2 → T9
T4 → T9
T6 → T9
T7 → T10
T3 → T11
T4 → T11
```

### Phase 3: Domínio — casos de uso (👤)

T16 não tem dependência.

```
T8 → T12
T11 → T12
T9 → T13
T11 → T13
T9 → T14
T11 → T14
T9 → T15
T10 → T15
T11 → T15
T8 → T17
T9 → T17
T11 → T17
T16 → T17
T8 → T18
T11 → T18
```

**Gate de handoff** (agente): verificação independente de `src/domain/**` → `validation-dominio.md` PASS.

### Phase 4: Infra — persistência (🤖)

```
T18 → T19
T19 → T20
T20 → T21
T21 → T22
```

### Phase 5: Infra — selo e HTTP (🤖)

```
T22 → T23
T23 → T24
T24 → T25
T25 → T26
T26 → T27
T27 → T28
```

### Phase 6: `web` — área da empresa, detalhe e limpeza (👤, partes 1 e 6)

T29 não tem dependência.

```
T29 → T30
T30 → T31
T29 → T35
T35 → T36
T30 → T36
T36 → T38
```

### Phase 7: `web` — página pública e vitrine (👤, partes 2 e 3)

T32 não tem dependência.

```
T32 → T33
T30 → T33
T33 → T34
T32 → T39
T39 → T40
```

### Phase 8: `web` — nova campanha e admin (👤, partes 4 e 5)

T42 não tem dependência.

```
T29 → T37
T37 → T41
T42 → T43
T43 → T44
```

---

## Task Breakdown

### T1: `Slug` (value object) e `proximoSlugLivre`

**What**: Value object `Slug` com `de(texto, padrao)`, `reconstruir(valor)`, `valor`, e a função pura `proximoSlugLivre(base, ocupados)`.
**Where**: `src/domain/fivo/shared/entities/slug.ts`
**Depends on**: None
**Reuses**: `ValueObject` (`@core/types/entities/value-object`)
**Requirement**: VIT-01
**Autor**: 👤 humano
**Responsável**: Pessoa 1
**Onda**: 1 (qui 29/10 – sex 30/10)

**Tools**: MCP: NONE · Skill: NONE

**ACs cobertos** (Slug): AC3, AC4, AC5, AC6.

**Done when**:

- [ ] "Café Serra Verde" → `cafe-serra-verde`; "  Água & Sabão!! " → `agua-sabao`; "ÇÃO--já" → `cao-ja`
- [ ] Texto que normaliza para 60 caracteres fica com 60; para 61 fica truncado em 60; truncamento que termina em hífen remove o hífen
- [ ] "!!!" com padrão `empresa` → `empresa`; com padrão `campanha` → `campanha`
- [ ] `proximoSlugLivre`: livre → base; base ocupada → `-2`; base e `-2` ocupadas → `-3`; `-2` ocupada e base livre → base
- [ ] Exportado por `src/domain/fivo/shared/index.ts`
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): value object de slug`

---

### T2: Erros `SlugJaAtribuidoError` e `SlugEmUsoError`

**What**: Dois erros de domínio em `shared/errors/`, com `status` 409, exportados pelo `index.ts` da fatia.
**Where**: `src/domain/fivo/shared/errors/slug.errors.ts`
**Depends on**: None
**Reuses**: `TransicaoInvalidaError` (forma)
**Requirement**: VIT-01
**Autor**: 👤 humano
**Responsável**: Pessoa 1
**Onda**: 1 (qui 29/10 – sex 30/10)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Os dois erros estendem a base de erro de aplicação e têm `status` 409
- [ ] Exportados por `shared/index.ts`
- [ ] Gate `quick` passa

**Tests**: none
**Gate**: quick
**Commit**: `feat(api): erros de slug`

---

### T3: `Empresa.slug` e `Empresa.atribuirSlug`

**What**: Prop `slug?: Slug | null`, getter e `atribuirSlug(slug): Either<SlugJaAtribuidoError, void>`.
**Where**: `src/domain/fivo/empresas/entities/empresa.ts`
**Depends on**: T1, T2
**Reuses**: padrão de métodos com `Either` da própria entidade
**Requirement**: VIT-01
**Autor**: 👤 humano
**Responsável**: Pessoa 1
**Onda**: 2 (sáb 31/10 – seg 02/11)

**Tools**: MCP: NONE · Skill: NONE

**ACs cobertos** (Slug): AC7.

**Done when**:

- [ ] Empresa nova nasce com `slug` nulo
- [ ] `atribuirSlug` em empresa sem slug grava o valor
- [ ] Segunda chamada devolve `SlugJaAtribuidoError` e mantém o slug original
- [ ] `editar...` de `nomeFantasia`, `suspender` e `reativar` não alteram o slug
- [ ] Sem setter público de `slug`
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): slug na empresa`

---

### T4: `Campanha.slug` e `Campanha.atribuirSlug`

**What**: Prop `slug?: Slug | null`, getter e `atribuirSlug(slug): Either<SlugJaAtribuidoError, void>`.
**Where**: `src/domain/fivo/campanhas/entities/campanha.ts`
**Depends on**: T1, T2
**Reuses**: T3 (mesmo contrato)
**Requirement**: VIT-01
**Autor**: 👤 humano
**Responsável**: Pessoa 1
**Onda**: 2 (sáb 31/10 – seg 02/11)

**Tools**: MCP: NONE · Skill: NONE

**ACs cobertos** (Slug): AC7.

**Done when**:

- [ ] Campanha nova nasce com `slug` nulo
- [ ] `atribuirSlug` grava; segunda chamada devolve `SlugJaAtribuidoError` e mantém o original
- [ ] `editarTextos` com nome novo e aprovação de alteração de compromisso não alteram o slug
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): slug na campanha`

---

### T5: `EmpresaRepository` — métodos de slug

**What**: Acrescentar `findBySlug(slug)` e `listarSlugsComPrefixo(prefixo)`; documentar no JSDoc de `salvarTransicao` que ela grava `slug` e lança `SlugEmUsoError` em conflito de unicidade.
**Where**: `src/domain/fivo/empresas/ports/empresa-repository.ts`
**Depends on**: None
**Reuses**: porta existente
**Requirement**: VIT-01, VIT-06
**Autor**: 👤 humano
**Responsável**: Pessoa 5
**Onda**: 1 (qui 29/10 – sex 30/10)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Assinaturas iguais às de `design.md` §Portas
- [ ] Gate `quick` passa

**Tests**: none
**Gate**: quick
**Commit**: `feat(api): porta de empresa com busca por slug`

---

### T6: `CampanhaRepository.listarPorEmpresa`

**What**: Acrescentar `listarPorEmpresa(empresaId)` (todas, `createdAt` desc); documentar no JSDoc de `salvar` a gravação de `slug` e o `SlugEmUsoError`.
**Where**: `src/domain/fivo/campanhas/ports/campanha-repository.ts`
**Depends on**: None
**Reuses**: porta existente
**Requirement**: VIT-01, VIT-02, VIT-06
**Autor**: 👤 humano
**Responsável**: Pessoa 2
**Onda**: 2 (sáb 31/10 – seg 02/11)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Assinatura igual à de `design.md` §Portas
- [ ] Gate `quick` passa

**Tests**: none
**Gate**: quick
**Commit**: `feat(api): porta de campanha lista por empresa`

---

### T7: Porta `RenderizadorDeSelo`

**What**: `abstract class RenderizadorDeSelo { renderizar({ slugEmpresa, slugCampanha }): Promise<string> }`, exportada por `campanhas/index.ts`.
**Where**: `src/domain/fivo/campanhas/ports/renderizador-de-selo.ts`
**Depends on**: None
**Reuses**: forma de `Storage`/`Mailer`
**Requirement**: VIT-04
**Autor**: 👤 humano
**Responsável**: Pessoa 3
**Onda**: 1 (qui 29/10 – sex 30/10)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Porta exportada pela fatia
- [ ] Gate `quick` passa

**Tests**: none
**Gate**: quick
**Commit**: `feat(api): porta de renderização do selo`

---

### T8: `InMemoryEmpresaRepository` — slug

**What**: Implementar os métodos de T5 e fazer `salvarTransicao` lançar `SlugEmUsoError` quando outro registro já tiver o mesmo slug; permitir forçar esse conflito uma vez, para o teste de corrida.
**Where**: `test/doubles/in-memory-empresa-repository.ts`
**Depends on**: T2, T3, T5
**Reuses**: double existente
**Requirement**: VIT-01
**Autor**: 👤 humano
**Responsável**: Pessoa 5
**Onda**: 3 (ter 03/11 – qua 04/11)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Métodos novos implementados; testes existentes continuam verdes
- [ ] Gate `quick` passa

**Tests**: none
**Gate**: quick
**Commit**: `test(api): double de empresa com slug`

---

### T9: `InMemoryCampanhaRepository` — slug e lista por empresa

**What**: Implementar `listarPorEmpresa` e fazer `salvar` lançar `SlugEmUsoError` quando outra campanha da mesma empresa tiver o slug; permitir forçar o conflito uma vez.
**Where**: `test/doubles/in-memory-campanha-repository.ts`
**Depends on**: T2, T4, T6
**Reuses**: double existente
**Requirement**: VIT-01, VIT-02
**Autor**: 👤 humano
**Responsável**: Pessoa 2
**Onda**: 3 (ter 03/11 – qua 04/11)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Métodos novos implementados; testes existentes continuam verdes
- [ ] Gate `quick` passa

**Tests**: none
**Gate**: quick
**Commit**: `test(api): double de campanha com slug`

---

### T10: `FakeRenderizadorDeSelo`

**What**: Fake que devolve `<svg data-empresa="{slugEmpresa}" data-campanha="{slugCampanha}"/>` e registra as chamadas.
**Where**: `test/doubles/fake-renderizador-de-selo.ts`
**Depends on**: T7
**Reuses**: fakes existentes em `test/doubles/`
**Requirement**: VIT-04
**Autor**: 👤 humano
**Responsável**: Pessoa 3
**Onda**: 1 (qui 29/10 – sex 30/10)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Saída determinística para os mesmos slugs
- [ ] Gate `quick` passa

**Tests**: none
**Gate**: quick
**Commit**: `test(api): fake do renderizador de selo`

---

### T11: Factories com `slug`

**What**: `makeEmpresa` e `makeCampanha` aceitam `slug` (padrão nulo).
**Where**: `test/factories/make-empresa.ts`
**Depends on**: T3, T4
**Reuses**: factories existentes (`make-campanha.ts` muda junto)
**Requirement**: VIT-01
**Autor**: 👤 humano
**Responsável**: Pessoa 1
**Onda**: 3 (ter 03/11 – qua 04/11)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] As duas factories aceitam `slug`
- [ ] Gate `quick` passa

**Tests**: none
**Gate**: quick
**Commit**: `test(api): factories com slug`

---

### T12: `AprovarEmpresaUseCase` atribui slug

**What**: Na aprovação, se não houver slug, calcular `proximoSlugLivre(Slug.de(nomeFantasia, 'empresa'), listarSlugsComPrefixo(base))`, atribuir e gravar; em `SlugEmUsoError`, recarregar e repetir até 3 tentativas, depois relançar.
**Where**: `src/domain/fivo/empresas/use-cases/aprovar-empresa.ts`
**Depends on**: T8, T11
**Reuses**: caso de uso existente
**Requirement**: VIT-01
**Autor**: 👤 humano
**Responsável**: Pessoa 1
**Onda**: 4 (qui 05/11 – sex 06/11)

**Tools**: MCP: NONE · Skill: NONE

**ACs cobertos** (Slug): AC1, AC5, AC7; edge case de aprovações simultâneas.

**Done when**:

- [ ] Aprovação grava `cafe-serra-verde` para "Café Serra Verde"
- [ ] Segunda empresa homônima recebe `cafe-serra-verde-2`
- [ ] Empresa que já tem slug mantém o slug
- [ ] Conflito forçado uma vez → segunda tentativa grava `-2` e a aprovação devolve sucesso
- [ ] Conflito nas 3 tentativas → erro relançado e status persistido continua `PENDENTE_APROVACAO`
- [ ] Testes existentes de aprovação continuam verdes
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): aprovação de empresa atribui slug`

---

### T13: `AprovarCampanhaUseCase` atribui slug

**What**: Mesmo fluxo de T12 com `Slug.de(nome, 'campanha')` e `ocupados` = slugs de `listarPorEmpresa(empresaId)`.
**Where**: `src/domain/fivo/campanhas/use-cases/aprovar-campanha.ts`
**Depends on**: T9, T11
**Reuses**: T12
**Requirement**: VIT-01
**Autor**: 👤 humano
**Responsável**: Pessoa 1
**Onda**: 4 (qui 05/11 – sex 06/11)

**Tools**: MCP: NONE · Skill: NONE

**ACs cobertos** (Slug): AC2, AC6, AC7.

**Done when**:

- [ ] Aprovação grava o slug do nome
- [ ] Campanha homônima da mesma empresa recebe `-2`; de outra empresa recebe o slug sem sufixo
- [ ] Conflito forçado uma vez → sucesso com `-2`; 3 conflitos → erro relançado e status persistido continua `EM_ANALISE`
- [ ] `AprovarAlteracaoCampanhaUseCase` não altera o slug (teste no spec dele)
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): aprovação de campanha atribui slug`

---

### T14: `ListarCampanhasDaEmpresaUseCase`

**What**: `{ empresaId }` → `{ slugEmpresa, campanhas: { id, nome, status, regraDoacao, slug }[] }`, `createdAt` desc.
**Where**: `src/domain/fivo/campanhas/use-cases/listar-campanhas-da-empresa.ts`
**Depends on**: T9, T11
**Reuses**: `descreverRegra` (`campanha-detalhe.ts`)
**Requirement**: VIT-02
**Autor**: 👤 humano
**Responsável**: Pessoa 2
**Onda**: 4 (qui 05/11 – sex 06/11)

**Tools**: MCP: NONE · Skill: NONE

**ACs cobertos** (Área): AC1, AC2; insumo de AC3.

**Done when**:

- [ ] Devolve só campanhas da empresa, mais recente primeiro
- [ ] `regraDoacao` nula quando não definida; `POR_UNIDADE` com `valor`, `PERCENTUAL` com `percentual`
- [ ] Empresa inexistente → `ResourceNotFoundError` com mensagem "Empresa não encontrada"
- [ ] Empresa sem campanhas → lista vazia
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): lista de campanhas da empresa`

---

### T15: `GerarSeloUseCase` e `CampanhaNaoAprovadaError`

**What**: `{ empresaId, campanhaId }` → `{ svg, slugCampanha }` via `RenderizadorDeSelo`; cria `CampanhaNaoAprovadaError` (`status` 409, "Campanha não está aprovada") em `campanhas/errors/`.
**Where**: `src/domain/fivo/campanhas/use-cases/gerar-selo.ts`
**Depends on**: T9, T10, T11
**Reuses**: checagem de dono de `ConsultarCampanhaDaEmpresaUseCase`
**Requirement**: VIT-04
**Autor**: 👤 humano
**Responsável**: Pessoa 3
**Onda**: 4 (qui 05/11 – sex 06/11)

**Tools**: MCP: NONE · Skill: NONE

**ACs cobertos** (Selo): AC5, AC6, AC7.

**Done when**:

- [ ] Campanha `APROVADA` da empresa → SVG do renderizador com os dois slugs
- [ ] Duas chamadas → SVG idêntico
- [ ] `RASCUNHO`, `EM_ANALISE` e `REJEITADA` → `CampanhaNaoAprovadaError` com a mensagem literal (um teste por estado); renderizador não chamado
- [ ] Campanha inexistente e campanha de outra empresa → `ResourceNotFoundError("Campanha não encontrada")`
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): geração do selo da campanha`

---

### T16: Extrair a montagem da campanha pública

**What**: Mover de `BuscarCampanhaPublicaUseCase` para uma função compartilhada a resolução do nome da beneficiada e o cálculo de `situacao`, sem mudar o comportamento.
**Where**: `src/domain/fivo/campanhas/use-cases/campanha-publica.ts`
**Depends on**: None
**Reuses**: `buscar-campanha-publica.ts`
**Requirement**: VIT-06
**Autor**: 👤 humano
**Responsável**: Pessoa 4
**Onda**: 1 (qui 29/10 – sex 30/10)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `buscar-campanha-publica.spec.ts` continua verde sem alteração
- [ ] Teste unit da função nova cobre `NAO_INICIADA` (início amanhã) e `EM_ANDAMENTO` (início hoje)
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `refactor(api): extrai montagem da campanha pública`

---

### T17: `BuscarEmpresaPublicaUseCase`

**What**: `{ slug }` → contrato de `GET /empresas/publicas/{slug}` (design §Contratos), com as campanhas `APROVADA` por `decididoEm` desc.
**Where**: `src/domain/fivo/campanhas/use-cases/buscar-empresa-publica.ts`
**Depends on**: T8, T9, T11, T16
**Reuses**: T16, `descreverRegra`, `descreverVigencia`
**Requirement**: VIT-06
**Autor**: 👤 humano
**Responsável**: Pessoa 4
**Onda**: 4 (qui 05/11 – sex 06/11)

**Tools**: MCP: NONE · Skill: NONE

**ACs cobertos** (Página pública): AC1, AC2, AC3, AC4; edge cases de suspensão e de alteração pendente.

**Done when**:

- [ ] Empresa `APROVADA` → campos do contrato, nenhum outro (o teste compara as chaves exatas do objeto)
- [ ] Campanhas em `RASCUNHO`, `EM_ANALISE`, `REJEITADA` e campanha `APROVADA` sem slug ficam fora
- [ ] Ordem por aprovação, mais recente primeiro
- [ ] Campanha com alteração pendente expõe o compromisso aprovado vigente
- [ ] Slug inexistente, empresa `PENDENTE_APROVACAO`, `REJEITADA` e `SUSPENSA` → `ResourceNotFoundError("Empresa não encontrada")` (um teste por caso)
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): página pública da empresa`

---

### T18: `ListarParceirosUseCase`

**What**: `()` → `{ slug, nomeFantasia, cidade, uf, temLogo }[]` das empresas `APROVADA`, ordenadas com `Intl.Collator('pt-BR', { sensitivity: 'base' })`.
**Where**: `src/domain/fivo/empresas/use-cases/listar-parceiros.ts`
**Depends on**: T8, T11
**Reuses**: `EmpresaRepository.listarPorEstado`
**Requirement**: VIT-08
**Autor**: 👤 humano
**Responsável**: Pessoa 5
**Onda**: 4 (qui 05/11 – sex 06/11)

**Tools**: MCP: NONE · Skill: NONE

**ACs cobertos** (Vitrine): AC1, AC2.

**Done when**:

- [ ] Só empresas `APROVADA` (um teste com uma de cada outro estado)
- [ ] "água", "Abelha", "Zebu" → ordem "Abelha", "água", "Zebu"
- [ ] Empresa aprovada sem slug fica fora
- [ ] Nenhuma empresa → lista vazia
- [ ] Gate `build` passa (fim do domínio)

**Tests**: unit
**Gate**: build
**Commit**: `feat(api): vitrine de parceiros`

---

### T19: Schema Prisma e migration do slug

**What**: `Empresa.slug String? @unique`; `Campanha.slug String?` com `@@unique([empresaId, slug])`; migration.
**Where**: `prisma/schema.prisma`
**Depends on**: T18 (gate de handoff PASS)
**Reuses**: migrations existentes
**Requirement**: VIT-01
**Autor**: 🤖 agente
**Onda**: infra (dom 08/11 – seg 09/11)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `npx prisma migrate dev` gera a migration; `prisma migrate diff` sem drift
- [ ] Gate `build` passa

**Tests**: none
**Gate**: build
**Commit**: `feat(api): coluna de slug em empresa e campanha`

---

### T20: `PrismaEmpresaRepository` — slug

**What**: Mapper com `slug`; `findBySlug`; `listarSlugsComPrefixo`; `salvarTransicao` grava `slug` e converte P2002 com alvo `slug` em `SlugEmUsoError`.
**Where**: `src/infra/database/prisma/repositories/prisma-empresa-repository.ts`
**Depends on**: T19
**Reuses**: `ehViolacaoDeUnicidade`, padrão de `prisma-instituicao-repository.ts:96`
**Requirement**: VIT-01, VIT-06, VIT-08
**Autor**: 🤖 agente
**Onda**: infra (dom 08/11 – seg 09/11)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Ida e volta do slug; `findBySlug` acha e devolve nulo para inexistente
- [ ] `listarSlugsComPrefixo('cafe')` devolve todos os slugs que começam com `cafe` (`cafe`, `cafe-2`, `cafeteria`); o filtro exato fica em `proximoSlugLivre`
- [ ] Slug repetido em outra empresa → `SlugEmUsoError`, transição não gravada
- [ ] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): repositório de empresa com slug`

---

### T21: `PrismaCampanhaRepository` — slug e lista por empresa

**What**: Mapper com `slug`; `listarPorEmpresa`; `salvar` grava `slug` e converte P2002 com alvo `slug` em `SlugEmUsoError` (P2002 de outra coluna mantém o tratamento atual).
**Where**: `src/infra/database/prisma/repositories/prisma-campanha-repository.ts`
**Depends on**: T20
**Reuses**: T20
**Requirement**: VIT-01, VIT-02
**Autor**: 🤖 agente
**Onda**: infra (dom 08/11 – seg 09/11)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Ida e volta do slug; `listarPorEmpresa` só da empresa, `createdAt` desc
- [ ] Mesmo slug em empresas diferentes é aceito; na mesma empresa → `SlugEmUsoError` e versão não incrementada
- [ ] e2e existentes do repositório continuam verdes
- [ ] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): repositório de campanha com slug`

---

### T22: Backfill de slugs

**What**: Script idempotente que atribui slug a empresas `APROVADA`/`SUSPENSA` e campanhas `APROVADA` sem slug, em ordem de `decididoEm`, usando `Slug` e `proximoSlugLivre`; comando `npm run backfill:slugs`.
**Where**: `prisma/scripts/backfill-slugs.ts`
**Depends on**: T21
**Reuses**: T1
**Requirement**: VIT-01
**Autor**: 🤖 agente
**Onda**: infra (dom 08/11 – seg 09/11)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Duas empresas homônimas aprovadas recebem base e `-2` pela ordem de `decididoEm`
- [ ] Empresa `PENDENTE_APROVACAO` e campanha `RASCUNHO` ficam sem slug
- [ ] Segunda execução não muda nada
- [ ] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): backfill de slugs`

---

### T23: `QrCodeRenderizadorDeSelo`

**What**: Instalar `qrcode`; adaptador da porta com template SVG fixo (wordmark "Fivo", texto "Selo Sustentável Fivo") e QR de `urlPublicaDaCampanha(slugEmpresa, slugCampanha)` = `${WEB_URL}/empresa/{slugEmpresa}/{slugCampanha}`; `WEB_URL` obrigatório em produção.
**Where**: `src/infra/selo/qrcode-renderizador-de-selo.ts`
**Depends on**: T22
**Reuses**: `WEB_URL` (`.env.example:20`)
**Requirement**: VIT-04
**Autor**: 🤖 agente
**Onda**: infra (dom 08/11 – seg 09/11)

**Tools**: MCP: `context7` (API do `qrcode`) · Skill: NONE

**ACs cobertos** (Selo): AC2, AC3, AC4, AC5.

**Done when**:

- [ ] QR do SVG, rasterizado e decodificado no teste, é exatamente a URL esperada
- [ ] Nível de correção Q e margem ≥ 4 módulos conferidos no SVG gerado
- [ ] SVG contém "Selo Sustentável Fivo" e nenhum elemento `<image>`
- [ ] Duas chamadas com os mesmos slugs → bytes idênticos
- [ ] Sem `WEB_URL` com `NODE_ENV=production` → erro na construção
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `feat(api): renderizador do selo com QR Code`

---

### T24: `GET /campanhas`

**What**: Rota no `CampanhasController` com presenter que monta `urlPublica` (só `APROVADA`); registrar `ListarCampanhasDaEmpresaUseCase` no `HttpModule`; OpenAPI.
**Where**: `src/infra/http/campanhas/campanhas.controller.ts`
**Depends on**: T23
**Reuses**: `idDaEmpresaDe`, `urlPublicaDaCampanha`
**Requirement**: VIT-02
**Autor**: 🤖 agente
**Onda**: infra (dom 08/11 – seg 09/11)

**Tools**: MCP: NONE · Skill: NONE

**ACs cobertos** (Área): AC1, AC2, AC3, AC4.

**Done when**:

- [ ] 200 com só as campanhas da empresa, ordem e campos do contrato
- [ ] `urlPublica` preenchida na `APROVADA`, `null` nas outras
- [ ] ADMIN e INSTITUICAO → 403; sem sessão → 401
- [ ] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): rota de campanhas da empresa`

---

### T25: `GET /campanhas/:id/selo`

**What**: Rota que devolve o SVG com `Content-Type: image/svg+xml` e `Content-Disposition: attachment; filename="selo-{slugCampanha}.svg"`; registrar `GerarSeloUseCase` e o renderizador; OpenAPI.
**Where**: `src/infra/http/campanhas/campanhas.controller.ts`
**Depends on**: T24
**Reuses**: T23
**Requirement**: VIT-04
**Autor**: 🤖 agente
**Onda**: infra (dom 08/11 – seg 09/11)

**Tools**: MCP: NONE · Skill: NONE

**ACs cobertos** (Selo): AC1, AC6, AC7, AC8.

**Done when**:

- [ ] 200 com os dois cabeçalhos exatos; QR decodificado aponta para `/empresa/{slugEmpresa}/{slugCampanha}`
- [ ] Campanha em rascunho → 409 "Campanha não está aprovada"
- [ ] Campanha de outra empresa e id inexistente → 404 "Campanha não encontrada"
- [ ] ADMIN → 403
- [ ] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): rota de download do selo`

---

### T26: `GET /empresas/publicas`

**What**: `EmpresasPublicasController` novo (`@Public()`) com a vitrine; registrar `ListarParceirosUseCase`; OpenAPI.
**Where**: `src/infra/http/empresas/empresas-publicas.controller.ts`
**Depends on**: T25
**Reuses**: `campanhas-publicas.controller.ts`
**Requirement**: VIT-08
**Autor**: 🤖 agente
**Onda**: infra (dom 08/11 – seg 09/11)

**Tools**: MCP: NONE · Skill: NONE

**ACs cobertos** (Vitrine): AC1, AC2.

**Done when**:

- [ ] 200 sem sessão, ordem alfabética sem acento, só `APROVADA`
- [ ] Empresa suspensa sai da lista
- [ ] Nenhum campo além de `slug`, `nomeFantasia`, `cidade`, `uf`, `temLogo`
- [ ] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): rota da vitrine de parceiros`

---

### T27: `GET /empresas/publicas/:slug`

**What**: Rota da página pública; registrar `BuscarEmpresaPublicaUseCase`; OpenAPI.
**Where**: `src/infra/http/empresas/empresas-publicas.controller.ts`
**Depends on**: T26
**Reuses**: T26
**Requirement**: VIT-06
**Autor**: 🤖 agente
**Onda**: infra (dom 08/11 – seg 09/11)

**Tools**: MCP: NONE · Skill: NONE

**ACs cobertos** (Página pública): AC1, AC2, AC3, AC4.

**Done when**:

- [ ] 200 sem sessão com o contrato; campanha não aprovada fora
- [ ] Corpo sem `razaoSocial`, `cnpj`, `telefone`, `logradouro`, `numero`, `complemento`, `bairro`, `cep`, `contato`, e-mail e ids internos
- [ ] Slug inexistente e empresa suspensa → 404 com corpos idênticos
- [ ] Gate `full` passa

**Tests**: e2e
**Gate**: full
**Commit**: `feat(api): rota da página pública da empresa`

---

### T28: `GET /empresas/publicas/:slug/logo` e e2e da aprovação com slug

**What**: Rota pública do logo (mesmos cabeçalhos da capa pública) e e2e que aprova empresa e campanha pelas rotas de admin e confere o slug pela página pública.
**Where**: `src/infra/http/empresas/empresas-publicas.controller.ts`
**Depends on**: T27
**Reuses**: `campanhas-publicas.controller.ts:118`
**Requirement**: VIT-06, VIT-01
**Autor**: 🤖 agente
**Onda**: infra (dom 08/11 – seg 09/11)

**Tools**: MCP: NONE · Skill: NONE

**ACs cobertos** (Página pública): AC5; (Slug): AC1, AC2, AC7.

**Done when**:

- [ ] 200 com bytes e `Content-Type` do logo; `X-Content-Type-Options: nosniff`
- [ ] Empresa sem logo, slug inexistente e empresa suspensa → 404
- [ ] Aprovar "Café Serra Verde" pelo admin → `GET /empresas/publicas/cafe-serra-verde` 200; renomear e conferir que o slug continua
- [ ] Gate `build` passa (fim da infra)

**Tests**: e2e
**Gate**: build
**Commit**: `feat(api): logo público da empresa`

---

### T29: `services/campanhas.ts` — tipos, lista e selo

**What**: Criar o serviço com os tipos do contrato e as funções `listarCampanhas()` (`GET /campanhas`) e `baixarSelo(id)` (`GET /campanhas/{id}/selo`, devolve `Blob` e nome do arquivo).
**Where**: `web/src/services/campanhas.ts`
**Depends on**: None
**Reuses**: `services/api.ts`
**Requirement**: VIT-03, VIT-05
**Autor**: 👤 humano (parte 1)
**Responsável**: Pessoa 2
**Onda**: 1 (qui 29/10 – sex 30/10)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Teste confere URL, método e mapeamento de 200; 403/404/409 viram `ApiError` com o `status`
- [ ] `baixarSelo` lê o nome de `Content-Disposition`
- [ ] Gate `web` passa

**Tests**: unit
**Gate**: web
**Commit**: `feat(web): serviço de campanhas da empresa`

---

### T30: Formatação de valor e status

**What**: `textoDoValor(regraDoacao)` e `rotuloDoStatus(status)` com os textos de VIT-03 AC6 e AC7.
**Where**: `web/src/lib/campanhas/formatacao.ts`
**Depends on**: T29
**Reuses**: `Intl.NumberFormat('pt-BR')`
**Requirement**: VIT-03
**Autor**: 👤 humano (parte 1)
**Responsável**: Pessoa 2
**Onda**: 1 (qui 29/10 – sex 30/10)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] `{ POR_UNIDADE, "1.00" }` → "R$ 1,00 por unidade vendida"; `{ PERCENTUAL, "2.50" }` → "2,5% de cada venda"; `null` → "Regra de doação não definida"
- [ ] Os 4 rótulos de status literais
- [ ] Gate `web` passa

**Tests**: unit
**Gate**: web
**Commit**: `feat(web): formatação de valor e status da campanha`

---

### T31: Cards de campanha em `/campanhas` e no dashboard

**What**: Trocar a lista fixa de `app/(app)/campanhas/page.tsx` e de `DashboardView` por `listarCampanhas()`; `CampaignCard` mostra nome, valor e status; "Baixar selo" e "Ver página pública" só na `APROVADA`; estado vazio.
**Where**: `web/src/components/dashboard/CampaignCard.tsx`
**Depends on**: T30
**Reuses**: `CampaignCard`, `NewCampaignCard`
**Requirement**: VIT-03, VIT-05
**Autor**: 👤 humano (parte 1)
**Responsável**: Pessoa 2
**Onda**: 4 (qui 05/11 – sex 06/11)

**Tools**: MCP: NONE · Skill: NONE

**ACs cobertos** (Área): AC5, AC7, AC8, AC9, AC10; (Selo): AC9.

**Done when**:

- [ ] Um card por campanha com os textos de T30
- [ ] Botões só na `APROVADA`; "Ver página pública" com `href` = `urlPublica`; "Baixar selo" chama `baixarSelo` e dispara download com `selo-{slug}.svg`
- [ ] Lista vazia → "Você ainda não tem campanhas." + "Criar campanha"
- [ ] Sem "valor doado" nem "QR gerado · comprovante"
- [ ] Gate `web` passa

**Tests**: component
**Gate**: web
**Commit**: `feat(web): cards de campanha na área da empresa`

---

### T32: `services/empresasPublicas.ts`

**What**: `listarParceiros()`, `buscarEmpresaPublica(slug)` e `urlDoLogo(slug)` com os tipos do contrato.
**Where**: `web/src/services/empresasPublicas.ts`
**Depends on**: None
**Reuses**: `services/api.ts`
**Requirement**: VIT-07, VIT-09
**Autor**: 👤 humano (parte 2)
**Responsável**: Pessoa 4
**Onda**: 1 (qui 29/10 – sex 30/10)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Teste confere URL e mapeamento de 200; 404 vira `ApiError` 404
- [ ] Gate `web` passa

**Tests**: unit
**Gate**: web
**Commit**: `feat(web): serviço de empresas públicas`

---

### T33: Página `/empresa/[slug]`

**What**: Página pública com o card da empresa e um subtópico por campanha (`id` do elemento = slug da campanha); estado sem campanhas; 404; aviso da Fivo Lab; iniciais no lugar do logo.
**Where**: `web/src/app/empresa/[slug]/page.tsx`
**Depends on**: T32, T30
**Reuses**: layout de `app/parceiros/[id]/page.tsx`, `textoDoValor` (T30)
**Requirement**: VIT-07
**Autor**: 👤 humano (parte 2)
**Responsável**: Pessoa 4
**Onda**: 2 (sáb 31/10 – seg 02/11)

**Tools**: MCP: NONE · Skill: NONE

**ACs cobertos** (Página pública): AC6, AC8, AC9, AC10, AC11, AC12, AC13.

**Done when**:

- [ ] Card com logo, `nomeFantasia`, cidade/UF e link do `site`
- [ ] Subtópico com nome, descrição, beneficiada, valor e vigência; "Campanha ainda não iniciada" quando `NAO_INICIADA`
- [ ] Sem campanhas → "Nenhuma campanha publicada até o momento"
- [ ] `temLogo` falso ou erro de imagem → iniciais
- [ ] 404 → "Empresa não encontrada" com link para `/parceiros`
- [ ] Aviso literal da Fivo Lab presente
- [ ] Gate `web` passa

**Tests**: component
**Gate**: web
**Commit**: `feat(web): página pública da empresa`

---

### T34: Rota do QR `/empresa/[slug]/[slugCampanha]` e rotas públicas

**What**: Página que renderiza a mesma de T33 e rola até `#slugCampanha`; `isPublicRoute` aceita `/empresa/`; remove `app/parceiros/[id]`.
**Where**: `web/src/app/empresa/[slug]/[slugCampanha]/page.tsx`
**Depends on**: T33
**Reuses**: T33, `lib/routes.ts`
**Requirement**: VIT-07
**Autor**: 👤 humano (parte 2)
**Responsável**: Pessoa 4
**Onda**: 2 (sáb 31/10 – seg 02/11)

**Tools**: MCP: NONE · Skill: NONE

**ACs cobertos** (Página pública): AC7.

**Done when**:

- [ ] Abrir com slug de campanha existente chama `scrollIntoView` no subtópico certo
- [ ] Slug de campanha inexistente → página no topo, sem erro
- [ ] `isPublicRoute('/empresa/x/y')` verdadeiro
- [ ] `app/parceiros/[id]` removido e links que apontavam para ele trocados
- [ ] Gate `web` passa

**Tests**: component
**Gate**: web
**Commit**: `feat(web): rota pública do QR Code`

---

### T35: `services/campanhas.ts` — detalhe e edição

**What**: Acrescentar `detalharCampanha(id)` e `editarCampanha(id, dados)` (`PATCH`).
**Where**: `web/src/services/campanhas.ts`
**Depends on**: T29
**Reuses**: T29
**Requirement**: VIT-11
**Autor**: 👤 humano (parte 6)
**Responsável**: Pessoa 3
**Onda**: 2 (sáb 31/10 – seg 02/11)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Teste confere URL, método e corpo; 404 e 409 viram `ApiError`
- [ ] Gate `web` passa

**Tests**: unit
**Gate**: web
**Commit**: `feat(web): serviço de detalhe e edição de campanha`

---

### T36: Página `/campanhas/[id]`

**What**: Detalhe com os blocos por status (edição e "Enviar para análise" em `RASCUNHO`/`REJEITADA`; motivo da rejeição; somente leitura em `EM_ANALISE` e `APROVADA`); 404.
**Where**: `web/src/app/(app)/campanhas/[id]/page.tsx`
**Depends on**: T35, T30
**Reuses**: `textoDoValor`, `rotuloDoStatus` (T30), passos do wizard para os campos
**Requirement**: VIT-11
**Autor**: 👤 humano (parte 6)
**Responsável**: Pessoa 3
**Onda**: 3 (ter 03/11 – qua 04/11)

**Tools**: MCP: NONE · Skill: NONE

**ACs cobertos** (Detalhe): AC1–AC6.

**Done when**:

- [ ] Um teste por status com os elementos esperados e ausentes
- [ ] `REJEITADA` mostra "Motivo da rejeição" e o texto
- [ ] `EM_ANALISE` mostra "Campanha em análise pela Fivo Lab."
- [ ] "Enviar para análise" chama `POST /campanhas/{id}/submissao`
- [ ] 404 → "Campanha não encontrada" com link para `/campanhas`
- [ ] Gate `web` passa

**Tests**: component
**Gate**: web
**Commit**: `feat(web): detalhe e correção de campanha`

---

### T37: `services/campanhas.ts` — criar, capa e submeter

**What**: Acrescentar `criarCampanha(dados)`, `enviarCapa(id, arquivo)` e `submeterCampanha(id)`.
**Where**: `web/src/services/campanhas.ts`
**Depends on**: T29
**Reuses**: T29, `services/arquivos.ts` (upload multipart)
**Requirement**: VIT-10
**Autor**: 👤 humano (parte 4)
**Responsável**: Pessoa 6
**Onda**: 2 (sáb 31/10 – seg 02/11)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Teste confere URL, método e corpo de cada função; capa vai como `multipart/form-data` no campo `capa`
- [ ] Gate `web` passa

**Tests**: unit
**Gate**: web
**Commit**: `feat(web): serviço de criação e submissão de campanha`

---

### T38: Remover `/selos` e `/comprovantes`

**What**: Apagar as duas páginas, os itens de menu e os testes condicionais `selos.conditional.test.ts` e `comprovantes.conditional.test.ts`, que testam serviços fora do escopo (AD-023).
**Where**: `web/src/app/(app)/selos/page.tsx`
**Depends on**: T36
**Reuses**: —
**Requirement**: VIT-11
**Autor**: 👤 humano (parte 6)
**Responsável**: Pessoa 3
**Onda**: 3 (ter 03/11 – qua 04/11)

**Tools**: MCP: NONE · Skill: NONE

**ACs cobertos** (Detalhe): AC7.

**Done when**:

- [ ] Rotas e itens de menu removidos; `APP_ROUTES.private` sem `selos` e `comprovantes`
- [ ] Remoção dos dois testes condicionais registrada na mensagem de commit, com o motivo
- [ ] Teste de menu confere a ausência dos dois itens
- [ ] Gate `web` passa

**Tests**: component
**Gate**: web
**Commit**: `refactor(web): remove selos e comprovantes fora do escopo`

---

### T39: Vitrine `/parceiros` com a API

**What**: Trocar `mockPartners` por `listarParceiros()`; cards levam a `/empresa/{slug}`; estado vazio.
**Where**: `web/src/app/parceiros/page.tsx`
**Depends on**: T32
**Reuses**: T32, layout atual
**Requirement**: VIT-09
**Autor**: 👤 humano (parte 3)
**Responsável**: Pessoa 5
**Onda**: 2 (sáb 31/10 – seg 02/11)

**Tools**: MCP: NONE · Skill: NONE

**ACs cobertos** (Vitrine): AC3, AC4, AC5.

**Done when**:

- [ ] Um card por empresa com logo, nome e cidade/UF, `href` = `/empresa/{slug}`
- [ ] Lista vazia → "Nenhuma empresa parceira ainda." com link para `/cadastro`
- [ ] Gate `web` passa

**Tests**: component
**Gate**: web
**Commit**: `feat(web): vitrine de parceiros com dados reais`

---

### T40: `PartnerCompanies` da home com a API

**What**: Trocar o mock da seção de parceiros da home por `listarParceiros()`; apagar `lib/mockPartners.ts` quando nada mais o importar.
**Where**: `web/src/components/home/PartnerCompanies.tsx`
**Depends on**: T39
**Reuses**: T32
**Requirement**: VIT-09
**Autor**: 👤 humano (parte 3)
**Responsável**: Pessoa 5
**Onda**: 2 (sáb 31/10 – seg 02/11)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Seção mostra as empresas da API com link para `/empresa/{slug}`
- [ ] Teste estrutural: nenhum arquivo importa `mockPartners`
- [ ] Gate `web` passa

**Tests**: component
**Gate**: web
**Commit**: `feat(web): parceiros da home com dados reais`

---

### T41: Wizard de nova campanha ligado à API

**What**: `CampaignWizardNew` chama `criarCampanha`, `enviarCapa` e `submeterCampanha`; botões "Salvar rascunho" e "Enviar para análise"; erro via `mensagemDeErro` sem perder os campos; remover `StepModeloSelo` e o `CampaignWizard` antigo, ajustando os testes de integração que o usavam.
**Where**: `web/src/components/campaign-wizard/CampaignWizardNew.tsx`
**Depends on**: T37
**Reuses**: passos atuais, `SeletorBeneficiada`
**Requirement**: VIT-10
**Autor**: 👤 humano (parte 4)
**Responsável**: Pessoa 6
**Onda**: 3 (ter 03/11 – qua 04/11)

**Tools**: MCP: NONE · Skill: NONE

**ACs cobertos** (Nova campanha): AC1–AC6.

**Done when**:

- [ ] "Salvar rascunho" → `POST /campanhas` com os campos preenchidos e navegação para `/campanhas/{id}`
- [ ] Com capa → `PUT /campanhas/{id}/capa` depois da criação
- [ ] "Enviar para análise" → criação + submissão + "Campanha enviada para análise."
- [ ] Erro da API mostra o texto de `mensagemDeErro` e mantém os campos
- [ ] Nenhum passo de modelo de selo; `CampaignWizard.tsx` e `StepModeloSelo.tsx` removidos; testes `wizard-*` ajustados ao wizard único, sem perder casos
- [ ] Gate `web` passa

**Tests**: component
**Gate**: web
**Commit**: `feat(web): nova campanha ligada à API`

---

### T42: `services/admin.ts` — fila de campanhas

**What**: Acrescentar `listarFilaCampanhas()`, `aprovarCampanha(id)`, `rejeitarCampanha(id, motivo)`, `aprovarAlteracao(id)` e `rejeitarAlteracao(id, motivo)`.
**Where**: `web/src/services/admin.ts`
**Depends on**: None
**Reuses**: funções de fila de empresas do mesmo arquivo
**Requirement**: VIT-12
**Autor**: 👤 humano (parte 5)
**Responsável**: Pessoa 6
**Onda**: 1 (qui 29/10 – sex 30/10)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:

- [ ] Teste confere URL, método e corpo `{ motivo }` de cada função; 409 vira `ApiError`
- [ ] Gate `web` passa

**Tests**: unit
**Gate**: web
**Commit**: `feat(web): serviço da fila de campanhas do admin`

---

### T43: Página `/admin/campanhas`

**What**: Fila com rótulo Nova/Alteração, dados do item, aprovar e rejeitar (motivo ≥ 20 caracteres), 409 recarrega, estado vazio.
**Where**: `web/src/app/admin/campanhas/page.tsx`
**Depends on**: T42
**Reuses**: `components/admin` (fila de empresas)
**Requirement**: VIT-12
**Autor**: 👤 humano (parte 5)
**Responsável**: Pessoa 6
**Onda**: 1 (qui 29/10 – sex 30/10)

**Tools**: MCP: NONE · Skill: NONE

**ACs cobertos** (Fila): AC1–AC7.

**Done when**:

- [ ] Itens na ordem da API com "Nova"/"Alteração" e os campos do AC1
- [ ] Aprovar e rejeitar chamam a rota certa por tipo e retiram o item
- [ ] Motivo com 19 caracteres → confirmar desabilitado; com 20 → habilitado
- [ ] 409 mostra a mensagem e recarrega a fila
- [ ] Fila vazia → "Nenhuma campanha aguardando análise."
- [ ] Gate `web` passa

**Tests**: component
**Gate**: web
**Commit**: `feat(web): fila de campanhas do admin`

---

### T44: Item "Campanhas" no menu do admin

**What**: Acrescentar `APP_ROUTES.admin.campanhas` e o item "Campanhas" no menu do admin.
**Where**: `web/src/app/admin/layout.tsx`
**Depends on**: T43
**Reuses**: itens existentes do menu
**Requirement**: VIT-12
**Autor**: 👤 humano (parte 5)
**Responsável**: Pessoa 6
**Onda**: 2 (sáb 31/10 – seg 02/11)

**Tools**: MCP: NONE · Skill: NONE

**ACs cobertos** (Fila): AC8.

**Done when**:

- [ ] Item "Campanhas" leva a `/admin/campanhas`
- [ ] Gate `web` passa

**Tests**: component
**Gate**: web
**Commit**: `feat(web): menu do admin com campanhas`

---

## Phase Execution Map

```
Fases 1, 2, 3 (domínio, grupo) | gate de handoff | Fases 4, 5 (infra, agente)
Fases 6, 7, 8 (web, grupo): independentes das Fases 1 a 5

Fase 1: T1 T2 T3 T4
Fase 2: T5 T6 T7 T8 T9 T10 T11
Fase 3: T12 T13 T14 T15 T16 T17 T18
Fase 4: T19 T20 T21 T22
Fase 5: T23 T24 T25 T26 T27 T28
Fase 6: T29 T30 T31 T35 T36 T38
Fase 7: T32 T33 T34 T39 T40
Fase 8: T37 T41 T42 T43 T44
```

### Divisão sugerida do `web` entre 6 pessoas

| Parte | Tasks | Requisitos |
| ----- | ----- | ---------- |
| 1 — Área da empresa | T29, T30, T31 | VIT-03, VIT-05 |
| 2 — Página pública | T32, T33, T34 | VIT-07 |
| 3 — Vitrine | T39, T40 | VIT-09 |
| 4 — Nova campanha | T37, T41 | VIT-10 |
| 5 — Admin | T42, T43, T44 | VIT-12 |
| 6 — Detalhe e limpeza | T35, T36, T38 | VIT-11 |

Dependências entre partes: T35 e T37 acrescentam funções a `services/campanhas.ts` (criado na T29); T33 e T36 usam `textoDoValor` (T30). As demais partes começam sem esperar ninguém.
