/**
 * MCP Server - Main server implementation using @modelcontextprotocol/sdk
 *
 * This class provides:
 * - MCP protocol communication via stdio transport
 * - Tool registration and execution
 * - Database initialization and management
 * - Graceful startup and shutdown
 * - Error handling and logging
 * - Health checks and status reporting
 */
import { ToolRegistry } from './ToolRegistry.js';
import { PersistenceServerConfig } from '../types/index.js';
/**
 * Configuration options for the MCP server
 */
export interface MCPServerConfig extends Partial<PersistenceServerConfig> {
    /** Server name for MCP protocol */
    name?: string;
    /** Server version */
    version?: string;
    /** Enable debug logging */
    debug?: boolean;
    /** Maximum execution time for tools (ms) */
    toolTimeoutMs?: number;
}
/**
 * Server status enumeration
 */
export declare enum ServerStatus {
    STOPPED = "stopped",
    STARTING = "starting",
    RUNNING = "running",
    STOPPING = "stopping",
    ERROR = "error"
}
/**
 * Server health check result
 */
export interface HealthCheckResult {
    status: 'healthy' | 'unhealthy';
    checks: {
        database: 'ok' | 'error';
        tools: 'ok' | 'error';
        search: 'ok' | 'error';
    };
    uptime: number;
    error?: string;
}
/**
 * Main MCP server class
 */
export declare class MCPServer {
    private server;
    private transport;
    private database;
    private toolRegistry;
    private basicSearchEngine;
    private enhancedSearchEngine;
    private embeddingManager;
    private knowledgeGraphService;
    private memoryManager;
    private performanceOrchestrator;
    private config;
    private status;
    private startTime;
    private shutdownHandlers;
    constructor(config?: MCPServerConfig);
    /**
     * Start the MCP server
     */
    start(): Promise<void>;
    /**
     * Stop the MCP server
     */
    stop(): Promise<void>;
    /**
     * Get current server status
     */
    getStatus(): ServerStatus;
    /**
     * Get the tool registry (for testing)
     */
    getToolRegistry(): ToolRegistry | null;
    /**
     * Perform health check
     */
    healthCheck(): Promise<HealthCheckResult>;
    /**
     * Get server statistics
     */
    getStats(): Promise<any>;
    /**
     * Initialize performance management systems
     */
    private initializePerformanceManagement;
    /**
     * Initialize database and run migrations
     */
    private initializeDatabase;
    /**
     * Initialize repositories and search engine
     */
    private initializeServices;
    /**
     * Initialize and register tools
     */
    private initializeTools;
    /**
     * Start performance monitoring
     */
    private startPerformanceMonitoring;
    /**
     * Start the stdio transport
     */
    private startTransport;
    /**
     * Setup performance event handlers
     */
    private setupPerformanceEventHandlers;
    /**
     * Setup MCP server request handlers
     */
    private setupServerHandlers;
    /**
     * Setup process signal handlers for graceful shutdown
     */
    private setupProcessHandlers;
    /**
     * Execute a function with timeout
     */
    private executeWithTimeout;
    /**
     * Add a shutdown handler
     */
    onShutdown(handler: () => Promise<void>): void;
    /**
     * Logging utility
     */
    private log;
}
/**
 * Factory function to create an MCP server instance
 */
export declare function createMCPServer(config?: MCPServerConfig): MCPServer;
/**
 * Type exports for external use
 */
export type { MCPServerConfig as ServerConfig, HealthCheckResult as HealthCheck };
//# sourceMappingURL=MCPServer.d.ts.map