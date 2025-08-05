/**
 * Knowledge Graph Repository
 *
 * Manages entity recognition, relationship tracking, and graph-based queries
 * for cross-conversation intelligence using SQLite native features.
 */

import Database from 'better-sqlite3';

/**
 * Entity types supported by the knowledge graph
 */
export type EntityType = 'person' | 'organization' | 'product' | 'concept' | 'location' | 'technical' | 'event' | 'decision';

/**
 * Relationship types between entities
 */
export type RelationshipType = 'works_for' | 'created_by' | 'discussed_with' | 'related_to' | 'part_of' | 'mentioned_with' | 'temporal_sequence' | 'cause_effect';

/**
 * Entity extraction methods
 */
export type ExtractionMethod = 'pattern' | 'nlp' | 'manual';

/**
 * Entity evolution types
 */
export type EvolutionType = 'property_added' | 'relationship_added' | 'description_updated' | 'status_changed' | 'alias_added';

/**
 * Entity interface
 */
export interface Entity {
  id: string;
  name: string;
  normalized_name: string;
  type: EntityType;
  canonical_form?: string;
  confidence_score: number;
  created_at: number;
  updated_at: number;
  metadata: Record<string, any>;
  mention_count: number;
  last_mentioned_at?: number;
}

/**
 * Entity mention interface
 */
export interface EntityMention {
  id: string;
  entity_id: string;
  message_id: string;
  conversation_id: string;
  mention_text: string;
  start_position: number;
  end_position: number;
  confidence_score: number;
  extraction_method: ExtractionMethod;
  created_at: number;
}

/**
 * Entity relationship interface
 */
export interface EntityRelationship {
  id: string;
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: RelationshipType;
  strength: number;
  first_mentioned_at: number;
  last_mentioned_at: number;
  mention_count: number;
  context_messages: string[];
  created_at: number;
  updated_at: number;
}

/**
 * Graph traversal result
 */
export interface GraphTraversalResult {
  entity_id: string;
  entity_name: string;
  entity_type: EntityType;
  degree: number;
  relationship_type: RelationshipType;
  strength: number;
  path: string[];
}

/**
 * Entity cluster result
 */
export interface EntityCluster {
  entity_id: string;
  entity_name: string;
  entity_type: EntityType;
  connection_count: number;
  avg_strength: number;
  cluster_members: Array<{
    name: string;
    type: EntityType;
    strength: number;
  }>;
}

/**
 * Knowledge graph repository implementation
 */
export class KnowledgeGraphRepository {
  public db: Database.Database;
  // Prepared statements for performance
  private createEntityStmt!: Database.Statement;
  private createMentionStmt!: Database.Statement;
  private createRelationshipStmt!: Database.Statement;
  private findEntityByNameStmt!: Database.Statement;
  private findEntitiesByTypeStmt!: Database.Statement;
  private getEntityMentionsStmt!: Database.Statement;
  private getEntityRelationshipsStmt!: Database.Statement;
  private updateRelationshipStrengthStmt!: Database.Statement;

  constructor(db: Database.Database) {
    this.db = db;
    this.prepareStatements();
  }

  /**
   * Handle database errors with proper logging and error transformation
   */
  private handleError(error: unknown, context: string): never {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[KnowledgeGraphRepository] ${context}: ${message}`);
    throw new Error(`Knowledge graph operation failed: ${message}`);
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `kg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Prepare frequently used SQL statements
   */
  private prepareStatements(): void {
    this.createEntityStmt = this.db.prepare(`
      INSERT INTO entities (id, name, normalized_name, type, canonical_form, confidence_score, created_at, updated_at, metadata, mention_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);

    this.createMentionStmt = this.db.prepare(`
      INSERT INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, start_position, end_position, confidence_score, extraction_method, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.createRelationshipStmt = this.db.prepare(`
      INSERT OR REPLACE INTO entity_relationships 
      (id, source_entity_id, target_entity_id, relationship_type, strength, first_mentioned_at, last_mentioned_at, mention_count, context_messages, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.findEntityByNameStmt = this.db.prepare(`
      SELECT * FROM entities WHERE normalized_name = ? LIMIT 1
    `);

    this.findEntitiesByTypeStmt = this.db.prepare(`
      SELECT * FROM entities WHERE type = ? ORDER BY mention_count DESC, updated_at DESC
    `);

    this.getEntityMentionsStmt = this.db.prepare(`
      SELECT em.*, m.content, c.title as conversation_title
      FROM entity_mentions em
      JOIN messages m ON em.message_id = m.id
      JOIN conversations c ON em.conversation_id = c.id
      WHERE em.entity_id = ?
      ORDER BY em.created_at DESC
    `);

    this.getEntityRelationshipsStmt = this.db.prepare(`
      SELECT r.*, e1.name as source_name, e2.name as target_name
      FROM entity_relationships r
      JOIN entities e1 ON r.source_entity_id = e1.id
      JOIN entities e2 ON r.target_entity_id = e2.id
      WHERE r.source_entity_id = ? OR r.target_entity_id = ?
      ORDER BY r.strength DESC, r.last_mentioned_at DESC
    `);

    this.updateRelationshipStrengthStmt = this.db.prepare(`
      UPDATE entity_relationships 
      SET strength = ?, mention_count = mention_count + 1, last_mentioned_at = ?, updated_at = ?
      WHERE source_entity_id = ? AND target_entity_id = ? AND relationship_type = ?
    `);
  }

  /**
   * Create or update an entity
   */
  async createEntity(entity: Omit<Entity, 'id' | 'created_at' | 'updated_at' | 'mention_count'>): Promise<Entity> {
    const now = Date.now();
    const id = this.generateId();

    const entityData: Entity = {
      ...entity,
      id,
      created_at: now,
      updated_at: now,
      mention_count: 0
    };

    try {
      this.createEntityStmt.run(
        entityData.id,
        entityData.name,
        entityData.normalized_name,
        entityData.type,
        entityData.canonical_form || null,
        entityData.confidence_score,
        entityData.created_at,
        entityData.updated_at,
        JSON.stringify(entityData.metadata)
      );

      return entityData;
    } catch (error) {
      this.handleError(error, 'Failed to create entity');
    }
  }

  /**
   * Find entity by normalized name
   */
  async findEntityByName(normalizedName: string): Promise<Entity | null> {
    try {
      const row = this.findEntityByNameStmt.get(normalizedName) as any;
      if (!row) return null;

      return this.mapRowToEntity(row);
    } catch (error) {
      this.handleError(error, 'Failed to find entity by name');
    }
  }

  /**
   * Find entities by type
   */
  async findEntitiesByType(type: EntityType, limit = 100): Promise<Entity[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM entities 
        WHERE type = ? 
        ORDER BY mention_count DESC, updated_at DESC 
        LIMIT ?
      `);
      
      const rows = stmt.all(type, limit) as any[];
      return rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      this.handleError(error, 'Failed to find entities by type');
    }
  }

  /**
   * Create entity mention
   */
  async createEntityMention(mention: Omit<EntityMention, 'id' | 'created_at'>): Promise<EntityMention> {
    const now = Date.now();
    const id = this.generateId();

    const mentionData: EntityMention = {
      ...mention,
      id,
      created_at: now
    };

    try {
      this.createMentionStmt.run(
        mentionData.id,
        mentionData.entity_id,
        mentionData.message_id,
        mentionData.conversation_id,
        mentionData.mention_text,
        mentionData.start_position,
        mentionData.end_position,
        mentionData.confidence_score,
        mentionData.extraction_method,
        mentionData.created_at
      );

      return mentionData;
    } catch (error) {
      this.handleError(error, 'Failed to create entity mention');
    }
  }

  /**
   * Create or update entity relationship
   */
  async createOrUpdateRelationship(
    sourceEntityId: string,
    targetEntityId: string,
    relationshipType: RelationshipType,
    strength: number,
    contextMessageIds: string[] = []
  ): Promise<EntityRelationship> {
    const now = Date.now();

    // Check if relationship already exists
    const existing = this.db.prepare(`
      SELECT * FROM entity_relationships 
      WHERE source_entity_id = ? AND target_entity_id = ? AND relationship_type = ?
    `).get(sourceEntityId, targetEntityId, relationshipType) as any;

    if (existing) {
      // Update existing relationship
      const newStrength = Math.min(1.0, existing.strength + (strength * 0.1)); // Gradual strength increase
      
      this.updateRelationshipStrengthStmt.run(
        newStrength,
        now,
        now,
        sourceEntityId,
        targetEntityId,
        relationshipType
      );

      return {
        ...existing,
        strength: newStrength,
        last_mentioned_at: now,
        mention_count: existing.mention_count + 1,
        updated_at: now
      };
    } else {
      // Create new relationship
      const id = this.generateId();
      const relationshipData: EntityRelationship = {
        id,
        source_entity_id: sourceEntityId,
        target_entity_id: targetEntityId,
        relationship_type: relationshipType,
        strength,
        first_mentioned_at: now,
        last_mentioned_at: now,
        mention_count: 1,
        context_messages: contextMessageIds,
        created_at: now,
        updated_at: now
      };

      this.createRelationshipStmt.run(
        relationshipData.id,
        relationshipData.source_entity_id,
        relationshipData.target_entity_id,
        relationshipData.relationship_type,
        relationshipData.strength,
        relationshipData.first_mentioned_at,
        relationshipData.last_mentioned_at,
        relationshipData.mention_count,
        JSON.stringify(relationshipData.context_messages),
        relationshipData.created_at,
        relationshipData.updated_at
      );

      return relationshipData;
    }
  }

  /**
   * Find entities connected to a given entity within N degrees
   */
  async findConnectedEntities(entityId: string, maxDegrees = 2, minStrength = 0.3): Promise<GraphTraversalResult[]> {
    try {
      const stmt = this.db.prepare(`
        WITH RECURSIVE entity_graph(entity_id, target_id, path, degree, relationship_type, strength) AS (
          -- Base case: direct relationships
          SELECT 
            r.source_entity_id as entity_id,
            r.target_entity_id as target_id,
            json_array(r.source_entity_id, r.target_entity_id) as path,
            1 as degree,
            r.relationship_type,
            r.strength
          FROM entity_relationships r
          WHERE r.source_entity_id = ? AND r.strength >= ?
          
          UNION ALL
          
          -- Recursive case: extend path
          SELECT 
            eg.entity_id,
            r.target_entity_id as target_id,
            json_insert(eg.path, '$[#]', r.target_entity_id) as path,
            eg.degree + 1,
            r.relationship_type,
            r.strength * eg.strength as strength
          FROM entity_graph eg
          JOIN entity_relationships r ON eg.target_id = r.source_entity_id
          WHERE eg.degree < ? 
            AND r.strength >= ?
            AND json_extract(eg.path, '$') NOT LIKE '%' || r.target_entity_id || '%'
        )
        SELECT 
          e.id as entity_id,
          e.name as entity_name,
          e.type as entity_type,
          eg.degree,
          eg.relationship_type,
          eg.strength,
          eg.path
        FROM entity_graph eg
        JOIN entities e ON eg.target_id = e.id
        ORDER BY eg.degree ASC, eg.strength DESC
      `);

      const rows = stmt.all(entityId, minStrength, maxDegrees, minStrength * 0.8) as any[];
      
      return rows.map(row => ({
        entity_id: row.entity_id,
        entity_name: row.entity_name,
        entity_type: row.entity_type,
        degree: row.degree,
        relationship_type: row.relationship_type,
        strength: row.strength,
        path: JSON.parse(row.path)
      }));
    } catch (error) {
      this.handleError(error, 'Failed to find connected entities');
    }
  }

  /**
   * Find shortest path between two entities
   */
  async findShortestPath(sourceEntityId: string, targetEntityId: string): Promise<GraphTraversalResult | null> {
    try {
      const stmt = this.db.prepare(`
        WITH RECURSIVE entity_paths(entity_id, target_id, path_ids, path_names, distance, total_strength) AS (
          -- Forward search from source
          SELECT 
            r.source_entity_id,
            r.target_entity_id,
            json_array(r.source_entity_id, r.target_entity_id) as path_ids,
            json_array(e1.name, e2.name) as path_names,
            1 as distance,
            r.strength as total_strength
          FROM entity_relationships r
          JOIN entities e1 ON r.source_entity_id = e1.id
          JOIN entities e2 ON r.target_entity_id = e2.id
          WHERE r.source_entity_id = ?
          
          UNION ALL
          
          SELECT 
            ep.entity_id,
            r.target_entity_id,
            json_insert(ep.path_ids, '$[#]', r.target_entity_id) as path_ids,
            json_insert(ep.path_names, '$[#]', e.name) as path_names,
            ep.distance + 1,
            ep.total_strength * r.strength
          FROM entity_paths ep
          JOIN entity_relationships r ON ep.target_id = r.source_entity_id
          JOIN entities e ON r.target_entity_id = e.id
          WHERE ep.distance < 4
            AND json_extract(ep.path_ids, '$') NOT LIKE '%' || r.target_entity_id || '%'
        )
        SELECT 
          path_names,
          distance,
          total_strength,
          path_ids
        FROM entity_paths
        WHERE target_id = ?
        ORDER BY distance ASC, total_strength DESC
        LIMIT 1
      `);

      const row = stmt.get(sourceEntityId, targetEntityId) as any;
      if (!row) return null;

      return {
        entity_id: targetEntityId,
        entity_name: JSON.parse(row.path_names)[JSON.parse(row.path_names).length - 1],
        entity_type: 'unknown' as EntityType, // Would need another query to get this
        degree: row.distance,
        relationship_type: 'related_to' as RelationshipType,
        strength: row.total_strength,
        path: JSON.parse(row.path_names)
      };
    } catch (error) {
      this.handleError(error, 'Failed to find shortest path');
    }
  }

  /**
   * Identify entity clusters based on co-occurrence patterns
   */
  async findEntityClusters(minConnectionCount = 3, minAvgStrength = 0.4): Promise<EntityCluster[]> {
    try {
      const stmt = this.db.prepare(`
        WITH entity_connections AS (
          SELECT 
            r.source_entity_id,
            r.target_entity_id,
            r.strength,
            COUNT(DISTINCT em1.conversation_id) as shared_conversations
          FROM entity_relationships r
          JOIN entity_mentions em1 ON r.source_entity_id = em1.entity_id
          JOIN entity_mentions em2 ON r.target_entity_id = em2.entity_id 
            AND em1.conversation_id = em2.conversation_id
          WHERE r.strength > 0.3
          GROUP BY r.source_entity_id, r.target_entity_id, r.strength
          HAVING shared_conversations >= 2
        ),
        entity_clusters AS (
          SELECT 
            source_entity_id as entity_id,
            COUNT(DISTINCT target_entity_id) as connection_count,
            AVG(strength) as avg_strength
          FROM entity_connections
          GROUP BY source_entity_id
          HAVING connection_count >= ? AND avg_strength >= ?
        )
        SELECT 
          e.id as entity_id,
          e.name as entity_name,
          e.type as entity_type,
          ec.connection_count,
          ec.avg_strength,
          json_group_array(
            json_object(
              'name', connected_e.name,
              'type', connected_e.type,
              'strength', conn.strength
            )
          ) as cluster_members
        FROM entity_clusters ec
        JOIN entities e ON ec.entity_id = e.id
        JOIN entity_connections conn ON ec.entity_id = conn.source_entity_id
        JOIN entities connected_e ON conn.target_entity_id = connected_e.id
        GROUP BY ec.entity_id, e.name, e.type, ec.connection_count, ec.avg_strength
        ORDER BY ec.avg_strength DESC, ec.connection_count DESC
      `);

      const rows = stmt.all(minConnectionCount, minAvgStrength) as any[];
      
      return rows.map(row => ({
        entity_id: row.entity_id,
        entity_name: row.entity_name,
        entity_type: row.entity_type,
        connection_count: row.connection_count,
        avg_strength: row.avg_strength,
        cluster_members: JSON.parse(row.cluster_members)
      }));
    } catch (error) {
      this.handleError(error, 'Failed to find entity clusters');
    }
  }

  /**
   * Search entities using FTS5
   */
  async searchEntities(query: string, limit = 50): Promise<Entity[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT e.*, entities_fts.rank
        FROM entities_fts
        JOIN entities e ON entities_fts.rowid = e.rowid
        WHERE entities_fts MATCH ?
        ORDER BY entities_fts.rank, e.mention_count DESC
        LIMIT ?
      `);

      const rows = stmt.all(query, limit) as any[];
      return rows.map(row => this.mapRowToEntity(row));
    } catch (error) {
      this.handleError(error, 'Failed to search entities');
    }
  }

  /**
   * Get entity mentions for a specific entity
   */
  async getEntityMentions(entityId: string, limit = 100): Promise<any[]> {
    try {
      const stmt = this.db.prepare(`
        SELECT em.*, m.content, c.title as conversation_title
        FROM entity_mentions em
        JOIN messages m ON em.message_id = m.id
        JOIN conversations c ON em.conversation_id = c.id
        WHERE em.entity_id = ?
        ORDER BY em.created_at DESC
        LIMIT ?
      `);

      return stmt.all(entityId, limit) as any[];
    } catch (error) {
      this.handleError(error, 'Failed to get entity mentions');
    }
  }

  /**
   * Get entity relationships for a specific entity
   */
  async getEntityRelationships(entityId: string): Promise<any[]> {
    try {
      return this.getEntityRelationshipsStmt.all(entityId, entityId) as any[];
    } catch (error) {
      this.handleError(error, 'Failed to get entity relationships');
    }
  }

  /**
   * Map database row to Entity object
   */
  private mapRowToEntity(row: any): Entity {
    return {
      id: row.id,
      name: row.name,
      normalized_name: row.normalized_name,
      type: row.type,
      canonical_form: row.canonical_form,
      confidence_score: row.confidence_score,
      created_at: row.created_at,
      updated_at: row.updated_at,
      metadata: JSON.parse(row.metadata || '{}'),
      mention_count: row.mention_count,
      last_mentioned_at: row.last_mentioned_at
    };
  }
}