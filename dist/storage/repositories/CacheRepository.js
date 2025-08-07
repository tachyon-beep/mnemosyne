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
import { BaseRepository } from './BaseRepository.js';
/**
 * Default cache TTL in hours
 */
const DEFAULT_CACHE_TTL_HOURS = 24;
/**
 * Maximum cache entries before cleanup
 */
const MAX_CACHE_ENTRIES = 1000;
/**
 * Repository for summary cache operations
 */
export class CacheRepository extends BaseRepository {
    /**
     * Get cached data by key
     */
    async get(key) {
        if (!key || key.trim().length === 0) {
            return null;
        }
        const row = this.executeStatement('find_cache_by_key', `SELECT id, cache_key, summary_ids, assembled_context, token_count,
              created_at, accessed_at, access_count
       FROM summary_cache
       WHERE cache_key = ?`, [key]);
        if (!row) {
            return null;
        }
        // Update access time and count in background
        this.updateAccess(row.id).catch(() => {
            // Silently ignore access update failures
        });
        return this.mapRowToCache(row);
    }
    /**
     * Set cached data with optional TTL
     */
    async set(key, data, _ttlHours) {
        if (!key || key.trim().length === 0) {
            throw new Error('Cache key cannot be empty');
        }
        if (!data.summaryIds || data.summaryIds.length === 0) {
            throw new Error('Summary IDs cannot be empty');
        }
        const id = this.generateId();
        const now = this.getCurrentTimestamp();
        // Convert summary IDs array to comma-separated string
        const summaryIdsStr = data.summaryIds.join(',');
        const cache = {
            id,
            cacheKey: key,
            summaryIds: summaryIdsStr,
            assembledContext: data.assembledContext,
            tokenCount: data.tokenCount,
            createdAt: now,
            accessedAt: now,
            accessCount: 1
        };
        try {
            // Use INSERT OR REPLACE to handle key conflicts
            this.executeStatementRun('upsert_cache', `INSERT OR REPLACE INTO summary_cache (
          id, cache_key, summary_ids, assembled_context, token_count,
          created_at, accessed_at, access_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                cache.id,
                cache.cacheKey,
                cache.summaryIds,
                cache.assembledContext,
                cache.tokenCount,
                cache.createdAt,
                cache.accessedAt,
                cache.accessCount
            ]);
            // Trigger cleanup if we have too many entries
            this.cleanupIfNeeded().catch(() => {
                // Silently ignore cleanup failures
            });
            return cache;
        }
        catch (error) {
            this.handleConstraintError(error, 'Cache entry');
        }
    }
    /**
     * Invalidate cache entries matching a pattern
     * Pattern supports SQL LIKE syntax (% and _ wildcards)
     */
    async invalidate(pattern) {
        if (!pattern || pattern.trim().length === 0) {
            return 0;
        }
        const result = this.executeStatementRun('invalidate_cache_pattern', 'DELETE FROM summary_cache WHERE cache_key LIKE ?', [pattern]);
        return result.changes;
    }
    /**
     * Clean up expired cache entries based on TTL and LRU
     */
    async cleanup() {
        const now = this.getCurrentTimestamp();
        const defaultTtlMs = DEFAULT_CACHE_TTL_HOURS * 60 * 60 * 1000;
        const expiredTimestamp = now - defaultTtlMs;
        return this.transaction((_db) => {
            // First, delete truly expired entries (older than TTL)
            const expiredResult = this.executeStatementRun('cleanup_expired_cache', 'DELETE FROM summary_cache WHERE created_at < ?', [expiredTimestamp]);
            let totalDeleted = expiredResult.changes;
            // Then, if we still have too many entries, delete least recently used
            const countResult = this.executeStatement('count_cache_entries', 'SELECT COUNT(*) as count FROM summary_cache');
            const currentCount = countResult?.count || 0;
            if (currentCount > MAX_CACHE_ENTRIES) {
                const excessCount = currentCount - MAX_CACHE_ENTRIES;
                const lruResult = this.executeStatementRun('cleanup_lru_cache', `DELETE FROM summary_cache 
           WHERE id IN (
             SELECT id FROM summary_cache 
             ORDER BY accessed_at ASC, access_count ASC 
             LIMIT ?
           )`, [excessCount]);
                totalDeleted += lruResult.changes;
            }
            return totalDeleted;
        });
    }
    /**
     * Update access time and count for a cache entry
     */
    async updateAccess(id) {
        if (!this.isValidUUID(id)) {
            return;
        }
        const now = this.getCurrentTimestamp();
        this.executeStatementRun('update_cache_access', `UPDATE summary_cache 
       SET accessed_at = ?, access_count = access_count + 1
       WHERE id = ?`, [now, id]);
    }
    /**
     * Get cache statistics
     */
    async getStats() {
        const statsRow = this.executeStatement('get_cache_stats', `SELECT 
        COUNT(*) as total_entries,
        AVG(access_count) as average_access_count,
        MIN(created_at) as oldest_entry,
        MAX(created_at) as newest_entry,
        SUM(LENGTH(assembled_context)) as total_size_bytes
       FROM summary_cache`);
        return {
            totalEntries: statsRow?.total_entries || 0,
            totalSizeBytes: statsRow?.total_size_bytes || 0,
            averageAccessCount: statsRow?.average_access_count || 0,
            oldestEntry: statsRow?.oldest_entry || undefined,
            newestEntry: statsRow?.newest_entry || undefined,
            hitRate: undefined // Hit rate calculation would require request tracking
        };
    }
    /**
     * Find cache entries by summary ID
     */
    async findBySummaryId(summaryId) {
        if (!this.isValidUUID(summaryId)) {
            return [];
        }
        const rows = this.executeStatementAll('find_cache_by_summary_id', `SELECT id, cache_key, summary_ids, assembled_context, token_count,
              created_at, accessed_at, access_count
       FROM summary_cache
       WHERE summary_ids LIKE ?
       ORDER BY accessed_at DESC`, [`%${summaryId}%`]);
        return rows
            .filter(row => {
            // More precise check to ensure summaryId is actually in the list
            const summaryIds = row.summary_ids.split(',').map(id => id.trim());
            return summaryIds.includes(summaryId);
        })
            .map(row => this.mapRowToCache(row));
    }
    /**
     * Get recently accessed cache entries
     */
    async findRecentlyAccessed(limit = 10) {
        const validatedLimit = Math.min(Math.max(limit, 1), 100);
        const rows = this.executeStatementAll('find_recently_accessed_cache', `SELECT id, cache_key, summary_ids, assembled_context, token_count,
              created_at, accessed_at, access_count
       FROM summary_cache
       ORDER BY accessed_at DESC
       LIMIT ?`, [validatedLimit]);
        return rows.map(row => this.mapRowToCache(row));
    }
    /**
     * Check if cache entry exists
     */
    async exists(key) {
        if (!key || key.trim().length === 0) {
            return false;
        }
        const result = this.executeStatement('cache_exists', 'SELECT 1 as count FROM summary_cache WHERE cache_key = ? LIMIT 1', [key]);
        return !!result;
    }
    /**
     * Delete a specific cache entry by key
     */
    async delete(key) {
        if (!key || key.trim().length === 0) {
            return false;
        }
        const result = this.executeStatementRun('delete_cache_by_key', 'DELETE FROM summary_cache WHERE cache_key = ?', [key]);
        return result.changes > 0;
    }
    /**
     * Clean up cache if needed (internal helper)
     */
    async cleanupIfNeeded() {
        const stats = await this.getStats();
        if (stats.totalEntries > MAX_CACHE_ENTRIES) {
            await this.cleanup();
        }
    }
    /**
     * Map database row to SummaryCache object
     */
    mapRowToCache(row) {
        return {
            id: row.id,
            cacheKey: row.cache_key,
            summaryIds: row.summary_ids,
            assembledContext: row.assembled_context,
            tokenCount: row.token_count,
            createdAt: row.created_at,
            accessedAt: row.accessed_at,
            accessCount: row.access_count
        };
    }
}
//# sourceMappingURL=CacheRepository.js.map