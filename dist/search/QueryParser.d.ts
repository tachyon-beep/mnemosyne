/**
 * Query Parser - Handles FTS5 query parsing and sanitization
 *
 * This module provides:
 * - Query sanitization for FTS5 safety
 * - Support for different match types (exact, fuzzy, prefix)
 * - Special character handling
 * - Query validation and transformation
 * - Phrase search support with quotes
 * - Wildcard handling for prefix search
 */
export interface ParsedQuery {
    /** The sanitized FTS5 query string */
    query: string;
    /** Whether the query is valid */
    isValid: boolean;
    /** Original query before processing */
    original: string;
    /** Detected match type */
    matchType: 'exact' | 'fuzzy' | 'prefix';
    /** Whether the query contains special operators */
    hasOperators: boolean;
    /** Error message if query is invalid */
    error?: string;
}
/**
 * Query parser for FTS5 with proper sanitization and transformation
 */
export declare class QueryParser {
    private static readonly FTS5_SPECIAL_CHARS;
    private static readonly FTS5_OPERATORS;
    private static readonly MIN_QUERY_LENGTH;
    private static readonly MAX_QUERY_LENGTH;
    /**
     * Parse and sanitize a search query for FTS5
     */
    static parseQuery(query: string, matchType?: 'exact' | 'fuzzy' | 'prefix'): ParsedQuery;
    /**
     * Detect the intended match type from query syntax
     */
    private static detectMatchType;
    /**
     * Check if query is a quoted string
     */
    private static isQuotedString;
    /**
     * Sanitize query based on match type
     */
    private static sanitizeQuery;
    /**
     * Sanitize query for exact matching
     */
    private static sanitizeExactQuery;
    /**
     * Sanitize query for prefix matching
     */
    private static sanitizePrefixQuery;
    /**
     * Sanitize query for fuzzy matching
     */
    private static sanitizeFuzzyQuery;
    /**
     * Escape FTS5 special characters
     */
    private static escapeSpecialChars;
    /**
     * Validate that a query is safe for FTS5 execution
     */
    static validateQuery(query: string): {
        isValid: boolean;
        error?: string;
    };
    /**
     * Create a phrase search query from multiple terms
     */
    static createPhraseQuery(terms: string[]): ParsedQuery;
    /**
     * Create a prefix search query
     */
    static createPrefixQuery(term: string): ParsedQuery;
    /**
     * Create a fuzzy search query with multiple terms
     */
    static createFuzzyQuery(terms: string[]): ParsedQuery;
    /**
     * Extract individual terms from a query
     */
    static extractTerms(query: string): string[];
    /**
     * Check if a query contains only safe characters for logging
     */
    static isSafeForLogging(query: string): boolean;
}
//# sourceMappingURL=QueryParser.d.ts.map