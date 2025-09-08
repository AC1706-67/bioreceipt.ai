# Clean up all React Native and development processes

Write-Host "🧹 Cleaning up all development processes..."

# Kill Node.js processes (Metro bundler, etc.)
Write-Host "  Stopping Node.js processes..."
taskkill /F /IM node.exe /T 2>$null

# Kill Java processes (Android build tools)
Write-Host "  Stopping Java processes..."
taskkill /F /IM java.exe /T 2>$null

# Kill ADB server
Write-Host "  Stopping ADB server..."
adb kill-server 2>$null

# Remove port forwards
Write-Host "  Removing port forwards..."
adb reverse --remove-all 2>$null

# Kill any PowerShell windows that might be running Metro
Write-Host "  Checking for Metro PowerShell windows..."
Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { 
    $_.MainWindowTitle -like "*react-native*" -or 
    $_.MainWindowTitle -like "*Metro*" -or
    $_.MainWindowTitle -like "*npm*"
} | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "✅ Cleanup complete! All development processes stopped."
Write-Host ""
Write-Host "💡 To restart development:"
Write-Host "   Run: .\scripts\start-all.ps1"