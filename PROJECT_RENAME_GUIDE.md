# 🔄 BioPulse Project Rename Guide

## 📋 Complete Renaming Checklist

### **Step 1: Folder Structure Rename** 🗂️

**Manual Actions Required:**
1. **Close VS Code/IDE** completely
2. **In File Explorer**, navigate to `C:\Users\andre\Documents\`
3. **Rename folder**: `health_tip_app` → `bio_pulse_app`
4. **Re-open the project** in VS Code from the new location

**New Project Path:**
```
C:\Users\andre\Documents\bio_pulse_app\BioPulseApp\
```

### **Step 2: Package.json Updates** 📦

Update the main package.json file with new project identity:

```json
{
  "name": "bio-pulse-app",
  "displayName": "BioPulse.AI",
  "version": "3.0.0",
  "description": "AI-powered health insights and predictive analytics platform",
  "main": "index.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "jest",
    "test:biopulse-phase3": "node src/utils/bioPulsePhase3Test.ts",
    "test:diagnostics": "node src/utils/bioPulseDiagnostics.ts",
    "build": "expo build",
    "eject": "expo eject"
  },
  "keywords": [
    "health",
    "ai",
    "predictive-analytics",
    "wearables",
    "biometrics",
    "substance-tracking",
    "biopulse"
  ],
  "author": "BioPulse Team",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/bio-pulse-app.git"
  },
  "homepage": "https://biopulse.ai"
}
```

### **Step 3: Configuration Files Updates** ⚙️

#### **app.json / app.config.js**
```json
{
  "expo": {
    "name": "BioPulse.AI",
    "slug": "bio-pulse-app",
    "version": "3.0.0",
    "orientation": "portrait",
    "icon": "./assets/biopulse-icon.png",
    "splash": {
      "image": "./assets/biopulse-splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1a365d"
    },
    "updates": {
      "fallbackToCacheTimeout": 0
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.biopulse.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/biopulse-adaptive-icon.png",
        "backgroundColor": "#1a365d"
      },
      "package": "com.biopulse.app"
    },
    "web": {
      "favicon": "./assets/biopulse-favicon.png"
    }
  }
}
```

#### **tsconfig.json**
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@components/*": ["components/*"],
      "@services/*": ["services/*"],
      "@models/*": ["models/*"],
      "@utils/*": ["utils/*"],
      "@constants/*": ["constants/*"]
    }
  },
  "include": [
    "src/**/*",
    "App.tsx"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

### **Step 4: Updated Test Commands** 🧪

**New command paths after rename:**
```bash
# Navigate to new project location
cd C:\Users\andre\Documents\bio_pulse_app\BioPulseApp

# Run Phase 3 test suite
node src/utils/bioPulsePhase3Test.ts

# Run diagnostics
node src/utils/bioPulseDiagnostics.ts

# Run all tests
npm test

# Start development server
npm start
```

### **Step 5: Environment & IDE Settings** 🔧

#### **VS Code Workspace Settings** (`.vscode/settings.json`)
```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.exclude": {
    "node_modules": true,
    ".expo": true,
    "dist": true
  },
  "search.exclude": {
    "node_modules": true,
    ".expo": true,
    "dist": true
  }
}
```

#### **Launch Configuration** (`.vscode/launch.json`)
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "BioPulse Debug",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/utils/bioPulsePhase3Test.ts",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### **Step 6: Git Repository Updates** 📝

If you have a git repository, update these files:

#### **README.md**
```markdown
# 🧬 BioPulse.AI

AI-powered health insights and predictive analytics platform with wearable device integration.

## 🚀 Features

- **Predictive Analytics**: ML-powered 24-hour health forecasting
- **Wearable Integration**: Apple Health, Google Fit, Fitbit, Oura support
- **Real-time Monitoring**: Continuous biometric tracking
- **AI Insights**: Natural language health recommendations
- **Safety Alerts**: Proactive risk management

## 🏃‍♂️ Quick Start

```bash
cd bio_pulse_app/BioPulseApp
npm install
npm start
```

## 🧪 Testing

```bash
# Run Phase 3 test suite
node src/utils/bioPulsePhase3Test.ts

# Run diagnostics
node src/utils/bioPulseDiagnostics.ts
```
```

#### **.gitignore** (if needed)
```
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Expo
.expo/
dist/
web-build/

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

### **Step 7: Documentation Updates** 📚

Update all documentation files to reflect the new branding:

- All `BIOPULSE_*.md` files ✅ (Already correctly named)
- Update any references to "HealthyTipApp" in documentation
- Update file paths in documentation to reflect new structure

### **Step 8: Verification Checklist** ✅

After completing the rename:

- [ ] Project opens correctly in new location
- [ ] `npm install` runs without errors
- [ ] `npm start` launches the app successfully
- [ ] Test command works: `node src/utils/bioPulsePhase3Test.ts`
- [ ] All imports resolve correctly
- [ ] No broken file references
- [ ] Git repository (if applicable) tracks changes correctly

## 🎯 **IMMEDIATE ACTION PLAN**

1. **Close VS Code** completely
2. **Rename folder** in File Explorer: `health_tip_app` → `bio_pulse_app`
3. **Re-open project** from new location
4. **Update package.json** with the configuration above
5. **Test the rename** with: `cd C:\Users\andre\Documents\bio_pulse_app\BioPulseApp && node src/utils/bioPulsePhase3Test.ts`

## 🚀 **Post-Rename Next Steps**

Once the rename is complete, you can immediately run:

```bash
cd C:\Users\andre\Documents\bio_pulse_app\BioPulseApp
node src/utils/bioPulsePhase3Test.ts
```

This will execute your Phase 3 test suite and validate that everything is working correctly with the new project structure!

---

**Ready to proceed with the rename?** Follow the steps above, and then we can run the comprehensive test suite to validate your BioPulse system! 🎉