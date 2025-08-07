/**
 * Index Monitoring Dashboard - Production Quality Performance Analytics
 *
 * Real-time dashboard for database index performance monitoring:
 * - Live index usage statistics and effectiveness metrics
 * - Query performance trending and bottleneck identification
 * - Automated alerting and recommendation system
 * - Index maintenance scheduling and automation
 * - Performance impact analysis for write operations
 * - Historical trend analysis and capacity planning
 */
import { DatabaseManager } from '../../storage/Database.js';
import { IndexOptimizationRecommendation, PerformanceAlert } from './IndexUsageMonitor.js';
export interface DashboardMetrics {
    timestamp: number;
    overview: {
        totalIndexes: number;
        activeIndexes: number;
        unusedIndexes: number;
        slowQueries: number;
        averageQueryTime: number;
        totalDatabaseSize: number;
        indexStorageOverhead: number;
    };
    performance: {
        queryThroughput: number;
        cacheHitRate: number;
        indexEffectiveness: number;
        writePerformanceImpact: number;
        memoryUsage: number;
    };
    trends: {
        hourlyQueryTrend: Array<{
            hour: number;
            count: number;
            avgTime: number;
        }>;
        dailyPerformanceTrend: Array<{
            date: string;
            score: number;
        }>;
        indexUsageTrend: Array<{
            index: string;
            trend: 'up' | 'down' | 'stable';
        }>;
    };
}
export interface IndexHealthReport {
    indexName: string;
    tableName: string;
    health: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    healthScore: number;
    issues: string[];
    recommendations: string[];
    metrics: {
        usageFrequency: number;
        effectiveness: number;
        maintenanceCost: number;
        storageSize: number;
        lastUsed: number;
    };
}
export interface QueryPerformanceInsight {
    queryPattern: string;
    frequency: number;
    avgExecutionTime: number;
    impact: 'high' | 'medium' | 'low';
    optimizationPotential: number;
    suggestedIndexes: Array<{
        indexName: string;
        sql: string;
        expectedImprovement: number;
    }>;
}
export interface MaintenanceSchedule {
    task: 'reindex' | 'analyze' | 'vacuum' | 'optimize';
    target: string;
    scheduledTime: number;
    estimatedDuration: number;
    priority: 'critical' | 'high' | 'medium' | 'low';
    impact: string;
    prerequisites: string[];
}
/**
 * Comprehensive monitoring dashboard for database index performance
 */
export declare class IndexMonitoringDashboard {
    private databaseManager;
    private monitor;
    private metricsHistory;
    private alertHistory;
    private maintenanceSchedule;
    constructor(databaseManager: DatabaseManager);
    /**
     * Initialize the dashboard with monitoring
     */
    initialize(): Promise<void>;
    /**
     * Get current dashboard metrics
     */
    getCurrentMetrics(): Promise<DashboardMetrics>;
    /**
     * Generate comprehensive index health report
     */
    getIndexHealthReport(): Promise<IndexHealthReport[]>;
    /**
     * Analyze query performance and provide insights
     */
    getQueryPerformanceInsights(): Promise<QueryPerformanceInsight[]>;
    /**
     * Get active performance alerts with context
     */
    getActiveAlerts(): Array<PerformanceAlert & {
        context: any;
        actionPlan: string[];
    }>;
    /**
     * Get scheduled maintenance tasks
     */
    getMaintenanceSchedule(): MaintenanceSchedule[];
    /**
     * Execute maintenance task
     */
    executeMaintenanceTask(taskId: string): Promise<{
        success: boolean;
        message: string;
        duration?: number;
        details?: any;
    }>;
    /**
     * Get optimization recommendations with priority scoring
     */
    getOptimizationRecommendations(): Promise<Array<IndexOptimizationRecommendation & {
        costBenefitScore: number;
        riskAssessment: string;
    }>>;
    /**
     * Generate executive summary report
     */
    generateExecutiveSummary(): Promise<{
        summary: string;
        keyMetrics: Record<string, number | string>;
        criticalIssues: Array<{
            issue: string;
            impact: string;
            urgency: string;
        }>;
        recommendations: Array<{
            recommendation: string;
            expectedBenefit: string;
        }>;
        trendAnalysis: {
            performanceTrend: 'improving' | 'stable' | 'degrading';
            efficiency: number;
            capacityUtilization: number;
        };
    }>;
    /**
     * Export monitoring data for external analysis
     */
    exportMonitoringData(format?: 'json' | 'csv'): Promise<string>;
    private updateDashboardMetrics;
    private updateMaintenanceSchedule;
    private analyzeIndexHealth;
    private analyzeQueryPattern;
    private suggestIndexesForPattern;
    private getAlertContext;
    private generateActionPlan;
    private calculateCostBenefitScore;
    private assessImplementationRisk;
    private assessImplementationComplexity;
    private calculateOverallEffectiveness;
    private getDatabaseSize;
    private getIndexStorageSize;
    private calculateQueryThroughput;
    private calculateCacheHitRate;
    private getHourlyQueryTrend;
    private getDailyPerformanceTrend;
    private getIndexUsageTrend;
    private calculateOverallEfficiency;
    private generateSummaryText;
    private identifyCriticalIssues;
    private getTopRecommendations;
    private analyzePerformanceTrend;
    private executeMaintenanceOperation;
    private isTaskScheduled;
    private estimateReindexDuration;
    private convertToCSV;
}
//# sourceMappingURL=IndexMonitoringDashboard.d.ts.map