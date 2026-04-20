# Quick Backend Verification Script
# Run this to determine if JavaBank or NexaBank backend is running

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║         JavaBank Backend Verification Script                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check port 5000
Write-Host "[1/5] Checking if port 5000 is in use..." -ForegroundColor Yellow
$port5000 = netstat -ano | findstr ":5000"
if ($port5000) {
    Write-Host "✓ Port 5000 is IN USE" -ForegroundColor Green
    $pid = ($port5000 -split '\s+')[-1]
    Write-Host "  PID: $pid" -ForegroundColor Gray
} else {
    Write-Host "✗ Port 5000 is NOT in use" -ForegroundColor Red
    Write-Host "  → Start JavaBank with: cd JavaBank; docker-compose up -d" -ForegroundColor Yellow
    exit
}

Write-Host ""
Write-Host "[2/5] Testing backend health..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:5000/" -ErrorAction Stop -TimeoutSec 5
    Write-Host "✓ Backend is responding" -ForegroundColor Green
} catch {
    Write-Host "✗ Backend not responding - likely wrong backend running" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Gray
    exit
}

Write-Host ""
Write-Host "[3/5] Fetching tenant list..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/tenants/ifsc-list" -ErrorAction Stop | ConvertFrom-Json
    Write-Host "✓ Tenant API responding" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Tenants Found:" -ForegroundColor Cyan
    foreach ($tenant in $response) {
        Write-Host "    • $($tenant.bankName) ($($tenant.ifsc))" -ForegroundColor White
    }
} catch {
    Write-Host "✗ Could not fetch tenants" -ForegroundColor Red
    Write-Host "  Error: $_" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[4/5] Determining Backend Type..." -ForegroundColor Yellow
$tenantNames = $response.bankName -join ", "
if ($tenantNames -like "*JBank*" -and $tenantNames -like "*OBank*") {
    Write-Host "✓✓✓ CORRECT: JavaBank Backend is Running!" -ForegroundColor Green
    Write-Host "  Tenants: $tenantNames" -ForegroundColor Green
} elseif ($tenantNames -like "*NexaBank*" -or $tenantNames -like "*SafeX*") {
    Write-Host "✗✗✗ WRONG: NexaBank Backend is Running!" -ForegroundColor Red
    Write-Host "  Tenants: $tenantNames" -ForegroundColor Red
    Write-Host ""
    Write-Host "  FIX: Stop NexaBank and start JavaBank" -ForegroundColor Yellow
    Write-Host "    1. cd NexaBank; docker-compose down -v" -ForegroundColor Yellow
    Write-Host "    2. cd ../JavaBank; docker-compose up -d" -ForegroundColor Yellow
} else {
    Write-Host "? UNKNOWN: Cannot determine backend type" -ForegroundColor Yellow
    Write-Host "  Tenants: $tenantNames" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[5/5] Database Verification..." -ForegroundColor Yellow
try {
    $containers = docker ps --format "{{.Names}}"
    if ($containers -like "*javabank-postgres*") {
        Write-Host "✓ JavaBank PostgreSQL container running" -ForegroundColor Green
    } else {
        Write-Host "✗ JavaBank PostgreSQL not found" -ForegroundColor Red
    }
    
    if ($containers -like "*nexabank*") {
        Write-Host "! NexaBank containers found - may cause conflicts" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Could not check Docker containers" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    Verification Complete                       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
