# Fivo · Selo Isso Importa

Plataforma web em que empresas associam uma ação social à venda dos seus produtos. A empresa cria uma campanha ("a cada unidade vendida, R$ 1,00 vai para a instituição X"), a Fivo Lab aprova, e a empresa baixa um selo com QR Code para aplicar na embalagem. O consumidor lê o QR e chega a uma página pública com a empresa, a campanha, a beneficiada e a regra de doação.

A plataforma não intermedeia dinheiro: a empresa doa direto à instituição. Contexto completo do produto em [`docs/proposta-inicial.md`](docs/proposta-inicial.md).

## Perfis de usuário

| Perfil          | O que faz                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------- |
| **Empresa**     | Se cadastra, cria e edita campanhas, escolhe a beneficiada e baixa o selo da campanha aprovada |
| **Instituição** | Faz autocadastro com documento de validação e acompanha a própria aprovação                   |
| **Admin** (Fivo Lab) | Modera empresas, instituições e campanhas e mantém o catálogo de causas                  |
| **Consumidor**  | Acessa sem cadastro a vitrine de parceiros e a página pública de cada empresa                 |

Todo conteúdo público passa antes pela aprovação do admin (empresa, instituição e campanha).

## Funcionalidades

- **Cadastro de empresa**: cadastro, login por sessão, moderação, troca de e-mail, recuperação de senha e upload de logo.
- **Catálogo de instituições**: autocadastro com documento, fila de aprovação, curadoria de causas e catálogo de beneficiadas para a empresa.
- **Campanhas**: rascunho, submissão, fila do admin, aprovação ou rejeição com motivo, e alteração de campanha aprovada (beneficiada, regra de doação e vigência passam por nova análise).
- **Vitrine e selo**: slug permanente de empresa e campanha, selo SVG com QR Code, página pública `/empresa/{slugEmpresa}` com as campanhas aprovadas, e vitrine `/parceiros`.

Fora da v1: pagamento e monetização do selo, comprovantes de doação, geração de selo por IA, encerramento e duplicação de campanha. O histórico dessas decisões está em [`api/.specs/STATE.md`](api/.specs/STATE.md).

## Estrutura do repositório

```
.
├── api/        # Backend — NestJS 11, Prisma 6, PostgreSQL 16
├── web/        # Frontend — Next.js 16, React 19, MUI 9
├── docs/       # Proposta do produto e levantamento de issues
├── .github/    # CI (quick gate em toda PR)
└── .kiro/      # Specs do frontend
```

Cada subprojeto tem seu próprio `package.json`, `node_modules` e README:

- [`api/README.md`](api/README.md): variáveis de ambiente, scripts, arquitetura em camadas, endpoints e banco.
- [`web/README.md`](web/README.md): scripts e testes do frontend.

## Rodando localmente

Pré-requisitos: Node.js 22+ (o CI usa 24), npm e Docker.

### 1. API (porta 3000)

```bash
cd api
npm install                                        # o postinstall roda `prisma generate`
cp .env.example .env
docker compose -f docker-compose.test.yml up -d    # Postgres na porta 5433, dados voláteis
npx prisma migrate deploy
npm run start:dev
```

No primeiro boot, a API cria o admin definido em `ADMIN_EMAIL` / `ADMIN_SENHA`. A documentação interativa fica em `http://localhost:3000/docs`.

> O banco começa sem causas. Entre como admin e crie ao menos uma em `POST /admin/causas` antes de cadastrar instituições, senão o cadastro responde 422.

### 2. Web (porta 3001)

```bash
cd web
npm install
cp .env.example .env
npm run dev
```

Abra `http://localhost:3001`. O Next faz proxy de `/api/*` para a `API_URL` do `.env`, então o navegador só fala com a própria origem e a API não precisa de CORS.

As duas pontas se referenciam: `API_URL` no `web` aponta para a API, e `WEB_URL` na `api` é a base do link gravado no QR Code do selo (obrigatória em produção).

## Testes e qualidade

| Onde  | Comando              | O que roda                                               |
| ----- | -------------------- | -------------------------------------------------------- |
| `api` | `npm test`           | Testes unitários dos casos de uso, sem banco             |
| `api` | `npm run test:e2e`   | Testes HTTP contra o Postgres do compose (suba e migre antes) |
| `api` | `npm run lint`       | ESLint, inclusive a regra de dependência entre fatias do domínio |
| `web` | `npm test`           | Vitest, com toda chamada HTTP mockada                    |
| `web` | `npm run lint`       | ESLint                                                   |
| `web` | `npm run build`      | Build de produção, que também faz o type-check           |

O workflow [`quick-gate.yml`](.github/workflows/quick-gate.yml) roda em toda PR: type-check, lint e testes unitários da `api`, e lint, testes e build do `web`. Os e2e da `api` rodam localmente.

Se mudar rota, DTO ou resposta da API, rode `npm run openapi:export` em `api/` e commite o `openapi.json`: há testes de paridade que falham quando ele fica defasado.

## Deploy

São três peças: o Postgres, a API e o web. Em produção, só o web precisa ficar exposto, porque o navegador chega à API pelo proxy `/api/*` do Next.

```
navegador ──HTTPS──▶ web (Next, :3001) ──/api/*──▶ api (Nest, :3000) ──▶ PostgreSQL 16
                                                          └──▶ disco persistente (STORAGE_DIR)
```

### Variáveis de produção

**API** (`api/`). O `npm run start:prod` não lê o `.env`: as variáveis têm que estar no ambiente do processo.

| Variável          | Obrigatória | Observação                                                                                      |
| ----------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| `NODE_ENV`        | sim         | `production`. Liga o cookie `Secure`, desliga o Swagger e passa a exigir `WEB_URL` e `SMTP_HOST`. |
| `DATABASE_URL`    | sim         | Postgres de produção.                                                                            |
| `WEB_URL`         | sim         | URL pública do web, sem barra no final (ex.: `https://selo.fivo.com.br`). Sem ela, a API não sobe. |
| `STORAGE_DIR`     | sim         | Caminho num **volume persistente**. Guarda logos, capas e documentos de validação.              |
| `ADMIN_EMAIL`     | sim         | Admin criado no primeiro boot, se ainda não existir.                                            |
| `ADMIN_SENHA`     | sim         | Senha forte e exclusiva de produção.                                                             |
| `ADMIN_NOME`      | não         | Padrão `Administrador Fivo`.                                                                    |
| `PORT`            | não         | Padrão `3000`.                                                                                   |
| `COOKIE_SECURE`   | não         | Já é `true` em produção. Só desligue se o site não for servido por HTTPS, e nesse caso o login não funciona como esperado. |
| `SWAGGER_ENABLED` | não         | `true` serve `/docs` em produção. Deixe desligado em ambiente público.                          |
| `SMTP_HOST`       | sim         | Servidor SMTP (Brevo: `smtp-relay.brevo.com`). Sem ele, a API não sobe em produção.             |
| `SMTP_PORT`       | não         | Padrão `587` (STARTTLS). Com `465`, usa TLS direto.                                             |
| `SMTP_USER` / `SMTP_SENHA` | sim, no Brevo | Login SMTP e chave SMTP do painel do provedor.                                      |
| `EMAIL_REMETENTE` | sim         | Ex.: `Fivo <nao-responda@fivo.com.br>`. Precisa ser um remetente verificado no provedor.        |

**Web** (`web/`):

| Variável  | Obrigatória | Observação                                                                                      |
| --------- | ----------- | ----------------------------------------------------------------------------------------------- |
| `API_URL` | sim         | Endereço interno da API visto pelo servidor do Next (ex.: `http://api:3000`). Nunca chega ao navegador. Defina **já no `next build`**, porque o Next fixa os rewrites no build. |

### Com Docker

Cada subprojeto tem seu `Dockerfile` (contexto de build na própria pasta), e o [`docker-compose.yml`](docker-compose.yml) da raiz sobe a stack inteira:

```bash
cp .env.docker.example .env      # preencha senha do banco, WEB_URL, admin e SMTP
docker compose up -d --build

# Só uma vez, ao subir a vitrine numa base que já tinha dados:
docker compose run --rm migrate npm run backfill:slugs
```

- O serviço `migrate` roda `prisma migrate deploy` e termina. A API só sobe depois que ele sai com sucesso, então cada `up` aplica as migrations pendentes antes.
- Só o web publica porta (`WEB_PORT`, padrão 3001). A API e o Postgres ficam na rede interna do compose.
- Os dados ficam nos volumes `postgres-data` e `storage`, que devem entrar no backup. `docker compose down -v` apaga os dois.
- O compose não termina TLS. Ponha um proxy reverso com HTTPS (Caddy, Nginx, o balanceador da hospedagem) na frente do web. Para testar em `http://localhost`, use `COOKIE_SECURE=false`, senão o navegador descarta o cookie de sessão.
- A imagem da API mantém as devDependencies porque o CLI do Prisma e o `ts-node` (usado pelo backfill) estão nelas. O `API_URL` do web é argumento de build (`--build-arg API_URL=...`), porque o Next fixa os rewrites no build.
- Dados de demonstração (causas, empresas, instituições e campanhas fictícias em vários status, todas com a senha `Demo-Fivo-2026` ou `SEED_SENHA`): `docker compose exec api npm run seed:demo`. Precisa do admin já criado e pode rodar de novo sem duplicar.
- Para usar as imagens sem o compose: `docker build -t fivo-api ./api` e `docker build --build-arg API_URL=http://<host-da-api>:3000 -t fivo-web ./web`.

### Sem Docker

```bash
# API
cd api
npm ci                       # instala também as devDependencies (prisma CLI e ts-node)
npm run build                # gera dist/
npx prisma migrate deploy    # aplica as migrations pendentes
npm run backfill:slugs       # só uma vez, ao subir a vitrine numa base que já tinha dados
npm run start:prod           # rode a partir de api/

# Web
cd web
npm ci
API_URL=http://<host-da-api>:3000 npm run build
npm run start -- -p 3001     # sem o -p, o `next start` sobe na 3000
```

### Cuidados

- **Ordem do deploy.** Aplique as migrations antes de subir a versão nova da API. Nunca edite uma migration já aplicada: crie outra.
- **`backfill:slugs`.** Dá slug às empresas e campanhas aprovadas antes da feature vitrine-e-selo. Sem ele, essas campanhas não têm página pública nem selo. Pode rodar de novo sem efeito colateral.
- **Arquivos ficam em disco local.** Se `STORAGE_DIR` não estiver num volume persistente, logos, capas e documentos somem a cada deploy. Inclua o diretório no backup junto com o banco.
- **Escala horizontal.** Como o storage é local, várias instâncias da API só funcionam com o mesmo volume compartilhado entre elas. Por enquanto, rode uma instância.
- **E-mail.** O envio é por SMTP, testado com o Brevo em mente (plano grátis de 300 e-mails/dia). O domínio do `EMAIL_REMETENTE` precisa estar verificado no provedor, com SPF e DKIM no DNS; sem isso, os e-mails caem no spam ou são recusados. Se o SMTP falhar, os avisos sem segredo (cadastro recebido, aprovado, rejeitado e rejeições de campanha) vão para a fila `email_pendente` e são reenviados com backoff; redefinição de senha e confirmação de e-mail não entram na fila, porque levam token.
- **O QR Code impresso depende do `WEB_URL`.** O link gravado no selo é `{WEB_URL}/empresa/{slugEmpresa}/{slugCampanha}`. Mudar o domínio depois quebra os selos que já estão nas embalagens, então defina o domínio definitivo antes de liberar os downloads.
- **HTTPS.** O cookie de sessão é `Secure` e `SameSite=Lax`. Sirva o web por HTTPS e mantenha web e API na mesma origem pelo proxy, sem CORS.
- **Admin.** O seed só cria o admin se o e-mail ainda não existir. Trocar `ADMIN_SENHA` depois não altera a senha de um admin já criado.
- **`argon2` é módulo nativo.** Instale as dependências no mesmo sistema operacional e arquitetura em que a API vai rodar, sem copiar `node_modules` de outra máquina.

## Fluxo de trabalho

- **Desenvolvimento orientado a spec.** Cada feature vive em `api/.specs/features/<feature>/` com `spec.md`, `design.md`, `tasks.md` e os relatórios de validação. As decisões de projeto (AD-NNN) ficam em `api/.specs/STATE.md`. Leia a spec e as decisões relacionadas antes de mexer numa área.
- **Branches.** `feat/<feature>-<fase>`, `fix/<assunto>`, `refactor/<assunto>`, `chore/<assunto>`. As PRs entram em `homologacao`, que é promovida para `main`.
- **Commits.** [Conventional Commits](https://www.conventionalcommits.org/) em português, com escopo: `feat(api): ...`, `fix(web): ...`, `test(api): ...`, `docs(specs): ...`. Uma task da spec equivale a um commit atômico.
