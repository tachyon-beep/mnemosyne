/**
 * Unit tests for HybridSearchTool
 * 
 * Tests the MCP tool implementation for hybrid search including:
 * - Combined semantic and FTS search capabilities
 * - Strategy selection and weighting controls
 * - Advanced parameter validation
 * - Performance optimization and metrics
 */

import { HybridSearchTool } from '../../../src/tools/HybridSearchTool';
import { EnhancedSearchEngine } from '../../../src/search/EnhancedSearchEngine';
import { EmbeddingManager } from '../../../src/search/EmbeddingManager';
import { SearchEngine } from '../../../src/search/SearchEngine';
import { DatabaseManager } from '../../../src/storage/Database';
import { MessageRepository } from '../../../src/storage/repositories/MessageRepository';
import { ToolError } from '../../../src/utils/errors';
import {
  createTestDatabase,
  createTestConversations,
  insertTestData,
  createTestEmbeddingManager,
  generateTestEmbeddings,
  PerformanceTimer,
  // setupMockTime, // Commented out as unused
  restoreTime
} from '../../utils/test-helpers';
import { parseToolResponse, parseToolResponseSafe } from '../../utils/test-response-helper';
import { rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('HybridSearchTool', () => {
  let dbManager: DatabaseManager;
  let embeddingManager: EmbeddingManager;
  let ftsEngine: SearchEngine;
  let enhancedEngine: EnhancedSearchEngine;
  let hybridSearchTool: HybridSearchTool;
  let testCacheDir: string;

  beforeAll(async () => {
    testCacheDir = join(process.cwd(), '.test-cache-hybrid');
    
    // Create test infrastructure
    dbManager = await createTestDatabase();
    embeddingManager = await createTestEmbeddingManager(dbManager);
    const messageRepository = new MessageRepository(dbManager);
    ftsEngine = new SearchEngine(messageRepository);
    enhancedEngine = new EnhancedSearchEngine(dbManager, embeddingManager, ftsEngine);
    hybridSearchTool = new HybridSearchTool(enhancedEngine);
    
    // Insert test data
    const conversations = createTestConversations();
    await insertTestData(dbManager, conversations);
    await generateTestEmbeddings(embeddingManager, conversations);
  }, 60000);

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

  afterEach(() => {
    restoreTime();
  });

  describe('Tool Definition and Schema', () => {
    test('should have correct tool definition', () => {
      const name = hybridSearchTool.getName();
      const description = hybridSearchTool.getDescription();
      
      expect(name).toBe('hybrid_search');
      expect(description).toContain('combining');
      expect(description).toContain('semantic');
      expect(description).toContain('search');
    });

    test('should validate required parameters', async () => {
      // Missing query parameter
      const result1 = await hybridSearchTool.execute({} as any, { requestId: 'test-req', timestamp: Date.now() });
      const response1 = parseToolResponseSafe(result1);
      expect(response1.success).toBe(false);
      expect(response1.error).toBe('ValidationError');
      
      // Empty query
      const result2 = await hybridSearchTool.execute({ query: '' }, { requestId: 'test-req', timestamp: Date.now() });
      const response2 = parseToolResponseSafe(result2);
      expect(response2.success).toBe(false);
      expect(response2.error).toBe('ValidationError');
    });

    test('should validate weight parameters', async () => {
      // Weights that don't sum to 1.0
      const result1 = await hybridSearchTool.execute({
        query: 'test',
        weights: { semantic: 0.8, fts: 0.3 } // Sums to 1.1
      }, { requestId: 'test-req', timestamp: Date.now() });
      const response1 = parseToolResponseSafe(result1);
      expect(response1.success).toBe(false);
      expect(response1.error).toBe('ValidationError');
      
      // Negative weights
      const result2 = await hybridSearchTool.execute({
        query: 'test',
        weights: { semantic: -0.1, fts: 1.1 }
      }, { requestId: 'test-req', timestamp: Date.now() });
      const response2 = parseToolResponseSafe(result2);
      expect(response2.success).toBe(false);
      expect(response2.error).toBe('ValidationError');
      
      // Valid weights should work
      const result = await hybridSearchTool.execute({
        query: 'test',
        weights: { semantic: 0.7, fts: 0.3 }
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      expect(response.success).toBe(true);
    });

    test('should validate strategy parameter', async () => {
      // Invalid strategy
      const result1 = await hybridSearchTool.execute({
        query: 'test',
        strategy: 'invalid' as any
      }, { requestId: 'test-req', timestamp: Date.now() });
      const response1 = parseToolResponseSafe(result1);
      expect(response1.success).toBe(false);
      expect(response1.error).toBe('ValidationError');
      
      // Valid strategies
      const strategies = ['auto', 'semantic', 'fts', 'hybrid'];
      
      for (const strategy of strategies) {
        const result = await hybridSearchTool.execute({
          query: 'machine learning',
          strategy: strategy as any
        }, { requestId: 'test-req', timestamp: Date.now() });
        
        const response = parseToolResponse(result);
        expect(response.success).toBe(true);
      }
    });

    test('should apply default values correctly', async () => {
      const result = await hybridSearchTool.execute({
        query: 'machine learning'
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response.success).toBe(true);
      expect(response.pagination.limit).toBe(20);
      expect(response.pagination.offset).toBe(0);
      expect(response.metadata.weights).toEqual({ semantic: 0.6, fts: 0.4 });
    });
  });

  describe('Strategy Selection and Execution', () => {
    test('should handle auto strategy selection', async () => {
      const result = await hybridSearchTool.execute({
        query: 'machine learning concepts',
        strategy: 'auto'
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response.success).toBe(true);
      expect(response.searchStrategy).toBeDefined();
      expect(response.queryAnalysis).toBeDefined();
      expect(response.queryAnalysis.suggestedStrategy).toBeDefined();
    });

    test('should execute semantic-only strategy', async () => {
      const result = await hybridSearchTool.execute({
        query: 'neural networks deep learning',
        strategy: 'semantic',
        limit: 5
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response.success).toBe(true);
      expect(response.searchStrategy).toBe('semantic');
      expect(response.results.length).toBeGreaterThan(0);
      
      // Validate semantic results
      for (const item of response.results) {
        expect(item.matchType).toBe('semantic');
        expect(item.scores).toHaveProperty('semantic');
        expect(item.scores.semantic).toBeGreaterThan(0);
      }
    });

    test('should execute FTS-only strategy', async () => {
      const result = await hybridSearchTool.execute({
        query: '"React components"',
        strategy: 'fts',
        limit: 5
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response.success).toBe(true);
      expect(response.searchStrategy).toBe('fts');
      
      if (response.results.length > 0) {
        for (const item of response.results) {
          expect(item.matchType).toBe('fts');
          expect(item.scores).toHaveProperty('fts');
        }
      }
    });

    test('should execute hybrid strategy', async () => {
      const result = await hybridSearchTool.execute({
        query: 'React TypeScript development',
        strategy: 'hybrid',
        limit: 10
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response.success).toBe(true);
      expect(response.searchStrategy).toBe('hybrid');
      
      if (response.results.length > 0) {
        for (const item of response.results) {
          expect(item.matchType).toBe('hybrid');
          expect(item.scores).toHaveProperty('combined');
          expect(item.scores.combined).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Weighting and Ranking', () => {
    test('should apply custom weights correctly', async () => {
      const semanticHeavyResult = await hybridSearchTool.execute({
        query: 'machine learning algorithms',
        strategy: 'hybrid',
        weights: { semantic: 0.9, fts: 0.1 }
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const ftsHeavyResult = await hybridSearchTool.execute({
        query: 'machine learning algorithms',
        strategy: 'hybrid',
        weights: { semantic: 0.1, fts: 0.9 }
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const semanticResponse = parseToolResponse(semanticHeavyResult);
      const ftsResponse = parseToolResponse(ftsHeavyResult);
      
      expect(semanticResponse.success).toBe(true);
      expect(ftsResponse.success).toBe(true);
      
      expect(semanticResponse.metadata.weights).toEqual({ semantic: 0.9, fts: 0.1 });
      expect(ftsResponse.metadata.weights).toEqual({ semantic: 0.1, fts: 0.9 });
    });

    test('should maintain proper score ranking', async () => {
      const result = await hybridSearchTool.execute({
        query: 'cooking pasta recipes',
        strategy: 'hybrid',
        limit: 10
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response.success).toBe(true);
      
      if (response.results.length > 1) {
        // Results should be sorted by combined score
        for (let i = 1; i < response.results.length; i++) {
          expect(response.results[i-1].score).toBeGreaterThanOrEqual(
            response.results[i].score
          );
        }
      }
    });

    test('should handle edge case weights', async () => {
      // All semantic weight
      const allSemanticResult = await hybridSearchTool.execute({
        query: 'neural networks',
        strategy: 'hybrid',
        weights: { semantic: 1.0, fts: 0.0 }
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      // All FTS weight
      const allFtsResult = await hybridSearchTool.execute({
        query: 'neural networks',
        strategy: 'hybrid',
        weights: { semantic: 0.0, fts: 1.0 }
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const semanticResponse = parseToolResponse(allSemanticResult);
      const ftsResponse = parseToolResponse(allFtsResult);
      
      expect(semanticResponse.success).toBe(true);
      expect(ftsResponse.success).toBe(true);
    });
  });

  describe('Advanced Search Features', () => {
    test('should filter by conversation ID', async () => {
      const result = await hybridSearchTool.execute({
        query: 'TypeScript',
        conversationId: 'conv-tech-1',
        strategy: 'hybrid'
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response.success).toBe(true);
      
      for (const item of response.results) {
        expect(item.conversationId).toBe('conv-tech-1');
      }
    });

    test('should filter by date range', async () => {
      const now = Date.now();
      const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
      const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const result = await hybridSearchTool.execute({
        query: 'learning',
        startDate: oneWeekAgo,
        endDate: oneDayAgo,
        strategy: 'hybrid'
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response.success).toBe(true);
      
      const startTime = new Date(oneWeekAgo).getTime();
      const endTime = new Date(oneDayAgo).getTime();
      
      for (const item of response.results) {
        expect(item.createdAt).toBeGreaterThanOrEqual(startTime);
        expect(item.createdAt).toBeLessThanOrEqual(endTime);
      }
    });

    test('should handle different match types', async () => {
      const matchTypes = ['fuzzy', 'exact', 'prefix'];
      
      for (const matchType of matchTypes) {
        const result = await hybridSearchTool.execute({
          query: 'React',
          matchType: matchType as any,
          strategy: 'fts',
          limit: 5
        }, { requestId: 'test-req', timestamp: Date.now() });
        
        const response = parseToolResponse(result);
        expect(response.success).toBe(true);
      }
    });

    test('should provide result explanations', async () => {
      const result = await hybridSearchTool.execute({
        query: 'machine learning neural networks',
        strategy: 'hybrid',
        explainResults: true,
        limit: 3
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response.success).toBe(true);
      
      if (response.results.length > 0) {
        for (const item of response.results) {
          expect(item).toHaveProperty('explanation');
          expect(typeof item.explanation).toBe('string');
          expect(item.explanation.length).toBeGreaterThan(0);
        }
      }
    });

    test('should include detailed metrics when requested', async () => {
      const result = await hybridSearchTool.execute({
        query: 'cooking recipes',
        strategy: 'hybrid',
        includeMetrics: true
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response.success).toBe(true);
      expect(response.metadata).toHaveProperty('detailedTiming');
      expect(response.metadata.detailedTiming).toHaveProperty('queryAnalysis');
      expect(response.metadata.detailedTiming).toHaveProperty('semanticSearch');
      expect(response.metadata.detailedTiming).toHaveProperty('ftsSearch');
    });
  });

  describe('Query Analysis and Intelligence', () => {
    test('should analyze query complexity correctly', async () => {
      const simpleResult = await hybridSearchTool.execute({
        query: 'cooking',
        strategy: 'auto'
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const complexResult = await hybridSearchTool.execute({
        query: '"React components" AND (state OR props) -legacy',
        strategy: 'auto'
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const simpleResponse = parseToolResponse(simpleResult);
      const complexResponse = parseToolResponse(complexResult);
      
      expect(simpleResponse.queryAnalysis.complexity).toBe('simple');
      expect(complexResponse.queryAnalysis.complexity).toBe('complex');
      expect(complexResponse.queryAnalysis.hasOperators).toBe(true);
    });

    test('should provide strategy recommendations', async () => {
      const recommendation = await hybridSearchTool.getStrategyRecommendation(
        'machine learning neural networks'
      );
      
      expect(recommendation).toHaveProperty('recommended');
      expect(recommendation).toHaveProperty('reasoning');
      expect(recommendation).toHaveProperty('confidence');
      
      expect(['semantic', 'fts', 'hybrid']).toContain(recommendation.recommended);
      expect(typeof recommendation.reasoning).toBe('string');
      expect(recommendation.confidence).toBeGreaterThan(0);
      expect(recommendation.confidence).toBeLessThanOrEqual(1);
    });

    test('should handle quoted phrase recommendations', async () => {
      const recommendation = await hybridSearchTool.getStrategyRecommendation(
        '"exact phrase search"'
      );
      
      expect(recommendation.recommended).toBe('fts');
      expect(recommendation.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('Performance and Optimization', () => {
    test('should meet performance targets for different strategies', async () => {
      const strategies = [
        { name: 'semantic', target: 500 },
        { name: 'fts', target: 100 },
        { name: 'hybrid', target: 750 }
      ];
      
      for (const strategy of strategies) {
        const timer = new PerformanceTimer();
        
        const result = await hybridSearchTool.execute({
          query: 'machine learning development',
          strategy: strategy.name as any,
          limit: 10
        }, { requestId: 'test-req', timestamp: Date.now() });
        
        const response = parseToolResponse(result);
        
        timer.expectUnder(strategy.target, `${strategy.name} search`);
        
        expect(response.success).toBe(true);
        expect(response.metadata.executionTime).toBeLessThan(strategy.target);
      }
    });

    test('should handle large limit efficiently', async () => {
      const timer = new PerformanceTimer();
      
      const result = await hybridSearchTool.execute({
        query: 'development',
        strategy: 'hybrid',
        limit: 50,
        semanticThreshold: 0.1
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      timer.expectUnder(2000, 'Large result set hybrid search');
      
      expect(response.success).toBe(true);
      expect(response.results.length).toBeLessThanOrEqual(50);
    });

    test('should optimize preview generation', async () => {
      const result = await hybridSearchTool.execute({
        query: 'React components TypeScript',
        strategy: 'hybrid',
        limit: 10
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response.success).toBe(true);
      
      for (const item of response.results) {
        expect(item).toHaveProperty('preview');
        expect(typeof item.preview).toBe('string');
        expect(item.preview.length).toBeLessThanOrEqual(303); // 300 + "..."
        
        // Preview should be meaningful
        if (item.preview.length > 0) {
          expect(item.preview.trim().length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle search engine failures gracefully', async () => {
      // Create invalid engine to trigger errors
      const invalidEngine = new EnhancedSearchEngine(
        dbManager,
        new EmbeddingManager(dbManager, { modelName: 'invalid-model' }),
        ftsEngine
      );
      
      const invalidTool = new HybridSearchTool(invalidEngine);
      
      const result = await invalidTool.execute({
        query: 'test query'
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      // Tool should handle error gracefully and return error response
      const response = parseToolResponse(result);
      expect(response.success).toBe(true);
      expect(response.searchStrategy).toBe('error');
    });

    test('should handle empty results gracefully', async () => {
      const result = await hybridSearchTool.execute({
        query: 'absolutely unique nonexistent content query',
        semanticThreshold: 0.99,
        strategy: 'hybrid'
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response.success).toBe(true);
      expect(response.results).toHaveLength(0);
      expect(response.totalCount).toBe(0);
      expect(response.pagination.hasMore).toBe(false);
    });

    test('should validate date parameters properly', async () => {
      // Invalid start date
      const result1 = await hybridSearchTool.execute({
        query: 'test',
        startDate: 'not-a-date'
      }, { requestId: 'test-req', timestamp: Date.now() });
      const response1 = parseToolResponseSafe(result1);
      expect(response1.success).toBe(false);
      expect(response1.error).toBe('ValidationError');
      
      // Start date after end date
      const now = Date.now();
      const startDate = new Date(now).toISOString();
      const endDate = new Date(now - 3600000).toISOString();
      
      const result2 = await hybridSearchTool.execute({
        query: 'test',
        startDate,
        endDate
      }, { requestId: 'test-req', timestamp: Date.now() });
      const response2 = parseToolResponseSafe(result2);
      expect(response2.success).toBe(false);
    });

    test('should handle special characters in queries', async () => {
      const specialQueries = [
        'C++ programming',
        'SQL WHERE clause & JOIN',
        'file.ext extension',
        '100% accuracy',
        'email@domain.com format'
      ];
      
      for (const query of specialQueries) {
        const result = await hybridSearchTool.execute({
          query,
          strategy: 'hybrid',
          limit: 5
        }, { requestId: 'test-req', timestamp: Date.now() });
        
        const response = parseToolResponse(result);
        expect(response.success).toBe(true);
      }
    });

    test('should handle maximum length queries', async () => {
      const maxQuery = 'a'.repeat(1000);
      
      const result = await hybridSearchTool.execute({
        query: maxQuery,
        strategy: 'auto'
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      expect(response.success).toBe(true);
    });
  });

  describe('Tool Validation and Metadata', () => {
    test('should validate tool availability', async () => {
      const validation = await hybridSearchTool.validate();
      
      expect(validation.isValid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    test('should provide comprehensive usage examples', () => {
      const examples = hybridSearchTool.getExamples();
      
      expect(Array.isArray(examples)).toBe(true);
      expect(examples.length).toBeGreaterThan(3);
      
      // Should cover different strategies and use cases
      const strategies = examples.map(ex => ex.params.strategy);
      expect(strategies).toContain('auto');
      expect(strategies).toContain('hybrid');
      
      for (const example of examples) {
        expect(example).toHaveProperty('description');
        expect(example).toHaveProperty('params');
        expect(typeof example.description).toBe('string');
        expect(example.params).toHaveProperty('query');
        expect(example.params.query.length).toBeGreaterThan(0);
      }
    });

    test('should provide detailed tool metadata', () => {
      const metadata = hybridSearchTool.getMetadata();
      
      expect(metadata).toHaveProperty('name');
      expect(metadata).toHaveProperty('description');
      expect(metadata).toHaveProperty('capabilities');
      expect(metadata).toHaveProperty('supportedSearchTypes');
      expect(metadata).toHaveProperty('limitations');
      expect(metadata).toHaveProperty('bestUseCases');
      
      expect(metadata.name).toBe('hybrid_search');
      expect(Array.isArray(metadata.capabilities)).toBe(true);
      expect(metadata.capabilities.length).toBeGreaterThan(3);
      expect(Array.isArray(metadata.supportedSearchTypes)).toBe(true);
      expect(Array.isArray(metadata.limitations)).toBe(true);
      expect(Array.isArray(metadata.bestUseCases)).toBe(true);
    });
  });

  describe('Pagination and Result Management', () => {
    test('should handle pagination with different strategies', async () => {
      const strategies = ['semantic', 'fts', 'hybrid'];
      
      for (const strategy of strategies) {
        const firstPage = await hybridSearchTool.execute({
          query: 'learning development',
          strategy: strategy as any,
          limit: 3,
          offset: 0
        }, { requestId: 'test-req', timestamp: Date.now() });
        
        const secondPage = await hybridSearchTool.execute({
          query: 'learning development',
          strategy: strategy as any,
          limit: 3,
          offset: 3
        }, { requestId: 'test-req', timestamp: Date.now() });
        
        const firstResponse = parseToolResponse(firstPage);
        const secondResponse = parseToolResponse(secondPage);
        
        expect(firstResponse.success).toBe(true);
        expect(secondResponse.success).toBe(true);
        
        expect(firstResponse.pagination.offset).toBe(0);
        expect(secondResponse.pagination.offset).toBe(3);
        
        // No overlap in results
        const firstIds = firstResponse.results.map((r: any) => r.messageId);
        const secondIds = secondResponse.results.map((r: any) => r.messageId);
        const overlap = firstIds.filter((id: string) => secondIds.includes(id));
        expect(overlap).toHaveLength(0);
      }
    });

    test('should indicate when more results are available', async () => {
      const smallLimitResult = await hybridSearchTool.execute({
        query: 'the', // Common word
        strategy: 'hybrid',
        limit: 1,
        semanticThreshold: 0.1
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = JSON.parse(smallLimitResult.content[0].text!);
      
      expect(response.success).toBe(true);
      expect(response.pagination).toHaveProperty('hasMore');
      
      if (response.results.length === 1) {
        // If we got exactly the limit, there might be more
        expect(typeof response.pagination.hasMore).toBe('boolean');
      }
    });
  });
});