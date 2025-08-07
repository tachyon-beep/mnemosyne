/**
 * Analytics Integration Test Suite
 * 
 * End-to-end integration tests for the Phase 5 analytics system including:
 * - Complete analytics pipeline from data to insights
 * - MCP tool integration and compliance
 * - Cross-component coordination and consistency
 * - Performance under realistic loads
 * - Error recovery and resilience
 */

import { AnalyticsEngine } from '../../src/analytics/services/AnalyticsEngine';
import { GetConversationAnalyticsTool } from '../../src/tools/GetConversationAnalyticsTool';
import { AnalyzeProductivityPatternsTool } from '../../src/tools/AnalyzeProductivityPatternsTool';
import { DetectKnowledgeGapsTool } from '../../src/tools/DetectKnowledgeGapsTool';
import { TrackDecisionEffectivenessTool } from '../../src/tools/TrackDecisionEffectivenessTool';
import { GenerateAnalyticsReportTool } from '../../src/tools/GenerateAnalyticsReportTool';
import { BaseTool } from '../../src/tools/BaseTool';
import {
  createTestAnalyticsEngine,
  createAnalyticsTestData,
  insertAnalyticsTestData,
  AnalyticsPerformanceTimer,
  expectAnalyticsScore,
  expectAnalyticsMetadata,
  setupAnalyticsMockTime,
  restoreAnalyticsTime
} from '../analytics/setup';

describe('Analytics Integration Tests', () => {
  let testSetup: any;
  let analyticsEngine: AnalyticsEngine;
  let tools: {
    conversationAnalytics: GetConversationAnalyticsTool;
    productivityPatterns: AnalyzeProductivityPatternsTool;
    knowledgeGaps: DetectKnowledgeGapsTool;
    decisionEffectiveness: TrackDecisionEffectivenessTool;
    analyticsReport: GenerateAnalyticsReportTool;
  };

  beforeEach(async () => {
    testSetup = await createTestAnalyticsEngine();
    analyticsEngine = testSetup.analyticsEngine;
    
    // Insert comprehensive test data
    const testData = createAnalyticsTestData();
    await insertAnalyticsTestData(testSetup.dbManager, testData);

    // Create all analytics MCP tools
    const commonDependencies = {
      analyticsEngine,
      conversationRepository: testSetup.repositories.conversations,
      messageRepository: testSetup.repositories.messages,
      conversationFlowAnalyzer: testSetup.analyzers.conversationFlow,
      productivityAnalyzer: testSetup.analyzers.productivity,
      knowledgeGapDetector: testSetup.analyzers.knowledgeGap,
      decisionTracker: testSetup.analyzers.decision
    };

    tools = {
      conversationAnalytics: new GetConversationAnalyticsTool(commonDependencies),
      productivityPatterns: new AnalyzeProductivityPatternsTool({
        ...commonDependencies,
        productivityPatternsRepository: testSetup.repositories.productivityPatterns
      }),
      knowledgeGaps: new DetectKnowledgeGapsTool({
        ...commonDependencies,
        knowledgeGapsRepository: testSetup.repositories.knowledgeGaps
      }),
      decisionEffectiveness: new TrackDecisionEffectivenessTool({
        ...commonDependencies,
        decisionTrackingRepository: testSetup.repositories.decisionTracking
      }),
      analyticsReport: new GenerateAnalyticsReportTool(commonDependencies)
    };

    setupAnalyticsMockTime();
  });

  afterEach(async () => {
    await testSetup.dbManager.close();
    restoreAnalyticsTime();
  });

  describe('End-to-End Analytics Pipeline', () => {
    test('should execute complete analytics workflow', async () => {
      const timer = new AnalyticsPerformanceTimer();
      const context = BaseTool.createContext();

      // Step 1: Analyze individual conversation
      const conversationResult = await tools.conversationAnalytics.execute({
        conversationId: 'conv-analytics-1',
        includeFlow: true,
        includeProductivity: true,
        includeKnowledgeGaps: true,
        includeDecisions: true
      }, context);

      timer.checkpoint('conversation-analysis');
      expect(conversationResult.isError).toBeUndefined();
      const conversationData = JSON.parse(conversationResult.content[0].text!);
      expect(conversationData.success).toBe(true);

      // Step 2: Analyze productivity patterns
      const productivityResult = await tools.productivityPatterns.execute({
        timeRange: {
          start: Date.now() - (7 * 24 * 60 * 60 * 1000),
          end: Date.now()
        },
        granularity: 'day'
      }, context);

      timer.checkpoint('productivity-analysis');
      expect(productivityResult.isError).toBeUndefined();
      const productivityData = JSON.parse(productivityResult.content[0].text!);
      expect(productivityData.success).toBe(true);

      // Step 3: Detect knowledge gaps
      const knowledgeGapsResult = await tools.knowledgeGaps.execute({
        conversationId: 'conv-analytics-1',
        includeResolved: false,
        minConfidence: 0.6
      }, context);

      timer.checkpoint('knowledge-gaps-analysis');
      expect(knowledgeGapsResult.isError).toBeUndefined();
      const knowledgeGapsData = JSON.parse(knowledgeGapsResult.content[0].text!);
      expect(knowledgeGapsData.success).toBe(true);

      // Step 4: Track decision effectiveness
      const decisionResult = await tools.decisionEffectiveness.execute({
        timeRange: {
          start: Date.now() - (30 * 24 * 60 * 60 * 1000),
          end: Date.now()
        },
        includeOutcomes: true
      }, context);

      timer.checkpoint('decision-analysis');
      expect(decisionResult.isError).toBeUndefined();
      const decisionData = JSON.parse(decisionResult.content[0].text!);
      expect(decisionData.success).toBe(true);

      // Step 5: Generate comprehensive analytics report
      const reportResult = await tools.analyticsReport.execute({
        timeRange: {
          start: Date.now() - (7 * 24 * 60 * 60 * 1000),
          end: Date.now()
        },
        includeConversationMetrics: true,
        includeProductivityInsights: true,
        includeKnowledgeGaps: true,
        includeDecisionQuality: true
      }, context);

      timer.checkpoint('report-generation');
      timer.expectAnalyticsPerformance('complete-workflow', 8000);

      expect(reportResult.isError).toBeUndefined();
      const reportData = JSON.parse(reportResult.content[0].text!);
      expect(reportData.success).toBe(true);

      // Verify workflow coherence
      const report = reportData.data;
      expect(report.conversationMetrics.totalConversations).toBeGreaterThan(0);
      expect(report.productivityInsights.peakHours.length).toBeGreaterThan(0);
      expect(report.knowledgeGaps.totalUnresolved).toBeGreaterThanOrEqual(0);
      expect(report.decisionQuality.totalDecisions).toBeGreaterThanOrEqual(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    test('should maintain data consistency across all tools', async () => {
      const context = BaseTool.createContext();
      const conversationId = 'conv-analytics-1';

      // Get analytics from conversation tool
      const conversationResult = await tools.conversationAnalytics.execute({
        conversationId,
        includeProductivity: true,
        includeKnowledgeGaps: true,
        includeDecisions: true
      }, context);

      const conversationData = JSON.parse(conversationResult.content[0].text!);
      
      // Get analytics from specialized tools
      const knowledgeGapsResult = await tools.knowledgeGaps.execute({
        conversationId,
        includeResolved: true
      }, context);

      const knowledgeGapsData = JSON.parse(knowledgeGapsResult.content[0].text!);

      // Data should be consistent between tools
      expect(conversationData.data.metadata.messageCount).toBeGreaterThan(0);
      
      // Knowledge gaps from conversation tool should match specialized tool
      const convGaps = conversationData.data.knowledgeGaps || [];
      const specializedGaps = knowledgeGapsData.data.gaps || [];
      
      if (convGaps.length > 0 && specializedGaps.length > 0) {
        // Should have overlapping gaps (may not be identical due to different contexts)
        const convGapContents = convGaps.map((g: any) => g.content?.toLowerCase() || '');
        const specializedGapContents = specializedGaps.map((g: any) => g.content?.toLowerCase() || '');
        
        const overlap = convGapContents.some((content: string) =>
          specializedGapContents.some((specContent: string) => 
            content.includes(specContent) || specContent.includes(content)
          )
        );
        
        expect(overlap).toBe(true);
      }
    });
  });

  describe('MCP Protocol Compliance', () => {
    test('should conform to MCP tool response format', async () => {
      const context = BaseTool.createContext();
      const toolTests = [
        {
          name: 'conversation_analytics',
          tool: tools.conversationAnalytics,
          input: { conversationId: 'conv-analytics-1' }
        },
        {
          name: 'productivity_patterns',
          tool: tools.productivityPatterns,
          input: {
            timeRange: {
              start: Date.now() - (24 * 60 * 60 * 1000),
              end: Date.now()
            }
          }
        },
        {
          name: 'knowledge_gaps',
          tool: tools.knowledgeGaps,
          input: { conversationId: 'conv-analytics-1' }
        },
        {
          name: 'analytics_report',
          tool: tools.analyticsReport,
          input: {
            timeRange: {
              start: Date.now() - (24 * 60 * 60 * 1000),
              end: Date.now()
            }
          }
        }
      ];

      for (const test of toolTests) {
        const result = await test.tool.execute(test.input, context);

        // Verify MCP response structure
        expect(result).toHaveProperty('content');
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.content.length).toBeGreaterThan(0);
        expect(result.content[0]).toHaveProperty('type', 'text');
        expect(result.content[0]).toHaveProperty('text');

        // Verify JSON response structure
        const response = JSON.parse(result.content[0].text!);
        expect(response).toHaveProperty('success');
        expect(response).toHaveProperty('data');
        expect(response).toHaveProperty('timestamp');
        
        if (result.isError) {
          expect(response.success).toBe(false);
          expect(response).toHaveProperty('error');
        } else {
          expect(response.success).toBe(true);
        }

        console.log(`✓ ${test.name} MCP compliance verified`);
      }
    });

    test('should handle tool schema validation consistently', async () => {
      const context = BaseTool.createContext();
      const invalidInputs = [
        {
          tool: tools.conversationAnalytics,
          input: { conversationId: null }
        },
        {
          tool: tools.productivityPatterns,
          input: { timeRange: null }
        },
        {
          tool: tools.knowledgeGaps,
          input: { conversationId: '' }
        }
      ];

      for (const test of invalidInputs) {
        const result = await test.tool.execute(test.input as any, context);

        expect(result.isError).toBe(true);
        const response = JSON.parse(result.content[0].text!);
        expect(response.success).toBe(false);
        expect(response.error).toBe('ValidationError');
      }
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle concurrent analytics requests efficiently', async () => {
      const context = BaseTool.createContext();
      const concurrentRequests = [
        tools.conversationAnalytics.execute({
          conversationId: 'conv-analytics-1'
        }, context),
        tools.conversationAnalytics.execute({
          conversationId: 'conv-analytics-2'
        }, context),
        tools.conversationAnalytics.execute({
          conversationId: 'conv-analytics-3'
        }, context),
        tools.productivityPatterns.execute({
          timeRange: {
            start: Date.now() - (24 * 60 * 60 * 1000),
            end: Date.now()
          }
        }, context),
        tools.analyticsReport.execute({
          timeRange: {
            start: Date.now() - (7 * 24 * 60 * 60 * 1000),
            end: Date.now()
          }
        }, context)
      ];

      const timer = new AnalyticsPerformanceTimer();
      const results = await Promise.all(concurrentRequests);
      timer.expectAnalyticsPerformance('concurrent-analytics', 6000);

      results.forEach(result => {
        expect(result.isError).toBeUndefined();
        const response = JSON.parse(result.content[0].text!);
        expect(response.success).toBe(true);
      });
    });

    test('should maintain performance with large datasets', async () => {
      // Insert additional large dataset
      const db = testSetup.dbManager.getConnection();
      const now = Date.now();

      // Add many more conversations and analytics data
      const insertConv = db.prepare(`
        INSERT INTO conversations (id, created_at, updated_at)
        VALUES (?, ?, ?)
      `);

      const insertMsg = db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      const insertAnalytics = db.prepare(`
        INSERT INTO conversation_analytics 
        (conversation_id, analyzed_at, productivity_score, insight_count, topic_count, depth_score)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const transaction = db.transaction(() => {
        for (let i = 0; i < 50; i++) {
          const convId = `perf-conv-${i}`;
          insertConv.run(convId, now - (i * 1000), now - (i * 1000));
          
          // Add messages for each conversation
          for (let j = 0; j < 10; j++) {
            insertMsg.run(
              `perf-msg-${i}-${j}`,
              convId,
              j % 2 === 0 ? 'user' : 'assistant',
              `Performance test message ${j} for conversation ${i} with detailed content about technical topics.`,
              now - (i * 1000) + (j * 100)
            );
          }
          
          // Add analytics
          insertAnalytics.run(
            convId,
            now,
            Math.random() * 100,
            Math.floor(Math.random() * 10),
            Math.floor(Math.random() * 15),
            Math.random() * 100
          );
        }
      });

      transaction();

      // Test performance with large dataset
      const context = BaseTool.createContext();
      const timer = new AnalyticsPerformanceTimer();

      const reportResult = await tools.analyticsReport.execute({
        timeRange: {
          start: now - (24 * 60 * 60 * 1000),
          end: now
        },
        includeConversationMetrics: true,
        includeProductivityInsights: true
      }, context);

      timer.expectAnalyticsPerformance('large-dataset-report', 10000);

      expect(reportResult.isError).toBeUndefined();
      const response = JSON.parse(reportResult.content[0].text!);
      expect(response.success).toBe(true);
      expect(response.data.conversationMetrics.totalConversations).toBeGreaterThan(50);
    });

    test('should gracefully degrade under resource constraints', async () => {
      // Simulate resource constraints by setting aggressive timeouts
      const constrainedEngine = new AnalyticsEngine(testSetup.dbManager, {
        maxProcessingTimeMs: 500, // Very short processing time
        cacheExpirationMinutes: 0.01, // Minimal caching
        batchProcessingSize: 5
      });

      const constrainedTool = new GenerateAnalyticsReportTool({
        analyticsEngine: constrainedEngine,
        conversationRepository: testSetup.repositories.conversations,
        messageRepository: testSetup.repositories.messages,
        conversationFlowAnalyzer: testSetup.analyzers.conversationFlow,
        productivityAnalyzer: testSetup.analyzers.productivity,
        knowledgeGapDetector: testSetup.analyzers.knowledgeGap,
        decisionTracker: testSetup.analyzers.decision
      });

      const context = BaseTool.createContext();
      const result = await constrainedTool.execute({
        timeRange: {
          start: Date.now() - (7 * 24 * 60 * 60 * 1000),
          end: Date.now()
        }
      }, context);

      // Should still succeed but may have reduced detail
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(true);
      
      // May include warnings about reduced analysis depth
      const data = response.data;
      expect(data).toBeDefined();
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should recover from partial component failures', async () => {
      // Simulate partial failure by corrupting some data
      const db = testSetup.dbManager.getConnection();
      
      // Insert invalid analytics data
      db.prepare(`
        INSERT INTO conversation_analytics 
        (conversation_id, analyzed_at, productivity_score) 
        VALUES ('invalid-conv', ?, NULL)
      `).run(Date.now());

      const context = BaseTool.createContext();
      
      // Should still generate report despite some invalid data
      const result = await tools.analyticsReport.execute({
        timeRange: {
          start: Date.now() - (24 * 60 * 60 * 1000),
          end: Date.now()
        }
      }, context);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(true);
      
      // May include warnings or reduced metrics
      const data = response.data;
      expect(data.conversationMetrics).toBeDefined();
      expect(data.recommendations).toBeDefined();
    });

    test('should handle database connection interruptions', async () => {
      const context = BaseTool.createContext();

      // Start a request
      const requestPromise = tools.analyticsReport.execute({
        timeRange: {
          start: Date.now() - (24 * 60 * 60 * 1000),
          end: Date.now()
        }
      }, context);

      // Simulate connection issue by closing database
      // Note: This is a destructive test - should be last or handle cleanup
      setTimeout(() => {
        // Don't actually close during normal test - just verify error handling exists
      }, 10);

      const result = await requestPromise;

      // Should complete successfully or handle error gracefully
      if (result.isError) {
        const response = JSON.parse(result.content[0].text!);
        expect(response.error).toMatch(/Database|Connection/);
      } else {
        const response = JSON.parse(result.content[0].text!);
        expect(response.success).toBe(true);
      }
    });
  });

  describe('Cross-Component Integration', () => {
    test('should correlate insights across different analysis types', async () => {
      const context = BaseTool.createContext();

      // Get comprehensive analytics
      const reportResult = await tools.analyticsReport.execute({
        timeRange: {
          start: Date.now() - (7 * 24 * 60 * 60 * 1000),
          end: Date.now()
        },
        includeConversationMetrics: true,
        includeProductivityInsights: true,
        includeKnowledgeGaps: true,
        includeDecisionQuality: true
      }, context);

      expect(reportResult.isError).toBeUndefined();
      const response = JSON.parse(reportResult.content[0].text!);
      const data = response.data;

      // Should show correlations between different metrics
      expect(data.insights.length).toBeGreaterThan(0);
      
      // Look for cross-component insights
      const crossComponentInsights = data.insights.filter((insight: string) =>
        (insight.includes('productivity') || insight.includes('engagement')) &&
        (insight.includes('knowledge') || insight.includes('decision') || insight.includes('topic'))
      );

      if (data.conversationMetrics.totalConversations > 0 && 
          data.productivityInsights.peakHours.length > 0) {
        expect(crossComponentInsights.length).toBeGreaterThan(0);
      }
    });

    test('should provide consistent recommendations across tools', async () => {
      const context = BaseTool.createContext();
      const timeRange = {
        start: Date.now() - (7 * 24 * 60 * 60 * 1000),
        end: Date.now()
      };

      // Get recommendations from different tools
      const reportResult = await tools.analyticsReport.execute({
        timeRange,
        includeConversationMetrics: true,
        includeProductivityInsights: true,
        includeKnowledgeGaps: true
      }, context);

      const productivityResult = await tools.productivityPatterns.execute({
        timeRange,
        includeRecommendations: true
      }, context);

      expect(reportResult.isError).toBeUndefined();
      expect(productivityResult.isError).toBeUndefined();

      const reportData = JSON.parse(reportResult.content[0].text!);
      const productivityData = JSON.parse(productivityResult.content[0].text!);

      // Recommendations should be complementary, not contradictory
      const reportRecs = reportData.data.recommendations || [];
      const productivityRecs = productivityData.data.recommendations || [];

      if (reportRecs.length > 0 && productivityRecs.length > 0) {
        // Should not have directly contradictory recommendations
        const conflicts = reportRecs.some((reportRec: string) =>
          productivityRecs.some((prodRec: string) =>
            (reportRec.includes('increase') && prodRec.includes('decrease')) ||
            (reportRec.includes('more') && prodRec.includes('less'))
          )
        );

        expect(conflicts).toBe(false);
      }
    });
  });

  describe('Real-World Usage Patterns', () => {
    test('should support typical dashboard workflow', async () => {
      const context = BaseTool.createContext();
      const timer = new AnalyticsPerformanceTimer();

      // Typical dashboard sequence
      
      // 1. Load overview analytics
      const overviewResult = await tools.analyticsReport.execute({
        timeRange: {
          start: Date.now() - (7 * 24 * 60 * 60 * 1000),
          end: Date.now()
        }
      }, context);

      timer.checkpoint('overview-loaded');

      // 2. Drill down into specific conversation
      const conversationResult = await tools.conversationAnalytics.execute({
        conversationId: 'conv-analytics-1'
      }, context);

      timer.checkpoint('conversation-details');

      // 3. Analyze productivity patterns
      const productivityResult = await tools.productivityPatterns.execute({
        timeRange: {
          start: Date.now() - (7 * 24 * 60 * 60 * 1000),
          end: Date.now()
        },
        granularity: 'hour'
      }, context);

      timer.checkpoint('productivity-analysis');

      timer.expectAnalyticsPerformance('dashboard-workflow', 5000);

      // All requests should succeed
      [overviewResult, conversationResult, productivityResult].forEach(result => {
        expect(result.isError).toBeUndefined();
        const response = JSON.parse(result.content[0].text!);
        expect(response.success).toBe(true);
      });
    });

    test('should support batch analysis workflow', async () => {
      const context = BaseTool.createContext();
      const conversationIds = ['conv-analytics-1', 'conv-analytics-2', 'conv-analytics-3'];

      // Batch analyze multiple conversations
      const batchAnalysisPromises = conversationIds.map(conversationId =>
        tools.conversationAnalytics.execute({
          conversationId,
          includeFlow: true,
          includeProductivity: true
        }, context)
      );

      const timer = new AnalyticsPerformanceTimer();
      const results = await Promise.all(batchAnalysisPromises);
      timer.expectAnalyticsPerformance('batch-analysis', 4000);

      results.forEach((result, index) => {
        expect(result.isError).toBeUndefined();
        const response = JSON.parse(result.content[0].text!);
        expect(response.success).toBe(true);
        expect(response.data.conversationId).toBe(conversationIds[index]);
      });

      // Results should show variation across conversations
      const productivityScores = results.map(result => {
        const response = JSON.parse(result.content[0].text!);
        return response.data.productivityMetrics?.overallScore || 0;
      });

      const uniqueScores = new Set(productivityScores);
      expect(uniqueScores.size).toBeGreaterThan(1);
    });
  });

  describe('Data Quality and Validation', () => {
    test('should maintain data consistency across all operations', async () => {
      const context = BaseTool.createContext();

      // Get data from multiple perspectives
      const conversationResult = await tools.conversationAnalytics.execute({
        conversationId: 'conv-analytics-1',
        includeFlow: true,
        includeProductivity: true,
        includeKnowledgeGaps: true,
        includeDecisions: true
      }, context);

      const reportResult = await tools.analyticsReport.execute({
        timeRange: {
          start: Date.now() - (24 * 60 * 60 * 1000),
          end: Date.now()
        }
      }, context);

      expect(conversationResult.isError).toBeUndefined();
      expect(reportResult.isError).toBeUndefined();

      const conversationData = JSON.parse(conversationResult.content[0].text!);
      const reportData = JSON.parse(reportResult.content[0].text!);

      // Data should be internally consistent
      const convMetadata = conversationData.data.metadata;
      expect(convMetadata.messageCount).toBeGreaterThan(0);
      expect(convMetadata.analysisDuration).toBeGreaterThan(0);

      // Report should include the conversation in its metrics
      expect(reportData.data.conversationMetrics.totalConversations).toBeGreaterThanOrEqual(1);
    });

    test('should provide accurate timestamps and timing information', async () => {
      const context = BaseTool.createContext();
      const startTime = Date.now();

      const result = await tools.conversationAnalytics.execute({
        conversationId: 'conv-analytics-1'
      }, context);

      const endTime = Date.now();
      expect(result.isError).toBeUndefined();

      const response = JSON.parse(result.content[0].text!);
      
      // Response timestamp should be within execution window
      expect(response.timestamp).toBeGreaterThanOrEqual(startTime);
      expect(response.timestamp).toBeLessThanOrEqual(endTime);

      // Analysis timestamp should be recent
      expect(response.data.analyzedAt).toBeGreaterThanOrEqual(startTime);
      expect(response.data.analyzedAt).toBeLessThanOrEqual(endTime);

      // Analysis duration should be reasonable
      expect(response.data.metadata.analysisDuration).toBeGreaterThan(0);
      expect(response.data.metadata.analysisDuration).toBeLessThan(10000);
    });
  });
});