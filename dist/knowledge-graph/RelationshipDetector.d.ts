/**
 * Relationship Detection Service
 *
 * Analyzes entity co-occurrences and contextual patterns to detect
 * relationships between entities across conversations.
 */
import { EntityType, RelationshipType } from '../storage/repositories/KnowledgeGraphRepository.js';
import { ExtractedEntity } from './EntityExtractor.js';
/**
 * Detected relationship between entities
 */
export interface DetectedRelationship {
    sourceEntityId: string;
    targetEntityId: string;
    relationshipType: RelationshipType;
    confidence: number;
    evidence: string[];
    contextMessageIds: string[];
}
/**
 * Relationship pattern for detection
 */
interface RelationshipPattern {
    type: RelationshipType;
    patterns: RegExp[];
    entityTypes: [EntityType[], EntityType[]];
    contextWindow: number;
    minConfidence: number;
}
/**
 * Relationship detection configuration
 */
export interface RelationshipDetectionConfig {
    maxEntityDistance: number;
    maxSentenceDistance: number;
    minCooccurrenceCount: number;
    minConfidence: number;
    enableTemporalAnalysis: boolean;
    temporalWindowDays: number;
}
/**
 * Relationship detector implementation
 */
export declare class RelationshipDetector {
    private relationshipPatterns;
    private config;
    constructor(config?: Partial<RelationshipDetectionConfig>);
    /**
     * Detect relationships between entities in text
     */
    detectRelationships(entities: ExtractedEntity[], text: string, messageId: string, conversationId: string): DetectedRelationship[];
    /**
     * Initialize relationship detection patterns
     */
    private initializePatterns;
    /**
     * Find entity co-occurrences within reasonable distance
     */
    private findEntityCooccurrences;
    /**
     * Analyze a co-occurrence for potential relationships
     */
    private analyzeCooccurrence;
    /**
     * Check if entity types match pattern requirements
     */
    private entityTypesMatch;
    /**
     * Calculate base confidence for relationship
     */
    private calculateBaseConfidence;
    /**
     * Adjust confidence based on contextual factors
     */
    private adjustConfidenceByContext;
    /**
     * Find pattern matches in context
     */
    private findPatternMatches;
    /**
     * Determine relationship direction based on entity types and patterns
     */
    private determineRelationshipDirection;
    /**
     * Split text into sentences
     */
    private splitIntoSentences;
    /**
     * Calculate sentence distance between two entities
     */
    private calculateSentenceDistance;
    /**
     * Generate consistent entity ID from extracted entity
     */
    private generateEntityId;
    /**
     * Merge relationships with same source, target, and type
     */
    private mergeRelationships;
    /**
     * Update detection configuration
     */
    updateConfig(config: Partial<RelationshipDetectionConfig>): void;
    /**
     * Add custom relationship pattern
     */
    addCustomPattern(pattern: RelationshipPattern): void;
    /**
     * Get detection statistics
     */
    getPatternStats(): Record<RelationshipType, number>;
}
export {};
//# sourceMappingURL=RelationshipDetector.d.ts.map