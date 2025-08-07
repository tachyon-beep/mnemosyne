/**
 * Analytics Performance Optimization Example
 * 
 * Demonstrates how to use the performance-optimized analytics system
 * with real-world usage patterns and best practices.
 */

import { DatabaseManager } from '../../storage/Database.js';
import { createOptimizedAnalyticsSystem, PerformanceUtils } from './index.js';
import { TimeRange } from '../repositories/AnalyticsRepository.js';

/**
 * Example: Setting up and using the optimized analytics system
 */
async function demonstrateOptimizedAnalytics() {
  console.log('🚀 Starting Analytics Performance Optimization Demo');
  
  try {
    // Initialize database manager
    const databaseManager = new DatabaseManager();
    await databaseManager.initialize();

    // Apply database performance optimizations
    console.log('📊 Applying database optimizations...');
    await PerformanceUtils.optimizeDatabase(databaseManager);

    // Create optimized analytics system with production-ready settings
    console.log('⚙️ Creating optimized analytics system...');
    const analyticsSystem = createOptimizedAnalyticsSystem(databaseManager, {
      // Performance settings
      enableAdvancedCaching: true,
      enableParallelProcessing: true,
      enableMemoryOptimization: true,
      maxMemoryUsageMB: 300, // Reduced for demo
      maxConcurrentAnalyses: 2, // Reduced for demo
      
      // Resource management
      enableResourceManager: true,
      dataRetentionDays: 30,
      maintenanceIntervalHours: 1, // More frequent for demo
      
      // Monitoring and alerting
      enablePerformanceMonitoring: true,
      enableAlerting: true,
      alertThresholds: {
        memoryUsageMB: 250,
        queryTimeMs: 2000,
        errorRate: 0.03
      }
    });

    // Set up alert handling
    console.log('🚨 Setting up alert monitoring...');
    analyticsSystem.resourceManager?.onAlert((alert) => {
      console.log(`📢 ALERT [${alert.severity}]: ${alert.message}`);
      if (alert.details) {
        console.log(`   Details: ${alert.details}`);
      }
    });

    // Start the system
    console.log('🏁 Starting analytics system...');
    await analyticsSystem.start();

    // Demonstrate various analytics operations
    await demonstrateAnalyticsOperations(analyticsSystem);

    // Run performance benchmark
    await runPerformanceBenchmark(analyticsSystem);

    // Show system status and metrics
    await showSystemMetrics(analyticsSystem);

    // Demonstrate resource management features
    await demonstrateResourceManagement(analyticsSystem);

    // Graceful shutdown
    console.log('🛑 Shutting down analytics system...');
    await analyticsSystem.shutdown();

  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

/**
 * Demonstrate various analytics operations
 */
async function demonstrateAnalyticsOperations(analyticsSystem: any) {
  console.log('\n📈 Demonstrating Analytics Operations');
  console.log('=====================================');

  try {
    // Generate optimized analytics report
    console.log('📊 Generating optimized analytics report...');
    const timeRange: TimeRange = {
      start: Date.now() - (7 * 24 * 60 * 60 * 1000), // Last 7 days
      end: Date.now()
    };

    const report = await analyticsSystem.engine.generateOptimizedReport(timeRange, 'summary');
    
    console.log('✅ Report generated successfully!');
    console.log(`   Execution time: ${report.performance.executionTimeMs.toFixed(2)}ms`);
    console.log(`   Cache hit rate: ${(report.performance.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`   Memory used: ${report.performance.memoryUsedMB.toFixed(2)}MB`);
    console.log(`   Optimizations applied: ${report.performance.optimizationsApplied.join(', ')}`);

    // Demonstrate streaming analysis for large datasets
    console.log('\n🌊 Testing streaming analysis...');
    const conversations = generateSampleConversations(50); // Small sample for demo
    
    const streamingResults = await analyticsSystem.engine.performStreamingAnalysis(
      conversations,
      ['flow', 'productivity']
    );
    
    console.log('✅ Streaming analysis completed!');
    console.log(`   Flow analyses: ${streamingResults.flow.length}`);
    console.log(`   Productivity analyses: ${streamingResults.productivity.length}`);
    console.log(`   Memory usage peaks: ${streamingResults.performance.memoryUsage.length} recorded`);

    // Demonstrate bulk processing with intelligent batching
    console.log('\n📦 Testing bulk processing...');
    const conversationIds = conversations.map(c => c.conversation.id);
    
    const bulkResults = await analyticsSystem.engine.bulkProcessAnalytics(conversationIds, {
      analysisTypes: ['flow', 'productivity'],
      priority: 'medium',
      maxProcessingTimeMs: 10000
    });
    
    console.log('✅ Bulk processing completed!');
    console.log(`   Processed: ${bulkResults.processed}`);
    console.log(`   Failed: ${bulkResults.failed}`);
    console.log(`   Skipped: ${bulkResults.skipped}`);
    console.log(`   Average processing time: ${bulkResults.averageProcessingTime.toFixed(2)}ms`);

  } catch (error) {
    console.error('❌ Analytics operations failed:', error);
  }
}

/**
 * Run performance benchmark
 */
async function runPerformanceBenchmark(analyticsSystem: any) {
  console.log('\n🏆 Running Performance Benchmark');
  console.log('==================================');

  try {
    console.log('⏱️ Running comprehensive benchmark (this may take a moment)...');
    const benchmarkResults = await analyticsSystem.runBenchmark();
    
    console.log('✅ Benchmark completed!');
    console.log(`   Average speedup: ${benchmarkResults.summary.averageSpeedup.toFixed(2)}x`);
    console.log(`   Average memory reduction: ${benchmarkResults.summary.averageMemoryReduction.toFixed(1)}%`);
    console.log(`   Total test time: ${(benchmarkResults.summary.totalTestTime / 1000).toFixed(2)}s`);
    
    console.log('\n📋 Recommendations:');
    benchmarkResults.summary.recommendedOptimizations.forEach((rec: string, index: number) => {
      console.log(`   ${index + 1}. ${rec}`);
    });

    // Show detailed results for interesting tests
    const interestingResults = benchmarkResults.results.filter((r: any) => 
      r.improvement.speedupFactor > 2 || r.improvement.memoryReduction > 20
    );

    if (interestingResults.length > 0) {
      console.log('\n🔍 Notable Performance Improvements:');
      interestingResults.forEach((result: any) => {
        console.log(`   ${result.testName}:`);
        console.log(`     Speedup: ${result.improvement.speedupFactor.toFixed(2)}x`);
        console.log(`     Memory reduction: ${result.improvement.memoryReduction.toFixed(1)}%`);
      });
    }

  } catch (error) {
    console.error('❌ Benchmark failed:', error);
  }
}

/**
 * Show system status and metrics
 */
async function showSystemMetrics(analyticsSystem: any) {
  console.log('\n📊 System Status and Metrics');
  console.log('==============================');

  try {
    // Get real-time performance metrics
    const realtimeMetrics = analyticsSystem.engine.getRealTimePerformanceMetrics();
    
    console.log('📈 Real-time Performance:');
    console.log(`   Memory Usage: ${realtimeMetrics.currentMemoryUsageMB.toFixed(2)} MB`);
    console.log(`   Average Query Time: ${realtimeMetrics.averageQueryTime.toFixed(2)} ms`);
    console.log(`   Cache Hit Rate: ${(realtimeMetrics.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`   Active Connections: ${realtimeMetrics.activeConnections}`);
    console.log(`   Error Rate: ${(realtimeMetrics.errorRate * 100).toFixed(2)}%`);

    if (realtimeMetrics.recommendations.length > 0) {
      console.log('\n💡 Current Recommendations:');
      realtimeMetrics.recommendations.forEach((rec: string, index: number) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

    // Get system status
    const systemStatus = await analyticsSystem.getSystemStatus();
    
    console.log('\n🖥️ System Status:');
    console.log(`   Engine Status: ${systemStatus.engine.status}`);
    console.log(`   Cache Hit Rate: ${(systemStatus.engine.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`   Average Response Time: ${systemStatus.engine.averageResponseTime.toFixed(2)} ms`);
    console.log(`   Memory Usage: ${systemStatus.resources.memoryUsageMB.toFixed(2)} MB`);
    console.log(`   Active Operations: ${systemStatus.resources.activeOperations}`);
    console.log(`   Total Queries: ${systemStatus.performance.totalQueries}`);

    // Get optimization recommendations
    const optimizationRecs = analyticsSystem.engine.generateOptimizationRecommendations();
    
    if (optimizationRecs.immediate.length > 0) {
      console.log('\n🚨 Immediate Actions Required:');
      optimizationRecs.immediate.forEach((rec: string, index: number) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

    if (optimizationRecs.shortTerm.length > 0) {
      console.log('\n📅 Short-term Improvements:');
      optimizationRecs.shortTerm.forEach((rec: string, index: number) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

  } catch (error) {
    console.error('❌ Failed to get system metrics:', error);
  }
}

/**
 * Demonstrate resource management features
 */
async function demonstrateResourceManagement(analyticsSystem: any) {
  console.log('\n🛠️ Resource Management Features');
  console.log('=================================');

  try {
    const resourceManager = analyticsSystem.resourceManager;
    if (!resourceManager) {
      console.log('⚠️ Resource manager not enabled');
      return;
    }

    // Get resource usage statistics
    const resourceStats = resourceManager.getResourceUsageStats();
    
    console.log('📊 Resource Usage:');
    console.log(`   Heap Used: ${(resourceStats.memory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Heap Total: ${(resourceStats.memory.heapTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   RSS: ${(resourceStats.memory.rss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Total Queries: ${resourceStats.database.totalQueries}`);
    console.log(`   Average Query Time: ${resourceStats.database.averageQueryTime.toFixed(2)} ms`);
    console.log(`   Cache Hit Rate: ${(resourceStats.performance.cacheHitRate * 100).toFixed(1)}%`);

    // Demonstrate memory cleanup
    console.log('\n🧹 Testing memory cleanup...');
    const beforeCleanup = process.memoryUsage().heapUsed;
    
    const cleanupResult = await resourceManager.forceMemoryCleanup();
    
    console.log('✅ Memory cleanup completed!');
    console.log(`   Before: ${cleanupResult.beforeMB.toFixed(2)} MB`);
    console.log(`   After: ${cleanupResult.afterMB.toFixed(2)} MB`);
    console.log(`   Freed: ${cleanupResult.freedMB.toFixed(2)} MB`);

    // Demonstrate operation throttling
    console.log('\n🚦 Testing operation throttling...');
    
    const operations = [];
    for (let i = 0; i < 3; i++) {
      operations.push(
        resourceManager.executeWithResourceManagement(
          async () => {
            // Simulate work
            await new Promise(resolve => setTimeout(resolve, 100));
            return `Operation ${i + 1} completed`;
          },
          `test_operation_${i + 1}`,
          'medium'
        )
      );
    }

    const results = await Promise.all(operations);
    console.log('✅ Throttled operations completed:');
    results.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result}`);
    });

    // Run database maintenance
    console.log('\n🔧 Running database maintenance...');
    await resourceManager.runDatabaseMaintenance();
    console.log('✅ Database maintenance completed');

  } catch (error) {
    console.error('❌ Resource management demo failed:', error);
  }
}

/**
 * Generate sample conversations for testing
 */
function generateSampleConversations(count: number) {
  const conversations = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const conversationId = `demo_conv_${i}`;
    const conversation = {
      id: conversationId,
      title: `Demo Conversation ${i + 1}`,
      createdAt: now - (Math.random() * 7 * 24 * 60 * 60 * 1000), // Within last week
      updatedAt: now - (Math.random() * 24 * 60 * 60 * 1000), // Within last day
      metadata: {}
    };

    const messages = [];
    const messageCount = 5 + Math.floor(Math.random() * 10); // 5-15 messages

    for (let j = 0; j < messageCount; j++) {
      messages.push({
        id: `demo_msg_${i}_${j}`,
        conversationId,
        role: j % 2 === 0 ? 'user' : 'assistant',
        content: generateSampleMessageContent(j, messageCount),
        createdAt: conversation.createdAt + (j * 60000), // 1 minute apart
        metadata: {}
      });
    }

    conversations.push({ conversation, messages });
  }

  return conversations;
}

/**
 * Generate sample message content
 */
function generateSampleMessageContent(index: number, total: number): string {
  const userMessages = [
    "How can I optimize database queries for better performance?",
    "What are the best practices for caching in web applications?",
    "Can you explain how to implement parallel processing?",
    "What's the difference between synchronous and asynchronous operations?",
    "How do I handle memory management in large applications?"
  ];

  const assistantMessages = [
    "To optimize database queries, you should focus on proper indexing, query structure, and avoiding N+1 problems...",
    "Caching strategies depend on your use case. Consider using multiple layers: browser cache, CDN, application cache, and database cache...",
    "Parallel processing can be implemented using worker threads, promises, or distributed computing patterns...",
    "Synchronous operations block execution until complete, while asynchronous operations allow other code to run concurrently...",
    "Memory management involves monitoring usage, implementing cleanup routines, and using efficient data structures..."
  ];

  if (index % 2 === 0) {
    return userMessages[index % userMessages.length];
  } else {
    return assistantMessages[Math.floor(index / 2) % assistantMessages.length];
  }
}

/**
 * Main execution
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateOptimizedAnalytics()
    .then(() => {
      console.log('\n🎉 Demo completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Demo failed:', error);
      process.exit(1);
    });
}

export { demonstrateOptimizedAnalytics };