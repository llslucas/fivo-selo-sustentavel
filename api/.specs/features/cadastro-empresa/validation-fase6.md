# Cadastro de Empresa — Validação da Fase 6 (T30–T32)

> **Status final: ✅ PASS** (Re-verificação 3, 2026-09-19, diff `d5c328b..d5e0c0e`). As seções abaixo são o histórico das iterações: o veredito ❌ FAIL da verificação inicial e das re-verificações 1 e 2 vale para o `HEAD` de cada uma delas, não para o estado atual. O veredito corrente é o da seção **Re-verificação 3**, no fim do arquivo.

**Date**: 2026-09-19
**Spec**: `.specs/features/cadastro-empresa/spec.md`
**Diff range**: `d5c328b..HEAD` (`770ff6a`) — 3 commits: `f247cda` (T30), `89ee2d8` (T31), `770ff6a` (T32)
**Verifier**: sub-agente independente (author ≠ verifier); nenhuma linha de código/teste do tree real foi alterada
**Escopo do diff**: 21 arquivos, +859/−23 — `prisma/schema.prisma` + migration `20260919124602_email_pendente`, porta `EmpresaRepository.salvarTransicao`, 4 use cases de decisão, `PrismaEmpresaRepository`, `src/infra/mail/*` (4 arquivos novos), 3 suites e2e novas, 1 teste unitário novo

---

## Veredito

# ❌ FAIL

O núcleo da T30 (CAS de decisão de admin) está correto e **fecha o GAP 3 do `validation-fase5.md`** — o mutante que remove o filtro de estado do CAS é morto de forma determinística. O gate passa inteiro. Porém o sensor de discriminação encontrou **3 mutantes sobreviventes e 1 mutante morto só de forma intermitente**, todos em comportamento que a spec/tasks tratam como requisito, e há 1 caminho de transição de estado (`criar-empresa` → re-cadastro) que continua sem CAS.

---

## Task Completion

| Task | Status | Notas |
| ---- | ------ | ----- |
| T30 — Sweep de concorrência e re-cadastro | ⚠️ Parcial | Os 3 Done-when de corrida estão cobertos. O "re-cadastro" do título da task não ganhou teste e2e algum e o caminho de re-cadastro (`criar-empresa.ts:151`) é uma transição `REJEITADA → PENDENTE_APROVACAO` **sem CAS** — ver GAP 2 |
| T31 — Fila de reenvio de e-mail | ⚠️ Parcial | Serviço e fila cobertos; o `EmailPendenteWorker` em si tem **zero referências em teste** e o backoff tem asserção tautológica — ver GAP 3 e GAP 4 |
| T32 — Escape de conteúdo e sanitização | ✅ Done | Cobre os 2 Done-when; duplica 1 cenário pré-existente (nota de qualidade abaixo) |

`tasks.md` foi atualizado com `[x]` em todos os Done-when de T30–T32 no diff. Os itens marcados conferem com o que os testes provam, **exceto** "O worker drena pendências…" (T31), que é provado pelo *service* (`EmailPendenteService.drenar`), não pelo worker.

---

## Spec-Anchored Acceptance Criteria (evidence-or-zero)

### EMP-05 / EMP-04 — decisões de admin e máquina de estados

| Critério (spec) | Outcome definido na spec | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| Edge case: "IF o mesmo cadastro pendente for aprovado e rejeitado concorrentemente por dois administradores THEN aplicar apenas a primeira decisão e responder HTTP 409 à segunda" | uma 2xx + uma 409; estado final = o da vencedora | `test/http/concorrencia.e2e-spec.ts:151` — `expect([aprovacao.status, rejeicao.status].sort()).toEqual([204, 409])`; `:157` — `expect(linha.status).toBe(vencedora === 'aprovacao' ? APROVADA : REJEITADA)`; `:162` — `expect(registroAuditoria.count()).toBe(1)`; `:163` — `expect(mailer.mensagens).toHaveLength(1)`. Loop de 8 rodadas (`:25`, `:132`) | ✅ PASS |
| EMP-05 AC5 — "permitir apenas as transições …, rejeitando qualquer outra com HTTP 409" (aplicado a `APROVADA → SUSPENSA` concorrente) | uma 204, a outra 409, 1 linha de auditoria | `test/http/concorrencia.e2e-spec.ts:186` — `expect([a.status, b.status].sort()).toEqual([204, 409])`; `:187` — `expect(registroAuditoria.count()).toBe(1)` | ⚠️ PASS com discriminação fraca (1 rodada só; mutante M2 sobreviveu em 1 de 5 execuções) |
| EMP-05 AC7 — auditoria imutável de toda mudança de estado (nenhuma linha para a decisão perdedora) | exatamente 1 registro por transição efetiva | `concorrencia.e2e-spec.ts:162`; domínio: `src/domain/fivo/application/use-cases/aprovar-empresa.spec.ts:158` — `expect(registroAuditoriaRepository.items).toHaveLength(0)` quando o CAS devolve `false` | ✅ PASS |
| EMP-04 AC2 — decisão perdedora não dispara e-mail | nenhum e-mail para a decisão que não aplicou | `aprovar-empresa.spec.ts:159` — `expect(mailer.mensagens).toHaveLength(0)`; e2e `concorrencia.e2e-spec.ts:163` | ✅ PASS |
| CAS devolve `false` → erro de transição | `TransicaoInvalidaError` (→ 409) | `aprovar-empresa.spec.ts:154-156` — `expect(response.isLeft()).toBe(true)` + `expect(response.value).toBeInstanceOf(TransicaoInvalidaError)` | ✅ PASS |
| EMP-05 AC5 — `SUSPENSA → APROVADA` (reativação) concorrente | 409 na segunda | **nenhuma citação** | ❌ GAP (mutante M9 sobreviveu às 317 asserções — ver GAP 1) |

### EMP-01 — autocadastro

| Critério (spec) | Outcome definido na spec | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| Edge case: "IF dois cadastros com o mesmo CNPJ forem submetidos simultaneamente THEN persistir apenas o primeiro e rejeitar o segundo com HTTP 409, garantido por restrição de unicidade no banco" | exatamente 1 empresa; um 201 e um 409 | `concorrencia.e2e-spec.ts:126` — `expect([a.status, b.status].sort()).toEqual([201, 409])`; `:127` — `expect(empresa.count()).toBe(1)`; `:128` — `expect(usuario.count()).toBe(2)` (admin + dono) | ✅ PASS |
| Edge case: "IF o serviço de armazenamento estiver indisponível … THEN HTTP 503 com a mensagem 'Não foi possível enviar o logo, tente novamente' e preservar os demais dados" | 503 **+ a mensagem exata** | `concorrencia.e2e-spec.ts:199` — `expect(resposta.status).toBe(503)` (só o status) + `:200-202` nenhuma linha órfã. A mensagem é asserida na suite pré-existente `test/http/cadastro-empresa.e2e-spec.ts:315-317` — `message: 'Não foi possível enviar o logo, tente novamente'` | ✅ PASS (coberto no conjunto; o teste **novo** é a versão mais fraca — nota de qualidade) |
| EMP-01 AC9 — "IF o envio do e-mail de confirmação falhar THEN manter o cadastro criado e registrar o erro em log, sem devolver falha à empresa" | 201 mesmo com o provedor fora | `test/http/email-pendente.e2e-spec.ts:90` — `expect(resposta.status).toBe(201)` | ✅ PASS |
| Edge case: "IF o provedor de e-mail estiver indisponível durante aprovação ou rejeição THEN concluir a mudança de estado, registrar a falha em log e **enfileirar o e-mail para nova tentativa**" — **aprovação** | 204 + linha na fila com destinatário e template | `email-pendente.e2e-spec.ts:128` — `expect(resposta.status).toBe(204)`; `:131-134` — `toMatchObject({ para: EMAIL_DONA, template: TemplateEmail.CADASTRO_APROVADO })` | ✅ PASS |
| …o mesmo edge case para **rejeição** | idem, com `CADASTRO_REJEITADO` | **nenhuma citação** — `admin-empresas.e2e-spec.ts:287-299` cobre "falha do provedor não desfaz a rejeição", mas substitui o `Mailer` inteiro (contorna o `MailerResiliente`) e não olha `email_pendente` | ❌ GAP (menor — o template está na allow-list, mas não há evidência) |
| Cadastro: e-mail falha → linha pendente | `para`, `template`, `tentativas: 0`, `enviadoEm: null`, `esgotadoEm: null` | `email-pendente.e2e-spec.ts:93-99` — `toMatchObject({ para, template: CADASTRO_RECEBIDO, tentativas: 0, enviadoEm: null, esgotadoEm: null })` | ✅ PASS |

### T31 — Done-when do worker/fila (a spec não define esses valores; fonte = `tasks.md`)

| Done-when (`tasks.md:1091-1093`) | Outcome definido | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| "marca `enviadoEm` no sucesso" | linha marcada enviada, não reenviada | `email-pendente.e2e-spec.ts:149-150` — `expect(entregues).toBe(1)` / `expect(denovo).toBe(0)`; `:155` — `expect(entregue.enviadoEm).toEqual(depoisDoBackoff)`; `:151-153` — `expect(transporte.mensagens).toEqual([{ para, template: CADASTRO_RECEBIDO }])` | ✅ PASS |
| "incrementa `tentativas` + adia na falha" | `tentativas: 1`, `enviadoEm: null`, próxima tentativa adiada | `email-pendente.e2e-spec.ts:167-171` — `expect(apos.tentativas).toBe(1)`, `expect(apos.enviadoEm).toBeNull()`, `expect(apos.proximaTentativaEm).toEqual(new Date(agora.getTime() + atrasoDoBackoff(1)))` | ⚠️ **Asserção tautológica** — o valor esperado é calculado pela própria função sob teste (`atrasoDoBackoff`, importada de `@infra/mail/email-pendente.service`). Nenhum número literal. Ver GAP 4 |
| "não tenta antes da hora" | nenhum envio no mesmo instante | `email-pendente.e2e-spec.ts:176-177` — `expect(transporte.mensagens).toHaveLength(0)` + `tentativas` intacto | ✅ PASS |
| "para após o teto" | `tentativas === MAX_TENTATIVAS`, `esgotadoEm` preenchido, nenhum envio depois | `email-pendente.e2e-spec.ts:191-192` — `expect(esgotada.tentativas).toBe(MAX_TENTATIVAS)` / `expect(esgotada.esgotadoEm).not.toBeNull()`; `:198-199` | ✅ PASS |
| "`EmailPendenteWorker` (`@Interval`, backoff, para após N tentativas)" — o worker | o agendador drena periodicamente | **nenhuma citação** — `grep -rn "EmailPendenteWorker" test/` → 0 ocorrências; o worker é desligado com `NODE_ENV=test` (`email-pendente.worker.ts:22-24`) e nem `executar()` é chamado nos testes | ❌ GAP (ver GAP 3) |

### T32 / Edge case de conteúdo hostil

| Critério (spec) | Outcome definido na spec | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| Edge case: "WHEN o nome da empresa contiver caracteres HTML ou script THEN **escapá-los na renderização das páginas públicas**, impedindo execução" | escape na **renderização** | `test/http/conteudo-hostil.e2e-spec.ts:67` — `expect(resposta.status).toBe(201)`; `:71` — `expect(empresa.razaoSocial).toBe(NOME_HOSTIL)` (persistido cru); `:90` — `expect(headers['content-type']).toMatch(/^application\/json/)`; `:91-93` — `expect(body.razaoSocial).toBe(NOME_HOSTIL)` | ⚠️ **Spec-precision gap** — a spec fala de renderização (responsabilidade do `web`); a API só prova round-trip em JSON. Nada nesta fase prova que a página pública escapa. O desvio está documentado no What da T32, mas a spec não foi atualizada |
| EMP-01 AC5/AC6 — SVG com script rejeitado | HTTP 422 "informando qual limite foi violado" | `conteudo-hostil.e2e-spec.ts:103` — `expect(resposta.status).toBe(422)`; `:104-105` — `arquivo.count() === 0` e `empresa.count() === 0` | ⚠️ Spec-precision parcial — o status confere, a **mensagem** ("qual limite foi violado") não é asserida aqui nem em `arquivo.e2e-spec.ts:222` |

---

## Discrimination Sensor

**Scratch**: `git worktree add /tmp/sensor-fase6 HEAD --detach` (nunca `git stash`); `node_modules` e `.env` por symlink/cópia; `maxWorkers: 1` (já é o default de `test/jest-e2e.json`); nenhuma suíte rodada em paralelo (Postgres `localhost:5433` compartilhado). Scratch descartado com `git worktree remove --force` + `git worktree prune`.
**Baseline do tree real**: `git status --porcelain` vazio antes e depois → **isolamento confirmado**.
**Depth**: P0-full (integridade de dados / decisão de admin) — **10 mutantes**.

| # | Arquivo:linha | Mutação | Suítes rodadas | Killed? |
| - | ------------- | ------- | -------------- | ------- |
| M1 | `src/infra/database/prisma/prisma-empresa-repository.ts:103-106` | Remove `status: statusParaPrisma(estadoEsperado)` do `where` do `updateMany` (CAS vira update incondicional) | `concorrencia.e2e` | ✅ **Killed** (2/4 falham: `[204,409]` → `[204,204]`) |
| M2 | `src/domain/fivo/application/use-cases/suspender-empresa.ts:44-51` | Troca `salvarTransicao(empresa, statusAnterior)` por `save(empresa)` (sem CAS na suspensão) | `concorrencia.e2e` ×5 | ⚠️ **Killed 4/5 — sobreviveu 1/5** (teste de suspensão roda 1 rodada só; corrida não determinística) |
| M3 | `src/infra/mail/mailer-resiliente.ts:38` | Remove `await this.fila.enfileirar(mensagem)` (engole o erro sem enfileirar) | `email-pendente.e2e` | ✅ **Killed** (5/5 falham) |
| M4 | `src/infra/mail/email-pendente.service.ts:90-95` | Remove a marcação de `esgotadoEm` no teto | `email-pendente.e2e` | ✅ **Killed** (1/5) |
| M5 | `src/infra/mail/email-pendente.service.ts:62-76` | Remove a reserva de tentativa (`updateMany where {id, tentativas}` + `continue`) antes do envio | `email-pendente.e2e` | ✅ **Killed** (3/5) |
| M6 | `src/infra/mail/email-pendente.service.ts:16` | Backoff `2 ** (t-1)` → `7 ** (t-1)` | `email-pendente.e2e` | ❌ **SURVIVED** |
| M6b | `src/infra/mail/email-pendente.service.ts:14` | `BACKOFF_BASE_MS` `60_000` → `1` (retry imediato, martela o provedor) | `email-pendente.e2e` | ❌ **SURVIVED** |
| M7 | `src/domain/fivo/entities/arquivo.ts:69-70` | Desliga a rejeição de SVG com script (`false && /<script…/`) | `conteudo-hostil.e2e` | ✅ **Killed** (1/3) |
| M8 | `src/infra/mail/mailer-resiliente.ts:14-18` | Acrescenta `EMAIL_CONFIRMACAO` e `SENHA_REDEFINICAO` à allow-list (token em claro vai para a fila) | **suíte e2e inteira** (18 suítes, 167 testes) | ❌ **SURVIVED** |
| M9 | `src/domain/fivo/application/use-cases/reativar-empresa.ts:44-51` | Troca `salvarTransicao` por `save` (sem CAS na reativação) | **suíte unit inteira (150) + e2e inteira (167)** | ❌ **SURVIVED** |
| M10 | `src/domain/fivo/application/use-cases/rejeitar-empresa.ts:53-60` | Troca `salvarTransicao` por `save` (sem CAS na rejeição) | `concorrencia.e2e` ×3 | ✅ **Killed 3/3** |

**Resultado**: 10 mutantes distintos (11 execuções) — **6 killed, 3 survived, 1 killed intermitentemente** → ❌ FAIL

---

## Revisão adversarial de desenho

1. **Token na fila (`MailerResiliente`)** — o desenho está **correto**: `TEMPLATES_ENFILEIRAVEIS` (`mailer-resiliente.ts:14-18`) admite só `CADASTRO_RECEBIDO`/`CADASTRO_APROVADO`/`CADASTRO_REJEITADO`; `SENHA_REDEFINICAO` e `EMAIL_CONFIRMACAO` (que carregam `dados.token`) propagam o erro em vez de persistir o segredo em `email_pendente.dados`. **Mas não há teste algum dessa invariante** — M8 provou que alguém pode acrescentar os dois templates à allow-list e as 167 asserções e2e seguem verdes. É o gap de maior severidade do lote: a proteção é um comentário + um `Set`, sem rede.
2. **Corrida na fila entre instâncias** — sólida. `drenar` (`email-pendente.service.ts:62-76`) reserva cada item com `updateMany({ where: { id, tentativas: pendente.tentativas } })` e pula com `continue` se `count === 0`: é um CAS no contador, então dois workers nunca enviam o mesmo item. O guard `emExecucao` (`email-pendente.worker.ts:17,35-38`) é só intra-processo, mas a reserva no banco cobre o multi-instância. Riscos residuais aceitáveis, não cobertos por teste: (a) crash entre a reserva e o `enviadoEm` → o e-mail espera o próximo backoff; (b) envio OK e `update enviadoEm` falhando → e-mail duplicado (at-least-once). Nenhum é regressão desta fase.
3. **Outros callers que mudam estado sem CAS** — `grep` em `src/` por `empresaRepository.save`: 3 chamadas fora das decisões.
   - `criar-empresa.ts:151` — **é uma transição de estado**: o re-cadastro reaproveita a empresa `REJEITADA` e a devolve a `PENDENTE_APROVACAO` com `save` incondicional, dentro do `unitOfWork`. Um re-cadastro concorrente com uma decisão de admin (ou com um segundo re-cadastro) sofre exatamente o *lost update* que a T30 fechou nas decisões. O título da T30 diz "…e re-cadastro", mas nenhum Done-when nem teste tocou nisso (o caso feliz está só em unit, `criar-empresa.spec.ts:161`).
   - `editar-dados-empresa.ts:117` e `confirmar-troca-email.ts:60` — não são transições de estado, mas o `save` monta a linha inteira via `PrismaEmpresaMapper.toPrisma` e **escreve `status` junto**: uma edição de dados concorrente com uma suspensão pode regravar o `status` lido antes. Risco menor (janela curta, sem 409 devido), mas real e não coberto.
4. **Worker vs. Success Criteria** — o worker roda a cada 30 s (`INTERVALO_MS`) e a primeira retentativa só vence 60 s após o enfileiramento (`enfileirar` usa `atrasoDoBackoff(1)` = 60 s). O Success Criterion "a empresa recebe a decisão por e-mail em menos de 1 minuto após a aprovação" é, por construção, inatingível quando o provedor falha na primeira tentativa. Não é bug — é uma imprecisão da spec que vale registrar.
5. **`email_pendente` sem retenção** — linhas `enviadoEm`/`esgotadoEm` nunca são removidas. O índice `email_pendente_fila_idx` cobre a query de fila, então não vira problema de performance na v1; fica como dívida operacional.

---

## Code Quality

| Princípio | Status |
| --------- | ------ |
| Código mínimo | ✅ — `TransporteEmail` como porta separada é o mínimo para envolver o provedor sem mexer nos use cases |
| Mudanças cirúrgicas | ✅ — os 4 use cases mudaram só a linha de persistência; os testes de e-mail existentes não precisaram mudar |
| Sem scope creep | ✅ |
| Segue os padrões do repo | ✅ — `updateMany`+`count` igual ao padrão de `ehViolacaoDeUnicidade`; e2e em `test/http` (desvio de `Where` corrigido no próprio `tasks.md`) |
| Spec-anchored outcome check | ⚠️ — 2 spec-precision gaps (escape na renderização; mensagem do 422 de SVG) + 1 asserção tautológica (backoff) |
| Cobertura por camada | ⚠️ — decisões: `aprovar`/`rejeitar` bem cobertas, `suspender` fraca, `reativar` zero |
| Todo teste mapeia um requisito, sem testes órfãos | ⚠️ — `concorrencia.e2e-spec.ts:190` duplica `cadastro-empresa.e2e-spec.ts:306` (e com asserção mais fraca: não checa a mensagem); `conteudo-hostil.e2e-spec.ts:96` duplica `arquivo.e2e-spec.ts:200`. Ambos exigidos pelo Done-when da task, então ficam como nota, não como gap |
| Diretrizes documentadas seguidas | ✅ — `references/coding-principles.md`; comentários em PT-BR explicando o *porquê* (AD-005) |

---

## Edge Cases (seção "Edge Cases" da spec)

- [x] Dois cadastros simultâneos com o mesmo CNPJ → `concorrencia.e2e-spec.ts:126-128`
- [x] Storage indisponível no upload → `concorrencia.e2e-spec.ts:199-202` + mensagem em `cadastro-empresa.e2e-spec.ts:317`
- [x] Provedor de e-mail indisponível na **aprovação** → `email-pendente.e2e-spec.ts:128-134`
- [ ] Provedor de e-mail indisponível na **rejeição** → sem evidência de enfileiramento (GAP 5)
- [~] Nome com HTML/script → API cobre round-trip (`conteudo-hostil.e2e-spec.ts:67-93`); o escape *na renderização* exigido pela spec não é verificado em lugar algum
- [x] Aprovação e rejeição concorrentes → `concorrencia.e2e-spec.ts:151-163` (8 rodadas) — **GAP 3 da Fase 5 fechado**
- [ ] Re-cadastro de empresa rejeitada → coberto só em unit (`criar-empresa.spec.ts:161`); sem e2e e **sem CAS** no caminho (GAP 2)

---

## Gate Check

- **Comando**: `npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json`
- **`tsc --noEmit`**: ✅ exit 0
- **`eslint`**: ✅ exit 0, 0 problemas
- **`npx jest` (unit)**: ✅ 29 suítes, **150 passed, 0 failed, 0 skipped**
- **`npx jest --config ./test/jest-e2e.json`**: ✅ 18 suítes, **167 passed, 0 failed, 0 skipped**, 59,5 s
- **Total**: 317 testes, 0 falhas, 0 skips
- **Test count antes da Fase 6**: 149 unit + 155 e2e = 304 · **depois**: 150 + 167 = 317 · **delta: +12 e2e** (4 concorrência + 5 fila de e-mail + 3 conteúdo hostil) e **+1 unit** (`aprovar-empresa.spec.ts:145`). Baseline derivado das notas de conclusão em `tasks.md` (T30: "159 e2e, 150 unit"; T31: "164 e2e"; T32: "167 e2e")
- **Test Integrity**: nenhum teste removido; nenhuma asserção enfraquecida em teste pré-existente (o único teste tocado, `test/database/criar-empresa-transacao.e2e-spec.ts:84`, só acrescentou o novo método ao double)

> Observação: o delta unit é +1, não +0; `tasks.md` reporta só os e2e nos Done-when.

---

## Gaps ranqueados / Fix Plans

### GAP 1 (Blocker) — `reativar-empresa` não tem nenhuma cobertura de CAS

- **Evidência**: M9 (remover o CAS de `reativar-empresa.ts:44-51`) sobreviveu às **317** asserções do projeto.
- **Causa raiz**: `concorrencia.e2e-spec.ts` cobre aprovação/rejeição e suspensão, mas não `SUSPENSA → APROVADA`; o unit novo (`aprovar-empresa.spec.ts:145`) existe só para `aprovar`.
- **Fix task**: acrescentar (a) um caso concorrente de reativação em `concorrencia.e2e-spec.ts` (mesma forma do de suspensão) **ou** (b) um unit espelho do `aprovar-empresa.spec.ts:145` em `reativar-empresa.spec.ts`, `suspender-empresa.spec.ts` e `rejeitar-empresa.spec.ts` (mock de `salvarTransicao → false`; esperar `TransicaoInvalidaError`, 0 auditoria, 0 e-mail). A opção (b) é determinística e mata M2 e M9 sem depender de timing.
- **Done when**: com `salvarTransicao` trocado por `save` em qualquer um dos 4 use cases, o gate falha em 3/3 execuções.

### GAP 2 (Blocker) — re-cadastro faz transição de estado sem CAS

- **Evidência**: `src/domain/fivo/application/use-cases/criar-empresa.ts:148-156` — `empresaRepository.save(empresa)` devolve a empresa `REJEITADA` a `PENDENTE_APROVACAO` sem filtro de estado; nenhum teste e2e.
- **Causa raiz**: a T30 fechou o GAP 3 da Fase 5 só nas 4 decisões de admin; o caminho de re-cadastro (que o próprio título da task cita) ficou de fora do escopo executado.
- **Fix task**: usar `salvarTransicao(empresa, EmpresaStatus.REJEITADA)` no ramo `empresaReaproveitavel` (→ 409 `EmpresaAlreadyExistsError`/`TransicaoInvalidaError` se uma decisão venceu no meio) + e2e `Promise.all([re-cadastro, aprovação do pendente])`. Avaliar também restringir `editar-dados-empresa.ts:117` / `confirmar-troca-email.ts:60` a não regravar `status`.
- **Done when**: re-cadastro concorrente com decisão de admin → exatamente um vencedor, e o teste falha se o CAS for removido.

### GAP 3 (Major) — invariante "nenhum segredo na fila" sem rede de proteção

- **Evidência**: M8 (acrescentar `EMAIL_CONFIRMACAO` e `SENHA_REDEFINICAO` a `TEMPLATES_ENFILEIRAVEIS`, `mailer-resiliente.ts:14-18`) sobreviveu à suíte e2e inteira.
- **Causa raiz**: o `MailerResiliente` está certo, mas nenhuma asserção cobre o ramo do `throw`.
- **Fix task**: teste (unit é suficiente, com um `TransporteEmail` falso que falha) — `SENHA_REDEFINICAO` com `dados: { token }` → o `enviar` **rejeita** e `emailPendente.count()` continua 0; idem `EMAIL_CONFIRMACAO`. Complementar: e2e de `POST /senha/recuperacao` com o transporte fora, checando que nenhuma linha com `dados.token` aparece em `email_pendente`.
- **Done when**: M8 passa a ser morto.

### GAP 4 (Major) — asserção de backoff tautológica

- **Evidência**: M6 (`2 **` → `7 **`) e M6b (`BACKOFF_BASE_MS` 60 000 → 1) sobreviveram. `email-pendente.e2e-spec.ts:169-171` compara o valor gravado com `atrasoDoBackoff(1)` importado do **próprio módulo sob teste**, então qualquer mudança na fórmula move os dois lados juntos.
- **Impacto**: um erro de backoff (retry a cada 1 ms) martelaria o provedor de e-mail em produção sem nenhum teste vermelho.
- **Fix task**: fixar valores literais — `expect(atrasoDoBackoff(1)).toBe(60_000)`, `expect(atrasoDoBackoff(2)).toBe(120_000)`, `expect(atrasoDoBackoff(5)).toBe(960_000)` (unit, sem banco) — e manter a asserção relativa no e2e.
- **Done when**: M6 e M6b passam a ser mortos.

### GAP 5 (Minor) — `EmailPendenteWorker` sem nenhuma cobertura

- **Evidência**: `grep -rn "EmailPendenteWorker" test/` → 0 ocorrências. `email-pendente.worker.ts:22-24` desliga o agendamento em `NODE_ENV=test` e nem `executar()` é exercitado; o Done-when "O worker drena pendências" é provado pelo `EmailPendenteService`, não pelo worker.
- **Fix task**: unit do worker com um `EmailPendenteService` falso — (a) `executar()` chama `drenar()`; (b) reentrância: duas chamadas sobrepostas → um só `drenar`; (c) `drenar` rejeitando → `executar()` não propaga e `emExecucao` volta a `false`.

### GAP 6 (Minor) — corrida de suspensão com discriminação instável

- **Evidência**: M2 sobreviveu em 1 de 5 execuções de `concorrencia.e2e-spec.ts`; o caso de suspensão roda 1 rodada, enquanto o de aprovação/rejeição roda 8 (`RODADAS_DE_CORRIDA`, `:25`).
- **Fix task**: pôr o caso de suspensão (e o de reativação do GAP 1) no mesmo laço de `RODADAS_DE_CORRIDA`, ou substituí-lo pelo unit determinístico do GAP 1(b).

### GAP 7 (Minor) — enfileiramento do e-mail de rejeição sem evidência

- **Evidência**: nenhuma citação; `admin-empresas.e2e-spec.ts:287-299` substitui o `Mailer` inteiro e não olha `email_pendente`.
- **Fix task**: acrescentar em `email-pendente.e2e-spec.ts` o espelho do caso de aprovação para `POST /rejeicao`, asserindo `template: CADASTRO_REJEITADO` e `dados.motivo`.

### GAP 8 (Spec-precision, não bloqueia) — escape na renderização e mensagem do 422

- "WHEN o nome da empresa contiver caracteres HTML ou script THEN escapá-los **na renderização das páginas públicas**": a Fase 6 prova round-trip em JSON na API; a renderização é do `web` e não é verificada em lugar nenhum. **Ação**: reescrever o edge case na spec separando a obrigação da API (persistir/devolver cru, `Content-Type: application/json`) da obrigação do `web` (escapar), ou abrir um requisito no `web`.
- EMP-01 AC6 ("422 **informando qual limite foi violado**"): nem `conteudo-hostil.e2e-spec.ts:103` nem `arquivo.e2e-spec.ts:222` asserem a mensagem. **Ação**: asserir `body.message` contra a mensagem de `arquivo.ts:73-76`.
- Success Criteria ("decisão por e-mail em menos de 1 minuto"): incompatível por construção com o primeiro backoff de 60 s + worker de 30 s quando o provedor falha. **Ação**: qualificar o critério ("com o provedor disponível").

---

## Notas de processo

- **`validate_state.py`**: `python3 .claude/skills/tlc-spec-driven/scripts/validate_state.py cadastro-empresa` → `ERROR cadastro-empresa: no validation.md`. Esperado: o projeto usa a convenção por fase (`validation-fase1.md` … `validation-fase6.md`) e nunca teve `validation.md`. O gate determinístico só vai fechar quando a feature inteira for concluída e um `validation.md` consolidado (veredito PASS) for escrito. Não criado aqui: o escopo deste Verifier limita a escrita a `validation-fase6.md`.
- **Distilação de lições (passo 10 de `validate.md`)**: há sinal (3 mutantes sobreviventes + 3 spec-precision gaps), mas `scripts/lessons.py add` **não foi executado** pela mesma restrição de escopo. Lições sugeridas ao orquestrador: (1) *asserção que importa a constante do módulo sob teste não discrimina — fixe o valor literal*; (2) *allow-list de segurança sem teste do ramo negado é comentário, não garantia*; (3) *teste de corrida com uma rodada única mata mutantes de forma não determinística — repita N rodadas ou prefira um duplo determinístico*.

---

## Requirement Traceability Update (proposta)

| Requisito | Status anterior | Status novo |
| --------- | --------------- | ----------- |
| EMP-01 | Verified (domínio) | ⚠️ Verified com ressalva — edge cases de CNPJ simultâneo e storage cobertos em e2e; re-cadastro concorrente em aberto (GAP 2) |
| EMP-04 | Verified (domínio) | ⚠️ Verified com ressalva — decisão concorrente e enfileiramento na aprovação cobertos; rejeição sem evidência de fila (GAP 7) |
| EMP-05 | Verified (domínio); CAS aberto (T30) | ⚠️ **GAP 3 da Fase 5 fechado** para `aprovar`/`rejeitar` (M1 e M10 mortos) e parcialmente para `suspender` (GAP 6); `reativar` sem cobertura (GAP 1) |

---

## Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 14 critérios com citação `file:line`; 2 sem evidência (reativação concorrente; enfileiramento na rejeição); 3 spec-precision gaps; 1 asserção tautológica
**Sensor**: 10 mutantes — 6 killed, 3 survived (M6, M6b, M8, M9 → 3 distintos + 1 variante), 1 intermitente (M2)
**Gate**: 317 passed, 0 failed, 0 skipped
**Isolamento**: worktree `/tmp/sensor-fase6` descartado; `git status --porcelain` do tree real vazio antes e depois

**O que funciona**: o CAS (`salvarTransicao` → `updateMany where {id, status}` → `count === 1`) é a correção certa e determinística para o GAP 3 da Fase 5 — auditoria e e-mail ficam **depois** da checagem, então a decisão perdedora não deixa rastro. O desenho do `MailerResiliente` (decorador sobre `TransporteEmail`) mantém os use cases intocados e a reserva de tentativa por CAS torna a fila segura entre instâncias. As 3 suítes novas cobrem os edge cases de corrida com asserções sobre estado final, contagem de auditoria e contagem de e-mails — não só sobre status HTTP.

**O que falta**: fechar GAP 1 e GAP 2 (transições de estado sem rede: `reativar` sem teste, re-cadastro sem CAS) antes de dar a Fase 6 por concluída; GAP 3 e GAP 4 logo em seguida (segredo na fila e backoff tautológico são falhas silenciosas em produção).

**Next steps**: rotear GAP 1–4 como fix tasks para um implementador e re-despachar o Verifier (iteração 1 de no máximo 3). GAP 5–7 podem ir no mesmo lote (são baratos). GAP 8 é edição de spec, não de código.

## Correções pós-verificação (iteração 1)

Gaps 1, 2, 3, 4, 6 e 7 tratados no commit de correção (nota do autor): reativação e suspensão com 8 rodadas de corrida (M9/M2), re-cadastro de empresa `REJEITADA` com CAS em `criar-empresa.ts` e e2e de re-cadastro simultâneo, e2e de que `SENHA_REDEFINICAO`/`EMAIL_CONFIRMACAO` nunca entram na fila (M8), backoff asserido com literais 60 s/120 s (M6/M6b), enfileiramento do e-mail de rejeição. Sensor manual: reativar e re-cadastro sem CAS derrubam 2 e2e. Gate: 150 unit, 172 e2e. Não tratados: gap 5 (worker só coberto via service, por ser desligado em teste), gap 8 (escape no `web`, mensagem do AC6 e SLA de 1 min são precisão de spec) e o risco menor de `editar-dados-empresa`/`confirmar-troca-email` regravarem `status`. Veredito segue **FAIL** até a re-verificação independente.

---

# Re-verificação 1

**Date**: 2026-09-19
**Diff range**: `d5c328b..HEAD` (`c79994a`) — 4 commits (`f247cda`, `89ee2d8`, `770ff6a`, `c79994a`)
**Verifier**: sub-agente independente (author ≠ verifier); nenhuma linha de código/teste do tree real foi alterada
**Escopo**: confirmar sob mutação o fechamento dos blockers 1–2 e majors 3–4, varrer novos caminhos de transição sem CAS e rodar o gate completo

## Veredito

# ❌ FAIL

**Os 6 gaps tratados na iteração 1 estão de fato fechados** — todos morrem sob mutação, agora de forma **determinística** (5/5 execuções, sem flakiness). O gate passa inteiro. Porém o item (c) desta re-verificação **promoveu a “risco menor” do rodapé anterior a blocker**: `editar-dados-empresa` e `confirmar-troca-email` sobrescrevem `status` e **desfazem uma decisão de admin já aplicada e já auditada**, o que foi demonstrado empiricamente (8 de 30 rodadas). Isso anula, na prática, a própria garantia que a T30 introduziu.

## Isolamento

- Worktree: `git worktree add /tmp/sensor-f6-rv1 HEAD --detach`; `node_modules` por symlink, `.env` copiado; **nunca `git stash`**
- Postgres de teste `localhost:5433` compartilhado, `maxWorkers: 1` (default de `test/jest-e2e.json`), **nenhuma suíte em paralelo**
- Descarte: `git worktree remove --force` + `git worktree prune`
- `git status --porcelain` do tree real: **vazio antes e depois** → isolamento confirmado; `HEAD` segue `c79994a`

## Gate Check

| Comando | Resultado |
| --- | --- |
| `npx tsc -p tsconfig.json --noEmit` | ✅ exit 0 |
| `npx eslint "{src,test}/**/*.ts"` | ✅ exit 0, 0 problemas |
| `npx jest` (unit) | ✅ 29 suítes, **150 passed**, 0 failed, 0 skipped |
| `npx jest --config ./test/jest-e2e.json` | ✅ 18 suítes, **172 passed**, 0 failed, 0 skipped, 60,4 s |

**Total**: 322 testes (era 317) — **+5 e2e** na iteração de correção, 0 unit. Nenhum teste removido, nenhuma asserção enfraquecida.

## Sensor de discriminação (re-execução)

**Baseline de flakiness**: `concorrencia.e2e-spec.ts` sem mutação → **5/5 execuções verdes** (6 testes cada). Suíte estável.

| # | Alvo (`file:line`) | Mutação | Suítes / execuções | Killed? |
| - | ------------------ | ------- | ------------------ | ------- |
| MA | `src/domain/fivo/application/use-cases/reativar-empresa.ts:44-51` | `salvarTransicao(empresa, statusAnterior)` + guarda → `save(empresa)` (CAS removido) | `concorrencia.e2e` **×5** | ✅ **Killed 5/5** (era **SURVIVED** como M9) |
| MB | `src/domain/fivo/application/use-cases/suspender-empresa.ts:44-51` | idem | `concorrencia.e2e` **×5** | ✅ **Killed 5/5** (era killed 4/5 como M2 — flakiness eliminada) |
| MC | `src/domain/fivo/application/use-cases/criar-empresa.ts:151-159` | `salvarTransicao(empresa, REJEITADA)` + guarda → `save(empresa)` (CAS removido do re-cadastro) | `concorrencia.e2e` **×5** | ✅ **Killed 5/5** — falha em `test/http/concorrencia.e2e-spec.ts:222` (`[201,409]` → `[201,201]`) |
| MC2 | `criar-empresa.ts:156-159` | mantém o CAS, remove só o `if (!aplicada) throw new EmpresaAlreadyExistsError()` | `concorrencia.e2e` ×3 | ✅ **Killed 3/3** |
| MD | `src/infra/mail/mailer-resiliente.ts:13-17` | acrescenta `EMAIL_CONFIRMACAO` e `SENHA_REDEFINICAO` a `TEMPLATES_ENFILEIRAVEIS` | `email-pendente.e2e` | ✅ **Killed** (2 testes falham — `email-pendente.e2e-spec.ts:248-263`) (era **SURVIVED** como M8) |
| ME | `src/infra/mail/email-pendente.service.ts:18` | backoff `2 ** (t-1)` → `7 ** (t-1)` | `email-pendente.e2e` | ✅ **Killed** (`email-pendente.e2e-spec.ts:175-177`, literal `120_000`) (era **SURVIVED** como M6) |
| MF | `src/infra/mail/email-pendente.service.ts:15` | `BACKOFF_BASE_MS` `60_000` → `1` | `email-pendente.e2e` | ✅ **Killed** (`email-pendente.e2e-spec.ts:169`, literal `60_000`) (era **SURVIVED** como M6b) |

**Resultado**: 7 mutantes, **7 killed, 0 survived**, 26 execuções de suíte. Os 3 sobreviventes e o intermitente do relatório anterior estão todos mortos.

### (a) Blockers 1 e 2 — fechados

- **Blocker 1 (CAS em reativar)**: `reativar-empresa.ts:44-51` usa `salvarTransicao` + `TransicaoInvalidaError`; coberto por `concorrencia.e2e-spec.ts:177-206` (`it.each` de suspensão **e** reativação, **8 rodadas** cada, asserindo `[204,409]`, `registroAuditoria.count() === 1` e `linha.status === final`). MA morto 5/5. ✅
- **Blocker 2 (CAS no re-cadastro)**: `criar-empresa.ts:148-163` — `salvarTransicao(empresa, EmpresaStatus.REJEITADA)` dentro do `unitOfWork`, com `throw new EmpresaAlreadyExistsError()` quando o CAS perde (desfazendo a escrita do usuário). Coberto por `concorrencia.e2e-spec.ts:208-230`, que além do `[201,409]` verifica que a empresa fica `PENDENTE_APROVACAO` **com o e-mail do vencedor** (`:229`) — asserção forte, mata também MC2. ✅

### (b) Majors 3 e 4 — fechados

- **Major 3 (allow-list)**: `email-pendente.e2e-spec.ts:248-263` — `it.each([SENHA_REDEFINICAO, EMAIL_CONFIRMACAO])` com `dados: { token: 'segredo' }`, transporte em falha → `rejects.toThrow()` **e** `pendencias()` com length 0. Cobre o ramo do `throw` e a ausência de linha na fila. ✅
- **Major 4 (backoff)**: a tautologia sumiu — `email-pendente.e2e-spec.ts:169` (`agora + 60_000`), `:175-177` (`segunda + 120_000`) e `:178-180` (`criadoEm + 60_000`, o atraso do `enfileirar`) usam **literais**. Mata base e expoente de forma independente. ✅

## (c) Varredura de transições de status sem CAS — **novo blocker**

`grep -rn "empresaRepository\.(save|salvarTransicao|create)" src/` (excluindo specs) → 8 chamadas. As **5 transições de estado** (aprovar `:48`, rejeitar `:53`, suspender `:44`, reativar `:44`, re-cadastro `criar-empresa.ts:151`) usam `salvarTransicao`. **Nenhum caminho de transição novo ficou sem CAS.** Sobram exatamente as 2 `save` já listadas como “não tratadas” — e elas **são** um gap real:

- `src/infra/database/prisma/mappers/prisma-empresa-mapper.ts:110` — `toPrisma` monta a linha **inteira**, incluindo `status`, `decididoPor`, `decididoEm`, `motivoDecisao`. Logo todo `save` regrava o estado da decisão.
- `src/domain/fivo/application/use-cases/editar-dados-empresa.ts:60` faz `findById` e `:101-104` copia `status`/`decididoPor`/`decididoEm`/`motivoDecisao` do valor **lido antes**; `:117` grava tudo de volta sem filtro. Não há guarda de status algum no use case.
- `src/domain/fivo/application/use-cases/confirmar-troca-email.ts:60` — mesma forma: a leitura (`findByTokenTrocaEmail`) acontece **fora** do `unitOfWork`, e o `save` dentro dele regrava `status` com o valor obsoleto.

**Evidência empírica** (probe descartável no worktree, `PATCH /empresas/me` × `POST /admin/empresas/:id/suspensao` em `Promise.all`, empresa `APROVADA`, 30 rodadas — arquivo deletado, nada no tree real):

```
rodada 3: status=APROVADA httpSuspensao=204 auditoria=1
... (8 ocorrências)
CLOBBERS: 8/30
```

Em **8 de 30 corridas**: o admin recebe **204**, o `registroAuditoria` grava `EMPRESA_SUSPENSA`, **e a empresa continua `APROVADA` com `decididoPor = null`**. A edição do dono pousa depois do `updateMany` do CAS (que casou legitimamente) e o sobrescreve.

**É gap real, e é blocker** — não o “risco menor” do rodapé da iteração 1:

1. Viola **EMP-05 AC5**: uma transição aplicada é silenciosamente desfeita por um caminho que não é de decisão.
2. Viola **EMP-05 AC7** (“auditoria imutável de toda mudança de estado”): a auditoria passa a registrar uma mudança que **não existe** no estado — divergência auditoria↔estado, pior que não auditar.
3. **Anula a correção da T30**: o CAS protege as decisões entre si, mas qualquer `PATCH /empresas/me` concorrente passa por cima. Impacto de negócio direto: empresa suspensa segue pública/aprovada.
4. É **reproduzível com ~27% de taxa** em uma máquina só — não é uma janela teórica.
5. Não há **nenhum** teste que cubra isso (nenhuma suíte cruza edição com decisão).

## Gaps restantes ranqueados

### GAP A (Blocker) — `save` regrava `status` e desfaz decisões já aplicadas e auditadas

- **Evidência**: `editar-dados-empresa.ts:101-104,117`; `confirmar-troca-email.ts:60`; `prisma-empresa-mapper.ts:110`. Probe: 8/30 rodadas com `204` + 1 linha de auditoria + `status` revertido para `APROVADA` e `decididoPor = null`.
- **Causa raiz**: `PrismaEmpresaMapper.toPrisma` é usado tanto por `save` quanto por `salvarTransicao`; `save` é um blind write de todas as colunas a partir de uma leitura obsoleta.
- **Fix task**: restringir o `save` de dados cadastrais às colunas que ele realmente edita — p.ex. um `atualizarDados(empresa)` no `PrismaEmpresaRepository` com um `data` explícito sem `status`/`decididoPor`/`decididoEm`/`motivoDecisao` (ou um `PrismaEmpresaMapper.toPrismaDadosCadastrais`). `confirmar-troca-email` idem (só `emailPendente`/`tokenTrocaEmailHash`).
- **Done when**: e2e com `PATCH /empresas/me` concorrente a `POST .../suspensao` em ≥8 rodadas → a empresa termina **sempre** `SUSPENSA` com `decididoPor` preenchido, e o teste falha se o `status` voltar ao `data` do update.

### GAP B (Minor) — `EmailPendenteWorker` sem nenhuma cobertura (ex-GAP 5, reaberto)

- **Evidência**: `grep -rn "EmailPendenteWorker" test/` → **0 ocorrências** (reconfirmado nesta iteração). `email-pendente.worker.ts:22-24` desliga o agendamento em `NODE_ENV=test` e `executar()` nunca é chamado; o Done-when “o worker drena pendências” continua provado pelo `EmailPendenteService`.
- **Fix task**: unit com `EmailPendenteService` falso — (a) `executar()` chama `drenar()`; (b) reentrância: duas chamadas sobrepostas → um só `drenar`; (c) `drenar` rejeitando → `executar()` não propaga e `emExecucao` volta a `false`.

### GAP C (Spec-precision, não bloqueia) — ex-GAP 8, intacto

- Escape “na renderização das páginas públicas” é do `web`; a API só prova round-trip JSON (`conteudo-hostil.e2e-spec.ts:67-93`). Ação: separar na spec a obrigação da API da do `web`.
- EMP-01 AC6 (“422 informando qual limite foi violado”): a mensagem não é asserida em `conteudo-hostil.e2e-spec.ts:103` nem em `arquivo.e2e-spec.ts:222` — embora `edicao-e-senha.e2e-spec.ts:196-198` já faça isso (`stringContaining('512x512')`) no caminho de edição. Ação: replicar a asserção de mensagem no caminho de cadastro.
- Success Criteria (“decisão por e-mail em menos de 1 minuto”): incompatível por construção com o primeiro backoff de 60 s + worker de 30 s quando o provedor falha. Ação: qualificar (“com o provedor disponível”).

### Fechados nesta iteração

GAP 1 (MA ✅), GAP 2 (MC/MC2 ✅), GAP 3 (MD ✅), GAP 4 (ME/MF ✅), GAP 6 (MB agora 5/5, determinístico ✅), GAP 7 (`email-pendente.e2e-spec.ts:211-246` — rejeição enfileirada com `template: CADASTRO_REJEITADO` ✅).

## Summary

**Overall**: ❌ Not Ready (iteração 1 de no máximo 3 — **1 blocker novo**, 1 minor, 1 spec-precision)

**Sensor**: 7 mutantes — **7 killed, 0 survived**; baseline de flakiness 5/5 verde; `concorrencia.e2e` executada 5× por mutante de CAS
**Gate**: 322 passed (150 unit + 172 e2e), 0 failed, 0 skipped
**Isolamento**: worktree `/tmp/sensor-f6-rv1` descartado; `git status --porcelain` do tree real vazio antes e depois

**O que funciona**: todos os 6 gaps roteados foram fechados com asserções que discriminam de verdade — o `it.each` de suspensão/reativação com 8 rodadas eliminou a não-determinância do M2, o teste de re-cadastro simultâneo checa o **e-mail do vencedor** (não só o par de status), a allow-list ganhou o teste do ramo negado com `token` explícito e o backoff passou a usar literais em três pontos.

**O que falta**: GAP A. É o mesmo defeito de lost update que a T30 resolveu nas decisões, agora vindo de um caminho que ninguém classificou como “transição”. Enquanto o `save` de dados cadastrais escrever a coluna `status`, o CAS das decisões é uma garantia parcial — e a auditoria mente. Deve ser corrigido antes de dar a Fase 6 por concluída; GAP B e C podem ir no mesmo lote ou em edição de spec.

**Next steps**: rotear GAP A (e opcionalmente GAP B) como fix tasks e re-despachar o Verifier (iteração 2 de 3).

### Notas de processo

- `python3 .claude/skills/tlc-spec-driven/scripts/validate_state.py cadastro-empresa` segue reportando `ERROR ... no validation.md` — esperado enquanto a convenção por fase estiver em uso; o `validation.md` consolidado só cabe ao fim da feature.
- Lições sugeridas ao orquestrador (escopo deste Verifier limita a escrita a este arquivo): (1) *CAS só protege se **todo** escritor da coluna participar dele — um `save` que serializa a entidade inteira é um escritor oculto*; (2) *mapper “linha inteira” compartilhado entre update de dados e update de estado transforma qualquer edição em lost update de estado*; (3) *gap classificado como “risco menor” sem probe deve ser medido antes de ser despriorizado — aqui a taxa real foi ~27%*.

## Correções pós-re-verificação 1 (iteração 2)

GAP A: `PrismaEmpresaRepository.save` grava só as colunas cadastrais; `status`, `decididoPor`, `decididoEm` e `motivoDecisao` mudam apenas por `salvarTransicao` (CAS). e2e `PATCH /empresas/me` × suspensão (24 rodadas) e teste de repositório de que `save` com leitura obsoleta não desfaz a decisão; o sensor com o `save` antigo derruba 2 testes. O teste "save persiste a transição" foi migrado para `salvarTransicao` mantendo as asserções (o contrato antigo era o defeito). GAP B: `EmailPendenteWorker.executar` coberto por e2e. GAP C segue como precisão de spec. Gate: 150 unit, 175 e2e. Veredito segue **FAIL** até a re-verificação 2.

---

# Re-verificação 2

**Date**: 2026-09-19
**Diff range**: `d5c328b..HEAD` (`6ef2e5a`) — 5 commits (`f247cda`, `89ee2d8`, `770ff6a`, `c79994a`, `6ef2e5a`)
**Verifier**: sub-agente independente (author ≠ verifier); nenhuma linha de código/teste do tree real foi alterada
**Escopo**: (a) confirmar sob mutação o fechamento do GAP A; (b) varredura adversarial por qualquer outro caminho que regrave estado a partir de leitura obsoleta; (c) conferir que a migração `save → salvarTransicao` no teste de repositório não enfraqueceu asserções; (d) gate completo

## Veredito

# ❌ FAIL

**O blocker (GAP A) está fechado, com evidência forte.** `PrismaEmpresaRepository.save` não escreve mais `status`/`decididoPor`/`decididoEm`/`motivoDecisao`; a corrida que antes desfazia 8 de 30 suspensões agora termina **sempre** `SUSPENSA` (24 rodadas por execução, 5 execuções) e o mutante de reversão morre **5/5, de forma determinística**, tanto no e2e de corrida quanto num teste de repositório sem corrida. Nenhum outro caminho de regrava de estado sobrou. O gate passa inteiro (325 testes).

O FAIL restante é de **discriminação, não de defeito**: das 4 colunas que o `save` passou a proteger, só 2 (`status` e `decididoPor`) têm asserção. Mutantes que reintroduzem a regravação de `decididoEm` ou de `motivoDecisao` **sobrevivem à suíte e2e inteira** — a mesma classe de buraco (“proteção sem rede”) que produziu o GAP A na iteração anterior. Nenhum blocker; a correção é acrescentar 2 `expect` ao teste de repositório já existente.

## Isolamento

- Worktree: `git worktree add /tmp/sensor-f6-rv2 HEAD --detach`; `node_modules` por symlink, `.env` copiado; **nunca `git stash`**
- Postgres de teste `localhost:5433` compartilhado; `maxWorkers: 1` (default de `test/jest-e2e.json`); **nenhuma suíte em paralelo**
- Descarte: `git worktree remove --force /tmp/sensor-f6-rv2` + `git worktree prune`; `/tmp` sem resíduo
- `git status --porcelain` do tree real: **vazio antes e depois**; `HEAD` segue `6ef2e5a` → isolamento confirmado

## (d) Gate Check

| Comando | Resultado |
| --- | --- |
| `npx tsc -p tsconfig.json --noEmit` | ✅ exit 0 |
| `npx eslint "{src,test}/**/*.ts"` | ✅ exit 0, 0 problemas |
| `npx jest` (unit) | ✅ 29 suítes, **150 passed**, 0 failed, 0 skipped, 4,0 s |
| `npx jest --config ./test/jest-e2e.json` | ✅ 18 suítes, **175 passed**, 0 failed, 0 skipped, 63,3 s |

**Total**: 325 testes (era 322) — **+3 e2e**, 0 unit: `concorrencia.e2e-spec.ts:208` (edição × suspensão), `prisma-empresa-repository.e2e-spec.ts:255` (`save` com leitura obsoleta), `email-pendente.e2e-spec.ts:266` (`EmailPendenteWorker.executar`). Nenhum teste removido.

## (a) Sensor — o mutante “`save` volta a gravar a linha inteira”

Correção sob verificação: `src/infra/database/prisma/prisma-empresa-repository.ts:86-105` — `save` destrutura `PrismaEmpresaMapper.toPrisma(empresa)` e descarta `status`, `decididoPor`, `decididoEm`, `motivoDecisao` (`:90-92`), gravando só `...cadastrais` (`:96`). `salvarTransicao` (`:107-120`) segue gravando a linha inteira sob CAS (`where: { id, status: estadoEsperado }`, `count === 1`).

| # | Mutação (no worktree) | Suítes / execuções | Killed? |
| - | --------------------- | ------------------ | ------- |
| **MG** | `save` → `data: PrismaEmpresaMapper.toPrisma(empresa)` (reversão integral, o defeito do GAP A) | `concorrencia.e2e` + `prisma-empresa-repository.e2e` **×5** | ✅ **Killed 5/5** — 2 testes falham em **todas** as execuções |
| **MH** | mantém a exclusão só de `status`; volta a gravar `decididoPor`/`decididoEm`/`motivoDecisao` | idem **×3** | ✅ **Killed 3/3** — `decididoPor` discrimina sozinho |
| **MI** | volta a gravar **só** `motivoDecisao` | **suíte e2e inteira** (18 suítes, 175 testes) | ❌ **SURVIVED** |
| **MI2** | volta a gravar **só** `decididoEm` | `concorrencia` + `prisma-empresa-repository` + `admin-empresas` (37 testes) | ❌ **SURVIVED** |
| **MK** | `EmailPendenteWorker.executar` não chama `fila.drenar()` | `email-pendente.e2e` | ✅ **Killed** (`email-pendente.e2e-spec.ts:266-278`) |
| **MJ** | remove o guard de reentrância `if (this.emExecucao) return` (`email-pendente.worker.ts:33-35`) | `email-pendente.e2e` | ❌ **SURVIVED** |

**Resultado**: 6 mutantes — **3 killed (2 determinísticos, 5/5 e 3/3), 3 survived**.

Falhas exatas do MG (idênticas nas 5 execuções):

```
● Concorrência … › edição cadastral concorrente com suspensão → a suspensão nunca é desfeita
  Expected: "SUSPENSA"   Received: "APROVADA"      test/http/concorrencia.e2e-spec.ts:240
● PrismaEmpresaRepository (e2e) › save não sobrescreve estado nem decisão gravados por outra transição
  Expected: "APROVADA"   Received: "PENDENTE_APROVACAO"   test/database/prisma-empresa-repository.e2e-spec.ts:270
```

**Estabilidade**: o kill **não depende de timing**. `prisma-empresa-repository.e2e-spec.ts:255-272` é sequencial (`create` → `findById` obsoleta → `salvarTransicao` → `save(obsoleta)` → `findById`), sem `Promise.all`; ele mata MG e MH sozinho, 100% das vezes. O e2e de corrida (`concorrencia.e2e-spec.ts:208-244`, `RODADAS_DE_CORRIDA * 3` = **24 rodadas**) é a rede redundante e também falhou em 5/5 — nenhuma flakiness observada em nenhuma das 8 execuções da suíte.

### Evidência `file:line` da correção

| Item | `file:line` | Conteúdo |
| --- | --- | --- |
| Colunas de decisão fora do `save` | `src/infra/database/prisma/prisma-empresa-repository.ts:90-92` | `const { status, decididoPor, decididoEm, motivoDecisao, ...cadastrais } = PrismaEmpresaMapper.toPrisma(empresa)` |
| Update restrito | `prisma-empresa-repository.ts:94-97` | `db.empresa.update({ where: { id }, data: cadastrais })` |
| CAS intacto | `prisma-empresa-repository.ts:111-119` | `updateMany({ where: { id, status: statusParaPrisma(estadoEsperado) }, … })` → `count === 1` |
| e2e da corrida | `test/http/concorrencia.e2e-spec.ts:235-242` | `edicao=200`, `suspensao=204`, `final.status === SUSPENSA`, `final.decididoPor).not.toBeNull()`, `registroAuditoria.count() === 1`, 24 rodadas |
| Teste determinístico | `test/database/prisma-empresa-repository.e2e-spec.ts:267-271` | `save(obsoleta)` → `status === APROVADA` e `decididoPor === adminId` |

## (b) Varredura adversarial — outros caminhos de regrava de estado

`grep -rn "empresa\.(update|updateMany|upsert|create|deleteMany)|\$executeRaw" src/` → **todas** as escritas na tabela `empresa` saem de `PrismaEmpresaRepository` (`:72` `create`, `:94` `update`, `:111` `updateMany`). Não há SQL cru nem outro caminho.

`grep -rn "empresaRepository\.(save|salvarTransicao|create)" src/` → 8 chamadas:

| Caminho | `file:line` | Método | Estado regravado a partir de leitura obsoleta? |
| --- | --- | --- | --- |
| aprovar | `aprovar-empresa.ts:48` | `salvarTransicao` | Não — CAS |
| rejeitar | `rejeitar-empresa.ts:53` | `salvarTransicao` | Não — CAS |
| suspender | `suspender-empresa.ts:44` | `salvarTransicao` | Não — CAS |
| reativar | `reativar-empresa.ts:44` | `salvarTransicao` | Não — CAS |
| re-cadastro | `criar-empresa.ts:151-159` | `salvarTransicao(empresa, REJEITADA)` dentro do `unitOfWork`, com `throw EmpresaAlreadyExistsError` se `!aplicada` | Não — CAS; perdedor desfaz a escrita do usuário |
| cadastro novo | `criar-empresa.ts:162` | `create` | Não — INSERT; unicidade no banco vira 409 |
| edição de dados | `editar-dados-empresa.ts:117` | `save` | **Não mais** — `empresaAtualizada` ainda *carrega* `status`/`decididoPor`/`decididoEm`/`motivoDecisao` (`:101-104`), mas o repositório os descarta |
| confirmar troca de e-mail | `confirmar-troca-email.ts:60` | `save` | **Não mais** — mesma proteção; a leitura fora do `unitOfWork` deixou de ser perigosa para estado |

**Upload de logo**: não há caminho próprio de escrita em `empresa`; o logo entra por `logoArquivoId`, coluna cadastral, via `criar-empresa` (`create`) ou `editar-dados-empresa` (`save`) — sem relação com estado. **UnitOfWork** (`prisma-unit-of-work.ts`): só injeta o `TransactionClient` em `PrismaTransactionContext`; não escreve nada nem altera as colunas de decisão. **Conclusão: não há gap real de regrava de estado remanescente.**

Observações residuais (nenhuma é regrava de estado):

- `save` continua sendo um *blind write* de **todas** as colunas cadastrais. Uma `PATCH /empresas/me` concorrente com uma `POST /empresas/troca-email/confirmacao` ainda pode sobrescrever `emailPendente`/`tokenTrocaEmailHash`/`nomeFantasia` a partir de leitura obsoleta. É lost update de dados do próprio dono, entre dois caminhos do mesmo ator — não viola nenhum AC da spec e não desfaz decisão de admin. Fica como dívida, não como gap.
- `InMemoryEmpresaRepository.save` (`test/repositories/in-memory-empresa-repository.ts`) troca o item inteiro, **incluindo `status`** — o double diverge do contrato novo do `save`, e `salvarTransicao` nele ignora `estadoEsperado` e devolve `true` sempre. Nenhum use case depende disso hoje (todas as transições usam `salvarTransicao`), mas a camada unit não consegue detectar uma regressão de contrato. A porta `EmpresaRepository` (`src/domain/fivo/application/ports/database/empresa-repository.ts:15`) também não documenta que `save` não grava estado — só `salvarTransicao` tem docstring.
- `void [status, decididoPor, decididoEm, motivoDecisao];` (`prisma-empresa-repository.ts:92`) é um contorno de lint para variáveis não usadas. Funciona e é honesto (o comentário acima explica o porquê), mas `ignoreRestSiblings` no ESLint ou um `data` explícito seria mais idiomático. Cosmético.
- `criar-empresa.ts` no re-cadastro constrói `Empresa.create` sem `createdAt`, então `salvarTransicao` **reseta `criadoEm`**. Parece intencional (a fila de aprovação ordena por `criadoEm`), mas não há teste nem nota; vale confirmar com o autor da spec. Fora do escopo deste blocker.

## (c) Migração do teste de repositório — asserções preservadas

Comparação com `git show d5c328b:api/test/database/prisma-empresa-repository.e2e-spec.ts`:

| Versão | Título | Asserções |
| --- | --- | --- |
| `d5c328b` | `save persiste a transição de estado com autor e data da decisão` | `resultado.isRight() === true`; `encontrada!.status === APROVADA`; `encontrada!.decididoPor?.toString() === adminId`; `encontrada!.decididoEm?.getTime() === empresa.decididoEm!.getTime()` |
| `HEAD` (`:231-253`) | `salvarTransicao persiste a transição de estado com autor e data da decisão` | **as mesmas 4**, nas mesmas formas (`:238`, `:248`, `:249`, `:250-252`) **+ `expect(aplicada).toBe(true)` (`:245`)** |

O corpo mudou só na linha de persistência (`repository.save(empresa)` → `repository.salvarTransicao(empresa, EmpresaStatus.PENDENTE_APROVACAO)`), exatamente como nos 4 use cases. **Nada foi enfraquecido — a migração é estritamente mais forte (+1 asserção)**, e o teste novo de `:255-272` cobre o contrato que o antigo exercitava por acidente. ✅

## Gaps restantes ranqueados

### GAP A — **FECHADO** ✅

`save` não regrava estado; MG morto 5/5 e MH morto 3/3, com um teste determinístico (sem corrida) entre os matadores. A corrida de 8/30 da re-verificação 1 não reproduz mais: `concorrencia.e2e-spec.ts:208-244` passou em 24 rodadas × 8 execuções da suíte.

### GAP D (Minor, novo) — `decididoEm` e `motivoDecisao` protegidos sem rede

- **Evidência**: MI (regrava só `motivoDecisao`) sobreviveu à **suíte e2e inteira, 175 testes**; MI2 (regrava só `decididoEm`) sobreviveu a `concorrencia` + `prisma-empresa-repository` + `admin-empresas` (37 testes). Nenhuma asserção do projeto olha essas duas colunas depois de um `save`.
- **Impacto**: no mesmo instante de corrida do GAP A (rejeição + `PATCH /empresas/me`), a empresa terminaria `REJEITADA` com `motivoDecisao = null` — a auditoria registra a rejeição e o motivo some, exatamente a divergência auditoria↔estado que o GAP A levantou em EMP-05 AC7 / EMP-04. É o mesmo padrão que gerou o GAP A: proteção correta, zero discriminação.
- **Fix task**: acrescentar 2 asserções ao teste que já existe — em `test/database/prisma-empresa-repository.e2e-spec.ts:269-271`, usar uma empresa **rejeitada com motivo** e asserir `final!.decididoEm?.getTime()` e `final!.motivoDecisao` depois do `save(obsoleta)`.
- **Done when**: MI e MI2 passam a ser mortos (3/3 execuções).

### GAP B (Minor, parcialmente fechado) — `EmailPendenteWorker`

- **Fechado**: `executar() → drenar()` agora é coberto (`test/http/email-pendente.e2e-spec.ts:266-278`); MK morre.
- **Aberto**: o guard de reentrância e o `catch` continuam sem cobertura — MJ (remoção de `if (this.emExecucao) return`, `email-pendente.worker.ts:33-35`) **sobreviveu**. Severidade baixa: a reserva por CAS no contador (`email-pendente.service.ts:62-76`) já impede envio duplicado mesmo sem o guard.
- **Fix task**: unit com `EmailPendenteService` falso — (a) duas chamadas sobrepostas → um só `drenar`; (b) `drenar` rejeitando → `executar()` não propaga e `emExecucao` volta a `false`.

### GAP E (Minor, novo) — double em memória diverge do contrato de `save`

- **Evidência**: `test/repositories/in-memory-empresa-repository.ts` — `save` substitui a entidade inteira (grava `status`) e `salvarTransicao(empresa)` ignora `estadoEsperado` e devolve `true` sempre; a porta (`empresa-repository.ts:15`) não documenta a restrição do `save`.
- **Impacto**: a camada unit não consegue detectar nem um use case que volte a depender do `save` para mudar estado, nem um CAS que perca. Hoje inofensivo (nenhum use case depende), mas é a via de reentrada do GAP A.
- **Fix task**: documentar na porta que `save` não altera estado/decisão e alinhar o double (`save` preserva as 4 colunas; `salvarTransicao` compara `estadoEsperado` com o item guardado).

### GAP C (Spec-precision, não bloqueia) — intacto

Inalterado desde a re-verificação 1: escape “na renderização das páginas públicas” é obrigação do `web` (a API só prova round-trip JSON em `conteudo-hostil.e2e-spec.ts:67-93`); a mensagem do 422 de EMP-01 AC6 não é asserida no caminho de cadastro; o Success Criterion de “e-mail em menos de 1 minuto” é incompatível com o primeiro backoff de 60 s + worker de 30 s quando o provedor falha. Todos são edição de spec, não de código.

## Summary

**Overall**: ❌ Not Ready — **iteração 2 de no máximo 3; 0 blockers, 3 minors** (o próximo FAIL deve escalar ao usuário)

**Spec-anchored check**: EMP-05 AC5/AC7 e EMP-04 voltam a ser verdadeiros no caminho de edição concorrente, com citação `file:line` (`concorrencia.e2e-spec.ts:235-242`, `prisma-empresa-repository.e2e-spec.ts:267-271`)
**Sensor**: 6 mutantes — **3 killed (MG 5/5, MH 3/3, MK), 3 survived (MI, MI2, MJ)**; 8 execuções de suíte e2e, zero flakiness
**Gate**: 325 passed (150 unit + 175 e2e), 0 failed, 0 skipped
**Isolamento**: worktree `/tmp/sensor-f6-rv2` descartado; `git status --porcelain` do tree real vazio antes e depois

**O que funciona**: a correção do GAP A é a certa e a mais barata — em vez de espalhar CAS, ela **remove o escritor oculto**: `save` deixou de ser um escritor das colunas de estado, então o CAS de `salvarTransicao` passa a ser a **única** porta de entrada e a garantia vira estrutural, não circunstancial. E a cobertura foi feita nos dois níveis certos: um teste de repositório **sem corrida** (que mata o mutante 100% das vezes, sem depender de timing) e um e2e de corrida de 24 rodadas como rede. A migração `save → salvarTransicao` no teste antigo preservou todas as asserções e acrescentou uma.

**O que falta**: só discriminação. Duas das quatro colunas protegidas (`decididoEm`, `motivoDecisao`) não têm nenhuma asserção que as defenda — a lição da iteração anterior (“proteção sem teste é comentário”) vale igual aqui, e o conserto cabe em 2 `expect` no teste que já existe. GAP B (reentrância do worker) e GAP E (double desalinhado) são baratos e podem ir no mesmo lote; GAP C é edição de spec.

**Next steps**: rotear GAP D (obrigatório), GAP B e GAP E (oportunos) como um único lote de fortalecimento de teste; re-verificar. Se o orquestrador preferir, GAP D sozinho basta para transformar este FAIL em PASS.

### Notas de processo

- `python3 .claude/skills/tlc-spec-driven/scripts/validate_state.py cadastro-empresa` segue reportando `ERROR ... no validation.md` — esperado enquanto a convenção por fase estiver em uso.
- Lições sugeridas ao orquestrador (escopo deste Verifier limita a escrita a este arquivo): (1) *quando uma correção protege N colunas, o sensor tem de mutar **cada** coluna isoladamente — matar o mutante “reverte tudo” não prova nada sobre as demais*; (2) *o melhor matador de um bug de corrida costuma ser um teste **sequencial** no nível do repositório: determinístico, rápido e imune a flakiness — o e2e de corrida é a rede, não a prova*; (3) *test double que não reproduz a restrição nova da porta é a via de reentrada do bug corrigido*.

## Correção pós-re-verificação 2 (iteração 3)

GAP D: o teste de repositório "save não sobrescreve estado nem decisão" passou a decidir por rejeição e assere `status`, `decididoPor`, `decididoEm` e `motivoDecisao`; o mutante que regrava `decididoEm`/`motivoDecisao` agora derruba o teste. Gates: 150 unit, 175 e2e. Os gaps B (reentrância do worker) e E (double em memória diverge do CAS real) seguem como minor sem correção. O relatório da re-verificação 2 deu 0 blockers e apontava só o GAP D para virar PASS; falta a confirmação independente (iteração 3 de 3).

---

# Re-verificação 3

**Date**: 2026-09-19
**Diff range**: `d5c328b..HEAD` (`d5e0c0e`) — 6 commits (`f247cda`, `89ee2d8`, `770ff6a`, `c79994a`, `6ef2e5a`, `d5e0c0e`)
**Verifier**: sub-agente independente (author ≠ verifier); nenhuma linha de código/teste do tree real foi alterada
**Escopo**: (a) confirmar sob mutação o fechamento do GAP D — o único item que impedia o PASS na re-verificação 2; (b) gate completo; (c) isolamento

## Veredito

# ✅ PASS

**0 blockers, 0 majors, 2 minors conhecidos e aceitos (GAP B, GAP E).**

O GAP D está fechado com evidência determinística. As quatro colunas que o `save` passou a proteger (`status`, `decididoPor`, `decididoEm`, `motivoDecisao`) agora têm asserção: os três mutantes que reintroduzem a regravação — **MG** (linha inteira), **MI** (só `motivoDecisao`) e **MI2** (só `decididoEm`) — **morrem 3/3 execuções cada**, sem depender de timing. MI e MI2, que na re-verificação 2 sobreviviam à suíte e2e inteira (175 testes), agora são mortos pelo teste de repositório sequencial. O gate passa inteiro: 325 testes, 0 falhas, 0 skips.

## Isolamento

- Worktree: `git worktree add /tmp/sensor-f6-rv3 HEAD --detach` (detached em `d5e0c0e`); `node_modules` por symlink, `.env` copiado; **nunca `git stash`**
- Postgres de teste `localhost:5433` compartilhado; `maxWorkers: 1` (`test/jest-e2e.json`); **nenhuma suíte em paralelo**, nenhuma execução concorrente
- Mutações aplicadas e revertidas por script no worktree; `git diff` do worktree **vazio** antes do descarte
- Descarte: `git worktree remove --force /tmp/sensor-f6-rv3` + `git worktree prune`; `/tmp/sensor-f6-rv3` inexistente ao fim
- **`git status --porcelain` do tree real: vazio antes e depois**; `HEAD` segue `d5e0c0e` em `feat/cadastro-empresa-robustez` → isolamento confirmado

## (b) Gate Check

| Comando | Resultado |
| --- | --- |
| `npx tsc -p tsconfig.json --noEmit` | ✅ exit 0 |
| `npx eslint "{src,test}/**/*.ts"` | ✅ exit 0, 0 problemas |
| `npx jest` (unit) | ✅ 29 suítes, **150 passed**, 0 failed, 0 skipped, 3,7 s |
| `npx jest --config ./test/jest-e2e.json` | ✅ 18 suítes, **175 passed**, 0 failed, 0 skipped, 65,0 s |

**Total**: 325 testes (150 unit + 175 e2e) — mesma contagem da re-verificação 2: o commit `d5e0c0e` **fortaleceu** um teste existente (+2 `expect`) em vez de acrescentar um novo. Nenhum teste removido ou skipado.

## (a) Sensor — GAP D fechado

Correção sob verificação: `test/database/prisma-empresa-repository.e2e-spec.ts:255-277` — o teste `save não sobrescreve estado nem decisão gravados por outra transição` passou a decidir por **rejeição com motivo** (`decidida.rejeitar(adminId, motivo)`, `:261`) e assere as 4 colunas depois de `repository.save(obsoleta)`: `status === REJEITADA` (`:271`), `decididoPor === adminId` (`:272`), `decididoEm?.getTime() === decidida.decididoEm!.getTime()` (`:273`) e `motivoDecisao === motivo` (`:274`).

Suítes de cada rodada: `test/database/prisma-empresa-repository.e2e-spec.ts` + `test/http/concorrencia.e2e-spec.ts` (17 testes, incluindo as 24 rodadas de corrida).

| # | Mutação em `prisma-empresa-repository.ts:94-97` | Execuções | Killed? | Falha exata |
| - | --- | --- | --- | --- |
| **MG** | `data: PrismaEmpresaMapper.toPrisma(empresa)` (regrava a linha inteira — o defeito do GAP A) | **×3** | ✅ **Killed 3/3** | 2 testes falham em todas: `concorrencia.e2e-spec.ts` (suspensão desfeita) + `prisma-empresa-repository.e2e-spec.ts` |
| **MI** | `data: { ...cadastrais, motivoDecisao }` (regrava só `motivoDecisao`) | **×3** | ✅ **Killed 3/3** (antes SURVIVED) | `Expected: "Documentação do CNPJ não confere com a razão social." / Received: null` |
| **MI2** | `data: { ...cadastrais, decididoEm }` (regrava só `decididoEm`) | **×3** | ✅ **Killed 3/3** (antes SURVIVED) | `Expected: 1789824830519 / Received: undefined` |

**Resultado**: 3/3 mutantes mortos, **9 execuções, 9 kills, zero flakiness**. A mensagem de falha aponta direto para a coluna mutada em cada caso — a discriminação é por coluna, não por acidente de agregação.

**Estabilidade**: MI e MI2 são mortos pelo teste **sequencial** de repositório (`create` → `findById` obsoleta → `rejeitar` + `salvarTransicao` → `save(obsoleta)` → `findById`), sem `Promise.all` e sem dependência de timing. O e2e de corrida de 24 rodadas segue como rede redundante (mata MG, passa limpo em MI/MI2 por não olhar essas colunas). A lição (1) da re-verificação 2 — “mutar **cada** coluna isoladamente” — foi aplicada e o resultado é positivo para as 4.

## Gaps restantes ranqueados

### GAP A — **FECHADO** ✅ (confirmado na re-verificação 2, re-confirmado aqui via MG 3/3)

### GAP D — **FECHADO** ✅

MI e MI2 morrem 3/3. As 4 colunas protegidas pelo `save` têm asserção.

### GAP B (Minor, aberto — não bloqueia) — reentrância do `EmailPendenteWorker`

`executar() → drenar()` está coberto (`test/http/email-pendente.e2e-spec.ts:266-278`), mas o guard `if (this.emExecucao) return` (`src/infra/mail/email-pendente.worker.ts:34`) e o `catch` seguem sem cobertura — `grep -rn "emExecucao" src/ test/` só encontra ocorrências em `src/`, nenhuma em `test/`. Severidade baixa e inalterada: a reserva por CAS no contador (`email-pendente.service.ts:62-76`) já impede envio duplicado mesmo sem o guard, então o pior caso é trabalho redundante, não e-mail duplicado. **Fix task** (backlog): unit com `EmailPendenteService` falso — (a) duas chamadas sobrepostas → um só `drenar`; (b) `drenar` rejeitando → `executar()` não propaga e `emExecucao` volta a `false`.

### GAP E (Minor, aberto — não bloqueia) — double em memória diverge do contrato de `save`

`test/repositories/in-memory-empresa-repository.ts`: `save` substitui a entidade inteira (grava `status`) e `salvarTransicao` ignora `estadoEsperado` e devolve `true` sempre; a porta (`empresa-repository.ts:15`) não documenta que `save` não altera estado/decisão. Nenhum use case depende disso hoje (todas as transições passam por `salvarTransicao`), mas a camada unit não detectaria uma regressão de contrato — é a via de reentrada do GAP A. **Fix task** (backlog): documentar a restrição na porta e alinhar o double (preservar as 4 colunas no `save`; comparar `estadoEsperado` no `salvarTransicao`).

### GAP C (Spec-precision, não bloqueia) — intacto

Inalterado desde a re-verificação 1: escape na renderização das páginas públicas é obrigação do `web`; a mensagem do 422 de EMP-01 AC6 não é asserida no caminho de cadastro; o Success Criterion de “e-mail em menos de 1 minuto” é incompatível com backoff de 60 s + worker de 30 s quando o provedor falha. Todos são edição de spec, não de código.

## Summary

**Overall**: ✅ **Ready** — iteração 3 de 3; **0 blockers, 0 majors, 2 minors aceitos** (GAP B, GAP E) + GAP C (spec-precision)

**Spec-anchored check**: EMP-05 AC5/AC7 e EMP-04 verificados no caminho de edição concorrente com citação `file:line` (`concorrencia.e2e-spec.ts:235-242`, `prisma-empresa-repository.e2e-spec.ts:271-274`); a divergência auditoria↔estado por `motivoDecisao`/`decididoEm` perdidos deixou de ser possível sem derrubar a suíte
**Sensor**: 3 mutantes (MG, MI, MI2) — **3 killed, 0 survived**, 3 execuções cada, determinísticos
**Gate**: 325 passed (150 unit + 175 e2e), 0 failed, 0 skipped; `tsc` e `eslint` limpos
**Isolamento**: worktree `/tmp/sensor-f6-rv3` descartado; `git status --porcelain` do tree real vazio antes e depois

**O que funciona**: a correção do GAP A removeu o escritor oculto em vez de espalhar CAS — `salvarTransicao` é a única porta de entrada das colunas de estado, e a garantia virou estrutural. O commit `d5e0c0e` fechou o último buraco de discriminação no lugar certo e pelo custo certo: 2 `expect` num teste sequencial que já existia, em vez de mais um e2e de corrida. A cobertura fica nos dois níveis complementares — repositório determinístico como prova, corrida de 24 rodadas como rede.

**O que falta (não bloqueia)**: GAP B e GAP E são fortalecimento de teste/documentação de porta, baratos e sem risco em produção hoje; GAP C é edição de spec. Recomenda-se agendá-los como um lote de dívida, não como bloqueio da Fase 6.

**Next steps**: Fase 6 aprovada; seguir para a próxima fase. Registrar GAP B, GAP E e GAP C no backlog.

### Notas de processo

- `python3 .claude/skills/tlc-spec-driven/scripts/validate_state.py cadastro-empresa` segue reportando `ERROR ... no validation.md` — esperado enquanto a convenção por fase (`validation-faseN.md`) estiver em uso; vale alinhar o script à convenção.
- Lição confirmada nesta iteração: *mutar cada coluna/campo protegido isoladamente é o que separa “a correção existe” de “a correção está defendida”* — MG sozinho dava um falso verde nas re-verificações anteriores; MI e MI2 só apareceram quando a mutação foi granular.
- Lição confirmada: *o melhor matador de um bug de corrida é um teste sequencial no nível do repositório* — 9/9 kills sem flakiness, contra a corrida de 8/30 que originou o gap.
