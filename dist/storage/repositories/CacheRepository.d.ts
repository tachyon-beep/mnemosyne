/**
 * Cache Repository - Operations for summary cache management
 *
 * This repository provides:
 * - Cache storage and retrieval with TTL support
 * - LRU-style access tracking and cleanup
 * - Pattern-based cache invalidation
 * - Cache statistics and monitoring
 * - Automatic cleanup of expired entries
 */
import { SummaryCache } from '../../types/interfaces.js';
import { ICacheRepository, CacheSetData, CacheStats } from '../../types/repositories.js';
import { BaseRepository } from './BaseRepository.js';
/**
 * Repository for summary cache operations
 */
export declare class CacheRepository extends BaseRepository implements ICacheRepository {
    /**
     * Get cached data by key
     */
    get(key: string): Promise<SummaryCache | null>;
    /**
     * Set cached data with optional TTL
     */
    set(key: string, data: CacheSetData, _ttlHours?: number): Promise<SummaryCache>;
    /**
     * Invalidate cache entries matching a pattern
     * Pattern supports SQL LIKE syntax (% and _ wildcards)
     */
    invalidate(pattern: string): Promise<number>;
    /**
     * Clean up expired cache entries based on TTL and LRU
     */
    cleanup(): Promise<number>;
    /**
     * Update access time and count for a cache entry
     */
    updateAccess(id: string): Promise<void>;
    /**
     * Get cache statistics
     */
    getStats(): Promise<CacheStats>;
    /**
     * Find cache entries by summary ID
     */
    findBySummaryId(summaryId: string): Promise<SummaryCache[]>;
    /**
     * Get recently accessed cache entries
     */
    findRecentlyAccessed(limit?: number): Promise<SummaryCache[]>;
    /**
     * Check if cache entry exists
     */
    exists(key: string): Promise<boolean>;
    /**
     * Delete a specific cache entry by key
     */
    delete(key: string): Promise<boolean>;
    /**
     * Clean up cache if needed (internal helper)
     */
    private cleanupIfNeeded;
    /**
     * Map database row to SummaryCache object
     */
    private mapRowToCache;
}
//# sourceMappingURL=CacheRepository.d.ts.map