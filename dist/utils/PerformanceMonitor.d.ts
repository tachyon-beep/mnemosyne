/**
 * Performance Monitoring System - Production-grade monitoring and alerting
 *
 * Provides comprehensive performance tracking, alerting, and health checking
 * for all system components in production environments.
 */
import { EventEmitter } from 'events';
import { DatabaseManager } from '../storage/Database.js';
import { MemoryManager } from './MemoryManager.js';
import { DynamicThresholdManager } from '../monitoring/DynamicThresholdManager.js';
interface PerformanceMetric {
    id: string;
    category: 'database' | 'search' | 'embedding' | 'memory' | 'network' | 'system';
    name: string;
    value: number;
    unit: 'ms' | 'bytes' | 'count' | 'percent' | 'rate';
    timestamp: number;
    tags?: Record<string, string>;
}
interface AlertRule {
    id: string;
    category: string;
    metric: string;
    operator: '>' | '<' | '=' | '>=' | '<=';
    threshold: number;
    duration: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    enabled: boolean;
    description: string;
}
interface Alert {
    id: string;
    ruleId: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    metric: PerformanceMetric;
    triggeredAt: number;
    resolvedAt?: number;
    acknowledged?: boolean;
}
interface HealthCheck {
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    message: string;
    lastCheck: number;
    duration: number;
    details?: Record<string, any>;
}
interface PerformanceReport {
    timestamp: number;
    duration: number;
    summary: {
        totalRequests: number;
        averageResponseTime: number;
        errorRate: number;
        memoryUsage: number;
        activeAlerts: number;
    };
    metrics: {
        database: Record<string, number>;
        search: Record<string, number>;
        embedding: Record<string, number>;
        memory: Record<string, number>;
        system: Record<string, number>;
    };
    healthChecks: HealthCheck[];
    alerts: Alert[];
    recommendations: string[];
}
export declare class PerformanceMonitor extends EventEmitter {
    private dbManager;
    private memoryManager;
    private dynamicThresholds;
    private metrics;
    private alertRules;
    private activeAlerts;
    private alertHistory;
    private healthChecks;
    private monitoringInterval;
    private metricsRetentionMs;
    private alertCooldownMs;
    private isMonitoring;
    private useDynamicThresholds;
    private readonly FALLBACK_THRESHOLDS;
    constructor(dbManager: DatabaseManager, memoryManager: MemoryManager, options?: {
        metricsRetentionHours?: number;
        alertCooldownMinutes?: number;
        monitoringIntervalSeconds?: number;
        enableDynamicThresholds?: boolean;
    });
    /**
     * Initialize dynamic thresholds if enabled
     */
    initializeDynamicThresholds(): Promise<void>;
    /**
     * Start performance monitoring
     */
    startMonitoring(intervalSeconds?: number): Promise<void>;
    /**
     * Stop performance monitoring
     */
    stopMonitoring(): Promise<void>;
    /**
     * Get threshold for a metric (adaptive or fallback)
     */
    private getThreshold;
    /**
     * Record a performance metric
     */
    recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): void;
    /**
     * Record database operation metrics
     */
    recordDatabaseMetric(operation: string, duration: number, resultCount?: number): void;
    /**
     * Record search operation metrics
     */
    recordSearchMetric(searchType: string, duration: number, resultCount: number, cacheHit?: boolean): void;
    /**
     * Record embedding operation metrics
     */
    recordEmbeddingMetric(operation: string, duration: number, batchSize?: number): void;
    /**
     * Add custom alert rule
     */
    addAlertRule(rule: AlertRule): void;
    /**
     * Get current performance report
     */
    getPerformanceReport(durationMs?: number): PerformanceReport;
    /**
     * Get health status of all monitored components
     */
    getHealthStatus(): {
        overall: 'healthy' | 'degraded' | 'unhealthy';
        components: HealthCheck[];
        activeAlerts: Alert[];
        uptime: number;
    };
    /**
     * Force health check run
     */
    runHealthChecks(): Promise<void>;
    private setupDefaultAlertRules;
    /**
     * Update alert rule thresholds (used when dynamic thresholds change)
     */
    updateAlertThresholds(): void;
    private collectSystemMetrics;
    private runDatabaseHealthCheck;
    private runMemoryHealthCheck;
    private runSearchHealthCheck;
    private runSystemHealthCheck;
    private evaluateAlerts;
    private cleanupOldMetrics;
    private getMetricsInRange;
    private getMetricsByCategory;
    private getMetricsByName;
    private sumMetricValues;
    private aggregateMetrics;
    private generateRecommendations;
    /**
     * Get enhanced performance report with dynamic threshold information
     */
    getEnhancedPerformanceReport(durationMs?: number): PerformanceReport & {
        thresholdInfo?: {
            isDynamic: boolean;
            thresholdAccuracy?: number;
            recentAdjustments?: Array<{
                metric: string;
                oldValue: number;
                newValue: number;
                timestamp: number;
                reason: string;
            }>;
        };
    };
    /**
     * Get dynamic threshold manager (if enabled)
     */
    getDynamicThresholdManager(): DynamicThresholdManager | null;
    /**
     * Check if dynamic thresholds are enabled and initialized
     */
    isDynamicThresholdingEnabled(): boolean;
}
export {};
//# sourceMappingURL=PerformanceMonitor.d.ts.map