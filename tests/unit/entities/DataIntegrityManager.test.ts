/**
 * Tests for DataIntegrityManager
 * 
 * Integration tests for the complete data integrity management system
 */

import Database from 'better-sqlite3';
import { DataIntegrityManager } from '../../../src/entities/DataIntegrityManager.js';
import { migrations } from '../../../src/storage/migrations/index.js';

describe('DataIntegrityManager', () => {
  let db: Database.Database;
  let manager: DataIntegrityManager;

  beforeEach(async () => {
    // Create in-memory database
    db = new Database(':memory:');
    
    // Apply all migrations
    for (const migration of migrations) {
      for (const sql of migration.up) {
        db.exec(sql);
      }
    }

    manager = new DataIntegrityManager(db);
    await manager.initialize();
  });

  afterEach(() => {
    db.close();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const newManager = new DataIntegrityManager(db);
      await expect(newManager.initialize()).resolves.not.toThrow();
    });

    it('should throw error when methods are called before initialization', async () => {
      const uninitializedManager = new DataIntegrityManager(db);
      
      await expect(uninitializedManager.generateIntegrityReport())
        .rejects.toThrow('DataIntegrityManager must be initialized before use');
    });
  });

  describe('Integrity Reporting', () => {
    beforeEach(async () => {
      // Set up test data
      const now = Date.now();
      
      // Create entities
      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at)
        VALUES ('entity-1', 'Test Entity 1', 'test entity 1', 'person', ?, ?)
      `).run(now, now);

      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at)
        VALUES ('entity-2', 'Test Entity 2', 'test entity 2', 'organization', ?, ?)
      `).run(now, now);

      // Create validation errors
      db.prepare(`
        INSERT INTO data_validation_errors (id, table_name, record_id, validation_type, error_message, severity, auto_correctable, created_at)
        VALUES ('error-1', 'entities', 'entity-1', 'constraint', 'Test validation error', 'error', 1, ?)
      `).run(now);

      // Create conflicts
      db.prepare(`
        INSERT INTO entity_conflicts (id, entity_id, conflict_type, severity, conflicting_data, auto_resolvable)
        VALUES ('conflict-1', 'entity-2', 'attribute', 'high', '{"test": "data"}', 1)
      `);

      // Create resolved conflicts for reporting
      db.prepare(`
        INSERT INTO conflict_resolutions (id, entity_id, conflict_type, severity, original_values, resolved_value, resolution_strategy, confidence, reasoning, resolved_by, created_at)
        VALUES ('resolution-1', 'entity-1', 'attribute', 'medium', '{}', '{}', 'latest_wins', 0.9, 'Test resolution', 'system', ?)
      `).run(now);
    });

    it('should generate comprehensive integrity report', async () => {
      const report = await manager.generateIntegrityReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('validationSummary');
      expect(report).toHaveProperty('conflictSummary');
      expect(report).toHaveProperty('integrityCheckResults');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('systemHealth');

      // Validation summary should have data
      expect(report.validationSummary.totalErrors).toBeGreaterThan(0);

      // Conflict summary should have data
      expect(report.conflictSummary.activeConflicts).toBeGreaterThan(0);

      // System health should be calculated
      expect(report.systemHealth.score).toBeGreaterThanOrEqual(0);
      expect(report.systemHealth.score).toBeLessThanOrEqual(100);
      expect(report.systemHealth.status).toBeOneOf(['excellent', 'good', 'fair', 'poor', 'critical']);
    });

    it('should include actionable recommendations', async () => {
      const report = await manager.generateIntegrityReport();

      expect(Array.isArray(report.recommendations)).toBe(true);
      
      if (report.recommendations.length > 0) {
        const recommendation = report.recommendations[0];
        expect(recommendation).toHaveProperty('priority');
        expect(recommendation).toHaveProperty('category');
        expect(recommendation).toHaveProperty('description');
        expect(recommendation).toHaveProperty('actionRequired');
        expect(recommendation).toHaveProperty('automatable');
        expect(recommendation.priority).toBeOneOf(['low', 'medium', 'high', 'critical']);
        expect(recommendation.category).toBeOneOf(['validation', 'conflicts', 'maintenance', 'performance']);
      }
    });
  });

  describe('Automated Maintenance', () => {
    beforeEach(async () => {
      const now = Date.now();
      
      // Create test entities
      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, mention_count, created_at, updated_at)
        VALUES ('maintenance-entity', 'Maintenance Test', 'maintenance test', 'person', 5, ?, ?)
      `).run(now, now);

      // Create only 2 mentions (inconsistent count)
      db.prepare(`
        INSERT INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, start_position, end_position, created_at)
        VALUES ('mention-1', 'maintenance-entity', 'msg1', 'conv1', 'test', 0, 4, ?)
      `).run(now);

      db.prepare(`
        INSERT INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, start_position, end_position, created_at)
        VALUES ('mention-2', 'maintenance-entity', 'msg2', 'conv1', 'test', 0, 4, ?)
      `).run(now);

      // Create auto-correctable validation error
      db.prepare(`
        INSERT INTO data_validation_errors (id, table_name, record_id, validation_type, error_message, severity, auto_correctable, created_at)
        VALUES ('correctable-error', 'entities', 'maintenance-entity', 'business_rule', 'Mention count mismatch', 'warning', 1, ?)
      `).run(now);

      // Create auto-resolvable conflict
      db.prepare(`
        INSERT INTO entity_conflicts (id, entity_id, conflict_type, severity, conflicting_data, auto_resolvable, resolution_confidence)
        VALUES ('resolvable-conflict', 'maintenance-entity', 'attribute', 'medium', ?, 1, 0.85)
      `).run(JSON.stringify([{
        attribute: 'test',
        values: [{ value: 'test', confidence: 0.9, source: 'conv1', timestamp: now }]
      }]));
    });

    it('should run maintenance with all options enabled', async () => {
      const options = {
        autoResolveConflicts: true,
        autoCorrectValidationErrors: true,
        runIntegrityChecks: true,
        optimizeDatabase: true,
        conflictResolutionThreshold: 0.8,
        maxBatchSize: 50,
        dryRun: false
      };

      const result = await manager.runMaintenance(options);

      expect(result).toHaveProperty('conflictsProcessed');
      expect(result).toHaveProperty('conflictsResolved');
      expect(result).toHaveProperty('validationErrorsProcessed');
      expect(result).toHaveProperty('validationErrorsCorrected');
      expect(result).toHaveProperty('integrityIssuesFound');
      expect(result).toHaveProperty('integrityIssuesFixed');
      expect(result).toHaveProperty('databaseOptimized');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('executionTimeMs');

      expect(result.executionTimeMs).toBeGreaterThan(0);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should run in dry-run mode without making changes', async () => {
      const options = {
        autoResolveConflicts: true,
        autoCorrectValidationErrors: true,
        runIntegrityChecks: true,
        optimizeDatabase: true,
        conflictResolutionThreshold: 0.8,
        maxBatchSize: 50,
        dryRun: true
      };

      const result = await manager.runMaintenance(options);

      // In dry-run mode, conflicts should be processed but not resolved
      expect(result.conflictsResolved).toBe(0);
      expect(result.databaseOptimized).toBe(false);
    });

    it('should handle maintenance errors gracefully', async () => {
      // Close database to cause errors
      const originalDb = db;
      db.close();

      const options = {
        autoResolveConflicts: true,
        autoCorrectValidationErrors: true,
        runIntegrityChecks: true,
        optimizeDatabase: false,
        conflictResolutionThreshold: 0.8,
        maxBatchSize: 50,
        dryRun: false
      };

      const result = await manager.runMaintenance(options);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.executionTimeMs).toBeGreaterThan(0);

      // Restore database for cleanup
      db = originalDb;
    });
  });

  describe('Entity Processing', () => {
    beforeEach(async () => {
      const now = Date.now();

      // Create test entity
      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at, metadata)
        VALUES ('process-entity', 'Process Test', 'process test', 'person', ?, ?, '{"test": true}')
      `).run(now, now);

      // Create conflicting mentions
      db.prepare(`
        INSERT INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, start_position, end_position, confidence_score, created_at)
        VALUES ('mention-process-1', 'process-entity', 'msg1', 'conv1', 'Process Test is CEO', 0, 17, 0.9, ?)
      `).run(now - 3600000);

      db.prepare(`
        INSERT INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, start_position, end_position, confidence_score, created_at)
        VALUES ('mention-process-2', 'process-entity', 'msg2', 'conv2', 'Process Test is CTO', 0, 17, 0.8, ?)
      `).run(now);
    });

    it('should process entity with all options enabled', async () => {
      const result = await manager.processEntity('process-entity', {
        validateData: true,
        detectConflicts: true,
        autoResolve: true,
        resolvedBy: 'test-processor'
      });

      expect(result).toHaveProperty('validationResult');
      expect(result).toHaveProperty('conflicts');
      expect(result).toHaveProperty('resolutionResults');
      expect(result).toHaveProperty('recommendations');

      expect(Array.isArray(result.conflicts)).toBe(true);
      expect(Array.isArray(result.resolutionResults)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);

      if (result.validationResult) {
        expect(result.validationResult).toHaveProperty('isValid');
        expect(result.validationResult).toHaveProperty('errors');
        expect(result.validationResult).toHaveProperty('warnings');
      }
    });

    it('should throw error for non-existent entity', async () => {
      await expect(manager.processEntity('non-existent', {
        validateData: true,
        detectConflicts: false,
        autoResolve: false
      })).rejects.toThrow('Entity non-existent not found');
    });

    it('should provide relevant recommendations based on entity issues', async () => {
      const result = await manager.processEntity('process-entity', {
        validateData: true,
        detectConflicts: true,
        autoResolve: false
      });

      expect(result.recommendations.length).toBeGreaterThanOrEqual(0);
      
      // If there are conflicts, should have conflict-related recommendations
      if (result.conflicts.length > 0) {
        const conflictRecs = result.recommendations.filter(r => r.includes('conflict'));
        expect(conflictRecs.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Entities Requiring Attention', () => {
    beforeEach(async () => {
      const now = Date.now();

      // Create entities with various issues
      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at)
        VALUES ('attention-entity-1', 'Critical Issues', 'critical issues', 'person', ?, ?)
      `).run(now, now);

      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at)
        VALUES ('attention-entity-2', 'Minor Issues', 'minor issues', 'organization', ?, ?)
      `).run(now, now);

      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at)
        VALUES ('clean-entity', 'Clean Entity', 'clean entity', 'product', ?, ?)
      `).run(now, now);

      // Add critical validation error
      db.prepare(`
        INSERT INTO data_validation_errors (id, table_name, record_id, validation_type, error_message, severity, auto_correctable, created_at)
        VALUES ('critical-error', 'entities', 'attention-entity-1', 'constraint', 'Critical validation error', 'critical', 0, ?)
      `).run(now);

      // Add critical conflict
      db.prepare(`
        INSERT INTO entity_conflicts (id, entity_id, conflict_type, severity, conflicting_data, auto_resolvable)
        VALUES ('critical-conflict', 'attention-entity-1', 'attribute', 'critical', '{"test": "data"}', 0)
      `);

      // Add minor warning
      db.prepare(`
        INSERT INTO data_validation_errors (id, table_name, record_id, validation_type, error_message, severity, auto_correctable, created_at)
        VALUES ('minor-warning', 'entities', 'attention-entity-2', 'format', 'Minor format issue', 'warning', 1, ?)
      `).run(now);
    });

    it('should identify entities requiring attention', async () => {
      const entities = await manager.getEntitiesRequiringAttention();

      expect(Array.isArray(entities)).toBe(true);
      expect(entities.length).toBeGreaterThan(0);

      // Should include entities with issues
      const criticalEntity = entities.find(e => e.entityId === 'attention-entity-1');
      expect(criticalEntity).toBeDefined();
      
      if (criticalEntity) {
        expect(criticalEntity.issues.length).toBeGreaterThan(0);
        expect(criticalEntity.priorityScore).toBeGreaterThan(0);
        
        // Should have critical issues
        const criticalIssues = criticalEntity.issues.filter(i => i.severity === 'critical');
        expect(criticalIssues.length).toBeGreaterThan(0);
      }

      // Should not include clean entities
      const cleanEntity = entities.find(e => e.entityId === 'clean-entity');
      expect(cleanEntity).toBeUndefined();
    });

    it('should sort entities by priority score', async () => {
      const entities = await manager.getEntitiesRequiringAttention();

      if (entities.length > 1) {
        // Should be sorted in descending order of priority score
        for (let i = 1; i < entities.length; i++) {
          expect(entities[i - 1].priorityScore).toBeGreaterThanOrEqual(entities[i].priorityScore);
        }
      }
    });

    it('should respect limit parameter', async () => {
      const entities = await manager.getEntitiesRequiringAttention(1);
      expect(entities.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Health Check', () => {
    beforeEach(async () => {
      const now = Date.now();

      // Create test data for health check
      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at)
        VALUES ('health-entity-1', 'Health Test 1', 'health test 1', 'person', ?, ?)
      `).run(now, now);

      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at)
        VALUES ('health-entity-2', 'Health Test 2', 'health test 2', 'person', ?, ?)
      `).run(now, now);

      // Add some validation errors
      db.prepare(`
        INSERT INTO data_validation_errors (id, table_name, record_id, validation_type, error_message, severity, auto_correctable, created_at)
        VALUES ('health-error-1', 'entities', 'health-entity-1', 'constraint', 'Test error', 'error', 1, ?)
      `).run(now);

      // Add some conflicts
      db.prepare(`
        INSERT INTO entity_conflicts (id, entity_id, conflict_type, severity, conflicting_data, auto_resolvable)
        VALUES ('health-conflict-1', 'health-entity-2', 'attribute', 'medium', '{"test": "data"}', 1)
      `);

      // Add maintenance record
      db.prepare(`
        INSERT INTO conflict_resolutions (id, entity_id, conflict_type, severity, original_values, resolved_value, resolution_strategy, confidence, reasoning, resolved_by, created_at)
        VALUES ('health-maintenance', 'health-entity-1', 'attribute', 'low', '{}', '{}', 'latest_wins', 0.8, 'Maintenance resolution', 'auto_maintenance', ?)
      `).run(now - 3600000);
    });

    it('should perform comprehensive health check', async () => {
      const health = await manager.healthCheck();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('issues');
      expect(health).toHaveProperty('metrics');
      expect(health).toHaveProperty('lastMaintenanceRun');

      expect(health.status).toBeOneOf(['healthy', 'warning', 'error', 'critical']);
      expect(Array.isArray(health.issues)).toBe(true);

      // Metrics should be populated
      expect(health.metrics.totalEntities).toBeGreaterThan(0);
      expect(health.metrics.entitiesWithIssues).toBeGreaterThanOrEqual(0);
      expect(health.metrics.activeConflicts).toBeGreaterThanOrEqual(0);
      expect(health.metrics.uncorrectedErrors).toBeGreaterThanOrEqual(0);
      expect(health.metrics.systemUtilization).toBeGreaterThanOrEqual(0);
      expect(health.metrics.systemUtilization).toBeLessThanOrEqual(100);
    });

    it('should detect critical status when there are critical issues', async () => {
      // Add critical issues
      db.prepare(`
        INSERT INTO entity_conflicts (id, entity_id, conflict_type, severity, conflicting_data, auto_resolvable)
        VALUES ('critical-health-conflict', 'health-entity-1', 'attribute', 'critical', '{"test": "data"}', 0)
      `);

      db.prepare(`
        INSERT INTO data_validation_errors (id, table_name, record_id, validation_type, error_message, severity, auto_correctable, created_at)
        VALUES ('critical-health-error', 'entities', 'health-entity-2', 'constraint', 'Critical error', 'critical', 0, ?)
      `).run(Date.now());

      const health = await manager.healthCheck();

      expect(health.status).toBe('critical');
      expect(health.issues.some(issue => issue.includes('critical'))).toBe(true);
    });

    it('should provide last maintenance run information', async () => {
      const health = await manager.healthCheck();

      expect(health.lastMaintenanceRun).toBeDefined();
      expect(typeof health.lastMaintenanceRun).toBe('number');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete data integrity workflow', async () => {
      const now = Date.now();

      // Create entity with multiple types of issues
      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, confidence_score, created_at, updated_at, metadata)
        VALUES ('workflow-entity', '', 'workflow entity', 'person', 1.5, ?, ?, 'invalid json{')
      `).run(now, now);

      // Step 1: Generate initial report
      const initialReport = await manager.generateIntegrityReport();
      expect(initialReport.validationSummary.totalErrors).toBeGreaterThan(0);

      // Step 2: Process the problematic entity
      const processResult = await manager.processEntity('workflow-entity', {
        validateData: true,
        detectConflicts: true,
        autoResolve: true
      });

      expect(processResult.validationResult?.isValid).toBe(false);
      expect(processResult.recommendations.length).toBeGreaterThan(0);

      // Step 3: Run maintenance
      const maintenanceResult = await manager.runMaintenance({
        autoResolveConflicts: true,
        autoCorrectValidationErrors: true,
        runIntegrityChecks: true,
        optimizeDatabase: true,
        conflictResolutionThreshold: 0.5,
        maxBatchSize: 50,
        dryRun: false
      });

      expect(maintenanceResult.executionTimeMs).toBeGreaterThan(0);

      // Step 4: Check health after maintenance
      const healthAfter = await manager.healthCheck();
      expect(healthAfter.metrics).toBeDefined();
      expect(healthAfter.lastMaintenanceRun).toBeDefined();
    });

    it('should maintain data consistency across all operations', async () => {
      const now = Date.now();

      // Create consistent test data
      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at)
        VALUES ('consistency-entity', 'Consistency Test', 'consistency test', 'person', ?, ?)
      `).run(now, now);

      db.prepare(`
        INSERT INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, start_position, end_position, created_at)
        VALUES ('consistency-mention', 'consistency-entity', 'msg1', 'conv1', 'test', 0, 4, ?)
      `).run(now);

      // Perform various operations
      await manager.processEntity('consistency-entity', {
        validateData: true,
        detectConflicts: true,
        autoResolve: true
      });

      await manager.runMaintenance({
        autoResolveConflicts: true,
        autoCorrectValidationErrors: true,
        runIntegrityChecks: true,
        optimizeDatabase: false,
        conflictResolutionThreshold: 0.5,
        maxBatchSize: 10,
        dryRun: false
      });

      // Verify entity still exists and is consistent
      const entity = db.prepare('SELECT * FROM entities WHERE id = ?').get('consistency-entity');
      expect(entity).toBeDefined();

      const mentions = db.prepare('SELECT * FROM entity_mentions WHERE entity_id = ?').all('consistency-entity');
      expect(mentions).toHaveLength(1);

      // Verify integrity
      const health = await manager.healthCheck();
      expect(health.status).not.toBe('critical');
    });
  });
});