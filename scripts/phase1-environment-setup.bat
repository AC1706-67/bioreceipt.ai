@echo off
echo 🚀 Phase 1 - Environment Sanity Setup
echo =====================================

echo.
echo 📦 Step 1: Checking Node.js version...
node -v
echo Current Node.js version detected

echo.
echo 🧹 Step 2: Cleaning existing dependencies...
if exist "node_modules" (
    echo Removing existing node_modules directory...
    rmdir /s /q "node_modules"
    echo ✓ node_modules removed
) else (
    echo ✓ No existing node_modules directory found
)

if exist "package-lock.json" (
    echo Removing existing package-lock.json...
    del /f "package-lock.json"
    echo ✓ package-lock.json removed
) else (
    echo ✓ No existing package-lock.json found
)

echo.
echo 📥 Step 3: Installing dependencies...
if exist "package-lock.json" (
    echo Running npm ci for clean installation...
    npm ci
) else (
    echo No package-lock.json found, running npm install...
    npm install
)

echo.
echo 🎉 Phase 1 Environment Setup Complete!
echo =======================================

echo.
echo 📋 Summary:
node -v
npm -v
echo Dependencies: Freshly installed
echo Environment: Ready for React Native development

echo.
echo 🚀 Next Steps:
echo • Run 'npm start' to start the Metro bundler
echo • Run 'npm run android' or 'npm run ios' to launch the app
echo • Your environment is now React Native ready!