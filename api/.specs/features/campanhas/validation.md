**Verdict**: FAIL

# Campanhas — Validação final (P1 do `api`)

**Veredito**: ❌ **FAIL**, por três mutantes sobreviventes de baixo risco. A infra T28–T40 cumpre todas as Done-when. Os 47 critérios P1 têm evidência no valor da spec, e o gate build está verde: unit 602/602, e2e 542/542 em 35 suites. Dos 33 mutantes da infra, 29 morreram, 3 sobreviveram e 1 é equivalente. Os sobreviventes mostram lacunas só de teste, sem defeito de produção: os cabeçalhos CSP e `Content-Disposition` da capa pública (S25, S32) e o 422 de forma da rejeição de alteração (S33). Para fechá-los, abro duas fix tasks 🤖 de severidade Minor (T54 e T55), e nenhuma toca o domínio.

**Data**: 2026-10-27
**Spec**: `.specs/features/campanhas/spec.md`
**Diff range**: feature `397f8bc..f869eef`. O foco é a infra `79dd6bc..f869eef`: 14 commits, 27 arquivos, +8314/−472. Fase 7: `207be5a` (T28), `59f4a7b` (T29), `0a9ce24` (emenda de docs), `bef460d` (T30), `ae26a77` (T31). Fases 8–9: `7ec5458..f869eef` (T32–T40). O domínio fica em `397f8bc..dad822e` e já foi validado em `validation-dominio.md`, rodada 3, com PASS.
**Verifier**: sub-agente independente (autor ≠ verificador). Trabalhei só lendo `src/` e `test/`, e escrevi apenas este arquivo e as lições.
**Escopo**: CAMP-01…08 e CAMP-11. Ficam de fora CAMP-09, CAMP-10 e o `web`. Não houve UAT, porque a feature é só backend.

Caminhos abreviados:

| Prefixo | Caminho |
| ------- | ------- |
| `C/` | `src/infra/http/controllers/` |
| `TH/` | `test/http/` |
| `CE` | `TH/campanhas.e2e-spec.ts` |
| `AE` | `TH/admin-campanhas.e2e-spec.ts` |
| `PE` | `TH/campanhas-publicas.e2e-spec.ts` |
| `KE` | `TH/campanhas-concorrencia.e2e-spec.ts` |
| `RE` | `test/database/prisma-campanha-repository.e2e-spec.ts` |
| `FE` | `test/arquivo/arquivo-service.e2e-spec.ts` |
| `E/` | `src/domain/fivo/entities/` |
| `U/` | `src/domain/fivo/application/use-cases/` |

---

## Task Completion

Conferi cada Done-when no código, sem confiar nos checkboxes.

| Task | Status | Evidência |
| ---- | ------ | --------- |
| T28 schema e migration | ✅ | Os modelos e enums de `prisma/schema.prisma` batem com o design §Data Models. `id_publico` e `capa_arquivo_id` são únicos (`prisma/migrations/20261028003809_campanhas/migration.sql:62`, `:65`) e as datas usam `@db.Date`. O SQL manual tem o CHECK XOR nas duas tabelas e o índice parcial (`migration.sql:96-107`). Nenhuma migration antiga foi editada. **Drift**: `prisma migrate diff --from-schema-datasource … --to-schema-datamodel …` respondeu "This is an empty migration." |
| T29 adaptador e mapper | ✅ | CAS em `src/infra/database/prisma/prisma-campanha-repository.ts:69-76`. A decidida é gravada antes da pendente, as duas por upsert (`:82-106`). O mapper carrega só a alteração `EM_ANALISE`: há filtro no include (`:16-18`) e no mapper (`prisma-campanha-mapper.ts:203-205`). Dado inválido lança erro (`prisma-campanha-mapper.ts:70-80`, testado em `RE:431-454`). Binding em `database.module.ts`, e `limparBanco` inclui as duas tabelas (`test/helpers/e2e-app.ts:62-63`). Os e2e da Done-when estão em `RE:188-831`, inclusive N6 (`RE:740-756`), upsert sem linha prévia (`RE:758-782`) e comparação coluna a coluna (`RE:248-289`). A regra P13 foi para `design.md:183` (ver decisão 11) |
| T30 templates enfileiráveis | ✅ | `src/infra/mail/mailer-resiliente.ts:17-18`. Há um teste por template em `src/infra/mail/mailer-resiliente.spec.ts:36-59` |
| T31 `ArquivoService` capa | ✅ | PNG e JPEG aceitos, SVG e PDF recusados com 422 e mensagem literal, 5 MB aceitos e 5 MB + 1 recusados (`FE:388-472`). O dono da campanha é reconhecido em `src/infra/arquivo/arquivo.service.ts:127,142`, e dono × não-dono é testado em `FE:540-561` |
| T32 POST e GET | ✅ | `C/campanhas.controller.ts:213-246`. A rota responde 201 `{ id, idPublico }` (`CE:106-139`), 401 (`CE:473-481`), 403 para ADMIN (`CE:483-497`) e 403 com a mensagem exata para empresa não aprovada (`CE:499-523`). Cada limite de AC3–AC11 tem teste com a mensagem (`CE:229-457`), e o início no passado também (`CE:210-227`). O GET responde 200 à dona (`CE:527-563`) e 404 a outra empresa (`CE:581-596`). Paridade OpenAPI verde |
| T33 PATCH | ✅ | `C/campanhas.controller.ts:268-284`. Coberto: rascunho (`CE:643-680`), 409 em análise (`CE:682-706`), `REJEITADA` voltando a `RASCUNHO` (`CE:708-736`), textos em `APROVADA` (`CE:738-763`), abertura de alteração (`CE:765-858`), segunda alteração com 409 (`CE:860-881`), 422 (`CE:883-996`) e 404 (`CE:998-1010`) |
| T34 PUT capa | ✅ | Limite do multer em `C/campanhas.controller.ts:57`. Testes: 5 MB → 204 (`CE:1115-1124`), +1 → 422 (`CE:1126-1139`), SVG e PDF → 422 (`CE:1141-1167`), 503 sem alterar a campanha (`CE:1185-1202`), troca de capa remove a antiga (`CE:1204-1219`) e falha no `salvar` remove a nova (`CE:1236-1279`) |
| T35 submissão | ✅ | Testes: 204 com `EM_ANALISE` (`CE:1353-1383`), 422 com `errors` (`CE:1399-1431`), fim vencido (`CE:1433-1457`), beneficiada fora do catálogo (`CE:1459-1501`) e 409 na segunda submissão (`CE:1503-1520`) |
| T36 fila e decisões | ✅ | Testes: fila com os dois tipos em ordem (`AE:97-176`), 403 para EMPRESA (`AE:189-203`), aprovação com auditoria (`AE:217-236`), 409 com beneficiada inativada (`AE:238-301`), rejeição com e-mail (`AE:370-409`) e motivo de 19 caracteres → 422 (`AE:422-438`) |
| T37 decisões de alteração | ✅ | Testes: aprovar aplica (`AE:574-618`), rejeitar mantém e envia e-mail (`AE:712-760`), 409 sem pendência (`AE:668-685`, `:801-818`) e 409 com beneficiada indisponível (`AE:645-666`). A rota não tem teste de 422 sem motivo (S33 → T55) |
| T38 consulta pública | ✅ | Testes: 200 sem cookie e omissões (`PE:116-189`), 404 com corpo idêntico, comparado byte a byte em `resposta.text`, nos 6 casos e mais o id interno (`PE:249-321`), e capa com `Content-Type` correto (`PE:340-359`) ou 404 em rascunho (`PE:361-373`). CSP e `Content-Disposition` não são testados (S25, S32 → T54) |
| T39 concorrência e papéis | ✅ | Corridas em `KE:104-235`, com 8 rodadas cada. O sweep papel × rota lê as rotas do OpenAPI e compara o corpo exato (`KE:297-367`) |
| T40 OpenAPI e README | ✅ | `openapi.json` está em sincronia (`TH/openapi-exportacao.e2e-spec.ts` verde) e o README descreve o ciclo de vida (`README.md:159-165`) |

---

## Spec-Anchored Acceptance Criteria

Legenda: ✅ evidência e2e no status **e** no corpo, com a mensagem literal quando a spec ou o design a define, e "nada gravado" nos caminhos de erro. As linhas de domínio vêm do `validation-dominio.md`, rodada 3, e o código de domínio não mudou desde `dad822e` (`git diff dad822e..HEAD -- src/domain src/core test/repositories test/factories` vazio).

### P1: Criação da campanha (CAMP-01…04)

| AC | Saída da spec | `file:line` + asserção | Result |
| -- | ------------- | ---------------------- | ------ |
| AC1 empresa não aprovada | 403 "Cadastro ainda não aprovado", nada gravado | POST: `CE:499-523`, com `body).toEqual({ statusCode: 403, message: 'Cadastro ainda não aprovado' })` e `campanha.count()).toBe(0)` para PENDENTE, REJEITADA e SUSPENSA. PATCH: `CE:1012-1030`. Capa: `CE:1296-1313`, sem arquivo nem objeto. Submissão: `CE:1562-1581`. S13 morto | ✅ / ⚠️ SP4 |
| AC2 cria em `RASCUNHO` | 201 com id interno e público | `CE:106-139`: `status).toBe(201)`, chaves exatamente `['id','idPublico']` e linha `status: 'RASCUNHO'`, `versao: 0` | ✅ |
| AC3 nome 3–80 com trim | 422 "O nome deve ter entre 3 e 80 caracteres" | Aceitos 3, 80 e 80 com espaços (`CE:229-235`). Recusados 2, 2 com espaços e 81, com `body).toEqual({ statusCode: 422, message })` e contagem 0 (`CE:287-297`, `:446-457`) | ✅ |
| AC4 descrição até 2000 | 422 "A descrição deve ter no máximo 2000 caracteres" | 2000 aceito (`CE:236-239`) e 2001 recusado (`CE:298-302`) | ✅ |
| AC5 valor por unidade | 0,01–999.999,99 com até 2 casas, senão 422 | Aceitos 0.01 e 999999.99 (`CE:240-253`). Recusados 0.00, 1000000.00 e 3 casas (`CE:303-326`), com a mensagem do design | ✅ / ⚠️ SP1 |
| AC6 percentual | 0,01–100,00 com até 2 casas, senão 422 | Aceitos 0.01 e 100.00 (`CE:254-267`). Recusados 0.00, 100.01 e 3 casas (`CE:327-350`) | ✅ / ⚠️ SP1 |
| AC7 valor do outro tipo | 422 "O Valor da regra deve corresponder à regra selecionada." | `CE:351-366` nas duas direções | ✅ |
| AC8 meta | mesmos limites, senão 422 | Aceitos (`CE:268-269`) e recusados (`CE:367-381`) | ✅ / ⚠️ SP1 |
| AC9 instituição e causa juntas | 422 "Informe exatamente uma beneficiada: instituição ou causa" | `CE:382-390` | ✅ |
| AC10 beneficiada indisponível | 422 "Instituição ou causa indisponível" | Instituição pendente, suspensa ou inexistente, e causa inativa (`CE:391-419`) | ✅ |
| AC11 fim ≤ início | 422 | Igual e anterior com "A data de fim deve ser posterior à data de início" (`CE:420-435`). Um dia depois é aceito (`CE:270-276`) | ✅ / ⚠️ SP1 |
| AC12 início no passado | aceito | `CE:210-227`: −400 dias → 201, e a data é gravada | ✅ |
| AC13 capa PNG/JPEG até 5 MB pelo conteúdo | 422 nos demais | PNG e JPEG → 204 (`CE:1090-1113`). 5 MB exatos → 204 (`CE:1115-1124`). 5 MB + 1 → 422 com a mensagem e nada gravado (`CE:1126-1139`). SVG e PDF chamado `.png` → 422 com a mensagem literal (`CE:1141-1167`). S15 e S16 mortos | ✅ |
| AC14 storage fora | 503 "Storage indisponível no momento.", campanha intacta | `CE:1185-1202`: `body).toEqual({ statusCode: 503, message: 'Storage indisponível no momento.' })`, capa anterior mantida e só um arquivo. S17 morto | ✅ |
| AC15 rascunho edita tudo | todos os campos | `CE:643-680`: nome, descrição, causa, regra, meta e vigência no corpo e na linha. Capa em `CE:1090-1113` | ✅ |
| AC16 id público imutável, distinto e não sequencial | UUID v4 diferente do id | `CE:141-155` (3 ids distintos, `toMatch(UUID_V4)`). Inalterado depois das edições (`CE:643-678`, `PE:221-232`, `PE:191-219`) | ✅ |
| AC17 consulta da dona | todos os campos, estado, motivo e pendência | `CE:527-563` (`toEqual` completo, com frações `'1.50'` e `'1000.00'`). Motivo em `CE:708-736`. Pendência em `CE:830-831`, com o detalhe igual à resposta, incluindo `alteracaoPendente` | ✅ |
| AC18 campanha de outra empresa | 404 sem revelar | GET com o corpo idêntico ao de inexistente (`CE:581-596`, `inexistente.text).toBe(alheia.text)`). PATCH em `CE:998-1010`, capa em `CE:1281-1294` e submissão em `CE:1547-1560`, todos sem gravar nada | ✅ |

### P1: Submissão e aprovação (CAMP-05, CAMP-06)

| AC | Saída da spec | `file:line` + asserção | Result |
| -- | ------------- | ---------------------- | ------ |
| AC1 submeter completo | `EM_ANALISE` + data-hora | `CE:1353-1383`: 204 com corpo vazio, `EM_ANALISE`, `submetidaEm` recente e igual no detalhe | ✅ |
| AC2 campos ausentes | 422 com todos os campos de uma vez | `CE:1399-1431`: `toEqual({ statusCode: 422, message: 'Preencha os campos obrigatórios…', errors: [4 campos] })`, nada gravado. S14 morto | ✅ |
| AC3 fim ≤ hoje | 422 | Ontem e hoje (`CE:1433-1457`), com "A data de fim deve ser posterior à data atual". Amanhã → 204 (`CE:1385-1397`) | ✅ / ⚠️ SP1 |
| AC4 beneficiada saiu do catálogo | 422 "Instituição ou causa indisponível" | Instituição suspensa e causa inativada depois de salvas (`CE:1459-1501`) | ✅ |
| AC5 edição em análise | 409 "Campanha em análise não pode ser editada" | PATCH de texto e de compromisso (`CE:682-706`). Capa (`CE:1236-1257`) | ✅ |
| AC6 fila | `EM_ANALISE` + alterações, da mais antiga para a mais recente, com os campos | `AE:97-176`: `toEqual` de 3 itens. A "Última" foi criada antes da alteração e submetida depois, o que distingue a ordem por submissão da ordem por criação. Rascunho e rejeitada ficam de fora. S8 morto | ✅ / ⚠️ SP2 |
| AC7 aprovar | `APROVADA`, autor e data-hora | `AE:217-236`: `decididoPor).toBe(admin)` e `decididoEm` recente. O valor exato fica no domínio (`U/aprovar-campanha.spec.ts:109`) | ✅ |
| AC8 apta ao selo | apta enquanto `APROVADA` | Não há rota HTTP nesta rodada: o design entrega a aptidão por `Campanha.estaAptaASelo()` a `selo-e-qrcode` (`design.md:21`, `:126`). A evidência é do domínio, `E/campanha.spec.ts:420-441` (4 estados) | ✅ (domínio; HTTP N/A por design) |
| AC9 beneficiada indisponível na aprovação | 409, estado inalterado | Instituição suspensa, inativada ou devolvida a pendente, e causa inativada (`AE:238-301`), com "A beneficiada não está mais disponível no catálogo", `linha).toEqual(antes)` e sem auditoria | ✅ |
| AC10 motivo < 20 | 422 "O motivo deve ter no mínimo 20 caracteres", estado inalterado | 20 com espaços → 204 (`AE:411-420`). 19 com espaços → 422 literal, sem e-mail nem auditoria (`AE:422-438`) | ✅ |
| AC11 rejeitar | `REJEITADA`, motivo gravado, e-mail na fila | `AE:370-409` (`transporte.mensagens).toEqual([{ para, template: CAMPANHA_REJEITADA, dados: { nomeCampanha, motivo } }])`). Falha de envio → `email_pendente` (`AE:455-471`). S27 morto | ✅ |
| AC12 editar `REJEITADA` | volta a `RASCUNHO` e preserva o motivo | `CE:708-736`, no corpo, no detalhe e na auditoria `CAMPANHA_REJEITADA → RASCUNHO` | ✅ |
| AC13 só as 4 transições | 409 "Operação não permitida para o estado atual" | Aprovar `RASCUNHO`/`APROVADA` (`AE:303-340`). Rejeitar `RASCUNHO` (`AE:473-489`). Submeter `EM_ANALISE`/`APROVADA`/`REJEITADA` (`CE:1503-1545`). Decidir alteração inexistente (`AE:668-685`, `:801-818`) | ✅ |
| AC14 não-admin | 403 sem alterar estado | Fila com EMPRESA e INSTITUICAO (`AE:189-203`). Decisões (`AE:349-360`, `:498-513`, `:694-708`, `:829-845`). Sweep de todas as rotas do admin com EMPRESA e INSTITUICAO, `body).toEqual({ statusCode: 403, message: 'Acesso negado', error: 'Forbidden' })` e estado idêntico (`KE:328-367`). S11 morto | ✅ |
| AC15 auditoria de toda transição | autor, anterior, novo, motivo, data-hora | Submetida `CE:1373-1382`. Aprovada `AE:227-233` (S30 morto). Rejeitada com motivo `AE:390-400`. Reaberta `CE:728-735` | ✅ |

### P1: Alteração de campanha aprovada (CAMP-07, CAMP-08)

| AC | Saída da spec | `file:line` + asserção | Result |
| -- | ------------- | ---------------------- | ------ |
| AC1 textos, capa e meta na hora | aplicados, segue `APROVADA`, sem pendência | `CE:738-763` (nome, descrição, meta e 0 alterações). Capa em `CE:1221-1234`. Na consulta pública: `PE:221-232` | ✅ |
| AC2 compromisso abre alteração | pendente; campanha `APROVADA` com os valores anteriores | `CE:765-858` para regra, beneficiada e vigência: corpo, detalhe, linha com os valores anteriores e uma alteração `EM_ANALISE` | ✅ |
| AC3 pública mostra o aprovado | só os valores anteriores | `PE:191-219` (antes e depois da aprovação). `PE:155-189` (`not.toContain('33.33')`) | ✅ |
| AC4 segunda alteração | 409 "Já existe uma alteração em análise" | `CE:860-881`, nada gravado e só uma alteração com 200 centavos | ✅ |
| AC5 mesmas validações | 422 | Valor, percentual, outro tipo, ambígua, suspensa, inativa, fim = início e fim = hoje (`CE:883-941`), todos com mensagem literal, sem alteração e sem auditoria. Fim amanhã → aberta (`CE:943-957`) | ✅ |
| AC6 aprovar alteração | aplica, registra autor e data-hora, encerra a pendência | `AE:574-618`: detalhe com o proposto, linha `PERCENTUAL 1205`, alteração `APROVADA` com `decididoPor` e `decididoEm`, fila vazia. Nova beneficiada e nova alteração liberada (`AE:620-643`) | ✅ |
| AC7 nova beneficiada indisponível | 409 sem aplicar | `AE:645-666`: `linha).toEqual(antes)`, `alteracoes()).toEqual([pendenteAntes])`, sem auditoria | ✅ |
| AC8 rejeitar alteração | descarta, mantém `APROVADA`, grava o motivo, e-mail | `AE:712-760` (`ALTERACAO_CAMPANHA_REJEITADA`). Fila de reenvio em `AE:762-779` (S28 morto). Motivo de 19 → 422 em `AE:781-799`. O 422 de forma (sem motivo) não tem teste nesta rota (S33) | ✅ / ❌ T55 (cobertura da rota) |
| AC9 id público imutável | igual em toda edição e alteração | `PE:191-232` consulta pelo mesmo `idPublico` depois de editar, abrir e aprovar a alteração. `CE:643-678` | ✅ |
| AC10 auditoria da alteração | autor, anteriores e novos, motivo, data-hora | Abertura `CE:846-856` (`compromissoAnterior`/`compromissoProposto`). Aprovação `AE:604-613` (`compromissoNovo`). Rejeição `AE:746-759` (`compromissoProposto` + `motivo`) | ✅ |

### P1: Consulta pública (CAMP-11)

| AC | Saída da spec | `file:line` + asserção | Result |
| -- | ------------- | ---------------------- | ------ |
| AC1 aprovada de empresa aprovada | 200 com os campos | `PE:116-136` (`toEqual` exato, sem sessão). Causa e percentual em `PE:138-153`. Capa em `PE:340-359` (`content-type` e `nosniff`). Os cabeçalhos CSP e `Content-Disposition` não são testados (S25, S32) | ✅ / ⚠️ SP2 / ❌ T54 (cabeçalhos) |
| AC2 404 idêntico | inexistente, rascunho, em análise, rejeitada, empresa não aprovada, malformado | `PE:249-303` compara `resposta.text).toBe(referencia)` nos 5 casos, mais id com acento e id interno. Suspensa em `PE:305-321`, com o estado intacto. Capa em `PE:361-401`. S21 e S23 mortos | ✅ |
| AC3 omitir id, motivo e pendência | ausentes | `PE:155-189` (chaves exatas e `not.toContain` de id, idPublico, motivo e valor pendente). S22 morto | ✅ |
| AC4 situação | `NAO_INICIADA` se o início é depois de hoje, senão `EM_ANDAMENTO` | `PE:234-247` (amanhã, hoje e ontem) | ✅ |

**Status**: ❌ **Há lacunas**. Os 47 critérios P1 têm evidência no valor da spec. Duas rotas não cumprem a cobertura por camada da matriz: a capa pública sem os cabeçalhos de segurança (T54) e a rejeição de alteração sem o 422 de forma (T55). SP1, SP2 e SP4 estão abertos e não bloqueiam.

---

## Edge Cases

- [x] Beneficiada sai do catálogo durante a análise → 409. Campanha: `AE:238-301`. Alteração: `AE:645-666`.
- [x] Beneficiada de campanha `APROVADA` sai do catálogo → a campanha segue publicada com a original: `PE:323-336`.
- [x] Empresa suspensa → 404 público sem mudar o estado: `PE:305-321` (dados) e `PE:375-388` (capa).
- [x] Dois admins ao mesmo tempo → 409 na segunda, e só uma decisão é gravada e auditada. Campanha: `KE:104-134`. Alteração: `KE:136-171`. O CAS determinístico está em `RE:501-529` (S1 morto).
- [x] Submissão dupla → uma só submissão: `KE:173-194` (concorrente) e `CE:1503-1520` (em sequência).
- [x] Edição concorrente com decisão → só uma aplica: `KE:196-235` (ver decisão 8).
- [x] HTML na descrição é devolvido como texto em JSON: `CE:565-579`.

---

## Gate Check

- **Gate command** (`tasks.md`, Build): `npx prisma migrate deploy`, depois `npm run build && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json`. Rodei na árvore real, com a saída de cada etapa num arquivo do scratchpad.

| Etapa | Exit | Resultado |
| ----- | ---- | --------- |
| `prisma migrate deploy` | 0 | nenhuma migration pendente |
| `npm run build` | 0 | ok |
| `tsc --noEmit` | 0 | ok |
| `eslint` | 0 | nenhum erro e nenhum aviso |
| `jest` (unit) | 0 | 64 suites, **602/602**, 0 skip |
| `jest` (e2e) | 0 | 35 suites, **542/542**, 0 skip, 82,9 s |

- **Contagens conferidas**:
  - Unit: 335 antes da feature, 600 antes da infra e **602** agora (+2 de `mailer-resiliente.spec.ts`).
  - E2e: **337 em 30 suites** antes da infra, valor que conferi rodando o worktree com `--json`. São 542 menos os 205 novos: `CE` 107, `AE` 34, `PE` 23, `KE` 15, `RE` 18 e 8 em `FE`. Agora são **542 em 35 suites**.
- **Integridade** (`git diff --numstat 79dd6bc..HEAD -- test src`): nenhum arquivo apagado. A única linha removida de teste pré-existente é a contagem da paridade, `TH/openapi-paridade.e2e-spec.ts:115-119`, que passou de 27 para 39 (5 + 5 + 2 rotas novas). A asserção `documentadas).toEqual(registradas)` segue intacta. `e2e-app.ts` só ganhou as duas tabelas. `FE` só ganhou linhas (+186/−0).
- **Domínio por amostragem**: o diff de `dad822e..HEAD` sobre `src/domain`, `src/core`, `test/repositories` e `test/factories` está vazio. Reexecutei P2 (`E/vigencia.ts:40`), que matou 7 testes, e N24 (`E/campanha.ts:270`), que matou 2, os mesmos números da rodada 3.

---

## Discrimination Sensor

**Profundidade**: P0 expandido (autorização, integridade de dados e concorrência). Criei o worktree com `git worktree add --detach <scratchpad>/wt-final HEAD` (`f869eef`), com `node_modules` como link simbólico e uma cópia do `.env`, que aponta o Postgres de teste em `:5433`. O baseline no worktree deu 542/542.

Um script aplicou cada mutante como substituição exata, exigindo uma única ocorrência da âncora, e rodou em sequência só as suites que cobrem o código (`--json`). Depois reverteu com `git checkout --` e conferiu o sha256 do arquivo restaurado (33 de 33 restaurados). Nenhuma morte veio de erro de compilação ou de suite quebrada. No fim, apaguei o link, removi o worktree com `git worktree remove --force` e rodei `git worktree prune`; `git worktree list` mostra só a árvore real.

**Isolamento**: o `git status --porcelain` da árvore real estava vazio antes e continuou vazio depois (o `diff` deu idêntico). Não usei `git stash`.

| # | Alvo | File:line | Mutação | Resultado (teste que matou) |
| - | ---- | --------- | ------- | --------------------------- |
| S1 | CAS | `src/infra/database/prisma/prisma-campanha-repository.ts:70` | `where: { id }`, sem `versao` | ✅ `RE:478`, `RE:501` |
| S2 | CAS | `prisma-campanha-repository.ts:71` | `versao` não incrementa | ✅ `RE:458`, `RE:501`, `RE:671` |
| S3 | Ordem decidida → pendente | `prisma-campanha-repository.ts:82-106` | blocos trocados | ✅ `RE:699` (P2002 no índice parcial) |
| S4 | Upsert da decidida | `prisma-campanha-repository.ts:88-93` | `update: {}` | ✅ `RE:612`, `RE:643`, `RE:501` |
| S5 | Mapper `@db.Date` (gravação) | `prisma-campanha-mapper.ts:96` | `T00:00:00.000+03:00` | ✅ `RE:188`, `RE:388` |
| S6 | Mapper `@db.Date` (leitura) | `prisma-campanha-mapper.ts:92` | data local (−03) | ✅ `RE:188`, `RE:388` |
| S7 | Só `EM_ANALISE` carregada | `prisma-campanha-repository.ts:17` + `prisma-campanha-mapper.ts:204` | include sem filtro e `find` aceitando qualquer status | ✅ `RE:612`, `RE:643`, `RE:671` |
| S8 | Fila no adaptador | `prisma-campanha-repository.ts:119` | `some: {}` | ✅ `RE:786` |
| S9 | Mapper decimal | `prisma-campanha-mapper.ts:85` | `padStart` → `padEnd` | ✅ `RE:188`, `RE:612`, `RE:699` |
| S10 | Papel da rota de empresa | `C/campanhas.controller.ts:177` | `@Roles(EMPRESA, ADMIN)` | ✅ `CE:483`, `CE:606`, `CE:1032` |
| S11 | Papel da rota de admin | `C/admin-campanhas.controller.ts:44` | `@Roles(ADMIN, EMPRESA)` | ✅ `KE:328` (o corpo do filtro não tem `error: 'Forbidden'`) |
| S12 | `@Public` | `C/campanhas-publicas.controller.ts:95` | removido | ✅ 22 testes de `PE` |
| S13 | 403 da spec (decisão 1) | `C/campanhas.controller.ts:407` | o ramo `NotAllowedError` nunca casa | ✅ `CE:499` (×3), `CE:1012`, `CE:1296`, `CE:1562` |
| S14 | `CamposPendentesError` → `errors` | `C/campanhas.controller.ts:416` | o ramo nunca casa | ✅ `CE:1399` (×2) |
| S15 | Multer 5 MB exatos | `C/campanhas.controller.ts:57` | sem `+1` | ✅ `CE:1115` |
| S16 | Multer +1 recusado | `C/campanhas.controller.ts:57` | `+2` | ✅ `CE:1126` (mensagem do multer ≠ mensagem do domínio) |
| S17 | 503 do PUT capa | `C/campanhas.controller.ts:323-329` | falha do storage vira 422 | ✅ `CE:1185` |
| S18 | Remoção da capa anterior | `C/campanhas.controller.ts:347-349` | não remove | ✅ `CE:1204` |
| S19 | Remoção da capa nova na falha | `C/campanhas.controller.ts:342` | não remove | ✅ `CE:1236`, `CE:1259`, `CE:1296` |
| S20 | 503 da capa pública | `C/campanhas-publicas.controller.ts:131` | `lerBytes(...).catch(() => null)` | ✅ `PE:403` |
| S21 | 404 idêntico da capa | `C/campanhas-publicas.controller.ts:134` | `NotFoundException('Campanha sem capa')` | ✅ `PE:390` |
| S22 | Omissão na pública | `C/campanhas-publicas.controller.ts:98-100` | devolve também o `idPublico` | ✅ `PE:116`, `PE:155` |
| S23 | Portão da capa pública | `C/campanhas-publicas.controller.ts:124-126` | ignora o 404 do caso de uso | ✅ `PE:361`, `PE:375` |
| S24 | Cabeçalho `nosniff` | `C/campanhas-publicas.controller.ts:119` | removido | ✅ `PE:340` (×2) |
| S25 | Cabeçalho CSP | `C/campanhas-publicas.controller.ts:120` | removido | ❌ **Sobreviveu** → T54 |
| S26 | `Content-Type` da capa | `C/campanhas-publicas.controller.ts:138` | `application/octet-stream` | ✅ `PE:340` (×2) |
| S27 | Fila de reenvio | `src/infra/mail/mailer-resiliente.ts:17` | sem `CAMPANHA_REJEITADA` | ✅ `mailer-resiliente.spec.ts:36`, `AE:455` |
| S28 | Fila de reenvio | `src/infra/mail/mailer-resiliente.ts:18` | sem `ALTERACAO_CAMPANHA_REJEITADA` | ✅ `mailer-resiliente.spec.ts:36`, `AE:762` |
| S29 | Acesso da dona à capa | `src/infra/arquivo/arquivo.service.ts:141-142` | sem `campanha?.empresa` | ✅ `FE:540` |
| S30 | Gravação da auditoria (no scratch, sobre o domínio) | `U/aprovar-campanha.ts:73` | `registrar` não é chamado | ✅ `AE:217` |
| S31 | M30 (no scratch, sobre o domínio) | `U/buscar-campanha-publica.ts:59` | sem checagem de UUID | ⚪ **Equivalente**: `id_publico` é `TEXT` (`migration.sql:16`), e `findByIdPublico('nao-e-um-uuid')` devolve `null` → o mesmo 404 (`PE:285-286`) |
| S32 | `Content-Disposition` | `C/campanhas-publicas.controller.ts:139` | `attachment` | ❌ **Sobreviveu** → T54 |
| S33 | 422 de forma da rejeição de alteração | `C/admin-campanhas.controller.ts:215` | sem `ZodValidationPipe(rejeicaoSchema)` | ❌ **Sobreviveu** → T55 |

**Result**: 33 injetados, 29 mortos, 3 sobreviventes (S25, S32, S33), 1 equivalente (S31). Sensor ❌ FAIL.

Os três sobreviventes são lacunas de teste, e o código de produção está certo. O padrão do projeto já testa os dois cabeçalhos na rota irmã (`TH/arquivo.e2e-spec.ts:198-212`). Já o 422 sem motivo só tem teste na rejeição de campanha (`AE:440-453`), e a rota irmã de alteração ficou sem.

---

## Decisões dos autores

| # | Decisão | Julgamento |
| - | ------- | ---------- |
| 1 | 403 com a mensagem da spec via `ForbiddenException` em `executar` | **Aceita.** As únicas fontes de `NotAllowedError` nos casos de uso que esse controller chama (`criar`, `editar`, `submeter` e `consultar`) passam por `AssegurarEmpresaAprovadaUseCase` (`U/assegurar-empresa-aprovada.ts:28`, com a mensagem fixa da spec). `ConsultarCampanhaDaEmpresaUseCase` nem tem esse erro no tipo. O 403 do `RolesGuard` não passa por aí: é `ForbiddenException` com "Acesso negado", conferido no sweep `KE:357-361`. Nada vaza hoje. S13 morto. Risco latente: um `NotAllowedError` futuro com outra mensagem sairia literal nesse caminho (follow-up F3) |
| 2 | `CamposPendentesError` → 422 com `errors: [{ campo, mensagem: 'Campo obrigatório' }]` | **Aceita.** É o mesmo formato do `ZodValidationPipe` (`CE:459-471`) e cumpre o design §Error Handling ("422 com `campos`… em `errors`"). S14 morto |
| 3 | Capa ausente no PUT → 422 | **Aceita.** O formato é o do pipe (`CE:1169-1183`). Para empresa não aprovada, a ordem dá 422 antes de 403 (ver SP4) |
| 4 | `AssegurarBeneficiadaDisponivelUseCase` registrado no `HttpModule` | **Aceita.** É exigido pela DI de criar, editar, submeter e das aprovações. Tem um único registro (`src/infra/http/http.module.ts:102`) |
| 5 | Helper `forcarEstado` | **Aceita.** Só é usado sobre campanhas completas (`CE:635`, `:692`, `:713`, `:1226`, `:1243`, `:1529`), para isolar uma rota da empresa. Os fluxos reais (submeter → aprovar/rejeitar) são cobertos pelas rotas em `AE`, `PE` e `KE`. Não incrementar a `versao` é inofensivo, porque cada teste relê o estado |
| 6 | M30: formato barrado no caso de uso; `id_publico` TEXT | **Aceita.** S31 confirma no Postgres que o mutante é equivalente: sem a checagem, o TEXT devolve `null` e o 404 sai idêntico. A checagem só economiza uma consulta. Fecha o follow-up 2 do `validation-dominio.md` |
| 7 | Troca de capa concorrente pode deixar uma capa órfã | **Confirmado e não bloqueante.** A sequência concreta: R1 e R2 leem a capa X pela consulta (`C/campanhas.controller.ts:309-311`). R1 grava A e remove X. R2 relê a campanha dentro de `EditarCampanhaUseCase`, que agora tem a capa A, passa no CAS, grava B e tenta remover X de novo (só um warn no log). **A fica órfã** no banco e no storage. Nenhum dado servido fica errado, porque a unique de `capa_arquivo_id` e a FK continuam íntegras. Follow-up F1 |
| 8 | Corrida edição × aprovação aceita 200+204 ou 409 | **Aceita.** Os dois sucessos só acontecem quando as operações saem serializadas, e então cada uma encontra o estado esperado, como pede o edge case. O invariante que importa ("o compromisso aprovado não é sobrescrito": `regraValorCentavos` 200 sempre que a aprovação deu 204) está em `KE:224-233`. O CAS determinístico está provado em `RE:501-529` (S1 e S2 mortos) |
| 9 | Submissão AC8 (apta ao selo) sem rota | **Aceita.** O design entrega a aptidão como método de domínio para `selo-e-qrcode` (`design.md:21`, `:126`), e a evidência unit é `E/campanha.spec.ts:420-441`. A parte do Independent Test que diz "aparece apta à solicitação de selo" só ganha superfície HTTP na feature `selo-e-qrcode` |
| 10 | Auditoria de alteração com `compromissoNovo` e `compromissoProposto` | **Aceita como está.** Os e2e conferem cada chave no evento certo (`CE:851-854`, `AE:608-611`, `AE:750-757`). Uniformizar é trabalho de domínio e cabe ao grupo (F4, já em `STATE.md`) |
| 11 | Done-when da T29 emendada (P13 vai para o design, JSDoc fica como follow-up) | **Aceita.** O AD-021 proíbe o agente de editar `src/domain/**`. A regra está em `design.md:183`, a idempotência (N6) está provada em `RE:740-756`, e o JSDoc ficou registrado como follow-up do grupo no `STATE.md` |

---

## Code Quality

| Princípio | Status | Nota |
| --------- | ------ | ---- |
| Nada de domínio no diff da infra | ✅ | `git diff --stat 79dd6bc..HEAD -- src/domain src/core test/repositories test/factories` vazio (AD-021) |
| Aderência ao design | ✅ | Rotas, verbos, status e DTOs batem com `design.md:212-216`. O `salvar` segue `design.md:183,208`. O mapper converte datas sem fuso (`design.md:330`). A capa pública passa pelo caso de uso antes de servir os bytes (`design.md:332`), e a remoção da capa antiga e da nova segue `design.md:333` |
| Código mínimo e mudanças cirúrgicas | ✅ | Só arquivos de infra, testes, schema, README e OpenAPI. As mudanças em arquivos existentes são aditivas (`arquivo.service.ts` +5/−2, `http.module.ts` +28, `database.module.ts` +4, `mailer-resiliente.ts` +2) |
| Padrões existentes | ✅ | `carregarAdmin` igual ao de `admin-instituicoes.controller.ts:107`, `idDaEmpresaDe` no estilo de `beneficiadas`, e `@ApiErro`/`@ApiProtegida`/`esquemaOpenApi` em todas as rotas. A capa pública copia os cabeçalhos de `C/arquivo.controller.ts:59-60`, mas não copia o teste deles (T54) nem a documentação dos cabeçalhos no OpenAPI (F2) |
| Spec-anchored outcome check | ⚠️ | 47/47 com evidência. Mensagens literais conferidas com `toEqual` no corpo inteiro |
| Cobertura por camada (rotas: happy + edge + 401/403/404/409/422/503) | ❌ | Cumprida em 11 das 12 rotas novas, e o sweep cobre 401 e 403 em todas. Faltam os cabeçalhos da capa pública (T54) e o 422 de forma em `POST /admin/campanhas/:id/alteracao/rejeicao` (T55) |
| Todo teste mapeia para AC, edge case ou Done-when | ✅ | Nenhum teste órfão. "Data inexistente" e "fora do formato" (`CE:436-445`) mapeiam para Criação AC11 e para `DataInvalidaError` do design. `buscarAcesso` mapeia para a T31 |
| Guidelines documentadas | ✅ | Nenhuma no projeto, então apliquei os strong defaults da Test Coverage Matrix de `tasks.md` |
| Senior engineer aprovaria? | ✅ com ressalvas | Sim. A suíte e2e é forte: compara corpo exato, verifica "nada gravado" contra a linha inteira e varre papel × rota a partir do OpenAPI. As ressalvas são as duas fix tasks e os follow-ups F1–F3 |

---

## Spec-Precision Gaps

| # | AC | Problema | Estado |
| - | -- | -------- | ------ |
| SP1 | Criação AC5, AC6, AC8, AC11; Submissão AC3 | A spec diz só "HTTP 422", e as mensagens vêm do design | Aberto, não bloqueia (L-011) |
| SP2 | Submissão AC6 ("empresa"); Consulta AC1 ("nome da empresa", "imagem de capa quando houver") | Termo guarda-chuva, que o design resolve como `nomeFantasia` e `temCapa` | Aberto, não bloqueia (L-019) |
| SP4 | Criação AC1 × PUT capa | A spec não define se o 403 "Cadastro ainda não aprovado" vence o 422 de forma e o 503 de dependência. O controller consulta a campanha, valida o arquivo (422), faz o upload (503 se o storage cair) e só então chama o caso de uso com o portão (`C/campanhas.controller.ts:309-339`). Uma empresa não aprovada recebe 422 sem arquivo e 503 com o storage fora, e não o 403. Nada é gravado: a capa nova é descartada no 403 (`CE:1296-1313`). A precedência "forma antes do portão" já existe no projeto, porque o `ZodValidationPipe` roda antes do handler | Novo, não bloqueia |

---

## Fix Plans

### T54: Capa pública — testar CSP e `Content-Disposition` (Minor)

- **Root cause**: `C/campanhas-publicas.controller.ts:120,139` define `Content-Security-Policy: default-src 'none'; sandbox` e `Content-Disposition: inline`, mas `PE:340-359` testa só `content-type` e `nosniff`. S25 e S32 sobrevivem. A rota irmã testa os dois cabeçalhos (`TH/arquivo.e2e-spec.ts:208-211`).
- **Fix task**:
  - **What**: no teste da capa publicada, acrescentar `expect(resposta.headers['content-security-policy']).toBe("default-src 'none'; sandbox")` e `expect(resposta.headers['content-disposition']).toMatch(/^inline/)`. Opcional, junto: documentar os dois cabeçalhos na resposta 200 do OpenAPI, como faz `C/arquivo.controller.ts:21-27` (F2).
  - **Where**: `test/http/campanhas-publicas.e2e-spec.ts` (e, se fizer a parte opcional, `src/infra/http/controllers/campanhas-publicas.controller.ts` + `openapi.json`).
  - **Depends on**: None
  - **Requirement**: CAMP-11
  - **Autor**: 🤖 agente (infra)
  - **Done when**: [ ] os dois cabeçalhos testados no PNG e no JPEG; [ ] S25 e S32 morrem quando reaplicados; [ ] gate `full` verde.
  - **Tests**: e2e · **Gate**: full · **Commit**: `test(api): cabeçalhos de segurança da capa pública de campanha`
- **Priority**: Minor

### T55: Rejeição de alteração — 422 sem motivo (Minor)

- **Root cause**: `POST /admin/campanhas/:id/alteracao/rejeicao` valida a forma com `ZodValidationPipe(rejeicaoSchema)` (`C/admin-campanhas.controller.ts:215`), mas só a rejeição de campanha testa o corpo sem motivo (`AE:440-453`). S33 sobrevive.
- **Fix task**:
  - **What**: e2e `sem motivo → 422 { statusCode: 422, message: 'Campo obrigatório', errors: [{ campo: 'motivo', mensagem: 'Campo obrigatório' }] }`, com a pendência mantida (`EM_ANALISE`), `linha).toEqual(antes)` e nenhum e-mail.
  - **Where**: `test/http/admin-campanhas.e2e-spec.ts`, no `describe('POST /admin/campanhas/:id/alteracao/rejeicao')`.
  - **Depends on**: None
  - **Requirement**: CAMP-08
  - **Autor**: 🤖 agente (infra)
  - **Done when**: [ ] teste com o corpo exato e "nada gravado"; [ ] S33 morre quando reaplicado; [ ] gate `full` verde.
  - **Tests**: e2e · **Gate**: full · **Commit**: `test(api): rejeição de alteração sem motivo`
- **Priority**: Minor

Nenhuma das duas exige código de domínio.

---

## Follow-ups não bloqueantes

1. **F1, capa órfã (decisão 7).** A capa anterior sai de uma leitura separada do `salvar`. Duas soluções possíveis: (a) uma varredura periódica de `arquivo` do tipo `IMAGEM_CAMPANHA` sem `campanha`; (b) o `EditarCampanhaUseCase` devolver a capa que substituiu, o que é domínio e fica com o grupo.
2. **F2, OpenAPI da capa pública.** Documentar os cabeçalhos da resposta como `C/arquivo.controller.ts:21-27`. Pode entrar na T54.
3. **F3, `executar`.** Restringir o ramo a `NotAllowedError` com a mensagem do portão, ou documentar que um `NotAllowedError` novo vaza a própria mensagem. Hoje não há segunda fonte.
4. **F4, domínio (grupo).** Já estão no `STATE.md`: o JSDoc P13 em `CampanhaRepository.salvar`, a chave única de compromisso nas auditorias de alteração e `consoleError.mockRestore()` em `finally`.
5. **SP4.** Fixar na spec a precedência entre 403, 422 de forma e 503, ou mover o upload da capa para depois do portão. A segunda saída exige outra porta de entrada no caso de uso, o que é domínio.

---

## Requirement Traceability Update

Não editei o `spec.md`. Este é o status proposto para o orquestrador aplicar:

| Requirement | Status anterior | Status proposto |
| ----------- | --------------- | --------------- |
| CAMP-01 | Domínio verificado · infra em Tasks | ✅ Verified |
| CAMP-02 | Domínio verificado · infra em Tasks | ✅ Verified |
| CAMP-03 | Domínio verificado · infra em Tasks | ✅ Verified |
| CAMP-04 | Domínio verificado · infra em Tasks | ✅ Verified |
| CAMP-05 | Domínio verificado · infra em Tasks | ✅ Verified |
| CAMP-06 | Domínio verificado · infra em Tasks | ✅ Verified |
| CAMP-07 | Domínio verificado · infra em Tasks | ✅ Verified |
| CAMP-08 | Domínio verificado · infra em Tasks | ❌ Needs Fix (T55, só teste) |
| CAMP-11 | Domínio verificado · infra em Tasks | ❌ Needs Fix (T54, só teste) |
| CAMP-09, CAMP-10 | Deferred | Deferred |

---

## Summary

**Overall**: ❌ Not Ready, por pouco. A implementação está correta, e todos os 47 ACs P1 e os 7 edge cases têm evidência e2e ou unit no valor da spec. Faltam duas asserções e2e para matar os três sobreviventes.

**Spec-anchored check**: 47/47 ACs P1 com evidência. SP1, SP2 e SP4 estão abertos e não bloqueiam. Há duas lacunas de cobertura por rota (T54, T55).
**Sensor**: 33 injetados, 29 mortos, 3 sobreviventes (S25, S32, S33), 1 equivalente (S31).
**Gate**: build, tsc, eslint e unit 602/602 ok; e2e 542/542 em 35 suites. Nenhum teste apagado ou enfraquecido.
**Lições** (candidatas, via `lessons.py`):
- **L-031**: S25 e S32, cabeçalhos copiados sem as asserções.
- **L-032**: S33, rota irmã que reusa o DTO sem o próprio 422.
- **L-033**: SP4, precedência entre 403, 422 e 503.

Nenhuma repete uma lição existente, então nenhuma foi promovida.

**O que funciona**:
- O CAS por `versao`, a ordem decidida → pendente sob o índice parcial e o upsert idempotente.
- O mapper de datas sem fuso, que lê só a alteração em análise.
- Papéis e 401/403 em todas as rotas, o 403 com a mensagem da spec, o 422 com `errors` e o multer no limite exato.
- O 503 de storage nas duas rotas de capa, o 404 idêntico da consulta pública, as omissões do JSON público e o e-mail na fila de reenvio.
- A auditoria de todas as transições, as corridas de decisão e de submissão, e o sweep papel × rota.

**Próximos passos**:
1. O orquestrador despacha T54 e T55 para um worker 🤖.
2. Este Verifier reverifica S25, S32 e S33 na rodada 2 (iteração 1 de 3).
3. O orquestrador atualiza a rastreabilidade e o `STATE.md`.

**validate_state**: `python3 .claude/skills/tlc-spec-driven/scripts/validate_state.py campanhas` saiu com exit 1. É o esperado com o veredito FAIL: a feature não está pronta até a rodada 2.
