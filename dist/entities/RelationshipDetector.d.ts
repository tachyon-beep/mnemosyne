/**
 * Relationship Detection Service for Phase 3
 *
 * Analyzes co-occurrence patterns and detects relationships between entities.
 * Builds the knowledge graph by identifying semantic connections.
 */
import { DatabaseManager } from '../storage/Database.js';
import { Entity, EntityType } from '../storage/repositories/EntityRepository.js';
export interface EntityRelationship {
    id: string;
    sourceEntityId: string;
    targetEntityId: string;
    relationshipType: RelationshipType;
    strength: number;
    context: string;
    createdAt: number;
    updatedAt: number;
}
export type RelationshipType = 'works_for' | 'created_by' | 'discussed_with' | 'related_to' | 'part_of' | 'mentioned_with' | 'temporal_sequence' | 'cause_effect';
export interface CoOccurrence {
    entityId1: string;
    entityId2: string;
    messageId: string;
    conversationId: string;
    distance: number;
    context: string;
    timestamp: number;
}
export interface RelationshipCandidate {
    sourceEntity: Entity;
    targetEntity: Entity;
    relationshipType: RelationshipType;
    confidence: number;
    evidence: CoOccurrence[];
    suggestedContext: string;
}
export interface DetectionConfig {
    maxCoOccurrenceDistance: number;
    minRelationshipStrength: number;
    contextWindowSize: number;
    enableSemanticAnalysis: boolean;
}
export declare class RelationshipDetector {
    private dbManager;
    private entityRepository;
    private config;
    constructor(dbManager: DatabaseManager, config?: Partial<DetectionConfig>);
    /**
     * Analyze a message for entity relationships
     */
    analyzeMessage(messageId: string, conversationId: string, content: string, extractedEntities: Array<{
        entityId: string;
        startPosition: number;
        endPosition: number;
        type: EntityType;
    }>): Promise<{
        coOccurrences: CoOccurrence[];
        detectedRelationships: RelationshipCandidate[];
    }>;
    /**
     * Find co-occurrences between entities in a message
     */
    private findCoOccurrences;
    /**
     * Analyze co-occurrences to detect semantic relationships
     */
    private detectRelationships;
    /**
     * Infer possible relationship types based on entity types
     */
    private inferRelationshipTypes;
    /**
     * Calculate confidence score for a relationship
     */
    private calculateRelationshipConfidence;
    /**
     * Analyze context for relationship-specific indicators
     */
    private analyzeContextStrength;
    /**
     * Count relationship indicators in text
     */
    private countIndicators;
    /**
     * Check for work-related indicators
     */
    private hasWorkIndicators;
    /**
     * Check for employment indicators
     */
    private hasEmploymentIndicators;
    /**
     * Check for development indicators
     */
    private hasDevelopmentIndicators;
    /**
     * Store relationship in database
     */
    storeRelationship(relationship: RelationshipCandidate): Promise<EntityRelationship>;
    /**
     * Get relationships for an entity
     */
    getEntityRelationships(entityId: string): Promise<EntityRelationship[]>;
    /**
     * Batch analyze relationships across multiple messages
     */
    analyzeConversation(_conversationId: string): Promise<{
        totalCoOccurrences: number;
        totalRelationships: number;
        strongestRelationships: RelationshipCandidate[];
    }>;
    /**
     * Generate UUID
     */
    private generateId;
}
//# sourceMappingURL=RelationshipDetector.d.ts.map