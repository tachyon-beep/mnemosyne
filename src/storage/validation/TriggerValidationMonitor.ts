/**
 * Trigger Validation Monitor
 * 
 * Utility for monitoring database validation trigger performance and effectiveness:
 * - Track trigger execution times
 * - Monitor validation errors and patterns
 * - Provide insights for trigger optimization
 * - Validate trigger logic consistency
 */

import Database from 'better-sqlite3';

export interface TriggerPerformanceStats {
  triggerName: string;
  tableName: string;
  operationType: 'INSERT' | 'UPDATE' | 'DELETE';
  totalExecutions: number;
  averageExecutionTime: number;
  maxExecutionTime: number;
  minExecutionTime: number;
  errorCount: number;
  lastExecution: number;
}

export interface ValidationError {
  triggerName: string;
  tableName: string;
  operation: string;
  errorMessage: string;
  timestamp: number;
  data?: any;
}

export class TriggerValidationMonitor {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Log trigger performance for monitoring
   */
  logTriggerExecution(
    triggerName: string,
    tableName: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    executionTimeMs: number,
    errorMessage?: string
  ): void {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO trigger_performance_log (
          trigger_name, table_name, operation, execution_time_ms, error_message, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        triggerName,
        tableName,
        operation,
        executionTimeMs,
        errorMessage || null,
        Date.now()
      );
    } catch (error) {
      console.error('Failed to log trigger performance:', error);
    }
  }

  /**
   * Get trigger performance statistics
   */
  getTriggerPerformanceStats(days: number = 7): TriggerPerformanceStats[] {
    const since = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    const stmt = this.db.prepare(`
      SELECT 
        trigger_name,
        table_name,
        operation,
        COUNT(*) as total_executions,
        AVG(execution_time_ms) as avg_execution_time,
        MAX(execution_time_ms) as max_execution_time,
        MIN(execution_time_ms) as min_execution_time,
        COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as error_count,
        MAX(created_at) as last_execution
      FROM trigger_performance_log
      WHERE created_at >= ?
      GROUP BY trigger_name, table_name, operation
      ORDER BY avg_execution_time DESC
    `);

    const rows = stmt.all(since);
    
    return rows.map((row: any) => ({
      triggerName: row.trigger_name,
      tableName: row.table_name,
      operationType: row.operation,
      totalExecutions: row.total_executions,
      averageExecutionTime: row.avg_execution_time,
      maxExecutionTime: row.max_execution_time,
      minExecutionTime: row.min_execution_time,
      errorCount: row.error_count,
      lastExecution: row.last_execution
    }));
  }

  /**
   * Get slow-performing triggers that may need optimization
   */
  getSlowTriggers(thresholdMs: number = 100): TriggerPerformanceStats[] {
    const stats = this.getTriggerPerformanceStats(30); // Look at last 30 days
    return stats.filter(stat => stat.averageExecutionTime > thresholdMs);
  }

  /**
   * Get trigger error patterns
   */
  getValidationErrors(days: number = 7): ValidationError[] {
    const since = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    const stmt = this.db.prepare(`
      SELECT 
        trigger_name,
        table_name,
        operation,
        error_message,
        created_at
      FROM trigger_performance_log
      WHERE error_message IS NOT NULL 
        AND created_at >= ?
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(since);
    
    return rows.map((row: any) => ({
      triggerName: row.trigger_name,
      tableName: row.table_name,
      operation: row.operation,
      errorMessage: row.error_message,
      timestamp: row.created_at
    }));
  }

  /**
   * Test validation triggers with known good and bad data
   */
  async runValidationTests(): Promise<{
    passed: number;
    failed: number;
    errors: Array<{ test: string; error: string }>;
  }> {
    const testResults = {
      passed: 0,
      failed: 0,
      errors: [] as Array<{ test: string; error: string }>
    };

    const tests = [
      // Test 1: Decision temporal sequence validation
      {
        name: 'Decision temporal sequence - valid',
        test: async () => {
          const now = Date.now();
          const stmt = this.db.prepare(`
            INSERT INTO decision_tracking (
              id, decision_summary, decision_made_at, problem_identified_at
            ) VALUES (?, ?, ?, ?)
          `);
          stmt.run('test-decision-1', 'Test decision', now, now - 1000);
        },
        shouldFail: false
      },
      {
        name: 'Decision temporal sequence - invalid',
        test: async () => {
          const now = Date.now();
          const stmt = this.db.prepare(`
            INSERT INTO decision_tracking (
              id, decision_summary, decision_made_at, problem_identified_at
            ) VALUES (?, ?, ?, ?)
          `);
          stmt.run('test-decision-2', 'Test decision', now, now + 1000);
        },
        shouldFail: true
      },
      // Test 2: Knowledge gap resolution validation
      {
        name: 'Knowledge gap resolution - valid',
        test: async () => {
          const stmt = this.db.prepare(`
            INSERT INTO knowledge_gaps (
              id, gap_type, content, normalized_content, first_occurrence, last_occurrence, 
              resolved, resolution_date, resolution_conversation_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            'test-gap-1', 'question', 'Test gap', 'test gap', 
            Date.now() - 1000, Date.now(), true, Date.now(), 'test-conv-1'
          );
        },
        shouldFail: false
      },
      {
        name: 'Knowledge gap resolution - invalid (missing date)',
        test: async () => {
          const stmt = this.db.prepare(`
            INSERT INTO knowledge_gaps (
              id, gap_type, content, normalized_content, first_occurrence, last_occurrence, 
              resolved, resolution_date, resolution_conversation_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            'test-gap-2', 'question', 'Test gap', 'test gap',
            Date.now() - 1000, Date.now(), true, null, 'test-conv-1'
          );
        },
        shouldFail: true
      },
      // Test 3: Productivity pattern window validation
      {
        name: 'Productivity pattern window - valid',
        test: async () => {
          const stmt = this.db.prepare(`
            INSERT INTO productivity_patterns (
              id, window_start, window_end, window_type, total_conversations, total_messages
            ) VALUES (?, ?, ?, ?, ?, ?)
          `);
          stmt.run('test-pattern-1', Date.now() - 1000, Date.now(), 'hour', 5, 20);
        },
        shouldFail: false
      },
      {
        name: 'Productivity pattern window - invalid',
        test: async () => {
          const stmt = this.db.prepare(`
            INSERT INTO productivity_patterns (
              id, window_start, window_end, window_type, total_conversations, total_messages
            ) VALUES (?, ?, ?, ?, ?, ?)
          `);
          stmt.run('test-pattern-2', Date.now(), Date.now() - 1000, 'hour', 5, 20);
        },
        shouldFail: true
      },
      // Test 4: Score range validation
      {
        name: 'Analytics score range - valid',
        test: async () => {
          const stmt = this.db.prepare(`
            INSERT INTO conversation_analytics (
              id, conversation_id, analyzed_at, depth_score, circularity_index, productivity_score
            ) VALUES (?, ?, ?, ?, ?, ?)
          `);
          stmt.run('test-analytics-1', 'test-conv-1', Date.now(), 75.5, 0.3, 82.0);
        },
        shouldFail: false
      },
      {
        name: 'Analytics score range - invalid depth_score',
        test: async () => {
          const stmt = this.db.prepare(`
            INSERT INTO conversation_analytics (
              id, conversation_id, analyzed_at, depth_score, circularity_index, productivity_score
            ) VALUES (?, ?, ?, ?, ?, ?)
          `);
          stmt.run('test-analytics-2', 'test-conv-1', Date.now(), 150.0, 0.3, 82.0);
        },
        shouldFail: true
      }
    ];

    // Setup test data
    await this.setupTestData();

    // Run tests
    for (const testCase of tests) {
      try {
        const startTime = Date.now();
        await testCase.test();
        const executionTime = Date.now() - startTime;
        
        if (testCase.shouldFail) {
          testResults.failed++;
          testResults.errors.push({
            test: testCase.name,
            error: 'Test should have failed but passed'
          });
        } else {
          testResults.passed++;
          this.logTriggerExecution(
            'validation_test', 
            'test', 
            'INSERT', 
            executionTime
          );
        }
      } catch (error) {
        const executionTime = Date.now() - Date.now();
        
        if (testCase.shouldFail) {
          testResults.passed++;
          this.logTriggerExecution(
            'validation_test', 
            'test', 
            'INSERT', 
            executionTime,
            (error as Error).message
          );
        } else {
          testResults.failed++;
          testResults.errors.push({
            test: testCase.name,
            error: (error as Error).message
          });
        }
      }
    }

    // Cleanup test data
    await this.cleanupTestData();

    return testResults;
  }

  /**
   * Generate validation trigger performance report
   */
  generatePerformanceReport(): string {
    const stats = this.getTriggerPerformanceStats(30);
    const errors = this.getValidationErrors(7);
    const slowTriggers = this.getSlowTriggers(50);

    let report = '# Validation Trigger Performance Report\n\n';
    
    report += '## Summary\n';
    report += `- Total triggers monitored: ${stats.length}\n`;
    report += `- Total executions (30 days): ${stats.reduce((sum, s) => sum + s.totalExecutions, 0)}\n`;
    report += `- Total errors (7 days): ${errors.length}\n`;
    report += `- Slow triggers (>50ms): ${slowTriggers.length}\n\n`;

    if (slowTriggers.length > 0) {
      report += '## Slow Triggers (Performance Issues)\n';
      report += '| Trigger | Table | Operation | Avg Time (ms) | Executions |\n';
      report += '|---------|-------|-----------|---------------|------------|\n';
      
      for (const trigger of slowTriggers) {
        report += `| ${trigger.triggerName} | ${trigger.tableName} | ${trigger.operationType} | ${trigger.averageExecutionTime.toFixed(2)} | ${trigger.totalExecutions} |\n`;
      }
      report += '\n';
    }

    if (errors.length > 0) {
      report += '## Recent Validation Errors\n';
      report += '| Trigger | Table | Error | Time |\n';
      report += '|---------|-------|-------|------|\n';
      
      for (const error of errors.slice(0, 10)) {
        const timeStr = new Date(error.timestamp).toISOString();
        report += `| ${error.triggerName} | ${error.tableName} | ${error.errorMessage} | ${timeStr} |\n`;
      }
      report += '\n';
    }

    report += '## All Trigger Statistics\n';
    report += '| Trigger | Table | Operation | Avg Time (ms) | Executions | Errors |\n';
    report += '|---------|-------|-----------|---------------|------------|--------|\n';
    
    for (const stat of stats) {
      report += `| ${stat.triggerName} | ${stat.tableName} | ${stat.operationType} | ${stat.averageExecutionTime.toFixed(2)} | ${stat.totalExecutions} | ${stat.errorCount} |\n`;
    }

    return report;
  }

  /**
   * Clean up old performance logs to prevent table bloat
   */
  cleanupOldLogs(olderThanDays: number = 90): number {
    const cutoff = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    
    const stmt = this.db.prepare(`
      DELETE FROM trigger_performance_log 
      WHERE created_at < ?
    `);
    
    const result = stmt.run(cutoff);
    return result.changes;
  }

  /**
   * Setup test data for validation tests
   */
  private async setupTestData(): Promise<void> {
    try {
      // Create test conversation
      const convStmt = this.db.prepare(`
        INSERT OR IGNORE INTO conversations (id, created_at, updated_at) 
        VALUES (?, ?, ?)
      `);
      convStmt.run('test-conv-1', Date.now() - 10000, Date.now());
    } catch (error) {
      // Ignore if already exists
    }
  }

  /**
   * Cleanup test data after validation tests
   */
  private async cleanupTestData(): Promise<void> {
    const tables = [
      'decision_tracking',
      'knowledge_gaps',
      'productivity_patterns',
      'conversation_analytics'
    ];

    for (const table of tables) {
      try {
        const stmt = this.db.prepare(`DELETE FROM ${table} WHERE id LIKE 'test-%'`);
        stmt.run();
      } catch (error) {
        // Ignore cleanup errors
      }
    }

    try {
      const stmt = this.db.prepare(`DELETE FROM conversations WHERE id LIKE 'test-%'`);
      stmt.run();
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Utility function to create and run validation tests
 */
export async function runTriggerValidationTests(db: Database): Promise<void> {
  const monitor = new TriggerValidationMonitor(db);
  
  console.log('Running validation trigger tests...');
  const results = await monitor.runValidationTests();
  
  console.log(`\nTest Results:`);
  console.log(`  Passed: ${results.passed}`);
  console.log(`  Failed: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log(`\nErrors:`);
    for (const error of results.errors) {
      console.log(`  - ${error.test}: ${error.error}`);
    }
  }
  
  console.log('\nGenerating performance report...');
  const report = monitor.generatePerformanceReport();
  console.log(report);
}