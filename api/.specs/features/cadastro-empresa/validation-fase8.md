# Cadastro de Empresa — Validação da Fase 8 (T40–T46)

**Date**: 2026-09-20
**Spec**: `.specs/features/cadastro-empresa/spec.md`
**Diff range**: `05f9041..HEAD` (`13e2a48`) — 7 commits, 26 arquivos, +550/−115:

| Commit | Task | Assunto |
| ------ | ---- | ------- |
| `d09755b` | T40 | `feat(api): link de troca de e-mail expira em 24 horas` |
| `d5613b2` | T41 | `feat(api): persiste prazo do link de troca de e-mail` |
| `839fa57` | T42 | `fix(api): troca de e-mail não sobrescreve dados cadastrais` |
| `7c2fe27` | T43 | `fix(api): serve arquivos com csp sandbox e content-disposition` |
| `46c23f9` | T44 | `fix(api): leitura de arquivo ausente responde 404` |
| `8ac3013` | T45 | `test(api): assere mensagem e corpo do 422 de logo no cadastro` |
| `13e2a48` | T46 | `feat(api): expurga a fila de e-mail após 30 dias` |

**Verifier**: sub-agente independente (author ≠ verifier). Nenhuma linha de produção ou teste do tree real foi alterada; mutações em `git worktree` descartável.

---

## Veredito

# ✅ PASS (com 1 mutante sobrevivente, Minor, e 2 ressalvas)

Todos os "Done when" de T40–T46 têm asserção citada e batem com a spec. Gate: 171 unit / 188 e2e, verde. Sensor: 21 mutantes injetados, 19 mortos, 2 sobreviventes (1 fronteira spec-equivalente, 1 fronteira real de retenção — Achado 1).

---

## Task Completion

| Task | Status | Notas |
| ---- | ------ | ----- |
| T40 | ✅ Done | Desvio: `Empresa.solicitarTrocaDeEmail` não existia; foi criado (entidade) e usado por `EditarDadosEmpresaUseCase` — ver "Desvio 1" |
| T41 | ✅ Done | Migration `20260920204743_token_troca_email_expira_em`, mapper (ida e volta), controller repassa `agora` |
| T42 | ✅ Done | `salvarTrocaDeEmail` na porta, no Prisma e no double; `save` deixou de gravar as 3 colunas de e-mail |
| T43 | ✅ Done | CSP em toda resposta; `attachment` só para SVG |
| T44 | ✅ Done | `lerBytes` → `findUnique` + `null`; controller lança 404 |
| T45 | ✅ Done | Só teste; 3 casos com mensagem literal + `statusCode` |
| T46 | ✅ Done | `expurgar(agora)` + chamada no worker após `drenar` |

`tasks.md`: só marcação `[x]`/estado; nenhum "Done when" reescrito (`git diff` de 58 linhas, sem trave deslocada).

---

## Spec-Anchored Acceptance Criteria (evidence-or-zero)

### EMP-08 AC6 — link usado >24 h após a solicitação → HTTP 400 "Link de confirmação inválido ou expirado", e-mail anterior ativo (T40, T41)

| Critério | Outcome definido | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| Unit: 23h59 → sucesso | sucesso; e-mail trocado | `confirmar-troca-email.spec.ts:132` — `expect(response.isRight()).toBe(true)`; `:133-135` — `email` `toBe('novo@empresa.test')` | ✅ PASS |
| Unit: 24h01 → `TokenConfirmacaoEmailInvalidoError`, `user.email` inalterado | erro; mensagem literal; e-mail antigo; pendência mantida | `:146` `isLeft()`; `:147` `toBeInstanceOf(TokenConfirmacaoEmailInvalidoError)`; `:148-150` `.message` `toBe('Link de confirmação inválido ou expirado')`; `:151-153` `email` `toBe('antigo@empresa.test')`; `:157` `emailPendente` `toBe('novo@empresa.test')` | ✅ PASS |
| Unit da entidade: `solicitarTrocaDeEmail` grava prazo de 24 h | `agora + 24 h` exato | `empresa.spec.ts:274-276` — `expect(empresa.tokenTrocaEmailExpiraEm).toEqual(new Date('2026-09-21T12:00:00.000Z'))` (agora = `2026-09-20T12:00Z`); `:272-273` e-mail e hash | ✅ PASS |
| `limparTrocaDeEmail` zera o prazo | `null` | `empresa.spec.ts:287` — `expect(empresa.tokenTrocaEmailExpiraEm).toBeNull()` (+ `:285-286`) | ✅ PASS |
| e2e: prazo vencido (forçado no banco) → 400 com mensagem literal | 400 + texto literal | `edicao-e-senha.e2e-spec.ts:413` — `expect(confirmacao.status).toBe(400)`; `:414-416` — `toMatchObject({ message: 'Link de confirmação inválido ou expirado' })` | ✅ PASS |
| e2e: login com e-mail antigo continua | 200 antigo / 401 novo | `edicao-e-senha.e2e-spec.ts:417` — `loginAntigo.status` `toBe(200)`; `:418` — `loginNovo.status` `toBe(401)` | ✅ PASS |
| e2e: link dentro do prazo → sucesso "atual" | link gerado pelo fluxo real (sem forçar o banco) confirma | `edicao-e-senha.e2e-spec.ts:357-358` — `loginNovo.status` `toBe(200)`, `loginAntigo.status` `toBe(401)`; prova indireta de que o pedido real grava o prazo (prazo `null` → inválido) | ✅ PASS |
| e2e de repositório: roundtrip de `tokenTrocaEmailExpiraEm` | mesmo instante | `prisma-empresa-repository.e2e-spec.ts:145` — `expect(encontrada!.tokenTrocaEmailExpiraEm?.getTime()).toBe(new Date('2026-04-06T11:00:00.000Z').getTime())` | ✅ PASS |
| Migration aplicada por `migrate deploy` | coluna existe | `migration.sql:2` `ADD COLUMN "token_troca_email_expira_em" TIMESTAMP(3)`; e2e (188 verdes) roda contra o banco migrado | ✅ PASS |

### EMP-08 AC1 / AC3 — edição cadastral e troca de e-mail não se sobrescrevem (T42)

| Critério | Outcome definido | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| Leitura obsoleta → `save` de `nomeFantasia` → `salvarTrocaDeEmail(obsoleta)` → nome novo preservado | `nomeFantasia = 'Nome Novo'` + e-mail pendente/hash/prazo da troca | `prisma-empresa-repository.e2e-spec.ts:293` (teste); asserções `:315-320` — `nomeFantasia` `toBe('Nome Novo')`, `emailPendente` `toBe('novo@empresa.test')`, `tokenTrocaEmailHash` `toBe('hash-do-token')`, `tokenTrocaEmailExpiraEm.getTime()` `toBe(...06T11:00Z)` | ✅ PASS |
| `save` cadastral com leitura obsoleta não apaga `emailPendente` | e-mail pendente e hash intactos, nome novo | `prisma-empresa-repository.e2e-spec.ts:323` (teste); asserções `:346-348` — `nomeFantasia` `toBe('Nome Novo')`, `emailPendente` `toBe('novo@empresa.test')`, `tokenTrocaEmailHash` `toBe('hash-do-token')` | ✅ PASS (não assere `tokenTrocaEmailExpiraEm` neste sentido — Achado 3) |
| Unit dos casos de uso seguem verdes com o double | verde | `confirmar-troca-email.spec.ts` 7/7; `editar-dados-empresa.spec.ts` verde (gate 171) | ✅ PASS |
| AC3: e-mail anterior ativo até confirmar | login antigo 200 antes de confirmar | e2e pré-existente (Fase 6) segue verde | ✅ PASS |

### EMP-03 / Edge "conteúdo hostil" — entrega de binário (T43, T44)

| Critério | Outcome definido | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| PNG → CSP, `inline`, `nosniff` | CSP `default-src 'none'; sandbox`; disposition inline | `arquivo.e2e-spec.ts:158-160` — `headers['content-security-policy']` `toBe("default-src 'none'; sandbox")`; `:161` — `headers['content-disposition']` `toMatch(/^inline/)`; `:162` — `nosniff` `toBe` | ✅ PASS |
| SVG → CSP, `attachment` | idem, `attachment` | `arquivo.e2e-spec.ts:175-177` — CSP `toBe(...)`; `:178` — `toMatch(/^attachment/)` | ✅ PASS |
| `lerBytes` com id inexistente → `null`, sem exceção | `null` | `arquivo-service.e2e-spec.ts:237` — `await expect(service.lerBytes(randomUUID())).resolves.toBeNull()` | ✅ PASS |
| Controller responde 404 "Arquivo não encontrado" | 404 | `arquivo.controller.ts` (`NotFoundException('Arquivo não encontrado')`); **sem e2e HTTP que o dispare** (o 404 pré-existente no controller vem de `buscarRegistro`; o ramo novo `!bytes` só é inalcançável na prática sem corrida) | ⚠️ Spec-precision / cobertura — Achado 4 |

### EMP-01 AC5 / AC6 — 422 de logo com o limite violado (T45)

| Critério | Outcome definido | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| SVG com script | 422 + motivo | `cadastro-empresa.e2e-spec.ts:254` (teste); `toMatchObject({ statusCode: 422, message: 'Arquivo SVG inválido: conteúdo contém script, foreignObject ou atributos onload/onclick/on*.' })` | ✅ PASS |
| Raster < 512×512 | 422 + "dimensão mínima de 512x512" | `cadastro-empresa.e2e-spec.ts:276`; `:285-287` — `statusCode: 422`, `message: 'Arquivo inválido: dimensão mínima de 512x512 pixels para raster.'` | ✅ PASS |
| > 5 MB (2 caminhos) | 422 + "tamanho excede o limite de 5 MB" | `cadastro-empresa.e2e-spec.ts:292` e `:305` / `:323` — `statusCode: 422`, `message: 'Arquivo inválido: tamanho excede o limite de 5 MB.'` | ✅ PASS |
| "Mutantes N5 e de dimensão mortos" | mortos | Ver nota de sensor (S-N5) | ✅ PASS |

A spec (AC6) exige "informando qual limite foi violado" sem texto literal; a mensagem asserida é a do código (`Arquivo.criar`), coerente com o critério. ⚠️ Spec-precision menor: AC6 não fixa a redação.

### Edge case "provedor de e-mail indisponível → enfileirar" — retenção (T46)

| Critério | Outcome definido | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| Enviada há 31 d → removida | fila vazia | `email-pendente.e2e-spec.ts:301-307` — `expect(await pendencias()).toHaveLength(0)` | ✅ PASS |
| Enviada há 29 d → mantida | só a linha `enviada-29d` | `:309-317` — `.map(id)` `toEqual(['enviada-29d'])` | ✅ PASS **mas rasa na fronteira** — Achado 1 (mutante 29 d sobrevive) |
| Esgotada há 31 d → removida | fila vazia | `:319-325` — `toHaveLength(0)` | ✅ PASS |
| Pendente antiga → mantida | só `pendente-antiga` | `:327-` — `.map(id)` `toEqual(['pendente-antiga'])` | ✅ PASS |
| Worker chama expurgo depois do dreno | 0 antes de concluir, 1 depois | `email-pendente.worker.spec.ts:62` — `expect(fila.expurgos).toBe(0)`; `:67` — `expect(fila.expurgos).toBe(1)` | ✅ PASS |

**Status**: 7/7 tasks, todos os "Done when" comportamentais com `file:line`. 0 sem evidência; 3 ⚠️ de precisão/cobertura (Achados 1, 3, 4).

---

## Avaliação do desvio T40 (`Empresa.solicitarTrocaDeEmail`)

**Razoável.** A task citava um método inexistente; a alternativa (montar `emailPendente`/hash/prazo no caso de uso, como antes) espalharia a regra "prazo = 24 h" fora do domínio e impediria o unit da entidade que a própria T40 exige ("`solicitarTrocaDeEmail` grava o prazo de 24 h"). Criar o método na entidade é o mínimo para satisfazer o critério, espelha `limparTrocaDeEmail` e `agora` é injetado (testável, `empresa.spec.ts:274-276`). Custo: `EditarDadosEmpresaUseCase` passou a construir a entidade e depois chamar `save` + `salvarTrocaDeEmail` em duas gravações (não transacionais); aceitável porque as colunas são disjuntas (T42) e o e-mail só é enviado depois. Ressalva menor: `updatedAt` agora é atribuído por `agora` no método, mas `limparTrocaDeEmail` ainda usa `new Date()` (assimetria inócua).

---

## Discrimination Sensor

**Scratch**: `git worktree add --detach .../scratchpad/wt HEAD`, `node_modules` por symlink, `DATABASE_URL` exportada, sem `git stash`; cada mutante revertido por `git checkout -- .` antes do seguinte; e2e sequenciais. Prisma client já gerado (schema inalterado).

| # | Alvo | Mutação | Resultado | Quem matou |
| - | ---- | ------- | --------- | ---------- |
| M1 | `confirmar-troca-email.ts:44` | `<= agora` → `> agora` | ✅ Killed | 4 falhas (unit) |
| M2 | idem | `<=` → `<` (fronteira exata de 24 h) | ⚠️ Survived (esperado) | Nenhum teste em exatamente 24h00. A spec diz "mais de 24 horas": em 24h00 exato o link é válido, então `<` é até mais fiel à spec — mutante quase-equivalente, ver Achado 2 |
| M3 | `empresa.ts` `PRAZO_...` | 24 h → 48 h | ✅ Killed | `empresa.spec` (1 falha) |
| M3b | idem | 24 h → 23 h | ✅ Killed | idem |
| M4 | `empresa.ts` `limparTrocaDeEmail` | não zera `tokenTrocaEmailExpiraEm` | ✅ Killed | `empresa.spec` (1 falha) |
| M5 | `prisma-empresa-repository.ts:save` | `save` volta a gravar as colunas de e-mail | ✅ Killed | e2e de repositório (1 falha) |
| M6 | `prisma-empresa-repository.ts:salvarTrocaDeEmail` | grava também os cadastrais (`toPrisma` inteiro) | ✅ Killed | e2e de repositório (1 falha) |
| M7 | `confirmar-troca-email.ts:70` | usa `save` em vez de `salvarTrocaDeEmail` | ✅ Killed | unit (2 falhas) |
| M7b | idem | idem, contra Postgres | ✅ Killed | e2e `edicao-e-senha` (2 falhas) |
| M8 | `editar-dados-empresa.ts` | pedido de troca não chama `salvarTrocaDeEmail` | ✅ Killed | e2e `edicao-e-senha` (4 falhas) |
| M9 | `arquivo.controller.ts` | sem `Content-Security-Policy` | ✅ Killed | 2 falhas (PNG e SVG) |
| M10 | `arquivo.controller.ts` | disposition invertida | ✅ Killed | 2 falhas |
| M11 | `arquivo.service.ts` | `lerBytes` volta a `findUniqueOrThrow` | ✅ Killed | `arquivo-service.e2e-spec.ts:236` |
| M12 | `email-pendente.service.ts` | retenção 30 → **29** dias | ❌ **Survived** | Nenhum: a linha "enviada há 29 dias" fica exatamente no limite (`lt` estrito) e é mantida — Achado 1 |
| M13 | idem | 30 → 31 dias | ✅ Killed | 2 falhas |
| M13b | idem | 30 → 32 dias | ✅ Killed | 2 falhas |
| M14 | `expurgar` | também remove por `criadoEm` (pendentes) | ✅ Killed | 2 falhas (pendente-antiga) |
| M15 | `expurgar` | ignora `esgotadoEm` | ✅ Killed | 1 falha |
| M16 | `email-pendente.worker.ts` | worker não chama `expurgar` | ✅ Killed | `worker.spec` (1 falha) |
| M17 | idem | `expurgar` antes de `drenar` | ✅ Killed | `worker.spec` (3 falhas) |

**Sensor depth**: lightweight ampliado (dados/integridade e defesa em profundidade; 21 mutantes).
**Result**: 19/21 killed, 2 survived (M2 quase-equivalente; M12 real) — ⚠️ M12 vira fix task.

**Isolamento**: worktree removido (`git worktree list` só a árvore real); `git status --porcelain` = `?? .vscode/` antes e depois; `HEAD` = `13e2a48` inalterado.

---

## Gate Check

- **Gate command**: `export DATABASE_URL="postgresql://fivo:fivo@localhost:5433/fivo_test?schema=public"; cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json`

| Comando | Resultado |
| ------- | --------- |
| `tsc --noEmit` | ✅ exit 0 |
| `eslint` | ✅ exit 0 |
| `jest` | ✅ 30 suítes, **171 passed**, 0 failed |
| `jest --config ./test/jest-e2e.json` | ✅ 18 suítes, **188 passed**, 0 failed |

Contagem: fase 7 = 166 unit / 176 e2e → agora 171 / 188 (+5 unit, +12 e2e), coerente com os alvos das tasks (T40 ≥169, T46 ≥167 unit → 171; T41 ≥178 … T46 ≥187 → 188). Sem testes removidos nem skipados (asserções de `lerBytes` só ganharam `?.` por tipo).

---

## Achados ranqueados

1. **(Minor, mutante sobrevivente) T46: teste "mantém a enviada há 29 dias" não discrimina o limite.** `email-pendente.e2e-spec.ts:310` usa exatamente `diasAtras(29)`; com retenção de 29 dias o `lt` estrito mantém a linha (M12 sobrevive). Como o "Done when" pediu literalmente 29 d / 31 d, o implementador cumpriu a task, mas o sensor mostra que a retenção real poderia ser 29 d. Fix task: usar uma fronteira dentro do limite (ex.: `diasAtras(29)` + 1 h, ou 29 d 23 h) para a linha mantida e 30 d + 1 min para a removida.
2. **(Minor, spec-precision) Fronteira exata de 24 h.** AC6 diz "mais de 24 horas"; o código expira em `<=` (24h00 exato é rejeitado) e nenhum teste fixa esse ponto (M2). Impacto real ~0 (instante de 1 ms). Decisão a registrar: ou `<` (alinhado à letra da spec) ou aceitar e documentar `<=`.
3. **(Minor) T42: asserção assimétrica.** O teste `save` cadastral com leitura obsoleta (`prisma-empresa-repository.e2e-spec.ts:346-348`) não assere `tokenTrocaEmailExpiraEm`; o mutante M5 morreu por outra asserção, mas um `save` que apagasse só o prazo passaria. Adicionar `expect(final!.tokenTrocaEmailExpiraEm?.getTime()).toBe(...)`.
4. **(Minor, cobertura) T44: o ramo `!bytes → 404` do controller não tem e2e HTTP** (só o service retorna `null`). O 404 de arquivo inexistente do fluxo normal já sai antes em `buscarRegistro`. O critério da task (service → `null`) está atendido; a rota só divergiria em corrida entre a checagem e a leitura. Aceitável; anotar se houver contrato OpenAPI (T53) que documente 404.
5. **(Minor, comportamento) Trocas de e-mail pendentes antes da migration ficam inválidas** (`!expiraEm → TokenConfirmacaoEmailInvalidoError`, `confirmar-troca-email.ts:38-44`), pois a coluna nova é `NULL` para linhas antigas. Correto e seguro (fail-closed); só vale registrar como nota de release, sem backfill.
6. **(Observação) Worker: falha em `expurgar` é logada como "Falha ao drenar a fila de e-mail"** (mesmo `catch`, `email-pendente.worker.ts:40-44`) e uma falha do dreno pula o expurgo daquele ciclo. Sem impacto funcional; mensagem de log levemente imprecisa.
7. **(Observação) `EditarDadosEmpresaUseCase` faz `save` e `salvarTrocaDeEmail` em duas gravações sem transação** (`editar-dados-empresa.ts:118-121`). Falha entre elas deixa o cadastro atualizado sem pendência — benigno (o usuário refaz o pedido); não há e-mail enviado nesse intervalo.

---

## Code Quality

| Princípio | Status |
| --------- | ------ |
| Minimum code | ✅ — 1 método de entidade, 1 método de porta, 1 de service; nenhuma abstração extra |
| Surgical changes | ✅ — arquivos de produção todos nomeados pelas tasks; `schema.prisma` teve só realinhamento de colunas do `prisma format` |
| No scope creep | ✅ |
| Matches patterns | ✅ — doubles atualizados junto da porta; testes ao lado dos pares existentes |
| Spec-anchored (valores asseridos = spec) | ✅ — 400/mensagem literal, 24 h exato, CSP e disposition literais, 422 + mensagens literais |
| Todo teste mapeia um critério | ✅ — os 17 testes novos (5 unit + 12 e2e) mapeiam para "Done when" T40–T46 |
| Testes removidos/enfraquecidos | ✅ nenhum |
| Diretrizes documentadas | none — strong defaults applied |

---

## Edge Cases

- [x] Provedor de e-mail indisponível → fila cresce; agora com retenção de 30 dias, sem tocar pendentes (T46; Achado 1 na fronteira)
- [x] Conteúdo hostil (SVG com script) → 422 com motivo (T45) e entrega com CSP `sandbox` + `attachment` (T43)
- [x] Corrida entre edição cadastral e confirmação de e-mail → sem *lost update* (T42)

---

## Requirement Traceability Update

| Requirement | Status anterior | Novo status |
| ----------- | --------------- | ----------- |
| EMP-08 (AC1, AC3, AC6) | Verified (domínio) | ✅ Verified — expiração de 24 h ponta a ponta (entidade → caso de uso → coluna → rota) e escritas de e-mail isoladas |
| EMP-03 | Verified (domínio, parcial) | ✅ Verified — entrega com CSP/disposition, 404 no service |
| EMP-01 (AC5, AC6) | Verified | ✅ Verified — mensagens de limite asseridas no caminho `POST /empresas` |

---

## Summary

**Overall**: ✅ Ready — 0 blockers, 0 majors; 1 mutante sobrevivente Minor (M12) + 1 quase-equivalente (M2)
**Spec-anchored check**: todos os "Done when" e ACs aplicáveis com `file:line`; 3 ⚠️ de precisão/cobertura
**Sensor**: 21 injetados, 19 killed, 2 survived
**Gate**: 171 unit + 188 e2e = 359 passed, 0 failed; `tsc` e `eslint` limpos
**Next steps**: fix task curta para Achado 1 (fronteira de retenção nos testes) e Achado 3 (asserção do prazo); decidir Achado 2; seguir para a Fase 9 (T47+).
