#!/usr/bin/env tsx

/**
 * Embedding Performance Benchmark Script
 * 
 * This script benchmarks the embedding system performance under various conditions
 * and provides detailed metrics to help optimize the system.
 * 
 * Usage:
 *   tsx src/scripts/benchmark-embeddings.ts
 */

import { EmbeddingManager } from '../search/EmbeddingManager.js';
import { DatabaseManager } from '../storage/Database.js';
import { existsSync, mkdirSync } from 'fs';

interface BenchmarkResult {
  testName: string;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  throughput: number;
  memoryUsage: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    peak: number;
  };
  success: boolean;
  error?: string;
}

interface BenchmarkConfig {
  warmupCount: number;
  testIterations: number;
  batchSizes: number[];
  textLengths: number[];
  cacheDir: string;
}

const config: BenchmarkConfig = {
  warmupCount: 5,
  testIterations: 20,
  batchSizes: [1, 5, 10, 20, 50],
  textLengths: [10, 50, 100, 200, 500, 1000],
  cacheDir: './.benchmark-cache'
};

/**
 * Generate test text of specified length
 */
function generateTestText(length: number): string {
  const words = [
    'the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog',
    'artificial', 'intelligence', 'machine', 'learning', 'neural', 'network',
    'algorithm', 'data', 'science', 'technology', 'computer', 'programming',
    'software', 'development', 'engineering', 'innovation', 'digital',
    'automation', 'optimization', 'performance', 'efficiency', 'analysis'
  ];
  
  let text = '';
  while (text.length < length) {
    const word = words[Math.floor(Math.random() * words.length)];
    text += (text.length > 0 ? ' ' : '') + word;
  }
  
  return text.substring(0, length);
}

/**
 * Generate multiple test texts
 */
function generateTestTexts(count: number, avgLength: number = 100): string[] {
  return Array.from({ length: count }, () => 
    generateTestText(avgLength + Math.floor(Math.random() * 50) - 25)
  );
}

/**
 * Measure memory usage
 */
function measureMemory(): NodeJS.MemoryUsage {
  global.gc?.(); // Force garbage collection if available
  return process.memoryUsage();
}

/**
 * Format memory usage for display
 */
function formatMemory(memory: NodeJS.MemoryUsage): string {
  return `RSS: ${Math.round(memory.rss / 1024 / 1024)}MB, ` +
         `Heap: ${Math.round(memory.heapUsed / 1024 / 1024)}MB`;
}

/**
 * Run single embedding benchmark
 */
async function runSingleEmbeddingBenchmark(
  embeddingManager: EmbeddingManager,
  texts: string[]
): Promise<BenchmarkResult> {
  const memoryBefore = measureMemory();
  let peakMemory = memoryBefore.rss;
  const times: number[] = [];
  
  try {
    for (const text of texts) {
      const start = process.hrtime.bigint();
      await embeddingManager.generateEmbedding(text);
      const end = process.hrtime.bigint();
      
      const timeMs = Number(end - start) / 1_000_000;
      times.push(timeMs);
      
      // Track peak memory
      const currentMemory = measureMemory();
      peakMemory = Math.max(peakMemory, currentMemory.rss);
    }
    
    const memoryAfter = measureMemory();
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    
    return {
      testName: `Single Embedding (${texts.length} texts)`,
      totalTime,
      averageTime: totalTime / texts.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      throughput: texts.length / (totalTime / 1000),
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peak: peakMemory
      },
      success: true
    };
  } catch (error) {
    return {
      testName: `Single Embedding (${texts.length} texts)`,
      totalTime: 0,
      averageTime: 0,
      minTime: 0,
      maxTime: 0,
      throughput: 0,
      memoryUsage: {
        before: memoryBefore,
        after: measureMemory(),
        peak: peakMemory
      },
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Run batch embedding benchmark
 */
async function runBatchEmbeddingBenchmark(
  embeddingManager: EmbeddingManager,
  texts: string[]
): Promise<BenchmarkResult> {
  const memoryBefore = measureMemory();
  
  try {
    const start = process.hrtime.bigint();
    await embeddingManager.generateBatchEmbeddings(texts);
    const end = process.hrtime.bigint();
    
    const totalTimeMs = Number(end - start) / 1_000_000;
    const memoryAfter = measureMemory();
    
    return {
      testName: `Batch Embedding (${texts.length} texts)`,
      totalTime: totalTimeMs,
      averageTime: totalTimeMs / texts.length,
      minTime: totalTimeMs / texts.length,
      maxTime: totalTimeMs / texts.length,
      throughput: texts.length / (totalTimeMs / 1000),
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peak: memoryAfter.rss
      },
      success: true
    };
  } catch (error) {
    return {
      testName: `Batch Embedding (${texts.length} texts)`,
      totalTime: 0,
      averageTime: 0,
      minTime: 0,
      maxTime: 0,
      throughput: 0,
      memoryUsage: {
        before: memoryBefore,
        after: measureMemory(),
        peak: 0
      },
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test cache performance
 */
async function runCacheBenchmark(
  embeddingManager: EmbeddingManager
): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];
  const testTexts = generateTestTexts(20, 100);
  
  // First run - no cache
  embeddingManager.clearCache();
  const noCacheResult = await runSingleEmbeddingBenchmark(embeddingManager, testTexts);
  noCacheResult.testName = 'Cache Performance - No Cache';
  results.push(noCacheResult);
  
  // Second run - with cache
  const withCacheResult = await runSingleEmbeddingBenchmark(embeddingManager, testTexts);
  withCacheResult.testName = 'Cache Performance - With Cache';
  results.push(withCacheResult);
  
  return results;
}

/**
 * Test performance with different text lengths
 */
async function runTextLengthBenchmark(
  embeddingManager: EmbeddingManager
): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];
  
  for (const length of config.textLengths) {
    const texts = Array.from({ length: 10 }, () => generateTestText(length));
    embeddingManager.clearCache(); // Ensure no cache effects
    
    const result = await runSingleEmbeddingBenchmark(embeddingManager, texts);
    result.testName = `Text Length ${length} chars`;
    results.push(result);
  }
  
  return results;
}

/**
 * Display benchmark results
 */
function displayResults(results: BenchmarkResult[]): void {
  console.log('\n📊 BENCHMARK RESULTS');
  console.log('='.repeat(80));
  
  for (const result of results) {
    console.log(`\n🔬 ${result.testName}`);
    console.log('-'.repeat(50));
    
    if (result.success) {
      console.log(`✅ Success`);
      console.log(`⏱️  Total Time: ${result.totalTime.toFixed(2)}ms`);
      console.log(`📊 Average Time: ${result.averageTime.toFixed(2)}ms per text`);
      console.log(`⚡ Min Time: ${result.minTime.toFixed(2)}ms`);
      console.log(`🐌 Max Time: ${result.maxTime.toFixed(2)}ms`);
      console.log(`🚀 Throughput: ${result.throughput.toFixed(2)} texts/second`);
      console.log(`💾 Memory Before: ${formatMemory(result.memoryUsage.before)}`);
      console.log(`💾 Memory After: ${formatMemory(result.memoryUsage.after)}`);
      console.log(`💾 Peak Memory: ${Math.round(result.memoryUsage.peak / 1024 / 1024)}MB`);
      
      // Performance assessment
      if (result.averageTime <= 100) {
        console.log(`🏆 Performance: Excellent (≤100ms target)`);
      } else if (result.averageTime <= 200) {
        console.log(`✅ Performance: Good (≤200ms)`);
      } else if (result.averageTime <= 500) {
        console.log(`⚠️  Performance: Acceptable (≤500ms)`);
      } else {
        console.log(`❌ Performance: Poor (>500ms)`);
      }
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
  }
}

/**
 * Main benchmark function
 */
async function runBenchmarks(): Promise<void> {
  console.log('🚀 EMBEDDING PERFORMANCE BENCHMARK');
  console.log('🤖 Testing all-MiniLM-L6-v2 model performance\n');
  
  // Setup
  console.log('🔧 Setting up benchmark environment...');
  
  if (!existsSync(config.cacheDir)) {
    mkdirSync(config.cacheDir, { recursive: true });
  }
  
  const dbManager = new DatabaseManager({ databasePath: ':memory:' });
  await dbManager.initialize();
  
  const embeddingManager = new EmbeddingManager(dbManager, {
    cacheDir: config.cacheDir,
    performanceTarget: 100,
    enableCache: true
  });
  
  console.log('📥 Initializing embedding model...');
  await embeddingManager.initialize();
  
  // Display system info
  console.log('\n💻 System Information:');
  console.log(`   Node.js: ${process.version}`);
  console.log(`   Platform: ${process.platform} ${process.arch}`);
  console.log(`   Memory: ${formatMemory(measureMemory())}`);
  console.log(`   V8 Heap Limit: ${Math.round(require('v8').getHeapStatistics().heap_size_limit / 1024 / 1024)}MB`);
  
  const allResults: BenchmarkResult[] = [];
  
  try {
    // Warmup
    console.log('\n🔥 Warming up model...');
    const warmupTexts = generateTestTexts(config.warmupCount, 100);
    await embeddingManager.generateBatchEmbeddings(warmupTexts);
    console.log('✅ Warmup completed');
    
    // Basic performance test
    console.log('\n🏃 Running basic performance tests...');
    const basicTexts = generateTestTexts(config.testIterations, 100);
    
    const singleResult = await runSingleEmbeddingBenchmark(embeddingManager, basicTexts.slice(0, 10));
    const batchResult = await runBatchEmbeddingBenchmark(embeddingManager, basicTexts.slice(0, 10));
    
    allResults.push(singleResult, batchResult);
    
    // Cache performance test
    console.log('\n💾 Testing cache performance...');
    const cacheResults = await runCacheBenchmark(embeddingManager);
    allResults.push(...cacheResults);
    
    // Text length performance test
    console.log('\n📏 Testing performance with different text lengths...');
    const lengthResults = await runTextLengthBenchmark(embeddingManager);
    allResults.push(...lengthResults);
    
    // Batch size comparison
    console.log('\n📦 Testing different batch sizes...');
    for (const batchSize of config.batchSizes) {
      if (batchSize <= 20) { // Limit for reasonable test time
        const batchTexts = generateTestTexts(batchSize, 100);
        embeddingManager.clearCache();
        
        const result = await runBatchEmbeddingBenchmark(embeddingManager, batchTexts);
        result.testName = `Batch Size ${batchSize}`;
        allResults.push(result);
      }
    }
    
    // Memory stress test
    console.log('\n🧠 Running memory stress test...');
    const stressTexts = generateTestTexts(100, 200);
    const stressResult = await runBatchEmbeddingBenchmark(embeddingManager, stressTexts);
    stressResult.testName = 'Memory Stress Test (100 texts)';
    allResults.push(stressResult);
    
    // Display all results
    displayResults(allResults);
    
    // Summary
    console.log('\n🎯 PERFORMANCE SUMMARY');
    console.log('='.repeat(80));
    
    const successfulResults = allResults.filter(r => r.success);
    if (successfulResults.length > 0) {
      const avgPerformance = successfulResults.reduce((sum, r) => sum + r.averageTime, 0) / successfulResults.length;
      const avgThroughput = successfulResults.reduce((sum, r) => sum + r.throughput, 0) / successfulResults.length;
      
      console.log(`📊 Overall Average Time: ${avgPerformance.toFixed(2)}ms per text`);
      console.log(`🚀 Overall Average Throughput: ${avgThroughput.toFixed(2)} texts/second`);
      
      const fastestTest = successfulResults.reduce((min, r) => r.averageTime < min.averageTime ? r : min);
      const slowestTest = successfulResults.reduce((max, r) => r.averageTime > max.averageTime ? r : max);
      
      console.log(`⚡ Fastest: ${fastestTest.testName} (${fastestTest.averageTime.toFixed(2)}ms)`);
      console.log(`🐌 Slowest: ${slowestTest.testName} (${slowestTest.averageTime.toFixed(2)}ms)`);
    }
    
    const failedResults = allResults.filter(r => !r.success);
    if (failedResults.length > 0) {
      console.log(`❌ Failed Tests: ${failedResults.length}/${allResults.length}`);
      failedResults.forEach(r => console.log(`   - ${r.testName}: ${r.error}`));
    }
    
    console.log('\n🎉 Benchmark completed successfully!');
    
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
  } finally {
    // Cleanup
    embeddingManager.destroy();
    dbManager.close();
  }
}

// Handle CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmarks().catch((error) => {
    console.error('Unhandled benchmark error:', error);
    process.exit(1);
  });
}

export { runBenchmarks };