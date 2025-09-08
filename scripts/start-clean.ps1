# --- start-clean.ps1 ---
# Stop leftovers (ignore errors)
$ErrorActionPreference = "SilentlyContinue"
taskkill /F /IM node.exe /T 2>$null
taskkill /F /IM java.exe /T 2>$null
adb kill-server 2>$null | Out-Null
$ErrorActionPreference = "Stop"

Write-Host "Cleaning node_modules and npm cache..."
if (Test-Path node_modules) { Remove-Item -Recurse -Force node_modules }
if (Test-Path package-lock.json) { Remove-Item -Force package-lock.json }
npm cache clean --force

Write-Host "Installing dependencies..."
npm install
npm install react-native-get-random-values

Write-Host "Cleaning Android build..."
pushd android
./gradlew clean
popd

Write-Host "Starting Metro in a new window (with cache reset)..."
$metroArgs = 'npx react-native start --reset-cache'
Start-Process -FilePath "powershell" -ArgumentList "-NoExit","-Command",$metroArgs -WorkingDirectory (Get-Location)

Write-Host "Starting ADB and reversing port 8081..."
adb start-server
adb reverse tcp:8081 tcp:8081

Write-Host "Checking device authorization..."
$devices = (adb devices) -split "`n" | Select-String "device$|unauthorized" | ForEach-Object { $_.ToString().Trim() }
$unauth = $devices | Select-String "unauthorized"
if ($unauth) {
    Write-Warning "Your phone is 'unauthorized'."
    Write-Host "On your phone: unlock it, enable Developer Options + USB debugging, and tap 'Allow' on the RSA prompt."
    Read-Host "Press Enter after authorizing, then I'll recheck..."
    adb devices | Out-Host
}

Write-Host "Building and installing Android app..."
npx react-native run-android

Write-Host "SUCCESS: Done. Metro is running in the other window. If the app doesn't reload, press 'r' in the Metro window."
# --- end ---