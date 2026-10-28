# API — Fivo · Selo Isso Importa

API da plataforma que permite a empresas associarem uma ação social à venda de seus produtos, com transparência para o consumidor. Contexto do produto em [`../docs/proposta-inicial.md`](../docs/proposta-inicial.md).

Estado atual: feature **cadastro-empresa** implementada e validada (cadastro, autenticação por sessão, moderação pelo admin, troca de e-mail, recuperação de senha e upload de arquivos). Feature **catalogo-instituicoes** implementada no recorte P1 (autocadastro da instituição com documento de validação, fila e decisões do admin, curadoria de causas, catálogo de beneficiadas para a empresa). Feature **campanhas** implementada no recorte P1 do `api` (rascunho, submissão, fila e decisões do admin, alteração de campanha aprovada e consulta pública); encerramento e duplicação ficam para depois. As demais features (selo e QR Code, páginas públicas, transparência) ainda serão construídas — ver [`.specs/STATE.md`](.specs/STATE.md).

## Stack

- Node.js 22+ (desenvolvido em 24) e npm
- [NestJS 11](https://nestjs.com/) sobre Express
- PostgreSQL 16 via [Prisma 6](https://www.prisma.io/)
- [Zod](https://zod.dev/) para validação, [argon2](https://github.com/ranisalt/node-argon2) para senhas
- Jest + Supertest para testes; Swagger/OpenAPI para documentação

## Começando

Todos os comandos rodam dentro de `api/`.

```bash
# 1. Dependências (o postinstall já roda `prisma generate`)
npm install

# 2. Variáveis de ambiente
cp .env.example .env

# 3. Postgres descartável (porta 5433, dados em tmpfs — somem ao derrubar o container)
docker compose -f docker-compose.test.yml up -d

# 4. Schema do banco
npx prisma migrate deploy

# 5. Subir a API com reload
npm run start:dev
```

A API sobe em `http://localhost:3000` (mude com `PORT`). Fora de produção, a documentação interativa fica em `http://localhost:3000/docs` e o JSON em `/docs/openapi.json`.

Ao subir, o administrador definido em `ADMIN_*` é criado se ainda não existir. Use-o para entrar em `POST /sessoes`, moderar empresas e instituições e manter as causas.

> **Crie as causas antes de divulgar o autocadastro de instituições.** O banco novo não tem nenhuma causa e não há seed automático. Sem causa ativa, todo `POST /instituicoes` responde 422 ("Causa inválida ou inativa"). O admin cria as causas em `POST /admin/causas`; o formulário de cadastro lê as ativas em `GET /causas`.

> O banco do compose é volátil: ao reiniciar o container, rode `npx prisma migrate deploy` de novo.

## Variáveis de ambiente

Os scripts `start*` carregam o `.env` via `--env-file`. Referência completa em [`.env.example`](.env.example).

| Variável          | Padrão                 | Descrição                                                                   |
| ----------------- | ---------------------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`    | —                      | Conexão Postgres (obrigatória). O exemplo aponta para o compose de teste.   |
| `STORAGE_DIR`     | `./tmp/storage`        | Diretório dos arquivos enviados (logos, documentos de validação), em disco local. |
| `ADMIN_EMAIL`     | —                      | E-mail do admin criado no boot. Sem ele (ou sem senha), o seed é ignorado.  |
| `ADMIN_SENHA`     | —                      | Senha do admin. **Troque em qualquer ambiente compartilhado.**              |
| `ADMIN_NOME`      | `Administrador Fivo`   | Nome do admin.                                                              |
| `COOKIE_SECURE`   | `true` em produção     | Liga a flag `Secure` do cookie de sessão.                                   |
| `SWAGGER_ENABLED` | `false`                | Em produção, serve `/docs` quando `true`. Fora dela, sempre servido.        |
| `PORT`            | `3000`                 | Porta HTTP.                                                                 |

## Scripts

| Comando                  | O que faz                                                          |
| ------------------------ | ------------------------------------------------------------------ |
| `npm run start:dev`      | Sobe em modo watch                                                 |
| `npm run start:debug`    | Watch com inspector                                                |
| `npm run build`          | `prisma generate` + compila para `dist/`                           |
| `npm run start:prod`     | Roda o build (`node dist/infra/main`; exige variáveis já no ambiente) |
| `npm test`               | Testes unitários (`*.spec.ts`), sem banco                          |
| `npm run test:e2e`       | Testes HTTP (`test/**/*.e2e-spec.ts`), **exigem o Postgres de teste no ar e migrado** |
| `npm run test:cov`       | Cobertura dos testes unitários                                     |
| `npm run lint`           | ESLint com `--fix`                                                 |
| `npm run format`         | Prettier                                                           |
| `npm run openapi:export` | Regenera [`openapi.json`](openapi.json) sem abrir banco            |

Antes de abrir PR: `npm run lint && npm test && npm run test:e2e`. Se mudou rota, DTO ou resposta, rode também `npm run openapi:export` e commite o `openapi.json` — há testes de paridade que falham se ele ficar defasado.

## Arquitetura

Camadas com dependência apontando para dentro (`infra → domain → core`). Os aliases de path estão no `tsconfig.json`: `@core/*`, `@domain/*`, `@infra/*`, `@test/*`.

```
src/
├── core/                    # Base compartilhada, sem framework
│   ├── errors/              #   erros de domínio
│   └── types/
├── domain/fivo/             # Regras de negócio (sem Nest, sem Prisma), fatiadas por feature
│   ├── shared/              #   cnpj, arquivo, portas transversais (mailer, storage, unit-of-work, auditoria)
│   ├── identidade/          #   usuário, senha, sessão, recuperação de senha
│   ├── empresas/            #   cadastro, edição e moderação de empresa
│   ├── catalogo/            #   instituições, causas e beneficiadas
│   └── campanhas/           #   campanhas, compromissos e alterações
│       ├── entities/        #     entidades — fonte da verdade do modelo (AD-017)
│       ├── ports/           #     contratos (repositórios, criptografia, ...)
│       ├── use-cases/       #     um caso de uso por arquivo, com .spec.ts ao lado
│       ├── errors/
│       └── index.ts         #     API pública da fatia
└── infra/                   # Adaptadores e framework
    ├── main.ts              #   bootstrap
    ├── app.module.ts
    ├── http/                #   pipes, filtro de exceções e esquema OpenAPI
    │   └── <fatia>/         #   controllers, DTOs (Zod) e presenters de cada fatia
    ├── auth/                #   sessão por cookie, guards, decorators (@Public, @Roles, @CurrentUser)
    ├── database/prisma/     #   PrismaService, repositórios e mappers
    ├── cryptography/        #   hash de senha (argon2)
    ├── storage/             #   LocalDiskStorage
    ├── arquivo/             #   upload e validação de arquivos
    └── mail/                #   envio de e-mail com fila persistente (EmailPendente)
prisma/                      # schema.prisma e migrations
test/                        # e2e (HTTP por fatia, database), factories, doubles
scripts/                     # exportar-openapi.ts
.specs/                      # specs, designs, tasks e validações por feature
```

Convenções que valem para todo código novo:

- **Regra de negócio entra em `domain/`** como caso de uso. Controllers só traduzem HTTP ↔ caso de uso; erros de domínio viram resposta HTTP no `domain-exception.filter.ts`.
- **Cada caso de uso mora na fatia da sua feature** (`domain/fivo/<fatia>/`). Dentro da fatia, imports relativos; entre fatias, só pelo `index.ts` (`@domain/fivo/<fatia>`) e só na ordem `shared ← identidade ← empresas ← catalogo ← campanhas` — o ESLint barra o resto (AD-022).
- **Casos de uso dependem de ports**, nunca de Prisma/Nest. A implementação concreta é ligada nos módulos de `infra/`.
- **Entidades TypeScript são a fonte da verdade** do modelo; o `schema.prisma` deriva delas (AD-017 em `.specs/STATE.md`).
- **Todo DTO é validado com Zod** via pipe em `infra/http/pipes/`.
- Rotas são protegidas por padrão; use `@Public()` para liberar e `@Roles(...)` para restringir por papel (`ADMIN`, `EMPRESA`, `INSTITUICAO`).
- Documente cada rota no OpenAPI (decorators em `infra/http/openapi/`).

## Endpoints

Referência viva: `/docs` (Swagger UI) ou [`openapi.json`](openapi.json). Resumo:

| Método e rota                        | Acesso   | Descrição                                   |
| ------------------------------------ | -------- | ------------------------------------------- |
| `POST /empresas`                     | público  | Cadastra empresa (fica `PENDENTE_APROVACAO`) |
| `GET /empresas/me`                   | empresa  | Dados da própria empresa                    |
| `PATCH /empresas/me`                 | empresa  | Edita dados                                 |
| `PATCH /empresas/me/email`           | empresa  | Solicita troca de e-mail                    |
| `POST /empresas/me/email/confirmacao`| público  | Confirma troca de e-mail com token          |
| `POST /sessoes`                      | público  | Login (define o cookie `fivo_sessao`)       |
| `DELETE /sessoes/atual`              | logado   | Logout                                      |
| `POST /senha/recuperacao`            | público  | Solicita recuperação de senha               |
| `POST /senha/redefinicao`            | público  | Redefine a senha com token                  |
| `GET /arquivos/:id`                  | logado   | Baixa um arquivo enviado                    |
| `GET /admin/empresas`                | admin    | Fila de aprovação                           |
| `POST /admin/empresas/:id/{aprovacao,rejeicao,suspensao,reativacao}` | admin | Moderação de empresa |
| `POST /instituicoes`                 | público  | Autocadastro de instituição, multipart com `documento` (obrigatório, PDF/JPG/PNG até 10 MB) e `logo` (opcional); fica `PENDENTE_APROVACAO` |
| `GET /causas`                        | público  | Causas ativas, em ordem alfabética          |
| `POST /admin/causas`                 | admin    | Cria causa                                  |
| `PATCH /admin/causas/:id`            | admin    | Edita nome e descrição da causa             |
| `POST /admin/causas/:id/inativacao`  | admin    | Inativa causa (409 com a lista de instituições aprovadas vinculadas, se houver) |
| `GET /admin/instituicoes`            | admin    | Fila de instituições pendentes, com o documento e o sinal de CNPJ igual ao de uma empresa |
| `POST /admin/instituicoes/:id/{aprovacao,rejeicao,suspensao,reativacao,inativacao}` | admin | Moderação de instituição (aprovação responde 503 se o documento estiver ilegível) |
| `GET /beneficiadas?busca=`           | empresa aprovada | Catálogo: instituições aprovadas e causas ativas, busca sem acento a partir de 2 caracteres |
| `POST /campanhas`                    | empresa aprovada | Cria campanha em `RASCUNHO` (só o nome é obrigatório); devolve `id` e `idPublico` |
| `GET /campanhas/:id`                 | empresa  | Detalhe da própria campanha, com motivo da última rejeição e alteração pendente |
| `PATCH /campanhas/:id`               | empresa aprovada | Edita a campanha; o efeito depende do estado (ver abaixo) |
| `PUT /campanhas/:id/capa`            | empresa aprovada | Envia ou troca a capa, multipart com `capa` (PNG/JPEG até 5 MB) |
| `POST /campanhas/:id/submissao`      | empresa aprovada | Envia o rascunho para análise; 422 lista os campos pendentes em `errors` |
| `GET /admin/campanhas/fila`          | admin    | Campanhas em análise e alterações pendentes, da submissão mais antiga para a mais recente |
| `POST /admin/campanhas/:id/{aprovacao,rejeicao}` | admin | Decide a campanha em análise (rejeição com motivo de 20+ caracteres e e-mail à empresa) |
| `POST /admin/campanhas/:id/alteracao/{aprovacao,rejeicao}` | admin | Decide a alteração pendente da campanha aprovada |
| `GET /campanhas/publicas/:idPublico` | público  | Versão aprovada de uma campanha publicada |
| `GET /campanhas/publicas/:idPublico/capa` | público | Capa de uma campanha publicada |

A autenticação é por **cookie de sessão** (`fivo_sessao`, expira após 8 h de inatividade). No Swagger UI, faça login em `POST /sessoes` e o navegador reaproveita o cookie.

O documento de validação da instituição só é baixado (`GET /arquivos/:id`) pelo admin e pela própria instituição; qualquer outro usuário recebe 403. Ele nunca sai em `GET /beneficiadas`.

### Ciclo de vida da campanha

A campanha nasce em `RASCUNHO` com só o nome. Cada campo informado é validado na hora: valores e percentual vão como string decimal (`"1.50"`), datas como `AAAA-MM-DD`, e a beneficiada é uma instituição aprovada ou uma causa ativa, nunca as duas. A submissão exige descrição, beneficiada, regra de doação e data de início, e leva a campanha a `EM_ANALISE`, quando a empresa não edita mais. O admin aprova (`APROVADA`) ou rejeita com motivo (`REJEITADA`). Uma campanha rejeitada volta a `RASCUNHO` na primeira edição, com o motivo preservado no detalhe. Campanha de outra empresa responde 404, e só empresa `APROVADA` cria, edita ou submete.

Em campanha `APROVADA`, nome, descrição, meta e capa mudam na hora. Beneficiada, regra de doação e vigência abrem uma **alteração pendente**: a campanha segue `APROVADA` com os valores anteriores até o admin decidir a alteração pela fila, e só cabe uma pendente por vez (a segunda responde 409). Toda transição e toda decisão ficam no registro de auditoria. Decisões concorrentes e edição contra decisão são resolvidas por versão: a primeira vale e a outra recebe 409.

A **consulta pública** pelo `idPublico` responde só a campanha `APROVADA` de empresa `APROVADA`, com os valores aprovados e a situação (`NAO_INICIADA` ou `EM_ANDAMENTO`). Rascunho, análise, rejeição, empresa suspensa e identificador malformado recebem o mesmo 404. A capa só é servida nas mesmas condições.

E-mails ainda não são enviados de verdade: o transporte atual é o `LogMailer`, que escreve a mensagem no log da API. Tokens de recuperação de senha e troca de e-mail aparecem lá durante o desenvolvimento.

## Testes

- **Unitários** (`npm test`): casos de uso com repositórios em memória (`test/doubles`, `test/factories`). Rápidos e sem infraestrutura.
- **E2E** (`npm run test:e2e`): sobem a app Nest completa contra o Postgres de teste, rodando em série (`maxWorkers: 1`). Suba o compose e aplique as migrations antes. O `DATABASE_URL` vem do `.env`; se ausente, cai no do compose.

Regra do projeto: testes derivam dos critérios de aceitação da spec e verificam o resultado esperado, não a implementação.

## Banco de dados

```bash
npx prisma migrate dev --name <descricao>   # cria e aplica uma migration após editar schema.prisma
npx prisma migrate deploy                    # aplica migrations existentes
npx prisma studio                            # inspeciona os dados
```

Nunca edite uma migration já commitada; crie outra.

## Fluxo de trabalho

O projeto segue desenvolvimento orientado a spec (Tech Lead's Club). Cada feature vive em `.specs/features/<feature>/` com `spec.md` (requisitos com IDs), `design.md`, `tasks.md` e `validation.md`. Decisões de projeto ficam em `.specs/STATE.md` (AD-NNN). Antes de mexer numa área, leia a spec e as decisões relacionadas.

- Uma task = um commit atômico, com a task marcada como concluída no `tasks.md`.
- Commits seguem [Conventional Commits](https://www.conventionalcommits.org/) em português, com escopo: `feat(api): ...`, `refactor(api): ...`, `test(api): ...`, `docs(specs): ...`.
- Branches: `feat/<feature>-<fase>`, `refactor/<assunto>`, `chore/<assunto>`; integração via Pull Request para `main`.
