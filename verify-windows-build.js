#!/usr/bin/env node

/**
 * MySafePlay Bridge - Windows Build Verification Script
 * This script verifies that the Windows executable was built correctly
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 MySafePlay Bridge - Windows Build Verification\n');

// Check if executable exists
const exePath = path.join(__dirname, 'dist', 'mysafeplay-bridge-windows.exe');
const zipPath = path.join(__dirname, 'dist', 'mysafeplay-bridge-v1.6.42-alpha.23-windows.zip');

console.log('Checking build artifacts...');

// Verify executable
if (fs.existsSync(exePath)) {
    const stats = fs.statSync(exePath);
    console.log('✅ Windows executable found');
    console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
    console.log(`   Path: ${exePath}`);
} else {
    console.log('❌ Windows executable NOT found');
    console.log(`   Expected: ${exePath}`);
}

// Verify package
if (fs.existsSync(zipPath)) {
    const stats = fs.statSync(zipPath);
    console.log('✅ Windows package found');
    console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
    console.log(`   Path: ${zipPath}`);
} else {
    console.log('❌ Windows package NOT found');
    console.log(`   Expected: ${zipPath}`);
}

// Verify configuration files
const configPath = path.join(__dirname, 'config', 'settings.json');
if (fs.existsSync(configPath)) {
    console.log('✅ Configuration file found');
} else {
    console.log('❌ Configuration file NOT found');
}

// Verify documentation
const docsToCheck = [
    'README.md',
    'WINDOWS_INSTALLATION_GUIDE.md',
    'RELEASE_NOTES.md'
];

console.log('\nChecking documentation...');
docsToCheck.forEach(doc => {
    const docPath = path.join(__dirname, doc);
    if (fs.existsSync(docPath)) {
        console.log(`✅ ${doc} found`);
    } else {
        console.log(`❌ ${doc} NOT found`);
    }
});

// Package.json verification
const packagePath = path.join(__dirname, 'package.json');
if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    console.log('\n📦 Package Information:');
    console.log(`   Name: ${pkg.name}`);
    console.log(`   Version: ${pkg.version}`);
    console.log(`   Description: ${pkg.description}`);
    
    if (pkg.pkg && pkg.pkg.targets) {
        console.log('✅ PKG configuration found');
        console.log(`   Targets: ${pkg.pkg.targets.join(', ')}`);
    } else {
        console.log('❌ PKG configuration missing');
    }
}

console.log('\n🎯 Build Verification Complete!');
console.log('\n📋 Next Steps:');
console.log('1. Download: mysafeplay-bridge-v1.6.42-alpha.23-windows.zip');
console.log('2. Extract the ZIP file to a folder');
console.log('3. Follow WINDOWS_INSTALLATION_GUIDE.md');
console.log('4. Run mysafeplay-bridge-windows.exe');
console.log('5. Bypass Windows security warnings (see guide)');
console.log('6. Access http://localhost:3001 in your browser');
