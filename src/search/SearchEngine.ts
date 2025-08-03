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

import { MessageRepository } from '../storage/repositories/MessageRepository';
import { SearchOptions, SearchResult, PaginatedResult } from '../types/interfaces';
import { QueryParser, ParsedQuery } from './QueryParser';
import { SearchResultFormatter, FormattedSearchResult, SnippetOptions } from './SearchResultFormatter';

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
export class SearchEngine {
  private messageRepository: MessageRepository;
  private options: Required<SearchEngineOptions>;
  private queryCache: Map<string, { result: EnhancedSearchResult; timestamp: number }>;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    messageRepository: MessageRepository,
    options?: SearchEngineOptions
  ) {
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
      minScoreThreshold: 0.01,
      ...options
    };
    this.queryCache = new Map();
    
    // Clean cache periodically
    this.cleanupInterval = setInterval(() => this.cleanCache(), this.CACHE_TTL);
    this.cleanupInterval.unref(); // Don't keep process alive
  }

  /**
   * Perform a search with advanced options
   */
  async search(searchOptions: SearchOptions): Promise<EnhancedSearchResult> {
    const startTime = Date.now();
    
    // Validate and parse the query
    const queryInfo = QueryParser.parseQuery(searchOptions.query, searchOptions.matchType);
    
    if (!queryInfo.isValid) {
      return {
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
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(searchOptions);
    const cached = this.getCachedResult(cacheKey);
    if (cached) {
      return {
        ...cached,
        stats: {
          ...cached.stats,
          queryTime: Date.now() - startTime,
          cached: true
        }
      };
    }

    try {
      // Prepare search options with parsed query
      const processedOptions: SearchOptions = {
        ...searchOptions,
        query: queryInfo.query,
        limit: Math.min(searchOptions.limit || this.options.defaultLimit, this.options.maxLimit),
        offset: Math.max(searchOptions.offset || 0, 0)
      };

      // Perform the database search
      const searchResults = await this.messageRepository.search(processedOptions);
      
      // Filter results by score threshold if specified
      const filteredResults = searchResults.data.filter(result => 
        result.score >= (this.options.minScoreThreshold || 0)
      );

      // Format results with enhanced snippets if enabled
      let formattedResults: FormattedSearchResult[];
      if (this.options.enableEnhancedFormatting) {
        formattedResults = SearchResultFormatter.formatResults(
          filteredResults,
          searchOptions.query,
          {
            ...this.options.snippetOptions,
            highlightStart: searchOptions.highlightStart || this.options.snippetOptions.highlightStart,
            highlightEnd: searchOptions.highlightEnd || this.options.snippetOptions.highlightEnd
          }
        );
      } else {
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

      const finalResults: PaginatedResult<FormattedSearchResult> = {
        data: formattedResults,
        hasMore: searchResults.hasMore,
        totalCount: searchResults.totalCount
      };

      const enhancedResult: EnhancedSearchResult = {
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

      // Cache the result
      this.setCachedResult(cacheKey, enhancedResult);

      return enhancedResult;

    } catch (error) {
      // Return error state with debugging info
      return {
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
    }
  }

  /**
   * Perform a simple text search
   */
  async simpleSearch(
    query: string,
    limit?: number,
    conversationId?: string
  ): Promise<SearchResult[]> {
    const searchOptions: SearchOptions = {
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
  async phraseSearch(
    phrase: string,
    limit?: number,
    conversationId?: string
  ): Promise<SearchResult[]> {
    const searchOptions: SearchOptions = {
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
  async prefixSearch(
    prefix: string,
    limit?: number,
    conversationId?: string
  ): Promise<SearchResult[]> {
    // Don't modify the original query - let the query parser handle it
    const searchOptions: SearchOptions = {
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
  async searchByDateRange(
    query: string,
    startDate: string,
    endDate: string,
    limit?: number,
    conversationId?: string
  ): Promise<SearchResult[]> {
    const searchOptions: SearchOptions = {
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
  async searchWithHighlighting(
    query: string,
    highlightStart: string,
    highlightEnd: string,
    limit?: number,
    conversationId?: string
  ): Promise<FormattedSearchResult[]> {
    const searchOptions: SearchOptions = {
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
  async getSuggestions(
    partialQuery: string,
    limit: number = 5
  ): Promise<string[]> {
    if (!partialQuery || partialQuery.length < 2) {
      return [];
    }

    try {
      // Use prefix search to find potential completions
      const suggestions = await this.prefixSearch(partialQuery, limit * 2);
      
      // Extract unique terms from results
      const terms = new Set<string>();
      
      for (const result of suggestions) {
        const content = result.message.content.toLowerCase();
        const words = content.split(/\s+/);
        
        for (const word of words) {
          if (word.startsWith(partialQuery.toLowerCase()) && word.length > partialQuery.length) {
            terms.add(word);
            if (terms.size >= limit) break;
          }
        }
        
        if (terms.size >= limit) break;
      }
      
      return Array.from(terms).slice(0, limit);
    } catch (error) {
      return [];
    }
  }

  /**
   * Get search statistics for analytics
   */
  async getSearchAnalytics(query: string): Promise<{
    estimatedResults: number;
    queryComplexity: 'simple' | 'moderate' | 'complex';
    suggestedFilters: string[];
  }> {
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
      let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
      
      if (terms.length > 3 || queryInfo.hasOperators) {
        complexity = 'complex';
      } else if (terms.length > 1 || queryInfo.matchType !== 'fuzzy') {
        complexity = 'moderate';
      }

      // Suggest filters based on results
      const suggestedFilters: string[] = [];
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
    } catch (error) {
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
  validateQuery(query: string): { isValid: boolean; error?: string; suggestions?: string[] } {
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
  clearCache(): void {
    this.queryCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.queryCache.size,
      hitRate: 0 // Would need to track hits/misses to calculate
    };
  }

  /**
   * Generate cache key for search options
   */
  private generateCacheKey(options: SearchOptions): string {
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
  private getCachedResult(key: string): EnhancedSearchResult | null {
    const cached = this.queryCache.get(key);
    if (!cached) return null;

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
  private setCachedResult(key: string, result: EnhancedSearchResult): void {
    this.queryCache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Clean expired cache entries
   */
  private cleanCache(): void {
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
  updateOptions(newOptions: Partial<SearchEngineOptions>): void {
    this.options = { ...this.options, ...newOptions };
    
    // Clear cache if options changed significantly
    if (newOptions.snippetOptions || newOptions.enableEnhancedFormatting) {
      this.clearCache();
    }
  }

  /**
   * Get current search engine configuration
   */
  getConfiguration(): Required<SearchEngineOptions> {
    return { ...this.options };
  }

  /**
   * Index a message for search (the actual indexing is handled by database triggers)
   * This method is called by tools to notify the search engine of new messages
   */
  async indexMessage(message: { id: string; content: string; conversationId: string }): Promise<void> {
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
  async removeMessage(_messageId: string): Promise<void> {
    // In our SQLite FTS5 implementation, removal is handled automatically by triggers
    // This method exists for compatibility with the tool interface
    // We just clear the entire cache to ensure consistency
    this.clearCache();
  }

  /**
   * Clear cache entries related to a specific conversation
   */
  private clearCacheForConversation(conversationId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key, _] of this.queryCache.entries()) {
      try {
        const parsedKey = JSON.parse(key);
        if (parsedKey.conversationId === conversationId) {
          keysToDelete.push(key);
        }
      } catch {
        // Invalid key format, skip
      }
    }
    
    keysToDelete.forEach(key => this.queryCache.delete(key));
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.clearCache();
  }
}