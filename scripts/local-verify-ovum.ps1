# Quick check: local Python API + DB have Ovum booking data.
$ErrorActionPreference = "Stop"
$api = "http://127.0.0.1:8002"
$chainId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01"

Write-Host "Checking $api ..."
try {
  $null = Invoke-WebRequest -Uri "$api/" -UseBasicParsing -TimeoutSec 5
} catch {
  Write-Host "Start backend: cd python_backend; .\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8002 --reload"
  exit 1
}

$hospitals = Invoke-RestMethod -Uri "$api/api/public/appointments/hospitals?hospitalChainId=$chainId"
Write-Host "Public Ovum centres (bookable): $($hospitals.Count)"
if ($hospitals.Count -lt 7) {
  Write-Host "Run: cd python_backend; python scripts/seed_ovum_hospital.py --yes"
  exit 1
}

$loginBody = '{"email":"admin@ovum.conninter.com","password":"Conninter123@"}'
$auth = Invoke-RestMethod -Uri "$api/api/auth/login-password" -Method POST -Body $loginBody -ContentType "application/json"
$headers = @{ Authorization = "Bearer $($auth.access_token)" }
$me = Invoke-RestMethod -Uri "$api/api/auth/me" -Headers $headers
$branches = Invoke-RestMethod -Uri "$api/api/chain/$chainId/branches" -Headers $headers
Write-Host "Ovum chain admin role: $($me.role); dashboard branches: $($branches.Count)"
Write-Host 'OK - open http://localhost:3000/book-appointment/ovum/'
