/**
 * Auto Tag Conversation Tool Implementation
 *
 * This tool automatically generates tags, classifications, and urgency levels
 * for conversations using the Auto Tagging Service.
 */
import { z } from 'zod';
import { BaseTool, ToolContext } from '../BaseTool.js';
import { MCPTool } from '../../types/mcp.js';
import { AutoTaggingResult } from '../../services/proactive/intelligence/AutoTaggingService.js';
import { DatabaseManager } from '../../storage/Database.js';
/**
 * Tool definition for auto_tag_conversation
 */
export declare const AutoTagConversationToolDef: MCPTool;
/**
 * Input validation schema
 */
export declare const AutoTagConversationSchema: z.ZodObject<{
    conversationId: z.ZodString;
    analysisTypes: z.ZodDefault<z.ZodArray<z.ZodEnum<["topic_tags", "activity_classification", "urgency_analysis", "project_contexts"]>, "many">>;
    config: z.ZodOptional<z.ZodObject<{
        minEntityRelevance: z.ZodDefault<z.ZodNumber>;
        maxTopicTags: z.ZodDefault<z.ZodNumber>;
        minProjectConfidence: z.ZodDefault<z.ZodNumber>;
        urgencyKeywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        minEntityRelevance: number;
        maxTopicTags: number;
        minProjectConfidence: number;
        urgencyKeywords?: string[] | undefined;
    }, {
        minEntityRelevance?: number | undefined;
        maxTopicTags?: number | undefined;
        minProjectConfidence?: number | undefined;
        urgencyKeywords?: string[] | undefined;
    }>>;
    updateConversation: z.ZodDefault<z.ZodBoolean>;
    returnAnalysis: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    conversationId: string;
    analysisTypes: ("topic_tags" | "activity_classification" | "urgency_analysis" | "project_contexts")[];
    updateConversation: boolean;
    returnAnalysis: boolean;
    config?: {
        minEntityRelevance: number;
        maxTopicTags: number;
        minProjectConfidence: number;
        urgencyKeywords?: string[] | undefined;
    } | undefined;
}, {
    conversationId: string;
    config?: {
        minEntityRelevance?: number | undefined;
        maxTopicTags?: number | undefined;
        minProjectConfidence?: number | undefined;
        urgencyKeywords?: string[] | undefined;
    } | undefined;
    analysisTypes?: ("topic_tags" | "activity_classification" | "urgency_analysis" | "project_contexts")[] | undefined;
    updateConversation?: boolean | undefined;
    returnAnalysis?: boolean | undefined;
}>;
export type AutoTagConversationInput = z.infer<typeof AutoTagConversationSchema>;
/**
 * Response interface
 */
export interface AutoTagConversationResponse {
    conversationId: string;
    taggingResult?: AutoTaggingResult;
    appliedTags: {
        topicTags: string[];
        activityType: string;
        urgencyLevel: string;
        projectNames: string[];
    };
    metadata: {
        analysisTimestamp: number;
        analysisTypes: string[];
        configUsed: {
            minEntityRelevance: number;
            maxTopicTags: number;
            minProjectConfidence: number;
            customUrgencyKeywords: number;
        };
        conversationUpdated: boolean;
    };
    summary: {
        topicTagsGenerated: number;
        activityConfidence: number;
        urgencyScore: number;
        projectContextsFound: number;
        processingTimeMs: number;
    };
}
/**
 * Dependencies required by AutoTagConversationTool
 */
export interface AutoTagConversationDependencies {
    databaseManager: DatabaseManager;
}
/**
 * Implementation of the auto_tag_conversation MCP tool
 */
export declare class AutoTagConversationTool extends BaseTool<AutoTagConversationInput, AutoTagConversationResponse> {
    private readonly autoTaggingService;
    private readonly databaseManager;
    constructor(dependencies: AutoTagConversationDependencies);
    /**
     * Execute the auto_tag_conversation tool
     */
    protected executeImpl(input: AutoTagConversationInput, context: ToolContext): Promise<AutoTagConversationResponse>;
    /**
     * Verify that the conversation exists
     */
    private verifyConversationExists;
    /**
     * Update conversation metadata with generated tags
     */
    private updateConversationMetadata;
    /**
     * Static factory method to create an AutoTagConversationTool instance
     */
    static create(dependencies: AutoTagConversationDependencies): AutoTagConversationTool;
}
//# sourceMappingURL=AutoTagConversationTool.d.ts.map