# Android Build & Deployment Task List

## 🎯 **Goal:** Get BioReceipt app building and running on Motorola Razr

### **Phase 1: Environment Setup**
- [x] 1.1 Switch to Node 20 LTS (from current Node 22) - *Skipped: Node 22 works fine*
- [x] 1.2 Verify Node version and npm functionality
- [x] 1.3 Clean and reinstall dependencies
- [x] 1.4 Run React Native doctor diagnostics

### **Phase 2: Device Connection**
- [x] 2.1 Enable USB Debugging on Motorola Razr
- [x] 2.2 Connect device and verify ADB recognition
- [x] 2.3 Test ADB connection and device communication

### **Phase 3: Build Environment**
- [x] 3.1 Clean Android build cache
- [x] 3.2 Verify Gradle wrapper functionality
- [x] 3.3 Test Android SDK and build tools

### **Phase 4: Metro & Development Server**
- [x] 4.1 Start Metro bundler with cache reset
- [x] 4.2 Set up ADB port forwarding (8081)
- [x] 4.3 Verify Metro is serving correctly

### **Phase 5: Build & Deploy**
- [x] 5.1 Build Android APK
- [x] 5.2 Install app on device
- [x] 5.3 Launch and verify app functionality
- [ ] 5.4 Test hot reload and development workflow

### **Phase 6: Troubleshooting & Optimization**
- [ ] 6.1 Verify app package installation
- [ ] 6.2 Test manual app launch
- [ ] 6.3 Set up development workflow commands

---

## 📋 **Current Status:** Ready to start Phase 1
**Next Task:** Switch to Node 20 LTS

---

## 🚀 **Quick Commands Reference**
```powershell
# Node Version Management
nvm list
nvm install 20.18.0
nvm use 20.18.0

# Project Setup
cd BioReceipt
npm install
npx react-native doctor

# Device Connection
adb devices
adb reverse tcp:8081 tcp:8081

# Build & Deploy
npx react-native start --reset-cache
npx react-native run-android --device
```