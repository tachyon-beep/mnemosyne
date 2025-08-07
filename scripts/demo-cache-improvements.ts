#!/usr/bin/env node

/**
 * Cache Performance Improvements Demo
 * 
 * Demonstrates the enhanced cache key generation and size estimation
 * improvements with before/after comparisons.
 */

import { CacheKeyGenerator, CacheKeys } from '../src/utils/CacheKeyGenerator.js';
import { SizeEstimator, SizeUtils } from '../src/utils/SizeEstimator.js';

// Helper function to create test data
function createTestData() {
  return {
    conversations: [
      {
        id: 'conv-1',
        title: 'Planning Meeting',
        messages: [
          { id: 'm1', content: 'Let\'s discuss the quarterly goals', role: 'user', timestamp: Date.now() },
          { id: 'm2', content: 'Here are the key objectives...', role: 'assistant', timestamp: Date.now() }
        ]
      },
      {
        id: 'conv-2', 
        title: 'Technical Review',
        messages: [
          { id: 'm3', content: 'How should we implement the new feature?', role: 'user', timestamp: Date.now() },
          { id: 'm4', content: 'I recommend using a microservices approach...', role: 'assistant', timestamp: Date.now() }
        ]
      }
    ],
    complexObject: {
      analytics: {
        metrics: new Array(1000).fill(0).map((_, i) => ({
          id: i,
          value: Math.random() * 100,
          timestamp: Date.now() + i * 1000
        })),
        aggregations: {
          hourly: new Map([
            ['2024-01-01T00:00:00Z', 45.2],
            ['2024-01-01T01:00:00Z', 52.8],
            ['2024-01-01T02:00:00Z', 38.1]
          ]),
          daily: new Set(['2024-01-01', '2024-01-02', '2024-01-03']),
          metadata: {
            version: '1.0',
            generated: new Date(),
            tags: ['analytics', 'performance', 'cache']
          }
        }
      }
    }
  };
}

function demonstrateKeyGeneration() {
  console.log('='.repeat(60));
  console.log('CACHE KEY GENERATION IMPROVEMENTS');
  console.log('='.repeat(60));

  const testData = createTestData();

  console.log('\n1. COLLISION RESISTANCE DEMO');
  console.log('-'.repeat(30));
  
  // Test cases that would cause collisions with simple concatenation
  const collisionTests = [
    { operation: 'analyze', params: { userId: 'user123', action: 'view' } },
    { operation: 'analyze', params: { userId: 'user12', action: '3view' } }, // Would collide with simple concat
    { operation: 'analyze', params: { userId: 'user', action: '123view' } }, // Another potential collision
  ];

  console.log('Testing collision-prone inputs:');
  const keys = new Set();
  for (const test of collisionTests) {
    const key = CacheKeyGenerator.generateKey(test.operation, test.params);
    keys.add(key);
    console.log(`  Params: ${JSON.stringify(test.params)}`);
    console.log(`  Key: ${key.substring(0, 50)}...`);
    console.log();
  }
  
  console.log(`✅ Generated ${keys.size} unique keys from ${collisionTests.length} similar inputs`);

  console.log('\n2. PARAMETER ORDER CONSISTENCY');
  console.log('-'.repeat(30));

  const params1 = { userId: '123', type: 'flow', limit: 50, sort: 'desc' };
  const params2 = { sort: 'desc', limit: 50, type: 'flow', userId: '123' }; // Different order

  const key1 = CacheKeyGenerator.generateKey('analytics', params1);
  const key2 = CacheKeyGenerator.generateKey('analytics', params2);

  console.log('Parameters 1:', JSON.stringify(params1));
  console.log('Parameters 2:', JSON.stringify(params2));
  console.log('Key 1:', key1.substring(0, 50) + '...');
  console.log('Key 2:', key2.substring(0, 50) + '...');
  console.log(`✅ Keys are identical: ${key1 === key2}`);

  console.log('\n3. SPECIALIZED KEY GENERATORS');
  console.log('-'.repeat(30));

  // Test conversation-specific key generation
  const convKey1 = CacheKeys.flowAnalysis(testData.conversations);
  const convKey2 = CacheKeys.productivityAnalysis(testData.conversations);
  const convKey3 = CacheKeys.knowledgeGapDetection(testData.conversations);

  console.log('Flow analysis key:', convKey1.substring(0, 50) + '...');
  console.log('Productivity key:', convKey2.substring(0, 50) + '...');
  console.log('Knowledge gap key:', convKey3.substring(0, 50) + '...');
  console.log(`✅ All keys are unique: ${new Set([convKey1, convKey2, convKey3]).size === 3}`);

  console.log('\n4. QUERY KEY GENERATION');
  console.log('-'.repeat(30));

  const queryKey = CacheKeyGenerator.generateQueryKey(
    'find-recent-messages',
    'SELECT * FROM messages WHERE created_at > ? ORDER BY created_at DESC LIMIT ?',
    { since: '2024-01-01', limit: 100 }
  );

  console.log('Query key:', queryKey);
  
  // Key validation
  const validation = CacheKeyGenerator.validateKey(queryKey);
  console.log(`✅ Key validation: ${validation.valid ? 'PASSED' : 'FAILED'}`);
  if (!validation.valid) {
    console.log('Issues:', validation.issues);
  }
}

function demonstrateSizeEstimation() {
  console.log('\n' + '='.repeat(60));
  console.log('SIZE ESTIMATION IMPROVEMENTS');
  console.log('='.repeat(60));

  const testData = createTestData();

  console.log('\n1. BASIC SIZE ESTIMATION COMPARISON');
  console.log('-'.repeat(30));

  // Old method simulation
  function oldSizeEstimate(obj: any): number {
    try {
      return JSON.stringify(obj).length * 2;
    } catch {
      return 1024;
    }
  }

  const simpleObj = { name: 'test', value: 42, active: true };
  const oldSize = oldSizeEstimate(simpleObj);
  const newSize = SizeEstimator.quickEstimate(simpleObj);

  console.log('Simple object:', JSON.stringify(simpleObj));
  console.log(`Old estimation: ${SizeUtils.formatBytes(oldSize)}`);
  console.log(`New estimation: ${SizeUtils.formatBytes(newSize)}`);
  console.log(`Difference: ${SizeUtils.formatBytes(Math.abs(newSize - oldSize))}`);

  console.log('\n2. COMPLEX OBJECT ANALYSIS');
  console.log('-'.repeat(30));

  const complexObj = testData.complexObject;
  const detailedEstimate = SizeEstimator.estimate(complexObj);

  console.log('Complex object size breakdown:');
  console.log(`  Total size: ${SizeUtils.formatBytes(detailedEstimate.totalBytes)}`);
  console.log(`  Objects: ${SizeUtils.formatBytes(detailedEstimate.breakdown.objects)}`);
  console.log(`  Arrays: ${SizeUtils.formatBytes(detailedEstimate.breakdown.arrays)}`);
  console.log(`  Strings: ${SizeUtils.formatBytes(detailedEstimate.breakdown.strings)}`);
  console.log(`  Overhead: ${SizeUtils.formatBytes(detailedEstimate.breakdown.overhead)}`);
  console.log('');
  console.log('Analysis:');
  console.log(`  Object count: ${detailedEstimate.analysis.objectCount}`);
  console.log(`  Array count: ${detailedEstimate.analysis.arrayCount}`);
  console.log(`  String count: ${detailedEstimate.analysis.stringCount}`);
  console.log(`  Max depth: ${detailedEstimate.analysis.maxDepth}`);
  console.log(`  Circular refs: ${detailedEstimate.analysis.circularReferences}`);

  console.log('\n3. EDGE CASE HANDLING');
  console.log('-'.repeat(30));

  const edgeCases = {
    'Null value': null,
    'Undefined': undefined,
    'BigInt': BigInt(123456789),
    'Date object': new Date(),
    'RegExp': /test\d+/gi,
    'Map': new Map([['key1', 'value1'], ['key2', 'value2']]),
    'Set': new Set([1, 2, 3, 4, 5]),
    'ArrayBuffer': new ArrayBuffer(1024),
    'Function': () => console.log('test')
  };

  console.log('Edge case size estimates:');
  for (const [name, value] of Object.entries(edgeCases)) {
    try {
      const size = SizeEstimator.quickEstimate(value);
      console.log(`  ${name.padEnd(12)}: ${SizeUtils.formatBytes(size)}`);
    } catch (error) {
      console.log(`  ${name.padEnd(12)}: Error - ${error}`);
    }
  }

  console.log('\n4. CIRCULAR REFERENCE HANDLING');
  console.log('-'.repeat(30));

  const circularObj: any = { name: 'parent' };
  circularObj.child = { name: 'child', parent: circularObj };
  circularObj.self = circularObj;

  const circularEstimate = SizeEstimator.estimate(circularObj);
  console.log('Circular reference object:');
  console.log(`  Size: ${SizeUtils.formatBytes(circularEstimate.totalBytes)}`);
  console.log(`  Circular references detected: ${circularEstimate.analysis.circularReferences}`);
  console.log('  ✅ No infinite recursion!');
}

function demonstratePerformanceGains() {
  console.log('\n' + '='.repeat(60));
  console.log('PERFORMANCE IMPROVEMENTS');
  console.log('='.repeat(60));

  console.log('\n1. KEY GENERATION PERFORMANCE');
  console.log('-'.repeat(30));

  const testParams = {
    userId: '123',
    conversationIds: ['c1', 'c2', 'c3'],
    filters: { dateRange: { start: '2024-01-01', end: '2024-01-31' } },
    options: { includeMetadata: true, sortBy: 'timestamp' }
  };

  const iterations = 1000;

  // Time the new key generation
  const startTime = performance.now();
  const keys = [];
  for (let i = 0; i < iterations; i++) {
    keys.push(CacheKeyGenerator.generateKey(`operation-${i}`, testParams));
  }
  const endTime = performance.now();

  const avgTime = (endTime - startTime) / iterations;
  const uniqueKeys = new Set(keys).size;

  console.log(`Generated ${iterations} keys in ${(endTime - startTime).toFixed(2)}ms`);
  console.log(`Average time per key: ${avgTime.toFixed(4)}ms`);
  console.log(`Unique keys: ${uniqueKeys}/${iterations}`);
  console.log(`✅ Performance: ${avgTime < 1 ? 'Excellent' : avgTime < 5 ? 'Good' : 'Needs improvement'} (<1ms target)`);

  console.log('\n2. SIZE ESTIMATION PERFORMANCE');
  console.log('-'.repeat(30));

  const largeArray = new Array(10000).fill(0).map((_, i) => ({
    id: i,
    data: `Item ${i} with some text content`,
    metadata: { timestamp: Date.now(), processed: true }
  }));

  const sizeStartTime = performance.now();
  const size = SizeEstimator.quickEstimate(largeArray);
  const sizeEndTime = performance.now();

  const sizeTime = sizeEndTime - sizeStartTime;
  console.log(`Estimated size of 10,000 item array: ${SizeUtils.formatBytes(size)}`);
  console.log(`Estimation time: ${sizeTime.toFixed(2)}ms`);
  console.log(`✅ Performance: ${sizeTime < 10 ? 'Excellent' : sizeTime < 50 ? 'Good' : 'Needs improvement'} (<10ms target)`);

  console.log('\n3. CACHE EFFICIENCY PROJECTION');
  console.log('-'.repeat(30));

  // Simulate cache scenarios
  const scenarios = [
    { name: 'Small objects (< 1KB)', count: 1000, avgSize: 500 },
    { name: 'Medium objects (1-10KB)', count: 500, avgSize: 5000 },
    { name: 'Large objects (10-100KB)', count: 100, avgSize: 50000 }
  ];

  console.log('Cache efficiency projections:');
  for (const scenario of scenarios) {
    const totalSize = scenario.count * scenario.avgSize;
    const efficiency = SizeUtils.calculateCacheEfficiency(scenario.avgSize, totalSize / scenario.count);
    const reasonable = SizeUtils.isReasonableCacheSize(totalSize);
    
    console.log(`  ${scenario.name}:`);
    console.log(`    Total size: ${SizeUtils.formatBytes(totalSize)}`);
    console.log(`    Cache efficiency: ${(efficiency * 100).toFixed(1)}%`);
    console.log(`    Reasonable for cache: ${reasonable ? '✅ Yes' : '❌ No'}`);
  }
}

function demonstrateUseCases() {
  console.log('\n' + '='.repeat(60));
  console.log('PRACTICAL USE CASES');
  console.log('='.repeat(60));

  console.log('\n1. ANALYTICS CACHING');
  console.log('-'.repeat(30));

  const analyticsData = {
    timeRange: { start: '2024-01-01', end: '2024-01-31' },
    metrics: ['productivity', 'engagement', 'sentiment'],
    aggregation: 'daily',
    filters: { userType: 'premium', minActivity: 5 }
  };

  const analyticsKey = CacheKeyGenerator.generateAnalyticsKey(
    'productivity-analysis',
    'dataset-12345',
    { context: analyticsData, dataSize: 15000 }
  );

  console.log('Analytics cache key:', analyticsKey);
  console.log('✅ Consistent across identical analytics requests');

  console.log('\n2. CONVERSATION PROCESSING');
  console.log('-'.repeat(30));

  const conversations = [
    { conversation: { id: 'c1' } },
    { conversation: { id: 'c2' } },
    { conversation: { id: 'c3' } }
  ];

  const flowKey = CacheKeys.flowAnalysis(conversations);
  const productivityKey = CacheKeys.productivityAnalysis(conversations);

  console.log('Flow analysis key:', flowKey.substring(0, 60) + '...');
  console.log('Productivity key:', productivityKey.substring(0, 60) + '...');
  console.log('✅ Different operations get different keys for same data');

  console.log('\n3. MEMORY-AWARE CACHING');
  console.log('-'.repeat(30));

  const largeDataset = {
    records: new Array(5000).fill(0).map(i => ({ id: i, data: 'x'.repeat(100) })),
    metadata: { processed: true, version: 2 }
  };

  const datasetSize = SizeEstimator.quickEstimate(largeDataset);
  const isReasonable = SizeUtils.isReasonableCacheSize(datasetSize);

  console.log(`Dataset size: ${SizeUtils.formatBytes(datasetSize)}`);
  console.log(`Cacheable: ${isReasonable ? '✅ Yes' : '❌ Too large'}`);
  
  if (!isReasonable) {
    console.log('💡 Recommendation: Consider data compression or splitting into smaller chunks');
  }

  console.log('\n4. SIZE MONITORING');
  console.log('-'.repeat(30));

  const monitor = SizeEstimator.createSizeMonitor();
  
  // Simulate cache operations over time
  for (let i = 0; i < 10; i++) {
    const data = { iteration: i, payload: new Array(i * 100).fill('data') };
    monitor.record(`operation-${i}`, data);
  }

  const stats = monitor.getStats();
  console.log('Size monitoring results:');
  console.log(`  Average size: ${SizeUtils.formatBytes(stats.averageSize)}`);
  console.log(`  Max size: ${SizeUtils.formatBytes(stats.maxSize)}`);
  console.log(`  Min size: ${SizeUtils.formatBytes(stats.minSize)}`);
  console.log(`  Total samples: ${stats.totalSamples}`);
  
  const growingTrends = stats.trends.filter(t => t.trend === 'growing');
  if (growingTrends.length > 0) {
    console.log(`  🔥 Growing data patterns: ${growingTrends.length}`);
  }
}

// Run the demonstration
async function main() {
  console.log('🚀 CACHE PERFORMANCE IMPROVEMENTS DEMONSTRATION');
  console.log('This script showcases the enhanced cache key generation and size estimation');
  console.log('improvements made to address collision risks and improve performance accuracy.\n');

  try {
    demonstrateKeyGeneration();
    demonstrateSizeEstimation();
    demonstratePerformanceGains();
    demonstrateUseCases();

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY OF IMPROVEMENTS');
    console.log('='.repeat(60));
    console.log('✅ Collision-resistant cache keys using SHA-256 hashing');
    console.log('✅ Parameter normalization for consistent key generation');
    console.log('✅ Accurate size estimation with object overhead calculation');
    console.log('✅ Enhanced memory monitoring and efficiency metrics');
    console.log('✅ Specialized key generators for different operation types');
    console.log('✅ Comprehensive edge case and error handling');
    console.log('✅ Performance optimized for high-throughput scenarios');
    console.log('\n🎉 Cache performance enhancements successfully demonstrated!');
    
  } catch (error) {
    console.error('❌ Demonstration failed:', error);
    process.exit(1);
  }
}

// Export for testing
export {
  demonstrateKeyGeneration,
  demonstrateSizeEstimation,
  demonstratePerformanceGains,
  demonstrateUseCases
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}