/**
 * Migration Interface and Runner
 *
 * This module provides:
 * - Migration interface for defining database schema changes
 * - Migration runner that applies migrations in order
 * - Version tracking in the persistence_state table
 * - Transaction support for safe migrations
 */
import Database from 'better-sqlite3';
/**
 * Interface for database migrations
 */
export interface Migration {
    /** Unique version number for this migration */
    version: number;
    /** Human-readable description of what this migration does */
    description: string;
    /** SQL statements to apply this migration */
    up: string[];
    /** SQL statements to rollback this migration (optional) */
    down?: string[];
    /** Whether this migration requires special handling (default: false) */
    requiresSpecialHandling?: boolean;
}
/**
 * Result of applying a migration
 */
export interface MigrationResult {
    /** The migration that was applied */
    migration: Migration;
    /** Whether the migration was successful */
    success: boolean;
    /** Error message if the migration failed */
    error?: string;
    /** Time taken to apply the migration in milliseconds */
    duration: number;
}
/**
 * Migration runner that manages database schema versioning
 */
export declare class MigrationRunner {
    private db;
    constructor(db: Database.Database);
    /**
     * Initialize the migration system by creating the persistence_state table
     */
    private initializeMigrationTable;
    /**
     * Get the current schema version
     */
    getCurrentVersion(): number;
    /**
     * Set the schema version
     */
    private setSchemaVersion;
    /**
     * Run all pending migrations
     */
    runMigrations(migrations: Migration[]): Promise<MigrationResult[]>;
    /**
     * Run a single migration
     */
    private runSingleMigration;
    /**
     * Rollback to a specific version (if down migrations are available)
     */
    rollbackToVersion(targetVersion: number, migrations: Migration[]): Promise<MigrationResult[]>;
    /**
     * Run a single rollback
     */
    private runRollback;
    /**
     * Validate that migrations are properly ordered and have unique versions
     */
    static validateMigrations(migrations: Migration[]): void;
    /**
     * Get information about all migrations
     */
    getMigrationInfo(migrations: Migration[]): Array<{
        version: number;
        description: string;
        applied: boolean;
        appliedAt?: number;
    }>;
    /**
     * Check if database is up to date with latest migrations
     */
    isUpToDate(migrations: Migration[]): boolean;
}
//# sourceMappingURL=Migration.d.ts.map