/**
 * LLM Provider Interface
 *
 * Abstract interface for Large Language Model providers that can generate
 * conversation summaries. Supports both local and external providers.
 */
import { Message } from '../../types/interfaces.js';
/**
 * Configuration for an LLM provider
 */
export interface ProviderConfig {
    id: string;
    name: string;
    type: 'local' | 'external';
    endpoint?: string;
    apiKeyEnv?: string;
    modelName: string;
    maxTokens: number;
    temperature?: number;
    isActive?: boolean;
    priority?: number;
    costPer1kTokens?: number;
    metadata?: Record<string, any>;
}
/**
 * Request for summary generation
 */
export interface SummaryRequest {
    messages: Message[];
    level: 'brief' | 'standard' | 'detailed';
    maxTokens: number;
    focusTopics?: string[];
    previousSummary?: string;
    context?: {
        conversationId: string;
        timeRange?: {
            start: Date;
            end: Date;
        };
        userPreferences?: Record<string, any>;
    };
}
/**
 * Response from summary generation
 */
export interface SummaryResponse {
    summary: string;
    tokenCount: number;
    inputTokens: number;
    outputTokens: number;
    cost?: number;
    qualityScore?: number;
    metadata?: Record<string, any>;
    processingTime?: number;
}
/**
 * Provider health status
 */
export interface ProviderHealth {
    isAvailable: boolean;
    latency?: number;
    lastChecked: Date;
    error?: string;
    modelInfo?: ModelInfo;
}
/**
 * Information about the model
 */
export interface ModelInfo {
    name: string;
    version?: string;
    contextLength: number;
    tokensPerSecond?: number;
    memoryUsage?: number;
    capabilities?: string[];
}
/**
 * Token counting result
 */
export interface TokenCount {
    count: number;
    model: string;
    estimatedCost?: number;
}
/**
 * Provider statistics
 */
export interface ProviderStats {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageLatency: number;
    totalCost: number;
    lastUsed?: Date;
}
/**
 * Abstract base class for LLM providers
 */
export declare abstract class LLMProvider {
    protected config: ProviderConfig;
    protected stats: ProviderStats;
    constructor(config: ProviderConfig);
    abstract initialize(): Promise<void>;
    abstract isAvailable(): Promise<boolean>;
    abstract generateSummary(request: SummaryRequest): Promise<SummaryResponse>;
    abstract countTokens(text: string): Promise<TokenCount>;
    abstract getHealth(): Promise<ProviderHealth>;
    getId(): string;
    getName(): string;
    getType(): 'local' | 'external';
    getConfig(): ProviderConfig;
    getMaxTokens(): number;
    getModelName(): string;
    getPriority(): number;
    isActive(): boolean;
    getStats(): ProviderStats;
    estimateCost(tokens: number): number;
    /**
     * Update provider configuration
     */
    updateConfig(updates: Partial<ProviderConfig>): void;
    /**
     * Record successful request
     */
    protected recordSuccess(latency: number, cost?: number): void;
    /**
     * Record failed request
     */
    protected recordFailure(): void;
    /**
     * Validate request parameters
     */
    protected validateRequest(request: SummaryRequest): void;
    /**
     * Get model information (optional implementation)
     */
    getModelInfo(): Promise<ModelInfo | undefined>;
    /**
     * Cleanup resources (optional implementation)
     */
    cleanup(): Promise<void>;
    /**
     * Test the provider with a simple request (optional implementation)
     */
    testConnection(): Promise<boolean>;
}
/**
 * Provider error types
 */
export declare class ProviderError extends Error {
    readonly code: string;
    readonly provider: string;
    readonly cause?: Error;
    constructor(message: string, code: string, provider: string, cause?: Error);
}
export declare class ProviderUnavailableError extends ProviderError {
    constructor(provider: string, cause?: Error);
}
export declare class ProviderTimeoutError extends ProviderError {
    constructor(provider: string, timeout: number);
}
export declare class ProviderAuthError extends ProviderError {
    constructor(provider: string, cause?: Error);
}
export declare class ProviderRateLimitError extends ProviderError {
    constructor(provider: string, retryAfter?: number);
}
export declare class ProviderQuotaError extends ProviderError {
    constructor(provider: string, cause?: Error);
}
//# sourceMappingURL=LLMProvider.d.ts.map