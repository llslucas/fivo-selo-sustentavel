**Verdict**: PASS

# Vitrine e Selo — Validação do domínio, rodada 3 (gate de handoff AD-023)

**Veredito**: ✅ **PASS**. T50 e T51 cumprem a Done-when item a item. Os dois sobreviventes da rodada 2 (**N13**, **N16**) morreram, a amostra de regressão (5) morreu e os 5 mutantes novos perto do código tocado também morreram. O gate está verde: build, tsc e eslint saem com 0, e o unit dá **706/706** (+2). Os **18/18 ACs de domínio** batem com o valor da spec. Nenhuma linha de produção mudou desde a rodada 2. **A Fase 4 (T19–T28) está liberada.**

**Data**: 2026-11-08
**Spec**: `.specs/features/vitrine-e-selo/spec.md`
**Diff range**: domínio `96c313f..HEAD` (`445d677`). Correções da rodada: `3f79006..71100c5` (T50 `d97e25b`, T51 `71100c5`). Em `api/` mudaram 3 arquivos, com +40/−9: `buscar-empresa-publica.spec.ts` (+27), `slug.spec.ts` (+4) e `tasks.md` (só checkboxes). **Nenhuma linha de produção mudou.** O commit `445d677` (W, `web/tests/component/PaginaEmpresaPublica.test.tsx`) fica fora deste gate (ver `validation-web.md`).
**Verifier**: sub-agente independente (autor ≠ verificador), somente leitura sobre `src/`, `test/` e `web/`. Escreve só este arquivo.
**Rodada**: 3 de 3. Escopo: domínio T1–T18 + T45–T51 (VIT-01, VIT-02, VIT-04, VIT-06 e VIT-08, na parte de domínio). ACs só de HTTP, infra ou `web` ficam marcados "fora do escopo (Tn)". Sem UAT.

Caminhos abreviados: `SH/` = `src/domain/fivo/shared/`, `EM/` = `src/domain/fivo/empresas/`, `CA/` = `src/domain/fivo/campanhas/`, `D/` = `test/doubles/`.

---

## Histórico

| Rodada | Diff | Verdict | Resumo |
| ------ | ---- | ------- | ------ |
| 1 | `96c313f..ed49618` | ❌ FAIL | Gate: build/tsc/eslint 0, unit 689/689, e2e 507/546 (39 falhas dos stubs de T20/T21). 60 mutantes: 44 mortos, 14 sobreviventes (M2, M9, M14, M22, M36–M41, M46, M47, M52, M53), 2 equivalentes (M21, M50). 13/18 ACs. Abriu T45–T49 |
| 2 | `96c313f..d937a94` (correções `6f9793d..d386fb8`) | ❌ FAIL | Gate: build/tsc/eslint 0, unit 704/704, e2e 507/546 (as mesmas 39). Os 14 sobreviventes morreram. 16 novos: 12 mortos, 2 sobreviventes (N13, N16), 2 equivalentes (N3, N15). 16/18 ACs. Abriu T50–T51 |
| 3 | `96c313f..445d677` (correções `3f79006..71100c5`) | ✅ PASS | Este relatório. Gate: build/tsc/eslint 0, unit **706/706**. Sensor: 12 injetados (N13 e N16, 5 de regressão, 5 novos), **12 mortos**, 0 vivos. **18/18 ACs** |

---

## Correções da rodada 2 (T50–T51): Done-when item a item

### T50 — Beneficiada `CAUSA` na página pública da empresa (`d97e25b`) ✅

| Done-when | Evidência | ✔ |
| --------- | --------- | - |
| Caso com beneficiada `CAUSA`, com `toEqual` exato de `{ tipo: 'CAUSA', nome }` | `CA/use-cases/buscar-empresa-publica.spec.ts:269-293`: a causa é criada com `CausaFactory.create({ nome: 'Água para Todos' })` (`:270`) e a campanha `APROVADA` com `Beneficiada.criar({ causaId })`. A asserção é `expect(res.value.campanhas[0].beneficiada).toEqual({ tipo: 'CAUSA', nome: 'Água para Todos' })` (`:289-292`) | ✅ |
| Mutante N16 (`tipo: 'INSTITUICAO'` fixo em `buscar-empresa-publica.ts:96`) morre | Morto por `:269` (sensor abaixo) | ✅ |
| Gate `quick` passa | unit 706/706 | ✅ |

### T51 — Faixa completa de dígitos no slug (`71100c5`) ✅

| Done-when | Evidência | ✔ |
| --------- | --------- | - |
| `toBe` exato com `0` e `9` no texto | `SH/entities/slug.spec.ts:18-20`: `expect(Slug.de('Loja 0 a 9', 'empresa').valor).toBe('loja-0-a-9')` | ✅ |
| Mutante N13 (`[^a-z0-8]` em `slug.ts:13`) morre | Morto por `:18`. O limite inferior (`[^a-z1-9]`, R2) também morre: L-009 vale nos dois lados | ✅ |
| Gate `quick` passa | ✅ | ✅ |

**Integridade das correções**: o diff `3f79006..71100c5` toca só `*.spec.ts` (+31/−0, nenhuma linha removida) e `tasks.md` (6 checkboxes `[ ]`→`[x]` de T50/T51, marcados pelo agente no handoff, conforme AD-020/AD-023). Em `3f79006..HEAD`, os únicos arquivos fora de `api/` são do `web` (`445d677`). **Nada de produção mudou em `api/src` nem em `api/test/doubles`.**

---

## Gate Check

Rodei os comandos na árvore real (`445d677`).

| Etapa | Exit | Resultado |
| ----- | ---- | --------- |
| `npm run build` | 0 | ok |
| `npx tsc -p tsconfig.json --noEmit` | 0 | ok |
| `npx eslint "{src,test}/**/*.ts"` | 0 | nenhum erro ou aviso; inclui as regras de fatia (AD-022) |
| `npx jest` (unit) | 0 | 73 suites, **706/706**, 0 skip |

- **e2e**: não rodei nesta rodada. Nenhuma linha de produção mudou desde a rodada 2, que mediu 507/546 com as 39 falhas atribuídas aos stubs "não implementado" de T20/T21. Essa causa é estrutural, já foi aceita e não bloqueia este gate. A volta a 546/546 já está na Done-when de T20 (`tasks.md:739`) e de T21 (`tasks.md:765`).
- **Contagem de testes**: unit 602 (`96c313f`) → 689 (rodada 1) → 704 (rodada 2) → **706** (+2: T50 e T51).
- **Integridade** (`git diff 96c313f..HEAD -- '*.spec.ts'`): 14 arquivos, +1847/−5. As 5 remoções são as mesmas das rodadas 1 e 2 (imports reescritos e a assinatura de `criarEmpresaPendente(props)`). Na rodada 3 nada foi removido. **Nenhum teste foi apagado, nenhum `it(` foi removido e nenhuma asserção foi enfraquecida.**

---

## Task Completion

| Task | Status | Nota |
| ---- | ------ | ---- |
| T1 | ✅ | A faixa `0-9` está fechada pela T51 (N13 e R2 mortos) |
| T2–T16, T18 | ✅ | Sem mudança desde a rodada 2 (a evidência está nas rodadas anteriores; as linhas não mudaram) |
| T17 | ✅ | O ramo `CAUSA` está fechado pela T50 (N16 e R5 mortos) |
| T45–T49 | ✅ | Ver rodada 2 |
| T50, T51 | ✅ | Ver acima |

---

## Spec-Anchored Acceptance Criteria (tabela final)

Legenda: ✅ evidência no valor da spec; ⚠️ SPn = spec-precision gap (não bloqueia); **fora do escopo (Tn)** = AC só de HTTP, infra ou `web`.

### P1: Slug permanente (VIT-01)

| AC | Spec-defined outcome | `file:line` + asserção | Result |
| -- | -------------------- | ---------------------- | ------ |
| AC1 | slug de `nomeFantasia` | `EM/use-cases/aprovar-empresa.spec.ts:227` `toBe('cafe-serra-verde')` | ✅ |
| AC2 | slug de `nome` | `CA/use-cases/aprovar-campanha.spec.ts:247` `toBe('verao-solidario')` | ✅ |
| AC3 | minúsculas, sem acento, o que estiver fora de `a-z0-9` vira hífen, pontas sem hífen, corte em 60 sem hífen final | `SH/entities/slug.spec.ts:4-50` (`toBe` exato). Dígitos: `:15` `toBe('cafe-2000-ltda')` e `:19` `toBe('loja-0-a-9')` (M2, N13, R2 mortos). Colapso: R4 morto | ✅ |
| AC4 | `empresa` / `campanha` | VO em `slug.spec.ts`; caso de uso em `aprovar-empresa.spec.ts:274-279` e `aprovar-campanha.spec.ts:258` (M14, M22 mortos) | ✅ |
| AC5 | menor sufixo livre (`-2`, `-3`…) | `slug.spec.ts` (`-2`, `-3`, `-4`); `aprovar-empresa.spec.ts:242-246`, `:261`; `D/in-memory-empresa-repository.spec.ts:51` (M9, M52, N10, N11 mortos) | ✅ |
| AC6 | sufixo por empresa | `aprovar-campanha.spec.ts`; `D/in-memory-campanha-repository.spec.ts:100-110` (N12 morto) | ✅ |
| AC7 | imutável | igual às rodadas anteriores, mais `D/in-memory-empresa-repository.spec.ts:90-109` (N1 morto) | ✅ |

### P1: Campanhas na área da empresa (VIT-02)

| AC | Result |
| -- | ------ |
| AC1: só as dela, por `createdAt` desc | ✅ `CA/use-cases/listar-campanhas-da-empresa.spec.ts:92`, `:114-118`; `D/in-memory-campanha-repository.spec.ts:58-61` |
| AC2: campos | ✅ `:68-79` (`toEqual` exato; `urlPublica` é da T24) |
| AC3, AC4 | fora do escopo (T24) |
| AC5–AC10 | fora do escopo (`web`) |

### P1: Selo genérico (VIT-04)

| AC | Result |
| -- | ------ |
| AC5: bytes idênticos (domínio) | ✅ `CA/use-cases/gerar-selo.spec.ts:67-75` |
| AC6: não aprovada → "Campanha não está aprovada" | ✅ `:96-117` |
| AC7: inexistente ou de outra empresa → "Campanha não encontrada" | ✅ (domínio) `:119-137` |
| AC1–AC4, AC8 | fora do escopo (T23, T25) |
| AC9 | fora do escopo (`web`) |

### P1: Página pública da empresa (VIT-06)

| AC | Spec-defined outcome | `file:line` + asserção | Result |
| -- | -------------------- | ---------------------- | ------ |
| AC1 | `nomeFantasia`, `cidade`, `uf`, `site`, `temLogo`, `campanhas` | `CA/use-cases/buscar-empresa-publica.spec.ts:247-266`: `toEqual` do objeto inteiro; `temLogo` `false` em `:300` (M38, M39, N5, N6 mortos) | ✅ |
| AC2 | só `APROVADA`, por aprovação desc; cada uma com `slug`, `nome`, `descricao`, `beneficiada` (`tipo` e `nome`), `regraDoacao`, `vigencia`, `situacao` | Valores com `INSTITUICAO`: `:247-266`. **Com `CAUSA`: `:289-292` `toEqual({ tipo: 'CAUSA', nome: 'Água para Todos' })`** (N16, R1, R3, R5, M35 mortos). Situação: `it.each` com relógio fixado. Filtro: M41, N14 mortos. Ordem: M43 morto | ✅ |
| AC3 | 404 "Empresa não encontrada" | `toEqual(new ResourceNotFoundError('Empresa não encontrada'))` para empresa inexistente, `PENDENTE_APROVACAO`, `REJEITADA` e `SUSPENSA` (M44 morto) | ✅ (domínio) |
| AC4 | nada além do contrato | chaves exatas e `:247` `toEqual` exato | ✅ |
| AC5 | logo | — | fora do escopo (T28) |
| AC6–AC13 | telas | — | fora do escopo (`web`) |

### P1: Vitrine de parceiros (VIT-08)

| AC | Result |
| -- | ------ |
| AC1: só `APROVADA`, com os campos | ✅ `EM/use-cases/listar-parceiros.spec.ts:49`, `:129-144` |
| AC2: ordem alfabética, sem distinguir caixa nem acento | ✅ `:77-81` / ⚠️ SP1 |
| AC3–AC5 | fora do escopo (`web`) |

**Status**: ✅ **18/18** ACs com regra de domínio batem com o valor da spec. Ficam abertos 1 spec-precision gap (SP1) e 0 lacunas.

### Spec-precision gaps

- **SP1 — desempate da vitrine** (Vitrine AC2): continua aberto. A spec não diz como desempatar nomes que comparam iguais com `sensitivity: 'base'`, e por isso M50 é equivalente. Não bloqueia.
- **SP2 — `descricao` nula**: fechado na rodada 2. A invariante de submissão garante a `descricao` (N15 equivalente).

---

## Edge Cases

- [x] Aprovações simultâneas com o mesmo nome: `D/in-memory-empresa-repository.spec.ts:113-137` (N2 morto).
- [x] Empresa suspensa: 404 na página pública, fora da vitrine, slug preservado na regravação.
- [x] Alteração pendente → aparece o compromisso aprovado (`buscar-empresa-publica.spec.ts:175-193`).
- [x] Beneficiada causa na página da empresa: `buscar-empresa-publica.spec.ts:269-293`.
- [ ] HTML/script como texto e logo quebrado: `web` (fora do escopo).

---

## Discrimination Sensor

**Profundidade**: P0 (integridade de dados). Rodei em um `git worktree add --detach <scratchpad>/wt-r3-dom HEAD` (`445d677`), com `api/node_modules` como link simbólico para o da árvore real. A baseline no worktree deu 706/706. Apliquei cada mutante por script (`<scratchpad>/sensor_r3.py`, que reaproveita as definições exatas de `sensor.py` e `sensor_r2.py`), com substituição exata e exigência de **uma única ocorrência**. Cada um rodou contra a suíte unit inteira (`npx jest --silent --json`) e foi revertido com `git checkout --`, com conferência byte a byte (12/12 restaurados). **Nenhuma morte veio de erro de execução ou de compilação** (`runtime=[]` nos 12). No fim apaguei o link, rodei `git worktree remove --force` e `git worktree prune`. Não usei `git stash`. Os resultados estão em `<scratchpad>/sensor-r3/`.

**Isolamento**: o `git status --porcelain` da árvore real estava vazio antes do sensor e continuou vazio depois (diff dos dois arquivos: idêntico). O `api/node_modules` real ficou intacto. Não toquei no `wt-r3-web`, que é do verificador do `web`.

### Sobreviventes da rodada 2

| # | Alvo | File:line | Resultado | Morto por |
| - | ---- | --------- | --------- | --------- |
| N13 | Slug AC3, limite superior da faixa | `SH/entities/slug.ts:13` `[^a-z0-8]+` | ✅ morto | `slug.spec.ts:18` |
| N16 | Página AC2 `tipo` | `CA/use-cases/buscar-empresa-publica.ts:96` `tipo: 'INSTITUICAO'` | ✅ morto | `buscar-empresa-publica.spec.ts:269` |

### Regressão (amostra de mortos das rodadas 1 e 2)

| # | Alvo | Resultado | Morto por |
| - | ---- | --------- | --------- |
| M2 | Slug AC3, dígitos removidos da classe | ✅ morto (2) | `slug.spec.ts:14`, `:18` |
| M35 | `resolverNomeBeneficiada` com o ramo invertido | ✅ morto (6) | `buscar-empresa-publica.spec.ts:210`, `:269`, `buscar-campanha-publica.spec.ts` |
| M43 | Página AC2, ordem invertida | ✅ morto | `buscar-empresa-publica.spec.ts` "orders campaigns by approval date" |
| M44 | Página AC3, sem checar o status da empresa | ✅ morto (3) | `PENDENTE_APROVACAO`, `REJEITADA`, `SUSPENSA` |
| N14 | Página AC2, filtro unilateral | ✅ morto | `buscar-empresa-publica.spec.ts:124` |

### Mutantes novos (perto do código tocado)

| # | Alvo | File:line | Mutação | Resultado |
| - | ---- | --------- | ------- | --------- |
| R1 | nome da causa | `CA/use-cases/campanha-publica.ts:20-21` | o ramo de causa busca e devolve o `nomeFantasia` da **instituição** | ✅ morto (3: `campanha-publica.spec`, `buscar-empresa-publica.spec:269`, `buscar-campanha-publica.spec`) |
| R2 | Slug AC3, limite inferior da faixa | `SH/entities/slug.ts:13` | `[^a-z0-9]+` → `[^a-z1-9]+` | ✅ morto (2: `slug.spec:14`, `:18`) |
| R3 | nome da causa | `CA/use-cases/campanha-publica.ts:21` | `causa?.nome` → `causa?.id.toString()` | ✅ morto (3) |
| R4 | Slug AC3, colapso de hífens | `SH/entities/slug.ts:13` | `[^a-z0-9]+` → `[^a-z0-9]` (sem `+`) | ✅ morto (2) |
| R5 | Página AC2, repositório da causa | `CA/use-cases/buscar-empresa-publica.ts:97-101` | passa `instituicaoRepository` no lugar de `causaRepository` | ✅ morto (`buscar-empresa-publica.spec:269`, que é o único a pegá-lo) |

**Result**: 12 injetados, **12 mortos**, 0 sobreviventes. Sensor ✅ PASS.

### Sensor acumulado (rodadas 1 a 3)

| | Quantidade |
| - | ---------- |
| Mutantes distintos | **81** (60 na rodada 1, 16 na rodada 2 e 5 na rodada 3; as reexecuções não contam de novo) |
| Mortos | **77** |
| Equivalentes | **4**: M21 (guarda `!empresa.slug` inalcançável), M50 (SP1), N3 (gancho de teste), N15 (SP2) |
| Vivos | **0** |

---

## Code Quality (diff de correção)

| Principle | Status |
| --------- | ------ |
| Minimum code / surgical | ✅ Só 2 testes e checkboxes; nenhuma linha de produção |
| Matches patterns | ✅ O caso de causa segue o molde do teste vizinho (`CampanhaFactory.aprovada`, `Slug.reconstruir`, helpers `regra`/`vigencia`, `Beneficiada.criar` com `isLeft` guard); o teste de slug segue o `toBe` exato dos vizinhos |
| Spec-anchored outcome | ✅ `{ tipo: 'CAUSA', nome }` exato; `'loja-0-a-9'` exato |
| Per-layer Coverage Expectation | ✅ VO com todas as ramificações (faixa nos dois limites); caso de uso com os dois ramos de beneficiada |
| Every test maps to a requirement | ✅ Os 2 testes novos mapeiam para a Done-when de T50/T51 (Página AC2, Slug AC3) |
| Documented guidelines | `tasks.md` §Test Coverage Matrix; L-009 (limite dos dois lados): ✅ na faixa de dígitos (N13 e R2 mortos) |

---

## Follow-ups não bloqueantes (ainda válidos)

1. ~~**e2e quebrado até a T21.**~~ **Aplicado**: a Done-when de T20 (`tasks.md:739`) e a de T21 (`tasks.md:765`) já têm "e2e de volta a 546/546". Até a T21 fechar, a `homologacao` continua respondendo 500 nas aprovações.
2. **Mensagem literal do 404 (destino: T25, T27).** `DomainExceptionFilter` responde "Recurso não encontrado" para todo `ResourceNotFoundError` (`src/infra/http/domain-exception.filter.ts:65-71`). A spec exige "Campanha não encontrada" e "Empresa não encontrada", e o e2e precisa conferir o texto literal (L-001).
3. **Campanha `APROVADA` sem slug no selo (destino: T25 ou design).** `CA/use-cases/gerar-selo.ts:47-49` responde 409 "Campanha não está aprovada" quando falta o slug.
4. **Higiene de testes (destino: qualquer PR do grupo).** O comentário velho "O double ainda não copia o slug (T8)" e o `spyOn(findById)` seguem em `EM/use-cases/editar-dados-empresa.spec.ts:70-72`. O momento do conflito forçado continua diferente nos dois doubles.
5. **Comentário sobre o `Either` ignorado (opcional).** `EM/use-cases/aprovar-empresa.ts:129`, `CA/use-cases/aprovar-campanha.ts:138`.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| VIT-01 | ❌ Needs Fix (T51) | ✅ domínio verificado; HTTP pendente (T20, T21, T22) |
| VIT-02 | ✅ Verificado no domínio | ✅ domínio verificado; HTTP pendente (T24) |
| VIT-04 | ✅ Verificado no domínio | ✅ domínio verificado; HTTP pendente (T23, T25) |
| VIT-06 | ❌ Needs Fix (T50) | ✅ domínio verificado; HTTP pendente (T27, T28) |
| VIT-08 | ✅ Verificado no domínio | ✅ domínio verificado; HTTP pendente (T26) |

(Status sugerido; o verificador não edita `spec.md`.)

---

## Summary

**Overall**: ✅ Ready (domínio). **A Fase 4 (T19–T28) está liberada.**

**Spec-anchored check**: 18/18 ACs de domínio batem com a spec; 1 spec-precision gap aberto (SP1, não bloqueia).
**Sensor**: rodada 3 com 12/12 mortos. Acumulado: 81 distintos, 77 mortos, 4 equivalentes e 0 vivos.
**Gate**: build/tsc/eslint 0; unit 706/706 (+2). O e2e não foi medido de novo, porque a produção não mudou; a meta de 546/546 já está na Done-when de T20/T21.

**O que funciona**: o contrato completo de slug (normalização, faixa `0-9` nos dois limites, fallback por entidade, menor sufixo livre por escopo e imutabilidade), a lista de campanhas da empresa, o selo no domínio, a página pública da empresa com os dois tipos de beneficiada e a vitrine. Também está pronto o contrato de slug dos doubles, que T20/T21 vão seguir.

**Próximo passo**: abrir a Fase 4 (T19–T28). Os follow-ups 2 e 3 entram nas tasks HTTP de destino.
