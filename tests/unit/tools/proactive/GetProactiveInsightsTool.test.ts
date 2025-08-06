/**
 * Unit tests for GetProactiveInsightsTool
 * 
 * Tests the get_proactive_insights MCP tool implementation
 * with focus on input validation, service integration, and response formatting.
 */

import { DatabaseManager } from '../../../../src/storage/Database.js';
import { GetProactiveInsightsTool } from '../../../../src/tools/proactive/GetProactiveInsightsTool.js';
import { PatternDetectionService } from '../../../../src/services/proactive/patterns/PatternDetectionService.js';
import { createTestDatabase, setupMockTime, restoreTime } from '../../../utils/test-helpers.js';

// Mock the PatternDetectionService
jest.mock('../../../../src/services/proactive/patterns/PatternDetectionService.js');

describe('GetProactiveInsightsTool', () => {
  let dbManager: DatabaseManager;
  let tool: GetProactiveInsightsTool;
  let mockPatternService: jest.Mocked<PatternDetectionService>;

  beforeEach(async () => {
    dbManager = await createTestDatabase();
    tool = new GetProactiveInsightsTool({ databaseManager: dbManager });
    
    // Get the mocked service instance
    mockPatternService = (tool as any).patternService as jest.Mocked<PatternDetectionService>;
    
    setupMockTime();
  });

  afterEach(async () => {
    restoreTime();
    await dbManager.close();
    jest.clearAllMocks();
  });

  describe('Tool Definition', () => {
    it('should have correct tool definition', () => {
      expect(tool.definition.name).toBe('get_proactive_insights');
      expect(tool.definition.description).toContain('proactive assistance');
      expect(tool.definition.inputSchema).toBeDefined();
      expect(tool.definition.inputSchema.properties).toBeDefined();
    });

    it('should have required input schema properties', () => {
      const schema = tool.definition.inputSchema;
      
      expect(schema.properties.conversationId).toBeDefined();
      expect(schema.properties.includeTypes).toBeDefined();
      expect(schema.properties.daysSince).toBeDefined();
      expect(schema.properties.minConfidence).toBeDefined();
      expect(schema.properties.limit).toBeDefined();
    });

    it('should have correct enum values for includeTypes', () => {
      const includeTypesProperty = tool.definition.inputSchema.properties.includeTypes;
      
      expect(includeTypesProperty.items.enum).toContain('unresolved_actions');
      expect(includeTypesProperty.items.enum).toContain('recurring_questions');
      expect(includeTypesProperty.items.enum).toContain('knowledge_gaps');
      expect(includeTypesProperty.items.enum).toContain('stale_commitments');
    });
  });

  describe('Input Validation', () => {
    it('should validate valid input', async () => {
      const validInput = {
        conversationId: 'test-conv-123',
        includeTypes: ['unresolved_actions', 'recurring_questions'] as const,
        daysSince: 30,
        minConfidence: 0.7,
        limit: 10
      };

      // Mock service responses
      mockPatternService.detectUnresolvedActions.mockResolvedValue([]);
      mockPatternService.findRecurringQuestions.mockResolvedValue([]);

      const result = await tool.handle(validInput);

      expect(result.isError).toBe(false);
      expect(mockPatternService.detectUnresolvedActions).toHaveBeenCalledWith({
        conversationId: 'test-conv-123',
        daysSince: 30,
        minConfidence: 0.7,
        limit: 10
      });
    });

    it('should apply default values for optional parameters', async () => {
      const minimalInput = {
        includeTypes: ['unresolved_actions'] as const
      };

      mockPatternService.detectUnresolvedActions.mockResolvedValue([]);

      const result = await tool.handle(minimalInput);

      expect(result.isError).toBe(false);
      expect(mockPatternService.detectUnresolvedActions).toHaveBeenCalledWith({
        conversationId: undefined,
        daysSince: 30, // default
        minConfidence: 0.6, // default
        limit: 20 // default
      });
    });

    it('should reject invalid daysSince values', async () => {
      const invalidInput = {
        includeTypes: ['unresolved_actions'] as const,
        daysSince: -1
      };

      const result = await tool.handle(invalidInput);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error');
    });

    it('should reject invalid minConfidence values', async () => {
      const invalidInputs = [
        { includeTypes: ['unresolved_actions'] as const, minConfidence: -0.1 },
        { includeTypes: ['unresolved_actions'] as const, minConfidence: 1.1 }
      ];

      for (const input of invalidInputs) {
        const result = await tool.handle(input);
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation error');
      }
    });

    it('should reject invalid limit values', async () => {
      const invalidInput = {
        includeTypes: ['unresolved_actions'] as const,
        limit: 0
      };

      const result = await tool.handle(invalidInput);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error');
    });

    it('should reject invalid includeTypes', async () => {
      const invalidInput = {
        includeTypes: ['invalid_type'] as any
      };

      const result = await tool.handle(invalidInput);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error');
    });
  });

  describe('Service Integration', () => {
    it('should call detectUnresolvedActions when requested', async () => {
      const input = {
        includeTypes: ['unresolved_actions'] as const,
        conversationId: 'test-conv',
        daysSince: 14,
        minConfidence: 0.8,
        limit: 5
      };

      const mockActions = [
        {
          id: 'action-1',
          commitmentText: 'I\'ll check the logs',
          confidence: 0.9,
          daysSinceCommitment: 5,
          hasFollowUp: false,
          conversationId: 'test-conv'
        }
      ];

      mockPatternService.detectUnresolvedActions.mockResolvedValue(mockActions);

      const result = await tool.handle(input);

      expect(result.isError).toBe(false);
      expect(mockPatternService.detectUnresolvedActions).toHaveBeenCalledWith({
        conversationId: 'test-conv',
        daysSince: 14,
        minConfidence: 0.8,
        limit: 5
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.insights.unresolvedActions).toEqual(mockActions);
    });

    it('should call findRecurringQuestions when requested', async () => {
      const input = {
        includeTypes: ['recurring_questions'] as const,
        limit: 3
      };

      const mockQuestions = [
        {
          id: 'question-1',
          questionText: 'how to configure database',
          frequency: 3,
          daysBetweenOccurrences: 7
        }
      ];

      mockPatternService.findRecurringQuestions.mockResolvedValue(mockQuestions);

      const result = await tool.handle(input);

      expect(result.isError).toBe(false);
      expect(mockPatternService.findRecurringQuestions).toHaveBeenCalledWith({
        conversationId: undefined,
        minFrequency: 2,
        minDaysBetween: 1,
        limit: 3
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.insights.recurringQuestions).toEqual(mockQuestions);
    });

    it('should call identifyKnowledgeGaps when requested', async () => {
      const input = {
        includeTypes: ['knowledge_gaps'] as const
      };

      const mockGaps = [
        {
          id: 'gap-1',
          topic: 'react performance',
          gapRatio: 2.5,
          questionCount: 5,
          answerCount: 2
        }
      ];

      mockPatternService.identifyKnowledgeGaps.mockResolvedValue(mockGaps);

      const result = await tool.handle(input);

      expect(result.isError).toBe(false);
      expect(mockPatternService.identifyKnowledgeGaps).toHaveBeenCalledWith({
        conversationId: undefined,
        minGapRatio: 1.5,
        limit: 20
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.insights.knowledgeGaps).toEqual(mockGaps);
    });

    it('should call trackCommitments and filter stale ones when requested', async () => {
      const input = {
        includeTypes: ['stale_commitments'] as const,
        daysSince: 7
      };

      const mockCommitments = [
        {
          id: 'commit-1',
          status: 'pending' as const,
          daysSinceCommitment: 10,
          commitmentText: 'I\'ll review the code'
        },
        {
          id: 'commit-2',
          status: 'resolved' as const,
          daysSinceCommitment: 5,
          commitmentText: 'I\'ll update the docs'
        },
        {
          id: 'commit-3',
          status: 'overdue' as const,
          daysSinceCommitment: 8,
          commitmentText: 'I\'ll test the feature'
        }
      ];

      mockPatternService.trackCommitments.mockResolvedValue(mockCommitments);

      const result = await tool.handle(input);

      expect(result.isError).toBe(false);
      expect(mockPatternService.trackCommitments).toHaveBeenCalledWith({
        conversationId: undefined,
        includeResolved: false,
        limit: 40 // doubled for filtering
      });

      const response = JSON.parse(result.content[0].text);
      
      // Should only include pending/overdue commitments that are >= 7 days old
      expect(response.insights.staleCommitments).toHaveLength(2);
      expect(response.insights.staleCommitments[0].id).toBe('commit-1');
      expect(response.insights.staleCommitments[1].id).toBe('commit-3');
    });

    it('should handle multiple insight types simultaneously', async () => {
      const input = {
        includeTypes: ['unresolved_actions', 'recurring_questions'] as const
      };

      mockPatternService.detectUnresolvedActions.mockResolvedValue([{ id: 'action-1' }] as any);
      mockPatternService.findRecurringQuestions.mockResolvedValue([{ id: 'question-1' }] as any);

      const result = await tool.handle(input);

      expect(result.isError).toBe(false);
      expect(mockPatternService.detectUnresolvedActions).toHaveBeenCalled();
      expect(mockPatternService.findRecurringQuestions).toHaveBeenCalled();

      const response = JSON.parse(result.content[0].text);
      expect(response.insights.unresolvedActions).toBeDefined();
      expect(response.insights.recurringQuestions).toBeDefined();
      expect(response.summary.totalInsights).toBe(2);
    });
  });

  describe('Response Format', () => {
    it('should return proper response structure', async () => {
      const input = {
        includeTypes: ['unresolved_actions'] as const,
        conversationId: 'test-conv',
        daysSince: 30,
        minConfidence: 0.6
      };

      mockPatternService.detectUnresolvedActions.mockResolvedValue([]);

      const result = await tool.handle(input);

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      
      expect(response).toHaveProperty('insights');
      expect(response).toHaveProperty('summary');
      expect(response.summary).toHaveProperty('totalInsights');
      expect(response.summary).toHaveProperty('analysisScope');
      expect(response.summary).toHaveProperty('detectionTimestamp');
      
      expect(response.summary.analysisScope.conversationId).toBe('test-conv');
      expect(response.summary.analysisScope.daysSince).toBe(30);
      expect(response.summary.analysisScope.minConfidence).toBe(0.6);
    });

    it('should calculate total insights correctly', async () => {
      const input = {
        includeTypes: ['unresolved_actions', 'recurring_questions', 'knowledge_gaps'] as const
      };

      mockPatternService.detectUnresolvedActions.mockResolvedValue([{}, {}] as any);
      mockPatternService.findRecurringQuestions.mockResolvedValue([{}] as any);
      mockPatternService.identifyKnowledgeGaps.mockResolvedValue([{}, {}, {}] as any);

      const result = await tool.handle(input);

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.summary.totalInsights).toBe(6); // 2 + 1 + 3
    });

    it('should include detection timestamp', async () => {
      const input = {
        includeTypes: ['unresolved_actions'] as const
      };

      const beforeTime = Date.now();
      mockPatternService.detectUnresolvedActions.mockResolvedValue([]);

      const result = await tool.handle(input);

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      const afterTime = Date.now();
      
      expect(response.summary.detectionTimestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(response.summary.detectionTimestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should exclude requested insight types from response', async () => {
      const input = {
        includeTypes: ['unresolved_actions'] as const
      };

      mockPatternService.detectUnresolvedActions.mockResolvedValue([]);

      const result = await tool.handle(input);

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.insights.unresolvedActions).toBeDefined();
      expect(response.insights.recurringQuestions).toBeUndefined();
      expect(response.insights.knowledgeGaps).toBeUndefined();
      expect(response.insights.staleCommitments).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle pattern service errors', async () => {
      const input = {
        includeTypes: ['unresolved_actions'] as const
      };

      mockPatternService.detectUnresolvedActions.mockRejectedValue(new Error('Database connection failed'));

      const result = await tool.handle(input);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to detect unresolved actions');
    });

    it('should handle partial service failures gracefully', async () => {
      const input = {
        includeTypes: ['unresolved_actions', 'recurring_questions'] as const
      };

      mockPatternService.detectUnresolvedActions.mockResolvedValue([]);
      mockPatternService.findRecurringQuestions.mockRejectedValue(new Error('Service error'));

      const result = await tool.handle(input);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to find recurring questions');
    });

    it('should wrap database operation errors', async () => {
      const input = {
        includeTypes: ['knowledge_gaps'] as const
      };

      mockPatternService.identifyKnowledgeGaps.mockRejectedValue(new Error('SQLITE_BUSY: database is locked'));

      const result = await tool.handle(input);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Failed to identify knowledge gaps');
    });

    it('should handle empty service responses', async () => {
      const input = {
        includeTypes: ['unresolved_actions', 'recurring_questions'] as const
      };

      mockPatternService.detectUnresolvedActions.mockResolvedValue([]);
      mockPatternService.findRecurringQuestions.mockResolvedValue([]);

      const result = await tool.handle(input);

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.insights.unresolvedActions).toEqual([]);
      expect(response.insights.recurringQuestions).toEqual([]);
      expect(response.summary.totalInsights).toBe(0);
    });
  });

  describe('Static Factory Method', () => {
    it('should create tool instance via factory method', () => {
      const toolInstance = GetProactiveInsightsTool.create({ databaseManager: dbManager });
      
      expect(toolInstance).toBeInstanceOf(GetProactiveInsightsTool);
      expect(toolInstance.definition.name).toBe('get_proactive_insights');
    });

    it('should initialize pattern service in factory-created instance', () => {
      const toolInstance = GetProactiveInsightsTool.create({ databaseManager: dbManager });
      
      expect((toolInstance as any).patternService).toBeDefined();
      expect((toolInstance as any).patternService).toBeInstanceOf(PatternDetectionService);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large limit values', async () => {
      const input = {
        includeTypes: ['unresolved_actions'] as const,
        limit: 100
      };

      mockPatternService.detectUnresolvedActions.mockResolvedValue([]);

      const result = await tool.handle(input);

      expect(result.isError).toBe(false);
      expect(mockPatternService.detectUnresolvedActions).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 })
      );
    });

    it('should handle very small confidence thresholds', async () => {
      const input = {
        includeTypes: ['unresolved_actions'] as const,
        minConfidence: 0.1
      };

      mockPatternService.detectUnresolvedActions.mockResolvedValue([]);

      const result = await tool.handle(input);

      expect(result.isError).toBe(false);
      expect(mockPatternService.detectUnresolvedActions).toHaveBeenCalledWith(
        expect.objectContaining({ minConfidence: 0.1 })
      );
    });

    it('should handle very long conversation IDs', async () => {
      const longConversationId = 'conv-' + 'a'.repeat(1000);
      const input = {
        includeTypes: ['unresolved_actions'] as const,
        conversationId: longConversationId
      };

      mockPatternService.detectUnresolvedActions.mockResolvedValue([]);

      const result = await tool.handle(input);

      expect(result.isError).toBe(false);
      expect(mockPatternService.detectUnresolvedActions).toHaveBeenCalledWith(
        expect.objectContaining({ conversationId: longConversationId })
      );
    });
  });
});