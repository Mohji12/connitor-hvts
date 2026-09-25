<#
.SYNOPSIS
  Deploy python_backend to EC2 (git pull or rsync/tar) and restart the API.

.EXAMPLE
  .\scripts\deploy\deploy-backend.ps1
  .\scripts\deploy\deploy-backend.ps1 -Method rsync
#>
[CmdletBinding()]
param(
  [ValidateSet('git', 'rsync', '')]
  [string]$Method = ''
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '_common.ps1')
Import-DeployConfig
Assert-Command ssh
Assert-Command scp

$hostName = $env:EC2_HOST
$user = if ($env:EC2_USER) { $env:EC2_USER } else { 'ubuntu' }
$key = $env:EC2_SSH_KEY
$ppk = $env:EC2_PPK_KEY
$remoteDir = if ($env:EC2_REMOTE_DIR) { $env:EC2_REMOTE_DIR } else { '/home/ubuntu/connitor/connitor' }
$method = if ($Method) { $Method } elseif ($env:EC2_DEPLOY_METHOD) { $env:EC2_DEPLOY_METHOD } else { 'rsync' }
$branch = if ($env:EC2_GIT_BRANCH) { $env:EC2_GIT_BRANCH } else { 'main' }
$service = if ($env:EC2_SYSTEMD_SERVICE) { $env:EC2_SYSTEMD_SERVICE } else { 'conni' }
$venvDir = if ($env:EC2_VENV_DIR) { $env:EC2_VENV_DIR } else { 'conni' }
$useDocker = if ($env:EC2_DOCKER_COMPOSE -eq '1') { '1' } else { '0' }
$migrate = if ($env:EC2_MIGRATE_SCRIPTS) { $env:EC2_MIGRATE_SCRIPTS } else { '' }

if (-not $hostName) { throw 'EC2_HOST is required in config.env' }

if ((-not $key -or -not (Test-Path $key)) -and $ppk -and (Test-Path $ppk)) {
  Write-Host "==> Converting PPK → OpenSSH PEM" -ForegroundColor Cyan
  $key = Convert-PpkToOpenSsh -PpkPath $ppk
  $env:EC2_SSH_KEY = $key
}

if (-not $key -or -not (Test-Path $key)) {
  throw "EC2_SSH_KEY missing or not found: $key (set EC2_PPK_KEY to auto-convert)"
}

$sshTarget = "${user}@${hostName}"
$sshArgs = @(
  '-i', $key,
  '-o', 'StrictHostKeyChecking=accept-new',
  '-o', 'IdentitiesOnly=yes'
)

$root = Get-RepoRoot
$remoteUpdateLocal = Join-Path $PSScriptRoot 'remote-backend-update.sh'
$remoteUpdateRemote = "$remoteDir/scripts/deploy/remote-backend-update.sh"

Write-Host "==> Ensuring remote deploy helper exists" -ForegroundColor Cyan
ssh @sshArgs $sshTarget "mkdir -p '$remoteDir/scripts/deploy'"
scp @sshArgs $remoteUpdateLocal "${sshTarget}:${remoteUpdateRemote}"
ssh @sshArgs $sshTarget "chmod +x '$remoteUpdateRemote'"

if ($method -eq 'git') {
  Write-Host "==> git fetch/pull on EC2 ($branch)" -ForegroundColor Cyan
  $gitCmd = @"
set -e
cd '$remoteDir'
if [ ! -d .git ]; then
  echo 'ERROR: $remoteDir is not a git repo. Set EC2_DEPLOY_METHOD=rsync or clone the repo first.' >&2
  exit 1
fi
git fetch origin
git checkout '$branch'
git pull --ff-only origin '$branch'
"@
  ssh @sshArgs $sshTarget $gitCmd
}
elseif ($method -eq 'rsync') {
  $localPy = Join-Path $root 'python_backend'
  Write-Host "==> Syncing python_backend → EC2 (preserves remote .env / $venvDir)" -ForegroundColor Cyan
  if (Get-Command rsync -ErrorAction SilentlyContinue) {
    rsync -az --delete `
      --exclude "$venvDir/" `
      --exclude '.venv/' `
      --exclude '__pycache__/' `
      --exclude '.pytest_cache/' `
      --exclude '.env' `
      -e "ssh -i `"$key`" -o StrictHostKeyChecking=accept-new -o IdentitiesOnly=yes" `
      "$localPy/" "${sshTarget}:${remoteDir}/python_backend/"
  } else {
    $stagingZip = Join-Path $env:TEMP ("connitor-backend-{0}.zip" -f (Get-Date -Format 'yyyyMMddHHmmss'))
    $pyZip = Join-Path $root 'python_backend\.venv\Scripts\python.exe'
    if (-not (Test-Path $pyZip)) { $pyZip = 'python' }
    Write-Host "==> Building zip with forward-slash paths" -ForegroundColor Cyan
    $venvName = $venvDir
    & $pyZip -c @"
import zipfile
from pathlib import Path
root = Path(r'''$localPy''')
out = Path(r'''$stagingZip''')
skip_dirs = {r'''$venvName''', '.venv', '__pycache__', '.pytest_cache', '.git'}
skip_files = {'.env'}
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as zf:
    count = 0
    for path in root.rglob('*'):
        if not path.is_file():
            continue
        rel = path.relative_to(root).as_posix()
        parts = rel.split('/')
        if any(p in skip_dirs for p in parts):
            continue
        if path.name in skip_files:
            continue
        zf.write(path, rel)
        count += 1
print(f'zipped {count} files -> {out}')
"@
    if (-not (Test-Path $stagingZip)) { throw 'Failed to create backend zip' }
    try {
      scp @sshArgs $stagingZip "${sshTarget}:/tmp/connitor-backend.zip"
      ssh @sshArgs $sshTarget @"
set -e
mkdir -p '$remoteDir/python_backend'
python3 - <<'PY'
import zipfile, shutil
from pathlib import Path
root = Path('$remoteDir/python_backend')
keep_top = {'$venvDir', '.env'}
zf = zipfile.ZipFile('/tmp/connitor-backend.zip')
for info in zf.infolist():
    name = info.filename.replace('\\\\', '/').lstrip('/')
    if not name or name.endswith('/'):
        continue
    top = name.split('/', 1)[0]
    if top in keep_top:
        continue
    dest = root / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    with zf.open(info) as src, open(dest, 'wb') as out:
        shutil.copyfileobj(src, out)
print('extracted', len(zf.namelist()), 'entries')
zf.close()
# cleanup accidental Windows backslash litter from older deploys
for p in root.iterdir():
    if p.is_file() and ('\\\\' in p.name or '/' in p.name):
        # only remove files whose names contain backslash (Windows zip bug)
        if '\\\\' in p.name or chr(92) in p.name:
            p.unlink(missing_ok=True)
            print('removed junk', p.name)
PY
rm -f /tmp/connitor-backend.zip
ls '$remoteDir/python_backend/app/routers' | grep visit || true
test -f '$remoteDir/python_backend/app/routers/visit_slot_allotment.py' && echo HAS_ALLOTMENT_ROUTER
test -f '$remoteDir/python_backend/scripts/migrate_visit_slot_allotment.py' && echo HAS_MIGRATE
"@
    } finally {
      Remove-Item $stagingZip -Force -ErrorAction SilentlyContinue
    }
  }
}
else {
  throw "Unknown EC2_DEPLOY_METHOD: $method (use git or rsync)"
}

Write-Host "==> Install deps, migrate, restart" -ForegroundColor Cyan
$remoteCmd = "bash '$remoteUpdateRemote' '$remoteDir' '$service' '$useDocker' '$migrate' '$venvDir'"
ssh @sshArgs $sshTarget $remoteCmd

$health = if ($env:BACKEND_HEALTH_URL) { $env:BACKEND_HEALTH_URL } else { "https://$hostName/" }
Wait-HttpOk -Url $health -Attempts 15 -DelaySec 4
Write-Host "Backend deploy complete." -ForegroundColor Green
