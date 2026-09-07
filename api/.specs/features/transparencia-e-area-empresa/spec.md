# Transparência (Comprovantes) e Área da Empresa Specification

> Convenção: seções e palavras-chave EARS em inglês; conteúdo em português (AD-005).
> Fonte: `docs/proposta-inicial.md` — RF07, RF08 e a Atualização de 29/08/2026.

## Problem Statement

A plataforma promete transparência ao consumidor, mas a Fivo Lab não intermedeia a doação: quem doa é a empresa, diretamente à instituição. O único elo de prestação de contas é o comprovante que a empresa envia — e hoje não existe nenhum canal para isso, nem controle sobre o que é publicado em nome da iniciativa. A empresa também não tem nenhum lugar único para acompanhar seus dados, campanhas, selos e comprovantes, que hoje se espalham por fluxos desconexos.

## Goals

- [ ] Empresa envia comprovantes de doação por campanha em menos de 2 minutos por documento.
- [ ] Nenhum comprovante chega à página pública sem revisão do administrador da Fivo Lab.
- [ ] Empresa acompanha em uma única tela: seus dados, campanhas e respectivos estados, selos gerados e comprovantes enviados.
- [ ] A plataforma deixa explícito que não valida a veracidade dos comprovantes na v1.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Validação automática de comprovantes por IA | Listada como fora de escopo na proposta |
| Registro de comprovantes em blockchain | Listado como fora de escopo na proposta |
| Assinatura digital com validade jurídica | Listada como fora de escopo na proposta |
| Conciliação entre valor doado e unidades vendidas | A plataforma não possui dados de venda na v1 |
| Emissão de recibo ou declaração fiscal | Fora do papel da plataforma; a doação é bilateral entre empresa e instituição |
| Confirmação do recebimento pela instituição | A Fivo Lab não intermedeia a doação e não tem como conferir o repasse na v1; a instituição tem conta, mas sua área não acompanha doações (ver `catalogo-instituicoes`) |
| Lembretes por e-mail ou WhatsApp para envio de comprovantes | Listados como evolução futura na proposta |
| Exportação de relatórios em PDF/Excel pela área da empresa | Não previsto nos requisitos da v1 |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Moderação de comprovantes | Obrigatória: comprovante nasce `EM_ANALISE` e só aparece na página pública após aprovação do admin | Decidido com o usuário (AD-003) | y |
| Vínculo do comprovante | Sempre a exatamente uma campanha | A prestação de contas do consumidor é por campanha, que é o que o selo aponta | n |
| Formatos e limites do comprovante | PDF, PNG ou JPG, até 10 MB por arquivo, até 50 arquivos por campanha | Cobre recibo digitalizado e comprovante de transferência sem abrir espaço para uso indevido como repositório | n |
| Metadados obrigatórios do comprovante | Data da doação, valor doado em BRL e descrição de até 500 caracteres | É o mínimo para o consumidor entender o que o documento comprova | n |
| Exclusão de comprovante publicado | A empresa não exclui; solicita ao admin, que despublica com motivo registrado | Retirar prestação de contas já publicada sem rastro contradiz a promessa de transparência | n |
| Isenção de responsabilidade | Página pública e área da empresa exibem aviso de que a Fivo Lab não valida a veracidade dos comprovantes na v1 | A proposta exclui validação automática; sem o aviso a plataforma assumiria implicitamente uma garantia que não presta | n |
| Dados sensíveis nos comprovantes | Aviso à empresa, antes do upload, para ocultar dados bancários e pessoais; sem redação automática | Redação automática é complexa e não está no escopo; o aviso reduz o risco de exposição | n |
| Conteúdo da área da empresa | Dados cadastrais, campanhas com estado, o selo de cada campanha com status e arquivos, e comprovantes com status | É exatamente o que o RF08 enumera, ajustado para 1 selo único por campanha e sem etapa de pagamento (AD-007, AD-009) | y |
| Totais exibidos na área da empresa | Soma dos valores declarados nos comprovantes publicados, rotulada como "valor declarado pela empresa" | Deixa claro que é declaração da empresa, não valor auditado pela plataforma | n |

**Open questions:** none - todas resolvidas ou registradas acima.

---

## User Stories

### P1: Envio de comprovantes de doação ⭐ MVP

**User Story**: Como empresa, quero enviar comprovantes das doações que realizei em uma campanha, para demonstrar publicamente que cumpri o compromisso do selo.

**Why P1**: É o passo 11 do fluxo básico da proposta e o conteúdo que sustenta a promessa de transparência.

**Acceptance Criteria**

1. WHILE a campanha estiver `APROVADA` ou `ENCERRADA` the system SHALL permitir que a empresa proprietária envie comprovantes para ela; nos demais estados SHALL responder HTTP 409.
2. WHEN a empresa envia um comprovante com arquivo, data da doação, valor em BRL e descrição THEN the system SHALL persistir o comprovante no estado `EM_ANALISE` e responder HTTP 201.
3. IF o arquivo não for PDF, PNG ou JPG, ou exceder 10 MB THEN the system SHALL rejeitar o envio com HTTP 422 informando o limite violado.
4. IF a campanha já possuir 50 comprovantes THEN the system SHALL rejeitar novos envios com HTTP 422 e a mensagem "Limite de comprovantes atingido para esta campanha".
5. IF a data da doação for futura THEN the system SHALL rejeitar com HTTP 422 e a mensagem "A data da doação não pode ser futura".
6. IF o valor informado for menor ou igual a zero THEN the system SHALL rejeitar com HTTP 422.
7. WHILE o comprovante estiver `EM_ANALISE` the system SHALL mantê-lo invisível na página pública da campanha.
8. WHEN a empresa inicia o envio de um comprovante THEN the system SHALL exibir aviso orientando a ocultar dados bancários e pessoais do documento antes do upload.
9. The system SHALL restringir o acesso ao arquivo do comprovante em análise à empresa proprietária e aos administradores, respondendo HTTP 403 a qualquer outro solicitante.
10. IF o armazenamento de arquivos estiver indisponível durante o envio THEN the system SHALL responder HTTP 503 e não criar registro de comprovante órfão.

**Independent Test**: Enviar um comprovante em PDF para uma campanha aprovada, confirmar que ele fica em análise e não aparece na página pública, e que arquivo de 12 MB é rejeitado com 422.

---

### P1: Moderação e publicação de comprovantes ⭐ MVP

**User Story**: Como administrador da Fivo Lab, quero revisar e publicar ou rejeitar comprovantes enviados, para controlar o que é exibido publicamente em nome da iniciativa.

**Why P1**: Portão de moderação decidido em AD-003 e condição para o conteúdo chegar à página pública.

**Acceptance Criteria**

1. WHEN o administrador abre a fila de comprovantes THEN the system SHALL listar todos os comprovantes `EM_ANALISE` ordenados do mais antigo ao mais recente, com empresa, campanha, data, valor e link para o arquivo.
2. WHEN o administrador publica um comprovante THEN the system SHALL alterar o estado para `PUBLICADO`, registrar autor e data-hora, e exibi-lo na página pública da campanha em no máximo 60 segundos.
3. WHEN o administrador rejeita um comprovante THEN the system SHALL exigir motivo de no mínimo 20 caracteres, alterar o estado para `REJEITADO`, persistir o motivo e notificar a empresa por e-mail.
4. WHEN o administrador despublica um comprovante já publicado THEN the system SHALL exigir motivo, alterar o estado para `DESPUBLICADO`, removê-lo da página pública em no máximo 60 segundos e manter o registro e o arquivo para auditoria.
5. The system SHALL permitir apenas as transições `EM_ANALISE → PUBLICADO`, `EM_ANALISE → REJEITADO` e `PUBLICADO → DESPUBLICADO`, respondendo HTTP 409 a qualquer outra.
6. IF um usuário sem papel de administrador chamar endpoints de moderação THEN the system SHALL responder HTTP 403 sem alterar estado.
7. The system SHALL registrar em log de auditoria toda transição de estado de comprovante, com autor, estados anterior e novo, motivo quando houver e data-hora.
8. The system SHALL exibir na página pública, junto ao bloco de comprovantes, o aviso de que a Fivo Lab não valida a veracidade dos documentos nesta versão.

**Independent Test**: Publicar um comprovante em análise e conferir sua aparição na página pública; rejeitar outro exigindo motivo e conferir a notificação; despublicar um publicado e confirmar remoção com registro preservado.

---

### P1: Área da empresa ⭐ MVP

**User Story**: Como empresa, quero uma área única onde vejo meus dados, minhas campanhas, meus selos e meus comprovantes com seus status, para gerenciar minha participação sem depender de suporte.

**Why P1**: Requisito explícito RF08 e ponto de convergência de todos os demais fluxos.

**Acceptance Criteria**

1. WHILE a empresa estiver autenticada the system SHALL exibir na área da empresa apenas dados pertencentes a ela, respondendo HTTP 403 a qualquer tentativa de acesso a recurso de outra empresa.
2. WHEN a empresa acessa a área the system SHALL exibir seu estado de cadastro (`PENDENTE_APROVACAO`, `APROVADA`, `REJEITADA` ou `SUSPENSA`) com a explicação do que ela pode fazer naquele estado.
3. WHEN a empresa acessa a lista de campanhas THEN the system SHALL exibir cada campanha com nome, beneficiada, regra de doação, estado atual e, quando `REJEITADA`, o motivo da rejeição.
4. WHEN a empresa acessa a seção de selos THEN the system SHALL exibir, para cada campanha com solicitação aberta, o status da solicitação (`SOLICITADO` ou `GERADO`), o modelo escolhido e, quando `GERADO`, os links de download de PNG e PDF.
5. WHEN a empresa acessa a seção de comprovantes THEN the system SHALL exibir cada comprovante com campanha, data, valor, estado e, quando `REJEITADO`, o motivo.
6. WHERE existirem comprovantes publicados the system SHALL exibir por campanha o total dos valores, rotulado como valor declarado pela empresa e não auditado pela plataforma.
7. WHERE a empresa não possuir nenhuma campanha the system SHALL exibir estado vazio com a ação de criar a primeira campanha.
8. The system SHALL renderizar a área da empresa corretamente em telas a partir de 320 px de largura.
9. WHILE a empresa estiver em `PENDENTE_APROVACAO` the system SHALL exibir a área em modo somente leitura, com as ações de criação desabilitadas e a explicação de que o cadastro está em análise.

**Independent Test**: Logar como empresa com uma campanha aprovada, seu selo gerado e dois comprovantes em estados diferentes e conferir que todos aparecem com o status correto; tentar acessar por URL um recurso de outra empresa e receber 403.

---

### P2: Painel administrativo consolidado

**User Story**: Como administrador da Fivo Lab, quero um painel único com todas as filas de moderação, para operar a plataforma sem procurar pendências em telas separadas.

**Why P2**: Melhora muito a operação, mas cada fila individual já é utilizável isoladamente no MVP.

**Acceptance Criteria**

1. WHEN o administrador acessa o painel THEN the system SHALL exibir a contagem de itens pendentes em cada fila: cadastros de empresa, cadastros de instituição, campanhas e comprovantes.
2. WHEN o administrador seleciona uma fila THEN the system SHALL navegar até a listagem correspondente já filtrada pelos itens pendentes.
3. The system SHALL restringir todo o painel a usuários com papel de administrador, respondendo HTTP 403 aos demais.

**Independent Test**: Criar pendências em cada uma das quatro filas — empresa, instituição, campanha e comprovante — e conferir as contagens e a navegação a partir do painel.

---

## Edge Cases

- IF a empresa for suspensa com comprovantes publicados THEN the system SHALL tornar a página pública inacessível sem alterar o estado dos comprovantes, que voltam a aparecer na reativação.
- IF o mesmo comprovante for publicado e rejeitado concorrentemente por dois administradores THEN the system SHALL aplicar apenas a primeira decisão e responder HTTP 409 à segunda.
- WHEN a descrição do comprovante contiver HTML ou script THEN the system SHALL escapá-lo na renderização pública.
- IF o arquivo de um comprovante publicado ficar inacessível no armazenamento THEN the system SHALL manter a página pública no ar exibindo o item como temporariamente indisponível.
- WHEN uma campanha encerrada recebe um novo comprovante THEN the system SHALL aceitá-lo normalmente, porque doações posteriores ao encerramento ainda precisam de prestação de contas.
- IF a empresa enviar dois arquivos idênticos para a mesma campanha THEN the system SHALL aceitar ambos e sinalizar ao administrador a duplicidade de nome e tamanho de arquivo na fila de moderação.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| COMP-01 | P1: Envio de comprovantes — criação e vínculo com campanha | Design | Pending |
| COMP-02 | P1: Envio de comprovantes — validações de arquivo e metadados | Design | Pending |
| COMP-03 | P1: Envio de comprovantes — invisibilidade e controle de acesso em análise | Design | Pending |
| COMP-04 | P1: Moderação — fila e publicação | Design | Pending |
| COMP-05 | P1: Moderação — rejeição e despublicação com motivo | Design | Pending |
| COMP-06 | P1: Moderação — máquina de estados e auditoria | Design | Pending |
| COMP-07 | P1: Moderação — aviso de não validação de veracidade | Design | Pending |
| AREA-01 | P1: Área da empresa — isolamento de dados por empresa | Design | Pending |
| AREA-02 | P1: Área da empresa — visão de campanhas, selos e comprovantes | Design | Pending |
| AREA-03 | P1: Área da empresa — estados vazios, somente leitura e responsividade | Design | Pending |
| AREA-04 | P2: Painel administrativo consolidado | - | Pending |

**ID format:** `[CATEGORY]-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 11 total, 0 mapeados para tasks, 11 não mapeados ⚠️ (esperado — fase Tasks ainda não executada)

---

## Success Criteria

- [ ] Empresa envia um comprovante em menos de 2 minutos, do login ao upload concluído.
- [ ] Nenhum comprovante aparece publicamente sem publicação explícita do administrador (verificável por teste que espera ausência na página pública em `EM_ANALISE`).
- [ ] Empresa identifica em uma única tela o status de cada campanha, do selo de cada campanha e de cada comprovante seus.
- [ ] Toda página que exibe comprovantes traz o aviso de não validação de veracidade.
