/**
 * Export barrel for the utils module
 *
 * This file provides a central point for importing all utilities
 * from the error handling and logging system.
 */
import { type LoggerConfig, type LogContext } from './logger.js';
import { type ErrorHandlerConfig } from './errorHandler.js';
export { AppError, ValidationError, NotFoundError, ConflictError, DatabaseError, QuotaError, ProtocolError, AuthenticationError, AuthorizationError, RateLimitError, TimeoutError, ServiceUnavailableError, ConfigurationError, isAppError, isOperationalError, getErrorCategory, extractErrorInfo, normalizeError, ErrorUtils } from './errors.js';
export { Logger, PerformanceTimer, LogLevel, LOG_LEVEL_NAMES, initializeLogger, getLogger, parseLogLevel, log, type LogEntry, type LogContext, type LoggerConfig, type PerformanceMetrics } from './logger.js';
export { MCPErrorHandler, initializeErrorHandler, getErrorHandler, handleError, handleValidationError, handleDatabaseError, withErrorHandling, executeMCPTool, createSuccessResponse, isErrorResponse, extractErrorFromMCPResult, type ErrorHandlerConfig } from './errorHandler.js';
export { encrypt, decrypt, secureCompare, generateEncryptionKey, isEncryptionConfigured, isValidEncryptedData } from './crypto.js';
/**
 * Initialize all utilities with environment-based configuration
 */
export declare function initializeUtils(config?: {
    logger?: Partial<LoggerConfig>;
    errorHandler?: Partial<ErrorHandlerConfig>;
}): {
    logger: import("./logger.js").Logger;
    errorHandler: import("./errorHandler.js").MCPErrorHandler;
};
/**
 * Convenience function to create a logger with context
 */
export declare function createLogger(context: LogContext): import("./logger.js").Logger;
/**
 * Convenience function to wrap database operations with error handling
 */
export declare function wrapDatabaseOperation<T>(operation: () => Promise<T>, operationName: string, context?: LogContext): Promise<T>;
/**
 * Convenience function to wrap async operations with error handling and logging
 */
export declare function wrapOperation<T>(operation: () => Promise<T>, operationName: string, context?: LogContext): Promise<T>;
//# sourceMappingURL=index.d.ts.map