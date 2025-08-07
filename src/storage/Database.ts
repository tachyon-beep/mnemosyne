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
import { promises as fs } from 'fs';
import path from 'path';
import { DatabaseStats, PersistenceServerConfig } from '../types/index.js';
import { MigrationRunner } from './migrations/Migration.js';
import { migrations } from './migrations/index.js';
import { QueryOptimizer } from './QueryOptimizer.js';
import { ConnectionPool, ConnectionPoolOptions } from './ConnectionPool.js';

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

export class DatabaseManager {
  private db: Database.Database | null = null;
  private migrationRunner: MigrationRunner | null = null;
  private connectionPool: ConnectionPool | null = null;
  private queryOptimizer: QueryOptimizer | null = null;
  private options: DatabaseOptions;
  private isInitialized = false;
  private performanceMetrics: {
    queryCount: number;
    totalQueryTime: number;
    slowQueryCount: number;
    cacheHitCount: number;
    cacheMissCount: number;
  } = {
    queryCount: 0,
    totalQueryTime: 0,
    slowQueryCount: 0,
    cacheHitCount: 0,
    cacheMissCount: 0
  };

  constructor(options: DatabaseOptions) {
    this.options = {
      enableWAL: true,
      enableForeignKeys: true,
      cacheSize: 2000,
      readOnly: false,
      create: true,
      enableConnectionPool: true,
      maxConnections: 10,
      minConnections: 2,
      enableQueryOptimization: true,
      queryCacheTTL: 300000, // 5 minutes
      ...options
    };
  }

  /**
   * Initialize the database connection and run migrations
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Ensure directory exists
      await this.ensureDirectoryExists();

      // Initialize connection pool if enabled (optional)
      if (this.options.enableConnectionPool) {
        try {
          this.connectionPool = new ConnectionPool({
            databasePath: this.options.databasePath,
            enableWAL: this.options.enableWAL,
            enableForeignKeys: this.options.enableForeignKeys,
            cacheSize: this.options.cacheSize,
            readOnly: this.options.readOnly,
            create: this.options.create,
            maxConnections: this.options.maxConnections!,
            minConnections: this.options.minConnections!,
            enableMetrics: true
          });
        } catch (error) {
          console.warn('Connection pool initialization failed, continuing with single connection:', error);
          this.connectionPool = null;
        }
      }

      // Create primary database connection for migrations and management
      this.db = new Database(this.options.databasePath, {
        readonly: this.options.readOnly,
        fileMustExist: !this.options.create
      });

      // Configure database settings
      this.configurePragmas();

      // Initialize migration runner
      this.migrationRunner = new MigrationRunner(this.db);

      // Run migrations if not read-only
      if (!this.options.readOnly) {
        await this.runMigrations();
      }

      // Initialize query optimizer after migrations
      if (this.options.enableQueryOptimization) {
        this.queryOptimizer = new QueryOptimizer(this, {
          maxCacheSize: 1000,
          defaultTTL: this.options.queryCacheTTL!
        });
        
        // Create optimized indexes
        await this.queryOptimizer.createOptimizedIndexes();
      }

      // Re-configure pragmas after migrations and optimizations
      this.configurePragmas();

      this.isInitialized = true;
    } catch (error) {
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      if (this.connectionPool) {
        await this.connectionPool.shutdown();
        this.connectionPool = null;
      }
      throw new Error(`Failed to initialize database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the database connection
   */
  getConnection(): Database.Database {
    if (!this.db) {
      throw new Error('Database connection not available. Database may not be initialized.');
    }
    if (!this.isInitialized) {
      console.warn('Warning: Database connection requested before initialization complete');
    }
    return this.db;
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    // Shutdown connection pool first
    if (this.connectionPool) {
      await this.connectionPool.shutdown();
      this.connectionPool = null;
    }

    // Close primary connection
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    // Clear query optimizer
    if (this.queryOptimizer) {
      this.queryOptimizer.clearCache();
      this.queryOptimizer = null;
    }

    this.isInitialized = false;
  }

  /**
   * Check if the database is initialized
   */
  isConnected(): boolean {
    return this.isInitialized && this.db !== null;
  }

  /**
   * Execute a transaction
   */
  transaction<T>(fn: (db: Database.Database) => T): T {
    const db = this.getConnection();
    const txn = db.transaction(fn);
    return txn(db);
  }

  /**
   * Execute a transaction using connection pool
   */
  async poolTransaction<T>(fn: (db: Database.Database) => Promise<T>): Promise<T> {
    if (!this.connectionPool) {
      // Fallback to regular transaction
      return new Promise((resolve, reject) => {
        try {
          const result = this.transaction((db) => {
            // Convert sync function to promise result
            return fn(db);
          });
          // If result is a promise, wait for it
          if (result instanceof Promise) {
            result.then(resolve).catch(reject);
          } else {
            resolve(result as any);
          }
        } catch (error) {
          reject(error);
        }
      });
    }

    return this.connectionPool.withTransaction(fn);
  }

  /**
   * Execute query with optimization and caching
   */
  async executeOptimized<T>(
    sql: string,
    params: any[] = [],
    options: {
      cacheKey?: string;
      ttl?: number;
      forceRefresh?: boolean;
    } = {}
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      let result: T;
      
      if (this.queryOptimizer) {
        // Use query optimizer with caching
        result = await this.queryOptimizer.executeWithCache<T>(sql, params, options);
        this.performanceMetrics.cacheHitCount++;
      } else {
        // Fallback to direct execution
        const db = this.getConnection();
        const stmt = db.prepare(sql);
        result = stmt.all(...params) as T;
        this.performanceMetrics.cacheMissCount++;
      }

      // Update performance metrics
      const duration = Date.now() - startTime;
      this.performanceMetrics.queryCount++;
      this.performanceMetrics.totalQueryTime += duration;
      
      if (duration > 1000) { // Queries taking more than 1 second
        this.performanceMetrics.slowQueryCount++;
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.performanceMetrics.queryCount++;
      this.performanceMetrics.totalQueryTime += duration;
      throw error;
    }
  }

  /**
   * Execute query using connection pool
   */
  async executePooled<T>(sql: string, params: any[] = []): Promise<T> {
    if (!this.connectionPool) {
      // Fallback to direct execution
      const db = this.getConnection();
      const stmt = db.prepare(sql);
      return stmt.all(...params) as T;
    }

    return this.connectionPool.withConnection(async (db: Database.Database) => {
      const stmt = db.prepare(sql);
      return stmt.all(...params) as T;
    });
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<DatabaseStats & {
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
  }> {
    const db = this.getConnection();

    const conversationCount = db.prepare('SELECT COUNT(*) as count FROM conversations').get() as { count: number };
    const messageCount = db.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number };
    
    const oldestConv = db.prepare('SELECT MIN(created_at) as timestamp FROM conversations').get() as { timestamp: number | null };
    const newestConv = db.prepare('SELECT MAX(updated_at) as timestamp FROM conversations').get() as { timestamp: number | null };
    
    // Get database file size
    let databaseSizeBytes = 0;
    try {
      const stats = await fs.stat(this.options.databasePath);
      databaseSizeBytes = stats.size;
    } catch (error) {
      // File might not exist or be accessible
    }

    // Get last embedding index from persistence_state
    const embeddingState = db.prepare('SELECT value FROM persistence_state WHERE key = ?').get('last_embedding_index') as { value: string } | undefined;
    const lastEmbeddingIndex = embeddingState ? parseInt(embeddingState.value, 10) : undefined;

    // Calculate performance metrics
    const performance = {
      queryCount: this.performanceMetrics.queryCount,
      averageQueryTime: this.performanceMetrics.queryCount > 0 
        ? this.performanceMetrics.totalQueryTime / this.performanceMetrics.queryCount 
        : 0,
      slowQueryCount: this.performanceMetrics.slowQueryCount,
      cacheHitRate: (this.performanceMetrics.cacheHitCount + this.performanceMetrics.cacheMissCount) > 0
        ? this.performanceMetrics.cacheHitCount / (this.performanceMetrics.cacheHitCount + this.performanceMetrics.cacheMissCount)
        : 0,
      connectionPool: this.connectionPool ? this.connectionPool.getStatus() : undefined
    };

    return {
      conversationCount: conversationCount.count,
      messageCount: messageCount.count,
      databaseSizeBytes,
      oldestConversation: oldestConv.timestamp || undefined,
      newestConversation: newestConv.timestamp || undefined,
      lastEmbeddingIndex,
      performance
    };
  }

  /**
   * Optimize the database by running ANALYZE and VACUUM
   */
  async optimize(): Promise<void> {
    const db = this.getConnection();
    
    // Update query planner statistics
    db.prepare('ANALYZE').run();
    
    // Optimize FTS index
    try {
      db.prepare("INSERT INTO messages_fts(messages_fts) VALUES('optimize')").run();
    } catch (error) {
      // FTS table might not exist yet
    }
    
    // Run VACUUM to reclaim space (can be slow on large databases)
    db.prepare('VACUUM').run();
  }

  /**
   * Perform a checkpoint on the WAL file
   */
  checkpoint(): void {
    const db = this.getConnection();
    db.prepare('PRAGMA wal_checkpoint(TRUNCATE)').run();
  }

  /**
   * Get the current database schema version
   */
  getSchemaVersion(): number {
    if (!this.migrationRunner) {
      throw new Error('Migration runner not initialized');
    }
    return this.migrationRunner.getCurrentVersion();
  }

  /**
   * Get query optimizer instance
   */
  getQueryOptimizer(): QueryOptimizer | null {
    return this.queryOptimizer;
  }

  /**
   * Get connection pool instance
   */
  getConnectionPool(): ConnectionPool | null {
    return this.connectionPool;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): typeof this.performanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Reset performance metrics
   */
  resetPerformanceMetrics(): void {
    this.performanceMetrics = {
      queryCount: 0,
      totalQueryTime: 0,
      slowQueryCount: 0,
      cacheHitCount: 0,
      cacheMissCount: 0
    };
  }

  /**
   * Get comprehensive performance report
   */
  async getPerformanceReport(): Promise<{
    database: {
      queryCount: number;
      totalQueryTime: number;
      slowQueryCount: number;
      cacheHitCount: number;
      cacheMissCount: number;
    };
    queryOptimizer?: any;
    connectionPool?: any;
  }> {
    const report = {
      database: this.getPerformanceMetrics()
    } as any;

    if (this.queryOptimizer) {
      report.queryOptimizer = this.queryOptimizer.getPerformanceReport();
    }

    if (this.connectionPool) {
      report.connectionPool = this.connectionPool.getMetrics();
    }

    return report;
  }

  /**
   * Run pending migrations
   */
  private async runMigrations(): Promise<void> {
    if (!this.migrationRunner) {
      throw new Error('Migration runner not initialized');
    }

    await this.migrationRunner.runMigrations(migrations);
  }

  /**
   * Configure database pragmas for optimal performance and safety
   */
  private configurePragmas(): void {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    try {
      // Enable WAL mode for better concurrency (if enabled)
      if (this.options.enableWAL) {
        this.db.pragma('journal_mode = WAL');
      }

      // Enable foreign key constraints (if enabled)
      if (this.options.enableForeignKeys) {
        this.db.pragma('foreign_keys = ON');
      }

      // Set cache size (negative value means KB)
      this.db.pragma(`cache_size = -${this.options.cacheSize}`);

      // Set synchronous mode to NORMAL for better performance with WAL
      if (this.options.enableWAL) {
        this.db.pragma('synchronous = NORMAL');
      } else {
        this.db.pragma('synchronous = FULL');
      }

      // Set temp store to memory for better performance
      this.db.pragma('temp_store = MEMORY');

      // Set mmap size for better I/O performance (256MB)
      this.db.pragma('mmap_size = 268435456');

      // Optimize busy timeout
      this.db.pragma('busy_timeout = 10000');

    } catch (error) {
      throw new Error(`Failed to configure database pragmas: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Ensure the database directory exists
   */
  private async ensureDirectoryExists(): Promise<void> {
    const dirPath = path.dirname(this.options.databasePath);
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }
}

/**
 * Create a database manager from server configuration
 */
export function createDatabaseManager(config: Partial<PersistenceServerConfig>): DatabaseManager {
  const options: DatabaseOptions = {
    databasePath: config.databasePath || './conversations.db',
    enableWAL: true,
    enableForeignKeys: true,
    cacheSize: 2000,
    readOnly: false,
    create: true,
    enableConnectionPool: true,
    maxConnections: 10,
    minConnections: 2,
    enableQueryOptimization: true,
    queryCacheTTL: 300000 // 5 minutes
  };

  return new DatabaseManager(options);
}