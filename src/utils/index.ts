/**
 * Export barrel for the utils module
 * 
 * This file provides a central point for importing all utilities
 * from the error handling and logging system.
 */

// Import functions we need for internal use
import { DatabaseError, normalizeError } from './errors.js';
import { getLogger, initializeLogger, type LoggerConfig, type LogContext } from './logger.js';
import { initializeErrorHandler, type ErrorHandlerConfig } from './errorHandler.js';

// Error classes and utilities
export {
  // Base error class
  AppError,
  
  // Specific error types
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
  
  // Error utilities
  isAppError,
  isOperationalError,
  getErrorCategory,
  extractErrorInfo,
  normalizeError,
  ErrorUtils
} from './errors.js';

// Logger classes and utilities
export {
  // Logger classes
  Logger,
  PerformanceTimer,
  
  // Enums and types
  LogLevel,
  LOG_LEVEL_NAMES,
  
  // Logger functions
  initializeLogger,
  getLogger,
  parseLogLevel,
  log,
  
  // Types
  type LogEntry,
  type LogContext,
  type LoggerConfig,
  type PerformanceMetrics
} from './logger.js';

// Error handler
export {
  // Error handler class
  MCPErrorHandler,
  
  // Initialization and access functions
  initializeErrorHandler,
  getErrorHandler,
  
  // Convenience functions
  handleError,
  handleValidationError,
  handleDatabaseError,
  withErrorHandling,
  executeMCPTool,
  createSuccessResponse,
  
  // Utility functions
  isErrorResponse,
  extractErrorFromMCPResult,
  
  // Types
  type ErrorHandlerConfig
} from './errorHandler.js';

// Cryptographic utilities
export {
  encrypt,
  decrypt,
  secureCompare,
  generateEncryptionKey,
  isEncryptionConfigured,
  isValidEncryptedData
} from './crypto.js';

/**
 * Initialize all utilities with environment-based configuration
 */
export function initializeUtils(config: {
  logger?: Partial<LoggerConfig>;
  errorHandler?: Partial<ErrorHandlerConfig>;
} = {}) {
  const logger = initializeLogger(config.logger);
  const errorHandler = initializeErrorHandler(config.errorHandler);
  
  // Log initialization
  logger.info('Utils module initialized', {
    logLevel: logger.getConfig().level,
    environment: process.env.NODE_ENV || 'development'
  });
  
  return {
    logger,
    errorHandler
  };
}

/**
 * Convenience function to create a logger with context
 */
export function createLogger(context: LogContext) {
  return getLogger().child(context);
}

/**
 * Convenience function to wrap database operations with error handling
 */
export async function wrapDatabaseOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: LogContext
): Promise<T> {
  const logger = getLogger();
  
  return logger.timeOperation(async () => {
    try {
      return await operation();
    } catch (error) {
      logger.error(`Database operation '${operationName}' failed`, error, undefined, context);
      
      if (error instanceof Error) {
        throw DatabaseError.fromSQLiteError(error, operationName);
      }
      
      throw new DatabaseError(`Database operation '${operationName}' failed`, undefined, operationName);
    }
  }, operationName, context);
}

/**
 * Convenience function to wrap async operations with error handling and logging
 */
export async function wrapOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: LogContext
): Promise<T> {
  const logger = getLogger();
  
  return logger.timeOperation(async () => {
    try {
      logger.debug(`Starting operation: ${operationName}`, undefined, context);
      const result = await operation();
      logger.debug(`Completed operation: ${operationName}`, undefined, context);
      return result;
    } catch (error) {
      logger.error(`Operation '${operationName}' failed`, error, undefined, context);
      throw normalizeError(error);
    }
  }, operationName, context);
}

// Statistical utilities
export * from './statistics.js';

// Performance utilities
export {
  MemoryManager
} from './MemoryManager.js';

export {
  IntelligentCacheManager,
  type CacheConfig
} from './IntelligentCacheManager.js';

export {
  PerformanceMonitor
} from './PerformanceMonitor.js';

export {
  PerformanceOrchestrator
} from './PerformanceOrchestrator.js';

// Cache key generation utilities
export {
  CacheKeyGenerator,
  CacheKeys,
  type CacheKeyOptions,
  type NormalizedParams
} from './CacheKeyGenerator.js';

// Size estimation utilities
export {
  SizeEstimator,
  SizeUtils,
  type SizeEstimate,
  type SizeOptions
} from './SizeEstimator.js';