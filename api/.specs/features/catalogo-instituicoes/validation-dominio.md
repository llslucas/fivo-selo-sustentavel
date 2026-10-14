# Catálogo de Instituições — Validação do domínio, rodada 2 (gate de handoff AD-020)

**Veredito**: ❌ **FAIL** (lacuna Minor e estreita). O gate `build` está todo verde. Os 7 sobreviventes da rodada 1 foram mortos, e as T35–T48 cumprem a Done-when. Faltam dois pontos de P1-Causas AC6 ("403 sem alterar dado algum"): em `EditarCausa` e `InativarCausa`, o ramo não-admin só confere a classe do erro. Dois mutantes que gravam nesse ramo sobreviveram (N28, N29). A correção é a T49, só de teste. A Fase 6 continua bloqueada até a rodada 3 dar PASS.

**Data**: 2026-10-13
**Spec**: `.specs/features/catalogo-instituicoes/spec.md`
**Diff range**: `7b0e9e7..17b383e` (superfície de domínio: `src/domain`, `src/core`, `test/repositories`, `test/factories`, `test/arquivo`, `test/cryptography`, `test/http`). Hardening: `891cdd5..17b383e`.
**Verifier**: sub-agente independente (autor ≠ verificador), somente leitura sobre a árvore real. Este arquivo é o único que ele escreve.
**Rodada**: 2 de 3. Só P1 (INST-01…INST-10 → T1–T20 + Fase 5b T35–T48). Sem UAT (backend).

> Nota de autoria: o hardening (T35, T37–T46, T48) foi aplicado pelo agente, com autorização explícita do usuário registrada em `STATE.md` (AD-020, exceção de 2026-10-13). T36 e T47 são do agente por regra de caminho. T1–T20 seguem humanas, e a T5 foi exceção de 2026-09-30.

---

## Gate Check

- **Gate command**: `cd api && npm run build && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json`. Cada etapa rodou em separado, com saída redirecionada para arquivo e sem `tail`. Postgres de teste: `fivo-postgres-test`, porta 5433.

| Etapa | Exit | Resultado |
| ----- | ---- | --------- |
| `npm run build` | 0 | ok |
| `tsc --noEmit` | 0 | ok |
| `eslint` | 0 | nenhum erro (os 5 do prettier da rodada 1 sumiram) |
| `jest` (unit) | 0 | 43 suites, **332/332**, 0 skip |
| `jest e2e` | 0 | 21 suites, **205/205**, 0 skip |

- **Contagem de testes**: unit 316 → 332 (+16); e2e 205 → 205. Antes da feature (`7b0e9e7`): 174 unit.
- **Integridade**: nenhum arquivo de teste removido (`git diff --diff-filter=D` vazio). Os 12 `expect` removidos no hardening estavam dentro de `if (isLeft())` e voltaram incondicionais, quase sempre com `toMatchObject({ status, message })`. Três expectativas mudaram de valor, todas em direção à spec ou à Done-when: a fila passou de id para nome da causa, o sinal de CNPJ passou de `string | null` para `boolean` (T14) e o e2e do filtro passou de 422 para 409 (P1-Autocadastro AC3). Nenhuma asserção ficou mais fraca.
- **Asserções no vazio**: uma varredura dos specs da superfície procurou `if (x.isLeft()) { expect… }` sem `expect(x.isLeft()).toBe(true)` logo antes. Não encontrou nenhum caso.

---

## Fechamento da rodada 1 (T35–T48)

| Task | Lacuna da rodada 1 | Evidência (`file:line` + asserção) | Status |
| ---- | ------------------ | ---------------------------------- | ------ |
| T35 | eslint: 5 arquivos sem newline final | eslint exit 0 (gate acima) | ✅ fechada |
| T36 | e2e esperava 422 para `instituicao-ja-existe` | `test/http/domain-exception-filter.e2e-spec.ts:65` `'instituicao-ja-existe': 409`; e2e 205/205 | ✅ fechada |
| T37 | `findByNome` não normalizava; P1-Causas AC2 | `test/repositories/in-memory-causa-repository.ts:4-9,33-36` normaliza os dois lados; `criar-causa.spec.ts:97-115` it.each `educacao`/`Educação`/`EDUCAÇÃO` → `toMatchObject({status: 409, message: 'Causa já cadastrada'})` + `items).toHaveLength(1)`; `editar-causa.spec.ts:155-175` `SAÚDE` × `Saude` → idem + nome inalterado; `:177-191` `Saude`→`Saúde` permitido; JSDoc em `ports/database/causa-repository.ts:5`. Mutantes N1–N4 mortos | ✅ fechada |
| T37 (extra) | `EditarCausa` compara por id | `use-cases/editar-causa.ts:53` `!causaExistente.id.equals(causa.id)`. Está correto para AC2 e T10: colisão só com **outra** causa, e manter o próprio nome é permitido. Ressalva: a justificativa escrita na T37 (`tasks.md:882`) diz que a comparação por nome recusaria a própria causa. Isso é falso, porque `findByNome` devolve a própria causa, com nome igual. O mutante N6 (volta ao nome) sobrevive e é **equivalente** (ver Sensor). A troca vale como robustez, não como correção de bug | ✅ correta (doc imprecisa → T50) |
| T38 | `create(props: CausaProps)` | `ports/database/causa-repository.ts:8` `create(causa: Causa): Promise<void>`; tsc 0 | ✅ fechada |
| T39 | fila trazia id da causa; P1-Aprovação AC1 | `use-cases/listar-fila-instituicoes.ts:72` `causa?.nome`; `listar-fila-instituicoes.spec.ts:109-121` `toEqual({… causa: 'Meio Ambiente', documentoArquivoId, cnpjCoincideComEmpresa: false …})`; `:193-205` `cnpjCoincideComEmpresa: true`. Mutantes N11–N14 mortos | ✅ fechada |
| T40 | autor e data-hora da auditoria; AC9 / Causas AC7 | `usuarioId` + `entidadeId` + `criadoEm instanceof Date` em `aprovar-instituicao.spec.ts:104-110`, `rejeitar-instituicao.spec.ts:148-155`, `suspender-instituicao.spec.ts:43-50`, `reativar-instituicao.spec.ts:43-50`, `inativar-instituicao.spec.ts:43-50`, `criar-causa.spec.ts:50-56`, `editar-causa.spec.ts:48-54,145-152`, `inativar-causa.spec.ts:200-206`. Mutantes #16, #26, N10, N22–N27 mortos | ✅ fechada |
| T41 | "antes" da edição de causa corrompido | `use-cases/editar-causa.ts:58` snapshot simples antes de `editar()`; `editar-causa.spec.ts:72-76` `dados).toEqual({antes: {nome: 'Causa Teste', …}, depois: {nome: 'Novo Nome', …}})`. Mutantes N8 e N9 mortos | ✅ fechada |
| T42 | CAS do double nunca exercitado; AC10 | `aprovar-instituicao.spec.ts:199-235` `Promise.all` aprovar × rejeitar, sem spy: `filter(isRight)).toHaveLength(1)`, perdedora `toBeInstanceOf(TransicaoInvalidaError)`, estado final = vencedor, 1 linha de auditoria. Mutante #3 morto | ✅ fechada |
| T43 | `Causa` e `EditarCausa` sem teste efetivo | `entities/causa.spec.ts:46-47` (81 chars, incondicional), `:50-58` (só espaços), editar feliz / nome inválido ×3 / INATIVA; `editar-causa.spec.ts:193-203` (inexistente → `ResourceNotFoundError`), `:205-224` (INATIVA → `TransicaoInvalidaError`, dados e auditoria intactos). Mutantes #18, #19 e #20 mortos | ✅ fechada |
| T44 | limite de 2 caracteres; Seleção AC2 | `listar-beneficiadas.spec.ts:152-159` `'es'` → `['Escola Viva']`; `:139-150` 1 caractere → lista completa. Mutante #9 morto | ✅ fechada |
| T45 | mensagem de `DocumentoIndisponivelError` | `errors/documento-indisponivel.error.ts:7` = design §Erros; `aprovar-instituicao.spec.ts:165-168` `toMatchObject({status: 503, message: 'Documento temporariamente indisponível'})`. Mutante N15 morto | ✅ fechada |
| T46 | `buscarDisponiveis` sem chamador | sem ocorrência em `src/` e `test/` (`grep` vazio); porta `instituicao-repository.ts` sem o método | ✅ fechada |
| T47 | design pedia coluna/método sem uso | `design.md:339-340` (emenda; `nome_busca` só em causa), T21 `tasks.md:1220`; `validate_tasks.py` 0 erros. **Resíduo**: `design.md:221` e `tasks.md:1262` (What da T23) ainda citam "busca sem acento" no adaptador de instituição | ⚠️ fechada na Done-when, resíduo de texto → T50 |
| T48 | mensagens e "sem escrita" | `assegurar-beneficiada-disponivel.spec.ts:109-112,121-124,134-137,145-148` mensagem + 422; `inativar-causa.spec.ts:126-131` 409 + `instituicoes` exato; não-admin sem escrita em `suspender…spec.ts:97-102`, `reativar…spec.ts:97-102`, `inativar-instituicao.spec.ts:116-121`, `criar-causa.spec.ts:74-75`. Mutantes N16–N21 mortos. **Escopo da task incompleto**: P1-Causas AC6 também vale para editar e inativar causa, que ficaram fora da lista (mutantes N28 e N29 sobrevivem) | ⚠️ Done-when cumprida, AC6 incompleta → T49 |

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
| T7 `InstituicaoRepository` | ✅ | CAS exercitado (T42), `buscarDisponiveis` removido pela emenda T46/T47 |
| T8 `VerificadorDeDocumento` | ✅ | Sem mudança |
| T9 `CriarCausa` | ✅ | Não-admin sem escrita, duplicata sem caixa/acento, auditoria com autor e data |
| T10 `EditarCausa` | ⚠️ | Todos os ramos da Done-when cobertos. O ramo não-admin não confere "sem alterar dado" (P1-Causas AC6) → T49 |
| T11 `InativarCausa` | ⚠️ | Idem → T49 |
| T12 `ListarCausasAtivas` | ✅ | Sem mudança |
| T13 `CriarInstituicao` | ✅ | Sem mudança |
| T14 `ListarFilaInstituicoes` | ✅ | Nome da causa, `documentoArquivoId`, `boolean` (T39) |
| T15 `AprovarInstituicao` | ✅ | Auditoria completa, concorrência real, mensagem 503 |
| T16 `RejeitarInstituicao` | ✅ | Auditoria completa (inclui `motivo`) |
| T17 Suspender/Reativar | ✅ | Auditoria completa, não-admin sem escrita |
| T18 `InativarInstituicao` | ✅ | Idem |
| T19 `ListarBeneficiadas` | ✅ | Limite de 2 caracteres (T44) |
| T20 `AssegurarBeneficiadaDisponivel` | ✅ | Mensagem conferida; gate `build` verde |

---

## Spec-Anchored Acceptance Criteria

Linhas sem mudança no hardening foram conferidas por amostragem contra a árvore atual. Os specs `criar-instituicao`, `instituicao`, `documento-validacao`, `arquivo` e `listar-causas-ativas` não mudaram desde `891cdd5`, então as linhas citadas na rodada 1 continuam válidas. As linhas tocadas pelo hardening foram re-derivadas.

### P1: Autocadastro da instituição

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 envio válido | `PENDENTE_APROVACAO` + id (201 é infra) | `criar-instituicao.spec.ts:99` `status).toBe(PENDENTE_APROVACAO)` | ✅ |
| AC2 CNPJ inválido | 422 `CNPJ inválido`, nada persistido | `criar-instituicao.spec.ts:188-191` | ✅ |
| AC3 CNPJ/e-mail duplicado | 409 `CNPJ ou e-mail já cadastrado` | `criar-instituicao.spec.ts:270-271`, `:291-292`; e2e do filtro `:65` → 409 | ✅ |
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
| AC2 aprovar | `APROVADA`, autor, data-hora, catálogo, e-mail | `aprovar-instituicao.spec.ts:100-101`, `instituicao.spec.ts:18`, `listar-beneficiadas.spec.ts:55`, e-mail em `aprovar…spec.ts:118-124` | ✅ |
| AC3 rejeitar | motivo ≥ 20, `REJEITADA`, persistido, e-mail | `rejeitar-instituicao.spec.ts:90-113`, `:116-127`, `:144`, `:164-171` `dados: { motivo }` | ✅ |
| AC4 ocultar não aprovadas | fora nos 4 estados | `listar-beneficiadas.spec.ts:81-93`, `assegurar…spec.ts:92-113` | ✅ |
| AC5 6 transições; outra = 409 | `TransicaoInvalidaError` | `instituicao.spec.ts:96-163`; it.each nos 5 specs de decisão | ✅ |
| AC6 inativar sem excluir | registro mantido | `inativar-instituicao.spec.ts:59-76` | ✅ |
| AC7 acesso ao documento | 403 | infra (T25/T26) | fora do domínio |
| AC8 não-admin | 403 **e** sem alterar estado | aprovar `:73-75`, rejeitar `:74-76`, suspender `:97-102`, reativar `:97-102`, inativar `:116-121` (status inalterado + auditoria vazia) | ✅ |
| AC9 auditoria | autor, anterior, novo, motivo, data-hora | aprovar `:104-116`, rejeitar `:148-162` (inclui `motivo`), suspender/reativar/inativar `:43-56` | ✅ |
| AC10 concorrência | só a primeira vale; a segunda leva 409 | `aprovar-instituicao.spec.ts:199-235` (double real, sem spy) | ✅ |
| Edge: documento ilegível | 503, estado inalterado | `aprovar-instituicao.spec.ts:154-176` `toMatchObject({status: 503, message})` | ✅ |

### P1: Manutenção de causas

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 criar | `ATIVA` | `criar-causa.spec.ts:42` | ✅ |
| AC2 nome existente | 409 `Causa já cadastrada`; igualdade sem caixa/acento (design) | `criar-causa.spec.ts:97-115`, `editar-causa.spec.ts:155-175` | ✅ |
| AC3 inativar sem excluir | `INATIVA`, registro mantido | `inativar-causa.spec.ts:192-193` | ✅ |
| AC4 com aprovadas | 409 + lista | `inativar-causa.spec.ts:126-131` `status).toBe(409)`, `instituicoes` exato; `:90-91` estado e auditoria intactos | ✅ / ⚠️ spec-precision (formato da lista) |
| AC5 causa INATIVA oculta | fora das listas e do autocadastro | `listar-causas-ativas.spec.ts:44`, `listar-beneficiadas.spec.ts:101`, `criar-instituicao.spec.ts:251-252` | ✅ |
| AC6 não-admin | 403 **e** sem alterar dado algum | criar: `criar-causa.spec.ts:73-75` ✅. Editar: `editar-causa.spec.ts:96`, só a classe. Inativar: `inativar-causa.spec.ts:48`, só a classe | ❌ **GAP** (conjunção): "sem alterar" falta em editar e inativar. Mutantes N28 e N29 sobreviveram |
| AC7 auditoria | autor e data-hora em criar, editar e inativar | `criar-causa.spec.ts:50-56`, `editar-causa.spec.ts:48-54` + `:72-76` (antes/depois), `inativar-causa.spec.ts:200-206` | ✅ |

### P1: Seleção da beneficiada

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 só APROVADA + ATIVA, ordem alfabética | lista mista ordenada | `listar-beneficiadas.spec.ts:55`, `:112-117` | ✅ |
| AC2 busca ≥ 2, parcial, sem acento/caixa | filtra a partir de 2 | `:120-127` ("FUNDACAO"), `:130-136`, `:139-150` (1 caractere), `:152-159` (2 caracteres) | ✅ |
| AC3 exatamente uma referência | 422 para duas ou nenhuma | `assegurar…spec.ts:48-70` | ✅ |
| AC4 indisponível | 422 `Instituição ou causa indisponível` | `assegurar…spec.ts:109-112`, `:121-124`, `:134-137`, `:145-148` | ✅ |
| AC5 só campos públicos | nome, causa, cidade, UF, descrição, site, logo | `listar-beneficiadas.spec.ts:55` (objeto exato), `:170-180` | ✅ |
| AC6 catálogo vazio | domínio devolve `[]` | `listar-beneficiadas.spec.ts:46` | ✅ |

**Status**: ❌ 1 lacuna (P1-Causas AC6, conjunção "sem alterar dado" em editar e inativar). ⚠️ 3 spec-precision gaps continuam sinalizados e não bloqueiam: Autocadastro AC8, Aprovação AC1 ("nome") e Causas AC4. Os gaps de AC9 e AC2 da rodada 1 foram resolvidos pela emenda do design e pelos testes.

---

## Edge Cases (recorte P1 do domínio)

- [x] Documento ilegível → 503 sem mudar estado: `aprovar-instituicao.spec.ts:154-176`.
- [x] Empresa e instituição com o mesmo CNPJ: aceite por construção; sinal `true`/`false` em `listar-fila-instituicoes.spec.ts:193-205` e `:109-121`.
- [x] Busca sem resultado → `[]`: `listar-beneficiadas.spec.ts:161-168`.
- [x] Suspensão ou inativação não tocam campanhas: por construção.
- [ ] CNPJ simultâneo → índice único: infra (T21/T23).
- [ ] Beneficiada suspensa durante a análise de campanha → feature `campanhas`.
- [ ] Escape de HTML → web. Dois admins editando instituição → P2.

---

## Discrimination Sensor

**Profundidade**: P0 (máquina de estados, CAS, auditoria, guardas). Rodou num `git worktree add --detach <scratchpad>/wt-sensor2 HEAD`, com `node_modules` linkado. Cada mutante foi aplicado e revertido sozinho, rodando só os testes unit afetados (`npx jest <specs>` ou `src/domain`). Nenhuma morte veio de erro de compilação: todas as mortes citam o teste que falhou. O worktree foi criado duas vezes (lote principal e lote N28/N29) e removido com `git worktree remove --force` nas duas. **Isolamento**: o `git status --porcelain` da árvore real estava vazio antes e continuou vazio depois de cada remoção (`diff` idêntico). O `node_modules` real ficou intacto. Linhas referem-se a `17b383e`.

| # | File:line | Mutação | Killed? |
| - | --------- | ------- | ------- |
| #3 | `test/repositories/in-memory-instituicao-repository.ts:124` | CAS desligado no double | ✅ (concorrência, T42) |
| #9 | `use-cases/listar-beneficiadas.ts:75` | `>= 2` → `> 2` | ✅ (T44) |
| #16 | `use-cases/aprovar-instituicao.ts:76` | autor da auditoria errado | ✅ (T40) |
| #18 | `entities/causa.ts:63` | `> 80` → `> 81` | ✅ (T43) |
| #19 | `entities/causa.ts:67` | só espaços aceito | ✅ (T43) |
| #20 | `entities/causa.ts:92` | `editar` aceita INATIVA | ✅ (T43) |
| #26 | `use-cases/criar-causa.ts:62` | autor da auditoria errado | ✅ (T40) |
| N1 | `test/repositories/in-memory-causa-repository.ts:35` | `findByNome` normaliza só a entrada | ✅ |
| N2 | `in-memory-causa-repository.ts:33` | normaliza só o armazenado | ✅ |
| N3 | `in-memory-causa-repository.ts:7` | sem `toLowerCase` | ✅ |
| N4 | `in-memory-causa-repository.ts:7` | sem remover diacríticos | ✅ |
| N5 | `use-cases/editar-causa.ts:53` | comparação por id invertida | ✅ |
| N6 | `use-cases/editar-causa.ts:53` | volta a comparar por nome | ⚪ Sobreviveu, **equivalente** (ver abaixo) |
| N7 | `use-cases/editar-causa.ts:53` | colisão ignorada | ✅ |
| N8 | `use-cases/editar-causa.ts:58` | `antes` capturado depois de `editar()` | ✅ |
| N9 | `use-cases/editar-causa.ts:78` | `depois` grava o estado anterior | ✅ |
| N10 | `use-cases/editar-causa.ts:74` | autor da auditoria errado | ✅ |
| N11 | `use-cases/listar-fila-instituicoes.ts:72` | fila devolve id da causa | ✅ |
| N12 | `listar-fila-instituicoes.ts:77` | `cnpjCoincideComEmpresa` sempre `false` | ✅ |
| N13 | `listar-fila-instituicoes.ts:77` | `cnpjCoincideComEmpresa` sempre `true` | ✅ |
| N14 | `listar-fila-instituicoes.ts:76` | `documentoArquivoId` errado | ✅ |
| N15 | `errors/documento-indisponivel.error.ts:7` | mensagem trocada | ✅ |
| N16 | `errors/beneficiada-indisponivel.error.ts:10` | mensagem trocada | ✅ |
| N17 | `use-cases/inativar-causa.ts:59` | `instituicoes` incompleto | ✅ |
| N18 | `use-cases/suspender-instituicao.ts:27` | não-admin grava auditoria | ✅ |
| N19 | `use-cases/reativar-instituicao.ts:27` | não-admin muda estado | ✅ |
| N20 | `use-cases/inativar-instituicao.ts:27` | não-admin muda estado | ✅ |
| N21 | `use-cases/criar-causa.ts:37` | não-admin grava causa | ✅ |
| N22 | `use-cases/rejeitar-instituicao.ts:67` | autor da auditoria errado | ✅ |
| N23 | `use-cases/suspender-instituicao.ts:58` | autor da auditoria errado | ✅ |
| N24 | `use-cases/reativar-instituicao.ts:58` | autor da auditoria errado | ✅ |
| N25 | `use-cases/inativar-instituicao.ts:58` | autor da auditoria errado | ✅ |
| N26 | `use-cases/inativar-causa.ts:74` | autor da auditoria errado | ✅ |
| N27 | `use-cases/aprovar-instituicao.ts:79` | `criadoEm` não é `Date` | ✅ |
| N28 | `use-cases/editar-causa.ts:40` | não-admin edita e salva a causa | ❌ **Sobreviveu** (10/10) → T49 |
| N29 | `use-cases/inativar-causa.ts:38` | não-admin inativa e salva a causa | ❌ **Sobreviveu** (11/11) → T49 |

**Por que N6 é equivalente.** As duas condições só divergem quando `findByNome` devolve uma causa X em dois casos. No caso (a), X é a própria causa (mesmo id) com nome diferente do lido por `findById` na mesma requisição. Sem escrita entre as duas leituras, isso não acontece. No caso (b), X é outra causa com nome idêntico ao da causa editada, o que viola a unicidade de nome (índice único em `nome_busca`, T21/T22). Sob o invariante, nenhum teste unit distingue os dois códigos. A comparação por id continua preferível: no caso (a), sob concorrência real, a comparação por nome recusaria a edição da própria causa.

**Result**: 36 mutantes, 33 mortos, 1 equivalente (N6), 2 sobreviventes (N28, N29). Sensor FAIL.

---

## Code Quality (diff do hardening `891cdd5..17b383e`)

| Princípio | Status | Nota |
| --------- | ------ | ---- |
| Código mínimo / sem scope creep | ✅ | Cada mudança aponta para uma task da 5b. Nada além |
| Mudanças cirúrgicas | ✅ | `editar-causa.ts` removeu só o import que ficou órfão (`Causa`). Os newlines finais vieram sem reformatar outras linhas |
| Segue padrões existentes | ✅ | `normalizar` no double espelha `listar-beneficiadas.ts`. A duplicação entre o double e o caso de uso é aceitável, porque o double imita o adaptador |
| Contratos de porta coerentes | ✅ | `create(causa: Causa)`; JSDoc de `findByNome`; porta de instituição sem método morto |
| Doubles fiéis ao contrato | ✅ | `findByNome` normalizado. Fica de fora (minor, pré-existente): `findByCnpj`/`findByUsuarioId`/`create` de instituição ainda devolvem ou guardam a referência viva |
| Rich domain / caso de uso = carregar → método → persistir | ✅ | O snapshot da auditoria virou objeto simples, sem `Either` nem entidade |
| Spec-anchored outcome check | ⚠️ | Tudo bate, exceto P1-Causas AC6 em editar e inativar |
| Cobertura por camada (domínio 1:1, todos os ramos) | ⚠️ | Mesma ressalva (ramo não-admin de editar e inativar causa sem asserção de efeito) |
| Todo teste mapeia para AC / edge / Done-when | ✅ | Os 16 testes novos mapeiam para T37/T41/T42/T43/T44. Cosmético pré-existente: `describe('Casa Entity')` e `describe('EditarDadosCausaUseCase')` |
| Documentação coerente | ⚠️ | A justificativa da T37 (`tasks.md:882`) é factualmente errada. A T23 (`tasks.md:1262`) e `design.md:221` ainda citam "busca sem acento" na instituição → T50 |
| Guidelines documentadas | ✅ | Nenhuma no projeto; strong defaults de `tasks.md` |
| Senior engineer aprovaria? | ✅ | Sim, com a T49 |

---

## Fix Plans

> Dono pela regra de caminho do AD-020: `src/domain/**`, `src/core/**`, `test/repositories/**`, `test/factories/**` → 👤 humano; o resto → 🤖 agente. A autorização do usuário de 2026-10-13 (STATE.md, AD-020) cobre **T35, T37–T46 e T48**. Para o agente aplicar a T49, ela precisa ser estendida e registrada em `STATE.md` antes da primeira linha.

### T49: Ramos não-admin de editar e inativar causa não alteram dado 👤

- **What**: No teste de não-admin de `EditarCausa` e de `InativarCausa`, conferir que nada mudou. Em `EditarCausa`, nome e descrição persistidos continuam os originais. Em `InativarCausa`, o status continua `ATIVA`. Nos dois, a auditoria fica vazia. Hoje só a classe `NotAllowedError` é conferida.
- **Where**: `src/domain/fivo/application/use-cases/editar-causa.spec.ts:79-97`, `src/domain/fivo/application/use-cases/inativar-causa.spec.ts:33-49`
- **Depends on**: None
- **Requirement**: INST-07 (P1-Causas AC6)
- **Owner**: 👤 humano (ou 🤖 agente se o usuário estender a autorização de 2026-10-13 e isso for registrado em `STATE.md`)
- **Severidade**: Minor (bloqueia o PASS do sensor)
- **Done when**:
  - [ ] Não-admin em `EditarCausa`: `findById` devolve nome e descrição originais; `registroAuditoriaRepository.items` com tamanho 0
  - [ ] Não-admin em `InativarCausa`: `findById` devolve `CausaStatus.ATIVA`; auditoria vazia
  - [ ] Os mutantes N28 (`editar-causa.ts:40`, não-admin edita e salva) e N29 (`inativar-causa.ts:38`, não-admin inativa e salva) passam a ser mortos
  - [ ] Gate `quick` passa
- **Tests**: unit
- **Gate**: quick
- **Commit**: `test(api): ramos não-admin de causa não alteram dado`

### T50: Resíduos de texto da emenda T47 e da justificativa da T37 🤖

- **What**: Tirar "busca sem acento" do adaptador de instituição em `design.md:221` e no What da T23 (`tasks.md:1262`). Corrigir a justificativa da T37 (`tasks.md:882`): a comparação por id é robustez, e a comparação por nome também permitiria `"Saude"` → `"Saúde"`.
- **Where**: `.specs/features/catalogo-instituicoes/design.md`, `.specs/features/catalogo-instituicoes/tasks.md`
- **Depends on**: None
- **Requirement**: INST-08, INST-07
- **Owner**: 🤖 agente
- **Severidade**: Cosmetic (não bloqueia)
- **Done when**:
  - [ ] `design.md` e a T23 não atribuem busca ao adaptador de instituição
  - [ ] A Done-when da T37 não afirma que a comparação por nome recusaria a própria causa
  - [ ] `validate_tasks.py` sai com 0 erros
- **Tests**: none
- **Gate**: quick
- **Commit**: `docs(specs): remove resíduos da busca no adaptador de instituição`

---

## Requirement Traceability Update

`spec.md` não foi editado (o Verifier só escreve este relatório). Status proposto:

| Requirement | Status anterior (rodada 1) | Status proposto (domínio, rodada 2) |
| ----------- | -------------------------- | ----------------------------------- |
| INST-01 | ✅ Domínio verificado | ✅ Domínio verificado (aguarda infra) |
| INST-02 | ✅ | ✅ (aguarda infra) |
| INST-03 | ✅ | ✅ (aguarda infra) |
| INST-04 | ❌ Needs Fix (T39) | ✅ Domínio verificado |
| INST-05 | ❌ Needs Fix (T40, T42) | ✅ Domínio verificado |
| INST-06 | ✅ edge 503 | ✅ edge 503 (mensagem conforme o design) / infra pendente |
| INST-07 | ❌ Needs Fix (T37, T38, T40, T41, T43) | ⚠️ Needs Fix Minor (T49) |
| INST-08 | ⚠️ Needs Fix Minor (T44) | ✅ Domínio verificado |
| INST-09 | ✅ | ✅ |
| INST-10 | ✅ | ✅ |
| INST-11…13 | Deferred | fora do escopo (P2) |

---

## Histórico — rodada 1 (2026-10-13, diff `7b0e9e7..891cdd5`)

- **Veredito**: FAIL. Gate: build 0 · tsc 0 · eslint ❌ (5 erros de prettier) · unit 316/316 · e2e 204/205 ❌.
- **Sensor**: 21/28 mortos. Sobreviventes: #3, #9, #16, #18, #19, #20 e #26.
- **Lacunas de AC**: Aprovação AC1 (causa como id), AC9 (autor e data da auditoria), AC10 (CAS sem teste real); Causas AC2 (unicidade sem caixa e acento), AC7 (auditoria e snapshot "antes" corrompido); Seleção AC2 (limite de 2).
- **Mapa para a Fase 5b e fechamento na rodada 2**:

| Lacuna da rodada 1 | Task | Rodada 2 |
| ------------------ | ---- | -------- |
| eslint (newline final) | T35 | ✅ |
| e2e `instituicao-ja-existe` 422 | T36 | ✅ |
| Causas AC2 / double sem normalização | T37 | ✅ |
| Porta `create(props)` | T38 | ✅ |
| Aprovação AC1 (causa como id) | T39 | ✅ |
| AC9 / Causas AC7 autor e data (#16, #26) | T40 | ✅ |
| Snapshot "antes" da edição de causa | T41 | ✅ |
| AC10 CAS real (#3) | T42 | ✅ |
| `Causa` e `EditarCausa` sem teste efetivo (#18, #19, #20) | T43 | ✅ |
| Seleção AC2 limite de 2 (#9) | T44 | ✅ |
| Mensagem de `DocumentoIndisponivelError` | T45 | ✅ |
| `buscarDisponiveis` sem chamador | T46 | ✅ |
| Design e T21/T23 | T47 | ✅ (resíduo de texto → T50) |
| Mensagens e "sem escrita" | T48 | ✅ na Done-when; AC6 de causa incompleta → T49 |

---

## Summary

**Overall**: ❌ Not Ready. A lacuna que sobra é única, Minor e só de teste. O gate de handoff para a Fase 6 continua fechado.

**Spec-anchored check**: 35 critérios P1 de domínio avaliados (ACs + edge do 503). 34 batem com a saída da spec. 1 tem lacuna (P1-Causas AC6, conjunção "sem alterar dado" em editar e inativar). 3 spec-precision gaps continuam sinalizados e não bloqueiam.
**Sensor**: 33/36 mortos, 1 equivalente justificado (N6), 2 sobreviventes (N28, N29).
**Gate**: build 0 · tsc 0 · eslint 0 · unit 332/332 · e2e 205/205.

**O que funciona**: os 7 sobreviventes da rodada 1 estão mortos. A auditoria confere autor, entidade e data-hora em todas as 8 escritas. A concorrência é provada contra o CAS real do double. A unicidade de causa ignora caixa e acento. A fila mostra o nome da causa. As mensagens definidas na spec são conferidas literalmente. Nenhum teste foi enfraquecido.

**Próximos passos**: (1) fechar a T49 (👤, ou 🤖 com autorização estendida e registrada em `STATE.md`) e a T50 (🤖, cosmética); (2) rodada 3 da verificação, restrita a P1-Causas AC6, mutantes N28/N29 e gate `build`. É a última rodada antes de escalar ao usuário.
