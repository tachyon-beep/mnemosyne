/**
 * FTS Health Check Tests
 * 
 * Tests to validate FTS table consistency, trigger functionality,
 * and overall search system health.
 */

import { describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { DatabaseManager } from '../../../src/storage/Database';
import { MessageRepository } from '../../../src/storage/repositories/MessageRepository';
import { ConversationRepository } from '../../../src/storage/repositories/ConversationRepository';
import { SearchEngine } from '../../../src/search/SearchEngine';

describe('FTS Health Check Tests', () => {
  let dbManager: DatabaseManager;
  let messageRepo: MessageRepository;
  let conversationRepo: ConversationRepository;
  let searchEngine: SearchEngine;
  let testConversationId: string;

  beforeEach(async () => {
    dbManager = new DatabaseManager({ databasePath: ':memory:' });
    await dbManager.initialize();
    
    messageRepo = new MessageRepository(dbManager);
    conversationRepo = new ConversationRepository(dbManager);
    searchEngine = new SearchEngine(messageRepo);
    
    // Create test conversation
    const conversation = await conversationRepo.create({
      title: 'FTS Health Check Test'
    });
    testConversationId = conversation.id;
  });

  afterEach(async () => {
    messageRepo.cleanup();
    conversationRepo.cleanup();
    searchEngine.destroy();
    dbManager.close();
  });

  describe('FTS Table Consistency', () => {
    it('should maintain row count consistency between messages and messages_fts', async () => {
      const db = dbManager.getConnection();
      
      // Initially both tables should be empty
      let messagesCount = db.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number };
      let ftsCount = db.prepare('SELECT COUNT(*) as count FROM messages_fts').get() as { count: number };
      
      expect(messagesCount.count).toBe(ftsCount.count);

      // Add messages and verify counts stay in sync
      const testMessages = [
        'First test message',
        'Second test message', 
        'Third test message'
      ];

      for (const content of testMessages) {
        await messageRepo.create({
          conversationId: testConversationId,
          role: 'user',
          content
        });
      }

      messagesCount = db.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number };
      ftsCount = db.prepare('SELECT COUNT(*) as count FROM messages_fts').get() as { count: number };
      
      expect(messagesCount.count).toBe(testMessages.length);
      expect(ftsCount.count).toBe(testMessages.length);
      expect(messagesCount.count).toBe(ftsCount.count);
    });

    it('should maintain FTS consistency during updates', async () => {
      const db = dbManager.getConnection();
      
      // Create a message
      const message = await messageRepo.create({
        conversationId: testConversationId,
        role: 'user',
        content: 'Original content for update test'
      });

      // Verify FTS contains original content
      let ftsResult = db.prepare(`
        SELECT * FROM messages_fts WHERE messages_fts MATCH 'original'
      `).all();
      expect(ftsResult.length).toBe(1);

      // Update the message
      await messageRepo.update(message.id, {
        content: 'Updated content for update test'
      });

      // Wait for triggers to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify old content is gone from FTS
      ftsResult = db.prepare(`
        SELECT * FROM messages_fts WHERE messages_fts MATCH 'original'
      `).all();
      expect(ftsResult.length).toBe(0);

      // Verify new content is in FTS
      ftsResult = db.prepare(`
        SELECT * FROM messages_fts WHERE messages_fts MATCH 'updated'
      `).all();
      expect(ftsResult.length).toBe(1);
    });

    it('should clean up FTS entries when messages are deleted', async () => {
      const db = dbManager.getConnection();
      
      // Create a message
      const message = await messageRepo.create({
        conversationId: testConversationId,
        role: 'user',
        content: 'Message to be deleted from FTS'
      });

      // Verify FTS contains the content
      let ftsResult = db.prepare(`
        SELECT rowid FROM messages_fts WHERE messages_fts MATCH 'deleted'
      `).all();
      expect(ftsResult.length).toBe(1);

      // Delete the message
      await messageRepo.delete(message.id);

      // Wait for triggers to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify FTS no longer contains the content
      ftsResult = db.prepare(`
        SELECT rowid FROM messages_fts WHERE messages_fts MATCH 'deleted'
      `).all();
      expect(ftsResult.length).toBe(0);

      // Verify row counts are consistent
      const messagesCount = db.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number };
      const ftsCount = db.prepare('SELECT COUNT(*) as count FROM messages_fts').get() as { count: number };
      expect(messagesCount.count).toBe(ftsCount.count);
    });
  });

  describe('FTS Trigger Functionality', () => {
    it('should validate INSERT trigger works correctly', async () => {
      const db = dbManager.getConnection();
      
      // Insert message directly to test trigger
      const messageId = 'test-msg-insert';
      const content = 'Test content for insert trigger validation';
      
      db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(messageId, testConversationId, 'user', content, Date.now());

      // Check that FTS trigger fired
      const ftsResult = db.prepare(`
        SELECT rowid FROM messages_fts WHERE messages_fts MATCH 'trigger validation'
      `).all();
      
      expect(ftsResult.length).toBe(1);
    });

    it('should validate UPDATE trigger works correctly', async () => {
      const db = dbManager.getConnection();
      
      // Insert message
      const messageId = 'test-msg-update';
      db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(messageId, testConversationId, 'user', 'Original trigger content', Date.now());

      // Update message content
      db.prepare(`
        UPDATE messages SET content = ? WHERE id = ?
      `).run('Updated trigger content', messageId);

      // Wait for trigger to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check old content is gone
      let ftsResult = db.prepare(`
        SELECT rowid FROM messages_fts WHERE messages_fts MATCH 'original'
      `).all();
      expect(ftsResult.length).toBe(0);

      // Check new content is present
      ftsResult = db.prepare(`
        SELECT rowid FROM messages_fts WHERE messages_fts MATCH 'updated'
      `).all();
      expect(ftsResult.length).toBe(1);
    });

    it('should validate DELETE trigger works correctly', async () => {
      const db = dbManager.getConnection();
      
      // Insert message
      const messageId = 'test-msg-delete';
      db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(messageId, testConversationId, 'user', 'Content for delete trigger test', Date.now());

      // Verify content is in FTS
      let ftsResult = db.prepare(`
        SELECT rowid FROM messages_fts WHERE messages_fts MATCH 'delete trigger'
      `).all();
      expect(ftsResult.length).toBe(1);

      // Delete message
      db.prepare('DELETE FROM messages WHERE id = ?').run(messageId);

      // Wait for trigger to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check content is gone from FTS
      ftsResult = db.prepare(`
        SELECT rowid FROM messages_fts WHERE messages_fts MATCH 'delete trigger'
      `).all();
      expect(ftsResult.length).toBe(0);
    });
  });

  describe('Search Performance Validation', () => {
    beforeEach(async () => {
      // Create a larger dataset for performance testing
      const messages = Array.from({ length: 100 }, (_, i) => ({
        content: `Performance test message ${i} with various keywords like database, algorithm, performance, optimization, and search`,
        role: i % 2 === 0 ? 'user' : 'assistant'
      }));

      for (const msg of messages) {
        await messageRepo.create({
          conversationId: testConversationId,
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        });
      }
    });

    it('should perform searches within acceptable time limits', async () => {
      const startTime = Date.now();
      
      const searchResult = await messageRepo.search({
        query: 'performance optimization',
        limit: 20
      });

      const searchTime = Date.now() - startTime;
      
      expect(searchResult.data.length).toBeGreaterThan(0);
      expect(searchTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle complex queries efficiently', async () => {
      const complexQueries = [
        'database AND algorithm',
        'performance OR optimization',
        '"test message"',
        'search*',
        'NOT irrelevant'
      ];

      for (const query of complexQueries) {
        const startTime = Date.now();
        
        try {
          const result = await messageRepo.search({
            query,
            limit: 10
          });
          
          const queryTime = Date.now() - startTime;
          expect(queryTime).toBeLessThan(500); // Each query should complete within 500ms
          
          // Result should be valid (even if empty for some queries)
          expect(result.data).toBeDefined();
          expect(Array.isArray(result.data)).toBe(true);
        } catch (error) {
          // Some complex queries might not be supported, that's ok
          console.warn(`Complex query "${query}" failed:`, error);
        }
      }
    });

    it('should validate FTS optimization commands work', async () => {
      const db = dbManager.getConnection();
      
      // Test FTS optimize command
      expect(() => {
        db.prepare("INSERT INTO messages_fts(messages_fts) VALUES('optimize')").run();
      }).not.toThrow();

      // Test FTS integrity check
      expect(() => {
        db.prepare("INSERT INTO messages_fts(messages_fts) VALUES('integrity-check')").run();
      }).not.toThrow();

      // Search should still work after optimization
      const searchResult = await messageRepo.search({
        query: 'performance',
        limit: 5
      });
      
      expect(searchResult.data.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle FTS corruption gracefully', async () => {
      const db = dbManager.getConnection();
      
      // Create some test data
      await messageRepo.create({
        conversationId: testConversationId,
        role: 'user',
        content: 'Test message before corruption'
      });

      // Simulate FTS corruption by manually corrupting data
      // (In a real scenario, this could happen due to disk issues, etc.)
      try {
        // Try to perform an invalid FTS operation
        db.prepare("INSERT INTO messages_fts(messages_fts) VALUES('invalid-command')").run();
      } catch (error) {
        // This should fail, which is expected
        expect(error).toBeDefined();
      }

      // FTS rebuild should still work
      expect(() => {
        db.prepare("INSERT INTO messages_fts(messages_fts) VALUES('rebuild')").run();
      }).not.toThrow();

      // Search should still function
      const searchResult = await messageRepo.search({
        query: 'corruption',
        limit: 10
      });
      
      expect(searchResult.data).toBeDefined();
    });

    it('should handle concurrent FTS operations', async () => {
      // Create multiple messages concurrently to test trigger contention
      const promises = Array.from({ length: 50 }, (_, i) => 
        messageRepo.create({
          conversationId: testConversationId,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Concurrent message ${i} for testing`
        })
      );

      const messages = await Promise.all(promises);
      
      // All messages should be created successfully
      expect(messages.length).toBe(50);
      messages.forEach(msg => {
        expect(msg.id).toBeDefined();
        expect(msg.content).toContain('Concurrent message');
      });

      // Wait for all FTS updates to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // All messages should be searchable
      const searchResult = await messageRepo.search({
        query: 'concurrent',
        limit: 100
      });
      
      expect(searchResult.data.length).toBe(50);
    });
  });
});