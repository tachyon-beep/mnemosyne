/**
 * Entity Extraction Service
 *
 * Extracts entities from text using pattern matching and NLP approaches.
 * Integrates with the existing EntityCentricStrategy patterns and extends
 * them for knowledge graph population.
 */
import { EntityType, ExtractionMethod } from '../storage/repositories/KnowledgeGraphRepository.js';
/**
 * Extracted entity with position and confidence information
 */
export interface ExtractedEntity {
    text: string;
    normalizedText: string;
    type: EntityType;
    confidence: number;
    startPosition: number;
    endPosition: number;
    extractionMethod: ExtractionMethod;
    context?: string;
}
/**
 * Entity extraction configuration
 */
export interface ExtractionConfig {
    minConfidence: number;
    maxEntitiesPerMessage: number;
    enableContextCapture: boolean;
    contextWindowSize: number;
}
/**
 * Entity extraction service
 */
export declare class EntityExtractor {
    private entityPatterns;
    private stopWords;
    private config;
    constructor(config?: Partial<ExtractionConfig>);
    /**
     * Extract entities from text
     */
    extractEntities(text: string, _messageId?: string): ExtractedEntity[];
    /**
     * Initialize entity recognition patterns
     * Based on EntityCentricStrategy patterns but extended for knowledge graph
     */
    private initializePatterns;
    /**
     * Initialize stop words to filter out common words
     */
    private initializeStopWords;
    /**
     * Find pattern matches in text
     */
    private findMatches;
    /**
     * Calculate confidence score for an extracted entity
     */
    private calculateConfidence;
    /**
     * Normalize entity text for consistent matching
     */
    private normalizeEntityText;
    /**
     * Extract context around an entity mention
     */
    private extractContext;
    /**
     * Update extraction configuration
     */
    updateConfig(config: Partial<ExtractionConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): ExtractionConfig;
    /**
     * Add custom pattern for entity type
     */
    addCustomPattern(entityType: EntityType, pattern: RegExp): void;
    /**
     * Get statistics about pattern usage
     */
    getPatternStats(): Record<EntityType, number>;
}
//# sourceMappingURL=EntityExtractor.d.ts.map