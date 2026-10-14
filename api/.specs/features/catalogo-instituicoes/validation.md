# Validation: catalogo-instituicoes (feature consolidada, infra T21–T34) — FAIL

**Veredito**: ❌ **FAIL**, com duas lacunas estreitas. O gate `build` está todo verde (build, tsc, eslint, unit 332/332, e2e 334/334). Os 4 stories P1 (40 ACs) têm evidência que bate com a saída da spec. O sensor rodou 27 mutantes: 25 foram mortos e 2 sobreviveram, sem nenhum equivalente. As lacunas são estas:

1. **Edge case "documento inacessível durante a análise"** (`spec.md:196`). Só a metade "bloquear a aprovação com HTTP 503" foi implementada. A metade "exibir ao administrador o item como temporariamente indisponível" não tem campo na fila, não tem teste e nenhum artefato a adia.
2. **Guarda de papel das rotas admin não é discriminada pelos testes** (mutantes M26 e M27 vivos). Se `@Roles(UserRole.ADMIN)` sai de `AdminCausasController` ou de `AdminInstituicoesController`, a suíte inteira continua verde. O comportamento muda: um não-admin que manda corpo inválido recebe **422** em vez do **403** que a spec exige (P1-Causas AC6, P1-Aprovação AC8). Uma sonda no worktree descartável confirmou isso.

Restam 7 spec-precision gaps sinalizados. Eles não bloqueiam.

**Data**: 2026-10-13
**Spec**: `.specs/features/catalogo-instituicoes/spec.md`
**Diff range**: `cb28127..a5af170` (14 commits, T21–T34: schema e migration, adaptadores Prisma, `ArquivoService`, acesso ao documento, `VerificadorDeDocumentoPrisma`, 5 controllers, sweep de concorrência e autorização, OpenAPI, README). A metade de domínio (T1–T20 + 5b, `7b0e9e7..074a914`) já passou em `validation-dominio.md` (rodada 3, PASS). Nenhum arquivo de `src/domain/**` mudou neste range, então as citações de domínio daquele relatório continuam válidas e são reaproveitadas aqui.
**Verifier**: sub-agente independente (autor ≠ verificador). Leu `src/` e `test/` sem alterar nada. Os mutantes rodaram só num `git worktree` descartável. Este arquivo é o único que ele escreve.
**Escopo**: P1 apenas (INST-01…INST-10). P2 (INST-11…13) fica para outra rodada, conforme `tasks.md` e `spec.md:58`. Sem UAT (backend).

---

## Gate Check

- **Gate command** (`tasks.md`, Build): `cd api && npm run build && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json`. Cada etapa rodou em separado, com a saída redirecionada para arquivo no scratchpad e o exit code registrado, sem `tail`. Postgres de teste `fivo-postgres-test` (:5433): `docker compose -f docker-compose.test.yml up -d --wait` deu exit 0 e `npx prisma migrate deploy` deu exit 0.

| Etapa | Exit | Resultado |
| ----- | ---- | --------- |
| `npm run build` | 0 | ok |
| `tsc --noEmit` | 0 | ok |
| `eslint` | 0 | sem erros nem avisos |
| `jest` (unit) | 0 | 43 suites, **332/332**, 0 skip |
| `jest e2e` | 0 | 30 suites, **334/334**, 0 skip |

- **Contagem de testes**: unit 332 → 332 (a infra não mexe em unit). e2e 205 → 334 (**+129**). Bate com o que o autor reportou (unit 332, e2e 334).
- **Integridade**: nenhum `.skip`, `.only`, `xit` ou `xdescribe` em `src/` ou `test/`. O único teste pré-existente alterado é `test/http/openapi-paridade.e2e-spec.ts:115-119`, onde a contagem de rotas foi de 15 para 27 e `toEqual(registradas)` continua lá. Nenhuma asserção foi afrouxada. Nenhum marcador `// SPEC_DEVIATION` no diff.

---

## Task Completion (T21–T34)

| Task | Status | Notas |
| ---- | ------ | ----- |
| T21 Schema + migration | ✅ | `prisma/schema.prisma` + migration `20261014011933_catalogo_instituicoes`: `nome_busca` único, `cnpj` e `usuario_id` únicos, FKs, nenhuma migration antiga editada |
| T22 `PrismaCausaRepository` | ✅ | M4 e M5 mortos |
| T23 `PrismaInstituicaoRepository` | ✅ | CAS (M1, M2), `save` conservador (M3), ordenação (M23), 409 de unicidade (M21) |
| T24 `ArquivoService` PDF/limites | ✅ | M22 morto; 10 MB nas duas bordas |
| T25 Acesso ao documento | ✅ | M6 e M7 mortos. A mudança ficou em `arquivo.service.ts:118-142` (`buscarAcesso`), não em `arquivo.controller.ts`, que é o `Where` da task. A regra de dono do controller já servia |
| T26 `VerificadorDeDocumentoPrisma` | ✅ | M8 morto |
| T27 `AdminCausasController` | ⚠️ | Done-when cumprida. A guarda `@Roles(ADMIN)` não é discriminada (M26) |
| T28 `GET /causas` | ✅ | M15 e M24 mortos |
| T29 `POST /instituicoes` | ✅ | M9–M14 mortos |
| T30 Fila, aprovação, rejeição | ⚠️ | Done-when cumprida ("referência do documento e sinal de CNPJ coincidente"). Falta a metade "item temporariamente indisponível" do edge case (lacuna 1), e a guarda `@Roles(ADMIN)` não é discriminada (M27) |
| T31 Suspensão, reativação, inativação | ✅ | — |
| T32 `GET /beneficiadas` | ✅ | M16–M19 mortos |
| T33 Sweep | ✅ | O sweep só manda corpos válidos, por isso não pega M26/M27 |
| T34 OpenAPI + README | ✅ | `openapi-exportacao.e2e-spec.ts` (arquivo versionado = documento vivo) verde; README `:38-40`, `:136-147`. O último item da Done-when é este relatório |

---

## Spec-Anchored Acceptance Criteria

Para cada AC vale a evidência mais forte: e2e HTTP quando existe, unit de domínio quando o AC é só domínio. As citações `src/domain/...spec.ts` vêm de `validation-dominio.md`, com arquivos idênticos em `a5af170`.

### P1: Autocadastro da instituição (INST-01/02/03)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 envio válido | `PENDENTE_APROVACAO` + **201** com id | `test/http/cadastro-instituicao.e2e-spec.ts:164` `status).toBe(201)`; `:169-176` `toMatchObject({status: PENDENTE_APROVACAO, cnpj, causaId, descricao, documentoDescricao})`; `:181` `role).toBe(INSTITUICAO)` | ✅ / ⚠️ SP6 |
| AC2 CNPJ inválido | 422 `CNPJ inválido`, nada persistido | `cadastro-instituicao.e2e-spec.ts:263-265` `status 422`, `message: 'CNPJ inválido'`, `contarLinhas()).toEqual(NADA_PERSISTIDO)` (usuário, instituição, arquivo e storage zerados) | ✅ |
| AC3 CNPJ/e-mail duplicado | 409 `CNPJ ou e-mail já cadastrado` | CNPJ: `:366-375` (409 + mensagem + uma linha só). E-mail de empresa (unicidade global): `:388-393` | ✅ |
| AC4 senha < 10 | 422 + mensagem literal | `:271-275` `message: 'A senha deve ter no mínimo 10 caracteres'` + nada persistido | ✅ |
| AC5 hash | só hash com salt | `:183` `senhaHash).toMatch(/^\$argon2id\$/)`, `:184` `not.toContain('SenhaForte123')` | ✅ |
| AC6 sem documento | 422 + mensagem literal | `:281-285` `message: 'Anexe um documento que comprove a existência da instituição'` + nada persistido | ✅ |
| AC7 PDF/JPG/PNG ≤ 10 MB, 1 arquivo, descrição ≤ 200 | aceitos | PDF `:164`, `:177-180` `mime: 'application/pdf'`; JPG/PNG `:187-199`; **10 MB exato** `:202-207` → 201; descrição 201 caracteres → 422 `:293-296`; serviço `test/arquivo/arquivo-service.e2e-spec.ts` (10 MB aceito / 10 MB+1 rejeitado) | ✅ / ⚠️ SP2 (mais de 1 arquivo) |
| AC8 formato/tamanho violado | 422 informando o limite | formato: `:309-314` `stringContaining('Formatos aceitos: application/pdf, image/jpeg, image/png')`; tamanho 10 MB+1: `:323-327` `{statusCode: 422, message: 'Arquivo inválido: tamanho excede o limite de 10 MB.'}` (e não 413) | ✅ / ⚠️ SP1 |
| AC9 causa inexistente/INATIVA | 422 `Causa inválida ou inativa` | `:331-356` it.each (inexistente, inativa): `message: 'Causa inválida ou inativa'` + nada persistido | ✅ |
| AC10 logo | PNG/JPG/SVG ≤ 5 MB; raster ≥ 512²; opcional | HTTP: `:231-239` (PNG 512² → `LOGO_INSTITUICAO`), `:252-257` (100² → 422 com a mensagem da dimensão + nada persistido), opcional `:175` `logoArquivoId: null`. Formatos e 5 MB: `src/domain/fivo/entities/arquivo.spec.ts:279,297,301`. PDF como logo: `arquivo-service.e2e-spec.ts` ("PDF enviado como logo… `/formato application\/pdf/`") | ✅ |
| AC11 e-mail em análise | e-mail ao endereço cadastrado | `:213-218` `mensagens).toEqual([{para: 'contato@amigosdobairro.org', template: CADASTRO_RECEBIDO}])` | ✅ |
| AC12 storage fora | 503 + mensagem literal, sem instituição | `:401-405` `status 503`, `message: 'Não foi possível enviar o documento, tente novamente'`, `NADA_PERSISTIDO` | ✅ |

### P1: Aprovação pelo administrador (INST-04/05/06)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 fila | só PENDENTE, mais antiga primeiro; nome, CNPJ, causa, cidade, UF, data, link do documento | `test/http/admin-instituicoes.e2e-spec.ts:174-199` `body).toEqual([...])` exato, com a mais antiga primeiro, a APROVADA ausente, `causa: 'Educação'`, `documentoArquivoId`, `criadoEm`. O link abre: `:207-212` `GET /arquivos/{documentoArquivoId}` → 200 `application/pdf` | ✅ / ⚠️ SP3 |
| AC2 aprovar | `APROVADA`, autor, data-hora, catálogo, e-mail | `:226-238` (204, `APROVADA`, `decididoPor === admin`, `decididoEm` < 60 s, e-mail `CADASTRO_APROVADO`); catálogo: `test/http/beneficiadas.e2e-spec.ts:141-192` (só `APROVADA` aparece) | ✅ |
| AC3 rejeitar | motivo ≥ 20; `REJEITADA`; motivo persistido e enviado por e-mail | `:288-299` (204, `REJEITADA`, `motivoDecisao`, e-mail com `dados: {motivo}`); motivo curto → 422 `:322-329` com mensagem literal e estado intacto; sem motivo → 422 `:341-347` | ✅ |
| AC4 ocultar não aprovadas | fora nos 4 estados | `beneficiadas.e2e-spec.ts:152-191` (PENDENTE, REJEITADA, SUSPENSA, INATIVA criadas, resposta só com a APROVADA); suspensão e inativação via HTTP somem: `:323-357` | ✅ |
| AC5 6 transições, outra = 409 | 409 | HTTP: `admin-instituicoes.e2e-spec.ts:382-399` (aprovar de APROVADA/REJEITADA), `:472-499` (8 transições proibidas → 409 + mensagem + estado + auditoria 0), `:362-379`. Tabela completa: `src/domain/fivo/entities/instituicao.spec.ts:96-163`. (`REJEITADA → PENDENTE` não tem rota P1, só a regra de domínio) | ✅ |
| AC6 inativar sem excluir | `INATIVA`, registro mantido | `:459-463` (204, `INATIVA`, `count()).toBe(1)`) | ✅ (campanhas: por construção, feature `campanhas`) |
| AC7 acesso ao documento | só admin e a própria instituição; 403 para os outros | `test/http/arquivo.e2e-spec.ts:318-320` (dona 200, bytes iguais), `:352-353` (admin 200), `:369` (outra instituição 403), `:386` (empresa 403), `:396` (anônimo **401**) | ✅ / ⚠️ SP5 |
| AC8 não-admin | 403 **e** nenhum estado alterado | `admin-instituicoes.e2e-spec.ts:556-575` (EMPRESA e INSTITUICAO em fila, aprovação e rejeição: 403, estado PENDENTE, auditoria 0), `:577-605` (suspensão, reativação e inativação em transição válida: 403 + estado + auditoria 0), sweep `test/http/catalogo-concorrencia.e2e-spec.ts:261-297` | ✅ na saída. ❌ discriminação da guarda (M27, lacuna 2) |
| AC9 auditoria | autor, anterior, novo, motivo, data-hora | HTTP: `admin-instituicoes.e2e-spec.ts:241-245`, `:302-310` (inclui `motivo`), `:428-445`, `:466-469` (autor + estados). Data-hora: `src/domain/fivo/application/use-cases/aprovar-instituicao.spec.ts:104-116` (N27 morto). A coluna `criado_em` do registro é gravada pelo adaptador pré-existente | ✅ |
| AC10 concorrência | só a primeira vale; a segunda recebe 409 | HTTP, 8 rodadas: `catalogo-concorrencia.e2e-spec.ts:203` `[...].sort()).toEqual([204, 409])`, `:207-213` (estado da vencedora, 1 auditoria, 1 e-mail). CAS real no Postgres: `test/database/prisma-instituicao-repository.e2e-spec.ts:353-358`, `:380` | ✅ (M1, M2 mortos) |

### P1: Manutenção de causas (INST-07)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 criar | `ATIVA` + 201 | `test/http/admin-causas.e2e-spec.ts:128-137` | ✅ |
| AC2 nome existente | 409 `Causa já cadastrada` (sem caixa/acento, design) | `:149-151` (`EDUCACAO` contra `Educação` → 409 + mensagem + 1 linha); edição: `:212-214`; índice: `test/database/prisma-causa-repository.e2e-spec.ts:138-145`, `:156-161` | ✅ |
| AC3 inativar sem excluir | `INATIVA`, registro mantido | `admin-causas.e2e-spec.ts:267-269` | ✅ |
| AC4 com aprovadas | 409 + lista das instituições | `:294-306` (409, `instituicoes` = `['Coral da Vila','Teatro Aberto']`, nomes na `message`, a pendente fora da lista, causa ATIVA) | ✅ / ⚠️ SP4 |
| AC5 INATIVA oculta | fora da seleção e do autocadastro | `test/http/causas.e2e-spec.ts:58-75`, `:96-103` (inativada via HTTP some de `GET /causas`); `beneficiadas.e2e-spec.ts:141-191` (Cultura INATIVA ausente); autocadastro com causa INATIVA → 422 `cadastro-instituicao.e2e-spec.ts:333-355` | ✅ |
| AC6 não-admin | 403 **e** nenhum dado alterado | `admin-causas.e2e-spec.ts:347-368` (403 em criar, editar e inativar, causa intacta, auditoria 0) | ✅ na saída. ❌ discriminação da guarda (M26, lacuna 2) |
| AC7 auditoria | autor e data-hora em criar, editar e inativar | `:394-413` (tipos `CAUSA_CRIADA/EDITADA/INATIVADA`, `usuarioId === admin`, `criadoEm` < 60 s) | ✅ |

### P1: Seleção da beneficiada (INST-08/09/10)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 só APROVADA + ATIVA, alfabética | lista mista ordenada | `beneficiadas.e2e-spec.ts:167-191` `body).toEqual([...])` exato; ordem: `:342-346` | ✅ |
| AC2 busca ≥ 2, parcial, sem acento/caixa | filtro | `:243-254` (`fundacao`, `Fundação`, `FUNDAÇÃO`, `undaca` → mesmo id), `:262-268` (causa por nome). Limite de 2: `src/domain/fivo/application/use-cases/listar-beneficiadas.spec.ts:139-159` | ✅ (M18 morto) |
| AC3 exatamente uma referência | 422 para duas ou nenhuma | domínio: `src/domain/fivo/application/use-cases/assegurar-beneficiada-disponivel.spec.ts:48-70` (consumo HTTP na feature `campanhas`, `design.md:25`) | ✅ (domínio) |
| AC4 indisponível | 422 `Instituição ou causa indisponível` | domínio: `assegurar-beneficiada-disponivel.spec.ts:109-112`, `:121-124`, `:134-137`, `:145-148` | ✅ (domínio) |
| AC5 só campos públicos | nome, causa, cidade, UF, descrição, site, logo; nunca documento, e-mail, telefone, notas | `beneficiadas.e2e-spec.ts:215` `Object.keys(item).sort()).toEqual(CAMPOS_PUBLICOS)`; `:218-228` o JSON bruto não contém id/descrição do documento, e-mail, telefone, CNPJ, admin decisor nem data da decisão | ✅ (M19 morto) / ⚠️ SP7 |
| AC6 catálogo vazio | mensagem no `web`; API devolve `[]` (`design.md:27`) | `:277-278` `body).toEqual([])` | ✅ |

**Status**: 40/40 ACs P1 com evidência que bate com a saída da spec. Em P1-Causas AC6 e P1-Aprovação AC8, a saída é observada, mas o teste não discrimina a guarda de papel da negação do caso de uso (lacuna 2). ⚠️ 7 spec-precision gaps sinalizados.

---

## Edge Cases

- [x] CNPJ simultâneo → um 201, um 409, um registro: `catalogo-concorrencia.e2e-spec.ts:173-180`, apoiado pelo índice único (M21 morto).
- [x] Empresa e instituição com o mesmo CNPJ coexistem e a fila sinaliza: `catalogo-concorrencia.e2e-spec.ts:221-238` (`cnpjCoincideComEmpresa: true`); `prisma-instituicao-repository.e2e-spec.ts:426-437`.
- [x] Busca sem resultado → estado vazio: a API devolve `[]` (`beneficiadas.e2e-spec.ts:290-291`); a orientação textual fica no `web`.
- [x] Suspensão com campanhas aprovadas → páginas no ar, só some da seleção: a seleção é conferida em `beneficiadas.e2e-spec.ts:323-357`; as campanhas não são tocadas (por construção, feature `campanhas`).
- [ ] **Documento inacessível durante a análise → "exibir ao administrador o item como temporariamente indisponível" e "bloquear a aprovação com HTTP 503"**. A metade 503 está ✅ (`admin-instituicoes.e2e-spec.ts:258-266`: 503 com a mensagem literal, estado PENDENTE, auditoria 0, nenhum e-mail; M8 morto). A metade da fila está ❌: não há campo, não há teste e nenhum adiamento registrado. Ver Fix 1.
- [—] Beneficiada suspensa durante a análise de campanha → feature `campanhas` (`design.md:25`). Escape de HTML → `web` (`design.md:28`). Dois admins editando a mesma instituição → não existe rota de edição admin no P1 (área de edição é P2).

**Por que a metade da fila é lacuna, e não fora de escopo.** (a) `spec.md:196` usa SHALL nas duas metades. (b) A tabela "Fora desta rodada" do design (`design.md:20-28`) adia explicitamente outros itens de exibição (AC6, escape de HTML), mas não este. (c) O design trata só o 503 (`design.md:311`, `:213`: "usada pela aprovação"), e a Done-when da T30 (`tasks.md:1529`) só pede "referência do documento e sinal de CNPJ coincidente". O requisito caiu no caminho da spec para o design, sem decisão registrada. (d) O edge case vizinho, "SHALL sinalizar a coincidência ao administrador na fila de análise" (`spec.md:195`), virou um campo da API (`cnpjCoincideComEmpresa`). O mesmo formato de requisito ("mostrar ao admin um estado do item na fila") pede o mesmo tratamento. A leitura alternativa ("o `web` sonda `GET /arquivos/:id` por item") não está registrada em lugar nenhum e não tem teste. Com o `FakeStorage`, um objeto sumido nessa rota cai em `Error` genérico (500), não em 503.

---

## Discrimination Sensor

**Profundidade**: expandida (P0: CAS, autorização, controle de acesso a documento sensível, limites de upload). Os mutantes rodaram num `git worktree add --detach <scratchpad>/verify-wt a5af170`, com `node_modules` como link simbólico para o da árvore real e cópia do `.env`. Um script (`scripts/mutantes.py` no scratchpad) fez cada mutação com âncora de ocorrência única, rodou os specs e2e afetados (sequencialmente, no mesmo banco de teste) e restaurou o arquivo com `git checkout --` dentro do worktree antes do próximo. Nenhuma morte veio de erro de compilação: todas apontam a asserção ou o teste que falhou. No fim, o link foi apagado, o worktree removido com `git worktree remove --force` e `git worktree prune`. **Isolamento**: o `git status --porcelain` da árvore real estava vazio antes e continuou vazio depois (`diff` idêntico). `git stash` não foi usado.

| # | File:line (`a5af170`) | Mutação | Killed? (teste que matou) |
| - | --------------------- | ------- | ------------------------- |
| M1 | `src/infra/database/prisma/prisma-instituicao-repository.ts:134` | CAS removido (`updateMany` sem `status: estadoEsperado`) | ✅ `prisma-instituicao-repository.e2e-spec.ts` "devolve false quando o estado persistido já mudou", "duas decisões concorrentes"; `catalogo-concorrencia` "aprovação e rejeição simultâneas" |
| M2 | `prisma-instituicao-repository.ts:139` | `count === 1` → `count >= 0` | ✅ os mesmos 3 testes |
| M3 | `prisma-instituicao-repository.ts:114` | `save` regrava `status`/`decididoPor`/`decididoEm`/`motivoDecisao` | ✅ "save grava dados cadastrais sem alterar…" (`:405`) |
| M4 | `src/infra/database/prisma/mappers/prisma-causa-mapper.ts:24` | `nome_busca` sem remover acento | ✅ causa repo `:68`, `:78`, `:138`; `admin-causas` `:149` |
| M5 | `prisma-causa-mapper.ts:25` | `nome_busca` sem `toLowerCase` | ✅ causa repo + `admin-causas` POST `:149` e PATCH `:212` |
| M6 | `src/infra/arquivo/arquivo.service.ts:138-139` | `buscarAcesso` ignora a instituição dona do documento | ✅ `arquivo.e2e-spec.ts:318` (dona → 200) |
| M7 | `src/infra/http/controllers/arquivo.controller.ts:71-74` | qualquer INSTITUICAO baixa qualquer arquivo | ✅ `arquivo.e2e-spec.ts:369` (outra instituição → 403) |
| M8 | `src/infra/arquivo/verificador-de-documento-prisma.ts:18` | verificador devolve `true` quando o storage falha | ✅ `verificador-de-documento.e2e-spec.ts:68`, `:75`; `admin-instituicoes` `:258` (503) |
| M9 | `src/infra/http/controllers/cadastro-instituicao.controller.ts:53` | teto do multer `10 MB` (sem `+1`) | ✅ `cadastro-instituicao.e2e-spec.ts:207` (10 MB exato → 201) |
| M10 | `cadastro-instituicao.controller.ts:53` | teto `10 MB + 2` (10 MB+1 passa pelo multer) | ✅ `:324-327` (mensagem exata, sem "(N bytes)") |
| M11 | `cadastro-instituicao.controller.ts:131` | `LimiteDoDocumentoInterceptor` removido (filtro responde "5 MB") | ✅ `:324-327` |
| M12 | `cadastro-instituicao.controller.ts:181` | descarte de arquivos órfãos removido | ✅ 8 testes (`NADA_PERSISTIDO`), p. ex. `:257`, `:265` |
| M13 | `cadastro-instituicao.controller.ts:198` | `StorageIndisponivelError` não vira 503 com a mensagem da spec | ✅ `:403` |
| M14 | `cadastro-instituicao.controller.ts:128` | `@Public()` removido | ✅ 19/19 do spec (401) |
| M15 | `src/infra/http/controllers/causas.controller.ts:33` | `@Public()` removido de `GET /causas` | ✅ `causas.e2e-spec.ts:58`, `:96` |
| M16 | `src/infra/http/controllers/beneficiadas.controller.ts:74` | `@Roles(EMPRESA)` removido | ✅ `beneficiadas.e2e-spec.ts:313` (ADMIN e INSTITUICAO → 403) |
| M17 | `beneficiadas.controller.ts:88-90` | resultado de `AssegurarEmpresaAprovada` ignorado | ✅ `:300` (empresa pendente → 403) |
| M18 | `beneficiadas.controller.ts:93` | `busca` não repassada | ✅ `:252`, `:268`, `:291` |
| M19 | `src/domain/fivo/application/use-cases/listar-beneficiadas.ts:55` | read model vaza `telefone` e `cnpj` (conjunção do payload no e2e) | ✅ `beneficiadas.e2e-spec.ts:215`, `:168` |
| M20 | `src/infra/http/controllers/admin-causas.controller.ts:159-161` | 409 da inativação perde `instituicoes` (cai no filtro genérico) | ✅ `admin-causas.e2e-spec.ts:299` |
| M21 | `prisma-instituicao-repository.ts:96` | violação do índice único de CNPJ não vira 409 | ✅ repo `:416`; `catalogo-concorrencia` `:173` |
| M22 | `arquivo.service.ts:164` | `%PDF-` não reconhecido | ✅ 18 testes (serviço + autocadastro) |
| M23 | `prisma-instituicao-repository.ts:66` | `listarPorEstado` com ordem invertida | ✅ repo `:267`; `admin-instituicoes` `:174` |
| M24 | `src/infra/database/prisma/prisma-causa-repository.ts:44` | `listarAtivas` sem filtro de estado | ✅ `causas` `:59`, `:97`; `beneficiadas` `:168`, `:278` |
| M25 | `src/infra/http/controllers/admin-instituicoes.controller.ts:105-108` | fila sem renomear `createdAt` → `criadoEm` (contrato OpenAPI) | ✅ `admin-instituicoes` `:174` |
| M26 | `admin-causas.controller.ts:65` | `@Roles(UserRole.ADMIN)` removido de `AdminCausasController` | ❌ **Sobreviveu** (22/22 verdes em `admin-causas` + `catalogo-concorrencia`) |
| M27 | `admin-instituicoes.controller.ts:43` | `@Roles(UserRole.ADMIN)` removido de `AdminInstituicoesController` | ❌ **Sobreviveu** (41/41 verdes em `admin-instituicoes` + `catalogo-concorrencia`) |

**Por que M26 e M27 não são equivalentes.** Todos os casos de uso de escrita negam o não-admin com `NotAllowedError` → 403. A guarda, porém, roda **antes** do `ZodValidationPipe`. Uma sonda no worktree, com um arquivo de teste temporário depois apagado, mediu isto para um usuário EMPRESA:

| Requisição | Com a guarda (`a5af170`) | Sem a guarda (M26/M27) |
| ---------- | ------------------------ | ---------------------- |
| `POST /admin/causas` com `{}` | **403** `Acesso negado` | **422** `Campo obrigatório` + lista dos campos |
| `POST /admin/instituicoes/x/rejeicao` com `{}` | **403** | **422** `errors: [{campo: 'motivo'}]` |

A spec diz "IF um usuário sem papel de administrador chamar endpoints de escrita de causa THEN 403" (P1-Causas AC6) e "…qualquer endpoint de aprovação, rejeição… THEN 403" (P1-Aprovação AC8), sem condição sobre o corpo. Os mutantes mudam uma saída definida pela spec, e todos os testes de não-admin (`admin-causas.e2e-spec.ts:331-368`, `admin-instituicoes.e2e-spec.ts:542-605`, `catalogo-concorrencia.e2e-spec.ts:278`) mandam corpos válidos. Por isso nenhum distingue os dois códigos. Ver Fix 2.

**Sensor**: 27 injetados, 25 mortos, 2 sobreviventes, 0 equivalentes. ❌

---

## Code Quality (diff `cb28127..a5af170`)

| Princípio | Status | Nota |
| --------- | ------ | ---- |
| Código mínimo / sem scope creep | ✅ | Só as rotas, os adaptadores e os testes nomeados nas tasks. Nenhuma rota de P2 |
| Mudanças cirúrgicas | ✅ | Nada em `src/domain/**`, `test/repositories/**` nem `test/factories/**` (AD-020 respeitado). `e2e-app.ts` só ganhou as 2 tabelas novas na ordem de FK |
| Segue padrões existentes | ✅ | Espelha `admin-empresas`/`cadastro-empresa` (`desembrulhar`, `ZodValidationPipe`, `ApiErro`, CAS com `updateMany` + `count`) |
| Spec-anchored outcome check | ✅ | Mensagens literais da spec conferidas com `toMatchObject({message})` em todos os ACs que citam texto |
| Cobertura por camada (rotas: happy + edge + erro) | ⚠️ | Toda rota tem happy, 401, 403, 404, 409 e 422 onde se aplica. Falta o caso "não-admin com corpo inválido" (M26/M27) |
| Todo teste mapeia para AC / edge / Done-when | ✅ | Os testes extras (404, 401, cabeçalhos) mapeiam para Done-when e contratos já existentes |
| Guidelines documentadas | ✅ | Nenhuma no projeto; strong defaults de `tasks.md` |
| Senior engineer aprovaria? | ✅ com ressalvas | Ressalvas cosméticas, sem task: (i) `openapi-paridade.e2e-spec.ts:119` fixa 27 rotas, mas o `toEqual(registradas)` da linha seguinte já garante a paridade, então o número só obriga a editar o teste a cada rota nova; (ii) `findById`/`findByCnpj` dos repositórios leem por `this.prisma`, fora do contexto de transação, igual ao repositório de empresa |

---

## Spec-precision gaps (sinalizados, não bloqueiam)

| # | AC | O que a spec deixa aberto | O que a implementação faz |
| - | -- | ------------------------- | ------------------------- |
| SP1 | Autocadastro AC8 | O texto da mensagem do limite (herdado do domínio) e o sentido de "mantendo o restante do cadastro intacto" | 422 `Arquivo inválido: tamanho excede o limite de 10 MB.` / `…Formatos aceitos: …`. A submissão inteira é rejeitada e nada persiste (atômico com AC6/AC12) |
| SP2 | Autocadastro AC7 | A resposta para **mais de um** documento ("exatamente um arquivo") | 400 `Unexpected field - documento` (texto em inglês do multer, medido na sonda), sem persistir. AC8 cobre só formato e tamanho |
| SP3 | Aprovação AC1 | "nome" (razão social ou fantasia?) e "link para o documento" | `razaoSocial`; `documentoArquivoId`, aberto por `GET /arquivos/{id}` (`admin-instituicoes.e2e-spec.ts:207-212`) |
| SP4 | Causas AC4 | Formato da lista | `instituicoes: string[]` + nomes na `message` |
| SP5 | Aprovação AC7 | "403 a qualquer outro solicitante" inclui o anônimo? | Anônimo → 401 (`arquivo.e2e-spec.ts:396`), como a T25 aceita ("403/401") |
| SP6 | Autocadastro AC1 | "site ou canal de contato público" | Um campo `site` obrigatório de texto livre. `contato` é o nome da pessoa de contato (`criar-instituicao.ts:136`) |
| SP7 | Seleção AC5 | Como o "logo" é exposto publicamente | Só `logoArquivoId`. `GET /arquivos/:id` é restrito a dono e admin, então a dereferência pública fica para `paginas-publicas` |

---

## Fix Plans

### Fix 1 (Major): fila sinaliza documento temporariamente indisponível

- **Causa raiz**: o edge case `spec.md:196` tem duas metades. O design (`design.md:213`, `:311`) e a T30 (`tasks.md:1529`) só levaram a do 503.
- **Fix task** (duas opções, quem decide é o dono da spec):
  - (a) **Implementar**: `GET /admin/instituicoes` ganha, por item, `documentoDisponivel: boolean`, calculado com a porta `VerificadorDeDocumento`. Isso pede mudar o domínio (`ListarFilaInstituicoesUseCase`, autoria humana pelo AD-020) ou compor no controller. Mais OpenAPI e `openapi.json`. Teste e2e: com o objeto apagado do storage, o item vem `false` e a aprovação responde 503; no caminho feliz, `true`.
  - (b) **Adiar explicitamente**: registrar em `design.md` ("Fora desta rodada") e no `STATE.md` que a exibição fica no `web`, com o contrato que ele vai usar (`GET /arquivos/:id` → 503 quando ilegível). Mais um e2e provando esse 503 para o documento com o objeto ausente.
- **Done when**: a metade "exibir" do edge case tem evidência `file:line`, ou um adiamento registrado com o contrato de API testado.

### Fix 2 (Minor): discriminar a guarda de papel das rotas admin do catálogo

- **Causa raiz**: os testes de não-admin mandam sempre corpo válido. Assim, a negação do caso de uso mascara a remoção de `@Roles(ADMIN)`.
- **Fix task**: em `test/http/catalogo-concorrencia.e2e-spec.ts` (sweep lido do OpenAPI), repetir o laço de `:271-287` com corpo **vazio** (`send({})`) e esperar 403 em todas as 9 rotas, para EMPRESA e INSTITUICAO.
- **Done when**: M26 e M27, reaplicados, são mortos.

---

## Requirement Traceability Update

`spec.md` não foi editado. Status proposto (`spec.md:205-217`):

| Requirement | Status anterior | Status proposto |
| ----------- | --------------- | --------------- |
| INST-01, INST-02, INST-03 | ✅ Domínio · infra em Tasks | ✅ Verified (domínio + infra) |
| INST-04 | ✅ Domínio · infra em Tasks | ⚠️ Needs Fix: Fix 1 (fila sem sinal de documento indisponível) e Fix 2 (guarda de rejeição/fila) |
| INST-05 | ✅ Domínio · infra em Tasks | ⚠️ Needs Fix Minor: Fix 2 (M27) |
| INST-06 | ✅ Domínio · infra em Tasks | ✅ Verified (acesso + 503); a exibição na fila está no Fix 1 |
| INST-07 | ✅ Domínio · infra em Tasks | ⚠️ Needs Fix Minor: Fix 2 (M26) |
| INST-08, INST-10 | ✅ Domínio · infra em Tasks | ✅ Verified |
| INST-09 | ✅ Domínio | ✅ Domínio verificado · consumo na feature `campanhas` |
| INST-11…13 | Deferred | Deferred (P2) |

---

## Summary

**Overall**: ❌ Not Ready, mas perto. Duas tasks de correção pequenas.

**Spec-anchored check**: 40/40 ACs P1 com evidência que bate com a saída da spec. 1 edge case pela metade (lacuna 1). 7 spec-precision gaps.
**Sensor**: 27 mutantes: 25 mortos, 2 sobreviventes (M26, M27), 0 equivalentes.
**Gate**: build 0 · tsc 0 · eslint 0 · unit 332/332 · e2e 334/334.

**O que funciona**: o CAS de decisão é provado contra o Postgres real e por HTTP concorrente. O `save` não desfaz decisão. A unicidade de causa ignora caixa e acento no índice. O limite de 10 MB foi testado nas duas bordas, com a mensagem certa e sem 413. Upload que falha não deixa arquivo órfão. O storage fora do ar dá 503 com a mensagem da spec. O documento só é lido pelo admin e pela dona. O catálogo não vaza CNPJ, e-mail, telefone, documento nem dados de decisão (chaves exatas + JSON bruto). Mensagens literais da spec são conferidas em todos os ACs que citam texto.

**Próximos passos**: (1) o dono da spec decide entre as opções (a) e (b) do Fix 1; (2) Fix 2 (um laço de teste); (3) nova verificação (rodada 2 de 3).
