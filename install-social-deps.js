#!/usr/bin/env node

/**
 * Install Social Dependencies Script
 * Installs required dependencies for social features
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Installing social feature dependencies...');

try {
  // Check if this is an Expo project
  const appJsonPath = path.join(__dirname, 'app.json');
  const isExpo = fs.existsSync(appJsonPath);

  if (isExpo) {
    console.log('📱 Detected Expo project, installing with Expo CLI...');
    
    // Install react-native-svg with Expo
    execSync('npx expo install react-native-svg', { stdio: 'inherit' });
    
    // Install react-native-chart-kit with npm
    execSync('npm install react-native-chart-kit', { stdio: 'inherit' });
  } else {
    console.log('⚛️  Detected bare React Native project, installing with npm...');
    
    // Install both packages with npm
    execSync('npm install react-native-chart-kit react-native-svg', { stdio: 'inherit' });
    
    // For bare React Native, you might need to run pod install on iOS
    if (process.platform === 'darwin') {
      const iosPath = path.join(__dirname, 'ios');
      if (fs.existsSync(iosPath)) {
        console.log('🍎 Running pod install for iOS...');
        execSync('cd ios && pod install', { stdio: 'inherit' });
      }
    }
  }

  console.log('✅ Social feature dependencies installed successfully!');
  console.log('');
  console.log('📋 Next steps:');
  console.log('1. Run your tests: npm test');
  console.log('2. Start your development server');
  console.log('3. Test the social features in your app');

} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  console.log('');
  console.log('🔧 Manual installation:');
  console.log('For Expo projects:');
  console.log('  npx expo install react-native-svg');
  console.log('  npm install react-native-chart-kit');
  console.log('');
  console.log('For bare React Native:');
  console.log('  npm install react-native-chart-kit react-native-svg');
  console.log('  cd ios && pod install  # iOS only');
  
  process.exit(1);
}