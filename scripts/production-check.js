/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Production Readiness Check Script
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';




console.log('🚀 ToLOVERunner v2.2.0 - Production Readiness Check\n');

let passed = 0;
let failed = 0;

function check(name, condition, fix = null) {
  if (condition) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    if (fix) {
      console.log(`   💡 Fix: ${fix}`);
    }
    failed++;
  }
}

// 1. Check package.json for security vulnerabilities
console.log('📦 Checking Dependencies...');
try {
  execSync('npm audit --audit-level moderate', { stdio: 'pipe' });
  check('No security vulnerabilities', true);
} catch {
  check('No security vulnerabilities', false, 'Run: npm audit fix');
}

// 2. Check TypeScript compilation
console.log('\n🔍 Checking TypeScript...');
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  check('TypeScript compilation', true);
} catch {
  check('TypeScript compilation', false, 'Fix TypeScript errors');
}

// 3. Check ESLint
console.log('\n🔧 Checking Code Quality...');
try {
  execSync('npx eslint . --ext ts,tsx --max-warnings 0', { stdio: 'pipe' });
  check('ESLint passes', true);
} catch {
  check('ESLint passes', false, 'Run: npm run lint:fix');
}

// 4. Check environment variables
console.log('\n🌍 Checking Environment...');
const envExample = fs.existsSync('.env.example');
check('Environment example exists', envExample, 'Create .env.example file');

// 5. Check security headers
console.log('\n🔒 Checking Security...');
const indexHtml = fs.readFileSync('index.html', 'utf8');
const hasCSP = indexHtml.includes('Content-Security-Policy');
const hasXFrame = indexHtml.includes('X-Frame-Options');
const hasXXSS = indexHtml.includes('X-XSS-Protection');

check('Content Security Policy configured', hasCSP, 'Add CSP meta tag to index.html');
check('X-Frame-Options configured', hasXFrame, 'Add X-Frame-Options meta tag');
check('X-XSS-Protection configured', hasXXSS, 'Add X-XSS-Protection meta tag');

// 6. Check Vite configuration
console.log('\n⚡ Checking Build Configuration...');
const viteConfig = fs.readFileSync('vite.config.ts', 'utf8');
const hasEsbuildDrop = viteConfig.includes("drop: ['console', 'debugger']");
const hasMinification = viteConfig.includes('minify:');
const hasChunkSplit = viteConfig.includes('manualChunks');

check('Console.log removal configured', hasEsbuildDrop, 'Configure esbuild.drop in vite.config.ts');
check('Minification enabled', hasMinification, 'Enable minification in vite.config.ts');
check('Code splitting configured', hasChunkSplit, 'Configure manualChunks in vite.config.ts');

// 7. Check Sentry configuration
console.log('\n📊 Checking Monitoring...');
const sentryConfig = fs.existsSync('infrastructure/monitoring/SentryConfig.ts');
check('Sentry configuration exists', sentryConfig, 'Create Sentry configuration file');

// 8. Check deployment configuration
console.log('\n🌐 Checking Deployment...');
const vercelConfig = fs.existsSync('vercel.json');
const githubActions = fs.existsSync('.github/workflows/ci.yml');

check('Vercel configuration exists', vercelConfig, 'Create vercel.json file');
check('GitHub Actions CI configured', githubActions, 'Create .github/workflows/ci.yml');

// 9. Check PWA configuration
console.log('\n📱 Checking PWA...');
const hasPWAPlugin = viteConfig.includes('VitePWA');
const hasManifest = indexHtml.includes('manifest.json');

check('PWA plugin configured', hasPWAPlugin, 'Configure VitePWA plugin');
check('Web manifest linked', hasManifest, 'Add manifest.json link to index.html');

// 10. Check production build
console.log('\n🏗️ Checking Build...');
try {
  console.log('   Building for production...');
  execSync('npm run build:prod', { stdio: 'pipe' });
  const distExists = fs.existsSync('dist');
  const indexExists = fs.existsSync('dist/index.html');

  check('Production build succeeds', distExists && indexExists);

  // Check bundle size
  fs.statSync('dist/index.html');
  const bundleFiles = fs.readdirSync('dist/assets').filter(f => f.endsWith('.js'));
  const totalSize = bundleFiles.reduce((sum, file) => {
    return sum + fs.statSync(path.join('dist/assets', file)).size;
  }, 0);

  const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
  check(`Bundle size reasonable (${sizeMB}MB)`, totalSize < 2 * 1024 * 1024, 'Optimize bundle size');

} catch {
  check('Production build succeeds', false, 'Fix build errors');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log(`📊 Production Readiness Summary:`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Score: ${Math.round((passed / (passed + failed)) * 100)}%`);

if (failed === 0) {
  console.log('\n🎉 Production Ready! You can deploy safely.');
  process.exit(0);
} else {
  console.log('\n⚠️  Please fix the issues above before deploying.');
  process.exit(1);
}