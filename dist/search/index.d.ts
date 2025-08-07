/**
 * Search Module - Export barrel for all search functionality
 *
 * This module provides comprehensive search capabilities for the MCP Persistence System:
 * - Advanced FTS5-based text search
 * - Query parsing and sanitization
 * - Result formatting with snippets and highlighting
 * - Multiple search modes (exact, fuzzy, prefix)
 * - Date and conversation filtering
 * - Caching and performance optimization
 */
export { SearchEngine } from './SearchEngine.js';
export type { SearchEngineOptions, SearchStats, EnhancedSearchResult } from './SearchEngine.js';
export { QueryParser } from './QueryParser.js';
export type { ParsedQuery } from './QueryParser.js';
export { SearchResultFormatter } from './SearchResultFormatter.js';
export type { SnippetOptions, FormattedSearchResult } from './SearchResultFormatter.js';
export type { SearchOptions, SearchResult, PaginatedResult } from '../types/interfaces.js';
/**
 * Factory function to create a configured search engine instance
 */
import { MessageRepository } from '../storage/repositories/MessageRepository.js';
import { SearchEngine, SearchEngineOptions } from './SearchEngine.js';
import { SearchOptions, SearchResult } from '../types/interfaces.js';
export declare function createSearchEngine(messageRepository: MessageRepository, options?: SearchEngineOptions): SearchEngine;
/**
 * Default search engine configuration
 */
export declare const DEFAULT_SEARCH_CONFIG: Required<SearchEngineOptions>;
/**
 * Common search presets for different use cases
 */
export declare const SEARCH_PRESETS: {
    /**
     * Fast search with minimal formatting for quick lookups
     */
    FAST: SearchEngineOptions;
    /**
     * Detailed search with rich formatting for user interfaces
     */
    DETAILED: SearchEngineOptions;
    /**
     * Analytics search for gathering insights and statistics
     */
    ANALYTICS: SearchEngineOptions;
};
/**
 * Utility functions for common search operations
 */
export declare class SearchUtils {
    /**
     * Create a search options object with sensible defaults
     */
    static createSearchOptions(query: string, overrides?: Partial<SearchOptions>): SearchOptions;
    /**
     * Validate search parameters
     */
    static validateSearchParams(params: {
        query?: string;
        limit?: number;
        offset?: number;
        startDate?: string;
        endDate?: string;
    }): {
        isValid: boolean;
        errors: string[];
    };
    /**
     * Sanitize user input for safe logging
     */
    static sanitizeForLogging(input: string): string;
    /**
     * Extract conversation context from search results
     */
    static extractConversationContext(results: SearchResult[]): {
        conversationIds: string[];
        conversationTitles: string[];
        messageRoles: string[];
    };
    /**
     * Calculate search result statistics
     */
    static calculateResultStats(results: SearchResult[]): {
        averageScore: number;
        scoreDistribution: {
            min: number;
            max: number;
            median: number;
        };
        roleDistribution: Record<string, number>;
        conversationCount: number;
    };
}
//# sourceMappingURL=index.d.ts.map