# Cadastro de Empresa — Validação da Fase 7 (T34–T39)

**Date**: 2026-09-19
**Spec**: `.specs/features/cadastro-empresa/spec.md`
**Diff range**: `main..HEAD` (`b639e3a`) — 6 commits:

| Commit | Task | Assunto |
| ------ | ---- | ------- |
| `33643db` | T34 | `test(api): double de empresa reproduz o cas do repositório` |
| `3dded50` | T35 | `test(api): double de sessão preserva revogações anteriores` |
| `8e8d9ce` | T36 | `test(api): cobre reentrância e falha do worker de e-mail` |
| `51d5f33` | T37 | `refactor(api): login grava ip e user-agent com gerador de sessão único` |
| `99a0d1c` | T38 | `fix(api): login compara hash-isca quando o e-mail não existe` |
| `b639e3a` | T39 | `fix(api): recuperação de senha não aguarda o envio do e-mail` |

**Verifier**: sub-agente independente (author ≠ verifier); nenhuma linha de código ou teste do tree real foi alterada — as mutações rodaram em `git worktree` descartável
**Escopo do diff**: 20 arquivos, +751/−63 — 1 arquivo novo de produção (`gerar-token-de-sessao.ts`), 1 spec novo (`email-pendente.worker.spec.ts`), 4 arquivos de produção alterados, 2 doubles em memória, 8 suites de teste, `tasks.md` (só marcação `[x]`)

---

## Veredito

# ✅ PASS

Os 6 commits fecham os três gaps herdados (GAP E e GAP B de `validation-fase6.md`, Finding 3 de `validation-fase3.md`) e os dois canais laterais de tempo apontados em `validation-fase5.md` (Finding 7 e Finding 8). O gate passa inteiro, os 17 testes novos são todos reivindicados por um "Done when", e **9 de 9 mutantes injetados morreram** — incluindo o mutante que a T34 exigia derrubar ≥5 testes, que derruba exatamente 5.

1 ressalva não bloqueante: `GeradorTokenOpaco` ficou órfão em produção (ver Achado 1).

---

## Task Completion

| Task | Status | Notas |
| ---- | ------ | ----- |
| T34 — Double `InMemoryEmpresaRepository` alinhado ao contrato | ✅ Done | Fecha o GAP E da Fase 6. `save` preserva as 4 colunas de decisão, `salvarTransicao` faz CAS real. 6 testes novos |
| T35 — `InMemorySessaoRepository.revogarTodasDoUsuario` | ✅ Done | Fecha o Finding 3 da Fase 3. Filtro `!item.revogadaEm` espelha o `where` do Prisma. 1 teste novo |
| T36 — `EmailPendenteWorker` reentrância e falha | ✅ Done | Fecha o GAP B da Fase 6. Os 4 cenários (a)–(d) cobertos. 4 testes novos |
| T37 — `ip`/`userAgent` + gerador de sessão único | ✅ Done (1 ressalva) | Fecha o Finding 7 da Fase 5. 1 unit + 1 e2e novos. Ressalva: `GeradorTokenOpaco.gerar()` ficou sem caller de produção — Achado 1 |
| T38 — Sem canal lateral de tempo no login | ✅ Done | Fecha o Finding 8 (login) da Fase 5. 2 testes novos |
| T39 — Recuperação de senha não aguarda o envio | ✅ Done | Fecha o Finding 8 (recuperação) da Fase 5. 2 testes novos |

`tasks.md` foi alterado **apenas** para marcar `[x]` nos Done-when de T34–T39 (`git diff main..HEAD -- .specs/.../tasks.md`: só linhas `- [ ]` → `- [x]`). Nenhum critério foi reescrito, afrouxado ou removido — não houve deslocamento de trave.

---

## Spec-Anchored Acceptance Criteria (evidence-or-zero)

Fonte da verdade por critério: o "Done when" da task; o AC da spec quando o critério aponta para um.

### T34 — EMP-05 (AC5, AC7) / EMP-04 (AC2) — decisão de admin sobrevive a leitura obsoleta

| Critério | Outcome definido | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| "`save` no double não altera as 4 colunas de decisão (unit que salva uma leitura obsoleta depois de uma transição)" | dado cadastral gravado; `status`/`decididoPor`/`decididoEm`/`motivoDecisao` = os da decisão vencedora | `editar-dados-empresa.spec.ts:207` — `expect(guardada.telefone).toBe('11888887777')`; `:208` — `expect(guardada.status).toBe(EmpresaStatus.REJEITADA)`; `:209` — `expect(guardada.decididoPor?.equals(adminId)).toBe(true)`; `:210` — `expect(guardada.decididoEm).toEqual(decididoEm)`; `:211` — `expect(guardada.motivoDecisao).toBe(motivo)` | ✅ PASS — as **4** colunas asseridas por valor, uma a uma |
| CAS perdido em `aprovar` | `TransicaoInvalidaError`, estado da vencedora intacto, 0 auditoria, 0 e-mail | `aprovar-empresa.spec.ts:197` — `expect(response.value).toBeInstanceOf(TransicaoInvalidaError)`; `:201` — `expect(guardada.status).toBe(EmpresaStatus.REJEITADA)`; `:202` — `expect(guardada.decididoPor?.equals(outroAdmin.id)).toBe(true)`; `:203` — `expect(guardada.motivoDecisao).toBe(MOTIVO_DA_VENCEDORA)`; `:204` — `expect(registroAuditoriaRepository.items).toHaveLength(0)`; `:205` — `expect(mailer.mensagens).toHaveLength(0)` | ✅ PASS |
| CAS perdido em `rejeitar` | idem, vencedora = aprovação | `rejeitar-empresa.spec.ts:228` — `toBeInstanceOf(TransicaoInvalidaError)`; `:232` — `expect(guardada.status).toBe(EmpresaStatus.APROVADA)`; `:233` — `decididoPor?.equals(outroAdmin.id) === true`; `:234` — `expect(guardada.motivoDecisao ?? null).toBeNull()`; `:235` — auditoria `toHaveLength(0)`; `:236` — mailer `toHaveLength(0)` | ✅ PASS |
| CAS perdido em `suspender` | idem, 0 auditoria | `suspender-empresa.spec.ts:119` — `toBeInstanceOf(TransicaoInvalidaError)`; `:123` — `expect(guardada.status).toBe(EmpresaStatus.SUSPENSA)`; `:124` — `decididoPor?.equals(outroAdmin.id) === true`; `:125` — auditoria `toHaveLength(0)` | ✅ PASS — o `decididoPor` é o que discrimina aqui (o `status` final coincide entre vencedora e perdedora) |
| CAS perdido em `reativar` | idem | `reativar-empresa.spec.ts:117` — `toBeInstanceOf(TransicaoInvalidaError)`; `:121` — `expect(guardada.status).toBe(EmpresaStatus.APROVADA)`; `:122` — `decididoPor?.equals(outroAdmin.id) === true`; `:123` — auditoria `toHaveLength(0)` | ✅ PASS — idem: o `decididoPor` carrega a discriminação |
| CAS perdido no re-cadastro de `criar-empresa` (edge case "empresa rejeitada tenta cadastrar de novo com o mesmo CNPJ") | `EmpresaAlreadyExistsError`, só o re-cadastro vencedor persiste | `criar-empresa.spec.ts:288` — `.rejects.toBeInstanceOf(EmpresaAlreadyExistsError)`; `:291` — `expect(guardada.razaoSocial).toBe('Empresa Vencedora LTDA')`; `:292` — `expect(guardada.status).toBe(EmpresaStatus.PENDENTE_APROVACAO)`; `:293` — `expect(empresaRepository.items).toHaveLength(1)`; `:294` — `expect(mailer.mensagens).toHaveLength(1)` | ✅ PASS |
| "Mutante: `salvarTransicao` voltando a devolver `true` sempre derruba ao menos 5 testes unit" | ≥5 testes vermelhos | Sensor M1 abaixo — **exatamente 5** testes derrubados, um por use case | ✅ PASS |
| Docstring da porta diz que `save` não altera estado nem decisão | texto na porta | `ports/database/empresa-repository.ts:15-19` — `/** Grava só os dados cadastrais. Não altera 'status', 'decididoPor', 'decididoEm' nem 'motivoDecisao' … */` | ✅ PASS |

**Fidelidade do double ao adaptador real** (re-derivada, não assumida): `in-memory-empresa-repository.ts:107-118` (`index === -1 || status !== estadoEsperado → false`) espelha `prisma-empresa-repository.ts:111-119` (`updateMany` com `where: { id, status: estadoEsperado }` → `count === 1`); `in-memory-empresa-repository.ts:97` (`copiar(empresa, this.items[index])`) espelha `prisma-empresa-repository.ts:90-97` (destructuring que descarta as 4 colunas antes do `update`). As `EmpresaProps` (`empresa.ts:16-40`) têm 22 campos e `copiar` (`in-memory-empresa-repository.ts:13-40`) copia os 22 — nenhum campo silenciosamente perdido.

### T35 — EMP-09 AC3 — "encerrar todas as sessões ativas daquela conta"

| Critério | Outcome definido | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| "Double filtra `revogadaEm === null` antes de revogar" | espelha `where: { usuarioId, revogadaEm: null }` do Prisma | `test/repositories/in-memory-sessao-repository.ts:45` — `.filter((item) => item.usuarioId === usuarioId && !item.revogadaEm)` | ✅ PASS |
| "sessão já revogada mantém a data original após a redefinição" | `revogadaEm` = a data anterior, byte a byte | `redefinir-senha.spec.ts:135` — `expect(jaRevogada?.revogadaEm).toEqual(revogadaAntes)` (`revogadaAntes = new Date('2025-12-31T10:00:00Z')`, `:105`) | ✅ PASS — asserção por **valor**, não por "é truthy" |
| "sessões ativas são revogadas" | `revogadaEm` preenchida e diferente da antiga | `redefinir-senha.spec.ts:140` — `expect(ativa?.revogadaEm).toBeInstanceOf(Date)`; `:141` — `expect(ativa?.revogadaEm).not.toEqual(revogadaAntes)` | ✅ PASS |

### T36 — EMP-04 / Edge case "provedor de e-mail indisponível"

| Critério (cenário do "Done when") | Outcome definido | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| (a) `executar()` chama `drenar()` uma vez | 1 chamada | `email-pendente.worker.spec.ts:49` — `expect(fila.chamadas).toBe(1)` | ✅ PASS |
| (b) duas chamadas sobrepostas → um só `drenar` | 1 chamada, ainda 1 depois da primeira terminar | `email-pendente.worker.spec.ts:59` — `expect(fila.chamadas).toBe(1)`; `:63` — `expect(fila.chamadas).toBe(1)` após `fila.concluir()` | ✅ PASS |
| (c) `drenar` rejeitando → resolve sem propagar, loga, e a chamada seguinte volta a drenar | `resolves.toBeUndefined()`, `Logger.error` com a mensagem literal, `chamadas === 2` na chamada seguinte | `email-pendente.worker.spec.ts:71` — `await expect(worker.executar()).resolves.toBeUndefined()`; `:74-77` — `expect(errorSpy).toHaveBeenCalledWith('Falha ao drenar a fila de e-mail', expect.any(Error))`; `:81` — `expect(fila.chamadas).toBe(2)` | ✅ PASS — `:81` é a asserção que prova o reset do `emExecucao` (o `finally`) |
| (d) `NODE_ENV=test` → `onModuleInit` não agenda nada | `setInterval` nunca chamado | `email-pendente.worker.spec.ts:98` — `expect(setIntervalSpy).not.toHaveBeenCalled()` | ✅ PASS |
| "Mutante: remover o guard derruba (b); remover o `finally` derruba (c)" | 2 mutantes mortos, nos testes nomeados | Sensor M4 e M5 abaixo — cada um derruba **exatamente** o teste nomeado na task | ✅ PASS |

### T37 — EMP-06 — sessão carrega `ip`/`userAgent`; gerador único

| Critério | Outcome definido | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| "a sessão criada pelo caso de uso carrega o `ip` e o `userAgent` recebidos" | os valores exatos enviados na requisição | `autenticar-usuario.spec.ts:188` — `expect(sessaoRepository.items[0].ip).toBe('203.0.113.7')`; `:189` — `expect(sessaoRepository.items[0].userAgent).toBe('Mozilla/5.0 (Teste)')` | ✅ PASS — **regra payload/conjunção atendida**: asserção sobre o estado gravado, não sobre "o mock `criar` foi chamado" |
| "e2e: `POST /sessoes` com `User-Agent` → a linha de `sessao` tem `ip` e `user_agent` preenchidos" | linha real no Postgres com os dois campos | `test/http/autenticacao.e2e-spec.ts:176` — `expect(sessoes).toHaveLength(1)`; `:177` — `expect(sessoes[0].userAgent).toBe('FivoTeste/1.0')`; `:178` — `expect(sessoes[0].ip).toMatch(/(127\.0\.0\.1\|::1)$/)` | ✅ PASS |
| "…o token do cookie autentica `GET /empresas/me`" | 200 com o e-mail do dono | `autenticacao.e2e-spec.ts:185` — `expect(resposta.status).toBe(200)`; `:186` — `expect(resposta.body).toMatchObject({ email: 'pessoa@fivo.test' })` | ✅ PASS |
| "`SessionService.criar` e o caso de uso usam a mesma função de geração" | um único gerador | `autenticar-usuario.ts:107` — `const { token, tokenHash } = gerarTokenDeSessao()`; `session.service.ts:31` — `const { token, tokenHash } = gerarTokenDeSessao()`; validação em `session.service.ts:51` — `hashDoTokenDeSessao(tokenCru)` | ✅ PASS |
| "…(nenhum `randomBytes`/`createHash` de token de sessão fora dela)" | nenhum gerador de token de sessão fora de `gerar-token-de-sessao.ts` | `gerador-token-opaco.ts:9` — `randomBytes(TOKEN_BYTES).toString('base64url')` ainda existe em `src/`, **sem nenhum caller de produção** (`grep -rn "geradorToken\.gerar\|\.gerar()" src/` → 0) | ⚠️ PASS com ressalva — ver Achado 1 |

**Entropia e hash conferidos nos dois lados** (o desvio hex × base64url declarado pelo implementador): `gerar-token-de-sessao.ts:3` — `TOKEN_BYTES = 32` → `randomBytes(32)` = **256 bits de entropia**, idêntico ao `GeradorTokenOpaco`; a codificação (`hex`, 64 caracteres) muda só o alfabeto, não a entropia. O hash é `sha256`/`hex` na escrita (`gerar-token-de-sessao.ts:12`) e na leitura (`session.service.ts:51` → mesma função), e é o mesmo algoritmo que o e2e pré-existente usa como referência (`test/http/auth.e2e-spec.ts:102` — `expect(linhas[0].tokenHash).toBe(geradorToken.sha256(token))`, com `GeradorTokenOpaco.sha256` = `createHash('sha256')…digest('hex')`). A asserção pré-existente `autenticar-usuario.spec.ts:147` — `expect(response.value.token).toMatch(/^[0-9a-f]{64}$/)` — continua válida e é justamente o que ancora o formato. **Nenhum gap**: a escolha de hex é consistente ponta a ponta e o e2e de sessão (176 testes) prova o roundtrip real.

### T38 — EMP-06 AC2 — "sem revelar qual dos dois falhou"

| Critério | Outcome definido | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| "e-mail inexistente → `hasher.compare` chamado exatamente 1 vez e resposta `CredenciaisInvalidasError`" | 1 `compare`; 401; mensagem literal "Credenciais inválidas" | `autenticar-usuario.spec.ts:201` — `expect(compareSpy).toHaveBeenCalledTimes(1)`; `:202-205` — `toHaveBeenCalledWith(SENHA_CORRETA, expect.stringMatching(/.+/))`; `:208` — `toBeInstanceOf(CredenciaisInvalidasError)`; `:209` — `expect(response.value.status).toBe(401)`; `:210` — `expect(response.value.message).toBe('Credenciais inválidas')` | ✅ PASS — status e mensagem batem **literalmente** com o texto do AC2 |
| "e-mail existente com senha errada → também 1 chamada de `compare` (paridade)" | 1 `compare`, mesmo erro | `autenticar-usuario.spec.ts:224` — `expect(compareSpy).toHaveBeenCalledTimes(1)`; `:227` — `toBeInstanceOf(CredenciaisInvalidasError)` | ✅ PASS — a paridade é asserida nos **dois** ramos, não só no novo |
| "Mutante: retornar antes do `compare` no ramo de e-mail inexistente derruba o teste" | mutante morto | Sensor M6 abaixo | ✅ PASS |
| Corpo e status idênticos aos do ramo de senha errada (EMP-06 AC2) | mesma classe de erro, mesmo 401, mesma mensagem | `wrong-credentials.error` é a mesma instância nos dois ramos (`autenticar-usuario.ts:62` e `:92`); e2e pré-existente `autenticacao.e2e-spec.ts` cobre o 401 na rota | ✅ PASS |

### T39 — EMP-09 AC1/AC2 — "202 neutro independentemente de o e-mail existir"

| Critério | Outcome definido | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| "com um `Mailer` que só resolve sob comando, o caso de uso resolve antes do envio terminar e o token já está persistido" | `right`; envio iniciado mas **não** concluído; 1 token gravado para o usuário certo | `solicitar-recuperacao-senha.spec.ts:98` — `expect(response.isRight()).toBe(true)`; `:99` — `expect(mailerControlado.chamadas).toHaveLength(1)`; `:100` — `expect(mailerControlado.concluido).toBe(false)`; `:101` — `expect(tokenSenhaRepository.items).toHaveLength(1)`; `:102` — `expect(tokenSenhaRepository.items[0].usuarioId).toBe(user.id.toString())` | ✅ PASS — `:100` é a asserção que prova o "não aguarda"; `:102` fecha a conjunção (token do usuário certo, não só "existe um token") |
| "`Mailer` rejeitando → caso de uso resolve `right`, sem exceção não tratada" | `right`, token persistido, falha só no log | `solicitar-recuperacao-senha.spec.ts:120` — `expect(response.isRight()).toBe(true)`; `:121` — `expect(tokenSenhaRepository.items).toHaveLength(1)`; `:122-125` — `expect(consoleErrorSpy).toHaveBeenCalledWith('Falha ao enviar e-mail de recuperação de senha', expect.any(Error))` | ✅ PASS |
| "e2e existente de `POST /senha/recuperacao` (202 neutro) segue verde" | suite e2e inteira verde | `npx jest --config ./test/jest-e2e.json` → 18 suítes, 176 passed, 0 failed | ✅ PASS |
| "`SENHA_REDEFINICAO` continua fora da fila de reenvio (carrega token)" | o envio não passa pela `email_pendente` | `solicitar-recuperacao-senha.ts:55-67` — `dispararEmail` chama `this.mailer.enviar` direto; nenhuma referência a `EmailPendenteService` no arquivo | ✅ PASS |
| AC1 — 202 neutro para conta inexistente | `right`, 0 token, 0 e-mail | `solicitar-recuperacao-senha.spec.ts:78-80` (pré-existente, segue verde) | ✅ PASS |

**Status**: ✅ **28/28 critérios de "Done when" cobertos** (16 comportamentais + 6 gate + 6 contagem de testes), **27 limpos + 1 ⚠️ com ressalva não bloqueante** (T37, cláusula "nenhum `randomBytes` fora dela"). Nenhum critério sem citação `file:line`.

---

## Discrimination Sensor

**Scratch**: `git worktree add /tmp/sensor-fase7 HEAD --detach`, `node_modules` por symlink, `.env` copiado só para a rodada e2e e apagado em seguida. Nenhum `git stash`. Cada mutação foi revertida com `git checkout --` no scratch antes da seguinte; o worktree foi removido com `git worktree remove --force` ao fim.
**Baseline do scratch**: 30 suítes, 166 passed — idêntico ao tree real antes de qualquer mutação.

| # | Alvo | Mutação | Killed? | Quem matou |
| - | ---- | ------- | ------- | ---------- |
| **M1** | `test/repositories/in-memory-empresa-repository.ts:110-115` | CAS removido: `salvarTransicao` só devolve `false` se a empresa não existir (volta a gravar sempre) | ✅ **Killed** | **5 testes, exatamente o exigido pela T34**: `AprovarEmpresaUseCase`, `RejeitarEmpresaUseCase`, `SuspenderEmpresaUseCase`, `ReativarEmpresaUseCase` e `CriarEmpresaUseCase` — os 5 casos de CAS perdido. 161 passed, 5 failed |
| **M2** | `in-memory-empresa-repository.ts:97` | `save` volta a sobrescrever as 4 colunas de decisão (`copiar(empresa)` em vez de `copiar(empresa, this.items[index])`) | ✅ **Killed** | `EditarDadosEmpresaUseCase › should persist the cadastral fields without undoing the admin decision when saving a stale read`. 165 passed, 1 failed |
| **M3** | `test/repositories/in-memory-sessao-repository.ts:45` | filtro `&& !item.revogadaEm` removido de `revogarTodasDoUsuario` | ✅ **Killed** | `RedefinirSenhaUseCase › should revoke only the active sessions, keeping the original revogadaEm of an already revoked one`. 165 passed, 1 failed |
| **M4** | `src/infra/mail/email-pendente.worker.ts:34-36` | guard `if (this.emExecucao) return` removido | ✅ **Killed** | `EmailPendenteWorker › drains only once when a second executar() overlaps the first` — o cenário (b), exatamente como a task previu |
| **M5** | `email-pendente.worker.ts:44-46` | bloco `finally { this.emExecucao = false }` removido (o `catch` mantido) | ✅ **Killed** | `EmailPendenteWorker › logs and swallows a failing drain, and drains again on the next call` — o cenário (c), exatamente como a task previu |
| **M6** | `src/domain/fivo/application/use-cases/autenticar-usuario.ts:61` | `await this.hasher.compare(senha, await iscaDeComparacao(...))` removido do ramo de e-mail inexistente (canal lateral de tempo de volta) | ✅ **Killed** | `AutenticarUsuarioUseCase › should compare the submitted password against a decoy hash exactly once when the e-mail does not exist` |
| **M7** | `src/domain/fivo/application/use-cases/solicitar-recuperacao-senha.ts:49,55` | volta a **aguardar** o envio: `await this.dispararEmail(...)` com `dispararEmail` async | ✅ **Killed** | `SolicitarRecuperacaoSenhaUseCase › should resolve with the token already persisted, before the e-mail delivery finishes` |
| **M8** | `autenticar-usuario.ts:115-116` | `ip` e `userAgent` removidos do payload de `sessaoRepository.criar` (efeito colateral obrigatório suprimido) | ✅ **Killed** | `AutenticarUsuarioUseCase › should persist the ip and the userAgent received in the request on the sessao` |
| **M9** | `src/infra/http/autenticacao.controller.ts:48-49` | controller para de repassar `req.ip` e o cabeçalho `user-agent` ao caso de uso | ✅ **Killed** (e2e, contra Postgres real) | `AutenticacaoController (e2e) › o login grava ip e user-agent na sessão…`. 15 passed, 1 failed |

**Sensor depth**: P0-full (autenticação + integridade de decisão de admin) — 9 mutações, acima do mínimo de 5 exigido para caminho crítico.
**Result**: **9/9 killed, 0 survived** — ✅ PASS

**Isolamento verificado**: `git status --porcelain` do tree real vazio antes (baseline) e depois (`/tmp/baseline-porcelain.txt`, 0 linhas); `HEAD` inalterado (`b639e3a…` antes e depois); `git worktree list` de volta a uma única entrada; `/tmp/sensor-fase7` inexistente.

---

## Avaliação dos 4 desvios declarados pelo implementador

### Desvio 1 — "Where" da T34 não é exaustivo: arquivos extras tocados

**Aceitável, não é gap.** O campo "Where" da task cita só `in-memory-empresa-repository.ts`, mas o campo "What" e os "Done when" da própria T34 exigem explicitamente (a) uma docstring na porta `EmpresaRepository.save`, (b) unit de CAS nos 4 use cases de decisão e no re-cadastro, e (c) um unit de `save` com leitura obsoleta. Os arquivos extras (`ports/database/empresa-repository.ts` + 6 specs) são exatamente esses — nem um a mais. Nenhum código de produção foi tocado pela T34. O "Where" é um ponteiro para o arquivo principal; o contrato é o "Done when".

### Desvio 2 — a corrida foi injetada com `jest.spyOn` na leitura (`findById`/`findByCnpj`)

**Aceitável — o contrato de CAS continua provado.** Re-derivei a alternativa: para alcançar o ramo `false` do `salvarTransicao`, o caso de uso precisa segurar uma entidade cujo `status` divirja do guardado. O teste não consegue interpor sua própria leitura (a leitura acontece dentro do caso de uso) e, sem o spy, o caso de uso leria o estado já decidido e pararia **na entidade** (`TransicaoInvalidaError` vindo da máquina de estados), sem nunca exercitar o CAS do repositório. O spy é, portanto, o ponto de injeção mínimo.

O que importa para a validade: o spy controla apenas a **entrada** (a leitura obsoleta); a asserção incide sobre o comportamento **real** do double (`salvarTransicao`) e sobre o **estado guardado** depois. A prova empírica é o sensor M1 — a mutação foi feita em `salvarTransicao`, não no spy, e derrubou os 5 testes. Se os testes estivessem medindo o spy em vez do CAS, M1 teria sobrevivido.

Cobertura complementar existente: a corrida **real** (dois `POST` concorrentes contra Postgres) já está coberta desde a Fase 6 em `test/http/concorrencia.e2e-spec.ts`. A camada unit da Fase 7 é a rede determinística; a e2e é a rede de concorrência verdadeira. As duas juntas fecham EMP-05 AC5 nos dois níveis.

### Desvio 3 — `gerarTokenDeSessao` usa hex em vez de base64url

**Não é gap.** Verificado nos dois lados (ver quadro da T37 acima): 32 bytes de `randomBytes` = 256 bits em qualquer codificação; `sha256`/`hex` na geração e na validação, pela mesma função; o e2e pré-existente que usa `GeradorTokenOpaco.sha256` como referência continua batendo porque é o mesmo algoritmo. Escolher hex para não quebrar `autenticar-usuario.spec.ts:147` foi a decisão certa: preservou uma asserção de formato que é justamente o que ancora o contrato do token. Único efeito colateral: o cookie fica com 64 caracteres em vez de 43 — irrelevante.

### Desvio 4 — `GeradorTokenOpaco` sem uso em produção

**Pendência real de limpeza, mas não bloqueia esta fase.** Ver Achado 1.

---

## Achados adiados (não bloqueiam a Fase 7)

### Achado 1 (Minor) — `GeradorTokenOpaco` órfão em produção

`GeradorTokenOpaco.gerar()` (`src/infra/cryptography/gerador-token-opaco.ts:8-10`) não tem nenhum caller de produção depois da T37 — `SessionService` passou a usar `gerarTokenDeSessao()`. A classe segue registrada e exportada em `src/infra/cryptography/cryptography.module.ts:8-9`, e é consumida apenas por `src/infra/cryptography/gerador-token-opaco.spec.ts` (testa a si mesma) e por `test/http/auth.e2e-spec.ts:78,102`, onde só o método `sha256` é usado como helper de asserção.

Isso torna a cláusula "nenhum `randomBytes`/`createHash` de token de sessão fora dela" verdadeira **em efeito** (nenhum caminho de produção consegue gerar um token divergente) e falsa **ao pé da letra** (o gerador base64url ainda existe em `src/`, em condição de ser religado por engano). Risco hoje: zero em runtime; o custo é código morto com um `@Injectable` no container e um spec que testa código não usado.

**Fix task sugerida (backlog)**: remover `GeradorTokenOpaco.gerar()` (ou a classe inteira), tirar o provider/export de `cryptography.module.ts`, apagar `gerador-token-opaco.spec.ts` e trocar `test/http/auth.e2e-spec.ts:102` por `hashDoTokenDeSessao(token)`. Verificação: `grep -rn "GeradorTokenOpaco" src/ test/` → 0, gate cheio verde.

### Achado 2 (Minor, observação) — `hashIsca` é estado mutável de módulo

`autenticar-usuario.ts:18-23` memoiza a isca em uma variável de módulo (`let hashIsca: Promise<string> | undefined`) compartilhada por todas as instâncias do caso de uso e por todo o processo. Duas consequências, ambas de baixa severidade:

1. Se `hasher.hash()` rejeitar na primeira chamada, a *promise rejeitada* fica memoizada e **todo** login com e-mail inexistente passa a rejeitar dali em diante — o que, além do 500, reintroduziria o próprio canal lateral que a T38 fecha. A probabilidade é remota (argon2 sobre um `randomUUID`), mas o `??=` não tem caminho de recuperação.
2. Em testes, a isca é gerada pelo primeiro `FakeHasher` que chegar e reusada pelos demais; hoje isso é inofensivo porque os testes só contam chamadas de `compare`.

**Fix task sugerida (backlog)**: limpar `hashIsca` no `catch` (ou memoizar o valor resolvido, não a promise). Não bloqueia: o comportamento correto está coberto por `autenticar-usuario.spec.ts:192-212` e pelo sensor M6.

### Achado 3 (Spec-precision, observação) — a isca equaliza o `compare`, não a resposta inteira

O comentário em `autenticar-usuario.ts:13-17` afirma que "o tempo da resposta não distingue conta inexistente de credencial errada". Estritamente, o ramo de e-mail inexistente ainda **pula** a transação do `UnitOfWork` e o `userRepository.save` que o ramo de senha errada executa (`autenticar-usuario.ts:75-99`); a equalização é do custo dominante (argon2), não de toda a resposta. O "Done when" da T38 pede paridade de **chamadas de `compare`**, e isso está atendido e asserido nos dois ramos. Fica registrado como precisão de redação/spec, não como defeito: EMP-06 AC2 exige paridade de **corpo e status**, que é o que os testes provam literalmente.

---

## Code Quality

| Princípio | Status |
| --------- | ------ |
| Minimum code | ✅ — `gerar-token-de-sessao.ts` tem 23 linhas e 2 funções, ambas usadas; `dispararEmail` é um método privado de 12 linhas |
| Surgical changes | ✅ — 4 arquivos de produção alterados, todos nomeados pelas tasks; nenhuma refatoração oportunista |
| No scope creep | ✅ — nenhuma feature além do pedido; `tasks.md` só mudou marcação |
| Matches patterns | ✅ — `Either` nos use cases, doubles em `test/repositories/`, spec ao lado do arquivo em `src/infra/mail/`, comentários em pt-BR explicando o *porquê* (padrão da base) |
| Spec-anchored outcome check (valores asseridos batem com a spec) | ✅ — 401/"Credenciais inválidas" literais (EMP-06 AC2); datas de revogação por valor (EMP-09 AC3); 4 colunas de decisão uma a uma (EMP-05) |
| Per-layer Coverage Expectation (domínio 1:1 com ACs; rotas happy+edge+error) | ✅ — 16 unit novos no domínio/infra + 1 e2e novo cobrindo o caminho HTTP real da T37 |
| Todo teste mapeia um requisito — nenhum teste órfão | ✅ — os 17 testes novos mapeiam 1:1 para um "Done when" de T34–T39 (6+1+4+1+2+2+1 e2e) |
| Diretrizes documentadas seguidas | ✅ — `references/coding-principles.md` da skill; sem guideline de teste adicional no repo |
| Testes removidos ou enfraquecidos | ✅ Nenhum — `git diff main..HEAD \| grep -c '^-\s*it('` → **0**; nenhuma asserção pré-existente foi afrouxada (a `/^[0-9a-f]{64}$/` foi explicitamente preservada) |

---

## Edge Cases

- [x] "IF o provedor de e-mail estiver indisponível durante aprovação ou rejeição THEN concluir a mudança de estado, registrar a falha em log e enfileirar para nova tentativa" — o dreno da fila agora tem o worker coberto (T36, cenários (a)–(d)); fecha o GAP B da Fase 6
- [x] "IF o mesmo cadastro pendente for aprovado e rejeitado concorrentemente por dois administradores THEN aplicar apenas a primeira decisão" — coberto agora nos **dois** níveis: unit determinístico (T34, 5 use cases) + e2e de corrida (Fase 6)
- [x] "WHEN uma empresa rejeitada tentar se cadastrar novamente com o mesmo CNPJ THEN permitir um novo cadastro que substitui o registro rejeitado" — a perda de corrida no re-cadastro é `EmpresaAlreadyExistsError` com um único registro persistido (`criar-empresa.spec.ts:288-294`)
- [x] Recuperação de senha com provedor fora — `right` + token persistido + log (T39)

---

## Gate Check

- **Gate command**: `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json` (+ `npm run build`, por a T39 fechar a fase)

| Comando | Resultado |
| ------- | --------- |
| `npx tsc -p tsconfig.json --noEmit` | ✅ exit 0 |
| `npx eslint "{src,test}/**/*.ts"` | ✅ exit 0, 0 warnings |
| `npx jest` | ✅ exit 0 — 30 suítes, **166 passed**, 0 failed, 0 skipped, 2,9 s |
| `npx jest --config ./test/jest-e2e.json` | ✅ exit 0 — 18 suítes, **176 passed**, 0 failed, 0 skipped, 60,8 s |
| `npm run build` (`prisma generate && nest build && tsc-alias`) | ✅ exit 0 |

- **Contagem antes da fase**: 150 unit + 175 e2e = 325
- **Contagem depois**: 166 unit + 176 e2e = **342**
- **Delta**: **+17 testes** (16 unit + 1 e2e), **0 removidos** (`grep -c '^-\s*it('` no diff → 0), 0 skipados
- **Bate com o relatado pelo implementador** (166 unit / 176 e2e): ✅ sim
- **Bate com os alvos das tasks**: T34 ≥156 ✅ (156), T35 ≥157 ✅ (157), T36 ≥161 ✅ (161), T37 ≥162 unit / ≥176 e2e ✅ (162/176), T38 ≥164 ✅ (164), T39 ≥166 ✅ (166) — a progressão fecha exatamente

---

## Requirement Traceability Update

| Requirement | Status anterior | Novo status |
| ----------- | --------------- | ----------- |
| EMP-04 | Verified (domínio) — worker de e-mail sem cobertura (GAP B, Fase 6) | ✅ Verified — worker coberto (reentrância, falha, agendamento) |
| EMP-05 | Verified (domínio) — double divergia do contrato de CAS (GAP E, Fase 6) | ✅ Verified — CAS provado nos 5 caminhos de transição na camada unit, além do e2e de corrida |
| EMP-06 | Verified (domínio) — sessão sem `ip`/`userAgent` (Finding 7) e canal lateral de tempo no login (Finding 8) | ✅ Verified — AC1/AC2 com paridade de `compare`; sessão com contexto de origem |
| EMP-07 | Verified (domínio) | ✅ Verified — sem mudança nesta fase (o bloqueio de 5 tentativas segue coberto) |
| EMP-09 | Verified (domínio) — `revogarTodasDoUsuario` do double divergia (Finding 3, Fase 3); 202 podia vazar existência por tempo (Finding 8) | ✅ Verified — AC1 sem canal lateral; AC3 revoga só as ativas |

---

## Summary

**Overall**: ✅ **Ready** — 0 blockers, 0 majors, 3 achados minor/observação adiados (Achados 1–3)

**Spec-anchored check**: 28/28 critérios de "Done when" com citação `file:line` — 27 limpos, 1 ⚠️ com ressalva não bloqueante (T37, `GeradorTokenOpaco` órfão)
**Sensor**: 9 mutações injetadas, **9 killed, 0 survived** (P0-full)
**Gate**: 342 passed (166 unit + 176 e2e), 0 failed, 0 skipped; `tsc`, `eslint` e `npm run build` limpos
**Isolamento**: worktree `/tmp/sensor-fase7` descartado; `git status --porcelain` do tree real vazio antes e depois; `HEAD` = `b639e3a` inalterado

**O que funciona**: esta fase é dívida de verificação paga no lugar certo. Os três primeiros commits não mudam produção nenhuma — corrigem os *doubles* para que a camada unit passe a mentir menos que o banco, e o sensor confirma o ganho: o mutante de CAS que na Fase 6 não derrubava nada agora derruba 5 testes, e o de `save` derruba 1 com asserção por coluna. Os três últimos fecham canais laterais de tempo reais (login e recuperação de senha) com mudanças pequenas e testes que medem a propriedade certa — paridade de `compare`, e "a promise resolveu antes do envio", não "o mock foi chamado". A regra de payload/conjunção está atendida onde importa: `ip`/`userAgent` são asseridos por valor no unit **e** na linha do Postgres no e2e.

**O que falta (não bloqueia)**: Achado 1 (código morto do `GeradorTokenOpaco`) é limpeza barata e deveria virar task antes que alguém religue o gerador base64url; Achado 2 (`hashIsca` memoizando uma promise possivelmente rejeitada) é robustez; Achado 3 é precisão de redação.

**Next steps**: Fase 7 aprovada. Registrar Achados 1 e 2 como fix tasks de backlog e seguir para T40 (expiração do link de troca de e-mail, EMP-08 AC6).

### Notas de processo

- `python3 .claude/skills/tlc-spec-driven/scripts/validate_state.py cadastro-empresa` segue reportando `ERROR … no validation.md` — esperado enquanto a convenção por fase (`validation-faseN.md`) estiver em uso, como já registrado na Fase 6. Vale alinhar o script à convenção do projeto (aceitar `validation-fase*.md` como evidência).
- Lição confirmada: *um double que mente é um gap de verificação com aparência de teste verde* — o mutante M1 só passou a matar depois que o double reproduziu o `updateMany` condicional do Prisma; antes disso, 5 casos de CAS perdido eram indistinguíveis de sucesso na camada unit.
- Lição confirmada: *quando vencedora e perdedora convergem para o mesmo `status` (suspender, reativar), é o campo de autoria (`decididoPor`) que carrega a discriminação* — asserir só o estado final teria deixado M1 sobreviver em 2 dos 5 testes.
