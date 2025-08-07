/**
 * Get Conversation Analytics Tool Test Suite
 * 
 * Tests the get_conversation_analytics MCP tool including:
 * - Input validation and parameter parsing
 * - Component selection and analysis execution
 * - Response formatting and structure
 * - Error handling and edge cases
 * - Performance and reliability
 */

import { GetConversationAnalyticsTool } from '../../../src/tools/GetConversationAnalyticsTool';
import { BaseTool } from '../../../src/tools/BaseTool';
import { GetConversationAnalyticsInput } from '../../../src/types/schemas';
import {
  createTestAnalyticsEngine,
  createAnalyticsTestData,
  insertAnalyticsTestData,
  AnalyticsPerformanceTimer,
  expectAnalyticsScore,
  expectAnalyticsMetadata,
  createMockAnalyticsDependencies,
  setupAnalyticsMockTime,
  restoreAnalyticsTime
} from '../setup';

describe('GetConversationAnalyticsTool', () => {
  let testSetup: any;
  let tool: GetConversationAnalyticsTool;

  beforeEach(async () => {
    testSetup = await createTestAnalyticsEngine();
    
    // Insert test data
    const testData = createAnalyticsTestData();
    await insertAnalyticsTestData(testSetup.dbManager, testData);

    // Create tool with dependencies
    const dependencies = {
      analyticsEngine: testSetup.analyticsEngine,
      conversationRepository: testSetup.repositories.conversations,
      messageRepository: testSetup.repositories.messages,
      conversationFlowAnalyzer: testSetup.analyzers.conversationFlow,
      productivityAnalyzer: testSetup.analyzers.productivity,
      knowledgeGapDetector: testSetup.analyzers.knowledgeGap,
      decisionTracker: testSetup.analyzers.decision
    };

    tool = new GetConversationAnalyticsTool(dependencies);
    setupAnalyticsMockTime();
  });

  afterEach(async () => {
    await testSetup.dbManager.close();
    restoreAnalyticsTime();
  });

  describe('Tool Configuration and Metadata', () => {
    test('should have correct tool definition', () => {
      expect(tool.getName()).toBe('get_conversation_analytics');
      expect(tool.getDescription()).toContain('analytics');
      expect(tool.getDescription()).toContain('conversation');
      
      const schema = tool.getInputSchema();
      expect(schema).toBeDefined();
      expect(schema.properties).toHaveProperty('conversationId');
      expect(schema.required).toContain('conversationId');
    });

    test('should support optional component selection parameters', () => {
      const schema = tool.getInputSchema();
      expect(schema.properties).toHaveProperty('includeFlow');
      expect(schema.properties).toHaveProperty('includeProductivity');
      expect(schema.properties).toHaveProperty('includeKnowledgeGaps');
      expect(schema.properties).toHaveProperty('includeDecisions');
      
      // These should be optional boolean parameters
      expect(schema.properties.includeFlow.type).toBe('boolean');
      expect(schema.properties.includeProductivity.type).toBe('boolean');
      expect(schema.required).not.toContain('includeFlow');
    });
  });

  describe('Input Validation', () => {
    test('should accept valid conversation analytics request', async () => {
      const input: GetConversationAnalyticsInput = {
        conversationId: 'conv-analytics-1'
      };

      const context = BaseTool.createContext();
      const result = await tool.execute(input, context);

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });

    test('should accept optional component selection parameters', async () => {
      const input: GetConversationAnalyticsInput = {
        conversationId: 'conv-analytics-1',
        includeFlow: true,
        includeProductivity: false,
        includeKnowledgeGaps: true,
        includeDecisions: false
      };

      const context = BaseTool.createContext();
      const result = await tool.execute(input, context);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(true);
      
      // Should include selected components in metadata
      const componentsIncluded = response.data.metadata.componentsIncluded;
      expect(componentsIncluded).toContain('flow');
      expect(componentsIncluded).toContain('knowledgeGaps');
      expect(componentsIncluded).not.toContain('productivity');
      expect(componentsIncluded).not.toContain('decisions');
    });

    test('should reject invalid conversation ID', async () => {
      const input: GetConversationAnalyticsInput = {
        conversationId: ''
      };

      const context = BaseTool.createContext();
      const result = await tool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ValidationError');
    });

    test('should handle non-existent conversation ID', async () => {
      const input: GetConversationAnalyticsInput = {
        conversationId: 'non-existent-conversation'
      };

      const context = BaseTool.createContext();
      const result = await tool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('NotFoundError');
      expect(response.message).toContain('not found');
    });
  });

  describe('Complete Analytics Execution', () => {
    test('should perform full conversation analytics with all components', async () => {
      const input: GetConversationAnalyticsInput = {
        conversationId: 'conv-analytics-1',
        includeFlow: true,
        includeProductivity: true,
        includeKnowledgeGaps: true,
        includeDecisions: true
      };

      const timer = new AnalyticsPerformanceTimer();
      const context = BaseTool.createContext();
      const result = await tool.execute(input, context);
      timer.expectAnalyticsPerformance('full-analytics-execution', 3000);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(true);

      const data = response.data;
      expect(data.conversationId).toBe('conv-analytics-1');
      expect(data.analyzedAt).toBeDefined();
      expect(data.analyzedAt).toBeGreaterThan(Date.now() - 10000);

      // Verify flow metrics
      expect(data.flowMetrics).toBeDefined();
      expect(data.flowMetrics.topicCount).toBeGreaterThanOrEqual(0);
      expectAnalyticsScore(data.flowMetrics.depthScore, 0, 100, 'flow depth score');
      expectAnalyticsScore(data.flowMetrics.circularityIndex, 0, 1, 'circularity index');

      // Verify productivity metrics
      expect(data.productivityMetrics).toBeDefined();
      expectAnalyticsScore(data.productivityMetrics.overallScore, 0, 100, 'productivity score');
      expect(data.productivityMetrics.messageCount).toBeGreaterThan(0);

      // Verify knowledge gaps
      expect(data.knowledgeGaps).toBeDefined();
      expect(Array.isArray(data.knowledgeGaps)).toBe(true);

      // Verify decisions
      expect(data.decisions).toBeDefined();
      expect(Array.isArray(data.decisions)).toBe(true);

      // Verify insights
      expect(data.insights).toBeDefined();
      expectAnalyticsScore(data.insights.qualityScore, 0, 100, 'overall quality score');
      expect(Array.isArray(data.insights.strengths)).toBe(true);
      expect(Array.isArray(data.insights.improvements)).toBe(true);
      expect(Array.isArray(data.insights.patterns)).toBe(true);

      // Verify metadata
      expectAnalyticsMetadata(data.metadata, [
        'messageCount',
        'analysisDuration', 
        'componentsIncluded'
      ]);
    });

    test('should perform selective analytics based on component flags', async () => {
      const input: GetConversationAnalyticsInput = {
        conversationId: 'conv-analytics-2',
        includeFlow: true,
        includeProductivity: false,
        includeKnowledgeGaps: false,
        includeDecisions: true
      };

      const context = BaseTool.createContext();
      const result = await tool.execute(input, context);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text!);
      const data = response.data;

      // Should include selected components
      expect(data.flowMetrics).toBeDefined();
      expect(data.decisions).toBeDefined();

      // Should not include unselected components
      expect(data.productivityMetrics).toBeUndefined();
      expect(data.knowledgeGaps).toBeUndefined();

      // Metadata should reflect component selection
      const componentsIncluded = data.metadata.componentsIncluded;
      expect(componentsIncluded).toEqual(['flow', 'decisions']);
    });

    test('should provide meaningful insights synthesis', async () => {
      const input: GetConversationAnalyticsInput = {
        conversationId: 'conv-analytics-3', // Database design conversation
        includeFlow: true,
        includeProductivity: true,
        includeKnowledgeGaps: true,
        includeDecisions: true
      };

      const context = BaseTool.createContext();
      const result = await tool.execute(input, context);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text!);
      const insights = response.data.insights;

      expect(insights.strengths.length).toBeGreaterThan(0);
      expect(insights.improvements.length).toBeGreaterThanOrEqual(0);
      expect(insights.patterns.length).toBeGreaterThanOrEqual(0);

      // Insights should be contextual and meaningful
      insights.strengths.forEach(strength => {
        expect(typeof strength).toBe('string');
        expect(strength.length).toBeGreaterThan(10);
      });

      insights.improvements.forEach(improvement => {
        expect(typeof improvement).toBe('string');
        expect(improvement.length).toBeGreaterThan(10);
      });
    });
  });

  describe('Performance and Optimization', () => {
    test('should complete analysis within reasonable time limits', async () => {
      const input: GetConversationAnalyticsInput = {
        conversationId: 'conv-analytics-1',
        includeFlow: true,
        includeProductivity: true,
        includeKnowledgeGaps: true,
        includeDecisions: true
      };

      const timer = new AnalyticsPerformanceTimer();
      const context = BaseTool.createContext();
      await tool.execute(input, context);
      timer.expectAnalyticsPerformance('complete-analytics', 5000);
    });

    test('should handle concurrent requests efficiently', async () => {
      const inputs = [
        { conversationId: 'conv-analytics-1', includeFlow: true },
        { conversationId: 'conv-analytics-2', includeProductivity: true },
        { conversationId: 'conv-analytics-3', includeKnowledgeGaps: true }
      ];

      const timer = new AnalyticsPerformanceTimer();
      const context = BaseTool.createContext();
      
      const promises = inputs.map(input => tool.execute(input, context));
      const results = await Promise.all(promises);
      
      timer.expectAnalyticsPerformance('concurrent-analytics', 6000);

      results.forEach((result, index) => {
        expect(result.isError).toBeUndefined();
        const response = JSON.parse(result.content[0].text!);
        expect(response.success).toBe(true);
        expect(response.data.conversationId).toBe(inputs[index].conversationId);
      });
    });

    test('should optimize for minimal component selection', async () => {
      const input: GetConversationAnalyticsInput = {
        conversationId: 'conv-analytics-1',
        includeFlow: true,
        includeProductivity: false,
        includeKnowledgeGaps: false,
        includeDecisions: false
      };

      const timer = new AnalyticsPerformanceTimer();
      const context = BaseTool.createContext();
      await tool.execute(input, context);
      
      // Should be faster with fewer components
      timer.expectAnalyticsPerformance('minimal-analytics', 2000);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle database connection errors', async () => {
      // Close database connection to simulate error
      await testSetup.dbManager.close();

      const input: GetConversationAnalyticsInput = {
        conversationId: 'conv-analytics-1'
      };

      const context = BaseTool.createContext();
      const result = await tool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('DatabaseError');
    });

    test('should handle conversations with no messages', async () => {
      // Create conversation with no messages
      const db = testSetup.dbManager.getConnection();
      db.prepare(`
        INSERT INTO conversations (id, created_at, updated_at)
        VALUES ('empty-conv', ?, ?)
      `).run(Date.now(), Date.now());

      const input: GetConversationAnalyticsInput = {
        conversationId: 'empty-conv'
      };

      const context = BaseTool.createContext();
      const result = await tool.execute(input, context);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(true);
      
      const data = response.data;
      expect(data.metadata.messageCount).toBe(0);
      expect(data.insights.qualityScore).toBe(0);
    });

    test('should handle malformed input gracefully', async () => {
      const malformedInputs = [
        { conversationId: null },
        { conversationId: 123 },
        { conversationId: 'valid-id', includeFlow: 'yes' },
        { conversationId: 'valid-id', unknownParameter: true }
      ];

      for (const input of malformedInputs) {
        const context = BaseTool.createContext();
        const result = await tool.execute(input as any, context);

        expect(result.isError).toBe(true);
        const response = JSON.parse(result.content[0].text!);
        expect(response.success).toBe(false);
        expect(response.error).toBe('ValidationError');
      }
    });

    test('should handle analysis component failures gracefully', async () => {
      // Create tool with mock dependencies that can fail
      const mockDeps = createMockAnalyticsDependencies();
      
      // Mock conversation flow analyzer to throw error
      mockDeps.mockConversationFlowAnalyzer.analyzeConversation.mockRejectedValue(
        new Error('Flow analysis failed')
      );
      
      // Other analyzers succeed
      mockDeps.mockProductivityAnalyzer.analyzeConversation.mockResolvedValue({
        overallScore: 75,
        messageCount: 4,
        keyInsights: ['Good engagement'],
        breakthroughs: [],
        improvementAreas: []
      });

      const toolWithMocks = new GetConversationAnalyticsTool({
        analyticsEngine: testSetup.analyticsEngine,
        conversationRepository: testSetup.repositories.conversations,
        messageRepository: testSetup.repositories.messages,
        conversationFlowAnalyzer: mockDeps.mockConversationFlowAnalyzer as any,
        productivityAnalyzer: mockDeps.mockProductivityAnalyzer as any,
        knowledgeGapDetector: testSetup.analyzers.knowledgeGap,
        decisionTracker: testSetup.analyzers.decision
      });

      const input: GetConversationAnalyticsInput = {
        conversationId: 'conv-analytics-1',
        includeFlow: true,
        includeProductivity: true
      };

      const context = BaseTool.createContext();
      const result = await toolWithMocks.execute(input, context);

      // Should still succeed with partial results
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(true);
      
      const data = response.data;
      expect(data.flowMetrics).toBeUndefined(); // Failed component
      expect(data.productivityMetrics).toBeDefined(); // Successful component
      
      // Should note the failure in metadata or insights
      expect(data.insights.improvements).toContain(
        expect.stringMatching(/flow analysis|component.*failed/i)
      );
    });
  });

  describe('Response Format and Structure', () => {
    test('should return properly structured MCP tool response', async () => {
      const input: GetConversationAnalyticsInput = {
        conversationId: 'conv-analytics-1'
      };

      const context = BaseTool.createContext();
      const result = await tool.execute(input, context);

      // Verify MCP response structure
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');

      // Verify JSON structure
      const response = JSON.parse(result.content[0].text!);
      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('timestamp');
      expect(response.timestamp).toBeGreaterThan(Date.now() - 10000);
    });

    test('should include comprehensive metadata', async () => {
      const input: GetConversationAnalyticsInput = {
        conversationId: 'conv-analytics-1',
        includeFlow: true,
        includeProductivity: true
      };

      const context = BaseTool.createContext();
      const result = await tool.execute(input, context);

      const response = JSON.parse(result.content[0].text!);
      const metadata = response.data.metadata;

      expect(metadata).toHaveProperty('messageCount');
      expect(metadata).toHaveProperty('analysisDuration');
      expect(metadata).toHaveProperty('componentsIncluded');
      expect(metadata).toHaveProperty('conversationTitle');

      expect(typeof metadata.messageCount).toBe('number');
      expect(typeof metadata.analysisDuration).toBe('number');
      expect(Array.isArray(metadata.componentsIncluded)).toBe(true);
      expect(metadata.analysisDuration).toBeGreaterThan(0);
    });

    test('should format scores and metrics consistently', async () => {
      const input: GetConversationAnalyticsInput = {
        conversationId: 'conv-analytics-1',
        includeFlow: true,
        includeProductivity: true
      };

      const context = BaseTool.createContext();
      const result = await tool.execute(input, context);

      const response = JSON.parse(result.content[0].text!);
      const data = response.data;

      // All scores should be numbers within expected ranges
      if (data.flowMetrics) {
        expectAnalyticsScore(data.flowMetrics.depthScore, 0, 100, 'flow depth');
        expectAnalyticsScore(data.flowMetrics.circularityIndex, 0, 1, 'circularity');
        expect(Number.isInteger(data.flowMetrics.topicCount)).toBe(true);
      }

      if (data.productivityMetrics) {
        expectAnalyticsScore(data.productivityMetrics.overallScore, 0, 100, 'productivity');
        expect(Number.isInteger(data.productivityMetrics.messageCount)).toBe(true);
      }

      expectAnalyticsScore(data.insights.qualityScore, 0, 100, 'quality');
    });

    test('should provide actionable insights and recommendations', async () => {
      const input: GetConversationAnalyticsInput = {
        conversationId: 'conv-analytics-1',
        includeFlow: true,
        includeProductivity: true,
        includeKnowledgeGaps: true
      };

      const context = BaseTool.createContext();
      const result = await tool.execute(input, context);

      const response = JSON.parse(result.content[0].text!);
      const insights = response.data.insights;

      // Insights should be specific and actionable
      insights.strengths.forEach(strength => {
        expect(strength).toMatch(/\b(good|strong|effective|high|excellent)\b/i);
      });

      insights.improvements.forEach(improvement => {
        expect(improvement).toMatch(/\b(could|should|consider|try|improve)\b/i);
      });

      insights.patterns.forEach(pattern => {
        expect(pattern).toMatch(/\b(pattern|trend|tendency|indicates)\b/i);
      });
    });
  });

  describe('Integration with Analytics Engine', () => {
    test('should leverage analytics engine caching', async () => {
      const input: GetConversationAnalyticsInput = {
        conversationId: 'conv-analytics-1',
        includeFlow: true,
        includeProductivity: true
      };

      const context = BaseTool.createContext();

      // First call
      const timer1 = new AnalyticsPerformanceTimer();
      await tool.execute(input, context);
      const firstCallTime = timer1.elapsed();

      // Second call (should use cache)
      const timer2 = new AnalyticsPerformanceTimer();
      await tool.execute(input, context);
      const secondCallTime = timer2.elapsed();

      // Second call should be faster due to caching
      expect(secondCallTime).toBeLessThan(firstCallTime * 0.8);
    });

    test('should coordinate between different analyzers', async () => {
      const input: GetConversationAnalyticsInput = {
        conversationId: 'conv-analytics-1',
        includeFlow: true,
        includeProductivity: true,
        includeKnowledgeGaps: true,
        includeDecisions: true
      };

      const context = BaseTool.createContext();
      const result = await tool.execute(input, context);

      const response = JSON.parse(result.content[0].text!);
      const data = response.data;

      // Should show coordination between analyzers in insights
      expect(data.insights.patterns.length).toBeGreaterThan(0);
      
      // Cross-analyzer insights should reference multiple metrics
      const crossAnalyzerInsights = data.insights.patterns.filter(pattern =>
        (pattern.includes('productivity') || pattern.includes('flow')) &&
        (pattern.includes('topic') || pattern.includes('decision'))
      );
      
      if (data.flowMetrics && data.productivityMetrics && 
          data.knowledgeGaps?.length && data.decisions?.length) {
        expect(crossAnalyzerInsights.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Default Behavior', () => {
    test('should include all components by default when no flags specified', async () => {
      const input: GetConversationAnalyticsInput = {
        conversationId: 'conv-analytics-1'
        // No component flags specified
      };

      const context = BaseTool.createContext();
      const result = await tool.execute(input, context);

      const response = JSON.parse(result.content[0].text!);
      const data = response.data;

      // Should include all components by default
      expect(data.flowMetrics).toBeDefined();
      expect(data.productivityMetrics).toBeDefined();
      expect(data.knowledgeGaps).toBeDefined();
      expect(data.decisions).toBeDefined();

      const componentsIncluded = data.metadata.componentsIncluded;
      expect(componentsIncluded).toEqual(['flow', 'productivity', 'knowledgeGaps', 'decisions']);
    });

    test('should handle conversations of different types and complexities', async () => {
      const conversationIds = ['conv-analytics-1', 'conv-analytics-2', 'conv-analytics-3'];
      
      for (const conversationId of conversationIds) {
        const input: GetConversationAnalyticsInput = { conversationId };
        const context = BaseTool.createContext();
        const result = await tool.execute(input, context);

        expect(result.isError).toBeUndefined();
        const response = JSON.parse(result.content[0].text!);
        expect(response.success).toBe(true);
        
        // Each conversation should have unique characteristics
        const data = response.data;
        expect(data.conversationId).toBe(conversationId);
        expect(data.metadata.messageCount).toBeGreaterThan(0);
        expect(data.insights.qualityScore).toBeGreaterThanOrEqual(0);
      }
    });
  });
});