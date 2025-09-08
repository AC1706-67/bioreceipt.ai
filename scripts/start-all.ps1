Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$logDir = Join-Path $PSScriptRoot "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir ("start-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".log")

function Log([string]$msg) {
  $line = "$(Get-Date -Format HH:mm:ss)  $msg"
  Write-Host $line
  Add-Content -Path $logFile -Value $line
}
function Require-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $name (not found in PATH)"
  }
}

Log "=== BioReceipt.AI Android launcher ==="
Log "PWD: $(Get-Location)"
Log "Node: $(node -v)  npm: $(npm -v)"
try {
  Require-Command node
  Require-Command npm
  Require-Command npx
  Require-Command adb
  Log "Prereqs OK"
} catch {
  Log "Prereqs FAILED: $($_.Exception.Message)"
  throw
}

# Cleanup old processes
Log "Killing lingering node/java/adb..."
taskkill /F /IM node.exe /T 2>$null | Out-Null
taskkill /F /IM java.exe /T 2>$null | Out-Null
adb kill-server 2>$null | Out-Null
adb start-server 2>$null | Out-Null
adb reverse --remove-all 2>$null | Out-Null

# Start Metro (new window) with cache reset
$metroArgs = 'npx react-native start --reset-cache'
Log "Starting Metro: $metroArgs"
Start-Process -FilePath "powershell" -ArgumentList "-NoExit","-Command",$metroArgs -WorkingDirectory (Get-Location) | Out-Null

# Wait for Metro on 8081
Log "Waiting for Metro on 8081 (≤ 90s)..."
$deadline = (Get-Date).AddSeconds(90)
$metroUp = $false
while((Get-Date) -lt $deadline) {
  try {
    $tcp = Test-NetConnection -ComputerName localhost -Port 8081 -WarningAction SilentlyContinue
    if ($tcp.TcpTestSucceeded) { $metroUp = $true; break }
    Start-Sleep -Milliseconds 800
  } catch { Start-Sleep -Milliseconds 800 }
}
if (-not $metroUp) { throw "Metro did not start on 8081 in time." }
Log "Metro is listening on 8081."

# Ensure a device is connected
$devs = (& adb devices) -join "`n"
Log "adb devices:`n$devs"
if ($devs -notmatch "device`r?$") {
  throw "No Android device/emulator connected. Start an emulator or plug in a phone with USB debugging."
}

# Reverse ports for RN
Log "adb reverse tcp:8081 tcp:8081"
adb reverse tcp:8081 tcp:8081 | Out-Null

# Build & install
Log "Running: npx react-native run-android"
$p = Start-Process -FilePath "powershell" -ArgumentList "-Command","npx react-native run-android" -NoNewWindow -PassThru
$p.WaitForExit()
if ($p.ExitCode -ne 0) { throw "run-android failed with exit code $($p.ExitCode)" }

Log "✅ App built, installed, and launched."
Log "Logs saved to: $logFile"
taskkill /F /IM node.exe /T 2>$null
taskkill /F /IM java.exe /T 2>$null
adb kill-server 2>$null | Out-Null
adb start-server 2>$null | Out-Null
adb reverse --remove-all 2>$null | Out-Null

Write-Host "▶ Starting Metro bundler (new window) with cache reset..."
$projectRoot = (Get-Location).Path
$metroArgs   = 'npx react-native start --reset-cache'
Start-Process -FilePath "powershell" -ArgumentList "-NoExit","-Command",$metroArgs -WorkingDirectory $projectRoot | Out-Null
Write-Host "   [Debug] Metro process started with args: $metroArgs in $projectRoot"

# Wait for Metro to come up on 8081 (max ~90s)
Write-Host "⏳ Waiting for Metro (port 8081) to be ready..."
$deadline = (Get-Date).AddSeconds(90)
$metroUp = $false
while((Get-Date) -lt $deadline) {
  try {
    $tcp = Test-NetConnection -ComputerName localhost -Port 8081 -WarningAction SilentlyContinue
    if ($tcp.TcpTestSucceeded) { $metroUp = $true; break }
  } catch { Start-Sleep -Milliseconds 800 }
  Write-Host "   [Debug] Testing Metro on port 8081..."
  Start-Sleep -Milliseconds 800
}

if (-not $metroUp) {
  Write-Host "⚠ Metro didn't open port 8081 in time. You can still try to continue, but builds may fail."
} else {
  Write-Host "✅ Metro is listening on 8081."
}

# Check for device, then set reverse
Write-Host "🔌 Checking ADB device & setting reverse..."
$devices = & adb devices
Write-Host "   [Debug] Raw adb devices output:"
$devices -split "`n" | ForEach-Object { Write-Host "      $_" }
$hasDevice = ($devices -split "`n" | Where-Object { $_ -match "\sdevice$" }) -ne $null
Write-Host "   [Debug] Has device? $hasDevice"
if (-not $hasDevice) {
  Write-Host "⚠ No device detected. Plug in phone, enable USB debugging, accept the prompt, then re-run."
  exit 1
}
adb reverse tcp:8081 tcp:8081 2>$null | Out-Null

# Optional: show concise env
Write-Host "🧩 Tooling versions:"
try { Write-Host ("  Node: " + (& node -v)) } catch {}
try { Write-Host ("  npm : " + (& npm -v)) } catch {}
try { Write-Host ("  ADB : " + (& adb version | Select-Object -First 1)) } catch {}

# Build & run
Write-Host "🚀 Building and launching Android app..."
$env:CI="false"
$exitCode = 0
try {
  npx react-native run-android
  $exitCode = $LASTEXITCODE
} catch {
  $exitCode = 1
}

if ($exitCode -eq 0) {
  Write-Host "🎉 App launched successfully on device!"
} else {
  Write-Host "❌ Build/launch failed. Check the terminal above for errors."
}
exit $exitCode