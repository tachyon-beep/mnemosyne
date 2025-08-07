/**
 * Custom error classes and error handling utilities for the MCP Persistence System
 *
 * This module provides a comprehensive set of error classes that categorize
 * different types of errors that can occur in the system, along with utilities
 * for error classification and handling.
 */
import { z } from 'zod';
/**
 * Base error class for all application-specific errors
 */
export declare class AppError extends Error {
    readonly code: string;
    readonly statusCode: number;
    details?: any;
    readonly isOperational: boolean;
    readonly timestamp: number;
    readonly errorId: string;
    constructor(message: string, code: string, statusCode?: number, details?: any);
    private generateErrorId;
    /**
     * Convert error to a JSON-serializable object
     */
    toJSON(): Record<string, any>;
    /**
     * Get a sanitized version of the error for client responses
     */
    toSanitized(): Record<string, any>;
    private sanitizeDetails;
    private isSensitiveField;
}
/**
 * Validation errors (400) - Input validation failures
 */
export declare class ValidationError extends AppError {
    constructor(message: string, details?: z.ZodError['errors'] | any);
    static fromZodError(zodError: z.ZodError): ValidationError;
}
/**
 * Not found errors (404) - Resource not found
 */
export declare class NotFoundError extends AppError {
    constructor(resource: string, identifier?: string);
}
/**
 * Conflict errors (409) - Resource conflicts or duplicate entries
 */
export declare class ConflictError extends AppError {
    constructor(message: string, details?: any);
}
/**
 * Database errors (500) - Database operation failures
 */
export declare class DatabaseError extends AppError {
    readonly originalError?: Error;
    constructor(message: string, originalError?: Error, operation?: string);
    static fromSQLiteError(error: Error, operation?: string): DatabaseError;
}
/**
 * Quota errors (429) - Resource limits exceeded
 */
export declare class QuotaError extends AppError {
    constructor(resourceType: string, limit: number, current: number, details?: any);
}
/**
 * Protocol errors (400) - MCP protocol violations
 */
export declare class ProtocolError extends AppError {
    constructor(message: string, details?: any);
}
/**
 * Authentication errors (401) - Authentication failures
 */
export declare class AuthenticationError extends AppError {
    constructor(message?: string, details?: any);
}
/**
 * Authorization errors (403) - Permission denied
 */
export declare class AuthorizationError extends AppError {
    constructor(message?: string, details?: any);
}
/**
 * Rate limit errors (429) - Too many requests
 */
export declare class RateLimitError extends AppError {
    constructor(retryAfter?: number, details?: any);
}
/**
 * Timeout errors (408) - Operation timeouts
 */
export declare class TimeoutError extends AppError {
    constructor(operation: string, timeoutMs: number, details?: any);
}
/**
 * Service unavailable errors (503) - External service failures
 */
export declare class ServiceUnavailableError extends AppError {
    constructor(service: string, details?: any);
}
/**
 * Configuration errors (500) - System configuration issues
 */
export declare class ConfigurationError extends AppError {
    constructor(message: string, details?: any);
}
/**
 * Tool execution errors (400) - MCP tool execution failures
 */
export declare class ToolError extends AppError {
    constructor(toolName: string, message: string, details?: any);
}
/**
 * Type guard to check if an error is an AppError
 */
export declare function isAppError(error: unknown): error is AppError;
/**
 * Type guard to check if an error is operational (expected)
 */
export declare function isOperationalError(error: unknown): boolean;
/**
 * Get the error category for logging and monitoring
 */
export declare function getErrorCategory(error: unknown): string;
/**
 * Extract error information for logging
 */
export declare function extractErrorInfo(error: unknown): {
    message: string;
    stack?: string;
    code?: string;
    category: string;
    statusCode?: number;
    errorId?: string;
    details?: any;
};
/**
 * Create an error from an unknown error type
 */
export declare function normalizeError(error: unknown): AppError;
/**
 * Utility functions for error handling in async operations
 */
export declare class ErrorUtils {
    /**
     * Wrap an async operation with error normalization
     */
    static wrapAsync<T>(operation: () => Promise<T>, context?: string): Promise<T>;
    /**
     * Wrap a synchronous operation with error normalization
     */
    static wrapSync<T>(operation: () => T, context?: string): T;
    /**
     * Create a database operation wrapper
     */
    static wrapDatabaseOperation<T>(operation: () => Promise<T>, operationName: string): Promise<T>;
}
//# sourceMappingURL=errors.d.ts.map