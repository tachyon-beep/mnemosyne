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
import { SizeEstimator } from './SizeEstimator.js';
export class IntelligentCacheManager extends EventEmitter {
    memoryManager;
    config;
    tiers = new Map();
    globalStats;
    adaptiveSizingInterval = null;
    isActive = false;
    // Cache access patterns tracking
    accessPatterns = new Map();
    constructor(memoryManager, config = {}) {
        super();
        this.memoryManager = memoryManager;
        this.config = {
            maxTotalMemory: 100 * 1024 * 1024, // 100MB
            l1Size: 10 * 1024 * 1024, // 10MB - Hot data
            l2Size: 30 * 1024 * 1024, // 30MB - Warm data  
            l3Size: 60 * 1024 * 1024, // 60MB - Cold data
            defaultTTL: 300000, // 5 minutes
            enableAdaptiveSizing: true,
            memoryPressureThreshold: 0.8,
            enableCacheWarming: true,
            ...config
        };
        this.globalStats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            totalSize: 0,
            entryCount: 0,
            hitRate: 0,
            averageAccessTime: 0
        };
        this.initializeTiers();
        this.setupMemoryPressureHandler();
    }
    /**
     * Start intelligent cache management
     */
    start() {
        if (this.isActive)
            return;
        this.isActive = true;
        // Start adaptive sizing if enabled
        if (this.config.enableAdaptiveSizing) {
            this.adaptiveSizingInterval = setInterval(() => {
                this.performAdaptiveSizing();
            }, 60000); // Every minute
        }
        console.log('Intelligent cache manager started');
        this.emit('cache:started');
    }
    /**
     * Stop cache management
     */
    stop() {
        if (!this.isActive)
            return;
        this.isActive = false;
        if (this.adaptiveSizingInterval) {
            clearInterval(this.adaptiveSizingInterval);
            this.adaptiveSizingInterval = null;
        }
        console.log('Intelligent cache manager stopped');
        this.emit('cache:stopped');
    }
    /**
     * Get value from cache with intelligent tier selection
     */
    async get(key) {
        const startTime = Date.now();
        // Search through tiers in order
        for (const tier of this.tiers.values()) {
            const entry = tier.entries.get(key);
            if (entry) {
                // Check if entry is still valid
                if (Date.now() - entry.timestamp <= entry.ttl) {
                    // Update access statistics
                    entry.lastAccess = Date.now();
                    entry.accessCount++;
                    // Promote frequently accessed items to higher tier
                    await this.considerPromotion(key, entry, tier);
                    // Update global and tier stats
                    tier.stats.hits++;
                    this.globalStats.hits++;
                    // Track access pattern
                    this.trackAccess(key, Date.now() - startTime);
                    this.updateHitRates();
                    return entry.value;
                }
                else {
                    // Expired entry - remove it
                    this.removeFromTier(key, tier);
                }
            }
        }
        // Cache miss
        this.globalStats.misses++;
        this.tiers.forEach(tier => tier.stats.misses++);
        this.updateHitRates();
        // Track access pattern for misses
        this.trackAccess(key, Date.now() - startTime);
        return null;
    }
    /**
     * Set value in cache with intelligent tier placement
     */
    async set(key, value, options = {}) {
        const entry = {
            key,
            value,
            size: options.size || this.estimateSize(value),
            timestamp: Date.now(),
            lastAccess: Date.now(),
            accessCount: 1,
            ttl: options.ttl || this.config.defaultTTL,
            priority: options.priority || 'medium',
            cost: options.cost || 1
        };
        // Determine initial tier based on priority and access patterns
        const targetTier = this.selectInitialTier(key, entry);
        // Ensure space is available
        await this.ensureSpace(targetTier, entry.size);
        // Remove from other tiers if exists
        for (const [tierName, tier] of this.tiers) {
            if (tierName !== targetTier.name) {
                this.removeFromTier(key, tier);
            }
        }
        // Add to target tier
        targetTier.entries.set(key, entry);
        targetTier.stats.entryCount++;
        targetTier.stats.totalSize += entry.size;
        this.globalStats.entryCount++;
        this.globalStats.totalSize += entry.size;
        this.emit('cache:set', { key, tier: targetTier.name, size: entry.size });
    }
    /**
     * Remove key from all tiers
     */
    delete(key) {
        let found = false;
        for (const tier of this.tiers.values()) {
            if (this.removeFromTier(key, tier)) {
                found = true;
            }
        }
        if (found) {
            this.accessPatterns.delete(key);
        }
        return found;
    }
    /**
     * Clear all caches
     */
    clear() {
        for (const tier of this.tiers.values()) {
            tier.entries.clear();
            tier.stats = {
                hits: 0,
                misses: 0,
                evictions: 0,
                totalSize: 0,
                entryCount: 0,
                hitRate: 0,
                averageAccessTime: 0
            };
        }
        this.globalStats = {
            hits: 0,
            misses: 0,
            evictions: 0,
            totalSize: 0,
            entryCount: 0,
            hitRate: 0,
            averageAccessTime: 0
        };
        this.accessPatterns.clear();
        this.emit('cache:cleared');
    }
    /**
     * Warm cache with frequently accessed data
     */
    async warmCache(warmingStrategies) {
        if (!this.config.enableCacheWarming)
            return;
        for (const strategy of warmingStrategies) {
            for (const key of strategy.keys) {
                try {
                    // Check if already cached
                    const existing = await this.get(key);
                    if (existing !== null)
                        continue;
                    // Load and cache
                    const value = await strategy.loader(key);
                    await this.set(key, value, {
                        priority: strategy.priority || 'medium',
                        cost: 5 // Higher cost since we proactively loaded it
                    });
                }
                catch (error) {
                    console.warn(`Cache warming failed for key ${key}:`, error);
                }
            }
        }
        this.emit('cache:warmed', { strategies: warmingStrategies.length });
    }
    /**
     * Get comprehensive cache statistics
     */
    getStats() {
        const tierStats = {};
        for (const [name, tier] of this.tiers) {
            tierStats[name] = { ...tier.stats };
        }
        // Calculate efficiency metrics
        const l1Tier = this.tiers.get('L1');
        const totalEntries = this.globalStats.entryCount;
        const l1Entries = l1Tier ? l1Tier.stats.entryCount : 0;
        const efficiency = {
            memoryUtilization: this.globalStats.totalSize / this.config.maxTotalMemory,
            averageEntrySize: totalEntries > 0 ? this.globalStats.totalSize / totalEntries : 0,
            hotDataRatio: totalEntries > 0 ? l1Entries / totalEntries : 0
        };
        // Generate recommendations
        const recommendations = this.generateCacheRecommendations(efficiency);
        return {
            global: { ...this.globalStats },
            tiers: tierStats,
            efficiency,
            recommendations
        };
    }
    /**
     * Optimize cache performance
     */
    async optimizeCache() {
        const optimizations = [];
        const beforeSize = this.globalStats.totalSize;
        const beforeHitRate = this.globalStats.hitRate;
        // 1. Evict expired entries
        let expiredCount = 0;
        for (const tier of this.tiers.values()) {
            for (const [key, entry] of tier.entries) {
                if (Date.now() - entry.timestamp > entry.ttl) {
                    this.removeFromTier(key, tier);
                    expiredCount++;
                }
            }
        }
        if (expiredCount > 0) {
            optimizations.push(`Removed ${expiredCount} expired entries`);
        }
        // 2. Rebalance tiers based on access patterns
        await this.rebalanceTiers();
        optimizations.push('Rebalanced cache tiers');
        // 3. Optimize tier sizes if adaptive sizing is enabled
        if (this.config.enableAdaptiveSizing) {
            await this.performAdaptiveSizing();
            optimizations.push('Adjusted tier sizes');
        }
        // 4. Compact fragmented entries
        await this.compactCache();
        optimizations.push('Compacted cache storage');
        const memoryFreed = beforeSize - this.globalStats.totalSize;
        const performanceImprovement = this.globalStats.hitRate - beforeHitRate;
        return {
            optimizations,
            memoryFreed,
            performanceImprovement
        };
    }
    initializeTiers() {
        // L1 - Hot data (most frequently accessed)
        this.tiers.set('L1', {
            name: 'L1',
            maxSize: this.config.l1Size,
            entries: new Map(),
            policy: 'LFU', // Least Frequently Used for hot data
            stats: {
                hits: 0,
                misses: 0,
                evictions: 0,
                totalSize: 0,
                entryCount: 0,
                hitRate: 0,
                averageAccessTime: 0
            }
        });
        // L2 - Warm data (moderately accessed)
        this.tiers.set('L2', {
            name: 'L2',
            maxSize: this.config.l2Size,
            entries: new Map(),
            policy: 'TLRU', // Time-aware LRU
            stats: {
                hits: 0,
                misses: 0,
                evictions: 0,
                totalSize: 0,
                entryCount: 0,
                hitRate: 0,
                averageAccessTime: 0
            }
        });
        // L3 - Cold data (infrequently accessed)
        this.tiers.set('L3', {
            name: 'L3',
            maxSize: this.config.l3Size,
            entries: new Map(),
            policy: 'LRU', // Simple LRU for cold data
            stats: {
                hits: 0,
                misses: 0,
                evictions: 0,
                totalSize: 0,
                entryCount: 0,
                hitRate: 0,
                averageAccessTime: 0
            }
        });
    }
    selectInitialTier(key, entry) {
        // High priority items go to L1
        if (entry.priority === 'critical' || entry.priority === 'high') {
            return this.tiers.get('L1');
        }
        // Check access patterns
        const pattern = this.accessPatterns.get(key);
        if (pattern && pattern.frequency > 10) {
            return this.tiers.get('L1'); // Frequently accessed
        }
        // Default to L2 for medium priority, L3 for low priority
        if (entry.priority === 'low') {
            return this.tiers.get('L3');
        }
        return this.tiers.get('L2');
    }
    async ensureSpace(tier, requiredSize) {
        while (tier.stats.totalSize + requiredSize > tier.maxSize) {
            const evicted = await this.evictFromTier(tier);
            if (!evicted)
                break; // No more entries to evict
        }
    }
    async evictFromTier(tier) {
        if (tier.entries.size === 0)
            return false;
        let victimKey = null;
        let victimEntry = null;
        switch (tier.policy) {
            case 'LRU':
                victimEntry = this.findLRUVictim(tier);
                break;
            case 'LFU':
                victimEntry = this.findLFUVictim(tier);
                break;
            case 'TLRU':
                victimEntry = this.findTLRUVictim(tier);
                break;
            case 'ARC':
                victimEntry = this.findARCVictim(tier);
                break;
        }
        if (victimEntry) {
            victimKey = victimEntry.key;
            // Try to demote to lower tier instead of complete eviction
            if (await this.tryDemote(victimKey, victimEntry, tier)) {
                this.removeFromTier(victimKey, tier);
                return true;
            }
            else {
                // Complete eviction
                this.removeFromTier(victimKey, tier);
                tier.stats.evictions++;
                this.globalStats.evictions++;
                this.emit('cache:evicted', { key: victimKey, tier: tier.name });
                return true;
            }
        }
        return false;
    }
    async tryDemote(key, entry, currentTier) {
        // Try to move to next lower tier
        let targetTier = null;
        if (currentTier.name === 'L1') {
            targetTier = this.tiers.get('L2');
        }
        else if (currentTier.name === 'L2') {
            targetTier = this.tiers.get('L3');
        }
        if (targetTier && targetTier.stats.totalSize + entry.size <= targetTier.maxSize) {
            // Space available in lower tier
            targetTier.entries.set(key, entry);
            targetTier.stats.entryCount++;
            targetTier.stats.totalSize += entry.size;
            this.emit('cache:demoted', { key, from: currentTier.name, to: targetTier.name });
            return true;
        }
        return false;
    }
    async considerPromotion(key, entry, currentTier) {
        // Promote frequently accessed items to higher tier
        const shouldPromote = this.shouldPromoteEntry(entry, currentTier);
        if (shouldPromote) {
            let targetTier = null;
            if (currentTier.name === 'L3') {
                targetTier = this.tiers.get('L2');
            }
            else if (currentTier.name === 'L2') {
                targetTier = this.tiers.get('L1');
            }
            if (targetTier) {
                // Ensure space and promote
                await this.ensureSpace(targetTier, entry.size);
                // Remove from current tier
                this.removeFromTier(key, currentTier);
                // Add to target tier
                targetTier.entries.set(key, entry);
                targetTier.stats.entryCount++;
                targetTier.stats.totalSize += entry.size;
                this.emit('cache:promoted', { key, from: currentTier.name, to: targetTier.name });
            }
        }
    }
    shouldPromoteEntry(entry, currentTier) {
        const now = Date.now();
        const age = now - entry.timestamp;
        const timeSinceLastAccess = now - entry.lastAccess;
        // Promote if frequently accessed recently
        if (entry.accessCount > 10 && timeSinceLastAccess < 60000) { // Last minute
            return true;
        }
        // Promote high priority items
        if (entry.priority === 'critical' && currentTier.name !== 'L1') {
            return true;
        }
        // Promote based on access frequency
        const accessRate = entry.accessCount / (age / 1000); // accesses per second
        if (currentTier.name === 'L3' && accessRate > 0.01) { // > 1 access per 100 seconds
            return true;
        }
        if (currentTier.name === 'L2' && accessRate > 0.1) { // > 1 access per 10 seconds
            return true;
        }
        return false;
    }
    findLRUVictim(tier) {
        let oldestEntry = null;
        for (const entry of tier.entries.values()) {
            if (!oldestEntry || entry.lastAccess < oldestEntry.lastAccess) {
                oldestEntry = entry;
            }
        }
        return oldestEntry;
    }
    findLFUVictim(tier) {
        let leastUsedEntry = null;
        for (const entry of tier.entries.values()) {
            if (!leastUsedEntry || entry.accessCount < leastUsedEntry.accessCount) {
                leastUsedEntry = entry;
            }
        }
        return leastUsedEntry;
    }
    findTLRUVictim(tier) {
        // Time-aware LRU - considers both recency and frequency
        let bestScore = -1;
        let victim = null;
        const now = Date.now();
        for (const entry of tier.entries.values()) {
            const recency = now - entry.lastAccess;
            const frequency = entry.accessCount;
            const score = recency / Math.max(frequency, 1); // Higher score = better victim
            if (score > bestScore) {
                bestScore = score;
                victim = entry;
            }
        }
        return victim;
    }
    findARCVictim(tier) {
        // Simplified ARC (Adaptive Replacement Cache) victim selection
        // In practice, ARC is quite complex; this is a simplified version
        return this.findLRUVictim(tier); // Fallback to LRU
    }
    removeFromTier(key, tier) {
        const entry = tier.entries.get(key);
        if (entry) {
            tier.entries.delete(key);
            tier.stats.entryCount--;
            tier.stats.totalSize -= entry.size;
            this.globalStats.entryCount--;
            this.globalStats.totalSize -= entry.size;
            return true;
        }
        return false;
    }
    trackAccess(key, accessTime) {
        const pattern = this.accessPatterns.get(key) || {
            frequency: 0,
            lastAccess: 0,
            accessTimes: []
        };
        pattern.frequency++;
        pattern.lastAccess = Date.now();
        pattern.accessTimes.push(accessTime);
        // Keep only recent access times
        if (pattern.accessTimes.length > 10) {
            pattern.accessTimes = pattern.accessTimes.slice(-5);
        }
        this.accessPatterns.set(key, pattern);
    }
    updateHitRates() {
        const total = this.globalStats.hits + this.globalStats.misses;
        this.globalStats.hitRate = total > 0 ? this.globalStats.hits / total : 0;
        for (const tier of this.tiers.values()) {
            const tierTotal = tier.stats.hits + tier.stats.misses;
            tier.stats.hitRate = tierTotal > 0 ? tier.stats.hits / tierTotal : 0;
        }
    }
    async performAdaptiveSizing() {
        const memoryReport = this.memoryManager.getMemoryReport();
        // Shrink caches if under memory pressure
        if (memoryReport.pressure.level === 'high' || memoryReport.pressure.level === 'critical') {
            await this.shrinkCaches(0.8); // Reduce by 20%
        }
        // Expand caches if memory usage is low and hit rates are poor
        else if (memoryReport.pressure.level === 'low' && this.globalStats.hitRate < 0.8) {
            await this.expandCaches(1.2); // Increase by 20%
        }
    }
    async shrinkCaches(factor) {
        for (const tier of this.tiers.values()) {
            const newSize = Math.floor(tier.maxSize * factor);
            await this.resizeTier(tier, newSize);
        }
        this.emit('cache:resized', { action: 'shrink', factor });
    }
    async expandCaches(factor) {
        const newTotalSize = this.config.maxTotalMemory * factor;
        // Don't exceed system memory limits
        const memoryStats = this.memoryManager.getCurrentStats();
        const availableMemory = memoryStats.heapTotal - memoryStats.heapUsed;
        if (newTotalSize > availableMemory * 0.5) {
            return; // Don't use more than 50% of available memory
        }
        for (const tier of this.tiers.values()) {
            const newSize = Math.floor(tier.maxSize * factor);
            tier.maxSize = newSize;
        }
        this.config.maxTotalMemory = newTotalSize;
        this.emit('cache:resized', { action: 'expand', factor });
    }
    async resizeTier(tier, newSize) {
        if (newSize < tier.maxSize) {
            // Shrinking - need to evict entries
            while (tier.stats.totalSize > newSize) {
                const evicted = await this.evictFromTier(tier);
                if (!evicted)
                    break;
            }
        }
        tier.maxSize = newSize;
    }
    async rebalanceTiers() {
        // Move entries between tiers based on access patterns
        for (const [key, pattern] of this.accessPatterns.entries()) {
            for (const [tierName, tier] of this.tiers.entries()) {
                const entry = tier.entries.get(key);
                if (entry) {
                    const optimalTier = this.getOptimalTierForPattern(pattern);
                    if (optimalTier !== tierName) {
                        const targetTier = this.tiers.get(optimalTier);
                        // Move entry if space allows
                        if (targetTier.stats.totalSize + entry.size <= targetTier.maxSize) {
                            this.removeFromTier(key, tier);
                            targetTier.entries.set(key, entry);
                            targetTier.stats.entryCount++;
                            targetTier.stats.totalSize += entry.size;
                            this.globalStats.entryCount++; // This was decremented in removeFromTier
                            this.globalStats.totalSize += entry.size; // This was decremented in removeFromTier
                        }
                    }
                    break; // Entry found, no need to check other tiers
                }
            }
        }
    }
    getOptimalTierForPattern(pattern) {
        const now = Date.now();
        const recency = now - pattern.lastAccess;
        // Very recent and frequent access -> L1
        if (pattern.frequency > 20 && recency < 60000) {
            return 'L1';
        }
        // Moderately recent and frequent -> L2
        if (pattern.frequency > 5 && recency < 300000) {
            return 'L2';
        }
        // Everything else -> L3
        return 'L3';
    }
    async compactCache() {
        // Remove access patterns for non-existent entries
        const validKeys = new Set();
        for (const tier of this.tiers.values()) {
            for (const key of tier.entries.keys()) {
                validKeys.add(key);
            }
        }
        for (const key of this.accessPatterns.keys()) {
            if (!validKeys.has(key)) {
                this.accessPatterns.delete(key);
            }
        }
    }
    generateCacheRecommendations(efficiency) {
        const recommendations = [];
        if (efficiency.memoryUtilization > 0.9) {
            recommendations.push('Cache memory utilization is high - consider increasing cache size or reducing TTL');
        }
        if (efficiency.hotDataRatio < 0.1) {
            recommendations.push('Low hot data ratio - review cache promotion strategy');
        }
        if (this.globalStats.hitRate < 0.7) {
            recommendations.push('Cache hit rate is low - consider cache warming or adjusting eviction policies');
        }
        const l1Tier = this.tiers.get('L1');
        if (l1Tier.stats.hitRate < 0.8) {
            recommendations.push('L1 cache hit rate is low - review hot data identification');
        }
        return recommendations;
    }
    setupMemoryPressureHandler() {
        this.memoryManager.onMemoryPressure(async (stats, pressure) => {
            if (pressure.level === 'high' || pressure.level === 'critical') {
                // Aggressively clear caches under memory pressure
                const beforeSize = this.globalStats.totalSize;
                // Clear L3 first (cold data)
                const l3Tier = this.tiers.get('L3');
                l3Tier.entries.clear();
                l3Tier.stats.totalSize = 0;
                l3Tier.stats.entryCount = 0;
                // Clear half of L2 if still under pressure
                if (pressure.level === 'critical') {
                    const l2Tier = this.tiers.get('L2');
                    const entriesToKeep = Math.floor(l2Tier.entries.size / 2);
                    const sortedEntries = Array.from(l2Tier.entries.entries())
                        .sort(([, a], [, b]) => b.lastAccess - a.lastAccess);
                    l2Tier.entries.clear();
                    l2Tier.stats.totalSize = 0;
                    l2Tier.stats.entryCount = 0;
                    for (let i = 0; i < entriesToKeep; i++) {
                        const [key, entry] = sortedEntries[i];
                        l2Tier.entries.set(key, entry);
                        l2Tier.stats.totalSize += entry.size;
                        l2Tier.stats.entryCount++;
                    }
                }
                const memoryFreed = beforeSize - this.globalStats.totalSize;
                this.emit('cache:pressure_cleanup', { memoryFreed, pressureLevel: pressure.level });
            }
        });
    }
    estimateSize(value) {
        // Use enhanced size estimation with object overhead calculation
        try {
            return SizeEstimator.quickEstimate(value);
        }
        catch (error) {
            console.warn('Size estimation failed in cache, using fallback:', error);
            return 1024; // Conservative fallback
        }
    }
}
//# sourceMappingURL=IntelligentCacheManager.js.map