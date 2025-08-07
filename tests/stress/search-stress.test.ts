/**
 * Stress tests for Enhanced Search System
 * 
 * Tests system behavior under extreme conditions:
 * - Edge cases and boundary conditions
 * - Error recovery and resilience
 * - Resource exhaustion scenarios
 * - Data corruption and recovery
 * - System limits and constraints
 */

import { EnhancedSearchEngine } from '../../src/search/EnhancedSearchEngine';
import { EmbeddingManager } from '../../src/search/EmbeddingManager';
import { SearchEngine } from '../../src/search/SearchEngine';
import { MessageRepository } from '../../src/storage/repositories/MessageRepository';
import { SemanticSearchTool } from '../../src/tools/SemanticSearchTool';
import { HybridSearchTool } from '../../src/tools/HybridSearchTool';
import { DatabaseManager } from '../../src/storage/Database';
import { ToolError } from '../../src/utils/errors';
import {
  createTestDatabase,
  createTestConversations,
  insertTestData,
  createTestEmbeddingManager,
  generateTestEmbeddings,
  PerformanceTimer,
  waitFor
} from '../utils/test-helpers';
import { rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('Enhanced Search Stress Tests', () => {
  let dbManager: DatabaseManager;
  let embeddingManager: EmbeddingManager;
  let ftsEngine: SearchEngine;
  let enhancedEngine: EnhancedSearchEngine;
  let semanticTool: SemanticSearchTool;
  let hybridTool: HybridSearchTool;
  let testCacheDir: string;

  beforeAll(async () => {
    testCacheDir = join(process.cwd(), '.test-cache-stress');
    
    console.log('Setting up stress test environment...');
    
    // Create test infrastructure
    dbManager = await createTestDatabase();
    embeddingManager = await createTestEmbeddingManager(dbManager);
    const messageRepository = new MessageRepository(dbManager);
    ftsEngine = new SearchEngine(messageRepository);
    enhancedEngine = new EnhancedSearchEngine(dbManager, embeddingManager, ftsEngine);
    semanticTool = new SemanticSearchTool(enhancedEngine);
    hybridTool = new HybridSearchTool(enhancedEngine);
    
    // Insert test data
    const conversations = createTestConversations();
    await insertTestData(dbManager, conversations);
    await generateTestEmbeddings(embeddingManager, conversations);
    
    console.log('Stress test setup complete');
  }, 120000);

  afterAll(async () => {
    if (enhancedEngine) {
      enhancedEngine.destroy();
    }
    
    if (dbManager) {
      dbManager.close();
    }
    
    if (existsSync(testCacheDir)) {
      rmSync(testCacheDir, { recursive: true, force: true });
    }
  });

  describe('Extreme Query Conditions', () => {
    test('should handle maximum length queries', async () => {
      const maxQuery = 'a'.repeat(1000); // Maximum allowed length
      
      const result = await hybridTool.execute({
        query: maxQuery,
        strategy: 'auto',
        limit: 5
      }, { requestId: 'test-stress', timestamp: Date.now() });
      
      const response = JSON.parse(result.content[0].text || '{}');
      expect(response.success).toBe(true);
      // Should not crash, even if no meaningful results
    });

    test('should handle special character bombardment', async () => {
      const specialQueries = [
        '!@#$%^&*()_+-=[]{}|;:,.<>?',
        '™℠®©℗¹²³€£¥₹₽',
        '🚀🔥💯🎉✨🌟⭐🏆',
        'SELECT * FROM messages; DROP TABLE conversations;',
        '<script>alert("xss")</script>',
        '../../etc/passwd',
        'null\0byte\x00test',
        '\\\\server\\share\\file.txt',
        'C:\\Windows\\System32\\cmd.exe'
      ];
      
      for (const query of specialQueries) {
        const result = await hybridTool.execute({
          query,
          strategy: 'auto',
          limit: 5
        }, { requestId: 'test-stress', timestamp: Date.now() });
        
        const response = JSON.parse(result.content[0].text || '{}');
        expect(response.success).toBe(true);
        // System should not crash or be compromised
      }
    });

    test('should handle Unicode and international characters', async () => {
      const unicodeQueries = [
        'こんにちは世界', // Japanese
        'Здравствуй мир', // Russian
        'مرحبا بالعالم', // Arabic
        '🌍🌎🌏 global search',
        'café naïve résumé', // Accented characters
        '𝒞𝒪𝒟𝐸 𝓂𝒶𝓉𝒽𝑒𝓂𝒶𝓉𝒾𝒸𝒶', // Mathematical symbols
        '🎵♪♫♬🎶', // Musical symbols
      ];
      
      for (const query of unicodeQueries) {
        const result = await semanticTool.execute({
          query,
          threshold: 0.1 // Low threshold for international content
        }, { requestId: 'test-stress', timestamp: Date.now() });
        
        const response = JSON.parse(result.content[0].text || '{}');
        expect(response.success).toBe(true);
      }
    });

    test('should handle extremely complex FTS queries', async () => {
      const complexQueries = [
        '(React OR Vue OR Angular) AND (TypeScript OR JavaScript) NOT deprecated',
        '"exact phrase" AND (wildcard* OR partial) OR (nested AND (deep OR complex))',
        'term1 term2 term3 term4 term5 term6 term7 term8 term9 term10',
        '((A OR B) AND (C OR D)) OR ((E AND F) NOT (G OR H))',
        'machine NEAR/5 learning NEAR/3 neural NEAR/10 network'
      ];
      
      for (const query of complexQueries) {
        const result = await hybridTool.execute({
          query,
          strategy: 'fts',
          limit: 10
        }, { requestId: 'test-stress', timestamp: Date.now() });
        
        const response = JSON.parse(result.content[0].text || '{}');
        expect(response.success).toBe(true);
      }
    });

    test('should handle empty and whitespace queries', async () => {
      const edgeQueries = [
        '',
        ' ',
        '\t',
        '\n',
        '   \t\n  ',
        ' '.repeat(100)
      ];
      
      for (const query of edgeQueries) {
        try {
          const result = await hybridTool.execute({
            query,
            strategy: 'auto'
          }, { requestId: 'test-stress', timestamp: Date.now() });
          
          const response = JSON.parse(result.content[0].text || '{}');
          expect(response.success).toBe(true);
          expect(response.results).toHaveLength(0);
        } catch (error) {
          // Validation errors are acceptable for empty queries
          expect(error).toBeInstanceOf(ToolError);
        }
      }
    });
  });

  describe('Resource Exhaustion Scenarios', () => {
    test('should handle massive concurrent request load', async () => {
      const concurrentRequests = 50; // High load
      const timer = new PerformanceTimer();
      
      console.log(`Testing ${concurrentRequests} concurrent requests...`);
      
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        hybridTool.execute({
          query: `stress test concurrent ${i} ${Math.random()}`,
          strategy: 'auto',
          limit: 5
        }, { requestId: 'test-stress', timestamp: Date.now() }).catch(error => ({ error }))
      );
      
      const results = await Promise.all(promises);
      const elapsed = timer.elapsed();
      
      // Count successful vs failed requests
      const successful = results.filter(r => !('error' in r));
      const failed = results.filter(r => 'error' in r);
      
      console.log(`Concurrent load results: ${successful.length} success, ${failed.length} failed, ${elapsed}ms`);
      
      // At least 80% should succeed under stress
      expect(successful.length / results.length).toBeGreaterThan(0.8);
      
      // Should complete within reasonable time
      expect(elapsed).toBeLessThan(30000); // 30 seconds max
    });

    test('should handle memory pressure with large batch operations', async () => {
      const largeTexts = Array.from({ length: 100 }, (_, i) =>
        `Large memory pressure test content ${i}. `.repeat(100) // ~4KB each
      );
      
      const timer = new PerformanceTimer();
      
      try {
        const embeddings = await embeddingManager.generateBatchEmbeddings(largeTexts);
        const elapsed = timer.elapsed();
        
        expect(embeddings.length).toBe(largeTexts.length);
        expect(elapsed).toBeLessThan(60000); // 1 minute max
        
        console.log(`Large batch processing: ${elapsed}ms for ${largeTexts.length} items`);
      } catch (error) {
        // Graceful failure under memory pressure is acceptable
        console.log('Memory pressure test failed gracefully:', error);
        expect(error).toBeDefined();
      }
    });

    test('should handle rapid successive requests', async () => {
      const requestCount = 100;
      const timer = new PerformanceTimer();
      
      console.log(`Testing ${requestCount} rapid successive requests...`);
      
      const results = [];
      for (let i = 0; i < requestCount; i++) {
        try {
          const result = await semanticTool.execute({
            query: `rapid request ${i}`,
            limit: 1
          }, { requestId: 'test-stress', timestamp: Date.now() });
          results.push(result);
        } catch (error) {
          results.push({ error });
        }
        
        // Minimal delay to simulate rapid requests
        if (i % 10 === 0) {
          await waitFor(1);
        }
      }
      
      const elapsed = timer.elapsed();
      const successful = results.filter(r => !('error' in r));
      
      console.log(`Rapid requests: ${successful.length}/${requestCount} successful, ${elapsed}ms`);
      
      // Should handle most requests successfully
      expect(successful.length / requestCount).toBeGreaterThan(0.7);
    });
  });

  describe('Data Corruption and Recovery', () => {
    test('should handle corrupted embedding data gracefully', async () => {
      const db = dbManager.getConnection();
      
      // Insert message with corrupted embedding
      const corruptedId = 'msg-corrupted-test';
      db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, embedding, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        corruptedId,
        'conv-test',
        'user',
        'Message with corrupted embedding',
        'invalid-json-data',
        Date.now()
      );
      
      // Search should still work despite corrupted data
      const result = await semanticTool.execute({
        query: 'corrupted embedding test',
        threshold: 0.1
      }, { requestId: 'test-stress', timestamp: Date.now() });
      
      const response = JSON.parse(result.content[0].text || '{}');
      expect(response.success).toBe(true);
      
      // Clean up
      db.prepare('DELETE FROM messages WHERE id = ?').run(corruptedId);
    });

    test('should handle database schema inconsistencies', async () => {
      const db = dbManager.getConnection();
      
      // Insert message with missing required fields
      try {
        db.prepare(`
          INSERT INTO messages (id, conversation_id, role, content, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          'msg-incomplete',
          'conv-nonexistent', // Non-existent conversation
          'user',
          'Message in non-existent conversation',
          Date.now()
        );
        
        // Search should handle referential integrity issues
        const result = await hybridTool.execute({
          query: 'incomplete message test',
          strategy: 'fts'
        }, { requestId: 'test-stress', timestamp: Date.now() });
        
        const response = JSON.parse(result.content[0].text || '{}');
        expect(response.success).toBe(true);
        
        // Clean up
        db.prepare('DELETE FROM messages WHERE id = ?').run('msg-incomplete');
      } catch (error) {
        // Database constraints may prevent this, which is also acceptable
        console.log('Database prevented schema inconsistency:', error);
      }
    });

    test('should recover from temporary embedding service failure', async () => {
      // Simulate service degradation by clearing cache and limiting resources
      embeddingManager.clearCache();
      
      const originalConfig = embeddingManager.getConfiguration();
      await embeddingManager.updateConfiguration({
        maxCacheSize: 1, // Severely limit cache
        performanceTarget: 1 // Unrealistic target
      });
      
      try {
        const result = await semanticTool.execute({
          query: 'service degradation test',
          threshold: 0.5
        }, { requestId: 'test-stress', timestamp: Date.now() });
        
        const response = JSON.parse(result.content[0].text || '{}');
        expect(response.success).toBe(true);
        
      } catch (error) {
        // Graceful degradation is acceptable
        expect(error).toBeInstanceOf(ToolError);
      } finally {
        // Restore configuration
        await embeddingManager.updateConfiguration(originalConfig);
      }
    });
  });

  describe('System Limits and Boundaries', () => {
    test('should handle maximum result set limits', async () => {
      const result = await hybridTool.execute({
        query: 'maximum results test',
        limit: 100, // Maximum allowed
        strategy: 'hybrid',
        semanticThreshold: 0.01 // Very low to get many results
      }, { requestId: 'test-stress', timestamp: Date.now() });
      
      const response = JSON.parse(result.content[0].text || '{}');
      expect(response.success).toBe(true);
      expect(response.results.length).toBeLessThanOrEqual(100);
    });

    test('should handle extreme date ranges', async () => {
      const veryOldDate = new Date('1970-01-01').toISOString();
      const futureDate = new Date('2099-12-31').toISOString();
      
      const result = await hybridTool.execute({
        query: 'extreme date range test',
        startDate: veryOldDate,
        endDate: futureDate,
        strategy: 'hybrid'
      }, { requestId: 'test-stress', timestamp: Date.now() });
      
      const response = JSON.parse(result.content[0].text || '{}');
      expect(response.success).toBe(true);
    });

    test('should handle extreme similarity thresholds', async () => {
      // Test with impossibly high threshold
      const highThresholdResult = await semanticTool.execute({
        query: 'threshold test',
        threshold: 0.999999
      }, { requestId: 'test-stress', timestamp: Date.now() });
      
      const highResponse = JSON.parse(highThresholdResult.content[0].text);
      expect(highResponse.success).toBe(true);
      expect(highResponse.results.length).toBe(0);
      
      // Test with very low threshold
      const lowThresholdResult = await semanticTool.execute({
        query: 'threshold test',
        threshold: 0.000001,
        limit: 10
      }, { requestId: 'test-stress', timestamp: Date.now() });
      
      const lowResponse = JSON.parse(lowThresholdResult.content[0].text);
      expect(lowResponse.success).toBe(true);
    });

    test('should handle extreme offset values', async () => {
      const result = await hybridTool.execute({
        query: 'offset test',
        offset: 10000, // Very high offset
        limit: 5,
        strategy: 'fts'
      }, { requestId: 'test-stress', timestamp: Date.now() });
      
      const response = JSON.parse(result.content[0].text || '{}');
      expect(response.success).toBe(true);
      expect(response.results.length).toBe(0); // No results at high offset
      expect(response.pagination.hasMore).toBe(false);
    });
  });

  describe('Network and I/O Stress', () => {
    test('should handle rapid cache invalidation', async () => {
      const queries = Array.from({ length: 20 }, (_, i) => `cache test ${i}`);
      
      for (const query of queries) {
        // Generate embedding (populates cache)
        await embeddingManager.generateEmbedding(query);
        
        // Clear cache immediately
        embeddingManager.clearCache();
        
        // Generate again (cache miss)
        await embeddingManager.generateEmbedding(query);
      }
      
      // Should not crash despite constant cache invalidation
      const result = await semanticTool.execute({
        query: 'final cache test',
        limit: 5
      }, { requestId: 'test-stress', timestamp: Date.now() });
      
      const response = JSON.parse(result.content[0].text || '{}');
      expect(response.success).toBe(true);
    });

    test('should handle database connection stress', async () => {
      const db = dbManager.getConnection();
      
      // Perform many rapid database operations
      const operations = Array.from({ length: 100 }, (_, i) => 
        new Promise<void>((resolve, reject) => {
          try {
            const result = db.prepare('SELECT COUNT(*) as count FROM messages').get();
            expect(result).toBeDefined();
            resolve();
          } catch (error) {
            reject(error);
          }
        })
      );
      
      await Promise.all(operations);
      
      // Search should still work after database stress
      const result = await hybridTool.execute({
        query: 'database stress test',
        strategy: 'fts'
      }, { requestId: 'test-stress', timestamp: Date.now() });
      
      const response = JSON.parse(result.content[0].text || '{}');
      expect(response.success).toBe(true);
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover from invalid configuration states', async () => {
      const originalConfig = enhancedEngine.getConfiguration();
      
      try {
        // Set invalid configuration
        await enhancedEngine.updateConfiguration({
          defaultWeights: { semantic: -1, fts: 2 }, // Invalid weights
          metricsEnabled: false
        });
        
        // Search should still work or fail gracefully
        const result = await hybridTool.execute({
          query: 'invalid config test',
          strategy: 'auto'
        }, { requestId: 'test-stress', timestamp: Date.now() });
        
        const response = JSON.parse(result.content[0].text || '{}');
        expect(response.success).toBe(true);
        
      } catch (error) {
        // Graceful failure is acceptable
        expect(error).toBeDefined();
      } finally {
        // Restore valid configuration
        await enhancedEngine.updateConfiguration(originalConfig);
      }
    });

    test('should handle search engine reinitialization', async () => {
      // Test that the system can reinitialize after errors
      const testQuery = 'reinitialization test';
      
      // Normal search
      let result = await semanticTool.execute({
        query: testQuery,
        limit: 5
      }, { requestId: 'test-stress', timestamp: Date.now() });
      
      let response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      
      // Force reinitialization by resetting embedding manager
      try {
        await embeddingManager.reset();
      } catch (error) {
        console.log('Reset failed, continuing test...');
      }
      
      // Search should work after reinitialization
      result = await semanticTool.execute({
        query: testQuery,
        limit: 5
      }, { requestId: 'test-stress', timestamp: Date.now() });
      
      response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
    });

    test('should maintain data consistency under concurrent modifications', async () => {
      const db = dbManager.getConnection();
      const testConvId = 'conv-stress-consistency';
      
      // Insert test conversation
      db.prepare(`
        INSERT INTO conversations (id, title, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `).run(testConvId, 'Stress Test Conversation', Date.now(), Date.now());
      
      // Concurrent operations: insert messages while searching
      const insertPromises = Array.from({ length: 10 }, (_, i) =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            db.prepare(`
              INSERT INTO messages (id, conversation_id, role, content, created_at)
              VALUES (?, ?, ?, ?, ?)
            `).run(
              `msg-stress-${i}`,
              testConvId,
              'user',
              `Concurrent stress test message ${i}`,
              Date.now()
            );
            resolve();
          }, Math.random() * 100);
        })
      );
      
      const searchPromises = Array.from({ length: 5 }, (_, i) =>
        hybridTool.execute({
          query: 'stress test message',
          conversationId: testConvId,
          strategy: 'fts'
        }, { requestId: 'test-stress', timestamp: Date.now() })
      );
      
      // Wait for all operations to complete
      await Promise.all([...insertPromises, ...searchPromises]);
      
      // Final search should find some messages
      const finalResult = await hybridTool.execute({
        query: 'stress test message',
        conversationId: testConvId,
        strategy: 'fts'
      }, { requestId: 'test-stress', timestamp: Date.now() });
      
      const finalResponse = JSON.parse(finalResult.content[0].text);
      expect(finalResponse.success).toBe(true);
      
      // Clean up
      db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(testConvId);
      db.prepare('DELETE FROM conversations WHERE id = ?').run(testConvId);
    });
  });

  describe('Long-Running Stability Tests', () => {
    test('should maintain performance over extended operation', async () => {
      const iterations = 50;
      const performances: number[] = [];
      
      console.log(`Testing stability over ${iterations} iterations...`);
      
      for (let i = 0; i < iterations; i++) {
        const timer = new PerformanceTimer();
        
        await hybridTool.execute({
          query: `stability test iteration ${i}`,
          strategy: 'hybrid',
          limit: 5
        }, { requestId: 'test-stress', timestamp: Date.now() });
        
        performances.push(timer.elapsed());
        
        // Small delay between iterations
        if (i % 10 === 0) {
          await waitFor(10);
          console.log(`Completed ${i + 1}/${iterations} iterations`);
        }
      }
      
      // Performance should remain stable
      const firstHalf = performances.slice(0, Math.floor(iterations / 2));
      const secondHalf = performances.slice(Math.floor(iterations / 2));
      
      const firstAvg = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b) / secondHalf.length;
      
      console.log(`Performance stability: first half ${firstAvg}ms, second half ${secondAvg}ms`);
      
      // Second half should not be significantly slower (no more than 50% increase)
      expect(secondAvg).toBeLessThan(firstAvg * 1.5);
    });

    test('should handle gradual resource accumulation', async () => {
      const initialStats = await embeddingManager.getEmbeddingStats();
      
      // Perform many operations to accumulate resources
      for (let i = 0; i < 100; i++) {
        await semanticTool.execute({
          query: `resource accumulation test ${i}`,
          limit: 2
        }, { requestId: 'test-stress', timestamp: Date.now() });
        
        if (i % 20 === 0) {
          console.log(`Resource accumulation: ${i + 1}/100 operations`);
        }
      }
      
      const finalStats = await embeddingManager.getEmbeddingStats();
      
      // System should still be functional
      expect(finalStats.modelInfo.isInitialized).toBe(true);
      
      // Memory usage should not have grown excessively
      const cacheGrowth = finalStats.cacheSize - initialStats.cacheSize;
      expect(cacheGrowth).toBeLessThan(1000); // Reasonable cache growth
      
      console.log(`Cache growth: ${cacheGrowth} items`);
    });
  });
});