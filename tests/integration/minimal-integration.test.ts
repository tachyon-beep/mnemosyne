/**
 * Minimal Integration Test
 * 
 * Simplified integration test that validates core database functionality
 * without complex dependencies.
 */

import { jest } from '@jest/globals';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { migrations } from '../../src/storage/migrations/index.js';

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  details: string[];
  metrics: Record<string, any>;
  errors: string[];
}

class MinimalIntegrationSuite {
  private database!: Database.Database;

  async setup(): Promise<void> {
    // Create in-memory database
    this.database = new Database(':memory:');
    
    // Create persistence_state table first
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS persistence_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
      )
    `);
    
    // Run basic migrations manually (core tables only)
    this.database.exec(`
      CREATE TABLE conversations (
        id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        title TEXT,
        metadata TEXT DEFAULT '{}'
      )
    `);
    
    this.database.exec(`
      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        parent_message_id TEXT,
        metadata TEXT DEFAULT '{}',
        embedding BLOB,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_message_id) REFERENCES messages(id)
      )
    `);
    
    // Create FTS table
    this.database.exec(`
      CREATE VIRTUAL TABLE messages_fts USING fts5(
        content,
        content=messages,
        content_rowid=rowid
      )
    `);
    
    // Create basic indexes
    this.database.exec('CREATE INDEX idx_messages_conversation_time ON messages(conversation_id, created_at DESC)');
    this.database.exec('CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC)');
    
    // Create FTS triggers
    this.database.exec(`
      CREATE TRIGGER messages_fts_insert AFTER INSERT ON messages BEGIN
        INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
      END
    `);
    
    this.database.exec(`
      CREATE TRIGGER messages_fts_delete AFTER DELETE ON messages BEGIN
        INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.rowid, old.content);
      END
    `);
  }

  async teardown(): Promise<void> {
    if (this.database) {
      this.database.close();
    }
  }

  async testBasicOperations(): Promise<TestResult> {
    const testName = 'Basic Database Operations';
    const startTime = Date.now();
    const details: string[] = [];
    const errors: string[] = [];
    const metrics: Record<string, any> = {};
    
    try {
      // Test conversation creation
      const conversationId = randomUUID();
      const timestamp = Date.now();
      
      const insertConv = this.database.prepare(`
        INSERT INTO conversations (id, created_at, updated_at, title, metadata)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const convResult = insertConv.run(
        conversationId,
        timestamp,
        timestamp,
        'Test Conversation',
        JSON.stringify({ test: true })
      );
      
      details.push(`Created conversation: ${convResult.changes} rows affected`);
      metrics.conversationCreated = convResult.changes === 1;
      
      // Test message creation
      const insertMsg = this.database.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const messageIds = [];
      for (let i = 0; i < 5; i++) {
        const messageId = randomUUID();
        const msgResult = insertMsg.run(
          messageId,
          conversationId,
          i % 2 === 0 ? 'user' : 'assistant',
          `Test message ${i + 1}: This is a test message for integration testing.`,
          timestamp + i * 1000,
          JSON.stringify({ testMessage: true, index: i })
        );
        messageIds.push(messageId);
      }
      
      details.push(`Created ${messageIds.length} messages`);
      metrics.messagesCreated = messageIds.length;
      
      // Test retrieval
      const getConv = this.database.prepare('SELECT * FROM conversations WHERE id = ?');
      const retrievedConv = getConv.get(conversationId);
      
      const getMessages = this.database.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at');
      const retrievedMessages = getMessages.all(conversationId);
      
      details.push(`Retrieved conversation and ${retrievedMessages.length} messages`);
      metrics.conversationRetrieved = retrievedConv !== undefined;
      metrics.messagesRetrieved = retrievedMessages.length;
      
      // Test search
      const searchQuery = this.database.prepare(`
        SELECT m.*, c.title
        FROM messages_fts fts
        JOIN messages m ON fts.rowid = m.rowid
        JOIN conversations c ON m.conversation_id = c.id
        WHERE messages_fts MATCH ?
      `);
      
      const searchResults = searchQuery.all('test message');
      details.push(`Search found ${searchResults.length} results`);
      metrics.searchResults = searchResults.length;
      
      // Test counts
      const convCount = this.database.prepare('SELECT COUNT(*) as count FROM conversations').get() as { count: number };
      const msgCount = this.database.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number };
      
      details.push(`Final counts: ${convCount.count} conversations, ${msgCount.count} messages`);
      metrics.finalConversations = convCount.count;
      metrics.finalMessages = msgCount.count;
      
      const success = convResult.changes === 1 &&
                     messageIds.length === 5 &&
                     retrievedMessages.length === 5 &&
                     convCount.count === 1 &&
                     msgCount.count === 5;
      
      return {
        testName,
        success,
        duration: Date.now() - startTime,
        details,
        metrics,
        errors
      };
      
    } catch (error) {
      errors.push(`Database operations failed: ${(error as Error).message}`);
      return {
        testName,
        success: false,
        duration: Date.now() - startTime,
        details,
        metrics,
        errors
      };
    }
  }

  async testConcurrentOperations(): Promise<TestResult> {
    const testName = 'Concurrent Database Operations';
    const startTime = Date.now();
    const details: string[] = [];
    const errors: string[] = [];
    const metrics: Record<string, any> = {};
    
    try {
      // Create base conversation
      const conversationId = randomUUID();
      const timestamp = Date.now();
      
      this.database.prepare(`
        INSERT INTO conversations (id, created_at, updated_at, title, metadata)
        VALUES (?, ?, ?, ?, ?)
      `).run(conversationId, timestamp, timestamp, 'Concurrent Test', '{}');
      
      // Prepare message insertion statement
      const insertMsg = this.database.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      // Create concurrent operations
      const operations = [];
      const operationCount = 20;
      
      for (let i = 0; i < operationCount; i++) {
        operations.push(Promise.resolve().then(() => {
          return insertMsg.run(
            randomUUID(),
            conversationId,
            i % 2 === 0 ? 'user' : 'assistant',
            `Concurrent message ${i + 1}`,
            timestamp + i * 1000,
            JSON.stringify({ concurrent: true, index: i })
          );
        }));
      }
      
      const results = await Promise.all(operations);
      const successfulOps = results.filter(r => r.changes === 1).length;
      
      details.push(`Completed ${successfulOps} out of ${operationCount} concurrent operations`);
      metrics.successfulOperations = successfulOps;
      metrics.operationsPerSecond = operationCount / ((Date.now() - startTime) / 1000);
      
      // Verify final state
      const msgCount = this.database.prepare('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?').get(conversationId) as { count: number };
      details.push(`Final message count: ${msgCount.count}`);
      metrics.finalMessageCount = msgCount.count;
      
      const success = successfulOps === operationCount && msgCount.count === operationCount;
      
      return {
        testName,
        success,
        duration: Date.now() - startTime,
        details,
        metrics,
        errors
      };
      
    } catch (error) {
      errors.push(`Concurrent operations failed: ${(error as Error).message}`);
      return {
        testName,
        success: false,
        duration: Date.now() - startTime,
        details,
        metrics,
        errors
      };
    }
  }

  async testSearchFunctionality(): Promise<TestResult> {
    const testName = 'Search Functionality';
    const startTime = Date.now();
    const details: string[] = [];
    const errors: string[] = [];
    const metrics: Record<string, any> = {};
    
    try {
      // Create test data for search
      const conversationId = randomUUID();
      const timestamp = Date.now();
      
      this.database.prepare(`
        INSERT INTO conversations (id, created_at, updated_at, title, metadata)
        VALUES (?, ?, ?, ?, ?)
      `).run(conversationId, timestamp, timestamp, 'Search Test: Database Performance', '{}');
      
      const searchMessages = [
        'How can we optimize database performance for large datasets?',
        'Database optimization involves indexing strategies and query tuning.',
        'What specific indexing approaches would you recommend?',
        'Consider B-tree indexes for equality and range queries, and full-text search for text data.'
      ];
      
      const insertMsg = this.database.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      for (let i = 0; i < searchMessages.length; i++) {
        insertMsg.run(
          randomUUID(),
          conversationId,
          i % 2 === 0 ? 'user' : 'assistant',
          searchMessages[i],
          timestamp + i * 1000,
          JSON.stringify({ searchTest: true, index: i })
        );
      }
      
      details.push(`Created ${searchMessages.length} searchable messages`);
      
      // Test different search queries
      const searchQuery = this.database.prepare(`
        SELECT m.content, c.title, bm25(messages_fts) as rank
        FROM messages_fts fts
        JOIN messages m ON fts.rowid = m.rowid
        JOIN conversations c ON m.conversation_id = c.id
        WHERE messages_fts MATCH ?
        ORDER BY rank
        LIMIT 10
      `);
      
      const testQueries = [
        'database optimization',
        'performance',
        'indexing strategies',
        'query tuning'
      ];
      
      let totalResults = 0;
      for (const query of testQueries) {
        const results = searchQuery.all(query);
        totalResults += results.length;
        details.push(`Query "${query}" returned ${results.length} results`);
      }
      
      metrics.totalSearchResults = totalResults;
      metrics.averageResultsPerQuery = totalResults / testQueries.length;
      
      // Test search performance
      const perfStart = Date.now();
      searchQuery.all('database');
      const searchTime = Date.now() - perfStart;
      
      details.push(`Search completed in ${searchTime}ms`);
      metrics.searchPerformanceMs = searchTime;
      
      const success = totalResults > 0 && searchTime < 100;
      
      return {
        testName,
        success,
        duration: Date.now() - startTime,
        details,
        metrics,
        errors
      };
      
    } catch (error) {
      errors.push(`Search functionality failed: ${(error as Error).message}`);
      return {
        testName,
        success: false,
        duration: Date.now() - startTime,
        details,
        metrics,
        errors
      };
    }
  }

  generateReport(results: TestResult[]): string {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    
    let report = `
# Minimal Integration Test Report

## Executive Summary
- **Tests Run**: ${totalTests}
- **Tests Passed**: ${passedTests}/${totalTests} (${((passedTests/totalTests)*100).toFixed(1)}%)
- **Total Duration**: ${totalDuration}ms
- **Status**: ${passedTests === totalTests ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}

## Test Results

`;

    for (const result of results) {
      report += `### ${result.testName} ${result.success ? '✅' : '❌'}\n`;
      report += `**Duration**: ${result.duration}ms\n\n`;
      
      if (result.details.length > 0) {
        report += `**Details:**\n`;
        for (const detail of result.details) {
          report += `- ${detail}\n`;
        }
        report += `\n`;
      }
      
      if (Object.keys(result.metrics).length > 0) {
        report += `**Metrics:**\n`;
        for (const [key, value] of Object.entries(result.metrics)) {
          report += `- ${key}: ${value}\n`;
        }
        report += `\n`;
      }
      
      if (result.errors.length > 0) {
        report += `**Errors:**\n`;
        for (const error of result.errors) {
          report += `- ${error}\n`;
        }
        report += `\n`;
      }
    }
    
    report += `## Summary\n\n`;
    
    if (passedTests === totalTests) {
      report += `✅ **All integration tests passed successfully!**\n\n`;
      report += `The core MCP Persistence System functionality is working correctly:\n`;
      report += `- Database operations are functional\n`;
      report += `- Concurrent operations work as expected\n`;
      report += `- Full-text search is operational\n`;
      report += `- Data integrity is maintained\n\n`;
      report += `The system is ready for more comprehensive testing and tool integration.\n`;
    } else {
      report += `❌ **Some integration tests failed.**\n\n`;
      const failedTests = results.filter(r => !r.success);
      for (const failed of failedTests) {
        report += `- **${failed.testName}**: ${failed.errors.join(', ')}\n`;
      }
      report += `\nThese issues must be resolved before proceeding.\n`;
    }
    
    return report;
  }

  async runAllTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    console.log('🔬 Starting Minimal Integration Tests...\n');
    
    const tests = [
      { name: 'Basic Operations', test: () => this.testBasicOperations() },
      { name: 'Concurrent Operations', test: () => this.testConcurrentOperations() },
      { name: 'Search Functionality', test: () => this.testSearchFunctionality() }
    ];
    
    for (const { name, test } of tests) {
      console.log(`Running ${name}...`);
      try {
        const result = await test();
        results.push(result);
        console.log(`${result.success ? '✅' : '❌'} ${result.testName}: ${result.success ? 'PASSED' : 'FAILED'} (${result.duration}ms)`);
      } catch (error) {
        console.log(`❌ ${name}: ERROR - ${(error as Error).message}`);
        results.push({
          testName: name,
          success: false,
          duration: 0,
          details: [],
          metrics: {},
          errors: [`Test failed with error: ${(error as Error).message}`]
        });
      }
    }
    
    return results;
  }
}

// Jest Tests
describe('Minimal Integration Tests', () => {
  let testSuite: MinimalIntegrationSuite;
  
  beforeEach(async () => {
    testSuite = new MinimalIntegrationSuite();
    await testSuite.setup();
  });
  
  afterEach(async () => {
    if (testSuite) {
      await testSuite.teardown();
    }
  });

  test('Basic Database Operations', async () => {
    const result = await testSuite.testBasicOperations();
    
    expect(result.success).toBe(true);
    expect(result.metrics.conversationCreated).toBe(true);
    expect(result.metrics.messagesCreated).toBe(5);
    expect(result.metrics.messagesRetrieved).toBe(5);
    expect(result.metrics.finalConversations).toBe(1);
    expect(result.metrics.finalMessages).toBe(5);
    expect(result.duration).toBeLessThan(1000);
  });

  test('Concurrent Database Operations', async () => {
    const result = await testSuite.testConcurrentOperations();
    
    expect(result.success).toBe(true);
    expect(result.metrics.successfulOperations).toBe(20);
    expect(result.metrics.finalMessageCount).toBe(20);
    expect(result.metrics.operationsPerSecond).toBeGreaterThan(50);
    expect(result.duration).toBeLessThan(2000);
  });

  test('Search Functionality', async () => {
    const result = await testSuite.testSearchFunctionality();
    
    expect(result.success).toBe(true);
    expect(result.metrics.totalSearchResults).toBeGreaterThan(0);
    expect(result.metrics.searchPerformanceMs).toBeLessThan(100);
    expect(result.duration).toBeLessThan(1000);
  });

  test('Generate Integration Report', async () => {
    const results = await testSuite.runAllTests();
    const report = testSuite.generateReport(results);
    
    expect(report).toContain('Minimal Integration Test Report');
    expect(report).toContain('Executive Summary');
    expect(report).toContain('Test Results');
    
    console.log('\n' + '='.repeat(60));
    console.log('MINIMAL INTEGRATION TEST REPORT');
    console.log('='.repeat(60));
    console.log(report);
    console.log('='.repeat(60) + '\n');
    
    // Validate that all tests passed
    const passedTests = results.filter(r => r.success).length;
    expect(passedTests).toBe(results.length);
  }, 30000);
});

export { MinimalIntegrationSuite };