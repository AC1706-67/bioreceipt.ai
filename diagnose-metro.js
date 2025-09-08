/**
 * Simple Metro diagnostic script - run with: node diagnose-metro.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 React Native Metro Bundler Diagnostic Tool');
console.log('='.repeat(50));

function safeExec(command) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (error) {
    return null;
  }
}

function checkSystemInfo() {
  console.log('\n📋 System Information:');
  console.log(`Node.js: ${process.version}`);
  
  const npmVersion = safeExec('npm --version');
  console.log(`npm: ${npmVersion || 'Not found'}`);
  
  const yarnVersion = safeExec('yarn --version');
  if (yarnVersion) console.log(`Yarn: ${yarnVersion}`);
  
  const watchmanVersion = safeExec('watchman version');
  console.log(`Watchman: ${watchmanVersion ? 'Available' : 'Not installed'}`);
}

function checkProjectStructure() {
  console.log('\n📁 Project Structure:');
  
  const nodeModules = fs.existsSync('node_modules');
  console.log(`node_modules: ${nodeModules ? '✅ Exists' : '❌ Missing'}`);
  
  const packageJson = fs.existsSync('package.json');
  console.log(`package.json: ${packageJson ? '✅ Exists' : '❌ Missing'}`);
  
  const metroConfig = fs.existsSync('metro.config.js');
  console.log(`metro.config.js: ${metroConfig ? '✅ Exists' : '❌ Missing'}`);
  
  return { nodeModules, packageJson, metroConfig };
}

function checkCriticalPackages() {
  console.log('\n📦 Critical React Native Packages:');
  
  const criticalPackages = [
    'react-native',
    'react-native-gesture-handler',
    'react-native-screens',
    'react-native-safe-area-context',
    '@react-native/metro-config'
  ];
  
  const missing = [];
  
  criticalPackages.forEach(pkg => {
    const exists = fs.existsSync(path.join('node_modules', pkg));
    console.log(`${pkg}: ${exists ? '✅ Installed' : '❌ Missing'}`);
    if (!exists) missing.push(pkg);
  });
  
  return missing;
}

function suggestFixes(projectCheck, missingPackages) {
  console.log('\n🔧 Suggested Fixes:');
  
  if (!projectCheck.nodeModules) {
    console.log('1. ❗ CRITICAL: Install dependencies');
    console.log('   Run: npm install');
    return;
  }
  
  if (missingPackages.length > 0) {
    console.log('2. 📦 Install missing packages:');
    missingPackages.forEach(pkg => {
      console.log(`   npm install ${pkg}`);
    });
  }
  
  console.log('3. 🧹 Clear Metro cache:');
  console.log('   npx react-native start --reset-cache');
  
  console.log('4. 🧹 Clear npm cache:');
  console.log('   npm cache clean --force');
  
  const watchmanVersion = safeExec('watchman version');
  if (watchmanVersion) {
    console.log('5. 🧹 Clear Watchman cache:');
    console.log('   watchman watch-del-all');
  }
  
  console.log('6. 🔄 Restart Metro bundler:');
  console.log('   npx react-native start');
}

function runAutoFix() {
  console.log('\n🤖 Running automatic fixes...');
  
  try {
    console.log('Clearing npm cache...');
    safeExec('npm cache clean --force');
    
    const watchmanVersion = safeExec('watchman version');
    if (watchmanVersion) {
      console.log('Clearing Watchman cache...');
      safeExec('watchman watch-del-all');
    }
    
    console.log('✅ Automatic fixes completed!');
    console.log('💡 Now run: npx react-native start --reset-cache');
    
  } catch (error) {
    console.error('❌ Error during auto-fix:', error.message);
  }
}

// Main diagnostic flow
function main() {
  checkSystemInfo();
  const projectCheck = checkProjectStructure();
  const missingPackages = checkCriticalPackages();
  
  suggestFixes(projectCheck, missingPackages);
  
  console.log('\n❓ Would you like to run automatic fixes? (y/n)');
  console.log('   This will clear caches but won\'t install packages');
  
  // For now, just show the option
  console.log('\n💡 To run auto-fix, add "auto" as argument:');
  console.log('   node diagnose-metro.js auto');
  
  if (process.argv.includes('auto')) {
    runAutoFix();
  }
}

main();