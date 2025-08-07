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
import { QueryParser } from './QueryParser.js';
import { SearchResultFormatter } from './SearchResultFormatter.js';
import { IntelligentCacheManager } from '../utils/IntelligentCacheManager.js';
/**
 * Main search engine class with advanced FTS5 capabilities
 */
export class SearchEngine {
    messageRepository;
    options;
    intelligentCache;
    queryCache = new Map();
    CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    cleanupInterval;
    searchMetrics = {
        totalSearches: 0,
        totalSearchTime: 0,
        cacheHits: 0,
        cacheMisses: 0
    };
    constructor(messageRepository, options) {
        this.messageRepository = messageRepository;
        this.options = {
            defaultLimit: 20,
            maxLimit: 100,
            snippetOptions: {
                maxLength: 200,
                contextLength: 50,
                highlightStart: '<mark>',
                highlightEnd: '</mark>',
                ellipsis: '...',
                preserveWords: true,
                maxHighlights: 10
            },
            enableEnhancedFormatting: true,
            minScoreThreshold: -10.0, // Allow negative BM25 scores from SQLite FTS5
            ...options
        };
        // Initialize intelligent caching if available
        if (options?.enableIntelligentCaching && options.memoryManager) {
            this.intelligentCache = new IntelligentCacheManager(options.memoryManager, {
                maxTotalMemory: 20 * 1024 * 1024, // 20MB for search cache
                defaultTTL: this.CACHE_TTL,
                enableCacheWarming: true
            });
            this.intelligentCache.start();
        }
        else {
            // queryCache is already initialized above
            // Clean cache periodically
            this.cleanupInterval = setInterval(() => this.cleanCache(), this.CACHE_TTL);
            this.cleanupInterval.unref(); // Don't keep process alive
        }
    }
    /**
     * Perform a search with advanced options
     */
    async search(searchOptions) {
        const startTime = Date.now();
        this.searchMetrics.totalSearches++;
        // Validate and parse the query
        const queryInfo = QueryParser.parseQuery(searchOptions.query, searchOptions.matchType);
        if (!queryInfo.isValid) {
            const result = {
                results: { data: [], hasMore: false },
                stats: {
                    queryTime: Date.now() - startTime,
                    totalResults: 0,
                    filteredResults: 0,
                    queryInfo,
                    cached: false
                },
                options: searchOptions
            };
            this.searchMetrics.totalSearchTime += Date.now() - startTime;
            return result;
        }
        // Check intelligent cache first
        const cacheKey = this.generateCacheKey(searchOptions);
        if (this.intelligentCache) {
            const cached = await this.intelligentCache.get(cacheKey);
            if (cached) {
                this.searchMetrics.cacheHits++;
                this.searchMetrics.totalSearchTime += Date.now() - startTime;
                return {
                    ...cached,
                    stats: {
                        ...cached.stats,
                        queryTime: Date.now() - startTime,
                        cached: true
                    }
                };
            }
        }
        else {
            // Fallback to simple cache
            const cached = this.getCachedResult(cacheKey);
            if (cached) {
                this.searchMetrics.cacheHits++;
                this.searchMetrics.totalSearchTime += Date.now() - startTime;
                return {
                    ...cached,
                    stats: {
                        ...cached.stats,
                        queryTime: Date.now() - startTime,
                        cached: true
                    }
                };
            }
        }
        this.searchMetrics.cacheMisses++;
        try {
            // Prepare search options with parsed query
            const processedOptions = {
                ...searchOptions,
                query: queryInfo.query,
                limit: Math.min(searchOptions.limit || this.options.defaultLimit, this.options.maxLimit),
                offset: Math.max(searchOptions.offset || 0, 0)
            };
            // Perform the database search
            const searchResults = await this.messageRepository.search(processedOptions);
            // Filter results by score threshold if specified
            const filteredResults = searchResults.data.filter(result => result.score >= (this.options.minScoreThreshold || 0));
            // Format results with enhanced snippets if enabled
            let formattedResults;
            if (this.options.enableEnhancedFormatting) {
                formattedResults = SearchResultFormatter.formatResults(filteredResults, searchOptions.query, {
                    ...this.options.snippetOptions,
                    highlightStart: searchOptions.highlightStart || this.options.snippetOptions.highlightStart,
                    highlightEnd: searchOptions.highlightEnd || this.options.snippetOptions.highlightEnd
                });
            }
            else {
                // Use basic formatting
                formattedResults = filteredResults.map(result => ({
                    ...result,
                    enhancedSnippet: result.snippet,
                    matchCount: 0,
                    highlightedTerms: [],
                    snippetStart: 0,
                    snippetEnd: result.snippet.length
                }));
            }
            const finalResults = {
                data: formattedResults,
                hasMore: searchResults.hasMore,
                totalCount: searchResults.totalCount
            };
            const enhancedResult = {
                results: finalResults,
                stats: {
                    queryTime: Date.now() - startTime,
                    totalResults: searchResults.data.length,
                    filteredResults: filteredResults.length,
                    queryInfo,
                    cached: false
                },
                options: searchOptions
            };
            // Cache the result with intelligent caching if available
            if (this.intelligentCache) {
                const priority = this.getCachePriority(searchOptions, enhancedResult);
                const cost = this.calculateSearchCost(enhancedResult);
                await this.intelligentCache.set(cacheKey, enhancedResult, {
                    priority,
                    cost,
                    size: this.estimateResultSize(enhancedResult)
                });
            }
            else {
                // Fallback to simple caching
                this.setCachedResult(cacheKey, enhancedResult);
            }
            this.searchMetrics.totalSearchTime += Date.now() - startTime;
            return enhancedResult;
        }
        catch (error) {
            // Return error state with debugging info
            const errorResult = {
                results: { data: [], hasMore: false },
                stats: {
                    queryTime: Date.now() - startTime,
                    totalResults: 0,
                    filteredResults: 0,
                    queryInfo: {
                        ...queryInfo,
                        error: error instanceof Error ? error.message : 'Search failed'
                    },
                    cached: false
                },
                options: searchOptions
            };
            this.searchMetrics.totalSearchTime += Date.now() - startTime;
            return errorResult;
        }
    }
    /**
     * Perform a simple text search
     */
    async simpleSearch(query, limit, conversationId) {
        const searchOptions = {
            query,
            limit: limit || this.options.defaultLimit,
            conversationId,
            matchType: 'fuzzy'
        };
        const result = await this.search(searchOptions);
        return result.results.data.map(formatted => ({
            message: formatted.message,
            score: formatted.score,
            snippet: formatted.snippet,
            conversationTitle: formatted.conversationTitle
        }));
    }
    /**
     * Perform an exact phrase search
     */
    async phraseSearch(phrase, limit, conversationId) {
        const searchOptions = {
            query: `"${phrase}"`,
            limit: limit || this.options.defaultLimit,
            conversationId,
            matchType: 'exact'
        };
        const result = await this.search(searchOptions);
        return result.results.data.map(formatted => ({
            message: formatted.message,
            score: formatted.score,
            snippet: formatted.snippet,
            conversationTitle: formatted.conversationTitle
        }));
    }
    /**
     * Perform a prefix search
     */
    async prefixSearch(prefix, limit, conversationId) {
        // Don't modify the original query - let the query parser handle it
        const searchOptions = {
            query: prefix + '*', // Add asterisk for prefix search
            limit: limit || this.options.defaultLimit,
            conversationId,
            matchType: 'prefix'
        };
        const result = await this.search(searchOptions);
        return result.results.data.map(formatted => ({
            message: formatted.message,
            score: formatted.score,
            snippet: formatted.snippet,
            conversationTitle: formatted.conversationTitle
        }));
    }
    /**
     * Search within a specific date range
     */
    async searchByDateRange(query, startDate, endDate, limit, conversationId) {
        const searchOptions = {
            query,
            startDate,
            endDate,
            limit: limit || this.options.defaultLimit,
            conversationId,
            matchType: 'fuzzy'
        };
        const result = await this.search(searchOptions);
        return result.results.data.map(formatted => ({
            message: formatted.message,
            score: formatted.score,
            snippet: formatted.snippet,
            conversationTitle: formatted.conversationTitle
        }));
    }
    /**
     * Search with custom highlighting
     */
    async searchWithHighlighting(query, highlightStart, highlightEnd, limit, conversationId) {
        const searchOptions = {
            query,
            highlightStart,
            highlightEnd,
            limit: limit || this.options.defaultLimit,
            conversationId,
            matchType: 'fuzzy'
        };
        const result = await this.search(searchOptions);
        return result.results.data;
    }
    /**
     * Get search suggestions based on partial query
     */
    async getSuggestions(partialQuery, limit = 5) {
        if (!partialQuery || partialQuery.length < 2) {
            return [];
        }
        try {
            // Use prefix search to find potential completions
            const suggestions = await this.prefixSearch(partialQuery, limit * 2);
            // Extract unique terms from results
            const terms = new Set();
            for (const result of suggestions) {
                const content = result.message.content.toLowerCase();
                const words = content.split(/\s+/);
                for (const word of words) {
                    if (word.startsWith(partialQuery.toLowerCase()) && word.length > partialQuery.length) {
                        terms.add(word);
                        if (terms.size >= limit)
                            break;
                    }
                }
                if (terms.size >= limit)
                    break;
            }
            return Array.from(terms).slice(0, limit);
        }
        catch (error) {
            return [];
        }
    }
    /**
     * Get search statistics for analytics
     */
    async getSearchAnalytics(query) {
        const queryInfo = QueryParser.parseQuery(query);
        if (!queryInfo.isValid) {
            return {
                estimatedResults: 0,
                queryComplexity: 'simple',
                suggestedFilters: []
            };
        }
        try {
            // Perform a limited search to estimate results
            const estimationSearch = await this.search({
                query,
                limit: 1,
                offset: 0
            });
            // Determine query complexity
            const terms = QueryParser.extractTerms(query);
            let complexity = 'simple';
            if (terms.length > 3 || queryInfo.hasOperators) {
                complexity = 'complex';
            }
            else if (terms.length > 1 || queryInfo.matchType !== 'fuzzy') {
                complexity = 'moderate';
            }
            // Suggest filters based on results
            const suggestedFilters = [];
            if (estimationSearch.stats.totalResults > 50) {
                suggestedFilters.push('date-range', 'conversation-filter');
            }
            if (complexity === 'simple' && estimationSearch.stats.totalResults < 5) {
                suggestedFilters.push('fuzzy-search', 'prefix-search');
            }
            return {
                estimatedResults: estimationSearch.stats.totalResults,
                queryComplexity: complexity,
                suggestedFilters
            };
        }
        catch (error) {
            return {
                estimatedResults: 0,
                queryComplexity: 'simple',
                suggestedFilters: []
            };
        }
    }
    /**
     * Validate a search query
     */
    validateQuery(query) {
        const validation = QueryParser.validateQuery(query);
        if (!validation.isValid) {
            return {
                ...validation,
                suggestions: ['Try simpler terms', 'Remove special characters', 'Use quotes for exact phrases']
            };
        }
        const parsed = QueryParser.parseQuery(query);
        return {
            isValid: parsed.isValid,
            error: parsed.error,
            suggestions: parsed.isValid ? [] : ['Try simpler terms', 'Remove special characters', 'Use quotes for exact phrases']
        };
    }
    /**
     * Clear the search cache
     */
    clearCache() {
        if (this.intelligentCache) {
            this.intelligentCache.clear();
        }
        else {
            this.queryCache.clear();
        }
    }
    /**
     * Optimize search cache
     */
    async optimizeCache() {
        if (this.intelligentCache) {
            await this.intelligentCache.optimizeCache();
        }
        else {
            // Simple cache optimization - just clean expired entries
            this.cleanCache();
        }
    }
    /**
     * Warm cache with common search patterns
     */
    async warmCache(commonQueries) {
        if (this.intelligentCache) {
            await this.intelligentCache.warmCache([{
                    keys: commonQueries,
                    loader: async (query) => {
                        return await this.search({ query, limit: 20 });
                    },
                    priority: 'high'
                }]);
        }
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        const hitRate = this.searchMetrics.totalSearches > 0
            ? this.searchMetrics.cacheHits / this.searchMetrics.totalSearches
            : 0;
        const averageSearchTime = this.searchMetrics.totalSearches > 0
            ? this.searchMetrics.totalSearchTime / this.searchMetrics.totalSearches
            : 0;
        return {
            size: this.intelligentCache
                ? this.intelligentCache.getStats().global.entryCount
                : this.queryCache.size,
            hitRate,
            totalSearches: this.searchMetrics.totalSearches,
            averageSearchTime,
            cacheHits: this.searchMetrics.cacheHits,
            cacheMisses: this.searchMetrics.cacheMisses
        };
    }
    /**
     * Get detailed performance metrics
     */
    getPerformanceMetrics() {
        const cacheStats = this.getCacheStats();
        const recommendations = [];
        // Generate performance recommendations
        if (cacheStats.hitRate < 0.7) {
            recommendations.push('Search cache hit rate is low - consider cache warming');
        }
        if (cacheStats.averageSearchTime > 500) {
            recommendations.push('Average search time is high - consider query optimization');
        }
        if (this.searchMetrics.totalSearches > 1000 && cacheStats.hitRate < 0.5) {
            recommendations.push('High search volume with low cache efficiency - review search patterns');
        }
        return {
            searchMetrics: { ...this.searchMetrics },
            cacheStats: this.intelligentCache ? this.intelligentCache.getStats() : cacheStats,
            recommendations
        };
    }
    /**
     * Generate cache key for search options
     */
    generateCacheKey(options) {
        const key = {
            query: options.query,
            conversationId: options.conversationId,
            limit: options.limit,
            offset: options.offset,
            startDate: options.startDate,
            endDate: options.endDate,
            matchType: options.matchType
        };
        return JSON.stringify(key);
    }
    /**
     * Get cached search result
     */
    getCachedResult(key) {
        const cached = this.queryCache.get(key);
        if (!cached)
            return null;
        // Check if cache entry is still valid
        if (Date.now() - cached.timestamp > this.CACHE_TTL) {
            this.queryCache.delete(key);
            return null;
        }
        return cached.result;
    }
    /**
     * Cache search result
     */
    setCachedResult(key, result) {
        this.queryCache.set(key, {
            result,
            timestamp: Date.now()
        });
    }
    /**
     * Clean expired cache entries
     */
    cleanCache() {
        const now = Date.now();
        for (const [key, value] of this.queryCache.entries()) {
            if (now - value.timestamp > this.CACHE_TTL) {
                this.queryCache.delete(key);
            }
        }
    }
    /**
     * Update search engine options
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        // Clear cache if options changed significantly
        if (newOptions.snippetOptions || newOptions.enableEnhancedFormatting) {
            this.clearCache();
        }
    }
    /**
     * Get current search engine configuration
     */
    getConfiguration() {
        return { ...this.options };
    }
    /**
     * Index a message for search (the actual indexing is handled by database triggers)
     * This method is called by tools to notify the search engine of new messages
     */
    async indexMessage(message) {
        // In our SQLite FTS5 implementation, indexing is handled automatically by triggers
        // This method exists for compatibility with the tool interface
        // We could potentially implement additional indexing logic here in the future
        // For now, we just clear relevant cache entries
        this.clearCacheForConversation(message.conversationId);
    }
    /**
     * Remove a message from the search index (the actual removal is handled by database triggers)
     * This method is called by tools to notify the search engine of deleted messages
     */
    async removeMessage(_messageId) {
        // In our SQLite FTS5 implementation, removal is handled automatically by triggers
        // This method exists for compatibility with the tool interface
        // We just clear the entire cache to ensure consistency
        this.clearCache();
    }
    /**
     * Clear cache entries related to a specific conversation
     */
    clearCacheForConversation(conversationId) {
        const keysToDelete = [];
        for (const [key, _] of this.queryCache.entries()) {
            try {
                const parsedKey = JSON.parse(key);
                if (parsedKey.conversationId === conversationId) {
                    keysToDelete.push(key);
                }
            }
            catch {
                // Invalid key format, skip
            }
        }
        keysToDelete.forEach(key => this.queryCache.delete(key));
    }
    /**
     * Cleanup resources
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
        if (this.intelligentCache) {
            this.intelligentCache.stop();
        }
        this.clearCache();
    }
    /**
     * Get cache priority for search result
     */
    getCachePriority(searchOptions, result) {
        // High priority for searches with good results
        if (result.results.data.length > 5 && result.stats.queryTime < 200) {
            return 'high';
        }
        // Medium priority for reasonable results
        if (result.results.data.length > 0) {
            return 'medium';
        }
        // Low priority for empty results or very slow searches
        return 'low';
    }
    /**
     * Calculate search cost (for cache eviction decisions)
     */
    calculateSearchCost(result) {
        // Base cost on query time and complexity
        const baseScore = result.stats.queryTime / 100; // Normalize to 0-10 scale
        const complexityScore = result.stats.queryInfo.hasOperators ? 2 : 1;
        const resultScore = Math.min(result.results.data.length / 10, 2); // Max 2 points for results
        return Math.max(1, baseScore * complexityScore + resultScore);
    }
    /**
     * Estimate result size in bytes
     */
    estimateResultSize(result) {
        try {
            // Rough estimation based on JSON string length
            return JSON.stringify(result).length * 2;
        }
        catch {
            return 1024; // Default 1KB
        }
    }
}
//# sourceMappingURL=SearchEngine.js.map