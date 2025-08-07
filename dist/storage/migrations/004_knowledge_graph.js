/**
 * Migration: Knowledge Graph Implementation
 *
 * Adds support for cross-conversation intelligence through entity recognition,
 * relationship tracking, and graph-based queries using SQLite native features.
 *
 * This migration implements Phase 3 of the roadmap: Cross-Conversation Intelligence
 */
export const migration_004_knowledge_graph = {
    version: 4,
    description: 'Add knowledge graph tables for cross-conversation intelligence with entity recognition and relationship tracking',
    up: [
        // Create entities table - Central entity registry
        `CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('person', 'organization', 'product', 'concept', 'location', 'technical', 'event', 'decision')),
      canonical_form TEXT,
      confidence_score REAL DEFAULT 1.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      metadata TEXT DEFAULT '{}',
      mention_count INTEGER DEFAULT 0,
      last_mentioned_at INTEGER
    )`,
        // Create entity mentions table - Links entities to specific messages
        `CREATE TABLE IF NOT EXISTS entity_mentions (
      id TEXT PRIMARY KEY,
      entity_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      mention_text TEXT NOT NULL,
      start_position INTEGER NOT NULL,
      end_position INTEGER NOT NULL,
      confidence_score REAL DEFAULT 1.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
      extraction_method TEXT DEFAULT 'pattern' CHECK (extraction_method IN ('pattern', 'nlp', 'manual')),
      created_at INTEGER NOT NULL,
      FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )`,
        // Create entity relationships table - How entities relate to each other
        `CREATE TABLE IF NOT EXISTS entity_relationships (
      id TEXT PRIMARY KEY,
      source_entity_id TEXT NOT NULL,
      target_entity_id TEXT NOT NULL,
      relationship_type TEXT NOT NULL CHECK (relationship_type IN ('works_for', 'created_by', 'discussed_with', 'related_to', 'part_of', 'mentioned_with', 'temporal_sequence', 'cause_effect')),
      strength REAL DEFAULT 0.5 CHECK (strength >= 0.0 AND strength <= 1.0),
      first_mentioned_at INTEGER NOT NULL,
      last_mentioned_at INTEGER NOT NULL,
      mention_count INTEGER DEFAULT 1,
      context_messages TEXT DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (source_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
      FOREIGN KEY (target_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
      UNIQUE(source_entity_id, target_entity_id, relationship_type)
    )`,
        // Create conversation topics table - High-level topic extraction per conversation
        `CREATE TABLE IF NOT EXISTS conversation_topics (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      topic_name TEXT NOT NULL,
      confidence_score REAL DEFAULT 0.5 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
      message_count INTEGER DEFAULT 1,
      first_message_id TEXT,
      last_message_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (first_message_id) REFERENCES messages(id),
      FOREIGN KEY (last_message_id) REFERENCES messages(id)
    )`,
        // Create entity evolution table - Track how understanding of entities changes over time
        `CREATE TABLE IF NOT EXISTS entity_evolution (
      id TEXT PRIMARY KEY,
      entity_id TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      evolution_type TEXT NOT NULL CHECK (evolution_type IN ('property_added', 'relationship_added', 'description_updated', 'status_changed', 'alias_added')),
      previous_value TEXT,
      new_value TEXT,
      evidence_message_id TEXT,
      confidence_score REAL DEFAULT 0.5 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
      created_at INTEGER NOT NULL,
      FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (evidence_message_id) REFERENCES messages(id)
    )`,
        // Create performance indexes for entities
        `CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(normalized_name)`,
        `CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type)`,
        `CREATE INDEX IF NOT EXISTS idx_entities_mentions ON entities(mention_count DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_entities_updated ON entities(updated_at DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_entities_canonical ON entities(canonical_form) WHERE canonical_form IS NOT NULL`,
        // Create performance indexes for entity mentions
        `CREATE INDEX IF NOT EXISTS idx_mentions_entity ON entity_mentions(entity_id)`,
        `CREATE INDEX IF NOT EXISTS idx_mentions_message ON entity_mentions(message_id)`,
        `CREATE INDEX IF NOT EXISTS idx_mentions_conversation ON entity_mentions(conversation_id)`,
        `CREATE INDEX IF NOT EXISTS idx_mentions_confidence ON entity_mentions(confidence_score DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_mentions_position ON entity_mentions(message_id, start_position)`,
        `CREATE INDEX IF NOT EXISTS idx_mentions_method ON entity_mentions(extraction_method)`,
        // Create performance indexes for entity relationships
        `CREATE INDEX IF NOT EXISTS idx_relationships_source ON entity_relationships(source_entity_id)`,
        `CREATE INDEX IF NOT EXISTS idx_relationships_target ON entity_relationships(target_entity_id)`,
        `CREATE INDEX IF NOT EXISTS idx_relationships_type ON entity_relationships(relationship_type)`,
        `CREATE INDEX IF NOT EXISTS idx_relationships_strength ON entity_relationships(strength DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_relationships_time ON entity_relationships(last_mentioned_at DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_relationships_bidirectional ON entity_relationships(target_entity_id, source_entity_id)`,
        // Create performance indexes for conversation topics
        `CREATE INDEX IF NOT EXISTS idx_topics_conversation ON conversation_topics(conversation_id)`,
        `CREATE INDEX IF NOT EXISTS idx_topics_name ON conversation_topics(topic_name)`,
        `CREATE INDEX IF NOT EXISTS idx_topics_confidence ON conversation_topics(confidence_score DESC)`,
        // Create performance indexes for entity evolution
        `CREATE INDEX IF NOT EXISTS idx_evolution_entity ON entity_evolution(entity_id, created_at DESC)`,
        `CREATE INDEX IF NOT EXISTS idx_evolution_conversation ON entity_evolution(conversation_id)`,
        `CREATE INDEX IF NOT EXISTS idx_evolution_type ON entity_evolution(evolution_type)`,
        // Create FTS5 table for entity names and descriptions
        `CREATE VIRTUAL TABLE IF NOT EXISTS entities_fts USING fts5(
      name, 
      normalized_name, 
      description,
      content=entities,
      content_rowid=rowid
    )`,
        // Create triggers to maintain entities FTS index
        `CREATE TRIGGER IF NOT EXISTS entities_fts_insert AFTER INSERT ON entities BEGIN
      INSERT INTO entities_fts(rowid, name, normalized_name, description) 
      VALUES (new.rowid, new.name, new.normalized_name, 
              COALESCE(json_extract(new.metadata, '$.description'), ''));
    END`,
        `CREATE TRIGGER IF NOT EXISTS entities_fts_update AFTER UPDATE OF name, normalized_name, metadata ON entities BEGIN
      INSERT INTO entities_fts(entities_fts, rowid, name, normalized_name, description) 
      VALUES('delete', old.rowid, old.name, old.normalized_name, 
             COALESCE(json_extract(old.metadata, '$.description'), ''));
      INSERT INTO entities_fts(rowid, name, normalized_name, description) 
      VALUES (new.rowid, new.name, new.normalized_name, 
              COALESCE(json_extract(new.metadata, '$.description'), ''));
    END`,
        `CREATE TRIGGER IF NOT EXISTS entities_fts_delete AFTER DELETE ON entities BEGIN
      INSERT INTO entities_fts(entities_fts, rowid, name, normalized_name, description) 
      VALUES('delete', old.rowid, old.name, old.normalized_name, 
             COALESCE(json_extract(old.metadata, '$.description'), ''));
    END`,
        // Create triggers to maintain entity mention counts
        `CREATE TRIGGER IF NOT EXISTS update_entity_mention_count_insert 
     AFTER INSERT ON entity_mentions 
     BEGIN
       UPDATE entities 
       SET mention_count = mention_count + 1,
           last_mentioned_at = NEW.created_at,
           updated_at = NEW.created_at
       WHERE id = NEW.entity_id;
     END`,
        `CREATE TRIGGER IF NOT EXISTS update_entity_mention_count_delete 
     AFTER DELETE ON entity_mentions 
     BEGIN
       UPDATE entities 
       SET mention_count = mention_count - 1,
           updated_at = CAST(strftime('%s', 'now') AS INTEGER) * 1000
       WHERE id = OLD.entity_id;
     END`,
        // Create view for entity summaries (for performance)
        `CREATE VIEW IF NOT EXISTS entity_summary AS
     SELECT 
       e.id,
       e.name,
       e.type,
       e.mention_count,
       COUNT(DISTINCT em.conversation_id) as conversation_count,
       COUNT(DISTINCT r1.target_entity_id) + COUNT(DISTINCT r2.source_entity_id) as relationship_count,
       MAX(em.created_at) as last_mentioned_at,
       MIN(em.created_at) as first_mentioned_at,
       AVG(em.confidence_score) as avg_confidence
     FROM entities e
     LEFT JOIN entity_mentions em ON e.id = em.entity_id
     LEFT JOIN entity_relationships r1 ON e.id = r1.source_entity_id
     LEFT JOIN entity_relationships r2 ON e.id = r2.target_entity_id
     GROUP BY e.id, e.name, e.type, e.mention_count`,
        // Create view for conversation entity networks
        `CREATE VIEW IF NOT EXISTS conversation_entity_networks AS
     SELECT 
       c.id as conversation_id,
       c.title,
       COUNT(DISTINCT em.entity_id) as entity_count,
       AVG(em.confidence_score) as avg_confidence
     FROM conversations c
     JOIN entity_mentions em ON c.id = em.conversation_id
     GROUP BY c.id, c.title`,
        // Insert default configuration for knowledge graph features
        `INSERT OR REPLACE INTO persistence_state (key, value, updated_at) VALUES 
      ('knowledge_graph.enabled', 'true', ` + Date.now() + `)`,
        `INSERT OR REPLACE INTO persistence_state (key, value, updated_at) VALUES 
      ('knowledge_graph.max_traversal_depth', '4', ` + Date.now() + `)`,
        `INSERT OR REPLACE INTO persistence_state (key, value, updated_at) VALUES 
      ('knowledge_graph.min_relationship_strength', '0.3', ` + Date.now() + `)`,
        `INSERT OR REPLACE INTO persistence_state (key, value, updated_at) VALUES 
      ('knowledge_graph.entity_extraction_confidence_threshold', '0.5', ` + Date.now() + `)`,
        `INSERT OR REPLACE INTO persistence_state (key, value, updated_at) VALUES 
      ('knowledge_graph.relationship_decay_days', '30', ` + Date.now() + `)`,
        `INSERT OR REPLACE INTO persistence_state (key, value, updated_at) VALUES 
      ('knowledge_graph.max_entity_cache_size', '10000', ` + Date.now() + `)`,
        // Enable recursive triggers for graph operations
        `PRAGMA recursive_triggers = ON`
    ],
    down: [
        // Disable recursive triggers
        `PRAGMA recursive_triggers = OFF`,
        // Remove configuration
        `DELETE FROM persistence_state 
     WHERE key LIKE 'knowledge_graph.%'`,
        // Drop triggers first
        'DROP TRIGGER IF EXISTS update_entity_mention_count_delete',
        'DROP TRIGGER IF EXISTS update_entity_mention_count_insert',
        'DROP TRIGGER IF EXISTS entities_fts_delete',
        'DROP TRIGGER IF EXISTS entities_fts_update',
        'DROP TRIGGER IF EXISTS entities_fts_insert',
        // Drop views
        'DROP VIEW IF EXISTS conversation_entity_networks',
        'DROP VIEW IF EXISTS entity_summary',
        // Drop FTS table
        'DROP TABLE IF EXISTS entities_fts',
        // Drop indexes for entity evolution
        'DROP INDEX IF EXISTS idx_evolution_type',
        'DROP INDEX IF EXISTS idx_evolution_conversation',
        'DROP INDEX IF EXISTS idx_evolution_entity',
        // Drop indexes for conversation topics
        'DROP INDEX IF EXISTS idx_topics_confidence',
        'DROP INDEX IF EXISTS idx_topics_name',
        'DROP INDEX IF EXISTS idx_topics_conversation',
        // Drop indexes for entity relationships
        'DROP INDEX IF EXISTS idx_relationships_bidirectional',
        'DROP INDEX IF EXISTS idx_relationships_time',
        'DROP INDEX IF EXISTS idx_relationships_strength',
        'DROP INDEX IF EXISTS idx_relationships_type',
        'DROP INDEX IF EXISTS idx_relationships_target',
        'DROP INDEX IF EXISTS idx_relationships_source',
        // Drop indexes for entity mentions
        'DROP INDEX IF EXISTS idx_mentions_method',
        'DROP INDEX IF EXISTS idx_mentions_position',
        'DROP INDEX IF EXISTS idx_mentions_confidence',
        'DROP INDEX IF EXISTS idx_mentions_conversation',
        'DROP INDEX IF EXISTS idx_mentions_message',
        'DROP INDEX IF EXISTS idx_mentions_entity',
        // Drop indexes for entities
        'DROP INDEX IF EXISTS idx_entities_canonical',
        'DROP INDEX IF EXISTS idx_entities_updated',
        'DROP INDEX IF EXISTS idx_entities_mentions',
        'DROP INDEX IF EXISTS idx_entities_type',
        'DROP INDEX IF EXISTS idx_entities_name',
        // Drop tables in correct order (respecting foreign keys)
        'DROP TABLE IF EXISTS entity_evolution',
        'DROP TABLE IF EXISTS conversation_topics',
        'DROP TABLE IF EXISTS entity_relationships',
        'DROP TABLE IF EXISTS entity_mentions',
        'DROP TABLE IF EXISTS entities'
    ]
};
// Export for migration system
export default migration_004_knowledge_graph;
//# sourceMappingURL=004_knowledge_graph.js.map