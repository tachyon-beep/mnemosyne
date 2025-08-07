/**
 * Performance Orchestrator - Coordinates all performance monitoring systems
 *
 * This class provides:
 * - Centralized performance monitoring coordination
 * - Integration between PerformanceMonitor, MemoryManager, and database systems
 * - Intelligent alerting and automatic optimization
 * - Performance degradation detection and recovery
 * - System health management and reporting
 */
import { EventEmitter } from 'events';
import { MemoryManager } from './MemoryManager.js';
import { DatabaseManager } from '../storage/Database.js';
import { SearchEngine } from '../search/SearchEngine.js';
export interface PerformanceConfig {
    /** Enable comprehensive monitoring */
    enableMonitoring: boolean;
    /** Performance monitoring interval in seconds */
    monitoringInterval: number;
    /** Memory monitoring interval in seconds */
    memoryMonitoringInterval: number;
    /** Enable automatic optimization */
    enableAutoOptimization: boolean;
    /** Performance degradation threshold (0-1) */
    degradationThreshold: number;
    /** Enable performance alerting */
    enableAlerting: boolean;
    /** Maximum acceptable response time in ms */
    maxResponseTime: number;
    /** Memory pressure threshold (0-1) */
    memoryPressureThreshold: number;
}
export interface SystemPerformanceReport {
    timestamp: number;
    overall: {
        status: 'healthy' | 'degraded' | 'critical';
        score: number;
        degradationFactors: string[];
        recommendations: string[];
    };
    database: {
        queryCount: number;
        averageQueryTime: number;
        slowQueryCount: number;
        cacheHitRate: number;
        connectionPoolStatus: any;
    };
    memory: {
        heapUsagePercent: number;
        rssUsagePercent: number;
        pressureLevel: string;
        gcEvents: number;
    };
    search: {
        cacheHitRate: number;
        averageSearchTime: number;
        indexHealth: string;
    };
    alerts: {
        active: number;
        resolved: number;
        critical: number;
    };
}
export declare class PerformanceOrchestrator extends EventEmitter {
    private performanceMonitor;
    private memoryManager;
    private dbManager;
    private searchEngine?;
    private config;
    private isMonitoring;
    private monitoringInterval;
    private optimizationInterval;
    private lastHealthScore;
    private performanceHistory;
    constructor(dbManager: DatabaseManager, memoryManager: MemoryManager, config?: Partial<PerformanceConfig>);
    /**
     * Set search engine for search performance monitoring
     */
    setSearchEngine(searchEngine: SearchEngine): void;
    /**
     * Start comprehensive performance monitoring
     */
    startMonitoring(): Promise<void>;
    /**
     * Stop performance monitoring
     */
    stopMonitoring(): void;
    /**
     * Get comprehensive system performance report
     */
    getSystemPerformanceReport(): Promise<SystemPerformanceReport>;
    /**
     * Force system optimization
     */
    optimizeSystem(): Promise<{
        optimizationsApplied: string[];
        performanceImprovement: number;
        errors: string[];
    }>;
    /**
     * Get performance trends over time
     */
    getPerformanceTrends(): {
        healthScores: number[];
        trend: 'improving' | 'stable' | 'degrading';
        volatility: number;
    };
    private setupEventHandlers;
    private performComprehensiveCheck;
    private performAutoOptimization;
    private calculateHealthScore;
    private getStatusFromScore;
    private identifyDegradationFactors;
    private generateOptimizationRecommendations;
    private calculateCurrentHealthScore;
    private handleCriticalAlert;
    private handleMemoryPressure;
}
//# sourceMappingURL=PerformanceOrchestrator.d.ts.map