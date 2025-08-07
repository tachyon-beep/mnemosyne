/**
 * MCP (Model Context Protocol) related types for the persistence system
 *
 * This file contains types specific to MCP protocol implementation,
 * tool definitions, and server capabilities.
 */
import { z } from 'zod';
/**
 * MCP Tool definition structure
 */
export interface MCPTool {
    /** Name of the tool */
    name: string;
    /** Human-readable description of what the tool does */
    description: string;
    /** JSON schema for the tool's input parameters */
    inputSchema: {
        type: 'object';
        properties: Record<string, any>;
        required?: string[];
        additionalProperties?: boolean;
    };
}
/**
 * MCP Tool result content types
 */
export type MCPContentType = 'text' | 'image' | 'resource';
/**
 * MCP Tool result content item
 */
export interface MCPContent {
    /** Type of content */
    type: MCPContentType;
    /** Text content (for text type) */
    text?: string;
    /** Image data (for image type) */
    data?: string;
    /** MIME type (for image/resource types) */
    mimeType?: string;
    /** Resource URI (for resource type) */
    uri?: string;
}
/**
 * MCP Tool execution result
 */
export interface MCPToolResult {
    /** Array of content items returned by the tool */
    content: MCPContent[];
    /** Whether the tool execution was successful */
    isError?: boolean;
}
/**
 * MCP Server capabilities
 */
export interface MCPServerCapabilities {
    /** Supported tools */
    tools?: Record<string, any>;
    /** Supported resources */
    resources?: Record<string, any>;
    /** Supported prompts */
    prompts?: Record<string, any>;
    /** Experimental features */
    experimental?: Record<string, any>;
}
/**
 * MCP Server information
 */
export interface MCPServerInfo {
    /** Server name */
    name: string;
    /** Server version */
    version: string;
    /** Server capabilities */
    capabilities: MCPServerCapabilities;
    /** Additional server metadata */
    metadata?: Record<string, any>;
}
/**
 * MCP JSON-RPC request structure
 */
export interface MCPRequest {
    /** JSON-RPC version (always "2.0") */
    jsonrpc: '2.0';
    /** Unique request identifier */
    id: string | number;
    /** Method name */
    method: string;
    /** Method parameters */
    params?: any;
}
/**
 * MCP JSON-RPC response structure
 */
export interface MCPResponse {
    /** JSON-RPC version (always "2.0") */
    jsonrpc: '2.0';
    /** Request identifier */
    id: string | number;
    /** Response result (if successful) */
    result?: any;
    /** Error information (if failed) */
    error?: MCPError;
}
/**
 * MCP Error structure
 */
export interface MCPError {
    /** Error code */
    code: number;
    /** Error message */
    message: string;
    /** Additional error data */
    data?: any;
}
/**
 * Standard MCP error codes
 */
export declare enum MCPErrorCode {
    PARSE_ERROR = -32700,
    INVALID_REQUEST = -32600,
    METHOD_NOT_FOUND = -32601,
    INVALID_PARAMS = -32602,
    INTERNAL_ERROR = -32603,
    TOOL_NOT_FOUND = -32000,
    TOOL_EXECUTION_ERROR = -32001,
    RESOURCE_NOT_FOUND = -32002,
    RESOURCE_ACCESS_ERROR = -32003,
    PROMPT_NOT_FOUND = -32004,
    PROMPT_EXECUTION_ERROR = -32005
}
/**
 * Tool definition for save_message
 */
export declare const SaveMessageTool: MCPTool;
/**
 * Tool definition for search_messages
 */
export declare const SearchMessagesTool: MCPTool;
/**
 * Tool definition for get_conversation
 */
export declare const GetConversationTool: MCPTool;
/**
 * Tool definition for get_conversations
 */
export declare const GetConversationsTool: MCPTool;
/**
 * Tool definition for delete_conversation
 */
export declare const DeleteConversationTool: MCPTool;
/**
 * Tool definition for export_conversations
 */
export declare const ExportConversationsTool: MCPTool;
/**
 * Tool definition for get_database_stats
 */
export declare const GetDatabaseStatsTool: MCPTool;
/**
 * Tool definition for semantic_search
 */
export declare const SemanticSearchTool: MCPTool;
/**
 * Tool definition for hybrid_search
 */
export declare const HybridSearchTool: MCPTool;
/**
 * Tool definition for get_relevant_snippets
 */
export declare const GetRelevantSnippetsTool: MCPTool;
/**
 * Tool definition for configure_llm_provider
 */
export declare const ConfigureLLMProviderTool: MCPTool;
/**
 * Tool definition for get_progressive_detail
 */
export declare const GetProgressiveDetailTool: MCPTool;
/**
 * Tool definition for get_proactive_insights
 */
export declare const GetProactiveInsightsToolDef: MCPTool;
/**
 * Tool definition for check_for_conflicts
 */
export declare const CheckForConflictsToolDef: MCPTool;
/**
 * Tool definition for suggest_relevant_context
 */
export declare const SuggestRelevantContextToolDef: MCPTool;
/**
 * Tool definition for auto_tag_conversation
 */
export declare const AutoTagConversationToolDef: MCPTool;
/**
 * All available tools in the persistence system
 */
export declare const AllTools: MCPTool[];
/**
 * Tool name type for type safety
 */
export type ToolName = 'save_message' | 'search_messages' | 'get_conversation' | 'get_conversations' | 'delete_conversation' | 'export_conversations' | 'get_database_stats' | 'semantic_search' | 'hybrid_search' | 'get_context_summary' | 'get_relevant_snippets' | 'configure_llm_provider' | 'get_progressive_detail' | 'get_entity_history' | 'find_related_conversations' | 'get_knowledge_graph' | 'get_proactive_insights' | 'check_for_conflicts' | 'suggest_relevant_context' | 'auto_tag_conversation';
/**
 * MCP transport types
 */
export type MCPTransportType = 'stdio' | 'http' | 'websocket';
/**
 * MCP transport configuration
 */
export interface MCPTransportConfig {
    /** Type of transport to use */
    type: MCPTransportType;
    /** Additional transport-specific options */
    options?: Record<string, any>;
}
/**
 * Validation schema for MCP requests
 */
export declare const MCPRequestSchema: z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    id: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    method: z.ZodString;
    params: z.ZodOptional<z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    id: string | number;
    jsonrpc: "2.0";
    method: string;
    params?: any;
}, {
    id: string | number;
    jsonrpc: "2.0";
    method: string;
    params?: any;
}>;
/**
 * Validation schema for MCP responses
 */
export declare const MCPResponseSchema: z.ZodObject<{
    jsonrpc: z.ZodLiteral<"2.0">;
    id: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    result: z.ZodOptional<z.ZodAny>;
    error: z.ZodOptional<z.ZodObject<{
        code: z.ZodNumber;
        message: z.ZodString;
        data: z.ZodOptional<z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        code: number;
        message: string;
        data?: any;
    }, {
        code: number;
        message: string;
        data?: any;
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string | number;
    jsonrpc: "2.0";
    error?: {
        code: number;
        message: string;
        data?: any;
    } | undefined;
    result?: any;
}, {
    id: string | number;
    jsonrpc: "2.0";
    error?: {
        code: number;
        message: string;
        data?: any;
    } | undefined;
    result?: any;
}>;
export type MCPRequestType = z.infer<typeof MCPRequestSchema>;
export type MCPResponseType = z.infer<typeof MCPResponseSchema>;
//# sourceMappingURL=mcp.d.ts.map