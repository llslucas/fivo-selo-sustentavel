# Requirements Document

## Introduction

Esta especificação define a estratégia de testes do frontend (diretório `web/`) do projeto Selo Sustentável, correspondente à task GitHub T48 "Adicionar testes frontend e testes de integração" (Fase 6).

O objetivo é proteger os fluxos do frontend integrados à API — unidade de componentes, unidade de serviços e integração dos principais percursos — por meio de uma suíte de testes automatizados. A suíte deve rodar de forma determinística, sem depender de serviços externos (API real, banco de dados, rede) nem de dados reais, usando mocks controlados do cliente HTTP.

O frontend usa Next.js 16.3.3, React 19, MUI 9 e TypeScript 5. Hoje `web/package.json` expõe apenas os scripts `dev`, `build`, `start` e `lint`; não há runner de testes configurado, portanto a infraestrutura de testes precisa ser adicionada.

Alguns alvos listados na task — `web/src/services/instituicoes.ts`, `campanhas.ts`, `selos.ts` e `comprovantes.ts` — ainda não existem (dependem das tasks T35–T46). Por isso os fluxos correspondentes são cobertos condicionalmente: a suíte testa cada serviço apenas quando o arquivo de serviço correspondente existir, tratando os demais como alvos futuros.

## Glossary

- **Suite_Testes**: Conjunto de testes automatizados do frontend executados por um runner dentro do diretório `web/`.
- **Runner_Testes**: Ferramenta que executa os testes do frontend (ex.: Vitest), configurada em `web/`.
- **Runner_Navegador**: Ferramenta opcional de testes de navegador ponta a ponta (ex.: Playwright), configurada em `web/playwright.config.ts` caso adotada.
- **Mock_API**: Substituto controlado do cliente HTTP (`request` de `web/src/services/api.ts`) ou da função global `fetch`, que devolve respostas pré-definidas sem acessar serviços externos.
- **Cliente_HTTP**: Função `request<T>(path, init)` em `web/src/services/api.ts` que chama `fetch("/api" + path, { credentials: "include", ... })`, trata respostas 204, parseia JSON por `content-type`, lança `ApiError(status, message, fieldErrors)` em respostas não-OK e `ApiError(0, mensagem)` em falha de rede.
- **ApiError**: Classe de erro de `web/src/services/api.ts` com propriedades `status`, `message` e `fieldErrors`.
- **Servico_Auth**: Módulo `web/src/services/auth.ts` com `login(email, senha)` (POST `/sessoes`) e `logout()` (DELETE `/sessoes/atual`).
- **Servico_Empresas**: Módulo `web/src/services/empresas.ts` com `criarEmpresa(input)` (POST `/empresas` via FormData) e `getEmpresaAtual()` (GET `/empresas/me`).
- **Contexto_Auth**: Provedor `web/src/contexts/AuthContext.tsx` que mantém o estado de sessão (`carregando`, `autenticado`, `nao-autenticado`, `expirada`).
- **Servico_Opcional**: Qualquer um dos módulos `web/src/services/instituicoes.ts`, `campanhas.ts`, `selos.ts`, `comprovantes.ts`, que podem ou não existir no momento da execução.
- **Ambiente_Limpo**: Ambiente de execução sem API em funcionamento, sem banco de dados e sem variáveis de configuração de serviços externos.
- **Contrato_Requisicao**: Conjunto de atributos de uma requisição HTTP verificável: método, rota, corpo, cabeçalhos, formato (JSON ou FormData) e opção `credentials`.

## Requirements

### Requirement 1: Infraestrutura e execução da suíte de testes

**User Story:** Como pessoa desenvolvedora, quero executar a suíte de testes do frontend por um comando documentado dentro de `web/`, para validar os fluxos de forma repetível e automatizável.

#### Acceptance Criteria

1. THE Suite_Testes SHALL ser executável por um único script declarado em `web/package.json`, cujo nome e invocação estejam documentados no arquivo de documentação do diretório `web/`.
2. THE Runner_Testes SHALL ser configurado no diretório `web/` com ambiente de DOM simulado compatível com React 19 e MUI 9, de modo que a montagem de um componente que utilize APIs de DOM não gere erro de ambiente não suportado.
3. WHEN o comando de teste documentado é executado em `web/`, THE Runner_Testes SHALL executar todos os arquivos de teste em modo de execução única não interativa, sem aguardar entrada do usuário e sem permanecer em modo de observação (watch).
4. WHEN o comando de teste documentado é executado em `web/` e todos os testes passam, THE Runner_Testes SHALL encerrar com código de saída igual a 0.
5. IF ao menos um teste falha, THEN THE Runner_Testes SHALL encerrar com código de saída diferente de 0 e apresentar, para cada teste que falhou, o nome do teste, o valor esperado e o valor recebido.
6. IF o comando de teste é invocado e nenhum arquivo de teste é encontrado em `web/`, THEN THE Runner_Testes SHALL encerrar com código de saída diferente de 0 e apresentar mensagem indicando a ausência de testes.

### Requirement 2: Testes do cliente HTTP

**User Story:** Como pessoa desenvolvedora, quero testes do cliente HTTP genérico, para garantir que o tratamento de respostas e erros permaneça correto.

#### Acceptance Criteria

1. WHEN o Cliente_HTTP recebe uma resposta com status HTTP 204, THE Suite_Testes SHALL verificar que o Cliente_HTTP retorna `undefined` e que nenhuma tentativa de parse do corpo é realizada.
2. WHEN o Cliente_HTTP recebe uma resposta com status HTTP na faixa 200 a 299 e cabeçalho `content-type` cujo valor contém a substring `application/json`, THE Suite_Testes SHALL verificar que o Cliente_HTTP retorna o corpo parseado como objeto JavaScript estruturalmente igual ao corpo JSON da resposta.
3. WHEN o Cliente_HTTP recebe uma resposta com status HTTP fora da faixa 200 a 299 contendo no corpo os campos `message` e `errors`, THE Suite_Testes SHALL verificar que o Cliente_HTTP lança ApiError cujo `status` é igual ao status HTTP recebido, cuja `message` é igual à `message` recebida e cujo `fieldErrors` contém uma entrada por campo presente em `errors`, mapeada pelo nome do campo.
4. IF a chamada de `fetch` do Cliente_HTTP lança uma exceção de rede, THEN THE Suite_Testes SHALL verificar que o Cliente_HTTP lança ApiError com `status` igual a 0 e com mensagem indicando falha de conexão.
5. WHEN o Cliente_HTTP realiza qualquer requisição, THE Suite_Testes SHALL verificar que a rota chamada inicia com o prefixo `/api` e que a opção `credentials` da requisição tem o valor `"include"`.

### Requirement 3: Testes de autenticação por sessão

**User Story:** Como pessoa desenvolvedora, quero testes dos fluxos de login e logout, para garantir que os contratos de sessão por cookie HttpOnly funcionem nos casos de sucesso e de falha.

#### Acceptance Criteria

1. WHEN `login(email, senha)` é chamado com credenciais válidas, THE Suite_Testes SHALL verificar que a requisição usa método POST, rota `/sessoes`, cabeçalho `Content-Type: application/json` e corpo JSON contendo exatamente os campos `email` e `senha` com os valores dos argumentos.
2. WHEN `login` recebe uma resposta de sucesso com status HTTP 200 ou 201, THE Suite_Testes SHALL verificar que o Servico_Auth retorna um objeto cujo campo `papel` é um valor de texto não vazio.
3. IF `login` recebe uma resposta de status HTTP 401, THEN THE Suite_Testes SHALL verificar que o Servico_Auth lança ApiError com `status` igual a 401 e que nenhum objeto de sessão é retornado.
4. IF `login` recebe uma resposta de status HTTP 400, 422 ou 500, ou a requisição falha por erro de rede, THEN THE Suite_Testes SHALL verificar que o Servico_Auth lança ApiError e não retorna objeto de sessão.
5. WHEN `logout()` é chamado, THE Suite_Testes SHALL verificar que a requisição usa método DELETE, rota `/sessoes/atual` e corpo vazio, e que o Servico_Auth resolve ao receber status HTTP 200 ou 204.
6. THE Suite_Testes SHALL verificar, por meio do Mock_API, que nenhum fluxo do Servico_Auth lê nem grava token de sessão em `localStorage`, `sessionStorage` ou cookies acessíveis pelo frontend.

### Requirement 4: Testes dos estados de sessão e proteção de rotas

**User Story:** Como pessoa desenvolvedora, quero testes do contexto de autenticação e da proteção de rotas, para garantir que áreas privadas respeitem o estado da sessão.

#### Acceptance Criteria

1. WHILE o Contexto_Auth realiza a verificação inicial de sessão e ainda não recebeu resposta, THE Suite_Testes SHALL verificar que o estado exposto é `carregando` e que nenhum dado da empresa está disponível.
2. WHEN a verificação de sessão retorna os dados da empresa, THE Suite_Testes SHALL verificar que o Contexto_Auth passa ao estado `autenticado` e expõe dados idênticos aos retornados pela verificação.
3. IF a verificação inicial de sessão falha sem autenticação prévia, THEN THE Suite_Testes SHALL verificar que o Contexto_Auth passa ao estado `nao-autenticado` e que nenhum dado da empresa fica exposto.
4. IF a verificação de sessão falha após uma autenticação prévia bem-sucedida, THEN THE Suite_Testes SHALL verificar que o Contexto_Auth passa ao estado `expirada` e remove os dados da empresa previamente carregados.
5. WHEN `logout` é concluído, THE Suite_Testes SHALL verificar que o Contexto_Auth remove todos os dados da empresa e passa ao estado `nao-autenticado`.
6. WHILE o estado de sessão é `nao-autenticado` ou `expirada`, THE Suite_Testes SHALL verificar que uma área protegida não renderiza nenhum conteúdo privado.
7. WHILE o estado de sessão é `carregando`, THE Suite_Testes SHALL verificar que uma área protegida não renderiza conteúdo privado e não executa redirecionamento prematuro.

### Requirement 5: Testes de cadastro de empresa

**User Story:** Como pessoa desenvolvedora, quero testes do fluxo de cadastro de empresa, para garantir o envio correto do formulário e o tratamento de erros de validação.

#### Acceptance Criteria

1. WHEN `criarEmpresa(input)` é chamado, THE Suite_Testes SHALL verificar que a requisição usa método POST, rota `/empresas` e corpo do tipo FormData.
2. WHEN `criarEmpresa` monta o FormData, THE Suite_Testes SHALL verificar que os campos obrigatórios `razaoSocial`, `nomeFantasia`, `cnpj`, `email`, `senha`, `telefone`, `cep`, `logradouro`, `numero`, `bairro`, `cidade`, `uf` e `contato` estão presentes e com valor não vazio.
3. WHERE os campos opcionais `complemento`, `site` e `logo` são informados com valor não vazio, THE Suite_Testes SHALL verificar que cada campo informado é incluído no FormData com o respectivo valor.
4. WHERE os campos opcionais `complemento`, `site` e `logo` não são informados (ausentes, nulos ou string vazia), THE Suite_Testes SHALL verificar que cada campo correspondente é omitido do FormData.
5. WHEN `criarEmpresa` realiza a requisição, THE Suite_Testes SHALL verificar que o cabeçalho `Content-Type` não é definido manualmente no pedido, permitindo que o boundary multipart/form-data seja definido automaticamente.
6. IF a resposta de cadastro indica falha de validação contendo a coleção `errors`, THEN THE Suite_Testes SHALL verificar que o fluxo de cadastro lança ApiError cujo `fieldErrors` contém uma entrada por campo inválido, com a chave igual ao nome do campo e o valor igual à mensagem de erro correspondente retornada.
7. WHEN a resposta de cadastro indica sucesso, THE Suite_Testes SHALL verificar que `criarEmpresa` resolve retornando o objeto da empresa criada sem lançar erro.
8. IF a requisição de cadastro falha por motivo não relacionado a validação (erro de rede ou falha do servidor sem a coleção `errors`), THEN THE Suite_Testes SHALL verificar que `criarEmpresa` lança ApiError sinalizando a falha e que nenhum `fieldErrors` por campo é populado.

### Requirement 6: Testes dos estados de carregamento, vazio, não autorizado, validação e rede

**User Story:** Como pessoa desenvolvedora, quero testes dos estados de interface frente às respostas da API, para garantir que o usuário receba o retorno correto em cada situação.

#### Acceptance Criteria

1. WHILE uma requisição de dados está pendente, THE Suite_Testes SHALL verificar que a tela correspondente exibe um indicador de carregamento visível e oculta os estados de dados, vazio e erro.
2. WHEN uma listagem retorna resultado com 0 itens, THE Suite_Testes SHALL verificar que a tela correspondente exibe o estado vazio com mensagem orientativa e não exibe o indicador de carregamento.
3. IF uma requisição retorna status HTTP 401, THEN THE Suite_Testes SHALL verificar que o fluxo correspondente encerra a sessão local e direciona para a tela de autenticação.
4. IF uma requisição retorna erro de validação com `fieldErrors`, THEN THE Suite_Testes SHALL verificar que a tela correspondente associa cada mensagem ao campo indicado e preserva os valores informados pelo usuário.
5. IF o `fieldErrors` retornado contém campos não exibidos na tela, THEN THE Suite_Testes SHALL verificar que a tela exibe essas mensagens em uma mensagem de erro geral.
6. IF uma requisição falha por erro de rede, THEN THE Suite_Testes SHALL verificar que a tela correspondente exibe a mensagem de falha de conexão, oculta o indicador de carregamento e oferece ação de nova tentativa.

### Requirement 7: Testes dos fluxos de instituições, campanhas, selos e comprovantes

**User Story:** Como pessoa desenvolvedora, quero testes dos fluxos de instituições, campanhas, selos e comprovantes conforme os serviços forem criados, para proteger esses percursos sem bloquear a suíte enquanto os módulos não existem.

#### Acceptance Criteria

1. WHERE o módulo `web/src/services/instituicoes.ts` existe, THE Suite_Testes SHALL verificar pelo menos um caso de sucesso (resposta HTTP 2xx com corpo esperado) e pelo menos um caso de falha (resposta HTTP 4xx ou 5xx) do fluxo de instituições, afirmando o resultado retornado em cada caso.
2. WHERE o módulo `web/src/services/campanhas.ts` existe, THE Suite_Testes SHALL verificar pelo menos um caso de sucesso (resposta HTTP 2xx com corpo esperado) e pelo menos um caso de falha (resposta HTTP 4xx ou 5xx) do fluxo de campanhas, afirmando o resultado retornado em cada caso.
3. WHERE o módulo `web/src/services/selos.ts` existe, THE Suite_Testes SHALL verificar, em casos de sucesso (resposta HTTP 2xx), a geração de URL do selo, a geração do QR Code e o download do selo, afirmando o conteúdo ou identificador retornado em cada um dos três resultados.
4. WHERE o módulo `web/src/services/selos.ts` existe, IF qualquer uma das operações de geração de URL, geração de QR Code ou download do selo retorna resposta HTTP 4xx ou 5xx, THEN THE Suite_Testes SHALL verificar que o erro é propagado ou tratado conforme definido pelo serviço, afirmando a indicação de falha retornada.
5. WHERE o módulo `web/src/services/comprovantes.ts` existe, THE Suite_Testes SHALL verificar a listagem e o envio de comprovantes em pelo menos um caso de sucesso (resposta HTTP 2xx com corpo esperado) e pelo menos um caso de falha (resposta HTTP 4xx ou 5xx) por operação, afirmando o resultado retornado em cada caso.
6. WHEN qualquer um desses serviços realiza uma requisição em um teste, THE Suite_Testes SHALL verificar o Contrato_Requisicao correspondente afirmando o método HTTP, a rota, o corpo enviado e o atributo `credentials` quando aplicável à requisição.

### Requirement 8: Testes responsivos e de acessibilidade

**User Story:** Como pessoa desenvolvedora, quero testes responsivos e de acessibilidade das áreas interativas críticas, para garantir usabilidade em diferentes larguras e com tecnologias assistivas.

#### Acceptance Criteria

1. THE Suite_Testes SHALL verificar que cada controle interativo crítico das telas de login e de cadastro expõe um papel acessível e um nome acessível não vazio, consultáveis por papel e por nome.
2. WHEN um formulário crítico apresenta erro de validação em um campo, THE Suite_Testes SHALL verificar que o campo referencia programaticamente a mensagem de erro correspondente e que a mensagem é recuperável a partir do campo.
3. THE Suite_Testes SHALL verificar que todas as áreas interativas críticas renderizam seus controles essenciais, sem corte ou sobreposição, em uma largura de viewport de 320 pixels.
4. THE Suite_Testes SHALL verificar que todas as áreas interativas críticas renderizam seus controles essenciais, sem corte ou sobreposição, em uma largura de viewport de 1280 pixels.
5. THE Suite_Testes SHALL verificar que cada controle interativo crítico recebe foco de teclado por navegação sequencial e pode ser acionado por teclado sem uso de ponteiro.

### Requirement 9: Isolamento de serviços externos nos testes de integração

**User Story:** Como pessoa desenvolvedora, quero que os testes de integração não dependam de serviços externos, para que a suíte rode de forma determinística em ambiente limpo.

#### Acceptance Criteria

1. WHILE a Suite_Testes executa, THE Suite_Testes SHALL interceptar todas as chamadas de saída HTTP/HTTPS e todo acesso a banco de dados por meio do Mock_API, sem estabelecer nenhuma conexão real a API ou banco.
2. WHEN a Suite_Testes é executada em Ambiente_Limpo e todos os testes passam, THE Suite_Testes SHALL concluir com código de saída igual a 0.
3. IF ao menos um teste falha durante a execução em Ambiente_Limpo, THEN THE Suite_Testes SHALL concluir com código de saída diferente de 0.
4. THE Suite_Testes SHALL definir as respostas de cada cenário de teste exclusivamente por meio de dados controlados declarados no próprio teste, sem leitura de fontes externas.
5. IF um teste tenta realizar uma requisição de rede não interceptada, THEN THE Suite_Testes SHALL interromper a requisição antes de qualquer transmissão externa e falhar o teste indicando o destino não interceptado.
6. WHEN cada teste termina, com sucesso ou falha, THE Suite_Testes SHALL restaurar o Mock_API ao estado inicial, removendo definições de resposta e contadores, de modo que a ordem de execução dos testes não altere os resultados.
