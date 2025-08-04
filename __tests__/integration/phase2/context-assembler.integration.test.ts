/**
 * Context Assembler Integration Tests
 * 
 * Comprehensive integration tests for the ContextAssembler service:
 * - Multi-factor relevance scoring
 * - Token budget management
 * - Different assembly strategies (temporal, topical, entity-centric, hybrid)
 * - Smart context selection and ranking
 * - Performance optimization
 */

import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals';
import Database from 'better-sqlite3';
import { DatabaseManager } from '../../../src/storage/Database.js';
import { ContextAssembler, ContextAssemblyRequest } from '../../../src/context/ContextAssembler.js';
import { EmbeddingManager } from '../../../src/search/EmbeddingManager.js';
import { MessageRepository } from '../../../src/storage/repositories/MessageRepository.js';
import { SummaryRepository } from '../../../src/storage/repositories/SummaryRepository.js';
import { ConversationRepository } from '../../../src/storage/repositories/ConversationRepository.js';
import { Message, ConversationSummary } from '../../../src/types/interfaces.js';

// Mock EmbeddingManager to avoid model dependencies
jest.mock('../../../src/search/EmbeddingManager.js');

describe('ContextAssembler Integration Tests', () => {
  let db: Database.Database;
  let dbManager: DatabaseManager;
  let contextAssembler: ContextAssembler;
  let mockEmbeddingManager: jest.Mocked<EmbeddingManager>;
  let messageRepo: MessageRepository;
  let summaryRepo: SummaryRepository;
  let conversationRepo: ConversationRepository;
  let testConversationId: string;

  beforeEach(async () => {
    // Setup in-memory database
    db = new Database(':memory:');
    dbManager = new DatabaseManager({
      databasePath: ':memory:',
      enableWAL: false,
      enableForeignKeys: true
    });
    (dbManager as any).db = db;
    await dbManager.initialize();

    // Initialize repositories
    messageRepo = new MessageRepository(dbManager);
    summaryRepo = new SummaryRepository(dbManager);
    conversationRepo = new ConversationRepository(dbManager);

    // Create test conversation
    const conversation = await conversationRepo.create({
      title: 'Test Conversation for Context Assembly'
    });
    testConversationId = conversation.id;

    // Mock EmbeddingManager
    mockEmbeddingManager = {
      generateEmbedding: jest.fn(),
      findSimilarMessages: jest.fn(),
      isModelAvailable: jest.fn(),
      getModelInfo: jest.fn(),
      healthCheck: jest.fn()
    } as any;

    // Setup default mock responses
    mockEmbeddingManager.isModelAvailable.mockReturnValue(true);
    mockEmbeddingManager.generateEmbedding.mockResolvedValue([0.1, 0.2, 0.3, 0.4, 0.5]);
    mockEmbeddingManager.findSimilarMessages.mockResolvedValue([]);

    // Initialize ContextAssembler
    contextAssembler = new ContextAssembler(
      mockEmbeddingManager,
      messageRepo,
      summaryRepo,
      {
        defaultMaxTokens: 4000,
        defaultStrategy: 'hybrid',
        defaultMinRelevance: 0.1,
        enableSemanticSearch: true,
        enableTemporalWeighting: true,
        tokenBuffer: 200,
        maxItems: 50
      }
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (db) {
      db.close();
    }
  });

  // Helper function to create test messages
  const createTestMessage = async (
    content: string,
    role: 'user' | 'assistant' = 'user',
    timestamp?: number
  ): Promise<Message> => {
    return await messageRepo.create({
      conversationId: testConversationId,
      role,
      content,
      createdAt: timestamp || Date.now(),
      metadata: { testMessage: true }
    });
  };

  // Helper function to create test summary
  const createTestSummary = async (
    summaryText: string,
    level: 'brief' | 'standard' | 'detailed' = 'standard'
  ): Promise<ConversationSummary> => {
    return await summaryRepo.create({
      conversationId: testConversationId,
      level,
      summaryText,
      tokenCount: summaryText.split(' ').length,
      provider: 'test',
      model: 'test-model',
      messageCount: 5
    });
  };

  describe('Basic Context Assembly', () => {
    test('should assemble context with mixed messages and summaries', async () => {
      // Create test data
      await createTestMessage('What is artificial intelligence?');
      await createTestMessage('AI is a field of computer science focused on creating intelligent machines.', 'assistant');
      await createTestMessage('How does machine learning work?');
      await createTestMessage('Machine learning uses algorithms to learn patterns from data.', 'assistant');
      
      const summary = await createTestSummary('Previous discussion covered AI basics and definitions.');

      // Mock similarity search to return relevant messages
      mockEmbeddingManager.findSimilarMessages.mockResolvedValueOnce([
        { messageId: await createTestMessage('Tell me about neural networks'), similarity: 0.8 },
        { messageId: await createTestMessage('Neural networks are inspired by the human brain', 'assistant'), similarity: 0.7 }
      ]);

      const request: ContextAssemblyRequest = {
        query: 'Explain deep learning and neural networks',
        maxTokens: 1000,
        strategy: 'hybrid'
      };

      const result = await contextAssembler.assemble(request);

      expect(result.text).toBeDefined();
      expect(result.tokenCount).toBeGreaterThan(0);
      expect(result.tokenCount).toBeLessThanOrEqual(1000);
      expect(result.includedItems.length).toBeGreaterThan(0);
      expect(result.strategy).toBe('hybrid');
      expect(result.metrics.processingTimeMs).toBeGreaterThan(0);

      // Should include both messages and summaries
      const messageItems = result.includedItems.filter(item => item.type === 'message');
      const summaryItems = result.includedItems.filter(item => item.type === 'summary');
      
      expect(messageItems.length).toBeGreaterThan(0);
      expect(summaryItems.length).toBeGreaterThan(0);
    });

    test('should respect token budget constraints', async () => {
      // Create many messages to test token limiting
      const messages = await Promise.all([
        createTestMessage('This is a long message about artificial intelligence and machine learning technologies.'),
        createTestMessage('Machine learning algorithms require large datasets for training purposes.'),
        createTestMessage('Deep learning uses neural networks with multiple hidden layers.'),
        createTestMessage('Natural language processing is a subfield of AI focused on text.'),
        createTestMessage('Computer vision enables machines to interpret visual information.'),
        createTestMessage('Reinforcement learning teaches agents through rewards and penalties.')
      ]);

      const request: ContextAssemblyRequest = {
        query: 'Explain AI technologies',
        maxTokens: 200, // Very limited budget
        strategy: 'topical'
      };

      const result = await contextAssembler.assemble(request);

      expect(result.tokenCount).toBeLessThanOrEqual(200);
      expect(result.tokenBreakdown.buffer).toBeGreaterThan(0);
      expect(result.metrics.tokenEfficiency).toBeGreaterThan(0);
      expect(result.metrics.tokenEfficiency).toBeLessThanOrEqual(1);

      // Should include fewer items due to budget constraint
      expect(result.includedItems.length).toBeLessThan(messages.length);
    });

    test('should handle empty query gracefully', async () => {
      await createTestMessage('Some test content');

      const request: ContextAssemblyRequest = {
        query: '',
        maxTokens: 500
      };

      const result = await contextAssembler.assemble(request);

      expect(result.text).toBeDefined();
      expect(result.tokenCount).toBeGreaterThan(0);
      expect(result.metrics.itemsIncluded).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Assembly Strategies', () => {
    beforeEach(async () => {
      // Create diverse test data for strategy testing
      const now = Date.now();
      
      // Recent messages
      await createTestMessage('Recent discussion about AI safety', 'user', now - 60000);
      await createTestMessage('AI safety is crucial for deployment', 'assistant', now - 30000);
      
      // Medium age messages
      await createTestMessage('What are the applications of machine learning?', 'user', now - 3600000);
      await createTestMessage('ML has applications in healthcare, finance, and transportation', 'assistant', now - 3500000);
      
      // Older messages
      await createTestMessage('Explain basic programming concepts', 'user', now - 86400000);
      await createTestMessage('Programming involves writing instructions for computers', 'assistant', now - 86300000);

      // Create summaries
      await createTestSummary('Earlier conversation covered AI fundamentals and basic concepts', 'standard');
      await createTestSummary('Discussion about machine learning algorithms and their implementation', 'detailed');
    });

    test('should use temporal strategy effectively', async () => {
      const request: ContextAssemblyRequest = {
        query: 'Current AI safety concerns',
        maxTokens: 1000,
        strategy: 'temporal',
        timeWindow: 7200000 // 2 hours
      };

      const result = await contextAssembler.assemble(request);

      expect(result.strategy).toBe('temporal');
      expect(result.includedItems.length).toBeGreaterThan(0);

      // Recent items should have higher relevance scores
      const sortedByRelevance = result.includedItems.sort((a, b) => b.relevanceScore - a.relevanceScore);
      
      // Most relevant items should be from recent time window
      expect(sortedByRelevance[0].relevanceScore).toBeGreaterThan(0.5);
    });

    test('should use topical strategy for content-focused assembly', async () => {
      // Mock semantic search to return topic-relevant messages
      mockEmbeddingManager.findSimilarMessages.mockResolvedValue([
        { messageId: (await createTestMessage('Advanced machine learning techniques')).id, similarity: 0.9 },
        { messageId: (await createTestMessage('Deep learning neural architectures')).id, similarity: 0.8 },
        { messageId: (await createTestMessage('Programming basics for beginners')).id, similarity: 0.3 }
      ]);

      const request: ContextAssemblyRequest = {
        query: 'machine learning and deep learning techniques',
        maxTokens: 800,
        strategy: 'topical',
        minRelevance: 0.6
      };

      const result = await contextAssembler.assemble(request);

      expect(result.strategy).toBe('topical');
      expect(result.metrics.averageRelevance).toBeGreaterThan(0.6);

      // Should filter out low-relevance items
      const lowRelevanceItems = result.includedItems.filter(item => item.relevanceScore < 0.6);
      expect(lowRelevanceItems.length).toBe(0);
    });

    test('should use entity-centric strategy for focused assembly', async () => {
      // Create messages with specific entities
      await createTestMessage('OpenAI developed GPT-4 as a large language model');
      await createTestMessage('GPT-4 shows impressive performance on various benchmarks');
      await createTestMessage('Google has released Bard as a ChatGPT competitor');
      await createTestMessage('Microsoft integrated GPT-4 into their Bing search engine');

      const request: ContextAssemblyRequest = {
        query: 'GPT-4 capabilities and performance',
        maxTokens: 600,
        strategy: 'entity-centric',
        focusEntities: ['GPT-4', 'OpenAI']
      };

      const result = await contextAssembler.assemble(request);

      expect(result.strategy).toBe('entity-centric');
      expect(result.includedItems.length).toBeGreaterThan(0);

      // Context should focus on specified entities
      expect(result.text.toLowerCase()).toContain('gpt-4');
    });

    test('should use hybrid strategy for balanced assembly', async () => {
      // Create diverse content for hybrid testing
      const now = Date.now();
      await createTestMessage('Recent breakthrough in quantum computing', 'user', now - 30000);
      await createTestMessage('Historical development of computer science', 'user', now - 86400000);
      await createTestMessage('Machine learning applications in healthcare', 'user', now - 3600000);
      
      const request: ContextAssemblyRequest = {
        query: 'computer science developments and breakthroughs',
        maxTokens: 1200,
        strategy: 'hybrid',
        includeRecent: true
      };

      const result = await contextAssembler.assemble(request);

      expect(result.strategy).toBe('hybrid');
      expect(result.includedItems.length).toBeGreaterThan(0);

      // Hybrid should balance temporal and topical relevance
      const hasRecentItems = result.includedItems.some(item => item.relevanceScore > 0.7);
      const hasTopicalItems = result.includedItems.some(item => item.relevanceScore > 0.5);
      
      expect(hasRecentItems || hasTopicalItems).toBe(true);
    });
  });

  describe('Relevance Scoring and Ranking', () => {
    test('should score items based on semantic similarity', async () => {
      const messages = await Promise.all([
        createTestMessage('Machine learning algorithms for classification'),
        createTestMessage('Weather forecast for tomorrow'),
        createTestMessage('Deep learning neural network architectures'),
        createTestMessage('Cooking recipes for Italian pasta')
      ]);

      // Mock similarity scores
      mockEmbeddingManager.findSimilarMessages.mockResolvedValue([
        { messageId: messages[0].id, similarity: 0.9 }, // Highly relevant
        { messageId: messages[2].id, similarity: 0.8 }, // Relevant
        { messageId: messages[1].id, similarity: 0.2 }, // Low relevance
        { messageId: messages[3].id, similarity: 0.1 }  // Very low relevance
      ]);

      const request: ContextAssemblyRequest = {
        query: 'machine learning and AI algorithms',
        maxTokens: 1000,
        minRelevance: 0.3
      };

      const result = await contextAssembler.assemble(request);

      // Should include high and medium relevance items, exclude low relevance
      const relevanceScores = result.includedItems.map(item => item.relevanceScore);
      
      expect(Math.max(...relevanceScores)).toBeGreaterThan(0.7);
      expect(Math.min(...relevanceScores)).toBeGreaterThanOrEqual(0.3);
    });

    test('should apply temporal weighting to scores', async () => {
      const now = Date.now();
      
      // Create messages at different times with same content relevance
      const recentMsg = await createTestMessage('AI research developments', 'user', now - 60000); // 1 min ago
      const mediumMsg = await createTestMessage('AI research developments', 'user', now - 3600000); // 1 hour ago
      const oldMsg = await createTestMessage('AI research developments', 'user', now - 86400000); // 1 day ago

      // Mock equal semantic similarity
      mockEmbeddingManager.findSimilarMessages.mockResolvedValue([
        { messageId: recentMsg.id, similarity: 0.8 },
        { messageId: mediumMsg.id, similarity: 0.8 },
        { messageId: oldMsg.id, similarity: 0.8 }
      ]);

      const request: ContextAssemblyRequest = {
        query: 'latest AI research',
        maxTokens: 1000,
        strategy: 'hybrid' // Includes temporal weighting
      };

      const result = await contextAssembler.assemble(request);

      // Find the items in results
      const recentItem = result.includedItems.find(item => item.id === recentMsg.id);
      const mediumItem = result.includedItems.find(item => item.id === mediumMsg.id);
      const oldItem = result.includedItems.find(item => item.id === oldMsg.id);

      // Recent item should have higher final relevance score due to temporal weighting
      if (recentItem && mediumItem) {
        expect(recentItem.relevanceScore).toBeGreaterThanOrEqual(mediumItem.relevanceScore);
      }
      if (mediumItem && oldItem) {
        expect(mediumItem.relevanceScore).toBeGreaterThanOrEqual(oldItem.relevanceScore);
      }
    });

    test('should handle conversation-scoped vs global assembly', async () => {
      // Create messages in different conversations
      const otherConversation = await conversationRepo.create({
        title: 'Other Conversation'
      });

      const inScopeMsg = await createTestMessage('AI safety in autonomous vehicles');
      const outOfScopeMsg = await messageRepo.create({
        conversationId: otherConversation.id,
        role: 'user',
        content: 'AI safety in autonomous vehicles',
        createdAt: Date.now(),
        metadata: {}
      });

      // Test conversation-scoped assembly
      const scopedRequest: ContextAssemblyRequest = {
        query: 'AI safety concerns',
        conversationId: testConversationId,
        maxTokens: 500
      };

      const scopedResult = await contextAssembler.assemble(scopedRequest);
      const scopedIds = scopedResult.includedItems.map(item => item.id);
      
      expect(scopedIds).toContain(inScopeMsg.id);
      expect(scopedIds).not.toContain(outOfScopeMsg.id);

      // Test global assembly
      const globalRequest: ContextAssemblyRequest = {
        query: 'AI safety concerns',
        maxTokens: 500
      };

      mockEmbeddingManager.findSimilarMessages.mockResolvedValue([
        { messageId: inScopeMsg.id, similarity: 0.8 },
        { messageId: outOfScopeMsg.id, similarity: 0.8 }
      ]);

      const globalResult = await contextAssembler.assemble(globalRequest);
      const globalIds = globalResult.includedItems.map(item => item.id);
      
      // Global search should potentially include messages from other conversations
      expect(globalIds.length).toBeGreaterThan(0);
    });
  });

  describe('Token Management and Optimization', () => {
    test('should optimize token usage within budget', async () => {
      // Create messages of varying lengths
      const shortMsg = await createTestMessage('AI is useful.');
      const mediumMsg = await createTestMessage('Machine learning algorithms can process large datasets to identify patterns and make predictions.');
      const longMsg = await createTestMessage('Artificial intelligence and machine learning technologies have revolutionized numerous industries by enabling automated decision-making processes, predictive analytics, and intelligent data processing capabilities that were previously impossible to achieve.');

      mockEmbeddingManager.findSimilarMessages.mockResolvedValue([
        { messageId: shortMsg.id, similarity: 0.7 },
        { messageId: mediumMsg.id, similarity: 0.9 },
        { messageId: longMsg.id, similarity: 0.8 }
      ]);

      const request: ContextAssemblyRequest = {
        query: 'machine learning applications',
        maxTokens: 100, // Very tight budget
        strategy: 'topical'
      };

      const result = await contextAssembler.assemble(request);

      expect(result.tokenCount).toBeLessThanOrEqual(100);
      expect(result.tokenBreakdown.buffer).toBeGreaterThan(0);

      // Should prioritize high-relevance content within token budget
      const highRelevanceItems = result.includedItems.filter(item => item.relevanceScore > 0.8);
      expect(highRelevanceItems.length).toBeGreaterThan(0);
    });

    test('should provide detailed token breakdown', async () => {
      await createTestMessage('Query-related message content');
      await createTestSummary('Summary of previous discussions about the topic');

      const request: ContextAssemblyRequest = {
        query: 'detailed query about the topic',
        maxTokens: 800
      };

      const result = await contextAssembler.assemble(request);

      expect(result.tokenBreakdown).toBeDefined();
      expect(result.tokenBreakdown.query).toBeGreaterThan(0);
      expect(result.tokenBreakdown.messages).toBeGreaterThan(0);
      expect(result.tokenBreakdown.summaries).toBeGreaterThan(0);
      expect(result.tokenBreakdown.metadata).toBeGreaterThanOrEqual(0);
      expect(result.tokenBreakdown.buffer).toBeGreaterThan(0);

      // Total should match overall token count
      const sum = Object.values(result.tokenBreakdown).reduce((a, b) => a + b, 0);
      expect(sum).toBe(result.tokenCount);
    });

    test('should handle token budget exhaustion gracefully', async () => {
      // Create minimal content
      await createTestMessage('AI');

      const request: ContextAssemblyRequest = {
        query: 'extremely long query that by itself might consume most of the available token budget for context assembly and leave very little room for actual content',
        maxTokens: 50 // Very small budget
      };

      const result = await contextAssembler.assemble(request);

      expect(result.tokenCount).toBeLessThanOrEqual(50);
      expect(result.tokenBreakdown.query).toBeGreaterThan(0);
      expect(result.tokenBreakdown.buffer).toBeGreaterThan(0);

      // Should still provide some context even with tight budget
      expect(result.text).toBeDefined();
      expect(result.text.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Metrics', () => {
    test('should provide comprehensive performance metrics', async () => {
      // Create substantial test data
      const messages = await Promise.all(
        Array.from({ length: 20 }, (_, i) => 
          createTestMessage(`Test message ${i + 1} about various AI topics`)
        )
      );

      const summaries = await Promise.all([
        createTestSummary('Summary of AI discussion', 'brief'),
        createTestSummary('Detailed analysis of machine learning concepts', 'detailed')
      ]);

      mockEmbeddingManager.findSimilarMessages.mockResolvedValue(
        messages.slice(0, 10).map((msg, i) => ({
          messageId: msg.id,
          similarity: 0.9 - (i * 0.05) // Decreasing similarity
        }))
      );

      const request: ContextAssemblyRequest = {
        query: 'comprehensive AI discussion',
        maxTokens: 2000
      };

      const result = await contextAssembler.assemble(request);

      expect(result.metrics).toBeDefined();
      expect(result.metrics.processingTimeMs).toBeGreaterThan(0);
      expect(result.metrics.itemsEvaluated).toBeGreaterThan(0);
      expect(result.metrics.itemsIncluded).toBeGreaterThan(0);
      expect(result.metrics.itemsIncluded).toBeLessThanOrEqual(result.metrics.itemsEvaluated);
      expect(result.metrics.averageRelevance).toBeGreaterThan(0);
      expect(result.metrics.averageRelevance).toBeLessThanOrEqual(1);
      expect(result.metrics.tokenEfficiency).toBeGreaterThan(0);
      expect(result.metrics.tokenEfficiency).toBeLessThanOrEqual(1);
    });

    test('should handle large-scale context assembly efficiently', async () => {
      // Create large dataset
      const largeDataset = await Promise.all(
        Array.from({ length: 100 }, (_, i) => 
          createTestMessage(`Large scale test message ${i + 1} with AI content`)
        )
      );

      // Mock similarity search for large dataset
      mockEmbeddingManager.findSimilarMessages.mockResolvedValue(
        largeDataset.slice(0, 50).map((msg, i) => ({
          messageId: msg.id,
          similarity: Math.random() * 0.8 + 0.2 // Random relevance 0.2-1.0
        }))
      );

      const startTime = Date.now();
      
      const request: ContextAssemblyRequest = {
        query: 'large scale AI analysis',
        maxTokens: 4000
      };

      const result = await contextAssembler.assemble(request);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should complete within reasonable time even with large dataset
      expect(processingTime).toBeLessThan(5000); // 5 seconds max
      expect(result.metrics.processingTimeMs).toBeLessThan(5000);
      expect(result.includedItems.length).toBeGreaterThan(0);
      expect(result.tokenCount).toBeGreaterThan(0);
    });

    test('should maintain consistent performance across different strategies', async () => {
      // Create test dataset
      await Promise.all(
        Array.from({ length: 30 }, (_, i) => 
          createTestMessage(`Strategy test message ${i + 1}`, 'user', Date.now() - (i * 60000))
        )
      );

      const strategies: Array<'temporal' | 'topical' | 'entity-centric' | 'hybrid'> = 
        ['temporal', 'topical', 'entity-centric', 'hybrid'];

      const results = [];

      for (const strategy of strategies) {
        const request: ContextAssemblyRequest = {
          query: 'strategy performance test',
          maxTokens: 1500,
          strategy
        };

        const result = await contextAssembler.assemble(request);
        results.push(result);

        // Each strategy should complete efficiently
        expect(result.metrics.processingTimeMs).toBeLessThan(3000);
        expect(result.strategy).toBe(strategy);
        expect(result.includedItems.length).toBeGreaterThan(0);
      }

      // All strategies should produce reasonable results
      const avgProcessingTime = results.reduce((sum, r) => sum + r.metrics.processingTimeMs, 0) / results.length;
      expect(avgProcessingTime).toBeLessThan(2000);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle embedding service failures gracefully', async () => {
      await createTestMessage('Test message for embedding failure');

      // Mock embedding failure
      mockEmbeddingManager.findSimilarMessages.mockRejectedValue(new Error('Embedding service unavailable'));

      const request: ContextAssemblyRequest = {
        query: 'test query',
        maxTokens: 500
      };

      // Should not throw, but gracefully degrade
      const result = await contextAssembler.assemble(request);

      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      // May have reduced quality but should still function
    });

    test('should handle empty database scenarios', async () => {
      // No messages or summaries created

      const request: ContextAssemblyRequest = {
        query: 'query with no available content',
        maxTokens: 500
      };

      const result = await contextAssembler.assemble(request);

      expect(result).toBeDefined();
      expect(result.includedItems).toHaveLength(0);
      expect(result.metrics.itemsEvaluated).toBe(0);
      expect(result.metrics.itemsIncluded).toBe(0);
    });

    test('should handle extremely restrictive token budgets', async () => {
      await createTestMessage('Some test content');

      const request: ContextAssemblyRequest = {
        query: 'test',
        maxTokens: 10 // Extremely small budget
      };

      const result = await contextAssembler.assemble(request);

      expect(result.tokenCount).toBeLessThanOrEqual(10);
      expect(result.text).toBeDefined();
      // Should still provide minimal context
    });

    test('should handle invalid conversation IDs', async () => {
      const request: ContextAssemblyRequest = {
        query: 'test query',
        conversationId: 'non-existent-conversation',
        maxTokens: 500
      };

      const result = await contextAssembler.assemble(request);

      expect(result).toBeDefined();
      // Should not find any messages for non-existent conversation
      expect(result.includedItems).toHaveLength(0);
    });

    test('should handle concurrent assembly requests', async () => {
      // Create shared test data
      await Promise.all(
        Array.from({ length: 10 }, (_, i) => 
          createTestMessage(`Concurrent test message ${i + 1}`)
        )
      );

      const concurrentRequests = Array.from({ length: 5 }, (_, i) => ({
        query: `concurrent query ${i + 1}`,
        maxTokens: 800,
        strategy: 'hybrid' as const
      }));

      const results = await Promise.all(
        concurrentRequests.map(req => contextAssembler.assemble(req))
      );

      expect(results).toHaveLength(5);
      
      // All should complete successfully
      for (const result of results) {
        expect(result).toBeDefined();
        expect(result.tokenCount).toBeGreaterThan(0);
        expect(result.metrics.processingTimeMs).toBeGreaterThan(0);
      }
    });
  });
});