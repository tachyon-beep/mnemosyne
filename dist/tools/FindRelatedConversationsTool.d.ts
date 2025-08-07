/**
 * Find Related Conversations Tool
 *
 * MCP tool to find conversations related to specific entities based on
 * knowledge graph relationships and entity co-occurrences.
 */
import { z } from 'zod';
import { BaseTool, ToolContext } from './BaseTool.js';
import { MCPToolResult } from '../types/mcp.js';
import { KnowledgeGraphService } from '../knowledge-graph/KnowledgeGraphService.js';
/**
 * Schema for find related conversations arguments
 */
export declare const FindRelatedConversationsArgsSchema: z.ZodObject<{
    entities: z.ZodArray<z.ZodString, "many">;
    relationship_types: z.ZodOptional<z.ZodArray<z.ZodEnum<["works_for", "created_by", "discussed_with", "related_to", "part_of", "mentioned_with", "temporal_sequence", "cause_effect"]>, "many">>;
    min_strength: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    time_range: z.ZodOptional<z.ZodObject<{
        start: z.ZodNumber;
        end: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        end?: number;
        start?: number;
    }, {
        end?: number;
        start?: number;
    }>>;
    max_results: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    include_snippets: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    sort_by: z.ZodDefault<z.ZodOptional<z.ZodEnum<["relevance", "recency", "entity_count"]>>>;
}, "strip", z.ZodTypeAny, {
    entities?: string[];
    time_range?: {
        end?: number;
        start?: number;
    };
    relationship_types?: ("works_for" | "created_by" | "discussed_with" | "related_to" | "part_of" | "mentioned_with" | "temporal_sequence" | "cause_effect")[];
    min_strength?: number;
    max_results?: number;
    include_snippets?: boolean;
    sort_by?: "relevance" | "recency" | "entity_count";
}, {
    entities?: string[];
    time_range?: {
        end?: number;
        start?: number;
    };
    relationship_types?: ("works_for" | "created_by" | "discussed_with" | "related_to" | "part_of" | "mentioned_with" | "temporal_sequence" | "cause_effect")[];
    min_strength?: number;
    max_results?: number;
    include_snippets?: boolean;
    sort_by?: "relevance" | "recency" | "entity_count";
}>;
export type FindRelatedConversationsArgs = z.infer<typeof FindRelatedConversationsArgsSchema>;
/**
 * Find Related Conversations tool implementation
 */
export declare class FindRelatedConversationsTool extends BaseTool<FindRelatedConversationsArgs> {
    readonly name = "find_related_conversations";
    readonly description = "Find conversations related to specific entities using knowledge graph relationships";
    readonly inputSchema: z.ZodObject<{
        entities: z.ZodArray<z.ZodString, "many">;
        relationship_types: z.ZodOptional<z.ZodArray<z.ZodEnum<["works_for", "created_by", "discussed_with", "related_to", "part_of", "mentioned_with", "temporal_sequence", "cause_effect"]>, "many">>;
        min_strength: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        time_range: z.ZodOptional<z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            end?: number;
            start?: number;
        }, {
            end?: number;
            start?: number;
        }>>;
        max_results: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        include_snippets: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        sort_by: z.ZodDefault<z.ZodOptional<z.ZodEnum<["relevance", "recency", "entity_count"]>>>;
    }, "strip", z.ZodTypeAny, {
        entities?: string[];
        time_range?: {
            end?: number;
            start?: number;
        };
        relationship_types?: ("works_for" | "created_by" | "discussed_with" | "related_to" | "part_of" | "mentioned_with" | "temporal_sequence" | "cause_effect")[];
        min_strength?: number;
        max_results?: number;
        include_snippets?: boolean;
        sort_by?: "relevance" | "recency" | "entity_count";
    }, {
        entities?: string[];
        time_range?: {
            end?: number;
            start?: number;
        };
        relationship_types?: ("works_for" | "created_by" | "discussed_with" | "related_to" | "part_of" | "mentioned_with" | "temporal_sequence" | "cause_effect")[];
        min_strength?: number;
        max_results?: number;
        include_snippets?: boolean;
        sort_by?: "relevance" | "recency" | "entity_count";
    }>;
    private knowledgeGraphService;
    constructor(knowledgeGraphService: KnowledgeGraphService);
    /**
     * Execute the tool
     */
    protected executeImpl(input: FindRelatedConversationsArgs, _context: ToolContext): Promise<MCPToolResult>;
    /**
     * Handle the find related conversations request
     */
    handle(args: FindRelatedConversationsArgs): Promise<MCPToolResult>;
    /**
     * Basic implementation to find related conversations
     * This is a simplified version until the full service implementation is complete
     */
    private findRelatedConversationsBasic;
    /**
     * Analyze entity coverage across found conversations
     */
    private analyzeEntityCoverage;
    /**
     * Analyze relationship patterns in the results
     */
    private analyzeRelationshipPatterns;
    /**
     * Generate helpful suggestions based on the search results
     */
    private generateSuggestions;
    /**
     * Get tool information for MCP registration
     */
    getToolInfo(): {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                entities: {
                    type: string;
                    items: {
                        type: string;
                        minLength: number;
                        maxLength: number;
                    };
                    description: string;
                    minItems: number;
                    maxItems: number;
                };
                relationship_types: {
                    type: string;
                    items: {
                        type: string;
                        enum: string[];
                    };
                    description: string;
                };
                min_strength: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
                time_range: {
                    type: string;
                    description: string;
                    properties: {
                        start: {
                            type: string;
                            description: string;
                            minimum: number;
                        };
                        end: {
                            type: string;
                            description: string;
                            minimum: number;
                        };
                    };
                    required: string[];
                };
                max_results: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
                include_snippets: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                sort_by: {
                    type: string;
                    enum: string[];
                    description: string;
                    default: string;
                };
            };
            required: string[];
        };
    };
}
//# sourceMappingURL=FindRelatedConversationsTool.d.ts.map