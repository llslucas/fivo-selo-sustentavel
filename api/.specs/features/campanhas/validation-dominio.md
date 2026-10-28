**Verdict**: FAIL

# Campanhas — Validação do domínio, rodada 2 (gate de handoff AD-021)

**Veredito**: ❌ **FAIL**. A Fase 6b fez o que prometeu: os 12 sobreviventes da rodada 1 morreram, o bloqueador estrutural (T46) está resolvido com um contrato de porta coerente, e 11 dos 13 ACs com lacuna fecharam. O gate `quick` está verde (tsc 0, eslint 0, unit 595/595), e nenhum teste foi apagado ou enfraquecido. O handoff para a Fase 7 continua **bloqueado** por quatro mutantes sobreviventes, todos com efeito observável:

1. **Formatação de dinheiro (N8, Major).** `paraDecimal` (`U/campanha-detalhe.ts:65`), agora a definição única de toda a feature (T48), aceita `padStart` → `padEnd` sem falhar nenhum teste. Com o mutante, R$ 1,05 sai como `"1.50"` no detalhe, na fila, na consulta pública e na auditoria. Nenhum teste usa fração com zero à esquerda.
2. **Checagem de fim vencido sobre o compromisso mesclado (N14, Major).** O design emendado (`design.md:158`, `3c03bb3`) manda checar a vigência do compromisso **mesclado**. Trocar por uma checagem só da vigência enviada sobrevive: nenhum teste abre alteração de regra ou beneficiada numa campanha aprovada cuja vigência atual já venceu. Alteração AC5 fica com um ramo sem evidência.
3. **Data-hora da aprovação da campanha (N23, N24, Minor).** `Campanha.aprovar` com `decididoEm = new Date(0)` e a auditoria `CAMPANHA_APROVADA` com `criadoEm: new Date(0)` sobrevivem. Os testes só conferem `toBeInstanceOf(Date)`. A rodada 1 deixou passar essas duas (marcou Submissão AC7 ✅ e não listou `CAMPANHA_APROVADA` na T45). A correção é desta rodada.

As lacunas viram as tasks **T51–T53** (seção Fix Plans). O contrato da T46 está ok, com duas notas não bloqueantes para a T29.

**Data**: 2026-10-27
**Spec**: `.specs/features/campanhas/spec.md`
**Diff range**: correção `c51d6dc..3c03bb3` (11 commits, um por task + emenda do design; 24 arquivos, +995/−367). Domínio total `397f8bc..3c03bb3`.
**Verifier**: sub-agente independente (autor ≠ verificador), somente leitura sobre `src/` e `test/`. Escreve só este arquivo e o que `lessons.py` gerar.
**Rodada**: 2 de 3. Escopo: P1 do `api` (CAMP-01…08, CAMP-11 → T1–T27 + T41–T50). CAMP-09, CAMP-10 e `web` ficam fora. Sem UAT (backend). Gate e2e não rodado (infra ainda não existe).

Caminhos abreviados: `E/` = `src/domain/fivo/entities/`, `U/` = `src/domain/fivo/application/use-cases/`, `ER/` = `src/domain/fivo/application/errors/`.

---

## Histórico

| Rodada | Diff | Verdict | Resumo |
| ------ | ---- | ------- | ------ |
| 1 | `397f8bc..d756ffa` | ❌ FAIL | Gate verde (566 unit). 46 ACs P1 de domínio: 33 ✅, 13 com lacuna. Sensor: 44 mutantes, 31 mortos, 12 sobreviventes (M8, M13, M22–M27, M37–M39, M42), 1 equivalente (M30). Bloqueador: a alteração decidida sumia do agregado antes do `salvar`. Abriu T41–T50 (Fase 6b) |
| 2 | `c51d6dc..3c03bb3` | ❌ FAIL | Este relatório. 43/46 ✅. Sensor: 38 mutantes, 33 mortos, 4 sobreviventes, 1 equivalente. Abre T51–T53 |

---

## Gate Check

- **Gate command** (`tasks.md`, Quick): `cd api && npx tsc -p tsconfig.json --noEmit && npx eslint "{src,test}/**/*.ts" && npx jest`. Cada etapa rodou em separado, com a saída em arquivo no scratchpad.

| Etapa | Exit | Resultado |
| ----- | ---- | --------- |
| `tsc --noEmit` | 0 | ok |
| `eslint` | 0 | nenhum erro, nenhum aviso |
| `jest` (unit) | 0 | 63 suites, **595/595**, 0 skip |

- **Contagem de testes**: 335 antes da feature (`397f8bc`, medido na rodada 1) → 566 na rodada 1 → **595** agora (+29 na correção, +260 na feature).
- **Integridade** (`git diff c51d6dc..HEAD -- '*.spec.ts'`): nenhum arquivo apagado; nenhum `it(` removido (26 linhas de teste novas). As asserções removidas foram trocadas por formas **mais fortes**: os `expect.objectContaining` das auditorias viraram `toEqual` com o retrato completo (`U/aprovar-alteracao-campanha.spec.ts:197-208`, `U/editar-campanha.spec.ts:358-370`); o `toContain(campo)` sobre a mensagem de `CamposPendentesError` virou `message).toBe(...)` + `campos).toEqual([...])` (`E/campanha.spec.ts:238-247`); o setup de `rejeitar-alteracao-campanha.spec.ts` ganhou empresa e dono e um `expectNadaGravado` que confere pendência, versão, auditoria, e-mail e histórico. As demais remoções são a troca mecânica da assinatura `editarCompromisso(parcial)` → `editarCompromisso(parcial, hoje)`.

---

## Task Completion

T1–T27: sem mudança de status em relação à rodada 1, exceto pelas tasks que a Fase 6b reabriu (abaixo). T41–T50 conferidas no código, item a item.

| Task | Status | Evidência |
| ---- | ------ | --------- |
| T41 `Vigencia` fim anterior | ✅ | `E/vigencia.spec.ts:21-33` (422 + mensagem); `U/criar-campanha.spec.ts:211-222` (nada gravado). M8 morto |
| T42 `Campanha.rejeitar` 20 caracteres | ✅ | `E/campanha.spec.ts:336-347` (20 aceito, motivo gravado), `:349-363` (19 + espaços recusado, estado `EM_ANALISE`). M13 morto |
| T43 Mensagens literais | ✅ | `E/regra-doacao.spec.ts:37-42`, `:55-60`; `U/editar-campanha.spec.ts:459-463` e `:558-562` (409 + texto); `ER/campos-pendentes.error.ts:7` com texto fixo, conferido em `E/campanha.spec.ts:240-241` e `U/submeter-campanha.spec.ts:217-220`. M37, M38, M39 mortos |
| T44 `RejeitarAlteracao` | ✅ | E-mail `U/rejeitar-alteracao-campanha.spec.ts:206-218` (`toEqual` exato); auditoria completa com `criadoEm` `:178-204`; falha do Mailer com dono real e `console.error` `:238-263`; CAS contra o double `:265-282`; nada gravado nos três erros `:120-160`. M22, M23, M24 mortos |
| T45 Auditoria data-hora e retrato | ✅ na Done-when | `criadoEm` igual ao relógio em `U/rejeitar-campanha.spec.ts:109`, `U/editar-campanha.spec.ts:291` e `:356`, `U/aprovar-alteracao-campanha.spec.ts:196`. Retrato completo sem `objectContaining` em `U/editar-campanha.spec.ts:358-370` e `U/aprovar-alteracao-campanha.spec.ts:197-208`. M25, M26, M27, M42 mortos. **Mas** a Done-when copiou a lista de lacunas da rodada 1 e não incluiu `CAMPANHA_APROVADA`, que também viola Submissão AC15 (N23) → T53 |
| T46 Alteração decidida | ✅ | `E/campanha.ts:71`, `:163-165`, `:317`, `:341`; porta `ports/database/campanha-repository.ts:10-25`; double `test/repositories/in-memory-campanha-repository.ts:61`, `:88`, `:102-120`; `E/campanha.spec.ts:622-702`; `U/aprovar-alteracao-campanha.spec.ts:211-228`; `U/rejeitar-alteracao-campanha.spec.ts:220-236`; `E/campanha.spec.ts:721-735` segue verde. Ver "Contrato da T46" |
| T47 Capa na edição | ✅ | `U/editar-campanha.ts:61`, `:244-247`; `U/editar-campanha.spec.ts:469-499` (rascunho e `APROVADA`: gravada, sem alteração, sem auditoria, `versao + 1`), `:501-521` (`EM_ANALISE` → 409, nada gravado). N7 morto |
| T48 Read model e retrato únicos | ✅ | Uma só `CampanhaDetalhe` (`U/campanha-detalhe.ts:43`), um só `paraDecimal` (`:63`) e um só `descreverCompromisso` (`:87`); `grep` não acha outra definição. `U/editar-campanha.spec.ts:523-548` confere edição e consulta com `toStrictEqual`. As três auditorias de alteração gravam o mesmo retrato. Resta a diferença de nome de chave (ver "Diferença de nome de chave") e o `paraDecimal` sem teste de fração com zero à esquerda (N8 → T51) |
| T49 Fim vencido na alteração | ✅ na Done-when | `E/campanha.ts:426-430`; `U/editar-campanha.spec.ts:379-398` (fim = hoje em SP na virada UTC → `VigenciaVencidaError`, nada gravado), `:400-422` (fim = amanhã → aberta), `:424-447` (regra inválida → 422, nada gravado); `E/campanha.spec.ts:513-541`. N15, N16, N17 mortos. **Mas** o ramo "vigência vencida que vem do compromisso aprovado" não tem teste (N14 → T52) |
| T50 `IMAGEM_CAMPANHA` | ✅ | `E/arquivo.spec.ts:331-338` (PNG, JPEG), `:340-360` (SVG, PDF: 422 + mensagem literal), `:362-368` (5 MB aceito), `:370-380` (5 MB + 1 recusado, mensagem literal), `:382-386` (300×200 aceito). N19, N20, N21 mortos |

### Desvios relatados pelo autor (julgamento independente)

| # | Desvio | Julgamento |
| - | ------ | ---------- |
| 1 | T49 mudou a assinatura para `editarCompromisso(parcial, hoje)` e tocou `criar-campanha.ts` | **Aceito.** A T49 deixou a escolha entre entidade e caso de uso a critério do grupo; pôr a regra na entidade segue o AD-017 (regra de estado → entidade). A mudança em `U/criar-campanha.ts:205-208` é só a nova assinatura, sem efeito: em `RASCUNHO`, `hoje` é ignorado (`E/campanha.ts:223-233`), o que respeita a spec (data só é checada na submissão). O design (`design.md:156-158`) foi emendado com a assinatura nova |
| 2 | T48 unificou o retrato em string decimal, com chaves ausentes em vez de `null`; sobra `compromissoNovo` × `compromissoProposto` | **Aceito, não bloqueia.** O formato do valor (SP3) está resolvido. A diferença de chave é anterior à correção, tem semântica (na aprovação, o proposto vira o novo vigente) e nenhum consumidor lê `dados` da auditoria. Follow-up abaixo |
| 3 | T45 trocou o fixture de sucesso de `AprovarAlteracaoCampanha` para mudar os três campos | **Aceito e necessário.** Com o fixture antigo (só a regra muda), M27 (novo com beneficiada e vigência do anterior) era indistinguível. O cenário antigo continua coberto em `U/aprovar-alteracao-campanha.spec.ts:211-228`. É um reforço, não um enfraquecimento |
| 4 | T46: `alteracaoDecidida` não é limpa depois do `salvar` | **Aceito.** Ver "Contrato da T46": não há regravação errada nem vazamento por nenhum caminho de caso de uso |

---

## Contrato da T46

**Veredito: ok.**

- **A porta documenta a gravação.** O JSDoc de `salvar` (`ports/database/campanha-repository.ts:10-25`) diz o que grava (campanha com `versao + 1`, `alteracaoDecidida`, `alteracaoPendente`), em que ordem (a decidida **antes** da pendente, para liberar a regra de uma pendente por vez), que as duas gravações são idempotentes pelo `id` e que `false` não grava nada. O design (`design.md:163-164`, `:183`, `:208`, `:278`) e a Done-when da T29 (`tasks.md`, T29) repetem o mesmo contrato, incluindo o e2e com decisão e abertura no mesmo `salvar`.
- **O double reflete o contrato.** Grava a decidida só depois do CAS (N5, que move a gravação para antes do CAS, morre em `U/aprovar-alteracao-campanha.spec.ts:299` e `U/rejeitar-alteracao-campanha.spec.ts:265`). Deduplica pelo `id` (`in-memory-campanha-repository.ts:111-119`). Não reconstrói `alteracaoDecidida` ao ler (`copiar`, `:29-56`), então toda campanha carregada nasce `null`, como diz o design. A ordem "decidida antes da pendente" não tem efeito observável em memória (não há índice parcial); quem prova é o e2e da T29.
- **`alteracaoDecidida` não limpa não causa regravação errada.** Sequência pedida (decidir → `salvar` → abrir nova → `salvar` → decidir de novo → `salvar`) na mesma instância: o segundo `salvar` regrava A1 com os mesmos valores (idempotente pelo `id`) e insere A2 pendente; a segunda decisão troca o slot para A2, e o terceiro `salvar` grava A2. Nada é perdido ou sobrescrito com valor errado. Entre instâncias não há vazamento, porque cada caso de uso carrega a campanha do repositório (slot `null`) e chama `salvar` uma única vez. `E/campanha.spec.ts:682-702` prova que o slot sobrevive à abertura de uma nova alteração (N3, que limpa o slot ao abrir, morre).

**Notas para a T29 (não bloqueiam):**

1. **Slot único.** Duas decisões na mesma instância sem `salvar` entre elas perdem a primeira. Nenhum caso de uso faz isso (uma transição por `salvar`), mas a regra não está escrita. Basta uma linha no JSDoc: "uma decisão por `salvar`".
2. **"Atualiza" × upsert.** O design e a T29 dizem que o `salvar` **atualiza** a linha da decidida pelo `id`; o double faz **upsert**. Uma alteração aberta e decidida na mesma instância, sem `salvar` no meio, não teria linha no Postgres, e o `update` perderia a decisão em silêncio, enquanto o double a registraria. Também não é alcançável por caso de uso. Recomendação: a T29 usa upsert também para a decidida, alinhada ao double.

**N6** (o double sempre acrescenta ao histórico, sem deduplicar) sobrevive e é **equivalente no domínio**: só é observável salvando duas vezes a mesma instância com `alteracaoDecidida` preenchida, e nenhum caso de uso faz isso. A idempotência real fica com o e2e da T29.

---

## Diferença de nome de chave (T48 × Alteração AC10 × SP3)

`ALTERACAO_CAMPANHA_ABERTA` (`U/editar-campanha.ts:311-312`) e `_REJEITADA` (`U/rejeitar-alteracao-campanha.ts:68-69`) gravam `compromissoAnterior` + `compromissoProposto`; `_APROVADA` (`U/aprovar-alteracao-campanha.ts:88-89`) grava `compromissoAnterior` + `compromissoNovo`. O retrato em si é o mesmo (`descreverCompromisso`, string decimal, chaves ausentes).

- **Alteração AC10** pede "valores anteriores e novos": os três eventos gravam os dois, conferidos por `toEqual` (`U/editar-campanha.spec.ts:358-370`, `U/aprovar-alteracao-campanha.spec.ts:197-208`, `U/rejeitar-alteracao-campanha.spec.ts:192-204`). ✅
- **SP3** era sobre o formato do valor (string decimal na abertura, centavos na decisão). Resolvido pela T48. ✅
- **A Done-when da T48** pede "o mesmo formato", e o formato do retrato é o mesmo. O nome da chave do envelope não é formato do retrato e já existia antes da correção.

**Conclusão**: não bloqueia. Fica como follow-up: quem for consultar o histórico por SQL precisa tratar as duas chaves. Se o grupo quiser uniformizar, `compromissoProposto` nos três eventos é a escolha mais barata (dois testes mudam).

---

## Spec-Anchored Acceptance Criteria

Legenda: ✅ evidência no valor da spec; ❌ sem evidência ou evidência parcial; ⚠️ spec-precision gap; **infra — T28+** = AC só de HTTP, persistência ou OpenAPI (não conta como lacuna). "r1" indica o resultado da rodada 1.

### P1: Criação da campanha (CAMP-01…04)

| AC | Spec-defined outcome | `file:line` + asserção | Result |
| -- | -------------------- | ---------------------- | ------ |
| AC1 empresa não aprovada | 403 "Cadastro ainda não aprovado", nada gravado, em criar, editar e submeter | `U/criar-campanha.spec.ts:121-137` (`message).toBe('Cadastro ainda não aprovado')` + `items).toHaveLength(0)`); `U/submeter-campanha.spec.ts:162-184`; `U/editar-campanha.spec.ts:124-142` (`NotAllowedError`, nome e versão intactos, auditoria vazia). 403 = mapeamento (infra) | ✅ |
| AC2 cria `RASCUNHO` | estado `RASCUNHO`; id interno + id público | `E/campanha.spec.ts:94-110` `status).toBe(RASCUNHO)`; `U/criar-campanha.spec.ts:79-95` `idPublico).not.toBe(id)` | ✅ |
| AC3 nome 3–80 com trim | 422 "O nome deve ter entre 3 e 80 caracteres" | `E/nome-campanha.spec.ts:15-48` (sem mudança desde r1) | ✅ |
| AC4 descrição ≤ 2000 | 422 "A descrição deve ter no máximo 2000 caracteres" | `E/descricao-campanha.spec.ts:5-33` (sem mudança) | ✅ |
| AC5 valor por unidade | 0,01–999.999,99, ≤ 2 casas, senão 422 | `E/valor-monetario.spec.ts:5-49` (sem mudança) | ✅ / ⚠️ SP1 |
| AC6 percentual | 0,01–100,00, ≤ 2 casas, senão 422 | `E/percentual.spec.ts:5-38` (sem mudança) | ✅ / ⚠️ SP1 |
| AC7 valor do outro tipo | 422 "O Valor da regra deve corresponder à regra selecionada." | `E/regra-doacao.spec.ts:37-42` e `:55-60` `status).toBe(422)` + `message).toBe('O Valor da regra deve corresponder à regra selecionada.')`. M39 morto | ✅ (r1 ❌) |
| AC8 meta | mesmos limites do valor, 422 | `U/criar-campanha.spec.ts:155-161`; limites via VO de AC5 | ✅ / ⚠️ SP1 |
| AC9 instituição e causa juntas | 422 "Informe exatamente uma beneficiada: instituição ou causa" | `E/beneficiada.spec.ts:27-53`; `U/criar-campanha.spec.ts:266-280` (nada gravado) | ✅ |
| AC10 beneficiada indisponível | 422 "Instituição ou causa indisponível" | `U/criar-campanha.spec.ts:224-250`; mensagem em `U/assegurar-beneficiada-disponivel.spec.ts:111,123,136,147` | ✅ |
| AC11 fim ≤ início | 422 para fim anterior **ou** igual | Igual: `E/vigencia.spec.ts:12-19`, `U/criar-campanha.spec.ts:201-209`. Anterior: `E/vigencia.spec.ts:21-33` (`status).toBe(422)` + mensagem), `U/criar-campanha.spec.ts:211-222` (nada gravado). M8 morto | ✅ (r1 ❌) / ⚠️ SP1 |
| AC12 início no passado | aceito | `E/vigencia.spec.ts:48-51` (`2020-01-01`) | ✅ |
| AC13 capa PNG/JPEG ≤ 5 MB | 422 nos demais | Domínio: `E/arquivo.spec.ts:331-386` (PNG/JPEG aceitos; SVG/PDF → 422 com mensagem; 5 MB aceito; 5 MB + 1 → 422). N19, N20, N21 mortos. Multer e sniff: infra — T31, T34 | ✅ (r1 ❌) |
| AC14 storage fora | 503 "Storage indisponível no momento." | — | infra — T34 |
| AC15 rascunho edita todos os campos | todos os campos editáveis pela dona | `E/campanha.spec.ts:111-150` (7 campos na entidade); `U/editar-campanha.spec.ts:171-211` (6 campos) + `:469-499` (`capaArquivoId` gravado; `depois.capaArquivoId?.toString()).toBe(novaCapa)`). N7 morto | ✅ (r1 ❌) |
| AC16 id público imutável, distinto, não sequencial | `idPublico ≠ id`, UUID v4, igual depois de toda operação | `E/campanha.spec.ts:94-110`; sem setter `:758`; igualdade depois das operações em `E/campanha.spec.ts` (bloco `approved campaign changes`) | ✅ |
| AC17 consulta da dona | todos os campos, estado, motivo, pendência | `U/consultar-campanha-da-empresa.spec.ts:84-133` (`toEqual` completo com motivo, `criadaEm`, `atualizadaEm`), `:183-222` (pendência com valores propostos e `abertaEm`); `U/editar-campanha.spec.ts:523-548` (edição devolve o mesmo modelo, `toStrictEqual`). N11, N12 mortos. Formato decimal com fração < 10: N8 sobreviveu → T51 | ✅ |
| AC18 campanha de outra empresa | 404 sem revelar | `U/consultar-campanha-da-empresa.spec.ts:242-268`; `U/editar-campanha.spec.ts:144-156`; `U/submeter-campanha.spec.ts:186-199` | ✅ |

### P1: Submissão e aprovação (CAMP-05, CAMP-06)

| AC | Spec-defined outcome | `file:line` + asserção | Result |
| -- | -------------------- | ---------------------- | ------ |
| AC1 submeter completo | `EM_ANALISE` + data-hora da submissão | `U/submeter-campanha.spec.ts:118-146` `status).toBe(EM_ANALISE)`, `submetidaEm).toEqual(agora)` | ✅ |
| AC2 campos ausentes | 422 listando todos de uma vez | `U/submeter-campanha.spec.ts:209-229` `status).toBe(422)` + `message).toBe('Preencha os campos obrigatórios antes de enviar para análise')` + `campos).toEqual([...4])`; `E/campanha.spec.ts:225-251`. N18 morto | ✅ |
| AC3 fim ≤ hoje | 422 | `U/submeter-campanha.spec.ts:230-250` (virada UTC/SP); `E/campanha.spec.ts:253-273` | ✅ / ⚠️ SP1 |
| AC4 beneficiada saiu do catálogo | 422 "Instituição ou causa indisponível" | `U/submeter-campanha.spec.ts:252-284` | ✅ |
| AC5 edição em análise | 409 "Campanha em análise não pode ser editada" | `U/editar-campanha.spec.ts:550-564` `status).toBe(409)` + `message).toBe('Campanha em análise não pode ser editada')`; `:501-521` (capa). M37 morto | ✅ (r1 ❌) |
| AC6 fila | `EM_ANALISE` + alterações, mais antiga primeiro, campos e tipo | `U/listar-fila-campanhas.spec.ts:118-147` (`NOVA`, objeto exato), `:149-181` (`ALTERACAO` com propostos), `:183-216` (ordem intercalada), `:218-` (exclusões). N9, N10 mortos | ✅ / ⚠️ SP2 |
| AC7 aprovar | `APROVADA` + **autor e data-hora** da decisão | Estado e autor: `U/aprovar-campanha.spec.ts:100-102`. Data-hora: só `decididoEm).toBeInstanceOf(Date)` (`U/aprovar-campanha.spec.ts:103`, `E/campanha.spec.ts:317`). **N24** (`Campanha.aprovar` grava `new Date(0)`) sobreviveu | ❌ → T53 (r1 ✅, falha de verificação da r1) |
| AC8 apta ao selo | só em `APROVADA` | `U/aprovar-campanha.spec.ts:101`; `E/campanha.spec.ts:413-434` (4 estados) | ✅ |
| AC9 beneficiada indisponível na aprovação | 409, estado inalterado | `U/aprovar-campanha.spec.ts:139-171` | ✅ |
| AC10 motivo < 20 | 422 "O motivo deve ter no mínimo 20 caracteres", estado inalterado | `U/rejeitar-campanha.spec.ts:149-166` (19, nada gravado); `E/campanha.spec.ts:336-347` (20 aceito), `:349-363` (19 + espaços recusado). Mensagem: classe pré-existente, `test/http/admin-instituicoes.e2e-spec.ts:370`. M13 morto | ✅ (r1 ❌) |
| AC11 rejeitar | `REJEITADA`, motivo persistido, e-mail com motivo | `U/rejeitar-campanha.spec.ts:90-123` (status, `motivoUltimaRejeicao`, `mailer.mensagens).toEqual([...])`). Fila `email_pendente`: infra — T30 | ✅ |
| AC12 editar `REJEITADA` | volta a `RASCUNHO`, preserva o motivo | `U/editar-campanha.spec.ts:265-297`; `E/campanha.spec.ts:192-224` | ✅ |
| AC13 só 4 transições | 409 "Operação não permitida para o estado atual" | `E/campanha.spec.ts:293-304`, `:382-412`; `U/aprovar-campanha.spec.ts:173-191`; `U/rejeitar-campanha.spec.ts:184-193`. Mensagem: classe pré-existente, `test/http/admin-causas.e2e-spec.ts:25` | ✅ |
| AC14 não-admin | 403 sem alterar estado | `U/listar-fila-campanhas.spec.ts:106-116`; `U/aprovar-campanha.spec.ts:118-130`; `U/rejeitar-campanha.spec.ts:125-140` | ✅ |
| AC15 auditoria de **toda** transição | autor, anterior, novo, motivo, data-hora | Submetida `U/submeter-campanha.spec.ts:133-144` (`criadoEm: agora`) ✅. Rejeitada `U/rejeitar-campanha.spec.ts:109` `criadoEm).toEqual(agora)` ✅ (M25 morto). Reaberta `U/editar-campanha.spec.ts:291` ✅ (M26 morto). **Aprovada** `U/aprovar-campanha.spec.ts:115` só `criadoEm).toBeInstanceOf(Date)`: **N23** sobreviveu | ❌ → T53 (r1 ❌) |

### P1: Alteração de campanha aprovada (CAMP-07, CAMP-08)

| AC | Spec-defined outcome | `file:line` + asserção | Result |
| -- | -------------------- | ---------------------- | ------ |
| AC1 nome, descrição, capa e meta na hora | aplicado, segue `APROVADA`, sem alteração | `E/campanha.spec.ts:461-482` (os 4); `U/editar-campanha.spec.ts:300-316` (nome e meta), `:469-499` (capa em `APROVADA`: gravada, `status` igual, sem pendência, sem auditoria) | ✅ (r1 ❌) |
| AC2 compromisso abre alteração | pendente; campanha `APROVADA` com os anteriores | `E/campanha.spec.ts:483-512`; `U/editar-campanha.spec.ts:318-377` | ✅ |
| AC3 pública mostra o aprovado | só valores anteriores | `U/buscar-campanha-publica.spec.ts:195-218` | ✅ |
| AC4 segunda alteração | 409 "Já existe uma alteração em análise" | `U/editar-campanha.spec.ts:449-466` `status).toBe(409)` + `message).toBe('Já existe uma alteração em análise')`; `E/campanha.spec.ts:542-558`. M38 morto | ✅ (r1 ❌) |
| AC5 mesmas validações de criação **e submissão** | beneficiada, regra e datas → 422 | Fim informado = hoje em SP → `VigenciaVencidaError` (`U/editar-campanha.spec.ts:379-398`, `E/campanha.spec.ts:513-526`); amanhã → aberta (`:400-422`, `:528-541`); regra inválida → 422 sem gravar (`:424-447`). **Sem evidência** para o compromisso proposto que herda do aprovado uma vigência já vencida (só a regra ou a beneficiada mudam): o design (`design.md:158`) manda checar o compromisso mesclado, e **N14** (checa só a vigência enviada) sobreviveu | ❌ → T52 (r1 ❌) |
| AC6 aprovar alteração | aplica, registra autor e data-hora da decisão, encerra a pendência | Aplica: `U/aprovar-alteracao-campanha.spec.ts:144-209` (`compromissoVigente().equals(proposto)`, pendência vazia, auditoria com `criadoEm).toEqual(agora)`). Decisão gravada: `:211-228` (`status` `APROVADA`, `decididoPor` = admin, `decididoEm).toEqual(agora)`). M42, N1, N4, N25 mortos | ✅ (r1 ❌) |
| AC7 nova beneficiada indisponível | 409 sem aplicar | `U/aprovar-alteracao-campanha.spec.ts:246-297` (3 casos; histórico vazio) | ✅ |
| AC8 rejeitar alteração | descarta, mantém `APROVADA`, persiste o motivo, enfileira e-mail | Mantém: `U/rejeitar-alteracao-campanha.spec.ts:162-177`. Motivo persistido: `:220-236` `decidida.motivo).toBe(MOTIVO_VALIDO)`. E-mail: `:206-218` `toEqual([{ para: EMAIL_DONO, template: ALTERACAO_CAMPANHA_REJEITADA, dados: { nomeCampanha, motivo } }])`; falha do Mailer `:238-263`. M23, N2, N26 mortos | ✅ (r1 ❌) |
| AC9 id público imutável | igual em toda edição e alteração | `U/editar-campanha.spec.ts:349`; `U/aprovar-alteracao-campanha.spec.ts:189`; `U/rejeitar-alteracao-campanha.spec.ts:172`; `E/campanha.spec.ts` (bloco `approved campaign changes`) | ✅ |
| AC10 auditoria de abertura e decisão | autor, anteriores e novos, motivo, data-hora | Abertura `U/editar-campanha.spec.ts:352-370` (autor, entidade, `criadoEm`, retrato completo). Aprovação `U/aprovar-alteracao-campanha.spec.ts:192-208`. Rejeição `U/rejeitar-alteracao-campanha.spec.ts:178-204` (com `motivo`). M24, M27, M42, N13, N22 mortos | ✅ (r1 ❌); SP3 resolvido |

### P1: Consulta pública (CAMP-11)

| AC | Spec-defined outcome | `file:line` + asserção | Result |
| -- | -------------------- | ---------------------- | ------ |
| AC1 campanha aprovada de empresa aprovada | 200 com nome, descrição, capa, empresa, beneficiada, regra, meta, vigência | `U/buscar-campanha-publica.spec.ts:115-144` (`toEqual` exato, ainda verde depois do refactor da T48); causa `:146-167` | ✅ / ⚠️ SP2 |
| AC2 404 idêntico | inexistente, `RASCUNHO`, `EM_ANALISE`, `REJEITADA`, empresa não aprovada, id malformado | `U/buscar-campanha-publica.spec.ts:220-283` | ✅ |
| AC3 omitir id, motivo e pendência | ausentes | `U/buscar-campanha-publica.spec.ts:115-144` (`toEqual` exato); tipo `CampanhaPublica` (`U/buscar-campanha-publica.ts:23-33`) | ✅ |
| AC4 situação | `NAO_INICIADA` se início > hoje; senão `EM_ANDAMENTO` | `U/buscar-campanha-publica.spec.ts:169-193` | ✅ |

**Status**: ❌ Gaps presentes. Dos **46** critérios P1 com regra de domínio, **43** batem com a saída da spec e **3** têm lacuna: Submissão AC7, Submissão AC15 e Alteração AC5. Dos 13 que tinham lacuna na rodada 1, 11 fecharam. Submissão AC7 estava marcado ✅ na rodada 1 por engano. A amostragem dos 33 ✅ da rodada 1 cobriu os casos de uso tocados pela T48 (consultar, fila, pública, editar) e pela T49 (todas as chamadas de `editarCompromisso`): todos continuam ✅, exceto Submissão AC7. Criação AC14 é infra. ⚠️ SP1 e SP2 continuam abertos (não bloqueiam); SP3 foi resolvido.

---

## Edge Cases

- [x] Beneficiada indisponível com campanha em análise → 409: `U/aprovar-campanha.spec.ts:139-171`. Com alteração em análise: `U/aprovar-alteracao-campanha.spec.ts:246-297`.
- [x] Beneficiada de campanha `APROVADA` deixa de existir → segue publicada: por construção (`BuscarCampanhaPublicaUseCase` não consulta disponibilidade).
- [x] Empresa suspensa → 404 na pública sem mudar o estado: `U/buscar-campanha-publica.spec.ts:220-283` (caso "suspensa").
- [x] Dois admins decidindo ao mesmo tempo → 409 na segunda: aprovar campanha `U/aprovar-campanha.spec.ts:193-`, rejeitar campanha `U/rejeitar-campanha.spec.ts:195-`, aprovar alteração `U/aprovar-alteracao-campanha.spec.ts:299-`, **rejeitar alteração `U/rejeitar-alteracao-campanha.spec.ts:265-282`** (novo; M22 morto).
- [x] Submissão duplicada → 409 e uma só submissão: `U/submeter-campanha.spec.ts:286-296`.
- [x] Edição concorrente com decisão → 409: `U/editar-campanha.spec.ts:566-`.
- [x] HTML na descrição guardado como texto: `E/descricao-campanha.spec.ts:35-46`.

---

## Discrimination Sensor

**Profundidade**: P0 expandido. `git worktree add --detach <scratchpad>/wt-dominio-r2 HEAD` (`3c03bb3`), com `node_modules` como link simbólico para o da árvore real. Cada mutante foi aplicado por script, com substituição exata e exigência de uma única ocorrência, testado com a suíte unit inteira (`npx jest --silent`, 595 testes) e revertido com `git checkout --`, com conferência byte a byte do arquivo restaurado. Nenhuma morte veio de erro de compilação (nenhum "Test suite failed to run"). No fim, o link foi apagado, o worktree removido com `git worktree remove --force` e `git worktree prune` rodou. **Isolamento**: o `git status --porcelain` da árvore real estava vazio antes e continuou vazio depois (`diff` idêntico). `git stash` não foi usado.

### Reexecução dos 12 sobreviventes da rodada 1

| # | File:line | Mutação | Resultado (teste que matou) |
| - | --------- | ------- | --------------------------- |
| M8 | `E/vigencia.ts:22` | aceita fim anterior ao início | ✅ `criar-campanha.spec:211`, `vigencia.spec:21` |
| M13 | `E/campanha.ts:284` | motivo `< 20` → `< 21` | ✅ `campanha.spec:336` |
| M22 | `U/rejeitar-alteracao-campanha.ts:57-59` | ignora `salvar` = `false` | ✅ `rejeitar-alteracao-campanha.spec:265` |
| M23 | `U/rejeitar-alteracao-campanha.ts:81` | nunca envia o e-mail | ✅ `rejeitar-alteracao-campanha.spec:206`, `:238` |
| M24 | `U/rejeitar-alteracao-campanha.ts:69-70` | auditoria sem `motivo`, proposto = anterior | ✅ `rejeitar-alteracao-campanha.spec:178` |
| M25 | `U/rejeitar-campanha.ts:76` | `criadoEm: new Date(0)` | ✅ `rejeitar-campanha.spec:90` |
| M26 | `U/editar-campanha.ts:297` | `CAMPANHA_REABERTA` com `new Date(0)` | ✅ `editar-campanha.spec:265` |
| M27 | `U/aprovar-alteracao-campanha.ts:89` | `compromissoNovo` com beneficiada e vigência do anterior | ✅ `aprovar-alteracao-campanha.spec:144` |
| M37 | `ER/campanha-em-analise.error.ts:7` | mensagem trocada | ✅ `editar-campanha.spec:550` |
| M38 | `ER/alteracao-ja-pendente.error.ts:7` | mensagem trocada | ✅ `editar-campanha.spec:449` |
| M39 | `ER/invalid-rule-value.error.ts:7` | sem o ponto final | ✅ `regra-doacao.spec:33`, `:50` |
| M42 | `U/aprovar-alteracao-campanha.ts:91` | `criadoEm: new Date(0)` | ✅ `aprovar-alteracao-campanha.spec:144` |

### Mutantes novos (código de `c51d6dc..HEAD` e amostragem de ACs ✅)

| # | Task | File:line | Mutação | Resultado |
| - | ---- | --------- | ------- | --------- |
| N1 | T46 | `E/campanha.ts:317` | `aprovarAlteracao` não preenche `alteracaoDecidida` | ✅ `campanha.spec:641` |
| N2 | T46 | `E/campanha.ts:341` | `rejeitarAlteracao` não preenche `alteracaoDecidida` | ✅ `campanha.spec:662` |
| N3 | T46 | `E/campanha.ts:426` | abrir alteração limpa o slot da decidida | ✅ `campanha.spec:682` |
| N4 | T46 | `in-memory-campanha-repository.ts:88` | double não grava a decidida | ✅ `rejeitar-alteracao-campanha.spec:220`, `aprovar-alteracao-campanha.spec:211` |
| N5 | T46 | `in-memory-campanha-repository.ts:81` | double grava a decidida antes do CAS | ✅ `aprovar-alteracao-campanha.spec:299`, `rejeitar-alteracao-campanha.spec:265` |
| N6 | T46 | `in-memory-campanha-repository.ts:115` | double sempre acrescenta ao histórico (sem idempotência) | ⚪ **equivalente no domínio** (ver Contrato da T46) |
| N7 | T47 | `U/editar-campanha.ts:245` | capa gravada com id aleatório | ✅ `editar-campanha.spec:469` |
| N8 | T48 | `U/campanha-detalhe.ts:65` | `paraDecimal`: `padStart` → `padEnd` (105 → `"1.50"`) | ❌ **sobreviveu** → T51 |
| N9 | T48 | `U/campanha-detalhe.ts:82` | retrato sem `fim` | ✅ `listar-fila-campanhas.spec:118` e outros 3 |
| N10 | T48 | `U/campanha-detalhe.ts:74` | percentual sai na chave `valor` | ✅ `listar-fila-campanhas.spec:149` e outros 5 |
| N11 | T48 | `U/campanha-detalhe.ts:127` | `atualizadaEm: null` | ✅ `editar-campanha.spec:171` |
| N12 | T48 | `U/campanha-detalhe.ts:123` | `abertaEm` = criação da campanha | ✅ `consultar-campanha-da-empresa.spec:183` |
| N13 | T48 | `U/rejeitar-alteracao-campanha.ts:68` | auditoria: anterior = proposto | ✅ `rejeitar-alteracao-campanha.spec:178` |
| N14 | T49 | `E/campanha.ts:428` | checa só `parcial.vigencia`, não o compromisso mesclado | ❌ **sobreviveu** → T52 |
| N15 | T49 | `E/campanha.ts:428` | `fimJaPassouEm` → `fim < hoje` (aceita fim = hoje) | ✅ `campanha.spec:513`, `editar-campanha.spec:379` |
| N16 | T49 | `E/campanha.ts:428` | checagem desligada | ✅ `campanha.spec:513`, `editar-campanha.spec:379` |
| N17 | T49 | `U/editar-campanha.ts:264` | "hoje" pela data UTC em vez de SP | ✅ `editar-campanha.spec:400` |
| N18 | T43 | `ER/campos-pendentes.error.ts:7` | lista de volta na mensagem | ✅ `campanha.spec:225`, `submeter-campanha.spec:209` |
| N19 | T50 | `E/arquivo.ts:58` | limite da capa 5 MB + 1 | ✅ `arquivo.spec:370` |
| N20 | T50 | `E/arquivo.ts:51` | capa aceita SVG | ✅ `arquivo.spec:340` |
| N21 | T50 | `E/arquivo.ts:65` | capa com checagem de 512×512 | ✅ `arquivo.spec:382` |
| N22 | T45 | `U/aprovar-alteracao-campanha.ts:88` | auditoria: anterior = proposto | ✅ `aprovar-alteracao-campanha.spec:144` |
| N23 | amostra (Submissão AC15) | `U/aprovar-campanha.ts:83` | `CAMPANHA_APROVADA` com `criadoEm: new Date(0)` | ❌ **sobreviveu** → T53 |
| N24 | amostra (Submissão AC7) | `E/campanha.ts:270` | `Campanha.aprovar` grava `decididoEm = new Date(0)` | ❌ **sobreviveu** → T53 |
| N25 | amostra (Alteração AC6) | `E/alteracao-compromisso.ts:86` | `AlteracaoCompromisso.aprovar` com `decididoEm = new Date(0)` | ✅ `aprovar-alteracao-campanha.spec:211` |
| N26 | amostra (Alteração AC8) | `E/alteracao-compromisso.ts:106` | motivo truncado em 20 caracteres | ✅ `campanha.spec:601` |

**Result**: 38 injetados (12 reexecutados + 26 novos), **33 mortos**, **4 sobreviventes** (N8, N14, N23, N24), 1 equivalente (N6). Sensor ❌ FAIL.

**Por que N8, N14, N23 e N24 não são equivalentes.** N8: `ConsultarCampanhaDaEmpresa` com meta R$ 1,05 devolveria `"1.50"`. N14: uma campanha `APROVADA` com fim já vencido e uma edição só da regra abre a alteração no mutante e devolve `VigenciaVencidaError` no original, e o caminho é alcançável por `EditarCampanhaUseCase`. N23 e N24: o registro e a campanha gravariam 1970-01-01 como data-hora da decisão.

---

## Code Quality

| Princípio | Status | Nota |
| --------- | ------ | ---- |
| AD-017: valor restrito → VO; estado → entidade; entre registros → caso de uso | ✅ | A checagem de fim vencido da T49 ficou na entidade (`E/campanha.ts:426-430`), e "hoje" em SP vem do caso de uso (`U/editar-campanha.ts:262-265`). O slot da decidida é estado do agregado |
| Aderência ao design | ✅ | Design emendado (`design.md:156-164`, `:183`, `:208`, `:278`) e Done-when da T29 batem com o código. Divergência menor "atualiza" × upsert: nota para a T29 |
| Código mínimo / sem duplicação | ✅ | `paraDecimal`, `descreverRegra`, `descreverVigencia` e `descreverCompromisso` têm uma definição só (`U/campanha-detalhe.ts:63-98`). As 4 cópias e as 2 formas da rodada 1 sumiram |
| Mudanças cirúrgicas | ✅ | 24 arquivos, todos na superfície do domínio de campanhas ou nas specs. `criar-campanha.ts` mudou só para a nova assinatura |
| Segue padrões existentes | ✅ | `RepositorioComGravacaoConcorrente` reaproveitado na rejeição de alteração (L-006); fake timers no limite UTC/SP; `expectNadaGravado` |
| Spec-anchored outcome check | ❌ | Submissão AC7 e AC15 (data-hora da aprovação) e Alteração AC5 (fim vencido herdado) |
| Cobertura por camada (domínio 1:1; nada gravado em todo erro) | ❌ | `paraDecimal` sem fração com zero à esquerda (N8). "Nada gravado" agora conferido em todos os erros, inclusive na rejeição de alteração |
| Todo teste mapeia para AC / edge / Done-when | ✅ | Os testes novos citam T41–T50 ou um AC. O `toStrictEqual` de `U/editar-campanha.spec.ts:547` é tautológico depois da unificação, mas fixa a Done-when da T19 contra regressão |
| Guidelines documentadas | ✅ | Nenhuma no projeto; strong defaults da Test Coverage Matrix de `tasks.md` |
| Senior engineer aprovaria? | ⚠️ | Sim, depois de T51–T53. Detalhe cosmético: `consoleError.mockRestore()` em `U/rejeitar-alteracao-campanha.spec.ts:263` fica fora de `finally`, então uma falha antes dele vaza o spy para o próximo teste do arquivo |

---

## Spec-Precision Gaps

| # | AC | Problema | Estado |
| - | -- | -------- | ------ |
| SP1 | Criação AC5, AC6, AC8, AC11; Submissão AC3 | A spec define só "HTTP 422", sem texto; o design fixa as mensagens | Aberto, não bloqueia. Os testes ancoram no design (AC11 agora confere o texto) |
| SP2 | Submissão AC6 ("empresa"); Consulta AC1 ("nome da empresa", "imagem de capa quando houver") | Termo guarda-chuva; o design resolve como `nomeFantasia` e `temCapa` | Aberto, não bloqueia |
| SP3 | Alteração AC10 ("valores anteriores e novos") | Formato do retrato na auditoria | **Resolvido** pela T48. Resta a diferença de nome de chave (`compromissoNovo` × `compromissoProposto`), que não bloqueia (ver seção própria) |

---

## Fix Plans

Autoria: 🤖 agente, dentro da exceção do AD-021 para o ciclo de correção do gate (até 3 rodadas). Formato de `tasks.md`. Ordem: T52, T51, T53. Depois delas, rodada 3, a última antes de escalar ao usuário.

### T51: `paraDecimal` — fração com zero à esquerda (Major)

**What**: Nenhum teste formata um valor cuja fração tem zero à esquerda, e `padStart` → `padEnd` em `paraDecimal` passa despercebido (N8). Com o mutante, R$ 1,05 sai `"1.50"` no detalhe, na fila, na consulta pública e na auditoria. Acrescentar o caso pelo read model.
**Where**: `src/domain/fivo/application/use-cases/consultar-campanha-da-empresa.spec.ts`
**Depends on**: None
**Requirement**: CAMP-01 (Criação AC17), CAMP-02
**Autor**: 🤖 agente (exceção AD-021, ciclo de correção do gate)

**Done when**:

- [ ] Campanha com regra `POR_UNIDADE` `'0.05'` e meta `'1.05'` → `regraDoacao).toEqual({ tipo: POR_UNIDADE, valor: '0.05' })` e `meta).toBe('1.05')`
- [ ] Campanha com regra `PERCENTUAL` `'0.01'` → `percentual: '0.01'`
- [ ] Mutante N8 (`U/campanha-detalhe.ts:65`, `padStart` → `padEnd`) morre
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `test(api): cobre fração com zero à esquerda no detalhe da campanha`

### T52: Fim vencido herdado do compromisso aprovado (Major)

**What**: O design (`design.md:158`) manda checar a vigência do compromisso **mesclado** ao abrir a alteração, mas os testes da T49 sempre enviam a vigência. Falta o caso em que a empresa altera só a regra ou a beneficiada de uma campanha `APROVADA` cuja vigência aprovada já venceu (N14).
**Where**: `src/domain/fivo/entities/campanha.spec.ts`; `src/domain/fivo/application/use-cases/editar-campanha.spec.ts`
**Depends on**: None
**Requirement**: CAMP-08 (Alteração AC5)
**Autor**: 🤖 agente (exceção AD-021, ciclo de correção do gate)

**Done when**:

- [ ] Entidade: campanha `APROVADA` com vigência aprovada de fim = hoje (ou antes), `editarCompromisso({ regraDoacao }, hoje)` → `VigenciaVencidaError`, sem pendência e com `compromissoVigente()` intacto
- [ ] Entidade: a mesma campanha com `editarCompromisso({ vigencia: <fim amanhã> }, hoje)` → alteração aberta (a vigência nova substitui a vencida)
- [ ] Caso de uso (fake timers): campanha `APROVADA` com fim aprovado já vencido em SP + edição só da regra → `VigenciaVencidaError`, `expectNadaGravado`
- [ ] Mutante N14 (`E/campanha.ts:428`, `proposto.vigencia` → `parcial.vigencia?`) morre
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `test(api): cobre alteração sobre vigência aprovada vencida`

### T53: Data-hora da aprovação da campanha (Minor)

**What**: Submissão AC7 pede autor **e data-hora** da decisão, e AC15 pede data-hora em **toda** transição. A aprovação da campanha só confere `toBeInstanceOf(Date)`, e `new Date(0)` sobrevive na entidade (N24) e na auditoria (N23). A T45 copiou a lista de lacunas da rodada 1 e não incluiu `CAMPANHA_APROVADA`.
**Where**: `src/domain/fivo/entities/campanha.spec.ts`; `src/domain/fivo/application/use-cases/aprovar-campanha.spec.ts`
**Depends on**: None
**Requirement**: CAMP-05 (Submissão AC7), CAMP-06 (Submissão AC15)
**Autor**: 🤖 agente (exceção AD-021, ciclo de correção do gate)

**Done when**:

- [ ] `campanha.spec.ts` (aprovar): `jest.useFakeTimers({ now })` + `decididoEm).toEqual(now)`
- [ ] `aprovar-campanha.spec.ts` (sucesso): `depois.decididoEm).toEqual(agora)` e `registro.criadoEm).toEqual(agora)`, no lugar de `toBeInstanceOf(Date)`
- [ ] Varredura: nenhuma asserção de data-hora de decisão ou auditoria em `campanha*.spec.ts`, `*-campanha.spec.ts` e `*-alteracao-campanha.spec.ts` fica em `toBeInstanceOf(Date)`
- [ ] Mutantes N23 (`U/aprovar-campanha.ts:83`) e N24 (`E/campanha.ts:270`) morrem
- [ ] Gate `quick` passa

**Tests**: unit
**Gate**: quick
**Commit**: `test(api): data-hora exata na aprovação de campanha`

**Re-verificação**: rodada 3 deste gate depois de T51–T53. N8, N14, N23 e N24 rodam de novo, junto com mutantes novos sobre o que as três tasks tocarem.

---

## Follow-ups não bloqueantes

1. **T29**: (a) usar upsert também para a linha da `alteracaoDecidida`, alinhado ao double; (b) e2e salvando duas vezes a mesma instância depois da decisão, para provar a idempotência que o JSDoc promete (o lugar de N6); (c) JSDoc "uma decisão por `salvar`".
2. **Nome de chave da auditoria de alteração**: `compromissoNovo` (`_APROVADA`) × `compromissoProposto` (`_ABERTA`, `_REJEITADA`). Uniformizar se algum consumidor ler `dados`.
3. **T38**: o e2e cobre `idPublico` malformado → 404 com o mesmo corpo (M30, rodada 1).
4. `consoleError.mockRestore()` em `finally` em `U/rejeitar-alteracao-campanha.spec.ts:241-263`.

---

## Requirement Traceability Update

`spec.md` não foi editado. Status proposto:

| Requirement | Status anterior (r1) | Status proposto |
| ----------- | -------------------- | --------------- |
| CAMP-01 | ❌ Needs Fix (T41, T47, T48, T50) | ❌ Needs Fix (T51) |
| CAMP-02 | ❌ Needs Fix (T43) | ❌ Needs Fix (T51) |
| CAMP-03 | ✅ Domínio verificado | ✅ Domínio verificado · infra em Tasks |
| CAMP-04 | ✅ Domínio verificado | ✅ Domínio verificado · infra em Tasks |
| CAMP-05 | ❌ Needs Fix (T42, T43) | ❌ Needs Fix (T53) |
| CAMP-06 | ❌ Needs Fix (T45) | ❌ Needs Fix (T53) |
| CAMP-07 | ❌ Needs Fix (T47) | ✅ Domínio verificado · infra em Tasks |
| CAMP-08 | ❌ Needs Fix (T43–T46, T48, T49) | ❌ Needs Fix (T52) |
| CAMP-11 | ✅ Domínio verificado | ✅ Domínio verificado · infra em Tasks (T38 cobre id malformado no Postgres) |
| CAMP-09, CAMP-10 | Deferred | Deferred |

---

## Summary

**Overall**: ❌ Not Ready. O domínio P1 de `campanhas` não passa o gate de handoff do AD-021 na rodada 2, e a Fase 7 (T28–T40) continua bloqueada.

**Spec-anchored check**: 46 critérios P1 de domínio. 43 batem com a saída da spec, 3 têm lacuna (Submissão AC7, Submissão AC15, Alteração AC5). SP1 e SP2 abertos, SP3 resolvido.
**Sensor**: 38 injetados (12 reexecutados + 26 novos), 33 mortos, 4 sobreviventes (N8, N14, N23, N24), 1 equivalente (N6).
**Gate**: tsc 0 · eslint 0 · unit 595/595 (335 → 566 → 595). Nenhum teste apagado ou enfraquecido.
**Contrato T46**: ok, com duas notas para a T29.
**Lições**: L-012 recorreu (N23/N24: a T45 copiou a lista de lacunas e omitiu `CAMPANHA_APROVADA`) e foi promovida a confirmed. L-029 (N8) e L-030 (N14) entram como candidatas. SP1 e SP2 já viraram lições na rodada 1 (L-011, L-019) e não foram registrados de novo.

**O que funciona**: a alteração decidida chega ao `salvar` com status, autor, data-hora e motivo, e o double a guarda como histórico só depois do CAS; a rejeição de alteração tem e-mail, auditoria completa e CAS provados pelo valor; capa editável pelo caso de uso; um só read model e um só retrato; fim vencido na alteração com virada UTC/SP; mensagens literais da spec conferidas; `IMAGEM_CAMPANHA` coberta nos dois lados dos limites.

**Próximos passos**: (1) T52, T51 e T53 (só testes, nenhuma mudança de código esperada); (2) rodada 3, a última antes de escalar ao usuário.
