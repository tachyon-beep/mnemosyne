/**
 * Memory Manager - Advanced memory monitoring and management
 *
 * Provides real-time memory monitoring, pressure detection, and
 * automatic cleanup strategies to prevent OOM conditions.
 */
interface MemoryStats {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
    timestamp: number;
}
interface MemoryPressureLevel {
    level: 'low' | 'medium' | 'high' | 'critical';
    heapUsagePercent: number;
    rssUsagePercent: number;
    recommendation: string;
}
interface MemoryManagerConfig {
    /** Warning threshold for heap usage (default: 0.7 = 70%) */
    heapWarningThreshold: number;
    /** Critical threshold for heap usage (default: 0.9 = 90%) */
    heapCriticalThreshold: number;
    /** Maximum RSS in bytes (default: 1GB) */
    maxRssBytes: number;
    /** GC suggestion threshold (default: 0.8 = 80%) */
    gcThreshold: number;
    /** Monitoring interval in ms (default: 30000 = 30 seconds) */
    monitoringInterval: number;
}
type MemoryEventHandler = (stats: MemoryStats, pressure: MemoryPressureLevel) => Promise<void>;
export declare class MemoryManager {
    private config;
    private memoryHistory;
    private eventHandlers;
    private monitoringInterval;
    private isMonitoring;
    private lastGCTime;
    private gcCallbacks;
    constructor(config?: Partial<MemoryManagerConfig>);
    /**
     * Start memory monitoring
     */
    startMonitoring(): void;
    /**
     * Stop memory monitoring
     */
    stopMonitoring(): void;
    /**
     * Get current memory statistics
     */
    getCurrentStats(): MemoryStats;
    /**
     * Calculate memory pressure level
     */
    getMemoryPressure(stats?: MemoryStats): MemoryPressureLevel;
    /**
     * Register cleanup callback for GC events
     */
    onMemoryPressure(handler: MemoryEventHandler): void;
    /**
     * Register cleanup callback for manual GC
     */
    onGarbageCollection(callback: () => Promise<void>): void;
    /**
     * Force garbage collection with cleanup callbacks
     */
    forceGarbageCollection(): Promise<void>;
    /**
     * Get memory usage trends
     */
    getMemoryTrends(): {
        averageHeapUsage: number;
        peakHeapUsage: number;
        averageRss: number;
        peakRss: number;
        growthRate: number;
        recommendations: string[];
    };
    /**
     * Get memory report for monitoring
     */
    getMemoryReport(): {
        current: MemoryStats;
        pressure: MemoryPressureLevel;
        trends: {
            averageHeapUsage: number;
            peakHeapUsage: number;
            averageRss: number;
            peakRss: number;
            growthRate: number;
            recommendations: string[];
        };
        formattedStats: {
            rss: string;
            heapUsed: string;
            heapTotal: string;
            external: string;
        };
    };
    /**
     * Create memory-efficient object pool
     */
    createObjectPool<T>(factory: () => T, reset: (obj: T) => void, maxSize?: number): {
        acquire: () => T;
        release: (obj: T) => void;
        size: () => number;
        clear: () => void;
    };
    /**
     * Create weak reference cache
     */
    createWeakCache<K, V extends object>(): {
        set: (key: K, value: V) => void;
        get: (key: K) => V | undefined;
        delete: (key: K) => boolean;
        clear: () => void;
        size: () => number;
    };
    private checkMemoryPressure;
    private formatBytes;
}
export {};
//# sourceMappingURL=MemoryManager.d.ts.map