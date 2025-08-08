#!/usr/bin/env node
/**
 * Quick Production Readiness Check
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function checkItem(name, check, successMsg, failMsg) {
  try {
    const result = check();
    if (result) {
      console.log(`✅ ${name}: ${successMsg}`);
      return true;
    } else {
      console.log(`❌ ${name}: ${failMsg}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: ${failMsg} (${error.message.split('\n')[0]})`);
    return false;
  }
}

console.log('🚀 Quick Production Readiness Check\n');

let score = 0;
let total = 0;

// Check 1: TypeScript compilation
total++;
if (checkItem(
  'TypeScript', 
  () => {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    return true;
  },
  'No compilation errors',
  'Compilation errors found'
)) {
  score++;
}

// Check 2: Build exists
total++;
if (checkItem(
  'Build Output',
  () => fs.existsSync('./dist') && fs.existsSync('./dist/index.js'),
  'Build files present',
  'Missing build files'
)) {
  score++;
}

// Check 3: Health check works  
total++;
if (checkItem(
  'Health Check',
  () => {
    const result = execSync('node dist/index.js --health-check', { 
      stdio: 'pipe', 
      encoding: 'utf-8',
      timeout: 5000
    });
    return result.includes('Health Status: healthy');
  },
  'Server starts and health check passes',
  'Health check failed'
)) {
  score++;
}

// Check 4: Required files
total++;
const requiredFiles = ['README.md', 'package.json', 'CLAUDE.md'];
if (checkItem(
  'Documentation',
  () => requiredFiles.every(f => fs.existsSync(f)),
  'All required documentation present',
  'Missing required documentation'
)) {
  score++;
}

// Check 5: No security issues
total++;
if (checkItem(
  'Security',
  () => {
    // Check if .env files are in .gitignore
    const gitignore = fs.readFileSync('.gitignore', 'utf-8');
    return gitignore.includes('.env') && gitignore.includes('*.db');
  },
  'Sensitive files properly ignored',
  'Security configuration incomplete'
)) {
  score++;
}

// Check 6: Package scripts
total++;
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
if (checkItem(
  'NPM Scripts',
  () => pkg.scripts?.build && pkg.scripts?.start && pkg.scripts?.test,
  'All required scripts present',
  'Missing required NPM scripts'
)) {
  score++;
}

console.log('\n' + '='.repeat(50));
console.log(`📊 Production Readiness: ${score}/${total} (${Math.round(score/total*100)}%)`);

if (score === total) {
  console.log('✅ System is READY for production!');
} else if (score >= total * 0.8) {
  console.log('⚠️ System is mostly ready - address remaining issues');
} else {
  console.log('❌ System needs work before production deployment');
}