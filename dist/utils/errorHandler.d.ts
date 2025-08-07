/**
 * Centralized error handler for MCP responses
 *
 * This module provides centralized error handling for the MCP Persistence System,
 * converting application errors into appropriate MCP protocol responses while
 * ensuring proper logging and sanitization.
 */
import { MCPToolResult } from '../types/mcp.js';
import { ErrorResponse } from '../types/interfaces.js';
import { LogContext } from './logger.js';
/**
 * Error handling configuration
 */
export interface ErrorHandlerConfig {
    /** Whether to include stack traces in development */
    includeStackTrace: boolean;
    /** Whether to include error IDs in responses */
    includeErrorId: boolean;
    /** Whether to include detailed error information */
    includeDetails: boolean;
    /** Whether to sanitize error messages in production */
    sanitizeInProduction: boolean;
    /** Custom error message overrides */
    messageOverrides?: Record<string, string>;
}
/**
 * MCP Error handler class
 */
export declare class MCPErrorHandler {
    private config;
    private logger;
    constructor(config?: Partial<ErrorHandlerConfig>);
    /**
     * Handle an error and return an appropriate MCP response
     */
    handleError(error: unknown, context?: LogContext, toolName?: string): MCPToolResult;
    /**
     * Handle validation errors specifically
     */
    handleValidationError(error: unknown, context?: LogContext, toolName?: string): MCPToolResult;
    /**
     * Handle database errors specifically
     */
    handleDatabaseError(error: unknown, operation: string, context?: LogContext, toolName?: string): MCPToolResult;
    /**
     * Create a standardized error response for MCP protocol
     */
    private createMCPErrorResponse;
    /**
     * Create an error response object
     */
    private createErrorResponse;
    /**
     * Get the display message for an error
     */
    private getDisplayMessage;
    /**
     * Get a sanitized error message for production
     */
    private getSanitizedMessage;
    /**
     * Determine if details should be included for this error type
     */
    private shouldIncludeDetails;
    /**
     * Sanitize error details for safe display
     */
    private sanitizeDetails;
    /**
     * Log the error with appropriate level and context
     */
    private logError;
    /**
     * Check if we're in production environment
     */
    private isProduction;
    /**
     * Update error handler configuration
     */
    updateConfig(config: Partial<ErrorHandlerConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): ErrorHandlerConfig;
}
/**
 * Initialize the default error handler
 */
export declare function initializeErrorHandler(config?: Partial<ErrorHandlerConfig>): MCPErrorHandler;
/**
 * Get the default error handler instance
 */
export declare function getErrorHandler(): MCPErrorHandler;
/**
 * Convenience function to handle errors with the default handler
 */
export declare function handleError(error: unknown, context?: LogContext, toolName?: string): MCPToolResult;
/**
 * Convenience function to handle validation errors
 */
export declare function handleValidationError(error: unknown, context?: LogContext, toolName?: string): MCPToolResult;
/**
 * Convenience function to handle database errors
 */
export declare function handleDatabaseError(error: unknown, operation: string, context?: LogContext, toolName?: string): MCPToolResult;
/**
 * Error handling middleware for async operations
 */
export declare function withErrorHandling<T extends any[], R>(fn: (...args: T) => Promise<R>, toolName?: string): (...args: T) => Promise<R>;
/**
 * Wrapper for MCP tool execution with error handling
 */
export declare function executeMCPTool<T>(operation: () => Promise<T>, toolName: string, context?: LogContext): Promise<MCPToolResult>;
/**
 * Create a standardized success response
 */
export declare function createSuccessResponse<T>(data: T): MCPToolResult;
/**
 * Type guard to check if a response is an error response
 */
export declare function isErrorResponse(response: any): response is ErrorResponse;
/**
 * Extract error information from an MCP tool result
 */
export declare function extractErrorFromMCPResult(result: MCPToolResult): ErrorResponse | null;
//# sourceMappingURL=errorHandler.d.ts.map