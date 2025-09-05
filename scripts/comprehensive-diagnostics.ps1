# BioReceipt.AI Comprehensive Diagnostics Script
# Run this script to diagnose React Native development issues

Write-Host "=== BioReceipt.AI Development Environment Diagnostics ===" -ForegroundColor Cyan
Write-Host "Starting comprehensive diagnostic checks..." -ForegroundColor Green

# Priority 1: Development Server Connectivity
Write-Host "`n1. METRO BUNDLER STATUS" -ForegroundColor Yellow
Write-Host "Checking if Metro is running on port 8081..."
$metroProcess = netstat -ano | findstr :8081
if ($metroProcess) {
    Write-Host "[OK] Metro is running on port 8081" -ForegroundColor Green
    Write-Host $metroProcess
} else {
    Write-Host "[X] Metro is NOT running on port 8081" -ForegroundColor Red
}

Write-Host "`n2. ADB DEVICE CONNECTION" -ForegroundColor Yellow
Write-Host "Checking connected devices..."
$devices = adb devices
Write-Host $devices
if ($devices -match "device$") {
    Write-Host "[OK] Device is connected and authorized" -ForegroundColor Green
} else {
    Write-Host "[X] No authorized devices found" -ForegroundColor Red
}

Write-Host "`n3. ADB REVERSE TUNNEL STATUS" -ForegroundColor Yellow
Write-Host "Setting up port forwarding..."
$reverseResult = adb reverse tcp:8081 tcp:8081 2>&1
Write-Host "Reverse tunnel result: $reverseResult"

Write-Host "`n4. APP INSTALLATION CHECK" -ForegroundColor Yellow
Write-Host "Checking if BioReceipt.AI is installed..."
$appInstalled = adb shell pm list packages | findstr bioreceipt
if ($appInstalled) {
    Write-Host "[OK] App is installed: $appInstalled" -ForegroundColor Green
} else {
    Write-Host "[X] App is NOT installed" -ForegroundColor Red
}

Write-Host "`n5. NETWORK CONNECTIVITY TEST" -ForegroundColor Yellow
Write-Host "Getting local IP addresses..."
$ipAddresses = ipconfig | Select-String -Pattern "IPv4.*192\.168\.|IPv4.*10\.|IPv4.*172\."
Write-Host $ipAddresses

Write-Host "`n6. REACT NATIVE ENVIRONMENT" -ForegroundColor Yellow
Write-Host "Checking React Native CLI version..."
try {
    $rnVersion = npx react-native --version 2>&1
    Write-Host "React Native CLI: $rnVersion" -ForegroundColor Green
} catch {
    Write-Host "[X] React Native CLI not found" -ForegroundColor Red
}

Write-Host "`n7. NODE.JS AND NPM VERSIONS" -ForegroundColor Yellow
$nodeVersion = node --version
$npmVersion = npm --version
Write-Host "Node.js: $nodeVersion" -ForegroundColor Green
Write-Host "NPM: $npmVersion" -ForegroundColor Green

Write-Host "`n8. ANDROID SDK TOOLS" -ForegroundColor Yellow
Write-Host "Checking ADB version..."
$adbVersion = adb version
Write-Host $adbVersion

Write-Host "`n9. APP LAUNCH TEST" -ForegroundColor Yellow
Write-Host "Attempting to launch app..."
$launchResult = adb shell am start -n com.bioreceipt.ai/.MainActivity 2>&1
Write-Host "Launch result: $launchResult"

Write-Host "`n10. RECENT APP LOGS" -ForegroundColor Yellow
Write-Host "Checking recent app logs for errors..."
Start-Sleep -Seconds 2
$recentLogs = adb logcat -d | Select-String -Pattern "bioreceipt|ReactNative|FATAL" | Select-Object -Last 10
if ($recentLogs) {
    Write-Host "Recent relevant logs:" -ForegroundColor Yellow
    $recentLogs | ForEach-Object { Write-Host $_ }
} else {
    Write-Host "No recent relevant logs found" -ForegroundColor Yellow
}

Write-Host "`n=== DIAGNOSTIC SUMMARY ===" -ForegroundColor Cyan
Write-Host "Diagnostic scan complete. Check the results above for any issues." -ForegroundColor Green
Write-Host "Common fixes:" -ForegroundColor Yellow
Write-Host "- If Metro isn't running: npx react-native start --reset-cache" -ForegroundColor White
Write-Host "- If device not connected: Enable USB debugging and authorize computer" -ForegroundColor White
Write-Host "- If app won't connect: Try adb reverse tcp:8081 tcp:8081" -ForegroundColor White
Write-Host "- If app crashes: Check logcat for detailed error messages" -ForegroundColor White