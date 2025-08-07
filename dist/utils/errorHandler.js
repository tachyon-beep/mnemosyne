/**
 * Centralized error handler for MCP responses
 *
 * This module provides centralized error handling for the MCP Persistence System,
 * converting application errors into appropriate MCP protocol responses while
 * ensuring proper logging and sanitization.
 */
import { ValidationError, NotFoundError, ConflictError, DatabaseError, QuotaError, ProtocolError, AuthenticationError, AuthorizationError, RateLimitError, TimeoutError, ServiceUnavailableError, ConfigurationError, getErrorCategory, normalizeError } from './errors.js';
import { getLogger } from './logger.js';
/**
 * Default error handler configuration
 */
const DEFAULT_CONFIG = {
    includeStackTrace: process.env.NODE_ENV !== 'production',
    includeErrorId: true,
    includeDetails: process.env.NODE_ENV !== 'production',
    sanitizeInProduction: process.env.NODE_ENV === 'production',
    messageOverrides: {
        'VALIDATION_ERROR': 'The request contains invalid parameters',
        'DATABASE_ERROR': 'A database error occurred while processing your request',
        'TIMEOUT_ERROR': 'The operation timed out',
        'SERVICE_UNAVAILABLE': 'The service is temporarily unavailable'
    }
};
/**
 * MCP Error handler class
 */
export class MCPErrorHandler {
    config;
    logger = getLogger();
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Handle an error and return an appropriate MCP response
     */
    handleError(error, context, toolName) {
        // Normalize the error to ensure it's an AppError
        const normalizedError = normalizeError(error);
        // Log the error with appropriate level and context
        this.logError(normalizedError, context, toolName);
        // Create the MCP error response
        return this.createMCPErrorResponse(normalizedError, context);
    }
    /**
     * Handle validation errors specifically
     */
    handleValidationError(error, context, toolName) {
        const validationError = error instanceof ValidationError
            ? error
            : new ValidationError('Validation failed', error);
        return this.handleError(validationError, context, toolName);
    }
    /**
     * Handle database errors specifically
     */
    handleDatabaseError(error, operation, context, toolName) {
        let dbError;
        if (error instanceof DatabaseError) {
            dbError = error;
        }
        else if (error instanceof Error) {
            dbError = DatabaseError.fromSQLiteError(error, operation);
        }
        else {
            dbError = new DatabaseError(`Database operation '${operation}' failed`, undefined, operation);
        }
        return this.handleError(dbError, context, toolName);
    }
    /**
     * Create a standardized error response for MCP protocol
     */
    createMCPErrorResponse(error, context) {
        const errorResponse = this.createErrorResponse(error, context);
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify(errorResponse)
                }],
            isError: true
        };
    }
    /**
     * Create an error response object
     */
    createErrorResponse(error, context) {
        const baseResponse = {
            success: false,
            error: error.code,
            message: this.getDisplayMessage(error)
        };
        // Add error ID if configured
        if (this.config.includeErrorId) {
            baseResponse.errorId = error.errorId;
        }
        // Add timestamp
        baseResponse.timestamp = error.timestamp;
        // Add request ID from context if available
        if (context?.requestId) {
            baseResponse.requestId = context.requestId;
        }
        // Add details if configured and appropriate
        if (this.config.includeDetails && this.shouldIncludeDetails(error)) {
            baseResponse.details = this.sanitizeDetails(error.details);
        }
        // Add stack trace in development
        if (this.config.includeStackTrace && error.stack) {
            baseResponse.stack = error.stack;
        }
        return baseResponse;
    }
    /**
     * Get the display message for an error
     */
    getDisplayMessage(error) {
        // Check for custom message overrides
        if (this.config.messageOverrides?.[error.code]) {
            return this.config.messageOverrides[error.code];
        }
        // Sanitize message in production if needed
        if (this.config.sanitizeInProduction && this.isProduction()) {
            return this.getSanitizedMessage(error);
        }
        return error.message;
    }
    /**
     * Get a sanitized error message for production
     */
    getSanitizedMessage(error) {
        switch (error.constructor) {
            case ValidationError:
                return 'The request contains invalid parameters';
            case NotFoundError:
                return 'The requested resource was not found';
            case ConflictError:
                return 'The request conflicts with the current state of the resource';
            case DatabaseError:
                return 'A data storage error occurred';
            case QuotaError:
                return 'Resource quota has been exceeded';
            case ProtocolError:
                return 'Invalid request format';
            case AuthenticationError:
                return 'Authentication is required';
            case AuthorizationError:
                return 'Access to the resource is forbidden';
            case RateLimitError:
                return 'Too many requests. Please try again later';
            case TimeoutError:
                return 'The operation timed out';
            case ServiceUnavailableError:
                return 'The service is temporarily unavailable';
            case ConfigurationError:
                return 'A configuration error occurred';
            default:
                return 'An unexpected error occurred';
        }
    }
    /**
     * Determine if details should be included for this error type
     */
    shouldIncludeDetails(error) {
        // Always include details for validation errors as they help with debugging
        if (error instanceof ValidationError) {
            return true;
        }
        // Include details for client errors in development
        if (!this.isProduction() && error.statusCode < 500) {
            return true;
        }
        // Don't include details for server errors in production
        return false;
    }
    /**
     * Sanitize error details for safe display
     */
    sanitizeDetails(details) {
        if (!details)
            return undefined;
        if (typeof details === 'string') {
            return details;
        }
        if (Array.isArray(details)) {
            return details.map(item => this.sanitizeDetails(item));
        }
        if (typeof details === 'object') {
            const sanitized = {};
            const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
            for (const [key, value] of Object.entries(details)) {
                if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
                    sanitized[key] = '[REDACTED]';
                }
                else {
                    sanitized[key] = this.sanitizeDetails(value);
                }
            }
            return sanitized;
        }
        return details;
    }
    /**
     * Log the error with appropriate level and context
     */
    logError(error, context, toolName) {
        const logContext = {
            ...context,
            tool: toolName,
            errorId: error.errorId,
            errorCode: error.code,
            errorCategory: getErrorCategory(error)
        };
        const metadata = {
            statusCode: error.statusCode,
            details: error.details
        };
        // Log at appropriate level based on error type
        if (error.statusCode >= 500) {
            // Server errors - log as error
            this.logger.error(error.message, error, metadata, logContext);
        }
        else if (error.statusCode >= 400) {
            // Client errors - log as warning
            this.logger.warn(error.message, metadata, logContext);
        }
        else {
            // Other errors - log as info
            this.logger.info(error.message, metadata, logContext);
        }
    }
    /**
     * Check if we're in production environment
     */
    isProduction() {
        return process.env.NODE_ENV === 'production';
    }
    /**
     * Update error handler configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
/**
 * Default error handler instance
 */
let defaultErrorHandler;
/**
 * Initialize the default error handler
 */
export function initializeErrorHandler(config = {}) {
    defaultErrorHandler = new MCPErrorHandler(config);
    return defaultErrorHandler;
}
/**
 * Get the default error handler instance
 */
export function getErrorHandler() {
    if (!defaultErrorHandler) {
        defaultErrorHandler = initializeErrorHandler();
    }
    return defaultErrorHandler;
}
/**
 * Convenience function to handle errors with the default handler
 */
export function handleError(error, context, toolName) {
    return getErrorHandler().handleError(error, context, toolName);
}
/**
 * Convenience function to handle validation errors
 */
export function handleValidationError(error, context, toolName) {
    return getErrorHandler().handleValidationError(error, context, toolName);
}
/**
 * Convenience function to handle database errors
 */
export function handleDatabaseError(error, operation, context, toolName) {
    return getErrorHandler().handleDatabaseError(error, operation, context, toolName);
}
/**
 * Error handling middleware for async operations
 */
export function withErrorHandling(fn, toolName) {
    return async (...args) => {
        try {
            return await fn(...args);
        }
        catch (error) {
            // Re-throw the error after logging it
            handleError(error, undefined, toolName);
            throw error;
        }
    };
}
/**
 * Wrapper for MCP tool execution with error handling
 */
export async function executeMCPTool(operation, toolName, context) {
    try {
        const result = await operation();
        // Log successful execution
        getLogger().info(`Tool '${toolName}' executed successfully`, undefined, {
            ...context,
            tool: toolName,
            success: true
        });
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        data: result
                    })
                }]
        };
    }
    catch (error) {
        return handleError(error, context, toolName);
    }
}
/**
 * Create a standardized success response
 */
export function createSuccessResponse(data) {
    return {
        content: [{
                type: 'text',
                text: JSON.stringify({
                    success: true,
                    data
                })
            }]
    };
}
/**
 * Type guard to check if a response is an error response
 */
export function isErrorResponse(response) {
    return response &&
        typeof response === 'object' &&
        response.success === false &&
        typeof response.error === 'string';
}
/**
 * Extract error information from an MCP tool result
 */
export function extractErrorFromMCPResult(result) {
    if (!result.isError || !result.content?.[0]) {
        return null;
    }
    try {
        const content = result.content[0];
        if (content.type === 'text') {
            const parsed = JSON.parse(content.text);
            if (isErrorResponse(parsed)) {
                return parsed;
            }
        }
    }
    catch (error) {
        // Ignore parsing errors
    }
    return null;
}
//# sourceMappingURL=errorHandler.js.map