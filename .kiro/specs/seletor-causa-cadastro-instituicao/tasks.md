# Implementation Plan

## Overview

A implementação evolui a F2 em quatro frentes, construídas de forma incremental:
primeiro a camada de serviço (`causas.ts`) com o auxiliar de timeout não-quebrador,
depois o componente `SeletorCausa` com seus quatro estados visuais, em seguida a
integração no `CadastroInstituicaoForm` (prontidão + 422) e, por fim, a verificação
do build/typecheck e da suíte de testes. Cada etapa adiciona seus testes de exemplo
e de propriedade (fast-check, ≥100 iterações) próximos da implementação, mapeados às
Correctness Properties do design. A linguagem é TypeScript/React, conforme o design.

## Tasks

- [x] 1. Camada de serviço: auxiliar de timeout não-quebrador em `causas.ts`
  - [x] 1.1 Adicionar `LIMITE_ESPERA_CAUSAS_MS` e `listarCausasComTimeout()` em `web/src/services/causas.ts`
    - Adicionar a constante exportada `LIMITE_ESPERA_CAUSAS_MS = 10_000`
    - Implementar `listarCausasComTimeout(limiteMs = LIMITE_ESPERA_CAUSAS_MS): Promise<Causa[]>` usando `AbortController`: criar o controller, agendar `setTimeout(() => controller.abort(), limiteMs)`, chamar `request<Causa[]>("/causas", { signal: controller.signal })` e limpar o timer no `.finally()`
    - NÃO alterar a assinatura de `listarCausas()` nem o tipo `Causa` (preservar nome, parâmetros, retorno `Promise<Causa[]>` e atributos `id`/`nome`/`descricao`)
    - _Requirements: 1.1, 7.1, 7.2, 7.3_

  - [x] 1.2 Escrever teste de contrato/assinatura do serviço
    - Importar `listarCausas` e o tipo `Causa`; afirmar que `listarCausas()` retorna `Promise<Causa[]>` e que `Causa` tem os atributos `id`, `nome` e `descricao` (detecta quebra de compatibilidade para a F9)
    - Usar o helper `web/tests/helpers/mockFetch.ts` (`instalarMockFetch`, `responderPara`)
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 1.3 Escrever teste de propriedade do round-trip do serviço
    - `// Feature: seletor-causa-cadastro-instituicao, Property 7: Round-trip de desserialização do serviço`
    - **Property 7: Round-trip de desserialização do serviço**
    - **Validates: Requirements 7.4, 7.5**
    - fast-check `{ numRuns: 100 }`: gerar payloads de lista de causas (0..N itens; `id` 1..36, `nome` 1..120, `descricao` 0..500) e afirmar que `listarCausas()` resolve uma lista igual ao corpo; complementar com exemplos de lista vazia (`[]`) e de falha (status 500 e falha de rede) afirmando rejeição com `ApiError` em vez de resolver

- [x] 2. Componente `SeletorCausa`: máquina de quatro estados
  - [x] 2.1 Definir contrato de estado e props do seletor
    - Em `web/src/components/cadastro/SeletorCausa.tsx`, exportar `type EstadoSeletorCausa = "carregando" | "erro" | "vazio" | "pronto"`
    - Estender as props: manter `value`, `onChange`, `label`, `error`; adicionar `recarregarChave?: number` e `onEstadoChange?: (estado: EstadoSeletorCausa) => void`
    - Introduzir estado local `estado: EstadoSeletorCausa` e `causas: Causa[]`
    - _Requirements: 1.1, 2.1, 2.2_

  - [x] 2.2 Implementar busca com timeout e máquina de transições
    - `useEffect` com dependência em `recarregarChave` que dispara `listarCausasComTimeout()` dentro de um `AbortController`, abortando a busca anterior ao recarregar (evita requisições simultâneas)
    - Transições: sucesso com `lista.length > 0` → `pronto`; sucesso com `lista.length === 0` → `vazio`; falha/timeout → `erro`; durante a busca → `carregando`
    - `useEffect` que observa `estado` e chama `onEstadoChange(estado)` (evita `setState` durante render do pai)
    - _Requirements: 1.5, 1.6, 1.7, 3.1, 3.3, 3.4, 4.1, 4.4, 4.6_

  - [x] 2.3 Renderizar o estado `carregando`
    - `TextField select` desabilitado com indicador (`CircularProgress`/`helperText` "Carregando causas…"); seleção bloqueada enquanto carrega
    - _Requirements: 1.5, 3.1, 3.2_

  - [x] 2.4 Renderizar o estado `erro` com "Tentar novamente"
    - Usar `ErrorMessage` com `mensagem` de `mensagemDeErro()` e `onRetry` que reinicia a busca (incrementando o gatilho interno); desabilitar o botão de retry enquanto a nova busca está em `carregando`
    - _Requirements: 1.7, 3.4, 3.5, 4.1, 4.2, 4.3, 4.5, 4.6_

  - [x] 2.5 Renderizar os estados `vazio` e `pronto`
    - `vazio`: exibir a mensagem exata "Ainda não há causas cadastradas"; seleção bloqueada
    - `pronto`: `TextField select` habilitado, cada `MenuItem` exibe `nome` em destaque e `descricao` como texto secundário, na ordem recebida (sem reordenar/filtrar)
    - _Requirements: 1.2, 1.3, 1.4, 3.3, 5.1, 5.2_

  - [x] 2.6 Escrever teste de propriedade: cada opção exibe nome e descrição
    - `// Feature: seletor-causa-cadastro-instituicao, Property 1: Cada opção exibe nome e descrição`
    - **Property 1: Cada opção exibe nome e descrição**
    - **Validates: Requirements 1.2**
    - fast-check `{ numRuns: 100 }`: gerar listas (`id` 1..36 únicos, `nome` 1..120, `descricao` 0..500) e afirmar que, em `pronto`, cada opção renderizada contém `nome` e `descricao` da causa correspondente

  - [x] 2.7 Escrever teste de propriedade: renderização fiel à lista (ordem e pertencimento)
    - `// Feature: seletor-causa-cadastro-instituicao, Property 2: Renderização fiel à lista recebida`
    - **Property 2: Renderização fiel à lista recebida (ordem e pertencimento)**
    - **Validates: Requirements 1.3, 1.4**
    - fast-check `{ numRuns: 100 }`: gerar listas com `id`s únicos e afirmar igualdade estrita da sequência de `id`s renderizados com a lista recebida (nenhum `id` fora da lista aparece)

  - [x] 2.8 Escrever teste de propriedade: seleção emite o id correspondente
    - `// Feature: seletor-causa-cadastro-instituicao, Property 3: Seleção emite o id correspondente`
    - **Property 3: Seleção emite o id correspondente**
    - **Validates: Requirements 2.1**
    - fast-check `{ numRuns: 100 }`: gerar lista não vazia + índice escolhido; simular a seleção e afirmar que `onChange` foi chamado com o `id` daquele índice

  - [x] 2.9 Escrever testes de exemplo dos estados do seletor
    - Montagem (1.1): montar `SeletorCausa` e afirmar exatamente uma chamada `GET /causas`
    - Carregando (1.5, 3.1–3.3): resposta pendente → indicador visível e seleção desabilitada; ao resolver, indicador some e opções aparecem
    - Erro + retry (1.7, 3.4–3.5, 4.1–4.6): `falharPorRede()` → estado de erro com "Tentar novamente"; botão desabilitado durante a nova busca; falha repetida mantém o botão; sucesso na segunda tentativa exibe a lista; timeout de 10 s coberto com fake timers (`vi.useFakeTimers`) avançando além do limite
    - Vazio (1.6, 5.1–5.2): `/causas` → `[]` → afirma a mensagem exata "Ainda não há causas cadastradas"
    - Usar o helper `web/tests/helpers/mockFetch.ts`
    - _Requirements: 1.1, 1.5, 1.6, 1.7, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2_

- [x] 3. Checkpoint - Garantir que os testes do serviço e do seletor passam
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Integração no `CadastroInstituicaoForm`: prontidão e bloqueio de envio
  - [x] 4.1 Adicionar estado de prontidão e fiação com o seletor
    - Em `web/src/components/cadastro/CadastroInstituicaoForm.tsx`, adicionar estado local `estadoCausa: EstadoSeletorCausa` e `recarregarCausas: number`
    - Derivar `causasProntas = estadoCausa === "pronto"`
    - Passar `recarregarChave={recarregarCausas}` e `onEstadoChange={setEstadoCausa}` ao `SeletorCausa` (mantendo `value`/`onChange`/`error`)
    - _Requirements: 2.2, 5.3_

  - [x] 4.2 Bloquear o envio enquanto o seletor não está pronto
    - Botão "Enviar cadastro": `disabled={loading || !causasProntas}`
    - Em `handleSubmit`/`validar`: bloquear o envio se `estadoCausa !== "pronto"`; `causaId` vazio produz "Campo obrigatório" (já em `CAMPOS_OBRIGATORIOS`) preservando os demais campos
    - _Requirements: 2.4, 5.3, 5.4_

  - [x] 4.3 Bloquear envio de `causaId` fora da lista carregada
    - Antes de chamar `criarInstituicao()`, validar que `causaId` corresponde a uma causa da última lista carregada pelo seletor; se não corresponder, impedir o envio e exibir a Mensagem_Causa_Invalida junto ao campo, preservando os demais valores
    - _Requirements: 2.5_

  - [x] 4.4 Enviar `causaId` válido no cadastro
    - Garantir que, quando `causaId` pertence à lista apresentada, o valor é incluído no cadastro enviado a `criarInstituicao()` (substituindo qualquer valor anterior armazenado)
    - _Requirements: 2.2, 2.3_

  - [x] 4.5 Escrever teste de propriedade: envio válido carrega um id pertencente à lista
    - `// Feature: seletor-causa-cadastro-instituicao, Property 4: Envio válido carrega um id pertencente à lista`
    - **Property 4: Envio válido carrega um id pertencente à lista**
    - **Validates: Requirements 2.3**
    - fast-check `{ numRuns: 100 }`: gerar lista + seleção; preencher campos mínimos, enviar e afirmar que `criarInstituicao` recebeu `causaId` igual ao `id` selecionado e presente na lista

  - [x] 4.6 Escrever teste de propriedade: id fora da lista bloqueia o envio
    - `// Feature: seletor-causa-cadastro-instituicao, Property 5: Id fora da lista bloqueia o envio`
    - **Property 5: Id fora da lista bloqueia o envio**
    - **Validates: Requirements 2.5**
    - fast-check `{ numRuns: 100 }`: gerar lista + `causaId` ausente; forçar o valor inválido e afirmar que `criarInstituicao` NÃO é chamado e a Mensagem_Causa_Invalida aparece

  - [x] 4.7 Escrever teste de propriedade: envio bloqueado enquanto o seletor não está pronto
    - `// Feature: seletor-causa-cadastro-instituicao, Property 6: Envio bloqueado enquanto o seletor não está pronto`
    - **Property 6: Envio bloqueado enquanto o seletor não está pronto**
    - **Validates: Requirements 5.3, 5.4**
    - fast-check `{ numRuns: 100 }`: para cada estado em `{carregando, erro, vazio}`, afirmar que o botão "Enviar" está desabilitado e que o submit não chama `criarInstituicao`

  - [x] 4.8 Escrever testes de exemplo de envio e bloqueio
    - Lista vazia bloqueia submit (5.3, 5.4): `/causas` → `[]` → botão "Enviar" desabilitado e submit não envia
    - Sucesso + seleção + envio (2.2, 2.3): selecionar A, depois B; enviar e afirmar que o payload leva B
    - causaId vazio (2.4): submeter sem causa → "Campo obrigatório", sem chamada a `criarInstituicao`, demais campos preservados
    - Id fora da lista (2.5): forçar `causaId` inválido → envio bloqueado + Mensagem_Causa_Invalida
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 5.3, 5.4_

- [x] 5. Tratamento da rejeição 422 "causa inválida ou inativa"
  - [x] 5.1 Tratar o 422 em `enviar()` e disparar o recarregamento
    - No `catch` de `enviar()`, quando `e instanceof ApiError && e.status === 422 && e.fieldErrors.causaId`: definir `errosCampo.causaId = e.fieldErrors.causaId`, limpar a seleção via `patch("causaId", "")` e incrementar `recarregarCausas` para forçar o recarregamento do seletor
    - Enquanto `causaId` estiver vazio, o envio segue bloqueado (depende de `causasProntas` + campo obrigatório)
    - Manter o fluxo atual do `ErrorMessage` do topo + retry para os demais erros de envio (o 422 de causa não aciona o `ErrorMessage` global)
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 5.2 Manter envio bloqueado quando o recarregamento pós-422 falha
    - Garantir que, se o recarregamento disparado pelo 422 falhar/estourar, o seletor cai em `erro` (com "Tentar novamente") e `estadoCausa !== "pronto"` mantém o envio bloqueado
    - _Requirements: 6.4_

  - [x] 5.3 Escrever teste de exemplo do fluxo 422 completo
    - Submeter → `mockFetch` responde 422 com `errors: [{ campo: "causaId", mensagem: "…" }]` → afirmar mensagem junto ao campo, `causaId` limpo e nova chamada `GET /causas` disparada
    - Recarregamento OK: pedir nova seleção; envio volta a liberar após seleção válida
    - Recarregamento com falha: seletor em `erro` + "Tentar novamente", envio mantido bloqueado
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 6. Verificação final
  - [x] 6.1 Rodar typecheck/build e a suíte de testes do frontend
    - Executar o typecheck/build do `web/` e `vitest run` (execução única, sem watch)
    - Confirmar que todos os testes passam e que não há regressão no uso de `causas.ts` pela F9 (assinatura de `listarCausas()` e tipo `Causa` inalterados)
    - Corrigir quaisquer erros encontrados antes de encerrar
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 7. Checkpoint final - Garantir que todos os testes passam
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tarefas marcadas com `*` são opcionais (testes) e podem ser puladas para um MVP mais rápido.
- Cada tarefa referencia requisitos específicos para rastreabilidade.
- Os checkpoints garantem validação incremental.
- Testes de propriedade (fast-check, ≥100 iterações) validam as Correctness Properties universais; testes de exemplo cobrem estados, transições e casos de borda.
- A API pública de `services/causas.ts` (`listarCausas()` e o tipo `Causa`) permanece inalterada para preservar a F9.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["2.3"] },
    { "id": 4, "tasks": ["2.4"] },
    { "id": 5, "tasks": ["2.5"] },
    { "id": 6, "tasks": ["2.6", "2.7", "2.8", "2.9", "4.1"] },
    { "id": 7, "tasks": ["4.2"] },
    { "id": 8, "tasks": ["4.3"] },
    { "id": 9, "tasks": ["4.4"] },
    { "id": 10, "tasks": ["5.1"] },
    { "id": 11, "tasks": ["5.2"] },
    { "id": 12, "tasks": ["4.5", "4.6", "4.7", "4.8", "5.3"] },
    { "id": 13, "tasks": ["6.1"] }
  ]
}
```
