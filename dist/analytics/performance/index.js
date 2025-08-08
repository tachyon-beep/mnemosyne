/**
 * Analytics Performance Monitoring - Export Index
 *
 * Centralized exports for all performance monitoring and index optimization components.
 * Provides comprehensive production-quality database performance management.
 */
// Core monitoring components
export { IndexUsageMonitor } from './IndexUsageMonitor.js';
export { IndexMonitoringDashboard } from './IndexMonitoringDashboard.js';
export { ProductionPerformanceManager } from './ProductionPerformanceManager.js';
// Existing performance optimization components
export { AnalyticsPerformanceOptimizer } from './AnalyticsPerformanceOptimizer.js';
// Predictive caching components
export { PredictiveCacheManager, DEFAULT_PREDICTIVE_CACHE_CONFIG } from './PredictiveCacheManager.js';
import { ProductionPerformanceManager } from './ProductionPerformanceManager.js';
import { IndexMonitoringDashboard } from './IndexMonitoringDashboard.js';
import { IndexUsageMonitor } from './IndexUsageMonitor.js';
import { AnalyticsPerformanceOptimizer } from './AnalyticsPerformanceOptimizer.js';
/**
 * Factory function for creating optimized analytics system
 */
export function createOptimizedAnalyticsSystem(databaseManager, analyticsEngine, config = {}) {
    return createPerformanceMonitoringSetup(databaseManager, analyticsEngine, config);
}
export function createPerformanceMonitoringSetup(databaseManager, analyticsEngine, config = {}) {
    const monitor = new IndexUsageMonitor(databaseManager);
    const dashboard = new IndexMonitoringDashboard(databaseManager);
    const optimizer = new AnalyticsPerformanceOptimizer(databaseManager, analyticsEngine, {
        enableQueryCaching: true,
        enableMemoryOptimization: true,
        enableParallelProcessing: true,
        maxMemoryUsageMB: config.monitoring?.alertThresholds?.memoryUsageThresholdMB || 500,
        queryCacheTTLMinutes: 60,
        parallelWorkers: 4,
        batchSize: 50,
        enablePerformanceMonitoring: true,
        enablePredictiveCaching: config.optimization?.riskTolerance === 'aggressive',
        predictiveCache: {
            enabled: config.optimization?.riskTolerance === 'aggressive',
            learningEnabled: true,
            warmingStrategy: {
                aggressiveness: config.optimization?.riskTolerance || 'moderate',
                maxWarmingOperationsPerMinute: 5,
                priorityWeighting: {
                    frequency: 0.3,
                    recency: 0.2,
                    confidence: 0.3,
                    userContext: 0.2
                }
            }
        }
    });
    const manager = new ProductionPerformanceManager(databaseManager, analyticsEngine, {
        monitoring: {
            enabled: true,
            intervalMinutes: 15,
            retentionDays: 30,
            ...config.monitoring,
            alertThresholds: {
                slowQueryMs: config.monitoring?.alertThresholds?.slowQueryMs ?? 1000,
                unusedIndexDays: config.monitoring?.alertThresholds?.unusedIndexDays ?? 30,
                writeImpactThreshold: config.monitoring?.alertThresholds?.writeImpactThreshold ?? 0.5,
                memoryUsageThresholdMB: config.monitoring?.alertThresholds?.memoryUsageThresholdMB ?? 500,
                ...config.monitoring?.alertThresholds
            }
        },
        optimization: {
            autoOptimizeEnabled: false, // Conservative default
            autoDropUnusedIndexes: false,
            maxConcurrentOptimizations: 3,
            maintenanceWindowHours: [2, 3, 4], // 2-4 AM
            riskTolerance: 'conservative',
            ...config.optimization
        },
        alerts: {
            emailNotifications: false,
            ...config.alerts,
            escalationThresholds: {
                criticalAlertCount: config.alerts?.escalationThresholds?.criticalAlertCount ?? 3,
                highAlertDurationMinutes: config.alerts?.escalationThresholds?.highAlertDurationMinutes ?? 60,
                ...config.alerts?.escalationThresholds
            }
        }
    });
    return {
        manager,
        dashboard,
        monitor,
        optimizer
    };
}
/**
 * Initialize complete performance monitoring system
 */
export async function initializePerformanceMonitoring(setup, startMonitoring = true) {
    console.log('Initializing comprehensive performance monitoring system...');
    try {
        if (startMonitoring) {
            // Initialize the production manager (which starts monitoring)
            await setup.manager.initialize();
            console.log('✅ Production performance manager initialized');
            // Initialize dashboard (if not already initialized by manager)
            try {
                await setup.dashboard.initialize();
                console.log('✅ Monitoring dashboard initialized');
            }
            catch (error) {
                console.warn('Dashboard already initialized or initialization warning:', error instanceof Error ? error.message : String(error));
            }
        }
        console.log('🚀 Performance monitoring system ready');
        console.log('   • Index usage tracking: Active');
        console.log('   • Query performance analysis: Active');
        console.log('   • Automated recommendations: Active');
        console.log('   • Performance alerting: Active');
    }
    catch (error) {
        console.error('❌ Failed to initialize performance monitoring:', error);
        throw error;
    }
}
/**
 * Shutdown performance monitoring system gracefully
 */
export async function shutdownPerformanceMonitoring(setup) {
    console.log('Shutting down performance monitoring system...');
    try {
        await setup.manager.shutdown();
        setup.monitor.stopMonitoring();
        setup.optimizer.resetPerformanceState();
        console.log('✅ Performance monitoring system shutdown complete');
    }
    catch (error) {
        console.error('❌ Error during performance monitoring shutdown:', error);
        throw error;
    }
}
/**
 * Quick health check for the monitoring system
 */
export async function performanceHealthCheck(setup) {
    const checks = [];
    try {
        // Check manager status
        const managerStatus = await setup.manager.getPerformanceStatus();
        checks.push({
            component: 'Performance Manager',
            status: (managerStatus.overall === 'excellent' || managerStatus.overall === 'good' ? 'pass' :
                managerStatus.overall === 'warning' ? 'warning' : 'fail'),
            message: `System status: ${managerStatus.overall}, Active optimizations: ${managerStatus.activeOptimizations}`
        });
        // Check dashboard metrics
        const dashboardMetrics = await setup.dashboard.getCurrentMetrics();
        const avgQueryTime = dashboardMetrics.overview.averageQueryTime;
        checks.push({
            component: 'Query Performance',
            status: (avgQueryTime < 500 ? 'pass' : avgQueryTime < 1000 ? 'warning' : 'fail'),
            message: `Average query time: ${Math.round(avgQueryTime)}ms`
        });
        // Check index effectiveness
        const indexEffectiveness = dashboardMetrics.performance.indexEffectiveness;
        checks.push({
            component: 'Index Effectiveness',
            status: (indexEffectiveness > 0.8 ? 'pass' : indexEffectiveness > 0.6 ? 'warning' : 'fail'),
            message: `Index effectiveness: ${Math.round(indexEffectiveness * 100)}%`
        });
        // Check for alerts
        const alerts = setup.dashboard.getActiveAlerts();
        const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
        checks.push({
            component: 'Alert Status',
            status: (criticalAlerts === 0 ? 'pass' : criticalAlerts < 3 ? 'warning' : 'fail'),
            message: `Active alerts: ${alerts.length} (${criticalAlerts} critical)`
        });
    }
    catch (error) {
        checks.push({
            component: 'Health Check',
            status: 'fail',
            message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`
        });
    }
    // Determine overall status
    const failCount = checks.filter(c => c.status === 'fail').length;
    const warningCount = checks.filter(c => c.status === 'warning').length;
    let status = 'healthy';
    if (failCount > 0) {
        status = 'critical';
    }
    else if (warningCount > 1) {
        status = 'warning';
    }
    return { status, checks };
}
//# sourceMappingURL=index.js.map