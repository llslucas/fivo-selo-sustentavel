# Vitrine e Selo Specification

> Convenção: seções e palavras-chave EARS em inglês; conteúdo em português (AD-005).
> Fonte: decisão de corte de escopo de 2026-10-28 (AD-023). Esta feature substitui `selo-e-qrcode`, `paginas-publicas` e `transparencia-e-area-empresa`.

## Problem Statement

Com cadastro de empresa, catálogo e campanhas prontos no `api`, falta o caminho que leva a campanha até o consumidor: a empresa não tem onde ver suas campanhas, não consegue baixar um selo com QR Code, e o consumidor que escaneia o QR não tem página para chegar. As três specs originais desse caminho somam cerca de 40 critérios (5 modelos de selo, PDF vetorial, solicitação com estados, comprovantes com moderação, painel admin). Para entregar no prazo, o escopo foi cortado para o mínimo que fecha o fluxo empresa → selo → QR → página pública.

## Goals

- [ ] A empresa vê suas campanhas na área logada e baixa o selo de uma campanha aprovada com um clique.
- [ ] O QR Code do selo abre a página pública da empresa, rolada até a campanha, sem login.
- [ ] A URL codificada no QR continua válida mesmo depois que a empresa renomeia a empresa ou a campanha.
- [ ] A vitrine `/parceiros` lista as empresas aprovadas com dados reais da API.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Escolha entre modelos de selo ou criação de arte própria | Corte de escopo (AD-023): um único selo genérico substitui os 5 modelos de AD-004 |
| Logo da empresa ou dados da campanha impressos no selo | Selo genérico: só a marca Fivo e o QR Code mudam de campanha para campanha |
| PNG 300 DPI e PDF vetorial do selo | O SVG já é vetorial e serve para impressão; PNG e PDF exigem pipeline de rasterização que o projeto não tem |
| Solicitação de selo com estados (`SOLICITADO → GERADO`), histórico e auditoria | O selo é gerado na hora, de forma determinística, e não é armazenado (AD-023 supersede AD-007 e AD-009) |
| Envio, moderação e publicação de comprovantes de doação | Corte de escopo (AD-023); volta ao backlog junto com os totais declarados |
| Painel administrativo consolidado | Cada fila de moderação já existe isolada |
| Campo de produtos participantes na campanha | Decidido com o usuário em 2026-10-28: não é necessário |
| Página separada por campanha, metadados Open Graph | A campanha é um subtópico da página da empresa |
| Encerramento (CAMP-09) e duplicação (CAMP-10) de campanha | Corte de escopo (AD-023); a vigência já informa o período |
| Página institucional da iniciativa | Já existe no `web` (`src/app/home`), fora desta feature |
| Edição de campanha `APROVADA` (alteração de compromisso) pelo `web` | A API suporta; o `web` mínimo só edita `RASCUNHO` e `REJEITADA` |
| Paginação da vitrine e da lista de campanhas | Volume da v1 é de dezenas de registros |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| URL pública | `/empresa/{slugEmpresa}` para a página da empresa e `/empresa/{slugEmpresa}/{slugCampanha}` para a URL do QR, que abre a mesma página rolada até a campanha | Pedido do usuário em 2026-10-28 | y |
| Estabilidade do slug | O slug é gerado uma vez — o da empresa na primeira aprovação da empresa, o da campanha na primeira aprovação da campanha — e nunca muda depois, nem com renomeação | O QR impresso precisa resolver para sempre; decidido com o usuário em 2026-10-28 | y |
| Slug adivinhável | Aceito; a exigência de identificador não enumerável (SELO-10) cai | Só empresas e campanhas aprovadas são públicas, então adivinhar um slug não expõe nada restrito | y |
| Valor exibido no card da área da empresa | O valor da regra de doação, não a meta | Decidido com o usuário em 2026-10-28 | y |
| Autoria | Domínio e `web` pelo grupo (6 pessoas); infra do `api` pelo agente, depois do gate de handoff do domínio, como em AD-020 e AD-021 | Decidido com o usuário em 2026-10-28 | y |
| Conteúdo do selo | Marca Fivo, o texto "Selo Sustentável Fivo" e o QR Code; nada da empresa ou da campanha além da URL do QR | "Selo genérico", nas palavras do usuário; sem texto variável não há truncamento nem divergência com o impresso | n |
| Formato do selo | Um único SVG, gerado a cada requisição e não armazenado | Determinístico: os mesmos slugs produzem os mesmos bytes, então guardar o arquivo não acrescenta nada | n |
| Quem baixa o selo | Só a empresa proprietária da campanha; o admin não tem rota de download | Mínimo necessário; o admin não aplica selo em embalagem | n |
| Empresa suspensa baixando selo | Não bloqueado nesta feature; vale o que a autenticação já faz com empresa suspensa | A página pública da empresa suspensa já responde 404 | n |
| Slug de campanha inexistente na URL do QR | A página da empresa abre normalmente, no topo, sem mensagem de erro | O consumidor ainda chega à empresa; nada restrito é revelado | n |
| Campanha com vigência já terminada | Continua listada na página pública enquanto estiver `APROVADA`, sem marcação de encerrada | Encerramento (CAMP-09) está fora de escopo; o período de vigência fica visível | n |
| Slugs de registros já aprovados antes desta feature | A migration gera o slug de toda empresa `APROVADA` ou `SUSPENSA` e de toda campanha `APROVADA`, com as mesmas regras, em ordem de `decididoEm` | Senão os registros existentes ficariam sem URL pública | n |
| Ordenação das campanhas na página pública | Pela data da aprovação, da mais recente para a mais antiga | A campanha nova aparece primeiro | n |
| Dados de contato públicos da empresa | `nomeFantasia`, `cidade`, `uf`, `site` e o logo; nunca `razaoSocial`, `cnpj`, `telefone`, endereço, `contato` ou e-mail | Não existe marcação de "dado público" no cadastro; esses são os campos sem risco | n |

**Open questions:** none - todas resolvidas ou registradas acima.

---

## User Stories

### P1: Slug permanente de empresa e campanha ⭐ MVP

**User Story**: Como empresa, quero que minha empresa e cada campanha aprovada tenham um endereço legível e fixo, para que o QR já impresso nunca deixe de funcionar.

**Why P1**: Sem slug não existe URL pública nem QR Code.

**Acceptance Criteria**

1. WHEN o administrador aprova uma empresa que ainda não tem slug THEN the system SHALL atribuir a ela um slug derivado de `nomeFantasia`.
2. WHEN o administrador aprova uma campanha que ainda não tem slug THEN the system SHALL atribuir a ela um slug derivado de `nome`.
3. The system SHALL formar o slug convertendo o texto para minúsculas, removendo acentos, trocando cada sequência de caracteres fora de `a-z0-9` por um hífen, removendo hífens das pontas e truncando em 60 caracteres sem deixar hífen no fim.
4. IF o texto de origem não produzir nenhum caractere válido THEN the system SHALL usar `empresa` como slug da empresa e `campanha` como slug da campanha.
5. IF o slug já pertencer a outra empresa THEN the system SHALL acrescentar o menor sufixo livre na forma `-2`, `-3` e assim por diante.
6. IF o slug já pertencer a outra campanha da mesma empresa THEN the system SHALL acrescentar o menor sufixo livre na forma `-2`, `-3` e assim por diante; campanhas de empresas diferentes podem ter o mesmo slug.
7. The system SHALL manter o slug inalterado depois de atribuído, inclusive quando `nomeFantasia` ou `nome` forem editados, quando a empresa for suspensa e reativada e quando uma alteração de compromisso da campanha for aprovada.

**Independent Test**: Aprovar a empresa "Café Serra Verde" e conferir o slug `cafe-serra-verde`; aprovar outra com o mesmo nome e conferir `cafe-serra-verde-2`; renomear a primeira e conferir que o slug não mudou.

---

### P1: Campanhas na área da empresa ⭐ MVP

**User Story**: Como empresa, quero ver minhas campanhas em cards na minha área, com nome, valor e status, para acompanhar cada uma e baixar o selo das aprovadas.

**Why P1**: É o mínimo de área da empresa que dá acesso ao selo.

**Acceptance Criteria**

1. WHEN uma empresa autenticada consulta `GET /campanhas` THEN the system SHALL responder HTTP 200 com todas as campanhas dela, e só as dela, ordenadas por data de criação da mais recente para a mais antiga.
2. The system SHALL incluir em cada item da lista os campos `id`, `nome`, `status`, `regraDoacao` (`tipo` e `valor` ou `percentual`, ou `null` quando ainda não definida) e `urlPublica`.
3. WHILE a campanha estiver `APROVADA` the system SHALL preencher `urlPublica` com `{WEB_URL}/empresa/{slugEmpresa}/{slugCampanha}`; nos demais estados SHALL devolver `urlPublica` como `null`.
4. IF um usuário sem papel `EMPRESA` consultar `GET /campanhas` THEN the system SHALL responder HTTP 403.
5. WHEN a empresa abre a área logada THEN the system SHALL exibir um card por campanha com o nome, o texto do valor e o rótulo do status.
6. The system SHALL escrever o texto do valor como "R$ 1,00 por unidade vendida" na regra `POR_UNIDADE` e como "2,5% de cada venda" na regra `PERCENTUAL`, no formato numérico pt-BR, e como "Regra de doação não definida" quando `regraDoacao` for `null`.
7. The system SHALL rotular os status como "Rascunho" (`RASCUNHO`), "Em análise" (`EM_ANALISE`), "Aprovada" (`APROVADA`) e "Rejeitada" (`REJEITADA`).
8. WHILE a campanha estiver `APROVADA` the system SHALL exibir no card o botão "Baixar selo" e o link "Ver página pública" apontando para `urlPublica`.
9. WHERE a empresa não tiver nenhuma campanha the system SHALL exibir a mensagem "Você ainda não tem campanhas." com o botão "Criar campanha".
10. The system SHALL renderizar a lista de cards em telas a partir de 320 px de largura sem rolagem horizontal.

**Independent Test**: Logar como empresa com uma campanha em rascunho e outra aprovada, conferir os dois cards com valor e status e o botão "Baixar selo" só na aprovada; logar como outra empresa e não ver nenhuma delas.

---

### P1: Selo genérico com QR Code ⭐ MVP

**User Story**: Como empresa com campanha aprovada, quero baixar o selo da campanha, para aplicá-lo na embalagem do produto.

**Why P1**: É o produto entregue à empresa e o elo entre a embalagem e a página pública.

**Acceptance Criteria**

1. WHEN a empresa proprietária consulta `GET /campanhas/{id}/selo` de uma campanha `APROVADA` THEN the system SHALL responder HTTP 200 com `Content-Type: image/svg+xml` e `Content-Disposition: attachment; filename="selo-{slugCampanha}.svg"`.
2. The system SHALL compor o SVG com a marca Fivo, o texto "Selo Sustentável Fivo" e um QR Code que codifica exatamente `{WEB_URL}/empresa/{slugEmpresa}/{slugCampanha}`.
3. The system SHALL gerar o QR Code com nível de correção de erro Q e margem de no mínimo 4 módulos.
4. The system SHALL desenhar o QR Code com elementos vetoriais do SVG, sem imagem rasterizada embutida.
5. WHEN o selo da mesma campanha é pedido mais de uma vez THEN the system SHALL devolver bytes idênticos em todas as respostas.
6. IF a campanha não estiver `APROVADA` THEN the system SHALL responder HTTP 409 com a mensagem "Campanha não está aprovada".
7. IF a campanha não existir ou pertencer a outra empresa THEN the system SHALL responder HTTP 404 com a mensagem "Campanha não encontrada".
8. IF um usuário sem papel `EMPRESA` pedir o selo THEN the system SHALL responder HTTP 403.
9. WHEN a empresa clica em "Baixar selo" no card THEN the system SHALL baixar o arquivo SVG com o nome `selo-{slugCampanha}.svg`.

**Independent Test**: Baixar o selo de uma campanha aprovada, ler o QR com um celular e chegar à página da empresa rolada até a campanha; pedir o selo de uma campanha em rascunho e receber 409; pedir como outra empresa e receber 404.

---

### P1: Página pública da empresa com campanhas ⭐ MVP

**User Story**: Como consumidor, quero escanear o QR da embalagem e ver a empresa com suas campanhas, já posicionado na campanha do produto, para saber qual causa está sendo apoiada.

**Why P1**: É o destino do QR Code e a entrega de valor ao consumidor.

**Acceptance Criteria**

1. WHEN um visitante sem autenticação consulta `GET /empresas/publicas/{slug}` de uma empresa `APROVADA` THEN the system SHALL responder HTTP 200 com `nomeFantasia`, `cidade`, `uf`, `site`, `temLogo` e a lista `campanhas`.
2. The system SHALL incluir em `campanhas` apenas as campanhas `APROVADA` da empresa, ordenadas pela data de aprovação da mais recente para a mais antiga, cada uma com `slug`, `nome`, `descricao`, `beneficiada` (`nome` e `tipo`), `regraDoacao`, `vigencia` (`inicio` e `fim`) e `situacao` (`NAO_INICIADA` ou `EM_ANDAMENTO`, como em CAMP-11 AC4).
3. IF o slug não existir ou a empresa não estiver `APROVADA` THEN the system SHALL responder HTTP 404 com a mensagem "Empresa não encontrada", com o mesmo corpo nos dois casos.
4. The system SHALL omitir da resposta pública `razaoSocial`, `cnpj`, `telefone`, os campos de endereço além de `cidade` e `uf`, `contato`, o e-mail, os identificadores internos e o motivo de qualquer decisão.
5. WHEN um visitante consulta `GET /empresas/publicas/{slug}/logo` de uma empresa `APROVADA` com logo THEN the system SHALL responder HTTP 200 com os bytes do logo e o `Content-Type` do arquivo; nos demais casos SHALL responder HTTP 404.
6. WHEN um visitante abre `/empresa/{slugEmpresa}` THEN the system SHALL exibir um card da empresa com logo, `nomeFantasia`, cidade/UF e link para o `site`, e dentro dele um subtópico por campanha com nome, descrição, nome da beneficiada, texto do valor (formato de "Campanhas na área da empresa" AC6) e período de vigência.
7. WHEN um visitante abre `/empresa/{slugEmpresa}/{slugCampanha}` THEN the system SHALL exibir a mesma página e rolar até o subtópico da campanha com aquele slug.
8. WHILE a `situacao` da campanha for `NAO_INICIADA` the system SHALL exibir no subtópico a marcação "Campanha ainda não iniciada".
9. WHERE a empresa não tiver campanha publicada the system SHALL exibir no card a mensagem "Nenhuma campanha publicada até o momento".
10. IF `temLogo` for falso THEN the system SHALL exibir no lugar do logo as iniciais de `nomeFantasia`.
11. IF a API responder 404 THEN the system SHALL exibir a página "Empresa não encontrada" com link para `/parceiros`.
12. The system SHALL exibir na página o aviso "A Fivo Lab não intermedeia as doações. A doação é responsabilidade da empresa participante."
13. The system SHALL renderizar a página em telas a partir de 320 px de largura sem rolagem horizontal.

**Independent Test**: Abrir `/empresa/cafe-serra-verde/campanha-agua-limpa` no celular e conferir que a página da empresa abre na campanha certa; suspender a empresa e conferir "Empresa não encontrada".

---

### P1: Vitrine de parceiros ⭐ MVP

**User Story**: Como visitante, quero ver a lista de empresas parceiras, para conhecer quem participa da iniciativa.

**Why P1**: A tela já existe no `web` com dados fictícios e só precisa da API.

**Acceptance Criteria**

1. WHEN um visitante sem autenticação consulta `GET /empresas/publicas` THEN the system SHALL responder HTTP 200 com todas as empresas `APROVADA`, cada uma com `slug`, `nomeFantasia`, `cidade`, `uf` e `temLogo`.
2. The system SHALL ordenar a vitrine por `nomeFantasia` em ordem alfabética, sem diferenciar maiúsculas de minúsculas nem letras acentuadas das sem acento.
3. WHEN o visitante abre `/parceiros` THEN the system SHALL exibir um card por empresa com logo, `nomeFantasia` e cidade/UF, que leva a `/empresa/{slug}`.
4. WHERE não houver empresa aprovada the system SHALL exibir a mensagem "Nenhuma empresa parceira ainda." com link para o cadastro de empresa.
5. The system SHALL renderizar a vitrine em telas a partir de 320 px de largura sem rolagem horizontal.

**Independent Test**: Aprovar duas empresas, abrir `/parceiros` e conferir a ordem alfabética e o link para a página de cada uma; suspender uma e conferir que ela sai da lista.

---

### P1: Nova campanha ligada à API ⭐ MVP

**User Story**: Como empresa aprovada, quero criar uma campanha e enviá-la para análise pelo `web`, para que ela possa ser aprovada e ganhar selo.

**Why P1**: Sem criação pelo `web` não existe campanha para aprovar, e o fluxo não fecha. Os endpoints já existem (CAMP-01…05).

**Acceptance Criteria**

1. WHEN a empresa salva o formulário de `/campanhas/nova` THEN the system SHALL chamar `POST /campanhas` com `nome`, `descricao`, `instituicaoId` ou `causaId`, `regraDoacao`, `meta` e `vigencia` preenchidos no formulário.
2. WHERE a empresa escolheu uma imagem de capa the system SHALL enviá-la por `PUT /campanhas/{id}/capa` logo depois da criação.
3. WHEN a empresa clica em "Salvar rascunho" THEN the system SHALL criar a campanha e levar a empresa para `/campanhas/{id}`.
4. WHEN a empresa clica em "Enviar para análise" THEN the system SHALL criar a campanha, chamar `POST /campanhas/{id}/submissao` e exibir a mensagem "Campanha enviada para análise."
5. IF a API responder com erro THEN the system SHALL exibir o texto devolvido por `mensagemDeErro` (`web/src/services/api.ts`) junto ao formulário, mantendo todos os campos preenchidos.
6. The system SHALL oferecer o formulário sem nenhum passo de escolha de modelo de selo.

**Independent Test**: Criar uma campanha completa pelo `web`, enviá-la para análise e conferir na fila do admin; criar outra só com nome, salvar como rascunho e conferir que abre o detalhe.

---

### P1: Detalhe e correção de campanha ⭐ MVP

**User Story**: Como empresa, quero ver os dados de uma campanha minha e corrigir uma rejeitada, para reenviá-la sem criar outra.

**Why P1**: Campanha rejeitada sem tela de correção trava a empresa. Os endpoints já existem (`GET` e `PATCH /campanhas/{id}`, submissão).

**Acceptance Criteria**

1. WHEN a empresa abre `/campanhas/{id}` THEN the system SHALL exibir, a partir de `GET /campanhas/{id}`, nome, descrição, capa, beneficiada, texto do valor (formato de "Campanhas na área da empresa" AC6), meta, vigência e rótulo do status (AC7 da mesma história).
2. WHILE a campanha estiver `REJEITADA` the system SHALL exibir `motivoUltimaRejeicao` sob o título "Motivo da rejeição".
3. WHILE a campanha estiver `RASCUNHO` ou `REJEITADA` the system SHALL oferecer a edição dos campos por `PATCH /campanhas/{id}` e o botão "Enviar para análise", que chama `POST /campanhas/{id}/submissao`.
4. WHILE a campanha estiver `EM_ANALISE` the system SHALL exibir os dados sem edição e a mensagem "Campanha em análise pela Fivo Lab."
5. WHILE a campanha estiver `APROVADA` the system SHALL exibir os dados sem edição, com os botões "Baixar selo" e "Ver página pública".
6. IF a API responder 404 THEN the system SHALL exibir a página "Campanha não encontrada" com link para `/campanhas`.
7. The system SHALL remover as rotas `/selos` e `/comprovantes` e os itens de menu que levam a elas.

**Independent Test**: Rejeitar uma campanha como admin, abrir o detalhe como empresa, conferir o motivo, corrigir a descrição e reenviar; conferir que ela volta à fila do admin.

---

### P1: Fila de campanhas no admin ⭐ MVP

**User Story**: Como administrador da Fivo Lab, quero aprovar ou rejeitar campanhas e alterações pelo painel, para liberar o selo e a página pública.

**Why P1**: Sem aprovação não há slug, selo nem página pública. Os endpoints já existem (`/admin/campanhas/...`).

**Acceptance Criteria**

1. WHEN o administrador abre `/admin/campanhas` THEN the system SHALL listar os itens de `GET /admin/campanhas/fila` na ordem recebida, cada um com o rótulo "Nova" (`NOVA`) ou "Alteração" (`ALTERACAO`), `empresa`, `nome`, nome da beneficiada, texto do valor, vigência e `submetidoEm`.
2. WHEN o administrador aprova um item `NOVA` THEN the system SHALL chamar `POST /admin/campanhas/{campanhaId}/aprovacao` e retirar o item da lista.
3. WHEN o administrador aprova um item `ALTERACAO` THEN the system SHALL chamar `POST /admin/campanhas/{campanhaId}/alteracao/aprovacao` e retirar o item da lista.
4. WHEN o administrador rejeita um item THEN the system SHALL pedir o motivo e chamar `POST /admin/campanhas/{campanhaId}/rejeicao` (item `NOVA`) ou `POST /admin/campanhas/{campanhaId}/alteracao/rejeicao` (item `ALTERACAO`) com o corpo `{ "motivo": ... }`.
5. WHILE o motivo tiver menos de 20 caracteres the system SHALL manter desabilitado o botão de confirmar a rejeição.
6. IF a API responder 409 THEN the system SHALL exibir o texto de `mensagemDeErro` e recarregar a fila.
7. WHERE a fila estiver vazia the system SHALL exibir a mensagem "Nenhuma campanha aguardando análise."
8. The system SHALL incluir o item "Campanhas" no menu do admin, levando a `/admin/campanhas`.

**Independent Test**: Enviar uma campanha para análise, aprová-la pelo painel e conferir que o selo fica disponível para a empresa; rejeitar outra com motivo de 19 caracteres e conferir o botão desabilitado.

---

## Edge Cases

- IF duas empresas com o mesmo `nomeFantasia` forem aprovadas ao mesmo tempo THEN the system SHALL atribuir slugs distintos às duas, sem falhar nenhuma das aprovações.
- IF a empresa for suspensa THEN the system SHALL responder 404 na página pública e retirá-la da vitrine, preservando o slug para a reativação.
- IF a campanha ganhar uma alteração de compromisso pendente THEN the system SHALL continuar exibindo na página pública a versão aprovada vigente.
- WHEN o conteúdo fornecido pela empresa contiver HTML ou script THEN the system SHALL exibi-lo como texto, sem executá-lo.
- IF o logo da empresa não carregar THEN the system SHALL exibir as iniciais de `nomeFantasia` no lugar da imagem quebrada.

### Dimensões implícitas

| Dimension | Cobertura |
| --------- | --------- |
| Input validation & bounds | Slug AC3–AC4 |
| Concurrency / ordering | Edge case de aprovações simultâneas; ordenação nas listas |
| Auth boundaries | Área AC4, Selo AC7–AC8, rotas públicas sem autenticação |
| State-transition integrity | Slug AC7 (imutável); nenhuma transição nova de estado |
| remaining dimensions | N/A for this scope: o selo não é armazenado, então não há storage, retry nem ciclo de vida de arquivo |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| VIT-01 | P1: Slug permanente de empresa e campanha | Tasks | In Tasks |
| VIT-02 | P1: Campanhas na área da empresa — API | Tasks | In Tasks |
| VIT-03 | P1: Campanhas na área da empresa — `web` | Tasks | In Tasks |
| VIT-04 | P1: Selo genérico com QR Code — API | Tasks | In Tasks |
| VIT-05 | P1: Selo genérico com QR Code — botão no `web` | Tasks | In Tasks |
| VIT-06 | P1: Página pública da empresa — API | Tasks | In Tasks |
| VIT-07 | P1: Página pública da empresa — `web` | Tasks | In Tasks |
| VIT-08 | P1: Vitrine de parceiros — API | Tasks | In Tasks |
| VIT-09 | P1: Vitrine de parceiros — `web` | Tasks | In Tasks |
| VIT-10 | P1: Nova campanha ligada à API — `web` | Tasks | In Tasks |
| VIT-11 | P1: Detalhe e correção de campanha — `web` | Tasks | In Tasks |
| VIT-12 | P1: Fila de campanhas no admin — `web` | Tasks | In Tasks |

**ID format:** `[CATEGORY]-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 12 total, 12 mapeados para tasks (`tasks.md`), 0 não mapeados

---

## Success Criteria

- [ ] A empresa vai da área logada ao SVG do selo em um clique.
- [ ] O QR impresso a 2,0 cm é lido por celular comum e abre a campanha certa.
- [ ] Renomear empresa e campanha depois da aprovação não muda a URL codificada no QR (verificável por teste que compara o slug antes e depois da edição).
- [ ] Nenhuma rota pública devolve `cnpj`, `telefone`, `razaoSocial` ou e-mail.
