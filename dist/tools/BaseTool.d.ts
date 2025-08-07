/**
 * Abstract base class for all MCP Tools in the persistence system
 *
 * This class provides common functionality for tool validation, error handling,
 * and response formatting. All concrete tool implementations must extend this class.
 */
import { z } from 'zod';
import { MCPTool, MCPToolResult } from '../types/mcp.js';
/**
 * Tool execution context passed to all tools
 */
export interface ToolContext {
    /** Unique request ID for tracing */
    requestId: string;
    /** Timestamp when the tool execution started */
    timestamp: number;
    /** Additional context data */
    metadata?: Record<string, any>;
}
/**
 * Base class for all MCP tools providing common functionality
 */
export declare abstract class BaseTool<TInput = any, TOutput = any> {
    protected readonly tool: MCPTool;
    protected readonly inputSchema: z.ZodSchema<any>;
    constructor(tool: MCPTool, inputSchema: z.ZodSchema<any>);
    /**
     * Get the tool definition for MCP protocol
     */
    getTool(): MCPTool;
    /**
     * Get the tool name
     */
    getName(): string;
    /**
     * Get the tool description
     */
    getDescription(): string;
    /**
     * Execute the tool with the given input and context
     */
    execute(input: unknown, context: ToolContext): Promise<MCPToolResult>;
    /**
     * Validate input using the tool's Zod schema
     */
    validateInput(input: unknown): TInput;
    /**
     * Abstract method that concrete tools must implement
     */
    protected abstract executeImpl(input: TInput, context: ToolContext): Promise<TOutput>;
    /**
     * Format a successful response for MCP protocol
     */
    protected formatSuccessResponse(data: TOutput): MCPToolResult;
    /**
     * Format an error response for MCP protocol
     */
    protected formatErrorResponse(error: unknown, _context: ToolContext): MCPToolResult;
    /**
     * Create a tool context for execution
     */
    static createContext(overrides?: Partial<ToolContext>): ToolContext;
    /**
     * Utility method to safely extract string from unknown input
     */
    protected safeString(value: unknown, fieldName: string): string;
    /**
     * Utility method to safely extract number from unknown input
     */
    protected safeNumber(value: unknown, fieldName: string): number;
    /**
     * Utility method to safely extract boolean from unknown input
     */
    protected safeBoolean(value: unknown, fieldName: string): boolean;
}
/**
 * Custom error classes for better error handling
 */
export declare class ValidationError extends Error {
    details?: any;
    constructor(message: string, details?: any);
}
export declare class NotFoundError extends Error {
    constructor(message: string);
}
export declare class ConflictError extends Error {
    constructor(message: string);
}
export declare class DatabaseError extends Error {
    originalError?: Error;
    constructor(message: string, originalError?: Error);
}
/**
 * Type guard to check if an error is a known error type
 */
export declare function isKnownError(error: unknown): error is ValidationError | NotFoundError | ConflictError | DatabaseError;
/**
 * Utility function to wrap database operations and convert errors
 */
export declare function wrapDatabaseOperation<T>(operation: () => Promise<T>, errorMessage: string): Promise<T>;
//# sourceMappingURL=BaseTool.d.ts.map