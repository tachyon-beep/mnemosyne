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
// Core search engine
export { SearchEngine } from './SearchEngine.js';
// Query parsing
export { QueryParser } from './QueryParser.js';
// Result formatting
export { SearchResultFormatter } from './SearchResultFormatter.js';
import { SearchEngine } from './SearchEngine.js';
export function createSearchEngine(messageRepository, options) {
    return new SearchEngine(messageRepository, options);
}
/**
 * Default search engine configuration
 */
export const DEFAULT_SEARCH_CONFIG = {
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
    minScoreThreshold: 0.01
};
/**
 * Common search presets for different use cases
 */
export const SEARCH_PRESETS = {
    /**
     * Fast search with minimal formatting for quick lookups
     */
    FAST: {
        defaultLimit: 10,
        maxLimit: 50,
        enableEnhancedFormatting: false,
        snippetOptions: {
            maxLength: 100,
            contextLength: 25,
            highlightStart: '<mark>',
            highlightEnd: '</mark>',
            ellipsis: '...',
            preserveWords: false,
            maxHighlights: 5
        }
    },
    /**
     * Detailed search with rich formatting for user interfaces
     */
    DETAILED: {
        defaultLimit: 20,
        maxLimit: 100,
        enableEnhancedFormatting: true,
        snippetOptions: {
            maxLength: 300,
            contextLength: 75,
            highlightStart: '<mark>',
            highlightEnd: '</mark>',
            ellipsis: '...',
            preserveWords: true,
            maxHighlights: 15
        }
    },
    /**
     * Analytics search for gathering insights and statistics
     */
    ANALYTICS: {
        defaultLimit: 100,
        maxLimit: 1000,
        enableEnhancedFormatting: false,
        minScoreThreshold: 0.001,
        snippetOptions: {
            maxLength: 50,
            contextLength: 10,
            highlightStart: '',
            highlightEnd: '',
            ellipsis: '...',
            preserveWords: false,
            maxHighlights: 3
        }
    }
};
/**
 * Utility functions for common search operations
 */
export class SearchUtils {
    /**
     * Create a search options object with sensible defaults
     */
    static createSearchOptions(query, overrides) {
        return {
            query,
            limit: 20,
            offset: 0,
            matchType: 'fuzzy',
            highlightStart: '<mark>',
            highlightEnd: '</mark>',
            ...overrides
        };
    }
    /**
     * Validate search parameters
     */
    static validateSearchParams(params) {
        const errors = [];
        if (!params.query || typeof params.query !== 'string' || params.query.trim().length === 0) {
            errors.push('Query must be a non-empty string');
        }
        if (params.limit !== undefined && (params.limit < 1 || params.limit > 1000)) {
            errors.push('Limit must be between 1 and 1000');
        }
        if (params.offset !== undefined && params.offset < 0) {
            errors.push('Offset must be non-negative');
        }
        if (params.startDate) {
            const startDate = new Date(params.startDate);
            if (isNaN(startDate.getTime())) {
                errors.push('Start date must be a valid ISO 8601 date string');
            }
        }
        if (params.endDate) {
            const endDate = new Date(params.endDate);
            if (isNaN(endDate.getTime())) {
                errors.push('End date must be a valid ISO 8601 date string');
            }
        }
        if (params.startDate && params.endDate) {
            const start = new Date(params.startDate);
            const end = new Date(params.endDate);
            if (start > end) {
                errors.push('Start date must be before end date');
            }
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    /**
     * Sanitize user input for safe logging
     */
    static sanitizeForLogging(input) {
        // Remove or mask potentially sensitive patterns
        return input
            .replace(/[^\w\s\-_.]/g, '*') // Replace special chars with *
            .substring(0, 100); // Limit length
    }
    /**
     * Extract conversation context from search results
     */
    static extractConversationContext(results) {
        const conversationIds = new Set();
        const conversationTitles = new Set();
        const messageRoles = new Set();
        results.forEach(result => {
            conversationIds.add(result.message.conversationId);
            if (result.conversationTitle) {
                conversationTitles.add(result.conversationTitle);
            }
            messageRoles.add(result.message.role);
        });
        return {
            conversationIds: Array.from(conversationIds),
            conversationTitles: Array.from(conversationTitles),
            messageRoles: Array.from(messageRoles)
        };
    }
    /**
     * Calculate search result statistics
     */
    static calculateResultStats(results) {
        if (results.length === 0) {
            return {
                averageScore: 0,
                scoreDistribution: { min: 0, max: 0, median: 0 },
                roleDistribution: {},
                conversationCount: 0
            };
        }
        const scores = results.map(r => r.score).sort((a, b) => a - b);
        const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const median = scores[Math.floor(scores.length / 2)];
        const roleDistribution = {};
        const conversationIds = new Set();
        results.forEach(result => {
            roleDistribution[result.message.role] = (roleDistribution[result.message.role] || 0) + 1;
            conversationIds.add(result.message.conversationId);
        });
        return {
            averageScore,
            scoreDistribution: {
                min: scores[0],
                max: scores[scores.length - 1],
                median
            },
            roleDistribution,
            conversationCount: conversationIds.size
        };
    }
}
//# sourceMappingURL=index.js.map