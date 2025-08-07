/**
 * Get Entity History Tool
 *
 * MCP tool to retrieve the complete history of an entity across all conversations,
 * including mentions, relationships, and evolution over time.
 */
import { z } from 'zod';
import { BaseTool, ToolContext } from './BaseTool.js';
import { MCPToolResult } from '../types/mcp.js';
import { KnowledgeGraphService } from '../knowledge-graph/KnowledgeGraphService.js';
/**
 * Schema for get entity history arguments
 */
export declare const GetEntityHistoryArgsSchema: z.ZodObject<{
    entity_name: z.ZodString;
    include_relationships: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    include_evolution: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    max_mentions: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    time_range: z.ZodOptional<z.ZodObject<{
        start: z.ZodNumber;
        end: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        start: number;
        end: number;
    }, {
        start: number;
        end: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    entity_name: string;
    include_relationships: boolean;
    include_evolution: boolean;
    max_mentions: number;
    time_range?: {
        start: number;
        end: number;
    } | undefined;
}, {
    entity_name: string;
    include_relationships?: boolean | undefined;
    include_evolution?: boolean | undefined;
    max_mentions?: number | undefined;
    time_range?: {
        start: number;
        end: number;
    } | undefined;
}>;
export type GetEntityHistoryArgs = z.infer<typeof GetEntityHistoryArgsSchema>;
/**
 * Get Entity History tool implementation
 */
export declare class GetEntityHistoryTool extends BaseTool<GetEntityHistoryArgs> {
    readonly name = "get_entity_history";
    readonly description = "Get complete history of an entity across all conversations including mentions, relationships, and evolution";
    readonly inputSchema: z.ZodObject<{
        entity_name: z.ZodString;
        include_relationships: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        include_evolution: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        max_mentions: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        time_range: z.ZodOptional<z.ZodObject<{
            start: z.ZodNumber;
            end: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            start: number;
            end: number;
        }, {
            start: number;
            end: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        entity_name: string;
        include_relationships: boolean;
        include_evolution: boolean;
        max_mentions: number;
        time_range?: {
            start: number;
            end: number;
        } | undefined;
    }, {
        entity_name: string;
        include_relationships?: boolean | undefined;
        include_evolution?: boolean | undefined;
        max_mentions?: number | undefined;
        time_range?: {
            start: number;
            end: number;
        } | undefined;
    }>;
    private knowledgeGraphService;
    constructor(knowledgeGraphService: KnowledgeGraphService);
    /**
     * Execute the tool
     */
    protected executeImpl(input: GetEntityHistoryArgs, _context: ToolContext): Promise<MCPToolResult>;
    /**
     * Handle the get entity history request
     */
    handle(args: GetEntityHistoryArgs): Promise<MCPToolResult>;
    /**
     * Get tool information for MCP registration
     */
    getToolInfo(): {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                entity_name: {
                    type: string;
                    description: string;
                    minLength: number;
                    maxLength: number;
                };
                include_relationships: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                include_evolution: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                max_mentions: {
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
            };
            required: string[];
        };
    };
}
//# sourceMappingURL=GetEntityHistoryTool.d.ts.map