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
export class AppError extends Error {
  public readonly isOperational: boolean = true;
  public readonly timestamp: number;
  public readonly errorId: string;

  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = Date.now();
    this.errorId = this.generateErrorId();
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  private generateErrorId(): string {
    return `${this.code}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Convert error to a JSON-serializable object
   */
  public toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      errorId: this.errorId,
      details: this.details,
      stack: this.stack
    };
  }

  /**
   * Get a sanitized version of the error for client responses
   */
  public toSanitized(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      errorId: this.errorId,
      timestamp: this.timestamp,
      ...(this.details && { details: this.sanitizeDetails(this.details) })
    };
  }

  private sanitizeDetails(details: any): any {
    if (typeof details === 'string') {
      return details;
    }
    if (Array.isArray(details)) {
      return details.map(item => this.sanitizeDetails(item));
    }
    if (details && typeof details === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(details)) {
        // Skip sensitive fields
        if (this.isSensitiveField(key)) {
          continue;
        }
        sanitized[key] = this.sanitizeDetails(value);
      }
      return sanitized;
    }
    return details;
  }

  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    return sensitiveFields.some(sensitive => 
      fieldName.toLowerCase().includes(sensitive.toLowerCase())
    );
  }
}

/**
 * Validation errors (400) - Input validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: z.ZodError['errors'] | any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }

  static fromZodError(zodError: z.ZodError): ValidationError {
    const message = zodError.errors.map(err => {
      const path = err.path.length > 0 ? ` at ${err.path.join('.')}` : '';
      return `${err.message}${path}`;
    }).join('; ');
    
    return new ValidationError(`Validation failed: ${message}`, zodError.errors);
  }
}

/**
 * Not found errors (404) - Resource not found
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', 404, { resource, identifier });
  }
}

/**
 * Conflict errors (409) - Resource conflicts or duplicate entries
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT_ERROR', 409, details);
  }
}

/**
 * Database errors (500) - Database operation failures
 */
export class DatabaseError extends AppError {
  constructor(
    message: string, 
    public readonly originalError?: Error,
    operation?: string
  ) {
    super(message, 'DATABASE_ERROR', 500, { operation });
    this.originalError = originalError;
  }

  static fromSQLiteError(error: Error, operation?: string): DatabaseError {
    let message = 'Database operation failed';
    
    if (error.message.includes('UNIQUE constraint failed')) {
      message = 'Resource already exists';
    } else if (error.message.includes('FOREIGN KEY constraint failed')) {
      message = 'Referenced resource not found';
    } else if (error.message.includes('database is locked')) {
      message = 'Database is temporarily unavailable';
    } else if (error.message.includes('no such table')) {
      message = 'Database schema not properly initialized';
    }

    return new DatabaseError(message, error, operation);
  }
}

/**
 * Quota errors (429) - Resource limits exceeded
 */
export class QuotaError extends AppError {
  constructor(
    resourceType: string,
    limit: number,
    current: number,
    details?: any
  ) {
    const message = `${resourceType} quota exceeded: ${current}/${limit}`;
    super(message, 'QUOTA_EXCEEDED', 429, { 
      resourceType, 
      limit, 
      current, 
      ...details 
    });
  }
}

/**
 * Protocol errors (400) - MCP protocol violations
 */
export class ProtocolError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'PROTOCOL_ERROR', 400, details);
  }
}

/**
 * Authentication errors (401) - Authentication failures
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', details?: any) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
  }
}

/**
 * Authorization errors (403) - Permission denied
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Permission denied', details?: any) {
    super(message, 'AUTHORIZATION_ERROR', 403, details);
  }
}

/**
 * Rate limit errors (429) - Too many requests
 */
export class RateLimitError extends AppError {
  constructor(
    retryAfter?: number,
    details?: any
  ) {
    const message = retryAfter 
      ? `Rate limit exceeded. Retry after ${retryAfter} seconds`
      : 'Rate limit exceeded';
    super(message, 'RATE_LIMIT_ERROR', 429, { retryAfter, ...details });
  }
}

/**
 * Timeout errors (408) - Operation timeouts
 */
export class TimeoutError extends AppError {
  constructor(operation: string, timeoutMs: number, details?: any) {
    super(
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      'TIMEOUT_ERROR',
      408,
      { operation, timeoutMs, ...details }
    );
  }
}

/**
 * Service unavailable errors (503) - External service failures
 */
export class ServiceUnavailableError extends AppError {
  constructor(service: string, details?: any) {
    super(`Service '${service}' is currently unavailable`, 'SERVICE_UNAVAILABLE', 503, {
      service,
      ...details
    });
  }
}

/**
 * Configuration errors (500) - System configuration issues
 */
export class ConfigurationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 'CONFIGURATION_ERROR', 500, details);
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if an error is operational (expected)
 */
export function isOperationalError(error: unknown): boolean {
  return isAppError(error) && error.isOperational;
}

/**
 * Get the error category for logging and monitoring
 */
export function getErrorCategory(error: unknown): string {
  if (isAppError(error)) {
    switch (error.constructor) {
      case ValidationError:
      case ProtocolError:
        return 'client_error';
      case NotFoundError:
        return 'not_found';
      case ConflictError:
        return 'conflict';
      case AuthenticationError:
      case AuthorizationError:
        return 'auth_error';
      case DatabaseError:
        return 'database_error';
      case QuotaError:
      case RateLimitError:
        return 'limit_error';
      case TimeoutError:
        return 'timeout_error';
      case ServiceUnavailableError:
        return 'service_error';
      case ConfigurationError:
        return 'config_error';
      default:
        return 'app_error';
    }
  }
  return 'system_error';
}

/**
 * Extract error information for logging
 */
export function extractErrorInfo(error: unknown): {
  message: string;
  stack?: string;
  code?: string;
  category: string;
  statusCode?: number;
  errorId?: string;
  details?: any;
} {
  if (isAppError(error)) {
    return {
      message: error.message,
      stack: error.stack,
      code: error.code,
      category: getErrorCategory(error),
      statusCode: error.statusCode,
      errorId: error.errorId,
      details: error.details
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      category: getErrorCategory(error)
    };
  }

  return {
    message: String(error),
    category: 'unknown_error'
  };
}

/**
 * Create an error from an unknown error type
 */
export function normalizeError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof z.ZodError) {
    return ValidationError.fromZodError(error);
  }

  if (error instanceof Error) {
    // Try to categorize based on error message
    const message = error.message.toLowerCase();
    
    if (message.includes('validation') || message.includes('invalid')) {
      return new ValidationError(error.message);
    }
    
    if (message.includes('not found') || message.includes('does not exist')) {
      return new NotFoundError('Resource', 'unknown');
    }
    
    if (message.includes('duplicate') || message.includes('already exists')) {
      return new ConflictError(error.message);
    }
    
    if (message.includes('timeout') || message.includes('timed out')) {
      return new TimeoutError('operation', 30000);
    }
    
    if (message.includes('database') || message.includes('sqlite')) {
      return DatabaseError.fromSQLiteError(error);
    }
    
    // Default to generic app error
    return new AppError(error.message, 'UNKNOWN_ERROR', 500);
  }

  // Handle non-Error objects
  return new AppError(
    typeof error === 'string' ? error : 'An unknown error occurred',
    'UNKNOWN_ERROR',
    500
  );
}

/**
 * Utility functions for error handling in async operations
 */
export class ErrorUtils {
  /**
   * Wrap an async operation with error normalization
   */
  static async wrapAsync<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const normalizedError = normalizeError(error);
      if (context && isAppError(normalizedError)) {
        normalizedError.details = {
          ...normalizedError.details,
          context
        };
      }
      throw normalizedError;
    }
  }

  /**
   * Wrap a synchronous operation with error normalization
   */
  static wrapSync<T>(
    operation: () => T,
    context?: string
  ): T {
    try {
      return operation();
    } catch (error) {
      const normalizedError = normalizeError(error);
      if (context && isAppError(normalizedError)) {
        normalizedError.details = {
          ...normalizedError.details,
          context
        };
      }
      throw normalizedError;
    }
  }

  /**
   * Create a database operation wrapper
   */
  static async wrapDatabaseOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Error) {
        throw DatabaseError.fromSQLiteError(error, operationName);
      }
      throw new DatabaseError(`Database operation '${operationName}' failed`, undefined, operationName);
    }
  }
}