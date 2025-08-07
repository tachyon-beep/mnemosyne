/**
 * Performance tests for Enhanced Search System
 * 
 * Tests performance targets and optimization under various conditions:
 * - Individual search method performance targets
 * - Concurrent request handling
 * - Large dataset performance
 * - Memory usage optimization
 * - Scaling characteristics
 */

import { EnhancedSearchEngine, HybridSearchOptions } from '../../src/search/EnhancedSearchEngine';
import { EmbeddingManager } from '../../src/search/EmbeddingManager';
import { SearchEngine } from '../../src/search/SearchEngine';
import { SemanticSearchTool } from '../../src/tools/SemanticSearchTool';
import { HybridSearchTool } from '../../src/tools/HybridSearchTool';
import { DatabaseManager } from '../../src/storage/Database';
import { MessageRepository } from '../../src/storage/repositories/MessageRepository';
import {
  createTestDatabase,
  createTestConversations,
  insertTestData,
  createTestEmbeddingManager,
  generateTestEmbeddings,
  PerformanceTimer,
  waitFor
} from '../utils/test-helpers';
import { TEST_CONFIG, assertTiming, measureHighRes } from '../config/test.config';
import { rmSync, existsSync } from 'fs';
import { join } from 'path';

// Performance targets from HLD-Search.md
const PERFORMANCE_TARGETS = {
  SEMANTIC_SEARCH: 500,    // ms
  FTS_SEARCH: 100,         // ms
  HYBRID_SEARCH: 750,      // ms
  EMBEDDING_GENERATION: 100, // ms per embedding
  BATCH_EMBEDDING: 50,     // ms per embedding in batch
  CONCURRENT_REQUESTS: 10, // simultaneous requests
  LARGE_DATASET_SEARCH: 1000, // ms for 1000+ messages
  MEMORY_USAGE: 200 * 1024 * 1024 // 200MB baseline
};

describe('Enhanced Search Performance Tests', () => {
  let dbManager: DatabaseManager;
  let embeddingManager: EmbeddingManager;
  let ftsEngine: SearchEngine;
  let enhancedEngine: EnhancedSearchEngine;
  let semanticTool: SemanticSearchTool;
  let hybridTool: HybridSearchTool;
  let testCacheDir: string;

  beforeAll(async () => {
    testCacheDir = join(process.cwd(), '.test-cache-performance');
    
    console.log('Setting up performance test environment...');
    
    // Create test infrastructure
    dbManager = await createTestDatabase();
    embeddingManager = await createTestEmbeddingManager(dbManager);
    const messageRepository = new MessageRepository(dbManager);
    ftsEngine = new SearchEngine(messageRepository);
    enhancedEngine = new EnhancedSearchEngine(dbManager, embeddingManager, ftsEngine);
    semanticTool = new SemanticSearchTool(enhancedEngine);
    hybridTool = new HybridSearchTool(enhancedEngine);
    
    // Create larger dataset for performance testing
    const conversations = createTestConversations();
    await insertTestData(dbManager, conversations);
    await generateTestEmbeddings(embeddingManager, conversations);
    
    // Add additional test data for performance testing
    await createLargeTestDataset(dbManager, embeddingManager);
    
    console.log('Performance test setup complete');
  }, 180000); // Allow 3 minutes for setup

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

  describe('Individual Search Method Performance', () => {
    test('semantic search should meet performance target', async () => {
      const timer = new PerformanceTimer();
      
      const options: HybridSearchOptions = {
        query: 'machine learning neural networks deep learning algorithms',
        strategy: 'semantic',
        limit: 20,
        semanticThreshold: 0.6
      };
      
      const result = await enhancedEngine.search(options);
      const elapsed = timer.elapsed();
      
      expect(elapsed).toBeLessThan(PERFORMANCE_TARGETS.SEMANTIC_SEARCH);
      expect(result.metrics.totalTime).toBeLessThan(PERFORMANCE_TARGETS.SEMANTIC_SEARCH);
      expect(result.results.length).toBeGreaterThan(0);
      
      console.log(`Semantic search: ${elapsed}ms (target: ${PERFORMANCE_TARGETS.SEMANTIC_SEARCH}ms)`);
    });

    test('FTS search should meet performance target', async () => {
      const timer = new PerformanceTimer();
      
      const options: HybridSearchOptions = {
        query: 'React components TypeScript',
        strategy: 'fts',
        limit: 20
      };
      
      const result = await enhancedEngine.search(options);
      const elapsed = timer.elapsed();
      
      expect(elapsed).toBeLessThan(PERFORMANCE_TARGETS.FTS_SEARCH);
      expect(result.metrics.totalTime).toBeLessThan(PERFORMANCE_TARGETS.FTS_SEARCH);
      
      console.log(`FTS search: ${elapsed}ms (target: ${PERFORMANCE_TARGETS.FTS_SEARCH}ms)`);
    });

    test('hybrid search should meet performance target', async () => {
      const timer = new PerformanceTimer();
      
      const options: HybridSearchOptions = {
        query: 'cooking pasta recipes Italian cuisine',
        strategy: 'hybrid',
        limit: 20,
        weights: { semantic: 0.6, fts: 0.4 }
      };
      
      const result = await enhancedEngine.search(options);
      const elapsed = timer.elapsed();
      
      expect(elapsed).toBeLessThan(PERFORMANCE_TARGETS.HYBRID_SEARCH);
      expect(result.metrics.totalTime).toBeLessThan(PERFORMANCE_TARGETS.HYBRID_SEARCH);
      expect(result.results.length).toBeGreaterThan(0);
      
      console.log(`Hybrid search: ${elapsed}ms (target: ${PERFORMANCE_TARGETS.HYBRID_SEARCH}ms)`);
    });

    test('should scale performance with result set size', async () => {
      const limits = [5, 10, 20, 50];
      const performances: number[] = [];
      
      for (const limit of limits) {
        const timer = new PerformanceTimer();
        
        const options: HybridSearchOptions = {
          query: 'development programming coding',
          strategy: 'hybrid',
          limit,
          semanticThreshold: 0.3
        };
        
        await enhancedEngine.search(options);
        performances.push(timer.elapsed());
      }
      
      console.log('Performance scaling with result size:', performances);
      
      // Performance should scale sub-linearly
      const scalingRatio = performances[3] / performances[0]; // 50 vs 5 results
      expect(scalingRatio).toBeLessThan(5); // Should not scale linearly
    });
  });

  describe('Embedding Performance', () => {
    test('single embedding generation should meet performance target', async () => {
      const text = 'This is a test sentence for embedding generation performance measurement.';
      const timer = new PerformanceTimer();
      
      const embedding = await embeddingManager.generateEmbedding(text);
      const elapsed = timer.elapsed();
      
      expect(elapsed).toBeLessThan(PERFORMANCE_TARGETS.EMBEDDING_GENERATION);
      expect(embedding.length).toBe(384);
      
      console.log(`Single embedding: ${elapsed}ms (target: ${PERFORMANCE_TARGETS.EMBEDDING_GENERATION}ms)`);
    });

    test('batch embedding generation should be more efficient', async () => {
      const texts = Array.from({ length: 10 }, (_, i) => 
        `Test sentence number ${i} for batch embedding performance measurement.`
      );
      
      const timer = new PerformanceTimer();
      
      const embeddings = await embeddingManager.generateBatchEmbeddings(texts);
      const elapsed = timer.elapsed();
      const avgTime = elapsed / texts.length;
      
      expect(avgTime).toBeLessThan(PERFORMANCE_TARGETS.BATCH_EMBEDDING);
      expect(embeddings.length).toBe(texts.length);
      
      console.log(`Batch embedding: ${avgTime}ms per embedding (target: ${PERFORMANCE_TARGETS.BATCH_EMBEDDING}ms)`);
    });

    test('embedding caching should improve performance', async () => {
      const text = 'Cached embedding performance test sentence.';
      
      // First call (no cache)
      const { result: embedding1, elapsed: firstCall } = await measureHighRes(
        () => embeddingManager.generateEmbedding(text)
      );
      
      // Second call (should use cache)
      const { result: embedding2, elapsed: secondCall } = await measureHighRes(
        () => embeddingManager.generateEmbedding(text)
      );
      
      // Use assertTiming helper which handles CI and fast operations
      assertTiming(secondCall, firstCall, 'lessThan', 'Cached call should be faster');
      
      console.log(`Cache performance: first=${firstCall}ms, cached=${secondCall}ms`);
      
      // Verify embeddings are identical
      expect(embedding1).toEqual(embedding2);
    });
  });

  describe('Concurrent Request Performance', () => {
    test('should handle concurrent semantic searches', async () => {
      const concurrentCount = PERFORMANCE_TARGETS.CONCURRENT_REQUESTS;
      const timer = new PerformanceTimer();
      
      const promises = Array.from({ length: concurrentCount }, (_, i) =>
        semanticTool.execute({
          query: `concurrent semantic test query ${i}`,
          limit: 10,
          threshold: 0.5
        }, { requestId: 'test-perf', timestamp: Date.now() })
      );
      
      const results = await Promise.all(promises);
      const elapsed = timer.elapsed();
      
      // All requests should succeed
      for (const result of results) {
        const response = JSON.parse(result.content[0].text || '{}');
        expect(response.success).toBe(true);
      }
      
      // Should complete within reasonable time
      const timePerRequest = elapsed / concurrentCount;
      expect(timePerRequest).toBeLessThan(PERFORMANCE_TARGETS.SEMANTIC_SEARCH * 2);
      
      console.log(`Concurrent semantic searches: ${elapsed}ms total, ${timePerRequest}ms per request`);
    });

    test('should handle concurrent hybrid searches', async () => {
      const concurrentCount = PERFORMANCE_TARGETS.CONCURRENT_REQUESTS;
      const timer = new PerformanceTimer();
      
      const promises = Array.from({ length: concurrentCount }, (_, i) =>
        hybridTool.execute({
          query: `concurrent hybrid test query ${i}`,
          strategy: 'hybrid',
          limit: 5
        }, { requestId: 'test-perf', timestamp: Date.now() })
      );
      
      const results = await Promise.all(promises);
      const elapsed = timer.elapsed();
      
      // All requests should succeed
      for (const result of results) {
        const response = JSON.parse(result.content[0].text || '{}');
        expect(response.success).toBe(true);
      }
      
      // Should complete within reasonable time
      const timePerRequest = elapsed / concurrentCount;
      expect(timePerRequest).toBeLessThan(PERFORMANCE_TARGETS.HYBRID_SEARCH * 2);
      
      console.log(`Concurrent hybrid searches: ${elapsed}ms total, ${timePerRequest}ms per request`);
    });

    test('should maintain performance under mixed concurrent load', async () => {
      const timer = new PerformanceTimer();
      
      const semanticPromises = Array.from({ length: 5 }, (_, i) =>
        semanticTool.execute({
          query: `mixed load semantic ${i}`,
          limit: 5
        }, { requestId: 'test-perf', timestamp: Date.now() })
      );
      
      const hybridPromises = Array.from({ length: 5 }, (_, i) =>
        hybridTool.execute({
          query: `mixed load hybrid ${i}`,
          strategy: 'hybrid',
          limit: 5
        }, { requestId: 'test-perf', timestamp: Date.now() })
      );
      
      const allResults = await Promise.all([...semanticPromises, ...hybridPromises]);
      const elapsed = timer.elapsed();
      
      // All requests should succeed
      for (const result of allResults) {
        const response = JSON.parse(result.content[0].text || '{}');
        expect(response.success).toBe(true);
      }
      
      expect(elapsed).toBeLessThan(5000); // 5 seconds for mixed load
      
      console.log(`Mixed concurrent load: ${elapsed}ms for ${allResults.length} requests`);
    });
  });

  describe('Large Dataset Performance', () => {
    test('should maintain performance with large dataset', async () => {
      // Get dataset size
      const db = dbManager.getConnection();
      const messageCount = db.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number };
      
      console.log(`Testing with ${messageCount.count} messages`);
      
      const timer = new PerformanceTimer();
      
      const options: HybridSearchOptions = {
        query: 'comprehensive test query for large dataset performance',
        strategy: 'hybrid',
        limit: 50,
        semanticThreshold: 0.3
      };
      
      const result = await enhancedEngine.search(options);
      const elapsed = timer.elapsed();
      
      expect(elapsed).toBeLessThan(PERFORMANCE_TARGETS.LARGE_DATASET_SEARCH);
      expect(result.results.length).toBeGreaterThan(0);
      
      console.log(`Large dataset search: ${elapsed}ms (target: ${PERFORMANCE_TARGETS.LARGE_DATASET_SEARCH}ms)`);
    });

    test('should handle pagination efficiently', async () => {
      const pageSize = 10;
      const pages = 5;
      const performances: number[] = [];
      
      for (let page = 0; page < pages; page++) {
        const timer = new PerformanceTimer();
        
        const options: HybridSearchOptions = {
          query: 'pagination performance test',
          strategy: 'semantic',
          limit: pageSize,
          offset: page * pageSize,
          semanticThreshold: 0.2
        };
        
        await enhancedEngine.search(options);
        performances.push(timer.elapsed());
      }
      
      console.log('Pagination performance:', performances);
      
      // Performance should remain consistent across pages
      const avgPerformance = performances.reduce((a, b) => a + b) / performances.length;
      const maxDeviation = Math.max(...performances) - avgPerformance;
      
      expect(maxDeviation).toBeLessThan(avgPerformance * 0.5); // No more than 50% deviation
    });

    test('should optimize FTS index usage', async () => {
      // Test FTS performance with complex queries
      const complexQueries = [
        'React AND TypeScript',
        '"exact phrase" OR alternative',
        'neural network* machine learn*',
        'cooking NOT baking',
        '(React OR Vue) AND components'
      ];
      
      for (const query of complexQueries) {
        const timer = new PerformanceTimer();
        
        const options: HybridSearchOptions = {
          query,
          strategy: 'fts',
          limit: 20
        };
        
        await enhancedEngine.search(options);
        const elapsed = timer.elapsed();
        
        expect(elapsed).toBeLessThan(PERFORMANCE_TARGETS.FTS_SEARCH * 2);
        
        console.log(`Complex FTS query "${query}": ${elapsed}ms`);
      }
    });
  });

  describe('Memory Usage and Optimization', () => {
    test('should maintain reasonable memory usage', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform intensive operations
      const operations = [];
      
      for (let i = 0; i < 20; i++) {
        operations.push(
          hybridTool.execute({
            query: `memory test query ${i}`,
            strategy: 'hybrid',
            limit: 20
          }, { requestId: 'test-perf', timestamp: Date.now() })
        );
      }
      
      await Promise.all(operations);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      console.log(`Memory usage increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
      
      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_TARGETS.MEMORY_USAGE);
    });

    test('should manage embedding cache efficiently', async () => {
      const cacheStats = await embeddingManager.getEmbeddingStats();
      const initialCacheSize = cacheStats.cacheSize;
      
      // Generate many embeddings to test cache management
      const texts = Array.from({ length: 100 }, (_, i) => 
        `Cache management test sentence number ${i} with unique content.`
      );
      
      await embeddingManager.generateBatchEmbeddings(texts);
      
      const finalStats = await embeddingManager.getEmbeddingStats();
      
      // Cache should not grow unbounded
      expect(finalStats.cacheSize).toBeLessThan(initialCacheSize + texts.length);
      
      console.log(`Cache size: initial=${initialCacheSize}, final=${finalStats.cacheSize}`);
    });

    test('should handle optimization operations efficiently', async () => {
      const timer = new PerformanceTimer();
      
      await enhancedEngine.optimize();
      
      const elapsed = timer.elapsed();
      
      expect(elapsed).toBeLessThan(10000); // 10 seconds max for optimization
      
      console.log(`Optimization completed in: ${elapsed}ms`);
      
      // Search should still work after optimization
      const result = await enhancedEngine.search({
        query: 'post-optimization test',
        strategy: 'hybrid'
      });
      
      expect(result.results).toBeDefined();
    });
  });

  describe('Performance Regression Tests', () => {
    test('should maintain consistent performance across multiple runs', async () => {
      const runs = 5;
      const performances: number[] = [];
      
      const options: HybridSearchOptions = {
        query: 'consistency test query',
        strategy: 'hybrid',
        limit: 10
      };
      
      for (let i = 0; i < runs; i++) {
        const timer = new PerformanceTimer();
        await enhancedEngine.search(options);
        performances.push(timer.elapsed());
        
        // Small delay between runs
        await waitFor(100);
      }
      
      console.log('Performance consistency:', performances);
      
      const avgPerformance = performances.reduce((a, b) => a + b) / performances.length;
      const variance = performances.reduce((sum, time) => 
        sum + Math.pow(time - avgPerformance, 2), 0) / performances.length;
      const stdDev = Math.sqrt(variance);
      
      // Standard deviation should be less than 25% of average
      expect(stdDev).toBeLessThan(avgPerformance * 0.25);
      
      console.log(`Average: ${avgPerformance}ms, StdDev: ${stdDev}ms`);
    });

    test('should perform well with cold start scenarios', async () => {
      // Clear caches to simulate cold start
      embeddingManager.clearCache();
      
      const timer = new PerformanceTimer();
      
      const result = await hybridTool.execute({
        query: 'cold start performance test',
        strategy: 'hybrid',
        limit: 5
      }, { requestId: 'test-perf', timestamp: Date.now() });
      
      const elapsed = timer.elapsed();
      
      const response = JSON.parse(result.content[0].text || '{}');
      expect(response.success).toBe(true);
      
      // Cold start should still meet reasonable performance
      expect(elapsed).toBeLessThan(PERFORMANCE_TARGETS.HYBRID_SEARCH * 2);
      
      console.log(`Cold start performance: ${elapsed}ms`);
    });
  });

  describe('Performance Monitoring and Metrics', () => {
    test('should collect accurate performance metrics', async () => {
      const result = await enhancedEngine.search({
        query: 'metrics collection test',
        strategy: 'hybrid',
        explainResults: true
      });
      
      expect(result.metrics.totalTime).toBeGreaterThanOrEqual(0);
      expect(result.metrics.timing.queryAnalysis).toBeDefined();
      expect(result.metrics.timing.queryAnalysis).toBeGreaterThanOrEqual(0);
      expect(result.metrics.timing.semanticSearch).toBeDefined();
      expect(result.metrics.timing.semanticSearch).toBeGreaterThanOrEqual(0);
      expect(result.metrics.timing.ftsSearch).toBeDefined();
      expect(result.metrics.timing.ftsSearch).toBeGreaterThanOrEqual(0);
      expect(result.metrics.timing.resultMerging).toBeDefined();
      expect(result.metrics.timing.resultMerging).toBeGreaterThanOrEqual(0);
      
      // Timing components should sum to less than total (due to overhead)
      const componentSum = Object.values(result.metrics.timing).reduce((a, b) => a + b, 0);
      expect(componentSum).toBeLessThanOrEqual(result.metrics.totalTime);
    });

    test('should store performance metrics for analysis', async () => {
      // Perform searches to generate metrics
      await enhancedEngine.search({
        query: 'stored metrics test semantic',
        strategy: 'semantic'
      });
      
      await enhancedEngine.search({
        query: 'stored metrics test fts',
        strategy: 'fts'
      });
      
      await enhancedEngine.search({
        query: 'stored metrics test hybrid',
        strategy: 'hybrid'
      });
      
      // Retrieve stored metrics
      const metrics = await enhancedEngine.getSearchMetrics({ limit: 10 });
      
      expect(metrics.length).toBeGreaterThan(0);
      
      // Should have metrics for different query types
      const queryTypes = new Set(metrics.map(m => m.queryType));
      expect(queryTypes.size).toBeGreaterThan(1);
      
      console.log('Stored metrics:', metrics.slice(0, 3));
    });
  });
});

/**
 * Helper function to create a larger test dataset for performance testing
 */
async function createLargeTestDataset(
  dbManager: DatabaseManager,
  embeddingManager: EmbeddingManager
): Promise<void> {
  console.log('Creating large test dataset...');
  
  const db = dbManager.getConnection();
  
  // Create additional conversations and messages
  const additionalConversations = 20;
  const messagesPerConversation = 25;
  
  const insertConv = db.prepare(`
    INSERT INTO conversations (id, title, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `);
  
  const insertMsg = db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const transaction = db.transaction(() => {
    for (let convIndex = 0; convIndex < additionalConversations; convIndex++) {
      const convId = `conv-perf-${convIndex}`;
      const createdAt = Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000; // Last 30 days
      
      insertConv.run(convId, `Performance Test Conversation ${convIndex}`, createdAt, createdAt);
      
      for (let msgIndex = 0; msgIndex < messagesPerConversation; msgIndex++) {
        const msgId = `msg-perf-${convIndex}-${msgIndex}`;
        const role = msgIndex % 2 === 0 ? 'user' : 'assistant';
        const content = generateTestMessage(convIndex, msgIndex);
        const msgCreatedAt = createdAt + msgIndex * 60 * 1000; // 1 minute apart
        
        insertMsg.run(msgId, convId, role, content, msgCreatedAt);
      }
    }
  });
  
  transaction();
  
  // Generate embeddings in batches
  const allMessages = db.prepare(`
    SELECT id, content FROM messages WHERE id LIKE 'msg-perf-%'
  `).all() as Array<{ id: string; content: string }>;
  
  const batchSize = 50;
  for (let i = 0; i < allMessages.length; i += batchSize) {
    const batch = allMessages.slice(i, i + batchSize);
    const texts = batch.map(m => m.content);
    const messageIds = batch.map(m => m.id);
    
    const embeddings = await embeddingManager.generateBatchEmbeddings(texts);
    
    for (let j = 0; j < embeddings.length; j++) {
      await embeddingManager.storeEmbedding(messageIds[j], embeddings[j]);
    }
    
    console.log(`Generated embeddings for batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allMessages.length / batchSize)}`);
  }
  
  console.log(`Created ${additionalConversations * messagesPerConversation} additional messages with embeddings`);
}

/**
 * Generate varied test message content
 */
function generateTestMessage(convIndex: number, msgIndex: number): string {
  const topics = [
    'machine learning algorithms and neural networks',
    'web development with React and TypeScript',
    'cooking recipes and culinary techniques',
    'travel destinations and cultural experiences',
    'scientific research and methodology',
    'business strategy and management',
    'art history and creative expression',
    'sports analytics and performance',
    'environmental sustainability and climate',
    'psychology and human behavior'
  ];
  
  const patterns = [
    'I need help understanding {topic}. Can you explain the key concepts?',
    'What are the best practices for {topic}? I want to improve my knowledge.',
    'I\'m working on a project involving {topic}. What should I consider?',
    'Can you recommend resources for learning about {topic}?',
    'I have questions about {topic} and how it applies to real-world scenarios.',
    'What are the latest developments in {topic}? I want to stay current.',
    'I\'m trying to solve a problem related to {topic}. Any suggestions?',
    'How does {topic} compare to alternative approaches?',
    'What are the common challenges when working with {topic}?',
    'Can you provide examples of successful {topic} implementation?'
  ];
  
  const topic = topics[convIndex % topics.length];
  const pattern = patterns[msgIndex % patterns.length];
  
  return pattern.replace('{topic}', topic) + ` This is message ${msgIndex + 1} in conversation ${convIndex + 1}.`;
}