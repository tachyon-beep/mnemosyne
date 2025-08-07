/**
 * SearchMessages Tool Implementation
 *
 * This tool performs full-text search through conversation history with optional filters
 * and returns message snippets with highlighted matches.
 */
import { SearchMessagesTool as SearchMessagesToolDef } from '../types/mcp.js';
import { SearchMessagesSchema } from '../types/schemas.js';
import { BaseTool, ValidationError, wrapDatabaseOperation } from './BaseTool.js';
/**
 * Implementation of the search_messages MCP tool
 */
export class SearchMessagesTool extends BaseTool {
    searchEngine;
    constructor(dependencies) {
        super(SearchMessagesToolDef, SearchMessagesSchema);
        this.searchEngine = dependencies.searchEngine;
    }
    /**
     * Execute the search_messages tool
     */
    async executeImpl(input, _context) {
        const startTime = Date.now();
        // Step 1: Security validation
        this.validateQuerySecurity(input.query);
        this.validateOffsetSecurity(input.offset ?? 0);
        // Step 2: Validate and normalize search parameters
        const searchOptions = this.buildSearchOptions(input);
        // Step 3: Execute the search
        const searchResults = await this.performSearch(searchOptions);
        // Step 4: Enhance results with additional metadata
        const enhancedResults = this.enhanceSearchResults(searchResults, input.query, startTime);
        // Step 5: Calculate pagination information
        const pagination = this.calculatePagination(input, enhancedResults.length);
        // Step 6: Build response metadata
        const searchDuration = Date.now() - startTime;
        const metadata = this.buildResponseMetadata(searchOptions, searchDuration, searchResults);
        return {
            results: enhancedResults,
            totalCount: this.estimateTotalCount(searchResults, input),
            hasMore: enhancedResults.length === (input.limit ?? 20) && searchResults.length >= (input.limit ?? 20),
            metadata,
            pagination
        };
    }
    /**
     * Build search options from tool input
     */
    buildSearchOptions(input) {
        // Validate date range if provided
        if (input.startDate && input.endDate) {
            const start = new Date(input.startDate);
            const end = new Date(input.endDate);
            if (start > end) {
                throw new ValidationError('Start date must be before end date');
            }
        }
        return {
            query: input.query.trim(),
            conversationId: input.conversationId,
            limit: input.limit ?? 20,
            offset: input.offset ?? 0,
            startDate: input.startDate,
            endDate: input.endDate,
            matchType: input.matchType ?? 'fuzzy',
            highlightStart: input.highlightStart ?? '<mark>',
            highlightEnd: input.highlightEnd ?? '</mark>'
        };
    }
    /**
     * Perform the search operation
     */
    async performSearch(options) {
        return wrapDatabaseOperation(async () => {
            // Validate query is not empty after trimming
            if (options.query.length === 0) {
                throw new ValidationError('Search query cannot be empty');
            }
            // Validate query length
            if (options.query.length > 1000) {
                throw new ValidationError('Search query is too long (maximum 1000 characters)');
            }
            const searchResult = await this.searchEngine.search(options);
            return searchResult.results.data.map(formattedResult => ({
                message: formattedResult.message,
                score: formattedResult.score,
                snippet: formattedResult.snippet,
                conversationTitle: formattedResult.conversationTitle
            }));
        }, 'Failed to execute search query');
    }
    /**
     * Enhance search results with additional metadata
     */
    enhanceSearchResults(results, originalQuery, startTime) {
        return results.map((result, index) => ({
            ...result,
            rank: index + 1,
            matchedTerms: this.extractMatchedTerms(result.snippet, originalQuery),
            context: {
                totalResults: results.length,
                searchDuration: Date.now() - startTime,
                query: originalQuery
            }
        }));
    }
    /**
     * Extract matched terms from the highlighted snippet
     */
    extractMatchedTerms(snippet, query) {
        const terms = new Set();
        // Extract terms from the query
        const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
        // Look for these terms in the snippet (case insensitive)
        const lowerSnippet = snippet.toLowerCase();
        queryTerms.forEach(term => {
            if (lowerSnippet.includes(term)) {
                terms.add(term);
            }
        });
        return Array.from(terms);
    }
    /**
     * Calculate pagination information
     */
    calculatePagination(input, resultCount) {
        const offset = input.offset ?? 0;
        const limit = input.limit ?? 20;
        return {
            offset,
            limit,
            nextOffset: resultCount === limit ? offset + limit : undefined
        };
    }
    /**
     * Build response metadata
     */
    buildResponseMetadata(searchOptions, searchDuration, results) {
        // Count unique conversations in results
        const conversationIds = new Set(results.map(r => r.message.conversationId));
        return {
            searchDuration,
            processedQuery: searchOptions.query,
            searchOptions,
            conversationsSearched: conversationIds.size
        };
    }
    /**
     * Estimate total count of matching results
     * Note: This is an approximation since we don't run a separate count query
     */
    estimateTotalCount(results, input) {
        const offset = input.offset ?? 0;
        const limit = input.limit ?? 20;
        // If we got fewer results than the limit, this is the total
        if (results.length < limit) {
            return offset + results.length;
        }
        // Otherwise, we estimate there might be more
        // In a real implementation, you might want to run a separate count query
        return offset + results.length + 1; // +1 indicates "at least this many"
    }
    /**
     * Validate query for SQL injection and other dangerous patterns
     */
    validateQuerySecurity(query) {
        // Check for SQL injection patterns - focus on actual injection syntax
        const dangerousPatterns = [
            /;\s*(drop|delete|update|insert|create|alter|truncate|replace)\s+/i, // SQL commands after semicolon
            /\bunion\s+select\b/i,
            /;\s*(--)|(\/\*)/i,
            /"?\s*or\s+\d+\s*=\s*\d+/i,
            /'\s*or\s+\d+\s*=\s*\d+/i,
            /\b(exec|execute|sp_|xp_)\b/i,
            /'\s*;\s*(drop|delete|update|insert)/i, // SQL commands after quote and semicolon
            /"\s*;\s*(drop|delete|update|insert)/i // SQL commands after double quote and semicolon
        ];
        for (const pattern of dangerousPatterns) {
            if (pattern.test(query)) {
                throw new ValidationError('Query contains dangerous patterns and cannot be executed');
            }
        }
    }
    /**
     * Validate offset for security (prevent excessive values)
     */
    validateOffsetSecurity(offset) {
        if (offset > 10000) {
            throw new ValidationError('Offset cannot exceed 10,000 for security reasons');
        }
    }
    /**
     * Static factory method to create a SearchMessagesTool instance
     */
    static create(dependencies) {
        return new SearchMessagesTool(dependencies);
    }
}
//# sourceMappingURL=SearchMessagesTool.js.map