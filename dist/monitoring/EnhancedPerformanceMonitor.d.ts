/**
 * Enhanced Performance Monitor with Dynamic Thresholds
 *
 * Integrates all dynamic monitoring components:
 * - Dynamic threshold management
 * - Context-aware alerting
 * - System capability profiling
 * - Machine learning optimization
 * - Adaptive resource management
 */
import { EventEmitter } from 'events';
import { DatabaseManager } from '../storage/Database.js';
import { MemoryManager } from '../utils/MemoryManager.js';
interface EnhancedMetric {
    id: string;
    category: 'database' | 'search' | 'embedding' | 'memory' | 'network' | 'system';
    name: string;
    value: number;
    unit: 'ms' | 'bytes' | 'count' | 'percent' | 'rate';
    timestamp: number;
    context: {
        systemLoad: number;
        concurrentOperations: number;
        errorRate: number;
        userActivity: number;
    };
    tags?: Record<string, string>;
}
interface SystemHealthAssessment {
    overall: 'healthy' | 'degraded' | 'critical';
    components: {
        database: ComponentHealth;
        search: ComponentHealth;
        memory: ComponentHealth;
        system: ComponentHealth;
    };
    adaptiveMetrics: {
        thresholdAccuracy: number;
        alertReduction: number;
        falsePositiveRate: number;
        systemOptimization: number;
    };
    recommendations: Array<{
        category: string;
        action: string;
        priority: 'low' | 'medium' | 'high';
        estimatedImpact: string;
    }>;
    timestamp: number;
}
interface ComponentHealth {
    status: 'healthy' | 'degraded' | 'critical';
    metrics: Array<{
        name: string;
        current: number;
        threshold: number;
        trend: 'improving' | 'stable' | 'degrading';
    }>;
    lastIssue?: {
        timestamp: number;
        description: string;
        resolved: boolean;
    };
}
export declare class EnhancedPerformanceMonitor extends EventEmitter {
    private readonly dbManager;
    private readonly memoryManager;
    private readonly configPath;
    private dynamicThresholds;
    private contextualAlerts;
    private systemProfiler;
    private metrics;
    private activeAlerts;
    private componentHealth;
    private isMonitoring;
    private monitoringInterval;
    private optimizationInterval;
    private readonly METRICS_RETENTION_HOURS;
    private readonly OPTIMIZATION_INTERVAL_HOURS;
    private readonly HEALTH_CHECK_INTERVAL_SECONDS;
    constructor(dbManager: DatabaseManager, memoryManager: MemoryManager, configPath?: string);
    /**
     * Initialize the enhanced monitoring system
     */
    initialize(): Promise<void>;
    /**
     * Start enhanced monitoring with adaptive capabilities
     */
    startMonitoring(): Promise<void>;
    /**
     * Stop monitoring
     */
    stopMonitoring(): Promise<void>;
    /**
     * Record an enhanced metric with context
     */
    recordEnhancedMetric(category: EnhancedMetric['category'], name: string, value: number, unit: EnhancedMetric['unit'], tags?: Record<string, string>): void;
    /**
     * Get current system context for monitoring
     */
    private getCurrentSystemContext;
    /**
     * Apply system-optimized settings based on profiling
     */
    private applySystemOptimizedSettings;
    /**
     * Initialize component health tracking
     */
    private initializeComponentHealth;
    /**
     * Perform comprehensive health checks
     */
    private performHealthChecks;
    /**
     * Check database health with adaptive thresholds
     */
    private checkDatabaseHealth;
    /**
     * Check memory health with context awareness
     */
    private checkMemoryHealth;
    /**
     * Check search system health
     */
    private checkSearchHealth;
    /**
     * Check overall system health
     */
    private checkSystemHealth;
    /**
     * Calculate trend for a metric
     */
    private calculateTrend;
    /**
     * Collect enhanced metrics from all sources
     */
    private collectEnhancedMetrics;
    /**
     * Evaluate adaptive alerts using context-aware system
     */
    private evaluateAdaptiveAlerts;
    /**
     * Process potential alert through context-aware system
     */
    private processPotentialAlert;
    /**
     * Update component health based on recent metrics and alerts
     */
    private updateComponentHealth;
    /**
     * Run optimization cycle
     */
    private runOptimizationCycle;
    /**
     * Get comprehensive system health assessment
     */
    getSystemHealthAssessment(): SystemHealthAssessment;
    /**
     * Generate system recommendations
     */
    private generateSystemRecommendations;
    private getRecentMetrics;
    private getTotalRecentOperations;
    private cleanupOldMetrics;
    private setupEventHandlers;
    /**
     * Get enhanced monitoring status
     */
    getMonitoringStatus(): {
        isActive: boolean;
        systemProfile: any;
        activeAlerts: number;
        thresholdAccuracy: number;
        componentHealth: any;
        recommendations: number;
    };
}
export {};
//# sourceMappingURL=EnhancedPerformanceMonitor.d.ts.map