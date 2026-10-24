# Requirements Document

## Introduction

Esta feature integra o catálogo real de instituições e causas ao wizard de criação de campanha do frontend (web). Hoje os dois fluxos de wizard exibem instituições simuladas (`instituicoesMock`) e um pré-cadastro falso mantido em estado local do componente. O objetivo da tarefa T41 é substituir esses dados simulados por dados reais vindos do backend, por meio do endpoint autenticado `GET /beneficiadas?busca=`, mantendo a seleção da beneficiada consistente durante a navegação entre os passos e preservando o identificador escolhido no payload de criação da campanha.

O contrato de backend do catálogo já existe e não deve ser inventado nem alterado por esta feature. O endpoint exige papel `EMPRESA` e empresa com status `APROVADA`. Não existe ainda endpoint de pré-cadastro de instituições; portanto o pré-cadastro só pode ser integrado quando o contrato e o endpoint correspondentes estiverem disponíveis.

Escopo de arquivos: `web/src/components/campaign-wizard/steps/StepCausaRegra.tsx`, `web/src/components/campaign-wizard/steps/StepSobreCampanha.tsx`, `web/src/components/campaign-wizard/CampaignWizard.tsx`, `web/src/components/campaign-wizard/CampaignWizardNew.tsx`, `web/src/lib/campaign-wizard/mock-data.ts`, `web/src/lib/campaign-wizard/types.ts`, `web/src/services/instituicoes.ts` (criar) e `web/src/services/api.ts`.

## Glossary

- **Catalogo_Beneficiadas**: Serviço do frontend (`web/src/services/instituicoes.ts`) que consome o endpoint `GET /beneficiadas` e expõe as beneficiadas (instituições e causas) para a interface.
- **Wizard_Campanha**: Fluxo de criação de campanha no frontend. Possui duas variantes: `CampaignWizard` (seleção da beneficiada no passo 2, via `StepCausaRegra`) e `CampaignWizardNew` (seleção no passo 1, via `StepSobreCampanha`).
- **Passo_Beneficiada**: O componente de passo do wizard que exibe a lista de beneficiadas e permite a seleção — `StepCausaRegra` em `CampaignWizard` e `StepSobreCampanha` em `CampaignWizardNew`.
- **Beneficiada**: Item do catálogo retornado por `GET /beneficiadas`, com a forma `{ tipo, id, nome, causa, cidade, uf, descricao, site, logoArquivoId }`, onde `tipo` é `INSTITUICAO` ou `CAUSA`.
- **Cliente_HTTP**: Cliente HTTP compartilhado (`web/src/services/api.ts`), que expõe `request`, `ApiError`, `mensagemDeErro` e `ehErroRecuperavel`, envia `credentials: include` e prefixa `/api`.
- **Termo_Busca**: Texto digitado pela empresa para filtrar o catálogo, enviado no parâmetro `busca` da query string.
- **Identificador_Beneficiada**: Campo `instituicaoId` em `CampaignWizardData`, que armazena o `id` da beneficiada selecionada.
- **Payload_Criacao_Campanha**: Conjunto de dados do wizard (`CampaignWizardData`) usado para criar a campanha.
- **Pre_Cadastro_Instituicao**: Fluxo pelo qual a empresa solicita a inclusão de uma nova instituição ainda não presente no catálogo.
- **Estado_Carregamento**: Estado da interface enquanto a requisição ao catálogo está em andamento.
- **Estado_Erro**: Estado da interface quando a requisição ao catálogo falha.
- **Estado_Vazio**: Estado da interface quando o catálogo retorna uma lista sem itens.

## Requirements

### Requisito 1: Carregar beneficiadas a partir do catálogo real

**User Story:** Como empresa, quero ver no wizard a lista de instituições e causas vinda do catálogo do backend, para vincular minha campanha a uma beneficiada verificada pela Fivo Lab em vez de dados simulados.

#### Acceptance Criteria

1. WHEN o Passo_Beneficiada é exibido, THE Catalogo_Beneficiadas SHALL solicitar as beneficiadas ao endpoint `GET /beneficiadas` por meio do Cliente_HTTP em até 5 segundos após a exibição do passo.
2. WHILE a solicitação ao endpoint `GET /beneficiadas` estiver pendente, THE Passo_Beneficiada SHALL exibir um indicador de carregamento e SHALL impedir a seleção de qualquer Beneficiada.
3. WHEN o Catalogo_Beneficiadas retorna a lista de beneficiadas, THE Passo_Beneficiada SHALL exibir exclusivamente os itens recebidos do endpoint `GET /beneficiadas`, preservando a ordem em que foram retornados.
4. IF o endpoint `GET /beneficiadas` retorna uma lista vazia, THEN THE Passo_Beneficiada SHALL exibir uma mensagem indicando que não há beneficiadas disponíveis e SHALL impedir o avanço do wizard a partir do Passo_Beneficiada.
5. IF a solicitação ao endpoint `GET /beneficiadas` falha ou não é concluída em até 10 segundos, THEN THE Passo_Beneficiada SHALL exibir uma mensagem de erro indicando a falha no carregamento das beneficiadas, SHALL disponibilizar uma ação de nova tentativa e SHALL impedir o avanço do wizard a partir do Passo_Beneficiada.
6. THE Passo_Beneficiada SHALL exibir, para cada Beneficiada, o nome e a descrição retornados pelo endpoint `GET /beneficiadas`.
7. THE Catalogo_Beneficiadas SHALL expor as beneficiadas com os campos `tipo`, `id`, `nome`, `causa`, `cidade`, `uf`, `descricao`, `site` e `logoArquivoId` conforme o formato retornado pelo endpoint `GET /beneficiadas`.
8. IF uma Beneficiada retornada pelo endpoint `GET /beneficiadas` não contém os campos obrigatórios `id` e `nome`, THEN THE Catalogo_Beneficiadas SHALL descartar essa Beneficiada da lista exposta ao Passo_Beneficiada.

### Requisito 2: Indicar carregamento, erro e lista vazia

**User Story:** Como empresa, quero entender o que está acontecendo quando a lista de beneficiadas carrega, falha ou volta vazia, para saber se devo esperar, tentar novamente ou escolher outra ação.

#### Acceptance Criteria

1. WHILE a requisição ao endpoint `GET /beneficiadas` está em andamento, THE Passo_Beneficiada SHALL exibir o Estado_Carregamento como único estado visível, ocultando o Catalogo_Beneficiadas, o Estado_Vazio e o Estado_Erro.
2. IF a requisição ao endpoint `GET /beneficiadas` não é concluída em até 30 segundos, THEN THE Passo_Beneficiada SHALL encerrar o Estado_Carregamento e exibir o Estado_Erro com a ação "Tentar novamente".
3. WHEN o endpoint `GET /beneficiadas` retorna uma lista com 0 itens, THE Passo_Beneficiada SHALL exibir o Estado_Vazio com a mensagem "Nenhuma instituição disponível no momento" e ocultar o Estado_Carregamento e o Estado_Erro.
4. IF a requisição ao endpoint `GET /beneficiadas` falha, THEN THE Passo_Beneficiada SHALL exibir o Estado_Erro com a mensagem retornada por `mensagemDeErro` do Cliente_HTTP e preservar qualquer lista previamente carregada sem substituí-la por dados parciais.
5. IF a requisição ao endpoint `GET /beneficiadas` falha e `mensagemDeErro` do Cliente_HTTP está vazia ou ausente, THEN THE Passo_Beneficiada SHALL exibir o Estado_Erro com uma mensagem padrão indicando falha ao carregar as instituições.
6. IF a requisição ao endpoint `GET /beneficiadas` falha com erro recuperável segundo `ehErroRecuperavel` do Cliente_HTTP, THEN THE Passo_Beneficiada SHALL exibir a ação "Tentar novamente"; caso contrário, THE Passo_Beneficiada SHALL ocultar a ação "Tentar novamente".
7. WHEN a empresa aciona a ação "Tentar novamente", THE Catalogo_Beneficiadas SHALL solicitar novamente as beneficiadas ao endpoint `GET /beneficiadas` e THE Passo_Beneficiada SHALL exibir o Estado_Carregamento durante a nova requisição.

### Requisito 3: Buscar beneficiadas pelo nome

**User Story:** Como empresa, quero buscar a beneficiada pelo nome, para encontrar rapidamente a instituição ou causa que quero vincular à campanha.

#### Acceptance Criteria

1. WHEN a empresa digita um Termo_Busca com 2 a 200 caracteres, THE Catalogo_Beneficiadas SHALL enviar o Termo_Busca no parâmetro `busca` da requisição ao endpoint `GET /beneficiadas`.
2. WHILE o Termo_Busca tem menos de 2 caracteres, THE Catalogo_Beneficiadas SHALL solicitar o catálogo completo sem enviar valor de filtro no parâmetro `busca`.
3. WHEN a empresa altera o Termo_Busca, THE Catalogo_Beneficiadas SHALL aguardar 300 milissegundos sem nova digitação antes de enviar a requisição ao endpoint `GET /beneficiadas`.
4. WHEN o endpoint `GET /beneficiadas` retorna o resultado de uma busca, THE Passo_Beneficiada SHALL exibir as beneficiadas na ordem recebida do endpoint.
5. WHEN o endpoint `GET /beneficiadas` retorna uma lista sem itens para um Termo_Busca, THE Passo_Beneficiada SHALL exibir o Estado_Vazio indicando que nenhuma beneficiada corresponde ao Termo_Busca.
6. WHILE a requisição ao endpoint `GET /beneficiadas` está pendente de resposta, THE Passo_Beneficiada SHALL exibir um indicador de carregamento em vez da lista de beneficiadas.
7. IF a requisição ao endpoint `GET /beneficiadas` falha ou não recebe resposta em 10 segundos, THEN THE Passo_Beneficiada SHALL exibir uma mensagem de erro indicando que a busca não pôde ser concluída, preservar o Termo_Busca digitado e oferecer a opção de repetir a busca.

### Requisito 4: Exigir autenticação e tratar erros de autorização

**User Story:** Como empresa, quero mensagens claras quando não tenho acesso ao catálogo, para entender se minha sessão expirou ou se minha empresa ainda não foi aprovada.

#### Acceptance Criteria

1. WHEN o Catalogo_Beneficiadas solicita as beneficiadas, THE Catalogo_Beneficiadas SHALL enviar a requisição ao endpoint `GET /beneficiadas` por meio do Cliente_HTTP com `credentials: include` e um tempo limite de 30 segundos.
2. WHILE a requisição ao endpoint `GET /beneficiadas` estiver pendente, THE Passo_Beneficiada SHALL exibir um indicador de carregamento e ocultar tanto a lista de beneficiadas quanto o Estado_Erro.
3. WHEN o endpoint `GET /beneficiadas` responde com status 200, THE Passo_Beneficiada SHALL ocultar o indicador de carregamento e exibir a lista de beneficiadas retornada.
4. IF o endpoint `GET /beneficiadas` responde com status 401, THEN THE Passo_Beneficiada SHALL exibir, em até 1 segundo após a resposta, a mensagem de sessão expirada retornada por `mensagemDeErro` do Cliente_HTTP.
5. IF o endpoint `GET /beneficiadas` responde com status 403, THEN THE Passo_Beneficiada SHALL exibir, em até 1 segundo após a resposta, a mensagem de ausência de permissão retornada por `mensagemDeErro` do Cliente_HTTP.
6. IF o endpoint `GET /beneficiadas` responde com status 404, THEN THE Passo_Beneficiada SHALL exibir, em até 1 segundo após a resposta, a mensagem de recurso não encontrado retornada por `mensagemDeErro` do Cliente_HTTP.
7. IF o endpoint `GET /beneficiadas` responde com status 401, 403 ou 404 e `mensagemDeErro` do Cliente_HTTP está ausente, vazia ou nula, THEN THE Passo_Beneficiada SHALL exibir o Estado_Erro com uma mensagem genérica indicando falha ao carregar o catálogo e a ação "Tentar novamente".
8. IF o endpoint `GET /beneficiadas` responde com status maior ou igual a 500, THEN THE Passo_Beneficiada SHALL exibir, em até 1 segundo após a resposta, o Estado_Erro com a ação "Tentar novamente".
9. IF a requisição ao endpoint `GET /beneficiadas` falha por indisponibilidade de conexão sinalizada com status 0 pelo Cliente_HTTP, ou excede o tempo limite de 30 segundos, THEN THE Passo_Beneficiada SHALL exibir o Estado_Erro com a ação "Tentar novamente".
10. WHEN a empresa aciona a ação "Tentar novamente" exibida no Estado_Erro, THE Passo_Beneficiada SHALL ocultar o Estado_Erro e reenviar a requisição ao endpoint `GET /beneficiadas` conforme o critério 1.

### Requisito 5: Preservar a beneficiada selecionada na navegação

**User Story:** Como empresa, quero que a beneficiada que escolhi continue selecionada ao navegar entre os passos do wizard, para não perder minha escolha ao avançar ou voltar.

#### Acceptance Criteria

1. WHEN a empresa seleciona uma Beneficiada, THE Passo_Beneficiada SHALL registrar o campo `id` da Beneficiada selecionada no Identificador_Beneficiada por meio de `onChange`.
2. WHILE o Identificador_Beneficiada corresponde ao `id` de exatamente uma Beneficiada exibida, THE Passo_Beneficiada SHALL exibir essa Beneficiada como selecionada.
3. IF o Identificador_Beneficiada está definido mas não corresponde ao `id` de nenhuma Beneficiada exibida, THEN THE Passo_Beneficiada SHALL não exibir nenhuma Beneficiada como selecionada e SHALL manter o Identificador_Beneficiada inalterado.
4. WHEN a empresa navega do Passo_Beneficiada para qualquer outro passo do wizard e retorna ao Passo_Beneficiada, THE Wizard_Campanha SHALL manter o Identificador_Beneficiada com o valor selecionado anteriormente.
5. WHEN a empresa retorna ao Passo_Beneficiada com um Identificador_Beneficiada já definido, THE Passo_Beneficiada SHALL exibir a Beneficiada correspondente como selecionada em até 2 segundos após a conclusão do recarregamento da lista.
6. IF o recarregamento da lista de beneficiadas ao retornar ao Passo_Beneficiada falha, THEN THE Passo_Beneficiada SHALL preservar o Identificador_Beneficiada previamente selecionado e SHALL exibir uma indicação de erro de carregamento.

### Requisito 6: Preservar o identificador no payload de criação

**User Story:** Como empresa, quero que a beneficiada escolhida seja enviada na criação da campanha, para que minha campanha fique vinculada à instituição ou causa correta.

#### Acceptance Criteria

1. WHEN a empresa conclui o Wizard_Campanha com um Identificador_Beneficiada não nulo e não vazio, THE Wizard_Campanha SHALL incluir esse Identificador_Beneficiada no Payload_Criacao_Campanha.
2. WHILE o Identificador_Beneficiada é nulo ou vazio, THE Wizard_Campanha SHALL impedir o avanço do Passo_Beneficiada e exibir uma indicação de erro informando que a seleção da beneficiada é obrigatória.
3. THE Identificador_Beneficiada SHALL corresponder exatamente ao identificador único da Beneficiada selecionada no catálogo de beneficiadas disponíveis.
4. IF a empresa tenta concluir o Wizard_Campanha com Identificador_Beneficiada nulo, vazio ou não correspondente a uma Beneficiada disponível, THEN THE Wizard_Campanha SHALL bloquear o envio do Payload_Criacao_Campanha, preservar os dados já preenchidos e exibir uma indicação de erro informando que a beneficiada selecionada é inválida.

### Requisito 7: Remover os dados simulados de beneficiadas

**User Story:** Como desenvolvedor, quero que as instituições simuladas sejam removidas após a integração, para que o wizard dependa somente do catálogo real e não exiba dados inventados.

#### Acceptance Criteria

1. WHEN a integração com o endpoint `GET /beneficiadas` está concluída, THE Passo_Beneficiada SHALL obter as beneficiadas exclusivamente do Catalogo_Beneficiadas, sem referenciar qualquer fonte de dados simulada.
2. IF o Catalogo_Beneficiadas retornar uma lista vazia de Beneficiada, THEN THE Passo_Beneficiada SHALL exibir uma indicação de ausência de beneficiadas disponíveis e não SHALL exibir dados simulados.
3. IF a obtenção das beneficiadas a partir do endpoint `GET /beneficiadas` falhar, THEN THE Passo_Beneficiada SHALL exibir uma indicação de erro de carregamento, preservar o estado anterior do wizard sem perda dos dados já preenchidos e não SHALL recorrer a dados simulados como fallback.
4. THE componente `StepCausaRegra` SHALL deixar de importar `instituicoesMock` de `web/src/lib/campaign-wizard/mock-data.ts`.
5. THE componente `StepSobreCampanha` SHALL deixar de importar `instituicoesMock` de `web/src/lib/campaign-wizard/mock-data.ts`.
6. WHERE `instituicoesMock` deixa de ser referenciado por qualquer módulo, THE arquivo `web/src/lib/campaign-wizard/mock-data.ts` SHALL ser removido junto com a exportação `instituicoesMock`, de modo que nenhum módulo do projeto mantenha importação ou referência a `instituicoesMock`.
7. THE tipo `Instituicao` em `web/src/lib/campaign-wizard/types.ts` SHALL refletir integralmente o formato de Beneficiada retornado pelo endpoint `GET /beneficiadas`, sem campos exclusivos dos dados simulados removidos.

### Requisito 8: Adiar o pré-cadastro até existir contrato

**User Story:** Como empresa, quero que a opção de pré-cadastrar uma instituição só envie dados quando houver um canal real de backend, para não criar a falsa impressão de que minha solicitação foi registrada.

#### Acceptance Criteria

1. WHILE não existir endpoint de Pre_Cadastro_Instituicao disponível no backend, THE Passo_Beneficiada SHALL deixar de registrar beneficiadas simuladas em estado local do componente.
2. IF a empresa aciona o Pre_Cadastro_Instituicao enquanto o endpoint correspondente não existe, THEN THE Passo_Beneficiada SHALL exibir, em até 1 segundo, uma mensagem informando que o pré-cadastro ainda não está disponível.
3. IF a empresa aciona o Pre_Cadastro_Instituicao enquanto o endpoint correspondente não existe, THEN THE Passo_Beneficiada SHALL preservar a seleção atual do Identificador_Beneficiada e os dados já preenchidos no formulário de pré-cadastro.
4. WHERE o contrato e o endpoint de Pre_Cadastro_Instituicao estiverem disponíveis, WHEN a empresa aciona o Pre_Cadastro_Instituicao, THE Passo_Beneficiada SHALL enviar a solicitação de pré-cadastro por meio do Catalogo_Beneficiadas ao endpoint correspondente em até 5 segundos.
5. IF o envio da solicitação de Pre_Cadastro_Instituicao falha ou não é concluído em até 10 segundos, THEN THE Passo_Beneficiada SHALL exibir uma indicação de erro, preservar os dados preenchidos no formulário e preservar a seleção atual do Identificador_Beneficiada.
6. THE Passo_Beneficiada SHALL enviar solicitações de Pre_Cadastro_Instituicao exclusivamente ao endpoint confirmado pelo contrato de backend, não emitindo nenhuma solicitação a rotas não confirmadas.
