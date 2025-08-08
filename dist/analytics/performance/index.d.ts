/**
 * Analytics Performance Monitoring - Export Index
 *
 * Centralized exports for all performance monitoring and index optimization components.
 * Provides comprehensive production-quality database performance management.
 */
export { IndexUsageMonitor } from './IndexUsageMonitor.js';
export type { IndexUsageStats, QueryPlanAnalysis, IndexOptimizationRecommendation, PerformanceAlert } from './IndexUsageMonitor.js';
export { IndexMonitoringDashboard } from './IndexMonitoringDashboard.js';
export type { DashboardMetrics, IndexHealthReport, QueryPerformanceInsight, MaintenanceSchedule } from './IndexMonitoringDashboard.js';
export { ProductionPerformanceManager } from './ProductionPerformanceManager.js';
export type { PerformanceConfiguration, PerformanceStatus, AutomationDecision, PerformanceReport } from './ProductionPerformanceManager.js';
export { AnalyticsPerformanceOptimizer } from './AnalyticsPerformanceOptimizer.js';
export type { PerformanceMetrics, OptimizationConfig, CacheEntry } from './AnalyticsPerformanceOptimizer.js';
export { PredictiveCacheManager, DEFAULT_PREDICTIVE_CACHE_CONFIG } from './PredictiveCacheManager.js';
export type { PredictiveCacheConfig, UsagePattern, PredictionModel, CachePrediction } from './PredictiveCacheManager.js';
/**
 * Convenience factory for creating a complete performance monitoring setup
 */
import { DatabaseManager } from '../../storage/Database.js';
import { AnalyticsEngine } from '../services/AnalyticsEngine.js';
import { ProductionPerformanceManager } from './ProductionPerformanceManager.js';
import { IndexMonitoringDashboard } from './IndexMonitoringDashboard.js';
import { IndexUsageMonitor } from './IndexUsageMonitor.js';
import { AnalyticsPerformanceOptimizer } from './AnalyticsPerformanceOptimizer.js';
/**
 * Factory function for creating optimized analytics system
 */
export declare function createOptimizedAnalyticsSystem(databaseManager: DatabaseManager, analyticsEngine: AnalyticsEngine, config?: Parameters<typeof createPerformanceMonitoringSetup>[2]): PerformanceMonitoringSetup;
export interface PerformanceMonitoringSetup {
    manager: ProductionPerformanceManager;
    dashboard: IndexMonitoringDashboard;
    monitor: IndexUsageMonitor;
    optimizer: AnalyticsPerformanceOptimizer;
}
export declare function createPerformanceMonitoringSetup(databaseManager: DatabaseManager, analyticsEngine: AnalyticsEngine, config?: {
    monitoring?: {
        enabled?: boolean;
        intervalMinutes?: number;
        alertThresholds?: {
            slowQueryMs?: number;
            unusedIndexDays?: number;
            writeImpactThreshold?: number;
            memoryUsageThresholdMB?: number;
        };
        retentionDays?: number;
    };
    optimization?: {
        autoOptimizeEnabled?: boolean;
        autoDropUnusedIndexes?: boolean;
        maxConcurrentOptimizations?: number;
        maintenanceWindowHours?: number[];
        riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
    };
    alerts?: {
        emailNotifications?: boolean;
        webhookUrl?: string;
        escalationThresholds?: {
            criticalAlertCount?: number;
            highAlertDurationMinutes?: number;
        };
    };
}): PerformanceMonitoringSetup;
/**
 * Initialize complete performance monitoring system
 */
export declare function initializePerformanceMonitoring(setup: PerformanceMonitoringSetup, startMonitoring?: boolean): Promise<void>;
/**
 * Shutdown performance monitoring system gracefully
 */
export declare function shutdownPerformanceMonitoring(setup: PerformanceMonitoringSetup): Promise<void>;
/**
 * Quick health check for the monitoring system
 */
export declare function performanceHealthCheck(setup: PerformanceMonitoringSetup): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{
        component: string;
        status: 'pass' | 'warning' | 'fail';
        message: string;
    }>;
}>;
//# sourceMappingURL=index.d.ts.map