/**
 * Get Context Summary Tool
 *
 * MCP tool for retrieving intelligent conversation summaries with context management.
 * Supports hierarchical summarization and token budget optimization.
 */
import { BaseTool, ToolContext } from './BaseTool.js';
import { ProviderManager } from '../context/ProviderManager.js';
import { ConversationRepository, MessageRepository } from '../storage/repositories/index.js';
import { z } from 'zod';
/**
 * Input schema for get_context_summary tool
 */
declare const GetContextSummarySchema: z.ZodObject<{
    query: z.ZodString;
    conversationIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    timeRange: z.ZodOptional<z.ZodObject<{
        start: z.ZodString;
        end: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        end?: string;
        start?: string;
    }, {
        end?: string;
        start?: string;
    }>>;
    maxTokens: z.ZodDefault<z.ZodNumber>;
    level: z.ZodDefault<z.ZodEnum<["brief", "standard", "detailed"]>>;
    strategy: z.ZodOptional<z.ZodEnum<["priority", "cost-optimal", "performance", "quality"]>>;
    focusTopics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    includeMetadata: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    query?: string;
    conversationIds?: string[];
    includeMetadata?: boolean;
    maxTokens?: number;
    strategy?: "priority" | "performance" | "cost-optimal" | "quality";
    level?: "brief" | "standard" | "detailed";
    focusTopics?: string[];
    timeRange?: {
        end?: string;
        start?: string;
    };
}, {
    query?: string;
    conversationIds?: string[];
    includeMetadata?: boolean;
    maxTokens?: number;
    strategy?: "priority" | "performance" | "cost-optimal" | "quality";
    level?: "brief" | "standard" | "detailed";
    focusTopics?: string[];
    timeRange?: {
        end?: string;
        start?: string;
    };
}>;
type GetContextSummaryInput = z.infer<typeof GetContextSummarySchema>;
/**
 * Tool dependencies
 */
interface GetContextSummaryDependencies {
    providerManager: ProviderManager;
    conversationRepository: ConversationRepository;
    messageRepository: MessageRepository;
}
/**
 * Get Context Summary Tool implementation
 */
export declare class GetContextSummaryTool extends BaseTool<GetContextSummaryInput, any> {
    private providerManager;
    private conversationRepository;
    private messageRepository;
    constructor(dependencies: GetContextSummaryDependencies);
    /**
     * Execute the tool implementation
     */
    protected executeImpl(params: GetContextSummaryInput, _context: ToolContext): Promise<any>;
    /**
     * Find relevant conversations based on parameters
     */
    private findRelevantConversations;
    /**
     * Retrieve messages from conversations
     */
    private retrieveMessages;
    /**
     * Generate a basic summary without LLM
     */
    private generateFallbackSummary;
    /**
     * Extract topics from messages (basic implementation)
     */
    private extractTopics;
    /**
     * Create factory method for tool
     */
    static create(dependencies: GetContextSummaryDependencies): GetContextSummaryTool;
}
export {};
//# sourceMappingURL=GetContextSummaryTool.d.ts.map