<#
.SYNOPSIS
  Link frontend to Vercel project coninter-main and deploy production.

.EXAMPLE
  .\scripts\deploy\vercel-link-and-deploy.ps1
#>
[CmdletBinding()]
param(
  [string]$ProjectName = 'coninter-main',
  [string]$ApiUrl = 'https://api.conninter.com'
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_common.ps1')
$root = Get-RepoRoot
$frontend = Join-Path $root 'frontend'

if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
  throw 'Install Vercel CLI: npm install -g vercel@39'
}

Push-Location $frontend
try {
  if (-not (Test-Path '.vercel\project.json')) {
    Write-Host "==> Linking to Vercel project: $ProjectName" -ForegroundColor Cyan
    vercel link --yes --project $ProjectName
  }

  $env:NEXT_PUBLIC_BACKEND_API_URL = $ApiUrl
  Write-Host "==> Production deploy (API=$ApiUrl)" -ForegroundColor Cyan
  vercel deploy --prod --yes
} finally {
  Pop-Location
}

Write-Host "Done. Check https://coninter-main.vercel.app and https://conninter.com" -ForegroundColor Green
