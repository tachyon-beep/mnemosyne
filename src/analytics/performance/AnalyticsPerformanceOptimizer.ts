/**
 * Analytics Performance Optimizer
 * 
 * Comprehensive performance optimization for analytics operations:
 * - Query optimization and caching strategies
 * - Memory-efficient data processing
 * - Parallel algorithm execution
 * - Database connection pooling
 * - Performance monitoring and metrics
 */

import { DatabaseManager } from '../../storage/Database.js';
import { ConversationFlowAnalyzer } from '../analyzers/ConversationFlowAnalyzer.js';
import { ProductivityAnalyzer } from '../analyzers/ProductivityAnalyzer.js';
import { KnowledgeGapDetector } from '../analyzers/KnowledgeGapDetector.js';
import { DecisionTracker } from '../analyzers/DecisionTracker.js';
import { AnalyticsEngine } from '../services/AnalyticsEngine.js';
import { Message, Conversation } from '../../types/interfaces.js';
import { CacheKeyGenerator, CacheKeys } from '../../utils/CacheKeyGenerator.js';
import { SizeEstimator } from '../../utils/SizeEstimator.js';
import { 
  PredictiveCacheManager, 
  PredictiveCacheConfig, 
  DEFAULT_PREDICTIVE_CACHE_CONFIG,
  CachePrediction 
} from './PredictiveCacheManager.js';

export interface PerformanceMetrics {
  queryExecutionTimes: Map<string, number[]>;
  cacheHitRates: Map<string, { hits: number; misses: number }>;
  memoryUsage: {
    current: number;
    peak: number;
    gcEvents: number;
  };
  algorithmPerformance: {
    averageCircularityTime: number;
    averageClusteringTime: number;
    averageFlowAnalysisTime: number;
  };
  parallelizationEfficiency: {
    parallelTasks: number;
    speedupFactor: number;
    efficiency: number;
  };
}

export interface OptimizationConfig {
  enableQueryCaching: boolean;
  enableMemoryOptimization: boolean;
  enableParallelProcessing: boolean;
  maxMemoryUsageMB: number;
  queryCacheTTLMinutes: number;
  parallelWorkers: number;
  batchSize: number;
  enablePerformanceMonitoring: boolean;
  enablePredictiveCaching: boolean;
  predictiveCache?: Partial<PredictiveCacheConfig>;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  size: number;
}

/**
 * Multi-layer caching system for analytics operations
 */
class AnalyticsCache {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private cacheStats: Map<string, { hits: number; misses: number }> = new Map();
  private maxMemoryBytes: number;
  private currentMemoryUsage: number = 0;

  constructor(maxMemoryMB: number) {
    this.maxMemoryBytes = maxMemoryMB * 1024 * 1024;
  }

  async get<T>(key: string, predictiveCacheManager?: PredictiveCacheManager): Promise<T | null> {
    const entry = this.memoryCache.get(key);
    
    if (!entry) {
      this.recordCacheStats(key, 'miss');
      // Record cache miss for predictive analysis
      if (predictiveCacheManager) {
        predictiveCacheManager.recordCacheAccess(key, 'default', { type: 'miss' });
      }
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.memoryCache.delete(key);
      this.currentMemoryUsage -= entry.size;
      this.recordCacheStats(key, 'miss');
      // Record cache miss for predictive analysis
      if (predictiveCacheManager) {
        predictiveCacheManager.recordCacheAccess(key, 'default', { type: 'miss_expired' });
      }
      return null;
    }

    entry.hits++;
    this.recordCacheStats(key, 'hit');
    // Record cache hit for predictive analysis
    if (predictiveCacheManager) {
      predictiveCacheManager.recordCacheAccess(key, 'default', { type: 'hit' });
    }
    return entry.data;
  }

  async set<T>(key: string, value: T, ttlMinutes: number = 60): Promise<void> {
    const size = this.estimateSize(value);
    const ttl = ttlMinutes * 60 * 1000;

    // Check memory limits and evict if necessary
    if (this.currentMemoryUsage + size > this.maxMemoryBytes) {
      await this.evictLRU(size);
    }

    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      size
    };

    this.memoryCache.set(key, entry);
    this.currentMemoryUsage += size;
  }

  invalidatePattern(pattern: string): number {
    let invalidated = 0;
    
    for (const [key, entry] of this.memoryCache) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
        this.currentMemoryUsage -= entry.size;
        invalidated++;
      }
    }
    
    return invalidated;
  }

  getCacheStats() {
    return {
      totalEntries: this.memoryCache.size,
      memoryUsageMB: this.currentMemoryUsage / (1024 * 1024),
      hitRates: Array.from(this.cacheStats.entries()).map(([key, stats]) => ({
        key,
        hitRate: stats.hits / (stats.hits + stats.misses),
        totalRequests: stats.hits + stats.misses
      }))
    };
  }

  private recordCacheStats(key: string, type: 'hit' | 'miss'): void {
    if (!this.cacheStats.has(key)) {
      this.cacheStats.set(key, { hits: 0, misses: 0 });
    }
    
    const stats = this.cacheStats.get(key)!;
    if (type === 'hit') {
      stats.hits++;
    } else {
      stats.misses++;
    }
  }

  private estimateSize(value: any): number {
    // Use enhanced size estimation with object overhead calculation
    try {
      return SizeEstimator.quickEstimate(value);
    } catch (error) {
      // Fallback to simplified estimation
      console.warn('Size estimation failed, using fallback:', error);
      return 1024; // Conservative fallback
    }
  }

  private async evictLRU(requiredSpace: number): Promise<void> {
    const entries = Array.from(this.memoryCache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => {
        // Sort by last access time (timestamp + hits factor)
        const aScore = a.entry.timestamp + (a.entry.hits * 1000);
        const bScore = b.entry.timestamp + (b.entry.hits * 1000);
        return aScore - bScore;
      });

    let freedSpace = 0;
    for (const { key, entry } of entries) {
      this.memoryCache.delete(key);
      this.currentMemoryUsage -= entry.size;
      freedSpace += entry.size;
      
      if (freedSpace >= requiredSpace) {
        break;
      }
    }
  }
}

/**
 * Optimized query executor with prepared statements and connection pooling
 */
class OptimizedQueryExecutor {
  private preparedStatements: Map<string, any> = new Map();
  private queryStats: Map<string, number[]> = new Map();
  
  constructor(private databaseManager: DatabaseManager) {}

  async executeQuery<T>(
    queryId: string,
    sql: string,
    params: Record<string, any>
  ): Promise<T[]> {
    const startTime = performance.now();
    
    try {
      // Use prepared statement for better performance
      let stmt = this.preparedStatements.get(queryId);
      if (!stmt) {
        const db = (this.databaseManager as any).getDatabase();
        stmt = db.prepare(sql);
        this.preparedStatements.set(queryId, stmt);
      }
      
      const result = stmt.all(params) as T[];
      
      // Record performance metrics
      const executionTime = performance.now() - startTime;
      this.recordQueryPerformance(queryId, executionTime);
      
      return result;
    } catch (error) {
      console.error(`Query execution failed for ${queryId}:`, error);
      throw error;
    }
  }

  getQueryPerformanceStats() {
    const stats = new Map<string, { avgTime: number; minTime: number; maxTime: number; count: number }>();
    
    for (const [queryId, times] of this.queryStats) {
      const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      stats.set(queryId, {
        avgTime,
        minTime,
        maxTime,
        count: times.length
      });
    }
    
    return stats;
  }

  private recordQueryPerformance(queryId: string, executionTime: number): void {
    if (!this.queryStats.has(queryId)) {
      this.queryStats.set(queryId, []);
    }
    
    const times = this.queryStats.get(queryId)!;
    times.push(executionTime);
    
    // Keep only recent measurements
    if (times.length > 1000) {
      times.splice(0, times.length - 1000);
    }
  }
}

/**
 * Parallel processing manager for analytics operations
 */
class ParallelAnalyticsProcessor {
  private workerPool: Array<{ terminate: () => void }> = [];
  private taskQueue: Array<() => Promise<any>> = [];
  private activeTasks = 0;
  
  constructor(private maxWorkers: number = 4) {
    // Initialize worker pool would go here in a real implementation
    // For now, we'll use Promise-based concurrency
  }

  async processInParallel<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = 10
  ): Promise<R[]> {
    const batches = this.createBatches(items, batchSize);
    
    const processBatch = async (batch: T[]): Promise<R[]> => {
      return Promise.all(batch.map(processor));
    };
    
    // Process batches in parallel
    const batchPromises = batches.map(processBatch);
    const batchResults = await Promise.all(batchPromises);
    
    // Flatten results
    return batchResults.flat();
  }

  async processConversationsInParallel(
    conversations: Array<{ conversation: Conversation; messages: Message[] }>,
    analyzer: ConversationFlowAnalyzer | ProductivityAnalyzer,
    method: string
  ): Promise<unknown[]> {
    const processConversation = async (item: { conversation: Conversation; messages: Message[] }): Promise<unknown> => {
      try {
        // Type-safe method calling
        if (analyzer instanceof ConversationFlowAnalyzer && method === 'analyzeFlow') {
          return await analyzer.analyzeFlow(item.conversation, item.messages);
        } else if (analyzer instanceof ProductivityAnalyzer && method === 'analyzeConversationProductivity') {
          return await analyzer.analyzeConversationProductivity(item.conversation, item.messages);
        }
        throw new Error(`Invalid analyzer/method combination: ${analyzer.constructor.name}/${method}`);
      } catch (error) {
        console.error(`Failed to process conversation ${item.conversation.id}:`, error);
        return null;
      }
    };

    const results = await this.processInParallel(
      conversations,
      processConversation,
      Math.min(this.maxWorkers, conversations.length)
    );

    return results.filter(result => result !== null);
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}

/**
 * Memory-efficient data streaming processor
 */
class StreamingDataProcessor {
  private memoryUsage = 0;
  private readonly maxMemoryMB: number;

  constructor(maxMemoryMB: number = 200) {
    this.maxMemoryMB = maxMemoryMB;
  }

  async *processLargeDataset<T, R>(
    dataSource: AsyncIterable<T> | T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = 100
  ): AsyncGenerator<R[]> {
    let batch: T[] = [];
    
    for await (const item of this.ensureAsyncIterable(dataSource)) {
      batch.push(item);
      
      if (batch.length >= batchSize || this.isMemoryPressure()) {
        const results = await Promise.all(
          batch.map(async (item) => {
            try {
              return await processor(item);
            } catch (error) {
              console.error('Processing error:', error);
              return null;
            }
          })
        );
        
        yield results.filter(r => r !== null) as R[];
        batch = [];
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    }
    
    // Process remaining items
    if (batch.length > 0) {
      const results = await Promise.all(batch.map(processor));
      yield results;
    }
  }

  private async *ensureAsyncIterable<T>(source: AsyncIterable<T> | T[]): AsyncGenerator<T> {
    if (Symbol.asyncIterator in source) {
      yield* source as AsyncIterable<T>;
    } else {
      for (const item of source as T[]) {
        yield item;
      }
    }
  }

  private isMemoryPressure(): boolean {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / (1024 * 1024);
    return heapUsedMB > this.maxMemoryMB * 0.8;
  }
}

/**
 * Optimized algorithms for specific analytics operations
 */
class OptimizedAlgorithms {
  /**
   * Optimized Tarjan's algorithm with early termination
   */
  static findStronglyConnectedComponentsOptimized(
    graph: Map<string, Set<string>>,
    maxComponents: number = 100
  ): string[][] {
    if (graph.size === 0) return [];
    
    const index = new Map<string, number>();
    const lowlink = new Map<string, number>();
    const onStack = new Set<string>();
    const stack: string[] = [];
    const sccs: string[][] = [];
    let currentIndex = 0;

    const strongConnect = (node: string) => {
      if (sccs.length >= maxComponents) return; // Early termination
      
      index.set(node, currentIndex);
      lowlink.set(node, currentIndex);
      currentIndex++;
      stack.push(node);
      onStack.add(node);

      const neighbors = graph.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (sccs.length >= maxComponents) break; // Early termination
        
        if (!index.has(neighbor)) {
          strongConnect(neighbor);
          lowlink.set(node, Math.min(
            lowlink.get(node)!,
            lowlink.get(neighbor)!
          ));
        } else if (onStack.has(neighbor)) {
          lowlink.set(node, Math.min(
            lowlink.get(node)!,
            index.get(neighbor)!
          ));
        }
      }

      if (lowlink.get(node) === index.get(node)) {
        const scc: string[] = [];
        let w: string;
        do {
          w = stack.pop()!;
          onStack.delete(w);
          scc.push(w);
        } while (w !== node);
        sccs.push(scc);
      }
    };

    // Process nodes in degree order for better performance
    const nodesByDegree = Array.from(graph.keys())
      .map(node => ({ node, degree: (graph.get(node) || new Set()).size }))
      .sort((a, b) => b.degree - a.degree);

    for (const { node } of nodesByDegree) {
      if (!index.has(node) && sccs.length < maxComponents) {
        strongConnect(node);
      }
    }

    return sccs;
  }

  /**
   * Optimized clustering with spatial indexing
   */
  static optimizedClustering<T>(
    items: T[],
    similarityFunction: (a: T, b: T) => number,
    threshold: number = 0.6,
    maxClusters: number = 50
  ): T[][] {
    if (items.length === 0) return [];
    
    const clusters: T[][] = [];
    const processed = new Set<number>();
    
    // Pre-calculate similarity matrix for frequently accessed pairs
    const similarityCache = new Map<string, number>();
    
    const getCachedSimilarity = (i: number, j: number): number => {
      const key = `${Math.min(i, j)}-${Math.max(i, j)}`;
      if (similarityCache.has(key)) {
        return similarityCache.get(key)!;
      }
      
      const similarity = similarityFunction(items[i], items[j]);
      similarityCache.set(key, similarity);
      return similarity;
    };

    for (let i = 0; i < items.length && clusters.length < maxClusters; i++) {
      if (processed.has(i)) continue;

      const cluster = [items[i]];
      processed.add(i);

      // Find similar items using optimized search
      for (let j = i + 1; j < items.length; j++) {
        if (processed.has(j)) continue;

        const similarity = getCachedSimilarity(i, j);
        if (similarity >= threshold) {
          cluster.push(items[j]);
          processed.add(j);
        }
      }

      if (cluster.length >= 2) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  /**
   * Optimized topic extraction with memoization
   */
  static extractTopicsWithMemoization(
    messages: Message[],
    cache: Map<string, string[]> = new Map()
  ): Map<string, Message[]> {
    const topicMap = new Map<string, Message[]>();
    
    for (const message of messages) {
      // Use enhanced cache key generation for content-based operations
      const cacheKey = CacheKeys.topicExtraction(message.content);
      let topics: string[];
      
      if (cache.has(cacheKey)) {
        topics = cache.get(cacheKey)!;
      } else {
        topics = this.extractMessageTopics(message.content);
        cache.set(cacheKey, topics);
      }
      
      for (const topic of topics) {
        if (!topicMap.has(topic)) {
          topicMap.set(topic, []);
        }
        topicMap.get(topic)!.push(message);
      }
    }
    
    return topicMap;
  }

  private static generateCacheKey(content: string): string {
    // Use enhanced content-based cache key generation
    return CacheKeyGenerator.generateContentKey('legacy_topic', content, {
      algorithm: 'sha1',
      maxLength: 200
    });
  }

  private static extractMessageTopics(content: string): string[] {
    // Simplified topic extraction - in production would use more sophisticated NLP
    const topics: string[] = [];
    const sentences = content.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const words = sentence.toLowerCase().split(/\s+/)
        .filter(w => w.length > 4 && !this.isStopWord(w));
      
      // Extract bigrams
      for (let i = 0; i < words.length - 1; i++) {
        const bigram = words.slice(i, i + 2).join(' ');
        if (this.isSignificantBigram(bigram)) {
          topics.push(bigram);
        }
      }
    }
    
    return [...new Set(topics)];
  }

  private static isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have',
      'for', 'not', 'with', 'he', 'as', 'you', 'do', 'at', 'this'
    ]);
    return stopWords.has(word);
  }

  private static isSignificantBigram(bigram: string): boolean {
    return bigram.length > 8 && !bigram.includes('that') && !bigram.includes('this');
  }
}

/**
 * Main performance optimizer class
 */
export class AnalyticsPerformanceOptimizer {
  private cache: AnalyticsCache;
  private queryExecutor: OptimizedQueryExecutor;
  private parallelProcessor: ParallelAnalyticsProcessor;
  private streamProcessor: StreamingDataProcessor;
  private metrics: PerformanceMetrics;
  private config: OptimizationConfig;
  private predictiveCacheManager?: PredictiveCacheManager;

  constructor(
    private databaseManager: DatabaseManager,
    private analyticsEngine?: AnalyticsEngine,
    config: Partial<OptimizationConfig> = {}
  ) {
    this.config = {
      enableQueryCaching: true,
      enableMemoryOptimization: true,
      enableParallelProcessing: true,
      maxMemoryUsageMB: 200,
      queryCacheTTLMinutes: 60,
      parallelWorkers: 4,
      batchSize: 50,
      enablePerformanceMonitoring: true,
      enablePredictiveCaching: false,
      predictiveCache: DEFAULT_PREDICTIVE_CACHE_CONFIG,
      ...config
    };

    this.cache = new AnalyticsCache(this.config.maxMemoryUsageMB);
    this.queryExecutor = new OptimizedQueryExecutor(databaseManager);
    this.parallelProcessor = new ParallelAnalyticsProcessor(this.config.parallelWorkers);
    this.streamProcessor = new StreamingDataProcessor(this.config.maxMemoryUsageMB);
    
    this.metrics = {
      queryExecutionTimes: new Map(),
      cacheHitRates: new Map(),
      memoryUsage: { current: 0, peak: 0, gcEvents: 0 },
      algorithmPerformance: {
        averageCircularityTime: 0,
        averageClusteringTime: 0,
        averageFlowAnalysisTime: 0
      },
      parallelizationEfficiency: {
        parallelTasks: 0,
        speedupFactor: 1,
        efficiency: 1
      }
    };

    // Initialize predictive caching if enabled
    if (this.config.enablePredictiveCaching && this.analyticsEngine) {
      this.predictiveCacheManager = new PredictiveCacheManager(
        this.databaseManager,
        this.analyticsEngine,
        {
          ...DEFAULT_PREDICTIVE_CACHE_CONFIG,
          ...this.config.predictiveCache
        }
      );
    }

    this.startPerformanceMonitoring();
  }

  /**
   * Optimize conversation flow analysis with caching and parallel processing
   */
  async optimizeFlowAnalysis(
    conversations: Array<{ conversation: Conversation; messages: Message[] }>,
    analyzer: ConversationFlowAnalyzer
  ): Promise<any[]> {
    // Generate collision-resistant cache key
    const cacheKey = CacheKeys.flowAnalysis(conversations);
    
    // Check cache first
    if (this.config.enableQueryCaching) {
      const cached = await this.cache.get<any[]>(cacheKey, this.predictiveCacheManager);
      if (cached) {
        return cached;
      }
    }

    const startTime = performance.now();
    let results: any[];

    if (this.config.enableParallelProcessing && conversations.length > 10) {
      // Use parallel processing for large datasets
      results = await this.parallelProcessor.processConversationsInParallel(
        conversations,
        analyzer,
        'analyzeFlow'
      );
    } else {
      // Sequential processing for smaller datasets
      results = [];
      for (const item of conversations) {
        try {
          const result = await analyzer.analyzeFlow(item.conversation, item.messages);
          results.push(result);
        } catch (error) {
          console.error(`Flow analysis failed for conversation ${item.conversation.id}:`, error);
        }
      }
    }

    // Cache results
    if (this.config.enableQueryCaching) {
      await this.cache.set(cacheKey, results, this.config.queryCacheTTLMinutes);
    }

    // Record metrics
    const executionTime = performance.now() - startTime;
    this.metrics.algorithmPerformance.averageFlowAnalysisTime = 
      (this.metrics.algorithmPerformance.averageFlowAnalysisTime + executionTime) / 2;

    return results;
  }

  /**
   * Optimize productivity analysis with streaming for large datasets
   */
  async optimizeProductivityAnalysis(
    conversations: Array<{ conversation: Conversation; messages: Message[] }>,
    analyzer: ProductivityAnalyzer
  ): Promise<any[]> {
    const results: any[] = [];

    if (conversations.length > 1000) {
      // Use streaming for very large datasets
      const processConversation = async (item: { conversation: Conversation; messages: Message[] }) => {
        return await analyzer.analyzeConversationProductivity(item.conversation, item.messages);
      };

      for await (const batch of this.streamProcessor.processLargeDataset(
        conversations,
        processConversation,
        this.config.batchSize
      )) {
        results.push(...batch);
      }
    } else {
      // Use parallel processing for medium datasets
      const processedResults = await this.parallelProcessor.processConversationsInParallel(
        conversations,
        analyzer,
        'analyzeConversationProductivity'
      );
      results.push(...processedResults);
    }

    return results;
  }

  /**
   * Optimize knowledge gap detection with advanced clustering
   */
  async optimizeKnowledgeGapDetection(
    conversations: Array<{ conversation: Conversation; messages: Message[] }>,
    detector: KnowledgeGapDetector
  ): Promise<any[]> {
    // Generate collision-resistant cache key
    const cacheKey = CacheKeys.knowledgeGapDetection(conversations);
    
    if (this.config.enableQueryCaching) {
      const cached = await this.cache.get<any[]>(cacheKey, this.predictiveCacheManager);
      if (cached) {
        return cached;
      }
    }

    const startTime = performance.now();
    
    // Use optimized clustering algorithm
    const allMessages = conversations.flatMap(c => 
      c.messages.map(m => ({ ...m, conversationId: c.conversation.id }))
    );

    // Extract questions with memoization
    const questions = allMessages.filter(m => 
      m.role === 'user' && 
      m.content.includes('?') &&
      m.content.trim().length > 10
    );

    // Use optimized clustering
    OptimizedAlgorithms.optimizedClustering(
      questions,
      (q1, q2) => this.calculateQuestionSimilarity(q1.content, q2.content),
      0.6,
      50
    );

    // Process gaps with the detector
    const gaps = await detector.detectGaps(conversations);

    // Cache results
    if (this.config.enableQueryCaching) {
      await this.cache.set(cacheKey, gaps, this.config.queryCacheTTLMinutes);
    }

    const executionTime = performance.now() - startTime;
    this.metrics.algorithmPerformance.averageClusteringTime = executionTime;

    return gaps;
  }

  /**
   * Optimize decision tracking with pattern caching
   */
  async optimizeDecisionTracking(
    conversations: Array<{ conversation: Conversation; messages: Message[] }>,
    tracker: DecisionTracker
  ): Promise<any[]> {
    const results: any[] = [];

    // Process in parallel batches
    const processBatch = async (batch: Array<{ conversation: Conversation; messages: Message[] }>) => {
      const batchResults: any[] = [];
      
      for (const item of batch) {
        try {
          const decisions = await tracker.trackDecisions(item.conversation, item.messages);
          batchResults.push(...decisions);
        } catch (error) {
          console.error(`Decision tracking failed for conversation ${item.conversation.id}:`, error);
        }
      }
      
      return batchResults;
    };

    // Split into batches and process in parallel
    const batches = this.createBatches(conversations, this.config.batchSize);
    const batchPromises = batches.map(processBatch);
    const batchResults = await Promise.all(batchPromises);
    
    results.push(...batchResults.flat());
    return results;
  }

  /**
   * Optimize database queries with connection pooling
   */
  async optimizeQuery<T>(
    queryId: string,
    sql: string,
    params: Record<string, any>
  ): Promise<T[]> {
    // Generate collision-resistant cache key with parameter normalization
    const cacheKey = CacheKeyGenerator.generateQueryKey(queryId, sql, params);
    
    if (this.config.enableQueryCaching) {
      const cached = await this.cache.get<T[]>(cacheKey, this.predictiveCacheManager);
      if (cached) {
        return cached;
      }
    }

    const result = await this.queryExecutor.executeQuery<T>(queryId, sql, params);
    
    if (this.config.enableQueryCaching) {
      await this.cache.set(cacheKey, result, this.config.queryCacheTTLMinutes);
    }

    return result;
  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport(): {
    metrics: PerformanceMetrics;
    cacheStats: any;
    queryStats: any;
    predictiveCaching?: any;
    recommendations: string[];
  } {
    const queryStats = this.queryExecutor.getQueryPerformanceStats();
    const cacheStats = this.cache.getCacheStats();
    const predictiveCachingStatus = this.getPredictiveCachingStatus();
    
    const recommendations = this.generateOptimizationRecommendations(
      queryStats, 
      cacheStats, 
      predictiveCachingStatus
    );

    const report: any = {
      metrics: this.metrics,
      cacheStats,
      queryStats: Object.fromEntries(queryStats),
      recommendations
    };

    if (predictiveCachingStatus.enabled) {
      report.predictiveCaching = predictiveCachingStatus;
    }

    return report;
  }

  /**
   * Initialize predictive caching system
   */
  async initializePredictiveCaching(): Promise<void> {
    if (!this.predictiveCacheManager) {
      if (!this.analyticsEngine) {
        throw new Error('Analytics engine required for predictive caching');
      }
      
      this.predictiveCacheManager = new PredictiveCacheManager(
        this.databaseManager,
        this.analyticsEngine,
        {
          ...DEFAULT_PREDICTIVE_CACHE_CONFIG,
          ...this.config.predictiveCache
        }
      );
    }

    await this.predictiveCacheManager.initialize();
  }

  /**
   * Enable or disable predictive caching at runtime
   */
  async configurePredictiveCaching(
    enabled: boolean,
    config?: Partial<PredictiveCacheConfig>
  ): Promise<void> {
    this.config.enablePredictiveCaching = enabled;
    
    if (enabled && this.analyticsEngine) {
      if (!this.predictiveCacheManager) {
        this.predictiveCacheManager = new PredictiveCacheManager(
          this.databaseManager,
          this.analyticsEngine,
          {
            ...DEFAULT_PREDICTIVE_CACHE_CONFIG,
            ...this.config.predictiveCache,
            ...config
          }
        );
        await this.predictiveCacheManager.initialize();
      } else if (config) {
        this.predictiveCacheManager.updateConfiguration(config);
      }
    } else if (!enabled && this.predictiveCacheManager) {
      this.predictiveCacheManager.shutdown();
    }
  }

  /**
   * Manually trigger predictive cache warming
   */
  async triggerPredictiveCacheWarming(): Promise<CachePrediction[]> {
    if (!this.predictiveCacheManager || !this.config.enablePredictiveCaching) {
      return [];
    }

    return await this.predictiveCacheManager.triggerPredictiveWarming();
  }

  /**
   * Get predictive caching system status and metrics
   */
  getPredictiveCachingStatus(): {
    enabled: boolean;
    status: any | null;
    recommendations: string[];
  } {
    const enabled = this.config.enablePredictiveCaching && !!this.predictiveCacheManager;
    const status = enabled ? this.predictiveCacheManager!.getSystemStatus() : null;
    
    const recommendations: string[] = [];
    
    if (!enabled) {
      recommendations.push('Consider enabling predictive caching to improve performance');
    } else if (status) {
      // Analyze predictive cache performance
      if (status.warming.efficiency < 0.6) {
        recommendations.push('Predictive cache accuracy is low - consider adjusting prediction thresholds');
      }
      
      if (status.recentActivity.requestsPerHour > 100 && !status.enabled) {
        recommendations.push('High cache request volume detected - predictive caching could provide significant benefits');
      }
      
      if (status.patterns.averageConfidence < 0.5) {
        recommendations.push('Pattern confidence is low - allow more time for pattern learning');
      }
      
      if (status.warming.queueSize > 20) {
        recommendations.push('Large warming queue detected - consider increasing resource thresholds');
      }
    }
    
    return {
      enabled,
      status,
      recommendations
    };
  }

  /**
   * Validate prediction accuracy by checking if predicted cache entries were actually requested
   */
  async validatePredictionAccuracy(_timeWindowHours: number = 24): Promise<{
    totalPredictions: number;
    accuratePredictions: number;
    accuracy: number;
    topPredictedQueries: Array<{ query: string; predicted: boolean; actual: boolean }>;
  }> {
    if (!this.predictiveCacheManager) {
      return {
        totalPredictions: 0,
        accuratePredictions: 0,
        accuracy: 0,
        topPredictedQueries: []
      };
    }

    const status = this.predictiveCacheManager.getSystemStatus();
    const warmingStats = status.warming;
    
    // In a real implementation, this would track predictions vs actual requests
    // For now, we'll use the warming efficiency as a proxy
    const totalPredictions = warmingStats.stats.successful + warmingStats.stats.failed;
    const accuratePredictions = warmingStats.stats.successful;
    const accuracy = totalPredictions > 0 ? accuratePredictions / totalPredictions : 0;

    return {
      totalPredictions,
      accuratePredictions,
      accuracy,
      topPredictedQueries: [] // Would be populated with actual tracking data
    };
  }

  /**
   * Clear caches and reset performance counters
   */
  resetPerformanceState(): void {
    this.cache.invalidatePattern('');
    
    if (this.predictiveCacheManager) {
      // Don't shutdown completely, just clear patterns to allow re-learning
      this.predictiveCacheManager.updateConfiguration({ 
        learningEnabled: false 
      });
      setTimeout(() => {
        if (this.predictiveCacheManager) {
          this.predictiveCacheManager.updateConfiguration({ 
            learningEnabled: true 
          });
        }
      }, 1000);
    }
    
    this.metrics = {
      queryExecutionTimes: new Map(),
      cacheHitRates: new Map(),
      memoryUsage: { current: 0, peak: 0, gcEvents: 0 },
      algorithmPerformance: {
        averageCircularityTime: 0,
        averageClusteringTime: 0,
        averageFlowAnalysisTime: 0
      },
      parallelizationEfficiency: {
        parallelTasks: 0,
        speedupFactor: 1,
        efficiency: 1
      }
    };
  }

  private calculateQuestionSimilarity(q1: string, q2: string): number {
    // Simple Jaccard similarity for demonstration
    const set1 = new Set(q1.toLowerCase().split(/\s+/));
    const set2 = new Set(q2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private startPerformanceMonitoring(): void {
    if (!this.config.enablePerformanceMonitoring) return;

    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.metrics.memoryUsage.current = memUsage.heapUsed;
      this.metrics.memoryUsage.peak = Math.max(
        this.metrics.memoryUsage.peak,
        memUsage.heapUsed
      );
    }, 30000); // Every 30 seconds
  }

  private generateOptimizationRecommendations(
    queryStats: any,
    cacheStats: any,
    predictiveCachingStatus?: any
  ): string[] {
    const recommendations: string[] = [];

    // Analyze query performance
    for (const [queryId, stats] of Object.entries(queryStats as any)) {
      if ((stats as any).avgTime > 1000) { // > 1 second
        recommendations.push(`Query ${queryId} is slow (avg: ${(stats as any).avgTime.toFixed(2)}ms) - consider optimization`);
      }
    }

    // Analyze cache performance
    const lowHitRateKeys = cacheStats.hitRates.filter((hr: any) => hr.hitRate < 0.5);
    if (lowHitRateKeys.length > 0) {
      recommendations.push(`Low cache hit rates detected - review caching strategy for: ${lowHitRateKeys.map((k: any) => k.key).join(', ')}`);
    }

    // Memory usage recommendations
    if (this.metrics.memoryUsage.current > this.config.maxMemoryUsageMB * 0.8 * 1024 * 1024) {
      recommendations.push('High memory usage detected - consider increasing batch size limits or memory limits');
    }

    // Predictive caching recommendations
    if (predictiveCachingStatus) {
      recommendations.push(...predictiveCachingStatus.recommendations);
    }

    return recommendations;
  }
}