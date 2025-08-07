/**
 * Get Proactive Insights Tool Implementation
 *
 * This tool returns unresolved actions, recurring questions, knowledge gaps,
 * and stale commitments by leveraging the Pattern Detection Service.
 */
import { z } from 'zod';
import { BaseTool, ToolContext } from '../BaseTool.js';
import { MCPTool } from '../../types/mcp.js';
import { UnresolvedAction, RecurringQuestion, KnowledgeGap, TrackedCommitment } from '../../services/proactive/patterns/PatternDetectionService.js';
import { DatabaseManager } from '../../storage/Database.js';
/**
 * Tool definition for get_proactive_insights
 */
export declare const GetProactiveInsightsToolDef: MCPTool;
/**
 * Input validation schema
 */
export declare const GetProactiveInsightsSchema: z.ZodObject<{
    conversationId: z.ZodOptional<z.ZodString>;
    includeTypes: z.ZodDefault<z.ZodArray<z.ZodEnum<["unresolved_actions", "recurring_questions", "knowledge_gaps", "stale_commitments"]>, "many">>;
    daysSince: z.ZodDefault<z.ZodNumber>;
    minConfidence: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    includeTypes: ("unresolved_actions" | "recurring_questions" | "knowledge_gaps" | "stale_commitments")[];
    daysSince: number;
    minConfidence: number;
    conversationId?: string | undefined;
}, {
    conversationId?: string | undefined;
    limit?: number | undefined;
    includeTypes?: ("unresolved_actions" | "recurring_questions" | "knowledge_gaps" | "stale_commitments")[] | undefined;
    daysSince?: number | undefined;
    minConfidence?: number | undefined;
}>;
export type GetProactiveInsightsInput = z.infer<typeof GetProactiveInsightsSchema>;
/**
 * Response interface
 */
export interface GetProactiveInsightsResponse {
    insights: {
        unresolvedActions?: UnresolvedAction[];
        recurringQuestions?: RecurringQuestion[];
        knowledgeGaps?: KnowledgeGap[];
        staleCommitments?: TrackedCommitment[];
    };
    summary: {
        totalInsights: number;
        analysisScope: {
            conversationId?: string;
            daysSince: number;
            minConfidence: number;
        };
        detectionTimestamp: number;
    };
}
/**
 * Dependencies required by GetProactiveInsightsTool
 */
export interface GetProactiveInsightsDependencies {
    databaseManager: DatabaseManager;
}
/**
 * Implementation of the get_proactive_insights MCP tool
 */
export declare class GetProactiveInsightsTool extends BaseTool<GetProactiveInsightsInput, GetProactiveInsightsResponse> {
    private readonly patternService;
    constructor(dependencies: GetProactiveInsightsDependencies);
    /**
     * Execute the get_proactive_insights tool
     */
    protected executeImpl(input: GetProactiveInsightsInput, context: ToolContext): Promise<GetProactiveInsightsResponse>;
    /**
     * Static factory method to create a GetProactiveInsightsTool instance
     */
    static create(dependencies: GetProactiveInsightsDependencies): GetProactiveInsightsTool;
}
//# sourceMappingURL=GetProactiveInsightsTool.d.ts.map