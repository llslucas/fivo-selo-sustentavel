# Páginas Públicas — Campanha e Vitrine de Parceiros Specification

> Convenção: seções e palavras-chave EARS em inglês; conteúdo em português (AD-005).
> Fonte: `docs/proposta-inicial.md` — RF06, RF09, requisitos não funcionais de acesso público e responsividade.

## Problem Statement

A promessa da plataforma ao consumidor é transparência: ao escanear o selo na embalagem, ele precisa descobrir imediatamente qual empresa participa, qual causa é apoiada, qual é a regra da doação e o que já foi comprovado. Sem essa camada pública, o selo é só um adesivo e a plataforma não entrega valor a ninguém fora da empresa. A proposta também exige uma vitrine pública das empresas parceiras, hoje inexistente.

## Goals

- [ ] Consumidor que escaneia o QR Code entende a iniciativa sem cadastro e em menos de 30 segundos.
- [ ] Página da campanha exibe empresa, beneficiada, regra de doação, informações da empresa e comprovantes quando houver.
- [ ] Vitrine pública lista todas as empresas parceiras aprovadas com suas campanhas.
- [ ] Todas as páginas públicas funcionam em celular a partir de 320 px de largura.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Cadastro ou login do consumidor | A proposta define acesso público sem cadastro |
| Comentários, avaliações ou interação social do consumidor | Não previsto na v1; abriria necessidade de moderação de conteúdo de terceiros |
| Busca geográfica de produtos e empresas participantes por mapa | Listado como evolução futura na proposta |
| Rankings de impacto social entre empresas | Listado como evolução futura na proposta |
| Painel analítico de acessos para a empresa | Métricas de audiência não constam dos requisitos da v1 |
| Aplicativo mobile nativo | Listado como fora de escopo na proposta |
| Tradução para outros idiomas | Público-alvo inicial é brasileiro; i18n é custo sem retorno na v1 |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Acesso à página da campanha | Público, sem autenticação e sem cookie de identificação | Requisito explícito da proposta | y |
| Visibilidade condicionada à aprovação | Só campanhas `APROVADA` ou `ENCERRADA` de empresa `APROVADA` são renderizadas | Coerente com a moderação preventiva (AD-003) | y |
| Estrutura de URL | `/{identificador-publico}` para a campanha e `/parceiros` para a vitrine | URL curta reduz a densidade do QR Code e melhora a leitura em embalagem | n |
| Comportamento de campanha inexistente ou não publicada | HTTP 404 com página explicativa, sem distinguir "não existe" de "não publicada" | Evita vazar a existência de campanhas em rascunho ou em análise | n |
| Indexação por buscadores | Página da campanha e vitrine indexáveis; nenhuma rota autenticada indexável | Descoberta orgânica ajuda a iniciativa; áreas restritas não podem vazar | n |
| Ordenação da vitrine | Alfabética por nome da empresa | Neutra: qualquer outro critério sugeriria hierarquia entre parceiros sem regra definida | n |
| Dados de contato exibidos na vitrine | Apenas os que a empresa marcar como públicos (site, e-mail comercial, cidade/UF) | A proposta pede "informações básicas de contato" mas dados de contato podem ser sensíveis | n |
| Desempenho alvo | Página da campanha responde em até 2 segundos em conexão 4G | O consumidor está em pé no supermercado com o celular na mão | n |
| Compartilhamento em redes sociais | Metadados Open Graph com nome da campanha, empresa e beneficiada | Compartilhar a página é o canal orgânico mais provável e custa pouco | n |
| Dados da instituição exibidos publicamente | Apenas nome, causa, cidade, UF, descrição, site e logo; documento de validação, e-mail de acesso, telefone e notas de curadoria nunca aparecem | A instituição passou a ser um cadastro self-service com dados restritos (AD-008); a página pública é a superfície de vazamento mais provável | y |

**Open questions:** none - todas resolvidas ou registradas acima.

---

## User Stories

### P1: Página pública da campanha ⭐ MVP

**User Story**: Como consumidor, quero acessar a página da campanha pelo QR Code do selo e ver quem é a empresa, qual a causa apoiada e a regra da doação, para decidir se confio naquela iniciativa.

**Why P1**: É o passo 10 do fluxo básico da proposta e a entrega de valor ao consumidor.

**Acceptance Criteria**

1. WHEN um visitante acessa a URL pública de uma campanha `APROVADA` de empresa `APROVADA` THEN the system SHALL responder HTTP 200 com nome e logo da empresa, nome e descrição da campanha, beneficiada, regra de doação e período de vigência, sem exigir autenticação.
2. The system SHALL exibir a regra de doação em texto legível derivado do dado estruturado, por exemplo "A cada unidade vendida, R$ 1,00 é destinado à instituição X".
3. WHERE a campanha possuir comprovantes publicados the system SHALL exibi-los em ordem cronológica decrescente com data, descrição e link de visualização.
4. WHERE a campanha não possuir nenhum comprovante publicado the system SHALL exibir a mensagem "Nenhum comprovante publicado até o momento" em vez de uma seção vazia.
5. WHILE a campanha estiver `ENCERRADA` the system SHALL continuar respondendo HTTP 200 e SHALL exibir a marcação visível "Campanha encerrada" junto ao período de vigência.
6. WHILE a data de início da campanha for futura the system SHALL exibir a marcação "Campanha ainda não iniciada".
7. IF a campanha não existir, estiver em `RASCUNHO`, `EM_ANALISE` ou `REJEITADA`, ou pertencer a empresa `SUSPENSA` THEN the system SHALL responder HTTP 404 com página explicativa, sem revelar o motivo específico.
8. The system SHALL exibir os dados públicos da beneficiada — nome, causa, cidade, UF, site e logo quando houver — permitindo ao consumidor verificá-la por conta própria.
9. The system SHALL excluir da página pública todo dado restrito da instituição beneficiada, em especial o documento de validação, o e-mail de acesso, o telefone e as notas internas de curadoria.
10. The system SHALL escapar todo conteúdo fornecido pela empresa antes de renderizá-lo, impedindo execução de HTML ou script injetado.
11. The system SHALL renderizar a página corretamente em telas a partir de 320 px de largura, sem rolagem horizontal.
12. The system SHALL exibir aviso permanente de que a Fivo Lab não intermedeia financeiramente as doações e de que a doação é responsabilidade da empresa participante.

**Independent Test**: Escanear o QR de uma campanha aprovada em um celular e conferir todos os blocos de informação; acessar a URL de uma campanha em rascunho e receber 404.

---

### P1: Vitrine pública de parceiros ⭐ MVP

**User Story**: Como consumidor ou empresa interessada, quero ver a lista de empresas parceiras da Fivo, para conhecer quem participa da iniciativa.

**Why P1**: Requisito explícito RF09 e principal canal de divulgação da própria plataforma.

**Acceptance Criteria**

1. WHEN um visitante acessa a vitrine de parceiros THEN the system SHALL listar todas as empresas em estado `APROVADA` com nome, logo e cidade/UF, ordenadas alfabeticamente, sem exigir autenticação.
2. The system SHALL excluir da vitrine empresas em `PENDENTE_APROVACAO`, `REJEITADA` ou `SUSPENSA`.
3. WHEN o visitante abre o perfil público de uma empresa parceira THEN the system SHALL exibir os dados de contato marcados como públicos e a lista de suas campanhas `APROVADA` e `ENCERRADA` com link para cada página de campanha.
4. WHERE a empresa não possuir nenhuma campanha publicada the system SHALL exibir seu perfil com a mensagem "Nenhuma campanha publicada até o momento".
5. IF não houver nenhuma empresa aprovada THEN the system SHALL exibir estado vazio com convite ao cadastro, em vez de página em branco.
6. The system SHALL renderizar a vitrine corretamente em telas a partir de 320 px de largura.

**Independent Test**: Aprovar duas empresas, acessar `/parceiros` e conferir a listagem alfabética e a navegação até uma página de campanha; suspender uma delas e confirmar que sai da vitrine.

---

### P1: Página institucional da iniciativa Fivo ⭐ MVP

**User Story**: Como visitante, quero entender o que é a iniciativa Fivo e como participar, para avaliar cadastrar minha empresa.

**Why P1**: A proposta lista "domínio principal com informações da iniciativa Fivo" no escopo inicial; é a porta de entrada de aquisição.

**Acceptance Criteria**

1. WHEN um visitante acessa o domínio principal THEN the system SHALL exibir a explicação da iniciativa, como o selo funciona, e chamadas para cadastro de empresa, para cadastro de instituição e para a vitrine de parceiros.
2. The system SHALL manter o domínio principal acessível publicamente sem autenticação.
3. The system SHALL renderizar a página corretamente em telas a partir de 320 px de largura.

**Independent Test**: Acessar a raiz do domínio em desktop e celular e verificar conteúdo, os dois links de cadastro (empresa e instituição) e o link para a vitrine.

---

### P2: Compartilhamento e metadados sociais

**User Story**: Como consumidor, quero compartilhar a página da campanha em redes sociais e mensageiros com um preview correto, para divulgar a iniciativa.

**Why P2**: Amplifica o alcance sem ser necessário para validar a proposta de valor.

**Acceptance Criteria**

1. WHEN a página da campanha é carregada THEN the system SHALL incluir metadados Open Graph com título, descrição, imagem e URL canônica da campanha.
2. The system SHALL usar o logo da empresa como imagem do preview quando não houver imagem específica da campanha.
3. The system SHALL manter a URL canônica igual à URL codificada no QR Code, evitando divergência de endereços para a mesma campanha.

**Independent Test**: Colar a URL de uma campanha em um mensageiro e conferir o preview com nome, descrição e imagem corretos.

---

## Edge Cases

- IF o logo da empresa não puder ser carregado THEN the system SHALL exibir um espaço reservado com o nome da empresa em vez de imagem quebrada.
- IF a campanha for aprovada e a empresa suspensa em seguida THEN the system SHALL responder HTTP 404 na página da campanha em no máximo 60 segundos.
- WHEN a descrição da campanha for muito longa THEN the system SHALL exibi-la integralmente com recurso de expandir, sem quebrar o layout em 320 px.
- IF um comprovante publicado apontar para arquivo inacessível THEN the system SHALL manter a página no ar exibindo o item como indisponível, sem retornar erro na página inteira.
- WHEN um identificador público malformado for acessado THEN the system SHALL responder HTTP 404 sem expor detalhes internos de erro.
- WHEN a página é acessada por leitor de tela THEN the system SHALL fornecer texto alternativo em logos e imagens e hierarquia de títulos correta.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| PUB-01 | P1: Página da campanha — conteúdo obrigatório | Design | Pending |
| PUB-02 | P1: Página da campanha — regra de doação legível | Design | Pending |
| PUB-03 | P1: Página da campanha — bloco de comprovantes e estados vazios | Design | Pending |
| PUB-04 | P1: Página da campanha — visibilidade por estado e 404 seguro | Design | Pending |
| PUB-05 | P1: Página da campanha — segurança de conteúdo e responsividade | Design | Pending |
| PUB-06 | P1: Vitrine de parceiros — listagem pública | Design | Pending |
| PUB-07 | P1: Vitrine de parceiros — perfil da empresa e campanhas vinculadas | Design | Pending |
| PUB-08 | P1: Página institucional da iniciativa Fivo | Design | Pending |
| PUB-09 | P1: Página da campanha — não exposição de dados restritos da instituição | Design | Pending |
| PUB-10 | P2: Compartilhamento e metadados sociais | - | Pending |

**ID format:** `[CATEGORY]-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 10 total, 0 mapeados para tasks, 10 não mapeados ⚠️ (esperado — fase Tasks ainda não executada)

---

## Success Criteria

- [ ] Consumidor identifica empresa, causa e regra de doação em menos de 30 segundos após escanear o QR Code.
- [ ] Página da campanha carrega em até 2 segundos em conexão 4G.
- [ ] Nenhuma campanha não aprovada é acessível publicamente (verificável por teste que espera 404 por estado).
- [ ] Todas as páginas públicas passam em verificação de layout a 320 px sem rolagem horizontal.
