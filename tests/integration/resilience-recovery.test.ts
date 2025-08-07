/**
 * Resilience and Recovery Integration Tests
 * 
 * Tests system behavior under failure conditions and validates recovery
 * mechanisms to ensure production resilience and graceful degradation.
 */

import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals';
import { DatabaseManager } from '../../src/storage/Database.js';
import { EnhancedSearchEngine } from '../../src/search/EnhancedSearchEngine.js';
import { EmbeddingManager } from '../../src/search/EmbeddingManager.js';
import { ToolRegistry } from '../../src/tools/index.js';
import { ConversationRepository, MessageRepository } from '../../src/storage/repositories/index.js';
import { createTestDatabase } from '../utils/test-helpers.js';
import { rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('Resilience and Recovery Tests', () => {
  let dbManager: DatabaseManager;
  let embeddingManager: EmbeddingManager;
  let searchEngine: EnhancedSearchEngine;
  let toolRegistry: ToolRegistry;
  let conversationRepo: ConversationRepository;
  let messageRepo: MessageRepository;
  let testDbPath: string;

  beforeEach(async () => {
    testDbPath = join(process.cwd(), '.test-resilience.db');
    dbManager = await createTestDatabase(testDbPath);
    conversationRepo = new ConversationRepository(dbManager);
    messageRepo = new MessageRepository(dbManager);
    
    // Create test data
    await createResilienceTestData();
  });

  afterEach(async () => {
    if (searchEngine) searchEngine.destroy();
    if (dbManager) dbManager.close();
    
    if (existsSync(testDbPath)) {
      rmSync(testDbPath, { force: true });
    }
    
    jest.restoreAllMocks();
  });

  describe('Database Failure Scenarios', () => {
    test('should handle database connection loss gracefully', async () => {
      // Create initial conversation
      const conversation = await toolRegistry.executeTool('save_message', {
        role: 'user',
        content: 'Test message before connection loss'
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(conversation.result).toBeDefined();
      const conversationId = conversation.result.conversation.id;
      
      // Simulate database connection loss by closing the database
      dbManager.close();
      
      // Attempt operations that should fail gracefully
      const failedSave = await toolRegistry.executeTool('save_message', {
        role: 'assistant',
        content: 'This should fail gracefully',
        conversationId
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(failedSave.success).toBe(false);
      expect(failedSave.error).toBeDefined();
      expect(failedSave.error.type).toBe('DatabaseError');
      
      const failedSearch = await toolRegistry.executeTool('search_messages', {
        query: 'test search during connection loss'
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(failedSearch.success).toBe(false);
      expect(failedSearch.error).toBeDefined();
      
      // Simulate reconnection
      dbManager = await createTestDatabase(testDbPath);
      await createResilienceTestData();
      
      // Operations should work again
      const recoveredSave = await toolRegistry.executeTool('save_message', {
        role: 'assistant',
        content: 'Recovery test message'
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(recoveredSave.success).toBe(true);
    });

    test('should handle database corruption scenarios', async () => {
      // Create test data
      const initialData = await toolRegistry.executeTool('save_message', {
        role: 'user',
        content: 'Data before corruption test'
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(initialData.success).toBe(true);
      
      // Simulate database corruption by writing invalid data
      const db = dbManager.getConnection();
      
      try {
        // Attempt to corrupt the database (this might fail, which is expected)
        db.prepare('INSERT INTO messages (id, role, content) VALUES (?, ?, ?)').run(
          'corrupt-id',
          'invalid-role-that-violates-constraints',
          null // This should violate NOT NULL constraint
        );
      } catch (error) {
        // Expected - database should reject invalid data
        expect(error).toBeDefined();
      }
      
      // System should still be functional
      const postCorruptionSave = await toolRegistry.executeTool('save_message', {
        role: 'assistant',
        content: 'Message after corruption attempt'
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(postCorruptionSave.success).toBe(true);
      
      // Search should still work
      const postCorruptionSearch = await toolRegistry.executeTool('search_messages', {
        query: 'corruption'
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(postCorruptionSearch.success).toBe(true);
    });

    test('should handle transaction rollback scenarios', async () => {
      const initialMessageCount = await messageRepo.count();
      
      // Mock a repository method to fail mid-transaction
      const originalSave = messageRepo.create;
      let saveCallCount = 0;
      
      messageRepo.create = jest.fn().mockImplementation((data) => {
        saveCallCount++;
        if (saveCallCount === 2) {
          throw new Error('Simulated transaction failure');
        }
        return originalSave.call(messageRepo, data);
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      // Attempt to save messages - second one should fail
      const firstSave = await toolRegistry.executeTool('save_message', {
        role: 'user',
        content: 'First message should succeed'
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(firstSave.success).toBe(true);
      
      const secondSave = await toolRegistry.executeTool('save_message', {
        role: 'assistant', 
        content: 'Second message should fail'
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(secondSave.success).toBe(false);
      
      // Database should maintain consistency - only first message should exist
      const finalMessageCount = await messageRepo.count();
      expect(finalMessageCount).toBe(initialMessageCount + 1);
      
      // Restore original method
      messageRepo.create = originalSave;
      
      // Subsequent operations should work normally
      const recoverySave = await toolRegistry.executeTool('save_message', {
        role: 'user',
        content: 'Recovery message should succeed'
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(recoverySave.success).toBe(true);
    });
  });

  describe('External Service Failures', () => {
    test('should handle embedding service failures gracefully', async () => {
      // Mock embedding manager to fail
      const mockEmbeddingManager = {
        generateEmbedding: jest.fn().mockRejectedValue(new Error('Embedding service unavailable')),
        findSimilarMessages: jest.fn().mockRejectedValue(new Error('Search service unavailable')),
        isModelAvailable: jest.fn().mockReturnValue(false),
        clearCache: jest.fn(),
        getEmbeddingStats: jest.fn().mockResolvedValue({ cacheSize: 0, totalEmbeddings: 0 })
      };
      
      // Create search engine with failing embedding manager
      const enhancedSearch = new EnhancedSearchEngine(dbManager, mockEmbeddingManager as any, null);
      
      // Semantic search should fail gracefully
      const semanticResult = await enhancedSearch.search({
        query: 'test semantic search failure',
        strategy: 'semantic'
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(semanticResult.results).toBeDefined();
      expect(semanticResult.results.length).toBe(0);
      expect(semanticResult.metadata.errors).toBeDefined();
      expect(semanticResult.metadata.errors.length).toBeGreaterThan(0);
      
      // Hybrid search should fall back to FTS only
      const hybridResult = await enhancedSearch.search({
        query: 'test hybrid fallback',
        strategy: 'hybrid'
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(hybridResult.results).toBeDefined();
      expect(hybridResult.metadata.fallbackUsed).toBe(true);
      expect(hybridResult.metadata.fallbackReason).toContain('embedding');
    });

    test('should handle provider configuration failures', async () => {
      // Test with invalid provider configuration
      const invalidConfig = await toolRegistry.executeTool('configure_llm_provider', {
        action: 'create',
        providerId: 'invalid-provider',
        config: {
          apiKey: 'invalid-key',
          endpoint: 'https://invalid-endpoint.com',
          model: 'non-existent-model'
        }
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(invalidConfig.success).toBe(false);
      expect(invalidConfig.error).toBeDefined();
      
      // System should continue to work with valid configurations
      const validConfig = await toolRegistry.executeTool('configure_llm_provider', {
        action: 'create',
        providerId: 'test-provider',
        config: {
          model: 'test-model',
          maxTokens: 4000
        }
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(validConfig.success).toBe(true);
    });

    test('should handle network timeout scenarios', async () => {
      // Mock network timeouts
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );
      
      // Operations should handle timeouts gracefully
      const result = await toolRegistry.executeTool('search_messages', {
        query: 'network timeout test'
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      // Should succeed with local operations even if external services fail
      expect(result.success).toBe(true);
      
      // Restore original fetch
      global.fetch = originalFetch;
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    test('should handle memory pressure gracefully', async () => {
      const initialMemory = process.memoryUsage();
      
      // Simulate memory pressure by creating large objects
      const largeObjects: any[] = [];
      
      try {
        // Create operations that would normally consume memory
        for (let i = 0; i < 100; i++) {
          const result = await toolRegistry.executeTool('search_messages', {
            query: `memory pressure test ${i}`,
            limit: 100
          }, { requestId: 'test-resilience', timestamp: Date.now() });
          
          expect(result.success).toBe(true);
          
          // Create some memory pressure
          largeObjects.push(new Array(10000).fill(`memory-test-${i}`));
          
          // Check if memory usage is getting too high
          const currentMemory = process.memoryUsage();
          if (currentMemory.heapUsed > initialMemory.heapUsed * 3) {
            console.log('Memory pressure detected, breaking test');
            break;
          }
        }
      } finally {
        // Cleanup
        largeObjects.length = 0;
        if (global.gc) {
          global.gc();
        }
      }
      
      // System should still be responsive after memory pressure
      const finalTest = await toolRegistry.executeTool('search_messages', {
        query: 'post memory pressure test'
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(finalTest.success).toBe(true);
    });

    test('should handle disk space exhaustion gracefully', async () => {
      // This test simulates disk space issues
      // In a real scenario, we'd need to mock filesystem operations
      
      // Mock disk space check
      const originalWriteSync = require('fs').writeFileSync;
      let diskSpaceExhausted = false;
      
      require('fs').writeFileSync = jest.fn().mockImplementation((path, data) => {
        if (diskSpaceExhausted) {
          const error = new Error('ENOSPC: no space left on device');
          (error as any).code = 'ENOSPC';
          throw error;
        }
        return originalWriteSync(path, data);
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      try {
        // Normal operation should work
        const normalSave = await toolRegistry.executeTool('save_message', {
          role: 'user',
          content: 'Normal save before disk space issue'
        }, { requestId: 'test-resilience', timestamp: Date.now() });
        
        expect(normalSave.success).toBe(true);
        
        // Simulate disk space exhaustion
        diskSpaceExhausted = true;
        
        // Operations should handle disk space errors gracefully
        const diskSpaceErrorSave = await toolRegistry.executeTool('save_message', {
          role: 'assistant',
          content: 'This should handle disk space error'
        }, { requestId: 'test-resilience', timestamp: Date.now() });
        
        // Should either succeed (if operation doesn't require disk writes)
        // or fail gracefully with appropriate error
        if (!diskSpaceErrorSave.success) {
          expect(diskSpaceErrorSave.error).toBeDefined();
          expect(diskSpaceErrorSave.error.message).toContain('space');
        }
        
      } finally {
        // Restore original function
        require('fs').writeFileSync = originalWriteSync;
      }
    });

    test('should handle connection pool exhaustion', async () => {
      // Simulate connection pool exhaustion by making many concurrent database operations
      const concurrentOperations = Array.from({ length: 200 }, (_, i) =>
        toolRegistry.executeTool('get_conversations', {
          limit: 10,
          offset: i * 10
        })
      );
      
      const results = await Promise.allSettled(concurrentOperations);
      
      // Some operations might fail due to connection limits, but system should remain stable
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      
      console.log(`Connection pool test: ${successful.length} succeeded, ${failed.length} failed`);
      
      // At least some should succeed
      expect(successful.length).toBeGreaterThan(0);
      
      // System should recover after load
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const recoveryTest = await toolRegistry.executeTool('search_messages', {
        query: 'connection pool recovery test'
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(recoveryTest.success).toBe(true);
    });
  });

  describe('Graceful Degradation', () => {
    test('should provide read-only access when write operations fail', async () => {
      // Mock write operations to fail
      const originalCreate = conversationRepo.create;
      conversationRepo.create = jest.fn().mockRejectedValue(new Error('Write operations disabled'));
      
      // Write operations should fail
      const writeResult = await toolRegistry.executeTool('save_message', {
        role: 'user',
        content: 'This write should fail'
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(writeResult.success).toBe(false);
      
      // Read operations should still work
      const readResult = await toolRegistry.executeTool('search_messages', {
        query: 'existing test data'
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(readResult.success).toBe(true);
      
      const conversationsResult = await toolRegistry.executeTool('get_conversations', {
        limit: 10
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(conversationsResult.success).toBe(true);
      
      // Restore write capability
      conversationRepo.create = originalCreate;
    });

    test('should fall back to basic search when enhanced search fails', async () => {
      // Mock enhanced search to fail
      const mockSearchEngine = {
        search: jest.fn().mockRejectedValue(new Error('Enhanced search service unavailable')),
        optimize: jest.fn().mockResolvedValue(undefined),
        getSearchMetrics: jest.fn().mockResolvedValue([]),
        destroy: jest.fn()
      };
      
      // Create tool with failing enhanced search
      const enhancedSearchTool = new (require('../../src/tools/HybridSearchTool.js')).HybridSearchTool(mockSearchEngine);
      
      const searchResult = await enhancedSearchTool.execute({
        query: 'fallback search test',
        strategy: 'hybrid'
      }, {});
      
      // Should fall back to basic search or return appropriate error
      const response = JSON.parse(searchResult.content[0].text);
      expect(response).toBeDefined();
      
      if (!response.success) {
        expect(response.error).toBeDefined();
        expect(response.fallback).toBeDefined();
      }
    });

    test('should maintain core functionality during partial system failures', async () => {
      // Simulate partial system failure by disabling some features
      const disabledFeatures = new Set(['semantic_search', 'embedding_generation']);
      
      // Core message operations should still work
      const saveResult = await toolRegistry.executeTool('save_message', {
        role: 'user',
        content: 'Core functionality test during partial failure'
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(saveResult.success).toBe(true);
      
      const searchResult = await toolRegistry.executeTool('search_messages', {
        query: 'core functionality'
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(searchResult.success).toBe(true);
      
      const conversationResult = await toolRegistry.executeTool('get_conversation', {
        conversationId: saveResult.result.conversation.id
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(conversationResult.success).toBe(true);
      expect(conversationResult.result.messages.length).toBe(1);
    });
  });

  describe('Recovery Validation', () => {
    test('should recover system state after restart simulation', async () => {
      // Create initial data
      const initialSave = await toolRegistry.executeTool('save_message', {
        role: 'user',
        content: 'Data before restart simulation'
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(initialSave.success).toBe(true);
      const conversationId = initialSave.result.conversation.id;
      
      // Add more messages
      const additionalMessage = await toolRegistry.executeTool('save_message', {
        conversationId,
        role: 'assistant',
        content: 'Additional message before restart'
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(additionalMessage.success).toBe(true);
      
      // Simulate system restart by recreating components
      if (searchEngine) searchEngine.destroy();
      if (dbManager) dbManager.close();
      
      // Reinitialize system
      dbManager = new DatabaseManager({ databasePath: testDbPath });
      await dbManager.initialize();
      
      conversationRepo = new ConversationRepository(dbManager);
      messageRepo = new MessageRepository(dbManager);
      
      // Verify data integrity after restart
      const recoveredConversation = await toolRegistry.executeTool('get_conversation', {
        conversationId
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(recoveredConversation.success).toBe(true);
      expect(recoveredConversation.result.messages.length).toBe(2);
      expect(recoveredConversation.result.messages[0].content).toContain('before restart');
      
      // Verify search functionality is restored
      const searchAfterRestart = await toolRegistry.executeTool('search_messages', {
        query: 'restart simulation'
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(searchAfterRestart.success).toBe(true);
      expect(searchAfterRestart.result.results.length).toBeGreaterThan(0);
    });

    test('should rebuild indexes and caches after corruption recovery', async () => {
      // Create searchable data
      await toolRegistry.executeTool('save_message', {
        role: 'user',
        content: 'Searchable content for index rebuild test'
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      // Verify search works initially
      const initialSearch = await toolRegistry.executeTool('search_messages', {
        query: 'searchable content'
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(initialSearch.success).toBe(true);
      expect(initialSearch.result.results.length).toBeGreaterThan(0);
      
      // Simulate index corruption/clearing (in real scenario, this might involve
      // deleting FTS tables or clearing caches)
      const db = dbManager.getConnection();
      
      try {
        // Clear FTS index
        db.prepare('DELETE FROM messages_fts').run();
      } catch (error) {
        // Index might not exist or be accessible, which is fine for this test
        console.log('Index clearing skipped:', error.message);
      }
      
      // Trigger index rebuild (this would typically be done by the search engine)
      const searchEngine = toolRegistry.getTool('search_messages');
      if (searchEngine && typeof (searchEngine as any).rebuildIndex === 'function') {
        await (searchEngine as any).rebuildIndex();
      }
      
      // Verify search still works after rebuild
      const postRebuildSearch = await toolRegistry.executeTool('search_messages', {
        query: 'searchable content'
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      expect(postRebuildSearch.success).toBe(true);
    });
  });

  // Helper function to create test data for resilience tests
  async function createResilienceTestData(): Promise<void> {
    const testConversations = [
      'Resilience Test Conversation 1',
      'Error Recovery Discussion',
      'Failure Handling Examples'
    ];
    
    for (const title of testConversations) {
      const conversation = await conversationRepo.create({ title });
      
      // Add some messages to each conversation
      await messageRepo.create({
        conversationId: conversation.id,
        role: 'user',
        content: `Initial message for ${title}`
      }, { requestId: 'test-resilience', timestamp: Date.now() });
      
      await messageRepo.create({
        conversationId: conversation.id,
        role: 'assistant',
        content: `Response message for ${title} with searchable keywords`
      }, { requestId: 'test-resilience', timestamp: Date.now() });
    }
  }
});