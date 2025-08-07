/**
 * Simplified Production Monitoring Orchestrator
 *
 * Basic monitoring coordination for the MCP Persistence System
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
    constructor(database: DatabaseManager, performanceMonitor: PerformanceMonitor, memoryManager: MemoryManager);
    startMonitoring(): Promise<void>;
    stopMonitoring(): Promise<void>;
    getSystemHealthReport(): Promise<any>;
}
//# sourceMappingURL=ProductionMonitoringOrchestrator.d.ts.map