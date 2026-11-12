# Deploy de produção: issoimporta.app

## Deploy manual (padrão)

Roda da sua máquina, por SSH/SCP. Os dados do servidor e os segredos ficam só em `deploy\.env.deploy`, que o git ignora.

```powershell
copy deploy\.env.deploy.example deploy\.env.deploy   # uma vez: preencha host, porta, usuário, chave .pem, pasta e segredos
.\deploy\deploy-manual.ps1                           # a cada deploy (-Sim pula as confirmações)
```

O [`deploy-manual.ps1`](../deploy/deploy-manual.ps1):

1. Valida a configuração. No primeiro deploy, gera a `POSTGRES_PASSWORD` e grava no `.env.deploy`. Não troque essa senha depois.
2. Empacota o **commit atual** com `git archive`. Só entram arquivos versionados, nunca `.env`, `node_modules` ou chaves. Alterações não commitadas não sobem.
3. Envia o pacote e o `.env` de produção por `scp` para `DEPLOY_DIR` (pasta `700`, `.env` `600`). O `.env` temporário local é apagado no fim.
4. No servidor, o [`remote-manual.sh`](../deploy/remote-manual.sh) faz o build das imagens lá mesmo, sem registry público, e chama o [`remote-deploy.sh`](../deploy/remote-deploy.sh): backup do banco, migrations, `up`, espera o health e volta a versão anterior se falhar. Depois roda o [`smoke.sh`](../deploy/smoke.sh) em `127.0.0.1` e guarda os 3 últimos releases e imagens.
5. Confere `https://issoimporta.app/api/health`. Só avisa, sem falhar, se o DNS, o nginx ou o certificado ainda não estiverem prontos.

Pré-requisitos no servidor: Docker com o plugin compose, `curl`, o usuário SSH no grupo `docker` com permissão de escrita em `DEPLOY_DIR`, e uns 2 GB de RAM livres para o build do Next. Os passos 1 e 2 abaixo continuam valendo. O passo 3 (secrets no GitHub) só é necessário para o deploy via Actions.

## Deploy pelo GitHub Actions (opcional)

**Actions → Deploy → Run workflow** roda o [`deploy.yml`](../.github/workflows/deploy.yml), depois de configurar os secrets do passo 3:

| Job | O que faz |
| --- | --- |
| `quality` | O mesmo [`quick-gate.yml`](../.github/workflows/quick-gate.yml) das PRs: tsc, lint, testes unitários e build do web |
| `api-e2e` | Testes HTTP da API contra um Postgres descartável (inclui `GET /health`) |
| `build` | Gera as imagens, confere que não há `.env` nelas, sobe a stack de produção no runner, roda o [`smoke.sh`](../deploy/smoke.sh) e só então publica no GHCR (`ghcr.io/llslucas/fivo-selo-sustentavel-{api,web}:sha-<commit>` e `:main`) |
| `deploy` | Por SSH: grava o `.env` no servidor, roda o [`remote-deploy.sh`](../deploy/remote-deploy.sh) (pull, backup do banco, migrations, up, espera o health; volta a versão anterior se o health falhar) |
| `smoke` | Roda o `smoke.sh` contra `https://issoimporta.app`: health, páginas, API pelo proxy, Swagger desligado, HSTS e redirecionamento HTTP→HTTPS |

```
internet ──443──▶ nginx do host ──▶ 127.0.0.1:3101 web (Next)
                                         └─/api/*──▶ api (Nest) ──▶ postgres
                                                     (rede interna do Docker, sem porta no host)
```

Não há subdomínio de API: o navegador só fala com `issoimporta.app` e o Next repassa `/api/*` para a API. Postgres e API não publicam porta no host, então não conflitam com o 5432/5433 já ocupados no servidor.

## Repositório público: o que nunca vai para o git

- Valores de secrets, `.env`, chaves SSH, IP/usuário do servidor. Os arquivos do repositório só têm **nomes** de variáveis e exemplos.
- Os logs do Actions são públicos. O workflow não imprime secrets (o GitHub também os mascara), corpo de resposta, logs da aplicação de produção nem o endereço do servidor. Para investigar uma falha em produção, entre no servidor (comandos no fim deste arquivo).
- Os secrets ficam no environment `production`, que só aceita deploy da branch `main`. Workflows de PR (inclusive de fork) não têm acesso a eles.
- As imagens no GHCR não contêm segredo: tudo chega pelo `.env` do servidor em tempo de execução. O job `build` falha se encontrar um `.env` dentro delas.

## 1. Servidor (uma vez)

Ubuntu/Debian com Docker Engine + plugin compose, nginx e certbot.

```bash
# Usuário dedicado ao deploy, com acesso ao Docker
sudo adduser --disabled-password --gecos '' deploy
sudo usermod -aG docker deploy
sudo install -d -o deploy -g deploy -m 700 /opt/issoimporta

# Chave do deploy: gere NA SUA MÁQUINA (sem senha) e autorize só a pública
#   ssh-keygen -t ed25519 -N '' -C 'github-deploy-issoimporta' -f ~/.ssh/issoimporta_deploy
sudo -u deploy install -d -m 700 /home/deploy/.ssh
sudo -u deploy tee -a /home/deploy/.ssh/authorized_keys < issoimporta_deploy.pub
sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

Escolha uma porta livre para o web (padrão **3101**, só em `127.0.0.1`): `ss -ltn | grep 3101` não deve retornar nada. Se usar outra, informe no script do passo 3 e troque no upstream do nginx.

## 2. DNS e nginx

1. No DNS de `issoimporta.app`: registros `A` (e `AAAA`, se houver IPv6) de `issoimporta.app` e `www.issoimporta.app` para o IP do servidor.
2. Fase 1, para emitir o certificado: [`deploy/nginx/issoimporta.app.bootstrap.conf.example`](../deploy/nginx/issoimporta.app.bootstrap.conf.example) (os comandos estão no topo do arquivo).
3. Fase 2, produção: [`deploy/nginx/issoimporta.app.conf.example`](../deploy/nginx/issoimporta.app.conf.example). HTTPS, `www` → domínio principal, cabeçalhos de segurança, upload até 16 MB e rate limit em login, senha e cadastro.

```bash
sudo cp issoimporta.app.conf.example /etc/nginx/sites-available/issoimporta.app.conf
sudo nginx -t && sudo systemctl reload nginx
sudo certbot renew --dry-run
```

Até o primeiro deploy, o site responde 502 (nada escutando na 3101). Isso é normal.

## 3. Secrets e variáveis no GitHub

Precisa de uma conta **admin** do repositório `llslucas/fivo-selo-sustentavel` com o `gh` autenticado. O script pergunta cada valor, envia os secrets pela stdin (sem gravar em disco) e cria o environment `production` restrito à `main`:

```powershell
./deploy/configurar-github.ps1
```

| Nome | Tipo | Valor |
| --- | --- | --- |
| `SSH_HOST` | secret | IP ou hostname do servidor |
| `SSH_PORT` | secret | Porta do SSH (ex.: `22`) |
| `SSH_USER` | secret | `deploy` |
| `SSH_PRIVATE_KEY` | secret | Conteúdo de `~/.ssh/issoimporta_deploy` (chave privada) |
| `SSH_KNOWN_HOSTS` | secret | Saída de `ssh-keyscan -p <porta> <host>`; o script mostra a impressão digital para você conferir |
| `POSTGRES_PASSWORD` | secret | Gerada pelo script (64 hex). **Não troque depois da primeira subida**: o Postgres só a aplica ao criar o volume |
| `ADMIN_EMAIL` | secret | Login do admin criado no primeiro boot |
| `ADMIN_SENHA` | secret | 10+ caracteres. Trocar depois não altera um admin já criado |
| `SMTP_USER` / `SMTP_SENHA` | secret | Login e chave SMTP do Brevo |
| `WEB_URL` | variável | `https://issoimporta.app` (base do QR Code do selo: não mude depois de imprimir selos) |
| `DEPLOY_DIR` | variável | `/opt/issoimporta` |
| `WEB_PORT` | variável | `3101` |
| `POSTGRES_USER` / `POSTGRES_DB` | variável | `fivo` |
| `ADMIN_NOME` | variável | `Administrador Fivo` |
| `SMTP_HOST` / `SMTP_PORT` | variável | `smtp-relay.brevo.com` / `587` |
| `EMAIL_REMETENTE` | variável | `Isso Importa <nao-responda@issoimporta.app>` (domínio verificado no Brevo, com SPF e DKIM) |

Nenhum valor pode ter aspas simples ou quebra de linha (o workflow recusa).

## 4. Primeiro deploy

Faça merge de `homologacao` em `main` (ou rode o workflow manualmente) e acompanhe em **Actions → Deploy**. Depois de verde:

```bash
curl -s https://issoimporta.app/api/health        # {"status":"ok"}
```

O banco começa vazio. Entre como admin e cadastre ao menos uma causa (`/admin/causas`) antes de abrir o cadastro de instituições.

## Operação no servidor

Use o atalho `dc.sh` da pasta do deploy. Ele já passa as imagens em uso (`.versao-no-ar`); um `docker compose` puro falha com "required variable API_IMAGE is missing".

```bash
cd /opt/issoimporta                                  # ou o DEPLOY_DIR configurado
./dc.sh ps
./dc.sh logs --tail 200 api web migrate
./dc.sh exec api npm run seed:demo                   # dados de demonstração (defina SEED_SENHA com -e)
cat .versao-no-ar                                    # imagens em produção

# Backup manual (o deploy já faz um antes de cada migration, guarda os 10 últimos em backups/)
docker compose -f docker-compose.prod.yml exec -T postgres \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > backups/manual-$(date +%F).dump

# Arquivos enviados (logos, capas, documentos) ficam no volume issoimporta_storage:
# inclua-o no backup junto com o banco.
```

- **Rollback**: rode o workflow manualmente a partir de um commit anterior, ou no servidor `API_IMAGE=... WEB_IMAGE=... docker compose -f docker-compose.prod.yml up -d` com as tags `sha-...` desejadas. As migrations não são revertidas.
- **Nunca** rode `docker compose down -v` em produção: apaga o banco e os arquivos.
- As imagens são `linux/amd64`. Se o servidor for ARM, ajuste `platforms` no `deploy.yml`.
