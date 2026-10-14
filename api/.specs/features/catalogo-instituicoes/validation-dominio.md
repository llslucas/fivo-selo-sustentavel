# Catálogo de Instituições — Validação do domínio (gate de handoff AD-020)

**Veredito**: ❌ **FAIL**. O gate `build` não fecha (eslint e e2e vermelhos). 7 de 28 mutantes sobreviveram. Há lacunas de AC em auditoria (P1-Aprovação AC9, P1-Causas AC7), na fila do admin (P1-Aprovação AC1) e na unicidade normalizada de causa (P1-Causas AC2). A Fase 6 não começa até a Fase 5b (hardening, T35–T48 em `tasks.md`) fechar e uma nova verificação dar PASS.

**Data**: 2026-10-13
**Spec**: `.specs/features/catalogo-instituicoes/spec.md`
**Diff range**: `7b0e9e7..891cdd5` (escopo: `src/domain/fivo/**`, `src/core/**`, `test/repositories/**`, `test/factories/**`, `test/arquivo/**`, `test/cryptography/**`)
**Verifier**: sub-agente independente (autor ≠ verificador), somente leitura sobre a árvore real
**Rodada**: P1 apenas (INST-01…INST-10 → T1–T20). Sem UAT (backend).

> Nota de autoria: a T5 (`Instituicao`) foi escrita pelo agente sob a exceção registrada em `STATE.md` (AD-020, 2026-09-30). As demais tasks de domínio são humanas.

---

## Gate Check

- **Gate command**: `cd api && npm run build && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest && npx jest --config ./test/jest-e2e.json` (cada etapa rodada em separado, saída redirecionada para arquivo, sem `tail`)

| Etapa | Exit | Resultado |
| ----- | ---- | --------- |
| `npm run build` | 0 | ok |
| `tsc --noEmit` | 0 | ok |
| `eslint` | **1** | **5 erros `prettier/prettier` "Insert ⏎"** (falta quebra de linha final): `application/errors/beneficiada-ambigua.error.ts:9`, `use-cases/assegurar-beneficiada-disponivel.ts:52`, `use-cases/assegurar-beneficiada-disponivel.spec.ts:143`, `use-cases/listar-beneficiadas.ts:85`, `use-cases/listar-beneficiadas.spec.ts:172`. Regras de camada (`no-restricted-imports`) sem violação. |
| `jest` (unit) | 0 | 43 suites, **316/316** passaram, 0 skip |
| `jest e2e` | **1** | 205 testes, **204 passaram, 1 falhou**: `test/http/domain-exception-filter.e2e-spec.ts:137` espera 422 para `instituicao-ja-existe` (tabela `STATUS_ESPERADO`, linha 68), mas a T1 moveu `InstituicaoAlreadyExistsError` para 409, como pede a spec (P1-Autocadastro AC3). A expectativa do teste é que está desatualizada. |

- **Test count antes da feature** (unit, `7b0e9e7`): 174 (31 suites)
- **Test count depois** (unit, `891cdd5`): 316 (43 suites)
- **Delta**: +142 testes unit. Nenhum arquivo de teste removido no range (`git diff --diff-filter=D` vazio).
- **Skipped**: nenhum.
- **Donos das falhas**: eslint → arquivos de `src/domain/**` → 👤 humano (T35). E2e → `test/http/**` → 🤖 agente (T36).

---

## Task Completion

Os checkboxes de `tasks.md` não foram marcados (só os da T4). A conclusão abaixo foi julgada pelo código.

| Task | Status | Evidência / notas |
| ---- | ------ | ----------------- |
| T1 Erros | ⚠️ Parcial | 9 erros criados com o `status` do design. `InstituicaoAlreadyExistsError` = 409 + `CNPJ ou e-mail já cadastrado` (`errors/instituicao-already-exists.error.ts:7,10`). **Desvios**: `DocumentoIndisponivelError` diz `Documento indisponível. Tente novamente mais tarde.` (`errors/documento-indisponivel.error.ts:7`), mas o design pede `Documento temporariamente indisponível`. `CausaComInstituicoesAprovadasError` acrescenta `: nomes` à mensagem (`causa-com-instituicoes-aprovadas.error.ts:11`), o que é aceitável porque o campo `instituicoes` existe (linha 9). Gate `quick` falha no prettier (`beneficiada-ambigua.error.ts:9`). |
| T2 `Causa` | ⚠️ Parcial | Regras ok: nome ≤ 80 (`entities/causa.ts:63`), nome vazio ou só espaços (`:67`), `inativar` só de ATIVA (`:75`), `editar` revalida e recusa INATIVA (`:88,92`). Fábrica chama `create`, não `criar` (cosmético). **Os testes não cobrem** `editar()`, nome só de espaços nem 81 caracteres de forma efetiva: `causa.spec.ts:46` e `:83` põem o `expect` dentro de `if (isLeft())` e passam no vazio. Mutantes #18, #19 e #20 sobreviveram. |
| T3 `DocumentoValidacao` | ✅ | `documento-validacao.spec.ts:39` (undefined/null/''/espaços), `:56` (mensagem), `:62` (200 aceito), `:68` (201 rejeitado). Mutante #17 morto. |
| T4 `Arquivo` | ✅ | `arquivo.spec.ts:191` (PDF documento), `:203/215` (PDF logo rejeitado), `:219` (10 MB aceito), `:233/247` (10 MB + 1 rejeitado citando "10 mb"), `:251` (300×300 documento ok), `:265/279` (300×300 logo rejeitado), `:283/297` (logo cita "5 mb"). Mutante #28 morto. |
| T5 `Instituicao` | ✅ | Sem setters públicos (`entities/instituicao.ts`, só getters e métodos de transição). `INATIVA` no enum. Todos os métodos devolvem `Either`. `estaDisponivelParaSelecao` (`:239`). `instituicao.spec.ts` cobre cada transição válida (`:10–94`), uma inválida por método (`:96–163`) e disponibilidade por estado (`:165–175`). Factories e specs de campanha compilam e passam. |
| T6 `CausaRepository` | ❌ | Porta ok (`ports/database/causa-repository.ts`). **`InMemoryCausaRepository.findByNome` não ignora caixa nem acento**: só faz `nome.normalize('NFD')` e compara com `===` (`test/repositories/in-memory-causa-repository.ts:26–27`). Uma sonda no scratch confirmou que nem o nome **exato** com acento é encontrado (`findByNome('Educação')` → `null`), e o `CriarCausaUseCase` aceita criar "Educação" duas vezes. A porta também declara `create(props: CausaProps)` (`causa-repository.ts:7`), mas os casos de uso passam uma `Causa`. Isso só compila porque os getters de `Causa` têm a mesma forma de `CausaProps`, e o adaptador Prisma (T22) receberia um tipo sem `id`. |
| T7 `InstituicaoRepository` | ⚠️ Parcial | Porta com as 9 operações. `save` documentado como "não afeta o status" (`instituicao-repository.ts:29`), sem citar `decididoPor/decididoEm/motivoDecisao`, mas o double preserva esses campos (`copiar(instituicao, this.items[index])`). CAS em memória implementado (`in-memory-instituicao-repository.ts:136`), **mas nenhum teste o exercita**: mutante #3 sobreviveu. `buscarDisponiveis(nome)` é obrigatório (o design pedia `termo?`) e o double faz igualdade exata, sem normalizar e sem match parcial (`:99–108`). Nenhum caso de uso chama esse método. `listarPorEstado` ordena por `createdAt` (ok). |
| T8 `VerificadorDeDocumento` | ✅ | Porta `estaLegivel` (`ports/verificador-de-documento.ts`). O fake marca arquivo ilegível (`test/arquivo/fake-verificador-de-documento.ts:16`). |
| T9 `CriarCausaUseCase` | ⚠️ Parcial | Não-admin (`criar-causa.spec.ts:52–67`), duplicata com nome exato (`:69–86`), nome inválido (`:88–103`), sucesso ATIVA (`:42`). **Faltam**: duplicata ignorando caixa e acento (nem o double suporta, ver T6); asserção de autor e data-hora na auditoria, porque só `tipo` é conferido (`:49`) e o mutante #26 sobreviveu; asserção de "sem escrita" no ramo não-admin. |
| T10 `EditarCausaUseCase` | ❌ | Colisão de nome (`editar-causa.spec.ts:67–87`) e manter o próprio nome (`:90–114`) cobertos. **Sem teste** para causa inexistente (`ResourceNotFoundError`) nem para causa INATIVA (`TransicaoInvalidaError`). **Bug na auditoria**: `const causaAntiga = Causa.create(causa, causa.id)` (`use-cases/editar-causa.ts:59`) devolve um `Either`, e o spread de uma instância de classe compartilha `_props` com a entidade editada. A sonda confirmou que `dados.causa_antiga` é um `Right` cujo nome aninhado já é o **novo**. O "estado anterior" auditado está errado. |
| T11 `InativarCausaUseCase` | ✅ | Não-admin (`inativar-causa.spec.ts:33`), inexistente (`:51`), bloqueio com nomes e sem mudar estado nem auditar (`:66–92`), várias aprovadas (`:94–124`), outros estados não bloqueiam (`:126–150`), aprovada de outra causa (`:152`), sucesso com registro preservado e auditoria (`:170–193`), já inativa (`:195`). Mutantes #10 e #11 mortos. Nota: autor e data-hora da auditoria não são conferidos. |
| T12 `ListarCausasAtivasUseCase` | ✅ | `listar-causas-ativas.spec.ts:23` (ordem sem acento/caixa), `:44` (só ATIVA), `:50` (`[]`). |
| T13 `CriarInstituicaoUseCase` | ✅ | Ordem de validação (`criar-instituicao.spec.ts:299–339`), `unitOfWork` (`:128–139`), hash (`:124–125`), e-mail best-effort (`:341–359`), um ramo por AC. Mutantes #21, #22 e #23 mortos. |
| T14 `ListarFilaInstituicoesUseCase` | ❌ | Filtro e ordem ok (`listar-fila-instituicoes.spec.ts:93`), papel (`:136–137`), sinal de coincidência (`:189`, mutante #27 morto). **O item traz o id da causa, não o nome** (`use-cases/listar-fila-instituicoes.ts:66` `causa: instituicao.causaId.toString()`), e o teste fixa esse comportamento (`spec:102`). Também: o campo se chama `documentArquivoId` em vez de `documentoArquivoId` (`:18`), e `cnpjCoincideComEmpresa` é `string \| null`, não `boolean` (`:19`). |
| T15 `AprovarInstituicaoUseCase` | ⚠️ Parcial | `Either` em todos os ramos. `estaLegivel` antes da transição (`aprovar-instituicao.ts:48–54`, spec `:146–169`, mutante #4 morto). `false` do CAS → `TransicaoInvalidaError` (spec `:192–208`, mutante #1 morto). E-mail best-effort (`:171–190`). **A auditoria não confere autor nem data-hora** (spec `:103` só olha `dados`), e o mutante #16 sobreviveu. |
| T16 `RejeitarInstituicaoUseCase` | ✅ | 19 caracteres rejeitado sem escrita (`rejeitar-instituicao.spec.ts:90–114`), 20 aceito (`:116–127`, mutante #5 morto), motivo persistido (`:145`), e-mail com `dados: { motivo }` (`:162`, mutante #24 morto), CAS (`:223–243`). Mesma ressalva de autor e data na auditoria. |
| T17 Suspender/Reativar | ✅ | `suspender-instituicao.spec.ts:26–50` e `:52–77`, `reativar-instituicao.spec.ts:26–50` e `:52–76`, não-admin, inexistente e CAS nos dois. Mutante #15 morto. |
| T18 `InativarInstituicaoUseCase` | ✅ | Registro legível por `findById` depois da inativação (`inativar-instituicao.spec.ts:62–68`). Estados inválidos (`:71–96`), não-admin, inexistente, CAS. Mutante #2 morto. |
| T19 `ListarBeneficiadasUseCase` | ⚠️ Parcial | Read model exato (`listar-beneficiadas.spec.ts:55`), um teste por estado (`:81–93`), causa inativa (`:101`), ordem mista (`:112`), "FUNDACAO" (`:125–127`), parcial na causa (`:134–136`), termo < 2 (`:143–149`), não expõe dados sensíveis (`:168–170`). Mutantes #8, #13 e #14 mortos. **Falta o limite de 2 caracteres exatos** (mutante #9 sobreviveu). Gate falha no prettier do arquivo e do spec. |
| T20 `AssegurarBeneficiadaDisponivelUseCase` | ⚠️ Parcial | Ambas ou nenhuma (`assegurar-beneficiada-disponivel.spec.ts:48–70`, mutante #7 morto), um teste por estado (`:92–113`), inexistente (`:115`), causa INATIVA e inexistente (`:124`, `:135`), felizes (`:73`, `:84`). **O gate `build` da T20 não passa** (eslint + e2e). |

---

## Spec-Anchored Acceptance Criteria

### P1: Autocadastro da instituição

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 envio válido cria instituição | estado `PENDENTE_APROVACAO` + identificador (201 é infra) | `criar-instituicao.spec.ts:99` `expect(instituicao?.status).toBe(InstituicaoStatus.PENDENTE_APROVACAO)`, `:96` `findById(response.value.instituicaoId)` | ✅ |
| AC2 CNPJ inválido | 422 `CNPJ inválido`, nada persistido | `criar-instituicao.spec.ts:188–189` `status).toBe(422)` / `message).toBe('CNPJ inválido')`, `:191` `expectNadaPersistido()` | ✅ |
| AC3 CNPJ ou e-mail duplicado | 409 `CNPJ ou e-mail já cadastrado` | `criar-instituicao.spec.ts:270–271` (CNPJ), `:291–292` (e-mail de conta EMPRESA) | ✅ |
| AC4 senha < 10 | 422 `A senha deve ter no mínimo 10 caracteres` | `criar-instituicao.spec.ts:172–175` | ✅ |
| AC5 senha só como hash | hash, nunca texto claro | `criar-instituicao.spec.ts:124` `toBe('SenhaForte123-hashed')`, `:125` `not.toBe('SenhaForte123')` | ✅ (o argon2 real é infra) |
| AC6 sem documento | 422 `Anexe um documento que comprove a existência da instituição` | `criar-instituicao.spec.ts:202–205`, `documento-validacao.spec.ts:56` | ✅ |
| AC7 PDF/JPG/PNG ≤ 10 MB, descrição ≤ 200 | aceita esses limites | `arquivo.spec.ts:191`, `:219`, `documento-validacao.spec.ts:62`, `:68` | ✅ ("exatamente um arquivo" é multipart, infra) |
| AC8 formato/tamanho viola | 422 dizendo qual limite foi violado | `arquivo.spec.ts:247` `toContain('10 mb')`, `:215` `toContain('formato')` | ✅ / ⚠️ spec-precision: a spec não define o texto |
| AC9 causa inexistente ou INATIVA | 422 `Causa inválida ou inativa` | `criar-instituicao.spec.ts:231–232`, `:251–252` | ✅ |
| AC10 logo | PNG/JPG/SVG ≤ 5 MB, raster ≥ 512×512, opcional | `arquivo.spec.ts:279` `toContain('dimensão')`, `:297` `toContain('5 mb')`, `:301` SVG ok; opcional: `criar-instituicao.spec.ts:90` sem logo → right | ✅ |
| AC11 e-mail "em análise" | e-mail ao endereço cadastrado | `criar-instituicao.spec.ts:144–149` `para: 'contato@…'`, `template: CADASTRO_RECEBIDO` | ✅ |
| AC12 storage fora do ar | 503 | infra (T24/T29) | fora do domínio |

### P1: Aprovação da instituição pelo administrador

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 fila | só PENDENTE, mais antiga primeiro, com nome, CNPJ, **causa**, cidade, UF, data, documento | `listar-fila-instituicoes.spec.ts:93` (ordem), `:98–109` `toEqual({... causa: instituicaoMaisAntiga.causaId.toString() ...})` | ❌ **GAP**: a causa sai como id. A Done-when da T14 pede o nome. ⚠️ spec-precision: "nome" não diz se é razão social ou nome fantasia |
| AC2 aprovar | `APROVADA`, autor, data-hora, entra no catálogo, e-mail | `aprovar-instituicao.spec.ts:99` status, `:100` `decididoPor?.equals(admin.id)`, `instituicao.spec.ts:18` `decididoEm).toBeInstanceOf(Date)`, `aprovar…spec.ts:111–116` e-mail, `listar-beneficiadas.spec.ts:55` | ✅ |
| AC3 rejeitar | motivo ≥ 20, `REJEITADA`, motivo persistido e enviado por e-mail | `rejeitar-instituicao.spec.ts:102–104` (19 → 422), `:126` (20 ok), `:144–145`, `:162` `dados: { motivo: MOTIVO_VALIDO }` | ✅ |
| AC4 ocultar não aprovadas | fora da lista nos 4 estados | `listar-beneficiadas.spec.ts:81–93` `filter(tipo==='INSTITUICAO')).toEqual([])`, `assegurar…spec.ts:92–110` | ✅ |
| AC5 só as 6 transições; outra = 409 | `TransicaoInvalidaError` (409) | `instituicao.spec.ts:96–163`, it.each em `aprovar…spec.ts:119`, `rejeitar…spec.ts:167`, `suspender…spec.ts:52`, `reativar…spec.ts:52`, `inativar…spec.ts:71` | ✅ (409 vem da classe sem parâmetro; o e2e do filtro cobre `transicao-invalida` → 409) |
| AC6 inativar sem excluir nem tocar campanhas | registro mantido | `inativar-instituicao.spec.ts:62` `items).toHaveLength(1)`, `:67–68` | ✅ (campanhas: garantido por construção, o caso de uso não depende de campanha) |
| AC7 acesso ao documento | 403 a terceiros | infra (T25/T26) | fora do domínio |
| AC8 não-admin | 403, sem mudar estado | `aprovar…spec.ts:65–74` (status, auditoria e e-mail inalterados), `rejeitar…spec.ts:68–76`; suspender, reativar e inativar só conferem a classe (`suspender…spec.ts:90`) | ✅ (minor: "sem alterar" só é conferido em aprovar e rejeitar) |
| AC9 auditoria | **autor**, estado anterior, estado novo, motivo, **data-hora** | `aprovar…spec.ts:103` / `rejeitar…spec.ts:149` / `suspender…spec.ts:44` `dados).toEqual(objectContaining({estadoAnterior, estadoNovo[, motivo]}))` | ❌ **GAP** (regra de conjunção): nenhum teste confere `usuarioId` nem `criadoEm`. Mutante #16 (autor errado) sobreviveu |
| AC10 decisões concorrentes | só a primeira vale, a segunda leva 409 | `aprovar…spec.ts:192–208` e `rejeitar…spec.ts:223–243` com spy `salvarTransicao → false` | ⚠️ **GAP parcial**: o mapeamento `false → TransicaoInvalidaError` está provado. O CAS do double nunca é exercitado (mutante #3 sobreviveu) |
| Edge: documento ilegível | 503, estado inalterado | `aprovar…spec.ts:157–159` `status).toBe(503)`, `:166` status PENDENTE | ✅ (a mensagem difere do design, ver T1) |

### P1: Manutenção de causas pelo administrador

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 criar | `ATIVA` (201 é infra) | `criar-causa.spec.ts:42` `status).toBe(CausaStatus.ATIVA)`, `causa.spec.ts:18` | ✅ |
| AC2 nome existente | 409 `Causa já cadastrada`; o design define igualdade sem caixa e acento | `criar-causa.spec.ts:85` `toBeInstanceOf(CausaJaExisteError)` (nome idêntico, sem acento), `editar-causa.spec.ts:83–87` | ❌ **GAP**: a variante caixa/acento não tem teste e o double falha até com nome exato acentuado. Mensagem e 409 não são conferidos. ⚠️ spec-precision: a spec não define a igualdade, só o design |
| AC3 inativar sem excluir | `INATIVA`, registro mantido | `inativar-causa.spec.ts:185–186` | ✅ |
| AC4 com instituições aprovadas | 409 + lista das instituições | `inativar-causa.spec.ts:86–87`, `:121–123` `message).toContain('Instituição Alegria')`, `:90` estado ATIVA | ✅ (minor: o campo `instituicoes` e o 409 não são conferidos) ⚠️ spec-precision: formato da lista indefinido |
| AC5 causa INATIVA oculta | fora das listas e do autocadastro | `listar-causas-ativas.spec.ts:44`, `listar-beneficiadas.spec.ts:101`, `criar-instituicao.spec.ts:250` | ✅ |
| AC6 não-admin | 403, sem alterar dado | `criar-causa.spec.ts:66`, `editar-causa.spec.ts:64`, `inativar-causa.spec.ts:48` | ✅ (minor: "sem alterar" não é conferido) |
| AC7 auditoria | **autor e data-hora** em criação, edição e inativação | `criar-causa.spec.ts:49` (`tipo`), `editar-causa.spec.ts:44` (`entidadeId`), `inativar-causa.spec.ts:191–192` | ❌ **GAP**: autor e data-hora nunca são conferidos (mutante #26 sobreviveu). O snapshot "antes" da edição está corrompido (`editar-causa.ts:59`) |

### P1: Seleção da beneficiada pela empresa

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 só APROVADA + ATIVA, ordem alfabética | lista mista ordenada | `listar-beneficiadas.spec.ts:55`, `:112–117` `toEqual(['Ação Verde','Animais','Casa Esperança','Saúde'])` | ✅ |
| AC2 busca ≥ 2, parcial, sem acento/caixa | filtra a partir de 2 caracteres | `listar-beneficiadas.spec.ts:127` ("FUNDACAO"), `:136` ("educ"), `:147` (1 caractere ignorado) | ⚠️ **GAP**: o limite exato de 2 caracteres não é testado (mutante #9 sobreviveu) |
| AC3 exatamente uma referência | 422 para duas ou nenhuma | `assegurar…spec.ts:59–60` `toBeInstanceOf(BeneficiadaAmbiguaError)` + `status).toBe(422)`, `:68` | ✅ |
| AC4 inexistente/não aprovada/inativa | 422 `Instituição ou causa indisponível` | `assegurar…spec.ts:109–110` (classe + 422), `:115`, `:124`, `:135` | ✅ (o texto vem do construtor sem parâmetro em `errors/beneficiada-indisponivel.error.ts:10` e bate com a spec; nenhum teste confere a string) |
| AC5 só campos públicos | nome, causa, cidade, UF, descrição, site, logo | `listar-beneficiadas.spec.ts:55` `toEqual` com objeto exato, `:168–170` `not.toContain(cnpj/documento/telefone)` | ✅ (mutante #14 morto) |
| AC6 catálogo vazio | domínio devolve `[]` (mensagem é do web) | `listar-beneficiadas.spec.ts:46` `toEqual([])` | ✅ |

**Status**: ❌ Lacunas em 5 ACs (P1-Aprovação AC1, AC9, AC10; P1-Causas AC2, AC7) + 1 lacuna de limite (P1-Seleção AC2). ⚠️ 5 spec-precision gaps sinalizados (P1-Autocadastro AC8, P1-Aprovação AC1 e AC9, P1-Causas AC2 e AC4).

**Fora do escopo da rodada (P2)**: INST-11, INST-12, INST-13 (área logada, reenvio via UI, notas internas). `reenviarParaAnalise` existe e tem teste de entidade (`instituicao.spec.ts:85`), sem caso de uso, como previsto.

---

## Edge Cases (recorte P1 do domínio)

- [x] Documento ilegível na aprovação → 503 sem mudar estado: `aprovar-instituicao.spec.ts:146–169`.
- [x] Empresa e instituição com o mesmo CNPJ são aceitas e a coincidência é sinalizada: aceite por construção (`criar-instituicao.ts:120–131` só consulta CNPJ entre instituições), sinal em `listar-fila-instituicoes.spec.ts:140–192`. Minor: não há teste explícito de cadastro aceito quando uma empresa já tem o CNPJ.
- [x] Busca sem resultado devolve lista vazia: `listar-beneficiadas.spec.ts:152–159` (a orientação de texto é do web).
- [x] Suspensão ou inativação não tocam campanhas aprovadas: por construção (casos de uso sem dependência de campanha).
- [ ] CNPJ simultâneo → índice único: infra (T21/T23).
- [ ] Beneficiada suspensa durante a análise de campanha → feature `campanhas` (guarda entregue sem chamador, conforme o design).
- [ ] Escape de HTML → web.
- [ ] Dois admins editando a mesma instituição → edição de instituição é P2.

---

## Discrimination Sensor

**Profundidade**: P0 (máquina de estados, CAS, guardas de integridade). Execução em `git worktree` descartável com `node_modules` linkado. Baseline `git status --porcelain` da árvore real = vazio, e continuou idêntico depois do `git worktree remove --force` (diff vazio). Cada mutante foi aplicado e revertido sozinho, rodando `npx jest` só nos specs afetados. Linhas referem-se a `891cdd5`.

| # | File:line | Mutação | Resultado |
| - | --------- | ------- | --------- |
| 1 | `use-cases/aprovar-instituicao.ts:68` | resultado de `salvarTransicao` ignorado | ✅ Killed |
| 2 | `use-cases/inativar-instituicao.ts:50` | resultado de `salvarTransicao` ignorado | ✅ Killed |
| 3 | `test/repositories/in-memory-instituicao-repository.ts:136` | double ignora `estadoEsperado` (CAS desligado) | ❌ **Survived** (290/290 em `src/domain`) |
| 4 | `use-cases/aprovar-instituicao.ts:52` | checagem `estaLegivel` removida | ✅ Killed |
| 5 | `entities/instituicao.ts:180` | motivo `< 20` → `<= 20` | ✅ Killed |
| 6 | `entities/instituicao.ts:239` | `estaDisponivelParaSelecao` true para SUSPENSA | ✅ Killed |
| 7 | `use-cases/assegurar-beneficiada-disponivel.ts:29` | XOR: `instituicaoId && !causaId` → `instituicaoId` | ✅ Killed |
| 8 | `use-cases/listar-beneficiadas.ts:23` | remoção de diacríticos retirada da normalização | ✅ Killed |
| 9 | `use-cases/listar-beneficiadas.ts:75` | termo `>= 2` → `> 2` | ❌ **Survived** |
| 10 | `use-cases/inativar-causa.ts:54` | `CausaComInstituicoesAprovadasError` nunca levantado | ✅ Killed |
| 11 | `test/repositories/in-memory-instituicao-repository.ts:86` | filtro `APROVADA` removido em `listarAprovadasPorCausa` | ✅ Killed |
| 12 | `use-cases/listar-fila-instituicoes.ts:46` | fila `'asc'` → `'desc'` | ✅ Killed |
| 13 | `use-cases/listar-beneficiadas.ts:81` | ordenação alfabética removida | ✅ Killed |
| 14 | `use-cases/listar-beneficiadas.ts:55` | read model vaza campo extra (`email`) | ✅ Killed |
| 15 | `use-cases/suspender-instituicao.ts:54` | auditoria removida | ✅ Killed |
| 16 | `use-cases/aprovar-instituicao.ts:76` | auditoria grava autor errado (`instituicao.id`) | ❌ **Survived** |
| 17 | `entities/documento-validacao.ts:26` | descrição `> 200` → `>= 200` | ✅ Killed |
| 18 | `entities/causa.ts:63` | nome `> 80` → `> 81` | ❌ **Survived** |
| 19 | `entities/causa.ts:67` | `nome.trim() === ''` → `nome === ''` (só espaços aceito) | ❌ **Survived** |
| 20 | `entities/causa.ts:92` | `editar` deixa de recusar causa INATIVA | ❌ **Survived** |
| 21 | `use-cases/criar-instituicao.ts:165` | escrita fora do `unitOfWork` | ✅ Killed |
| 22 | `use-cases/criar-instituicao.ts:170` | falha de e-mail derruba o cadastro | ✅ Killed |
| 23 | `use-cases/criar-instituicao.ts:115` | causa INATIVA aceita | ✅ Killed |
| 24 | `use-cases/rejeitar-instituicao.ts:86` | e-mail de rejeição sem `dados.motivo` | ✅ Killed |
| 25 | `use-cases/editar-causa.ts:54` | colisão de nome na edição ignorada | ✅ Killed |
| 26 | `use-cases/criar-causa.ts:62` | auditoria de causa grava autor errado | ❌ **Survived** |
| 27 | `use-cases/listar-fila-instituicoes.ts:71` | sinal de CNPJ coincidente removido | ✅ Killed |
| 28 | `entities/arquivo.ts:55` | limite do documento 10 MB − 1 byte | ✅ Killed |

**Resultado**: 21/28 mortos, **7 sobreviventes** → ❌ FAIL.

Sondas extras no scratch (não são mutantes, confirmam defeitos):
- `InMemoryCausaRepository.findByNome('Educação')` com "Educação" gravada → `null`. `CriarCausaUseCase` cria a duplicata.
- `EditarCausaUseCase`: `dados.causa_antiga` é `Right { value: { _props: { _props: { nome: 'Novo' … } } } }`, ou seja, o estado anterior já sai com o nome novo.

---

## Code Quality

| Princípio | Status | Nota |
| --------- | ------ | ---- |
| Rich domain model (AD-017): regra em entidade/VO, sem setter público | ✅ | `Instituicao`, `Causa` e `DocumentoValidacao` só expõem getters e métodos com `Either`. Ressalva pré-existente: `ValueObject.props` é getter público e mutável (`src/core/types/entities/value-object.ts:20`) |
| Caso de uso = carregar → método → persistir | ⚠️ | Seguido em todas as decisões. Exceção: `editar-causa.ts:59` faz snapshot com `Causa.create(causa, …)`, que quebra |
| Regras de camada (ESLint) | ✅ | Nenhuma violação de `no-restricted-imports` |
| Código mínimo / sem abstração ociosa | ⚠️ | `InstituicaoRepository.buscarDisponiveis` (`instituicao-repository.ts:25`) não tem chamador: `ListarBeneficiadas` filtra em memória sobre `listarPorEstado`. A porta obriga a infra a implementar um método morto, e a coluna `nome_busca` de instituição (design, T21/T23) perde a razão de existir |
| Contratos de porta coerentes | ❌ | `CausaRepository.create(props: CausaProps)` recebe `Causa` na prática (`causa-repository.ts:7`) |
| Doubles fiéis ao contrato | ❌ | `findByNome` e `buscarDisponiveis` não normalizam. `findByCnpj`, `findByUsuarioId`, `buscarDisponiveis` e `create` devolvem ou guardam a referência viva, sem cópia (`in-memory-instituicao-repository.ts:55,62,108,112`) |
| Mudanças cirúrgicas / sem scope creep | ✅ | Diff restrito ao catálogo. `listarAprovadasPorCausa` ganhou `ordem` (desvio inofensivo) |
| Segue padrões existentes | ✅ | Espelha `aprovar-empresa`, `criar-empresa`, `in-memory-empresa-repository` |
| Spec-anchored outcome check | ❌ | Ver lacunas: AC9/AC7 de auditoria, AC1 da fila, AC2 de causas |
| Cobertura por camada (domínio 1:1 com ACs, todos os ramos) | ❌ | `Causa.editar`, nome só de espaços, `EditarCausa` (inexistente/INATIVA), limite de 2 na busca sem teste efetivo |
| Todo teste mapeia para AC / edge / Done-when | ✅ | Nenhum teste órfão encontrado. Cosmético: `describe('Casa Entity')` em `causa.spec.ts:5` |
| Guidelines documentadas | ✅ | Nenhuma no projeto (`AGENTS.md`/`CONTRIBUTING.md` ausentes); strong defaults de `tasks.md` aplicados |

---

## Fix Plans

> Tasks de correção no formato de `tasks.md`, numeradas T35…T48, para inserir antes do gate de handoff. Dono segundo AD-020: `src/domain/**`, `src/core/**`, `test/repositories/**`, `test/factories/**` → 👤 humano; o resto → 🤖 agente.

### Blocker

#### T35: Quebra de linha final nos arquivos do catálogo 👤

- **What**: Acrescentar a quebra de linha final que o prettier exige.
- **Where**: `src/domain/fivo/application/errors/beneficiada-ambigua.error.ts`, `src/domain/fivo/application/use-cases/{assegurar-beneficiada-disponivel,listar-beneficiadas}{,.spec}.ts`
- **Owner**: 👤 humano
- **Done when**: `npx eslint "{src,test}/**/*.ts"` sai com 0
- **Tests**: none
- **Gate**: quick
- **Commit**: `style(api): adiciona quebra de linha final nos arquivos do catálogo`

#### T36: Status esperado de `InstituicaoAlreadyExistsError` no e2e do filtro 🤖

- **What**: Trocar `'instituicao-ja-existe': 422` por `409` em `STATUS_ESPERADO`, alinhando o teste à spec (P1-Autocadastro AC3) e à T1. Isso é alinhamento à spec, não enfraquecimento: o valor novo é o que a spec define.
- **Where**: `test/http/domain-exception-filter.e2e-spec.ts:68`
- **Owner**: 🤖 agente
- **Done when**: o e2e do filtro passa e a suíte e2e fica 205/205
- **Tests**: e2e (o próprio)
- **Gate**: full
- **Commit**: `test(api): alinha status de InstituicaoAlreadyExistsError a 409 no e2e do filtro`

### Major

#### T37: Busca de causa por nome sem caixa e sem acento no double 👤

- **What**: `InMemoryCausaRepository.findByNome` deve normalizar os dois lados (`normalize('NFD')`, remover `[̀-ͯ]`, `toLowerCase()`). Documentar em JSDoc na porta que `findByNome` ignora caixa e acento. Cobrir no caso de uso.
- **Where**: `test/repositories/in-memory-causa-repository.ts:25–27`, `src/domain/fivo/application/ports/database/causa-repository.ts:5`, `src/domain/fivo/application/use-cases/criar-causa.spec.ts`, `editar-causa.spec.ts`
- **Owner**: 👤 humano
- **Done when**: criar "educacao" com "Educação" existente → `CausaJaExisteError`; criar "Educação" com "Educação" existente → idem; renomear para "SAÚDE" com outra causa "Saude" → `CausaJaExisteError`; os testes conferem `status` 409 e a mensagem `Causa já cadastrada`
- **Tests**: unit
- **Gate**: quick
- **Commit**: `fix(api): unicidade de causa ignora caixa e acento no double em memória`

#### T38: Contrato de `CausaRepository.create` recebe a entidade 👤

- **What**: Trocar `create(props: CausaProps)` por `create(causa: Causa)` para que o adaptador Prisma (T22) receba o `id`.
- **Where**: `src/domain/fivo/application/ports/database/causa-repository.ts:7`
- **Owner**: 👤 humano
- **Done when**: a porta declara `create(causa: Causa)`; `tsc` e unit verdes
- **Tests**: none (build gate)
- **Gate**: quick
- **Commit**: `fix(api): CausaRepository.create recebe a entidade Causa`

#### T39: Fila de instituições mostra o nome da causa 👤

- **What**: Injetar `CausaRepository` em `ListarFilaInstituicoesUseCase` e devolver o nome da causa. Renomear `documentArquivoId` → `documentoArquivoId`. Tornar `cnpjCoincideComEmpresa` um `boolean`, conforme a Done-when da T14.
- **Where**: `src/domain/fivo/application/use-cases/listar-fila-instituicoes.ts:10–21,66–71`, `listar-fila-instituicoes.spec.ts`
- **Owner**: 👤 humano
- **Done when**: o teste confere `causa: 'Meio Ambiente'` (nome de uma causa criada no teste), `documentoArquivoId` e `cnpjCoincideComEmpresa: true/false`
- **Tests**: unit
- **Gate**: quick
- **Commit**: `fix(api): fila de instituições exibe o nome da causa`

#### T40: Asserção de autor e data-hora em toda auditoria 👤

- **What**: Em todo teste de sucesso que grava auditoria, conferir `usuarioId === admin.id.toString()`, `entidadeId` e `criadoEm` como `Date`.
- **Where**: `src/domain/fivo/application/use-cases/{aprovar,rejeitar,suspender,reativar,inativar}-instituicao.spec.ts`, `{criar,editar,inativar}-causa.spec.ts`
- **Owner**: 👤 humano
- **Done when**: os mutantes #16 (`aprovar-instituicao.ts:76`) e #26 (`criar-causa.ts:62`) são mortos
- **Tests**: unit
- **Gate**: quick
- **Commit**: `test(api): confere autor e data-hora nos registros de auditoria do catálogo`

#### T41: Snapshot correto do estado anterior na edição de causa 👤

- **What**: Antes de `causa.editar`, capturar `{ nome: causa.nome, descricao: causa.descricao }` em objeto simples. Gravar `dados: { antes, depois }` sem passar entidades nem `Either`.
- **Where**: `src/domain/fivo/application/use-cases/editar-causa.ts:59,77`, `editar-causa.spec.ts`
- **Owner**: 👤 humano
- **Done when**: o teste confere `dados.antes.nome === 'Causa Teste'` e `dados.depois.nome === 'Novo Nome'`
- **Tests**: unit
- **Gate**: quick
- **Commit**: `fix(api): auditoria da edição de causa registra o estado anterior`

#### T42: Decisão concorrente exercitada contra o CAS do double 👤

- **What**: Teste que dispara `aprovar` e `rejeitar` na mesma instituição pendente com `Promise.all`, sem spy, usando o `InMemoryInstituicaoRepository` real.
- **Where**: `src/domain/fivo/application/use-cases/aprovar-instituicao.spec.ts` (ou `rejeitar-instituicao.spec.ts`)
- **Owner**: 👤 humano
- **Done when**: exatamente um resultado `right` e um `TransicaoInvalidaError`; o estado final é o do vencedor; há 1 linha de auditoria; o mutante #3 (`in-memory-instituicao-repository.ts:136`) é morto
- **Tests**: unit
- **Gate**: quick
- **Commit**: `test(api): decisão concorrente de instituição aplica só a primeira`

#### T43: Testes efetivos da entidade `Causa` e de `EditarCausa` 👤

- **What**: Em `causa.spec.ts`, tirar o `expect` de dentro de `if (isLeft())` e conferir `isLeft()` de forma incondicional (linhas 46 e 83). Acrescentar: nome só de espaços → `NomeCausaInvalidoError`; `editar` feliz; `editar` com nome inválido; `editar` em causa INATIVA → `TransicaoInvalidaError`. Em `editar-causa.spec.ts`, acrescentar causa inexistente → `ResourceNotFoundError` e causa INATIVA → `TransicaoInvalidaError`.
- **Where**: `src/domain/fivo/entities/causa.spec.ts`, `src/domain/fivo/application/use-cases/editar-causa.spec.ts`
- **Owner**: 👤 humano
- **Done when**: os mutantes #18 (`causa.ts:63`), #19 (`causa.ts:67`) e #20 (`causa.ts:92`) são mortos; todos os ramos da Done-when da T10 têm teste
- **Tests**: unit
- **Gate**: quick
- **Commit**: `test(api): cobre limites e edição da entidade Causa`

### Minor

#### T44: Limite de 2 caracteres na busca de beneficiadas 👤

- **What**: Teste com termo de exatamente 2 caracteres (por exemplo `'es'`) que precisa filtrar.
- **Where**: `src/domain/fivo/application/use-cases/listar-beneficiadas.spec.ts`
- **Owner**: 👤 humano
- **Done when**: o mutante #9 (`listar-beneficiadas.ts:75`) é morto
- **Tests**: unit
- **Gate**: quick
- **Commit**: `test(api): busca de beneficiadas filtra a partir de 2 caracteres`

#### T45: Mensagem de `DocumentoIndisponivelError` conforme o design 👤

- **What**: Usar `Documento temporariamente indisponível` e conferir a mensagem no teste de aprovação.
- **Where**: `src/domain/fivo/application/errors/documento-indisponivel.error.ts:7`, `aprovar-instituicao.spec.ts:157–159`
- **Owner**: 👤 humano
- **Done when**: o texto bate com a tabela de erros do design e o teste confere a string
- **Tests**: unit
- **Gate**: quick
- **Commit**: `fix(api): mensagem de documento indisponível conforme o design`

#### T46 + T47: Remover `buscarDisponiveis` sem chamador 👤 + ajuste do design 🤖 (T47)

- **What**: Retirar `buscarDisponiveis` da porta e do double (a busca vive em `ListarBeneficiadasUseCase`). O agente atualiza depois o design e a T21/T23 para dispensar a coluna `nome_busca` de instituição (a de causa continua, pelo índice único).
- **Where**: `src/domain/fivo/application/ports/database/instituicao-repository.ts:25`, `test/repositories/in-memory-instituicao-repository.ts:99–109` (👤); `.specs/features/catalogo-instituicoes/{design,tasks}.md` (🤖)
- **Owner**: 👤 humano (código) / 🤖 agente (specs)
- **Done when**: a porta não tem método sem chamador; o design não pede coluna sem uso
- **Tests**: none (build gate)
- **Gate**: quick
- **Commit**: `refactor(api): remove buscarDisponiveis sem chamador da porta de instituição`

#### T48: Asserções de mensagem e campo nos erros do catálogo 👤

- **What**: Conferir `message` e `status` onde a spec define texto: `BeneficiadaIndisponivelError` (`Instituição ou causa indisponível`), `CausaComInstituicoesAprovadasError.instituicoes` (array com os nomes) + 409. Conferir "sem escrita" nos ramos não-admin de suspender, reativar, inativar e criar causa.
- **Where**: `assegurar-beneficiada-disponivel.spec.ts`, `inativar-causa.spec.ts`, `criar-causa.spec.ts`, `{suspender,reativar,inativar}-instituicao.spec.ts`
- **Owner**: 👤 humano
- **Done when**: cada AC com texto definido na spec tem a string conferida em teste
- **Tests**: unit
- **Gate**: quick
- **Commit**: `test(api): confere mensagens e ausência de escrita nos erros do catálogo`

---

## Requirement Traceability Update

`spec.md` não foi editado (o Verifier só escreve este relatório). Status proposto:

| Requirement | Status anterior | Status proposto (domínio) |
| ----------- | --------------- | ------------------------- |
| INST-01 | In Tasks | ✅ Domínio verificado (aguarda infra) |
| INST-02 | In Tasks | ✅ Domínio verificado (aguarda infra) |
| INST-03 | In Tasks | ✅ Domínio verificado (aguarda infra) |
| INST-04 | In Tasks | ❌ Needs Fix (T39) |
| INST-05 | In Tasks | ❌ Needs Fix (T40, T42) |
| INST-06 | In Tasks | ✅ Domínio (edge 503) / infra pendente |
| INST-07 | In Tasks | ❌ Needs Fix (T37, T38, T40, T41, T43) |
| INST-08 | In Tasks | ⚠️ Needs Fix Minor (T44) |
| INST-09 | In Tasks | ✅ Domínio verificado |
| INST-10 | In Tasks | ✅ Domínio verificado |
| INST-11…13 | Deferred | fora do escopo da rodada (P2) |

---

## Summary

**Overall**: ❌ Not Ready. O gate de handoff para a Fase 6 continua fechado.

**Spec-anchored check**: 34 critérios P1 de domínio avaliados (ACs + edge do 503); 28 batem com a saída da spec; 6 com lacuna (P1-Aprovação AC1, AC9, AC10; P1-Causas AC2, AC7; P1-Seleção AC2). 5 spec-precision gaps sinalizados.
**Sensor**: 21/28 mortos (sobreviventes #3, #9, #16, #18, #19, #20, #26).
**Gate**: build 0 · tsc 0 · eslint ❌ (5) · unit 316/316 · e2e 204/205 ❌.

**O que funciona**: máquina de estados da `Instituicao` completa e bem testada; autocadastro com ordem de validação, transação, hash e e-mail best-effort provados; catálogo de beneficiadas com read model fechado e busca sem acento; guarda XOR; limites de arquivo por tipo.

**Próximos passos**: o grupo fecha T35 e T37–T45 (Blocker + Major primeiro); o agente fecha T36 e a parte de specs da T46/T47; depois roda nova verificação (iteração 2 de 3).
