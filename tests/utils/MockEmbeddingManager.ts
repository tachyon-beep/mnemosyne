/**
 * Mock Embedding Manager for Tests
 * 
 * This provides a mock implementation of the EmbeddingManager that doesn't
 * require network access or actual model files. It generates deterministic
 * mock embeddings for testing purposes.
 */

import { EmbeddingManager, EmbeddingConfig, ModelLoadingProgress } from '../../src/search/EmbeddingManager';
import { DatabaseManager } from '../../src/storage/Database';
import { createHash } from 'crypto';

export class MockEmbeddingManager extends EmbeddingManager {
  private mockInitialized = false;
  private mockProgress: ModelLoadingProgress | null = null;
  private mockPerformanceMetrics = {
    totalEmbeddings: 0,
    totalTime: 0,
    averageTime: 10 // Mock 10ms average
  };
  private mockCache = new Map<string, number[]>();

  constructor(dbManager: DatabaseManager, config?: Partial<EmbeddingConfig>) {
    super(dbManager, config);
  }

  /**
   * Mock initialization that doesn't require network access
   */
  async initialize(): Promise<void> {
    if (this.mockInitialized) {
      return;
    }

    console.log('MockEmbeddingManager: Initializing mock model...');
    
    // Simulate loading progress
    this.mockProgress = { step: 'Loading mock model', progress: 0, complete: false };
    
    // Simulate some async work
    await new Promise(resolve => setTimeout(resolve, 10));
    
    this.mockProgress = { step: 'Mock model ready', progress: 100, complete: true };
    this.mockInitialized = true;
    
    console.log('MockEmbeddingManager: Mock model initialized successfully');
  }

  /**
   * Generate deterministic mock embeddings based on text content
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.mockInitialized) {
      throw new Error('Mock embedding manager not initialized');
    }

    // Handle empty text by using a default string
    const inputText = text.trim() || 'empty';
    
    // Check cache first
    const cacheKey = this.getMockCacheKey(inputText);
    if (this.mockCache.has(cacheKey)) {
      // Cache hit - return immediately (no processing time)
      return this.mockCache.get(cacheKey)!;
    }

    // Simulate processing time for new embeddings (5ms to make caching advantage clear)
    await new Promise(resolve => setTimeout(resolve, 5));

    // Generate deterministic embedding based on text hash
    const hash = createHash('sha256').update(inputText).digest();
    const embedding = new Array(384);
    
    // Convert hash bytes to normalized floating point values
    for (let i = 0; i < 384; i++) {
      const byteIndex = i % hash.length;
      // Convert byte to [-1, 1] range then normalize
      embedding[i] = (hash[byteIndex] - 128) / 128;
    }
    
    // Normalize the vector to unit length (like real embeddings)
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = embedding[i] / magnitude;
    }

    // Cache the result
    this.mockCache.set(cacheKey, embedding);

    // Update mock performance metrics
    this.mockPerformanceMetrics.totalEmbeddings++;
    this.mockPerformanceMetrics.totalTime += 10;
    this.mockPerformanceMetrics.averageTime = 
      this.mockPerformanceMetrics.totalTime / this.mockPerformanceMetrics.totalEmbeddings;

    return embedding;
  }
  
  /**
   * Generate cache key for text
   */
  private getMockCacheKey(text: string): string {
    return createHash('sha256').update(text).digest('hex').substring(0, 16);
  }

  /**
   * Generate batch embeddings (mock implementation)
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.mockInitialized) {
      throw new Error('Mock embedding manager not initialized');
    }

    if (texts.length === 0) {
      return [];
    }

    // Simulate batch processing time
    await new Promise(resolve => setTimeout(resolve, Math.max(1, texts.length / 2)));

    // Generate embeddings for each text
    const embeddings = [];
    for (const text of texts) {
      embeddings.push(await this.generateEmbedding(text));
    }

    return embeddings;
  }

  /**
   * Mock loading progress
   */
  getLoadingProgress(): ModelLoadingProgress | null {
    return this.mockProgress;
  }

  /**
   * Mock embedding statistics
   */
  async getEmbeddingStats(): Promise<{
    totalMessages: number;
    embeddedMessages: number;
    embeddingCoverage: number;
    averageEmbeddingTime: number;
    cacheSize: number;
    cacheMemoryUsage: number;
    cacheHitRate: number;
    performanceMetrics: {
      totalEmbeddings: number;
      totalTime: number;
      averageTime: number;
      targetTime: number;
      performanceRatio: number;
    };
    modelInfo: {
      modelName: string;
      dimensions: number;
      isInitialized: boolean;
      cacheDir: string | undefined;
    };
  }> {
    const config = this.getConfiguration();
    
    return {
      totalMessages: 0,
      embeddedMessages: 0,
      embeddingCoverage: 0,
      averageEmbeddingTime: this.mockPerformanceMetrics.averageTime,
      cacheSize: this.mockCache.size,
      cacheMemoryUsage: this.mockCache.size * 384 * 8,
      cacheHitRate: 0.8, // Mock 80% hit rate
      performanceMetrics: {
        totalEmbeddings: this.mockPerformanceMetrics.totalEmbeddings,
        totalTime: this.mockPerformanceMetrics.totalTime,
        averageTime: this.mockPerformanceMetrics.averageTime,
        targetTime: config.performanceTarget,
        performanceRatio: this.mockPerformanceMetrics.averageTime / config.performanceTarget
      },
      modelInfo: {
        modelName: config.modelName,
        dimensions: 384,
        isInitialized: this.mockInitialized,
        cacheDir: config.cacheDir
      }
    };
  }

  /**
   * Mock model health check
   */
  isModelHealthy(): boolean {
    return this.mockInitialized;
  }

  /**
   * Mock model test
   */
  async testModel(): Promise<{
    success: boolean;
    performance: number;
    dimensions: number;
    error?: string;
  }> {
    if (!this.mockInitialized) {
      return {
        success: false,
        performance: 0,
        dimensions: 0,
        error: 'Mock model not initialized'
      };
    }

    return {
      success: true,
      performance: 10, // Mock 10ms performance
      dimensions: 384,
    };
  }

  /**
   * Mock fallback embedding generation
   */
  async generateEmbeddingWithFallback(text: string, _maxRetries: number = 2): Promise<number[]> {
    return this.generateEmbedding(text);
  }

  /**
   * Mock cache operations
   */
  clearCache(): void {
    this.mockCache.clear();
  }

  getCacheStats(): { size: number; memoryUsage: number; maxSize: number; maxMemoryBytes: number } {
    const config = this.getConfiguration();
    return {
      size: this.mockCache.size,
      memoryUsage: this.mockCache.size * 384 * 8, // Rough estimate
      maxSize: 1000,
      maxMemoryBytes: config.maxCacheSize * 1024 * 1024
    };
  }

  /**
   * Mock circuit breaker status
   */
  getCircuitBreakerStatus(): { state: string; isOpen: boolean } {
    return {
      state: 'CLOSED',
      isOpen: false
    };
  }

  /**
   * Mock reset functionality
   */
  async reset(): Promise<void> {
    this.mockInitialized = false;
    this.mockProgress = null;
    this.mockCache.clear();
    this.mockPerformanceMetrics = {
      totalEmbeddings: 0,
      totalTime: 0,
      averageTime: 10
    };
    await this.initialize();
  }

  /**
   * Mock destroy
   */
  destroy(): void {
    this.mockInitialized = false;
    this.mockProgress = null;
    this.mockCache.clear();
  }
}