# Validation: catalogo-instituicoes (feature consolidada, infra T21–T34 + correções T51–T53) — PASS

**Veredito**: ✅ **PASS** na rodada 2 de 3. As duas lacunas da rodada 1 foram fechadas com evidência:

1. **Edge case "documento inacessível durante a análise"** (`spec.md:196`): a fila agora traz `documentoDisponivel` por item. O item com documento ilegível continua na fila com `false`, e a aprovação dele responde 503 sem mudar o estado. Isso foi provado em unit e por HTTP, e documentado no OpenAPI.
2. **Guardas de papel** (M26 e M27): os dois mutantes, reaplicados, agora morrem no sweep com corpo vazio, que recebe 422 em vez de 403.

O gate `build` está todo verde (build, tsc, eslint, unit 333/333, e2e 337/337). Na rodada 2 o sensor rodou 15 mutantes: 14 foram mortos e 1 sobreviveu, e esse 1 é equivalente pela saída da spec. Não resta nenhum AC falho nem mutante vivo não equivalente. Os 7 spec-precision gaps da rodada 1 continuam sinalizados e não bloqueiam. Há uma observação sem efeito no veredito: o commit intermediário `c46080b` deixa 1 e2e vermelho até `2a123fb`.

**Data**: 2026-10-14 (rodada 2) · 2026-10-13 (rodada 1)
**Spec**: `.specs/features/catalogo-instituicoes/spec.md`
**Diff range consolidado**: `cb28127..03a2879`. A rodada 1 cobriu `cb28127..a5af170` (T21–T34). A rodada 2 cobre `a5af170..03a2879`: `c46080b` T51, `2a123fb` T52, `43fb974` T53, mais os commits de docs `5f5846c` e `03a2879`. A metade de domínio (T1–T20 + 5b) passou em `validation-dominio.md` (rodada 3, PASS). No range da rodada 2, `src/domain/**` mudou apenas em `listar-fila-instituicoes.ts` e no `.spec.ts` dele, por exceção de autoria registrada no `STATE.md` (2026-10-14, T51).
**Verifier**: sub-agente independente (autor ≠ verificador), rodada 2. Leu `src/` e `test/` sem alterar nada. Os mutantes rodaram só num `git worktree` descartável. Este arquivo é o único que ele escreve.
**Escopo**: P1 apenas (INST-01…INST-10). P2 (INST-11…13) fica para outra rodada. Sem UAT (backend).

---

## Rodada 2 (2026-10-14, `a5af170..03a2879`)

### Gate Check

- **Gate command** (`tasks.md`, Build): `cd api && npm run build && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json`. Cada etapa rodou em separado, com a saída redirecionada para arquivo e o exit code registrado, sem `tail`. Pré-requisitos: `docker compose -f docker-compose.test.yml up -d --wait` deu exit 0 (`fivo-postgres-test` :5433) e `npx prisma migrate deploy` deu exit 0. O `custos-obras-db` não foi tocado.

| Etapa | Exit | Resultado |
| ----- | ---- | --------- |
| `npm run build` | 0 | ok |
| `tsc --noEmit` | 0 | ok |
| `eslint` | 0 | saída vazia |
| `jest` (unit) | 0 | 43 suites, **333/333**, 0 skip |
| `jest e2e` | 0 | 30 suites, **337/337**, 0 skip |

- **Contagem**: unit 332 → 333 (+1, o teste por item da T51). e2e 334 → 337 (+1 da T52; +2 linhas `corpo vazio` no `it.each` do sweep da T53). Bate com o que o autor reportou (unit 333, e2e 337).
- **Integridade**: nenhum `.skip`, `.only`, `xit` ou `xdescribe` em `src/` ou `test/`. Nenhum `// SPEC_DEVIATION`. Duas asserções pré-existentes mudaram, e as duas ficaram mais fortes: (i) o `toEqual` exato da fila (`test/http/admin-instituicoes.e2e-spec.ts:174-200`) ganhou `documentoDisponivel: true` nas linhas `:185` e `:198`; (ii) o sweep (`test/http/catalogo-concorrencia.e2e-spec.ts:271-311`) manteve as linhas de corpo válido e ganhou as de corpo vazio. Nenhuma asserção foi afrouxada.
- **Commit intermediário `c46080b`** (T51, gate `quick`): ali, `admin-instituicoes.e2e-spec.ts` fica com 1 teste vermelho (35/36). O `toEqual` exato da fila recebe `documentoDisponivel: true`, que o teste ainda não esperava. Isso foi reproduzido no worktree descartável: `jest --config ./test/jest-e2e.json test/http/admin-instituicoes.e2e-spec.ts` deu exit 1, e `tsc` deu 0. `2a123fb` (T52) corrige. **Julgamento: não afeta o veredito.** O HEAD está verde, e nenhum AC nem mutante depende do estado intermediário. O custo é real, porém: um commit do branch não passa no gate `full`, o que atrapalha `git bisect` e um CI por commit. A causa é a T51 ter recebido o gate `quick` mesmo mudando um payload que um e2e afirma por igualdade exata. Isso foi registrado como lição (ver abaixo).

### Task Completion (T51–T53)

| Task | Status | Notas |
| ---- | ------ | ----- |
| T51 Fila sinaliza documento indisponível | ✅ | `listar-fila-instituicoes.ts:71-76` consulta `VerificadorDeDocumento.estaLegivel` por item, e `:88` expõe o resultado. Um teste com duas instituições na mesma fila. N1–N3, N5 e N6 mortos. Gate `quick` passou no commit, mas o `full` não passaria (ver acima) |
| T52 `documentoDisponivel` na rota da fila | ✅ | `admin-instituicoes.controller.ts:77` (`required`) e `:93-97` (propriedade); `openapi.json:1153-1156`, `:1180`; e2e `admin-instituicoes.e2e-spec.ts:204-245`. N4 morto |
| T53 Guards de papel no sweep | ✅ | `catalogo-concorrencia.e2e-spec.ts:274-275` (linhas `{}`). M26, M27, N7 e N8 mortos. Ressalva de texto: o título da task e o commit dizem "corpo válido", mas são as linhas de corpo **vazio** que matam os mutantes. A 1ª Done-when ("…com um corpo que passaria na validação (ou `{}` onde a rota não exige corpo)") também não descreve o `{}` nas rotas com corpo obrigatório. O "What" já foi corrigido em `03a2879`. É cosmético |

### Lacuna 1: fechada (edge case `spec.md:196`, metade "exibir")

Saída que a spec define: "SHALL exibir ao administrador o item como temporariamente indisponível **e** SHALL bloquear a aprovação com HTTP 503 até que o arquivo volte a ser legível". Por conjunção, o mesmo item tem que (a) continuar na fila, (b) vir marcado como indisponível e (c) ter a aprovação recusada com 503, sem mudar de estado.

| Parte do edge case | `file:line` + asserção | Result |
| ------------------ | ---------------------- | ------ |
| Sinal **por item**, e o item ilegível continua na fila com os demais campos (unit) | `src/domain/fivo/application/use-cases/listar-fila-instituicoes.spec.ts:259-262` (só o `arquivoId` da **segunda** instituição falha no fake); `:272-299` `expect(fila.value).toEqual([{…legível, documentoDisponivel: true}, {…ilegível, documentoDisponivel: false}])`, com os 11 campos exatos de cada item (`:283`, `:296`) | ✅ |
| Caminho feliz `true` (unit) | `listar-fila-instituicoes.spec.ts:124`, `:209` (`toEqual` exato com `documentoDisponivel: true`) | ✅ |
| Por HTTP: objeto real removido do storage de um só documento → o item continua listado com `false`, e o outro vem `true` | `test/http/admin-instituicoes.e2e-spec.ts:215` `storage.arquivos.delete(chaveStorage)` (só o da segunda); `:219` `fila.status).toBe(200)`; `:220-233` `fila.body).toEqual([objectContaining({id: legivel…, documentoDisponivel: true}), objectContaining({id: ilegivel…, documentoDisponivel: false})])`. O array tem 2 itens, então o ilegível não saiu da fila | ✅ |
| Aprovação **desse** item → 503, e o estado não muda | `admin-instituicoes.e2e-spec.ts:235-245`: `aprovacao.status).toBe(503)`, `message: 'Documento temporariamente indisponível'`, `status).toBe(PENDENTE_APROVACAO)`. Para auditoria 0 e nenhum e-mail no 503: `:294-313` (`registroAuditoria.count()).toBe(0)`, `mailer.mensagens).toEqual([])`) | ✅ |
| Payload exato da rota com o campo | `admin-instituicoes.e2e-spec.ts:174-200` `body).toEqual([...])` exato, com `documentoDisponivel: true` (`:185`, `:198`) | ✅ |
| Contrato OpenAPI | `src/infra/http/controllers/admin-instituicoes.controller.ts:77` (em `required`), `:93-97` (`type: 'boolean'`, descrição "`false` = temporariamente indisponível; a aprovação responde 503…"); `openapi.json:1153-1156`, `:1180`. `openapi-exportacao` e `openapi-paridade` verdes no gate | ✅ |

**Regra de payload/conjunção**: atendida. O valor do campo é conferido nos dois sentidos (`true`/`false`), no item certo, sem tirar o item da fila e junto com o 503 da aprovação. O e2e da linha ilegível usa `objectContaining`, mas a conjunção com os demais campos está no unit `:272` (exato), e o controller só repassa `...item` (`admin-instituicoes.controller.ts:111-114`), cujo formato exato é conferido em `:174-200`. A representação `documentoDisponivel: boolean`, com o texto "temporariamente indisponível" renderizado no `web`, segue o mesmo padrão já aceito para `cnpjCoincideComEmpresa`, o edge case vizinho em `spec.md:195`.

### Lacuna 2: fechada (M26 e M27 mortos)

Saída que a spec define: P1-Causas AC6 ("IF um usuário sem papel de administrador chamar endpoints de escrita de causa THEN 403") e P1-Aprovação AC8 ("…qualquer endpoint de aprovação, rejeição… THEN 403 e nenhum estado alterado"), sem condição sobre o corpo.

| AC | `file:line` + asserção | Result |
| -- | ---------------------- | ------ |
| P1-Causas AC6 e P1-Aprovação AC8 (403 com qualquer corpo, para EMPRESA e INSTITUICAO, nas 9 rotas lidas do OpenAPI) | `test/http/catalogo-concorrencia.e2e-spec.ts:271-276` `it.each` com `CORPO_VALIDO` e `{}` para cada papel; `:284` `rotas).toHaveLength(9)`; `:294-298` `[metodo, caminho, resposta.status]).toEqual([metodo, caminho, 403])`; `:301-309` causa intacta, instituição `PENDENTE_APROVACAO`, `registroAuditoria.count()).toBe(0)` | ✅. A guarda agora é discriminada |

Morte medida no worktree (os logs apontam a asserção, não erro de compilação):
- **M26** (`@Roles(UserRole.ADMIN)` removido de `admin-causas.controller.ts:65`): 2 falhas, `toda rota responde 403 para EMPRESA|INSTITUICAO autenticada com corpo vazio`, com diff `["post", "/admin/causas", 403 → 422]`.
- **M27** (`@Roles(UserRole.ADMIN)` removido de `admin-instituicoes.controller.ts:43`): 2 falhas nos mesmos testes, com diff `["post", "/admin/instituicoes/{id}/rejeicao", 403 → 422]`.

**Sobre a linha `{}` nas rotas sem corpo obrigatório**: nas 7 rotas sem corpo obrigatório, a linha `{}` não acrescenta discriminação. Aprovação, suspensão, reativação e inativação não têm corpo, a fila é um GET e a inativação de causa também não tem corpo. Nelas o caso de uso também nega com 403. O sonda N9 mostra isso: liberar EMPRESA na guarda da suspensão sobrevive. Mesmo assim, é **equivalente pela saída da spec**, porque a resposta continua 403 e o estado continua intacto, conferidos pelo próprio sweep. Nas rotas com corpo obrigatório (POST de causa e rejeição), a linha `{}` discrimina por papel e por rota: N7 (só a rejeição aceita EMPRESA) e N8 (só o POST de causa aceita INSTITUICAO) morrem cada um numa única linha `corpo vazio`. Não há vacuidade que esconda uma regressão observável.

### Discrimination Sensor (rodada 2)

**Profundidade**: expandida (P0: autorização e o 503 de documento sensível). Mutantes num `git worktree add --detach <scratchpad>/verify-wt2 03a2879`, com `node_modules` como link simbólico e `.env` copiado. Um script (`mutantes2.py` no scratchpad) aplicava cada mutação com âncora de ocorrência única, rodava os specs afetados (unit e/ou e2e, em sequência, no mesmo banco de teste) e restaurava o arquivo com `git checkout --` no worktree. Nenhuma morte veio de erro de compilação: os logs não têm `error TS` nem `Test suite failed to run`. No fim, o link foi apagado e o worktree removido com `git worktree remove --force` e `git worktree prune`. **Isolamento**: `git status --porcelain` da árvore real vazio antes e vazio depois (`diff` idêntico). `git stash list` vazio, `git stash` não usado.

| # | File:line (`03a2879`) | Mutação | Killed? (teste que matou) |
| - | --------------------- | ------- | ------------------------- |
| N1 | `src/domain/fivo/application/use-cases/listar-fila-instituicoes.ts:74-76` | `documentoDisponivel` fixo em `true` | ✅ unit `:214` (por item); e2e `admin-instituicoes.e2e-spec.ts:204` |
| N2 | `listar-fila-instituicoes.ts:74` | `!estaLegivel(...)` (negação) | ✅ 3 unit; 2 e2e (`:174`, `:204`) |
| N3 | `listar-fila-instituicoes.ts:75` | `instituicoes[0].documento` (o sinal do primeiro item vale para todos) | ✅ unit `:214`; e2e `:204` |
| N4 | `src/infra/http/controllers/admin-instituicoes.controller.ts:111-114` | controller descarta o campo (`documentoDisponivel: undefined`) | ✅ e2e `:174`, `:204` |
| N5 | `listar-fila-instituicoes.ts:49-52` | item com documento ilegível sai da fila | ✅ unit `:214`; e2e `:204` |
| N6 | `listar-fila-instituicoes.ts:74-76` | `documentoDisponivel` fixo em `false` | ✅ 3 unit; 2 e2e |
| M26 | `src/infra/http/controllers/admin-causas.controller.ts:65` | `@Roles(ADMIN)` removido (reaplicado da rodada 1) | ✅ `catalogo-concorrencia` corpo vazio ×2 (`/admin/causas` 403→422) |
| M27 | `admin-instituicoes.controller.ts:43` | `@Roles(ADMIN)` removido (reaplicado da rodada 1) | ✅ `catalogo-concorrencia` corpo vazio ×2 (rejeição 403→422) |
| N7 | `admin-instituicoes.controller.ts:146` | `@Roles(ADMIN, EMPRESA)` só na rejeição | ✅ `catalogo-concorrencia` EMPRESA + corpo vazio |
| N8 | `admin-causas.controller.ts:89` | `@Roles(ADMIN, INSTITUICAO)` só no POST de causa | ✅ `catalogo-concorrencia` INSTITUICAO + corpo vazio |
| N9 | `admin-instituicoes.controller.ts:169` | `@Roles(ADMIN, EMPRESA)` só na suspensão (rota sem corpo) | ⚪ Sobreviveu, **equivalente**: o caso de uso nega com 403, e o estado e a auditoria ficam intactos, conferidos pelo próprio sweep (`:294-309`). A saída da spec é a mesma |
| R-M1 | `src/infra/database/prisma/prisma-instituicao-repository.ts:134` | CAS removido (amostra da rodada 1) | ✅ repo ×2 + `catalogo-concorrencia` concorrência |
| R-M8 | `src/infra/arquivo/verificador-de-documento-prisma.ts:18` | verificador devolve `true` com o storage falhando (amostra da rodada 1) | ✅ `verificador-de-documento` ×2; `admin-instituicoes` `:204` (fila) e `:294` (503) |
| R-M23 | `prisma-instituicao-repository.ts:66` | `listarPorEstado` com ordem invertida (amostra da rodada 1) | ✅ repo; `admin-instituicoes` `:174`, `:204` |
| R-M25 | `admin-instituicoes.controller.ts:113` | fila sem renomear `createdAt` → `criadoEm` (amostra da rodada 1) | ✅ `admin-instituicoes` `:174` |

**Sensor (rodada 2)**: 15 injetados, 14 mortos, 1 sobrevivente equivalente (N9), 0 vivos não equivalentes. ✅ Nenhuma regressão nos 4 mutantes da rodada 1 reamostrados.

### Code Quality (diff `a5af170..03a2879`)

| Princípio | Status | Nota |
| --------- | ------ | ---- |
| Código mínimo / sem scope creep | ✅ | Um campo no read model, uma dependência nova no caso de uso, o schema OpenAPI e os testes nomeados nas tasks |
| Mudanças cirúrgicas | ✅ | `src/domain/**` só nos 2 arquivos que o `STATE.md` (2026-10-14) autoriza. A injeção funciona porque `ArquivoModule` exporta `VerificadorDeDocumento` (`src/infra/arquivo/arquivo.module.ts:14-18`) |
| Segue padrões existentes | ✅ | Espelha `cnpjCoincideComEmpresa` e o `FakeVerificadorDeDocumentos` existente (`failOnIds` + `forceFailure`) |
| Spec-anchored outcome check | ✅ | 503 com a mensagem literal, estado e auditoria; 403 nas 9 rotas |
| Cobertura por camada | ✅ | Unit 1:1 para o sinal por item; rota com happy (`true`), edge (`false` + 503) e erro de papel |
| Todo teste mapeia para AC / edge / Done-when | ✅ | — |
| Senior engineer aprovaria? | ✅ com ressalvas | Ressalvas sem task: (i) `VerificadorDeDocumentoPrisma.estaLegivel` lê os **bytes inteiros** (`ArquivoService.lerBytes`, até 10 MB) de cada pendente a cada `GET` da fila, e cabe trocar por uma checagem de existência quando a fila crescer; (ii) `design.md:213` e `:311` ainda descrevem a porta como "usada pela aprovação", e não registram o uso na fila (a decisão está só no `STATE.md` e em `tasks.md`); (iii) o título e a Done-when da T53 (acima) |

### Requirement Traceability Update (proposto, `spec.md` não editado)

| Requirement | Status após a rodada 1 | Status proposto |
| ----------- | ---------------------- | --------------- |
| INST-01, INST-02, INST-03 | ✅ Verified | ✅ Verified (domínio + infra) |
| INST-04 | ⚠️ Needs Fix (Fix 1 + Fix 2) | ✅ Verified |
| INST-05 | ⚠️ Needs Fix Minor (M27) | ✅ Verified |
| INST-06 | ✅ Verified (exibição na fila no Fix 1) | ✅ Verified (acesso + 503 + `documentoDisponivel` na fila) |
| INST-07 | ⚠️ Needs Fix Minor (M26) | ✅ Verified |
| INST-08, INST-10 | ✅ Verified | ✅ Verified |
| INST-09 | ✅ Domínio · consumo em `campanhas` | ✅ Domínio verificado · consumo na feature `campanhas` |
| INST-11…13 | Deferred | Deferred (P2) |

### Summary (rodada 2)

**Overall**: ✅ Ready. P1 do catálogo de instituições (domínio + infra) verificado.

**Spec-anchored check**: 40/40 ACs P1 com evidência que bate com a saída da spec. P1-Causas AC6 e P1-Aprovação AC8 agora discriminam a guarda. Os 5 edge cases de escopo P1 foram atendidos, com a lacuna 1 fechada. Seguem os 7 spec-precision gaps (SP1–SP7, rodada 1), sem bloquear.
**Sensor**: rodada 2 com 14/15 mortos e 1 equivalente; rodada 1 com 25/27, e os 2 vivos (M26 e M27) foram mortos na rodada 2.
**Gate**: build 0 · tsc 0 · eslint 0 · unit 333/333 · e2e 337/337.

### Lições (rodada 2)

- **L-020** (candidate, `gate_fail`, escopo `tasks`): dar o gate `full` a uma task que muda a resposta de um caso de uso devolvida por uma rota, porque os e2e afirmam o payload da rota com `toEqual` exato. A origem é o `c46080b` (`test/http/admin-instituicoes.e2e-spec.ts:174` vermelho até `2a123fb`). As lacunas da rodada 1 já tinham virado L-015 e L-016, e a rodada 2 não as repete.

---

## Rodada 1 (2026-10-13, histórico, `cb28127..a5af170`, veredito da época: FAIL)

> Mantida como histórico. As citações `file:line` desta seção referem-se a `a5af170`. Em `03a2879`, `test/http/admin-instituicoes.e2e-spec.ts` desloca +46 linhas a partir de `:200`, e `test/http/catalogo-concorrencia.e2e-spec.ts` desloca +15 a partir de `:262`. As lacunas 1 e 2 e os Fix 1 e Fix 2 abaixo foram fechados na rodada 2 (T51–T53).

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

### Gate Check

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

### Task Completion (T21–T34)

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

### Spec-Anchored Acceptance Criteria

Para cada AC vale a evidência mais forte: e2e HTTP quando existe, unit de domínio quando o AC é só domínio. As citações `src/domain/...spec.ts` vêm de `validation-dominio.md`, com arquivos idênticos em `a5af170`.

#### P1: Autocadastro da instituição (INST-01/02/03)

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

#### P1: Aprovação pelo administrador (INST-04/05/06)

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

#### P1: Manutenção de causas (INST-07)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 criar | `ATIVA` + 201 | `test/http/admin-causas.e2e-spec.ts:128-137` | ✅ |
| AC2 nome existente | 409 `Causa já cadastrada` (sem caixa/acento, design) | `:149-151` (`EDUCACAO` contra `Educação` → 409 + mensagem + 1 linha); edição: `:212-214`; índice: `test/database/prisma-causa-repository.e2e-spec.ts:138-145`, `:156-161` | ✅ |
| AC3 inativar sem excluir | `INATIVA`, registro mantido | `admin-causas.e2e-spec.ts:267-269` | ✅ |
| AC4 com aprovadas | 409 + lista das instituições | `:294-306` (409, `instituicoes` = `['Coral da Vila','Teatro Aberto']`, nomes na `message`, a pendente fora da lista, causa ATIVA) | ✅ / ⚠️ SP4 |
| AC5 INATIVA oculta | fora da seleção e do autocadastro | `test/http/causas.e2e-spec.ts:58-75`, `:96-103` (inativada via HTTP some de `GET /causas`); `beneficiadas.e2e-spec.ts:141-191` (Cultura INATIVA ausente); autocadastro com causa INATIVA → 422 `cadastro-instituicao.e2e-spec.ts:333-355` | ✅ |
| AC6 não-admin | 403 **e** nenhum dado alterado | `admin-causas.e2e-spec.ts:347-368` (403 em criar, editar e inativar, causa intacta, auditoria 0) | ✅ na saída. ❌ discriminação da guarda (M26, lacuna 2) |
| AC7 auditoria | autor e data-hora em criar, editar e inativar | `:394-413` (tipos `CAUSA_CRIADA/EDITADA/INATIVADA`, `usuarioId === admin`, `criadoEm` < 60 s) | ✅ |

#### P1: Seleção da beneficiada (INST-08/09/10)

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

### Edge Cases

- [x] CNPJ simultâneo → um 201, um 409, um registro: `catalogo-concorrencia.e2e-spec.ts:173-180`, apoiado pelo índice único (M21 morto).
- [x] Empresa e instituição com o mesmo CNPJ coexistem e a fila sinaliza: `catalogo-concorrencia.e2e-spec.ts:221-238` (`cnpjCoincideComEmpresa: true`); `prisma-instituicao-repository.e2e-spec.ts:426-437`.
- [x] Busca sem resultado → estado vazio: a API devolve `[]` (`beneficiadas.e2e-spec.ts:290-291`); a orientação textual fica no `web`.
- [x] Suspensão com campanhas aprovadas → páginas no ar, só some da seleção: a seleção é conferida em `beneficiadas.e2e-spec.ts:323-357`; as campanhas não são tocadas (por construção, feature `campanhas`).
- [ ] **Documento inacessível durante a análise → "exibir ao administrador o item como temporariamente indisponível" e "bloquear a aprovação com HTTP 503"**. A metade 503 está ✅ (`admin-instituicoes.e2e-spec.ts:258-266`: 503 com a mensagem literal, estado PENDENTE, auditoria 0, nenhum e-mail; M8 morto). A metade da fila está ❌: não há campo, não há teste e nenhum adiamento registrado. Ver Fix 1.
- [—] Beneficiada suspensa durante a análise de campanha → feature `campanhas` (`design.md:25`). Escape de HTML → `web` (`design.md:28`). Dois admins editando a mesma instituição → não existe rota de edição admin no P1 (área de edição é P2).

**Por que a metade da fila é lacuna, e não fora de escopo.** (a) `spec.md:196` usa SHALL nas duas metades. (b) A tabela "Fora desta rodada" do design (`design.md:20-28`) adia explicitamente outros itens de exibição (AC6, escape de HTML), mas não este. (c) O design trata só o 503 (`design.md:311`, `:213`: "usada pela aprovação"), e a Done-when da T30 (`tasks.md:1529`) só pede "referência do documento e sinal de CNPJ coincidente". O requisito caiu no caminho da spec para o design, sem decisão registrada. (d) O edge case vizinho, "SHALL sinalizar a coincidência ao administrador na fila de análise" (`spec.md:195`), virou um campo da API (`cnpjCoincideComEmpresa`). O mesmo formato de requisito ("mostrar ao admin um estado do item na fila") pede o mesmo tratamento. A leitura alternativa ("o `web` sonda `GET /arquivos/:id` por item") não está registrada em lugar nenhum e não tem teste. Com o `FakeStorage`, um objeto sumido nessa rota cai em `Error` genérico (500), não em 503.

---

### Discrimination Sensor

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

### Code Quality (diff `cb28127..a5af170`)

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

### Spec-precision gaps (sinalizados, não bloqueiam)

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

### Fix Plans

#### Fix 1 (Major): fila sinaliza documento temporariamente indisponível

- **Causa raiz**: o edge case `spec.md:196` tem duas metades. O design (`design.md:213`, `:311`) e a T30 (`tasks.md:1529`) só levaram a do 503.
- **Fix task** (duas opções, quem decide é o dono da spec):
  - (a) **Implementar**: `GET /admin/instituicoes` ganha, por item, `documentoDisponivel: boolean`, calculado com a porta `VerificadorDeDocumento`. Isso pede mudar o domínio (`ListarFilaInstituicoesUseCase`, autoria humana pelo AD-020) ou compor no controller. Mais OpenAPI e `openapi.json`. Teste e2e: com o objeto apagado do storage, o item vem `false` e a aprovação responde 503; no caminho feliz, `true`.
  - (b) **Adiar explicitamente**: registrar em `design.md` ("Fora desta rodada") e no `STATE.md` que a exibição fica no `web`, com o contrato que ele vai usar (`GET /arquivos/:id` → 503 quando ilegível). Mais um e2e provando esse 503 para o documento com o objeto ausente.
- **Done when**: a metade "exibir" do edge case tem evidência `file:line`, ou um adiamento registrado com o contrato de API testado.

#### Fix 2 (Minor): discriminar a guarda de papel das rotas admin do catálogo

- **Causa raiz**: os testes de não-admin mandam sempre corpo válido. Assim, a negação do caso de uso mascara a remoção de `@Roles(ADMIN)`.
- **Fix task**: em `test/http/catalogo-concorrencia.e2e-spec.ts` (sweep lido do OpenAPI), repetir o laço de `:271-287` com corpo **vazio** (`send({})`) e esperar 403 em todas as 9 rotas, para EMPRESA e INSTITUICAO.
- **Done when**: M26 e M27, reaplicados, são mortos.

---

### Requirement Traceability Update

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

### Summary

**Overall**: ❌ Not Ready, mas perto. Duas tasks de correção pequenas.

**Spec-anchored check**: 40/40 ACs P1 com evidência que bate com a saída da spec. 1 edge case pela metade (lacuna 1). 7 spec-precision gaps.
**Sensor**: 27 mutantes: 25 mortos, 2 sobreviventes (M26, M27), 0 equivalentes.
**Gate**: build 0 · tsc 0 · eslint 0 · unit 332/332 · e2e 334/334.

**O que funciona**: o CAS de decisão é provado contra o Postgres real e por HTTP concorrente. O `save` não desfaz decisão. A unicidade de causa ignora caixa e acento no índice. O limite de 10 MB foi testado nas duas bordas, com a mensagem certa e sem 413. Upload que falha não deixa arquivo órfão. O storage fora do ar dá 503 com a mensagem da spec. O documento só é lido pelo admin e pela dona. O catálogo não vaza CNPJ, e-mail, telefone, documento nem dados de decisão (chaves exatas + JSON bruto). Mensagens literais da spec são conferidas em todos os ACs que citam texto.

**Próximos passos**: (1) o dono da spec decide entre as opções (a) e (b) do Fix 1; (2) Fix 2 (um laço de teste); (3) nova verificação (rodada 2 de 3).
