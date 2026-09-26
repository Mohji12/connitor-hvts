<#
.SYNOPSIS
  Log the Vercel CLI into the same account as the dashboard (dittomohan22 / GitHub).

.EXAMPLE
  .\scripts\deploy\vercel-cli-login.ps1
  .\scripts\deploy\vercel-cli-login.ps1 -VerificationCode "abcd-1234"
  $env:VERCEL_TOKEN = "..."; .\scripts\deploy\vercel-cli-login.ps1 -UseToken
#>
[CmdletBinding()]
param(
  [string]$VerificationCode = '',
  [switch]$UseToken
)

$ErrorActionPreference = 'Stop'

if ($UseToken) {
  if (-not $env:VERCEL_TOKEN) {
    throw 'Set VERCEL_TOKEN first (create at https://vercel.com/account/tokens), then re-run with -UseToken'
  }
  vercel whoami -t $env:VERCEL_TOKEN
  Write-Host "VERCEL_TOKEN is valid. Use: vercel deploy --prod --cwd frontend --token (from env)" -ForegroundColor Green
  exit 0
}

$url = 'https://vercel.com/api/registration/login-with-github?mode=login&next=https%3A%2F%2Fvercel.com%2Fnotifications%2Fcli-login-oob'
Write-Host "Opening Vercel GitHub login in your browser..." -ForegroundColor Cyan
Start-Process $url

if (-not $VerificationCode) {
  $VerificationCode = Read-Host 'Paste the verification code shown in the browser after you approve login'
}

if (-not $VerificationCode) {
  throw 'Verification code is required'
}

$VerificationCode | vercel login --github --oob
if ($LASTEXITCODE -ne 0) { throw "vercel login failed (exit $LASTEXITCODE)" }

vercel whoami
Write-Host "CLI login OK. Next: cd frontend; vercel link; vercel deploy --prod" -ForegroundColor Green
