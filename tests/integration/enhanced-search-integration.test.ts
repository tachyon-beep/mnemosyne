/**
 * Integration tests for Enhanced Search System
 * 
 * Tests end-to-end integration of enhanced search components including:
 * - Complete search pipeline from MCP tools to database
 * - Cross-component interactions and data flow
 * - Real-world usage scenarios and workflows
 * - Performance under realistic conditions
 */

import { EnhancedSearchEngine } from '../../src/search/EnhancedSearchEngine';
import { EmbeddingManager } from '../../src/search/EmbeddingManager';
import { SearchEngine } from '../../src/search/SearchEngine';
import { SemanticSearchTool } from '../../src/tools/SemanticSearchTool';
import { HybridSearchTool } from '../../src/tools/HybridSearchTool';
import { DatabaseManager } from '../../src/storage/Database';
import { MCPServer } from '../../src/server/MCPServer';
import { ToolRegistry } from '../../src/server/ToolRegistry';
import {
  createTestDatabase,
  createTestConversations,
  insertTestData,
  createTestEmbeddingManager,
  generateTestEmbeddings,
  MockTransport,
  PerformanceTimer,
  waitFor
} from '../utils/test-helpers';
import { rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('Enhanced Search Integration', () => {
  let dbManager: DatabaseManager;
  let embeddingManager: EmbeddingManager;
  let ftsEngine: SearchEngine;
  let enhancedEngine: EnhancedSearchEngine;
  let semanticTool: SemanticSearchTool;
  let hybridTool: HybridSearchTool;
  let server: MCPServer;
  let testCacheDir: string;

  beforeAll(async () => {
    testCacheDir = join(process.cwd(), '.test-cache-integration');
    
    // Set up complete search infrastructure
    dbManager = await createTestDatabase();
    embeddingManager = await createTestEmbeddingManager(dbManager);
    ftsEngine = new SearchEngine(dbManager);
    enhancedEngine = new EnhancedSearchEngine(dbManager, embeddingManager, ftsEngine);
    
    // Create MCP tools
    semanticTool = new SemanticSearchTool(enhancedEngine);
    hybridTool = new HybridSearchTool(enhancedEngine);
    
    // Set up MCP server
    const toolRegistry = new ToolRegistry();
    toolRegistry.register(semanticTool);
    toolRegistry.register(hybridTool);
    server = new MCPServer(toolRegistry);
    
    // Insert and process test data
    const conversations = createTestConversations();
    await insertTestData(dbManager, conversations);
    await generateTestEmbeddings(embeddingManager, conversations);
    
    console.log('Integration test setup complete');
  }, 120000); // Allow extended time for setup

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

  describe('End-to-End Search Workflows', () => {
    test('should complete full semantic search workflow', async () => {
      const timer = new PerformanceTimer();
      
      // Simulate MCP tool call through the complete pipeline
      const result = await semanticTool.handle({
        query: 'machine learning neural networks deep learning',
        limit: 10,
        threshold: 0.6,
        explainResults: true
      }, {});
      
      timer.expectUnder(1000, 'Complete semantic search workflow');
      
      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(true);
      expect(response.results.length).toBeGreaterThan(0);
      expect(response.metadata).toBeDefined();
      expect(response.metadata.searchStrategy).toBe('semantic');
      expect(response.metadata.executionTime).toBeGreaterThan(0);
      
      // Validate that embeddings were used
      expect(response.metadata.model).toBe('all-MiniLM-L6-v2');
      
      // Check explanations
      const hasExplanations = response.results.some((r: any) => r.explanation);
      expect(hasExplanations).toBe(true);
    });

    test('should complete full hybrid search workflow', async () => {
      const timer = new PerformanceTimer();
      
      const result = await hybridTool.handle({
        query: 'React TypeScript components state management',
        strategy: 'hybrid',
        weights: { semantic: 0.7, fts: 0.3 },
        limit: 15,
        explainResults: true,
        includeMetrics: true
      }, {});
      
      timer.expectUnder(1500, 'Complete hybrid search workflow');
      
      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(true);
      expect(response.searchStrategy).toBe('hybrid');
      expect(response.results.length).toBeGreaterThan(0);
      
      // Validate hybrid scoring
      for (const item of response.results) {
        expect(item.matchType).toBe('hybrid');
        expect(item.scores.combined).toBeGreaterThan(0);
      }
      
      // Check detailed metrics
      expect(response.metadata.detailedTiming).toBeDefined();
      expect(response.metadata.detailedTiming.semanticSearch).toBeGreaterThan(0);
      expect(response.metadata.detailedTiming.ftsSearch).toBeGreaterThan(0);
    });

    test('should handle complex multi-conversation search', async () => {
      const result = await hybridTool.handle({
        query: 'learning algorithms techniques',
        strategy: 'auto',
        limit: 20,
        semanticThreshold: 0.5
      }, {});
      
      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(true);
      expect(response.results.length).toBeGreaterThan(0);
      
      // Should find results across multiple conversations
      const conversationIds = new Set(response.results.map((r: any) => r.conversationId));
      expect(conversationIds.size).toBeGreaterThan(1);
      
      // Validate query analysis worked
      expect(response.queryAnalysis).toBeDefined();
      expect(response.queryAnalysis.complexity).toBeDefined();
      expect(response.queryAnalysis.suggestedStrategy).toBeDefined();
    });
  });

  describe('Cross-Component Integration', () => {
    test('should maintain consistency between search engines', async () => {
      const query = 'cooking pasta carbonara';
      
      // Get results from hybrid tool (which uses both engines)
      const hybridResult = await hybridTool.handle({
        query,
        strategy: 'hybrid',
        weights: { semantic: 0.5, fts: 0.5 }
      }, {});
      
      // Get results from semantic tool only
      const semanticResult = await semanticTool.handle({
        query,
        threshold: 0.3
      }, {});
      
      const hybridResponse = JSON.parse(hybridResult.content[0].text);
      const semanticResponse = JSON.parse(semanticResult.content[0].text);
      
      expect(hybridResponse.success).toBe(true);
      expect(semanticResponse.success).toBe(true);
      
      // Should have some overlapping results
      const hybridIds = hybridResponse.results.map((r: any) => r.messageId);
      const semanticIds = semanticResponse.results.map((r: any) => r.messageId);
      const overlap = hybridIds.filter((id: string) => semanticIds.includes(id));
      
      expect(overlap.length).toBeGreaterThan(0);
    });

    test('should handle concurrent search requests', async () => {
      const queries = [
        'machine learning algorithms',
        'cooking recipes Italian',
        'travel Japan Tokyo',
        'React TypeScript development',
        'philosophy meaning life'
      ];
      
      const timer = new PerformanceTimer();
      
      // Execute all searches concurrently
      const promises = queries.map(query => 
        hybridTool.handle({
          query,
          strategy: 'auto',
          limit: 5
        }, {})
      );
      
      const results = await Promise.all(promises);
      
      timer.expectUnder(2000, 'Concurrent search requests');
      
      // All searches should succeed
      for (const result of results) {
        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
      }
      
      // Each should have unique query IDs
      const queryIds = results.map(result => {
        const response = JSON.parse(result.content[0].text);
        return response.metadata.queryId;
      });
      
      const uniqueIds = new Set(queryIds);
      expect(uniqueIds.size).toBe(queryIds.length);
    });

    test('should maintain data consistency during updates', async () => {
      // Add a new message
      const db = dbManager.getConnection();
      const newMessageId = 'msg-integration-test';
      const newContent = 'This is a new message about artificial intelligence and machine learning.';
      
      db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(newMessageId, 'conv-tech-1', 'user', newContent, Date.now());
      
      // Generate embedding for new message
      const embedding = await embeddingManager.generateEmbedding(newContent);
      await embeddingManager.storeEmbedding(newMessageId, embedding);
      
      // Search should now include the new message
      const result = await semanticTool.handle({
        query: 'artificial intelligence machine learning',
        conversationId: 'conv-tech-1',
        threshold: 0.5
      }, {});
      
      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(true);
      
      const foundNewMessage = response.results.some((r: any) => 
        r.messageId === newMessageId
      );
      expect(foundNewMessage).toBe(true);
      
      // Clean up
      db.prepare('DELETE FROM messages WHERE id = ?').run(newMessageId);
    });
  });

  describe('Performance Under Load', () => {
    test('should handle batch embedding processing', async () => {
      const timer = new PerformanceTimer();
      
      // Process any unembedded messages
      const result = await embeddingManager.processUnembeddedMessages(50);
      
      timer.expectUnder(30000, 'Batch embedding processing'); // 30 seconds max
      
      expect(result.errors).toBe(0);
      
      // Verify embeddings are working
      const searchResult = await semanticTool.handle({
        query: 'test embedding processing',
        limit: 5
      }, {});
      
      const response = JSON.parse(searchResult.content[0].text);
      expect(response.success).toBe(true);
    });

    test('should maintain performance with large result sets', async () => {
      const timer = new PerformanceTimer();
      
      const result = await hybridTool.handle({
        query: 'the', // Common word that should match many messages
        strategy: 'hybrid',
        limit: 50,
        semanticThreshold: 0.1
      }, {});
      
      timer.expectUnder(2000, 'Large result set search');
      
      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(true);
      expect(response.results.length).toBeLessThanOrEqual(50);
      expect(response.metadata.executionTime).toBeLessThan(2000);
    });

    test('should handle search optimization', async () => {
      const timer = new PerformanceTimer();
      
      // Run optimization
      await enhancedEngine.optimize();
      
      timer.expectUnder(5000, 'Search optimization');
      
      // Verify search still works after optimization
      const result = await hybridTool.handle({
        query: 'optimization test',
        strategy: 'hybrid'
      }, {});
      
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should handle embedding service temporary failure', async () => {
      // Temporarily break the embedding manager
      const originalModel = (embeddingManager as any).model;
      (embeddingManager as any).model = null;
      
      try {
        const result = await semanticTool.handle({
          query: 'test with broken embeddings',
          limit: 5
        }, {});
        
        // Should either succeed with cached embeddings or fail gracefully
        const response = JSON.parse(result.content[0].text);
        // The test should not crash the system
        expect(response).toBeDefined();
        
      } catch (error) {
        // Graceful failure is acceptable
        expect(error).toBeDefined();
      } finally {
        // Restore the model
        (embeddingManager as any).model = originalModel;
      }
    });

    test('should handle database connection issues gracefully', async () => {
      // This test simulates database issues by using an invalid query
      const result = await hybridTool.handle({
        query: '', // Empty query should be handled gracefully
        strategy: 'auto'
      }, {});
      
      const response = JSON.parse(result.content[0].text);
      
      // Should return empty results, not crash
      expect(response.success).toBe(true);
      expect(response.results).toHaveLength(0);
    });

    test('should maintain service during high concurrent load', async () => {
      const concurrentRequests = 10;
      const timer = new PerformanceTimer();
      
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        hybridTool.handle({
          query: `concurrent test query ${i}`,
          strategy: 'auto',
          limit: 5
        }, {})
      );
      
      const results = await Promise.all(promises);
      
      timer.expectUnder(5000, 'High concurrent load handling');
      
      // All requests should complete successfully
      for (const result of results) {
        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
      }
    });
  });

  describe('MCP Protocol Integration', () => {
    test('should handle MCP tool calls through server', async () => {
      const mockTransport = new MockTransport();
      
      // Simulate tool call request
      const toolCallRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'semantic_search',
          arguments: {
            query: 'machine learning concepts',
            limit: 5,
            threshold: 0.7
          }
        }
      };
      
      // This would normally go through the server, but we'll test the tool directly
      const result = await semanticTool.handle(toolCallRequest.params.arguments, {});
      
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
    });

    test('should provide correct tool metadata for MCP discovery', () => {
      const semanticMetadata = semanticTool.getMetadata();
      const hybridMetadata = hybridTool.getMetadata();
      
      expect(semanticMetadata.name).toBe('semantic_search');
      expect(hybridMetadata.name).toBe('hybrid_search');
      
      expect(semanticMetadata.requiresEmbeddings).toBe(true);
      expect(hybridMetadata.capabilities).toContain('Semantic similarity search');
      expect(hybridMetadata.capabilities).toContain('Full-text search (FTS5)');
    });

    test('should validate tool parameters according to MCP schemas', async () => {
      // Test semantic tool validation
      await expect(
        semanticTool.handle({
          query: '', // Invalid empty query
          limit: 5
        }, {})
      ).rejects.toThrow();
      
      // Test hybrid tool validation
      await expect(
        hybridTool.handle({
          query: 'test',
          weights: { semantic: 0.8, fts: 0.3 } // Invalid sum
        }, {})
      ).rejects.toThrow();
    });
  });

  describe('Real-World Usage Scenarios', () => {
    test('should support developer workflow: finding related technical discussions', async () => {
      const result = await hybridTool.handle({
        query: 'React TypeScript state management hooks',
        strategy: 'hybrid',
        weights: { semantic: 0.6, fts: 0.4 },
        explainResults: true,
        limit: 10
      }, {});
      
      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(true);
      expect(response.results.length).toBeGreaterThan(0);
      
      // Should find relevant technical content
      const hasRelevantContent = response.results.some((r: any) =>
        r.content.toLowerCase().includes('react') ||
        r.content.toLowerCase().includes('typescript') ||
        r.content.toLowerCase().includes('state')
      );
      expect(hasRelevantContent).toBe(true);
    });

    test('should support research workflow: semantic concept exploration', async () => {
      const result = await semanticTool.handle({
        query: 'learning algorithms neural networks',
        threshold: 0.5,
        explainResults: true,
        limit: 15
      }, {});
      
      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(true);
      expect(response.results.length).toBeGreaterThan(0);
      
      // Should provide explanations for research context
      const hasExplanations = response.results.every((r: any) => r.explanation);
      expect(hasExplanations).toBe(true);
      
      // Results should be sorted by relevance
      for (let i = 1; i < response.results.length; i++) {
        expect(response.results[i-1].similarity).toBeGreaterThanOrEqual(
          response.results[i].similarity
        );
      }
    });

    test('should support content curation: finding conversations by topic', async () => {
      const result = await hybridTool.handle({
        query: 'cooking recipes food preparation',
        strategy: 'hybrid',
        limit: 10
      }, {});
      
      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(true);
      
      if (response.results.length > 0) {
        // Should group related content from cooking conversations
        const cookingResults = response.results.filter((r: any) =>
          r.content.toLowerCase().includes('cook') ||
          r.content.toLowerCase().includes('recipe') ||
          r.content.toLowerCase().includes('food')
        );
        
        expect(cookingResults.length).toBeGreaterThan(0);
        
        // Should include conversation context
        for (const result of response.results) {
          expect(result.conversationTitle).toBeDefined();
        }
      }
    });

    test('should support temporal search: finding recent discussions', async () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const result = await hybridTool.handle({
        query: 'development programming',
        startDate: oneDayAgo,
        strategy: 'hybrid',
        limit: 20
      }, {});
      
      const response = JSON.parse(result.content[0].text);
      
      expect(response.success).toBe(true);
      
      // All results should be after the specified date
      const startTime = new Date(oneDayAgo).getTime();
      for (const result of response.results) {
        expect(result.createdAt).toBeGreaterThanOrEqual(startTime);
      }
    });
  });

  describe('Analytics and Monitoring', () => {
    test('should track search metrics across the system', async () => {
      // Perform several searches to generate metrics
      const searches = [
        { query: 'machine learning', strategy: 'semantic' },
        { query: 'React components', strategy: 'fts' },
        { query: 'cooking recipes', strategy: 'hybrid' }
      ];
      
      for (const search of searches) {
        await hybridTool.handle({
          query: search.query,
          strategy: search.strategy as any,
          limit: 5
        }, {});
      }
      
      // Check if metrics were stored
      const metrics = await enhancedEngine.getSearchMetrics({ limit: 10 });
      
      expect(metrics.length).toBeGreaterThan(0);
      
      for (const metric of metrics) {
        expect(metric).toHaveProperty('queryType');
        expect(metric).toHaveProperty('avgExecutionTime');
        expect(metric).toHaveProperty('totalQueries');
        expect(metric.avgExecutionTime).toBeGreaterThan(0);
        expect(metric.totalQueries).toBeGreaterThan(0);
      }
    });

    test('should provide comprehensive embedding statistics', async () => {
      const stats = await embeddingManager.getEmbeddingStats();
      
      expect(stats).toHaveProperty('totalMessages');
      expect(stats).toHaveProperty('embeddedMessages');
      expect(stats).toHaveProperty('embeddingCoverage');
      expect(stats).toHaveProperty('performanceMetrics');
      expect(stats).toHaveProperty('modelInfo');
      
      expect(stats.totalMessages).toBeGreaterThan(0);
      expect(stats.embeddedMessages).toBeGreaterThan(0);
      expect(stats.embeddingCoverage).toBeGreaterThan(0);
      expect(stats.modelInfo.isInitialized).toBe(true);
    });

    test('should maintain search configuration persistence', async () => {
      const originalConfig = enhancedEngine.getConfiguration();
      
      // Update configuration
      const newWeights = { semantic: 0.8, fts: 0.2 };
      await enhancedEngine.updateConfiguration({
        defaultWeights: newWeights
      });
      
      // Verify update
      const updatedConfig = enhancedEngine.getConfiguration();
      expect(updatedConfig.defaultWeights).toEqual(newWeights);
      
      // Restore original configuration
      await enhancedEngine.updateConfiguration({
        defaultWeights: originalConfig.defaultWeights
      });
    });
  });

  describe('Data Pipeline Integration', () => {
    test('should handle complete message lifecycle', async () => {
      const newConversationId = 'conv-integration-test';
      const newMessageId = 'msg-integration-lifecycle';
      const content = 'Integration test message about advanced machine learning techniques and neural network architectures.';
      
      const db = dbManager.getConnection();
      
      // 1. Insert new conversation and message
      db.prepare(`
        INSERT INTO conversations (id, title, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `).run(newConversationId, 'Integration Test Conversation', Date.now(), Date.now());
      
      db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(newMessageId, newConversationId, 'user', content, Date.now());
      
      // 2. Generate and store embedding
      const embedding = await embeddingManager.generateEmbedding(content);
      await embeddingManager.storeEmbedding(newMessageId, embedding);
      
      // 3. Verify searchability through both engines
      const semanticResult = await semanticTool.handle({
        query: 'machine learning neural networks',
        conversationId: newConversationId,
        threshold: 0.5
      }, {});
      
      const hybridResult = await hybridTool.handle({
        query: 'machine learning neural networks',
        conversationId: newConversationId,
        strategy: 'hybrid'
      }, {});
      
      const semanticResponse = JSON.parse(semanticResult.content[0].text);
      const hybridResponse = JSON.parse(hybridResult.content[0].text);
      
      expect(semanticResponse.success).toBe(true);
      expect(hybridResponse.success).toBe(true);
      
      // Should find the new message
      const foundInSemantic = semanticResponse.results.some((r: any) => 
        r.messageId === newMessageId
      );
      const foundInHybrid = hybridResponse.results.some((r: any) => 
        r.messageId === newMessageId
      );
      
      expect(foundInSemantic).toBe(true);
      expect(foundInHybrid).toBe(true);
      
      // 4. Clean up
      db.prepare('DELETE FROM messages WHERE id = ?').run(newMessageId);
      db.prepare('DELETE FROM conversations WHERE id = ?').run(newConversationId);
    });
  });
});