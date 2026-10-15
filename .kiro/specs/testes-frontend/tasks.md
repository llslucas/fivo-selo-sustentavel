# Implementation Plan: testes-frontend

## Overview

Este plano converte o design da suíte de testes do frontend (`web/`) em uma sequência de tarefas de implementação incrementais, em TypeScript. A ordem respeita as dependências: primeiro a infraestrutura e configuração do runner, depois os helpers compartilhados (Mock_API, contrato, FormData, harness de auth, viewport, detecção condicional), em seguida os testes de unidade, de componente, de integração, os testes condicionais de serviços opcionais e, por fim, as garantias de isolamento. Cada passo se apoia no anterior e termina com integração/consolidação, sem código órfão.

Testes de propriedade (PBT) usam **fast-check** integrado ao Vitest, com no mínimo 100 iterações por propriedade, uma propriedade por teste, e cada teste anotado com `Feature: testes-frontend, Property N`.

## Tasks

- [x] 1. Configurar infraestrutura e runner de testes em `web/`
  - [x] 1.1 Adicionar dependências de teste e script `test` em `web/package.json`
    - Adicionar devDependencies: `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`, `fast-check`, `@vitest/coverage-v8`
    - Adicionar o script `"test": "vitest run"` (execução única, não interativa)
    - Garantir compatibilidade com React 19 / MUI 9 / TypeScript 5
    - _Requirements: 1.1, 1.3_

  - [x] 1.2 Criar `web/vitest.config.ts`
    - Definir `environment: "jsdom"`, `globals: true` e `setupFiles: ["./tests/setup.ts"]`
    - Configurar resolução de módulos ESM/TS alinhada ao projeto
    - Garantir exit code 0 em sucesso, ≠ 0 em falha e ≠ 0 quando nenhum teste é encontrado
    - _Requirements: 1.2, 1.4, 1.5, 1.6, 9.2, 9.3_

  - [x] 1.3 Documentar o comando de teste na documentação de `web/`
    - Registrar nome e invocação do script (`npm test` → `vitest run`) no README/doc de `web/`
    - Descrever execução não interativa e ambiente limpo (sem API/banco/rede)
    - _Requirements: 1.1_

- [x] 2. Criar `web/tests/setup.ts` (bootstrap global da suíte)
  - [x] 2.1 Implementar setup global com guarda anti-rede e reset por teste
    - Registrar matchers de `@testing-library/jest-dom`
    - Instalar `fetch` padrão que lança erro nomeando o destino não interceptado
    - `afterEach` global: restaurar `fetch`, limpar contadores/respostas e desfazer stubs de `window`/storage
    - _Requirements: 9.1, 9.5, 9.6_

- [x] 3. Implementar helpers de teste em `web/tests/helpers/`
  - [x] 3.1 Implementar `mockFetch.ts` (Mock_API)
    - `instalarMockFetch()` via `vi.stubGlobal("fetch", ...)`
    - Construir `Response` compatível (`status`, `ok` 200–299, `headers.get("content-type")`, `json()`); 204 sem corpo/content-type
    - `responderCom`, `responderPara(path, resposta)`, `falharPorRede()`, `chamadas[]`, `ultimaChamada()`, `restaurar()`
    - Capturar `(url, init, body)` por chamada para asserção de contrato
    - _Requirements: 9.1, 9.4, 9.6_

  - [x] 3.2 Implementar `requestContract.ts` (asserção de Contrato_Requisicao)
    - `assertContrato(chamada, esperado)`: valida método, rota com prefixo `/api` + sufixo esperado, `credentials: "include"` (salvo override), corpo JSON por igualdade estrutural, FormData, e ausência/valor de `Content-Type`
    - Produzir mensagens legíveis com esperado × recebido
    - _Requirements: 2.5, 1.5_

  - [x] 3.3 Implementar `formData.ts` (utilitário de inspeção de FormData)
    - `lerFormData(fd)`, `assertCamposPresentes(fd, chaves)`, `assertCamposAusentes(fd, chaves)`
    - _Requirements: 5.2, 5.3, 5.4_

  - [x] 3.4 Implementar `authHarness.tsx` (harness de autenticação)
    - Montar `AuthProvider` real com tema MUI e `fetch` controlado
    - Componente sonda (`EstadoProbe`) que lê o `AuthContext` e expõe estado/empresa por papel acessível
    - Suporte à resposta inicial de `GET /empresas/me` e à sequência sucesso→falha (reproduz `jaAutenticouAntes` para `expirada`)
    - Mock de `next/navigation` (`useRouter`, `redirect`) para capturar redirecionamentos
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7_

  - [x] 3.5 Implementar `viewport.ts` (viewport responsivo)
    - `definirViewport(320 | 1280, altura?)`: ajustar `window.innerWidth/innerHeight`, instalar `matchMedia` controlado e disparar evento `resize`
    - _Requirements: 8.3, 8.4_

  - [x] 3.6 Implementar `moduleExists.ts` (detecção condicional)
    - `servicoExiste(nomeArquivo)` resolvendo em `web/src/services`
    - `importarSeExistir(nomeArquivo)` com import dinâmico apenas quando existe
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [~] 4. Checkpoint - infraestrutura e helpers
  - Garantir que todos os testes passam; perguntar ao usuário se surgirem dúvidas.

- [x] 5. Testes de unidade do Cliente_HTTP (`web/tests/unit/api.test.ts`)
  - [x] 5.1 Property test: 204 retorna undefined sem parse
    - **Feature: testes-frontend, Property 1: 204 retorna undefined sem parse**
    - **Validates: Requirements 2.1**
    - fast-check, ≥100 iterações

  - [x] 5.2 Property test: round-trip de corpo JSON em 2xx
    - **Feature: testes-frontend, Property 2: Round-trip de corpo JSON em respostas 2xx**
    - **Validates: Requirements 2.2**
    - fast-check, ≥100 iterações

  - [x] 5.3 Property test: mapeamento de erros em ApiError
    - **Feature: testes-frontend, Property 3: Mapeamento de erros em ApiError**
    - **Validates: Requirements 2.3, 5.6**
    - fast-check, ≥100 iterações

  - [x] 5.4 Property test: falha de rede vira ApiError com status 0
    - **Feature: testes-frontend, Property 4: Falha de rede vira ApiError com status 0**
    - **Validates: Requirements 2.4**
    - fast-check, ≥100 iterações

  - [x] 5.5 Property test: invariante de prefixo `/api` e `credentials`
    - **Feature: testes-frontend, Property 5: Invariante de prefixo e credenciais**
    - **Validates: Requirements 2.5**
    - fast-check, ≥100 iterações

- [x] 6. Testes de unidade do Servico_Auth (`web/tests/unit/auth.test.ts`)
  - [x] 6.1 Property test: login não toca armazenamento do frontend
    - **Feature: testes-frontend, Property 6: Login não toca armazenamento do frontend**
    - **Validates: Requirements 3.6**
    - fast-check, ≥100 iterações; verificar ausência de leitura/gravação em `localStorage`/`sessionStorage`/cookies
  
  - [x] 6.2 Exemplos de contrato e resultados de `login`/`logout`
    - Contrato de `login`: POST `/sessoes`, `Content-Type: application/json`, corpo `{ email, senha }` (3.1)
    - Sucesso 200/201 retorna `{ papel }` não vazio (3.2)
    - 401 lança ApiError status 401 sem objeto de sessão (3.3)
    - 400/422/500 e falha de rede lançam ApiError sem objeto de sessão (3.4)
    - `logout`: DELETE `/sessoes/atual`, corpo vazio, resolve em 200/204 (3.5)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 7. Testes de unidade do Servico_Empresas (`web/tests/unit/empresas.test.ts`)
  - [x] 7.1 Property test: cadastro envia POST `/empresas` com FormData
    - **Feature: testes-frontend, Property 8: Cadastro envia POST /empresas com FormData**
    - **Validates: Requirements 5.1**
    - fast-check, ≥100 iterações

  - [x] 7.2 Property test: campos obrigatórios sempre presentes no FormData
    - **Feature: testes-frontend, Property 9: Campos obrigatórios sempre presentes no FormData**
    - **Validates: Requirements 5.2**
    - fast-check, ≥100 iterações

  - [x] 7.3 Property test: opcionais informados são incluídos no FormData
    - **Feature: testes-frontend, Property 10: Opcionais informados são incluídos no FormData**
    - **Validates: Requirements 5.3**
    - fast-check, ≥100 iterações

  - [x] 7.4 Property test: opcionais ausentes são omitidos do FormData
    - **Feature: testes-frontend, Property 11: Opcionais ausentes são omitidos do FormData**
    - **Validates: Requirements 5.4**
    - fast-check, ≥100 iterações

  - [x] 7.5 Property test: cadastro não define Content-Type manual
    - **Feature: testes-frontend, Property 12: Cadastro não define Content-Type manual**
    - **Validates: Requirements 5.5**
    - fast-check, ≥100 iterações

  - [x] 7.6 Exemplos de sucesso e edge de falha de `criarEmpresa`
    - Sucesso: resolve com objeto da empresa criada sem lançar (5.7)
    - Edge: falha sem coleção `errors` (rede/500) lança ApiError sem `fieldErrors` por campo (5.8)
    - _Requirements: 5.7, 5.8_

- [x] 8. Checkpoint - testes de unidade
  - Garantir que todos os testes passam; perguntar ao usuário se surgirem dúvidas.

- [x] 9. Testes de componente de login e cadastro (`web/tests/component/`)
  - [x] 9.1 Property test: controles críticos têm papel e nome acessível
    - **Feature: testes-frontend, Property 14: Controles críticos têm papel e nome acessível**
    - **Validates: Requirements 8.1**
    - fast-check, ≥100 iterações; alvos: `compLogin.tsx`, `CadastroWizard.tsx`

  - [x] 9.2 Property test: campo em erro referencia programaticamente sua mensagem
    - **Feature: testes-frontend, Property 15: Campo em erro referencia programaticamente sua mensagem**
    - **Validates: Requirements 8.2**
    - fast-check, ≥100 iterações

  - [x] 9.3 Property test: controles críticos são operáveis por teclado
    - **Feature: testes-frontend, Property 16: Controles críticos são operáveis por teclado**
    - **Validates: Requirements 8.5**
    - fast-check, ≥100 iterações; usar `@testing-library/user-event`

  - [x] 9.4 Exemplos responsivos de login e cadastro em 320px e 1280px
    - Verificar renderização dos controles essenciais sem corte/sobreposição em 320px (8.3) e 1280px (8.4) usando `definirViewport`
    - _Requirements: 8.3, 8.4_

- [x] 10. Testes de componente do Contexto_Auth e guarda de rota (`web/tests/component/auth.test.tsx`)
  - [x] 10.1 Exemplos de transições de estado do Contexto_Auth
    - `carregando` sem dados durante verificação inicial (4.1)
    - `autenticado` expõe dados idênticos aos retornados (4.2)
    - `nao-autenticado` sem autenticação prévia (4.3)
    - `expirada` após autenticação prévia, removendo dados (4.4)
    - `logout` remove dados e passa a `nao-autenticado` (4.5)
    - `carregando` não renderiza conteúdo privado e não redireciona prematuramente (4.7)
    - Usar `authHarness` e `next/navigation` mockado
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.7_

  - [x] 10.2 Property test: área protegida oculta conteúdo privado em sessões inválidas
    - **Feature: testes-frontend, Property 7: Área protegida oculta conteúdo privado em sessões inválidas**
    - **Validates: Requirements 4.6**
    - fast-check, ≥100 iterações; estados em `{nao-autenticado, expirada}`

- [x] 11. Testes de integração dos estados de UI (`web/tests/integration/ui-states.test.tsx`)
  - [x] 11.1 Verificar estados de carregamento, vazio, 401, validação, erro geral e rede
    - Loader visível ocultando dados/vazio/erro durante requisição pendente (6.1)
    - Estado vazio com mensagem orientativa e sem loader para 0 itens (6.2)
    - 401 encerra sessão local e direciona para autenticação (6.3)
    - Erro de validação associa mensagens aos campos e preserva valores (6.4)
    - `fieldErrors` de campos não exibidos aparecem em erro geral (6.5)
    - Erro de rede exibe mensagem de falha de conexão, oculta loader e oferece nova tentativa (6.6)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [~] 12. Checkpoint - componente e integração
  - Garantir que todos os testes passam; perguntar ao usuário se surgirem dúvidas.

- [x] 13. Testes condicionais de serviços opcionais (`web/tests/unit/*.conditional.test.ts`)
  - [x] 13.1 Testes condicionais de `instituicoes.ts` e `campanhas.ts`
    - `describe.skipIf(!servicoExiste(...))`: ao menos 1 sucesso (2xx) e 1 falha (4xx/5xx) por fluxo, afirmando o resultado retornado
    - _Requirements: 7.1, 7.2_

  - [x] 13.2 Testes condicionais de `selos.ts`
    - `skipIf`: sucesso para geração de URL, geração de QR Code e download (afirmar conteúdo/identificador) e falha 4xx/5xx propagada/tratada
    - _Requirements: 7.3, 7.4_

  - [x] 13.3 Testes condicionais de `comprovantes.ts`
    - `skipIf`: listagem e envio, ao menos 1 sucesso (2xx) e 1 falha (4xx/5xx) por operação
    - _Requirements: 7.5_

  - [x] 13.4 Property test condicional: contrato de requisição dos serviços opcionais
    - **Feature: testes-frontend, Property 13: Contrato de requisição dos serviços condicionais**
    - **Validates: Requirements 7.6**
    - fast-check, ≥100 iterações; executado apenas quando o módulo existe

- [x] 14. Testes de isolamento da suíte (`web/tests/integration/isolation.test.ts`)
  - [x] 14.1 Property test: guarda anti-rede bloqueia requisições não interceptadas
    - **Feature: testes-frontend, Property 17: Guarda anti-rede bloqueia requisições não interceptadas**
    - **Validates: Requirements 9.5**
    - fast-check, ≥100 iterações

  - [x] 14.2 Property test: independência de ordem de execução
    - **Feature: testes-frontend, Property 18: Independência de ordem de execução**
    - **Validates: Requirements 9.6**
    - fast-check, ≥100 iterações; verificar reset do Mock_API ao estado inicial

  - [x] 14.3 Verificação SMOKE de isolamento e fixtures inline
    - Confirmar interceptação total de saída HTTP (9.1), ausência de leitura de fontes externas e uso de fixtures inline (9.4)
    - _Requirements: 9.1, 9.4_

- [ ] 15. (Opcional) Testes e2e de navegador com Playwright
  - [~] 15.1 Configurar `web/playwright.config.ts` e um percurso e2e mínimo
    - Opcional e fora do escopo mínimo; cobre percurso ponta a ponta (ex.: login→dashboard) em ambiente controlado
    - _Requirements: 1.1_

- [x] 16. Checkpoint final - Ensure all tests pass
  - Garantir que todos os testes passam; perguntar ao usuário se surgirem dúvidas.

## Notes

- Tarefas marcadas com `*` são opcionais (testes de propriedade, testes unitários/integração/responsivos adicionais e o e2e de Playwright) e podem ser puladas para um MVP mais rápido; o agente de implementação NÃO deve implementar sub-tarefas marcadas com `*`.
- Testes de propriedade usam fast-check com ≥100 iterações, uma propriedade por teste, cada um anotado com `Feature: testes-frontend, Property N`.
- Cada tarefa referencia os requisitos e/ou propriedades que valida para rastreabilidade.
- Serviços opcionais (`instituicoes.ts`, `campanhas.ts`, `selos.ts`, `comprovantes.ts`) são cobertos condicionalmente via `describe.skipIf`, sem quebrar a suíte enquanto não existem.
- Checkpoints garantem validação incremental em pontos de quebra razoáveis.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["3.1", "3.2", "3.3", "3.5", "3.6"] },
    { "id": 4, "tasks": ["3.4"] },
    { "id": 5, "tasks": ["5.1", "5.2", "5.3", "5.4", "5.5", "6.1", "6.2", "7.1", "7.2", "7.3", "7.4", "7.5", "7.6"] },
    { "id": 6, "tasks": ["9.1", "9.2", "9.3", "9.4", "10.1", "10.2"] },
    { "id": 7, "tasks": ["11.1", "13.1", "13.2", "13.3", "13.4"] },
    { "id": 8, "tasks": ["14.1", "14.2", "14.3"] },
    { "id": 9, "tasks": ["15.1"] }
  ]
}
```
