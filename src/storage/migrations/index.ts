/**
 * Migration Registry
 * 
 * Central registry for all database migrations.
 * Migrations are exported in an array and must be ordered by version number.
 */

import { Migration } from './Migration.js';
import { initialSchemaMigration } from './001_initial_schema.js';
import { enhancedSearchMigration } from './002_enhanced_search.js';
import { migration_003_intelligent_context } from './003_intelligent_context.js';
import { migration_004_knowledge_graph } from './004_knowledge_graph.js';
import { migration_005_conflict_resolution } from './005_conflict_resolution.js';
import { analyticsMigration } from './006_analytics.js';
import { indexMonitoringMigration } from './007_index_monitoring.js';

/**
 * All available migrations in order
 * 
 * When adding new migrations:
 * 1. Create a new migration file following the naming pattern: 00X_description.ts
 * 2. Import the migration here
 * 3. Add it to the migrations array in the correct order
 * 4. Ensure version numbers are sequential and unique
 */
export const migrations: Migration[] = [
  initialSchemaMigration,
  enhancedSearchMigration,
  migration_003_intelligent_context,
  migration_004_knowledge_graph,
  migration_005_conflict_resolution,
  analyticsMigration,
  indexMonitoringMigration
];

/**
 * Validate that all migrations are properly configured
 * This function is called during module loading to catch configuration errors early
 */
function validateMigrations(): void {
  // Check for duplicate versions
  const versions = migrations.map(m => m.version);
  const uniqueVersions = new Set(versions);
  
  if (versions.length !== uniqueVersions.size) {
    const duplicates = versions.filter((v, i) => versions.indexOf(v) !== i);
    throw new Error(`Duplicate migration versions found: ${duplicates.join(', ')}`);
  }

  // Check for missing versions (migrations should be sequential starting from 1)
  const sortedVersions = [...versions].sort((a, b) => a - b);
  for (let i = 0; i < sortedVersions.length; i++) {
    const expected = i + 1;
    if (sortedVersions[i] !== expected) {
      throw new Error(
        `Migration versions must be sequential starting from 1. ` +
        `Expected version ${expected}, but found ${sortedVersions[i]}. ` +
        `Make sure all migration versions from 1 to ${Math.max(...versions)} exist.`
      );
    }
  }

  // Check that all migrations have required properties
  for (const migration of migrations) {
    if (!migration.version || migration.version < 1) {
      throw new Error(`Migration must have a positive version number: ${JSON.stringify(migration)}`);
    }
    
    if (!migration.description || migration.description.trim().length === 0) {
      throw new Error(`Migration ${migration.version} must have a description`);
    }
    
    if (!migration.up || !Array.isArray(migration.up) || migration.up.length === 0) {
      throw new Error(`Migration ${migration.version} must have non-empty 'up' statements`);
    }

    // Check for empty SQL statements
    const hasEmptyStatements = migration.up.some(sql => !sql || sql.trim().length === 0);
    if (hasEmptyStatements) {
      console.warn(`Migration ${migration.version} contains empty SQL statements`);
    }
  }
}

// Validate migrations on module load
validateMigrations();

/**
 * Get the latest migration version
 */
export function getLatestVersion(): number {
  if (migrations.length === 0) {
    return 0;
  }
  return Math.max(...migrations.map(m => m.version));
}

/**
 * Get a migration by version number
 */
export function getMigrationByVersion(version: number): Migration | undefined {
  return migrations.find(m => m.version === version);
}

/**
 * Get all migrations up to a specific version
 */
export function getMigrationsUpTo(version: number): Migration[] {
  return migrations
    .filter(m => m.version <= version)
    .sort((a, b) => a.version - b.version);
}

/**
 * Get all migrations after a specific version
 */
export function getMigrationsAfter(version: number): Migration[] {
  return migrations
    .filter(m => m.version > version)
    .sort((a, b) => a.version - b.version);
}

/**
 * Check if a specific migration version exists
 */
export function migrationExists(version: number): boolean {
  return migrations.some(m => m.version === version);
}

/**
 * Get migration information for debugging/status reporting
 */
export function getMigrationInfo(): Array<{
  version: number;
  description: string;
  hasRollback: boolean;
  statementCount: number;
}> {
  return migrations.map(migration => ({
    version: migration.version,
    description: migration.description,
    hasRollback: Boolean(migration.down && migration.down.length > 0),
    statementCount: migration.up.length
  }));
}