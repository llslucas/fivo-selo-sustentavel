# Requirements Document

## Introduction

A funcionalidade **F2: Escolha da causa no cadastro de instituição (lista de causas)** substitui o campo provisório criado na F1 por um seletor de causas real, alimentado pela lista de causas que o administrador mantém na API.

Uma instituição não digita a causa que defende em texto livre: ela escolhe uma causa de uma lista pré-cadastrada (por exemplo, Educação, Saúde, Meio ambiente). Isso evita que a mesma causa seja registrada de formas diferentes e garante consistência no catálogo. A API só aceita o cadastro de uma instituição quando uma causa válida e ativa é informada no campo `causaId`.

O seletor consome a rota pública `GET /causas`, que retorna apenas causas ativas em ordem alfabética, e exibe para cada causa o nome e a descrição. O componente precisa lidar com os estados de carregamento, erro (com ação de "Tentar novamente"), lista vazia (com bloqueio de envio do formulário) e com a rejeição 422 "causa inválida ou inativa", que pode ocorrer quando uma causa é desativada enquanto o usuário preenche o formulário.

## Glossary

- **Seletor_De_Causa**: Componente de interface (`SeletorCausa`) responsável por buscar as causas na API, exibir a lista e permitir que o usuário escolha uma causa.
- **Formulário_De_Cadastro**: Componente de interface (`CadastroInstituicaoForm`) que reúne os dados da instituição e envia o cadastro para a API.
- **Servico_De_Causas**: Módulo (`services/causas.ts`) que expõe a função `listarCausas()` para obter o catálogo público de causas da API.
- **Causa**: Registro do catálogo com os atributos `id`, `nome` e `descricao`.
- **Causa_Ativa**: Causa que o administrador mantém disponível para seleção; a rota `GET /causas` retorna somente causas ativas.
- **Causa_Inativa**: Causa que foi desativada pelo administrador e, portanto, não deve ser oferecida nem aceita no cadastro.
- **causaId**: Campo do cadastro que carrega o identificador (`id`) da causa escolhida pelo usuário.
- **Erro_Recuperavel**: Erro cuja repetição da operação pode ter sucesso — status 0 (sem conexão) ou status maior ou igual a 500, conforme `ehErroRecuperavel()`.
- **Estado_Carregando**: Situação em que o Seletor_De_Causa aguarda a resposta da requisição de busca das causas.
- **Estado_Erro**: Situação em que a busca das causas falhou.
- **Lista_Vazia**: Situação em que a busca das causas é bem-sucedida e retorna nenhuma causa.
- **Erro_422_Causa**: Resposta de validação da API, com status 422, que indica "causa inválida ou inativa" para o campo `causaId`.
- **Limite_De_Espera**: Tempo máximo de 10 segundos que o Seletor_De_Causa aguarda a conclusão da requisição de busca das causas antes de tratá-la como falha.
- **Mensagem_Lista_Vazia**: Texto "Ainda não há causas cadastradas" apresentado pelo Seletor_De_Causa quando a busca retorna nenhuma Causa.
- **Mensagem_Causa_Invalida**: Texto, apresentado junto ao campo `causaId`, indicando que a causa selecionada é inválida ou inativa.

## Requirements

### Requisito 1: Obter causas da API

**User Story:** Como instituição em cadastro, quero que o seletor mostre as causas cadastradas pelo administrador, para que eu escolha a causa correta sem digitá-la manualmente.

#### Critérios de Aceitação

1. WHEN o Seletor_De_Causa é montado, THE Seletor_De_Causa SHALL solicitar a lista de causas ao Servico_De_Causas por meio de `listarCausas()`, que consome a rota pública `GET /causas`.
2. WHEN o Servico_De_Causas retorna a lista de causas, THE Seletor_De_Causa SHALL apresentar cada Causa_Ativa como uma opção selecionável que exibe o atributo `nome` e o atributo `descricao`.
3. THE Seletor_De_Causa SHALL apresentar as causas na ordem alfabética fornecida pelo Servico_De_Causas.
4. WHERE uma Causa está inativa, THE Seletor_De_Causa SHALL apresentar nenhuma opção correspondente à Causa_Inativa.
5. WHILE a requisição de busca das causas está em andamento e dentro do Limite_De_Espera, THE Seletor_De_Causa SHALL apresentar o Estado_Carregando.
6. WHEN a requisição de busca das causas é bem-sucedida e retorna nenhuma Causa, THE Seletor_De_Causa SHALL apresentar o estado de Lista_Vazia.
7. IF a requisição de busca das causas falha ou excede o Limite_De_Espera de 10 segundos, THEN THE Seletor_De_Causa SHALL apresentar uma indicação de erro e SHALL manter a ausência de Causa selecionada.

### Requisito 2: Selecionar a causa e enviar o identificador

**User Story:** Como instituição em cadastro, quero escolher uma causa da lista e enviá-la no cadastro, para que a instituição fique associada à causa correta.

#### Critérios de Aceitação

1. WHEN o usuário seleciona uma Causa no Seletor_De_Causa, THE Seletor_De_Causa SHALL informar ao Formulário_De_Cadastro o `id` da Causa escolhida por meio da função `onChange`, em até 1 segundo após a seleção.
2. WHEN o Seletor_De_Causa informa o `id` da Causa escolhida por meio da função `onChange`, THE Formulário_De_Cadastro SHALL armazenar esse `id` no campo `causaId`, substituindo qualquer valor anteriormente armazenado nesse campo.
3. WHEN o usuário envia o Formulário_De_Cadastro e o campo `causaId` contém o `id` de uma Causa existente na lista apresentada pelo Seletor_De_Causa, THE Formulário_De_Cadastro SHALL incluir o valor de `causaId` no cadastro enviado à API por meio de `criarInstituicao()`.
4. IF o usuário envia o Formulário_De_Cadastro com o campo `causaId` vazio, THEN THE Formulário_De_Cadastro SHALL impedir o envio à API, exibir uma mensagem indicando que o campo de causa é obrigatório e preservar os demais valores já preenchidos no formulário.
5. IF o usuário envia o Formulário_De_Cadastro com um valor de `causaId` que não corresponde a nenhuma Causa existente na lista apresentada pelo Seletor_De_Causa, THEN THE Formulário_De_Cadastro SHALL impedir o envio à API, exibir a Mensagem_Causa_Invalida e preservar os demais valores já preenchidos no formulário.

### Requisito 3: Estado de carregamento

**User Story:** Como instituição em cadastro, quero perceber quando as causas ainda estão sendo carregadas, para que eu entenda por que a lista ainda não aparece.

#### Critérios de Aceitação

1. WHILE a requisição de busca das causas está em andamento e dentro do Limite_De_Espera, THE Seletor_De_Causa SHALL apresentar o Estado_Carregando.
2. WHILE o Seletor_De_Causa está no Estado_Carregando, THE Seletor_De_Causa SHALL impedir a seleção de uma Causa.
3. WHEN a requisição de busca das causas termina com sucesso, THE Seletor_De_Causa SHALL encerrar o Estado_Carregando e apresentar a lista de Causas.
4. IF a requisição de busca das causas falha ou excede o Limite_De_Espera de 10 segundos, THEN THE Seletor_De_Causa SHALL encerrar o Estado_Carregando e apresentar uma indicação de erro informando que as causas não puderam ser carregadas, preservando a ausência de Causa selecionada.
5. WHERE uma indicação de erro de carregamento está apresentada, THE Seletor_De_Causa SHALL disponibilizar uma ação para repetir a requisição de busca das causas.

### Requisito 4: Estado de erro com "Tentar novamente"

**User Story:** Como instituição em cadastro, quero poder tentar carregar as causas de novo quando a busca falhar, para que uma falha temporária não me impeça de concluir o cadastro.

#### Critérios de Aceitação

1. IF a requisição de busca das causas retorna erro ou não é concluída dentro do Limite_De_Espera de 10 segundos, THEN THE Seletor_De_Causa SHALL apresentar o Estado_Erro com uma mensagem informando que não foi possível carregar as causas.
2. WHILE o Seletor_De_Causa está no Estado_Erro, THE Seletor_De_Causa SHALL apresentar uma ação de "Tentar novamente".
3. WHEN o usuário aciona a ação de "Tentar novamente", THE Seletor_De_Causa SHALL solicitar novamente a lista de causas ao Servico_De_Causas.
4. WHEN o usuário aciona a ação de "Tentar novamente", THE Seletor_De_Causa SHALL retornar ao Estado_Carregando enquanto a nova requisição está em andamento.
5. IF a nova requisição acionada pela ação de "Tentar novamente" também retorna erro ou não é concluída dentro do Limite_De_Espera de 10 segundos, THEN THE Seletor_De_Causa SHALL retornar ao Estado_Erro com a ação de "Tentar novamente" novamente disponível.
6. WHILE o Seletor_De_Causa está no Estado_Carregando, THE Seletor_De_Causa SHALL manter a ação de "Tentar novamente" desabilitada, impedindo o disparo de novas requisições simultâneas.

### Requisito 5: Lista vazia bloqueia o envio

**User Story:** Como instituição em cadastro, quero ser avisada quando ainda não houver causas cadastradas, para que eu entenda por que não consigo concluir o cadastro.

#### Critérios de Aceitação

1. WHEN a busca das causas é bem-sucedida e retorna nenhuma Causa, THE Seletor_De_Causa SHALL apresentar o estado de Lista_Vazia.
2. WHILE o Seletor_De_Causa está no estado de Lista_Vazia, THE Seletor_De_Causa SHALL apresentar a Mensagem_Lista_Vazia "Ainda não há causas cadastradas".
3. WHILE o Seletor_De_Causa está no estado de Lista_Vazia, THE Formulário_De_Cadastro SHALL manter o controle de envio do cadastro desabilitado e impedir o envio do cadastro.
4. IF a busca das causas falha, THEN THE Seletor_De_Causa SHALL apresentar uma mensagem indicando que não foi possível carregar as causas e SHALL manter o controle de envio do cadastro desabilitado.

### Requisito 6: Tratamento da rejeição 422 "causa inválida ou inativa"

**User Story:** Como instituição em cadastro, quero ser orientada a escolher outra causa quando a causa selecionada tiver sido desativada durante o preenchimento, para que eu consiga concluir o cadastro com uma causa válida.

#### Critérios de Aceitação

1. WHEN a API responde ao envio do cadastro com o Erro_422_Causa para o campo `causaId`, THE Formulário_De_Cadastro SHALL exibir, junto ao campo `causaId`, a Mensagem_Causa_Invalida e SHALL impedir novo envio do cadastro enquanto uma Causa válida não for selecionada.
2. WHEN a API responde ao envio do cadastro com o Erro_422_Causa, THE Seletor_De_Causa SHALL solicitar novamente a lista de causas ao Servico_De_Causas dentro do Limite_De_Espera de 10 segundos.
3. WHEN a lista de causas é recarregada com sucesso após o Erro_422_Causa, THE Formulário_De_Cadastro SHALL remover a seleção de Causa anterior do campo `causaId` e SHALL solicitar ao usuário que selecione uma Causa novamente.
4. IF a nova solicitação da lista de causas ao Servico_De_Causas após o Erro_422_Causa falhar ou não retornar dentro do Limite_De_Espera de 10 segundos, THEN THE Seletor_De_Causa SHALL exibir uma mensagem de erro indicando que a lista de causas não pôde ser carregada, SHALL manter o campo `causaId` sem seleção válida e SHALL disponibilizar uma ação para tentar recarregar a lista.

### Requisito 7: Compatibilidade do serviço de causas

**User Story:** Como desenvolvedor da plataforma, quero que a interface pública do módulo de causas permaneça estável, para que a F9, que também usa esse módulo, continue funcionando.

#### Critérios de Aceitação

1. THE Servico_De_Causas SHALL expor a função `listarCausas()` com retorno `Promise<Causa[]>`.
2. THE Servico_De_Causas SHALL expor o tipo `Causa` com os atributos `id` (texto de 1 a 36 caracteres), `nome` (texto de 1 a 120 caracteres) e `descricao` (texto de 0 a 500 caracteres).
3. WHERE o Servico_De_Causas é alterado nesta funcionalidade, THE Servico_De_Causas SHALL preservar o nome da função `listarCausas()`, seus parâmetros, seu tipo de retorno `Promise<Causa[]>` e os nomes, a quantidade e os tipos dos atributos do tipo `Causa`.
4. WHILE a coleção pública de causas retornada pelo Servico_De_Causas contém de 0 a 500 Causas, THE Servico_De_Causas SHALL retornar essa coleção como uma lista `Causa[]`, retornando uma lista vazia quando não houver nenhuma Causa.
5. IF a obtenção das causas pelo Servico_De_Causas falha, THEN THE Servico_De_Causas SHALL sinalizar um erro à função que o invocou, em vez de retornar uma lista.
