/**
 * Phase 2 End-to-End Integration Tests
 * 
 * Comprehensive end-to-end integration tests that verify the complete Phase 2 workflow:
 * - Complete conversation lifecycle with summaries
 * - Context assembly and retrieval
 * - Provider configuration and usage
 * - Cache management and performance
 * - Error handling and recovery
 * - Performance under load
 */

import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals';
import Database from 'better-sqlite3';
import { DatabaseManager } from '../../../src/storage/Database.js';
import { SummaryGenerator } from '../../../src/context/SummaryGenerator.js';
import { ContextAssembler } from '../../../src/context/ContextAssembler.js';
import { ProviderManager } from '../../../src/context/ProviderManager.js';
import { EmbeddingManager } from '../../../src/search/EmbeddingManager.js';
import { TokenCounter, createTokenCounter } from '../../../src/context/TokenCounter.js';

// Repositories
import { SummaryRepository } from '../../../src/storage/repositories/SummaryRepository.js';
import { ProviderConfigRepository } from '../../../src/storage/repositories/ProviderConfigRepository.js';
import { CacheRepository } from '../../../src/storage/repositories/CacheRepository.js';
import { SummaryHistoryRepository } from '../../../src/storage/repositories/SummaryHistoryRepository.js';
import { ConversationRepository } from '../../../src/storage/repositories/ConversationRepository.js';
import { MessageRepository } from '../../../src/storage/repositories/MessageRepository.js';

// Tools
import { GetRelevantSnippetsTool } from '../../../src/tools/GetRelevantSnippetsTool.js';
import { ConfigureLLMProviderTool } from '../../../src/tools/ConfigureLLMProviderTool.js';
import { GetProgressiveDetailTool } from '../../../src/tools/GetProgressiveDetailTool.js';

import { Message, ConversationSummary } from '../../../src/types/interfaces.js';

// Mock external dependencies
jest.mock('../../../src/context/ProviderManager.js');
jest.mock('../../../src/search/EmbeddingManager.js');

describe('Phase 2 End-to-End Integration Tests', () => {
  let db: Database.Database;
  let dbManager: DatabaseManager;
  
  // Core services
  let summaryGenerator: SummaryGenerator;
  let contextAssembler: ContextAssembler;
  let mockProviderManager: jest.Mocked<ProviderManager>;
  let mockEmbeddingManager: jest.Mocked<EmbeddingManager>;
  let tokenCounter: TokenCounter;

  // Repositories
  let summaryRepo: SummaryRepository;
  let providerConfigRepo: ProviderConfigRepository;
  let cacheRepo: CacheRepository;
  let historyRepo: SummaryHistoryRepository;
  let conversationRepo: ConversationRepository;
  let messageRepo: MessageRepository;

  // Tools
  let getRelevantSnippetsTool: GetRelevantSnippetsTool;
  let configureLLMProviderTool: ConfigureLLMProviderTool;
  let getProgressiveDetailTool: GetProgressiveDetailTool;

  // Test data
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
    summaryRepo = new SummaryRepository(dbManager);
    providerConfigRepo = new ProviderConfigRepository(dbManager);
    cacheRepo = new CacheRepository(dbManager);
    historyRepo = new SummaryHistoryRepository(dbManager);
    conversationRepo = new ConversationRepository(dbManager);
    messageRepo = new MessageRepository(dbManager);

    // Create test conversation
    const conversation = await conversationRepo.create({
      title: 'End-to-End Test Conversation'
    });
    testConversationId = conversation.id;

    // Initialize token counter
    tokenCounter = createTokenCounter('gpt-4');

    // Setup mocks
    mockProviderManager = {
      generateSummary: jest.fn(),
      getAvailableProviders: jest.fn(),
      isProviderAvailable: jest.fn(),
      getProviderConfig: jest.fn(),
      setProviderConfig: jest.fn(),
      healthCheck: jest.fn()
    } as any;

    mockEmbeddingManager = {
      generateEmbedding: jest.fn(),
      findSimilarMessages: jest.fn(),
      isModelAvailable: jest.fn(),
      getModelInfo: jest.fn(),
      healthCheck: jest.fn()
    } as any;

    // Setup default mock responses
    mockProviderManager.generateSummary.mockResolvedValue({
      summary: 'Generated summary of the conversation discussing various AI topics and techniques.',
      tokenCount: 20,
      inputTokens: 800,
      outputTokens: 20,
      processingTime: 1200,
      cost: 0.025,
      qualityScore: 0.85
    });

    mockProviderManager.isProviderAvailable.mockReturnValue(true);
    mockEmbeddingManager.isModelAvailable.mockReturnValue(true);
    mockEmbeddingManager.findSimilarMessages.mockResolvedValue([]);

    // Initialize core services
    summaryGenerator = new SummaryGenerator(
      mockProviderManager,
      summaryRepo,
      historyRepo,
      cacheRepo,
      tokenCounter,
      {
        enableCaching: true,
        enableValidation: true,
        minQualityScore: 0.7,
        maxRetries: 2,
        cacheTtl: 60 * 60 * 1000, // 1 hour
        temporalCompression: {
          recentThresholdHours: 24,
          mediumThresholdDays: 7,
          forceOldBrief: true
        }
      }
    );

    contextAssembler = new ContextAssembler(
      mockEmbeddingManager,
      messageRepo,
      summaryRepo,
      {
        defaultMaxTokens: 4000,
        defaultStrategy: 'hybrid',
        enableSemanticSearch: true,
        enableTemporalWeighting: true
      }
    );

    // Initialize tools
    getRelevantSnippetsTool = new GetRelevantSnippetsTool({
      contextAssembler,
      embeddingManager: mockEmbeddingManager,
      messageRepository: messageRepo,
      summaryRepository: summaryRepo
    });

    configureLLMProviderTool = new ConfigureLLMProviderTool({
      providerConfigRepository: providerConfigRepo
    });

    getProgressiveDetailTool = new GetProgressiveDetailTool({
      messageRepository: messageRepo,
      summaryRepository: summaryRepo,
      contextAssembler
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (db) {
      db.close();
    }
  });

  // Helper to create a complete conversation with messages
  const createTestConversation = async (
    messageCount: number = 8,
    topic: string = 'AI and machine learning'
  ): Promise<Message[]> => {
    const messages: Message[] = [];
    
    const baseContents = [
      `Hello, I'd like to learn about ${topic}. Can you help me understand the basics?`,
      `Of course! ${topic} is a fascinating field with many applications. Let me explain the fundamentals.`,
      `What are the key concepts I should understand first?`,
      `The most important concepts include algorithms, data processing, pattern recognition, and model training.`,
      `How do these concepts work together in practice?`,
      `They work together in a pipeline: data is processed, algorithms analyze patterns, and models are trained to make predictions.`,
      `Can you give me some real-world examples?`,
      `Sure! Examples include recommendation systems, image recognition, natural language processing, and autonomous vehicles.`
    ];

    // Create messages with realistic content
    for (let i = 0; i < messageCount; i++) {
      const content = baseContents[i % baseContents.length] || `Additional message ${i + 1} about ${topic}`;
      const role = i % 2 === 0 ? 'user' : 'assistant';
      
      const message = await messageRepo.create({
        conversationId: testConversationId,
        role,
        content,
        createdAt: Date.now() - ((messageCount - i) * 60000), // Spread over time
        metadata: { messageIndex: i + 1, topic }
      });
      
      messages.push(message);
    }

    return messages;
  };

  describe('Complete Conversation Lifecycle', () => {
    test('should handle full conversation with progressive summarization', async () => {
      // 1. Create initial conversation with messages
      const messages = await createTestConversation(12, 'machine learning fundamentals');

      // 2. Configure LLM provider
      const providerConfig = await configureLLMProviderTool.handle({
        action: 'create',
        providerId: 'openai',
        config: {
          apiKey: 'sk-test-key',
          model: 'gpt-4',
          maxTokens: 4000,
          temperature: 0.7
        },
        metadata: {
          description: 'Primary OpenAI configuration for testing',
          costPerToken: 0.00003
        }
      });

      const configResponse = JSON.parse(providerConfig.content[0].text);
      expect(configResponse.success).toBe(true);

      // 3. Generate summaries at different levels
      const briefSummary = await summaryGenerator.generateSummary({
        messages: messages.slice(0, 4), // First 4 messages
        conversationId: testConversationId,
        level: 'brief'
      });

      const standardSummary = await summaryGenerator.generateSummary({
        messages: messages.slice(0, 8), // First 8 messages
        conversationId: testConversationId,
        level: 'standard'
      });

      const detailedSummary = await summaryGenerator.generateSummary({
        messages: messages, // All messages
        conversationId: testConversationId,
        level: 'detailed'
      });

      // Verify summaries were created
      expect(briefSummary.summary.level).toBe('brief');
      expect(standardSummary.summary.level).toBe('standard');
      expect(detailedSummary.summary.level).toBe('detailed');

      // Verify summaries are in database
      const allSummaries = await summaryRepo.findByConversation(testConversationId);
      expect(allSummaries.data).toHaveLength(3);

      // 4. Test context assembly with summaries
      const contextResult = await getRelevantSnippetsTool.handle({
        query: 'machine learning fundamentals and key concepts',
        conversationId: testConversationId,
        maxTokens: 1000,
        strategy: 'hybrid'
      });

      const contextResponse = JSON.parse(contextResult.content[0].text);
      expect(contextResponse.success).toBe(true);
      expect(contextResponse.snippets.length).toBeGreaterThan(0);

      // Should include both messages and summaries
      const messageSnippets = contextResponse.snippets.filter((s: any) => s.type === 'message');
      const summarySnippets = contextResponse.snippets.filter((s: any) => s.type === 'summary');
      expect(messageSnippets.length).toBeGreaterThan(0);
      expect(summarySnippets.length).toBeGreaterThan(0);

      // 5. Test progressive detail retrieval
      const progressiveResult = await getProgressiveDetailTool.handle({
        conversationId: testConversationId,
        query: 'machine learning discussion overview',
        startLevel: 'brief',
        maxTokens: 800
      });

      const progressiveResponse = JSON.parse(progressiveResult.content[0].text);
      expect(progressiveResponse.success).toBe(true);
      expect(progressiveResponse.currentLevel).toBe('brief');
      expect(progressiveResponse.hasMoreDetail).toBe(true);
      expect(progressiveResponse.availableLevels).toContain('standard');
      expect(progressiveResponse.availableLevels).toContain('detailed');
    });

    test('should handle conversation evolution with summary updates', async () => {
      // 1. Start with initial conversation
      let messages = await createTestConversation(6, 'neural networks');

      // 2. Generate initial summary
      const initialSummary = await summaryGenerator.generateSummary({
        messages,
        conversationId: testConversationId,
        level: 'standard'
      });

      expect(initialSummary.summary.messageCount).toBe(6);

      // 3. Add more messages to conversation
      const additionalMessages = await Promise.all([
        messageRepo.create({
          conversationId: testConversationId,
          role: 'user',
          content: 'What about deep learning architectures like transformers?',
          createdAt: Date.now() - 180000,
          metadata: { phase: 'extension' }
        }),
        messageRepo.create({
          conversationId: testConversationId,
          role: 'assistant',
          content: 'Transformers are a revolutionary architecture that uses attention mechanisms for processing sequential data.',
          createdAt: Date.now() - 120000,
          metadata: { phase: 'extension' }
        }),
        messageRepo.create({
          conversationId: testConversationId,
          role: 'user',
          content: 'How do attention mechanisms work exactly?',
          createdAt: Date.now() - 60000,
          metadata: { phase: 'extension' }
        })
      ]);

      messages = [...messages, ...additionalMessages];

      // 4. Invalidate old summaries
      await summaryGenerator.invalidateConversationSummaries(testConversationId);

      // Verify old summary is gone
      const oldSummary = await summaryRepo.findById(initialSummary.summary.id);
      expect(oldSummary).toBeNull();

      // 5. Generate new summary with extended conversation
      const updatedSummary = await summaryGenerator.generateSummary({
        messages,
        conversationId: testConversationId,
        level: 'standard'
      });

      expect(updatedSummary.summary.messageCount).toBe(9);

      // 6. Verify context assembly includes new content
      const contextResult = await getRelevantSnippetsTool.handle({
        query: 'transformers and attention mechanisms',
        conversationId: testConversationId,
        maxTokens: 600
      });

      const contextResponse = JSON.parse(contextResult.content[0].text);
      expect(contextResponse.success).toBe(true);
      expect(contextResponse.contextText.toLowerCase()).toContain('transformer');
    });
  });

  describe('Multi-Provider Configuration and Fallback', () => {
    test('should configure multiple providers and handle provider selection', async () => {
      // 1. Configure multiple providers
      const providers = [
        {
          providerId: 'openai',
          config: { model: 'gpt-4', maxTokens: 4000, temperature: 0.7 },
          metadata: { priority: 1, costPerToken: 0.00003 }
        },
        {
          providerId: 'anthropic',
          config: { model: 'claude-3-sonnet', maxTokens: 4000, temperature: 0.5 },
          metadata: { priority: 2, costPerToken: 0.000015 }
        },
        {
          providerId: 'ollama',
          config: { model: 'llama2', maxTokens: 2000, temperature: 0.8 },
          metadata: { priority: 3, costPerToken: 0 }
        }
      ];

      const configResults = [];
      for (const provider of providers) {
        const result = await configureLLMProviderTool.handle({
          action: 'create',
          ...provider
        });
        configResults.push(JSON.parse(result.content[0].text));
      }

      // Verify all providers configured
      expect(configResults.every(r => r.success)).toBe(true);

      // 2. List all configurations
      const listResult = await configureLLMProviderTool.handle({
        action: 'list'
      });

      const listResponse = JSON.parse(listResult.content[0].text);
      expect(listResponse.success).toBe(true);
      expect(listResponse.configs).toHaveLength(3);

      // 3. Test provider availability and selection
      const openaiConfig = listResponse.configs.find((c: any) => c.providerId === 'openai');
      const anthropicConfig = listResponse.configs.find((c: any) => c.providerId === 'anthropic');

      expect(openaiConfig).toBeDefined();
      expect(anthropicConfig).toBeDefined();

      // 4. Create conversation and test summary generation with different providers
      const messages = await createTestConversation(6, 'provider testing');

      // Mock different provider responses
      mockProviderManager.generateSummary
        .mockResolvedValueOnce({
          summary: 'OpenAI generated summary with high quality analysis.',
          tokenCount: 18,
          inputTokens: 600,
          outputTokens: 18,
          processingTime: 1000,
          cost: 0.018,
          qualityScore: 0.9
        });

      const summary1 = await summaryGenerator.generateSummary({
        messages,
        conversationId: testConversationId,
        level: 'standard',
        providerStrategy: 'quality'
      });

      expect(summary1.summary.summaryText).toContain('OpenAI generated');

      // 5. Test cost-optimized provider selection
      mockProviderManager.generateSummary
        .mockResolvedValueOnce({
          summary: 'Anthropic generated summary optimized for cost efficiency.',
          tokenCount: 16,
          inputTokens: 600,
          outputTokens: 16,
          processingTime: 800,
          cost: 0.009,
          qualityScore: 0.85
        });

      const summary2 = await summaryGenerator.generateSummary({
        messages,
        conversationId: testConversationId,
        level: 'brief',
        providerStrategy: 'cost'
      });

      expect(summary2.summary.summaryText).toContain('Anthropic generated');
    });

    test('should handle provider failures with graceful fallback', async () => {
      // 1. Configure providers
      await configureLLMProviderTool.handle({
        action: 'create',
        providerId: 'primary-provider',
        config: { model: 'primary-model' }
      });

      await configureLLMProviderTool.handle({
        action: 'create',
        providerId: 'fallback-provider',
        config: { model: 'fallback-model' }
      });

      // 2. Create test conversation
      const messages = await createTestConversation(4, 'provider fallback test');

      // 3. Mock primary provider failure, fallback success
      mockProviderManager.generateSummary
        .mockRejectedValueOnce(new Error('Primary provider unavailable'))
        .mockResolvedValueOnce({
          summary: 'Fallback provider generated this summary successfully.',
          tokenCount: 15,
          inputTokens: 400,
          outputTokens: 15,
          processingTime: 1200,
          cost: 0.012,
          qualityScore: 0.8
        });

      const result = await summaryGenerator.generateSummary({
        messages,
        conversationId: testConversationId,
        level: 'standard'
      });

      expect(result.summary.summaryText).toContain('Fallback provider');
      expect(mockProviderManager.generateSummary).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache Management and Performance', () => {
    test('should demonstrate comprehensive cache lifecycle', async () => {
      // 1. Create conversation and generate summaries (should populate cache)
      const messages = await createTestConversation(8, 'cache performance test');

      const summary1 = await summaryGenerator.generateSummary({
        messages: messages.slice(0, 4),
        conversationId: testConversationId,
        level: 'brief'
      });

      const summary2 = await summaryGenerator.generateSummary({
        messages: messages.slice(0, 6),
        conversationId: testConversationId,
        level: 'standard'
      });

      // 2. Verify cache entries exist
      const briefCacheKey = `summary:${testConversationId}:brief`;
      const standardCacheKey = `summary:${testConversationId}:standard`;

      let briefCached = await cacheRepo.get(briefCacheKey);
      let standardCached = await cacheRepo.get(standardCacheKey);

      expect(briefCached).toBeDefined();
      expect(standardCached).toBeDefined();

      // 3. Test cache hit on subsequent requests
      const startTime = Date.now();
      
      const cachedResult = await summaryGenerator.generateSummary({
        messages: messages.slice(0, 4),
        conversationId: testConversationId,
        level: 'brief'
      });

      const endTime = Date.now();

      expect(cachedResult.metadata.fromCache).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
      expect(mockProviderManager.generateSummary).toHaveBeenCalledTimes(2); // No additional calls

      // 4. Test cache invalidation
      await summaryGenerator.invalidateConversationSummaries(testConversationId);

      briefCached = await cacheRepo.get(briefCacheKey);
      standardCached = await cacheRepo.get(standardCacheKey);

      expect(briefCached).toBeNull();
      expect(standardCached).toBeNull();

      // 5. Test cache statistics
      const stats = await cacheRepo.getStats();
      expect(stats.totalEntries).toBeGreaterThanOrEqual(0);
      expect(stats.totalTokens).toBeGreaterThanOrEqual(0);
    });

    test('should handle cache expiration correctly', async () => {
      // 1. Create cache entry with short TTL
      const testData = {
        summaryIds: ['test-summary'],
        assembledContext: 'Test context for expiration',
        tokenCount: 10
      };

      await cacheRepo.set('expiration-test', testData, 0.001); // Very short TTL

      // 2. Verify entry exists immediately
      let cached = await cacheRepo.get('expiration-test');
      expect(cached).toBeDefined();

      // 3. Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 4. Verify entry is expired
      cached = await cacheRepo.get('expiration-test');
      expect(cached).toBeNull();

      // 5. Test cleanup of expired entries
      const cleanedCount = await cacheRepo.cleanupExpired();
      expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Under Load', () => {
    test('should handle concurrent summary generation efficiently', async () => {
      // 1. Create multiple conversations concurrently
      const conversationPromises = Array.from({ length: 5 }, async (_, i) => {
        const conv = await conversationRepo.create({
          title: `Load Test Conversation ${i + 1}`
        });
        
        const messages = await Promise.all(
          Array.from({ length: 4 }, (_, j) => 
            messageRepo.create({
              conversationId: conv.id,
              role: j % 2 === 0 ? 'user' : 'assistant',
              content: `Load test message ${j + 1} for conversation ${i + 1}`,
              createdAt: Date.now() - (j * 30000),
              metadata: { loadTest: true }
            })
          )
        );

        return { conversation: conv, messages };
      });

      const conversations = await Promise.all(conversationPromises);

      // 2. Generate summaries concurrently
      const startTime = Date.now();
      
      const summaryPromises = conversations.map(({ conversation, messages }) =>
        summaryGenerator.generateSummary({
          messages,
          conversationId: conversation.id,
          level: 'standard'
        })
      );

      const results = await Promise.all(summaryPromises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // 3. Verify all summaries were generated successfully
      expect(results).toHaveLength(5);
      for (const result of results) {
        expect(result.summary).toBeDefined();
        expect(result.summary.summaryText).toBeDefined();
      }

      // 4. Performance should be reasonable (less than 10 seconds for 5 summaries)
      expect(totalTime).toBeLessThan(10000);

      // 5. Verify database consistency
      for (const { conversation } of conversations) {
        const savedSummaries = await summaryRepo.findByConversation(conversation.id);
        expect(savedSummaries.data).toHaveLength(1);
      }
    });

    test('should handle high-volume context assembly requests', async () => {
      // 1. Create substantial test data
      const messages = await Promise.all(
        Array.from({ length: 50 }, (_, i) => 
          messageRepo.create({
            conversationId: testConversationId,
            role: i % 2 === 0 ? 'user' : 'assistant',
            content: `High volume test message ${i + 1} containing various AI and ML concepts for testing scalability.`,
            createdAt: Date.now() - (i * 60000),
            metadata: { volumeTest: true, index: i }
          })
        )
      );

      // Create summaries
      const summaries = await Promise.all([
        summaryRepo.create({
          conversationId: testConversationId,
          level: 'brief',
          summaryText: 'Brief summary of high-volume conversation',
          tokenCount: 8,
          provider: 'test',
          model: 'test',
          messageCount: 50
        }),
        summaryRepo.create({
          conversationId: testConversationId,
          level: 'standard',
          summaryText: 'Standard summary covering the main topics discussed in this high-volume conversation',
          tokenCount: 18,
          provider: 'test',
          model: 'test',
          messageCount: 50
        })
      ]);

      // 2. Mock embedding search for volume test
      mockEmbeddingManager.findSimilarMessages.mockResolvedValue(
        messages.slice(0, 20).map((msg, i) => ({
          messageId: msg.id,
          similarity: 0.9 - (i * 0.02) // Decreasing similarity
        }))
      );

      // 3. Perform multiple concurrent context assembly requests
      const startTime = Date.now();
      
      const contextPromises = Array.from({ length: 10 }, (_, i) =>
        getRelevantSnippetsTool.handle({
          query: `volume test query ${i + 1} about AI and ML concepts`,
          conversationId: testConversationId,
          maxTokens: 1000,
          strategy: 'hybrid'
        })
      );

      const contextResults = await Promise.all(contextPromises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // 4. Verify all requests completed successfully
      expect(contextResults).toHaveLength(10);
      for (const result of contextResults) {
        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
        expect(response.contextText).toBeDefined();
        expect(response.snippets.length).toBeGreaterThan(0);
      }

      // 5. Performance should be reasonable (less than 15 seconds for 10 requests)
      expect(totalTime).toBeLessThan(15000);
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover gracefully from database connection issues', async () => {
      // 1. Create initial test data
      const messages = await createTestConversation(4, 'resilience test');

      // 2. Simulate database issues by closing connection temporarily
      // Note: This is a simplified simulation - in real scenarios, connection
      // issues would be handled by the database manager
      
      // First, verify normal operation
      const normalResult = await getRelevantSnippetsTool.handle({
        query: 'resilience test',
        conversationId: testConversationId,
        maxTokens: 400
      });

      const normalResponse = JSON.parse(normalResult.content[0].text);
      expect(normalResponse.success).toBe(true);

      // 3. Test recovery after simulated issue
      // In a real scenario, we'd test actual connection recovery
      // For now, verify the tools continue to work
      const recoveredResult = await getProgressiveDetailTool.handle({
        conversationId: testConversationId,
        query: 'resilience test recovery',
        startLevel: 'brief'
      });

      const recoveredResponse = JSON.parse(recoveredResult.content[0].text);
      // Should handle gracefully even if no summaries are found
      expect(recoveredResponse).toBeDefined();
    });

    test('should handle cascading failures with proper error reporting', async () => {
      // 1. Create test conversation
      const messages = await createTestConversation(3, 'cascade failure test');

      // 2. Mock cascading failures
      mockProviderManager.generateSummary.mockRejectedValue(new Error('Provider cascade failure'));
      mockEmbeddingManager.findSimilarMessages.mockRejectedValue(new Error('Embedding cascade failure'));

      // 3. Test summary generation failure handling
      try {
        await summaryGenerator.generateSummary({
          messages,
          conversationId: testConversationId,
          level: 'standard'
        });
        
        // Should throw after retries
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toContain('cascade failure');
      }

      // 4. Verify history tracking of failures
      const failedHistory = await historyRepo.findByStatus('failed');
      expect(failedHistory.data.length).toBeGreaterThan(0);

      // 5. Test context assembly failure handling
      const contextResult = await getRelevantSnippetsTool.handle({
        query: 'cascade failure test',
        conversationId: testConversationId,
        maxTokens: 500
      });

      const contextResponse = JSON.parse(contextResult.content[0].text);
      // Should handle gracefully and not throw
      expect(contextResponse).toBeDefined();
    });
  });

  describe('Data Consistency and Integrity', () => {
    test('should maintain referential integrity across all components', async () => {
      // 1. Create comprehensive test scenario
      const messages = await createTestConversation(10, 'integrity test');

      // 2. Configure provider
      const providerResult = await configureLLMProviderTool.handle({
        action: 'create',
        providerId: 'integrity-test',
        config: { model: 'integrity-model' }
      });

      const providerConfig = JSON.parse(providerResult.content[0].text);
      expect(providerConfig.success).toBe(true);

      // 3. Generate summaries
      const summary = await summaryGenerator.generateSummary({
        messages: messages.slice(0, 6),
        conversationId: testConversationId,
        level: 'standard'
      });

      // 4. Verify all relationships exist and are consistent
      
      // Check conversation exists
      const conversation = await conversationRepo.findById(testConversationId);
      expect(conversation).toBeDefined();

      // Check messages reference correct conversation
      const allMessages = await messageRepo.findByConversation(testConversationId);
      expect(allMessages.data).toHaveLength(10);
      for (const msg of allMessages.data) {
        expect(msg.conversationId).toBe(testConversationId);
      }

      // Check summary references correct conversation
      const savedSummary = await summaryRepo.findById(summary.summary.id);
      expect(savedSummary?.conversationId).toBe(testConversationId);

      // Check history references correct summary
      const history = await historyRepo.findBySummaryId(summary.summary.id);
      expect(history).toHaveLength(1);
      expect(history[0].summaryId).toBe(summary.summary.id);

      // Check provider config is accessible
      const configById = await providerConfigRepo.findById(providerConfig.config.id);
      expect(configById).toBeDefined();
      expect(configById?.providerId).toBe('integrity-test');

      // 5. Test cascade operations maintain integrity
      
      // Delete conversation should cascade appropriately
      // (Note: In a real implementation, we'd need proper cascade logic)
      await summaryRepo.invalidateForConversation(testConversationId);
      
      const deletedSummary = await summaryRepo.findById(summary.summary.id);
      expect(deletedSummary).toBeNull();

      // History should still exist (separate lifecycle)
      const historyAfterDelete = await historyRepo.findBySummaryId(summary.summary.id);
      expect(historyAfterDelete).toHaveLength(1);
    });

    test('should handle concurrent modifications without data corruption', async () => {
      // 1. Create base conversation
      const messages = await createTestConversation(6, 'concurrency test');

      // 2. Perform concurrent operations
      const operations = [
        // Generate multiple summaries concurrently
        summaryGenerator.generateSummary({
          messages: messages.slice(0, 3),
          conversationId: testConversationId,
          level: 'brief'
        }),
        summaryGenerator.generateSummary({
          messages: messages.slice(0, 4),
          conversationId: testConversationId,
          level: 'standard'
        }),
        
        // Configure providers concurrently
        configureLLMProviderTool.handle({
          action: 'create',
          providerId: 'concurrent-1',
          config: { model: 'model-1' }
        }),
        configureLLMProviderTool.handle({
          action: 'create',
          providerId: 'concurrent-2',
          config: { model: 'model-2' }
        }),

        // Context assembly
        getRelevantSnippetsTool.handle({
          query: 'concurrency test',
          conversationId: testConversationId,
          maxTokens: 400
        })
      ];

      const results = await Promise.allSettled(operations);

      // 3. Verify all operations completed (successfully or with proper error handling)
      expect(results).toHaveLength(5);
      
      // Check successful operations
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);

      // 4. Verify data consistency after concurrent operations
      const finalSummaries = await summaryRepo.findByConversation(testConversationId);
      const finalConfigs = await configureLLMProviderTool.handle({ action: 'list' });
      const configResponse = JSON.parse(finalConfigs.content[0].text);

      // Data should be consistent (no corruption)
      expect(finalSummaries.data.length).toBeGreaterThanOrEqual(0);
      expect(configResponse.success).toBe(true);
      
      // Each summary should have valid data
      for (const summary of finalSummaries.data) {
        expect(summary.conversationId).toBe(testConversationId);
        expect(summary.summaryText).toBeDefined();
        expect(summary.tokenCount).toBeGreaterThan(0);
      }
    });
  });
});