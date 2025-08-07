/**
 * Abstract base class for all MCP Tools in the persistence system
 *
 * This class provides common functionality for tool validation, error handling,
 * and response formatting. All concrete tool implementations must extend this class.
 */
import { z } from 'zod';
/**
 * Base class for all MCP tools providing common functionality
 */
export class BaseTool {
    tool;
    inputSchema;
    constructor(tool, inputSchema) {
        this.tool = tool;
        this.inputSchema = inputSchema;
    }
    /**
     * Get the tool definition for MCP protocol
     */
    getTool() {
        return this.tool;
    }
    /**
     * Get the tool name
     */
    getName() {
        return this.tool.name;
    }
    /**
     * Get the tool description
     */
    getDescription() {
        return this.tool.description;
    }
    /**
     * Execute the tool with the given input and context
     */
    async execute(input, context) {
        try {
            // Validate input using Zod schema
            const validatedInput = this.validateInput(input);
            // Execute the tool-specific implementation
            const result = await this.executeImpl(validatedInput, context);
            // Format and return the response
            return this.formatSuccessResponse(result);
        }
        catch (error) {
            // Handle errors and format error response
            return this.formatErrorResponse(error, context);
        }
    }
    /**
     * Validate input using the tool's Zod schema
     */
    validateInput(input) {
        try {
            return this.inputSchema.parse(input);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                throw new ValidationError('Invalid input parameters', error.errors);
            }
            throw error;
        }
    }
    /**
     * Format a successful response for MCP protocol
     */
    formatSuccessResponse(data) {
        const response = {
            success: true,
            data
        };
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify(response)
                }]
        };
    }
    /**
     * Format an error response for MCP protocol
     */
    formatErrorResponse(error, _context) {
        let errorResponse;
        if (error instanceof ValidationError) {
            errorResponse = {
                success: false,
                error: 'ValidationError',
                message: error.message,
                details: error.details
            };
        }
        else if (error instanceof NotFoundError) {
            errorResponse = {
                success: false,
                error: 'NotFoundError',
                message: error.message
            };
        }
        else if (error instanceof ConflictError) {
            errorResponse = {
                success: false,
                error: 'ConflictError',
                message: error.message
            };
        }
        else if (error instanceof DatabaseError) {
            // Log the full database error but don't expose it to the user
            console.error(`Database error in ${this.tool.name}:`, error.originalError);
            errorResponse = {
                success: false,
                error: 'DatabaseError',
                message: 'A database error occurred while processing your request'
            };
        }
        else if (error instanceof Error) {
            // Log unexpected errors but don't expose internal details
            console.error(`Unexpected error in ${this.tool.name}:`, error);
            errorResponse = {
                success: false,
                error: 'InternalError',
                message: 'An internal error occurred while processing your request'
            };
        }
        else {
            // Handle non-Error objects
            console.error(`Unknown error in ${this.tool.name}:`, error);
            errorResponse = {
                success: false,
                error: 'UnknownError',
                message: 'An unknown error occurred while processing your request'
            };
        }
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify(errorResponse)
                }],
            isError: true
        };
    }
    /**
     * Create a tool context for execution
     */
    static createContext(overrides) {
        return {
            requestId: generateRequestId(),
            timestamp: Date.now(),
            ...overrides
        };
    }
    /**
     * Utility method to safely extract string from unknown input
     */
    safeString(value, fieldName) {
        if (typeof value === 'string') {
            return value;
        }
        throw new ValidationError(`Field '${fieldName}' must be a string`);
    }
    /**
     * Utility method to safely extract number from unknown input
     */
    safeNumber(value, fieldName) {
        if (typeof value === 'number' && !isNaN(value)) {
            return value;
        }
        throw new ValidationError(`Field '${fieldName}' must be a valid number`);
    }
    /**
     * Utility method to safely extract boolean from unknown input
     */
    safeBoolean(value, fieldName) {
        if (typeof value === 'boolean') {
            return value;
        }
        throw new ValidationError(`Field '${fieldName}' must be a boolean`);
    }
}
/**
 * Custom error classes for better error handling
 */
export class ValidationError extends Error {
    details;
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = 'ValidationError';
    }
}
export class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
    }
}
export class ConflictError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ConflictError';
    }
}
export class DatabaseError extends Error {
    originalError;
    constructor(message, originalError) {
        super(message);
        this.originalError = originalError;
        this.name = 'DatabaseError';
    }
}
/**
 * Generate a unique request ID for tracing
 */
function generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}
/**
 * Type guard to check if an error is a known error type
 */
export function isKnownError(error) {
    return error instanceof ValidationError ||
        error instanceof NotFoundError ||
        error instanceof ConflictError ||
        error instanceof DatabaseError;
}
/**
 * Utility function to wrap database operations and convert errors
 */
export async function wrapDatabaseOperation(operation, errorMessage) {
    try {
        return await operation();
    }
    catch (error) {
        // Preserve certain error types that have specific meaning
        if (error instanceof NotFoundError ||
            error instanceof ValidationError ||
            error instanceof ConflictError) {
            throw error;
        }
        if (error instanceof Error) {
            throw new DatabaseError(errorMessage, error);
        }
        throw new DatabaseError(errorMessage);
    }
}
//# sourceMappingURL=BaseTool.js.map