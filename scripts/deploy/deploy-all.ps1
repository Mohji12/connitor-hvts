<#
.SYNOPSIS
  Deploy backend (EC2) then frontend (Vercel).

.EXAMPLE
  .\scripts\deploy\deploy-all.ps1
  .\scripts\deploy\deploy-all.ps1 -FrontendOnly
  .\scripts\deploy\deploy-all.ps1 -BackendOnly
#>
[CmdletBinding()]
param(
  [switch]$FrontendOnly,
  [switch]$BackendOnly,
  [switch]$SkipFrontendBuild
)

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot

if (-not $FrontendOnly) {
  & (Join-Path $here 'deploy-backend.ps1')
}

if (-not $BackendOnly) {
  if ($SkipFrontendBuild) {
    & (Join-Path $here 'deploy-frontend.ps1') -SkipBuild
  } else {
    & (Join-Path $here 'deploy-frontend.ps1')
  }
}

Write-Host "`nAll requested deploys finished." -ForegroundColor Green
