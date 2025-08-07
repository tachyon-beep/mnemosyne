/**
 * Analytics Migration Test Suite
 * 
 * Tests the analytics migration (006) to ensure:
 * - All tables are created correctly
 * - Indexes are properly established
 * - Views function as expected
 * - Foreign key constraints work
 * - Data integrity is maintained
 */

import { DatabaseManager } from '../../../src/storage/Database';
import { analyticsMigration } from '../../../src/storage/migrations/006_analytics';
import { createTestDatabase } from '../../utils/test-helpers';
import Database from 'better-sqlite3';

describe('Analytics Migration 006', () => {
  let dbManager: DatabaseManager;
  let db: Database.Database;

  beforeEach(async () => {
    dbManager = await createTestDatabase();
    db = dbManager.getConnection();
  });

  afterEach(async () => {
    await dbManager.close();
  });

  describe('Migration Up', () => {
    test('should create all analytics tables', async () => {
      // Execute migration
      for (const statement of analyticsMigration.up) {
        db.exec(statement);
      }

      // Verify table creation
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name LIKE '%analytics%' OR name IN (
          'productivity_patterns', 'knowledge_gaps', 'decision_tracking', 
          'topic_evolution', 'insights'
        )
        ORDER BY name
      `).all() as { name: string }[];

      const expectedTables = [
        'conversation_analytics',
        'decision_tracking',
        'insights',
        'knowledge_gaps',
        'productivity_patterns',
        'topic_evolution'
      ];

      expect(tables.map(t => t.name)).toEqual(expectedTables);
    });

    test('should create conversation_analytics table with correct schema', async () => {
      for (const statement of analyticsMigration.up) {
        db.exec(statement);
      }

      const tableInfo = db.prepare(`PRAGMA table_info(conversation_analytics)`).all();
      const columnNames = tableInfo.map((col: any) => col.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('conversation_id');
      expect(columnNames).toContain('topic_count');
      expect(columnNames).toContain('depth_score');
      expect(columnNames).toContain('productivity_score');
      expect(columnNames).toContain('insight_count');
      expect(columnNames).toContain('breakthrough_count');
      expect(columnNames).toContain('metadata');
    });

    test('should create productivity_patterns table with time window support', async () => {
      for (const statement of analyticsMigration.up) {
        db.exec(statement);
      }

      const tableInfo = db.prepare(`PRAGMA table_info(productivity_patterns)`).all();
      const columnNames = tableInfo.map((col: any) => col.name);

      expect(columnNames).toContain('window_type');
      expect(columnNames).toContain('window_start');
      expect(columnNames).toContain('window_end');
      expect(columnNames).toContain('avg_productivity_score');
      expect(columnNames).toContain('peak_hours');
      expect(columnNames).toContain('optimal_session_length');
    });

    test('should create knowledge_gaps table with resolution tracking', async () => {
      for (const statement of analyticsMigration.up) {
        db.exec(statement);
      }

      const tableInfo = db.prepare(`PRAGMA table_info(knowledge_gaps)`).all();
      const columnNames = tableInfo.map((col: any) => col.name);

      expect(columnNames).toContain('gap_type');
      expect(columnNames).toContain('content');
      expect(columnNames).toContain('normalized_content');
      expect(columnNames).toContain('frequency');
      expect(columnNames).toContain('resolved');
      expect(columnNames).toContain('resolution_conversation_id');
      expect(columnNames).toContain('exploration_depth');
    });

    test('should create decision_tracking table with quality metrics', async () => {
      for (const statement of analyticsMigration.up) {
        db.exec(statement);
      }

      const tableInfo = db.prepare(`PRAGMA table_info(decision_tracking)`).all();
      const columnNames = tableInfo.map((col: any) => col.name);

      expect(columnNames).toContain('decision_summary');
      expect(columnNames).toContain('decision_type');
      expect(columnNames).toContain('conversation_ids');
      expect(columnNames).toContain('clarity_score');
      expect(columnNames).toContain('confidence_level');
      expect(columnNames).toContain('outcome_score');
      expect(columnNames).toContain('status');
    });

    test('should create all required indexes', async () => {
      for (const statement of analyticsMigration.up) {
        db.exec(statement);
      }

      const indexes = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND name LIKE 'idx_%'
        ORDER BY name
      `).all() as { name: string }[];

      const expectedIndexes = [
        'idx_conversation_analytics_conversation',
        'idx_conversation_analytics_productivity_time',
        'idx_conversation_analytics_insights',
        'idx_productivity_patterns_window_type',
        'idx_productivity_patterns_score_recent',
        'idx_knowledge_gaps_active',
        'idx_knowledge_gaps_content_lookup',
        'idx_knowledge_gaps_timeline',
        'idx_decision_tracking_timeline_status',
        'idx_decision_tracking_type_quality',
        'idx_decision_tracking_confidence',
        'idx_topic_evolution_normalized_activity',
        'idx_topic_evolution_understanding_progress',
        'idx_topic_evolution_hierarchy',
        'idx_insights_conversation_type',
        'idx_insights_quality_recent',
        'idx_insights_validated_significance'
      ];

      expect(indexes.map(i => i.name)).toEqual(expect.arrayContaining(expectedIndexes));
    });

    test('should create analytics views', async () => {
      for (const statement of analyticsMigration.up) {
        db.exec(statement);
      }

      const views = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='view' AND name LIKE 'v_%'
        ORDER BY name
      `).all() as { name: string }[];

      const expectedViews = [
        'v_productivity_dashboard',
        'v_active_knowledge_gaps',
        'v_decision_quality_metrics',
        'v_insight_trends'
      ];

      expect(views.map(v => v.name)).toEqual(expectedViews);
    });

    test('should enforce foreign key constraints', async () => {
      for (const statement of analyticsMigration.up) {
        db.exec(statement);
      }

      // Insert a conversation first
      db.prepare(`
        INSERT INTO conversations (id, created_at, updated_at)
        VALUES ('test-conv', ?, ?)
      `).run(Date.now(), Date.now());

      // Test valid foreign key reference
      expect(() => {
        db.prepare(`
          INSERT INTO conversation_analytics (conversation_id, analyzed_at)
          VALUES ('test-conv', ?)
        `).run(Date.now());
      }).not.toThrow();

      // Test invalid foreign key reference
      expect(() => {
        db.prepare(`
          INSERT INTO conversation_analytics (conversation_id, analyzed_at)
          VALUES ('non-existent-conv', ?)
        `).run(Date.now());
      }).toThrow();
    });

    test('should enforce check constraints on scores', async () => {
      for (const statement of analyticsMigration.up) {
        db.exec(statement);
      }

      // Insert a conversation first
      db.prepare(`
        INSERT INTO conversations (id, created_at, updated_at)
        VALUES ('test-conv', ?, ?)
      `).run(Date.now(), Date.now());

      // Test valid score values
      expect(() => {
        db.prepare(`
          INSERT INTO conversation_analytics 
          (conversation_id, analyzed_at, depth_score, circularity_index, productivity_score)
          VALUES ('test-conv', ?, 85.5, 0.3, 92.1)
        `).run(Date.now());
      }).not.toThrow();

      // Test invalid depth_score (over 100)
      expect(() => {
        db.prepare(`
          INSERT INTO conversation_analytics 
          (conversation_id, analyzed_at, depth_score)
          VALUES ('test-conv-2', ?, 150.0)
        `).run(Date.now());
      }).toThrow();

      // Test invalid circularity_index (over 1.0)
      expect(() => {
        db.prepare(`
          INSERT INTO conversation_analytics 
          (conversation_id, analyzed_at, circularity_index)
          VALUES ('test-conv-3', ?, 1.5)
        `).run(Date.now());
      }).toThrow();
    });

    test('should set default values correctly', async () => {
      for (const statement of analyticsMigration.up) {
        db.exec(statement);
      }

      // Insert a conversation first
      db.prepare(`
        INSERT INTO conversations (id, created_at, updated_at)
        VALUES ('test-conv', ?, ?)
      `).run(Date.now(), Date.now());

      // Insert minimal analytics record
      db.prepare(`
        INSERT INTO conversation_analytics (conversation_id, analyzed_at)
        VALUES ('test-conv', ?)
      `).run(Date.now());

      const result = db.prepare(`
        SELECT topic_count, depth_score, productivity_score, insight_count
        FROM conversation_analytics WHERE conversation_id = 'test-conv'
      `).get() as any;

      expect(result.topic_count).toBe(0);
      expect(result.depth_score).toBe(0);
      expect(result.productivity_score).toBe(0);
      expect(result.insight_count).toBe(0);
    });
  });

  describe('Views Functionality', () => {
    beforeEach(async () => {
      // Execute migration
      for (const statement of analyticsMigration.up) {
        db.exec(statement);
      }

      // Insert test data
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      // Insert productivity patterns for the last 30 days
      for (let i = 0; i < 5; i++) {
        db.prepare(`
          INSERT INTO productivity_patterns 
          (window_type, window_start, window_end, avg_productivity_score, total_conversations, total_messages)
          VALUES ('day', ?, ?, ?, ?, ?)
        `).run(
          now - ((i + 1) * dayMs),
          now - (i * dayMs),
          80 + i * 2,
          5 + i,
          20 + i * 3
        );
      }

      // Insert knowledge gaps
      db.prepare(`
        INSERT INTO knowledge_gaps 
        (gap_type, content, normalized_content, frequency, first_occurrence, last_occurrence, resolved)
        VALUES ('concept', 'Advanced React patterns', 'advanced react patterns', 3, ?, ?, FALSE)
      `).run(now - (10 * dayMs), now - dayMs);

      // Insert decisions
      db.prepare(`
        INSERT INTO decision_tracking 
        (decision_summary, decision_type, conversation_ids, decision_made_at, confidence_level, clarity_score, status)
        VALUES ('Use TypeScript for new project', 'strategic', '["conv-1"]', ?, 85.0, 90.0, 'implemented')
      `).run(now - (5 * dayMs));

      // Insert insights
      db.prepare(`
        INSERT INTO insights 
        (conversation_id, insight_type, insight_summary, significance_score, novelty_score, validated, created_at)
        VALUES ('conv-1', 'breakthrough', 'Code reuse pattern discovered', 92.0, 78.0, TRUE, ?)
      `).run(now - dayMs);
    });

    test('v_productivity_dashboard should show recent patterns', async () => {
      const results = db.prepare(`
        SELECT * FROM v_productivity_dashboard 
        ORDER BY window_end DESC LIMIT 3
      `).all();

      expect(results.length).toBe(3);
      expect(results[0]).toHaveProperty('window_type');
      expect(results[0]).toHaveProperty('avg_productivity_score');
      expect(results[0]).toHaveProperty('total_conversations');
    });

    test('v_active_knowledge_gaps should show unresolved gaps', async () => {
      const results = db.prepare(`
        SELECT * FROM v_active_knowledge_gaps
      `).all();

      expect(results.length).toBe(1);
      expect(results[0]).toHaveProperty('gap_type', 'concept');
      expect(results[0]).toHaveProperty('content', 'Advanced React patterns');
      expect(results[0]).toHaveProperty('frequency', 3);
    });

    test('v_decision_quality_metrics should show decision data', async () => {
      const results = db.prepare(`
        SELECT * FROM v_decision_quality_metrics
      `).all();

      expect(results.length).toBe(1);
      expect(results[0]).toHaveProperty('decision_summary', 'Use TypeScript for new project');
      expect(results[0]).toHaveProperty('confidence_level', 85.0);
      expect(results[0]).toHaveProperty('status', 'implemented');
    });

    test('v_insight_trends should aggregate insights by type', async () => {
      const results = db.prepare(`
        SELECT * FROM v_insight_trends
      `).all();

      expect(results.length).toBe(1);
      expect(results[0]).toHaveProperty('insight_type', 'breakthrough');
      expect(results[0]).toHaveProperty('total_insights', 1);
      expect(results[0]).toHaveProperty('validated_count', 1);
    });
  });

  describe('Migration Down', () => {
    test('should drop all analytics objects in correct order', async () => {
      // First run migration up
      for (const statement of analyticsMigration.up) {
        db.exec(statement);
      }

      // Verify tables exist
      const tablesBeforeDown = db.prepare(`
        SELECT COUNT(*) as count FROM sqlite_master 
        WHERE type='table' AND name IN (
          'conversation_analytics', 'productivity_patterns', 'knowledge_gaps',
          'decision_tracking', 'topic_evolution', 'insights'
        )
      `).get() as { count: number };
      
      expect(tablesBeforeDown.count).toBe(6);

      // Run migration down
      for (const statement of analyticsMigration.down) {
        db.exec(statement);
      }

      // Verify tables are dropped
      const tablesAfterDown = db.prepare(`
        SELECT COUNT(*) as count FROM sqlite_master 
        WHERE type='table' AND name IN (
          'conversation_analytics', 'productivity_patterns', 'knowledge_gaps',
          'decision_tracking', 'topic_evolution', 'insights'
        )
      `).get() as { count: number };
      
      expect(tablesAfterDown.count).toBe(0);

      // Verify views are dropped
      const viewsAfterDown = db.prepare(`
        SELECT COUNT(*) as count FROM sqlite_master 
        WHERE type='view' AND name LIKE 'v_%'
      `).get() as { count: number };
      
      expect(viewsAfterDown.count).toBe(0);

      // Verify indexes are dropped
      const indexesAfterDown = db.prepare(`
        SELECT COUNT(*) as count FROM sqlite_master 
        WHERE type='index' AND name LIKE 'idx_%'
      `).get() as { count: number };
      
      expect(indexesAfterDown.count).toBe(0);
    });
  });

  describe('Performance and Optimization', () => {
    test('should efficiently query analytics data with indexes', async () => {
      for (const statement of analyticsMigration.up) {
        db.exec(statement);
      }

      // Insert test data
      const now = Date.now();
      
      // Insert a conversation first
      db.prepare(`
        INSERT INTO conversations (id, created_at, updated_at)
        VALUES ('test-conv', ?, ?)
      `).run(now, now);

      // Insert analytics data
      for (let i = 0; i < 100; i++) {
        db.prepare(`
          INSERT INTO conversation_analytics 
          (conversation_id, analyzed_at, productivity_score, insight_count)
          VALUES (?, ?, ?, ?)
        `).run(`conv-${i}`, now + i * 1000, 50 + (i % 50), i % 10);
      }

      // Test index usage with EXPLAIN QUERY PLAN
      const queryPlan = db.prepare(`
        EXPLAIN QUERY PLAN 
        SELECT * FROM conversation_analytics 
        WHERE productivity_score > 80 
        ORDER BY analyzed_at DESC LIMIT 10
      `).all();

      // Should use the productivity_time index
      const usesIndex = queryPlan.some((step: any) => 
        step.detail.includes('idx_conversation_analytics_productivity_time')
      );
      
      expect(usesIndex).toBe(true);
    });

    test('should handle large dataset operations efficiently', async () => {
      for (const statement of analyticsMigration.up) {
        db.exec(statement);
      }

      // Insert large amount of test data
      const insertAnalytics = db.prepare(`
        INSERT INTO conversation_analytics 
        (conversation_id, analyzed_at, productivity_score, insight_count)
        VALUES (?, ?, ?, ?)
      `);

      const transaction = db.transaction(() => {
        for (let i = 0; i < 1000; i++) {
          insertAnalytics.run(
            `conv-${i}`, 
            Date.now() + i * 1000, 
            Math.random() * 100, 
            Math.floor(Math.random() * 20)
          );
        }
      });

      const startTime = Date.now();
      transaction();
      const insertTime = Date.now() - startTime;

      // Should complete insert in reasonable time (under 1 second)
      expect(insertTime).toBeLessThan(1000);

      // Test query performance
      const queryStartTime = Date.now();
      const results = db.prepare(`
        SELECT AVG(productivity_score), COUNT(*), MAX(insight_count)
        FROM conversation_analytics
        WHERE analyzed_at > ?
      `).get(Date.now() - 500000);
      const queryTime = Date.now() - queryStartTime;

      // Should complete query in reasonable time (under 100ms)
      expect(queryTime).toBeLessThan(100);
      expect(results).toBeDefined();
    });
  });

  describe('Data Integrity', () => {
    test('should maintain referential integrity on cascading deletes', async () => {
      for (const statement of analyticsMigration.up) {
        db.exec(statement);
      }

      // Insert test data with relationships
      const now = Date.now();
      
      db.prepare(`
        INSERT INTO conversations (id, created_at, updated_at)
        VALUES ('test-conv', ?, ?)
      `).run(now, now);

      db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at)
        VALUES ('test-msg', 'test-conv', 'user', 'Test message', ?)
      `).run(now);

      db.prepare(`
        INSERT INTO conversation_analytics (conversation_id, analyzed_at)
        VALUES ('test-conv', ?)
      `).run(now);

      db.prepare(`
        INSERT INTO insights (conversation_id, message_id, insight_type, insight_summary, significance_score)
        VALUES ('test-conv', 'test-msg', 'breakthrough', 'Test insight', 85.0)
      `).run();

      // Verify data exists
      const analyticsCount = db.prepare(`
        SELECT COUNT(*) as count FROM conversation_analytics WHERE conversation_id = 'test-conv'
      `).get() as { count: number };
      
      const insightsCount = db.prepare(`
        SELECT COUNT(*) as count FROM insights WHERE conversation_id = 'test-conv'
      `).get() as { count: number };

      expect(analyticsCount.count).toBe(1);
      expect(insightsCount.count).toBe(1);

      // Delete the conversation (should cascade)
      db.prepare(`DELETE FROM conversations WHERE id = 'test-conv'`).run();

      // Verify cascading delete worked
      const analyticsAfterDelete = db.prepare(`
        SELECT COUNT(*) as count FROM conversation_analytics WHERE conversation_id = 'test-conv'
      `).get() as { count: number };
      
      const insightsAfterDelete = db.prepare(`
        SELECT COUNT(*) as count FROM insights WHERE conversation_id = 'test-conv'
      `).get() as { count: number };

      expect(analyticsAfterDelete.count).toBe(0);
      expect(insightsAfterDelete.count).toBe(0);
    });

    test('should handle null foreign keys correctly', async () => {
      for (const statement of analyticsMigration.up) {
        db.exec(statement);
      }

      // Insert knowledge gap without resolution
      expect(() => {
        db.prepare(`
          INSERT INTO knowledge_gaps 
          (gap_type, content, normalized_content, frequency, first_occurrence, last_occurrence, resolved)
          VALUES ('concept', 'Test gap', 'test gap', 1, ?, ?, FALSE)
        `).run(Date.now(), Date.now());
      }).not.toThrow();

      // Insert knowledge gap with valid resolution reference
      db.prepare(`
        INSERT INTO conversations (id, created_at, updated_at)
        VALUES ('resolution-conv', ?, ?)
      `).run(Date.now(), Date.now());

      expect(() => {
        db.prepare(`
          INSERT INTO knowledge_gaps 
          (gap_type, content, normalized_content, frequency, first_occurrence, last_occurrence, resolved, resolution_conversation_id)
          VALUES ('concept', 'Resolved gap', 'resolved gap', 1, ?, ?, TRUE, 'resolution-conv')
        `).run(Date.now(), Date.now());
      }).not.toThrow();
    });
  });
});