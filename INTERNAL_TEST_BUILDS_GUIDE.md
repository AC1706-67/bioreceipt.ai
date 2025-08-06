# 🚀 BioPulse.AI Internal Test Builds Guide

**Date:** August 1, 2025  
**Version:** 3.0.0  
**Status:** Ready for Internal Testing

---

## 📋 **OVERVIEW**

This guide will help you generate internal test builds for BioPulse.AI on both Android and iOS platforms. These builds are connected to the production Supabase database and include all Phase 4 MVP features.

---

## 🤖 **ANDROID BUILD SETUP**

### **Prerequisites**
- Android Studio installed
- Java Development Kit (JDK) 11 or higher
- Android SDK with API level 33+
- React Native CLI

### **Step 1: Prepare Environment**
```bash
cd HealthyTipApp

# Install dependencies
npm install --legacy-peer-deps

# Create .env file with your Supabase credentials
cp .env.example .env
# Edit .env with your actual Supabase URL and keys
```

### **Step 2: Generate Debug APK (Fastest)**
```bash
# Generate debug APK (no signing required)
npx react-native build-android --mode=debug

# APK will be generated at:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### **Step 3: Generate Release APK (Production-like)**
```bash
# Generate release APK
npx react-native build-android --mode=release

# APK will be generated at:
# android/app/build/outputs/apk/release/app-release.apk
```

### **Step 4: Install APK on Android Device**

#### **Method 1: Direct Installation**
1. **Enable Developer Options** on your Android device:
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times
   - Go back to Settings > Developer Options
   - Enable "USB Debugging"

2. **Install via ADB:**
```bash
# Connect device via USB
adb devices

# Install the APK
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

#### **Method 2: Manual Installation**
1. Copy the APK file to your Android device
2. Open file manager and tap the APK
3. Allow "Install from Unknown Sources" if prompted
4. Tap "Install"

---

## 🍎 **iOS BUILD SETUP**

### **Prerequisites**
- macOS with Xcode 14+
- Apple Developer Account ($99/year)
- iOS device for testing

### **Step 1: Apple Developer Setup**
1. **Sign up for Apple Developer Program:**
   - Go to [developer.apple.com](https://developer.apple.com)
   - Enroll in the Apple Developer Program ($99/year)
   - Complete verification process

2. **Configure Xcode:**
   - Open Xcode
   - Go to Preferences > Accounts
   - Add your Apple ID
   - Download certificates and profiles

### **Step 2: Configure iOS Project**
```bash
cd HealthyTipApp

# Install iOS dependencies
cd ios && pod install && cd ..

# Open iOS project in Xcode
open ios/HealthyTipApp.xcworkspace
```

### **Step 3: Xcode Configuration**
1. **In Xcode:**
   - Select your project in the navigator
   - Go to "Signing & Capabilities"
   - Select your Team (Apple Developer Account)
   - Change Bundle Identifier to unique ID (e.g., com.yourname.biopulse)
   - Ensure "Automatically manage signing" is checked

2. **Update App Information:**
   - Display Name: "BioPulse.AI"
   - Version: 3.0.0
   - Build: 1

### **Step 4: Build for TestFlight**
```bash
# Build release version
npx react-native build-ios --mode=Release

# Or build in Xcode:
# Product > Archive
```

### **Step 5: Upload to TestFlight**
1. **In Xcode:**
   - After successful archive, Organizer opens
   - Select your archive
   - Click "Distribute App"
   - Choose "App Store Connect"
   - Upload to TestFlight

2. **In App Store Connect:**
   - Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Select your app
   - Go to TestFlight tab
   - Wait for processing (10-30 minutes)
   - Add internal testers

---

## 🔧 **REQUIRED CONFIGURATION FILES**

### **1. Update Android Manifest**
Edit `android/app/src/main/AndroidManifest.xml`:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW"/>
    
    <application
        android:name=".MainApplication"
        android:label="BioPulse.AI"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:allowBackup="false"
        android:theme="@style/AppTheme">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/LaunchTheme">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

### **2. Update iOS Info.plist**
Edit `ios/HealthyTipApp/Info.plist`:
```xml
<key>CFBundleDisplayName</key>
<string>BioPulse.AI</string>
<key>CFBundleIdentifier</key>
<string>com.biopulse.app</string>
<key>CFBundleVersion</key>
<string>1</string>
<key>CFBundleShortVersionString</key>
<string>3.0.0</string>
```

---

## 🧪 **TESTING INSTRUCTIONS**

### **Pre-Testing Setup**
1. **Set up Supabase:**
   - Create account at [supabase.com](https://supabase.com)
   - Create new project
   - Run the SQL from `database/schema.sql`
   - Copy URL and anon key to `.env` file

2. **Verify Environment:**
```bash
# Check if .env is configured
cat .env

# Should show:
# EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### **Testing Checklist**

#### **Authentication Testing**
- [ ] **Sign Up Flow:**
  - Open app
  - Tap "Sign Up"
  - Fill in name, email, age, password
  - Accept terms and conditions
  - Tap "Create Account"
  - Verify account creation

- [ ] **Sign In Flow:**
  - Tap "Sign In"
  - Enter email and password
  - Tap "Sign In"
  - Verify successful login

- [ ] **Password Reset:**
  - Tap "Forgot Password"
  - Enter email address
  - Tap "Send Reset Email"
  - Check email for reset link

#### **Substance Logging Testing**
- [ ] **Log Intake:**
  - Navigate to logging screen
  - Select a substance (e.g., "Coffee")
  - Enter quantity (e.g., "250")
  - Verify unit (e.g., "ml")
  - Add notes (optional)
  - Tap "Log Intake"
  - Verify success message

- [ ] **View History:**
  - Scroll to "Recent Intakes" section
  - Verify logged intake appears
  - Check timestamp and details
  - Test delete functionality

- [ ] **Quick Log:**
  - Use quick action buttons
  - Verify pre-filled data
  - Complete logging

#### **Accessibility Testing**
- [ ] **Screen Reader:**
  - Enable VoiceOver (iOS) or TalkBack (Android)
  - Navigate through all screens
  - Verify all elements are announced
  - Test form completion with screen reader

- [ ] **Keyboard Navigation:**
  - Connect external keyboard
  - Navigate using Tab key
  - Verify all interactive elements are reachable

### **Bug Reporting Template**
```
**Bug Report**
- Device: [iPhone 14 Pro / Samsung Galaxy S23]
- OS Version: [iOS 16.5 / Android 13]
- App Version: 3.0.0
- Steps to Reproduce:
  1. 
  2. 
  3. 
- Expected Result:
- Actual Result:
- Screenshots: [attach if applicable]
```

---

## 👥 **ADDING TESTERS**

### **Android Testers**
1. **Share APK file directly:**
   - Send APK via email/cloud storage
   - Provide installation instructions
   - Include testing checklist

2. **Google Play Console (Optional):**
   - Upload APK to Google Play Console
   - Create internal testing track
   - Add tester email addresses

### **iOS TestFlight Testers**
1. **In App Store Connect:**
   - Go to TestFlight > Internal Testing
   - Click "+" to add testers
   - Enter email addresses
   - Testers receive invitation email

2. **Tester Instructions:**
   - Install TestFlight app from App Store
   - Accept invitation email
   - Install BioPulse.AI from TestFlight
   - Provide feedback through TestFlight

---

## 📊 **FEEDBACK COLLECTION**

### **Built-in Feedback**
- App includes error reporting
- Supabase analytics track usage
- Crash reports automatically collected

### **Manual Feedback Collection**
1. **Create feedback form:**
   - Google Forms or Typeform
   - Include testing checklist
   - Ask for specific feedback on features

2. **Regular check-ins:**
   - Weekly tester calls
   - Slack/Discord channel for testers
   - Bug tracking in GitHub Issues

---

## 🚨 **TROUBLESHOOTING**

### **Common Android Issues**
- **Build fails:** Check Android SDK and Java versions
- **APK won't install:** Enable "Unknown Sources" in settings
- **App crashes:** Check device logs with `adb logcat`

### **Common iOS Issues**
- **Signing errors:** Verify Apple Developer account and certificates
- **Archive fails:** Check Xcode project settings and dependencies
- **TestFlight upload fails:** Check app metadata and compliance

### **Database Connection Issues**
- **Auth fails:** Verify Supabase URL and keys in `.env`
- **Data not saving:** Check network connection and Supabase status
- **RLS errors:** Verify database policies are correctly set up

---

## 🎯 **SUCCESS CRITERIA**

### **Ready for Public Launch When:**
- [ ] 5+ testers complete full user journey
- [ ] No critical bugs reported
- [ ] Authentication works 100% reliably
- [ ] Substance logging works across all devices
- [ ] Accessibility testing passes
- [ ] Performance is acceptable (<3 second load times)

### **Metrics to Track:**
- User registration success rate
- Login success rate
- Substance logging completion rate
- App crash rate
- User feedback scores

---

## 📞 **SUPPORT**

### **For Build Issues:**
- Check React Native documentation
- Verify all dependencies are installed
- Ensure environment variables are set

### **For Testing Issues:**
- Provide detailed bug reports
- Include device information
- Share screenshots/videos when possible

---

**🎉 Ready to get BioPulse.AI in users' hands! Start with the Android debug build for fastest testing.**