/**
 * Suggest Relevant Context Tool Implementation
 *
 * This tool provides past conversations and insights relevant to current discussion
 * using the Context Change Detector and Knowledge Synthesizer services.
 */
import { z } from 'zod';
import { BaseTool, ToolContext } from '../BaseTool.js';
import { MCPTool } from '../../types/mcp.js';
import { ContextWindow } from '../../services/proactive/intelligence/ContextChangeDetector.js';
import { ContextSuggestion, ExpertRecommendation } from '../../services/proactive/synthesis/KnowledgeSynthesizer.js';
import { DatabaseManager } from '../../storage/Database.js';
import { EntityRepository } from '../../storage/repositories/EntityRepository.js';
import { KnowledgeGraphRepository } from '../../storage/repositories/KnowledgeGraphRepository.js';
/**
 * Tool definition for suggest_relevant_context
 */
export declare const SuggestRelevantContextToolDef: MCPTool;
/**
 * Input validation schema
 */
export declare const SuggestRelevantContextSchema: z.ZodObject<{
    currentConversationId: z.ZodOptional<z.ZodString>;
    currentEntities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    contextTypes: z.ZodDefault<z.ZodArray<z.ZodEnum<["related_conversation", "expert_insight", "similar_context", "temporal_connection", "relationship_network", "follow_up_needed", "missing_information", "contradiction_alert"]>, "many">>;
    maxHistoryAge: z.ZodDefault<z.ZodNumber>;
    minRelevanceScore: z.ZodDefault<z.ZodNumber>;
    maxTokens: z.ZodDefault<z.ZodNumber>;
    includeExperts: z.ZodDefault<z.ZodBoolean>;
    includeMessages: z.ZodDefault<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit?: number;
    includeMessages?: boolean;
    maxTokens?: number;
    currentConversationId?: string;
    currentEntities?: string[];
    contextTypes?: ("related_conversation" | "expert_insight" | "similar_context" | "temporal_connection" | "relationship_network" | "follow_up_needed" | "missing_information" | "contradiction_alert")[];
    maxHistoryAge?: number;
    minRelevanceScore?: number;
    includeExperts?: boolean;
}, {
    limit?: number;
    includeMessages?: boolean;
    maxTokens?: number;
    currentConversationId?: string;
    currentEntities?: string[];
    contextTypes?: ("related_conversation" | "expert_insight" | "similar_context" | "temporal_connection" | "relationship_network" | "follow_up_needed" | "missing_information" | "contradiction_alert")[];
    maxHistoryAge?: number;
    minRelevanceScore?: number;
    includeExperts?: boolean;
}>;
export type SuggestRelevantContextInput = z.infer<typeof SuggestRelevantContextSchema>;
/**
 * Response interface
 */
export interface SuggestRelevantContextResponse {
    suggestions: ContextSuggestion[];
    contextWindow?: ContextWindow;
    expertRecommendations?: ExpertRecommendation[];
    summary: {
        totalSuggestions: number;
        suggestionTypeBreakdown: Record<string, number>;
        relevanceScoreRange: {
            min: number;
            max: number;
            average: number;
        };
        analysisScope: {
            currentConversationId?: string;
            entityCount: number;
            maxHistoryAge: number;
            minRelevanceScore: number;
        };
        contextOptimization?: {
            estimatedTokens: number;
            contextRelevance: number;
            freshness: number;
        };
    };
    analysisTimestamp: number;
}
/**
 * Dependencies required by SuggestRelevantContextTool
 */
export interface SuggestRelevantContextDependencies {
    databaseManager: DatabaseManager;
    entityRepository: EntityRepository;
    knowledgeGraphRepository: KnowledgeGraphRepository;
}
/**
 * Implementation of the suggest_relevant_context MCP tool
 */
export declare class SuggestRelevantContextTool extends BaseTool<SuggestRelevantContextInput, SuggestRelevantContextResponse> {
    private readonly contextDetector;
    private readonly knowledgeSynthesizer;
    constructor(dependencies: SuggestRelevantContextDependencies);
    /**
     * Execute the suggest_relevant_context tool
     */
    protected executeImpl(input: SuggestRelevantContextInput, context: ToolContext): Promise<SuggestRelevantContextResponse>;
    /**
     * Resolve entity names to IDs
     */
    private resolveEntityIds;
    /**
     * Check if string is a UUID
     */
    private isUUID;
    /**
     * Calculate summary statistics
     */
    private calculateSummary;
    /**
     * Static factory method to create a SuggestRelevantContextTool instance
     */
    static create(dependencies: SuggestRelevantContextDependencies): SuggestRelevantContextTool;
}
//# sourceMappingURL=SuggestRelevantContextTool.d.ts.map