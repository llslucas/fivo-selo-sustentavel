# Cadastro e Autenticação de Empresa — Validation (Fase 5: T33 + T23–T29)

**Veredito: ❌ FAIL** — a Fase 5 entrega todas as rotas e o gate reproduz o que o autor alegou, mas há **1 corrida de segurança real em EMP-07 AC3 que nenhum teste pega**, **1 desvio de spec confirmado (logo > 10 MB → 413, não 422)**, **4 mutantes sobreviventes** e a corrida de decisões concorrentes (EMP-05) confirmada empiricamente (escopo declarado da T30). Os itens de correção estão em "GAPs / Fix Plans".

**Date**: 2026-09-19
**Spec**: `.specs/features/cadastro-empresa/spec.md`
**Scope**: Fase 5 — T33 (transação atômica) e T23–T29 (HTTP, auth, sessão). Fases 1–4 não foram re-verificadas.
**Diff range**: `1f8c48f..HEAD` (8 commits: `4cbb136` T33, `6f447ed` T23, `cf81c5f` T24, `b72e1e8` T25, `0ae029f` T26, `7d79ed7` T27, `540f2a7` T28, `cd51b0f` T29)
**Verifier**: independent sub-agent (author ≠ verifier), evidence-or-zero

---

## Gate Check

Rodado na árvore real, sem pipe, exit code 0:
`npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json` → `EXIT=0`.

- Unit: **149/149** (29 suites). E2E: **145/145** (15 suites). Bate com o alegado pelo autor.
- `npx tsc -p tsconfig.build.json --noEmit` → 0 (o `npm run build` de T29 não foi executado para não escrever em `dist/`).
- Test integrity: nenhum teste removido. Único spec pré-existente tocado: `criar-empresa.spec.ts` (+2 linhas: import e `new InMemoryUnitOfWork()` no SUT), sem asserção alterada. Testes da fase: 5 unit (`confirmar-troca-email.spec.ts`) + 108 e2e novos (37 → 145).

---

## Task Completion

| Task | Status | Notas |
| ---- | ------ | ----- |
| T33 — UoW atômica User+Empresa | ✅ Done | Porta `ports/unit-of-work.ts`; `prisma-unit-of-work.ts:17-25` usa `$transaction` com `AsyncLocalStorage` (`prisma-transaction-context.ts`); repos usam `this.db` (`prisma-empresa-repository.ts:24-26,72,88`); hash argon2 fica fora da transação (`criar-empresa.ts:114`), e-mail depois do commit. Mutante M05 (UoW sem `$transaction`) morto pelos 2 e2e (`criar-empresa-transacao.e2e-spec.ts:71`, `:110`). Ressalva: os 2 e2e chamam o **caso de uso**, não `POST /empresas`; a corrida via HTTP é T30. |
| T23 — Filtro + pipe zod | ✅ Done | Bullets conferem (`domain-exception-filter.e2e-spec.ts`: it.each 17 classes `:137-141`, pipe 422 `:143-155`, Nest nativo `:175`, 500 sem vazar `:189`). **Citações do autor desalinhadas** (`:117/:119/:131/:155/:170` apontam ~20 linhas antes; o arquivo cresceu em T27/T29) — conteúdo correto, número de linha não. Finding menor: o teste do filtro compara a mensagem com `new Erro().message`, então não detecta mensagem que destoe do design (ver GAP 5). |
| T24 — AuthModule | ✅ Done (com GAP 4) | Citações `auth.e2e-spec.ts:102/116/118/129/137/146/189/206/221/223/241/258` conferidas: todas corretas. Sensor do autor reproduzido. **Sobrevive** o mutante de limite de 8h (M25/M26): só há pontos −9h e −1h. |
| T25 — Autocadastro + `/empresas/me` | ⚠️ Done com GAPs | Citações corretas exceto rótulos: `:261` é o teste de **dimensão** (não formato; formato é `:243`), `:278` é o de **tamanho** (não dimensão). "Logo > 5 MB → 422" vale só até 10 MB (GAP 2). `POST /empresas` descarta logo órfão (M10 morto). |
| T26 — Login/logout | ⚠️ Done com GAP 1 | Citações corretas (`:80-81, :94-99, :107, :112, :145-148, :156, :171, :185, :220-221`). 429 sequencial ok; **429 sob concorrência não** (GAP 1). |
| T27 — Fila/decisões admin | ✅ Done (nos termos da task) / ⚠️ risco | Todos os bullets conferem; a corrida paralela real está fora do "Done when" (sequencial) — confirmado empiricamente que o risco existe (ver GAP 3). |
| T28 — `GET /arquivos/:id` | ✅ Done | Citações corretas. M06 (sem nosniff), M07 (sem checar dono), M22 (sem bypass admin), M30 mortos. |
| T29 — Rotas P2 | ⚠️ Done com GAP 4 | Citações corretas. `PATCH /empresas/me/email` e `PATCH /empresas/me` (troca de logo) têm mutantes sobreviventes (M18, M21). |

Todas as caixas `[x]` de `tasks.md` correspondem a código real.

---

## Spec-Anchored Acceptance Criteria

Convenção: `arquivo` sem prefixo = `api/test/http/`. Linhas do e2e da própria fase.

### P1 Autocadastro (EMP-01/02/03) — `POST /empresas`

| Critério | Outcome da spec | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| AC1 dados válidos → 201 + id, `PENDENTE_APROVACAO` | 201, `{id}`, estado | `cadastro-empresa.e2e-spec.ts:122` `toBe(201)`; `:123` `idDaResposta(...)` é string; `:129` `empresa.status` `toBe(PENDENTE_APROVACAO)`; persistência: `:130-132` cnpj/role/e-mail | ✅ PASS |
| AC2 CNPJ inválido → 422 "CNPJ inválido", nada persistido (também com logo) | 422 + literal + 0 linhas | `:186` `toBe(422)`; `:187` `toMatchObject({message:'CNPJ inválido'})`; `:188-193` `contarLinhas()` `{0,0,0}` e `storage.arquivos.size` `0` | ✅ PASS (M10 morto) |
| AC3 duplicidade → 409 "CNPJ ou e-mail já cadastrado" | 409 + literal | `:203-206` (CNPJ), `:215-218` (e-mail), literal exata | ✅ PASS |
| AC4 senha < 10 → 422 + literal | 422 + "A senha deve ter no mínimo 10 caracteres" | `:225-228`; sem persistência `:229-233` | ✅ PASS |
| AC5 aceita PNG/JPG/SVG ≤ 5 MB, raster ≥ 512² | rejeita formato/tamanho/dimensão | formato `:243-246` (`contendo('Formatos aceitos')`), dimensão `:261-264` (`'512x512'`), tamanho `:278-281` (`'5 MB'`); aceito: `:144-153` (PNG 512² → 201, mime `image/png`) | ✅ PASS (borda exata 5 MB/511 px é da Fase 4) |
| AC6 violação de logo → 422 informando o limite, "mantendo o restante do cadastro intacto" | 422 + qual limite | mesmas asserções de AC5. **Mas**: logo entre 10 MB e ∞ → **413** (experimento E3, abaixo) | ❌ GAP 2 (>10 MB); ⚠️ spec-precision gap em "restante do cadastro intacto" (o e2e afirma que **nada** é persistido, `:247-251`; a spec não diz se o cadastro deve ser criado sem logo) |
| AC7 senha só como hash | argon2/bcrypt | `:133` `senhaHash` `toMatch(/^\$argon2id\$/)`; `:134` `not.toContain('SenhaForte123')` | ✅ PASS |
| AC8 e-mail de recebimento | enviado ao endereço | `:159-164` `mailer.mensagens` `toEqual([{para, template: CADASTRO_RECEBIDO}])` | ✅ PASS |
| AC9 falha de e-mail não derruba | 201 + cadastro mantido | `:172-173` `toBe(201)`, `empresas` `toBe(1)` | ✅ PASS |
| Edge: storage indisponível → 503 + literal | 503 "Não foi possível enviar o logo, tente novamente" | `:294-297`; nada persistido `:298-302`. M28 morto. | ✅ PASS (⚠️ "preservar demais dados" não é observável server-side: spec-precision gap) |
| Edge: CNPJ simultâneo → 409, uma linha | 1×201 + 1×409 | `criar-empresa-transacao.e2e-spec.ts:134` `toEqual(['conflito','sucesso'])`, `:135-136` counts 1/1 — **no caso de uso**, não via HTTP | ✅ PASS (caso de uso); HTTP → T30 |

### P1 Aprovação (EMP-04/05) — rotas admin

| Critério | Outcome | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| AC1 fila ordenada asc, com nome/CNPJ/e-mail/data | só pendentes, antiga→nova | `admin-empresas.e2e-spec.ts:111-126` `toEqual([antiga, nova])` com os 5 campos (aprovada fica de fora) | ✅ PASS (M31-tipo "campo extra" morto pelo `toEqual`) |
| AC2 aprovar → `APROVADA`, admin, data-hora, e-mail | estado + autor + data + e-mail | `:155` status; `:156` `decididoPor` `toBe(admin.id)`; `:157` `decididoEm` `not.toBeNull()`; `:158-163` e-mail `CADASTRO_APROVADO` | ✅ PASS — ⚠️ data-hora só "não nula" (spec-precision: não define tolerância) |
| AC3 rejeitar: motivo ≥ 20, persiste, e-mail | 422 se curto; `REJEITADA` + motivo + e-mail | curto `:175-179` (422, segue pendente, 0 e-mails); ok `:195-203` (`motivoDecisao`, e-mail com `dados:{motivo}`). M27 morto | ✅ PASS (spec não define a mensagem do 422; **design define e a implementação diverge** — GAP 5) |
| AC4 bloqueio de campanha/selo 403 "Cadastro ainda não aprovado" | 403 + literal | Não há rota de campanha/selo na Fase 5; `AssegurarEmpresaAprovadaUseCase` só tem unit | ➖ não coberto nesta fase (sem consumidor HTTP) |
| AC5 transições permitidas, demais 409 | 4 permitidas, resto 409 | permitidas `:227,:233`; proibidas `:253-254` (4 casos, `toBe(409)` + estado inalterado); 2ª decisão `:272-273` | ✅ PASS (mensagem do 409 não asserida; design fixa "Operação não permitida para o estado atual", impl. devolve "Transição inválida." — GAP 5) |
| AC6 não-admin → 403, estado intacto | 403 nas 5 rotas | `:322` `toBe(403)` (EMPRESA e INSTITUICAO × 5 rotas); `:325-328` estado `PENDENTE` e 0 linhas de auditoria; 401 `:335`. M12 morto | ✅ PASS |
| AC7 auditoria (autor, antes, depois, data-hora) | uma linha por mudança | `:357-382` `toEqual` de `usuarioId`, `entidadeId`, `dados{estadoAnterior,estadoNovo}` nas 3 transições; rejeição com `motivo` `:396-400`. M15 morto | ✅ PASS — ⚠️ `criadoEm` (data-hora) não asserido (conjunction rule) |
| Edge: aprovar+rejeitar concorrentes → só a 1ª, 2ª = 409 | 1 vence | Sequencial `:265-273`. **Concorrente: experimento E1 — falha** (ver GAP 3) | ❌ **não atendido em concorrência** (escopo declarado da T30) |
| Edge: e-mail indisponível na aprovação/rejeição | estado muda, log, enfileira | aprovação `:292-293` (204, `APROVADA`). **Rejeição com e-mail falhando: sem teste** | ⚠️ parcial (rejeição não coberta; "enfileirar" não existe — `LogMailer`, fora de escopo) |
| EMP-10 suspensão/reativação (transições) | `APROVADA↔SUSPENSA` | `:227-234` | ✅ PASS (404 público e bloqueio de campanha: outras features) |

### P1 Autenticação e sessão (EMP-06/07)

| Critério | Outcome | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| AC1 login → 200 + papel | 200 `{papel}` por papel | `autenticacao.e2e-spec.ts:80-81` `toBe(200)`, `toEqual({papel: role})` × EMPRESA/INSTITUICAO/ADMIN; cookie `:83-84` | ✅ PASS |
| AC2 e-mail inexistente ≡ senha errada → 401 "Credenciais inválidas" | 401 + literal + sem distinguir | `:94-99` `toBe(401)` ×2, `toMatchObject({message:'Credenciais inválidas'})`, `senhaErrada.body` `toEqual(emailInexistente.body)` | ✅ PASS no corpo; ⚠️ canal lateral de **tempo** (Finding 8) |
| AC3 5 falhas em 15 min → 429 por 15 min | bloqueio | sequencial `:105-114` (`bloqueada.status` `toBe(429)`, sem `Set-Cookie`). **Concorrente: E2 — contador não incrementa** | ❌ GAP 1; ⚠️ mensagem/janela de 15 min não asserida em HTTP (janela é unit da Fase 2) |
| AC4 inativa > 8h → 401 | 401 na próxima req | `auth.e2e-spec.ts:221-223` (−9h, revoga); `autenticacao.e2e-spec.ts:171`; deslize `auth.e2e-spec.ts:241` | ⚠️ PASS parcial: **M25 (8h→2h) e M26 (8h→8,9h) sobrevivem** (GAP 4) |
| AC5 logout invalida token | token antigo inutilizável | `autenticacao.e2e-spec.ts:145-148` (204, 401, `revogadaEm` não nulo). M23 morto | ✅ PASS |
| AC6 401 sem sessão; 403 outro papel/recurso alheio | 401/403 | 401: `cadastro-empresa.e2e-spec.ts:365`, `admin-empresas.e2e-spec.ts:335`, `arquivo.e2e-spec.ts:197`; 403: `cadastro-empresa.e2e-spec.ts:378`, `autenticacao.e2e-spec.ts:185`, `arquivo.e2e-spec.ts:158,:179`; "recurso de outra empresa": `/empresas/me` resolve pela sessão (`cadastro-empresa.controller.ts:94-107`, sem id na URL) — atendido **por construção**; único recurso por id acessível a EMPRESA é `/arquivos/:id`, com checagem de dono (`arquivo.controller.ts:34-37`, M07 morto) | ✅ PASS |
| AC7 HTTPS exclusivo | tráfego só HTTPS | `session-cookie.ts:9` `secure: COOKIE_SECURE === 'true'`, `.env.example` `COOKIE_SECURE="false"`; sem HSTS/redirect; teste só verifica que o flag existe (`auth.e2e-spec.ts:129`) | ❌ GAP 6 (Minor) / ⚠️ spec-precision (a spec não diz quem impõe HTTPS — app ou proxy) |

### P2 Dados cadastrais e senha (EMP-08/09)

| Critério | Outcome | `file:line` + asserção | Resultado |
| --- | --- | --- | --- |
| EMP-08 AC1 editar nome/telefone/endereço/logo | persiste | `edicao-e-senha.e2e-spec.ts:134-147` valores novos + razão social/CNPJ intactos; logo `:175-181` (`logoArquivoId` ≠ antigo, `arquivo.count` 2). "≤ 60 s nas páginas públicas": outra feature | ✅ PASS |
| AC2 CNPJ → 422 literal | "CNPJ não pode ser alterado; solicite ao suporte" | `:216-219`; nada muda `:220-224` | ✅ PASS |
| AC3 e-mail antigo ativo até confirmar | antigo 200/novo 401 → confirma → inverte | `:257-263` (202; `emailPendente`; login antigo 200, novo 401; e-mail `EMAIL_CONFIRMACAO` ao novo), `:289-295`; token inválido/usado `:320-323`; ocupado `:341-342` | ✅ PASS — ⚠️ spec não define expiração do token de confirmação; implementação não expira (spec-precision gap) |
| AC4 selos já gerados intactos | novo logo só p/ selos futuros | `:181` `arquivo.count` `toBe(2)` (arquivo antigo preservado). Selos não existem ainda | ✅ PASS no que é verificável |
| AC5 mesmas restrições de logo | 422 | `:195-203` (100×100 → 422 `'512x512'`, sem trocar nem gravar). **M21 (não descartar logo órfão no PATCH) sobrevive** | ✅ PASS / ❌ mutante (GAP 4) |
| EMP-09 AC1 202 neutro | mesmo status e corpo | `:357-359` `toBe(202)` ×2, `inexistente.body` `toEqual(existente.body)`; e-mail só p/ existente `:360-364`. M09 morto | ✅ PASS |
| AC2 link com token 60 min uso único | token único, expira em 60 min | e-mail com `dados.token` `:361-364`; expirado (DB −60 s) `:411-424`; 60 min exatos: unit Fase 2 | ✅ PASS |
| AC3 nova senha, invalida token, encerra sessões | 3 efeitos | `:389-393` (204; novo 200; antigo 401; sessão anterior 401; sessão nova 200); token usado `:430`. M11 morto | ✅ PASS |
| AC4 token expirado/usado/inexistente → 400 literal | 400 + "Link de redefinição inválido ou expirado" | `:429-434` ×3 casos | ✅ PASS |

### Contagem

33 critérios da fase avaliados (9 autocadastro + 6 aprovação + 7 auth + 5 manutenção + 4 senha + 2 transições EMP-10): **27 ✅ PASS**, **3 ❌ GAP** (EMP-07 AC3 concorrente, EMP-01 AC6 > 10 MB, EMP-06 AC7), **2 ⚠️ PASS parcial** (EMP-07 AC4 sem fronteira; EMP-08 AC5 com mutante), **1 ➖ fora da fase** (EMP-04 AC4). Mais 2 edge cases ❌/⚠️ (decisão concorrente; e-mail indisponível só na aprovação). **Spec-precision gaps**: EMP-01 AC6 ("restante intacto"), EMP-04 AC2 (tolerância da data-hora), EMP-06 AC7 (quem impõe HTTPS), EMP-08 AC3 (expiração do link de confirmação), edge de 503 ("preservar dados").

---

## Discrimination Sensor

Executado em `git worktree add /tmp/verif-fase5 HEAD` (`node_modules` symlinkado, `.env` copiado), um mutante por vez, `git checkout -- <arquivo>` entre eles, `jest --bail` (unit e/ou e2e sequenciais). Worktree removido ao final. (Nota de processo: minhas duas primeiras rodadas foram **descartadas** — um bug do meu script (`--bail 1` interpretado como filtro de path → "No tests found") fez tudo parecer morto; a rodada válida é a 3ª, com o nome do teste que falhou registrado para cada mutante.)

| # | Arquivo | Mutação | Resultado (1º teste que falha) |
| --- | --- | --- | --- |
| M01 | `roles.guard.ts` | sem checar papel | ✅ morto — `cadastro-empresa` "papel ADMIN → 403" |
| M02 | `session.service.ts:47` | `validar` ignora `revogadaEm` | ✅ morto — `edicao-e-senha` "sessões anteriores caem" |
| M03 | `auth.constants.ts` | 8h → 12h | ✅ morto — `autenticacao` "inativa > 8h" |
| M04 | `autenticar-usuario.ts:46` | remove `estaBloqueado` | ✅ morto (unit) — "ContaBloqueadaError (429) após 5 falhas" |
| M05 | `prisma-unit-of-work.ts` | sem `$transaction` | ✅ morto — os 2 e2e de T33 |
| M06 | `arquivo.controller.ts` | sem `nosniff` | ✅ morto — "dono → 200 … nosniff" |
| M07 | `arquivo.controller.ts:35` | sem checagem de dono | ✅ morto — "outra empresa → 403" |
| M08 | `empresa.ts:209` | confirmação não limpa `tokenTrocaEmailHash` | ✅ morto (unit `confirmar-troca-email.spec.ts`) |
| M09 | `solicitar-recuperacao-senha.ts` | não-neutra (erro p/ e-mail inexistente) | ✅ morto — "202 com a mesma mensagem" |
| M10 | `cadastro-empresa.controller.ts:85` | POST não descarta logo órfão | ✅ morto — "CNPJ inválido … nem o logo enviado" |
| M11 | `redefinir-senha.ts:81` | não revoga sessões | ✅ morto |
| M12 | `admin-empresas.controller.ts` | sem `@Roles(ADMIN)` | ✅ morto — "EMPRESA em qualquer endpoint → 403" |
| M13 | `session-cookie.ts:6` | `httpOnly:false` | ✅ morto |
| M14 | `zod-validation.pipe.ts` | devolve valor cru (sem strip/transform) | ✅ morto — "e-mail com maiúsculas em minúsculas" |
| M15 | `aprovar-empresa.ts:50` | sem auditoria | ✅ morto |
| M16 | `cadastro-empresa.controller.ts:94` | `GET /me` sem `@Roles` | ✅ morto |
| M17 | `…controller.ts:109` | `PATCH /me` sem `@Roles` | ✅ morto — "sem sessão → 401; ADMIN → 403" |
| **M18** | `…controller.ts:137` | `PATCH /me/email` sem `@Roles(EMPRESA)` | ❌ **SOBREVIVEU** — nenhum teste de 401/403 nessa rota (ADMIN recebe 404 por `idDaEmpresaDe`, mas não há teste) |
| M19 | `domain-exception.filter.ts` | `NotAllowedError` → 500 | ✅ morto |
| M20 | `session-cookie.ts:7` | `SameSite=None` | ✅ morto |
| **M21** | `…controller.ts:126-131` | `PATCH /me` não descarta logo órfão | ❌ **SOBREVIVEU** — só o caminho de logo *inválido* (rejeitado antes de gravar) é testado; falha do caso de uso pós-upload não |
| M22 | `arquivo.controller.ts:35` | sem bypass de ADMIN | ✅ morto |
| M23 | `autenticacao.controller.ts` | logout não revoga | ✅ morto |
| M24 | `autenticar-usuario.ts:41` | e-mail inexistente devolve erro distinto (429) | ✅ morto |
| **M25** | `auth.constants.ts` | 8h → 2h | ❌ **SOBREVIVEU** — só existem pontos −1h e −9h |
| **M26** | `auth.constants.ts` | 8h → 8,9h | ❌ **SOBREVIVEU** |
| M27 | `rejeitar-empresa.ts` | `dados` da auditoria/e-mail sem `motivo` | ✅ morto |
| M28 | `…controller.ts:181` | 503 do storage vira 500 | ✅ morto |
| M29 | `auth.guard.ts` | não injeta `request.user` | ✅ morto |
| M30 | `arquivo.service.ts` | `buscarAcesso` sem dono | ✅ morto |
| M31 | `autenticar-usuario.ts:53-54` | falha de login não contabilizada | ✅ morto |

**Sensor depth**: P0 (auth/dados) — 31 mutações. **Resultado: 27 mortas × 4 sobreviventes** — ❌ FAIL (M18, M21, M25, M26).

### Experimentos empíricos (scratch, não commitados)

Rodados no mesmo worktree contra o Postgres de teste, sequencialmente:

- **E1 — decisões concorrentes.** 6 rodadas × (4 aprovações + 4 rejeições em paralelo, mesmo pendente): **5 de 6 rodadas tiveram ≥ 2 respostas 204**, com 2–5 linhas em `registro_auditoria` e estado final `REJEITADA` depois de aprovações também aceitas (rodadas: `204x1, 204x2, 204x3, 204x2, 204x5, 204x2`). Uma tentativa 1×1 sozinha deu 204+409 (a janela é estreita); com carga mínima a corrida aparece. Causa: `aprovar-empresa.ts:35,42,48` lê → muta em memória → `save`, e `prisma-empresa-repository.ts:88-91` faz `update where id` **sem condição de estado** (last-write-wins). Consequência real: e-mails de aprovação **e** rejeição ao mesmo cliente, auditoria contraditória.
- **E2 — contador de login sob concorrência.** 15 logins com senha errada em paralelo + 1 sequencial → **16 × 401, nenhum 429**; linha do usuário: `falhasLogin: 2`, `bloqueadoAte: null`. Causa: `autenticar-usuario.ts:40-54` faz read-modify-write do `User` (`registrarFalhaDeLogin` + `save`) sem lock/incremento atômico; todas as requisições leem `falhasLogin=0` antes da primeira gravar, e cada uma grava o próprio valor. Um atacante paralelizando rajadas nunca é bloqueado.
- **E3 — logo > 10 MB.** `POST /empresas` com anexo de 11 MB → **413 `{"message":"File too large","error":"Payload Too Large"}`**; a spec (AC6) exige 422 informando o limite. O teto do multer (`cadastro-empresa.controller.ts:53`, 10 MB) intercepta antes do `Arquivo.criar`; o e2e de "> 5 MB" usa 5 MB + PNG (< 10 MB) e por isso não vê.
- **E4 — mass-assignment / path.** `PATCH /empresas/me` com `{status:'APROVADA', razaoSocial:'HACK', usuarioId, decididoPor, nomeFantasia:'ok'}` → 200, estado segue `PENDENTE_APROVACAO`, razão social intacta (zod strip funciona). `GET /arquivos/..%2f..%2fetc` → 404. ✅ sem falha.

---

## Pontos que o autor pediu para escrutinar

1. **T27 concorrência sequencial vs. paralela** — **Aceitável como escopo de T27 (o "Done when" é sequencial e a T30 existe em `tasks.md:1031`), mas o risco é real hoje**: E1 mostra duas decisões vencendo. Deve ser tratado como bloqueante de T30 e a nota do `spec.md` (EMP-05: "CAS de decisão concorrente é infra, T17") está **errada**: nenhum CAS existe em T17 (`grep updateMany|CAS src/infra/database` → só `sessao`). Corrigir a rastreabilidade para T30.
2. **Duplicação de criação de sessão** — o login real → `AuthGuard` funciona ponta a ponta (`autenticacao.e2e-spec.ts:116-130`, `:132-149`): ambos os caminhos gravam `sha256(token)` em hex (`autenticar-usuario.ts:56-57` vs `GeradorTokenOpaco.sha256`) e `validar` faz o mesmo hash. Risco = duplicação: `SessionService.criar` **não é usado no caminho de produção** (só pelos testes e pela sonda); consequência prática, `ip`/`userAgent` nunca são gravados em `sessao` por login real, e uma mudança de formato de hash em um dos lados quebra o login silenciosamente — só o e2e de login cobre isso. Ver Finding 7.
3. **Filtro traduz `NotAllowedError`/`ResourceNotFoundError` por classe** — correto e testado (`domain-exception-filter.e2e-spec.ts:137-141`, M19 morto); qualquer erro com `status` numérico é repassado com sua `message` (mensagens de erros de domínio são pt-BR e seguras). Erro sem `status` → 500 genérico sem vazar (`:189`).
4. **`ConfirmarTrocaEmailUseCase` sem expiração** — não é gap de spec (nenhuma definida), é spec-precision gap; token é sha256 em banco, uso único (M08 morto), conferido contra conta dona do e-mail (`:41-47` do caso de uso). Sugestão: definir TTL (ex.: 24 h) na spec.
5. **Logo com CNPJ inválido** — "nada persistido" **vale com logo presente** (`cadastro-empresa.e2e-spec.ts:188-193`, M10 morto): o logo é enviado antes do caso de uso e removido no `catch` (`cadastro-empresa.controller.ts:85-91`). Ressalva: se `remover` falhar, só há `logger.warn` (`:193`) e o arquivo fica órfão — aceitável, mas sem teste.
6. **`GET /empresas/me` e "403 para recurso de outra empresa"** — atendido por construção (identidade vem da sessão, `findByUsuarioId(usuario.id)`); não sobra gap. Não há outra rota por id que EMPRESA alcance além de `/arquivos/:id`, que tem checagem de dono.

---

## Code Quality / revisão adversarial

| Princípio | Status |
| --- | --- |
| Sem features além do pedido | ⚠️ `ConfirmarTrocaEmailUseCase` etc. foram necessários (declarado); ok |
| Alterações cirúrgicas | ✅ único spec pré-existente tocado sem mudar asserção |
| Mass-assignment em DTOs zod | ✅ (`z.object` faz strip; E4) |
| Vazamento de dados restritos | ✅ `empresaParaResposta` não expõe hash/token; teste `not.toMatch(/senha/i)` (`cadastro-empresa.e2e-spec.ts:357`) |
| Enumeração de contas | ⚠️ corpo neutro ok; canais laterais (Finding 8) |
| Cookie | ✅ `httpOnly`, `SameSite=Lax`, `path=/`; `Secure` opcional por env (GAP 6) |
| Autorização por dono `/arquivos/:id` | ✅ (M07/M22/M30) |
| Erro de domínio → status (sem 500 indevido) | ✅ para todas as 17 classes; exceção: `lerBytes` usa `findUniqueOrThrow` (`arquivo.service.ts:74`) → 500 se o registro sumir entre `buscarAcesso` e a leitura (janela mínima, Minor) |
| Todo teste mapeia a AC/edge/Done-when | ✅ |
| Diretrizes documentadas | "none - strong defaults applied" |

---

## GAPs / Fix Plans

### GAP 1 — Contador de login sem atomicidade: bloqueio de 5 tentativas burlável por concorrência (**Major, segurança**) — EMP-07 AC3
- **Evidência**: E2 (16 × 401, `falhasLogin=2`). `src/domain/fivo/application/use-cases/autenticar-usuario.ts:40-54`: `findByEmail` → `registrarFalhaDeLogin` → `save` (read-modify-write); a checagem `estaBloqueado` (`:46`) ocorre **antes** do `hasher.compare` (`:50`, ~100 ms), então rajadas paralelas passam todas.
- **Fix**: registrar a falha de forma atômica no banco (ex.: `UserRepository.registrarFalhaLogin(id, agora)` com `UPDATE usuario SET falhas_login = CASE WHEN primeira_falha_em < now()-15min THEN 1 ELSE falhas_login+1 END, bloqueado_ate = CASE WHEN … >= 5 THEN now()+15min END … RETURNING`, ou `SELECT … FOR UPDATE` dentro do `UnitOfWork`), e re-checar o bloqueio depois do compare. Adicionar e2e: N logins errados em `Promise.all` → o seguinte é 429 e `falhasLogin ≥ 5`. **Escopo**: novo item (T30 não cobre); tratar junto com T30.

### GAP 2 — Logo > 10 MB devolve 413 em vez de 422 (**Minor→Major, spec**) — EMP-01 AC6 / EMP-08 AC5
- **Evidência**: E3; `cadastro-empresa.controller.ts:53,71,112` (`limits.fileSize` 10 MB).
- **Fix**: capturar `PayloadTooLargeException` do multer nas duas rotas (interceptor/filtro) e traduzir para 422 com a mensagem de tamanho de `Arquivo.criar` (ex.: "O logo deve ter no máximo 5 MB"), ou subir o teto do multer e deixar `Arquivo.criar` decidir. Teste: anexo de 11 MB → 422 contendo `5 MB`, nada persistido.

### GAP 3 — Decisões admin concorrentes vencem ambas (**Major, já escopado na T30**) — EMP-05 edge case
- **Evidência**: E1; `prisma-empresa-repository.ts:86-91` (`update where id`, sem estado esperado); `aprovar-empresa.ts:35-48`, análogos em rejeitar/suspender/reativar.
- **Fix (T30)**: `EmpresaRepository.salvarDecisao(empresa, estadoEsperado)` com `updateMany({where:{id, status: estadoEsperado}})`; `count===0` → `TransicaoInvalidaError` (409) antes de auditar/enviar e-mail. Mover a auditoria para a mesma transação (`UnitOfWork`). Corrigir a linha EMP-05 da tabela de rastreabilidade do `spec.md` (menciona T17; correto é T30).

### GAP 4 — Mutantes sobreviventes / testes rasos (**Minor**)
- **M25/M26 (fronteira de 8h)**: `auth.e2e-spec.ts:209-224` só testa −9h (e `:226-245` só −1h). Adicionar casos −7h59 → 200 e −8h01 → 401 (forçando `ultimoAcessoEm` no banco).
- **M18 (`PATCH /empresas/me/email`)**: sem teste de 401/403 (`edicao-e-senha.e2e-spec.ts:227-240` cobre só `PATCH /empresas/me`). Acrescentar 401 sem sessão e 403 para ADMIN/INSTITUICAO em `PATCH /empresas/me/email`.
- **M21 (descartar logo órfão em `PATCH /me`)**: sem teste. Forçar falha do caso de uso após o upload (ex.: `cnpj` divergente + logo válido → 422) e afirmar `arquivo.count` inalterado e `storage.arquivos.size` 0.
- Também: e2e de rejeição com e-mail indisponível (edge "aprovação **ou** rejeição") e asserção de `criadoEm` na auditoria (AC7 conjunction).

### GAP 5 — Mensagens de erro divergem da tabela "Error Handling Strategy" do design (**Minor**)
- `motivo-insuficiente.error.ts:7` "Motivo insuficiente para rejeição." (design: "O motivo deve ter no mínimo 20 caracteres"); `transicao-invalida.error.ts:7` "Transição inválida." (design: "Operação não permitida para o estado atual"); `conta-bloqueada.error.ts:7-8` (design: "Muitas tentativas, tente em 15 minutos"). A spec só fixa os status, mas o design é o contrato de mensagem e os e2e (`:175`, `:253`, `:112`) não assertam texto, e o teste do filtro compara contra `new Erro().message` (tautológico). **Fix**: alinhar as três mensagens e assertar o literal nos e2e de admin/login.

### GAP 6 — HTTPS (EMP-06 AC7) não é imposto nem testado (**Minor / spec-precision**)
- `session-cookie.ts:9` + `.env.example` (`COOKIE_SECURE="false"`): esquecer a env em produção emite cookie de sessão sem `Secure`; sem `trust proxy`/HSTS. **Fix**: default `secure=true` quando `NODE_ENV=production` (ou falhar o boot sem a env), e registrar na spec quem impõe HTTPS (app × proxy).

### Findings (não bloqueantes)
- **Finding 7** — Duplicação de criação de sessão: `AutenticarUsuarioUseCase` (`autenticar-usuario.ts:56-67`) reimplementa `SessionService.criar`; `ip`/`userAgent` jamais gravados no login real. Sugestão: porta de domínio para gerar sessão, ou o caso de uso receber o contexto e delegar.
- **Finding 8** — Canais laterais: `/sessoes` com e-mail inexistente retorna antes de qualquer `hasher.compare` (`autenticar-usuario.ts:41-44`) → diferença de tempo; e só contas existentes chegam ao 429. `/senha/recuperacao` faz insert + envio de e-mail (`await mailer.enviar`) apenas para contas existentes → diferença de tempo com SMTP real. Mitigação: `compare` fictício contra hash-isca; enviar e-mail fora do caminho da resposta.
- **Finding 9** — Citações do autor desalinhadas em T23 (`:117/:119/:131/:155/:170` → `:137/:141/:143-155/:175/:189`) e rótulos de T25 (`:261` = dimensão, `:278` = tamanho).
- **Finding 10** — `GET /arquivos/:id` serve SVG inline no mesmo origin; o script já é rejeitado no upload (T22), mas `Content-Security-Policy: sandbox`/`Content-Disposition` seriam defesa em profundidade.

---

## Requirement Traceability Update (proposta — `spec.md` não foi editado)

| Requirement | Status proposto |
| --- | --- |
| EMP-01/02/03 (HTTP) | ⚠️ Needs Fix — GAP 2 (413), demais ✅ |
| EMP-04 (rotas) | ✅ Verified (AC4 fora da fase) |
| EMP-05 (rotas) | ❌ Needs Fix — GAP 3 (concorrência; T30); corrigir "T17" → "T30" na rastreabilidade |
| EMP-06 | ⚠️ Needs Fix — GAP 6 (AC7) |
| EMP-07 | ❌ Needs Fix — GAP 1 (AC3 sob concorrência), GAP 4 (fronteira 8h) |
| EMP-08 / EMP-09 | ✅ Verified (GAP 4: M18/M21 de cobertura) |
| EMP-10 (rotas) | ✅ Verified (transições) |

---

## Summary

**Overall**: ❌ Not Ready — implementação ampla e o gate limpo (149 unit + 145 e2e, tsc/eslint/build-tsc 0), mas 1 falha de segurança real e desconhecida pelo autor (GAP 1), 1 desvio de spec (GAP 2) e 4 mutantes vivos.

**Spec-anchored check**: 27/33 ACs da fase batem com o outcome da spec; 3 ❌ GAP, 2 ⚠️ parciais, 1 fora da fase; 5 spec-precision gaps.
**Sensor**: 31 mutações — 27 mortas, 4 sobreviventes (M18, M21, M25, M26).
**Gate**: 149 unit + 145 e2e, exit 0.

**O que funciona**: transação atômica User+Empresa com rollback provado contra Postgres real; guards globais com opt-out `@Public`, sessão opaca só por hash, deslize/revogação/expiração; RBAC das rotas admin/empresa; entrega de arquivos com dono/admin/nosniff; recuperação de senha neutra e sessões revogadas; DTOs sem mass-assignment; logo órfão descartado no cadastro.

**Next steps**: (1) GAP 1 com e2e concorrente; (2) GAP 2; (3) fechar GAP 4 (5 testes pequenos); (4) T30 deve incluir E1 como teste (decisões paralelas) e corrigir a rastreabilidade EMP-05; (5) alinhar mensagens (GAP 5); (6) definir HTTPS/TTL de confirmação na spec.

**Higiene**: worktree `/tmp/verif-fase5` removido (`git worktree list` só com a árvore principal); `git status --porcelain` da árvore real idêntico ao inicial (vazio) — o único arquivo novo é este relatório.
