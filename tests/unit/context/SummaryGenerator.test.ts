/**
 * SummaryGenerator Unit Tests
 * 
 * Tests for the hierarchical conversation summarization service
 */

import { SummaryGenerator, SummaryGeneratorConfig } from '../../../src/context/SummaryGenerator.js';
import { Message } from '../../../src/types/interfaces.js';

// Mock implementations
class MockProviderManager {
  async generateSummary(_request: any, _strategy?: any) {
    return {
      summary: 'This is a test summary of the conversation.',
      tokenCount: 10,
      inputTokens: 100,
      outputTokens: 10,
      cost: 0.001,
      qualityScore: 0.85,
      processingTime: 150
    };
  }
}

class MockSummaryRepository {
  private summaries: any[] = [];

  async create(params: any) {
    const summary = { ...params, id: params.id || 'test-summary-id' };
    this.summaries.push(summary);
    return summary;
  }

  async findByConversation(conversationId: string, level?: string) {
    return {
      data: this.summaries.filter(s => 
        s.conversationId === conversationId && 
        (!level || s.level === level)
      ),
      hasMore: false
    };
  }

  async invalidateForConversation(conversationId: string) {
    this.summaries = this.summaries.filter(s => s.conversationId !== conversationId);
    return this.summaries.length;
  }
}

class MockSummaryHistoryRepository {
  private histories: any[] = [];

  async recordStart(data: any) {
    const history = { 
      id: `history_${Date.now()}`,
      ...data, 
      startedAt: Date.now(),
      status: 'pending'
    };
    this.histories.push(history);
    return history;
  }

  async recordComplete(id: string, result: any) {
    const history = this.histories.find(h => h.id === id);
    if (history) {
      Object.assign(history, result, { 
        completedAt: Date.now(),
        status: 'completed'
      });
    }
    return history;
  }

  async recordFailure(id: string, error: string) {
    const history = this.histories.find(h => h.id === id);
    if (history) {
      Object.assign(history, { 
        completedAt: Date.now(),
        status: 'failed',
        errorMessage: error
      });
    }
    return history;
  }
}

class MockCacheRepository {
  private cache: Map<string, any> = new Map();

  async get(key: string) {
    return this.cache.get(key) || null;
  }

  async set(key: string, data: any, _ttl?: number) {
    this.cache.set(key, {
      id: `cache_${Date.now()}`,
      cacheKey: key,
      summaryIds: data.summaryIds.join(','),
      assembledContext: data.assembledContext,
      tokenCount: data.tokenCount,
      createdAt: Date.now(),
      accessedAt: Date.now(),
      accessCount: 1
    });
  }

  async delete(key: string) {
    return this.cache.delete(key);
  }
}

class MockTokenCounter {
  async countTokens(text: string) {
    return {
      count: Math.ceil(text.length / 4), // Rough estimation
      model: 'test-model'
    };
  }
}

describe('SummaryGenerator', () => {
  let summaryGenerator: SummaryGenerator;
  let mockProviderManager: MockProviderManager;
  let mockSummaryRepository: MockSummaryRepository;
  let mockHistoryRepository: MockSummaryHistoryRepository;
  let mockCacheRepository: MockCacheRepository;
  let mockTokenCounter: MockTokenCounter;

  const testMessages: Message[] = [
    {
      id: 'msg1',
      conversationId: 'conv1',
      role: 'user',
      content: 'Hello, I need help with implementing a new feature in our application.',
      createdAt: Date.now() - 60000, // 1 minute ago
      metadata: {}
    },
    {
      id: 'msg2',
      conversationId: 'conv1',
      role: 'assistant',
      content: 'I\'d be happy to help! Can you tell me more about the feature you want to implement?',
      createdAt: Date.now() - 30000, // 30 seconds ago
      metadata: {}
    },
    {
      id: 'msg3',
      conversationId: 'conv1',
      role: 'user',
      content: 'I want to add a user authentication system with JWT tokens and role-based access control.',
      createdAt: Date.now(),
      metadata: {}
    }
  ];

  beforeEach(() => {
    mockProviderManager = new MockProviderManager();
    mockSummaryRepository = new MockSummaryRepository();
    mockHistoryRepository = new MockSummaryHistoryRepository();
    mockCacheRepository = new MockCacheRepository();
    mockTokenCounter = new MockTokenCounter();

    const config: Partial<SummaryGeneratorConfig> = {
      defaultLevel: 'standard',
      enableValidation: false, // Disable for simpler testing
      enableCaching: true,
      temporalCompression: {
        recentThresholdHours: 24,
        mediumThresholdDays: 7,
        forceOldBrief: true
      }
    };

    summaryGenerator = new SummaryGenerator(
      mockProviderManager as any,
      mockSummaryRepository as any,
      mockHistoryRepository as any,
      mockCacheRepository as any,
      mockTokenCounter as any,
      config
    );
  });

  describe('generateSummary', () => {
    it('should generate a summary successfully', async () => {
      const request = {
        messages: testMessages,
        conversationId: 'conv1'
      };

      const result = await summaryGenerator.generateSummary(request);

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.summaryText).toBe('This is a test summary of the conversation.');
      expect(result.summary.conversationId).toBe('conv1');
      expect(result.metadata.fromCache).toBe(false);
    });

    it('should determine correct temporal level for recent conversations', async () => {
      const request = {
        messages: testMessages,
        conversationId: 'conv1'
      };

      const result = await summaryGenerator.generateSummary(request);

      // Recent conversation should get detailed summary
      expect(result.summary.level).toBe('detailed');
    });

    it('should determine correct temporal level for old conversations', async () => {
      const oldMessages: Message[] = testMessages.map(msg => ({
        ...msg,
        createdAt: Date.now() - (10 * 24 * 60 * 60 * 1000) // 10 days ago
      }));

      const request = {
        messages: oldMessages,
        conversationId: 'conv1'
      };

      const result = await summaryGenerator.generateSummary(request);

      // Old conversation should get brief summary
      expect(result.summary.level).toBe('brief');
    });

    it('should respect explicitly requested level', async () => {
      const request = {
        messages: testMessages,
        conversationId: 'conv1',
        level: 'standard' as const
      };

      const result = await summaryGenerator.generateSummary(request);

      expect(result.summary.level).toBe('standard');
    });

    it('should use cached summary when available', async () => {
      const request = {
        messages: testMessages,
        conversationId: 'conv1'
      };

      // Generate first summary
      await summaryGenerator.generateSummary(request);

      // Second call should use cache
      const result2 = await summaryGenerator.generateSummary(request);

      expect(result2.metadata.fromCache).toBe(true);
    });

    it('should bypass cache when forceRegenerate is true', async () => {
      const request = {
        messages: testMessages,
        conversationId: 'conv1'
      };

      // Generate first summary
      await summaryGenerator.generateSummary(request);

      // Second call with forceRegenerate should bypass cache
      const result2 = await summaryGenerator.generateSummary({
        ...request,
        forceRegenerate: true
      });

      expect(result2.metadata.fromCache).toBe(false);
    });
  });

  describe('generateBatch', () => {
    it('should generate multiple summaries in batch', async () => {
      const requests = [
        { messages: testMessages, conversationId: 'conv1' },
        { messages: testMessages, conversationId: 'conv2' },
        { messages: testMessages, conversationId: 'conv3' }
      ];

      const result = await summaryGenerator.generateBatch({ requests });

      expect(result.successes).toHaveLength(3);
      expect(result.failures).toHaveLength(0);
      expect(result.metadata.successRate).toBe(1);
    });

    it('should handle partial failures in batch', async () => {
      // Mock a failure for one request
      const originalGenerateSummary = summaryGenerator.generateSummary;
      summaryGenerator.generateSummary = jest.fn()
        .mockResolvedValueOnce({ summary: { id: '1' }, metadata: {} })
        .mockRejectedValueOnce(new Error('Generation failed'))
        .mockResolvedValueOnce({ summary: { id: '3' }, metadata: {} });

      const requests = [
        { messages: testMessages, conversationId: 'conv1' },
        { messages: testMessages, conversationId: 'conv2' },
        { messages: testMessages, conversationId: 'conv3' }
      ];

      const result = await summaryGenerator.generateBatch({ requests });

      expect(result.successes).toHaveLength(2);
      expect(result.failures).toHaveLength(1);
      expect(result.metadata.successRate).toBeCloseTo(0.667, 2);

      // Restore original method
      summaryGenerator.generateSummary = originalGenerateSummary;
    });
  });

  describe('conversation management', () => {
    it('should retrieve conversation summaries', async () => {
      // Generate some summaries first
      await summaryGenerator.generateSummary({
        messages: testMessages,
        conversationId: 'conv1',
        level: 'brief'
      });

      await summaryGenerator.generateSummary({
        messages: testMessages,
        conversationId: 'conv1',
        level: 'standard'
      });

      const summaries = await summaryGenerator.getConversationSummaries('conv1');
      
      expect(summaries).toHaveLength(2);
    });

    it('should filter summaries by level', async () => {
      // Generate summaries of different levels
      await summaryGenerator.generateSummary({
        messages: testMessages,
        conversationId: 'conv1',
        level: 'brief'
      });

      await summaryGenerator.generateSummary({
        messages: testMessages,
        conversationId: 'conv1',
        level: 'standard'
      });

      const briefSummaries = await summaryGenerator.getConversationSummaries('conv1', 'brief');
      
      expect(briefSummaries).toHaveLength(1);
      expect(briefSummaries[0].level).toBe('brief');
    });

    it('should invalidate conversation summaries', async () => {
      // Generate a summary
      await summaryGenerator.generateSummary({
        messages: testMessages,
        conversationId: 'conv1'
      });

      // Verify it exists
      let summaries = await summaryGenerator.getConversationSummaries('conv1');
      expect(summaries).toHaveLength(1);

      // Invalidate
      await summaryGenerator.invalidateConversationSummaries('conv1');

      // Verify it's gone
      summaries = await summaryGenerator.getConversationSummaries('conv1');
      expect(summaries).toHaveLength(0);
    });
  });

  describe('temporal compression', () => {
    it('should apply correct compression for different age categories', async () => {
      const now = Date.now();
      
      // Test recent conversation (< 24 hours)
      const recentMessages = testMessages.map(msg => ({
        ...msg,
        createdAt: now - (12 * 60 * 60 * 1000) // 12 hours ago
      }));

      const recentResult = await summaryGenerator.generateSummary({
        messages: recentMessages,
        conversationId: 'conv-recent'
      });

      expect(recentResult.summary.level).toBe('detailed');

      // Test medium age conversation (1-7 days)
      const mediumMessages = testMessages.map(msg => ({
        ...msg,
        createdAt: now - (3 * 24 * 60 * 60 * 1000) // 3 days ago
      }));

      const mediumResult = await summaryGenerator.generateSummary({
        messages: mediumMessages,
        conversationId: 'conv-medium'
      });

      expect(mediumResult.summary.level).toBe('standard');

      // Test old conversation (> 7 days)
      const oldMessages = testMessages.map(msg => ({
        ...msg,
        createdAt: now - (10 * 24 * 60 * 60 * 1000) // 10 days ago
      }));

      const oldResult = await summaryGenerator.generateSummary({
        messages: oldMessages,
        conversationId: 'conv-old'
      });

      expect(oldResult.summary.level).toBe('brief');
    });
  });

  describe('error handling', () => {
    it('should handle provider failures gracefully', async () => {
      // Mock provider failure
      mockProviderManager.generateSummary = jest.fn()
        .mockRejectedValue(new Error('Provider failed'));

      const request = {
        messages: testMessages,
        conversationId: 'conv1'
      };

      await expect(summaryGenerator.generateSummary(request))
        .rejects.toThrow('Provider failed');
    });

    it('should handle empty message arrays', async () => {
      const request = {
        messages: [],
        conversationId: 'conv1'
      };

      const result = await summaryGenerator.generateSummary(request);

      // Should still generate a summary, even with empty messages
      expect(result).toBeDefined();
      expect(result.summary.messageCount).toBe(0);
    });
  });
});