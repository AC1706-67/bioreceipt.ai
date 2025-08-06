@echo off
REM BioPulse.AI Testing Setup Script for Windows
REM Prepares the environment for internal testing builds

echo 🚀 Setting up BioPulse.AI for internal testing...

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Please run this script from the HealthyTipApp directory
    pause
    exit /b 1
)

REM Step 1: Install dependencies
echo 📦 Installing dependencies...
call npm install --legacy-peer-deps

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

REM Step 2: Check for .env file
if not exist ".env" (
    echo ⚙️  Creating .env file from template...
    copy .env.example .env
    echo 📝 Please edit .env file with your Supabase credentials:
    echo    - EXPO_PUBLIC_SUPABASE_URL
    echo    - EXPO_PUBLIC_SUPABASE_ANON_KEY
    echo.
    echo 🔗 Get these from: https://supabase.com/dashboard
    echo.
    pause
) else (
    echo ✅ .env file already exists
)

REM Step 3: Create build directories
echo 📁 Creating build directories...
if not exist "android\app\build\outputs\apk\debug" mkdir android\app\build\outputs\apk\debug
if not exist "android\app\build\outputs\apk\release" mkdir android\app\build\outputs\apk\release

REM Step 4: Test basic functionality
echo 🧪 Testing basic setup...
call npm run type-check

if %errorlevel% equ 0 (
    echo ✅ TypeScript compilation successful
) else (
    echo ⚠️  TypeScript compilation issues detected
)

echo.
echo 🎉 Setup complete! Next steps:
echo.
echo 📱 For Android testing:
echo    cd android
echo    gradlew assembleDebug
echo    adb install app\build\outputs\apk\debug\app-debug.apk
echo.
echo 📖 Full instructions: See INTERNAL_TEST_BUILDS_GUIDE.md
echo.
echo 🔗 Don't forget to:
echo    1. Set up your Supabase project
echo    2. Run the database schema from database/schema.sql
echo    3. Update .env with your Supabase credentials
echo.
pause