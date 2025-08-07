/**
 * Query Optimizer - Advanced query optimization and caching
 *
 * Provides intelligent query optimization, result caching, and
 * performance monitoring for database operations.
 */
import { DatabaseManager } from './Database.js';
interface QueryPlan {
    sql: string;
    estimatedCost: number;
    usesFTS: boolean;
    usesIndexes: string[];
    recommendations: string[];
}
export declare class QueryOptimizer {
    private dbManager;
    private queryCache;
    private queryMetrics;
    private maxCacheSize;
    private defaultTTL;
    constructor(dbManager: DatabaseManager, options?: {
        maxCacheSize?: number;
        defaultTTL?: number;
    });
    /**
     * Create optimized indexes for common query patterns
     */
    createOptimizedIndexes(): Promise<void>;
    /**
     * Analyze query performance and provide recommendations
     */
    analyzeQuery(sql: string, params?: any[]): QueryPlan;
    /**
     * Execute query with caching and metrics
     */
    executeWithCache<T>(sql: string, params?: any[], options?: {
        cacheKey?: string;
        ttl?: number;
        forceRefresh?: boolean;
    }): Promise<T>;
    /**
     * Optimize bulk insert operations
     */
    bulkInsert(tableName: string, columns: string[], data: any[][], options?: {
        batchSize?: number;
        useTransaction?: boolean;
    }): Promise<void>;
    /**
     * Get query performance recommendations
     */
    getPerformanceReport(): {
        slowQueries: Array<{
            query: string;
            avgExecutionTime: number;
            executionCount: number;
            recommendations: string[];
        }>;
        cacheStats: {
            hitRate: number;
            totalQueries: number;
            cacheSize: number;
        };
        indexRecommendations: string[];
    };
    /**
     * Clear query cache
     */
    clearCache(): void;
    /**
     * Clear performance metrics
     */
    clearMetrics(): void;
    private generateCacheKey;
    private getCached;
    private setCached;
    private evictOldEntries;
    private recordMetrics;
    private normalizeQuery;
}
export {};
//# sourceMappingURL=QueryOptimizer.d.ts.map