/**
 * Migration Registry
 *
 * Central registry for all database migrations.
 * Migrations are exported in an array and must be ordered by version number.
 */
import { Migration } from './Migration.js';
/**
 * All available migrations in order
 *
 * When adding new migrations:
 * 1. Create a new migration file following the naming pattern: 00X_description.ts
 * 2. Import the migration here
 * 3. Add it to the migrations array in the correct order
 * 4. Ensure version numbers are sequential and unique
 */
export declare const migrations: Migration[];
/**
 * Get the latest migration version
 */
export declare function getLatestVersion(): number;
/**
 * Get a migration by version number
 */
export declare function getMigrationByVersion(version: number): Migration | undefined;
/**
 * Get all migrations up to a specific version
 */
export declare function getMigrationsUpTo(version: number): Migration[];
/**
 * Get all migrations after a specific version
 */
export declare function getMigrationsAfter(version: number): Migration[];
/**
 * Check if a specific migration version exists
 */
export declare function migrationExists(version: number): boolean;
/**
 * Get migration information for debugging/status reporting
 */
export declare function getMigrationInfo(): Array<{
    version: number;
    description: string;
    hasRollback: boolean;
    statementCount: number;
}>;
//# sourceMappingURL=index.d.ts.map