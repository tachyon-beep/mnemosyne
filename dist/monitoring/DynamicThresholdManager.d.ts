/**
 * Dynamic Threshold Management System
 *
 * Provides adaptive performance thresholds that automatically adjust based on:
 * - System hardware capabilities
 * - Historical performance patterns
 * - Current system load
 * - Environmental conditions
 * - Machine learning optimization
 */
import { EventEmitter } from 'events';
interface SystemCapabilities {
    cpuCores: number;
    cpuSpeed: number;
    totalMemory: number;
    availableMemory: number;
    diskSpeed: number;
    platform: string;
    nodeVersion: string;
    architecture: string;
}
interface PerformanceBaseline {
    metric: string;
    category: string;
    percentile50: number;
    percentile95: number;
    percentile99: number;
    mean: number;
    standardDeviation: number;
    sampleCount: number;
    lastUpdated: number;
}
interface DynamicThreshold {
    id: string;
    metric: string;
    category: string;
    baseValue: number;
    currentValue: number;
    confidence: number;
    adaptationRate: number;
    lastAdjustment: number;
    adjustmentHistory: Array<{
        timestamp: number;
        oldValue: number;
        newValue: number;
        reason: string;
        confidence: number;
    }>;
}
interface SystemContext {
    currentLoad: {
        cpu: number;
        memory: number;
        io: number;
    };
    recentActivity: {
        queryCount: number;
        errorCount: number;
        averageResponseTime: number;
    };
    timeOfDay: number;
    dayOfWeek: number;
    isUnderLoad: boolean;
}
interface ThresholdOptimizationResult {
    recommendedThresholds: Map<string, number>;
    confidence: number;
    reasoning: string[];
    estimatedImprovement: number;
}
export declare class DynamicThresholdManager extends EventEmitter {
    private readonly configPath;
    private systemCapabilities;
    private baselines;
    private thresholds;
    private trainingData;
    private contextHistory;
    private readonly BASELINE_WINDOW_HOURS;
    private readonly TRAINING_DATA_RETENTION_DAYS;
    private readonly MIN_SAMPLES_FOR_ADAPTATION;
    private readonly CONFIDENCE_THRESHOLD;
    private profilingInterval;
    private optimizationInterval;
    private isInitialized;
    constructor(configPath?: string);
    /**
     * Initialize the dynamic threshold system
     */
    initialize(): Promise<void>;
    /**
     * Profile system hardware and software capabilities
     */
    private profileSystemCapabilities;
    /**
     * Benchmark disk I/O performance
     */
    private benchmarkDiskSpeed;
    /**
     * Initialize default thresholds based on system capabilities
     */
    private initializeDefaultThresholds;
    /**
     * Get current threshold for a metric
     */
    getThreshold(metricId: string): number | null;
    /**
     * Get all current thresholds
     */
    getAllThresholds(): Map<string, DynamicThreshold>;
    /**
     * Update performance baseline with new metric data
     */
    updateBaseline(metric: string, category: string, value: number): void;
    /**
     * Adapt threshold based on baseline performance
     */
    private adaptThreshold;
    /**
     * Get current system context for threshold adaptation
     */
    private getCurrentSystemContext;
    /**
     * Optimize thresholds using machine learning approach
     */
    optimizeThresholds(): Promise<ThresholdOptimizationResult>;
    /**
     * Analyze threshold performance from training data
     */
    private analyzeThresholdPerformance;
    /**
     * Find optimal threshold value using performance data
     */
    private findOptimalThreshold;
    /**
     * Apply ML optimization recommendations
     */
    applyOptimizationRecommendations(result: ThresholdOptimizationResult): Promise<void>;
    /**
     * Record training data for ML optimization
     */
    recordTrainingData(performanceMetrics: Record<string, number>, alertCount: number, falsePositiveCount?: number, missedIssueCount?: number): void;
    /**
     * Get comprehensive threshold report
     */
    getThresholdReport(): {
        systemCapabilities: SystemCapabilities | null;
        currentThresholds: Array<DynamicThreshold & {
            baseline?: PerformanceBaseline;
        }>;
        recentAdjustments: Array<{
            thresholdId: string;
            adjustment: any;
        }>;
        recommendations: string[];
        systemLoad: SystemContext;
        confidence: number;
    };
    /**
     * Start continuous monitoring and optimization
     */
    private startContinuousMonitoring;
    /**
     * Persist threshold data to disk
     */
    private persistData;
    /**
     * Load persisted threshold data
     */
    private loadPersistedData;
    /**
     * Cleanup resources
     */
    shutdown(): Promise<void>;
}
export {};
//# sourceMappingURL=DynamicThresholdManager.d.ts.map