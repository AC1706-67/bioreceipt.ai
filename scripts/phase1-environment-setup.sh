#!/bin/bash

# Phase 1 — Environment Sanity Setup Script
# Ensures Node.js 20 LTS and clean dependency installation for React Native

echo "🚀 Phase 1 - Environment Sanity Setup"
echo "====================================="

# Check if nvm is available
if command -v nvm &> /dev/null; then
    echo "✓ NVM detected"
    NVM_AVAILABLE=true
else
    echo "⚠️  NVM not detected - will check Node version directly"
    NVM_AVAILABLE=false
fi

# Step 1: Lock Node to 20 LTS (RN-friendly)
echo ""
echo "📦 Step 1: Setting up Node.js 20 LTS..."

if [ "$NVM_AVAILABLE" = true ]; then
    echo "Installing Node.js 20.18.0 via NVM..."
    nvm install 20.18.0
    
    echo "Switching to Node.js 20.18.0..."
    nvm use 20.18.0
else
    echo "NVM not available. Please ensure Node.js 20.x is installed manually."
    echo "Download from: https://nodejs.org/en/download/"
fi

# Verify Node version
echo ""
echo "🔍 Verifying Node.js version..."
NODE_VERSION=$(node -v)
echo "Current Node.js version: $NODE_VERSION"

if [[ $NODE_VERSION == v20.* ]]; then
    echo "✓ Node.js 20.x detected - React Native compatible!"
else
    echo "⚠️  Warning: Node.js version is not 20.x. React Native works best with Node 20 LTS."
    echo "Consider switching to Node.js 20.x for optimal compatibility."
fi

# Step 2: Clean + reinstall deps
echo ""
echo "🧹 Step 2: Cleaning and reinstalling dependencies..."

# Remove node_modules directory
if [ -d "node_modules" ]; then
    echo "Removing existing node_modules directory..."
    rm -rf node_modules
    echo "✓ node_modules removed"
else
    echo "✓ No existing node_modules directory found"
fi

# Remove package-lock.json if it exists
if [ -f "package-lock.json" ]; then
    echo "Removing existing package-lock.json..."
    rm -f package-lock.json
    echo "✓ package-lock.json removed"
else
    echo "✓ No existing package-lock.json found"
fi

# Install dependencies with npm ci
echo ""
echo "📥 Installing dependencies with npm ci..."
echo "This ensures a clean, reproducible installation from package-lock.json"

if npm ci; then
    echo "✓ Dependencies installed successfully!"
else
    echo "❌ npm ci failed. Trying npm install as fallback..."
    if npm install; then
        echo "✓ Dependencies installed with npm install"
    else
        echo "❌ Both npm ci and npm install failed. Please check your package.json"
        exit 1
    fi
fi

# Final verification
echo ""
echo "🎉 Phase 1 Environment Setup Complete!"
echo "======================================="

echo ""
echo "📋 Summary:"
echo "• Node.js version: $(node -v)"
echo "• NPM version: $(npm -v)"
echo "• Dependencies: Freshly installed"
echo "• Environment: Ready for React Native development"

echo ""
echo "🚀 Next Steps:"
echo "• Run 'npm start' to start the Metro bundler"
echo "• Run 'npm run android' or 'npm run ios' to launch the app"
echo "• Your environment is now React Native ready!"