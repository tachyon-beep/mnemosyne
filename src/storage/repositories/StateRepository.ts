/**
 * State Repository - Key-value state management
 * 
 * This repository provides:
 * - Key-value storage for application state
 * - JSON serialization/deserialization
 * - Atomic operations with transactions
 * - Batch operations for multiple keys
 * - Timestamp tracking for state changes
 */

import { PersistenceState } from '../../types/interfaces.js';
import { BaseRepository } from './BaseRepository.js';

/**
 * Interface for batch state operations
 */
export interface BatchStateOperation {
  key: string;
  value: any;
}

/**
 * Repository for key-value state management
 */
export class StateRepository extends BaseRepository {

  /**
   * Get a value by key
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (!key || typeof key !== 'string') {
      return null;
    }

    const row = this.executeStatement<{
      key: string;
      value: string;
      updated_at: number;
    }>(
      'get_state',
      'SELECT key, value, updated_at FROM persistence_state WHERE key = ?',
      [key]
    );

    if (!row) {
      return null;
    }

    try {
      return JSON.parse(row.value) as T;
    } catch (error) {
      // If JSON parsing fails, return the raw string value
      return row.value as T;
    }
  }

  /**
   * Set a value for a key
   */
  async set(key: string, value: any): Promise<void> {
    if (!key || typeof key !== 'string') {
      throw new Error('Key must be a non-empty string');
    }

    const now = this.getCurrentTimestamp();
    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);

    try {
      // Use INSERT OR REPLACE for upsert behavior
      this.executeStatementRun(
        'set_state',
        `INSERT OR REPLACE INTO persistence_state (key, value, updated_at)
         VALUES (?, ?, ?)`,
        [key, serializedValue, now]
      );
    } catch (error) {
      throw new Error(`Failed to set state for key '${key}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a key-value pair
   */
  async delete(key: string): Promise<boolean> {
    if (!key || typeof key !== 'string') {
      return false;
    }

    const result = this.executeStatementRun(
      'delete_state',
      'DELETE FROM persistence_state WHERE key = ?',
      [key]
    );

    return result.changes > 0;
  }

  /**
   * Get all key-value pairs
   */
  async getAll(): Promise<Record<string, any>> {
    const rows = this.executeStatementAll<{
      key: string;
      value: string;
      updated_at: number;
    }>(
      'get_all_state',
      'SELECT key, value, updated_at FROM persistence_state WHERE key != ? ORDER BY key',
      ['schema_version']
    );

    const result: Record<string, any> = {};
    for (const row of rows) {
      try {
        result[row.key] = JSON.parse(row.value);
      } catch (error) {
        // If JSON parsing fails, store the raw string value
        result[row.key] = row.value;
      }
    }

    return result;
  }

  /**
   * Get all keys matching a pattern
   */
  async getByPattern(pattern: string): Promise<Record<string, any>> {
    if (!pattern || typeof pattern !== 'string') {
      return {};
    }

    const rows = this.executeStatementAll<{
      key: string;
      value: string;
      updated_at: number;
    }>(
      'get_state_by_pattern',
      'SELECT key, value, updated_at FROM persistence_state WHERE key LIKE ? ORDER BY key',
      [pattern]
    );

    const result: Record<string, any> = {};
    for (const row of rows) {
      try {
        result[row.key] = JSON.parse(row.value);
      } catch (error) {
        // If JSON parsing fails, store the raw string value
        result[row.key] = row.value;
      }
    }

    return result;
  }

  /**
   * Get multiple values by keys
   */
  async getMultiple<T = any>(keys: string[]): Promise<Record<string, T | null>> {
    if (!Array.isArray(keys) || keys.length === 0) {
      return {};
    }

    // Filter out invalid keys
    const validKeys = keys.filter(key => key && typeof key === 'string');
    if (validKeys.length === 0) {
      return {};
    }

    // Create placeholders for the IN clause
    const placeholders = validKeys.map(() => '?').join(',');
    
    const rows = this.executeStatementAll<{
      key: string;
      value: string;
      updated_at: number;
    }>(
      `get_multiple_state_${validKeys.length}`,
      `SELECT key, value, updated_at FROM persistence_state WHERE key IN (${placeholders})`,
      validKeys
    );

    const result: Record<string, T | null> = {};
    
    // Initialize all requested keys with null
    for (const key of keys) {
      result[key] = null;
    }

    // Fill in the values that were found
    for (const row of rows) {
      try {
        result[row.key] = JSON.parse(row.value) as T;
      } catch (error) {
        // If JSON parsing fails, store the raw string value
        result[row.key] = row.value as T;
      }
    }

    return result;
  }

  /**
   * Set multiple key-value pairs atomically
   */
  async setMultiple(operations: BatchStateOperation[]): Promise<void> {
    if (!Array.isArray(operations) || operations.length === 0) {
      return;
    }

    const now = this.getCurrentTimestamp();

    this.transaction((db) => {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO persistence_state (key, value, updated_at)
        VALUES (?, ?, ?)
      `);

      for (const operation of operations) {
        if (!operation.key || typeof operation.key !== 'string') {
          throw new Error('All operations must have valid string keys');
        }

        const serializedValue = typeof operation.value === 'string' 
          ? operation.value 
          : JSON.stringify(operation.value);

        stmt.run(operation.key, serializedValue, now);
      }
    });
  }

  /**
   * Delete multiple keys atomically
   */
  async deleteMultiple(keys: string[]): Promise<number> {
    if (!Array.isArray(keys) || keys.length === 0) {
      return 0;
    }

    // Filter out invalid keys
    const validKeys = keys.filter(key => key && typeof key === 'string');
    if (validKeys.length === 0) {
      return 0;
    }

    return this.transaction((db) => {
      const stmt = db.prepare('DELETE FROM persistence_state WHERE key = ?');
      let deletedCount = 0;

      for (const key of validKeys) {
        const result = stmt.run(key);
        deletedCount += result.changes;
      }

      return deletedCount;
    });
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!key || typeof key !== 'string') {
      return false;
    }

    const result = this.executeStatement<{ count: number }>(
      'state_exists',
      'SELECT COUNT(*) as count FROM persistence_state WHERE key = ? LIMIT 1',
      [key]
    );
    
    return result ? result.count > 0 : false;
  }

  /**
   * Get the timestamp when a key was last updated
   */
  async getTimestamp(key: string): Promise<number | null> {
    if (!key || typeof key !== 'string') {
      return null;
    }

    const row = this.executeStatement<{
      updated_at: number;
    }>(
      'get_state_timestamp',
      'SELECT updated_at FROM persistence_state WHERE key = ?',
      [key]
    );

    return row ? row.updated_at : null;
  }

  /**
   * Get all state records with metadata
   */
  async getAllWithMetadata(): Promise<PersistenceState[]> {
    const rows = this.executeStatementAll<{
      key: string;
      value: string;
      updated_at: number;
    }>(
      'get_all_state_with_metadata',
      'SELECT key, value, updated_at FROM persistence_state WHERE key != ? ORDER BY updated_at DESC',
      ['schema_version']
    );

    return rows.map(row => ({
      key: row.key,
      value: row.value,
      updatedAt: row.updated_at
    }));
  }

  /**
   * Clear all state (dangerous operation)
   */
  async clear(): Promise<number> {
    const result = this.executeStatementRun(
      'clear_all_state',
      'DELETE FROM persistence_state WHERE key != ?',
      ['schema_version']
    );

    return result.changes;
  }

  /**
   * Count total number of state keys
   */
  async count(): Promise<number> {
    const result = this.executeStatement<{ count: number }>(
      'count_state_keys',
      'SELECT COUNT(*) as count FROM persistence_state WHERE key != ?',
      ['schema_version']
    );
    
    return result.count;
  }

  /**
   * Get keys with pagination
   */
  async getKeys(limit?: number, offset?: number): Promise<string[]> {
    const pagination = this.validatePagination(limit, offset);

    const rows = this.executeStatementAll<{ key: string }>(
      'get_state_keys_paginated',
      'SELECT key FROM persistence_state WHERE key != ? ORDER BY key LIMIT ? OFFSET ?',
      ['schema_version', pagination.limit, pagination.offset]
    );

    return rows.map(row => row.key);
  }

  /**
   * Increment a numeric value atomically
   */
  async increment(key: string, delta: number = 1): Promise<number> {
    if (!key || typeof key !== 'string') {
      throw new Error('Key must be a non-empty string');
    }

    if (typeof delta !== 'number' || !isFinite(delta)) {
      throw new Error('Delta must be a finite number');
    }

    return this.transaction((db) => {
      // Get current value
      const currentRow = db.prepare('SELECT value FROM persistence_state WHERE key = ?').get(key) as { value: string } | undefined;
      
      let currentValue = 0;
      if (currentRow) {
        try {
          const parsed = JSON.parse(currentRow.value);
          if (typeof parsed === 'number' && isFinite(parsed)) {
            currentValue = parsed;
          }
        } catch (error) {
          // If parsing fails, assume 0
        }
      }

      const newValue = currentValue + delta;
      const now = this.getCurrentTimestamp();

      // Update or insert the new value
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO persistence_state (key, value, updated_at)
        VALUES (?, ?, ?)
      `);
      stmt.run(key, JSON.stringify(newValue), now);

      return newValue;
    });
  }
}