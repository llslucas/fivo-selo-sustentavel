# Implementation Plan: Fila de empresas pendentes (admin)

## Overview

O plano constrói a funcionalidade de dentro para fora: primeiro a camada de serviço (`admin.ts`), que o componente consome; depois o componente de fila (`FilaEmpresas.tsx`), espelhando `FilaInstituicoes.tsx` mas sem nenhuma lógica de documento; por fim a página (`admin/empresas/page.tsx`) que amarra tudo renderizando `<FilaEmpresas />`. O `DialogoMotivoRejeicao` é reusado sem alteração. Os testes acompanham cada passo: testes de exemplo/integração (Vitest + React Testing Library) e os quatro testes de propriedade (fast-check, ≥100 iterações) definidos no design. Rodar a suíte em execução única com `vitest --run`.

## Tasks

- [x] 1. Adicionar a camada de serviço de empresas em `web/src/services/admin.ts`
  - [x] 1.1 Implementar o tipo e as funções de serviço de empresa
    - Acrescentar o tipo `ItemFilaEmpresa` com os campos `id`, `razaoSocial`, `cnpj`, `email` e `criadoEm`
    - Implementar `listarFilaEmpresas()` fazendo GET em `/admin/empresas`, retornando a lista na ordem recebida da API
    - Implementar `aprovarEmpresa(id)` fazendo POST em `/admin/empresas/{id}/aprovacao`, resolvendo sem conteúdo
    - Implementar `rejeitarEmpresa(id, motivo)` fazendo POST em `/admin/empresas/{id}/rejeicao` com corpo JSON `{ motivo }` e `Content-Type: application/json`, resolvendo sem conteúdo
    - Reusar a constante já exportada `MOTIVO_REJEICAO_MINIMO = 20` (sem redefinir)
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.2_

  - [x] 1.2 Escrever testes de exemplo do serviço de empresas
    - Com `request` mockado, verificar que `listarFilaEmpresas` faz GET em `/admin/empresas` e retorna a lista na ordem recebida
    - Verificar que `aprovarEmpresa(id)` faz POST em `/admin/empresas/{id}/aprovacao` e resolve sem conteúdo
    - Verificar que `rejeitarEmpresa(id, motivo)` faz POST em `/admin/empresas/{id}/rejeicao` com corpo `{ motivo }` e resolve sem conteúdo
    - _Requirements: 1.2, 1.3, 2.1, 2.2, 3.1, 3.2_

- [x] 2. Criar o componente `web/src/components/admin/FilaEmpresas.tsx`
  - [x] 2.1 Implementar a estrutura, o estado e o carregamento da lista
    - Criar o componente cliente (`"use client"`) espelhando a máquina de estados de `FilaInstituicoes` (`itens`, `carregando`, `erro`, `decisao`, `selecionada`, `enviando`, `erroDecisao`, `aviso`), sem nenhum estado de documento
    - Implementar `carregar()` com `useCallback` chamando `listarFilaEmpresas`, disparado no `useEffect` inicial; em `ApiError` 401 redirecionar para `APP_ROUTES.public.login`, nos demais erros `setErro`
    - Implementar `tentarNovamente()` (volta `carregando` para `true` e rechama `carregar`)
    - Renderizar com `AsyncState` (loading/erro/vazio com mensagem "Nenhuma empresa aguardando análise.", `onRetry={tentarNovamente}`)
    - _Requirements: 4.3, 5.1, 5.2, 5.5, 6.1, 6.2_

  - [x] 2.2 Renderizar as linhas de empresa com os dados essenciais
    - Montar a lista (`Stack component="ul"`) de `Paper` por empresa, na ordem recebida
    - Exibir razão social (`h2`/`subtitle1`), CNPJ via `formatarCnpj`, e-mail e data do cadastro via `toLocaleDateString("pt-BR")`
    - Adicionar por linha os botões "Rejeitar" (outlined/error) e "Aprovar" (contained), desabilitados enquanto `enviando`; sem botão de documento
    - _Requirements: 5.3, 5.4, 5.6_

  - [x] 2.3 Escrever teste de propriedade da ordem de renderização
    - **Property 3: A fila renderiza as empresas na ordem recebida**
    - **Validates: Requirements 5.4**
    - fast-check ≥100 iterações; tag `// Feature: fila-empresas-pendentes-admin, Property 3: A fila renderiza as empresas na ordem recebida`

  - [x] 2.4 Escrever teste de propriedade dos campos essenciais por linha
    - **Property 4: Cada linha exibe os dados essenciais da empresa**
    - **Validates: Requirements 5.3**
    - fast-check ≥100 iterações; tag `// Feature: fila-empresas-pendentes-admin, Property 4: Cada linha exibe os dados essenciais da empresa`

  - [x] 2.5 Implementar aprovação com confirmação e rejeição com motivo
    - Implementar `abrirDecisao(tipo, item)` / `fecharDecisao()` (não fecha enquanto `enviando`)
    - Implementar `decidir(enviar, mensagemSucesso)` com remoção otimista por filtro de `id`, fechamento do diálogo e `Snackbar` de sucesso
    - Implementar `aprovar()` chamando `decidir(() => aprovarEmpresa(id), "<razão social> foi aprovada.")` com `Dialog` de confirmação identificando `selecionada?.razaoSocial` e ações desabilitadas enquanto `enviando`
    - Implementar `rejeitar(motivo)` chamando `decidir(() => rejeitarEmpresa(id, motivo), "<razão social> foi rejeitada. O motivo será enviado por e-mail.")`
    - Reusar `DialogoMotivoRejeicao` passando `titulo`, `descricao`, `enviando`, `erro`, `onCancelar`, `onConfirmar`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.3, 8.4, 8.5, 8.6_

  - [x] 2.6 Implementar o tratamento de erros de decisão por status
    - Definir o mapa `MENSAGENS_DECISAO` com 403 ("Você não tem permissão para decidir sobre empresas.") e 422 ("O motivo informado é inválido...")
    - 401 → redireciona para login; 409 → fecha diálogo, `Snackbar` de "outra pessoa já decidiu" e `carregar()`; 404 → fecha diálogo, `Snackbar` de "não encontrada" e `carregar()`
    - 403 e demais erros → `ErrorMessage` no diálogo em andamento (com `onRetry` só em erro recuperável); 422 na rejeição → mensagem no `DialogoMotivoRejeicao`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [x] 2.7 Escrever teste de propriedade da remoção otimista
    - **Property 1: Remoção otimista remove apenas a empresa decidida e preserva o restante**
    - **Validates: Requirements 7.4, 8.5**
    - fast-check ≥100 iterações; tag `// Feature: fila-empresas-pendentes-admin, Property 1: Remoção otimista remove apenas a empresa decidida e preserva o restante`

  - [x] 2.8 Escrever teste de propriedade do motivo abaixo do mínimo
    - **Property 2: Motivo abaixo do mínimo nunca é enviado**
    - **Validates: Requirements 8.2**
    - fast-check ≥100 iterações sobre strings com `trim().length < 20`; verificar que `onConfirmar` não é acionado e que a validação de mínimo aparece; tag `// Feature: fila-empresas-pendentes-admin, Property 2: Motivo abaixo do mínimo nunca é enviado`

  - [x] 2.9 Escrever testes de exemplo e integração do componente
    - Com `admin.ts` e `next/navigation` mockados: fetch inicial e indicador de carregamento; lista com botões por linha e estado vazio; erro (≠401) com "Tentar novamente" e retry; 401 no carregamento redireciona para login
    - Aprovar: diálogo identifica a empresa, confirma chama `aprovarEmpresa(id)`, ações desabilitadas durante o envio, sucesso mostra `Snackbar`, cancelar não altera a lista
    - Rejeitar: abre o diálogo identificando a empresa; motivo válido chama `rejeitarEmpresa(id, motivo)`; ações desabilitadas; sucesso mostra `Snackbar`
    - Erros de decisão: 409/404 fecham o diálogo, avisam e recarregam; 403 e 500 mostram mensagem no diálogo; 422 na rejeição mostra "motivo inválido"; 401 redireciona
    - _Requirements: 4.3, 5.1, 5.2, 5.5, 5.6, 6.1, 6.2, 7.1, 7.2, 7.3, 7.5, 7.6, 8.1, 8.3, 8.4, 8.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 3. Checkpoint - Garantir que os testes passam
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Amarrar a página do admin à fila
  - [x] 4.1 Atualizar `web/src/app/admin/empresas/page.tsx` para renderizar a fila
    - Substituir o stub para renderizar `<FilaEmpresas />`
    - Manter a proteção por papel herdada do `AuthGuard papel="ADMIN"` do layout administrativo (sem repetir o guard na página)
    - _Requirements: 4.1, 4.2_

- [x] 5. Checkpoint final - Garantir que os testes passam
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tarefas marcadas com `*` são opcionais (testes) e podem ser puladas para um MVP mais rápido.
- Cada tarefa referencia requisitos específicos para rastreabilidade.
- Os checkpoints garantem validação incremental.
- Os testes de propriedade (fast-check, ≥100 iterações) validam a correção geral; os testes de exemplo cobrem ramos concretos de erro, o wiring do serviço e estados pontuais de UI.
- O `DialogoMotivoRejeicao` é reusado sem alteração, portanto não há tarefa para ele.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["2.3", "2.4", "2.5"] },
    { "id": 4, "tasks": ["2.6"] },
    { "id": 5, "tasks": ["2.7", "2.8", "2.9", "4.1"] }
  ]
}
```
