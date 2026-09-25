# Module-by-module test report for Connitor frontend + API
$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:3000"
$apiUrl = "https://connitor.bengalurutechcommunity.com"

$routes = @(
    @{ Module = "Home"; Path = "/" },
    @{ Module = "Auth - Login"; Path = "/auth/login/" },
    @{ Module = "Auth - Login OTP"; Path = "/auth/login-otp/" },
    @{ Module = "Auth - Register"; Path = "/auth/register/" },
    @{ Module = "Auth - Verify OTP"; Path = "/auth/verify-otp/" },
    @{ Module = "Book Appointment"; Path = "/book-appointment/" },
    @{ Module = "Book Appointment - How It Works"; Path = "/book-appointment/how-it-works/" },
    @{ Module = "Book Appointment - Status"; Path = "/book-appointment/status/" },
    @{ Module = "Dashboard - Overview"; Path = "/dashboard/" },
    @{ Module = "Dashboard - Hospital Chains"; Path = "/dashboard/hospital-chains/" },
    @{ Module = "Dashboard - Branches"; Path = "/dashboard/branches/" },
    @{ Module = "Dashboard - Departments"; Path = "/dashboard/departments/" },
    @{ Module = "Dashboard - Sub-Departments"; Path = "/dashboard/sub-departments/" },
    @{ Module = "Dashboard - Users"; Path = "/dashboard/users/" },
    @{ Module = "Dashboard - Appointments"; Path = "/dashboard/appointments/" },
    @{ Module = "Dashboard - Visitors"; Path = "/dashboard/visitors/" },
    @{ Module = "Dashboard - Visitor Logs"; Path = "/dashboard/visitors/visitors-logs/" },
    @{ Module = "Dashboard - Check-In"; Path = "/dashboard/visitors/check-in/" },
    @{ Module = "Dashboard - My Visitors"; Path = "/dashboard/my-visitors/" },
    @{ Module = "Dashboard - Attendant Passes"; Path = "/dashboard/attendant-passes/" },
    @{ Module = "Dashboard - Delivery"; Path = "/dashboard/delivery/" },
    @{ Module = "Dashboard - Delivery Slots"; Path = "/dashboard/delivery-slots/" },
    @{ Module = "Dashboard - Delivery Vendors"; Path = "/dashboard/delivery/vendors/" },
    @{ Module = "Dashboard - Receiving"; Path = "/dashboard/receiving/" },
    @{ Module = "Dashboard - Settings"; Path = "/dashboard/settings/" },
    @{ Module = "Security Dashboard"; Path = "/security/dashboard/" },
    @{ Module = "Security - Check-In Tab"; Path = "/security/dashboard/?tab=check-in" },
    @{ Module = "Security - Appointments Tab"; Path = "/security/dashboard/?tab=appointments" },
    @{ Module = "Security - Logs Tab"; Path = "/security/dashboard/?tab=logs" },
    @{ Module = "Security - Delivery Scan"; Path = "/security/dashboard/?tab=delivery-scan" },
    @{ Module = "Security - Attendant Scan"; Path = "/security/dashboard/?tab=attendant-scan" },
    @{ Module = "Security - Deliveries"; Path = "/security/dashboard/?tab=deliveries" },
    @{ Module = "Visitor Registration"; Path = "/visitor-registration/" },
    @{ Module = "Visitor Registration - Wizard"; Path = "/visitor-registration/wizard/" },
    @{ Module = "Visitor Registration - Visit Type"; Path = "/visitor-registration/visit-type-selection/" },
    @{ Module = "Visitor Registration - Meeting Details"; Path = "/visitor-registration/meeting-details/" },
    @{ Module = "Visitor Registration - Meeting Form"; Path = "/visitor-registration/meeting-registration-form/" },
    @{ Module = "Visitor Registration - Delivery Details"; Path = "/visitor-registration/delivery-details/" },
    @{ Module = "Visitor Registration - Delivery Form"; Path = "/visitor-registration/delivery-registration-form/" },
    @{ Module = "Visitor Registration - Phone Verify"; Path = "/visitor-registration/phone-verification/" },
    @{ Module = "Visitor Registration - Confirmation"; Path = "/visitor-registration/confirmation/" },
    @{ Module = "Visitor Portal - Login"; Path = "/visitor/login/" },
    @{ Module = "Visitor Portal - Dashboard"; Path = "/visitor/dashboard/" },
    @{ Module = "Visitor Portal - Profile"; Path = "/visitor/dashboard/profile/" },
    @{ Module = "Visitor Portal - Verify Email"; Path = "/visitor/verify-email/" },
    @{ Module = "Visitor Portal - Register"; Path = "/visitor/register/" },
    @{ Module = "Vendor - Deliveries"; Path = "/vendor/deliveries/" },
    @{ Module = "Vendor - Book Delivery"; Path = "/vendor/deliveries/book/" },
    @{ Module = "Vendor - Fleet"; Path = "/vendor/fleet/" },
    @{ Module = "Vendor - Wallet"; Path = "/vendor/wallet/" },
    @{ Module = "Attendant Pass Apply"; Path = "/attendant-pass/apply/" },
    @{ Module = "Approve Visit"; Path = "/approve-visit/" },
    @{ Module = "Public QR Visitor Form"; Path = "/public-qr-visitor-form/" },
    @{ Module = "On-Spot Visit"; Path = "/visit/on-spot/" }
)

$apiModules = @(
    @{ Module = "API Root"; Path = "/api/"; Method = "GET"; ExpectAuth = $false },
    @{ Module = "Auth - Login"; Path = "/api/auth/login"; Method = "POST"; ExpectAuth = $false },
    @{ Module = "Public - Branches"; Path = "/api/public/branches"; Method = "GET"; ExpectAuth = $false },
    @{ Module = "Public - Hospitals"; Path = "/api/public/hospitals"; Method = "GET"; ExpectAuth = $false },
    @{ Module = "Hospital Chains"; Path = "/api/hospital-chains"; Method = "GET"; ExpectAuth = $true },
    @{ Module = "Branches"; Path = "/api/branches"; Method = "GET"; ExpectAuth = $true },
    @{ Module = "Departments"; Path = "/api/departments"; Method = "GET"; ExpectAuth = $true },
    @{ Module = "Users"; Path = "/api/users"; Method = "GET"; ExpectAuth = $true },
    @{ Module = "Appointments"; Path = "/api/appointments"; Method = "GET"; ExpectAuth = $true },
    @{ Module = "Security - Visitors"; Path = "/api/security/visitors"; Method = "GET"; ExpectAuth = $true },
    @{ Module = "Security - Appointments Today"; Path = "/api/security/appointments/today"; Method = "GET"; ExpectAuth = $true },
    @{ Module = "Notifications Unread"; Path = "/api/notifications/unread"; Method = "GET"; ExpectAuth = $true },
    @{ Module = "Analytics Super Admin"; Path = "/api/analytics/super-admin/overview"; Method = "GET"; ExpectAuth = $true },
    @{ Module = "Delivery"; Path = "/api/deliveries"; Method = "GET"; ExpectAuth = $true },
    @{ Module = "Attendant Passes"; Path = "/api/attendant-passes"; Method = "GET"; ExpectAuth = $true }
)

Write-Host "========================================"
Write-Host "CONNITOR MODULE TEST REPORT"
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host "Frontend: $baseUrl"
Write-Host "API: $apiUrl"
Write-Host "========================================"
Write-Host ""

# Frontend route tests
Write-Host "--- FRONTEND ROUTE TESTS ---"
$routeResults = @()
foreach ($r in $routes) {
    $url = "$baseUrl$($r.Path)"
    try {
        $resp = Invoke-WebRequest -Uri $url -TimeoutSec 30 -UseBasicParsing -MaximumRedirection 5
        $status = $resp.StatusCode
        $ok = ($status -ge 200 -and $status -lt 400)
        $note = if ($ok) { "OK" } else { "HTTP $status" }
        $routeResults += [PSCustomObject]@{ Module = $r.Module; Status = if ($ok) { "PASS" } else { "FAIL" }; HTTP = $status; Note = $note }
        Write-Host ("[{0}] {1} - HTTP {2}" -f $(if ($ok) { "PASS" } else { "FAIL" }), $r.Module, $status)
    } catch {
        $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
        $routeResults += [PSCustomObject]@{ Module = $r.Module; Status = "FAIL"; HTTP = $code; Note = $_.Exception.Message }
        Write-Host ("[FAIL] {0} - {1}" -f $r.Module, $_.Exception.Message)
    }
}

Write-Host ""
Write-Host "--- PRODUCTION API TESTS ---"
$apiResults = @()
foreach ($a in $apiModules) {
    $url = "$apiUrl$($a.Path)"
    try {
        if ($a.Method -eq "GET") {
            $resp = Invoke-WebRequest -Uri $url -TimeoutSec 15 -UseBasicParsing
        } else {
            $resp = Invoke-WebRequest -Uri $url -Method POST -Body '{}' -ContentType "application/json" -TimeoutSec 15 -UseBasicParsing
        }
        $status = $resp.StatusCode
        $ok = ($status -ge 200 -and $status -lt 500)
        $apiResults += [PSCustomObject]@{ Module = $a.Module; Status = if ($ok) { "PASS" } else { "FAIL" }; HTTP = $status; Note = "Reachable" }
        Write-Host ("[{0}] {1} - HTTP {2}" -f $(if ($ok) { "PASS" } else { "FAIL" }), $a.Module, $status)
    } catch {
        $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
        $expected = $a.ExpectAuth -and ($code -eq 401 -or $code -eq 403)
        $statusLabel = if ($expected) { "PASS (auth required)" } elseif ($code -eq 404) { "FAIL (not found)" } elseif ($code -eq 422) { "PASS (validation)" } else { "FAIL" }
        $apiResults += [PSCustomObject]@{ Module = $a.Module; Status = $statusLabel; HTTP = $code; Note = $_.Exception.Message }
        Write-Host ("[{0}] {1} - HTTP {2}" -f $statusLabel, $a.Module, $code)
    }
}

Write-Host ""
Write-Host "--- LOCAL API PROXY TESTS (via frontend) ---"
$proxyResults = @()
$proxyEndpoints = @("/api/", "/api/public/hospitals", "/api/notifications/unread")
foreach ($ep in $proxyEndpoints) {
    $url = "$baseUrl$ep"
    try {
        $resp = Invoke-WebRequest -Uri $url -TimeoutSec 20 -UseBasicParsing
        $proxyResults += [PSCustomObject]@{ Endpoint = $ep; Status = "PASS"; HTTP = $resp.StatusCode }
        Write-Host ("[PASS] Proxy $ep - HTTP $($resp.StatusCode)")
    } catch {
        $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
        $proxyResults += [PSCustomObject]@{ Endpoint = $ep; Status = "FAIL"; HTTP = $code; Note = $_.Exception.Message }
        Write-Host ("[FAIL] Proxy $ep - HTTP $code - $($_.Exception.Message)")
    }
}

Write-Host ""
Write-Host "========================================"
Write-Host "SUMMARY"
Write-Host "========================================"
$routePass = ($routeResults | Where-Object { $_.Status -eq "PASS" }).Count
$routeFail = ($routeResults | Where-Object { $_.Status -eq "FAIL" }).Count
Write-Host "Frontend Routes: $routePass PASS / $routeFail FAIL / $($routes.Count) TOTAL"
$apiPass = ($apiResults | Where-Object { $_.Status -like "PASS*" }).Count
$apiFail = ($apiResults | Where-Object { $_.Status -like "FAIL*" }).Count
Write-Host "API Endpoints: $apiPass PASS / $apiFail FAIL / $($apiModules.Count) TOTAL"
$proxyPass = ($proxyResults | Where-Object { $_.Status -eq "PASS" }).Count
Write-Host "API Proxy: $proxyPass PASS / $($proxyEndpoints.Count) TOTAL"
