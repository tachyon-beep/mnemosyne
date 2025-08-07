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

// Export new dynamic monitoring components
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
export function setupProductionMonitoring(options: MonitoringSetupOptions): MonitoringSetupResult {
  const {
    database,
    config,
    enableAlerting = true,
    enableDynamicThresholds = true,
    enableContextAwareAlerts = true,
    enableSystemProfiling = true,
    enableMLOptimization = true,
    alertingChannels = { console: true, file: true }
  } = options;

  // Use provided monitors or create new ones with enhanced capabilities
  const memoryManager = options.memoryManager || new MemoryManager({
    heapWarningThreshold: 0.75,
    heapCriticalThreshold: 0.9,
    monitoringInterval: 30000
  });

  const performanceMonitor = options.performanceMonitor || new PerformanceMonitor(
    database, 
    memoryManager,
    {
      enableDynamicThresholds,
      metricsRetentionHours: 48,
      monitoringIntervalSeconds: 30
    }
  );

  // Create orchestrator with enhanced monitoring capabilities
  const orchestrator = new ProductionMonitoringOrchestrator(
    database,
    performanceMonitor,
    memoryManager,
    {
      enableEnhancedMonitoring: enableDynamicThresholds || enableContextAwareAlerts || enableSystemProfiling
    }
  );

  return {
    orchestrator,
    startMonitoring: () => orchestrator.startMonitoring(),
    stopMonitoring: () => orchestrator.stopMonitoring(),
    getHealthReport: () => orchestrator.getSystemHealthReport()
  };
}

/**
 * Quick setup for enhanced dynamic monitoring
 */
export function setupEnhancedMonitoring(
  database: DatabaseManager,
  config: ProductionConfig
): MonitoringSetupResult {
  return setupProductionMonitoring({
    database,
    config,
    enableAlerting: config.monitoring?.enableAlerting ?? true,
    enableDynamicThresholds: true,
    enableContextAwareAlerts: true,
    enableSystemProfiling: true,
    enableMLOptimization: true,
    alertingChannels: {
      console: true,
      file: true
    }
  });
}

/**
 * Quick setup for standard production monitoring (backward compatibility)
 */
export function setupStandardMonitoring(
  database: DatabaseManager,
  config: ProductionConfig
): MonitoringSetupResult {
  return setupProductionMonitoring({
    database,
    config,
    enableAlerting: config.monitoring?.enableAlerting ?? true,
    enableDynamicThresholds: false,
    enableContextAwareAlerts: false,
    enableSystemProfiling: false,
    enableMLOptimization: false,
    alertingChannels: {
      console: true,
      file: true
    }
  });
}

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
export async function startDynamicMonitoring(
  database: DatabaseManager,
  simpleConfig: SimpleMonitoringConfig = {}
): Promise<ProductionMonitoringOrchestrator> {
  const {
    enableDynamicThresholds = true,
    enableContextAwareAlerts = true,
    enableSystemProfiling = true,
    enableMLOptimization = true,
    metricsRetentionHours = 48,
    monitoringIntervalSeconds = 30
  } = simpleConfig;

  // Create memory manager
  const memoryManager = new MemoryManager({
    heapWarningThreshold: 0.75,
    heapCriticalThreshold: 0.9,
    monitoringInterval: monitoringIntervalSeconds * 1000
  });

  // Create performance monitor with dynamic capabilities
  const performanceMonitor = new PerformanceMonitor(
    database,
    memoryManager,
    {
      enableDynamicThresholds,
      metricsRetentionHours,
      monitoringIntervalSeconds
    }
  );

  // Create orchestrator with enhanced capabilities
  const orchestrator = new ProductionMonitoringOrchestrator(
    database,
    performanceMonitor,
    memoryManager,
    {
      enableEnhancedMonitoring: enableDynamicThresholds || enableContextAwareAlerts || enableSystemProfiling
    }
  );

  await orchestrator.startMonitoring();

  console.log('✅ Dynamic monitoring system started with configuration:', {
    dynamicThresholds: enableDynamicThresholds,
    contextAwareAlerts: enableContextAwareAlerts,
    systemProfiling: enableSystemProfiling,
    mlOptimization: enableMLOptimization,
    enhanced: enableDynamicThresholds || enableContextAwareAlerts || enableSystemProfiling
  });

  return orchestrator;
}

// Re-export main components
export { ProductionMonitoringOrchestrator } from './ProductionMonitoringOrchestrator.js';
export * from '../utils/PerformanceMonitor.js';
export * from '../utils/MemoryManager.js';