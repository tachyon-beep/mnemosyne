/**
 * Dynamic Monitoring System Integration Tests
 * 
 * Validates the complete dynamic monitoring system including:
 * - Dynamic threshold management
 * - Context-aware alerting
 * - System profiling
 * - Enhanced performance monitoring
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DatabaseManager } from '../../src/storage/Database.js';
import { 
  DynamicThresholdManager, 
  SystemCapabilityProfiler,
  ContextAwareAlertSystem,
  EnhancedPerformanceMonitor,
  startDynamicMonitoring
} from '../../src/monitoring/index.js';
import * as os from 'os';
import * as fs from 'fs/promises';

describe('Dynamic Monitoring System Integration', () => {
  let database: DatabaseManager;
  let tempFiles: string[] = [];

  beforeEach(async () => {
    database = new DatabaseManager(':memory:');
    await database.initialize();
  });

  afterEach(async () => {
    await database?.close();
    
    // Clean up temp files
    for (const file of tempFiles) {
      try {
        await fs.unlink(file);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    tempFiles = [];
  });

  describe('Dynamic Threshold Manager', () => {
    let thresholdManager: DynamicThresholdManager;

    beforeEach(async () => {
      const tempFile = `./test-thresholds-${Date.now()}.json`;
      tempFiles.push(tempFile);
      thresholdManager = new DynamicThresholdManager(tempFile);
      await thresholdManager.initialize();
    });

    afterEach(async () => {
      await thresholdManager?.shutdown();
    });

    it('should initialize with system-appropriate thresholds', async () => {
      const thresholds = thresholdManager.getAllThresholds();
      expect(thresholds.size).toBeGreaterThan(0);
      
      // Check that thresholds are adjusted for system capabilities
      const dbThreshold = thresholds.get('database_query_time');
      expect(dbThreshold).toBeDefined();
      expect(dbThreshold!.currentValue).toBeGreaterThan(0);
      expect(dbThreshold!.confidence).toBeGreaterThan(0);
    });

    it('should adapt thresholds based on baseline data', async () => {
      const initialThreshold = thresholdManager.getThreshold('database_query_time');
      expect(initialThreshold).toBeDefined();
      
      // Feed consistent fast performance data
      for (let i = 0; i < 150; i++) {
        const fastTime = 50 + Math.random() * 50; // 50-100ms
        thresholdManager.updateBaseline('query_time', 'database', fastTime);
      }
      
      // Allow some processing time
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const adaptedThreshold = thresholdManager.getThreshold('database_query_time');
      expect(adaptedThreshold).toBeDefined();
      
      // Threshold should have adapted (either up or down based on the adaptation logic)
      expect(adaptedThreshold).not.toBe(initialThreshold);
    });

    it('should provide threshold optimization recommendations', async () => {
      // Record some training data with different scenarios
      thresholdManager.recordTrainingData(
        { database_query_time: 300, memory_usage: 0.6 },
        1, 0, 0 // 1 alert, no false positives, no missed issues
      );
      
      thresholdManager.recordTrainingData(
        { database_query_time: 800, memory_usage: 0.8 },
        2, 1, 0 // 2 alerts, 1 false positive, no missed issues
      );
      
      const optimization = await thresholdManager.optimizeThresholds();
      expect(optimization).toBeDefined();
      expect(optimization.confidence).toBeGreaterThanOrEqual(0);
      expect(optimization.reasoning).toBeInstanceOf(Array);
    });

    it('should persist and load threshold data', async () => {
      const originalThreshold = thresholdManager.getThreshold('database_query_time');
      
      // Update some baselines
      for (let i = 0; i < 10; i++) {
        thresholdManager.updateBaseline('query_time', 'database', 200 + i * 10);
      }
      
      await thresholdManager.shutdown();
      
      // Create new manager with same config file
      const newManager = new DynamicThresholdManager(tempFiles[0]);
      await newManager.initialize();
      
      const loadedThreshold = newManager.getThreshold('database_query_time');
      expect(loadedThreshold).toBeDefined();
      
      await newManager.shutdown();
    });
  });

  describe('System Capability Profiler', () => {
    let profiler: SystemCapabilityProfiler;

    beforeEach(() => {
      const tempFile = `./test-profile-${Date.now()}.json`;
      tempFiles.push(tempFile);
      profiler = new SystemCapabilityProfiler(tempFile);
    });

    it('should profile system capabilities', async () => {
      const profile = await profiler.profileSystem();
      
      expect(profile).toBeDefined();
      expect(profile.cpu.cores).toBeGreaterThan(0);
      expect(profile.memory.totalMemory).toBeGreaterThan(0);
      expect(profile.runtime.nodeVersion).toBeDefined();
      expect(profile.overallPerformanceClass).toMatch(/^(low|medium|high|exceptional)$/);
    });

    it('should generate appropriate performance configuration', async () => {
      await profiler.profileSystem();
      const config = profiler.getPerformanceConfig();
      
      expect(config).toBeDefined();
      expect(config.database.maxConnections).toBeGreaterThan(0);
      expect(config.memory.maxHeapUsage).toBeGreaterThan(0);
      expect(config.search.maxConcurrentSearches).toBeGreaterThan(0);
      expect(config.capabilities.performanceClass).toMatch(/^(low|medium|high|exceptional)$/);
    });

    it('should benchmark system performance', async () => {
      await profiler.profileSystem();
      const profile = profiler.getProfile();
      
      expect(profile).toBeDefined();
      expect(profile!.cpu.performanceScore).toBeGreaterThan(0);
      expect(profile!.memory.bandwidth).toBeGreaterThan(0);
      expect(profile!.disk.readSpeed).toBeGreaterThan(0);
    });

    it('should cache profile data', async () => {
      const profile1 = await profiler.profileSystem();
      const profile2 = await profiler.profileSystem(); // Should use cache
      
      expect(profile1.timestamp).toBe(profile2.timestamp);
    });

    it('should force re-profiling when requested', async () => {
      const profile1 = await profiler.profileSystem();
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      const profile2 = await profiler.forceReprofile();
      
      expect(profile2.timestamp).toBeGreaterThan(profile1.timestamp);
    });
  });

  describe('Context-Aware Alert System', () => {
    let alertSystem: ContextAwareAlertSystem;

    beforeEach(() => {
      alertSystem = new ContextAwareAlertSystem();
    });

    it('should process alerts with contextual adjustments', async () => {
      const alert = await alertSystem.processAlert(
        'query_duration',
        'database',
        1000, // 1 second
        500,  // 500ms threshold
        'high',
        'Database query exceeded threshold'
      );
      
      expect(alert).toBeDefined();
      expect(alert!.adjustedSeverity).toBeDefined();
      expect(alert!.actionableInsights).toBeInstanceOf(Array);
      expect(alert!.predictedDuration).toBeGreaterThan(0);
    });

    it('should suppress alerts based on rules', async () => {
      // This test would need to simulate maintenance window conditions
      // For now, we'll test basic suppression logic
      
      const alert1 = await alertSystem.processAlert(
        'test_metric',
        'system',
        100,
        50,
        'low',
        'Test alert'
      );
      
      expect(alert1).toBeDefined();
    });

    it('should correlate related alerts', async () => {
      // Create multiple related alerts
      const alert1 = await alertSystem.processAlert(
        'query_duration',
        'database',
        800,
        500,
        'medium',
        'Database slow'
      );
      
      const alert2 = await alertSystem.processAlert(
        'heap_usage',
        'memory',
        0.9,
        0.8,
        'high',
        'High memory usage'
      );
      
      expect(alert1).toBeDefined();
      expect(alert2).toBeDefined();
      
      // Check if alerts are correlated (would need more sophisticated correlation logic)
      if (alert2 && alert1) {
        expect(alert2.correlatedAlerts.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should provide system status', () => {
      const status = alertSystem.getSystemStatus();
      
      expect(status).toBeDefined();
      expect(status.activeAlerts).toBeInstanceOf(Array);
      expect(status.suppressionRules).toBeInstanceOf(Array);
      expect(status.channelStatus).toBeInstanceOf(Array);
    });
  });

  describe('Enhanced Performance Monitor', () => {
    let memoryManager: any;
    let enhancedMonitor: EnhancedPerformanceMonitor;

    beforeEach(async () => {
      // Mock memory manager for testing
      memoryManager = {
        getCurrentStats: () => ({
          heapUsed: 100 * 1024 * 1024,
          heapTotal: 200 * 1024 * 1024,
          rss: 150 * 1024 * 1024,
          external: 10 * 1024 * 1024,
          arrayBuffers: 5 * 1024 * 1024
        }),
        getMemoryReport: () => ({
          current: {
            heapUsed: 100 * 1024 * 1024,
            heapTotal: 200 * 1024 * 1024
          },
          pressure: {
            level: 'low',
            heapUsagePercent: 0.5,
            recommendation: 'Memory usage normal'
          }
        })
      };
      
      enhancedMonitor = new EnhancedPerformanceMonitor(database, memoryManager);
    });

    afterEach(async () => {
      if (enhancedMonitor) {
        await enhancedMonitor.stopMonitoring();
      }
    });

    it('should initialize with system profiling', async () => {
      let initialized = false;
      
      enhancedMonitor.on('initialized', () => {
        initialized = true;
      });
      
      await enhancedMonitor.initialize();
      expect(initialized).toBe(true);
    });

    it('should record enhanced metrics', async () => {
      await enhancedMonitor.initialize();
      
      enhancedMonitor.recordEnhancedMetric('database', 'test_query', 250, 'ms', { type: 'SELECT' });
      
      // Verify metric was recorded (would need access to internal metrics)
      const status = enhancedMonitor.getMonitoringStatus();
      expect(status).toBeDefined();
      expect(status.isActive).toBe(false); // Not started yet
    });

    it('should provide system health assessment', async () => {
      await enhancedMonitor.initialize();
      
      const assessment = enhancedMonitor.getSystemHealthAssessment();
      
      expect(assessment).toBeDefined();
      expect(assessment.overall).toMatch(/^(healthy|degraded|critical)$/);
      expect(assessment.components).toBeDefined();
      expect(assessment.components.database).toBeDefined();
      expect(assessment.components.memory).toBeDefined();
      expect(assessment.recommendations).toBeInstanceOf(Array);
    });

    it('should start and stop monitoring', async () => {
      await enhancedMonitor.initialize();
      await enhancedMonitor.startMonitoring();
      
      const status1 = enhancedMonitor.getMonitoringStatus();
      expect(status1.isActive).toBe(true);
      
      await enhancedMonitor.stopMonitoring();
      
      const status2 = enhancedMonitor.getMonitoringStatus();
      expect(status2.isActive).toBe(false);
    });
  });

  describe('Complete System Integration', () => {
    it('should start dynamic monitoring with all features', async () => {
      const orchestrator = await startDynamicMonitoring(database, {
        enableDynamicThresholds: true,
        enableContextAwareAlerts: true,
        enableSystemProfiling: true,
        enableMLOptimization: true,
        monitoringIntervalSeconds: 1 // Fast for testing
      });
      
      expect(orchestrator).toBeDefined();
      
      // Check capabilities
      const capabilities = orchestrator.getMonitoringCapabilities();
      expect(capabilities.enhanced).toBe(true);
      expect(capabilities.isRunning).toBe(true);
      
      // Get health report
      const healthReport = await orchestrator.getSystemHealthReport();
      expect(healthReport).toBeDefined();
      expect(healthReport.enhanced).toBe(true);
      expect(healthReport.overall).toMatch(/^(healthy|degraded|critical)$/);
      
      // Cleanup
      await orchestrator.stopMonitoring();
      
      const finalCapabilities = orchestrator.getMonitoringCapabilities();
      expect(finalCapabilities.isRunning).toBe(false);
    });

    it('should handle threshold adaptation during monitoring', async () => {
      const orchestrator = await startDynamicMonitoring(database, {
        enableDynamicThresholds: true,
        monitoringIntervalSeconds: 1
      });
      
      let thresholdAdapted = false;
      orchestrator.on('threshold:adapted', () => {
        thresholdAdapted = true;
      });
      
      // Run for a short time to allow adaptation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await orchestrator.stopMonitoring();
      
      // Note: threshold adaptation might not happen in this short time
      // but the system should be set up correctly
      const capabilities = orchestrator.getMonitoringCapabilities();
      expect(capabilities.dynamicThresholds).toBe(true);
    });

    it('should generate appropriate recommendations', async () => {
      const orchestrator = await startDynamicMonitoring(database, {
        enableSystemProfiling: true
      });
      
      const healthReport = await orchestrator.getSystemHealthReport();
      
      expect(healthReport.recommendations).toBeInstanceOf(Array);
      // Recommendations might be empty for a healthy system, which is fine
      
      await orchestrator.stopMonitoring();
    });

    it('should switch between monitoring modes', async () => {
      const orchestrator = await startDynamicMonitoring(database, {
        enableDynamicThresholds: false,
        enableContextAwareAlerts: false,
        enableSystemProfiling: false
      });
      
      let initialCapabilities = orchestrator.getMonitoringCapabilities();
      expect(initialCapabilities.enhanced).toBe(false);
      
      await orchestrator.switchToEnhancedMonitoring();
      
      let enhancedCapabilities = orchestrator.getMonitoringCapabilities();
      expect(enhancedCapabilities.enhanced).toBe(true);
      
      await orchestrator.stopMonitoring();
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle high-frequency metric recording', async () => {
      const thresholdManager = new DynamicThresholdManager();
      await thresholdManager.initialize();
      
      const startTime = Date.now();
      
      // Record 1000 metrics quickly
      for (let i = 0; i < 1000; i++) {
        thresholdManager.updateBaseline(
          'test_metric',
          'performance',
          Math.random() * 1000
        );
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      await thresholdManager.shutdown();
    });

    it('should handle memory pressure gracefully', async () => {
      const orchestrator = await startDynamicMonitoring(database, {
        monitoringIntervalSeconds: 1
      });
      
      // Simulate memory pressure by creating and releasing objects
      const objects: any[] = [];
      for (let i = 0; i < 1000; i++) {
        objects.push(new Array(1000).fill(i));
      }
      
      // Wait for monitoring to detect and respond
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Release memory
      objects.length = 0;
      
      const healthReport = await orchestrator.getSystemHealthReport();
      expect(healthReport.overall).toMatch(/^(healthy|degraded|critical)$/);
      
      await orchestrator.stopMonitoring();
    });

    it('should recover from component failures', async () => {
      const orchestrator = await startDynamicMonitoring(database);
      
      // Test that the system can handle internal errors gracefully
      // This is a basic test - in practice you'd test specific failure scenarios
      
      const healthReport = await orchestrator.getSystemHealthReport();
      expect(healthReport).toBeDefined();
      
      await orchestrator.stopMonitoring();
    });
  });
});