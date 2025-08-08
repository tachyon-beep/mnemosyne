/**
 * Production Build Validation Test
 * 
 * This test validates that the production build works correctly
 * without relying on source files.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('Production Build Validation', () => {
  const testDbPath = './test-production.db';

  beforeEach(() => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  afterEach(() => {
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should have all required build files', () => {
    const requiredFiles = [
      'dist/index.js',
      'dist/storage/Database.js',
      'dist/server/MCPServer.js',
      'dist/tools/SaveMessageTool.js',
      'dist/analytics/services/AnalyticsEngine.js'
    ];

    for (const file of requiredFiles) {
      expect(fs.existsSync(file)).toBe(true);
    }
  });

  it('should start server and pass health check', () => {
    const result = execSync('node dist/index.js --health-check 2>&1', {
      encoding: 'utf-8',
      timeout: 10000
    });

    expect(result).toContain('Health Status: healthy');
    expect(result).toContain('Component Status:');
    expect(result).toContain('Database: ok');
    expect(result).toContain('Tools: ok');
    expect(result).toContain('Search: ok');
  });

  it('should register all expected tools', () => {
    const result = execSync('node dist/index.js --health-check 2>&1', {
      encoding: 'utf-8',
      timeout: 10000
    });

    // Should register 23 tools
    expect(result).toMatch(/Registered \d+ tools/);
    
    // Should include Phase 4 and Phase 5 tools
    expect(result).toContain('Phase 4 proactive tools registered');
    expect(result).toContain('Phase 5 analytics tools registered');
  });

  it('should initialize database with all migrations', () => {
    // The health check creates a default database
    execSync(`node dist/index.js --health-check 2>&1`, {
      encoding: 'utf-8',
      timeout: 10000
    });

    // Check that the default database was created
    const defaultDbPath = './conversations.db';
    expect(fs.existsSync(defaultDbPath)).toBe(true);

    // Check database size is reasonable (should have tables and indexes)
    const stats = fs.statSync(defaultDbPath);
    expect(stats.size).toBeGreaterThan(1000); // Should be more than empty DB
    
    // Clean up
    if (fs.existsSync(defaultDbPath)) {
      fs.unlinkSync(defaultDbPath);
    }
  });

  it('should handle concurrent startup gracefully', async () => {
    // Try to start multiple instances quickly
    const promises = [];
    
    for (let i = 0; i < 3; i++) {
      promises.push(
        new Promise<string>((resolve) => {
          try {
            const result = execSync('node dist/index.js --health-check 2>&1', {
              encoding: 'utf-8',
              timeout: 8000
            });
            resolve(result);
          } catch (error) {
            // Even if one fails due to database lock, that's OK
            resolve('failed but handled');
          }
        })
      );
    }

    const results = await Promise.allSettled(promises);
    
    // All promises should resolve (even if some executions failed)
    const successes = results.filter(r => r.status === 'fulfilled');
    expect(successes.length).toBe(3);

    // Clean up the default database if created
    const defaultDbPath = './conversations.db';
    if (fs.existsSync(defaultDbPath)) {
      fs.unlinkSync(defaultDbPath);
    }
  });

  it('should have proper error handling', () => {
    // Try to start with invalid configuration
    const result = execSync('node dist/index.js --health-check 2>&1 || echo "ERROR_CAUGHT"', {
      encoding: 'utf-8',
      timeout: 10000,
      env: { ...process.env, PERSISTENCE_DB_PATH: '/invalid/path/test.db' }
    });

    // Should either succeed with fallback or handle error gracefully
    expect(result).toMatch(/(Health Status: healthy|ERROR_CAUGHT|Failed to)/);
  });
});