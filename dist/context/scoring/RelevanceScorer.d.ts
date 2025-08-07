/**
 * Relevance Scorer - Multi-factor relevance scoring for context assembly
 *
 * This module provides:
 * - Semantic similarity scoring using embeddings
 * - Temporal relevance with decay functions
 * - Entity overlap scoring
 * - Structural relevance (conversation position)
 * - Query-specific weighting
 */
import { EmbeddingManager } from '../../search/EmbeddingManager.js';
import { ContextAssemblyRequest } from '../ContextAssembler.js';
/**
 * Item to be scored for relevance
 */
export interface ScoredItem {
    id: string;
    type: 'summary' | 'message';
    content: string;
    relevanceScore: number;
    tokenCount: number;
    createdAt: number;
    conversationId: string;
    metadata?: Record<string, any>;
    originalItem?: any;
}
/**
 * Item input for scoring
 */
export interface ItemToScore {
    id: string;
    type: 'summary' | 'message';
    content: string;
    createdAt: number;
    conversationId: string;
    metadata?: Record<string, any>;
}
/**
 * Relevance scoring configuration
 */
export interface RelevanceScorerConfig {
    /** Weight for semantic similarity (0-1) */
    semanticWeight: number;
    /** Weight for temporal relevance (0-1) */
    temporalWeight: number;
    /** Weight for entity overlap (0-1) */
    entityWeight: number;
    /** Weight for structural relevance (0-1) */
    structuralWeight: number;
    /** Temporal decay half-life in milliseconds */
    temporalDecayHalfLife: number;
    /** Minimum semantic similarity threshold */
    minSemanticSimilarity: number;
    /** Entity extraction patterns */
    entityPatterns: RegExp[];
}
/**
 * Relevance Scorer for context items
 */
export declare class RelevanceScorer {
    private config;
    private embeddingManager;
    private queryEmbeddingCache;
    constructor(embeddingManager: EmbeddingManager, config?: Partial<RelevanceScorerConfig>);
    /**
     * Score an item for relevance to a query
     */
    scoreItem(item: ItemToScore, request: ContextAssemblyRequest): Promise<number>;
    /**
     * Calculate semantic similarity score using embeddings
     */
    private calculateSemanticScore;
    /**
     * Calculate temporal relevance score with decay
     */
    private calculateTemporalScore;
    /**
     * Calculate entity overlap score
     */
    private calculateEntityScore;
    /**
     * Calculate structural relevance score
     */
    private calculateStructuralScore;
    /**
     * Apply query-specific boosting rules
     */
    private applyQuerySpecificBoosting;
    /**
     * Extract entities from text using patterns
     */
    private extractEntities;
    /**
     * Check if query is code-related
     */
    private isCodeRelatedQuery;
    /**
     * Check if content contains code
     */
    private hasCodeContent;
    /**
     * Check if query is error-related
     */
    private isErrorRelatedQuery;
    /**
     * Check if content contains error information
     */
    private hasErrorContent;
    /**
     * Check if query is time-sensitive
     */
    private isTimeSensitiveQuery;
    /**
     * Update configuration
     */
    updateConfig(updates: Partial<RelevanceScorerConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): RelevanceScorerConfig;
    /**
     * Clear query embedding cache
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        keys: string[];
    };
}
//# sourceMappingURL=RelevanceScorer.d.ts.map