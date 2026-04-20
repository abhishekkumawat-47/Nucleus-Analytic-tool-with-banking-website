param(
  [switch]$SkipStart
)
$ErrorActionPreference = 'Stop'


$envFile = if (Test-Path ".\.env") { ".\.env" } elseif (Test-Path ".\.env.example") { ".\.env.example" } else { $null }
if ($envFile) {
  Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { return }
    $parts = $line.Split("=", 2)
    $k = $parts[0].Trim()
    $v = $parts[1].Trim().Trim('"')
    if ($k) { Set-Item -Path "Env:$k" -Value $v }
  }
}

$port = if ($env:PORT) { $env:PORT } else { '5000' }
$base = "http://localhost:$port"
$api = "$base/api"
$failures = @()
$proc = $null

function Add-Failure([string]$name, [string]$msg) {
  $script:failures += "[$name] $msg"
}

function Assert-Status($name, $status, $expected) {
  if ($status -ne $expected) {
    Add-Failure $name "expected $expected, got $status"
  }
}

if (-not $SkipStart) {
  Write-Host "Starting JavaBank app..."
  $proc = Start-Process -FilePath ".\mvnw.cmd" -ArgumentList "spring-boot:run" -PassThru -WindowStyle Hidden
} else {
  Write-Host "Using already running JavaBank app on $base"
}

$up = $false
for ($i = 0; $i -lt 180; $i++) {
  try {
    $r = Invoke-WebRequest -Uri "$base/" -Method GET -TimeoutSec 1
    if ($r.StatusCode -eq 200) { $up = $true; break }
  } catch {}
}

if (-not $up) {
  if ($proc) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
  throw "Backend did not start on $base"
}

Write-Host "Backend is up. Running route smoke tests..."

$ts = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$emailA = "jbank.$ts@example.com"
$emailB = "obank.$ts@example.com"
$panA = "ABCDE$($ts.ToString().Substring($ts.ToString().Length-4))F"
$panB = "PQRST$($ts.ToString().Substring($ts.ToString().Length-4))Z"

$sessionA = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$sessionB = New-Object Microsoft.PowerShell.Commands.WebRequestSession

try {
  $tenants = Invoke-WebRequest -Uri "$api/tenants/ifsc-list" -Method GET
  Assert-Status "tenants/ifsc-list" $tenants.StatusCode 200

  $regA = Invoke-WebRequest -Uri "$api/auth/register" -Method POST -WebSession $sessionA -ContentType 'application/json' -Headers @{"X-Tenant-ID"="JAVABANK"} -Body (@{
    name='JavaBank User'; email=$emailA; phone="98$($ts.ToString().Substring(0,8))"; password='Password@123'; dateOfBirth='1998-01-15'; pan=$panA; tenantId='bank_a'; settingConfig=@{}; address=@{}
  } | ConvertTo-Json)
  Assert-Status "auth/register A" $regA.StatusCode 201
  $userA = ($regA.Content | ConvertFrom-Json)

  $regB = Invoke-WebRequest -Uri "$api/auth/register" -Method POST -WebSession $sessionB -ContentType 'application/json' -Headers @{"X-Tenant-ID"="OMAX"} -Body (@{
    name='OMAX User'; email=$emailB; phone="97$($ts.ToString().Substring(0,8))"; password='Password@123'; dateOfBirth='1999-03-22'; pan=$panB; tenantId='bank_b'; settingConfig=@{}; address=@{}
  } | ConvertTo-Json)
  Assert-Status "auth/register B" $regB.StatusCode 201
  $userB = ($regB.Content | ConvertFrom-Json)

  $cookieA = Invoke-WebRequest -Uri "$api/auth/cookieReturn" -Method GET -WebSession $sessionA
  Assert-Status "auth/cookieReturn" $cookieA.StatusCode 200

  $accA1 = Invoke-WebRequest -Uri "$api/accounts" -Method POST -WebSession $sessionA -ContentType 'application/json' -Body (@{customerId=$userA.id; ifsc='JAVA0001'; accountType='SAVINGS'; balance=15000} | ConvertTo-Json)
  $accA2 = Invoke-WebRequest -Uri "$api/accounts" -Method POST -WebSession $sessionA -ContentType 'application/json' -Body (@{customerId=$userA.id; ifsc='JAVA0001'; accountType='CURRENT'; balance=4000} | ConvertTo-Json)
  $accB1 = Invoke-WebRequest -Uri "$api/accounts" -Method POST -WebSession $sessionB -ContentType 'application/json' -Body (@{customerId=$userB.id; ifsc='OMAX0001'; accountType='SAVINGS'; balance=2500} | ConvertTo-Json)
  Assert-Status "accounts create A1" $accA1.StatusCode 201
  Assert-Status "accounts create A2" $accA2.StatusCode 201
  Assert-Status "accounts create B1" $accB1.StatusCode 201

  $a1 = ($accA1.Content | ConvertFrom-Json)
  $a2 = ($accA2.Content | ConvertFrom-Json)
  $b1 = ($accB1.Content | ConvertFrom-Json)

  $allA = Invoke-WebRequest -Uri "$api/customers/accounts/$($userA.id)" -Method GET -WebSession $sessionA
  Assert-Status "customers/accounts" $allA.StatusCode 200

  $txOwn = Invoke-WebRequest -Uri "$api/accounts/transfer" -Method POST -WebSession $sessionA -ContentType 'application/json' -Body (@{fromAccountNo=$a1.accNo; toAccountNo=$a2.accNo; amount=500; description='Self Transfer'} | ConvertTo-Json)
  Assert-Status "accounts/transfer" $txOwn.StatusCode 200

  $payeeAdd = Invoke-WebRequest -Uri "$api/payee/$($userA.id)" -Method POST -WebSession $sessionA -ContentType 'application/json' -Body (@{name='OMAX Beneficiary'; payeeifsc='OMAX0001'; payeeAccNo=$b1.accNo; payeeType='INDIVIDUAL'} | ConvertTo-Json)
  Assert-Status "payee add" $payeeAdd.StatusCode 201

  $payName = Invoke-WebRequest -Uri "$api/payees/name" -Method POST -WebSession $sessionA -ContentType 'application/json' -Body (@{data=@{payeeifsc='OMAX0001'; payeeAccNo=$b1.accNo}} | ConvertTo-Json)
  Assert-Status "payees/name" $payName.StatusCode 200

  $payNow = Invoke-WebRequest -Uri "$api/accounts/pay" -Method POST -WebSession $sessionA -ContentType 'application/json' -Body (@{fromAccountNo=$a1.accNo; toAccountNo=$b1.accNo; amount=300; description='Cross Bank Pay'} | ConvertTo-Json)
  Assert-Status "accounts/pay" $payNow.StatusCode 200

  $trx1 = Invoke-WebRequest -Uri "$api/byUserAcc/$($a1.accNo)" -Method GET -WebSession $sessionA
  $trx2 = Invoke-WebRequest -Uri "$api/byCustomer/$($userA.id)" -Method GET -WebSession $sessionA
  $trx3 = Invoke-WebRequest -Uri "$api/transactions" -Method GET -WebSession $sessionA
  Assert-Status "byUserAcc" $trx1.StatusCode 200
  Assert-Status "byCustomer" $trx2.StatusCode 200
  Assert-Status "transactions list" $trx3.StatusCode 200

  $loanApply = Invoke-WebRequest -Uri "$api/apply" -Method POST -WebSession $sessionA -ContentType 'application/json' -Body (@{
    customerId=$userA.id; loanType='PERSONAL'; principalAmount=20000; term=12; interestRate=11.5; kycData=@{pan=$panA; aadhaar='123412341234'}
  } | ConvertTo-Json)
  Assert-Status "loan apply" $loanApply.StatusCode 201

  $apps = Invoke-WebRequest -Uri "$api/applications/$($userA.id)" -Method GET -WebSession $sessionA
  Assert-Status "loan applications" $apps.StatusCode 200

  $proStatus = Invoke-WebRequest -Uri "$api/pro/status" -Method GET -WebSession $sessionA
  Assert-Status "pro/status" $proStatus.StatusCode 200

  $unlock = Invoke-WebRequest -Uri "$api/pro/unlock" -Method POST -WebSession $sessionA -ContentType 'application/json' -Body (@{featureId='ai-insights'} | ConvertTo-Json)
  Assert-Status "pro/unlock" $unlock.StatusCode 200

  $book = Invoke-WebRequest -Uri "$api/pro/access_book" -Method POST -WebSession $sessionA -ContentType 'application/json' -Body (@{title='Finance 101'; url='https://example.com'} | ConvertTo-Json)
  $bookStats = Invoke-WebRequest -Uri "$api/pro/book_stats" -Method GET -WebSession $sessionA
  $crypto = Invoke-WebRequest -Uri "$api/pro/crypto_prices" -Method GET -WebSession $sessionA
  Assert-Status "pro/access_book" $book.StatusCode 200
  Assert-Status "pro/book_stats" $bookStats.StatusCode 200
  Assert-Status "pro/crypto_prices" $crypto.StatusCode 200

  $eventTrack = Invoke-WebRequest -Uri "$api/events/track" -Method POST -WebSession $sessionA -ContentType 'application/json' -Body (@{eventType='dashboard.page.view'; metadata=@{source='smoke'}} | ConvertTo-Json)
  $eventLoc = Invoke-WebRequest -Uri "$api/events/location" -Method POST -WebSession $sessionA -ContentType 'application/json' -Body (@{city='Jaipur'; country='India'; platform='Windows'; deviceType='desktop'} | ConvertTo-Json)
  $toggles = Invoke-WebRequest -Uri "$api/events/toggles/bank_a" -Method GET
  Assert-Status "events/track" $eventTrack.StatusCode 200
  Assert-Status "events/location" $eventLoc.StatusCode 200
  Assert-Status "events/toggles" $toggles.StatusCode 200

  $logout = Invoke-WebRequest -Uri "$api/auth/logout" -Method POST -WebSession $sessionA
  Assert-Status "auth/logout" $logout.StatusCode 200

} catch {
  Add-Failure "runtime" $_.Exception.Message
} finally {
  if ($proc) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
}

if ($failures.Count -gt 0) {
  Write-Host "SMOKE TEST FAILED" -ForegroundColor Red
  $failures | ForEach-Object { Write-Host $_ -ForegroundColor Red }
  exit 1
}

Write-Host "SMOKE TEST PASSED" -ForegroundColor Green
exit 0
