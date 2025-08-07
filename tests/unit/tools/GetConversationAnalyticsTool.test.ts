/**
 * Unit tests for GetConversationAnalyticsTool
 */

import { GetConversationAnalyticsTool } from '../../../src/tools/GetConversationAnalyticsTool.js';
import { DatabaseManager } from '../../../src/storage/DatabaseManager.js';
import { ConversationRepository } from '../../../src/storage/repositories/ConversationRepository.js';
import { MessageRepository } from '../../../src/storage/repositories/MessageRepository.js';
import { ConversationFlowAnalyzer } from '../../../src/analytics/analyzers/ConversationFlowAnalyzer.js';
import { ProductivityAnalyzer } from '../../../src/analytics/analyzers/ProductivityAnalyzer.js';
import { KnowledgeGapDetector } from '../../../src/analytics/analyzers/KnowledgeGapDetector.js';
import { DecisionTracker } from '../../../src/analytics/analyzers/DecisionTracker.js';

// Mock all dependencies
jest.mock('../../../src/storage/DatabaseManager.js');
jest.mock('../../../src/storage/repositories/ConversationRepository.js');
jest.mock('../../../src/storage/repositories/MessageRepository.js');
jest.mock('../../../src/analytics/analyzers/ConversationFlowAnalyzer.js');
jest.mock('../../../src/analytics/analyzers/ProductivityAnalyzer.js');
jest.mock('../../../src/analytics/analyzers/KnowledgeGapDetector.js');
jest.mock('../../../src/analytics/analyzers/DecisionTracker.js');

describe('GetConversationAnalyticsTool', () => {
  let tool: GetConversationAnalyticsTool;
  let mockDatabaseManager: jest.Mocked<DatabaseManager>;
  let mockConversationRepo: jest.Mocked<ConversationRepository>;
  let mockMessageRepo: jest.Mocked<MessageRepository>;
  let mockFlowAnalyzer: jest.Mocked<ConversationFlowAnalyzer>;
  let mockProductivityAnalyzer: jest.Mocked<ProductivityAnalyzer>;
  let mockKnowledgeGapDetector: jest.Mocked<KnowledgeGapDetector>;
  let mockDecisionTracker: jest.Mocked<DecisionTracker>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockDatabaseManager = new DatabaseManager('./test.db') as jest.Mocked<DatabaseManager>;
    mockConversationRepo = new ConversationRepository(mockDatabaseManager) as jest.Mocked<ConversationRepository>;
    mockMessageRepo = new MessageRepository(mockDatabaseManager) as jest.Mocked<MessageRepository>;
    mockFlowAnalyzer = new ConversationFlowAnalyzer() as jest.Mocked<ConversationFlowAnalyzer>;
    mockProductivityAnalyzer = new ProductivityAnalyzer() as jest.Mocked<ProductivityAnalyzer>;
    mockKnowledgeGapDetector = new KnowledgeGapDetector() as jest.Mocked<KnowledgeGapDetector>;
    mockDecisionTracker = new DecisionTracker() as jest.Mocked<DecisionTracker>;

    // Initialize tool
    tool = new GetConversationAnalyticsTool(mockDatabaseManager);
  });

  describe('execute', () => {
    it('should analyze a conversation and return comprehensive metrics', async () => {
      // Mock conversation data
      const mockConversation = {
        id: 'conv-123',
        title: 'Test Conversation',
        created_at: Date.now() - 3600000,
        updated_at: Date.now(),
        metadata: {}
      };

      const mockMessages = [
        {
          id: 'msg-1',
          conversation_id: 'conv-123',
          role: 'user',
          content: 'What is TypeScript?',
          created_at: Date.now() - 3000000
        },
        {
          id: 'msg-2',
          conversation_id: 'conv-123',
          role: 'assistant',
          content: 'TypeScript is a typed superset of JavaScript...',
          created_at: Date.now() - 2900000
        }
      ];

      // Setup mocks
      mockConversationRepo.findById = jest.fn().mockResolvedValue(mockConversation);
      mockMessageRepo.findByConversationId = jest.fn().mockResolvedValue(mockMessages);

      mockFlowAnalyzer.analyzeFlow = jest.fn().mockReturnValue({
        averageResponseTime: 100000,
        questionDiversity: 0.8,
        topicProgression: 0.7,
        circularityScore: 0.1,
        depthScore: 0.6,
        clarificationRate: 0.2,
        topicTransitions: 2,
        engagementLevel: 0.75
      });

      mockProductivityAnalyzer.analyzeProductivity = jest.fn().mockReturnValue({
        score: 75,
        focusLevel: 0.8,
        completionRate: 0.9,
        iterationCount: 1,
        resolutionTime: 3000000,
        effectiveQuestionRate: 0.85,
        insightDensity: 0.4,
        actionableOutputs: 2
      });

      mockKnowledgeGapDetector.detectGaps = jest.fn().mockReturnValue([
        {
          content: 'TypeScript generics',
          frequency: 1,
          context: ['TypeScript discussion'],
          confidence: 0.7,
          last_occurrence: Date.now() - 2800000
        }
      ]);

      mockDecisionTracker.trackDecisions = jest.fn().mockReturnValue([
        {
          decision: 'Learn TypeScript',
          type: 'technical',
          confidence: 0.8,
          alternatives: ['Learn JavaScript first', 'Skip to frameworks'],
          factors: ['Career growth', 'Project requirements'],
          timestamp: Date.now() - 2700000
        }
      ]);

      // Execute tool
      const result = await tool.execute({
        conversationId: 'conv-123',
        includeRecommendations: true
      });

      // Verify result structure
      expect(result).toHaveProperty('conversationId', 'conv-123');
      expect(result).toHaveProperty('title', 'Test Conversation');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('messageCount', 2);
      expect(result).toHaveProperty('flowMetrics');
      expect(result).toHaveProperty('productivityMetrics');
      expect(result).toHaveProperty('knowledgeGaps');
      expect(result).toHaveProperty('decisions');
      expect(result).toHaveProperty('recommendations');

      // Verify flow metrics
      expect(result.flowMetrics).toMatchObject({
        averageResponseTime: 100000,
        questionDiversity: 0.8,
        topicProgression: 0.7,
        circularityScore: 0.1
      });

      // Verify productivity metrics
      expect(result.productivityMetrics).toMatchObject({
        score: 75,
        focusLevel: 0.8,
        completionRate: 0.9
      });

      // Verify recommendations were generated
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle conversation not found error', async () => {
      mockConversationRepo.findById = jest.fn().mockResolvedValue(null);

      await expect(tool.execute({ conversationId: 'non-existent' }))
        .rejects.toThrow('Conversation not found: non-existent');
    });

    it('should handle empty conversation (no messages)', async () => {
      const mockConversation = {
        id: 'conv-empty',
        title: 'Empty Conversation',
        created_at: Date.now(),
        updated_at: Date.now(),
        metadata: {}
      };

      mockConversationRepo.findById = jest.fn().mockResolvedValue(mockConversation);
      mockMessageRepo.findByConversationId = jest.fn().mockResolvedValue([]);

      const result = await tool.execute({ conversationId: 'conv-empty' });

      expect(result.messageCount).toBe(0);
      expect(result.flowMetrics).toEqual({});
      expect(result.productivityMetrics).toEqual({});
      expect(result.knowledgeGaps).toEqual([]);
      expect(result.decisions).toEqual([]);
    });

    it('should respect includeRecommendations parameter', async () => {
      const mockConversation = {
        id: 'conv-123',
        title: 'Test',
        created_at: Date.now(),
        updated_at: Date.now(),
        metadata: {}
      };

      mockConversationRepo.findById = jest.fn().mockResolvedValue(mockConversation);
      mockMessageRepo.findByConversationId = jest.fn().mockResolvedValue([]);

      // Test with includeRecommendations = false
      const resultWithout = await tool.execute({
        conversationId: 'conv-123',
        includeRecommendations: false
      });
      expect(resultWithout.recommendations).toBeUndefined();

      // Test with includeRecommendations = true
      const resultWith = await tool.execute({
        conversationId: 'conv-123',
        includeRecommendations: true
      });
      expect(resultWith.recommendations).toBeDefined();
    });

    it('should handle analyzer errors gracefully', async () => {
      const mockConversation = {
        id: 'conv-123',
        title: 'Test',
        created_at: Date.now(),
        updated_at: Date.now(),
        metadata: {}
      };

      const mockMessages = [{
        id: 'msg-1',
        conversation_id: 'conv-123',
        role: 'user',
        content: 'Test',
        created_at: Date.now()
      }];

      mockConversationRepo.findById = jest.fn().mockResolvedValue(mockConversation);
      mockMessageRepo.findByConversationId = jest.fn().mockResolvedValue(mockMessages);

      // Make one analyzer throw an error
      mockFlowAnalyzer.analyzeFlow = jest.fn().mockImplementation(() => {
        throw new Error('Flow analysis failed');
      });

      // Others return normal data
      mockProductivityAnalyzer.analyzeProductivity = jest.fn().mockReturnValue({
        score: 50,
        focusLevel: 0.5
      });

      const result = await tool.execute({ conversationId: 'conv-123' });

      // Should still return results from working analyzers
      expect(result.flowMetrics).toEqual({});
      expect(result.productivityMetrics.score).toBe(50);
    });
  });

  describe('input validation', () => {
    it('should validate required conversationId', async () => {
      await expect(tool.execute({} as any))
        .rejects.toThrow();
    });

    it('should validate conversationId format', async () => {
      await expect(tool.execute({ conversationId: '' }))
        .rejects.toThrow();
    });
  });
});