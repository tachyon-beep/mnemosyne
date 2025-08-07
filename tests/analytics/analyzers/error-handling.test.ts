/**
 * Error Handling Tests for Analyzer Classes
 * 
 * Tests comprehensive error handling, graceful degradation, and logging
 * for ProductivityAnalyzer, ConversationFlowAnalyzer, KnowledgeGapDetector, and DecisionTracker
 */

import { ProductivityAnalyzer } from '../../../src/analytics/analyzers/ProductivityAnalyzer.js';
import { ConversationFlowAnalyzer } from '../../../src/analytics/analyzers/ConversationFlowAnalyzer.js';
import { KnowledgeGapDetector } from '../../../src/analytics/analyzers/KnowledgeGapDetector.js';
import { DecisionTracker } from '../../../src/analytics/analyzers/DecisionTracker.js';
import { Conversation, Message } from '../../../src/types/interfaces.js';

describe('Analyzer Error Handling', () => {
  let productivityAnalyzer: ProductivityAnalyzer;
  let flowAnalyzer: ConversationFlowAnalyzer;
  let gapDetector: KnowledgeGapDetector;
  let decisionTracker: DecisionTracker;
  
  let consoleSpy: jest.SpyInstance;
  let infoSpy: jest.SpyInstance;

  beforeEach(() => {
    productivityAnalyzer = new ProductivityAnalyzer();
    flowAnalyzer = new ConversationFlowAnalyzer();
    gapDetector = new KnowledgeGapDetector();
    decisionTracker = new DecisionTracker();
    
    // Mock console methods to capture logs
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('ProductivityAnalyzer Error Handling', () => {
    it('should handle null/undefined conversation gracefully', async () => {
      const result = await productivityAnalyzer.analyzeConversationProductivity(null as any, []);
      
      expect(result).toBeDefined();
      expect(result.conversationId).toBe('unknown');
      expect(result.overallProductivityScore).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith('ProductivityAnalyzer: Invalid input parameters');
    });

    it('should handle empty messages array', async () => {
      const conversation: Conversation = {
        id: 'test-conv',
        title: 'Test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };

      const result = await productivityAnalyzer.analyzeConversationProductivity(conversation, []);
      
      expect(result).toBeDefined();
      expect(result.conversationId).toBe('test-conv');
      expect(result.overallProductivityScore).toBe(0);
      expect(infoSpy).toHaveBeenCalledWith('ProductivityAnalyzer: Empty conversation, returning default metrics');
    });

    it('should handle malformed messages', async () => {
      const conversation: Conversation = {
        id: 'test-conv',
        title: 'Test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };

      const malformedMessages = [
        null,
        undefined,
        { id: 'msg1' }, // missing required fields
        { id: 'msg2', content: 'test', role: 'user' as const, createdAt: Date.now(), conversationId: 'test-conv' }
      ] as any[];

      const result = await productivityAnalyzer.analyzeConversationProductivity(conversation, malformedMessages);
      
      expect(result).toBeDefined();
      expect(result.conversationId).toBe('test-conv');
      // Should still work with at least one valid message
      expect(result.overallProductivityScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle invalid flow metrics gracefully', async () => {
      const conversation: Conversation = {
        id: 'test-conv',
        title: 'Test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };

      const messages: Message[] = [{
        id: 'msg1',
        content: 'This is a test message with some insight about the problem.',
        role: 'user' as const,
        createdAt: Date.now(),
        conversationId: 'test-conv'
      }];

      const invalidFlowMetrics = {
        depthScore: NaN,
        circularityIndex: Infinity,
        progressionScore: -100
      } as any;

      const result = await productivityAnalyzer.analyzeConversationProductivity(conversation, messages, invalidFlowMetrics);
      
      expect(result).toBeDefined();
      expect(isFinite(result.effectivenessScore)).toBe(true);
      expect(result.effectivenessScore).toBeGreaterThanOrEqual(0);
      expect(result.effectivenessScore).toBeLessThanOrEqual(100);
    });

    it('should handle hourly patterns with no data', async () => {
      const result = await productivityAnalyzer.analyzeHourlyPatterns([]);
      
      expect(result).toBeDefined();
      expect(result).toHaveLength(24);
      expect(result[0]).toEqual({
        hour: 0,
        productivity: {
          score: 0,
          conversationCount: 0,
          averageQuality: 0,
          insightRate: 0,
          confidenceLevel: 0
        },
        patterns: {
          commonApproaches: [],
          successRate: 0,
          averageSessionLength: 0
        }
      });
    });

    it('should handle question effectiveness with invalid data', async () => {
      const invalidData = [
        { conversation: null, messages: null, productivity: null },
        { conversation: {}, messages: [], productivity: {} }
      ] as any[];

      const result = await productivityAnalyzer.analyzeQuestionEffectiveness(invalidData);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('ProductivityAnalyzer: Invalid messages data, skipping');
    });
  });

  describe('ConversationFlowAnalyzer Error Handling', () => {
    it('should handle null conversation gracefully', async () => {
      const result = await flowAnalyzer.analyzeFlow(null as any, []);
      
      expect(result).toBeDefined();
      expect(result.conversationId).toBe('unknown');
      expect(result.depthScore).toBe(0);
      expect(result.coherenceScore).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith('ConversationFlowAnalyzer: Invalid input parameters');
    });

    it('should handle empty messages', async () => {
      const conversation: Conversation = {
        id: 'test-conv',
        title: 'Test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };

      const result = await flowAnalyzer.analyzeFlow(conversation, []);
      
      expect(result).toBeDefined();
      expect(result.conversationId).toBe('test-conv');
      expect(result.messageCount).toBe(0);
      expect(infoSpy).toHaveBeenCalledWith('ConversationFlowAnalyzer: Empty conversation, returning default metrics');
    });

    it('should handle messages with missing content', async () => {
      const conversation: Conversation = {
        id: 'test-conv',
        title: 'Test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };

      const messages = [
        { id: 'msg1', role: 'user' as const, createdAt: Date.now() }, // missing content
        { id: 'msg2', content: null, role: 'user' as const, createdAt: Date.now(), conversationId: 'test-conv' },
        { id: 'msg3', content: 'Valid message', role: 'user' as const, createdAt: Date.now(), conversationId: 'test-conv' }
      ] as any[];

      const result = await flowAnalyzer.analyzeFlow(conversation, messages);
      
      expect(result).toBeDefined();
      expect(result.conversationId).toBe('test-conv');
      expect(result.messageCount).toBe(3); // Counts all messages passed in
      expect(result.depthScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle circular reference detection errors', async () => {
      const conversation: Conversation = {
        id: 'test-conv',
        title: 'Test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };

      const messages: Message[] = [{
        id: 'msg1',
        content: 'Test message with topics',
        role: 'user' as const,
        createdAt: Date.now(),
        conversationId: 'test-conv'
      }];

      // Mock the internal method to throw an error
      const originalAnalyzeCircularity = (flowAnalyzer as any).analyzeCircularity;
      (flowAnalyzer as any).analyzeCircularity = jest.fn(() => {
        throw new Error('Circularity analysis failed');
      });

      const result = await flowAnalyzer.analyzeFlow(conversation, messages);
      
      expect(result).toBeDefined();
      expect(result.circularityIndex).toBe(0); // Should fallback to 0
      
      // Restore original method
      (flowAnalyzer as any).analyzeCircularity = originalAnalyzeCircularity;
    });
  });

  describe('KnowledgeGapDetector Error Handling', () => {
    it('should handle empty conversations array', async () => {
      const result = await gapDetector.detectGaps([]);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith('KnowledgeGapDetector: No conversations provided');
    });

    it('should handle malformed conversation data', async () => {
      const malformedData = [
        null,
        undefined,
        { conversation: null, messages: null },
        { conversation: { id: 'test' }, messages: [] },
        { 
          conversation: { id: 'valid', title: 'Valid', createdAt: Date.now(), updatedAt: Date.now() }, 
          messages: [{ id: 'msg1', content: 'What is machine learning?', role: 'user' as const, createdAt: Date.now(), conversationId: 'test' }] 
        }
      ] as any[];

      const result = await gapDetector.detectGaps(malformedData);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Should process the valid conversation despite malformed ones
    });

    it('should handle question clustering failures', async () => {
      const conversations = [{
        conversation: { id: 'test', title: 'Test', createdAt: Date.now(), updatedAt: Date.now(), metadata: {} },
        messages: [
          { id: 'msg1', content: 'What is AI?', role: 'user' as const, createdAt: Date.now(), conversationId: 'test' },
          { id: 'msg2', content: 'How does ML work?', role: 'user' as const, createdAt: Date.now(), conversationId: 'test' }
        ]
      }];

      // Mock clustering to throw error
      const originalClusterQuestions = (gapDetector as any).clusterQuestions;
      (gapDetector as any).clusterQuestions = jest.fn().mockRejectedValue(new Error('Clustering failed'));

      const result = await gapDetector.detectGaps(conversations);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('KnowledgeGapDetector: Error clustering questions:', expect.any(Error));
      
      // Restore original method
      (gapDetector as any).clusterQuestions = originalClusterQuestions;
    });

    it('should handle learning curve generation with invalid data', async () => {
      const result = await gapDetector.generateLearningCurves([]);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith('KnowledgeGapDetector: No conversations provided for learning curves');
    });
  });

  describe('DecisionTracker Error Handling', () => {
    it('should handle null conversation input', async () => {
      const result = await decisionTracker.trackDecisions(null as any, []);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith('DecisionTracker: Invalid input parameters');
    });

    it('should handle empty messages array', async () => {
      const conversation: Conversation = {
        id: 'test-conv',
        title: 'Test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };

      const result = await decisionTracker.trackDecisions(conversation, []);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should handle quality analysis with no decisions', async () => {
      const conversation: Conversation = {
        id: 'test-conv',
        title: 'Test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };

      const result = await decisionTracker.analyzeDecisionQuality(conversation, [], []);
      
      expect(result).toBeDefined();
      expect(result.conversationId).toBe('test-conv');
      expect(result.totalDecisions).toBe(0);
      expect(result.averageClarityScore).toBe(0);
      expect(result.successRate).toBe(0);
    });

    it('should handle decision pattern detection with insufficient data', async () => {
      const result = await decisionTracker.detectDecisionPatterns([]);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith('DecisionTracker: No conversation data provided for pattern detection');
    });

    it('should handle timeline generation with invalid decision', async () => {
      const conversation: Conversation = {
        id: 'test-conv',
        title: 'Test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };

      const invalidDecision = null as any;

      const result = await decisionTracker.generateDecisionTimeline(conversation, [], invalidDecision);
      
      expect(result).toBeDefined();
      expect(result.decisionId).toBe('unknown');
      expect(result.phases).toHaveLength(0);
      expect(result.totalDuration).toBe(0);
      expect(result.efficiency).toBe(0);
      expect(result.completeness).toBe(0);
    });

    it('should handle malformed message data in decision detection', async () => {
      const conversation: Conversation = {
        id: 'test-conv',
        title: 'Test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };

      const malformedMessages = [
        null,
        { id: 'msg1' }, // missing content and other fields
        { id: 'msg2', content: null, role: 'user' },
        { id: 'msg3', content: 'I decided to use React for this project', role: 'user' as const, createdAt: Date.now(), conversationId: 'test-conv' }
      ] as any[];

      const result = await decisionTracker.trackDecisions(conversation, malformedMessages);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Should process valid messages despite malformed ones
    });
  });

  describe('Bounds Checking and Data Validation', () => {
    it('should ensure all scores are within valid ranges', async () => {
      const conversation: Conversation = {
        id: 'test-conv',
        title: 'Test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };

      const messages: Message[] = [{
        id: 'msg1',
        content: 'This is an insightful breakthrough about the complex problem we discussed.',
        role: 'user' as const,
        createdAt: Date.now(),
        conversationId: 'test-conv'
      }];

      const productivityResult = await productivityAnalyzer.analyzeConversationProductivity(conversation, messages);
      const flowResult = await flowAnalyzer.analyzeFlow(conversation, messages);

      // Check ProductivityAnalyzer bounds
      expect(productivityResult.overallProductivityScore).toBeGreaterThanOrEqual(0);
      expect(productivityResult.overallProductivityScore).toBeLessThanOrEqual(100);
      expect(productivityResult.efficiencyScore).toBeGreaterThanOrEqual(0);
      expect(productivityResult.efficiencyScore).toBeLessThanOrEqual(100);
      expect(productivityResult.effectivenessScore).toBeGreaterThanOrEqual(0);
      expect(productivityResult.effectivenessScore).toBeLessThanOrEqual(100);
      expect(productivityResult.engagementScore).toBeGreaterThanOrEqual(0);
      expect(productivityResult.engagementScore).toBeLessThanOrEqual(100);

      // Check ConversationFlowAnalyzer bounds
      expect(flowResult.depthScore).toBeGreaterThanOrEqual(0);
      expect(flowResult.depthScore).toBeLessThanOrEqual(100);
      expect(flowResult.circularityIndex).toBeGreaterThanOrEqual(0);
      expect(flowResult.circularityIndex).toBeLessThanOrEqual(1);
      expect(flowResult.coherenceScore).toBeGreaterThanOrEqual(0);
      expect(flowResult.coherenceScore).toBeLessThanOrEqual(100);
      expect(flowResult.progressionScore).toBeGreaterThanOrEqual(0);
      expect(flowResult.progressionScore).toBeLessThanOrEqual(100);
      expect(flowResult.questionDensity).toBeGreaterThanOrEqual(0);
      expect(flowResult.questionDensity).toBeLessThanOrEqual(1);
      expect(flowResult.insightDensity).toBeGreaterThanOrEqual(0);
      expect(flowResult.insightDensity).toBeLessThanOrEqual(1);
      expect(flowResult.participationBalance).toBeGreaterThanOrEqual(0);
      expect(flowResult.participationBalance).toBeLessThanOrEqual(1);

      // Check for NaN, Infinity, or other invalid numbers
      const checkFinite = (obj: any, path = '') => {
        Object.entries(obj).forEach(([key, value]) => {
          const currentPath = path ? `${path}.${key}` : key;
          if (typeof value === 'number') {
            expect(isFinite(value)).toBe(true);
          } else if (typeof value === 'object' && value !== null) {
            checkFinite(value, currentPath);
          }
        });
      };

      checkFinite(productivityResult);
      checkFinite(flowResult);
    });

    it('should handle extreme input values gracefully', async () => {
      const conversation: Conversation = {
        id: 'test-conv',
        title: 'Test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };

      // Messages with extreme timestamps
      const extremeMessages: Message[] = [
        {
          id: 'msg1',
          content: 'Message with extreme past timestamp',
          role: 'user' as const,
          createdAt: 0,
          conversationId: 'test-conv'
        },
        {
          id: 'msg2',
          content: 'Message with extreme future timestamp',
          role: 'user' as const,
          createdAt: Number.MAX_SAFE_INTEGER,
          conversationId: 'test-conv'
        }
      ];

      const productivityResult = await productivityAnalyzer.analyzeConversationProductivity(conversation, extremeMessages);
      const flowResult = await flowAnalyzer.analyzeFlow(conversation, extremeMessages);

      expect(productivityResult).toBeDefined();
      expect(flowResult).toBeDefined();
      expect(isFinite(productivityResult.sessionDuration)).toBe(true);
      expect(isFinite(flowResult.averageTopicDuration)).toBe(true);
    });
  });

  describe('Partial Success Handling', () => {
    it('should continue processing when some components fail', async () => {
      const conversation: Conversation = {
        id: 'test-conv',
        title: 'Test',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };

      const messages: Message[] = [{
        id: 'msg1',
        content: 'Test message for partial success',
        role: 'user' as const,
        createdAt: Date.now(),
        conversationId: 'test-conv'
      }];

      // Mock one of the internal methods to throw an error
      const originalCalculateEngagementScore = (productivityAnalyzer as any).calculateEngagementScore;
      (productivityAnalyzer as any).calculateEngagementScore = jest.fn(() => {
        throw new Error('Engagement calculation failed');
      });

      const result = await productivityAnalyzer.analyzeConversationProductivity(conversation, messages);
      
      expect(result).toBeDefined();
      expect(result.conversationId).toBe('test-conv');
      expect(result.engagementScore).toBe(0); // Should fallback to 0
      expect(result.overallProductivityScore).toBeGreaterThanOrEqual(0); // Should still calculate partial score
      
      // Restore original method
      (productivityAnalyzer as any).calculateEngagementScore = originalCalculateEngagementScore;
    });
  });
});