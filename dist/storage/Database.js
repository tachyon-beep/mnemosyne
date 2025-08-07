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
import { MigrationRunner } from './migrations/Migration.js';
import { migrations } from './migrations/index.js';
import { QueryOptimizer } from './QueryOptimizer.js';
import { ConnectionPool } from './ConnectionPool.js';
export class DatabaseManager {
    db = null;
    migrationRunner = null;
    connectionPool = null;
    queryOptimizer = null;
    options;
    isInitialized = false;
    performanceMetrics = {
        queryCount: 0,
        totalQueryTime: 0,
        slowQueryCount: 0,
        cacheHitCount: 0,
        cacheMissCount: 0
    };
    constructor(options) {
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
    async initialize() {
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
                        maxConnections: this.options.maxConnections,
                        minConnections: this.options.minConnections,
                        enableMetrics: true
                    });
                }
                catch (error) {
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
                    defaultTTL: this.options.queryCacheTTL
                });
                // Create optimized indexes
                await this.queryOptimizer.createOptimizedIndexes();
            }
            // Re-configure pragmas after migrations and optimizations
            this.configurePragmas();
            this.isInitialized = true;
        }
        catch (error) {
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
    getConnection() {
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
    async close() {
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
    isConnected() {
        return this.isInitialized && this.db !== null;
    }
    /**
     * Execute a transaction
     */
    transaction(fn) {
        const db = this.getConnection();
        const txn = db.transaction(fn);
        return txn(db);
    }
    /**
     * Execute a transaction using connection pool
     */
    async poolTransaction(fn) {
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
                    }
                    else {
                        resolve(result);
                    }
                }
                catch (error) {
                    reject(error);
                }
            });
        }
        return this.connectionPool.withTransaction(fn);
    }
    /**
     * Execute query with optimization and caching
     */
    async executeOptimized(sql, params = [], options = {}) {
        const startTime = Date.now();
        try {
            let result;
            if (this.queryOptimizer) {
                // Use query optimizer with caching
                result = await this.queryOptimizer.executeWithCache(sql, params, options);
                this.performanceMetrics.cacheHitCount++;
            }
            else {
                // Fallback to direct execution
                const db = this.getConnection();
                const stmt = db.prepare(sql);
                result = stmt.all(...params);
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
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.performanceMetrics.queryCount++;
            this.performanceMetrics.totalQueryTime += duration;
            throw error;
        }
    }
    /**
     * Execute query using connection pool
     */
    async executePooled(sql, params = []) {
        if (!this.connectionPool) {
            // Fallback to direct execution
            const db = this.getConnection();
            const stmt = db.prepare(sql);
            return stmt.all(...params);
        }
        return this.connectionPool.withConnection(async (db) => {
            const stmt = db.prepare(sql);
            return stmt.all(...params);
        });
    }
    /**
     * Get database statistics
     */
    async getStats() {
        const db = this.getConnection();
        const conversationCount = db.prepare('SELECT COUNT(*) as count FROM conversations').get();
        const messageCount = db.prepare('SELECT COUNT(*) as count FROM messages').get();
        const oldestConv = db.prepare('SELECT MIN(created_at) as timestamp FROM conversations').get();
        const newestConv = db.prepare('SELECT MAX(updated_at) as timestamp FROM conversations').get();
        // Get database file size
        let databaseSizeBytes = 0;
        try {
            const stats = await fs.stat(this.options.databasePath);
            databaseSizeBytes = stats.size;
        }
        catch (error) {
            // File might not exist or be accessible
        }
        // Get last embedding index from persistence_state
        const embeddingState = db.prepare('SELECT value FROM persistence_state WHERE key = ?').get('last_embedding_index');
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
    async optimize() {
        const db = this.getConnection();
        // Update query planner statistics
        db.prepare('ANALYZE').run();
        // Optimize FTS index
        try {
            db.prepare("INSERT INTO messages_fts(messages_fts) VALUES('optimize')").run();
        }
        catch (error) {
            // FTS table might not exist yet
        }
        // Run VACUUM to reclaim space (can be slow on large databases)
        db.prepare('VACUUM').run();
    }
    /**
     * Perform a checkpoint on the WAL file
     */
    checkpoint() {
        const db = this.getConnection();
        db.prepare('PRAGMA wal_checkpoint(TRUNCATE)').run();
    }
    /**
     * Get the current database schema version
     */
    getSchemaVersion() {
        if (!this.migrationRunner) {
            throw new Error('Migration runner not initialized');
        }
        return this.migrationRunner.getCurrentVersion();
    }
    /**
     * Get query optimizer instance
     */
    getQueryOptimizer() {
        return this.queryOptimizer;
    }
    /**
     * Get connection pool instance
     */
    getConnectionPool() {
        return this.connectionPool;
    }
    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return { ...this.performanceMetrics };
    }
    /**
     * Reset performance metrics
     */
    resetPerformanceMetrics() {
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
    async getPerformanceReport() {
        const report = {
            database: this.getPerformanceMetrics()
        };
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
    async runMigrations() {
        if (!this.migrationRunner) {
            throw new Error('Migration runner not initialized');
        }
        await this.migrationRunner.runMigrations(migrations);
    }
    /**
     * Configure database pragmas for optimal performance and safety
     */
    configurePragmas() {
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
            }
            else {
                this.db.pragma('synchronous = FULL');
            }
            // Set temp store to memory for better performance
            this.db.pragma('temp_store = MEMORY');
            // Set mmap size for better I/O performance (256MB)
            this.db.pragma('mmap_size = 268435456');
            // Optimize busy timeout
            this.db.pragma('busy_timeout = 10000');
        }
        catch (error) {
            throw new Error(`Failed to configure database pragmas: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Ensure the database directory exists
     */
    async ensureDirectoryExists() {
        const dirPath = path.dirname(this.options.databasePath);
        try {
            await fs.access(dirPath);
        }
        catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }
}
/**
 * Create a database manager from server configuration
 */
export function createDatabaseManager(config) {
    const options = {
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
//# sourceMappingURL=Database.js.map