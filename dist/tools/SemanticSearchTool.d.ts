/**
 * Semantic Search Tool - MCP tool for semantic similarity search
 *
 * This tool provides semantic search capabilities using local embeddings.
 * It allows users to find conceptually similar messages even when they
 * don't share exact keywords.
 */
import { z } from 'zod';
import { BaseTool, ToolContext } from './BaseTool.js';
import { EnhancedSearchEngine } from '../search/EnhancedSearchEngine.js';
declare const semanticSearchSchema: z.ZodObject<{
    query: z.ZodString;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    conversationId: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    threshold: z.ZodDefault<z.ZodNumber>;
    explainResults: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    query: string;
    limit: number;
    offset: number;
    threshold: number;
    explainResults: boolean;
    conversationId?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    query: string;
    conversationId?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    threshold?: number | undefined;
    explainResults?: boolean | undefined;
}>;
type SemanticSearchParams = z.infer<typeof semanticSearchSchema>;
export declare class SemanticSearchTool extends BaseTool<SemanticSearchParams> {
    private enhancedSearchEngine;
    constructor(enhancedSearchEngine: EnhancedSearchEngine);
    protected executeImpl(params: SemanticSearchParams, context: ToolContext): Promise<{
        success: boolean;
        results: {
            explanation?: string | undefined;
            messageId: string;
            conversationId: string;
            content: string;
            similarity: number;
            preview: string;
            conversationTitle: string | undefined;
            createdAt: number;
        }[];
        totalCount: number;
        hasMore: boolean;
        metadata: {
            searchStrategy: string;
            model: string;
            threshold: number;
            queryId: string;
            executionTime: number;
            timing: {
                queryAnalysis: number;
                semanticSearch?: number;
                ftsSearch?: number;
                resultMerging?: number;
                formatting: number;
            };
        };
        pagination: {
            offset: number;
            limit: number;
            hasMore: boolean;
        };
    }>;
    /**
     * Sanitize user query input to prevent injection attacks
     */
    private sanitizeQuery;
    /**
     * Validate and convert date parameters
     */
    private validateAndConvertDates;
    /**
     * Create a standardized preview snippet from content and highlights
     */
    private createPreview;
    /**
     * Validate that the enhanced search engine is available
     */
    validate(): Promise<{
        isValid: boolean;
        error?: string;
    }>;
    /**
     * Get usage examples for this tool
     */
    getExamples(): Array<{
        description: string;
        params: SemanticSearchParams;
    }>;
    /**
     * Get tool metadata for introspection
     */
    getMetadata(): {
        name: string;
        description: string;
        category: string;
        requiresEmbeddings: boolean;
        supportedLanguages: string[];
        averageExecutionTime: string;
        memoryUsage: string;
        accuracy: string;
        limitations: string[];
    };
    /**
     * Legacy handle method for backward compatibility with tests
     * Delegates to the execute method from BaseTool
     */
    handle(input: unknown, context?: any): Promise<import("../types/mcp.js").MCPToolResult>;
}
export {};
//# sourceMappingURL=SemanticSearchTool.d.ts.map