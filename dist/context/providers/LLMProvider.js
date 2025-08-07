/**
 * LLM Provider Interface
 *
 * Abstract interface for Large Language Model providers that can generate
 * conversation summaries. Supports both local and external providers.
 */
/**
 * Abstract base class for LLM providers
 */
export class LLMProvider {
    config;
    stats;
    constructor(config) {
        this.config = config;
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageLatency: 0,
            totalCost: 0
        };
    }
    // Concrete methods with default implementations
    getId() {
        return this.config.id;
    }
    getName() {
        return this.config.name;
    }
    getType() {
        return this.config.type;
    }
    getConfig() {
        return { ...this.config };
    }
    getMaxTokens() {
        return this.config.maxTokens;
    }
    getModelName() {
        return this.config.modelName;
    }
    getPriority() {
        return this.config.priority || 0;
    }
    isActive() {
        return this.config.isActive !== false;
    }
    getStats() {
        return { ...this.stats };
    }
    estimateCost(tokens) {
        if (!this.config.costPer1kTokens) {
            return 0;
        }
        return (tokens / 1000) * this.config.costPer1kTokens;
    }
    /**
     * Update provider configuration
     */
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
    }
    /**
     * Record successful request
     */
    recordSuccess(latency, cost = 0) {
        this.stats.totalRequests++;
        this.stats.successfulRequests++;
        this.stats.totalCost += cost;
        this.stats.lastUsed = new Date();
        // Update average latency
        const totalSuccessful = this.stats.successfulRequests;
        this.stats.averageLatency =
            (this.stats.averageLatency * (totalSuccessful - 1) + latency) / totalSuccessful;
    }
    /**
     * Record failed request
     */
    recordFailure() {
        this.stats.totalRequests++;
        this.stats.failedRequests++;
    }
    /**
     * Validate request parameters
     */
    validateRequest(request) {
        if (!request.messages || request.messages.length === 0) {
            throw new Error('No messages provided for summarization');
        }
        if (request.maxTokens <= 0 || request.maxTokens > this.config.maxTokens) {
            throw new Error(`Invalid token count: ${request.maxTokens}. Must be between 1 and ${this.config.maxTokens}`);
        }
        if (!['brief', 'standard', 'detailed'].includes(request.level)) {
            throw new Error(`Invalid summary level: ${request.level}`);
        }
    }
    /**
     * Get model information (optional implementation)
     */
    async getModelInfo() {
        return undefined;
    }
    /**
     * Cleanup resources (optional implementation)
     */
    async cleanup() {
        // Default: no cleanup needed
    }
    /**
     * Test the provider with a simple request (optional implementation)
     */
    async testConnection() {
        try {
            const health = await this.getHealth();
            return health.isAvailable;
        }
        catch {
            return false;
        }
    }
}
/**
 * Provider error types
 */
export class ProviderError extends Error {
    code;
    provider;
    cause;
    constructor(message, code, provider, cause) {
        super(message);
        this.code = code;
        this.provider = provider;
        this.cause = cause;
        this.name = 'ProviderError';
    }
}
export class ProviderUnavailableError extends ProviderError {
    constructor(provider, cause) {
        super(`Provider ${provider} is not available`, 'PROVIDER_UNAVAILABLE', provider, cause);
        this.name = 'ProviderUnavailableError';
    }
}
export class ProviderTimeoutError extends ProviderError {
    constructor(provider, timeout) {
        super(`Provider ${provider} timed out after ${timeout}ms`, 'PROVIDER_TIMEOUT', provider);
        this.name = 'ProviderTimeoutError';
    }
}
export class ProviderAuthError extends ProviderError {
    constructor(provider, cause) {
        super(`Authentication failed for provider ${provider}`, 'PROVIDER_AUTH_ERROR', provider, cause);
        this.name = 'ProviderAuthError';
    }
}
export class ProviderRateLimitError extends ProviderError {
    constructor(provider, retryAfter) {
        super(`Rate limit exceeded for provider ${provider}${retryAfter ? `. Retry after ${retryAfter}s` : ''}`, 'PROVIDER_RATE_LIMIT', provider);
        this.name = 'ProviderRateLimitError';
    }
}
export class ProviderQuotaError extends ProviderError {
    constructor(provider, cause) {
        super(`Quota exceeded for provider ${provider}`, 'PROVIDER_QUOTA_EXCEEDED', provider, cause);
        this.name = 'ProviderQuotaError';
    }
}
//# sourceMappingURL=LLMProvider.js.map