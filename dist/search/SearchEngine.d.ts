/**
 * Search Engine - Main search functionality using SQLite FTS5
 *
 * This module provides:
 * - Advanced search functionality using FTS5
 * - Integration with MessageRepository for database access
 * - Query parsing and sanitization
 * - Result formatting with snippets and highlighting
 * - Support for different match types and filtering
 * - Ranking using BM25 algorithm
 * - Date and conversation filtering
 * - Pagination support
 */
import { MessageRepository } from '../storage/repositories/MessageRepository.js';
import { SearchOptions, SearchResult, PaginatedResult } from '../types/interfaces.js';
import { ParsedQuery } from './QueryParser.js';
import { FormattedSearchResult, SnippetOptions } from './SearchResultFormatter.js';
import { MemoryManager } from '../utils/MemoryManager.js';
export interface SearchEngineOptions {
    /** Default maximum number of results per page */
    defaultLimit?: number;
    /** Maximum allowed limit per search */
    maxLimit?: number;
    /** Default snippet configuration */
    snippetOptions?: SnippetOptions;
    /** Whether to use enhanced formatting */
    enableEnhancedFormatting?: boolean;
    /** Minimum query score threshold */
    minScoreThreshold?: number;
}
export interface SearchStats {
    /** Query processing time in milliseconds */
    queryTime: number;
    /** Number of results before filtering */
    totalResults: number;
    /** Number of results after filtering */
    filteredResults: number;
    /** Query parsing information */
    queryInfo: ParsedQuery;
    /** Whether results were cached */
    cached: boolean;
}
export interface EnhancedSearchResult {
    /** Paginated search results */
    results: PaginatedResult<FormattedSearchResult>;
    /** Search statistics and metadata */
    stats: SearchStats;
    /** Original search options */
    options: SearchOptions;
}
/**
 * Main search engine class with advanced FTS5 capabilities
 */
export declare class SearchEngine {
    private messageRepository;
    private options;
    private intelligentCache?;
    private queryCache;
    private readonly CACHE_TTL;
    private cleanupInterval?;
    private searchMetrics;
    constructor(messageRepository: MessageRepository, options?: SearchEngineOptions & {
        memoryManager?: MemoryManager;
        enableIntelligentCaching?: boolean;
    });
    /**
     * Perform a search with advanced options
     */
    search(searchOptions: SearchOptions): Promise<EnhancedSearchResult>;
    /**
     * Perform a simple text search
     */
    simpleSearch(query: string, limit?: number, conversationId?: string): Promise<SearchResult[]>;
    /**
     * Perform an exact phrase search
     */
    phraseSearch(phrase: string, limit?: number, conversationId?: string): Promise<SearchResult[]>;
    /**
     * Perform a prefix search
     */
    prefixSearch(prefix: string, limit?: number, conversationId?: string): Promise<SearchResult[]>;
    /**
     * Search within a specific date range
     */
    searchByDateRange(query: string, startDate: string, endDate: string, limit?: number, conversationId?: string): Promise<SearchResult[]>;
    /**
     * Search with custom highlighting
     */
    searchWithHighlighting(query: string, highlightStart: string, highlightEnd: string, limit?: number, conversationId?: string): Promise<FormattedSearchResult[]>;
    /**
     * Get search suggestions based on partial query
     */
    getSuggestions(partialQuery: string, limit?: number): Promise<string[]>;
    /**
     * Get search statistics for analytics
     */
    getSearchAnalytics(query: string): Promise<{
        estimatedResults: number;
        queryComplexity: 'simple' | 'moderate' | 'complex';
        suggestedFilters: string[];
    }>;
    /**
     * Validate a search query
     */
    validateQuery(query: string): {
        isValid: boolean;
        error?: string;
        suggestions?: string[];
    };
    /**
     * Clear the search cache
     */
    clearCache(): void;
    /**
     * Optimize search cache
     */
    optimizeCache(): Promise<void>;
    /**
     * Warm cache with common search patterns
     */
    warmCache(commonQueries: string[]): Promise<void>;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        hitRate: number;
        totalSearches: number;
        averageSearchTime: number;
        cacheHits: number;
        cacheMisses: number;
    };
    /**
     * Get detailed performance metrics
     */
    getPerformanceMetrics(): {
        searchMetrics: {
            totalSearches: number;
            totalSearchTime: number;
            cacheHits: number;
            cacheMisses: number;
        };
        cacheStats: any;
        recommendations: string[];
    };
    /**
     * Generate cache key for search options
     */
    private generateCacheKey;
    /**
     * Get cached search result
     */
    private getCachedResult;
    /**
     * Cache search result
     */
    private setCachedResult;
    /**
     * Clean expired cache entries
     */
    private cleanCache;
    /**
     * Update search engine options
     */
    updateOptions(newOptions: Partial<SearchEngineOptions>): void;
    /**
     * Get current search engine configuration
     */
    getConfiguration(): Required<SearchEngineOptions>;
    /**
     * Index a message for search (the actual indexing is handled by database triggers)
     * This method is called by tools to notify the search engine of new messages
     */
    indexMessage(message: {
        id: string;
        content: string;
        conversationId: string;
    }): Promise<void>;
    /**
     * Remove a message from the search index (the actual removal is handled by database triggers)
     * This method is called by tools to notify the search engine of deleted messages
     */
    removeMessage(_messageId: string): Promise<void>;
    /**
     * Clear cache entries related to a specific conversation
     */
    private clearCacheForConversation;
    /**
     * Cleanup resources
     */
    destroy(): void;
    /**
     * Get cache priority for search result
     */
    private getCachePriority;
    /**
     * Calculate search cost (for cache eviction decisions)
     */
    private calculateSearchCost;
    /**
     * Estimate result size in bytes
     */
    private estimateResultSize;
}
//# sourceMappingURL=SearchEngine.d.ts.map