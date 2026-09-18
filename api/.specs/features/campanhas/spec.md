# Campanhas de Impacto Social Specification

> Convenção: seções e palavras-chave EARS em inglês; conteúdo em português (AD-005).
> Fonte: `docs/proposta-inicial.md` — RF02, RF03 (vínculo), RF06 (conteúdo) e a Atualização de 29/08/2026.

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
| Cálculo automático do valor doado | Depende de dados de venda que a plataforma não possui na v1 |
| Intermediação financeira e repasse à instituição | Listado como fora de escopo na proposta |
| Campanhas multi-instituição (rateio entre beneficiadas) | Aumenta a complexidade da regra de doação sem demanda validada |
| Rankings e comparativos de impacto entre campanhas | Listado como evolução futura na proposta |
| Agendamento de publicação automática | A publicação depende de aprovação humana na v1 |
| Versionamento público do histórico de edições da campanha | A v1 registra auditoria interna; exibir o diff ao consumidor é evolução futura |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Aprovação da campanha pelo admin | Obrigatória antes da publicação | Decidido com o usuário (AD-003) | y |
| Máquina de estados | `RASCUNHO → EM_ANALISE → APROVADA \| REJEITADA`; `APROVADA → ENCERRADA`; `REJEITADA → RASCUNHO` | Permite corrigir e ressubmeter sem recriar a campanha | n |
| Formatos da regra de doação | Valor fixo por unidade em BRL ou percentual sobre o preço de venda | A proposta exemplifica valor por unidade; percentual é o segundo formato mais comum e não custa modelar | n |
| Vigência da campanha | Data de início obrigatória e data de fim opcional | Selo impresso em embalagem circula por tempo indeterminado; forçar data de fim geraria página expirada com produto ainda em prateleira | n |
| Edição após aprovação | Alterar beneficiada, regra de doação ou vigência exige nova análise; nome, descrição e imagens podem ser editados livremente | O que o consumidor leu no selo não pode mudar sem curadoria; texto descritivo pode ser corrigido | n |
| Meta financeira da campanha | Campo opcional, apenas informativo | A proposta não define meta; deixar opcional evita prometer acompanhamento de progresso que a v1 não calcula | n |
| Limite de campanhas por empresa | Sem limite técnico na v1 | Volume esperado é baixo e a moderação humana já limita naturalmente | n |
| Encerramento de campanha | Manual pela empresa ou automático quando a data de fim é ultrapassada | Campanha encerrada mantém a página pública acessível, marcada como encerrada, porque o selo continua nas embalagens | n |

**Open questions:** none - todas resolvidas ou registradas acima.

---

## User Stories

### P1: Criação da campanha ⭐ MVP

**User Story**: Como empresa aprovada, quero criar uma campanha informando nome, descrição, beneficiada e regra de doação, para formalizar minha iniciativa de impacto social na plataforma.

**Why P1**: É o passo 2–4 do fluxo básico da proposta e pré-requisito do selo e da página pública.

**Acceptance Criteria**

1. WHILE a empresa autenticada estiver no estado `APROVADA` the system SHALL permitir a criação de campanhas; caso contrário SHALL responder HTTP 403 com a mensagem "Cadastro ainda não aprovado".
2. WHEN a empresa salva uma campanha com nome, descrição, beneficiada e regra de doação válidos THEN the system SHALL persistir a campanha no estado `RASCUNHO` e responder HTTP 201 com o identificador da campanha.
3. IF o nome da campanha tiver menos de 3 ou mais de 80 caracteres THEN the system SHALL rejeitar com HTTP 422 e a mensagem "O nome deve ter entre 3 e 80 caracteres".
4. IF a descrição exceder 2000 caracteres THEN the system SHALL rejeitar com HTTP 422 indicando o limite.
5. WHEN a empresa informa uma regra de doação do tipo valor por unidade THEN the system SHALL exigir um valor em BRL maior que 0,00 com no máximo 2 casas decimais e rejeitar valores fora disso com HTTP 422.
6. WHEN a empresa informa uma regra de doação do tipo percentual THEN the system SHALL exigir um percentual entre 0,01% e 100,00% e rejeitar valores fora do intervalo com HTTP 422.
7. The system SHALL exigir que toda campanha referencie exatamente uma beneficiada disponível do catálogo — uma instituição `APROVADA` ou uma causa `ATIVA` — rejeitando com HTTP 422 caso contrário.
8. WHEN a empresa informa data de início e data de fim THEN the system SHALL rejeitar com HTTP 422 qualquer combinação em que a data de fim seja anterior ou igual à data de início.
9. WHILE a campanha estiver em `RASCUNHO` the system SHALL permitir edição de todos os campos e SHALL manter a campanha invisível a qualquer acesso público, respondendo HTTP 404 na rota pública.
10. The system SHALL gerar, no momento da criação, um identificador público permanente e imutável da campanha, distinto do identificador interno e não sequencial.

**Independent Test**: Criar uma campanha em rascunho com regra "R$ 1,00 por unidade" apontando para uma instituição do catálogo e verificar que ela não é acessível publicamente; testar cada validação de limite recebendo 422.

---

### P1: Submissão e aprovação da campanha ⭐ MVP

**User Story**: Como administrador da Fivo Lab, quero analisar campanhas submetidas e aprová-las ou rejeitá-las com motivo, para garantir que apenas iniciativas legítimas ganhem página pública e selo.

**Why P1**: É o portão de publicação (AD-003) e o que libera a geração do selo, já que a monetização foi adiada e não há etapa de pagamento (AD-007).

**Acceptance Criteria**

1. WHEN a empresa submete uma campanha em `RASCUNHO` com todos os campos obrigatórios preenchidos THEN the system SHALL alterar o estado para `EM_ANALISE` e registrar a data-hora da submissão.
2. IF a empresa submeter uma campanha com campo obrigatório ausente THEN the system SHALL rejeitar com HTTP 422 listando todos os campos pendentes em uma única resposta.
3. WHILE a campanha estiver em `EM_ANALISE` the system SHALL bloquear edições pela empresa, respondendo HTTP 409 com a mensagem "Campanha em análise não pode ser editada".
4. WHEN o administrador aprova uma campanha THEN the system SHALL alterar o estado para `APROVADA`, registrar autor e data-hora da decisão, publicar a página pública e liberar a solicitação de selo daquela campanha.
5. WHEN o administrador rejeita uma campanha THEN the system SHALL exigir motivo de no mínimo 20 caracteres, alterar o estado para `REJEITADA`, persistir o motivo e notificar a empresa por e-mail.
6. WHEN a empresa edita uma campanha `REJEITADA` THEN the system SHALL retorná-la ao estado `RASCUNHO`, preservando o histórico do motivo da rejeição.
7. The system SHALL permitir apenas as transições `RASCUNHO → EM_ANALISE`, `EM_ANALISE → APROVADA`, `EM_ANALISE → REJEITADA`, `REJEITADA → RASCUNHO` e `APROVADA → ENCERRADA`, respondendo HTTP 409 a qualquer outra.
8. IF um usuário sem papel de administrador chamar endpoints de aprovação ou rejeição THEN the system SHALL responder HTTP 403 sem alterar estado.
9. The system SHALL registrar em log de auditoria toda transição de estado da campanha, com autor, estados anterior e novo, motivo quando houver e data-hora.

**Independent Test**: Submeter uma campanha, tentar editá-la em análise (409), aprovar pelo painel e confirmar que a página pública passa a responder 200 e que a solicitação de selo fica habilitada.

---

### P1: Alteração de campanha aprovada ⭐ MVP

**User Story**: Como empresa, quero corrigir textos da campanha publicada sem perder a publicação, mas passar por nova análise quando alterar o compromisso de doação, para manter a página correta sem quebrar a confiança do consumidor.

**Why P1**: Sem essa regra, ou a campanha vira imutável (impraticável) ou a empresa pode trocar a promessa impressa na embalagem sem curadoria (inaceitável).

**Acceptance Criteria**

1. WHILE a campanha estiver `APROVADA` the system SHALL permitir a edição de nome, descrição e imagens, aplicando as alterações à página pública sem nova análise.
2. WHEN a empresa altera a beneficiada, a regra de doação ou as datas de vigência de uma campanha `APROVADA` THEN the system SHALL mover a campanha para `EM_ANALISE` e SHALL manter a versão aprovada anterior publicada até a decisão do administrador.
3. IF o administrador rejeitar a alteração THEN the system SHALL descartar as mudanças pendentes, manter a versão aprovada anterior publicada e retornar a campanha ao estado `APROVADA`.
4. The system SHALL preservar imutável o identificador público da campanha em toda alteração, garantindo que QR Codes já impressos continuem válidos.

**Independent Test**: Editar a descrição de uma campanha aprovada e ver a página pública atualizada sem sair do ar; alterar a regra de doação e confirmar que a página continua exibindo a regra anterior enquanto a alteração está em análise.

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

- IF a beneficiada da campanha deixar de estar disponível no catálogo — instituição suspensa, inativada ou devolvida a `PENDENTE_APROVACAO`, ou causa inativada — enquanto a campanha está em `EM_ANALISE` THEN the system SHALL bloquear a aprovação com HTTP 409 e exigir nova seleção pela empresa.
- IF a empresa for suspensa enquanto possui campanhas aprovadas THEN the system SHALL tornar as páginas públicas dessas campanhas inacessíveis com HTTP 404 sem alterar o estado das campanhas.
- IF dois administradores decidirem a mesma campanha simultaneamente THEN the system SHALL aplicar apenas a primeira decisão e responder HTTP 409 à segunda.
- WHEN a descrição da campanha contiver HTML ou script THEN the system SHALL escapar o conteúdo na renderização pública.
- IF a empresa submeter a mesma campanha duas vezes em sequência rápida THEN the system SHALL registrar apenas uma submissão, respondendo HTTP 409 à segunda por transição de estado inválida.
- WHEN uma campanha é criada com data de início futura THEN the system SHALL permitir a aprovação e SHALL exibir na página pública a marcação de campanha ainda não iniciada até a data de início.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CAMP-01 | P1: Criação da campanha — dados e validações | Design | Pending |
| CAMP-02 | P1: Criação da campanha — regra de doação estruturada | Design | Pending |
| CAMP-03 | P1: Criação da campanha — vínculo com beneficiada | Design | Pending |
| CAMP-04 | P1: Criação da campanha — identificador público permanente | Design | Pending |
| CAMP-05 | P1: Submissão e aprovação — fluxo de análise | Design | Pending |
| CAMP-06 | P1: Submissão e aprovação — máquina de estados e auditoria | Design | Pending |
| CAMP-07 | P1: Alteração de campanha aprovada — edição sem nova análise | Design | Pending |
| CAMP-08 | P1: Alteração de campanha aprovada — reanálise de compromisso | Design | Pending |
| CAMP-09 | P2: Encerramento de campanha | - | Pending |
| CAMP-10 | P3: Duplicação de campanha | - | Pending |

**ID format:** `[CATEGORY]-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 10 total, 0 mapeados para tasks, 10 não mapeados ⚠️ (esperado — fase Tasks ainda não executada)

---

## Success Criteria

- [ ] Empresa cria e submete uma campanha completa em menos de 10 minutos.
- [ ] Nenhuma campanha é acessível publicamente antes de `APROVADA` (verificável por teste que espera 404 em cada estado anterior).
- [ ] Alterar a regra de doação nunca muda o que o consumidor vê antes da nova aprovação.
- [ ] O identificador público sobrevive a todas as edições da campanha (verificável por teste que edita e reconsulta).
