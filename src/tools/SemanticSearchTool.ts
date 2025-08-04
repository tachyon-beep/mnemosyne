/**
 * Semantic Search Tool - MCP tool for semantic similarity search
 * 
 * This tool provides semantic search capabilities using local embeddings.
 * It allows users to find conceptually similar messages even when they
 * don't share exact keywords.
 */

import { z } from 'zod';
import { BaseTool, ToolContext } from './BaseTool.js';
import { ToolError, extractErrorInfo } from '../utils/errors.js';
import { EnhancedSearchEngine } from '../search/EnhancedSearchEngine.js';
import { QueryParser } from '../search/QueryParser.js';
import { SearchUtils } from '../search/index.js';
import { SemanticSearchTool as SemanticSearchToolDef } from '../types/mcp.js';

const semanticSearchSchema = z.object({
  query: z.string()
    .min(1)
    .max(1000)
    .describe('Search query for semantic matching'),
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
  threshold: z.number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Minimum similarity threshold (0-1)'),
  explainResults: z.boolean()
    .default(false)
    .describe('Include explanations for why results were selected')
});

type SemanticSearchParams = z.infer<typeof semanticSearchSchema>;

export class SemanticSearchTool extends BaseTool<SemanticSearchParams> {
  private enhancedSearchEngine: EnhancedSearchEngine;

  constructor(enhancedSearchEngine: EnhancedSearchEngine) {
    super(SemanticSearchToolDef, semanticSearchSchema);
    this.enhancedSearchEngine = enhancedSearchEngine;
  }

  protected async executeImpl(params: SemanticSearchParams, context: ToolContext) {
    try {
      // Sanitize query input to prevent injection attacks
      const sanitizedQuery = this.sanitizeQuery(params.query);
      
      // Validate date parameters (Zod already validates format, but check for edge cases)
      const { startDate, endDate } = this.validateAndConvertDates(params);

      // Perform semantic search with sanitized query
      const searchResult = await this.enhancedSearchEngine.search({
        query: sanitizedQuery,
        strategy: 'semantic',
        limit: params.limit,
        offset: params.offset,
        conversationId: params.conversationId,
        startDate: startDate,
        endDate: endDate,
        semanticThreshold: params.threshold,
        explainResults: params.explainResults
      });

      // Results are already filtered by the search engine based on threshold
      const filteredResults = searchResult.results;

      // Format response
      const response = {
        success: true,
        results: filteredResults.map(result => ({
          messageId: result.messageId,
          conversationId: result.conversationId,
          content: result.content,
          similarity: result.scores.semantic || result.score,
          preview: this.createPreview(result.content, result.highlights),
          conversationTitle: result.conversationTitle,
          createdAt: result.createdAt,
          ...(params.explainResults && { explanation: result.explanation })
        })),
        totalCount: filteredResults.length,
        hasMore: searchResult.hasMore,
        metadata: {
          searchStrategy: 'semantic',
          model: 'all-MiniLM-L6-v2',
          threshold: params.threshold,
          queryId: searchResult.metrics?.queryId,
          executionTime: searchResult.metrics?.totalTime,
          timing: searchResult.metrics?.timing
        },
        pagination: {
          offset: params.offset,
          limit: params.limit,
          hasMore: searchResult.hasMore
        }
      };

      return response;

    } catch (error) {
      if (error instanceof ToolError) {
        throw error;
      }

      // Log detailed error information internally
      const errorInfo = extractErrorInfo(error);
      console.error('Semantic search error:', {
        ...errorInfo,
        requestId: context.requestId,
        query: SearchUtils.sanitizeForLogging(params.query)
      });
      
      // Return generic error message to user
      throw new ToolError(
        'semantic_search',
        'Search operation failed. Please try again with a different query.'
      );
    }
  }

  /**
   * Sanitize user query input to prevent injection attacks
   */
  private sanitizeQuery(query: string): string {
    if (!query || typeof query !== 'string') {
      throw new ToolError('semantic_search', 'Query must be a non-empty string');
    }

    // Use the same sanitization as QueryParser for consistency
    try {
      const parsed = QueryParser.parseQuery(query, 'fuzzy');
      return parsed.query;
    } catch (error) {
      // If parsing fails, apply basic sanitization
      return query
        .trim()
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
        .substring(0, 1000); // Enforce max length
    }
  }

  /**
   * Validate and convert date parameters
   */
  private validateAndConvertDates(params: SemanticSearchParams): {
    startDate?: string;
    endDate?: string;
  } {
    // Zod already validates datetime format, but handle edge cases
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (params.startDate) {
      const start = new Date(params.startDate);
      if (start.getFullYear() < 1900 || start.getFullYear() > 2100) {
        throw new ToolError('semantic_search', 'Start date must be between 1900 and 2100');
      }
      startDate = start.toISOString();
    }

    if (params.endDate) {
      const end = new Date(params.endDate);
      if (end.getFullYear() < 1900 || end.getFullYear() > 2100) {
        throw new ToolError('semantic_search', 'End date must be between 1900 and 2100');
      }
      endDate = end.toISOString();
    }

    // Check date range
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      throw new ToolError('semantic_search', 'Start date must be before end date');
    }

    return { startDate, endDate };
  }

  /**
   * Create a standardized preview snippet from content and highlights
   */
  private createPreview(content: string, highlights: string[]): string {
    const maxLength = 250;
    
    if (highlights && highlights.length > 0) {
      // Use the best highlight as preview
      const bestHighlight = highlights
        .filter(h => h && h.length > 10) // Filter out very short highlights
        .sort((a, b) => b.length - a.length)[0] || highlights[0];
        
      if (bestHighlight && bestHighlight.length <= maxLength) {
        return bestHighlight;
      }
      
      if (bestHighlight && bestHighlight.length > maxLength) {
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
   * Validate that the enhanced search engine is available
   */
  async validate(): Promise<{ isValid: boolean; error?: string }> {
    try {
      // Check if embedding manager is initialized
      await this.enhancedSearchEngine.getSearchMetrics({ limit: 1 });
      return { isValid: true };
    } catch (error) {
      // Log detailed error internally
      const errorInfo = extractErrorInfo(error);
      console.error('Semantic search validation error:', errorInfo);
      
      return {
        isValid: false,
        error: 'Semantic search service is currently unavailable'
      };
    }
  }

  /**
   * Get usage examples for this tool
   */
  getExamples(): Array<{ description: string; params: SemanticSearchParams }> {
    return [
      {
        description: 'Find messages about machine learning concepts',
        params: {
          query: 'neural networks and deep learning',
          limit: 10,
          offset: 0,
          threshold: 0.75,
          explainResults: false
        }
      },
      {
        description: 'Search for cooking-related discussions with explanations',
        params: {
          query: 'recipes and cooking techniques',
          limit: 15,
          offset: 0,
          threshold: 0.7,
          explainResults: true
        }
      },
      {
        description: 'Find recent messages about a specific topic',
        params: {
          query: 'project management methodologies',
          limit: 20,
          offset: 0,
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
          threshold: 0.8,
          explainResults: false
        }
      },
      {
        description: 'Semantic search within a specific conversation',
        params: {
          query: 'troubleshooting and debugging approaches',
          conversationId: 'conv-123',
          limit: 10,
          offset: 0,
          threshold: 0.6,
          explainResults: false
        }
      }
    ];
  }

  /**
   * Get tool metadata for introspection
   */
  getMetadata() {
    return {
      name: this.getName(),
      description: this.getDescription(),
      category: 'search',
      requiresEmbeddings: true,
      supportedLanguages: ['en'], // Expandable based on model capabilities
      averageExecutionTime: '200-500ms',
      memoryUsage: 'Medium (requires embedding model)',
      accuracy: 'High for conceptual similarity',
      limitations: [
        'Requires pre-generated embeddings',
        'Performance depends on text length',
        'May not work well with very short queries',
        'Limited to supported embedding model languages'
      ]
    };
  }

  /**
   * Legacy handle method for backward compatibility with tests
   * Delegates to the execute method from BaseTool
   */
  async handle(input: unknown, context: any = {}) {
    const toolContext = context.requestId ? context : {
      requestId: context.requestId || 'test-' + Date.now(),
      timestamp: Date.now(),
      ...context
    };
    return this.execute(input, toolContext);
  }
}