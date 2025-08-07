/**
 * Tests for ConflictResolutionEngine
 * 
 * Critical Priority 1 tests for production-ready conflict resolution system
 */

import Database from 'better-sqlite3';
import { ConflictResolutionEngine, EntityConflict, ResolutionStrategy } from '../../../src/entities/ConflictResolutionEngine.js';
import { migrations } from '../../../src/storage/migrations/index.js';

describe('ConflictResolutionEngine', () => {
  let db: Database.Database;
  let engine: ConflictResolutionEngine;

  beforeEach(async () => {
    // Create in-memory database
    db = new Database(':memory:');
    
    // Apply all migrations
    for (const migration of migrations) {
      for (const sql of migration.up) {
        db.exec(sql);
      }
    }

    engine = new ConflictResolutionEngine(db);
    await engine.initialize();
  });

  afterEach(() => {
    db.close();
  });

  describe('Conflict Detection', () => {
    it('should detect attribute conflicts between entity mentions', async () => {
      // Create test entity
      const entityId = 'test-entity-1';
      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at)
        VALUES (?, 'John Doe', 'john doe', 'person', ?, ?)
      `).run(entityId, Date.now(), Date.now());

      // Create conflicting mentions
      db.prepare(`
        INSERT INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, start_position, end_position, confidence_score, created_at)
        VALUES (?, ?, 'msg1', 'conv1', 'John Doe is CEO', 0, 11, 0.9, ?)
      `).run('mention-1', entityId, Date.now() - 3600000);

      db.prepare(`
        INSERT INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, start_position, end_position, confidence_score, created_at)
        VALUES (?, ?, 'msg2', 'conv2', 'John Doe is CTO', 0, 11, 0.8, ?)
      `).run('mention-2', entityId, Date.now());

      const conflicts = await engine.detectEntityConflicts(entityId);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictType).toBe('attribute');
      expect(conflicts[0].entityId).toBe(entityId);
      expect(conflicts[0].severity).toBeOneOf(['medium', 'high']);
    });

    it('should detect temporal conflicts in entity evolution', async () => {
      const entityId = 'test-entity-temporal';
      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at)
        VALUES (?, 'Jane Smith', 'jane smith', 'person', ?, ?)
      `).run(entityId, Date.now(), Date.now());

      // Create temporal conflict mentions
      db.prepare(`
        INSERT INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, start_position, end_position, confidence_score, created_at)
        VALUES (?, ?, 'msg1', 'conv1', 'Jane is at Google', 0, 15, 0.9, ?)
      `).run('mention-temporal-1', entityId, Date.now() - 7200000);

      db.prepare(`
        INSERT INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, start_position, end_position, confidence_score, created_at)
        VALUES (?, ?, 'msg2', 'conv2', 'Jane is at Microsoft', 0, 18, 0.9, ?)
      `).run('mention-temporal-2', entityId, Date.now());

      const conflicts = await engine.detectEntityConflicts(entityId);

      expect(conflicts.length).toBeGreaterThan(0);
      const temporalConflicts = conflicts.filter(c => c.conflictType === 'temporal');
      expect(temporalConflicts.length).toBeGreaterThan(0);
    });

    it('should detect relationship strength conflicts', async () => {
      const entity1Id = 'test-entity-rel1';
      const entity2Id = 'test-entity-rel2';

      // Create entities
      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at)
        VALUES (?, 'Company A', 'company a', 'organization', ?, ?)
      `).run(entity1Id, Date.now(), Date.now());

      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at)
        VALUES (?, 'Person B', 'person b', 'person', ?, ?)
      `).run(entity2Id, Date.now(), Date.now());

      // Create conflicting relationships
      db.prepare(`
        INSERT INTO entity_relationships (id, source_entity_id, target_entity_id, relationship_type, strength, first_mentioned_at, last_mentioned_at, created_at, updated_at)
        VALUES (?, ?, ?, 'works_for', 0.9, ?, ?, ?, ?)
      `).run('rel-1', entity2Id, entity1Id, Date.now() - 3600000, Date.now() - 3600000, Date.now(), Date.now());

      db.prepare(`
        INSERT INTO entity_relationships (id, source_entity_id, target_entity_id, relationship_type, strength, first_mentioned_at, last_mentioned_at, created_at, updated_at)
        VALUES (?, ?, ?, 'works_for', 0.3, ?, ?, ?, ?)
      `).run('rel-2', entity2Id, entity1Id, Date.now(), Date.now(), Date.now(), Date.now());

      const conflicts = await engine.detectEntityConflicts(entity1Id);

      expect(conflicts.length).toBeGreaterThan(0);
      const relationshipConflicts = conflicts.filter(c => c.conflictType === 'relationship');
      expect(relationshipConflicts.length).toBeGreaterThan(0);
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve conflicts using latest_wins strategy', async () => {
      const entityId = 'test-resolution-1';
      
      // Create entity with conflict
      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at)
        VALUES (?, 'Test Entity', 'test entity', 'person', ?, ?)
      `).run(entityId, Date.now(), Date.now());

      // Create a conflict manually
      const conflictId = 'conflict-latest-wins';
      db.prepare(`
        INSERT INTO entity_conflicts (id, entity_id, conflict_type, severity, conflicting_data, auto_resolvable)
        VALUES (?, ?, 'attribute', 'medium', ?, 1)
      `).run(
        conflictId,
        entityId,
        JSON.stringify([{
          attribute: 'role',
          values: [
            { value: 'CEO', confidence: 0.8, source: 'conv1', timestamp: Date.now() - 3600000 },
            { value: 'CTO', confidence: 0.8, source: 'conv2', timestamp: Date.now() }
          ]
        }])
      );

      const results = await engine.resolveConflicts([conflictId]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].resolution.type).toBeOneOf(['latest_wins', 'highest_confidence', 'merge']);
      expect(results[0].auditId).toBeDefined();
    });

    it('should resolve conflicts using highest_confidence strategy', async () => {
      const entityId = 'test-resolution-2';
      
      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at)
        VALUES (?, 'Test Entity 2', 'test entity 2', 'person', ?, ?)
      `).run(entityId, Date.now(), Date.now());

      const conflictId = 'conflict-confidence';
      db.prepare(`
        INSERT INTO entity_conflicts (id, entity_id, conflict_type, severity, conflicting_data, auto_resolvable)
        VALUES (?, ?, 'attribute', 'medium', ?, 1)
      `).run(
        conflictId,
        entityId,
        JSON.stringify([{
          attribute: 'name',
          values: [
            { value: 'John Smith', confidence: 0.95, source: 'conv1', timestamp: Date.now() - 3600000 },
            { value: 'John Doe', confidence: 0.7, source: 'conv2', timestamp: Date.now() }
          ]
        }])
      );

      const results = await engine.resolveConflicts([conflictId]);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].resolution.resolvedValue).toBe('John Smith'); // Higher confidence
    });

    it('should create proper audit trails for resolved conflicts', async () => {
      const entityId = 'test-audit-trail';
      
      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at)
        VALUES (?, 'Audit Test', 'audit test', 'person', ?, ?)
      `).run(entityId, Date.now(), Date.now());

      const conflictId = 'conflict-audit';
      db.prepare(`
        INSERT INTO entity_conflicts (id, entity_id, conflict_type, severity, conflicting_data, auto_resolvable)
        VALUES (?, ?, 'attribute', 'low', ?, 1)
      `).run(
        conflictId,
        entityId,
        JSON.stringify([{
          attribute: 'status',
          values: [
            { value: 'active', confidence: 0.8, source: 'conv1', timestamp: Date.now() }
          ]
        }])
      );

      const results = await engine.resolveConflicts([conflictId], 'test-system');

      expect(results[0].success).toBe(true);

      // Verify audit trail
      const auditTrail = await engine.getResolutionAuditTrail(entityId);
      expect(auditTrail).toHaveLength(1);
      expect(auditTrail[0].resolvedBy).toBe('test-system');
      expect(auditTrail[0].resolutionStrategy).toBeDefined();
      expect(auditTrail[0].reasoning).toBeDefined();
    });
  });

  describe('Resolution Rules', () => {
    it('should add and apply custom resolution rules', async () => {
      // Add custom rule
      const ruleId = await engine.upsertResolutionRule({
        ruleType: 'temporal',
        attributePattern: 'status|location',
        entityType: 'person',
        resolutionStrategy: 'latest_wins',
        confidenceThreshold: 0.5,
        priority: 1,
        active: true,
        description: 'Test rule for temporal conflicts'
      });

      expect(ruleId).toBeGreaterThan(0);

      // Create a conflict that should match this rule
      const entityId = 'test-custom-rule';
      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at)
        VALUES (?, 'Rule Test', 'rule test', 'person', ?, ?)
      `).run(entityId, Date.now(), Date.now());

      const conflictId = 'conflict-custom-rule';
      db.prepare(`
        INSERT INTO entity_conflicts (id, entity_id, conflict_type, severity, conflicting_data, auto_resolvable)
        VALUES (?, ?, 'temporal', 'medium', ?, 1)
      `).run(
        conflictId,
        entityId,
        JSON.stringify([{
          attribute: 'status',
          values: [
            { value: 'inactive', confidence: 0.8, source: 'conv1', timestamp: Date.now() - 3600000 },
            { value: 'active', confidence: 0.8, source: 'conv2', timestamp: Date.now() }
          ]
        }])
      );

      const results = await engine.resolveConflicts([conflictId]);

      expect(results[0].success).toBe(true);
      expect(results[0].resolution.ruleId).toBe(ruleId);
      expect(results[0].resolution.type).toBe('latest_wins');
    });
  });

  describe('Conflict Reporting', () => {
    it('should generate comprehensive conflict resolution reports', async () => {
      const entityId = 'test-reporting';
      
      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at)
        VALUES (?, 'Report Test', 'report test', 'person', ?, ?)
      `).run(entityId, Date.now(), Date.now());

      // Create some resolved conflicts for reporting
      const now = Date.now();
      db.prepare(`
        INSERT INTO conflict_resolutions 
        (id, entity_id, conflict_type, severity, original_values, resolved_value, resolution_strategy, confidence, reasoning, resolved_by, created_at)
        VALUES (?, ?, 'attribute', 'medium', '{}', '{"resolved": true}', 'latest_wins', 0.9, 'Test resolution', 'system', ?)
      `).run('resolution-1', entityId, now - 3600000);

      db.prepare(`
        INSERT INTO conflict_resolutions 
        (id, entity_id, conflict_type, severity, original_values, resolved_value, resolution_strategy, confidence, reasoning, resolved_by, created_at)
        VALUES (?, ?, 'temporal', 'high', '{}', '{"resolved": true}', 'highest_confidence', 0.8, 'Test resolution 2', 'system', ?)
      `).run('resolution-2', entityId, now - 1800000);

      const report = await engine.generateResolutionReport({
        start: new Date(now - 7200000),
        end: new Date(now)
      });

      expect(report.totalConflicts).toBeGreaterThanOrEqual(2);
      expect(report.resolvedAutomatically).toBeGreaterThanOrEqual(2);
      expect(report.resolutionsByType).toHaveProperty('latest_wins');
      expect(report.resolutionsByType).toHaveProperty('highest_confidence');
      expect(report.confidenceDistribution).toBeDefined();
      expect(report.confidenceDistribution.high).toBeGreaterThanOrEqual(2);
    });

    it('should get active conflicts with proper filtering', async () => {
      const entityId1 = 'test-active-1';
      const entityId2 = 'test-active-2';
      
      // Create test entities
      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at)
        VALUES (?, 'Active Test 1', 'active test 1', 'person', ?, ?)
      `).run(entityId1, Date.now(), Date.now());

      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at)
        VALUES (?, 'Active Test 2', 'active test 2', 'organization', ?, ?)
      `).run(entityId2, Date.now(), Date.now());

      // Create active conflicts
      db.prepare(`
        INSERT INTO entity_conflicts (id, entity_id, conflict_type, severity, conflicting_data, auto_resolvable)
        VALUES (?, ?, 'attribute', 'critical', '{}', 0)
      `).run('active-conflict-1', entityId1);

      db.prepare(`
        INSERT INTO entity_conflicts (id, entity_id, conflict_type, severity, conflicting_data, auto_resolvable)
        VALUES (?, ?, 'relationship', 'medium', '{}', 1)
      `).run('active-conflict-2', entityId2);

      // Test filtering by severity
      const criticalConflicts = await engine.getActiveConflicts({ severity: 'critical' });
      expect(criticalConflicts).toHaveLength(1);
      expect(criticalConflicts[0].severity).toBe('critical');

      // Test filtering by auto-resolvable
      const autoResolvable = await engine.getActiveConflicts({ autoResolvable: true });
      expect(autoResolvable).toHaveLength(1);
      expect(autoResolvable[0].autoResolvable).toBe(true);

      // Test all active conflicts
      const allActive = await engine.getActiveConflicts();
      expect(allActive.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent entity gracefully', async () => {
      const nonExistentId = 'non-existent-entity';
      
      await expect(engine.detectEntityConflicts(nonExistentId))
        .rejects.toThrow('Entity non-existent-entity not found');
    });

    it('should handle non-existent conflict gracefully', async () => {
      const results = await engine.resolveConflicts(['non-existent-conflict']);
      
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('not found');
    });

    it('should continue processing even if individual conflict resolution fails', async () => {
      const entityId = 'test-error-handling';
      
      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at)
        VALUES (?, 'Error Test', 'error test', 'person', ?, ?)
      `).run(entityId, Date.now(), Date.now());

      const validConflictId = 'valid-conflict';
      const invalidConflictId = 'invalid-conflict';

      // Create one valid conflict
      db.prepare(`
        INSERT INTO entity_conflicts (id, entity_id, conflict_type, severity, conflicting_data, auto_resolvable)
        VALUES (?, ?, 'attribute', 'low', ?, 1)
      `).run(
        validConflictId,
        entityId,
        JSON.stringify([{
          attribute: 'test',
          values: [{ value: 'test', confidence: 0.8, source: 'conv1', timestamp: Date.now() }]
        }])
      );

      const results = await engine.resolveConflicts([validConflictId, invalidConflictId]);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);  // Valid conflict resolved
      expect(results[1].success).toBe(false); // Invalid conflict failed
      expect(results[1].error).toBeDefined();
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity during conflict resolution', async () => {
      const entityId = 'test-integrity';
      
      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at)
        VALUES (?, 'Integrity Test', 'integrity test', 'person', ?, ?)
      `).run(entityId, Date.now(), Date.now());

      const conflictId = 'conflict-integrity';
      db.prepare(`
        INSERT INTO entity_conflicts (id, entity_id, conflict_type, severity, conflicting_data, auto_resolvable)
        VALUES (?, ?, 'attribute', 'medium', ?, 1)
      `).run(
        conflictId,
        entityId,
        JSON.stringify([{
          attribute: 'name',
          values: [{ value: 'Updated Name', confidence: 0.9, source: 'conv1', timestamp: Date.now() }]
        }])
      );

      await engine.resolveConflicts([conflictId]);

      // Verify entity still exists and is properly referenced
      const entity = db.prepare('SELECT * FROM entities WHERE id = ?').get(entityId);
      expect(entity).toBeDefined();

      // Verify conflict is marked as resolved
      const conflict = db.prepare('SELECT * FROM entity_conflicts WHERE id = ?').get(conflictId);
      expect(conflict.resolved_at).not.toBeNull();

      // Verify audit entry exists
      const auditEntry = db.prepare('SELECT * FROM conflict_resolutions WHERE entity_id = ?').get(entityId);
      expect(auditEntry).toBeDefined();
    });
  });
});