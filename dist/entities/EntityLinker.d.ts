/**
 * Entity Linking Service
 *
 * Handles fuzzy matching, alias resolution, and entity consolidation.
 * Links entity variations across conversations (e.g., "John", "John Doe", "JD").
 */
import { Entity, EntityType } from '../storage/repositories/EntityRepository.js';
import { DatabaseManager } from '../storage/Database.js';
export interface EntityAlias {
    id: string;
    entityId: string;
    alias: string;
    aliasType: AliasType;
    confidenceScore: number;
    createdAt: number;
}
export type AliasType = 'formal' | 'informal' | 'abbreviation' | 'nickname' | 'variation';
export interface LinkingCandidate {
    entity: Entity;
    similarity: number;
    matchType: 'exact' | 'fuzzy' | 'semantic' | 'alias' | 'pattern';
    explanation: string;
}
export interface LinkingConfig {
    fuzzyThreshold: number;
    enableAliasGeneration: boolean;
    enableSemanticMatching: boolean;
    maxCandidates: number;
}
export declare class EntityLinker {
    private entityRepository;
    private dbManager;
    private config;
    constructor(dbManager: DatabaseManager, config?: Partial<LinkingConfig>);
    /**
     * Find the best matching entity for a given text and type
     */
    linkEntity(text: string, type: EntityType, context?: string): Promise<{
        linkedEntity: Entity | null;
        candidates: LinkingCandidate[];
        shouldCreateNew: boolean;
        suggestedAliases: string[];
    }>;
    /**
     * Create aliases for an entity
     */
    createAlias(entityId: string, alias: string, aliasType: AliasType, confidence?: number): Promise<EntityAlias>;
    /**
     * Batch create aliases for an entity
     */
    createAliases(entityId: string, aliases: Array<{
        alias: string;
        type: AliasType;
        confidence?: number;
    }>): Promise<EntityAlias[]>;
    /**
     * Merge two entities by moving all mentions to the target entity
     */
    mergeEntities(sourceEntityId: string, targetEntityId: string): Promise<boolean>;
    /**
     * Get all aliases for an entity
     */
    getEntityAliases(entityId: string): Promise<EntityAlias[]>;
    /**
     * Find entity by alias
     */
    private findByAlias;
    /**
     * Find fuzzy matching candidates
     */
    private findFuzzyCandidates;
    /**
     * Generate potential aliases for an entity
     */
    private generateAliases;
    /**
     * Generate technical term variations
     */
    private generateTechnicalVariations;
    /**
     * Generate organization abbreviation
     */
    private generateOrganizationAbbreviation;
    /**
     * Check if text is an abbreviation of name
     */
    private isAbbreviation;
    /**
     * Check if text is a nickname of name
     */
    private isNickname;
    /**
     * Calculate Levenshtein similarity between two strings
     */
    private calculateLevenshteinSimilarity;
    /**
     * Calculate Levenshtein distance
     */
    private levenshteinDistance;
    /**
     * Normalize text for comparison
     */
    private normalizeText;
    /**
     * Generate UUID
     */
    private generateId;
    /**
     * Map database row to EntityAlias
     */
    private mapRowToAlias;
}
//# sourceMappingURL=EntityLinker.d.ts.map