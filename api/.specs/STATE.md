# STATE

## Decisions

### AD-001
- **Decision**: A plataforma é decomposta em 6 features independentes (`cadastro-empresa`, `catalogo-instituicoes`, `campanhas`, `selo-e-qrcode`, `paginas-publicas`, `transparencia-e-area-empresa`), cada uma com spec, design e tasks próprios.
- **Reason**: Os RF01–RF09 da proposta têm ciclos de vida e donos diferentes (empresa, admin, consumidor). Um recorte por domínio permite implementar e validar verticalmente cada fatia sem travar as demais.
- **Trade-off**: Mais artefatos para manter e contratos entre features que precisam ser explicitados (empresa aprovada → campanha; instituição aprovada → beneficiada selecionável; campanha aprovada → selo e página pública).
- **Scope**: Todo o projeto.
- **Date**: 2026-08-22
- **Status**: active

### AD-002
- **Decision**: A cobrança do selo na v1 é manual/offline: a plataforma modela um **pedido de selo** com estados `PENDENTE_PAGAMENTO → PAGO → LIBERADO` (e `CANCELADO`), e o administrador da Fivo Lab registra o pagamento fora da plataforma para liberar a geração do arquivo do selo.
- **Reason**: A proposta condiciona o uso do selo à compra, mas exclui gateway de pagamento e intermediação financeira do escopo. Modelar o pedido preserva a regra de negócio e o histórico sem construir integração financeira.
- **Trade-off**: Depende de ação humana do admin; sem conciliação automática nem comprovante de pagamento no sistema.
- **Scope**: `selo-e-qrcode`, `transparencia-e-area-empresa` (visão do status), painel administrativo.
- **Date**: 2026-08-22
- **Status**: superseded by AD-007 em 2026-08-29 — a Atualização de 29/08/2026 adiou a monetização; os estados de pagamento saíram da v1.

### AD-003
- **Decision**: Quatro tipos de conteúdo passam por aprovação prévia do administrador antes de ficarem públicos: cadastro da empresa, cadastro da instituição, campanha e comprovante de doação. Moderação é **preventiva**, não reativa.
- **Reason**: A proposta atribui à Fivo Lab a responsabilidade pela elegibilidade das instituições e pela credibilidade da iniciativa; o valor central do produto é transparência, o que exige controle sobre o que é publicado em nome da marca Fivo.
- **Trade-off**: Introduz latência humana no onboarding e na publicação; exige um painel administrativo desde a v1.
- **Scope**: `cadastro-empresa`, `catalogo-instituicoes`, `campanhas`, `transparencia-e-area-empresa`, painel administrativo.
- **Date**: 2026-08-22 (emendada em 2026-08-29 para incluir o cadastro de instituição, ver AD-008)
- **Status**: active

### AD-004
- **Decision**: O selo digital é gerado a partir de **5 templates fixos** compostos server-side (logo da empresa + dados da campanha + QR Code), exportado em **PNG rasterizado (300 DPI)** e **PDF vetorial**. Nenhuma geração por IA na v1.
- **Reason**: Resolve a contradição da proposta (o "Escopo Inicial" cita IA, mas o RF04 e a seção "Fora de escopo" fixam modelos pré-definidos). PDF vetorial é requisito para impressão pela gráfica parceira prevista na monetização.
- **Trade-off**: Menos flexibilidade visual para a empresa; a composição precisa de pipeline de renderização determinística (SVG → PNG/PDF) em vez de simples upload de imagem.
- **Scope**: `selo-e-qrcode`.
- **Date**: 2026-08-22
- **Status**: active

### AD-005
- **Decision**: Os artefatos `.specs/` usam esqueleto de seções e palavras-chave EARS em inglês (`WHEN`, `WHILE`, `WHERE`, `IF/THEN`, `SHALL`) com o conteúdo redigido em português.
- **Reason**: Os validadores determinísticos do fluxo (`validate_spec.py`, `validate_tasks.py`) reconhecem os padrões EARS e as seções obrigatórias em inglês; traduzi-los desligaria o gate estrutural.
- **Trade-off**: Texto bilíngue nos critérios de aceitação.
- **Scope**: Todos os artefatos em `.specs/`.
- **Date**: 2026-08-22
- **Status**: active

### AD-006
- **Decision**: O modelo de dados canônico da v1 tem 17 entidades e mora no ERD do Lucid (`https://lucid.app/lucidchart/e2b2491c-9824-4422-9c1d-c43cd032a316/edit`). Três escolhas estruturais: (a) beneficiada da campanha é XOR entre `instituicao_id` e `causa_id` — nunca ambos, nunca nenhum; (b) todo binário (logo, imagem de campanha, PNG/PDF do selo, comprovante) é referenciado por uma tabela única `arquivo`; (c) alteração de campanha aprovada que toque beneficiada, regra de doação ou vigência vai para `campanha_alteracao_pendente`, mantendo a versão publicada intacta até a decisão do admin.
- **Reason**: (a) resolve a ambiguidade "instituição ou causa" das specs sem coluna polimórfica; (b) centraliza upload, validação de MIME/tamanho e indisponibilidade do storage num só lugar, já que as 4 features tratam falha de armazenamento igual; (c) é a única forma de satisfazer `campanhas` P1-AC2 ("manter a versão aprovada anterior publicada até a decisão") sem versionar a tabela inteira.
- **Trade-off**: (a) exige CHECK constraint no banco, não expressável só por FK; (b) uma tabela quente com muitos FKs entrando; (c) duplica as colunas de compromisso da campanha na tabela de alteração pendente.
- **Scope**: Todas as 6 features; fase Design.
- **Date**: 2026-08-22
- **Status**: active, com revisão pendente — AD-007, AD-008 e AD-009 alteram três pontos do modelo: `instituicao` ganha credencial, endereço, telefone, estado de aprovação e FK para o documento de validação em `arquivo`; `pedido_selo` perde os estados de pagamento e vira `solicitacao_selo` com relação 1–1 com `campanha` e modelo imutável; o ERD e o diagrama de classes no Lucid ainda refletem a versão anterior. Em 2026-09-07, **AD-017** torna o modelo **code-first**: as entidades TypeScript em `src/domain/fivo/entities/` passam a ser a fonte da verdade; o ERD do Lucid deixa de ser fonte da verdade e o schema Prisma derivará das entidades quando a fase de infra começar.

### AD-007
- **Decision**: A monetização do selo sai da v1 e vai para o backlog. Não existe preço, cobrança, registro de pagamento nem bloqueio por falta de pagamento. O que libera a geração do arquivo do selo é a aprovação da campanha. O registro do pedido sobrevive como `solicitacao_selo` com apenas dois estados, `SOLICITADO → GERADO`.
- **Reason**: A Atualização de 29/08/2026 determina não adicionar monetização em um primeiro momento. Manter o registro da solicitação (em vez de removê-lo) preserva o histórico de quem gerou o quê e deixa o gancho para reintroduzir a cobrança sem remodelar o domínio.
- **Trade-off**: Uma entidade sem função de negócio imediata na v1; e a plataforma deixa de ter qualquer receita modelada, o que precisa ser retomado antes de um lançamento comercial.
- **Scope**: `selo-e-qrcode`, `campanhas`, `transparencia-e-area-empresa`, `cadastro-empresa`, painel administrativo.
- **Date**: 2026-08-29
- **Status**: active — supersedes AD-002

### AD-008
- **Decision**: A instituição passa a ser um usuário autenticado da plataforma (papel `INSTITUICAO`), com autocadastro self-service que usa a mesma estrutura de dados da empresa (nome, CNPJ, e-mail, telefone, endereço, logo, senha) mais causa, descrição, site e **exatamente 1 documento de validação obrigatório** (PDF/JPG/PNG até 10 MB, sem tipo fixo exigido, com descrição livre opcional). O administrador aprova ou rejeita analisando esse documento, e a instituição tem área logada para acompanhar o status, corrigir dados e substituir o documento.
- **Reason**: A Atualização de 29/08/2026 determina a mesma estrutura da empresa nos cadastros, o documento de validação e o cadastro self-service com validação do administrador. Sem conta própria, toda correção de dado da instituição viraria ticket manual para a Fivo Lab; sem tipo fixo de documento, instituições pequenas com documentação heterogênea não são barradas na porta.
- **Trade-off**: Um quarto tipo de usuário, uma área logada nova e uma segunda fila de moderação no painel administrativo; e a decisão de elegibilidade passa a ser tomada sobre um documento de formato imprevisível.
- **Scope**: `catalogo-instituicoes` (reescrita), `cadastro-empresa` (papéis de autenticação), `paginas-publicas` (não exposição de dados restritos), `transparencia-e-area-empresa` (fila do painel admin).
- **Date**: 2026-08-29
- **Status**: active

### AD-009
- **Decision**: Cada campanha tem exatamente 1 selo, sem numeração ou individualização por unidade, e o modelo escolhido é definitivo a partir da primeira geração bem-sucedida — regerar o arquivo é permitido, trocar o modelo responde HTTP 409 e exige nova campanha.
- **Reason**: A Atualização de 29/08/2026 fixa "1 selo único por campanha, sem numeração". Travar o modelo garante que o arquivo armazenado nunca divirja da arte já impressa na embalagem que circula com aquele QR Code.
- **Trade-off**: Um erro de escolha de modelo só se corrige criando outra campanha, com novo identificador público e novo QR — custo real de suporte que a v1 aceita em troca da fidelidade ao material impresso.
- **Scope**: `selo-e-qrcode`, `campanhas` (duplicação de campanha), `transparencia-e-area-empresa` (área da empresa).
- **Date**: 2026-08-29
- **Status**: active

### AD-010
- **Decision**: O projeto é um monorepo com back-end e front-end como apps separados: `api` (NestJS) e `web` (NextJS). Dentro de cada app, o código é organizado pelos mesmos nomes das 6 features. A separação entre camada de infra e camada de domínio é interna ao `api`, não uma divisão de repositório.
- **Reason**: As 6 features são fatias verticais (AD-001) e cada uma tem superfície de back-end e de front-end. Separar por app mantém build e deploy independentes; organizar por feature dentro de cada app preserva o recorte de domínio de ponta a ponta e evita uma pasta genérica de "controllers" ou "pages" que dilui o limite entre features.
- **Trade-off**: Dois `package.json`, tooling duplicado (lint, tsconfig base, prettier), e os contratos de API entre `web` e `api` precisam ser tipados e versionados explicitamente. `paginas-publicas` fica quase sem back-end próprio — só um controller read-only que agrega dados das outras features.
- **Scope**: Todo o projeto; fase Design de todas as features.
- **Date**: 2026-08-30
- **Status**: active — emendada por AD-017 (2026-09-07): dentro do `api`, o código deixa de ser organizado pelos nomes das 6 features e passa a `core` / `domain/fivo` / `infra`; a separação `api` vs `web` permanece.

### AD-011
- **Decision**: O back-end (`api`) adota o meio-termo entre MVC padrão do Nest e arquitetura hexagonal. Cada feature é um módulo Nest padrão (`controller + service + module + dto`), e o `service` acessa o Prisma diretamente — sem interface de repositório, sem use-case por operação, sem mapper domínio↔persistência. As regras de negócio puras — transições de estado da campanha, cálculo da regra de doação, validação XOR instituição/causa, imutabilidade do modelo de selo, elegibilidade de instituição — vivem em funções/classes **sem decorator** em `src/domain/<feature>/`, e são chamadas pelos services. Três anéis: `src/core/` (shared kernel: `Entity`, `ValueObject`, `Either`, erros base — zero dependência externa), `src/domain/<feature>/` (regra pura, só depende de `core`), `src/infra/` (tudo que é Nest, Prisma, HTTP, storage). Erros com forma de HTTP usam exceções do Nest; erros de regra de negócio são erros de domínio puros mapeados por um exception filter. `Either` é permitido, não obrigatório.
- **Reason**: A meta declarada é longevidade e onboarding de membros do grupo que não conhecem bem o Nest, sem a cerimônia do hexagonal completo (~12–15 arquivos por feature: porta `abstract class` + implementação + mapper + use-case por operação + plumbing de `Either`). Extrair apenas as regras puras dá teste sem framework nas partes que concentram complexidade (`campanhas`, `selo-e-qrcode`, moderação) e mantém o resto idiomático, gerável por `nest g resource` e coberto por qualquer tutorial de Nest.
- **Trade-off**: O domínio não é totalmente portável — os services continuam acoplados a Nest e Prisma. A fronteira "isto é regra pura, vai para `src/domain/`" depende de disciplina do time, não é imposta pela estrutura. Mitigação: regra de lint (`dependency-cruiser` ou `no-restricted-imports`) barrando `@nestjs/*`, `@prisma/client` e `express` dentro de `src/domain/**`, e barrando todo import não-relativo (exceto `node:*`) dentro de `src/core/**`.
- **Scope**: `api`; todas as 6 features; fases Design e Execute.
- **Date**: 2026-08-30
- **Status**: superseded by AD-017 (2026-09-07) — o projeto adotou arquitetura hexagonal completa (portas `abstract class`, um caso de uso por operação, entidades ricas, repositórios em memória nos testes) num contexto único `src/domain/fivo/`. O meio-termo descrito aqui não foi adiante.

### AD-012
- **Decision**: Autenticação dos três papéis por **token opaco de sessão** (256 bits) guardado como `sha256` na tabela `sessao`, transportado em cookie httpOnly/Secure/SameSite=Lax, validado a cada request com deslize de `ultimoAcessoEm` (expira em 8 h de inatividade). Sem JWT na v1. Logout revoga a linha; troca/redefinição de senha revoga todas as linhas do usuário.
- **Reason**: A spec de `cadastro-empresa` (EMP-06/EMP-07) exige revogação imediata no logout, encerrar todas as sessões na troca de senha, expiração por inatividade e bloqueio por conta — todos triviais com estado de sessão no banco. Escala da v1 é mínima; a meta declarada é longevidade e onboarding (AD-011). JWT + refresh foi descartado por não entregar "logout imediato" de fato e por adicionar fluxo de refresh a todo cliente.
- **Trade-off**: Uma leitura indexada de `sessao` por request autenticado.
- **Scope**: Toda feature com área restrita.
- **Date**: 2026-08-30
- **Status**: active — nota (2026-09-07): `authenticate-user.ts` hoje devolve um token via porta `Encrypter`; o design de `cadastro-empresa` realinha o caso de uso para a sessão opaca em `sessao` (porta `SessaoRepository` + `SessionService` na infra). A decisão (token opaco, sem JWT) permanece.

### AD-013
- **Decision**: Identidade unificada na tabela `usuario` (credencial, `papel`, contadores de bloqueio de login) com **perfil 1–1 por papel** (`empresa` nesta feature, `instituicao` em `catalogo-instituicoes`). `usuario.email` é único **global**; `cnpj` é único **por tabela de perfil** (empresa e instituição podem coincidir em CNPJ, nunca em e-mail).
- **Reason**: Uma só implementação de login/hash/rate-limit para os três papéis (AD-008); login não-ambíguo exige e-mail global; a spec de `catalogo-instituicoes` permite empresa e instituição com o mesmo CNPJ (edge case).
- **Trade-off**: Uma pessoa que queira conta de empresa e de instituição precisa de dois e-mails; o vínculo perfil↔papel é garantido só na aplicação na v1 (sem CHECK polimórfico).
- **Scope**: `cadastro-empresa`, `catalogo-instituicoes`, painel administrativo.
- **Date**: 2026-08-30
- **Status**: active — nota (2026-09-07, AD-017): o código já tem `User` com `role` e referência de perfil (`User.empresa`), mas `CriarEmpresaUseCase` ainda não cria nem vincula o `User`; o design de `cadastro-empresa` especifica que o autocadastro cria `usuario` (papel `EMPRESA`) + `empresa` na mesma operação.

### AD-014
- **Decision**: Banco **PostgreSQL** via Prisma. `PrismaService` único em `DatabaseModule` `@Global()`; migrations versionadas em `api/prisma/migrations`; Postgres local por Docker Compose.
- **Reason**: CHECK constraints e índices únicos parciais que AD-006 pressupõe (XOR instituição/causa); suporte maduro no Prisma.
- **Trade-off**: Dependência de Docker no ambiente de desenvolvimento; setup de CI para Postgres ainda a fazer.
- **Scope**: `api`; todas as 6 features. Concretiza o "banco com CHECK" de AD-006.
- **Date**: 2026-08-30
- **Status**: active — implementação adiada (AD-017, 2026-09-07): Prisma/Postgres entram na fase de infra; até lá o domínio persiste apenas via repositórios em memória nos testes.

### AD-015
- **Decision**: A camada `infra` do `api` é organizada como **módulos transversais** (`database`, `auth`, `cryptography`, `storage`, `mail`, `arquivo`, `http` com pipes/filters globais) **+ um módulo Nest por feature** em `src/infra/<feature>/`. O `HttpModule` agregador do scaffold é dissolvido; `AppModule` importa os módulos de feature e registra `APP_GUARD`/`APP_FILTER`.
- **Reason**: AD-011 já define "módulo Nest por feature"; um barrel vazio entre `AppModule` e as features não paga o custo.
- **Trade-off**: `AppModule` cresce com um import por feature.
- **Scope**: `api`. Refina AD-010 e AD-011.
- **Date**: 2026-08-30
- **Status**: superseded by AD-017 (2026-09-07) — a camada `infra` volta aos módulos transversais do scaffold (`database`, `cryptography`, `auth`, `http`); não há módulo Nest por feature e o `HttpModule` é mantido.

### AD-016
- **Decision**: Toda gravação na tabela `arquivo` passa por `ArquivoService`: sniff de MIME por **magic bytes** (não pelo `Content-Type` do upload), validação de tamanho e dimensão, e para SVG rejeição se houver `<script>`, `<foreignObject>` ou atributo `on*`. Bytes servidos só por `GET /arquivos/:id` com `Content-Type` do registro e `X-Content-Type-Options: nosniff`.
- **Reason**: Upload de imagem é o maior vetor de XSS/spoofing da plataforma e as 4 features que usam `arquivo` tratam isso igual (AD-006).
- **Trade-off**: SVGs com script legítimo (raro) são barrados.
- **Scope**: Consumidores de `arquivo` (AD-006): `cadastro-empresa`, `catalogo-instituicoes`, `campanhas`, `selo-e-qrcode`, `transparencia-e-area-empresa`.
- **Date**: 2026-08-30
- **Status**: active — implementação adiada para a fase de infra (AD-017, 2026-09-07); a intenção (escrita de `arquivo` centralizada por um serviço, sniff por magic bytes, SVG sanitizado, entrega só por rota dedicada) permanece.

### AD-017
- **Decision**: O `api` abandona o meio-termo de AD-011 e adota **arquitetura hexagonal completa** num **único bounded context** `src/domain/fivo/`. Três anéis: `src/core/` (kernel — `Either`, `Entity`, `ValueObject`, `UniqueEntityId`, `Optional`, `UseCaseError`, erros base; ESLint barra tudo que não seja import relativo ou `node:*`), `src/domain/fivo/` (entidades ricas em `entities/`; portas `abstract class` em `application/ports/`; **um caso de uso por operação** em `application/use-cases/`; erros de aplicação com campo `status` em `application/errors/`) e `src/infra/` (Nest, adaptadores das portas, HTTP). O domínio pode importar `@nestjs/common` (apenas `@Injectable`/`@Inject`); a regra de ESLint de `src/domain/**` barra `@infra/*`, `@prisma/*`, `express` e `@nestjs/platform-express`. As entidades TypeScript são a fonte da verdade do modelo de dados (code-first). Teste de domínio: `*.spec.ts` co-locado, com repositórios em memória (`test/repositories/`), fakes de cripto (`test/cryptography/`) e factories de entidade (`test/factories/`). A persistência real (Prisma/Postgres — AD-014) e os adaptadores de infra (cripto, mail, storage, HTTP, auth) ficam para uma fase de infra posterior — o domínio já roda e é verificável apenas com os fakes.
- **Reason**: A meta é onboarding do grupo e velocidade inicial. O grupo já domina o template hexagonal padrão (portas + casos de uso + entidades + repositório em memória); mantê-lo custa menos atrito do que o desenho sob medida de AD-011, que ninguém fora do autor reconhecia. Um contexto único `fivo` — em vez dos 6 domínios de AD-001/AD-010 — elimina duplicação de kernel e de wiring entre fatias que mal existem. Adiar a infra deixa o grupo fechar todas as regras de negócio (onde estão a complexidade e a nota do trabalho) antes de gastar tempo com Docker, migrations e cookies.
- **Trade-off**: ~12–15 arquivos por operação (porta + adaptador + caso de uso + mapper + fake) — exatamente o custo que AD-011 evitava. Enquanto a infra não existe, nada roda sobre HTTP nem sobre banco: a verificação end-to-end fica represada nos testes de domínio. O contexto único `fivo` só se sustenta enquanto as features são pequenas; se cada uma crescer, a separação por domínio de AD-001 volta a fazer sentido.
- **Scope**: `api` — todas as features; fases Design e Execute. **Supersede AD-011 e AD-015.** Emenda AD-001 e AD-010 (a decomposição por feature permanece no nível de spec/design/tasks; o código do `api` fica num só contexto `src/domain/fivo/`) e AD-006 (modelo canônico agora code-first). AD-014 e AD-016 permanecem válidas em intenção, com implementação adiada.
- **Date**: 2026-09-07
- **Status**: active — nota (2026-09-07): **rich domain model**. As regras de negócio vivem nas entidades (métodos: `Empresa.aprovar/rejeitar/suspender/reativar/estaAprovada`, `User.registrarFalhaDeLogin/estaBloqueado/registrarLoginOk`) e em value objects que validam na construção (`Cnpj.create`, `Senha.criar`) ou factories (`Arquivo.criar` — validação por `tipo`). Nenhuma regra pura solta em `application/`; o caso de uso só carrega → chama método/factory → persiste. Regra que cruza registros (unicidade de CNPJ/e-mail) fica no caso de uso. Entidades sem setter público para campo governado por invariante. `design.md` §Components e `tasks.md` T1–T13 refletem isso.
