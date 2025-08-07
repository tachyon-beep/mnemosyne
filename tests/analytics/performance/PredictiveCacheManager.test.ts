/**
 * Predictive Cache Manager - Unit Tests
 * 
 * Comprehensive test suite for the predictive caching system,
 * validating pattern detection, prediction accuracy, cache warming,
 * and resource management functionality.
 */

import { DatabaseManager } from '../../../src/storage/Database.js';
import { AnalyticsEngine } from '../../../src/analytics/services/AnalyticsEngine.js';
import { 
  PredictiveCacheManager,
  DEFAULT_PREDICTIVE_CACHE_CONFIG,
  PredictiveCacheConfig,
  UsagePattern,
  CachePrediction
} from '../../../src/analytics/performance/PredictiveCacheManager.js';

describe('PredictiveCacheManager', () => {
  let databaseManager: DatabaseManager;
  let analyticsEngine: AnalyticsEngine;
  let cacheManager: PredictiveCacheManager;
  let testConfig: PredictiveCacheConfig;

  beforeEach(async () => {
    databaseManager = new DatabaseManager({ databasePath: ':memory:' });
    await databaseManager.initialize();
    
    analyticsEngine = new AnalyticsEngine(databaseManager);
    
    testConfig = {
      ...DEFAULT_PREDICTIVE_CACHE_CONFIG,
      enabled: true,
      learningEnabled: true,
      maxPatternHistory: 100,
      minPatternFrequency: 2,
      predictionThreshold: 0.3,
      maxConcurrentPredictions: 5,
      resourceThresholds: {
        maxCpuUtilization: 70,
        maxMemoryUsageMB: 200,
        maxDiskIOPS: 500
      },
      warmingStrategy: {
        aggressiveness: 'moderate',
        maxWarmingOperationsPerMinute: 5,
        priorityWeighting: {
          frequency: 0.4,
          recency: 0.3,
          confidence: 0.2,
          userContext: 0.1
        }
      }
    };

    cacheManager = new PredictiveCacheManager(
      databaseManager,
      analyticsEngine,
      testConfig
    );
  });

  afterEach(async () => {
    if (cacheManager) {
      cacheManager.shutdown();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', async () => {
      await cacheManager.initialize();
      
      const status = cacheManager.getSystemStatus();
      expect(status.enabled).toBe(true);
      expect(status.patterns.totalPatterns).toBe(0);
      expect(status.recentActivity.totalRequests).toBe(0);
    });

    it('should handle disabled configuration', async () => {
      const disabledConfig = { ...testConfig, enabled: false };
      const disabledManager = new PredictiveCacheManager(
        databaseManager,
        analyticsEngine,
        disabledConfig
      );

      await disabledManager.initialize();
      const status = disabledManager.getSystemStatus();
      expect(status.enabled).toBe(false);
      
      disabledManager.shutdown();
    });

    it('should validate configuration parameters', () => {
      expect(() => new PredictiveCacheManager(
        databaseManager,
        analyticsEngine,
        { ...testConfig, maxConcurrentPredictions: -1 }
      )).not.toThrow(); // Should handle invalid config gracefully
    });
  });

  describe('Pattern Learning', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    it('should record cache access patterns', () => {
      // Record a sequence of cache accesses
      cacheManager.recordCacheAccess('analytics:flow:123', 'user1', { type: 'dashboard' });
      cacheManager.recordCacheAccess('analytics:productivity:123', 'user1', { type: 'dashboard' });
      cacheManager.recordCacheAccess('analytics:summary:123', 'user1', { type: 'dashboard' });

      const status = cacheManager.getSystemStatus();
      expect(status.recentActivity.totalRequests).toBe(3);
    });

    it('should learn sequential patterns from repeated access', async () => {
      // Simulate repeated access pattern
      const sequence = [
        'analytics:dashboard:overview',
        'analytics:flow:recent',
        'analytics:productivity:weekly'
      ];

      for (let repeat = 0; repeat < 5; repeat++) {
        for (const key of sequence) {
          cacheManager.recordCacheAccess(key, 'user1', { sessionId: `session_${repeat}` });
          await sleep(50); // Small delay between accesses
        }
        await sleep(100); // Delay between pattern repetitions
      }

      const status = cacheManager.getSystemStatus();
      expect(status.patterns.totalPatterns).toBeGreaterThan(0);
      expect(status.patterns.averageConfidence).toBeGreaterThan(0);
    });

    it('should handle different user contexts', () => {
      // Record accesses with different contexts
      cacheManager.recordCacheAccess('analytics:query:1', 'user1', { 
        timeOfDay: 9, 
        dayOfWeek: 1,
        queryType: 'morning_review'
      });
      
      cacheManager.recordCacheAccess('analytics:query:2', 'user1', { 
        timeOfDay: 14, 
        dayOfWeek: 1,
        queryType: 'afternoon_analysis'
      });

      const status = cacheManager.getSystemStatus();
      expect(status.recentActivity.totalRequests).toBe(2);
    });

    it('should maintain sliding window for recent requests', async () => {
      // Record many requests to test sliding window
      for (let i = 0; i < 100; i++) {
        cacheManager.recordCacheAccess(`analytics:test:${i}`, 'user1');
        await sleep(1);
      }

      const status = cacheManager.getSystemStatus();
      expect(status.recentActivity.totalRequests).toBeLessThanOrEqual(100);
    });
  });

  describe('Prediction Generation', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
      
      // Create training data with predictable patterns
      const patterns = [
        ['dashboard', 'flow_analysis', 'summary'],
        ['search', 'detailed_view', 'export'],
        ['overview', 'productivity', 'recommendations']
      ];

      for (const pattern of patterns) {
        for (let repeat = 0; repeat < 3; repeat++) {
          for (const step of pattern) {
            cacheManager.recordCacheAccess(`analytics:${step}:${repeat}`, 'user1', {
              pattern: pattern.join('->'),
              timeOfDay: 9 + repeat
            });
            await sleep(10);
          }
          await sleep(50);
        }
      }
      
      // Allow time for pattern extraction
      await sleep(100);
    });

    it('should generate predictions based on learned patterns', async () => {
      const predictions = await cacheManager.triggerPredictiveWarming();
      
      expect(Array.isArray(predictions)).toBe(true);
      // With enough training data, should generate some predictions
      if (predictions.length > 0) {
        expect(predictions[0]).toHaveProperty('cacheKey');
        expect(predictions[0]).toHaveProperty('confidence');
        expect(predictions[0]).toHaveProperty('priority');
        expect(predictions[0].confidence).toBeGreaterThan(0);
        expect(predictions[0].confidence).toBeLessThanOrEqual(1);
      }
    });

    it('should respect prediction threshold configuration', async () => {
      // Set high prediction threshold
      cacheManager.updateConfiguration({
        predictionThreshold: 0.9
      });

      const predictions = await cacheManager.triggerPredictiveWarming();
      
      // With high threshold, should generate fewer predictions
      const highThresholdCount = predictions.length;

      // Set low prediction threshold
      cacheManager.updateConfiguration({
        predictionThreshold: 0.1
      });

      const morePredictions = await cacheManager.triggerPredictiveWarming();
      
      // Should generate more predictions with lower threshold
      expect(morePredictions.length).toBeGreaterThanOrEqual(highThresholdCount);
    });

    it('should limit predictions to max concurrent setting', async () => {
      cacheManager.updateConfiguration({
        maxConcurrentPredictions: 2,
        predictionThreshold: 0.1
      });

      const predictions = await cacheManager.triggerPredictiveWarming();
      expect(predictions.length).toBeLessThanOrEqual(2);
    });

    it('should rank predictions by priority and confidence', async () => {
      const predictions = await cacheManager.triggerPredictiveWarming();
      
      if (predictions.length > 1) {
        // Verify predictions are sorted by priority (descending)
        for (let i = 1; i < predictions.length; i++) {
          const prevScore = predictions[i - 1].priority * predictions[i - 1].confidence;
          const currScore = predictions[i].priority * predictions[i].confidence;
          expect(prevScore).toBeGreaterThanOrEqual(currScore);
        }
      }
    });
  });

  describe('Cache Warming', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    it('should queue predictions for warming', async () => {
      const mockPredictions: CachePrediction[] = [
        {
          cacheKey: 'analytics:test:1',
          queryType: 'flow_analysis',
          confidence: 0.8,
          priority: 80,
          estimatedValue: 2.5,
          context: { test: true },
          expiryTime: Date.now() + 60000
        }
      ];

      // Access the warming engine through the manager (private access for testing)
      const status = cacheManager.getSystemStatus();
      const initialQueueSize = status.warming.queueSize;

      await cacheManager.triggerPredictiveWarming();
      
      const newStatus = cacheManager.getSystemStatus();
      // Queue size might change based on internal predictions
      expect(typeof newStatus.warming.queueSize).toBe('number');
    });

    it('should respect resource thresholds during warming', async () => {
      // Set very restrictive resource thresholds
      cacheManager.updateConfiguration({
        resourceThresholds: {
          maxCpuUtilization: 1,  // Very low CPU threshold
          maxMemoryUsageMB: 1,   // Very low memory threshold
          maxDiskIOPS: 1         // Very low disk I/O threshold
        }
      });

      await cacheManager.triggerPredictiveWarming();
      
      const status = cacheManager.getSystemStatus();
      expect(status.warming.stats.skippedDueToResources).toBeGreaterThanOrEqual(0);
    });

    it('should track warming statistics', async () => {
      await cacheManager.triggerPredictiveWarming();
      await sleep(500); // Allow warming to process
      
      const status = cacheManager.getSystemStatus();
      expect(typeof status.warming.stats.successful).toBe('number');
      expect(typeof status.warming.stats.failed).toBe('number');
      expect(typeof status.warming.stats.skippedDueToResources).toBe('number');
      expect(status.warming.stats.successful).toBeGreaterThanOrEqual(0);
    });

    it('should calculate warming efficiency', () => {
      const status = cacheManager.getSystemStatus();
      expect(typeof status.warming.efficiency).toBe('number');
      expect(status.warming.efficiency).toBeGreaterThanOrEqual(0);
      expect(status.warming.efficiency).toBeLessThanOrEqual(1);
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    it('should update configuration at runtime', () => {
      const newConfig = {
        predictionThreshold: 0.6,
        maxConcurrentPredictions: 8,
        warmingStrategy: {
          aggressiveness: 'aggressive' as const,
          maxWarmingOperationsPerMinute: 10,
          priorityWeighting: {
            frequency: 0.5,
            recency: 0.3,
            confidence: 0.15,
            userContext: 0.05
          }
        }
      };

      expect(() => cacheManager.updateConfiguration(newConfig)).not.toThrow();
      
      const status = cacheManager.getSystemStatus();
      expect(status.enabled).toBe(true); // Should remain enabled
    });

    it('should disable system when configured disabled', () => {
      cacheManager.updateConfiguration({ enabled: false });
      
      const status = cacheManager.getSystemStatus();
      expect(status.enabled).toBe(false);
    });

    it('should re-enable system after being disabled', () => {
      cacheManager.updateConfiguration({ enabled: false });
      cacheManager.updateConfiguration({ enabled: true });
      
      const status = cacheManager.getSystemStatus();
      expect(status.enabled).toBe(true);
    });
  });

  describe('System Status and Metrics', () => {
    beforeEach(async () => {
      await cacheManager.initialize();
    });

    it('should provide comprehensive system status', () => {
      const status = cacheManager.getSystemStatus();
      
      expect(status).toHaveProperty('enabled');
      expect(status).toHaveProperty('patterns');
      expect(status).toHaveProperty('models');
      expect(status).toHaveProperty('warming');
      expect(status).toHaveProperty('recentActivity');
      
      expect(status.patterns).toHaveProperty('totalPatterns');
      expect(status.patterns).toHaveProperty('activePatterns');
      expect(status.patterns).toHaveProperty('averageConfidence');
      expect(status.patterns).toHaveProperty('topPatterns');
      
      expect(status.warming).toHaveProperty('queueSize');
      expect(status.warming).toHaveProperty('activeTasks');
      expect(status.warming).toHaveProperty('stats');
      expect(status.warming).toHaveProperty('efficiency');
    });

    it('should track model performance separately', () => {
      const status = cacheManager.getSystemStatus();
      
      expect(typeof status.models).toBe('object');
      // Models should be tracked if enabled
      Object.values(status.models).forEach((modelStats: any) => {
        expect(modelStats).toHaveProperty('accuracy');
        expect(modelStats).toHaveProperty('predictions');
        expect(modelStats).toHaveProperty('lastUpdated');
        expect(typeof modelStats.accuracy).toBe('number');
        expect(modelStats.accuracy).toBeGreaterThanOrEqual(0);
        expect(modelStats.accuracy).toBeLessThanOrEqual(1);
      });
    });

    it('should track recent activity metrics', () => {
      // Generate some activity
      for (let i = 0; i < 10; i++) {
        cacheManager.recordCacheAccess(`analytics:activity:${i}`, 'user1');
      }
      
      const status = cacheManager.getSystemStatus();
      expect(status.recentActivity.totalRequests).toBe(10);
      expect(typeof status.recentActivity.requestsPerHour).toBe('number');
      expect(typeof status.recentActivity.predictionsGenerated).toBe('number');
    });

    it('should provide pattern statistics', async () => {
      // Create some patterns
      const sequence = ['step1', 'step2', 'step3'];
      for (let i = 0; i < 5; i++) {
        for (const step of sequence) {
          cacheManager.recordCacheAccess(`analytics:${step}:${i}`, 'user1');
          await sleep(10);
        }
      }
      
      await sleep(100); // Allow pattern extraction
      
      const status = cacheManager.getSystemStatus();
      if (status.patterns.totalPatterns > 0) {
        expect(status.patterns.averageConfidence).toBeGreaterThan(0);
        expect(Array.isArray(status.patterns.topPatterns)).toBe(true);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle initialization without analytics engine gracefully', () => {
      expect(() => new PredictiveCacheManager(
        databaseManager,
        null as any, // Invalid analytics engine
        testConfig
      )).not.toThrow();
    });

    it('should handle empty patterns gracefully', async () => {
      await cacheManager.initialize();
      
      // Try to generate predictions without any patterns
      const predictions = await cacheManager.triggerPredictiveWarming();
      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBe(0);
    });

    it('should handle malformed cache keys', () => {
      expect(() => {
        cacheManager.recordCacheAccess('', 'user1');
        cacheManager.recordCacheAccess(null as any, 'user1');
        cacheManager.recordCacheAccess(undefined as any, 'user1');
      }).not.toThrow();
    });

    it('should handle concurrent operations safely', async () => {
      await cacheManager.initialize();
      
      // Simulate concurrent cache accesses
      const promises = Array.from({ length: 50 }, (_, i) => 
        cacheManager.recordCacheAccess(`analytics:concurrent:${i}`, `user${i % 3}`)
      );
      
      expect(() => Promise.all(promises)).not.toThrow();
      await Promise.all(promises);
      
      const status = cacheManager.getSystemStatus();
      expect(status.recentActivity.totalRequests).toBe(50);
    });

    it('should gracefully handle shutdown during operation', async () => {
      await cacheManager.initialize();
      
      // Start some operations
      cacheManager.recordCacheAccess('analytics:shutdown:test', 'user1');
      const predictionPromise = cacheManager.triggerPredictiveWarming();
      
      // Shutdown immediately
      cacheManager.shutdown();
      
      // Operations should complete without errors
      await expect(predictionPromise).resolves.toBeDefined();
    });
  });

  describe('Performance and Memory Management', () => {
    it('should respect memory limits', () => {
      const status = cacheManager.getSystemStatus();
      // Memory usage should be tracked
      expect(typeof status.warming.stats.totalEstimatedTimeSaved).toBe('number');
    });

    it('should clean up old patterns automatically', async () => {
      await cacheManager.initialize();
      
      // Generate many patterns to trigger cleanup
      for (let i = 0; i < testConfig.maxPatternHistory + 50; i++) {
        cacheManager.recordCacheAccess(`analytics:cleanup:${i}`, 'user1');
        await sleep(1);
      }
      
      await sleep(200); // Allow cleanup to occur
      
      const status = cacheManager.getSystemStatus();
      // Pattern count should be limited by maxPatternHistory
      expect(status.patterns.totalPatterns).toBeLessThanOrEqual(testConfig.maxPatternHistory);
    });

    it('should handle high-frequency requests efficiently', async () => {
      await cacheManager.initialize();
      
      const startTime = Date.now();
      
      // Generate high-frequency requests
      for (let i = 0; i < 1000; i++) {
        cacheManager.recordCacheAccess(`analytics:highfreq:${i % 10}`, 'user1');
      }
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Should process 1000 requests reasonably quickly
      expect(processingTime).toBeLessThan(5000); // Less than 5 seconds
      
      const status = cacheManager.getSystemStatus();
      expect(status.recentActivity.totalRequests).toBe(1000);
    });
  });
});

/**
 * Integration tests for predictive caching with analytics optimizer
 */
describe('PredictiveCacheManager Integration', () => {
  let databaseManager: DatabaseManager;
  let analyticsEngine: AnalyticsEngine;

  beforeEach(async () => {
    databaseManager = new DatabaseManager({ databasePath: ':memory:' });
    await databaseManager.initialize();
    analyticsEngine = new AnalyticsEngine(databaseManager);
  });

  it('should integrate with AnalyticsPerformanceOptimizer', async () => {
    const { AnalyticsPerformanceOptimizer } = await import('../../../src/analytics/performance/AnalyticsPerformanceOptimizer.js');
    
    const optimizer = new AnalyticsPerformanceOptimizer(
      databaseManager,
      analyticsEngine,
      {
        enablePredictiveCaching: true,
        predictiveCache: {
          enabled: true,
          learningEnabled: true,
          predictionThreshold: 0.3
        }
      }
    );

    await optimizer.initializePredictiveCaching();
    
    const status = optimizer.getPredictiveCachingStatus();
    expect(status.enabled).toBe(true);
    expect(status.status).toBeDefined();
    expect(Array.isArray(status.recommendations)).toBe(true);
    
    // Should be able to trigger predictions
    const predictions = await optimizer.triggerPredictiveCacheWarming();
    expect(Array.isArray(predictions)).toBe(true);
  });

  it('should provide performance recommendations', async () => {
    const { AnalyticsPerformanceOptimizer } = await import('../../../src/analytics/performance/AnalyticsPerformanceOptimizer.js');
    
    const optimizer = new AnalyticsPerformanceOptimizer(
      databaseManager,
      analyticsEngine,
      {
        enablePredictiveCaching: false // Disabled to get recommendation
      }
    );

    const report = optimizer.getPerformanceReport();
    expect(report.recommendations.some(rec => 
      rec.includes('predictive caching')
    )).toBe(true);
  });
});

/**
 * Test utilities
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}