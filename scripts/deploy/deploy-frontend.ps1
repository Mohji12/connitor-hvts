<#
.SYNOPSIS
  Deploy the frontend to Vercel (production).

.DESCRIPTION
  Default: `vercel deploy --prod` on the linked project (rootDirectory=frontend in Vercel).
  Optional: `-UseGitPush` pushes to VERCEL_GIT_REMOTE/VERCEL_GIT_BRANCH and lets Vercel Git integration build.

.EXAMPLE
  .\scripts\deploy\deploy-frontend.ps1
  .\scripts\deploy\deploy-frontend.ps1 -UseGitPush
  .\scripts\deploy\deploy-frontend.ps1 -SkipBuild -UseGitPush
#>
[CmdletBinding()]
param(
  [switch]$SkipBuild,
  [switch]$UseGitPush
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_common.ps1')
Import-DeployConfig

$apiUrl = $env:NEXT_PUBLIC_BACKEND_API_URL
if (-not $apiUrl) { throw 'NEXT_PUBLIC_BACKEND_API_URL is required in config.env' }

$root = Get-RepoRoot
$frontend = Join-Path $root 'frontend'
$gitRemote = if ($env:VERCEL_GIT_REMOTE) { $env:VERCEL_GIT_REMOTE } else { 'coninter' }
$gitBranch = if ($env:VERCEL_GIT_BRANCH) { $env:VERCEL_GIT_BRANCH } else { 'main' }

if (-not $UseGitPush) {
  Assert-Command npm
  Push-Location $root
  try {
    if (-not $SkipBuild) {
      Write-Host "==> Verifying local frontend build (API=$apiUrl)" -ForegroundColor Cyan
      $env:NEXT_PUBLIC_BACKEND_API_URL = $apiUrl
      $prodLocal = Join-Path $frontend '.env.production.local'
      @"
NEXT_PUBLIC_BACKEND_API_URL=$apiUrl
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_DEMO_MODE=false
"@ | Set-Content -Path $prodLocal -Encoding utf8
      Push-Location $frontend
      Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue
      $prevPref = $ErrorActionPreference
      $ErrorActionPreference = 'Continue'
      npm run build
      $buildExit = $LASTEXITCODE
      $ErrorActionPreference = $prevPref
      Pop-Location
      Remove-Item $prodLocal -Force -ErrorAction SilentlyContinue
      if ($buildExit -ne 0) { throw "npm run build failed (exit $buildExit)" }
      if (-not (Test-Path (Join-Path $frontend 'dist\index.html'))) {
        throw 'frontend/dist/index.html missing after build'
      }
    }

    Write-Host "==> Deploying to Vercel (production)" -ForegroundColor Cyan
    $prevPref = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    npx --yes vercel@latest deploy --prod --yes
    $deployExit = $LASTEXITCODE
    $ErrorActionPreference = $prevPref
    if ($deployExit -ne 0) { throw "vercel deploy failed (exit $deployExit)" }
  } finally {
    Pop-Location
  }
} else {
  Write-Host "==> Pushing to $gitRemote → $gitBranch (Vercel Git build)" -ForegroundColor Cyan
  $branch = git -C $root rev-parse --abbrev-ref HEAD
  git -C $root push $gitRemote "${branch}:${gitBranch}"
  if ($LASTEXITCODE -ne 0) { throw "git push $gitRemote failed" }
  Write-Host "    Vercel will build from Git; check the Vercel dashboard for progress." -ForegroundColor Gray
}

if ($env:FRONTEND_HEALTH_URL) {
  Wait-HttpOk -Url $env:FRONTEND_HEALTH_URL -Attempts 12 -DelaySec 10
}

Write-Host "Frontend deploy finished. Production: $($env:FRONTEND_HEALTH_URL)" -ForegroundColor Green
