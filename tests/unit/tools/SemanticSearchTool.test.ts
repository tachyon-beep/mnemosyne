/**
 * Unit tests for SemanticSearchTool
 * 
 * Tests the MCP tool implementation for semantic search including:
 * - Parameter validation and schema compliance
 * - Tool execution and response formatting
 * - Error handling and edge cases
 * - Integration with EnhancedSearchEngine
 */

import { SemanticSearchTool } from '../../../src/tools/SemanticSearchTool';
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
  setupMockTime,
  restoreTime
} from '../../utils/test-helpers';
import { rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('SemanticSearchTool', () => {
  let dbManager: DatabaseManager;
  let embeddingManager: EmbeddingManager;
  let ftsEngine: SearchEngine;
  let enhancedEngine: EnhancedSearchEngine;
  let semanticSearchTool: SemanticSearchTool;
  let testCacheDir: string;

  beforeAll(async () => {
    testCacheDir = join(process.cwd(), '.test-cache-semantic');
    
    // Create test infrastructure
    dbManager = await createTestDatabase();
    embeddingManager = await createTestEmbeddingManager(dbManager);
    const messageRepository = new MessageRepository(dbManager);
    ftsEngine = new SearchEngine(messageRepository);
    enhancedEngine = new EnhancedSearchEngine(dbManager, embeddingManager, ftsEngine);
    semanticSearchTool = new SemanticSearchTool(enhancedEngine);
    
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
      const name = semanticSearchTool.getName();
      const description = semanticSearchTool.getDescription();
      
      expect(name).toBe('semantic_search');
      expect(description).toContain('semantic');
      expect(description).toContain('similarity');
    });

    test('should validate required parameters', async () => {
      // Missing query parameter
      await expect(
        semanticSearchTool.execute({} as any, { requestId: 'test-req', timestamp: Date.now() })
      ).rejects.toThrow('Validation error');
      
      // Empty query
      await expect(
        semanticSearchTool.execute({ query: '' }, { requestId: 'test-req', timestamp: Date.now() })
      ).rejects.toThrow('Validation error');
    });

    test('should validate parameter types and ranges', async () => {
      // Invalid limit (too high)
      await expect(
        semanticSearchTool.execute({
          query: 'test',
          limit: 1000
        }, { requestId: 'test-req', timestamp: Date.now() })
      ).rejects.toThrow('Validation error');
      
      // Invalid threshold (out of range)
      await expect(
        semanticSearchTool.execute({
          query: 'test',
          threshold: 1.5
        }, { requestId: 'test-req', timestamp: Date.now() })
      ).rejects.toThrow('Validation error');
      
      // Invalid offset (negative)
      await expect(
        semanticSearchTool.execute({
          query: 'test',
          offset: -1
        }, { requestId: 'test-req', timestamp: Date.now() })
      ).rejects.toThrow('Validation error');
    });

    test('should apply default values correctly', async () => {
      const result = await semanticSearchTool.execute({
        query: 'machine learning'
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response.success).toBe(true);
      expect(response.pagination.limit).toBe(20); // Default limit
      expect(response.pagination.offset).toBe(0); // Default offset
      expect(response.metadata.threshold).toBe(0.7); // Default threshold
    });
  });

  describe('Basic Search Functionality', () => {
    test('should perform semantic search successfully', async () => {
      const result = await semanticSearchTool.execute({
        query: 'machine learning neural networks',
        limit: 5
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response.success).toBe(true);
      expect(Array.isArray(response.results)).toBe(true);
      expect(response.results.length).toBeGreaterThan(0);
      expect(response.results.length).toBeLessThanOrEqual(5);
      
      // Validate result structure
      for (const item of response.results) {
        expect(item).toHaveProperty('messageId');
        expect(item).toHaveProperty('conversationId');
        expect(item).toHaveProperty('content');
        expect(item).toHaveProperty('similarity');
        expect(item).toHaveProperty('preview');
        expect(item).toHaveProperty('createdAt');
        
        expect(typeof item.messageId).toBe('string');
        expect(typeof item.similarity).toBe('number');
        expect(item.similarity).toBeGreaterThanOrEqual(0);
        expect(item.similarity).toBeLessThanOrEqual(1);
      }
    });

    test('should return results sorted by similarity', async () => {
      const result = await semanticSearchTool.execute({
        query: 'cooking pasta recipes',
        limit: 10
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response.success).toBe(true);
      expect(response.results.length).toBeGreaterThan(1);
      
      // Check sorting order
      for (let i = 1; i < response.results.length; i++) {
        expect(response.results[i-1].similarity).toBeGreaterThanOrEqual(
          response.results[i].similarity
        );
      }
    });

    test('should filter by similarity threshold', async () => {
      const highThresholdResult = await semanticSearchTool.execute({
        query: 'React components',
        threshold: 0.8,
        limit: 20
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const lowThresholdResult = await semanticSearchTool.execute({
        query: 'React components',
        threshold: 0.3,
        limit: 20
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const highResponse = parseToolResponse(highThresholdResult);
      const lowResponse = parseToolResponse(lowThresholdResult);
      
      expect(lowResponse.results.length).toBeGreaterThanOrEqual(
        highResponse.results.length
      );
      
      // All high threshold results should meet the threshold
      for (const result of highResponse.results) {
        expect(result.similarity).toBeGreaterThanOrEqual(0.8);
      }
    });
  });

  describe('Advanced Search Features', () => {
    test('should filter by conversation ID', async () => {
      const result = await semanticSearchTool.execute({
        query: 'React',
        conversationId: 'conv-tech-1',
        limit: 10
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response.success).toBe(true);
      expect(response.results.length).toBeGreaterThan(0);
      
      // All results should be from the specified conversation
      for (const item of response.results) {
        expect(item.conversationId).toBe('conv-tech-1');
      }
    });

    test('should filter by date range', async () => {
      const now = Date.now();
      const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
      const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const result = await semanticSearchTool.execute({
        query: 'learning',
        startDate: oneWeekAgo,
        endDate: oneDayAgo,
        limit: 10
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response.success).toBe(true);
      
      // All results should be within the date range
      const startTime = new Date(oneWeekAgo).getTime();
      const endTime = new Date(oneDayAgo).getTime();
      
      for (const item of response.results) {
        expect(item.createdAt).toBeGreaterThanOrEqual(startTime);
        expect(item.createdAt).toBeLessThanOrEqual(endTime);
      }
    });

    test('should handle pagination correctly', async () => {
      // First page
      const firstPageResult = await semanticSearchTool.execute({
        query: 'development',
        limit: 2,
        offset: 0
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      // Second page
      const secondPageResult = await semanticSearchTool.execute({
        query: 'development',
        limit: 2,
        offset: 2
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const firstResponse = parseToolResponse(firstPageResult);
      const secondResponse = parseToolResponse(secondPageResult);
      
      expect(firstResponse.success).toBe(true);
      expect(secondResponse.success).toBe(true);
      
      expect(firstResponse.pagination.offset).toBe(0);
      expect(secondResponse.pagination.offset).toBe(2);
      
      // Results should be different
      const firstIds = firstResponse.results.map((r: any) => r.messageId);
      const secondIds = secondResponse.results.map((r: any) => r.messageId);
      const overlap = firstIds.filter((id: string) => secondIds.includes(id));
      expect(overlap).toHaveLength(0);
    });

    test('should provide explanations when requested', async () => {
      const result = await semanticSearchTool.execute({
        query: 'neural networks',
        explainResults: true,
        limit: 3
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response.success).toBe(true);
      expect(response.results.length).toBeGreaterThan(0);
      
      // Results should include explanations
      for (const item of response.results) {
        expect(item).toHaveProperty('explanation');
        expect(typeof item.explanation).toBe('string');
        expect(item.explanation.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Response Format and Metadata', () => {
    test('should include comprehensive metadata', async () => {
      const result = await semanticSearchTool.execute({
        query: 'cooking recipes',
        limit: 5
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response.success).toBe(true);
      expect(response).toHaveProperty('metadata');
      
      const metadata = response.metadata;
      expect(metadata.searchStrategy).toBe('semantic');
      expect(metadata.model).toBe('all-MiniLM-L6-v2');
      expect(metadata.threshold).toBe(0.7);
      expect(metadata).toHaveProperty('queryId');
      expect(metadata).toHaveProperty('executionTime');
      expect(metadata).toHaveProperty('timing');
      
      expect(typeof metadata.executionTime).toBe('number');
      expect(metadata.executionTime).toBeGreaterThan(0);
    });

    test('should include pagination information', async () => {
      const result = await semanticSearchTool.execute({
        query: 'machine learning',
        limit: 3,
        offset: 1
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response).toHaveProperty('pagination');
      expect(response.pagination.limit).toBe(3);
      expect(response.pagination.offset).toBe(1);
      expect(response.pagination).toHaveProperty('hasMore');
      expect(typeof response.pagination.hasMore).toBe('boolean');
    });

    test('should create meaningful previews', async () => {
      const result = await semanticSearchTool.execute({
        query: 'React components',
        limit: 3
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response.success).toBe(true);
      
      for (const item of response.results) {
        expect(item).toHaveProperty('preview');
        expect(typeof item.preview).toBe('string');
        expect(item.preview.length).toBeGreaterThan(0);
        expect(item.preview.length).toBeLessThanOrEqual(203); // 200 + "..."
      }
    });
  });

  describe('Date Validation', () => {
    test('should validate ISO 8601 date formats', async () => {
      // Invalid date format
      await expect(
        semanticSearchTool.execute({
          query: 'test',
          startDate: 'invalid-date'
        }, { requestId: 'test-req', timestamp: Date.now() })
      ).rejects.toThrow(ToolError);
      
      // Valid ISO 8601 format should work
      const validDate = new Date().toISOString();
      const result = await semanticSearchTool.execute({
        query: 'test',
        startDate: validDate
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      expect(response.success).toBe(true);
    });

    test('should validate date ranges', async () => {
      const now = Date.now();
      const startDate = new Date(now).toISOString();
      const endDate = new Date(now - 3600000).toISOString(); // 1 hour earlier
      
      // End date before start date should fail
      await expect(
        semanticSearchTool.execute({
          query: 'test',
          startDate,
          endDate
        }, { requestId: 'test-req', timestamp: Date.now() })
      ).rejects.toThrow(ToolError);
    });
  });

  describe('Performance Testing', () => {
    test('should meet performance targets', async () => {
      const timer = new PerformanceTimer();
      
      const result = await semanticSearchTool.execute({
        query: 'machine learning neural networks deep learning',
        limit: 10
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      // Should complete within reasonable time (semantic search target: 500ms)
      timer.expectUnder(500, 'Semantic search tool execution');
      
      expect(response.success).toBe(true);
      expect(response.metadata.executionTime).toBeLessThan(500);
    });

    test('should handle large result sets efficiently', async () => {
      const timer = new PerformanceTimer();
      
      const result = await semanticSearchTool.execute({
        query: 'the', // Common word that should match many messages
        limit: 50,
        threshold: 0.1 // Low threshold to get more results
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      // Should still be reasonably fast even with many results
      timer.expectUnder(1000, 'Large result set search');
      
      expect(response.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle empty search results gracefully', async () => {
      const result = await semanticSearchTool.execute({
        query: 'nonexistent unique query that should not match anything',
        threshold: 0.99
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response.success).toBe(true);
      expect(response.results).toHaveLength(0);
      expect(response.totalCount).toBe(0);
      expect(response.pagination.hasMore).toBe(false);
    });

    test('should handle search engine errors gracefully', async () => {
      // Create a tool with invalid engine to trigger errors
      const invalidEngine = new EnhancedSearchEngine(
        dbManager,
        new EmbeddingManager(dbManager, { modelName: 'invalid-model' }),
        ftsEngine
      );
      
      const invalidTool = new SemanticSearchTool(invalidEngine);
      
      await expect(
        invalidTool.execute({
          query: 'test query'
        }, { requestId: 'test-req', timestamp: Date.now() })
      ).rejects.toThrow(ToolError);
    });

    test('should handle very long queries', async () => {
      const longQuery = 'very long query '.repeat(100); // ~1600 characters
      
      const result = await semanticSearchTool.execute({
        query: longQuery,
        limit: 5
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response.success).toBe(true);
      // Should still work, might just truncate the query internally
    });
  });

  describe('Tool Validation and Health', () => {
    test('should validate tool availability', async () => {
      const validation = await semanticSearchTool.validate();
      
      expect(validation.isValid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    test('should provide usage examples', () => {
      const examples = semanticSearchTool.getExamples();
      
      expect(Array.isArray(examples)).toBe(true);
      expect(examples.length).toBeGreaterThan(0);
      
      for (const example of examples) {
        expect(example).toHaveProperty('description');
        expect(example).toHaveProperty('params');
        expect(typeof example.description).toBe('string');
        expect(typeof example.params).toBe('object');
        expect(example.params).toHaveProperty('query');
      }
    });

    test('should provide tool metadata', () => {
      const metadata = semanticSearchTool.getMetadata();
      
      expect(metadata).toHaveProperty('name');
      expect(metadata).toHaveProperty('description');
      expect(metadata).toHaveProperty('category');
      expect(metadata).toHaveProperty('requiresEmbeddings');
      expect(metadata).toHaveProperty('averageExecutionTime');
      expect(metadata).toHaveProperty('limitations');
      
      expect(metadata.name).toBe('semantic_search');
      expect(metadata.category).toBe('search');
      expect(metadata.requiresEmbeddings).toBe(true);
      expect(Array.isArray(metadata.limitations)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle queries with special characters', async () => {
      const result = await semanticSearchTool.execute({
        query: 'C++ programming & development @#$%',
        limit: 5
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response.success).toBe(true);
      // Should not crash, even if no results
    });

    test('should handle extremely short queries', async () => {
      const result = await semanticSearchTool.execute({
        query: 'a',
        limit: 5
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response.success).toBe(true);
    });

    test('should handle maximum length queries', async () => {
      const maxQuery = 'a'.repeat(1000); // Max allowed length
      
      const result = await semanticSearchTool.execute({
        query: maxQuery,
        limit: 5
      }, { requestId: 'test-req', timestamp: Date.now() });
      
      const response = parseToolResponse(result);
      
      expect(response.success).toBe(true);
    });

    test('should handle zero limit edge case', async () => {
      await expect(
        semanticSearchTool.execute({
          query: 'test',
          limit: 0
        }, { requestId: 'test-req', timestamp: Date.now() })
      ).rejects.toThrow('Validation error');
    });
  });

  describe('Time-based Testing', () => {
    test('should handle time-sensitive queries correctly', () => {
      const fixedTime = new Date('2024-01-15T10:00:00Z').getTime();
      setupMockTime(fixedTime);
      
      // Test with mocked time
      const yesterday = new Date(fixedTime - 24 * 60 * 60 * 1000).toISOString();
      
      expect(async () => {
        await semanticSearchTool.execute({
          query: 'test',
          startDate: yesterday
        }, { requestId: 'test-req', timestamp: Date.now() });
      }).not.toThrow();
    });
  });
});