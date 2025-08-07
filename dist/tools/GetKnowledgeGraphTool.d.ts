/**
 * Get Knowledge Graph Tool
 *
 * MCP tool to explore the knowledge graph around a specific entity,
 * finding connected entities and their relationships within N degrees.
 */
import { z } from 'zod';
import { BaseTool, ToolContext } from './BaseTool.js';
import { MCPToolResult } from '../types/mcp.js';
import { KnowledgeGraphService } from '../knowledge-graph/KnowledgeGraphService.js';
/**
 * Schema for get knowledge graph arguments
 */
export declare const GetKnowledgeGraphArgsSchema: z.ZodObject<{
    center_entity: z.ZodString;
    max_degrees: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    min_strength: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    entity_types: z.ZodOptional<z.ZodArray<z.ZodEnum<["person", "organization", "product", "concept", "location", "technical", "event", "decision"]>, "many">>;
    relationship_types: z.ZodOptional<z.ZodArray<z.ZodEnum<["works_for", "created_by", "discussed_with", "related_to", "part_of", "mentioned_with", "temporal_sequence", "cause_effect"]>, "many">>;
    include_clusters: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    include_paths: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    max_entities: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    min_strength: number;
    center_entity: string;
    max_degrees: number;
    include_clusters: boolean;
    include_paths: boolean;
    max_entities: number;
    relationship_types?: ("works_for" | "created_by" | "discussed_with" | "related_to" | "part_of" | "mentioned_with" | "temporal_sequence" | "cause_effect")[] | undefined;
    entity_types?: ("person" | "organization" | "product" | "concept" | "location" | "technical" | "event" | "decision")[] | undefined;
}, {
    center_entity: string;
    relationship_types?: ("works_for" | "created_by" | "discussed_with" | "related_to" | "part_of" | "mentioned_with" | "temporal_sequence" | "cause_effect")[] | undefined;
    min_strength?: number | undefined;
    max_degrees?: number | undefined;
    entity_types?: ("person" | "organization" | "product" | "concept" | "location" | "technical" | "event" | "decision")[] | undefined;
    include_clusters?: boolean | undefined;
    include_paths?: boolean | undefined;
    max_entities?: number | undefined;
}>;
export type GetKnowledgeGraphArgs = z.infer<typeof GetKnowledgeGraphArgsSchema>;
/**
 * Get Knowledge Graph tool implementation
 */
export declare class GetKnowledgeGraphTool extends BaseTool<GetKnowledgeGraphArgs> {
    readonly name = "get_knowledge_graph";
    readonly description = "Explore the knowledge graph around a specific entity, finding connected entities and relationships";
    readonly inputSchema: z.ZodObject<{
        center_entity: z.ZodString;
        max_degrees: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        min_strength: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        entity_types: z.ZodOptional<z.ZodArray<z.ZodEnum<["person", "organization", "product", "concept", "location", "technical", "event", "decision"]>, "many">>;
        relationship_types: z.ZodOptional<z.ZodArray<z.ZodEnum<["works_for", "created_by", "discussed_with", "related_to", "part_of", "mentioned_with", "temporal_sequence", "cause_effect"]>, "many">>;
        include_clusters: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        include_paths: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
        max_entities: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, "strip", z.ZodTypeAny, {
        min_strength: number;
        center_entity: string;
        max_degrees: number;
        include_clusters: boolean;
        include_paths: boolean;
        max_entities: number;
        relationship_types?: ("works_for" | "created_by" | "discussed_with" | "related_to" | "part_of" | "mentioned_with" | "temporal_sequence" | "cause_effect")[] | undefined;
        entity_types?: ("person" | "organization" | "product" | "concept" | "location" | "technical" | "event" | "decision")[] | undefined;
    }, {
        center_entity: string;
        relationship_types?: ("works_for" | "created_by" | "discussed_with" | "related_to" | "part_of" | "mentioned_with" | "temporal_sequence" | "cause_effect")[] | undefined;
        min_strength?: number | undefined;
        max_degrees?: number | undefined;
        entity_types?: ("person" | "organization" | "product" | "concept" | "location" | "technical" | "event" | "decision")[] | undefined;
        include_clusters?: boolean | undefined;
        include_paths?: boolean | undefined;
        max_entities?: number | undefined;
    }>;
    private knowledgeGraphService;
    constructor(knowledgeGraphService: KnowledgeGraphService);
    /**
     * Execute the tool
     */
    protected executeImpl(input: GetKnowledgeGraphArgs, _context: ToolContext): Promise<MCPToolResult>;
    /**
     * Handle the get knowledge graph request
     */
    handle(args: GetKnowledgeGraphArgs): Promise<MCPToolResult>;
    /**
     * Summarize relationship types and strengths
     */
    private summarizeRelationships;
    /**
     * Analyze entity type distribution
     */
    private analyzeEntityTypes;
    /**
     * Analyze entity paths for interesting patterns
     */
    private analyzeEntityPaths;
    /**
     * Generate insights about the knowledge graph structure
     */
    private generateInsights;
    /**
     * Get tool information for MCP registration
     */
    getToolInfo(): {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                center_entity: {
                    type: string;
                    description: string;
                    minLength: number;
                    maxLength: number;
                };
                max_degrees: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
                min_strength: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
                entity_types: {
                    type: string;
                    items: {
                        type: string;
                        enum: string[];
                    };
                    description: string;
                };
                relationship_types: {
                    type: string;
                    items: {
                        type: string;
                        enum: string[];
                    };
                    description: string;
                };
                include_clusters: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                include_paths: {
                    type: string;
                    description: string;
                    default: boolean;
                };
                max_entities: {
                    type: string;
                    description: string;
                    minimum: number;
                    maximum: number;
                    default: number;
                };
            };
            required: string[];
        };
    };
}
//# sourceMappingURL=GetKnowledgeGraphTool.d.ts.map