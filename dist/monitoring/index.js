/**
 * Production Monitoring System
 *
 * Provides comprehensive monitoring setup and orchestration
 * for production deployment of the MCP Persistence System.
 */
import { ProductionMonitoringOrchestrator } from './ProductionMonitoringOrchestrator.js';
import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';
import { MemoryManager } from '../utils/MemoryManager.js';
/**
 * Set up production monitoring with all components
 */
export function setupProductionMonitoring(options) {
    const { database, config, enableAlerting = true, alertingChannels = { console: true, file: true } } = options;
    // Use provided monitors or create new ones
    const memoryManager = options.memoryManager || new MemoryManager();
    const performanceMonitor = options.performanceMonitor || new PerformanceMonitor(database, memoryManager);
    // Create orchestrator
    const orchestrator = new ProductionMonitoringOrchestrator(database, performanceMonitor, memoryManager);
    return {
        orchestrator,
        startMonitoring: () => orchestrator.startMonitoring(),
        stopMonitoring: () => orchestrator.stopMonitoring(),
        getHealthReport: () => orchestrator.getSystemHealthReport()
    };
}
/**
 * Quick setup for standard production monitoring
 */
export function setupStandardMonitoring(database, config) {
    return setupProductionMonitoring({
        database,
        config,
        enableAlerting: config.monitoring.enableAlerting,
        alertingChannels: {
            console: true,
            file: true
        }
    });
}
// Re-export main components
export { ProductionMonitoringOrchestrator } from './ProductionMonitoringOrchestrator.js';
export * from '../utils/PerformanceMonitor.js';
export * from '../utils/MemoryManager.js';
//# sourceMappingURL=index.js.map