/**
 * Flexible logging system for the MCP Persistence System
 *
 * This module provides a structured logging system with configurable levels,
 * output formats, and contextual information. Supports both development
 * and production environments with appropriate log sanitization.
 */
/**
 * Log levels in order of severity
 */
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    SILENT = 4
}
/**
 * Log level names for display
 */
export declare const LOG_LEVEL_NAMES: Record<LogLevel, string>;
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
    maxFileSize?: number;
    maxFiles?: number;
    enableColors: boolean;
    enableStackTrace: boolean;
    timestampFormat: 'iso' | 'epoch' | 'readable';
    outputFormat: 'json' | 'text';
    sanitizeInProduction: boolean;
}
/**
 * Main logger class
 */
export declare class Logger {
    private config;
    private context;
    constructor(config?: Partial<LoggerConfig>);
    /**
     * Set the global context for this logger instance
     */
    setContext(context: LogContext): void;
    /**
     * Clear the global context
     */
    clearContext(): void;
    /**
     * Log a debug message
     */
    debug(message: string, metadata?: Record<string, any>, context?: LogContext): void;
    /**
     * Log an info message
     */
    info(message: string, metadata?: Record<string, any>, context?: LogContext): void;
    /**
     * Log a warning message
     */
    warn(message: string, metadata?: Record<string, any>, context?: LogContext): void;
    /**
     * Log an error message
     */
    error(message: string, error?: unknown, metadata?: Record<string, any>, context?: LogContext): void;
    /**
     * Log performance metrics
     */
    performance(metrics: PerformanceMetrics, context?: LogContext): void;
    /**
     * Time an operation and log performance metrics
     */
    timeOperation<T>(operation: () => Promise<T>, operationName: string, context?: LogContext): Promise<T>;
    /**
     * Create a child logger with additional context
     */
    child(context: LogContext): Logger;
    /**
     * Main logging method
     */
    private log;
    /**
     * Write log entry to console
     */
    private writeToConsole;
    /**
     * Write log entry to file
     */
    private writeToFile;
    /**
     * Format log entry as text
     */
    private formatTextEntry;
    /**
     * Format timestamp according to configuration
     */
    private formatTimestamp;
    /**
     * Sanitize log entry for production
     */
    private sanitizeEntry;
    /**
     * Sanitize an object by removing sensitive fields
     */
    private sanitizeObject;
    /**
     * Check if we're in production environment
     */
    private isProduction;
    /**
     * Ensure log directory exists
     */
    private ensureLogDirectory;
    /**
     * Rotate logs if file size exceeds limit
     */
    private rotateLogsIfNeeded;
    /**
     * Rotate log files
     */
    private rotateLogs;
    /**
     * Update logger configuration
     */
    updateConfig(config: Partial<LoggerConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): LoggerConfig;
}
/**
 * Initialize the default logger
 */
export declare function initializeLogger(config?: Partial<LoggerConfig>): Logger;
/**
 * Get the default logger instance
 */
export declare function getLogger(): Logger;
/**
 * Parse log level from string
 */
export declare function parseLogLevel(level?: string): LogLevel;
/**
 * Convenience logging functions using the default logger
 */
export declare const log: {
    debug: (message: string, metadata?: Record<string, any>, context?: LogContext) => void;
    info: (message: string, metadata?: Record<string, any>, context?: LogContext) => void;
    warn: (message: string, metadata?: Record<string, any>, context?: LogContext) => void;
    error: (message: string, error?: unknown, metadata?: Record<string, any>, context?: LogContext) => void;
    performance: (metrics: PerformanceMetrics, context?: LogContext) => void;
    timeOperation: <T>(operation: () => Promise<T>, operationName: string, context?: LogContext) => Promise<T>;
};
/**
 * Performance timing utility
 */
export declare class PerformanceTimer {
    private operation;
    private logger?;
    private startTime;
    private startTimestamp;
    constructor(operation: string, logger?: Logger);
    /**
     * Stop the timer and log the performance metrics
     */
    stop(context?: LogContext, metadata?: Record<string, any>): number;
}
//# sourceMappingURL=logger.d.ts.map