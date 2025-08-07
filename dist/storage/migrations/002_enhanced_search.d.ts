/**
 * Enhanced Search & Discovery Migration
 *
 * This migration transforms the basic search capabilities into an intelligent
 * semantic search system while maintaining backward compatibility.
 *
 * CRITICAL FIXES APPLIED:
 * 1. Dangerous Column Migration Pattern: Replaced ALTER TABLE DROP COLUMN with table recreation
 * 2. FTS Trigger Inconsistencies: Fixed update trigger to use consistent delete+insert pattern
 * 3. Missing SQLite Version Checks: Added compatibility verification
 * 4. Data Loss in Rollback: Improved rollback to preserve data where possible
 *
 * MIGRATION STRATEGY:
 * - Uses table recreation pattern for column type changes (BLOB -> TEXT)
 * - Drops and recreates triggers during table recreation to avoid conflicts
 * - Preserves all message data except embeddings (which can be regenerated)
 * - Uses consistent delete+insert pattern for all FTS trigger operations
 * - Includes proper error handling and version checks
 *
 * Changes:
 * - Updates embedding column from BLOB to TEXT (JSON array storage) using safe table recreation
 * - Creates search configuration table for settings
 * - Creates search metrics table for performance tracking
 * - Enhances FTS configuration with better tokenization
 * - Fixes FTS trigger issues for proper automatic indexing with consistent delete+insert pattern
 * - Adds indexes for improved embedding query performance
 * - Includes SQLite version compatibility checks (requires 3.35.0+)
 * - Improved rollback with data preservation where possible
 */
import { Migration } from './Migration.js';
export declare const enhancedSearchMigration: Migration;
//# sourceMappingURL=002_enhanced_search.d.ts.map