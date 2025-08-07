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
export type EntityType = 'person' | 'organization' | 'product' | 'concept' | 'location' | 'technical' | 'event' | 'decision';
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
export declare class EntityRepository extends BaseRepository {
    /**
     * Create a new entity
     */
    create(input: CreateEntityInput): Promise<Entity>;
    /**
     * Get entity by ID
     */
    getById(id: string): Promise<Entity | null>;
    /**
     * Find entity by normalized name and type
     */
    findByNormalizedName(normalizedName: string, type?: EntityType): Promise<Entity | null>;
    /**
     * Update an entity
     */
    update(id: string, input: UpdateEntityInput): Promise<Entity | null>;
    /**
     * Search entities with various filters
     */
    search(options?: EntitySearchOptions): Promise<{
        entities: Entity[];
        total: number;
        hasMore: boolean;
    }>;
    /**
     * Delete an entity and all related data
     */
    delete(id: string): Promise<boolean>;
    /**
     * Get most mentioned entities
     */
    getMostMentioned(limit?: number, type?: EntityType): Promise<Entity[]>;
    /**
     * Normalize entity name for consistent matching
     */
    private normalizeName;
    /**
     * Map database row to Entity object
     */
    private mapRowToEntity;
    /**
     * Get ORDER BY clause based on options
     */
    private getOrderByClause;
}
//# sourceMappingURL=EntityRepository.d.ts.map