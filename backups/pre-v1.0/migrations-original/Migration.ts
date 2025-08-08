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
export class MigrationRunner {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Initialize the migration system by creating the persistence_state table
   */
  private initializeMigrationTable(): void {
    // Create persistence_state table if it doesn't exist
    // This table is used for migration versioning and other state storage
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS persistence_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `;

    this.db.prepare(createTableSQL).run();

    // Initialize schema version if not set
    const versionExists = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM persistence_state 
      WHERE key = 'schema_version'
    `).get() as { count: number };

    if (versionExists.count === 0) {
      this.setSchemaVersion(0);
    }
  }

  /**
   * Get the current schema version
   */
  getCurrentVersion(): number {
    this.initializeMigrationTable();

    const result = this.db.prepare(`
      SELECT value 
      FROM persistence_state 
      WHERE key = 'schema_version'
    `).get() as { value: string } | undefined;

    return result ? parseInt(result.value, 10) : 0;
  }

  /**
   * Set the schema version
   */
  private setSchemaVersion(version: number): void {
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO persistence_state (key, value, updated_at)
      VALUES ('schema_version', ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `).run(version.toString(), now);
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(migrations: Migration[]): Promise<MigrationResult[]> {
    const currentVersion = this.getCurrentVersion();
    const pendingMigrations = migrations
      .filter(migration => migration.version > currentVersion)
      .sort((a, b) => a.version - b.version);

    if (pendingMigrations.length === 0) {
      return [];
    }

    const results: MigrationResult[] = [];

    for (const migration of pendingMigrations) {
      const result = await this.runSingleMigration(migration);
      results.push(result);

      if (!result.success) {
        throw new Error(`Migration ${migration.version} failed: ${result.error}`);
      }
    }

    return results;
  }

  /**
   * Run a single migration
   */
  private async runSingleMigration(migration: Migration): Promise<MigrationResult> {
    const startTime = Date.now();

    try {
      // Run migration in a transaction for atomicity
      const transaction = this.db.transaction(() => {
        // Execute all UP statements
        for (const sql of migration.up) {
          if (sql.trim()) {
            this.db.prepare(sql).run();
          }
        }

        // Update schema version
        this.setSchemaVersion(migration.version);
      });

      transaction();

      const duration = Date.now() - startTime;

      return {
        migration,
        success: true,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        migration,
        success: false,
        error: errorMessage,
        duration
      };
    }
  }

  /**
   * Rollback to a specific version (if down migrations are available)
   */
  async rollbackToVersion(targetVersion: number, migrations: Migration[]): Promise<MigrationResult[]> {
    const currentVersion = this.getCurrentVersion();

    if (targetVersion >= currentVersion) {
      throw new Error(`Target version ${targetVersion} is not less than current version ${currentVersion}`);
    }

    const migrationsToRollback = migrations
      .filter(migration => migration.version > targetVersion && migration.version <= currentVersion)
      .sort((a, b) => b.version - a.version); // Rollback in reverse order

    const results: MigrationResult[] = [];

    for (const migration of migrationsToRollback) {
      if (!migration.down || migration.down.length === 0) {
        throw new Error(`Migration ${migration.version} does not support rollback`);
      }

      const result = await this.runRollback(migration);
      results.push(result);

      if (!result.success) {
        throw new Error(`Rollback of migration ${migration.version} failed: ${result.error}`);
      }
    }

    return results;
  }

  /**
   * Run a single rollback
   */
  private async runRollback(migration: Migration): Promise<MigrationResult> {
    const startTime = Date.now();

    try {
      if (!migration.down) {
        throw new Error('No rollback statements provided');
      }

      // Run rollback in a transaction
      const transaction = this.db.transaction(() => {
        // Execute all DOWN statements
        for (const sql of migration.down!) {
          if (sql.trim()) {
            this.db.prepare(sql).run();
          }
        }

        // Update schema version to previous version
        this.setSchemaVersion(migration.version - 1);
      });

      transaction();

      const duration = Date.now() - startTime;

      return {
        migration,
        success: true,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        migration,
        success: false,
        error: errorMessage,
        duration
      };
    }
  }

  /**
   * Validate that migrations are properly ordered and have unique versions
   */
  static validateMigrations(migrations: Migration[]): void {
    const versions = migrations.map(m => m.version);
    const uniqueVersions = new Set(versions);

    if (versions.length !== uniqueVersions.size) {
      throw new Error('Duplicate migration versions found');
    }

    const sortedVersions = [...versions].sort((a, b) => a - b);
    for (let i = 0; i < sortedVersions.length; i++) {
      const expected = i + 1;
      if (sortedVersions[i] !== expected) {
        throw new Error(`Migration versions must be sequential starting from 1. Missing or invalid version: ${expected}`);
      }
    }
  }

  /**
   * Get information about all migrations
   */
  getMigrationInfo(migrations: Migration[]): Array<{
    version: number;
    description: string;
    applied: boolean;
    appliedAt?: number;
  }> {
    const currentVersion = this.getCurrentVersion();

    return migrations.map(migration => ({
      version: migration.version,
      description: migration.description,
      applied: migration.version <= currentVersion,
      appliedAt: migration.version <= currentVersion ? Date.now() : undefined
    }));
  }

  /**
   * Check if database is up to date with latest migrations
   */
  isUpToDate(migrations: Migration[]): boolean {
    if (migrations.length === 0) {
      return true;
    }

    const latestVersion = Math.max(...migrations.map(m => m.version));
    const currentVersion = this.getCurrentVersion();

    return currentVersion >= latestVersion;
  }
}