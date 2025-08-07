/**
 * Knowledge Graph Service
 *
 * Main service that coordinates entity extraction, relationship detection,
 * and graph operations for cross-conversation intelligence.
 */
import { Entity, EntityRelationship, GraphTraversalResult, EntityCluster } from '../storage/repositories/KnowledgeGraphRepository.js';
import Database from 'better-sqlite3';
/**
 * Message processing result
 */
export interface MessageProcessingResult {
    entitiesExtracted: number;
    relationshipsDetected: number;
    entitiesCreated: number;
    relationshipsCreated: number;
    processingTimeMs: number;
}
/**
 * Cross-conversation analysis result
 */
export interface CrossConversationAnalysis {
    totalEntities: number;
    totalRelationships: number;
    topEntities: Array<{
        entity: Entity;
        relationshipCount: number;
        conversationCount: number;
    }>;
    entityClusters: EntityCluster[];
    temporalPatterns: Array<{
        period: string;
        entityCount: number;
        relationshipCount: number;
        topTopics: string[];
    }>;
}
/**
 * Entity history result
 */
export interface EntityHistory {
    entity: Entity;
    mentions: Array<{
        messageId: string;
        conversationId: string;
        conversationTitle: string;
        content: string;
        mentionText: string;
        createdAt: number;
        confidence: number;
    }>;
    relationships: Array<{
        relatedEntity: Entity;
        relationshipType: string;
        strength: number;
        firstMentioned: number;
        lastMentioned: number;
    }>;
    evolution: Array<{
        evolutionType: string;
        previousValue?: string;
        newValue?: string;
        conversationId: string;
        createdAt: number;
    }>;
}
/**
 * Knowledge graph service configuration
 */
export interface KnowledgeGraphConfig {
    enableAutoProcessing: boolean;
    batchProcessingSize: number;
    maxEntitiesPerMessage: number;
    minEntityConfidence: number;
    minRelationshipConfidence: number;
    enableRelationshipDecay: boolean;
    relationshipDecayDays: number;
}
/**
 * Main knowledge graph service implementation
 */
export declare class KnowledgeGraphService {
    private entityExtractor;
    private relationshipDetector;
    private repository;
    private config;
    constructor(db: Database.Database, config?: Partial<KnowledgeGraphConfig>);
    /**
     * Process a message to extract entities and detect relationships
     */
    processMessage(messageId: string, conversationId: string, content: string, createdAt: number): Promise<MessageProcessingResult>;
    /**
     * Get entity history across conversations
     */
    getEntityHistory(entityName: string): Promise<EntityHistory | null>;
    /**
     * Find conversations related to specific entities
     */
    findRelatedConversations(entityNames: string[], options?: {
        minRelationshipStrength?: number;
        timeRange?: {
            start: number;
            end: number;
        };
        relationshipTypes?: string[];
        limit?: number;
    }): Promise<Array<{
        conversationId: string;
        conversationTitle: string;
        relevanceScore: number;
        relatedEntities: string[];
        relationshipCount: number;
    }>>;
    /**
     * Get knowledge graph analysis across all conversations
     */
    getCrossConversationAnalysis(): Promise<CrossConversationAnalysis>;
    /**
     * Search entities and relationships
     */
    searchKnowledgeGraph(query: string, options?: {
        includeEntities?: boolean;
        includeRelationships?: boolean;
        maxDegrees?: number;
        minStrength?: number;
        limit?: number;
    }): Promise<{
        entities: Entity[];
        connectedEntities: GraphTraversalResult[];
        relationships: EntityRelationship[];
    }>;
    /**
     * Get shortest path between two entities
     */
    getEntityPath(sourceEntityName: string, targetEntityName: string): Promise<GraphTraversalResult | null>;
    /**
     * Batch process multiple messages
     */
    batchProcessMessages(messages: Array<{
        messageId: string;
        conversationId: string;
        content: string;
        createdAt: number;
    }>): Promise<MessageProcessingResult[]>;
    /**
     * Update service configuration
     */
    updateConfig(config: Partial<KnowledgeGraphConfig>): void;
    /**
     * Get service statistics
     */
    getServiceStats(): Promise<{
        totalEntities: number;
        totalRelationships: number;
        totalMentions: number;
        entityTypes: Record<string, number>;
        relationshipTypes: Record<string, number>;
        extractorStats: Record<string, number>;
        detectorStats: Record<string, number>;
    }>;
    /**
     * Helper method to find entity by extracted entity ID
     */
    private findEntityByExtractedId;
    /**
     * Helper method to map database row to Entity object
     */
    private mapRowToEntity;
}
//# sourceMappingURL=KnowledgeGraphService.d.ts.map