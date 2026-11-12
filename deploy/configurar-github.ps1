<#
.SYNOPSIS
  Cria o environment `production`, os secrets e as variáveis do deploy
  (https://issoimporta.app) no repositório do GitHub.

.DESCRIPTION
  Precisa do GitHub CLI (`gh`) autenticado com uma conta ADMIN do repositório.
  Nenhum valor é gravado em disco nem passado como argumento de linha de
  comando: os secrets vão para o `gh` pela stdin. Nada deste script contém
  segredo, por isso ele pode ficar no repositório público.

  Por padrão, secrets que já existem são mantidos (o GitHub não deixa ler o
  valor de volta). Use -Sobrescrever para trocar. ATENÇÃO: POSTGRES_PASSWORD
  só vale na primeira subida do banco; trocar depois quebra a conexão da API
  com o volume já existente. Por isso ela nunca é sobrescrita por este script.

.EXAMPLE
  ./deploy/configurar-github.ps1
  ./deploy/configurar-github.ps1 -Repo llslucas/fivo-selo-sustentavel -Sobrescrever ADMIN_SENHA,SMTP_SENHA
#>
[CmdletBinding()]
param(
  [string] $Repo = 'llslucas/fivo-selo-sustentavel',
  [string] $Environment = 'production',
  [string[]] $Sobrescrever = @()
)

$ErrorActionPreference = 'Stop'

function Invoke-Gh {
  param([string[]] $Argumentos, [string] $Entrada)

  $info = New-Object System.Diagnostics.ProcessStartInfo
  $info.FileName = 'gh'
  $info.Arguments = ($Argumentos | ForEach-Object {
      if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
    }) -join ' '
  $info.UseShellExecute = $false
  $info.RedirectStandardInput = $true
  $info.RedirectStandardOutput = $true
  $info.RedirectStandardError = $true

  $processo = [System.Diagnostics.Process]::Start($info)
  if ($null -ne $Entrada) {
    # Sem newline no final: o valor do secret vai exatamente como digitado.
    $processo.StandardInput.Write($Entrada)
  }
  $processo.StandardInput.Close()
  $saida = $processo.StandardOutput.ReadToEnd()
  $erro = $processo.StandardError.ReadToEnd()
  $processo.WaitForExit()

  if ($processo.ExitCode -ne 0) {
    throw "gh $($Argumentos[0..1] -join ' ') falhou: $erro"
  }
  return $saida
}

function Ler-Segredo([string] $Rotulo) {
  $seguro = Read-Host -AsSecureString $Rotulo
  $ponteiro = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ponteiro) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ponteiro) }
}

function Ler-Valor([string] $Rotulo, [string] $Padrao) {
  $valor = Read-Host "$Rotulo [$Padrao]"
  if ([string]::IsNullOrWhiteSpace($valor)) { return $Padrao }
  return $valor.Trim()
}

function Gerar-Hex([int] $Bytes) {
  $buffer = New-Object byte[] $Bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buffer)
  return -join ($buffer | ForEach-Object { $_.ToString('x2') })
}

# --- Pré-requisitos ---------------------------------------------------------
Get-Command gh -ErrorAction Stop | Out-Null
$permissao = (gh repo view $Repo --json viewerPermission | ConvertFrom-Json).viewerPermission
if ($permissao -ne 'ADMIN') {
  throw "Sua conta tem permissão '$permissao' em $Repo. É preciso ADMIN para criar environment e secrets."
}

# --- Environment com deploy só a partir da main -----------------------------
Write-Host "Environment '$Environment' (deploy liberado só para a branch main)"
Invoke-Gh @('api', '-X', 'PUT', "repos/$Repo/environments/$Environment", '--input', '-') `
  '{"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}' | Out-Null
$politicas = Invoke-Gh @('api', "repos/$Repo/environments/$Environment/deployment-branch-policies") $null |
  ConvertFrom-Json
if (-not ($politicas.branch_policies | Where-Object { $_.name -eq 'main' })) {
  Invoke-Gh @('api', '-X', 'POST', "repos/$Repo/environments/$Environment/deployment-branch-policies",
    '-f', 'name=main', '-f', 'type=branch') $null | Out-Null
}

$existentes = @(
  (Invoke-Gh @('secret', 'list', '--repo', $Repo, '--env', $Environment, '--json', 'name') $null |
    ConvertFrom-Json).name
)

function Definir-Secret([string] $Nome, [scriptblock] $Obter) {
  if ($existentes -contains $Nome -and $Sobrescrever -notcontains $Nome) {
    Write-Host "  = $Nome já existe (mantido)"
    return
  }
  $valor = & $Obter
  if ([string]::IsNullOrEmpty($valor)) { throw "$Nome vazio" }
  Invoke-Gh @('secret', 'set', $Nome, '--repo', $Repo, '--env', $Environment) $valor | Out-Null
  Write-Host "  + $Nome"
}

function Definir-Variavel([string] $Nome, [string] $Valor) {
  Invoke-Gh @('variable', 'set', $Nome, '--repo', $Repo, '--env', $Environment, '--body', $Valor) $null | Out-Null
  Write-Host "  + $Nome = $Valor"
}

# --- Variáveis (não sensíveis) ----------------------------------------------
Write-Host "`nVariáveis (Enter aceita o padrão)"
$deployDir = Ler-Valor 'DEPLOY_DIR (pasta no servidor)' '/opt/issoimporta'
$webPort = Ler-Valor 'WEB_PORT (porta livre no servidor, só 127.0.0.1)' '3101'
Definir-Variavel 'WEB_URL' 'https://issoimporta.app'
Definir-Variavel 'DEPLOY_DIR' $deployDir
Definir-Variavel 'WEB_PORT' $webPort
Definir-Variavel 'POSTGRES_USER' 'fivo'
Definir-Variavel 'POSTGRES_DB' 'fivo'
Definir-Variavel 'ADMIN_NOME' (Ler-Valor 'ADMIN_NOME' 'Administrador Fivo')
Definir-Variavel 'SMTP_HOST' (Ler-Valor 'SMTP_HOST' 'smtp-relay.brevo.com')
Definir-Variavel 'SMTP_PORT' (Ler-Valor 'SMTP_PORT' '587')
Definir-Variavel 'EMAIL_REMETENTE' (Ler-Valor 'EMAIL_REMETENTE' 'Isso Importa <nao-responda@issoimporta.app>')

# --- Secrets ----------------------------------------------------------------
Write-Host "`nSecrets"
$sshHost = Ler-Valor 'SSH_HOST (IP ou hostname do servidor)' ''
$sshPort = Ler-Valor 'SSH_PORT' '22'
if (-not $sshHost) { throw 'SSH_HOST é obrigatório' }

Definir-Secret 'SSH_HOST' { $sshHost }
Definir-Secret 'SSH_PORT' { $sshPort }
Definir-Secret 'SSH_USER' { Ler-Valor 'SSH_USER (usuário do deploy, no grupo docker)' 'deploy' }
Definir-Secret 'SSH_PRIVATE_KEY' {
  $caminho = Ler-Valor 'Arquivo da chave PRIVADA do deploy (ed25519, sem senha)' "$HOME\.ssh\issoimporta_deploy"
  Get-Content -Raw -LiteralPath $caminho
}
Definir-Secret 'SSH_KNOWN_HOSTS' {
  Get-Command ssh-keyscan -ErrorAction Stop | Out-Null
  $linhas = (& ssh-keyscan -p $sshPort -t ed25519,ecdsa,rsa $sshHost 2>$null) -join "`n"
  if (-not $linhas) { throw "ssh-keyscan não obteve chaves de ${sshHost}:$sshPort" }
  Write-Host "`n  Impressões digitais recebidas do servidor:"
  $temp = New-TemporaryFile
  try {
    Set-Content -LiteralPath $temp -Value $linhas -NoNewline
    & ssh-keygen -lf $temp | ForEach-Object { Write-Host "    $_" }
  } finally { Remove-Item $temp -Force }
  Write-Host '  Confira no servidor com: ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub'
  if ((Read-Host '  As impressões batem? (s/N)') -notmatch '^[sS]') { throw 'Chave do servidor não confirmada' }
  $linhas
}

if ($existentes -contains 'POSTGRES_PASSWORD') {
  Write-Host '  = POSTGRES_PASSWORD já existe (nunca sobrescrito: o banco já foi criado com ela)'
} else {
  Invoke-Gh @('secret', 'set', 'POSTGRES_PASSWORD', '--repo', $Repo, '--env', $Environment) (Gerar-Hex 32) | Out-Null
  Write-Host '  + POSTGRES_PASSWORD (gerada aleatoriamente, 64 hex)'
}

Definir-Secret 'ADMIN_EMAIL' { Ler-Valor 'ADMIN_EMAIL (login do admin)' '' }
Definir-Secret 'ADMIN_SENHA' {
  $senha = Ler-Segredo 'ADMIN_SENHA (10+ caracteres; Enter vazio gera uma)'
  if (-not $senha) {
    $senha = Gerar-Hex 12
    Write-Host "  Senha do admin gerada (anote agora, não aparece de novo): $senha"
  }
  if ($senha.Length -lt 10) { throw 'ADMIN_SENHA precisa de 10+ caracteres' }
  $senha
}
Definir-Secret 'SMTP_USER' { Ler-Valor 'SMTP_USER (login SMTP do Brevo)' '' }
Definir-Secret 'SMTP_SENHA' { Ler-Segredo 'SMTP_SENHA (chave SMTP do Brevo)' }

Write-Host "`nPronto. Confira em https://github.com/$Repo/settings/environments"
