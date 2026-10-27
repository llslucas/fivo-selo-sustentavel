# Campanhas — Validação do domínio, rodada 1 (gate de handoff AD-021)

**Verdict**: FAIL

**Veredito**: ❌ **FAIL**. O gate `quick` está verde (tsc 0, eslint 0, unit 566/566), e a maior parte da regra de negócio está correta e bem testada: VOs de limite, máquina de estados da `Campanha`, CAS por `versao` contra o double real, fila, consulta pública e guardas de empresa e admin. O handoff para a Fase 7 continua **bloqueado** por três motivos:

1. **Bloqueador estrutural (Alteração AC6/AC8, AD-006c).** `aprovarAlteracao` e `rejeitarAlteracao` zeram `alteracaoPendente` antes do `salvar` (`entities/campanha.ts:298`, `:321`). O repositório recebe a campanha sem a alteração decidida e não tem como gravar status, `decididoPor`, `decididoEm` e `motivo` em `campanha_alteracao`. A T29 não consegue cumprir a porta como ela está.
2. **Lacunas de comportamento.** A alteração pendente aceita data de fim já vencida (Alteração AC5 exige as validações de datas da submissão). `EditarCampanhaUseCase` não recebe `capaArquivoId`, então a capa não é editável por caso de uso (Criação AC15, Alteração AC1), e a T34 depende disso. A edição e a consulta devolvem dois tipos `CampanhaDetalhe` diferentes (Done-when da T19).
3. **Testes que não discriminam.** O sensor teve 44 mutantes: 31 mortos, **12 sobreviventes** e 1 equivalente. O caso mais grave é `RejeitarAlteracaoCampanha`: o e-mail, a auditoria e o CAS podem ser removidos sem que nenhum teste falhe. Também sobrevivem mensagens literais citadas pela spec, timestamps de auditoria, a vigência com fim anterior ao início e o limite de 20 caracteres do motivo na `Campanha`. A T11 (`IMAGEM_CAMPANHA`) não tem nenhum teste.

As lacunas viraram as tasks humanas **T41–T50** (seção Fix Plans).

**Data**: 2026-10-27
**Spec**: `.specs/features/campanhas/spec.md`
**Diff range**: `397f8bc..d756ffa` (`397f8bc` = merge do planejamento; `d756ffa` = HEAD de `feat/campanhas-infra`). Superfície: `src/domain/**`, `src/core/**` (sem mudança), `test/repositories/**` e `test/factories/**`, com 59 arquivos, +6726/−270 e 40 commits. Nenhum arquivo fora dessa superfície mudou, e nenhum teste foi apagado.
**Verifier**: sub-agente independente (autor ≠ verificador), somente leitura sobre `src/` e `test/`. Ele escreve só este arquivo e o que `lessons.py` gerar.
**Rodada**: 1 de 3. Escopo: P1 do `api` (CAMP-01…08, CAMP-11 → T1–T27). CAMP-09, CAMP-10 e `web` ficam fora. Sem UAT (backend). Gate e2e não rodado (a infra de campanhas ainda não existe).

> Nota de autoria: a T18 (`criar-campanha.ts` + spec) foi escrita pelo agente sob a exceção registrada no AD-021 (`STATE.md`, "Exceção de autoria (2026-10-27)"). As demais T1–T27 são humanas. Vários checkboxes de `tasks.md` estão desmarcados porque humanos não editam specs. Isso não é lacuna: a conclusão abaixo foi conferida no código.

---

## Gate Check

- **Gate command** (`tasks.md`, Quick): `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest`. Cada etapa rodou em separado, com a saída redirecionada para arquivo no scratchpad.

| Etapa | Exit | Resultado |
| ----- | ---- | --------- |
| `tsc --noEmit` | 0 | ok |
| `eslint` | 0 | nenhum erro, nenhum aviso |
| `jest` (unit) | 0 | 63 suites, **566/566**, 0 skip |

- **Contagem de testes**: 335 unit em `397f8bc` (43 suites, medido num worktree descartável) → 566 em HEAD (63 suites), **+231**.
- **Integridade**: `git diff --diff-filter=D 397f8bc..HEAD -- src test` vem vazio. O único spec reescrito é `criar-campanha.spec.ts`, que pertence ao retrabalho previsto na T18. Nenhuma asserção de outra feature foi tocada.

---

## Task Completion (T1–T27)

| Task | Status | Notas |
| ---- | ------ | ----- |
| T1 Erros | ⚠️ Parcial | Status e mensagens batem, com uma exceção: `CamposPendentesError` concatena a lista na mensagem (`errors/campos-pendentes.error.ts:7-9`: `` `Preencha ... análise: ${JSON.stringify(campos)}` ``). O Done-when e o design pedem a mensagem fixa "Preencha os campos obrigatórios antes de enviar para análise", com `campos` no corpo. → T43 |
| T2 `NomeCampanha` | ✅ | 2/81 rejeitados, 3/80 aceitos, `" ab "` rejeitado, mensagem conferida |
| T3 `DescricaoCampanha` | ✅ | 2000/2001, `<script>` devolvido idêntico |
| T4 `ValorMonetario` | ✅ | Conversões e as 8 rejeições da Done-when. Sem `parseFloat` (`valor-monetario.ts:25-26`, concatenação de strings) |
| T5 `Percentual` | ✅ | — |
| T6 `RegraDoacao` | ✅ | — (a mensagem de `InvalidRuleValueError` nunca é asserida; ver Criação AC7) |
| T7 `Beneficiada` | ✅ | Mensagem conferida |
| T8 `DataCalendario` | ✅ | `2026-10-16T02:30Z` → `2026-10-15` |
| T9 `Vigencia` | ⚠️ Parcial | "Fim igual **ou anterior** ao início → erro": só o caso igual tem teste (M8 sobreviveu). → T41 |
| T10 `Compromisso` | ✅ | `mesclar` imutável; `equals` distingue cada campo |
| T11 `IMAGEM_CAMPANHA` | ❌ | O tipo existe (`arquivo.ts:51,58,65`), mas `arquivo.spec.ts` não tem nenhum caso de `IMAGEM_CAMPANHA` (`grep` vazio em `src` e `test`). → T50 |
| T12 `AlteracaoCompromisso` | ✅ | Motivo 19/20, trim, dupla decisão, sem setter |
| T13 `Campanha` rascunho/submissão | ✅ | — |
| T14 `Campanha` decisões | ✅ | Aprovar e rejeitar ok nos 4 estados. O limite de 20 caracteres em `Campanha.rejeitar` não tem o lado aceito (M13). → T42 |
| T15 `Campanha` alteração | ✅ na Done-when | Mas a alteração decidida some do agregado antes do `salvar` (ver bloqueador). → T46 |
| T16 Porta/double/factory | ✅ | CAS, `listarEmAnalise` e cópias defensivas. A porta não tem como receber a alteração decidida. → T46 |
| T17 Templates | ✅ | — |
| T18 `CriarCampanha` | ✅ | Um teste por VO, "nada gravado" em todo erro, guarda não chamada sem beneficiada |
| T19 `EditarCampanha` | ❌ | "Devolve o detalhe da campanha (**mesmo read model de T21**)": a edição devolve `campanha-detalhe.ts:31` (`alteracaoPendente.criadaEm`, sem `criadaEm`/`atualizadaEm`). A consulta devolve `consultar-campanha-da-empresa.ts:42` (`alteracaoPendente.abertaEm`, `criadaEm`, `atualizadaEm`). Também falta `capaArquivoId` na entrada, e a alteração não valida fim ≤ hoje. → T47, T48, T49 |
| T20 `SubmeterCampanha` | ✅ | Fake timers em SP, CAS real e spy, auditoria com `criadoEm` exato |
| T21 `ConsultarCampanhaDaEmpresa` | ✅ | — |
| T22 `ListarFilaCampanhas` | ✅ | Três itens intercalados |
| T23 `AprovarCampanha` | ✅ | CAS exercitado contra o double (`RepositorioComGravacaoConcorrente`) |
| T24 `RejeitarCampanha` | ⚠️ | A Done-when está cumprida, mas a auditoria não confere `criadoEm` (M25). → T45 |
| T25 `AprovarAlteracaoCampanha` | ⚠️ | A auditoria confere só o tipo da regra (M27) e não confere `criadoEm` (M42). → T45 |
| T26 `RejeitarAlteracaoCampanha` | ❌ | O setup não cria empresa nem dono, então o e-mail nunca é tentado: a "falha do Mailer" passa por vacuidade. A auditoria só confere `tipo`, e o CAS não tem teste (M22, M23, M24). → T44 |
| T27 `BuscarCampanhaPublica` | ✅ | `toEqual` exato prova a omissão de `id`, motivo e pendência |

---

## Spec-Anchored Acceptance Criteria

Legenda: ✅ evidência no valor da spec; ❌ sem evidência ou evidência parcial; ⚠️ spec-precision gap; **infra — T28+** = AC só de HTTP, persistência ou OpenAPI (não conta como lacuna).
Caminhos abreviados: `E/` = `src/domain/fivo/entities/`, `U/` = `src/domain/fivo/application/use-cases/`.

### P1: Criação da campanha (CAMP-01…04)

| AC | Spec-defined outcome | `file:line` + asserção | Result |
| -- | -------------------- | ---------------------- | ------ |
| AC1 empresa não aprovada | 403 "Cadastro ainda não aprovado", nada gravado, em criar, editar e submeter | `U/criar-campanha.spec.ts:133-136` `message).toBe('Cadastro ainda não aprovado')` + `items).toHaveLength(0)`. `U/submeter-campanha.spec.ts:180-183` (mensagem + `expectNadaGravado`). `U/editar-campanha.spec.ts:132-134` `toBeInstanceOf(NotAllowedError)` + nome e versão intactos + auditoria vazia. 403 = mapeamento `NotAllowedError` (infra) | ✅ |
| AC2 cria `RASCUNHO` | estado `RASCUNHO`; id interno + id público (201 é infra) | `E/campanha.spec.ts:102` `status).toBe(RASCUNHO)`. `U/criar-campanha.spec.ts:86-93` `idPublico).not.toBe(id)` + gravados | ✅ |
| AC3 nome 3–80 com trim | 422 "O nome deve ter entre 3 e 80 caracteres" | `E/nome-campanha.spec.ts:26-31` (2, 81), `:15-24` (3, 80), `:33-38` (`' ab '`), `:45-48` `status).toBe(422)` + mensagem literal | ✅ |
| AC4 descrição ≤ 2000 | 422 "A descrição deve ter no máximo 2000 caracteres" | `E/descricao-campanha.spec.ts:5-17` (2000 aceito), `:19-33` (2001 + 422 + mensagem) | ✅ |
| AC5 valor por unidade | 0,01–999.999,99, ≤ 2 casas, senão 422 | `E/valor-monetario.spec.ts:5-19` (`'0.01'`→1, `'999999.99'`→99999999), `:34-42` (`'0'`, `'0.00'`, `'1000000'`, `'1.234'`…), `:49` `status).toBe(422)`. Mutantes M1–M3 mortos | ✅ / ⚠️ SP1 |
| AC6 percentual | 0,01–100,00, ≤ 2 casas, senão 422 | `E/percentual.spec.ts:5-22` (`'0.01'`, `'100'`), `:24-38` (`'0'`, `'100.01'`, `'1.234'`; 422 + mensagem). M4 morto | ✅ / ⚠️ SP1 |
| AC7 valor do outro tipo | 422 "O Valor da regra deve corresponder à regra selecionada." | `E/regra-doacao.spec.ts:32-38`, `:45-51` só `toBeInstanceOf(InvalidRuleValueError)`. **Nenhum teste confere o texto**, e M39 (mensagem trocada) sobreviveu à suíte unit inteira | ❌ → T43 |
| AC8 meta | mesmos limites do valor, 422 | `U/criar-campanha.spec.ts:155-161` (`meta: '0'` → `ValorMonetarioInvalidoError` + nada gravado). Limites via o VO de AC5 | ✅ / ⚠️ SP1 |
| AC9 instituição e causa juntas | 422 "Informe exatamente uma beneficiada: instituição ou causa" | `E/beneficiada.spec.ts:27-35`, `:44-53` (422 + mensagem). `U/criar-campanha.spec.ts:253-267` (nada gravado) | ✅ |
| AC10 beneficiada indisponível | 422 "Instituição ou causa indisponível" | `U/criar-campanha.spec.ts:211-237` (instituição `SUSPENSA`, causa `INATIVA`, nada gravado). Mensagem: `U/assegurar-beneficiada-disponivel.spec.ts:111,123,136,147` (catálogo, mesma classe) | ✅ |
| AC11 fim ≤ início | 422 para fim **anterior ou igual** | `E/vigencia.spec.ts:12-19` e `U/criar-campanha.spec.ts:201-209` cobrem só **igual**. Fim anterior ao início não tem teste: M8 (`fim.equals(inicio) \|\| fim.ehAnteriorA(inicio)` → `fim.equals(inicio)`) sobreviveu | ❌ → T41 / ⚠️ SP1 |
| AC12 início no passado | aceito | `E/vigencia.spec.ts:34-37` (`2020-01-01` aceito); nenhum caso de uso confere "hoje" na criação | ✅ |
| AC13 capa PNG/JPEG ≤ 5 MB | 422 nos demais | Parte de domínio (`Arquivo.criar` com `IMAGEM_CAMPANHA`): **sem teste**. A parte de multer e sniff é infra (T31, T34) | ❌ → T50 |
| AC14 storage fora | 503 "Storage indisponível no momento." | infra — T34 | infra |
| AC15 rascunho edita todos os campos | todos os campos editáveis pela dona | `E/campanha.spec.ts:111-147` (entidade aceita os 7, incluindo `capaArquivoId`). `U/editar-campanha.spec.ts:164-200` (6 campos pelo caso de uso). **`EditarCampanhaUseCaseRequest` não tem `capaArquivoId`** (`U/editar-campanha.ts:52-63`); `grep capaArquivoId` em `editar-campanha.ts` vem vazio | ❌ → T47 |
| AC16 id público imutável, distinto, não sequencial | `idPublico ≠ id`, UUID v4 | `E/campanha.spec.ts:105-106` `idPublico.equals(campanha.id)).toBe(false)`. Imutável: sem setter (`:596-604`) e `idPublico` igual depois de cada operação (`:443`, `:470`, `:523`, `:544`). Não sequencial por construção (`UniqueEntityId` = `randomUUID`) | ✅ |
| AC17 consulta da dona | todos os campos, estado, motivo, pendência | `U/consultar-campanha-da-empresa.spec.ts:112-132` (`toEqual` completo com motivo) e `:212-221` (pendência com valores propostos) | ✅ |
| AC18 campanha de outra empresa | 404 sem revelar | `U/consultar-campanha-da-empresa.spec.ts:242-268` (`toEqual(naoEncontrada)`, igual à inexistente). `U/editar-campanha.spec.ts:137-148`. `U/submeter-campanha.spec.ts:186-199` | ✅ |

### P1: Submissão e aprovação (CAMP-05, CAMP-06)

| AC | Spec-defined outcome | `file:line` + asserção | Result |
| -- | -------------------- | ---------------------- | ------ |
| AC1 submeter completo | `EM_ANALISE` + data-hora da submissão | `U/submeter-campanha.spec.ts:127-130` `status).toBe(EM_ANALISE)`, `submetidaEm).toEqual(agora)`, `versao).toBe(1)` | ✅ |
| AC2 campos ausentes | 422 listando **todos** de uma vez | `U/submeter-campanha.spec.ts:216-223` `campos).toEqual(['descricao','beneficiada','regraDoacao','vigencia.inicio'])` + nada gravado | ✅ / ⚠️ SP1 (mensagem: ver T1) |
| AC3 fim ≤ hoje | 422 | `U/submeter-campanha.spec.ts:226-236` (fim = hoje em SP, com UTC já no dia seguinte), `:238-246` (fim amanhã em SP aceito). `E/campanha.spec.ts:245-264`. M9, M10, M17 mortos | ✅ / ⚠️ SP1 |
| AC4 beneficiada saiu do catálogo | 422 "Instituição ou causa indisponível" | `U/submeter-campanha.spec.ts:248-280` (instituição e causa; nada gravado). M35 morto | ✅ |
| AC5 edição em análise | 409 "Campanha em análise não pode ser editada" | `U/editar-campanha.spec.ts:364-374` e `E/campanha.spec.ts:160-184`, só `toBeInstanceOf(CampanhaEmAnaliseError)`. **Texto nunca asserido**: M37 sobreviveu | ❌ → T43 |
| AC6 fila | `EM_ANALISE` + alterações, mais antiga primeiro, com empresa, nome, beneficiada, regra, vigência, data e tipo | `U/listar-fila-campanhas.spec.ts:131-146` (`NOVA`, objeto exato), `:165-180` (`ALTERACAO` com valores propostos), `:210-214` (ordem intercalada), `:218-236` (exclusões). M32, M33 mortos | ✅ / ⚠️ SP2 |
| AC7 aprovar | `APROVADA` + autor + data-hora | `U/aprovar-campanha.spec.ts:100-103` (`status`, `decididoPor.equals(admin.id)`, `decididoEm` `Date`) | ✅ |
| AC8 apta ao selo | só em `APROVADA` | `U/aprovar-campanha.spec.ts:101`; `E/campanha.spec.ts:376-385` (4 estados) | ✅ |
| AC9 beneficiada indisponível na aprovação | 409, estado inalterado | `U/aprovar-campanha.spec.ts:139-171` (`BeneficiadaIndisponivelNaDecisaoError`, status e versão intactos, auditoria vazia). M21 morto | ✅ |
| AC10 motivo < 20 | 422 "O motivo deve ter no mínimo 20 caracteres", estado inalterado | `U/rejeitar-campanha.spec.ts:142-159` (19 caracteres, nada gravado). Mensagem: classe pré-existente, conferida em `test/http/admin-instituicoes.e2e-spec.ts:370`. O lado aceito (20) não é testado em `Campanha.rejeitar`: M13 (`< 20` → `< 21`) sobreviveu | ❌ → T42 |
| AC11 rejeitar | `REJEITADA`, motivo persistido, e-mail com motivo | `U/rejeitar-campanha.spec.ts:93-94` (status + `motivoUltimaRejeicao`), `:109-115` `mailer.mensagens).toEqual([{ para, template: CAMPANHA_REJEITADA, dados: { nomeCampanha, motivo } }])`. A fila `email_pendente` é infra (T30) | ✅ |
| AC12 editar `REJEITADA` | volta a `RASCUNHO`, preserva o motivo | `U/editar-campanha.spec.ts:267-281`; `E/campanha.spec.ts:186-217`. M14 morto | ✅ |
| AC13 só 4 transições | 409 "Operação não permitida para o estado atual" | `E/campanha.spec.ts:285-296`, `:345-374`; `U/aprovar-campanha.spec.ts:173-191`; `U/rejeitar-campanha.spec.ts:177-186`. Mensagem: classe pré-existente, `test/http/admin-causas.e2e-spec.ts:25` | ✅ |
| AC14 não-admin | 403 sem alterar estado | `U/listar-fila-campanhas.spec.ts:106-116`; `U/aprovar-campanha.spec.ts:118-130` (status, versão, auditoria); `U/rejeitar-campanha.spec.ts:118-133` (status, auditoria, e-mail) | ✅ |
| AC15 auditoria de toda transição | autor, anterior, novo, motivo, **data-hora** | Submetida `U/submeter-campanha.spec.ts:133-144` (`criadoEm: agora`) ✅. Aprovada `U/aprovar-campanha.spec.ts:106-115` (`criadoEm` `Date`) ✅. **Rejeitada** `U/rejeitar-campanha.spec.ts:98-107`: sem `criadoEm` (M25 sobreviveu). **Reaberta** `U/editar-campanha.spec.ts:273-281`: sem `criadoEm` (M26 sobreviveu) | ❌ → T45 |

### P1: Alteração de campanha aprovada (CAMP-07, CAMP-08)

| AC | Spec-defined outcome | `file:line` + asserção | Result |
| -- | -------------------- | ---------------------- | ------ |
| AC1 nome, descrição, capa e meta na hora | aplicado, segue `APROVADA`, sem alteração | `E/campanha.spec.ts:424-444` (os 4, incluindo capa). `U/editar-campanha.spec.ts:286-302` (nome e meta). A **capa** não passa pelo caso de uso (ver Criação AC15) | ❌ → T47 |
| AC2 compromisso abre alteração | pendente; campanha `APROVADA` com os valores anteriores | `E/campanha.spec.ts:446-471`; `U/editar-campanha.spec.ts:316-333` (regra aprovada `'1.00'`, pendente `'2.50'`, gravado). M19 morto | ✅ |
| AC3 pública mostra o aprovado | só valores anteriores | `U/buscar-campanha-publica.spec.ts:195-218` | ✅ |
| AC4 segunda alteração | 409 "Já existe uma alteração em análise" | `E/campanha.spec.ts:473-485`; `U/editar-campanha.spec.ts:349-361`, só a classe. **Texto nunca asserido**: M38 sobreviveu | ❌ → T43 |
| AC5 mesmas validações de criação **e submissão** | beneficiada, regra e datas → 422 | Beneficiada, regra e VOs passam pelo mesmo código (`U/editar-campanha.ts:120-227`). Mas a validação de submissão "fim ≤ hoje → 422" (Submissão AC3) **não é aplicada** ao abrir a alteração: `Campanha.abrirAlteracao` (`E/campanha.ts:387-410`) e `EditarCampanhaUseCase` não chamam `fimJaPassouEm`. Nenhum teste exercita validação no caminho `APROVADA` | ❌ → T49 |
| AC6 aprovar alteração | aplica, **registra autor e data-hora da decisão**, encerra a pendência | Aplica: `U/aprovar-alteracao-campanha.spec.ts:140-145` (`compromissoVigente().equals(proposto)`, pendência vazia). Autor só na auditoria (`:150`). `decididoPor`/`decididoEm` da alteração existem só em memória (`E/campanha.spec.ts:521-522`) e se perdem no `salvar` (`E/campanha.ts:298`). `criadoEm` da auditoria não é asserido (M42 sobreviveu) | ❌ → T46, T45 |
| AC7 nova beneficiada indisponível | 409 sem aplicar | `U/aprovar-alteracao-campanha.spec.ts:183-233` (3 casos: compromisso intacto, pendência `EM_ANALISE`, versão, auditoria vazia). M40 morto | ✅ |
| AC8 rejeitar alteração | descarta, mantém `APROVADA` com os anteriores, **persiste o motivo**, **enfileira e-mail** | Mantém: `U/rejeitar-alteracao-campanha.spec.ts:91-94` ✅. **Motivo persistido**: sem evidência na fronteira de persistência. A alteração é descartada antes do `salvar` (`E/campanha.ts:321`), e o `motivo` da auditoria não é asserido (M24 sobreviveu). **E-mail**: sem evidência. O setup não cria empresa nem dono (`:85-99`), e M23 (remover `mailer.enviar`) sobreviveu | ❌ → T44, T46 |
| AC9 id público imutável | igual em toda edição e alteração | `E/campanha.spec.ts:443,470,523,544`; `U/editar-campanha.spec.ts:333`; `U/aprovar-alteracao-campanha.spec.ts:145` | ✅ |
| AC10 auditoria de abertura e decisão | autor, valores anteriores e novos, motivo, data-hora | Abertura `U/editar-campanha.spec.ts:335-346` (autor + só a regra; sem `criadoEm`). Aprovação `U/aprovar-alteracao-campanha.spec.ts:147-164` (autor + só `regraDoacao.tipo`/`percentualCentesimos`; M27 e M42 sobreviveram). Rejeição `U/rejeitar-alteracao-campanha.spec.ts:95-98`: **só `tipo`** (M24 sobreviveu) | ❌ → T44, T45 / ⚠️ SP3 |

### P1: Consulta pública (CAMP-11)

| AC | Spec-defined outcome | `file:line` + asserção | Result |
| -- | -------------------- | ---------------------- | ------ |
| AC1 campanha aprovada de empresa aprovada | 200 com nome, descrição, capa, empresa, beneficiada (nome + tipo), regra, meta, vigência | `U/buscar-campanha-publica.spec.ts:126-143` (`toEqual` exato); causa por nome `:163-166` | ✅ / ⚠️ SP2 |
| AC2 404 idêntico | inexistente, `RASCUNHO`, `EM_ANALISE`, `REJEITADA`, empresa não aprovada, id malformado → mesmo corpo | `U/buscar-campanha-publica.spec.ts:223-283` (6 casos; `toEqual(naoEncontrada)` + `message`). M29 morto; M30 equivalente no domínio (ver Sensor) | ✅ |
| AC3 omitir id, motivo e pendência | ausentes | `U/buscar-campanha-publica.spec.ts:126` (`toEqual` exato reprova chave extra); o tipo `CampanhaPublica` (`U/buscar-campanha-publica.ts:17-27`) não tem esses campos | ✅ |
| AC4 situação | `NAO_INICIADA` se início > hoje; senão `EM_ANDAMENTO` | `U/buscar-campanha-publica.spec.ts:169-180` (amanhã), `:182-193` (hoje). M31 morto | ✅ |

**Status**: ❌ Gaps presentes. Dos **46** critérios P1 com regra de domínio, 33 batem com a saída da spec e **13 têm lacuna**: Criação AC7, AC11, AC13, AC15; Submissão AC5, AC10, AC15; Alteração AC1, AC4, AC5, AC6, AC8, AC10. Criação AC14 é infra. ⚠️ 3 spec-precision gaps (abaixo).

---

## Edge Cases

- [x] Beneficiada indisponível com campanha em análise → 409: `U/aprovar-campanha.spec.ts:139-171`. Com alteração em análise: `U/aprovar-alteracao-campanha.spec.ts:183-233`.
- [x] Beneficiada de campanha `APROVADA` deixa de existir → campanha segue publicada: por construção (`BuscarCampanhaPublicaUseCase` não consulta a disponibilidade).
- [x] Empresa suspensa → 404 na pública sem mudar o estado: `U/buscar-campanha-publica.spec.ts:256-266`.
- [ ] Dois admins decidindo ao mesmo tempo → 409 na segunda: coberto em aprovar campanha (`aprovar-campanha.spec.ts:193-204`), rejeitar campanha (`rejeitar-campanha.spec.ts:188-200`) e aprovar alteração (`aprovar-alteracao-campanha.spec.ts:235-256`). **Rejeitar alteração não tem teste** (M22 sobreviveu). → T44
- [x] Submissão duplicada → 409 e uma só submissão: `U/submeter-campanha.spec.ts:282-292` (`versao` 1, uma auditoria).
- [x] Edição concorrente com decisão → 409: `U/editar-campanha.spec.ts:376-393` (CAS contra o double). M44 morto.
- [x] HTML na descrição guardado como texto: `E/descricao-campanha.spec.ts:35-46`.

---

## Discrimination Sensor

**Profundidade**: P0 expandido (regra de negócio central). Rodou num `git worktree add --detach <scratchpad>/wt-dominio HEAD` (`d756ffa`), com `node_modules` como link simbólico para o da árvore real. Cada mutante foi aplicado por script, com substituição exata e exigência de uma única ocorrência, testado com `npx jest --silent <spec ou diretório>` e revertido com `git checkout --` antes do próximo. Nenhuma morte veio de erro de compilação. O baseline de contagem rodou num segundo worktree em `397f8bc`. No fim, os links foram apagados e os worktrees removidos com `git worktree remove --force` + `git worktree prune`. **Isolamento**: o `git status --porcelain` da árvore real estava vazio antes e continuou vazio depois (`diff` idêntico). `git stash` não foi usado.

| # | File:line | Mutação | Resultado (asserção que matou) |
| - | --------- | ------- | ------------------------------ |
| M1 | `E/valor-monetario.ts:28` | `centavos < MINIMO` → `< 0` | ✅ `valor-monetario.spec` "error for \"0\"" |
| M2 | `E/valor-monetario.ts:26` | `padEnd` → `padStart` | ✅ "convert \"1.5\" to 150" |
| M3 | `E/valor-monetario.ts:5` | regex aceita 3 casas | ✅ "error for \"1.234\"" |
| M4 | `E/percentual.ts:26` | teto 10000 → 10001 | ✅ rejeição de `"100.01"` |
| M5 | `E/nome-campanha.ts:18` | sem `trim` | ✅ "should trim surrounding spaces" |
| M6 | `E/nome-campanha.ts:20` | `> 80` → `> 81` | ✅ "reject a name with 81" |
| M7 | `E/descricao-campanha.ts:11` | `>` → `>=` | ✅ "exatos 2000 caracteres" |
| **M8** | `E/vigencia.ts:22` | aceita fim **anterior** ao início | ❌ **sobreviveu** → T41 |
| M9 | `E/vigencia.ts:40` | `fimJaPassouEm` sem o caso igual | ✅ `campanha.spec` "end date is today" |
| M10 | `E/data-calendario.ts:31` | fuso `UTC` | ✅ `hojeEm` madrugada |
| M11 | `E/data-calendario.ts:18-21` | sem a checagem de round-trip | ✅ "30 de fevereiro" |
| M12 | `E/regra-doacao.ts:42-44` | `POR_UNIDADE` aceita `percentual` | ✅ `criar-campanha.spec` regra inválida |
| **M13** | `E/campanha.ts:266` | motivo `< 20` → `< 21` | ❌ **sobreviveu** → T42 |
| M14 | `E/campanha.ts:416` | `REJEITADA` não volta a `RASCUNHO` | ✅ `campanha.spec:186` |
| M15 | `E/campanha.ts:295` | `aprovarAlteracao` não copia a beneficiada | ✅ `aprovar-alteracao-campanha.spec:180` |
| M16 | `E/campanha.ts:390-392` | sem guarda de alteração pendente | ✅ `campanha.spec:483` |
| M17 | `E/campanha.ts:234` | `submeter` ignora fim vencido | ✅ `campanha.spec:245` |
| M18 | `E/campanha.ts:273` | `rejeitar` não grava o motivo | ✅ `rejeitar-campanha.spec:94` |
| M19 | `E/campanha.ts:205` | `APROVADA` aplica o compromisso direto | ✅ `campanha.spec:446` |
| M20 | `test/repositories/in-memory-campanha-repository.ts:81` | CAS desligado no double | ✅ `aprovar-campanha.spec:193` |
| M21 | `U/aprovar-campanha.ts:51` | ignora beneficiada indisponível | ✅ `aprovar-campanha.spec:139` |
| **M22** | `U/rejeitar-alteracao-campanha.ts:72` | ignora `salvar` = `false` | ❌ **sobreviveu** → T44 |
| **M23** | `U/rejeitar-alteracao-campanha.ts:98-102` | remove `mailer.enviar` | ❌ **sobreviveu** → T44 |
| **M24** | `U/rejeitar-alteracao-campanha.ts:84-85` | auditoria sem `motivo` e com o proposto = anterior | ❌ **sobreviveu** → T44 |
| **M25** | `U/rejeitar-campanha.ts:76` | `criadoEm: new Date(0)` | ❌ **sobreviveu** → T45 |
| **M26** | `U/editar-campanha.ts:286` | `CAMPANHA_REABERTA` com `criadoEm: new Date(0)` | ❌ **sobreviveu** → T45 |
| **M27** | `U/aprovar-alteracao-campanha.ts:107` | `compromissoNovo` com beneficiada e vigência do anterior | ❌ **sobreviveu** → T45 |
| M28 | `U/editar-campanha.ts:214-217` | nunca consulta a beneficiada | ✅ `editar-campanha.spec:217` |
| M29 | `U/buscar-campanha-publica.ts:73` | ignora empresa não aprovada | ✅ caso "suspensa" |
| M30 | `U/buscar-campanha-publica.ts:59` | sem checagem de UUID | ⚪ **equivalente** (abaixo) |
| M31 | `U/buscar-campanha-publica.ts:109` | situação calculada por `inicio < hoje` | ✅ "starts today" |
| M32 | `U/listar-fila-campanhas.ts:70` | ordem invertida | ✅ ordem intercalada |
| M33 | `U/listar-fila-campanhas.ts:80-82` | alteração mostra os valores vigentes | ✅ item `ALTERACAO` |
| M34 | `U/consultar-campanha-da-empresa.ts:123` | sem checagem de dona | ✅ "belongs to another empresa" |
| M35 | `U/submeter-campanha.ts:83` | ignora beneficiada indisponível | ✅ instituição suspensa |
| M36 | `U/rejeitar-campanha.ts:91` | e-mail com `motivo: ''` | ✅ `rejeitar-campanha.spec:109` |
| **M37** | `errors/campanha-em-analise.error.ts:7` | mensagem trocada | ❌ **sobreviveu** → T43 |
| **M38** | `errors/alteracao-ja-pendente.error.ts:7` | mensagem trocada | ❌ **sobreviveu** → T43 |
| **M39** | `errors/invalid-rule-value.error.ts:7` | mensagem trocada (suíte unit inteira) | ❌ **sobreviveu** → T43 |
| M40 | `U/aprovar-alteracao-campanha.ts:72` | nunca confere a nova beneficiada | ✅ instituição suspensa |
| M41 | `U/editar-campanha.ts:292` | não audita a abertura | ✅ `editar-campanha.spec:335` |
| **M42** | `U/aprovar-alteracao-campanha.ts:109` | `criadoEm: new Date(0)` | ❌ **sobreviveu** → T45 |
| M43 | `U/criar-campanha.ts:181` | nunca consulta a beneficiada | ✅ instituição suspensa |
| M44 | `U/editar-campanha.ts:267-269` | ignora `salvar` = `false` | ✅ edição concorrente |

**Result**: 44 injetados, **31 mortos**, **12 sobreviventes**, 1 equivalente. Sensor ❌ FAIL.

**Por que M30 é equivalente no domínio.** Com o double, `findByIdPublico('nao-e-um-uuid')` devolve `null`, e o caso de uso responde o mesmo `ResourceNotFoundError` com ou sem a checagem de formato. A checagem só ganha efeito observável no Postgres, onde um texto que não é UUID numa coluna `uuid` faria a consulta falhar. **Nota para a T38**: o e2e precisa cobrir id malformado → 404 com o mesmo corpo.

---

## Code Quality

| Princípio | Status | Nota |
| --------- | ------ | ---- |
| AD-017: valor restrito → VO | ✅ | Os 9 VOs do design existem e validam no lugar certo. Nenhum caso de uso refaz regra de VO |
| AD-017: regra de estado → entidade | ✅ | Transições, campos pendentes, motivo e alteração pendente ficam na `Campanha` e na `AlteracaoCompromisso`, sem setter público (testado em `E/campanha.spec.ts:596-604` e `E/alteracao-compromisso.spec.ts:176-194`) |
| AD-017: regra entre registros → caso de uso | ✅ | Empresa aprovada, beneficiada disponível, dona e "hoje" em SP ficam nos casos de uso |
| Aderência ao design | ❌ | (a) A alteração decidida não chega ao `salvar`, e o design não diz como a T29 grava a decisão em `campanha_alteracao` (T46). (b) Dois `CampanhaDetalhe` incompatíveis (T48). (c) `EditarCampanha` sem capa (T47). (d) Mensagem de `CamposPendentesError` diferente do design (T43) |
| Código mínimo / sem duplicação | ❌ | `paraDecimal` aparece 4 vezes (`U/campanha-detalhe.ts:47`, `U/consultar-campanha-da-empresa.ts:72`, `U/listar-fila-campanhas.ts:39`, `U/buscar-campanha-publica.ts:41`). `descreverCompromisso` aparece 3 vezes em **duas formas**: string decimal em `U/campanha-detalhe.ts:70` e centavos em `U/aprovar-alteracao-campanha.ts:23` e `U/rejeitar-alteracao-campanha.ts:23`. Por isso os registros de auditoria do mesmo agregado gravam valores em formatos diferentes. → T48 |
| Sem flexibilidade especulativa | ⚠️ | `Campanha.verificarSePodeEditar` (`E/campanha.ts:376-382`) tem um ramo `TransicaoInvalidaError` inalcançável com os 4 estados atuais (pensado para `ENCERRADA`, CAMP-09). É cosmético e não gera task |
| Mudanças cirúrgicas | ✅ | Todo o diff está na superfície de domínio; nada fora de campanhas mudou |
| Segue padrões existentes | ✅ | Either, `@Injectable`, doubles com cópia, `RepositorioComGravacaoConcorrente` (lição L-006 aplicada). Mistura de títulos de teste em inglês e português (cosmético) |
| Spec-anchored outcome check | ❌ | Mensagens literais de AC7, Submissão AC5 e Alteração AC4 não são conferidas (lição L-001 se repete) |
| Cobertura por camada (domínio 1:1; "nada gravado" em todo erro) | ❌ | `RejeitarAlteracao` sem e-mail, sem auditoria completa e sem CAS. `IMAGEM_CAMPANHA` sem teste. Nos demais casos de uso, "nada gravado" está conferido em todos os caminhos de erro (versão, estado e auditoria) |
| Todo teste mapeia para AC / edge / Done-when | ✅ | Nenhum teste órfão encontrado |
| Guidelines documentadas | ✅ | Nenhuma no projeto; strong defaults da Test Coverage Matrix de `tasks.md` |
| Senior engineer aprovaria? | ❌ | Não antes de T44, T46, T47, T48 e T49 |

---

## Spec-Precision Gaps

| # | AC | Problema | Efeito |
| - | -- | -------- | ------ |
| SP1 | Criação AC5, AC6, AC8, AC11; Submissão AC2, AC3 | A spec define só "HTTP 422", sem o texto. O design fixa as mensagens (`ValorMonetarioInvalidoError`, `PercentualInvalidoError`, `VigenciaInvalidaError`, `VigenciaVencidaError`, `CamposPendentesError`). Os testes ancoram no design em AC5 e AC6 e não ancoram em AC11 nem em Submissão AC3 | Não bloqueia. A T43 alinha as mensagens ao design; o dono da spec decide se as copia para os ACs |
| SP2 | Submissão AC6 ("empresa"); Consulta pública AC1 ("nome da empresa", "imagem de capa quando houver") | Termo guarda-chuva. O design resolve como `nomeFantasia` e `temCapa: boolean` | Não bloqueia; a implementação segue o design |
| SP3 | Alteração AC10 ("valores anteriores e novos") | A spec não diz o formato do retrato na auditoria. A abertura grava string decimal e a decisão grava centavos | Não bloqueia sozinho; a T48 unifica o formato |

---

## Fix Plans

Tasks humanas (AD-021): o agente não escreve código em `src/domain/**`, `test/repositories/**` ou `test/factories/**` desta feature. Formato de `tasks.md`. Prioridade: Blocker > Major > Minor.

### T41: `Vigencia` — fim anterior ao início (Minor)

**What**: Cobrir o ramo "fim anterior ao início" da vigência, que hoje só é testado no caso igual.
**Where**: `src/domain/fivo/entities/vigencia.spec.ts`; `src/domain/fivo/application/use-cases/criar-campanha.spec.ts`
**Depends on**: None
**Requirement**: CAMP-01 (Criação AC11)
**Autor**: 👤 humano

**Done when**:

- [ ] `vigencia.spec.ts` tem caso com fim um dia **antes** do início → `isLeft()` incondicional + `toBeInstanceOf(VigenciaInvalidaError)` + `status` 422 + mensagem "A data de fim deve ser posterior à data de início"
- [ ] `criar-campanha.spec.ts` tem o mesmo caso pelo caso de uso, com "nada gravado"
- [ ] Mutante M8 (`E/vigencia.ts:22`, remover `|| fim.ehAnteriorA(inicio)`) morre

**Tests**: unit
**Gate**: quick

### T42: `Campanha.rejeitar` — limite de 20 caracteres nos dois lados (Minor)

**What**: Testar em `Campanha.rejeitar` o motivo de exatamente 20 caracteres (aceito) e de 19 com espaços nas pontas (recusado). Hoje isso só é testado em `AlteracaoCompromisso`.
**Where**: `src/domain/fivo/entities/campanha.spec.ts`
**Depends on**: None
**Requirement**: CAMP-05 (Submissão AC10)
**Autor**: 👤 humano

**Done when**:

- [ ] `'a'.repeat(20)` → `REJEITADA` e `motivoUltimaRejeicao` igual ao texto
- [ ] `` `   ${'a'.repeat(19)}   ` `` → `MotivoInsuficienteError`, estado `EM_ANALISE`
- [ ] Mutante M13 (`E/campanha.ts:266`, `< 20` → `< 21`) morre

**Tests**: unit
**Gate**: quick

### T43: Mensagens literais da spec e de `CamposPendentesError` (Major)

**What**: Conferir o texto exato das mensagens que a spec cita e alinhar `CamposPendentesError` ao design.
**Where**: `src/domain/fivo/application/errors/campos-pendentes.error.ts`; `src/domain/fivo/entities/regra-doacao.spec.ts`; `src/domain/fivo/entities/campanha.spec.ts`; `src/domain/fivo/application/use-cases/editar-campanha.spec.ts`; `src/domain/fivo/application/use-cases/submeter-campanha.spec.ts`
**Depends on**: None
**Requirement**: CAMP-02 (Criação AC7), CAMP-05 (Submissão AC2, AC5), CAMP-08 (Alteração AC4)
**Autor**: 👤 humano

**Done when**:

- [ ] `regra-doacao.spec.ts` confere `status` 422 e `message` "O Valor da regra deve corresponder à regra selecionada." (com o ponto final)
- [ ] `editar-campanha.spec.ts` confere `message` "Campanha em análise não pode ser editada" e "Já existe uma alteração em análise", com `status` 409
- [ ] `CamposPendentesError.message` é exatamente "Preencha os campos obrigatórios antes de enviar para análise", e a lista fica só em `campos`. `campanha.spec.ts:232-240` troca o `toContain(campo)` sobre a mensagem por `message).toBe(...)` + `campos).toEqual([...])`
- [ ] Mutantes M37, M38 e M39 morrem

**Tests**: unit
**Gate**: quick

### T44: `RejeitarAlteracaoCampanhaUseCase` — e-mail, auditoria completa e concorrência (Major)

**What**: Reescrever o setup do spec com empresa e usuário dono, e conferir o efeito de cada ramo pelo valor.
**Where**: `src/domain/fivo/application/use-cases/rejeitar-alteracao-campanha.spec.ts`
**Depends on**: T46 (a asserção de motivo persistido usa o contrato novo)
**Requirement**: CAMP-08 (Alteração AC8, AC10; edge case de decisão simultânea)
**Autor**: 👤 humano

**Done when**:

- [ ] Sucesso: `mailer.mensagens).toEqual([{ para: <e-mail do dono>, template: TemplateEmail.ALTERACAO_CAMPANHA_REJEITADA, dados: { nomeCampanha, motivo } }])`
- [ ] Sucesso: auditoria com `tipo`, `usuarioId` do admin, `entidadeId`, `dados` completos (compromisso anterior, compromisso proposto e `motivo`) e `criadoEm` igual ao relógio fixado (`jest.useFakeTimers`)
- [ ] Falha do `Mailer` com dono existente: a decisão fica gravada e `console.error` é chamado (a falha precisa ser exercitada de verdade)
- [ ] Concorrência contra o double (`RepositorioComGravacaoConcorrente`) → `TransicaoInvalidaError`, pendência `EM_ANALISE`, auditoria vazia, nenhum e-mail
- [ ] Não-admin, motivo curto e sem pendência: além do estado e da auditoria, `mailer.mensagens` vazio e `versao` inalterada
- [ ] Mutantes M22, M23 e M24 morrem

**Tests**: unit
**Gate**: quick

### T45: Auditoria com data-hora e retrato completo (Minor)

**What**: Conferir `criadoEm` e o retrato inteiro dos compromissos nas auditorias que hoje só conferem tipo ou autor.
**Where**: `src/domain/fivo/application/use-cases/rejeitar-campanha.spec.ts`; `editar-campanha.spec.ts`; `aprovar-alteracao-campanha.spec.ts`
**Depends on**: T48 (formato único do retrato)
**Requirement**: CAMP-06 (Submissão AC15), CAMP-08 (Alteração AC6, AC10)
**Autor**: 👤 humano

**Done when**:

- [ ] `CAMPANHA_REJEITADA`, `CAMPANHA_REABERTA`, `ALTERACAO_CAMPANHA_ABERTA` e `ALTERACAO_CAMPANHA_APROVADA` conferem `criadoEm` igual ao relógio fixado
- [ ] `ALTERACAO_CAMPANHA_ABERTA` e `ALTERACAO_CAMPANHA_APROVADA` conferem o retrato completo (beneficiada, regra e vigência) do anterior e do novo com `toEqual`, sem `objectContaining`
- [ ] Mutantes M25, M26, M27 e M42 morrem

**Tests**: unit
**Gate**: quick

### T46: Persistir a alteração decidida (Blocker)

**What**: Hoje `aprovarAlteracao` e `rejeitarAlteracao` põem `alteracaoPendente = null` (`E/campanha.ts:298`, `:321`) antes do `salvar`, e a decisão se perde: status, `decididoPor`, `decididoEm` e `motivo`. O agregado precisa entregar ao repositório a alteração decidida junto com a campanha, para que a T29 grave a linha de `campanha_alteracao` (AD-006c) e libere o índice parcial de "uma pendente". Uma saída possível é uma propriedade da `Campanha` com a última alteração decidida e ainda não gravada, lida pelo `salvar`. A forma fica a critério do grupo, desde que a porta documente o contrato.
**Where**: `src/domain/fivo/entities/campanha.ts`; `src/domain/fivo/application/ports/database/campanha-repository.ts` (JSDoc do `salvar`); `test/repositories/in-memory-campanha-repository.ts`; `campanha.spec.ts`; `aprovar-alteracao-campanha.spec.ts`; `rejeitar-alteracao-campanha.spec.ts`
**Depends on**: None
**Requirement**: CAMP-08 (Alteração AC6, AC8), AD-006c
**Autor**: 👤 humano. A emenda de `design.md` (§`Campanha`, §Portas e Data Models) e da Done-when da T29 é feita pelo agente no handoff, porque humanos não editam specs.

**Done when**:

- [ ] Depois de decidir, a campanha continua sem pendência (`alteracaoPendente` vazio, `compromissoVigente()` correto), e a alteração decidida fica acessível ao `salvar` com status, `decididoPor`, `decididoEm` e, na rejeição, `motivo`
- [ ] O double guarda as alterações decididas (histórico), e os specs de aprovar e rejeitar alteração conferem pelo repositório: status `APROVADA`/`REJEITADA`, `decididoPor` = admin, `decididoEm` igual ao relógio fixado e `motivo` literal na rejeição
- [ ] Uma nova alteração aberta depois da decisão continua aceita (`E/campanha.spec.ts:563-574` segue verde)
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick

### T47: `EditarCampanhaUseCase` — capa (Major)

**What**: Aceitar `capaArquivoId` na edição, para que a T34 (`PUT /campanhas/:id/capa`) troque a capa pelo caso de uso, com o portão de empresa aprovada, a checagem de dona, o 409 em análise e o CAS.
**Where**: `src/domain/fivo/application/use-cases/editar-campanha.ts` + spec
**Depends on**: None
**Requirement**: CAMP-01 (Criação AC15), CAMP-07 (Alteração AC1)
**Autor**: 👤 humano

**Done when**:

- [ ] `EditarCampanhaUseCaseRequest.capaArquivoId?: string`, repassado a `editarTextos`
- [ ] Rascunho e `APROVADA`: a capa é aplicada e gravada (`findById` mostra o id novo), sem abrir alteração e sem auditoria
- [ ] `EM_ANALISE` → `CampanhaEmAnaliseError`, nada gravado
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick

### T48: Um só read model de detalhe e um só retrato de compromisso (Major)

**What**: A T19 exige o mesmo read model da T21, mas há dois `CampanhaDetalhe` incompatíveis (`U/campanha-detalhe.ts:31` e `U/consultar-campanha-da-empresa.ts:42`). Unificar num só módulo, usado pela edição e pela consulta, e remover as cópias de `paraDecimal` e `descreverCompromisso`, para que toda auditoria do agregado use o mesmo formato.
**Where**: `src/domain/fivo/application/use-cases/campanha-detalhe.ts`, `consultar-campanha-da-empresa.ts`, `editar-campanha.ts`, `listar-fila-campanhas.ts`, `buscar-campanha-publica.ts`, `aprovar-alteracao-campanha.ts`, `rejeitar-alteracao-campanha.ts` + specs afetados
**Depends on**: None
**Requirement**: CAMP-01 (Criação AC17), CAMP-08 (Alteração AC10); Done-when da T19
**Autor**: 👤 humano

**Done when**:

- [ ] Existe uma única interface `CampanhaDetalhe`, devolvida por `EditarCampanhaUseCase` e por `ConsultarCampanhaDaEmpresaUseCase`. Um teste da edição confere o detalhe com `toEqual` idêntico ao da consulta para a mesma campanha
- [ ] `paraDecimal` e o retrato do compromisso têm uma única definição. `ALTERACAO_CAMPANHA_ABERTA`, `_APROVADA` e `_REJEITADA` gravam o mesmo formato
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick

### T49: Alteração pendente com data de fim vencida (Major)

**What**: A Alteração AC5 pede que a alteração passe pelas mesmas validações de datas da submissão. Abrir uma alteração cuja vigência proposta tenha fim ≤ hoje (America/Sao_Paulo) precisa devolver `VigenciaVencidaError` (422), sem gravar.
**Where**: `src/domain/fivo/entities/campanha.ts` (`editarCompromisso`/`abrirAlteracao` recebendo `hoje`) ou `src/domain/fivo/application/use-cases/editar-campanha.ts`, a critério do grupo seguindo o AD-017; specs correspondentes
**Depends on**: None
**Requirement**: CAMP-08 (Alteração AC5)
**Autor**: 👤 humano

**Done when**:

- [ ] Campanha `APROVADA` + vigência proposta com fim = hoje em SP (fake timers no limite UTC/SP) → `VigenciaVencidaError`, sem pendência, `versao` e auditoria intactas
- [ ] Fim = amanhã em SP → alteração aberta
- [ ] Um teste de validação de VO (regra inválida) no caminho `APROVADA` → 422 sem gravar
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick

### T50: `Arquivo` — testes de `IMAGEM_CAMPANHA` (Major)

**What**: Cumprir a Done-when da T11, que não tem nenhum teste.
**Where**: `src/domain/fivo/entities/arquivo.spec.ts`
**Depends on**: None
**Requirement**: CAMP-01 (Criação AC13)
**Autor**: 👤 humano

**Done when**:

- [ ] PNG e JPEG aceitos; SVG e PDF rejeitados com o erro de formato
- [ ] 5 MB exatos aceitos; 5 MB + 1 byte rejeitado
- [ ] Imagem menor que 512×512 aceita (sem checagem de dimensão)
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick

**Re-verificação**: depois de T41–T50, rodada 2 deste gate. Os mutantes M8, M13, M22–M27, M37–M39 e M42 rodam de novo, junto com mutantes novos sobre T46–T49.

---

## Requirement Traceability Update

`spec.md` não foi editado. Status proposto:

| Requirement | Status anterior | Status proposto |
| ----------- | --------------- | --------------- |
| CAMP-01 | In Tasks | ❌ Needs Fix (T41, T47, T48, T50) |
| CAMP-02 | In Tasks | ❌ Needs Fix (T43) |
| CAMP-03 | In Tasks | ✅ Domínio verificado · infra em Tasks |
| CAMP-04 | In Tasks | ✅ Domínio verificado · infra em Tasks |
| CAMP-05 | In Tasks | ❌ Needs Fix (T42, T43) |
| CAMP-06 | In Tasks | ❌ Needs Fix (T45) |
| CAMP-07 | In Tasks | ❌ Needs Fix (T47) |
| CAMP-08 | In Tasks | ❌ Needs Fix (T43, T44, T45, T46, T48, T49) |
| CAMP-11 | In Tasks | ✅ Domínio verificado · infra em Tasks (T38 cobre id malformado no Postgres) |
| CAMP-09, CAMP-10 | Deferred | Deferred |

---

## Summary

**Overall**: ❌ Not Ready. O domínio P1 de `campanhas` não passa o gate de handoff do AD-021, e a Fase 7 (T28–T40) continua bloqueada.

**Spec-anchored check**: 46 critérios P1 de domínio avaliados. 33 batem com a saída da spec e 13 têm lacuna. 3 spec-precision gaps sinalizados.
**Sensor**: 44 injetados, 31 mortos, 12 sobreviventes, 1 equivalente (M30).
**Gate**: tsc 0 · eslint 0 · unit 566/566 (335 → 566).

**O que funciona**: VOs de limite (dinheiro e percentual sem ponto flutuante, nome com trim, data com round-trip e fuso de SP); máquina de estados com "nada gravado" em cada erro; CAS por `versao` provado contra o double em editar, aprovar, rejeitar e aprovar alteração; fila com ordem intercalada; consulta pública com 404 idêntico nos 6 casos e omissão provada por `toEqual` exato; `RejeitarCampanha` com e-mail conferido pelo valor.

**Próximos passos**: (1) o grupo executa T46 primeiro (bloqueador), depois T44, T47, T48, T49 e T50, e por fim T41, T42, T43 e T45; (2) o agente emenda `design.md` e a Done-when da T29 conforme a T46; (3) rodada 2 desta verificação.
