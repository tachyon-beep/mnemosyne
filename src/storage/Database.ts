/**
 * Database Layer - Main database class with connection management
 * 
 * This class provides:
 * - SQLite connection management with better-sqlite3
 * - WAL mode, foreign keys, and proper pragmas
 * - Migration support with version tracking
 * - Transaction handling
 * - Connection lifecycle management
 */

import Database from 'better-sqlite3';
import { promises as fs } from 'fs';
import path from 'path';
import { DatabaseStats, PersistenceServerConfig } from '../types';
import { MigrationRunner } from './migrations/Migration';
import { migrations } from './migrations';

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
}

export class DatabaseManager {
  private db: Database.Database | null = null;
  private migrationRunner: MigrationRunner | null = null;
  private options: DatabaseOptions;
  private isInitialized = false;

  constructor(options: DatabaseOptions) {
    this.options = {
      enableWAL: true,
      enableForeignKeys: true,
      cacheSize: 2000,
      readOnly: false,
      create: true,
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

      // Create database connection
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

      // Re-configure pragmas after migrations (some migrations might change settings)
      this.configurePragmas();

      this.isInitialized = true;
    } catch (error) {
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      throw new Error(`Failed to initialize database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the database connection
   */
  getConnection(): Database.Database {
    if (!this.db || !this.isInitialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
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
   * Get database statistics
   */
  async getStats(): Promise<DatabaseStats> {
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

    return {
      conversationCount: conversationCount.count,
      messageCount: messageCount.count,
      databaseSizeBytes,
      oldestConversation: oldestConv.timestamp || undefined,
      newestConversation: newestConv.timestamp || undefined,
      lastEmbeddingIndex
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
    create: true
  };

  return new DatabaseManager(options);
}