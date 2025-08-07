/**
 * Hybrid Search Tool - MCP tool for combined semantic and FTS search
 *
 * This tool provides intelligent search that combines semantic similarity
 * with traditional full-text search for optimal results. It automatically
 * balances between exact keyword matching and conceptual understanding.
 */
import { z } from 'zod';
import { BaseTool, ToolContext } from './BaseTool.js';
import { EnhancedSearchEngine } from '../search/EnhancedSearchEngine.js';
declare const hybridSearchSchema: z.ZodObject<{
    query: z.ZodString;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    conversationId: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    strategy: z.ZodDefault<z.ZodEnum<["auto", "semantic", "fts", "hybrid"]>>;
    weights: z.ZodOptional<z.ZodEffects<z.ZodObject<{
        semantic: z.ZodDefault<z.ZodNumber>;
        fts: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        semantic?: number;
        fts?: number;
    }, {
        semantic?: number;
        fts?: number;
    }>, {
        semantic?: number;
        fts?: number;
    }, {
        semantic?: number;
        fts?: number;
    }>>;
    semanticThreshold: z.ZodDefault<z.ZodNumber>;
    matchType: z.ZodDefault<z.ZodEnum<["fuzzy", "exact", "prefix"]>>;
    explainResults: z.ZodDefault<z.ZodBoolean>;
    includeMetrics: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
    query?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
    matchType?: "fuzzy" | "exact" | "prefix";
    strategy?: "hybrid" | "auto" | "semantic" | "fts";
    explainResults?: boolean;
    weights?: {
        semantic?: number;
        fts?: number;
    };
    semanticThreshold?: number;
    includeMetrics?: boolean;
}, {
    conversationId?: string;
    query?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
    matchType?: "fuzzy" | "exact" | "prefix";
    strategy?: "hybrid" | "auto" | "semantic" | "fts";
    explainResults?: boolean;
    weights?: {
        semantic?: number;
        fts?: number;
    };
    semanticThreshold?: number;
    includeMetrics?: boolean;
}>;
type HybridSearchParams = z.infer<typeof hybridSearchSchema>;
export declare class HybridSearchTool extends BaseTool<HybridSearchParams> {
    private enhancedSearchEngine;
    constructor(enhancedSearchEngine: EnhancedSearchEngine);
    protected executeImpl(params: HybridSearchParams, context: ToolContext): Promise<{
        results: {
            explanation: string;
            messageId: string;
            conversationId: string;
            content: string;
            score: number;
            matchType: "hybrid" | "semantic" | "fts";
            scores: {
                fts: number;
                semantic: number;
                combined: number;
            };
            highlights: string[];
            conversationTitle: string;
            createdAt: number;
            preview: string;
        }[];
        totalCount: number;
        hasMore: boolean;
        searchStrategy: string;
        queryAnalysis: {
            complexity: "simple" | "moderate" | "complex";
            termCount: number;
            hasOperators: boolean;
            suggestedStrategy: string;
        };
        metadata: {
            detailedTiming: {
                queryAnalysis: number;
                semanticSearch?: number;
                ftsSearch?: number;
                resultMerging?: number;
                formatting: number;
            };
            queryAnalysis: {
                termCount: number;
                hasOperators: boolean;
                complexity: "simple" | "moderate" | "complex";
                suggestedStrategy: string;
            };
            queryId: string;
            executionTime: number;
            actualStrategy: string;
            weights: {
                semantic?: number;
                fts?: number;
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
     * Create a standardized preview snippet with intelligent highlighting
     */
    private createPreview;
    /**
     * Validate search engine availability
     */
    validate(): Promise<{
        isValid: boolean;
        error?: string;
    }>;
    /**
     * Get comprehensive usage examples
     */
    getExamples(): Array<{
        description: string;
        params: HybridSearchParams;
    }>;
    /**
     * Get performance and capability information
     */
    getMetadata(): {
        name: string;
        description: string;
        category: string;
        capabilities: string[];
        averageExecutionTime: string;
        memoryUsage: string;
        accuracy: string;
        supportedSearchTypes: string[];
        limitations: string[];
        bestUseCases: string[];
    };
    /**
     * Get search strategy recommendations based on query characteristics
     */
    getStrategyRecommendation(query: string): Promise<{
        recommended: 'semantic' | 'fts' | 'hybrid';
        reasoning: string;
        confidence: number;
    }>;
    /**
     * Legacy handle method for backward compatibility with tests
     * Delegates to the execute method from BaseTool
     */
    handle(input: unknown, context?: any): Promise<import("../types/mcp.js").MCPToolResult>;
}
export {};
//# sourceMappingURL=HybridSearchTool.d.ts.map