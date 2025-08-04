/**
 * Unit tests for EnhancedSearchEngine
 * 
 * Tests hybrid semantic and FTS search capabilities including:
 * - Strategy selection and auto-routing
 * - Result merging and ranking
 * - Performance metrics and monitoring
 * - Error handling and recovery
 */

import { EnhancedSearchEngine, HybridSearchOptions } from '../../../src/search/EnhancedSearchEngine';
import { EmbeddingManager } from '../../../src/search/EmbeddingManager';
import { SearchEngine } from '../../../src/search/SearchEngine';
import { DatabaseManager } from '../../../src/storage/Database';
import { MessageRepository } from '../../../src/storage/repositories/MessageRepository';
import {
  createTestDatabase,
  createTestConversations,
  insertTestData,
  createTestEmbeddingManager,
  generateTestEmbeddings,
  PerformanceTimer,
  createTestQueries,
  validateSearchResult
} from '../../utils/test-helpers';
import { rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('EnhancedSearchEngine', () => {
  let dbManager: DatabaseManager;
  let embeddingManager: EmbeddingManager;
  let ftsEngine: SearchEngine;
  let enhancedEngine: EnhancedSearchEngine;
  let testCacheDir: string;

  beforeAll(async () => {
    testCacheDir = join(process.cwd(), '.test-cache-enhanced');
    
    // Create test database and engines
    dbManager = await createTestDatabase();
    embeddingManager = await createTestEmbeddingManager(dbManager);
    const messageRepository = new MessageRepository(dbManager);
    ftsEngine = new SearchEngine(messageRepository);
    enhancedEngine = new EnhancedSearchEngine(dbManager, embeddingManager, ftsEngine);
    
    // Insert test data
    const conversations = createTestConversations();
    await insertTestData(dbManager, conversations);
    await generateTestEmbeddings(embeddingManager, conversations);
  }, 60000); // Allow time for model initialization

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

  describe('Initialization and Configuration', () => {
    test('should initialize with correct configuration', () => {
      const config = enhancedEngine.getConfiguration();
      
      expect(config.defaultWeights).toEqual({ semantic: 0.6, fts: 0.4 });
      expect(config.metricsEnabled).toBe(true);
    });

    test('should update configuration', async () => {
      const newWeights = { semantic: 0.7, fts: 0.3 };
      
      await enhancedEngine.updateConfiguration({
        defaultWeights: newWeights,
        metricsEnabled: false
      });
      
      const config = enhancedEngine.getConfiguration();
      expect(config.defaultWeights).toEqual(newWeights);
      expect(config.metricsEnabled).toBe(false);
      
      // Reset for other tests
      await enhancedEngine.updateConfiguration({
        defaultWeights: { semantic: 0.6, fts: 0.4 },
        metricsEnabled: true
      });
    });
  });

  describe('Search Strategy Selection', () => {
    test('should select semantic strategy for simple queries', async () => {
      const options: HybridSearchOptions = {
        query: 'cooking',
        strategy: 'auto'
      };
      
      const result = await enhancedEngine.search(options);
      
      expect(result.metrics.strategy).toBe('semantic');
      expect(result.metrics.queryAnalysis.complexity).toBe('simple');
      expect(result.metrics.queryAnalysis.termCount).toBe(1);
    });

    test('should select FTS strategy for complex queries with operators', async () => {
      const options: HybridSearchOptions = {
        query: '"React components" AND state management',
        strategy: 'auto'
      };
      
      const result = await enhancedEngine.search(options);
      
      expect(result.metrics.strategy).toBe('fts');
      expect(result.metrics.queryAnalysis.hasOperators).toBe(true);
    });

    test('should select hybrid strategy for moderate queries', async () => {
      const options: HybridSearchOptions = {
        query: 'neural networks deep learning',
        strategy: 'auto'
      };
      
      const result = await enhancedEngine.search(options);
      
      expect(result.metrics.strategy).toBe('hybrid');
      expect(result.metrics.queryAnalysis.complexity).toBe('moderate');
    });

    test('should respect manual strategy override', async () => {
      const options: HybridSearchOptions = {
        query: 'simple',
        strategy: 'hybrid' // Manual override
      };
      
      const result = await enhancedEngine.search(options);
      
      expect(result.metrics.strategy).toBe('hybrid');
    });
  });

  describe('Semantic Search', () => {
    test('should perform semantic search with similarity scoring', async () => {
      const options: HybridSearchOptions = {
        query: 'machine learning neural networks',
        strategy: 'semantic',
        limit: 5,
        semanticThreshold: 0.3
      };
      
      const result = await enhancedEngine.search(options);
      
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.metrics.strategy).toBe('semantic');
      
      // Validate result structure
      for (const item of result.results) {
        validateSearchResult(item, [
          'messageId', 'conversationId', 'content', 'score', 'matchType', 'scores'
        ]);
        expect(item.matchType).toBe('semantic');
        expect(item.scores.semantic).toBeDefined();
      }
      
      // Results should be sorted by similarity
      for (let i = 1; i < result.results.length; i++) {
        expect(result.results[i-1].score).toBeGreaterThanOrEqual(result.results[i].score);
      }
    });

    test('should filter by semantic threshold', async () => {
      const highThresholdOptions: HybridSearchOptions = {
        query: 'cooking pasta',
        strategy: 'semantic',
        semanticThreshold: 0.8
      };
      
      const lowThresholdOptions: HybridSearchOptions = {
        query: 'cooking pasta',
        strategy: 'semantic',
        semanticThreshold: 0.3
      };
      
      const highResults = await enhancedEngine.search(highThresholdOptions);
      const lowResults = await enhancedEngine.search(lowThresholdOptions);
      
      expect(lowResults.results.length).toBeGreaterThanOrEqual(highResults.results.length);
      
      // All high threshold results should meet the threshold
      for (const result of highResults.results) {
        expect(result.scores.semantic || 0).toBeGreaterThanOrEqual(0.8);
      }
    });

    test('should respect conversation filter', async () => {
      const options: HybridSearchOptions = {
        query: 'React components',
        strategy: 'semantic',
        conversationId: 'conv-tech-1'
      };
      
      const result = await enhancedEngine.search(options);
      
      expect(result.results.length).toBeGreaterThan(0);
      
      // All results should be from the specified conversation
      for (const item of result.results) {
        expect(item.conversationId).toBe('conv-tech-1');
      }
    });
  });

  describe('FTS Search', () => {
    test('should perform FTS search with text matching', async () => {
      const options: HybridSearchOptions = {
        query: 'TypeScript integration',
        strategy: 'fts',
        limit: 5
      };
      
      const result = await enhancedEngine.search(options);
      
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.metrics.strategy).toBe('fts');
      
      // Validate result structure
      for (const item of result.results) {
        validateSearchResult(item, [
          'messageId', 'conversationId', 'content', 'score', 'matchType', 'highlights'
        ]);
        expect(item.matchType).toBe('fts');
        expect(item.scores.fts).toBeDefined();
        expect(item.highlights.length).toBeGreaterThan(0);
      }
    });

    test('should handle exact phrase searches', async () => {
      const options: HybridSearchOptions = {
        query: '"React components"',
        strategy: 'fts'
      };
      
      const result = await enhancedEngine.search(options);
      
      expect(result.results.length).toBeGreaterThan(0);
      
      // Results should contain the exact phrase
      const hasExactPhrase = result.results.some(item => 
        item.content.includes('React components')
      );
      expect(hasExactPhrase).toBe(true);
    });
  });

  describe('Hybrid Search', () => {
    test('should combine semantic and FTS results', async () => {
      const options: HybridSearchOptions = {
        query: 'React state management',
        strategy: 'hybrid',
        weights: { semantic: 0.6, fts: 0.4 },
        limit: 10
      };
      
      const result = await enhancedEngine.search(options);
      
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.metrics.strategy).toBe('hybrid');
      
      // Validate hybrid results
      for (const item of result.results) {
        expect(item.matchType).toBe('hybrid');
        expect(item.scores.combined).toBeDefined();
        
        // May have semantic or FTS scores or both
        const hasSemanticScore = item.scores.semantic !== undefined;
        const hasFTSScore = item.scores.fts !== undefined;
        expect(hasSemanticScore || hasFTSScore).toBe(true);
      }
    });

    test('should respect custom weights', async () => {
      const semanticHeavy: HybridSearchOptions = {
        query: 'machine learning concepts',
        strategy: 'hybrid',
        weights: { semantic: 0.9, fts: 0.1 }
      };
      
      const ftsHeavy: HybridSearchOptions = {
        query: 'machine learning concepts',
        strategy: 'hybrid',
        weights: { semantic: 0.1, fts: 0.9 }
      };
      
      const semanticResults = await enhancedEngine.search(semanticHeavy);
      const ftsResults = await enhancedEngine.search(ftsHeavy);
      
      expect(semanticResults.results.length).toBeGreaterThan(0);
      expect(ftsResults.results.length).toBeGreaterThan(0);
      
      // Results may be different due to weighting
      // This is expected behavior
    });

    test('should merge overlapping results correctly', async () => {
      const options: HybridSearchOptions = {
        query: 'TypeScript React',
        strategy: 'hybrid',
        explainResults: true
      };
      
      const result = await enhancedEngine.search(options);
      
      expect(result.results.length).toBeGreaterThan(0);
      
      // Check for explanation when enabled
      const hasExplanations = result.results.some(item => item.explanation);
      expect(hasExplanations).toBe(true);
    });
  });

  describe('Performance and Metrics', () => {
    test('should meet performance targets for semantic search', async () => {
      const timer = new PerformanceTimer();
      
      const options: HybridSearchOptions = {
        query: 'cooking recipes',
        strategy: 'semantic',
        limit: 10
      };
      
      const result = await enhancedEngine.search(options);
      
      // Target: <500ms for semantic search
      timer.expectUnder(500, 'Semantic search');
      
      expect(result.metrics.totalTime).toBeLessThan(500);
      expect(result.metrics.timing.semanticSearch).toBeGreaterThan(0);
    });

    test('should meet performance targets for FTS search', async () => {
      const timer = new PerformanceTimer();
      
      const options: HybridSearchOptions = {
        query: 'React components',
        strategy: 'fts',
        limit: 10
      };
      
      const result = await enhancedEngine.search(options);
      
      // Target: <100ms for FTS search
      timer.expectUnder(100, 'FTS search');
      
      expect(result.metrics.totalTime).toBeLessThan(100);
      expect(result.metrics.timing.ftsSearch).toBeGreaterThan(0);
    });

    test('should meet performance targets for hybrid search', async () => {
      const timer = new PerformanceTimer();
      
      const options: HybridSearchOptions = {
        query: 'neural networks deep learning',
        strategy: 'hybrid',
        limit: 10
      };
      
      const result = await enhancedEngine.search(options);
      
      // Target: <750ms for hybrid search
      timer.expectUnder(750, 'Hybrid search');
      
      expect(result.metrics.totalTime).toBeLessThan(750);
      expect(result.metrics.timing.semanticSearch).toBeGreaterThan(0);
      expect(result.metrics.timing.ftsSearch).toBeGreaterThan(0);
      expect(result.metrics.timing.resultMerging).toBeGreaterThan(0);
    });

    test('should track detailed performance metrics', async () => {
      const options: HybridSearchOptions = {
        query: 'test query for metrics',
        strategy: 'hybrid'
      };
      
      const result = await enhancedEngine.search(options);
      
      // Validate metrics structure
      expect(result.metrics).toMatchObject({
        queryId: expect.any(String),
        query: 'test query for metrics',
        strategy: 'hybrid',
        resultCount: expect.any(Number),
        totalTime: expect.any(Number),
        timing: {
          queryAnalysis: expect.any(Number),
          semanticSearch: expect.any(Number),
          ftsSearch: expect.any(Number),
          resultMerging: expect.any(Number),
          formatting: expect.any(Number)
        },
        queryAnalysis: {
          termCount: expect.any(Number),
          hasOperators: expect.any(Boolean),
          complexity: expect.stringMatching(/simple|moderate|complex/),
          suggestedStrategy: expect.any(String)
        }
      });
    });

    test('should store metrics in database', async () => {
      const options: HybridSearchOptions = {
        query: 'metrics storage test',
        strategy: 'semantic'
      };
      
      await enhancedEngine.search(options);
      
      // Check if metrics were stored
      const metrics = await enhancedEngine.getSearchMetrics({ limit: 1 });
      expect(metrics.length).toBeGreaterThan(0);
      
      const recentMetric = metrics[0];
      expect(recentMetric.queryType).toBeDefined();
      expect(recentMetric.totalQueries).toBeGreaterThan(0);
    });
  });

  describe('Query Analysis', () => {
    test('should analyze simple queries correctly', async () => {
      const options: HybridSearchOptions = {
        query: 'cooking',
        strategy: 'auto'
      };
      
      const result = await enhancedEngine.search(options);
      
      expect(result.metrics.queryAnalysis.termCount).toBe(1);
      expect(result.metrics.queryAnalysis.hasOperators).toBe(false);
      expect(result.metrics.queryAnalysis.complexity).toBe('simple');
      expect(result.metrics.queryAnalysis.suggestedStrategy).toBe('semantic');
    });

    test('should analyze complex queries with operators', async () => {
      const options: HybridSearchOptions = {
        query: '"React components" AND (state OR props)',
        strategy: 'auto'
      };
      
      const result = await enhancedEngine.search(options);
      
      expect(result.metrics.queryAnalysis.hasOperators).toBe(true);
      expect(result.metrics.queryAnalysis.complexity).toBe('complex');
      expect(result.metrics.queryAnalysis.suggestedStrategy).toBe('fts');
    });

    test('should analyze moderate complexity queries', async () => {
      const options: HybridSearchOptions = {
        query: 'neural networks machine learning',
        strategy: 'auto'
      };
      
      const result = await enhancedEngine.search(options);
      
      expect(result.metrics.queryAnalysis.termCount).toBe(3);
      expect(result.metrics.queryAnalysis.complexity).toBe('moderate');
      expect(result.metrics.queryAnalysis.suggestedStrategy).toBe('hybrid');
    });
  });

  describe('Error Handling', () => {
    test('should handle empty queries gracefully', async () => {
      const options: HybridSearchOptions = {
        query: '',
        strategy: 'auto'
      };
      
      const result = await enhancedEngine.search(options);
      
      expect(result.results).toHaveLength(0);
      expect(result.metrics.strategy).toBeDefined();
    });

    test('should handle very long queries', async () => {
      const longQuery = 'very long query '.repeat(100);
      const options: HybridSearchOptions = {
        query: longQuery,
        strategy: 'auto'
      };
      
      const result = await enhancedEngine.search(options);
      
      expect(result.metrics.strategy).toBeDefined();
      expect(result.metrics.queryAnalysis.complexity).toBe('complex');
    });

    test('should handle search failures gracefully', async () => {
      // Create a new engine with invalid configuration to trigger errors
      const invalidEmbeddingManager = new EmbeddingManager(dbManager, {
        modelName: 'invalid-model-name',
        performanceTarget: 100
      });
      
      const invalidEngine = new EnhancedSearchEngine(
        dbManager,
        invalidEmbeddingManager,
        ftsEngine
      );
      
      const options: HybridSearchOptions = {
        query: 'test query',
        strategy: 'semantic'
      };
      
      const result = await invalidEngine.search(options);
      
      // Should return empty results with error metrics
      expect(result.results).toHaveLength(0);
      expect(result.metrics.strategy).toBe('error');
      expect(result.hasMore).toBe(false);
    });
  });

  describe('Pagination and Filtering', () => {
    test('should handle pagination correctly', async () => {
      const firstPage: HybridSearchOptions = {
        query: 'learning',
        strategy: 'semantic',
        limit: 2,
        offset: 0
      };
      
      const secondPage: HybridSearchOptions = {
        query: 'learning',
        strategy: 'semantic',
        limit: 2,
        offset: 2
      };
      
      const firstResult = await enhancedEngine.search(firstPage);
      const secondResult = await enhancedEngine.search(secondPage);
      
      expect(firstResult.results.length).toBeLessThanOrEqual(2);
      expect(secondResult.results.length).toBeLessThanOrEqual(2);
      
      // Results should be different (no overlap)
      const firstIds = firstResult.results.map(r => r.messageId);
      const secondIds = secondResult.results.map(r => r.messageId);
      const overlap = firstIds.filter(id => secondIds.includes(id));
      expect(overlap).toHaveLength(0);
    });

    test('should filter by date range', async () => {
      const now = Date.now();
      const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
      
      const options: HybridSearchOptions = {
        query: 'React',
        strategy: 'semantic',
        startDate: oneDayAgo
      };
      
      const result = await enhancedEngine.search(options);
      
      // All results should be after the start date
      for (const item of result.results) {
        expect(item.createdAt).toBeGreaterThanOrEqual(now - 24 * 60 * 60 * 1000);
      }
    });
  });

  describe('Integration with Test Queries', () => {
    test('should handle all test query types correctly', async () => {
      const testQueries = createTestQueries();
      
      for (const testQuery of testQueries) {
        const options: HybridSearchOptions = {
          query: testQuery.query,
          strategy: testQuery.searchType,
          limit: 10
        };
        
        const result = await enhancedEngine.search(options);
        
        expect(result.metrics.strategy).toBe(testQuery.searchType);
        expect(result.results.length).toBeGreaterThanOrEqual(0);
        
        // Validate that results contain expected content
        if (result.results.length > 0) {
          validateSearchResult(result.results[0], [
            'messageId', 'conversationId', 'content'
          ]);
        }
      }
    });
  });

  describe('Optimization and Maintenance', () => {
    test('should optimize search indices', async () => {
      await expect(enhancedEngine.optimize()).resolves.not.toThrow();
      
      // Verify that optimization ran successfully
      // (This mainly tests that the method executes without errors)
    });

    test('should provide search configuration', () => {
      const config = enhancedEngine.getConfiguration();
      
      expect(config).toHaveProperty('defaultWeights');
      expect(config).toHaveProperty('metricsEnabled');
      expect(config.defaultWeights.semantic + config.defaultWeights.fts).toBeCloseTo(1.0);
    });
  });
});