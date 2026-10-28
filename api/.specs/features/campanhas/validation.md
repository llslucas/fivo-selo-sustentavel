**Verdict**: PASS

# Campanhas — Validação final, rodada 3 (P1 do `api`)

**Veredito**: ✅ **PASS**. A T56 fecha a última lacuna. Os três e2e novos de `CE` provam que `POST /campanhas` e `PATCH /campanhas/:id` ignoram `empresaId`, `campanhaId` e `usuarioId` enviados no corpo, e que o PATCH devolve o 422 de forma. Reaplicados, S34, S45 e S46 morrem. O diff da rodada só acrescenta testes (61 linhas, 0 removidas), e `src/` e `openapi.json` não mudaram. O gate build está verde, com unit 602/602 e e2e 546/546 em 35 suites. Injetei 10 mutantes novos de mass-assignment e de validação de forma nas rotas com corpo, e os 10 morreram. Com isso, os 47 ACs P1 estão cobertos no valor da spec. SP1, SP2 e SP4 seguem abertos, mas não bloqueiam.

**Data**: 2026-10-27
**Spec**: `.specs/features/campanhas/spec.md`
**Diff range**:
- Feature: `397f8bc..65fc3bd`.
- Infra: `79dd6bc..65fc3bd`.
- Esta rodada: `c1d30ed..65fc3bd`, com `1ff8b11` (T56 no `tasks.md`) e `65fc3bd` (T56).
- O domínio fica em `397f8bc..dad822e`, validado em `validation-dominio.md`, rodada 3, com PASS.

**Verifier**: sub-agente independente (autor ≠ verificador). Não escrevi código desta feature e só li `src/` e `test/`. Escrevi apenas este arquivo.
**Escopo**: CAMP-01…08 e CAMP-11. Ficam de fora CAMP-09, CAMP-10 e o `web`. Não houve UAT, porque a feature é só backend.
**Iteração**: re-verificação 2 de 3 (validate.md §8). Esta rodada é a última antes de escalar ao usuário, e terminou em PASS.

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

Todas as linhas citadas valem para `65fc3bd`. As inserções da T56 mudaram só a numeração de `CE`: o que estava da linha 473 à 1011 andou +19, e o que estava da 1012 em diante andou +61, em relação à rodada 2. `AE`, `PE`, `KE`, `RE` e `FE` não mudaram.

---

## O que mudou nesta rodada

`git diff --stat c1d30ed..HEAD` mostra só dois arquivos: `tasks.md` (+25 −1, a T56 e uma frase da Fase 9b) e `CE` (+61 −0). `git diff c1d30ed..HEAD -- src openapi.json` vem vazio. O código de produção é o mesmo desde a rodada 1 (`f869eef`), então os 46 ACs que não dependiam da T56 seguem valendo, só com as linhas renumeradas, que conferi em HEAD.

| Done-when da T56 | Evidência |
| ---------------- | --------- |
| PATCH `{ nome: 123 }` → 422 com o corpo exato, nada gravado | ✅ `CE:1031-1046`: `editar(id, { nome: 123 })`, `status).toBe(422)` (`:1039`), `body).toEqual({ statusCode: 422, message: 'Informe um texto', errors: [{ campo: 'nome', mensagem: 'Informe um texto' }] })` (`:1040-1044`) e `linha(id)).toEqual(antes)` (`:1045`) |
| PATCH na própria campanha com `empresaId`, `campanhaId` e `usuarioId` alheios → só a campanha da rota muda; a alheia fica `toEqual(antes)` | ✅ `CE:1048-1071`: corpo `{ nome: 'Renomeada', empresaId: <outra>, campanhaId: <alheia>, usuarioId: <outro usuário> }`, `status).toBe(200)` (`:1065`), `linha(id)).toMatchObject({ nome: 'Renomeada', empresaId: <dona> })` (`:1066-1069`) e `linha(alheia.id)).toEqual(alheiaAntes)` (`:1070`) |
| POST com `empresaId` alheio → gravada na empresa da sessão | ✅ `CE:473-490`: `status).toBe(201)` (`:483`) e `linhasDeCampanha()).toEqual([objectContaining({ id, empresaId: <dona> })])` (`:484-489`). Como o `toEqual` cobre a tabela inteira, ele também prova que a outra empresa ficou com 0 campanhas |
| S34, S45 e S46 morrem | ✅ Reaplicados no worktree, os três morrem (ver o sensor) |
| Gate `full` verde | ✅ Rodei o gate build completo (abaixo) |

Uma observação que não bloqueia: na campanha em `RASCUNHO`, a edição não gera auditoria, então o `usuarioId` alheio do corpo não chega a ser observado. Isso não abre brecha. O descarte de chaves é do objeto inteiro, e `campanhaId` e `empresaId` já matam qualquer afrouxamento dele (S46, S51, S53). O autor da auditoria vindo da sessão segue vigiado por S42 (`CE:727`, `CE:824`).

Nada foi removido nem enfraquecido. Os testes novos seguem o padrão de `CE:459-471` (422 de forma do POST) e de `CE:1017-1029` (outra empresa, nada gravado).

---

## Task Completion

Conferi cada Done-when no código, sem confiar nos checkboxes. As linhas de T28–T40 vêm das rodadas anteriores, renumeradas para HEAD, e o código delas não mudou.

| Task | Status | Evidência |
| ---- | ------ | --------- |
| T28 schema e migration | ✅ | Os modelos e enums de `prisma/schema.prisma` batem com o design §Data Models. `id_publico` e `capa_arquivo_id` são únicos (`prisma/migrations/20261028003809_campanhas/migration.sql:62`, `:65`), e as datas usam `@db.Date`. O CHECK XOR e o índice parcial estão em `migration.sql:96-107`. O `prisma migrate deploy` desta rodada não achou migration pendente |
| T29 adaptador e mapper | ✅ | CAS em `src/infra/database/prisma/prisma-campanha-repository.ts:69-76`. A alteração decidida é gravada antes da pendente, as duas por upsert (`:82-106`). O mapper só carrega `EM_ANALISE` (`:16-18`, `prisma-campanha-mapper.ts:203-205`). Os e2e estão em `RE:188-831` |
| T30 templates enfileiráveis | ✅ | `src/infra/mail/mailer-resiliente.ts:17-18`, com teste em `src/infra/mail/mailer-resiliente.spec.ts:36-59` |
| T31 `ArquivoService` capa | ✅ | `FE:388-472`, com dono × não-dono em `FE:540-561` |
| T32 POST e GET | ✅ | `C/campanhas.controller.ts:213-246`. Cobre 201, 401, 403 e 422 por limite e por forma (`CE:106-542`), o descarte de `empresaId` no corpo (`CE:473-490`, T56), o GET da dona e o 404 de terceiros (`CE:546-615`) |
| T33 PATCH | ✅ | `C/campanhas.controller.ts:268-284`. `CE:662-1112` cobre os estados, o 409, o 422 de domínio, o 422 de forma (`CE:1031`, T56), o descarte de ids alheios (`CE:1048`, T56) e o 404 |
| T34 PUT capa | ✅ | `CE:1151-1374`: 5 MB, 5 MB +1, SVG/PDF, 503, troca de capa e falha no `salvar`. S36 morto |
| T35 submissão | ✅ | `CE:1414-1642`. S43 morto |
| T36 fila e decisões | ✅ | `AE:97-471`. S38, S40, S47 e S49 mortos |
| T37 decisões de alteração | ✅ | `AE:574-837`, com o 422 sem motivo em `AE:801-818`. S33, S37, S44 e S50 mortos |
| T38 consulta pública | ✅ | `PE:116-411`, com CSP e `Content-Disposition` em `PE:355-358`. S25, S32 e S41 mortos |
| T39 concorrência e papéis | ✅ | `KE:104-367` |
| T40 OpenAPI e README | ✅ | `TH/openapi-exportacao.e2e-spec.ts` verde e `README.md:159-165` |
| T54 | ✅ | `PE:355-358` (rodada 2) |
| T55 | ✅ | `AE:801-818` (rodada 2) |
| T56 | ✅ | `CE:473-490`, `CE:1031-1046` e `CE:1048-1071` (acima) |

---

## Spec-Anchored Acceptance Criteria

Legenda: ✅ quer dizer evidência e2e no status **e** no corpo, com a mensagem literal quando a spec ou o design a define, e "nada gravado" nos caminhos de erro. As linhas de domínio vêm do `validation-dominio.md`, rodada 3. O código de domínio não mudou desde `dad822e`.

### P1: Criação da campanha (CAMP-01…04)

| AC | Saída da spec | `file:line` + asserção | Result |
| -- | ------------- | ---------------------- | ------ |
| AC1 empresa não aprovada | 403 "Cadastro ainda não aprovado", nada gravado | POST em `CE:518-542`, com `body).toEqual({ statusCode: 403, message: 'Cadastro ainda não aprovado' })` e `campanha.count()).toBe(0)` para PENDENTE, REJEITADA e SUSPENSA. PATCH em `CE:1073-1091`, capa em `CE:1357-1374` e submissão em `CE:1623-1642`. S13 morto | ✅ / ⚠️ SP4 |
| AC2 cria em `RASCUNHO` | 201 com o id interno e o público | `CE:106-139`: `status).toBe(201)`, chaves exatamente `['id','idPublico']`, linha com `status: 'RASCUNHO'` e `versao: 0` | ✅ |
| AC3 nome de 3 a 80, com trim | 422 "O nome deve ter entre 3 e 80 caracteres" | Aceitos em `CE:229-235`. Recusados com `body).toEqual({ statusCode: 422, message })` e contagem 0 em `CE:287-297` e `CE:446-457` | ✅ |
| AC4 descrição até 2000 | 422 "A descrição deve ter no máximo 2000 caracteres" | `CE:236-239` (aceita) e `CE:298-302` (recusada) | ✅ |
| AC5 valor por unidade | de 0,01 a 999.999,99, com até 2 casas, senão 422 | `CE:240-253` (aceitos) e `CE:303-326` (recusados) | ✅ / ⚠️ SP1 |
| AC6 percentual | de 0,01 a 100,00, com até 2 casas, senão 422 | `CE:254-267` e `CE:327-350` | ✅ / ⚠️ SP1 |
| AC7 valor do outro tipo | 422 "O Valor da regra deve corresponder à regra selecionada." | `CE:351-366`, nas duas direções | ✅ |
| AC8 meta | mesmos limites, senão 422 | `CE:268-269` e `CE:367-381` | ✅ / ⚠️ SP1 |
| AC9 instituição e causa juntas | 422 "Informe exatamente uma beneficiada: instituição ou causa" | `CE:382-390` | ✅ |
| AC10 beneficiada indisponível | 422 "Instituição ou causa indisponível" | `CE:391-419` | ✅ |
| AC11 fim ≤ início | 422 | `CE:420-435` ("A data de fim deve ser posterior à data de início"); um dia depois é aceito em `CE:270-276` | ✅ / ⚠️ SP1 |
| AC12 início no passado | aceito | `CE:210-227` | ✅ |
| AC13 capa PNG/JPEG até 5 MB, pelo conteúdo | 422 nos demais | `CE:1151-1228`. S15 e S16 mortos | ✅ |
| AC14 storage fora do ar | 503 "Storage indisponível no momento.", campanha intacta | `CE:1246-1263`. S17 morto | ✅ |
| AC15 rascunho edita tudo | todos os campos | `CE:662-699`, capa em `CE:1151-1174` | ✅ |
| AC16 id público imutável, distinto e não sequencial | UUID v4 diferente do id | `CE:141-155`, `CE:662-697` e `PE:191-232` | ✅ |
| AC17 consulta da dona | todos os campos, estado, motivo e pendência | `CE:546-582`, motivo em `CE:727-755` e pendência em `CE:849-850` | ✅ |
| AC18 campanha de outra empresa | 404 sem revelar que existe | **Pelo parâmetro da rota**: GET em `CE:600-615` (`inexistente.text).toBe(alheia.text)`), PATCH em `CE:1017-1029`, capa em `CE:1342-1355` e submissão em `CE:1608-1621`, todos sem gravar nada. **Pelo corpo da requisição (T56)**: o PATCH com ids alheios deixa a campanha alheia `toEqual(alheiaAntes)` (`CE:1070`), e o POST com `empresaId` alheio grava na dona (`CE:484-489`). S34, S45, S46, S51, S52 e S53 mortos | ✅ |

### P1: Submissão e aprovação (CAMP-05, CAMP-06)

| AC | Saída da spec | `file:line` + asserção | Result |
| -- | ------------- | ---------------------- | ------ |
| AC1 submeter completo | `EM_ANALISE` + data-hora | `CE:1414-1444`: 204, `EM_ANALISE`, `submetidaEm` recente e auditoria com o `usuarioId` da dona. S43 morto | ✅ |
| AC2 campos ausentes | 422 com todos os campos de uma vez | `CE:1460-1492`. S14 morto | ✅ |
| AC3 fim ≤ hoje | 422 | `CE:1494-1518` ("A data de fim deve ser posterior à data atual"); amanhã → 204 em `CE:1446-1458` | ✅ / ⚠️ SP1 |
| AC4 beneficiada saiu do catálogo | 422 "Instituição ou causa indisponível" | `CE:1520-1562` | ✅ |
| AC5 edição em análise | 409 "Campanha em análise não pode ser editada" | `CE:701-725`, capa em `CE:1297-1318` | ✅ |
| AC6 fila | `EM_ANALISE` + alterações, da mais antiga para a mais recente, com os campos | `AE:97-176`: `toEqual` de 3 itens, com ordem por submissão diferente da ordem de criação. S8 e S38 mortos | ✅ / ⚠️ SP2 |
| AC7 aprovar | `APROVADA`, autor e data-hora | `AE:217-236`; o valor exato está no domínio, em `U/aprovar-campanha.spec.ts:109` | ✅ |
| AC8 apta ao selo | apta enquanto `APROVADA` | Sem rota nesta rodada, por design (`design.md:21`, `:126`). A evidência de domínio está em `E/campanha.spec.ts:420-441` | ✅ (domínio; HTTP N/A por design) |
| AC9 beneficiada indisponível na aprovação | 409, estado inalterado | `AE:238-301`, com `linha).toEqual(antes)` e sem auditoria. S40 morto | ✅ |
| AC10 motivo < 20 | 422 "O motivo deve ter no mínimo 20 caracteres", estado inalterado | `AE:411-438`; sem motivo em `AE:440-453`. S47 e S49 mortos | ✅ |
| AC11 rejeitar | `REJEITADA`, motivo gravado, e-mail na fila | `AE:370-409`; falha de envio em `AE:455-471`. S27 morto | ✅ |
| AC12 editar `REJEITADA` | volta a `RASCUNHO` e preserva o motivo | `CE:727-755`, com auditoria de autor. S42 morto | ✅ |
| AC13 só as 4 transições | 409 "Operação não permitida para o estado atual" | `AE:303-340`, `AE:473-489`, `CE:1564-1606`, `AE:668-685` e `AE:820-837` | ✅ |
| AC14 não-admin | 403 sem alterar estado | `AE:189-203`, `AE:349-360`, `:498-513`, `:694-708` e `:848-864`, mais o sweep em `KE:328-367`. S11 e S37 mortos | ✅ |
| AC15 auditoria de toda transição | autor, estado anterior e novo, motivo e data-hora | `CE:1434-1443`, `AE:227-233`, `AE:390-400` e `CE:747-754`. S30, S42 e S43 mortos | ✅ |

### P1: Alteração de campanha aprovada (CAMP-07, CAMP-08)

| AC | Saída da spec | `file:line` + asserção | Result |
| -- | ------------- | ---------------------- | ------ |
| AC1 textos, capa e meta na hora | aplicados; segue `APROVADA`, sem pendência | `CE:757-782`, capa em `CE:1282-1295`, pública em `PE:221-232` | ✅ |
| AC2 compromisso abre alteração | pendente; campanha `APROVADA` com os valores anteriores | `CE:784-877` | ✅ |
| AC3 pública mostra o aprovado | só os valores anteriores | `PE:191-219` e `PE:155-189` | ✅ |
| AC4 segunda alteração | 409 "Já existe uma alteração em análise" | `CE:879-900`. S39 morto | ✅ |
| AC5 mesmas validações | 422 | `CE:902-976` | ✅ |
| AC6 aprovar alteração | aplica, registra autor e data-hora, encerra a pendência | `AE:574-643`. S44 morto | ✅ |
| AC7 nova beneficiada indisponível | 409 sem aplicar | `AE:645-666` | ✅ |
| AC8 rejeitar alteração | descarta, mantém `APROVADA`, grava o motivo, envia e-mail | `AE:712-760`, fila de reenvio em `AE:762-779` (S28), motivo de 19 caracteres → 422 em `AE:781-799`, sem motivo → 422 em `AE:801-818`. S33 e S50 mortos | ✅ |
| AC9 id público imutável | igual em toda edição e alteração | `PE:191-232` e `CE:662-697` | ✅ |
| AC10 auditoria da alteração | autor, valores anteriores e novos, motivo e data-hora | `CE:865-875`, `AE:604-613` e `AE:746-759` | ✅ |

### P1: Consulta pública (CAMP-11)

| AC | Saída da spec | `file:line` + asserção | Result |
| -- | ------------- | ---------------------- | ------ |
| AC1 aprovada de empresa aprovada | 200 com os campos | `PE:116-153`. Capa em `PE:340-363`: `content-type`, `nosniff`, CSP `default-src 'none'; sandbox`, `content-disposition` casando `/^inline/` (`PE:355-358`) e os bytes. S24, S25, S26, S32 e S41 mortos | ✅ / ⚠️ SP2 |
| AC2 404 idêntico | inexistente, rascunho, em análise, rejeitada, empresa não aprovada, id malformado | `PE:249-321` (`resposta.text).toBe(referencia)`). Capa: `PE:365-405`. S21 e S23 mortos | ✅ |
| AC3 omitir id, motivo e pendência | ausentes | `PE:155-189`. S22 morto | ✅ |
| AC4 situação | `NAO_INICIADA` se o início é depois de hoje, senão `EM_ANDAMENTO` | `PE:234-247` | ✅ |

**Status**: ✅ **Os 47 ACs P1 estão cobertos no valor da spec.** A Criação AC18 fechou pelo corpo da requisição (T56). SP1, SP2 e SP4 seguem abertos e não bloqueiam.

---

## Edge Cases

Nada mudou desde a rodada 1; só atualizei as linhas.

- [x] Beneficiada sai do catálogo durante a análise → 409: `AE:238-301` (campanha) e `AE:645-666` (alteração).
- [x] Beneficiada de campanha `APROVADA` sai do catálogo → a campanha segue publicada com a beneficiada original: `PE:323-336`.
- [x] Empresa suspensa → 404 público sem mudar o estado: `PE:305-321` e `PE:379-392` (capa).
- [x] Dois admins ao mesmo tempo → 409 para o segundo: `KE:104-171`. O CAS determinístico está em `RE:501-529`.
- [x] Submissão dupla → uma só submissão: `KE:173-194` e `CE:1564-1581`.
- [x] Edição concorrente com uma decisão → só uma das duas se aplica: `KE:196-235`.
- [x] HTML na descrição volta como texto: `CE:584-598`.

---

## Gate Check

- **Gate command** (`tasks.md`, Build): `npx prisma migrate deploy`, depois `npm run build && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json`. Rodei na árvore real, em `65fc3bd`, com o Postgres de teste em `:5433`, antes do sensor.

| Etapa | Exit | Resultado |
| ----- | ---- | --------- |
| `prisma migrate deploy` | 0 | nenhuma migration pendente |
| `npm run build` | 0 | ok |
| `tsc --noEmit` | 0 | ok |
| `eslint` | 0 | nenhum erro e nenhum aviso |
| `jest` (unit) | 0 | 64 suites, **602/602**, 0 skip |
| `jest` (e2e) | 0 | 35 suites, **546/546**, 0 skip, 81,5 s |

- **Contagens**: os unit seguem em 602, porque a rodada não tocou unit. Os e2e foram de 543 para **546** (+3, os testes da T56). Os números do orquestrador batem.
- **Integridade**: `git diff --numstat c1d30ed..HEAD` dá 0 linhas removidas em `test/`. A única linha removida é de `tasks.md`, uma frase da Fase 9b reescrita. Nenhum teste foi apagado ou enfraquecido.

---

## Discrimination Sensor

**Profundidade**: P0 expandido (autorização, integridade de dados e concorrência).

**Como rodei a rodada 3**:
- Criei o worktree com `git worktree add --detach <scratchpad>/wt-final-r3 HEAD` (`65fc3bd`). `node_modules` entrou como link simbólico, e o `.env` foi copiado para apontar o Postgres de `:5433`.
- O baseline no worktree deu 181/181 em `CE`, `KE`, `AE`, `TH/admin-empresas.e2e-spec.ts` e `TH/openapi-exportacao.e2e-spec.ts`.
- Um script aplicou cada mutante como substituição exata, exigindo uma única ocorrência da âncora. Para cada um, rodou em sequência, nunca em paralelo, as suites que cobrem o código e, à parte, a suite de paridade do OpenAPI (`--json`). Depois reverteu com `git checkout --` e conferiu o sha256 do arquivo restaurado: 14 de 14 restaurados.
- Nenhuma morte veio de erro de compilação ou de suite quebrada. Todas são falhas de asserção.
- No fim, apaguei o link, removi o worktree com `git worktree remove --force` e rodei `git worktree prune`. `git worktree list` mostra só a árvore real.

**Isolamento**: o `git status --porcelain` da árvore real estava vazio antes do gate e do sensor e continuou vazio depois; o `diff` entre os dois deu idêntico. Não usei `git stash`.

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
| S10 | Papel da rota de empresa | `C/campanhas.controller.ts:177` | `@Roles(EMPRESA, ADMIN)` | ✅ `CE:502`, `CE:625`, `CE:1093` |
| S11 | Papel da rota de admin | `C/admin-campanhas.controller.ts:44` | `@Roles(ADMIN, EMPRESA)` | ✅ `KE:328` |
| S12 | `@Public` | `C/campanhas-publicas.controller.ts:95` | removido | ✅ 22 testes de `PE` |
| S13 | 403 da spec | `C/campanhas.controller.ts:407` | o ramo `NotAllowedError` nunca casa | ✅ `CE:518`, `CE:1073`, `CE:1357`, `CE:1623` |
| S14 | `CamposPendentesError` → `errors` | `C/campanhas.controller.ts:416` | o ramo nunca casa | ✅ `CE:1460` |
| S15 | Multer, 5 MB exatos | `C/campanhas.controller.ts:57` | sem o `+1` | ✅ `CE:1176` |
| S16 | Multer, +1 recusado | `C/campanhas.controller.ts:57` | `+2` | ✅ `CE:1187` |
| S17 | 503 do PUT capa | `C/campanhas.controller.ts:323-329` | a falha do storage vira 422 | ✅ `CE:1246` |
| S18 | Remoção da capa anterior | `C/campanhas.controller.ts:347-349` | não remove | ✅ `CE:1265` |
| S19 | Remoção da capa nova na falha | `C/campanhas.controller.ts:342` | não remove | ✅ `CE:1297`, `CE:1320`, `CE:1357` |
| S20 | 503 da capa pública | `C/campanhas-publicas.controller.ts:131` | `.catch(() => null)` | ✅ `PE:407` |
| S21 | 404 idêntico da capa | `C/campanhas-publicas.controller.ts:134` | `NotFoundException('Campanha sem capa')` | ✅ `PE:394` |
| S22 | Omissão na pública | `C/campanhas-publicas.controller.ts:98-100` | devolve também o `idPublico` | ✅ `PE:116`, `PE:155` |
| S23 | Portão da capa pública | `C/campanhas-publicas.controller.ts:124-126` | ignora o 404 do caso de uso | ✅ `PE:365`, `PE:379` |
| S24 | `nosniff` | `C/campanhas-publicas.controller.ts:119` | removido | ✅ `PE:340` (×2) |
| S25 | CSP | `C/campanhas-publicas.controller.ts:120` | removido | ❌ sobreviveu na rodada 1 → T54; ✅ morto na rodada 2 |
| S26 | `Content-Type` da capa | `C/campanhas-publicas.controller.ts:138` | `application/octet-stream` | ✅ `PE:340` (×2) |
| S27 | Fila de reenvio | `src/infra/mail/mailer-resiliente.ts:17` | sem `CAMPANHA_REJEITADA` | ✅ `mailer-resiliente.spec.ts:36`, `AE:455` |
| S28 | Fila de reenvio | `src/infra/mail/mailer-resiliente.ts:18` | sem `ALTERACAO_CAMPANHA_REJEITADA` | ✅ `mailer-resiliente.spec.ts:36`, `AE:762` |
| S29 | Acesso da dona à capa | `src/infra/arquivo/arquivo.service.ts:141-142` | sem `campanha?.empresa` | ✅ `FE:540` |
| S30 | Auditoria (scratch, domínio) | `U/aprovar-campanha.ts:73` | `registrar` não chamado | ✅ `AE:217` |
| S31 | M30 (scratch, domínio) | `U/buscar-campanha-publica.ts:59` | sem a checagem de UUID | ⚪ Equivalente (`id_publico` é TEXT → `null` → o mesmo 404) |
| S32 | `Content-Disposition` | `C/campanhas-publicas.controller.ts:139` | `attachment` | ❌ sobreviveu na rodada 1 → T54; ✅ morto na rodada 2 |
| S33 | 422 de forma da rejeição de alteração | `C/admin-campanhas.controller.ts:215` | sem `ZodValidationPipe(rejeicaoSchema)` | ❌ sobreviveu na rodada 1 → T55; ✅ morto na rodada 2 |

### Rodada 2 (`04a22f6`; linhas de teste atualizadas para HEAD)

| # | Alvo | File:line | Mutação | Resultado (teste que matou) |
| - | ---- | --------- | ------- | --------------------------- |
| S25 ↻ | CSP | `C/campanhas-publicas.controller.ts:120` | removido | ✅ `PE:340` (PNG e JPEG, asserção de `PE:355`) |
| S32 ↻ | `Content-Disposition` | `C/campanhas-publicas.controller.ts:139` | `attachment` | ✅ `PE:340` (PNG e JPEG, asserção de `PE:358`) |
| S33 ↻ | 422 de forma da rejeição de alteração | `C/admin-campanhas.controller.ts:215` | sem o pipe | ✅ `AE:801` |
| S34 | Pipe zod do PATCH | `C/campanhas.controller.ts:271` | `@Body() dados`, sem o pipe | ❌ sobreviveu na rodada 2 → T56; ✅ morto na rodada 3 |
| S35 | Pipe zod do POST | `C/campanhas.controller.ts:215` | `@Body() dados`, sem o pipe | ✅ `CE:459` |
| S36 | Status do PUT capa | `C/campanhas.controller.ts:299` | sem `@HttpCode(204)` (vira 200) | ✅ `CE:1151` (×2), `CE:1176`, `CE:1265`, `CE:1282` |
| S37 | `@Roles` de uma rota individual | `C/admin-campanhas.controller.ts:211` | `@Roles(ADMIN, EMPRESA)` no método | ✅ `KE:337` |
| S38 | Filtro de `listarEmAnalise` | `src/infra/database/prisma/prisma-campanha-repository.ts:116` | sem o ramo `{ status: EM_ANALISE }` | ✅ `RE:786`, `AE:97` |
| S39 | Erro → status | `src/domain/fivo/application/errors/alteracao-ja-pendente.error.ts:4` (scratch) | 409 → 422 | ✅ `CE:879` |
| S40 | Erro → status | `src/domain/fivo/application/errors/beneficiada-indisponivel-na-decisao.error.ts:7` (scratch) | 409 → 422 | ✅ `AE:263` (×3), `AE:282`, `AE:645` |
| S41 | `@Public` da capa pública | `C/campanhas-publicas.controller.ts:117` | removido | ✅ `PE:340` (×2), `PE:365`, `PE:379`, `PE:394` (×2), `PE:407` |
| S42 | Autor da auditoria no PATCH | `C/campanhas.controller.ts:279` | `usuarioId: empresaId` | ✅ `CE:727`, `CE:824` (×3) |
| S43 | Autor da auditoria na submissão | `C/campanhas.controller.ts:375` | `usuarioId: empresaId` | ✅ `CE:1414` |
| S44 | Status da aprovação de alteração | `C/admin-campanhas.controller.ts:185` | sem `@HttpCode(204)` (vira 201) | ✅ `AE:574`, `AE:620` |
| S45 | Descarte de chaves no POST | `src/infra/http/campanhas.dto.ts:42` | `z.object` → `z.looseObject` | ❌ sobreviveu na rodada 2 → T56; ✅ morto na rodada 3 |
| S46 | Descarte de chaves no PATCH | `src/infra/http/campanhas.dto.ts:50` | `z.object` → `z.looseObject` | ❌ sobreviveu na rodada 2 → T56; ✅ morto na rodada 3 |

### Rodada 3 (`65fc3bd`)

Os mutantes novos atacam as quatro rotas com corpo (POST e PATCH da empresa, e as duas rejeições do admin), o pipe que elas compartilham e a ordem do spread, seguindo L-034. Antes, conferi o que dá para atacar:
- As rotas de aprovação, aprovação de alteração e submissão não recebem `@Body` (`C/admin-campanhas.controller.ts:136-139`, `:186-189`; `C/campanhas.controller.ts:366-369`). Nelas, mass-assignment não é possível por construção.
- Os controllers do admin não espalham o corpo. As duas rejeições desestruturam só `{ motivo }` (`C/admin-campanhas.controller.ts:161`, `:215`), então ali também não existe ordem de spread para inverter.
- Os únicos spreads do corpo junto de ids da sessão nesta feature são `C/campanhas.controller.ts:221` e `:277-282`.

| # | Alvo | File:line | Mutação | Resultado (teste que matou) |
| - | ---- | --------- | ------- | --------------------------- |
| S34 ↻ | Pipe zod do PATCH | `C/campanhas.controller.ts:271` | `@Body() dados`, sem o pipe | ✅ `CE:1031` (500 em vez de 422) e `CE:1048` (a campanha alheia é renomeada) |
| S45 ↻ | Descarte de chaves no POST | `src/infra/http/campanhas.dto.ts:42` | `z.looseObject` | ✅ `CE:473` (gravada na outra empresa). A paridade do OpenAPI também cai (`TH/openapi-exportacao.e2e-spec.ts:19`) |
| S46 ↻ | Descarte de chaves no PATCH | `src/infra/http/campanhas.dto.ts:50` | `z.looseObject` | ✅ `CE:1048`. A paridade do OpenAPI também cai |
| S47 | Pipe da rejeição de campanha | `C/admin-campanhas.controller.ts:161` | `@Body() { motivo }`, sem o pipe | ✅ `AE:440` |
| S48 | Descarte de chaves da rejeição | `src/infra/http/admin-empresas.dto.ts:14` | `rejeicaoSchema` com `z.looseObject` | ✅ só pela paridade do OpenAPI (`TH/openapi-exportacao.e2e-spec.ts:19`). Em comportamento é equivalente: os três controllers que usam o schema desestruturam só `motivo` (`C/admin-campanhas.controller.ts:161`, `:215`; `C/admin-empresas.controller.ts:124`), e `AE`, `KE` e `TH/admin-empresas.e2e-spec.ts` passam |
| S49 | Forma da rejeição de campanha | `C/admin-campanhas.controller.ts:161` | pipe com `rejeicaoSchema.partial()`, motivo opcional | ✅ `AE:440` |
| S50 | Forma da rejeição de alteração | `C/admin-campanhas.controller.ts:215` | pipe com `rejeicaoSchema.partial()` | ✅ `AE:801` |
| S51 | Descarte de chaves no pipe compartilhado | `src/infra/http/pipes/zod-validation.pipe.ts:11` | `return value as T` (valida, mas devolve o corpo cru) | ✅ `CE:473` e `CE:1048` |
| S52 | Descarte de chaves no POST, invisível ao OpenAPI | `C/campanhas.controller.ts:215` | pipe com `criarCampanhaSchema.loose()` | ✅ `CE:473` |
| S53 | Descarte de chaves no PATCH, invisível ao OpenAPI | `C/campanhas.controller.ts:271` | pipe com `editarCampanhaSchema.loose()` | ✅ `CE:1048` |
| S54 | Schema trocado no PATCH | `C/campanhas.controller.ts:271` | `ZodValidationPipe(criarCampanhaSchema)`, o que torna o nome obrigatório | ✅ 22 testes de `CE` (de `CE:701` a `CE:1031`) e `KE` (×2) |
| S55 | Schema trocado no POST | `C/campanhas.controller.ts:215` | `ZodValidationPipe(editarCampanhaSchema)`, o que torna o nome opcional | ✅ `CE:459` |
| S56 | Tipo do nome no PATCH | `src/infra/http/campanhas.dto.ts:51` | `nome: z.any().optional()` | ✅ `CE:1031`. A paridade do OpenAPI também cai |

S52 e S53 mostram o que a T56 vale de fato. S45 e S46 também mudam o `openapi.json`, e por isso a paridade os pegaria, mas isso só aconteceria por acaso: quem rodasse `npm run openapi:export` faria o teste passar de novo. Na rodada 2, que rodou só `CE` e `KE`, essa morte não apareceu. Os afrouxamentos feitos direto no pipe não tocam o OpenAPI, e quem os mata são os testes de corpo da T56.

**Sonda P1, fora da contagem.** Acrescentei `capaArquivoId` à allowlist do PATCH (`editarCampanhaSchema.extend({ capaArquivoId })` no pipe de `C/campanhas.controller.ts:271`), e `CE` e `KE` seguiram verdes (125/125). Não conto P1 como sobrevivente, porque ele não injeta uma falha no código existente: ele acrescenta um campo ao contrato da rota, o que salta à vista no diff e na revisão. O risco existe, porém. `U/editar-campanha.ts:61` aceita `capaArquivoId` sem conferir tipo nem dono, porque confia que só o PUT da capa o preenche, depois de validar o conteúdo. Registro isso como F6.

**Result**: PASS ✅. A rodada 3 injetou 13 mutantes (3 reexecuções e 10 novos) e matou os 13, sem sobrevivente e sem equivalente; S48 morreu só pela paridade do OpenAPI e, em comportamento, é equivalente. No acumulado das três rodadas, são 56 mutantes distintos (S1–S56): 55 mortos, 0 sobreviventes e 1 equivalente (S31).

---

## Decisões dos autores

Mantenho as decisões das rodadas 1 e 2. A rodada não mexeu em produção, então nenhum julgamento muda.

| # | Decisão | Julgamento |
| - | ------- | ---------- |
| 1 | 403 com a mensagem da spec via `ForbiddenException` em `executar` | **Aceita.** Todo `NotAllowedError` que chega a esse controller sai de `U/assegurar-empresa-aprovada.ts:28`. O 403 do `RolesGuard` ("Acesso negado") não passa por ali (`KE:357-361`). S13 morto. O risco latente está em F3 |
| 2 | `CamposPendentesError` → 422 com `errors` | **Aceita.** Usa o mesmo formato do pipe (`CE:459-471`). S14 morto |
| 3 | Capa ausente no PUT → 422 | **Aceita** (`CE:1230-1244`). A precedência fica em SP4 |
| 4 | `AssegurarBeneficiadaDisponivelUseCase` no `HttpModule` | **Aceita** (`src/infra/http/http.module.ts:102`) |
| 5 | Helper `forcarEstado` | **Aceita.** Só roda sobre campanhas completas, e os fluxos reais estão cobertos em `AE`, `PE` e `KE` |
| 6 | M30: formato barrado no caso de uso | **Aceita.** S31 é equivalente |
| 7 | Troca de capa concorrente pode deixar capa órfã | **Confirmada e não bloqueante** (F1) |
| 8 | A corrida entre edição e aprovação aceita 200 + 204 ou 409 | **Aceita.** O invariante está em `KE:224-233`, e o CAS em `RE:501-529` |
| 9 | Submissão AC8 (apta ao selo) sem rota | **Aceita.** O domínio está coberto em `E/campanha.spec.ts:420-441`, e a superfície HTTP chega com `selo-e-qrcode` |
| 10 | Auditoria de alteração com `compromissoNovo` e `compromissoProposto` | **Aceita como está** (F4) |
| 11 | Done-when da T29 emendada (P13 no design) | **Aceita** (`design.md:183`, `RE:740-756`) |
| 12 | (rodada 2) T54 sem a parte opcional de OpenAPI | **Aceita.** A Done-when não pedia documentar os cabeçalhos, e F2 segue aberto |
| 13 | (rodada 3) A T56 não confere a auditoria com `usuarioId` alheio no corpo | **Aceita.** A edição de `RASCUNHO` não gera auditoria. O descarte é do objeto inteiro, e `campanhaId`/`empresaId` já o vigiam (S46, S51, S53). O autor vindo da sessão continua coberto por S42 |

---

## Code Quality

| Princípio | Status | Nota |
| --------- | ------ | ---- |
| Diff da rodada só de teste | ✅ | `git diff c1d30ed..HEAD -- src openapi.json` vazio; 0 linhas removidas em `test/` |
| Nada de domínio no diff da infra | ✅ | AD-021 respeitado |
| Aderência ao design | ✅ | Sem mudança desde a rodada 1 |
| Código mínimo e mudanças cirúrgicas | ✅ | A T56 tem +61 linhas, em três `it`, todas em `CE` |
| Padrões existentes | ✅ | Os testes novos usam os helpers `linha`, `editar`, `linhasDeCampanha` e `cenario.criarEmpresa` e seguem o formato de `CE:459-471` e `CE:1017-1029` |
| Spec-anchored outcome check | ✅ | 47/47 no valor da spec |
| Cobertura por camada (rotas: happy + edge + 401/403/404/409/422/503) | ✅ | As 12 rotas novas estão completas. POST e PATCH agora provam o 422 de forma e o descarte de chaves fora do DTO |
| Todo teste mapeia para AC, edge case ou Done-when | ✅ | Os três testes novos mapeiam para a Criação AC18 e para a Done-when da T56 |
| Guidelines documentadas | ✅ | O projeto não tem nenhuma; apliquei a Test Coverage Matrix de `tasks.md` |
| Senior engineer aprovaria? | ✅ | Sim. A fronteira de tenant do corpo agora tem teste. F5 fica como defesa em profundidade |

---

## Spec-Precision Gaps

| # | AC | Problema | Estado |
| - | -- | -------- | ------ |
| SP1 | Criação AC5, AC6, AC8 e AC11; Submissão AC3 | A spec diz só "HTTP 422", e as mensagens vêm do design | Aberto, não bloqueia (L-011) |
| SP2 | Submissão AC6 ("empresa"); Consulta AC1 ("nome da empresa", "imagem de capa quando houver") | Termo guarda-chuva, que o design resolve como `nomeFantasia` e `temCapa` | Aberto, não bloqueia (L-019) |
| SP4 | Criação AC1 × PUT capa | A spec não diz se o 403 do portão vence o 422 de forma e o 503 da dependência. Hoje o 422 ou o 503 sai antes do 403, sem gravar nada (`CE:1357-1374`) | Aberto, não bloqueia (L-033) |

---

## Fix Plans

Nenhum. Não há lacuna de AC nem mutante sobrevivente. A Fase 9b (T54, T55 e T56) está fechada.

---

## Follow-ups não bloqueantes

1. **F1, capa órfã (decisão 7).** Varrer periodicamente os `arquivo` do tipo `IMAGEM_CAMPANHA` sem `campanha`, ou fazer o `EditarCampanhaUseCase` devolver a capa substituída (domínio, grupo).
2. **F2, OpenAPI da capa pública.** Documentar `X-Content-Type-Options`, `Content-Security-Policy` e `Content-Disposition` na resposta 200, como em `C/arquivo.controller.ts:21-27`.
3. **F3, `executar`.** Restringir o ramo `NotAllowedError` à mensagem do portão, ou documentar que um `NotAllowedError` novo vaza a própria mensagem.
4. **F4, domínio (grupo).** Já está no `STATE.md`: JSDoc P13 em `CampanhaRepository.salvar`, chave única de compromisso nas auditorias de alteração e `consoleError.mockRestore()` em `finally`.
5. **F5, defesa em profundidade.** Montar a entrada dos casos de uso com os ids da sessão **depois** do spread (`{ ...dados, empresaId, usuarioId, campanhaId: id }`), ou listar os campos um a um, em `C/campanhas.controller.ts:221` e `:277-282`. A T56 agora vigia o descarte, mas a ordem atual continua fazendo dele a única barreira.
6. **F6, `capaArquivoId` fora do PATCH (novo, sonda P1).** Acrescentar ao teste de `CE:1048` uma chave `capaArquivoId` no corpo e conferir que a capa não muda. A outra saída é o `EditarCampanhaUseCase` validar o tipo e o dono do arquivo de capa. Hoje só a allowlist do DTO impede que o PATCH aponte a capa para um arquivo sem a validação por conteúdo da Criação AC13.
7. **F7, L-034 em outras features (novo, fora do escopo).** `C/cadastro-empresa.controller.ts:233` monta `{ empresaId, ...dados, logoArquivoId }` com o mesmo padrão, e há spreads em `C/admin-causas.controller.ts:96`, `:124` e `C/cadastro-instituicao.controller.ts:171`. Esses arquivos não estão no diff desta feature e não os verifiquei. Vale aplicar L-034 neles quando suas features forem revistas.
8. **SP4.** Fixar na spec a precedência entre 403, 422 de forma e 503, ou mover o upload da capa para depois do portão.

---

## Requirement Traceability Update

Não editei o `spec.md`. Proponho que o orquestrador aplique este status:

| Requirement | Status anterior | Status proposto |
| ----------- | --------------- | --------------- |
| CAMP-01 | Domínio verificado · infra em Tasks (rodada 2: Needs Fix T56) | ✅ Verified |
| CAMP-02 | Domínio verificado · infra em Tasks | ✅ Verified |
| CAMP-03 | Domínio verificado · infra em Tasks | ✅ Verified |
| CAMP-04 | Domínio verificado · infra em Tasks | ✅ Verified |
| CAMP-05 | Domínio verificado · infra em Tasks | ✅ Verified |
| CAMP-06 | Domínio verificado · infra em Tasks | ✅ Verified |
| CAMP-07 | Domínio verificado · infra em Tasks | ✅ Verified |
| CAMP-08 | Domínio verificado · infra em Tasks | ✅ Verified |
| CAMP-11 | Domínio verificado · infra em Tasks | ✅ Verified |
| CAMP-09, CAMP-10 | Deferred | Deferred |

---

## Histórico

| Rodada | HEAD | Gate | Sensor | Veredito | Saída |
| ------ | ---- | ---- | ------ | -------- | ----- |
| 1 | `f869eef` | unit 602; e2e 542 em 35 suites | 33 injetados: 29 mortos, 3 sobreviventes (S25, S32, S33) e 1 equivalente | ❌ | Abriu T54 (CSP e `Content-Disposition`) e T55 (422 sem motivo), ambas Minor e só de teste. Lições L-031, L-032 e L-033 |
| 2 | `04a22f6` | unit 602; e2e 543 em 35 suites | 16 injetados: 13 mortos e 3 sobreviventes (S34, S45, S46) | ❌ | Confirmou T54 e T55. Abriu T56 (Major, só teste) e o follow-up F5. Lição L-034 |
| 3 | `65fc3bd` | unit 602; e2e 546 em 35 suites | 13 injetados: 13 mortos e 0 sobreviventes | ✅ | Confirmou T56. Nenhuma fix task. Follow-ups F6 e F7. Nenhuma lição nova |

---

## Summary

**Overall**: ✅ Ready. A Fase 9b fechou as seis lacunas de teste das rodadas 1 e 2. O código de produção está correto desde a rodada 1 e segue intocado.

**Spec-anchored check**: 47/47 ACs P1 no valor da spec. SP1, SP2 e SP4 seguem abertos e não bloqueiam.
**Sensor**: na rodada 3, 13 de 13 mortos. No acumulado, 55 mortos, 0 sobreviventes e 1 equivalente (S31), em 56 mutantes.
**Gate**: build, tsc, eslint e unit 602/602 ok; e2e 546/546 em 35 suites. Nenhum teste foi apagado ou enfraquecido.
**Lições**: nenhuma nova. A rodada não teve sobrevivente, AC sem evidência nem gate vermelho. SP1, SP2 e SP4 vêm de rodadas anteriores e já têm lição (L-011, L-019, L-033). L-034 não se repetiu em outra feature, então nada foi promovido.

**O que funciona**:
- A fronteira de tenant do corpo em POST e PATCH: S34, S45, S46, S51, S52 e S53 morrem.
- O 422 de forma do PATCH e das duas rejeições do admin: S47, S49, S50, S54, S55 e S56 morrem.
- Todo o resto das rodadas 1 e 2 segue igual.

**Próximos passos**:
1. O orquestrador aplica a rastreabilidade acima no `spec.md` e atualiza o `STATE.md`.
2. O orquestrador decide se F5 e F6 viram tasks antes do merge. Nenhum dos dois bloqueia.

**validate_state**: `python3 .claude/skills/tlc-spec-driven/scripts/validate_state.py campanhas` saiu com exit 0.
