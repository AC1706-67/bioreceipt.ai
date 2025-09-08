# Simple React Native App Starter
Write-Host "🚀 Starting BioReceipt App..."

# Kill any existing processes
taskkill /F /IM node.exe /T 2>$null
taskkill /F /IM java.exe /T 2>$null

# Wait a moment
Start-Sleep -Seconds 2

# Start Metro in background
Write-Host "📱 Starting Metro bundler..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npx react-native start --reset-cache"

# Wait for Metro to start
Start-Sleep -Seconds 8

# Build and run Android
Write-Host "🔨 Building Android app..."
npx react-native run-android

Write-Host "✅ Done! Your app should be running."