# Implementation Plan: Catálogo de Instituições no Wizard de Campanha

## Overview

Este plano substitui os dados simulados (`instituicoesMock`) das duas variantes do wizard pelo catálogo real servido por `GET /beneficiadas`, seguindo a arquitetura em três camadas do design: serviço tipado (`instituicoes.ts`), hook de estado (`useBeneficiadas`) e componente apresentacional compartilhado (`SeletorBeneficiada`). Cada passo é construído de forma incremental e testada antes de ser integrado: tipos e serviço primeiro, depois o hook, depois o componente, depois a integração nos passos e pais do wizard, e por fim a remoção do mock e a verificação final. Todo teste de propriedade (fast-check, mínimo 100 iterações) é anotado com `Feature: catalogo-instituicoes-wizard, Property N` conforme a convenção do design. O `request` real é sempre exercitado contra fetch mockado, nunca contra rede de verdade.

## Tasks

- [x] 1. Criar a camada de serviço `web/src/services/instituicoes.ts`
  - [x] 1.1 Implementar os tipos e a função `listarBeneficiadas`
    - Definir `TipoBeneficiada = "INSTITUICAO" | "CAUSA"` e o tipo `Beneficiada` com os campos `tipo`, `id`, `nome`, `causa`, `cidade`, `uf`, `descricao`, `site`, `logoArquivoId` conforme o contrato
    - Importar `request` de `./api`, seguindo a convenção de `empresas.ts`/`auth.ts`
    - Implementar `listarBeneficiadas(busca?: string): Promise<Beneficiada[]>` que monta o path `/beneficiadas` e só acrescenta `?busca=<termo>` quando o termo, após `trim`, tiver 2 ou mais caracteres, codificando o valor com `encodeURIComponent`
    - Chamar `request<Beneficiada[]>(path)` e descartar do array retornado todo item cujo `id` ou `nome` esteja ausente/vazio antes de devolver, preservando a ordem relativa dos itens válidos
    - _Requirements: 1.1, 1.7, 1.8, 3.1, 3.2, 4.1_

  - [x] 1.2 Escrever teste de propriedade para o descarte de itens inválidos
    - **Feature: catalogo-instituicoes-wizard, Property 1: Descarte de beneficiadas sem id ou nome**
    - Gerar listas brutas aleatórias (com itens válidos e itens sem `id`/`nome`) e afirmar que a saída contém exatamente os itens válidos, na ordem relativa original
    - Usar fetch/`request` mockado, mínimo 100 iterações
    - _Requirements: 1.8_

  - [x] 1.3 Escrever teste de propriedade para a regra de busca por comprimento do termo
    - **Feature: catalogo-instituicoes-wizard, Property 4: Regra de busca por comprimento do termo**
    - Gerar termos aleatórios e afirmar que o parâmetro `busca` é incluído na URL requisitada se e somente se o termo (após `trim`) tiver 2 ou mais caracteres
    - Usar fetch/`request` mockado, mínimo 100 iterações
    - _Requirements: 3.1, 3.2_

  - [x] 1.4 Escrever testes de unidade de exemplo do serviço
    - Caminho feliz 200 preservando todos os campos do contrato (`tipo`, `id`, `nome`, `causa`, `cidade`, `uf`, `descricao`, `site`, `logoArquivoId`)
    - Propagação de `ApiError` em caso de falha, sem tratamento no serviço
    - _Requirements: 1.7, 4.1_

- [x] 2. Reconciliar os tipos do wizard em `web/src/lib/campaign-wizard/types.ts`
  - [x] 2.1 Reexportar `Beneficiada` e substituir o tipo plano `Instituicao`
    - Reexportar `Beneficiada` (e `TipoBeneficiada`) de `web/src/services/instituicoes.ts` como fonte canônica do formato de API
    - Substituir o tipo plano `Instituicao = { id, nome, cidade, descricao }`: defini-lo como alias de `Beneficiada` ou removê-lo se nenhum módulo o referenciar mais
    - Manter `CampaignWizardData.instituicaoId` como `string | null` e `initialWizardData.instituicaoId` como `null`; não alterar `mockEmpresaAtual`
    - _Requirements: 5.1, 6.1, 6.2, 7.7_

- [x] 3. Criar o hook `useBeneficiadas`
  - [x] 3.1 Implementar a máquina de estados e o ciclo de busca
    - Criar o hook em `web/src/components/campaign-wizard/` (ou em um `hooks/` nesse diretório), expondo `estado` (`carregando`/`erro`/`vazio`/`carregado`), `beneficiadas`, `termoBusca`, `mensagemErro`, `podeTentarNovamente`, `definirTermoBusca` e `tentarNovamente`
    - Disparar a busca inicial (catálogo completo) na montagem e refazer a busca quando o termo debounced mudar, aplicando debounce de 300 ms e a regra de 2 caracteres via `listarBeneficiadas`
    - Guardar um identificador monotônico por requisição e só aplicar a resposta mais recente (anti-stale), descartando respostas de termos antigos; usar `AbortController` para cancelamento lógico
    - Mapear erros com `mensagemDeErro` (aplicando mensagem padrão quando vazia/ausente) e definir `podeTentarNovamente` via `ehErroRecuperavel`; preservar a lista anterior e o termo digitado em caso de falha; encerrar o carregamento e transicionar para erro ao expirar os timeouts de 10 s (busca) e 30 s (requisição); `tentarNovamente()` reemite a última requisição e volta a `carregando`
    - _Requirements: 1.1, 1.2, 1.5, 2.2, 2.4, 2.5, 2.7, 3.3, 3.6, 3.7, 4.1, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 5.5, 5.6_

  - [x] 3.2 Escrever teste de propriedade anti-stale
    - **Feature: catalogo-instituicoes-wizard, Property 5: Resposta obsoleta nunca sobrescreve a mais recente**
    - Gerar sequências de alterações de termo cujas respostas chegam fora de ordem e afirmar que o estado final corresponde sempre à resposta da requisição mais recente
    - Usar fetch mockado + fake timers, mínimo 100 iterações
    - _Requirements: 3.3, 5.5_

  - [x] 3.3 Escrever teste de propriedade para botão de nova tentativa condicionado ao erro
    - **Feature: catalogo-instituicoes-wizard, Property 6: Ação de nova tentativa condicionada ao tipo de erro**
    - Gerar erros aleatórios e afirmar que `podeTentarNovamente` é verdadeiro se e somente se `ehErroRecuperavel` for verdadeiro para aquele erro
    - Usar fetch mockado, mínimo 100 iterações
    - _Requirements: 2.6, 4.8, 4.9_

  - [x] 3.4 Escrever teste de propriedade para preservação da lista anterior sob falha
    - **Feature: catalogo-instituicoes-wizard, Property 7: Preservação da lista anterior sob falha**
    - Gerar uma lista previamente carregada e uma falha subsequente e afirmar que a lista exibida permanece igual à anterior, sem dados parciais nem fallback simulado
    - Usar fetch mockado + fake timers, mínimo 100 iterações
    - _Requirements: 2.4, 7.3_

  - [x] 3.5 Escrever teste de propriedade para preservação do termo de busca sob falha
    - **Feature: catalogo-instituicoes-wizard, Property 8: Preservação do termo de busca sob falha**
    - Gerar termos aleatórios cuja busca falha e afirmar que o termo exposto pelo hook permanece igual ao digitado
    - Usar fetch mockado + fake timers, mínimo 100 iterações
    - _Requirements: 3.7_

  - [x] 3.6 Escrever testes de unidade de exemplo/edge do hook
    - Debounce de 300 ms, timeout de 30 s e de 10 s (com fake timers), mensagem padrão quando `mensagemDeErro` está vazia, e disparo da busca na montagem
    - _Requirements: 1.1, 1.5, 2.2, 2.5, 3.3, 4.7_

- [x] 4. Checkpoint - garantir que serviço, tipos e hook passam nos testes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Criar o componente apresentacional `SeletorBeneficiada`
  - [x] 5.1 Implementar o componente e seus estados visuais
    - Definir as props `beneficiadas`, `estado`, `termoBusca`, `mensagemErro`, `podeTentarNovamente`, `selecionadaId`, `onBuscar`, `onTentarNovamente`, `onSelecionar` e `variante` (`"lista" | "cards"`)
    - Renderizar o campo de busca ligado a `onBuscar`; em `carregando`, exibir o indicador como único estado visível e bloquear a seleção
    - Em `vazio`, exibir "Nenhuma instituição disponível no momento" para o catálogo ou a variante de "nenhum resultado para o termo" quando há busca ativa; em `erro`, exibir `mensagemErro` e a ação "Tentar novamente" apenas quando `podeTentarNovamente` for verdadeiro
    - Em `carregado`, renderizar a lista na ordem recebida, com nome e descrição por item, marcando como selecionada a beneficiada cujo `id` coincide com `selecionadaId` (nada marcado quando nenhum coincide), chamando `onSelecionar(id)` ao selecionar; aplicar o layout conforme `variante`
    - _Requirements: 1.2, 1.3, 1.6, 2.1, 2.3, 2.4, 2.6, 3.4, 3.5, 4.2, 5.1, 5.2, 5.3_

  - [x] 5.2 Escrever teste de propriedade para ordem/itens renderizados
    - **Feature: catalogo-instituicoes-wizard, Property 2: Itens renderizados correspondem à lista recebida, na ordem**
    - Gerar listas aleatórias e afirmar que a sequência de itens renderizados é exatamente igual à recebida, sem acréscimos, remoções ou reordenações
    - Mínimo 100 iterações
    - _Requirements: 1.3, 3.4_

  - [x] 5.3 Escrever teste de propriedade para nome e descrição por item
    - **Feature: catalogo-instituicoes-wizard, Property 3: Nome e descrição presentes em cada item**
    - Gerar listas aleatórias e afirmar que cada item renderizado contém o `nome` e a `descricao` da beneficiada correspondente
    - Mínimo 100 iterações
    - _Requirements: 1.6_

  - [x] 5.4 Escrever teste de propriedade para registro da seleção
    - **Feature: catalogo-instituicoes-wizard, Property 9: Registro da seleção via onChange**
    - Gerar beneficiadas aleatórias e afirmar que selecionar uma invoca `onSelecionar`/`onChange` com `instituicaoId` igual ao `id` daquela beneficiada
    - Mínimo 100 iterações
    - _Requirements: 5.1_

  - [x] 5.5 Escrever teste de propriedade para marcação de seleção refletir o id
    - **Feature: catalogo-instituicoes-wizard, Property 10: Marcação de seleção reflete o identificador**
    - Gerar listas e `instituicaoId` aleatórios e afirmar que, quando o id corresponde a exatamente uma beneficiada, só ela aparece selecionada; quando não corresponde a nenhuma, nenhuma aparece selecionada e o id permanece inalterado
    - Mínimo 100 iterações
    - _Requirements: 5.2, 5.3_

  - [x] 5.6 Escrever testes de componente de exemplo/edge
    - Estado carregando como único visível com seleção bloqueada, vazio do catálogo com texto exato, vazio de busca, mensagens 401/403/404, e a ação "Tentar novamente" refazendo a requisição
    - _Requirements: 1.2, 2.1, 2.3, 2.7, 3.5, 4.4, 4.5, 4.6, 4.10_

- [x] 6. Checkpoint - garantir que o componente de seleção passa nos testes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Integrar `SeletorBeneficiada` + `useBeneficiadas` em `StepCausaRegra.tsx`
  - [x] 7.1 Substituir o mock e o pré-cadastro falso pela seleção real (variante lista)
    - Remover a importação de `instituicoesMock` e consumir `useBeneficiadas()`, repassando o resultado a `<SeletorBeneficiada variante="lista" />` com `selecionadaId={data.instituicaoId}` e `onSelecionar={(id) => onChange({ instituicaoId: id })}`
    - Remover o fluxo falso de pré-cadastro: estado local `extraInstituicoes`, o formulário que fabrica `custom-${Date.now()}` e o chip "Pendente de aprovação"
    - Substituir a afordância "Cadastrar nova instituição" por um estado desabilitado/"em breve" que exibe a mensagem de indisponibilidade em até 1 s, preserva a seleção e os dados preenchidos, e não emite nenhuma requisição de rede
    - Manter o bloco "Regra da doação" como está; não guardar seleção em estado local do passo
    - _Requirements: 1.2, 1.3, 1.6, 5.1, 5.4, 7.1, 7.4, 8.1, 8.2, 8.3, 8.6_

  - [x] 7.2 Escrever teste de propriedade para pré-cadastro não fabricar beneficiadas locais
    - **Feature: catalogo-instituicoes-wizard, Property 14: Pré-cadastro não fabrica beneficiadas locais**
    - Simular interações com a afordância de pré-cadastro e afirmar que a lista não ganha itens fabricados e que a seleção e os dados preenchidos permanecem inalterados
    - Mínimo 100 iterações
    - _Requirements: 8.1, 8.3_

  - [x] 7.3 Escrever teste de propriedade para pré-cadastro não emitir requisição de rede
    - **Feature: catalogo-instituicoes-wizard, Property 15: Pré-cadastro não emite requisição de rede**
    - Espionar `fetch` e afirmar que acionar a afordância de pré-cadastro não emite nenhuma requisição a qualquer rota
    - Mínimo 100 iterações
    - _Requirements: 8.6_

  - [x] 7.4 Escrever teste de exemplo da mensagem de pré-cadastro indisponível
    - Acionar a afordância e afirmar que a mensagem de "pré-cadastro ainda não está disponível" aparece e a seleção permanece
    - _Requirements: 8.2, 8.3_

- [x] 8. Integrar `SeletorBeneficiada` + `useBeneficiadas` em `StepSobreCampanha.tsx`
  - [x] 8.1 Substituir o mock pela seleção real (variante cards)
    - Remover a importação de `instituicoesMock` e consumir `useBeneficiadas()`, repassando o resultado a `<SeletorBeneficiada variante="cards" />` com `selecionadaId={data.instituicaoId}` e `onSelecionar={(id) => onChange({ instituicaoId: id })}`
    - Manter os campos de nome/descrição e a regra inline; não guardar seleção em estado local do passo
    - _Requirements: 1.2, 1.3, 1.6, 5.1, 5.4, 7.1, 7.5_

- [x] 9. Ajustar e verificar os pais do wizard `CampaignWizard.tsx` e `CampaignWizardNew.tsx`
  - [x] 9.1 Garantir persistência da seleção e bloqueio de avanço
    - Confirmar que ambos mantêm `data` em `useState<CampaignWizardData>` e repassam `data`/`patch`, sem reinicializar ao navegar entre passos, e que nenhum referencia mock
    - Confirmar que as validações de passo existentes (`data.instituicaoId !== null`) continuam bloqueando o avanço quando não há seleção
    - _Requirements: 5.4, 6.1, 6.2, 6.3, 6.4_

  - [x] 9.2 Escrever teste de integração para persistência do id na navegação
    - **Feature: catalogo-instituicoes-wizard, Property 11: Persistência do identificador na navegação**
    - Selecionar, navegar para outro passo e voltar, afirmando que `instituicaoId` é preservado no estado do wizard; exercitar em `CampaignWizard` (passo 2) e `CampaignWizardNew` (passo 1)
    - Mínimo 100 iterações
    - _Requirements: 5.4_

  - [x] 9.3 Escrever teste de integração para preservação do id no payload
    - **Feature: catalogo-instituicoes-wizard, Property 12: Preservação do identificador no payload**
    - Concluir o wizard com `instituicaoId` não nulo/vazio e afirmar que o Payload_Criacao_Campanha inclui exatamente esse identificador
    - Mínimo 100 iterações
    - _Requirements: 6.1, 6.3_

  - [x] 9.4 Escrever teste de integração para bloqueio de avanço sem seleção
    - **Feature: catalogo-instituicoes-wizard, Property 13: Bloqueio de avanço sem seleção**
    - Afirmar que, com `instituicaoId` nulo ou vazio, a validação do Passo_Beneficiada impede o avanço
    - Mínimo 100 iterações
    - _Requirements: 6.2, 6.4_

  - [x] 9.5 Escrever testes de integração de exemplo para recarga ao retornar
    - Voltar ao passo marca a seleção após a recarga da lista; falha de recarga preserva o `instituicaoId` e mostra indicação de erro
    - _Requirements: 5.5, 5.6_

- [x] 10. Checkpoint - garantir que a integração do wizard passa nos testes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Remover os dados simulados de beneficiadas
  - [x] 11.1 Apagar `mock-data.ts` e garantir ausência de referências
    - Confirmar que nenhum módulo importa `instituicoesMock` e apagar `web/src/lib/campaign-wizard/mock-data.ts` junto com a exportação `instituicoesMock`
    - _Requirements: 7.4, 7.5, 7.6_

  - [x] 11.2 Adicionar verificação estrutural da remoção do mock
    - Teste estrutural afirmando que nenhum módulo do projeto importa ou referencia `instituicoesMock` e que o arquivo `mock-data.ts` não existe
    - _Requirements: 7.4, 7.5, 7.6_

- [x] 12. Verificação final e ajuste do teste condicional
  - [x] 12.1 Ajustar o teste condicional e rodar typecheck/lint/testes
    - Ajustar `web/tests/unit/instituicoes-campanhas.conditional.test.ts` para afirmar `listarBeneficiadas` agora que o serviço existe
    - Rodar o typecheck, o lint e a suíte de testes do projeto (em execução única, não em modo watch) e corrigir falhas remanescentes
    - _Requirements: 1.1, 1.7, 7.1_

- [x] 13. Checkpoint final - garantir que todos os testes passam
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tarefas marcadas com `*` são opcionais (testes de unidade, propriedade e integração) e não devem ser implementadas automaticamente; as tarefas sem `*` são obrigatórias.
- Cada tarefa referencia requisitos específicos para rastreabilidade.
- Os testes de propriedade usam fast-check com no mínimo 100 iterações e são anotados no formato `Feature: catalogo-instituicoes-wizard, Property N`.
- O `request` real é sempre exercitado contra fetch mockado; nenhuma rede de verdade é usada nos testes.
- Os checkpoints garantem validação incremental antes de avançar para a próxima camada.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "2.1"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "3.5", "3.6", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "5.4", "5.5", "5.6", "7.1", "8.1"] },
    { "id": 5, "tasks": ["7.2", "7.3", "7.4", "9.1"] },
    { "id": 6, "tasks": ["9.2", "9.3", "9.4", "9.5", "11.1"] },
    { "id": 7, "tasks": ["11.2", "12.1"] }
  ]
}
```
