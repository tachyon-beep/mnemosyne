/**
 * Phase 2 MCP Tools Integration Tests
 * 
 * Comprehensive integration tests for the new MCP tools in Phase 2:
 * - get_relevant_snippets - Context-aware snippet retrieval
 * - configure_llm_provider - Runtime LLM provider configuration
 * - get_progressive_detail - Progressive detail retrieval
 */

import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals';
import Database from 'better-sqlite3';
import { DatabaseManager } from '../../../src/storage/Database.js';
import { GetRelevantSnippetsTool } from '../../../src/tools/GetRelevantSnippetsTool.js';
import { ConfigureLLMProviderTool } from '../../../src/tools/ConfigureLLMProviderTool.js';
import { GetProgressiveDetailTool } from '../../../src/tools/GetProgressiveDetailTool.js';
import { ContextAssembler } from '../../../src/context/ContextAssembler.js';
import { EmbeddingManager } from '../../../src/search/EmbeddingManager.js';
import { MessageRepository } from '../../../src/storage/repositories/MessageRepository.js';
import { SummaryRepository } from '../../../src/storage/repositories/SummaryRepository.js';
import { ProviderConfigRepository } from '../../../src/storage/repositories/ProviderConfigRepository.js';
import { ConversationRepository } from '../../../src/storage/repositories/ConversationRepository.js';
import { Message } from '../../../src/types/interfaces.js';

// Mock external dependencies
jest.mock('../../../src/search/EmbeddingManager.js');
jest.mock('../../../src/context/ContextAssembler.js');

describe('Phase 2 MCP Tools Integration Tests', () => {
  let db: Database.Database;
  let dbManager: DatabaseManager;
  let mockEmbeddingManager: jest.Mocked<EmbeddingManager>;
  let mockContextAssembler: jest.Mocked<ContextAssembler>;
  let messageRepo: MessageRepository;
  let summaryRepo: SummaryRepository;
  let providerConfigRepo: ProviderConfigRepository;
  let conversationRepo: ConversationRepository;
  let testConversationId: string;

  // Tools to test
  let getRelevantSnippetsTool: GetRelevantSnippetsTool;
  let configureLLMProviderTool: ConfigureLLMProviderTool;
  let getProgressiveDetailTool: GetProgressiveDetailTool;

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
    providerConfigRepo = new ProviderConfigRepository(dbManager);
    conversationRepo = new ConversationRepository(dbManager);

    // Create test conversation
    const conversation = await conversationRepo.create({
      title: 'Test Conversation for MCP Tools'
    });
    testConversationId = conversation.id;

    // Setup mocks
    mockEmbeddingManager = {
      generateEmbedding: jest.fn(),
      findSimilarMessages: jest.fn(),
      isModelAvailable: jest.fn(),
      getModelInfo: jest.fn(),
      healthCheck: jest.fn()
    } as any;

    mockContextAssembler = {
      assemble: jest.fn(),
      getConfiguration: jest.fn(),
      updateConfiguration: jest.fn()
    } as any;

    // Setup default mock responses
    mockEmbeddingManager.isModelAvailable.mockReturnValue(true);
    mockEmbeddingManager.findSimilarMessages.mockResolvedValue([]);

    mockContextAssembler.assemble.mockResolvedValue({
      text: 'Assembled context with relevant information about AI and machine learning.',
      tokenCount: 25,
      tokenBreakdown: {
        query: 5,
        summaries: 8,
        messages: 10,
        metadata: 1,
        buffer: 1
      },
      includedItems: [
        {
          type: 'message',
          id: 'msg1',
          relevanceScore: 0.9,
          tokenCount: 10,
          position: 0
        },
        {
          type: 'summary',
          id: 'sum1',
          relevanceScore: 0.8,
          tokenCount: 8,
          position: 1
        }
      ],
      strategy: 'hybrid',
      metrics: {
        processingTimeMs: 150,
        itemsEvaluated: 5,
        itemsIncluded: 2,
        averageRelevance: 0.85,
        tokenEfficiency: 0.75
      }
    });

    // Initialize tools
    getRelevantSnippetsTool = new GetRelevantSnippetsTool({
      contextAssembler: mockContextAssembler,
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
      contextAssembler: mockContextAssembler
    });
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

  describe('GetRelevantSnippetsTool Integration', () => {
    test('should retrieve relevant snippets successfully', async () => {
      // Create test messages
      const msg1 = await createTestMessage('What is machine learning?');
      const msg2 = await createTestMessage('Machine learning is a subset of AI that enables computers to learn from data.', 'assistant');
      const msg3 = await createTestMessage('Can you explain neural networks?');

      // Create test summary
      const summary = await summaryRepo.create({
        conversationId: testConversationId,
        level: 'standard',
        summaryText: 'Discussion about machine learning and AI fundamentals.',
        tokenCount: 12,
        provider: 'openai',
        model: 'gpt-4',
        messageCount: 3
      });

      // Mock context assembler to return realistic data
      mockContextAssembler.assemble.mockResolvedValueOnce({
        text: 'Context: Machine learning discussion. What is machine learning? Machine learning is a subset of AI.',
        tokenCount: 45,
        tokenBreakdown: {
          query: 8,
          summaries: 12,
          messages: 22,
          metadata: 2,
          buffer: 1
        },
        includedItems: [
          {
            type: 'message',
            id: msg2.id,
            relevanceScore: 0.95,
            tokenCount: 22,
            position: 0
          },
          {
            type: 'summary',
            id: summary.id,
            relevanceScore: 0.85,
            tokenCount: 12,
            position: 1
          }
        ],
        strategy: 'hybrid',
        metrics: {
          processingTimeMs: 125,
          itemsEvaluated: 4,
          itemsIncluded: 2,
          averageRelevance: 0.9,
          tokenEfficiency: 0.9
        }
      });

      const input = {
        query: 'explain machine learning concepts',
        maxTokens: 500,
        strategy: 'hybrid',
        conversationId: testConversationId
      };

      const result = await getRelevantSnippetsTool.handle(input);

      expect(result.content[0].type).toBe('text');
      const response = JSON.parse(result.content[0].text);

      expect(response.contextText).toBeDefined();
      expect(response.tokenCount).toBe(45);
      expect(response.snippets).toHaveLength(2);
      expect(response.strategy).toBe('hybrid');
      expect(response.candidatesEvaluated).toBe(4);
      expect(response.averageRelevance).toBe(0.9);
      expect(response.processingTime).toBe(125);

      // Check snippet details
      const messageSnippet = response.snippets.find((s: any) => s.type === 'message');
      const summarySnippet = response.snippets.find((s: any) => s.type === 'summary');

      expect(messageSnippet).toBeDefined();
      expect(messageSnippet.id).toBe(msg2.id);
      expect(messageSnippet.relevanceScore).toBe(0.95);
      expect(messageSnippet.conversationId).toBe(testConversationId);

      expect(summarySnippet).toBeDefined();
      expect(summarySnippet.id).toBe(summary.id);
      expect(summarySnippet.relevanceScore).toBe(0.85);

      // Verify context assembler was called correctly
      expect(mockContextAssembler.assemble).toHaveBeenCalledWith({
        query: 'explain machine learning concepts',
        maxTokens: 500,
        strategy: 'hybrid',
        conversationId: testConversationId
      });
    });

    test('should handle different assembly strategies', async () => {
      await createTestMessage('AI discussion content');

      const strategies = ['temporal', 'topical', 'entity-centric', 'hybrid'] as const;

      for (const strategy of strategies) {
        const input = {
          query: 'AI concepts',
          maxTokens: 300,
          strategy
        };

        const result = await getRelevantSnippetsTool.handle(input);
        const response = JSON.parse(result.content[0].text);

        expect(response.strategy).toBe(strategy);
        expect(mockContextAssembler.assemble).toHaveBeenCalledWith(
          expect.objectContaining({ strategy })
        );
      }
    });

    test('should handle minimum relevance filtering', async () => {
      const input = {
        query: 'specific topic',
        maxTokens: 400,
        minRelevance: 0.8,
        includeRecent: true
      };

      const result = await getRelevantSnippetsTool.handle(input);
      const response = JSON.parse(result.content[0].text);

      expect(response).toBeDefined();
      expect(mockContextAssembler.assemble).toHaveBeenCalledWith(
        expect.objectContaining({
          minRelevance: 0.8,
          includeRecent: true
        })
      );
    });

    test('should handle context assembly failures gracefully', async () => {
      // Mock context assembler to fail
      mockContextAssembler.assemble.mockRejectedValueOnce(new Error('Context assembly failed'));

      const input = {
        query: 'test query',
        maxTokens: 300
      };

      const result = await getRelevantSnippetsTool.handle(input);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Context assembly failed');
    });

    test('should validate input parameters', async () => {
      // Test missing query
      let result = await getRelevantSnippetsTool.handle({
        maxTokens: 300
      } as any);

      let response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Validation error');

      // Test invalid token count
      result = await getRelevantSnippetsTool.handle({
        query: 'test',
        maxTokens: 20 // Too low
      });

      response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Validation error');

      // Test invalid strategy
      result = await getRelevantSnippetsTool.handle({
        query: 'test',
        maxTokens: 300,
        strategy: 'invalid-strategy'
      } as any);

      response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Validation error');
    });
  });

  describe('ConfigureLLMProviderTool Integration', () => {
    test('should create new provider configuration', async () => {
      const input = {
        action: 'create' as const,
        providerId: 'openai',
        config: {
          apiKey: 'sk-test-key',
          model: 'gpt-4',
          maxTokens: 4000,
          temperature: 0.7
        },
        metadata: {
          description: 'OpenAI GPT-4 configuration for testing',
          costPerToken: 0.00003
        }
      };

      const result = await configureLLMProviderTool.handle(input);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(true);
      expect(response.config.id).toBeDefined();
      expect(response.config.providerId).toBe('openai');
      expect(response.config.config).toEqual(input.config);
      expect(response.config.metadata).toEqual(input.metadata);
      expect(response.config.isActive).toBe(true);

      // Verify configuration was saved to database
      const saved = await providerConfigRepo.findById(response.config.id);
      expect(saved).toBeDefined();
      expect(saved?.providerId).toBe('openai');
    });

    test('should update existing provider configuration', async () => {
      // First create a configuration
      const created = await providerConfigRepo.create({
        providerId: 'anthropic',
        config: {
          apiKey: 'old-key',
          model: 'claude-3-sonnet',
          maxTokens: 2000
        }
      });

      const input = {
        action: 'update' as const,
        configId: created.id,
        config: {
          apiKey: 'new-key',
          model: 'claude-3-opus',
          maxTokens: 4000,
          temperature: 0.5
        },
        metadata: {
          description: 'Updated Anthropic configuration'
        }
      };

      const result = await configureLLMProviderTool.handle(input);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(true);
      expect(response.config.config.apiKey).toBe('new-key');
      expect(response.config.config.model).toBe('claude-3-opus');
      expect(response.config.config.maxTokens).toBe(4000);
      expect(response.config.metadata.description).toBe('Updated Anthropic configuration');

      // Verify update in database
      const updated = await providerConfigRepo.findById(created.id);
      expect(updated?.config.model).toBe('claude-3-opus');
    });

    test('should list provider configurations', async () => {
      // Create multiple configurations
      await providerConfigRepo.create({
        providerId: 'openai',
        config: { model: 'gpt-4' }
      });

      await providerConfigRepo.create({
        providerId: 'anthropic',
        config: { model: 'claude-3-sonnet' }
      });

      const input = {
        action: 'list' as const
      };

      const result = await configureLLMProviderTool.handle(input);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(true);
      expect(response.configs).toHaveLength(2);

      const openaiConfig = response.configs.find((c: any) => c.providerId === 'openai');
      const anthropicConfig = response.configs.find((c: any) => c.providerId === 'anthropic');

      expect(openaiConfig).toBeDefined();
      expect(openaiConfig.config.model).toBe('gpt-4');

      expect(anthropicConfig).toBeDefined();
      expect(anthropicConfig.config.model).toBe('claude-3-sonnet');
    });

    test('should get specific provider configuration', async () => {
      const created = await providerConfigRepo.create({
        providerId: 'test-provider',
        config: { model: 'test-model', apiKey: 'test-key' },
        metadata: { description: 'Test configuration' }
      });

      const input = {
        action: 'get' as const,
        configId: created.id
      };

      const result = await configureLLMProviderTool.handle(input);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(true);
      expect(response.config.id).toBe(created.id);
      expect(response.config.providerId).toBe('test-provider');
      expect(response.config.config.model).toBe('test-model');
    });

    test('should delete provider configuration', async () => {
      const created = await providerConfigRepo.create({
        providerId: 'to-delete',
        config: { model: 'delete-me' }
      });

      const input = {
        action: 'delete' as const,
        configId: created.id
      };

      const result = await configureLLMProviderTool.handle(input);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(true);
      expect(response.deleted).toBe(true);

      // Verify deletion
      const deleted = await providerConfigRepo.findById(created.id);
      expect(deleted).toBeNull();
    });

    test('should handle activation and deactivation', async () => {
      const created = await providerConfigRepo.create({
        providerId: 'activation-test',
        config: { model: 'test' }
      });

      // Test activation
      let input = {
        action: 'activate' as const,
        configId: created.id
      };

      let result = await configureLLMProviderTool.handle(input);
      let response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(true);
      expect(response.activated).toBe(true);

      // Test deactivation
      input = {
        action: 'deactivate' as const,
        configId: created.id
      };

      result = await configureLLMProviderTool.handle(input);
      response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(true);
      expect(response.deactivated).toBe(true);
    });

    test('should handle configuration validation errors', async () => {
      // Test missing provider ID
      let input = {
        action: 'create' as const,
        config: { model: 'test' }
      } as any;

      let result = await configureLLMProviderTool.handle(input);
      let response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Validation error');

      // Test invalid action
      input = {
        action: 'invalid-action' as any,
        providerId: 'test'
      };

      result = await configureLLMProviderTool.handle(input);
      response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Validation error');
    });

    test('should handle non-existent configuration operations', async () => {
      const input = {
        action: 'get' as const,
        configId: 'non-existent-id'
      };

      const result = await configureLLMProviderTool.handle(input);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Configuration not found');
    });
  });

  describe('GetProgressiveDetailTool Integration', () => {
    test('should retrieve progressive detail starting with brief summary', async () => {
      // Create test messages
      const messages = await Promise.all([
        createTestMessage('Hello, can you help me understand machine learning?'),
        createTestMessage('Of course! Machine learning is a branch of AI that enables computers to learn and improve from experience without being explicitly programmed.', 'assistant'),
        createTestMessage('What are the main types of machine learning?'),
        createTestMessage('There are three main types: supervised learning, unsupervised learning, and reinforcement learning.', 'assistant'),
        createTestMessage('Can you explain supervised learning in more detail?'),
        createTestMessage('Supervised learning uses labeled training data to learn a mapping from inputs to outputs. Examples include classification and regression tasks.', 'assistant')
      ]);

      // Create summaries at different levels
      const briefSummary = await summaryRepo.create({
        conversationId: testConversationId,
        level: 'brief',
        summaryText: 'User asked about machine learning types.',
        tokenCount: 8,
        provider: 'openai',
        model: 'gpt-4',
        messageCount: 6
      });

      const standardSummary = await summaryRepo.create({
        conversationId: testConversationId,
        level: 'standard',
        summaryText: 'Discussion about machine learning fundamentals, covering the three main types: supervised, unsupervised, and reinforcement learning.',
        tokenCount: 20,
        provider: 'openai',
        model: 'gpt-4',
        messageCount: 6
      });

      const input = {
        conversationId: testConversationId,
        query: 'machine learning discussion',
        startLevel: 'brief' as const,
        maxTokens: 500
      };

      const result = await getProgressiveDetailTool.handle(input);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(true);
      expect(response.currentLevel).toBe('brief');
      expect(response.content).toBe(briefSummary.summaryText);
      expect(response.tokenCount).toBe(8);
      expect(response.messageCount).toBe(6);
      expect(response.hasMoreDetail).toBe(true);
      expect(response.availableLevels).toContain('standard');
      expect(response.availableLevels).toContain('detailed');
    });

    test('should progress from brief to standard level', async () => {
      // Create summaries
      await summaryRepo.create({
        conversationId: testConversationId,
        level: 'brief',
        summaryText: 'Brief AI discussion.',
        tokenCount: 4,
        provider: 'openai',
        model: 'gpt-4',
        messageCount: 4
      });

      const standardSummary = await summaryRepo.create({
        conversationId: testConversationId,
        level: 'standard',
        summaryText: 'Comprehensive discussion about artificial intelligence, covering basic concepts and applications.',
        tokenCount: 15,
        provider: 'openai',
        model: 'gpt-4',
        messageCount: 4
      });

      const input = {
        conversationId: testConversationId,
        query: 'AI discussion',
        startLevel: 'standard' as const,
        maxTokens: 300
      };

      const result = await getProgressiveDetailTool.handle(input);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(true);
      expect(response.currentLevel).toBe('standard');
      expect(response.content).toBe(standardSummary.summaryText);
      expect(response.tokenCount).toBe(15);
    });

    test('should fallback to messages when no summaries exist', async () => {
      // Create messages but no summaries
      const msg1 = await createTestMessage('What is deep learning?');
      const msg2 = await createTestMessage('Deep learning is a subset of machine learning using neural networks with multiple layers.', 'assistant');

      // Mock context assembler for message fallback
      mockContextAssembler.assemble.mockResolvedValueOnce({
        text: 'Messages: What is deep learning? Deep learning is a subset of machine learning using neural networks.',
        tokenCount: 35,
        tokenBreakdown: {
          query: 5,
          summaries: 0,
          messages: 28,
          metadata: 1,
          buffer: 1
        },
        includedItems: [
          {
            type: 'message',
            id: msg1.id,
            relevanceScore: 0.9,
            tokenCount: 15,
            position: 0
          },
          {
            type: 'message',
            id: msg2.id,
            relevanceScore: 0.85,
            tokenCount: 20,
            position: 1
          }
        ],
        strategy: 'hybrid',
        metrics: {
          processingTimeMs: 100,
          itemsEvaluated: 2,
          itemsIncluded: 2,
          averageRelevance: 0.875,
          tokenEfficiency: 0.7
        }
      });

      const input = {
        conversationId: testConversationId,
        query: 'deep learning',
        startLevel: 'brief' as const,
        maxTokens: 400
      };

      const result = await getProgressiveDetailTool.handle(input);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(true);
      expect(response.currentLevel).toBe('messages');
      expect(response.content).toContain('Messages:');
      expect(response.tokenCount).toBe(35);
      expect(response.hasMoreDetail).toBe(false);
      expect(response.fallbackReason).toBe('No summaries available');

      // Verify context assembler was called for message fallback
      expect(mockContextAssembler.assemble).toHaveBeenCalledWith({
        query: 'deep learning',
        conversationId: testConversationId,
        maxTokens: 400,
        strategy: 'hybrid'
      });
    });

    test('should handle detailed level requests', async () => {
      const detailedSummary = await summaryRepo.create({
        conversationId: testConversationId,
        level: 'detailed',
        summaryText: 'Extensive discussion about artificial intelligence, machine learning algorithms, neural network architectures, training methodologies, and practical applications in various industries including healthcare, finance, and autonomous systems.',
        tokenCount: 35,
        provider: 'openai',
        model: 'gpt-4',
        messageCount: 12
      });

      const input = {
        conversationId: testConversationId,
        query: 'comprehensive AI overview',
        startLevel: 'detailed' as const,
        maxTokens: 1000
      };

      const result = await getProgressiveDetailTool.handle(input);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(true);
      expect(response.currentLevel).toBe('detailed');
      expect(response.content).toBe(detailedSummary.summaryText);
      expect(response.tokenCount).toBe(35);
      expect(response.messageCount).toBe(12);
      expect(response.hasMoreDetail).toBe(false); // Detailed is the highest level
    });

    test('should handle token budget constraints', async () => {
      // Create a long detailed summary
      const longSummary = await summaryRepo.create({
        conversationId: testConversationId,
        level: 'detailed',
        summaryText: Array(200).fill('word').join(' '), // Very long summary
        tokenCount: 200,
        provider: 'openai',
        model: 'gpt-4',
        messageCount: 10
      });

      // Create shorter standard summary
      const shortSummary = await summaryRepo.create({
        conversationId: testConversationId,
        level: 'standard',
        summaryText: 'Short summary that fits budget.',
        tokenCount: 6,
        provider: 'openai',
        model: 'gpt-4',
        messageCount: 10
      });

      const input = {
        conversationId: testConversationId,
        query: 'test query',
        startLevel: 'detailed' as const,
        maxTokens: 50 // Too small for detailed summary
      };

      const result = await getProgressiveDetailTool.handle(input);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(true);
      // Should downgrade to standard level due to token constraints
      expect(response.currentLevel).toBe('standard');
      expect(response.content).toBe(shortSummary.summaryText);
      expect(response.tokenCount).toBe(6);
      expect(response.downgradedReason).toContain('Token budget');
    });

    test('should handle queries with focus areas', async () => {
      await summaryRepo.create({
        conversationId: testConversationId,
        level: 'standard',
        summaryText: 'Discussion about neural networks, deep learning, and computer vision applications.',
        tokenCount: 15,
        provider: 'openai',
        model: 'gpt-4',
        messageCount: 8
      });

      const input = {
        conversationId: testConversationId,
        query: 'neural networks computer vision',
        startLevel: 'standard' as const,
        maxTokens: 400,
        focusAreas: ['neural networks', 'computer vision']
      };

      const result = await getProgressiveDetailTool.handle(input);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(true);
      expect(response.focusAreas).toEqual(['neural networks', 'computer vision']);
    });

    test('should validate input parameters', async () => {
      // Test invalid conversation ID
      let input = {
        conversationId: 'non-existent',
        query: 'test',
        startLevel: 'brief' as const
      };

      let result = await getProgressiveDetailTool.handle(input);
      let response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Conversation not found');

      // Test invalid start level
      input = {
        conversationId: testConversationId,
        query: 'test',
        startLevel: 'invalid' as any
      };

      result = await getProgressiveDetailTool.handle(input);
      response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Validation error');

      // Test missing query
      input = {
        conversationId: testConversationId,
        startLevel: 'brief' as const
      } as any;

      result = await getProgressiveDetailTool.handle(input);
      response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Validation error');
    });

    test('should handle empty conversation gracefully', async () => {
      // Test with conversation that has no messages or summaries
      const emptyConversation = await conversationRepo.create({
        title: 'Empty Conversation'
      });

      const input = {
        conversationId: emptyConversation.id,
        query: 'test query',
        startLevel: 'brief' as const
      };

      const result = await getProgressiveDetailTool.handle(input);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('No content available');
    });

    test('should handle context assembler failures during message fallback', async () => {
      // Create messages but no summaries
      await createTestMessage('Test message');

      // Mock context assembler to fail
      mockContextAssembler.assemble.mockRejectedValueOnce(new Error('Context assembly failed'));

      const input = {
        conversationId: testConversationId,
        query: 'test query',
        startLevel: 'brief' as const
      };

      const result = await getProgressiveDetailTool.handle(input);
      const response = JSON.parse(result.content[0].text);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Context assembly failed');
    });
  });

  describe('Cross-Tool Integration', () => {
    test('should work together for complete workflow', async () => {
      // 1. Configure LLM provider
      const providerInput = {
        action: 'create' as const,
        providerId: 'workflow-test',
        config: {
          model: 'test-model',
          maxTokens: 2000
        }
      };

      const providerResult = await configureLLMProviderTool.handle(providerInput);
      const providerResponse = JSON.parse(providerResult.content[0].text);
      expect(providerResponse.success).toBe(true);

      // 2. Create test data for context
      await createTestMessage('How does machine learning work in practice?');
      await createTestMessage('Machine learning works by training algorithms on data to recognize patterns and make predictions.', 'assistant');

      await summaryRepo.create({
        conversationId: testConversationId,
        level: 'standard',
        summaryText: 'Discussion about practical machine learning applications and methodology.',
        tokenCount: 12,
        provider: 'workflow-test',
        model: 'test-model',
        messageCount: 2
      });

      // 3. Get relevant snippets
      const snippetsInput = {
        query: 'machine learning practical applications',
        maxTokens: 600,
        conversationId: testConversationId
      };

      const snippetsResult = await getRelevantSnippetsTool.handle(snippetsInput);
      const snippetsResponse = JSON.parse(snippetsResult.content[0].text);
      expect(snippetsResponse.success).toBe(true);

      // 4. Get progressive detail
      const detailInput = {
        conversationId: testConversationId,
        query: 'machine learning applications',
        startLevel: 'brief' as const,
        maxTokens: 400
      };

      const detailResult = await getProgressiveDetailTool.handle(detailInput);
      const detailResponse = JSON.parse(detailResult.content[0].text);
      expect(detailResponse.success).toBe(true);

      // Verify all tools completed successfully
      expect(providerResponse.config.providerId).toBe('workflow-test');
      expect(snippetsResponse.contextText).toBeDefined();
      expect(detailResponse.content).toBeDefined();
    });

    test('should handle concurrent tool operations', async () => {
      // Setup test data
      await createTestMessage('Concurrent test message');
      await summaryRepo.create({
        conversationId: testConversationId,
        level: 'brief',
        summaryText: 'Concurrent test summary.',
        tokenCount: 4,
        provider: 'test',
        model: 'test',
        messageCount: 1
      });

      // Create concurrent operations
      const operations = [
        getRelevantSnippetsTool.handle({
          query: 'concurrent test',
          maxTokens: 300,
          conversationId: testConversationId
        }),
        configureLLMProviderTool.handle({
          action: 'create',
          providerId: 'concurrent-1',
          config: { model: 'test' }
        }),
        getProgressiveDetailTool.handle({
          conversationId: testConversationId,
          query: 'concurrent',
          startLevel: 'brief'
        }),
        configureLLMProviderTool.handle({
          action: 'create',
          providerId: 'concurrent-2',
          config: { model: 'test' }
        })
      ];

      const results = await Promise.all(operations);
      
      // All operations should complete successfully
      for (const result of results) {
        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
      }

      // Verify no data corruption
      const configs = await providerConfigRepo.findByProviderId('concurrent-1');
      expect(configs).toHaveLength(1);

      const configs2 = await providerConfigRepo.findByProviderId('concurrent-2');
      expect(configs2).toHaveLength(1);
    });
  });
});