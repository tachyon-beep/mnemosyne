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
import { DatabaseManager } from '../../storage/Database.js';
import { AnalyticsEngine } from '../services/AnalyticsEngine.js';
export interface UsagePattern {
    id: string;
    userId?: string;
    sequence: string[];
    frequency: number;
    lastSeen: number;
    confidence: number;
    context: {
        timeOfDay?: number;
        dayOfWeek?: number;
        sessionDuration?: number;
        queryTypes?: string[];
    };
}
export interface PredictionModel {
    type: 'sequence' | 'collaborative' | 'temporal' | 'contextual';
    accuracy: number;
    trainingData: number;
    lastUpdated: number;
    parameters: Record<string, any>;
}
export interface CachePrediction {
    cacheKey: string;
    queryType: string;
    confidence: number;
    priority: number;
    estimatedValue: number;
    context: Record<string, any>;
    expiryTime: number;
}
export interface PredictiveCacheConfig {
    enabled: boolean;
    learningEnabled: boolean;
    maxPatternHistory: number;
    minPatternFrequency: number;
    predictionThreshold: number;
    maxConcurrentPredictions: number;
    resourceThresholds: {
        maxCpuUtilization: number;
        maxMemoryUsageMB: number;
        maxDiskIOPS: number;
    };
    warmingStrategy: {
        aggressiveness: 'conservative' | 'moderate' | 'aggressive';
        maxWarmingOperationsPerMinute: number;
        priorityWeighting: {
            frequency: number;
            recency: number;
            confidence: number;
            userContext: number;
        };
    };
    models: {
        enableSequenceAnalysis: boolean;
        enableCollaborativeFiltering: boolean;
        enableTemporalPatterns: boolean;
        enableContextualPredictions: boolean;
    };
}
/**
 * Analyzes user behavior patterns to identify predictable request sequences
 */
declare class UsagePatternAnalyzer {
    private config;
    private patterns;
    private recentRequests;
    private sessionData;
    constructor(config: PredictiveCacheConfig);
    /**
     * Record a cache request for pattern analysis
     */
    recordRequest(cacheKey: string, userId?: string, context?: Record<string, unknown>): void;
    /**
     * Get patterns that might predict next requests
     */
    getPredictivePatterns(recentKeys: string[], context?: Record<string, unknown>): UsagePattern[];
    /**
     * Get comprehensive pattern statistics
     */
    getPatternStats(): {
        totalPatterns: number;
        activePatterns: number;
        averageConfidence: number;
        topPatterns: Array<{
            pattern: UsagePattern;
            strength: number;
        }>;
    };
    private updateSessionData;
    private extractPatterns;
    private extractContextFromRecent;
    private mode;
    private calculatePatternMatch;
    private calculateSequenceOverlap;
    private calculateContextMatch;
    private cleanupOldPatterns;
}
/**
 * Machine learning models for cache prediction
 */
declare class PredictionModelManager {
    private config;
    private models;
    private trainingData;
    constructor(config: PredictiveCacheConfig);
    /**
     * Generate predictions based on current context
     */
    generatePredictions(currentContext: Record<string, unknown>, patterns: UsagePattern[]): Promise<CachePrediction[]>;
    /**
     * Update model with prediction outcome
     */
    updateModelWithOutcome(prediction: CachePrediction, wasAccurate: boolean): void;
    /**
     * Get model performance statistics
     */
    getModelStats(): Map<string, {
        accuracy: number;
        predictions: number;
        lastUpdated: number;
    }>;
    private generateSequencePredictions;
    private generateTemporalPredictions;
    private generateContextualPredictions;
    private generateCollaborativePredictions;
    private rankAndDedupePredictions;
    private initializeModels;
    private extractFeatures;
    private updateModelAccuracy;
    private retrainModels;
    private estimateQueryValue;
    private getHistoricalRequestsForTime;
    private findMostCommonQueries;
    private findRelatedQueries;
    private findSimilarUsers;
    private getUserRecommendations;
}
/**
 * Resource-aware cache warming engine
 */
declare class CacheWarmingEngine {
    private config;
    private analyticsEngine;
    private databaseManager;
    private warmingQueue;
    private activeWarmingTasks;
    private warmingStats;
    constructor(config: PredictiveCacheConfig, analyticsEngine: AnalyticsEngine, databaseManager: DatabaseManager);
    /**
     * Add predictions to warming queue
     */
    queuePredictions(predictions: CachePrediction[]): void;
    /**
     * Process warming queue based on resource availability
     */
    processWarmingQueue(): Promise<void>;
    /**
     * Get warming performance statistics
     */
    getWarmingStats(): {
        queueSize: number;
        activeTasks: number;
        stats: {
            successful: number;
            failed: number;
            skipped: number;
            totalProcessed: number;
        };
        efficiency: number;
    };
    private checkResourceAvailability;
    private warmCachePrediction;
    private executeWarmingStrategy;
    private warmFlowAnalysis;
    private warmProductivityAnalysis;
    private warmKnowledgeGapDetection;
    private warmSearchResults;
    private warmGenericQuery;
    private extractConversationIds;
    private getConversationsWithMessages;
    private getRecentConversationIds;
    private extractSearchQuery;
    private parseGenericCacheKey;
    private simulateAnalysisAndCache;
    private simulateSearchAndCache;
    private simulateGenericQueryAndCache;
    private getCpuUsage;
}
/**
 * Main Predictive Cache Manager
 */
export declare class PredictiveCacheManager {
    private databaseManager;
    private analyticsEngine;
    private config;
    private patternAnalyzer;
    private modelManager;
    private warmingEngine;
    private lastPredictionTime;
    private recentCacheKeys;
    private intervalHandles;
    constructor(databaseManager: DatabaseManager, analyticsEngine: AnalyticsEngine, config: PredictiveCacheConfig);
    /**
     * Initialize the predictive caching system
     */
    initialize(): Promise<void>;
    /**
     * Record cache access for pattern learning
     */
    recordCacheAccess(cacheKey: string, userId?: string, context?: Record<string, unknown>): void;
    /**
     * Report prediction outcome for model improvement
     */
    reportPredictionOutcome(prediction: CachePrediction, wasAccurate: boolean): void;
    /**
     * Get comprehensive system status and performance metrics
     */
    getSystemStatus(): {
        enabled: boolean;
        patterns: ReturnType<UsagePatternAnalyzer['getPatternStats']>;
        models: ReturnType<PredictionModelManager['getModelStats']>;
        warming: ReturnType<CacheWarmingEngine['getWarmingStats']>;
        recentActivity: {
            totalRequests: number;
            requestsPerHour: number;
            predictionsGenerated: number;
        };
    };
    /**
     * Manually trigger prediction generation and cache warming
     */
    triggerPredictiveWarming(): Promise<CachePrediction[]>;
    /**
     * Update configuration at runtime
     */
    updateConfiguration(newConfig: Partial<PredictiveCacheConfig>): void;
    /**
     * Shutdown the predictive caching system
     */
    shutdown(): void;
    private startBackgroundProcesses;
    private getCurrentContext;
    private performCleanup;
}
export declare const DEFAULT_PREDICTIVE_CACHE_CONFIG: PredictiveCacheConfig;
export {};
//# sourceMappingURL=PredictiveCacheManager.d.ts.map