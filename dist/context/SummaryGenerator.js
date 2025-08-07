/**
 * Summary Generator - Hierarchical conversation summarization service
 *
 * This service provides intelligent conversation summarization using multiple
 * LLM providers with automatic fallback, quality validation, and temporal compression.
 *
 * Key features:
 * - Hierarchical summary levels (brief/standard/detailed)
 * - Temporal decay strategy for older conversations
 * - Quality validation and scoring
 * - Batch processing for efficiency
 * - Provider failover and cost management
 */
import { SummaryValidator } from './validators/SummaryValidator.js';
/**
 * Main summary generator service
 */
export class SummaryGenerator {
    providerManager;
    summaryRepository;
    historyRepository;
    cacheRepository;
    validator;
    config;
    constructor(providerManager, summaryRepository, historyRepository, cacheRepository, tokenCounter, config = {}) {
        this.providerManager = providerManager;
        this.summaryRepository = summaryRepository;
        this.historyRepository = historyRepository;
        this.cacheRepository = cacheRepository;
        this.validator = new SummaryValidator(tokenCounter);
        // Set default configuration
        this.config = {
            defaultLevel: 'standard',
            enableValidation: true,
            minQualityScore: 0.7,
            maxRetries: 3,
            enableBatchProcessing: true,
            maxBatchSize: 10,
            enableCaching: true,
            cacheTtl: 24 * 60 * 60 * 1000, // 24 hours
            temporalCompression: {
                recentThresholdHours: 24,
                mediumThresholdDays: 7,
                forceOldBrief: true
            },
            ...config
        };
    }
    /**
     * Generate a single conversation summary
     */
    async generateSummary(request) {
        const startTime = Date.now();
        const conversationAge = this.getConversationAge(request.messages);
        const targetLevel = this.determineTargetLevel(request.level, conversationAge);
        // Check cache first
        if (this.config.enableCaching && !request.forceRegenerate) {
            const cached = await this.getCachedSummary(request.conversationId, targetLevel);
            if (cached) {
                return {
                    summary: cached,
                    metadata: {
                        provider: cached.provider,
                        model: cached.model,
                        generationTime: Date.now() - startTime,
                        fromCache: true,
                        qualityScore: cached.qualityScore
                    }
                };
            }
        }
        // Start generation history tracking
        const historyId = await this.startGenerationHistory(request.conversationId, targetLevel);
        let lastError;
        let result;
        // Retry logic
        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                result = await this.attemptGeneration(request, targetLevel, historyId);
                // Validate if enabled
                if (this.config.enableValidation) {
                    const validation = await this.validator.validateSummary(result.summary, request.messages);
                    result.validation = validation;
                    if (validation.score < this.config.minQualityScore) {
                        throw new Error(`Summary quality too low: ${validation.score} < ${this.config.minQualityScore}`);
                    }
                }
                // Save successful generation
                await this.summaryRepository.create({
                    id: result.summary.id,
                    conversationId: request.conversationId,
                    level: targetLevel,
                    summaryText: result.summary.summaryText,
                    tokenCount: result.summary.tokenCount,
                    provider: result.metadata.provider,
                    model: result.metadata.model,
                    messageCount: request.messages.length,
                    startMessageId: request.messages[0]?.id,
                    endMessageId: request.messages[request.messages.length - 1]?.id,
                    qualityScore: result.validation?.score,
                    metadata: {
                        generationTime: result.metadata.generationTime,
                        cost: result.metadata.cost,
                        focusTopics: request.focusTopics,
                        temporalLevel: this.getTemporalCategory(conversationAge)
                    }
                });
                // Update history
                await this.completeGenerationHistory(historyId, result);
                // Cache if enabled
                if (this.config.enableCaching) {
                    await this.cacheResult(result.summary, targetLevel);
                }
                break;
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');
                console.warn(`Summary generation attempt ${attempt} failed:`, lastError.message);
                if (attempt === this.config.maxRetries) {
                    await this.failGenerationHistory(historyId, lastError);
                }
            }
        }
        if (!result) {
            throw lastError || new Error('Summary generation failed after all retries');
        }
        result.metadata.generationTime = Date.now() - startTime;
        return result;
    }
    /**
     * Generate multiple summaries in batch
     */
    async generateBatch(request) {
        if (!this.config.enableBatchProcessing) {
            throw new Error('Batch processing is disabled');
        }
        const startTime = Date.now();
        const successes = [];
        const failures = [];
        let totalCost = 0;
        const strategy = request.batchStrategy || 'optimal';
        const maxConcurrency = Math.min(request.maxConcurrency || 3, this.config.maxBatchSize);
        if (strategy === 'parallel' || strategy === 'optimal') {
            // Process in parallel with concurrency limit
            const chunks = this.chunkArray(request.requests, maxConcurrency);
            for (const chunk of chunks) {
                const promises = chunk.map(async (genRequest) => {
                    try {
                        const result = await this.generateSummary(genRequest);
                        successes.push(result);
                        totalCost += result.metadata.cost || 0;
                    }
                    catch (error) {
                        failures.push({
                            request: genRequest,
                            error: error instanceof Error ? error : new Error('Unknown error')
                        });
                    }
                });
                await Promise.all(promises);
            }
        }
        else {
            // Sequential processing
            for (const genRequest of request.requests) {
                try {
                    const result = await this.generateSummary(genRequest);
                    successes.push(result);
                    totalCost += result.metadata.cost || 0;
                }
                catch (error) {
                    failures.push({
                        request: genRequest,
                        error: error instanceof Error ? error : new Error('Unknown error')
                    });
                }
            }
        }
        const totalTime = Date.now() - startTime;
        const successRate = successes.length / (successes.length + failures.length);
        return {
            successes,
            failures,
            metadata: {
                totalTime,
                totalCost,
                successRate
            }
        };
    }
    /**
     * Get existing summaries for a conversation
     */
    async getConversationSummaries(conversationId, level) {
        const result = await this.summaryRepository.findByConversation(conversationId, level);
        return result.data;
    }
    /**
     * Invalidate summaries for a conversation (e.g., when messages are updated)
     */
    async invalidateConversationSummaries(conversationId) {
        await this.summaryRepository.invalidateForConversation(conversationId);
        // Clear cache entries
        if (this.config.enableCaching) {
            const cacheKeys = [
                `summary:${conversationId}:brief`,
                `summary:${conversationId}:standard`,
                `summary:${conversationId}:detailed`
            ];
            for (const key of cacheKeys) {
                await this.cacheRepository.delete(key);
            }
        }
    }
    /**
     * Get generation statistics
     */
    async getGenerationStats() {
        // This would require additional queries to the repository
        // For now, return placeholder structure
        return {
            totalSummaries: 0,
            summariesByLevel: {},
            averageQualityScore: 0,
            topProviders: [],
            recentGenerations: 0
        };
    }
    /**
     * Attempt a single generation
     */
    async attemptGeneration(request, level, _historyId) {
        const conversationType = this.detectConversationType(request.messages);
        const maxTokens = this.getTargetTokenCount(level);
        // Create LLM request
        const llmRequest = {
            messages: request.messages,
            level,
            maxTokens: request.maxTokens || maxTokens,
            focusTopics: request.focusTopics,
            previousSummary: request.previousSummary,
            context: {
                conversationId: request.conversationId,
                timeRange: this.getTimeRange(request.messages),
                userPreferences: {
                    conversationType,
                    level
                }
            }
        };
        // Generate summary using provider manager
        const strategy = request.providerStrategy || 'quality';
        const response = await this.providerManager.generateSummary(llmRequest, strategy);
        // Create summary object
        const summary = {
            id: this.generateId(),
            conversationId: request.conversationId,
            level,
            summaryText: response.summary,
            tokenCount: response.tokenCount,
            provider: 'provider', // Will be updated with actual provider
            model: 'model', // Will be updated with actual model
            generatedAt: Date.now(),
            messageCount: request.messages.length,
            startMessageId: request.messages[0]?.id,
            endMessageId: request.messages[request.messages.length - 1]?.id,
            metadata: {
                conversationType,
                inputTokens: response.inputTokens,
                outputTokens: response.outputTokens,
                processingTime: response.processingTime
            }
        };
        return {
            summary,
            metadata: {
                provider: summary.provider,
                model: summary.model,
                generationTime: response.processingTime || 0,
                fromCache: false,
                cost: response.cost,
                qualityScore: response.qualityScore
            }
        };
    }
    /**
     * Determine target summary level based on temporal compression
     */
    determineTargetLevel(requestedLevel, conversationAge) {
        if (requestedLevel) {
            return requestedLevel;
        }
        const ageHours = conversationAge / (1000 * 60 * 60);
        const ageDays = ageHours / 24;
        if (ageHours <= this.config.temporalCompression.recentThresholdHours) {
            return 'detailed';
        }
        else if (ageDays <= this.config.temporalCompression.mediumThresholdDays) {
            return 'standard';
        }
        else {
            return this.config.temporalCompression.forceOldBrief ? 'brief' : 'standard';
        }
    }
    /**
     * Get conversation age in milliseconds
     */
    getConversationAge(messages) {
        if (messages.length === 0)
            return 0;
        const oldestMessage = messages.reduce((oldest, msg) => msg.createdAt < oldest.createdAt ? msg : oldest);
        return Date.now() - oldestMessage.createdAt;
    }
    /**
     * Get temporal category for metadata
     */
    getTemporalCategory(age) {
        const ageHours = age / (1000 * 60 * 60);
        const ageDays = ageHours / 24;
        if (ageHours <= this.config.temporalCompression.recentThresholdHours) {
            return 'recent';
        }
        else if (ageDays <= this.config.temporalCompression.mediumThresholdDays) {
            return 'medium';
        }
        else {
            return 'old';
        }
    }
    /**
     * Detect conversation type from messages
     */
    detectConversationType(messages) {
        const content = messages.map(m => m.content.toLowerCase()).join(' ');
        if (content.includes('code') || content.includes('function') || content.includes('bug')) {
            return 'technical';
        }
        else if (content.includes('plan') || content.includes('project') || content.includes('task')) {
            return 'planning';
        }
        else if (content.includes('help') || content.includes('support') || content.includes('issue')) {
            return 'support';
        }
        else {
            return 'general';
        }
    }
    /**
     * Get target token count for summary level
     */
    getTargetTokenCount(level) {
        switch (level) {
            case 'brief': return 100;
            case 'standard': return 300;
            case 'detailed': return 1000;
            default: return 300;
        }
    }
    /**
     * Get time range from messages
     */
    getTimeRange(messages) {
        if (messages.length === 0)
            return undefined;
        const timestamps = messages.map(m => m.createdAt);
        return {
            start: new Date(Math.min(...timestamps)),
            end: new Date(Math.max(...timestamps))
        };
    }
    /**
     * Check for cached summary
     */
    async getCachedSummary(conversationId, level) {
        const cacheKey = `summary:${conversationId}:${level}`;
        const cached = await this.cacheRepository.get(cacheKey);
        if (cached && Date.now() - cached.createdAt < this.config.cacheTtl) {
            try {
                return JSON.parse(cached.assembledContext);
            }
            catch {
                // Invalid cache entry, ignore
            }
        }
        return null;
    }
    /**
     * Cache generation result
     */
    async cacheResult(summary, level) {
        const cacheKey = `summary:${summary.conversationId}:${level}`;
        const cacheData = {
            summaryIds: [summary.id],
            assembledContext: JSON.stringify(summary),
            tokenCount: summary.tokenCount
        };
        await this.cacheRepository.set(cacheKey, cacheData, this.config.cacheTtl / (1000 * 60 * 60));
    }
    /**
     * Start generation history tracking
     */
    async startGenerationHistory(_conversationId, _level) {
        const historyId = this.generateId();
        await this.historyRepository.recordStart({
            summaryId: historyId, // Use historyId as placeholder
            providerId: 'pending',
            inputTokens: 0
        });
        return historyId;
    }
    /**
     * Complete generation history
     */
    async completeGenerationHistory(historyId, result) {
        await this.historyRepository.recordComplete(historyId, {
            outputTokens: result.summary.metadata?.outputTokens || 0,
            cost: result.metadata.cost || 0
        });
    }
    /**
     * Mark generation history as failed
     */
    async failGenerationHistory(historyId, error) {
        await this.historyRepository.recordFailure(historyId, error.message);
    }
    /**
     * Chunk array into smaller arrays
     */
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    /**
     * Generate unique ID
     */
    generateId() {
        return `sum_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
}
//# sourceMappingURL=SummaryGenerator.js.map