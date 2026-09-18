# Cadastro e Autenticação de Empresa Specification

> Convenção: seções e palavras-chave EARS (`WHEN`, `WHILE`, `WHERE`, `IF/THEN`, `SHALL`) em inglês; conteúdo em português (AD-005).
> Fonte: `docs/proposta-inicial.md` — RF01, RF08 (parcial), requisitos não funcionais de autenticação, e a Atualização de 29/08/2026 (papel `INSTITUICAO`).

## Problem Statement

Não existe hoje nenhum ponto de entrada para uma empresa participar da iniciativa Fivo: toda a plataforma (campanhas, selos, páginas públicas, comprovantes) depende de uma identidade de empresa autenticada e reconhecida pela Fivo Lab. Sem cadastro com aprovação, qualquer terceiro poderia publicar uma campanha de impacto social em nome de uma marca, destruindo a credibilidade que é o produto central da plataforma.

## Goals

- [ ] Empresa completa o autocadastro em uma sessão, sem contato humano prévio, em menos de 5 minutos.
- [ ] Nenhuma empresa cria campanha ou selo antes de aprovação explícita do administrador da Fivo Lab.
- [ ] Empresa e administrador acessam suas áreas restritas com autenticação por e-mail e senha, com sessão expirável.
- [ ] 100% dos dados restritos (CNPJ, contato, senha) inacessíveis sem autenticação.

## Out of Scope

Explicitamente excluído. Documentado para evitar scope creep.

| Feature | Reason |
| ------- | ------ |
| Login social (Google/Microsoft) | Sem ganho na v1; adiciona dependência externa de OAuth |
| Múltiplos usuários por empresa / RBAC interno | A proposta prevê uma conta por empresa; papéis internos são evolução futura |
| Autenticação de consumidor | A proposta define acesso público sem cadastro |
| Consulta automática de CNPJ em API da Receita Federal | Validação de elegibilidade é responsabilidade humana da Fivo Lab nesta etapa |
| Análise de crédito da empresa | Listado como fora de escopo na proposta |
| MFA / autenticação em dois fatores | Não exigido na v1; evolução futura |
| Notificações push | Listado como fora de escopo na proposta |

---

## Assumptions & Open Questions

Toda ambiguidade está resolvida ou registrada aqui — nada fica silenciosamente indefinido.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Cadastro da empresa exige aprovação do admin | Empresa nasce em `PENDENTE_APROVACAO` e só cria campanhas após `APROVADA` | Decidido com o usuário (AD-003): a credibilidade da marca Fivo depende de curadoria prévia | y |
| Autenticação da empresa | E-mail + senha, sessão expirando em 8 horas de inatividade | Menor superfície de implementação compatível com o RNF "possuir autenticação para empresas e administradores" | y |
| Papéis autenticados na plataforma | `EMPRESA`, `INSTITUICAO` e `ADMIN` compartilham o mesmo mecanismo de autenticação, política de senha, rate limit e expiração de sessão especificados aqui | A Atualização de 29/08/2026 torna a instituição um usuário autocadastrado (AD-008); duas implementações de login dobrariam a superfície de erro de segurança | y |
| Identidade do administrador Fivo Lab | Contas de admin são criadas por seed/provisionamento interno, sem autocadastro | Admin é papel interno da Fivo Lab; autocadastro de admin seria falha de segurança | n |
| Unicidade do cadastro | CNPJ e e-mail são únicos na plataforma | Um CNPJ representa uma empresa participante; duplicidade quebraria a vitrine de parceiros | n |
| Comunicação de aprovação/rejeição | E-mail transacional para o e-mail cadastrado | A empresa precisa saber que foi aprovada sem depender de polling na plataforma | n |
| Notificação por WhatsApp | Não implementada | A proposta a lista como evolução futura | y |
| Formato e limites do logo | PNG, JPG ou SVG; até 5 MB; mínimo 512×512 px para raster | O mesmo arquivo alimenta o selo impresso (300 DPI) e a vitrine de parceiros | n |
| Exclusão de conta pela própria empresa | Não oferecida na v1; empresa solicita ao admin, que suspende | Exclusão em cascata (campanhas públicas, selos em embalagens físicas) tem impacto que a v1 não trata | n |
| Retenção de dados de empresa rejeitada | Mantidos por 90 dias e então anonimizados | Permite reanálise e auditoria sem reter dado pessoal indefinidamente (LGPD) | n |

**Open questions:** none - todas resolvidas ou registradas acima.

---

## User Stories

### P1: Autocadastro da empresa ⭐ MVP

**User Story**: Como empresa interessada, quero me cadastrar na plataforma informando meus dados e logo, para poder criar uma campanha de impacto social.

**Why P1**: É o ponto de entrada de toda a plataforma. Nenhum outro fluxo existe sem uma empresa cadastrada.

**Acceptance Criteria**

1. WHEN a empresa envia o formulário de cadastro com razão social, nome fantasia, CNPJ, e-mail, telefone, endereço (CEP, logradouro, número, complemento opcional, bairro, cidade, UF), site (opcional), nome da pessoa de contato e senha válidos THEN the system SHALL criar a empresa com estado `PENDENTE_APROVACAO` e responder HTTP 201 com o identificador da empresa.
2. IF o CNPJ informado não tiver 14 dígitos ou falhar na verificação dos dígitos verificadores THEN the system SHALL rejeitar o cadastro com HTTP 422 e a mensagem "CNPJ inválido", sem persistir dado algum.
3. IF o CNPJ ou o e-mail já existir em outra empresa THEN the system SHALL rejeitar o cadastro com HTTP 409 e a mensagem "CNPJ ou e-mail já cadastrado".
4. IF a senha tiver menos de 10 caracteres THEN the system SHALL rejeitar o cadastro com HTTP 422 e a mensagem "A senha deve ter no mínimo 10 caracteres".
5. WHEN a empresa envia um logo THEN the system SHALL aceitar apenas arquivos PNG, JPG ou SVG de até 5 MB e, para formatos raster, com no mínimo 512×512 px.
6. IF o arquivo de logo violar formato, tamanho ou dimensão mínima THEN the system SHALL rejeitar o upload com HTTP 422 informando qual limite foi violado, mantendo o restante do cadastro intacto.
7. The system SHALL armazenar a senha apenas como hash com algoritmo de derivação de chave com salt (bcrypt ou argon2), nunca em texto claro.
8. WHEN o cadastro é criado com sucesso THEN the system SHALL enviar e-mail de confirmação de recebimento ao endereço cadastrado informando que o cadastro está em análise.
9. IF o envio do e-mail de confirmação falhar THEN the system SHALL manter o cadastro criado e registrar o erro em log, sem devolver falha à empresa.

**Independent Test**: Submeter o formulário com dados válidos e verificar que a empresa consta como `PENDENTE_APROVACAO` no painel administrativo; submeter CNPJ inválido e duplicado e verificar as rejeições 422 e 409.

---

### P1: Aprovação do cadastro pelo administrador ⭐ MVP

**User Story**: Como administrador da Fivo Lab, quero analisar e aprovar ou rejeitar cadastros de empresas, para garantir que apenas empresas legítimas publiquem iniciativas na plataforma.

**Why P1**: É o portão de credibilidade da plataforma (AD-003). Sem ele, qualquer terceiro publica em nome de uma marca.

**Acceptance Criteria**

1. WHEN o administrador autenticado abre a fila de análise THEN the system SHALL listar todas as empresas em estado `PENDENTE_APROVACAO` ordenadas da mais antiga para a mais recente, exibindo nome, CNPJ, e-mail e data de cadastro.
2. WHEN o administrador aprova uma empresa THEN the system SHALL alterar o estado para `APROVADA`, registrar identificador do admin e data-hora da decisão, e enviar e-mail de aprovação à empresa.
3. WHEN o administrador rejeita uma empresa THEN the system SHALL exigir um motivo de no mínimo 20 caracteres, alterar o estado para `REJEITADA`, persistir o motivo e enviá-lo por e-mail à empresa.
4. WHILE uma empresa estiver em `PENDENTE_APROVACAO` ou `REJEITADA` the system SHALL bloquear a criação de campanhas e de solicitações de selo, respondendo HTTP 403 com a mensagem "Cadastro ainda não aprovado".
5. The system SHALL permitir apenas as transições `PENDENTE_APROVACAO → APROVADA`, `PENDENTE_APROVACAO → REJEITADA`, `APROVADA → SUSPENSA` e `SUSPENSA → APROVADA`, rejeitando qualquer outra com HTTP 409.
6. IF um usuário sem papel de administrador chamar qualquer endpoint de aprovação THEN the system SHALL responder HTTP 403 e não alterar estado algum.
7. The system SHALL registrar em log de auditoria imutável toda mudança de estado de empresa, com autor, estado anterior, estado novo e data-hora.

**Independent Test**: Com uma empresa pendente, aprovar pelo painel e verificar transição de estado + e-mail; tentar aprovar como usuário empresa e receber 403; tentar aprovar duas vezes e receber 409.

---

### P1: Autenticação e sessão ⭐ MVP

**User Story**: Como empresa ou administrador, quero entrar na plataforma com e-mail e senha, para acessar minha área restrita com segurança.

**Why P1**: Requisito não funcional explícito da proposta e pré-condição de toda área restrita.

**Acceptance Criteria**

1. WHEN um usuário envia e-mail e senha corretos THEN the system SHALL estabelecer uma sessão autenticada e responder HTTP 200 com o papel do usuário (`EMPRESA`, `INSTITUICAO` ou `ADMIN`).
2. IF o e-mail não existir ou a senha estiver incorreta THEN the system SHALL responder HTTP 401 com a mensagem genérica "Credenciais inválidas", sem revelar qual dos dois falhou.
3. IF uma mesma conta acumular 5 tentativas de login malsucedidas em 15 minutos THEN the system SHALL bloquear novas tentativas dessa conta por 15 minutos e responder HTTP 429.
4. WHILE uma sessão estiver inativa por mais de 8 horas the system SHALL invalidá-la e exigir novo login, respondendo HTTP 401 na próxima requisição autenticada.
5. WHEN o usuário solicita logout THEN the system SHALL invalidar a sessão imediatamente, tornando o token anterior inutilizável.
6. The system SHALL negar com HTTP 401 qualquer requisição a rota restrita sem sessão válida, e com HTTP 403 qualquer requisição a recurso pertencente a outra empresa, a uma instituição ou a um papel diferente do seu.
7. The system SHALL transmitir todo tráfego autenticado exclusivamente sobre HTTPS.

**Independent Test**: Logar com credenciais válidas de cada papel e conferir o papel retornado; errar a senha 5 vezes e receber 429; acessar recurso de outra empresa com sessão válida e receber 403.

---

### P2: Manutenção dos dados cadastrais

**User Story**: Como empresa aprovada, quero editar meus dados de contato e trocar meu logo, para manter minhas informações corretas nas páginas públicas.

**Why P2**: Necessário para operação contínua, mas o MVP é demonstrável com dados imutáveis do cadastro inicial.

**Acceptance Criteria**

1. WHEN a empresa autenticada altera nome fantasia, telefone, endereço ou logo THEN the system SHALL persistir a alteração e refletir o novo valor nas páginas públicas em no máximo 60 segundos.
2. IF a empresa tentar alterar o CNPJ THEN the system SHALL rejeitar a operação com HTTP 422 e a mensagem "CNPJ não pode ser alterado; solicite ao suporte".
3. WHEN a empresa altera o e-mail de acesso THEN the system SHALL manter o e-mail anterior ativo até que o novo endereço seja confirmado por link enviado a ele.
4. WHEN a empresa substitui o logo THEN the system SHALL manter os selos já gerados inalterados e aplicar o novo logo apenas em selos gerados a partir da substituição.
5. The system SHALL aplicar aos uploads de logo em edição as mesmas restrições de formato, tamanho e dimensão do cadastro inicial.

**Independent Test**: Alterar telefone e logo pela área da empresa e verificar a atualização na vitrine de parceiros; tentar alterar CNPJ e receber 422.

---

### P2: Recuperação de senha

**User Story**: Como empresa, quero redefinir minha senha por e-mail, para recuperar o acesso quando esquecê-la.

**Why P2**: Sem isso a perda de senha vira ticket manual, mas não bloqueia a demonstração do fluxo principal.

**Acceptance Criteria**

1. WHEN o usuário solicita recuperação informando um e-mail THEN the system SHALL responder HTTP 202 com mensagem neutra independentemente de o e-mail existir, evitando enumeração de contas.
2. WHERE o e-mail informado corresponder a uma conta existente the system SHALL enviar um link de redefinição com token de uso único válido por 60 minutos.
3. WHEN um token válido é usado para definir nova senha THEN the system SHALL atualizar o hash da senha, invalidar o token e encerrar todas as sessões ativas daquela conta.
4. IF o token estiver expirado, já utilizado ou não existir THEN the system SHALL responder HTTP 400 com a mensagem "Link de redefinição inválido ou expirado".

**Independent Test**: Solicitar recuperação, redefinir pelo link e confirmar que a senha antiga deixou de funcionar e as sessões anteriores foram encerradas.

---

### P3: Suspensão e reativação de empresa

**User Story**: Como administrador, quero suspender uma empresa, para retirar do ar imediatamente iniciativas que violem as regras da plataforma.

**Why P3**: Mitigação reativa útil, mas não necessária para validar a proposta de valor da v1.

**Acceptance Criteria**

1. WHEN o administrador suspende uma empresa aprovada THEN the system SHALL alterar o estado para `SUSPENSA` e tornar todas as páginas públicas de suas campanhas inacessíveis com HTTP 404 em no máximo 60 segundos.
2. WHILE uma empresa estiver `SUSPENSA` the system SHALL permitir login e leitura dos próprios dados, mas bloquear criação e edição de campanhas, selos e comprovantes com HTTP 403.
3. WHEN o administrador reativa uma empresa suspensa THEN the system SHALL restaurar o estado `APROVADA` e voltar a publicar as campanhas que estavam aprovadas antes da suspensão.

**Independent Test**: Suspender uma empresa com campanha publicada, verificar 404 na página pública, reativar e confirmar que a página volta.

---

## Edge Cases

- IF dois cadastros com o mesmo CNPJ forem submetidos simultaneamente THEN the system SHALL persistir apenas o primeiro e rejeitar o segundo com HTTP 409, garantido por restrição de unicidade no banco.
- IF o serviço de armazenamento de arquivos estiver indisponível durante o upload do logo THEN the system SHALL responder HTTP 503 com a mensagem "Não foi possível enviar o logo, tente novamente" e preservar os demais dados já preenchidos.
- IF o provedor de e-mail estiver indisponível durante aprovação ou rejeição THEN the system SHALL concluir a mudança de estado, registrar a falha em log e enfileirar o e-mail para nova tentativa.
- WHEN o nome da empresa contiver caracteres HTML ou script THEN the system SHALL escapá-los na renderização das páginas públicas, impedindo execução.
- IF o mesmo cadastro pendente for aprovado e rejeitado concorrentemente por dois administradores THEN the system SHALL aplicar apenas a primeira decisão e responder HTTP 409 à segunda.
- WHEN uma empresa rejeitada tentar se cadastrar novamente com o mesmo CNPJ THEN the system SHALL permitir um novo cadastro que substitui o registro rejeitado e retorna à fila de análise.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| EMP-01 | P1: Autocadastro da empresa | Design | In Design (caso de uso `CriarEmpresaUseCase` existe em `feat/new-arch`, incompleto) |
| EMP-02 | P1: Autocadastro — validação de CNPJ, e-mail e senha | Design | In Design (`Cnpj` VO existe; política de senha e unicidade de e-mail a fazer) |
| EMP-03 | P1: Autocadastro — upload e validação de logo | Design | In Design (não iniciado — depende da fase de infra) |
| EMP-04 | P1: Aprovação do cadastro pelo administrador | Design | In Design (`AprovarEmpresaUseCase` existe; fila e e-mail a fazer) |
| EMP-05 | P1: Aprovação — máquina de estados e auditoria | Design | In Design (transições e auditoria a fazer) |
| EMP-06 | P1: Autenticação e sessão — credenciais e papéis `EMPRESA`, `INSTITUICAO` e `ADMIN` | Design | In Design (`AuthenticateUserUseCase` existe; realinhar para sessão opaca) |
| EMP-07 | P1: Autenticação — rate limit e expiração de sessão | Design | In Design (não iniciado) |
| EMP-08 | P2: Manutenção dos dados cadastrais | Design | In Design (não iniciado) |
| EMP-09 | P2: Recuperação de senha | Design | In Design (não iniciado) |
| EMP-10 | P3: Suspensão e reativação de empresa | Design | In Design (`SuspenderEmpresaUseCase` existe; reativação e regra de estado a fazer) |

**ID format:** `[CATEGORY]-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 10 total, 0 mapeados para tasks (`tasks.md` a refazer após aprovação do design), 10 não mapeados ⚠️ (esperado — Design em revisão após a virada de arquitetura de AD-017; parte dos casos de uso de domínio já existe na branch `feat/new-arch` e precisa de retrabalho)

---

## Success Criteria

- [ ] Uma empresa conclui o cadastro completo em menos de 5 minutos sem suporte humano.
- [ ] Nenhuma campanha ou selo é criado por empresa não aprovada (verificável por teste de integração retornando 403).
- [ ] Administrador processa a fila de análise e a empresa recebe a decisão por e-mail em menos de 1 minuto após a aprovação.
- [ ] Zero senhas em texto claro no banco e nos logs (verificável por inspeção de schema e por teste que grava e relê a credencial).
