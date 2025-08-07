/**
 * Index Usage Monitor - Production Quality Database Index Monitoring
 *
 * Comprehensive monitoring system for database index effectiveness:
 * - Real-time index usage tracking with EXPLAIN QUERY PLAN analysis
 * - Query performance monitoring and slow query detection
 * - Index effectiveness scoring and recommendations
 * - Automated index optimization suggestions
 * - Write performance impact monitoring
 * - Performance degradation alerts
 * - Index maintenance automation
 */
import { DatabaseManager } from '../../storage/Database.js';
export interface IndexUsageStats {
    indexName: string;
    tableName: string;
    usageCount: number;
    hitCount: number;
    missCount: number;
    lastUsed: number;
    avgQueryTime: number;
    effectivenessScore: number;
    queryTypes: string[];
    sizeBytes: number;
    maintenanceCost: number;
}
export interface QueryPlanAnalysis {
    queryId: string;
    sql: string;
    params: any[];
    executionTime: number;
    planSteps: Array<{
        operation: string;
        table: string;
        indexUsed: string | null;
        estimatedCost: number;
        rowsScanned: number;
    }>;
    indexesUsed: string[];
    tableScans: string[];
    recommendations: string[];
    performanceIssues: string[];
}
export interface IndexOptimizationRecommendation {
    type: 'create' | 'drop' | 'modify' | 'rebuild';
    indexName: string;
    tableName: string;
    reason: string;
    expectedImpact: 'high' | 'medium' | 'low';
    sql: string;
    riskLevel: 'low' | 'medium' | 'high';
    estimatedBenefit: number;
    implementationPriority: number;
    costBenefitScore: number;
    implementationComplexity: 'low' | 'medium' | 'high';
    riskAssessment: string;
}
export interface PerformanceAlert {
    id: string;
    type: 'slow_query' | 'unused_index' | 'index_degradation' | 'write_impact' | 'storage_growth' | 'monitoring_error';
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    details: Record<string, any>;
    timestamp: number;
    resolved: boolean;
    actionRequired: boolean;
}
export interface WritePerformanceMetrics {
    tableName: string;
    indexCount: number;
    avgInsertTime: number;
    avgUpdateTime: number;
    avgDeleteTime: number;
    writeThroughputImpact: number;
    indexMaintenanceOverhead: number;
}
/**
 * Comprehensive index usage and performance monitoring system
 */
export declare class IndexUsageMonitor {
    private databaseManager;
    private db;
    private monitoringActive;
    private queryPlanCache;
    private indexStatsCache;
    private writeMetricsCache;
    private performanceAlerts;
    private monitoringInterval;
    constructor(databaseManager: DatabaseManager);
    /**
     * Start continuous index usage monitoring
     */
    startMonitoring(intervalMinutes?: number): Promise<void>;
    /**
     * Stop index usage monitoring
     */
    stopMonitoring(): void;
    /**
     * Analyze query plan and track index usage
     */
    analyzeQueryPlan(sql: string, params?: any[]): Promise<QueryPlanAnalysis>;
    /**
     * Get comprehensive index usage statistics
     */
    getIndexUsageStats(): Promise<Map<string, IndexUsageStats>>;
    /**
     * Identify unused indexes that can be safely dropped
     */
    getUnusedIndexes(minDaysUnused?: number): Promise<string[]>;
    /**
     * Generate index optimization recommendations
     */
    generateIndexOptimizations(): Promise<IndexOptimizationRecommendation[]>;
    /**
     * Monitor write performance impact of indexes
     */
    getWritePerformanceMetrics(): Promise<Map<string, WritePerformanceMetrics>>;
    /**
     * Get performance alerts for immediate attention
     */
    getPerformanceAlerts(severity?: 'critical' | 'high' | 'medium' | 'low'): PerformanceAlert[];
    /**
     * Generate comprehensive performance report
     */
    generatePerformanceReport(): Promise<{
        summary: {
            totalIndexes: number;
            unusedIndexes: number;
            highImpactIndexes: number;
            slowQueries: number;
            averageQueryTime: number;
            writeImpact: number;
        };
        indexStats: Map<string, IndexUsageStats>;
        recommendations: IndexOptimizationRecommendation[];
        alerts: PerformanceAlert[];
        writeMetrics: Map<string, WritePerformanceMetrics>;
        trends: {
            queryTimesTrend: 'improving' | 'stable' | 'degrading';
            indexUsageTrend: 'increasing' | 'stable' | 'decreasing';
            writePerformanceTrend: 'improving' | 'stable' | 'degrading';
        };
    }>;
    /**
     * Execute index optimization recommendations
     */
    executeRecommendation(recommendation: IndexOptimizationRecommendation): Promise<{
        success: boolean;
        message: string;
        executionTime?: number;
        error?: string;
    }>;
    private initializeMonitoringTables;
    private performComprehensiveAnalysis;
    private performPeriodicAnalysis;
    private parseQueryPlan;
    private updateIndexUsageStats;
    private calculateIndexEffectiveness;
    private getSlowQueries;
    private suggestIndexForQuery;
    private analyzeCompositeIndexOpportunities;
    private calculateWriteMetrics;
    private createPerformanceAlert;
    private checkPerformanceDegradation;
    private calculatePerformanceTrends;
    private cleanupOldMonitoringData;
    private extractOperation;
    private extractTable;
    private extractIndex;
    private estimateCost;
    private estimateRowsScanned;
    private generateQueryId;
    private getTableForIndex;
    private getIndexSize;
    private calculateMaintenanceCost;
    private isIndexReferencedInConstraints;
    private extractColumnsFromQuery;
    private storeQueryPlanAnalysis;
    private logIndexAction;
    private invalidateCache;
}
//# sourceMappingURL=IndexUsageMonitor.d.ts.map