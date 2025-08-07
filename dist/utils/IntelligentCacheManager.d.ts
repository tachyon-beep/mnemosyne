/**
 * Intelligent Cache Manager - Advanced caching with adaptive strategies
 *
 * This class provides:
 * - Multi-tier caching with intelligent eviction policies
 * - Adaptive cache sizing based on system resources
 * - Cache warming and preloading strategies
 * - Cross-system cache coordination
 * - Performance-aware cache management
 */
import { EventEmitter } from 'events';
import { MemoryManager } from './MemoryManager.js';
interface CacheStats {
    hits: number;
    misses: number;
    evictions: number;
    totalSize: number;
    entryCount: number;
    hitRate: number;
    averageAccessTime: number;
}
export interface CacheConfig {
    /** Maximum total memory for all caches in bytes */
    maxTotalMemory: number;
    /** L1 cache size (hot data) */
    l1Size: number;
    /** L2 cache size (warm data) */
    l2Size: number;
    /** L3 cache size (cold data) */
    l3Size: number;
    /** Default TTL in milliseconds */
    defaultTTL: number;
    /** Enable adaptive sizing */
    enableAdaptiveSizing: boolean;
    /** Memory pressure threshold for cache reduction */
    memoryPressureThreshold: number;
    /** Enable cache warming */
    enableCacheWarming: boolean;
}
export declare class IntelligentCacheManager<T = any> extends EventEmitter {
    private memoryManager;
    private config;
    private tiers;
    private globalStats;
    private adaptiveSizingInterval;
    private isActive;
    private accessPatterns;
    constructor(memoryManager: MemoryManager, config?: Partial<CacheConfig>);
    /**
     * Start intelligent cache management
     */
    start(): void;
    /**
     * Stop cache management
     */
    stop(): void;
    /**
     * Get value from cache with intelligent tier selection
     */
    get(key: string): Promise<T | null>;
    /**
     * Set value in cache with intelligent tier placement
     */
    set(key: string, value: T, options?: {
        ttl?: number;
        priority?: 'low' | 'medium' | 'high' | 'critical';
        cost?: number;
        size?: number;
    }): Promise<void>;
    /**
     * Remove key from all tiers
     */
    delete(key: string): boolean;
    /**
     * Clear all caches
     */
    clear(): void;
    /**
     * Warm cache with frequently accessed data
     */
    warmCache(warmingStrategies: Array<{
        keys: string[];
        loader: (key: string) => Promise<T>;
        priority?: 'low' | 'medium' | 'high' | 'critical';
    }>): Promise<void>;
    /**
     * Get comprehensive cache statistics
     */
    getStats(): {
        global: CacheStats;
        tiers: Record<string, CacheStats>;
        efficiency: {
            memoryUtilization: number;
            averageEntrySize: number;
            hotDataRatio: number;
        };
        recommendations: string[];
    };
    /**
     * Optimize cache performance
     */
    optimizeCache(): Promise<{
        optimizations: string[];
        memoryFreed: number;
        performanceImprovement: number;
    }>;
    private initializeTiers;
    private selectInitialTier;
    private ensureSpace;
    private evictFromTier;
    private tryDemote;
    private considerPromotion;
    private shouldPromoteEntry;
    private findLRUVictim;
    private findLFUVictim;
    private findTLRUVictim;
    private findARCVictim;
    private removeFromTier;
    private trackAccess;
    private updateHitRates;
    private performAdaptiveSizing;
    private shrinkCaches;
    private expandCaches;
    private resizeTier;
    private rebalanceTiers;
    private getOptimalTierForPattern;
    private compactCache;
    private generateCacheRecommendations;
    private setupMemoryPressureHandler;
    private estimateSize;
}
export {};
//# sourceMappingURL=IntelligentCacheManager.d.ts.map