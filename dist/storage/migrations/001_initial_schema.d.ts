/**
 * Initial Schema Migration
 *
 * Creates the core database schema for the MCP Persistence System:
 * - conversations table for conversation metadata
 * - messages table for message storage with foreign key constraints
 * - messages_fts virtual table for full-text search
 * - persistence_state table for key-value state storage
 * - Indexes for optimal query performance
 */
import { Migration } from './Migration.js';
export declare const initialSchemaMigration: Migration;
//# sourceMappingURL=001_initial_schema.d.ts.map