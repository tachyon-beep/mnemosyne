/**
 * Centralized error handler for MCP responses
 * 
 * This module provides centralized error handling for the MCP Persistence System,
 * converting application errors into appropriate MCP protocol responses while
 * ensuring proper logging and sanitization.
 */

import { MCPToolResult } from '../types/mcp';
import { ErrorResponse } from '../types/interfaces';
import { 
  AppError, 
  ValidationError, 
  NotFoundError, 
  ConflictError, 
  DatabaseError,
  QuotaError,
  ProtocolError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  TimeoutError,
  ServiceUnavailableError,
  ConfigurationError,
  getErrorCategory,
  normalizeError
} from './errors';
import { getLogger, LogContext } from './logger';

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
 * Default error handler configuration
 */
const DEFAULT_CONFIG: ErrorHandlerConfig = {
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
  private config: ErrorHandlerConfig;
  private logger = getLogger();

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Handle an error and return an appropriate MCP response
   */
  public handleError(
    error: unknown,
    context?: LogContext,
    toolName?: string
  ): MCPToolResult {
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
  public handleValidationError(
    error: unknown,
    context?: LogContext,
    toolName?: string
  ): MCPToolResult {
    const validationError = error instanceof ValidationError 
      ? error 
      : new ValidationError('Validation failed', error);
    
    return this.handleError(validationError, context, toolName);
  }

  /**
   * Handle database errors specifically
   */
  public handleDatabaseError(
    error: unknown,
    operation: string,
    context?: LogContext,
    toolName?: string
  ): MCPToolResult {
    let dbError: DatabaseError;
    
    if (error instanceof DatabaseError) {
      dbError = error;
    } else if (error instanceof Error) {
      dbError = DatabaseError.fromSQLiteError(error, operation);
    } else {
      dbError = new DatabaseError(`Database operation '${operation}' failed`, undefined, operation);
    }
    
    return this.handleError(dbError, context, toolName);
  }

  /**
   * Create a standardized error response for MCP protocol
   */
  private createMCPErrorResponse(
    error: AppError,
    context?: LogContext
  ): MCPToolResult {
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
  private createErrorResponse(
    error: AppError,
    context?: LogContext
  ): ErrorResponse {
    const baseResponse: ErrorResponse = {
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
  private getDisplayMessage(error: AppError): string {
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
  private getSanitizedMessage(error: AppError): string {
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
  private shouldIncludeDetails(error: AppError): boolean {
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
  private sanitizeDetails(details: any): any {
    if (!details) return undefined;

    if (typeof details === 'string') {
      return details;
    }

    if (Array.isArray(details)) {
      return details.map(item => this.sanitizeDetails(item));
    }

    if (typeof details === 'object') {
      const sanitized: Record<string, any> = {};
      const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
      
      for (const [key, value] of Object.entries(details)) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
          sanitized[key] = '[REDACTED]';
        } else {
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
  private logError(
    error: AppError,
    context?: LogContext,
    toolName?: string
  ): void {
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
    } else if (error.statusCode >= 400) {
      // Client errors - log as warning
      this.logger.warn(error.message, metadata, logContext);
    } else {
      // Other errors - log as info
      this.logger.info(error.message, metadata, logContext);
    }
  }

  /**
   * Check if we're in production environment
   */
  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Update error handler configuration
   */
  public updateConfig(config: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): ErrorHandlerConfig {
    return { ...this.config };
  }
}

/**
 * Default error handler instance
 */
let defaultErrorHandler: MCPErrorHandler;

/**
 * Initialize the default error handler
 */
export function initializeErrorHandler(config: Partial<ErrorHandlerConfig> = {}): MCPErrorHandler {
  defaultErrorHandler = new MCPErrorHandler(config);
  return defaultErrorHandler;
}

/**
 * Get the default error handler instance
 */
export function getErrorHandler(): MCPErrorHandler {
  if (!defaultErrorHandler) {
    defaultErrorHandler = initializeErrorHandler();
  }
  return defaultErrorHandler;
}

/**
 * Convenience function to handle errors with the default handler
 */
export function handleError(
  error: unknown,
  context?: LogContext,
  toolName?: string
): MCPToolResult {
  return getErrorHandler().handleError(error, context, toolName);
}

/**
 * Convenience function to handle validation errors
 */
export function handleValidationError(
  error: unknown,
  context?: LogContext,
  toolName?: string
): MCPToolResult {
  return getErrorHandler().handleValidationError(error, context, toolName);
}

/**
 * Convenience function to handle database errors
 */
export function handleDatabaseError(
  error: unknown,
  operation: string,
  context?: LogContext,
  toolName?: string
): MCPToolResult {
  return getErrorHandler().handleDatabaseError(error, operation, context, toolName);
}

/**
 * Error handling middleware for async operations
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  toolName?: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      // Re-throw the error after logging it
      handleError(error, undefined, toolName);
      throw error;
    }
  };
}

/**
 * Wrapper for MCP tool execution with error handling
 */
export async function executeMCPTool<T>(
  operation: () => Promise<T>,
  toolName: string,
  context?: LogContext
): Promise<MCPToolResult> {
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
  } catch (error) {
    return handleError(error, context, toolName);
  }
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(data: T): MCPToolResult {
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
export function isErrorResponse(response: any): response is ErrorResponse {
  return response && 
         typeof response === 'object' && 
         response.success === false && 
         typeof response.error === 'string';
}

/**
 * Extract error information from an MCP tool result
 */
export function extractErrorFromMCPResult(result: MCPToolResult): ErrorResponse | null {
  if (!result.isError || !result.content?.[0]) {
    return null;
  }

  try {
    const content = result.content[0];
    if (content.type === 'text') {
      const parsed = JSON.parse(content.text!);
      if (isErrorResponse(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    // Ignore parsing errors
  }

  return null;
}