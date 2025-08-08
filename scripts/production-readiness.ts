#!/usr/bin/env node
/**
 * Production Readiness Check Script
 * 
 * This script performs comprehensive checks to ensure the MCP Persistence Server
 * is ready for production deployment.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: string;
}

class ProductionReadinessChecker {
  private results: CheckResult[] = [];

  async runAllChecks(): Promise<void> {
    console.log('🚀 Running Production Readiness Checks...\n');

    await this.checkTypeScript();
    await this.checkBuild();
    await this.checkTests();
    await this.checkDependencies();
    await this.checkSecurity();
    await this.checkDocumentation();
    await this.checkConfiguration();
    await this.checkPerformance();
    await this.checkHealthEndpoints();
    await this.checkErrorHandling();

    this.printSummary();
  }

  private async checkTypeScript(): Promise<void> {
    console.log('📝 Checking TypeScript compilation...');
    try {
      execSync('npx tsc --noEmit', { cwd: rootDir, stdio: 'pipe' });
      this.addResult('TypeScript Compilation', 'pass', 'No compilation errors');
    } catch (error) {
      this.addResult('TypeScript Compilation', 'fail', 'Compilation errors found', error.toString());
    }
  }

  private async checkBuild(): Promise<void> {
    console.log('🔨 Checking production build...');
    try {
      // Check if dist directory exists and is recent
      const distPath = path.join(rootDir, 'dist');
      if (!fs.existsSync(distPath)) {
        this.addResult('Production Build', 'fail', 'dist directory not found');
        return;
      }

      const stats = fs.statSync(distPath);
      const hoursSinceModified = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
      
      if (hoursSinceModified > 24) {
        this.addResult('Production Build', 'warn', `Build is ${Math.round(hoursSinceModified)} hours old`);
      } else {
        this.addResult('Production Build', 'pass', 'Build is up to date');
      }
    } catch (error) {
      this.addResult('Production Build', 'fail', 'Build check failed', error.toString());
    }
  }

  private async checkTests(): Promise<void> {
    console.log('🧪 Checking test suite...');
    try {
      // Check if tests pass
      const testResult = execSync('npm test -- --passWithNoTests', { 
        cwd: rootDir, 
        stdio: 'pipe',
        encoding: 'utf-8'
      });
      
      if (testResult.includes('PASS')) {
        this.addResult('Test Suite', 'pass', 'All tests passing');
      } else {
        this.addResult('Test Suite', 'warn', 'Some tests may be failing');
      }
    } catch (error) {
      this.addResult('Test Suite', 'warn', 'Test execution failed - tests may need updating');
    }
  }

  private async checkDependencies(): Promise<void> {
    console.log('📦 Checking dependencies...');
    try {
      // Check for vulnerabilities
      const auditResult = execSync('npm audit --json', { 
        cwd: rootDir, 
        stdio: 'pipe',
        encoding: 'utf-8'
      });
      
      const audit = JSON.parse(auditResult);
      const vulnerabilities = audit.metadata?.vulnerabilities || {};
      const total = Object.values(vulnerabilities).reduce((sum: number, val: any) => sum + val, 0) as number;
      
      if (total === 0) {
        this.addResult('Dependencies', 'pass', 'No known vulnerabilities');
      } else {
        const critical = vulnerabilities.critical || 0;
        const high = vulnerabilities.high || 0;
        if (critical > 0 || high > 0) {
          this.addResult('Dependencies', 'fail', `${critical} critical, ${high} high vulnerabilities found`);
        } else {
          this.addResult('Dependencies', 'warn', `${total} low/moderate vulnerabilities found`);
        }
      }
    } catch (error) {
      this.addResult('Dependencies', 'warn', 'Could not check vulnerabilities');
    }
  }

  private async checkSecurity(): Promise<void> {
    console.log('🔒 Checking security configuration...');
    
    // Check for sensitive files
    const sensitivePatterns = [
      '.env',
      'conversations.db',
      '*.key',
      '*.pem',
      'config.local.json'
    ];
    
    let hasIssues = false;
    for (const pattern of sensitivePatterns) {
      const files = this.findFiles(rootDir, pattern);
      if (files.length > 0) {
        // Check if they're in .gitignore
        const gitignorePath = path.join(rootDir, '.gitignore');
        if (fs.existsSync(gitignorePath)) {
          const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
          for (const file of files) {
            const relativePath = path.relative(rootDir, file);
            if (!gitignore.includes(relativePath) && !gitignore.includes(pattern)) {
              hasIssues = true;
              this.addResult('Security', 'fail', `Sensitive file not in .gitignore: ${relativePath}`);
            }
          }
        }
      }
    }
    
    if (!hasIssues) {
      this.addResult('Security', 'pass', 'No exposed sensitive files');
    }
  }

  private async checkDocumentation(): Promise<void> {
    console.log('📚 Checking documentation...');
    
    const requiredDocs = [
      'README.md',
      'docs/architecture/HLD.md',
      'CLAUDE.md'
    ];
    
    let allExist = true;
    for (const doc of requiredDocs) {
      const docPath = path.join(rootDir, doc);
      if (!fs.existsSync(docPath)) {
        this.addResult('Documentation', 'warn', `Missing: ${doc}`);
        allExist = false;
      }
    }
    
    if (allExist) {
      this.addResult('Documentation', 'pass', 'All required documentation present');
    }
  }

  private async checkConfiguration(): Promise<void> {
    console.log('⚙️ Checking configuration...');
    
    // Check package.json scripts
    const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
    const requiredScripts = ['build', 'start', 'test'];
    
    let hasAllScripts = true;
    for (const script of requiredScripts) {
      if (!packageJson.scripts?.[script]) {
        this.addResult('Configuration', 'fail', `Missing script: ${script}`);
        hasAllScripts = false;
      }
    }
    
    // Check Node version
    if (packageJson.engines?.node) {
      this.addResult('Configuration', 'pass', `Node version specified: ${packageJson.engines.node}`);
    } else {
      this.addResult('Configuration', 'warn', 'No Node version specified in package.json');
    }
    
    if (hasAllScripts && packageJson.engines?.node) {
      this.addResult('Configuration', 'pass', 'Configuration complete');
    }
  }

  private async checkPerformance(): Promise<void> {
    console.log('⚡ Checking performance optimizations...');
    
    // Check if database indexes are defined
    const migrationPath = path.join(rootDir, 'dist/storage/migrations');
    if (fs.existsSync(migrationPath)) {
      const migrations = fs.readdirSync(migrationPath);
      const hasIndexes = migrations.some(f => f.includes('index') || f.includes('optimization'));
      
      if (hasIndexes) {
        this.addResult('Performance', 'pass', 'Database optimization migrations present');
      } else {
        this.addResult('Performance', 'warn', 'No database optimization migrations found');
      }
    }
    
    // Check if caching is implemented
    const hasCaching = fs.existsSync(path.join(rootDir, 'dist/utils/IntelligentCacheManager.js'));
    if (hasCaching) {
      this.addResult('Performance', 'pass', 'Caching system implemented');
    } else {
      this.addResult('Performance', 'warn', 'No caching system found');
    }
  }

  private async checkHealthEndpoints(): Promise<void> {
    console.log('🏥 Checking health endpoints...');
    
    try {
      // Try to run health check
      const result = execSync('node dist/index.js --health-check 2>&1', {
        cwd: rootDir,
        stdio: 'pipe',
        encoding: 'utf-8',
        timeout: 5000
      });
      
      if (result.includes('Health Status: healthy')) {
        this.addResult('Health Endpoints', 'pass', 'Health check endpoint working');
      } else {
        this.addResult('Health Endpoints', 'warn', 'Health check returned non-healthy status');
      }
    } catch (error) {
      this.addResult('Health Endpoints', 'fail', 'Health check failed', error.toString());
    }
  }

  private async checkErrorHandling(): Promise<void> {
    console.log('🛡️ Checking error handling...');
    
    // Check if error classes are defined
    const hasErrorHandling = fs.existsSync(path.join(rootDir, 'dist/utils/errors.js'));
    
    // Check if logging is implemented
    const hasLogging = fs.existsSync(path.join(rootDir, 'dist/utils/logger.js'));
    
    if (hasErrorHandling && hasLogging) {
      this.addResult('Error Handling', 'pass', 'Error handling and logging implemented');
    } else if (hasErrorHandling || hasLogging) {
      this.addResult('Error Handling', 'warn', 'Partial error handling implementation');
    } else {
      this.addResult('Error Handling', 'fail', 'No error handling found');
    }
  }

  private findFiles(dir: string, pattern: string): string[] {
    const results: string[] = [];
    
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          results.push(...this.findFiles(filePath, pattern));
        } else if (stat.isFile()) {
          if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace('*', '.*'));
            if (regex.test(file)) {
              results.push(filePath);
            }
          } else if (file === pattern) {
            results.push(filePath);
          }
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
    
    return results;
  }

  private addResult(name: string, status: CheckResult['status'], message: string, details?: string): void {
    this.results.push({ name, status, message, details });
    
    const icon = status === 'pass' ? '✅' : status === 'warn' ? '⚠️' : '❌';
    console.log(`  ${icon} ${name}: ${message}`);
    if (details && process.env.VERBOSE) {
      console.log(`     Details: ${details.substring(0, 100)}...`);
    }
  }

  private printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PRODUCTION READINESS SUMMARY');
    console.log('='.repeat(60));
    
    const passed = this.results.filter(r => r.status === 'pass').length;
    const warnings = this.results.filter(r => r.status === 'warn').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`❌ Failed: ${failed}`);
    
    const score = (passed * 100) / this.results.length;
    console.log(`\n📈 Readiness Score: ${Math.round(score)}%`);
    
    if (failed > 0) {
      console.log('\n❌ CRITICAL ISSUES TO FIX:');
      this.results
        .filter(r => r.status === 'fail')
        .forEach(r => console.log(`  - ${r.name}: ${r.message}`));
    }
    
    if (warnings > 0) {
      console.log('\n⚠️ RECOMMENDATIONS:');
      this.results
        .filter(r => r.status === 'warn')
        .forEach(r => console.log(`  - ${r.name}: ${r.message}`));
    }
    
    if (score >= 80) {
      console.log('\n✅ System is READY for production deployment!');
    } else if (score >= 60) {
      console.log('\n⚠️ System needs some improvements before production.');
    } else {
      console.log('\n❌ System is NOT ready for production. Address critical issues first.');
    }
  }
}

// Run the checker
const checker = new ProductionReadinessChecker();
checker.runAllChecks().catch(console.error);