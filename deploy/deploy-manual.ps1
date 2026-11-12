<#
.SYNOPSIS
  Deploy manual de producao (issoimporta.app) por SSH/SCP.

.DESCRIPTION
  1. Le deploy\.env.deploy (fora do git): dados do servidor e segredos.
  2. Empacota o commit atual com `git archive` (so arquivos versionados:
     nada de .env, node_modules ou chave vai junto).
  3. Envia o pacote e o .env de producao para o servidor por scp
     (pasta chmod 700, .env chmod 600).
  4. No servidor: build das imagens (nada vai para registry publico),
     backup do banco, migrations, sobe a stack, espera o health e volta a
     versao anterior se falhar. Depois roda o smoke test.

.EXAMPLE
  .\deploy\deploy-manual.ps1
  .\deploy\deploy-manual.ps1 -Sim
  .\deploy\deploy-manual.ps1 -Config C:\seguro\issoimporta.env
#>
[CmdletBinding()]
param(
  [string] $Config = '',
  [switch] $Sim
)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
if (-not $Config) { $Config = Join-Path $PSScriptRoot '.env.deploy' }

function Falhar([string] $mensagem) {
  Write-Host "ERRO: $mensagem" -ForegroundColor Red
  exit 1
}
function Passo([string] $mensagem) { Write-Host "`n==> $mensagem" -ForegroundColor Cyan }
function Confirmar([string] $pergunta) {
  if ($Sim) { return }
  if ((Read-Host "$pergunta (s/N)") -notmatch '^[sS]') { Falhar 'cancelado' }
}

# --- Configuracao -----------------------------------------------------------
if (-not (Test-Path -LiteralPath $Config)) {
  Falhar "$Config nao existe. Rode: copy deploy\.env.deploy.example deploy\.env.deploy e preencha."
}

$cfg = @{}
foreach ($linha in Get-Content -LiteralPath $Config -Encoding UTF8) {
  $l = $linha.Trim()
  if (-not $l -or $l.StartsWith('#')) { continue }
  $i = $l.IndexOf('=')
  if ($i -lt 1) { continue }
  $chave = $l.Substring(0, $i).Trim()
  $valor = $l.Substring($i + 1).Trim()
  if ($valor.Length -ge 2 -and (($valor.StartsWith('"') -and $valor.EndsWith('"')) -or
      ($valor.StartsWith("'") -and $valor.EndsWith("'")))) {
    $valor = $valor.Substring(1, $valor.Length - 2)
  }
  $cfg[$chave] = $valor
}

function Valor([string] $chave, [string] $padrao = '') {
  if ($cfg.ContainsKey($chave) -and $cfg[$chave] -ne '') { return $cfg[$chave] }
  return $padrao
}

$sshHost = Valor 'SSH_HOST'
$sshPort = Valor 'SSH_PORT' '22'
$sshUser = Valor 'SSH_USER'
$sshKey = Valor 'SSH_KEY'
$deployDir = (Valor 'DEPLOY_DIR' '/opt/issoimporta').TrimEnd('/')

$app = [ordered]@{
  POSTGRES_USER     = Valor 'POSTGRES_USER' 'fivo'
  POSTGRES_PASSWORD = Valor 'POSTGRES_PASSWORD'
  POSTGRES_DB       = Valor 'POSTGRES_DB' 'fivo'
  WEB_URL           = (Valor 'WEB_URL' 'https://issoimporta.app').TrimEnd('/')
  WEB_PORT          = Valor 'WEB_PORT' '3101'
  ADMIN_EMAIL       = Valor 'ADMIN_EMAIL'
  ADMIN_SENHA       = Valor 'ADMIN_SENHA'
  ADMIN_NOME        = Valor 'ADMIN_NOME' 'Administrador Fivo'
  SMTP_HOST         = Valor 'SMTP_HOST' 'smtp-relay.brevo.com'
  SMTP_PORT         = Valor 'SMTP_PORT' '587'
  SMTP_USER         = Valor 'SMTP_USER'
  SMTP_SENHA        = Valor 'SMTP_SENHA'
  EMAIL_REMETENTE   = Valor 'EMAIL_REMETENTE'
  COOKIE_SECURE     = 'true'
  SWAGGER_ENABLED   = 'false'
}

$faltando = @()
foreach ($nome in 'SSH_HOST', 'SSH_USER', 'SSH_KEY') { if (-not (Valor $nome)) { $faltando += $nome } }
foreach ($nome in 'ADMIN_EMAIL', 'ADMIN_SENHA', 'SMTP_HOST', 'EMAIL_REMETENTE') {
  if (-not $app[$nome]) { $faltando += $nome }
}
if ($faltando.Count) { Falhar "preencha em ${Config}: $($faltando -join ', ')" }

if ($sshHost -notmatch '^[A-Za-z0-9.:-]+$') { Falhar 'SSH_HOST invalido' }
if ($sshUser -notmatch '^[A-Za-z_][A-Za-z0-9_.-]*$') { Falhar 'SSH_USER invalido' }
if ($sshPort -notmatch '^[0-9]{1,5}$') { Falhar 'SSH_PORT invalida' }
if ($app.WEB_PORT -notmatch '^[0-9]{2,5}$') { Falhar 'WEB_PORT invalida' }
if ($deployDir -notmatch '^/[A-Za-z0-9._/-]+$') { Falhar 'DEPLOY_DIR invalido (caminho absoluto, sem espacos)' }
if (-not (Test-Path -LiteralPath $sshKey)) { Falhar "chave SSH nao encontrada: $sshKey" }
if ($app.ADMIN_SENHA.Length -lt 10) { Falhar 'ADMIN_SENHA precisa de 10+ caracteres' }
if ($app.WEB_URL -notmatch '^https://') {
  Write-Host 'AVISO: WEB_URL nao e https. O cookie de sessao e Secure: o login so funciona por HTTPS.' -ForegroundColor Yellow
}
if (-not $app.SMTP_USER -or -not $app.SMTP_SENHA) {
  Write-Host 'AVISO: SMTP_USER/SMTP_SENHA vazios. O Brevo exige os dois.' -ForegroundColor Yellow
}

# Senha do Postgres: gerada uma vez e gravada no arquivo de configuracao.
if (-not $app.POSTGRES_PASSWORD) {
  Write-Host 'POSTGRES_PASSWORD vazia: gerando uma e gravando em .env.deploy.' -ForegroundColor Yellow
  Write-Host 'Se o banco JA existe no servidor, cancele e coloque a senha antiga.' -ForegroundColor Yellow
  Confirmar 'Gerar nova senha do Postgres?'
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $app.POSTGRES_PASSWORD = -join ($bytes | ForEach-Object { $_.ToString('x2') })
  $conteudo = [IO.File]::ReadAllText($Config)
  $padrao = '(?m)^[ \t]*POSTGRES_PASSWORD[ \t]*=.*$'
  if ($conteudo -match $padrao) {
    $conteudo = [regex]::Replace($conteudo, $padrao, "POSTGRES_PASSWORD=$($app.POSTGRES_PASSWORD)")
  } else {
    $conteudo = $conteudo.TrimEnd() + "`nPOSTGRES_PASSWORD=$($app.POSTGRES_PASSWORD)`n"
  }
  [IO.File]::WriteAllText($Config, $conteudo, (New-Object System.Text.UTF8Encoding $false))
}
if ($app.POSTGRES_PASSWORD -notmatch '^[A-Za-z0-9._~-]{16,}$') {
  Falhar 'POSTGRES_PASSWORD precisa ter 16+ caracteres de [A-Za-z0-9._~-] (entra na URL do banco)'
}
foreach ($nome in @($app.Keys)) {
  if ($app[$nome] -match "['`r`n]") { Falhar "$nome nao pode ter aspas simples nem quebra de linha" }
}

# --- Ferramentas e codigo ---------------------------------------------------
foreach ($cmd in 'git', 'ssh', 'scp') {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { Falhar "$cmd nao encontrado no PATH" }
}

$sha = (& git -C $raiz rev-parse --short=12 HEAD).Trim()
if ($LASTEXITCODE -ne 0) { Falhar 'nao foi possivel ler o commit atual' }
$branch = (& git -C $raiz rev-parse --abbrev-ref HEAD).Trim()
$alterados = & git -C $raiz status --porcelain --untracked-files=no
$tag = (Get-Date).ToUniversalTime().ToString('yyyyMMddHHmmss') + "-$sha"

Write-Host ''
Write-Host "Servidor : $sshUser@${sshHost}:$sshPort"
Write-Host "Pasta    : $deployDir"
Write-Host "Codigo   : $branch @ $sha (release $tag)"
Write-Host "Site     : $($app.WEB_URL)  (web em 127.0.0.1:$($app.WEB_PORT) no servidor)"
if ($alterados) {
  Write-Host 'AVISO: ha alteracoes nao commitadas. So o que esta commitado sobe.' -ForegroundColor Yellow
}
Confirmar 'Fazer o deploy?'

$sshOpts = @('-i', $sshKey, '-p', $sshPort, '-o', 'IdentitiesOnly=yes',
  '-o', 'StrictHostKeyChecking=accept-new', '-o', 'ConnectTimeout=20',
  '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=8', '-o', 'LogLevel=ERROR')
$scpOpts = @('-q', '-i', $sshKey, '-P', $sshPort, '-o', 'IdentitiesOnly=yes',
  '-o', 'StrictHostKeyChecking=accept-new', '-o', 'ConnectTimeout=20', '-o', 'LogLevel=ERROR')
$destino = "$sshUser@$sshHost"

function Remoto([string] $comando) {
  # Out-Host: a saida do servidor vai para a tela, e a funcao devolve so o
  # codigo de saida (sem isso, o texto entraria no valor de retorno).
  # Base64: o Windows PowerShell 5.1 remove aspas duplas dos argumentos de
  # programas nativos; codificado, o comando chega intacto ao bash.
  $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($comando))
  & ssh @sshOpts $destino "echo $b64 | base64 -d | bash" | Out-Host
  return [int] $LASTEXITCODE
}
function Enviar([string] $local, [string] $remoto) {
  & scp @scpOpts $local "${destino}:$remoto"
  if ($LASTEXITCODE -ne 0) { Falhar "scp falhou: $local" }
}

$tmp = Join-Path $env:TEMP "issoimporta-deploy-$tag"
New-Item -ItemType Directory -Path $tmp -Force | Out-Null

try {
  Passo 'Testando SSH e Docker no servidor'
  if ((Remoto 'echo ssh ok') -ne 0) {
    Write-Host 'Dicas:' -ForegroundColor Yellow
    Write-Host '  - confira SSH_HOST, SSH_PORT, SSH_USER e SSH_KEY'
    Write-Host '  - chave "UNPROTECTED": icacls "<chave.pem>" /inheritance:r /grant:r "$($env:USERNAME):R"'
    Falhar 'nao foi possivel conectar por SSH'
  }
  $diagnostico = 'command -v docker >/dev/null || { echo "docker nao instalado"; exit 11; }; ' +
    'docker info >/dev/null 2>&1 || { echo "usuario $(whoami) sem acesso ao docker (fora do grupo docker?)"; exit 12; }; ' +
    'docker compose version >/dev/null 2>&1 || { echo "plugin docker compose (v2) ausente"; exit 13; }; ' +
    'command -v curl >/dev/null || echo "aviso: curl ausente (smoke test sera pulado)"; ' +
    'echo "docker ok: $(docker compose version --short)"'
  $codigo = Remoto $diagnostico
  switch ($codigo) {
    0 { }
    12 {
      Write-Host "  No servidor: sudo usermod -aG docker $sshUser   (depois saia e entre de novo)" -ForegroundColor Yellow
      Falhar 'usuario sem permissao no docker'
    }
    13 {
      Write-Host '  No servidor (Ubuntu): sudo apt-get install -y docker-compose-plugin' -ForegroundColor Yellow
      Falhar 'docker compose v2 ausente'
    }
    default { Falhar 'docker indisponivel no servidor' }
  }

  Passo 'Empacotando o codigo (git archive)'
  $pacote = Join-Path $tmp "$tag.tar.gz"
  & git -C $raiz archive --format=tar.gz -o $pacote HEAD api web deploy
  if ($LASTEXITCODE -ne 0) { Falhar 'git archive falhou' }
  Write-Host ('  {0:N1} MB' -f ((Get-Item $pacote).Length / 1MB))

  # .env de producao: LF e aspas simples (o compose le literal).
  $envArquivo = Join-Path $tmp 'prod.env'
  $linhas = foreach ($nome in $app.Keys) { "$nome='$($app[$nome])'" }
  [IO.File]::WriteAllText($envArquivo, (($linhas -join "`n") + "`n"), (New-Object System.Text.UTF8Encoding $false))

  Passo 'Preparando a pasta no servidor'
  if ((Remoto "umask 077; mkdir -p $deployDir/releases && chmod 700 $deployDir") -ne 0) {
    Falhar "sem permissao em $deployDir. No servidor: sudo install -d -o $sshUser -g $sshUser -m 700 $deployDir"
  }

  Passo 'Enviando pacote e .env (scp)'
  Enviar $pacote "$deployDir/releases/$tag.tar.gz"
  Enviar $envArquivo "$deployDir/.env.novo"
  if ((Remoto "chmod 600 $deployDir/.env.novo && mv -f $deployDir/.env.novo $deployDir/.env") -ne 0) {
    Falhar 'nao foi possivel gravar o .env no servidor'
  }
  Remove-Item -LiteralPath $envArquivo -Force

  Passo 'Build e deploy no servidor (pode levar varios minutos)'
  $comando = "set -e; mkdir -p $deployDir/releases/$tag; " +
    "tar -xzf $deployDir/releases/$tag.tar.gz -C $deployDir/releases/$tag; " +
    "rm -f $deployDir/releases/$tag.tar.gz; " +
    "bash $deployDir/releases/$tag/deploy/remote-manual.sh $deployDir $tag"
  if ((Remoto $comando) -ne 0) {
    Falhar 'deploy ou smoke test falhou no servidor (veja a saida acima). Se o health falhou, a versao anterior foi restaurada.'
  }

  Passo "Conferindo $($app.WEB_URL)/api/health"
  try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $resposta = Invoke-WebRequest -UseBasicParsing -TimeoutSec 20 "$($app.WEB_URL)/api/health"
    Write-Host "  $($resposta.StatusCode) $($resposta.Content)" -ForegroundColor Green
  } catch {
    Write-Host '  Site publico ainda nao responde (DNS, nginx ou certificado?). A stack no servidor esta no ar.' -ForegroundColor Yellow
  }

  Write-Host "`nDeploy ok: $tag" -ForegroundColor Green
} finally {
  # O .env temporario tem segredos: nunca fica no disco.
  Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
