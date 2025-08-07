/**
 * Analytics Performance Benchmark
 * 
 * Comprehensive benchmarking suite for analytics performance optimization:
 * - Query performance benchmarks
 * - Algorithm efficiency tests
 * - Memory usage profiling
 * - Concurrency performance tests
 * - Cache effectiveness analysis
 * - Regression testing
 */

import { DatabaseManager } from '../../storage/Database.js';
import { AnalyticsEngine } from '../services/AnalyticsEngine.js';
import { OptimizedAnalyticsEngine } from './OptimizedAnalyticsEngine.js';
import { ConversationFlowAnalyzer } from '../analyzers/ConversationFlowAnalyzer.js';
import { ProductivityAnalyzer } from '../analyzers/ProductivityAnalyzer.js';
import { KnowledgeGapDetector } from '../analyzers/KnowledgeGapDetector.js';
import { DecisionTracker } from '../analyzers/DecisionTracker.js';
import { Message, Conversation } from '../../types/interfaces.js';
import { TimeRange } from '../repositories/AnalyticsRepository.js';

export interface BenchmarkResult {
  testName: string;
  baselinePerformance: PerformanceMetric;
  optimizedPerformance: PerformanceMetric;
  improvement: {
    speedupFactor: number;
    memoryReduction: number;
    cacheHitRate: number;
  };
  details: {
    iterations: number;
    datasetSize: number;
    testDuration: number;
    errors: number;
  };
}

export interface PerformanceMetric {
  executionTime: {
    min: number;
    max: number;
    average: number;
    median: number;
    p95: number;
  };
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
  };
  throughput: {
    operationsPerSecond: number;
    itemsPerSecond: number;
  };
  cacheStats?: {
    hitRate: number;
    missRate: number;
    totalRequests: number;
  };
}

export interface BenchmarkConfig {
  iterations: number;
  warmupIterations: number;
  datasetSizes: number[];
  concurrencyLevels: number[];
  enableMemoryProfiling: boolean;
  enableDetailedLogging: boolean;
  timeoutMs: number;
}

/**
 * Synthetic data generator for performance testing
 */
class SyntheticDataGenerator {
  private messageIdCounter = 0;
  private conversationIdCounter = 0;

  generateConversations(count: number, messagesPerConversation: number = 10): Array<{
    conversation: Conversation;
    messages: Message[];
  }> {
    const conversations: Array<{ conversation: Conversation; messages: Message[] }> = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const conversationId = `conv_${this.conversationIdCounter++}`;
      const conversationStart = now - (Math.random() * 30 * 24 * 60 * 60 * 1000); // Last 30 days

      const conversation: Conversation = {
        id: conversationId,
        title: `Test Conversation ${i + 1}`,
        createdAt: conversationStart,
        updatedAt: conversationStart + (messagesPerConversation * 60000), // 1 min per message
        metadata: {}
      };

      const messages: Message[] = [];
      for (let j = 0; j < messagesPerConversation; j++) {
        const messageId = `msg_${this.messageIdCounter++}`;
        const messageTime = conversationStart + (j * 60000);

        messages.push({
          id: messageId,
          conversationId,
          role: j % 2 === 0 ? 'user' : 'assistant',
          content: this.generateMessageContent(j, messagesPerConversation),
          createdAt: messageTime,
          metadata: {}
        });
      }

      conversations.push({ conversation, messages });
    }

    return conversations;
  }

  private generateMessageContent(index: number, total: number): string {
    const contentTemplates = [
      // User messages
      "How can I implement a machine learning algorithm for text classification?",
      "What are the best practices for database optimization?",
      "Can you explain the concept of microservices architecture?",
      "I'm having trouble with asynchronous programming in JavaScript.",
      "What's the difference between SQL and NoSQL databases?",
      
      // Assistant responses
      "To implement text classification, you'll need to consider several approaches including naive Bayes, SVM, and neural networks...",
      "Database optimization involves indexing strategies, query optimization, and proper schema design...",
      "Microservices architecture is a design pattern where applications are built as a collection of loosely coupled services...",
      "Asynchronous programming in JavaScript can be handled using callbacks, promises, and async/await patterns...",
      "The main differences between SQL and NoSQL databases lie in their data models, scalability, and use cases..."
    ];

    const template = contentTemplates[index % contentTemplates.length];
    
    // Add some variety in length and complexity
    const complexity = Math.floor(Math.random() * 3);
    switch (complexity) {
      case 0: return template;
      case 1: return template + " Here are some additional details to consider: " + template.substring(0, 100);
      case 2: return template + " Let me provide a comprehensive explanation with examples and code snippets: " + template.repeat(2);
      default: return template;
    }
  }
}

/**
 * Main benchmarking suite
 */
export class AnalyticsPerformanceBenchmark {
  private dataGenerator = new SyntheticDataGenerator();
  private baselineEngine: AnalyticsEngine;
  private optimizedEngine: OptimizedAnalyticsEngine;

  constructor(private databaseManager: DatabaseManager) {
    this.baselineEngine = new AnalyticsEngine(databaseManager);
    this.optimizedEngine = new OptimizedAnalyticsEngine(databaseManager, {
      enableAdvancedCaching: true,
      enableParallelProcessing: true,
      enableMemoryOptimization: true,
      maxMemoryUsageMB: 500,
      maxConcurrentAnalyses: 4
    });
  }

  /**
   * Run comprehensive benchmark suite
   */
  async runComprehensiveBenchmark(config: Partial<BenchmarkConfig> = {}): Promise<{
    results: BenchmarkResult[];
    summary: {
      averageSpeedup: number;
      averageMemoryReduction: number;
      totalTestTime: number;
      recommendedOptimizations: string[];
    };
  }> {
    const benchmarkConfig: BenchmarkConfig = {
      iterations: 10,
      warmupIterations: 3,
      datasetSizes: [10, 50, 100, 500],
      concurrencyLevels: [1, 2, 4, 8],
      enableMemoryProfiling: true,
      enableDetailedLogging: false,
      timeoutMs: 300000, // 5 minutes
      ...config
    };

    console.log('Starting comprehensive analytics performance benchmark...');
    const overallStartTime = performance.now();

    const results: BenchmarkResult[] = [];

    // Test 1: Flow Analysis Performance
    console.log('Running flow analysis benchmarks...');
    for (const size of benchmarkConfig.datasetSizes) {
      const result = await this.benchmarkFlowAnalysis(size, benchmarkConfig);
      results.push(result);
    }

    // Test 2: Productivity Analysis Performance
    console.log('Running productivity analysis benchmarks...');
    for (const size of benchmarkConfig.datasetSizes) {
      const result = await this.benchmarkProductivityAnalysis(size, benchmarkConfig);
      results.push(result);
    }

    // Test 3: Knowledge Gap Detection Performance
    console.log('Running knowledge gap detection benchmarks...');
    for (const size of benchmarkConfig.datasetSizes) {
      const result = await this.benchmarkKnowledgeGapDetection(size, benchmarkConfig);
      results.push(result);
    }

    // Test 4: Decision Tracking Performance
    console.log('Running decision tracking benchmarks...');
    for (const size of benchmarkConfig.datasetSizes) {
      const result = await this.benchmarkDecisionTracking(size, benchmarkConfig);
      results.push(result);
    }

    // Test 5: Report Generation Performance
    console.log('Running report generation benchmarks...');
    for (const size of benchmarkConfig.datasetSizes) {
      const result = await this.benchmarkReportGeneration(size, benchmarkConfig);
      results.push(result);
    }

    // Test 6: Concurrent Processing Performance
    console.log('Running concurrency benchmarks...');
    for (const concurrency of benchmarkConfig.concurrencyLevels) {
      const result = await this.benchmarkConcurrentProcessing(100, concurrency, benchmarkConfig);
      results.push(result);
    }

    // Test 7: Memory Usage Under Load
    console.log('Running memory usage benchmarks...');
    const memoryResult = await this.benchmarkMemoryUsage(1000, benchmarkConfig);
    results.push(memoryResult);

    // Test 8: Cache Performance
    console.log('Running cache performance benchmarks...');
    const cacheResult = await this.benchmarkCachePerformance(benchmarkConfig);
    results.push(cacheResult);

    const totalTestTime = performance.now() - overallStartTime;

    // Calculate summary statistics
    const summary = this.calculateBenchmarkSummary(results, totalTestTime);

    console.log(`Benchmark completed in ${(totalTestTime / 1000).toFixed(2)} seconds`);
    
    return { results, summary };
  }

  /**
   * Benchmark flow analysis performance
   */
  private async benchmarkFlowAnalysis(
    datasetSize: number, 
    config: BenchmarkConfig
  ): Promise<BenchmarkResult> {
    const conversations = this.dataGenerator.generateConversations(datasetSize, 15);
    const flowAnalyzer = new ConversationFlowAnalyzer();

    // Baseline performance
    const baselineMetrics = await this.measurePerformance(
      `Flow Analysis (${datasetSize} conversations)`,
      async () => {
        const results = [];
        for (const { conversation, messages } of conversations) {
          const result = await flowAnalyzer.analyzeFlow(conversation, messages);
          results.push(result);
        }
        return results;
      },
      config.iterations,
      config.warmupIterations
    );

    // Optimized performance
    const optimizedMetrics = await this.measurePerformance(
      `Optimized Flow Analysis (${datasetSize} conversations)`,
      async () => {
        return await this.optimizedEngine.performStreamingAnalysis(
          conversations,
          ['flow']
        );
      },
      config.iterations,
      config.warmupIterations
    );

    return this.createBenchmarkResult(
      `Flow Analysis - ${datasetSize} conversations`,
      baselineMetrics,
      optimizedMetrics,
      datasetSize,
      config.iterations
    );
  }

  /**
   * Benchmark productivity analysis performance
   */
  private async benchmarkProductivityAnalysis(
    datasetSize: number,
    config: BenchmarkConfig
  ): Promise<BenchmarkResult> {
    const conversations = this.dataGenerator.generateConversations(datasetSize, 20);
    const productivityAnalyzer = new ProductivityAnalyzer();

    const baselineMetrics = await this.measurePerformance(
      `Productivity Analysis (${datasetSize} conversations)`,
      async () => {
        const results = [];
        for (const { conversation, messages } of conversations) {
          const result = await productivityAnalyzer.analyzeConversationProductivity(
            conversation, messages
          );
          results.push(result);
        }
        return results;
      },
      config.iterations,
      config.warmupIterations
    );

    const optimizedMetrics = await this.measurePerformance(
      `Optimized Productivity Analysis (${datasetSize} conversations)`,
      async () => {
        return await this.optimizedEngine.performStreamingAnalysis(
          conversations,
          ['productivity']
        );
      },
      config.iterations,
      config.warmupIterations
    );

    return this.createBenchmarkResult(
      `Productivity Analysis - ${datasetSize} conversations`,
      baselineMetrics,
      optimizedMetrics,
      datasetSize,
      config.iterations
    );
  }

  /**
   * Benchmark knowledge gap detection performance
   */
  private async benchmarkKnowledgeGapDetection(
    datasetSize: number,
    config: BenchmarkConfig
  ): Promise<BenchmarkResult> {
    const conversations = this.dataGenerator.generateConversations(datasetSize, 25);
    const knowledgeGapDetector = new KnowledgeGapDetector();

    const baselineMetrics = await this.measurePerformance(
      `Knowledge Gap Detection (${datasetSize} conversations)`,
      async () => {
        return await knowledgeGapDetector.detectGaps(conversations);
      },
      Math.min(config.iterations, 5), // Reduce iterations for expensive operations
      1
    );

    const optimizedMetrics = await this.measurePerformance(
      `Optimized Knowledge Gap Detection (${datasetSize} conversations)`,
      async () => {
        return await this.optimizedEngine.performStreamingAnalysis(
          conversations,
          ['knowledge-gaps']
        );
      },
      Math.min(config.iterations, 5),
      1
    );

    return this.createBenchmarkResult(
      `Knowledge Gap Detection - ${datasetSize} conversations`,
      baselineMetrics,
      optimizedMetrics,
      datasetSize,
      Math.min(config.iterations, 5)
    );
  }

  /**
   * Benchmark decision tracking performance
   */
  private async benchmarkDecisionTracking(
    datasetSize: number,
    config: BenchmarkConfig
  ): Promise<BenchmarkResult> {
    const conversations = this.dataGenerator.generateConversations(datasetSize, 18);
    const decisionTracker = new DecisionTracker();

    const baselineMetrics = await this.measurePerformance(
      `Decision Tracking (${datasetSize} conversations)`,
      async () => {
        const results = [];
        for (const { conversation, messages } of conversations) {
          const decisions = await decisionTracker.trackDecisions(conversation, messages);
          results.push(...decisions);
        }
        return results;
      },
      config.iterations,
      config.warmupIterations
    );

    const optimizedMetrics = await this.measurePerformance(
      `Optimized Decision Tracking (${datasetSize} conversations)`,
      async () => {
        return await this.optimizedEngine.performStreamingAnalysis(
          conversations,
          ['decisions']
        );
      },
      config.iterations,
      config.warmupIterations
    );

    return this.createBenchmarkResult(
      `Decision Tracking - ${datasetSize} conversations`,
      baselineMetrics,
      optimizedMetrics,
      datasetSize,
      config.iterations
    );
  }

  /**
   * Benchmark report generation performance
   */
  private async benchmarkReportGeneration(
    datasetSize: number,
    config: BenchmarkConfig
  ): Promise<BenchmarkResult> {
    const timeRange: TimeRange = {
      start: Date.now() - (30 * 24 * 60 * 60 * 1000),
      end: Date.now()
    };

    const baselineMetrics = await this.measurePerformance(
      `Report Generation (${datasetSize} conversations context)`,
      async () => {
        return await this.baselineEngine.generateReport(timeRange, 'summary');
      },
      Math.min(config.iterations, 3), // Report generation is expensive
      1
    );

    const optimizedMetrics = await this.measurePerformance(
      `Optimized Report Generation (${datasetSize} conversations context)`,
      async () => {
        return await this.optimizedEngine.generateOptimizedReport(timeRange, 'summary');
      },
      Math.min(config.iterations, 3),
      1
    );

    return this.createBenchmarkResult(
      `Report Generation - ${datasetSize} conversations context`,
      baselineMetrics,
      optimizedMetrics,
      datasetSize,
      Math.min(config.iterations, 3)
    );
  }

  /**
   * Benchmark concurrent processing performance
   */
  private async benchmarkConcurrentProcessing(
    datasetSize: number,
    concurrencyLevel: number,
    config: BenchmarkConfig
  ): Promise<BenchmarkResult> {
    const conversations = this.dataGenerator.generateConversations(datasetSize, 12);
    
    // Split data for concurrent processing
    const chunks = this.chunkArray(conversations, Math.ceil(datasetSize / concurrencyLevel));

    const baselineMetrics = await this.measurePerformance(
      `Concurrent Processing (${concurrencyLevel} workers, ${datasetSize} items)`,
      async () => {
        // Sequential processing (baseline)
        const results = [];
        for (const chunk of chunks) {
          for (const item of chunk) {
            const flowResult = await new ConversationFlowAnalyzer()
              .analyzeFlow(item.conversation, item.messages);
            results.push(flowResult);
          }
        }
        return results;
      },
      Math.min(config.iterations, 3),
      1
    );

    const optimizedMetrics = await this.measurePerformance(
      `Optimized Concurrent Processing (${concurrencyLevel} workers, ${datasetSize} items)`,
      async () => {
        // Parallel processing
        const promises = chunks.map(chunk => 
          this.optimizedEngine.performStreamingAnalysis(chunk, ['flow'])
        );
        const results = await Promise.all(promises);
        return results.flat();
      },
      Math.min(config.iterations, 3),
      1
    );

    return this.createBenchmarkResult(
      `Concurrent Processing - ${concurrencyLevel} workers`,
      baselineMetrics,
      optimizedMetrics,
      datasetSize,
      Math.min(config.iterations, 3)
    );
  }

  /**
   * Benchmark memory usage under load
   */
  private async benchmarkMemoryUsage(
    datasetSize: number,
    config: BenchmarkConfig
  ): Promise<BenchmarkResult> {
    const conversations = this.dataGenerator.generateConversations(datasetSize, 50);

    const baselineMetrics = await this.measurePerformance(
      `Memory Usage Under Load (${datasetSize} large conversations)`,
      async () => {
        const results = [];
        for (const { conversation, messages } of conversations) {
          // Simulate memory-intensive analysis
          const flowResult = await new ConversationFlowAnalyzer()
            .analyzeFlow(conversation, messages);
          const productivityResult = await new ProductivityAnalyzer()
            .analyzeConversationProductivity(conversation, messages);
          results.push({ flow: flowResult, productivity: productivityResult });
          
          // Don't clean up immediately to test memory pressure
        }
        return results;
      },
      3, // Reduced iterations for memory test
      1
    );

    const optimizedMetrics = await this.measurePerformance(
      `Optimized Memory Usage Under Load (${datasetSize} large conversations)`,
      async () => {
        return await this.optimizedEngine.performStreamingAnalysis(
          conversations,
          ['flow', 'productivity']
        );
      },
      3,
      1
    );

    return this.createBenchmarkResult(
      `Memory Usage Under Load - ${datasetSize} conversations`,
      baselineMetrics,
      optimizedMetrics,
      datasetSize,
      3
    );
  }

  /**
   * Benchmark cache performance
   */
  private async benchmarkCachePerformance(config: BenchmarkConfig): Promise<BenchmarkResult> {
    const timeRange: TimeRange = {
      start: Date.now() - (7 * 24 * 60 * 60 * 1000),
      end: Date.now()
    };

    // First run to populate cache
    await this.optimizedEngine.generateOptimizedReport(timeRange);

    const baselineMetrics = await this.measurePerformance(
      'Cache Performance (no caching)',
      async () => {
        return await this.baselineEngine.generateReport(timeRange, 'summary');
      },
      5,
      1
    );

    const optimizedMetrics = await this.measurePerformance(
      'Cache Performance (with caching)',
      async () => {
        return await this.optimizedEngine.generateOptimizedReport(timeRange, 'summary');
      },
      5,
      1
    );

    return this.createBenchmarkResult(
      'Cache Performance',
      baselineMetrics,
      optimizedMetrics,
      1,
      5
    );
  }

  /**
   * Measure performance of a given operation
   */
  private async measurePerformance(
    testName: string,
    operation: () => Promise<any>,
    iterations: number,
    warmupIterations: number = 0
  ): Promise<PerformanceMetric> {
    const executionTimes: number[] = [];
    const memoryUsages: number[] = [];
    let initialMemory = 0;
    let peakMemory = 0;
    let finalMemory = 0;

    // Warmup iterations
    for (let i = 0; i < warmupIterations; i++) {
      try {
        await operation();
      } catch (error) {
        console.warn(`Warmup iteration ${i + 1} failed:`, error);
      }
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    initialMemory = process.memoryUsage().heapUsed;

    // Actual benchmark iterations
    for (let i = 0; i < iterations; i++) {
      const memoryBefore = process.memoryUsage().heapUsed;
      const startTime = performance.now();
      
      try {
        await operation();
      } catch (error) {
        console.error(`Iteration ${i + 1} failed:`, error);
        continue;
      }
      
      const endTime = performance.now();
      const memoryAfter = process.memoryUsage().heapUsed;
      
      executionTimes.push(endTime - startTime);
      memoryUsages.push(memoryAfter - memoryBefore);
      peakMemory = Math.max(peakMemory, memoryAfter);
    }

    finalMemory = process.memoryUsage().heapUsed;

    // Calculate statistics
    const sortedTimes = [...executionTimes].sort((a, b) => a - b);
    const totalItems = iterations; // Simplified - would count actual items processed

    return {
      executionTime: {
        min: Math.min(...executionTimes),
        max: Math.max(...executionTimes),
        average: executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length,
        median: this.calculateMedian(sortedTimes),
        p95: this.calculatePercentile(sortedTimes, 95)
      },
      memoryUsage: {
        initial: initialMemory,
        peak: peakMemory,
        final: finalMemory
      },
      throughput: {
        operationsPerSecond: (iterations * 1000) / executionTimes.reduce((sum, time) => sum + time, 0),
        itemsPerSecond: (totalItems * 1000) / executionTimes.reduce((sum, time) => sum + time, 0)
      }
    };
  }

  private createBenchmarkResult(
    testName: string,
    baseline: PerformanceMetric,
    optimized: PerformanceMetric,
    datasetSize: number,
    iterations: number
  ): BenchmarkResult {
    const speedupFactor = baseline.executionTime.average / optimized.executionTime.average;
    const memoryReduction = ((baseline.memoryUsage.peak - optimized.memoryUsage.peak) / baseline.memoryUsage.peak) * 100;

    return {
      testName,
      baselinePerformance: baseline,
      optimizedPerformance: optimized,
      improvement: {
        speedupFactor,
        memoryReduction,
        cacheHitRate: 0 // Would be calculated from actual cache stats
      },
      details: {
        iterations,
        datasetSize,
        testDuration: baseline.executionTime.average + optimized.executionTime.average,
        errors: 0 // Would track actual errors
      }
    };
  }

  private calculateBenchmarkSummary(results: BenchmarkResult[], totalTestTime: number) {
    const speedups = results.map(r => r.improvement.speedupFactor);
    const memoryReductions = results.map(r => r.improvement.memoryReduction).filter(r => r > 0);
    
    const averageSpeedup = speedups.reduce((sum, speedup) => sum + speedup, 0) / speedups.length;
    const averageMemoryReduction = memoryReductions.length > 0 
      ? memoryReductions.reduce((sum, reduction) => sum + reduction, 0) / memoryReductions.length 
      : 0;

    const recommendedOptimizations: string[] = [];
    
    if (averageSpeedup > 2) {
      recommendedOptimizations.push('Parallel processing shows significant benefits - enable by default');
    }
    
    if (averageMemoryReduction > 20) {
      recommendedOptimizations.push('Memory optimizations provide substantial savings - implement streaming');
    }
    
    if (results.some(r => r.testName.includes('Cache') && r.improvement.speedupFactor > 3)) {
      recommendedOptimizations.push('Caching strategy is highly effective - increase cache size');
    }

    return {
      averageSpeedup,
      averageMemoryReduction,
      totalTestTime,
      recommendedOptimizations
    };
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private calculateMedian(sortedValues: number[]): number {
    const mid = Math.floor(sortedValues.length / 2);
    return sortedValues.length % 2 === 0 
      ? (sortedValues[mid - 1] + sortedValues[mid]) / 2 
      : sortedValues[mid];
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
  }
}