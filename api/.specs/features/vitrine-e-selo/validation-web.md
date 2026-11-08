**Verdict**: PASS

# Vitrine e Selo — Validação do `web` (T29–T44), rodada 3 (final)

**Veredito**: ✅ **PASS**. A T66 cumpre a Done-when item a item. X4 e X11, os dois sobreviventes da rodada 2, morrem por asserção. Os 5 mortos reexecutados continuam mortos. Dos 6 mutantes novos, 5 morrem perto do código tocado. O sexto, N2, sobrevive em `S/components/ui/AsyncState.tsx`, um arquivo **fora do diff da feature** que nenhum AC desta spec cobre, e vira follow-up. O gate passou 2 vezes, uma na árvore real e outra num worktree limpo, sem `.next`. A rodada mudou só o arquivo de teste e as caixas da T66 em `tasks.md`, nenhum código de produção.

**O `web` está pronto para a integração com a API real em 10/11**, com uma condição: a infra do `api` (T19–T28) precisa estar entregue e verificada. Até lá, o `web` foi verificado contra o contrato do `design.md`, com `fetch` mockado. O UAT e a integração ponta a ponta ficam pendentes (lista no fim).

**Data**: 2026-11-08
**Spec**: `.specs/features/vitrine-e-selo/spec.md` (VIT-03, 05, 07, 09, 10, 11, 12, só a parte `web`)
**Diff range da feature**: `96c313f..445d677 -- web`. Diff desta rodada: `71100c5..445d677`, só a T66 (`445d677`).
**Verifier**: sub-agente independente (autor ≠ verificador), com leitura apenas sobre o código. Escreve só este arquivo.
**Escopo**: T29–T44 e as correções T60–T66. A infra do `api` (T19–T28) não entra.

Caminhos abreviados: `S/` = `web/src/`, `T/` = `web/tests/`.

---

## Histórico

| Rodada | Veredito | Sensor | Gate | Pendências abertas |
| ------ | -------- | ------ | ---- | ------------------ |
| 1 | ❌ FAIL | 26 injetados, 19 mortos, 7 sobreviventes (W8b, W9, W10, W11, W12, W13, W25) | `tsc` vermelho sem `next typegen`; timeout em `CampaignWizardNew.test.tsx:113` em 2 de 3 execuções | Done-when de T34 e T40 não cumprida (`parceiros/[id]` e `mockPartners` vivos). Abertas T60–T65 |
| 2 | ❌ FAIL | 7 sobreviventes reexecutados, todos mortos; 13 novos, 11 mortos, 2 sobreviventes (X4, X11) | ✅ 3/3 (gate novo, load de 17 a 22) | T66 (X4, X11) |
| 3 | ✅ PASS | X4 e X11 reexecutados, mortos; 5 mortos reexecutados, mortos; 6 novos, 5 mortos e 1 sobrevivente fora do diff (N2, follow-up) | ✅ 2/2 (load de 1,3 a 27) | nenhuma bloqueante |

O ciclo correção → nova verificação fechou na 3ª rodada, dentro do limite de 3 do `validate.md`.

---

## Task Completion

### T66 (rodada 2 → rodada 3)

| Done-when | Evidência | Status |
| --------- | --------- | ------ |
| X4 morre (`"A partir de"` → `"Desde"` em `S/components/empresa/PaginaEmpresaPublica.tsx:40`) | Teste novo em `T/component/PaginaEmpresaPublica.test.tsx:99-112`: campanha com `vigencia: { inicio: "2026-11-01" }`, sem `fim` (`:104`), e `:111` `findByText("Vigência: A partir de 01/11/2026")`. O texto vem de `S/…/PaginaEmpresaPublica.tsx:40` via `:198`. Reexecutado: morto em `:111` (`TestingLibraryElementError`) | ✅ |
| X11 morre (`e.status === 404` → `e.status >= 400` em `:61`) | Teste novo em `:114-137`: resposta 500 (`:115-118`) → `:122` `findByRole("button", { name: "Tentar novamente" })`, `:123` `queryByText("Empresa não encontrada")).toBeNull()`, `:124-126` mensagem `MENSAGEM_SERVIDOR` literal (`S/services/api.ts:32`). Depois, resposta 200 e clique: `:135` `findByText("Café Serra Verde")` e `:136` `mock.chamadas.length).toBe(antes + 1)`, que prova que a requisição foi refeita. Reexecutado: morto em `:122` | ✅ |
| Gate `web` passa | Execuções 1 e 2 abaixo, exit 0 | ✅ |

**Superfície da rodada**: `git diff --stat 71100c5..445d677` mostra só `web/tests/component/PaginaEmpresaPublica.test.tsx` (+40) e `api/.specs/features/vitrine-e-selo/tasks.md` (as 3 caixas da Done-when da T66, `tasks.md:1656-1658`, nada mais). Nenhum arquivo de `web/src` mudou. Os testes antigos do arquivo continuam iguais; só se deslocaram 40 linhas a partir da `:99`.

### Estado das tasks

| Task | Rodada 1 | Rodada 2 | Rodada 3 |
| ---- | -------- | -------- | -------- |
| T29–T32, T35, T37–T39, T42–T44 | ✅ | ✅ | ✅ (nenhum arquivo de produção mudou desde a rodada 1, salvo as remoções da T60) |
| T33 página `/empresa/[slug]` | ⚠️ | ⚠️ (X4, X11) | ✅ (T66) |
| T34 rota do QR | ❌ | ✅ | ✅ |
| T36 página `/campanhas/[id]` | ✅ (W25) | ✅ | ✅ |
| T40 parceiros da home | ❌ | ✅ | ✅ |
| T41 wizard ligado à API | ✅ (gate instável) | ✅ | ✅ |
| T60–T65 | abertas | ✅ | ✅ |
| T66 | — | aberta | ✅ |

As caixas de T29–T44 em `tasks.md` seguem desmarcadas. Pela memória do projeto, quem marca as tasks de domínio é o agente no handoff, não a PR humana. As de T60–T66 já estão marcadas pelo autor, e cada uma foi conferida no código.

---

## Gate Check

- **Comando** (`tasks.md:89`, Web): `cd web && npx next typegen && npx tsc --noEmit && npm run lint && npm test`.
- **Máquina**: 32 núcleos, compartilhada com o Verifier do domínio, que rodava em paralelo.

| # | Onde | Início → fim | `uptime` (load 1/5/15) no início → no fim | Exit | Resultado |
| - | ---- | ------------ | ------------------------------------------ | ---- | --------- |
| 1 | árvore real | 11:47:01 → 11:48:09 | 1.33 / 2.05 / 3.72 → 26.00 / 9.39 / 6.15 | 0 | 70 arquivos, **331 ok, 2 skip**, 0 falhas (59,6 s) |
| 2 | worktree limpo **sem `.next`** | 11:48:15 → 11:49:14 | 27.36 / 9.95 / 6.35 → 22.09 / 11.58 / 7.12 | 0 | 331 ok, 2 skip, 0 falhas (42,9 s) |

- **`tsc`**: exit 0 nas 2. **Lint**: 0 erros, os mesmos 2 avisos de antes em `T/unit/servicos-opcionais-contrato.conditional.test.ts:71,74`, fora do diff.
- **Skips**: 2, os mesmos desde a rodada 1. São testes condicionais anteriores à feature.
- **Contagem**: base `96c313f` = 199 → rodada 1 = 321 → rodada 2 = 331 → **rodada 3 = 333**, ou seja +2, os dois testes da T66 (`:99`, `:114`). Nenhum `it(` foi removido e nenhuma asserção foi enfraquecida.
- As saídas completas estão em `/tmp/claude-1000/-home-lucas-fae-fivo-selo-sustentavel-api/ed95df21-703a-480f-b02a-5c86b8d1d6a1/scratchpad/r3-gate1.txt` e `/tmp/claude-1000/-home-lucas-fae-fivo-selo-sustentavel-api/ed95df21-703a-480f-b02a-5c86b8d1d6a1/scratchpad/r3-gate2.txt`.

---

## Spec-Anchored Acceptance Criteria (tabela final, 41 critérios)

Esta é a tabela que vale. As rodadas 1 e 2 somavam com sobreposição: o VIT-09 AC5 entrava ao mesmo tempo como "parcial/heurístico" e como "UAT". A contagem correta é a de baixo, e a T66 é o que tira o VIT-07 AC6 (subtópico) e o AC11 dos parciais.

### VIT-03: Campanhas na área da empresa

| Critério | Saída da spec | `file:line` + asserção | R1 | R2 | R3 |
| -------- | ------------- | ---------------------- | -- | -- | -- |
| AC5 card com nome, valor e status | 3 elementos por card | `T/component/CampaignCard.test.tsx:165` `toHaveLength(3)`; `:166-168` `"R$ 1,50 por unidade vendida"` | ✅ | ✅ | ✅ |
| AC6 texto do valor | 3 textos literais | `T/unit/campanhas.formatacao.test.ts:10-11`, `:16`, `:20` | ✅ | ✅ | ✅ |
| AC7 rótulos de status | 4 rótulos | `campanhas.formatacao.test.ts:33-41`; `CampaignCard.test.tsx:171-185` | ✅ | ✅ | ✅ |
| AC8 botões só em APROVADA, `href` = `urlPublica` | presença e ausência | `CampaignCard.test.tsx:194`, `:196`, `:201-212` | ✅ | ✅ | ✅ |
| AC9 sem campanhas | texto + "Criar campanha" | `CampaignCard.test.tsx:263-267` | ✅ | ✅ | ✅ |
| AC10 320 px | sem rolagem horizontal | jsdom não calcula layout | ⚠️ UAT | ⚠️ UAT | ⚠️ UAT |

### VIT-05: Selo (botão no `web`)

| Critério | Saída | `file:line` + asserção | R1 | R2 | R3 |
| -------- | ----- | ---------------------- | -- | -- | -- |
| AC9 baixa `selo-{slugCampanha}.svg` | nome do `Content-Disposition` | `T/unit/campanhas.test.ts:80`; `CampaignCard.test.tsx:239` | ✅ | ✅ | ✅ |
| AC6/AC7 409/404 viram erro na tela | `ApiError` com status e mensagem | `campanhas.test.ts:94-111`; `CampaignCard.test.tsx:252-255` | ✅ | ✅ | ✅ |

### VIT-07: Página pública da empresa

| Critério | Saída | `file:line` + asserção | R1 | R2 | R3 |
| -------- | ----- | ---------------------- | -- | -- | -- |
| AC6 card: logo, `nomeFantasia`, cidade/UF, `site` | 4 elementos | `T/component/PaginaEmpresaPublica.test.tsx:63`, `:64`, `:78-79` (`src` = `/api/empresas/publicas/cafe-serra-verde/logo`), `:80-83` (`href` do site) | ❌ | ✅ | ✅ |
| AC6 subtópico: nome, descrição, beneficiada, valor, vigência | 5 elementos, com os dois ramos da vigência | `:65`, `:94`, `:95` `"Beneficiada: Instituto X"`, `:66`, `:96` `"Vigência: 01/11/2026 até 31/01/2027"`; **ramo sem `fim`**: `:111` `"Vigência: A partir de 01/11/2026"` (X4, X4b e N4 mortos) | ❌ | ⚠️ | ✅ |
| AC7 rolagem até a campanha do slug | `scrollIntoView` no elemento certo | `T/component/EmpresaCampanhaScroll.test.tsx:69-71` `alvo.id).toBe("mata-viva")`; rota real `:89-90`; slug inexistente `:98` | ❌ | ✅ | ✅ |
| AC8 `NAO_INICIADA` → marcação | só em `NAO_INICIADA` | positivo `PaginaEmpresaPublica.test.tsx:181`; negativo `:163` `toBeNull()` | ⚠️ | ✅ | ✅ |
| AC9 sem campanha | texto literal | `:192-194` | ✅ | ✅ | ✅ |
| AC10 `temLogo` falso → iniciais | "CS", sem `img` | `:204-205` | ✅ | ✅ | ✅ |
| AC11 404 → "Empresa não encontrada" + `/parceiros` | título + link, **só no 404** | `:216-218`; **erro que não é 404**: `:122-126` (sem a página de 404, com o erro e o "Tentar novamente") e `:135-136` (o retry refaz a chamada). X11, N1, N3 e N5 mortos | ✅ | ⚠️ | ✅ |
| AC12 aviso literal | texto exato | `:229` com a constante `:10-11` | ✅ | ✅ | ✅ |
| AC13 320 px | sem rolagem | jsdom | ⚠️ UAT | ⚠️ UAT | ⚠️ UAT |

### VIT-09: Vitrine de parceiros

| Critério | Saída | `file:line` + asserção | R1 | R2 | R3 |
| -------- | ----- | ---------------------- | -- | -- | -- |
| AC3 card com logo, nome, cidade/UF → `/empresa/{slug}` | 3 elementos + link | `T/component/Parceiros.test.tsx:60-63`, `:74`, `:86`; home `T/component/PartnerCompanies.test.tsx:61`, `:70` | ✅ | ✅ | ✅ |
| AC4 vazio | texto + link `/cadastro` | `Parceiros.test.tsx:108-109`; `PartnerCompanies.test.tsx:90-91` | ✅ | ✅ | ✅ |
| AC5 320 px | sem rolagem | heurística em `Parceiros.test.tsx:152-163` (sem largura fixa ≥ 100 px) | ⚠️ | ⚠️ UAT | ⚠️ UAT |

### VIT-10: Nova campanha ligada à API

| Critério | Saída | `file:line` + asserção | R1 | R2 | R3 |
| -------- | ----- | ---------------------- | -- | -- | -- |
| AC1 POST com os campos | corpo completo | `T/component/CampaignWizardNew.test.tsx:122-129`, `:152-153`; `T/unit/campanhas.criacao.test.ts:36-41` | ✅ | ✅ | ✅ |
| AC2 capa por PUT depois da criação | ordem | `CampaignWizardNew.test.tsx:164-167` | ✅ | ✅ | ✅ |
| AC3 "Salvar rascunho" → `/campanhas/{id}` | navegação | `:120` | ✅ | ✅ | ✅ |
| AC4 "Enviar para análise" | mensagem literal + ordem | `:178`, `:180-183` | ✅ | ✅ | ✅ |
| AC5 erro mantém os campos | texto + valores | `:194-202` | ✅ | ✅ | ✅ |
| AC6 sem passo de modelo de selo | ausente | `:229-237` | ✅ | ✅ | ✅ |

### VIT-11: Detalhe e correção de campanha

| Critério | Saída | `file:line` + asserção | R1 | R2 | R3 |
| -------- | ----- | ---------------------- | -- | -- | -- |
| AC1 todos os campos | 8 campos | `T/component/DetalheCampanha.test.tsx:167-177` (`:168` "Casa do Bem", `:171` "01/11/2026 a 31/01/2027") | ✅ | ✅ | ✅ |
| AC2 motivo só em REJEITADA | presença e ausência | positivo `:221`; negativo com motivo preenchido em `EM_ANALISE` `:207` | ⚠️ | ✅ | ✅ |
| AC3 PATCH + submissão | botões e chamadas | `:192`, `:226`; `:278` `editarCampanha).toHaveBeenCalledWith(…)`; `:264` `submeterCampanha).toHaveBeenCalledWith("camp-1")` | ✅ | ✅ | ✅ |
| AC4 EM_ANALISE só leitura | texto literal | `:230-236` | ✅ | ✅ | ✅ |
| AC5 APROVADA: selo e página pública | botões + `href` | `:241-248`; download `:342-349` | ✅ | ✅ | ✅ |
| AC6 404 → "Campanha não encontrada" | título + link | `:357-362` | ✅ | ✅ | ✅ |
| AC7 `/selos` e `/comprovantes` removidos | ausentes | `T/component/AppHeader.menu.test.tsx:44-45`, `:54-55`, `:63-64` | ✅ | ✅ | ✅ |

### VIT-12: Fila de campanhas no admin

| Critério | Saída | `file:line` + asserção | R1 | R2 | R3 |
| -------- | ----- | ---------------------- | -- | -- | -- |
| AC1 itens e campos | ordem + campos | `T/component/FilaCampanhas.test.tsx:103-120` | ✅ | ✅ | ✅ |
| AC2 aprovar NOVA | rota `/aprovacao` | `:142-147`; `T/unit/admin.campanhas.test.ts:71` | ✅ | ✅ | ✅ |
| AC3 aprovar ALTERACAO | rota `/alteracao/aprovacao` | mesmo `it.each`; `admin.campanhas.test.ts:64` | ✅ | ✅ | ✅ |
| AC4 rejeitar com motivo | corpo `{ motivo }` | `FilaCampanhas.test.tsx:169`; `admin.campanhas.test.ts:103` | ✅ | ✅ | ✅ |
| AC5 menos de 20 caracteres | 19 desabilitado, 20 habilitado | `:182-187` (W16 morto de novo nesta rodada) | ✅ | ✅ | ✅ |
| AC6 409 → mensagem + recarga | texto + 2ª chamada | `:201-207` | ✅ | ✅ | ✅ |
| AC7 vazio | texto literal | `:127` | ✅ | ✅ | ✅ |
| AC8 item "Campanhas" no menu | `href` | `T/component/AdminHeader.campanhas.test.tsx:35` | ✅ | ✅ | ✅ |

**Status final**: 41 critérios. **38 ✅**, 0 ❌, 0 parciais e **3 ⚠️ que só o UAT fecha** (320 px: VIT-03 AC10, VIT-07 AC13 e VIT-09 AC5, este com evidência heurística). Nenhum dos 3 é verificável em jsdom, e os 3 já constam da lista de UAT. Não bloqueiam.

---

## Edge Cases

- [x] Slug de campanha inexistente na URL do QR → página no topo, sem erro: `T/component/EmpresaCampanhaScroll.test.tsx:93-98`.
- [x] Logo que não carrega → iniciais: página pública em `T/component/PaginaEmpresaPublica.test.tsx:147-151`, `/parceiros` em `T/component/Parceiros.test.tsx:91-102` e home em `T/component/PartnerCompanies.test.tsx:74-84`.
- [x] Empresa suspensa ou slug inexistente → 404 → "Empresa não encontrada": `PaginaEmpresaPublica.test.tsx:208-219`.
- [x] Novo nesta rodada: API em 5xx na página pública → erro com "Tentar novamente", e não a página de 404 → `:114-137` (SP5 travado no comportamento atual).
- [~] Conteúdo com HTML ou script exibido como texto: o React escapa. Não há teste (follow-up 4).
- [n/a] Aprovações simultâneas e alteração pendente: são do `api`.

---

## Discrimination Sensor

### Isolamento desta rodada

- Worktree temporário em `/tmp/claude-1000/-home-lucas-fae-fivo-selo-sustentavel-api/ed95df21-703a-480f-b02a-5c86b8d1d6a1/scratchpad/wt-r3-web`, criado com `git worktree add --detach … HEAD` (`445d677`) e com symlink para `web/node_modules`.
- Cada mutante entrou por substituição exata de texto, com a exigência de uma única ocorrência. Rodou contra os testes que cobrem o código mutado; N2 e N5 rodaram contra a suíte inteira. Depois, `git checkout -- . && git clean -fdq -- web/src` dentro do worktree, e o `git status --porcelain` do worktree ficou vazio depois de cada mutante.
- Linha de base sem mutação nos 4 arquivos-alvo: 39 ok.
- Não usei `git stash`, não mexi na árvore real e não toquei no `wt-r3-dom`.
- `git status --porcelain` da árvore real: **vazio antes**. Depois de `git worktree remove --force` + `git worktree prune`, mostrou só ` M api/.specs/features/vitrine-e-selo/validation-dominio.md`. Esse arquivo é do Verifier do domínio, que roda em paralelo, e este Verifier não o tocou. Nenhum arquivo de `web/` mudou. Depois, este relatório foi escrito.
- Toda morte foi conferida no log: a falha vem de uma asserção (`AssertionError` ou `TestingLibraryElementError`) no teste esperado, não de timeout. Os logs estão em `/tmp/claude-1000/-home-lucas-fae-fivo-selo-sustentavel-api/ed95df21-703a-480f-b02a-5c86b8d1d6a1/scratchpad/r3-sensor/`.

### Rodada 3: reexecução dos sobreviventes da rodada 2

| ID | Alvo | Mutação | R2 | R3 | Morto por |
| -- | ---- | ------- | -- | -- | --------- |
| X4 | `S/components/empresa/PaginaEmpresaPublica.tsx:40` | "A partir de" → "Desde" | ❌ | ✅ Morto | `PaginaEmpresaPublica.test.tsx:111` |
| X11 | `PaginaEmpresaPublica.tsx:61` | `e.status === 404` → `e.status >= 400` | ❌ | ✅ Morto | `:122` (não acha "Tentar novamente") |

### Rodada 3: amostra de mortos reexecutados

| ID | Alvo | Mutação | R3 | Morto por |
| -- | ---- | ------- | -- | --------- |
| W8b | `PaginaEmpresaPublica.tsx:79` | slug existe → rola para a 1ª campanha | ✅ Morto | `EmpresaCampanhaScroll.test.tsx:71` e `:90` (`expected 'agua-limpa' to be 'mata-viva'`) |
| W9 | `PaginaEmpresaPublica.tsx:182` | chip sempre visível | ✅ Morto | `PaginaEmpresaPublica.test.tsx:163` |
| W13 | `S/app/empresa/[slug]/[slugCampanha]/page.tsx:12` | não repassa `slugCampanha` | ✅ Morto | `EmpresaCampanhaScroll.test.tsx:89` (spy chamado 0 vez) |
| W25 | `S/components/campanhas/DetalheCampanha.tsx:260` | motivo em qualquer status | ✅ Morto | `DetalheCampanha.test.tsx:207` |
| W16 | `S/components/admin/FilaCampanhas.tsx:77` | `<` → `<=` no mínimo do motivo | ✅ Morto | `FilaCampanhas.test.tsx` (3 testes, `toBeEnabled()` com 20 caracteres) |

### Rodada 3: mutantes novos perto do código tocado

| ID | Alvo | Mutação | Resultado | Morto por |
| -- | ---- | ------- | --------- | --------- |
| X4b | `PaginaEmpresaPublica.tsx:40` | vigência sem `fim` vira string vazia | ✅ Morto | `:111` |
| N1 | `PaginaEmpresaPublica.tsx:105-108` (`onRetry`) | o retry só alterna `carregando` e **não refaz a requisição** | ✅ Morto | `:135` (não acha "Café Serra Verde") |
| N3 | `PaginaEmpresaPublica.tsx:58` | o sucesso não limpa o `erro` (sem `setErro(null)`) | ✅ Morto | `:135` (o erro continua na tela depois do retry) |
| N4 | `PaginaEmpresaPublica.tsx:38` | `vigencia.fim ?` → `vigencia.inicio ?` (sempre o ramo com "até") | ✅ Morto | `:111` |
| N5 | `S/services/api.ts:52` (`ehErroRecuperavel`) | `>= 500` → `> 500` (500 sem retry) | ✅ Morto | `PaginaEmpresaPublica.test.tsx:122` e `FilaEmpresas.test.tsx` (R6.1/R6.2). Suíte inteira |
| N2 | `S/components/ui/AsyncState.tsx:52` | `ehErroRecuperavel` ignorado: "Tentar novamente" aparece em qualquer erro | ❌ **Sobreviveu** (suíte inteira: 331 ok) | nenhum teste confere a **ausência** do botão num 4xx em telas com `AsyncState` |

**Leitura do N2.** O mutante não está na superfície da feature: `AsyncState.tsx` e `api.ts` não têm commit em `96c313f..HEAD`, e o `AsyncState` veio do commit `4fda043`, de outra feature. Nenhum AC de `vitrine-e-selo` define se um 4xx que não é 404 oferece nova tentativa (o SP5 só pede o 5xx). O efeito prático é cosmético e não engana o usuário: um 400 ou 403 mostraria "Tentar novamente", e o clique daria o mesmo erro. Pelo `validate.md` §5, o sensor mira o código novo da feature. Por isso o N2 não bloqueia este veredito e vira o **follow-up 10**, endereçado à feature dona do `AsyncState`.

### Sensor acumulado (rodadas 1 a 3)

| Rodada | Injetados | Mortos | Sobreviventes | Destino |
| ------ | --------- | ------ | ------------- | ------- |
| 1 | 26 (W1–W25, W8b) | 19 | 7: W8b, W9, W10, W11, W12, W13, W25 | T60–T63 → todos mortos na R2 |
| 2 | 20 (7 reexecuções e X1–X13) | 18 | 2: X4, X11 | T66 → mortos na R3 |
| 3 | 13 (X4, X11, 5 reexecuções e 6 novos) | 12 | 1: N2, **fora do diff** | follow-up 10 |

Os mutantes distintos dentro da superfície da feature são 44 (W1–W25, W8b, X1–X13 e X4b, N1, N3, N4). Ao fim da rodada 3, os 44 estão mortos. Fora da superfície, foram 2 (N2 e N5): N5 morreu e N2 sobreviveu. Não houve equivalente contado. **Sensor depth**: lightweight-plus. **Result**: ✅ PASS no escopo da feature.

---

## Divergências de contrato com `design.md`

Nenhuma nova. Continuam valendo as notas da rodada 1: `site` tipado como `string` (SP2), `urlPublica` vinda de `GET /campanhas` e a mensagem do 404 do selo via `mensagemDeErro`. O `fim` opcional (`design.md:86`) está tipado em `S/services/empresasPublicas.ts:20` e agora tem teste nos dois ramos.

---

## Code Quality

| Princípio | Status | Nota |
| --------- | ------ | ---- |
| Minimum code / no scope creep | ✅ | A T66 é só teste, com +40 linhas e 2 `it` |
| Surgical changes | ✅ | Só o arquivo de teste e as 3 caixas da T66 |
| Matches patterns | ✅ | Os testes novos seguem o padrão do arquivo (`mock.responderPara`, `montar()`, `findBy` e depois `getBy`). Continuam as notas não bloqueantes da rodada 2: duplicações, indentação de `PaginaEmpresaPublica.tsx:71,81` e `scrollIntoView` sem restaurar (follow-ups 6 e 9) |
| Spec-anchored outcome check | ✅ | Os textos literais batem com a spec e com o código: "A partir de", "Empresa não encontrada" e `MENSAGEM_SERVIDOR` |
| Per-layer coverage | ✅ | A página pública cobre carregado, vazio, 404, erro recuperável com retry e logo quebrado |
| Todo teste mapeia para AC / edge / Done-when | ✅ | `:99` → VIT-07 AC6 e Done-when da T66 (X4); `:114` → VIT-07 AC11, SP5 e Done-when da T66 (X11) |
| Guidelines documentadas | ✅ | Nenhuma no projeto. Segui os strong defaults da Test Coverage Matrix de `tasks.md` |
| Senior engineer aprovaria? | ✅ | Sim. O teste do 500 vai além do pedido e prova que o retry refaz a chamada (`:136`) |

---

## Spec-Precision Gaps

| # | AC | Problema | Estado |
| - | -- | -------- | ------ |
| SP1 | VIT-07 AC6, VIT-11 AC1, VIT-12 AC1 | "Período de vigência" sem formato definido: "até" na página pública, "a" no detalhe e na fila | Aberto, não bloqueia. Os testes travam o formato atual |
| SP2 | VIT-07 AC1/AC6 | A spec não diz se `site` pode faltar | Aberto. O `web` trata a ausência (`PaginaEmpresaPublica.tsx:152`) |
| SP3 | VIT-03 AC10, VIT-07 AC13, VIT-09 AC5 | 320 px não é verificável em jsdom | UAT de 10/11 |
| SP4 | VIT-03 AC8 | Não diz se "Ver página pública" abre em nova aba | Aberto, cosmético |
| SP5 | VIT-07 AC11 | A spec só define o 404, não o 5xx nem a falha de rede | Comportamento travado pela T66 (`:114-137`). Falta só registrar na spec, se o time quiser |

---

## Follow-ups não bloqueantes (válidos ao fim da rodada 3)

1. **Wizard: edição depois da criação.** A nova tentativa reaproveita o `campanhaId` (`S/components/campaign-wizard/CampaignWizardNew.tsx:58-69`), mas não envia por `PATCH` o que foi corrigido nos campos.
2. **Home**: o subtítulo "Veja campanhas em andamento e o que já foi doado." (`S/components/home/PartnerCompanies.tsx`) promete o valor doado, que saiu da v1 pelo AD-023.
3. **Download do selo**: o `URL.revokeObjectURL` logo depois do `click()` (`CampaignCard.tsx:41`, `DetalheCampanha.tsx:92`) pode cancelar o download em alguns navegadores. Conferir no UAT.
4. **`site` da empresa**: validar o esquema `http(s)` antes de usar como `href` (`PaginaEmpresaPublica.tsx:153`).
5. **Beneficiada suspensa no detalhe** mostra "—" (`DetalheCampanha.tsx:67-71`). Aceitável na v1.
6. **Duplicações** (`salvarNoComputador`, `iniciais`, `formatarData`) e formato uniforme da vigência (SP1). Corrigir de passagem a indentação de `PaginaEmpresaPublica.tsx:71,81`.
7. **Propriedades por semente fora do escopo** (`SeletorCausa.property-selecao`, `CadastroInstituicao.property-envio-valido`, da feature `seletor-causa-cadastro-instituicao`). Falham já na base `96c313f`. Pedem uma task naquela feature.
8. **Timeouts globais da T64** (`testTimeout: 30000`, `asyncUtilTimeout: 5000`): deixam o diagnóstico lento, sem esconder regressão.
9. **`EmpresaCampanhaScroll.test.tsx:57`**: restaurar o `Element.prototype.scrollIntoView` original no `afterEach`.
10. **Novo: N2 em `S/components/ui/AsyncState.tsx:52`.** Nenhum teste prova que um 4xx **não** mostra "Tentar novamente" nas telas com `AsyncState`. Basta um teste de componente do `AsyncState` com `ApiError(400)` → `queryByRole("button", { name: "Tentar novamente" })).toBeNull()`, na feature dona do componente (`4fda043`).

---

## UAT pendente (ponta a ponta de 10/11, com a API real)

Pré-requisito: T19–T28 do `api` entregues e verificadas, com `WEB_URL` e o proxy `/api` configurados.

1. Área da empresa, `/campanhas/[id]`, `/empresa/{slug}` e `/parceiros` em 320 px, sem rolagem horizontal (VIT-03 AC10, VIT-07 AC13, VIT-09 AC5).
2. "Baixar selo" salva `selo-{slugCampanha}.svg` de verdade no Chrome desktop, no Chrome Android e no Safari iOS (VIT-05 AC9; follow-up 3).
3. O QR do selo, lido no celular, abre `/empresa/{slug}/{slugCampanha}` sem login e rola até a campanha certa, inclusive com várias campanhas e com o cabeçalho fixo (`scrollMarginTop: 16`).
4. Na página pública, o logo real carrega, e um logo quebrado vira iniciais.
5. Fluxo criar → enviar → aprovar no admin → selo disponível no card → "Ver página pública" abre a URL absoluta de `WEB_URL`.
6. Rejeitar com motivo → o detalhe mostra "Motivo da rejeição" → corrigir → reenviar → a campanha volta à fila e o detalhe em análise **não** mostra mais o motivo.
7. Com a API fora do ar ou respondendo 500, `/empresa/{slug}` mostra o erro com "Tentar novamente", e não "Empresa não encontrada". Ao religar a API, o clique carrega a página.
8. Campanha sem `fim` publicada pela API real aparece como "Vigência: A partir de dd/mm/aaaa" (confirma que a API omite `fim` em vez de mandar `null`; se mandar `null`, o ramo também funciona, porque `null` é falsy).
9. A vitrine `/parceiros` e a home listam só empresas com campanha aprovada e levam a `/empresa/{slug}`, sem nenhum link `/parceiros/{id}`.
10. A fila `/admin/campanhas` aprova e rejeita itens "Nova" e "Alteração" pelas rotas certas, e um 409 recarrega a fila com a mensagem.

---

## Requirement Traceability Update

`spec.md` não foi editado. Status proposto para o orquestrador aplicar:

| Requirement | Rodada 1 | Rodada 2 | Status proposto (rodada 3) |
| ----------- | -------- | -------- | -------------------------- |
| VIT-03 | ✅ (AC10 no UAT) | ✅ | web verificado com fetch mockado; UAT e integração pendentes |
| VIT-05 | ✅ | ✅ | web verificado com fetch mockado; UAT e integração pendentes |
| VIT-07 | ❌ Needs Fix | ⚠️ Needs Fix (T66) | web verificado com fetch mockado; UAT e integração pendentes |
| VIT-09 | ❌ Needs Fix | ✅ | web verificado com fetch mockado; UAT e integração pendentes |
| VIT-10 | ✅ (T64) | ✅ | web verificado com fetch mockado; UAT e integração pendentes |
| VIT-11 | ⚠️ (T63) | ✅ | web verificado com fetch mockado; UAT e integração pendentes |
| VIT-12 | ✅ | ✅ | web verificado com fetch mockado; UAT e integração pendentes |

Nenhum desses requisitos fica "Verified" pleno, porque a parte `api` deles depende da infra T19–T28 e da verificação do domínio, que corre em paralelo.

---

## Summary

**Overall**: ✅ Ready. O `web` está pronto para a integração com a API real em 10/11, condicionada à infra T19–T28.

**Spec-anchored check**: 41 critérios: 38 ✅, 0 ❌, 0 parciais e 3 ⚠️ de 320 px que só o UAT fecha. São 5 spec-precision gaps (SP1–SP5), nenhum bloqueante.
**Sensor**: na rodada 3, 13 injetados, 12 mortos e 1 sobrevivente fora do diff (N2, follow-up 10). Acumulado: 44/44 mortos na superfície da feature.
**Gate**: ✅ 2/2 com exit 0 (331 ok, 2 skip), na árvore real e num worktree sem `.next`, com load de até 27. A contagem foi 199 → 321 → 331 → 333.

**O que funciona**: tudo o que as rodadas 1 e 2 verificaram. Além disso, a vigência aberta tem asserção, um 5xx na página pública não se disfarça de 404, e o "Tentar novamente" refaz de fato a requisição.

**Próximos passos**: (1) o orquestrador aplica a traceability acima e marca T29–T44 no handoff; (2) entregar e verificar T19–T28; (3) UAT e integração de 10/11 com a lista acima; (4) follow-ups 7 e 10 nas features donas do código.
