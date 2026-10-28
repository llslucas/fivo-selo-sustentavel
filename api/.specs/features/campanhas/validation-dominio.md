**Verdict**: PASS

# Campanhas — Validação do domínio, rodada 3 (gate de handoff AD-021)

**Veredito**: ✅ **PASS**. As três tasks da rodada 2 (T51–T53) cumprem a Done-when, e os quatro sobreviventes (N8, N14, N23, N24) morreram no sensor desta rodada. Os 46 critérios P1 de domínio batem com a saída da spec. O gate `quick` está verde (tsc 0, eslint 0, unit 600/600), e nenhum teste foi apagado ou enfraquecido. Dos 13 mutantes novos, 12 morreram e 1 é equivalente no domínio (P13). **A Fase 7 (T28–T40) está liberada.** Os follow-ups não bloqueantes ficam na seção própria, com a task de destino.

**Data**: 2026-10-27
**Spec**: `.specs/features/campanhas/spec.md`
**Diff range**: correção `f0d6fd3..dad822e` (4 commits: `dd30184` docs, `eaf4639` T51, `420b01b` T52, `dad822e` T53; 4 specs + `tasks.md`, +211/−5). Nenhum arquivo de `src/` ou `test/` fora de `*.spec.ts` mudou. Domínio total `397f8bc..dad822e`.
**Verifier**: sub-agente independente (autor ≠ verificador), somente leitura sobre `src/` e `test/`. Escreve só este arquivo.
**Rodada**: 3 de 3. Escopo: P1 do `api` (CAMP-01…08, CAMP-11 → T1–T27 + T41–T53). CAMP-09, CAMP-10 e `web` ficam fora. Sem UAT (backend). Gate e2e não rodado (a infra ainda não existe).

Caminhos abreviados: `E/` = `src/domain/fivo/entities/`, `U/` = `src/domain/fivo/application/use-cases/`, `ER/` = `src/domain/fivo/application/errors/`.

---

## Histórico

| Rodada | Diff | Verdict | Resumo |
| ------ | ---- | ------- | ------ |
| 1 | `397f8bc..d756ffa` | ❌ FAIL | Gate verde (566 unit). 46 ACs: 33 ✅, 13 com lacuna. Sensor: 44 mutantes, 31 mortos, 12 sobreviventes (M8, M13, M22–M27, M37–M39, M42), 1 equivalente (M30). Bloqueador: a alteração decidida sumia do agregado antes do `salvar`. Abriu T41–T50 (Fase 6b) |
| 2 | `c51d6dc..3c03bb3` | ❌ FAIL | Gate verde (595 unit). 43/46 ✅. Sensor: 38 injetados (12 reexecutados + 26 novos), 33 mortos, 4 sobreviventes (N8, N14, N23, N24), 1 equivalente (N6). Contrato da T46 ok. Abriu T51–T53 |
| 3 | `f0d6fd3..dad822e` | ✅ PASS | Este relatório. 46/46 ✅. Sensor: 17 injetados (4 reexecutados + 13 novos), 16 mortos, 0 sobreviventes, 1 equivalente (P13) |

---

## Gate Check

- **Gate command** (`tasks.md`, Quick): `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest`, rodado na árvore real com a saída de cada etapa em arquivo no scratchpad.

| Etapa | Exit | Resultado |
| ----- | ---- | --------- |
| `tsc --noEmit` | 0 | ok |
| `eslint` | 0 | nenhum erro, nenhum aviso |
| `jest` (unit) | 0 | 63 suites, **600/600**, 0 skip |

- **Contagem de testes**: 335 antes da feature (`397f8bc`) → 566 (r1) → 595 (r2) → **600** agora. Os +5 são T51 (2), T52 (2 na entidade, 1 no caso de uso) e T53 (nenhum teste novo, só asserções mais fortes).
- **Integridade** (`git diff f0d6fd3..HEAD -- '*.spec.ts'`): nenhum arquivo apagado e nenhum `it(` removido. As 4 linhas removidas são `toBeInstanceOf(Date)` trocadas por `toEqual(<relógio fixado>)`: `U/aprovar-campanha.spec.ts:109` e `:121`, `E/campanha.spec.ts:323` e `:339`. Todas ficaram mais fortes.

---

## Task Completion

T1–T27 e T41–T50: sem mudança desde a rodada 2 (o código de produção não mudou). T51–T53 conferidas no código, item a item.

| Task | Status | Evidência |
| ---- | ------ | --------- |
| T51 `paraDecimal` com zero à esquerda | ✅ | `U/consultar-campanha-da-empresa.spec.ts:158-178` (regra `'0.05'` → `regraDoacao).toEqual({ tipo: POR_UNIDADE, valor: '0.05' })` em `:173-176`; meta `'1.05'` → `meta).toBe('1.05')` em `:177`); `:180-198` (percentual `'0.01'` → `percentual: '0.01'` em `:194-197`). N8 e P1 mortos |
| T52 Fim vencido herdado | ✅ | Entidade: `E/campanha.spec.ts:549-596`. Vigência aprovada `2026-10-01..2026-10-21` com `hoje = 2026-10-21`; edição só da regra → `VigenciaVencidaError` (`:575`), sem pendência (`:576`) e com `compromissoVigente()` intacto (`:577`). Vigência nova com fim amanhã → alteração aberta (`:580-595`). Caso de uso: `U/editar-campanha.spec.ts:402-433`, fake timers em `virada` (`2027-01-01T02:00Z`, ou seja, 31/12 em SP), fim aprovado `2026-12-31`, edição só da regra → `VigenciaVencidaError` (`:428`), sem pendência, compromisso intacto (`:431`) e `expectNadaGravado` (`:432`). N14 e P3 mortos |
| T53 Data-hora da aprovação | ✅ | `E/campanha.spec.ts:311-324` (`jest.useFakeTimers({ now: agoraDecisao })` + `decididoEm).toEqual(agoraDecisao)` em `:323`); o mesmo em rejeitar (`:326-341`, `:339`). `U/aprovar-campanha.spec.ts:98-122` (`decididoEm).toEqual(agora)` em `:109`, `registro.criadoEm).toEqual(agora)` em `:121`). Varredura: ver abaixo. N23, N24 e P4 mortos |

### Julgamento: `createdAt` e `submetidaEm` com `toBeInstanceOf(Date)` em `E/campanha.spec.ts`

Sobraram duas asserções fracas na varredura da T53: `E/campanha.spec.ts:113` (`createdAt`) e `:286` (`submetidaEm`). **O autor está certo, e isso não é lacuna.**

- A Done-when da T53 restringe a varredura a "data-hora de **decisão** ou **auditoria**". `createdAt` é a criação e `submetidaEm` é a submissão. Nenhuma das duas é decisão ou registro de auditoria.
- A spec exige o valor exato da submissão (Submissão AC1, "registrar a data-hora da submissão"), e esse valor já é conferido no caso de uso: `U/submeter-campanha.spec.ts:129` `salva.submetidaEm).toEqual(agora)`. A criação aparece no read model, conferida em `U/editar-campanha.spec.ts:173-213` (`criadaEm: agora`) e em `U/consultar-campanha-da-empresa.spec.ts:84-133`.
- O sensor confirma: **P9** (`submetidaEm = new Date(0)`) morreu em `submeter-campanha.spec`, e **P10** (`createdAt` padrão `new Date(0)`) morreu em `editar-campanha.spec`. A discriminação existe, só que na camada do caso de uso. Apertar a asserção na entidade seria redundante.

---

## Spec-Anchored Acceptance Criteria

Legenda: ✅ evidência no valor da spec; ⚠️ spec-precision gap (não bloqueia); **infra — T28+** = AC só de HTTP, persistência ou OpenAPI (não conta como lacuna). "r1"/"r2" indicam o resultado da rodada correspondente quando ele mudou. As linhas de `E/campanha.spec.ts`, `U/editar-campanha.spec.ts`, `U/aprovar-campanha.spec.ts` e `U/consultar-campanha-da-empresa.spec.ts` foram atualizadas para `dad822e`.

### P1: Criação da campanha (CAMP-01…04)

| AC | Spec-defined outcome | `file:line` + asserção | Result |
| -- | -------------------- | ---------------------- | ------ |
| AC1 empresa não aprovada | 403 "Cadastro ainda não aprovado", nada gravado, em criar, editar e submeter | `U/criar-campanha.spec.ts:121-137` (`message).toBe('Cadastro ainda não aprovado')` + `items).toHaveLength(0)`); `U/submeter-campanha.spec.ts:162-184`; `U/editar-campanha.spec.ts:126-144` (`NotAllowedError`, nome e versão intactos, auditoria vazia). 403 = mapeamento (infra) | ✅ |
| AC2 cria `RASCUNHO` | estado `RASCUNHO`; id interno + id público | `E/campanha.spec.ts:99-115` `status).toBe(RASCUNHO)`; `U/criar-campanha.spec.ts:79-95` `idPublico).not.toBe(id)` | ✅ |
| AC3 nome 3–80 com trim | 422 "O nome deve ter entre 3 e 80 caracteres" | `E/nome-campanha.spec.ts:15-48` | ✅ |
| AC4 descrição ≤ 2000 | 422 "A descrição deve ter no máximo 2000 caracteres" | `E/descricao-campanha.spec.ts:5-33` | ✅ |
| AC5 valor por unidade | 0,01–999.999,99, ≤ 2 casas, senão 422 | `E/valor-monetario.spec.ts:5-49` | ✅ / ⚠️ SP1 |
| AC6 percentual | 0,01–100,00, ≤ 2 casas, senão 422 | `E/percentual.spec.ts:5-38` | ✅ / ⚠️ SP1 |
| AC7 valor do outro tipo | 422 "O Valor da regra deve corresponder à regra selecionada." | `E/regra-doacao.spec.ts:37-42` e `:55-60` `status).toBe(422)` + `message).toBe('O Valor da regra deve corresponder à regra selecionada.')` | ✅ (r1 ❌) |
| AC8 meta | mesmos limites do valor, 422 | `U/criar-campanha.spec.ts:155-161`; limites pelo VO de AC5 | ✅ / ⚠️ SP1 |
| AC9 instituição e causa juntas | 422 "Informe exatamente uma beneficiada: instituição ou causa" | `E/beneficiada.spec.ts:27-53`; `U/criar-campanha.spec.ts:266-280` (nada gravado) | ✅ |
| AC10 beneficiada indisponível | 422 "Instituição ou causa indisponível" | `U/criar-campanha.spec.ts:224-250`; mensagem em `U/assegurar-beneficiada-disponivel.spec.ts:111,123,136,147` | ✅ |
| AC11 fim ≤ início | 422 para fim anterior **ou** igual | Igual: `E/vigencia.spec.ts:12-19`, `U/criar-campanha.spec.ts:201-209`. Anterior: `E/vigencia.spec.ts:21-33` (`status).toBe(422)` + mensagem), `U/criar-campanha.spec.ts:211-222` (nada gravado) | ✅ (r1 ❌) / ⚠️ SP1 |
| AC12 início no passado | aceito | `E/vigencia.spec.ts:48-51` (`2020-01-01`) | ✅ |
| AC13 capa PNG/JPEG ≤ 5 MB | 422 nos demais | Domínio: `E/arquivo.spec.ts:331-386` (PNG/JPEG aceitos; SVG/PDF → 422 com mensagem; 5 MB aceito; 5 MB + 1 → 422). Multer e sniff: infra — T31, T34 | ✅ (r1 ❌) |
| AC14 storage fora | 503 "Storage indisponível no momento." | — | infra — T34 |
| AC15 rascunho edita todos os campos | todos os campos editáveis pela dona | `E/campanha.spec.ts:116-167` (7 campos na entidade); `U/editar-campanha.spec.ts:173-213` (6 campos) + `:504-535` (`depois.capaArquivoId?.toString()).toBe(novaCapa)` em `:528`) | ✅ (r1 ❌) |
| AC16 id público imutável, distinto, não sequencial | `idPublico ≠ id`, UUID v4, igual depois de toda operação | `E/campanha.spec.ts:99-115` (`:110-111`); sem setter `:814`; igualdade depois das operações em `:487`, `:517`, `:654`, `:675` | ✅ |
| AC17 consulta da dona | todos os campos, estado, motivo, pendência | `U/consultar-campanha-da-empresa.spec.ts:84-133` (`toEqual` completo com motivo, `criadaEm`, `atualizadaEm`), `:225-264` (pendência com propostos e `abertaEm`), **`:158-198` (fração com zero à esquerda: `'0.05'`, `'1.05'`, `'0.01'`)**; `U/editar-campanha.spec.ts:558-583` (`toStrictEqual` com a consulta). N8 e P1 mortos | ✅ (r2 ✅ com N8 vivo) |
| AC18 campanha de outra empresa | 404 sem revelar | `U/consultar-campanha-da-empresa.spec.ts:284-310`; `U/editar-campanha.spec.ts:146-158`; `U/submeter-campanha.spec.ts:186-199` | ✅ |

### P1: Submissão e aprovação (CAMP-05, CAMP-06)

| AC | Spec-defined outcome | `file:line` + asserção | Result |
| -- | -------------------- | ---------------------- | ------ |
| AC1 submeter completo | `EM_ANALISE` + data-hora da submissão | `U/submeter-campanha.spec.ts:118-146` `status).toBe(EM_ANALISE)`, `submetidaEm).toEqual(agora)` (`:129`). P9 morto | ✅ |
| AC2 campos ausentes | 422 listando todos de uma vez | `U/submeter-campanha.spec.ts:209-229` `status).toBe(422)` + `message).toBe('Preencha os campos obrigatórios antes de enviar para análise')` + `campos).toEqual([...4])`; `E/campanha.spec.ts:230-257` (`:245`, `:248`) | ✅ |
| AC3 fim ≤ hoje | 422 | `U/submeter-campanha.spec.ts:230-250` (virada UTC/SP); `E/campanha.spec.ts:258-278`. P2 morto | ✅ / ⚠️ SP1 |
| AC4 beneficiada saiu do catálogo | 422 "Instituição ou causa indisponível" | `U/submeter-campanha.spec.ts:252-284` | ✅ |
| AC5 edição em análise | 409 "Campanha em análise não pode ser editada" | `U/editar-campanha.spec.ts:585-600` `status).toBe(409)` + mensagem (`:596`); `:536-556` (capa) | ✅ (r1 ❌) |
| AC6 fila | `EM_ANALISE` + alterações, mais antiga primeiro, campos e tipo | `U/listar-fila-campanhas.spec.ts:118-147` (`NOVA`, objeto exato), `:149-181` (`ALTERACAO` com propostos), `:183-216` (ordem intercalada), `:218-` (exclusões) | ✅ / ⚠️ SP2 |
| AC7 aprovar | `APROVADA` + **autor e data-hora** da decisão | Estado e autor: `U/aprovar-campanha.spec.ts:106-108`. **Data-hora: `U/aprovar-campanha.spec.ts:109` `depois.decididoEm).toEqual(agora)`; `E/campanha.spec.ts:323` `decididoEm).toEqual(agoraDecisao)`**. N24 morto | ✅ (r2 ❌) |
| AC8 apta ao selo | só em `APROVADA` | `U/aprovar-campanha.spec.ts:107`; `E/campanha.spec.ts:420-441` (4 estados) | ✅ |
| AC9 beneficiada indisponível na aprovação | 409, estado inalterado | `U/aprovar-campanha.spec.ts:145-178` | ✅ |
| AC10 motivo < 20 | 422 "O motivo deve ter no mínimo 20 caracteres", estado inalterado | `U/rejeitar-campanha.spec.ts:149-166` (19, nada gravado); `E/campanha.spec.ts:343-355` (20 aceito), `:356-371` (19 + espaços recusado). Mensagem: classe pré-existente, `test/http/admin-instituicoes.e2e-spec.ts:370` | ✅ (r1 ❌) |
| AC11 rejeitar | `REJEITADA`, motivo persistido, e-mail com motivo | `U/rejeitar-campanha.spec.ts:90-123` (status, `motivoUltimaRejeicao`, `mailer.mensagens).toEqual([...])`); `E/campanha.spec.ts:326-341` (`decididoEm` exato em `:339`, P4 morto). Fila `email_pendente`: infra — T30 | ✅ |
| AC12 editar `REJEITADA` | volta a `RASCUNHO`, preserva o motivo | `U/editar-campanha.spec.ts:267-299`; `E/campanha.spec.ts:197-229` | ✅ |
| AC13 só 4 transições | 409 "Operação não permitida para o estado atual" | `E/campanha.spec.ts:298-309`, `:389-419`; `U/aprovar-campanha.spec.ts:179-198`; `U/rejeitar-campanha.spec.ts:184-193`. Mensagem: classe pré-existente, `test/http/admin-causas.e2e-spec.ts:25` | ✅ |
| AC14 não-admin | 403 sem alterar estado | `U/listar-fila-campanhas.spec.ts:106-116`; `U/aprovar-campanha.spec.ts:124-137`; `U/rejeitar-campanha.spec.ts:125-140` | ✅ |
| AC15 auditoria de **toda** transição | autor, anterior, novo, motivo, data-hora | Submetida `U/submeter-campanha.spec.ts:133-144` (`criadoEm: agora`, P6 morto). **Aprovada `U/aprovar-campanha.spec.ts:112-121` (`tipo`, `usuarioId`, `entidadeId`, `dados` exatos e `criadoEm).toEqual(agora)` em `:121`, N23 morto)**. Rejeitada `U/rejeitar-campanha.spec.ts:109` (M25 morto). Reaberta `U/editar-campanha.spec.ts:293` (M26 morto) | ✅ (r1 ❌, r2 ❌) |

### P1: Alteração de campanha aprovada (CAMP-07, CAMP-08)

| AC | Spec-defined outcome | `file:line` + asserção | Result |
| -- | -------------------- | ---------------------- | ------ |
| AC1 nome, descrição, capa e meta na hora | aplicado, segue `APROVADA`, sem alteração | `E/campanha.spec.ts:468-489` (os 4); `U/editar-campanha.spec.ts:302-318` (nome e meta), `:504-535` (capa em `APROVADA`: gravada, `status` igual, sem pendência, sem auditoria) | ✅ (r1 ❌) |
| AC2 compromisso abre alteração | pendente; campanha `APROVADA` com os anteriores | `E/campanha.spec.ts:490-519`; `U/editar-campanha.spec.ts:320-379` | ✅ |
| AC3 pública mostra o aprovado | só valores anteriores | `U/buscar-campanha-publica.spec.ts:195-218` | ✅ |
| AC4 segunda alteração | 409 "Já existe uma alteração em análise" | `U/editar-campanha.spec.ts:484-501` `status).toBe(409)` + mensagem (`:497`); `E/campanha.spec.ts:598-614` | ✅ (r1 ❌) |
| AC5 mesmas validações de criação **e submissão** | beneficiada, regra e datas → 422 | Fim enviado = hoje em SP → `VigenciaVencidaError` (`U/editar-campanha.spec.ts:381-400`, `E/campanha.spec.ts:520-534`); amanhã → aberta (`U/editar-campanha.spec.ts:435-457`, `E/campanha.spec.ts:535-548`). **Fim herdado do compromisso aprovado já vencido + edição só da regra → `VigenciaVencidaError`, nada gravado (`U/editar-campanha.spec.ts:402-433`, `E/campanha.spec.ts:560-578`); vigência nova substitui a vencida → aberta (`E/campanha.spec.ts:580-595`)**. Regra inválida → 422 sem gravar (`U/editar-campanha.spec.ts:459-482`). N14, P2 e P3 mortos | ✅ (r1 ❌, r2 ❌) |
| AC6 aprovar alteração | aplica, registra autor e data-hora da decisão, encerra a pendência | Aplica: `U/aprovar-alteracao-campanha.spec.ts:144-209` (`compromissoVigente().equals(proposto)`, pendência vazia, auditoria com `criadoEm).toEqual(agora)`). Decisão gravada: `:211-228` (`status` `APROVADA`, `decididoPor` = admin, `decididoEm).toEqual(agora)`) | ✅ (r1 ❌) |
| AC7 nova beneficiada indisponível | 409 sem aplicar | `U/aprovar-alteracao-campanha.spec.ts:246-297` (3 casos; histórico vazio) | ✅ |
| AC8 rejeitar alteração | descarta, mantém `APROVADA`, persiste o motivo, enfileira e-mail | Mantém: `U/rejeitar-alteracao-campanha.spec.ts:162-177`. Motivo e decisão: `:220-236` (`decidida.motivo).toBe(MOTIVO_VALIDO)`, `decididoEm).toEqual(agora)`, P5 morto). E-mail: `:206-218` `toEqual([{ para: EMAIL_DONO, template: ALTERACAO_CAMPANHA_REJEITADA, dados: { nomeCampanha, motivo } }])`; falha do Mailer `:238-263` | ✅ (r1 ❌) |
| AC9 id público imutável | igual em toda edição e alteração | `U/editar-campanha.spec.ts:351`; `U/aprovar-alteracao-campanha.spec.ts:189`; `U/rejeitar-alteracao-campanha.spec.ts:172`; `E/campanha.spec.ts:517`, `:654`, `:675` | ✅ |
| AC10 auditoria de abertura e decisão | autor, anteriores e novos, motivo, data-hora | Abertura `U/editar-campanha.spec.ts:354-372` (autor, entidade, `criadoEm` em `:358`, retrato completo; P7 morto). Aprovação `U/aprovar-alteracao-campanha.spec.ts:192-208` (M42 morto). Rejeição `U/rejeitar-alteracao-campanha.spec.ts:178-204` (com `motivo`; P8 morto) | ✅ (r1 ❌) |

### P1: Consulta pública (CAMP-11)

| AC | Spec-defined outcome | `file:line` + asserção | Result |
| -- | -------------------- | ---------------------- | ------ |
| AC1 campanha aprovada de empresa aprovada | 200 com nome, descrição, capa, empresa, beneficiada, regra, meta, vigência | `U/buscar-campanha-publica.spec.ts:115-144` (`toEqual` exato); causa `:146-167` | ✅ / ⚠️ SP2 |
| AC2 404 idêntico | inexistente, `RASCUNHO`, `EM_ANALISE`, `REJEITADA`, empresa não aprovada, id malformado | `U/buscar-campanha-publica.spec.ts:220-283` (id malformado no Postgres: T38, ver M30) | ✅ |
| AC3 omitir id, motivo e pendência | ausentes | `U/buscar-campanha-publica.spec.ts:115-144` (`toEqual` exato); tipo `CampanhaPublica` (`U/buscar-campanha-publica.ts:23-33`) | ✅ |
| AC4 situação | `NAO_INICIADA` se início > hoje; senão `EM_ANDAMENTO` | `U/buscar-campanha-publica.spec.ts:169-193` | ✅ |

**Status**: ✅ Todos os ACs cobertos. Os **46** critérios P1 com regra de domínio batem com a saída da spec. Os três que estavam abertos na rodada 2 (Submissão AC7, Submissão AC15 e Alteração AC5) fecharam com asserção no valor exato e com o mutante correspondente morto. Os outros 43 continuam ✅: o código de produção não mudou desde `f0d6fd3`, e o diff de specs só acrescenta testes e troca 4 asserções fracas por exatas. Criação AC14 é infra. ⚠️ SP1 e SP2 continuam abertos e não bloqueiam.

---

## Edge Cases

- [x] Beneficiada indisponível com campanha em análise → 409: `U/aprovar-campanha.spec.ts:145-178`. Com alteração em análise: `U/aprovar-alteracao-campanha.spec.ts:246-297`.
- [x] Beneficiada de campanha `APROVADA` deixa de existir → segue publicada: por construção (`BuscarCampanhaPublicaUseCase` não consulta disponibilidade).
- [x] Empresa suspensa → 404 na pública sem mudar o estado: `U/buscar-campanha-publica.spec.ts:220-283` (caso "suspensa").
- [x] Dois admins decidindo ao mesmo tempo → 409 na segunda: aprovar campanha `U/aprovar-campanha.spec.ts:199-`, rejeitar campanha `U/rejeitar-campanha.spec.ts:195-`, aprovar alteração `U/aprovar-alteracao-campanha.spec.ts:299-`, rejeitar alteração `U/rejeitar-alteracao-campanha.spec.ts:265-282`.
- [x] Submissão duplicada → 409 e uma só submissão: `U/submeter-campanha.spec.ts:286-296`.
- [x] Edição concorrente com decisão → 409: `U/editar-campanha.spec.ts:601-`.
- [x] HTML na descrição guardado como texto: `E/descricao-campanha.spec.ts:35-46`.

---

## Discrimination Sensor

**Profundidade**: P0 expandido. `git worktree add --detach <scratchpad>/wt-dominio-r3 HEAD` (`dad822e`), com `node_modules` como link simbólico para o da árvore real. Baseline no worktree: 600/600. Cada mutante foi aplicado por script, com substituição exata e exigência de uma única ocorrência, testado com a suíte unit inteira (`npx jest --silent --json`, 600 testes) e revertido com `git checkout --`, com conferência byte a byte do arquivo restaurado (17/17 restaurados). Nenhuma morte veio de erro de compilação (0 suites com falha de execução). No fim, o link foi apagado, o worktree removido com `git worktree remove --force` e `git worktree prune` rodou (`git worktree list` só mostra a árvore real). **Isolamento**: o `git status --porcelain` da árvore real estava vazio antes e continuou vazio depois (`diff` idêntico). `git stash` não foi usado.

### Rodada 3 — reexecução dos 4 sobreviventes da rodada 2

| # | File:line | Mutação | Resultado (teste que matou) |
| - | --------- | ------- | --------------------------- |
| N8 | `U/campanha-detalhe.ts:65` | `padStart` → `padEnd` (105 → `"1.50"`) | ✅ `consultar-campanha-da-empresa.spec:158`, `:180` |
| N14 | `E/campanha.ts:428` | checa só `parcial.vigencia?`, não o compromisso mesclado | ✅ `campanha.spec:560`, `editar-campanha.spec:402` |
| N23 | `U/aprovar-campanha.ts:83` | `CAMPANHA_APROVADA` com `criadoEm: new Date(0)` | ✅ `aprovar-campanha.spec:98` |
| N24 | `E/campanha.ts:270` | `Campanha.aprovar` grava `decididoEm = new Date(0)` | ✅ `campanha.spec:311`, `aprovar-campanha.spec:98` |

### Rodada 3 — mutantes novos

Escolhidos nas áreas que T51–T53 deveriam proteger e nas data-horas e ramos que ainda não tinham sido mutados.

| # | Alvo | File:line | Mutação | Resultado |
| - | ---- | --------- | ------- | --------- |
| P1 | T51 | `U/campanha-detalhe.ts:65` | `padStart(2, '0')` → `padStart(1, '0')` (5 → `"0.5"`) | ✅ 8 testes, entre eles `consultar-campanha-da-empresa.spec:158`, `:180`, `buscar-campanha-publica.spec:115`, `rejeitar-alteracao-campanha.spec:178` |
| P2 | T52, Submissão AC3 | `E/vigencia.ts:40` | `fimJaPassouEm` → só `ehAnteriorA` (aceita fim = hoje, inclusive no herdado) | ✅ 7 testes, entre eles `campanha.spec:269`, `:520`, `:560`, `submeter-campanha.spec:230`, `editar-campanha.spec:381` |
| P3 | T52 | `E/campanha.ts:428` | checa `anterior.vigencia` em vez do proposto | ✅ `campanha.spec:520`, `:580`, `editar-campanha.spec:381` |
| P4 | T53 (rejeitar) | `E/campanha.ts:290` | `Campanha.rejeitar` grava `decididoEm = new Date(0)` | ✅ `campanha.spec:326` |
| P5 | Alteração AC8 | `E/alteracao-compromisso.ts:105` | `AlteracaoCompromisso.rejeitar` grava `decididoEm = new Date(0)` | ✅ `campanha.spec:718`, `rejeitar-alteracao-campanha.spec:220`, `alteracao-compromisso.spec` |
| P6 | Submissão AC15 | `U/submeter-campanha.ts:103` | `CAMPANHA_SUBMETIDA` com `criadoEm: new Date(0)` | ✅ `submeter-campanha.spec:118` |
| P7 | Alteração AC10 | `U/editar-campanha.ts:314` | `ALTERACAO_CAMPANHA_ABERTA` com `criadoEm: new Date(0)` | ✅ `editar-campanha.spec:320` |
| P8 | Alteração AC10 | `U/rejeitar-alteracao-campanha.ts:72` | `ALTERACAO_CAMPANHA_REJEITADA` com `criadoEm: new Date(0)` | ✅ `rejeitar-alteracao-campanha.spec:178` |
| P9 | Submissão AC1 (julgamento da T53) | `E/campanha.ts:257` | `submeter` grava `submetidaEm = new Date(0)` | ✅ `submeter-campanha.spec:118` |
| P10 | Criação AC17 (julgamento da T53) | `E/campanha.ts:86` | `createdAt` padrão `new Date(0)` | ✅ `editar-campanha.spec:173` |
| P11 | Submissão AC6 (abertura da alteração na fila) | `E/alteracao-compromisso.ts:41` | `createdAt` padrão `new Date(0)` | ✅ `alteracao-compromisso.spec` ("create nasce EM_ANALISE…") |
| P12 | T46 (`alteracaoDecidida`) | `E/campanha.ts:334` | `rejeitarAlteracao` preenche o slot **antes** de validar o motivo | ✅ `campanha.spec:760` (`alteracaoDecidida).toBeNull()` depois do motivo curto) |
| P13 | T46 (`alteracaoDecidida`) | `E/campanha.ts:317` | `aprovarAlteracao` mantém a decisão anterior no slot (`this._alteracaoDecidida ?? alteracao`) | ⚪ **equivalente no domínio** (abaixo) |

**Result**: rodada 3 com 17 injetados (4 reexecutados + 13 novos), **16 mortos**, **0 sobreviventes**, 1 equivalente (P13). Sensor ✅ PASS.

**Por que P13 é equivalente no domínio.** O mutante só muda algo quando a **mesma instância** decide duas alterações, porque o slot precisa já estar preenchido no momento da decisão. Nenhum caminho alcança isso. `AprovarAlteracaoCampanhaUseCase` (`U/aprovar-alteracao-campanha.ts:38`, `:66`, `:72`) e `RejeitarAlteracaoCampanhaUseCase` (`U/rejeitar-alteracao-campanha.ts:42`, `:48`, `:53`) carregam a campanha com `findById` (o double devolve uma cópia com o slot `null`), decidem uma vez e chamam `salvar` uma vez. Não há outro chamador de `aprovarAlteracao`/`rejeitarAlteracao` em `src/`. É a mesma classe de N6, e confirma a nota "slot único" da rodada 2: a regra "uma decisão por instância/`salvar`" é um contrato implícito, que vai para o JSDoc na T29 (follow-up 1c).

### Acumulado das três rodadas

| Rodada | Injetados | Reexecutados | Novos | Mortos | Sobreviventes | Equivalentes |
| ------ | --------- | ------------ | ----- | ------ | ------------- | ------------ |
| 1 (`d756ffa`) | 44 | 0 | 44 (M1–M44) | 31 | 12 (M8, M13, M22–M27, M37–M39, M42) | 1 (M30) |
| 2 (`3c03bb3`) | 38 | 12 | 26 (N1–N26) | 33 | 4 (N8, N14, N23, N24) | 1 (N6) |
| 3 (`dad822e`) | 17 | 4 | 13 (P1–P13) | 16 | 0 | 1 (P13) |
| **Total** | **99** | 16 | **83 distintos** | — | — | — |

**Estado final dos 83 mutantes distintos**: **80 mortos**, **0 sobreviventes**, **3 equivalentes no domínio** (M30, N6, P13), todos com o lugar de prova na infra ou no contrato da porta (T38 para M30, T29 para N6 e P13). Todo sobrevivente de uma rodada morreu na seguinte: M8, M13, M22–M27, M37–M39 e M42 na rodada 2 (T41–T45), e N8, N14, N23 e N24 nesta (T51–T53).

#### Rodada 1 — detalhe (alvos em `d756ffa`)

| # | File:line | Mutação | r1 | Destino |
| - | --------- | ------- | -- | ------- |
| M1 | `E/valor-monetario.ts:28` | `centavos < MINIMO` → `< 0` | ✅ | — |
| M2 | `E/valor-monetario.ts:26` | `padEnd` → `padStart` | ✅ | — |
| M3 | `E/valor-monetario.ts:5` | regex aceita 3 casas | ✅ | — |
| M4 | `E/percentual.ts:26` | teto 10000 → 10001 | ✅ | — |
| M5 | `E/nome-campanha.ts:18` | sem `trim` | ✅ | — |
| M6 | `E/nome-campanha.ts:20` | `> 80` → `> 81` | ✅ | — |
| M7 | `E/descricao-campanha.ts:11` | `>` → `>=` | ✅ | — |
| M8 | `E/vigencia.ts:22` | aceita fim anterior ao início | ❌ | T41 → ✅ r2 |
| M9 | `E/vigencia.ts:40` | `fimJaPassouEm` sem o caso igual | ✅ | — |
| M10 | `E/data-calendario.ts:31` | fuso `UTC` | ✅ | — |
| M11 | `E/data-calendario.ts:18-21` | sem a checagem de round-trip | ✅ | — |
| M12 | `E/regra-doacao.ts:42-44` | `POR_UNIDADE` aceita `percentual` | ✅ | — |
| M13 | `E/campanha.ts:266` | motivo `< 20` → `< 21` | ❌ | T42 → ✅ r2 |
| M14 | `E/campanha.ts:416` | `REJEITADA` não volta a `RASCUNHO` | ✅ | — |
| M15 | `E/campanha.ts:295` | `aprovarAlteracao` não copia a beneficiada | ✅ | — |
| M16 | `E/campanha.ts:390-392` | sem guarda de alteração pendente | ✅ | — |
| M17 | `E/campanha.ts:234` | `submeter` ignora fim vencido | ✅ | — |
| M18 | `E/campanha.ts:273` | `rejeitar` não grava o motivo | ✅ | — |
| M19 | `E/campanha.ts:205` | `APROVADA` aplica o compromisso direto | ✅ | — |
| M20 | `in-memory-campanha-repository.ts:81` | CAS desligado no double | ✅ | — |
| M21 | `U/aprovar-campanha.ts:51` | ignora beneficiada indisponível | ✅ | — |
| M22 | `U/rejeitar-alteracao-campanha.ts:72` | ignora `salvar` = `false` | ❌ | T44 → ✅ r2 |
| M23 | `U/rejeitar-alteracao-campanha.ts:98-102` | remove `mailer.enviar` | ❌ | T44 → ✅ r2 |
| M24 | `U/rejeitar-alteracao-campanha.ts:84-85` | auditoria sem `motivo`, proposto = anterior | ❌ | T44 → ✅ r2 |
| M25 | `U/rejeitar-campanha.ts:76` | `criadoEm: new Date(0)` | ❌ | T45 → ✅ r2 |
| M26 | `U/editar-campanha.ts:286` | `CAMPANHA_REABERTA` com `new Date(0)` | ❌ | T45 → ✅ r2 |
| M27 | `U/aprovar-alteracao-campanha.ts:107` | `compromissoNovo` com beneficiada e vigência do anterior | ❌ | T45 → ✅ r2 |
| M28 | `U/editar-campanha.ts:214-217` | nunca consulta a beneficiada | ✅ | — |
| M29 | `U/buscar-campanha-publica.ts:73` | ignora empresa não aprovada | ✅ | — |
| M30 | `U/buscar-campanha-publica.ts:59` | sem checagem de UUID | ⚪ | equivalente; prova na T38 |
| M31 | `U/buscar-campanha-publica.ts:109` | situação por `inicio < hoje` | ✅ | — |
| M32 | `U/listar-fila-campanhas.ts:70` | ordem invertida | ✅ | — |
| M33 | `U/listar-fila-campanhas.ts:80-82` | alteração mostra os valores vigentes | ✅ | — |
| M34 | `U/consultar-campanha-da-empresa.ts:123` | sem checagem de dona | ✅ | — |
| M35 | `U/submeter-campanha.ts:83` | ignora beneficiada indisponível | ✅ | — |
| M36 | `U/rejeitar-campanha.ts:91` | e-mail com `motivo: ''` | ✅ | — |
| M37 | `ER/campanha-em-analise.error.ts:7` | mensagem trocada | ❌ | T43 → ✅ r2 |
| M38 | `ER/alteracao-ja-pendente.error.ts:7` | mensagem trocada | ❌ | T43 → ✅ r2 |
| M39 | `ER/invalid-rule-value.error.ts:7` | mensagem trocada | ❌ | T43 → ✅ r2 |
| M40 | `U/aprovar-alteracao-campanha.ts:72` | nunca confere a nova beneficiada | ✅ | — |
| M41 | `U/editar-campanha.ts:292` | não audita a abertura | ✅ | — |
| M42 | `U/aprovar-alteracao-campanha.ts:109` | `criadoEm: new Date(0)` | ❌ | T45 → ✅ r2 |
| M43 | `U/criar-campanha.ts:181` | nunca consulta a beneficiada | ✅ | — |
| M44 | `U/editar-campanha.ts:267-269` | ignora `salvar` = `false` | ✅ | — |

#### Rodada 2 — mutantes novos (alvos em `3c03bb3`, iguais em `dad822e`)

| # | Task | File:line | Mutação | r2 | Destino |
| - | ---- | --------- | ------- | -- | ------- |
| N1 | T46 | `E/campanha.ts:317` | `aprovarAlteracao` não preenche `alteracaoDecidida` | ✅ | — |
| N2 | T46 | `E/campanha.ts:341` | `rejeitarAlteracao` não preenche `alteracaoDecidida` | ✅ | — |
| N3 | T46 | `E/campanha.ts:426` | abrir alteração limpa o slot da decidida | ✅ | — |
| N4 | T46 | `in-memory-campanha-repository.ts:88` | double não grava a decidida | ✅ | — |
| N5 | T46 | `in-memory-campanha-repository.ts:81` | double grava a decidida antes do CAS | ✅ | — |
| N6 | T46 | `in-memory-campanha-repository.ts:115` | double sempre acrescenta ao histórico | ⚪ | equivalente; prova na T29 |
| N7 | T47 | `U/editar-campanha.ts:245` | capa gravada com id aleatório | ✅ | — |
| N8 | T48 | `U/campanha-detalhe.ts:65` | `padStart` → `padEnd` | ❌ | T51 → ✅ r3 |
| N9 | T48 | `U/campanha-detalhe.ts:82` | retrato sem `fim` | ✅ | — |
| N10 | T48 | `U/campanha-detalhe.ts:74` | percentual sai na chave `valor` | ✅ | — |
| N11 | T48 | `U/campanha-detalhe.ts:127` | `atualizadaEm: null` | ✅ | — |
| N12 | T48 | `U/campanha-detalhe.ts:123` | `abertaEm` = criação da campanha | ✅ | — |
| N13 | T48 | `U/rejeitar-alteracao-campanha.ts:68` | auditoria: anterior = proposto | ✅ | — |
| N14 | T49 | `E/campanha.ts:428` | checa só `parcial.vigencia` | ❌ | T52 → ✅ r3 |
| N15 | T49 | `E/campanha.ts:428` | `fim < hoje` (aceita fim = hoje) | ✅ | — |
| N16 | T49 | `E/campanha.ts:428` | checagem desligada | ✅ | — |
| N17 | T49 | `U/editar-campanha.ts:264` | "hoje" pela data UTC | ✅ | — |
| N18 | T43 | `ER/campos-pendentes.error.ts:7` | lista de volta na mensagem | ✅ | — |
| N19 | T50 | `E/arquivo.ts:58` | limite da capa 5 MB + 1 | ✅ | — |
| N20 | T50 | `E/arquivo.ts:51` | capa aceita SVG | ✅ | — |
| N21 | T50 | `E/arquivo.ts:65` | capa com checagem de 512×512 | ✅ | — |
| N22 | T45 | `U/aprovar-alteracao-campanha.ts:88` | auditoria: anterior = proposto | ✅ | — |
| N23 | amostra | `U/aprovar-campanha.ts:83` | `CAMPANHA_APROVADA` com `criadoEm: new Date(0)` | ❌ | T53 → ✅ r3 |
| N24 | amostra | `E/campanha.ts:270` | `Campanha.aprovar` com `decididoEm = new Date(0)` | ❌ | T53 → ✅ r3 |
| N25 | amostra | `E/alteracao-compromisso.ts:86` | `AlteracaoCompromisso.aprovar` com `new Date(0)` | ✅ | — |
| N26 | amostra | `E/alteracao-compromisso.ts:106` | motivo truncado em 20 caracteres | ✅ | — |

---

## Code Quality

| Princípio | Status | Nota |
| --------- | ------ | ---- |
| AD-017: valor restrito → VO; estado → entidade; entre registros → caso de uso | ✅ | Sem mudança de código nesta rodada. A checagem de fim vencido segue na entidade (`E/campanha.ts:426-430`), sobre o compromisso mesclado, como manda o design (`design.md:158`) |
| Aderência ao design | ✅ | O ramo "fim vencido herdado" agora tem teste. A divergência "atualiza" × upsert da T29 continua como follow-up |
| Código mínimo / sem duplicação | ✅ | `paraDecimal`, `descreverRegra`, `descreverVigencia` e `descreverCompromisso` com uma definição só (`U/campanha-detalhe.ts:63-98`) |
| Mudanças cirúrgicas | ✅ | 4 specs e `tasks.md`. Um commit por task, com a mensagem da Done-when, sem linha de coautoria |
| Segue padrões existentes | ✅ | Fake timers com `afterEach(jest.useRealTimers)`, `expectNadaGravado`, `isLeft()` incondicional antes de inspecionar o erro (L-005) |
| Spec-anchored outcome check | ✅ | 46/46 |
| Cobertura por camada (domínio 1:1; nada gravado em todo erro) | ✅ | Fração com zero à esquerda, fim herdado e data-hora de toda decisão e auditoria conferidos pelo valor |
| Todo teste mapeia para AC / edge / Done-when | ✅ | Os 5 testes novos mapeiam para Criação AC17 (T51) e Alteração AC5 (T52) |
| Guidelines documentadas | ✅ | Nenhuma no projeto; strong defaults da Test Coverage Matrix de `tasks.md` |
| Senior engineer aprovaria? | ✅ | Sim. Duas notas cosméticas: (a) `U/editar-campanha.spec.ts:402` usa `virada` (31/12 em SP, 1/1 em UTC), e com fim `2026-12-31` a campanha está vencida nos dois fusos, então o teste não volta a provar a virada SP; a virada já é provada por N17 em `:435`, sobre o mesmo cálculo de "hoje" (`U/editar-campanha.ts:264`). (b) `consoleError.mockRestore()` fora de `finally` em `U/rejeitar-alteracao-campanha.spec.ts:241-263` (vem da rodada 2) |

---

## Spec-Precision Gaps

| # | AC | Problema | Estado |
| - | -- | -------- | ------ |
| SP1 | Criação AC5, AC6, AC8, AC11; Submissão AC3 | A spec define só "HTTP 422", sem texto; o design fixa as mensagens | Aberto, não bloqueia. Os testes ancoram no design. Já registrado como L-011 |
| SP2 | Submissão AC6 ("empresa"); Consulta AC1 ("nome da empresa", "imagem de capa quando houver") | Termo guarda-chuva; o design resolve como `nomeFantasia` e `temCapa` | Aberto, não bloqueia. Já registrado como L-019 |
| SP3 | Alteração AC10 | Formato do retrato na auditoria | Resolvido na rodada 2 (T48). Resta a diferença de nome de chave (follow-up 2) |

---

## Follow-ups não bloqueantes para a infra

Para o orquestrador repassar aos workers da Fase 7–9. Nenhum bloqueia o handoff.

1. **T29 (`PrismaCampanhaRepository`)**:
   - (a) **Upsert também para a linha da `alteracaoDecidida`**. A Done-when da T29 em `tasks.md` ainda diz "atualiza a linha dela (pelo `id`)". O double faz upsert (`test/repositories/in-memory-campanha-repository.ts:111-119`), e um `update` sem linha perderia a decisão em silêncio.
   - (b) e2e salvando duas vezes a mesma instância depois da decisão, para provar a idempotência que o JSDoc da porta promete. É o lugar de prova de N6.
   - (c) JSDoc de `salvar` e de `Campanha.alteracaoDecidida`: "uma decisão por instância e por `salvar`". P13 mostra que, com duas decisões na mesma instância, o slot pode ficar com a primeira sem que nenhum teste perceba. Nenhum caso de uso faz isso, mas a regra precisa estar escrita. Se o grupo quiser, um teste de entidade "decidir → abrir → decidir deixa a segunda no slot" mata P13. Isso é domínio e fica a critério do grupo.
   - (d) Ida e volta com **todas** as data-horas e campos opcionais conferidos coluna a coluna (`submetida_em`, `decidido_por`, `decidido_em`, `motivo_ultima_rejeicao`, `criado_em` da alteração), não por `equals` da entidade, que compara só o `id` (candidata L-003). O `criado_em` da alteração é o `abertaEm` que ordena a fila (Submissão AC6). No domínio, só o teste de entidade guarda o padrão de `createdAt` (P11).
2. **T38 (`CampanhasPublicasController`)**: o e2e de `idPublico` malformado → 404 com o mesmo corpo, comparado byte a byte, já está na Done-when. É o lugar de prova de M30, porque no Postgres um texto que não é UUID numa coluna `uuid` faria a consulta falhar.
3. **T36/T37 (auditoria pelo HTTP)**: se o e2e consultar a auditoria das alterações, tratar as duas chaves: `compromissoNovo` (`ALTERACAO_CAMPANHA_APROVADA`, `U/aprovar-alteracao-campanha.ts:88-89`) e `compromissoProposto` (`_ABERTA`, `_REJEITADA`). Uniformizar para `compromissoProposto` é domínio e fica com o grupo, se algum consumidor ler `dados`.
4. **Domínio, cosmético (grupo)**: `consoleError.mockRestore()` em `finally` em `U/rejeitar-alteracao-campanha.spec.ts:241-263`.

---

## Requirement Traceability Update

`spec.md` não foi editado. Status proposto para o orquestrador aplicar:

| Requirement | Status anterior (r2) | Status proposto |
| ----------- | -------------------- | --------------- |
| CAMP-01 | ❌ Needs Fix (T51) | ✅ Domínio verificado · infra em Tasks (T31–T34) |
| CAMP-02 | ❌ Needs Fix (T51) | ✅ Domínio verificado · infra em Tasks |
| CAMP-03 | ✅ Domínio verificado | ✅ Domínio verificado · infra em Tasks |
| CAMP-04 | ✅ Domínio verificado | ✅ Domínio verificado · infra em Tasks |
| CAMP-05 | ❌ Needs Fix (T53) | ✅ Domínio verificado · infra em Tasks (T35, T36) |
| CAMP-06 | ❌ Needs Fix (T53) | ✅ Domínio verificado · infra em Tasks (T29, T36) |
| CAMP-07 | ✅ Domínio verificado | ✅ Domínio verificado · infra em Tasks |
| CAMP-08 | ❌ Needs Fix (T52) | ✅ Domínio verificado · infra em Tasks (T29, T37) |
| CAMP-11 | ✅ Domínio verificado | ✅ Domínio verificado · infra em Tasks (T38) |
| CAMP-09, CAMP-10 | Deferred | Deferred |

---

## Summary

**Overall**: ✅ Ready para o handoff. O domínio P1 de `campanhas` passa o gate do AD-021 na rodada 3, e a Fase 7 (T28–T40) pode começar.

**Spec-anchored check**: 46/46 critérios P1 de domínio batem com a saída da spec. SP1 e SP2 abertos, não bloqueiam.
**Sensor**: rodada 3 com 17 injetados (4 reexecutados + 13 novos), 16 mortos, 0 sobreviventes e 1 equivalente (P13). No acumulado, 83 mutantes distintos: 80 mortos, 0 sobreviventes e 3 equivalentes (M30, N6, P13).
**Gate**: tsc 0 · eslint 0 · unit 600/600 (335 → 566 → 595 → 600). Nenhum teste apagado ou enfraquecido.
**Lições**: nenhuma nova. A rodada é um PASS sem sobrevivente, sem lacuna de AC e sem desvio. P13 é equivalente, e SP1/SP2 já viraram L-011 e L-019. L-029 (N8) e L-030 (N14) foram corrigidas aqui e continuam candidatas, porque correção não é recorrência.

**O que funciona**: tudo o que funcionava na rodada 2, e agora também a formatação decimal com zero à esquerda no read model, a checagem de fim vencido sobre o compromisso mesclado (inclusive quando a vigência vencida vem do aprovado) e a data-hora exata de toda decisão e de todo registro de auditoria do agregado.

**Próximos passos**: (1) o orquestrador atualiza `STATE.md` e a rastreabilidade; (2) a Fase 7 começa pela T28, levando os follow-ups 1–3 para T29, T36/T37 e T38.
