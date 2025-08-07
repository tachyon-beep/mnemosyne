/**
 * Tests for DataValidationService
 * 
 * Critical Priority 1 tests for production-ready data validation system
 */

import Database from 'better-sqlite3';
import { DataValidationService, ValidationError, ValidationResult } from '../../../src/entities/DataValidationService.js';
import { migrations } from '../../../src/storage/migrations/index.js';

describe('DataValidationService', () => {
  let db: Database.Database;
  let validator: DataValidationService;

  beforeEach(async () => {
    // Create in-memory database
    db = new Database(':memory:');
    
    // Apply all migrations
    for (const migration of migrations) {
      for (const sql of migration.up) {
        db.exec(sql);
      }
    }

    validator = new DataValidationService(db);
    await validator.initialize();
  });

  afterEach(() => {
    db.close();
  });

  describe('Entity Validation', () => {
    it('should validate required entity fields', async () => {
      const entityData = {
        id: 'test-entity-1',
        name: '',  // Invalid: empty name
        normalized_name: 'test entity',
        type: 'person',
        confidence_score: 0.8,
        created_at: Date.now(),
        updated_at: Date.now()
      };

      const result = await validator.validateEntity(entityData.id, entityData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.errorMessage.includes('name'))).toBe(true);
    });

    it('should validate entity type constraints', async () => {
      const entityData = {
        id: 'test-entity-2',
        name: 'Test Entity',
        normalized_name: 'test entity',
        type: 'invalid_type',  // Invalid type
        confidence_score: 0.8,
        created_at: Date.now(),
        updated_at: Date.now()
      };

      const result = await validator.validateEntity(entityData.id, entityData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.errorMessage.includes('type'))).toBe(true);
    });

    it('should validate confidence score range', async () => {
      const entityData = {
        id: 'test-entity-3',
        name: 'Test Entity',
        normalized_name: 'test entity',
        type: 'person',
        confidence_score: 1.5,  // Invalid: outside range
        created_at: Date.now(),
        updated_at: Date.now()
      };

      const result = await validator.validateEntity(entityData.id, entityData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.errorMessage.includes('confidence'))).toBe(true);
      expect(result.errors.find(e => e.errorMessage.includes('confidence'))?.autoCorrectible).toBe(true);
    });

    it('should validate entity metadata JSON format', async () => {
      const entityData = {
        id: 'test-entity-4',
        name: 'Test Entity',
        normalized_name: 'test entity',
        type: 'person',
        confidence_score: 0.8,
        metadata: 'invalid json{',  // Invalid JSON
        created_at: Date.now(),
        updated_at: Date.now()
      };

      const result = await validator.validateEntity(entityData.id, entityData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.errorMessage.includes('JSON'))).toBe(true);
    });

    it('should warn about name normalization inconsistencies', async () => {
      const entityData = {
        id: 'test-entity-5',
        name: 'John Doe',
        normalized_name: 'JOHN DOE',  // Should be 'john doe'
        type: 'person',
        confidence_score: 0.8,
        created_at: Date.now(),
        updated_at: Date.now()
      };

      const result = await validator.validateEntity(entityData.id, entityData);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.errorMessage.includes('Normalized name'))).toBe(true);
    });
  });

  describe('Relationship Validation', () => {
    beforeEach(() => {
      // Create test entities for relationship validation
      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at)
        VALUES ('entity-1', 'Entity One', 'entity one', 'person', ?, ?)
      `).run(Date.now(), Date.now());

      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at)
        VALUES ('entity-2', 'Entity Two', 'entity two', 'organization', ?, ?)
      `).run(Date.now(), Date.now());
    });

    it('should validate relationship strength range', async () => {
      const relationshipData = {
        id: 'test-rel-1',
        source_entity_id: 'entity-1',
        target_entity_id: 'entity-2',
        relationship_type: 'works_for',
        strength: 1.5,  // Invalid: outside range
        first_mentioned_at: Date.now(),
        last_mentioned_at: Date.now(),
        created_at: Date.now(),
        updated_at: Date.now()
      };

      const result = await validator.validateRelationship(relationshipData.id, relationshipData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.errorMessage.includes('strength'))).toBe(true);
      expect(result.errors.find(e => e.errorMessage.includes('strength'))?.autoCorrectible).toBe(true);
    });

    it('should validate entity existence in relationships', async () => {
      const relationshipData = {
        id: 'test-rel-2',
        source_entity_id: 'non-existent-entity',  // Invalid: doesn't exist
        target_entity_id: 'entity-2',
        relationship_type: 'works_for',
        strength: 0.8,
        first_mentioned_at: Date.now(),
        last_mentioned_at: Date.now(),
        created_at: Date.now(),
        updated_at: Date.now()
      };

      const result = await validator.validateRelationship(relationshipData.id, relationshipData);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.errorMessage.includes('does not exist'))).toBe(true);
    });

    it('should detect duplicate relationships', async () => {
      // Create first relationship
      db.prepare(`
        INSERT INTO entity_relationships (id, source_entity_id, target_entity_id, relationship_type, strength, first_mentioned_at, last_mentioned_at, created_at, updated_at)
        VALUES ('existing-rel', 'entity-1', 'entity-2', 'works_for', 0.8, ?, ?, ?, ?)
      `).run(Date.now(), Date.now(), Date.now(), Date.now());

      const duplicateRelationshipData = {
        id: 'test-rel-duplicate',
        source_entity_id: 'entity-1',
        target_entity_id: 'entity-2',
        relationship_type: 'works_for',
        strength: 0.9,
        first_mentioned_at: Date.now(),
        last_mentioned_at: Date.now(),
        created_at: Date.now(),
        updated_at: Date.now()
      };

      const result = await validator.validateRelationship(duplicateRelationshipData.id, duplicateRelationshipData);

      expect(result.warnings.some(w => w.errorMessage.includes('Duplicate relationship'))).toBe(true);
    });
  });

  describe('Data Integrity Checks', () => {
    beforeEach(() => {
      // Create test data with integrity issues
      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, mention_count, created_at, updated_at)
        VALUES ('entity-with-wrong-count', 'Test Entity', 'test entity', 'person', 5, ?, ?)
      `).run(Date.now(), Date.now());

      // Create only 3 mentions (not 5 as claimed)
      db.prepare(`
        INSERT INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, start_position, end_position, created_at)
        VALUES ('mention-1', 'entity-with-wrong-count', 'msg1', 'conv1', 'test', 0, 4, ?)
      `).run(Date.now());

      db.prepare(`
        INSERT INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, start_position, end_position, created_at)
        VALUES ('mention-2', 'entity-with-wrong-count', 'msg2', 'conv1', 'test', 0, 4, ?)
      `).run(Date.now());

      db.prepare(`
        INSERT INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, start_position, end_position, created_at)
        VALUES ('mention-3', 'entity-with-wrong-count', 'msg3', 'conv1', 'test', 0, 4, ?)
      `).run(Date.now());

      // Create orphaned mention
      db.prepare(`
        INSERT INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, start_position, end_position, created_at)
        VALUES ('orphaned-mention', 'non-existent-entity', 'msg4', 'conv1', 'test', 0, 4, ?)
      `).run(Date.now());
    });

    it('should detect and fix mention count inconsistencies', async () => {
      const results = await validator.runIntegrityChecks();

      expect(results.inconsistentCounts).toBe(1);
      expect(results.autoFixedIssues).toBe(1);

      // Verify the count was fixed
      const entity = db.prepare('SELECT mention_count FROM entities WHERE id = ?').get('entity-with-wrong-count') as { mention_count: number };
      expect(entity.mention_count).toBe(3);
    });

    it('should detect orphaned entity mentions', async () => {
      const results = await validator.runIntegrityChecks();

      expect(results.orphanedMentions).toBeGreaterThan(0);
    });

    it('should detect format errors', async () => {
      // Add entity with format error
      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at)
        VALUES ('format-error-entity', '', 'empty name', 'person', ?, ?)
      `).run(Date.now(), Date.now());

      const results = await validator.runIntegrityChecks();

      expect(results.formatErrors).toBeGreaterThan(0);
    });

    it('should provide comprehensive integrity check results', async () => {
      const results = await validator.runIntegrityChecks();

      expect(typeof results.orphanedMentions).toBe('number');
      expect(typeof results.invalidRelationships).toBe('number');
      expect(typeof results.inconsistentCounts).toBe('number');
      expect(typeof results.formatErrors).toBe('number');
      expect(typeof results.totalIssues).toBe('number');
      expect(typeof results.autoFixedIssues).toBe('number');

      expect(results.totalIssues).toBe(
        results.orphanedMentions + 
        results.invalidRelationships + 
        results.inconsistentCounts + 
        results.formatErrors
      );
    });
  });

  describe('Auto-Correction', () => {
    beforeEach(async () => {
      // Create validation errors for auto-correction testing
      const errorId1 = 'auto-correct-error-1';
      const errorId2 = 'auto-correct-error-2';
      const errorId3 = 'non-correctable-error';

      // Create entity with wrong mention count
      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, mention_count, created_at, updated_at)
        VALUES ('auto-correct-entity', 'Auto Correct Test', 'auto correct test', 'person', 10, ?, ?)
      `).run(Date.now(), Date.now());

      // Create fewer mentions than claimed
      db.prepare(`
        INSERT INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, start_position, end_position, created_at)
        VALUES ('mention-auto-1', 'auto-correct-entity', 'msg1', 'conv1', 'test', 0, 4, ?)
      `).run(Date.now());

      // Add correctable validation errors
      db.prepare(`
        INSERT INTO data_validation_errors (id, table_name, record_id, validation_type, error_message, severity, auto_correctable, created_at)
        VALUES (?, 'entities', 'auto-correct-entity', 'business_rule', 'Mention count mismatch: stored=10, actual=1', 'warning', 1, ?)
      `).run(errorId1, Date.now());

      db.prepare(`
        INSERT INTO data_validation_errors (id, table_name, record_id, validation_type, error_message, severity, auto_correctable, created_at)
        VALUES (?, 'entity_mentions', 'orphaned-mention-id', 'referential_integrity', 'Orphaned mention references non-existent entity', 'error', 1, ?)
      `).run(errorId2, Date.now());

      // Add non-correctable error
      db.prepare(`
        INSERT INTO data_validation_errors (id, table_name, record_id, validation_type, error_message, severity, auto_correctable, created_at)
        VALUES (?, 'entities', 'some-entity', 'format', 'Invalid entity name format', 'error', 0, ?)
      `).run(errorId3, Date.now());
    });

    it('should auto-correct correctable validation errors', async () => {
      const result = await validator.autoCorrectErrors();

      expect(result.attempted).toBeGreaterThan(0);
      expect(result.successful).toBeGreaterThan(0);
      expect(result.errors.length).toBeLessThanOrEqual(result.failed);
    });

    it('should auto-correct specific errors when IDs provided', async () => {
      const specificErrorId = 'specific-auto-correct';
      
      db.prepare(`
        INSERT INTO data_validation_errors (id, table_name, record_id, validation_type, error_message, severity, auto_correctable, created_at)
        VALUES (?, 'entities', 'auto-correct-entity', 'business_rule', 'Mention count mismatch: stored=10, actual=1', 'warning', 1, ?)
      `).run(specificErrorId, Date.now());

      const result = await validator.autoCorrectErrors([specificErrorId]);

      expect(result.attempted).toBe(1);
    });

    it('should mark corrected errors as resolved', async () => {
      await validator.autoCorrectErrors();

      // Check that some errors were marked as corrected
      const correctedErrors = db.prepare(`
        SELECT COUNT(*) as count FROM data_validation_errors 
        WHERE corrected_at IS NOT NULL
      `).get() as { count: number };

      expect(correctedErrors.count).toBeGreaterThan(0);
    });
  });

  describe('Validation Error Reporting', () => {
    beforeEach(() => {
      // Create test validation errors
      const now = Date.now();
      
      db.prepare(`
        INSERT INTO data_validation_errors (id, table_name, record_id, validation_type, error_message, severity, auto_correctable, created_at)
        VALUES ('report-error-1', 'entities', 'entity-1', 'constraint', 'Required field missing', 'error', 0, ?)
      `).run(now - 3600000);

      db.prepare(`
        INSERT INTO data_validation_errors (id, table_name, record_id, validation_type, error_message, severity, auto_correctable, created_at)
        VALUES ('report-error-2', 'entity_relationships', 'rel-1', 'range', 'Value outside valid range', 'warning', 1, ?)
      `).run(now - 1800000);

      db.prepare(`
        INSERT INTO data_validation_errors (id, table_name, record_id, validation_type, error_message, severity, auto_correctable, created_at, corrected_at, correction_method)
        VALUES ('report-error-3', 'entities', 'entity-2', 'format', 'Invalid format', 'error', 1, ?, ?, 'auto_correction')
      `).run(now - 900000, now - 450000);
    });

    it('should generate comprehensive validation error summary', async () => {
      const summary = await validator.getValidationErrorSummary();

      expect(summary.totalErrors).toBeGreaterThanOrEqual(3);
      expect(summary.errorsByType).toHaveProperty('constraint');
      expect(summary.errorsByType).toHaveProperty('range');
      expect(summary.errorsByType).toHaveProperty('format');
      expect(summary.errorsBySeverity).toHaveProperty('error');
      expect(summary.errorsBySeverity).toHaveProperty('warning');
      expect(summary.uncorrectedErrors).toBeGreaterThanOrEqual(2);
      expect(summary.autoCorrectibleErrors).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(summary.recentErrors)).toBe(true);
    });

    it('should filter error summary by time range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);

      const summary = await validator.getValidationErrorSummary({
        start: oneHourAgo,
        end: now
      });

      expect(summary.totalErrors).toBeGreaterThan(0);
      // Should include errors from the last hour only
    });

    it('should provide detailed recent error information', async () => {
      const summary = await validator.getValidationErrorSummary();

      expect(summary.recentErrors.length).toBeGreaterThan(0);
      
      const recentError = summary.recentErrors[0];
      expect(recentError).toHaveProperty('id');
      expect(recentError).toHaveProperty('tableName');
      expect(recentError).toHaveProperty('recordId');
      expect(recentError).toHaveProperty('validationType');
      expect(recentError).toHaveProperty('errorMessage');
      expect(recentError).toHaveProperty('severity');
      expect(recentError).toHaveProperty('autoCorrectible');
      expect(recentError).toHaveProperty('createdAt');
    });
  });

  describe('Database Trigger Integration', () => {
    it('should trigger validation on entity mention insert', async () => {
      // This tests the database triggers created in the migration
      
      // Try to insert a mention for a non-existent entity
      expect(() => {
        db.prepare(`
          INSERT INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, start_position, end_position, created_at)
          VALUES ('trigger-test-mention', 'non-existent-entity', 'msg1', 'conv1', 'test', 0, 4, ?)
        `).run(Date.now());
      }).toThrow(); // Should be prevented by trigger

      // Verify error was logged
      const errors = db.prepare(`
        SELECT * FROM data_validation_errors 
        WHERE table_name = 'entity_mentions' AND record_id = 'trigger-test-mention'
      `).all();

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should trigger validation on invalid mention positions', async () => {
      // Create valid entity first
      db.prepare(`
        INSERT INTO entities (id, name, normalized_name, type, created_at, updated_at)
        VALUES ('trigger-entity', 'Trigger Test', 'trigger test', 'person', ?, ?)
      `).run(Date.now(), Date.now());

      // Try to insert mention with invalid positions
      expect(() => {
        db.prepare(`
          INSERT INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, start_position, end_position, created_at)
          VALUES ('invalid-position-mention', 'trigger-entity', 'msg1', 'conv1', 'test', 10, 5, ?)
        `).run(Date.now()); // start_position > end_position
      }).toThrow();

      // Verify error was logged
      const errors = db.prepare(`
        SELECT * FROM data_validation_errors 
        WHERE table_name = 'entity_mentions' AND validation_type = 'range'
      `).all();

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should trigger validation on relationship insert with non-existent entities', async () => {
      expect(() => {
        db.prepare(`
          INSERT INTO entity_relationships (id, source_entity_id, target_entity_id, relationship_type, strength, first_mentioned_at, last_mentioned_at, created_at, updated_at)
          VALUES ('trigger-test-rel', 'non-existent-1', 'non-existent-2', 'works_for', 0.8, ?, ?, ?, ?)
        `).run(Date.now(), Date.now(), Date.now(), Date.now());
      }).toThrow(); // Should be prevented by trigger

      // Verify error was logged
      const errors = db.prepare(`
        SELECT * FROM data_validation_errors 
        WHERE table_name = 'entity_relationships' AND validation_type = 'referential_integrity'
      `).all();

      expect(errors.length).toBeGreaterThan(0);
    });
  });
});