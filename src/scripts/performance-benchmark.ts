#!/usr/bin/env tsx

/**
 * Comprehensive Performance Benchmark Suite
 * 
 * This script runs comprehensive performance tests against the MCP Persistence System
 * to validate production readiness and identify optimization opportunities.
 */

import { DatabaseManager } from '../storage/Database.js';
import { EmbeddingManager } from '../search/EmbeddingManager.js';
import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';
import { MemoryManager } from '../utils/MemoryManager.js';
import { QueryOptimizer } from '../storage/QueryOptimizer.js';
import { ConnectionPool } from '../storage/ConnectionPool.js';
import { MessageRepository } from '../storage/repositories/MessageRepository.js';
import { ConversationRepository } from '../storage/repositories/ConversationRepository.js';
import { SearchEngine } from '../search/SearchEngine.js';
import { EnhancedSearchEngine } from '../search/EnhancedSearchEngine.js';
import { getProductionConfig, validateConfiguration } from '../config/ProductionConfig.js';
import { setupProductionMonitoring } from '../monitoring/index.js';

interface BenchmarkResult {
  testName: string;
  category: 'database' | 'search' | 'embedding' | 'memory' | 'concurrent';
  duration: number;
  throughput: number;
  successRate: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  memoryDelta: number;
  errors: string[];
  passed: boolean;
  target: number;
  details: Record<string, any>;
}

interface BenchmarkSuite {
  name: string;
  results: BenchmarkResult[];
  overallScore: number;
  totalDuration: number;
  summary: {
    passed: number;
    failed: number;
    warnings: number;
  };
  recommendations: string[];
}

class PerformanceBenchmarkSuite {
  private dbManager!: DatabaseManager;
  private connectionPool!: ConnectionPool;
  private embeddingManager!: EmbeddingManager;
  private performanceMonitor!: PerformanceMonitor;
  private memoryManager!: MemoryManager;
  private queryOptimizer!: QueryOptimizer;
  
  private messageRepo!: MessageRepository;
  private conversationRepo!: ConversationRepository;
  private searchEngine!: SearchEngine;
  private enhancedSearchEngine!: EnhancedSearchEngine;
  
  private config = getProductionConfig();
  private testData: any[] = [];
  private monitoring: any = null;

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Performance Benchmark Suite...\n');
    
    // Validate configuration
    const validation = validateConfiguration(this.config);
    if (validation.warnings.length > 0) {
      console.log('⚠️  Configuration Warnings:');
      validation.warnings.forEach(warning => console.log(`   ${warning}`));
      console.log();
    }

    // Initialize core components
    this.dbManager = new DatabaseManager({
      ...this.config.database,
      databasePath: ':memory:' // Use memory DB for benchmarking
    });
    await this.dbManager.initialize();

    this.memoryManager = new MemoryManager(this.config.memory);
    this.performanceMonitor = new PerformanceMonitor(this.dbManager, this.memoryManager);
    this.queryOptimizer = new QueryOptimizer(this.dbManager);
    
    this.connectionPool = new ConnectionPool({
      ...this.config.database,
      databasePath: ':memory:'
    });

    // Initialize repositories
    this.messageRepo = new MessageRepository(this.dbManager);
    this.conversationRepo = new ConversationRepository(this.dbManager);

    // Initialize search components
    this.embeddingManager = new EmbeddingManager(this.dbManager, this.config.search.embedding);
    await this.embeddingManager.initialize();
    
    this.searchEngine = new SearchEngine(this.messageRepo);
    this.enhancedSearchEngine = new EnhancedSearchEngine(
      this.dbManager,
      this.embeddingManager,
      this.searchEngine
    );

    // Start monitoring
    this.performanceMonitor.startMonitoring(5); // Every 5 seconds during benchmarking
    
    // Initialize production monitoring for regression detection
    try {
      this.monitoring = setupProductionMonitoring({
        database: this.dbManager,
        config: this.config,
        enableAlerting: false,
        alertingChannels: { console: true, file: false }
      });
      console.log('📊 Regression detection enabled');
    } catch (error) {
      console.log('⚠️  Regression detection setup failed, continuing without it');
    }
    
    // Create test data
    await this.generateTestData();
    
    console.log('✅ Initialization complete\n');
  }

  async runFullBenchmarkSuite(): Promise<BenchmarkSuite> {
    const startTime = Date.now();
    const results: BenchmarkResult[] = [];
    
    console.log('🏁 Starting Full Performance Benchmark Suite\n');
    console.log('=' .repeat(60));
    
    try {
      // Database Performance Tests
      console.log('\n📊 Database Performance Tests');
      console.log('-'.repeat(40));
      results.push(...await this.runDatabaseBenchmarks());
      
      // Search Performance Tests
      console.log('\n🔍 Search Performance Tests');
      console.log('-'.repeat(40));
      results.push(...await this.runSearchBenchmarks());
      
      // Embedding Performance Tests
      console.log('\n🧠 Embedding Performance Tests');
      console.log('-'.repeat(40));
      results.push(...await this.runEmbeddingBenchmarks());
      
      // Memory Management Tests
      console.log('\n💾 Memory Management Tests');
      console.log('-'.repeat(40));
      results.push(...await this.runMemoryBenchmarks());
      
      // Concurrency Tests
      console.log('\n⚡ Concurrency Tests');
      console.log('-'.repeat(40));
      results.push(...await this.runConcurrencyBenchmarks());
      
      // Stress Tests
      console.log('\n🔥 Stress Tests');
      console.log('-'.repeat(40));
      results.push(...await this.runStressTests());

    } catch (error) {
      console.error('❌ Benchmark suite failed:', error);
      throw error;
    }

    const totalDuration = Date.now() - startTime;
    const suite = this.compileBenchmarkResults(results, totalDuration);
    
    // Generate regression report if monitoring is available
    if (this.monitoring) {
      try {
        const regressionReport = await this.monitoring.getRegressionReport();
        if (regressionReport.summary && regressionReport.summary.regressedMetrics > 0) {
          console.log('\n🔍 Performance Regression Analysis');
          console.log('-'.repeat(40));
          console.log(`Metrics analyzed: ${regressionReport.summary.totalMetrics}`);
          console.log(`Regressions detected: ${regressionReport.summary.regressedMetrics}`);
          console.log(`Average confidence: ${(regressionReport.summary.averageConfidence * 100).toFixed(1)}%`);
          
          if (regressionReport.recommendations && regressionReport.recommendations.length > 0) {
            console.log('\nRegression recommendations:');
            regressionReport.recommendations.forEach((rec: string) => 
              console.log(`  - ${rec}`)
            );
          }
        } else {
          console.log('\n✅ No performance regressions detected');
        }
      } catch (error) {
        console.log('\n⚠️  Regression analysis failed');
      }
    }
    
    console.log('\n' + '='.repeat(60));
    this.printBenchmarkSummary(suite);
    
    return suite;
  }

  private async runDatabaseBenchmarks(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];
    
    // Simple SELECT benchmark
    results.push(await this.benchmarkOperation({
      name: 'Simple SELECT queries',
      category: 'database',
      target: 10, // Target: 10ms average
      operation: async () => {
        const conversations = await this.conversationRepo.findAll(10);
        return { count: conversations.data.length };
      },
      iterations: 1000
    }));

    // Complex JOIN benchmark
    results.push(await this.benchmarkOperation({
      name: 'Complex JOIN queries',
      category: 'database',
      target: 50, // Target: 50ms average
      operation: async () => {
        const results = await this.messageRepo.search({
          query: 'test query',
          limit: 20
        });
        return { count: results.data.length };
      },
      iterations: 500
    }));

    // Bulk INSERT benchmark
    results.push(await this.benchmarkOperation({
      name: 'Bulk INSERT operations',
      category: 'database',
      target: 100, // Target: 100ms for 100 inserts
      operation: async () => {
        const messages = Array.from({ length: 100 }, (_, i) => ({
          conversationId: this.testData[0].id,
          role: 'user' as const,
          content: `Bulk test message ${i}`
        }));
        const results = await this.messageRepo.batchCreate(messages);
        return { count: results.length };
      },
      iterations: 10
    }));

    // Transaction benchmark
    results.push(await this.benchmarkOperation({
      name: 'Transaction performance',
      category: 'database',
      target: 20, // Target: 20ms average
      operation: async () => {
        return this.dbManager.transaction(async (db) => {
          const result = db.prepare('INSERT INTO persistence_state (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
            .run(`bench_${Date.now()}`, 'test', Date.now());
          return { changes: result.changes };
        });
      },
      iterations: 500
    }));

    return results;
  }

  private async runSearchBenchmarks(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // FTS search benchmark
    results.push(await this.benchmarkOperation({
      name: 'FTS search queries',
      category: 'search',
      target: 100, // Target: 100ms average
      operation: async () => {
        const results = await this.messageRepo.search({
          query: 'performance optimization database',
          limit: 20
        });
        return { resultCount: results.data.length };
      },
      iterations: 200
    }));

    // Semantic search benchmark
    results.push(await this.benchmarkOperation({
      name: 'Semantic search queries',
      category: 'search',
      target: 500, // Target: 500ms average
      operation: async () => {
        const results = await this.enhancedSearchEngine.search({
          query: 'machine learning algorithms optimization',
          strategy: 'semantic',
          limit: 20
        });
        return { resultCount: results.results.length };
      },
      iterations: 50
    }));

    // Hybrid search benchmark
    results.push(await this.benchmarkOperation({
      name: 'Hybrid search queries',
      category: 'search',
      target: 750, // Target: 750ms average
      operation: async () => {
        const results = await this.enhancedSearchEngine.search({
          query: 'database performance SQL optimization',
          strategy: 'hybrid',
          limit: 20
        });
        return { resultCount: results.results.length };
      },
      iterations: 30
    }));

    return results;
  }

  private async runEmbeddingBenchmarks(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Single embedding generation
    results.push(await this.benchmarkOperation({
      name: 'Single embedding generation',
      category: 'embedding',
      target: this.config.search.embedding.performanceTarget,
      operation: async () => {
        const embedding = await this.embeddingManager.generateEmbedding(
          'This is a test sentence for embedding generation performance testing.'
        );
        return { dimensions: embedding.length };
      },
      iterations: 100
    }));

    // Batch embedding generation
    results.push(await this.benchmarkOperation({
      name: 'Batch embedding generation',
      category: 'embedding',
      target: this.config.search.embedding.performanceTarget * 0.8, // Should be more efficient
      operation: async () => {
        const texts = Array.from({ length: 10 }, (_, i) => 
          `Test sentence number ${i} for batch embedding generation performance evaluation.`
        );
        const embeddings = await this.embeddingManager.generateBatchEmbeddings(texts);
        return { batchSize: embeddings.length };
      },
      iterations: 20
    }));

    // Similarity search benchmark
    results.push(await this.benchmarkOperation({
      name: 'Vector similarity search',
      category: 'embedding',
      target: 200, // Target: 200ms average
      operation: async () => {
        const queryEmbedding = await this.embeddingManager.generateEmbedding('test query');
        const results = await this.embeddingManager.findSimilarMessages(queryEmbedding, {
          limit: 20,
          threshold: 0.7
        });
        return { resultCount: results.length };
      },
      iterations: 50
    }));

    return results;
  }

  private async runMemoryBenchmarks(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Memory allocation benchmark
    results.push(await this.benchmarkOperation({
      name: 'Large object allocation',
      category: 'memory',
      target: 50, // Target: 50ms average
      operation: async () => {
        const largeArray = new Array(100000).fill(0).map((_, i) => ({
          id: i,
          data: `test data ${i}`,
          embedding: new Array(384).fill(Math.random())
        }));
        
        // Simulate processing
        const processed = largeArray.filter(item => item.id % 2 === 0);
        
        // Cleanup
        largeArray.length = 0;
        return { processed: processed.length };
      },
      iterations: 20
    }));

    // Cache performance benchmark
    results.push(await this.benchmarkOperation({
      name: 'Cache operations',
      category: 'memory',
      target: 10, // Target: 10ms average
      operation: async () => {
        // Generate and cache embeddings
        const text = `Cache test ${Math.random()}`;
        const embedding1 = await this.embeddingManager.generateEmbedding(text);
        const embedding2 = await this.embeddingManager.generateEmbedding(text); // Should hit cache
        
        return { 
          cacheHit: embedding1.length === embedding2.length,
          dimensions: embedding1.length 
        };
      },
      iterations: 200
    }));

    return results;
  }

  private async runConcurrencyBenchmarks(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // Concurrent database operations
    results.push(await this.benchmarkConcurrentOperation({
      name: 'Concurrent database queries',
      category: 'concurrent',
      target: 100, // Target: 100ms average per operation
      concurrency: 10,
      operation: async (index) => {
        const conversations = await this.conversationRepo.findAll(5, index * 5);
        return { count: conversations.data.length };
      },
      totalOperations: 100
    }));

    // Concurrent search operations
    results.push(await this.benchmarkConcurrentOperation({
      name: 'Concurrent search queries',
      category: 'concurrent',
      target: 300, // Target: 300ms average per operation
      concurrency: 5,
      operation: async (index) => {
        const results = await this.messageRepo.search({
          query: `concurrent test query ${index}`,
          limit: 10
        });
        return { resultCount: results.data.length };
      },
      totalOperations: 50
    }));

    // Concurrent embedding generation
    results.push(await this.benchmarkConcurrentOperation({
      name: 'Concurrent embedding generation',
      category: 'concurrent',
      target: this.config.search.embedding.performanceTarget * 1.5, // Allow for some overhead
      concurrency: 3, // Limited concurrency for embedding
      operation: async (index) => {
        const embedding = await this.embeddingManager.generateEmbedding(
          `Concurrent embedding test ${index} with longer text for realistic testing.`
        );
        return { dimensions: embedding.length };
      },
      totalOperations: 30
    }));

    return results;
  }

  private async runStressTests(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    // High-volume message insertion
    results.push(await this.benchmarkOperation({
      name: 'High-volume message insertion',
      category: 'database',
      target: 5000, // Target: 5 seconds for 1000 messages
      operation: async () => {
        const messages = Array.from({ length: 1000 }, (_, i) => ({
          conversationId: this.testData[i % this.testData.length].id,
          role: 'user' as const,
          content: `Stress test message ${i} with substantial content that represents realistic message length and complexity for performance testing purposes. This ensures we test with realistic data sizes.`
        }));
        
        const results = await this.messageRepo.batchCreate(messages);
        return { inserted: results.length };
      },
      iterations: 5
    }));

    // Memory stress test
    results.push(await this.benchmarkOperation({
      name: 'Memory stress test',
      category: 'memory',
      target: 1000, // Target: 1 second
      operation: async () => {
        const memoryBefore = process.memoryUsage();
        
        // Create large data structures
        const data = Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          embedding: new Float32Array(384).map(() => Math.random()),
          content: `Large content block ${i} `.repeat(100)
        }));
        
        // Simulate processing
        const processed = data
          .filter(item => item.id % 3 === 0)
          .map(item => ({
            ...item,
            processed: true,
            hash: item.content.length
          }));
        
        const memoryAfter = process.memoryUsage();
        const memoryDelta = memoryAfter.heapUsed - memoryBefore.heapUsed;
        
        // Cleanup
        data.length = 0;
        processed.length = 0;
        
        return { 
          processed: processed.length,
          memoryDelta: memoryDelta 
        };
      },
      iterations: 10
    }));

    return results;
  }

  private async benchmarkOperation(config: {
    name: string;
    category: 'database' | 'search' | 'embedding' | 'memory';
    target: number;
    operation: () => Promise<any>;
    iterations: number;
  }): Promise<BenchmarkResult> {
    
    const times: number[] = [];
    const errors: string[] = [];
    let successCount = 0;
    
    const memoryBefore = process.memoryUsage();
    const startTime = Date.now();
    
    console.log(`  Running: ${config.name} (${config.iterations} iterations)`);
    
    for (let i = 0; i < config.iterations; i++) {
      try {
        const opStart = process.hrtime.bigint();
        await config.operation();
        const opEnd = process.hrtime.bigint();
        
        const duration = Number(opEnd - opStart) / 1_000_000; // Convert to ms
        times.push(duration);
        successCount++;
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(errorMsg);
      }
    }
    
    const totalDuration = Date.now() - startTime;
    const memoryAfter = process.memoryUsage();
    const memoryDelta = memoryAfter.heapUsed - memoryBefore.heapUsed;
    
    // Calculate statistics
    times.sort((a, b) => a - b);
    const averageLatency = times.reduce((sum, t) => sum + t, 0) / times.length;
    const p95Index = Math.floor(times.length * 0.95);
    const p99Index = Math.floor(times.length * 0.99);
    
    const result: BenchmarkResult = {
      testName: config.name,
      category: config.category,
      duration: totalDuration,
      throughput: (successCount / totalDuration) * 1000, // operations per second
      successRate: successCount / config.iterations,
      averageLatency: averageLatency || 0,
      p95Latency: times[p95Index] || 0,
      p99Latency: times[p99Index] || 0,
      memoryDelta,
      errors,
      passed: averageLatency <= config.target && errors.length === 0,
      target: config.target,
      details: {
        iterations: config.iterations,
        successCount,
        minLatency: times[0] || 0,
        maxLatency: times[times.length - 1] || 0
      }
    };
    
    const status = result.passed ? '✅' : '❌';
    const avgLatencyStr = result.averageLatency.toFixed(2);
    const targetStr = config.target.toFixed(0);
    
    console.log(`    ${status} Avg: ${avgLatencyStr}ms (target: ${targetStr}ms) | Success: ${(result.successRate * 100).toFixed(1)}%`);
    
    return result;
  }

  private async benchmarkConcurrentOperation(config: {
    name: string;
    category: 'concurrent';
    target: number;
    concurrency: number;
    operation: (index: number) => Promise<any>;
    totalOperations: number;
  }): Promise<BenchmarkResult> {
    
    const times: number[] = [];
    const errors: string[] = [];
    let successCount = 0;
    
    const memoryBefore = process.memoryUsage();
    const startTime = Date.now();
    
    console.log(`  Running: ${config.name} (${config.totalOperations} ops, ${config.concurrency} concurrent)`);
    
    // Run operations in batches with specified concurrency
    for (let batch = 0; batch < config.totalOperations; batch += config.concurrency) {
      const batchOperations = [];
      
      for (let i = 0; i < config.concurrency && batch + i < config.totalOperations; i++) {
        const operationIndex = batch + i;
        
        batchOperations.push(
          (async () => {
            try {
              const opStart = process.hrtime.bigint();
              await config.operation(operationIndex);
              const opEnd = process.hrtime.bigint();
              
              const duration = Number(opEnd - opStart) / 1_000_000;
              times.push(duration);
              successCount++;
              
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              errors.push(errorMsg);
            }
          })()
        );
      }
      
      await Promise.all(batchOperations);
    }
    
    const totalDuration = Date.now() - startTime;
    const memoryAfter = process.memoryUsage();
    const memoryDelta = memoryAfter.heapUsed - memoryBefore.heapUsed;
    
    // Calculate statistics
    times.sort((a, b) => a - b);
    const averageLatency = times.reduce((sum, t) => sum + t, 0) / times.length;
    const p95Index = Math.floor(times.length * 0.95);
    const p99Index = Math.floor(times.length * 0.99);
    
    const result: BenchmarkResult = {
      testName: config.name,
      category: config.category,
      duration: totalDuration,
      throughput: (successCount / totalDuration) * 1000,
      successRate: successCount / config.totalOperations,
      averageLatency: averageLatency || 0,
      p95Latency: times[p95Index] || 0,
      p99Latency: times[p99Index] || 0,
      memoryDelta,
      errors,
      passed: averageLatency <= config.target && errors.length === 0,
      target: config.target,
      details: {
        totalOperations: config.totalOperations,
        concurrency: config.concurrency,
        successCount,
        minLatency: times[0] || 0,
        maxLatency: times[times.length - 1] || 0
      }
    };
    
    const status = result.passed ? '✅' : '❌';
    const avgLatencyStr = result.averageLatency.toFixed(2);
    const targetStr = config.target.toFixed(0);
    const throughputStr = result.throughput.toFixed(1);
    
    console.log(`    ${status} Avg: ${avgLatencyStr}ms (target: ${targetStr}ms) | Throughput: ${throughputStr} ops/s`);
    
    return result;
  }

  private async generateTestData(): Promise<void> {
    console.log('📝 Generating test data...');
    
    // Create test conversations
    const conversations = await Promise.all(
      Array.from({ length: 50 }, async (_, i) => {
        const conversation = await this.conversationRepo.create({
          title: `Test Conversation ${i + 1}`,
          metadata: { 
            testData: true, 
            category: i % 5 === 0 ? 'important' : 'regular',
            priority: Math.floor(Math.random() * 3) + 1
          }
        });
        return conversation;
      })
    );
    
    this.testData = conversations;
    
    // Create test messages with varied content
    const messageContents = [
      'This is a simple test message for performance benchmarking.',
      'Machine learning and artificial intelligence are revolutionizing software development.',
      'Database optimization requires careful analysis of query patterns and index usage.',
      'Search algorithms can be optimized through caching and result preprocessing.',
      'Memory management is crucial for maintaining application performance under load.',
      'Concurrent processing introduces complexity but can significantly improve throughput.',
      'Performance monitoring helps identify bottlenecks before they impact users.',
      'Testing strategies should cover both functional and non-functional requirements.'
    ];
    
    for (const conversation of conversations) {
      // Add 10-20 messages per conversation
      const messageCount = 10 + Math.floor(Math.random() * 11);
      
      for (let i = 0; i < messageCount; i++) {
        const content = messageContents[i % messageContents.length] + 
          ` (Conversation ${conversation.id}, Message ${i + 1})`;
        
        await this.messageRepo.create({
          conversationId: conversation.id,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content,
          metadata: {
            testData: true,
            messageIndex: i,
            length: content.length
          }
        });
      }
    }
    
    console.log(`✅ Generated ${conversations.length} conversations with messages\n`);
  }

  private compileBenchmarkResults(results: BenchmarkResult[], totalDuration: number): BenchmarkSuite {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const warnings = results.filter(r => 
      !r.passed && r.averageLatency <= r.target * 1.5 // Close to target
    ).length;
    
    // Calculate overall score (0-100)
    const baseScore = (passed / results.length) * 100;
    const latencyPenalty = results.reduce((penalty, result) => {
      if (result.averageLatency > result.target) {
        const overage = (result.averageLatency / result.target) - 1;
        return penalty + Math.min(overage * 5, 20); // Max 20 points penalty per test
      }
      return penalty;
    }, 0);
    
    const overallScore = Math.max(0, baseScore - latencyPenalty / results.length);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(results);
    
    return {
      name: 'MCP Persistence System Performance Benchmark',
      results,
      overallScore,
      totalDuration,
      summary: { passed, failed, warnings },
      recommendations
    };
  }

  private generateRecommendations(results: BenchmarkResult[]): string[] {
    const recommendations: string[] = [];
    
    // Analyze database performance
    const dbResults = results.filter(r => r.category === 'database');
    const slowDbQueries = dbResults.filter(r => r.averageLatency > r.target);
    
    if (slowDbQueries.length > 0) {
      recommendations.push('Database queries are slower than target - consider query optimization and indexing');
    }
    
    // Analyze search performance
    const searchResults = results.filter(r => r.category === 'search');
    const slowSearches = searchResults.filter(r => r.averageLatency > r.target);
    
    if (slowSearches.length > 0) {
      recommendations.push('Search operations are slow - consider result caching and query optimization');
    }
    
    // Analyze embedding performance
    const embeddingResults = results.filter(r => r.category === 'embedding');
    const slowEmbeddings = embeddingResults.filter(r => r.averageLatency > r.target);
    
    if (slowEmbeddings.length > 0) {
      recommendations.push('Embedding generation is slow - consider model optimization or batch processing');
    }
    
    // Analyze memory usage
    const highMemoryTests = results.filter(r => r.memoryDelta > 50 * 1024 * 1024); // 50MB+
    if (highMemoryTests.length > 0) {
      recommendations.push('High memory usage detected - review memory management and caching strategies');
    }
    
    // Analyze concurrency
    const concurrentResults = results.filter(r => r.category === 'concurrent');
    const slowConcurrent = concurrentResults.filter(r => r.averageLatency > r.target * 2);
    
    if (slowConcurrent.length > 0) {
      recommendations.push('Concurrent operations show poor scaling - consider connection pooling and resource optimization');
    }
    
    // Overall recommendations
    const overallFailureRate = results.filter(r => !r.passed).length / results.length;
    if (overallFailureRate > 0.2) {
      recommendations.push('High failure rate detected - review system configuration and resource allocation');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('System performance is within acceptable parameters');
    }
    
    return recommendations;
  }

  private printBenchmarkSummary(suite: BenchmarkSuite): void {
    console.log(`\n🏆 Benchmark Results: ${suite.name}`);
    console.log(`⏱️  Total Duration: ${(suite.totalDuration / 1000).toFixed(2)}s`);
    console.log(`📊 Overall Score: ${suite.overallScore.toFixed(1)}/100`);
    console.log(`✅ Passed: ${suite.summary.passed}`);
    console.log(`❌ Failed: ${suite.summary.failed}`);
    console.log(`⚠️  Warnings: ${suite.summary.warnings}`);
    
    if (suite.summary.failed > 0) {
      console.log('\n❌ Failed Tests:');
      suite.results
        .filter(r => !r.passed)
        .forEach(result => {
          console.log(`   ${result.testName}: ${result.averageLatency.toFixed(2)}ms (target: ${result.target}ms)`);
          if (result.errors.length > 0) {
            console.log(`     Errors: ${result.errors[0]}`);
          }
        });
    }
    
    if (suite.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      suite.recommendations.forEach(rec => console.log(`   - ${rec}`));
    }
    
    // Performance grade
    let grade = 'F';
    if (suite.overallScore >= 90) grade = 'A';
    else if (suite.overallScore >= 80) grade = 'B';
    else if (suite.overallScore >= 70) grade = 'C';
    else if (suite.overallScore >= 60) grade = 'D';
    
    console.log(`\n🎯 Performance Grade: ${grade}`);
    
    if (grade === 'A') {
      console.log('🚀 Excellent! System is production-ready with optimal performance.');
    } else if (grade === 'B') {
      console.log('👍 Good performance. Minor optimizations recommended.');
    } else if (grade === 'C') {
      console.log('⚠️  Acceptable performance. Consider optimizations before high-load deployment.');
    } else {
      console.log('🔧 Performance issues detected. Optimization required before production deployment.');
    }
  }

  async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up...');
    
    this.performanceMonitor.stopMonitoring();
    
    if (this.monitoring) {
      try {
        await this.monitoring.stopMonitoring();
      } catch (error) {
        console.log('Warning: Error stopping monitoring system');
      }
    }
    
    if (this.embeddingManager) {
      this.embeddingManager.destroy();
    }
    
    if (this.connectionPool) {
      await this.connectionPool.shutdown();
    }
    
    if (this.dbManager) {
      this.dbManager.close();
    }
    
    console.log('✅ Cleanup complete');
  }
}

// Main execution
async function main() {
  const suite = new PerformanceBenchmarkSuite();
  
  try {
    await suite.initialize();
    const results = await suite.runFullBenchmarkSuite();
    
    // Export results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `benchmark-results-${timestamp}.json`;
    
    const fs = await import('fs/promises');
    await fs.writeFile(filename, JSON.stringify(results, null, 2));
    
    console.log(`\n📄 Results exported to: ${filename}`);
    
  } catch (error) {
    console.error('💥 Benchmark failed:', error);
    process.exit(1);
  } finally {
    await suite.cleanup();
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}