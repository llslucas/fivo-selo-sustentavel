**Verdict**: FAIL

# Campanhas — Validação final, rodada 2 (P1 do `api`)

**Veredito**: ❌ **FAIL**. A Fase 9b cumpriu o que prometeu: T54 e T55 só acrescentam asserções e um teste, e S25, S32 e S33 agora morrem. O gate build está verde, com unit 602/602 e e2e 543/543 em 35 suites. Mas, dos 13 mutantes novos desta rodada, 3 sobreviveram (S34, S45 e S46), e os três apontam a mesma lacuna de teste: nenhum e2e prova que `POST /campanhas` e `PATCH /campanhas/:id` descartam chaves fora do DTO. O código de produção está certo, porque o `ZodValidationPipe` com `z.object` remove as chaves desconhecidas. Só que os controllers espalham o corpo validado por cima dos ids derivados da sessão (`{ empresaId, ...dados }`), então esse descarte é a única barreira entre o corpo da requisição e a escrita em campanha de outra empresa. Uma sonda em scratch mostrou que, sem o pipe ou com o schema permissivo, a empresa B renomeia a campanha da empresa A e cria campanhas em nome dela, e a suíte inteira continua verde. Abro a T56 (Major, só teste, sem domínio).

**Data**: 2026-10-27
**Spec**: `.specs/features/campanhas/spec.md`
**Diff range**:
- Feature: `397f8bc..04a22f6`.
- Infra: `79dd6bc..04a22f6`.
- Esta rodada: `53b95b9..04a22f6`, com `63decd8` (abertura da Fase 9b), `7f62ad1` (T54) e `04a22f6` (T55).
- O domínio fica em `397f8bc..dad822e`, validado em `validation-dominio.md`, rodada 3, com PASS.

**Verifier**: sub-agente independente (autor ≠ verificador). Não escrevi código desta feature e trabalhei só lendo `src/` e `test/`. Escrevi apenas este arquivo e a lição.
**Escopo**: CAMP-01…08 e CAMP-11. Ficam de fora CAMP-09, CAMP-10 e o `web`. Não houve UAT, porque a feature é só backend.
**Iteração**: re-verificação 1 de 3 (validate.md §8).

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

Todas as linhas citadas valem para `04a22f6`. Por causa das inserções da rodada, as referências de `AE` a partir da linha 801 andaram +19, e as de `PE` a partir da 355 andaram +4, em relação à rodada 1.

---

## O que mudou nesta rodada

`git diff --stat 53b95b9..HEAD` mostra só três arquivos: `tasks.md` (+51), `AE` (+19) e `PE` (+4). Não há nenhuma linha removida (`--numstat` dá 0 deleções nos três). `git diff 53b95b9..HEAD -- src openapi.json` vem vazio: o código de produção é o mesmo da rodada 1, então as linhas de AC não ligadas a T54/T55 seguem valendo, com as linhas renumeradas.

| Task | Done-when | Evidência |
| ---- | --------- | --------- |
| T54 | CSP = `default-src 'none'; sandbox` e `content-disposition` casando `/^inline/` no PNG e no JPEG | ✅ `PE:355-358`, dentro do `it.each` de PNG e JPEG (`PE:340-363`): `expect(resposta.headers['content-security-policy']).toBe("default-src 'none'; sandbox")` e `expect(resposta.headers['content-disposition']).toMatch(/^inline/)`. As asserções anteriores (`content-type`, `nosniff`, bytes e `temCapa`) continuam lá |
| T54 | S25 e S32 morrem | ✅ S25 e S32 reaplicados: cada um derrubou os 2 casos de `PE:340` (ver sensor) |
| T55 | Sem motivo → 422 com o corpo exato, pendência `EM_ANALISE`, linha inalterada, nenhum e-mail | ✅ `AE:801-818`: `rejeitarAlteracao(id, {})`, `status).toBe(422)`, `body).toEqual({ statusCode: 422, message: 'Campo obrigatório', errors: [{ campo: 'motivo', mensagem: 'Campo obrigatório' }] })`, `linha(id)).toEqual(antes)`, `alteracoes())[0].status).toBe('EM_ANALISE')` e `transporte.mensagens).toEqual([])` |
| T55 | S33 morre | ✅ S33 reaplicado: `AE:801` falha |
| T54, T55 | Gate `full` verde | ✅ Rodei o gate build completo (abaixo) |

Nada foi removido ou enfraquecido: o teste novo da T55 é idêntico em estrutura ao de 19 caracteres (`AE:781-799`), e as asserções da T54 foram somadas às existentes.

---

## Task Completion

Conferi cada Done-when no código, sem confiar nos checkboxes. As linhas T28–T40 vêm da rodada 1, já com a numeração de HEAD, e o código delas não mudou.

| Task | Status | Evidência |
| ---- | ------ | --------- |
| T28 schema e migration | ✅ | Os modelos e enums de `prisma/schema.prisma` batem com o design §Data Models. `id_publico` e `capa_arquivo_id` são únicos (`prisma/migrations/20261028003809_campanhas/migration.sql:62`, `:65`) e as datas usam `@db.Date`. CHECK XOR e índice parcial em `migration.sql:96-107`. `prisma migrate deploy` desta rodada: nenhuma migration pendente |
| T29 adaptador e mapper | ✅ | CAS em `src/infra/database/prisma/prisma-campanha-repository.ts:69-76`. Decidida antes de pendente, as duas por upsert (`:82-106`). O mapper carrega só `EM_ANALISE` (`:16-18`, `prisma-campanha-mapper.ts:203-205`). Os e2e estão em `RE:188-831` |
| T30 templates enfileiráveis | ✅ | `src/infra/mail/mailer-resiliente.ts:17-18`, com teste em `src/infra/mail/mailer-resiliente.spec.ts:36-59` |
| T31 `ArquivoService` capa | ✅ | `FE:388-472`, com dono × não-dono em `FE:540-561` |
| T32 POST e GET | ⚠️ | `C/campanhas.controller.ts:213-246`. Cobre 201, 401, 403 e 422 por limite (`CE:106-523`), mais o GET da dona e o 404 de terceiros (`CE:527-596`). Falta provar que o corpo não injeta `empresaId` (S45 → T56) |
| T33 PATCH | ⚠️ | `C/campanhas.controller.ts:268-284`. Os testes de `CE:643-1010` cobrem estados, 409, 422 de domínio e 404. Faltam o 422 de forma e a prova de que o corpo não injeta `empresaId`/`campanhaId` (S34, S46 → T56) |
| T34 PUT capa | ✅ | `CE:1090-1279` (5 MB, +1, SVG/PDF, 503, troca e falha no `salvar`). S36 morto |
| T35 submissão | ✅ | `CE:1353-1520`. S43 morto |
| T36 fila e decisões | ✅ | `AE:97-471`. S38 e S40 mortos |
| T37 decisões de alteração | ✅ | `AE:574-837`, agora com o 422 sem motivo em `AE:801-818`. S33, S37 e S44 mortos |
| T38 consulta pública | ✅ | `PE:116-411`, agora com CSP e `Content-Disposition` em `PE:355-358`. S25, S32 e S41 mortos |
| T39 concorrência e papéis | ✅ | `KE:104-367` |
| T40 OpenAPI e README | ✅ | `TH/openapi-exportacao.e2e-spec.ts` verde, `README.md:159-165` |
| T54 | ✅ | Ver acima |
| T55 | ✅ | Ver acima |

---

## Spec-Anchored Acceptance Criteria

Legenda: ✅ evidência e2e no status **e** no corpo, com a mensagem literal quando a spec ou o design a define, e "nada gravado" nos caminhos de erro. As linhas de domínio vêm do `validation-dominio.md`, rodada 3. O código de domínio não mudou desde `dad822e`.

### P1: Criação da campanha (CAMP-01…04)

| AC | Saída da spec | `file:line` + asserção | Result |
| -- | ------------- | ---------------------- | ------ |
| AC1 empresa não aprovada | 403 "Cadastro ainda não aprovado", nada gravado | POST: `CE:499-523`, com `body).toEqual({ statusCode: 403, message: 'Cadastro ainda não aprovado' })` e `campanha.count()).toBe(0)` para PENDENTE, REJEITADA e SUSPENSA. PATCH: `CE:1012-1030`. Capa: `CE:1296-1313`. Submissão: `CE:1562-1581`. S13 morto | ✅ / ⚠️ SP4 |
| AC2 cria em `RASCUNHO` | 201 com id interno e público | `CE:106-139`: `status).toBe(201)`, chaves exatamente `['id','idPublico']`, linha `status: 'RASCUNHO'`, `versao: 0` | ✅ |
| AC3 nome 3–80 com trim | 422 "O nome deve ter entre 3 e 80 caracteres" | Aceitos em `CE:229-235`. Recusados com `body).toEqual({ statusCode: 422, message })` e contagem 0 em `CE:287-297` e `:446-457` | ✅ |
| AC4 descrição até 2000 | 422 "A descrição deve ter no máximo 2000 caracteres" | `CE:236-239` (aceito) e `CE:298-302` (recusado) | ✅ |
| AC5 valor por unidade | 0,01–999.999,99 com até 2 casas, senão 422 | `CE:240-253` (aceitos) e `CE:303-326` (recusados) | ✅ / ⚠️ SP1 |
| AC6 percentual | 0,01–100,00 com até 2 casas, senão 422 | `CE:254-267` e `CE:327-350` | ✅ / ⚠️ SP1 |
| AC7 valor do outro tipo | 422 "O Valor da regra deve corresponder à regra selecionada." | `CE:351-366` nas duas direções | ✅ |
| AC8 meta | mesmos limites, senão 422 | `CE:268-269` e `CE:367-381` | ✅ / ⚠️ SP1 |
| AC9 instituição e causa juntas | 422 "Informe exatamente uma beneficiada: instituição ou causa" | `CE:382-390` | ✅ |
| AC10 beneficiada indisponível | 422 "Instituição ou causa indisponível" | `CE:391-419` | ✅ |
| AC11 fim ≤ início | 422 | `CE:420-435` ("A data de fim deve ser posterior à data de início"), com um dia depois aceito em `CE:270-276` | ✅ / ⚠️ SP1 |
| AC12 início no passado | aceito | `CE:210-227` | ✅ |
| AC13 capa PNG/JPEG até 5 MB pelo conteúdo | 422 nos demais | `CE:1090-1167`. S15 e S16 mortos | ✅ |
| AC14 storage fora | 503 "Storage indisponível no momento.", campanha intacta | `CE:1185-1202`. S17 morto | ✅ |
| AC15 rascunho edita tudo | todos os campos | `CE:643-680`, capa em `CE:1090-1113` | ✅ |
| AC16 id público imutável, distinto e não sequencial | UUID v4 diferente do id | `CE:141-155`, `CE:643-678`, `PE:191-232` | ✅ |
| AC17 consulta da dona | todos os campos, estado, motivo e pendência | `CE:527-563`, motivo em `CE:708-736`, pendência em `CE:830-831` | ✅ |
| AC18 campanha de outra empresa | 404 sem revelar | Pelo parâmetro da rota: GET `CE:581-596` (`inexistente.text).toBe(alheia.text)`), PATCH `CE:998-1010`, capa `CE:1281-1294`, submissão `CE:1547-1560`, todos sem gravar nada. **Pelo corpo da requisição: sem evidência.** Nenhum teste envia `empresaId`/`campanhaId` no corpo do PATCH ou `empresaId` no do POST. A sonda mostrou que, sem o descarte de chaves do zod, a empresa B edita a campanha de A e cria campanhas em nome de A, e a suíte continua verde (S34, S45, S46) | ✅ (rota) / ❌ T56 (corpo) |

### P1: Submissão e aprovação (CAMP-05, CAMP-06)

| AC | Saída da spec | `file:line` + asserção | Result |
| -- | ------------- | ---------------------- | ------ |
| AC1 submeter completo | `EM_ANALISE` + data-hora | `CE:1353-1383`: 204, `EM_ANALISE`, `submetidaEm` recente, auditoria com `usuarioId` da dona (S43 morto) | ✅ |
| AC2 campos ausentes | 422 com todos os campos de uma vez | `CE:1399-1431`. S14 morto | ✅ |
| AC3 fim ≤ hoje | 422 | `CE:1433-1457` ("A data de fim deve ser posterior à data atual"), amanhã → 204 em `CE:1385-1397` | ✅ / ⚠️ SP1 |
| AC4 beneficiada saiu do catálogo | 422 "Instituição ou causa indisponível" | `CE:1459-1501` | ✅ |
| AC5 edição em análise | 409 "Campanha em análise não pode ser editada" | `CE:682-706`, capa em `CE:1236-1257` | ✅ |
| AC6 fila | `EM_ANALISE` + alterações, da mais antiga para a mais recente, com os campos | `AE:97-176` (`toEqual` de 3 itens, ordem por submissão ≠ criação). S8 e S38 mortos | ✅ / ⚠️ SP2 |
| AC7 aprovar | `APROVADA`, autor e data-hora | `AE:217-236`; valor exato no domínio em `U/aprovar-campanha.spec.ts:109` | ✅ |
| AC8 apta ao selo | apta enquanto `APROVADA` | Sem rota nesta rodada, por design (`design.md:21`, `:126`). Evidência de domínio em `E/campanha.spec.ts:420-441` | ✅ (domínio; HTTP N/A por design) |
| AC9 beneficiada indisponível na aprovação | 409, estado inalterado | `AE:238-301`, com `linha).toEqual(antes)` e sem auditoria. S40 morto | ✅ |
| AC10 motivo < 20 | 422 "O motivo deve ter no mínimo 20 caracteres", estado inalterado | `AE:411-438`, e sem motivo em `AE:440-453` | ✅ |
| AC11 rejeitar | `REJEITADA`, motivo gravado, e-mail na fila | `AE:370-409`, falha de envio em `AE:455-471`. S27 morto | ✅ |
| AC12 editar `REJEITADA` | volta a `RASCUNHO` e preserva o motivo | `CE:708-736`, com auditoria de autor (S42 morto) | ✅ |
| AC13 só as 4 transições | 409 "Operação não permitida para o estado atual" | `AE:303-340`, `AE:473-489`, `CE:1503-1545`, `AE:668-685`, `AE:820-837` | ✅ |
| AC14 não-admin | 403 sem alterar estado | `AE:189-203`, `AE:349-360`, `:498-513`, `:694-708`, `:848-864`. Sweep em `KE:328-367` (S11 e S37 mortos) | ✅ |
| AC15 auditoria de toda transição | autor, anterior, novo, motivo, data-hora | `CE:1373-1382`, `AE:227-233`, `AE:390-400`, `CE:728-735`. S30, S42 e S43 mortos | ✅ |

### P1: Alteração de campanha aprovada (CAMP-07, CAMP-08)

| AC | Saída da spec | `file:line` + asserção | Result |
| -- | ------------- | ---------------------- | ------ |
| AC1 textos, capa e meta na hora | aplicados, segue `APROVADA`, sem pendência | `CE:738-763`, capa em `CE:1221-1234`, pública em `PE:221-232` | ✅ |
| AC2 compromisso abre alteração | pendente; campanha `APROVADA` com os valores anteriores | `CE:765-858` | ✅ |
| AC3 pública mostra o aprovado | só os valores anteriores | `PE:191-219`, `PE:155-189` | ✅ |
| AC4 segunda alteração | 409 "Já existe uma alteração em análise" | `CE:860-881`. S39 morto | ✅ |
| AC5 mesmas validações | 422 | `CE:883-957` | ✅ |
| AC6 aprovar alteração | aplica, registra autor e data-hora, encerra a pendência | `AE:574-643`. S44 morto | ✅ |
| AC7 nova beneficiada indisponível | 409 sem aplicar | `AE:645-666` | ✅ |
| AC8 rejeitar alteração | descarta, mantém `APROVADA`, grava o motivo, e-mail | `AE:712-760`, fila de reenvio `AE:762-779` (S28), motivo de 19 → 422 `AE:781-799`, **sem motivo → 422 `AE:801-818` (T55, S33 morto)** | ✅ |
| AC9 id público imutável | igual em toda edição e alteração | `PE:191-232`, `CE:643-678` | ✅ |
| AC10 auditoria da alteração | autor, anteriores e novos, motivo, data-hora | `CE:846-856`, `AE:604-613`, `AE:746-759` | ✅ |

### P1: Consulta pública (CAMP-11)

| AC | Saída da spec | `file:line` + asserção | Result |
| -- | ------------- | ---------------------- | ------ |
| AC1 aprovada de empresa aprovada | 200 com os campos | `PE:116-153`. Capa em `PE:340-363`: `content-type`, `nosniff`, **CSP `default-src 'none'; sandbox` e `content-disposition` `/^inline/` (T54, `PE:355-358`)**, bytes. S24, S25, S26, S32 e S41 mortos | ✅ / ⚠️ SP2 |
| AC2 404 idêntico | inexistente, rascunho, em análise, rejeitada, empresa não aprovada, malformado | `PE:249-321` (`resposta.text).toBe(referencia)`). Capa: `PE:365-405`. S21 e S23 mortos | ✅ |
| AC3 omitir id, motivo e pendência | ausentes | `PE:155-189`. S22 morto | ✅ |
| AC4 situação | `NAO_INICIADA` se o início é depois de hoje, senão `EM_ANDAMENTO` | `PE:234-247` | ✅ |

**Status**: ❌ **Há lacuna**. 46 dos 47 ACs P1 estão cobertos no valor da spec. A exceção é a Criação AC18, coberta pelo parâmetro da rota mas não pelo corpo da requisição em POST e PATCH (T56). As lacunas da rodada 1 (CAMP-08 AC8 e CAMP-11 AC1) estão fechadas. SP1, SP2 e SP4 seguem abertos e não bloqueiam.

---

## Edge Cases

Sem mudança em relação à rodada 1, com as linhas atualizadas:

- [x] Beneficiada sai do catálogo durante a análise → 409: `AE:238-301` (campanha) e `AE:645-666` (alteração).
- [x] Beneficiada de campanha `APROVADA` sai do catálogo → segue publicada com a original: `PE:323-336`.
- [x] Empresa suspensa → 404 público sem mudar o estado: `PE:305-321` e `PE:379-392` (capa).
- [x] Dois admins ao mesmo tempo → 409 na segunda: `KE:104-171`. O CAS determinístico está em `RE:501-529`.
- [x] Submissão dupla → uma só submissão: `KE:173-194` e `CE:1503-1520`.
- [x] Edição concorrente com decisão → só uma aplica: `KE:196-235`.
- [x] HTML na descrição devolvido como texto: `CE:565-579`.

---

## Gate Check

- **Gate command** (`tasks.md`, Build): `npx prisma migrate deploy`, depois `npm run build && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json`. Rodei na árvore real, em `04a22f6`, com o Postgres de teste em `:5433`.

| Etapa | Exit | Resultado |
| ----- | ---- | --------- |
| `prisma migrate deploy` | 0 | nenhuma migration pendente |
| `npm run build` | 0 | ok |
| `tsc --noEmit` | 0 | ok |
| `eslint` | 0 | nenhum erro e nenhum aviso |
| `jest` (unit) | 0 | 64 suites, **602/602**, 0 skip |
| `jest` (e2e) | 0 | 35 suites, **543/543**, 0 skip, 82,4 s |

- **Contagens**: unit seguem em 602, sem mudança, porque a rodada não tocou unit. E2e passaram de 542 para **543** (+1, o teste da T55; a T54 só somou asserções). `AE` foi de 34 para 35 testes e `PE` segue com 23. Os números do orquestrador batem.
- **Integridade**: `git diff --numstat 53b95b9..HEAD` dá 0 linhas removidas. Nenhum teste foi apagado ou enfraquecido.

---

## Discrimination Sensor

**Profundidade**: P0 expandido (autorização, integridade de dados e concorrência).

**Como rodei**:
- Criei o worktree com `git worktree add --detach <scratchpad>/wt-final-r2 HEAD` (`04a22f6`), com `node_modules` como link simbólico e uma cópia do `.env` apontando o Postgres de `:5433`.
- O baseline no worktree deu 198/198 nas cinco suites de campanha.
- Um script aplicou cada mutante como substituição exata, exigindo uma única ocorrência da âncora, e rodou em sequência, nunca em paralelo, só as suites que cobrem o código (`--json`). Depois reverteu com `git checkout --` e conferiu o sha256 do arquivo restaurado: 16 de 16 restaurados.
- Nenhuma morte veio de erro de compilação ou de suite quebrada: todas são falhas de asserção.
- Para medir o impacto dos sobreviventes, rodei no worktree uma sonda e2e de 3 testes (abaixo), que apaguei em seguida.
- No fim, apaguei o link, removi o worktree com `git worktree remove --force` e rodei `git worktree prune`. `git worktree list` mostra só a árvore real.

**Isolamento**: o `git status --porcelain` da árvore real estava vazio antes do gate e do sensor e continuou vazio depois (o `diff` deu idêntico). Não usei `git stash`.

### Rodada 1 (`f869eef`; linhas de teste atualizadas para HEAD)

| # | Alvo | File:line | Mutação | Resultado (teste que matou) |
| - | ---- | --------- | ------- | --------------------------- |
| S1 | CAS | `src/infra/database/prisma/prisma-campanha-repository.ts:70` | `where: { id }`, sem `versao` | ✅ `RE:478`, `RE:501` |
| S2 | CAS | `prisma-campanha-repository.ts:71` | `versao` não incrementa | ✅ `RE:458`, `RE:501`, `RE:671` |
| S3 | Ordem decidida → pendente | `prisma-campanha-repository.ts:82-106` | blocos trocados | ✅ `RE:699` |
| S4 | Upsert da decidida | `prisma-campanha-repository.ts:88-93` | `update: {}` | ✅ `RE:612`, `RE:643`, `RE:501` |
| S5 | Mapper `@db.Date` (gravação) | `prisma-campanha-mapper.ts:96` | `T00:00:00.000+03:00` | ✅ `RE:188`, `RE:388` |
| S6 | Mapper `@db.Date` (leitura) | `prisma-campanha-mapper.ts:92` | data local (−03) | ✅ `RE:188`, `RE:388` |
| S7 | Só `EM_ANALISE` carregada | `prisma-campanha-repository.ts:17` + `prisma-campanha-mapper.ts:204` | sem filtro | ✅ `RE:612`, `RE:643`, `RE:671` |
| S8 | Fila no adaptador | `prisma-campanha-repository.ts:119` | `some: {}` | ✅ `RE:786` |
| S9 | Mapper decimal | `prisma-campanha-mapper.ts:85` | `padStart` → `padEnd` | ✅ `RE:188`, `RE:612`, `RE:699` |
| S10 | Papel da rota de empresa | `C/campanhas.controller.ts:177` | `@Roles(EMPRESA, ADMIN)` | ✅ `CE:483`, `CE:606`, `CE:1032` |
| S11 | Papel da rota de admin | `C/admin-campanhas.controller.ts:44` | `@Roles(ADMIN, EMPRESA)` | ✅ `KE:328` |
| S12 | `@Public` | `C/campanhas-publicas.controller.ts:95` | removido | ✅ 22 testes de `PE` |
| S13 | 403 da spec | `C/campanhas.controller.ts:407` | ramo `NotAllowedError` nunca casa | ✅ `CE:499`, `CE:1012`, `CE:1296`, `CE:1562` |
| S14 | `CamposPendentesError` → `errors` | `C/campanhas.controller.ts:416` | ramo nunca casa | ✅ `CE:1399` |
| S15 | Multer 5 MB exatos | `C/campanhas.controller.ts:57` | sem `+1` | ✅ `CE:1115` |
| S16 | Multer +1 recusado | `C/campanhas.controller.ts:57` | `+2` | ✅ `CE:1126` |
| S17 | 503 do PUT capa | `C/campanhas.controller.ts:323-329` | falha do storage vira 422 | ✅ `CE:1185` |
| S18 | Remoção da capa anterior | `C/campanhas.controller.ts:347-349` | não remove | ✅ `CE:1204` |
| S19 | Remoção da capa nova na falha | `C/campanhas.controller.ts:342` | não remove | ✅ `CE:1236`, `CE:1259`, `CE:1296` |
| S20 | 503 da capa pública | `C/campanhas-publicas.controller.ts:131` | `.catch(() => null)` | ✅ `PE:407` |
| S21 | 404 idêntico da capa | `C/campanhas-publicas.controller.ts:134` | `NotFoundException('Campanha sem capa')` | ✅ `PE:394` |
| S22 | Omissão na pública | `C/campanhas-publicas.controller.ts:98-100` | devolve também o `idPublico` | ✅ `PE:116`, `PE:155` |
| S23 | Portão da capa pública | `C/campanhas-publicas.controller.ts:124-126` | ignora o 404 do caso de uso | ✅ `PE:365`, `PE:379` |
| S24 | `nosniff` | `C/campanhas-publicas.controller.ts:119` | removido | ✅ `PE:340` (×2) |
| S25 | CSP | `C/campanhas-publicas.controller.ts:120` | removido | ❌ sobreviveu na rodada 1 → T54 (ver reexecução) |
| S26 | `Content-Type` da capa | `C/campanhas-publicas.controller.ts:138` | `application/octet-stream` | ✅ `PE:340` (×2) |
| S27 | Fila de reenvio | `src/infra/mail/mailer-resiliente.ts:17` | sem `CAMPANHA_REJEITADA` | ✅ `mailer-resiliente.spec.ts:36`, `AE:455` |
| S28 | Fila de reenvio | `src/infra/mail/mailer-resiliente.ts:18` | sem `ALTERACAO_CAMPANHA_REJEITADA` | ✅ `mailer-resiliente.spec.ts:36`, `AE:762` |
| S29 | Acesso da dona à capa | `src/infra/arquivo/arquivo.service.ts:141-142` | sem `campanha?.empresa` | ✅ `FE:540` |
| S30 | Auditoria (scratch, domínio) | `U/aprovar-campanha.ts:73` | `registrar` não chamado | ✅ `AE:217` |
| S31 | M30 (scratch, domínio) | `U/buscar-campanha-publica.ts:59` | sem checagem de UUID | ⚪ Equivalente (`id_publico` TEXT → `null` → mesmo 404) |
| S32 | `Content-Disposition` | `C/campanhas-publicas.controller.ts:139` | `attachment` | ❌ sobreviveu na rodada 1 → T54 (ver reexecução) |
| S33 | 422 de forma da rejeição de alteração | `C/admin-campanhas.controller.ts:215` | sem `ZodValidationPipe(rejeicaoSchema)` | ❌ sobreviveu na rodada 1 → T55 (ver reexecução) |

### Rodada 2 (`04a22f6`)

| # | Alvo | File:line | Mutação | Resultado (teste que matou) |
| - | ---- | --------- | ------- | --------------------------- |
| S25 ↻ | CSP | `C/campanhas-publicas.controller.ts:120` | removido | ✅ `PE:340` (PNG e JPEG, asserção de `PE:355`) |
| S32 ↻ | `Content-Disposition` | `C/campanhas-publicas.controller.ts:139` | `attachment` | ✅ `PE:340` (PNG e JPEG, asserção de `PE:358`) |
| S33 ↻ | 422 de forma da rejeição de alteração | `C/admin-campanhas.controller.ts:215` | sem o pipe | ✅ `AE:801` |
| S34 | Pipe zod do PATCH | `C/campanhas.controller.ts:271` | `@Body() dados`, sem `ZodValidationPipe(editarCampanhaSchema)` | ❌ **Sobreviveu** (122/122 em `CE`+`KE`) → T56 |
| S35 | Pipe zod do POST | `C/campanhas.controller.ts:215` | `@Body() dados`, sem o pipe | ✅ `CE:459` |
| S36 | Status do PUT capa | `C/campanhas.controller.ts:299` | sem `@HttpCode(204)` (vira 200) | ✅ `CE:1093` (×2), `CE:1115`, `CE:1204`, `CE:1221` |
| S37 | `@Roles` de uma rota individual | `C/admin-campanhas.controller.ts:211` | `@Roles(ADMIN, EMPRESA)` no método da rejeição de alteração | ✅ `KE:337` (sweep, corpo válido e vazio) |
| S38 | Filtro de `listarEmAnalise` | `src/infra/database/prisma/prisma-campanha-repository.ts:116` | sem o ramo `{ status: EM_ANALISE }` | ✅ `RE:786`, `AE:97` |
| S39 | Erro → status | `src/domain/fivo/application/errors/alteracao-ja-pendente.error.ts:4` (scratch) | 409 → 422 | ✅ `CE:860` |
| S40 | Erro → status | `src/domain/fivo/application/errors/beneficiada-indisponivel-na-decisao.error.ts:7` (scratch) | 409 → 422 | ✅ `AE:263` (×3), `AE:282`, `AE:645` |
| S41 | `@Public` da capa pública | `C/campanhas-publicas.controller.ts:117` | removido | ✅ `PE:340` (×2), `PE:365`, `PE:379`, `PE:394` (×2), `PE:407` |
| S42 | Autor da auditoria no PATCH | `C/campanhas.controller.ts:279` | `usuarioId: empresaId` | ✅ `CE:708`, `CE:805` (×3) |
| S43 | Autor da auditoria na submissão | `C/campanhas.controller.ts:375` | `usuarioId: empresaId` | ✅ `CE:1353` |
| S44 | Status da aprovação de alteração | `C/admin-campanhas.controller.ts:185` | sem `@HttpCode(204)` (vira 201) | ✅ `AE:574`, `AE:620` |
| S45 | Descarte de chaves no POST | `src/infra/http/campanhas.dto.ts:42` | `z.object` → `z.looseObject` em `criarCampanhaSchema` | ❌ **Sobreviveu** (107/107 em `CE`) → T56 |
| S46 | Descarte de chaves no PATCH | `src/infra/http/campanhas.dto.ts:50` | `z.object` → `z.looseObject` em `editarCampanhaSchema` | ❌ **Sobreviveu** (122/122 em `CE`+`KE`) → T56 |

### Sonda de impacto dos sobreviventes (scratch, apagada)

Escrevi uma suíte de 3 testes, `zz-sonda.e2e-spec.ts`, com duas empresas aprovadas, A e B:
- (1) B faz PATCH da própria campanha com `{ nome: 'Invadida', empresaId: <A>, campanhaId: <campanha de A> }` e confere que a campanha de A fica intacta;
- (2) B faz POST com `{ nome: 'Plantada', empresaId: <A> }` e confere que a linha grava `empresaId` de B;
- (3) B faz PATCH com `{ nome: 123 }` e espera 422.

| Árvore | (1) PATCH com ids alheios | (2) POST com `empresaId` alheio | (3) PATCH com tipo errado |
| ------ | ------------------------- | ------------------------------- | ------------------------- |
| `04a22f6` sem mutação | ✅ A intacta | ✅ grava em B | ✅ 422 `{ message: 'Informe um texto', errors: [{ campo: 'nome', … }] }` |
| S34 | ❌ **A renomeada para "Invadida"** | ✅ (o POST mantém o pipe) | ❌ **500 Internal server error** |
| S45 + S46 | ❌ **A renomeada para "Invadida"** | ❌ **campanha gravada na empresa A** | ✅ 422 |

A produção está correta. Os mutantes mostram, porém, que a fronteira de tenant de POST e PATCH depende de um único detalhe, o descarte de chaves do zod, e nenhum teste do projeto o vigia.

**Result**: rodada 2 com 16 injetados (3 reexecuções + 13 novos), 13 mortos, 3 sobreviventes (S34, S45, S46) e 0 equivalentes. Acumulado das duas rodadas: 46 mutantes distintos, 42 mortos, 3 sobreviventes e 1 equivalente (S31). Sensor ❌ FAIL.

---

## Decisões dos autores

Mantidas da rodada 1. A rodada não mexeu em produção, então nenhum julgamento muda.

| # | Decisão | Julgamento |
| - | ------- | ---------- |
| 1 | 403 com a mensagem da spec via `ForbiddenException` em `executar` | **Aceita.** Toda fonte de `NotAllowedError` nesse controller passa por `U/assegurar-empresa-aprovada.ts:28`. O 403 do `RolesGuard` ("Acesso negado") não passa por aí (`KE:357-361`). S13 morto. Risco latente em F3 |
| 2 | `CamposPendentesError` → 422 com `errors` | **Aceita.** Mesmo formato do pipe (`CE:459-471`). S14 morto |
| 3 | Capa ausente no PUT → 422 | **Aceita** (`CE:1169-1183`); precedência em SP4 |
| 4 | `AssegurarBeneficiadaDisponivelUseCase` no `HttpModule` | **Aceita** (`src/infra/http/http.module.ts:102`) |
| 5 | Helper `forcarEstado` | **Aceita.** Só é usado sobre campanhas completas, e os fluxos reais são cobertos em `AE`, `PE` e `KE` |
| 6 | M30: formato barrado no caso de uso | **Aceita.** S31 é equivalente |
| 7 | Troca de capa concorrente pode deixar capa órfã | **Confirmado e não bloqueante** (F1) |
| 8 | Corrida edição × aprovação aceita 200+204 ou 409 | **Aceita.** Invariante em `KE:224-233`, CAS em `RE:501-529` |
| 9 | Submissão AC8 (apta ao selo) sem rota | **Aceita.** Domínio em `E/campanha.spec.ts:420-441`; a superfície HTTP vem com `selo-e-qrcode` |
| 10 | Auditoria de alteração com `compromissoNovo` e `compromissoProposto` | **Aceita como está** (F4) |
| 11 | Done-when da T29 emendada (P13 no design) | **Aceita** (`design.md:183`, `RE:740-756`) |
| 12 | (rodada 2) T54 sem a parte opcional de OpenAPI | **Aceita.** A Done-when da T54 no `tasks.md` não incluiu documentar os cabeçalhos, e o `openapi.json` não mudou. F2 segue aberto |

---

## Code Quality

| Princípio | Status | Nota |
| --------- | ------ | ---- |
| Diff da rodada só de teste | ✅ | `git diff 53b95b9..HEAD -- src openapi.json` vazio; 0 linhas removidas |
| Nada de domínio no diff da infra | ✅ | AD-021 respeitado (rodada 1) |
| Aderência ao design | ✅ | Sem mudança desde a rodada 1 |
| Código mínimo e mudanças cirúrgicas | ✅ | T54 com +4 linhas e T55 com +19, ambas copiando o padrão da rota irmã |
| Padrões existentes | ✅ | O teste da T55 espelha `AE:440-453` e `AE:781-799`, e as asserções da T54 espelham `TH/arquivo.e2e-spec.ts:208-211` |
| Spec-anchored outcome check | ⚠️ | 46/47 no valor da spec; Criação AC18 sem evidência pelo corpo da requisição |
| Cobertura por camada (rotas: happy + edge + 401/403/404/409/422/503) | ❌ | 10 das 12 rotas novas estão completas. `PATCH /campanhas/:id` não tem 422 de forma, e nem POST nem PATCH provam o descarte de chaves fora do DTO (T56) |
| Todo teste mapeia para AC, edge case ou Done-when | ✅ | Os testes novos mapeiam para CAMP-08 AC8 (T55) e CAMP-11 AC1 (T54) |
| Guidelines documentadas | ✅ | Nenhuma no projeto; apliquei a Test Coverage Matrix de `tasks.md` |
| Senior engineer aprovaria? | ✅ com ressalva | Sim para T54 e T55. A ressalva é a T56, porque uma fronteira de tenant sem teste não passa em revisão |

---

## Spec-Precision Gaps

| # | AC | Problema | Estado |
| - | -- | -------- | ------ |
| SP1 | Criação AC5, AC6, AC8, AC11; Submissão AC3 | A spec diz só "HTTP 422", e as mensagens vêm do design | Aberto, não bloqueia (L-011) |
| SP2 | Submissão AC6 ("empresa"); Consulta AC1 ("nome da empresa", "imagem de capa quando houver") | Termo guarda-chuva, que o design resolve como `nomeFantasia` e `temCapa` | Aberto, não bloqueia (L-019) |
| SP4 | Criação AC1 × PUT capa | A spec não define se o 403 do portão vence o 422 de forma e o 503 de dependência. Hoje sai 422/503 antes do 403, sem gravar nada (`CE:1296-1313`) | Aberto, não bloqueia (L-033) |

---

## Fix Plans

### T56: Campanhas da empresa — 422 de forma no PATCH e descarte de chaves fora do DTO no POST e no PATCH (Major)

- **Root cause**:
  - `C/campanhas.controller.ts:220-222` monta `{ empresaId, ...dados }`, e `:277-282` monta `{ empresaId, usuarioId: usuario.id, campanhaId: id, ...dados }`. Em ambos, o corpo vem *depois* dos ids derivados da sessão e do parâmetro.
  - Quem impede o corpo de sobrescrevê-los é o `ZodValidationPipe` com `z.object`, que descarta chaves desconhecidas (`src/infra/http/campanhas.dto.ts:42`, `:50`; `src/infra/http/pipes/zod-validation.pipe.ts:8-11`).
  - Nenhum e2e envia essas chaves, e o PATCH não tem nenhum teste de forma. Por isso S34, S45 e S46 sobrevivem, e a sonda mostrou escrita entre tenants nos três casos.
  - Severidade **Major**, e não Minor como T54/T55: o que fica sem guarda é a Criação AC18, uma fronteira de autorização. O código atual está correto.
- **Fix task**:
  - **What**: e2e em `CE`.
    - (a) `PATCH` com `{ nome: 123 }` → 422 `{ statusCode: 422, message: 'Informe um texto', errors: [{ campo: 'nome', mensagem: 'Informe um texto' }] }`, com `linha(id)).toEqual(antes)`.
    - (b) A dona faz `PATCH` da própria campanha com `{ nome: 'Novo nome', empresaId: <outra empresa>, campanhaId: <campanha da outra>, usuarioId: <outro usuário> }` → 200 com o nome novo **na campanha da rota**. A campanha da outra empresa fica com `linha).toEqual(antes)`, e a auditoria, quando houver, sai com `usuarioId` da dona.
    - (c) A dona faz `POST /campanhas` com `{ nome: 'Plantada', empresaId: <outra empresa> }` → 201, a linha gravada tem `empresaId` da dona, e a outra empresa segue com 0 campanhas.
  - **Where**: `test/http/campanhas.e2e-spec.ts`, nos `describe` de `POST /campanhas` e `PATCH /campanhas/:id`.
  - **Depends on**: None
  - **Reuses**: `CE:459-471` (422 de forma do POST) e `CE:998-1010` (outra empresa, "nada gravado")
  - **Requirement**: CAMP-01 (Criação AC18)
  - **Autor**: 🤖 agente (infra; nenhum código de domínio)
  - **Done when**:
    - [ ] (a), (b) e (c) com o corpo exato e "nada gravado" na campanha alheia;
    - [ ] reaplicados, S34 (sem o pipe no PATCH), S45 (`z.looseObject` em `criarCampanhaSchema`) e S46 (`z.looseObject` em `editarCampanhaSchema`) morrem;
    - [ ] gate `full` verde.
  - **Tests**: e2e · **Gate**: full · **Commit**: `test(api): chaves fora do DTO nas rotas de campanha da empresa`
- **Priority**: Major

---

## Follow-ups não bloqueantes

1. **F1, capa órfã (decisão 7).** Varredura periódica de `arquivo` `IMAGEM_CAMPANHA` sem `campanha`, ou o `EditarCampanhaUseCase` devolver a capa substituída (domínio, grupo).
2. **F2, OpenAPI da capa pública.** Documentar `X-Content-Type-Options`, `Content-Security-Policy` e `Content-Disposition` na resposta 200, como `C/arquivo.controller.ts:21-27`. A T54 deixou de fora.
3. **F3, `executar`.** Restringir o ramo `NotAllowedError` à mensagem do portão, ou documentar que um `NotAllowedError` novo vaza a própria mensagem.
4. **F4, domínio (grupo).** Já no `STATE.md`: JSDoc P13 em `CampanhaRepository.salvar`, chave única de compromisso nas auditorias de alteração e `consoleError.mockRestore()` em `finally`.
5. **F5, defesa em profundidade (novo).** Montar a entrada dos casos de uso com os ids da sessão **depois** do spread (`{ ...dados, empresaId, usuarioId, campanhaId: id }`) ou listar os campos explicitamente. Assim, um schema permissivo no futuro não reabre a escrita entre tenants. É mudança de produção, então fica fora da T56, que é só teste.
6. **SP4.** Fixar na spec a precedência entre 403, 422 de forma e 503, ou mover o upload da capa para depois do portão.

---

## Requirement Traceability Update

Não editei o `spec.md`. Este é o status proposto para o orquestrador aplicar:

| Requirement | Status anterior | Status proposto |
| ----------- | --------------- | --------------- |
| CAMP-01 | Domínio verificado · infra em Tasks | ❌ Needs Fix (T56, só teste: Criação AC18 pelo corpo) |
| CAMP-02 | Domínio verificado · infra em Tasks | ✅ Verified |
| CAMP-03 | Domínio verificado · infra em Tasks | ✅ Verified |
| CAMP-04 | Domínio verificado · infra em Tasks | ✅ Verified |
| CAMP-05 | Domínio verificado · infra em Tasks | ✅ Verified |
| CAMP-06 | Domínio verificado · infra em Tasks | ✅ Verified |
| CAMP-07 | Domínio verificado · infra em Tasks | ✅ Verified |
| CAMP-08 | Domínio verificado · infra em Tasks (rodada 1: Needs Fix T55) | ✅ Verified |
| CAMP-11 | Domínio verificado · infra em Tasks (rodada 1: Needs Fix T54) | ✅ Verified |
| CAMP-09, CAMP-10 | Deferred | Deferred |

---

## Histórico

| Rodada | HEAD | Gate | Sensor | Veredito | Saída |
| ------ | ---- | ---- | ------ | -------- | ----- |
| 1 | `f869eef` | unit 602, e2e 542/35 | 33 injetados, 29 mortos, 3 sobreviventes (S25, S32, S33), 1 equivalente | ❌ | T54 (CSP e `Content-Disposition`) e T55 (422 sem motivo), ambas Minor e só de teste. Lições L-031, L-032 e L-033 |
| 2 | `04a22f6` | unit 602, e2e 543/35 | 16 injetados, 13 mortos, 3 sobreviventes (S34, S45, S46), 0 equivalentes | ❌ | T54 e T55 confirmadas. Abre a T56 (Major, só teste) e o follow-up F5 |

---

## Summary

**Overall**: ❌ Not Ready. A Fase 9b fechou as três lacunas da rodada 1, e o código de produção continua correto. Falta testar a fronteira de tenant do corpo da requisição em POST e PATCH.

**Spec-anchored check**: 46/47 ACs P1 no valor da spec; Criação AC18 sem evidência pelo corpo. SP1, SP2 e SP4 seguem abertos e não bloqueiam.
**Sensor**: na rodada 2, 13 de 16 mortos (S34, S45 e S46 sobreviveram). No acumulado, 42 mortos, 3 sobreviventes e 1 equivalente em 46.
**Gate**: build, tsc, eslint e unit 602/602 ok; e2e 543/543 em 35 suites. Nenhum teste apagado ou enfraquecido.
**Lições**: L-034 (candidata), para S34, S45 e S46: ids da sessão expostos ao spread do corpo. Nenhuma lição existente se repetiu entre features, então nenhuma foi promovida.

**O que funciona**:
- Os cabeçalhos de segurança da capa pública agora são vigiados.
- O 422 de forma da rejeição de alteração também.
- Papéis por rota e por método, status 204 das rotas de decisão e de capa, filtro da fila no adaptador, mapeamento erro → status e autor da auditoria em PATCH e submissão: tudo morto nesta rodada.
- Todo o resto da rodada 1 segue igual.

**Próximos passos**:
1. O orquestrador despacha a T56 para um worker 🤖.
2. Este Verifier reaplica S34, S45 e S46 na rodada 3 (iteração 2 de 3).
3. O orquestrador atualiza a rastreabilidade e o `STATE.md`, e decide se F5 vira task.

**validate_state**: `python3 .claude/skills/tlc-spec-driven/scripts/validate_state.py campanhas` saiu com exit 1. É o esperado com o veredito FAIL: a feature não está pronta até a rodada 3.
