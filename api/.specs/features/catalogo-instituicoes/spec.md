# Catálogo de Instituições e Causas Specification

> Convenção: seções e palavras-chave EARS em inglês; conteúdo em português (AD-005).
> Fonte: `docs/proposta-inicial.md` — RF03 e a Atualização de 29/08/2026.

## Problem Statement

A empresa precisa vincular sua campanha a uma instituição ou causa beneficiada, e a proposta define que a elegibilidade dessas instituições é responsabilidade da Fivo Lab. Cadastrar cada instituição manualmente pelo administrador não escala e transfere à Fivo Lab o trabalho de digitar dados que só a própria instituição conhece. A Atualização de 29/08/2026 resolve isso invertendo a porta de entrada: a instituição se cadastra sozinha, com a mesma estrutura de dados da empresa, anexa um documento que comprove sua existência, e o administrador decide sobre a elegibilidade analisando esse documento. O que não muda é a garantia final — nenhuma instituição fica disponível às empresas sem aprovação humana explícita.

## Goals

- [ ] Instituição conclui o autocadastro e anexa o documento de validação em menos de 5 minutos, sem contato humano prévio.
- [ ] Nenhuma instituição aparece para as empresas antes de aprovação explícita do administrador com análise do documento.
- [ ] Instituição mantém seus próprios dados cadastrais atualizados em área logada, sem depender do administrador.
- [ ] Empresa escolhe a beneficiada de uma lista fechada — instituições aprovadas ou causas curadas — sem texto livre.
- [ ] Página pública da campanha exibe dados verificados da instituição (nome, causa, cidade/UF, descrição, site) vindos do catálogo.

## Out of Scope

Explicitamente excluído. Documentado para evitar scope creep.

| Feature | Reason |
| ------- | ------ |
| Validação automática do documento (OCR, IA ou consulta a base externa) | Listada como fora de escopo na proposta; a análise do documento é humana na v1 |
| Integração com bases externas (CNES, CEBAS, Receita Federal) | Dependência externa sem valor de validação na v1 |
| Instituição criar ou gerenciar campanhas | A instituição é beneficiada, não anunciante; campanha pertence à empresa |
| Instituição acompanhar ou confirmar doações recebidas na sua área | A Fivo Lab não intermedeia a doação e não tem como conferir o recebimento na v1 |
| Autocadastro de causas pela instituição | Causa é taxonomia da plataforma; abrir sua criação fragmentaria o agrupamento por causa |
| Ranking ou destaque de instituições | Listado como evolução futura na proposta |
| Múltiplos documentos ou tipos de documento classificados | Um documento livre basta para a decisão humana da v1 (ver Assumptions) |
| Exposição pública do documento de validação | Pode conter dados sensíveis da instituição; visível apenas ao admin e à própria instituição |

---

## Assumptions & Open Questions

Toda ambiguidade está resolvida ou registrada aqui — nada fica silenciosamente indefinido.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Estrutura cadastral da instituição | A mesma da empresa — nome, CNPJ, e-mail, telefone, endereço, logo e senha — acrescida de causa, descrição curta, site e documento de validação | Determinado pela Atualização de 29/08/2026; reaproveita validações, telas e fluxo de aprovação já especificados em `cadastro-empresa` | y |
| Origem do cadastro | Self-service pela própria instituição, com aprovação do administrador | Determinado pela Atualização de 29/08/2026, substituindo a curadoria de digitação exclusiva do admin | y |
| Instituição como usuário da plataforma | Papel `INSTITUICAO` com login e área logada própria | Decidido com o usuário (AD-008): sem conta, toda correção de dado vira ticket manual para a Fivo Lab | y |
| Documento de validação | Exatamente 1 arquivo obrigatório na submissão, PDF, JPG ou PNG de até 10 MB, sem tipo fixo exigido, com descrição livre opcional de até 200 caracteres | Decidido com o usuário (AD-008): a documentação de terceiro setor é heterogênea; exigir tipos fixos barraria instituições pequenas legítimas | y |
| Autenticação da instituição | Reaproveita e-mail + senha, política de senha, rate limit de login e expiração de sessão definidos em `cadastro-empresa` | Uma única implementação de autenticação para os três papéis reduz superfície de erro de segurança | y |
| Estados da instituição | `PENDENTE_APROVACAO`, `APROVADA`, `REJEITADA`, `SUSPENSA`, `INATIVA` | Espelha a máquina de estados da empresa e preserva a inativação sem exclusão física | n |
| Curadoria de causas | Continua exclusiva do administrador; a instituição escolhe uma causa já existente no seu cadastro | Causa é taxonomia da plataforma; se cada instituição criasse a sua, o agrupamento por causa perderia sentido | n |
| Vínculo instituição–causa | Cada instituição pertence a exatamente uma causa | A proposta usa "instituição ou causa" alternadamente; o vínculo único permite que a campanha aponte para um dos dois sem ambiguidade | n |
| Vínculo da campanha | A campanha referencia uma instituição OU uma causa, nunca ambas e nunca nenhuma | Evita conflito de exibição na página pública sobre quem é a beneficiada | n |
| Remoção de instituição | Nunca há exclusão física; a instituição vai a `INATIVA` e deixa de aparecer para novas campanhas | Campanhas já publicadas e selos já impressos em embalagens referenciam a instituição para sempre | n |
| Efeito da inativação sobre campanhas existentes | Campanhas já aprovadas continuam publicadas apontando para a instituição inativada | Um selo já impresso em embalagem física não pode ser retirado do mundo real; retirar a página quebraria a promessa ao consumidor | n |
| Volume esperado na v1 | Até 200 instituições e 20 causas | Dimensiona a interface: lista com busca simples é suficiente, sem paginação sofisticada | n |
| Logo da instituição | Opcional; mesmas restrições de formato, tamanho e dimensão do logo de empresa | Nem toda instituição pequena tem material de marca disponível | n |
| Reenvio do documento após rejeição | Permitido: a instituição rejeitada corrige dados, substitui o documento e volta para a fila de análise | Sem isso, uma rejeição por documento ilegível exigiria novo cadastro e novo CNPJ duplicado | n |

**Open questions:** none - todas resolvidas ou registradas acima.

---

## User Stories

### P1: Autocadastro da instituição ⭐ MVP

**User Story**: Como instituição interessada, quero me cadastrar sozinha na plataforma informando meus dados e anexando um documento que comprove minha existência, para ficar disponível como beneficiada das campanhas das empresas.

**Why P1**: É a nova porta de entrada do catálogo (Atualização de 29/08/2026). Sem instituições cadastradas nenhuma campanha pode apontar para uma beneficiada.

**Acceptance Criteria**

1. WHEN a instituição envia o formulário de cadastro com nome, CNPJ, e-mail, telefone, endereço, causa, descrição, site ou canal de contato público, senha e documento de validação THEN the system SHALL criar a instituição no estado `PENDENTE_APROVACAO` e responder HTTP 201 com o identificador da instituição.
2. IF o CNPJ informado não tiver 14 dígitos ou falhar na verificação dos dígitos verificadores THEN the system SHALL rejeitar o cadastro com HTTP 422 e a mensagem "CNPJ inválido", sem persistir dado algum.
3. IF o CNPJ ou o e-mail já existir em outra instituição THEN the system SHALL rejeitar o cadastro com HTTP 409 e a mensagem "CNPJ ou e-mail já cadastrado".
4. IF a senha tiver menos de 10 caracteres THEN the system SHALL rejeitar o cadastro com HTTP 422 e a mensagem "A senha deve ter no mínimo 10 caracteres".
5. The system SHALL armazenar a senha da instituição apenas como hash com algoritmo de derivação de chave com salt (bcrypt ou argon2), nunca em texto claro.
6. IF o cadastro for submetido sem documento de validação THEN the system SHALL rejeitar com HTTP 422 e a mensagem "Anexe um documento que comprove a existência da instituição".
7. WHEN a instituição anexa o documento de validação THEN the system SHALL aceitar exatamente um arquivo PDF, JPG ou PNG de até 10 MB, com descrição livre opcional de até 200 caracteres.
8. IF o documento violar formato ou tamanho THEN the system SHALL rejeitar o upload com HTTP 422 informando qual limite foi violado, mantendo o restante do cadastro intacto.
9. IF a causa informada não existir ou estiver `INATIVA` THEN the system SHALL rejeitar o cadastro com HTTP 422 e a mensagem "Causa inválida ou inativa".
10. WHEN a instituição envia um logo THEN the system SHALL aceitar apenas PNG, JPG ou SVG de até 5 MB e, para formatos raster, com no mínimo 512×512 px, tratando o logo como campo opcional.
11. WHEN o cadastro é criado com sucesso THEN the system SHALL enviar e-mail ao endereço cadastrado informando que a instituição está em análise.
12. IF o armazenamento de arquivos estiver indisponível durante o envio do documento THEN the system SHALL responder HTTP 503 com a mensagem "Não foi possível enviar o documento, tente novamente" e não criar instituição sem documento.

**Independent Test**: Submeter o formulário público de instituição com dados válidos e um PDF e verificar que ela consta como `PENDENTE_APROVACAO` no painel administrativo e não aparece na lista de beneficiadas da empresa; submeter sem documento e com CNPJ duplicado e verificar as rejeições 422 e 409.

---

### P1: Aprovação da instituição pelo administrador ⭐ MVP

**User Story**: Como administrador da Fivo Lab, quero analisar o documento e os dados de cada instituição cadastrada e aprová-la ou rejeitá-la com motivo, para garantir que apenas instituições elegíveis sejam beneficiadas por campanhas.

**Why P1**: É o portão de elegibilidade que a proposta atribui à Fivo Lab (AD-003) e a contrapartida obrigatória do autocadastro.

**Acceptance Criteria**

1. WHEN o administrador autenticado abre a fila de instituições THEN the system SHALL listar todas as instituições em `PENDENTE_APROVACAO` ordenadas da mais antiga para a mais recente, exibindo nome, CNPJ, causa, cidade, UF, data de cadastro e link para o documento de validação.
2. WHEN o administrador aprova uma instituição THEN the system SHALL alterar o estado para `APROVADA`, registrar identificador do admin e data-hora da decisão, disponibilizá-la na lista de beneficiadas oferecida às empresas e enviar e-mail de aprovação à instituição.
3. WHEN o administrador rejeita uma instituição THEN the system SHALL exigir um motivo de no mínimo 20 caracteres, alterar o estado para `REJEITADA`, persistir o motivo e enviá-lo por e-mail à instituição.
4. WHILE uma instituição estiver em `PENDENTE_APROVACAO`, `REJEITADA`, `SUSPENSA` ou `INATIVA` the system SHALL ocultá-la das listas de beneficiadas oferecidas à empresa na criação e na edição de campanha.
5. The system SHALL permitir apenas as transições `PENDENTE_APROVACAO → APROVADA`, `PENDENTE_APROVACAO → REJEITADA`, `REJEITADA → PENDENTE_APROVACAO`, `APROVADA → SUSPENSA`, `SUSPENSA → APROVADA` e `APROVADA → INATIVA`, respondendo HTTP 409 a qualquer outra.
6. WHEN o administrador inativa uma instituição THEN the system SHALL alterar o estado para `INATIVA` sem excluir o registro e sem alterar campanhas já aprovadas que a referenciam.
7. The system SHALL restringir o acesso ao arquivo do documento de validação ao administrador e à própria instituição, respondendo HTTP 403 a qualquer outro solicitante.
8. IF um usuário sem papel de administrador chamar qualquer endpoint de aprovação, rejeição, suspensão ou inativação de instituição THEN the system SHALL responder HTTP 403 sem alterar estado algum.
9. The system SHALL registrar em log de auditoria toda mudança de estado de instituição, com autor, estado anterior, estado novo, motivo quando houver e data-hora.
10. IF o mesmo cadastro pendente for aprovado e rejeitado concorrentemente por dois administradores THEN the system SHALL aplicar apenas a primeira decisão e responder HTTP 409 à segunda.

**Independent Test**: Aprovar uma instituição pendente e verificar que ela passa a aparecer na lista de beneficiadas da empresa e que o e-mail foi enviado; rejeitar outra sem motivo e receber 422; tentar aprovar como usuário empresa e receber 403.

---

### P1: Manutenção de causas pelo administrador ⭐ MVP

**User Story**: Como administrador da Fivo Lab, quero cadastrar, editar e inativar causas, para manter a taxonomia que agrupa instituições e campanhas.

**Why P1**: A causa é pré-requisito do autocadastro da instituição e uma das duas beneficiadas possíveis de uma campanha.

**Acceptance Criteria**

1. WHEN o administrador cria uma causa informando nome e descrição THEN the system SHALL persistir a causa no estado `ATIVA` e responder HTTP 201.
2. IF o nome da causa já existir no catálogo THEN the system SHALL rejeitar com HTTP 409 e a mensagem "Causa já cadastrada".
3. WHEN o administrador inativa uma causa THEN the system SHALL alterar o estado para `INATIVA` sem excluir o registro e sem alterar campanhas já aprovadas que a referenciam.
4. IF o administrador tentar inativar uma causa que possui instituições `APROVADA` vinculadas THEN the system SHALL rejeitar com HTTP 409 e listar as instituições que precisam ser inativadas ou remanejadas antes.
5. WHILE uma causa estiver `INATIVA` the system SHALL ocultá-la das listas oferecidas à empresa na criação de campanha e do formulário de autocadastro de instituição.
6. IF um usuário sem papel de administrador chamar endpoints de escrita de causa THEN the system SHALL responder HTTP 403 sem alterar dado algum.
7. The system SHALL registrar em log de auditoria toda criação, edição e inativação de causa, com autor e data-hora.

**Independent Test**: Criar uma causa, vincular uma instituição aprovada a ela, tentar inativá-la e receber 409; inativar a instituição, repetir a inativação da causa e confirmar que ela some das listas de seleção.

---

### P1: Seleção da beneficiada pela empresa ⭐ MVP

**User Story**: Como empresa, quero escolher a instituição ou causa que minha campanha vai beneficiar a partir de uma lista curada, para vincular minha iniciativa a uma beneficiada verificada pela Fivo Lab.

**Why P1**: É o ponto de integração entre o catálogo e a criação de campanha (RF02/RF03).

**Acceptance Criteria**

1. WHEN a empresa aprovada consulta a lista de beneficiadas THEN the system SHALL retornar apenas instituições em estado `APROVADA` e causas em estado `ATIVA`, ordenadas alfabeticamente por nome.
2. WHEN a empresa informa um termo de busca com no mínimo 2 caracteres THEN the system SHALL filtrar o catálogo por correspondência parcial e sem distinção de acentos ou maiúsculas no nome da instituição ou da causa.
3. WHEN a empresa seleciona uma beneficiada THEN the system SHALL aceitar exatamente uma referência — instituição ou causa — e rejeitar com HTTP 422 qualquer requisição que envie as duas ou nenhuma.
4. IF a empresa referenciar uma instituição ou causa inexistente, não aprovada ou inativa no momento da submissão da campanha THEN the system SHALL rejeitar com HTTP 422 e a mensagem "Instituição ou causa indisponível".
5. The system SHALL expor publicamente, para cada beneficiada referenciada por campanha aprovada, apenas nome, causa, cidade, UF, descrição, site e logo — nunca o documento de validação, o e-mail de acesso, o telefone ou as notas internas de curadoria.
6. IF o catálogo não tiver nenhuma instituição aprovada THEN the system SHALL exibir à empresa a mensagem "Nenhuma instituição disponível no momento" em vez de uma lista vazia sem explicação.

**Independent Test**: Com o catálogo populado, criar campanha selecionando uma instituição pela busca; inativar essa instituição e tentar criar outra campanha apontando para ela, recebendo 422; conferir na resposta pública que o documento de validação não é exposto.

---

### P2: Área logada da instituição

**User Story**: Como instituição cadastrada, quero entrar na plataforma para acompanhar o status da minha análise, corrigir meus dados e substituir meu documento, para não depender do suporte da Fivo Lab a cada ajuste.

**Why P2**: Reduz o custo operacional da Fivo Lab e é o que torna o autocadastro realmente self-service, mas o MVP é demonstrável com a análise feita sobre o cadastro inicial.

**Acceptance Criteria**

1. WHEN a instituição autentica com e-mail e senha corretos THEN the system SHALL estabelecer sessão autenticada e responder HTTP 200 com o papel `INSTITUICAO`.
2. WHILE a instituição estiver autenticada the system SHALL exibir na área apenas dados pertencentes a ela, respondendo HTTP 403 a qualquer tentativa de acesso a recurso de outra instituição ou de uma empresa.
3. WHEN a instituição acessa sua área THEN the system SHALL exibir seu estado de cadastro e, quando `REJEITADA`, o motivo registrado pelo administrador.
4. WHEN a instituição altera telefone, endereço, descrição, site ou logo THEN the system SHALL persistir a alteração sem exigir nova análise e refletir o novo valor nas páginas públicas em no máximo 60 segundos.
5. IF a instituição tentar alterar o CNPJ THEN the system SHALL rejeitar com HTTP 422 e a mensagem "CNPJ não pode ser alterado; solicite ao suporte".
6. WHEN a instituição substitui o documento de validação ou altera nome ou causa de um cadastro `APROVADA` THEN the system SHALL mover a instituição para `PENDENTE_APROVACAO` e SHALL manter os dados aprovados anteriores visíveis às empresas até a nova decisão do administrador.
7. WHEN a instituição `REJEITADA` corrige seus dados e submete novamente THEN the system SHALL retornar o estado para `PENDENTE_APROVACAO`, preservando o histórico do motivo da rejeição.
8. The system SHALL aplicar às alterações de logo e de documento as mesmas restrições de formato, tamanho e dimensão do cadastro inicial.

**Independent Test**: Logar como instituição rejeitada, ler o motivo, substituir o documento, submeter novamente e confirmar que o cadastro volta à fila do administrador; tentar alterar o CNPJ e receber 422.

---

### P2: Notas internas de curadoria

**User Story**: Como administrador, quero registrar notas internas sobre a análise de elegibilidade de cada instituição, para preservar o histórico da decisão de curadoria.

**Why P2**: Melhora a operação e a auditabilidade da curadoria, mas o fluxo principal funciona sem isso.

**Acceptance Criteria**

1. WHEN o administrador salva uma nota interna em uma instituição THEN the system SHALL persistir o texto com autor e data-hora, mantendo o histórico das notas anteriores.
2. The system SHALL restringir a leitura das notas internas a usuários com papel de administrador, respondendo HTTP 403 a qualquer outro solicitante, inclusive à própria instituição.
3. The system SHALL excluir as notas internas de toda resposta de endpoint público.

**Independent Test**: Registrar uma nota como admin, confirmar que aparece no painel, que a página pública da campanha não a expõe e que a área logada da instituição também não.

---

## Edge Cases

- IF uma instituição for inativada ou suspensa enquanto uma campanha que a referencia está em análise THEN the system SHALL bloquear a aprovação dessa campanha com HTTP 409 até que a empresa selecione outra beneficiada.
- WHEN o nome ou a descrição da instituição contiver caracteres HTML THEN the system SHALL escapá-los na renderização pública.
- IF dois administradores editarem a mesma instituição simultaneamente THEN the system SHALL aplicar a última escrita e registrar ambas as edições no log de auditoria.
- WHEN a busca no catálogo não retornar resultados THEN the system SHALL exibir estado vazio explícito com a orientação de que a instituição pode se cadastrar sozinha na plataforma.
- IF dois cadastros de instituição com o mesmo CNPJ forem submetidos simultaneamente THEN the system SHALL persistir apenas o primeiro e rejeitar o segundo com HTTP 409, garantido por restrição de unicidade no banco.
- IF uma empresa e uma instituição se cadastrarem com o mesmo CNPJ THEN the system SHALL aceitar ambos os cadastros, porque são papéis distintos com contas independentes, e SHALL sinalizar a coincidência ao administrador na fila de análise.
- IF o arquivo do documento de validação ficar inacessível no armazenamento durante a análise THEN the system SHALL exibir ao administrador o item como temporariamente indisponível e SHALL bloquear a aprovação com HTTP 503 até que o arquivo volte a ser legível.
- IF a instituição for suspensa com campanhas aprovadas que a beneficiam THEN the system SHALL manter essas páginas públicas no ar e SHALL apenas ocultá-la de novas seleções, porque selos já impressos continuam em circulação.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| INST-01 | P1: Autocadastro da instituição — dados cadastrais e validações | Design | Pending |
| INST-02 | P1: Autocadastro da instituição — documento de validação obrigatório | Design | Pending |
| INST-03 | P1: Autocadastro da instituição — credencial e vínculo com causa | Design | Pending |
| INST-04 | P1: Aprovação pelo administrador — fila, decisão e comunicação | Design | Pending |
| INST-05 | P1: Aprovação pelo administrador — máquina de estados e auditoria | Design | Pending |
| INST-06 | P1: Aprovação pelo administrador — acesso restrito ao documento | Design | Pending |
| INST-07 | P1: Manutenção de causas pelo administrador | Design | Pending |
| INST-08 | P1: Seleção da beneficiada — listagem e busca | Design | Pending |
| INST-09 | P1: Seleção da beneficiada — vínculo exclusivo e validação | Design | Pending |
| INST-10 | P1: Seleção da beneficiada — exposição pública de dados | Design | Pending |
| INST-11 | P2: Área logada da instituição — autenticação e isolamento | - | Pending |
| INST-12 | P2: Área logada da instituição — edição e reanálise | - | Pending |
| INST-13 | P2: Notas internas de curadoria | - | Pending |

**ID format:** `[CATEGORY]-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 13 total, 0 mapeados para tasks, 13 não mapeados ⚠️ (esperado — fase Tasks ainda não executada)

---

## Success Criteria

- [ ] Uma instituição conclui o autocadastro com documento em menos de 5 minutos, sem suporte humano.
- [ ] Nenhuma instituição não aprovada aparece na lista de beneficiadas (verificável por teste que percorre cada estado e espera ausência na listagem).
- [ ] O documento de validação nunca aparece em resposta de endpoint público (verificável por teste que espera 403 e por inspeção do payload público).
- [ ] Inativar uma instituição não derruba nenhuma página pública já publicada.
- [ ] Busca no catálogo retorna resultado correto para termos com e sem acentuação.
