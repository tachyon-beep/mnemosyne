/**
 * Memory Manager - Advanced memory monitoring and management
 *
 * Provides real-time memory monitoring, pressure detection, and
 * automatic cleanup strategies to prevent OOM conditions.
 */
export class MemoryManager {
    config;
    memoryHistory = [];
    eventHandlers = [];
    monitoringInterval = null;
    isMonitoring = false;
    lastGCTime = 0;
    gcCallbacks = [];
    constructor(config = {}) {
        this.config = {
            heapWarningThreshold: 0.7,
            heapCriticalThreshold: 0.9,
            maxRssBytes: 1024 * 1024 * 1024, // 1GB
            gcThreshold: 0.8,
            monitoringInterval: 30000, // 30 seconds
            ...config
        };
    }
    /**
     * Start memory monitoring
     */
    startMonitoring() {
        if (this.isMonitoring)
            return;
        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this.checkMemoryPressure();
        }, this.config.monitoringInterval);
        console.log('Memory monitoring started');
    }
    /**
     * Stop memory monitoring
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        this.isMonitoring = false;
        console.log('Memory monitoring stopped');
    }
    /**
     * Get current memory statistics
     */
    getCurrentStats() {
        const memoryUsage = process.memoryUsage();
        return {
            rss: memoryUsage.rss,
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            external: memoryUsage.external,
            arrayBuffers: memoryUsage.arrayBuffers,
            timestamp: Date.now()
        };
    }
    /**
     * Calculate memory pressure level
     */
    getMemoryPressure(stats) {
        const currentStats = stats || this.getCurrentStats();
        const heapUsagePercent = currentStats.heapUsed / currentStats.heapTotal;
        const rssUsagePercent = currentStats.rss / this.config.maxRssBytes;
        let level = 'low';
        let recommendation = 'Memory usage is normal';
        if (heapUsagePercent >= this.config.heapCriticalThreshold || rssUsagePercent >= 0.95) {
            level = 'critical';
            recommendation = 'Critical memory pressure - immediate cleanup required';
        }
        else if (heapUsagePercent >= this.config.heapWarningThreshold || rssUsagePercent >= 0.8) {
            level = 'high';
            recommendation = 'High memory pressure - consider cleanup';
        }
        else if (heapUsagePercent >= 0.5 || rssUsagePercent >= 0.6) {
            level = 'medium';
            recommendation = 'Moderate memory usage - monitor closely';
        }
        return {
            level,
            heapUsagePercent,
            rssUsagePercent,
            recommendation
        };
    }
    /**
     * Register cleanup callback for GC events
     */
    onMemoryPressure(handler) {
        this.eventHandlers.push(handler);
    }
    /**
     * Register cleanup callback for manual GC
     */
    onGarbageCollection(callback) {
        this.gcCallbacks.push(callback);
    }
    /**
     * Force garbage collection with cleanup callbacks
     */
    async forceGarbageCollection() {
        const startTime = Date.now();
        const beforeStats = this.getCurrentStats();
        // Run cleanup callbacks first
        for (const callback of this.gcCallbacks) {
            try {
                await callback();
            }
            catch (error) {
                console.error('Error in GC cleanup callback:', error);
            }
        }
        // Force GC if available
        if (global.gc) {
            global.gc();
        }
        const afterStats = this.getCurrentStats();
        const duration = Date.now() - startTime;
        const memoryFreed = beforeStats.heapUsed - afterStats.heapUsed;
        this.lastGCTime = Date.now();
        console.log(`GC completed in ${duration}ms, freed ${this.formatBytes(memoryFreed)}`);
    }
    /**
     * Get memory usage trends
     */
    getMemoryTrends() {
        if (this.memoryHistory.length < 2) {
            return {
                averageHeapUsage: 0,
                peakHeapUsage: 0,
                averageRss: 0,
                peakRss: 0,
                growthRate: 0,
                recommendations: ['Insufficient data for trend analysis']
            };
        }
        const recent = this.memoryHistory.slice(-20); // Last 20 readings
        const averageHeapUsage = recent.reduce((sum, stat) => sum + stat.heapUsed, 0) / recent.length;
        const peakHeapUsage = Math.max(...recent.map(stat => stat.heapUsed));
        const averageRss = recent.reduce((sum, stat) => sum + stat.rss, 0) / recent.length;
        const peakRss = Math.max(...recent.map(stat => stat.rss));
        // Calculate growth rate (bytes per minute)
        const timespan = recent[recent.length - 1].timestamp - recent[0].timestamp;
        const heapGrowth = recent[recent.length - 1].heapUsed - recent[0].heapUsed;
        const growthRate = timespan > 0 ? (heapGrowth / timespan) * 60000 : 0; // per minute
        const recommendations = [];
        if (growthRate > 1024 * 1024) { // Growing by more than 1MB per minute
            recommendations.push('Memory usage is growing rapidly - check for memory leaks');
        }
        if (peakHeapUsage > averageHeapUsage * 1.5) {
            recommendations.push('High memory spikes detected - consider more frequent cleanup');
        }
        if (averageHeapUsage > this.config.maxRssBytes * 0.6) {
            recommendations.push('Consider increasing memory limits or optimizing data structures');
        }
        return {
            averageHeapUsage,
            peakHeapUsage,
            averageRss,
            peakRss,
            growthRate,
            recommendations
        };
    }
    /**
     * Get memory report for monitoring
     */
    getMemoryReport() {
        const current = this.getCurrentStats();
        const pressure = this.getMemoryPressure(current);
        const trends = this.getMemoryTrends();
        return {
            current,
            pressure,
            trends,
            formattedStats: {
                rss: this.formatBytes(current.rss),
                heapUsed: this.formatBytes(current.heapUsed),
                heapTotal: this.formatBytes(current.heapTotal),
                external: this.formatBytes(current.external)
            }
        };
    }
    /**
     * Create memory-efficient object pool
     */
    createObjectPool(factory, reset, maxSize = 100) {
        const pool = [];
        let created = 0;
        return {
            acquire: () => {
                if (pool.length > 0) {
                    return pool.pop();
                }
                created++;
                return factory();
            },
            release: (obj) => {
                if (pool.length < maxSize) {
                    reset(obj);
                    pool.push(obj);
                }
                // If pool is full, let the object be garbage collected
            },
            size: () => pool.length,
            clear: () => {
                pool.length = 0;
            }
        };
    }
    /**
     * Create weak reference cache
     */
    createWeakCache() {
        const cache = new Map();
        const cleanupRegistry = new FinalizationRegistry((key) => {
            cache.delete(key);
        });
        return {
            set: (key, value) => {
                const existingRef = cache.get(key);
                if (existingRef) {
                    const existing = existingRef.deref();
                    if (existing) {
                        // Update existing value
                        cleanupRegistry.unregister(existing);
                    }
                }
                const weakRef = new WeakRef(value);
                cache.set(key, weakRef);
                cleanupRegistry.register(value, key);
            },
            get: (key) => {
                const weakRef = cache.get(key);
                if (!weakRef)
                    return undefined;
                const value = weakRef.deref();
                if (!value) {
                    cache.delete(key);
                    return undefined;
                }
                return value;
            },
            delete: (key) => {
                const weakRef = cache.get(key);
                if (weakRef) {
                    const value = weakRef.deref();
                    if (value) {
                        cleanupRegistry.unregister(value);
                    }
                }
                return cache.delete(key);
            },
            clear: () => {
                cache.clear();
            },
            size: () => {
                // Clean up dead references first
                const keysToDelete = [];
                for (const [key, weakRef] of cache.entries()) {
                    if (!weakRef.deref()) {
                        keysToDelete.push(key);
                    }
                }
                keysToDelete.forEach(key => cache.delete(key));
                return cache.size;
            }
        };
    }
    async checkMemoryPressure() {
        const stats = this.getCurrentStats();
        const pressure = this.getMemoryPressure(stats);
        // Store history (keep last 100 readings)
        this.memoryHistory.push(stats);
        if (this.memoryHistory.length > 100) {
            this.memoryHistory = this.memoryHistory.slice(-50);
        }
        // Trigger cleanup if needed
        if (pressure.level === 'critical' ||
            (pressure.level === 'high' && Date.now() - this.lastGCTime > 60000)) {
            console.warn(`Memory pressure detected: ${pressure.level} - ${pressure.recommendation}`);
            // Notify event handlers
            for (const handler of this.eventHandlers) {
                try {
                    await handler(stats, pressure);
                }
                catch (error) {
                    console.error('Error in memory pressure handler:', error);
                }
            }
            // Suggest GC for high pressure
            if (pressure.level === 'high' || pressure.level === 'critical') {
                await this.forceGarbageCollection();
            }
        }
    }
    formatBytes(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0)
            return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        const size = bytes / Math.pow(1024, i);
        return `${size.toFixed(2)} ${sizes[i]}`;
    }
}
//# sourceMappingURL=MemoryManager.js.map