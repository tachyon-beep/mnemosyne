/**
 * Production Monitoring System
 *
 * Provides comprehensive monitoring setup and orchestration
 * for production deployment of the MCP Persistence System.
 */
import { ProductionMonitoringOrchestrator } from './ProductionMonitoringOrchestrator.js';
import { DatabaseManager } from '../storage/Database.js';
import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';
import { MemoryManager } from '../utils/MemoryManager.js';
import { ProductionConfig } from '../config/ProductionConfig.js';
export interface MonitoringSetupOptions {
    database: DatabaseManager;
    performanceMonitor?: PerformanceMonitor;
    memoryManager?: MemoryManager;
    config: ProductionConfig;
    enableAlerting?: boolean;
    alertingChannels?: {
        console?: boolean;
        file?: boolean;
        webhook?: {
            url: string;
            method?: 'POST' | 'PUT';
            headers?: Record<string, string>;
        };
    };
}
export interface MonitoringSetupResult {
    orchestrator: ProductionMonitoringOrchestrator;
    startMonitoring: () => Promise<void>;
    stopMonitoring: () => Promise<void>;
    getHealthReport: () => Promise<any>;
}
/**
 * Set up production monitoring with all components
 */
export declare function setupProductionMonitoring(options: MonitoringSetupOptions): MonitoringSetupResult;
/**
 * Quick setup for standard production monitoring
 */
export declare function setupStandardMonitoring(database: DatabaseManager, config: ProductionConfig): MonitoringSetupResult;
export { ProductionMonitoringOrchestrator } from './ProductionMonitoringOrchestrator.js';
export * from '../utils/PerformanceMonitor.js';
export * from '../utils/MemoryManager.js';
//# sourceMappingURL=index.d.ts.map