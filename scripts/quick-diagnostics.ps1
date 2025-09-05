# HealthyTipApp Quick Diagnostics Script
# Lightweight checks to quickly identify major development issues

Write-Host "=== HealthyTipApp Quick Diagnostics ===" -ForegroundColor Cyan
Write-Host "Running essential quick checks..." -ForegroundColor Green

# Check 1: Metro Bundler
Write-Host "`n1. METRO BUNDLER STATUS" -ForegroundColor Yellow
$metroProcess = netstat -ano | findstr :8081
if ($metroProcess) {
    Write-Host "[OK] Metro is running on port 8081" -ForegroundColor Green
} else {
    Write-Host "[X] Metro is NOT running on port 8081" -ForegroundColor Red
}

# Check 2: ADB Device Connection
Write-Host "`n2. ADB DEVICE CONNECTION" -ForegroundColor Yellow
$devices = adb devices
Write-Host $devices
if ($devices -match "device$") {
    Write-Host "[OK] Device is connected and authorized" -ForegroundColor Green
} else {
    Write-Host "[X] No authorized devices found" -ForegroundColor Red
}

# Check 3: ADB Reverse Tunnel
Write-Host "`n3. ADB REVERSE TUNNEL STATUS" -ForegroundColor Yellow
$reverseResult = adb reverse tcp:8081 tcp:8081 2>&1
Write-Host "Reverse tunnel result: $reverseResult"

# Check 4: Node & NPM Versions
Write-Host "`n4. NODE.JS AND NPM VERSIONS" -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Host "Node.js: $nodeVersion" -ForegroundColor Green
    Write-Host "NPM: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "[X] Node.js or NPM not found" -ForegroundColor Red
}

Write-Host "`n=== QUICK DIAGNOSTIC SUMMARY ===" -ForegroundColor Cyan
Write-Host "Quick scan complete. For deeper issues, run comprehensive-diagnostics.ps1" -ForegroundColor Green