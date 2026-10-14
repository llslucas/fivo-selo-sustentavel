# Catálogo de Instituições — Validação do domínio, rodada 3 (gate de handoff AD-020)

**Veredito**: ✅ **PASS**. O gate `build` está todo verde (build, tsc, eslint, unit 332/332, e2e 205/205). A T49 fechou a única lacuna da rodada 2, P1-Causas AC6 ("403 sem alterar dado algum"): os testes de não-admin de `EditarCausa` e `InativarCausa` agora conferem a classe do erro, o dado persistido inalterado e a auditoria vazia. N28 e N29 foram mortos, e também os 4 mutantes novos nesses ramos. Os 3 mutantes da rodada 2 rodados de novo como amostra continuam mortos. A T50 limpou os resíduos de texto. Restam 3 spec-precision gaps sinalizados, que não bloqueiam. O handoff para a Fase 6 está liberado.

**Data**: 2026-10-13
**Spec**: `.specs/features/catalogo-instituicoes/spec.md`
**Diff range**: `7b0e9e7..074a914` (superfície de domínio: `src/domain`, `src/core`, `test/repositories`, `test/factories`, `test/arquivo`, `test/cryptography`, `test/http`). Correções da rodada 3: `cc587bb..074a914` (`7429146` T49, `074a914` T50).
**Verifier**: sub-agente independente (autor ≠ verificador), somente leitura sobre `src/` e `test/`. Este arquivo é o único que ele escreve.
**Rodada**: 3 de 3. Só P1 (INST-01…INST-10 → T1–T20, Fase 5b T35–T50). Sem UAT (backend).

> Nota de autoria: T49 e T50 foram aplicadas pelo agente. A T49 toca `src/domain/**`, caminho humano pela regra do AD-020. A extensão da autorização está registrada em `.specs/STATE.md:166` ("inclui as tasks abertas pela rodada 2 da verificação (T49, T50)"). O hardening anterior (T35–T48) segue a nota da rodada 2 (ver Histórico).

---

## Gate Check

- **Gate command**: `cd api && npm run build && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json`. Cada etapa rodou em separado, com saída redirecionada para arquivo no scratchpad, sem `tail`. Postgres de teste: `fivo-postgres-test`, migrado.

| Etapa | Exit | Resultado |
| ----- | ---- | --------- |
| `npm run build` | 0 | ok |
| `tsc --noEmit` | 0 | ok |
| `eslint` | 0 | nenhum erro, nenhum aviso |
| `jest` (unit) | 0 | 43 suites, **332/332**, 0 skip |
| `jest e2e` | 0 | 21 suites, **205/205**, 0 skip |

- **Contagem de testes**: unit 332 → 332, e2e 205 → 205. A T49 reforçou dois testes existentes, sem criar testes novos. Antes da feature (`7b0e9e7`): 174 unit.
- **Integridade (`git diff cc587bb..HEAD -- src test`)**: só dois arquivos mudaram, `editar-causa.spec.ts` e `inativar-causa.spec.ts`. As únicas linhas removidas são o guarda `if (response.isRight()) return;` e o título antigo do `it`. Sem esse guarda, o `toBeInstanceOf(NotAllowedError)` passa a ser incondicional, então o teste ficou mais forte. Nenhuma asserção foi removida ou afrouxada. Nenhum arquivo de teste foi apagado. Nada em `src/` fora dos specs mudou.

---

## Fechamento da rodada 2 (T49, T50)

| Task | Lacuna da rodada 2 | Evidência (`file:line` + asserção) | Status |
| ---- | ------------------ | ---------------------------------- | ------ |
| T49 | P1-Causas AC6 em `EditarCausa`: só a classe do erro | `src/domain/fivo/application/use-cases/editar-causa.spec.ts:79-102`. A causa nasce com `nome: 'Causa Original'` e `descricao: 'Descrição original'` (`:80-83`), e um usuário `EMPRESA` tenta mudar os dois campos (`:88-93`). Asserções: `:95` `response.isLeft()).toBe(true)`, `:96` `response.value).toBeInstanceOf(NotAllowedError)`, `:98-99` `findById(...)` → `nome).toBe('Causa Original')`, `:100` `descricao).toBe('Descrição original')`, `:101` `registroAuditoriaRepository.items).toHaveLength(0)` | ✅ fechada |
| T49 | P1-Causas AC6 em `InativarCausa`: só a classe do erro | `src/domain/fivo/application/use-cases/inativar-causa.spec.ts:33-50`. A causa nasce `ATIVA` (default de `Causa.create`, `entities/causa.ts:33`), e um usuário `EMPRESA` tenta inativá-la (`:37-42`). Asserções: `:44` `isLeft()).toBe(true)`, `:45` `toBeInstanceOf(NotAllowedError)`, `:47-48` `findById(...)` → `status).toBe(CausaStatus.ATIVA)`, `:49` `registroAuditoriaRepository.items).toHaveLength(0)` | ✅ fechada |
| T49 | Mutantes N28 e N29 | Mortos na rodada 3, junto com N30–N33 (ver Sensor) | ✅ fechada |
| T50 | `design.md:221` e What da T23 citavam "busca sem acento" no adaptador de instituição | `design.md:221` agora diz só "CAS em `salvarTransicao` (...), `save` que não regrava colunas de decisão". O What da T23 (`tasks.md:1320`) diz o mesmo. A busca do catálogo só aparece no caso de uso (`design.md:328,339`), e `nome_busca` só em causa (`design.md:340`, `tasks.md:1279-1280`) | ✅ fechada |
| T50 | Justificativa falsa da T37 | `tasks.md:883`: "É robustez, não correção: com nomes únicos, a comparação por nome dá o mesmo resultado (mutante N6 equivalente, rodada 2)" | ✅ fechada |
| T50 | `validate_tasks.py` | `validate_tasks: 0 error(s), 22 warning(s)`. Os avisos são de granularidade de `Where` e `Tests: none` em tasks de doc ou porta, e já existiam | ✅ fechada |

Por que o AC6 está fechado na conjunção toda: o "403" está no mapeamento `NotAllowedError` → 403 `Acesso negado` (`src/infra/http/domain-exception.filter.ts:56-60`, conferido por `test/http/domain-exception-filter.e2e-spec.ts:76`, `:83`). O "sem alterar dado algum" agora é conferido em todos os casos de uso de escrita de causa: criar (`criar-causa.spec.ts:74-75`), editar (`editar-causa.spec.ts:98-101`) e inativar (`inativar-causa.spec.ts:47-49`). O double devolve cópias em `findById` e `save` (`test/repositories/in-memory-causa-repository.ts:11-22,27-30,53-61`). Por isso a leitura depois da chamada reflete o que foi persistido, e não uma referência viva à entidade.

---

## Task Completion (T1–T20 depois do hardening)

| Task | Status | Notas |
| ---- | ------ | ----- |
| T1 Erros | ✅ | Mensagens batem com o design, incluindo `DocumentoIndisponivelError` (T45) |
| T2 `Causa` | ✅ | Todos os ramos com teste efetivo (T43) |
| T3 `DocumentoValidacao` | ✅ | Sem mudança desde a rodada 1 |
| T4 `Arquivo` | ✅ | Sem mudança desde a rodada 1 |
| T5 `Instituicao` | ✅ | Sem mudança desde a rodada 1 |
| T6 `CausaRepository` | ✅ | `findByNome` normalizado, `create(causa)` (T37, T38) |
| T7 `InstituicaoRepository` | ✅ | CAS exercitado (T42). `buscarDisponiveis` saiu pela emenda T46/T47 |
| T8 `VerificadorDeDocumento` | ✅ | Sem mudança |
| T9 `CriarCausa` | ✅ | Não-admin sem escrita, duplicata sem caixa e acento, auditoria com autor e data |
| T10 `EditarCausa` | ✅ | Ramo não-admin sem escrita (T49). Todos os ramos da Done-when cobertos |
| T11 `InativarCausa` | ✅ | Ramo não-admin sem escrita (T49) |
| T12 `ListarCausasAtivas` | ✅ | Sem mudança |
| T13 `CriarInstituicao` | ✅ | Sem mudança |
| T14 `ListarFilaInstituicoes` | ✅ | Nome da causa, `documentoArquivoId`, `boolean` (T39) |
| T15 `AprovarInstituicao` | ✅ | Auditoria completa, concorrência real, mensagem 503 |
| T16 `RejeitarInstituicao` | ✅ | Auditoria completa (inclui `motivo`) |
| T17 Suspender/Reativar | ✅ | Auditoria completa, não-admin sem escrita |
| T18 `InativarInstituicao` | ✅ | Idem |
| T19 `ListarBeneficiadas` | ✅ | Limite de 2 caracteres (T44) |
| T20 `AssegurarBeneficiadaDisponivel` | ✅ | Mensagem conferida; gate `build` verde |
| T35–T48 | ✅ | Fechadas na rodada 2 (ver Histórico) |
| T49, T50 | ✅ | Fechadas nesta rodada (tabela acima) |

---

## Spec-Anchored Acceptance Criteria

As linhas tocadas pela T49 foram re-derivadas. A T49 deslocou as linhas seguintes de `editar-causa.spec.ts` em +5 e as de `inativar-causa.spec.ts` em +1, e as citações abaixo já usam a numeração de `074a914`. Os demais specs não mudaram desde `17b383e`, então as linhas da rodada 2 continuam válidas.

### P1: Autocadastro da instituição

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 envio válido | `PENDENTE_APROVACAO` + id (201 é infra) | `criar-instituicao.spec.ts:99` `status).toBe(PENDENTE_APROVACAO)` | ✅ |
| AC2 CNPJ inválido | 422 `CNPJ inválido`, nada persistido | `criar-instituicao.spec.ts:188-191` | ✅ |
| AC3 CNPJ/e-mail duplicado | 409 `CNPJ ou e-mail já cadastrado` | `criar-instituicao.spec.ts:270-271`, `:291-292`; e2e do filtro `test/http/domain-exception-filter.e2e-spec.ts:65` → 409 | ✅ |
| AC4 senha < 10 | 422 + mensagem | `criar-instituicao.spec.ts:166-177` | ✅ |
| AC5 hash | nunca texto claro | `criar-instituicao.spec.ts:124-125` | ✅ |
| AC6 sem documento | 422 + mensagem | `criar-instituicao.spec.ts:194-207` | ✅ |
| AC7 PDF/JPG/PNG ≤ 10 MB, descrição ≤ 200 | limites aceitos | `arquivo.spec.ts:191,219`, `documento-validacao.spec.ts:62,68` | ✅ |
| AC8 viola formato/tamanho | 422 dizendo o limite | `arquivo.spec.ts:247` `toContain('10 mb')` | ✅ / ⚠️ spec-precision (texto indefinido) |
| AC9 causa inexistente/INATIVA | 422 `Causa inválida ou inativa` | `criar-instituicao.spec.ts:231-232`, `:251-252` | ✅ |
| AC10 logo | PNG/JPG/SVG ≤ 5 MB, raster ≥ 512², opcional | `arquivo.spec.ts:279,297,301`; `criar-instituicao.spec.ts:90` | ✅ |
| AC11 e-mail em análise | e-mail ao endereço cadastrado | `criar-instituicao.spec.ts:144-147` | ✅ |
| AC12 storage fora | 503 | infra (T24/T29) | fora do domínio |

### P1: Aprovação pelo administrador

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 fila | só PENDENTE, mais antiga primeiro; nome, CNPJ, **causa**, cidade, UF, data, documento | `listar-fila-instituicoes.spec.ts:104` (ordem), `:109-121` `toEqual({razaoSocial, cnpj, causa: 'Meio Ambiente', cidade, uf, email, documentoArquivoId, cnpjCoincideComEmpresa: false, createdAt})` | ✅ / ⚠️ spec-precision: "nome" não diz se é razão social ou nome fantasia (o item traz `razaoSocial`) |
| AC2 aprovar | `APROVADA`, autor, data-hora, catálogo, e-mail | `aprovar-instituicao.spec.ts:100-101`, `instituicao.spec.ts:18`, `listar-beneficiadas.spec.ts:55`, e-mail em `aprovar-instituicao.spec.ts:118-124` | ✅ |
| AC3 rejeitar | motivo ≥ 20, `REJEITADA`, persistido, e-mail | `rejeitar-instituicao.spec.ts:90-113`, `:116-127`, `:144`, `:164-171` `dados: { motivo }` | ✅ |
| AC4 ocultar não aprovadas | fora nos 4 estados | `listar-beneficiadas.spec.ts:81-93`, `assegurar-beneficiada-disponivel.spec.ts:92-113` | ✅ |
| AC5 6 transições; outra = 409 | `TransicaoInvalidaError` | `instituicao.spec.ts:96-163`; it.each nos 5 specs de decisão | ✅ |
| AC6 inativar sem excluir | registro mantido | `inativar-instituicao.spec.ts:59-76` | ✅ |
| AC7 acesso ao documento | 403 | infra (T25/T26) | fora do domínio |
| AC8 não-admin | 403 **e** sem alterar estado | aprovar `aprovar-instituicao.spec.ts:73-75`, rejeitar `rejeitar-instituicao.spec.ts:74-76`, suspender `suspender-instituicao.spec.ts:97-102`, reativar `reativar-instituicao.spec.ts:97-102`, inativar `inativar-instituicao.spec.ts:116-121` (status inalterado + auditoria vazia) | ✅ |
| AC9 auditoria | autor, anterior, novo, motivo, data-hora | `aprovar-instituicao.spec.ts:104-116`, `rejeitar-instituicao.spec.ts:148-162` (inclui `motivo`), suspender/reativar/inativar `:43-56` | ✅ |
| AC10 concorrência | só a primeira vale; a segunda leva 409 | `aprovar-instituicao.spec.ts:199-235` (double real, sem spy; `:219` `filter(isRight)).toHaveLength(1)`) | ✅ |
| Edge: documento ilegível | 503, estado inalterado | `aprovar-instituicao.spec.ts:154-176` `toMatchObject({status: 503, message})` | ✅ |

### P1: Manutenção de causas

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 criar | `ATIVA` | `criar-causa.spec.ts:42` | ✅ |
| AC2 nome existente | 409 `Causa já cadastrada`; igualdade sem caixa e acento (design) | `criar-causa.spec.ts:97-115`; `editar-causa.spec.ts:160-180` (`:173` `toMatchObject({status: 409, message: 'Causa já cadastrada'})`, `:179` nome inalterado); `:182-196` `Saude`→`Saúde` permitido | ✅ |
| AC3 inativar sem excluir | `INATIVA`, registro mantido | `inativar-causa.spec.ts:193-194` | ✅ |
| AC4 com aprovadas | 409 + lista | `inativar-causa.spec.ts:127-131` `erro.status).toBe(409)`, `instituicoes` exato; `:90-91` estado e auditoria intactos | ✅ / ⚠️ spec-precision (formato da lista) |
| AC5 causa INATIVA oculta | fora das listas e do autocadastro | `listar-causas-ativas.spec.ts:44`, `listar-beneficiadas.spec.ts:101`, `criar-instituicao.spec.ts:251-252` | ✅ |
| AC6 não-admin | 403 **e** sem alterar dado algum | criar: `criar-causa.spec.ts:73-75` (`items).toHaveLength(0)`). Editar: `editar-causa.spec.ts:96` `toBeInstanceOf(NotAllowedError)` + `:99-100` nome e descrição originais + `:101` auditoria vazia. Inativar: `inativar-causa.spec.ts:45` `toBeInstanceOf(NotAllowedError)` + `:48` `status).toBe(CausaStatus.ATIVA)` + `:49` auditoria vazia. 403 no filtro: `domain-exception-filter.e2e-spec.ts:76` | ✅ (fechado pela T49; N28–N33 mortos) |
| AC7 auditoria | autor e data-hora em criar, editar e inativar | `criar-causa.spec.ts:50-56`, `editar-causa.spec.ts:48-54` + `:73-76` (antes/depois) + `:150-157`, `inativar-causa.spec.ts:201-207` | ✅ |

### P1: Seleção da beneficiada

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 só APROVADA + ATIVA, ordem alfabética | lista mista ordenada | `listar-beneficiadas.spec.ts:55`, `:112-117` | ✅ |
| AC2 busca ≥ 2, parcial, sem acento/caixa | filtra a partir de 2 | `listar-beneficiadas.spec.ts:120-127` ("FUNDACAO"), `:130-136`, `:139-150` (1 caractere), `:152-159` (2 caracteres) | ✅ |
| AC3 exatamente uma referência | 422 para duas ou nenhuma | `assegurar-beneficiada-disponivel.spec.ts:48-70` | ✅ |
| AC4 indisponível | 422 `Instituição ou causa indisponível` | `assegurar-beneficiada-disponivel.spec.ts:109-112`, `:121-124`, `:134-137`, `:145-148` | ✅ |
| AC5 só campos públicos | nome, causa, cidade, UF, descrição, site, logo | `listar-beneficiadas.spec.ts:55` (objeto exato), `:170-180` | ✅ |
| AC6 catálogo vazio | domínio devolve `[]` | `listar-beneficiadas.spec.ts:46` | ✅ |

**Status**: ✅ Todos os ACs P1 de domínio cobertos, com a saída exata da spec. ⚠️ 3 spec-precision gaps continuam sinalizados e não bloqueiam: Autocadastro AC8 (texto do limite), Aprovação AC1 ("nome") e Causas AC4 (formato da lista). AC12 e AC7 de Aprovação são infra e ficam para a Fase 6.

---

## Edge Cases (recorte P1 do domínio)

- [x] Documento ilegível → 503 sem mudar estado: `aprovar-instituicao.spec.ts:154-176`.
- [x] Empresa e instituição com o mesmo CNPJ: aceito por construção; sinal `true`/`false` em `listar-fila-instituicoes.spec.ts:193-205` e `:109-121`.
- [x] Busca sem resultado → `[]`: `listar-beneficiadas.spec.ts:161-168`.
- [x] Suspensão ou inativação não tocam campanhas: por construção.
- [ ] CNPJ simultâneo → índice único: infra (T21/T23).
- [ ] Beneficiada suspensa durante a análise de campanha → feature `campanhas`.
- [ ] Escape de HTML → web. Dois admins editando instituição → P2.

---

## Discrimination Sensor

**Profundidade**: P0 (máquina de estados, CAS, auditoria, guardas de papel). A rodada 3 rodou num `git worktree add --detach <scratchpad>/wt-sensor3 HEAD` (`074a914`), com `node_modules` como link simbólico para o da árvore real. Cada mutante foi aplicado por script, testado e revertido com `git checkout --` dentro do worktree antes do próximo. Rodaram só os specs unit afetados (`npx jest <spec>`, ou `src/domain/fivo/application/use-cases` para o #3). Nenhuma morte veio de erro de compilação: todas citam a asserção que falhou. No fim, o link foi apagado e o worktree removido com `git worktree remove --force`, seguido de `git worktree prune`. **Isolamento**: o `git status --porcelain` da árvore real estava vazio antes e continuou vazio depois da remoção (`diff` idêntico). `git stash` não foi usado. O `node_modules` real ficou intacto. Nas linhas da rodada 3, a numeração é a de `074a914`. Nas rodadas anteriores, é a de `17b383e`, igual para os arquivos de `src/`, que não mudaram.

### Rodada 3 (`074a914`)

| # | File:line | Mutação | Killed? (asserção que matou) |
| - | --------- | ------- | ---------------------------- |
| N28 | `use-cases/editar-causa.ts:40` | No ramo não-admin: `findById`, `editar(nome, descricao)`, `save`, e só então `left(NotAllowedError)` (igual à rodada 2) | ✅ `editar-causa.spec.ts:99` (esperado `"Causa Original"`, recebido `"Novo Nome"`) |
| N29 | `use-cases/inativar-causa.ts:38` | No ramo não-admin: `findById`, `inativar()`, `save`, e só então `left(NotAllowedError)` (igual à rodada 2) | ✅ `inativar-causa.spec.ts:48` (esperado `ATIVA`, recebido `INATIVA`) |
| N30 | `use-cases/editar-causa.ts:40` | Ramo negado registra auditoria `CAUSA_EDITADA` sem tocar a causa | ✅ `editar-causa.spec.ts:101` (esperado 0, recebido 1) |
| N31 | `use-cases/editar-causa.ts:40` | Ramo negado salva a entidade com só a descrição mudada (nome mantido) | ✅ `editar-causa.spec.ts:100` (esperado `"Descrição original"`) |
| N32 | `use-cases/inativar-causa.ts:38` | Ramo negado registra auditoria `CAUSA_INATIVADA` sem tocar a causa | ✅ `inativar-causa.spec.ts:49` (esperado 0, recebido 1) |
| N33 | `use-cases/inativar-causa.ts:38` → depois de `:69-78` | Guarda de papel movida para depois de `save` + `registrar`: o não-admin grava tudo e depois recebe 403 | ✅ `inativar-causa.spec.ts:48` (esperado `ATIVA`, recebido `INATIVA`) |
| N8 (regressão) | `use-cases/editar-causa.ts:58` | `antes` capturado depois de `editar()` | ✅ `editar-causa.spec.ts:73` (`dados).toEqual({antes, depois})`) |
| N21 (regressão) | `use-cases/criar-causa.ts:37` | Ramo não-admin cria e grava a causa | ✅ `criar-causa.spec.ts:74` (esperado 0, recebido 1) |
| #3 (regressão) | `test/repositories/in-memory-instituicao-repository.ts:124` | CAS desligado no double (sem comparar `estadoEsperado`) | ✅ `aprovar-instituicao.spec.ts:219` (esperado 1 vencedor, recebido 2) |

**Result**: 9/9 mortos na rodada 3 (2 sobreviventes da rodada 2 + 4 novos + 3 de regressão). Acumulado nas 3 rodadas: 40 mutantes distintos, 39 mortos, 1 equivalente justificado (N6), **0 sobreviventes não equivalentes**. Sensor PASS.

### Rodadas 1 e 2 (`17b383e`)

| # | File:line | Mutação | Rodada 2 | Rodada 3 |
| - | --------- | ------- | -------- | -------- |
| #3 | `test/repositories/in-memory-instituicao-repository.ts:124` | CAS desligado no double | ✅ (T42) | ✅ re-rodado |
| #9 | `use-cases/listar-beneficiadas.ts:75` | `>= 2` → `> 2` | ✅ (T44) | — |
| #16 | `use-cases/aprovar-instituicao.ts:76` | autor da auditoria errado | ✅ (T40) | — |
| #18 | `entities/causa.ts:63` | `> 80` → `> 81` | ✅ (T43) | — |
| #19 | `entities/causa.ts:67` | só espaços aceito | ✅ (T43) | — |
| #20 | `entities/causa.ts:92` | `editar` aceita INATIVA | ✅ (T43) | — |
| #26 | `use-cases/criar-causa.ts:62` | autor da auditoria errado | ✅ (T40) | — |
| N1 | `test/repositories/in-memory-causa-repository.ts:35` | `findByNome` normaliza só a entrada | ✅ | — |
| N2 | `in-memory-causa-repository.ts:33` | normaliza só o armazenado | ✅ | — |
| N3 | `in-memory-causa-repository.ts:7` | sem `toLowerCase` | ✅ | — |
| N4 | `in-memory-causa-repository.ts:7` | sem remover diacríticos | ✅ | — |
| N5 | `use-cases/editar-causa.ts:53` | comparação por id invertida | ✅ | — |
| N6 | `use-cases/editar-causa.ts:53` | volta a comparar por nome | ⚪ equivalente (ver abaixo) | — |
| N7 | `use-cases/editar-causa.ts:53` | colisão ignorada | ✅ | — |
| N8 | `use-cases/editar-causa.ts:58` | `antes` capturado depois de `editar()` | ✅ | ✅ re-rodado |
| N9 | `use-cases/editar-causa.ts:78` | `depois` grava o estado anterior | ✅ | — |
| N10 | `use-cases/editar-causa.ts:74` | autor da auditoria errado | ✅ | — |
| N11 | `use-cases/listar-fila-instituicoes.ts:72` | fila devolve id da causa | ✅ | — |
| N12 | `listar-fila-instituicoes.ts:77` | `cnpjCoincideComEmpresa` sempre `false` | ✅ | — |
| N13 | `listar-fila-instituicoes.ts:77` | `cnpjCoincideComEmpresa` sempre `true` | ✅ | — |
| N14 | `listar-fila-instituicoes.ts:76` | `documentoArquivoId` errado | ✅ | — |
| N15 | `errors/documento-indisponivel.error.ts:7` | mensagem trocada | ✅ | — |
| N16 | `errors/beneficiada-indisponivel.error.ts:10` | mensagem trocada | ✅ | — |
| N17 | `use-cases/inativar-causa.ts:59` | `instituicoes` incompleto | ✅ | — |
| N18 | `use-cases/suspender-instituicao.ts:27` | não-admin grava auditoria | ✅ | — |
| N19 | `use-cases/reativar-instituicao.ts:27` | não-admin muda estado | ✅ | — |
| N20 | `use-cases/inativar-instituicao.ts:27` | não-admin muda estado | ✅ | — |
| N21 | `use-cases/criar-causa.ts:37` | não-admin grava causa | ✅ | ✅ re-rodado |
| N22 | `use-cases/rejeitar-instituicao.ts:67` | autor da auditoria errado | ✅ | — |
| N23 | `use-cases/suspender-instituicao.ts:58` | autor da auditoria errado | ✅ | — |
| N24 | `use-cases/reativar-instituicao.ts:58` | autor da auditoria errado | ✅ | — |
| N25 | `use-cases/inativar-instituicao.ts:58` | autor da auditoria errado | ✅ | — |
| N26 | `use-cases/inativar-causa.ts:74` | autor da auditoria errado | ✅ | — |
| N27 | `use-cases/aprovar-instituicao.ts:79` | `criadoEm` não é `Date` | ✅ | — |
| N28 | `use-cases/editar-causa.ts:40` | não-admin edita e salva a causa | ❌ sobreviveu → T49 | ✅ morto |
| N29 | `use-cases/inativar-causa.ts:38` | não-admin inativa e salva a causa | ❌ sobreviveu → T49 | ✅ morto |

**Por que N6 é equivalente.** As duas condições só divergem quando `findByNome` devolve uma causa X em dois casos. No caso (a), X é a própria causa (mesmo id) com nome diferente do lido por `findById` na mesma requisição. Sem escrita entre as duas leituras, isso não acontece. No caso (b), X é outra causa com nome idêntico ao da causa editada, o que viola a unicidade de nome (índice único em `nome_busca`, T21/T22). Sob esse invariante, nenhum teste unit distingue os dois códigos. A comparação por id continua preferível: no caso (a), sob concorrência real, a comparação por nome recusaria a edição da própria causa. A T50 alinhou a T37 a essa leitura (`tasks.md:883`).

---

## Code Quality (diff da rodada 3 `cc587bb..074a914`)

| Princípio | Status | Nota |
| --------- | ------ | ---- |
| Código mínimo / sem scope creep | ✅ | Só os dois testes nomeados na T49 e o texto nomeado na T50. Nada em código de produção |
| Mudanças cirúrgicas | ✅ | 25 linhas adicionadas e 19 removidas em 4 arquivos. Nenhum outro teste foi reformatado |
| Segue padrões existentes | ✅ | As asserções espelham as da T48 (`findById` + campo + `items).toHaveLength(0)`) |
| Spec-anchored outcome check | ✅ | AC6 confere classe do erro, dado persistido e auditoria. Os outros ACs seguem iguais à rodada 2 |
| Cobertura por camada (domínio 1:1, todos os ramos) | ✅ | O ramo não-admin dos três casos de uso de escrita de causa tem asserção de efeito |
| Todo teste mapeia para AC / edge / Done-when | ✅ | Os dois testes alterados mapeiam para P1-Causas AC6 (T49). Cosmético pré-existente: `describe('Casa Entity')` e `describe('EditarDadosCausaUseCase')` |
| Documentação coerente | ✅ | Resíduos da T47 e justificativa da T37 corrigidos (T50). Ressalva cosmética, sem task: a linha "Adaptadores Prisma" da matriz de cobertura (`tasks.md:44`) ainda lista "busca sem acento" sem dizer de qual adaptador. Lida como o `findByNome` de causa, está correta |
| Guidelines documentadas | ✅ | Nenhuma no projeto; strong defaults de `tasks.md` |
| Senior engineer aprovaria? | ✅ | Sim |

---

## Fix Plans

Nenhuma task nova. Os 3 spec-precision gaps (Autocadastro AC8, Aprovação AC1 "nome", Causas AC4 formato da lista) ficam como estão, sinalizados para o dono da spec decidir. Não bloqueiam o domínio e podem ser resolvidos quando a camada HTTP (Fase 6) fixar o contrato.

---

## Requirement Traceability Update

`spec.md` não foi editado (o Verifier só escreve este relatório). O status final proposto para a coluna de status da rastreabilidade (`spec.md:205-217`):

| Requirement | Status anterior (rodada 2) | Status proposto (domínio, rodada 3, final) |
| ----------- | -------------------------- | ------------------------------------------ |
| INST-01 | ✅ Domínio verificado (aguarda infra) | ✅ Domínio verificado · infra em Tasks (T21, T29, T34) |
| INST-02 | ✅ (aguarda infra) | ✅ Domínio verificado · infra em Tasks (T24, T29) |
| INST-03 | ✅ (aguarda infra) | ✅ Domínio verificado · infra em Tasks (T29) |
| INST-04 | ✅ Domínio verificado | ✅ Domínio verificado · infra em Tasks (T23, T30, T33, T34) |
| INST-05 | ✅ Domínio verificado | ✅ Domínio verificado · infra em Tasks (T21, T23, T30, T31, T33) |
| INST-06 | ✅ edge 503 / infra pendente | ✅ Domínio verificado (edge 503) · acesso ao documento em Tasks (T25, T26, T30) |
| INST-07 | ⚠️ Needs Fix Minor (T49) | ✅ Domínio verificado · infra em Tasks (T21, T22, T27, T28, T34) |
| INST-08 | ✅ Domínio verificado | ✅ Domínio verificado · infra em Tasks (T28, T32, T34) |
| INST-09 | ✅ | ✅ Domínio verificado · consumo na feature `campanhas` |
| INST-10 | ✅ | ✅ Domínio verificado · infra em Tasks (T32) |
| INST-11…13 | fora do escopo (P2) | Deferred (rodada P2) |

---

## Histórico

### Rodada 2 (2026-10-13, diff `7b0e9e7..17b383e`, hardening `891cdd5..17b383e`)

- **Veredito**: FAIL, com lacuna Minor e estreita. Gate: build 0 · tsc 0 · eslint 0 · unit 332/332 · e2e 205/205.
- **Sensor**: 36 mutantes, 33 mortos, 1 equivalente (N6). Sobreviventes: N28 (`editar-causa.ts:40`) e N29 (`inativar-causa.ts:38`), ambos escrevendo no ramo não-admin.
- **Lacuna de AC**: P1-Causas AC6 ("403 sem alterar dado algum"). Em editar e inativar causa, o teste de não-admin só conferia a classe `NotAllowedError`. → T49.
- **Cosméticos**: resíduo da T47 (`design.md:221`, What da T23 citando "busca sem acento" no adaptador de instituição) e justificativa falsa da T37. → T50.
- **Fechamento da rodada 1**: os 7 sobreviventes (#3, #9, #16, #18, #19, #20, #26) foram mortos. T35–T48 cumpriram a Done-when. Nenhum teste foi enfraquecido: os 12 `expect` antes condicionados a `if (isLeft())` ficaram incondicionais, e as três mudanças de valor (causa por nome, sinal de CNPJ `boolean`, filtro 422 → 409) seguiram a spec.

| Lacuna da rodada 1 | Task | Rodada 2 | Rodada 3 |
| ------------------ | ---- | -------- | -------- |
| eslint (newline final) | T35 | ✅ | ✅ |
| e2e `instituicao-ja-existe` 422 | T36 | ✅ | ✅ |
| Causas AC2 / double sem normalização | T37 | ✅ | ✅ (texto corrigido pela T50) |
| Porta `create(props)` | T38 | ✅ | ✅ |
| Aprovação AC1 (causa como id) | T39 | ✅ | ✅ |
| AC9 / Causas AC7 autor e data (#16, #26) | T40 | ✅ | ✅ |
| Snapshot "antes" da edição de causa | T41 | ✅ | ✅ (N8 re-rodado) |
| AC10 CAS real (#3) | T42 | ✅ | ✅ (#3 re-rodado) |
| `Causa` e `EditarCausa` sem teste efetivo (#18, #19, #20) | T43 | ✅ | ✅ |
| Seleção AC2 limite de 2 (#9) | T44 | ✅ | ✅ |
| Mensagem de `DocumentoIndisponivelError` | T45 | ✅ | ✅ |
| `buscarDisponiveis` sem chamador | T46 | ✅ | ✅ |
| Design e T21/T23 | T47 | ✅ (resíduo → T50) | ✅ |
| Mensagens e "sem escrita" | T48 | ✅ na Done-when; AC6 de causa incompleta → T49 | ✅ |
| Causas AC6 em editar e inativar (N28, N29) | T49 | — (aberta) | ✅ |
| Resíduos de texto T47/T37 | T50 | — (aberta) | ✅ |

### Rodada 1 (2026-10-13, diff `7b0e9e7..891cdd5`)

- **Veredito**: FAIL. Gate: build 0 · tsc 0 · eslint ❌ (5 erros de prettier) · unit 316/316 · e2e 204/205 ❌.
- **Sensor**: 21/28 mortos. Sobreviventes: #3, #9, #16, #18, #19, #20 e #26.
- **Lacunas de AC**: Aprovação AC1 (causa como id), AC9 (autor e data da auditoria), AC10 (CAS sem teste real); Causas AC2 (unicidade sem caixa e acento), AC7 (auditoria e snapshot "antes" corrompido); Seleção AC2 (limite de 2). Viraram a Fase 5b (T35–T48).

---

## Summary

**Overall**: ✅ Ready. O domínio P1 de `catalogo-instituicoes` passa o gate de handoff do AD-020, e a Fase 6 (infra) está liberada.

**Spec-anchored check**: 35 critérios P1 de domínio avaliados (ACs + edge do 503). Os 35 batem com a saída da spec. 3 spec-precision gaps continuam sinalizados e não bloqueiam (Autocadastro AC8, Aprovação AC1, Causas AC4).
**Sensor**: rodada 3 com 9/9 mortos. Acumulado: 40 mutantes, 39 mortos, 1 equivalente justificado (N6), 0 sobreviventes.
**Gate**: build 0 · tsc 0 · eslint 0 · unit 332/332 · e2e 205/205.

**O que funciona**: todos os casos de uso de escrita do catálogo (5 de instituição e 3 de causa) conferem, no ramo não-admin, a classe do erro, o estado persistido intacto e a auditoria vazia. A auditoria confere autor, entidade e data-hora em todas as 8 escritas. A concorrência é provada contra o CAS real do double. A unicidade de causa ignora caixa e acento. As mensagens definidas na spec são conferidas literalmente. Nenhum teste foi enfraquecido em nenhuma rodada.

**Próximos passos**: (1) o dono de `spec.md` atualiza a coluna de status com a tabela de rastreabilidade acima; (2) Fase 6 (T21–T34, infra e HTTP), quando os ACs de infra (Autocadastro AC12, Aprovação AC7, 201/403 reais) recebem evidência própria; (3) decidir os 3 spec-precision gaps quando o contrato HTTP for fixado.
