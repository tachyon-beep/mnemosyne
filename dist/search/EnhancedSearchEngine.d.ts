/**
 * Enhanced Search Engine - Hybrid semantic and FTS search
 *
 * This module provides:
 * - Hybrid search combining FTS and semantic similarity
 * - Intelligent query routing based on query characteristics
 * - Result ranking and merging algorithms
 * - Performance tracking and metrics
 * - Search configuration management
 */
import { DatabaseManager } from '../storage/Database.js';
import { EmbeddingManager } from './EmbeddingManager.js';
import { SearchEngine } from './SearchEngine.js';
import { SearchOptions } from '../types/interfaces.js';
export interface HybridSearchOptions extends SearchOptions {
    /** Search strategy */
    strategy?: 'auto' | 'semantic' | 'fts' | 'hybrid';
    /** Weights for hybrid search */
    weights?: {
        semantic: number;
        fts: number;
    };
    /** Minimum semantic similarity threshold */
    semanticThreshold?: number;
    /** Enable result explanation */
    explainResults?: boolean;
}
export interface HybridSearchResult {
    /** Message ID */
    messageId: string;
    /** Conversation ID */
    conversationId: string;
    /** Message content */
    content: string;
    /** Combined score */
    score: number;
    /** Result type */
    matchType: 'semantic' | 'fts' | 'hybrid';
    /** Individual scores */
    scores: {
        semantic?: number;
        fts?: number;
        combined: number;
    };
    /** Highlighted snippets */
    highlights: string[];
    /** Conversation title */
    conversationTitle?: string;
    /** Created timestamp */
    createdAt: number;
    /** Explanation of why this result was selected */
    explanation?: string;
}
export interface SearchMetrics {
    /** Query ID for tracking */
    queryId: string;
    /** Query text */
    query: string;
    /** Search strategy used */
    strategy: string;
    /** Number of results returned */
    resultCount: number;
    /** Total execution time */
    totalTime: number;
    /** Time breakdown */
    timing: {
        queryAnalysis: number;
        semanticSearch?: number;
        ftsSearch?: number;
        resultMerging?: number;
        formatting: number;
    };
    /** Query characteristics */
    queryAnalysis: {
        termCount: number;
        hasOperators: boolean;
        complexity: 'simple' | 'moderate' | 'complex';
        suggestedStrategy: string;
    };
}
/**
 * Enhanced search engine with hybrid semantic and FTS capabilities
 */
export declare class EnhancedSearchEngine {
    private dbManager;
    private embeddingManager;
    private ftsEngine;
    private defaultWeights;
    private metricsEnabled;
    constructor(dbManager: DatabaseManager, embeddingManager: EmbeddingManager, ftsEngine: SearchEngine);
    /**
     * Perform enhanced search with automatic strategy selection
     */
    search(options: HybridSearchOptions): Promise<{
        results: HybridSearchResult[];
        metrics: SearchMetrics;
        hasMore: boolean;
    }>;
    /**
     * Perform semantic-only search
     */
    private semanticSearch;
    /**
     * Perform FTS-only search
     */
    private ftsSearch;
    /**
     * Perform hybrid search combining semantic and FTS
     */
    private hybridSearch;
    /**
     * Merge semantic and FTS results with intelligent ranking
     */
    private mergeResults;
    /**
     * Analyze query to determine characteristics
     */
    private analyzeQuery;
    /**
     * Select optimal search strategy
     */
    private selectStrategy;
    /**
     * Convert similarity results to hybrid search results
     */
    private convertSimilarityResults;
    /**
     * Convert FTS results to hybrid search results
     */
    private convertFTSResults;
    /**
     * Generate semantic highlights (placeholder implementation)
     */
    private generateSemanticHighlights;
    /**
     * Add explanations to results
     */
    private addExplanations;
    /**
     * Generate explanation for why a result was selected
     */
    private generateExplanation;
    /**
     * Store search metrics in database
     */
    private storeMetrics;
    /**
     * Get search performance metrics
     */
    getSearchMetrics(options?: {
        startDate?: number;
        endDate?: number;
        queryType?: string;
        limit?: number;
    }): Promise<Array<{
        queryType: string;
        avgExecutionTime: number;
        avgResultCount: number;
        totalQueries: number;
        date: string;
    }>>;
    /**
     * Configure search weights and settings
     */
    updateConfiguration(config: {
        defaultWeights?: {
            semantic: number;
            fts: number;
        };
        metricsEnabled?: boolean;
        semanticThreshold?: number;
    }): Promise<void>;
    /**
     * Generate unique query ID for tracking
     */
    private generateQueryId;
    /**
     * Optimize search performance
     */
    optimize(): Promise<void>;
    /**
     * Get current search configuration
     */
    getConfiguration(): {
        defaultWeights: {
            semantic: number;
            fts: number;
        };
        metricsEnabled: boolean;
    };
    /**
     * Cleanup resources
     */
    destroy(): void;
}
//# sourceMappingURL=EnhancedSearchEngine.d.ts.map