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
/**
 * Base repository class with common database operations
 */
export class BaseRepository {
    db;
    preparedStatements = new Map();
    constructor(databaseManager) {
        this.db = databaseManager;
    }
    /**
     * Get the database connection
     */
    getConnection() {
        return this.db.getConnection();
    }
    /**
     * Execute a transaction with proper error handling
     */
    transaction(fn) {
        return this.db.transaction(fn);
    }
    /**
     * Get or create a prepared statement for reuse
     */
    prepare(key, sql) {
        if (!this.preparedStatements.has(key)) {
            const connection = this.getConnection();
            this.preparedStatements.set(key, connection.prepare(sql));
        }
        return this.preparedStatements.get(key);
    }
    /**
     * Execute a prepared statement with error handling
     */
    executeStatement(key, sql, params) {
        try {
            const stmt = this.prepare(key, sql);
            return params ? stmt.get(params) : stmt.get();
        }
        catch (error) {
            throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Execute a prepared statement that returns all rows
     */
    executeStatementAll(key, sql, params) {
        try {
            const stmt = this.prepare(key, sql);
            return params ? stmt.all(params) : stmt.all();
        }
        catch (error) {
            throw new Error(`Database query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Execute a prepared statement that modifies data
     */
    executeStatementRun(key, sql, params) {
        try {
            const stmt = this.prepare(key, sql);
            return params ? stmt.run(params) : stmt.run();
        }
        catch (error) {
            throw new Error(`Database operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Generate a UUID v4
     */
    generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    /**
     * Get current timestamp in milliseconds
     */
    getCurrentTimestamp() {
        return Date.now();
    }
    /**
     * Validate that a string is a valid UUID
     */
    isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }
    /**
     * Parse JSON metadata safely
     */
    parseMetadata(metadataJson) {
        if (!metadataJson) {
            return {};
        }
        try {
            return JSON.parse(metadataJson);
        }
        catch (error) {
            return {};
        }
    }
    /**
     * Stringify metadata safely
     */
    stringifyMetadata(metadata) {
        if (!metadata || Object.keys(metadata).length === 0) {
            return '{}';
        }
        try {
            return JSON.stringify(metadata);
        }
        catch (error) {
            return '{}';
        }
    }
    /**
     * Validate pagination parameters
     */
    validatePagination(limit, offset) {
        // Handle invalid limit values - use 1 for 0 or negative values, 50 for undefined/null
        let validatedLimit;
        if (limit === undefined || limit === null) {
            validatedLimit = 50; // Default
        }
        else if (limit <= 0) {
            validatedLimit = 1; // Minimum for invalid values
        }
        else {
            validatedLimit = Math.min(limit, 1000); // Cap at maximum
        }
        const validatedOffset = Math.max(offset || 0, 0); // Non-negative
        return { limit: validatedLimit, offset: validatedOffset };
    }
    /**
     * Handle database constraint violations
     */
    handleConstraintError(error, entityType) {
        const message = error.message.toLowerCase();
        if (message.includes('unique constraint')) {
            throw new Error(`${entityType} already exists`);
        }
        if (message.includes('foreign key constraint')) {
            throw new Error(`Referenced ${entityType} does not exist`);
        }
        if (message.includes('check constraint')) {
            throw new Error(`Invalid ${entityType} data`);
        }
        // Re-throw original error if not a known constraint violation
        throw error;
    }
    /**
     * Clean up prepared statements
     */
    cleanup() {
        this.preparedStatements.clear();
    }
}
//# sourceMappingURL=BaseRepository.js.map