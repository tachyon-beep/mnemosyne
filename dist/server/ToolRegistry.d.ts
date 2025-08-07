/**
 * Tool Registry - Server-specific tool registration and management
 *
 * This class provides:
 * - Tool registration for MCP server
 * - Tool execution with error handling
 * - Tool discovery and metadata
 * - Integration with database repositories and search engine
 */
import { BaseTool, ToolContext } from '../tools/BaseTool.js';
import { ConversationRepository, MessageRepository, ProviderConfigRepository, SummaryRepository } from '../storage/repositories/index.js';
import { SearchEngine } from '../search/SearchEngine.js';
import { EnhancedSearchEngine } from '../search/EnhancedSearchEngine.js';
import { EmbeddingManager } from '../search/EmbeddingManager.js';
import { ProviderManager } from '../context/ProviderManager.js';
import { ContextAssembler } from '../context/ContextAssembler.js';
import { ToolName, MCPTool } from '../types/mcp.js';
/**
 * Dependencies required by the server tool registry
 */
export interface ToolRegistryDependencies {
    conversationRepository: ConversationRepository;
    messageRepository: MessageRepository;
    searchEngine: SearchEngine;
    enhancedSearchEngine?: EnhancedSearchEngine;
    providerManager?: ProviderManager;
    providerConfigRepository?: ProviderConfigRepository;
    summaryRepository?: SummaryRepository;
    embeddingManager?: EmbeddingManager;
    contextAssembler?: ContextAssembler;
    knowledgeGraphService?: any;
    databaseManager?: any;
}
/**
 * Tool execution context for server
 */
export interface ServerToolContext extends ToolContext {
    /** Request ID for tracing */
    requestId: string;
    /** Client information */
    client?: {
        name?: string;
        version?: string;
    };
}
/**
 * Tool execution result with metadata
 */
export interface ToolExecutionResult {
    success: boolean;
    result?: any;
    error?: string;
    details?: any;
    executionTime?: number;
    timestamp: number;
}
/**
 * Tool registration entry
 */
interface ToolRegistration {
    tool: BaseTool;
    definition: MCPTool;
    metadata: {
        name: ToolName;
        description: string;
        version: string;
        registeredAt: number;
    };
}
/**
 * Server-specific tool registry for MCP server
 */
export declare class ToolRegistry {
    private tools;
    private dependencies;
    private executionStats;
    private constructor();
    /**
     * Create and initialize a ToolRegistry
     */
    static create(dependencies: ToolRegistryDependencies): Promise<ToolRegistry>;
    /**
     * Initialize all available tools
     */
    private initializeTools;
    /**
     * Register a tool with the registry
     */
    private registerTool;
    /**
     * Get a tool by name
     */
    getTool(name: ToolName): BaseTool | undefined;
    /**
     * Get all registered tools
     */
    getAllTools(): BaseTool[];
    /**
     * Get all tool names
     */
    getToolNames(): ToolName[];
    /**
     * Check if a tool is registered
     */
    hasTool(name: ToolName): boolean;
    /**
     * Get tool definitions for MCP protocol
     */
    getToolDefinitions(): MCPTool[];
    /**
     * Get tool definition by name
     */
    getToolDefinition(name: ToolName): MCPTool | undefined;
    /**
     * Execute a tool with enhanced error handling and metrics
     */
    executeTool(name: ToolName, input: unknown, context?: Partial<ServerToolContext>): Promise<ToolExecutionResult>;
    /**
     * Validate tool input using the tool's schema
     */
    validateToolInput(name: ToolName, input: unknown): {
        valid: boolean;
        error?: string;
        validatedInput?: any;
    };
    /**
     * Get tool execution statistics
     */
    getToolStatistics(): Record<ToolName, {
        calls: number;
        errors: number;
        totalTime: number;
        avgTime: number;
    }>;
    /**
     * Get registry metadata
     */
    getRegistryInfo(): {
        totalTools: number;
        tools: Array<{
            name: ToolName;
            description: string;
            version: string;
            registeredAt: number;
        }>;
        statistics: Record<ToolName, {
            calls: number;
            errors: number;
            totalTime: number;
            avgTime: number;
        }>;
    };
    /**
     * Reset execution statistics
     */
    resetStatistics(): void;
    /**
     * Get tool by name with detailed information
     */
    getToolDetails(name: ToolName): {
        tool: BaseTool;
        definition: MCPTool;
        metadata: ToolRegistration['metadata'];
        statistics: {
            calls: number;
            errors: number;
            totalTime: number;
            avgTime: number;
        };
    } | undefined;
    /**
     * Health check for all tools
     */
    healthCheck(): Promise<{
        healthy: boolean;
        tools: Record<ToolName, {
            status: 'ok' | 'error';
            error?: string;
        }>;
    }>;
}
/**
 * Factory function to create a tool registry
 */
export declare function createToolRegistry(dependencies: ToolRegistryDependencies): Promise<ToolRegistry>;
/**
 * Type guards and utilities
 */
export declare function isValidToolName(name: string): name is ToolName;
/**
 * Helper to create server tool context
 */
export declare function createServerToolContext(requestId?: string, client?: {
    name?: string;
    version?: string;
}): ServerToolContext;
export {};
//# sourceMappingURL=ToolRegistry.d.ts.map