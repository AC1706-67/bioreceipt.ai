#!/bin/bash

# 🚀 BioPulse.AI Testing Setup Script
# Prepares the environment for internal testing builds

echo "🚀 Setting up BioPulse.AI for internal testing..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the HealthyTipApp directory"
    exit 1
fi

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Step 2: Check for .env file
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file from template..."
    cp .env.example .env
    echo "📝 Please edit .env file with your Supabase credentials:"
    echo "   - EXPO_PUBLIC_SUPABASE_URL"
    echo "   - EXPO_PUBLIC_SUPABASE_ANON_KEY"
    echo ""
    echo "🔗 Get these from: https://supabase.com/dashboard"
    echo ""
    read -p "Press Enter after updating .env file..."
else
    echo "✅ .env file already exists"
fi

# Step 3: Verify Supabase configuration
echo "🔍 Checking Supabase configuration..."
if grep -q "your-project" .env; then
    echo "⚠️  Warning: .env file still contains placeholder values"
    echo "   Please update with your actual Supabase credentials"
fi

# Step 4: Install iOS dependencies (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Installing iOS dependencies..."
    cd ios
    if command -v pod &> /dev/null; then
        pod install
        echo "✅ iOS dependencies installed"
    else
        echo "⚠️  CocoaPods not found. Install with: sudo gem install cocoapods"
    fi
    cd ..
else
    echo "⏭️  Skipping iOS setup (macOS required)"
fi

# Step 5: Verify Android setup
echo "🤖 Checking Android setup..."
if [ -d "$ANDROID_HOME" ]; then
    echo "✅ Android SDK found at: $ANDROID_HOME"
else
    echo "⚠️  ANDROID_HOME not set. Please install Android Studio and set ANDROID_HOME"
fi

# Step 6: Create build directories
echo "📁 Creating build directories..."
mkdir -p android/app/build/outputs/apk/debug
mkdir -p android/app/build/outputs/apk/release

# Step 7: Set permissions
echo "🔧 Setting permissions..."
chmod +x android/gradlew

# Step 8: Test basic functionality
echo "🧪 Testing basic setup..."
npm run type-check

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful"
else
    echo "⚠️  TypeScript compilation issues detected"
fi

echo ""
echo "🎉 Setup complete! Next steps:"
echo ""
echo "📱 For Android testing:"
echo "   ./android/gradlew assembleDebug"
echo "   adb install android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "🍎 For iOS testing:"
echo "   npx react-native run-ios"
echo "   Or open ios/HealthyTipApp.xcworkspace in Xcode"
echo ""
echo "📖 Full instructions: See INTERNAL_TEST_BUILDS_GUIDE.md"
echo ""
echo "🔗 Don't forget to:"
echo "   1. Set up your Supabase project"
echo "   2. Run the database schema from database/schema.sql"
echo "   3. Update .env with your Supabase credentials"