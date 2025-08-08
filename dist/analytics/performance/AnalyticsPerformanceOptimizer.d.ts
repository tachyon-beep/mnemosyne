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
import { DatabaseManager } from '../../storage/Database.js';
import { ConversationFlowAnalyzer } from '../analyzers/ConversationFlowAnalyzer.js';
import { ProductivityAnalyzer } from '../analyzers/ProductivityAnalyzer.js';
import { KnowledgeGapDetector } from '../analyzers/KnowledgeGapDetector.js';
import { DecisionTracker } from '../analyzers/DecisionTracker.js';
import { AnalyticsEngine } from '../services/AnalyticsEngine.js';
import { Message, Conversation } from '../../types/interfaces.js';
import { PredictiveCacheConfig, CachePrediction } from './PredictiveCacheManager.js';
export interface PerformanceMetrics {
    queryExecutionTimes: Map<string, number[]>;
    cacheHitRates: Map<string, {
        hits: number;
        misses: number;
    }>;
    memoryUsage: {
        current: number;
        peak: number;
        gcEvents: number;
    };
    algorithmPerformance: {
        averageCircularityTime: number;
        averageClusteringTime: number;
        averageFlowAnalysisTime: number;
    };
    parallelizationEfficiency: {
        parallelTasks: number;
        speedupFactor: number;
        efficiency: number;
    };
}
export interface OptimizationConfig {
    enableQueryCaching: boolean;
    enableMemoryOptimization: boolean;
    enableParallelProcessing: boolean;
    maxMemoryUsageMB: number;
    queryCacheTTLMinutes: number;
    parallelWorkers: number;
    batchSize: number;
    enablePerformanceMonitoring: boolean;
    enablePredictiveCaching: boolean;
    predictiveCache?: Partial<PredictiveCacheConfig>;
}
export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
    hits: number;
    size: number;
}
/**
 * Main performance optimizer class
 */
export declare class AnalyticsPerformanceOptimizer {
    private databaseManager;
    private analyticsEngine?;
    private cache;
    private queryExecutor;
    private parallelProcessor;
    private streamProcessor;
    private metrics;
    private config;
    private predictiveCacheManager?;
    constructor(databaseManager: DatabaseManager, analyticsEngine?: AnalyticsEngine, config?: Partial<OptimizationConfig>);
    /**
     * Optimize conversation flow analysis with caching and parallel processing
     */
    optimizeFlowAnalysis(conversations: Array<{
        conversation: Conversation;
        messages: Message[];
    }>, analyzer: ConversationFlowAnalyzer): Promise<any[]>;
    /**
     * Optimize productivity analysis with streaming for large datasets
     */
    optimizeProductivityAnalysis(conversations: Array<{
        conversation: Conversation;
        messages: Message[];
    }>, analyzer: ProductivityAnalyzer): Promise<any[]>;
    /**
     * Optimize knowledge gap detection with advanced clustering
     */
    optimizeKnowledgeGapDetection(conversations: Array<{
        conversation: Conversation;
        messages: Message[];
    }>, detector: KnowledgeGapDetector): Promise<any[]>;
    /**
     * Optimize decision tracking with pattern caching
     */
    optimizeDecisionTracking(conversations: Array<{
        conversation: Conversation;
        messages: Message[];
    }>, tracker: DecisionTracker): Promise<any[]>;
    /**
     * Optimize database queries with connection pooling
     */
    optimizeQuery<T>(queryId: string, sql: string, params: Record<string, any>): Promise<T[]>;
    /**
     * Get comprehensive performance report
     */
    getPerformanceReport(): {
        metrics: PerformanceMetrics;
        cacheStats: any;
        queryStats: any;
        predictiveCaching?: any;
        recommendations: string[];
    };
    /**
     * Initialize predictive caching system
     */
    initializePredictiveCaching(): Promise<void>;
    /**
     * Enable or disable predictive caching at runtime
     */
    configurePredictiveCaching(enabled: boolean, config?: Partial<PredictiveCacheConfig>): Promise<void>;
    /**
     * Manually trigger predictive cache warming
     */
    triggerPredictiveCacheWarming(): Promise<CachePrediction[]>;
    /**
     * Get predictive caching system status and metrics
     */
    getPredictiveCachingStatus(): {
        enabled: boolean;
        status: any | null;
        recommendations: string[];
    };
    /**
     * Validate prediction accuracy by checking if predicted cache entries were actually requested
     */
    validatePredictionAccuracy(_timeWindowHours?: number): Promise<{
        totalPredictions: number;
        accuratePredictions: number;
        accuracy: number;
        topPredictedQueries: Array<{
            query: string;
            predicted: boolean;
            actual: boolean;
        }>;
    }>;
    /**
     * Clear caches and reset performance counters
     */
    resetPerformanceState(): void;
    private calculateQuestionSimilarity;
    private createBatches;
    private startPerformanceMonitoring;
    private generateOptimizationRecommendations;
}
//# sourceMappingURL=AnalyticsPerformanceOptimizer.d.ts.map