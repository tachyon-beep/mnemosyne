/**
 * Analytics Engine Test Suite
 * 
 * Tests the central analytics engine including:
 * - Report generation and caching
 * - Conversation analysis coordination
 * - Performance and optimization
 * - Error handling and recovery
 * - Integration with all analytics components
 */

import { AnalyticsEngine, AnalyticsReport } from '../../../src/analytics/services/AnalyticsEngine';
import { 
  createTestAnalyticsEngine, 
  createAnalyticsTestData, 
  insertAnalyticsTestData,
  AnalyticsPerformanceTimer,
  expectAnalyticsScore,
  setupAnalyticsMockTime,
  restoreAnalyticsTime
} from '../setup';
import { TimeRange } from '../../../src/analytics/repositories';

describe('AnalyticsEngine', () => {
  let testSetup: any;
  let analyticsEngine: AnalyticsEngine;

  beforeEach(async () => {
    testSetup = await createTestAnalyticsEngine();
    analyticsEngine = testSetup.analyticsEngine;
    
    // Insert test data
    const testData = createAnalyticsTestData();
    await insertAnalyticsTestData(testSetup.dbManager, testData);
  });

  afterEach(async () => {
    await testSetup.dbManager.close();
    restoreAnalyticsTime();
  });

  describe('Configuration and Initialization', () => {
    test('should initialize with default configuration', () => {
      expect(analyticsEngine).toBeDefined();
      expect(typeof analyticsEngine.generateAnalyticsReport).toBe('function');
      expect(typeof analyticsEngine.analyzeConversation).toBe('function');
    });

    test('should accept custom configuration', async () => {
      const customConfig = {
        enableIncrementalProcessing: false,
        cacheExpirationMinutes: 120,
        batchProcessingSize: 25,
        maxProcessingTimeMs: 15000
      };

      const customEngine = new AnalyticsEngine(testSetup.dbManager, customConfig);
      expect(customEngine).toBeDefined();
    });
  });

  describe('Report Generation', () => {
    test('should generate comprehensive analytics report', async () => {
      const timeRange: TimeRange = {
        start: Date.now() - (7 * 24 * 60 * 60 * 1000), // 7 days ago
        end: Date.now()
      };

      const timer = new AnalyticsPerformanceTimer();
      const report = await analyticsEngine.generateAnalyticsReport(timeRange);
      timer.expectAnalyticsPerformance('generateAnalyticsReport', 5000);

      // Verify report structure
      expect(report).toHaveProperty('generatedAt');
      expect(report).toHaveProperty('timeRange');
      expect(report).toHaveProperty('conversationMetrics');
      expect(report).toHaveProperty('productivityInsights');
      expect(report).toHaveProperty('knowledgeGaps');
      expect(report).toHaveProperty('decisionQuality');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('insights');

      // Verify time range
      expect(report.timeRange.start).toBe(timeRange.start);
      expect(report.timeRange.end).toBe(timeRange.end);

      // Verify conversation metrics
      expect(report.conversationMetrics.totalConversations).toBeGreaterThan(0);
      expectAnalyticsScore(report.conversationMetrics.averageProductivity, 0, 100, 'averageProductivity');
      expectAnalyticsScore(report.conversationMetrics.averageDepth, 0, 100, 'averageDepth');

      // Verify productivity insights
      expect(Array.isArray(report.productivityInsights.peakHours)).toBe(true);
      expect(report.productivityInsights.optimalSessionLength).toBeGreaterThan(0);
      expect(Array.isArray(report.productivityInsights.topQuestionPatterns)).toBe(true);

      // Verify knowledge gaps
      expect(report.knowledgeGaps.totalUnresolved).toBeGreaterThanOrEqual(0);
      expect(report.knowledgeGaps.criticalGaps).toBeGreaterThanOrEqual(0);

      // Verify decision quality
      expect(report.decisionQuality.totalDecisions).toBeGreaterThanOrEqual(0);
      if (report.decisionQuality.totalDecisions > 0) {
        expectAnalyticsScore(report.decisionQuality.averageQuality, 0, 100, 'averageQuality');
      }

      // Verify recommendations and insights
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(Array.isArray(report.insights)).toBe(true);
    });

    test('should handle empty time ranges gracefully', async () => {
      const timeRange: TimeRange = {
        start: Date.now() + (24 * 60 * 60 * 1000), // Future start
        end: Date.now() + (2 * 24 * 60 * 60 * 1000) // Future end
      };

      const report = await analyticsEngine.generateAnalyticsReport(timeRange);

      expect(report).toBeDefined();
      expect(report.conversationMetrics.totalConversations).toBe(0);
      expect(report.productivityInsights.peakHours).toEqual([]);
      expect(report.knowledgeGaps.totalUnresolved).toBe(0);
      expect(report.decisionQuality.totalDecisions).toBe(0);
    });

    test('should generate reports for different time periods', async () => {
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      const timeRanges = [
        { name: 'last day', start: now - dayMs, end: now },
        { name: 'last week', start: now - (7 * dayMs), end: now },
        { name: 'last month', start: now - (30 * dayMs), end: now }
      ];

      for (const range of timeRanges) {
        const report = await analyticsEngine.generateAnalyticsReport({
          start: range.start,
          end: range.end
        });

        expect(report).toBeDefined();
        expect(report.timeRange.start).toBe(range.start);
        expect(report.timeRange.end).toBe(range.end);
      }
    });
  });

  describe('Conversation Analysis', () => {
    test('should analyze individual conversations comprehensively', async () => {
      const conversationId = 'conv-analytics-1';
      
      const timer = new AnalyticsPerformanceTimer();
      const analysis = await analyticsEngine.analyzeConversation(conversationId);
      timer.expectAnalyticsPerformance('analyzeConversation', 3000);

      expect(analysis).toBeDefined();
      expect(analysis.conversationId).toBe(conversationId);
      expect(analysis.analyzedAt).toBeDefined();

      // Should include flow metrics
      if (analysis.flowMetrics) {
        expect(analysis.flowMetrics.topicCount).toBeGreaterThan(0);
        expectAnalyticsScore(analysis.flowMetrics.depthScore, 0, 100, 'depthScore');
        expectAnalyticsScore(analysis.flowMetrics.circularityIndex, 0, 1, 'circularityIndex');
      }

      // Should include productivity metrics
      if (analysis.productivityMetrics) {
        expectAnalyticsScore(analysis.productivityMetrics.overallScore, 0, 100, 'overallScore');
        expect(analysis.productivityMetrics.messageCount).toBeGreaterThan(0);
      }

      // Should include insights
      expect(analysis.insights).toBeDefined();
      expect(analysis.insights.qualityScore).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(analysis.insights.strengths)).toBe(true);
      expect(Array.isArray(analysis.insights.improvements)).toBe(true);
      expect(Array.isArray(analysis.insights.patterns)).toBe(true);

      // Should include metadata
      expect(analysis.metadata).toBeDefined();
      expect(analysis.metadata.messageCount).toBeGreaterThan(0);
      expect(analysis.metadata.analysisDuration).toBeGreaterThan(0);
      expect(Array.isArray(analysis.metadata.componentsIncluded)).toBe(true);
    });

    test('should handle non-existent conversations', async () => {
      await expect(
        analyticsEngine.analyzeConversation('non-existent-conversation')
      ).rejects.toThrow();
    });

    test('should support selective analysis components', async () => {
      const conversationId = 'conv-analytics-1';
      
      const options = {
        includeFlow: true,
        includeProductivity: false,
        includeKnowledgeGaps: true,
        includeDecisions: false
      };

      const analysis = await analyticsEngine.analyzeConversation(conversationId, options);

      expect(analysis.flowMetrics).toBeDefined();
      expect(analysis.productivityMetrics).toBeUndefined();
      expect(analysis.knowledgeGaps).toBeDefined();
      expect(analysis.decisions).toBeUndefined();

      expect(analysis.metadata.componentsIncluded).toContain('flow');
      expect(analysis.metadata.componentsIncluded).toContain('knowledgeGaps');
      expect(analysis.metadata.componentsIncluded).not.toContain('productivity');
      expect(analysis.metadata.componentsIncluded).not.toContain('decisions');
    });
  });

  describe('Caching System', () => {
    test('should cache report results for performance', async () => {
      const timeRange: TimeRange = {
        start: Date.now() - (24 * 60 * 60 * 1000),
        end: Date.now()
      };

      // First call - should compute and cache
      const timer1 = new AnalyticsPerformanceTimer();
      const report1 = await analyticsEngine.generateAnalyticsReport(timeRange);
      const firstCallTime = timer1.elapsed();

      // Second call - should use cache
      const timer2 = new AnalyticsPerformanceTimer();
      const report2 = await analyticsEngine.generateAnalyticsReport(timeRange);
      const secondCallTime = timer2.elapsed();

      // Cached call should be significantly faster
      expect(secondCallTime).toBeLessThan(firstCallTime * 0.5);
      
      // Results should be identical
      expect(report1.generatedAt).toBe(report2.generatedAt);
      expect(report1.conversationMetrics.totalConversations).toBe(report2.conversationMetrics.totalConversations);
    });

    test('should respect cache expiration', async () => {
      // Create engine with very short cache expiration
      const shortCacheEngine = new AnalyticsEngine(testSetup.dbManager, {
        cacheExpirationMinutes: 0.01 // 0.6 seconds
      });

      const timeRange: TimeRange = {
        start: Date.now() - (24 * 60 * 60 * 1000),
        end: Date.now()
      };

      // First call
      const report1 = await shortCacheEngine.generateAnalyticsReport(timeRange);
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 700));
      
      // Second call should regenerate
      const report2 = await shortCacheEngine.generateAnalyticsReport(timeRange);
      
      // Should have different generation times
      expect(report2.generatedAt).toBeGreaterThan(report1.generatedAt);
    });

    test('should provide cache management functions', async () => {
      const timeRange: TimeRange = {
        start: Date.now() - (24 * 60 * 60 * 1000),
        end: Date.now()
      };

      // Generate and cache a report
      await analyticsEngine.generateAnalyticsReport(timeRange);

      // Clear cache
      analyticsEngine.clearCache();

      // Next call should regenerate (test indirectly by timing)
      const timer = new AnalyticsPerformanceTimer();
      await analyticsEngine.generateAnalyticsReport(timeRange);
      const regenerationTime = timer.elapsed();

      // Should take meaningful time to regenerate
      expect(regenerationTime).toBeGreaterThan(10);
    });
  });

  describe('Performance Optimization', () => {
    test('should handle large datasets efficiently', async () => {
      // Insert additional large dataset
      const db = testSetup.dbManager.getConnection();
      const now = Date.now();

      // Insert many analytics records
      const insertAnalytics = db.prepare(`
        INSERT INTO conversation_analytics 
        (conversation_id, analyzed_at, productivity_score, insight_count, topic_count, depth_score)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const transaction = db.transaction(() => {
        for (let i = 0; i < 500; i++) {
          insertAnalytics.run(
            `large-conv-${i}`,
            now - (i * 1000),
            Math.random() * 100,
            Math.floor(Math.random() * 10),
            Math.floor(Math.random() * 15),
            Math.random() * 100
          );
        }
      });
      
      transaction();

      // Test performance with large dataset
      const timeRange: TimeRange = {
        start: now - (24 * 60 * 60 * 1000),
        end: now
      };

      const timer = new AnalyticsPerformanceTimer();
      const report = await analyticsEngine.generateAnalyticsReport(timeRange);
      timer.expectAnalyticsPerformance('generateAnalyticsReport-large', 8000);

      expect(report).toBeDefined();
      expect(report.conversationMetrics.totalConversations).toBeGreaterThan(100);
    });

    test('should respect processing time limits', async () => {
      // Create engine with very short processing time limit
      const limitedEngine = new AnalyticsEngine(testSetup.dbManager, {
        maxProcessingTimeMs: 100 // Very short limit
      });

      const timeRange: TimeRange = {
        start: Date.now() - (30 * 24 * 60 * 60 * 1000), // 30 days
        end: Date.now()
      };

      // Should not take longer than specified limit + buffer
      const timer = new AnalyticsPerformanceTimer();
      const report = await limitedEngine.generateAnalyticsReport(timeRange);
      
      // Should complete but may have reduced accuracy due to time constraints
      expect(report).toBeDefined();
      expect(timer.elapsed()).toBeLessThan(2000); // Allow some buffer
    });

    test('should use batch processing for efficiency', async () => {
      // Create engine with small batch size to test batching
      const batchEngine = new AnalyticsEngine(testSetup.dbManager, {
        batchProcessingSize: 2
      });

      const timeRange: TimeRange = {
        start: Date.now() - (7 * 24 * 60 * 60 * 1000),
        end: Date.now()
      };

      // Should still produce complete results despite batching
      const report = await batchEngine.generateAnalyticsReport(timeRange);
      
      expect(report).toBeDefined();
      expect(report.conversationMetrics.totalConversations).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle database errors gracefully', async () => {
      // Close the database to simulate connection error
      await testSetup.dbManager.close();

      const timeRange: TimeRange = {
        start: Date.now() - (24 * 60 * 60 * 1000),
        end: Date.now()
      };

      await expect(
        analyticsEngine.generateAnalyticsReport(timeRange)
      ).rejects.toThrow();
    });

    test('should provide partial results when some components fail', async () => {
      // This test would need mocking to simulate partial failures
      // For now, we'll test that the engine handles empty components gracefully
      const timeRange: TimeRange = {
        start: Date.now() + (24 * 60 * 60 * 1000), // Future range (empty)
        end: Date.now() + (2 * 24 * 60 * 60 * 1000)
      };

      const report = await analyticsEngine.generateAnalyticsReport(timeRange);
      
      // Should not throw and should provide empty but valid structure
      expect(report).toBeDefined();
      expect(report.conversationMetrics.totalConversations).toBe(0);
      expect(report.recommendations).toEqual([]);
      expect(report.insights).toEqual([]);
    });

    test('should validate input parameters', async () => {
      // Test invalid time range
      const invalidTimeRange: TimeRange = {
        start: Date.now(),
        end: Date.now() - (24 * 60 * 60 * 1000) // End before start
      };

      await expect(
        analyticsEngine.generateAnalyticsReport(invalidTimeRange)
      ).rejects.toThrow();
    });
  });

  describe('Integration with Analytics Components', () => {
    test('should coordinate all analyzer components', async () => {
      const conversationId = 'conv-analytics-3';
      
      const analysis = await analyticsEngine.analyzeConversation(conversationId, {
        includeFlow: true,
        includeProductivity: true,
        includeKnowledgeGaps: true,
        includeDecisions: true
      });

      // Verify all components were included
      expect(analysis.flowMetrics).toBeDefined();
      expect(analysis.productivityMetrics).toBeDefined();
      expect(analysis.knowledgeGaps).toBeDefined();
      expect(analysis.decisions).toBeDefined();

      // Verify cross-component insights
      expect(analysis.insights.qualityScore).toBeGreaterThan(0);
      expect(analysis.insights.patterns.length).toBeGreaterThan(0);
    });

    test('should maintain consistency across repository operations', async () => {
      const timeRange: TimeRange = {
        start: Date.now() - (7 * 24 * 60 * 60 * 1000),
        end: Date.now()
      };

      const report = await analyticsEngine.generateAnalyticsReport(timeRange);

      // Verify data consistency
      expect(report.conversationMetrics.totalConversations).toBeGreaterThanOrEqual(0);
      expect(report.conversationMetrics.totalInsights).toBeGreaterThanOrEqual(0);
      
      // If we have conversations, we should have some metrics
      if (report.conversationMetrics.totalConversations > 0) {
        expect(report.conversationMetrics.averageProductivity).toBeGreaterThan(0);
      }
    });

    test('should generate contextual recommendations', async () => {
      const timeRange: TimeRange = {
        start: Date.now() - (7 * 24 * 60 * 60 * 1000),
        end: Date.now()
      };

      const report = await analyticsEngine.generateAnalyticsReport(timeRange);

      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(Array.isArray(report.insights)).toBe(true);

      // Should provide recommendations when there's data to analyze
      if (report.conversationMetrics.totalConversations > 0) {
        expect(report.recommendations.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Time-based Analysis', () => {
    beforeEach(() => {
      setupAnalyticsMockTime(Date.now());
    });

    test('should handle different time granularities', async () => {
      const baseTime = Date.now();
      const hourMs = 60 * 60 * 1000;
      const dayMs = 24 * hourMs;

      const timeRanges = [
        { name: 'hourly', start: baseTime - hourMs, end: baseTime },
        { name: 'daily', start: baseTime - dayMs, end: baseTime },
        { name: 'weekly', start: baseTime - (7 * dayMs), end: baseTime }
      ];

      for (const range of timeRanges) {
        const report = await analyticsEngine.generateAnalyticsReport({
          start: range.start,
          end: range.end
        });

        expect(report).toBeDefined();
        expect(report.timeRange.start).toBe(range.start);
        expect(report.timeRange.end).toBe(range.end);
      }
    });

    test('should detect temporal patterns in productivity', async () => {
      const timeRange: TimeRange = {
        start: Date.now() - (7 * 24 * 60 * 60 * 1000),
        end: Date.now()
      };

      const report = await analyticsEngine.generateAnalyticsReport(timeRange);

      if (report.conversationMetrics.totalConversations > 0) {
        expect(Array.isArray(report.productivityInsights.peakHours)).toBe(true);
        expect(report.productivityInsights.optimalSessionLength).toBeGreaterThan(0);
        expect(typeof report.productivityInsights.weeklyTrend).toBe('number');
      }
    });
  });
});