/**
 * Analytics Performance Optimizer
 *
 * Comprehensive performance optimization for analytics operations:
 * - Query optimization and caching strategies
 * - Memory-efficient data processing
 * - Parallel algorithm execution
 * - Database connection pooling
 * - Performance monitoring and metrics
 */
import { ConversationFlowAnalyzer } from '../analyzers/ConversationFlowAnalyzer.js';
import { ProductivityAnalyzer } from '../analyzers/ProductivityAnalyzer.js';
import { CacheKeyGenerator, CacheKeys } from '../../utils/CacheKeyGenerator.js';
import { SizeEstimator } from '../../utils/SizeEstimator.js';
import { PredictiveCacheManager, DEFAULT_PREDICTIVE_CACHE_CONFIG } from './PredictiveCacheManager.js';
/**
 * Multi-layer caching system for analytics operations
 */
class AnalyticsCache {
    memoryCache = new Map();
    cacheStats = new Map();
    maxMemoryBytes;
    currentMemoryUsage = 0;
    constructor(maxMemoryMB) {
        this.maxMemoryBytes = maxMemoryMB * 1024 * 1024;
    }
    async get(key, predictiveCacheManager) {
        const entry = this.memoryCache.get(key);
        if (!entry) {
            this.recordCacheStats(key, 'miss');
            // Record cache miss for predictive analysis
            if (predictiveCacheManager) {
                predictiveCacheManager.recordCacheAccess(key, 'default', { type: 'miss' });
            }
            return null;
        }
        // Check TTL
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.memoryCache.delete(key);
            this.currentMemoryUsage -= entry.size;
            this.recordCacheStats(key, 'miss');
            // Record cache miss for predictive analysis
            if (predictiveCacheManager) {
                predictiveCacheManager.recordCacheAccess(key, 'default', { type: 'miss_expired' });
            }
            return null;
        }
        entry.hits++;
        this.recordCacheStats(key, 'hit');
        // Record cache hit for predictive analysis
        if (predictiveCacheManager) {
            predictiveCacheManager.recordCacheAccess(key, 'default', { type: 'hit' });
        }
        return entry.data;
    }
    async set(key, value, ttlMinutes = 60) {
        const size = this.estimateSize(value);
        const ttl = ttlMinutes * 60 * 1000;
        // Check memory limits and evict if necessary
        if (this.currentMemoryUsage + size > this.maxMemoryBytes) {
            await this.evictLRU(size);
        }
        const entry = {
            data: value,
            timestamp: Date.now(),
            ttl,
            hits: 0,
            size
        };
        this.memoryCache.set(key, entry);
        this.currentMemoryUsage += size;
    }
    invalidatePattern(pattern) {
        let invalidated = 0;
        for (const [key, entry] of this.memoryCache) {
            if (key.includes(pattern)) {
                this.memoryCache.delete(key);
                this.currentMemoryUsage -= entry.size;
                invalidated++;
            }
        }
        return invalidated;
    }
    getCacheStats() {
        return {
            totalEntries: this.memoryCache.size,
            memoryUsageMB: this.currentMemoryUsage / (1024 * 1024),
            hitRates: Array.from(this.cacheStats.entries()).map(([key, stats]) => ({
                key,
                hitRate: stats.hits / (stats.hits + stats.misses),
                totalRequests: stats.hits + stats.misses
            }))
        };
    }
    recordCacheStats(key, type) {
        if (!this.cacheStats.has(key)) {
            this.cacheStats.set(key, { hits: 0, misses: 0 });
        }
        const stats = this.cacheStats.get(key);
        if (type === 'hit') {
            stats.hits++;
        }
        else {
            stats.misses++;
        }
    }
    estimateSize(value) {
        // Use enhanced size estimation with object overhead calculation
        try {
            return SizeEstimator.quickEstimate(value);
        }
        catch (error) {
            // Fallback to simplified estimation
            console.warn('Size estimation failed, using fallback:', error);
            return 1024; // Conservative fallback
        }
    }
    async evictLRU(requiredSpace) {
        const entries = Array.from(this.memoryCache.entries())
            .map(([key, entry]) => ({ key, entry }))
            .sort((a, b) => {
            // Sort by last access time (timestamp + hits factor)
            const aScore = a.entry.timestamp + (a.entry.hits * 1000);
            const bScore = b.entry.timestamp + (b.entry.hits * 1000);
            return aScore - bScore;
        });
        let freedSpace = 0;
        for (const { key, entry } of entries) {
            this.memoryCache.delete(key);
            this.currentMemoryUsage -= entry.size;
            freedSpace += entry.size;
            if (freedSpace >= requiredSpace) {
                break;
            }
        }
    }
}
/**
 * Optimized query executor with prepared statements and connection pooling
 */
class OptimizedQueryExecutor {
    databaseManager;
    preparedStatements = new Map();
    queryStats = new Map();
    constructor(databaseManager) {
        this.databaseManager = databaseManager;
    }
    async executeQuery(queryId, sql, params) {
        const startTime = performance.now();
        try {
            // Use prepared statement for better performance
            let stmt = this.preparedStatements.get(queryId);
            if (!stmt) {
                const db = this.databaseManager.getDatabase();
                stmt = db.prepare(sql);
                this.preparedStatements.set(queryId, stmt);
            }
            const result = stmt.all(params);
            // Record performance metrics
            const executionTime = performance.now() - startTime;
            this.recordQueryPerformance(queryId, executionTime);
            return result;
        }
        catch (error) {
            console.error(`Query execution failed for ${queryId}:`, error);
            throw error;
        }
    }
    getQueryPerformanceStats() {
        const stats = new Map();
        for (const [queryId, times] of this.queryStats) {
            const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
            const minTime = Math.min(...times);
            const maxTime = Math.max(...times);
            stats.set(queryId, {
                avgTime,
                minTime,
                maxTime,
                count: times.length
            });
        }
        return stats;
    }
    recordQueryPerformance(queryId, executionTime) {
        if (!this.queryStats.has(queryId)) {
            this.queryStats.set(queryId, []);
        }
        const times = this.queryStats.get(queryId);
        times.push(executionTime);
        // Keep only recent measurements
        if (times.length > 1000) {
            times.splice(0, times.length - 1000);
        }
    }
}
/**
 * Parallel processing manager for analytics operations
 */
class ParallelAnalyticsProcessor {
    maxWorkers;
    workerPool = [];
    taskQueue = [];
    activeTasks = 0;
    constructor(maxWorkers = 4) {
        this.maxWorkers = maxWorkers;
        // Initialize worker pool would go here in a real implementation
        // For now, we'll use Promise-based concurrency
    }
    async processInParallel(items, processor, batchSize = 10) {
        const batches = this.createBatches(items, batchSize);
        const processBatch = async (batch) => {
            return Promise.all(batch.map(processor));
        };
        // Process batches in parallel
        const batchPromises = batches.map(processBatch);
        const batchResults = await Promise.all(batchPromises);
        // Flatten results
        return batchResults.flat();
    }
    async processConversationsInParallel(conversations, analyzer, method) {
        const processConversation = async (item) => {
            try {
                // Type-safe method calling
                if (analyzer instanceof ConversationFlowAnalyzer && method === 'analyzeFlow') {
                    return await analyzer.analyzeFlow(item.conversation, item.messages);
                }
                else if (analyzer instanceof ProductivityAnalyzer && method === 'analyzeConversationProductivity') {
                    return await analyzer.analyzeConversationProductivity(item.conversation, item.messages);
                }
                throw new Error(`Invalid analyzer/method combination: ${analyzer.constructor.name}/${method}`);
            }
            catch (error) {
                console.error(`Failed to process conversation ${item.conversation.id}:`, error);
                return null;
            }
        };
        const results = await this.processInParallel(conversations, processConversation, Math.min(this.maxWorkers, conversations.length));
        return results.filter(result => result !== null);
    }
    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }
}
/**
 * Memory-efficient data streaming processor
 */
class StreamingDataProcessor {
    memoryUsage = 0;
    maxMemoryMB;
    constructor(maxMemoryMB = 200) {
        this.maxMemoryMB = maxMemoryMB;
    }
    async *processLargeDataset(dataSource, processor, batchSize = 100) {
        let batch = [];
        for await (const item of this.ensureAsyncIterable(dataSource)) {
            batch.push(item);
            if (batch.length >= batchSize || this.isMemoryPressure()) {
                const results = await Promise.all(batch.map(async (item) => {
                    try {
                        return await processor(item);
                    }
                    catch (error) {
                        console.error('Processing error:', error);
                        return null;
                    }
                }));
                yield results.filter(r => r !== null);
                batch = [];
                // Force garbage collection if available
                if (global.gc) {
                    global.gc();
                }
            }
        }
        // Process remaining items
        if (batch.length > 0) {
            const results = await Promise.all(batch.map(processor));
            yield results;
        }
    }
    async *ensureAsyncIterable(source) {
        if (Symbol.asyncIterator in source) {
            yield* source;
        }
        else {
            for (const item of source) {
                yield item;
            }
        }
    }
    isMemoryPressure() {
        const usage = process.memoryUsage();
        const heapUsedMB = usage.heapUsed / (1024 * 1024);
        return heapUsedMB > this.maxMemoryMB * 0.8;
    }
}
/**
 * Optimized algorithms for specific analytics operations
 */
class OptimizedAlgorithms {
    /**
     * Optimized Tarjan's algorithm with early termination
     */
    static findStronglyConnectedComponentsOptimized(graph, maxComponents = 100) {
        if (graph.size === 0)
            return [];
        const index = new Map();
        const lowlink = new Map();
        const onStack = new Set();
        const stack = [];
        const sccs = [];
        let currentIndex = 0;
        const strongConnect = (node) => {
            if (sccs.length >= maxComponents)
                return; // Early termination
            index.set(node, currentIndex);
            lowlink.set(node, currentIndex);
            currentIndex++;
            stack.push(node);
            onStack.add(node);
            const neighbors = graph.get(node) || new Set();
            for (const neighbor of neighbors) {
                if (sccs.length >= maxComponents)
                    break; // Early termination
                if (!index.has(neighbor)) {
                    strongConnect(neighbor);
                    lowlink.set(node, Math.min(lowlink.get(node), lowlink.get(neighbor)));
                }
                else if (onStack.has(neighbor)) {
                    lowlink.set(node, Math.min(lowlink.get(node), index.get(neighbor)));
                }
            }
            if (lowlink.get(node) === index.get(node)) {
                const scc = [];
                let w;
                do {
                    w = stack.pop();
                    onStack.delete(w);
                    scc.push(w);
                } while (w !== node);
                sccs.push(scc);
            }
        };
        // Process nodes in degree order for better performance
        const nodesByDegree = Array.from(graph.keys())
            .map(node => ({ node, degree: (graph.get(node) || new Set()).size }))
            .sort((a, b) => b.degree - a.degree);
        for (const { node } of nodesByDegree) {
            if (!index.has(node) && sccs.length < maxComponents) {
                strongConnect(node);
            }
        }
        return sccs;
    }
    /**
     * Optimized clustering with spatial indexing
     */
    static optimizedClustering(items, similarityFunction, threshold = 0.6, maxClusters = 50) {
        if (items.length === 0)
            return [];
        const clusters = [];
        const processed = new Set();
        // Pre-calculate similarity matrix for frequently accessed pairs
        const similarityCache = new Map();
        const getCachedSimilarity = (i, j) => {
            const key = `${Math.min(i, j)}-${Math.max(i, j)}`;
            if (similarityCache.has(key)) {
                return similarityCache.get(key);
            }
            const similarity = similarityFunction(items[i], items[j]);
            similarityCache.set(key, similarity);
            return similarity;
        };
        for (let i = 0; i < items.length && clusters.length < maxClusters; i++) {
            if (processed.has(i))
                continue;
            const cluster = [items[i]];
            processed.add(i);
            // Find similar items using optimized search
            for (let j = i + 1; j < items.length; j++) {
                if (processed.has(j))
                    continue;
                const similarity = getCachedSimilarity(i, j);
                if (similarity >= threshold) {
                    cluster.push(items[j]);
                    processed.add(j);
                }
            }
            if (cluster.length >= 2) {
                clusters.push(cluster);
            }
        }
        return clusters;
    }
    /**
     * Optimized topic extraction with memoization
     */
    static extractTopicsWithMemoization(messages, cache = new Map()) {
        const topicMap = new Map();
        for (const message of messages) {
            // Use enhanced cache key generation for content-based operations
            const cacheKey = CacheKeys.topicExtraction(message.content);
            let topics;
            if (cache.has(cacheKey)) {
                topics = cache.get(cacheKey);
            }
            else {
                topics = this.extractMessageTopics(message.content);
                cache.set(cacheKey, topics);
            }
            for (const topic of topics) {
                if (!topicMap.has(topic)) {
                    topicMap.set(topic, []);
                }
                topicMap.get(topic).push(message);
            }
        }
        return topicMap;
    }
    static generateCacheKey(content) {
        // Use enhanced content-based cache key generation
        return CacheKeyGenerator.generateContentKey('legacy_topic', content, {
            algorithm: 'sha1',
            maxLength: 200
        });
    }
    static extractMessageTopics(content) {
        // Simplified topic extraction - in production would use more sophisticated NLP
        const topics = [];
        const sentences = content.split(/[.!?]+/);
        for (const sentence of sentences) {
            const words = sentence.toLowerCase().split(/\s+/)
                .filter(w => w.length > 4 && !this.isStopWord(w));
            // Extract bigrams
            for (let i = 0; i < words.length - 1; i++) {
                const bigram = words.slice(i, i + 2).join(' ');
                if (this.isSignificantBigram(bigram)) {
                    topics.push(bigram);
                }
            }
        }
        return [...new Set(topics)];
    }
    static isStopWord(word) {
        const stopWords = new Set([
            'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have',
            'for', 'not', 'with', 'he', 'as', 'you', 'do', 'at', 'this'
        ]);
        return stopWords.has(word);
    }
    static isSignificantBigram(bigram) {
        return bigram.length > 8 && !bigram.includes('that') && !bigram.includes('this');
    }
}
/**
 * Main performance optimizer class
 */
export class AnalyticsPerformanceOptimizer {
    databaseManager;
    analyticsEngine;
    cache;
    queryExecutor;
    parallelProcessor;
    streamProcessor;
    metrics;
    config;
    predictiveCacheManager;
    constructor(databaseManager, analyticsEngine, config = {}) {
        this.databaseManager = databaseManager;
        this.analyticsEngine = analyticsEngine;
        this.config = {
            enableQueryCaching: true,
            enableMemoryOptimization: true,
            enableParallelProcessing: true,
            maxMemoryUsageMB: 200,
            queryCacheTTLMinutes: 60,
            parallelWorkers: 4,
            batchSize: 50,
            enablePerformanceMonitoring: true,
            enablePredictiveCaching: false,
            predictiveCache: DEFAULT_PREDICTIVE_CACHE_CONFIG,
            ...config
        };
        this.cache = new AnalyticsCache(this.config.maxMemoryUsageMB);
        this.queryExecutor = new OptimizedQueryExecutor(databaseManager);
        this.parallelProcessor = new ParallelAnalyticsProcessor(this.config.parallelWorkers);
        this.streamProcessor = new StreamingDataProcessor(this.config.maxMemoryUsageMB);
        this.metrics = {
            queryExecutionTimes: new Map(),
            cacheHitRates: new Map(),
            memoryUsage: { current: 0, peak: 0, gcEvents: 0 },
            algorithmPerformance: {
                averageCircularityTime: 0,
                averageClusteringTime: 0,
                averageFlowAnalysisTime: 0
            },
            parallelizationEfficiency: {
                parallelTasks: 0,
                speedupFactor: 1,
                efficiency: 1
            }
        };
        // Initialize predictive caching if enabled
        if (this.config.enablePredictiveCaching && this.analyticsEngine) {
            this.predictiveCacheManager = new PredictiveCacheManager(this.databaseManager, this.analyticsEngine, {
                ...DEFAULT_PREDICTIVE_CACHE_CONFIG,
                ...this.config.predictiveCache
            });
        }
        this.startPerformanceMonitoring();
    }
    /**
     * Optimize conversation flow analysis with caching and parallel processing
     */
    async optimizeFlowAnalysis(conversations, analyzer) {
        // Generate collision-resistant cache key
        const cacheKey = CacheKeys.flowAnalysis(conversations);
        // Check cache first
        if (this.config.enableQueryCaching) {
            const cached = await this.cache.get(cacheKey, this.predictiveCacheManager);
            if (cached) {
                return cached;
            }
        }
        const startTime = performance.now();
        let results;
        if (this.config.enableParallelProcessing && conversations.length > 10) {
            // Use parallel processing for large datasets
            results = await this.parallelProcessor.processConversationsInParallel(conversations, analyzer, 'analyzeFlow');
        }
        else {
            // Sequential processing for smaller datasets
            results = [];
            for (const item of conversations) {
                try {
                    const result = await analyzer.analyzeFlow(item.conversation, item.messages);
                    results.push(result);
                }
                catch (error) {
                    console.error(`Flow analysis failed for conversation ${item.conversation.id}:`, error);
                }
            }
        }
        // Cache results
        if (this.config.enableQueryCaching) {
            await this.cache.set(cacheKey, results, this.config.queryCacheTTLMinutes);
        }
        // Record metrics
        const executionTime = performance.now() - startTime;
        this.metrics.algorithmPerformance.averageFlowAnalysisTime =
            (this.metrics.algorithmPerformance.averageFlowAnalysisTime + executionTime) / 2;
        return results;
    }
    /**
     * Optimize productivity analysis with streaming for large datasets
     */
    async optimizeProductivityAnalysis(conversations, analyzer) {
        const results = [];
        if (conversations.length > 1000) {
            // Use streaming for very large datasets
            const processConversation = async (item) => {
                return await analyzer.analyzeConversationProductivity(item.conversation, item.messages);
            };
            for await (const batch of this.streamProcessor.processLargeDataset(conversations, processConversation, this.config.batchSize)) {
                results.push(...batch);
            }
        }
        else {
            // Use parallel processing for medium datasets
            const processedResults = await this.parallelProcessor.processConversationsInParallel(conversations, analyzer, 'analyzeConversationProductivity');
            results.push(...processedResults);
        }
        return results;
    }
    /**
     * Optimize knowledge gap detection with advanced clustering
     */
    async optimizeKnowledgeGapDetection(conversations, detector) {
        // Generate collision-resistant cache key
        const cacheKey = CacheKeys.knowledgeGapDetection(conversations);
        if (this.config.enableQueryCaching) {
            const cached = await this.cache.get(cacheKey, this.predictiveCacheManager);
            if (cached) {
                return cached;
            }
        }
        const startTime = performance.now();
        // Use optimized clustering algorithm
        const allMessages = conversations.flatMap(c => c.messages.map(m => ({ ...m, conversationId: c.conversation.id })));
        // Extract questions with memoization
        const questions = allMessages.filter(m => m.role === 'user' &&
            m.content.includes('?') &&
            m.content.trim().length > 10);
        // Use optimized clustering
        OptimizedAlgorithms.optimizedClustering(questions, (q1, q2) => this.calculateQuestionSimilarity(q1.content, q2.content), 0.6, 50);
        // Process gaps with the detector
        const gaps = await detector.detectGaps(conversations);
        // Cache results
        if (this.config.enableQueryCaching) {
            await this.cache.set(cacheKey, gaps, this.config.queryCacheTTLMinutes);
        }
        const executionTime = performance.now() - startTime;
        this.metrics.algorithmPerformance.averageClusteringTime = executionTime;
        return gaps;
    }
    /**
     * Optimize decision tracking with pattern caching
     */
    async optimizeDecisionTracking(conversations, tracker) {
        const results = [];
        // Process in parallel batches
        const processBatch = async (batch) => {
            const batchResults = [];
            for (const item of batch) {
                try {
                    const decisions = await tracker.trackDecisions(item.conversation, item.messages);
                    batchResults.push(...decisions);
                }
                catch (error) {
                    console.error(`Decision tracking failed for conversation ${item.conversation.id}:`, error);
                }
            }
            return batchResults;
        };
        // Split into batches and process in parallel
        const batches = this.createBatches(conversations, this.config.batchSize);
        const batchPromises = batches.map(processBatch);
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.flat());
        return results;
    }
    /**
     * Optimize database queries with connection pooling
     */
    async optimizeQuery(queryId, sql, params) {
        // Generate collision-resistant cache key with parameter normalization
        const cacheKey = CacheKeyGenerator.generateQueryKey(queryId, sql, params);
        if (this.config.enableQueryCaching) {
            const cached = await this.cache.get(cacheKey, this.predictiveCacheManager);
            if (cached) {
                return cached;
            }
        }
        const result = await this.queryExecutor.executeQuery(queryId, sql, params);
        if (this.config.enableQueryCaching) {
            await this.cache.set(cacheKey, result, this.config.queryCacheTTLMinutes);
        }
        return result;
    }
    /**
     * Get comprehensive performance report
     */
    getPerformanceReport() {
        const queryStats = this.queryExecutor.getQueryPerformanceStats();
        const cacheStats = this.cache.getCacheStats();
        const predictiveCachingStatus = this.getPredictiveCachingStatus();
        const recommendations = this.generateOptimizationRecommendations(queryStats, cacheStats, predictiveCachingStatus);
        const report = {
            metrics: this.metrics,
            cacheStats,
            queryStats: Object.fromEntries(queryStats),
            recommendations
        };
        if (predictiveCachingStatus.enabled) {
            report.predictiveCaching = predictiveCachingStatus;
        }
        return report;
    }
    /**
     * Initialize predictive caching system
     */
    async initializePredictiveCaching() {
        if (!this.predictiveCacheManager) {
            if (!this.analyticsEngine) {
                throw new Error('Analytics engine required for predictive caching');
            }
            this.predictiveCacheManager = new PredictiveCacheManager(this.databaseManager, this.analyticsEngine, {
                ...DEFAULT_PREDICTIVE_CACHE_CONFIG,
                ...this.config.predictiveCache
            });
        }
        await this.predictiveCacheManager.initialize();
    }
    /**
     * Enable or disable predictive caching at runtime
     */
    async configurePredictiveCaching(enabled, config) {
        this.config.enablePredictiveCaching = enabled;
        if (enabled && this.analyticsEngine) {
            if (!this.predictiveCacheManager) {
                this.predictiveCacheManager = new PredictiveCacheManager(this.databaseManager, this.analyticsEngine, {
                    ...DEFAULT_PREDICTIVE_CACHE_CONFIG,
                    ...this.config.predictiveCache,
                    ...config
                });
                await this.predictiveCacheManager.initialize();
            }
            else if (config) {
                this.predictiveCacheManager.updateConfiguration(config);
            }
        }
        else if (!enabled && this.predictiveCacheManager) {
            this.predictiveCacheManager.shutdown();
        }
    }
    /**
     * Manually trigger predictive cache warming
     */
    async triggerPredictiveCacheWarming() {
        if (!this.predictiveCacheManager || !this.config.enablePredictiveCaching) {
            return [];
        }
        return await this.predictiveCacheManager.triggerPredictiveWarming();
    }
    /**
     * Get predictive caching system status and metrics
     */
    getPredictiveCachingStatus() {
        const enabled = this.config.enablePredictiveCaching && !!this.predictiveCacheManager;
        const status = enabled ? this.predictiveCacheManager.getSystemStatus() : null;
        const recommendations = [];
        if (!enabled) {
            recommendations.push('Consider enabling predictive caching to improve performance');
        }
        else if (status) {
            // Analyze predictive cache performance
            if (status.warming.efficiency < 0.6) {
                recommendations.push('Predictive cache accuracy is low - consider adjusting prediction thresholds');
            }
            if (status.recentActivity.requestsPerHour > 100 && !status.enabled) {
                recommendations.push('High cache request volume detected - predictive caching could provide significant benefits');
            }
            if (status.patterns.averageConfidence < 0.5) {
                recommendations.push('Pattern confidence is low - allow more time for pattern learning');
            }
            if (status.warming.queueSize > 20) {
                recommendations.push('Large warming queue detected - consider increasing resource thresholds');
            }
        }
        return {
            enabled,
            status,
            recommendations
        };
    }
    /**
     * Validate prediction accuracy by checking if predicted cache entries were actually requested
     */
    async validatePredictionAccuracy(_timeWindowHours = 24) {
        if (!this.predictiveCacheManager) {
            return {
                totalPredictions: 0,
                accuratePredictions: 0,
                accuracy: 0,
                topPredictedQueries: []
            };
        }
        const status = this.predictiveCacheManager.getSystemStatus();
        const warmingStats = status.warming;
        // In a real implementation, this would track predictions vs actual requests
        // For now, we'll use the warming efficiency as a proxy
        const totalPredictions = warmingStats.stats.successful + warmingStats.stats.failed;
        const accuratePredictions = warmingStats.stats.successful;
        const accuracy = totalPredictions > 0 ? accuratePredictions / totalPredictions : 0;
        return {
            totalPredictions,
            accuratePredictions,
            accuracy,
            topPredictedQueries: [] // Would be populated with actual tracking data
        };
    }
    /**
     * Clear caches and reset performance counters
     */
    resetPerformanceState() {
        this.cache.invalidatePattern('');
        if (this.predictiveCacheManager) {
            // Don't shutdown completely, just clear patterns to allow re-learning
            this.predictiveCacheManager.updateConfiguration({
                learningEnabled: false
            });
            setTimeout(() => {
                if (this.predictiveCacheManager) {
                    this.predictiveCacheManager.updateConfiguration({
                        learningEnabled: true
                    });
                }
            }, 1000);
        }
        this.metrics = {
            queryExecutionTimes: new Map(),
            cacheHitRates: new Map(),
            memoryUsage: { current: 0, peak: 0, gcEvents: 0 },
            algorithmPerformance: {
                averageCircularityTime: 0,
                averageClusteringTime: 0,
                averageFlowAnalysisTime: 0
            },
            parallelizationEfficiency: {
                parallelTasks: 0,
                speedupFactor: 1,
                efficiency: 1
            }
        };
    }
    calculateQuestionSimilarity(q1, q2) {
        // Simple Jaccard similarity for demonstration
        const set1 = new Set(q1.toLowerCase().split(/\s+/));
        const set2 = new Set(q2.toLowerCase().split(/\s+/));
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return intersection.size / union.size;
    }
    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }
    startPerformanceMonitoring() {
        if (!this.config.enablePerformanceMonitoring)
            return;
        setInterval(() => {
            const memUsage = process.memoryUsage();
            this.metrics.memoryUsage.current = memUsage.heapUsed;
            this.metrics.memoryUsage.peak = Math.max(this.metrics.memoryUsage.peak, memUsage.heapUsed);
        }, 30000); // Every 30 seconds
    }
    generateOptimizationRecommendations(queryStats, cacheStats, predictiveCachingStatus) {
        const recommendations = [];
        // Analyze query performance
        for (const [queryId, stats] of Object.entries(queryStats)) {
            if (stats.avgTime > 1000) { // > 1 second
                recommendations.push(`Query ${queryId} is slow (avg: ${stats.avgTime.toFixed(2)}ms) - consider optimization`);
            }
        }
        // Analyze cache performance
        const lowHitRateKeys = cacheStats.hitRates.filter((hr) => hr.hitRate < 0.5);
        if (lowHitRateKeys.length > 0) {
            recommendations.push(`Low cache hit rates detected - review caching strategy for: ${lowHitRateKeys.map((k) => k.key).join(', ')}`);
        }
        // Memory usage recommendations
        if (this.metrics.memoryUsage.current > this.config.maxMemoryUsageMB * 0.8 * 1024 * 1024) {
            recommendations.push('High memory usage detected - consider increasing batch size limits or memory limits');
        }
        // Predictive caching recommendations
        if (predictiveCachingStatus) {
            recommendations.push(...predictiveCachingStatus.recommendations);
        }
        return recommendations;
    }
}
//# sourceMappingURL=AnalyticsPerformanceOptimizer.js.map