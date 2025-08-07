/**
 * Predictive Caching System - Usage Example
 * 
 * Demonstrates how to use the predictive caching system to improve
 * analytics performance through intelligent cache warming based on
 * user behavior patterns and machine learning predictions.
 */

import { DatabaseManager } from '../../storage/Database.js';
import { AnalyticsEngine } from '../services/AnalyticsEngine.js';
import { 
  AnalyticsPerformanceOptimizer,
  PredictiveCacheManager,
  DEFAULT_PREDICTIVE_CACHE_CONFIG,
  PredictiveCacheConfig
} from './index.js';

/**
 * Example: Setting up predictive caching for an analytics dashboard
 */
export async function demonstratePredictiveCaching() {
  console.log('🚀 Predictive Caching System Demo');
  console.log('=====================================\n');

  // Initialize database and analytics engine
  const databaseManager = new DatabaseManager({ databasePath: ':memory:' });
  await databaseManager.initialize();
  
  const analyticsEngine = new AnalyticsEngine(databaseManager);

  // Configure predictive caching with moderate aggressiveness
  const predictiveCacheConfig: PredictiveCacheConfig = {
    ...DEFAULT_PREDICTIVE_CACHE_CONFIG,
    enabled: true,
    learningEnabled: true,
    warmingStrategy: {
      aggressiveness: 'moderate',
      maxWarmingOperationsPerMinute: 8,
      priorityWeighting: {
        frequency: 0.4,     // High weight for frequently requested data
        recency: 0.3,       // Medium weight for recent requests
        confidence: 0.2,    // Lower weight for prediction confidence
        userContext: 0.1    // Low weight for user context matching
      }
    },
    resourceThresholds: {
      maxCpuUtilization: 60,    // Conservative CPU usage
      maxMemoryUsageMB: 300,    // Reasonable memory limit
      maxDiskIOPS: 800
    },
    models: {
      enableSequenceAnalysis: true,      // Learn from request sequences
      enableCollaborativeFiltering: true, // Learn from similar users
      enableTemporalPatterns: true,      // Learn time-based patterns
      enableContextualPredictions: true  // Learn context-based patterns
    }
  };

  // Create performance optimizer with predictive caching enabled
  const optimizer = new AnalyticsPerformanceOptimizer(
    databaseManager,
    analyticsEngine,
    {
      enableQueryCaching: true,
      enableMemoryOptimization: true,
      enableParallelProcessing: true,
      enablePredictiveCaching: true,
      maxMemoryUsageMB: 400,
      queryCacheTTLMinutes: 90,
      parallelWorkers: 4,
      batchSize: 25,
      enablePerformanceMonitoring: true,
      predictiveCache: predictiveCacheConfig
    }
  );

  // Initialize the predictive caching system
  await optimizer.initializePredictiveCaching();
  console.log('✅ Predictive caching system initialized\n');

  // Simulate user behavior patterns to train the system
  console.log('📊 Simulating user behavior patterns...');
  await simulateUserBehavior(optimizer);

  // Wait for pattern learning
  await sleep(2000);

  // Demonstrate prediction accuracy
  console.log('\n🎯 Demonstrating prediction accuracy...');
  await demonstratePredictionAccuracy(optimizer);

  // Show system status and recommendations
  console.log('\n📈 System Status and Performance Metrics:');
  await showSystemStatus(optimizer);

  // Demonstrate runtime configuration changes
  console.log('\n⚙️ Demonstrating runtime configuration...');
  await demonstrateRuntimeConfiguration(optimizer);

  // Cleanup
  console.log('\n🧹 Cleaning up...');
  optimizer.resetPerformanceState();
  
  console.log('\n✅ Demo completed successfully!');
}

/**
 * Simulate realistic user behavior patterns for training
 */
async function simulateUserBehavior(optimizer: AnalyticsPerformanceOptimizer) {
  const behaviorPatterns = [
    // Pattern 1: Morning dashboard review
    {
      sequence: [
        'analytics:dashboard:overview',
        'analytics:flow_analysis:recent',
        'analytics:productivity:weekly',
        'analytics:knowledge_gaps:summary'
      ],
      timeOfDay: 9,
      frequency: 5
    },
    // Pattern 2: Detailed analysis workflow
    {
      sequence: [
        'analytics:search:conversations',
        'analytics:flow_analysis:detailed',
        'analytics:decision_tracking:recent',
        'analytics:export:report'
      ],
      timeOfDay: 14,
      frequency: 3
    },
    // Pattern 3: End-of-day review
    {
      sequence: [
        'analytics:productivity:daily',
        'analytics:summary:today',
        'analytics:insights:proactive'
      ],
      timeOfDay: 17,
      frequency: 4
    }
  ];

  for (const pattern of behaviorPatterns) {
    for (let i = 0; i < pattern.frequency; i++) {
      for (const cacheKey of pattern.sequence) {
        // Simulate cache request with realistic delays
        await simulateCacheRequest(optimizer, cacheKey, {
          timeOfDay: pattern.timeOfDay,
          simulatedUser: 'user_1'
        });
        
        await sleep(Math.random() * 500 + 100); // 100-600ms delay
      }
      
      await sleep(Math.random() * 2000 + 1000); // 1-3s between pattern repetitions
    }
  }

  console.log('   • Simulated 3 distinct user behavior patterns');
  console.log('   • Generated training data for sequence, temporal, and contextual models');
}

/**
 * Simulate cache request to trigger pattern learning
 */
async function simulateCacheRequest(
  optimizer: AnalyticsPerformanceOptimizer, 
  cacheKey: string,
  context: any
) {
  // Simulate checking cache first (which will record the access pattern)
  const cached = await (optimizer as any).cache.get(cacheKey, (optimizer as any).predictiveCacheManager);
  
  if (!cached) {
    // Simulate expensive computation and caching result
    const mockResult = { 
      type: cacheKey.split(':')[1],
      data: `Mock result for ${cacheKey}`,
      timestamp: Date.now(),
      computationTime: Math.random() * 1000 + 200
    };
    
    await (optimizer as any).cache.set(cacheKey, mockResult, 60);
  }
}

/**
 * Demonstrate prediction accuracy by triggering predictions and validating them
 */
async function demonstratePredictionAccuracy(optimizer: AnalyticsPerformanceOptimizer) {
  // Trigger predictive cache warming
  const predictions = await optimizer.triggerPredictiveCacheWarming();
  console.log(`   • Generated ${predictions.length} cache predictions`);

  if (predictions.length > 0) {
    console.log('   • Top predictions:');
    predictions.slice(0, 3).forEach((pred, index) => {
      console.log(`     ${index + 1}. ${pred.cacheKey} (confidence: ${(pred.confidence * 100).toFixed(1)}%)`);
    });
  }

  // Wait for warming to process
  await sleep(3000);

  // Validate prediction accuracy
  const accuracy = await optimizer.validatePredictionAccuracy(1);
  console.log(`   • Prediction accuracy: ${(accuracy.accuracy * 100).toFixed(1)}%`);
  console.log(`   • Total predictions: ${accuracy.totalPredictions}`);
  console.log(`   • Accurate predictions: ${accuracy.accuratePredictions}`);
}

/**
 * Display comprehensive system status and performance metrics
 */
async function showSystemStatus(optimizer: AnalyticsPerformanceOptimizer) {
  const performanceReport = optimizer.getPerformanceReport();
  const predictiveCachingStatus = optimizer.getPredictiveCachingStatus();

  console.log('Standard Cache Performance:');
  console.log(`   • Memory usage: ${performanceReport.cacheStats.memoryUsageMB.toFixed(2)} MB`);
  console.log(`   • Total entries: ${performanceReport.cacheStats.totalEntries}`);
  console.log(`   • Hit rates: ${performanceReport.cacheStats.hitRates.length} tracked queries`);

  if (predictiveCachingStatus.enabled && predictiveCachingStatus.status) {
    const status = predictiveCachingStatus.status;
    
    console.log('\nPredictive Cache Status:');
    console.log(`   • Patterns learned: ${status.patterns.totalPatterns}`);
    console.log(`   • Active patterns: ${status.patterns.activePatterns}`);
    console.log(`   • Average confidence: ${(status.patterns.averageConfidence * 100).toFixed(1)}%`);
    console.log(`   • Warming efficiency: ${(status.warming.efficiency * 100).toFixed(1)}%`);
    console.log(`   • Queue size: ${status.warming.queueSize}`);
    
    console.log('\nModel Performance:');
    Object.entries(status.models).forEach(([model, stats]: [string, any]) => {
      console.log(`   • ${model}: ${(stats.accuracy * 100).toFixed(1)}% accuracy (${stats.predictions} predictions)`);
    });

    console.log('\nRecent Activity:');
    console.log(`   • Requests per hour: ${status.recentActivity.requestsPerHour}`);
    console.log(`   • Total requests tracked: ${status.recentActivity.totalRequests}`);
    console.log(`   • Predictions generated: ${status.recentActivity.predictionsGenerated}`);
  }

  console.log('\nOptimization Recommendations:');
  performanceReport.recommendations.forEach((rec, index) => {
    console.log(`   ${index + 1}. ${rec}`);
  });
}

/**
 * Demonstrate runtime configuration changes
 */
async function demonstrateRuntimeConfiguration(optimizer: AnalyticsPerformanceOptimizer) {
  console.log('   • Current configuration: Moderate aggressiveness');
  
  // Switch to aggressive mode
  await optimizer.configurePredictiveCaching(true, {
    warmingStrategy: {
      aggressiveness: 'aggressive',
      maxWarmingOperationsPerMinute: 15,
      priorityWeighting: {
        frequency: 0.5,
        recency: 0.3,
        confidence: 0.15,
        userContext: 0.05
      }
    },
    resourceThresholds: {
      maxCpuUtilization: 80,
      maxMemoryUsageMB: 500,
      maxDiskIOPS: 1200
    }
  });
  
  console.log('   • Switched to aggressive mode');
  
  await sleep(1000);
  
  const newPredictions = await optimizer.triggerPredictiveCacheWarming();
  console.log(`   • Generated ${newPredictions.length} predictions in aggressive mode`);
  
  // Switch back to conservative mode
  await optimizer.configurePredictiveCaching(true, {
    warmingStrategy: {
      aggressiveness: 'conservative',
      maxWarmingOperationsPerMinute: 3,
      priorityWeighting: {
        frequency: 0.6,
        recency: 0.2,
        confidence: 0.15,
        userContext: 0.05
      }
    },
    resourceThresholds: {
      maxCpuUtilization: 40,
      maxMemoryUsageMB: 200,
      maxDiskIOPS: 400
    }
  });
  
  console.log('   • Switched to conservative mode');
  console.log('   • Configuration changes applied successfully');
}

/**
 * Example: Integrating predictive caching with analytics dashboard
 */
export async function integrateWithDashboard() {
  console.log('\n🎛️ Dashboard Integration Example');
  console.log('==================================\n');

  const databaseManager = new DatabaseManager({ databasePath: ':memory:' });
  await databaseManager.initialize();
  const analyticsEngine = new AnalyticsEngine(databaseManager);

  // Create optimizer with dashboard-optimized predictive caching
  const optimizer = new AnalyticsPerformanceOptimizer(
    databaseManager,
    analyticsEngine,
    {
      enablePredictiveCaching: true,
      predictiveCache: {
        enabled: true,
        learningEnabled: true,
        maxPatternHistory: 5000,
        minPatternFrequency: 2,
        predictionThreshold: 0.3, // Lower threshold for more predictions
        maxConcurrentPredictions: 15,
        warmingStrategy: {
          aggressiveness: 'moderate',
          maxWarmingOperationsPerMinute: 10,
          priorityWeighting: {
            frequency: 0.4,
            recency: 0.3,
            confidence: 0.2,
            userContext: 0.1
          }
        },
        models: {
          enableSequenceAnalysis: true,
          enableCollaborativeFiltering: false, // Disabled for single-user desktop app
          enableTemporalPatterns: true,
          enableContextualPredictions: true
        }
      }
    }
  );

  await optimizer.initializePredictiveCaching();

  // Simulate dashboard usage patterns
  const dashboardWorkflows = [
    // Daily review workflow
    ['overview', 'flow_analysis', 'productivity_summary'],
    // Deep dive workflow  
    ['search', 'detailed_analysis', 'knowledge_gaps', 'recommendations'],
    // Export workflow
    ['select_conversations', 'generate_summary', 'export_data']
  ];

  console.log('Simulating dashboard usage patterns...');
  for (let day = 0; day < 7; day++) {
    for (const workflow of dashboardWorkflows) {
      for (const step of workflow) {
        const cacheKey = `dashboard:${step}:${Date.now()}`;
        await simulateCacheRequest(optimizer, cacheKey, {
          workflow: workflow.join('->'),
          day,
          timeOfDay: 9 + Math.floor(Math.random() * 8)
        });
        await sleep(Math.random() * 200 + 50);
      }
      await sleep(Math.random() * 1000 + 500);
    }
  }

  const finalStatus = optimizer.getPredictiveCachingStatus();
  console.log('\nFinal Dashboard Integration Results:');
  
  if (finalStatus.status) {
    console.log(`   • Learned ${finalStatus.status.patterns.totalPatterns} workflow patterns`);
    console.log(`   • Achieved ${(finalStatus.status.warming.efficiency * 100).toFixed(1)}% warming efficiency`);
    console.log(`   • ${finalStatus.status.recentActivity.requestsPerHour} requests per hour simulated`);
  }
  
  console.log('   • Dashboard integration optimized for single-user desktop usage');
  console.log('   • Predictive caching ready for production deployment\n');
}

/**
 * Utility function for async delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run the complete demonstration
 */
export async function runPredictiveCachingDemo() {
  try {
    await demonstratePredictiveCaching();
    await integrateWithDashboard();
  } catch (error) {
    console.error('Demo failed:', error);
  }
}

// Export example configurations for different use cases
export const PREDICTIVE_CACHE_PRESETS = {
  // Conservative: Minimal resource usage, high accuracy threshold
  conservative: {
    ...DEFAULT_PREDICTIVE_CACHE_CONFIG,
    predictionThreshold: 0.7,
    warmingStrategy: {
      aggressiveness: 'conservative' as const,
      maxWarmingOperationsPerMinute: 2,
      priorityWeighting: {
        frequency: 0.6,
        recency: 0.2,
        confidence: 0.15,
        userContext: 0.05
      }
    },
    resourceThresholds: {
      maxCpuUtilization: 40,
      maxMemoryUsageMB: 150,
      maxDiskIOPS: 300
    }
  },

  // Balanced: Good performance with reasonable resource usage
  balanced: {
    ...DEFAULT_PREDICTIVE_CACHE_CONFIG,
    predictionThreshold: 0.4,
    warmingStrategy: {
      aggressiveness: 'moderate' as const,
      maxWarmingOperationsPerMinute: 6,
      priorityWeighting: {
        frequency: 0.35,
        recency: 0.25,
        confidence: 0.25,
        userContext: 0.15
      }
    },
    resourceThresholds: {
      maxCpuUtilization: 60,
      maxMemoryUsageMB: 300,
      maxDiskIOPS: 600
    }
  },

  // Performance: Maximum cache warming for best response times
  performance: {
    ...DEFAULT_PREDICTIVE_CACHE_CONFIG,
    predictionThreshold: 0.2,
    maxConcurrentPredictions: 20,
    warmingStrategy: {
      aggressiveness: 'aggressive' as const,
      maxWarmingOperationsPerMinute: 20,
      priorityWeighting: {
        frequency: 0.4,
        recency: 0.3,
        confidence: 0.2,
        userContext: 0.1
      }
    },
    resourceThresholds: {
      maxCpuUtilization: 85,
      maxMemoryUsageMB: 600,
      maxDiskIOPS: 1500
    }
  }
};

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPredictiveCachingDemo();
}