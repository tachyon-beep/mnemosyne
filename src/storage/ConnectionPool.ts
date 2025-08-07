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

interface PooledConnection {
  id: string;
  db: Database.Database;
  inUse: boolean;
  createdAt: number;
  lastUsed: number;
}

interface PendingRequest {
  resolve: (connection: PooledConnection) => void;
  reject: (error: Error) => void;
  requestedAt: number;
}

export class ConnectionPool extends EventEmitter {
  private connections: Map<string, PooledConnection> = new Map();
  private pendingRequests: PendingRequest[] = [];
  private options: Required<ConnectionPoolOptions>;
  private isShuttingDown = false;
  private metrics: ConnectionPoolMetrics;

  constructor(options: ConnectionPoolOptions) {
    super();
    
    this.options = {
      enableWAL: true,
      enableForeignKeys: true,
      cacheSize: 10000,
      busyTimeout: 5000,
      readOnly: false,
      create: true,
      enableMetrics: true,
      ...options,
      // Set defaults for required properties if not provided
      minConnections: options.minConnections ?? 2,
      maxConnections: options.maxConnections ?? 10
    };

    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      pendingRequests: 0,
      connectionsCreated: 0,
      connectionsDestroyed: 0,
      requestsServed: 0,
      averageWaitTime: 0,
      peakConnections: 0
    };

    // Initialize minimum connections
    this.initializePool();
  }

  private async initializePool(): Promise<void> {
    for (let i = 0; i < this.options.minConnections; i++) {
      try {
        const connection = await this.createConnection();
        this.connections.set(connection.id, connection);
      } catch (error) {
        console.error(`Failed to create initial connection ${i + 1}:`, error);
      }
    }
  }

  private async createConnection(): Promise<PooledConnection> {
    const id = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    const db = new Database(this.options.databasePath, {
      readonly: this.options.readOnly
    });

    // Configure connection
    if (this.options.enableWAL) {
      db.exec('PRAGMA journal_mode = WAL');
    }
    
    if (this.options.enableForeignKeys) {
      db.exec('PRAGMA foreign_keys = ON');
    }
    
    if (this.options.cacheSize > 0) {
      db.exec(`PRAGMA cache_size = -${this.options.cacheSize}`);
    }
    
    if (this.options.busyTimeout > 0) {
      db.pragma(`busy_timeout = ${this.options.busyTimeout}`);
    }

    // Additional performance optimizations
    db.exec('PRAGMA temp_store = MEMORY');
    db.exec('PRAGMA mmap_size = 268435456'); // 256MB mmap
    db.exec('PRAGMA synchronous = NORMAL');

    const connection: PooledConnection = {
      id,
      db,
      inUse: false,
      createdAt: Date.now(),
      lastUsed: Date.now()
    };

    this.metrics.connectionsCreated++;
    this.metrics.totalConnections = this.connections.size + 1;
    this.metrics.peakConnections = Math.max(this.metrics.peakConnections, this.metrics.totalConnections);

    this.emit('connection:created', { connectionId: id });
    return connection;
  }

  private async destroyConnection(connection: PooledConnection): Promise<void> {
    try {
      connection.db.close();
      this.connections.delete(connection.id);
      this.metrics.connectionsDestroyed++;
      this.metrics.totalConnections = this.connections.size;
      this.emit('connection:destroyed', { connectionId: connection.id });
    } catch (error) {
      console.error(`Failed to destroy connection ${connection.id}:`, error);
    }
  }

  private getIdleConnection(): PooledConnection | null {
    for (const connection of this.connections.values()) {
      if (!connection.inUse) {
        return connection;
      }
    }
    return null;
  }

  private updateMetrics(): void {
    let active = 0;
    let idle = 0;

    for (const connection of this.connections.values()) {
      if (connection.inUse) {
        active++;
      } else {
        idle++;
      }
    }

    this.metrics.activeConnections = active;
    this.metrics.idleConnections = idle;
    this.metrics.pendingRequests = this.pendingRequests.length;
  }

  private async acquireConnection(): Promise<PooledConnection> {
    if (this.isShuttingDown) {
      throw new Error('Connection pool is shutting down');
    }

    // Try to get an idle connection first
    let connection = this.getIdleConnection();
    
    if (connection) {
      connection.inUse = true;
      connection.lastUsed = Date.now();
      this.updateMetrics();
      this.metrics.requestsServed++;
      return connection;
    }

    // If no idle connection and we can create more
    if (this.connections.size < this.options.maxConnections) {
      try {
        connection = await this.createConnection();
        connection.inUse = true;
        this.connections.set(connection.id, connection);
        this.updateMetrics();
        this.metrics.requestsServed++;
        return connection;
      } catch (error) {
        console.error('Failed to create new connection:', error);
      }
    }

    // Wait for a connection to become available
    return new Promise((resolve, reject) => {
      const requestStartTime = Date.now();
      const request: PendingRequest = {
        resolve: (conn) => {
          const waitTime = Date.now() - requestStartTime;
          this.metrics.averageWaitTime = 
            (this.metrics.averageWaitTime * (this.metrics.requestsServed - 1) + waitTime) / this.metrics.requestsServed;
          resolve(conn);
        },
        reject,
        requestedAt: requestStartTime
      };

      this.pendingRequests.push(request);
      this.updateMetrics();

      // Timeout after reasonable time
      const timeout = setTimeout(() => {
        const index = this.pendingRequests.indexOf(request);
        if (index > -1) {
          this.pendingRequests.splice(index, 1);
          reject(new Error('Connection request timeout'));
        }
      }, 30000); // 30 second timeout

      request.resolve = (conn) => {
        clearTimeout(timeout);
        const waitTime = Date.now() - requestStartTime;
        this.metrics.averageWaitTime = 
          (this.metrics.averageWaitTime * (this.metrics.requestsServed - 1) + waitTime) / this.metrics.requestsServed;
        resolve(conn);
      };
    });
  }

  private releaseConnection(connection: PooledConnection): void {
    connection.inUse = false;
    connection.lastUsed = Date.now();

    // Check if there are pending requests
    const pendingRequest = this.pendingRequests.shift();
    if (pendingRequest) {
      connection.inUse = true;
      this.metrics.requestsServed++;
      pendingRequest.resolve(connection);
    }

    this.updateMetrics();
  }

  /**
   * Execute a function with a pooled database connection
   */
  async withConnection<T>(fn: (db: Database.Database) => T | Promise<T>): Promise<T> {
    const connection = await this.acquireConnection();
    
    try {
      const result = await fn(connection.db);
      return result;
    } finally {
      this.releaseConnection(connection);
    }
  }

  /**
   * Execute a function within a transaction using a pooled connection
   */
  async withTransaction<T>(fn: (db: Database.Database) => T | Promise<T>): Promise<T> {
    const connection = await this.acquireConnection();
    
    try {
      const result = connection.db.transaction(async () => {
        return await fn(connection.db);
      })();
      return result;
    } finally {
      this.releaseConnection(connection);
    }
  }

  /**
   * Get current pool status
   */
  getStatus(): ConnectionPoolStatus {
    this.updateMetrics();
    return {
      totalConnections: this.metrics.totalConnections,
      activeConnections: this.metrics.activeConnections,
      idleConnections: this.metrics.idleConnections,
      pendingRequests: this.metrics.pendingRequests
    };
  }

  /**
   * Get detailed pool metrics
   */
  getMetrics(): ConnectionPoolMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Shutdown the connection pool
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    // Reject all pending requests
    const error = new Error('Connection pool shutting down');
    this.pendingRequests.forEach(request => request.reject(error));
    this.pendingRequests.length = 0;

    // Close all connections
    const closePromises = Array.from(this.connections.values()).map(connection => 
      this.destroyConnection(connection)
    );

    await Promise.all(closePromises);
    this.connections.clear();
    
    this.emit('pool:shutdown');
  }

  /**
   * Health check for the connection pool
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
    metrics: ConnectionPoolMetrics;
  }> {
    const issues: string[] = [];
    
    // Check if we have minimum connections
    if (this.connections.size < this.options.minConnections) {
      issues.push(`Below minimum connections: ${this.connections.size}/${this.options.minConnections}`);
    }

    // Check if too many pending requests
    if (this.pendingRequests.length > this.options.maxConnections) {
      issues.push(`Too many pending requests: ${this.pendingRequests.length}`);
    }

    // Test a connection
    try {
      await this.withConnection(db => {
        return db.prepare('SELECT 1').get();
      });
    } catch (error) {
      issues.push(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      healthy: issues.length === 0,
      issues,
      metrics: this.getMetrics()
    };
  }
}