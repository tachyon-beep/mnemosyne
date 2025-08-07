/**
 * Migration: Conflict Resolution and Data Integrity
 * 
 * Implements comprehensive conflict resolution audit trails, data integrity constraints,
 * and automated resolution strategies for production-ready conflict management.
 * 
 * Priority 1 fixes for production release:
 * - Conflict resolution audit trail
 * - Cross-table consistency checks via triggers
 * - Data validation layers
 * - Resolution strategy engine
 */

import { Migration } from './Migration.js';

export const migration_005_conflict_resolution: Migration = {
  version: 5,
  description: 'Add conflict resolution audit trails, data integrity constraints, and automated resolution strategies',
  
  up: [
    // Create conflict_resolution_rules table - Defines automated resolution strategies
    `CREATE TABLE IF NOT EXISTS conflict_resolution_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_type TEXT NOT NULL CHECK (rule_type IN ('temporal', 'confidence', 'merge', 'review', 'all')),
      attribute_pattern TEXT, -- Regex pattern for attribute names, '*' for all
      entity_type TEXT CHECK (entity_type IN ('person', 'organization', 'product', 'concept', 'location', 'technical', 'event', 'decision', '*')),
      resolution_strategy TEXT NOT NULL CHECK (resolution_strategy IN ('latest_wins', 'highest_confidence', 'merge', 'user_review', 'keep_both')),
      confidence_threshold REAL DEFAULT 0.7 CHECK (confidence_threshold >= 0.0 AND confidence_threshold <= 1.0),
      priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 10),
      active BOOLEAN DEFAULT 1,
      description TEXT,
      created_at INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT 0
    )`,

    // Create conflict_resolutions table - Audit trail for all resolution decisions
    `CREATE TABLE IF NOT EXISTS conflict_resolutions (
      id TEXT PRIMARY KEY,
      entity_id TEXT NOT NULL,
      conflict_type TEXT NOT NULL CHECK (conflict_type IN ('attribute', 'relationship', 'temporal', 'semantic', 'merge_candidate')),
      severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
      original_values TEXT NOT NULL, -- JSON of conflicting values
      resolved_value TEXT NOT NULL, -- JSON of final resolution
      resolution_strategy TEXT NOT NULL CHECK (resolution_strategy IN ('latest_wins', 'highest_confidence', 'merge', 'user_review', 'keep_both', 'manual_override')),
      confidence REAL NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
      reasoning TEXT, -- Human-readable explanation
      resolved_by TEXT NOT NULL, -- 'system', 'auto_rule', user_id, or tool name
      rule_id INTEGER, -- Reference to rule used (if applicable)
      affected_attributes TEXT, -- JSON array of attribute names
      context_data TEXT, -- JSON of additional context
      created_at INTEGER NOT NULL DEFAULT 0,
      
      FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
      FOREIGN KEY (rule_id) REFERENCES conflict_resolution_rules(id)
    )`,

    // Create entity_conflicts table - Active conflicts awaiting resolution
    `CREATE TABLE IF NOT EXISTS entity_conflicts (
      id TEXT PRIMARY KEY,
      entity_id TEXT NOT NULL,
      conflict_type TEXT NOT NULL CHECK (conflict_type IN ('attribute', 'relationship', 'temporal', 'semantic', 'merge_candidate')),
      severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
      conflicting_data TEXT NOT NULL, -- JSON of all conflicting values
      suggested_resolution TEXT, -- JSON of system suggestion
      auto_resolvable BOOLEAN DEFAULT 0,
      resolution_confidence REAL, -- Confidence in suggested resolution
      first_detected_at INTEGER NOT NULL DEFAULT 0,
      last_updated_at INTEGER NOT NULL DEFAULT 0,
      resolved_at INTEGER, -- NULL if still active
      resolution_id TEXT, -- Reference to conflict_resolutions entry
      
      FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
      FOREIGN KEY (resolution_id) REFERENCES conflict_resolutions(id)
    )`,

    // Create data_validation_errors table - Track validation failures
    `CREATE TABLE IF NOT EXISTS data_validation_errors (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      validation_type TEXT NOT NULL CHECK (validation_type IN ('constraint', 'referential_integrity', 'business_rule', 'format', 'range')),
      error_message TEXT NOT NULL,
      error_details TEXT, -- JSON with specific validation failure info
      severity TEXT NOT NULL CHECK (severity IN ('warning', 'error', 'critical')),
      auto_correctable BOOLEAN DEFAULT 0,
      corrected_at INTEGER,
      correction_method TEXT,
      created_at INTEGER NOT NULL DEFAULT 0,
      
      UNIQUE(table_name, record_id, validation_type, created_at)
    )`,

    // Create indexes for conflict resolution tables
    `CREATE INDEX IF NOT EXISTS idx_conflict_resolutions_entity ON conflict_resolutions(entity_id)`,
    `CREATE INDEX IF NOT EXISTS idx_conflict_resolutions_timestamp ON conflict_resolutions(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_conflict_resolutions_strategy ON conflict_resolutions(resolution_strategy)`,
    `CREATE INDEX IF NOT EXISTS idx_conflict_resolutions_severity ON conflict_resolutions(severity)`,
    `CREATE INDEX IF NOT EXISTS idx_conflict_resolutions_resolved_by ON conflict_resolutions(resolved_by)`,

    `CREATE INDEX IF NOT EXISTS idx_entity_conflicts_entity ON entity_conflicts(entity_id)`,
    `CREATE INDEX IF NOT EXISTS idx_entity_conflicts_severity ON entity_conflicts(severity DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_entity_conflicts_active ON entity_conflicts(resolved_at) WHERE resolved_at IS NULL`,
    `CREATE INDEX IF NOT EXISTS idx_entity_conflicts_auto_resolvable ON entity_conflicts(auto_resolvable) WHERE auto_resolvable = 1`,

    `CREATE INDEX IF NOT EXISTS idx_resolution_rules_active ON conflict_resolution_rules(active, priority DESC) WHERE active = 1`,
    `CREATE INDEX IF NOT EXISTS idx_resolution_rules_type ON conflict_resolution_rules(rule_type, entity_type)`,

    `CREATE INDEX IF NOT EXISTS idx_validation_errors_table ON data_validation_errors(table_name, record_id)`,
    `CREATE INDEX IF NOT EXISTS idx_validation_errors_severity ON data_validation_errors(severity, created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_validation_errors_uncorrected ON data_validation_errors(corrected_at) WHERE corrected_at IS NULL`,

    // Insert default conflict resolution rules
    `INSERT INTO conflict_resolution_rules (rule_type, attribute_pattern, entity_type, resolution_strategy, confidence_threshold, priority, description) VALUES
      ('temporal', 'location|position|status|current_role', '*', 'latest_wins', 0.6, 1, 'For dynamic attributes like location and status, most recent value wins'),
      ('confidence', 'name|type|category|canonical_form', '*', 'highest_confidence', 0.8, 2, 'For static attributes, highest confidence value wins'),
      ('merge', 'tags|aliases|properties|metadata', '*', 'merge', 0.5, 3, 'Mergeable attributes are combined when possible'),
      ('review', '*', '*', 'user_review', 0.3, 10, 'Low confidence conflicts require human review')`,

    // Create data integrity triggers

    // Trigger: Prevent entity_mentions with non-existent entities
    `CREATE TRIGGER IF NOT EXISTS validate_entity_mention_entity_exists
     BEFORE INSERT ON entity_mentions
     WHEN NOT EXISTS (SELECT 1 FROM entities WHERE id = NEW.entity_id)
     BEGIN
       INSERT INTO data_validation_errors (id, table_name, record_id, validation_type, error_message, severity)
       VALUES (
         hex(randomblob(16)), 
         'entity_mentions', 
         NEW.id,
         'referential_integrity',
         'Referenced entity_id ' || NEW.entity_id || ' does not exist',
         'error'
       );
       SELECT RAISE(ABORT, 'Entity mention references non-existent entity: ' || NEW.entity_id);
     END`,

    // Trigger: Prevent entity_relationships with non-existent entities
    `CREATE TRIGGER IF NOT EXISTS validate_relationship_entities_exist
     BEFORE INSERT ON entity_relationships
     WHEN NOT EXISTS (SELECT 1 FROM entities WHERE id = NEW.source_entity_id) 
       OR NOT EXISTS (SELECT 1 FROM entities WHERE id = NEW.target_entity_id)
     BEGIN
       INSERT INTO data_validation_errors (id, table_name, record_id, validation_type, error_message, severity)
       VALUES (
         hex(randomblob(16)), 
         'entity_relationships', 
         NEW.id,
         'referential_integrity',
         'Relationship references non-existent entity(ies): source=' || NEW.source_entity_id || ', target=' || NEW.target_entity_id,
         'error'
       );
       SELECT RAISE(ABORT, 'Entity relationship references non-existent entity(ies)');
     END`,

    // Trigger: Validate entity mention positions
    `CREATE TRIGGER IF NOT EXISTS validate_mention_positions
     BEFORE INSERT ON entity_mentions
     WHEN NEW.start_position < 0 OR NEW.end_position <= NEW.start_position
     BEGIN
       INSERT INTO data_validation_errors (id, table_name, record_id, validation_type, error_message, severity)
       VALUES (
         hex(randomblob(16)), 
         'entity_mentions', 
         NEW.id,
         'range',
         'Invalid mention positions: start=' || NEW.start_position || ', end=' || NEW.end_position,
         'error'
       );
       SELECT RAISE(ABORT, 'Invalid entity mention position range');
     END`,

    // Trigger: Detect potential entity conflicts on insert/update
    `CREATE TRIGGER IF NOT EXISTS detect_entity_conflicts_on_update
     AFTER UPDATE OF name, normalized_name, type, canonical_form, metadata ON entities
     WHEN OLD.name != NEW.name 
       OR OLD.normalized_name != NEW.normalized_name 
       OR OLD.type != NEW.type 
       OR OLD.canonical_form != NEW.canonical_form
       OR OLD.metadata != NEW.metadata
     BEGIN
       -- Insert conflict detection for similar entities
       INSERT OR IGNORE INTO entity_conflicts (
         id,
         entity_id,
         conflict_type,
         severity,
         conflicting_data,
         suggested_resolution,
         auto_resolvable
       )
       SELECT 
         hex(randomblob(16)),
         NEW.id,
         'attribute',
         CASE 
           WHEN OLD.type != NEW.type THEN 'high'
           WHEN OLD.name != NEW.name THEN 'medium'
           ELSE 'low'
         END,
         json_object(
           'old_values', json_object(
             'name', OLD.name,
             'normalized_name', OLD.normalized_name,
             'type', OLD.type,
             'canonical_form', OLD.canonical_form,
             'metadata', OLD.metadata
           ),
           'new_values', json_object(
             'name', NEW.name,
             'normalized_name', NEW.normalized_name,
             'type', NEW.type,
             'canonical_form', NEW.canonical_form,
             'metadata', NEW.metadata
           )
         ),
         json_object('strategy', 'latest_wins', 'confidence', 0.8),
         1
       WHERE NOT EXISTS (
         SELECT 1 FROM entity_conflicts 
         WHERE entity_id = NEW.id AND resolved_at IS NULL
       );
     END`,

    // Trigger: Log entity evolution for audit trail
    `CREATE TRIGGER IF NOT EXISTS log_entity_evolution
     AFTER UPDATE OF name, type, canonical_form, metadata ON entities
     WHEN OLD.name != NEW.name 
       OR OLD.type != NEW.type 
       OR OLD.canonical_form != NEW.canonical_form
       OR OLD.metadata != NEW.metadata
     BEGIN
       INSERT INTO entity_evolution (
         id,
         entity_id,
         conversation_id,
         evolution_type,
         previous_value,
         new_value,
         confidence_score
       ) VALUES (
         hex(randomblob(16)),
         NEW.id,
         'system_update',
         CASE 
           WHEN OLD.name != NEW.name THEN 'description_updated'
           WHEN OLD.type != NEW.type THEN 'status_changed'
           WHEN OLD.canonical_form != NEW.canonical_form THEN 'alias_added'
           ELSE 'property_added'
         END,
         json_object(
           'name', OLD.name,
           'type', OLD.type,
           'canonical_form', OLD.canonical_form,
           'metadata', OLD.metadata
         ),
         json_object(
           'name', NEW.name,
           'type', NEW.type,
           'canonical_form', NEW.canonical_form,
           'metadata', NEW.metadata
         ),
         0.9
       );
     END`,

    // Trigger: Update rule timestamps
    `CREATE TRIGGER IF NOT EXISTS update_resolution_rules_timestamp
     BEFORE UPDATE ON conflict_resolution_rules
     BEGIN
       UPDATE conflict_resolution_rules 
       SET updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
       WHERE id = NEW.id;
     END`,

    // Create view for conflict resolution dashboard
    `CREATE VIEW IF NOT EXISTS conflict_resolution_dashboard AS
     SELECT 
       'active_conflicts' as metric,
       COUNT(*) as value,
       NULL as entity_type
     FROM entity_conflicts 
     WHERE resolved_at IS NULL
     
     UNION ALL
     
     SELECT 
       'critical_conflicts' as metric,
       COUNT(*) as value,
       NULL as entity_type
     FROM entity_conflicts 
     WHERE resolved_at IS NULL AND severity = 'critical'
     
     UNION ALL
     
     SELECT 
       'auto_resolvable' as metric,
       COUNT(*) as value,
       NULL as entity_type
     FROM entity_conflicts 
     WHERE resolved_at IS NULL AND auto_resolvable = 1
     
     UNION ALL
     
     SELECT 
       'recent_resolutions' as metric,
       COUNT(*) as value,
       resolved_by as entity_type
     FROM conflict_resolutions 
     WHERE created_at > (CAST(strftime('%s', 'now') AS INTEGER) - 86400) * 1000
     GROUP BY resolved_by`,

    // Create view for validation error summary
    `CREATE VIEW IF NOT EXISTS validation_error_summary AS
     SELECT 
       table_name,
       validation_type,
       severity,
       COUNT(*) as error_count,
       COUNT(CASE WHEN corrected_at IS NULL THEN 1 END) as uncorrected_count,
       MAX(created_at) as last_error_at
     FROM data_validation_errors
     GROUP BY table_name, validation_type, severity`,

    // Enable WAL mode for better concurrent access during conflict resolution
    `PRAGMA journal_mode = WAL`,

    // Enable foreign key constraints
    `PRAGMA foreign_keys = ON`,

    // Insert initial configuration for conflict resolution
    `INSERT OR REPLACE INTO persistence_state (key, value, updated_at) VALUES 
      ('conflict_resolution.enabled', 'true', ` + Date.now() + `)`,
    
    `INSERT OR REPLACE INTO persistence_state (key, value, updated_at) VALUES 
      ('conflict_resolution.auto_resolve_threshold', '0.8', ` + Date.now() + `)`,
    
    `INSERT OR REPLACE INTO persistence_state (key, value, updated_at) VALUES 
      ('conflict_resolution.max_conflicts_per_batch', '50', ` + Date.now() + `)`,
    
    `INSERT OR REPLACE INTO persistence_state (key, value, updated_at) VALUES 
      ('conflict_resolution.audit_retention_days', '365', ` + Date.now() + `)`,

    `INSERT OR REPLACE INTO persistence_state (key, value, updated_at) VALUES 
      ('data_validation.enabled', 'true', ` + Date.now() + `)`,

    `INSERT OR REPLACE INTO persistence_state (key, value, updated_at) VALUES 
      ('data_validation.auto_correction_enabled', 'false', ` + Date.now() + `)`
  ],

  down: [
    // Remove configuration
    `DELETE FROM persistence_state 
     WHERE key LIKE 'conflict_resolution.%' OR key LIKE 'data_validation.%'`,

    // Drop triggers
    'DROP TRIGGER IF EXISTS update_resolution_rules_timestamp',
    'DROP TRIGGER IF EXISTS log_entity_evolution',
    'DROP TRIGGER IF EXISTS detect_entity_conflicts_on_update',
    'DROP TRIGGER IF EXISTS validate_mention_positions',
    'DROP TRIGGER IF EXISTS validate_relationship_entities_exist',
    'DROP TRIGGER IF EXISTS validate_entity_mention_entity_exists',

    // Drop views
    'DROP VIEW IF EXISTS validation_error_summary',
    'DROP VIEW IF EXISTS conflict_resolution_dashboard',

    // Drop indexes
    'DROP INDEX IF EXISTS idx_validation_errors_uncorrected',
    'DROP INDEX IF EXISTS idx_validation_errors_severity',
    'DROP INDEX IF EXISTS idx_validation_errors_table',
    'DROP INDEX IF EXISTS idx_resolution_rules_type',
    'DROP INDEX IF EXISTS idx_resolution_rules_active',
    'DROP INDEX IF EXISTS idx_entity_conflicts_auto_resolvable',
    'DROP INDEX IF EXISTS idx_entity_conflicts_active',
    'DROP INDEX IF EXISTS idx_entity_conflicts_severity',
    'DROP INDEX IF EXISTS idx_entity_conflicts_entity',
    'DROP INDEX IF EXISTS idx_conflict_resolutions_resolved_by',
    'DROP INDEX IF EXISTS idx_conflict_resolutions_severity',
    'DROP INDEX IF EXISTS idx_conflict_resolutions_strategy',
    'DROP INDEX IF EXISTS idx_conflict_resolutions_timestamp',
    'DROP INDEX IF EXISTS idx_conflict_resolutions_entity',

    // Drop tables in correct order
    'DROP TABLE IF EXISTS data_validation_errors',
    'DROP TABLE IF EXISTS entity_conflicts',
    'DROP TABLE IF EXISTS conflict_resolutions',
    'DROP TABLE IF EXISTS conflict_resolution_rules'
  ]
};

// Export for migration system
export default migration_005_conflict_resolution;