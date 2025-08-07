/**
 * SearchMessages Tool Implementation
 *
 * This tool performs full-text search through conversation history with optional filters
 * and returns message snippets with highlighted matches.
 */
import { SearchMessagesInput } from '../types/schemas.js';
import { BaseTool, ToolContext } from './BaseTool.js';
import { SearchEngine } from '../search/SearchEngine.js';
import { SearchResult, SearchOptions } from '../types/interfaces.js';
/**
 * Enhanced search result with additional metadata
 */
export interface EnhancedSearchResult extends SearchResult {
    /** Position in the result set */
    rank: number;
    /** Search terms that matched */
    matchedTerms?: string[];
    /** Context information */
    context?: {
        totalResults: number;
        searchDuration: number;
        query: string;
    };
}
/**
 * Response interface for search_messages tool
 */
export interface SearchMessagesResponse {
    /** Array of search results with highlighted snippets */
    results: EnhancedSearchResult[];
    /** Total number of matching messages */
    totalCount: number;
    /** Whether there are more results available */
    hasMore: boolean;
    /** Search execution metadata */
    metadata: {
        /** Time taken to execute the search in milliseconds */
        searchDuration: number;
        /** Processed search query */
        processedQuery: string;
        /** Search options used */
        searchOptions: SearchOptions;
        /** Number of conversations searched */
        conversationsSearched?: number;
    };
    /** Pagination information */
    pagination: {
        /** Current offset */
        offset: number;
        /** Requested limit */
        limit: number;
        /** Next page offset (if hasMore is true) */
        nextOffset?: number;
    };
}
/**
 * Dependencies required by SearchMessagesTool
 */
export interface SearchMessagesDependencies {
    searchEngine: SearchEngine;
}
/**
 * Implementation of the search_messages MCP tool
 */
export declare class SearchMessagesTool extends BaseTool<SearchMessagesInput, SearchMessagesResponse> {
    private readonly searchEngine;
    constructor(dependencies: SearchMessagesDependencies);
    /**
     * Execute the search_messages tool
     */
    protected executeImpl(input: SearchMessagesInput, _context: ToolContext): Promise<SearchMessagesResponse>;
    /**
     * Build search options from tool input
     */
    private buildSearchOptions;
    /**
     * Perform the search operation
     */
    private performSearch;
    /**
     * Enhance search results with additional metadata
     */
    private enhanceSearchResults;
    /**
     * Extract matched terms from the highlighted snippet
     */
    private extractMatchedTerms;
    /**
     * Calculate pagination information
     */
    private calculatePagination;
    /**
     * Build response metadata
     */
    private buildResponseMetadata;
    /**
     * Estimate total count of matching results
     * Note: This is an approximation since we don't run a separate count query
     */
    private estimateTotalCount;
    /**
     * Validate query for SQL injection and other dangerous patterns
     */
    private validateQuerySecurity;
    /**
     * Validate offset for security (prevent excessive values)
     */
    private validateOffsetSecurity;
    /**
     * Static factory method to create a SearchMessagesTool instance
     */
    static create(dependencies: SearchMessagesDependencies): SearchMessagesTool;
}
//# sourceMappingURL=SearchMessagesTool.d.ts.map