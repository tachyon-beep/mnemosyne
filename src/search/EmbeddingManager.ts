/**
 * Embedding Manager - Local embedding generation and management
 * 
 * This module provides:
 * - Local embedding generation using sentence-transformers via ONNX
 * - Vector similarity calculations
 * - Embedding storage and retrieval
 * - Batch processing for efficiency
 * - Caching for performance
 */

import { pipeline, env, FeatureExtractionPipeline } from '@huggingface/transformers';
import { DatabaseManager } from '../storage/Database.js';
import { MemoryManager } from '../utils/MemoryManager.js';

// Import crypto for secure hashing
import { createHash } from 'crypto';

// LRU Cache implementation for memory management
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;
  private maxMemoryBytes: number;
  private currentMemoryBytes: number = 0;

  constructor(maxSize: number, maxMemoryMB: number) {
    this.maxSize = maxSize;
    this.maxMemoryBytes = maxMemoryMB * 1024 * 1024; // Convert MB to bytes
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    const valueSize = this.estimateSize(value);
    
    // Remove existing entry if present
    if (this.cache.has(key)) {
      const existingSize = this.estimateSize(this.cache.get(key)!);
      this.currentMemoryBytes -= existingSize;
      this.cache.delete(key);
    }

    // Evict entries until we have space
    while ((this.cache.size >= this.maxSize || 
            this.currentMemoryBytes + valueSize > this.maxMemoryBytes) && 
           this.cache.size > 0) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        const firstValue = this.cache.get(firstKey)!;
        this.currentMemoryBytes -= this.estimateSize(firstValue);
        this.cache.delete(firstKey);
      } else {
        break; // Safety break if no keys available
      }
    }

    // Add new entry
    this.cache.set(key, value);
    this.currentMemoryBytes += valueSize;
  }

  private estimateSize(value: V): number {
    if (Array.isArray(value)) {
      // Assume number array (embeddings)
      return value.length * 8; // 8 bytes per float64
    }
    return JSON.stringify(value).length * 2; // Rough estimate for strings
  }

  clear(): void {
    this.cache.clear();
    this.currentMemoryBytes = 0;
  }

  size(): number {
    return this.cache.size;
  }

  memoryUsage(): number {
    return this.currentMemoryBytes;
  }
}

// Circuit breaker for model failure recovery
class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;

  constructor(failureThreshold: number = 5, resetTimeout: number = 60000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        console.log('Circuit breaker: Attempting to recover (HALF_OPEN)');
      } else {
        throw new Error('Circuit breaker is OPEN - service temporarily unavailable');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      console.warn(`Circuit breaker: OPEN after ${this.failures} failures`);
    }
  }

  isOpen(): boolean {
    return this.state === 'OPEN';
  }

  getState(): string {
    return this.state;
  }
}

// Thread-safe operation lock
class OperationLock {
  private locks = new Map<string, Promise<void>>();

  async acquire<T>(key: string, operation: () => Promise<T>): Promise<T> {
    // Wait for existing operation to complete
    const existingLock = this.locks.get(key);
    if (existingLock) {
      await existingLock;
    }

    // Create new operation promise
    let resolver: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      resolver = resolve;
    });
    
    this.locks.set(key, lockPromise);

    try {
      const result = await operation();
      return result;
    } finally {
      this.locks.delete(key);
      resolver!();
    }
  }
}

export interface EmbeddingConfig {
  /** Model name for embedding generation */
  modelName: string;
  /** Embedding dimensions */
  dimensions: number;
  /** Maximum text length for embedding */
  maxLength: number;
  /** Whether to cache embeddings in memory */
  enableCache: boolean;
  /** Maximum cache size in MB */
  maxCacheSize: number;
  /** Cache directory for models */
  cacheDir?: string;
  /** Performance target for single embedding (ms) */
  performanceTarget: number;
}

export interface ModelLoadingProgress {
  /** Current step in the loading process */
  step: string;
  /** Progress percentage (0-100) */
  progress: number;
  /** Whether the step is complete */
  complete: boolean;
}

export interface EmbeddingResult {
  /** The text that was embedded */
  text: string;
  /** The generated embedding vector */
  embedding: number[];
  /** Processing time in milliseconds */
  processingTime: number;
}

export interface SimilarityResult {
  /** Message ID */
  messageId: string;
  /** Conversation ID */
  conversationId: string;
  /** Message content */
  content: string;
  /** Similarity score (0-1) */
  similarity: number;
  /** Created timestamp */
  createdAt: number;
}

/**
 * Local embedding manager using ONNX runtime for privacy-preserving semantic search
 */
export class EmbeddingManager {
  private dbManager: DatabaseManager;
  private config: EmbeddingConfig;
  private embeddingCache: LRUCache<string, number[]>;
  private model: FeatureExtractionPipeline | null = null;
  private isInitialized = false;
  private loadingProgress: ModelLoadingProgress | null = null;
  private performanceMetrics: {
    totalEmbeddings: number;
    totalTime: number;
    averageTime: number;
  } = { totalEmbeddings: 0, totalTime: 0, averageTime: 0 };
  private circuitBreaker: CircuitBreaker;
  private operationLock: OperationLock;
  private memoryManager: MemoryManager;
  private readonly allowedModels = new Set([
    'Xenova/all-MiniLM-L6-v2',
    'Xenova/all-mpnet-base-v2',
    'Xenova/e5-small-v2',
    'Xenova/sentence-transformers-all-MiniLM-L6-v2'
  ]);

  constructor(dbManager: DatabaseManager, config?: Partial<EmbeddingConfig>) {
    this.dbManager = dbManager;
    this.config = {
      modelName: 'Xenova/all-MiniLM-L6-v2', // Use the ONNX-compatible version
      dimensions: 384,
      maxLength: 512,
      enableCache: true,
      maxCacheSize: 50, // 50MB
      cacheDir: './.cache/transformers',
      performanceTarget: 100, // 100ms target per embedding
      ...config
    };
    this.embeddingCache = new LRUCache(1000, this.config.maxCacheSize);
    this.circuitBreaker = new CircuitBreaker(5, 60000); // 5 failures, 60s reset
    this.operationLock = new OperationLock();
    this.memoryManager = new MemoryManager({
      maxRssBytes: 500 * 1024 * 1024, // 500MB for embedding operations
      heapWarningThreshold: 0.7,
      heapCriticalThreshold: 0.85,
      monitoringInterval: 30000
    });
    
    // Configure Transformers.js environment
    if (this.config.cacheDir) {
      env.cacheDir = this.config.cacheDir;
    }
    // Only allow remote models if not explicitly disabled
    if (env.allowRemoteModels !== false) {
      env.allowRemoteModels = true; // Allow downloading from Hugging Face
    }
    env.allowLocalModels = true;  // Also allow local models
  }

  /**
   * Initialize the embedding manager with the actual ONNX model
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Validate model name for security
    if (!this.allowedModels.has(this.config.modelName)) {
      throw new Error(`Invalid model name: ${this.config.modelName}. Allowed models: ${Array.from(this.allowedModels).join(', ')}`);
    }

    try {
      console.log(`Initializing embedding model: ${this.config.modelName}`);
      console.log(`Target dimensions: ${this.config.dimensions}`);
      console.log(`Cache directory: ${this.config.cacheDir}`);
      
      // Set up progress tracking
      this.loadingProgress = {
        step: 'Loading model configuration',
        progress: 0,
        complete: false
      };

      // Load configuration from database
      await this.loadConfiguration();
      this.updateProgress('Database configuration loaded', 10);

      // Initialize the feature extraction pipeline
      this.updateProgress('Loading ONNX model...', 20);
      
      const pipelineResult = await pipeline(
        'feature-extraction',
        this.config.modelName,
        {
          progress_callback: (data: any) => {
            if (data.status === 'downloading') {
              const progress = 20 + (data.progress || 0) * 0.6; // 20-80% for download
              this.updateProgress(`Downloading model: ${Math.round(progress)}%`, progress);
            } else if (data.status === 'loading') {
              this.updateProgress('Loading model into memory...', 85);
            }
          }
        }
      );
      
      this.model = pipelineResult as FeatureExtractionPipeline;

      this.updateProgress('Model loaded, warming up...', 90);

      // Warm up the model with a test inference
      await this.warmUpModel();
      
      this.updateProgress('Initialization complete', 100, true);
      this.isInitialized = true;
      
      console.log('Embedding manager initialized successfully');
      console.log(`Performance target: ${this.config.performanceTarget}ms per embedding`);
      
      // Start memory monitoring
      this.memoryManager.startMonitoring();
      
      // Register memory pressure handlers
      this.memoryManager.onMemoryPressure(async (stats, pressure) => {
        if (pressure.level === 'high' || pressure.level === 'critical') {
          console.log('Memory pressure detected, clearing embedding cache');
          this.clearCache();
        }
      });
      
      this.memoryManager.onGarbageCollection(async () => {
        // Clear old cache entries during GC
        const cacheStats = this.getCacheStats();
        if (cacheStats.size > 500) { // If cache is large
          this.clearCache();
          console.log('Cleared embedding cache during GC');
        }
      });
      
    } catch (error) {
      this.loadingProgress = null;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to initialize embedding manager:', errorMessage);
      throw new Error(`Failed to initialize embedding manager: ${errorMessage}`);
    }
  }

  /**
   * Update loading progress
   */
  private updateProgress(step: string, progress: number, complete: boolean = false): void {
    this.loadingProgress = {
      step,
      progress: Math.min(100, Math.max(0, progress)),
      complete
    };
    console.log(`[${Math.round(this.loadingProgress.progress)}%] ${step}`);
  }

  /**
   * Warm up the model with test inference
   */
  private async warmUpModel(): Promise<void> {
    if (!this.model) {
      throw new Error('Model not loaded');
    }

    const testText = "This is a test sentence for model warmup.";
    const startTime = Date.now();
    
    try {
      await this.model(testText, { 
        pooling: 'mean', 
        normalize: true 
      });
      
      const warmupTime = Date.now() - startTime;
      console.log(`Model warmed up in ${warmupTime}ms`);
      
      if (warmupTime > this.config.performanceTarget * 2) {
        console.warn(`Warmup time (${warmupTime}ms) exceeds 2x performance target (${this.config.performanceTarget}ms)`);
      }
    } catch (error) {
      throw new Error(`Model warmup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embedding for a single text using the ONNX model
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.isInitialized || !this.model) {
      throw new Error('Embedding manager not initialized or model not loaded');
    }

    // Input validation for security
    if (typeof text !== 'string') {
      throw new Error('Input text must be a string');
    }
    if (text.length > 100000) { // Prevent excessive memory usage
      throw new Error('Input text too long (max 100,000 characters)');
    }

    // Check cache first
    const cacheKey = this.getCacheKey(text);
    if (this.config.enableCache) {
      const cached = this.embeddingCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const startTime = Date.now();
    
    try {
      // Normalize and truncate text
      const normalizedText = this.normalizeText(text);
      
      // Generate embedding using the ONNX model
      const output = await this.model(normalizedText, {
        pooling: 'mean',    // Use mean pooling
        normalize: true     // L2 normalize the output
      });
      
      // Extract the embedding array from the Tensor
      let embedding: number[];
      
      if (output && typeof output === 'object' && 'data' in output) {
        // Handle Tensor output
        embedding = Array.from(output.data as Float32Array);
      } else if (Array.isArray(output)) {
        // Handle direct array output
        embedding = output;
      } else {
        throw new Error('Unexpected model output format');
      }

      // Verify embedding dimensions
      if (embedding.length !== this.config.dimensions) {
        console.warn(
          `Expected ${this.config.dimensions} dimensions, got ${embedding.length}. ` +
          'Updating configuration.'
        );
        this.config.dimensions = embedding.length;
      }
      
      // Since the model output is already normalized (normalize: true), we use it directly
      const finalEmbedding = embedding;
      
      // Cache the result using LRU cache
      if (this.config.enableCache) {
        this.embeddingCache.set(cacheKey, finalEmbedding);
      }
      
      const processingTime = Date.now() - startTime;
      
      // Update performance metrics
      this.updatePerformanceMetrics(processingTime);
      
      // Log performance if it exceeds target
      if (processingTime > this.config.performanceTarget) {
        console.warn(
          `Embedding generation took ${processingTime}ms ` +
          `(target: ${this.config.performanceTarget}ms) for text length ${text.length}`
        );
      }
      
      return finalEmbedding;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to generate embedding:', errorMessage);
      throw new Error(`Failed to generate embedding: ${errorMessage}`);
    }
  }

  /**
   * Update performance tracking metrics
   */
  private updatePerformanceMetrics(processingTime: number): void {
    this.performanceMetrics.totalEmbeddings++;
    this.performanceMetrics.totalTime += processingTime;
    this.performanceMetrics.averageTime = 
      this.performanceMetrics.totalTime / this.performanceMetrics.totalEmbeddings;
  }

  /**
   * Generate embeddings for multiple texts in batch
   * Uses optimized batch processing when possible
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.isInitialized || !this.model) {
      throw new Error('Embedding manager not initialized or model not loaded');
    }

    if (texts.length === 0) {
      return [];
    }

    const startTime = Date.now();
    
    try {
      // Check cache for all texts first
      const embeddings: number[][] = [];
      const uncachedTexts: string[] = [];
      const uncachedIndices: number[] = [];
      
      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        const cacheKey = this.getCacheKey(text);
        
        const cached = this.embeddingCache.get(cacheKey);
        if (this.config.enableCache && cached) {
          embeddings[i] = cached;
        } else {
          uncachedTexts.push(text);
          uncachedIndices.push(i);
        }
      }
      
      if (uncachedTexts.length === 0) {
        console.log(`Retrieved ${texts.length} embeddings from cache`);
        return embeddings;
      }
      
      console.log(`Processing ${uncachedTexts.length}/${texts.length} uncached embeddings`);
      
      // Process uncached texts in smaller batches to manage memory
      const batchSize = 16; // Smaller batch size for better memory management
      
      for (let i = 0; i < uncachedTexts.length; i += batchSize) {
        const batch = uncachedTexts.slice(i, i + batchSize);
        const batchIndices = uncachedIndices.slice(i, i + batchSize);
        
        // Try batch processing with the model if it supports it
        let batchEmbeddings: number[][];
        
        try {
          // Attempt batch processing with Transformers.js
          const normalizedBatch = batch.map(text => this.normalizeText(text));
          
          const batchOutput = await this.model(normalizedBatch, {
            pooling: 'mean',
            normalize: true
          });
          
          // Handle batch output format
          if (batchOutput && typeof batchOutput === 'object' && 'dims' in batchOutput && 'data' in batchOutput) {
            // Tensor format with batch dimension
            const dims = batchOutput.dims as number[];
            const data = batchOutput.data as Float32Array;
            
            if (dims.length === 2 && dims[0] === normalizedBatch.length) {
              // [batch_size, embedding_dim]
              const embeddingDim = dims[1];
              batchEmbeddings = [];
              
              for (let j = 0; j < normalizedBatch.length; j++) {
                const start = j * embeddingDim;
                const end = start + embeddingDim;
                batchEmbeddings.push(Array.from(data.slice(start, end)));
              }
            } else {
              throw new Error('Unexpected batch output dimensions');
            }
          } else {
            // Fall back to individual processing
            throw new Error('Batch processing not supported, falling back to individual');
          }
        } catch (batchError) {
          console.log('Batch processing failed, falling back to individual processing:', batchError);
          
          // Fall back to individual processing
          batchEmbeddings = await Promise.all(
            batch.map(text => this.generateEmbedding(text))
          );
        }
        
        // Store results and cache them
        for (let j = 0; j < batchEmbeddings.length; j++) {
          const originalIndex = batchIndices[j];
          const text = batch[j];
          const embedding = batchEmbeddings[j];
          
          embeddings[originalIndex] = embedding;
          
          // Cache the result
          if (this.config.enableCache) {
            const cacheKey = this.getCacheKey(text);
            this.embeddingCache.set(cacheKey, embedding);
          }
        }
      }
      
      const processingTime = Date.now() - startTime;
      const avgTime = Math.round(processingTime / uncachedTexts.length);
      
      console.log(
        `Generated ${uncachedTexts.length} embeddings in ${processingTime}ms ` +
        `(${avgTime}ms per embedding, ${texts.length - uncachedTexts.length} from cache)`
      );
      
      // Update performance metrics for uncached embeddings
      for (let i = 0; i < uncachedTexts.length; i++) {
        this.updatePerformanceMetrics(avgTime);
      }
      
      return embeddings;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to generate batch embeddings:', errorMessage);
      throw new Error(`Failed to generate batch embeddings: ${errorMessage}`);
    }
  }

  /**
   * Store embedding for a message
   */
  async storeEmbedding(messageId: string, embedding: number[]): Promise<void> {
    const db = this.dbManager.getConnection();
    
    try {
      const stmt = db.prepare('UPDATE messages SET embedding = ? WHERE id = ?');
      stmt.run(JSON.stringify(embedding), messageId);
    } catch (error) {
      throw new Error(`Failed to store embedding for message ${messageId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieve embedding for a message
   */
  async getEmbedding(messageId: string): Promise<number[] | null> {
    const db = this.dbManager.getConnection();
    
    try {
      const stmt = db.prepare('SELECT embedding FROM messages WHERE id = ?');
      const result = stmt.get(messageId) as { embedding: string | null } | undefined;
      
      if (!result || !result.embedding) {
        return null;
      }
      
      return JSON.parse(result.embedding);
    } catch (error) {
      console.error(`Failed to retrieve embedding for message ${messageId}:`, error);
      return null;
    }
  }

  /**
   * Generate embeddings for messages that don't have them (thread-safe)
   */
  async processUnembeddedMessages(batchSize: number = 100): Promise<{ processed: number; errors: number }> {
    return this.operationLock.acquire('processUnembedded', async () => {
      const db = this.dbManager.getConnection();
      let processed = 0;
      let errors = 0;
      
      try {
      // Get messages without embeddings
      const stmt = db.prepare(`
        SELECT id, content 
        FROM messages 
        WHERE embedding IS NULL 
        ORDER BY created_at DESC 
        LIMIT ?
      `);
      
      const messages = stmt.all(batchSize) as { id: string; content: string }[];
      
      if (messages.length === 0) {
        return { processed: 0, errors: 0 };
      }
      
      console.log(`Processing ${messages.length} unembedded messages...`);
      
      // Generate embeddings in batch
      const texts = messages.map(m => m.content);
      const embeddings = await this.generateBatchEmbeddings(texts);
      
      // Store embeddings in transaction
      const transaction = db.transaction(() => {
        const updateStmt = db.prepare('UPDATE messages SET embedding = ? WHERE id = ?');
        
        for (let i = 0; i < messages.length; i++) {
          try {
            updateStmt.run(JSON.stringify(embeddings[i]), messages[i].id);
            processed++;
          } catch (error) {
            console.error(`Failed to store embedding for message ${messages[i].id}:`, error);
            errors++;
          }
        }
      });
      
      transaction();
      
      // Update last processed index in persistence state
      const updateStateStmt = db.prepare(`
        INSERT INTO persistence_state (key, value, updated_at)
        VALUES ('last_embedding_index', ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `);
      updateStateStmt.run(processed.toString(), Date.now());
      
      console.log(`Processed ${processed} messages, ${errors} errors`);
      
    } catch (error) {
      console.error('Failed to process unembedded messages:', error);
      errors++;
      }
      
      return { processed, errors };
    });
  }

  /**
   * Find similar messages using chunked vector similarity processing
   */
  async findSimilarMessages(
    queryEmbedding: number[],
    options: {
      limit?: number;
      threshold?: number;
      conversationId?: string;
      excludeMessageIds?: string[];
    } = {}
  ): Promise<SimilarityResult[]> {
    const db = this.dbManager.getConnection();
    const {
      limit = 20,
      threshold = 0.7,
      conversationId,
      excludeMessageIds = []
    } = options;
    
    try {
      // Input validation
      if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
        throw new Error('Invalid query embedding');
      }
      if (limit < 1 || limit > 1000) {
        throw new Error('Limit must be between 1 and 1000');
      }
      if (threshold < 0 || threshold > 1) {
        throw new Error('Threshold must be between 0 and 1');
      }

      // Build query with optional filters
      let query = `
        SELECT id, conversation_id, content, embedding, created_at
        FROM messages
        WHERE embedding IS NOT NULL
      `;
      const params: any[] = [];
      
      if (conversationId) {
        query += ' AND conversation_id = ?';
        params.push(conversationId);
      }
      
      if (excludeMessageIds.length > 0) {
        const placeholders = excludeMessageIds.map(() => '?').join(',');
        query += ` AND id NOT IN (${placeholders})`;
        params.push(...excludeMessageIds);
      }
      
      query += ' ORDER BY created_at DESC';
      
      // Process in chunks to avoid loading all messages into memory
      const chunkSize = 500;
      const similarities: SimilarityResult[] = [];
      let offset = 0;
      let hasMore = true;
      
      while (hasMore && similarities.length < limit * 2) { // Process 2x limit for better results
        const chunkQuery = query + ` LIMIT ${chunkSize} OFFSET ${offset}`;
        const messages = db.prepare(chunkQuery).all(...params) as Array<{
          id: string;
          conversation_id: string;
          content: string;
          embedding: string;
          created_at: number;
        }>;
        
        if (messages.length === 0) {
          hasMore = false;
          break;
        }
        
        // Process chunk
        for (const message of messages) {
          try {
            const messageEmbedding = JSON.parse(message.embedding);
            const similarity = this.cosineSimilarity(queryEmbedding, messageEmbedding);
            
            if (similarity >= threshold) {
              similarities.push({
                messageId: message.id,
                conversationId: message.conversation_id,
                content: message.content,
                similarity,
                createdAt: message.created_at
              });
            }
          } catch (parseError) {
            console.warn(`Failed to parse embedding for message ${message.id}:`, parseError);
          }
        }
        
        offset += chunkSize;
        hasMore = messages.length === chunkSize;
        
        // Yield control to prevent blocking
        await new Promise(resolve => setImmediate(resolve));
      }
      
      // Sort by similarity and apply limit
      return similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
        
    } catch (error) {
      throw new Error(`Failed to find similar messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }
    
    // Since vectors are pre-normalized, dot product equals cosine similarity
    let dotProduct = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
    }
    
    return Math.max(0, Math.min(1, dotProduct)); // Clamp to [0, 1]
  }

  /**
   * Get current loading progress
   */
  getLoadingProgress(): ModelLoadingProgress | null {
    return this.loadingProgress;
  }

  /**
   * Get comprehensive embedding statistics
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
    const db = this.dbManager.getConnection();
    
    const totalMessages = db.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number };
    const embeddedMessages = db.prepare('SELECT COUNT(*) as count FROM messages WHERE embedding IS NOT NULL').get() as { count: number };
    
    const coverage = totalMessages.count > 0 ? embeddedMessages.count / totalMessages.count : 0;
    
    // Calculate cache hit rate (approximate based on recent performance)
    const cacheHitRate = this.performanceMetrics.totalEmbeddings > 0 ? 
      Math.max(0, 1 - (this.performanceMetrics.totalEmbeddings / Math.max(1, this.embeddingCache.size()))) : 0;
    
    return {
      totalMessages: totalMessages.count,
      embeddedMessages: embeddedMessages.count,
      embeddingCoverage: coverage,
      averageEmbeddingTime: this.performanceMetrics.averageTime,
      cacheSize: this.embeddingCache.size(),
      cacheMemoryUsage: this.embeddingCache.memoryUsage(),
      cacheHitRate,
      performanceMetrics: {
        totalEmbeddings: this.performanceMetrics.totalEmbeddings,
        totalTime: this.performanceMetrics.totalTime,
        averageTime: this.performanceMetrics.averageTime,
        targetTime: this.config.performanceTarget,
        performanceRatio: this.performanceMetrics.averageTime / this.config.performanceTarget
      },
      modelInfo: {
        modelName: this.config.modelName,
        dimensions: this.config.dimensions,
        isInitialized: this.isInitialized,
        cacheDir: this.config.cacheDir
      }
    };
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.embeddingCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; memoryUsage: number; maxSize: number; maxMemoryBytes: number } {
    return {
      size: this.embeddingCache.size(),
      memoryUsage: this.embeddingCache.memoryUsage(),
      maxSize: 1000,
      maxMemoryBytes: this.config.maxCacheSize * 1024 * 1024
    };
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): { state: string; isOpen: boolean } {
    return {
      state: this.circuitBreaker.getState(),
      isOpen: this.circuitBreaker.isOpen()
    };
  }

  /**
   * Get current configuration
   */
  getConfiguration(): EmbeddingConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  async updateConfiguration(newConfig: Partial<EmbeddingConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    
    // Save to database
    const db = this.dbManager.getConnection();
    const updateConfig = db.prepare(`
      INSERT INTO search_config (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `);
    
    updateConfig.run('embedding_model', JSON.stringify(this.config.modelName), Date.now());
    updateConfig.run('embedding_dimensions', this.config.dimensions.toString(), Date.now());
    updateConfig.run('embedding_cache_size', this.config.maxCacheSize.toString(), Date.now());
  }

  /**
   * Normalize text for embedding with security validation
   */
  private normalizeText(text: string): string {
    // Input validation
    if (typeof text !== 'string') {
      throw new Error('Text must be a string');
    }
    
    // Security: Remove potentially dangerous characters
    let normalized = text
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // Remove control characters
      .replace(/[\uFFF0-\uFFFF]/g, '') // Remove non-characters
      .trim()
      .replace(/\s+/g, ' '); // Normalize whitespace
    
    // Length validation
    if (normalized.length === 0) {
      throw new Error('Text cannot be empty after normalization');
    }
    
    // Truncate to max length (approximate token limit)
    if (normalized.length > this.config.maxLength) {
      normalized = normalized.substring(0, this.config.maxLength);
      // Try to break at word boundary
      const lastSpace = normalized.lastIndexOf(' ');
      if (lastSpace > this.config.maxLength * 0.8) {
        normalized = normalized.substring(0, lastSpace);
      }
    }
    
    return normalized;
  }

  // Temporarily removed unused normalizeVector method

  /**
   * Generate secure cache key for text using crypto hash
   */
  private getCacheKey(text: string): string {
    // Use crypto hash for secure, collision-resistant cache keys
    return createHash('sha256')
      .update(text + this.config.modelName) // Include model name in hash
      .digest('hex')
      .substring(0, 16); // Use first 16 chars for shorter keys
  }

  // Removed - now using LRU cache directly

  /**
   * Load configuration from database
   */
  private async loadConfiguration(): Promise<void> {
    const db = this.dbManager.getConnection();
    
    try {
      const configs = db.prepare('SELECT key, value FROM search_config').all() as Array<{ key: string; value: string }>;
      
      for (const config of configs) {
        switch (config.key) {
          case 'embedding_model':
            this.config.modelName = JSON.parse(config.value);
            break;
          case 'embedding_dimensions':
            this.config.dimensions = parseInt(config.value, 10);
            break;
          case 'embedding_cache_size':
            this.config.maxCacheSize = parseInt(config.value, 10);
            break;
        }
      }
    } catch (error) {
      console.warn('Failed to load embedding configuration from database:', error);
    }
  }

  // Temporarily removed unused generateMockEmbedding method

  /**
   * Test model functionality and performance
   */
  async testModel(): Promise<{
    success: boolean;
    performance: number;
    dimensions: number;
    error?: string;
  }> {
    if (!this.isInitialized || !this.model) {
      return {
        success: false,
        performance: 0,
        dimensions: 0,
        error: 'Model not initialized'
      };
    }

    try {
      const testText = "This is a comprehensive test sentence to evaluate the embedding model performance and functionality.";
      const startTime = Date.now();
      
      const embedding = await this.generateEmbedding(testText);
      const performance = Date.now() - startTime;
      
      // Verify embedding properties
      if (!Array.isArray(embedding)) {
        throw new Error('Embedding is not an array');
      }
      
      if (embedding.length !== this.config.dimensions) {
        throw new Error(`Embedding dimension mismatch: expected ${this.config.dimensions}, got ${embedding.length}`);
      }
      
      // Check if embedding is normalized (should be close to 1.0)
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      if (Math.abs(magnitude - 1.0) > 0.1) {
        console.warn(`Embedding may not be properly normalized: magnitude = ${magnitude}`);
      }
      
      return {
        success: true,
        performance,
        dimensions: embedding.length,
      };
    } catch (error) {
      return {
        success: false,
        performance: 0,
        dimensions: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Reset and reinitialize the model (useful for error recovery)
   */
  async reset(): Promise<void> {
    return this.operationLock.acquire('reset', async () => {
      console.log('Resetting embedding manager...');
      
      try {
        // Clean up current state
        this.destroy();
        
        // Reset performance metrics
        this.performanceMetrics = {
          totalEmbeddings: 0,
          totalTime: 0,
          averageTime: 0
        };
        
        // Reset circuit breaker
        this.circuitBreaker = new CircuitBreaker(5, 60000);
        
        // Reinitialize
        await this.initialize();
        
        console.log('Embedding manager reset completed successfully');
      } catch (error) {
        console.error('Failed to reset embedding manager:', error);
        throw new Error(`Reset failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
  }

  /**
   * Check if the model is healthy and performing within target parameters
   */
  isModelHealthy(): boolean {
    if (!this.isInitialized || !this.model) {
      return false;
    }
    
    // Check if performance is within acceptable bounds
    if (this.performanceMetrics.totalEmbeddings > 10) {
      const performanceRatio = this.performanceMetrics.averageTime / this.config.performanceTarget;
      if (performanceRatio > 3.0) { // More than 3x target time
        console.warn(`Model performance degraded: ${performanceRatio.toFixed(1)}x target time`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * Generate embedding with circuit breaker and automatic fallback
   */
  async generateEmbeddingWithFallback(text: string, maxRetries: number = 2): Promise<number[]> {
    return this.circuitBreaker.execute(async () => {
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`Retry attempt ${attempt} for embedding generation`);
          }
          
          return await this.generateEmbedding(text);
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error');
          console.error(`Embedding generation attempt ${attempt + 1} failed:`, lastError.message);
          
          // If this is not the last attempt, try to recover
          if (attempt < maxRetries) {
            if (!this.isModelHealthy()) {
              console.log('Model appears unhealthy, attempting reset...');
              try {
                await this.reset();
              } catch (resetError) {
                console.error('Failed to reset model:', resetError);
                // Continue with next attempt even if reset fails
              }
            }
            
            // Exponential backoff
            const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      throw lastError || new Error('Failed to generate embedding after retries');
    });
  }

  /**
   * Cleanup resources and shutdown model
   */
  destroy(): void {
    console.log('Destroying embedding manager...');
    
    // Stop memory monitoring
    this.memoryManager.stopMonitoring();
    
    this.clearCache();
    this.model = null;
    this.isInitialized = false;
    this.loadingProgress = null;
    
    console.log('Embedding manager destroyed');
  }
}