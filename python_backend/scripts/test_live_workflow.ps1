# Live API workflow test: book -> approve -> ID verify -> check-in -> check-out
$Base = "http://127.0.0.1:8001/api"
$DoctorId = "88888888-8888-8888-8888-888888888888"
$SecurityId = "99999999-9999-9999-9999-999999999999"
$BranchId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
$DeptId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee"
$SubDeptId = "ffffffff-ffff-4fff-8fff-ffffffffffff"
$Phone = ("9{0}" -f (Get-Random -Minimum 100000000 -Maximum 999999999))

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        [object]$Body = $null,
        [string]$DemoUser = $null
    )
    $headers = @{ "Content-Type" = "application/json" }
    if ($DemoUser) { $headers["x-demo-user-id"] = $DemoUser }
    $uri = "$Base$Path"
    try {
        if ($Body) {
            $json = $Body | ConvertTo-Json -Depth 5 -Compress
            $resp = Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -Body $json
        } else {
            $resp = Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers
        }
        return @{ ok = $true; data = $resp }
    } catch {
        $detail = $_.ErrorDetails.Message
        if (-not $detail) { $detail = $_.Exception.Message }
        return @{ ok = $false; error = $detail }
    }
}

Write-Host "`n=== Live Workflow Test (phone: $Phone) ===`n"

Write-Host "[1] Book appointment..."
$tomorrow = (Get-Date).AddDays(1).ToString("yyyy-MM-ddT14:30:00")
$book = Invoke-Api -Method POST -Path "/public/appointments" -Body @{
    branchId = $BranchId
    departmentId = $DeptId
    subDepartmentId = $SubDeptId
    doctorId = $DoctorId
    firstName = "Workflow"
    lastName = "Tester"
    phone = $Phone
    email = "workflow.tester@example.com"
    appointmentDate = $tomorrow
    purpose = "E2E workflow verification"
}
if (-not $book.ok) { Write-Host "FAIL: $($book.error)"; exit 1 }
$visitId = $book.data.bookingId
$bookingId = $book.data.bookingId
Write-Host "OK visitId=$visitId bookingId=$bookingId status=$($book.data.status)"

Write-Host "[2] Doctor approve..."
$approve = Invoke-Api -Method PATCH -Path "/staff/visits/$visitId/approve" -DemoUser $DoctorId
if (-not $approve.ok) { Write-Host "FAIL: $($approve.error)"; exit 1 }
$otp = $approve.data.visit.checkInOtp
Write-Host "OK status=$($approve.data.visit.status) otp=$otp"

Write-Host "[3] Security ID verify..."
$idVerify = Invoke-Api -Method POST -Path "/security/visits/$visitId/verify-id-proof" -DemoUser $SecurityId -Body @{
    idProofType = "AADHAAR"
    idProofNumber = "123456789012"
}
if (-not $idVerify.ok) { Write-Host "FAIL: $($idVerify.error)"; exit 1 }
Write-Host "OK $($idVerify.data.message)"

Write-Host "[4] Scan QR payload..."
$qrPayload = (@{
    visitId = $visitId
    visitCode = $otp
    visitorName = "Workflow Tester"
    visitorPhone = $Phone
} | ConvertTo-Json -Compress)
$scan = Invoke-Api -Method POST -Path "/visitors/scan-qr" -DemoUser $SecurityId -Body @{ qrPayload = $qrPayload }
if (-not $scan.ok) { Write-Host "FAIL: $($scan.error)"; exit 1 }
Write-Host "OK canCheckIn=$($scan.data.canCheckIn)"

Write-Host "[5] Check-in..."
$checkin = Invoke-Api -Method POST -Path "/visitors/checkin/$visitId" -DemoUser $SecurityId
if (-not $checkin.ok) { Write-Host "FAIL: $($checkin.error)"; exit 1 }
Write-Host "OK status=$($checkin.data.status)"

Write-Host "[6] Check-out..."
$checkout = Invoke-Api -Method PATCH -Path "/visitors/checkout/$visitId" -DemoUser $SecurityId
if (-not $checkout.ok) { Write-Host "FAIL: $($checkout.error)"; exit 1 }
Write-Host "OK status=$($checkout.data.status) duration=$($checkout.data.totalDurationMinutes) min"

Write-Host "[7] Booking status lookup..."
$status = Invoke-Api -Method GET -Path "/public/appointments/$bookingId/status?phone=$Phone"
if (-not $status.ok) { Write-Host "FAIL: $($status.error)"; exit 1 }
Write-Host "OK public status=$($status.data.status)"

Write-Host "`n=== ALL STEPS PASSED ===`n"
