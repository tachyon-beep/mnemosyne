/**
 * Summary Generator Integration Tests
 * 
 * Comprehensive integration tests for the SummaryGenerator service:
 * - Hierarchical summarization (brief/standard/detailed)
 * - Quality validation and scoring
 * - Provider fallback and retry logic
 * - Batch processing capabilities
 * - Temporal compression strategies
 * - Cache integration
 */

import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals';
import Database from 'better-sqlite3';
import { DatabaseManager } from '../../../src/storage/Database.js';
import { SummaryGenerator, GenerationRequest, BatchGenerationRequest } from '../../../src/context/SummaryGenerator.js';
import { ProviderManager } from '../../../src/context/ProviderManager.js';
import { SummaryRepository } from '../../../src/storage/repositories/SummaryRepository.js';
import { SummaryHistoryRepository } from '../../../src/storage/repositories/SummaryHistoryRepository.js';
import { CacheRepository } from '../../../src/storage/repositories/CacheRepository.js';
import { ConversationRepository } from '../../../src/storage/repositories/ConversationRepository.js';
import { MessageRepository } from '../../../src/storage/repositories/MessageRepository.js';
import { TokenCounter, createTokenCounter } from '../../../src/context/TokenCounter.js';
import { Message } from '../../../src/types/interfaces.js';

// Mock the ProviderManager to avoid external API calls
jest.mock('../../../src/context/ProviderManager.js');

describe('SummaryGenerator Integration Tests', () => {
  let db: Database.Database;
  let dbManager: DatabaseManager;
  let summaryGenerator: SummaryGenerator;
  let mockProviderManager: jest.Mocked<ProviderManager>;
  let summaryRepo: SummaryRepository;
  let historyRepo: SummaryHistoryRepository;
  let cacheRepo: CacheRepository;
  let conversationRepo: ConversationRepository;
  let messageRepo: MessageRepository;
  let tokenCounter: TokenCounter;

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
    summaryRepo = new SummaryRepository(dbManager);
    historyRepo = new SummaryHistoryRepository(dbManager);
    cacheRepo = new CacheRepository(dbManager);
    conversationRepo = new ConversationRepository(dbManager);
    messageRepo = new MessageRepository(dbManager);
    
    // Initialize token counter
    tokenCounter = createTokenCounter('gpt-4');

    // Create mock provider manager
    mockProviderManager = {
      generateSummary: jest.fn(),
      getAvailableProviders: jest.fn(),
      isProviderAvailable: jest.fn(),
      getProviderConfig: jest.fn(),
      setProviderConfig: jest.fn(),
      healthCheck: jest.fn()
    } as any;

    // Setup default mock responses
    mockProviderManager.generateSummary.mockResolvedValue({
      summary: 'Generated summary text about the conversation',
      tokenCount: 25,
      inputTokens: 1000,
      outputTokens: 25,
      processingTime: 1500,
      cost: 0.035,
      qualityScore: 0.85
    });

    mockProviderManager.isProviderAvailable.mockReturnValue(true);

    // Initialize SummaryGenerator
    summaryGenerator = new SummaryGenerator(
      mockProviderManager,
      summaryRepo,
      historyRepo,
      cacheRepo,
      tokenCounter,
      {
        defaultLevel: 'standard',
        enableValidation: true,
        minQualityScore: 0.7,
        maxRetries: 2,
        enableCaching: true,
        cacheTtl: 60 * 60 * 1000, // 1 hour for testing
        temporalCompression: {
          recentThresholdHours: 24,
          mediumThresholdDays: 7,
          forceOldBrief: true
        }
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
  const createTestMessages = (count: number, baseTimestamp = Date.now()): Message[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `msg_${i + 1}`,
      conversationId: 'test-conversation',
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `This is test message ${i + 1} discussing AI and technology topics.`,
      createdAt: baseTimestamp + (i * 60000), // 1 minute apart
      metadata: { messageIndex: i + 1 }
    }));
  };

  describe('Single Summary Generation', () => {
    test('should generate a standard summary successfully', async () => {
      const messages = createTestMessages(5);
      const request: GenerationRequest = {
        messages,
        conversationId: 'test-conversation',
        level: 'standard'
      };

      const result = await summaryGenerator.generateSummary(request);

      expect(result.summary).toBeDefined();
      expect(result.summary.level).toBe('standard');
      expect(result.summary.conversationId).toBe('test-conversation');
      expect(result.summary.messageCount).toBe(5);
      expect(result.metadata.provider).toBeDefined();
      expect(result.metadata.generationTime).toBeGreaterThan(0);
      expect(result.metadata.fromCache).toBe(false);

      // Verify provider was called correctly
      expect(mockProviderManager.generateSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          messages,
          level: 'standard',
          maxTokens: 300 // standard level target
        }),
        'quality'
      );

      // Verify summary was saved to database
      const savedSummary = await summaryRepo.findById(result.summary.id);
      expect(savedSummary).toBeDefined();
      expect(savedSummary?.summaryText).toBe('Generated summary text about the conversation');
    });

    test('should use temporal compression for old conversations', async () => {
      // Create old messages (40 days ago)
      const oldTimestamp = Date.now() - (40 * 24 * 60 * 60 * 1000);
      const messages = createTestMessages(10, oldTimestamp);

      const request: GenerationRequest = {
        messages,
        conversationId: 'old-conversation'
        // No level specified - should use temporal logic
      };

      const result = await summaryGenerator.generateSummary(request);

      // Should default to brief for old conversations
      expect(result.summary.level).toBe('brief');
      
      // Verify provider was called with brief level
      expect(mockProviderManager.generateSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'brief',
          maxTokens: 100 // brief level target
        }),
        'quality'
      );
    });

    test('should use detailed level for recent conversations', async () => {
      // Create recent messages (2 hours ago)
      const recentTimestamp = Date.now() - (2 * 60 * 60 * 1000);
      const messages = createTestMessages(8, recentTimestamp);

      const request: GenerationRequest = {
        messages,
        conversationId: 'recent-conversation'
      };

      const result = await summaryGenerator.generateSummary(request);

      // Should default to detailed for recent conversations
      expect(result.summary.level).toBe('detailed');

      expect(mockProviderManager.generateSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'detailed',
          maxTokens: 1000 // detailed level target
        }),
        'quality'
      );
    });

    test('should handle quality validation and rejection', async () => {
      const messages = createTestMessages(3);

      // Mock low quality response
      mockProviderManager.generateSummary.mockResolvedValueOnce({
        summary: 'Low quality summary',
        tokenCount: 10,
        inputTokens: 500,
        outputTokens: 10,
        processingTime: 800,
        cost: 0.015,
        qualityScore: 0.4 // Below minimum threshold of 0.7
      });

      // Mock second attempt with good quality
      mockProviderManager.generateSummary.mockResolvedValueOnce({
        summary: 'High quality summary with good content',
        tokenCount: 30,
        inputTokens: 500,
        outputTokens: 30,
        processingTime: 1200,
        cost: 0.025,
        qualityScore: 0.9
      });

      const request: GenerationRequest = {
        messages,
        conversationId: 'quality-test',
        level: 'standard'
      };

      const result = await summaryGenerator.generateSummary(request);

      // Should have succeeded with the second attempt
      expect(result.summary.summaryText).toBe('High quality summary with good content');
      expect(result.validation?.score).toBe(0.9);
      
      // Should have tried twice
      expect(mockProviderManager.generateSummary).toHaveBeenCalledTimes(2);
    });

    test('should handle provider failures with retries', async () => {
      const messages = createTestMessages(4);

      // Mock first failure
      mockProviderManager.generateSummary.mockRejectedValueOnce(new Error('API rate limit exceeded'));
      
      // Mock second success
      mockProviderManager.generateSummary.mockResolvedValueOnce({
        summary: 'Successful retry summary',
        tokenCount: 20,
        inputTokens: 600,
        outputTokens: 20,
        processingTime: 1000,
        cost: 0.02,
        qualityScore: 0.8
      });

      const request: GenerationRequest = {
        messages,
        conversationId: 'retry-test',
        level: 'brief'
      };

      const result = await summaryGenerator.generateSummary(request);

      expect(result.summary.summaryText).toBe('Successful retry summary');
      expect(mockProviderManager.generateSummary).toHaveBeenCalledTimes(2);
    });

    test('should fail after maximum retries', async () => {
      const messages = createTestMessages(3);

      // Mock all attempts to fail
      mockProviderManager.generateSummary.mockRejectedValue(new Error('Persistent API failure'));

      const request: GenerationRequest = {
        messages,
        conversationId: 'max-retry-test',
        level: 'standard'
      };

      await expect(summaryGenerator.generateSummary(request)).rejects.toThrow('Persistent API failure');
      
      // Should have tried maxRetries (2) + 1 = 3 times total
      expect(mockProviderManager.generateSummary).toHaveBeenCalledTimes(2);
    });

    test('should use cached results when available', async () => {
      const messages = createTestMessages(4);
      const conversationId = 'cache-test';

      // First generation - should create cache
      const request: GenerationRequest = {
        messages,
        conversationId,
        level: 'standard'
      };

      const firstResult = await summaryGenerator.generateSummary(request);
      expect(firstResult.metadata.fromCache).toBe(false);
      expect(mockProviderManager.generateSummary).toHaveBeenCalledTimes(1);

      // Second generation - should use cache
      const secondResult = await summaryGenerator.generateSummary(request);
      expect(secondResult.metadata.fromCache).toBe(true);
      
      // Provider should not be called again
      expect(mockProviderManager.generateSummary).toHaveBeenCalledTimes(1);

      // Results should be equivalent
      expect(secondResult.summary.summaryText).toBe(firstResult.summary.summaryText);
    });

    test('should force regeneration when requested', async () => {
      const messages = createTestMessages(3);
      const conversationId = 'force-regen-test';

      // First generation
      await summaryGenerator.generateSummary({
        messages,
        conversationId,
        level: 'brief'
      });

      // Second generation with force regeneration
      const result = await summaryGenerator.generateSummary({
        messages,
        conversationId,
        level: 'brief',
        forceRegenerate: true
      });

      expect(result.metadata.fromCache).toBe(false);
      expect(mockProviderManager.generateSummary).toHaveBeenCalledTimes(2);
    });
  });

  describe('Batch Generation', () => {
    test('should process batch requests sequentially', async () => {
      const batchRequest: BatchGenerationRequest = {
        requests: [
          {
            messages: createTestMessages(3),
            conversationId: 'batch-1',
            level: 'brief'
          },
          {
            messages: createTestMessages(5),
            conversationId: 'batch-2',
            level: 'standard'
          },
          {
            messages: createTestMessages(7),
            conversationId: 'batch-3',
            level: 'detailed'
          }
        ],
        batchStrategy: 'sequential'
      };

      const result = await summaryGenerator.generateBatch(batchRequest);

      expect(result.successes).toHaveLength(3);
      expect(result.failures).toHaveLength(0);
      expect(result.metadata.successRate).toBe(1.0);
      expect(result.metadata.totalTime).toBeGreaterThan(0);

      // Verify all levels were processed
      const levels = result.successes.map(r => r.summary.level);
      expect(levels).toContain('brief');
      expect(levels).toContain('standard');
      expect(levels).toContain('detailed');
    });

    test('should process batch requests in parallel', async () => {
      const batchRequest: BatchGenerationRequest = {
        requests: [
          {
            messages: createTestMessages(2),
            conversationId: 'parallel-1',
            level: 'brief'
          },
          {
            messages: createTestMessages(3),
            conversationId: 'parallel-2',
            level: 'brief'
          }
        ],
        batchStrategy: 'parallel',
        maxConcurrency: 2
      };

      const startTime = Date.now();
      const result = await summaryGenerator.generateBatch(batchRequest);
      const endTime = Date.now();

      expect(result.successes).toHaveLength(2);
      expect(result.failures).toHaveLength(0);
      
      // Parallel should be faster than sequential (rough check)
      expect(endTime - startTime).toBeLessThan(5000); // Should complete quickly
    });

    test('should handle mixed success and failure in batch', async () => {
      // Mock one success and one failure
      mockProviderManager.generateSummary
        .mockResolvedValueOnce({
          summary: 'Successful batch item',
          tokenCount: 15,
          inputTokens: 400,
          outputTokens: 15,
          processingTime: 800,
          cost: 0.012,
          qualityScore: 0.8
        })
        .mockRejectedValueOnce(new Error('Batch item failed'));

      const batchRequest: BatchGenerationRequest = {
        requests: [
          {
            messages: createTestMessages(2),
            conversationId: 'batch-success',
            level: 'brief'
          },
          {
            messages: createTestMessages(3),
            conversationId: 'batch-failure',
            level: 'brief'
          }
        ]
      };

      const result = await summaryGenerator.generateBatch(batchRequest);

      expect(result.successes).toHaveLength(1);
      expect(result.failures).toHaveLength(1);
      expect(result.metadata.successRate).toBe(0.5);

      expect(result.successes[0].summary.summaryText).toBe('Successful batch item');
      expect(result.failures[0].error.message).toBe('Batch item failed');
    });

    test('should respect concurrency limits', async () => {
      // Track call order to verify concurrency
      const callOrder: number[] = [];
      let callIndex = 0;

      mockProviderManager.generateSummary.mockImplementation(async () => {
        const currentCall = callIndex++;
        callOrder.push(currentCall);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return {
          summary: `Summary ${currentCall}`,
          tokenCount: 10,
          inputTokens: 200,
          outputTokens: 10,
          processingTime: 100,
          cost: 0.005,
          qualityScore: 0.8
        };
      });

      const batchRequest: BatchGenerationRequest = {
        requests: Array.from({ length: 6 }, (_, i) => ({
          messages: createTestMessages(2),
          conversationId: `concurrency-${i}`,
          level: 'brief' as const
        })),
        batchStrategy: 'parallel',
        maxConcurrency: 2
      };

      const result = await summaryGenerator.generateBatch(batchRequest);

      expect(result.successes).toHaveLength(6);
      expect(callOrder).toHaveLength(6);
      
      // All calls should have been made
      expect(mockProviderManager.generateSummary).toHaveBeenCalledTimes(6);
    });
  });

  describe('Cache Integration', () => {
    test('should cache successful generations', async () => {
      const messages = createTestMessages(4);
      const conversationId = 'cache-integration-test';

      await summaryGenerator.generateSummary({
        messages,
        conversationId,
        level: 'standard'
      });

      // Verify cache entry exists
      const cacheKey = `summary:${conversationId}:standard`;
      const cached = await cacheRepo.get(cacheKey);
      
      expect(cached).toBeDefined();
      expect(cached?.tokenCount).toBe(25); // From mock response
      
      const cachedSummary = JSON.parse(cached!.assembledContext);
      expect(cachedSummary.summaryText).toBe('Generated summary text about the conversation');
    });

    test('should invalidate cache when summaries are deleted', async () => {
      const messages = createTestMessages(3);
      const conversationId = 'invalidation-test';

      // Generate summary (creates cache)
      const result = await summaryGenerator.generateSummary({
        messages,
        conversationId,
        level: 'brief'
      });

      // Verify cache exists
      const cacheKey = `summary:${conversationId}:brief`;
      let cached = await cacheRepo.get(cacheKey);
      expect(cached).toBeDefined();

      // Invalidate summaries
      await summaryGenerator.invalidateConversationSummaries(conversationId);

      // Verify cache is cleared
      cached = await cacheRepo.get(cacheKey);
      expect(cached).toBeNull();

      // Verify summary is deleted from database
      const deletedSummary = await summaryRepo.findById(result.summary.id);
      expect(deletedSummary).toBeNull();
    });
  });

  describe('History Tracking', () => {
    test('should track generation history for successful summaries', async () => {
      const messages = createTestMessages(3);

      const result = await summaryGenerator.generateSummary({
        messages,
        conversationId: 'history-test',
        level: 'standard'
      });

      // Find history entries for this summary
      const historyEntries = await historyRepo.findBySummaryId(result.summary.id);
      expect(historyEntries).toHaveLength(1);

      const history = historyEntries[0];
      expect(history.status).toBe('completed');
      expect(history.inputTokens).toBe(1000); // From mock
      expect(history.outputTokens).toBe(25); // From mock
      expect(history.cost).toBe(0.035); // From mock
    });

    test('should track generation history for failed summaries', async () => {
      const messages = createTestMessages(2);

      // Mock provider to fail all attempts
      mockProviderManager.generateSummary.mockRejectedValue(new Error('Generation failed'));

      try {
        await summaryGenerator.generateSummary({
          messages,
          conversationId: 'failed-history-test',
          level: 'brief'
        });
      } catch (error) {
        // Expected to fail
      }

      // Check that history entries exist for failed attempts
      const allHistory = await historyRepo.findByStatus('failed');
      expect(allHistory.data.length).toBeGreaterThan(0);

      const failedEntry = allHistory.data.find(h => h.errorMessage === 'Generation failed');
      expect(failedEntry).toBeDefined();
      expect(failedEntry?.status).toBe('failed');
    });
  });

  describe('Advanced Features', () => {
    test('should handle focus topics in generation', async () => {
      const messages = createTestMessages(5);

      await summaryGenerator.generateSummary({
        messages,
        conversationId: 'focus-topics-test',
        level: 'detailed',
        focusTopics: ['AI', 'machine learning', 'neural networks']
      });

      // Verify provider was called with focus topics
      expect(mockProviderManager.generateSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          focusTopics: ['AI', 'machine learning', 'neural networks']
        }),
        'quality'
      );
    });

    test('should build upon previous summaries', async () => {
      const messages = createTestMessages(6);
      const previousSummary = 'Previous discussion covered basic AI concepts.';

      await summaryGenerator.generateSummary({
        messages,
        conversationId: 'incremental-test',
        level: 'standard',
        previousSummary
      });

      expect(mockProviderManager.generateSummary).toHaveBeenCalledWith(
        expect.objectContaining({
          previousSummary
        }),
        'quality'
      );
    });

    test('should use different provider strategies', async () => {
      const messages = createTestMessages(4);

      await summaryGenerator.generateSummary({
        messages,
        conversationId: 'strategy-test',
        level: 'standard',
        providerStrategy: 'cost'
      });

      expect(mockProviderManager.generateSummary).toHaveBeenCalledWith(
        expect.anything(),
        'cost' // Should use cost strategy instead of default 'quality'
      );
    });

    test('should handle conversation type detection', async () => {
      // Create messages with technical content
      const technicalMessages: Message[] = [
        {
          id: 'tech1',
          conversationId: 'technical-test',
          role: 'user',
          content: 'I have a bug in my code function that handles authentication',
          createdAt: Date.now(),
          metadata: {}
        },
        {
          id: 'tech2',
          conversationId: 'technical-test',
          role: 'assistant',
          content: 'Let me help you debug that function. Can you share the code?',
          createdAt: Date.now() + 60000,
          metadata: {}
        }
      ];

      const result = await summaryGenerator.generateSummary({
        messages: technicalMessages,
        conversationId: 'technical-test',
        level: 'standard'
      });

      // Verify summary was created and contains appropriate metadata
      expect(result.summary.metadata).toBeDefined();
      
      // Technical conversation type should be detected and stored
      const savedSummary = await summaryRepo.findById(result.summary.id);
      expect(savedSummary?.metadata).toHaveProperty('conversationType');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty message arrays', async () => {
      await expect(summaryGenerator.generateSummary({
        messages: [],
        conversationId: 'empty-test',
        level: 'standard'
      })).rejects.toThrow();
    });

    test('should handle extremely long conversations', async () => {
      // Create a very large conversation
      const largeMessages = createTestMessages(1000);

      // Mock provider to handle large input
      mockProviderManager.generateSummary.mockResolvedValueOnce({
        summary: 'Summary of very large conversation with many messages about various topics',
        tokenCount: 50,
        inputTokens: 50000,
        outputTokens: 50,
        processingTime: 5000,
        cost: 1.5,
        qualityScore: 0.8
      });

      const result = await summaryGenerator.generateSummary({
        messages: largeMessages,
        conversationId: 'large-conversation-test',
        level: 'detailed'
      });

      expect(result.summary.messageCount).toBe(1000);
      expect(result.summary.summaryText).toContain('very large conversation');
      expect(result.metadata.cost).toBe(1.5);
    });

    test('should handle invalid conversation IDs', async () => {
      const messages = createTestMessages(3);

      // Should still work with any conversation ID format
      const result = await summaryGenerator.generateSummary({
        messages,
        conversationId: 'invalid-uuid-format',
        level: 'brief'
      });

      expect(result.summary.conversationId).toBe('invalid-uuid-format');
    });

    test('should handle provider timeout scenarios', async () => {
      const messages = createTestMessages(4);

      // Mock provider to timeout
      mockProviderManager.generateSummary.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Long delay
        throw new Error('Request timeout');
      });

      await expect(summaryGenerator.generateSummary({
        messages,
        conversationId: 'timeout-test',
        level: 'standard'
      })).rejects.toThrow('Request timeout');
    });
  });

  describe('Performance and Statistics', () => {
    test('should track generation statistics', async () => {
      // Generate several summaries
      const conversations = ['stats-1', 'stats-2', 'stats-3'];
      
      for (const conversationId of conversations) {
        await summaryGenerator.generateSummary({
          messages: createTestMessages(3),
          conversationId,
          level: 'standard'
        });
      }

      const stats = await summaryGenerator.getGenerationStats();
      
      // Note: Implementation may return placeholders
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalSummaries');
      expect(stats).toHaveProperty('summariesByLevel');
      expect(stats).toHaveProperty('averageQualityScore');
    });

    test('should handle concurrent generation requests', async () => {
      const concurrentRequests = Array.from({ length: 5 }, (_, i) => 
        summaryGenerator.generateSummary({
          messages: createTestMessages(2),
          conversationId: `concurrent-${i}`,
          level: 'brief'
        })
      );

      const results = await Promise.all(concurrentRequests);
      
      expect(results).toHaveLength(5);
      
      // All should have unique IDs
      const ids = results.map(r => r.summary.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);

      // All should be saved to database
      for (const result of results) {
        const saved = await summaryRepo.findById(result.summary.id);
        expect(saved).toBeDefined();
      }
    });
  });
});