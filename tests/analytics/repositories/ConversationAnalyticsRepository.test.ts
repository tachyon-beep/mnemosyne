/**
 * Conversation Analytics Repository Test Suite
 * 
 * Tests the conversation analytics repository including:
 * - CRUD operations for analytics data
 * - Time-based queries and filtering
 * - Aggregation and statistics
 * - Performance optimization
 * - Data integrity and validation
 */

import { ConversationAnalyticsRepository, ConversationAnalytics, TimeRange } from '../../../src/analytics/repositories/ConversationAnalyticsRepository';
import {
  createAnalyticsTestDatabase,
  insertAnalyticsTestData,
  createAnalyticsTestData,
  AnalyticsPerformanceTimer,
  expectAnalyticsScore,
  setupAnalyticsMockTime,
  restoreAnalyticsTime
} from '../setup';

describe('ConversationAnalyticsRepository', () => {
  let dbManager: any;
  let repository: ConversationAnalyticsRepository;

  beforeEach(async () => {
    dbManager = await createAnalyticsTestDatabase();
    repository = new ConversationAnalyticsRepository(dbManager);
    
    // Insert test data
    const testData = createAnalyticsTestData();
    await insertAnalyticsTestData(dbManager, testData);
    
    setupAnalyticsMockTime();
  });

  afterEach(async () => {
    await dbManager.close();
    restoreAnalyticsTime();
  });

  describe('Basic CRUD Operations', () => {
    test('should create new analytics record', async () => {
      const analytics: Omit<ConversationAnalytics, 'id' | 'createdAt' | 'updatedAt'> = {
        conversationId: 'test-conv-new',
        analyzedAt: Date.now(),
        topicCount: 5,
        topicTransitions: 3,
        depthScore: 78.5,
        circularityIndex: 0.25,
        productivityScore: 85.2,
        resolutionTime: 1800000,
        insightCount: 4,
        breakthroughCount: 2,
        questionQualityAvg: 82.1,
        responseQualityAvg: 87.3,
        engagementScore: 79.8,
        metadata: {
          analyzer: 'v1.2.0',
          processingTime: 1250,
          confidence: 0.89
        }
      };

      const timer = new AnalyticsPerformanceTimer();
      const created = await repository.create(analytics);
      timer.expectAnalyticsPerformance('create-analytics', 100);

      expect(created).toBeDefined();
      expect(created.id).toBeDefined();
      expect(created.conversationId).toBe(analytics.conversationId);
      expectAnalyticsScore(created.depthScore, 70, 90, 'created depth score');
      expectAnalyticsScore(created.productivityScore, 80, 90, 'created productivity score');
      expect(created.createdAt).toBeDefined();
      expect(created.updatedAt).toBeDefined();
    });

    test('should find analytics by ID', async () => {
      // First create an analytics record
      const analytics = await repository.create({
        conversationId: 'test-conv-find',
        analyzedAt: Date.now(),
        topicCount: 3,
        depthScore: 65.0,
        circularityIndex: 0.1,
        productivityScore: 72.5,
        insightCount: 2
      });

      const found = await repository.findById(analytics.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(analytics.id);
      expect(found!.conversationId).toBe('test-conv-find');
      expect(found!.depthScore).toBe(65.0);
      expect(found!.productivityScore).toBe(72.5);
    });

    test('should update existing analytics record', async () => {
      const analytics = await repository.create({
        conversationId: 'test-conv-update',
        analyzedAt: Date.now(),
        topicCount: 2,
        depthScore: 45.0,
        circularityIndex: 0.05,
        productivityScore: 60.0,
        insightCount: 1
      });

      const updates = {
        topicCount: 4,
        depthScore: 80.5,
        productivityScore: 88.2,
        insightCount: 3,
        breakthroughCount: 1
      };

      const timer = new AnalyticsPerformanceTimer();
      const updated = await repository.update(analytics.id, updates);
      timer.expectAnalyticsPerformance('update-analytics', 100);

      expect(updated).toBeDefined();
      expect(updated!.topicCount).toBe(4);
      expect(updated!.depthScore).toBe(80.5);
      expect(updated!.productivityScore).toBe(88.2);
      expect(updated!.insightCount).toBe(3);
      expect(updated!.breakthroughCount).toBe(1);
      expect(updated!.updatedAt).toBeGreaterThan(analytics.updatedAt);
    });

    test('should delete analytics record', async () => {
      const analytics = await repository.create({
        conversationId: 'test-conv-delete',
        analyzedAt: Date.now(),
        topicCount: 1,
        depthScore: 30.0,
        circularityIndex: 0.0,
        productivityScore: 40.0,
        insightCount: 0
      });

      const deleted = await repository.delete(analytics.id);
      expect(deleted).toBe(true);

      const found = await repository.findById(analytics.id);
      expect(found).toBeNull();
    });

    test('should return null for non-existent records', async () => {
      const found = await repository.findById('non-existent-id');
      expect(found).toBeNull();

      const updated = await repository.update('non-existent-id', { topicCount: 5 });
      expect(updated).toBeNull();

      const deleted = await repository.delete('non-existent-id');
      expect(deleted).toBe(false);
    });
  });

  describe('Conversation-based Queries', () => {
    test('should find analytics by conversation ID', async () => {
      const conversationId = 'test-conversation-query';
      
      // Create multiple analytics for the same conversation
      await repository.create({
        conversationId,
        analyzedAt: Date.now() - 3600000,
        topicCount: 3,
        depthScore: 65.0,
        productivityScore: 70.0,
        insightCount: 2
      });

      await repository.create({
        conversationId,
        analyzedAt: Date.now() - 1800000,
        topicCount: 5,
        depthScore: 78.0,
        productivityScore: 82.0,
        insightCount: 4
      });

      await repository.create({
        conversationId,
        analyzedAt: Date.now(),
        topicCount: 7,
        depthScore: 85.0,
        productivityScore: 90.0,
        insightCount: 6
      });

      const analytics = await repository.findByConversationId(conversationId);

      expect(analytics).toHaveLength(3);
      analytics.forEach(record => {
        expect(record.conversationId).toBe(conversationId);
      });

      // Should be ordered by analyzedAt descending (most recent first)
      expect(analytics[0].analyzedAt).toBeGreaterThan(analytics[1].analyzedAt);
      expect(analytics[1].analyzedAt).toBeGreaterThan(analytics[2].analyzedAt);
    });

    test('should get latest analytics for conversation', async () => {
      const conversationId = 'test-latest-analytics';
      
      const older = await repository.create({
        conversationId,
        analyzedAt: Date.now() - 7200000, // 2 hours ago
        topicCount: 3,
        depthScore: 65.0,
        productivityScore: 70.0
      });

      const latest = await repository.create({
        conversationId,
        analyzedAt: Date.now() - 1800000, // 30 minutes ago
        topicCount: 5,
        depthScore: 85.0,
        productivityScore: 90.0
      });

      const result = await repository.getLatestByConversationId(conversationId);

      expect(result).toBeDefined();
      expect(result!.id).toBe(latest.id);
      expect(result!.analyzedAt).toBe(latest.analyzedAt);
      expect(result!.topicCount).toBe(5);
    });

    test('should find analytics for multiple conversations', async () => {
      const conversationIds = ['conv-multi-1', 'conv-multi-2', 'conv-multi-3'];
      
      for (const conversationId of conversationIds) {
        await repository.create({
          conversationId,
          analyzedAt: Date.now(),
          topicCount: Math.floor(Math.random() * 10) + 1,
          depthScore: Math.random() * 100,
          productivityScore: Math.random() * 100,
          insightCount: Math.floor(Math.random() * 5)
        });
      }

      const analytics = await repository.findByConversationIds(conversationIds);

      expect(analytics).toHaveLength(3);
      const foundConversationIds = analytics.map(a => a.conversationId);
      expect(foundConversationIds.sort()).toEqual(conversationIds.sort());
    });
  });

  describe('Time-based Queries', () => {
    test('should find analytics within time range', async () => {
      const now = Date.now();
      const timeRange: TimeRange = {
        start: now - (24 * 60 * 60 * 1000), // 24 hours ago
        end: now
      };

      // Create analytics within and outside the range
      const withinRange1 = await repository.create({
        conversationId: 'time-test-1',
        analyzedAt: now - (12 * 60 * 60 * 1000), // 12 hours ago (within)
        topicCount: 3,
        depthScore: 70.0,
        productivityScore: 75.0
      });

      const withinRange2 = await repository.create({
        conversationId: 'time-test-2',
        analyzedAt: now - (6 * 60 * 60 * 1000), // 6 hours ago (within)
        topicCount: 5,
        depthScore: 85.0,
        productivityScore: 90.0
      });

      const outsideRange = await repository.create({
        conversationId: 'time-test-3',
        analyzedAt: now - (36 * 60 * 60 * 1000), // 36 hours ago (outside)
        topicCount: 2,
        depthScore: 50.0,
        productivityScore: 60.0
      });

      const timer = new AnalyticsPerformanceTimer();
      const results = await repository.findByTimeRange(timeRange);
      timer.expectAnalyticsPerformance('time-range-query', 200);

      expect(results.length).toBeGreaterThanOrEqual(2);
      
      const foundIds = results.map(r => r.id);
      expect(foundIds).toContain(withinRange1.id);
      expect(foundIds).toContain(withinRange2.id);
      expect(foundIds).not.toContain(outsideRange.id);

      // Verify all results are within range
      results.forEach(result => {
        expect(result.analyzedAt).toBeGreaterThanOrEqual(timeRange.start);
        expect(result.analyzedAt).toBeLessThanOrEqual(timeRange.end);
      });
    });

    test('should find analytics with pagination', async () => {
      const conversationId = 'pagination-test';
      
      // Create many analytics records
      const createPromises = [];
      for (let i = 0; i < 25; i++) {
        createPromises.push(repository.create({
          conversationId: `${conversationId}-${i}`,
          analyzedAt: Date.now() - (i * 60000), // Each minute apart
          topicCount: i % 10,
          depthScore: (i * 3) % 100,
          productivityScore: (i * 4) % 100,
          insightCount: i % 5
        }));
      }
      
      await Promise.all(createPromises);

      // Test pagination
      const page1 = await repository.findAll({ limit: 10, offset: 0 });
      const page2 = await repository.findAll({ limit: 10, offset: 10 });
      const page3 = await repository.findAll({ limit: 10, offset: 20 });

      expect(page1).toHaveLength(10);
      expect(page2).toHaveLength(10);
      expect(page3.length).toBeGreaterThan(0);
      expect(page3.length).toBeLessThanOrEqual(10);

      // Pages should not overlap
      const page1Ids = new Set(page1.map(p => p.id));
      const page2Ids = new Set(page2.map(p => p.id));
      const page3Ids = new Set(page3.map(p => p.id));

      expect(page1Ids.size).toBe(10);
      expect(page2Ids.size).toBe(10);
      
      // No overlap between pages
      page1Ids.forEach(id => {
        expect(page2Ids.has(id)).toBe(false);
        expect(page3Ids.has(id)).toBe(false);
      });
    });
  });

  describe('Aggregation and Statistics', () => {
    test('should calculate basic statistics', async () => {
      // Create records with known values for testing
      await repository.create({
        conversationId: 'stats-1',
        analyzedAt: Date.now(),
        topicCount: 5,
        depthScore: 80.0,
        productivityScore: 85.0,
        insightCount: 3
      });

      await repository.create({
        conversationId: 'stats-2',
        analyzedAt: Date.now(),
        topicCount: 3,
        depthScore: 60.0,
        productivityScore: 75.0,
        insightCount: 2
      });

      await repository.create({
        conversationId: 'stats-3',
        analyzedAt: Date.now(),
        topicCount: 7,
        depthScore: 90.0,
        productivityScore: 95.0,
        insightCount: 5
      });

      const timer = new AnalyticsPerformanceTimer();
      const stats = await repository.getStatistics();
      timer.expectAnalyticsPerformance('statistics-calculation', 300);

      expect(stats).toBeDefined();
      expect(stats.totalRecords).toBeGreaterThanOrEqual(3);
      expect(stats.averageDepthScore).toBeGreaterThan(0);
      expect(stats.averageProductivityScore).toBeGreaterThan(0);
      expect(stats.averageTopicCount).toBeGreaterThan(0);
      expect(stats.averageInsightCount).toBeGreaterThanOrEqual(0);

      // Test calculated averages (approximate due to existing test data)
      expect(stats.averageDepthScore).toBeLessThanOrEqual(100);
      expect(stats.averageProductivityScore).toBeLessThanOrEqual(100);
    });

    test('should calculate statistics for time range', async () => {
      const now = Date.now();
      const timeRange: TimeRange = {
        start: now - (60 * 60 * 1000), // 1 hour ago
        end: now
      };

      // Create records within time range
      await repository.create({
        conversationId: 'time-stats-1',
        analyzedAt: now - (30 * 60 * 1000), // 30 minutes ago
        topicCount: 4,
        depthScore: 75.0,
        productivityScore: 80.0,
        insightCount: 3
      });

      await repository.create({
        conversationId: 'time-stats-2',
        analyzedAt: now - (15 * 60 * 1000), // 15 minutes ago
        topicCount: 6,
        depthScore: 85.0,
        productivityScore: 90.0,
        insightCount: 4
      });

      const stats = await repository.getStatistics(timeRange);

      expect(stats).toBeDefined();
      expect(stats.totalRecords).toBeGreaterThanOrEqual(2);
      expect(stats.averageDepthScore).toBeGreaterThan(70);
      expect(stats.averageProductivityScore).toBeGreaterThan(75);
    });

    test('should get productivity trends', async () => {
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      // Create data points over several days with varying productivity
      for (let i = 0; i < 7; i++) {
        await repository.create({
          conversationId: `trend-${i}`,
          analyzedAt: now - (i * dayMs),
          topicCount: 3 + i,
          depthScore: 60 + (i * 5),
          productivityScore: 70 + (i * 3), // Increasing trend
          insightCount: 1 + i
        });
      }

      const timeRange: TimeRange = {
        start: now - (7 * dayMs),
        end: now
      };

      const trends = await repository.getProductivityTrends(timeRange, 'day');

      expect(trends).toBeDefined();
      expect(Array.isArray(trends)).toBe(true);
      expect(trends.length).toBeGreaterThan(0);
      expect(trends.length).toBeLessThanOrEqual(7);

      trends.forEach(trend => {
        expect(trend).toHaveProperty('period');
        expect(trend).toHaveProperty('averageProductivityScore');
        expect(trend).toHaveProperty('conversationCount');
        expectAnalyticsScore(trend.averageProductivityScore, 0, 100, 'trend productivity');
        expect(trend.conversationCount).toBeGreaterThan(0);
      });

      // Should show increasing trend
      if (trends.length >= 2) {
        const earliestTrend = trends[trends.length - 1];
        const latestTrend = trends[0];
        expect(latestTrend.averageProductivityScore).toBeGreaterThan(earliestTrend.averageProductivityScore);
      }
    });
  });

  describe('Performance and Optimization', () => {
    test('should efficiently handle large datasets', async () => {
      // Create a large number of analytics records
      const createPromises = [];
      const baseTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        createPromises.push(repository.create({
          conversationId: `perf-conv-${i}`,
          analyzedAt: baseTime - (i * 60000), // Each minute apart
          topicCount: Math.floor(Math.random() * 15) + 1,
          depthScore: Math.random() * 100,
          circularityIndex: Math.random(),
          productivityScore: Math.random() * 100,
          insightCount: Math.floor(Math.random() * 10),
          breakthroughCount: Math.floor(Math.random() * 5),
          questionQualityAvg: Math.random() * 100,
          responseQualityAvg: Math.random() * 100,
          engagementScore: Math.random() * 100
        }));
      }

      const timer = new AnalyticsPerformanceTimer();
      await Promise.all(createPromises);
      timer.expectAnalyticsPerformance('bulk-create', 10000);

      // Test query performance on large dataset
      const queryTimer = new AnalyticsPerformanceTimer();
      
      const timeRange: TimeRange = {
        start: baseTime - (500 * 60000),
        end: baseTime
      };
      
      const results = await repository.findByTimeRange(timeRange);
      const stats = await repository.getStatistics(timeRange);
      
      queryTimer.expectAnalyticsPerformance('large-dataset-queries', 2000);

      expect(results.length).toBeGreaterThan(0);
      expect(stats.totalRecords).toBeGreaterThan(0);
    });

    test('should use database indexes effectively', async () => {
      const db = dbManager.getConnection();
      
      // Insert test data
      await repository.create({
        conversationId: 'index-test',
        analyzedAt: Date.now(),
        topicCount: 5,
        depthScore: 80.0,
        productivityScore: 85.0
      });

      // Test index usage with EXPLAIN QUERY PLAN
      const queryPlan = db.prepare(`
        EXPLAIN QUERY PLAN 
        SELECT * FROM conversation_analytics 
        WHERE conversation_id = 'index-test'
      `).all();

      // Should use the conversation index
      const usesIndex = queryPlan.some((step: any) => 
        step.detail.includes('idx_conversation_analytics_conversation')
      );
      
      expect(usesIndex).toBe(true);

      // Test productivity score index usage
      const productivityQueryPlan = db.prepare(`
        EXPLAIN QUERY PLAN 
        SELECT * FROM conversation_analytics 
        WHERE productivity_score > 80 
        ORDER BY analyzed_at DESC LIMIT 10
      `).all();

      const usesProductivityIndex = productivityQueryPlan.some((step: any) => 
        step.detail.includes('idx_conversation_analytics_productivity_time')
      );
      
      expect(usesProductivityIndex).toBe(true);
    });

    test('should handle concurrent operations safely', async () => {
      const conversationId = 'concurrent-test';
      
      // Simulate concurrent operations
      const operations = [];
      
      // Multiple creates
      for (let i = 0; i < 5; i++) {
        operations.push(repository.create({
          conversationId: `${conversationId}-${i}`,
          analyzedAt: Date.now() + i,
          topicCount: i + 1,
          depthScore: (i + 1) * 20,
          productivityScore: (i + 1) * 15,
          insightCount: i
        }));
      }

      // Multiple queries
      operations.push(repository.findByConversationId(conversationId));
      operations.push(repository.getStatistics());

      const timer = new AnalyticsPerformanceTimer();
      const results = await Promise.all(operations);
      timer.expectAnalyticsPerformance('concurrent-operations', 1000);

      // All create operations should succeed
      const createResults = results.slice(0, 5);
      createResults.forEach((result, index) => {
        expect(result).toBeDefined();
        expect((result as ConversationAnalytics).conversationId).toBe(`${conversationId}-${index}`);
      });

      // Query operations should also succeed
      const queryResults = results.slice(5);
      expect(queryResults[0]).toBeDefined(); // findByConversationId result
      expect(queryResults[1]).toBeDefined(); // getStatistics result
    });
  });

  describe('Data Validation and Integrity', () => {
    test('should validate required fields', async () => {
      const invalidData = [
        { /* missing conversationId */ analyzedAt: Date.now() },
        { conversationId: '', analyzedAt: Date.now() },
        { conversationId: 'valid', /* missing analyzedAt */ },
        { conversationId: 'valid', analyzedAt: 'invalid-timestamp' }
      ];

      for (const data of invalidData) {
        await expect(repository.create(data as any)).rejects.toThrow();
      }
    });

    test('should validate score ranges', async () => {
      const invalidScores = [
        { depthScore: -10 },
        { depthScore: 150 },
        { circularityIndex: -0.5 },
        { circularityIndex: 2.0 },
        { productivityScore: -5 },
        { productivityScore: 110 }
      ];

      for (const scoreData of invalidScores) {
        await expect(repository.create({
          conversationId: 'score-validation-test',
          analyzedAt: Date.now(),
          topicCount: 5,
          ...scoreData
        } as any)).rejects.toThrow();
      }
    });

    test('should handle metadata correctly', async () => {
      const metadata = {
        analyzer: 'test-analyzer-v2',
        confidence: 0.95,
        processingTime: 1500,
        features: ['flow', 'productivity', 'insights'],
        thresholds: {
          minTopicCount: 2,
          maxCircularity: 0.8
        }
      };

      const analytics = await repository.create({
        conversationId: 'metadata-test',
        analyzedAt: Date.now(),
        topicCount: 6,
        depthScore: 82.5,
        productivityScore: 78.9,
        metadata
      });

      expect(analytics.metadata).toEqual(metadata);

      // Retrieve and verify metadata persistence
      const retrieved = await repository.findById(analytics.id);
      expect(retrieved!.metadata).toEqual(metadata);
    });

    test('should maintain referential integrity', async () => {
      // Note: This test assumes foreign key constraints are enabled
      // The actual constraint enforcement depends on database configuration
      
      const validAnalytics = await repository.create({
        conversationId: 'integrity-test',
        analyzedAt: Date.now(),
        topicCount: 3,
        depthScore: 70.0,
        productivityScore: 75.0
      });

      expect(validAnalytics).toBeDefined();
      expect(validAnalytics.conversationId).toBe('integrity-test');
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      // Close the database connection
      await dbManager.close();

      await expect(repository.findAll()).rejects.toThrow();
      await expect(repository.create({
        conversationId: 'error-test',
        analyzedAt: Date.now(),
        topicCount: 1
      })).rejects.toThrow();
    });

    test('should handle malformed queries gracefully', async () => {
      // Test with invalid time ranges
      const invalidTimeRange = {
        start: Date.now(),
        end: Date.now() - (24 * 60 * 60 * 1000) // End before start
      };

      await expect(repository.findByTimeRange(invalidTimeRange)).rejects.toThrow();

      // Test with invalid limits
      await expect(repository.findAll({ limit: -1 })).rejects.toThrow();
      await expect(repository.findAll({ offset: -1 })).rejects.toThrow();
    });

    test('should handle transaction rollbacks', async () => {
      const db = dbManager.getConnection();
      
      // Start a transaction that will be rolled back
      const transaction = db.transaction(() => {
        // This would normally create a record
        db.prepare(`
          INSERT INTO conversation_analytics (conversation_id, analyzed_at, topic_count, depth_score, productivity_score)
          VALUES ('rollback-test', ?, 5, 80.0, 85.0)
        `).run(Date.now());
        
        // But we'll throw an error to cause rollback
        throw new Error('Intentional rollback');
      });

      expect(() => transaction()).toThrow('Intentional rollback');

      // Verify the record was not created
      const found = await repository.findByConversationId('rollback-test');
      expect(found).toHaveLength(0);
    });
  });
});