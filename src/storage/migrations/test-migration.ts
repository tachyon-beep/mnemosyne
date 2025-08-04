/**
 * Migration Test Script
 * 
 * This script tests the enhanced search migration to ensure:
 * - Migration applies successfully
 * - All new tables and indexes are created
 * - FTS triggers work correctly
 * - Rollback works without data corruption
 * - Performance is acceptable
 */

import Database from 'better-sqlite3';
import { MigrationRunner } from './Migration.js';
import { migrations } from './index.js';
import { enhancedSearchMigration } from './002_enhanced_search.js';

interface TestResult {
  test: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

class MigrationTest {
  private db: Database.Database;
  private migrationRunner: MigrationRunner;
  private results: TestResult[] = [];

  constructor() {
    // Use in-memory database for testing
    this.db = new Database(':memory:');
    this.migrationRunner = new MigrationRunner(this.db);
  }

  async runAllTests(): Promise<TestResult[]> {
    console.log('Starting Enhanced Search Migration Tests...\n');

    try {
      await this.testInitialState();
      await this.testMigrationApplication();
      await this.testNewTablesCreated();
      await this.testFTSEnhancements();
      await this.testIndexCreation();
      await this.testTriggerFunctionality();
      await this.testRollback();
      await this.testDataIntegrity();

      console.log('\n=== TEST SUMMARY ===');
      const passed = this.results.filter(r => r.passed).length;
      const total = this.results.length;
      console.log(`Passed: ${passed}/${total}`);
      
      if (passed < total) {
        console.log('\nFailed tests:');
        this.results.filter(r => !r.passed).forEach(r => {
          console.log(`  - ${r.test}: ${r.error}`);
        });
      }

    } catch (error) {
      console.error('Test suite failed:', error);
    }

    return this.results;
  }

  private async testInitialState(): Promise<void> {
    const test = 'Initial state verification';
    const startTime = Date.now();

    try {
      // Run initial migration first
      await this.migrationRunner.runMigrations([migrations[0]]);
      
      const version = this.migrationRunner.getCurrentVersion();
      if (version !== 1) {
        throw new Error(`Expected version 1, got ${version}`);
      }

      // Verify initial schema
      const tables = this.getTableNames();
      const requiredTables = ['conversations', 'messages', 'messages_fts', 'persistence_state'];
      
      for (const table of requiredTables) {
        if (!tables.includes(table)) {
          throw new Error(`Required table ${table} not found`);
        }
      }

      this.addResult(test, true, undefined, Date.now() - startTime);
    } catch (error) {
      this.addResult(test, false, error instanceof Error ? error.message : String(error));
    }
  }

  private async testMigrationApplication(): Promise<void> {
    const test = 'Enhanced search migration application';
    const startTime = Date.now();

    try {
      // Apply the enhanced search migration
      await this.migrationRunner.runMigrations([enhancedSearchMigration]);
      
      const version = this.migrationRunner.getCurrentVersion();
      if (version !== 2) {
        throw new Error(`Expected version 2, got ${version}`);
      }

      this.addResult(test, true, undefined, Date.now() - startTime);
    } catch (error) {
      this.addResult(test, false, error instanceof Error ? error.message : String(error));
    }
  }

  private async testNewTablesCreated(): Promise<void> {
    const test = 'New tables creation verification';
    const startTime = Date.now();

    try {
      const tables = this.getTableNames();
      const newTables = ['search_config', 'search_metrics'];
      
      for (const table of newTables) {
        if (!tables.includes(table)) {
          throw new Error(`New table ${table} not created`);
        }
      }

      // Test search_config has default values
      const configCount = this.db.prepare('SELECT COUNT(*) as count FROM search_config').get() as { count: number };
      if (configCount.count === 0) {
        throw new Error('search_config table is empty - default values not inserted');
      }

      // Verify specific config values
      const embeddingModel = this.db.prepare('SELECT value FROM search_config WHERE key = ?').get('embedding_model') as { value: string } | undefined;
      if (!embeddingModel || !embeddingModel.value.includes('all-MiniLM-L6-v2')) {
        throw new Error('embedding_model config not set correctly');
      }

      this.addResult(test, true, undefined, Date.now() - startTime);
    } catch (error) {
      this.addResult(test, false, error instanceof Error ? error.message : String(error));
    }
  }

  private async testFTSEnhancements(): Promise<void> {
    const test = 'FTS enhancements verification';
    const startTime = Date.now();

    try {
      // Test FTS table exists with new configuration
      const ftsInfo = this.db.prepare("SELECT sql FROM sqlite_master WHERE name = 'messages_fts'").get() as { sql: string } | undefined;
      
      if (!ftsInfo) {
        throw new Error('messages_fts table not found');
      }

      // Check for enhanced tokenizer configuration
      if (!ftsInfo.sql.includes('porter unicode61') || !ftsInfo.sql.includes('remove_diacritics')) {
        throw new Error('Enhanced FTS tokenizer not configured correctly');
      }

      this.addResult(test, true, undefined, Date.now() - startTime);
    } catch (error) {
      this.addResult(test, false, error instanceof Error ? error.message : String(error));
    }
  }

  private async testIndexCreation(): Promise<void> {
    const test = 'Enhanced indexes creation';
    const startTime = Date.now();

    try {
      const indexes = this.getIndexNames();
      const newIndexes = [
        'idx_messages_embedding',
        'idx_messages_embedding_time', 
        'idx_messages_role_embedding',
        'idx_search_metrics_time',
        'idx_search_metrics_type'
      ];
      
      for (const index of newIndexes) {
        if (!indexes.includes(index)) {
          throw new Error(`New index ${index} not created`);
        }
      }

      this.addResult(test, true, undefined, Date.now() - startTime);
    } catch (error) {
      this.addResult(test, false, error instanceof Error ? error.message : String(error));
    }
  }

  private async testTriggerFunctionality(): Promise<void> {
    const test = 'FTS triggers functionality';
    const startTime = Date.now();

    try {
      // Insert a test message
      const conversationId = 'test-conv-001';
      const messageId = 'test-msg-001';
      const content = 'This is a test message for FTS indexing';

      // Create test conversation
      this.db.prepare(`
        INSERT INTO conversations (id, created_at, updated_at, title, metadata)
        VALUES (?, ?, ?, ?, ?)
      `).run(conversationId, Date.now(), Date.now(), 'Test Conversation', '{}');

      // Insert test message
      this.db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(messageId, conversationId, 'user', content, Date.now(), '{}');

      // Check if FTS was updated automatically
      const ftsResult = this.db.prepare("SELECT content FROM messages_fts WHERE content MATCH 'test'").get() as { content: string } | undefined;
      
      if (!ftsResult) {
        throw new Error('FTS trigger did not automatically index new message');
      }

      // Test update trigger
      const newContent = 'Updated test message content for verification';
      this.db.prepare('UPDATE messages SET content = ? WHERE id = ?').run(newContent, messageId);

      const updatedFtsResult = this.db.prepare("SELECT content FROM messages_fts WHERE content MATCH 'verification'").get() as { content: string } | undefined;
      
      if (!updatedFtsResult) {
        throw new Error('FTS update trigger did not work correctly');
      }

      this.addResult(test, true, undefined, Date.now() - startTime);
    } catch (error) {
      this.addResult(test, false, error instanceof Error ? error.message : String(error));
    }
  }

  private async testRollback(): Promise<void> {
    const test = 'Migration rollback functionality';
    const startTime = Date.now();

    try {
      // Rollback to version 1
      await this.migrationRunner.rollbackToVersion(1, migrations);
      
      const version = this.migrationRunner.getCurrentVersion();
      if (version !== 1) {
        throw new Error(`Expected version 1 after rollback, got ${version}`);
      }

      // Verify enhancement tables are gone
      const tables = this.getTableNames();
      const enhancementTables = ['search_config', 'search_metrics'];
      
      for (const table of enhancementTables) {
        if (tables.includes(table)) {
          throw new Error(`Table ${table} should be dropped after rollback`);
        }
      }

      // Verify original schema still works
      const originalTables = ['conversations', 'messages', 'messages_fts', 'persistence_state'];
      for (const table of originalTables) {
        if (!tables.includes(table)) {
          throw new Error(`Original table ${table} missing after rollback`);
        }
      }

      this.addResult(test, true, undefined, Date.now() - startTime);
    } catch (error) {
      this.addResult(test, false, error instanceof Error ? error.message : String(error));
    }
  }

  private async testDataIntegrity(): Promise<void> {
    const test = 'Data integrity verification';
    const startTime = Date.now();

    try {
      // Check that our test data still exists after rollback
      const messageCount = this.db.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number };
      
      if (messageCount.count === 0) {
        throw new Error('Messages lost during migration/rollback process');
      }

      // Check that FTS still works with original configuration
      const ftsResult = this.db.prepare("SELECT content FROM messages_fts WHERE content MATCH 'Updated'").get() as { content: string } | undefined;
      
      if (!ftsResult) {
        throw new Error('FTS functionality broken after rollback');
      }

      this.addResult(test, true, undefined, Date.now() - startTime);
    } catch (error) {
      this.addResult(test, false, error instanceof Error ? error.message : String(error));
    }
  }

  private getTableNames(): string[] {
    const tables = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    `).all() as { name: string }[];
    
    return tables.map(t => t.name);
  }

  private getIndexNames(): string[] {
    const indexes = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
    `).all() as { name: string }[];
    
    return indexes.map(i => i.name);
  }

  private addResult(test: string, passed: boolean, error?: string, duration?: number): void {
    this.results.push({ test, passed, error, duration });
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const time = duration ? ` (${duration}ms)` : '';
    console.log(`${status}: ${test}${time}`);
    if (error) {
      console.log(`   Error: ${error}`);
    }
  }

  close(): void {
    this.db.close();
  }
}

// Export for use in tests
export { MigrationTest };

// Allow running directly
if (require.main === module) {
  const test = new MigrationTest();
  test.runAllTests()
    .then(() => {
      test.close();
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test execution failed:', error);
      test.close();
      process.exit(1);
    });
}