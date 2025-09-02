# Phase 1 — Environment Sanity Setup Script
# Ensures Node.js 20 LTS and clean dependency installation for React Native

Write-Host "🚀 Phase 1 - Environment Sanity Setup" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Step 1: Check Node version
Write-Host "`n📦 Step 1: Checking Node.js version..." -ForegroundColor Cyan

$nodeVersion = node -v
Write-Host "Current Node.js version: $nodeVersion" -ForegroundColor Green

if ($nodeVersion -match "^v20\.") {
    Write-Host "✓ Node.js 20.x detected - React Native compatible!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Warning: Node.js version is not 20.x. React Native works best with Node 20 LTS." -ForegroundColor Yellow
    Write-Host "Please install Node.js 20.x from: https://nodejs.org/en/download/" -ForegroundColor Yellow
}

# Step 2: Clean dependencies
Write-Host "`n🧹 Step 2: Cleaning existing dependencies..." -ForegroundColor Cyan

if (Test-Path "node_modules") {
    Write-Host "Removing existing node_modules directory..."
    Remove-Item -Recurse -Force "node_modules"
    Write-Host "✓ node_modules removed" -ForegroundColor Green
} else {
    Write-Host "✓ No existing node_modules directory found" -ForegroundColor Green
}

if (Test-Path "package-lock.json") {
    Write-Host "Removing existing package-lock.json..."
    Remove-Item -Force "package-lock.json"
    Write-Host "✓ package-lock.json removed" -ForegroundColor Green
} else {
    Write-Host "✓ No existing package-lock.json found" -ForegroundColor Green
}

# Step 3: Install dependencies
Write-Host "`n📥 Step 3: Installing dependencies..." -ForegroundColor Cyan
Write-Host "Running npm ci for clean installation..." -ForegroundColor Gray

npm ci

Write-Host "`n🎉 Phase 1 Environment Setup Complete!" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

Write-Host "`n📋 Summary:"
Write-Host "• Node.js version: $(node -v)"
Write-Host "• NPM version: $(npm -v)"
Write-Host "• Dependencies: Freshly installed"
Write-Host "• Environment: Ready for React Native development"

Write-Host "`n🚀 Next Steps:"
Write-Host "• Run 'npm start' to start the Metro bundler"
Write-Host "• Run 'npm run android' or 'npm run ios' to launch the app"
Write-Host "• Your environment is now React Native ready!"