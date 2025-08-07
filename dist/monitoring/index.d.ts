/**
 * Dynamic Performance Monitoring System
 *
 * Complete monitoring solution with adaptive capabilities:
 * - Dynamic threshold management
 * - Context-aware alerting
 * - System capability profiling
 * - Machine learning optimization
 * - Enhanced performance monitoring
 */
import { ProductionMonitoringOrchestrator } from './ProductionMonitoringOrchestrator.js';
import { DatabaseManager } from '../storage/Database.js';
import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';
import { MemoryManager } from '../utils/MemoryManager.js';
import { ProductionConfig } from '../config/ProductionConfig.js';
export { DynamicThresholdManager } from './DynamicThresholdManager.js';
export { ContextAwareAlertSystem } from './ContextAwareAlertSystem.js';
export { SystemCapabilityProfiler } from './SystemCapabilityProfiler.js';
export { EnhancedPerformanceMonitor } from './EnhancedPerformanceMonitor.js';
export interface MonitoringSetupOptions {
    database: DatabaseManager;
    performanceMonitor?: PerformanceMonitor;
    memoryManager?: MemoryManager;
    config: ProductionConfig;
    enableAlerting?: boolean;
    enableDynamicThresholds?: boolean;
    enableContextAwareAlerts?: boolean;
    enableSystemProfiling?: boolean;
    enableMLOptimization?: boolean;
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
 * Set up production monitoring with all components including dynamic capabilities
 */
export declare function setupProductionMonitoring(options: MonitoringSetupOptions): MonitoringSetupResult;
/**
 * Quick setup for enhanced dynamic monitoring
 */
export declare function setupEnhancedMonitoring(database: DatabaseManager, config: ProductionConfig): MonitoringSetupResult;
/**
 * Quick setup for standard production monitoring (backward compatibility)
 */
export declare function setupStandardMonitoring(database: DatabaseManager, config: ProductionConfig): MonitoringSetupResult;
/**
 * Simple configuration-based monitoring setup
 */
export interface SimpleMonitoringConfig {
    enableDynamicThresholds?: boolean;
    enableContextAwareAlerts?: boolean;
    enableSystemProfiling?: boolean;
    enableMLOptimization?: boolean;
    metricsRetentionHours?: number;
    monitoringIntervalSeconds?: number;
}
/**
 * Quick start function for immediate monitoring
 */
export declare function startDynamicMonitoring(database: DatabaseManager, simpleConfig?: SimpleMonitoringConfig): Promise<ProductionMonitoringOrchestrator>;
export { ProductionMonitoringOrchestrator } from './ProductionMonitoringOrchestrator.js';
export * from '../utils/PerformanceMonitor.js';
export * from '../utils/MemoryManager.js';
//# sourceMappingURL=index.d.ts.map