# 🚀 BioReceipt.AI Build Scripts

Quick commands to generate test builds for internal testing.

## 📱 **ANDROID BUILDS**

### **Debug Build (Fastest)**
```bash
# Navigate to project
cd BioReceipt

# Clean previous builds
npx react-native clean

# Install dependencies
npm install --legacy-peer-deps

# Generate debug APK
cd android
./gradlew assembleDebug

# APK location: android/app/build/outputs/apk/debug/app-debug.apk
```

### **Release Build (Production-like)**
```bash
# Generate release APK
cd android
./gradlew assembleRelease

# APK location: android/app/build/outputs/apk/release/app-release.apk
```

### **Install on Connected Device**
```bash
# Install debug version
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Install release version
adb install android/app/build/outputs/apk/release/app-release.apk
```

## 🍎 **iOS BUILDS**

### **Debug Build**
```bash
# Navigate to project
cd BioReceipt

# Install iOS dependencies
cd ios && pod install && cd ..

# Build for simulator
npx react-native run-ios

# Build for device
npx react-native run-ios --device
```

### **Release Build for TestFlight**
```bash
# Build release version
npx react-native build-ios --mode=Release

# Or use Xcode:
# 1. Open ios/BioReceipt.xcworkspace
# 2. Product > Archive
# 3. Distribute to App Store Connect
```

## 🔧 **BUILD TROUBLESHOOTING**

### **Android Issues**
```bash
# Clean everything
npx react-native clean
cd android && ./gradlew clean && cd ..

# Reset Metro cache
npx react-native start --reset-cache

# Fix permission issues
chmod +x android/gradlew
```

### **iOS Issues**
```bash
# Clean iOS build
cd ios && xcodebuild clean && cd ..

# Reset pods
cd ios && rm -rf Pods && pod install && cd ..

# Reset derived data
rm -rf ~/Library/Developer/Xcode/DerivedData
```

## 📦 **AUTOMATED BUILD SCRIPT**

Create `build-internal.sh`:
```bash
#!/bin/bash

echo "🚀 Building BioReceipt.AI Internal Test Builds"

# Clean and prepare
npx react-native clean
npm install --legacy-peer-deps

# Build Android Debug
echo "📱 Building Android Debug APK..."
cd android
./gradlew assembleDebug
cd ..

# Build Android Release
echo "📱 Building Android Release APK..."
cd android
./gradlew assembleRelease
cd ..

echo "✅ Android builds complete!"
echo "Debug APK: android/app/build/outputs/apk/debug/app-debug.apk"
echo "Release APK: android/app/build/outputs/apk/release/app-release.apk"

# Build iOS (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Building iOS..."
    cd ios && pod install && cd ..
    npx react-native build-ios --mode=Release
    echo "✅ iOS build complete!"
else
    echo "⏭️  Skipping iOS build (macOS required)"
fi

echo "🎉 All builds complete! Ready for testing."
```

Make executable:
```bash
chmod +x build-internal.sh
./build-internal.sh
```