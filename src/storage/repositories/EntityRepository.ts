import { BaseRepository } from './BaseRepository.js';

export interface Entity {
  id: string;
  name: string;
  normalizedName: string;
  type: EntityType;
  canonicalForm?: string;
  confidenceScore: number;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, any>;
  mentionCount: number;
  lastMentionedAt?: number;
}

export type EntityType = 
  | 'person' 
  | 'organization' 
  | 'product' 
  | 'concept' 
  | 'location' 
  | 'technical' 
  | 'event' 
  | 'decision';

export interface CreateEntityInput {
  name: string;
  type: EntityType;
  canonicalForm?: string;
  confidenceScore?: number;
  metadata?: Record<string, any>;
}

export interface UpdateEntityInput {
  name?: string;
  canonicalForm?: string;
  confidenceScore?: number;
  metadata?: Record<string, any>;
}

export interface EntitySearchOptions {
  query?: string;
  type?: EntityType;
  minConfidence?: number;
  minMentions?: number;
  limit?: number;
  offset?: number;
  orderBy?: 'name' | 'mentions' | 'updated' | 'confidence';
  orderDirection?: 'ASC' | 'DESC';
}

export class EntityRepository extends BaseRepository {
  /**
   * Create a new entity
   */
  async create(input: CreateEntityInput): Promise<Entity> {
    const id = this.generateId();
    const now = this.getCurrentTimestamp();
    const normalizedName = this.normalizeName(input.name);

    const entity: Entity = {
      id,
      name: input.name,
      normalizedName,
      type: input.type,
      canonicalForm: input.canonicalForm,
      confidenceScore: input.confidenceScore ?? 1.0,
      createdAt: now,
      updatedAt: now,
      metadata: input.metadata ?? {},
      mentionCount: 0,
      lastMentionedAt: undefined
    };

    try {
      this.executeStatementRun(
        'create_entity',
        `INSERT INTO entities (
          id, name, normalized_name, type, canonical_form,
          confidence_score, created_at, updated_at, metadata,
          mention_count, last_mentioned_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entity.id,
          entity.name,
          entity.normalizedName,
          entity.type,
          entity.canonicalForm || null,
          entity.confidenceScore,
          entity.createdAt,
          entity.updatedAt,
          this.stringifyMetadata(entity.metadata),
          entity.mentionCount,
          entity.lastMentionedAt || null
        ]
      );

      return entity;
    } catch (error) {
      this.handleConstraintError(error as Error, 'Entity');
    }
  }

  /**
   * Get entity by ID
   */
  async getById(id: string): Promise<Entity | null> {
    if (!this.isValidUUID(id)) {
      return null;
    }

    const row = this.executeStatement<{
      id: string;
      name: string;
      normalized_name: string;
      type: string;
      canonical_form: string | null;
      confidence_score: number;
      created_at: number;
      updated_at: number;
      metadata: string;
      mention_count: number;
      last_mentioned_at: number | null;
    }>(
      'find_entity_by_id',
      `SELECT * FROM entities WHERE id = ?`,
      [id]
    );

    return row ? this.mapRowToEntity(row) : null;
  }

  /**
   * Find entity by normalized name and type
   */
  async findByNormalizedName(normalizedName: string, type?: EntityType): Promise<Entity | null> {
    let sql = 'SELECT * FROM entities WHERE normalized_name = ?';
    const params: any[] = [normalizedName];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    sql += ' ORDER BY confidence_score DESC LIMIT 1';

    const row = this.executeStatement<{
      id: string;
      name: string;
      normalized_name: string;
      type: string;
      canonical_form: string | null;
      confidence_score: number;
      created_at: number;
      updated_at: number;
      metadata: string;
      mention_count: number;
      last_mentioned_at: number | null;
    }>(
      `find_entity_by_name_${type || 'any'}`,
      sql,
      params
    );

    return row ? this.mapRowToEntity(row) : null;
  }

  /**
   * Update an entity
   */
  async update(id: string, input: UpdateEntityInput): Promise<Entity | null> {
    if (!this.isValidUUID(id)) {
      return null;
    }

    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (input.name !== undefined) {
      updates.push('name = ?');
      params.push(input.name);
      updates.push('normalized_name = ?');
      params.push(this.normalizeName(input.name));
    }

    if (input.canonicalForm !== undefined) {
      updates.push('canonical_form = ?');
      params.push(input.canonicalForm);
    }

    if (input.confidenceScore !== undefined) {
      updates.push('confidence_score = ?');
      params.push(input.confidenceScore);
    }

    if (input.metadata !== undefined) {
      updates.push('metadata = ?');
      params.push(this.stringifyMetadata(input.metadata));
    }

    updates.push('updated_at = ?');
    params.push(this.getCurrentTimestamp());

    params.push(id);

    try {
      this.executeStatementRun(
        'update_entity',
        `UPDATE entities SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      return this.getById(id);
    } catch (error) {
      this.handleConstraintError(error as Error, 'Entity');
    }
  }

  /**
   * Search entities with various filters
   */
  async search(options: EntitySearchOptions = {}): Promise<{
    entities: Entity[];
    total: number;
    hasMore: boolean;
  }> {
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;
    
    let whereConditions: string[] = [];
    let params: any[] = [];

    if (options.query) {
      // Use FTS5 for text search
      whereConditions.push(`
        id IN (
          SELECT e.id FROM entities e
          JOIN entities_fts ON entities_fts.rowid = e.rowid
          WHERE entities_fts MATCH ?
        )
      `);
      params.push(options.query);
    }

    if (options.type) {
      whereConditions.push('type = ?');
      params.push(options.type);
    }

    if (options.minConfidence !== undefined) {
      whereConditions.push('confidence_score >= ?');
      params.push(options.minConfidence);
    }

    if (options.minMentions !== undefined) {
      whereConditions.push('mention_count >= ?');
      params.push(options.minMentions);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Count total results
    const { count } = this.executeStatement<{ count: number }>(
      'count_entities_search',
      `SELECT COUNT(*) as count FROM entities ${whereClause}`,
      params
    );

    // Get paginated results
    const orderBy = this.getOrderByClause(options.orderBy, options.orderDirection);
    const rows = this.executeStatementAll<{
      id: string;
      name: string;
      normalized_name: string;
      type: string;
      canonical_form: string | null;
      confidence_score: number;
      created_at: number;
      updated_at: number;
      metadata: string;
      mention_count: number;
      last_mentioned_at: number | null;
    }>(
      'search_entities',
      `SELECT * FROM entities ${whereClause} ${orderBy} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const entities = rows.map(row => this.mapRowToEntity(row));

    return {
      entities,
      total: count,
      hasMore: offset + limit < count
    };
  }

  /**
   * Delete an entity and all related data
   */
  async delete(id: string): Promise<boolean> {
    if (!this.isValidUUID(id)) {
      return false;
    }

    try {
      const result = this.executeStatementRun(
        'delete_entity',
        'DELETE FROM entities WHERE id = ?',
        [id]
      );
      return result.changes > 0;
    } catch (error) {
      console.error('Failed to delete entity:', error);
      return false;
    }
  }

  /**
   * Get most mentioned entities
   */
  async getMostMentioned(limit: number = 10, type?: EntityType): Promise<Entity[]> {
    let sql = 'SELECT * FROM entities';
    const params: any[] = [];

    if (type) {
      sql += ' WHERE type = ?';
      params.push(type);
    }

    sql += ' ORDER BY mention_count DESC, last_mentioned_at DESC LIMIT ?';
    params.push(limit);

    const rows = this.executeStatementAll<{
      id: string;
      name: string;
      normalized_name: string;
      type: string;
      canonical_form: string | null;
      confidence_score: number;
      created_at: number;
      updated_at: number;
      metadata: string;
      mention_count: number;
      last_mentioned_at: number | null;
    }>(
      `most_mentioned_${type || 'all'}`,
      sql,
      params
    );

    return rows.map(row => this.mapRowToEntity(row));
  }

  /**
   * Normalize entity name for consistent matching
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Map database row to Entity object
   */
  private mapRowToEntity(row: any): Entity {
    return {
      id: row.id,
      name: row.name,
      normalizedName: row.normalized_name,
      type: row.type as EntityType,
      canonicalForm: row.canonical_form,
      confidenceScore: row.confidence_score,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: this.parseMetadata(row.metadata),
      mentionCount: row.mention_count,
      lastMentionedAt: row.last_mentioned_at
    };
  }

  /**
   * Get ORDER BY clause based on options
   */
  private getOrderByClause(
    orderBy?: string,
    direction: 'ASC' | 'DESC' = 'DESC'
  ): string {
    const column = orderBy === 'name' ? 'name'
      : orderBy === 'mentions' ? 'mention_count'
      : orderBy === 'updated' ? 'updated_at'
      : orderBy === 'confidence' ? 'confidence_score'
      : 'mention_count'; // default

    return `ORDER BY ${column} ${direction}`;
  }
}