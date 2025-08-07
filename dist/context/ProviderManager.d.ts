/**
 * Provider Manager
 *
 * Manages multiple LLM providers with fallback chains, health monitoring,
 * and intelligent provider selection for conversation summarization.
 */
import { LLMProvider, ProviderConfig, SummaryRequest, SummaryResponse } from './providers/LLMProvider.js';
/**
 * Provider selection strategy
 */
export type ProviderStrategy = 'priority' | 'cost-optimal' | 'performance' | 'quality' | 'fallback';
/**
 * Provider manager configuration
 */
export interface ProviderManagerConfig {
    defaultStrategy: ProviderStrategy;
    maxRetries: number;
    retryDelay: number;
    healthCheckInterval: number;
    costLimit?: number;
}
/**
 * Daily usage tracking
 */
interface DailyUsage {
    date: string;
    totalCost: number;
    requestCount: number;
    providerUsage: Record<string, {
        cost: number;
        requests: number;
    }>;
}
/**
 * Provider Manager class
 */
export declare class ProviderManager {
    private providers;
    private providerStatus;
    private config;
    private healthCheckTimer?;
    private dailyUsage;
    constructor(config: ProviderManagerConfig);
    /**
     * Register a provider
     */
    registerProvider(config: ProviderConfig): Promise<void>;
    /**
     * Unregister a provider
     */
    unregisterProvider(providerId: string): Promise<void>;
    /**
     * Generate summary using best available provider
     */
    generateSummary(summaryRequest: SummaryRequest, strategy?: ProviderStrategy): Promise<SummaryResponse>;
    /**
     * Get provider statistics
     */
    getProviderStats(): Array<{
        id: string;
        name: string;
        type: 'local' | 'external';
        isHealthy: boolean;
        consecutiveFailures: number;
        avgLatency: number;
        totalCost: number;
        dailyCost: number;
        dailyRequests: number;
    }>;
    /**
     * Get daily usage summary
     */
    getDailyUsage(): DailyUsage;
    /**
     * Get healthy providers
     */
    getHealthyProviders(): LLMProvider[];
    /**
     * Manual health check for all providers
     */
    checkAllProviders(): Promise<void>;
    /**
     * Cleanup resources
     */
    cleanup(): Promise<void>;
    /**
     * Create provider instance based on configuration
     */
    private createProvider;
    /**
     * Select best provider based on strategy
     */
    private selectProvider;
    /**
     * Execute request with retry logic
     */
    private executeWithRetry;
    /**
     * Check if request would exceed cost limit
     */
    private wouldExceedCostLimit;
    /**
     * Update provider status
     */
    private updateProviderStatus;
    /**
     * Mark provider as unhealthy
     */
    private markProviderUnhealthy;
    /**
     * Update daily usage tracking
     */
    private updateDailyUsage;
    /**
     * Initialize daily usage tracking
     */
    private initializeDailyUsage;
    /**
     * Start health checking timer
     */
    private startHealthChecking;
    /**
     * Sleep utility
     */
    private sleep;
}
export {};
//# sourceMappingURL=ProviderManager.d.ts.map