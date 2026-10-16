# Campanhas de Impacto Social Specification

> Convenção: seções e palavras-chave EARS em inglês; conteúdo em português (AD-005).
> Fonte: `docs/proposta-inicial.md` — RF02, RF03 (vínculo), RF06 (conteúdo) e a Atualização de 29/08/2026.
> Decisões de discussão: `context.md` (2026-10-15).

## Problem Statement

A campanha é o objeto central da plataforma: é ela que conecta a empresa, a beneficiada e a regra de doação ("a cada unidade vendida, R$ 1,00 será destinado à instituição X"), e é o que o selo e o QR Code apontam. Hoje esse compromisso existe apenas em texto de embalagem, sem registro estruturado, sem data de vigência e sem qualquer curadoria — o consumidor não tem como saber o que exatamente foi prometido nem por quanto tempo.

## Goals

- [ ] Empresa aprovada cria uma campanha completa (nome, descrição, beneficiada, regra de doação, vigência) em uma sessão.
- [ ] Toda regra de doação é estruturada e legível por máquina, não texto livre.
- [ ] Nenhuma campanha fica pública sem aprovação do administrador da Fivo Lab.
- [ ] Estado da campanha é sempre inequívoco: rascunho, em análise, aprovada, rejeitada ou encerrada.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Registro de vendas ou de unidades vendidas | A plataforma não intermedeia a venda; o total doado é informado pela empresa via comprovantes |
| Cálculo automático do valor doado ou do progresso da meta | Depende de dados de venda que a plataforma não possui na v1 |
| Intermediação financeira e repasse à instituição | Listado como fora de escopo na proposta |
| Campanhas multi-instituição (rateio entre beneficiadas) | Aumenta a complexidade da regra de doação sem demanda validada |
| Rankings e comparativos de impacto entre campanhas | Listado como evolução futura na proposta |
| Agendamento de publicação automática | A publicação depende de aprovação humana na v1 |
| Versionamento público do histórico de edições da campanha | A v1 registra auditoria interna; exibir o diff ao consumidor é evolução futura |
| Exclusão de campanha (inclusive rascunho) | Não pedida na proposta; rascunho abandonado permanece invisível ao público |
| Lista das campanhas da empresa | Pertence à área da empresa em `transparencia-e-area-empresa`; aqui só o detalhe de uma campanha própria |
| Página HTML pública, logo da empresa, comprovantes e Open Graph | Pertencem a `paginas-publicas`, que consome a consulta pública desta feature |
| Solicitação e geração do selo | Pertencem a `selo-e-qrcode`; esta feature só expõe se a campanha está apta |
| Interface no `web` | Rodada posterior; esta rodada entrega o `api` |
| Encerramento (CAMP-09) e duplicação (CAMP-10) | Rodada posterior; o MVP é demonstrável sem eles |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Aprovação da campanha pelo admin | Obrigatória antes da publicação | Decidido com o usuário (AD-003) | y |
| Escopo da rodada | P1 do `api` (CAMP-01…08, CAMP-11); CAMP-09 e CAMP-10 adiados | Decidido com o usuário em 2026-10-15; P1 destrava `selo-e-qrcode` e `paginas-publicas` | y |
| Autoria | Domínio pelo grupo, infra pelo agente após gate de verificação do domínio | Decidido com o usuário em 2026-10-15, mesma divisão do AD-020 | y |
| Fronteira com `paginas-publicas` | Esta feature entrega o caso de uso de busca da campanha publicada e um endpoint JSON público mínimo; `paginas-publicas` enriquece e renderiza o HTML | Decidido com o usuário em 2026-10-15; mantém os Independent Tests executáveis de ponta a ponta | y |
| Data de início no passado | Permitida, sem validação contra a data atual | Decidido com o usuário em 2026-10-15; ressubmissão atrasada não quebra e iniciativa preexistente declara o início real | y |
| Representação de datas | Datas de calendário sem hora, fuso America/Sao_Paulo | A vigência é um compromisso por dia; hora não tem significado para o consumidor | y |
| Data de fim | Opcional; quando informada, posterior à data de início e posterior à data atual na submissão | Selo impresso circula por tempo indeterminado; campanha não pode nascer vencida | y |
| Meta financeira | Opcional e apenas informativa | A v1 não calcula progresso | y |
| Representação de valores | Valor por unidade e meta em centavos inteiros; percentual em centésimos de ponto (1 = 0,01%) | Evita erro de ponto flutuante em dinheiro e percentual | y |
| Máquina de estados da campanha | `RASCUNHO → EM_ANALISE → APROVADA \| REJEITADA`; `REJEITADA → RASCUNHO`; `APROVADA → ENCERRADA` (CAMP-09) | Permite corrigir e ressubmeter sem recriar a campanha | y |
| Alteração de compromisso em campanha aprovada | A campanha permanece `APROVADA`; a alteração vira registro pendente próprio com decisão do admin (AD-006c); uma alteração pendente por vez | O rascunho anterior desta spec mandava a campanha "voltar a `EM_ANALISE`" e ao mesmo tempo continuar publicada, o que contradiz a máquina de estados; manter `APROVADA` deixa estado e visibilidade coerentes | y |
| Formatos da regra de doação | Valor fixo por unidade em BRL ou percentual sobre o preço de venda | A proposta exemplifica valor por unidade; percentual é o segundo formato mais comum e não custa modelar | y |
| Teto de valores | Valor por unidade e meta até R$ 999.999,99 | Limite de entrada explícito; nenhum compromisso realista passa disso e o valor cabe em inteiro de 32 bits em centavos | y |
| Campos exigidos no rascunho | O rascunho exige só o nome; todo campo informado é validado na hora; a submissão exige nome, descrição, beneficiada, regra de doação e data de início | A submissão lista campos pendentes, o que só faz sentido se o rascunho aceita campos em branco | y |
| Imagens da campanha | Uma imagem de capa opcional, PNG ou JPEG, até 5 MB, gravada pelo `ArquivoService` (AD-016) | A edição livre cita "imagens" sem definir quantas; uma capa basta para a página pública e reusa o limite do logo | y |
| Edição após aprovação | Nome, descrição, capa e meta editáveis livremente; beneficiada, regra de doação e datas exigem nova análise | O que o consumidor leu no selo não pode mudar sem curadoria; texto descritivo pode ser corrigido | y |
| Acesso a campanha de outra empresa | HTTP 404, como se não existisse | Não vaza a existência de campanhas de terceiros | y |
| Falha no envio de e-mail de rejeição | A decisão é gravada e o e-mail entra na fila `email_pendente`; falha de envio não desfaz a decisão | Mesmo padrão de `cadastro-empresa` | y |
| Conteúdo HTML na descrição | Guardado e devolvido como texto puro em JSON; o escape é de quem renderiza (`paginas-publicas`) | O `api` não renderiza HTML | y |
| Limite de campanhas por empresa | Sem limite técnico na v1 | Volume esperado é baixo e a moderação humana já limita naturalmente | y |
| Encerramento de campanha (CAMP-09) | Manual pela empresa ou automático quando a data de fim é ultrapassada | Campanha encerrada mantém a página pública acessível, marcada como encerrada, porque o selo continua nas embalagens | y |

**Open questions:** none - todas resolvidas ou registradas acima.

---

## User Stories

### P1: Criação da campanha ⭐ MVP

**User Story**: Como empresa aprovada, quero criar uma campanha informando nome, descrição, beneficiada e regra de doação, para formalizar minha iniciativa de impacto social na plataforma.

**Why P1**: É o passo 2–4 do fluxo básico da proposta e pré-requisito do selo e da página pública.

**Acceptance Criteria**

1. IF a empresa autenticada não estiver no estado `APROVADA` THEN the system SHALL responder HTTP 403 com a mensagem "Cadastro ainda não aprovado" a qualquer criação, edição ou submissão de campanha, sem gravar alteração.
2. WHEN a empresa aprovada cria uma campanha com nome válido THEN the system SHALL persistir a campanha no estado `RASCUNHO` e responder HTTP 201 com o identificador interno e o identificador público da campanha.
3. IF o nome da campanha, sem espaços nas pontas, tiver menos de 3 ou mais de 80 caracteres THEN the system SHALL rejeitar com HTTP 422 e a mensagem "O nome deve ter entre 3 e 80 caracteres".
4. IF a descrição exceder 2000 caracteres THEN the system SHALL rejeitar com HTTP 422 e a mensagem "A descrição deve ter no máximo 2000 caracteres".
5. WHEN a empresa informa uma regra de doação do tipo valor por unidade THEN the system SHALL aceitar apenas valores entre R$ 0,01 e R$ 999.999,99 com no máximo 2 casas decimais, rejeitando os demais com HTTP 422.
6. WHEN a empresa informa uma regra de doação do tipo percentual THEN the system SHALL aceitar apenas percentuais entre 0,01% e 100,00% com no máximo 2 casas decimais, rejeitando os demais com HTTP 422.
7. IF a regra de doação trouxer o valor do outro tipo (percentual numa regra por unidade ou valor em BRL numa regra percentual) THEN the system SHALL rejeitar com HTTP 422 e a mensagem "O Valor da regra deve corresponder à regra selecionada.".
8. WHEN a empresa informa uma meta financeira THEN the system SHALL aceitar apenas valores entre R$ 0,01 e R$ 999.999,99 com no máximo 2 casas decimais, rejeitando os demais com HTTP 422.
9. IF a empresa informar instituição e causa ao mesmo tempo THEN the system SHALL rejeitar com HTTP 422 e a mensagem "Informe exatamente uma beneficiada: instituição ou causa".
10. IF a beneficiada informada não for uma instituição `APROVADA` ou uma causa `ATIVA` do catálogo THEN the system SHALL rejeitar com HTTP 422 e a mensagem "Instituição ou causa indisponível".
11. IF a data de fim informada for anterior ou igual à data de início THEN the system SHALL rejeitar com HTTP 422.
12. The system SHALL aceitar data de início anterior à data atual.
13. WHEN a empresa envia uma imagem de capa THEN the system SHALL aceitar apenas PNG ou JPEG de até 5 MB, identificados pelo conteúdo do arquivo, rejeitando os demais com HTTP 422.
14. IF o armazenamento de arquivos estiver indisponível durante o envio da capa THEN the system SHALL responder HTTP 503 com a mensagem "Storage indisponível no momento." sem alterar a campanha.
15. WHILE a campanha estiver em `RASCUNHO` the system SHALL permitir a edição de todos os campos pela empresa dona.
16. The system SHALL gerar, no momento da criação, um identificador público imutável da campanha, distinto do identificador interno e não sequencial.
17. WHEN a empresa consulta uma campanha própria THEN the system SHALL responder HTTP 200 com todos os campos, o estado atual, o motivo da última rejeição quando houver e a alteração pendente quando houver.
18. IF a empresa consultar, editar ou submeter uma campanha de outra empresa THEN the system SHALL responder HTTP 404 sem revelar que a campanha existe.

**Independent Test**: Criar uma campanha em rascunho com regra "R$ 1,00 por unidade" apontando para uma instituição do catálogo, verificar que a consulta pública responde 404 e testar cada validação de limite recebendo 422.

---

### P1: Submissão e aprovação da campanha ⭐ MVP

**User Story**: Como administrador da Fivo Lab, quero analisar campanhas submetidas e aprová-las ou rejeitá-las com motivo, para garantir que apenas iniciativas legítimas ganhem página pública e selo.

**Why P1**: É o portão de publicação (AD-003) e o que libera a geração do selo, já que a monetização foi adiada e não há etapa de pagamento (AD-007).

**Acceptance Criteria**

1. WHEN a empresa submete uma campanha em `RASCUNHO` com nome, descrição, beneficiada, regra de doação e data de início preenchidos THEN the system SHALL alterar o estado para `EM_ANALISE` e registrar a data-hora da submissão.
2. IF a empresa submeter uma campanha com campo obrigatório ausente THEN the system SHALL rejeitar com HTTP 422 listando todos os campos pendentes em uma única resposta.
3. IF, no momento da submissão, a data de fim informada for anterior ou igual à data atual THEN the system SHALL rejeitar com HTTP 422.
4. IF, no momento da submissão, a beneficiada não estiver mais disponível no catálogo THEN the system SHALL rejeitar com HTTP 422 e a mensagem "Instituição ou causa indisponível".
5. WHILE a campanha estiver em `EM_ANALISE` the system SHALL bloquear edições pela empresa, respondendo HTTP 409 com a mensagem "Campanha em análise não pode ser editada".
6. WHEN o administrador abre a fila de campanhas THEN the system SHALL listar todas as campanhas em `EM_ANALISE` e todas as alterações pendentes, ordenadas da submissão mais antiga para a mais recente, com empresa, nome, beneficiada, regra de doação, vigência, data de submissão e o tipo do item (campanha nova ou alteração).
7. WHEN o administrador aprova uma campanha em `EM_ANALISE` THEN the system SHALL alterar o estado para `APROVADA` e registrar autor e data-hora da decisão.
8. WHILE a campanha estiver `APROVADA` the system SHALL marcá-la como apta à solicitação de selo.
9. IF a beneficiada da campanha não estiver disponível no catálogo no momento da aprovação THEN the system SHALL responder HTTP 409 sem alterar o estado.
10. IF o administrador rejeitar uma campanha com motivo de menos de 20 caracteres, sem espaços nas pontas, THEN the system SHALL responder HTTP 422 com a mensagem "O motivo deve ter no mínimo 20 caracteres" sem alterar o estado.
11. WHEN o administrador rejeita uma campanha com motivo válido THEN the system SHALL alterar o estado para `REJEITADA`, persistir o motivo e enfileirar e-mail de notificação à empresa contendo o motivo.
12. WHEN a empresa edita uma campanha `REJEITADA` THEN the system SHALL retorná-la ao estado `RASCUNHO`, preservando o histórico do motivo da rejeição.
13. The system SHALL permitir apenas as transições `RASCUNHO → EM_ANALISE`, `EM_ANALISE → APROVADA`, `EM_ANALISE → REJEITADA` e `REJEITADA → RASCUNHO`, respondendo HTTP 409 com a mensagem "Operação não permitida para o estado atual" a qualquer outra.
14. IF um usuário autenticado sem papel de administrador chamar a fila, a aprovação ou a rejeição THEN the system SHALL responder HTTP 403 sem alterar estado.
15. The system SHALL registrar em log de auditoria toda transição de estado da campanha, com autor, estados anterior e novo, motivo quando houver e data-hora.

**Independent Test**: Submeter uma campanha, tentar editá-la em análise (409), aprová-la pelo endpoint do admin e confirmar que a consulta pública passa a responder 200 e que a campanha aparece apta à solicitação de selo.

---

### P1: Alteração de campanha aprovada ⭐ MVP

**User Story**: Como empresa, quero corrigir textos da campanha publicada sem perder a publicação, mas passar por nova análise quando alterar o compromisso de doação, para manter a página correta sem quebrar a confiança do consumidor.

**Why P1**: Sem essa regra, ou a campanha vira imutável (impraticável) ou a empresa pode trocar a promessa impressa na embalagem sem curadoria (inaceitável).

**Acceptance Criteria**

1. WHILE a campanha estiver `APROVADA` the system SHALL aplicar imediatamente, sem nova análise, as edições de nome, descrição, imagem de capa e meta financeira.
2. WHEN a empresa altera a beneficiada, a regra de doação ou as datas de vigência de uma campanha `APROVADA` THEN the system SHALL registrar uma alteração pendente em análise, mantendo a campanha em `APROVADA` com os valores aprovados anteriores.
3. WHILE houver alteração pendente the system SHALL expor na consulta pública e na aptidão ao selo apenas os valores aprovados anteriores.
4. IF a empresa enviar nova alteração de beneficiada, regra de doação ou datas enquanto já houver alteração pendente THEN the system SHALL responder HTTP 409 com a mensagem "Já existe uma alteração em análise".
5. The system SHALL aplicar à alteração pendente as mesmas validações de beneficiada, regra de doação e datas da criação e da submissão, respondendo HTTP 422 quando violadas.
6. WHEN o administrador aprova uma alteração pendente THEN the system SHALL aplicar os novos valores à campanha, registrar autor e data-hora da decisão e encerrar a pendência.
7. IF a nova beneficiada da alteração não estiver disponível no catálogo no momento da aprovação THEN the system SHALL responder HTTP 409 sem aplicar a alteração.
8. WHEN o administrador rejeita uma alteração pendente com motivo de no mínimo 20 caracteres THEN the system SHALL descartar os novos valores, manter a campanha `APROVADA` com os valores anteriores, persistir o motivo e enfileirar e-mail de notificação à empresa.
9. The system SHALL preservar imutável o identificador público da campanha em toda edição e alteração.
10. The system SHALL registrar em log de auditoria a abertura e a decisão de cada alteração pendente, com autor, valores anteriores e novos, motivo quando houver e data-hora.

**Independent Test**: Editar a descrição de uma campanha aprovada e ver a consulta pública atualizada; alterar a regra de doação e confirmar que a consulta pública continua exibindo a regra anterior enquanto a alteração está em análise; aprovar a alteração e ver a nova regra.

---

### P1: Consulta pública da campanha ⭐ MVP

**User Story**: Como consumidor, quero consultar pelo identificador público os dados aprovados de uma campanha, para que a página pública e o QR Code tenham de onde ler o compromisso.

**Why P1**: É o contrato que `paginas-publicas` e `selo-e-qrcode` consomem e o que torna verificável "nenhuma campanha pública antes da aprovação".

**Acceptance Criteria**

1. WHEN um visitante sem autenticação consulta pelo identificador público uma campanha `APROVADA` de empresa `APROVADA` THEN the system SHALL responder HTTP 200 com nome da campanha, descrição, imagem de capa quando houver, nome da empresa, nome e tipo da beneficiada, regra de doação, meta quando houver e período de vigência.
2. IF a campanha não existir, estiver em `RASCUNHO`, `EM_ANALISE` ou `REJEITADA`, pertencer a empresa que não esteja `APROVADA` ou o identificador público for malformado THEN the system SHALL responder HTTP 404 com o mesmo corpo em todos os casos.
3. The system SHALL omitir da consulta pública o identificador interno, o motivo de rejeição e os valores de alteração pendente.
4. WHILE a data de início da campanha aprovada for posterior à data atual the system SHALL informar na consulta pública a situação `NAO_INICIADA`; caso contrário SHALL informar `EM_ANDAMENTO`.

**Independent Test**: Consultar a mesma campanha em cada estado e conferir 404 até a aprovação e 200 depois; suspender a empresa e conferir 404 sem mudança no estado da campanha.

---

### P2: Encerramento de campanha

**User Story**: Como empresa, quero encerrar uma campanha, para sinalizar ao consumidor que a iniciativa terminou sem apagar a prestação de contas.

**Why P2**: Necessário para o ciclo completo, mas o MVP é demonstrável com campanhas ativas.

**Acceptance Criteria**

1. WHEN a empresa encerra uma campanha `APROVADA` THEN the system SHALL alterar o estado para `ENCERRADA`, registrar a data-hora e manter a página pública acessível com marcação visível de campanha encerrada.
2. WHEN a data de fim informada é ultrapassada THEN the system SHALL encerrar a campanha automaticamente em até 24 horas, aplicando o mesmo efeito do encerramento manual.
3. WHILE a campanha estiver `ENCERRADA` the system SHALL bloquear a abertura de solicitação de selo para ela, respondendo HTTP 409, e SHALL continuar aceitando o envio de comprovantes de doação.
4. The system SHALL manter a página pública de campanha encerrada acessível indefinidamente, porque selos já impressos permanecem em circulação.

**Independent Test**: Encerrar uma campanha e verificar que a página pública responde 200 com o rótulo de encerrada, que nova solicitação de selo retorna 409 e que o envio de comprovante continua permitido.

---

### P3: Duplicação de campanha

**User Story**: Como empresa, quero duplicar uma campanha existente como novo rascunho, para lançar uma nova edição sem redigitar tudo.

**Why P3**: Conveniência operacional para empresas recorrentes; sem impacto no fluxo de validação da v1.

**Acceptance Criteria**

1. WHEN a empresa duplica uma campanha THEN the system SHALL criar uma nova campanha em `RASCUNHO` copiando nome, descrição, beneficiada e regra de doação, e SHALL gerar um novo identificador público.
2. The system SHALL não copiar para a nova campanha o histórico de aprovação, a solicitação e os arquivos de selo, nem os comprovantes da campanha original, de modo que a cópia nasça sem selo e possa escolher seu próprio modelo.

**Independent Test**: Duplicar uma campanha aprovada e confirmar que a cópia nasce em rascunho, com identificador público diferente e sem comprovantes herdados.

---

## Edge Cases

- IF a beneficiada deixar de estar disponível no catálogo — instituição suspensa, inativada ou devolvida a `PENDENTE_APROVACAO`, ou causa inativada — enquanto a campanha ou a alteração está em análise THEN the system SHALL bloquear a aprovação com HTTP 409, e a empresa SHALL corrigir a beneficiada depois de uma rejeição.
- IF a beneficiada de uma campanha já `APROVADA` deixar de estar disponível THEN the system SHALL manter a campanha `APROVADA` e publicada com a beneficiada original, sem alteração automática.
- IF a empresa for suspensa enquanto possui campanhas aprovadas THEN the system SHALL responder HTTP 404 na consulta pública dessas campanhas sem alterar o estado delas.
- IF dois administradores decidirem a mesma campanha ou alteração simultaneamente THEN the system SHALL aplicar apenas a primeira decisão e responder HTTP 409 à segunda.
- IF a empresa submeter a mesma campanha duas vezes em sequência rápida THEN the system SHALL registrar apenas uma submissão, respondendo HTTP 409 à segunda.
- IF a empresa editar uma campanha enquanto o administrador a decide THEN the system SHALL aplicar apenas a operação que encontrar o estado esperado, respondendo HTTP 409 à outra.
- WHEN a descrição contiver HTML ou script THEN the system SHALL guardá-la e devolvê-la como texto, sem interpretar o conteúdo.

---

## Implicit-Requirement Sweep

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | Criação AC3–AC11, AC13; Submissão AC2–AC4; Alteração AC5 |
| Failure / partial-failure states | Criação AC14 (storage); e-mail via fila `email_pendente`, falha de envio não desfaz decisão (Assumptions) |
| Idempotency / retry / duplicate handling | Edge cases de submissão duplicada e decisão dupla (409 por transição inválida) |
| Auth boundaries & rate limits | Criação AC1, AC18; Submissão AC14; Consulta pública AC1 sem autenticação. Rate limit N/A because nenhuma rota desta feature tem limite próprio na v1 |
| Concurrency / ordering | Edge cases de decisão simultânea e edição concorrente; fila ordenada por submissão (Submissão AC6) |
| Data lifecycle / expiry | N/A because campanha não é excluída nesta rodada; encerramento por data de fim é CAMP-09 |
| Observability | Submissão AC15; Alteração AC10 |
| External-dependency failure | Storage (Criação AC14) e e-mail (fila assíncrona) |
| State-transition integrity | Submissão AC13; Alteração AC2–AC4 |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CAMP-01 | P1: Criação da campanha — dados, validações e acesso do dono | Tasks | In Tasks |
| CAMP-02 | P1: Criação da campanha — regra de doação estruturada | Tasks | In Tasks |
| CAMP-03 | P1: Criação da campanha — vínculo com beneficiada | Tasks | In Tasks |
| CAMP-04 | P1: Criação da campanha — identificador público permanente | Tasks | In Tasks |
| CAMP-05 | P1: Submissão e aprovação — fila e decisões do admin | Tasks | In Tasks |
| CAMP-06 | P1: Submissão e aprovação — máquina de estados e auditoria | Tasks | In Tasks |
| CAMP-07 | P1: Alteração de campanha aprovada — edição sem nova análise | Tasks | In Tasks |
| CAMP-08 | P1: Alteração de campanha aprovada — reanálise de compromisso | Tasks | In Tasks |
| CAMP-09 | P2: Encerramento de campanha | - | Deferred (rodada posterior) |
| CAMP-10 | P3: Duplicação de campanha | - | Deferred (rodada posterior) |
| CAMP-11 | P1: Consulta pública da campanha | Tasks | In Tasks |

**ID format:** `[CATEGORY]-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 11 total, 9 mapeados para tasks (T1–T40), 2 adiados (CAMP-09, CAMP-10).

---

## Success Criteria

- [ ] Empresa cria e submete uma campanha completa em menos de 10 minutos.
- [ ] Nenhuma campanha é acessível publicamente antes de `APROVADA` (verificável por teste que espera 404 em cada estado anterior).
- [ ] Alterar a regra de doação nunca muda o que o consumidor vê antes da nova aprovação.
- [ ] O identificador público sobrevive a todas as edições da campanha (verificável por teste que edita e reconsulta).
