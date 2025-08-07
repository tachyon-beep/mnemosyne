/**
 * SQLite Connection Pool Implementation
 *
 * Provides connection pooling for SQLite operations to improve performance
 * and handle concurrent requests efficiently.
 */
import Database from 'better-sqlite3';
import { EventEmitter } from 'events';
export interface ConnectionPoolOptions {
    databasePath: string;
    minConnections: number;
    maxConnections: number;
    enableWAL?: boolean;
    enableForeignKeys?: boolean;
    cacheSize?: number;
    busyTimeout?: number;
    readOnly?: boolean;
    create?: boolean;
    enableMetrics?: boolean;
}
export interface ConnectionPoolStatus {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    pendingRequests: number;
}
export interface ConnectionPoolMetrics {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    pendingRequests: number;
    connectionsCreated: number;
    connectionsDestroyed: number;
    requestsServed: number;
    averageWaitTime: number;
    peakConnections: number;
}
export declare class ConnectionPool extends EventEmitter {
    private connections;
    private pendingRequests;
    private options;
    private isShuttingDown;
    private metrics;
    constructor(options: ConnectionPoolOptions);
    private initializePool;
    private createConnection;
    private destroyConnection;
    private getIdleConnection;
    private updateMetrics;
    private acquireConnection;
    private releaseConnection;
    /**
     * Execute a function with a pooled database connection
     */
    withConnection<T>(fn: (db: Database.Database) => T | Promise<T>): Promise<T>;
    /**
     * Execute a function within a transaction using a pooled connection
     */
    withTransaction<T>(fn: (db: Database.Database) => T | Promise<T>): Promise<T>;
    /**
     * Get current pool status
     */
    getStatus(): ConnectionPoolStatus;
    /**
     * Get detailed pool metrics
     */
    getMetrics(): ConnectionPoolMetrics;
    /**
     * Shutdown the connection pool
     */
    shutdown(): Promise<void>;
    /**
     * Health check for the connection pool
     */
    healthCheck(): Promise<{
        healthy: boolean;
        issues: string[];
        metrics: ConnectionPoolMetrics;
    }>;
}
//# sourceMappingURL=ConnectionPool.d.ts.map