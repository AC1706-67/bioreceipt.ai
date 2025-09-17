# scripts/dev-reset.ps1
taskkill /F /IM node.exe /T 2>$null
taskkill /F /IM adb.exe 2>$null

npm cache clean --force

if (Test-Path .\android\.gradle) { Remove-Item .\android\.gradle -Recurse -Force }
if (Test-Path .\android\app\build) { Remove-Item .\android\app\build -Recurse -Force }
if (Test-Path .\node_modules) { Remove-Item .\node_modules -Recurse -Force }

npm install --legacy-peer-deps

Start-Process powershell -ArgumentList "cd `"$PWD`"; npx react-native start --reset-cache"

# give Metro a moment to warm up
Start-Sleep -Seconds 5

npx react-native run-android
