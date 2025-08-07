/**
 * Base Repository - Abstract base class with common patterns
 *
 * This abstract class provides:
 * - Common database connection access
 * - Transaction handling utilities
 * - Error handling patterns
 * - Prepared statement management
 * - Generic CRUD operation patterns
 */
import Database from 'better-sqlite3';
import { DatabaseManager } from '../Database.js';
/**
 * Base repository class with common database operations
 */
export declare abstract class BaseRepository {
    protected db: DatabaseManager;
    protected preparedStatements: Map<string, Database.Statement>;
    constructor(databaseManager: DatabaseManager);
    /**
     * Get the database connection
     */
    protected getConnection(): Database.Database;
    /**
     * Execute a transaction with proper error handling
     */
    protected transaction<T>(fn: (db: Database.Database) => T): T;
    /**
     * Get or create a prepared statement for reuse
     */
    protected prepare(key: string, sql: string): Database.Statement;
    /**
     * Execute a prepared statement with error handling
     */
    protected executeStatement<T = any>(key: string, sql: string, params?: any): T;
    /**
     * Execute a prepared statement that returns all rows
     */
    protected executeStatementAll<T = any>(key: string, sql: string, params?: any): T[];
    /**
     * Execute a prepared statement that modifies data
     */
    protected executeStatementRun(key: string, sql: string, params?: any): Database.RunResult;
    /**
     * Generate a UUID v4
     */
    protected generateId(): string;
    /**
     * Get current timestamp in milliseconds
     */
    protected getCurrentTimestamp(): number;
    /**
     * Validate that a string is a valid UUID
     */
    protected isValidUUID(uuid: string): boolean;
    /**
     * Parse JSON metadata safely
     */
    protected parseMetadata(metadataJson?: string): Record<string, any>;
    /**
     * Stringify metadata safely
     */
    protected stringifyMetadata(metadata?: Record<string, any>): string;
    /**
     * Validate pagination parameters
     */
    protected validatePagination(limit?: number, offset?: number): {
        limit: number;
        offset: number;
    };
    /**
     * Handle database constraint violations
     */
    protected handleConstraintError(error: Error, entityType: string): never;
    /**
     * Clean up prepared statements
     */
    cleanup(): void;
}
//# sourceMappingURL=BaseRepository.d.ts.map