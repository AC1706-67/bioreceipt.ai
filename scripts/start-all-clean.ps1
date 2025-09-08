# Clean launcher for React Native on Android

$ErrorActionPreference = "SilentlyContinue"
Set-StrictMode -Version Latest

Write-Host "Cleaning up old processes..."
taskkill /F /IM node.exe /T 2>$null
taskkill /F /IM java.exe /T 2>$null
adb kill-server 2>$null | Out-Null
adb start-server 2>$null | Out-Null
adb reverse --remove-all 2>$null | Out-Null

Write-Host "Starting Metro bundler (new window) with cache reset..."
$projectRoot = (Get-Location).Path
$metroArgs   = 'npx react-native start --reset-cache'
Start-Process -FilePath "powershell" -ArgumentList "-NoExit","-Command",$metroArgs -WorkingDirectory $projectRoot | Out-Null
Write-Host "Metro process started with args: $metroArgs in $projectRoot"

# Wait for Metro to come up on 8081 (max ~90s)
Write-Host "Waiting for Metro (port 8081) to be ready..."
$deadline = (Get-Date).AddSeconds(90)
$metroUp = $false
while((Get-Date) -lt $deadline) {
  try {
    $tcp = Test-NetConnection -ComputerName localhost -Port 8081 -WarningAction SilentlyContinue
    if ($tcp.TcpTestSucceeded) { $metroUp = $true; break }
  } catch { Start-Sleep -Milliseconds 800 }
  Write-Host "Testing Metro on port 8081..."
  Start-Sleep -Milliseconds 800
}

if (-not $metroUp) {
  Write-Host "WARNING: Metro didn't open port 8081 in time. You can still try to continue, but builds may fail."
} else {
  Write-Host "SUCCESS: Metro is listening on 8081."
}

# Check for device, then set reverse
Write-Host "Checking ADB device and setting reverse..."
$devices = & adb devices
Write-Host "Raw adb devices output:"
$devices -split "`n" | ForEach-Object { Write-Host "  $_" }
$hasDevice = ($devices -split "`n" | Where-Object { $_ -match "\sdevice$" }) -ne $null
Write-Host "Has device? $hasDevice"
if (-not $hasDevice) {
  Write-Host "WARNING: No device detected. Plug in phone, enable USB debugging, accept the prompt, then re-run."
  exit 1
}
adb reverse tcp:8081 tcp:8081 2>$null | Out-Null

# Optional: show concise env
Write-Host "Tooling versions:"
try { Write-Host ("  Node: " + (& node -v)) } catch {}
try { Write-Host ("  npm : " + (& npm -v)) } catch {}
try { Write-Host ("  ADB : " + (& adb version | Select-Object -First 1)) } catch {}

Write-Host "SUCCESS: Metro setup complete. Ready for react-native run-android"