/**
 * Database Validation Triggers Test Suite
 * 
 * Comprehensive tests for all database validation triggers to ensure:
 * - Temporal sequence validation works correctly
 * - Resolution validation prevents inconsistent states
 * - Score range validation enforces bounds
 * - Cross-table consistency is maintained
 * - Performance is within acceptable limits
 */

import { describe, beforeEach, afterEach, it, expect } from '@jest/test-globals';
import Database from 'better-sqlite3';
import { DatabaseManager } from '../../src/storage/DatabaseManager.js';
import { TriggerValidationMonitor } from '../../src/storage/validation/TriggerValidationMonitor.js';
import { createTestDatabase, cleanupTestDatabase } from '../helpers/test-database.js';

describe('Database Validation Triggers', () => {
  let db: Database;
  let dbManager: DatabaseManager;
  let monitor: TriggerValidationMonitor;
  let testDbPath: string;

  beforeEach(async () => {
    const testSetup = await createTestDatabase();
    db = testSetup.db;
    dbManager = testSetup.dbManager;
    testDbPath = testSetup.dbPath;
    monitor = new TriggerValidationMonitor(db);
  });

  afterEach(async () => {
    await cleanupTestDatabase(db, testDbPath);
  });

  describe('Decision Tracking Temporal Validation', () => {
    it('should allow valid temporal sequence', () => {
      const now = Date.now();
      
      expect(() => {
        db.prepare(`
          INSERT INTO decision_tracking (
            id, decision_summary, decision_made_at, problem_identified_at
          ) VALUES (?, ?, ?, ?)
        `).run('test-1', 'Valid decision', now, now - 1000);
      }).not.toThrow();
    });

    it('should reject problem identified after decision made', () => {
      const now = Date.now();
      
      expect(() => {
        db.prepare(`
          INSERT INTO decision_tracking (
            id, decision_summary, decision_made_at, problem_identified_at
          ) VALUES (?, ?, ?, ?)
        `).run('test-2', 'Invalid decision', now, now + 1000);
      }).toThrow(/Decision cannot be made before problem is identified/);
    });

    it('should allow options considered before decision made', () => {
      const now = Date.now();
      
      expect(() => {
        db.prepare(`
          INSERT INTO decision_tracking (
            id, decision_summary, decision_made_at, options_considered_at
          ) VALUES (?, ?, ?, ?)
        `).run('test-3', 'Valid decision', now, now - 500);
      }).not.toThrow();
    });

    it('should reject options considered after decision made', () => {
      const now = Date.now();
      
      expect(() => {
        db.prepare(`
          INSERT INTO decision_tracking (
            id, decision_summary, decision_made_at, options_considered_at
          ) VALUES (?, ?, ?, ?)
        `).run('test-4', 'Invalid decision', now, now + 500);
      }).toThrow(/Options must be considered before decision is made/);
    });

    it('should allow implementation after decision made', () => {
      const now = Date.now();
      
      expect(() => {
        db.prepare(`
          INSERT INTO decision_tracking (
            id, decision_summary, decision_made_at, implementation_started_at
          ) VALUES (?, ?, ?, ?)
        `).run('test-5', 'Valid decision', now, now + 1000);
      }).not.toThrow();
    });

    it('should reject implementation before decision made', () => {
      const now = Date.now();
      
      expect(() => {
        db.prepare(`
          INSERT INTO decision_tracking (
            id, decision_summary, decision_made_at, implementation_started_at
          ) VALUES (?, ?, ?, ?)
        `).run('test-6', 'Invalid decision', now, now - 1000);
      }).toThrow(/Implementation cannot start before decision is made/);
    });
  });

  describe('Knowledge Gap Resolution Validation', () => {
    beforeEach(() => {
      // Create test conversation for resolution references
      db.prepare(`
        INSERT INTO conversations (id, created_at, updated_at)
        VALUES ('test-conv', ?, ?)
      `).run(Date.now(), Date.now());
    });

    it('should allow resolved gap with resolution date and conversation', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO knowledge_gaps (
            id, gap_type, content, normalized_content, first_occurrence, 
            last_occurrence, resolved, resolution_date, resolution_conversation_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'test-gap-1', 'question', 'Test question', 'test question',
          Date.now() - 2000, Date.now() - 1000, true, Date.now(), 'test-conv'
        );
      }).not.toThrow();
    });

    it('should reject resolved gap without resolution date', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO knowledge_gaps (
            id, gap_type, content, normalized_content, first_occurrence, 
            last_occurrence, resolved, resolution_date, resolution_conversation_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'test-gap-2', 'question', 'Test question', 'test question',
          Date.now() - 2000, Date.now() - 1000, true, null, 'test-conv'
        );
      }).toThrow(/Resolution date is required when knowledge gap is marked as resolved/);
    });

    it('should reject resolved gap without resolution conversation', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO knowledge_gaps (
            id, gap_type, content, normalized_content, first_occurrence, 
            last_occurrence, resolved, resolution_date, resolution_conversation_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'test-gap-3', 'question', 'Test question', 'test question',
          Date.now() - 2000, Date.now() - 1000, true, Date.now(), null
        );
      }).toThrow(/Resolution conversation ID is required when knowledge gap is marked as resolved/);
    });

    it('should reject negative frequency', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO knowledge_gaps (
            id, gap_type, content, normalized_content, first_occurrence, 
            last_occurrence, frequency
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          'test-gap-4', 'question', 'Test question', 'test question',
          Date.now() - 2000, Date.now() - 1000, -1
        );
      }).toThrow(/Knowledge gap frequency must be positive/);
    });

    it('should reject first occurrence after last occurrence', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO knowledge_gaps (
            id, gap_type, content, normalized_content, first_occurrence, last_occurrence
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          'test-gap-5', 'question', 'Test question', 'test question',
          Date.now(), Date.now() - 1000
        );
      }).toThrow(/Knowledge gap first_occurrence cannot be after last_occurrence/);
    });
  });

  describe('Productivity Pattern Validation', () => {
    it('should allow valid time window', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO productivity_patterns (
            id, window_start, window_end, window_type, total_conversations, total_messages
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run('test-pattern-1', Date.now() - 1000, Date.now(), 'hour', 5, 20);
      }).not.toThrow();
    });

    it('should reject window_start >= window_end', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO productivity_patterns (
            id, window_start, window_end, window_type, total_conversations, total_messages
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run('test-pattern-2', Date.now(), Date.now() - 1000, 'hour', 5, 20);
      }).toThrow(/Productivity pattern window_end must be greater than window_start/);
    });

    it('should reject negative counts', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO productivity_patterns (
            id, window_start, window_end, window_type, total_conversations, total_messages
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run('test-pattern-3', Date.now() - 1000, Date.now(), 'hour', -1, 20);
      }).toThrow(/Productivity pattern counts must be non-negative/);
    });
  });

  describe('Score Range Validation', () => {
    beforeEach(() => {
      // Create test conversation
      db.prepare(`
        INSERT INTO conversations (id, created_at, updated_at)
        VALUES ('test-conv', ?, ?)
      `).run(Date.now(), Date.now());
    });

    it('should allow valid analytics scores', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO conversation_analytics (
            id, conversation_id, analyzed_at, depth_score, circularity_index, productivity_score
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run('test-analytics-1', 'test-conv', Date.now(), 75.5, 0.3, 82.0);
      }).not.toThrow();
    });

    it('should reject invalid depth_score', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO conversation_analytics (
            id, conversation_id, analyzed_at, depth_score, circularity_index, productivity_score
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run('test-analytics-2', 'test-conv', Date.now(), 150.0, 0.3, 82.0);
      }).toThrow(/Analytics scores must be within valid ranges/);
    });

    it('should reject invalid circularity_index', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO conversation_analytics (
            id, conversation_id, analyzed_at, depth_score, circularity_index, productivity_score
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run('test-analytics-3', 'test-conv', Date.now(), 75.5, 1.5, 82.0);
      }).toThrow(/Analytics scores must be within valid ranges/);
    });

    it('should allow valid insight scores', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO insights (
            id, conversation_id, insight_summary, significance_score, novelty_score, applicability_score
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run('test-insight-1', 'test-conv', 'Test insight', 85.0, 70.0, 90.0);
      }).not.toThrow();
    });

    it('should reject invalid insight scores', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO insights (
            id, conversation_id, insight_summary, significance_score, novelty_score, applicability_score
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run('test-insight-2', 'test-conv', 'Test insight', 150.0, 70.0, 90.0);
      }).toThrow(/Insight scores must be within range 0-100/);
    });
  });

  describe('Cross-Table Consistency', () => {
    it('should reject message with non-existent conversation', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO messages (
            id, conversation_id, role, content, created_at
          ) VALUES (?, ?, ?, ?, ?)
        `).run('test-msg-1', 'non-existent-conv', 'user', 'Test message', Date.now());
      }).toThrow(/Referenced conversation_id does not exist/);
    });

    it('should reject message with non-existent parent', () => {
      // Create conversation first
      db.prepare(`
        INSERT INTO conversations (id, created_at, updated_at)
        VALUES ('test-conv', ?, ?)
      `).run(Date.now(), Date.now());

      expect(() => {
        db.prepare(`
          INSERT INTO messages (
            id, conversation_id, role, content, created_at, parent_message_id
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run('test-msg-2', 'test-conv', 'user', 'Test message', Date.now(), 'non-existent-parent');
      }).toThrow(/Referenced parent_message_id does not exist/);
    });

    it('should reject circular parent reference', () => {
      // Create conversation first
      db.prepare(`
        INSERT INTO conversations (id, created_at, updated_at)
        VALUES ('test-conv', ?, ?)
      `).run(Date.now(), Date.now());

      expect(() => {
        db.prepare(`
          INSERT INTO messages (
            id, conversation_id, role, content, created_at, parent_message_id
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run('test-msg-3', 'test-conv', 'user', 'Test message', Date.now(), 'test-msg-3');
      }).toThrow(/Message cannot be its own parent/);
    });
  });

  describe('Topic Evolution Validation', () => {
    it('should allow valid timeline', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO topic_evolution (
            id, topic, normalized_topic, first_mentioned_at, last_discussed_at
          ) VALUES (?, ?, ?, ?, ?)
        `).run('test-topic-1', 'Test Topic', 'test topic', Date.now() - 1000, Date.now());
      }).not.toThrow();
    });

    it('should reject first_mentioned_at after last_discussed_at', () => {
      expect(() => {
        db.prepare(`
          INSERT INTO topic_evolution (
            id, topic, normalized_topic, first_mentioned_at, last_discussed_at
          ) VALUES (?, ?, ?, ?, ?)
        `).run('test-topic-2', 'Test Topic', 'test topic', Date.now(), Date.now() - 1000);
      }).toThrow(/Topic first_mentioned_at cannot be after last_discussed_at/);
    });
  });

  describe('Performance Monitoring', () => {
    it('should log trigger performance', () => {
      monitor.logTriggerExecution('test_trigger', 'test_table', 'INSERT', 25.5);
      
      const stats = monitor.getTriggerPerformanceStats(1);
      expect(stats.length).toBeGreaterThan(0);
      
      const testStat = stats.find(s => s.triggerName === 'test_trigger');
      expect(testStat).toBeDefined();
      expect(testStat?.averageExecutionTime).toBeCloseTo(25.5);
    });

    it('should identify slow triggers', () => {
      monitor.logTriggerExecution('slow_trigger', 'test_table', 'INSERT', 150);
      monitor.logTriggerExecution('fast_trigger', 'test_table', 'INSERT', 10);
      
      const slowTriggers = monitor.getSlowTriggers(100);
      expect(slowTriggers.length).toBe(1);
      expect(slowTriggers[0].triggerName).toBe('slow_trigger');
    });

    it('should track validation errors', () => {
      monitor.logTriggerExecution('error_trigger', 'test_table', 'INSERT', 50, 'Test error message');
      
      const errors = monitor.getValidationErrors(1);
      expect(errors.length).toBe(1);
      expect(errors[0].errorMessage).toBe('Test error message');
    });

    it('should generate performance report', () => {
      monitor.logTriggerExecution('report_trigger', 'test_table', 'INSERT', 75);
      
      const report = monitor.generatePerformanceReport();
      expect(report).toContain('# Validation Trigger Performance Report');
      expect(report).toContain('report_trigger');
    });

    it('should cleanup old logs', () => {
      // Insert old log entry
      db.prepare(`
        INSERT INTO trigger_performance_log (
          trigger_name, table_name, operation, execution_time_ms, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `).run('old_trigger', 'test_table', 'INSERT', 50, Date.now() - (100 * 24 * 60 * 60 * 1000));

      const deletedCount = monitor.cleanupOldLogs(90);
      expect(deletedCount).toBeGreaterThan(0);
    });
  });

  describe('Comprehensive Validation Tests', () => {
    it('should run all validation tests successfully', async () => {
      const results = await monitor.runValidationTests();
      
      expect(results.passed).toBeGreaterThan(0);
      expect(results.failed).toBe(0);
      expect(results.errors).toHaveLength(0);
    }, 30000); // Extended timeout for comprehensive tests
  });
});