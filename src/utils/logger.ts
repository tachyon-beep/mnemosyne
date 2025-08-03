/**
 * Flexible logging system for the MCP Persistence System
 * 
 * This module provides a structured logging system with configurable levels,
 * output formats, and contextual information. Supports both development
 * and production environments with appropriate log sanitization.
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractErrorInfo } from './errors';

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4
}

/**
 * Log level names for display
 */
export const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.SILENT]: 'SILENT'
};

/**
 * Log level colors for console output
 */
const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '\x1b[36m', // Cyan
  [LogLevel.INFO]: '\x1b[32m',  // Green
  [LogLevel.WARN]: '\x1b[33m',  // Yellow
  [LogLevel.ERROR]: '\x1b[31m', // Red
  [LogLevel.SILENT]: '\x1b[0m'  // Reset
};

/**
 * Performance metrics for operations
 */
export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: number;
  requestId?: string;
  metadata?: Record<string, any>;
}

/**
 * Structured log entry
 */
export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: any;
  performance?: PerformanceMetrics;
  metadata?: Record<string, any>;
}

/**
 * Context information for logs
 */
export interface LogContext {
  requestId?: string;
  userId?: string;
  operation?: string;
  tool?: string;
  conversationId?: string;
  messageId?: string;
  component?: string;
  [key: string]: any;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  filePath?: string;
  maxFileSize?: number; // in bytes
  maxFiles?: number; // number of rotated files to keep
  enableColors: boolean;
  enableStackTrace: boolean;
  timestampFormat: 'iso' | 'epoch' | 'readable';
  outputFormat: 'json' | 'text';
  sanitizeInProduction: boolean;
}

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  enableConsole: true,
  enableFile: false,
  enableColors: true,
  enableStackTrace: true,
  timestampFormat: 'iso',
  outputFormat: 'text',
  sanitizeInProduction: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5
};

/**
 * Main logger class
 */
export class Logger {
  private config: LoggerConfig;
  private context: LogContext = {};

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Ensure file directory exists if file logging is enabled
    if (this.config.enableFile && this.config.filePath) {
      this.ensureLogDirectory();
    }
  }

  /**
   * Set the global context for this logger instance
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear the global context
   */
  clearContext(): void {
    this.context = {};
  }

  /**
   * Log a debug message
   */
  debug(message: string, metadata?: Record<string, any>, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, metadata, context);
  }

  /**
   * Log an info message
   */
  info(message: string, metadata?: Record<string, any>, context?: LogContext): void {
    this.log(LogLevel.INFO, message, metadata, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, metadata?: Record<string, any>, context?: LogContext): void {
    this.log(LogLevel.WARN, message, metadata, context);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: unknown, metadata?: Record<string, any>, context?: LogContext): void {
    const errorInfo = error ? extractErrorInfo(error) : undefined;
    this.log(LogLevel.ERROR, message, { ...metadata, error: errorInfo }, context);
  }

  /**
   * Log performance metrics
   */
  performance(metrics: PerformanceMetrics, context?: LogContext): void {
    this.log(LogLevel.INFO, `Performance: ${metrics.operation} took ${metrics.duration}ms`, 
      undefined, { ...context, performance: metrics });
  }

  /**
   * Time an operation and log performance metrics
   */
  async timeOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: LogContext
  ): Promise<T> {
    const startTime = process.hrtime.bigint();
    const startTimestamp = Date.now();
    
    try {
      const result = await operation();
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      this.performance({
        operation: operationName,
        duration,
        timestamp: startTimestamp,
        requestId: context?.requestId || this.context.requestId
      }, context);
      
      return result;
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;
      
      this.performance({
        operation: `${operationName} (failed)`,
        duration,
        timestamp: startTimestamp,
        requestId: context?.requestId || this.context.requestId,
        metadata: { error: true }
      }, context);
      
      throw error;
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger(this.config);
    childLogger.setContext({ ...this.context, ...context });
    return childLogger;
  }

  /**
   * Main logging method
   */
  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    context?: LogContext
  ): void {
    // Check if we should log at this level
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      context: { ...this.context, ...context },
      metadata
    };

    // Sanitize in production if enabled
    if (this.config.sanitizeInProduction && this.isProduction()) {
      this.sanitizeEntry(entry);
    }

    // Output to console
    if (this.config.enableConsole) {
      this.writeToConsole(entry);
    }

    // Output to file
    if (this.config.enableFile && this.config.filePath) {
      this.writeToFile(entry);
    }
  }

  /**
   * Write log entry to console
   */
  private writeToConsole(entry: LogEntry): void {
    const levelName = LOG_LEVEL_NAMES[entry.level];
    const timestamp = this.formatTimestamp(entry.timestamp);
    
    if (this.config.outputFormat === 'json') {
      console.log(JSON.stringify(entry));
      return;
    }

    // Text format
    const color = this.config.enableColors ? LOG_LEVEL_COLORS[entry.level] : '';
    const reset = this.config.enableColors ? '\x1b[0m' : '';
    
    let output = `${color}[${timestamp}] ${levelName}${reset}: ${entry.message}`;
    
    // Add context information
    if (entry.context && Object.keys(entry.context).length > 0) {
      const contextStr = Object.entries(entry.context)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${value}`)
        .join(' ');
      output += ` | ${contextStr}`;
    }
    
    // Add metadata
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      output += ` | ${JSON.stringify(entry.metadata)}`;
    }
    
    console.log(output);
    
    // Log stack trace for errors if enabled
    if (entry.level === LogLevel.ERROR && 
        this.config.enableStackTrace && 
        entry.metadata?.error?.stack) {
      console.log(entry.metadata.error.stack);
    }
  }

  /**
   * Write log entry to file
   */
  private writeToFile(entry: LogEntry): void {
    if (!this.config.filePath) return;

    try {
      // Check file size and rotate if necessary
      this.rotateLogsIfNeeded();
      
      const logLine = this.config.outputFormat === 'json' 
        ? JSON.stringify(entry) + '\n'
        : this.formatTextEntry(entry) + '\n';
      
      fs.appendFileSync(this.config.filePath, logLine, 'utf8');
    } catch (error) {
      // If we can't write to file, log to console instead
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Format log entry as text
   */
  private formatTextEntry(entry: LogEntry): string {
    const timestamp = this.formatTimestamp(entry.timestamp);
    const levelName = LOG_LEVEL_NAMES[entry.level];
    
    let output = `[${timestamp}] ${levelName}: ${entry.message}`;
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      const contextStr = Object.entries(entry.context)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${value}`)
        .join(' ');
      output += ` | ${contextStr}`;
    }
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      output += ` | ${JSON.stringify(entry.metadata)}`;
    }
    
    return output;
  }

  /**
   * Format timestamp according to configuration
   */
  private formatTimestamp(timestamp: number): string {
    switch (this.config.timestampFormat) {
      case 'epoch':
        return timestamp.toString();
      case 'readable':
        return new Date(timestamp).toLocaleString();
      case 'iso':
      default:
        return new Date(timestamp).toISOString();
    }
  }

  /**
   * Sanitize log entry for production
   */
  private sanitizeEntry(entry: LogEntry): void {
    // Remove or redact sensitive information
    if (entry.context) {
      entry.context = this.sanitizeObject(entry.context);
    }
    
    if (entry.metadata) {
      entry.metadata = this.sanitizeObject(entry.metadata);
    }
  }

  /**
   * Sanitize an object by removing sensitive fields
   */
  private sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (value && typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Check if we're in production environment
   */
  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    if (!this.config.filePath) return;
    
    const dir = path.dirname(this.config.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Rotate logs if file size exceeds limit
   */
  private rotateLogsIfNeeded(): void {
    if (!this.config.filePath || !this.config.maxFileSize) return;
    
    try {
      const stats = fs.statSync(this.config.filePath);
      if (stats.size >= this.config.maxFileSize) {
        this.rotateLogs();
      }
    } catch (error) {
      // File doesn't exist yet, no need to rotate
    }
  }

  /**
   * Rotate log files
   */
  private rotateLogs(): void {
    if (!this.config.filePath || !this.config.maxFiles) return;
    
    const basePath = this.config.filePath;
    const ext = path.extname(basePath);
    const nameWithoutExt = basePath.slice(0, -ext.length);
    
    // Rotate existing files
    for (let i = this.config.maxFiles - 1; i >= 1; i--) {
      const oldFile = `${nameWithoutExt}.${i}${ext}`;
      const newFile = `${nameWithoutExt}.${i + 1}${ext}`;
      
      try {
        if (fs.existsSync(oldFile)) {
          if (i === this.config.maxFiles - 1) {
            fs.unlinkSync(oldFile); // Delete oldest file
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      } catch (error) {
        // Ignore rotation errors
      }
    }
    
    // Move current file to .1
    try {
      if (fs.existsSync(basePath)) {
        fs.renameSync(basePath, `${nameWithoutExt}.1${ext}`);
      }
    } catch (error) {
      // Ignore rotation errors
    }
  }

  /**
   * Update logger configuration
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.config.enableFile && this.config.filePath) {
      this.ensureLogDirectory();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

/**
 * Default logger instance
 */
let defaultLogger: Logger;

/**
 * Initialize the default logger
 */
export function initializeLogger(config: Partial<LoggerConfig> = {}): Logger {
  // Get configuration from environment variables
  const envConfig: Partial<LoggerConfig> = {
    level: parseLogLevel(process.env.LOG_LEVEL),
    enableConsole: process.env.LOG_CONSOLE !== 'false',
    enableFile: process.env.LOG_FILE === 'true',
    filePath: process.env.LOG_FILE_PATH,
    enableColors: process.env.LOG_COLORS !== 'false',
    enableStackTrace: process.env.LOG_STACK_TRACE !== 'false',
    outputFormat: (process.env.LOG_FORMAT as 'json' | 'text') || 'text',
    sanitizeInProduction: process.env.LOG_SANITIZE !== 'false'
  };
  
  defaultLogger = new Logger({ ...envConfig, ...config });
  return defaultLogger;
}

/**
 * Get the default logger instance
 */
export function getLogger(): Logger {
  if (!defaultLogger) {
    defaultLogger = initializeLogger();
  }
  return defaultLogger;
}

/**
 * Parse log level from string
 */
export function parseLogLevel(level?: string): LogLevel {
  if (!level) return LogLevel.INFO;
  
  const levelUpper = level.toUpperCase();
  switch (levelUpper) {
    case 'DEBUG': return LogLevel.DEBUG;
    case 'INFO': return LogLevel.INFO;
    case 'WARN': case 'WARNING': return LogLevel.WARN;
    case 'ERROR': return LogLevel.ERROR;
    case 'SILENT': case 'NONE': return LogLevel.SILENT;
    default: return LogLevel.INFO;
  }
}

/**
 * Convenience logging functions using the default logger
 */
export const log = {
  debug: (message: string, metadata?: Record<string, any>, context?: LogContext) => 
    getLogger().debug(message, metadata, context),
  
  info: (message: string, metadata?: Record<string, any>, context?: LogContext) => 
    getLogger().info(message, metadata, context),
  
  warn: (message: string, metadata?: Record<string, any>, context?: LogContext) => 
    getLogger().warn(message, metadata, context),
  
  error: (message: string, error?: unknown, metadata?: Record<string, any>, context?: LogContext) => 
    getLogger().error(message, error, metadata, context),
  
  performance: (metrics: PerformanceMetrics, context?: LogContext) => 
    getLogger().performance(metrics, context),
  
  timeOperation: <T>(operation: () => Promise<T>, operationName: string, context?: LogContext) => 
    getLogger().timeOperation(operation, operationName, context)
};

/**
 * Performance timing utility
 */
export class PerformanceTimer {
  private startTime: bigint;
  private startTimestamp: number;
  
  constructor(private operation: string, private logger?: Logger) {
    this.startTime = process.hrtime.bigint();
    this.startTimestamp = Date.now();
  }
  
  /**
   * Stop the timer and log the performance metrics
   */
  stop(context?: LogContext, metadata?: Record<string, any>): number {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - this.startTime) / 1000000;
    
    const metrics: PerformanceMetrics = {
      operation: this.operation,
      duration,
      timestamp: this.startTimestamp,
      requestId: context?.requestId,
      metadata
    };
    
    (this.logger || getLogger()).performance(metrics, context);
    return duration;
  }
}