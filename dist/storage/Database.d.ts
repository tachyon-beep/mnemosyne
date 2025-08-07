/**
 * Database Layer - Main database class with connection management
 *
 * This class provides:
 * - SQLite connection management with better-sqlite3
 * - Connection pooling for concurrent operations
 * - WAL mode, foreign keys, and proper pragmas
 * - Migration support with version tracking
 * - Transaction handling
 * - Connection lifecycle management
 * - Performance monitoring integration
 */
import Database from 'better-sqlite3';
import { DatabaseStats, PersistenceServerConfig } from '../types/index.js';
import { QueryOptimizer } from './QueryOptimizer.js';
import { ConnectionPool } from './ConnectionPool.js';
export interface DatabaseOptions {
    /** Path to the SQLite database file */
    databasePath: string;
    /** Whether to enable WAL mode (default: true) */
    enableWAL?: boolean;
    /** Whether to enable foreign keys (default: true) */
    enableForeignKeys?: boolean;
    /** Cache size in KB (default: 2000) */
    cacheSize?: number;
    /** Whether the database is read-only (default: false) */
    readOnly?: boolean;
    /** Whether to create the database if it doesn't exist (default: true) */
    create?: boolean;
    /** Enable connection pooling (default: true) */
    enableConnectionPool?: boolean;
    /** Maximum number of connections in pool (default: 10) */
    maxConnections?: number;
    /** Minimum number of connections in pool (default: 2) */
    minConnections?: number;
    /** Enable query optimization and caching (default: true) */
    enableQueryOptimization?: boolean;
    /** Query cache TTL in milliseconds (default: 300000 = 5 minutes) */
    queryCacheTTL?: number;
}
export declare class DatabaseManager {
    private db;
    private migrationRunner;
    private connectionPool;
    private queryOptimizer;
    private options;
    private isInitialized;
    private performanceMetrics;
    constructor(options: DatabaseOptions);
    /**
     * Initialize the database connection and run migrations
     */
    initialize(): Promise<void>;
    /**
     * Get the database connection
     */
    getConnection(): Database.Database;
    /**
     * Close the database connection
     */
    close(): Promise<void>;
    /**
     * Check if the database is initialized
     */
    isConnected(): boolean;
    /**
     * Execute a transaction
     */
    transaction<T>(fn: (db: Database.Database) => T): T;
    /**
     * Execute a transaction using connection pool
     */
    poolTransaction<T>(fn: (db: Database.Database) => Promise<T>): Promise<T>;
    /**
     * Execute query with optimization and caching
     */
    executeOptimized<T>(sql: string, params?: any[], options?: {
        cacheKey?: string;
        ttl?: number;
        forceRefresh?: boolean;
    }): Promise<T>;
    /**
     * Execute query using connection pool
     */
    executePooled<T>(sql: string, params?: any[]): Promise<T>;
    /**
     * Get database statistics
     */
    getStats(): Promise<DatabaseStats & {
        performance?: {
            queryCount: number;
            averageQueryTime: number;
            slowQueryCount: number;
            cacheHitRate: number;
            connectionPool?: {
                totalConnections: number;
                activeConnections: number;
                idleConnections: number;
                pendingRequests: number;
            };
        };
    }>;
    /**
     * Optimize the database by running ANALYZE and VACUUM
     */
    optimize(): Promise<void>;
    /**
     * Perform a checkpoint on the WAL file
     */
    checkpoint(): void;
    /**
     * Get the current database schema version
     */
    getSchemaVersion(): number;
    /**
     * Get query optimizer instance
     */
    getQueryOptimizer(): QueryOptimizer | null;
    /**
     * Get connection pool instance
     */
    getConnectionPool(): ConnectionPool | null;
    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): typeof this.performanceMetrics;
    /**
     * Reset performance metrics
     */
    resetPerformanceMetrics(): void;
    /**
     * Get comprehensive performance report
     */
    getPerformanceReport(): Promise<{
        database: {
            queryCount: number;
            totalQueryTime: number;
            slowQueryCount: number;
            cacheHitCount: number;
            cacheMissCount: number;
        };
        queryOptimizer?: any;
        connectionPool?: any;
    }>;
    /**
     * Run pending migrations
     */
    private runMigrations;
    /**
     * Configure database pragmas for optimal performance and safety
     */
    private configurePragmas;
    /**
     * Ensure the database directory exists
     */
    private ensureDirectoryExists;
}
/**
 * Create a database manager from server configuration
 */
export declare function createDatabaseManager(config: Partial<PersistenceServerConfig>): DatabaseManager;
//# sourceMappingURL=Database.d.ts.map