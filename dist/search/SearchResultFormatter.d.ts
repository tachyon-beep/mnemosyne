/**
 * Search Result Formatter - Handles result formatting with snippets and highlighting
 *
 * This module provides:
 * - Snippet generation with configurable length
 * - Custom highlighting with configurable markers
 * - Result ranking and sorting
 * - Text truncation with context preservation
 * - HTML/Markdown safe highlighting
 * - Multiple highlight styles support
 */
import { SearchResult } from '../types/interfaces.js';
export interface SnippetOptions {
    /** Maximum length of the snippet in characters */
    maxLength?: number;
    /** Number of characters of context around matches */
    contextLength?: number;
    /** Start marker for highlighting matches */
    highlightStart?: string;
    /** End marker for highlighting matches */
    highlightEnd?: string;
    /** Ellipsis character for truncation */
    ellipsis?: string;
    /** Whether to preserve word boundaries when truncating */
    preserveWords?: boolean;
    /** Maximum number of match highlights per snippet */
    maxHighlights?: number;
}
export interface FormattedSearchResult extends SearchResult {
    /** Enhanced snippet with better formatting */
    enhancedSnippet: string;
    /** Match count in the content */
    matchCount: number;
    /** Highlighted terms found */
    highlightedTerms: string[];
    /** Snippet start position in original content */
    snippetStart: number;
    /** Snippet end position in original content */
    snippetEnd: number;
}
/**
 * Search result formatter with advanced snippet generation
 */
export declare class SearchResultFormatter {
    private static readonly DEFAULT_SNIPPET_OPTIONS;
    /**
     * Format search results with enhanced snippets
     */
    static formatResults(results: SearchResult[], query: string, options?: SnippetOptions): FormattedSearchResult[];
    /**
     * Format a single search result
     */
    private static formatSingleResult;
    /**
     * Generate an enhanced snippet with highlighting
     */
    static generateEnhancedSnippet(content: string, searchTerms: string[], options?: SnippetOptions): {
        snippet: string;
        matchCount: number;
        highlightedTerms: string[];
        start: number;
        end: number;
    };
    /**
     * Find all matches for search terms in content
     */
    private static findAllMatches;
    /**
     * Find the best region for snippet extraction
     */
    private static findBestSnippetRegion;
    /**
     * Adjust snippet boundaries to preserve word boundaries
     */
    private static adjustBoundariesForWords;
    /**
     * Apply highlighting to snippet content
     */
    private static applyHighlighting;
    /**
     * Add ellipsis to snippet if needed
     */
    private static addEllipsis;
    /**
     * Extract search terms from query string
     */
    private static extractSearchTerms;
    /**
     * Truncate text to specified length
     */
    private static truncateText;
    /**
     * Remove highlighting from text
     */
    static removeHighlighting(text: string, highlightStart?: string, highlightEnd?: string): string;
    /**
     * Escape special regex characters
     */
    private static escapeRegex;
    /**
     * Create a plain text snippet from HTML content
     */
    static createPlainTextSnippet(htmlContent: string, searchTerms: string[], options?: SnippetOptions): string;
    /**
     * Get snippet statistics
     */
    static getSnippetStats(content: string, searchTerms: string[]): {
        totalMatches: number;
        uniqueTermsMatched: number;
        matchDensity: number;
    };
}
//# sourceMappingURL=SearchResultFormatter.d.ts.map