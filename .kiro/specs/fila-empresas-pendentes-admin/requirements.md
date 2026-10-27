# Requirements Document

## Introduction

Esta funcionalidade adiciona ao painel administrativo a fila de empresas pendentes de análise e a decisão sobre cada uma. Após o cadastro, uma empresa fica pendente e precisa ser aprovada por um administrador antes de poder criar campanhas. O fluxo espelha o das instituições (F6), porém SEM documento de validação: não há botão "Ver documento", nem campos ou avisos relacionados a documento (`documentoDisponivel`, `documentoArquivoId`, `cnpjCoincideComEmpresa`).

A tela lista as empresas pendentes exibindo razão social, CNPJ, e-mail e data do cadastro, na ordem retornada pela API (da mais antiga para a mais recente). Para cada empresa, o administrador pode aprovar (com confirmação) ou rejeitar (informando um motivo com no mínimo 20 caracteres). Após uma decisão bem-sucedida, a empresa sai da lista e uma mensagem de confirmação é exibida. O diálogo de motivo reutiliza o componente compartilhado `DialogoMotivoRejeicao` (F6), que já aplica o mínimo de 20 caracteres no cliente.

Fora do escopo desta funcionalidade: suspender e reativar empresas já aprovadas (a API lista apenas as pendentes) — mesma lacuna da F7.

## Glossary

- **Fila_Empresas**: componente de interface (`web/src/components/admin/FilaEmpresas.tsx`) que lista empresas pendentes e oferece as ações de aprovar e rejeitar.
- **Pagina_Empresas_Admin**: rota de interface (`web/src/app/admin/empresas/page.tsx`) que renderiza a Fila_Empresas sob o layout administrativo.
- **Servico_Admin**: módulo de serviço (`web/src/services/admin.ts`) que expõe os tipos e funções de comunicação com a API para o domínio administrativo.
- **Dialogo_Motivo_Rejeicao**: componente compartilhado existente (`web/src/components/admin/DialogoMotivoRejeicao.tsx`) que coleta o motivo de rejeição e aplica o mínimo de caracteres no cliente.
- **AuthGuard**: componente de proteção de rota por papel, aplicado no layout administrativo (`web/src/app/admin/layout.tsx`) com papel `ADMIN`.
- **Empresa_Pendente**: empresa cadastrada que aguarda decisão do administrador, representada pelo tipo `ItemFilaEmpresa` com os campos `id`, `razaoSocial`, `cnpj`, `email` e `criadoEm`.
- **Administrador**: usuário autenticado com papel `ADMIN`.
- **Motivo_Minimo**: constante `MOTIVO_REJEICAO_MINIMO`, igual a 20 caracteres, definida no Servico_Admin.
- **ApiError**: erro de aplicação que carrega o código de status HTTP da resposta da API.

## Requirements

### Requisito 1: Serviço de listagem de empresas pendentes

**User Story:** Como administrador, quero que o sistema busque as empresas pendentes na API, para que eu possa analisá-las na fila.

#### Acceptance Criteria

1. THE Servico_Admin SHALL expor o tipo `ItemFilaEmpresa` com os campos `id`, `razaoSocial`, `cnpj`, `email` e `criadoEm`.
2. WHEN a função `listarFilaEmpresas` é chamada, THE Servico_Admin SHALL emitir uma requisição GET para o recurso `/admin/empresas`.
3. WHEN a API responde com sucesso, THE Servico_Admin SHALL retornar a lista de empresas pendentes na ordem recebida da API.

### Requisito 2: Serviço de aprovação de empresa

**User Story:** Como administrador, quero que o sistema registre a aprovação de uma empresa na API, para que ela possa criar campanhas.

#### Acceptance Criteria

1. WHEN a função `aprovarEmpresa` é chamada com o identificador de uma empresa, THE Servico_Admin SHALL emitir uma requisição POST para o recurso `/admin/empresas/{id}/aprovacao`.
2. WHEN a API responde com sucesso à aprovação, THE Servico_Admin SHALL concluir a operação sem retornar conteúdo.

### Requisito 3: Serviço de rejeição de empresa

**User Story:** Como administrador, quero que o sistema registre a rejeição de uma empresa com um motivo na API, para que a empresa receba a justificativa.

#### Acceptance Criteria

1. WHEN a função `rejeitarEmpresa` é chamada com um identificador e um motivo, THE Servico_Admin SHALL emitir uma requisição POST para o recurso `/admin/empresas/{id}/rejeicao` com corpo JSON contendo o campo `motivo`.
2. WHEN a API responde com sucesso à rejeição, THE Servico_Admin SHALL concluir a operação sem retornar conteúdo.

### Requisito 4: Proteção de rota por papel

**User Story:** Como administrador, quero que apenas usuários com papel ADMIN acessem a tela de empresas em análise, para que a decisão fique restrita a quem tem permissão.

#### Acceptance Criteria

1. THE Pagina_Empresas_Admin SHALL ser renderizada sob o AuthGuard com papel `ADMIN`.
2. IF um usuário sem papel `ADMIN` acessa a Pagina_Empresas_Admin, THEN THE AuthGuard SHALL impedir a exibição da Fila_Empresas.
3. IF a listagem de empresas pendentes retorna ApiError com status 401, THEN THE Fila_Empresas SHALL redirecionar o Administrador para a rota de login.

### Requisito 5: Exibição da lista de empresas pendentes

**User Story:** Como administrador, quero ver as empresas pendentes com seus dados, para que eu possa decidir sobre cada uma.

#### Acceptance Criteria

1. WHEN a Pagina_Empresas_Admin é aberta, THE Fila_Empresas SHALL solicitar a lista de empresas pendentes ao Servico_Admin.
2. WHILE a lista de empresas pendentes está sendo carregada, THE Fila_Empresas SHALL exibir um indicador de carregamento.
3. WHEN a lista de empresas pendentes é recebida, THE Fila_Empresas SHALL exibir, para cada Empresa_Pendente, a razão social, o CNPJ, o e-mail e a data do cadastro.
4. WHEN a lista de empresas pendentes é exibida, THE Fila_Empresas SHALL apresentar as empresas na ordem recebida da API.
5. WHERE a lista de empresas pendentes está vazia, THE Fila_Empresas SHALL exibir a mensagem "Nenhuma empresa aguardando análise".
6. THE Fila_Empresas SHALL exibir, para cada Empresa_Pendente, um botão "Aprovar" e um botão "Rejeitar".

### Requisito 6: Tratamento de erro no carregamento da lista

**User Story:** Como administrador, quero ser avisado quando a lista não carrega, para que eu possa tentar de novo.

#### Acceptance Criteria

1. IF a listagem de empresas pendentes falha com erro diferente de ApiError com status 401, THEN THE Fila_Empresas SHALL exibir uma mensagem de erro e uma ação "Tentar novamente".
2. WHEN o Administrador aciona "Tentar novamente", THE Fila_Empresas SHALL solicitar novamente a lista de empresas pendentes ao Servico_Admin.

### Requisito 7: Aprovação de empresa com confirmação

**User Story:** Como administrador, quero confirmar antes de aprovar uma empresa, para que eu evite aprovações acidentais.

#### Acceptance Criteria

1. WHEN o Administrador aciona o botão "Aprovar" de uma Empresa_Pendente, THE Fila_Empresas SHALL exibir um diálogo de confirmação identificando a empresa selecionada.
2. WHEN o Administrador confirma a aprovação, THE Fila_Empresas SHALL chamar `aprovarEmpresa` com o identificador da empresa selecionada.
3. WHILE a aprovação está em andamento, THE Fila_Empresas SHALL desabilitar as ações do diálogo de confirmação.
4. WHEN a aprovação é concluída com sucesso, THE Fila_Empresas SHALL remover a empresa aprovada da lista.
5. WHEN a aprovação é concluída com sucesso, THE Fila_Empresas SHALL exibir uma mensagem de confirmação de que a empresa foi aprovada.
6. WHEN o Administrador cancela o diálogo de confirmação, THE Fila_Empresas SHALL fechar o diálogo sem alterar a lista.

### Requisito 8: Rejeição de empresa com motivo

**User Story:** Como administrador, quero rejeitar uma empresa informando um motivo, para que a empresa receba a justificativa.

#### Acceptance Criteria

1. WHEN o Administrador aciona o botão "Rejeitar" de uma Empresa_Pendente, THE Fila_Empresas SHALL exibir o Dialogo_Motivo_Rejeicao identificando a empresa selecionada.
2. WHERE o motivo informado tem menos de Motivo_Minimo caracteres após remover espaços nas extremidades, THE Dialogo_Motivo_Rejeicao SHALL impedir o envio da rejeição e exibir a validação de tamanho mínimo.
3. WHEN o Administrador confirma a rejeição com um motivo de no mínimo Motivo_Minimo caracteres, THE Fila_Empresas SHALL chamar `rejeitarEmpresa` com o identificador da empresa selecionada e o motivo informado.
4. WHILE a rejeição está em andamento, THE Dialogo_Motivo_Rejeicao SHALL desabilitar as ações de confirmar e cancelar.
5. WHEN a rejeição é concluída com sucesso, THE Fila_Empresas SHALL remover a empresa rejeitada da lista.
6. WHEN a rejeição é concluída com sucesso, THE Fila_Empresas SHALL exibir uma mensagem de confirmação de que a empresa foi rejeitada.

### Requisito 9: Tratamento de erros de decisão

**User Story:** Como administrador, quero receber mensagens claras quando a decisão falha, para que eu entenda o que aconteceu e a lista reflita o estado real.

#### Acceptance Criteria

1. IF uma decisão retorna ApiError com status 409, THEN THE Fila_Empresas SHALL fechar o diálogo, exibir um aviso informando que outra pessoa já decidiu sobre a empresa e recarregar a lista de empresas pendentes.
2. IF uma decisão retorna ApiError com status 404, THEN THE Fila_Empresas SHALL fechar o diálogo, exibir um aviso informando que a empresa não foi encontrada e recarregar a lista de empresas pendentes.
3. IF uma decisão retorna ApiError com status 403, THEN THE Fila_Empresas SHALL exibir uma mensagem informando que o Administrador não tem permissão para decidir sobre empresas.
4. IF a rejeição retorna ApiError com status 422, THEN THE Fila_Empresas SHALL exibir, no Dialogo_Motivo_Rejeicao, uma mensagem informando que o motivo é inválido.
5. IF uma decisão retorna ApiError com status 401, THEN THE Fila_Empresas SHALL redirecionar o Administrador para a rota de login.
6. IF uma decisão falha com erro diferente dos status 401, 403, 404, 409 e 422, THEN THE Fila_Empresas SHALL exibir a mensagem de erro no diálogo da decisão em andamento.
