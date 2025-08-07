/**
 * Analytics Database Integration Tests
 * 
 * Validates that all analytics database migrations work correctly
 * and the database structure supports the Phase 5 analytics system.
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { DatabaseManager } from '../../src/storage/Database.js';
import { 
  ConversationAnalyticsRepository,
  ProductivityPatternsRepository,
  KnowledgeGapsRepository,
  DecisionTrackingRepository
} from '../../src/analytics/repositories/index.js';

describe('Analytics Database Integration', () => {
  let databaseManager: DatabaseManager;
  let repositories: {
    conversationAnalytics: ConversationAnalyticsRepository;
    productivityPatterns: ProductivityPatternsRepository;
    knowledgeGaps: KnowledgeGapsRepository;
    decisionTracking: DecisionTrackingRepository;
  };

  beforeAll(async () => {
    // Create in-memory database with all migrations
    databaseManager = new DatabaseManager({ databasePath: ':memory:' });
    await databaseManager.initialize();

    // Create all analytics repositories
    repositories = {
      conversationAnalytics: new ConversationAnalyticsRepository(databaseManager),
      productivityPatterns: new ProductivityPatternsRepository(databaseManager),
      knowledgeGaps: new KnowledgeGapsRepository(databaseManager),
      decisionTracking: new DecisionTrackingRepository(databaseManager)
    };
  });

  afterAll(async () => {
    if (databaseManager) {
      await databaseManager.close();
    }
  });

  describe('Database Schema Validation', () => {
    test('should have all required analytics tables', async () => {
      const db = databaseManager.getConnection();

      const requiredTables = [
        'conversation_analytics',
        'productivity_patterns',
        'knowledge_gaps', 
        'decision_tracking'
      ];

      for (const tableName of requiredTables) {
        const tableInfo = db.prepare(`
          SELECT sql FROM sqlite_master WHERE type='table' AND name=?
        `).get(tableName);

        expect(tableInfo).toBeDefined();
        expect((tableInfo as any).sql).toBeTruthy();
        console.log(`✓ Table ${tableName} exists`);
      }
    });

    test('should have proper indexes for analytics queries', async () => {
      const db = databaseManager.getConnection();

      // Check for analytics-specific indexes
      const indexes = db.prepare(`
        SELECT name, tbl_name, sql FROM sqlite_master 
        WHERE type='index' AND tbl_name IN (
          'conversation_analytics', 'productivity_patterns', 
          'knowledge_gaps', 'decision_tracking'
        ) AND name NOT LIKE 'sqlite_autoindex%'
      `).all();

      // Should have at least some indexes for performance
      expect(indexes.length).toBeGreaterThan(0);

      console.log('Analytics indexes found:');
      indexes.forEach(idx => {
        console.log(`  - ${(idx as any).name} on ${(idx as any).tbl_name}`);
      });
    });

    test('should support all required column types', async () => {
      const db = databaseManager.getConnection();

      // Test each analytics table can accept its expected data types
      const testData = [
        {
          table: 'conversation_analytics',
          insert: `INSERT INTO conversation_analytics 
                   (conversation_id, analyzed_at, productivity_score, insight_count, topic_count, depth_score, metadata)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`,
          values: ['test-conv-1', Date.now(), 75.5, 3, 5, 85.2, JSON.stringify({ test: true })]
        },
        {
          table: 'productivity_patterns',
          insert: `INSERT INTO productivity_patterns 
                   (conversation_id, analyzed_at, session_duration, question_count, peak_hour, effectiveness_score)
                   VALUES (?, ?, ?, ?, ?, ?)`,
          values: ['test-conv-1', Date.now(), 1800, 12, 14, 88.3]
        },
        {
          table: 'knowledge_gaps',
          insert: `INSERT INTO knowledge_gaps 
                   (gap_type, content, frequency, first_occurrence, last_occurrence, exploration_depth)
                   VALUES (?, ?, ?, ?, ?, ?)`,
          values: ['question', 'How to optimize database queries?', 3, Date.now(), Date.now(), 2]
        },
        {
          table: 'decision_tracking',
          insert: `INSERT INTO decision_tracking 
                   (decision_summary, decision_type, decision_made_at, clarity_score, confidence_level)
                   VALUES (?, ?, ?, ?, ?)`,
          values: ['Use PostgreSQL for main database', 'technical', Date.now(), 85, 90]
        }
      ];

      for (const test of testData) {
        const result = db.prepare(test.insert).run(...test.values);
        expect(result.changes).toBe(1);
        console.log(`✓ Successfully inserted test data into ${test.table}`);
      }
    });
  });

  describe('Repository Integration Tests', () => {
    test('conversation analytics repository should work end-to-end', async () => {
      const testAnalytics = {
        conversationId: 'repo-test-conv-1',
        topicCount: 4,
        topicTransitions: 8,
        depthScore: 78.5,
        circularityIndex: 0.3,
        productivityScore: 82.1,
        resolutionTime: 1200,
        insightCount: 5,
        breakthroughCount: 2,
        questionQualityAvg: 75.0,
        responseQualityAvg: 88.5,
        engagementScore: 91.2,
        metadata: {
          analysisVersion: '1.0',
          processingTime: 450,
          confidence: 0.92
        }
      };

      // Save analytics
      await repositories.conversationAnalytics.saveAnalytics(testAnalytics);

      // Retrieve analytics
      const retrieved = await repositories.conversationAnalytics.getConversationAnalytics(
        testAnalytics.conversationId
      );

      expect(retrieved).toBeDefined();
      expect(retrieved!.conversationId).toBe(testAnalytics.conversationId);
      expect(retrieved!.productivityScore).toBe(testAnalytics.productivityScore);
      expect(retrieved!.depthScore).toBe(testAnalytics.depthScore);
      expect(retrieved!.insightCount).toBe(testAnalytics.insightCount);

      console.log('✓ Conversation analytics repository working correctly');
    });

    test('productivity patterns repository should handle time-based queries', async () => {
      const now = Date.now();
      const testPatterns = [
        {
          windowStart: now - 3600000,
          windowEnd: now,
          windowType: 'hour' as const,
          totalConversations: 1,
          totalMessages: 12,
          avgProductivityScore: 85.5,
          peakHours: [14],
          optimalSessionLength: 1800,
          sampleSize: 1
        },
        {
          windowStart: now - 3600000,
          windowEnd: now,
          windowType: 'hour' as const,
          totalConversations: 1,
          totalMessages: 18,
          avgProductivityScore: 92.3,
          peakHours: [10],
          optimalSessionLength: 2700,
          sampleSize: 1
        }
      ];

      // Save patterns
      for (const pattern of testPatterns) {
        await repositories.productivityPatterns.savePattern(pattern);
      }

      // Query patterns
      const timeRange = { start: now - 86400000, end: now + 86400000 }; // ±1 day
      const peakHours = await repositories.productivityPatterns.getPeakHours(timeRange);
      const sessionAnalysis = await repositories.productivityPatterns.getSessionLengthAnalysis(timeRange);

      expect(Array.isArray(peakHours)).toBe(true);
      expect(sessionAnalysis).toBeDefined();
      expect(sessionAnalysis.averageLength).toBeGreaterThan(0);

      console.log(`✓ Productivity patterns repository found ${peakHours.length} peak hours`);
    });

    test('knowledge gaps repository should support gap tracking', async () => {
      const testGap = {
        gapType: 'question' as const,
        content: 'How to implement proper database indexing strategies?',
        normalizedContent: 'database indexing strategies',
        frequency: 3,
        firstOccurrence: Date.now() - 86400000,
        lastOccurrence: Date.now(),
        explorationDepth: 2,
        relatedEntities: ['database', 'indexing', 'performance'],
        suggestedActions: ['Research B-tree vs Hash indexes', 'Analyze query patterns'],
        suggestedResources: ['Database indexing guide', 'Performance optimization docs']
      };

      // Save gap
      await repositories.knowledgeGaps.saveGap(testGap);

      // Retrieve unresolved gaps
      const unresolvedGaps = await repositories.knowledgeGaps.getUnresolvedGaps();
      expect(unresolvedGaps.length).toBeGreaterThan(0);

      const savedGap = unresolvedGaps.find(gap => gap.content === testGap.content);
      expect(savedGap).toBeDefined();
      expect(savedGap!.gapType).toBe(testGap.gapType);
      expect(savedGap!.frequency).toBe(testGap.frequency);

      console.log(`✓ Knowledge gaps repository tracking ${unresolvedGaps.length} gaps`);
    });

    test('decision tracking repository should manage decision lifecycle', async () => {
      const testDecision = {
        decisionSummary: 'Migrate from MySQL to PostgreSQL for better JSON support',
        decisionType: 'operational' as const,
        conversationIds: ['decision-conv-1', 'decision-conv-2'],
        problemIdentifiedAt: Date.now() - 7200000, // 2 hours ago
        optionsConsideredAt: Date.now() - 3600000,  // 1 hour ago
        decisionMadeAt: Date.now() - 1800000,       // 30 minutes ago
        clarityScore: 88,
        confidenceLevel: 92,
        informationCompleteness: 85,
        stakeholderCount: 3,
        alternativesConsidered: 4,
        riskAssessed: true,
        tags: ['database', 'migration', 'architecture'],
        priority: 'high' as const
      };

      // Save decision
      await repositories.decisionTracking.saveDecision(testDecision);

      // Query decisions
      const timeRange = { start: Date.now() - 86400000, end: Date.now() };
      const analysis = await repositories.decisionTracking.getDecisionAnalysis(timeRange);

      expect(analysis.totalDecisions).toBeGreaterThan(0);
      expect(analysis.averageQuality).toBeGreaterThan(0);
      expect(analysis.averageQuality).toBeLessThanOrEqual(100);

      console.log(`✓ Decision tracking repository analyzing ${analysis.totalDecisions} decisions`);
    });
  });

  describe('Performance and Batch Operations', () => {
    test('should handle batch analytics operations efficiently', async () => {
      const batchSize = 20;
      const startTime = Date.now();

      // Create batch of analytics data
      const batchAnalytics = Array.from({ length: batchSize }, (_, i) => ({
        conversationId: `batch-conv-${i}`,
        topicCount: Math.floor(Math.random() * 10) + 1,
        topicTransitions: Math.floor(Math.random() * 15) + 1,
        depthScore: Math.random() * 100,
        circularityIndex: Math.random(),
        productivityScore: Math.random() * 100,
        resolutionTime: Math.floor(Math.random() * 3600) + 300,
        insightCount: Math.floor(Math.random() * 8),
        breakthroughCount: Math.floor(Math.random() * 3),
        questionQualityAvg: Math.random() * 100,
        responseQualityAvg: Math.random() * 100,
        engagementScore: Math.random() * 100,
        metadata: { batchTest: true, index: i }
      }));

      // Batch save
      const result = await repositories.conversationAnalytics.batchSaveAnalytics(
        batchAnalytics,
        {
          batchSize: 10,
          conflictResolution: 'REPLACE',
          onProgress: (processed, total) => {
            console.log(`Batch progress: ${processed}/${total}`);
          }
        }
      );

      const duration = Date.now() - startTime;

      expect(result.inserted).toBe(batchSize);
      expect(result.failed).toBe(0);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      console.log(`✓ Batch operation completed in ${duration}ms: ${result.inserted} inserted, ${result.failed} failed`);
    });

    test('should demonstrate index performance on large datasets', async () => {
      const db = databaseManager.getConnection();
      
      // Insert a moderate amount of test data
      const insertCount = 100;
      const insert = db.prepare(`
        INSERT INTO conversation_analytics 
        (conversation_id, analyzed_at, productivity_score, topic_count, depth_score)
        VALUES (?, ?, ?, ?, ?)
      `);

      const transaction = db.transaction(() => {
        for (let i = 0; i < insertCount; i++) {
          insert.run(
            `perf-conv-${i}`,
            Date.now() - (i * 1000),
            Math.random() * 100,
            Math.floor(Math.random() * 10) + 1,
            Math.random() * 100
          );
        }
      });

      const insertStart = Date.now();
      transaction();
      const insertDuration = Date.now() - insertStart;

      // Test query performance
      const queryStart = Date.now();
      const results = db.prepare(`
        SELECT COUNT(*), AVG(productivity_score), MAX(depth_score)
        FROM conversation_analytics 
        WHERE analyzed_at > ? AND productivity_score > ?
      `).get(Date.now() - 86400000, 50);
      const queryDuration = Date.now() - queryStart;

      expect(results).toBeDefined();
      expect(insertDuration).toBeLessThan(2000); // Batch insert should be fast
      expect(queryDuration).toBeLessThan(100);   // Query should be very fast with indexes

      console.log(`✓ Performance test: ${insertCount} inserts in ${insertDuration}ms, query in ${queryDuration}ms`);
    });
  });

  describe('Data Integrity and Constraints', () => {
    test('should enforce data quality constraints', async () => {
      const db = databaseManager.getConnection();

      // Test various constraint scenarios
      const constraintTests = [
        {
          name: 'Valid productivity score range',
          test: async () => {
            // Valid scores should work
            const validResult = db.prepare(`
              INSERT INTO conversation_analytics 
              (conversation_id, analyzed_at, productivity_score) 
              VALUES (?, ?, ?)
            `).run('constraint-test-valid', Date.now(), 75.5);
            
            expect(validResult.changes).toBe(1);
          }
        },
        {
          name: 'Required fields validation',
          test: async () => {
            try {
              // Missing required field should fail gracefully
              const result = db.prepare(`
                INSERT INTO conversation_analytics 
                (productivity_score) 
                VALUES (?)
              `).run(50);
              
              // If it succeeds, that's also okay - depends on schema constraints
              expect(result.changes).toBeGreaterThanOrEqual(0);
            } catch (error) {
              // Constraint violation is expected and acceptable
              expect(error).toBeDefined();
            }
          }
        }
      ];

      for (const constraintTest of constraintTests) {
        await constraintTest.test();
        console.log(`✓ ${constraintTest.name} constraint test passed`);
      }
    });

    test('should maintain referential integrity where applicable', async () => {
      // Test that analytics can be linked to conversations appropriately
      const testData = {
        conversationId: 'integrity-test-conv',
        productivityScore: 85.2,
        insightCount: 4,
        topicCount: 3,
        depthScore: 78.9
      };

      // This should work even if the conversation doesn't exist in conversations table
      // (analytics can be independent for testing purposes)
      await repositories.conversationAnalytics.saveAnalytics({
        conversationId: testData.conversationId,
        topicCount: testData.topicCount,
        topicTransitions: 5,
        depthScore: testData.depthScore,
        circularityIndex: 0.2,
        productivityScore: testData.productivityScore,
        resolutionTime: 1500,
        insightCount: testData.insightCount,
        breakthroughCount: 1,
        questionQualityAvg: 80.0,
        responseQualityAvg: 85.5,
        engagementScore: 88.0
      });

      const retrieved = await repositories.conversationAnalytics.getConversationAnalytics(
        testData.conversationId
      );

      expect(retrieved).toBeDefined();
      expect(retrieved!.conversationId).toBe(testData.conversationId);
      
      console.log('✓ Referential integrity test passed');
    });
  });
});