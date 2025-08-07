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
export declare class StateRepository extends BaseRepository {
    /**
     * Get a value by key
     */
    get<T = any>(key: string): Promise<T | null>;
    /**
     * Set a value for a key
     */
    set(key: string, value: any): Promise<void>;
    /**
     * Delete a key-value pair
     */
    delete(key: string): Promise<boolean>;
    /**
     * Get all key-value pairs
     */
    getAll(): Promise<Record<string, any>>;
    /**
     * Get all keys matching a pattern
     */
    getByPattern(pattern: string): Promise<Record<string, any>>;
    /**
     * Get multiple values by keys
     */
    getMultiple<T = any>(keys: string[]): Promise<Record<string, T | null>>;
    /**
     * Set multiple key-value pairs atomically
     */
    setMultiple(operations: BatchStateOperation[]): Promise<void>;
    /**
     * Delete multiple keys atomically
     */
    deleteMultiple(keys: string[]): Promise<number>;
    /**
     * Check if a key exists
     */
    exists(key: string): Promise<boolean>;
    /**
     * Get the timestamp when a key was last updated
     */
    getTimestamp(key: string): Promise<number | null>;
    /**
     * Get all state records with metadata
     */
    getAllWithMetadata(): Promise<PersistenceState[]>;
    /**
     * Clear all state (dangerous operation)
     */
    clear(): Promise<number>;
    /**
     * Count total number of state keys
     */
    count(): Promise<number>;
    /**
     * Get keys with pagination
     */
    getKeys(limit?: number, offset?: number): Promise<string[]>;
    /**
     * Increment a numeric value atomically
     */
    increment(key: string, delta?: number): Promise<number>;
}
//# sourceMappingURL=StateRepository.d.ts.map