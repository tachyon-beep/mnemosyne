/**
 * Hybrid Search Tool - MCP tool for combined semantic and FTS search
 *
 * This tool provides intelligent search that combines semantic similarity
 * with traditional full-text search for optimal results. It automatically
 * balances between exact keyword matching and conceptual understanding.
 */
import { z } from 'zod';
import { BaseTool } from './BaseTool.js';
import { ToolError, extractErrorInfo } from '../utils/errors.js';
import { QueryParser } from '../search/QueryParser.js';
import { SearchUtils } from '../search/index.js';
import { HybridSearchTool as HybridSearchToolDef } from '../types/mcp.js';
const hybridSearchSchema = z.object({
    query: z.string()
        .min(1)
        .max(1000)
        .describe('Search query for hybrid matching'),
    limit: z.number()
        .min(1)
        .max(100)
        .default(20)
        .describe('Maximum results to return'),
    offset: z.number()
        .min(0)
        .default(0)
        .describe('Number of results to skip for pagination'),
    conversationId: z.string()
        .optional()
        .describe('Limit search to specific conversation'),
    startDate: z.string()
        .datetime()
        .optional()
        .describe('Filter by start date (ISO 8601 format)'),
    endDate: z.string()
        .datetime()
        .optional()
        .describe('Filter by end date (ISO 8601 format)'),
    strategy: z.enum(['auto', 'semantic', 'fts', 'hybrid'])
        .default('auto')
        .describe('Search strategy: auto-select, semantic-only, FTS-only, or hybrid'),
    weights: z.object({
        semantic: z.number().min(0).max(1).default(0.6),
        fts: z.number().min(0).max(1).default(0.4)
    }).refine(w => Math.abs(w.semantic + w.fts - 1) < 0.01, {
        message: 'Weights must sum to 1.0'
    }).optional()
        .describe('Relative weights for semantic vs FTS scores in hybrid mode'),
    semanticThreshold: z.number()
        .min(0)
        .max(1)
        .default(0.6)
        .describe('Minimum semantic similarity threshold'),
    matchType: z.enum(['fuzzy', 'exact', 'prefix'])
        .default('fuzzy')
        .describe('FTS matching type: fuzzy, exact phrases, or prefix matching'),
    explainResults: z.boolean()
        .default(false)
        .describe('Include detailed explanations for result ranking'),
    includeMetrics: z.boolean()
        .default(false)
        .describe('Include detailed performance metrics in response')
});
export class HybridSearchTool extends BaseTool {
    enhancedSearchEngine;
    constructor(enhancedSearchEngine) {
        super(HybridSearchToolDef, hybridSearchSchema);
        this.enhancedSearchEngine = enhancedSearchEngine;
    }
    async executeImpl(params, context) {
        try {
            // Sanitize query input to prevent injection attacks
            const sanitizedQuery = this.sanitizeQuery(params.query);
            // Validate and convert date parameters
            const { startDate, endDate } = this.validateAndConvertDates(params);
            // Validate weights if provided (Zod refine already checks this, but handle edge cases)
            if (params.weights) {
                const total = params.weights.semantic + params.weights.fts;
                if (Math.abs(total - 1) > 0.01) {
                    throw new ToolError('hybrid_search', 'Search weights must sum to 1.0');
                }
            }
            // Prepare search options with sanitized query
            const searchOptions = {
                query: sanitizedQuery,
                strategy: params.strategy,
                limit: params.limit,
                offset: params.offset,
                conversationId: params.conversationId,
                startDate: startDate,
                endDate: endDate,
                semanticThreshold: params.semanticThreshold,
                matchType: params.matchType,
                explainResults: params.explainResults
            };
            // Only include weights if provided
            if (params.weights) {
                searchOptions.weights = params.weights;
            }
            // Perform hybrid search
            const searchResult = await this.enhancedSearchEngine.search(searchOptions);
            // Format response data (without success wrapper - BaseTool handles that)
            const response = {
                results: searchResult.results.map(result => ({
                    messageId: result.messageId,
                    conversationId: result.conversationId,
                    content: result.content,
                    score: result.score,
                    matchType: result.matchType,
                    scores: {
                        combined: result.scores.combined,
                        ...(result.scores.semantic !== undefined && { semantic: result.scores.semantic }),
                        ...(result.scores.fts !== undefined && { fts: result.scores.fts })
                    },
                    highlights: result.highlights,
                    conversationTitle: result.conversationTitle,
                    createdAt: result.createdAt,
                    preview: this.createPreview(result.content, result.highlights),
                    ...(params.explainResults && result.explanation && { explanation: result.explanation })
                })),
                totalCount: searchResult.results.length,
                hasMore: searchResult.hasMore,
                searchStrategy: searchResult.metrics?.strategy,
                queryAnalysis: searchResult.metrics?.queryAnalysis ? {
                    complexity: searchResult.metrics.queryAnalysis.complexity,
                    termCount: searchResult.metrics.queryAnalysis.termCount,
                    hasOperators: searchResult.metrics.queryAnalysis.hasOperators,
                    suggestedStrategy: searchResult.metrics.queryAnalysis.suggestedStrategy
                } : undefined,
                metadata: {
                    queryId: searchResult.metrics?.queryId,
                    executionTime: searchResult.metrics?.totalTime,
                    actualStrategy: searchResult.metrics?.strategy,
                    weights: params.weights || { semantic: 0.6, fts: 0.4 },
                    ...(params.includeMetrics && searchResult.metrics && {
                        detailedTiming: searchResult.metrics.timing,
                        queryAnalysis: searchResult.metrics.queryAnalysis
                    })
                },
                pagination: {
                    offset: params.offset,
                    limit: params.limit,
                    hasMore: searchResult.hasMore
                }
            };
            return response;
        }
        catch (error) {
            if (error instanceof ToolError) {
                throw error;
            }
            // Log detailed error information internally
            const errorInfo = extractErrorInfo(error);
            console.error('Hybrid search error:', {
                ...errorInfo,
                requestId: context.requestId,
                query: SearchUtils.sanitizeForLogging(params.query),
                strategy: params.strategy
            });
            // Return generic error message to user
            throw new ToolError('hybrid_search', 'Search operation failed. Please try again with a different query.');
        }
    }
    /**
     * Sanitize user query input to prevent injection attacks
     */
    sanitizeQuery(query) {
        if (!query || typeof query !== 'string') {
            throw new ToolError('hybrid_search', 'Query must be a non-empty string');
        }
        // Use QueryParser for consistent sanitization based on match type
        try {
            const parsed = QueryParser.parseQuery(query, 'fuzzy'); // Default to fuzzy for sanitization
            return parsed.query; // Use sanitized query for security
        }
        catch (error) {
            // If parsing fails, apply basic sanitization
            return query
                .trim()
                .replace(/[\u0000-\u001F\u007F]/g, '') // Remove control characters
                .substring(0, 1000); // Enforce max length
        }
    }
    /**
     * Validate and convert date parameters
     */
    validateAndConvertDates(params) {
        // Zod already validates datetime format, but handle edge cases
        let startDate;
        let endDate;
        if (params.startDate) {
            const start = new Date(params.startDate);
            if (start.getFullYear() < 1900 || start.getFullYear() > 2100) {
                throw new ToolError('hybrid_search', 'Start date must be between 1900 and 2100');
            }
            startDate = start.toISOString();
        }
        if (params.endDate) {
            const end = new Date(params.endDate);
            if (end.getFullYear() < 1900 || end.getFullYear() > 2100) {
                throw new ToolError('hybrid_search', 'End date must be between 1900 and 2100');
            }
            endDate = end.toISOString();
        }
        // Check date range
        if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
            throw new ToolError('hybrid_search', 'Start date must be before end date');
        }
        return { startDate, endDate };
    }
    /**
     * Create a standardized preview snippet with intelligent highlighting
     */
    createPreview(content, highlights) {
        const maxLength = 300;
        if (highlights && highlights.length > 0) {
            // Find the best highlight - prefer longer highlights up to maxLength
            const validHighlights = highlights.filter(h => h && h.length > 10);
            if (validHighlights.length > 0) {
                // Sort by relevance: prefer highlights that are substantial but not too long
                const bestHighlight = validHighlights
                    .sort((a, b) => {
                    const aScore = a.length <= maxLength ? a.length : maxLength - (a.length - maxLength);
                    const bScore = b.length <= maxLength ? b.length : maxLength - (b.length - maxLength);
                    return bScore - aScore;
                })[0];
                if (bestHighlight.length <= maxLength) {
                    return bestHighlight;
                }
                return bestHighlight.substring(0, maxLength - 3) + '...';
            }
        }
        // Fallback to content beginning
        if (content.length <= maxLength) {
            return content;
        }
        return content.substring(0, maxLength - 3) + '...';
    }
    /**
     * Validate search engine availability
     */
    async validate() {
        try {
            // Test basic functionality
            await this.enhancedSearchEngine.search({
                query: 'test',
                strategy: 'auto',
                limit: 1
            });
            // Check if both semantic and FTS capabilities are available
            this.enhancedSearchEngine.getConfiguration();
            return { isValid: true };
        }
        catch (error) {
            // Log detailed error internally
            const errorInfo = extractErrorInfo(error);
            console.error('Hybrid search validation error:', errorInfo);
            return {
                isValid: false,
                error: 'Hybrid search service is currently unavailable'
            };
        }
    }
    /**
     * Get comprehensive usage examples
     */
    getExamples() {
        return [
            {
                description: 'Auto-strategy search for optimal results',
                params: {
                    query: 'machine learning algorithms',
                    limit: 15,
                    offset: 0,
                    matchType: 'fuzzy',
                    explainResults: false,
                    strategy: 'auto',
                    semanticThreshold: 0.6,
                    includeMetrics: false
                }
            },
            {
                description: 'Hybrid search with custom weights favoring semantic similarity',
                params: {
                    query: 'project planning and management',
                    limit: 20,
                    offset: 0,
                    matchType: 'fuzzy',
                    explainResults: true,
                    strategy: 'hybrid',
                    semanticThreshold: 0.6,
                    includeMetrics: false,
                    weights: { semantic: 0.8, fts: 0.2 }
                }
            },
            {
                description: 'Search with exact phrase matching and high semantic threshold',
                params: {
                    query: '"data science" methodology',
                    limit: 10,
                    offset: 0,
                    matchType: 'exact',
                    explainResults: false,
                    strategy: 'hybrid',
                    semanticThreshold: 0.8,
                    includeMetrics: false
                }
            },
            {
                description: 'Recent discussions with detailed performance metrics',
                params: {
                    query: 'code review best practices',
                    limit: 25,
                    offset: 0,
                    matchType: 'fuzzy',
                    explainResults: true,
                    strategy: 'auto',
                    semanticThreshold: 0.6,
                    includeMetrics: true,
                    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // Last 30 days
                }
            },
            {
                description: 'Conversation-specific search with prefix matching',
                params: {
                    query: 'deploy',
                    limit: 10,
                    offset: 0,
                    matchType: 'prefix',
                    explainResults: false,
                    strategy: 'hybrid',
                    semanticThreshold: 0.6,
                    includeMetrics: false,
                    conversationId: 'conv-456'
                }
            },
            {
                description: 'FTS-only search for exact keyword matching',
                params: {
                    query: 'API endpoint configuration',
                    limit: 15,
                    offset: 0,
                    matchType: 'fuzzy',
                    explainResults: false,
                    strategy: 'fts',
                    semanticThreshold: 0.6,
                    includeMetrics: false
                }
            }
        ];
    }
    /**
     * Get performance and capability information
     */
    getMetadata() {
        return {
            name: this.getName(),
            description: this.getDescription(),
            category: 'search',
            capabilities: [
                'Semantic similarity search',
                'Full-text search (FTS5)',
                'Intelligent strategy selection',
                'Customizable result weighting',
                'Multi-modal result ranking',
                'Performance metrics tracking'
            ],
            averageExecutionTime: '300-800ms',
            memoryUsage: 'Medium-High (dual search engines)',
            accuracy: 'Very High (combines multiple search methods)',
            supportedSearchTypes: [
                'Conceptual similarity',
                'Exact keyword matching',
                'Fuzzy text matching',
                'Prefix matching',
                'Phrase matching'
            ],
            limitations: [
                'Requires both FTS index and embeddings for optimal results',
                'Higher resource usage than single-method searches',
                'Complex queries may take longer to process',
                'Performance depends on database size and embedding coverage'
            ],
            bestUseCases: [
                'General purpose search with unknown query intent',
                'Finding related content across different phrasings',
                'Balancing precision and recall in search results',
                'Discovering connections between concepts',
                'Search result explanation and debugging'
            ]
        };
    }
    /**
     * Get search strategy recommendations based on query characteristics
     */
    async getStrategyRecommendation(query) {
        // Analyze query characteristics
        const terms = query.split(/\s+/).filter(term => term.length > 0);
        const hasOperators = /["()\-+*]/.test(query);
        const hasQuotes = query.includes('"');
        const isShort = terms.length <= 2;
        const isLong = terms.length > 5;
        let recommended;
        let reasoning;
        let confidence;
        if (hasQuotes || hasOperators) {
            recommended = 'fts';
            reasoning = 'Query contains operators or quoted phrases, FTS will provide more precise matching';
            confidence = 0.9;
        }
        else if (isShort && !hasOperators) {
            recommended = 'semantic';
            reasoning = 'Short conceptual query benefits from semantic similarity';
            confidence = 0.8;
        }
        else if (isLong || hasOperators) {
            recommended = 'fts';
            reasoning = 'Complex query with multiple terms works better with FTS';
            confidence = 0.7;
        }
        else {
            recommended = 'hybrid';
            reasoning = 'Balanced query benefits from combining both search methods';
            confidence = 0.8;
        }
        return { recommended, reasoning, confidence };
    }
    /**
     * Legacy handle method for backward compatibility with tests
     * Delegates to the execute method from BaseTool
     */
    async handle(input, context = {}) {
        const toolContext = context.requestId ? context : {
            requestId: context.requestId || 'test-' + Date.now(),
            timestamp: Date.now(),
            ...context
        };
        return this.execute(input, toolContext);
    }
}
//# sourceMappingURL=HybridSearchTool.js.map