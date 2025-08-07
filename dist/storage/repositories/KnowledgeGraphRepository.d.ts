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
export declare class KnowledgeGraphRepository {
    db: Database.Database;
    private createEntityStmt;
    private createMentionStmt;
    private createRelationshipStmt;
    private findEntityByNameStmt;
    private findEntitiesByTypeStmt;
    private getEntityMentionsStmt;
    private getEntityRelationshipsStmt;
    private updateRelationshipStrengthStmt;
    constructor(db: Database.Database);
    /**
     * Handle database errors with proper logging and error transformation
     */
    private handleError;
    /**
     * Generate a unique ID
     */
    private generateId;
    /**
     * Prepare frequently used SQL statements
     */
    private prepareStatements;
    /**
     * Create or update an entity
     */
    createEntity(entity: Omit<Entity, 'id' | 'created_at' | 'updated_at' | 'mention_count'>): Promise<Entity>;
    /**
     * Find entity by normalized name
     */
    findEntityByName(normalizedName: string): Promise<Entity | null>;
    /**
     * Find entities by type
     */
    findEntitiesByType(type: EntityType, limit?: number): Promise<Entity[]>;
    /**
     * Create entity mention
     */
    createEntityMention(mention: Omit<EntityMention, 'id' | 'created_at'>): Promise<EntityMention>;
    /**
     * Create or update entity relationship
     */
    createOrUpdateRelationship(sourceEntityId: string, targetEntityId: string, relationshipType: RelationshipType, strength: number, contextMessageIds?: string[]): Promise<EntityRelationship>;
    /**
     * Find entities connected to a given entity within N degrees
     */
    findConnectedEntities(entityId: string, maxDegrees?: number, minStrength?: number): Promise<GraphTraversalResult[]>;
    /**
     * Find shortest path between two entities
     */
    findShortestPath(sourceEntityId: string, targetEntityId: string): Promise<GraphTraversalResult | null>;
    /**
     * Identify entity clusters based on co-occurrence patterns
     */
    findEntityClusters(minConnectionCount?: number, minAvgStrength?: number): Promise<EntityCluster[]>;
    /**
     * Search entities using FTS5
     */
    searchEntities(query: string, limit?: number): Promise<Entity[]>;
    /**
     * Get entity mentions for a specific entity
     */
    getEntityMentions(entityId: string, limit?: number): Promise<any[]>;
    /**
     * Get entity relationships for a specific entity
     */
    getEntityRelationships(entityId: string): Promise<any[]>;
    /**
     * Map database row to Entity object
     */
    private mapRowToEntity;
}
//# sourceMappingURL=KnowledgeGraphRepository.d.ts.map