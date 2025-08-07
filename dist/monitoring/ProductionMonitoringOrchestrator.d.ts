/**
 * Production Monitoring Orchestrator with Dynamic Capabilities
 *
 * Orchestrates dynamic monitoring coordination for the MCP Persistence System
 * with adaptive thresholds, context-aware alerting, and system profiling
 */
import { EventEmitter } from 'events';
import { DatabaseManager } from '../storage/Database.js';
import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';
import { MemoryManager } from '../utils/MemoryManager.js';
export declare class ProductionMonitoringOrchestrator extends EventEmitter {
    private readonly database;
    private readonly performanceMonitor;
    private readonly memoryManager;
    private isRunning;
    private enhancedMonitor;
    private useEnhancedMonitoring;
    constructor(database: DatabaseManager, performanceMonitor: PerformanceMonitor, memoryManager: MemoryManager, options?: {
        enableEnhancedMonitoring?: boolean;
    });
    startMonitoring(): Promise<void>;
    stopMonitoring(): Promise<void>;
    getSystemHealthReport(): Promise<any>;
    /**
     * Setup event handlers for enhanced monitoring
     */
    private setupEnhancedEventHandlers;
    /**
     * Force system re-profiling (enhanced monitoring only)
     */
    reprofileSystem(): Promise<void>;
    /**
     * Get monitoring capabilities and status
     */
    getMonitoringCapabilities(): {
        enhanced: boolean;
        dynamicThresholds: boolean;
        contextAwareAlerts: boolean;
        systemProfiling: boolean;
        mlOptimization: boolean;
        uptime: number;
        isRunning: boolean;
    };
    /**
     * Switch monitoring mode (requires restart)
     */
    switchToEnhancedMonitoring(): Promise<void>;
}
//# sourceMappingURL=ProductionMonitoringOrchestrator.d.ts.map