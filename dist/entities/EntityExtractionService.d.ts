/**
 * Entity Extraction Service for Phase 3
 *
 * Extracts entities from message text using pattern matching.
 * Integrates with EntityRepository for storage and management.
 */
import { EntityType, Entity } from '../storage/repositories/EntityRepository.js';
import { DatabaseManager } from '../storage/Database.js';
export interface ExtractedEntity {
    text: string;
    normalizedText: string;
    type: EntityType;
    confidence: number;
    startPosition: number;
    endPosition: number;
    context?: string;
}
export interface EntityMention {
    entityId: string;
    messageId: string;
    conversationId: string;
    mentionText: string;
    startPosition: number;
    endPosition: number;
    confidence: number;
}
export interface ExtractionConfig {
    minConfidence: number;
    maxEntitiesPerMessage: number;
    enableContextCapture: boolean;
    contextWindowSize: number;
}
export declare class EntityExtractionService {
    private entityRepository;
    private dbManager;
    private config;
    private entityPatterns;
    private stopWords;
    constructor(dbManager: DatabaseManager, config?: Partial<ExtractionConfig>);
    /**
     * Extract and process entities from message text
     */
    processMessage(messageId: string, conversationId: string, content: string): Promise<{
        extractedEntities: ExtractedEntity[];
        createdEntities: Entity[];
        mentions: EntityMention[];
    }>;
    /**
     * Extract entities from text using pattern matching
     */
    private extractEntitiesFromText;
    /**
     * Store entity mention in database
     */
    private storeMention;
    /**
     * Initialize entity recognition patterns
     * Order matters! More specific patterns should come before general ones.
     */
    private initializePatterns;
    /**
     * Initialize stop words
     */
    private initializeStopWords;
    /**
     * Find pattern matches in text
     */
    private findMatches;
    /**
     * Calculate confidence score for an entity
     */
    private calculateConfidence;
    /**
     * Extract context around entity mention
     */
    private extractContext;
    /**
     * Normalize entity text for consistent matching
     */
    private normalizeEntityText;
    /**
     * Generate UUID for mentions
     */
    private generateId;
    /**
     * Batch process multiple messages
     */
    processMessages(messages: Array<{
        id: string;
        conversationId: string;
        content: string;
    }>): Promise<{
        totalEntitiesExtracted: number;
        totalEntitiesCreated: number;
        totalMentions: number;
        processingStats: Map<string, number>;
    }>;
}
//# sourceMappingURL=EntityExtractionService.d.ts.map