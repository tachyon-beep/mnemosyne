/**
 * Predictive Cache Manager
 *
 * Intelligent cache warming system that learns from user behavior patterns
 * to proactively preload likely-to-be-requested analytics data, reducing
 * response times and improving user experience.
 *
 * Features:
 * - User behavior pattern analysis
 * - Machine learning-based prediction models
 * - Adaptive cache warming strategies
 * - Resource-aware predictions
 * - Background optimization processes
 */
/**
 * Analyzes user behavior patterns to identify predictable request sequences
 */
class UsagePatternAnalyzer {
    config;
    patterns = new Map();
    recentRequests = [];
    sessionData = new Map();
    constructor(config) {
        this.config = config;
    }
    /**
     * Record a cache request for pattern analysis
     */
    recordRequest(cacheKey, userId = 'default', context = {}) {
        const timestamp = Date.now();
        // Add to recent requests
        this.recentRequests.push({
            key: cacheKey,
            timestamp,
            context: {
                timeOfDay: new Date().getHours(),
                dayOfWeek: new Date().getDay(),
                ...context
            }
        });
        // Maintain sliding window
        const windowMs = 24 * 60 * 60 * 1000; // 24 hours
        this.recentRequests = this.recentRequests.filter(req => timestamp - req.timestamp < windowMs);
        // Update session data
        this.updateSessionData(userId, cacheKey, timestamp);
        // Extract patterns from recent requests
        this.extractPatterns(userId);
        // Clean up old patterns
        this.cleanupOldPatterns();
    }
    /**
     * Get patterns that might predict next requests
     */
    getPredictivePatterns(recentKeys, context = {}) {
        const matchingPatterns = [];
        for (const pattern of this.patterns.values()) {
            const score = this.calculatePatternMatch(pattern, recentKeys, context);
            if (score > this.config.predictionThreshold) {
                matchingPatterns.push({ pattern, score });
            }
        }
        // Sort by score and return top patterns
        return matchingPatterns
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .map(item => item.pattern);
    }
    /**
     * Get comprehensive pattern statistics
     */
    getPatternStats() {
        const activePatterns = Array.from(this.patterns.values()).filter(p => Date.now() - p.lastSeen < 7 * 24 * 60 * 60 * 1000 // 7 days
        );
        const averageConfidence = activePatterns.length > 0
            ? activePatterns.reduce((sum, p) => sum + p.confidence, 0) / activePatterns.length
            : 0;
        const topPatterns = activePatterns
            .map(pattern => ({
            pattern,
            strength: pattern.frequency * pattern.confidence
        }))
            .sort((a, b) => b.strength - a.strength)
            .slice(0, 10);
        return {
            totalPatterns: this.patterns.size,
            activePatterns: activePatterns.length,
            averageConfidence,
            topPatterns
        };
    }
    updateSessionData(userId, cacheKey, timestamp) {
        if (!this.sessionData.has(userId)) {
            this.sessionData.set(userId, { requests: [], startTime: timestamp });
        }
        const session = this.sessionData.get(userId);
        session.requests.push(cacheKey);
        // Keep session data reasonable
        if (session.requests.length > 100) {
            session.requests = session.requests.slice(-50);
        }
    }
    extractPatterns(userId) {
        const session = this.sessionData.get(userId);
        if (!session || session.requests.length < 2)
            return;
        // Extract sequential patterns of various lengths
        for (let length = 2; length <= Math.min(5, session.requests.length); length++) {
            for (let i = 0; i <= session.requests.length - length; i++) {
                const sequence = session.requests.slice(i, i + length);
                const patternId = sequence.join('->');
                if (this.patterns.has(patternId)) {
                    const pattern = this.patterns.get(patternId);
                    pattern.frequency++;
                    pattern.lastSeen = Date.now();
                    pattern.confidence = Math.min(1.0, pattern.confidence + 0.01);
                }
                else {
                    this.patterns.set(patternId, {
                        id: patternId,
                        userId,
                        sequence,
                        frequency: 1,
                        lastSeen: Date.now(),
                        confidence: 0.1,
                        context: this.extractContextFromRecent(sequence)
                    });
                }
            }
        }
    }
    extractContextFromRecent(sequence) {
        const recentContext = this.recentRequests
            .filter(req => sequence.includes(req.key))
            .map(req => req.context);
        if (recentContext.length === 0)
            return {};
        return {
            timeOfDay: this.mode(recentContext.map(c => typeof c.timeOfDay === 'number' ? c.timeOfDay : 0).filter(n => n > 0)),
            dayOfWeek: this.mode(recentContext.map(c => typeof c.dayOfWeek === 'number' ? c.dayOfWeek : 0).filter(n => n >= 0)),
            queryTypes: [...new Set(recentContext.flatMap(c => Array.isArray(c.queryTypes) ? c.queryTypes : []))]
        };
    }
    mode(arr) {
        if (arr.length === 0)
            return undefined;
        const counts = new Map();
        arr.forEach(val => counts.set(val, (counts.get(val) || 0) + 1));
        return [...counts.entries()].reduce((a, b) => a[1] > b[1] ? a : b)[0];
    }
    calculatePatternMatch(pattern, recentKeys, context) {
        let score = 0;
        // Sequence matching
        const patternPrefix = pattern.sequence.slice(0, -1);
        const recentSuffix = recentKeys.slice(-patternPrefix.length);
        if (JSON.stringify(patternPrefix) === JSON.stringify(recentSuffix)) {
            score += 0.6;
        }
        else {
            // Partial sequence matching
            const overlap = this.calculateSequenceOverlap(patternPrefix, recentSuffix);
            score += overlap * 0.4;
        }
        // Frequency weighting
        score += Math.min(0.2, pattern.frequency / 100);
        // Confidence weighting
        score += pattern.confidence * 0.1;
        // Context matching
        if (pattern.context && context) {
            const contextMatch = this.calculateContextMatch(pattern.context, context);
            score += contextMatch * 0.1;
        }
        // Recency bonus
        const hoursSinceLastSeen = (Date.now() - pattern.lastSeen) / (1000 * 60 * 60);
        const recencyBonus = Math.max(0, 0.1 - (hoursSinceLastSeen / 168)); // Decay over 1 week
        score += recencyBonus;
        return score;
    }
    calculateSequenceOverlap(seq1, seq2) {
        if (seq1.length === 0 || seq2.length === 0)
            return 0;
        let matches = 0;
        const minLength = Math.min(seq1.length, seq2.length);
        for (let i = 0; i < minLength; i++) {
            if (seq1[seq1.length - 1 - i] === seq2[seq2.length - 1 - i]) {
                matches++;
            }
            else {
                break;
            }
        }
        return matches / minLength;
    }
    calculateContextMatch(ctx1, ctx2) {
        let matches = 0;
        let total = 0;
        if (typeof ctx1.timeOfDay === 'number' && typeof ctx2.timeOfDay === 'number') {
            total++;
            if (Math.abs(ctx1.timeOfDay - ctx2.timeOfDay) <= 1)
                matches++;
        }
        if (typeof ctx1.dayOfWeek === 'number' && typeof ctx2.dayOfWeek === 'number') {
            total++;
            if (ctx1.dayOfWeek === ctx2.dayOfWeek)
                matches++;
        }
        return total > 0 ? matches / total : 0;
    }
    cleanupOldPatterns() {
        if (this.patterns.size <= this.config.maxPatternHistory)
            return;
        const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
        const toDelete = [];
        for (const [id, pattern] of this.patterns) {
            if (pattern.lastSeen < cutoffTime && pattern.frequency < this.config.minPatternFrequency) {
                toDelete.push(id);
            }
        }
        toDelete.forEach(id => this.patterns.delete(id));
    }
}
/**
 * Machine learning models for cache prediction
 */
class PredictionModelManager {
    config;
    models = new Map();
    trainingData = [];
    constructor(config) {
        this.config = config;
        this.initializeModels();
    }
    /**
     * Generate predictions based on current context
     */
    async generatePredictions(currentContext, patterns) {
        const predictions = [];
        // Sequence-based predictions
        if (this.config.models.enableSequenceAnalysis) {
            predictions.push(...await this.generateSequencePredictions(currentContext, patterns));
        }
        // Temporal-based predictions
        if (this.config.models.enableTemporalPatterns) {
            predictions.push(...await this.generateTemporalPredictions(currentContext));
        }
        // Contextual predictions
        if (this.config.models.enableContextualPredictions) {
            predictions.push(...await this.generateContextualPredictions(currentContext));
        }
        // Collaborative filtering predictions
        if (this.config.models.enableCollaborativeFiltering) {
            predictions.push(...await this.generateCollaborativePredictions(currentContext));
        }
        // Deduplicate and rank predictions
        return this.rankAndDedupePredictions(predictions);
    }
    /**
     * Update model with prediction outcome
     */
    updateModelWithOutcome(prediction, wasAccurate) {
        const features = this.extractFeatures(prediction);
        this.trainingData.push({
            features,
            target: prediction.cacheKey,
            timestamp: Date.now(),
            outcome: wasAccurate
        });
        // Maintain training data size
        if (this.trainingData.length > 10000) {
            this.trainingData = this.trainingData.slice(-5000);
        }
        // Update model accuracy
        this.updateModelAccuracy(prediction.queryType, wasAccurate);
        // Retrain models periodically
        if (this.trainingData.length % 100 === 0) {
            this.retrainModels();
        }
    }
    /**
     * Get model performance statistics
     */
    getModelStats() {
        const stats = new Map();
        for (const [type, model] of this.models) {
            stats.set(type, {
                accuracy: model.accuracy,
                predictions: model.trainingData,
                lastUpdated: model.lastUpdated
            });
        }
        return stats;
    }
    async generateSequencePredictions(context, patterns) {
        const predictions = [];
        for (const pattern of patterns) {
            if (pattern.sequence.length < 2)
                continue;
            const nextKey = pattern.sequence[pattern.sequence.length - 1];
            const confidence = pattern.confidence * (pattern.frequency / 100);
            predictions.push({
                cacheKey: nextKey,
                queryType: 'sequence',
                confidence,
                priority: confidence * 100,
                estimatedValue: this.estimateQueryValue(nextKey),
                context: pattern.context,
                expiryTime: Date.now() + (60 * 60 * 1000) // 1 hour
            });
        }
        return predictions;
    }
    async generateTemporalPredictions(context) {
        const predictions = [];
        const timeOfDay = typeof context.timeOfDay === 'number' ? context.timeOfDay : 0;
        const dayOfWeek = typeof context.dayOfWeek === 'number' ? context.dayOfWeek : 0;
        // Analyze historical patterns for this time/day
        const historicalRequests = this.getHistoricalRequestsForTime(timeOfDay, dayOfWeek);
        const commonQueries = this.findMostCommonQueries(historicalRequests);
        for (const query of commonQueries.slice(0, 5)) {
            predictions.push({
                cacheKey: query.key,
                queryType: 'temporal',
                confidence: query.frequency,
                priority: query.frequency * 80,
                estimatedValue: this.estimateQueryValue(query.key),
                context: { timeOfDay, dayOfWeek },
                expiryTime: Date.now() + (2 * 60 * 60 * 1000) // 2 hours
            });
        }
        return predictions;
    }
    async generateContextualPredictions(context) {
        const predictions = [];
        const queryTypes = Array.isArray(context.queryTypes) ? context.queryTypes : [];
        const sessionDuration = typeof context.sessionDuration === 'number' ? context.sessionDuration : 0;
        // Predict based on query types in session
        for (const queryType of queryTypes) {
            const relatedQueries = this.findRelatedQueries(queryType);
            for (const relatedQuery of relatedQueries.slice(0, 3)) {
                predictions.push({
                    cacheKey: relatedQuery.key,
                    queryType: 'contextual',
                    confidence: relatedQuery.relevance,
                    priority: relatedQuery.relevance * 60,
                    estimatedValue: this.estimateQueryValue(relatedQuery.key),
                    context: { queryType, sessionDuration },
                    expiryTime: Date.now() + (30 * 60 * 1000) // 30 minutes
                });
            }
        }
        return predictions;
    }
    async generateCollaborativePredictions(context) {
        // Simplified collaborative filtering - in production would use more sophisticated algorithms
        const predictions = [];
        const recentKeys = Array.isArray(context.recentKeys) ? context.recentKeys : [];
        // Find users with similar request patterns
        const similarUsers = this.findSimilarUsers(recentKeys);
        for (const similarUser of similarUsers.slice(0, 3)) {
            const recommendations = this.getUserRecommendations(similarUser.userId);
            for (const rec of recommendations.slice(0, 2)) {
                predictions.push({
                    cacheKey: rec.key,
                    queryType: 'collaborative',
                    confidence: rec.similarity * similarUser.similarity,
                    priority: rec.similarity * similarUser.similarity * 40,
                    estimatedValue: this.estimateQueryValue(rec.key),
                    context: { collaborativeUserId: similarUser.userId },
                    expiryTime: Date.now() + (45 * 60 * 1000) // 45 minutes
                });
            }
        }
        return predictions;
    }
    rankAndDedupePredictions(predictions) {
        // Deduplicate by cache key
        const deduped = new Map();
        for (const prediction of predictions) {
            if (!deduped.has(prediction.cacheKey) ||
                deduped.get(prediction.cacheKey).confidence < prediction.confidence) {
                deduped.set(prediction.cacheKey, prediction);
            }
        }
        // Sort by priority and confidence
        return Array.from(deduped.values())
            .sort((a, b) => {
            const aScore = a.priority * a.confidence * a.estimatedValue;
            const bScore = b.priority * b.confidence * b.estimatedValue;
            return bScore - aScore;
        })
            .slice(0, this.config.maxConcurrentPredictions);
    }
    initializeModels() {
        this.models.set('sequence', {
            type: 'sequence',
            accuracy: 0.5,
            trainingData: 0,
            lastUpdated: Date.now(),
            parameters: { windowSize: 5, threshold: 0.6 }
        });
        this.models.set('temporal', {
            type: 'temporal',
            accuracy: 0.4,
            trainingData: 0,
            lastUpdated: Date.now(),
            parameters: { timeWindows: [1, 3, 6, 12, 24], seasonality: true }
        });
        this.models.set('contextual', {
            type: 'contextual',
            accuracy: 0.6,
            trainingData: 0,
            lastUpdated: Date.now(),
            parameters: { maxContextFeatures: 10, similarity: 'cosine' }
        });
        this.models.set('collaborative', {
            type: 'collaborative',
            accuracy: 0.3,
            trainingData: 0,
            lastUpdated: Date.now(),
            parameters: { neighbors: 5, minSimilarity: 0.3 }
        });
    }
    extractFeatures(prediction) {
        return [
            prediction.confidence,
            prediction.priority / 100,
            prediction.estimatedValue,
            (prediction.expiryTime - Date.now()) / (60 * 60 * 1000), // Hours until expiry
            prediction.queryType === 'sequence' ? 1 : 0,
            prediction.queryType === 'temporal' ? 1 : 0,
            prediction.queryType === 'contextual' ? 1 : 0,
            prediction.queryType === 'collaborative' ? 1 : 0
        ];
    }
    updateModelAccuracy(queryType, wasAccurate) {
        const model = this.models.get(queryType);
        if (model) {
            const alpha = 0.1; // Learning rate
            model.accuracy = (1 - alpha) * model.accuracy + alpha * (wasAccurate ? 1 : 0);
            model.trainingData++;
            model.lastUpdated = Date.now();
        }
    }
    retrainModels() {
        // Simplified retraining - in production would use more sophisticated ML algorithms
        const recentData = this.trainingData.slice(-1000);
        for (const [type, model] of this.models) {
            const typeData = recentData.filter(d => d.target.includes(type));
            if (typeData.length > 10) {
                const accuracy = typeData.filter(d => d.outcome).length / typeData.length;
                model.accuracy = accuracy;
                model.lastUpdated = Date.now();
            }
        }
    }
    estimateQueryValue(cacheKey) {
        // Estimate computational cost saved by caching
        const keyParts = cacheKey.split(':');
        let value = 1;
        // Boost value for expensive operations
        if (cacheKey.includes('flow_analysis'))
            value *= 3;
        if (cacheKey.includes('knowledge_gap'))
            value *= 2.5;
        if (cacheKey.includes('productivity'))
            value *= 2;
        if (cacheKey.includes('search'))
            value *= 1.5;
        // Boost value for large datasets
        if (keyParts.some(part => part.includes('batch') || part.includes('all'))) {
            value *= 2;
        }
        return value;
    }
    getHistoricalRequestsForTime(timeOfDay, dayOfWeek) {
        // Simplified - would query actual database in production
        return this.trainingData
            .filter(d => {
            const requestTime = new Date(d.timestamp);
            return Math.abs(requestTime.getHours() - timeOfDay) <= 1 &&
                requestTime.getDay() === dayOfWeek;
        })
            .map(d => ({ key: d.target, timestamp: d.timestamp }));
    }
    findMostCommonQueries(requests) {
        const counts = new Map();
        requests.forEach(req => {
            counts.set(req.key, (counts.get(req.key) || 0) + 1);
        });
        return Array.from(counts.entries())
            .map(([key, count]) => ({ key, frequency: count / requests.length }))
            .sort((a, b) => b.frequency - a.frequency);
    }
    findRelatedQueries(queryType) {
        // Simplified query relation detection
        const related = this.trainingData
            .filter(d => d.target.includes(queryType))
            .map(d => ({ key: d.target, relevance: 0.7 }));
        return related.slice(0, 5);
    }
    findSimilarUsers(_recentKeys) {
        // Simplified user similarity - would use more sophisticated algorithms in production
        return [
            { userId: 'similar_user_1', similarity: 0.6 },
            { userId: 'similar_user_2', similarity: 0.4 }
        ];
    }
    getUserRecommendations(_userId) {
        // Simplified recommendations
        return [
            { key: 'recommended_query_1', similarity: 0.8 },
            { key: 'recommended_query_2', similarity: 0.6 }
        ];
    }
}
/**
 * Resource-aware cache warming engine
 */
class CacheWarmingEngine {
    config;
    analyticsEngine;
    databaseManager;
    warmingQueue = [];
    activeWarmingTasks = new Set();
    warmingStats = {
        successful: 0,
        failed: 0,
        skippedDueToResources: 0,
        totalEstimatedTimeSaved: 0
    };
    constructor(config, analyticsEngine, databaseManager) {
        this.config = config;
        this.analyticsEngine = analyticsEngine;
        this.databaseManager = databaseManager;
    }
    /**
     * Add predictions to warming queue
     */
    queuePredictions(predictions) {
        for (const prediction of predictions) {
            if (!this.activeWarmingTasks.has(prediction.cacheKey)) {
                this.warmingQueue.push(prediction);
            }
        }
        // Sort queue by priority
        this.warmingQueue.sort((a, b) => b.priority - a.priority);
        // Trim queue if too large
        if (this.warmingQueue.length > 100) {
            this.warmingQueue = this.warmingQueue.slice(0, 100);
        }
    }
    /**
     * Process warming queue based on resource availability
     */
    async processWarmingQueue() {
        if (!this.config.enabled || this.warmingQueue.length === 0)
            return;
        // Check resource constraints
        const resourceStatus = await this.checkResourceAvailability();
        if (!resourceStatus.canWarm) {
            this.warmingStats.skippedDueToResources++;
            return;
        }
        const maxOperations = Math.min(this.config.warmingStrategy.maxWarmingOperationsPerMinute, resourceStatus.maxOperations);
        const toProcess = this.warmingQueue.splice(0, maxOperations);
        for (const prediction of toProcess) {
            await this.warmCachePrediction(prediction);
        }
    }
    /**
     * Get warming performance statistics
     */
    getWarmingStats() {
        const total = this.warmingStats.successful + this.warmingStats.failed;
        const efficiency = total > 0 ? this.warmingStats.successful / total : 0;
        return {
            queueSize: this.warmingQueue.length,
            activeTasks: this.activeWarmingTasks.size,
            stats: {
                successful: this.warmingStats?.successful || 0,
                failed: this.warmingStats?.failed || 0,
                skipped: this.warmingStats?.skippedDueToResources || 0,
                totalProcessed: (this.warmingStats?.successful || 0) + (this.warmingStats?.failed || 0) + (this.warmingStats?.skippedDueToResources || 0)
            },
            efficiency
        };
    }
    async checkResourceAvailability() {
        const reasons = [];
        let maxOperations = this.config.warmingStrategy.maxWarmingOperationsPerMinute;
        // Check CPU utilization
        const cpuUsage = await this.getCpuUsage();
        if (cpuUsage > this.config.resourceThresholds.maxCpuUtilization) {
            reasons.push(`CPU usage too high: ${cpuUsage.toFixed(1)}%`);
            maxOperations = Math.floor(maxOperations * 0.5);
        }
        // Check memory usage
        const memoryUsage = process.memoryUsage();
        const memoryUsageMB = memoryUsage.heapUsed / (1024 * 1024);
        if (memoryUsageMB > this.config.resourceThresholds.maxMemoryUsageMB) {
            reasons.push(`Memory usage too high: ${memoryUsageMB.toFixed(1)}MB`);
            maxOperations = Math.floor(maxOperations * 0.3);
        }
        // Check active warming tasks
        if (this.activeWarmingTasks.size >= this.config.maxConcurrentPredictions) {
            reasons.push('Too many active warming tasks');
            maxOperations = 0;
        }
        const canWarm = maxOperations > 0 && reasons.length < 2;
        return {
            canWarm,
            maxOperations,
            reasons
        };
    }
    async warmCachePrediction(prediction) {
        this.activeWarmingTasks.add(prediction.cacheKey);
        try {
            // Determine warming strategy based on cache key
            const success = await this.executeWarmingStrategy(prediction);
            if (success) {
                this.warmingStats.successful++;
                this.warmingStats.totalEstimatedTimeSaved += prediction.estimatedValue * 1000; // Convert to ms
            }
            else {
                this.warmingStats.failed++;
            }
        }
        catch (error) {
            console.error(`Cache warming failed for ${prediction.cacheKey}:`, error);
            this.warmingStats.failed++;
        }
        finally {
            this.activeWarmingTasks.delete(prediction.cacheKey);
        }
    }
    async executeWarmingStrategy(prediction) {
        // Parse cache key to determine what to warm
        const keyParts = prediction.cacheKey.split(':');
        try {
            if (keyParts.includes('flow_analysis')) {
                return await this.warmFlowAnalysis(prediction);
            }
            else if (keyParts.includes('productivity')) {
                return await this.warmProductivityAnalysis(prediction);
            }
            else if (keyParts.includes('knowledge_gap')) {
                return await this.warmKnowledgeGapDetection(prediction);
            }
            else if (keyParts.includes('search')) {
                return await this.warmSearchResults(prediction);
            }
            else {
                return await this.warmGenericQuery(prediction);
            }
        }
        catch (error) {
            console.error(`Warming strategy execution failed:`, error);
            return false;
        }
    }
    async warmFlowAnalysis(prediction) {
        // Extract conversation IDs from context or key
        const conversationIds = this.extractConversationIds(prediction);
        if (conversationIds.length === 0)
            return false;
        // Fetch conversations and run flow analysis
        const conversations = await this.getConversationsWithMessages(conversationIds.slice(0, 5));
        if (conversations.length === 0)
            return false;
        // This would typically call the analytics engine to perform and cache flow analysis
        // For now, we'll simulate the caching
        await this.simulateAnalysisAndCache(prediction.cacheKey, conversations, 'flow');
        return true;
    }
    async warmProductivityAnalysis(prediction) {
        const conversationIds = this.extractConversationIds(prediction);
        if (conversationIds.length === 0)
            return false;
        const conversations = await this.getConversationsWithMessages(conversationIds.slice(0, 3));
        if (conversations.length === 0)
            return false;
        await this.simulateAnalysisAndCache(prediction.cacheKey, conversations, 'productivity');
        return true;
    }
    async warmKnowledgeGapDetection(prediction) {
        const conversationIds = this.extractConversationIds(prediction);
        if (conversationIds.length === 0)
            return false;
        const conversations = await this.getConversationsWithMessages(conversationIds.slice(0, 10));
        if (conversations.length === 0)
            return false;
        await this.simulateAnalysisAndCache(prediction.cacheKey, conversations, 'knowledge_gap');
        return true;
    }
    async warmSearchResults(prediction) {
        // Extract search query from cache key
        const searchQuery = this.extractSearchQuery(prediction.cacheKey);
        if (!searchQuery)
            return false;
        // Pre-warm search results
        await this.simulateSearchAndCache(prediction.cacheKey, searchQuery);
        return true;
    }
    async warmGenericQuery(prediction) {
        // For generic queries, we'll try to parse and execute them
        const queryInfo = this.parseGenericCacheKey(prediction.cacheKey);
        if (!queryInfo)
            return false;
        await this.simulateGenericQueryAndCache(prediction.cacheKey, queryInfo);
        return true;
    }
    extractConversationIds(prediction) {
        // Extract conversation IDs from cache key or context
        const keyParts = prediction.cacheKey.split(':');
        const conversationIds = [];
        // Look for UUIDs in key parts
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        keyParts.forEach(part => {
            if (uuidRegex.test(part)) {
                conversationIds.push(part);
            }
        });
        // If no specific IDs found, get recent conversations
        if (conversationIds.length === 0) {
            conversationIds.push(...this.getRecentConversationIds(5));
        }
        return conversationIds;
    }
    async getConversationsWithMessages(conversationIds) {
        const results = [];
        try {
            const db = this.databaseManager.getDatabase();
            for (const id of conversationIds) {
                const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
                if (conversation) {
                    const messages = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').all(id);
                    results.push({ conversation, messages });
                }
            }
        }
        catch (error) {
            console.error('Failed to fetch conversations for warming:', error);
        }
        return results;
    }
    getRecentConversationIds(limit) {
        try {
            const db = this.databaseManager.getDatabase();
            const recent = db.prepare('SELECT id FROM conversations ORDER BY created_at DESC LIMIT ?').all(limit);
            return recent.map(r => r.id);
        }
        catch (error) {
            console.error('Failed to fetch recent conversation IDs:', error);
            return [];
        }
    }
    extractSearchQuery(cacheKey) {
        // Extract search query from cache key
        const parts = cacheKey.split(':');
        const queryIndex = parts.indexOf('query');
        if (queryIndex >= 0 && queryIndex < parts.length - 1) {
            return decodeURIComponent(parts[queryIndex + 1]);
        }
        return null;
    }
    parseGenericCacheKey(cacheKey) {
        // Parse generic cache key to extract query information
        const parts = cacheKey.split(':');
        return {
            type: parts[0] || 'unknown',
            operation: parts[1] || 'query',
            parameters: parts.slice(2)
        };
    }
    async simulateAnalysisAndCache(cacheKey, conversations, analysisType) {
        // Simulate running analytics and caching results
        // In a real implementation, this would call the actual analytics engine
        // Simulate cache storage (would integrate with actual cache system)
        console.log(`[Predictive Cache] Warmed ${analysisType} analysis for ${conversations.length} conversations`);
    }
    async simulateSearchAndCache(cacheKey, searchQuery) {
        // Simulate search execution and caching
        console.log(`[Predictive Cache] Warmed search results for query: "${searchQuery}"`);
    }
    async simulateGenericQueryAndCache(cacheKey, queryInfo) {
        // Simulate generic query execution and caching
        console.log(`[Predictive Cache] Warmed generic query: ${queryInfo.type}.${queryInfo.operation}`);
    }
    getCpuUsage() {
        // Simplified CPU usage calculation
        // In production, would use more accurate system monitoring
        return Promise.resolve(Math.random() * 50 + 10); // Simulate 10-60% CPU usage
    }
}
/**
 * Main Predictive Cache Manager
 */
export class PredictiveCacheManager {
    databaseManager;
    analyticsEngine;
    config;
    patternAnalyzer;
    modelManager;
    warmingEngine;
    lastPredictionTime = 0;
    recentCacheKeys = [];
    intervalHandles = [];
    constructor(databaseManager, analyticsEngine, config) {
        this.databaseManager = databaseManager;
        this.analyticsEngine = analyticsEngine;
        this.config = config;
        this.patternAnalyzer = new UsagePatternAnalyzer(config);
        this.modelManager = new PredictionModelManager(config);
        this.warmingEngine = new CacheWarmingEngine(config, analyticsEngine, databaseManager);
    }
    /**
     * Initialize the predictive caching system
     */
    async initialize() {
        if (!this.config.enabled) {
            console.log('[Predictive Cache] Disabled by configuration');
            return;
        }
        console.log('[Predictive Cache] Initializing predictive caching system...');
        // Start background processes
        this.startBackgroundProcesses();
        console.log('[Predictive Cache] System initialized successfully');
        console.log(`   • Pattern analysis: ${this.config.learningEnabled ? 'Enabled' : 'Disabled'}`);
        console.log(`   • Prediction models: ${Object.keys(this.config.models).filter(k => this.config.models[k]).length} enabled`);
        console.log(`   • Cache warming: ${this.config.warmingStrategy.aggressiveness} mode`);
    }
    /**
     * Record cache access for pattern learning
     */
    recordCacheAccess(cacheKey, userId = 'default', context = {}) {
        if (!this.config.learningEnabled)
            return;
        const enrichedContext = {
            ...context,
            timestamp: Date.now(),
            timeOfDay: new Date().getHours(),
            dayOfWeek: new Date().getDay()
        };
        // Record for pattern analysis
        this.patternAnalyzer.recordRequest(cacheKey, userId, enrichedContext);
        // Update recent cache keys
        this.recentCacheKeys.push({
            key: cacheKey,
            timestamp: Date.now(),
            context: enrichedContext
        });
        // Maintain sliding window
        const windowMs = 60 * 60 * 1000; // 1 hour
        this.recentCacheKeys = this.recentCacheKeys.filter(item => Date.now() - item.timestamp < windowMs);
    }
    /**
     * Report prediction outcome for model improvement
     */
    reportPredictionOutcome(prediction, wasAccurate) {
        if (!this.config.learningEnabled)
            return;
        this.modelManager.updateModelWithOutcome(prediction, wasAccurate);
    }
    /**
     * Get comprehensive system status and performance metrics
     */
    getSystemStatus() {
        const patternStats = this.patternAnalyzer.getPatternStats();
        const modelStats = this.modelManager.getModelStats();
        const warmingStats = this.warmingEngine.getWarmingStats();
        const recentRequests = this.recentCacheKeys.filter(item => Date.now() - item.timestamp < 60 * 60 * 1000);
        return {
            enabled: this.config.enabled,
            patterns: patternStats,
            models: modelStats,
            warming: warmingStats,
            recentActivity: {
                totalRequests: this.recentCacheKeys.length,
                requestsPerHour: recentRequests.length,
                predictionsGenerated: warmingStats.stats.successful + warmingStats.stats.failed
            }
        };
    }
    /**
     * Manually trigger prediction generation and cache warming
     */
    async triggerPredictiveWarming() {
        if (!this.config.enabled)
            return [];
        const currentContext = this.getCurrentContext();
        const patterns = this.patternAnalyzer.getPredictivePatterns(this.recentCacheKeys.slice(-10).map(item => item.key), currentContext);
        const predictions = await this.modelManager.generatePredictions(currentContext, patterns);
        if (predictions.length > 0) {
            this.warmingEngine.queuePredictions(predictions);
        }
        return predictions;
    }
    /**
     * Update configuration at runtime
     */
    updateConfiguration(newConfig) {
        Object.assign(this.config, newConfig);
        if (!this.config.enabled) {
            this.shutdown();
        }
        else if (this.intervalHandles.length === 0) {
            this.startBackgroundProcesses();
        }
    }
    /**
     * Shutdown the predictive caching system
     */
    shutdown() {
        console.log('[Predictive Cache] Shutting down predictive caching system...');
        // Clear all intervals
        this.intervalHandles.forEach(handle => clearInterval(handle));
        this.intervalHandles = [];
        console.log('[Predictive Cache] Shutdown complete');
    }
    startBackgroundProcesses() {
        // Prediction generation interval
        const predictionInterval = setInterval(async () => {
            try {
                await this.triggerPredictiveWarming();
            }
            catch (error) {
                console.error('[Predictive Cache] Prediction generation failed:', error);
            }
        }, 5 * 60 * 1000); // Every 5 minutes
        this.intervalHandles.push(predictionInterval);
        // Cache warming processing interval
        const warmingInterval = setInterval(async () => {
            try {
                await this.warmingEngine.processWarmingQueue();
            }
            catch (error) {
                console.error('[Predictive Cache] Cache warming failed:', error);
            }
        }, 2 * 60 * 1000); // Every 2 minutes
        this.intervalHandles.push(warmingInterval);
        // Cleanup interval for old data
        const cleanupInterval = setInterval(() => {
            try {
                this.performCleanup();
            }
            catch (error) {
                console.error('[Predictive Cache] Cleanup failed:', error);
            }
        }, 30 * 60 * 1000); // Every 30 minutes
        this.intervalHandles.push(cleanupInterval);
    }
    getCurrentContext() {
        const now = new Date();
        const recentKeys = this.recentCacheKeys.slice(-10).map(item => item.key);
        // Extract query types from recent keys
        const queryTypes = [...new Set(recentKeys.map(key => key.split(':')[0]).filter(Boolean))];
        const sessionStart = this.recentCacheKeys.length > 0
            ? Math.min(...this.recentCacheKeys.map(item => item.timestamp))
            : Date.now();
        return {
            recentKeys,
            timeOfDay: now.getHours(),
            dayOfWeek: now.getDay(),
            sessionDuration: Date.now() - sessionStart,
            queryTypes
        };
    }
    performCleanup() {
        // Clean up old recent cache keys
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
        this.recentCacheKeys = this.recentCacheKeys.filter(item => item.timestamp > cutoffTime);
    }
}
// Default configuration
export const DEFAULT_PREDICTIVE_CACHE_CONFIG = {
    enabled: true,
    learningEnabled: true,
    maxPatternHistory: 10000,
    minPatternFrequency: 3,
    predictionThreshold: 0.4,
    maxConcurrentPredictions: 10,
    resourceThresholds: {
        maxCpuUtilization: 70,
        maxMemoryUsageMB: 400,
        maxDiskIOPS: 1000
    },
    warmingStrategy: {
        aggressiveness: 'moderate',
        maxWarmingOperationsPerMinute: 5,
        priorityWeighting: {
            frequency: 0.3,
            recency: 0.2,
            confidence: 0.3,
            userContext: 0.2
        }
    },
    models: {
        enableSequenceAnalysis: true,
        enableCollaborativeFiltering: true,
        enableTemporalPatterns: true,
        enableContextualPredictions: true
    }
};
//# sourceMappingURL=PredictiveCacheManager.js.map